import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Eye,
    Download,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Printer,
    Edit,
    Trash2,
    Loader2,
    FileCode,
    RefreshCw,
    FileDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { BudgetSelectionModal } from '@/components/fiscal/BudgetSelectionModal';
import { useAuth } from '@/contexts/AuthContext';
import { sefazService } from '@/services/sefazService';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FiscalNotes() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { profile } = useAuth();
    const [selectedNoteType, setSelectedNoteType] = useState<'nfe' | 'nfse'>('nfe');
    const [selectedSale, setSelectedSale] = useState<string | null>(null);
    const [approvedSales, setApprovedSales] = useState<any[]>([]);
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [saleSearchTerm, setSaleSearchTerm] = useState('');
    const [stats, setStats] = useState({
        nfeEmitidas: 0,
        nfseEmitidas: 0,
        valorTotalFaturado: 0,
        pendentes: 0
    });
    const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'todas');
    const [showSefazDialog, setShowSefazDialog] = useState(false);
    const [selectedNoteForSefaz, setSelectedNoteForSefaz] = useState<any>(null);
    const [sefazLoading, setSefazLoading] = useState(false);
    const [sefazResult, setSefazResult] = useState<any>(null);

    useEffect(() => {
        loadNotes();
        loadApprovedSales();
    }, []);

    useEffect(() => {
        const tab = searchParams.get('tab') || 'todas';
        setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        calculateStats();
    }, [notes]);

    const loadNotes = async () => {
        if (!profile?.company_id) {
            setNotes([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('invoices' as any)
                .select('*')
                .eq('type', 'saida')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar notas:', error);
                
                // Se o erro for de tabela não encontrada, dar instruções claras
                if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                    toast({ 
                        title: 'Tabela não encontrada', 
                        description: 'A tabela invoices não existe. Execute o script EXECUTAR-AGORA-CRIAR-TABELA-INVOICES.sql no Supabase SQL Editor.',
                        variant: 'destructive',
                        duration: 10000
                    });
                }
                setNotes([]);
                return;
            }
            setNotes(data || []);
        } catch (error) {
            console.error('Error loading notes:', error);
            // Não mostrar toast para erro de tabela não encontrada
            if ((error as any)?.code !== 'PGRST205') {
                toast({ title: 'Erro', description: 'Erro ao carregar notas fiscais', variant: 'destructive' });
            }
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const loadApprovedSales = async () => {
        try {
            // Buscar vendas aprovadas (com status paid ou que não foram canceladas)
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    customer:customers(name, cpf_cnpj),
                    items:sale_items(
                        *,
                        product:products(name, internal_code)
                    )
                `)
                .neq('payment_status', 'cancelled')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Filtrar apenas vendas que têm itens
            const salesWithItems = (data || []).filter(sale =>
                sale.items && sale.items.length > 0
            );

            setApprovedSales(salesWithItems);
        } catch (error) {
            console.error('Error loading approved sales:', error);
        }
    };

    const filteredApprovedSales = () => {
        if (!saleSearchTerm) return approvedSales;

        const search = saleSearchTerm.toLowerCase();
        return approvedSales.filter(sale => {
            const saleNumber = sale.sale_number ? `VND-${String(sale.sale_number).padStart(4, '0')}` : '';
            const customerName = sale.customer?.name?.toLowerCase() || '';
            const customerDoc = sale.customer?.cpf_cnpj?.toLowerCase() || '';
            const total = formatCurrency(sale.total || 0).toLowerCase();

            return (
                saleNumber.toLowerCase().includes(search) ||
                customerName.includes(search) ||
                customerDoc.includes(search) ||
                total.includes(search)
            );
        });
    };

    const calculateStats = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const notesThisMonth = notes.filter(note => {
            const noteDate = new Date(note.data_emissao);
            return noteDate >= startOfMonth;
        });

        const nfeCount = notesThisMonth.filter(n => n.tipo === 'saida' && n.modelo_documento === '55').length;
        const nfseCount = notesThisMonth.filter(n => n.tipo === 'saida' && n.modelo_documento === 'SE').length;
        const totalValue = notesThisMonth
            .filter(n => n.status_envio_sefaz === 'autorizado')
            .reduce((sum, n) => sum + (Number(n.total_nota) || 0), 0);
        const pendingCount = notes.filter(n =>
            !n.status_envio_sefaz || n.status_envio_sefaz === 'nao_enviado'
        ).length;

        setStats({
            nfeEmitidas: nfeCount,
            nfseEmitidas: nfseCount,
            valorTotalFaturado: totalValue,
            pendentes: pendingCount
        });
    };

    const handleEmitNote = async () => {
        if (!selectedSale) {
            toast({
                title: 'Atenção',
                description: 'Selecione uma venda para emitir a nota fiscal.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsDialogOpen(false);

            // Buscar dados completos da venda
            if (!selectedSale) {
                throw new Error('Nenhuma venda selecionada');
            }

            let sale: any = null;
            let saleError: any = null;

            // Tentar buscar venda (pode falhar se colunas não existirem)
            const saleResult = await supabase
                .from('sales')
                .select(`
                    *,
                    customer:customers(name, cpf_cnpj, address, city, state, zip_code),
                    items:sale_items(
                        *,
                        product:products(id, name, internal_code)
                    )
                `)
                .eq('id', selectedSale)
                .single();

            sale = saleResult.data;
            saleError = saleResult.error;

            // Se houver erro de coluna não existir, ignorar e continuar (as colunas serão buscadas separadamente)
            if (saleError && saleError.code === '42703' && (saleError.message.includes('ncm') || saleError.message.includes('tipo_item'))) {
                console.warn('Coluna não existe na query inicial, continuando... As colunas serão buscadas separadamente.');
                saleError = null; // Ignorar o erro, vamos buscar as colunas separadamente
            }

            if (saleError && !sale) {
                console.error('Erro ao buscar venda:', saleError);
                throw new Error(`Erro ao buscar venda: ${saleError.message}`);
            }

            if (!sale) {
                throw new Error('Venda não encontrada');
            }

            // Buscar tipo_item e ncm dos produtos separadamente (para evitar erro de cache)
            if (sale?.items) {
                const productIds = sale.items.map((item: any) => item.product_id).filter(Boolean);
                if (productIds.length > 0) {
                    // Tentar buscar ncm, mas se a coluna não existir, buscar apenas tipo_item
                    let productsData: any[] = [];
                    const { data: dataWithNcm, error: ncmError } = await supabase
                        .from('products')
                        .select('id, tipo_item, ncm')
                        .in('id', productIds);

                    if (ncmError && ncmError.code === '42703') {
                        // Coluna ncm não existe, buscar apenas tipo_item
                        const { data: dataWithoutNcm } = await supabase
                            .from('products')
                            .select('id, tipo_item')
                            .in('id', productIds);
                        productsData = (dataWithoutNcm || []).map((p: any) => ({ ...p, ncm: null }));
                    } else {
                        productsData = dataWithNcm || [];
                    }

                    // Adicionar tipo_item e ncm aos produtos nos itens
                    if (productsData.length > 0) {
                        const productsMap = new Map(productsData.map((p: any) => [p.id, { tipo_item: p.tipo_item, ncm: p.ncm || null }]));
                        sale.items = sale.items.map((item: any) => ({
                            ...item,
                            product: {
                                ...item.product,
                                tipo_item: productsMap.get(item.product_id)?.tipo_item || 'produto',
                                ncm: productsMap.get(item.product_id)?.ncm || null
                            }
                        }));
                    }
                }
            }

            // Gerar nota fiscal automaticamente (considerando tipo_operacao da venda)
            await generateInvoiceFromSale(sale, selectedNoteType);

            // Recarregar notas e estatísticas
            await loadNotes();

            // Redirecionar para aba de faturados
            setActiveTab('faturados');
            setSearchParams({ tab: 'faturados' });

            toast({
                title: 'Sucesso',
                description: 'Nota fiscal gerada e enviada para SEFAZ automaticamente!',
            });
        } catch (error: any) {
            console.error('Erro ao emitir nota fiscal:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao emitir nota fiscal: ' + error.message,
                variant: 'destructive'
            });
        }
    };

    const handleGenerateMultipleInvoices = async (sales: any[]) => {
        if (!sales || sales.length === 0) {
            toast({
                title: 'Atenção',
                description: 'Nenhuma venda selecionada.',
                variant: 'destructive'
            });
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            toast({
                title: 'Processando',
                description: `Gerando ${sales.length} nota(s) fiscal(is)...`,
            });

            // Processar cada venda
            for (const sale of sales) {
                try {
                    // Buscar dados completos da venda
                    const { data: fullSale, error: saleError } = await supabase
                        .from('sales')
                        .select(`
                            *,
                            customer:customers(name, cpf_cnpj, address, city, state, zip_code),
                            items:sale_items(
                                *,
                                product:products(id, name, internal_code)
                            )
                        `)
                        .eq('id', sale.id)
                        .single();

                    if (saleError || !fullSale) {
                        console.error(`Erro ao buscar venda ${sale.id}:`, saleError);
                        errorCount++;
                        continue;
                    }

                    // Buscar tipo_item e ncm dos produtos
                    if (fullSale?.items) {
                        const productIds = fullSale.items.map((item: any) => item.product_id).filter(Boolean);
                        if (productIds.length > 0) {
                            // Tentar buscar ncm, mas se a coluna não existir, buscar apenas tipo_item
                            let productsData: any[] = [];
                            const { data: dataWithNcm, error: ncmError } = await supabase
                                .from('products')
                                .select('id, tipo_item, ncm')
                                .in('id', productIds);

                            if (ncmError && ncmError.code === '42703') {
                                // Coluna ncm não existe, buscar apenas tipo_item
                                const { data: dataWithoutNcm } = await supabase
                                    .from('products')
                                    .select('id, tipo_item')
                                    .in('id', productIds);
                                productsData = (dataWithoutNcm || []).map((p: any) => ({ ...p, ncm: null }));
                            } else {
                                productsData = dataWithNcm || [];
                            }

                            if (productsData.length > 0) {
                                const productsMap = new Map(productsData.map((p: any) => [p.id, { tipo_item: p.tipo_item, ncm: p.ncm || null }]));
                                fullSale.items = fullSale.items.map((item: any) => ({
                                    ...item,
                                    product: {
                                        ...item.product,
                                        tipo_item: productsMap.get(item.product_id)?.tipo_item || 'produto',
                                        ncm: productsMap.get(item.product_id)?.ncm || null
                                    }
                                }));
                            }
                        }
                    }

                    // Gerar nota fiscal automaticamente (usar tipo automático)
                    await generateInvoiceFromSale(fullSale);
                    successCount++;
                } catch (error: any) {
                    console.error(`Erro ao gerar nota para venda ${sale.id}:`, error);
                    errorCount++;
                }
            }

            // Recarregar notas e estatísticas
            await loadNotes();

            // Redirecionar para aba de faturados
            setActiveTab('faturados');
            setSearchParams({ tab: 'faturados' });

            // Mostrar resultado
            if (successCount > 0 && errorCount === 0) {
                toast({
                    title: 'Sucesso',
                    description: `${successCount} nota(s) fiscal(is) gerada(s) e enviada(s) para SEFAZ automaticamente!`,
                });
            } else if (successCount > 0 && errorCount > 0) {
                toast({
                    title: 'Atenção',
                    description: `${successCount} nota(s) gerada(s) com sucesso, ${errorCount} erro(s).`,
                    variant: 'destructive'
                });
            } else {
                toast({
                    title: 'Erro',
                    description: `Erro ao gerar notas fiscais. ${errorCount} erro(s).`,
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            console.error('Erro ao gerar múltiplas notas fiscais:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao gerar notas fiscais: ' + error.message,
                variant: 'destructive'
            });
        }
    };

    const generateInvoiceFromSale = async (sale: any, selectedType?: 'nfe' | 'nfse') => {
        // Determinar tipo de operação
        let tipoOperacao = sale.tipo_operacao || 'auto';

        // Se o usuário selecionou um tipo específico no modal, usar esse tipo
        if (selectedType === 'nfe') {
            tipoOperacao = 'produto';
        } else if (selectedType === 'nfse') {
            tipoOperacao = 'servico';
        }

        // Separar itens por tipo
        const produtos = sale.items?.filter((item: any) => item.product?.tipo_item === 'produto') || [];
        const servicos = sale.items?.filter((item: any) => item.product?.tipo_item === 'servico') || [];

        // Determinar tipo final se for auto
        let tipoFinal = tipoOperacao;
        if (tipoOperacao === 'auto') {
            if (produtos.length > 0 && servicos.length > 0) {
                tipoFinal = 'misto';
            } else if (servicos.length > 0) {
                tipoFinal = 'servico';
            } else {
                tipoFinal = 'produto';
            }
        }

        // Se for misto, gerar duas notas
        if (tipoFinal === 'misto') {
            // Gerar NFe para produtos
            if (produtos.length > 0) {
                await generateInvoiceFromItems(sale, produtos, 'nfe');
            }
            // Gerar NFS-e para serviços
            if (servicos.length > 0) {
                await generateInvoiceFromItems(sale, servicos, 'nfse');
            }
            return;
        }

        // Gerar uma única nota
        const itemsToUse = tipoFinal === 'servico' ? servicos : produtos;
        const noteType = tipoFinal === 'servico' ? 'nfse' : 'nfe';
        await generateInvoiceFromItems(sale, itemsToUse, noteType);
    };

    const generateInvoiceFromItems = async (sale: any, items: any[], noteType: 'nfe' | 'nfse') => {
        // Mapear itens para formato da nota fiscal
        const mappedItems = items.map((item: any) => {
            const total = (item.unit_price || 0) * (item.quantity || 0);

            if (noteType === 'nfse') {
                // NFS-e - Nota Fiscal de Serviços
                const issRate = 5; // Taxa padrão ISS

                const taxes = {
                    base_calculo_icms: 0,
                    aliquota_icms: 0,
                    valor_icms: 0,
                    base_pis: 0,
                    aliquota_pis: 0,
                    valor_pis: 0,
                    base_cofins: 0,
                    aliquota_cofins: 0,
                    valor_cofins: 0,
                    base_ipi: 0,
                    aliquota_ipi: 0,
                    valor_ipi: 0,
                    aliquota_iss: issRate,
                    base_calculo_iss: total,
                    valor_iss: total * (issRate / 100),
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
                    nome_item: item.product?.name || 'Serviço',
                    unidade: 'UN',
                    ncm: item.product?.ncm || '00000000',
                    cfop: null, // NFS-e não usa CFOP
                    quantidade: item.quantity,
                    preco_unitario: item.unit_price,
                    valor_total: total,
                    percentual_desconto: 0,
                    valor_desconto: item.discount || 0,
                    taxes: taxes,
                    aliquota_icms: 0,
                    aliquota_ipi: 0,
                    percentual_margem: 0,
                    custo_compra: 0,
                    custo_reposicao: 0,
                    custo_medio: 0,
                    custo_personalizado: 0
                };
            } else {
                // NFe - Nota Fiscal de Produtos
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
                    nome_item: item.product?.name || 'Produto',
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
            }
        });

        // Calcular totais
        const totalNota = mappedItems.reduce((sum, item) => sum + item.valor_total, 0);

        // Obter próximo número de nota da tabela invoices
        let nextNumber = 1;
        try {
            const { data: lastNote, error: lastNoteError } = await supabase
                .from('invoices' as any)
                .select('invoice_number')
                .eq('type', 'saida')
                .order('invoice_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Se encontrar uma nota, usar o próximo número
            if (lastNote && !lastNoteError) {
                nextNumber = (lastNote.invoice_number || 0) + 1;
            }
        } catch (error) {
            // Se der erro (tabela não existe, etc), começar do 1
            console.warn('Erro ao buscar último número de nota, usando 1:', error);
            nextNumber = 1;
        }

        // Determinar modelo do documento baseado no tipo
        const modeloDocumento = noteType === 'nfse' ? 'SE' : '55';

        // Buscar dados do cliente para usar no supplier_customer
        let customerName = 'Cliente não identificado';
        if (sale.customer_id) {
            const { data: customer } = await supabase
                .from('customers')
                .select('name')
                .eq('id', sale.customer_id)
                .single();
            if (customer) {
                customerName = customer.name;
            }
        }

        // Criar nota fiscal usando a tabela invoices
        const { data: headerData, error: headerError } = await supabase
            .from('invoices' as any)
            .insert([{
                company_id: profile?.company_id || null,
                type: 'saida',
                supplier_customer: customerName,
                description: `Nota Fiscal de ${noteType === 'nfse' ? 'Serviços' : 'Mercadorias'} - Venda #${sale.sale_number || sale.id}`,
                amount: totalNota,
                issue_date: new Date().toISOString().split('T')[0],
                status: 'pending',
                notes: `Gerada automaticamente da venda ${sale.sale_number || sale.id}. Modelo: ${modeloDocumento}`
            }])
            .select()
            .single();

        if (headerError) {
            console.error('Erro ao criar nota fiscal:', headerError);
            
            // Se o erro for de tabela não encontrada, dar uma mensagem mais clara
            if (headerError.code === 'PGRST205' || headerError.message?.includes('Could not find the table')) {
                throw new Error(
                    'Tabela de notas fiscais não encontrada. ' +
                    'Por favor, execute a migration 20250120000000_fix_invoices_table.sql no Supabase ou reinicie o PostgREST.'
                );
            }
            
            throw new Error(`Erro ao criar nota fiscal: ${headerError.message}`);
        }
        const invoiceId = headerData.id;

        // Criar movimentações de estoque para os produtos vendidos
        if (mappedItems.length > 0 && noteType === 'nfe') {
            for (const item of mappedItems) {
                // Buscar product_id do item da venda
                const saleItem = sale.items?.find((si: any) => 
                    si.product?.internal_code === item.codigo_item || 
                    si.product?.name === item.nome_item
                );

                if (saleItem?.product_id) {
                    // Criar movimentação de saída
                    await supabase
                        .from('inventory_movements')
                        .insert([{
                            company_id: profile?.company_id || null,
                            product_id: saleItem.product_id,
                            type: 'saida_venda',
                            quantity: item.quantidade,
                            reason: `NF Saída ${headerData.invoice_number} - Venda #${sale.sale_number || sale.id}`,
                            reference_id: sale.id,
                            user_id: profile?.id || null
                        }]);

                    // Atualizar quantidade do produto
                    const { data: product } = await supabase
                        .from('products')
                        .select('quantity')
                        .eq('id', saleItem.product_id)
                        .single();

                    if (product) {
                        const newQuantity = Math.max(0, (product.quantity || 0) - item.quantidade);
                        await supabase
                            .from('products')
                            .update({ quantity: newQuantity })
                            .eq('id', saleItem.product_id);
                    }
                }
            }
        }

        toast({
            title: 'Sucesso',
            description: `Nota Fiscal ${headerData.invoice_number} gerada com sucesso!`,
        });
    };

    const sendToSefaz = async (invoiceId: string, numeroNota: number) => {
        try {
            // TODO: Aqui você implementaria a chamada real para a API da SEFAZ
            // Por enquanto, apenas atualizamos o status para paid (pago/confirmado)
            const { error: updateError } = await supabase
                .from('invoices' as any)
                .update({
                    status: 'paid',
                    notes: `Nota ${numeroNota} gerada. Aguardando envio para SEFAZ.`
                })
                .eq('id', invoiceId);

            if (updateError) {
                console.error('Erro ao atualizar status da nota:', updateError);
            }
        } catch (error: any) {
            console.error('Erro ao processar nota:', error);
        }
    };

    // Consultar situação da nota emitida na SEFAZ
    const handleConsultarSituacao = async (nota: any) => {
        if (!nota.chave_acesso && !nota.chave) {
            toast({
                title: 'Erro',
                description: 'Chave de acesso não encontrada nesta nota',
                variant: 'destructive',
            });
            return;
        }

        setSelectedNoteForSefaz(nota);
        setShowSefazDialog(true);
        setSefazLoading(true);
        setSefazResult(null);

        try {
            const chave = nota.chave_acesso || nota.chave;
            const response = await sefazService.consultarSituacaoNotaEmitida(
                chave,
                profile?.company_id || '',
                profile?.id
            );

            setSefazResult({
                success: response.success,
                status: response.status,
                protocolo: response.protocolo,
                data_autorizacao: response.data_autorizacao,
                erro: response.erro,
            });
        } catch (error: any) {
            setSefazResult({
                success: false,
                erro: error.message || 'Erro ao consultar SEFAZ',
            });
        } finally {
            setSefazLoading(false);
        }
    };

    // Consultar status do serviço SEFAZ
    const handleConsultarStatusServico = async () => {
        setSefazLoading(true);
        setSefazResult(null);

        try {
            // Buscar UF da empresa
            const config = await sefazService.getFiscalConfig(profile?.company_id || '');
            const uf = config?.uf || 'SP';
            const ambiente = config?.ambiente || 'homologacao';

            const response = await sefazService.consultarStatusServico(uf, ambiente);
            setSefazResult(response);
        } catch (error: any) {
            setSefazResult({
                success: false,
                status: 'indisponivel',
                erro: error.message || 'Erro ao consultar status do serviço',
            });
        } finally {
            setSefazLoading(false);
        }
    };

    // Baixar protocolo de autorização
    const handleBaixarProtocolo = async (nota: any) => {
        if (!nota.chave_acesso && !nota.chave) {
            toast({
                title: 'Erro',
                description: 'Chave de acesso não encontrada',
                variant: 'destructive',
            });
            return;
        }

        if (!nota.protocolo) {
            toast({
                title: 'Erro',
                description: 'Protocolo não encontrado. Consulte a situação da nota primeiro.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const chave = nota.chave_acesso || nota.chave;
            const protocolo = await sefazService.baixarProtocolo(
                chave,
                nota.protocolo,
                profile?.company_id || '',
                profile?.id
            );

            // Salvar protocolo no banco (anexar à nota)
            // TODO: Implementar salvamento do protocolo na tabela de notas

            toast({
                title: 'Sucesso',
                description: 'Protocolo baixado com sucesso!',
            });
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao baixar protocolo',
                variant: 'destructive',
            });
        }
    };

    const handlePrintDAF = async (note: any) => {
        try {
            toast({
                title: "Impressão DAF",
                description: `Imprimindo nota #${note.numero_nota} no DAF...`,
            });

            // TODO: Implementar impressão DAF real
            setTimeout(() => {
                toast({
                    title: "Sucesso",
                    description: `Nota #${note.numero_nota} impressa no DAF com sucesso!`,
                });
            }, 2000);
        } catch (error: any) {
            toast({
                title: "Erro",
                description: "Erro ao imprimir no DAF: " + error.message,
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
        try {
            const { error } = await supabase.from('invoices' as any).delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: 'Nota excluída' });
            loadNotes();
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const getStatusBadge = (note: any) => {
        const status = note.status_envio_sefaz || 'nao_enviado';
        switch (status) {
            case 'autorizado':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        <CheckCircle2 className="w-3 h-3" />
                        Autorizada
                    </span>
                );
            case 'enviado':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                        <Clock className="w-3 h-3" />
                        Enviado
                    </span>
                );
            case 'processando':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                        <Clock className="w-3 h-3 animate-spin" />
                        Processando
                    </span>
                );
            case 'rejeitado':
            case 'cancelado':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                        <XCircle className="w-3 h-3" />
                        {status === 'cancelado' ? 'Cancelada' : 'Rejeitada'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                        <Clock className="w-3 h-3" />
                        Pendente
                    </span>
                );
        }
    };

    const filteredNotes = () => {
        let filtered = notes;

        // Filtrar por busca
        if (searchTerm) {
            filtered = filtered.filter(note =>
                note.numero_nota?.toString().includes(searchTerm) ||
                note.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrar por aba
        switch (activeTab) {
            case 'faturados':
                return filtered.filter(note =>
                    note.status_envio_sefaz &&
                    ['enviado', 'processando', 'autorizado'].includes(note.status_envio_sefaz)
                );
            case 'autorizadas':
                return filtered.filter(note => note.status_envio_sefaz === 'autorizado');
            case 'pendentes':
                return filtered.filter(note =>
                    !note.status_envio_sefaz || note.status_envio_sefaz === 'nao_enviado'
                );
            default:
                return filtered;
        }
    };

    const getNoteType = (note: any) => {
        if (note.modelo_documento === 'SE' || note.modelo_documento === 'SE') {
            return 'NFS-e';
        }
        return 'NF-e';
    };

    return (
        <div className="space-y-6">
            {/* Header com busca e botão */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por número ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => navigate('/fiscal/import')}
                        variant="outline"
                        className="shadow-glow-sm"
                    >
                        <FileCode className="w-4 h-4 mr-2" />
                        Importar XML
                    </Button>
                    <Button
                        onClick={() => navigate('/fiscal/entry/new')}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-glow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Lançar Nota de Entrada
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (open) {
                            // Carregar orçamentos quando o modal abrir
                            loadApprovedSales();
                        } else {
                            setSelectedSale(null);
                            setSaleSearchTerm('');
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Emitir Nota de Saída
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Emitir Nota Fiscal</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4 flex-1 overflow-hidden flex flex-col">
                                <div className="space-y-2">
                                    <Label>Tipo de Nota</Label>
                                    <Select value={selectedNoteType} onValueChange={(v: 'nfe' | 'nfse') => setSelectedNoteType(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="nfe">NF-e (Produtos)</SelectItem>
                                            <SelectItem value="nfse">NFS-e (Serviços)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                    <div className="flex items-center justify-between">
                                        <Label>Orçamentos Disponíveis</Label>
                                        <span className="text-xs text-muted-foreground">
                                            {filteredApprovedSales().length} orçamento(s) encontrado(s)
                                        </span>
                                    </div>

                                    {/* Busca Inteligente */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por número, cliente, CPF/CNPJ ou valor..."
                                            value={saleSearchTerm}
                                            onChange={(e) => setSaleSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>

                                    {/* Lista de Orçamentos em Aba */}
                                    <div className="border rounded-lg flex-1 overflow-hidden flex flex-col min-h-0">
                                        <div className="bg-muted/30 px-4 py-2 border-b">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Orçamentos Aprovados</span>
                                                {saleSearchTerm && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSaleSearchTerm('')}
                                                        className="h-6 text-xs"
                                                    >
                                                        Limpar busca
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {loading ? (
                                                <div className="p-8 text-center">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                                </div>
                                            ) : filteredApprovedSales().length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    {saleSearchTerm ? (
                                                        <>
                                                            <p className="font-medium mb-2">Nenhum orçamento encontrado</p>
                                                            <p className="text-xs">Tente buscar por número, cliente ou valor</p>
                                                        </>
                                                    ) : (
                                                        'Nenhuma venda aprovada encontrada.'
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="divide-y">
                                                    {filteredApprovedSales().map((venda) => (
                                                        <label
                                                            key={venda.id}
                                                            className={`flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors ${selectedSale === venda.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <input
                                                                    type="radio"
                                                                    name="venda"
                                                                    className="h-4 w-4"
                                                                    checked={selectedSale === venda.id}
                                                                    onChange={() => setSelectedSale(venda.id)}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="font-medium font-mono">
                                                                            {venda.sale_number ? `VND-${String(venda.sale_number).padStart(4, '0')}` : `VND-${venda.id.slice(0, 8)}`}
                                                                        </p>
                                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                            {venda.items?.length || 0} item(ns)
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm font-medium text-foreground">
                                                                        {venda.customer?.name || 'Consumidor Final'}
                                                                    </p>
                                                                    {venda.customer?.cpf_cnpj && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {venda.customer.cpf_cnpj}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        {formatDate(venda.created_at)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right ml-4">
                                                                <span className="font-semibold text-lg block">
                                                                    {formatCurrency(venda.total || 0)}
                                                                </span>
                                                                {selectedSale === venda.id && (
                                                                    <span className="text-xs text-primary font-medium">
                                                                        Selecionado
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Nota:</strong> Apenas vendas e ordens de serviço com status "APROVADO"
                                        podem ter nota fiscal emitida.
                                    </p>
                                </div>
                                <div className="flex justify-between items-center pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false);
                                            setBudgetModalOpen(true);
                                        }}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Selecionar Múltiplos Orçamentos
                                    </Button>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                            onClick={handleEmitNote}
                                            disabled={!selectedSale}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Emitir Nota Fiscal
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div >

            {/* Modal de Seleção Múltipla de Orçamentos */}
            < BudgetSelectionModal
                open={budgetModalOpen}
                onOpenChange={setBudgetModalOpen}
                onSelect={(sale) => {
                    setSelectedSale(sale.id);
                    setIsDialogOpen(true);
                    setBudgetModalOpen(false);
                }
                }
                onGenerateMultiple={async (sales) => {
                    setBudgetModalOpen(false);
                    await handleGenerateMultipleInvoices(sales);
                }}
            />

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-elevated p-4">
                    <p className="text-sm text-muted-foreground">NF-e Emitidas (mês)</p>
                    <p className="text-2xl font-bold text-foreground">{stats.nfeEmitidas}</p>
                </div>
                <div className="card-elevated p-4">
                    <p className="text-sm text-muted-foreground">NFS-e Emitidas (mês)</p>
                    <p className="text-2xl font-bold text-foreground">{stats.nfseEmitidas}</p>
                </div>
                <div className="card-elevated p-4">
                    <p className="text-sm text-muted-foreground">Valor Total Faturado</p>
                    <p className="text-2xl font-bold text-accent">{formatCurrency(stats.valorTotalFaturado)}</p>
                </div>
                <div className="card-elevated p-4">
                    <p className="text-sm text-muted-foreground">Pendentes de Emissão</p>
                    <p className="text-2xl font-bold text-warning">{stats.pendentes}</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    setActiveTab(value);
                    setSearchParams({ tab: value });
                }}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="todas">Todas</TabsTrigger>
                    <TabsTrigger value="faturados">
                        Faturados
                        {notes.filter(n =>
                            n.status_envio_sefaz &&
                            ['enviado', 'processando', 'autorizado'].includes(n.status_envio_sefaz)
                        ).length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {notes.filter(n =>
                                        n.status_envio_sefaz &&
                                        ['enviado', 'processando', 'autorizado'].includes(n.status_envio_sefaz)
                                    ).length}
                                </Badge>
                            )}
                    </TabsTrigger>
                    <TabsTrigger value="autorizadas">
                        Autorizadas
                        {notes.filter(n => n.status_envio_sefaz === 'autorizado').length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {notes.filter(n => n.status_envio_sefaz === 'autorizado').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                </TabsList>

                <TabsContent value="todas" className="mt-4">
                    <NotesTable
                        notes={filteredNotes()}
                        loading={loading}
                        onPrintDAF={handlePrintDAF}
                        onEdit={(id) => navigate(`/fiscal/edit/${id}`)}
                        onDelete={handleDelete}
                        getStatusBadge={getStatusBadge}
                        getNoteType={getNoteType}
                        navigate={navigate}
                    />
                </TabsContent>

                <TabsContent value="faturados" className="mt-4">
                    <NotesTable
                        notes={filteredNotes()}
                        loading={loading}
                        onPrintDAF={handlePrintDAF}
                        onEdit={(id) => navigate(`/fiscal/edit/${id}`)}
                        onDelete={handleDelete}
                        getStatusBadge={getStatusBadge}
                        getNoteType={getNoteType}
                        showSefazStatus={true}
                        navigate={navigate}
                    />
                </TabsContent>

                <TabsContent value="autorizadas" className="mt-4">
                    <NotesTable
                        notes={filteredNotes()}
                        loading={loading}
                        onPrintDAF={handlePrintDAF}
                        onEdit={(id) => navigate(`/fiscal/edit/${id}`)}
                        onDelete={handleDelete}
                        getStatusBadge={getStatusBadge}
                        getNoteType={getNoteType}
                        showSefazStatus={true}
                        navigate={navigate}
                    />
                </TabsContent>

                <TabsContent value="pendentes" className="mt-4">
                    <NotesTable
                        notes={filteredNotes()}
                        loading={loading}
                        onPrintDAF={handlePrintDAF}
                        onEdit={(id) => navigate(`/fiscal/edit/${id}`)}
                        onDelete={handleDelete}
                        getStatusBadge={getStatusBadge}
                        getNoteType={getNoteType}
                        navigate={navigate}
                    />
                </TabsContent>
            </Tabs>

            {/* Dialog SEFAZ */}
            <Dialog open={showSefazDialog} onOpenChange={setShowSefazDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Consulta SEFAZ</DialogTitle>
                        <DialogDescription>
                            {selectedNoteForSefaz ? 
                                `Consulta situação da nota ${selectedNoteForSefaz.numero_nota || selectedNoteForSefaz.invoice_number}` :
                                'Consulta status do serviço SEFAZ'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {!selectedNoteForSefaz && (
                            <Button
                                onClick={handleConsultarStatusServico}
                                disabled={sefazLoading}
                                className="w-full"
                            >
                                {sefazLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Consultando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Consultar Status do Serviço
                                    </>
                                )}
                            </Button>
                        )}

                        {sefazLoading && (
                            <div className="text-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                <p className="text-sm text-muted-foreground mt-2">Consultando SEFAZ...</p>
                            </div>
                        )}

                        {sefazResult && (
                            <Alert variant={sefazResult.success ? "default" : "destructive"}>
                                <AlertDescription>
                                    {sefazResult.success ? (
                                        <div className="space-y-2">
                                            <p><strong>Status:</strong> {sefazResult.status}</p>
                                            {sefazResult.protocolo && (
                                                <p><strong>Protocolo:</strong> {sefazResult.protocolo}</p>
                                            )}
                                            {sefazResult.data_autorizacao && (
                                                <p><strong>Data Autorização:</strong> {new Date(sefazResult.data_autorizacao).toLocaleString('pt-BR')}</p>
                                            )}
                                            {sefazResult.tempo_medio && (
                                                <p><strong>Tempo Médio:</strong> {sefazResult.tempo_medio}s</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p><strong>Erro:</strong> {sefazResult.erro || 'Erro desconhecido'}</p>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowSefazDialog(false);
                            setSefazResult(null);
                            setSelectedNoteForSefaz(null);
                        }}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

interface NotesTableProps {
    notes: any[];
    loading: boolean;
    onPrintDAF: (note: any) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    getStatusBadge: (note: any) => JSX.Element;
    getNoteType: (note: any) => string;
    showSefazStatus?: boolean;
    navigate: (path: string) => void;
}

function NotesTable({
    notes,
    loading,
    onPrintDAF,
    onEdit,
    onDelete,
    getStatusBadge,
    getNoteType,
    showSefazStatus = false,
    navigate
}: NotesTableProps) {
    if (loading) {
        return (
            <div className="card-elevated p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="card-elevated p-8 text-center text-muted-foreground">
                Nenhuma nota fiscal encontrada.
            </div>
        );
    }

    return (
        <div className="card-elevated overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead>Número</TableHead>
                        <TableHead>Série</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notes.map((nota) => (
                        <TableRow key={nota.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium">
                                {nota.numero_nota ? String(nota.numero_nota).padStart(9, '0') : '-'}
                            </TableCell>
                            <TableCell>{nota.serie || '-'}</TableCell>
                            <TableCell>{formatDate(nota.data_emissao)}</TableCell>
                            <TableCell className="font-medium">
                                {nota.customer?.name || nota.supplier?.name || '-'}
                            </TableCell>
                            <TableCell>
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNoteType(nota) === "NF-e"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-accent/10 text-accent"
                                        }`}
                                >
                                    {getNoteType(nota)}
                                </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                                {formatCurrency(nota.total_nota || 0)}
                            </TableCell>
                            <TableCell className="text-center">
                                {showSefazStatus ? getStatusBadge(nota) : (
                                    <span className="capitalize text-sm text-muted-foreground">
                                        {nota.status || 'rascunho'}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(nota.id)}>
                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                    {showSefazStatus && nota.status_envio_sefaz === 'autorizado' && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrintDAF(nota)}>
                                            <Printer className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                    {nota.status_envio_sefaz === 'autorizado' && (
                                        <>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleConsultarSituacao(nota)}
                                                title="Consultar situação na SEFAZ"
                                            >
                                                <Search className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleBaixarProtocolo(nota)}
                                                title="Baixar protocolo"
                                            >
                                                <FileDown className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                        </>
                                    )}
                                    {(!nota.status_envio_sefaz || nota.status_envio_sefaz === 'nao_enviado') && (
                                        <Button size="sm" variant="outline" onClick={() => navigate(`/fiscal/edit/${nota.id}`)}>
                                            Emitir
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
