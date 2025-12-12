import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { approveSale, rejectSale, isApprover, getPriceControlSettings, PriceControlSettings } from '@/services/priceControlService';

interface SaleApprovalDialogProps {
  sale: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

export function SaleApprovalDialog({ sale, open, onOpenChange, onApproved }: SaleApprovalDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceControlSettings | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    if (open && sale) {
      loadSaleItems();
      loadPriceSettings();
    }
  }, [open, sale]);

  useEffect(() => {
    if (user && priceSettings) {
      setCanApprove(isApprover(user.id, priceSettings));
    }
  }, [user, priceSettings]);

  const loadSaleItems = async () => {
    if (!sale?.id) return;
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, product:products(*)')
        .eq('sale_id', sale.id);

      if (error) throw error;
      setSaleItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar itens da venda',
        variant: 'destructive',
      });
    }
  };

  const loadPriceSettings = async () => {
    if (!sale?.company_id) return;
    try {
      const settings = await getPriceControlSettings(sale.company_id);
      setPriceSettings(settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleApprove = async () => {
    if (!sale?.id || !user?.id) return;

    setLoading(true);
    try {
      await approveSale(sale.id, user.id);
      toast({
        title: 'Sucesso',
        description: 'Venda aprovada com sucesso',
      });
      onApproved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao aprovar venda',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!sale?.id || !user?.id) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o motivo da reprovação',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await rejectSale(sale.id, user.id, rejectionReason);
      toast({
        title: 'Sucesso',
        description: 'Venda reprovada',
      });
      onApproved();
      onOpenChange(false);
      setRejectionReason('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao reprovar venda',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingItems = saleItems.filter(item => 
    item.status_preco === 'DESCONTO_EXCEDIDO' || item.status_preco === 'ABAIXO_DO_MINIMO'
  );

  if (!canApprove) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso Negado</DialogTitle>
            <DialogDescription>
              Você não tem permissão para aprovar vendas. Apenas usuários configurados como aprovadores podem realizar esta ação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprovar/Reprovar Venda #{sale?.sale_number}</DialogTitle>
          <DialogDescription>
            Revise os itens que requerem aprovação antes de tomar uma decisão
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Venda */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="font-medium">{sale?.customer?.name || 'Consumidor Final'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="font-semibold text-lg">{formatCurrency(sale?.total || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                Pendente Aprovação
              </span>
            </div>
          </div>

          {/* Itens Pendentes */}
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Itens que Requerem Aprovação</Label>
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name || 'Produto'}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantity}
                        </p>
                      </div>
                      {item.status_preco === 'DESCONTO_EXCEDIDO' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Desconto Excedido
                        </span>
                      )}
                      {item.status_preco === 'ABAIXO_DO_MINIMO' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Abaixo do Mínimo
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preço Original:</span>
                        <p className="font-medium">{formatCurrency(item.preco_original || item.unit_price)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preço Final:</span>
                        <p className="font-medium">{formatCurrency(item.preco_final || item.unit_price)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Desconto:</span>
                        <p className="font-medium text-destructive">
                          {item.desconto_percentual ? `${item.desconto_percentual.toFixed(2)}%` : formatCurrency(item.discount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivo da Reprovação */}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo da Reprovação (se reprovar)</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Informe o motivo da reprovação..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <XCircle className="mr-2 h-4 w-4" />
            Reprovar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

