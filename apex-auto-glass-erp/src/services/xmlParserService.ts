/**
 * Serviço para parsing de XML de notas fiscais
 */

export interface ParsedNFe {
    chave: string;
    numero: string;
    serie: string;
    data_emissao: string;
    data_entrada: string;
    cfop: string;
    natureza_operacao: string;
    finalidade: 'Normal' | 'Ajuste' | 'Devolução' | 'Importação';
    tipo_entrada: string;
    emitente: {
        cnpj: string;
        razao_social: string;
        nome_fantasia?: string;
        inscricao_estadual?: string;
        endereco?: {
            logradouro?: string;
            numero?: string;
            complemento?: string;
            bairro?: string;
            municipio?: string;
            uf?: string;
            cep?: string;
        };
        contato?: {
            telefone?: string;
            email?: string;
        };
    };
    destinatario?: {
        cnpj?: string;
        cpf?: string;
        razao_social?: string;
        nome?: string;
        inscricao_estadual?: string;
    };
    itens: Array<{
        codigo?: string; // cProd
        descricao: string; // xProd
        ncm: string;
        cest?: string;
        gtin?: string; // cEAN
        cfop: string;
        unidade: string; // uCom
        quantidade: number; // qCom
        valor_unitario: number; // vUnCom
        desconto: number;
        total: number; // vProd
        origem?: string; // orig (0=Nacional, etc)
        cst?: string;
        csosn?: string;
        icms?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        pis?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        cofins?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        ipi?: {
            base: number;
            aliquota: number;
            valor: number;
        };
    }>;
    totais: {
        total_produtos: number;
        total_descontos: number;
        total_impostos: number;
        frete: number;
        seguro: number;
        outras_despesas: number;
        valor_total_nf: number;
        valor_icms: number;
        valor_pis: number;
        valor_cofins: number;
    };
    duplicatas?: Array<{
        numero: string;
        vencimento: string;
        valor: number;
    }>;
}

/**
 * Extrai texto de um elemento XML, considerando namespaces
 */
function getTextContent(element: Element | null, tagName: string, namespace?: string): string {
    if (!element) return '';
    
    // Tentar com namespace primeiro
    if (namespace) {
        const nsElement = element.getElementsByTagNameNS(namespace, tagName)[0];
        if (nsElement) return nsElement.textContent || '';
    }
    
    // Tentar sem namespace
    const elementWithoutNS = element.getElementsByTagName(tagName)[0];
    if (elementWithoutNS) return elementWithoutNS.textContent || '';
    
    // Tentar com prefixo comum
    const prefixes = ['nfe:', 'NFe:', ''];
    for (const prefix of prefixes) {
        const prefixedTag = prefix + tagName;
        const prefixedElement = element.getElementsByTagName(prefixedTag)[0];
        if (prefixedElement) return prefixedElement.textContent || '';
    }
    
    return '';
}

/**
 * Extrai número de um elemento XML
 */
function getNumberContent(element: Element | null, tagName: string, namespace?: string): number {
    const text = getTextContent(element, tagName, namespace);
    return parseFloat(text) || 0;
}

/**
 * Parse XML de NFe
 */
export function parseNFeXML(xmlString: string): ParsedNFe {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Verificar erros de parsing
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        throw new Error('XML inválido: ' + parserError.textContent);
    }
    
    // Buscar infNFe (pode estar com ou sem namespace)
    let infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
    if (!infNFe) {
        // Tentar com namespace
        infNFe = xmlDoc.querySelector('*[local-name()="infNFe"]') as Element;
    }
    
    if (!infNFe) {
        throw new Error('XML inválido: tag infNFe não encontrada');
    }
    
    // Extrair chave de acesso
    const chave = infNFe.getAttribute('Id')?.replace('NFe', '') || '';
    
    // Extrair dados do IDE
    const ide = infNFe.getElementsByTagName('ide')[0] || infNFe.querySelector('*[local-name()="ide"]');
    if (!ide) throw new Error('Tag ide não encontrada');
    
    const numero = getTextContent(ide, 'nNF');
    const serie = getTextContent(ide, 'serie');
    const dhEmi = getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi');
    const cfop = getTextContent(ide, 'CFOP');
    const natOp = getTextContent(ide, 'natOp');
    const finNFe = getTextContent(ide, 'finNFe');
    
    // Converter data de emissão
    let dataEmissao = '';
    if (dhEmi) {
        try {
            const date = new Date(dhEmi);
            dataEmissao = date.toISOString().split('T')[0];
        } catch {
            dataEmissao = dhEmi.split('T')[0];
        }
    }
    
    // Determinar finalidade
    let finalidade: 'Normal' | 'Ajuste' | 'Devolução' | 'Importação' = 'Normal';
    if (finNFe === '2') finalidade = 'Ajuste';
    else if (finNFe === '3') finalidade = 'Devolução';
    else if (finNFe === '4') finalidade = 'Importação';
    
    // Extrair emitente
    const emit = infNFe.getElementsByTagName('emit')[0] || infNFe.querySelector('*[local-name()="emit"]');
    if (!emit) throw new Error('Tag emit não encontrada');
    
    const emitCNPJ = getTextContent(emit, 'CNPJ');
    const emitRazao = getTextContent(emit, 'xNome');
    const emitFantasia = getTextContent(emit, 'xFant');
    const emitIE = getTextContent(emit, 'IE');
    
    // Endereço do emitente
    const emitEnd = emit.getElementsByTagName('enderEmit')[0] || emit.querySelector('*[local-name()="enderEmit"]');
    const endereco = emitEnd ? {
        logradouro: getTextContent(emitEnd, 'xLgr'),
        numero: getTextContent(emitEnd, 'nro'),
        complemento: getTextContent(emitEnd, 'xCpl'),
        bairro: getTextContent(emitEnd, 'xBairro'),
        municipio: getTextContent(emitEnd, 'xMun'),
        uf: getTextContent(emitEnd, 'UF'),
        cep: getTextContent(emitEnd, 'CEP'),
    } : undefined;
    
    // Contato do emitente
    const emitContato = emit.getElementsByTagName('cont')[0] || emit.querySelector('*[local-name()="cont"]');
    const contato = emitContato ? {
        telefone: getTextContent(emitContato, 'fone'),
        email: getTextContent(emitContato, 'email'),
    } : undefined;
    
    // Extrair destinatário (se houver)
    const dest = infNFe.getElementsByTagName('dest')[0] || infNFe.querySelector('*[local-name()="dest"]');
    let destinatario: ParsedNFe['destinatario'] | undefined;
    if (dest) {
        const destCNPJ = getTextContent(dest, 'CNPJ');
        const destCPF = getTextContent(dest, 'CPF');
        const destNome = getTextContent(dest, 'xNome');
        const destIE = getTextContent(dest, 'IE');
        
        destinatario = {
            cnpj: destCNPJ,
            cpf: destCPF,
            razao_social: destNome,
            nome: destNome,
            inscricao_estadual: destIE,
        };
    }
    
    // Extrair itens
    const dets = infNFe.getElementsByTagName('det') || infNFe.querySelectorAll('*[local-name()="det"]');
    const itens: ParsedNFe['itens'] = [];
    
    for (let i = 0; i < dets.length; i++) {
        const det = dets[i] as Element;
        const prod = det.getElementsByTagName('prod')[0] || det.querySelector('*[local-name()="prod"]');
        const imposto = det.getElementsByTagName('imposto')[0] || det.querySelector('*[local-name()="imposto"]');
        
        if (!prod) continue;
        
        const codigo = getTextContent(prod, 'cProd');
        const descricao = getTextContent(prod, 'xProd');
        const ncm = getTextContent(prod, 'NCM');
        const cest = getTextContent(prod, 'CEST');
        const gtin = getTextContent(prod, 'cEAN');
        const cfopItem = getTextContent(prod, 'CFOP');
        const unidade = getTextContent(prod, 'uCom');
        const quantidade = getNumberContent(prod, 'qCom');
        const valorUnitario = getNumberContent(prod, 'vUnCom');
        const valorProduto = getNumberContent(prod, 'vProd');
        const desconto = getNumberContent(prod, 'vDesc') || 0;
        const origem = getTextContent(prod, 'orig');
        
        // Impostos
        let icms, pis, cofins, ipi;
        let cst, csosn;
        
        if (imposto) {
            const icmsTag = imposto.getElementsByTagName('ICMS')[0] || imposto.querySelector('*[local-name()="ICMS"]');
            if (icmsTag) {
                const icmsItem = icmsTag.querySelector('*[local-name()="ICMS00"], *[local-name()="ICMS10"], *[local-name()="ICMS20"], *[local-name()="ICMS30"], *[local-name()="ICMS40"], *[local-name()="ICMS51"], *[local-name()="ICMS60"], *[local-name()="ICMS70"], *[local-name()="ICMS90"], *[local-name()="ICMSPart"], *[local-name()="ICMSST"], *[local-name()="ICMSSN101"], *[local-name()="ICMSSN102"], *[local-name()="ICMSSN201"], *[local-name()="ICMSSN202"], *[local-name()="ICMSSN500"], *[local-name()="ICMSSN900"]');
                if (icmsItem) {
                    cst = getTextContent(icmsItem, 'CST');
                    csosn = getTextContent(icmsItem, 'CSOSN');
                    icms = {
                        base: getNumberContent(icmsItem, 'vBC'),
                        aliquota: getNumberContent(icmsItem, 'pICMS'),
                        valor: getNumberContent(icmsItem, 'vICMS'),
                    };
                }
            }
            
            const pisTag = imposto.getElementsByTagName('PIS')[0] || imposto.querySelector('*[local-name()="PIS"]');
            if (pisTag) {
                const pisItem = pisTag.querySelector('*[local-name()="PISAliq"], *[local-name()="PISQtde"], *[local-name()="PISNT"], *[local-name()="PISOutr"]');
                if (pisItem) {
                    pis = {
                        base: getNumberContent(pisItem, 'vBC'),
                        aliquota: getNumberContent(pisItem, 'pPIS'),
                        valor: getNumberContent(pisItem, 'vPIS'),
                    };
                }
            }
            
            const cofinsTag = imposto.getElementsByTagName('COFINS')[0] || imposto.querySelector('*[local-name()="COFINS"]');
            if (cofinsTag) {
                const cofinsItem = cofinsTag.querySelector('*[local-name()="COFINSAliq"], *[local-name()="COFINSQtde"], *[local-name()="COFINSNT"], *[local-name()="COFINSOutr"]');
                if (cofinsItem) {
                    cofins = {
                        base: getNumberContent(cofinsItem, 'vBC'),
                        aliquota: getNumberContent(cofinsItem, 'pCOFINS'),
                        valor: getNumberContent(cofinsItem, 'vCOFINS'),
                    };
                }
            }
            
            const ipiTag = imposto.getElementsByTagName('IPI')[0] || imposto.querySelector('*[local-name()="IPI"]');
            if (ipiTag) {
                const ipiItem = ipiTag.querySelector('*[local-name()="IPITrib"], *[local-name()="IPINT"]');
                if (ipiItem) {
                    ipi = {
                        base: getNumberContent(ipiItem, 'vBC'),
                        aliquota: getNumberContent(ipiItem, 'pIPI'),
                        valor: getNumberContent(ipiItem, 'vIPI'),
                    };
                }
            }
        }
        
        itens.push({
            codigo,
            descricao,
            ncm,
            cest,
            gtin,
            cfop: cfopItem || cfop,
            unidade,
            quantidade,
            valor_unitario: valorUnitario,
            desconto,
            total: valorProduto,
            origem,
            cst,
            csosn,
            icms,
            pis,
            cofins,
            ipi,
        });
    }
    
    // Extrair totais
    const total = infNFe.getElementsByTagName('total')[0] || infNFe.querySelector('*[local-name()="total"]');
    if (!total) throw new Error('Tag total não encontrada');
    
    const icmSTot = total.getElementsByTagName('ICMSTot')[0] || total.querySelector('*[local-name()="ICMSTot"]');
    const valorICMS = icmSTot ? getNumberContent(icmSTot, 'vICMS') : 0;
    const valorPIS = icmSTot ? getNumberContent(icmSTot, 'vPIS') : 0;
    const valorCOFINS = icmSTot ? getNumberContent(icmSTot, 'vCOFINS') : 0;
    
    const totalProdutos = icmSTot ? getNumberContent(icmSTot, 'vProd') : 0;
    const totalDescontos = icmSTot ? getNumberContent(icmSTot, 'vDesc') : 0;
    const totalImpostos = valorICMS + valorPIS + valorCOFINS;
    
    // Frete, seguro e outras despesas
    const frete = icmSTot ? getNumberContent(icmSTot, 'vFrete') : 0;
    const seguro = icmSTot ? getNumberContent(icmSTot, 'vSeg') : 0;
    const outrasDespesas = icmSTot ? getNumberContent(icmSTot, 'vOutro') : 0;
    const valorTotalNF = icmSTot ? getNumberContent(icmSTot, 'vNF') : 0;
    
    // Extrair duplicatas (se houver)
    const cobr = infNFe.getElementsByTagName('cobr')[0] || infNFe.querySelector('*[local-name()="cobr"]');
    const duplicatas: ParsedNFe['duplicatas'] = [];
    
    if (cobr) {
        const dups = cobr.getElementsByTagName('dup') || cobr.querySelectorAll('*[local-name()="dup"]');
        for (let i = 0; i < dups.length; i++) {
            const dup = dups[i] as Element;
            duplicatas.push({
                numero: getTextContent(dup, 'nDup'),
                vencimento: getTextContent(dup, 'dVenc'),
                valor: getNumberContent(dup, 'vDup'),
            });
        }
    }
    
    return {
        chave,
        numero,
        serie,
        data_emissao: dataEmissao,
        data_entrada: dataEmissao, // Por padrão, usar data de emissão
        cfop,
        natureza_operacao: natOp,
        finalidade,
        tipo_entrada: 'Compra', // Será determinado pelo usuário ou regras
        emitente: {
            cnpj: emitCNPJ,
            razao_social: emitRazao,
            nome_fantasia: emitFantasia,
            inscricao_estadual: emitIE,
            endereco,
            contato,
        },
        destinatario,
        itens,
        totais: {
            total_produtos: totalProdutos,
            total_descontos: totalDescontos,
            total_impostos: totalImpostos,
            frete,
            seguro,
            outras_despesas: outrasDespesas,
            valor_total_nf: valorTotalNF,
            valor_icms: valorICMS,
            valor_pis: valorPIS,
            valor_cofins: valorCOFINS,
        },
        duplicatas: duplicatas.length > 0 ? duplicatas : undefined,
    };
}

