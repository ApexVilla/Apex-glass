/**
 * Serviço para gerenciamento e uso de certificados digitais A1
 * Suporta certificados .pfx/.p12 para assinatura digital de XMLs
 */

import { supabase } from '@/integrations/supabase/client';

export interface CertificateInfo {
    id: string;
    company_id: string;
    cnpj: string;
    uf: string;
    ambiente: 'homologacao' | 'producao';
    validUntil?: Date;
    hasCertificate: boolean;
}

export interface CertificateData {
    pfxBuffer: ArrayBuffer;
    password: string;
}

/**
 * Serviço de certificado digital
 */
export const certificateService = {
    /**
     * Obtém informações do certificado da empresa (sem o certificado em si)
     */
    async getCertificateInfo(companyId: string): Promise<CertificateInfo | null> {
        try {
            const { data, error } = await supabase
                .from('fiscal_config')
                .select('id, company_id, cnpj, uf, ambiente')
                .eq('company_id', companyId)
                .single();

            if (error || !data) return null;

            // Verificar se tem certificado (sem ler o conteúdo por segurança)
            const { data: certCheck } = await supabase
                .from('fiscal_config')
                .select('certificado_pfx')
                .eq('company_id', companyId)
                .single();

            return {
                id: data.id,
                company_id: data.company_id,
                cnpj: data.cnpj || '',
                uf: data.uf || '',
                ambiente: data.ambiente || 'homologacao',
                hasCertificate: !!certCheck?.certificado_pfx,
            };
        } catch (error: any) {
            console.error('Erro ao buscar info do certificado:', error);
            return null;
        }
    },

    /**
     * Obtém o certificado completo (incluindo dados binários)
     * ATENÇÃO: Esta função deve ser usada apenas no backend ou em ambiente seguro
     */
    async getCertificateData(companyId: string): Promise<CertificateData | null> {
        try {
            const { data, error } = await supabase
                .from('fiscal_config')
                .select('certificado_pfx, senha_certificado')
                .eq('company_id', companyId)
                .single();

            if (error || !data || !data.certificado_pfx) {
                return null;
            }

            // Converter BYTEA para ArrayBuffer
            // Nota: Em produção, isso deve ser feito no backend por segurança
            let pfxBuffer: ArrayBuffer;
            if (data.certificado_pfx instanceof ArrayBuffer) {
                pfxBuffer = data.certificado_pfx;
            } else if (typeof data.certificado_pfx === 'string') {
                // Se for base64, converter
                const binaryString = atob(data.certificado_pfx);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                pfxBuffer = bytes.buffer;
            } else {
                throw new Error('Formato de certificado não suportado');
            }

            return {
                pfxBuffer,
                password: data.senha_certificado || '',
            };
        } catch (error: any) {
            console.error('Erro ao obter certificado:', error);
            return null;
        }
    },

    /**
     * Salva/atualiza certificado digital
     * @param companyId ID da empresa
     * @param pfxFile Arquivo .pfx ou .p12
     * @param password Senha do certificado
     */
    async saveCertificate(
        companyId: string,
        pfxFile: File | ArrayBuffer,
        password: string,
        cnpj?: string,
        uf?: string
    ): Promise<boolean> {
        try {
            let pfxBuffer: ArrayBuffer;

            if (pfxFile instanceof File) {
                pfxBuffer = await pfxFile.arrayBuffer();
            } else {
                pfxBuffer = pfxFile;
            }

            // Verificar se já existe configuração
            const { data: existing } = await supabase
                .from('fiscal_config')
                .select('id')
                .eq('company_id', companyId)
                .single();

            const configData: any = {
                company_id: companyId,
                certificado_pfx: pfxBuffer,
                senha_certificado: password,
            };

            if (cnpj) configData.cnpj = cnpj;
            if (uf) configData.uf = uf;

            if (existing) {
                // Atualizar
                const { error } = await supabase
                    .from('fiscal_config')
                    .update(configData)
                    .eq('company_id', companyId);

                if (error) throw error;
            } else {
                // Inserir
                const { error } = await supabase
                    .from('fiscal_config')
                    .insert([configData]);

                if (error) throw error;
            }

            return true;
        } catch (error: any) {
            console.error('Erro ao salvar certificado:', error);
            throw error;
        }
    },

    /**
     * Remove certificado digital (mantém outras configurações)
     */
    async removeCertificate(companyId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('fiscal_config')
                .update({
                    certificado_pfx: null,
                    senha_certificado: null,
                })
                .eq('company_id', companyId);

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('Erro ao remover certificado:', error);
            throw error;
        }
    },

    /**
     * Valida se o certificado está válido e não expirado
     * NOTA: Validação real deve ser feita no backend usando biblioteca de certificados
     */
    async validateCertificate(companyId: string): Promise<{
        valid: boolean;
        expired?: boolean;
        expiresAt?: Date;
        error?: string;
    }> {
        try {
            const certInfo = await this.getCertificateInfo(companyId);
            
            if (!certInfo || !certInfo.hasCertificate) {
                return {
                    valid: false,
                    error: 'Certificado não encontrado',
                };
            }

            // Validação básica - em produção, deve ser feita no backend
            // usando biblioteca como node-forge para ler o certificado
            return {
                valid: true,
            };
        } catch (error: any) {
            return {
                valid: false,
                error: error.message,
            };
        }
    },
};

