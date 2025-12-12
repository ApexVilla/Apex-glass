import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { conferenceService } from '@/services/conferenceService';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/common/DataTable';
import { formatDate } from '@/lib/format';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ConferenceListProps {
    onStartConference: (pickingId: string) => void;
}

export function ConferenceList({ onStartConference }: ConferenceListProps) {
    const { profile, user } = useAuth();
    const [pickings, setPickings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingId, setStartingId] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.company_id) {
            console.log('📋 ConferenceList: Carregando pickings, companyId:', profile.company_id);
            loadPickings();
        } else {
            console.warn('⚠️ ConferenceList: Profile ou company_id não disponível', { profile });
        }
    }, [profile?.company_id]);

    const loadPickings = async () => {
        if (!profile?.company_id) {
            console.error('❌ Company ID não encontrado no perfil');
            toast({ title: 'Erro', description: 'ID da empresa não encontrado', variant: 'destructive' });
            setLoading(false);
            return;
        }

        console.log('🔄 Carregando pickings para conferência, companyId:', profile.company_id);
        setLoading(true);
        try {
            const data = await conferenceService.getPickingsReadyForConference(profile.company_id);
            console.log('✅ Pickings carregados:', data?.length || 0);
            setPickings(data || []);
            
            if (!data || data.length === 0) {
                console.warn('⚠️ Nenhum picking encontrado para conferência');
            }
        } catch (error: any) {
            console.error('❌ Erro ao carregar conferências:', error);
            console.error('📋 Detalhes do erro:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            toast({ 
                title: 'Erro', 
                description: error.message || 'Não foi possível carregar a lista de conferência', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async (picking: any) => {
        if (!user || !profile?.company_id) return;

        setStartingId(picking.id);
        try {
            await conferenceService.startConference(picking.id, user.id, profile.company_id);
            onStartConference(picking.id);
            // Não recarregar aqui, pois o componente será substituído pelo ConferenceProcess
        } catch (error) {
            console.error('Erro ao iniciar conferência:', error);
            toast({ title: 'Erro', description: 'Não foi possível iniciar a conferência', variant: 'destructive' });
        } finally {
            setStartingId(null);
        }
    };

    const columns = [
        { key: 'sale_number', header: 'Nº Pedido', cell: (item: any) => <span className="font-mono font-bold">#{item.sale?.sale_number}</span> },
        { key: 'customer', header: 'Cliente', cell: (item: any) => item.sale?.customer?.name || '-' },
        { key: 'finished_at', header: 'Separado em', cell: (item: any) => formatDate(item.finished_at) },
        {
            key: 'actions',
            header: 'Ações',
            cell: (item: any) => (
                <Button
                    size="sm"
                    onClick={() => handleStart(item)}
                    disabled={!!startingId}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    {startingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                    Conferir
                </Button>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Aguardando Conferência</h2>
                    <p className="text-sm text-muted-foreground">
                        Pedidos que foram separados e estão aguardando conferência
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadPickings} disabled={loading}>
                    {loading ? 'Carregando...' : 'Atualizar'}
                </Button>
            </div>
            {!loading && pickings.length === 0 && (
                <div className="p-8 border rounded-lg bg-muted/20 text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">Nenhuma separação aguardando conferência</p>
                    <p className="text-sm text-muted-foreground">
                        Quando uma separação for finalizada, ela aparecerá aqui para conferência.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Verifique se há separações finalizadas com status "separado" no sistema.
                    </p>
                </div>
            )}
            <DataTable
                columns={columns}
                data={pickings}
                loading={loading}
                emptyMessage="Nenhuma separação aguardando conferência"
            />
        </div>
    );
}
