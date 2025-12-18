<?php

namespace App\Fiscal\Services;

use App\Fiscal\Helpers\SoapClient;
use App\Config\Logger;
use DOMDocument;
use DOMXPath;

/**
 * Serviço de Status da SEFAZ (NfeStatusServico)
 */
class NfeStatusService
{
    private $soapClient;
    private $ambiente;
    private $uf;

    public function __construct(string $uf, string $ambiente = 'homologacao')
    {
        $this->uf = strtoupper($uf);
        $this->ambiente = $ambiente;
        $this->soapClient = $this->createSoapClient();
    }

    /**
     * Cria cliente SOAP para status da SEFAZ
     */
    private function createSoapClient(): SoapClient
    {
        $wsdl = $this->getWsdlUrl();
        
        return new SoapClient($wsdl, $this->ambiente, [
            'connection_timeout' => 30
        ]);
    }

    /**
     * Retorna URL do WSDL baseado na UF e ambiente
     */
    private function getWsdlUrl(): string
    {
        $baseUrls = [
            'AC' => [
                'homologacao' => 'https://hml.sefaznet.ac.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaznet.ac.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'AL' => [
                'homologacao' => 'https://homologacao.sefaz.al.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.al.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'AM' => [
                'homologacao' => 'https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico?wsdl'
            ],
            'BA' => [
                'homologacao' => 'https://hnfe.sefaz.ba.gov.br/webservices/NfeStatusServico/NfeStatusServico.asmx?wsdl',
                'producao' => 'https://nfe.sefaz.ba.gov.br/webservices/NfeStatusServico/NfeStatusServico.asmx?wsdl'
            ],
            'CE' => [
                'homologacao' => 'https://hml.nfe.sefaz.ce.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.ce.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'DF' => [
                'homologacao' => 'https://homologacao.nfe.fazenda.df.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://www.nfe.fazenda.df.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'ES' => [
                'homologacao' => 'https://homologacao.nfe.fazenda.es.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.fazenda.es.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'GO' => [
                'homologacao' => 'https://homolog.sefaz.go.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.go.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'MA' => [
                'homologacao' => 'https://homologacao.sefaz.ma.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://www.sefaz.ma.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'MG' => [
                'homologacao' => 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NfeStatusServico2?wsdl',
                'producao' => 'https://nfe.fazenda.mg.gov.br/nfe2/services/NfeStatusServico2?wsdl'
            ],
            'MS' => [
                'homologacao' => 'https://homologacao.nfe.ms.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.ms.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'MT' => [
                'homologacao' => 'https://homologacao.sefaz.mt.gov.br/nfews/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.mt.gov.br/nfews/services/NfeStatusServico?wsdl'
            ],
            'PA' => [
                'homologacao' => 'https://homolog.sefaz.pa.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.pa.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'PB' => [
                'homologacao' => 'https://homologacao.sefaz.pb.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.pb.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'PE' => [
                'homologacao' => 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NfeStatusServico?wsdl'
            ],
            'PI' => [
                'homologacao' => 'https://homologacao.sefaz.pi.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.pi.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'PR' => [
                'homologacao' => 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.fazenda.pr.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'RJ' => [
                'homologacao' => 'https://hom.nfe.fazenda.rj.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.fazenda.rj.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'RN' => [
                'homologacao' => 'https://homologacao.set.rn.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.set.rn.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'RO' => [
                'homologacao' => 'https://nfehomolog.sefaz.ro.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.ro.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'RR' => [
                'homologacao' => 'https://nfehomolog.sefaz.rr.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.rr.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'RS' => [
                'homologacao' => 'https://nfe-homologacao.sefaz.rs.gov.br/ws/NfeStatusServico/NfeStatusServico.asmx?wsdl',
                'producao' => 'https://nfe.sefaz.rs.gov.br/ws/NfeStatusServico/NfeStatusServico.asmx?wsdl'
            ],
            'SC' => [
                'homologacao' => 'https://homologacao.nfsc.fazenda.sc.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.fazenda.sc.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'SE' => [
                'homologacao' => 'https://homologacao.nfe.sefaz.se.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.se.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'SP' => [
                'homologacao' => 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico2.asmx?wsdl',
                'producao' => 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico2.asmx?wsdl'
            ],
            'TO' => [
                'homologacao' => 'https://homologacao.sefaz.to.gov.br/nfe/services/NfeStatusServico?wsdl',
                'producao' => 'https://nfe.sefaz.to.gov.br/nfe/services/NfeStatusServico?wsdl'
            ],
            'AN' => [ // Ambiente Nacional
                'homologacao' => 'https://www.nfe.fazenda.gov.br/NfeStatusServico2/NfeStatusServico2.asmx?wsdl',
                'producao' => 'https://www.nfe.fazenda.gov.br/NfeStatusServico2/NfeStatusServico2.asmx?wsdl'
            ]
        ];

        if (!isset($baseUrls[$this->uf])) {
            throw new \Exception("UF não suportada: {$this->uf}");
        }

        if (!isset($baseUrls[$this->uf][$this->ambiente])) {
            throw new \Exception("Ambiente não suportado para UF {$this->uf}: {$this->ambiente}");
        }

        return $baseUrls[$this->uf][$this->ambiente];
    }

    /**
     * Consulta status do serviço da SEFAZ
     */
    public function consultarStatus(string $cnpj, string $versao = '4.00'): array
    {
        try {
            Logger::info("Consultando status da SEFAZ", [
                'uf' => $this->uf,
                'ambiente' => $this->ambiente,
                'cnpj' => $cnpj
            ]);

            // Monta XML de consulta
            $xml = $this->buildStatusXml($cnpj, $versao);

            // Envia requisição
            $params = [
                'nfeDadosMsg' => $xml
            ];

            $result = $this->soapClient->send('nfeStatusServicoNF', $params);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'error' => $result['error'] ?? 'Erro desconhecido',
                    'code' => $result['code'] ?? null
                ];
            }

            // Processa resposta
            $response = $this->parseResponse($result['response_xml']);

            Logger::info("Status da SEFAZ consultado", [
                'status' => $response['status'] ?? 'unknown',
                'motivo' => $response['motivo'] ?? null
            ]);

            return $response;

        } catch (\Exception $e) {
            Logger::error("Erro ao consultar status da SEFAZ", [
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
     * Monta XML de consulta de status
     */
    private function buildStatusXml(string $cnpj, string $versao): string
    {
        $cnpj = preg_replace('/[^0-9]/', '', $cnpj);
        $ambiente = $this->ambiente === 'producao' ? '1' : '2';

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="' . $versao . '">';
        $xml .= '<tpAmb>' . $ambiente . '</tpAmb>';
        $xml .= '<cUF>' . $this->getUfCode() . '</cUF>';
        $xml .= '<xServ>STATUS</xServ>';
        $xml .= '</consStatServ>';

        return $xml;
    }

    /**
     * Retorna código da UF
     */
    private function getUfCode(): string
    {
        $ufCodes = [
            'AC' => '12', 'AL' => '27', 'AP' => '16', 'AM' => '13', 'BA' => '29',
            'CE' => '23', 'DF' => '53', 'ES' => '32', 'GO' => '52', 'MA' => '21',
            'MT' => '51', 'MS' => '50', 'MG' => '31', 'PA' => '15', 'PB' => '25',
            'PR' => '41', 'PE' => '26', 'PI' => '22', 'RJ' => '33', 'RN' => '24',
            'RS' => '43', 'RO' => '11', 'RR' => '14', 'SC' => '42', 'SP' => '35',
            'SE' => '28', 'TO' => '17'
        ];

        return $ufCodes[$this->uf] ?? '35'; // Default SP
    }

    /**
     * Processa resposta XML
     */
    private function parseResponse(string $xml): array
    {
        try {
            $dom = new DOMDocument();
            $dom->loadXML($xml);

            $xpath = new DOMXPath($dom);
            $xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');

            $status = $xpath->evaluate('string(//nfe:cStat)');
            $motivo = $xpath->evaluate('string(//nfe:xMotivo)');
            $versao = $xpath->evaluate('string(//nfe:versao)');
            $uf = $xpath->evaluate('string(//nfe:cUF)');
            $dataHora = $xpath->evaluate('string(//nfe:dhRecbto)');
            $tempoMedio = $xpath->evaluate('string(//nfe:tMed)');

            return [
                'success' => true,
                'status' => $status,
                'motivo' => $motivo,
                'versao' => $versao,
                'uf' => $uf,
                'data_hora' => $dataHora,
                'tempo_medio' => $tempoMedio,
                'xml' => $xml
            ];

        } catch (\Exception $e) {
            Logger::error("Erro ao processar resposta de status", [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erro ao processar resposta: ' . $e->getMessage(),
                'xml' => $xml
            ];
        }
    }
}

