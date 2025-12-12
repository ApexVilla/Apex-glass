import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getPendingCreditSales,
  approveCredit,
  denyCredit,
  requestCreditAdjustment,
  getSaleDetails,
  getCreditLogs,
  type PendingCreditSale,
} from '@/services/creditService';
import { CreditAnalysisDialog } from './CreditAnalysisDialog';

export function CreditAnalysisPanel() {
  const { user, company } = useAuth();
  const [sales, setSales] = useState<PendingCreditSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<PendingCreditSale | null>(null);
  const [saleDetailsOpen, setSaleDetailsOpen] = useState(false);
  const [saleDetails, setSaleDetails] = useState<any>(null);
  const [creditLogs, setCreditLogs] = useState<any[]>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny' | 'adjust' | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const currentCompanyId = company?.id;

  useEffect(() => {
    if (currentCompanyId) {
      loadSales();
    }
  }, [currentCompanyId, currentPage]);

  const loadSales = async () => {
    if (!currentCompanyId) {
      console.log('[CreditAnalysisPanel] Company ID não disponível');
      return;
    }

    setLoading(true);
    try {
      console.log(`[CreditAnalysisPanel] Carregando vendas para company: ${currentCompanyId}`);
      const data = await getPendingCreditSales(currentCompanyId);
      console.log(`[CreditAnalysisPanel] Vendas recebidas: ${data.length}`);
      
      // Aplicar filtro de busca
      let filtered = data;
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        filtered = data.filter(
          (sale) =>
            sale.sale_number.toString().includes(searchLower) ||
            sale.customer_name.toLowerCase().includes(searchLower) ||
            sale.payment_method?.toLowerCase().includes(searchLower)
        );
      }

      setTotalCount(filtered.length);
      
      // Paginação
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize;
      const paginated = filtered.slice(from, to);

      setSales(paginated);
    } catch (error: any) {
      console.error('Erro ao carregar vendas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar vendas aguardando análise',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompanyId) {
      loadSales();
    }
  }, [search]);

  const handleViewDetails = async (sale: PendingCreditSale) => {
    setSelectedSale(sale);
    setSaleDetailsOpen(true);
    
    try {
      const details = await getSaleDetails(sale.id);
      setSaleDetails(details);

      const logs = await getCreditLogs(sale.id);
      setCreditLogs(logs);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar detalhes da venda',
        variant: 'destructive',
      });
    }
  };

  const handleAction = (sale: PendingCreditSale, type: 'approve' | 'deny' | 'adjust') => {
    setSelectedSale(sale);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleActionComplete = () => {
    setActionDialogOpen(false);
    setSelectedSale(null);
    setActionType(null);
    loadSales();
  };

  const filteredSales = sales.filter((sale) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      sale.sale_number.toString().includes(searchLower) ||
      sale.customer_name.toLowerCase().includes(searchLower) ||
      sale.payment_method?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Vendas Aguardando Análise de Crédito
          </CardTitle>
          <CardDescription>
            Analise e aprove ou negue crédito para vendas pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Busca */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número da venda, cliente ou forma de pagamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda aguardando análise de crédito
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Limite Disponível</TableHead>
                      <TableHead>Total em Aberto</TableHead>
                      <TableHead>Total Vencido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          #{sale.sale_number}
                        </TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.payment_method || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          {sale.credit_info ? (
                            <span
                              className={
                                sale.credit_info.limit_available < 0
                                  ? 'text-red-600 font-semibold'
                                  : ''
                              }
                            >
                              {formatCurrency(sale.credit_info.limit_available)}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {sale.credit_info
                            ? formatCurrency(sale.credit_info.total_open)
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {sale.credit_info ? (
                            <span className="text-red-600 font-semibold">
                              {formatCurrency(sale.credit_info.total_overdue)}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>{formatDate(sale.created_at)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sale.credit_status === 'pending'
                                ? 'default'
                                : sale.credit_status === 'approved'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {sale.credit_status === 'pending'
                              ? 'Pendente'
                              : sale.credit_status === 'approved'
                              ? 'Aprovado'
                              : 'Negado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sale)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAction(sale, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleAction(sale, 'deny')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Negar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(sale, 'adjust')}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Ajuste
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({totalCount} vendas)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={saleDetailsOpen} onOpenChange={setSaleDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda #{selectedSale?.sale_number}</DialogTitle>
            <DialogDescription>
              Informações completas da venda e histórico de análise de crédito
            </DialogDescription>
          </DialogHeader>

          {saleDetails && (
            <div className="space-y-4">
              {/* Informações da Venda */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Venda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cliente</Label>
                      <p className="font-medium">
                        {(saleDetails.customer as any)?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <p className="font-medium">{formatCurrency(saleDetails.total || 0)}</p>
                    </div>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <p className="font-medium">{saleDetails.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Status de Crédito</Label>
                      <Badge>
                        {saleDetails.credit_status === 'pending'
                          ? 'Pendente'
                          : saleDetails.credit_status === 'approved'
                          ? 'Aprovado'
                          : 'Negado'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens da Venda */}
              {saleDetails.items && saleDetails.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Itens da Venda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto/Serviço</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Preço Unit.</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetails.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.product?.name || 'Produto não encontrado'}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                            <TableCell>{formatCurrency(item.total || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Histórico de Análise */}
              {creditLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Histórico de Análise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {creditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="border rounded-lg p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  log.action === 'approve'
                                    ? 'default'
                                    : log.action === 'deny'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {log.action === 'approve'
                                  ? 'Aprovado'
                                  : log.action === 'deny'
                                  ? 'Negado'
                                  : 'Ajuste Solicitado'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                por {(log.analyzed_by_profile as any)?.full_name || 'N/A'}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-sm">{log.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Ação (Aprovar/Negar/Ajuste) */}
      {selectedSale && actionType && (
        <CreditAnalysisDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          sale={selectedSale}
          actionType={actionType}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  );
}

