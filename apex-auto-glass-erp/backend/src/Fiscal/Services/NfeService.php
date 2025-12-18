<?php

namespace App\Fiscal\Services;

use App\Fiscal\Helpers\CertificateManager;
use App\Fiscal\Helpers\XmlValidator;
use App\Fiscal\Helpers\SoapClient;
use App\Repositories\NfeRepository;
use App\Config\Logger;
use DOMDocument;
use DOMXPath;

/**
 * Serviço principal de NF-e
 * Gera XML, assina, valida e envia para autorização
 */
class NfeService
{
    private $certificateManager;
    private $xmlValidator;
    private $nfeRepository;
    private $uf;
    private $ambiente;
    private $versao = '4.00';

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
        $this->xmlValidator = new XmlValidator();
    }

    /**
     * Gera e autoriza uma NF-e
     */
    public function gerarEAutorizar(array $dadosNfe): array
    {
        try {
            Logger::info("Iniciando geração de NF-e", [
                'company_id' => $dadosNfe['company_id'],
                'numero' => $dadosNfe['numero'] ?? null
            ]);

            // 1. Gera XML da NF-e
            $xml = $this->gerarXml($dadosNfe);
            Logger::info("XML da NF-e gerado");

            // 2. Valida XML
            if (!$this->xmlValidator->validateStructure($xml)) {
                $errors = $this->xmlValidator->getErrors();
                Logger::error("XML inválido", ['errors' => $errors]);
                throw new \Exception("XML inválido: " . implode(', ', array_column($errors, 'message')));
            }

            // 3. Assina XML
            $xmlAssinado = $this->certificateManager->signXml($xml);
            Logger::info("XML assinado com sucesso");

            // 4. Extrai chave de acesso
            $chaveAcesso = $this->extrairChaveAcesso($xmlAssinado);

            // 5. Salva NF-e no banco (rascunho)
            $nfeData = array_merge($dadosNfe, [
                'chave_acesso' => $chaveAcesso,
                'xml_assinado' => $xmlAssinado,
                'status' => 'assinada'
            ]);

            $nfeId = $this->nfeRepository->save($nfeData);
            Logger::info("NF-e salva no banco", ['nfe_id' => $nfeId]);

            // 6. Envia para autorização
            $resultadoAutorizacao = $this->autorizar($xmlAssinado, $nfeId, $dadosNfe['company_id']);

            return [
                'success' => $resultadoAutorizacao['success'],
                'nfe_id' => $nfeId,
                'chave_acesso' => $chaveAcesso,
                'xml_assinado' => $xmlAssinado,
                'xml_autorizado' => $resultadoAutorizacao['xml_autorizado'] ?? null,
                'protocolo' => $resultadoAutorizacao['protocolo'] ?? null,
                'status' => $resultadoAutorizacao['status'] ?? 'assinada',
                'motivo_rejeicao' => $resultadoAutorizacao['motivo_rejeicao'] ?? null
            ];

        } catch (\Exception $e) {
            Logger::error("Erro ao gerar NF-e", [
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
     * Gera XML da NF-e
     */
    public function gerarXml(array $dadosNfe): string
    {
        $ambiente = $this->ambiente === 'producao' ? '1' : '2';
        $dataEmissao = $dadosNfe['data_emissao'] ?? date('c');
        $dataSaida = $dadosNfe['data_saida_entrada'] ?? $dataEmissao;

        // Remove caracteres especiais dos CNPJs/CPFs
        $emitenteCnpj = preg_replace('/[^0-9]/', '', $dadosNfe['emitente_cnpj']);
        $destinatarioCpfCnpj = preg_replace('/[^0-9]/', '', $dadosNfe['destinatario_cpf_cnpj']);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">';
        $xml .= '<infNFe Id="NFe' . $this->gerarIdNfe($dadosNfe) . '" versao="' . $this->versao . '">';
        
        // Identificação
        $xml .= '<ide>';
        $xml .= '<cUF>' . $this->getUfCode() . '</cUF>';
        $xml .= '<cNF>' . $this->gerarCodigoNumerico($dadosNfe['numero']) . '</cNF>';
        $xml .= '<natOp>' . htmlspecialchars($dadosNfe['natureza_operacao'] ?? 'VENDA', ENT_XML1) . '</natOp>';
        $xml .= '<mod>55</mod>';
        $xml .= '<serie>' . htmlspecialchars($dadosNfe['serie'], ENT_XML1) . '</serie>';
        $xml .= '<nNF>' . htmlspecialchars($dadosNfe['numero'], ENT_XML1) . '</nNF>';
        $xml .= '<dhEmi>' . date('c', strtotime($dataEmissao)) . '</dhEmi>';
        $xml .= '<dhSaiEnt>' . date('c', strtotime($dataSaida)) . '</dhSaiEnt>';
        $xml .= '<tpNF>' . ($dadosNfe['tipo_nf'] ?? '1') . '</tpNF>'; // 1=Saída, 0=Entrada
        $xml .= '<idDest>' . ($dadosNfe['id_dest'] ?? '1') . '</idDest>'; // 1=Interna, 2=Interestadual, 3=Exterior
        $xml .= '<cMunFG>' . ($dadosNfe['codigo_municipio'] ?? '') . '</cMunFG>';
        $xml .= '<tpImp>1</tpImp>'; // 1=DANFE retrato
        $xml .= '<tpEmis>1</tpEmis>'; // 1=Normal
        $xml .= '<cDV>' . $this->calcularDigitoVerificador($dadosNfe['numero']) . '</cDV>';
        $xml .= '<tpAmb>' . $ambiente . '</tpAmb>';
        $xml .= '<finNFe>' . ($dadosNfe['finalidade'] ?? '1') . '</finNFe>'; // 1=Normal
        $xml .= '<indFinal>0</indFinal>'; // 0=Não, 1=Sim
        $xml .= '<indPres>1</indPres>'; // 1=Presencial
        $xml .= '<procEmi>0</procEmi>'; // 0=Emissão própria
        $xml .= '<verProc>' . htmlspecialchars($dadosNfe['versao_processo'] ?? 'APEX-GLASS-1.0', ENT_XML1) . '</verProc>';
        $xml .= '</ide>';

        // Emitente
        $xml .= '<emit>';
        $xml .= '<CNPJ>' . $emitenteCnpj . '</CNPJ>';
        $xml .= '<xNome>' . htmlspecialchars($dadosNfe['emitente_razao_social'], ENT_XML1) . '</xNome>';
        $xml .= '<xFant>' . htmlspecialchars($dadosNfe['emitente_nome_fantasia'] ?? $dadosNfe['emitente_razao_social'], ENT_XML1) . '</xFant>';
        $xml .= '<enderEmit>';
        $xml .= '<xLgr>' . htmlspecialchars($dadosNfe['emitente_logradouro'] ?? '', ENT_XML1) . '</xLgr>';
        $xml .= '<nro>' . htmlspecialchars($dadosNfe['emitente_numero'] ?? '', ENT_XML1) . '</nro>';
        $xml .= '<xBairro>' . htmlspecialchars($dadosNfe['emitente_bairro'] ?? '', ENT_XML1) . '</xBairro>';
        $xml .= '<cMun>' . ($dadosNfe['emitente_codigo_municipio'] ?? '') . '</cMun>';
        $xml .= '<xMun>' . htmlspecialchars($dadosNfe['emitente_municipio'] ?? '', ENT_XML1) . '</xMun>';
        $xml .= '<UF>' . htmlspecialchars($dadosNfe['emitente_uf'] ?? $this->uf, ENT_XML1) . '</UF>';
        $xml .= '<CEP>' . preg_replace('/[^0-9]/', '', $dadosNfe['emitente_cep'] ?? '') . '</CEP>';
        $xml .= '<cPais>1058</cPais>';
        $xml .= '<xPais>BRASIL</xPais>';
        $xml .= '<fone>' . preg_replace('/[^0-9]/', '', $dadosNfe['emitente_telefone'] ?? '') . '</fone>';
        $xml .= '</enderEmit>';
        $xml .= '<IE>' . preg_replace('/[^0-9]/', '', $dadosNfe['emitente_ie'] ?? '') . '</IE>';
        $xml .= '<CRT>' . ($dadosNfe['emitente_crt'] ?? '3') . '</CRT>'; // 1=Simples Nacional, 2=Simples Nacional excesso, 3=Regime Normal
        $xml .= '</emit>';

        // Destinatário
        $xml .= '<dest>';
        $isCnpj = strlen($destinatarioCpfCnpj) === 14;
        if ($isCnpj) {
            $xml .= '<CNPJ>' . $destinatarioCpfCnpj . '</CNPJ>';
        } else {
            $xml .= '<CPF>' . $destinatarioCpfCnpj . '</CPF>';
        }
        $xml .= '<xNome>' . htmlspecialchars($dadosNfe['destinatario_razao_social'], ENT_XML1) . '</xNome>';
        $xml .= '<enderDest>';
        $xml .= '<xLgr>' . htmlspecialchars($dadosNfe['destinatario_logradouro'] ?? '', ENT_XML1) . '</xLgr>';
        $xml .= '<nro>' . htmlspecialchars($dadosNfe['destinatario_numero'] ?? '', ENT_XML1) . '</nro>';
        $xml .= '<xBairro>' . htmlspecialchars($dadosNfe['destinatario_bairro'] ?? '', ENT_XML1) . '</xBairro>';
        $xml .= '<cMun>' . ($dadosNfe['destinatario_codigo_municipio'] ?? '') . '</cMun>';
        $xml .= '<xMun>' . htmlspecialchars($dadosNfe['destinatario_municipio'] ?? '', ENT_XML1) . '</xMun>';
        $xml .= '<UF>' . htmlspecialchars($dadosNfe['destinatario_uf'] ?? '', ENT_XML1) . '</UF>';
        $xml .= '<CEP>' . preg_replace('/[^0-9]/', '', $dadosNfe['destinatario_cep'] ?? '') . '</CEP>';
        $xml .= '<cPais>1058</cPais>';
        $xml .= '<xPais>BRASIL</xPais>';
        $xml .= '<fone>' . preg_replace('/[^0-9]/', '', $dadosNfe['destinatario_telefone'] ?? '') . '</fone>';
        $xml .= '</enderDest>';
        if ($isCnpj) {
            $xml .= '<IE>' . preg_replace('/[^0-9]/', '', $dadosNfe['destinatario_ie'] ?? '') . '</IE>';
        }
        $xml .= '<email>' . htmlspecialchars($dadosNfe['destinatario_email'] ?? '', ENT_XML1) . '</email>';
        $xml .= '</dest>';

        // Itens
        foreach ($dadosNfe['itens'] as $index => $item) {
            $xml .= '<det nItem="' . ($index + 1) . '">';
            $xml .= '<prod>';
            $xml .= '<cProd>' . htmlspecialchars($item['codigo'] ?? '', ENT_XML1) . '</cProd>';
            $xml .= '<cEAN></cEAN>';
            $xml .= '<xProd>' . htmlspecialchars($item['descricao'], ENT_XML1) . '</xProd>';
            $xml .= '<NCM>' . htmlspecialchars($item['ncm'] ?? '', ENT_XML1) . '</NCM>';
            $xml .= '<CFOP>' . htmlspecialchars($item['cfop'] ?? '', ENT_XML1) . '</CFOP>';
            $xml .= '<uCom>' . htmlspecialchars($item['unidade'], ENT_XML1) . '</uCom>';
            $xml .= '<qCom>' . number_format($item['quantidade'], 4, '.', '') . '</qCom>';
            $xml .= '<vUnCom>' . number_format($item['valor_unitario'], 4, '.', '') . '</vUnCom>';
            $xml .= '<vProd>' . number_format($item['valor_total'], 2, '.', '') . '</vProd>';
            if (isset($item['desconto']) && $item['desconto'] > 0) {
                $xml .= '<vDesc>' . number_format($item['desconto'], 2, '.', '') . '</vDesc>';
            }
            $xml .= '<cEANTrib></cEANTrib>';
            $xml .= '<uTrib>' . htmlspecialchars($item['unidade'], ENT_XML1) . '</uTrib>';
            $xml .= '<qTrib>' . number_format($item['quantidade'], 4, '.', '') . '</qTrib>';
            $xml .= '<vUnTrib>' . number_format($item['valor_unitario'], 4, '.', '') . '</vUnTrib>';
            $xml .= '<vFrete>0.00</vFrete>';
            $xml .= '<vSeg>0.00</vSeg>';
            $xml .= '<vDesc>0.00</vDesc>';
            $xml .= '<vOutro>0.00</vOutro>';
            $xml .= '<indTot>1</indTot>';
            $xml .= '</prod>';

            // Impostos
            $xml .= '<imposto>';
            $xml .= '<vTotTrib>' . number_format(($item['icms_valor'] ?? 0) + ($item['ipi_valor'] ?? 0) + ($item['pis_valor'] ?? 0) + ($item['cofins_valor'] ?? 0), 2, '.', '') . '</vTotTrib>';
            
            // ICMS
            $xml .= '<ICMS>';
            $xml .= '<ICMS00>';
            $xml .= '<orig>0</orig>';
            $xml .= '<CST>00</CST>';
            $xml .= '<modBC>0</modBC>';
            $xml .= '<vBC>' . number_format($item['icms_base_calculo'] ?? 0, 2, '.', '') . '</vBC>';
            $xml .= '<pICMS>' . number_format($item['icms_aliquota'] ?? 0, 2, '.', '') . '</pICMS>';
            $xml .= '<vICMS>' . number_format($item['icms_valor'] ?? 0, 2, '.', '') . '</vICMS>';
            $xml .= '</ICMS00>';
            $xml .= '</ICMS>';

            // IPI
            if (isset($item['ipi_valor']) && $item['ipi_valor'] > 0) {
                $xml .= '<IPI>';
                $xml .= '<cEnq>999</cEnq>';
                $xml .= '<IPITrib>';
                $xml .= '<CST>00</CST>';
                $xml .= '<vBC>' . number_format($item['ipi_base_calculo'] ?? 0, 2, '.', '') . '</vBC>';
                $xml .= '<pIPI>' . number_format($item['ipi_aliquota'] ?? 0, 2, '.', '') . '</pIPI>';
                $xml .= '<vIPI>' . number_format($item['ipi_valor'], 2, '.', '') . '</vIPI>';
                $xml .= '</IPITrib>';
                $xml .= '</IPI>';
            }

            // PIS
            $xml .= '<PIS>';
            $xml .= '<PISAliq>';
            $xml .= '<CST>01</CST>';
            $xml .= '<vBC>' . number_format($item['pis_base_calculo'] ?? 0, 2, '.', '') . '</vBC>';
            $xml .= '<pPIS>' . number_format($item['pis_aliquota'] ?? 0, 2, '.', '') . '</pPIS>';
            $xml .= '<vPIS>' . number_format($item['pis_valor'] ?? 0, 2, '.', '') . '</vPIS>';
            $xml .= '</PISAliq>';
            $xml .= '</PIS>';

            // COFINS
            $xml .= '<COFINS>';
            $xml .= '<COFINSAliq>';
            $xml .= '<CST>01</CST>';
            $xml .= '<vBC>' . number_format($item['cofins_base_calculo'] ?? 0, 2, '.', '') . '</vBC>';
            $xml .= '<pCOFINS>' . number_format($item['cofins_aliquota'] ?? 0, 2, '.', '') . '</pCOFINS>';
            $xml .= '<vCOFINS>' . number_format($item['cofins_valor'] ?? 0, 2, '.', '') . '</vCOFINS>';
            $xml .= '</COFINSAliq>';
            $xml .= '</COFINS>';

            $xml .= '</imposto>';
            $xml .= '</det>';
        }

        // Totais
        $xml .= '<total>';
        $xml .= '<ICMSTot>';
        $xml .= '<vBC>' . number_format($dadosNfe['valor_icms_base'] ?? 0, 2, '.', '') . '</vBC>';
        $xml .= '<vICMS>' . number_format($dadosNfe['valor_icms'] ?? 0, 2, '.', '') . '</vICMS>';
        $xml .= '<vICMSDeson>0.00</vICMSDeson>';
        $xml .= '<vFCP>0.00</vFCP>';
        $xml .= '<vBCST>0.00</vBCST>';
        $xml .= '<vST>0.00</vST>';
        $xml .= '<vFCPST>0.00</vFCPST>';
        $xml .= '<vFCPSTRet>0.00</vFCPSTRet>';
        $xml .= '<vProd>' . number_format($dadosNfe['valor_produtos'] ?? 0, 2, '.', '') . '</vProd>';
        $xml .= '<vFrete>0.00</vFrete>';
        $xml .= '<vSeg>0.00</vSeg>';
        $xml .= '<vDesc>0.00</vDesc>';
        $xml .= '<vII>0.00</vII>';
        $xml .= '<vIPI>' . number_format($dadosNfe['valor_ipi'] ?? 0, 2, '.', '') . '</vIPI>';
        $xml .= '<vIPIDevol>0.00</vIPIDevol>';
        $xml .= '<vPIS>' . number_format($dadosNfe['valor_pis'] ?? 0, 2, '.', '') . '</vPIS>';
        $xml .= '<vCOFINS>' . number_format($dadosNfe['valor_cofins'] ?? 0, 2, '.', '') . '</vCOFINS>';
        $xml .= '<vOutro>0.00</vOutro>';
        $xml .= '<vNF>' . number_format($dadosNfe['valor_total'], 2, '.', '') . '</vNF>';
        $xml .= '<vTotTrib>0.00</vTotTrib>';
        $xml .= '</ICMSTot>';
        $xml .= '</total>';

        // Transporte (opcional)
        if (isset($dadosNfe['transporte'])) {
            $xml .= '<transp>';
            $xml .= '<modFrete>' . ($dadosNfe['transporte']['modalidade_frete'] ?? '0') . '</modFrete>';
            $xml .= '</transp>';
        }

        // Pagamento (opcional)
        if (isset($dadosNfe['pagamento'])) {
            $xml .= '<pag>';
            foreach ($dadosNfe['pagamento'] as $pag) {
                $xml .= '<detPag>';
                $xml .= '<indPag>' . ($pag['indicador'] ?? '0') . '</indPag>';
                $xml .= '<tPag>' . ($pag['tipo'] ?? '01') . '</tPag>';
                $xml .= '<vPag>' . number_format($pag['valor'], 2, '.', '') . '</vPag>';
                $xml .= '</detPag>';
            }
            $xml .= '</pag>';
        }

        $xml .= '</infNFe>';
        $xml .= '</NFe>';

        return $xml;
    }

    /**
     * Autoriza NF-e na SEFAZ
     */
    public function autorizar(string $xmlAssinado, string $nfeId, string $companyId): array
    {
        try {
            Logger::info("Enviando NF-e para autorização", ['nfe_id' => $nfeId]);

            $wsdl = $this->getAutorizacaoWsdl();
            $soapClient = new SoapClient($wsdl, $this->ambiente);

            // Envolve XML no envelope SOAP
            $xmlEnvelope = $this->enveloparXml($xmlAssinado);

            $params = [
                'nfeDadosMsg' => $xmlEnvelope
            ];

            $result = $soapClient->send('nfeAutorizacaoLote', $params);

            if (!$result['success']) {
                $this->nfeRepository->updateStatus($nfeId, $companyId, 'rejeitada', null, null, null, $result['error']);
                return [
                    'success' => false,
                    'status' => 'rejeitada',
                    'motivo_rejeicao' => $result['error']
                ];
            }

            // Processa resposta
            $response = $this->processarRespostaAutorizacao($result['response_xml'], $nfeId, $companyId);

            return $response;

        } catch (\Exception $e) {
            Logger::error("Erro ao autorizar NF-e", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->nfeRepository->updateStatus($nfeId, $companyId, 'rejeitada', null, null, null, $e->getMessage());

            return [
                'success' => false,
                'status' => 'rejeitada',
                'motivo_rejeicao' => $e->getMessage()
            ];
        }
    }

    /**
     * Processa resposta de autorização
     */
    private function processarRespostaAutorizacao(string $xml, string $nfeId, string $companyId): array
    {
        try {
            $dom = new DOMDocument();
            $dom->loadXML($xml);

            $xpath = new DOMXPath($dom);
            $xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');

            $status = $xpath->evaluate('string(//nfe:cStat)');
            $motivo = $xpath->evaluate('string(//nfe:xMotivo)');
            $protocolo = $xpath->evaluate('string(//nfe:protNFe/nfe:infProt/nfe:nProt)');

            if ($status === '100' || $status === '150') { // Autorizada
                $xmlAutorizado = $xpath->evaluate('string(//nfe:protNFe)');
                
                $this->nfeRepository->updateStatus(
                    $nfeId,
                    $companyId,
                    'autorizada',
                    $protocolo,
                    $xml,
                    $xmlAutorizado
                );

                Logger::info("NF-e autorizada com sucesso", [
                    'nfe_id' => $nfeId,
                    'protocolo' => $protocolo
                ]);

                return [
                    'success' => true,
                    'status' => 'autorizada',
                    'protocolo' => $protocolo,
                    'xml_autorizado' => $xml,
                    'motivo' => $motivo
                ];
            } else {
                $this->nfeRepository->updateStatus($nfeId, $companyId, 'rejeitada', null, null, null, $motivo);

                Logger::error("NF-e rejeitada", [
                    'nfe_id' => $nfeId,
                    'status' => $status,
                    'motivo' => $motivo
                ]);

                return [
                    'success' => false,
                    'status' => 'rejeitada',
                    'motivo_rejeicao' => $motivo,
                    'codigo_status' => $status
                ];
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao processar resposta de autorização", [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'status' => 'rejeitada',
                'motivo_rejeicao' => 'Erro ao processar resposta: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Envelopa XML para envio SOAP
     */
    private function enveloparXml(string $xml): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>' .
               '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' .
               'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' .
               'xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' .
               '<soap12:Body>' .
               '<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">' .
               htmlspecialchars($xml, ENT_XML1 | ENT_QUOTES) .
               '</nfeDadosMsg>' .
               '</soap12:Body>' .
               '</soap12:Envelope>';
    }

    /**
     * Retorna WSDL de autorização
     */
    private function getAutorizacaoWsdl(): string
    {
        // Similar ao NfeStatusService, mas para autorização
        // Por simplicidade, usando ambiente nacional
        if ($this->ambiente === 'producao') {
            return 'https://www.nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx?wsdl';
        }
        return 'https://hom.nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx?wsdl';
    }

    /**
     * Extrai chave de acesso do XML
     */
    private function extrairChaveAcesso(string $xml): string
    {
        $dom = new DOMDocument();
        $dom->loadXML($xml);
        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');
        
        $id = $xpath->evaluate('string(//nfe:infNFe/@Id)');
        return str_replace('NFe', '', $id);
    }

    /**
     * Gera ID da NF-e
     */
    private function gerarIdNfe(array $dadosNfe): string
    {
        $uf = $this->getUfCode();
        $ano = date('y', strtotime($dadosNfe['data_emissao'] ?? 'now'));
        $mes = date('m', strtotime($dadosNfe['data_emissao'] ?? 'now'));
        $cnpj = preg_replace('/[^0-9]/', '', $dadosNfe['emitente_cnpj']);
        $modelo = '55';
        $serie = str_pad($dadosNfe['serie'], 3, '0', STR_PAD_LEFT);
        $numero = str_pad($dadosNfe['numero'], 9, '0', STR_PAD_LEFT);
        $tipoEmissao = '1';
        
        $chave = $uf . $ano . $mes . $cnpj . $modelo . $serie . $numero . $tipoEmissao;
        $dv = $this->calcularDigitoVerificadorChave($chave);
        
        return $chave . $dv;
    }

    /**
     * Calcula dígito verificador da chave de acesso
     */
    private function calcularDigitoVerificadorChave(string $chave): string
    {
        $soma = 0;
        $multiplicadores = [2, 3, 4, 5, 6, 7, 8, 9];
        
        for ($i = 0; $i < 43; $i++) {
            $soma += (int)$chave[$i] * $multiplicadores[$i % 8];
        }
        
        $resto = $soma % 11;
        return ($resto < 2) ? '0' : (string)(11 - $resto);
    }

    /**
     * Gera código numérico da NF-e
     */
    private function gerarCodigoNumerico(string $numero): string
    {
        return str_pad($numero, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Calcula dígito verificador do número da NF-e
     */
    private function calcularDigitoVerificador(string $numero): string
    {
        $soma = 0;
        $multiplicadores = [2, 3, 4, 5, 6, 7, 8, 9];
        $numero = str_pad($numero, 8, '0', STR_PAD_LEFT);
        
        for ($i = 0; $i < 8; $i++) {
            $soma += (int)$numero[$i] * $multiplicadores[$i % 8];
        }
        
        $resto = $soma % 11;
        return ($resto < 2) ? '0' : (string)(11 - $resto);
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

