import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AccountFormData, FinancialAccount } from '@/types/financial';

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: FinancialAccount | null;
  onSuccess: () => void;
}

export function AccountForm({ open, onOpenChange, account, onSuccess }: AccountFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'caixa',
    bank_name: '',
    agency: '',
    account_number: '',
    initial_balance: 0,
    allow_reconciliation: true,
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      if (account) {
        setFormData({
          name: account.name,
          type: account.type,
          bank_name: account.bank_name || '',
          agency: account.agency || '',
          account_number: account.account_number || '',
          initial_balance: account.initial_balance,
          allow_reconciliation: account.allow_reconciliation,
          is_active: account.is_active,
        });
      } else {
        setFormData({
          name: '',
          type: 'caixa',
          bank_name: '',
          agency: '',
          account_number: '',
          initial_balance: 0,
          allow_reconciliation: true,
          is_active: true,
        });
      }
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: formData.name,
        type: formData.type,
        bank_name: formData.bank_name || null,
        agency: formData.agency || null,
        account_number: formData.account_number || null,
        initial_balance: formData.initial_balance,
        current_balance: account ? account.current_balance : formData.initial_balance,
        allow_reconciliation: formData.allow_reconciliation,
        is_active: formData.is_active,
        company_id: profile?.company_id,
        created_by: user?.id,
      };

      if (account) {
        const { error } = await supabase
          .from('financial_accounts')
          .update(data)
          .eq('id', account.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta atualizada' });
      } else {
        const { error } = await supabase
          .from('financial_accounts')
          .insert([data]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta criada' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar conta', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          <DialogDescription>Cadastre uma conta bancária ou caixa</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Conta *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Caixa Principal, Banco do Brasil..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caixa">Caixa</SelectItem>
                <SelectItem value="banco">Banco</SelectItem>
                <SelectItem value="carteira">Carteira Digital</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'banco' && (
            <>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Nome do banco"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    placeholder="Número da agência"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Número da conta"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Saldo Inicial</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.initial_balance}
              onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Permitir Conciliação Bancária</Label>
              <Switch
                checked={formData.allow_reconciliation}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_reconciliation: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {account ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

