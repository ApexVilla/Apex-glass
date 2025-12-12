import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiscalNoteForm } from "@/components/fiscal/FiscalNoteForm";
import { supabase } from "@/integrations/supabase/client";
import { FiscalNote } from "@/types/fiscal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BudgetSelectionModal } from "@/components/fiscal/BudgetSelectionModal";
import { PageHeader } from "@/components/common/PageHeader";
import { FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function FiscalNoteCreate() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'entry' | 'exit' | null>(null);
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [initialData, setInitialData] = useState<Partial<FiscalNote>>({});
    const { profile } = useAuth();


    const handleSave = async (data: FiscalNote) => {
        try {
            // 1. Insert Header
            const { data: headerData, error: headerError } = await supabase
                .from('invoice_headers' as any)
                .insert([{
                    company_id: profile?.company_id || null,
                    establishment_id: data.establishment_id,
                    supplier_id: data.supplier_id,
                    customer_id: data.customer_id,
                    serie: data.serie,
                    subserie: data.subserie,
                    modelo_documento: data.modelo_documento,
                    numero_nota: data.numero_nota,
                    data_emissao: data.data_emissao,
                    data_saida: data.data_saida || null,
                    hora_saida: data.hora_saida || null,
                    data_entrada: data.data_entrada || null,
                    tipo: data.tipo,
                    transportador_id: data.transportador_id === 'none' ? null : data.transportador_id,
                    finalidade: data.finalidade,
                    mensagens_observacoes: data.mensagens_observacoes,

                    // Checkboxes
                    incide_despesas_base_ipi: data.incide_despesas_base_ipi,
                    incide_despesas_base_icms: data.incide_despesas_base_icms,
                    atualiza_custo_compra: data.atualiza_custo_compra,
                    atualiza_custo_reposicao: data.atualiza_custo_reposicao,
                    confirmado: data.confirmado,
                    ipi_compoe_base_icms: data.ipi_compoe_base_icms,
                    compra_orgao_publico: data.compra_orgao_publico,

                    // Values
                    total_nota: data.total_nota,
                    frete: data.frete,
                    seguro: data.seguro,
                    outras_despesas: data.outras_despesas,
                    acrescimo_financeiro: data.acrescimo_financeiro,
                    desconto_corporativo: data.desconto_corporativo,

                    // Non-composition
                    percentual_frete: data.percentual_frete,
                    valor_frete: data.valor_frete,
                    percentual_seguro: data.percentual_seguro,
                    valor_seguro: data.valor_seguro,
                    icms_integral: data.icms_integral,
                    acrescimo_financeiro_st: data.acrescimo_financeiro_st,
                    valor_suframa: data.valor_suframa,

                    status: 'rascunho'
                }])
                .select()
                .single();

            if (headerError) throw headerError;
            const invoiceId = (headerData as any).id;

            // 2. Insert Items
            if (data.items && data.items.length > 0) {
                const itemsToInsert = data.items.map((item, index) => ({
                    invoice_id: invoiceId,
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

                const { data: insertedItems, error: itemsError } = await supabase
                    .from('invoice_items' as any)
                    .insert(itemsToInsert)
                    .select();

                if (itemsError) throw itemsError;

                // 3. Insert Item Taxes (if any)
                const taxesToInsert = [];
                for (let i = 0; i < insertedItems.length; i++) {
                    const originalItem = data.items[i];
                    const insertedItem = insertedItems[i];

                    if (originalItem.taxes) {
                        taxesToInsert.push({
                            invoice_item_id: (insertedItem as any).id,
                            ...originalItem.taxes
                        });
                    }
                }

                if (taxesToInsert.length > 0) {
                    const { error: taxesError } = await supabase
                        .from('invoice_item_taxes' as any)
                        .insert(taxesToInsert);
                    if (taxesError) throw taxesError;
                }

                // Stock Update (If confirmed)
                if (data.confirmado) {
                    for (let i = 0; i < data.items.length; i++) {
                        const item = data.items[i];
                        const insertedItem = insertedItems[i];
                        
                        // Use product_id from item if available, otherwise try to find by codigo_item
                        let productId = (item as any).product_id;
                        
                        if (!productId && item.codigo_item) {
                            // Fallback: find product by internal_code
                            let query = supabase
                                .from('products')
                                .select('id, quantity')
                                .eq('internal_code', item.codigo_item);

                            if (profile?.company_id) {
                                query = query.eq('company_id', profile.company_id);
                            }

                            const { data: product } = await query.single();
                            productId = product?.id;
                        }

                        if (productId) {
                            // Get current product quantity
                            const { data: product } = await supabase
                                .from('products')
                                .select('quantity')
                                .eq('id', productId)
                                .single();

                            if (product) {
                                // Update Product Quantity
                                // Entry = Increase Stock
                                // Exit = Decrease Stock
                                const quantityChange = data.tipo === 'entrada' ? item.quantidade : -item.quantidade;
                                const newQuantity = (product.quantity || 0) + quantityChange;

                                await supabase
                                    .from('products')
                                    .update({ quantity: newQuantity })
                                    .eq('id', productId);

                                // Create Movement Log
                                await supabase
                                    .from('inventory_movements')
                                    .insert([{
                                        company_id: profile?.company_id || null,
                                        product_id: productId,
                                        type: data.tipo === 'entrada' ? 'in' : 'out',
                                        quantity: item.quantidade,
                                        reason: `Nota Fiscal ${data.numero_nota} - ${data.tipo}`,
                                        reference_id: invoiceId,
                                        user_id: profile?.id || null
                                    }]);
                            }
                        }
                    }
                }
            }

            // 4. Insert Installments
            if (data.installments && data.installments.length > 0) {
                const installmentsToInsert = data.installments.map(inst => ({
                    invoice_id: invoiceId,
                    numero: inst.numero,
                    valor: inst.valor,
                    vencimento: inst.vencimento,
                    portador: inst.portador,
                    status: 'pending'
                }));

                const { error: instError } = await supabase
                    .from('invoice_installments' as any)
                    .insert(installmentsToInsert);

                if (instError) throw instError;
            }

            toast({
                title: "Sucesso",
                description: "Nota fiscal criada com sucesso!",
            });

        } catch (error: any) {
            console.error('Error saving fiscal note:', error);
            toast({
                title: "Erro",
                description: "Erro ao salvar nota fiscal: " + error.message,
                variant: "destructive"
            });
        }
    };

    const handleManualEntry = (tipo: 'entry' | 'exit') => {
        setInitialData({
            tipo,
            data_emissao: new Date().toISOString().split('T')[0],
            data_entrada: tipo === 'entry' ? new Date().toISOString().split('T')[0] : undefined,
            data_saida: tipo === 'exit' ? new Date().toISOString().split('T')[0] : undefined,
            items: [],
            installments: [],
            total_nota: 0,
        });
        setMode(tipo);
    };

    const handleBudgetSelectForExit = async (sale: any) => {
        // Map Sale to Fiscal Note (Saída)
        const items = sale.items?.map((item: any) => {
            const total = (item.unit_price || 0) * (item.quantity || 0);

            // Tax Logic para Saída
            const cfop = '5.102'; // Venda de mercadoria (intra-estado)

            // Taxas padrão para saída
            const icmsRate = 17;
            const pisRate = 1.65;
            const cofinsRate = 7.6;

            const taxes = {
                base_calculo_icms: total,
                aliquota_icms: icmsRate,
                valor_icms: total * (icmsRate / 100),
                base_pis: total,
                aliquota_pis: pisRate,
                valor_pis: total * (pisRate / 100),
                base_cofins: total,
                aliquota_cofins: cofinsRate,
                valor_cofins: total * (cofinsRate / 100),
                base_ipi: 0,
                aliquota_ipi: 0,
                valor_ipi: 0,
                aliquota_iss: 0,
                base_calculo_iss: 0,
                valor_iss: 0,
                valor_isento_iss: 0,
                valor_outras_iss: 0,
                valor_nao_tributada_iss: 0,
                base_calculo_iss_subst: 0,
                valor_iss_subst: 0,
                base_icms_st_retido: 0,
                valor_icms_st_retido: 0,
                valor_icms_retido: 0
            };

            return {
                codigo_item: item.product?.internal_code || '000',
                nome_item: item.product?.name || 'Item',
                unidade: 'UN',
                ncm: item.product?.ncm || '00000000',
                cfop: cfop,
                quantidade: item.quantity,
                preco_unitario: item.unit_price,
                valor_total: total,
                percentual_desconto: 0,
                valor_desconto: item.discount || 0,
                taxes: taxes,
                aliquota_icms: icmsRate,
                aliquota_ipi: 0,
                percentual_margem: 0,
                custo_compra: 0,
                custo_reposicao: 0,
                custo_medio: 0,
                custo_personalizado: 0
            };
        }) || [];

        const noteData: Partial<FiscalNote> = {
            tipo: 'saida',
            customer_id: sale.customer_id,
            data_emissao: new Date().toISOString().split('T')[0],
            data_saida: new Date().toISOString().split('T')[0],
            natureza_operacao: 'Venda de Mercadorias',
            finalidade: 'normal',
            items: items,
            total_nota: sale.total || 0,
        };

        setInitialData(noteData);
        setBudgetModalOpen(false);
        setMode('exit');
    };

    const handleGenerateMultipleInvoices = async (sales: any[]) => {
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const sale of sales) {
                try {
                    // Mapear itens do orçamento para itens da nota fiscal
                    const items = sale.items?.map((item: any) => {
                        const total = (item.unit_price || 0) * (item.quantity || 0);
                        const cfop = '5.102'; // Venda de mercadoria (intra-estado)
                        const icmsRate = 17;
                        const pisRate = 1.65;
                        const cofinsRate = 7.6;

                        const taxes = {
                            base_calculo_icms: total,
                            aliquota_icms: icmsRate,
                            valor_icms: total * (icmsRate / 100),
                            base_pis: total,
                            aliquota_pis: pisRate,
                            valor_pis: total * (pisRate / 100),
                            base_cofins: total,
                            aliquota_cofins: cofinsRate,
                            valor_cofins: total * (cofinsRate / 100),
                            base_ipi: 0,
                            aliquota_ipi: 0,
                            valor_ipi: 0,
                            aliquota_iss: 0,
                            base_calculo_iss: 0,
                            valor_iss: 0,
                            valor_isento_iss: 0,
                            valor_outras_iss: 0,
                            valor_nao_tributada_iss: 0,
                            base_calculo_iss_subst: 0,
                            valor_iss_subst: 0,
                            base_icms_st_retido: 0,
                            valor_icms_st_retido: 0,
                            valor_icms_retido: 0
                        };

                        return {
                            codigo_item: item.product?.internal_code || '000',
                            nome_item: item.product?.name || 'Item',
                            unidade: 'UN',
                            ncm: item.product?.ncm || '00000000',
                            cfop: cfop,
                            quantidade: item.quantity,
                            preco_unitario: item.unit_price,
                            valor_total: total,
                            percentual_desconto: 0,
                            valor_desconto: item.discount || 0,
                            taxes: taxes,
                            aliquota_icms: icmsRate,
                            aliquota_ipi: 0,
                            percentual_margem: 0,
                            custo_compra: 0,
                            custo_reposicao: 0,
                            custo_medio: 0,
                            custo_personalizado: 0
                        };
                    }) || [];

                    // Obter próximo número de nota (simplificado - você pode melhorar isso)
                    const { data: lastNote } = await supabase
                        .from('invoice_headers' as any)
                        .select('numero_nota')
                        .order('numero_nota', { ascending: false })
                        .limit(1)
                        .single();

                    const nextNumber = lastNote?.numero_nota ? lastNote.numero_nota + 1 : 1;

                    // Criar nota fiscal
                    const noteData: Partial<FiscalNote> = {
                        tipo: 'saida',
                        customer_id: sale.customer_id,
                        establishment_id: profile?.company_id || '', // Você pode ajustar isso
                        data_emissao: new Date().toISOString().split('T')[0],
                        data_saida: new Date().toISOString().split('T')[0],
                        natureza_operacao: 'Venda de Mercadorias',
                        finalidade: 'normal',
                        serie: '1',
                        subserie: '0',
                        modelo_documento: '55', // NFe
                        numero_nota: nextNumber,
                        items: items,
                        total_nota: sale.total || 0,
                        ambiente_sefaz: 'homologacao', // Padrão homologação
                        status_envio_sefaz: 'nao_enviado',
                        confirmado: true,
                        incide_despesas_base_ipi: false,
                        incide_despesas_base_icms: false,
                        atualiza_custo_compra: false,
                        atualiza_custo_reposicao: false,
                        ipi_compoe_base_icms: false,
                        compra_orgao_publico: false,
                        frete: 0,
                        seguro: 0,
                        outras_despesas: 0,
                        acrescimo_financeiro: 0,
                        desconto_corporativo: 0,
                        percentual_frete: 0,
                        valor_frete: 0,
                        percentual_seguro: 0,
                        valor_seguro: 0,
                        icms_integral: 0,
                        acrescimo_financeiro_st: 0,
                        valor_suframa: 0,
                        desconto_itens: 0,
                        desconto_corpo: 0,
                        total_descontos: 0,
                        total_liquido: sale.total || 0,
                        total_itens: items.length,
                        base_calculo_icms: sale.total || 0,
                        valor_icms: (sale.total || 0) * 0.17,
                        base_icms_subst: 0,
                        valor_icms_subst: 0,
                        base_calculo_ipi: 0,
                        valor_ipi: 0,
                        base_iss: 0,
                        valor_iss: 0,
                        base_iss_st: 0,
                        valor_iss_st: 0,
                        outras_tributacoes: 0,
                        total_parcial: sale.total || 0,
                        total_parcelas: 0,
                        total_retencoes: 0,
                        valor_restante: sale.total || 0,
                        installments: [],
                        status: 'rascunho'
                    };

                    // Salvar nota fiscal usando a mesma lógica do handleSave
                    await handleSave(noteData as FiscalNote);

                    // Enviar para SEFAZ automaticamente
                    await handleSendToSefaz(noteData as FiscalNote);

                    successCount++;
                } catch (error: any) {
                    console.error(`Erro ao gerar nota para orçamento #${sale.sale_number}:`, error);
                    errorCount++;
                }
            }

            toast({
                title: "Processamento Concluído",
                description: `${successCount} nota(s) gerada(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s).` : '.'}`,
            });

            // Redirecionar para a lista de notas fiscais na aba de faturados
            navigate('/fiscal?tab=faturados');
        } catch (error: any) {
            console.error('Erro ao gerar múltiplas notas:', error);
            toast({
                title: "Erro",
                description: "Erro ao gerar notas fiscais: " + error.message,
                variant: "destructive"
            });
        }
    };

    const handleSendToSefaz = async (noteData: FiscalNote) => {
        try {
            // Buscar o ID da nota fiscal recém-criada
            const { data: invoiceHeader } = await supabase
                .from('invoice_headers' as any)
                .select('id')
                .eq('numero_nota', noteData.numero_nota)
                .eq('serie', noteData.serie)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!invoiceHeader) {
                throw new Error('Nota fiscal não encontrada');
            }

            // Atualizar status para processando
            await supabase
                .from('invoice_headers' as any)
                .update({
                    status_envio_sefaz: 'processando',
                    ambiente_sefaz: noteData.ambiente_sefaz || 'homologacao'
                })
                .eq('id', invoiceHeader.id);

            // TODO: Aqui você implementaria a chamada real para a API da SEFAZ
            // Por enquanto, vamos simular o envio
            // Em produção, você chamaria uma edge function ou API externa

            // Simular envio (remover em produção)
            setTimeout(async () => {
                // Simular resposta da SEFAZ após 2 segundos
                const { error: updateError } = await supabase
                    .from('invoice_headers' as any)
                    .update({
                        status_envio_sefaz: 'enviado',
                        mensagem_retorno_sefaz: 'Nota enviada para SEFAZ. Aguardando autorização.',
                    })
                    .eq('id', invoiceHeader.id);

                if (updateError) {
                    console.error('Erro ao atualizar status SEFAZ:', updateError);
                }
            }, 2000);

            toast({
                title: "Enviado para SEFAZ",
                description: `Nota #${noteData.numero_nota} enviada para processamento.`,
            });
        } catch (error: any) {
            console.error('Erro ao enviar para SEFAZ:', error);
            toast({
                title: "Erro",
                description: "Erro ao enviar para SEFAZ: " + error.message,
                variant: "destructive"
            });
        }
    };

    if (!mode) {
        return (
            <div className="container mx-auto py-8">
                <PageHeader
                    title="Nova Nota Fiscal"
                    description="Selecione o tipo de nota fiscal que deseja criar"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Nota de Entrada */}
                    <div className="border rounded-lg p-6 hover:border-primary hover:shadow-md cursor-pointer transition-all flex flex-col gap-4">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-400 w-fit mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12l7 7 7-7" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-semibold mb-2">Nota de Entrada</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Dar entrada de nota fiscal emitida pelo fornecedor.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/fiscal/entry/new')}
                            variant="default"
                            className="w-full"
                        >
                            Lançar Nota do Fornecedor
                        </Button>
                    </div>

                    {/* Nota de Saída */}
                    <div className="border rounded-lg p-6 hover:border-primary hover:shadow-md cursor-pointer transition-all flex flex-col gap-4">
                        <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-400 w-fit mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-semibold mb-2">Nota de Saída</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Emitir nota fiscal de saída para clientes.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBudgetModalOpen(true);
                                }}
                                variant="outline"
                                className="w-full"
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Gerar de Orçamento
                            </Button>
                            <Button
                                onClick={() => handleManualEntry('exit')}
                                variant="default"
                                className="w-full"
                            >
                                Emissão Manual
                            </Button>
                        </div>
                    </div>

                    {/* Nota Interna */}
                    <div className="border rounded-lg p-6 hover:border-primary hover:shadow-md cursor-pointer transition-all flex flex-col gap-4">
                        <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-400 w-fit mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" />
                                <path d="M16 13H8" />
                                <path d="M16 17H8" />
                                <path d="M10 9H8" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-semibold mb-2">Nota Interna</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Gerar nota fiscal interna a partir de orçamentos disponíveis.
                            </p>
                        </div>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                setBudgetModalOpen(true);
                            }}
                            variant="default"
                            className="w-full"
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Orçamentos
                        </Button>
                    </div>
                </div>

                <BudgetSelectionModal
                    open={budgetModalOpen}
                    onOpenChange={setBudgetModalOpen}
                    onSelect={(sale) => {
                        // Orçamentos sempre geram Nota de Saída (nós emitimos para o cliente)
                        handleBudgetSelectForExit(sale);
                    }}
                    onGenerateMultiple={handleGenerateMultipleInvoices}
                />
            </div>
        );
    }

    return (
        <>
            <div className="container mx-auto py-4">
                <Button variant="ghost" onClick={() => setMode(null)} className="mb-4">
                    ← Voltar para Seleção
                </Button>
            </div>
            <FiscalNoteForm onSave={handleSave} initialData={initialData} />
        </>
    );
}
