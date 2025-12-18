<?php

namespace App\Fiscal\Helpers;

use App\Config\Logger;
use DOMDocument;
use LibXMLError;

/**
 * Validador de XML contra XSD da SEFAZ
 */
class XmlValidator
{
    private $xsdPath;
    private $errors = [];

    public function __construct(string $xsdPath = null)
    {
        $this->xsdPath = $xsdPath;
    }

    /**
     * Valida XML contra XSD
     */
    public function validate(string $xml, string $xsdPath = null): bool
    {
        $this->errors = [];
        $xsdPath = $xsdPath ?? $this->xsdPath;

        if (!$xsdPath || !file_exists($xsdPath)) {
            Logger::warning("XSD não encontrado, validando apenas estrutura XML", ['xsd_path' => $xsdPath]);
            return $this->validateStructure($xml);
        }

        libxml_use_internal_errors(true);
        libxml_clear_errors();

        $dom = new DOMDocument();
        
        if (!$dom->loadXML($xml)) {
            $this->errors = $this->getLibXmlErrors();
            Logger::error("Erro ao carregar XML", ['errors' => $this->errors]);
            return false;
        }

        if (!$dom->schemaValidate($xsdPath)) {
            $this->errors = $this->getLibXmlErrors();
            Logger::error("XML não passou na validação XSD", [
                'xsd_path' => $xsdPath,
                'errors' => $this->errors
            ]);
            return false;
        }

        Logger::info("XML validado com sucesso contra XSD", ['xsd_path' => $xsdPath]);
        return true;
    }

    /**
     * Valida apenas a estrutura do XML
     */
    public function validateStructure(string $xml): bool
    {
        $this->errors = [];
        libxml_use_internal_errors(true);
        libxml_clear_errors();

        $dom = new DOMDocument();
        
        if (!$dom->loadXML($xml)) {
            $this->errors = $this->getLibXmlErrors();
            return false;
        }

        // Validações básicas
        $nfe = $dom->getElementsByTagName('NFe');
        if ($nfe->length === 0) {
            $this->errors[] = "Elemento NFe não encontrado";
            return false;
        }

        $infNFe = $dom->getElementsByTagName('infNFe');
        if ($infNFe->length === 0) {
            $this->errors[] = "Elemento infNFe não encontrado";
            return false;
        }

        return true;
    }

    /**
     * Retorna os erros de validação
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Retorna erros do libxml formatados
     */
    private function getLibXmlErrors(): array
    {
        $errors = [];
        $libxmlErrors = libxml_get_errors();
        
        foreach ($libxmlErrors as $error) {
            $errors[] = [
                'level' => $this->getErrorLevel($error),
                'code' => $error->code,
                'message' => trim($error->message),
                'file' => $error->file,
                'line' => $error->line,
                'column' => $error->column
            ];
        }
        
        libxml_clear_errors();
        return $errors;
    }

    /**
     * Converte nível de erro do libxml
     */
    private function getErrorLevel(LibXMLError $error): string
    {
        switch ($error->level) {
            case LIBXML_ERR_WARNING:
                return 'warning';
            case LIBXML_ERR_ERROR:
                return 'error';
            case LIBXML_ERR_FATAL:
                return 'fatal';
            default:
                return 'unknown';
        }
    }

    /**
     * Valida chave de acesso da NF-e
     */
    public function validateChaveAcesso(string $chaveAcesso): bool
    {
        // Remove espaços e caracteres especiais
        $chave = preg_replace('/[^0-9]/', '', $chaveAcesso);
        
        // Deve ter 44 dígitos
        if (strlen($chave) !== 44) {
            return false;
        }

        // Valida dígito verificador
        return $this->validateChaveAcessoDV($chave);
    }

    /**
     * Valida dígito verificador da chave de acesso
     */
    private function validateChaveAcessoDV(string $chave): bool
    {
        $base = substr($chave, 0, 43);
        $dv = (int)substr($chave, 43, 1);
        
        $soma = 0;
        $multiplicadores = [2, 3, 4, 5, 6, 7, 8, 9];
        
        for ($i = 0; $i < 43; $i++) {
            $soma += (int)$base[$i] * $multiplicadores[$i % 8];
        }
        
        $resto = $soma % 11;
        $dvCalculado = ($resto < 2) ? 0 : (11 - $resto);
        
        return $dv === $dvCalculado;
    }
}

