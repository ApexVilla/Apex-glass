import { supabase } from "@/integrations/supabase/client";
import { EntryNote, EntryNoteItem } from "@/types/entryNote";

export const entryNoteService = {
    async create(note: EntryNote) {
        const { items, ...header } = note;

        // Validar campos obrigatórios
        if (!header.numero || !header.serie || !header.tipo_entrada || !header.data_emissao || !header.data_entrada) {
            throw new Error('Campos obrigatórios não preenchidos: numero, serie, tipo_entrada, data_emissao, data_entrada');
        }

        // 1. Insert Header
        const { data: headerData, error: headerError } = await supabase
            .from('nf_entrada')
            .insert([{
                numero: header.numero,
                serie: header.serie,
                tipo_documento: header.tipo_documento || 'NFe', // Valor padrão se não fornecido
                tipo_entrada: header.tipo_entrada,
                chave_acesso: header.chave_acesso,
                data_emissao: header.data_emissao,
                data_entrada: header.data_entrada,
                fornecedor_id: header.fornecedor_id,
                cfop: header.cfop,
                natureza_operacao: header.natureza_operacao,
                finalidade: header.finalidade,
                status: header.status || 'Rascunho',
                totais: header.totais as any, // Cast to JSON
                observacao: header.observacao_interna, // Map to DB field
                xml: header.xml,
                company_id: header.company_id
            }])
            .select()
            .single();

        if (headerError) {
            console.error('Erro ao inserir NF entrada:', headerError);
            throw headerError;
        }

        // 2. Insert Items
        if (items && items.length > 0) {
            const itemsToInsert = items.map(item => ({
                nf_id: headerData.id,
                produto_id: item.produto_id,
                ncm: item.ncm,
                unidade: item.unidade,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                desconto: item.desconto,
                total: item.total,
                impostos: item.impostos as any, // Cast to JSON
                // Campos fiscais
                quantidade_fiscal: item.quantidade_fiscal ?? item.quantidade,
                valor_unitario_fiscal: item.valor_unitario_fiscal ?? item.valor_unitario,
                valor_total_fiscal: item.valor_total_fiscal ?? item.total,
                unidade_fiscal: item.unidade_fiscal ?? item.unidade,
                // Campos internos
                quantidade_interna: item.quantidade_interna ?? item.quantidade,
                unidade_interna: item.unidade_interna ?? item.unidade,
                fator_conversao: item.fator_conversao ?? 1,
                valor_unitario_interno: item.valor_unitario_interno ?? item.valor_unitario,
                // Campos adicionais
                local_estoque: item.local_estoque,
                codigo_interno: item.codigo_interno,
                natureza_financeira_id: item.natureza_financeira_id,
                centro_custo_id: item.centro_custo_id
            }));

            const { error: itemsError } = await supabase
                .from('nf_entrada_itens')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return headerData;
    },

    async update(id: string, note: EntryNote) {
        const { items, ...header } = note;

        // 1. Update Header
        const { error: headerError } = await supabase
            .from('nf_entrada')
            .update({
                ...header,
                tipo_documento: header.tipo_documento || 'NFe', // Valor padrão se não fornecido
                totais: header.totais as any,
                observacao: header.observacao_interna
            })
            .eq('id', id);

        if (headerError) throw headerError;

        // 2. Update Items (Delete all and re-insert for simplicity)
        // In a real app with high concurrency, this might be bad, but for this ERP it's likely fine.
        const { error: deleteError } = await supabase
            .from('nf_entrada_itens')
            .delete()
            .eq('nf_id', id);

        if (deleteError) throw deleteError;

        if (items && items.length > 0) {
            const itemsToInsert = items.map(item => ({
                nf_id: id,
                produto_id: item.produto_id,
                ncm: item.ncm,
                unidade: item.unidade,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                desconto: item.desconto,
                total: item.total,
                impostos: item.impostos as any,
                // Campos fiscais
                quantidade_fiscal: item.quantidade_fiscal ?? item.quantidade,
                valor_unitario_fiscal: item.valor_unitario_fiscal ?? item.valor_unitario,
                valor_total_fiscal: item.valor_total_fiscal ?? item.total,
                unidade_fiscal: item.unidade_fiscal ?? item.unidade,
                // Campos internos
                quantidade_interna: item.quantidade_interna ?? item.quantidade,
                unidade_interna: item.unidade_interna ?? item.unidade,
                fator_conversao: item.fator_conversao ?? 1,
                valor_unitario_interno: item.valor_unitario_interno ?? item.valor_unitario,
                // Campos adicionais
                local_estoque: item.local_estoque,
                codigo_interno: item.codigo_interno,
                natureza_financeira_id: item.natureza_financeira_id,
                centro_custo_id: item.centro_custo_id
            }));

            const { error: itemsError } = await supabase
                .from('nf_entrada_itens')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return true;
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('nf_entrada')
            .select(`
                *,
                items:nf_entrada_itens(*, product:products(name, internal_code)),
                supplier:suppliers(name, cpf_cnpj)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async list() {
        const { data, error } = await supabase
            .from('nf_entrada')
            .select(`
                *,
                supplier:suppliers(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async launch(id: string, note: EntryNote, userId?: string) {
        // 1. Update status
        const { error: updateError } = await supabase
            .from('nf_entrada')
            .update({ status: 'Lançada' })
            .eq('id', id);

        if (updateError) throw updateError;

        // 2. Calcular distribuição de frete e despesas (proporcional ao valor dos itens)
        const totalItens = note.items?.reduce((sum, item) => {
            if (item.link_status === 'ignored') return sum;
            return sum + (item.total || 0);
        }, 0) || 0;

        const freteTotal = note.totais?.frete || 0;
        const outrasDespesasTotal = note.totais?.outras_despesas || 0;
        const despesasTotais = freteTotal + outrasDespesasTotal;

        // 3. Stock Movement e Cálculo de Custo Médio
        if (note.items && note.items.length > 0) {
            for (const item of note.items) {
                // Ignorar itens marcados como "ignored"
                if (item.link_status === 'ignored') {
                    continue;
                }

                // Validar que item está vinculado
                if (!item.produto_id) {
                    throw new Error(`Item não vinculado a um produto interno. Vincule todos os itens antes de lançar.`);
                }

                // Usar quantidade_interna para estoque (se disponível), senão usar quantidade
                const quantidadeEstoque = item.quantidade_interna ?? item.quantidade;
                
                // Validar quantidade
                if (!quantidadeEstoque || quantidadeEstoque <= 0) {
                    throw new Error(`Quantidade inválida para o produto no item. Quantidade deve ser maior que zero.`);
                }

                // Get current stock and price
                const { data: product } = await supabase
                    .from('products')
                    .select('quantity, purchase_price')
                    .eq('id', item.produto_id)
                    .single();

                if (product) {
                    const currentQuantity = product.quantity || 0;
                    const currentPrice = Number(product.purchase_price) || 0;
                    
                    // Calcular valor unitário da entrada (usar valor interno se disponível)
                    const valorUnitarioEntrada = item.valor_unitario_interno ?? item.valor_unitario;
                    
                    // Distribuir frete/despesas proporcionalmente ao valor do item
                    let valorUnitarioComDespesas = valorUnitarioEntrada;
                    if (totalItens > 0 && despesasTotais > 0) {
                        const percentualItem = (item.total || 0) / totalItens;
                        const despesasProporcionais = despesasTotais * percentualItem;
                        const valorTotalComDespesas = (item.total || 0) + despesasProporcionais;
                        valorUnitarioComDespesas = valorTotalComDespesas / quantidadeEstoque;
                    }
                    
                    // Calcular custo médio ponderado
                    const totalValorAtual = currentQuantity * currentPrice;
                    const totalValorEntrada = quantidadeEstoque * valorUnitarioComDespesas;
                    const newQuantity = currentQuantity + quantidadeEstoque;
                    
                    // Custo médio = (Valor Atual + Valor Entrada) / (Quantidade Atual + Quantidade Entrada)
                    const newAveragePrice = newQuantity > 0 
                        ? (totalValorAtual + totalValorEntrada) / newQuantity
                        : valorUnitarioComDespesas;

                    // Update product com quantidade e custo médio
                    const { error: updateError } = await supabase
                        .from('products')
                        .update({ 
                            quantity: newQuantity,
                            purchase_price: Number(newAveragePrice.toFixed(2))
                        })
                        .eq('id', item.produto_id);

                    if (updateError) {
                        console.error(`Erro ao atualizar produto ${item.produto_id}:`, updateError);
                        throw new Error(`Erro ao atualizar estoque do produto: ${updateError.message}`);
                    }

                    // Log movement com quantidade interna
                    await supabase
                        .from('inventory_movements')
                        .insert([{
                            company_id: note.company_id,
                            product_id: item.produto_id,
                            type: 'entrada_compra',
                            quantity: quantidadeEstoque,
                            reason: `NF Entrada ${note.numero} - ${note.serie}${item.quantidade_fiscal && item.quantidade_fiscal !== quantidadeEstoque ? ` (Fiscal: ${item.quantidade_fiscal}, Interna: ${quantidadeEstoque})` : ''} | Custo Unit: R$ ${valorUnitarioComDespesas.toFixed(2)} | Custo Médio: R$ ${newAveragePrice.toFixed(2)}`,
                            reference_id: id,
                            user_id: userId
                        }]);
                }
            }
        }

        return true;
    },

    validateKey(key: string) {
        return key.length === 44 && /^\d+$/.test(key);
    },

    validateSeries(series: string, type: string) {
        // Simple validation logic based on user prompt rules if any
        // "Série deve validar conforme tipo de entrada"
        // For now, we'll just ensure they are selected.
        // We could add specific rules like "Importação" requires series 10, 11, 12 etc.
        if (type.includes('Importação') && !['10 - Importação direta', '11 - Importação encomenda', '12 - Importação conta e ordem'].includes(series)) {
            return false;
        }
        return true;
    },

    /**
     * Verifica se é possível excluir a NF sem deixar estoque negativo
     * Retorna um objeto com canDelete (boolean) e message (string com detalhes)
     */
    async canDelete(id: string): Promise<{ canDelete: boolean; message: string; productsWithNegativeStock?: Array<{ product_id: string; product_name: string; current_stock: number; quantity_to_remove: number; resulting_stock: number }> }> {
        try {
            // Buscar a NF com seus itens
            const { data: note, error: noteError } = await supabase
                .from('nf_entrada')
                .select(`
                    id,
                    numero,
                    serie,
                    status,
                    items:nf_entrada_itens(
                        id,
                        produto_id,
                        quantidade,
                        quantidade_interna,
                        product:products(id, name, quantity)
                    )
                `)
                .eq('id', id)
                .single();

            if (noteError) throw noteError;
            if (!note) {
                return { canDelete: false, message: 'Nota fiscal não encontrada' };
            }

            // Se a NF não está lançada, pode excluir sem problemas
            if (note.status !== 'Lançada') {
                return { canDelete: true, message: 'NF não está lançada, pode ser excluída' };
            }

            // Se está lançada, verificar se ao reverter o estoque, algum produto ficaria negativo
            const productsWithNegativeStock: Array<{ product_id: string; product_name: string; current_stock: number; quantity_to_remove: number; resulting_stock: number }> = [];

            if (note.items && note.items.length > 0) {
                for (const item of note.items as any[]) {
                    if (!item.produto_id || !item.product) continue;

                    // Usar quantidade_interna se disponível, senão usar quantidade
                    const quantidadeEstoque = item.quantidade_interna ?? item.quantidade;
                    
                    if (quantidadeEstoque <= 0) continue;

                    const currentStock = item.product.quantity || 0;
                    const resultingStock = currentStock - quantidadeEstoque;

                    // Se o estoque resultante seria negativo, adicionar à lista
                    if (resultingStock < 0) {
                        productsWithNegativeStock.push({
                            product_id: item.produto_id,
                            product_name: item.product.name || 'Produto sem nome',
                            current_stock: currentStock,
                            quantity_to_remove: quantidadeEstoque,
                            resulting_stock: resultingStock
                        });
                    }
                }
            }

            if (productsWithNegativeStock.length > 0) {
                const productNames = productsWithNegativeStock.map(p => p.product_name).join(', ');
                return {
                    canDelete: false,
                    message: `Não é possível excluir esta NF. O estoque ficaria negativo para os seguintes produtos: ${productNames}. Alguns itens desta NF já foram vendidos.`,
                    productsWithNegativeStock
                };
            }

            return { canDelete: true, message: 'NF pode ser excluída sem deixar estoque negativo' };
        } catch (error: any) {
            console.error('Erro ao verificar se pode excluir NF:', error);
            return { canDelete: false, message: `Erro ao verificar: ${error.message}` };
        }
    },

    /**
     * Exclui a NF e reverte o estoque se ela estiver lançada
     */
    async delete(id: string, userId?: string): Promise<void> {
        try {
            // Verificar se pode excluir
            const validation = await this.canDelete(id);
            if (!validation.canDelete) {
                throw new Error(validation.message);
            }

            // Buscar a NF com seus itens
            const { data: note, error: noteError } = await supabase
                .from('nf_entrada')
                .select(`
                    id,
                    numero,
                    serie,
                    status,
                    company_id,
                    items:nf_entrada_itens(
                        id,
                        produto_id,
                        quantidade,
                        quantidade_interna
                    )
                `)
                .eq('id', id)
                .single();

            if (noteError) throw noteError;
            if (!note) throw new Error('Nota fiscal não encontrada');

            // Se a NF está lançada, reverter o estoque antes de excluir
            if (note.status === 'Lançada' && note.items && (note.items as any[]).length > 0) {
                for (const item of note.items as any[]) {
                    if (!item.produto_id) continue;

                    // Usar quantidade_interna se disponível, senão usar quantidade
                    const quantidadeEstoque = item.quantidade_interna ?? item.quantidade;
                    
                    if (quantidadeEstoque <= 0) continue;

                    // Buscar estoque atual
                    const { data: product, error: productError } = await supabase
                        .from('products')
                        .select('quantity, name')
                        .eq('id', item.produto_id)
                        .single();

                    if (productError) {
                        console.error(`Erro ao buscar produto ${item.produto_id}:`, productError);
                        continue;
                    }

                    if (product) {
                        const currentQuantity = product.quantity || 0;
                        const newQuantity = currentQuantity - quantidadeEstoque;

                        // Atualizar estoque (reverter entrada)
                        const { error: updateError } = await supabase
                            .from('products')
                            .update({ quantity: newQuantity })
                            .eq('id', item.produto_id);

                        if (updateError) {
                            console.error(`Erro ao reverter estoque do produto ${item.produto_id}:`, updateError);
                            throw new Error(`Erro ao reverter estoque do produto ${product.name || item.produto_id}`);
                        }

                        // Criar movimentação de estoque (saída - reversão de entrada)
                        await supabase
                            .from('inventory_movements')
                            .insert([{
                                company_id: note.company_id,
                                product_id: item.produto_id,
                                type: 'saida_exclusao_nf',
                                quantity: quantidadeEstoque,
                                reason: `Exclusão NF Entrada ${note.numero}/${note.serie} - Reversão de entrada`,
                                reference_id: id,
                                reference_type: 'nf_entrada',
                                user_id: userId
                            }]);
                    }
                }
            }

            // Excluir a NF (os itens serão excluídos automaticamente por CASCADE)
            const { error: deleteError } = await supabase
                .from('nf_entrada')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
        } catch (error: any) {
            console.error('Erro ao excluir NF:', error);
            throw error;
        }
    },

    async parseXml(file: File): Promise<Partial<EntryNote>> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(e.target?.result as string, "text/xml");

                    // Basic NFe parsing logic
                    const nfe = xmlDoc.getElementsByTagName("infNFe")[0];
                    if (!nfe) throw new Error("XML inválido: tag infNFe não encontrada");

                    const ide = nfe.getElementsByTagName("ide")[0];
                    const emit = nfe.getElementsByTagName("emit")[0];
                    const dest = nfe.getElementsByTagName("dest")[0];
                    const det = nfe.getElementsByTagName("det");
                    const total = nfe.getElementsByTagName("total")[0];

                    // Extract fields
                    const numero = ide.getElementsByTagName("nNF")[0]?.textContent || "";
                    const serie = ide.getElementsByTagName("serie")[0]?.textContent || "";
                    const dataEmissao = ide.getElementsByTagName("dhEmi")[0]?.textContent || "";
                    const chave = nfe.getAttribute("Id")?.replace("NFe", "") || "";

                    // ... extract other fields ...
                    // This is a simplified parser. In a real app, we'd map everything carefully.

                    resolve({
                        numero,
                        serie,
                        chave_acesso: chave,
                        data_emissao: dataEmissao,
                        // ...
                    });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }
};
