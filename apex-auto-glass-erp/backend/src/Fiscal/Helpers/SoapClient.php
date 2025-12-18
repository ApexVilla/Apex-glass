<?php

namespace App\Fiscal\Helpers;

use App\Config\Logger;
use SoapClient as PHPSoapClient;
use SoapFault;

/**
 * Cliente SOAP para comunicação com SEFAZ
 */
class SoapClient
{
    private $wsdl;
    private $soapClient;
    private $ambiente;
    private $options = [];

    public function __construct(string $wsdl, string $ambiente = 'homologacao', array $options = [])
    {
        $this->wsdl = $wsdl;
        $this->ambiente = $ambiente;
        
        $defaultOptions = [
            'soap_version' => SOAP_1_1,
            'exceptions' => true,
            'trace' => true,
            'cache_wsdl' => WSDL_CACHE_NONE,
            'stream_context' => stream_context_create([
                'http' => [
                    'timeout' => 30,
                    'user_agent' => 'ApexGlass-ERP/1.0'
                ],
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true,
                    'allow_self_signed' => false,
                    'cafile' => $options['cafile'] ?? null
                ]
            ])
        ];

        $this->options = array_merge($defaultOptions, $options);
        
        try {
            $this->soapClient = new PHPSoapClient($this->wsdl, $this->options);
        } catch (SoapFault $e) {
            Logger::error("Erro ao criar cliente SOAP", [
                'wsdl' => $this->wsdl,
                'error' => $e->getMessage()
            ]);
            throw new \Exception("Erro ao conectar com SEFAZ: " . $e->getMessage());
        }
    }

    /**
     * Envia requisição SOAP
     */
    public function send(string $method, array $params, array $headers = []): array
    {
        try {
            Logger::info("Enviando requisição SOAP", [
                'method' => $method,
                'ambiente' => $this->ambiente,
                'wsdl' => $this->wsdl
            ]);

            // Adiciona headers se necessário
            if (!empty($headers)) {
                $this->soapClient->__setSoapHeaders($headers);
            }

            $response = $this->soapClient->__soapCall($method, [$params]);

            Logger::info("Resposta SOAP recebida", [
                'method' => $method,
                'response_size' => strlen($this->getLastResponse())
            ]);

            return [
                'success' => true,
                'response' => $response,
                'request' => $this->getLastRequest(),
                'response_xml' => $this->getLastResponse()
            ];

        } catch (SoapFault $e) {
            Logger::error("Erro na requisição SOAP", [
                'method' => $method,
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'request' => $this->getLastRequest(),
                'response' => $this->getLastResponse()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'request' => $this->getLastRequest(),
                'response' => $this->getLastResponse()
            ];
        }
    }

    /**
     * Retorna última requisição SOAP
     */
    public function getLastRequest(): string
    {
        return $this->soapClient->__getLastRequest();
    }

    /**
     * Retorna última resposta SOAP
     */
    public function getLastResponse(): string
    {
        return $this->soapClient->__getLastResponse();
    }

    /**
     * Retorna headers da última requisição
     */
    public function getLastRequestHeaders(): string
    {
        return $this->soapClient->__getLastRequestHeaders();
    }

    /**
     * Retorna headers da última resposta
     */
    public function getLastResponseHeaders(): string
    {
        return $this->soapClient->__getLastResponseHeaders();
    }

    /**
     * Retorna URL do WSDL
     */
    public function getWsdl(): string
    {
        return $this->wsdl;
    }

    /**
     * Retorna ambiente
     */
    public function getAmbiente(): string
    {
        return $this->ambiente;
    }
}

