import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AccountPayable } from '@/types/financial';
import { formatCurrency } from '@/lib/format';

interface PayablePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: AccountPayable | null;
  onSuccess: () => void;
}

export function PayablePaymentModal({ open, onOpenChange, payable, onSuccess }: PayablePaymentModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState({
    payment_value: 0,
    payment_date: new Date().toISOString().split('T')[0],
    account_id: '',
    attachment: null as File | null,
  });

  useEffect(() => {
    if (open && payable) {
      loadAccounts();
      setPaymentData({
        payment_value: payable.final_value - payable.paid_value,
        payment_date: new Date().toISOString().split('T')[0],
        account_id: '',
        attachment: null,
      });
    }
  }, [open, payable]);

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
    if (!payable) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `payables/${payable.id}/${fileName}`;

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

    if (!payable) {
      toast({ title: 'Erro', description: 'Conta a pagar não encontrada', variant: 'destructive' });
      return;
    }

    if (paymentData.payment_value <= 0) {
      toast({ title: 'Erro', description: 'Valor do pagamento deve ser maior que zero', variant: 'destructive' });
      return;
    }

    const newPaidValue = payable.paid_value + paymentData.payment_value;
    if (newPaidValue > payable.final_value) {
      toast({ title: 'Erro', description: 'Valor do pagamento não pode ser maior que o valor final', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let attachmentUrl = payable.attachment_url || null;

      // Upload do anexo se houver
      if (paymentData.attachment) {
        setUploading(true);
        attachmentUrl = await handleFileUpload(paymentData.attachment);
        setUploading(false);
      }

      // Atualizar conta a pagar
      const newStatus = newPaidValue >= payable.final_value ? 'pago_total' : 'pago_parcial';
      const { error: updateError } = await supabase
        .from('accounts_payable')
        .update({
          paid_value: newPaidValue,
          status: newStatus,
          paid_at: newStatus === 'pago_total' ? paymentData.payment_date : null,
          attachment_url: attachmentUrl,
        })
        .eq('id', payable.id);

      if (updateError) throw updateError;

      // Criar movimentação financeira se houver conta selecionada
      if (paymentData.account_id) {
        const { error: movementError } = await supabase.from('financial_movements').insert({
          company_id: profile?.company_id,
          account_id: paymentData.account_id,
          movement_date: paymentData.payment_date,
          movement_type: 'saida',
          description: `Pagamento: ${payable.description}`,
          value: paymentData.payment_value,
          payable_id: payable.id,
          nature_id: payable.nature_id,
          cost_center_id: payable.cost_center_id,
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

  if (!payable) {
    return null;
  }

  const remainingValue = payable.final_value - payable.paid_value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>Registre o pagamento da conta a pagar</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">{formatCurrency(payable.final_value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Pago:</span>
              <span className="font-semibold">{formatCurrency(payable.paid_value)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">Valor Restante:</span>
              <span className="font-bold text-destructive">{formatCurrency(remainingValue)}</span>
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
            <Label>Conta de Origem</Label>
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
            <Label>Anexo de Nota ou Comprovante</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPaymentData({ ...paymentData, attachment: file });
              }}
            />
            {paymentData.attachment && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {paymentData.attachment.name}
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

