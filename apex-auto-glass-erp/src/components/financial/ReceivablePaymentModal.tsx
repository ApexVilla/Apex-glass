import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AccountReceivable } from '@/types/financial';
import { formatCurrency } from '@/lib/format';

interface ReceivablePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: AccountReceivable | null;
  onSuccess: () => void;
}

export function ReceivablePaymentModal({ open, onOpenChange, receivable, onSuccess }: ReceivablePaymentModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState({
    payment_value: 0,
    payment_date: new Date().toISOString().split('T')[0],
    account_id: '',
    payment_proof: null as File | null,
  });

  useEffect(() => {
    if (open && receivable) {
      loadAccounts();
      setPaymentData({
        payment_value: receivable.net_value - receivable.paid_value,
        payment_date: new Date().toISOString().split('T')[0],
        account_id: '',
        payment_proof: null,
      });
    }
  }, [open, receivable]);

  const loadAccounts = async () => {
    try {
      const { data } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (data) setAccounts(data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!receivable) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receivables/${receivable.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('financial-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('financial-documents').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receivable) {
      toast({ title: 'Erro', description: 'Conta a receber não encontrada', variant: 'destructive' });
      return;
    }

    if (paymentData.payment_value <= 0) {
      toast({ title: 'Erro', description: 'Valor do pagamento deve ser maior que zero', variant: 'destructive' });
      return;
    }

    const newPaidValue = receivable.paid_value + paymentData.payment_value;
    if (newPaidValue > receivable.net_value) {
      toast({ title: 'Erro', description: 'Valor do pagamento não pode ser maior que o valor líquido', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let proofUrl = receivable.payment_proof_url || null;

      // Upload do comprovante se houver
      if (paymentData.payment_proof) {
        setUploading(true);
        proofUrl = await handleFileUpload(paymentData.payment_proof);
        setUploading(false);
      }

      // Atualizar conta a receber
      const newStatus = newPaidValue >= receivable.net_value ? 'pago_total' : 'pago_parcial';
      const { error: updateError } = await supabase
        .from('accounts_receivable')
        .update({
          paid_value: newPaidValue,
          status: newStatus,
          paid_at: newStatus === 'pago_total' ? paymentData.payment_date : null,
          payment_proof_url: proofUrl,
        })
        .eq('id', receivable.id);

      if (updateError) throw updateError;

      // Criar movimentação financeira se houver conta selecionada
      if (paymentData.account_id) {
        const { error: movementError } = await supabase.from('financial_movements').insert({
          company_id: profile?.company_id,
          account_id: paymentData.account_id,
          movement_date: paymentData.payment_date,
          movement_type: 'entrada',
          description: `Recebimento: ${receivable.description}`,
          value: paymentData.payment_value,
          receivable_id: receivable.id,
          nature_id: receivable.nature_id,
          cost_center_id: receivable.cost_center_id,
          created_by: user?.id,
        });

        if (movementError) throw movementError;
      }

      toast({ title: 'Sucesso', description: 'Pagamento registrado com sucesso' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao registrar pagamento', variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!receivable) {
    return null;
  }

  const remainingValue = receivable.net_value - receivable.paid_value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
          <DialogDescription>Registre o pagamento da conta a receber</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">{formatCurrency(receivable.net_value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Pago:</span>
              <span className="font-semibold">{formatCurrency(receivable.paid_value)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">Valor Restante:</span>
              <span className="font-bold text-primary">{formatCurrency(remainingValue)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor do Pagamento *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={remainingValue}
              value={paymentData.payment_value}
              onChange={(e) => setPaymentData({ ...paymentData, payment_value: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data do Pagamento *</Label>
            <Input
              type="date"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Conta de Destino</Label>
            <Select
              value={paymentData.account_id}
              onValueChange={(v) => setPaymentData({ ...paymentData, account_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
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
            <Label>Comprovante de Pagamento</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPaymentData({ ...paymentData, payment_proof: file });
              }}
            />
            {paymentData.payment_proof && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {paymentData.payment_proof.name}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Enviando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

