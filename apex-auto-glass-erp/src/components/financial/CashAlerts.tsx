import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, formatDate } from '@/lib/format';
import { AlertTriangle, Bell, CheckCircle2, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FinancialAccount } from '@/types/financial';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CashAlertsProps {
  accounts: FinancialAccount[];
}

interface BalanceAlert {
  id: string;
  account_id: string;
  account?: FinancialAccount;
  threshold_amount: number;
  current_balance: number;
  alert_type: 'low_balance' | 'negative_balance' | 'high_balance';
  is_active: boolean;
  notified_at?: string;
  created_at: string;
}

interface AlertSettings {
  id?: string;
  account_id: string;
  low_balance_threshold?: number;
  enable_low_balance_alert: boolean;
  enable_negative_balance_alert: boolean;
  notification_emails?: string[];
}

export function CashAlerts({ accounts }: CashAlertsProps) {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<BalanceAlert[]>([]);
  const [alertSettings, setAlertSettings] = useState<Record<string, AlertSettings>>({});
  const [loading, setLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [settingsForm, setSettingsForm] = useState<AlertSettings>({
    account_id: '',
    low_balance_threshold: 1000,
    enable_low_balance_alert: true,
    enable_negative_balance_alert: true,
    notification_emails: [],
  });

  useEffect(() => {
    loadAlerts();
    loadAlertSettings();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_balance_alerts')
        .select(`
          *,
          account:financial_accounts(*)
        `)
        .eq('company_id', profile?.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  const loadAlertSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('account_alert_settings')
        .select('*')
        .eq('company_id', profile?.company_id);

      if (error) throw error;

      const settingsMap: Record<string, AlertSettings> = {};
      data?.forEach((setting) => {
        settingsMap[setting.account_id] = setting;
      });
      setAlertSettings(settingsMap);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('cash_balance_alerts')
        .update({
          is_active: false,
          notified_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Alerta marcado como lido' });
      loadAlerts();
    } catch (error: any) {
      console.error('Erro ao marcar alerta:', error);
      toast({ title: 'Erro', description: 'Erro ao marcar alerta', variant: 'destructive' });
    }
  };

  const openSettingsDialog = (account: FinancialAccount) => {
    setSelectedAccount(account);
    const existingSettings = alertSettings[account.id];
    setSettingsForm({
      account_id: account.id,
      low_balance_threshold: existingSettings?.low_balance_threshold || 1000,
      enable_low_balance_alert: existingSettings?.enable_low_balance_alert ?? true,
      enable_negative_balance_alert: existingSettings?.enable_negative_balance_alert ?? true,
      notification_emails: existingSettings?.notification_emails || [],
    });
    setSettingsDialogOpen(true);
  };

  const saveAlertSettings = async () => {
    if (!selectedAccount) return;

    try {
      const data = {
        company_id: profile?.company_id,
        account_id: selectedAccount.id,
        low_balance_threshold: settingsForm.low_balance_threshold,
        enable_low_balance_alert: settingsForm.enable_low_balance_alert,
        enable_negative_balance_alert: settingsForm.enable_negative_balance_alert,
        notification_emails: settingsForm.notification_emails || [],
      };

      if (alertSettings[selectedAccount.id]?.id) {
        // Atualizar
        const { error } = await supabase
          .from('account_alert_settings')
          .update(data)
          .eq('id', alertSettings[selectedAccount.id].id);

        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase.from('account_alert_settings').insert([data]);
        if (error) throw error;
      }

      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso' });
      setSettingsDialogOpen(false);
      loadAlertSettings();
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar configurações', variant: 'destructive' });
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'low_balance':
        return 'Saldo Baixo';
      case 'negative_balance':
        return 'Saldo Negativo';
      case 'high_balance':
        return 'Saldo Alto';
      default:
        return type;
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'low_balance':
        return 'warning';
      case 'negative_balance':
        return 'destructive';
      case 'high_balance':
        return 'info';
      default:
        return 'default';
    }
  };

  const activeAlerts = alerts.filter((a) => a.is_active);
  const lowBalanceAlerts = activeAlerts.filter((a) => a.alert_type === 'low_balance');
  const negativeBalanceAlerts = activeAlerts.filter((a) => a.alert_type === 'negative_balance');

  return (
    <div className="space-y-6">
      {/* Resumo de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Alertas Ativos</p>
                <p className="text-2xl font-bold">{activeAlerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Baixo</p>
                <p className="text-2xl font-bold text-warning">{lowBalanceAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Negativo</p>
                <p className="text-2xl font-bold text-destructive">{negativeBalanceAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Saldo</CardTitle>
          <CardDescription>Alertas ativos sobre saldos das contas</CardDescription>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
              <p>Nenhum alerta ativo no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.alert_type === 'negative_balance'
                      ? 'border-destructive bg-destructive/5'
                      : 'border-warning bg-warning/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle
                          className={`h-5 w-5 ${
                            alert.alert_type === 'negative_balance' ? 'text-destructive' : 'text-warning'
                          }`}
                        />
                        <Badge variant={getAlertTypeColor(alert.alert_type) as any}>
                          {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                      </div>
                      <p className="font-semibold">{alert.account?.name || 'Conta não encontrada'}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Saldo Atual:</span>{' '}
                          <span
                            className={`font-semibold ${
                              alert.alert_type === 'negative_balance' ? 'text-destructive' : 'text-warning'
                            }`}
                          >
                            {formatCurrency(alert.current_balance)}
                          </span>
                        </p>
                        {alert.alert_type === 'low_balance' && (
                          <p>
                            <span className="text-muted-foreground">Limite Configurado:</span>{' '}
                            <span className="font-semibold">{formatCurrency(alert.threshold_amount)}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Criado em: {formatDate(alert.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAlertAsRead(alert.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como Lido
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações de Alertas por Conta */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Alertas</CardTitle>
          <CardDescription>Configure alertas personalizados para cada conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => {
              const settings = alertSettings[account.id];
              const hasLowBalanceAlert = settings?.enable_low_balance_alert ?? true;
              const hasNegativeAlert = settings?.enable_negative_balance_alert ?? true;
              const threshold = settings?.low_balance_threshold || 1000;

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{account.name}</p>
                      <Badge variant="outline">{account.type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Saldo Atual: <span className="font-semibold text-foreground">
                          {formatCurrency(account.current_balance)}
                        </span>
                      </p>
                      {hasLowBalanceAlert && (
                        <p>
                          Alerta de saldo baixo: <span className="font-semibold">
                            {formatCurrency(threshold)}
                          </span>
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs">
                          Alerta saldo baixo: {hasLowBalanceAlert ? '✓ Ativo' : '✗ Inativo'}
                        </span>
                        <span className="text-xs">
                          Alerta saldo negativo: {hasNegativeAlert ? '✓ Ativo' : '✗ Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSettingsDialog(account)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Configurações */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Alertas</DialogTitle>
            <DialogDescription>
              Configure os alertas para {selectedAccount?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alerta de Saldo Baixo</Label>
                <Switch
                  checked={settingsForm.enable_low_balance_alert}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, enable_low_balance_alert: checked })
                  }
                />
              </div>
              {settingsForm.enable_low_balance_alert && (
                <div className="pl-4">
                  <Label>Limite de Saldo Baixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settingsForm.low_balance_threshold}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        low_balance_threshold: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alerta de Saldo Negativo</Label>
                <Switch
                  checked={settingsForm.enable_negative_balance_alert}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, enable_negative_balance_alert: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAlertSettings}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

