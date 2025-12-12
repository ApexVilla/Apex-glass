import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';

interface CashClosureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  accountId: string;
  onSuccess: () => void;
}

export function CashClosureModal({ open, onOpenChange, date, accountId, onSuccess }: CashClosureModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [closureData, setClosureData] = useState({
    initial_balance: 0,
    total_entries: 0,
    total_exits: 0,
    expected_balance: 0,
    actual_balance: 0,
    difference: 0,
    observations: '',
  });

  useEffect(() => {
    if (open && accountId) {
      loadClosureData();
    }
  }, [open, date, accountId]);

  const loadClosureData = async () => {
    setLoadingData(true);
    try {
      // Verificar se já foi fechado hoje
      const { data: existingClosure } = await supabase
        .from('cash_closures')
        .select('*')
        .eq('account_id', accountId)
        .eq('closure_date', date)
        .single();

      if (existingClosure) {
        toast({ title: 'Aviso', description: 'O caixa já foi fechado para esta data', variant: 'destructive' });
        onOpenChange(false);
        return;
      }

      // Buscar saldo inicial (último fechamento ou saldo inicial da conta)
      const { data: account } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      const { data: lastClosure } = await supabase
        .from('cash_closures')
        .select('final_balance')
        .eq('account_id', accountId)
        .lt('closure_date', date)
        .order('closure_date', { ascending: false })
        .limit(1)
        .single();

      const initialBalance = lastClosure?.final_balance || account?.initial_balance || 0;

      // Buscar movimentações do dia
      const { data: movements } = await supabase
        .from('financial_movements')
        .select('*')
        .eq('account_id', accountId)
        .eq('movement_date', date)
        .eq('is_reversed', false);

      const totalEntries = movements?.filter((m) => m.movement_type === 'entrada').reduce((sum, m) => sum + Number(m.value), 0) || 0;
      const totalExits = movements?.filter((m) => m.movement_type === 'saida').reduce((sum, m) => sum + Number(m.value), 0) || 0;
      const expectedBalance = initialBalance + totalEntries - totalExits;

      setClosureData({
        initial_balance: initialBalance,
        total_entries: totalEntries,
        total_exits: totalExits,
        expected_balance: expectedBalance,
        actual_balance: expectedBalance,
        difference: 0,
        observations: '',
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // Criar registro de fechamento
      const { error } = await supabase.from('cash_closures').insert({
        company_id: profile?.company_id,
        account_id: accountId,
        closure_date: date,
        initial_balance: closureData.initial_balance,
        total_entries: closureData.total_entries,
        total_exits: closureData.total_exits,
        expected_balance: closureData.expected_balance,
        actual_balance: closureData.actual_balance,
        difference: closureData.difference,
        observations: closureData.observations || null,
        closed_by: user?.id,
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Caixa fechado com sucesso' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao fechar caixa', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fechamento de Caixa</DialogTitle>
          <DialogDescription>Data: {date ? formatDate(date) : '-'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Inicial</p>
              <p className="text-xl font-bold">{formatCurrency(closureData.initial_balance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Entradas</p>
              <p className="text-xl font-bold text-success">{formatCurrency(closureData.total_entries)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Saídas</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(closureData.total_exits)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Esperado</p>
              <p className="text-xl font-bold">{formatCurrency(closureData.expected_balance)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Saldo Real *</Label>
            <Input
              type="number"
              step="0.01"
              value={closureData.actual_balance}
              onChange={(e) => {
                const actual = parseFloat(e.target.value) || 0;
                setClosureData({
                  ...closureData,
                  actual_balance: actual,
                  difference: actual - closureData.expected_balance,
                });
              }}
              required
            />
          </div>

          {closureData.difference !== 0 && (
            <div className={`p-4 rounded-lg ${closureData.difference > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p className="text-sm font-medium">
                Diferença: <span className={closureData.difference > 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(Math.abs(closureData.difference))}</span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={closureData.observations}
              onChange={(e) => setClosureData({ ...closureData, observations: e.target.value })}
              placeholder="Observações sobre o fechamento..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fechar Caixa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

