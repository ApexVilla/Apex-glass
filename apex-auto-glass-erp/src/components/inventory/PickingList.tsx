import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pickingService } from '@/services/pickingService';
import { canUsePicking } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/common/DataTable';
import { formatDate, formatCurrency } from '@/lib/format';
import { Play, Loader2, Shield, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface PickingListProps {
    onStartPicking: (pickingId: string) => void;
}

export function PickingList({ onStartPicking }: PickingListProps) {
    const { profile, user, company } = useAuth();
    const [sales, setSales] = useState<any[]>([]);
    const [pausedPickings, setPausedPickings] = useState<any[]>([]);
    const [activePickings, setActivePickings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingId, setStartingId] = useState<string | null>(null);

    // Usar company do contexto (que já considera override para master users)
    const currentCompanyId = company?.id || profile?.company_id;

    useEffect(() => {
        if (currentCompanyId) {
            loadSales();
            loadPausedPickings();
            loadActivePickings();
        }
    }, [currentCompanyId]);

    const loadSales = async () => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!activeCompanyId) return;
        
        try {
            const data = await pickingService.getSalesWaitingForPicking(activeCompanyId);
            setSales(data || []);
        } catch (error) {
            console.error('Erro ao carregar vendas para separação:', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar a lista de separação', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const loadPausedPickings = async () => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!activeCompanyId) return;
        
        try {
            const data = await pickingService.getPausedPickings(activeCompanyId);
            setPausedPickings(data || []);
        } catch (error) {
            console.error('Erro ao carregar separações pausadas:', error);
        }
    };

    const loadActivePickings = async () => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!activeCompanyId) return;
        
        try {
            const data = await pickingService.getActivePickings(activeCompanyId);
            setActivePickings(data || []);
        } catch (error) {
            console.error('Erro ao carregar separações em andamento:', error);
        }
    };

    const handleStart = async (sale: any) => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!user || !activeCompanyId) {
            toast({ title: 'Erro', description: 'Usuário ou empresa não encontrado', variant: 'destructive' });
            return;
        }

        setStartingId(sale.id);
        try {
            console.log('Iniciando separação para venda:', sale.id);
            const picking = await pickingService.startPicking(sale.id, user.id, activeCompanyId);
            console.log('Picking criado:', picking);
            
            if (!picking || !picking.id) {
                throw new Error('Picking não foi criado corretamente');
            }
            
            console.log('Chamando onStartPicking com ID:', picking.id);
            onStartPicking(picking.id);
            
            // Recarregar as listas
            await loadSales();
            await loadActivePickings();
        } catch (error: any) {
            console.error('Erro ao iniciar separação:', error);
            toast({ 
                title: 'Erro', 
                description: error.message || 'Não foi possível iniciar a separação', 
                variant: 'destructive' 
            });
        } finally {
            setStartingId(null);
        }
    };

    const columns = [
        { key: 'sale_number', header: 'Nº Pedido', cell: (item: any) => <span className="font-mono font-bold">#{item.sale_number}</span> },
        { key: 'customer', header: 'Cliente', cell: (item: any) => item.customer?.name || 'Cliente Balcão' },
        { key: 'seller', header: 'Vendedor', cell: (item: any) => item.seller?.email || '-' },
        { key: 'created_at', header: 'Data', cell: (item: any) => formatDate(item.created_at) },
        { key: 'total', header: 'Total', cell: (item: any) => formatCurrency(item.total) },
        {
            key: 'actions',
            header: 'Ações',
            cell: (item: any) => (
                <Button
                    size="sm"
                    onClick={() => handleStart(item)}
                    disabled={!!startingId}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {startingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Iniciar Separação
                </Button>
            )
        },
    ];

    // Verificar permissões
    if (!canUsePicking(profile)) {
        return (
            <div className="p-8 text-center space-y-4">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-semibold">Acesso Negado</p>
                <p className="text-muted-foreground">
                    Você não tem permissão para usar o módulo de separação. 
                    Apenas SEPARADOR, SUPERVISOR e GERENTE podem usar esta funcionalidade.
                </p>
            </div>
        );
    }

    // Função para retomar separação pausada
    const handleResumePicking = async (picking: any) => {
        const activeCompanyId = company?.id || profile?.company_id;
        if (!user || !activeCompanyId) return;
        
        setStartingId(picking.id);
        try {
            // Retomar separação pausada
            await pickingService.startPicking(picking.sale_id, user.id, activeCompanyId);
            onStartPicking(picking.id);
            await loadPausedPickings();
            await loadActivePickings();
        } catch (error: any) {
            toast({ 
                title: 'Erro', 
                description: error.message || 'Erro ao retomar separação', 
                variant: 'destructive' 
            });
        } finally {
            setStartingId(null);
        }
    };

    const pausedColumns = [
        { key: 'sale_number', header: 'Nº Pedido', cell: (item: any) => <span className="font-mono font-bold">#{item.sale?.sale_number || '-'}</span> },
        { key: 'customer', header: 'Cliente', cell: (item: any) => item.sale?.customer?.name || 'Cliente Balcão' },
        { key: 'seller', header: 'Vendedor', cell: (item: any) => item.sale?.seller?.full_name || item.sale?.seller?.email || '-' },
        { key: 'started_at', header: 'Iniciada em', cell: (item: any) => formatDate(item.started_at) },
        { key: 'total', header: 'Total', cell: (item: any) => formatCurrency(item.sale?.total || 0) },
        {
            key: 'actions',
            header: 'Ações',
            cell: (item: any) => (
                <Button
                    size="sm"
                    onClick={() => handleResumePicking(item)}
                    disabled={!!startingId}
                    className="bg-orange-600 hover:bg-orange-700"
                >
                    {startingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Retomar
                </Button>
            )
        },
    ];

    const activeColumns = [
        { key: 'sale_number', header: 'Nº Pedido', cell: (item: any) => <span className="font-mono font-bold">#{item.sale?.sale_number || '-'}</span> },
        { key: 'customer', header: 'Cliente', cell: (item: any) => item.sale?.customer?.name || 'Cliente Balcão' },
        { key: 'seller', header: 'Vendedor', cell: (item: any) => item.sale?.seller?.full_name || item.sale?.seller?.email || '-' },
        { key: 'started_at', header: 'Iniciada em', cell: (item: any) => formatDate(item.started_at) },
        { key: 'total', header: 'Total', cell: (item: any) => formatCurrency(item.sale?.total || 0) },
        {
            key: 'actions',
            header: 'Ações',
            cell: (item: any) => (
                <Button
                    size="sm"
                    onClick={() => onStartPicking(item.id)}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <Play className="h-4 w-4 mr-2" />
                    Continuar
                </Button>
            )
        },
    ];

    return (
        <div className="space-y-6">
            {/* Separaciones Nuevas */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Pedidos Aguardando Separação</h2>
                    <Button variant="outline" size="sm" onClick={() => { loadSales(); loadPausedPickings(); loadActivePickings(); }}>Atualizar</Button>
                </div>
                <DataTable
                    columns={columns}
                    data={sales}
                    loading={loading}
                    emptyMessage="Nenhum pedido aguardando separação"
                />
            </div>

            {/* Separaciones em Andamento */}
            {activePickings.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Separações em Andamento</h2>
                            <p className="text-sm text-muted-foreground">
                                Separações que estão sendo realizadas no momento
                            </p>
                        </div>
                    </div>
                    <DataTable
                        columns={activeColumns}
                        data={activePickings}
                        loading={false}
                        emptyMessage="Nenhuma separação em andamento"
                    />
                </div>
            )}

            {/* Separaciones Pausadas */}
            {pausedPickings.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Separações Pausadas</h2>
                            <p className="text-sm text-muted-foreground">
                                Separações que foram pausadas e podem ser retomadas
                            </p>
                        </div>
                    </div>
                    <DataTable
                        columns={pausedColumns}
                        data={pausedPickings}
                        loading={false}
                        emptyMessage="Nenhuma separação pausada"
                    />
                </div>
            )}
        </div>
    );
}
