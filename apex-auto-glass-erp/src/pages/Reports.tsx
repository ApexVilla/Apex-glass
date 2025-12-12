import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Download, TrendingUp, Package, DollarSign, Users, ShoppingCart, AlertTriangle, FileText } from 'lucide-react';
import { StockMovementReport } from '@/components/reports/StockMovementReport';
import { PickingTimesReport } from '@/components/reports/PickingTimesReport';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type ReportCategory = 'vendas' | 'estoque' | 'financeiro';

const reportOptions = {
  vendas: [
    { value: 'sales_overview', label: 'Visão Geral de Vendas' },
    { value: 'sales_by_period', label: 'Vendas por Período' },
    { value: 'sales_by_seller', label: 'Vendas por Vendedor' },
    { value: 'top_customers', label: 'Melhores Clientes' },
  ],
  estoque: [
    { value: 'stock_overview', label: 'Visão Geral do Estoque' },
    { value: 'low_stock', label: 'Produtos com Estoque Baixo' },
    { value: 'top_products', label: 'Produtos Mais Vendidos' },
    { value: 'stock_value', label: 'Valor do Estoque' },
    { value: 'stock_movements', label: 'Movimentação de Estoque' },
    { value: 'picking_times', label: 'Tempos de Separação' },
  ],
  financeiro: [
    { value: 'financial_overview', label: 'Visão Geral Financeira' },
    { value: 'income_expense', label: 'Receitas x Despesas' },
    { value: 'cash_flow', label: 'Fluxo de Caixa' },
    { value: 'pending_payments', label: 'Pagamentos Pendentes' },
    { value: 'cost_center_revenue_expense', label: 'Receita e Despesa por Centro de Custo' },
    { value: 'cost_center_result', label: 'Resultado por Centro de Custo' },
    { value: 'cost_center_period', label: 'Totais por Período - Centro de Custo' },
  ],
};

export default function Reports() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('vendas');
  const [reportType, setReportType] = useState('sales_overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [reportData, setReportData] = useState<any>(null);
  
  // Obter company_id (considera override para master users)
  const companyId = company?.id;

  useEffect(() => {
    if (companyId) {
      loadReport();
    }
  }, [reportType, dateRange, companyId]);

  useEffect(() => {
    // Reset report type when category changes
    const firstOption = reportOptions[category][0].value;
    setReportType(firstOption);
  }, [category]);

  const loadReport = async () => {
    setLoading(true);
    try {
      switch (reportType) {
        case 'sales_overview':
        case 'sales_by_period':
          await loadSalesReport();
          break;
        case 'sales_by_seller':
          await loadSalesBySeller();
          break;
        case 'top_customers':
          await loadTopCustomers();
          break;
        case 'stock_overview':
        case 'low_stock':
          await loadStockReport();
          break;
        case 'top_products':
          await loadTopProducts();
          break;
        case 'stock_value':
          await loadStockValue();
          break;
        case 'stock_movements':
          // This report is handled by StockMovementReport component
          break;
        case 'financial_overview':
        case 'income_expense':
        case 'cash_flow':
          await loadFinancialReport();
          break;
        case 'pending_payments':
          await loadPendingPayments();
          break;
        case 'cost_center_revenue_expense':
        case 'cost_center_result':
        case 'cost_center_period':
          await loadCostCenterReport();
          break;
        default:
          await loadSalesReport();
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    if (!companyId) return;
    
    const { data: sales } = await supabase
      .from('sales')
      .select('created_at, total, customer:customers(name)')
      .eq('company_id', companyId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59')
      .order('created_at');

    const salesByDay = sales?.reduce((acc: any, sale) => {
      const date = sale.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + Number(sale.total);
      return acc;
    }, {});

    const chartData = Object.entries(salesByDay || {}).map(([date, total]) => ({
      date: formatDate(date),
      total,
    }));

    const totalSales = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
    const avgTicket = sales?.length ? totalSales / sales.length : 0;

    setReportData({
      type: 'sales',
      chartData,
      summary: {
        totalSales,
        avgTicket,
        count: sales?.length || 0,
      },
    });
  };

  const loadSalesBySeller = async () => {
    if (!companyId) return;
    
    // Buscar vendas
    const { data: sales } = await supabase
      .from('sales')
      .select('total, seller_id')
      .eq('company_id', companyId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59');

    // Buscar seller_ids únicos
    const sellerIds = [...new Set(sales?.map(s => s.seller_id).filter(Boolean) || [])];
    
    // Buscar perfis dos vendedores
    const sellerMap: Record<string, string> = {};
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sellerIds);
      
      profiles?.forEach(profile => {
        sellerMap[profile.id] = profile.full_name;
      });
    }

    const bySeller = sales?.reduce((acc: any, sale) => {
      const sellerName = sale.seller_id ? (sellerMap[sale.seller_id] || 'Vendedor Desconhecido') : 'Sem Vendedor';
      if (!acc[sellerName]) {
        acc[sellerName] = { total: 0, count: 0 };
      }
      acc[sellerName].total += Number(sale.total);
      acc[sellerName].count += 1;
      return acc;
    }, {});

    const chartData = Object.entries(bySeller || {})
      .map(([name, data]: [string, any]) => ({ 
        name, 
        total: data.total,
        count: data.count,
        avgTicket: data.count > 0 ? data.total / data.count : 0
      }))
      .sort((a: any, b: any) => b.total - a.total);

    const totalSales = chartData.reduce((sum: number, item: any) => sum + item.total, 0);
    const totalCount = chartData.reduce((sum: number, item: any) => sum + item.count, 0);

    setReportData({ 
      type: 'sales_by_seller', 
      chartData,
      summary: {
        totalSales,
        totalCount,
        sellerCount: chartData.length
      }
    });
  };

  const loadTopCustomers = async () => {
    if (!companyId) return;
    
    const { data: sales } = await supabase
      .from('sales')
      .select('total, customer:customers(name)')
      .eq('company_id', companyId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59');

    const byCustomer = sales?.reduce((acc: any, sale) => {
      const name = (sale.customer as any)?.name || 'Consumidor Final';
      acc[name] = (acc[name] || 0) + Number(sale.total);
      return acc;
    }, {});

    const chartData = Object.entries(byCustomer || {})
      .map(([name, total]) => ({ name, total }))
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10);

    setReportData({ type: 'top_customers', chartData });
  };

  const loadStockReport = async () => {
    if (!companyId) return;
    
    const { data: products } = await supabase
      .from('products')
      .select('name, quantity, min_quantity, sale_price')
      .eq('company_id', companyId)
      .order('quantity', { ascending: true });

    const lowStock = products?.filter(p => p.quantity <= p.min_quantity) || [];
    const outOfStock = products?.filter(p => p.quantity === 0) || [];

    setReportData({
      type: 'stock',
      lowStock,
      summary: {
        total: products?.length || 0,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
    });
  };

  const loadTopProducts = async () => {
    if (!companyId) return;
    
    // Buscar sale_items através de sales para garantir filtro por empresa
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('company_id', companyId)
      .gte('created_at', dateRange.start);
    
    const saleIds = sales?.map(s => s.id) || [];
    if (saleIds.length === 0) {
      setReportData({ type: 'top_products', chartData: [] });
      return;
    }
    
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('product_id, quantity, product:products(name)')
      .in('sale_id', saleIds);

    const productTotals = saleItems?.reduce((acc: any, item) => {
      const name = (item.product as any)?.name || 'Desconhecido';
      acc[name] = (acc[name] || 0) + item.quantity;
      return acc;
    }, {});

    const chartData = Object.entries(productTotals || {})
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    setReportData({ type: 'top_products', chartData });
  };

  const loadStockValue = async () => {
    if (!companyId) return;
    
    const { data: products } = await supabase
      .from('products')
      .select('name, type, quantity, purchase_price, sale_price')
      .eq('company_id', companyId);

    const byType = products?.reduce((acc: any, p) => {
      const type = p.type || 'Outros';
      if (!acc[type]) acc[type] = { cost: 0, sale: 0 };
      acc[type].cost += (p.quantity || 0) * (p.purchase_price || 0);
      acc[type].sale += (p.quantity || 0) * (p.sale_price || 0);
      return acc;
    }, {});

    const chartData = Object.entries(byType || {}).map(([name, values]: [string, any]) => ({
      name,
      custo: values.cost,
      venda: values.sale,
    }));

    const totalCost = products?.reduce((sum, p) => sum + (p.quantity || 0) * (p.purchase_price || 0), 0) || 0;
    const totalSale = products?.reduce((sum, p) => sum + (p.quantity || 0) * (p.sale_price || 0), 0) || 0;

    setReportData({
      type: 'stock_value',
      chartData,
      summary: { totalCost, totalSale, profit: totalSale - totalCost },
    });
  };

  const loadFinancialReport = async () => {
    if (!companyId) return;
    
    const { data: transactions } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59');

    const income = transactions?.filter(t => t.type === 'income' && t.status === 'paid')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const expenses = transactions?.filter(t => t.type === 'expense' && t.status === 'paid')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const byCategory = transactions?.filter(t => t.type === 'expense')
      .reduce((acc: any, t) => {
        const cat = t.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + Number(t.amount);
        return acc;
      }, {});

    const pieData = Object.entries(byCategory || {}).map(([name, value]) => ({ name, value }));

    setReportData({
      type: 'financial',
      summary: { income, expenses, profit: income - expenses },
      pieData,
    });
  };

  const loadPendingPayments = async () => {
    if (!companyId) return;
    
    const { data: transactions } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    const receivables = transactions?.filter(t => t.type === 'income') || [];
    const payables = transactions?.filter(t => t.type === 'expense') || [];

    setReportData({
      type: 'pending',
      receivables,
      payables,
      summary: {
        totalReceivables: receivables.reduce((sum, t) => sum + Number(t.amount), 0),
        totalPayables: payables.reduce((sum, t) => sum + Number(t.amount), 0),
      },
    });
  };

  const loadCostCenterReport = async () => {
    if (!companyId) return;
    
    // Carregar contas a receber e pagar com centro de custo
    const [receivablesRes, payablesRes, costCentersRes] = await Promise.all([
      supabase
        .from('accounts_receivable')
        .select('*, cost_center:cost_centers(id, name, type)')
        .eq('company_id', companyId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59'),
      supabase
        .from('accounts_payable')
        .select('*, cost_center:cost_centers(id, name, type)')
        .eq('company_id', companyId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59'),
      supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name'),
    ]);

    const receivables = receivablesRes.data || [];
    const payables = payablesRes.data || [];
    const costCenters = costCentersRes.data || [];

    // Agrupar por centro de custo
    const byCostCenter: Record<string, { name: string; type: string; receitas: number; despesas: number }> = {};

    costCenters.forEach((cc) => {
      byCostCenter[cc.id] = {
        name: cc.name,
        type: cc.type || 'misto',
        receitas: 0,
        despesas: 0,
      };
    });

    // Calcular receitas por centro de custo
    receivables.forEach((r) => {
      if (r.cost_center_id && r.status === 'pago_total') {
        const ccId = r.cost_center_id;
        if (byCostCenter[ccId]) {
          byCostCenter[ccId].receitas += Number(r.paid_value || r.net_value || 0);
        }
      }
    });

    // Calcular despesas por centro de custo
    payables.forEach((p) => {
      if (p.cost_center_id && p.status === 'pago_total') {
        const ccId = p.cost_center_id;
        if (byCostCenter[ccId]) {
          byCostCenter[ccId].despesas += Number(p.paid_value || p.final_value || 0);
        }
      }
    });

    // Converter para array e calcular saldo
    const chartData = Object.entries(byCostCenter).map(([id, data]) => ({
      id,
      name: data.name,
      type: data.type,
      receitas: data.receitas,
      despesas: data.despesas,
      saldo: data.receitas - data.despesas,
    }));

    // Agrupar por período (mensal)
    const byPeriod: Record<string, { receitas: number; despesas: number }> = {};
    
    receivables.forEach((r) => {
      if (r.status === 'pago_total' && r.paid_at) {
        const month = r.paid_at.substring(0, 7); // YYYY-MM
        if (!byPeriod[month]) {
          byPeriod[month] = { receitas: 0, despesas: 0 };
        }
        byPeriod[month].receitas += Number(r.paid_value || r.net_value || 0);
      }
    });

    payables.forEach((p) => {
      if (p.status === 'pago_total' && p.paid_at) {
        const month = p.paid_at.substring(0, 7); // YYYY-MM
        if (!byPeriod[month]) {
          byPeriod[month] = { receitas: 0, despesas: 0 };
        }
        byPeriod[month].despesas += Number(p.paid_value || p.final_value || 0);
      }
    });

    const periodData = Object.entries(byPeriod)
      .map(([month, data]) => ({
        month,
        receitas: data.receitas,
        despesas: data.despesas,
        saldo: data.receitas - data.despesas,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setReportData({
      type: 'cost_center',
      chartData,
      periodData,
      summary: {
        totalReceitas: chartData.reduce((sum, d) => sum + d.receitas, 0),
        totalDespesas: chartData.reduce((sum, d) => sum + d.despesas, 0),
        totalSaldo: chartData.reduce((sum, d) => sum + d.saldo, 0),
      },
    });
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (reportData.type) {
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                      <p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalSales)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10"><DollarSign className="h-6 w-6 text-success" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold">{formatCurrency(reportData.summary.avgTicket)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-info/10"><ShoppingCart className="h-6 w-6 text-info" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nº de Vendas</p>
                      <p className="text-2xl font-bold">{reportData.summary.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="card-elevated">
              <CardHeader><CardTitle>Evolução de Vendas</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `R$${value / 1000}k`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Vendas']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'top_customers':
        return (
          <Card className="card-elevated">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Melhores Clientes</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis dataKey="name" type="category" className="text-xs" width={150} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'sales_by_seller':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                      <p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalSales)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-info/10"><Users className="h-6 w-6 text-info" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nº de Vendedores</p>
                      <p className="text-2xl font-bold">{reportData.summary.sellerCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10"><ShoppingCart className="h-6 w-6 text-success" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                      <p className="text-2xl font-bold">{reportData.summary.totalCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="card-elevated">
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Vendas por Vendedor</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis dataKey="name" type="category" className="text-xs" width={150} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'total') return [formatCurrency(value), 'Total'];
                          if (name === 'count') return [`${value} vendas`, 'Quantidade'];
                          if (name === 'avgTicket') return [formatCurrency(value), 'Ticket Médio'];
                          return [value, name];
                        }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        labelFormatter={(label) => `Vendedor: ${label}`}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardHeader><CardTitle>Detalhamento por Vendedor</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reportData.chartData.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.count} {item.count === 1 ? 'venda' : 'vendas'}</p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Ticket Médio</p>
                          <p className="font-semibold text-muted-foreground">{formatCurrency(item.avgTicket)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold text-primary">{formatCurrency(item.total)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'stock':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10"><Package className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Produtos</p>
                      <p className="text-2xl font-bold">{reportData.summary.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-warning/10"><AlertTriangle className="h-6 w-6 text-warning" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                      <p className="text-2xl font-bold text-warning">{reportData.summary.lowStockCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10"><Package className="h-6 w-6 text-destructive" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sem Estoque</p>
                      <p className="text-2xl font-bold text-destructive">{reportData.summary.outOfStockCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-warning">Produtos com Estoque Baixo</CardTitle></CardHeader>
              <CardContent>
                {reportData.lowStock.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhum produto com estoque baixo</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {reportData.lowStock.map((product: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">Mínimo: {product.min_quantity} unidades</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-destructive">{product.quantity}</p>
                          <p className="text-xs text-muted-foreground">em estoque</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'top_products':
        return (
          <Card className="card-elevated">
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Produtos Mais Vendidos</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={150} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: any) => [`${value} unidades`, 'Quantidade']}
                      labelFormatter={(label) => label}
                    />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'stock_value':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Valor de Custo</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalCost)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Valor de Venda</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(reportData.summary.totalSale)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Lucro Potencial</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(reportData.summary.profit)}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="card-elevated">
              <CardHeader><CardTitle>Valor por Tipo de Produto</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="custo" name="Custo" fill="#64748B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="venda" name="Venda" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Receitas</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(reportData.summary.income)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.summary.expenses)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Lucro</p>
                  <p className={`text-2xl font-bold ${reportData.summary.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(reportData.summary.profit)}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card className="card-elevated">
              <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportData.pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                        {reportData.pieData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'pending':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">A Receber</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(reportData.summary.totalReceivables)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">A Pagar</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.summary.totalPayables)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-elevated">
                <CardHeader><CardTitle className="text-success">Contas a Receber</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {reportData.receivables.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">Nenhuma conta a receber</p>
                    ) : (
                      reportData.receivables.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-success/5 border border-success/20">
                          <div>
                            <p className="font-medium">{t.description}</p>
                            <p className="text-xs text-muted-foreground">Venc: {formatDate(t.due_date)}</p>
                          </div>
                          <p className="font-semibold text-success">{formatCurrency(t.amount)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardHeader><CardTitle className="text-destructive">Contas a Pagar</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {reportData.payables.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">Nenhuma conta a pagar</p>
                    ) : (
                      reportData.payables.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div>
                            <p className="font-medium">{t.description}</p>
                            <p className="text-xs text-muted-foreground">Venc: {formatDate(t.due_date)}</p>
                          </div>
                          <p className="font-semibold text-destructive">{formatCurrency(t.amount)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'cost_center':
        if (reportType === 'cost_center_period') {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Receitas</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(reportData.summary.totalReceitas)}</p>
                  </CardContent>
                </Card>
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Despesas</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.summary.totalDespesas)}</p>
                  </CardContent>
                </Card>
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Saldo Total</p>
                    <p className={`text-2xl font-bold ${reportData.summary.totalSaldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(reportData.summary.totalSaldo)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card className="card-elevated">
                <CardHeader><CardTitle>Evolução por Período</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={reportData.periodData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(value) => `R$${value / 1000}k`} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatCurrency(value), name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Saldo']} 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="receitas" stroke="#10B981" strokeWidth={2} name="Receitas" />
                        <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={2} name="Despesas" />
                        <Line type="monotone" dataKey="saldo" stroke="#3B82F6" strokeWidth={2} name="Saldo" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Receitas</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(reportData.summary.totalReceitas)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Despesas</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.summary.totalDespesas)}</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Saldo Total</p>
                  <p className={`text-2xl font-bold ${reportData.summary.totalSaldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(reportData.summary.totalSaldo)}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card className="card-elevated">
              <CardHeader><CardTitle>{reportType === 'cost_center_result' ? 'Resultado por Centro de Custo' : 'Receita e Despesa por Centro de Custo'}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Saldo']} 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} 
                      />
                      <Legend />
                      <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      {reportType === 'cost_center_result' && (
                        <Bar dataKey="saldo" name="Saldo" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardHeader><CardTitle>Detalhamento por Centro de Custo</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reportData.chartData.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Tipo: {item.type}</p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Receitas</p>
                          <p className="font-semibold text-success">{formatCurrency(item.receitas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Despesas</p>
                          <p className="font-semibold text-destructive">{formatCurrency(item.despesas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p className={`font-bold ${item.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(item.saldo)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Selecione o setor e o tipo de relatório" />

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">
                    <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Vendas</div>
                  </SelectItem>
                  <SelectItem value="estoque">
                    <div className="flex items-center gap-2"><Package className="h-4 w-4" /> Estoque</div>
                  </SelectItem>
                  <SelectItem value="financeiro">
                    <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financeiro</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportOptions[category].map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-40" />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-40" />
            </div>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportType === 'stock_movements' ? (
        <StockMovementReport />
      ) : reportType === 'picking_times' ? (
        <PickingTimesReport />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
          <Skeleton className="h-80 rounded-xl col-span-full" />
        </div>
      ) : (
        renderReport()
      )}
    </div>
  );
}
