import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/common/DataTable';
import { ProductSearchCombobox } from '@/components/common/ProductSearchCombobox';
import { formatCurrency, formatDate } from '@/lib/format';
import { Download, FileSpreadsheet, FileText, Loader2, Search, Filter, X, Eye } from 'lucide-react';
import { inventoryReportService, StockMovement, StockMovementFilters } from '@/services/inventoryReportService';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const movementTypes = [
  { value: 'all', label: 'Todas' },
  { value: 'entrada_compra', label: 'Entrada por Compra (NF)' },
  { value: 'entrada_manual', label: 'Entrada Manual' },
  { value: 'saida_venda', label: 'Saída por Venda' },
  { value: 'saida_manual', label: 'Saída Manual' },
  { value: 'entrada_ajuste', label: 'Ajuste de Estoque (Entrada)' },
  { value: 'saida_ajuste', label: 'Ajuste de Estoque (Saída)' },
  { value: 'saida_separacao', label: 'Separação' },
  { value: 'entrada_devolucao_cliente', label: 'Devolução Cliente (Cancelamento)' },
  { value: 'saida_devolucao_cliente', label: 'Devolução Cliente' },
  { value: 'entrada_devolucao_fornecedor', label: 'Devolução Fornecedor' },
  { value: 'transferencia', label: 'Transferência' },
];

const getMovementTypeLabel = (type: string) => {
  return movementTypes.find(t => t.value === type)?.label || type;
};

export function StockMovementReport() {
  const { company, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    movements: StockMovement[];
    totalEntradas: number;
    totalSaidas: number;
    totalAjustes: number;
    saldoFinal: number;
    totalMovimentadoValor: number;
  } | null>(null);

  const [filters, setFilters] = useState<StockMovementFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    movementType: 'all',
    includeFinancial: true,
  });

  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [movementDetails, setMovementDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Obter company_id (considera override para master users)
  const currentCompanyId = company?.id || profile?.company_id;

  useEffect(() => {
    if (currentCompanyId) {
      loadOptions();
    }
  }, [currentCompanyId]);

  const loadOptions = async () => {
    if (!currentCompanyId) {
      console.log('❌ StockMovementReport: company_id não disponível');
      return;
    }
    setLoadingOptions(true);
    try {
      console.log('🔄 StockMovementReport: Carregando produtos para company_id:', currentCompanyId);
      const [productsData, usersData, categoriesData] = await Promise.all([
        inventoryReportService.getProducts(currentCompanyId),
        inventoryReportService.getUsers(currentCompanyId),
        inventoryReportService.getCategories(currentCompanyId),
      ]);
      console.log('✅ StockMovementReport: Produtos carregados:', productsData?.length || 0);
      console.log('📦 StockMovementReport: Primeiros produtos:', productsData?.slice(0, 3));
      setProducts(productsData || []);
      setUsers(usersData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('❌ Erro ao carregar opções:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar produtos para pesquisa',
        variant: 'destructive',
      });
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!currentCompanyId) {
      console.error('❌ StockMovementReport: company_id não disponível');
      return;
    }

    if (!filters.startDate || !filters.endDate) {
      toast({
        title: 'Erro',
        description: 'Selecione o período inicial e final',
        variant: 'destructive',
      });
      return;
    }

    console.log('🔄 StockMovementReport: Gerando relatório com filtros:', {
      company_id: currentCompanyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      productId: filters.productId,
      movementType: filters.movementType,
      userId: filters.userId,
    });

    // Se produto foi selecionado, verificar se o ID está correto
    if (filters.productId) {
      const selectedProduct = products.find(p => p.id === filters.productId);
      console.log('📦 Produto selecionado para filtro:', {
        productId: filters.productId,
        productName: selectedProduct?.name || 'Não encontrado',
        productCode: selectedProduct?.internal_code || 'N/A',
      });
    }

    setLoading(true);
    try {
      const data = await inventoryReportService.generateReport(currentCompanyId, filters);
      console.log('✅ StockMovementReport: Relatório gerado com sucesso');
      console.log('📊 Total de movimentações:', data.movements.length);
      setReportData(data);
      toast({
        title: 'Sucesso',
        description: `Relatório gerado com ${data.movements.length} movimentações`,
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao gerar relatório',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData || reportData.movements.length === 0) {
      toast({
        title: 'Erro',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    // Create PDF content as HTML and print
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Movimentação de Estoque</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
            .summary-card { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .entrada { color: green; }
            .saida { color: red; }
          </style>
        </head>
        <body>
          <h1>Relatório de Movimentação de Estoque</h1>
          <p><strong>Período:</strong> ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}</p>
          
          <div class="summary">
            <div class="summary-card">
              <strong>Total Entradas:</strong> ${reportData.totalEntradas}
            </div>
            <div class="summary-card">
              <strong>Total Saídas:</strong> ${reportData.totalSaidas}
            </div>
            <div class="summary-card">
              <strong>Total Ajustes:</strong> ${reportData.totalAjustes}
            </div>
            <div class="summary-card">
              <strong>Saldo Final:</strong> ${reportData.saldoFinal}
            </div>
            <div class="summary-card">
              <strong>Valor Movimentado:</strong> ${formatCurrency(reportData.totalMovimentadoValor)}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Produto</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Saldo Anterior</th>
                <th>Saldo Atual</th>
                <th>Usuário</th>
                <th>Origem</th>
                <th>Depósito Origem</th>
                <th>Depósito Destino</th>
                <th>Observações</th>
                <th>Custo Unit.</th>
                <th>Custo Total</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.movements.map(m => `
                <tr>
                  <td>${formatDate(m.created_at)}</td>
                  <td>${m.product.name}</td>
                  <td>${m.product.internal_code}</td>
                  <td class="${m.type.includes('entrada') ? 'entrada' : 'saida'}">${getMovementTypeLabel(m.type)}</td>
                  <td>${m.quantity}</td>
                  <td>${m.saldo_anterior}</td>
                  <td>${m.saldo_atual}</td>
                  <td>${m.user?.full_name || m.user?.email || '-'}</td>
                  <td>${
                    m.sale ? (m.sale.sale_number === 0 ? 'Venda Cancelada' : `Venda #${m.sale.sale_number}`) :
                    m.picking ? `Separação #${m.picking.sale?.sale_number || '-'}` :
                    m.invoice ? `NF #${m.invoice.invoice_number}` :
                    (m.reference_id && m.reference_type === 'sale') ? 'Venda Cancelada' :
                    '-'
                  }</td>
                  <td>${m.deposito_origem || '-'}</td>
                  <td>${m.deposito_destino || '-'}</td>
                  <td>${m.observacoes || '-'}</td>
                  <td>${formatCurrency(m.custo_unitario)}</td>
                  <td>${formatCurrency(m.custo_total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleViewDetails = async (movement: StockMovement) => {
    setSelectedMovement(movement);
    setLoadingDetails(true);
    setMovementDetails(null);

    try {
      let details: any = null;

      // Determinar tipo de referência se não estiver definido
      let referenceType = movement.reference_type;
      if (!referenceType && movement.reference_id) {
        // Tentar determinar pelo tipo de movimento
        if (movement.type.includes('saida_venda') || movement.sale) {
          referenceType = 'sale';
        } else if (movement.type.includes('saida_separacao') || movement.picking) {
          referenceType = 'picking';
        } else if (movement.type.includes('entrada_compra') || movement.invoice) {
          referenceType = 'nf_entrada';
        }
      }

      // Buscar detalhes baseado no tipo de referência
      if (movement.reference_id && referenceType) {
        if (referenceType === 'sale') {
          // Buscar itens da venda
          const { data: saleItems, error: saleItemsError } = await supabase
            .from('sale_items')
            .select(`
              *,
              product:products(id, name, internal_code, manufacturer_code)
            `)
            .eq('sale_id', movement.reference_id);

          if (!saleItemsError && saleItems && saleItems.length > 0) {
            details = {
              type: 'sale',
              sale: movement.sale || { sale_number: 'N/A' },
              items: saleItems,
            };
          }
        } else if (referenceType === 'picking') {
          // Buscar itens da separação
          const { data: pickingItems, error: pickingItemsError } = await supabase
            .from('picking_items')
            .select(`
              *,
              product:products(id, name, internal_code, manufacturer_code),
              substituted_product:products!picking_items_substituted_product_id_fkey(id, name, internal_code)
            `)
            .eq('picking_id', movement.reference_id);

          if (!pickingItemsError && pickingItems && pickingItems.length > 0) {
            details = {
              type: 'picking',
              picking: movement.picking || { id: movement.reference_id },
              items: pickingItems,
            };
          }
        } else if (referenceType === 'nf_entrada') {
          // Buscar itens da nota fiscal de entrada
          const { data: invoiceItems, error: invoiceItemsError } = await supabase
            .from('nf_entrada_itens')
            .select(`
              *,
              product:products(id, name, internal_code, manufacturer_code)
            `)
            .eq('nf_entrada_id', movement.reference_id);

          if (!invoiceItemsError && invoiceItems && invoiceItems.length > 0) {
            details = {
              type: 'invoice',
              invoice: movement.invoice || { invoice_number: 'N/A' },
              items: invoiceItems,
            };
          }
        }
      }

      // Se não encontrou detalhes, mostrar pelo menos o produto da movimentação atual
      if (!details) {
        details = {
          type: 'single',
          movement: movement,
          items: [{
            id: movement.id,
            product: movement.product,
            quantity: movement.quantity,
            unit_price: movement.custo_unitario,
            total: movement.custo_total,
          }],
        };
      }

      setMovementDetails(details);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar detalhes da movimentação',
        variant: 'destructive',
      });
      // Mesmo com erro, mostrar pelo menos o produto
      setMovementDetails({
        type: 'single',
        movement: movement,
        items: [{
          id: movement.id,
          product: movement.product,
          quantity: movement.quantity,
          unit_price: movement.custo_unitario,
          total: movement.custo_total,
        }],
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.movements.length === 0) {
      toast({
        title: 'Erro',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    // Create CSV content
    const headers = [
      'Data/Hora',
      'Produto',
      'Código Interno',
      'Código Fabricação',
      'Categoria',
      'Marca',
      'Tipo Movimentação',
      'Quantidade',
      'Saldo Anterior',
      'Saldo Atual',
      'Usuário',
      'Origem',
      'Nº Venda',
      'Nº NF',
      'Nº Separação',
      'Depósito Origem',
      'Depósito Destino',
      'Custo Unitário',
      'Custo Total',
      'Preço Venda',
      'Motivo',
      'Observações',
    ];

    const rows = reportData.movements.map(m => [
      formatDate(m.created_at),
      m.product.name,
      m.product.internal_code || '',
      m.product.manufacturer_code || '',
      m.product.category?.name || '',
      m.product.brand || '',
      getMovementTypeLabel(m.type),
      m.quantity,
      m.saldo_anterior,
      m.saldo_atual,
      m.user?.full_name || m.user?.email || '',
      m.sale ? 'Venda' : m.picking ? 'Separação' : m.invoice ? 'NF' : 'Manual',
      m.sale?.sale_number || '',
      m.invoice?.invoice_number || '',
      m.picking?.id || '',
      m.deposito_origem || '',
      m.deposito_destino || '',
      m.custo_unitario,
      m.custo_total,
      m.product.sale_price || 0,
      m.reason || '',
      m.observacoes || '',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell content
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')),
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `movimentacao_estoque_${filters.startDate}_${filters.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Sucesso',
      description: 'Arquivo CSV exportado com sucesso',
    });
  };

  const columns = [
    {
      key: 'created_at',
      header: 'Data/Hora',
      cell: (item: StockMovement) => (
        <span className="text-sm">{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: 'product',
      header: 'Produto',
      cell: (item: StockMovement) => (
        <div>
          <p className="font-medium text-sm">{item.product.name}</p>
          <p className="text-xs text-muted-foreground">
            Cód: {item.product.internal_code}
            {item.product.manufacturer_code && ` | Fab: ${item.product.manufacturer_code}`}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (item: StockMovement) => (
        <span className={`text-xs px-2 py-1 rounded ${
          item.type.includes('entrada') ? 'bg-green-100 text-green-800' :
          item.type.includes('saida') ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {getMovementTypeLabel(item.type)}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantidade',
      cell: (item: StockMovement) => (
        <span className="font-medium">{item.quantity}</span>
      ),
    },
    {
      key: 'saldo',
      header: 'Saldo',
      cell: (item: StockMovement) => (
        <div className="text-xs">
          <p>Antes: {item.saldo_anterior}</p>
          <p className="font-medium">Depois: {item.saldo_atual}</p>
        </div>
      ),
    },
    {
      key: 'deposito',
      header: 'Depósito',
      cell: (item: StockMovement) => {
        if (item.type === 'transferencia') {
          return (
            <div className="text-xs">
              <p>De: {item.deposito_origem || '-'}</p>
              <p className="font-medium">Para: {item.deposito_destino || '-'}</p>
            </div>
          );
        }
        return (
          <span className="text-xs">{item.deposito_origem || item.deposito_destino || item.deposito || 'Principal'}</span>
        );
      },
    },
    {
      key: 'user',
      header: 'Usuário',
      cell: (item: StockMovement) => (
        <span className="text-sm">
          {item.user?.full_name || item.user?.email || '-'}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Origem',
      cell: (item: StockMovement) => {
        if (item.sale) {
          // Se sale_number é 0, significa que a venda foi cancelada/deletada
          if (item.sale.sale_number === 0) {
            return <span className="text-xs text-muted-foreground">Venda Cancelada</span>;
          }
          return <span className="text-xs">Venda #{item.sale.sale_number}</span>;
        }
        if (item.picking) {
          return <span className="text-xs">Separação #{item.picking.sale?.sale_number || '-'}</span>;
        }
        if (item.invoice) {
          return <span className="text-xs">NF #{item.invoice.invoice_number}</span>;
        }
        // Se tem reference_id mas não tem sale/picking/invoice, pode ser uma venda cancelada
        if (item.reference_id && item.reference_type === 'sale') {
          return <span className="text-xs text-muted-foreground">Venda Cancelada</span>;
        }
        return <span className="text-xs text-muted-foreground">-</span>;
      },
    },
    {
      key: 'observacoes',
      header: 'Observações',
      cell: (item: StockMovement) => (
        <span className="text-xs text-muted-foreground" title={item.observacoes || ''}>
          {item.observacoes ? (item.observacoes.length > 30 ? item.observacoes.substring(0, 30) + '...' : item.observacoes) : '-'}
        </span>
      ),
    },
    {
      key: 'custo',
      header: 'Custo',
      cell: (item: StockMovement) => (
        <div className="text-xs">
          <p>Unit: {formatCurrency(item.custo_unitario)}</p>
          <p className="font-medium">Total: {formatCurrency(item.custo_total)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (item: StockMovement) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(item)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label>Tipo de Movimentação</Label>
                <Select
                  value={filters.movementType || 'all'}
                  onValueChange={(v) => setFilters({ ...filters, movementType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {movementTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto</Label>
                {loadingOptions ? (
                  <div className="flex items-center justify-center h-10 px-3 border rounded-md bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Carregando produtos...</span>
                  </div>
                ) : (
                  <ProductSearchCombobox
                    products={products && Array.isArray(products) && products.length > 0
                      ? products
                          .filter(p => p && p.id && p.name) // Garantir que produtos sejam válidos
                          .map(p => ({
                            id: String(p.id),
                            name: String(p.name || 'Sem nome'),
                            internal_code: p.internal_code ? String(p.internal_code) : null,
                            brand: p.brand ? String(p.brand) : null,
                            description: p.description ? String(p.description) : null,
                          }))
                      : []}
                    value={filters.productId}
                    onSelect={(value) => {
                      console.log('✅ Produto selecionado:', value);
                      setFilters({ ...filters, productId: value || undefined });
                    }}
                    placeholder={products.length === 0 ? "Selecione um produto..." : "Todos os produtos"}
                    className="w-full"
                    allowClear={true}
                    clearLabel="Todos os produtos"
                    disabled={loadingOptions}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Código do Produto</Label>
                <Input
                  placeholder="Buscar por código..."
                  value={filters.productCode || ''}
                  onChange={(e) => setFilters({ ...filters, productCode: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input
                  placeholder="Buscar por nome..."
                  value={filters.productName || ''}
                  onChange={(e) => setFilters({ ...filters, productName: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={filters.categoryId || 'all'}
                  onValueChange={(v) => setFilters({ ...filters, categoryId: v === 'all' ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Filtrar por marca..."
                  value={filters.brand || ''}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select
                  value={filters.userId || 'all'}
                  onValueChange={(v) => setFilters({ ...filters, userId: v === 'all' ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº Pedido de Venda</Label>
                <Input
                  type="number"
                  placeholder="Ex: 123"
                  value={filters.saleNumber || ''}
                  onChange={(e) => setFilters({ ...filters, saleNumber: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nº Nota Fiscal</Label>
                <Input
                  type="number"
                  placeholder="Ex: 12345"
                  value={filters.invoiceNumber || ''}
                  onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nº Separação</Label>
                <Input
                  placeholder="ID da separação"
                  value={filters.pickingId || ''}
                  onChange={(e) => setFilters({ ...filters, pickingId: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleGenerateReport} disabled={loading} className="btn-gradient">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Relatório
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Entradas</p>
              <p className="text-2xl font-bold text-green-600">{reportData.totalEntradas}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Saídas</p>
              <p className="text-2xl font-bold text-red-600">{reportData.totalSaidas}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Ajustes</p>
              <p className="text-2xl font-bold text-yellow-600">{reportData.totalAjustes}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Saldo Final</p>
              <p className="text-2xl font-bold">{reportData.saldoFinal}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Valor Movimentado</p>
              <p className="text-2xl font-bold">{formatCurrency(reportData.totalMovimentadoValor)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Table */}
      {reportData && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>
              Movimentações ({reportData.movements.length} registros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={reportData.movements}
              loading={loading}
              emptyMessage="Nenhuma movimentação encontrada"
            />
          </CardContent>
        </Card>
      )}

      {/* Dialog de Detalhes da Movimentação */}
      <Dialog open={!!selectedMovement} onOpenChange={(open) => !open && setSelectedMovement(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Movimentação</DialogTitle>
            <DialogDescription>
              {selectedMovement && (
                <div className="space-y-2 mt-2">
                  <p><strong>Produto:</strong> {selectedMovement.product.name}</p>
                  <p><strong>Código:</strong> {selectedMovement.product.internal_code}</p>
                  <p><strong>Tipo:</strong> {getMovementTypeLabel(selectedMovement.type)}</p>
                  <p><strong>Quantidade:</strong> {selectedMovement.quantity}</p>
                  <p><strong>Data:</strong> {formatDate(selectedMovement.created_at)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : movementDetails ? (
            <div className="space-y-4">
              {movementDetails.type === 'sale' && movementDetails.items && (
                <div>
                  <h3 className="font-semibold mb-2">Itens da Venda #{movementDetails.sale?.sale_number}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementDetails.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.name || '-'}</TableCell>
                          <TableCell>{item.product?.internal_code || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {movementDetails.type === 'picking' && movementDetails.items && (
                <div>
                  <h3 className="font-semibold mb-2">
                    Itens da Separação #{movementDetails.picking?.sale?.sale_number || '-'}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Qtd. Vendida</TableHead>
                        <TableHead>Qtd. Separada</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementDetails.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.substituted_product ? (
                              <div>
                                <p className="line-through text-muted-foreground">
                                  {item.product?.name || '-'}
                                </p>
                                <p className="font-medium">
                                  {item.substituted_product.name} (Substituído)
                                </p>
                              </div>
                            ) : (
                              item.product?.name || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {item.substituted_product 
                              ? item.substituted_product.internal_code 
                              : item.product?.internal_code || '-'}
                          </TableCell>
                          <TableCell>{item.quantity_sold}</TableCell>
                          <TableCell>{item.quantity_picked}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.status_item === 'ok' ? 'bg-green-100 text-green-800' :
                              item.status_item === 'falta' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status_item}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {movementDetails.type === 'invoice' && movementDetails.items && (
                <div>
                  <h3 className="font-semibold mb-2">
                    Itens da Nota Fiscal #{movementDetails.invoice?.invoice_number}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementDetails.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.name || '-'}</TableCell>
                          <TableCell>{item.product?.internal_code || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {movementDetails.type === 'manual' && (
                <div>
                  <p className="text-muted-foreground">
                    Esta é uma movimentação manual. Não há itens relacionados para conferir.
                  </p>
                </div>
              )}

              {movementDetails.items && movementDetails.items.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum item encontrado para esta movimentação.
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Carregando detalhes...
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

