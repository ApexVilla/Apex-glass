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
    Upload
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { entryNoteService } from '@/services/entryNoteService';

export default function FiscalEntryNotes() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { profile } = useAuth();
    const [stats, setStats] = useState({
        totalNotas: 0,
        valorTotal: 0,
        pendentes: 0
    });
    const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'todas');

    useEffect(() => {
        if (profile?.company_id) {
            loadNotes();
        }
    }, [profile?.company_id]);

    useEffect(() => {
        const tab = searchParams.get('tab') || 'todas';
        setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        calculateStats();
    }, [notes]);

    const loadNotes = async () => {
        if (!profile?.company_id) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('nf_entrada')
                .select(`
                    *,
                    supplier:suppliers(nome_razao, nome_fantasia, cpf_cnpj)
                `)
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar notas:', error);
                toast({ 
                    title: 'Erro', 
                    description: `Erro ao carregar notas fiscais: ${error?.message || 'Erro desconhecido'}`,
                    variant: 'destructive' 
                });
                setNotes([]);
                return;
            }
            
            console.log('Notas carregadas:', data?.length || 0);
            console.log('Dados das notas:', data);
            console.log('Company ID usado:', profile.company_id);
            
            // Se não houver supplier, tentar buscar manualmente
            if (data && data.length > 0) {
                const notesWithSuppliers = await Promise.all(
                    data.map(async (note) => {
                        if (note.fornecedor_id && !note.supplier) {
                            const { data: supplier } = await supabase
                                .from('suppliers')
                                .select('nome_razao, nome_fantasia, cpf_cnpj')
                                .eq('id', note.fornecedor_id)
                                .single();
                            return { ...note, supplier };
                        }
                        return note;
                    })
                );
                setNotes(notesWithSuppliers);
            } else {
                setNotes(data || []);
            }
        } catch (error: any) {
            console.error('Error loading notes:', error);
            toast({ 
                title: 'Erro', 
                description: `Erro ao carregar notas fiscais: ${error?.message || 'Erro desconhecido'}`,
                variant: 'destructive' 
            });
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const notesThisMonth = notes.filter(note => {
            const noteDate = new Date(note.data_emissao);
            return noteDate >= startOfMonth;
        });

        const totalCount = notesThisMonth.length;
        // nf_entrada usa totais como JSONB, então precisamos extrair o valor total
        const totalValue = notesThisMonth.reduce((sum, n) => {
            let totais = n.totais || {};
            if (typeof totais === 'string') {
                try {
                    totais = JSON.parse(totais);
                } catch (e) {
                    totais = {};
                }
            }
            const valorTotal = totais.valor_total_nf || totais.valor_total || totais.total_nota || 0;
            return sum + (Number(valorTotal) || 0);
        }, 0);
        const pendingCount = notes.filter(n => n.status !== 'Lançada').length;

        setStats({
            totalNotas: totalCount,
            valorTotal: totalValue,
            pendentes: pendingCount
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
        
        try {
            // Verificar se pode excluir (validação de estoque)
            const validation = await entryNoteService.canDelete(id);
            
            if (!validation.canDelete) {
                // Se não pode excluir, mostrar mensagem detalhada
                let errorMessage = validation.message;
                
                // Se houver produtos com estoque negativo, adicionar detalhes
                if (validation.productsWithNegativeStock && validation.productsWithNegativeStock.length > 0) {
                    const details = validation.productsWithNegativeStock.map(p => 
                        `\n- ${p.product_name}: Estoque atual ${p.current_stock}, seria removido ${p.quantity_to_remove}, resultando em ${p.resulting_stock}`
                    ).join('');
                    errorMessage += details;
                }
                
                toast({ 
                    title: 'Não é possível excluir', 
                    description: errorMessage, 
                    variant: 'destructive',
                    duration: 8000
                });
                return;
            }

            // Se pode excluir, proceder com a exclusão (que já reverte o estoque se necessário)
            await entryNoteService.delete(id, profile?.id);
            toast({ title: 'Sucesso', description: 'Nota excluída e estoque ajustado' });
            loadNotes();
        } catch (error: any) {
            console.error('Erro ao excluir NF:', error);
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao excluir nota fiscal', 
                variant: 'destructive',
                duration: 8000
            });
        }
    };

    const getStatusBadge = (note: any) => {
        // Para notas de entrada, o status relevante é se foi confirmada/lançada no estoque/financeiro
        if (note.status === 'Lançada') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Lançada
                </span>
            );
        } else if (note.status === 'Cancelada') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                    <XCircle className="w-3 h-3" />
                    Cancelada
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                    <Clock className="w-3 h-3" />
                    {note.status || 'Pendente'}
                </span>
            );
        }
    };

    const filteredNotes = () => {
        let filtered = notes;

        // Filtrar por busca
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(note => {
                const number = note.numero ? String(note.numero) : '';
                const serie = note.serie ? String(note.serie) : '';
                const supplierName = (note.supplier?.nome_fantasia || note.supplier?.nome_razao || '').toLowerCase();
                const supplierDoc = note.supplier?.cpf_cnpj?.toLowerCase() || '';
                return (
                    number.includes(search) ||
                    serie.includes(search) ||
                    supplierName.includes(search) ||
                    supplierDoc.includes(search)
                );
            });
        }

        // Filtrar por aba
        if (activeTab === 'pendentes') {
            filtered = filtered.filter(n => n.status !== 'Lançada');
        } else if (activeTab === 'confirmadas') {
            filtered = filtered.filter(n => n.status === 'Lançada');
        }

        return filtered;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais de Entrada</h1>
                <div className="flex gap-2">
                    <Button onClick={() => navigate('/fiscal/import')} variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Importar XML
                    </Button>
                    <Button onClick={() => navigate('/fiscal/entry/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Lançar Nota Manual
                    </Button>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Notas este Mês</h3>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalNotas}</div>
                    <p className="text-xs text-muted-foreground">
                        Total de notas lançadas
                    </p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Valor Total</h3>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total em notas este mês
                    </p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Pendentes</h3>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stats.pendentes}</div>
                    <p className="text-xs text-muted-foreground">
                        Aguardando confirmação
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(val) => {
                setActiveTab(val);
                setSearchParams({ tab: val });
            }} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="todas">Todas</TabsTrigger>
                    <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                    <TabsTrigger value="confirmadas">Confirmadas</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 my-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por número, fornecedor..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <TabsContent value={activeTab} className="space-y-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Número</TableHead>
                                    <TableHead>Emissão</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredNotes().length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Nenhuma nota encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredNotes().map((note) => {
                                        // Parse do JSON totais se for string
                                        let totais = note.totais || {};
                                        if (typeof totais === 'string') {
                                            try {
                                                totais = JSON.parse(totais);
                                            } catch (e) {
                                                console.error('Erro ao parsear totais:', e);
                                                totais = {};
                                            }
                                        }
                                        const valorTotal = totais.valor_total_nf || totais.valor_total || totais.total_nota || 0;
                                        
                                        return (
                                            <TableRow key={note.id}>
                                                <TableCell className="font-medium">
                                                    {note.numero ? `${note.numero}/${note.serie || ''}` : 'N/A'}
                                                </TableCell>
                                                <TableCell>{formatDate(note.data_emissao)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {note.supplier?.nome_fantasia || note.supplier?.nome_razao || 'Fornecedor não identificado'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{note.supplier?.cpf_cnpj || ''}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatCurrency(valorTotal)}</TableCell>
                                                <TableCell>{getStatusBadge(note)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => navigate(`/fiscal/edit/${note.id}`)}
                                                            title="Visualizar/Editar"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() => handleDelete(note.id)}
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DollarSign(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
