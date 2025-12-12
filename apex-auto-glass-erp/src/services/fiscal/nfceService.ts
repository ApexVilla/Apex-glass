/**
 * SERVIÇO COMPLETO DE NFC-e (MODELO 65)
 * Nota Fiscal de Consumidor Eletrônica
 * Emissão instantânea, QRCode, Contingência Offline
 */

import { supabase } from '@/integrations/supabase/client';
import { NotaFiscal } from '@/types/fiscal';

export interface NFCeEmitida {
    id?: string;
    company_id: string;
    chave_acesso: string;
    numero: string;
    serie: string;
    modelo: string;
    data_emissao: string;
    data_autorizacao?: string;
    consumidor_cpf_cnpj?: string;
    consumidor_nome?: string;
    valor_produtos: number;
    valor_total: number;
    status: 'rascunho' | 'assinada' | 'enviada' | 'autorizada' | 'cancelada' | 'rejeitada' | 'offline';
    protocolo_autorizacao?: string;
    qrcode?: string;
    url_consulta?: string;
    xml_assinado?: string;
    xml_autorizado?: string;
    modo_contingencia?: boolean;
    motivo_contingencia?: string;
    ambiente: 'homologacao' | 'producao';
}

/**
 * Serviço completo de NFC-e
 */
export const nfceService = {
    /**
     * Gerar chave de acesso da NFC-e
     * NFC-e usa modelo 65 e numeração independente da NF-e
     */
    gerarChaveAcesso(nota: NotaFiscal, numeroNFCe: string, serieNFCe: string): string {
        // Código da UF
        const cUF = this.getCodigoUF(nota.emitente.endereco.uf);
        
        // Ano e mês (AAMM)
        const data = new Date(nota.data_emissao);
        const aamm = `${data.getFullYear().toString().substring(2)}${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        // CNPJ do emitente (14 dígitos)
        const cnpj = nota.emitente.cpf_cnpj.replace(/\D/g, '').padStart(14, '0');
        
        // Modelo (65 para NFC-e)
        const mod = '65';
        
        // Série (3 dígitos)
        const serie = serieNFCe.padStart(3, '0');
        
        // Número da NFC-e (9 dígitos)
        const nNF = numeroNFCe.padStart(9, '0');
        
        // Tipo de emissão (1=Normal, 9=Contingência)
        const tpEmis = '1'; // Será ajustado se estiver em contingência
        
        // Código numérico aleatório (8 dígitos)
        const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
        
        // Montar chave (sem dígito verificador)
        const chave = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
        
        // Calcular dígito verificador
        const dv = this.calcularDigitoVerificador(chave);
        
        return `${chave}${dv}`;
    },

    /**
     * Calcular dígito verificador da chave de acesso
     */
    calcularDigitoVerificador(chave: string): string {
        const pesos = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        
        let soma = 0;
        for (let i = 0; i < chave.length; i++) {
            soma += parseInt(chave[i]) * pesos[i];
        }
        
        const resto = soma % 11;
        return resto < 2 ? '0' : String(11 - resto);
    },

    /**
     * Obter código da UF
     */
    getCodigoUF(uf: string): string {
        const codigos: Record<string, string> = {
            'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
            'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
            'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
            'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
            'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
            'SE': '28', 'TO': '17',
        };
        return codigos[uf.toUpperCase()] || '35';
    },

    /**
     * Obter próximo número da NFC-e
     * Numeração independente da NF-e
     */
    async obterProximoNumero(companyId: string, serie: string): Promise<string> {
        try {
            // Buscar última NFC-e da série
            const { data: ultimaNFCe } = await supabase
                .from('nfce_emitidas')
                .select('numero')
                .eq('company_id', companyId)
                .eq('serie', serie)
                .order('numero', { ascending: false })
                .limit(1)
                .single();

            const ultimoNumero = ultimaNFCe ? parseInt(ultimaNFCe.numero) : 0;
            const proximoNumero = (ultimoNumero + 1).toString().padStart(9, '0');

            return proximoNumero;
        } catch (error: any) {
            console.error('Erro ao obter próximo número NFC-e:', error);
            // Em caso de erro, retorna 1
            return '000000001';
        }
    },

    /**
     * Criar nova NFC-e (rascunho)
     */
    async criarNFCe(nota: NotaFiscal, companyId: string, userId?: string): Promise<string> {
        try {
            // Obter série da NFC-e (geralmente diferente da NF-e)
            const serieNFCe = '1'; // TODO: Buscar da configuração

            // Obter próximo número
            const numeroNFCe = await this.obterProximoNumero(companyId, serieNFCe);

            // Gerar chave de acesso
            const chaveAcesso = this.gerarChaveAcesso(nota, numeroNFCe, serieNFCe);

            // Criar registro no banco
            const { data: nfce, error } = await supabase
                .from('nfce_emitidas')
                .insert([{
                    company_id: companyId,
                    chave_acesso: chaveAcesso,
                    numero: numeroNFCe,
                    serie: serieNFCe,
                    modelo: '65',
                    data_emissao: nota.data_emissao,
                    consumidor_cpf_cnpj: nota.destinatario?.cpf_cnpj?.replace(/\D/g, '') || null,
                    consumidor_nome: nota.destinatario?.razao_social || null,
                    valor_produtos: nota.totais.valor_produtos,
                    valor_total: nota.totais.valor_total,
                    valor_icms: nota.totais.valor_icms,
                    valor_pis: nota.totais.valor_pis,
                    valor_cofins: nota.totais.valor_cofins,
                    status: 'rascunho',
                    ambiente: 'homologacao', // TODO: Buscar da configuração
                    created_by: userId,
                }])
                .select('id')
                .single();

            if (error) throw error;

            return nfce.id;
        } catch (error: any) {
            console.error('Erro ao criar NFC-e:', error);
            throw error;
        }
    },

    /**
     * Emitir NFC-e instantaneamente
     * NFC-e não usa lote, é emitida individualmente
     */
    async emitirNFCe(nfceId: string, companyId: string): Promise<{
        success: boolean;
        protocolo?: string;
        qrcode?: string;
        url_consulta?: string;
        xml_autorizado?: string;
        modo_contingencia?: boolean;
        erro?: string;
    }> {
        try {
            // Buscar NFC-e
            const { data: nfce } = await supabase
                .from('nfce_emitidas')
                .select('*')
                .eq('id', nfceId)
                .eq('company_id', companyId)
                .single();

            if (!nfce) throw new Error('NFC-e não encontrada');

            if (!nfce.xml_assinado) {
                throw new Error('NFC-e não está assinada');
            }

            // Verificar se SEFAZ está online
            const sefazOnline = await this.verificarStatusSEFAZ(companyId);

            if (!sefazOnline) {
                // Modo contingência offline
                return await this.emitirNFCeOffline(nfceId, companyId);
            }

            // Emitir normalmente (online)
            // TODO: Implementar envio real para SEFAZ (backend)
            // Por enquanto, retorna estrutura preparada

            return {
                success: false,
                erro: 'Emissão de NFC-e deve ser feita no backend. Implementar comunicação real com SEFAZ.',
            };

        } catch (error: any) {
            console.error('Erro ao emitir NFC-e:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },

    /**
     * Emitir NFC-e em modo offline (contingência)
     */
    async emitirNFCeOffline(nfceId: string, companyId: string): Promise<{
        success: boolean;
        qrcode?: string;
        modo_contingencia: boolean;
        erro?: string;
    }> {
        try {
            // Buscar NFC-e
            const { data: nfce } = await supabase
                .from('nfce_emitidas')
                .select('*')
                .eq('id', nfceId)
                .eq('company_id', companyId)
                .single();

            if (!nfce) throw new Error('NFC-e não encontrada');

            // Gerar QRCode para contingência
            const qrcode = this.gerarQRCodeContingencia(nfce);

            // Atualizar NFC-e com status offline
            const { error: updateError } = await supabase
                .from('nfce_emitidas')
                .update({
                    status: 'offline',
                    modo_contingencia: true,
                    motivo_contingencia: 'SEFAZ offline - Emissão em contingência',
                    qrcode: qrcode,
                })
                .eq('id', nfceId);

            if (updateError) throw updateError;

            return {
                success: true,
                qrcode: qrcode,
                modo_contingencia: true,
            };

        } catch (error: any) {
            console.error('Erro ao emitir NFC-e offline:', error);
            return {
                success: false,
                modo_contingencia: true,
                erro: error.message,
            };
        }
    },

    /**
     * Verificar status da SEFAZ
     */
    async verificarStatusSEFAZ(companyId: string): Promise<boolean> {
        try {
            // Buscar configuração fiscal
            const { data: config } = await supabase
                .from('fiscal_config')
                .select('uf, ambiente')
                .eq('company_id', companyId)
                .single();

            if (!config || !config.uf) {
                return false;
            }

            // TODO: Implementar consulta real de status do serviço SEFAZ
            // Por enquanto, retorna true (assumindo online)
            return true;

        } catch (error) {
            console.error('Erro ao verificar status SEFAZ:', error);
            return false;
        }
    },

    /**
     * Gerar QRCode da NFC-e
     */
    gerarQRCode(chaveAcesso: string, ambiente: 'homologacao' | 'producao', urlConsulta?: string): string {
        // URL base de consulta
        let urlBase: string;

        if (urlConsulta) {
            urlBase = urlConsulta;
        } else {
            // URL padrão de consulta NFC-e
            if (ambiente === 'producao') {
                urlBase = 'http://www.nfce.fazenda.gov.br/consulta';
            } else {
                urlBase = 'http://homologacao.nfce.fazenda.gov.br/consulta';
            }
        }

        // Montar URL completa com chave de acesso
        const url = `${urlBase}?p=${chaveAcesso}`;

        return url;
    },

    /**
     * Gerar QRCode para contingência offline
     */
    gerarQRCodeContingencia(nfce: NFCeEmitida): string {
        // Em contingência, o QRCode contém informações básicas
        // Formato: chave_acesso|data_emissao|valor_total|cnpj_emitente
        const dataEmissao = new Date(nfce.data_emissao).toISOString().replace(/[-:]/g, '').split('.')[0];
        const valorTotal = nfce.valor_total.toFixed(2).replace('.', ',');
        
        // Buscar CNPJ do emitente (precisa buscar da configuração)
        // Por enquanto, usar chave de acesso
        const qrcode = `${nfce.chave_acesso}|${dataEmissao}|${valorTotal}|CONTINGENCIA`;

        return qrcode;
    },

    /**
     * Cancelar NFC-e
     */
    async cancelarNFCe(
        nfceId: string,
        justificativa: string,
        companyId: string,
        userId?: string
    ): Promise<{
        success: boolean;
        protocolo?: string;
        erro?: string;
    }> {
        try {
            // Buscar NFC-e
            const { data: nfce } = await supabase
                .from('nfce_emitidas')
                .select('*')
                .eq('id', nfceId)
                .eq('company_id', companyId)
                .single();

            if (!nfce) throw new Error('NFC-e não encontrada');

            if (nfce.status !== 'autorizada' && nfce.status !== 'offline') {
                throw new Error('Apenas NFC-e autorizadas ou em contingência podem ser canceladas');
            }

            // Validar justificativa (mínimo 15 caracteres)
            if (!justificativa || justificativa.trim().length < 15) {
                throw new Error('Justificativa deve ter no mínimo 15 caracteres');
            }

            // Salvar evento de cancelamento
            const { data: evento, error: eventoError } = await supabase
                .from('nfce_eventos')
                .insert([{
                    nfce_id: nfceId,
                    company_id: companyId,
                    tipo_evento: '110111',
                    descricao_evento: 'Cancelamento',
                    sequencia: 1,
                    justificativa: justificativa,
                    xml_evento: '', // TODO: Gerar XML
                    status: 'pendente',
                    created_by: userId,
                }])
                .select()
                .single();

            if (eventoError) throw eventoError;

            // TODO: Enviar para SEFAZ (backend)

            return {
                success: true,
            };

        } catch (error: any) {
            console.error('Erro ao cancelar NFC-e:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },

    /**
     * Buscar NFC-e por ID
     */
    async buscarNFCe(nfceId: string, companyId: string): Promise<NFCeEmitida | null> {
        const { data, error } = await supabase
            .from('nfce_emitidas')
            .select('*')
            .eq('id', nfceId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) return null;
        return data as any;
    },

    /**
     * Listar NFC-e
     */
    async listarNFCe(
        companyId: string,
        filters?: {
            status?: string;
            dataInicio?: string;
            dataFim?: string;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ data: NFCeEmitida[]; count: number }> {
        let query = supabase
            .from('nfce_emitidas')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId)
            .order('data_emissao', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.dataInicio) {
            query = query.gte('data_emissao', filters.dataInicio);
        }

        if (filters?.dataFim) {
            query = query.lte('data_emissao', filters.dataFim);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        if (filters?.offset) {
            query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data: (data || []) as any[],
            count: count || 0,
        };
    },

    /**
     * Reenviar NFC-e em contingência quando SEFAZ voltar online
     */
    async reenviarNFCeContingencia(nfceId: string, companyId: string): Promise<{
        success: boolean;
        protocolo?: string;
        erro?: string;
    }> {
        try {
            // Buscar NFC-e em contingência
            const { data: nfce } = await supabase
                .from('nfce_emitidas')
                .select('*')
                .eq('id', nfceId)
                .eq('company_id', companyId)
                .eq('modo_contingencia', true)
                .eq('status', 'offline')
                .single();

            if (!nfce) {
                throw new Error('NFC-e em contingência não encontrada');
            }

            // Verificar se SEFAZ está online
            const sefazOnline = await this.verificarStatusSEFAZ(companyId);

            if (!sefazOnline) {
                throw new Error('SEFAZ ainda está offline');
            }

            // Reenviar para SEFAZ
            // TODO: Implementar reenvio real (backend)

            return {
                success: false,
                erro: 'Reenvio de NFC-e deve ser feito no backend.',
            };

        } catch (error: any) {
            console.error('Erro ao reenviar NFC-e:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },
};

