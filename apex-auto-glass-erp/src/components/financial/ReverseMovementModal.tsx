import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FinancialMovement } from '@/types/financial';

interface ReverseMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: FinancialMovement | null;
  onSuccess: () => void;
}

export function ReverseMovementModal({ open, onOpenChange, movement, onSuccess }: ReverseMovementModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  if (!movement) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast({ title: 'Erro', description: 'Motivo do estorno é obrigatório', variant: 'destructive' });
      return;
    }

    if (movement.is_reversed) {
      toast({ title: 'Erro', description: 'Este movimento já foi estornado', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Criar movimento reverso
      const reverseMovement = {
        company_id: profile?.company_id,
        account_id: movement.account_id,
        movement_date: new Date().toISOString().split('T')[0],
        movement_type: movement.movement_type === 'entrada' ? 'saida' : 'entrada',
        description: `ESTORNO: ${movement.description}`,
        value: movement.value,
        nature_id: movement.nature_id,
        cost_center_id: movement.cost_center_id,
        operator_id: user?.id,
        created_by: user?.id,
      };

      const { data: newMovement, error: insertError } = await supabase
        .from('financial_movements')
        .insert([reverseMovement])
        .select()
        .single();

      if (insertError) throw insertError;

      // Marcar movimento original como estornado
      const { error: updateError } = await supabase
        .from('financial_movements')
        .update({
          is_reversed: true,
          reversed_at: new Date().toISOString(),
          reversed_by: user?.id,
          reverse_reason: reason,
        })
        .eq('id', movement.id);

      if (updateError) throw updateError;

      // Criar log
      await supabase.from('financial_logs').insert({
        company_id: profile?.company_id,
        entity_type: 'financial_movements',
        entity_id: movement.id,
        action: 'reversed',
        user_id: user?.id,
        details: { reason, reverse_movement_id: newMovement.id },
      });

      toast({ title: 'Sucesso', description: 'Movimentação estornada com sucesso' });
      onSuccess();
      onOpenChange(false);
      setReason('');
    } catch (error: any) {
      console.error('Erro ao estornar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao estornar movimentação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estornar Movimentação</DialogTitle>
          <DialogDescription>
            Esta ação criará uma movimentação reversa e registrará o estorno no log do sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Descrição:</span>
              <span className="font-medium">{movement.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor:</span>
              <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(movement.value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <span className="font-medium">{movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo do Estorno *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo do estorno..."
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Estorno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

