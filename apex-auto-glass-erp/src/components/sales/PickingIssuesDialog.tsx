import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, Package, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface PickingIssue {
    picking_item_id: string;
    product_id: string;
    product_name: string;
    product_code: string;
    quantity_sold: number;
    quantity_picked: number;
    notes: string;
    manufacturer_code?: string | null;
}

interface PickingIssues {
    missing?: PickingIssue[];
    damaged?: PickingIssue[];
    partial?: PickingIssue[];
}

interface PickingIssuesDialogProps {
    saleId: string;
    saleNumber: number;
    pickingIssues: PickingIssues | null;
    open: boolean;
    onClose: () => void;
    onResolved: () => void;
}

export function PickingIssuesDialog({
    saleId,
    saleNumber,
    pickingIssues,
    open,
    onClose,
    onResolved
}: PickingIssuesDialogProps) {
    const { company, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [adjustments, setAdjustments] = useState<Record<string, {
        action: 'remove' | 'replace' | 'keep' | 'adjust_quantity';
        replacementProductId?: string;
        newQuantity?: number;
        notes?: string;
    }>>({});
    const [substituteProducts, setSubstituteProducts] = useState<Record<string, any[]>>({});

    useEffect(() => {
        if (open && pickingIssues) {
            const activeCompanyId = company?.id || profile?.company_id;
            if (!activeCompanyId) return;

            // Inicializar ajustes padrão
            const defaultAdjustments: Record<string, any> = {};
            
            // Para itens faltando: remover por padrão
            pickingIssues.missing?.forEach(issue => {
                defaultAdjustments[issue.picking_item_id] = {
                    action: 'remove',
                    notes: issue.notes || ''
                };
            });
            
            // Para itens avariados: substituir por padrão
            pickingIssues.damaged?.forEach(issue => {
                defaultAdjustments[issue.picking_item_id] = {
                    action: 'replace',
                    notes: issue.notes || ''
                };
            });
            
            // Para separação parcial: ajustar quantidade por padrão
            pickingIssues.partial?.forEach(issue => {
                defaultAdjustments[issue.picking_item_id] = {
                    action: 'adjust_quantity',
                    newQuantity: issue.quantity_picked,
                    notes: issue.notes || ''
                };
            });
            
            setAdjustments(defaultAdjustments);

            // Buscar produtos substitutos para itens avariados
            const loadSubstitutes = async () => {
                const substitutes: Record<string, any[]> = {};
                for (const issue of pickingIssues.damaged || []) {
                    if (issue.manufacturer_code) {
                        const { data: products } = await supabase
                            .from('products')
                            .select('id, name, internal_code, quantity, manufacturer_code')
                            .eq('company_id', activeCompanyId)
                            .eq('manufacturer_code', issue.manufacturer_code)
                            .neq('id', issue.product_id)
                            .eq('is_active', true)
                            .gt('quantity', 0);
                        
                        if (products) {
                            substitutes[issue.picking_item_id] = products;
                        }
                    }
                }
                setSubstituteProducts(substitutes);
            };

            loadSubstitutes();
        }
    }, [open, pickingIssues, company?.id, profile?.company_id]);

    const handleApplyAdjustments = async () => {
        if (!pickingIssues) return;

        setLoading(true);
        try {
            // 1. Buscar todos os sale_items da venda
            const { data: saleItems, error: itemsError } = await supabase
                .from('sale_items')
                .select('*')
                .eq('sale_id', saleId);

            if (itemsError) throw itemsError;

            // 2. Processar cada ajuste
            const itemsToUpdate: any[] = [];
            const itemsToDelete: string[] = [];

            for (const [pickingItemId, adjustment] of Object.entries(adjustments)) {
                // Encontrar o sale_item correspondente
                const issue = [
                    ...(pickingIssues.missing || []),
                    ...(pickingIssues.damaged || []),
                    ...(pickingIssues.partial || [])
                ].find(i => i.picking_item_id === pickingItemId);

                if (!issue) continue;

                const saleItem = saleItems?.find(si => si.product_id === issue.product_id);
                if (!saleItem) continue;

                switch (adjustment.action) {
                    case 'remove':
                        // Remover item da venda
                        itemsToDelete.push(saleItem.id);
                        break;
                    
                    case 'replace':
                        // Substituir produto
                        if (adjustment.replacementProductId) {
                            itemsToUpdate.push({
                                id: saleItem.id,
                                product_id: adjustment.replacementProductId,
                                // Manter preço e desconto originais ou buscar do novo produto
                            });
                        }
                        break;
                    
                    case 'adjust_quantity':
                        // Ajustar quantidade
                        if (adjustment.newQuantity !== undefined && adjustment.newQuantity > 0) {
                            const newTotal = (saleItem.unit_price * adjustment.newQuantity) - (saleItem.discount || 0);
                            itemsToUpdate.push({
                                id: saleItem.id,
                                quantity: adjustment.newQuantity,
                                total: newTotal
                            });
                        } else {
                            // Se quantidade for 0, remover
                            itemsToDelete.push(saleItem.id);
                        }
                        break;
                    
                    case 'keep':
                        // Manter como está (não fazer nada)
                        break;
                }
            }

            // 3. Aplicar atualizações
            for (const update of itemsToUpdate) {
                const { id, ...updateData } = update;
                const { error } = await supabase
                    .from('sale_items')
                    .update(updateData)
                    .eq('id', id);
                
                if (error) throw error;
            }

            // 4. Deletar itens removidos
            if (itemsToDelete.length > 0) {
                const { error } = await supabase
                    .from('sale_items')
                    .delete()
                    .in('id', itemsToDelete);
                
                if (error) throw error;
            }

            // 5. Recalcular total da venda
            const { data: updatedSaleItems } = await supabase
                .from('sale_items')
                .select('total, discount')
                .eq('sale_id', saleId);

            if (updatedSaleItems) {
                const subtotal = updatedSaleItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
                const { data: sale } = await supabase
                    .from('sales')
                    .select('discount')
                    .eq('id', saleId)
                    .single();

                const discount = sale?.discount || 0;
                const total = subtotal - discount;

                // 6. Atualizar venda: limpar picking_issues e atualizar status
                const { error: saleUpdateError } = await supabase
                    .from('sales')
                    .update({
                        subtotal: subtotal,
                        total: total,
                        picking_issues: null,
                        status_venda: 'aguardando_separacao' // Voltar para separação após ajuste
                    })
                    .eq('id', saleId);

                if (saleUpdateError) throw saleUpdateError;
            }

            toast({
                title: 'Sucesso',
                description: 'Ajustes aplicados com sucesso! O pedido voltará para separação.'
            });

            onResolved();
            onClose();
        } catch (error: any) {
            console.error('Erro ao aplicar ajustes:', error);
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao aplicar ajustes',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!pickingIssues) return null;

    const totalIssues = (pickingIssues.missing?.length || 0) + 
                        (pickingIssues.damaged?.length || 0) + 
                        (pickingIssues.partial?.length || 0);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Problemas na Separação - Pedido #{saleNumber}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-800">
                            <strong>Atenção:</strong> Este pedido retornou do estoque com problemas na separação. 
                            Revise os itens abaixo e realize os ajustes necessários.
                        </p>
                    </div>

                    {/* Itens Faltando */}
                    {pickingIssues.missing && pickingIssues.missing.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <XCircle className="h-5 w-5" />
                                    Itens Faltando ({pickingIssues.missing.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pickingIssues.missing.map(issue => (
                                    <div key={issue.picking_item_id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="destructive">Faltando</Badge>
                                                    <span className="font-mono text-sm">{issue.product_code}</span>
                                                </div>
                                                <p className="font-semibold">{issue.product_name}</p>
                                                {issue.manufacturer_code && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Cód. Fabricante: {issue.manufacturer_code}
                                                    </p>
                                                )}
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Quantidade solicitada: <strong>{issue.quantity_sold}</strong>
                                                </p>
                                                {issue.notes && (
                                                    <p className="text-sm text-orange-600 mt-2">
                                                        <strong>Observação do estoque:</strong> {issue.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ação</Label>
                                            <Select
                                                value={adjustments[issue.picking_item_id]?.action || 'remove'}
                                                onValueChange={(value: any) => {
                                                    setAdjustments(prev => ({
                                                        ...prev,
                                                        [issue.picking_item_id]: {
                                                            ...prev[issue.picking_item_id],
                                                            action: value
                                                        }
                                                    }));
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="remove">Remover Item</SelectItem>
                                                    <SelectItem value="keep">Manter Item (Aguardar Estoque)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Itens Avariados */}
                    {pickingIssues.damaged && pickingIssues.damaged.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    Itens Avariados ({pickingIssues.damaged.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pickingIssues.damaged.map(issue => (
                                    <div key={issue.picking_item_id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-orange-600">Avariado</Badge>
                                                    <span className="font-mono text-sm">{issue.product_code}</span>
                                                </div>
                                                <p className="font-semibold">{issue.product_name}</p>
                                                {issue.manufacturer_code && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Cód. Fabricante: {issue.manufacturer_code}
                                                    </p>
                                                )}
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Quantidade solicitada: <strong>{issue.quantity_sold}</strong>
                                                </p>
                                                {issue.notes && (
                                                    <p className="text-sm text-orange-600 mt-2">
                                                        <strong>Observação do estoque:</strong> {issue.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ação</Label>
                                            <Select
                                                value={adjustments[issue.picking_item_id]?.action || 'replace'}
                                                onValueChange={(value: any) => {
                                                    setAdjustments(prev => ({
                                                        ...prev,
                                                        [issue.picking_item_id]: {
                                                            ...prev[issue.picking_item_id],
                                                            action: value,
                                                            replacementProductId: value === 'replace' ? undefined : prev[issue.picking_item_id]?.replacementProductId
                                                        }
                                                    }));
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="remove">Remover Item</SelectItem>
                                                    <SelectItem value="replace">Substituir por Outro Produto</SelectItem>
                                                    <SelectItem value="keep">Manter Item (Aceitar Avariado)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            
                                            {adjustments[issue.picking_item_id]?.action === 'replace' && (
                                                <div className="mt-2">
                                                    <Label>Produto Substituto</Label>
                                                    {substituteProducts[issue.picking_item_id] && substituteProducts[issue.picking_item_id].length > 0 ? (
                                                        <Select
                                                            value={adjustments[issue.picking_item_id]?.replacementProductId || ''}
                                                            onValueChange={(value) => {
                                                                setAdjustments(prev => ({
                                                                    ...prev,
                                                                    [issue.picking_item_id]: {
                                                                        ...prev[issue.picking_item_id],
                                                                        replacementProductId: value
                                                                    }
                                                                }));
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione um produto..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {substituteProducts[issue.picking_item_id].map(product => (
                                                                    <SelectItem key={product.id} value={product.id}>
                                                                        {product.name} ({product.internal_code}) - Estoque: {product.quantity}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Nenhum produto substituto encontrado com o mesmo código de fabricação.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Separação Parcial */}
                    {pickingIssues.partial && pickingIssues.partial.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-yellow-600">
                                    <RefreshCw className="h-5 w-5" />
                                    Separação Parcial ({pickingIssues.partial.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pickingIssues.partial.map(issue => (
                                    <div key={issue.picking_item_id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-yellow-600">Parcial</Badge>
                                                    <span className="font-mono text-sm">{issue.product_code}</span>
                                                </div>
                                                <p className="font-semibold">{issue.product_name}</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Solicitado: <strong>{issue.quantity_sold}</strong> | 
                                                    Separado: <strong className="text-yellow-600">{issue.quantity_picked}</strong>
                                                </p>
                                                {issue.notes && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        <strong>Observação:</strong> {issue.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ajustar Quantidade</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={issue.quantity_sold}
                                                    value={adjustments[issue.picking_item_id]?.newQuantity ?? issue.quantity_picked}
                                                    onChange={(e) => {
                                                        const newQty = parseInt(e.target.value) || 0;
                                                        setAdjustments(prev => ({
                                                            ...prev,
                                                            [issue.picking_item_id]: {
                                                                ...prev[issue.picking_item_id],
                                                                action: 'adjust_quantity',
                                                                newQuantity: newQty
                                                            }
                                                        }));
                                                    }}
                                                    className="w-24"
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    de {issue.quantity_sold} solicitados
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleApplyAdjustments} disabled={loading}>
                        {loading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Aplicando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Aplicar Ajustes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

