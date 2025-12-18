import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  ArrowRightLeft,
  ArrowRight,
  Settings,
  FileText,
  Receipt,
  Upload,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ReceivableForm } from '@/components/financial/ReceivableForm';
import { ReceivablePaymentModal } from '@/components/financial/ReceivablePaymentModal';
import { PayableForm } from '@/components/financial/PayableForm';
import { PayablePaymentModal } from '@/components/financial/PayablePaymentModal';
import { NatureForm } from '@/components/financial/NatureForm';
import { CostCenterForm } from '@/components/financial/CostCenterForm';
import { AccountForm } from '@/components/financial/AccountForm';
import { CashMovementForm } from '@/components/financial/CashMovementForm';
import { ReconciliationTab } from '@/components/financial/ReconciliationTab';

import { CashClosureModal } from '@/components/financial/CashClosureModal';
import { ReverseMovementModal } from '@/components/financial/ReverseMovementModal';
import { AccountTransferModal } from '@/components/financial/AccountTransferModal';
import { CashDashboard } from '@/components/financial/CashDashboard';
import { CashReports } from '@/components/financial/CashReports';
import { CashAlerts } from '@/components/financial/CashAlerts';
import { CreditAnalysisPanel } from '@/components/financial/CreditAnalysisPanel';
import { AccountReceivable, AccountPayable, FinancialNature, CostCenter, FinancialAccount, FinancialMovement } from '@/types/financial';

export default function Financial() {
  const { profile, company } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Receivables
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [filteredReceivables, setFilteredReceivables] = useState<AccountReceivable[]>([]);
  const [receivableFormOpen, setReceivableFormOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountReceivable | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receivableFilters, setReceivableFilters] = useState({
    status: 'all',
    customer: 'all',
    startDate: '',
    endDate: '',
    search: '',
    showOverdueOnly: false,
  });
  // Receivables Pagination
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [receivablesPageSize, setReceivablesPageSize] = useState(5);
  const [receivablesTotal, setReceivablesTotal] = useState(0);

  // Payables
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [filteredPayables, setFilteredPayables] = useState<AccountPayable[]>([]);
  const [payableFormOpen, setPayableFormOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<AccountPayable | null>(null);
  const [payablePaymentModalOpen, setPayablePaymentModalOpen] = useState(false);
  const [payableFilters, setPayableFilters] = useState({
    status: 'all',
    supplier: 'all',
    startDate: '',
    endDate: '',
  });
  // Payables Pagination
  const [payablesPage, setPayablesPage] = useState(1);
  const [payablesPageSize, setPayablesPageSize] = useState(5);
  const [payablesTotal, setPayablesTotal] = useState(0);

  // Configurations
  const [natures, setNatures] = useState<FinancialNature[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [natureFormOpen, setNatureFormOpen] = useState(false);
  const [costCenterFormOpen, setCostCenterFormOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [selectedNature, setSelectedNature] = useState<FinancialNature | null>(null);
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);

  // Cash Movements
  const [cashMovements, setCashMovements] = useState<FinancialMovement[]>([]);
  const [filteredCashMovements, setFilteredCashMovements] = useState<FinancialMovement[]>([]);
  const [cashMovementFormOpen, setCashMovementFormOpen] = useState(false);
  const [selectedCashMovement, setSelectedCashMovement] = useState<FinancialMovement | null>(null);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [cashClosureModalOpen, setCashClosureModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [cashFilters, setCashFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'all',
    account: 'all',
    operator: 'all',
  });
  // Cash Movements Pagination
  const [cashPage, setCashPage] = useState(1);
  const [cashPageSize, setCashPageSize] = useState(5);
  const [cashTotal, setCashTotal] = useState(0);
  const [cashSubTab, setCashSubTab] = useState<'dashboard' | 'movements' | 'reports' | 'alerts'>('dashboard');

  // Dashboard stats
  const [stats, setStats] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    paidReceivables: 0,
    paidPayables: 0,
    overdueReceivables: 0,
    overduePayables: 0,
  });

  useEffect(() => {
    loadStats();
    loadNatures();
    loadCostCenters();
    loadAccounts();
    loadSuppliers();
    loadCustomers();
  }, []);

  useEffect(() => {
    loadReceivables();
  }, [receivableFilters, receivablesPage, receivablesPageSize]);

  useEffect(() => {
    loadPayables();
  }, [payableFilters, payablesPage, payablesPageSize]);

  useEffect(() => {
    loadCashMovements();
  }, [cashFilters, cashPage, cashPageSize]);

  // loadData removido pois agora é efeito colateral dos filtros


  const loadReceivables = async () => {
    try {
      if (!company?.id) {
        console.error('❌ [Financial] company.id não disponível');
        setReceivables([]);
        setFilteredReceivables([]);
        setReceivablesTotal(0);
        return;
      }

      let query = supabase
        .from('accounts_receivable')
        .select(`
          *,
          customer:customers(id, name),
          nature:financial_natures(*),
          cost_center:cost_centers(*),
          destination_account:financial_accounts(*)
        `, { count: 'exact' })
        .eq('company_id', company.id);

      // Filtros
      if (receivableFilters.status !== 'all') {
        query = query.eq('status', receivableFilters.status);
      }
      if (receivableFilters.customer !== 'all') {
        query = query.eq('customer_id', receivableFilters.customer);
      }
      if (receivableFilters.startDate) {
        query = query.gte('expected_receipt_date', receivableFilters.startDate);
      }
      if (receivableFilters.endDate) {
        query = query.lte('expected_receipt_date', receivableFilters.endDate);
      }
      if (receivableFilters.showOverdueOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('expected_receipt_date', today).in('status', ['em_aberto', 'pago_parcial']);
      }
      if (receivableFilters.search) {
        const term = receivableFilters.search;
        // Busca complexa precisa ser feita com cuidado no Supabase ou via RPC se for muito complexa
        // Aqui simplificamos para buscar na descrição ou número
        query = query.or(`description.ilike.%${term}%,invoice_number.ilike.%${term}%`);
      }

      // Paginação
      const from = (receivablesPage - 1) * receivablesPageSize;
      const to = from + receivablesPageSize - 1;

      const { data, error, count } = await query
        .order('expected_receipt_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setReceivables(data || []);
      setFilteredReceivables(data || []); // Mantendo sincronizado
      setReceivablesTotal(count || 0);
    } catch (error: any) {
      console.error('Erro ao carregar receivables:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar contas a receber', variant: 'destructive' });
    }
  };

  const applyReceivableFilters = () => {
    let filtered = [...receivables];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtro por status
    if (receivableFilters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === receivableFilters.status);
    }

    // Filtro por cliente
    if (receivableFilters.customer !== 'all') {
      filtered = filtered.filter((r) => r.customer_id === receivableFilters.customer);
    }

    // Filtro por natureza
    if (receivableFilters.nature !== 'all') {
      filtered = filtered.filter((r) => r.nature_id === receivableFilters.nature);
    }

    // Filtro por busca (descrição, número da nota, cliente)
    if (receivableFilters.search) {
      const searchLower = receivableFilters.search.toLowerCase();
      filtered = filtered.filter((r) => {
        const description = r.description?.toLowerCase() || '';
        const invoiceNumber = r.invoice_number?.toLowerCase() || '';
        const customerName = r.customer?.name?.toLowerCase() || '';
        const transactionNumber = r.transaction_number?.toString() || '';
        return (
          description.includes(searchLower) ||
          invoiceNumber.includes(searchLower) ||
          customerName.includes(searchLower) ||
          transactionNumber.includes(searchLower)
        );
      });
    }

    // Filtro por data
    if (receivableFilters.startDate) {
      filtered = filtered.filter((r) => r.expected_receipt_date >= receivableFilters.startDate);
    }
    if (receivableFilters.endDate) {
      filtered = filtered.filter((r) => r.expected_receipt_date <= receivableFilters.endDate);
    }

    // Filtro de atrasados
    if (receivableFilters.showOverdueOnly) {
      filtered = filtered.filter((r) => {
        const dueDate = new Date(r.expected_receipt_date);
        dueDate.setHours(0, 0, 0, 0);
        return (
          (r.status === 'em_aberto' || r.status === 'pago_parcial') &&
          dueDate < today
        );
      });
    }

    setFilteredReceivables(filtered);
  };

  // applyReceivableFilters removido pois agora é server-side
  const clearReceivableFilters = () => {
    setReceivableFilters({
      status: 'all',
      customer: 'all',
      startDate: '',
      endDate: '',
      search: '',
      showOverdueOnly: false,
    });
    setReceivablesPage(1);
  };

  const loadPayables = async () => {
    try {
      if (!company?.id) {
        console.error('❌ [Financial] company.id não disponível');
        setPayables([]);
        setFilteredPayables([]);
        setPayablesTotal(0);
        return;
      }

      let query = supabase
        .from('accounts_payable')
        .select(`
          *,
          supplier:suppliers(id, nome_razao),
          nature:financial_natures(*),
          cost_center:cost_centers(*),
          origin_account:financial_accounts(*)
        `, { count: 'exact' })
        .eq('company_id', company.id);

      // Filtros
      if (payableFilters.status !== 'all') {
        query = query.eq('status', payableFilters.status);
      }
      if (payableFilters.supplier !== 'all') {
        query = query.eq('supplier_id', payableFilters.supplier);
      }
      if (payableFilters.startDate) {
        query = query.gte('due_date', payableFilters.startDate);
      }
      if (payableFilters.endDate) {
        query = query.lte('due_date', payableFilters.endDate);
      }

      // Paginação
      const from = (payablesPage - 1) * payablesPageSize;
      const to = from + payablesPageSize - 1;

      const { data, error, count } = await query
        .order('due_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setPayables(data || []);
      setFilteredPayables(data || []);
      setPayablesTotal(count || 0);
    } catch (error: any) {
      console.error('Erro ao carregar payables:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar contas a pagar', variant: 'destructive' });
    }
  };

  const applyPayableFilters = () => {
    let filtered = [...payables];

    // Filtro por status
    if (payableFilters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === payableFilters.status);
    }

    // Filtro por natureza
    if (payableFilters.nature !== 'all') {
      filtered = filtered.filter((p) => p.nature_id === payableFilters.nature);
    }

    // Filtro por fornecedor
    if (payableFilters.supplier !== 'all') {
      filtered = filtered.filter((p) => p.supplier_id === payableFilters.supplier);
    }

    // Filtro por data
    if (payableFilters.startDate) {
      filtered = filtered.filter((p) => p.due_date >= payableFilters.startDate);
    }
    if (payableFilters.endDate) {
      filtered = filtered.filter((p) => p.due_date <= payableFilters.endDate);
    }

    setFilteredPayables(filtered);
  };

  // applyPayableFilters removido pois agora é server-side
  const clearPayableFilters = () => {
    setPayableFilters({
      status: 'all',
      supplier: 'all',
      startDate: '',
      endDate: '',
    });
    setPayablesPage(1);
  };

  const loadNatures = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_natures')
        .select('*')
        .order('name');

      if (error) throw error;
      setNatures(data || []);
    } catch (error) {
      console.error('Erro ao carregar naturezas:', error);
    }
  };

  const loadCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, nome_razao')
        .order('nome_razao');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const activeCompanyId = company?.id || profile?.company_id;
      
      if (!activeCompanyId) {
        setCustomers([]);
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', activeCompanyId)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadCashMovements = async () => {
    try {
      if (!company?.id) {
        console.error('❌ [Financial] company.id não disponível');
        setCashMovements([]);
        setFilteredCashMovements([]);
        setCashTotal(0);
        return;
      }

      let query = supabase
        .from('financial_movements')
        .select(`
          *,
          account:financial_accounts(*),
          nature:financial_natures(*),
          cost_center:cost_centers(*)
        `, { count: 'exact' })
        .eq('company_id', company.id);

      // Filtros
      if (cashFilters.date) {
        query = query.eq('movement_date', cashFilters.date);
      }
      if (cashFilters.type !== 'all') {
        query = query.eq('movement_type', cashFilters.type);
      }
      if (cashFilters.account !== 'all') {
        query = query.eq('account_id', cashFilters.account);
      }
      if (cashFilters.operator !== 'all') {
        query = query.eq('operator_id', cashFilters.operator);
      }

      // Paginação
      const from = (cashPage - 1) * cashPageSize;
      const to = from + cashPageSize - 1;

      const { data, error, count } = await query
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setCashMovements(data || []);
      setFilteredCashMovements(data || []);
      setCashTotal(count || 0);
    } catch (error: any) {
      console.error('Erro ao carregar movimentações:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar movimentações de caixa', variant: 'destructive' });
    }
  };

  const applyCashFilters = () => {
    let filtered = [...cashMovements];

    // Filtro por data
    if (cashFilters.date) {
      filtered = filtered.filter((m) => m.movement_date === cashFilters.date);
    }

    // Filtro por tipo
    if (cashFilters.type !== 'all') {
      filtered = filtered.filter((m) => m.movement_type === cashFilters.type);
    }

    // Filtro por natureza
    if (cashFilters.nature !== 'all') {
      filtered = filtered.filter((m) => m.nature_id === cashFilters.nature);
    }

    // Filtro por conta
    if (cashFilters.account !== 'all') {
      filtered = filtered.filter((m) => m.account_id === cashFilters.account);
    }

    // Filtro por operador
    if (cashFilters.operator !== 'all') {
      filtered = filtered.filter((m) => m.operator_id === cashFilters.operator);
    }

    setFilteredCashMovements(filtered);
  };

  // applyCashFilters removido pois agora é server-side
  const clearCashFilters = () => {
    setCashFilters({
      date: new Date().toISOString().split('T')[0],
      type: 'all',
      account: 'all',
      operator: 'all',
    });
    setCashPage(1);
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [receivablesRes, payablesRes] = await Promise.all([
        supabase.from('accounts_receivable').select('net_value, paid_value, status, expected_receipt_date'),
        supabase.from('accounts_payable').select('final_value, paid_value, status, due_date'),
      ]);

      const receivablesData = receivablesRes.data || [];
      const payablesData = payablesRes.data || [];

      const totalReceivables = receivablesData.reduce((sum, r) => sum + Number(r.net_value), 0);
      const totalPayables = payablesData.reduce((sum, p) => sum + Number(p.final_value), 0);
      const paidReceivables = receivablesData.reduce((sum, r) => sum + Number(r.paid_value), 0);
      const paidPayables = payablesData.reduce((sum, p) => sum + Number(p.paid_value), 0);
      const overdueReceivables = receivablesData.filter(
        (r) => r.status === 'em_aberto' && r.expected_receipt_date < today
      ).length;
      const overduePayables = payablesData.filter(
        (p) => p.status === 'em_aberto' && p.due_date < today
      ).length;

      setStats({
        totalReceivables,
        totalPayables,
        paidReceivables,
        paidPayables,
        overdueReceivables,
        overduePayables,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase.from('accounts_receivable').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conta a receber excluída com sucesso' });
      loadReceivables();
      loadStats();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao excluir conta a receber', variant: 'destructive' });
    }
  };

  const handleCancelReceivable = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta conta a receber?')) return;

    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({ status: 'cancelado' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conta a receber cancelada com sucesso' });
      loadReceivables();
      loadStats();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao cancelar conta a receber', variant: 'destructive' });
    }
  };

  const handleDeletePayable = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta a pagar?')) return;

    try {
      const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conta a pagar excluída' });
      loadPayables();
      loadStats();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao excluir', variant: 'destructive' });
    }
  };

  // Calcular estatísticas de contas a receber
  const receivableStats = {
    total: filteredReceivables.reduce((sum, r) => sum + Number(r.net_value), 0),
    received: filteredReceivables
      .filter((r) => r.status === 'pago_total')
      .reduce((sum, r) => sum + Number(r.paid_value), 0),
    toReceive: filteredReceivables
      .filter((r) => r.status === 'em_aberto' || r.status === 'pago_parcial')
      .reduce((sum, r) => sum + (Number(r.net_value) - Number(r.paid_value)), 0),
    overdue: filteredReceivables
      .filter((r) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(r.expected_receipt_date);
        return (r.status === 'em_aberto' || r.status === 'pago_parcial') && dueDate < today;
      })
      .reduce((sum, r) => sum + (Number(r.net_value) - Number(r.paid_value)), 0),
  };

  const receivableColumns = [
    {
      key: 'transaction_number',
      header: 'DOCUMENTO',
      cell: (item: AccountReceivable) => `#${item.transaction_number}`,
    },
    {
      key: 'description',
      header: 'DESCRIÇÃO',
      cell: (item: AccountReceivable) => item.description,
    },
    {
      key: 'customer',
      header: 'CLIENTE',
      cell: (item: AccountReceivable) => item.customer?.name || '-',
    },
    {
      key: 'expected_receipt_date',
      header: 'VENCIMENTO',
      cell: (item: AccountReceivable) => {
        const dueDate = new Date(item.expected_receipt_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const isOverdue = (item.status === 'em_aberto' || item.status === 'pago_parcial') && dueDate < today;
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return (
          <div className="flex items-center gap-2">
            <span className={isOverdue ? 'text-destructive font-semibold' : ''}>
              {formatDate(item.expected_receipt_date)}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} atrasado
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'net_value',
      header: 'VALOR',
      cell: (item: AccountReceivable) => (
        <span className="font-semibold text-success">{formatCurrency(item.net_value)}</span>
      ),
    },
    {
      key: 'paid_value',
      header: 'RECEBIDO',
      cell: (item: AccountReceivable) => formatCurrency(item.paid_value),
    },
    {
      key: 'remaining_value',
      header: 'RESTANTE',
      cell: (item: AccountReceivable) => {
        const remaining = item.net_value - item.paid_value;
        return (
          <span className={remaining > 0 ? 'font-semibold text-warning' : 'text-muted-foreground'}>
            {formatCurrency(remaining)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      cell: (item: AccountReceivable) => {
        const statusMap: any = {
          em_aberto: { type: 'warning', label: 'Em Aberto' },
          pago_parcial: { type: 'info', label: 'Pago Parcial' },
          pago_total: { type: 'success', label: 'Pago Total' },
          cancelado: { type: 'danger', label: 'Cancelado' },
        };
        const status = statusMap[item.status] || statusMap.em_aberto;
        return <StatusBadge status={status.type} label={status.label} />;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      cell: (item: AccountReceivable) => (
        <div className="flex gap-1">
          {item.status !== 'pago_total' && item.status !== 'cancelado' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-success"
              onClick={() => {
                setSelectedReceivable(item);
                setPaymentModalOpen(true);
              }}
              title="Registrar pagamento"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          )}
          {item.status !== 'cancelado' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedReceivable(item);
                setReceivableFormOpen(true);
              }}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {item.status !== 'pago_total' && item.status !== 'cancelado' && (
            <Button
              variant="ghost"
              size="icon"
              className="text-orange-600"
              onClick={() => handleCancelReceivable(item.id)}
              title="Cancelar"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
          {item.status !== 'pago_total' && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => handleDeleteReceivable(item.id)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Calcular estatísticas de contas a pagar
  const payableStats = {
    total: filteredPayables.reduce((sum, p) => sum + Number(p.final_value), 0),
    paid: filteredPayables
      .filter((p) => p.status === 'pago_total')
      .reduce((sum, p) => sum + Number(p.paid_value), 0),
    pending: filteredPayables
      .filter((p) => p.status === 'em_aberto' || p.status === 'pago_parcial')
      .reduce((sum, p) => sum + (Number(p.final_value) - Number(p.paid_value)), 0),
    overdue: filteredPayables
      .filter((p) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(p.due_date);
        return (p.status === 'em_aberto' || p.status === 'pago_parcial') && dueDate < today;
      })
      .reduce((sum, p) => sum + (Number(p.final_value) - Number(p.paid_value)), 0),
  };

  const payableColumns = [
    {
      key: 'transaction_number',
      header: 'DOCUMENTO',
      cell: (item: AccountPayable) => `#${item.transaction_number}`,
    },
    {
      key: 'description',
      header: 'DESCRIÇÃO',
      cell: (item: AccountPayable) => item.description,
    },
    {
      key: 'nature',
      header: 'CATEGORIA',
      cell: (item: AccountPayable) => item.nature?.name || '-',
    },
    {
      key: 'supplier',
      header: 'FORNECEDOR',
      cell: (item: AccountPayable) => item.supplier?.nome_razao || '-',
    },
    {
      key: 'due_date',
      header: 'VENCIMENTO',
      cell: (item: AccountPayable) => formatDate(item.due_date),
    },
    {
      key: 'final_value',
      header: 'VALOR',
      cell: (item: AccountPayable) => (
        <span className="font-semibold text-destructive">{formatCurrency(item.final_value)}</span>
      ),
    },
    {
      key: 'paid_value',
      header: 'PAGO',
      cell: (item: AccountPayable) => formatCurrency(item.paid_value),
    },
    {
      key: 'status',
      header: 'STATUS',
      cell: (item: AccountPayable) => {
        const statusMap: any = {
          em_aberto: { type: 'warning', label: 'Em Aberto' },
          pago_parcial: { type: 'info', label: 'Pago Parcial' },
          pago_total: { type: 'success', label: 'Pago Total' },
          cancelado: { type: 'danger', label: 'Cancelado' },
        };
        const status = statusMap[item.status] || statusMap.em_aberto;
        return <StatusBadge status={status.type} label={status.label} />;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      cell: (item: AccountPayable) => (
        <div className="flex gap-1">
          {item.status !== 'pago_total' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setSelectedPayable(item);
                setPayablePaymentModalOpen(true);
              }}
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedPayable(item);
              setPayableFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {item.status !== 'pago_total' && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => handleDeletePayable(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulo Financeiro"
        description="Gerencie contas a receber, contas a pagar e movimentações financeiras"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-11">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="tesouraria">Tesouraria</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="credit_analysis">Análise de Crédito</TabsTrigger>
          <TabsTrigger value="cost_centers">Centros de Custo</TabsTrigger>
          <TabsTrigger value="natures">Naturezas</TabsTrigger>
          <TabsTrigger value="configurations">Configurações</TabsTrigger>
          <TabsTrigger value="reconciliation">Conciliação</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total a Receber"
              value={formatCurrency(stats.totalReceivables)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title="Total a Pagar"
              value={formatCurrency(stats.totalPayables)}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard
              title="Recebido"
              value={formatCurrency(stats.paidReceivables)}
              icon={DollarSign}
              variant="primary"
            />
            <StatCard
              title="Pago"
              value={formatCurrency(stats.paidPayables)}
              icon={DollarSign}
              variant="info"
            />
          </div>

          {(stats.overdueReceivables > 0 || stats.overduePayables > 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Contas Vencidas</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.overdueReceivables} conta(s) a receber e {stats.overduePayables} conta(s) a pagar vencidas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contas a Receber Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={receivableColumns.slice(0, -1)}
                  data={receivables.slice(0, 5)}
                  emptyMessage="Nenhuma conta a receber"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contas a Pagar Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={payableColumns.slice(0, -1)}
                  data={payables.slice(0, 5)}
                  emptyMessage="Nenhuma conta a pagar"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contas a Pagar */}
        <TabsContent value="payables" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Contas a Pagar</h2>
            <Button
              onClick={() => {
                setSelectedPayable(null);
                setPayableFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(payableStats.total)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pago</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(payableStats.paid)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pendente</p>
                  <p className="text-2xl font-bold text-warning">{formatCurrency(payableStats.pending)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Atrasado</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(payableStats.overdue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={payableFilters.status}
                    onValueChange={(v) => setPayableFilters({ ...payableFilters, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="em_aberto">Em Aberto</SelectItem>
                      <SelectItem value="pago_parcial">Pago Parcial</SelectItem>
                      <SelectItem value="pago_total">Pago Total</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={payableFilters.supplier}
                    onValueChange={(v) => setPayableFilters({ ...payableFilters, supplier: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Fornecedores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Fornecedores</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.nome_razao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={payableFilters.startDate}
                    onChange={(e) => setPayableFilters({ ...payableFilters, startDate: e.target.value })}
                    placeholder="dd / mm / aaaa"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={payableFilters.endDate}
                    onChange={(e) => setPayableFilters({ ...payableFilters, endDate: e.target.value })}
                    placeholder="dd / mm / aaaa"
                  />
                </div>

                <div className="flex items-end gap-2 col-span-2">
                  <Button variant="outline" onClick={clearPayableFilters} className="flex-1">
                    Limpar
                  </Button>
                  <Button onClick={applyPayableFilters} className="flex-1">
                    Filtrar
                  </Button>
                </div>
              </div>
            </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={payableColumns}
              data={filteredPayables}
              loading={loading}
              emptyMessage="Nenhuma conta a pagar encontrada"
            />

            {/* Paginação Pagamentos */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select
                  value={payablesPageSize.toString()}
                  onValueChange={(v) => {
                    setPayablesPageSize(Number(v));
                    setPayablesPage(1);
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
                  Total: {payablesTotal}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPayablesPage(p => Math.max(1, p - 1))}
                  disabled={payablesPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm font-medium">
                  Página {payablesPage} de {Math.ceil(payablesTotal / payablesPageSize) || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPayablesPage(p => Math.min(Math.ceil(payablesTotal / payablesPageSize), p + 1))}
                  disabled={payablesPage >= Math.ceil(payablesTotal / payablesPageSize) || loading}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Contas a Receber */}
      <TabsContent value="receivables" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Contas a Receber</h2>
          <Button
            onClick={() => {
              setSelectedReceivable(null);
              setReceivableFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(receivableStats.total)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Recebido</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(receivableStats.received)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">A Receber</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(receivableStats.toReceive)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Atrasado</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(receivableStats.overdue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros e Busca</CardTitle>
            <CardDescription>Filtre e busque contas a receber por diversos critérios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Busca */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Buscar por descrição, cliente, número da nota ou documento..."
                  value={receivableFilters.search}
                  onChange={(e) => setReceivableFilters({ ...receivableFilters, search: e.target.value })}
                />
              </div>

              {/* Filtros em Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={receivableFilters.status}
                    onValueChange={(v) => setReceivableFilters({ ...receivableFilters, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="em_aberto">Em Aberto</SelectItem>
                      <SelectItem value="pago_parcial">Pago Parcial</SelectItem>
                      <SelectItem value="pago_total">Pago Total</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={receivableFilters.customer}
                    onValueChange={(v) => setReceivableFilters({ ...receivableFilters, customer: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Clientes</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={receivableFilters.startDate}
                    onChange={(e) => setReceivableFilters({ ...receivableFilters, startDate: e.target.value })}
                    placeholder="Data inicial"
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={receivableFilters.endDate}
                    onChange={(e) => setReceivableFilters({ ...receivableFilters, endDate: e.target.value })}
                    placeholder="Data final"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Filtro de Atrasados e Ações */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-overdue"
                  checked={receivableFilters.showOverdueOnly}
                  onChange={(e) => setReceivableFilters({ ...receivableFilters, showOverdueOnly: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="show-overdue" className="cursor-pointer">
                  Mostrar apenas atrasados
                </Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearReceivableFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={receivableColumns}
            data={filteredReceivables}
            loading={loading}
            emptyMessage="Nenhuma conta a receber encontrada"
          />

          {/* Paginação Recebimentos */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select
                value={receivablesPageSize.toString()}
                onValueChange={(v) => {
                  setReceivablesPageSize(Number(v));
                  setReceivablesPage(1);
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
                Total: {receivablesTotal}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceivablesPage(p => Math.max(1, p - 1))}
                disabled={receivablesPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm font-medium">
                Página {receivablesPage} de {Math.ceil(receivablesTotal / receivablesPageSize) || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceivablesPage(p => Math.min(Math.ceil(receivablesTotal / receivablesPageSize), p + 1))}
                disabled={receivablesPage >= Math.ceil(receivablesTotal / receivablesPageSize) || loading}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    {/* Caixa */}
    <TabsContent value="caixa" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Caixa</h2>
        <div className="flex gap-2">
          {cashSubTab === 'movements' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const account = accounts.find((a) => a.type === 'caixa');
                  if (account) {
                    setSelectedAccount(account);
                    if (cashFilters.date) {
                      setCashClosureModalOpen(true);
                    } else {
                      toast({ title: 'Aviso', description: 'Selecione uma data para fechar o caixa', variant: 'destructive' });
                    }
                  } else {
                    toast({ title: 'Aviso', description: 'Nenhuma conta do tipo Caixa encontrada', variant: 'destructive' });
                  }
                }}
              >
                Fechar Caixa
              </Button>
              <Button
                onClick={() => {
                  setSelectedCashMovement(null);
                  setCashMovementFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sub-abas do Caixa */}
      <Tabs value={cashSubTab} onValueChange={(v) => setCashSubTab(v as any)}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <CashDashboard
            accounts={accounts}
            onExport={() => {
              setCashSubTab('reports');
            }}
          />
        </TabsContent>

        {/* Movimentações */}
        <TabsContent value="movements" className="space-y-6">

    {/* Filtros */}
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={cashFilters.date}
              onChange={(e) => setCashFilters({ ...cashFilters, date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={cashFilters.type}
              onValueChange={(v) => setCashFilters({ ...cashFilters, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <div className="space-y-2">
          <Label>Conta</Label>
          <Select
            value={cashFilters.account}
            onValueChange={(v) => setCashFilters({ ...cashFilters, account: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 col-span-2">
          <Button variant="outline" onClick={clearCashFilters} className="flex-1">
            Limpar
          </Button>
          <Button onClick={applyCashFilters} className="flex-1">
            Filtrar
          </Button>
          <Button variant="outline" onClick={() => setCashMovementFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Movimentação
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Resumo do Dia */}
    {cashFilters.date && (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Inicial</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    filteredCashMovements
                      .filter((m) => m.movement_date < cashFilters.date)
                      .reduce((sum, m) => {
                        return sum + (m.movement_type === 'entrada' ? Number(m.value) : -Number(m.value));
                      }, 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Entradas</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(
                    filteredCashMovements
                      .filter((m) => m.movement_type === 'entrada' && !m.is_reversed)
                      .reduce((sum, m) => sum + Number(m.value), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Saídas</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(
                    filteredCashMovements
                      .filter((m) => m.movement_type === 'saida' && !m.is_reversed)
                      .reduce((sum, m) => sum + Number(m.value), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Final</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    filteredCashMovements.reduce((sum, m) => {
                      if (m.is_reversed) return sum;
                      return sum + (m.movement_type === 'entrada' ? Number(m.value) : -Number(m.value));
                    }, 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo por Centro de Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const byCostCenter: Record<string, { name: string; entradas: number; saidas: number }> = {};
                
                filteredCashMovements
                  .filter((m) => !m.is_reversed)
                  .forEach((m) => {
                    const ccId = m.cost_center_id || 'sem_centro';
                    const ccName = m.cost_center?.name || 'Sem Centro de Custo';
                    
                    if (!byCostCenter[ccId]) {
                      byCostCenter[ccId] = { name: ccName, entradas: 0, saidas: 0 };
                    }
                    
                    if (m.movement_type === 'entrada') {
                      byCostCenter[ccId].entradas += Number(m.value);
                    } else if (m.movement_type === 'saida') {
                      byCostCenter[ccId].saidas += Number(m.value);
                    }
                  });

                return Object.entries(byCostCenter).map(([id, data]) => {
                  const saldo = data.entradas - data.saidas;
                  return (
                    <div key={id} className="flex justify-between items-center p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{data.name}</p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Entradas</p>
                          <p className="font-semibold text-success">{formatCurrency(data.entradas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saídas</p>
                          <p className="font-semibold text-destructive">{formatCurrency(data.saidas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p className={`font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(saldo)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </>
    )}

    {/* Tabela de Movimentações */}
    <Card>
    <CardContent className="p-0">
      <DataTable
        columns={[
          {
            key: 'movement_date',
            header: 'DATA',
            cell: (item: FinancialMovement) => formatDate(item.movement_date),
          },
          {
            key: 'description',
            header: 'DESCRIÇÃO',
            cell: (item: FinancialMovement) => item.description,
          },
          {
            key: 'account',
            header: 'CONTA',
            cell: (item: FinancialMovement) => item.account?.name || '-',
          },
          {
            key: 'nature',
            header: 'NATUREZA',
            cell: (item: FinancialMovement) => item.nature?.name || '-',
          },
          {
            key: 'cost_center',
            header: 'CENTRO DE CUSTO',
            cell: (item: FinancialMovement) => item.cost_center?.name || '-',
          },
          {
            key: 'movement_type',
            header: 'TIPO',
            cell: (item: FinancialMovement) => (
              <StatusBadge
                status={item.movement_type === 'entrada' ? 'success' : 'danger'}
                label={item.movement_type === 'entrada' ? 'Entrada' : 'Saída'}
              />
            ),
          },
          {
            key: 'value',
            header: 'VALOR',
            cell: (item: FinancialMovement) => (
              <span className={`font-semibold ${item.movement_type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                {item.movement_type === 'entrada' ? '+' : '-'}
                {formatCurrency(item.value)}
              </span>
            ),
          },
          {
            key: 'operator',
            header: 'OPERADOR',
            cell: (item: FinancialMovement) => item.operator?.full_name || '-',
          },
          {
            key: 'is_reconciled',
            header: 'CONCILIAÇÃO',
            cell: (item: FinancialMovement) => (
              <StatusBadge
                status={(item as any).is_reconciled ? 'success' : 'warning'}
                label={(item as any).is_reconciled ? 'Conciliado' : 'Pendente'}
              />
            ),
          },
          {
            key: 'is_reversed',
            header: 'STATUS',
            cell: (item: FinancialMovement) => (
              <StatusBadge
                status={item.is_reversed ? 'danger' : 'success'}
                label={item.is_reversed ? 'Estornado' : 'Ativo'}
              />
            ),
          },
          {
            key: 'actions',
            header: 'AÇÕES',
            className: 'w-32',
            cell: (item: FinancialMovement) => (
              <div className="flex gap-1">
                {!item.is_reversed && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCashMovement(item);
                        setCashMovementFormOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        setSelectedCashMovement(item);
                        setReverseModalOpen(true);
                      }}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={filteredCashMovements}
        loading={loading}
        emptyMessage="Nenhuma movimentação encontrada"
      />

      {/* Paginação Caixa */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Itens por página:</span>
          <Select
            value={cashPageSize.toString()}
            onValueChange={(v) => {
              setCashPageSize(Number(v));
              setCashPage(1);
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
            Total: {cashTotal}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCashPage(p => Math.max(1, p - 1))}
            disabled={cashPage === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm font-medium">
            Página {cashPage} de {Math.ceil(cashTotal / cashPageSize) || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCashPage(p => Math.min(Math.ceil(cashTotal / cashPageSize), p + 1))}
            disabled={cashPage >= Math.ceil(cashTotal / cashPageSize) || loading}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="reports" className="space-y-6">
          <CashReports accounts={accounts} />
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="space-y-6">
          <CashAlerts accounts={accounts} />
        </TabsContent>
      </Tabs>
    </TabsContent>

    {/* Análise de Crédito */}
    <TabsContent value="credit_analysis" className="space-y-6">
      <CreditAnalysisPanel />
    </TabsContent>

    {/* DRE */}
    <TabsContent value="dre" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo de Resultado do Exercício (DRE)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
        </CardContent>
      </Card>
    </TabsContent>

    {/* Tesouraria */}
    <TabsContent value="tesouraria" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tesouraria</h2>
        <Button
          onClick={() => {
            setTransferModalOpen(true);
          }}
        >
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transferir entre Contas
        </Button>
      </div>

  {/* Resumo Geral */ }
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <CardContent className="pt-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total de Contas</p>
          <p className="text-2xl font-bold">{accounts.length}</p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Saldo Total</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(accounts.reduce((sum, a) => sum + Number(a.current_balance), 0))}
          </p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Contas Ativas</p>
          <p className="text-2xl font-bold">
            {accounts.filter((a) => a.is_active).length} / {accounts.length}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Lista de Contas */ }
  <Card>
    <CardHeader>
      <CardTitle>Todas as Contas</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex justify-between items-center p-4 rounded-lg border hover:bg-muted"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-lg">{account.name}</p>
                <StatusBadge
                  status={account.is_active ? 'success' : 'danger'}
                  label={account.type}
                />
              </div>
              {account.type === 'banco' && (
                <p className="text-sm text-muted-foreground mt-1">
                  {account.bank_name} - Ag: {account.agency} - Conta: {account.account_number}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(account.current_balance)}</p>
              <p className="text-xs text-muted-foreground">Saldo Atual</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedAccount(account);
                setAccountFormOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
    </TabsContent>

    {/* Centros de Custo */}
    <TabsContent value="cost_centers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Centros de Custo</h2>
            <Button
              onClick={() => {
                setSelectedCostCenter(null);
                setCostCenterFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Centro de Custo
            </Button>
          </div>

          <Card>
            <CardContent>
              <div className="space-y-2">
                {costCenters.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhum centro de custo cadastrado</p>
                ) : (
                  <div className="space-y-2">
                    {costCenters.map((cc) => {
                      const typeLabels: Record<string, string> = {
                        receita: 'Receita',
                        despesa: 'Despesa',
                        misto: 'Misto',
                      };
                      return (
                        <div
                          key={cc.id}
                          className="flex justify-between items-center p-4 rounded-lg border hover:bg-muted"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{cc.name}</p>
                              {cc.type && (
                                <Badge variant="outline" className="text-xs">
                                  {typeLabels[cc.type] || cc.type}
                                </Badge>
                              )}
                            </div>
                            {cc.description && <p className="text-sm text-muted-foreground">{cc.description}</p>}
                            {cc.code && <p className="text-xs text-muted-foreground">Código: {cc.code}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={cc.is_active ? 'success' : 'danger'}
                              label={cc.is_active ? 'Ativo' : 'Inativo'}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCostCenter(cc);
                                setCostCenterFormOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
    </TabsContent>

    {/* Naturezas Financeiras */}
    <TabsContent value="natures" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Naturezas Financeiras</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre e gerencie as naturezas financeiras usadas em vendas, compras, contas a pagar, contas a receber, caixa e tesouraria
              </p>
            </div>
            <Button onClick={() => navigate('/financial/natures')}>
              <Plus className="h-4 w-4 mr-2" />
              Gerenciar Naturezas
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold">{natures.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ativas</p>
                  <p className="text-2xl font-bold text-success">
                    {natures.filter((n) => n.is_active).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Entradas</p>
                  <p className="text-2xl font-bold text-success">
                    {natures.filter((n) => n.type === 'entrada').length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saídas</p>
                  <p className="text-2xl font-bold text-destructive">
                    {natures.filter((n) => n.type === 'saida').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Naturezas Cadastradas</CardTitle>
              <CardDescription>
                Clique em "Gerenciar Naturezas" para ver a lista completa e fazer edições
              </CardDescription>
            </CardHeader>
            <CardContent>
              {natures.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhuma natureza financeira cadastrada</p>
                  <div className="space-x-4">
                    <Button onClick={() => navigate('/financial/natures')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeira Natureza
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      try {
                        if (!currentCompany?.id) return;
                        await import('@/utils/seedFinancialNatures').then(m => m.seedFinancialNatures(currentCompany.id));
                        toast({ title: 'Sucesso', description: 'Naturezas padrão cadastradas com sucesso!' });
                        window.location.reload();
                      } catch (error) {
                        toast({ title: 'Erro', description: 'Erro ao cadastrar naturezas.', variant: 'destructive' });
                      }
                    }}>
                      <Database className="h-4 w-4 mr-2" />
                      Popular Padrões
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {natures.slice(0, 10).map((nature) => (
                    <div
                      key={nature.id}
                      className="flex justify-between items-center p-3 rounded-lg border hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{nature.name}</p>
                          {nature.code && (
                            <p className="text-xs text-muted-foreground">Código: {nature.code}</p>
                          )}
                          {nature.category && (
                            <p className="text-xs text-muted-foreground">Categoria: {nature.category}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={nature.type === 'entrada' ? 'success' : nature.type === 'saida' ? 'danger' : 'info'}
                          label={nature.type === 'entrada' ? 'Entrada' : nature.type === 'saida' ? 'Saída' : 'Ambos'}
                        />
                        <StatusBadge
                          status={nature.is_active ? 'success' : 'danger'}
                          label={nature.is_active ? 'Ativa' : 'Inativa'}
                        />
                      </div>
                    </div>
                  ))}
                  {natures.length > 10 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={() => navigate('/financial/natures')}>
                        Ver todas as {natures.length} naturezas
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
    </TabsContent>

    {/* Configurações */}
    <TabsContent value="configurations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Configurações Financeiras</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/financial/natures')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Naturezas Financeiras
                </CardTitle>
                <CardDescription>
                  Cadastre e gerencie as naturezas financeiras usadas em vendas, compras, contas a pagar, contas a receber, caixa e tesouraria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {natures.length} natureza(s) cadastrada(s)
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Gerenciar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Contas Financeiras
                </CardTitle>
                <CardDescription>
                  Gerencie as contas bancárias e de caixa do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {accounts.length} conta(s) cadastrada(s)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAccount(null);
                      setAccountFormOpen(true);
                    }}
                  >
                    Nova Conta
                    <Plus className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
    </TabsContent>

    <TabsContent value="reconciliation" className="space-y-4">
      <ReconciliationTab accounts={accounts} />
    </TabsContent>
      </Tabs>

    {/* Modals */}
    <ReceivableForm
      open={receivableFormOpen}
      onOpenChange={setReceivableFormOpen}
      receivable={selectedReceivable}
      onSuccess={() => {
        loadReceivables();
        loadStats();
      }}
    />

    {selectedReceivable && (
      <ReceivablePaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        receivable={selectedReceivable}
        onSuccess={() => {
          loadReceivables();
          loadStats();
        }}
      />
    )}

    <PayableForm
      open={payableFormOpen}
      onOpenChange={setPayableFormOpen}
      payable={selectedPayable}
      onSuccess={() => {
        loadPayables();
        loadStats();
      }}
    />

    {selectedPayable && (
      <PayablePaymentModal
        open={payablePaymentModalOpen}
        onOpenChange={setPayablePaymentModalOpen}
        payable={selectedPayable}
        onSuccess={() => {
          loadPayables();
          loadStats();
        }}
      />
    )}

    <NatureForm
      open={natureFormOpen}
      onOpenChange={setNatureFormOpen}
      nature={selectedNature}
      onSuccess={() => {
        loadNatures();
      }}
    />

    <CostCenterForm
      open={costCenterFormOpen}
      onOpenChange={setCostCenterFormOpen}
      costCenter={selectedCostCenter}
      onSuccess={() => {
        loadCostCenters();
      }}
    />

    <AccountForm
      open={accountFormOpen}
      onOpenChange={setAccountFormOpen}
      account={selectedAccount}
      onSuccess={() => {
        loadAccounts();
        loadCashMovements();
      }}
    />

    <CashMovementForm
      open={cashMovementFormOpen}
      onOpenChange={setCashMovementFormOpen}
      movement={selectedCashMovement}
      onSuccess={() => {
        loadCashMovements();
        loadAccounts();
      }}
    />

    {selectedCashMovement && (
      <ReverseMovementModal
        open={reverseModalOpen}
        onOpenChange={setReverseModalOpen}
        movement={selectedCashMovement}
        onSuccess={() => {
          loadCashMovements();
          loadAccounts();
        }}
      />
    )}

    {selectedAccount && cashFilters.date && (
      <CashClosureModal
        open={cashClosureModalOpen}
        onOpenChange={setCashClosureModalOpen}
        date={cashFilters.date}
        accountId={selectedAccount.id}
        onSuccess={() => {
          loadCashMovements();
          loadAccounts();
        }}
      />
    )}

    <AccountTransferModal
      open={transferModalOpen}
      onOpenChange={setTransferModalOpen}
      onSuccess={() => {
        loadCashMovements();
        loadAccounts();
      }}
    />
    </div>
  );
}
