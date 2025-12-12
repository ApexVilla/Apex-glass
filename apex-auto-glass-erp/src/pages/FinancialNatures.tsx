import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { NatureForm } from '@/components/financial/NatureForm';
import { FinancialNature } from '@/types/financial';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function FinancialNatures() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [natures, setNatures] = useState<FinancialNature[]>([]);
  const [filteredNatures, setFilteredNatures] = useState<FinancialNature[]>([]); // Mantido para compatibilidade, mas agora é igual a natures
  const [natureFormOpen, setNatureFormOpen] = useState(false);
  const [selectedNature, setSelectedNature] = useState<FinancialNature | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [natureToDelete, setNatureToDelete] = useState<FinancialNature | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  // Stats State
  const [stats, setStats] = useState({ total: 0, ativas: 0, entradas: 0, saidas: 0 });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadNatures();
  }, [searchTerm, currentPage, pageSize]);

  const loadStats = async () => {
    try {
      const [total, ativas, entradas, saidas] = await Promise.all([
        supabase.from('financial_natures').select('*', { count: 'exact', head: true }),
        supabase.from('financial_natures').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('financial_natures').select('*', { count: 'exact', head: true }).eq('type', 'entrada'),
        supabase.from('financial_natures').select('*', { count: 'exact', head: true }).eq('type', 'saida'),
      ]);

      setStats({
        total: total.count || 0,
        ativas: ativas.count || 0,
        entradas: entradas.count || 0,
        saidas: saidas.count || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadNatures = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('financial_natures')
        .select('*', { count: 'exact' })
        .order('code', { ascending: true })
        .order('name', { ascending: true });

      // Filtros Server-Side
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%,category.ilike.%${term}%`);
      }

      // Paginação
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setNatures(data || []);
      setFilteredNatures(data || []); // Mantendo sincronizado
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Erro ao carregar naturezas:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar naturezas financeiras', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleEdit = (nature: FinancialNature) => {
    if (!nature.permitir_edicao) {
      toast({
        title: 'Aviso',
        description: 'Esta natureza não permite edição',
        variant: 'destructive',
      });
      return;
    }
    setSelectedNature(nature);
    setNatureFormOpen(true);
  };

  const handleDelete = (nature: FinancialNature) => {
    setNatureToDelete(nature);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!natureToDelete) return;

    try {
      const { error } = await supabase
        .from('financial_natures')
        .delete()
        .eq('id', natureToDelete.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Natureza excluída com sucesso' });
      loadNatures();
      setDeleteDialogOpen(false);
      setNatureToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir natureza',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (nature: FinancialNature) => {
    try {
      const { error } = await supabase
        .from('financial_natures')
        .update({ is_active: !nature.is_active })
        .eq('id', nature.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Natureza ${nature.is_active ? 'desativada' : 'ativada'} com sucesso`,
      });
      loadNatures();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao alterar status',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'CÓDIGO',
      cell: (item: FinancialNature) => (
        <span className="font-mono text-sm">{item.code || '-'}</span>
      ),
    },
    {
      key: 'name',
      header: 'NOME',
      cell: (item: FinancialNature) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.category && (
            <p className="text-xs text-muted-foreground">{item.category}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'TIPO',
      cell: (item: FinancialNature) => {
        const typeMap: any = {
          entrada: { type: 'success', label: 'Entrada', icon: TrendingUp },
          saida: { type: 'danger', label: 'Saída', icon: TrendingDown },
          ambos: { type: 'info', label: 'Ambos', icon: TrendingUp },
        };
        const type = typeMap[item.type] || typeMap.entrada;
        return <StatusBadge status={type.type} label={type.label} />;
      },
    },
    {
      key: 'category',
      header: 'CATEGORIA',
      cell: (item: FinancialNature) => item.category || '-',
    },
    {
      key: 'integrations',
      header: 'INTEGRAÇÕES',
      cell: (item: FinancialNature) => {
        const integrations = [];
        if (item.usada_em_vendas) integrations.push('Vendas');
        if (item.usada_em_compras) integrations.push('Compras');
        if (item.usada_em_despesas) integrations.push('Despesas');
        if (item.usada_no_caixa) integrations.push('Caixa');
        return (
          <div className="flex flex-wrap gap-1">
            {integrations.length > 0 ? (
              integrations.map((int, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {int}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      cell: (item: FinancialNature) => (
        <StatusBadge
          status={item.is_active ? 'success' : 'danger'}
          label={item.is_active ? 'Ativa' : 'Inativa'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'AÇÕES',
      className: 'w-32',
      cell: (item: FinancialNature) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            disabled={!item.permitir_edicao}
            title={item.permitir_edicao ? 'Editar' : 'Edição não permitida'}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleStatus(item)}
            title={item.is_active ? 'Desativar' : 'Ativar'}
          >
            {item.is_active ? (
              <X className="h-4 w-4 text-warning" />
            ) : (
              <Plus className="h-4 w-4 text-success" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => handleDelete(item)}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Stats removido daqui pois agora é state

  return (
    <div className="space-y-6">
      <PageHeader
        title="Naturezas Financeiras"
        description="Gerencie as naturezas financeiras usadas em vendas, compras, contas a pagar, contas a receber, caixa e tesouraria"
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ativas</p>
              <p className="text-2xl font-bold text-success">{stats.ativas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Entradas</p>
              <p className="text-2xl font-bold text-success">{stats.entradas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saídas</p>
              <p className="text-2xl font-bold text-destructive">{stats.saidas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Listagem de Naturezas</CardTitle>
            <Button
              onClick={() => {
                setSelectedNature(null);
                setNatureFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Natureza
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, código ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <DataTable
            columns={columns}
            data={filteredNatures}
            loading={loading}
            emptyMessage="Nenhuma natureza financeira encontrada"
          />

          {/* Paginação */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="5000">5000</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-2">
                Total: {totalCount} naturezas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm font-medium">
                Página {currentPage} de {Math.ceil(totalCount / pageSize) || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      <NatureForm
        open={natureFormOpen}
        onOpenChange={setNatureFormOpen}
        nature={selectedNature}
        onSuccess={() => {
          loadNatures();
          setSelectedNature(null);
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a natureza financeira "{natureToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

