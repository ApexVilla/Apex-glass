<?php

namespace App\Fiscal\Helpers;

use App\Config\Logger;

/**
 * Gerenciador de Certificados Digitais A1 (.pfx)
 */
class CertificateManager
{
    private $certPath;
    private $certPassword;
    private $certData;
    private $privateKey;
    private $publicKey;

    public function __construct(string $certPath, string $certPassword)
    {
        $this->certPath = $certPath;
        $this->certPassword = $certPassword;
        $this->loadCertificate();
    }

    /**
     * Carrega o certificado digital
     */
    private function loadCertificate(): void
    {
        if (!file_exists($this->certPath)) {
            throw new \Exception("Certificado não encontrado: {$this->certPath}");
        }

        $pkcs12 = file_get_contents($this->certPath);
        
        if (!openssl_pkcs12_read($pkcs12, $certs, $this->certPassword)) {
            throw new \Exception("Erro ao ler certificado. Verifique a senha e o formato do arquivo.");
        }

        $this->certData = $certs['cert'];
        $this->privateKey = $certs['pkey'];

        // Extrai a chave pública do certificado
        $certResource = openssl_x509_read($this->certData);
        $this->publicKey = openssl_pkey_get_public($certResource);
        
        if (!$this->publicKey) {
            throw new \Exception("Erro ao extrair chave pública do certificado");
        }

        Logger::info("Certificado carregado com sucesso", [
            'cert_path' => $this->certPath,
            'subject' => $this->getSubject()
        ]);
    }

    /**
     * Assina XML usando o certificado
     */
    public function signXml(string $xml): string
    {
        try {
            // Remove assinatura anterior se existir
            $xml = preg_replace('/<Signature[^>]*>.*?<\/Signature>/s', '', $xml);
            
            // Cria o DOMDocument
            $dom = new \DOMDocument('1.0', 'UTF-8');
            $dom->preserveWhiteSpace = false;
            $dom->formatOutput = false;
            $dom->loadXML($xml);

            // Cria o elemento Signature
            $signature = $dom->createElementNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
            $signature->setAttribute('xmlns', 'http://www.w3.org/2000/09/xmldsig#');
            
            $signedInfo = $dom->createElement('SignedInfo');
            
            // CanonicalizationMethod
            $canonicalizationMethod = $dom->createElement('CanonicalizationMethod');
            $canonicalizationMethod->setAttribute('Algorithm', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315');
            $signedInfo->appendChild($canonicalizationMethod);
            
            // SignatureMethod
            $signatureMethod = $dom->createElement('SignatureMethod');
            $signatureMethod->setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#rsa-sha1');
            $signedInfo->appendChild($signatureMethod);
            
            // Reference
            $reference = $dom->createElement('Reference');
            $reference->setAttribute('URI', '');
            
            $transforms = $dom->createElement('Transforms');
            $transform = $dom->createElement('Transform');
            $transform->setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#enveloped-signature');
            $transforms->appendChild($transform);
            $reference->appendChild($transforms);
            
            $digestMethod = $dom->createElement('DigestMethod');
            $digestMethod->setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#sha1');
            $reference->appendChild($digestMethod);
            
            // Calcula o digest value
            $infNFe = $dom->getElementsByTagName('infNFe')->item(0);
            if (!$infNFe) {
                throw new \Exception("Elemento infNFe não encontrado no XML");
            }
            
            $canonicalXml = $infNFe->C14N(true, false);
            $digestValue = base64_encode(sha1($canonicalXml, true));
            
            $digestValueElement = $dom->createElement('DigestValue', $digestValue);
            $reference->appendChild($digestValueElement);
            
            $signedInfo->appendChild($reference);
            $signature->appendChild($signedInfo);
            
            // Assina o SignedInfo
            $signedInfoXml = $signedInfo->C14N(true, false);
            $signatureValue = '';
            
            if (!openssl_sign($signedInfoXml, $signatureValue, $this->privateKey, OPENSSL_ALGO_SHA1)) {
                throw new \Exception("Erro ao assinar XML");
            }
            
            $signatureValueElement = $dom->createElement('SignatureValue', base64_encode($signatureValue));
            $signature->appendChild($signatureValueElement);
            
            // KeyInfo
            $keyInfo = $dom->createElement('KeyInfo');
            $x509Data = $dom->createElement('X509Data');
            
            // Remove headers do certificado
            $certClean = preg_replace('/-----BEGIN CERTIFICATE-----/', '', $this->certData);
            $certClean = preg_replace('/-----END CERTIFICATE-----/', '', $certClean);
            $certClean = preg_replace('/\s+/', '', $certClean);
            
            $x509Certificate = $dom->createElement('X509Certificate', $certClean);
            $x509Data->appendChild($x509Certificate);
            $keyInfo->appendChild($x509Data);
            $signature->appendChild($keyInfo);
            
            // Adiciona a assinatura ao elemento infNFe
            $infNFe->appendChild($signature);
            
            return $dom->saveXML();
            
        } catch (\Exception $e) {
            Logger::error("Erro ao assinar XML", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new \Exception("Erro ao assinar XML: " . $e->getMessage());
        }
    }

    /**
     * Retorna o CNPJ do certificado
     */
    public function getCnpj(): string
    {
        $subject = $this->getSubject();
        if (preg_match('/CN=([0-9]+)/', $subject, $matches)) {
            return preg_replace('/[^0-9]/', '', $matches[1]);
        }
        throw new \Exception("CNPJ não encontrado no certificado");
    }

    /**
     * Retorna o subject do certificado
     */
    public function getSubject(): string
    {
        $certInfo = openssl_x509_parse($this->certData);
        return $certInfo['name'] ?? '';
    }

    /**
     * Retorna a data de validade do certificado
     */
    public function getValidUntil(): \DateTime
    {
        $certInfo = openssl_x509_parse($this->certData);
        $validTo = $certInfo['validTo_time_t'] ?? 0;
        return new \DateTime('@' . $validTo);
    }

    /**
     * Verifica se o certificado está válido
     */
    public function isValid(): bool
    {
        try {
            $validUntil = $this->getValidUntil();
            return $validUntil > new \DateTime();
        } catch (\Exception $e) {
            return false;
        }
    }
}

