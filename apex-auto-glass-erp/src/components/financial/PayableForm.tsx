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
import { PayableFormData, AccountPayable } from '@/types/financial';
import { formatCurrency } from '@/lib/format';

interface PayableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable?: AccountPayable | null;
  onSuccess: () => void;
}

export function PayableForm({ open, onOpenChange, payable, onSuccess }: PayableFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [natures, setNatures] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState<PayableFormData>({
    launch_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    description: '',
    nature_id: '',
    cost_center_id: '',
    origin_account_id: '',
    payment_method: undefined,
    total_value: 0,
    interest_fine: 0,
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (payable) {
        setFormData({
          launch_date: payable.launch_date.split('T')[0],
          due_date: payable.due_date.split('T')[0],
          supplier_id: payable.supplier_id || '',
          description: payable.description,
          nature_id: payable.nature_id || '',
          cost_center_id: payable.cost_center_id || '',
          origin_account_id: payable.origin_account_id || '',
          payment_method: payable.payment_method,
          total_value: payable.total_value,
          interest_fine: payable.interest_fine,
        });
      } else {
        setFormData({
          launch_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          supplier_id: '',
          description: '',
          nature_id: '',
          cost_center_id: '',
          origin_account_id: '',
          payment_method: undefined,
          total_value: 0,
          interest_fine: 0,
        });
      }
    }
  }, [open, payable]);

  const loadData = async () => {
    try {
      const [suppliersRes, naturesRes, costCentersRes, accountsRes] = await Promise.all([
        supabase.from('suppliers').select('id, nome_razao').order('nome_razao'),
        supabase
          .from('financial_natures')
          .select('*')
          .eq('is_active', true)
          .or('appears_in_payables.eq.true,usada_em_compras.eq.true,usada_em_despesas.eq.true,type.eq.saida,type.eq.ambos'),
        supabase.from('cost_centers').select('*').eq('is_active', true).or('type.eq.despesa,type.eq.misto'),
        supabase.from('financial_accounts').select('*').eq('is_active', true),
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (naturesRes.data) setNatures(naturesRes.data);
      if (costCentersRes.data) setCostCenters(costCentersRes.data);
      if (accountsRes.data) setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados do formulário', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.description.trim()) {
      toast({ title: 'Erro', description: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    if (!formData.supplier_id) {
      toast({ title: 'Erro', description: 'Fornecedor é obrigatório', variant: 'destructive' });
      return;
    }

    if (!formData.nature_id) {
      toast({ title: 'Erro', description: 'Natureza é obrigatória', variant: 'destructive' });
      return;
    }

    if (!formData.cost_center_id) {
      toast({ title: 'Erro', description: 'Centro de Custo é obrigatório', variant: 'destructive' });
      return;
    }

    if (formData.total_value <= 0) {
      toast({ title: 'Erro', description: 'Valor total deve ser maior que zero', variant: 'destructive' });
      return;
    }

    // Validar vencimento não pode ser menor que data atual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(formData.due_date);
    if (dueDate < today) {
      toast({ title: 'Erro', description: 'Data de vencimento não pode ser menor que a data atual', variant: 'destructive' });
      return;
    }

    const finalValue = formData.total_value + formData.interest_fine;
    if (finalValue <= 0) {
      toast({ title: 'Erro', description: 'Valor final deve ser maior que zero', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = {
        launch_date: formData.launch_date,
        due_date: formData.due_date,
        supplier_id: formData.supplier_id,
        description: formData.description,
        nature_id: formData.nature_id,
        cost_center_id: formData.cost_center_id,
        origin_account_id: formData.origin_account_id || null,
        payment_method: formData.payment_method || null,
        total_value: formData.total_value,
        interest_fine: formData.interest_fine,
        final_value: finalValue,
        company_id: profile?.company_id,
        created_by: user?.id,
      };

      if (payable) {
        const { error } = await supabase
          .from('accounts_payable')
          .update(data)
          .eq('id', payable.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta a pagar atualizada' });
      } else {
        const { error } = await supabase
          .from('accounts_payable')
          .insert([data]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta a pagar criada' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar conta a pagar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const finalValue = formData.total_value + formData.interest_fine;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payable ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
          <DialogDescription>Preencha os dados da conta a pagar</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Lançamento *</Label>
              <Input
                type="date"
                value={formData.launch_date}
                onChange={(e) => setFormData({ ...formData, launch_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Buscar fornecedor..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.nome_razao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição Detalhada *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Natureza de Despesa *</Label>
              <Select
                value={formData.nature_id || undefined}
                onValueChange={(v) => setFormData({ ...formData, nature_id: v || '' })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a natureza..." />
                </SelectTrigger>
                <SelectContent>
                  {natures.length === 0 ? (
                    <SelectItem value="no-natures" disabled>
                      Nenhuma natureza disponível
                    </SelectItem>
                  ) : (
                    natures.map((nature) => (
                      <SelectItem key={nature.id} value={nature.id}>
                        {nature.name} {nature.code && `(${nature.code})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo *</Label>
              <Select
                value={formData.cost_center_id || undefined}
                onValueChange={(v) => setFormData({ ...formData, cost_center_id: v || '' })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.length === 0 ? (
                    <SelectItem value="no-centers" disabled>
                      Nenhum centro de custo disponível
                    </SelectItem>
                  ) : (
                    costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name} {cc.code && `(${cc.code})`} {cc.type && `- ${cc.type}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta de Origem</Label>
              <Select
                value={formData.origin_account_id || undefined}
                onValueChange={(v) => setFormData({ ...formData, origin_account_id: v || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.payment_method || undefined}
                onValueChange={(v) => setFormData({ ...formData, payment_method: (v || undefined) as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="ted">TED</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_corporativo">Cartão Corporativo</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor Total *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Juros / Multa</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.interest_fine}
                onChange={(e) => setFormData({ ...formData, interest_fine: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Final</Label>
              <Input type="text" value={formatCurrency(finalValue)} disabled className="bg-muted" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payable ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

