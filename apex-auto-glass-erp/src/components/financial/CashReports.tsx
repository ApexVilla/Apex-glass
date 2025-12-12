import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/format';
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FinancialAccount, FinancialMovement } from '@/types/financial';

interface CashReportsProps {
  accounts: FinancialAccount[];
}

interface ReportData {
  date: string;
  entries: number;
  exits: number;
  balance: number;
  movements: FinancialMovement[];
}

export function CashReports({ accounts }: CashReportsProps) {
  const { profile } = useAuth();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportType !== 'custom') {
      generateReport();
    }
  }, [reportType, selectedAccount]);

  const generateReport = async () => {
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
        .lte('movement_date', dateRange.end)
        .order('movement_date', { ascending: true });

      if (selectedAccount !== 'all') {
        query = query.eq('account_id', selectedAccount);
      }

      const { data: movements, error } = await query;

      if (error) throw error;

      // Agrupar por data
      const groupedByDate: Record<string, FinancialMovement[]> = {};
      movements?.forEach((movement) => {
        const date = movement.movement_date;
        if (!groupedByDate[date]) {
          groupedByDate[date] = [];
        }
        groupedByDate[date].push(movement);
      });

      // Calcular estatísticas por data
      const report: ReportData[] = [];
      let runningBalance = getInitialBalance();

      Object.keys(groupedByDate)
        .sort()
        .forEach((date) => {
          const dayMovements = groupedByDate[date];
          const entries = dayMovements
            .filter((m) => m.movement_type === 'entrada' && !m.is_reversed)
            .reduce((sum, m) => sum + Number(m.value), 0);
          const exits = dayMovements
            .filter((m) => m.movement_type === 'saida' && !m.is_reversed)
            .reduce((sum, m) => sum + Number(m.value), 0);

          runningBalance = runningBalance + entries - exits;

          report.push({
            date,
            entries,
            exits,
            balance: runningBalance,
            movements: dayMovements,
          });
        });

      setReportData(report);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({ title: 'Erro', description: 'Erro ao gerar relatório', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    switch (reportType) {
      case 'daily':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      default:
        return { start: startDate, end: endDate };
    }
  };

  const getInitialBalance = () => {
    if (selectedAccount === 'all') {
      return accounts.reduce((sum, acc) => sum + Number(acc.initial_balance), 0);
    } else {
      const account = accounts.find((a) => a.id === selectedAccount);
      return account ? Number(account.initial_balance) : 0;
    }
  };

  const exportToExcel = () => {
    try {
      // Criar dados para Excel
      const rows: any[] = [];
      
      // Cabeçalho
      rows.push([
        'Data',
        'Descrição',
        'Tipo',
        'Natureza',
        'Centro de Custo',
        'Forma de Pagamento',
        'Conta',
        'Valor',
        'Saldo Acumulado',
        'Operador',
      ]);

      // Dados
      let runningBalance = getInitialBalance();
      reportData.forEach((day) => {
        day.movements.forEach((movement) => {
          if (!movement.is_reversed) {
            if (movement.movement_type === 'entrada') {
              runningBalance += Number(movement.value);
            } else {
              runningBalance -= Number(movement.value);
            }

            rows.push([
              formatDate(movement.movement_date),
              movement.description,
              movement.movement_type === 'entrada' ? 'Entrada' : 'Saída',
              movement.nature?.name || '-',
              movement.cost_center?.name || '-',
              movement.payment_method || '-',
              movement.account?.name || '-',
              Number(movement.value).toFixed(2),
              runningBalance.toFixed(2),
              movement.operator?.full_name || '-',
            ]);
          }
        });
      });

      // Criar CSV
      const csvContent = rows.map((row) => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: 'Sucesso', description: 'Relatório exportado com sucesso' });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({ title: 'Erro', description: 'Erro ao exportar relatório', variant: 'destructive' });
    }
  };

  const exportToPDF = () => {
    try {
      // Criar conteúdo HTML para PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Relatório de Fluxo de Caixa</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .positive { color: green; }
              .negative { color: red; }
            </style>
          </head>
          <body>
            <h1>Relatório de Fluxo de Caixa</h1>
            <p><strong>Período:</strong> ${formatDate(getDateRange().start)} a ${formatDate(getDateRange().end)}</p>
            <p><strong>Conta:</strong> ${selectedAccount === 'all' ? 'Todas' : accounts.find(a => a.id === selectedAccount)?.name}</p>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.map(day => 
                  day.movements.map(movement => `
                    <tr>
                      <td>${formatDate(movement.movement_date)}</td>
                      <td>${movement.description}</td>
                      <td>${movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}</td>
                      <td class="${movement.movement_type === 'entrada' ? 'positive' : 'negative'}">
                        ${movement.movement_type === 'entrada' ? '+' : '-'}${formatCurrency(movement.value)}
                      </td>
                      <td>${formatCurrency(day.balance)}</td>
                    </tr>
                  `).join('')
                ).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Abrir em nova janela para impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }

      toast({ title: 'Sucesso', description: 'Relatório preparado para impressão' });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ title: 'Erro', description: 'Erro ao exportar relatório', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Fluxo de Caixa</CardTitle>
          <CardDescription>Gere e exporte relatórios detalhados das movimentações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta</Label>
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

            {reportType === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end gap-2">
              <Button onClick={generateReport} disabled={loading} className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>

          {/* Resultados */}
          {reportData.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button onClick={exportToExcel} variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel (CSV)
                </Button>
                <Button onClick={exportToPDF} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Data</th>
                        <th className="p-3 text-left text-sm font-medium">Entradas</th>
                        <th className="p-3 text-left text-sm font-medium">Saídas</th>
                        <th className="p-3 text-left text-sm font-medium">Saldo</th>
                        <th className="p-3 text-left text-sm font-medium">Movimentações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((day, index) => (
                        <tr key={day.date} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                          <td className="p-3 text-sm">{formatDate(day.date)}</td>
                          <td className="p-3 text-sm text-success font-semibold">
                            {formatCurrency(day.entries)}
                          </td>
                          <td className="p-3 text-sm text-destructive font-semibold">
                            {formatCurrency(day.exits)}
                          </td>
                          <td className="p-3 text-sm font-semibold">
                            {formatCurrency(day.balance)}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {day.movements.length} movimento(s)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-muted-foreground">Gerando relatório...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

