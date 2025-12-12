import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

interface AccountTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AccountTransferModal({ open, onOpenChange, onSuccess }: AccountTransferModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    value: 0,
    description: '',
  });

  useEffect(() => {
    if (open) {
      loadAccounts();
      setFormData({
        from_account_id: '',
        to_account_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        value: 0,
        description: '',
      });
    }
  }, [open]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.from_account_id || !formData.to_account_id) {
      toast({ title: 'Erro', description: 'Selecione as contas de origem e destino', variant: 'destructive' });
      return;
    }

    if (formData.from_account_id === formData.to_account_id) {
      toast({ title: 'Erro', description: 'As contas de origem e destino devem ser diferentes', variant: 'destructive' });
      return;
    }

    if (formData.value <= 0) {
      toast({ title: 'Erro', description: 'Valor deve ser maior que zero', variant: 'destructive' });
      return;
    }

    const fromAccount = accounts.find((a) => a.id === formData.from_account_id);
    if (fromAccount && fromAccount.current_balance < formData.value) {
      toast({ title: 'Erro', description: 'Saldo insuficiente na conta de origem', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Criar movimentação de saída na conta origem
      const { data: exitMovement, error: exitError } = await supabase
        .from('financial_movements')
        .insert({
          company_id: profile?.company_id,
          account_id: formData.from_account_id,
          movement_date: formData.transfer_date,
          movement_type: 'saida',
          description: `Transferência para: ${accounts.find((a) => a.id === formData.to_account_id)?.name || ''}`,
          value: formData.value,
          created_by: user?.id,
        })
        .select()
        .single();

      if (exitError) throw exitError;

      // Criar movimentação de entrada na conta destino
      const { data: entryMovement, error: entryError } = await supabase
        .from('financial_movements')
        .insert({
          company_id: profile?.company_id,
          account_id: formData.to_account_id,
          movement_date: formData.transfer_date,
          movement_type: 'entrada',
          description: `Transferência de: ${accounts.find((a) => a.id === formData.from_account_id)?.name || ''}`,
          value: formData.value,
          created_by: user?.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Criar registro de transferência
      const { error: transferError } = await supabase.from('account_transfers').insert({
        company_id: profile?.company_id,
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        transfer_date: formData.transfer_date,
        value: formData.value,
        description: formData.description || null,
        from_movement_id: exitMovement.id,
        to_movement_id: entryMovement.id,
        created_by: user?.id,
      });

      if (transferError) throw transferError;

      toast({ title: 'Sucesso', description: 'Transferência realizada com sucesso' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao transferir:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao realizar transferência', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find((a) => a.id === formData.from_account_id);
  const toAccount = accounts.find((a) => a.id === formData.to_account_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transferência entre Contas</DialogTitle>
          <DialogDescription>Transfira valores entre contas bancárias ou caixas</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta de Origem *</Label>
              <Select
                value={formData.from_account_id}
                onValueChange={(v) => setFormData({ ...formData, from_account_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type}) - Saldo: {formatCurrency(account.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromAccount && (
                <p className="text-xs text-muted-foreground">
                  Saldo disponível: {formatCurrency(fromAccount.current_balance)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Conta de Destino *</Label>
              <Select
                value={formData.to_account_id}
                onValueChange={(v) => setFormData({ ...formData, to_account_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type}) - Saldo: {formatCurrency(account.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Transferência *</Label>
              <Input
                type="date"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Descrição opcional da transferência..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

