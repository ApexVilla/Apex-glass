import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Calendar, Download } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FinancialAccount, FinancialMovement } from '@/types/financial';

interface CashDashboardProps {
  accounts: FinancialAccount[];
  onExport?: () => void;
}

interface PeriodStats {
  initialBalance: number;
  totalEntries: number;
  totalExits: number;
  finalBalance: number;
  movements: FinancialMovement[];
}

export function CashDashboard({ accounts, onExport }: CashDashboardProps) {
  const { profile } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<PeriodStats>({
    initialBalance: 0,
    totalEntries: 0,
    totalExits: 0,
    finalBalance: 0,
    movements: [],
  });
  const [loading, setLoading] = useState(false);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    loadStats();
    loadAccountBalances();
  }, [selectedAccount, period, startDate, endDate]);

  const loadAccountBalances = async () => {
    try {
      const balances: Record<string, number> = {};
      for (const account of accounts) {
        balances[account.id] = account.current_balance;
      }
      setAccountBalances(balances);
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    switch (period) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      default:
        return { start: startDate, end: endDate };
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      let query = supabase
        .from('financial_movements')
        .select(`
          *,
          account:financial_accounts(*),
          nature:financial_natures(*),
          cost_center:cost_centers(*),
          operator:profiles!financial_movements_operator_id_fkey(id, full_name)
        `)
        .eq('company_id', profile?.company_id)
        .gte('movement_date', dateRange.start)
        .lte('movement_date', dateRange.end);

      if (selectedAccount !== 'all') {
        query = query.eq('account_id', selectedAccount);
      }

      const { data: movements, error } = await query.order('movement_date', { ascending: false });

      if (error) throw error;

      // Calcular saldo inicial
      let initialBalance = 0;
      if (selectedAccount === 'all') {
        initialBalance = accounts.reduce((sum, acc) => sum + Number(acc.initial_balance), 0);
        // Adicionar movimentações antes do período
        const { data: previousMovements } = await supabase
          .from('financial_movements')
          .select('movement_type, value, is_reversed')
          .eq('company_id', profile?.company_id)
          .lt('movement_date', dateRange.start);

        if (previousMovements) {
          previousMovements.forEach((m) => {
            if (!m.is_reversed) {
              if (m.movement_type === 'entrada') {
                initialBalance += Number(m.value);
              } else if (m.movement_type === 'saida') {
                initialBalance -= Number(m.value);
              }
            }
          });
        }
      } else {
        const account = accounts.find((a) => a.id === selectedAccount);
        if (account) {
          initialBalance = Number(account.initial_balance);
          const { data: previousMovements } = await supabase
            .from('financial_movements')
            .select('movement_type, value, is_reversed')
            .eq('company_id', profile?.company_id)
            .eq('account_id', selectedAccount)
            .lt('movement_date', dateRange.start);

          if (previousMovements) {
            previousMovements.forEach((m) => {
              if (!m.is_reversed) {
                if (m.movement_type === 'entrada') {
                  initialBalance += Number(m.value);
                } else if (m.movement_type === 'saida') {
                  initialBalance -= Number(m.value);
                }
              }
            });
          }
        }
      }

      // Calcular totais
      const totalEntries = movements
        ?.filter((m) => m.movement_type === 'entrada' && !m.is_reversed)
        .reduce((sum, m) => sum + Number(m.value), 0) || 0;

      const totalExits = movements
        ?.filter((m) => m.movement_type === 'saida' && !m.is_reversed)
        .reduce((sum, m) => sum + Number(m.value), 0) || 0;

      const finalBalance = initialBalance + totalEntries - totalExits;

      setStats({
        initialBalance,
        totalEntries,
        totalExits,
        finalBalance,
        movements: movements || [],
      });
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar estatísticas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getLowBalanceAccounts = () => {
    return accounts.filter((acc) => {
      const balance = accountBalances[acc.id] || acc.current_balance;
      return balance < 1000 && balance >= 0;
    });
  };

  const getNegativeBalanceAccounts = () => {
    return accounts.filter((acc) => {
      const balance = accountBalances[acc.id] || acc.current_balance;
      return balance < 0;
    });
  };

  const lowBalanceAccounts = getLowBalanceAccounts();
  const negativeBalanceAccounts = getNegativeBalanceAccounts();

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </>
            )}

            {onExport && (
              <div className="flex items-end">
                <Button onClick={onExport} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(lowBalanceAccounts.length > 0 || negativeBalanceAccounts.length > 0) && (
        <div className="space-y-2">
          {negativeBalanceAccounts.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Saldo Negativo Detectado</p>
                    <p className="text-sm text-muted-foreground">
                      {negativeBalanceAccounts.length} conta(s) com saldo negativo
                    </p>
                    <div className="mt-2 space-y-1">
                      {negativeBalanceAccounts.map((acc) => (
                        <div key={acc.id} className="flex justify-between text-sm">
                          <span>{acc.name}</span>
                          <span className="font-semibold text-destructive">
                            {formatCurrency(accountBalances[acc.id] || acc.current_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {lowBalanceAccounts.length > 0 && (
            <Card className="border-warning">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div className="flex-1">
                    <p className="font-medium text-warning">Saldo Baixo</p>
                    <p className="text-sm text-muted-foreground">
                      {lowBalanceAccounts.length} conta(s) com saldo abaixo de R$ 1.000,00
                    </p>
                    <div className="mt-2 space-y-1">
                      {lowBalanceAccounts.map((acc) => (
                        <div key={acc.id} className="flex justify-between text-sm">
                          <span>{acc.name}</span>
                          <span className="font-semibold text-warning">
                            {formatCurrency(accountBalances[acc.id] || acc.current_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Inicial"
          value={formatCurrency(stats.initialBalance)}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title="Total Entradas"
          value={formatCurrency(stats.totalEntries)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Total Saídas"
          value={formatCurrency(stats.totalExits)}
          icon={TrendingDown}
          variant="danger"
        />
        <StatCard
          title="Saldo Final"
          value={formatCurrency(stats.finalBalance)}
          icon={DollarSign}
          variant={stats.finalBalance >= 0 ? 'primary' : 'danger'}
        />
      </div>

      {/* Saldos por Conta */}
      {selectedAccount === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Saldos por Conta</CardTitle>
            <CardDescription>Saldo atual de cada conta financeira</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const balance = accountBalances[account.id] || account.current_balance;
                const isLow = balance < 1000 && balance >= 0;
                const isNegative = balance < 0;

                return (
                  <div
                    key={account.id}
                    className={`p-4 rounded-lg border ${
                      isNegative
                        ? 'border-destructive bg-destructive/5'
                        : isLow
                        ? 'border-warning bg-warning/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{account.name}</h4>
                      <Badge variant={isNegative ? 'destructive' : isLow ? 'secondary' : 'default'}>
                        {account.type}
                      </Badge>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        isNegative ? 'text-destructive' : isLow ? 'text-warning' : 'text-success'
                      }`}
                    >
                      {formatCurrency(balance)}
                    </p>
                    {account.type === 'banco' && account.bank_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.bank_name} - Ag: {account.agency}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Movimentações</CardTitle>
          <CardDescription>
            {period === 'today' && 'Movimentações de hoje'}
            {period === 'week' && 'Movimentações desta semana'}
            {period === 'month' && 'Movimentações deste mês'}
            {period === 'custom' && `Movimentações de ${formatDate(startDate)} a ${formatDate(endDate)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : stats.movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma movimentação no período</div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div>Data</div>
                <div>Descrição</div>
                <div>Tipo</div>
                <div className="text-right">Valor</div>
              </div>
              {stats.movements.slice(0, 10).map((movement) => (
                <div key={movement.id} className="grid grid-cols-4 gap-4 py-2 border-b last:border-0">
                  <div className="text-sm">{formatDate(movement.movement_date)}</div>
                  <div className="text-sm">{movement.description}</div>
                  <div>
                    <Badge variant={movement.movement_type === 'entrada' ? 'default' : 'secondary'}>
                      {movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </div>
                  <div
                    className={`text-right font-semibold ${
                      movement.movement_type === 'entrada' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {movement.movement_type === 'entrada' ? '+' : '-'}
                    {formatCurrency(movement.value)}
                  </div>
                </div>
              ))}
              {stats.movements.length > 10 && (
                <div className="text-center pt-4 text-sm text-muted-foreground">
                  Mostrando 10 de {stats.movements.length} movimentações
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

