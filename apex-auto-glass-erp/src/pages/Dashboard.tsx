import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge, getServiceOrderStatus, getPaymentStatus } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  Users,
  Package,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DashboardData {
  totalSalesToday: number;
  totalSalesWeek: number;
  totalSalesMonth: number;
  pendingServiceOrders: number;
  lowStockProducts: number;
  pendingPayments: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: any[];
  recentSales: any[];
  salesChart: { date: string; value: number }[];
  topProducts: { name: string; quantity: number }[];
}

export default function Dashboard() {
  const { profile, company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch all data in parallel
      const [
        salesTodayResult,
        salesWeekResult,
        salesMonthResult,
        pendingOSResult,
        lowStockResult,
        pendingPaymentsResult,
        customersResult,
        productsResult,
        recentOrdersResult,
        recentSalesResult,
        topProductsResult,
      ] = await Promise.all([
        company?.id
          ? supabase.from('sales').select('total').eq('company_id', company.id).gte('created_at', startOfDay)
          : Promise.resolve({ data: [], error: null }),
        company?.id
          ? supabase.from('sales').select('total').eq('company_id', company.id).gte('created_at', startOfWeek)
          : Promise.resolve({ data: [], error: null }),
        company?.id
          ? supabase.from('sales').select('total').eq('company_id', company.id).gte('created_at', startOfMonth)
          : Promise.resolve({ data: [], error: null }),
        company?.id 
          ? supabase.from('service_orders').select('id').eq('company_id', company.id).in('status', ['open', 'in_progress'])
          : Promise.resolve({ data: [], error: null }),
        // Buscar produtos com estoque baixo usando função SQL
        company?.id 
          ? supabase.rpc('get_low_stock_products', { p_company_id: company.id })
          : Promise.resolve({ data: [], error: null }),
        company?.id
          ? supabase.from('financial_transactions').select('amount').eq('company_id', company.id).eq('type', 'expense').eq('status', 'pending')
          : Promise.resolve({ data: [], error: null }),
        company?.id
          ? supabase.from('customers').select('id', { count: 'exact' }).eq('company_id', company.id)
          : Promise.resolve({ data: [], error: null, count: 0 }),
        company?.id
          ? supabase.from('products').select('id', { count: 'exact' }).eq('company_id', company.id)
          : Promise.resolve({ data: [], error: null, count: 0 }),
        company?.id
          ? supabase.from('service_orders').select('*, customer:customers(name)').eq('company_id', company.id).order('created_at', { ascending: false }).limit(5)
          : Promise.resolve({ data: [], error: null }),
        company?.id
          ? supabase.from('sales').select('*, customer:customers(name)').eq('company_id', company.id).order('created_at', { ascending: false }).limit(5)
          : Promise.resolve({ data: [], error: null }),
        // Buscar produtos mais vendidos do último mês
        // Primeiro buscar IDs das vendas da empresa no período
        company?.id
          ? (async () => {
              // Buscar vendas da empresa no período
              const { data: salesData } = await supabase
                .from('sales')
                .select('id')
                .eq('company_id', company.id)
                .gte('created_at', startOfMonth);
              
              if (!salesData || salesData.length === 0) {
                return { data: [], error: null };
              }
              
              const saleIds = salesData.map(s => s.id);
              
              // Buscar itens dessas vendas
              const { data: itemsData, error: itemsError } = await supabase
                .from('sale_items')
                .select('product_id, quantity, product:products(name)')
                .in('sale_id', saleIds);
              
              return { data: itemsData || [], error: itemsError };
            })()
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Calculate totals
      const totalSalesToday = salesTodayResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const totalSalesWeek = salesWeekResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const totalSalesMonth = salesMonthResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const pendingPayments = pendingPaymentsResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Generate mock chart data
      const salesChart = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          value: Math.floor(Math.random() * 5000) + 1000,
        };
      });

      // Processar produtos mais vendidos
      let topProducts: { name: string; quantity: number }[] = [];
      if (topProductsResult.data && topProductsResult.data.length > 0) {
        // Agrupar por produto e somar quantidades
        const productTotals = topProductsResult.data.reduce((acc: any, item: any) => {
          const productName = (item.product as any)?.name || 'Produto Desconhecido';
          const productId = item.product_id || 'unknown';
          if (!acc[productId]) {
            acc[productId] = { name: productName, quantity: 0 };
          }
          acc[productId].quantity += item.quantity || 0;
          return acc;
        }, {});

        // Converter para array, ordenar por quantidade e pegar top 5
        topProducts = Object.values(productTotals)
          .sort((a: any, b: any) => b.quantity - a.quantity)
          .slice(0, 5) as { name: string; quantity: number }[];
      }

      setData({
        totalSalesToday,
        totalSalesWeek,
        totalSalesMonth,
        pendingServiceOrders: pendingOSResult.data?.length || 0,
        lowStockProducts: lowStockResult.data?.length || 0,
        pendingPayments,
        totalCustomers: customersResult.count || 0,
        totalProducts: productsResult.count || 0,
        recentOrders: recentOrdersResult.data || [],
        recentSales: recentSalesResult.data || [],
        salesChart,
        topProducts,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const orderColumns = [
    { key: 'order_number', header: 'OS #', cell: (item: any) => `#${item.order_number}` },
    { key: 'customer', header: 'Cliente', cell: (item: any) => item.customer?.name || '-' },
    {
      key: 'status',
      header: 'Status',
      cell: (item: any) => {
        const status = getServiceOrderStatus(item.status);
        return <StatusBadge status={status.type} label={status.label} />;
      },
    },
    { key: 'total_amount', header: 'Total', cell: (item: any) => formatCurrency(item.total_amount) },
  ];

  const salesColumns = [
    { key: 'sale_number', header: 'Venda #', cell: (item: any) => `#${item.sale_number}` },
    { key: 'customer', header: 'Cliente', cell: (item: any) => item.customer?.name || '-' },
    {
      key: 'payment_status',
      header: 'Pagamento',
      cell: (item: any) => {
        const status = getPaymentStatus(item.payment_status);
        return <StatusBadge status={status.type} label={status.label} />;
      },
    },
    { key: 'total', header: 'Total', cell: (item: any) => formatCurrency(item.total) },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-slide-up stagger-1">
          <StatCard
            title="Vendas Hoje"
            value={formatCurrency(data?.totalSalesToday || 0)}
            icon={DollarSign}
            variant="primary"
            trend={{ value: 12, isPositive: true }}
          />
        </div>
        <div className="animate-slide-up stagger-2">
          <StatCard
            title="OS Pendentes"
            value={data?.pendingServiceOrders || 0}
            icon={ClipboardList}
            variant="warning"
          />
        </div>
        <div className="animate-slide-up stagger-3">
          <StatCard
            title="Estoque Baixo"
            value={data?.lowStockProducts || 0}
            icon={AlertTriangle}
            variant="danger"
          />
        </div>
        <div className="animate-slide-up stagger-4">
          <StatCard
            title="Clientes"
            value={data?.totalCustomers || 0}
            icon={Users}
            variant="success"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Vendas da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.salesChart || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `R$${value / 1000}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topProducts || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => [`${value} unidades`, 'Quantidade']}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ordens de Serviço Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={orderColumns}
              data={data?.recentOrders || []}
              emptyMessage="Nenhuma OS encontrada"
            />
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={salesColumns}
              data={data?.recentSales || []}
              emptyMessage="Nenhuma venda encontrada"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
