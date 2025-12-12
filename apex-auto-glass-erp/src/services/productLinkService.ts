import { supabase } from "@/integrations/supabase/client";

export interface ProductLink {
    id: string;
    company_id: string;
    supplier_cnpj: string;
    supplier_product_code: string;
    internal_product_id: string;
    fiscal_description?: string;
    ncm?: string;
    cest?: string;
    gtin?: string;
    fiscal_unit?: string;
    status: 'active' | 'inactive' | 'ignored';
    created_at: string;
    updated_at: string;
    product?: {
        id: string;
        name: string;
        internal_code: string;
        brand?: string;
        ncm?: string;
    };
}

export interface ProductLinkSuggestion {
    product: any;
    matchType: 'exact' | 'ncm' | 'gtin' | 'description' | 'similar';
    matchScore: number;
    reason: string;
}

export const productLinkService = {
    // Buscar vínculo existente
    async findLink(companyId: string, supplierCnpj: string, supplierProductCode: string): Promise<ProductLink | null> {
        try {
            const { data, error } = await supabase
                .from('supplier_product_links')
                .select(`
                    *,
                    product:products(id, name, internal_code, brand)
                `)
                .eq('company_id', companyId)
                .eq('supplier_cnpj', supplierCnpj)
                .eq('supplier_product_code', supplierProductCode)
                .eq('status', 'active')
                .single();

            if (error) {
                // PGRST116 = not found (é esperado)
                // PGRST205 = table not found (tabela não existe ainda)
                // 42703 = column does not exist
                if (error.code === 'PGRST116') {
                    return null; // Não encontrado é normal
                }
                if (error.code === 'PGRST205') {
                    console.warn('Tabela supplier_product_links não encontrada. Execute a migration primeiro.');
                    return null; // Retorna null se tabela não existir
                }
                if (error.code === '42703') {
                    // Coluna não existe na tabela (ex: ncm) - silenciar este erro
                    return null; // Retorna null se coluna não existir
                }
                console.error('Erro ao buscar vínculo:', error);
                return null;
            }

            return data as ProductLink | null;
        } catch (error: any) {
            // Ignorar erros de coluna não encontrada (42703)
            if (error?.code !== '42703') {
                console.error('Erro ao buscar vínculo:', error);
            }
            return null;
        }
    },

    // Criar novo vínculo
    async createLink(
        companyId: string,
        supplierCnpj: string,
        supplierProductCode: string,
        internalProductId: string,
        fiscalData: {
            fiscal_description?: string;
            ncm?: string;
            cest?: string;
            gtin?: string;
            fiscal_unit?: string;
        },
        userId?: string
    ): Promise<ProductLink> {
        try {
            const { data, error } = await supabase
                .from('supplier_product_links')
                .insert([{
                    company_id: companyId,
                    supplier_cnpj: supplierCnpj,
                    supplier_product_code: supplierProductCode,
                    internal_product_id: internalProductId,
                    fiscal_description: fiscalData.fiscal_description,
                    ncm: fiscalData.ncm,
                    cest: fiscalData.cest,
                    gtin: fiscalData.gtin,
                    fiscal_unit: fiscalData.fiscal_unit,
                    status: 'active',
                    created_by: userId,
                }])
                .select(`
                    *,
                    product:products(id, name, internal_code, brand)
                `)
                .single();

            if (error) {
                if (error.code === 'PGRST205') {
                    throw new Error('Tabela supplier_product_links não encontrada. Execute a migration primeiro.');
                }
                throw error;
            }
            return data as ProductLink;
        } catch (error: any) {
            if (error.code === 'PGRST205') {
                throw new Error('Tabela supplier_product_links não encontrada. Execute a migration primeiro.');
            }
            throw error;
        }
    },

    // Buscar sugestões de produtos para vinculação
    async findSuggestions(
        companyId: string,
        fiscalData: {
            ncm?: string;
            gtin?: string;
            description?: string;
            brand?: string;
        }
    ): Promise<ProductLinkSuggestion[]> {
        const suggestions: ProductLinkSuggestion[] = [];

        // Buscar por GTIN exato
        if (fiscalData.gtin) {
            const { data: gtinProducts } = await supabase
                .from('products')
                .select('*')
                .eq('company_id', companyId)
                .eq('internal_code', fiscalData.gtin)
                .limit(5);

            if (gtinProducts && gtinProducts.length > 0) {
                gtinProducts.forEach(p => {
                    suggestions.push({
                        product: p,
                        matchType: 'gtin',
                        matchScore: 100,
                        reason: 'GTIN/Código de barras idêntico'
                    });
                });
            }
        }

        // Buscar por NCM (se a coluna existir)
        if (fiscalData.ncm) {
            try {
                const { data: ncmProducts, error: ncmError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('ncm', fiscalData.ncm)
                    .limit(10);

                // Se a coluna ncm não existir, ignorar o erro silenciosamente
                if (ncmError && ncmError.code === '42703') {
                    // Coluna não existe, pular esta busca
                    console.warn('Coluna ncm não existe na tabela products. Pulando busca por NCM.');
                } else if (ncmProducts && ncmProducts.length > 0) {
                    ncmProducts.forEach(p => {
                        // Evitar duplicatas
                        if (!suggestions.find(s => s.product.id === p.id)) {
                            suggestions.push({
                                product: p,
                                matchType: 'ncm',
                                matchScore: 70,
                                reason: `NCM idêntico (${fiscalData.ncm})`
                            });
                        }
                    });
                }
            } catch (error) {
                // Ignorar erros de coluna não encontrada
                console.warn('Erro ao buscar produtos por NCM:', error);
            }
        }

        // Buscar por descrição similar (se houver descrição)
        if (fiscalData.description && fiscalData.description.length > 3) {
            const searchTerms = fiscalData.description.toLowerCase().split(' ').filter(t => t.length > 2);
            
            if (searchTerms.length > 0) {
                const { data: allProducts } = await supabase
                    .from('products')
                    .select('*')
                    .eq('company_id', companyId)
                    .limit(100);

                if (allProducts) {
                    allProducts.forEach(p => {
                        // Evitar duplicatas
                        if (suggestions.find(s => s.product.id === p.id)) return;

                        const productName = (p.name || '').toLowerCase();
                        const productDesc = (p.description || '').toLowerCase();
                        const fullText = `${productName} ${productDesc}`;

                        // Calcular similaridade
                        let matches = 0;
                        searchTerms.forEach(term => {
                            if (fullText.includes(term)) matches++;
                        });

                        const similarity = (matches / searchTerms.length) * 100;

                        if (similarity >= 70) {
                            suggestions.push({
                                product: p,
                                matchType: similarity >= 90 ? 'description' : 'similar',
                                matchScore: Math.round(similarity),
                                reason: `Descrição ${similarity >= 90 ? 'muito' : 'parcialmente'} similar (${Math.round(similarity)}%)`
                            });
                        }
                    });
                }
            }
        }

        // Ordenar por score
        return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
    },

    // Marcar item como ignorado
    async markAsIgnored(
        companyId: string,
        supplierCnpj: string,
        supplierProductCode: string,
        fiscalData: {
            fiscal_description?: string;
            ncm?: string;
            cest?: string;
            gtin?: string;
        },
        userId?: string
    ): Promise<ProductLink> {
        try {
            // Verificar se já existe vínculo ignorado
            const existing = await this.findLink(companyId, supplierCnpj, supplierProductCode);
            
            if (existing) {
                // Atualizar status
                const { data, error } = await supabase
                    .from('supplier_product_links')
                    .update({ status: 'ignored' })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) {
                    if (error.code === 'PGRST205') {
                        throw new Error('Tabela supplier_product_links não encontrada. Execute a migration primeiro.');
                    }
                    throw error;
                }
                return data as ProductLink;
            } else {
                // Criar novo vínculo com status ignored (sem produto interno)
                const { data, error } = await supabase
                    .from('supplier_product_links')
                    .insert([{
                        company_id: companyId,
                        supplier_cnpj: supplierCnpj,
                        supplier_product_code: supplierProductCode,
                        internal_product_id: null,
                        fiscal_description: fiscalData.fiscal_description,
                        ncm: fiscalData.ncm,
                        cest: fiscalData.cest,
                        gtin: fiscalData.gtin,
                        status: 'ignored',
                        created_by: userId,
                    }])
                    .select()
                    .single();

                if (error) {
                    if (error.code === 'PGRST205') {
                        throw new Error('Tabela supplier_product_links não encontrada. Execute a migration primeiro.');
                    }
                    throw error;
                }
                return data as ProductLink;
            }
        } catch (error: any) {
            if (error.code === 'PGRST205' || error.message?.includes('não encontrada')) {
                throw new Error('Tabela supplier_product_links não encontrada. Execute a migration primeiro.');
            }
            throw error;
        }
    }
};

