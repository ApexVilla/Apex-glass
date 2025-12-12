import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { OFXImportModal } from './OFXImportModal';
import { FinancialAccount } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ofxService } from '@/services/ofxService';

interface ReconciliationTabProps {
    accounts: FinancialAccount[];
}

export function ReconciliationTab({ accounts }: ReconciliationTabProps) {
    const { profile } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        loadItems();
    }, [selectedAccount, statusFilter]);

    const loadItems = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('reconciliation_items' as any)
                .select(`
          *,
          reconciliation:bank_reconciliations!inner(account_id)
        `)
                .order('statement_date', { ascending: false });

            if (selectedAccount !== 'all') {
                query = query.eq('reconciliation.account_id', selectedAccount);
            }

            if (statusFilter === 'matched') {
                query = query.eq('is_matched', true);
            } else if (statusFilter === 'unmatched') {
                query = query.eq('is_matched', false);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Map to OFXTransaction to run matching logic
            const transactions = data?.map((item: any) => ({
                id: item.fitid,
                type: item.statement_value > 0 ? 'CREDIT' : 'DEBIT',
                date: new Date(item.statement_date),
                amount: Math.abs(item.statement_value), // OFXTransaction amount is absolute for type check usually, but let's follow service logic
                // Service logic: amount is signed in parse, but absolute in some checks? 
                // parseOFX: amount is signed. type is derived.
                // findMatches: uses t.amount (signed) or Math.abs?
                // findMatches: Math.abs(t.amount). 
                // So let's keep amount signed here as per DB.
                // Wait, DB statement_value is signed.
                description: item.statement_description,
                category: item.notes,
                status: item.is_matched ? 'conciliado' : 'novo',
                // We need to pass the DB ID to reconcileTransaction if we want to update THIS specific item easily,
                // but reconcileTransaction uses fitid to find the item.
                // Let's ensure we pass the correct structure.
            })) || [];

            // We need to fix the amount for the service. 
            // Service parse: amount = parseFloat. 
            // Service findMatches: 
            // DEBIT: Math.abs(p.final_value) - Math.abs(t.amount)
            // CREDIT: Math.abs(r.net_value) - t.amount (assuming t.amount is positive for credit)

            const mappedTransactions = transactions.map((t: any) => ({
                ...t,
                amount: Math.abs(t.amount) // Service seems to expect positive amount for matching logic in some places?
                // Let's look at findMatches again.
                // DEBIT: Math.abs(t.amount)
                // CREDIT: t.amount
                // If t.amount is signed from DB (negative for debit), Math.abs works for debit.
                // For credit, it's positive.
                // So passing signed amount is fine if we handle it.
                // But let's look at `type` derivation in map above.
                // item.statement_value > 0 ? 'CREDIT' : 'DEBIT'
            }));

            // Actually, let's just use the service's findMatches.
            // But we need to make sure the input matches what findMatches expects.
            // findMatches expects OFXTransaction.

            const transactionsForService = data?.map((item: any) => ({
                id: item.fitid,
                type: item.statement_value >= 0 ? 'CREDIT' : 'DEBIT',
                date: new Date(item.statement_date),
                amount: Math.abs(item.statement_value), // Use absolute value here to match parse logic?
                // In parse: amount is signed.
                // In findMatches: 
                // DEBIT: Math.abs(t.amount) -> works if signed or unsigned
                // CREDIT: t.amount -> expects positive?
                // If I pass absolute, CREDIT is positive. DEBIT is positive.
                // If DEBIT is positive, Math.abs is fine.
                // If CREDIT is positive, t.amount is fine.
                // So let's pass absolute amount and rely on TYPE.
                description: item.statement_description,
                category: item.notes,
                status: item.is_matched ? 'conciliado' : 'novo'
            })) || [];

            const matchedTransactions = await ofxService.findMatches(transactionsForService as any);

            // Merge back match info into items
            const mergedItems = data?.map((item: any) => {
                const match = matchedTransactions.find(t => t.id === item.fitid);
                return {
                    ...item,
                    matchType: match?.matchType,
                    matchId: match?.matchId,
                    matchDescription: match?.matchDescription,
                    suggestedCategory: match?.suggestedCategory
                };
            }) || [];

            setItems(mergedItems);
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
            toast({ title: 'Erro', description: 'Erro ao carregar conciliação.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async (item: any) => {
        if (!profile) return;

        try {
            // Construct transaction object for service
            const transaction = {
                id: item.fitid,
                type: item.statement_value >= 0 ? 'CREDIT' : 'DEBIT',
                date: new Date(item.statement_date),
                amount: Math.abs(item.statement_value),
                description: item.statement_description,
                category: item.notes,
                status: item.is_matched ? 'conciliado' : 'novo',
                matchType: item.matchType,
                matchId: item.matchId,
                matchDescription: item.matchDescription
            };

            await ofxService.reconcileTransaction(
                transaction as any,
                item.reconciliation.account_id,
                profile.id
            );

            toast({ title: 'Sucesso', description: 'Item conciliado com sucesso.' });
            loadItems();
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Erro', description: 'Erro ao conciliar: ' + error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por Conta" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Contas</SelectItem>
                            {accounts.filter(a => a.type === 'banco').map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="unmatched">Pendentes</SelectItem>
                            <SelectItem value="matched">Conciliados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={() => setImportModalOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Arquivo OFX
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transações Importadas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Sugestão</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{formatDate(item.statement_date)}</TableCell>
                                    <TableCell>{item.statement_description}</TableCell>
                                    <TableCell>{item.notes || item.suggestedCategory}</TableCell>
                                    <TableCell className={item.statement_value < 0 ? 'text-red-600' : 'text-green-600'}>
                                        {formatCurrency(item.statement_value)}
                                    </TableCell>
                                    <TableCell>
                                        {item.matchDescription ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {item.matchDescription}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.is_matched ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800">Conciliado</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-orange-600 border-orange-600">Pendente</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {!item.is_matched && (
                                            <Button
                                                size="sm"
                                                variant={item.matchId ? "default" : "secondary"}
                                                className={item.matchId ? "bg-green-600 hover:bg-green-700" : ""}
                                                onClick={() => handleReconcile(item)}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                {item.matchId ? 'Confirmar' : 'Conciliar'}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        Nenhuma transação encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OFXImportModal
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
                accounts={accounts}
                onSuccess={() => {
                    loadItems();
                    toast({ title: 'Sucesso', description: 'Importação realizada.' });
                }}
            />
        </div>
    );
}
