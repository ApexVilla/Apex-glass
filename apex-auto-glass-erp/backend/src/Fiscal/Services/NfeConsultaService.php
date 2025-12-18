<?php

namespace App\Fiscal\Services;

use App\Fiscal\Helpers\SoapClient;
use App\Config\Logger;
use DOMDocument;
use DOMXPath;

/**
 * Serviço de Consulta de NF-e por chave de acesso
 */
class NfeConsultaService
{
    private $uf;
    private $ambiente;

    public function __construct(string $uf, string $ambiente = 'homologacao')
    {
        $this->uf = strtoupper($uf);
        $this->ambiente = $ambiente;
    }

    /**
     * Consulta NF-e por chave de acesso
     */
    public function consultarPorChave(string $chaveAcesso): array
    {
        try {
            Logger::info("Consultando NF-e por chave de acesso", ['chave_acesso' => $chaveAcesso]);

            $wsdl = $this->getConsultaWsdl();
            $soapClient = new SoapClient($wsdl, $this->ambiente);

            // Monta XML de consulta
            $xml = $this->buildConsultaXml($chaveAcesso);

            $params = [
                'nfeDadosMsg' => $xml
            ];

            $result = $soapClient->send('nfeConsultaNF', $params);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'error' => $result['error'] ?? 'Erro desconhecido'
                ];
            }

            // Processa resposta
            $response = $this->parseConsultaResponse($result['response_xml']);

            Logger::info("NF-e consultada com sucesso", [
                'chave_acesso' => $chaveAcesso,
                'status' => $response['status'] ?? 'unknown'
            ]);

            return $response;

        } catch (\Exception $e) {
            Logger::error("Erro ao consultar NF-e", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Monta XML de consulta
     */
    private function buildConsultaXml(string $chaveAcesso): string
    {
        $ambiente = $this->ambiente === 'producao' ? '1' : '2';

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">';
        $xml .= '<tpAmb>' . $ambiente . '</tpAmb>';
        $xml .= '<xServ>CONSULTAR</xServ>';
        $xml .= '<chNFe>' . $chaveAcesso . '</chNFe>';
        $xml .= '</consSitNFe>';

        return $xml;
    }

    /**
     * Processa resposta de consulta
     */
    private function parseConsultaResponse(string $xml): array
    {
        try {
            $dom = new DOMDocument();
            $dom->loadXML($xml);

            $xpath = new DOMXPath($dom);
            $xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');

            $status = $xpath->evaluate('string(//nfe:cStat)');
            $motivo = $xpath->evaluate('string(//nfe:xMotivo)');
            $protocolo = $xpath->evaluate('string(//nfe:protNFe/nfe:infProt/nfe:nProt)');
            $dataAutorizacao = $xpath->evaluate('string(//nfe:protNFe/nfe:infProt/nfe:dhRecbto)');
            $chaveAcesso = $xpath->evaluate('string(//nfe:chNFe)');

            // Status da NF-e
            $statusNfe = 'unknown';
            if ($status === '100') {
                $statusNfe = 'autorizada';
            } elseif ($status === '101') {
                $statusNfe = 'cancelada';
            } elseif ($status === '110') {
                $statusNfe = 'denegada';
            } elseif ($status === '301') {
                $statusNfe = 'inexistente';
            }

            return [
                'success' => true,
                'status' => $statusNfe,
                'codigo_status' => $status,
                'motivo' => $motivo,
                'protocolo' => $protocolo,
                'data_autorizacao' => $dataAutorizacao,
                'chave_acesso' => $chaveAcesso,
                'xml' => $xml
            ];

        } catch (\Exception $e) {
            Logger::error("Erro ao processar resposta de consulta", [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erro ao processar resposta: ' . $e->getMessage(),
                'xml' => $xml
            ];
        }
    }

    /**
     * Retorna WSDL de consulta
     */
    private function getConsultaWsdl(): string
    {
        if ($this->ambiente === 'producao') {
            return 'https://www.nfe.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx?wsdl';
        }
        return 'https://hom.nfe.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx?wsdl';
    }
}

