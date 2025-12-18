<?php

namespace App\Fiscal\Services;

use App\Fiscal\Helpers\CertificateManager;
use App\Fiscal\Helpers\SoapClient;
use App\Repositories\NfeRepository;
use App\Config\Logger;
use DOMDocument;
use DOMXPath;

/**
 * Serviço de Eventos da NF-e
 * Cancelamento, Carta de Correção e Inutilização
 */
class NfeEventService
{
    private $certificateManager;
    private $nfeRepository;
    private $uf;
    private $ambiente;
    private $versao = '1.00';

    public function __construct(
        CertificateManager $certificateManager,
        NfeRepository $nfeRepository,
        string $uf,
        string $ambiente = 'homologacao'
    ) {
        $this->certificateManager = $certificateManager;
        $this->nfeRepository = $nfeRepository;
        $this->uf = strtoupper($uf);
        $this->ambiente = $ambiente;
    }

    /**
     * Cancela uma NF-e
     */
    public function cancelar(string $chaveAcesso, string $justificativa, string $companyId, ?string $userId = null): array
    {
        try {
            Logger::info("Iniciando cancelamento de NF-e", ['chave_acesso' => $chaveAcesso]);

            // Busca NF-e
            $nfe = $this->nfeRepository->findByChaveAcesso($chaveAcesso, $companyId);
            if (!$nfe) {
                throw new \Exception("NF-e não encontrada");
            }

            if ($nfe['status'] !== 'autorizada') {
                throw new \Exception("NF-e deve estar autorizada para ser cancelada");
            }

            // Valida justificativa (mínimo 15 caracteres)
            $justificativa = trim($justificativa);
            if (strlen($justificativa) < 15) {
                throw new \Exception("Justificativa deve ter no mínimo 15 caracteres");
            }

            // Gera XML do evento de cancelamento
            $xmlEvento = $this->gerarXmlCancelamento($chaveAcesso, $justificativa, $nfe['id']);

            // Assina XML
            $xmlAssinado = $this->certificateManager->signXml($xmlEvento);

            // Envia para SEFAZ
            $resultado = $this->enviarEvento($xmlAssinado, '110111');

            if ($resultado['success']) {
                // Salva cancelamento
                $cancelamentoId = $this->nfeRepository->saveCancelamento([
                    'nfe_id' => $nfe['id'],
                    'company_id' => $companyId,
                    'justificativa' => $justificativa,
                    'protocolo_cancelamento' => $resultado['protocolo'],
                    'xml_cancelamento' => $xmlAssinado,
                    'xml_retorno' => $resultado['xml_retorno'],
                    'status' => 'autorizado',
                    'created_by' => $userId
                ]);

                // Atualiza status da NF-e
                $this->nfeRepository->updateStatus($nfe['id'], $companyId, 'cancelada');

                Logger::info("NF-e cancelada com sucesso", [
                    'nfe_id' => $nfe['id'],
                    'protocolo' => $resultado['protocolo']
                ]);

                return [
                    'success' => true,
                    'cancelamento_id' => $cancelamentoId,
                    'protocolo' => $resultado['protocolo'],
                    'status' => 'cancelada'
                ];
            } else {
                // Salva tentativa de cancelamento rejeitada
                $this->nfeRepository->saveCancelamento([
                    'nfe_id' => $nfe['id'],
                    'company_id' => $companyId,
                    'justificativa' => $justificativa,
                    'xml_cancelamento' => $xmlAssinado,
                    'xml_retorno' => $resultado['xml_retorno'] ?? null,
                    'status' => 'rejeitado',
                    'created_by' => $userId
                ]);

                return [
                    'success' => false,
                    'motivo_rejeicao' => $resultado['motivo_rejeicao'] ?? 'Erro desconhecido'
                ];
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao cancelar NF-e", [
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
     * Emite Carta de Correção Eletrônica (CC-e)
     */
    public function emitirCCe(string $chaveAcesso, string $correcao, string $companyId, ?string $userId = null): array
    {
        try {
            Logger::info("Iniciando emissão de CC-e", ['chave_acesso' => $chaveAcesso]);

            // Busca NF-e
            $nfe = $this->nfeRepository->findByChaveAcesso($chaveAcesso, $companyId);
            if (!$nfe) {
                throw new \Exception("NF-e não encontrada");
            }

            if ($nfe['status'] !== 'autorizada') {
                throw new \Exception("NF-e deve estar autorizada para emitir CC-e");
            }

            // Valida correção (mínimo 15 caracteres, máximo 1000)
            $correcao = trim($correcao);
            if (strlen($correcao) < 15 || strlen($correcao) > 1000) {
                throw new \Exception("Correção deve ter entre 15 e 1000 caracteres");
            }

            // Busca próxima sequência
            $sequencia = $this->nfeRepository->getNextCCeSequencia($nfe['id']);

            // Gera XML do evento CC-e
            $xmlEvento = $this->gerarXmlCCe($chaveAcesso, $correcao, $sequencia);

            // Assina XML
            $xmlAssinado = $this->certificateManager->signXml($xmlEvento);

            // Envia para SEFAZ
            $resultado = $this->enviarEvento($xmlAssinado, '110110');

            if ($resultado['success']) {
                // Salva CC-e
                $cceId = $this->nfeRepository->saveCCe([
                    'nfe_id' => $nfe['id'],
                    'company_id' => $companyId,
                    'sequencia' => $sequencia,
                    'correcao' => $correcao,
                    'protocolo_cc' => $resultado['protocolo'],
                    'xml_cc' => $xmlAssinado,
                    'xml_retorno' => $resultado['xml_retorno'],
                    'status' => 'registrado',
                    'created_by' => $userId
                ]);

                Logger::info("CC-e emitida com sucesso", [
                    'nfe_id' => $nfe['id'],
                    'sequencia' => $sequencia,
                    'protocolo' => $resultado['protocolo']
                ]);

                return [
                    'success' => true,
                    'cce_id' => $cceId,
                    'sequencia' => $sequencia,
                    'protocolo' => $resultado['protocolo'],
                    'status' => 'registrado'
                ];
            } else {
                // Salva tentativa de CC-e rejeitada
                $this->nfeRepository->saveCCe([
                    'nfe_id' => $nfe['id'],
                    'company_id' => $companyId,
                    'sequencia' => $sequencia,
                    'correcao' => $correcao,
                    'xml_cc' => $xmlAssinado,
                    'xml_retorno' => $resultado['xml_retorno'] ?? null,
                    'status' => 'rejeitado',
                    'created_by' => $userId
                ]);

                return [
                    'success' => false,
                    'motivo_rejeicao' => $resultado['motivo_rejeicao'] ?? 'Erro desconhecido'
                ];
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao emitir CC-e", [
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
     * Inutiliza faixa de numeração
     */
    public function inutilizar(string $serie, string $numeroInicial, string $numeroFinal, string $justificativa, string $companyId, string $cnpj, ?string $userId = null): array
    {
        try {
            Logger::info("Iniciando inutilização", [
                'serie' => $serie,
                'numero_inicial' => $numeroInicial,
                'numero_final' => $numeroFinal
            ]);

            // Valida justificativa (mínimo 15 caracteres)
            $justificativa = trim($justificativa);
            if (strlen($justificativa) < 15) {
                throw new \Exception("Justificativa deve ter no mínimo 15 caracteres");
            }

            // Gera XML de inutilização
            $xmlEvento = $this->gerarXmlInutilizacao($serie, $numeroInicial, $numeroFinal, $justificativa, $cnpj);

            // Assina XML
            $xmlAssinado = $this->certificateManager->signXml($xmlEvento);

            // Envia para SEFAZ
            $resultado = $this->enviarEvento($xmlAssinado, '110102');

            if ($resultado['success']) {
                // Salva inutilização
                $inutilizacaoId = $this->nfeRepository->saveInutilizacao([
                    'company_id' => $companyId,
                    'serie' => $serie,
                    'numero_inicial' => $numeroInicial,
                    'numero_final' => $numeroFinal,
                    'justificativa' => $justificativa,
                    'protocolo_inutilizacao' => $resultado['protocolo'],
                    'xml_inutilizacao' => $xmlAssinado,
                    'xml_retorno' => $resultado['xml_retorno'],
                    'status' => 'autorizado',
                    'created_by' => $userId
                ]);

                Logger::info("Inutilização realizada com sucesso", [
                    'protocolo' => $resultado['protocolo']
                ]);

                return [
                    'success' => true,
                    'inutilizacao_id' => $inutilizacaoId,
                    'protocolo' => $resultado['protocolo'],
                    'status' => 'autorizado'
                ];
            } else {
                return [
                    'success' => false,
                    'motivo_rejeicao' => $resultado['motivo_rejeicao'] ?? 'Erro desconhecido'
                ];
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao inutilizar numeração", [
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
     * Gera XML de cancelamento
     */
    private function gerarXmlCancelamento(string $chaveAcesso, string $justificativa, string $nfeId): string
    {
        $sequencia = $this->nfeRepository->getNextEventoSequencia($nfeId);
        $ambiente = $this->ambiente === 'producao' ? '1' : '2';
        $dataEvento = date('c');

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="' . $this->versao . '">';
        $xml .= '<idLote>' . time() . '</idLote>';
        $xml .= '<evento versao="' . $this->versao . '">';
        $xml .= '<infEvento Id="ID' . $this->gerarIdEvento($chaveAcesso, '110111', $sequencia) . '">';
        $xml .= '<cOrgao>' . $this->getUfCode() . '</cOrgao>';
        $xml .= '<tpAmb>' . $ambiente . '</tpAmb>';
        $xml .= '<CNPJ>' . $this->certificateManager->getCnpj() . '</CNPJ>';
        $xml .= '<chNFe>' . $chaveAcesso . '</chNFe>';
        $xml .= '<dhEvento>' . $dataEvento . '</dhEvento>';
        $xml .= '<tpEvento>110111</tpEvento>';
        $xml .= '<nSeqEvento>' . $sequencia . '</nSeqEvento>';
        $xml .= '<verEvento>' . $this->versao . '</verEvento>';
        $xml .= '<detEvento versao="' . $this->versao . '">';
        $xml .= '<descEvento>Cancelamento</descEvento>';
        $xml .= '<nProt>' . '' . '</nProt>'; // Será preenchido pela SEFAZ
        $xml .= '<xJust>' . htmlspecialchars($justificativa, ENT_XML1) . '</xJust>';
        $xml .= '</detEvento>';
        $xml .= '</infEvento>';
        $xml .= '</evento>';
        $xml .= '</envEvento>';

        return $xml;
    }

    /**
     * Gera XML de CC-e
     */
    private function gerarXmlCCe(string $chaveAcesso, string $correcao, int $sequencia): string
    {
        $ambiente = $this->ambiente === 'producao' ? '1' : '2';
        $dataEvento = date('c');

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="' . $this->versao . '">';
        $xml .= '<idLote>' . time() . '</idLote>';
        $xml .= '<evento versao="' . $this->versao . '">';
        $xml .= '<infEvento Id="ID' . $this->gerarIdEvento($chaveAcesso, '110110', $sequencia) . '">';
        $xml .= '<cOrgao>' . $this->getUfCode() . '</cOrgao>';
        $xml .= '<tpAmb>' . $ambiente . '</tpAmb>';
        $xml .= '<CNPJ>' . $this->certificateManager->getCnpj() . '</CNPJ>';
        $xml .= '<chNFe>' . $chaveAcesso . '</chNFe>';
        $xml .= '<dhEvento>' . $dataEvento . '</dhEvento>';
        $xml .= '<tpEvento>110110</tpEvento>';
        $xml .= '<nSeqEvento>' . $sequencia . '</nSeqEvento>';
        $xml .= '<verEvento>' . $this->versao . '</verEvento>';
        $xml .= '<detEvento versao="' . $this->versao . '">';
        $xml .= '<descEvento>Carta de Correção</descEvento>';
        $xml .= '<xCorrecao>' . htmlspecialchars($correcao, ENT_XML1) . '</xCorrecao>';
        $xml .= '<xCondUso>A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de NF-e, desde que o erro não esteja relacionado com: I - as variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade, valor da operação ou da prestação; II - a correção de dados cadastrais que implique mudança na identificação do remetente ou do destinatário; III - a data de emissão ou de saída/entrada.</xCondUso>';
        $xml .= '</detEvento>';
        $xml .= '</infEvento>';
        $xml .= '</evento>';
        $xml .= '</envEvento>';

        return $xml;
    }

    /**
     * Gera XML de inutilização
     */
    private function gerarXmlInutilizacao(string $serie, string $numeroInicial, string $numeroFinal, string $justificativa, string $cnpj): string
    {
        $ambiente = $this->ambiente === 'producao' ? '1' : '2';
        $ano = date('y');
        $cnpj = preg_replace('/[^0-9]/', '', $cnpj);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">';
        $xml .= '<infInut Id="ID' . $this->gerarIdInutilizacao($cnpj, $serie, $numeroInicial, $numeroFinal) . '">';
        $xml .= '<tpAmb>' . $ambiente . '</tpAmb>';
        $xml .= '<xServ>INUTILIZAR</xServ>';
        $xml .= '<cUF>' . $this->getUfCode() . '</cUF>';
        $xml .= '<ano>' . $ano . '</ano>';
        $xml .= '<CNPJ>' . $cnpj . '</CNPJ>';
        $xml .= '<mod>55</mod>';
        $xml .= '<serie>' . $serie . '</serie>';
        $xml .= '<nNFIni>' . $numeroInicial . '</nNFIni>';
        $xml .= '<nNFFin>' . $numeroFinal . '</nNFFin>';
        $xml .= '<xJust>' . htmlspecialchars($justificativa, ENT_XML1) . '</xJust>';
        $xml .= '</infInut>';
        $xml .= '</inutNFe>';

        return $xml;
    }

    /**
     * Envia evento para SEFAZ
     */
    private function enviarEvento(string $xmlAssinado, string $tipoEvento): array
    {
        try {
            $wsdl = $this->getRecepcaoEventoWsdl();
            $soapClient = new SoapClient($wsdl, $this->ambiente);

            // Envolve XML no envelope SOAP
            $xmlEnvelope = $this->enveloparXmlEvento($xmlAssinado);

            $params = [
                'nfeDadosMsg' => $xmlEnvelope
            ];

            $result = $soapClient->send('nfeRecepcaoEvento', $params);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'motivo_rejeicao' => $result['error'] ?? 'Erro desconhecido',
                    'xml_retorno' => $result['response_xml'] ?? null
                ];
            }

            // Processa resposta
            return $this->processarRespostaEvento($result['response_xml']);

        } catch (\Exception $e) {
            Logger::error("Erro ao enviar evento", [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'motivo_rejeicao' => $e->getMessage()
            ];
        }
    }

    /**
     * Processa resposta de evento
     */
    private function processarRespostaEvento(string $xml): array
    {
        try {
            $dom = new DOMDocument();
            $dom->loadXML($xml);

            $xpath = new DOMXPath($dom);
            $xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');

            $status = $xpath->evaluate('string(//nfe:cStat)');
            $motivo = $xpath->evaluate('string(//nfe:xMotivo)');
            $protocolo = $xpath->evaluate('string(//nfe:infEvento/nfe:chNFe)');

            if ($status === '135' || $status === '136') { // Evento registrado
                $protocolo = $xpath->evaluate('string(//nfe:infEvento/nfe:nProt)');
                return [
                    'success' => true,
                    'protocolo' => $protocolo,
                    'status' => $status,
                    'motivo' => $motivo,
                    'xml_retorno' => $xml
                ];
            } else {
                return [
                    'success' => false,
                    'motivo_rejeicao' => $motivo,
                    'codigo_status' => $status,
                    'xml_retorno' => $xml
                ];
            }

        } catch (\Exception $e) {
            return [
                'success' => false,
                'motivo_rejeicao' => 'Erro ao processar resposta: ' . $e->getMessage(),
                'xml_retorno' => $xml
            ];
        }
    }

    /**
     * Envelopa XML de evento para SOAP
     */
    private function enveloparXmlEvento(string $xml): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>' .
               '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' .
               'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' .
               'xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' .
               '<soap12:Body>' .
               '<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">' .
               htmlspecialchars($xml, ENT_XML1 | ENT_QUOTES) .
               '</nfeDadosMsg>' .
               '</soap12:Body>' .
               '</soap12:Envelope>';
    }

    /**
     * Retorna WSDL de recepção de eventos
     */
    private function getRecepcaoEventoWsdl(): string
    {
        if ($this->ambiente === 'producao') {
            return 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx?wsdl';
        }
        return 'https://hom.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx?wsdl';
    }

    /**
     * Gera ID do evento
     */
    private function gerarIdEvento(string $chaveAcesso, string $tipoEvento, int $sequencia): string
    {
        return $tipoEvento . $chaveAcesso . str_pad($sequencia, 2, '0', STR_PAD_LEFT);
    }

    /**
     * Gera ID de inutilização
     */
    private function gerarIdInutilizacao(string $cnpj, string $serie, string $numeroInicial, string $numeroFinal): string
    {
        $uf = $this->getUfCode();
        $ano = date('y');
        return 'IN' . $uf . $ano . $cnpj . '55' . str_pad($serie, 3, '0', STR_PAD_LEFT) . str_pad($numeroInicial, 9, '0', STR_PAD_LEFT) . str_pad($numeroFinal, 9, '0', STR_PAD_LEFT);
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

        return $ufCodes[$this->uf] ?? '35';
    }
}

