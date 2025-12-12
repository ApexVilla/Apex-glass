import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  approveCredit,
  denyCredit,
  requestCreditAdjustment,
  type PendingCreditSale,
} from '@/services/creditService';

interface CreditAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: PendingCreditSale;
  actionType: 'approve' | 'deny' | 'adjust';
  onComplete: () => void;
}

export function CreditAnalysisDialog({
  open,
  onOpenChange,
  sale,
  actionType,
  onComplete,
}: CreditAnalysisDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('');
  const [adjustmentDetails, setAdjustmentDetails] = useState({
    downPayment: '',
    newPaymentMethod: '',
    installments: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    // Validações
    if (actionType === 'deny' && !reason.trim()) {
      toast({
        title: 'Atenção',
        description: 'Motivo da negação é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (actionType === 'adjust') {
      if (!reason.trim()) {
        toast({
          title: 'Atenção',
          description: 'Motivo do ajuste é obrigatório',
          variant: 'destructive',
        });
        return;
      }
      if (!adjustmentType) {
        toast({
          title: 'Atenção',
          description: 'Tipo de ajuste é obrigatório',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const details: Record<string, any> = {
        sale_number: sale.sale_number,
        customer_name: sale.customer_name,
        total: sale.total,
        payment_method: sale.payment_method,
      };

      if (actionType === 'approve') {
        await approveCredit(sale.id, user.id, reason || undefined, {
          ...details,
          credit_info: sale.credit_info,
        });
        toast({
          title: 'Sucesso',
          description: 'Crédito aprovado com sucesso',
        });
      } else if (actionType === 'deny') {
        await denyCredit(sale.id, user.id, reason, {
          ...details,
          credit_info: sale.credit_info,
        });
        toast({
          title: 'Sucesso',
          description: 'Crédito negado',
        });
      } else if (actionType === 'adjust') {
        await requestCreditAdjustment(
          sale.id,
          user.id,
          reason,
          adjustmentType,
          {
            ...adjustmentDetails,
            ...details,
          },
          {
            credit_info: sale.credit_info,
          }
        );
        toast({
          title: 'Sucesso',
          description: 'Ajuste solicitado com sucesso',
        });
      }

      // Limpar formulário
      setReason('');
      setAdjustmentType('');
      setAdjustmentDetails({
        downPayment: '',
        newPaymentMethod: '',
        installments: '',
        notes: '',
      });

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao processar ação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar ação',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'approve':
        return 'Aprovar Crédito';
      case 'deny':
        return 'Negar Crédito';
      case 'adjust':
        return 'Solicitar Ajuste de Crédito';
      default:
        return 'Análise de Crédito';
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case 'approve':
        return 'Aprovar crédito para a venda. Isso removerá a pendência e liberará para faturamento.';
      case 'deny':
        return 'Negar crédito para a venda. O motivo será exibido para o vendedor.';
      case 'adjust':
        return 'Solicitar ajuste na venda. O vendedor será notificado sobre as alterações necessárias.';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'approve':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'deny':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'adjust':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Venda */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Venda:</span> #{sale.sale_number}
              </div>
              <div>
                <span className="font-medium">Cliente:</span> {sale.customer_name}
              </div>
              <div>
                <span className="font-medium">Valor Total:</span> R${' '}
                {sale.total.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div>
                <span className="font-medium">Forma de Pagamento:</span>{' '}
                {sale.payment_method || 'N/A'}
              </div>
            </div>
            {sale.credit_info && (
              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
                <div>
                  <span className="font-medium">Limite Disponível:</span>{' '}
                  <span
                    className={
                      sale.credit_info.limit_available < 0
                        ? 'text-red-600 font-semibold'
                        : ''
                    }
                  >
                    R${' '}
                    {sale.credit_info.limit_available.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total em Aberto:</span> R${' '}
                  {sale.credit_info.total_open.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div>
                  <span className="font-medium">Total Vencido:</span>{' '}
                  <span className="text-red-600 font-semibold">
                    R${' '}
                    {sale.credit_info.total_overdue.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Motivo (obrigatório para deny e adjust) */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo {actionType === 'approve' ? '(opcional)' : '*'}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Descreva o motivo da aprovação (opcional)'
                  : actionType === 'deny'
                  ? 'Descreva o motivo da negação (obrigatório)'
                  : 'Descreva o motivo do ajuste (obrigatório)'
              }
              rows={3}
            />
          </div>

          {/* Campos específicos para ajuste */}
          {actionType === 'adjust' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adjustmentType">Tipo de Ajuste *</Label>
                <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                  <SelectTrigger id="adjustmentType">
                    <SelectValue placeholder="Selecione o tipo de ajuste" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="down_payment">
                      Pedir Entrada Maior
                    </SelectItem>
                    <SelectItem value="payment_method">
                      Alterar Forma de Pagamento
                    </SelectItem>
                    <SelectItem value="installments">
                      Reduzir Parcelamento
                    </SelectItem>
                    <SelectItem value="regularize_debts">
                      Regularizar Dívidas em Aberto
                    </SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Detalhes específicos por tipo de ajuste */}
              {adjustmentType === 'down_payment' && (
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Valor da Entrada Sugerida</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    step="0.01"
                    value={adjustmentDetails.downPayment}
                    onChange={(e) =>
                      setAdjustmentDetails({
                        ...adjustmentDetails,
                        downPayment: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              )}

              {adjustmentType === 'payment_method' && (
                <div className="space-y-2">
                  <Label htmlFor="newPaymentMethod">Nova Forma de Pagamento</Label>
                  <Input
                    id="newPaymentMethod"
                    value={adjustmentDetails.newPaymentMethod}
                    onChange={(e) =>
                      setAdjustmentDetails({
                        ...adjustmentDetails,
                        newPaymentMethod: e.target.value,
                      })
                    }
                    placeholder="Ex: Cartão à vista, PIX, etc."
                  />
                </div>
              )}

              {adjustmentType === 'installments' && (
                <div className="space-y-2">
                  <Label htmlFor="installments">Número de Parcelas Sugerido</Label>
                  <Input
                    id="installments"
                    type="number"
                    value={adjustmentDetails.installments}
                    onChange={(e) =>
                      setAdjustmentDetails({
                        ...adjustmentDetails,
                        installments: e.target.value,
                      })
                    }
                    placeholder="Ex: 3"
                  />
                </div>
              )}

              {adjustmentType === 'regularize_debts' && (
                <div className="space-y-2">
                  <Label htmlFor="regularizeNotes">Observações sobre Regularização</Label>
                  <Textarea
                    id="regularizeNotes"
                    value={adjustmentDetails.notes}
                    onChange={(e) =>
                      setAdjustmentDetails({
                        ...adjustmentDetails,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Descreva quais dívidas precisam ser regularizadas"
                    rows={3}
                  />
                </div>
              )}

              {(adjustmentType === 'other' || adjustmentType === 'down_payment' ||
                adjustmentType === 'payment_method' || adjustmentType === 'installments') && (
                <div className="space-y-2">
                  <Label htmlFor="adjustmentNotes">Observações Adicionais</Label>
                  <Textarea
                    id="adjustmentNotes"
                    value={adjustmentDetails.notes}
                    onChange={(e) =>
                      setAdjustmentDetails({
                        ...adjustmentDetails,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Informações adicionais sobre o ajuste"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'approve' && 'Aprovar Crédito'}
              {actionType === 'deny' && 'Negar Crédito'}
              {actionType === 'adjust' && 'Solicitar Ajuste'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

