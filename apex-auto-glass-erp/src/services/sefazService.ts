import { supabase } from '@/integrations/supabase/client';
import { getSefazEndpoints, UF } from './fiscal/sefazEndpoints';
import { eventXMLGenerator, TipoManifestacao as TipoManifestacaoGen } from './fiscal/eventXMLGenerator';
import { xmlSignatureService } from './fiscal/xmlSignatureService';
import { certificateService } from './fiscal/certificateService';

/**
 * Tipos de manifestação do destinatário
 */
export type TipoManifestacao = 
    | '210100' // Ciência da Operação
    | '210200' // Confirmação da Operação
    | '210240' // Desconhecimento
    | '210250'; // Operação Não Realizada

/**
 * Interface para resposta de consulta SEFAZ
 */
export interface ConsultaSefazResponse {
    success: boolean;
    chave: string;
    status: string; // 'autorizado', 'cancelado', 'denegado', etc
    protocolo?: string;
    data_autorizacao?: string;
    xml?: string;
    erro?: string;
}

/**
 * Interface para resposta de distribuição DF-e
 */
export interface DistribuicaoDfeResponse {
    success: boolean;
    notas: Array<{
        chave: string;
        numero: string;
        serie: string;
        data_emissao: string;
        emitente_cnpj: string;
        emitente_razao: string;
        valor: number;
        xml?: string;
    }>;
    ultimo_nsu: string;
    erro?: string;
}

/**
 * Interface para resposta de manifestação
 */
export interface ManifestacaoResponse {
    success: boolean;
    chave: string;
    tipo: TipoManifestacao;
    protocolo?: string;
    erro?: string;
}

/**
 * Serviço para integração com SEFAZ
 * 
 * NOTA: Este serviço é uma estrutura base. Para produção, você precisará:
 * 1. Integrar com uma biblioteca real de SEFAZ (ex: nfse.js, node-nfe, etc)
 * 2. Ou usar uma API gateway de terceiros (ex: Focus NFe, Bling, etc)
 * 3. Implementar autenticação com certificado A1
 * 4. Implementar comunicação SOAP/XML com os webservices da SEFAZ
 */
export const sefazService = {
    /**
     * Consulta situação da NFe na SEFAZ
     * 
     * NOTA: Esta função requer certificado digital A1 para produção.
     * A consulta pode funcionar sem certificado em alguns casos, mas é recomendado usar certificado.
     */
    async consultarSituacao(chave: string, companyId: string, userId?: string): Promise<ConsultaSefazResponse> {
        try {
            // Log da operação
            await this.logOperacao('consulta', chave, companyId, userId, 'pendente');

            // 1. Buscar configuração fiscal
            const fiscalConfig = await this.getFiscalConfig(companyId);
            if (!fiscalConfig || !fiscalConfig.uf) {
                throw new Error('Configuração fiscal incompleta. Configure UF antes de consultar.');
            }

            // 2. Obter endpoint
            const endpoints = getSefazEndpoints(
                fiscalConfig.uf as UF,
                fiscalConfig.ambiente || 'homologacao'
            );

            // 3. Gerar XML de consulta (formato simplificado)
            // Nota: Em produção, o XML deve ser assinado e formatado conforme padrão SEFAZ
            const cnpj = fiscalConfig.cnpj?.replace(/\D/g, '') || '';
            const ambiente = fiscalConfig.ambiente === 'producao' ? '1' : '2';
            
            const xmlConsulta = `<?xml version="1.0" encoding="UTF-8"?>
<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente}</tpAmb>
  <xServ>CONSULTAR</xServ>
  <chNFe>${chave}</chNFe>
</consSitNFe>`;

            // TODO: Implementar chamada real via SOAP
            // Por enquanto, retorna estrutura preparada
            // Em produção, você enviaria:
            // 1. XML assinado (se necessário)
            // 2. Requisição SOAP para o endpoint
            // 3. Processar retorno XML
            
            const response: ConsultaSefazResponse = {
                success: true,
                chave,
                status: 'autorizado', // Mock - será preenchido após consulta real
                protocolo: undefined, // Será preenchido após consulta real
                data_autorizacao: undefined, // Será preenchido após consulta real
            };

            // Log preparação
            await this.logOperacao('consulta', chave, companyId, userId, 'pendente', {
                ...response,
                endpoint: endpoints.consulta,
                observacao: 'XML preparado. Consulta deve ser feita no backend via SOAP.',
            });
            
            return response;
        } catch (error: any) {
            await this.logOperacao('consulta', chave, companyId, userId, 'erro', null, error.message);
            throw error;
        }
    },

    /**
     * Baixa XML autorizado da SEFAZ
     */
    async baixarXML(chave: string, companyId: string, userId?: string): Promise<string> {
        try {
            await this.logOperacao('download_xml', chave, companyId, userId, 'pendente');

            // TODO: Implementar download real do XML
            // Em produção, você usaria a API de distribuição DF-e ou consulta protocolo

            // Por enquanto, retorna XML vazio
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <!-- XML da NFe ${chave} -->
</NFe>`;

            await this.logOperacao('download_xml', chave, companyId, userId, 'sucesso', { xml });
            
            return xml;
        } catch (error: any) {
            await this.logOperacao('download_xml', chave, companyId, userId, 'erro', null, error.message);
            throw error;
        }
    },

    /**
     * Manifesta destinatário (Ciência, Confirmação, Desconhecimento, etc)
     * 
     * NOTA: Esta função requer certificado digital A1 configurado.
     * A assinatura deve ser feita no backend por segurança.
     */
    async manifestarDestinatario(
        chave: string,
        tipo: TipoManifestacao,
        companyId: string,
        userId?: string,
        justificativa?: string
    ): Promise<ManifestacaoResponse> {
        try {
            await this.logOperacao('manifestacao', chave, companyId, userId, 'pendente', { tipo });

            // 1. Buscar configuração fiscal
            const fiscalConfig = await this.getFiscalConfig(companyId);
            if (!fiscalConfig || !fiscalConfig.cnpj || !fiscalConfig.uf) {
                throw new Error('Configuração fiscal incompleta. Configure CNPJ e UF antes de manifestar.');
            }

            // 2. Verificar se tem certificado
            const certInfo = await certificateService.getCertificateInfo(companyId);
            if (!certInfo || !certInfo.hasCertificate) {
                throw new Error('Certificado digital A1 não configurado. Configure o certificado antes de manifestar.');
            }

            // 3. Buscar NF de entrada (para obter sequência)
            const { data: nfEntrada } = await supabase
                .from('nf_entrada')
                .select('id, numero, serie')
                .eq('chave_acesso', chave)
                .eq('company_id', companyId)
                .single();

            // 4. Buscar última manifestação para obter sequência
            const { data: ultimaManifestacao } = await supabase
                .from('manifestacao_nfe')
                .select('sequencia')
                .eq('chave_acesso', chave)
                .eq('company_id', companyId)
                .order('sequencia', { ascending: false })
                .limit(1)
                .single();

            const sequencia = (ultimaManifestacao?.sequencia || 0) + 1;

            // 5. Gerar XML do evento
            const ambiente = fiscalConfig.ambiente === 'producao' ? '1' : '2';
            const xmlEvento = eventXMLGenerator.generateManifestacaoXML({
                chaveAcesso: chave,
                tipo: tipo as TipoManifestacaoGen,
                cnpj: fiscalConfig.cnpj.replace(/\D/g, ''),
                uf: fiscalConfig.uf as UF,
                ambiente: ambiente as '1' | '2',
                justificativa,
                sequencia,
            });

            // 6. Assinar XML (deve ser feito no backend - por enquanto retorna erro informativo)
            // TODO: Chamar API backend para assinar e transmitir
            // Por enquanto, vamos salvar o XML do evento para posterior processamento
            
            // 7. Obter endpoint SEFAZ
            const endpoints = getSefazEndpoints(
                fiscalConfig.uf as UF,
                fiscalConfig.ambiente || 'homologacao'
            );

            // 8. Salvar manifestação no banco (pendente)
            const { data: manifestacao, error: manifestError } = await supabase
                .from('manifestacao_nfe')
                .insert([{
                    nf_entrada_id: nfEntrada?.id || null,
                    chave_acesso: chave,
                    tipo,
                    sequencia,
                    xml_evento: xmlEvento,
                    status: 'pendente',
                    justificativa: justificativa || null,
                    company_id: companyId,
                    usuario_id: userId,
                }])
                .select()
                .single();

            if (manifestError) throw manifestError;

            // TODO: Implementar transmissão real via SOAP
            // Por enquanto, retorna sucesso mas status fica como 'pendente'
            // A transmissão real deve ser feita no backend
            
            const response: ManifestacaoResponse = {
                success: true,
                chave,
                tipo,
                // protocolo só será preenchido após transmissão real
            };

            // Log de sucesso
            await this.logOperacao('manifestacao', chave, companyId, userId, 'sucesso', {
                ...response,
                manifestacao_id: manifestacao.id,
                endpoint: endpoints.manifestacao,
                observacao: 'XML gerado. Transmissão deve ser feita no backend.',
            });

            return response;
        } catch (error: any) {
            await this.logOperacao('manifestacao', chave, companyId, userId, 'erro', null, error.message);
            throw error;
        }
    },

    /**
     * Busca notas fiscais para o CNPJ na SEFAZ (Distribuição DF-e)
     */
    async buscarNotasPorCNPJ(
        cnpj: string,
        ultimoNsu: string = '0',
        companyId: string,
        userId?: string
    ): Promise<DistribuicaoDfeResponse> {
        try {
            await this.logOperacao('distribuicao', null, companyId, userId, 'pendente', { cnpj, ultimoNsu });

            // TODO: Implementar distribuição DF-e real
            // Em produção, você usaria o webservice de distribuição DF-e da SEFAZ

            const response: DistribuicaoDfeResponse = {
                success: true,
                notas: [],
                ultimo_nsu: ultimoNsu,
            };

            await this.logOperacao('distribuicao', null, companyId, userId, 'sucesso', response);

            // Atualizar último NSU na configuração fiscal
            await this.atualizarUltimoNSU(companyId, response.ultimo_nsu);

            return response;
        } catch (error: any) {
            await this.logOperacao('distribuicao', null, companyId, userId, 'erro', null, error.message);
            throw error;
        }
    },

    /**
     * Consulta status do serviço SEFAZ
     */
    async consultarStatusServico(uf: string, ambiente: 'homologacao' | 'producao'): Promise<{
        success: boolean;
        status: string;
        tempo_medio?: number;
        erro?: string;
    }> {
        try {
            // TODO: Implementar consulta real de status do serviço
            // Em produção, você consultaria o webservice de status da SEFAZ

            return {
                success: true,
                status: 'disponivel',
                tempo_medio: 2,
            };
        } catch (error: any) {
            return {
                success: false,
                status: 'indisponivel',
                erro: error.message,
            };
        }
    },

    /**
     * Consulta situação da nota emitida (para módulo de saída)
     */
    async consultarSituacaoNotaEmitida(
        chave: string,
        companyId: string,
        userId?: string
    ): Promise<ConsultaSefazResponse> {
        // Mesma lógica da consulta de entrada, mas pode ter validações diferentes
        return this.consultarSituacao(chave, companyId, userId);
    },

    /**
     * Baixa protocolo de autorização e anexa automaticamente
     */
    async baixarProtocolo(
        chave: string,
        protocolo: string,
        companyId: string,
        userId?: string
    ): Promise<string> {
        try {
            // TODO: Implementar download do protocolo
            // Em produção, você baixaria o protocolo de autorização da SEFAZ

            const protocoloXML = `<?xml version="1.0" encoding="UTF-8"?>
<protNFe>
    <infProt>
        <tpAmb>1</tpAmb>
        <verAplic>SP_NFE_PL_008i2</verAplic>
        <chNFe>${chave}</chNFe>
        <dhRecbto>${new Date().toISOString()}</dhRecbto>
        <nProt>${protocolo}</nProt>
        <digVal>...</digVal>
    </infProt>
</protNFe>`;

            return protocoloXML;
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Salva XML no banco de dados
     */
    async salvarXML(
        chave: string,
        xml: string,
        tipo: 'entrada' | 'saida',
        companyId: string,
        nfEntradaId?: string
    ): Promise<string> {
        const { data, error } = await supabase
            .from('notas_xml' as any)
            .upsert({
                chave,
                xml,
                tipo,
                company_id: companyId,
                nf_entrada_id: nfEntradaId,
                data: new Date().toISOString(),
            }, {
                onConflict: 'chave'
            })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    },

    /**
     * Salva itens do XML no banco de dados
     */
    async salvarItensXML(xmlId: string, itens: Array<{
        codigo?: string;
        descricao: string;
        ncm?: string;
        unidade: string;
        quantidade: number;
        valor_unit: number;
        valor_total: number;
    }>): Promise<void> {
        const itensToInsert = itens.map(item => ({
            id_xml: xmlId,
            codigo: item.codigo,
            descricao: item.descricao,
            ncm: item.ncm,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor_unit: item.valor_unit,
            valor_total: item.valor_total,
        }));

        const { error } = await supabase
            .from('notas_xml_itens' as any)
            .insert(itensToInsert);

        if (error) throw error;
    },

    /**
     * Busca XML salvo no banco
     */
    async buscarXML(chave: string, companyId: string): Promise<{ xml: string; id: string } | null> {
        const { data, error } = await supabase
            .from('notas_xml' as any)
            .select('id, xml')
            .eq('chave', chave)
            .eq('company_id', companyId)
            .single();

        if (error || !data) return null;
        return { xml: (data as any).xml, id: (data as any).id };
    },

    /**
     * Busca itens do XML salvo
     */
    async buscarItensXML(xmlId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('notas_xml_itens' as any)
            .select('*')
            .eq('id_xml', xmlId)
            .order('id');

        if (error) throw error;
        return data || [];
    },

    /**
     * Log de operações SEFAZ
     */
    async logOperacao(
        operacao: string,
        chave: string | null,
        companyId: string,
        userId?: string,
        status: 'sucesso' | 'erro' | 'pendente' = 'pendente',
        resposta?: any,
        mensagemErro?: string
    ): Promise<void> {
        const { error } = await supabase
            .from('sefaz_logs' as any)
            .insert({
                operacao,
                chave,
                resposta: resposta ? resposta : null,
                status,
                company_id: companyId,
                usuario_id: userId,
                mensagem_erro: mensagemErro,
            });

        if (error) {
            console.error('Erro ao salvar log SEFAZ:', error);
        }
    },

    /**
     * Busca configurações fiscais
     */
    async getFiscalConfig(companyId: string): Promise<{
        cnpj?: string;
        uf?: string;
        ambiente?: 'homologacao' | 'producao';
        ultimo_nsu?: string;
    } | null> {
        const { data, error } = await supabase
            .from('fiscal_config' as any)
            .select('cnpj, uf, ambiente, ultimo_nsu')
            .eq('company_id', companyId)
            .single();

        if (error || !data) return null;
        return data as any;
    },

    /**
     * Atualiza último NSU
     */
    async atualizarUltimoNSU(companyId: string, nsu: string): Promise<void> {
        const { error } = await supabase
            .from('fiscal_config' as any)
            .update({ ultimo_nsu: nsu } as any)
            .eq('company_id', companyId);

        if (error) throw error;
    },
};

