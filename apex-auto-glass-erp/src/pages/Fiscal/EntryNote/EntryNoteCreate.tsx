import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { entryNoteService } from '@/services/entryNoteService';
import { supplierService } from '@/services/supplierService';
import { productLinkService, ProductLinkSuggestion } from '@/services/productLinkService';
import { ProductSearchCombobox } from '@/components/common/ProductSearchCombobox';
import { supabase } from '@/integrations/supabase/client';
import { EntryNote, EntryNoteItem, ENTRY_NOTE_TYPES, ENTRY_NOTE_SERIES } from '@/types/entryNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, CheckCircle, Upload, ArrowLeft, XCircle, AlertTriangle, CheckCircle2, FileCode, Link2, Package, Check, Search, ChevronsUpDown, Download, FileText, Paperclip, Printer, CloudDownload, CheckSquare, XSquare, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { SefazImportModal } from '@/components/fiscal/SefazImportModal';
import { sefazService, TipoManifestacao } from '@/services/sefazService';
import { parseNFeXML as parseNFeXMLService } from '@/services/xmlParserService';

// Interfaces para parsing de XML
interface ParsedXMLInvoice {
    type: 'nfe' | 'nfse';
    direction: 'entrada' | 'saida' | 'devolucao' | 'complementar';
    numero: string;
    serie: string;
    chave_acesso: string;
    data_emissao: string;
    data_entrada: string;
    cfop: string;
    natureza_operacao: string;
    finalidade: 'Normal' | 'Ajuste' | 'Devolução' | 'Importação';
    tipo_entrada: string;
    fornecedor: {
        cnpj: string;
        razao_social: string;
        inscricao_estadual?: string;
        endereco?: string;
        cidade?: string;
        uf?: string;
        cep?: string;
        telefone?: string;
        email?: string;
    };
    items: Array<{
        codigo?: string; // cProd
        descricao: string; // xProd
        ncm: string;
        cest?: string;
        gtin?: string; // cEAN
        cfop: string;
        unidade: string; // uCom
        quantidade: number; // qCom
        valor_unitario: number; // vUnCom
        desconto: number;
        total: number; // vProd
        origem?: string; // orig (0=Nacional, etc)
        cst?: string;
        csosn?: string;
        icms?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        pis?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        cofins?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        ipi?: {
            base: number;
            aliquota: number;
            valor: number;
        };
        iss?: {
            base: number;
            aliquota: number;
            valor: number;
        };
    }>;
    totais: {
        total_produtos: number;
        total_descontos: number;
        total_impostos: number;
        frete: number;
        seguro: number;
        outras_despesas: number;
        valor_total_nf: number;
        valor_icms: number;
        valor_pis: number;
        valor_cofins: number;
        valor_iss: number;
    };
}

interface ValidationError {
    type: 'error' | 'warning' | 'info';
    field: string;
    message: string;
    originalValue?: any;
    correctedValue?: any;
}

interface ValidationReport {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    corrections: ValidationError[];
    summary: {
        totalErrors: number;
        totalWarnings: number;
        totalCorrections: number;
    };
}

export default function EntryNoteCreate() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [processingXML, setProcessingXML] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
    const [showErrorsDialog, setShowErrorsDialog] = useState(false);
    const [entryJSON, setEntryJSON] = useState<any>(null);
    const [lockedFields, setLockedFields] = useState<Set<string>>(new Set()); // Campos fiscais travados
    const [duplicatas, setDuplicatas] = useState<Array<{ numero: string; vencimento: string; valor: number }>>([]); // Duplicatas do XML
    const [xmlImported, setXmlImported] = useState(false); // Flag para indicar se XML foi importado
    const [showLinkDialog, setShowLinkDialog] = useState(false); // Diálogo de vinculação
    const [currentLinkItemIndex, setCurrentLinkItemIndex] = useState<number | null>(null); // Índice do item sendo vinculado
    const [linkSuggestions, setLinkSuggestions] = useState<ProductLinkSuggestion[]>([]); // Sugestões de vinculação
    const [linkLoading, setLinkLoading] = useState(false); // Loading da vinculação
    const [selectedProductToLink, setSelectedProductToLink] = useState<string | null>(null); // Produto selecionado temporariamente para vincular
    const [productSearchOpen, setProductSearchOpen] = useState(false); // Controla abertura do popover de busca
    const [productSearchInput, setProductSearchInput] = useState(''); // Texto da busca
    const [showSefazModal, setShowSefazModal] = useState(false); // Modal SEFAZ
    const [manifestando, setManifestando] = useState(false); // Loading de manifestação

    const [note, setNote] = useState<Partial<EntryNote>>({
        status: 'Rascunho',
        items: [],
        totais: {
            total_produtos: 0,
            total_descontos: 0,
            total_impostos: 0,
            frete: 0,
            seguro: 0,
            outras_despesas: 0,
            valor_total_nf: 0
        }
    });

    useEffect(() => {
        if (profile?.company_id) {
            loadData();
            loadSales();
        }
    }, [profile?.company_id]);

    // Limpar estados de busca quando o modal é aberto ou quando o item muda
    useEffect(() => {
        if (showLinkDialog && currentLinkItemIndex !== null) {
            setSelectedProductToLink(null);
            setProductSearchInput('');
            setProductSearchOpen(false);
        }
    }, [showLinkDialog, currentLinkItemIndex]);

    const loadData = async () => {
        try {
            const suppliersData = await supplierService.getSuppliers(profile?.company_id || '');
            setSuppliers(suppliersData?.data || []);

            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('company_id', profile?.company_id);
            setProducts(productsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
            // Garantir que suppliers seja sempre um array mesmo em caso de erro
            setSuppliers([]);
        }
    };

    const loadSales = async () => {
        const { data } = await supabase
            .from('sales')
            .select('id, sale_number, customer:customers(name)')
            .eq('company_id', profile?.company_id)
            .order('created_at', { ascending: false });
        setSales(data || []);
    };

    const calculateTotals = (currentNote: Partial<EntryNote>) => {
        const items = currentNote.items || [];
        // Usar valor_total_fiscal se disponível, senão usar total
        const totalProdutos = items.reduce((sum, item) => sum + (item.valor_total_fiscal || item.total || 0), 0);
        const totalImpostos = items.reduce((sum, item) => sum + (item.impostos?.icms?.valor || 0) + (item.impostos?.ipi || 0) + (item.impostos?.pis || 0) + (item.impostos?.cofins || 0), 0);
        const totalDescontos = items.reduce((sum, item) => sum + (item.desconto || 0), 0);

        const frete = Number(currentNote.totais?.frete || 0);
        const seguro = Number(currentNote.totais?.seguro || 0);
        const outras = Number(currentNote.totais?.outras_despesas || 0);

        const valorTotal = totalProdutos + totalImpostos + frete + seguro + outras - totalDescontos;

        setNote(prev => ({
            ...prev,
            totais: {
                ...prev.totais!,
                total_produtos: totalProdutos,
                total_impostos: totalImpostos,
                total_descontos: totalDescontos,
                valor_total_nf: valorTotal
            }
        }));
    };

    // Função para calcular fator de conversão
    const calculateConversionFactor = (quantidadeFiscal: number, quantidadeInterna: number): number => {
        if (!quantidadeFiscal || quantidadeFiscal === 0) return 1;
        return quantidadeInterna / quantidadeFiscal;
    };

    // Função para calcular valor unitário interno
    const calculateInternalUnitValue = (valorTotalFiscal: number, quantidadeInterna: number): number => {
        if (!quantidadeInterna || quantidadeInterna === 0) return 0;
        return valorTotalFiscal / quantidadeInterna;
    };

    // Função para recalcular valores internos baseado na conversão
    const recalculateInternalValues = (item: EntryNoteItem): EntryNoteItem => {
        const quantidadeFiscal = item.quantidade_fiscal ?? item.quantidade;
        const valorTotalFiscal = item.valor_total_fiscal ?? item.total;
        const quantidadeInterna = item.quantidade_interna ?? quantidadeFiscal;

        // Calcular fator de conversão
        const fator = calculateConversionFactor(quantidadeFiscal, quantidadeInterna);

        // Calcular valor unitário interno
        const valorUnitInterno = calculateInternalUnitValue(valorTotalFiscal, quantidadeInterna);

        return {
            ...item,
            fator_conversao: fator,
            valor_unitario_interno: valorUnitInterno,
            quantidade_interna: quantidadeInterna,
        };
    };

    const handleAddItem = () => {
        setNote(prev => ({
            ...prev,
            items: [
                ...(prev.items || []),
                {
                    produto_id: '',
                    ncm: '',
                    unidade: 'UN',
                    quantidade: 1,
                    valor_unitario: 0,
                    desconto: 0,
                    total: 0,
                    // Campos fiscais (inicialmente iguais aos padrões)
                    quantidade_fiscal: 1,
                    valor_unitario_fiscal: 0,
                    valor_total_fiscal: 0,
                    unidade_fiscal: 'UN',
                    // Campos internos (inicialmente iguais aos fiscais)
                    quantidade_interna: 1,
                    unidade_interna: 'UN',
                    fator_conversao: 1,
                    valor_unitario_interno: 0,
                    impostos: {
                        icms: { base: 0, aliquota: 0, valor: 0 },
                        st_mva: 0,
                        pis: 0,
                        cofins: 0,
                        ipi: 0
                    }
                }
            ]
        }));
    };

    const handleUpdateItem = (index: number, field: keyof EntryNoteItem | string, value: any) => {
        const newItems = [...(note.items || [])];
        const item = { ...newItems[index] };
        const isFiscalField = xmlImported && (
            field === 'quantidade_fiscal' ||
            field === 'valor_unitario_fiscal' ||
            field === 'valor_total_fiscal' ||
            field === 'unidade_fiscal' ||
            field === 'ncm' ||
            field === 'quantidade' ||
            field === 'valor_unitario' ||
            field === 'total'
        );

        // Bloquear edição de campos fiscais se XML foi importado
        if (isFiscalField) {
            toast({
                title: 'Campo Travado',
                description: 'Este campo fiscal não pode ser alterado pois veio do XML da nota fiscal.',
                variant: 'destructive'
            });
            return;
        }

        if (field === 'produto_id') {
            const product = products.find(p => p.id === value);
            if (product) {
                item.produto_id = value;
                // Não alterar valores fiscais se XML foi importado
                if (!xmlImported) {
                    item.valor_unitario = product.purchase_price || 0;
                }
                if (!xmlImported || !item.ncm) {
                    item.ncm = product.ncm || '';
                }
            }
        } else if (field.includes('.')) {
            const parts = field.split('.');
            let current: any = item;
            for (let i = 0; i < parts.length - 1; i++) {
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
        } else {
            (item as any)[field] = value;
        }

        // Se não tem campos fiscais definidos, usar valores padrão
        // Se XML não foi importado, atualizar campos fiscais quando valores mudarem
        if (!xmlImported) {
            if (field === 'quantidade' || field === 'valor_unitario' || field === 'total' || field === 'unidade') {
                item.quantidade_fiscal = item.quantidade;
                item.valor_unitario_fiscal = item.valor_unitario;
                item.valor_total_fiscal = item.total;
                item.unidade_fiscal = item.unidade;
            }
        } else {
            // Se XML foi importado, manter campos fiscais inalterados
            if (!item.quantidade_fiscal) {
                item.quantidade_fiscal = item.quantidade;
            }
            if (!item.valor_unitario_fiscal) {
                item.valor_unitario_fiscal = item.valor_unitario;
            }
            if (!item.valor_total_fiscal) {
                item.valor_total_fiscal = item.total;
            }
            if (!item.unidade_fiscal) {
                item.unidade_fiscal = item.unidade;
            }
        }

        // Recalcular valores internos quando quantidade interna ou fator mudar
        if (field === 'quantidade_interna' || field === 'fator_conversao') {
            if (field === 'quantidade_interna') {
                // Recalcular fator e valor unitário interno
                const quantidadeFiscal = item.quantidade_fiscal || item.quantidade;
                const valorTotalFiscal = item.valor_total_fiscal || item.total;

                if (quantidadeFiscal > 0) {
                    item.fator_conversao = value / quantidadeFiscal;
                }
                if (value > 0) {
                    item.valor_unitario_interno = valorTotalFiscal / value;
                }
            } else if (field === 'fator_conversao') {
                // Recalcular quantidade interna baseado no fator
                const quantidadeFiscal = item.quantidade_fiscal || item.quantidade;
                item.quantidade_interna = quantidadeFiscal * value;

                const valorTotalFiscal = item.valor_total_fiscal || item.total;
                if (item.quantidade_interna > 0) {
                    item.valor_unitario_interno = valorTotalFiscal / item.quantidade_interna;
                }
            }
        }

        // Recalcular valores internos se necessário
        if (item.quantidade_fiscal && item.valor_total_fiscal) {
            const updatedItem = recalculateInternalValues(item);
            Object.assign(item, updatedItem);
        }

        // Calcular total
        if (!xmlImported) {
            // Se não tem XML, calcular normalmente
            item.total = (item.quantidade * item.valor_unitario) - item.desconto;
            // Atualizar valor_total_fiscal também
            item.valor_total_fiscal = item.total;
        } else {
            // Se tem XML, manter total fiscal inalterado
            item.total = item.valor_total_fiscal || item.total;
        }

        if (item.impostos) {
            // Usar valor total fiscal para base de cálculo se disponível
            const baseCalculo = item.valor_total_fiscal || item.total;
            item.impostos.icms.base = baseCalculo;
            item.impostos.icms.valor = baseCalculo * (item.impostos.icms.aliquota / 100);
        }

        newItems[index] = item;

        const newNote = { ...note, items: newItems };
        setNote(newNote);
        calculateTotals(newNote);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = note.items?.filter((_, i) => i !== index);
        const newNote = { ...note, items: newItems };
        setNote(newNote);
        calculateTotals(newNote);
    };

    const handleSave = async () => {
        if (!note.numero || !note.serie || !note.fornecedor_id) {
            toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
            return;
        }

        // Validar itens
        if (!note.items || note.items.length === 0) {
            toast({ title: 'Erro', description: 'Adicione pelo menos um item à nota', variant: 'destructive' });
            return;
        }

        // Validar campos fiscais e internos
        for (let i = 0; i < note.items.length; i++) {
            const item = note.items[i];
            const quantidadeFiscal = item.quantidade_fiscal ?? item.quantidade;
            const quantidadeInterna = item.quantidade_interna ?? quantidadeFiscal;

            // Validar quantidade fiscal
            if (!quantidadeFiscal || quantidadeFiscal <= 0) {
                toast({
                    title: 'Erro de Validação',
                    description: `Item ${i + 1}: Quantidade fiscal deve ser maior que zero`,
                    variant: 'destructive'
                });
                return;
            }

            // Validar quantidade interna
            if (!quantidadeInterna || quantidadeInterna <= 0) {
                toast({
                    title: 'Erro de Validação',
                    description: `Item ${i + 1}: Quantidade interna deve ser maior que zero`,
                    variant: 'destructive'
                });
                return;
            }

            // Aviso se quantidade interna < quantidade fiscal
            if (quantidadeInterna < quantidadeFiscal) {
                const confirm = window.confirm(
                    `Atenção: No item ${i + 1}, a quantidade interna (${quantidadeInterna}) é menor que a quantidade fiscal (${quantidadeFiscal}).\n\n` +
                    `Isso pode indicar perda ou ajuste. Deseja continuar mesmo assim?`
                );
                if (!confirm) return;
            }
        }

        setLoading(true);
        try {
            const noteData = {
                ...note,
                company_id: profile?.company_id
            } as EntryNote;

            await entryNoteService.create(noteData);
            toast({ title: 'Sucesso', description: 'Nota salva com sucesso!' });
            navigate('/fiscal');
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleValidate = () => {
        if (!entryNoteService.validateKey(note.chave_acesso || '')) {
            toast({ title: 'Erro', description: 'Chave de acesso inválida (deve ter 44 dígitos)', variant: 'destructive' });
            return false;
        }
        if (!entryNoteService.validateSeries(note.serie || '', note.tipo_entrada || '')) {
            toast({ title: 'Erro', description: 'Série inválida para o tipo de entrada selecionado', variant: 'destructive' });
            return false;
        }
        toast({ title: 'Sucesso', description: 'Nota validada com sucesso!' });
        return true;
    };

    const handleLaunch = async () => {
        if (!handleValidate()) return;
        
        // Se a nota não existe, criar primeiro
        let noteId = note.id;
        if (!noteId) {
            // Validar campos obrigatórios antes de criar
            if (!note.numero || !note.serie || !note.fornecedor_id) {
                toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
                return;
            }

            // Validar itens
            if (!note.items || note.items.length === 0) {
                toast({ title: 'Erro', description: 'Adicione pelo menos um item à nota', variant: 'destructive' });
                return;
            }

            setLoading(true);
            try {
                const noteData = {
                    ...note,
                    company_id: profile?.company_id
                } as EntryNote;

                const createdNote = await entryNoteService.create(noteData);
                noteId = createdNote.id;
                // Atualizar o estado da nota com o ID criado
                setNote(prev => ({ ...prev, id: noteId }));
            } catch (error: any) {
                toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        // Validar itens antes de lançar
        if (!note.items || note.items.length === 0) {
            toast({ title: 'Erro', description: 'Adicione pelo menos um item à nota antes de lançar', variant: 'destructive' });
            return;
        }

        // Validar vinculação de todos os itens
        const pendingItems = note.items.filter(item =>
            item.link_status === 'pending' ||
            (!item.produto_id && item.link_status !== 'ignored')
        );

        if (pendingItems.length > 0) {
            toast({
                title: 'Vinculação Pendente',
                description: `Existem ${pendingItems.length} item(ns) pendente(s) de vinculação. Por favor, vincule todos os itens antes de lançar.`,
                variant: 'destructive',
                duration: 5000
            });

            // Abrir diálogo de vinculação automaticamente
            const firstPendingIndex = note.items.findIndex(item =>
                item.link_status === 'pending' ||
                (!item.produto_id && item.link_status !== 'ignored')
            );

            if (firstPendingIndex !== -1) {
                setCurrentLinkItemIndex(firstPendingIndex);
                await loadLinkSuggestions(firstPendingIndex);
                setShowLinkDialog(true);
            }
            return;
        }

        // Validar campos fiscais e internos
        for (let i = 0; i < note.items.length; i++) {
            const item = note.items[i];
            const quantidadeFiscal = item.quantidade_fiscal ?? item.quantidade;
            const quantidadeInterna = item.quantidade_interna ?? quantidadeFiscal;

            // Validar quantidade fiscal
            if (!quantidadeFiscal || quantidadeFiscal <= 0) {
                toast({
                    title: 'Erro de Validação',
                    description: `Item ${i + 1}: Quantidade fiscal deve ser maior que zero`,
                    variant: 'destructive'
                });
                return;
            }

            // Validar quantidade interna
            if (!quantidadeInterna || quantidadeInterna <= 0) {
                toast({
                    title: 'Erro de Validação',
                    description: `Item ${i + 1}: Quantidade interna deve ser maior que zero`,
                    variant: 'destructive'
                });
                return;
            }

            // Aviso se quantidade interna < quantidade fiscal
            if (quantidadeInterna < quantidadeFiscal) {
                const confirm = window.confirm(
                    `Atenção: No item ${i + 1}, a quantidade interna (${quantidadeInterna}) é menor que a quantidade fiscal (${quantidadeFiscal}).\n\n` +
                    `O estoque será atualizado com a quantidade interna. Deseja continuar?`
                );
                if (!confirm) return;
            }
        }

        setLoading(true);
        try {
            // 1. Lançar nota e atualizar estoque
            await entryNoteService.launch(noteId, note as EntryNote, profile?.id);

            // 2. Gerar contas a pagar baseado nas duplicatas
            if (duplicatas.length > 0 && note.fornecedor_id) {
                // Buscar natureza financeira padrão para compras
                const { data: natureData } = await supabase
                    .from('financial_natures')
                    .select('id')
                    .eq('company_id', profile?.company_id)
                    .eq('type', 'saida')
                    .eq('code', '4.01') // Compra de Produtos para Revenda
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                const natureId = natureData?.id || null;

                // Criar contas a pagar para cada duplicata
                const launchDate = new Date().toISOString().split('T')[0];
                const payablesToInsert = duplicatas.map((dup) => {
                    // Garantir que due_date >= launch_date (constraint do banco)
                    const dueDate = dup.vencimento && dup.vencimento >= launchDate 
                        ? dup.vencimento 
                        : launchDate;
                    
                    return {
                        company_id: profile?.company_id,
                        supplier_id: note.fornecedor_id,
                        launch_date: launchDate,
                        due_date: dueDate,
                        description: `NF ${note.numero}/${note.serie} - Duplicata ${dup.numero}`,
                        nature_id: natureId,
                        total_value: dup.valor,
                        interest_fine: 0,
                        final_value: dup.valor,
                        paid_value: 0,
                        status: 'em_aberto',
                        created_by: profile?.id,
                    };
                });

                const { error: payableError } = await supabase
                    .from('accounts_payable')
                    .insert(payablesToInsert);

                if (payableError) {
                    console.error('Erro ao criar contas a pagar:', payableError);
                    toast({
                        title: 'Aviso',
                        description: 'Nota lançada, mas houve erro ao criar contas a pagar. Verifique manualmente.',
                        variant: 'default',
                    });
                } else {
                    toast({
                        title: 'Sucesso',
                        description: `Nota lançada, estoque atualizado e ${duplicatas.length} conta(s) a pagar criada(s)!`,
                    });
                }
            } else {
                toast({ title: 'Sucesso', description: 'Nota lançada e estoque atualizado!' });
            }

            navigate('/fiscal');
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // ========== FUNÇÕES DE XML ==========

    const handleXMLUpload = () => {
        fileInputRef.current?.click();
    };

    // Função para processar XML importado do modal SEFAZ
    const handleImportFromSefaz = async (xml: string, chave: string) => {
        setProcessingXML(true);
        setValidationReport(null);
        setEntryJSON(null);

        try {
            // Salvar XML na nota
            setNote(prev => ({ ...prev, xml, chave_acesso: chave }));

            // Processar XML usando o parser melhorado
            const parsed = parseNFeXMLService(xml);

            // Validar
            const validation = await validateXML(parsed as any);
            setValidationReport(validation);

            // Mapear para formulário
            await mapXMLToForm(parsed as any);

            // Marcar como importado para bloquear campos fiscais
            setXmlImported(true);
            
            // Bloquear campos fiscais
            const fieldsToLock = new Set([
                'numero', 'serie', 'chave_acesso', 'data_emissao', 
                'cfop', 'natureza_operacao', 'finalidade'
            ]);
            setLockedFields(fieldsToLock);

            // Gerar JSON final
            const supplierId = note.fornecedor_id || '';
            const json = generateEntryJSON(parsed as any, supplierId);
            setEntryJSON(json);

            toast({
                title: 'XML Importado da SEFAZ',
                description: 'Dados preenchidos automaticamente. Revise e clique em Salvar.',
            });
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao processar XML',
                variant: 'destructive',
            });
        } finally {
            setProcessingXML(false);
        }
    };

    // Função para manifestar destinatário
    const handleManifestar = async (tipo: TipoManifestacao) => {
        if (!note.chave_acesso) {
            toast({
                title: 'Erro',
                description: 'Chave de acesso não encontrada',
                variant: 'destructive',
            });
            return;
        }

        setManifestando(true);
        try {
            const response = await sefazService.manifestarDestinatario(
                note.chave_acesso,
                tipo,
                profile?.company_id || '',
                profile?.id
            );

            if (response.success) {
                const tipoLabel = {
                    '210100': 'Ciência da Operação',
                    '210200': 'Confirmação da Operação',
                    '210240': 'Desconhecimento',
                    '210250': 'Operação Não Realizada',
                }[tipo];

                toast({
                    title: 'Sucesso',
                    description: `${tipoLabel} realizada com sucesso!`,
                });

                // Se for confirmação, baixar XML automaticamente
                if (tipo === '210200') {
                    try {
                        const xml = await sefazService.baixarXML(note.chave_acesso, profile?.company_id || '', profile?.id);
                        await handleImportFromSefaz(xml, note.chave_acesso);
                    } catch (error: any) {
                        console.error('Erro ao baixar XML após confirmação:', error);
                    }
                }
            } else {
                throw new Error(response.erro || 'Erro ao manifestar');
            }
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao manifestar destinatário',
                variant: 'destructive',
            });
        } finally {
            setManifestando(false);
        }
    };

    const readXML = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (!content) {
                    reject(new Error('Erro ao ler arquivo XML'));
                    return;
                }
                resolve(content);
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    };

    const parseNFeXML = (xml: string): ParsedXMLInvoice & { duplicatas?: Array<{ numero: string; vencimento: string; valor: number }>; destinatario_cnpj?: string } => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML inválido ou malformado.');
        }

        // Buscar infNFe
        const infNFe = doc.querySelector('infNFe');
        if (!infNFe) {
            throw new Error('Tag infNFe não encontrada. Verifique se é um XML de NFe válido.');
        }

        const ide = infNFe.querySelector('ide');
        const emit = infNFe.querySelector('emit');
        const dest = infNFe.querySelector('dest');
        const dets = infNFe.querySelectorAll('det');
        const total = infNFe.querySelector('total');
        const ICMSTot = total?.querySelector('ICMSTot');
        const cobr = infNFe.querySelector('cobr'); // Cobrança (duplicatas)

        // Extrair dados básicos
        const numero = ide?.querySelector('nNF')?.textContent || '';
        // Buscar série de forma mais robusta (pode estar com namespace ou variações)
        // getElementsByTagName funciona melhor com namespaces do que querySelector
        let serie = '';
        if (ide) {
            // Tentar com querySelector primeiro (mais rápido)
            serie = ide.querySelector('serie')?.textContent ||
                ide.querySelector('Serie')?.textContent || '';

            // Se não encontrou, tentar com getElementsByTagName (funciona com namespaces)
            if (!serie) {
                const serieElements = ide.getElementsByTagName('serie');
                if (serieElements.length > 0) {
                    serie = serieElements[0].textContent || '';
                } else {
                    const SerieElements = ide.getElementsByTagName('Serie');
                    if (SerieElements.length > 0) {
                        serie = SerieElements[0].textContent || '';
                    }
                }
            }
        }
        const dhEmi = ide?.querySelector('dhEmi')?.textContent || '';
        const dataEmissao = dhEmi ? new Date(dhEmi).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const chave = infNFe.getAttribute('Id')?.replace('NFe', '') || '';
        const natOp = ide?.querySelector('natOp')?.textContent || '';
        const finNFe = ide?.querySelector('finNFe')?.textContent || '1'; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução

        // Determinar tipo de entrada e finalidade
        let tipo_entrada = 'Compra';
        let finalidade: 'Normal' | 'Ajuste' | 'Devolução' | 'Importação' = 'Normal';

        if (finNFe === '2') {
            tipo_entrada = 'Complementar';
            finalidade = 'Normal';
        } else if (finNFe === '3') {
            tipo_entrada = 'Ajuste';
            finalidade = 'Ajuste';
        } else if (finNFe === '4') {
            tipo_entrada = 'Devolução de fornecedor';
            finalidade = 'Devolução';
        }

        // Determinar direção (sempre entrada para notas importadas)
        const direction: 'entrada' | 'saida' | 'devolucao' | 'complementar' =
            finNFe === '4' ? 'devolucao' :
                finNFe === '2' ? 'complementar' :
                    'entrada';

        // Extrair CFOP (pegar do primeiro item)
        let cfop = '';
        if (dets.length > 0) {
            const prod = dets[0].querySelector('prod');
            const imposto = dets[0].querySelector('imposto');
            const icms = imposto?.querySelector('ICMS');
            const icms00 = icms?.querySelector('ICMS00') || icms?.querySelector('ICMS10') || icms?.querySelector('ICMS20') || icms?.querySelector('ICMS30') || icms?.querySelector('ICMS40') || icms?.querySelector('ICMS51') || icms?.querySelector('ICMS60') || icms?.querySelector('ICMS70') || icms?.querySelector('ICMS90');
            cfop = prod?.querySelector('CFOP')?.textContent || '';

            // Ajustar CFOP para entrada se necessário
            if (cfop && !cfop.startsWith('1') && !cfop.startsWith('2') && !cfop.startsWith('3') && !cfop.startsWith('5') && !cfop.startsWith('6') && !cfop.startsWith('7')) {
                // Se CFOP não é de entrada, tentar converter
                const cfopNum = parseInt(cfop);
                if (cfopNum >= 5100 && cfopNum <= 5999) {
                    // CFOP de saída, converter para entrada equivalente
                    cfop = String(cfopNum - 1000);
                }
            }
        }

        // Extrair dados do emitente (fornecedor)
        const emitCNPJ = emit?.querySelector('CNPJ')?.textContent || emit?.querySelector('CPF')?.textContent || '';
        const emitRazao = emit?.querySelector('xNome')?.textContent || '';
        const emitIE = emit?.querySelector('IE')?.textContent || '';
        const emitEndereco = emit?.querySelector('enderEmit');
        const emitLogradouro = emitEndereco?.querySelector('xLgr')?.textContent || '';
        const emitNumero = emitEndereco?.querySelector('nro')?.textContent || '';
        const emitBairro = emitEndereco?.querySelector('xBairro')?.textContent || '';
        const emitCidade = emitEndereco?.querySelector('xMun')?.textContent || '';
        const emitUF = emitEndereco?.querySelector('UF')?.textContent || '';
        const emitCEP = emitEndereco?.querySelector('CEP')?.textContent?.replace(/\D/g, '') || '';

        // Extrair itens
        const items: ParsedXMLInvoice['items'] = [];
        dets.forEach((det) => {
            const prod = det.querySelector('prod');
            const imposto = det.querySelector('imposto');
            const icms = imposto?.querySelector('ICMS');
            const pis = imposto?.querySelector('PIS');
            const cofins = imposto?.querySelector('COFINS');
            const ipi = imposto?.querySelector('IPI');

            const codigo = prod?.querySelector('cProd')?.textContent || ''; // cProd
            const descricao = prod?.querySelector('xProd')?.textContent || ''; // xProd
            const ncm = prod?.querySelector('NCM')?.textContent || '00000000';
            const cest = prod?.querySelector('CEST')?.textContent || ''; // CEST
            const gtin = prod?.querySelector('cEAN')?.textContent || prod?.querySelector('cEANTrib')?.textContent || ''; // GTIN (cEAN)
            const cfopItem = prod?.querySelector('CFOP')?.textContent || cfop;
            const unidade = prod?.querySelector('uCom')?.textContent || 'UN'; // uCom
            const quantidade = parseFloat(prod?.querySelector('qCom')?.textContent || '1'); // qCom
            const valorUnitario = parseFloat(prod?.querySelector('vUnCom')?.textContent || '0'); // vUnCom
            const valorTotal = parseFloat(prod?.querySelector('vProd')?.textContent || '0'); // vProd
            const desconto = parseFloat(prod?.querySelector('vDesc')?.textContent || '0');

            // Extrair origem da mercadoria (do imposto)
            let origem = '0'; // 0 = Nacional
            if (imposto) {
                const icmsOrigem = imposto.querySelector('ICMS')?.querySelector('orig');
                if (icmsOrigem) {
                    origem = icmsOrigem.textContent || '0';
                }
            }

            // Extrair ICMS
            let icmsData = { base: 0, aliquota: 0, valor: 0 };
            let cst = '';
            let csosn = '';

            if (icms) {
                const icms00 = icms.querySelector('ICMS00');
                const icms10 = icms.querySelector('ICMS10');
                const icms20 = icms.querySelector('ICMS20');
                const icms30 = icms.querySelector('ICMS30');
                const icms40 = icms.querySelector('ICMS40');
                const icms51 = icms.querySelector('ICMS51');
                const icms60 = icms.querySelector('ICMS60');
                const icms70 = icms.querySelector('ICMS70');
                const icms90 = icms.querySelector('ICMS90');
                const icms102 = icms.querySelector('ICMS102');
                const icms201 = icms.querySelector('ICMS201');
                const icms202 = icms.querySelector('ICMS202');
                const icms500 = icms.querySelector('ICMS500');
                const icms900 = icms.querySelector('ICMS900');
                const icmsST = icms.querySelector('ICMSTot');

                const icmsNode = icms00 || icms10 || icms20 || icms30 || icms40 || icms51 || icms60 || icms70 || icms90 || icms102 || icms201 || icms202 || icms500 || icms900 || icmsST;

                if (icmsNode) {
                    cst = icmsNode.querySelector('CST')?.textContent || icmsNode.querySelector('CSOSN')?.textContent || '';
                    csosn = icmsNode.querySelector('CSOSN')?.textContent || '';
                    icmsData.base = parseFloat(icmsNode.querySelector('vBC')?.textContent || '0');
                    icmsData.aliquota = parseFloat(icmsNode.querySelector('pICMS')?.textContent || '0');
                    icmsData.valor = parseFloat(icmsNode.querySelector('vICMS')?.textContent || '0');
                }
            }

            // Extrair PIS
            let pisData = { base: 0, aliquota: 0, valor: 0 };
            if (pis) {
                const pisAliq = pis.querySelector('PISAliq');
                const pisQtde = pis.querySelector('PISQtde');
                const pisNode = pisAliq || pisQtde;
                if (pisNode) {
                    pisData.base = parseFloat(pisNode.querySelector('vBC')?.textContent || pisNode.querySelector('vAliqProd')?.textContent || '0');
                    pisData.aliquota = parseFloat(pisNode.querySelector('pPIS')?.textContent || '0');
                    pisData.valor = parseFloat(pisNode.querySelector('vPIS')?.textContent || '0');
                }
            }

            // Extrair COFINS
            let cofinsData = { base: 0, aliquota: 0, valor: 0 };
            if (cofins) {
                const cofinsAliq = cofins.querySelector('COFINSAliq');
                const cofinsQtde = cofins.querySelector('COFINSQtde');
                const cofinsNode = cofinsAliq || cofinsQtde;
                if (cofinsNode) {
                    cofinsData.base = parseFloat(cofinsNode.querySelector('vBC')?.textContent || cofinsNode.querySelector('vAliqProd')?.textContent || '0');
                    cofinsData.aliquota = parseFloat(cofinsNode.querySelector('pCOFINS')?.textContent || '0');
                    cofinsData.valor = parseFloat(cofinsNode.querySelector('vCOFINS')?.textContent || '0');
                }
            }

            // Extrair IPI
            let ipiData = { base: 0, aliquota: 0, valor: 0 };
            if (ipi) {
                const ipiNode = ipi.querySelector('IPITrib');
                if (ipiNode) {
                    ipiData.base = parseFloat(ipiNode.querySelector('vBC')?.textContent || '0');
                    ipiData.aliquota = parseFloat(ipiNode.querySelector('pIPI')?.textContent || '0');
                    ipiData.valor = parseFloat(ipiNode.querySelector('vIPI')?.textContent || '0');
                }
            }

            items.push({
                codigo, // cProd
                descricao, // xProd
                ncm,
                cest: cest || undefined,
                gtin: gtin || undefined, // cEAN
                cfop: cfopItem,
                unidade, // uCom
                quantidade, // qCom
                valor_unitario: valorUnitario, // vUnCom
                desconto,
                total: valorTotal, // vProd
                origem: origem || undefined,
                cst,
                csosn,
                icms: icmsData,
                pis: pisData,
                cofins: cofinsData,
                ipi: ipiData,
            });
        });

        // Extrair totais
        const valorProdutos = parseFloat(ICMSTot?.querySelector('vProd')?.textContent || '0');
        const valorDesconto = parseFloat(ICMSTot?.querySelector('vDesc')?.textContent || '0');
        const valorFrete = parseFloat(ICMSTot?.querySelector('vFrete')?.textContent || '0');
        const valorSeguro = parseFloat(ICMSTot?.querySelector('vSeg')?.textContent || '0');
        const valorOutras = parseFloat(ICMSTot?.querySelector('vOutro')?.textContent || '0');
        const valorICMS = parseFloat(ICMSTot?.querySelector('vICMS')?.textContent || '0');
        const valorPIS = parseFloat(ICMSTot?.querySelector('vPIS')?.textContent || '0');
        const valorCOFINS = parseFloat(ICMSTot?.querySelector('vCOFINS')?.textContent || '0');
        const valorTotalNF = parseFloat(ICMSTot?.querySelector('vNF')?.textContent || '0');

        // Extrair CNPJ do destinatário
        const destCNPJ = dest?.querySelector('CNPJ')?.textContent || dest?.querySelector('CPF')?.textContent || '';
        const destCNPJClean = destCNPJ.replace(/\D/g, '');

        // Extrair duplicatas (faturas)
        const duplicatas: Array<{ numero: string; vencimento: string; valor: number }> = [];
        if (cobr) {
            const dups = cobr.querySelectorAll('dup');
            dups.forEach((dup) => {
                const numero = dup.querySelector('nDup')?.textContent || '';
                const vencimento = dup.querySelector('dVenc')?.textContent || '';
                const valor = parseFloat(dup.querySelector('vDup')?.textContent || '0');
                if (numero && vencimento && valor > 0) {
                    duplicatas.push({ numero, vencimento, valor });
                }
            });
        }

        // Se não houver duplicatas, criar uma única parcela com o valor total
        if (duplicatas.length === 0 && valorTotalNF > 0) {
            duplicatas.push({
                numero: '001',
                vencimento: dataEmissao,
                valor: valorTotalNF,
            });
        }

        return {
            type: 'nfe',
            direction,
            numero,
            serie,
            chave_acesso: chave,
            data_emissao: dataEmissao,
            data_entrada: dataEmissao,
            cfop,
            natureza_operacao: natOp,
            finalidade,
            tipo_entrada,
            fornecedor: {
                cnpj: emitCNPJ.replace(/\D/g, ''),
                razao_social: emitRazao,
                inscricao_estadual: emitIE,
                endereco: `${emitLogradouro}, ${emitNumero}`.trim(),
                cidade: emitCidade,
                uf: emitUF,
                cep: emitCEP,
            },
            items,
            totais: {
                total_produtos: valorProdutos,
                total_descontos: valorDesconto,
                total_impostos: valorICMS + valorPIS + valorCOFINS,
                frete: valorFrete,
                seguro: valorSeguro,
                outras_despesas: valorOutras,
                valor_total_nf: valorTotalNF,
                valor_icms: valorICMS,
                valor_pis: valorPIS,
                valor_cofins: valorCOFINS,
                valor_iss: 0,
            },
            duplicatas,
            destinatario_cnpj: destCNPJClean,
        };
    };

    const parseNFSeXML = (xml: string): ParsedXMLInvoice => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML inválido ou malformado.');
        }

        let infRps: Element | null = null;
        const loteRps = doc.querySelector('LoteRps');
        if (loteRps) {
            const listaRps = loteRps.querySelector('ListaRps');
            if (listaRps) {
                const rps = listaRps.querySelector('Rps');
                if (rps) {
                    infRps = rps.querySelector('InfRps');
                }
            }
        }
        if (!infRps) {
            infRps = doc.querySelector('InfRps');
        }
        if (!infRps) {
            throw new Error('InfRps não encontrado no XML.');
        }

        const servico = infRps.querySelector('Servico');
        const valores = servico?.querySelector('Valores');
        const prestador = infRps.querySelector('Prestador');
        const tomador = infRps.querySelector('Tomador');

        const identificacaoRps = infRps.querySelector('IdentificacaoRps');
        const numero = identificacaoRps?.querySelector('Numero')?.textContent || '0';
        const serie = identificacaoRps?.querySelector('Serie')?.textContent || 'A';
        const dataEmissao = infRps.querySelector('DataEmissao')?.textContent || new Date().toISOString();
        const dataEmissaoFormatted = dataEmissao.split('T')[0];

        const valorServicos = parseFloat(valores?.querySelector('ValorServicos')?.textContent || '0');
        const valorIss = parseFloat(valores?.querySelector('ValorIss')?.textContent || '0');
        const valorPis = parseFloat(valores?.querySelector('ValorPis')?.textContent || '0');
        const valorCofins = parseFloat(valores?.querySelector('ValorCofins')?.textContent || '0');
        const baseCalculo = parseFloat(valores?.querySelector('BaseCalculo')?.textContent || valorServicos.toString());
        const aliquota = parseFloat(valores?.querySelector('Aliquota')?.textContent || '0');

        const discriminacao = servico?.querySelector('Discriminacao')?.textContent || 'Serviço prestado';
        const itemListaServico = servico?.querySelector('ItemListaServico')?.textContent || '';
        const codigoCnae = servico?.querySelector('CodigoCnae')?.textContent || '';

        let cnpjPrestador = prestador?.querySelector('Cnpj')?.textContent || '';
        if (!cnpjPrestador && loteRps) {
            cnpjPrestador = loteRps.querySelector('Cnpj')?.textContent || '';
        }
        if (!cnpjPrestador) {
            throw new Error('CNPJ do prestador não encontrado no XML.');
        }

        const inscricaoMunicipal = prestador?.querySelector('InscricaoMunicipal')?.textContent || '';
        const razaoSocialPrestador = prestador?.querySelector('RazaoSocial')?.textContent || `Fornecedor ${cnpjPrestador.replace(/\D/g, '').slice(0, 8)}`;

        return {
            type: 'nfse',
            direction: 'entrada',
            numero,
            serie: `50 - Serviço`,
            chave_acesso: '',
            data_emissao: dataEmissaoFormatted,
            data_entrada: dataEmissaoFormatted,
            cfop: '',
            natureza_operacao: discriminacao,
            finalidade: 'Normal',
            tipo_entrada: 'Serviço tomado (NFS-e)',
            fornecedor: {
                cnpj: cnpjPrestador.replace(/\D/g, ''),
                razao_social: razaoSocialPrestador,
                inscricao_estadual: inscricaoMunicipal,
            },
            items: [{
                codigo: itemListaServico || '1401',
                descricao: discriminacao,
                ncm: codigoCnae || '00000000',
                cfop: '',
                unidade: 'UN',
                quantidade: 1,
                valor_unitario: valorServicos,
                desconto: 0,
                total: valorServicos,
                iss: {
                    base: baseCalculo,
                    aliquota: aliquota * 100,
                    valor: valorIss,
                },
                pis: {
                    base: valorServicos,
                    aliquota: 0,
                    valor: valorPis,
                },
                cofins: {
                    base: valorServicos,
                    aliquota: 0,
                    valor: valorCofins,
                },
            }],
            totais: {
                total_produtos: 0,
                total_descontos: 0,
                total_impostos: valorIss + valorPis + valorCofins,
                frete: 0,
                seguro: 0,
                outras_despesas: 0,
                valor_total_nf: valorServicos,
                valor_icms: 0,
                valor_pis: valorPis,
                valor_cofins: valorCofins,
                valor_iss: valorIss,
            },
        };
    };

    const validateXML = async (parsed: ParsedXMLInvoice & { destinatario_cnpj?: string }): Promise<ValidationReport> => {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const corrections: ValidationError[] = [];

        // Validar chave de acesso (NFe)
        if (parsed.type === 'nfe') {
            if (!parsed.chave_acesso || parsed.chave_acesso.length !== 44) {
                errors.push({
                    type: 'error',
                    field: 'chave_acesso',
                    message: 'Chave de acesso inválida (deve ter 44 dígitos)',
                    originalValue: parsed.chave_acesso,
                });
            } else {
                // Verificar duplicidade no banco - buscar em nf_entrada
                const { data: existingNotes } = await supabase
                    .from('nf_entrada')
                    .select('id, numero, serie')
                    .eq('chave_acesso', parsed.chave_acesso)
                    .eq('company_id', profile?.company_id)
                    .limit(1);

                // Se não encontrar por chave, buscar por número e série
                if (!existingNotes || existingNotes.length === 0) {
                    const { data: notesByNumber } = await supabase
                        .from('nf_entrada')
                        .select('id, numero, serie')
                        .eq('numero', parsed.numero)
                        .eq('serie', parsed.serie)
                        .eq('company_id', profile?.company_id)
                        .limit(1);

                    if (notesByNumber && notesByNumber.length > 0) {
                        errors.push({
                            type: 'error',
                            field: 'chave_acesso',
                            message: `Esta nota fiscal já foi importada anteriormente (Nº ${notesByNumber[0].numero}, Série ${notesByNumber[0].serie})`,
                            originalValue: parsed.chave_acesso,
                        });
                    }
                } else {
                    errors.push({
                        type: 'error',
                        field: 'chave_acesso',
                        message: `Esta nota fiscal já foi importada anteriormente (Nº ${existingNotes[0].numero}, Série ${existingNotes[0].serie})`,
                        originalValue: parsed.chave_acesso,
                    });
                }
            }

            // Validar CNPJ do destinatário
            if (parsed.destinatario_cnpj) {
                // Buscar CNPJ da empresa no perfil
                const { data: companyData } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', profile?.id)
                    .single();

                if (companyData) {
                    // Buscar CNPJ da empresa (assumindo que existe uma tabela companies ou similar)
                    // Por enquanto, vamos apenas verificar se o CNPJ do destinatário está presente
                    if (parsed.destinatario_cnpj.length !== 14 && parsed.destinatario_cnpj.length !== 11) {
                        warnings.push({
                            type: 'warning',
                            field: 'destinatario.cnpj',
                            message: 'CNPJ/CPF do destinatário pode estar incorreto',
                            originalValue: parsed.destinatario_cnpj,
                        });
                    }
                }
            }
        }

        // Validar CNPJ do fornecedor
        const cnpjClean = parsed.fornecedor.cnpj.replace(/\D/g, '');
        if (cnpjClean.length !== 14 && cnpjClean.length !== 11) {
            errors.push({
                type: 'error',
                field: 'fornecedor.cnpj',
                message: 'CNPJ/CPF do fornecedor inválido',
                originalValue: parsed.fornecedor.cnpj,
            });
        }

        // Validar e corrigir NCM
        parsed.items.forEach((item, index) => {
            const ncmClean = item.ncm.replace(/\D/g, '');
            if (ncmClean.length !== 8) {
                corrections.push({
                    type: 'info',
                    field: `items[${index}].ncm`,
                    message: 'NCM inválido, será corrigido para 00000000',
                    originalValue: item.ncm,
                    correctedValue: '00000000',
                });
                item.ncm = '00000000';
            }

            // Validar CFOP (NFe)
            if (parsed.type === 'nfe' && item.cfop) {
                const cfopClean = item.cfop.replace(/\D/g, '');
                if (cfopClean.length < 4 || cfopClean.length > 6) {
                    warnings.push({
                        type: 'warning',
                        field: `items[${index}].cfop`,
                        message: 'CFOP pode estar incorreto',
                        originalValue: item.cfop,
                    });
                } else if (!cfopClean.startsWith('1') && !cfopClean.startsWith('2') && !cfopClean.startsWith('3') && !cfopClean.startsWith('5') && !cfopClean.startsWith('6') && !cfopClean.startsWith('7')) {
                    // Tentar corrigir CFOP para entrada
                    const cfopNum = parseInt(cfopClean);
                    if (cfopNum >= 5100 && cfopNum <= 5999) {
                        const correctedCFOP = String(cfopNum - 1000);
                        corrections.push({
                            type: 'info',
                            field: `items[${index}].cfop`,
                            message: 'CFOP ajustado para entrada',
                            originalValue: item.cfop,
                            correctedValue: correctedCFOP,
                        });
                        item.cfop = correctedCFOP;
                    }
                }
            }
        });

        // Validar totais
        const calculatedTotal = parsed.items.reduce((sum, item) => sum + item.total, 0) + parsed.totais.frete + parsed.totais.seguro + parsed.totais.outras_despesas - parsed.totais.total_descontos;
        if (Math.abs(calculatedTotal - parsed.totais.valor_total_nf) > 0.01) {
            warnings.push({
                type: 'warning',
                field: 'totais.valor_total_nf',
                message: `Total calculado (${calculatedTotal.toFixed(2)}) diverge do total da nota (${parsed.totais.valor_total_nf.toFixed(2)})`,
                originalValue: parsed.totais.valor_total_nf,
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            corrections,
            summary: {
                totalErrors: errors.length,
                totalWarnings: warnings.length,
                totalCorrections: corrections.length,
            },
        };
    };

    const mapXMLToForm = async (parsed: ParsedXMLInvoice & { duplicatas?: Array<{ numero: string; vencimento: string; valor: number }> }): Promise<void> => {
        // Buscar ou criar fornecedor
        let supplierId = note.fornecedor_id || '';

        if (parsed.fornecedor.cnpj) {
            const { data: existingSuppliers } = await supabase
                .from('suppliers')
                .select('id')
                .eq('cpf_cnpj', parsed.fornecedor.cnpj)
                .eq('company_id', profile?.company_id)
                .limit(1);

            if (existingSuppliers && existingSuppliers.length > 0) {
                supplierId = existingSuppliers[0].id;
            } else {
                // Criar novo fornecedor
                const { data: newSupplier } = await supabase
                    .from('suppliers')
                    .insert([{
                        company_id: profile?.company_id,
                        tipo_pessoa: parsed.fornecedor.cnpj.length === 14 ? 'PJ' : 'PF',
                        nome_razao: parsed.fornecedor.razao_social,
                        cpf_cnpj: parsed.fornecedor.cnpj,
                        ie: parsed.fornecedor.inscricao_estadual || null,
                        logradouro: parsed.fornecedor.endereco?.split(',')[0] || null,
                        numero: parsed.fornecedor.endereco?.split(',')[1]?.trim() || null,
                        cidade: parsed.fornecedor.cidade || null,
                        uf: parsed.fornecedor.uf || null,
                        cep: parsed.fornecedor.cep || null,
                        ativo: true,
                    }])
                    .select()
                    .single();

                if (newSupplier) {
                    supplierId = newSupplier.id;
                    // Recarregar lista de fornecedores
                    await loadData();
                }
            }
        }

        // Mapear itens com campos fiscais e internos + buscar vínculos automaticamente
        const supplierCnpj = parsed.fornecedor.cnpj.replace(/\D/g, '');
        const mappedItemsPromises = parsed.items.map(async (item) => {
            // Campos fiscais (travados - vêm do XML)
            const quantidadeFiscal = item.quantidade;
            const valorUnitarioFiscal = item.valor_unitario;
            const valorTotalFiscal = item.total;
            const unidadeFiscal = item.unidade;
            const supplierProductCode = item.codigo || ''; // cProd

            // Buscar vínculo existente
            let produtoId = '';
            let linkStatus: 'pending' | 'linked' | 'created' | 'ignored' = 'pending';
            let linkId: string | undefined = undefined;

            if (supplierCnpj && supplierProductCode && profile?.company_id) {
                const link = await productLinkService.findLink(
                    profile.company_id,
                    supplierCnpj,
                    supplierProductCode
                );

                if (link && link.internal_product_id) {
                    produtoId = link.internal_product_id;
                    linkStatus = 'linked';
                    linkId = link.id;
                }
            }

            // Campos internos (inicialmente iguais aos fiscais, mas editáveis)
            const quantidadeInterna = quantidadeFiscal;
            const unidadeInterna = unidadeFiscal;
            const fatorConversao = 1; // Inicialmente 1:1
            const valorUnitarioInterno = valorUnitarioFiscal;

            return {
                produto_id: produtoId,
                ncm: item.ncm,
                unidade: unidadeFiscal, // Mantido para compatibilidade
                quantidade: quantidadeFiscal, // Mantido para compatibilidade
                valor_unitario: valorUnitarioFiscal, // Mantido para compatibilidade
                desconto: item.desconto,
                total: valorTotalFiscal, // Mantido para compatibilidade
                // Campos fiscais (travados)
                quantidade_fiscal: quantidadeFiscal,
                valor_unitario_fiscal: valorUnitarioFiscal,
                valor_total_fiscal: valorTotalFiscal,
                unidade_fiscal: unidadeFiscal,
                // Campos internos (editáveis)
                quantidade_interna: quantidadeInterna,
                unidade_interna: unidadeInterna,
                fator_conversao: fatorConversao,
                valor_unitario_interno: valorUnitarioInterno,
                // Campos de vinculação
                supplier_cnpj: supplierCnpj,
                supplier_product_code: supplierProductCode,
                fiscal_description: item.descricao,
                gtin: item.gtin,
                cest: item.cest,
                origem: item.origem,
                link_status: linkStatus,
                link_id: linkId,
                impostos: {
                    icms: item.icms || { base: 0, aliquota: 0, valor: 0 },
                    st_mva: 0,
                    pis: item.pis?.valor || 0,
                    cofins: item.cofins?.valor || 0,
                    ipi: item.ipi?.valor || 0,
                },
            };
        });

        const mappedItems = await Promise.all(mappedItemsPromises);

        // Verificar se há itens pendentes de vinculação
        const pendingItems = mappedItems.filter(item => item.link_status === 'pending');
        if (pendingItems.length > 0) {
            // Mostrar diálogo de vinculação para o primeiro item pendente
            const firstPendingIndex = mappedItems.findIndex(item => item.link_status === 'pending');
            setCurrentLinkItemIndex(firstPendingIndex);
            await loadLinkSuggestions(firstPendingIndex);
            setShowLinkDialog(true);
        }

        // Atualizar estado do formulário
        setNote({
            numero: parsed.numero,
            serie: parsed.serie,
            chave_acesso: parsed.chave_acesso,
            data_emissao: parsed.data_emissao,
            data_entrada: parsed.data_entrada,
            fornecedor_id: supplierId,
            cfop: parsed.cfop,
            natureza_operacao: parsed.natureza_operacao,
            finalidade: parsed.finalidade,
            tipo_entrada: parsed.tipo_entrada as any,
            items: mappedItems,
            totais: {
                total_produtos: parsed.totais.total_produtos,
                total_descontos: parsed.totais.total_descontos,
                total_impostos: parsed.totais.total_impostos,
                frete: parsed.totais.frete,
                seguro: parsed.totais.seguro,
                outras_despesas: parsed.totais.outras_despesas,
                valor_total_nf: parsed.totais.valor_total_nf,
            },
            status: 'Rascunho',
        });

        // Travar campos fiscais após importar XML
        const fiscalFields = new Set([
            'chave_acesso',
            'numero',
            'serie',
            'fornecedor_id',
            'cfop',
            'natureza_operacao',
            'finalidade',
            'data_emissao',
        ]);
        setLockedFields(fiscalFields);
        setXmlImported(true);

        // Salvar duplicatas se existirem
        if ('duplicatas' in parsed && parsed.duplicatas) {
            setDuplicatas(parsed.duplicatas);
        }

        // Recalcular totais
        calculateTotals({
            ...note,
            items: mappedItems,
            totais: {
                total_produtos: parsed.totais.total_produtos,
                total_descontos: parsed.totais.total_descontos,
                total_impostos: parsed.totais.total_impostos,
                frete: parsed.totais.frete,
                seguro: parsed.totais.seguro,
                outras_despesas: parsed.totais.outras_despesas,
                valor_total_nf: parsed.totais.valor_total_nf,
            },
        });
    };

    const generateEntryJSON = (parsed: ParsedXMLInvoice, supplierId: string) => {
        return {
            nota: {
                numero: parsed.numero,
                serie: parsed.serie,
                chave_acesso: parsed.chave_acesso,
                data_emissao: parsed.data_emissao,
                data_entrada: parsed.data_entrada,
                cfop: parsed.cfop,
                natureza_operacao: parsed.natureza_operacao,
                finalidade: parsed.finalidade,
                tipo_entrada: parsed.tipo_entrada,
                tipo: parsed.type,
                direction: parsed.direction,
            },
            fornecedor: {
                id: supplierId,
                cnpj: parsed.fornecedor.cnpj,
                razao_social: parsed.fornecedor.razao_social,
            },
            itens: parsed.items.map((item) => ({
                codigo: item.codigo,
                descricao: item.descricao,
                ncm: item.ncm,
                cfop: item.cfop,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                total: item.total,
                impostos: {
                    icms: item.icms,
                    pis: item.pis,
                    cofins: item.cofins,
                    ipi: item.ipi,
                    iss: item.iss,
                },
            })),
            totais: parsed.totais,
            status: validationReport?.isValid ? 'pronto_para_salvar' : 'nao_aprovado',
        };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xml')) {
            toast({
                title: 'Erro',
                description: 'Por favor, selecione um arquivo XML.',
                variant: 'destructive',
            });
            return;
        }

        setProcessingXML(true);
        setValidationReport(null);
        setEntryJSON(null);

        try {
            // 1. Ler XML
            const xmlContent = await readXML(file);

            // 2. Identificar tipo e parsear
            const isNFSe = xmlContent.includes('EnviarLoteRpsEnvio') ||
                xmlContent.includes('LoteRps') ||
                xmlContent.includes('InfRps') ||
                xmlContent.includes('Rps');
            const isNFe = !isNFSe && (xmlContent.includes('<NFe') || xmlContent.includes('infNFe'));

            if (!isNFSe && !isNFe) {
                throw new Error('Tipo de XML não reconhecido. Deve ser NFe ou NFSe.');
            }

            const parsed = isNFSe ? parseNFSeXML(xmlContent) : parseNFeXML(xmlContent);

            // 3. Validar
            const validation = await validateXML(parsed);
            setValidationReport(validation);

            // 4. Mapear para formulário
            await mapXMLToForm(parsed);

            // 5. Gerar JSON final
            const supplierId = note.fornecedor_id || '';
            const json = generateEntryJSON(parsed, supplierId);
            setEntryJSON(json);

            // 6. Mostrar resultado
            if (validation.isValid) {
                toast({
                    title: 'XML Importado',
                    description: 'Dados preenchidos automaticamente. Revise e clique em Salvar.',
                });
            } else {
                toast({
                    title: 'XML Processado com Erros',
                    description: `Encontrados ${validation.summary.totalErrors} erro(s) e ${validation.summary.totalWarnings} aviso(s).`,
                    variant: 'destructive',
                });
                setShowErrorsDialog(true);
            }
        } catch (error: any) {
            console.error('Erro ao processar XML:', error);
            toast({
                title: 'Erro ao Processar XML',
                description: error.message || 'Falha ao ler o arquivo XML.',
                variant: 'destructive',
            });
        } finally {
            setProcessingXML(false);
            // Limpar input para permitir selecionar o mesmo arquivo novamente
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const displayErrors = () => {
        if (!validationReport) return null;

        return (
            <Dialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Relatório de Validação do XML</DialogTitle>
                        <DialogDescription>
                            Revise os erros, avisos e correções aplicadas automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {/* Resumo */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-destructive">
                                        {validationReport.summary.totalErrors}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Erros</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-warning">
                                        {validationReport.summary.totalWarnings}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Avisos</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-primary">
                                        {validationReport.summary.totalCorrections}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Correções</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Erros */}
                        {validationReport.errors.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-destructive" />
                                    Erros Encontrados
                                </h3>
                                {validationReport.errors.map((error, index) => (
                                    <Alert key={index} variant="destructive">
                                        <AlertTitle>{error.field}</AlertTitle>
                                        <AlertDescription>
                                            {error.message}
                                            {error.originalValue && (
                                                <div className="mt-1 text-xs">
                                                    Valor: {String(error.originalValue)}
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                ))}
                            </div>
                        )}

                        {/* Avisos */}
                        {validationReport.warnings.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-warning" />
                                    Avisos
                                </h3>
                                {validationReport.warnings.map((warning, index) => (
                                    <Alert key={index}>
                                        <AlertTitle>{warning.field}</AlertTitle>
                                        <AlertDescription>{warning.message}</AlertDescription>
                                    </Alert>
                                ))}
                            </div>
                        )}

                        {/* Correções */}
                        {validationReport.corrections.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    Correções Automáticas
                                </h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Campo</TableHead>
                                            <TableHead>Original</TableHead>
                                            <TableHead>Corrigido</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {validationReport.corrections.map((correction, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{correction.field}</TableCell>
                                                <TableCell>{String(correction.originalValue || '-')}</TableCell>
                                                <TableCell className="text-primary font-semibold">
                                                    {String(correction.correctedValue || '-')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {validationReport.isValid && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Validação Concluída</AlertTitle>
                                <AlertDescription>
                                    O XML foi validado e está pronto para salvar.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    // ========== FUNÇÕES DE VINCULAÇÃO ==========

    const loadLinkSuggestions = async (itemIndex: number) => {
        const item = note.items?.[itemIndex];
        if (!item || !profile?.company_id) return;

        setLinkLoading(true);
        try {
            const suggestions = await productLinkService.findSuggestions(profile.company_id, {
                ncm: item.ncm,
                gtin: item.gtin,
                description: item.fiscal_description,
            });
            setLinkSuggestions(suggestions);
        } catch (error) {
            console.error('Erro ao carregar sugestões:', error);
            setLinkSuggestions([]);
        } finally {
            setLinkLoading(false);
        }
    };

    const handleLinkProduct = async (productId: string) => {
        if (currentLinkItemIndex === null) return;
        const item = note.items?.[currentLinkItemIndex];
        if (!item || !profile?.company_id || !item.supplier_cnpj || !item.supplier_product_code) return;

        setLinkLoading(true);
        try {
            const link = await productLinkService.createLink(
                profile.company_id,
                item.supplier_cnpj,
                item.supplier_product_code,
                productId,
                {
                    fiscal_description: item.fiscal_description,
                    ncm: item.ncm,
                    cest: item.cest,
                    gtin: item.gtin,
                    fiscal_unit: item.unidade_fiscal,
                },
                profile.id
            );

            // Atualizar item
            const newItems = [...(note.items || [])];
            newItems[currentLinkItemIndex] = {
                ...item,
                produto_id: productId,
                link_status: 'linked',
                link_id: link.id,
            };

            setNote({ ...note, items: newItems });
            // Limpar estados de busca
            setSelectedProductToLink(null);
            setProductSearchInput('');
            setProductSearchOpen(false);
            handleNextPendingItem(newItems);
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message || 'Erro ao vincular produto', variant: 'destructive' });
        } finally {
            setLinkLoading(false);
        }
    };


    const handleIgnoreItem = async () => {
        if (currentLinkItemIndex === null) return;
        const item = note.items?.[currentLinkItemIndex];
        if (!item || !profile?.company_id || !item.supplier_cnpj || !item.supplier_product_code) return;

        setLinkLoading(true);
        try {
            await productLinkService.markAsIgnored(
                profile.company_id,
                item.supplier_cnpj,
                item.supplier_product_code,
                {
                    fiscal_description: item.fiscal_description,
                    ncm: item.ncm,
                    cest: item.cest,
                    gtin: item.gtin,
                },
                profile.id
            );

            // Atualizar item
            const newItems = [...(note.items || [])];
            newItems[currentLinkItemIndex] = {
                ...item,
                link_status: 'ignored',
            };

            setNote({ ...note, items: newItems });
            handleNextPendingItem(newItems);
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message || 'Erro ao ignorar item', variant: 'destructive' });
        } finally {
            setLinkLoading(false);
        }
    };

    const handleNextPendingItem = (currentItems?: EntryNoteItem[]) => {
        const itemsToCheck = currentItems || note.items || [];
        const pendingItems = itemsToCheck.map((item, index) => ({ item, index })).filter(({ item }) => item.link_status === 'pending');

        if (pendingItems.length > 0) {
            const nextIndex = pendingItems[0].index;
            setCurrentLinkItemIndex(nextIndex);
            loadLinkSuggestions(nextIndex);
        } else {
            setShowLinkDialog(false);
            setCurrentLinkItemIndex(null);
            toast({ title: 'Sucesso', description: 'Todos os itens foram vinculados!' });
        }
    };

    const getPendingItemsCount = () => {
        return note.items?.filter(item =>
            item.link_status === 'pending' ||
            (!item.produto_id && item.link_status !== 'ignored')
        ).length || 0;
    };

    const canLaunch = () => {
        if (!note.items || note.items.length === 0) return false;
        // Verificar se há itens pendentes de vinculação
        const pendingItems = note.items.filter(item =>
            // Item é pendente se:
            // 1. Não foi ignorado E
            // 2. (Está marcado como pendente OU Não tem produto vinculado)
            item.link_status !== 'ignored' &&
            (item.link_status === 'pending' || !item.produto_id)
        );
        return pendingItems.length === 0;
    };

    // Funções para download e anexo
    const handleDownloadXML = async () => {
        if (!note.id || !note.xml) {
            toast({ title: 'Erro', description: 'XML não disponível para download', variant: 'destructive' });
            return;
        }

        try {
            const blob = new Blob([note.xml], { type: 'application/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `NF_${note.numero || 'NFe'}_${note.serie || ''}.xml`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: 'Sucesso', description: 'XML baixado com sucesso' });
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const handleDownloadDANFE = async () => {
        if (!note.id) {
            toast({ title: 'Erro', description: 'Nota não salva ainda', variant: 'destructive' });
            return;
        }

        try {
            // Buscar a nota completa do banco
            const noteData = await entryNoteService.getById(note.id);
            if (!noteData.xml) {
                toast({ title: 'Erro', description: 'XML não encontrado para gerar DANFE', variant: 'destructive' });
                return;
            }

            // Formatar XML para melhor visualização
            let formattedXML = noteData.xml;
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(noteData.xml, 'text/xml');
                const serializer = new XMLSerializer();
                formattedXML = serializer.serializeToString(xmlDoc);
            } catch (e) {
                // Se não conseguir formatar, usar XML original
                console.warn('Não foi possível formatar XML:', e);
            }
            
            // Criar blob e abrir em nova aba
            const blob = new Blob([formattedXML], { type: 'application/xml' });
            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            
            if (!newWindow) {
                // Se popup foi bloqueado, fazer download
                const a = document.createElement('a');
                a.href = url;
                a.download = `DANFE_${note.numero || 'NFe'}_${note.serie || ''}.xml`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
            
            toast({ 
                title: 'Info', 
                description: 'DANFE em PDF será implementado em breve. Por enquanto, abrindo XML formatado.' 
            });
        } catch (error: any) {
            console.error('Erro ao gerar DANFE:', error);
            toast({ title: 'Erro', description: error.message || 'Erro ao gerar DANFE', variant: 'destructive' });
        }
    };

    const handleAttachDocument = async () => {
        if (!note.id) {
            toast({ title: 'Erro', description: 'Salve a nota primeiro antes de anexar documentos', variant: 'destructive' });
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.xml,.doc,.docx';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                // Verificar se o bucket existe, se não existir, criar ou usar alternativa
                const fileExt = file.name.split('.').pop();
                const fileName = `${note.id}/${Date.now()}_${file.name}`;
                
                // Tentar fazer upload
                const { data, error } = await supabase.storage
                    .from('nf-documents')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    // Se o bucket não existir, tentar criar ou usar uma alternativa
                    if (error.message.includes('not found') || error.message.includes('Bucket')) {
                        toast({ 
                            title: 'Aviso', 
                            description: 'Bucket de storage não configurado. Configure o bucket "nf-documents" no Supabase Storage.', 
                            variant: 'destructive' 
                        });
                        return;
                    }
                    throw error;
                }

                // Obter URL pública
                const { data: { publicUrl } } = supabase.storage
                    .from('nf-documents')
                    .getPublicUrl(fileName);

                // Aqui você pode salvar a referência do documento na tabela nf_entrada
                // Por exemplo, adicionar um campo documentos_anexos JSONB
                toast({ 
                    title: 'Sucesso', 
                    description: `Documento "${file.name}" anexado com sucesso` 
                });
            } catch (error: any) {
                console.error('Erro ao anexar documento:', error);
                toast({ 
                    title: 'Erro', 
                    description: error.message || 'Erro ao anexar documento', 
                    variant: 'destructive' 
                });
            }
        };
        input.click();
    };

    const getStatusBadge = () => {
        const status = note.status || 'Rascunho';
        const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
            'Rascunho': { label: 'Rascunho', variant: 'outline', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
            'Em Digitação': { label: 'Em Digitação', variant: 'outline', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
            'Lançada': { label: 'Lançada', variant: 'outline', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            'Cancelada': { label: 'Cancelada', variant: 'destructive', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
        };

        const config = statusConfig[status] || statusConfig['Rascunho'];
        return (
            <Badge variant={config.variant} className={config.className}>
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/fiscal')}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">
                            {note.id ? `Nota de Entrada #${note.numero || note.id.substring(0, 8)}` : 'Nova Nota de Entrada'}
                        </h1>
                        {getStatusBadge()}
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Botões de download/anexo - só aparecem se a nota já foi salva */}
                    {note.id && (
                        <>
                            {note.xml && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleDownloadXML}
                                    title="Baixar XML"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleDownloadDANFE}
                                title="Baixar/Imprimir DANFE"
                            >
                                <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleAttachDocument}
                                title="Anexar Documento"
                            >
                                <Paperclip className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowSefazModal(true)}
                        disabled={processingXML}
                    >
                        <CloudDownload className="w-4 h-4" />
                        Importar XML / Consultar SEFAZ
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleXMLUpload}
                        disabled={processingXML}
                    >
                        {processingXML ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Upload XML
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".xml"
                            onChange={handleFileChange}
                        />
                    </Button>
                    {validationReport && !validationReport.isValid && (
                        <Button variant="outline" onClick={() => setShowErrorsDialog(true)}>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Ver Erros ({validationReport.summary.totalErrors})
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleValidate}>Validar</Button>
                    <Button onClick={handleSave} disabled={loading} variant="secondary">
                        <Save className="w-4 h-4 mr-2" /> Salvar NF
                    </Button>
                    <Button
                        onClick={handleLaunch}
                        disabled={loading || !canLaunch()}
                        className="bg-green-600 hover:bg-green-700"
                        title={!canLaunch() ? `Vincule todos os itens antes de lançar (${getPendingItemsCount()} pendente(s))` : ''}
                    >
                        <CheckCircle className="w-4 h-4 mr-2" /> Lançar Nota
                        {getPendingItemsCount() > 0 && (
                            <Badge variant="destructive" className="ml-2">{getPendingItemsCount()}</Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Indicador de status do XML */}
            {validationReport && (
                <Alert variant={validationReport.isValid ? "default" : "destructive"}>
                    {validationReport.isValid ? (
                        <>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>XML Processado com Sucesso</AlertTitle>
                            <AlertDescription>
                                {validationReport.summary.totalCorrections > 0 && (
                                    <span>{validationReport.summary.totalCorrections} correção(ões) aplicada(s) automaticamente. </span>
                                )}
                                Revise os dados e clique em "Salvar NF" para concluir.
                            </AlertDescription>
                        </>
                    ) : (
                        <>
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>XML Processado com Erros</AlertTitle>
                            <AlertDescription>
                                Encontrados {validationReport.summary.totalErrors} erro(s) e {validationReport.summary.totalWarnings} aviso(s).
                                Clique em "Ver Erros" para detalhes.
                            </AlertDescription>
                        </>
                    )}
                </Alert>
            )}

            {/* Alerta sobre campos travados */}
            {xmlImported && (
                <Alert>
                    <FileCode className="h-4 w-4" />
                    <AlertTitle>Campos Importados do XML</AlertTitle>
                    <AlertDescription>
                        Os campos fiscais (marcados com <Badge variant="outline" className="text-xs mx-1"><FileCode className="w-3 h-3 mr-1" />XML</Badge>) estão travados e não podem ser editados, pois vêm diretamente do XML da nota fiscal.
                        Você pode editar apenas os campos internos: código do produto, centro de custo, natureza financeira, conta bancária, local de estoque, lote/validade e observações.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vínculos (Show only if Devolução or similar) */}
                {(note.tipo_entrada?.includes('Devolução') || note.tipo_entrada?.includes('Retorno')) && (
                    <Card className="lg:col-span-3">
                        <CardHeader><CardTitle>Vínculos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label>Orçamento de Venda (Origem)</Label>
                                <Select onValueChange={v => console.log('Selected sale:', v)}>
                                    <SelectTrigger><SelectValue placeholder="Selecione a venda original" /></SelectTrigger>
                                    <SelectContent>
                                        {sales.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                #{s.sale_number} - {s.customer?.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dados da Nota */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Dados da Nota</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Número *
                                {lockedFields.has('numero') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                value={note.numero || ''}
                                onChange={e => setNote({ ...note, numero: e.target.value })}
                                disabled={lockedFields.has('numero')}
                                className={lockedFields.has('numero') ? 'bg-muted cursor-not-allowed' : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Série *
                                {lockedFields.has('serie') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Select
                                value={note.serie}
                                onValueChange={v => setNote({ ...note, serie: v })}
                                disabled={lockedFields.has('serie')}
                            >
                                <SelectTrigger className={lockedFields.has('serie') ? 'bg-muted cursor-not-allowed' : ''}>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENTRY_NOTE_SERIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Entrada *</Label>
                            <Select value={note.tipo_entrada} onValueChange={v => setNote({ ...note, tipo_entrada: v as any })}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {ENTRY_NOTE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="flex items-center gap-2">
                                Chave de Acesso (44 dígitos)
                                {lockedFields.has('chave_acesso') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                maxLength={44}
                                value={note.chave_acesso || ''}
                                onChange={e => setNote({ ...note, chave_acesso: e.target.value })}
                                disabled={lockedFields.has('chave_acesso')}
                                className={lockedFields.has('chave_acesso') ? 'bg-muted cursor-not-allowed font-mono' : 'font-mono'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Emissão</Label>
                            <Input
                                type="date"
                                value={note.data_emissao?.split('T')[0] || ''}
                                onChange={e => setNote({ ...note, data_emissao: e.target.value })}
                                disabled={lockedFields.has('data_emissao')}
                                className={lockedFields.has('data_emissao') ? 'bg-muted' : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Entrada</Label>
                            <Input
                                type="date"
                                value={note.data_entrada?.split('T')[0] || ''}
                                onChange={e => setNote({ ...note, data_entrada: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Fornecedor */}
                <Card>
                    <CardHeader><CardTitle>Fornecedor</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Fornecedor *
                                {lockedFields.has('fornecedor_id') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Select
                                value={note.fornecedor_id}
                                onValueChange={v => setNote({ ...note, fornecedor_id: v })}
                                disabled={lockedFields.has('fornecedor_id')}
                            >
                                <SelectTrigger className={lockedFields.has('fornecedor_id') ? 'bg-muted cursor-not-allowed' : ''}>
                                    <SelectValue placeholder="Selecione o fornecedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.nome_razao || s.nome_fantasia}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Display Supplier Details if selected */}
                        {note.fornecedor_id && (() => {
                            const sup = suppliers.find(s => s.id === note.fornecedor_id);
                            return sup ? (
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>CNPJ: {sup.cpf_cnpj}</p>
                                    <p>IE: {sup.ie}</p>
                                    <p>{sup.cidade} - {sup.uf}</p>
                                </div>
                            ) : null;
                        })()}
                    </CardContent>
                </Card>

                {/* Dados Fiscais */}
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Dados Fiscais</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                CFOP
                                {lockedFields.has('cfop') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                value={note.cfop || ''}
                                onChange={e => setNote({ ...note, cfop: e.target.value })}
                                disabled={lockedFields.has('cfop')}
                                className={lockedFields.has('cfop') ? 'bg-muted cursor-not-allowed' : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Natureza da Operação
                                {lockedFields.has('natureza_operacao') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                value={note.natureza_operacao || ''}
                                onChange={e => setNote({ ...note, natureza_operacao: e.target.value })}
                                disabled={lockedFields.has('natureza_operacao')}
                                className={lockedFields.has('natureza_operacao') ? 'bg-muted cursor-not-allowed' : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Finalidade
                                {lockedFields.has('finalidade') && (
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                )}
                            </Label>
                            <Select
                                value={note.finalidade}
                                onValueChange={v => setNote({ ...note, finalidade: v as any })}
                                disabled={lockedFields.has('finalidade')}
                            >
                                <SelectTrigger className={lockedFields.has('finalidade') ? 'bg-muted cursor-not-allowed' : ''}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="Ajuste">Ajuste</SelectItem>
                                    <SelectItem value="Devolução">Devolução</SelectItem>
                                    <SelectItem value="Importação">Importação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Itens */}
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Itens da Nota</CardTitle>
                        <Button size="sm" onClick={handleAddItem}><Plus className="w-4 h-4 mr-2" /> Adicionar Item</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">Status</TableHead>
                                        <TableHead className="w-[120px]">Cód. Fabricação</TableHead>
                                        <TableHead className="w-[200px]">Produto</TableHead>
                                        <TableHead className="w-[80px]">NCM</TableHead>
                                        <TableHead className="w-[100px]">Un. Fiscal</TableHead>
                                        <TableHead className="w-[100px]">Qtd. Fiscal</TableHead>
                                        <TableHead className="w-[100px]">Vl. Unit. Fiscal</TableHead>
                                        <TableHead className="w-[100px]">Total Fiscal</TableHead>
                                        <TableHead className="w-[100px]">Un. Interna</TableHead>
                                        <TableHead className="w-[100px]">Qtd. Interna</TableHead>
                                        <TableHead className="w-[100px]">Fator</TableHead>
                                        <TableHead className="w-[100px]">Vl. Unit. Interno</TableHead>
                                        <TableHead className="w-[80px]">Local</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {note.items?.map((item, index) => {
                                        const quantidadeFiscal = item.quantidade_fiscal ?? item.quantidade;
                                        const valorUnitarioFiscal = item.valor_unitario_fiscal ?? item.valor_unitario;
                                        const valorTotalFiscal = item.valor_total_fiscal ?? item.total;
                                        const unidadeFiscal = item.unidade_fiscal ?? item.unidade;
                                        const quantidadeInterna = item.quantidade_interna ?? quantidadeFiscal;
                                        const unidadeInterna = item.unidade_interna ?? unidadeFiscal;
                                        const fatorConversao = item.fator_conversao ?? 1;
                                        const valorUnitarioInterno = item.valor_unitario_interno ?? valorUnitarioFiscal;
                                        const showWarning = quantidadeInterna < quantidadeFiscal;

                                        const linkStatus = item.link_status || (item.produto_id ? 'linked' : 'pending');
                                        const statusConfig = {
                                            linked: { label: 'Vinculado', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
                                            created: { label: 'Criado', icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
                                            ignored: { label: 'Ignorado', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
                                            pending: { label: 'Pendente', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
                                        };
                                        const status = statusConfig[linkStatus] || statusConfig.pending;

                                        return (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`${status.bg} ${status.color} border-0`}>
                                                            <status.icon className="w-3 h-3 mr-1" />
                                                            {status.label}
                                                        </Badge>
                                                        {(linkStatus === 'pending' || (!item.produto_id && item.link_status !== 'ignored')) && (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="bg-primary hover:bg-primary/90"
                                                                onClick={async () => {
                                                                    setCurrentLinkItemIndex(index);
                                                                    await loadLinkSuggestions(index);
                                                                    setShowLinkDialog(true);
                                                                }}
                                                                title="Vincular item ao produto"
                                                            >
                                                                <Link2 className="w-3 h-3 mr-1" />
                                                                Vincular
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-mono text-muted-foreground">
                                                        {item.supplier_product_code || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <ProductSearchCombobox
                                                        products={products}
                                                        value={item.produto_id ? String(item.produto_id) : undefined}
                                                        onSelect={(v) => handleUpdateItem(index, 'produto_id', v)}
                                                        disabled={xmlImported && linkStatus !== 'pending'}
                                                        className="w-[250px]"
                                                        placeholder={linkStatus === 'pending' ? 'Vincular...' : 'Produto'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className={`w-20 bg-muted cursor-not-allowed`}
                                                        value={item.ncm}
                                                        disabled={true}
                                                        title="NCM fiscal (travado)"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            className="w-16 bg-muted cursor-not-allowed"
                                                            value={unidadeFiscal}
                                                            disabled={true}
                                                            title="Unidade fiscal (travada)"
                                                        />
                                                        {xmlImported && (
                                                            <Badge variant="outline" className="text-xs">
                                                                <FileCode className="w-3 h-3 mr-1" />
                                                                XML
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="w-20 bg-muted cursor-not-allowed"
                                                        type="number"
                                                        value={quantidadeFiscal}
                                                        disabled={true}
                                                        title="Quantidade fiscal (travada)"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="w-24 bg-muted cursor-not-allowed"
                                                        type="number"
                                                        value={valorUnitarioFiscal.toFixed(4)}
                                                        disabled={true}
                                                        title="Valor unitário fiscal (travado)"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">
                                                        {formatCurrency(valorTotalFiscal)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={unidadeInterna}
                                                        onValueChange={v => handleUpdateItem(index, 'unidade_interna', v)}
                                                        disabled={xmlImported && !quantidadeFiscal}
                                                    >
                                                        <SelectTrigger className="w-20">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="UN">UN</SelectItem>
                                                            <SelectItem value="CX">CX</SelectItem>
                                                            <SelectItem value="PCT">PCT</SelectItem>
                                                            <SelectItem value="MT">MT</SelectItem>
                                                            <SelectItem value="KG">KG</SelectItem>
                                                            <SelectItem value="LT">LT</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Input
                                                            className={`w-20 ${showWarning ? 'border-warning' : ''}`}
                                                            type="number"
                                                            step="0.0001"
                                                            value={quantidadeInterna}
                                                            onChange={e => {
                                                                const val = Number(e.target.value);
                                                                if (quantidadeFiscal > 0 && val > 0) {
                                                                    handleUpdateItem(index, 'quantidade_interna', val);
                                                                } else if (val <= 0) {
                                                                    toast({
                                                                        title: 'Erro',
                                                                        description: 'Quantidade interna deve ser maior que zero',
                                                                        variant: 'destructive'
                                                                    });
                                                                }
                                                            }}
                                                            disabled={xmlImported && !quantidadeFiscal}
                                                            title="Quantidade interna (editável)"
                                                        />
                                                        {showWarning && (
                                                            <div className="text-xs text-warning flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                <span>Menor que fiscal</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="w-20"
                                                        type="number"
                                                        step="0.000001"
                                                        value={fatorConversao.toFixed(6)}
                                                        onChange={e => {
                                                            const val = Number(e.target.value);
                                                            if (val > 0) {
                                                                handleUpdateItem(index, 'fator_conversao', val);
                                                            }
                                                        }}
                                                        disabled={xmlImported && !quantidadeFiscal}
                                                        title="Fator de conversão (editável)"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">
                                                        {formatCurrency(valorUnitarioInterno)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="w-20"
                                                        value={item.local_estoque || ''}
                                                        onChange={e => handleUpdateItem(index, 'local_estoque', e.target.value)}
                                                        placeholder="Local"
                                                        title="Local de estoque (editável)"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        {note.items && note.items.length > 0 && (
                            <div className="mt-4 p-3 bg-muted rounded-lg text-sm space-y-1">
                                <p className="font-semibold">Legenda:</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        <FileCode className="w-3 h-3 mr-1" />
                                        XML
                                    </Badge>
                                    <span>Campos fiscais travados (vêm do XML)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Os valores fiscais não podem ser alterados. Ajuste a quantidade interna e o fator de conversão para controlar o estoque.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Totais */}
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Totais</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Total Produtos</Label>
                            <Input readOnly value={formatCurrency(note.totais?.total_produtos || 0)} className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Descontos</Label>
                            <Input readOnly value={formatCurrency(note.totais?.total_descontos || 0)} className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Impostos</Label>
                            <Input readOnly value={formatCurrency(note.totais?.total_impostos || 0)} className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Total NF</Label>
                            <Input readOnly value={formatCurrency(note.totais?.valor_total_nf || 0)} className="font-bold text-lg bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Frete</Label>
                            <Input type="number" value={note.totais?.frete || 0} onChange={e => {
                                setNote(prev => ({ ...prev, totais: { ...prev.totais!, frete: Number(e.target.value) } }));
                                calculateTotals({ ...note, totais: { ...note.totais!, frete: Number(e.target.value) } });
                            }} />
                        </div>
                        <div className="space-y-2">
                            <Label>Seguro</Label>
                            <Input type="number" value={note.totais?.seguro || 0} onChange={e => {
                                setNote(prev => ({ ...prev, totais: { ...prev.totais!, seguro: Number(e.target.value) } }));
                                calculateTotals({ ...note, totais: { ...note.totais!, seguro: Number(e.target.value) } });
                            }} />
                        </div>
                        <div className="space-y-2">
                            <Label>Outras Despesas</Label>
                            <Input type="number" value={note.totais?.outras_despesas || 0} onChange={e => {
                                setNote(prev => ({ ...prev, totais: { ...prev.totais!, outras_despesas: Number(e.target.value) } }));
                                calculateTotals({ ...note, totais: { ...note.totais!, outras_despesas: Number(e.target.value) } });
                            }} />
                        </div>
                    </CardContent>
                </Card>

                {/* Duplicatas (se importado do XML) */}
                {xmlImported && duplicatas.length > 0 && (
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Duplicatas da Nota Fiscal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Número</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {duplicatas.map((dup, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{dup.numero}</TableCell>
                                            <TableCell>{dup.vencimento ? formatDate(dup.vencimento) : '-'}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(dup.valor)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Total:</strong> {formatCurrency(duplicatas.reduce((sum, dup) => sum + dup.valor, 0))}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    As contas a pagar serão criadas automaticamente ao lançar a nota.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Observações */}
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Observação Interna</Label>
                            <Textarea value={note.observacao_interna || ''} onChange={e => setNote({ ...note, observacao_interna: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Observação do Fornecedor</Label>
                            <Textarea value={note.observacao_fornecedor || ''} onChange={e => setNote({ ...note, observacao_fornecedor: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog de Erros */}
            {displayErrors()}

            {/* Dialog de Vinculação */}
            <Dialog open={showLinkDialog} onOpenChange={(open) => {
                if (!open && getPendingItemsCount() > 0) {
                    const confirm = window.confirm('Existem itens pendentes de vinculação. Deseja realmente fechar?');
                    if (!confirm) return;
                }
                setShowLinkDialog(open);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Vincular Item da Nota Fiscal</DialogTitle>
                        <DialogDescription>
                            Item {currentLinkItemIndex !== null ? currentLinkItemIndex + 1 : ''} de {note.items?.length || 0}
                            {getPendingItemsCount() > 0 && ` - ${getPendingItemsCount()} item(ns) pendente(s)`}
                        </DialogDescription>
                    </DialogHeader>

                    {currentLinkItemIndex !== null && note.items?.[currentLinkItemIndex] && (() => {
                        const item = note.items[currentLinkItemIndex];
                        return (
                            <div className="space-y-6 mt-4">
                                {/* Dados Fiscais do Item */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileCode className="w-5 h-5" />
                                            Dados Fiscais (XML)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Código de Fabricação</Label>
                                            <p className="font-mono text-sm font-semibold">{item.supplier_product_code || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Descrição Fiscal</Label>
                                            <p className="text-sm">{item.fiscal_description || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">NCM</Label>
                                            <p className="font-mono text-sm">{item.ncm || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">GTIN</Label>
                                            <p className="font-mono text-sm">{item.gtin || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">CEST</Label>
                                            <p className="font-mono text-sm">{item.cest || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Unidade Fiscal</Label>
                                            <p className="text-sm">{item.unidade_fiscal || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Quantidade Fiscal</Label>
                                            <p className="text-sm">{item.quantidade_fiscal || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Valor Unitário Fiscal</Label>
                                            <p className="text-sm">{formatCurrency(item.valor_unitario_fiscal || 0)}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Sugestões Automáticas */}
                                {linkSuggestions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-primary" />
                                                Sugestões de Vinculação
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {linkSuggestions.slice(0, 5).map((suggestion, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                                                        <div className="flex-1">
                                                            <p className="font-semibold">{suggestion.product.name}</p>
                                                            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                                                                <span>Código: {suggestion.product.internal_code}</span>
                                                                {suggestion.product.brand && <span>Marca: {suggestion.product.brand}</span>}
                                                                {suggestion.product.ncm && <span>NCM: {suggestion.product.ncm}</span>}
                                                            </div>
                                                            <p className="text-xs text-primary mt-1">{suggestion.reason}</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleLinkProduct(suggestion.product.id)}
                                                            disabled={linkLoading}
                                                        >
                                                            Vincular
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Opções de Vinculação */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Escolha uma opção:</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Opção 1: Vincular com produto existente */}
                                        <div className="border rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-semibold">Opção 1: Vincular com Produto Existente</h3>
                                                    <p className="text-sm text-muted-foreground">Selecione um produto já cadastrado no ERP</p>
                                                </div>
                                            </div>
                                            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={productSearchOpen}
                                                        className="w-full justify-between"
                                                        disabled={linkLoading}
                                                    >
                                                        <span className="truncate">
                                                            {selectedProductToLink
                                                                ? (() => {
                                                                    const selected = products.find(p => String(p.id) === selectedProductToLink);
                                                                    return selected
                                                                        ? `${selected.name}${selected.internal_code ? ` - ${selected.internal_code}` : ''}${selected.brand ? ` (${selected.brand})` : ''}`
                                                                        : 'Produto selecionado';
                                                                })()
                                                                : <span className="text-muted-foreground">Buscar produto por código, nome, marca...</span>}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[500px] p-0" align="start">
                                                    <Command shouldFilter={false}>
                                                        <CommandInput
                                                            placeholder="Digite código, nome, marca ou descrição..."
                                                            value={productSearchInput}
                                                            onValueChange={setProductSearchInput}
                                                        />
                                                        <CommandList>
                                                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                                            <CommandGroup>
                                                                {products
                                                                    .filter((product) => {
                                                                        if (!productSearchInput.trim()) return true;
                                                                        const search = productSearchInput.toLowerCase().trim();
                                                                        const code = String(product.internal_code || '').toLowerCase();
                                                                        const name = String(product.name || '').toLowerCase();
                                                                        const description = String(product.description || '').toLowerCase();
                                                                        const brand = String(product.brand || '').toLowerCase();
                                                                        const ncm = String(product.ncm || '').toLowerCase();

                                                                        // Busca inteligente em múltiplos campos
                                                                        return code.includes(search) ||
                                                                            name.includes(search) ||
                                                                            description.includes(search) ||
                                                                            brand.includes(search) ||
                                                                            ncm.includes(search);
                                                                    })
                                                                    .slice(0, 50)
                                                                    .map((product) => (
                                                                        <CommandItem
                                                                            key={product.id}
                                                                            value={String(product.id)}
                                                                            onSelect={() => {
                                                                                setSelectedProductToLink(String(product.id));
                                                                                setProductSearchOpen(false);
                                                                                setProductSearchInput('');
                                                                            }}
                                                                        >
                                                                            <div className="flex flex-col w-full">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="font-semibold">{product.name}</span>
                                                                                    {product.brand && (
                                                                                        <span className="text-xs text-muted-foreground ml-2">{product.brand}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                                                                    <span>Código: {product.internal_code}</span>
                                                                                    {product.ncm && <span>NCM: {product.ncm}</span>}
                                                                                </div>
                                                                                {product.description && (
                                                                                    <p className="text-xs text-muted-foreground mt-1 truncate">{product.description}</p>
                                                                                )}
                                                                            </div>
                                                                        </CommandItem>
                                                                    ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Opção 2: Ignorar item */}
                                        <div className="border rounded-lg p-4 border-destructive/50">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-destructive">Opção 2: Ignorar Item</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Use apenas para itens sem estoque (taxas, serviços, embalagens)
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={handleIgnoreItem}
                                                disabled={linkLoading}
                                                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                                            >
                                                {linkLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Processando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Ignorar Item
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (getPendingItemsCount() > 0) {
                                    const confirm = window.confirm('Existem itens pendentes. Deseja realmente fechar?');
                                    if (!confirm) return;
                                }
                                setShowLinkDialog(false);
                                setSelectedProductToLink(null);
                            }}
                        >
                            Fechar
                        </Button>


                        <Button
                            onClick={async () => {
                                if (selectedProductToLink) {
                                    await handleLinkProduct(selectedProductToLink);
                                    setSelectedProductToLink(null);
                                }
                            }}
                            disabled={linkLoading || !selectedProductToLink}
                        >
                            {linkLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Vinculando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Vincular
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal SEFAZ */}
            <SefazImportModal
                open={showSefazModal}
                onOpenChange={setShowSefazModal}
                onImportXML={handleImportFromSefaz}
                companyId={profile?.company_id || ''}
                userId={profile?.id}
            />

            {/* Botões de Manifestação - Aparecem quando há chave de acesso */}
            {note.chave_acesso && note.chave_acesso.length === 44 && (
                <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 space-y-2 z-50">
                    <div className="text-sm font-semibold mb-2">Manifestação do Destinatário</div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManifestar('210100')}
                            disabled={manifestando}
                            className="text-xs"
                        >
                            {manifestando ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <CheckSquare className="w-3 h-3 mr-1" />
                            )}
                            Ciência
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManifestar('210200')}
                            disabled={manifestando}
                            className="text-xs bg-green-50 hover:bg-green-100"
                        >
                            {manifestando ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                            )}
                            Confirmar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManifestar('210240')}
                            disabled={manifestando}
                            className="text-xs text-orange-600"
                        >
                            {manifestando ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <AlertCircleIcon className="w-3 h-3 mr-1" />
                            )}
                            Desconhecer
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManifestar('210250')}
                            disabled={manifestando}
                            className="text-xs text-red-600"
                        >
                            {manifestando ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <XSquare className="w-3 h-3 mr-1" />
                            )}
                            Não Realizada
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
