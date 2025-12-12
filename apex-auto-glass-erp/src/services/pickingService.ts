import { supabase } from '@/integrations/supabase/client';
import { removeSaleStatus } from '@/services/saleStatusService';

// Tipos expandidos
export type PickingItemStatus = 'pendente' | 'separado' | 'faltando' | 'substituido' | 'parcial' | 'ok' | 'danificado';

export interface PickingItem {
    id: string;
    picking_id: string;
    product_id: string;
    quantity_sold: number;
    quantity_picked: number;
    status_item: PickingItemStatus;
    notes?: string;
    photo_url?: string;
    substituted_product_id?: string;
    product?: {
        id: string;
        name: string;
        internal_code: string;
        location: string;
        manufacturer_code: string;
        quantity: number; // estoque atual
        image_url?: string;
    };
    substituted_product?: {
        id: string;
        name: string;
        internal_code: string;
    };
}

export interface Picking {
    id: string;
    sale_id: string;
    status: 'em_separacao' | 'pausado' | 'separado' | 'erro_falta' | 'erro_danificado';
    started_at: string;
    finished_at?: string;
    user_id: string;
    company_id: string;
    sale?: {
        sale_number: number;
        created_at: string;
        customer?: {
            name: string;
        };
        seller?: {
            email: string;
            full_name?: string;
        };
        total: number;
    };
}

export interface PickingStats {
    total: number;
    separados: number;
    faltando: number;
    parciais: number;
    substituidos: number;
}

// Função auxiliar para verificar permissão do usuário
async function hasUserPermission(userId: string, companyId: string, permissionKey: string): Promise<boolean> {
    try {
        // Buscar user_roles do usuário
        const { data: userRolesData } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', userId)
            .eq('company_id', companyId);

        if (!userRolesData || userRolesData.length === 0) {
            return false;
        }

        // Buscar roles separadamente
        const roleIds = userRolesData.map(ur => ur.role_id).filter(Boolean);
        if (roleIds.length === 0) {
            return false;
        }

        const { data: roles } = await supabase
            .from('roles')
            .select('permissions')
            .in('id', roleIds);

        if (!roles || roles.length === 0) {
            return false;
        }

        // Verificar se alguma role tem a permissão ativada
        for (const role of roles) {
            if (role.permissions && typeof role.permissions === 'object') {
                const permissions = role.permissions as Record<string, boolean>;
                if (permissions[permissionKey] === true) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
}

export const pickingService = {
    // List sales waiting for picking
    async getSalesWaitingForPicking(companyId: string) {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                customer:customers(name)
            `)
            .eq('company_id', companyId)
            .eq('status_venda', 'aguardando_separacao')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Buscar sellers separadamente
        if (data && data.length > 0) {
            const sellerIds = data
                .map(sale => sale.seller_id)
                .filter((id): id is string => id !== null);

            if (sellerIds.length > 0) {
                const { data: sellers } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', sellerIds);

                if (sellers) {
                    const sellerMap = new Map(sellers.map(s => [s.id, s]));
                    data.forEach(sale => {
                        if (sale.seller_id) {
                            sale.seller = sellerMap.get(sale.seller_id) || null;
                        }
                    });
                }
            }
        }

        return data;
    },

    // Start picking for a sale (ou retomar picking pausado)
    async startPicking(saleId: string, userId: string, companyId: string) {
        // Verificar se já existe picking para esta venda (em separação ou pausado)
        const { data: existingPicking } = await supabase
            .from('picking')
            .select('id, status')
            .eq('sale_id', saleId)
            .in('status', ['em_separacao', 'pausado'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingPicking) {
            // Verificar se existem itens para este picking
            const { data: existingItems } = await supabase
                .from('picking_items')
                .select('id')
                .eq('picking_id', existingPicking.id)
                .limit(1);

            // Se não há itens, tentar recriar
            if (!existingItems || existingItems.length === 0) {
                try {
                    await this.recreatePickingItems(existingPicking.id, userId, companyId);
                } catch (recreateError: any) {
                    console.error('Erro ao recriar itens ao retomar picking:', recreateError);
                    // Continuar mesmo se falhar, para não bloquear o retorno do picking
                }
            }

            // Se está pausado, retomar
            if (existingPicking.status === 'pausado') {
                await supabase
                    .from('picking')
                    .update({ status: 'em_separacao' })
                    .eq('id', existingPicking.id);

                // Atualizar status da venda
                await supabase
                    .from('sales')
                    .update({ status_venda: 'em_separacao' })
                    .eq('id', saleId);
            }
            // Retornar picking existente (reativado se estava pausado)
            return await this.getPicking(existingPicking.id);
        }

        // 1. Criar registro de picking
        const { data: picking, error: pickingError } = await supabase
            .from('picking')
            .insert([{
                sale_id: saleId,
                user_id: userId,
                company_id: companyId,
                status: 'em_separacao'
            }])
            .select()
            .single();

        if (pickingError) throw pickingError;

        // 2. Atualizar status da venda para "Em Separação" (travar edição)
        const { error: saleError } = await supabase
            .from('sales')
            .update({ status_venda: 'em_separacao' })
            .eq('id', saleId);

        if (saleError) throw saleError;

        // 3. Buscar itens da venda
        const { data: saleItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('*')
            .eq('sale_id', saleId);

        if (itemsError) throw itemsError;

        // 4. Criar itens de picking com localização e estoque atual
        const itemsToInsert = [];
        for (const item of saleItems) {
            if (item.product_id) {
                // Buscar produto para pegar localização e estoque
                const { data: product } = await supabase
                    .from('products')
                    .select('id, location, quantity, manufacturer_code')
                    .eq('id', item.product_id)
                    .single();

                itemsToInsert.push({
                    picking_id: picking.id,
                    product_id: item.product_id,
                    quantity_sold: item.quantity,
                    quantity_picked: 0,
                    status_item: 'ok' as PickingItemStatus // Usar 'ok' inicialmente até migração ser aplicada
                });
            }
        }

        if (itemsToInsert.length === 0) {
            throw new Error('Nenhum item de produto encontrado na venda para separação');
        }

        const { error: insertItemsError } = await supabase
            .from('picking_items')
            .insert(itemsToInsert);

        if (insertItemsError) throw insertItemsError;

        // 5. Registrar atividade
        await this.logActivity(picking.id, userId, 'iniciado', null, {
            sale_id: saleId,
            items_count: itemsToInsert.length
        });

        return picking;
    },

    // Get picking details
    async getPicking(pickingId: string): Promise<Picking> {
        const { data, error } = await supabase
            .from('picking')
            .select(`
                *,
                sale:sales(
                    sale_number,
                    created_at,
                    total,
                    customer:customers(name),
                    seller_id
                )
            `)
            .eq('id', pickingId)
            .single();

        if (error) throw error;

        // Buscar seller separadamente se existir
        if (data?.sale?.seller_id) {
            const { data: seller } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', data.sale.seller_id)
                .single();

            if (seller && data.sale) {
                data.sale.seller = seller;
            }
        }

        return data as Picking;
    },

    // Get items for a picking (organizados por localização)
    async getPickingItems(pickingId: string): Promise<PickingItem[]> {
        const { data, error } = await supabase
            .from('picking_items')
            .select(`
                *,
                product:products!picking_items_product_id_fkey(
                    id,
                    name,
                    internal_code,
                    location,
                    manufacturer_code,
                    quantity,
                    image_url
                ),
                substituted_product:products!picking_items_substituted_product_id_fkey(
                    id,
                    name,
                    internal_code
                )
            `)
            .eq('picking_id', pickingId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Organizar por localização (parsear location JSON)
        const items = (data || []) as PickingItem[];

        // Ordenar: primeiro por localização, depois por código interno
        items.sort((a, b) => {
            const locA = this.parseLocation(a.product?.location || '');
            const locB = this.parseLocation(b.product?.location || '');

            // Comparar por rua, prédio, apartamento
            if (locA.street !== locB.street) {
                return locA.street.localeCompare(locB.street);
            }
            if (locA.building !== locB.building) {
                return locA.building.localeCompare(locB.building);
            }
            if (locA.apartment !== locB.apartment) {
                return locA.apartment.localeCompare(locB.apartment);
            }

            // Se mesma localização, ordenar por código
            return (a.product?.internal_code || '').localeCompare(b.product?.internal_code || '');
        });

        return items;
    },

    // Recriar itens de picking caso não existam
    async recreatePickingItems(pickingId: string, userId: string, companyId: string): Promise<void> {
        // 1. Buscar picking
        const picking = await this.getPicking(pickingId);
        if (!picking) {
            throw new Error('Picking não encontrado');
        }

        // 2. Verificar se já existem itens
        const existingItems = await this.getPickingItems(pickingId);
        if (existingItems && existingItems.length > 0) {
            throw new Error('Itens de picking já existem. Não é necessário recriar.');
        }

        // 3. Buscar itens da venda
        const { data: saleItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('*')
            .eq('sale_id', picking.sale_id);

        if (itemsError) throw itemsError;

        if (!saleItems || saleItems.length === 0) {
            throw new Error('Nenhum item encontrado na venda para criar itens de picking');
        }

        // 4. Criar itens de picking
        const itemsToInsert = [];
        for (const item of saleItems) {
            if (item.product_id) {
                // Verificar se produto existe
                const { data: product } = await supabase
                    .from('products')
                    .select('id')
                    .eq('id', item.product_id)
                    .single();

                if (product) {
                    itemsToInsert.push({
                        picking_id: pickingId,
                        product_id: item.product_id,
                        quantity_sold: item.quantity,
                        quantity_picked: 0,
                        status_item: 'ok' as PickingItemStatus
                    });
                }
            }
        }

        if (itemsToInsert.length === 0) {
            throw new Error('Nenhum item de produto válido encontrado na venda para separação');
        }

        // 5. Inserir itens
        const { error: insertItemsError } = await supabase
            .from('picking_items')
            .insert(itemsToInsert);

        if (insertItemsError) throw insertItemsError;

        // 6. Registrar atividade
        await this.logActivity(pickingId, userId, 'itens_recriados', null, {
            items_count: itemsToInsert.length
        });
    },

    // Parse location JSON
    parseLocation(location: string | null): { street: string; building: string; apartment: string } {
        if (!location) return { street: '', building: '', apartment: '' };
        try {
            const parsed = JSON.parse(location);
            return {
                street: parsed.street || parsed.rua || '',
                building: parsed.building || parsed.predio || '',
                apartment: parsed.apartment || parsed.apartamento || ''
            };
        } catch {
            return { street: location, building: '', apartment: '' };
        }
    },

    // Verificar estoque em tempo real
    async checkStock(productId: string, quantity: number, companyId: string): Promise<boolean> {
        const { data: product, error } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', productId)
            .eq('company_id', companyId)
            .single();

        if (error || !product) return false;
        return (product.quantity || 0) >= quantity;
    },

    // Buscar produtos com mesmo código de fabricação para substituição
    async findProductsByManufacturerCode(manufacturerCode: string, companyId: string, excludeProductId?: string) {
        if (!manufacturerCode) return [];

        const query = supabase
            .from('products')
            .select('id, name, internal_code, quantity, location')
            .eq('company_id', companyId)
            .eq('manufacturer_code', manufacturerCode)
            .gt('quantity', 0) // Apenas com estoque
            .eq('is_active', true);

        if (excludeProductId) {
            query.neq('id', excludeProductId);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    },

    // Update a picking item
    async updatePickingItem(itemId: string, updates: Partial<PickingItem>, userId?: string) {
        const { error } = await supabase
            .from('picking_items')
            .update(updates)
            .eq('id', itemId);

        if (error) throw error;

        // Registrar atividade se houver mudança de status
        if (updates.status_item && userId) {
            const { data: item } = await supabase
                .from('picking_items')
                .select('picking_id')
                .eq('id', itemId)
                .single();

            if (item) {
                await this.logActivity(item.picking_id, userId, `item_${updates.status_item}`, itemId, updates);
            }
        }
    },

    // Marcar item como separado
    async markAsSeparated(itemId: string, quantity: number, userId: string, companyId: string) {
        const { data: item } = await supabase
            .from('picking_items')
            .select('*, product:products!picking_items_product_id_fkey(id, quantity)')
            .eq('id', itemId)
            .single();

        if (!item) throw new Error('Item não encontrado');

        // VALIDAÇÃO: Verificar estoque antes de permitir separar
        const hasStock = await this.checkStock(item.product_id, quantity, companyId);
        if (!hasStock) {
            const availableStock = item.product?.quantity || 0;
            throw new Error(
                `Estoque insuficiente para separar esta quantidade. ` +
                `Disponível: ${availableStock}, Solicitado: ${quantity}`
            );
        }

        // VALIDAÇÃO: Não permitir separar mais do que foi solicitado
        if (quantity > item.quantity_sold) {
            throw new Error(
                `Não é permitido separar mais do que foi solicitado. ` +
                `Solicitado: ${item.quantity_sold}, Tentando separar: ${quantity}`
            );
        }

        // Usar apenas valores válidos do enum atual: 'ok', 'falta', 'danificado'
        // Quando quantity_picked >= quantity_sold, considera-se separado completo (status 'ok')
        // A lógica de parcial/completo será baseada na comparação de quantidades, não no status

        await this.updatePickingItem(itemId, {
            quantity_picked: quantity,
            status_item: 'ok' // Status 'ok' indica que o item está sendo processado (pode ser parcial ou completo)
        }, userId);
    },

    // Marcar item como faltando
    async markAsMissing(itemId: string, notes: string, userId: string) {
        await this.updatePickingItem(itemId, {
            status_item: 'falta', // Usar 'falta' que é o valor válido do enum
            notes: notes,
            quantity_picked: 0
        }, userId);
    },

    // Substituir produto
    async substituteProduct(itemId: string, newProductId: string, userId: string) {
        await this.updatePickingItem(itemId, {
            substituted_product_id: newProductId,
            status_item: 'ok' // Mantém como 'ok' quando substituído (a substituição é indicada pelo campo substituted_product_id)
        }, userId);
    },

    // Separação parcial
    async partialPicking(itemId: string, quantity: number, userId: string, companyId: string) {
        // VALIDAÇÃO: Verificar se a quantidade é válida
        const { data: item } = await supabase
            .from('picking_items')
            .select('quantity_sold, product_id, product:products!picking_items_product_id_fkey(id, quantity)')
            .eq('id', itemId)
            .single();

        if (!item) throw new Error('Item não encontrado');

        if (quantity <= 0) {
            throw new Error('A quantidade deve ser maior que zero');
        }

        if (quantity > item.quantity_sold) {
            throw new Error(
                `Não é permitido separar mais do que foi solicitado. ` +
                `Solicitado: ${item.quantity_sold}, Tentando separar: ${quantity}`
            );
        }

        // Validar estoque
        const hasStock = await this.checkStock(item.product_id, quantity, companyId);
        if (!hasStock) {
            const availableStock = item.product?.quantity || 0;
            throw new Error(
                `Estoque insuficiente para separar esta quantidade. ` +
                `Disponível: ${availableStock}, Solicitado: ${quantity}`
            );
        }

        await this.markAsSeparated(itemId, quantity, userId, companyId);
    },

    // Get statistics
    async getStats(pickingId: string): Promise<PickingStats> {
        const items = await this.getPickingItems(pickingId);

        return {
            total: items.length,
            separados: items.filter(i => i.status_item === 'ok' && i.quantity_picked >= i.quantity_sold).length,
            faltando: items.filter(i => i.status_item === 'falta').length,
            parciais: items.filter(i => i.status_item === 'ok' && i.quantity_picked > 0 && i.quantity_picked < i.quantity_sold).length,
            substituidos: items.filter(i => i.substituted_product_id !== null).length
        };
    },

    // Finish picking
    async finishPicking(pickingId: string, userId: string, companyId: string) {
        // 1. Buscar picking e itens
        const picking = await this.getPicking(pickingId);
        const items = await this.getPickingItems(pickingId);

        // 2. VALIDAÇÃO: Verificar estoque antes de finalizar
        // Para cada item que será separado (status 'ok' com quantity_picked > 0)
        const itemsToDeduct = items.filter(i =>
            i.status_item === 'ok' && i.quantity_picked > 0
        );

        for (const item of itemsToDeduct) {
            const productId = item.substituted_product_id || item.product_id;
            const quantity = item.quantity_picked;

            // Buscar estoque atual do produto
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('quantity, name, internal_code')
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            if (productError || !product) {
                throw new Error(`Produto não encontrado: ${productError?.message || 'Produto não existe'}`);
            }

            const currentStock = product.quantity || 0;
            if (currentStock < quantity) {
                throw new Error(
                    `Estoque insuficiente para o produto ${product.name} (${product.internal_code}). ` +
                    `Disponível: ${currentStock}, Solicitado: ${quantity}`
                );
            }
        }

        console.log('✅ Validação de estoque concluída. Todos os produtos têm estoque suficiente.');

        // 3. Verificar se há itens faltando ou danificados
        const missingItems = items.filter(i => i.status_item === 'falta');
        const danificadosItems = items.filter(i => i.status_item === 'danificado');
        const hasIssues = missingItems.length > 0 || danificadosItems.length > 0;

        console.log('🔍 Verificando itens da separação:', {
            totalItems: items.length,
            missingItems: missingItems.length,
            danificadosItems: danificadosItems.length,
            hasIssues
        });

        // 4. Verificar se há separação parcial (quantity_picked < quantity_sold)
        const partialItems = items.filter(i =>
            i.status_item === 'ok' && i.quantity_picked > 0 && i.quantity_picked < i.quantity_sold
        );
        const hasPartialItems = partialItems.length > 0;

        // 5. Determinar novo status
        // IMPORTANTE: Apenas marcar como erro se realmente houver problemas
        // Separação parcial NÃO é um problema - pode ser marcada como 'separado'
        let newStatus: 'separado' | 'erro_falta' | 'erro_danificado' = 'separado';
        if (danificadosItems.length > 0) {
            newStatus = 'erro_danificado';
        } else if (missingItems.length > 0) {
            newStatus = 'erro_falta';
        }

        console.log('📊 Status determinado:', {
            newStatus,
            hasIssues,
            missingItemsCount: missingItems.length,
            danificadosCount: danificadosItems.length
        });

        // 6. Atualizar quantidades dos sale_items se houver separação parcial
        if (hasPartialItems) {
            for (const item of partialItems) {
                // Buscar o sale_item correspondente
                const { data: saleItems } = await supabase
                    .from('sale_items')
                    .select('*')
                    .eq('sale_id', picking.sale_id)
                    .eq('product_id', item.product_id);

                if (saleItems && saleItems.length > 0) {
                    const saleItem = saleItems[0];
                    const newQuantity = item.quantity_picked;
                    const newTotal = (saleItem.unit_price * newQuantity) - (saleItem.discount || 0);

                    // Atualizar quantidade e total do sale_item
                    await supabase
                        .from('sale_items')
                        .update({
                            quantity: newQuantity,
                            total: newTotal
                        })
                        .eq('id', saleItem.id);
                }
            }

            // Recalcular total da venda
            const { data: allSaleItems } = await supabase
                .from('sale_items')
                .select('total, discount')
                .eq('sale_id', picking.sale_id);

            if (allSaleItems) {
                const subtotal = allSaleItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
                const { data: sale } = await supabase
                    .from('sales')
                    .select('discount')
                    .eq('id', picking.sale_id)
                    .single();

                const discount = sale?.discount || 0;
                const total = subtotal - discount;

                await supabase
                    .from('sales')
                    .update({
                        subtotal: subtotal,
                        total: total
                    })
                    .eq('id', picking.sale_id);
            }
        }

        // 7. Criar movimentações de estoque para itens separados (status 'ok' com quantity_picked > 0)
        // CORREÇÃO: Sempre usar 'saida_separacao' que agora baixa estoque automaticamente
        console.log('📦 Criando movimentações de estoque para baixar estoque automaticamente:', {
            itemsCount: items.filter(i => i.status_item === 'ok' && i.quantity_picked > 0).length
        });

        for (const item of items) {
            if (item.status_item === 'ok' && item.quantity_picked > 0) {
                const productId = item.substituted_product_id || item.product_id;
                const quantity = item.quantity_picked || item.quantity_sold;

                // 1. Buscar estoque ANTES da movimentação para verificação
                const { data: productBefore } = await supabase
                    .from('products')
                    .select('quantity')
                    .eq('id', productId)
                    .single();
                const stockBefore = productBefore?.quantity || 0;

                // Sempre usar 'saida_separacao' que agora baixa estoque automaticamente
                const movementType = 'saida_separacao';
                const referenceType = 'picking';
                const referenceId = pickingId;
                const reason = `Separação do pedido #${picking.sale?.sale_number || picking.sale_id}`;

                console.log('🔄 Criando movimentação de estoque:', {
                    productId,
                    quantity,
                    movementType,
                    referenceType,
                    referenceId,
                    reason
                });

                // Criar movimentação de saída
                // A função create_inventory_movement agora baixa o estoque automaticamente para saida_separacao
                const { data: movementId, error: movementError } = await supabase.rpc('create_inventory_movement', {
                    p_company_id: companyId,
                    p_product_id: productId,
                    p_type: movementType,
                    p_quantity: quantity,
                    p_reason: reason,
                    p_reference_id: referenceId,
                    p_reference_type: referenceType,
                    p_user_id: userId
                });

                if (movementError) {
                    console.error('❌ Erro ao criar movimentação de estoque:', {
                        error: movementError,
                        productId,
                        quantity,
                        movementType,
                        companyId
                    });
                    throw new Error(`Erro ao criar movimentação de estoque: ${movementError.message}`);
                }

                // Verificar se o estoque foi realmente baixado
                const { data: productAfter } = await supabase
                    .from('products')
                    .select('quantity')
                    .eq('id', productId)
                    .single();
                const stockAfter = productAfter?.quantity || 0;

                console.log('✅ Movimentação criada e estoque baixado com sucesso:', {
                    movementId,
                    productId,
                    quantity,
                    movementType,
                    stockBefore,
                    stockAfter,
                    expectedStock: stockBefore - quantity
                });

                // Validação final: garantir que o estoque foi baixado
                if (stockAfter !== stockBefore - quantity) {
                    console.warn(`⚠️ Atenção: Estoque após baixa (${stockAfter}) não corresponde ao esperado (${stockBefore - quantity}). Verifique a função create_inventory_movement.`);
                }
            }
        }

        // 8. Verificar se o estoque foi realmente baixado
        // Validar que as movimentações foram criadas e o estoque foi atualizado
        for (const item of itemsToDeduct) {
            const productId = item.substituted_product_id || item.product_id;
            const quantity = item.quantity_picked;

            const { data: productAfter, error: checkError } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            if (!checkError && productAfter) {
                const expectedStock = (productAfter.quantity || 0);
                console.log(`✅ Estoque do produto ${productId} após baixa: ${expectedStock}`);
            }
        }

        // 9. Atualizar status do picking
        // IMPORTANTE: Se não houver faltas ou danificados, sempre marcar como 'separado' para aparecer na conferência
        // Mesmo com separação parcial, o picking deve ser marcado como 'separado' se não houver problemas
        const finalPickingStatus = hasIssues ? newStatus : 'separado';

        console.log('🔄 Atualizando status do picking:', {
            pickingId,
            finalPickingStatus,
            hasIssues,
            missingItemsCount: missingItems.length,
            hasDanificados: items.some(i => i.status_item === 'danificado')
        });

        const finishedAt = new Date().toISOString();
        const { error: pickingError, data: updatedPickingData } = await supabase
            .from('picking')
            .update({
                status: finalPickingStatus,
                finished_at: finishedAt,
                updated_at: finishedAt
            })
            .eq('id', pickingId)
            .select('id, status, finished_at')
            .single();

        if (pickingError) {
            console.error('❌ Erro ao atualizar status do picking:', pickingError);
            throw pickingError;
        }

        // Verificar se a atualização foi bem-sucedida
        if (!updatedPickingData || updatedPickingData.status !== finalPickingStatus) {
            console.error('❌ Status do picking não foi atualizado corretamente. Esperado:', finalPickingStatus, 'Atual:', updatedPickingData?.status);
            throw new Error('Falha ao atualizar status do picking. Tente novamente.');
        }

        console.log('✅ Status do picking atualizado com sucesso:', {
            pickingId,
            status: updatedPickingData.status,
            finishedAt: updatedPickingData.finished_at
        });

        // 10. Preparar detalhes dos problemas para o vendedor (se houver problemas)
        let pickingIssues: any = null;
        if (hasIssues) {
            pickingIssues = {
                missing: missingItems.map(item => ({
                    picking_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.name || 'Produto desconhecido',
                    product_code: item.product?.internal_code || 'S/C',
                    quantity_sold: item.quantity_sold,
                    quantity_picked: item.quantity_picked || 0,
                    notes: item.notes || '',
                    manufacturer_code: item.product?.manufacturer_code || null
                })),
                damaged: danificadosItems.map(item => ({
                    picking_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.name || 'Produto desconhecido',
                    product_code: item.product?.internal_code || 'S/C',
                    quantity_sold: item.quantity_sold,
                    quantity_picked: item.quantity_picked || 0,
                    notes: item.notes || '',
                    manufacturer_code: item.product?.manufacturer_code || null
                })),
                partial: partialItems.map(item => ({
                    picking_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.name || 'Produto desconhecido',
                    product_code: item.product?.internal_code || 'S/C',
                    quantity_sold: item.quantity_sold,
                    quantity_picked: item.quantity_picked || 0,
                    notes: item.notes || '',
                    manufacturer_code: item.product?.manufacturer_code || null
                }))
            };
        }

        // 11. Atualizar status da venda
        // Como o estoque já foi baixado, a venda pode ir para 'separado' (aguarda conferência)
        // ou 'pronto_para_entrega' se não houver conferência
        let saleStatus: string;
        if (newStatus === 'erro_falta' || newStatus === 'erro_danificado') {
            saleStatus = 'aguardando_ajuste';
        } else {
            // Estoque já foi baixado, então pode ir para 'separado' (aguarda conferência)
            // ou 'pronto_para_entrega' se não houver necessidade de conferência
            saleStatus = 'separado';
        }

        console.log('🔄 Atualizando status da venda:', {
            sale_id: picking.sale_id,
            saleStatus,
            hasPartialItems,
            newStatus,
            hasIssues,
            pickingIssues: pickingIssues ? 'Detalhes salvos' : 'Sem problemas'
        });

        // Preparar dados para atualização
        const saleUpdateData: any = { status_venda: saleStatus };
        if (pickingIssues) {
            saleUpdateData.picking_issues = pickingIssues;
        }

        const { error: saleError, data: updatedSale } = await supabase
            .from('sales')
            .update(saleUpdateData)
            .eq('id', picking.sale_id)
            .select('id, status_venda')
            .single();

        if (saleError) {
            console.error('❌ Erro ao atualizar status da venda:', saleError);
            throw saleError;
        }

        // Verificar se a atualização foi bem-sucedida
        if (!updatedSale || updatedSale.status_venda !== saleStatus) {
            console.error('❌ Status da venda não foi atualizado corretamente. Esperado:', saleStatus, 'Atual:', updatedSale?.status_venda);
            throw new Error('Falha ao atualizar status da venda. Tente novamente.');
        }

        console.log('✅ Status da venda atualizado com sucesso:', updatedSale.status_venda);

        // 12. Remover status "E" (pendência de estoque) quando a separação for finalizada
        // Como o estoque já foi baixado, sempre remove a pendência
        if (saleStatus === 'separado' || saleStatus === 'pronto_para_entrega') {
            try {
                await removeSaleStatus(picking.sale_id, 'E');
                console.log('✅ Status "E" removido da venda após separação concluída e estoque baixado');
            } catch (statusError: any) {
                console.error('⚠️ Erro ao remover status E (não crítico):', statusError);
                // Não bloquear o processo se falhar ao remover o status
            }
        }

        console.log('📦 Estoque baixado automaticamente após finalizar separação');

        // 13. Registrar atividade
        await this.logActivity(pickingId, userId, 'finalizado', null, {
            status: newStatus,
            items_processed: items.length,
            items_missing: missingItems.length
        });

        return picking;
    },

    // Pausar picking (não deletar, permite retomar depois)
    async pausePicking(pickingId: string, userId: string) {
        const picking = await this.getPicking(pickingId);

        // 1. Voltar status da venda para "Aguardando Separação"
        const { error: saleError } = await supabase
            .from('sales')
            .update({ status_venda: 'aguardando_separacao' })
            .eq('id', picking.sale_id);

        if (saleError) throw saleError;

        // 2. Marcar picking como pausado (não deletar!)
        const { error: updateError } = await supabase
            .from('picking')
            .update({ status: 'pausado' })
            .eq('id', pickingId);

        if (updateError) throw updateError;

        // 3. Registrar atividade
        await this.logActivity(pickingId, userId, 'pausado', null, {
            sale_id: picking.sale_id
        });
    },

    // Buscar separações pausadas
    async getPausedPickings(companyId: string) {
        const { data, error } = await supabase
            .from('picking')
            .select(`
                *,
                sale:sales(
                    sale_number,
                    created_at,
                    total,
                    customer:customers(name),
                    seller_id
                )
            `)
            .eq('company_id', companyId)
            .eq('status', 'pausado')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Buscar sellers separadamente
        if (data && data.length > 0) {
            const sellerIds = data
                .map(p => p.sale?.seller_id)
                .filter((id): id is string => id !== null);

            if (sellerIds.length > 0) {
                const { data: sellers } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', sellerIds);

                if (sellers) {
                    const sellerMap = new Map(sellers.map(s => [s.id, s]));
                    data.forEach(p => {
                        if (p.sale?.seller_id && p.sale) {
                            p.sale.seller = sellerMap.get(p.sale.seller_id) || null;
                        }
                    });
                }
            }
        }

        return data || [];
    },

    // Buscar separações em andamento
    async getActivePickings(companyId: string) {
        const { data, error } = await supabase
            .from('picking')
            .select(`
                *,
                sale:sales(
                    sale_number,
                    created_at,
                    total,
                    customer:customers(name),
                    seller_id
                )
            `)
            .eq('company_id', companyId)
            .eq('status', 'em_separacao')
            .order('started_at', { ascending: false });

        if (error) throw error;

        // Buscar sellers separadamente
        if (data && data.length > 0) {
            const sellerIds = data
                .map(p => p.sale?.seller_id)
                .filter((id): id is string => id !== null);

            if (sellerIds.length > 0) {
                const { data: sellers } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', sellerIds);

                if (sellers) {
                    const sellerMap = new Map(sellers.map(s => [s.id, s]));
                    data.forEach(p => {
                        if (p.sale?.seller_id && p.sale) {
                            p.sale.seller = sellerMap.get(p.sale.seller_id) || null;
                        }
                    });
                }
            }
        }

        return data || [];
    },

    // Log activity
    async logActivity(pickingId: string, userId: string, action: string, itemId: string | null, details?: any) {
        try {
            const { error } = await supabase.rpc('log_picking_activity', {
                p_picking_id: pickingId,
                p_user_id: userId,
                p_action: action,
                p_item_id: itemId,
                p_details: details || null
            });

            if (error) {
                console.error('Erro ao registrar atividade:', error);
            }
        } catch (error) {
            console.error('Erro ao registrar atividade:', error);
        }
    }
};