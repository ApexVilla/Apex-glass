import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { Search, Loader2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BudgetSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (sale: any) => void;
    onGenerateMultiple?: (sales: any[]) => Promise<void>;
}

export function BudgetSelectionModal({ open, onOpenChange, onSelect, onGenerateMultiple }: BudgetSelectionModalProps) {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (open) {
            loadSales();
        }
    }, [open]);

    const loadSales = async () => {
        setLoading(true);
        try {
            // Buscar vendas que podem gerar nota fiscal de saída
            // Filtrar apenas vendas com itens e que não foram canceladas
            let query = supabase
                .from('sales')
                .select(`
                    *,
                    customer:customers(name, cpf_cnpj, address, city, state, zip_code),
                    items:sale_items(
                        *,
                        product:products(*)
                    )
                `)
                .neq('payment_status', 'cancelled')
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            
            // Filtrar apenas vendas que têm itens
            const salesWithItems = (data || []).filter(sale => 
                sale.items && sale.items.length > 0
            );
            
            setSales(salesWithItems);
        } catch (error) {
            console.error('Error loading sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = sales.filter(s =>
        s.sale_number?.toString().includes(search) ||
        s.customer?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleSelect = (saleId: string) => {
        const newSelected = new Set(selectedSales);
        if (newSelected.has(saleId)) {
            newSelected.delete(saleId);
        } else {
            newSelected.add(saleId);
        }
        setSelectedSales(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedSales.size === filteredSales.length) {
            setSelectedSales(new Set());
        } else {
            setSelectedSales(new Set(filteredSales.map(s => s.id)));
        }
    };

    const handleGenerateNF = async () => {
        if (selectedSales.size === 0) {
            toast({
                title: "Atenção",
                description: "Selecione pelo menos um orçamento para gerar a nota fiscal.",
                variant: "destructive"
            });
            return;
        }

        if (onGenerateMultiple) {
            setIsGenerating(true);
            try {
                const selectedSalesData = filteredSales.filter(s => selectedSales.has(s.id));
                await onGenerateMultiple(selectedSalesData);
                setSelectedSales(new Set());
                onOpenChange(false);
            } catch (error) {
                console.error('Error generating invoices:', error);
            } finally {
                setIsGenerating(false);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Selecionar Orçamentos de Venda</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Selecione um ou mais orçamentos para gerar notas fiscais de saída automaticamente
                    </p>
                </DialogHeader>

                <div className="flex items-center gap-2 py-4">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por número ou cliente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={filteredSales.length > 0 && selectedSales.size === filteredSales.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Número</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Itens</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredSales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhum orçamento encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSales.map((sale) => (
                                    <TableRow 
                                        key={sale.id} 
                                        className={`hover:bg-muted/50 cursor-pointer ${selectedSales.has(sale.id) ? 'bg-primary/5' : ''}`}
                                        onClick={() => handleToggleSelect(sale.id)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedSales.has(sale.id)}
                                                onCheckedChange={() => handleToggleSelect(sale.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono font-semibold">#{sale.sale_number}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{sale.customer?.name || 'Consumidor Final'}</p>
                                                {sale.customer?.cpf_cnpj && (
                                                    <p className="text-xs text-muted-foreground">{sale.customer.cpf_cnpj}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(sale.created_at)}</TableCell>
                                        <TableCell className="font-semibold">{formatCurrency(sale.total || 0)}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {sale.payment_status || 'Pendente'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {sale.items?.length || 0} item(ns)
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                        {selectedSales.size > 0 && (
                            <span>{selectedSales.size} orçamento(s) selecionado(s)</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        {onGenerateMultiple && (
                            <Button 
                                onClick={handleGenerateNF} 
                                disabled={selectedSales.size === 0 || isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Gerar NF ({selectedSales.size})
                                    </>
                                )}
                            </Button>
                        )}
                        {!onGenerateMultiple && (
                            <Button 
                                onClick={() => {
                                    if (selectedSales.size === 1) {
                                        const selected = filteredSales.find(s => selectedSales.has(s.id));
                                        if (selected) onSelect(selected);
                                    } else {
                                        toast({
                                            title: "Atenção",
                                            description: "Selecione apenas um orçamento para esta opção.",
                                            variant: "destructive"
                                        });
                                    }
                                }}
                                disabled={selectedSales.size !== 1}
                            >
                                Gerar Nota Manual
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
