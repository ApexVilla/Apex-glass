import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ReceivableFormData, AccountReceivable } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface ReceivableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable?: AccountReceivable | null;
  onSuccess: () => void;
}

interface Installment {
  installment_number: number;
  due_date: string;
  value: number;
}

export function ReceivableForm({ open, onOpenChange, receivable, onSuccess }: ReceivableFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [natures, setNatures] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [useInstallments, setUseInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installmentInterval, setInstallmentInterval] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [formData, setFormData] = useState<ReceivableFormData>({
    launch_date: new Date().toISOString().split('T')[0],
    expected_receipt_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    description: '',
    observation: '',
    nature_id: '',
    nature_category: '',
    cost_center_id: '',
    payment_method: undefined,
    entry_value: 0,
    discount: 0,
    invoice_number: '',
    destination_account_id: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (receivable) {
        setFormData({
          launch_date: receivable.launch_date.split('T')[0],
          expected_receipt_date: receivable.expected_receipt_date.split('T')[0],
          customer_id: receivable.customer_id || '',
          description: receivable.description,
          observation: receivable.observation || '',
          nature_id: receivable.nature_id || '',
          nature_category: receivable.nature_category || '',
          cost_center_id: receivable.cost_center_id || '',
          payment_method: receivable.payment_method,
          entry_value: receivable.entry_value,
          discount: receivable.discount,
          invoice_number: receivable.invoice_number || '',
          destination_account_id: receivable.destination_account_id || '',
        });
        setUseInstallments(false);
        setInstallmentCount(1);
      } else {
        setFormData({
          launch_date: new Date().toISOString().split('T')[0],
          expected_receipt_date: new Date().toISOString().split('T')[0],
          customer_id: '',
          description: '',
          observation: '',
          nature_id: '',
          nature_category: '',
          cost_center_id: '',
          payment_method: undefined,
          entry_value: 0,
          discount: 0,
          invoice_number: '',
          destination_account_id: '',
        });
        setUseInstallments(false);
        setInstallmentCount(1);
      }
    }
  }, [open, receivable]);

  useEffect(() => {
    if (useInstallments && formData.entry_value > 0 && installmentCount > 0) {
      generateInstallments();
    } else {
      setInstallments([]);
    }
  }, [useInstallments, installmentCount, installmentInterval, formData.entry_value, formData.discount, formData.expected_receipt_date]);

  const loadData = async () => {
    try {
      const [customersRes, naturesRes, costCentersRes, accountsRes] = await Promise.all([
        supabase.from('customers').select('id, name').order('name'),
        supabase
          .from('financial_natures')
          .select('*')
          .eq('is_active', true)
          .or('appears_in_receivables.eq.true,usada_em_vendas.eq.true,type.eq.entrada,type.eq.ambos'),
        supabase.from('cost_centers').select('*').eq('is_active', true).or('type.eq.receita,type.eq.misto'),
        supabase.from('financial_accounts').select('*').eq('is_active', true),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (naturesRes.data) setNatures(naturesRes.data);
      if (costCentersRes.data) setCostCenters(costCentersRes.data);
      if (accountsRes.data) setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados do formulário', variant: 'destructive' });
    }
  };

  const generateInstallments = () => {
    const netValue = formData.entry_value - formData.discount;
    const installmentValue = netValue / installmentCount;
    const baseDate = new Date(formData.expected_receipt_date);
    const newInstallments: Installment[] = [];

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(baseDate);
      
      if (installmentInterval === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else if (installmentInterval === 'biweekly') {
        dueDate.setDate(dueDate.getDate() + i * 15);
      } else if (installmentInterval === 'weekly') {
        dueDate.setDate(dueDate.getDate() + i * 7);
      }

      // Ajustar última parcela para compensar diferenças de arredondamento
      const value = i === installmentCount - 1 
        ? netValue - (installmentValue * (installmentCount - 1))
        : installmentValue;

      newInstallments.push({
        installment_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100,
      });
    }

    setInstallments(newInstallments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.description.trim()) {
      toast({ title: 'Erro', description: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    if (formData.entry_value <= 0) {
      toast({ title: 'Erro', description: 'Valor da entrada deve ser maior que zero', variant: 'destructive' });
      return;
    }

    const netValue = formData.entry_value - formData.discount;
    if (netValue <= 0) {
      toast({ title: 'Erro', description: 'Valor líquido deve ser maior que zero', variant: 'destructive' });
      return;
    }

    if (!formData.cost_center_id) {
      toast({ title: 'Erro', description: 'Centro de Custo é obrigatório', variant: 'destructive' });
      return;
    }

    // Validar data futura (máximo 2 anos)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    const expectedDate = new Date(formData.expected_receipt_date);
    if (expectedDate > maxDate) {
      toast({ title: 'Erro', description: 'Data de recebimento não pode ser maior que 2 anos', variant: 'destructive' });
      return;
    }

    // Validar parcelas
    if (useInstallments && installmentCount < 1) {
      toast({ title: 'Erro', description: 'Número de parcelas deve ser maior que zero', variant: 'destructive' });
      return;
    }

    if (useInstallments && installments.length === 0) {
      toast({ title: 'Erro', description: 'Gere as parcelas antes de salvar', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const baseData = {
        launch_date: formData.launch_date,
        customer_id: formData.customer_id || null,
        description: formData.description,
        observation: formData.observation || null,
        nature_id: formData.nature_id || null,
        nature_category: formData.nature_category || null,
        cost_center_id: formData.cost_center_id,
        payment_method: formData.payment_method || null,
        entry_value: formData.entry_value,
        discount: formData.discount,
        invoice_number: formData.invoice_number || null,
        destination_account_id: formData.destination_account_id || null,
        seller_id: user?.id || null,
        company_id: profile?.company_id,
        created_by: user?.id,
      };

      if (receivable) {
        // Atualizar conta existente
        const { error } = await supabase
          .from('accounts_receivable')
          .update({
            ...baseData,
            expected_receipt_date: formData.expected_receipt_date,
            net_value: netValue,
          })
          .eq('id', receivable.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta a receber atualizada com sucesso' });
      } else {
        // Criar nova(s) conta(s)
        if (useInstallments && installments.length > 0) {
          // Criar múltiplas contas (parcelas)
          const receivablesToInsert = installments.map((installment) => ({
            ...baseData,
            expected_receipt_date: installment.due_date,
            net_value: installment.value,
            entry_value: installment.value,
            discount: 0,
            description: `${formData.description} - Parcela ${installment.installment_number}/${installmentCount}`,
          }));

          const { error } = await supabase.from('accounts_receivable').insert(receivablesToInsert);

          if (error) throw error;
          toast({ 
            title: 'Sucesso', 
            description: `${installments.length} parcela(s) criada(s) com sucesso` 
          });
        } else {
          // Criar conta única
          const { error } = await supabase.from('accounts_receivable').insert([
            {
              ...baseData,
              expected_receipt_date: formData.expected_receipt_date,
              net_value: netValue,
            },
          ]);

          if (error) throw error;
          toast({ title: 'Sucesso', description: 'Conta a receber criada com sucesso' });
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao salvar conta a receber', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const netValue = formData.entry_value - formData.discount;
  const isOverdue = new Date(formData.expected_receipt_date) < new Date() && !receivable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receivable ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
          <DialogDescription>
            {receivable 
              ? 'Edite os dados da conta a receber' 
              : 'Preencha os dados da conta a receber. Você pode criar parcelas se necessário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label className="flex items-center gap-2">
                    Data de Recebimento Previsto *
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Atrasado
                      </Badge>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={formData.expected_receipt_date}
                    onChange={(e) => setFormData({ ...formData, expected_receipt_date: e.target.value })}
                    required
                    className={isOverdue ? 'border-destructive' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select 
                  value={formData.customer_id || undefined} 
                  onValueChange={(v) => setFormData({ ...formData, customer_id: v || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  required
                  placeholder="Ex: Venda de vidro para cliente X"
                />
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  rows={2}
                  placeholder="Informações adicionais sobre esta conta"
                />
              </div>
            </CardContent>
          </Card>

          {/* Classificação Financeira */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classificação Financeira</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Natureza Financeira</Label>
                  <Select 
                    value={formData.nature_id || undefined} 
                    onValueChange={(v) => setFormData({ ...formData, nature_id: v || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {natures.map((nature) => (
                        <SelectItem key={nature.id} value={nature.id}>
                          {nature.name} {nature.code && `(${nature.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria da Natureza</Label>
                  <Input
                    value={formData.nature_category}
                    onChange={(e) => setFormData({ ...formData, nature_category: e.target.value })}
                    placeholder="Ex: Operacional, Administrativo..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="ted">TED</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cartao_corporativo">Cartão Corporativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor da Entrada *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.entry_value}
                    onChange={(e) => setFormData({ ...formData, entry_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.entry_value}
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Líquido</Label>
                  <Input 
                    type="text" 
                    value={formatCurrency(netValue)} 
                    disabled 
                    className="bg-muted font-semibold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número da Nota Fiscal</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Ex: 000123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta de Destino</Label>
                  <Select
                    value={formData.destination_account_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, destination_account_id: v || '' })}
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
              </div>
            </CardContent>
          </Card>

          {/* Parcelas (apenas para novas contas) */}
          {!receivable && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Parcelas</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="use-installments" className="cursor-pointer">
                      Criar em Parcelas
                    </Label>
                    <Switch
                      id="use-installments"
                      checked={useInstallments}
                      onCheckedChange={setUseInstallments}
                    />
                  </div>
                </div>
              </CardHeader>
              {useInstallments && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Número de Parcelas *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={installmentCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value) || 1;
                          setInstallmentCount(Math.min(Math.max(count, 1), 60));
                        }}
                        required={useInstallments}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo *</Label>
                      <Select
                        value={installmentInterval}
                        onValueChange={(v: 'monthly' | 'weekly' | 'biweekly') => setInstallmentInterval(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quinzenal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateInstallments}
                        className="w-full"
                      >
                        Gerar Parcelas
                      </Button>
                    </div>
                  </div>

                  {installments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Preview das Parcelas</Label>
                      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                        {installments.map((installment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{installment.installment_number}/{installmentCount}</Badge>
                              <span className="text-muted-foreground">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {formatDate(installment.due_date)}
                              </span>
                            </div>
                            <span className="font-semibold">{formatCurrency(installment.value)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                          <span className="font-semibold">Total:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(installments.reduce((sum, i) => sum + i.value, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {receivable ? 'Salvar Alterações' : useInstallments ? `Criar ${installmentCount} Parcela(s)` : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
