import { useEffect, useState } from 'react';
import { pickingService, Picking, PickingItem, PickingStats } from '@/services/pickingService';
import { useAuth } from '@/contexts/AuthContext';
import { canUsePicking } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Package, Save, Loader2, 
    MapPin, Image as ImageIcon, RefreshCw, X, Plus, Minus, Camera
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PickingProcessProps {
    pickingId: string;
    onBack: () => void;
    onFinish: () => void;
}

export function PickingProcess({ pickingId, onBack, onFinish }: PickingProcessProps) {
    const { user, profile, company } = useAuth();
    const [picking, setPicking] = useState<Picking | null>(null);
    const [items, setItems] = useState<PickingItem[]>([]);
    const [stats, setStats] = useState<PickingStats>({ total: 0, separados: 0, faltando: 0, parciais: 0, substituidos: 0 });
    const [loading, setLoading] = useState(true);
    const [finishing, setFinishing] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [recreatingItems, setRecreatingItems] = useState(false);
    
    // Dialogs
    const [issueDialogOpen, setIssueDialogOpen] = useState(false);
    const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false);
    const [partialDialogOpen, setPartialDialogOpen] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    
    // Selected item state
    const [selectedItem, setSelectedItem] = useState<PickingItem | null>(null);
    const [issueType, setIssueType] = useState<'faltando' | 'danificado'>('faltando');
    const [issueNotes, setIssueNotes] = useState('');
    const [partialQuantity, setPartialQuantity] = useState(0);
    const [substituteProducts, setSubstituteProducts] = useState<any[]>([]);
    const [selectedSubstitute, setSelectedSubstitute] = useState<string>('');

    useEffect(() => {
        if (pickingId) {
            loadData();
        }
    }, [pickingId]);

    const loadData = async () => {
        if (!pickingId) return;
        
        setLoading(true);
        try {
            const [pickingData, itemsData, statsData] = await Promise.all([
                pickingService.getPicking(pickingId),
                pickingService.getPickingItems(pickingId),
                pickingService.getStats(pickingId)
            ]);
            
            if (!pickingData) {
                throw new Error('Picking não encontrado');
            }
            
            setPicking(pickingData);
            setItems(itemsData || []);
            setStats(statsData);
        } catch (error: any) {
            console.error('Erro ao carregar dados da separação:', error);
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao carregar dados da separação', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    // Marcar como separado (quantidade completa)
    const handleMarkAsSeparated = async (item: PickingItem) => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!user || !activeCompanyId) return;

        try {
            // Validar estoque
            const hasStock = await pickingService.checkStock(
                item.product_id, 
                item.quantity_sold, 
                activeCompanyId
            );

            if (!hasStock) {
                toast({ 
                    title: 'Estoque Insuficiente', 
                    description: `Não há estoque suficiente. Disponível: ${item.product?.quantity || 0}`, 
                    variant: 'destructive' 
                });
                return;
            }

            await pickingService.markAsSeparated(
                item.id, 
                item.quantity_sold, 
                user.id, 
                activeCompanyId
            );

            await loadData(); // Recarregar dados
            toast({ title: 'Sucesso', description: 'Item marcado como separado' });
        } catch (error: any) {
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao marcar item como separado', 
                variant: 'destructive' 
            });
        }
    };

    // Abrir dialog de falta
    const openMissingDialog = (item: PickingItem) => {
        setSelectedItem(item);
        setIssueType('faltando');
        setIssueNotes(item.notes || '');
        setIssueDialogOpen(true);
    };

    // Abrir dialog de danificado
    const openDamagedDialog = (item: PickingItem) => {
        setSelectedItem(item);
        setIssueType('danificado');
        setIssueNotes(item.notes || '');
        setIssueDialogOpen(true);
    };

    // Salvar problema (falta/danificado)
    const handleSaveIssue = async () => {
        if (!selectedItem || !user) return;

        try {
            await pickingService.markAsMissing(selectedItem.id, issueNotes, user.id);
            await loadData();
            setIssueDialogOpen(false);
            toast({ title: 'Item atualizado', description: `Item marcado como ${issueType}` });
        } catch (error: any) {
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao salvar problema', 
                variant: 'destructive' 
            });
        }
    };

    // Abrir dialog de separação parcial
    const openPartialDialog = (item: PickingItem) => {
        setSelectedItem(item);
        setPartialQuantity(item.quantity_picked || 0);
        setPartialDialogOpen(true);
    };

    // Salvar separação parcial
    const handleSavePartial = async () => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!selectedItem || !user || !activeCompanyId) return;

        if (partialQuantity <= 0 || partialQuantity > selectedItem.quantity_sold) {
            toast({ 
                title: 'Erro', 
                description: 'Quantidade inválida', 
                variant: 'destructive' 
            });
            return;
        }

        try {
            // Validar estoque
            const hasStock = await pickingService.checkStock(
                selectedItem.product_id, 
                partialQuantity, 
                activeCompanyId
            );

            if (!hasStock) {
                toast({ 
                    title: 'Estoque Insuficiente', 
                    description: `Não há estoque suficiente. Disponível: ${selectedItem.product?.quantity || 0}`, 
                    variant: 'destructive' 
                });
                return;
            }

            await pickingService.partialPicking(
                selectedItem.id, 
                partialQuantity, 
                user.id, 
                activeCompanyId
            );

            await loadData();
            setPartialDialogOpen(false);
            toast({ title: 'Sucesso', description: 'Separação parcial registrada' });
        } catch (error: any) {
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao salvar separação parcial', 
                variant: 'destructive' 
            });
        }
    };

    // Abrir dialog de substituição
    const openSubstituteDialog = async (item: PickingItem) => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!activeCompanyId) return;

        setSelectedItem(item);
        setSelectedSubstitute('');
        
        // Buscar produtos com mesmo código de fabricação
        if (item.product?.manufacturer_code) {
            const products = await pickingService.findProductsByManufacturerCode(
                item.product.manufacturer_code,
                activeCompanyId,
                item.product_id
            );
            setSubstituteProducts(products);
        } else {
            setSubstituteProducts([]);
        }

        setSubstituteDialogOpen(true);
    };

    // Salvar substituição
    const handleSaveSubstitute = async () => {
        if (!selectedItem || !user || !selectedSubstitute) return;

        try {
            await pickingService.substituteProduct(selectedItem.id, selectedSubstitute, user.id);
            await loadData();
            setSubstituteDialogOpen(false);
            toast({ title: 'Sucesso', description: 'Produto substituído com sucesso' });
        } catch (error: any) {
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao substituir produto', 
                variant: 'destructive' 
            });
        }
    };

    // Adicionar observação
    const openNotesDialog = (item: PickingItem) => {
        setSelectedItem(item);
        setIssueNotes(item.notes || '');
        setNotesDialogOpen(true);
    };

    const handleSaveNotes = async () => {
        if (!selectedItem) return;

        try {
            await pickingService.updatePickingItem(selectedItem.id, {
                notes: issueNotes
            });
            await loadData();
            setNotesDialogOpen(false);
            toast({ title: 'Sucesso', description: 'Observação salva' });
        } catch (error: any) {
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao salvar observação', 
                variant: 'destructive' 
            });
        }
    };

    // Finalizar separação
    const handleFinish = async () => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!user || !activeCompanyId) return;

        if (!items || items.length === 0) {
            toast({ title: 'Erro', description: 'Não há itens para finalizar', variant: 'destructive' });
            return;
        }

        // Verificar se há itens sem processar (sem quantidade separada e sem marcação de falta)
        const unprocessed = items.filter(i => 
            i.status_item !== 'falta' && 
            i.status_item !== 'danificado' &&
            (!i.quantity_picked || i.quantity_picked === 0)
        );

        if (unprocessed.length > 0) {
            toast({ 
                title: 'Pendências', 
                description: `Existem ${unprocessed.length} item(ns) sem processar. Marque como separado, parcial, faltando ou danificado antes de finalizar.`, 
                variant: 'destructive' 
            });
            return;
        }

        setFinishing(true);
        try {
            const result = await pickingService.finishPicking(pickingId, user.id, activeCompanyId);
            console.log('✅ Separação finalizada com sucesso. Status:', result?.status || 'N/A');
            toast({ 
                title: 'Sucesso', 
                description: 'Separação finalizada com sucesso! A separação aparecerá na lista de conferência.' 
            });
            onFinish();
        } catch (error: any) {
            console.error('❌ Erro ao finalizar separação:', error);
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao finalizar separação', 
                variant: 'destructive' 
            });
        } finally {
            setFinishing(false);
        }
    };

    // Pausar separação (não deletar, permite retomar depois)
    const handleCancel = async () => {
        if (!user) return;

        if (!confirm('Tem certeza que deseja pausar esta separação? Você poderá retomá-la depois. O progresso será preservado.')) {
            return;
        }

        setCancelling(true);
        try {
            await pickingService.pausePicking(pickingId, user.id);
            toast({ title: 'Sucesso', description: 'Separação pausada. Você pode retomá-la depois.' });
            onBack();
        } catch (error: any) {
            console.error('Erro ao pausar separação:', error);
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao pausar separação', 
                variant: 'destructive' 
            });
        } finally {
            setCancelling(false);
        }
    };

    // Formatar localização
    const formatLocation = (location: string | null) => {
        if (!location) return 'Não definido';
        const parsed = pickingService.parseLocation(location);
        const parts = [parsed.street, parsed.building, parsed.apartment].filter(Boolean);
        return parts.length > 0 ? parts.join(' - ') : 'Não definido';
    };

    // Obter cor do status (baseado nos valores válidos do enum: 'ok', 'falta', 'danificado')
    const getStatusColor = (item: PickingItem) => {
        if (item.status_item === 'falta') return 'bg-red-50 border-red-200';
        if (item.status_item === 'danificado') return 'bg-orange-50 border-orange-200';
        if (item.status_item === 'ok') {
            if (item.quantity_picked >= item.quantity_sold) return 'bg-green-50 border-green-200';
            if (item.quantity_picked > 0) return 'bg-yellow-50 border-yellow-200';
            return 'bg-gray-50 border-gray-200'; // Pendente
        }
        return '';
    };

    // Obter badge do status
    const getStatusBadge = (item: PickingItem) => {
        if (item.status_item === 'falta') {
            return <Badge variant="destructive">Faltando</Badge>;
        }
        if (item.status_item === 'danificado') {
            return <Badge className="bg-orange-600">Danificado</Badge>;
        }
        if (item.status_item === 'ok') {
            if (item.quantity_picked >= item.quantity_sold) {
                return <Badge className="bg-green-600">Separado</Badge>;
            }
            if (item.quantity_picked > 0) {
                return <Badge className="bg-yellow-600">Parcial ({item.quantity_picked}/{item.quantity_sold})</Badge>;
            }
            if (item.substituted_product_id) {
                return <Badge className="bg-blue-600">Substituído</Badge>;
            }
            return <Badge variant="outline">Pendente</Badge>;
        }
        return <Badge variant="outline">Pendente</Badge>;
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Carregando dados da separação...</p>
                </div>
            </div>
        );
    }
    
    if (!picking) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-lg font-semibold">Separação não encontrada</p>
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
            </div>
        );
    }
    
    // Função para recriar itens de picking
    const handleRecreateItems = async () => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!user || !activeCompanyId || !picking) return;

        if (!confirm('Deseja recriar os itens de picking? Isso irá buscar os itens da venda e criar os itens de separação novamente.')) {
            return;
        }

        setRecreatingItems(true);
        try {
            await pickingService.recreatePickingItems(picking.id, user.id, activeCompanyId);
            toast({ 
                title: 'Sucesso', 
                description: 'Itens de picking recriados com sucesso!' 
            });
            await loadData(); // Recarregar dados
        } catch (error: any) {
            console.error('Erro ao recriar itens:', error);
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao recriar itens de picking', 
                variant: 'destructive' 
            });
        } finally {
            setRecreatingItems(false);
        }
    };

    if (!items || items.length === 0) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="flex flex-col items-center gap-4">
                    <AlertTriangle className="h-12 w-12 text-warning" />
                    <div className="space-y-2">
                        <p className="text-lg font-semibold">Nenhum item encontrado para separação</p>
                        <p className="text-sm text-muted-foreground">
                            O pedido de separação existe, mas não há itens associados. 
                            Isso pode acontecer se os itens não foram criados corretamente quando a separação foi iniciada.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {picking && (
                            <Button 
                                onClick={handleRecreateItems} 
                                disabled={recreatingItems}
                                className="bg-primary hover:bg-primary/90"
                            >
                                {recreatingItems ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Recriando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Recriar Itens de Separação
                                    </>
                                )}
                            </Button>
                        )}
                        <Button onClick={onBack} variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Verificar permissões
    const hasPermission = canUsePicking(profile);
    if (!hasPermission) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-lg font-semibold">Acesso Negado</p>
                <p className="text-muted-foreground">
                    Você não tem permissão para usar o módulo de separação. 
                    Apenas SEPARADOR, SUPERVISOR e GERENTE podem usar esta funcionalidade.
                </p>
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Conteúdo Principal */}
            <div className="flex-1 space-y-4 lg:space-y-6">
                {/* Header */}
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1">
                            <h2 className="text-xl lg:text-2xl font-bold">Separação #{picking.sale?.sale_number}</h2>
                        </div>
                    </div>
                    
                    {/* Informações do Cliente - Mobile Friendly */}
                    <div className="space-y-1 px-2">
                        <p className="text-sm lg:text-base font-medium">
                            Cliente: <span className="text-muted-foreground">{picking.sale?.customer?.name || 'Cliente Balcão'}</span>
                        </p>
                        <p className="text-sm lg:text-base font-medium">
                            Vendedor: <span className="text-muted-foreground">{picking.sale?.seller?.full_name || picking.sale?.seller?.email || '-'}</span>
                        </p>
                    </div>

                    {/* Botões de Ação - Stacked no Mobile */}
                    <div className="flex flex-col sm:flex-row gap-2 px-2">
                        <Button 
                            onClick={handleCancel} 
                            disabled={cancelling}
                            variant="outline"
                            className="text-orange-600 hover:text-orange-700 border-orange-300 flex-1"
                        >
                            {cancelling ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <X className="h-4 w-4 mr-2" />
                            )}
                            Pausar
                        </Button>
                        <Button 
                            onClick={handleFinish} 
                            disabled={finishing} 
                            className="bg-primary hover:bg-primary/90 text-white font-semibold flex-1"
                        >
                            {finishing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Finalizando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Finalizar Separação
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Lista de Itens Organizados por Localização */}
                <div className="space-y-3 lg:space-y-4">
                    {items.map(item => (
                        <Card key={item.id} className={cn("transition-colors", getStatusColor(item))}>
                            <CardContent className="p-3 lg:p-4">
                                {/* Layout Mobile: Tudo em Coluna */}
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    {/* Informações do Produto */}
                                    <div className="flex-1 space-y-3">
                                        {/* Cabeçalho do Item */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <span className="font-mono text-base lg:text-sm bg-muted px-2 py-1 rounded inline-block w-fit">
                                                {item.product?.internal_code || 'S/C'}
                                            </span>
                                            <span className="font-semibold text-base lg:text-sm break-words">
                                                {item.product?.name}
                                            </span>
                                            <div className="self-start">
                                                {getStatusBadge(item)}
                                            </div>
                                        </div>
                                        
                                        {/* Informações do Produto - Em Colunas no Mobile */}
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-muted-foreground">Cód. Fabricante:</span>
                                                <span className="font-medium">{item.product?.manufacturer_code || '-'}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-muted-foreground">Localização:</span>
                                                <span className="font-medium break-words">{formatLocation(item.product?.location || null)}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">Estoque Disponível:</span>
                                                <span className="font-bold text-lg">{item.product?.quantity || 0}</span>
                                            </div>
                                        </div>

                                        {/* Quantidades - Destaque no Mobile */}
                                        <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                                            <div className="flex-1 text-center">
                                                <p className="text-xs text-muted-foreground mb-1">Solicitado</p>
                                                <p className="text-2xl lg:text-xl font-bold">{item.quantity_sold}</p>
                                            </div>
                                            
                                            {item.quantity_picked > 0 && (
                                                <div className="flex-1 text-center">
                                                    <p className="text-xs text-muted-foreground mb-1">Separado</p>
                                                    <p className="text-2xl lg:text-lg font-bold text-green-600">{item.quantity_picked}</p>
                                                </div>
                                            )}
                                        </div>

                                        {item.substituted_product && (
                                            <div className="text-sm bg-blue-100 px-3 py-2 rounded">
                                                <strong>Substituído por:</strong> {item.substituted_product.name} ({item.substituted_product.internal_code})
                                            </div>
                                        )}

                                        {item.notes && (
                                            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded">
                                                <strong>Observação:</strong> {item.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botões de Ação - Grid no Mobile */}
                                    <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 lg:gap-1 lg:w-auto">
                                        {(item.status_item === 'ok' && item.quantity_picked < item.quantity_sold) ? (
                                            <>
                                                <Button
                                                    size="default"
                                                    className="bg-green-600 hover:bg-green-700 text-white w-full lg:w-auto"
                                                    onClick={() => handleMarkAsSeparated(item)}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                                    <span className="hidden sm:inline">Separar</span>
                                                    <span className="sm:hidden">OK</span>
                                                </Button>
                                                <Button
                                                    size="default"
                                                    variant="outline"
                                                    className="w-full lg:w-auto"
                                                    onClick={() => openPartialDialog(item)}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                    Parcial
                                                </Button>
                                            </>
                                        ) : null}

                                        <Button
                                            size="default"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 w-full lg:w-auto"
                                            onClick={() => openMissingDialog(item)}
                                        >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Falta
                                        </Button>
                                        
                                        <Button
                                            size="default"
                                            variant="outline"
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300 w-full lg:w-auto"
                                            onClick={() => openDamagedDialog(item)}
                                        >
                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                            <span className="hidden sm:inline">Danificado</span>
                                            <span className="sm:hidden">Avariado</span>
                                        </Button>

                                        {item.product?.manufacturer_code && (
                                            <Button
                                                size="default"
                                                variant="outline"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 w-full lg:w-auto"
                                                onClick={() => openSubstituteDialog(item)}
                                            >
                                                <RefreshCw className="h-4 w-4 mr-1" />
                                                <span className="hidden sm:inline">Substituir</span>
                                                <span className="sm:hidden">Subst.</span>
                                            </Button>
                                        )}

                                        <Button
                                            size="default"
                                            variant="outline"
                                            className="w-full lg:w-auto"
                                            onClick={() => openNotesDialog(item)}
                                        >
                                            <Package className="h-4 w-4 mr-1" />
                                            <span className="hidden sm:inline">Observação</span>
                                            <span className="sm:hidden">Obs</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Painel Lateral com Estatísticas - Movido para cima no Mobile */}
            <div className="w-full lg:w-80 space-y-4 order-first lg:order-last">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Resumo da Separação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total de Itens</span>
                                <span className="font-semibold">{stats.total}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-green-600">
                                <span className="text-sm">Separados</span>
                                <span className="font-semibold">{stats.separados}</span>
                            </div>
                            <div className="flex justify-between text-yellow-600">
                                <span className="text-sm">Parciais</span>
                                <span className="font-semibold">{stats.parciais}</span>
                            </div>
                            <div className="flex justify-between text-blue-600">
                                <span className="text-sm">Substituídos</span>
                                <span className="font-semibold">{stats.substituidos}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span className="text-sm">Faltando</span>
                                <span className="font-semibold">{stats.faltando}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog: Falta/Danificado */}
            <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reportar Problema</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tipo de Problema</Label>
                            <div className="flex gap-4">
                                <Button
                                    variant={issueType === 'faltando' ? 'destructive' : 'outline'}
                                    onClick={() => setIssueType('faltando')}
                                    className="flex-1"
                                >
                                    Falta de Estoque
                                </Button>
                                <Button
                                    variant={issueType === 'danificado' ? 'destructive' : 'outline'}
                                    onClick={() => setIssueType('danificado')}
                                    className={cn("flex-1", issueType === 'danificado' ? "bg-orange-600 hover:bg-orange-700" : "")}
                                >
                                    Produto Danificado
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={issueNotes}
                                onChange={(e) => setIssueNotes(e.target.value)}
                                placeholder="Descreva o problema..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveIssue}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Separação Parcial */}
            <Dialog open={partialDialogOpen} onOpenChange={setPartialDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Separação Parcial</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Quantidade a Separar</Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPartialQuantity(Math.max(0, partialQuantity - 1))}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    value={partialQuantity}
                                    onChange={(e) => setPartialQuantity(parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={selectedItem?.quantity_sold || 0}
                                    className="text-center"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPartialQuantity(Math.min(selectedItem?.quantity_sold || 0, partialQuantity + 1))}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Máximo: {selectedItem?.quantity_sold || 0} | 
                                Disponível: {selectedItem?.product?.quantity || 0}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPartialDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSavePartial}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Substituição */}
            <Dialog open={substituteDialogOpen} onOpenChange={setSubstituteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Substituir Produto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Produto Original</Label>
                            <p className="text-sm text-muted-foreground">
                                {selectedItem?.product?.name} ({selectedItem?.product?.internal_code})
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Código Fabricação: {selectedItem?.product?.manufacturer_code || 'N/A'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Selecionar Produto Substituto</Label>
                            {substituteProducts.length > 0 ? (
                                <Select value={selectedSubstitute} onValueChange={setSelectedSubstitute}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um produto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {substituteProducts.map(product => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name} ({product.internal_code}) - Estoque: {product.quantity}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Nenhum produto com mesmo código de fabricação encontrado em estoque.
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubstituteDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSubstitute} disabled={!selectedSubstitute}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Observação */}
            <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Observação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={issueNotes}
                                onChange={(e) => setIssueNotes(e.target.value)}
                                placeholder="Digite suas observações sobre este item..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveNotes}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}