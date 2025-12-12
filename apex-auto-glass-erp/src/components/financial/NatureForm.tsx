import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { NatureFormData, FinancialNature } from '@/types/financial';

interface NatureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nature?: FinancialNature | null;
  onSuccess: () => void;
}

export function NatureForm({ open, onOpenChange, nature, onSuccess }: NatureFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NatureFormData>({
    type: 'entrada',
    name: '',
    category: '',
    subcategory: '',
    appears_in_receivables: false,
    appears_in_payables: false,
    code: '',
    is_active: true,
    usada_em_vendas: false,
    usada_em_compras: false,
    usada_em_despesas: false,
    usada_no_caixa: true,
    gerar_automatico: false,
    permitir_edicao: true,
    descricao: '',
  });

  useEffect(() => {
    if (open) {
      if (nature) {
        setFormData({
          type: nature.type,
          name: nature.name,
          category: nature.category || '',
          subcategory: nature.subcategory || '',
          appears_in_receivables: nature.appears_in_receivables,
          appears_in_payables: nature.appears_in_payables,
          code: nature.code || '',
          is_active: nature.is_active,
          usada_em_vendas: nature.usada_em_vendas ?? false,
          usada_em_compras: nature.usada_em_compras ?? false,
          usada_em_despesas: nature.usada_em_despesas ?? false,
          usada_no_caixa: nature.usada_no_caixa ?? true,
          gerar_automatico: nature.gerar_automatico ?? false,
          permitir_edicao: nature.permitir_edicao ?? true,
          descricao: nature.descricao || '',
        });
      } else {
        setFormData({
          type: 'entrada',
          name: '',
          category: '',
          subcategory: '',
          appears_in_receivables: false,
          appears_in_payables: false,
          code: '',
          is_active: true,
          usada_em_vendas: false,
          usada_em_compras: false,
          usada_em_despesas: false,
          usada_no_caixa: true,
          gerar_automatico: false,
          permitir_edicao: true,
          descricao: '',
        });
      }
    }
  }, [open, nature]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (!formData.code?.trim()) {
      toast({ title: 'Erro', description: 'Código é obrigatório', variant: 'destructive' });
      return;
    }

    if (!formData.type) {
      toast({ title: 'Erro', description: 'Tipo é obrigatório', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = {
        type: formData.type,
        name: formData.name,
        category: formData.category || null,
        subcategory: formData.subcategory || null,
        appears_in_receivables: formData.appears_in_receivables,
        appears_in_payables: formData.appears_in_payables,
        code: formData.code || null,
        is_active: formData.is_active,
        usada_em_vendas: formData.usada_em_vendas ?? false,
        usada_em_compras: formData.usada_em_compras ?? false,
        usada_em_despesas: formData.usada_em_despesas ?? false,
        usada_no_caixa: formData.usada_no_caixa ?? true,
        gerar_automatico: formData.gerar_automatico ?? false,
        permitir_edicao: formData.permitir_edicao ?? true,
        descricao: formData.descricao || null,
        company_id: profile?.company_id,
        created_by: user?.id,
      };

      if (nature) {
        const { error } = await supabase
          .from('financial_natures')
          .update(data)
          .eq('id', nature.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Natureza atualizada' });
      } else {
        const { error } = await supabase
          .from('financial_natures')
          .insert([data]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Natureza criada' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar natureza', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nature ? 'Editar Natureza Financeira' : 'Nova Natureza Financeira'}</DialogTitle>
          <DialogDescription>Cadastre uma natureza financeira</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Venda produto, Serviços, Compra estoque..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Operacional, Administrativo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Input
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Código da Natureza *</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ex: 1.01, 1.02, 2.01"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usada nas Vendas</Label>
                <p className="text-xs text-muted-foreground">Permite usar esta natureza no módulo de vendas</p>
              </div>
              <Switch
                checked={formData.usada_em_vendas ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, usada_em_vendas: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usada nas Compras</Label>
                <p className="text-xs text-muted-foreground">Permite usar esta natureza no módulo de compras</p>
              </div>
              <Switch
                checked={formData.usada_em_compras ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, usada_em_compras: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usada em Despesas</Label>
                <p className="text-xs text-muted-foreground">Permite usar esta natureza em despesas</p>
              </div>
              <Switch
                checked={formData.usada_em_despesas ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, usada_em_despesas: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usada no Caixa/Tesouraria</Label>
                <p className="text-xs text-muted-foreground">Permite usar esta natureza em movimentações de caixa</p>
              </div>
              <Switch
                checked={formData.usada_no_caixa ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, usada_no_caixa: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gerar Lançamento Automático</Label>
                <p className="text-xs text-muted-foreground">Gera lançamento automático quando usado</p>
              </div>
              <Switch
                checked={formData.gerar_automatico ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, gerar_automatico: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir Edição</Label>
                <p className="text-xs text-muted-foreground">Permite editar após criação</p>
              </div>
              <Switch
                checked={formData.permitir_edicao ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, permitir_edicao: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aparece em Contas a Receber</Label>
              <Switch
                checked={formData.appears_in_receivables}
                onCheckedChange={(checked) => setFormData({ ...formData, appears_in_receivables: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aparece em Contas a Pagar</Label>
              <Switch
                checked={formData.appears_in_payables}
                onCheckedChange={(checked) => setFormData({ ...formData, appears_in_payables: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição / Observações</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Campo para observações gerais sobre a natureza financeira"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {nature ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

