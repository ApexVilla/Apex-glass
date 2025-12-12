import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CostCenterFormData, CostCenter } from '@/types/financial';

interface CostCenterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter?: CostCenter | null;
  onSuccess: () => void;
}

export function CostCenterForm({ open, onOpenChange, costCenter, onSuccess }: CostCenterFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CostCenterFormData>({
    name: '',
    description: '',
    code: '',
    type: 'misto',
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      if (costCenter) {
        setFormData({
          name: costCenter.name,
          description: costCenter.description || '',
          code: costCenter.code || '',
          type: costCenter.type || 'misto',
          is_active: costCenter.is_active,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          code: '',
          type: 'misto',
          is_active: true,
        });
      }
    }
  }, [open, costCenter]);

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
        description: formData.description || null,
        code: formData.code || null,
        type: formData.type || 'misto',
        is_active: formData.is_active,
        company_id: profile?.company_id,
        created_by: user?.id,
      };

      if (costCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update(data)
          .eq('id', costCenter.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Centro de custo atualizado' });
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert([data]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Centro de custo criado' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar centro de custo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{costCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle>
          <DialogDescription>Cadastre um centro de custo</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Administrativo, Comercial, Estoque..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type || 'misto'}
                onValueChange={(v) => setFormData({ ...formData, type: v as 'receita' | 'despesa' | 'misto' })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Código único"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Status</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {costCenter ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

