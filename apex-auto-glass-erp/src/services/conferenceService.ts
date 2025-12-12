import { supabase } from '@/integrations/supabase/client';

export interface Conference {
    id: string;
    picking_id: string;
    status: 'pendente' | 'conferido' | 'reprovado';
    checker_id: string;
    notes?: string;
    picking?: {
        sale_id: string;
        sale?: {
            sale_number: number;
            customer?: { name: string };
        };
    };
}

export const conferenceService = {
    // List pickings ready for conference
    async getPickingsReadyForConference(companyId: string) {
        // Fetch pickings that are 'separado' and do NOT have a completed conference yet
        // Buscar todos os pickings com status 'separado' (finalizados com sucesso)
        console.log('🔍 Buscando pickings para conferência, companyId:', companyId);
        
        // Buscar pickings com status 'separado'
        // IMPORTANTE: Ordenar por finished_at, mas permitir null (usando nulls last)
        const { data: allPickings, error: pickingsError } = await supabase
            .from('picking')
            .select(`
        *,
        sale:sales(
          sale_number,
          customer:customers(name),
          seller_id
        )
      `)
            .eq('company_id', companyId)
            .eq('status', 'separado')
            .order('finished_at', { ascending: true, nullsFirst: false });

        if (pickingsError) {
            console.error('❌ Erro ao buscar pickings para conferência:', pickingsError);
            throw pickingsError;
        }

        console.log(`📦 Total de pickings com status 'separado': ${allPickings?.length || 0}`);

        // Buscar todas as conferências já aprovadas (conferido)
        // IMPORTANTE: Buscar todas as conferências da empresa, não apenas as aprovadas
        // Para evitar que pickings com conferências pendentes ou reprovadas sejam mostrados
        const { data: approvedConferences, error: conferencesError } = await supabase
            .from('conference')
            .select('picking_id, status')
            .eq('company_id', companyId)
            .eq('status', 'conferido');

        if (conferencesError) {
            console.error('❌ Erro ao buscar conferências aprovadas:', conferencesError);
            throw conferencesError;
        }

        // Criar um Set com os IDs dos pickings já conferidos
        const conferidosIds = new Set((approvedConferences || []).map(c => c.picking_id));
        console.log(`✅ Conferências aprovadas encontradas: ${conferidosIds.size}`, {
            companyId,
            conferencias: approvedConferences?.map(c => ({ picking_id: c.picking_id, status: c.status }))
        });

        // Filtrar pickings que ainda não foram conferidos
        // IMPORTANTE: Garantir que apenas pickings com status 'separado' sejam incluídos
        // Excluir pickings que já têm conferência aprovada (conferido)
        const data = (allPickings || [])
            .filter(picking => {
                const notConferido = !conferidosIds.has(picking.id);
                const isSeparado = picking.status === 'separado';
                
                if (!isSeparado) {
                    console.warn(`⚠️ Picking ${picking.id} (venda #${picking.sale?.sale_number}) não está com status 'separado':`, picking.status);
                }
                
                if (conferidosIds.has(picking.id)) {
                    console.log(`ℹ️ Picking ${picking.id} (venda #${picking.sale?.sale_number}) já foi conferido`);
                }
                
                return notConferido && isSeparado;
            });
        
        console.log(`📋 Conferência: Encontrados ${data.length} picking(s) aguardando conferência de ${allPickings?.length || 0} total separado(s)`);
        
        // Log detalhado para debug
        if (allPickings && allPickings.length > 0) {
            console.log('📋 Detalhes dos pickings separados:', allPickings.map(p => ({
                id: p.id,
                sale_number: p.sale?.sale_number,
                status: p.status,
                finished_at: p.finished_at,
                company_id: p.company_id,
                ja_conferido: conferidosIds.has(p.id)
            })));
        } else {
            console.warn(`⚠️ Nenhum picking com status "separado" encontrado para a empresa: ${companyId}`);
        }

        // Buscar sellers separadamente
        if (data && data.length > 0) {
            const sellerIds = data
                .map(picking => picking.sale?.seller_id)
                .filter((id): id is string => id !== null && id !== undefined);

            if (sellerIds.length > 0) {
                const { data: sellers } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', sellerIds);

                if (sellers) {
                    const sellerMap = new Map(sellers.map(s => [s.id, s]));
                    data.forEach(picking => {
                        if (picking.sale?.seller_id) {
                            picking.sale.seller = sellerMap.get(picking.sale.seller_id) || null;
                        }
                    });
                }
            }
        }

        return data;
    },

    // Start conference (or just get details if already started)
    async startConference(pickingId: string, userId: string, companyId: string) {
        // Check if exists
        const { data: existing } = await supabase
            .from('conference')
            .select('*')
            .eq('picking_id', pickingId)
            .single();

        if (existing) return existing;

        // Create new
        const { data, error } = await supabase
            .from('conference')
            .insert([{
                picking_id: pickingId,
                checker_id: userId,
                company_id: companyId,
                status: 'pendente'
            }])
            .select()
            .single();

        if (error) throw error;

        // Update sale status to 'conferencia_pendente'
        // First get sale_id from picking
        const { data: picking } = await supabase.from('picking').select('sale_id').eq('id', pickingId).single();
        if (picking) {
            await supabase.from('sales').update({ status_venda: 'conferencia_pendente' }).eq('id', picking.sale_id);
        }

        return data;
    },

    // Approve conference
    async approveConference(conferenceId: string, pickingId: string) {
        // 1. Update conference status
        const { error: confError } = await supabase
            .from('conference')
            .update({ status: 'conferido' })
            .eq('id', conferenceId);

        if (confError) throw confError;

        // 2. Get picking items to deduct stock
        const { data: items, error: itemsError } = await supabase
            .from('picking_items')
            .select('*')
            .eq('picking_id', pickingId);

        if (itemsError) throw itemsError;

        // 3. Get sale info for history
        const { data: picking } = await supabase
            .from('picking')
            .select('sale_id, company_id, user_id')
            .eq('id', pickingId)
            .single();

        if (!picking) throw new Error('Picking not found');

        // 4. Deduct stock and create movements
        for (const item of items) {
            if (item.status_item === 'ok' && item.quantity_picked > 0) {
                // Usar produto substituído se houver, senão usar o original
                const productId = item.substituted_product_id || item.product_id;
                const quantity = item.quantity_picked || item.quantity_sold;
                
                // Create movement (a função RPC já atualiza o estoque automaticamente)
                await supabase.rpc('create_inventory_movement', {
                    p_company_id: picking.company_id,
                    p_product_id: productId,
                    p_type: 'saida_venda',
                    p_quantity: quantity,
                    p_reason: 'Venda - Conferência Aprovada',
                    p_reference_id: picking.sale_id,
                    p_reference_type: 'sale',
                    p_user_id: picking.user_id
                });
            }
        }

        // 5. Update sale status
        await supabase
            .from('sales')
            .update({ status_venda: 'pronto_para_entrega' })
            .eq('id', picking.sale_id);
    },

    // Reject conference (send back to picking)
    async rejectConference(conferenceId: string, pickingId: string, notes: string) {
        // Update conference status
        await supabase
            .from('conference')
            .update({ status: 'reprovado', notes })
            .eq('id', conferenceId);

        // Update picking status back to 'em_separacao'
        await supabase
            .from('picking')
            .update({ status: 'em_separacao' })
            .eq('id', pickingId);

        // Update sale status back to 'em_separacao'
        const { data: picking } = await supabase.from('picking').select('sale_id').eq('id', pickingId).single();
        if (picking) {
            await supabase.from('sales').update({ status_venda: 'em_separacao' }).eq('id', picking.sale_id);
        }
    }
};
