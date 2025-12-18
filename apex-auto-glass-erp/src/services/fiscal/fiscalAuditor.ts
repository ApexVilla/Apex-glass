/**
 * AUDITORIA FISCAL DE NF-e
 * Validações críticas antes da emissão de notas fiscais
 */

import { supabase } from '@/integrations/supabase/client';
import { certificateService } from './certificateService';

export interface FiscalAuditResult {
    isValid: boolean;
    errors: FiscalAuditError[];
    warnings: FiscalAuditWarning[];
    corrections: FiscalCorrection[];
}

export interface FiscalAuditError {
    code: string;
    severity: 'CRITICAL' | 'ERROR' | 'WARNING';
    message: string;
    field?: string;
    fixable: boolean;
}

export interface FiscalAuditWarning {
    code: string;
    message: string;
    recommendation: string;
}

export interface FiscalCorrection {
    action: string;
    description: string;
    applied: boolean;
}

/**
 * Valida se um documento é CNPJ (14 dígitos) ou CPF (11 dígitos)
 */
function validateDocumentType(document: string): { isValid: boolean; isCNPJ: boolean; isCPF: boolean; cleanDoc: string } {
    const cleanDoc = document.replace(/\D/g, '');
    const isCNPJ = cleanDoc.length === 14;
    const isCPF = cleanDoc.length === 11;
    const isValid = isCNPJ || isCPF;
    
    return { isValid, isCNPJ, isCPF, cleanDoc };
}

/**
 * Valida CNPJ usando algoritmo de validação
 */
function validateCNPJAlgorithm(cnpj: string): boolean {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    
    // Validar dígitos verificadores
    let length = cleanCNPJ.length - 2;
    let numbers = cleanCNPJ.substring(0, length);
    const digits = cleanCNPJ.substring(length);
    let sum = 0;
    let pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cleanCNPJ.substring(0, length);
    sum = 0;
    pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
}

/**
 * Serviço de Auditoria Fiscal
 */
export const fiscalAuditor = {
    /**
     * Realiza auditoria completa da configuração fiscal
     */
    async auditFiscalConfig(companyId: string): Promise<FiscalAuditResult> {
        const errors: FiscalAuditError[] = [];
        const warnings: FiscalAuditWarning[] = [];
        const corrections: FiscalCorrection[] = [];

        try {
            // 1. Buscar dados da empresa
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('id, name, cnpj')
                .eq('id', companyId)
                .single();

            if (companyError || !company) {
                errors.push({
                    code: 'COMPANY_NOT_FOUND',
                    severity: 'CRITICAL',
                    message: 'Empresa não encontrada no sistema',
                    fixable: false,
                });
                return { isValid: false, errors, warnings, corrections };
            }

            // 2. Verificar CNPJ da empresa
            if (!company.cnpj) {
                errors.push({
                    code: 'COMPANY_CNPJ_MISSING',
                    severity: 'CRITICAL',
                    message: 'Empresa não possui CNPJ cadastrado',
                    field: 'companies.cnpj',
                    fixable: true,
                });
            } else {
                const docValidation = validateDocumentType(company.cnpj);
                
                if (docValidation.isCPF) {
                    errors.push({
                        code: 'COMPANY_CPF_INSTEAD_CNPJ',
                        severity: 'CRITICAL',
                        message: `ERRO CRÍTICO: Empresa possui CPF (${docValidation.cleanDoc}) no lugar de CNPJ. Emissão de NF-e BLOQUEADA.`,
                        field: 'companies.cnpj',
                        fixable: true,
                    });
                } else if (docValidation.isCNPJ) {
                    if (!validateCNPJAlgorithm(company.cnpj)) {
                        errors.push({
                            code: 'COMPANY_CNPJ_INVALID',
                            severity: 'CRITICAL',
                            message: `CNPJ da empresa é inválido: ${company.cnpj}`,
                            field: 'companies.cnpj',
                            fixable: true,
                        });
                    }
                }
            }

            // 3. Buscar configuração fiscal
            const certInfo = await certificateService.getCertificateInfo(companyId);
            
            if (!certInfo) {
                errors.push({
                    code: 'FISCAL_CONFIG_MISSING',
                    severity: 'CRITICAL',
                    message: 'Configuração fiscal não encontrada',
                    fixable: false,
                });
            } else {
                // 4. Verificar CNPJ do certificado
                if (!certInfo.cnpj) {
                    errors.push({
                        code: 'CERT_CNPJ_MISSING',
                        severity: 'CRITICAL',
                        message: 'Certificado não possui CNPJ cadastrado',
                        field: 'fiscal_config.cnpj',
                        fixable: true,
                    });
                } else {
                    const certDocValidation = validateDocumentType(certInfo.cnpj);
                    
                    if (certDocValidation.isCPF) {
                        errors.push({
                            code: 'CERT_CPF_INSTEAD_CNPJ',
                            severity: 'CRITICAL',
                            message: `ERRO CRÍTICO: Certificado possui CPF (${certDocValidation.cleanDoc}) no lugar de CNPJ. Emissão de NF-e BLOQUEADA.`,
                            field: 'fiscal_config.cnpj',
                            fixable: true,
                        });
                    }
                }

                // 5. Verificar se CNPJ da empresa = CNPJ do certificado
                if (company.cnpj && certInfo.cnpj) {
                    const companyClean = company.cnpj.replace(/\D/g, '');
                    const certClean = certInfo.cnpj.replace(/\D/g, '');
                    
                    if (companyClean !== certClean) {
                        errors.push({
                            code: 'CNPJ_MISMATCH',
                            severity: 'CRITICAL',
                            message: `CNPJ da empresa (${company.cnpj}) não corresponde ao CNPJ do certificado (${certInfo.cnpj}). Emissão BLOQUEADA.`,
                            field: 'fiscal_config.cnpj',
                            fixable: true,
                        });
                    }
                }

                // 6. Verificar ambiente
                if (certInfo.ambiente === 'producao') {
                    warnings.push({
                        code: 'PRODUCTION_ENV',
                        message: 'Ambiente configurado como PRODUÇÃO',
                        recommendation: 'Para testes, use HOMOLOGAÇÃO. Em produção, exija confirmação explícita do usuário.',
                    });
                }

                // 7. Verificar se certificado está presente
                if (!certInfo.hasCertificate) {
                    errors.push({
                        code: 'CERTIFICATE_MISSING',
                        severity: 'ERROR',
                        message: 'Certificado digital A1 não foi carregado',
                        field: 'fiscal_config.certificado_pfx',
                        fixable: true,
                    });
                }
            }

            // 8. Aplicar correções automáticas se possível
            if (certInfo && certInfo.ambiente === 'producao') {
                // Forçar ambiente de homologação para testes
                const { error: updateError } = await supabase
                    .from('fiscal_config')
                    .update({ ambiente: 'homologacao' })
                    .eq('company_id', companyId);

                if (!updateError) {
                    corrections.push({
                        action: 'FORCE_HOMOLOGACAO',
                        description: 'Ambiente alterado de PRODUÇÃO para HOMOLOGAÇÃO automaticamente',
                        applied: true,
                    });
                }
            }

            const isValid = errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR').length === 0;

            return {
                isValid,
                errors,
                warnings,
                corrections,
            };
        } catch (error: any) {
            errors.push({
                code: 'AUDIT_ERROR',
                severity: 'ERROR',
                message: `Erro ao realizar auditoria: ${error.message}`,
                fixable: false,
            });
            return { isValid: false, errors, warnings, corrections };
        }
    },

    /**
     * Valida se pode emitir NF-e (bloqueia se houver erros críticos)
     */
    async canEmitNFe(companyId: string, emitenteCNPJ: string): Promise<{ canEmit: boolean; reason?: string }> {
        const audit = await this.auditFiscalConfig(companyId);

        // Bloquear se houver erros críticos
        const criticalErrors = audit.errors.filter(e => e.severity === 'CRITICAL');
        if (criticalErrors.length > 0) {
            return {
                canEmit: false,
                reason: `Emissão bloqueada: ${criticalErrors.map(e => e.message).join('; ')}`,
            };
        }

        // Validar CNPJ do emitente
        const docValidation = validateDocumentType(emitenteCNPJ);
        if (docValidation.isCPF) {
            return {
                canEmit: false,
                reason: `BLOQUEADO: CPF detectado (${docValidation.cleanDoc}) no lugar de CNPJ. NF-e só pode ser emitida com CNPJ.`,
            };
        }

        if (!docValidation.isCNPJ) {
            return {
                canEmit: false,
                reason: `CNPJ inválido: ${emitenteCNPJ}. Deve ter 14 dígitos.`,
            };
        }

        if (!validateCNPJAlgorithm(emitenteCNPJ)) {
            return {
                canEmit: false,
                reason: `CNPJ inválido (algoritmo): ${emitenteCNPJ}`,
            };
        }

        return { canEmit: true };
    },

    /**
     * Valida CNPJ antes de emitir
     */
    validateCNPJ(cnpj: string): { isValid: boolean; isCNPJ: boolean; isCPF: boolean; message: string } {
        const docValidation = validateDocumentType(cnpj);
        
        if (!docValidation.isValid) {
            return {
                isValid: false,
                isCNPJ: false,
                isCPF: false,
                message: 'Documento inválido',
            };
        }

        if (docValidation.isCPF) {
            return {
                isValid: false,
                isCNPJ: false,
                isCPF: true,
                message: `ERRO: CPF detectado (${docValidation.cleanDoc}). NF-e requer CNPJ de 14 dígitos.`,
            };
        }

        if (!validateCNPJAlgorithm(cnpj)) {
            return {
                isValid: false,
                isCNPJ: true,
                isCPF: false,
                message: `CNPJ inválido (algoritmo de validação): ${cnpj}`,
            };
        }

        return {
            isValid: true,
            isCNPJ: true,
            isCPF: false,
            message: 'CNPJ válido',
        };
    },
};

