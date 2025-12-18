import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiscalNoteForm } from "@/components/fiscal/FiscalNoteForm";
import { supabase } from "@/integrations/supabase/client";
import { FiscalNote } from "@/types/fiscal";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function FiscalNoteEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { company } = useAuth();
    const [note, setNote] = useState<FiscalNote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Validar ID antes de carregar
        if (!id || id === 'undefined' || id === 'null' || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.error('❌ [FiscalNoteEdit] ID inválido na rota:', id);
            toast({ 
                title: 'Erro', 
                description: 'ID da nota fiscal inválido. Redirecionando...', 
                variant: 'destructive' 
            });
            navigate('/fiscal/saida');
            return;
        }
        
        if (id) {
            console.log('✅ [FiscalNoteEdit] Carregando nota com ID:', id);
            loadNote(id);
        }
    }, [id, navigate]);

    const loadNote = async (noteId: string) => {
        try {
            if (!company?.id) {
                console.error('❌ [FiscalNoteEdit] company.id não disponível');
                toast({ 
                    title: 'Erro', 
                    description: 'Empresa não selecionada. Selecione uma empresa antes de editar.', 
                    variant: 'destructive' 
                });
                navigate('/fiscal/saida');
                return;
            }

            // Fetch Header
            const { data: header, error: headerError } = await supabase
                .from('invoice_headers' as any)
                .select('*')
                .eq('id', noteId)
                .eq('company_id', company.id)
                .single();

            if (headerError) {
                console.error('❌ [FiscalNoteEdit] Erro ao buscar nota:', headerError);
                if (headerError.code === 'PGRST116') {
                    toast({ 
                        title: 'Nota não encontrada', 
                        description: 'A nota fiscal não foi encontrada ou você não tem permissão para acessá-la.', 
                        variant: 'destructive' 
                    });
                    navigate('/fiscal/saida');
                    return;
                }
                throw headerError;
            }
            
            if (!header) {
                console.error('❌ [FiscalNoteEdit] Nota não encontrada');
                toast({ 
                    title: 'Nota não encontrada', 
                    description: 'A nota fiscal não foi encontrada.', 
                    variant: 'destructive' 
                });
                navigate('/fiscal/saida');
                return;
            }

            // Fetch Items
            const { data: items, error: itemsError } = await supabase
                .from('invoice_items' as any)
                .select('*')
                .eq('invoice_id', noteId)
                .order('sequence');

            if (itemsError) throw itemsError;

            // Fetch Taxes for items
            const itemIds = (items as any[]).map(i => i.id);
            const { data: taxes, error: taxesError } = await supabase
                .from('invoice_item_taxes' as any)
                .select('*')
                .in('invoice_item_id', itemIds);

            if (taxesError) throw taxesError;

            // Join Taxes to Items
            const itemsWithTaxes = items.map(item => {
                const itemTax = (taxes as any[]).find((t: any) => t.invoice_item_id === item.id);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { invoice_item_id, id, created_at, updated_at, ...taxData } = (itemTax || {}) as any;
                return {
                    ...item,
                    taxes: itemTax ? taxData : undefined
                };
            });

            // Fetch Installments
            const { data: installments, error: instError } = await supabase
                .from('invoice_installments' as any)
                .select('*')
                .eq('invoice_id', noteId)
                .order('numero');

            if (instError) throw instError;

            setNote({
                ...header,
                items: itemsWithTaxes as any,
                installments: installments as any
            });

        } catch (error: any) {
            console.error('❌ [FiscalNoteEdit] Erro ao carregar nota:', error);
            toast({ 
                title: "Erro", 
                description: `Erro ao carregar nota: ${error.message || 'Erro desconhecido'}`, 
                variant: "destructive" 
            });
            navigate('/fiscal/saida');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (data: FiscalNote) => {
        if (!id || !company?.id) {
            console.error('❌ [FiscalNoteEdit] ID ou company.id inválido para atualização');
            toast({ 
                title: 'Erro', 
                description: 'Dados inválidos para atualização.', 
                variant: 'destructive' 
            });
            return;
        }

        try {
            // 1. Update Header
            const { error: headerError } = await supabase
                .from('invoice_headers' as any)
                .update({
                    serie: data.serie,
                    numero_nota: data.numero_nota,
                    total_nota: data.total_nota,
                    data_emissao: data.data_emissao,
                    data_saida: data.data_saida,
                    data_entrada: data.data_entrada,
                    natureza_operacao: data.natureza_operacao,
                    finalidade: data.finalidade,
                    mensagens_observacoes: data.mensagens_observacoes,
                    // ... outros campos conforme necessário
                })
                .eq('id', id)
                .eq('company_id', company.id);

            if (headerError) {
                console.error('❌ [FiscalNoteEdit] Erro ao atualizar cabeçalho:', headerError);
                throw headerError;
            }

        // For items, full re-creation is easiest for prototype, but let's just warn it's not fully implemented for items yet in this snippet
        // or implement the delete-insert strategy.

            // Strategy: Delete all items and re-insert.
            const { error: deleteError } = await supabase
                .from('invoice_items' as any)
                .delete()
                .eq('invoice_id', id);

            if (deleteError) {
                console.error('❌ [FiscalNoteEdit] Erro ao deletar itens:', deleteError);
                throw deleteError;
            }

            // Re-insert items (same logic as Create)
            if (data.items && data.items.length > 0) {
                const itemsToInsert = data.items.map((item, index) => ({
                    invoice_id: id,
                    sequence: index + 1,
                    product_id: (item as any).product_id || null,
                    codigo_item: item.codigo_item,
                    nome_item: item.nome_item,
                    unidade: item.unidade,
                    ncm: item.ncm,
                    cfop: item.cfop,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    valor_total: item.valor_total,
                    aliquota_icms: item.aliquota_icms,
                    aliquota_ipi: item.aliquota_ipi,
                    percentual_desconto: item.percentual_desconto
                }));

                const { error: itemsError } = await supabase
                    .from('invoice_items' as any)
                    .insert(itemsToInsert);

                if (itemsError) {
                    console.error('❌ [FiscalNoteEdit] Erro ao inserir itens:', itemsError);
                    throw itemsError;
                }
            }

            toast({ 
                title: "Sucesso", 
                description: "Nota fiscal atualizada com sucesso!" 
            });
            
            navigate('/fiscal/saida');
        } catch (error: any) {
            console.error('❌ [FiscalNoteEdit] Erro ao atualizar nota:', error);
            toast({ 
                title: "Erro", 
                description: `Erro ao atualizar nota: ${error.message || 'Erro desconhecido'}`, 
                variant: "destructive" 
            });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!note) return <div>Nota não encontrada</div>;

    return <FiscalNoteForm initialData={note} onSave={handleUpdate} />;
}
