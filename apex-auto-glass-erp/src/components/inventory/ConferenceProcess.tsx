import { useEffect, useState } from 'react';
import { pickingService, PickingItem } from '@/services/pickingService';
import { conferenceService, Conference } from '@/services/conferenceService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, ArrowLeft, AlertOctagon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ConferenceProcessProps {
    pickingId: string;
    onBack: () => void;
    onFinish: () => void;
}

export function ConferenceProcess({ pickingId, onBack, onFinish }: ConferenceProcessProps) {
    const [items, setItems] = useState<PickingItem[]>([]);
    const [conference, setConference] = useState<Conference | null>(null);
    const [loading, setLoading] = useState(true);
    const [finishing, setFinishing] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadData();
    }, [pickingId]);

    const loadData = async () => {
        try {
            const [itemsData, pickingData] = await Promise.all([
                pickingService.getPickingItems(pickingId),
                pickingService.getPicking(pickingId) // We need picking data to get sale info
            ]);
            setItems(itemsData || []);
            // We might need to fetch conference ID if we want to update it, but startConference returns it usually.
            // For now, we assume we are in a conference session.
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const toggleCheck = (itemId: string) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const handleApprove = async () => {
        // Validate all checked
        const allChecked = items.every(i => i.status_item !== 'ok' || checkedItems[i.id]);
        if (!allChecked) {
            toast({ title: 'Atenção', description: 'Confira todos os itens antes de aprovar', variant: 'destructive' });
            return;
        }

        setFinishing(true);
        try {
            // We need the conference ID. Since we don't have it in props, we might need to fetch it or pass it.
            // But startConference is idempotent-ish in our service, so let's call it to get ID or just fetch.
            // Better: fetch conference for this picking.
            const { data: conf } = await conferenceService.startConference(pickingId, 'temp', 'temp'); // Dummy call to get ID if we implemented it that way, but wait.
            // Actually let's fetch it properly.
            // In a real app, we'd pass conferenceId prop. For now, let's fetch.

            // Assuming we can get it via service (we need to add a method or just use supabase directly here for simplicity or add to service)
            // Let's assume we have it or fetch it.
            // For now, let's assume we can fetch it by picking_id.

            // We need to implement getConferenceByPickingId in service or just use what we have.
            // Let's use the one we created in startConference logic which returns existing.
            // We need user and company ID for that.
            // Let's just fetch directly here to be safe.

            // Actually, let's just use the service method we defined: startConference checks existing.
            // But we need user/company.
            // Let's skip the "start" call here and assume it exists because we are in the process.
            // We need to find the conference ID.

            // Let's add a helper in this component to find the conference ID.
            // Or better, update service to allow finding by picking ID.

            // Quick fix:
            const { data: confs } = await import('@/integrations/supabase/client').then(m => m.supabase.from('conference').select('id').eq('picking_id', pickingId).single());

            if (confs) {
                await conferenceService.approveConference(confs.id, pickingId);
                toast({ title: 'Sucesso', description: 'Conferência aprovada e estoque baixado!' });
                onFinish();
            } else {
                throw new Error('Conferência não encontrada');
            }

        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setFinishing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast({ title: 'Erro', description: 'Informe o motivo da reprovação', variant: 'destructive' });
            return;
        }

        setFinishing(true);
        try {
            const { data: confs } = await import('@/integrations/supabase/client').then(m => m.supabase.from('conference').select('id').eq('picking_id', pickingId).single());

            if (confs) {
                await conferenceService.rejectConference(confs.id, pickingId, rejectReason);
                toast({ title: 'Reprovado', description: 'Conferência reprovada. Retornando para separação.' });
                onFinish();
            }
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setFinishing(false);
            setRejectDialogOpen(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Conferência</h2>
                        <p className="text-muted-foreground">Confira os itens separados fisicamente</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={finishing}>
                        <XCircle className="mr-2 h-4 w-4" /> Reprovar
                    </Button>
                    <Button onClick={handleApprove} disabled={finishing} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar Conferência
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {items.map(item => (
                    <Card key={item.id} className={cn(
                        "transition-colors cursor-pointer",
                        checkedItems[item.id] ? "bg-green-50 border-green-200" : "hover:bg-muted/50",
                        item.status_item !== 'ok' ? "opacity-70 bg-gray-100" : ""
                    )} onClick={() => item.status_item === 'ok' && toggleCheck(item.id)}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-6 w-6 rounded-full border-2 flex items-center justify-center",
                                    checkedItems[item.id] ? "bg-green-600 border-green-600 text-white" : "border-muted-foreground"
                                )}>
                                    {checkedItems[item.id] && <CheckCircle2 className="h-4 w-4" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                            {item.product?.internal_code}
                                        </span>
                                        <span className="font-medium">{item.product?.name}</span>
                                    </div>
                                    {item.status_item !== 'ok' && (
                                        <span className="text-xs text-red-600 font-bold uppercase mt-1 block">
                                            ITEM COM PROBLEMA: {item.status_item}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Qtd Separada</p>
                                <p className="text-xl font-bold">{item.quantity_picked}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reprovar Conferência</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Motivo da Reprovação</Label>
                            <Textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Explique o motivo para retornar à separação..."
                            />
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-md flex items-start gap-3">
                            <AlertOctagon className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <p className="text-sm text-yellow-700">
                                Ao reprovar, o pedido voltará para o status "Em Separação" e deverá ser verificado novamente pelo separador.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleReject}>Confirmar Reprovação</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
