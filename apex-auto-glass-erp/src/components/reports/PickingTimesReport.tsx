import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/common/DataTable';
import { formatDate, formatCurrency } from '@/lib/format';
import { Download, FileSpreadsheet, FileText, Loader2, Filter, X, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PickingTimeData {
  id: string;
  sale_id: string;
  sale_number: number;
  sale_created_at: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  tempo_espera_minutos: number | null;
  tempo_separacao_minutos: number | null;
  tempo_total_minutos: number | null;
  customer_name: string;
  seller_name: string;
  total: number;
  user_name: string;
}

const formatTime = (minutes: number | null): string => {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}min`;
};

export function PickingTimesReport() {
  const { company, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PickingTimeData[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [showFilters, setShowFilters] = useState(true);

  const currentCompanyId = company?.id || profile?.company_id;

  const loadData = async () => {
    if (!currentCompanyId) return;

    setLoading(true);
    try {
      // Buscar dados usando a view criada
      const { data: pickingData, error } = await supabase
        .from('picking_with_times')
        .select('*')
        .eq('company_id', currentCompanyId)
        .gte('sale_created_at', `${filters.startDate}T00:00:00Z`)
        .lte('sale_created_at', `${filters.endDate}T23:59:59Z`)
        .order('sale_created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados das vendas
      const saleIds = pickingData?.map(p => p.sale_id).filter((id): id is string => id !== null) || [];
      let salesMap = new Map();
      if (saleIds.length > 0) {
        const { data: sales } = await supabase
          .from('sales')
          .select(`
            id,
            total,
            seller_id,
            customer:customers(name)
          `)
          .in('id', saleIds);
        
        if (sales) {
          salesMap = new Map(sales.map(s => [s.id, s]));
        }
      }

      // Buscar dados dos vendedores
      const sellerIds = Array.from(salesMap.values())
        .map((sale: any) => sale.seller_id)
        .filter((id): id is string => id !== null);

      let sellersMap = new Map();
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', sellerIds);
        
        if (sellers) {
          sellersMap = new Map(sellers.map(s => [s.id, s]));
        }
      }

      // Buscar dados dos separadores
      const separatorIds = pickingData?.map(p => p.user_id).filter((id): id is string => id !== null) || [];
      let separatorsMap = new Map();
      if (separatorIds.length > 0) {
        const { data: separators } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', separatorIds);
        
        if (separators) {
          separatorsMap = new Map(separators.map(s => [s.id, s]));
        }
      }

      // Formatar dados
      const formattedData: PickingTimeData[] = (pickingData || []).map(p => {
        const sale = salesMap.get(p.sale_id);
        return {
          id: p.id,
          sale_id: p.sale_id,
          sale_number: p.sale_number,
          sale_created_at: p.sale_created_at,
          started_at: p.started_at,
          finished_at: p.finished_at,
          status: p.status,
          tempo_espera_minutos: p.tempo_espera_minutos,
          tempo_separacao_minutos: p.tempo_separacao_minutos,
          tempo_total_minutos: p.tempo_total_minutos,
          customer_name: (sale as any)?.customer?.name || 'Cliente Balcão',
          seller_name: (sale as any)?.seller_id 
            ? (sellersMap.get((sale as any).seller_id)?.full_name || sellersMap.get((sale as any).seller_id)?.email || '-')
            : '-',
          total: (sale as any)?.total || 0,
          user_name: p.user_id 
            ? (separatorsMap.get(p.user_id)?.full_name || separatorsMap.get(p.user_id)?.email || '-')
            : '-',
        };
      });

      setData(formattedData);
      
      toast({
        title: 'Sucesso',
        description: `Relatório gerado com ${formattedData.length} separações`,
      });
    } catch (error: any) {
      console.error('Erro ao carregar tempos de separação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId]);

  const handleExportExcel = () => {
    if (data.length === 0) {
      toast({
        title: 'Erro',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Nº Pedido',
      'Data Criação Pedido',
      'Início Separação',
      'Fim Separação',
      'Tempo Espera (min)',
      'Tempo Separação (min)',
      'Tempo Total (min)',
      'Status',
      'Cliente',
      'Vendedor',
      'Separador',
      'Total',
    ];

    const rows = data.map(p => [
      p.sale_number,
      formatDate(p.sale_created_at),
      formatDate(p.started_at),
      p.finished_at ? formatDate(p.finished_at) : '-',
      p.tempo_espera_minutos?.toString() || '-',
      p.tempo_separacao_minutos?.toString() || '-',
      p.tempo_total_minutos?.toString() || '-',
      p.status,
      p.customer_name,
      p.seller_name,
      p.user_name,
      p.total,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tempos_separacao_${filters.startDate}_${filters.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Sucesso',
      description: 'Arquivo CSV exportado com sucesso',
    });
  };

  // Calcular estatísticas
  const stats = {
    total: data.length,
    concluidas: data.filter(p => p.finished_at !== null).length,
    tempoMedioEspera: data
      .filter(p => p.tempo_espera_minutos !== null)
      .reduce((sum, p) => sum + (p.tempo_espera_minutos || 0), 0) / 
      (data.filter(p => p.tempo_espera_minutos !== null).length || 1),
    tempoMedioSeparacao: data
      .filter(p => p.tempo_separacao_minutos !== null)
      .reduce((sum, p) => sum + (p.tempo_separacao_minutos || 0), 0) / 
      (data.filter(p => p.tempo_separacao_minutos !== null).length || 1),
    tempoMedioTotal: data
      .filter(p => p.tempo_total_minutos !== null)
      .reduce((sum, p) => sum + (p.tempo_total_minutos || 0), 0) / 
      (data.filter(p => p.tempo_total_minutos !== null).length || 1),
  };

  const columns = [
    {
      key: 'sale_number',
      header: 'Nº Pedido',
      cell: (item: PickingTimeData) => (
        <span className="font-mono font-bold">#{item.sale_number}</span>
      ),
    },
    {
      key: 'sale_created_at',
      header: 'Pedido Criado',
      cell: (item: PickingTimeData) => (
        <span className="text-sm">{formatDate(item.sale_created_at)}</span>
      ),
    },
    {
      key: 'started_at',
      header: 'Início Separação',
      cell: (item: PickingTimeData) => (
        <span className="text-sm">{formatDate(item.started_at)}</span>
      ),
    },
    {
      key: 'finished_at',
      header: 'Fim Separação',
      cell: (item: PickingTimeData) => (
        <span className="text-sm">{item.finished_at ? formatDate(item.finished_at) : '-'}</span>
      ),
    },
    {
      key: 'tempo_espera',
      header: 'Tempo Espera',
      cell: (item: PickingTimeData) => (
        <span className="text-sm font-medium text-orange-600">
          {formatTime(item.tempo_espera_minutos)}
        </span>
      ),
    },
    {
      key: 'tempo_separacao',
      header: 'Tempo Separação',
      cell: (item: PickingTimeData) => (
        <span className="text-sm font-medium text-blue-600">
          {formatTime(item.tempo_separacao_minutos)}
        </span>
      ),
    },
    {
      key: 'tempo_total',
      header: 'Tempo Total',
      cell: (item: PickingTimeData) => (
        <span className="text-sm font-bold text-green-600">
          {formatTime(item.tempo_total_minutos)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      cell: (item: PickingTimeData) => (
        <span className="text-sm">{item.customer_name}</span>
      ),
    },
    {
      key: 'seller',
      header: 'Vendedor',
      cell: (item: PickingTimeData) => (
        <span className="text-sm">{item.seller_name}</span>
      ),
    },
    {
      key: 'separator',
      header: 'Separador',
      cell: (item: PickingTimeData) => (
        <span className="text-sm">{item.user_name}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      cell: (item: PickingTimeData) => (
        <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item: PickingTimeData) => {
        const statusLabels: Record<string, string> = {
          'em_separacao': 'Em Separação',
          'separado': 'Separado',
          'pausado': 'Pausado',
          'erro_falta': 'Erro - Falta',
          'erro_danificado': 'Erro - Danificado',
        };
        const statusColors: Record<string, string> = {
          'em_separacao': 'bg-yellow-100 text-yellow-800',
          'separado': 'bg-green-100 text-green-800',
          'pausado': 'bg-orange-100 text-orange-800',
          'erro_falta': 'bg-red-100 text-red-800',
          'erro_danificado': 'bg-red-100 text-red-800',
        };
        return (
          <span className={`text-xs px-2 py-1 rounded ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[item.status] || item.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Relatório de Tempos de Separação
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial *</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final *</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={loadData} disabled={loading} className="btn-gradient">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Relatório
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Statistics Cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Separações</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <p className="text-2xl font-bold text-green-600">{stats.concluidas}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Tempo Médio Espera</p>
              <p className="text-2xl font-bold text-orange-600">{formatTime(stats.tempoMedioEspera)}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Tempo Médio Separação</p>
              <p className="text-2xl font-bold text-blue-600">{formatTime(stats.tempoMedioSeparacao)}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Tempo Médio Total</p>
              <p className="text-2xl font-bold text-green-600">{formatTime(stats.tempoMedioTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>
            Separações ({data.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="Nenhuma separação encontrada no período"
          />
        </CardContent>
      </Card>
    </div>
  );
}

