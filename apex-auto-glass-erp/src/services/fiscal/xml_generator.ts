/**
 * GERADORES DE XML
 * Gera XML para NFe 4.0 e NFSe (ABRASF 2.04)
 */

import { NotaFiscal, ItemNotaFiscal, ImpostosItemNFe, ImpostosItemNFSe } from '@/types/fiscal';

/**
 * GERAR XML NFe
 * Gera XML no padrão NFe 4.0
 */
export function gerarXMLNFe(nota: NotaFiscal): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${nota.chave_acesso || gerarChaveAcesso(nota)}" versao="4.00">
        ${gerarIdeNFe(nota)}
        ${gerarEmitenteNFe(nota)}
        ${gerarDestinatarioNFe(nota)}
        ${gerarItensNFe(nota)}
        ${gerarTotaisNFe(nota)}
        ${gerarTransporteNFe(nota)}
        ${gerarPagamentoNFe(nota)}
        ${gerarInformacoesAdicionaisNFe(nota)}
    </infNFe>
</NFe>`;

    return formatarXML(xml);
}

/**
 * GERAR XML NFSe
 * Gera XML no padrão ABRASF 2.04
 */
export function gerarXMLNFSe(nota: NotaFiscal): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/ABRASF/arquivos/nfse.xsd">
    <LoteRps Id="Lote${nota.numero}" versao="2.04">
        <NumeroLote>${nota.numero}</NumeroLote>
        <Cnpj>${nota.emitente.cpf_cnpj}</Cnpj>
        <InscricaoMunicipal>${nota.emitente.inscricao_municipal || ''}</InscricaoMunicipal>
        <QuantidadeRps>${nota.itens.length}</QuantidadeRps>
        <ListaRps>
            ${nota.itens.map((item, index) => gerarRpsNFSe(nota, item, index + 1)).join('\n')}
        </ListaRps>
    </LoteRps>
</EnviarLoteRpsEnvio>`;

    return formatarXML(xml);
}

/**
 * Gerar seção IDE da NFe
 */
function gerarIdeNFe(nota: NotaFiscal): string {
    const dataEmissao = new Date(nota.data_emissao).toISOString();
    const finNFe = nota.finalidade === 'devolucao' ? '4' : 
                   nota.finalidade === 'complementar' ? '2' : 
                   nota.finalidade === 'ajuste' ? '3' : '1';

    return `
        <ide>
            <cUF>${obterCodigoUF(nota.emitente.endereco.uf)}</cUF>
            <cNF>${gerarCodigoAleatorio()}</cNF>
            <mod>55</mod>
            <serie>${nota.serie}</serie>
            <nNF>${nota.numero}</nNF>
            <dhEmi>${dataEmissao}</dhEmi>
            <dhSaiEnt>${nota.data_saida_entrada ? new Date(nota.data_saida_entrada).toISOString() : dataEmissao}</dhSaiEnt>
            <tpNF>${nota.tipo_operacao === 'entrada' ? '0' : '1'}</tpNF>
            <idDest>${nota.tipo_operacao === 'entrada' ? '1' : '2'}</idDest>
            <cMunFG>${nota.emitente.endereco.codigo_municipio}</cMunFG>
            <tpImp>1</tpImp>
            <tpEmis>1</tpEmis>
            <cDV>${calcularDigitoVerificador(nota.chave_acesso || '')}</cDV>
            <tpAmb>2</tpAmb>
            <finNFe>${finNFe}</finNFe>
            <indFinal>0</indFinal>
            <indPres>9</indPres>
            <procEmi>0</procEmi>
            <verProc>APEX-ERP-1.0</verProc>
        </ide>`;
}

/**
 * Gerar seção Emitente da NFe
 */
function gerarEmitenteNFe(nota: NotaFiscal): string {
    const cpfCnpj = nota.emitente.cpf_cnpj.replace(/\D/g, '');
    const isCNPJ = cpfCnpj.length === 14;

    return `
        <emit>
            ${isCNPJ ? `<CNPJ>${cpfCnpj}</CNPJ>` : `<CPF>${cpfCnpj}</CPF>`}
            <xNome>${escapeXML(nota.emitente.razao_social)}</xNome>
            ${nota.emitente.nome_fantasia ? `<xFant>${escapeXML(nota.emitente.nome_fantasia)}</xFant>` : ''}
            <enderEmit>
                <xLgr>${escapeXML(nota.emitente.endereco.logradouro)}</xLgr>
                <nro>${escapeXML(nota.emitente.endereco.numero)}</nro>
                ${nota.emitente.endereco.complemento ? `<xCpl>${escapeXML(nota.emitente.endereco.complemento)}</xCpl>` : ''}
                <xBairro>${escapeXML(nota.emitente.endereco.bairro)}</xBairro>
                <cMun>${nota.emitente.endereco.codigo_municipio}</cMun>
                <xMun>${escapeXML(nota.emitente.endereco.municipio)}</xMun>
                <UF>${nota.emitente.endereco.uf}</UF>
                <CEP>${nota.emitente.endereco.cep.replace(/\D/g, '')}</CEP>
                <cPais>105</cPais>
                <xPais>BRASIL</xPais>
                ${nota.emitente.contato?.telefone ? `<fone>${nota.emitente.contato.telefone.replace(/\D/g, '')}</fone>` : ''}
            </enderEmit>
            ${nota.emitente.inscricao_estadual ? `<IE>${nota.emitente.inscricao_estadual}</IE>` : '<IE>ISENTO</IE>'}
            ${nota.emitente.inscricao_municipal ? `<IM>${nota.emitente.inscricao_municipal}</IM>` : ''}
            <CNAE>${nota.emitente.endereco.codigo_municipio}</CNAE>
            <CRT>${nota.regime_tributario === 'simples_nacional' ? '1' : '3'}</CRT>
        </emit>`;
}

/**
 * Gerar seção Destinatário da NFe
 */
function gerarDestinatarioNFe(nota: NotaFiscal): string {
    const cpfCnpj = nota.destinatario.cpf_cnpj.replace(/\D/g, '');
    const isCNPJ = cpfCnpj.length === 14;

    return `
        <dest>
            ${isCNPJ ? `<CNPJ>${cpfCnpj}</CNPJ>` : `<CPF>${cpfCnpj}</CPF>`}
            <xNome>${escapeXML(nota.destinatario.razao_social)}</xNome>
            <enderDest>
                <xLgr>${escapeXML(nota.destinatario.endereco.logradouro)}</xLgr>
                <nro>${escapeXML(nota.destinatario.endereco.numero)}</nro>
                ${nota.destinatario.endereco.complemento ? `<xCpl>${escapeXML(nota.destinatario.endereco.complemento)}</xCpl>` : ''}
                <xBairro>${escapeXML(nota.destinatario.endereco.bairro)}</xBairro>
                <cMun>${nota.destinatario.endereco.codigo_municipio}</cMun>
                <xMun>${escapeXML(nota.destinatario.endereco.municipio)}</xMun>
                <UF>${nota.destinatario.endereco.uf}</UF>
                <CEP>${nota.destinatario.endereco.cep.replace(/\D/g, '')}</CEP>
                <cPais>105</cPais>
                <xPais>BRASIL</xPais>
                ${nota.destinatario.contato?.telefone ? `<fone>${nota.destinatario.contato.telefone.replace(/\D/g, '')}</fone>` : ''}
            </enderDest>
            ${nota.destinatario.inscricao_estadual ? `<IE>${nota.destinatario.inscricao_estadual}</IE>` : '<indIEDest>9</indIEDest>'}
            ${nota.destinatario.contato?.email ? `<email>${escapeXML(nota.destinatario.contato.email)}</email>` : ''}
        </dest>`;
}

/**
 * Gerar itens da NFe
 */
function gerarItensNFe(nota: NotaFiscal): string {
    return `
        <det>
            ${nota.itens.map((item, index) => gerarItemNFe(item, index + 1)).join('\n        </det>\n        <det>')}
        </det>`;
}

/**
 * Gerar um item da NFe
 */
function gerarItemNFe(item: ItemNotaFiscal, sequencia: number): string {
    if (item.tipo !== 'produto') return '';
    
    const impostos = item.impostos as ImpostosItemNFe;
    
    return `
            <nItem>${sequencia}</nItem>
            <prod>
                <cProd>${escapeXML(item.codigo)}</cProd>
                <cEAN></cEAN>
                <xProd>${escapeXML(item.descricao)}</xProd>
                <NCM>${item.ncm || '00000000'}</NCM>
                <CFOP>${item.cfop || '5101'}</CFOP>
                <uCom>${item.unidade}</uCom>
                <qCom>${item.quantidade.toFixed(4)}</qCom>
                <vUnCom>${item.valor_unitario.toFixed(4)}</vUnCom>
                <vProd>${item.valor_total.toFixed(2)}</vProd>
                <cEANTrib></cEANTrib>
                <uTrib>${item.unidade}</uTrib>
                <qTrib>${item.quantidade.toFixed(4)}</qTrib>
                <vUnTrib>${item.valor_unitario.toFixed(4)}</vUnTrib>
                ${item.desconto > 0 ? `<vFrete>0.00</vFrete>` : ''}
                ${item.desconto > 0 ? `<vSeg>0.00</vSeg>` : ''}
                ${item.desconto > 0 ? `<vDesc>${item.desconto.toFixed(2)}</vDesc>` : ''}
                ${item.desconto > 0 ? `<vOutro>0.00</vOutro>` : ''}
                <indTot>1</indTot>
            </prod>
            <imposto>
                <vTotTrib>${((impostos.icms.valor || 0) + (impostos.ipi.valor || 0) + (impostos.pis.valor || 0) + (impostos.cofins.valor || 0)).toFixed(2)}</vTotTrib>
                ${gerarICMSNFe(impostos.icms)}
                ${gerarIPINFe(impostos.ipi)}
                ${gerarPISNFe(impostos.pis)}
                ${gerarCOFINSNFe(impostos.cofins)}
            </imposto>`;
}

/**
 * Gerar ICMS da NFe
 */
function gerarICMSNFe(icms: ImpostosItemNFe['icms']): string {
    const cst = icms.csosn || icms.cst || '102';
    const isSimples = !!icms.csosn;
    
    if (isSimples) {
        return `
                <ICMS>
                    <ICMSSN102>
                        <orig>${icms.origem || '0'}</orig>
                        <CSOSN>${cst}</CSOSN>
                    </ICMSSN102>
                </ICMS>`;
    } else {
        if (cst === '00') {
            return `
                <ICMS>
                    <ICMS00>
                        <orig>${icms.origem || '0'}</orig>
                        <CST>${cst}</CST>
                        <modBC>0</modBC>
                        <vBC>${icms.base_calculo.toFixed(2)}</vBC>
                        <pICMS>${icms.aliquota.toFixed(2)}</pICMS>
                        <vICMS>${icms.valor.toFixed(2)}</vICMS>
                    </ICMS00>
                </ICMS>`;
        } else {
            return `
                <ICMS>
                    <ICMS${cst}>
                        <orig>${icms.origem || '0'}</orig>
                        <CST>${cst}</CST>
                    </ICMS${cst}>
                </ICMS>`;
        }
    }
}

/**
 * Gerar IPI da NFe
 */
function gerarIPINFe(ipi: ImpostosItemNFe['ipi']): string {
    if (ipi.valor === 0) return '';
    
    return `
                <IPI>
                    <IPITrib>
                        <CST>${ipi.cst}</CST>
                        <vBC>${ipi.base_calculo.toFixed(2)}</vBC>
                        <pIPI>${ipi.aliquota.toFixed(2)}</pIPI>
                        <vIPI>${ipi.valor.toFixed(2)}</vIPI>
                    </IPITrib>
                </IPI>`;
}

/**
 * Gerar PIS da NFe
 */
function gerarPISNFe(pis: ImpostosItemNFe['pis']): string {
    return `
                <PIS>
                    <PISAliq>
                        <CST>${pis.cst}</CST>
                        <vBC>${pis.base_calculo.toFixed(2)}</vBC>
                        <pPIS>${pis.aliquota.toFixed(2)}</pPIS>
                        <vPIS>${pis.valor.toFixed(2)}</vPIS>
                    </PISAliq>
                </PIS>`;
}

/**
 * Gerar COFINS da NFe
 */
function gerarCOFINSNFe(cofins: ImpostosItemNFe['cofins']): string {
    return `
                <COFINS>
                    <COFINSAliq>
                        <CST>${cofins.cst}</CST>
                        <vBC>${cofins.base_calculo.toFixed(2)}</vBC>
                        <pCOFINS>${cofins.aliquota.toFixed(2)}</pCOFINS>
                        <vCOFINS>${cofins.valor.toFixed(2)}</vCOFINS>
                    </COFINSAliq>
                </COFINS>`;
}

/**
 * Gerar totais da NFe
 */
function gerarTotaisNFe(nota: NotaFiscal): string {
    const totais = nota.totais;
    
    return `
        <total>
            <ICMSTot>
                <vBC>${(totais.valor_icms / (totais.valor_icms > 0 ? 18 : 1) * 100).toFixed(2)}</vBC>
                <vICMS>${totais.valor_icms.toFixed(2)}</vICMS>
                <vICMSDeson>0.00</vICMSDeson>
                <vFCP>0.00</vFCP>
                <vBCST>${totais.valor_icms_st.toFixed(2)}</vBCST>
                <vST>${totais.valor_icms_st.toFixed(2)}</vST>
                <vFCPST>0.00</vFCPST>
                <vFCPSTRet>0.00</vFCPSTRet>
                <vProd>${totais.valor_produtos.toFixed(2)}</vProd>
                <vFrete>${totais.valor_frete.toFixed(2)}</vFrete>
                <vSeg>${totais.valor_seguro.toFixed(2)}</vSeg>
                <vDesc>${totais.valor_descontos.toFixed(2)}</vDesc>
                <vII>0.00</vII>
                <vIPI>${totais.valor_ipi.toFixed(2)}</vIPI>
                <vIPIDevol>0.00</vIPIDevol>
                <vPIS>${totais.valor_pis.toFixed(2)}</vPIS>
                <vCOFINS>${totais.valor_cofins.toFixed(2)}</vCOFINS>
                <vOutro>${totais.valor_outras_despesas.toFixed(2)}</vOutro>
                <vNF>${totais.valor_total.toFixed(2)}</vNF>
                <vTotTrib>${totais.valor_total_tributos.toFixed(2)}</vTotTrib>
            </ICMSTot>
        </total>`;
}

/**
 * Gerar transporte da NFe
 */
function gerarTransporteNFe(nota: NotaFiscal): string {
    if (!nota.transporte) return '';
    
    return `
        <transp>
            <modFrete>${nota.transporte.modalidade_frete || '9'}</modFrete>
            ${nota.transporte.transportador ? `
            <transporta>
                <CNPJ>${nota.transporte.transportador.cpf_cnpj.replace(/\D/g, '')}</CNPJ>
                <xNome>${escapeXML(nota.transporte.transportador.razao_social)}</xNome>
            </transporta>` : ''}
        </transp>`;
}

/**
 * Gerar pagamento da NFe
 */
function gerarPagamentoNFe(nota: NotaFiscal): string {
    if (!nota.pagamento || nota.pagamento.length === 0) return '';
    
    return `
        <pag>
            ${nota.pagamento.map(pag => `
            <detPag>
                <indPag>0</indPag>
                <tPag>${pag.forma}</tPag>
                <vPag>${pag.valor.toFixed(2)}</vPag>
            </detPag>`).join('')}
        </pag>`;
}

/**
 * Gerar informações adicionais da NFe
 */
function gerarInformacoesAdicionaisNFe(nota: NotaFiscal): string {
    return `
        <infAdic>
            <infCpl>${escapeXML(nota.natureza_operacao)}</infCpl>
        </infAdic>`;
}

/**
 * Gerar RPS da NFSe
 */
function gerarRpsNFSe(nota: NotaFiscal, item: ItemNotaFiscal, numero: number): string {
    if (item.tipo !== 'servico') return '';
    
    const impostos = item.impostos as ImpostosItemNFSe;
    const dataEmissao = new Date(nota.data_emissao).toISOString();
    
    return `
            <Rps>
                <InfRps Id="RPS${numero}">
                    <IdentificacaoRps>
                        <Numero>${numero}</Numero>
                        <Serie>${nota.serie}</Serie>
                        <Tipo>1</Tipo>
                    </IdentificacaoRps>
                    <DataEmissao>${dataEmissao}</DataEmissao>
                    <NaturezaOperacao>1</NaturezaOperacao>
                    <RegimeEspecialTributacao>1</RegimeEspecialTributacao>
                    <OptanteSimplesNacional>1</OptanteSimplesNacional>
                    <IncentivadorCultural>2</IncentivadorCultural>
                    <Status>1</Status>
                    <Servico>
                        <Valores>
                            <ValorServicos>${item.valor_total.toFixed(2)}</ValorServicos>
                            <ValorDeducoes>0.00</ValorDeducoes>
                            <ValorPis>${impostos.pis.valor.toFixed(2)}</ValorPis>
                            <ValorCofins>${impostos.cofins.valor.toFixed(2)}</ValorCofins>
                            <ValorInss>0.00</ValorInss>
                            <ValorIr>0.00</ValorIr>
                            <ValorCsll>0.00</ValorCsll>
                            <IssRetido>${impostos.iss.retido ? '1' : '2'}</IssRetido>
                            <ValorIss>${impostos.iss.valor.toFixed(2)}</ValorIss>
                            <ValorIssRetido>${impostos.iss.retido ? impostos.iss.valor.toFixed(2) : '0.00'}</ValorIssRetido>
                            <OutrasRetencoes>0.00</OutrasRetencoes>
                            <BaseCalculo>${impostos.iss.base_calculo.toFixed(2)}</BaseCalculo>
                            <Aliquota>${(impostos.iss.aliquota / 100).toFixed(4)}</Aliquota>
                            <ValorLiquidoNfse>${(item.valor_total - impostos.iss.valor).toFixed(2)}</ValorLiquidoNfse>
                        </Valores>
                        <ItemListaServico>${impostos.iss.codigo_servico}</ItemListaServico>
                        <CodigoCnae>${item.ncm || '00000000'}</CodigoCnae>
                        <CodigoTributacaoMunicipio>${impostos.iss.codigo_servico}</CodigoTributacaoMunicipio>
                        <Discriminacao>${escapeXML(item.descricao)}</Discriminacao>
                        <CodigoMunicipio>${impostos.iss.codigo_municipio}</CodigoMunicipio>
                    </Servico>
                    <Prestador>
                        <Cnpj>${nota.emitente.cpf_cnpj.replace(/\D/g, '')}</Cnpj>
                        <InscricaoMunicipal>${nota.emitente.inscricao_municipal || ''}</InscricaoMunicipal>
                    </Prestador>
                    <Tomador>
                        <IdentificacaoTomador>
                            <CpfCnpj>
                                ${nota.destinatario.cpf_cnpj.replace(/\D/g, '').length === 14 ? 
                                    `<Cnpj>${nota.destinatario.cpf_cnpj.replace(/\D/g, '')}</Cnpj>` : 
                                    `<Cpf>${nota.destinatario.cpf_cnpj.replace(/\D/g, '')}</Cpf>`}
                            </CpfCnpj>
                        </IdentificacaoTomador>
                        <RazaoSocial>${escapeXML(nota.destinatario.razao_social)}</RazaoSocial>
                        <Endereco>
                            <Endereco>${escapeXML(nota.destinatario.endereco.logradouro)}</Endereco>
                            <Numero>${escapeXML(nota.destinatario.endereco.numero)}</Numero>
                            <Bairro>${escapeXML(nota.destinatario.endereco.bairro)}</Bairro>
                            <CodigoMunicipio>${nota.destinatario.endereco.codigo_municipio}</CodigoMunicipio>
                            <Uf>${nota.destinatario.endereco.uf}</Uf>
                            <Cep>${nota.destinatario.endereco.cep.replace(/\D/g, '')}</Cep>
                        </Endereco>
                    </Tomador>
                </InfRps>
            </Rps>`;
}

/**
 * Funções auxiliares
 */
function escapeXML(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatarXML(xml: string): string {
    // Formatação básica - em produção, usar biblioteca XML
    return xml.replace(/>\s+</g, '><').replace(/></g, '>\n<');
}

function obterCodigoUF(uf: string): string {
    const codigos: Record<string, string> = {
        'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29', 'CE': '23',
        'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50',
        'MG': '31', 'PA': '15', 'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22',
        'RJ': '33', 'RN': '24', 'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42',
        'SP': '35', 'SE': '28', 'TO': '17',
    };
    return codigos[uf.toUpperCase()] || '35';
}

function gerarChaveAcesso(nota: NotaFiscal): string {
    const cUF = obterCodigoUF(nota.emitente.endereco.uf);
    const aamm = new Date(nota.data_emissao).toISOString().substring(2, 6).replace('-', '');
    const cnpj = nota.emitente.cpf_cnpj.replace(/\D/g, '').padStart(14, '0');
    const mod = '55';
    const serie = nota.serie.padStart(3, '0');
    const nNF = nota.numero.padStart(9, '0');
    const tpEmis = '1';
    const cNF = gerarCodigoAleatorio().padStart(8, '0');
    
    const chave = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
    const dv = calcularDigitoVerificador(chave);
    
    return `${chave}${dv}`;
}

function gerarCodigoAleatorio(): string {
    return Math.floor(Math.random() * 99999999).toString();
}

function calcularDigitoVerificador(chave: string): string {
    // Algoritmo de cálculo do dígito verificador da chave de acesso NFe
    const pesos = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    
    for (let i = 0; i < chave.length; i++) {
        soma += parseInt(chave[i]) * pesos[i];
    }
    
    const resto = soma % 11;
    return resto < 2 ? '0' : String(11 - resto);
}

