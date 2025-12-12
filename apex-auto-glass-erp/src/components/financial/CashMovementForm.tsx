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
import { FinancialMovement } from '@/types/financial';

interface CashMovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement?: FinancialMovement | null;
  onSuccess: () => void;
}

export function CashMovementForm({ open, onOpenChange, movement, onSuccess }: CashMovementFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [natures, setNatures] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    movement_date: new Date().toISOString().split('T')[0],
    movement_type: 'entrada' as 'entrada' | 'saida',
    description: '',
    nature_id: '',
    cost_center_id: '',
    payment_method: '',
    value: 0,
    account_id: '',
    observation: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (movement) {
        setFormData({
          movement_date: movement.movement_date.split('T')[0],
          movement_type: movement.movement_type as 'entrada' | 'saida',
          description: movement.description,
          nature_id: movement.nature_id || '',
          cost_center_id: movement.cost_center_id || '',
          payment_method: '',
          value: movement.value,
          account_id: movement.account_id,
          observation: '',
        });
      } else {
        setFormData({
          movement_date: new Date().toISOString().split('T')[0],
          movement_type: 'entrada',
          description: '',
          nature_id: '',
          cost_center_id: '',
          payment_method: '',
          value: 0,
          account_id: '',
          observation: '',
        });
      }
    }
  }, [open, movement]);

  const loadData = async () => {
    try {
      const [naturesRes, costCentersRes, accountsRes] = await Promise.all([
        supabase.from('financial_natures').select('*').eq('is_active', true),
        supabase.from('cost_centers').select('*').eq('is_active', true),
        supabase.from('financial_accounts').select('*').eq('is_active', true),
      ]);

      if (naturesRes.data) setNatures(naturesRes.data);
      if (costCentersRes.data) setCostCenters(costCentersRes.data);
      if (accountsRes.data) setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.description.trim()) {
      toast({ title: 'Erro', description: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    if (!formData.nature_id) {
      toast({ title: 'Erro', description: 'Natureza financeira é obrigatória', variant: 'destructive' });
      return;
    }

    if (formData.value <= 0) {
      toast({ title: 'Erro', description: 'Valor deve ser maior que zero', variant: 'destructive' });
      return;
    }

    if (!formData.account_id) {
      toast({ title: 'Erro', description: 'Conta é obrigatória', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = {
        company_id: profile?.company_id,
        account_id: formData.account_id,
        movement_date: formData.movement_date,
        movement_type: formData.movement_type,
        description: formData.description,
        value: formData.value,
        nature_id: formData.nature_id,
        cost_center_id: formData.cost_center_id || null,
        operator_id: user?.id,
        created_by: user?.id,
      };

      if (movement) {
        // Não permitir editar movimento estornado
        if (movement.is_reversed) {
          toast({ title: 'Erro', description: 'Não é possível editar um movimento estornado', variant: 'destructive' });
          return;
        }

        const { error } = await supabase
          .from('financial_movements')
          .update(data)
          .eq('id', movement.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Movimentação atualizada' });
      } else {
        const { error } = await supabase
          .from('financial_movements')
          .insert([data]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Movimentação registrada' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar movimentação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{movement ? 'Editar Movimentação' : 'Nova Movimentação de Caixa'}</DialogTitle>
          <DialogDescription>Registre uma entrada ou saída de caixa</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data do Movimento *</Label>
              <Input
                type="date"
                value={formData.movement_date}
                onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.movement_type}
                onValueChange={(v) => setFormData({ ...formData, movement_type: v as 'entrada' | 'saida' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Natureza Financeira *</Label>
              <Select
                value={formData.nature_id}
                onValueChange={(v) => setFormData({ ...formData, nature_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {natures.map((nature) => (
                    <SelectItem key={nature.id} value={nature.id}>
                      {nature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Select
                value={formData.cost_center_id}
                onValueChange={(v) => setFormData({ ...formData, cost_center_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
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
            <Label>Conta {formData.movement_type === 'entrada' ? 'Destino' : 'Origem'} *</Label>
            <Select
              value={formData.account_id}
              onValueChange={(v) => setFormData({ ...formData, account_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.type}) - Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {movement ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

