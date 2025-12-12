import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge, getPaymentStatus } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { FileText, Printer, Plus, ArrowDownCircle, ArrowUpCircle, Edit, Trash2, Loader2 } from 'lucide-react';

type InvoiceType = 'entrada' | 'saida';
type InvoiceStatus = 'pending' | 'paid' | 'cancelled';
type SourceType = 'fornecedor' | 'cliente';

interface Invoice {
  id: string;
  invoice_number: number;
  type: InvoiceType;
  source_type?: SourceType;
  supplier_customer: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export default function Invoices() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'entrada_recebida' | 'nota_emitida' | 'saida'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'entrada' as InvoiceType,
    source_type: 'fornecedor' as SourceType,
    supplier_customer: '',
    description: '',
    amount: 0,
    status: 'pending' as InvoiceStatus,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
  });

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvoices((data as unknown as Invoice[]) || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar notas', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (invoice?: Invoice) => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setFormData({
        type: invoice.type,
        source_type: invoice.source_type || (invoice.type === 'entrada' ? 'fornecedor' : 'cliente'),
        supplier_customer: invoice.supplier_customer,
        description: invoice.description,
        amount: invoice.amount,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
      });
    } else {
      setSelectedInvoice(null);
      setFormData({
        type: 'entrada',
        source_type: 'fornecedor',
        supplier_customer: '',
        description: '',
        amount: 0,
        status: 'pending',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.supplier_customer.trim() || !formData.description.trim()) {
      toast({ title: 'Erro', description: 'Fornecedor/Cliente e Descrição são obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const invoiceData = {
        type: formData.type,
        source_type: formData.source_type,
        supplier_customer: formData.supplier_customer,
        description: formData.description,
        amount: formData.amount,
        status: formData.status,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        company_id: profile?.company_id || null,
      };

      if (selectedInvoice) {
        console.log('🔵 Atualizando nota:', selectedInvoice.id, invoiceData);
        const { error } = await supabase.from('invoices' as any).update(invoiceData).eq('id', selectedInvoice.id);
        if (error) {
          console.error('❌ Erro ao atualizar nota:', error);
          throw error;
        }
        
        // Verificar se foi atualizada
        const { data: verifyInvoice, error: verifyError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', selectedInvoice.id)
          .single();
        
        if (verifyError || !verifyInvoice) {
          console.error('❌ Erro ao verificar nota atualizada:', verifyError);
          throw new Error('Nota não foi atualizada corretamente. Recarregue a página.');
        }
        
        console.log('✅ Nota atualizada com sucesso');
        toast({ title: 'Sucesso', description: 'Nota atualizada' });
      } else {
        console.log('🔵 Inserindo nova nota:', invoiceData);
        const { data: newInvoice, error } = await supabase
          .from('invoices' as any)
          .insert([invoiceData])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erro ao inserir nota:', error);
          throw error;
        }
        
        if (!newInvoice || !newInvoice.id) {
          console.error('❌ Nota não foi criada corretamente');
          throw new Error('Nota não foi criada. Verifique os dados e tente novamente.');
        }
        
        // Verificar se foi realmente salva
        const { data: verifyInvoice, error: verifyError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', newInvoice.id)
          .single();
        
        if (verifyError || !verifyInvoice) {
          console.error('❌ Erro ao verificar nota salva:', verifyError);
          throw new Error('Nota foi criada mas não foi encontrada. Por favor, recarregue a página.');
        }
        
        console.log('✅ Nota criada e verificada com sucesso:', newInvoice.id);
        toast({ title: 'Sucesso', description: 'Nota cadastrada' });
      }
      setIsDialogOpen(false);
      loadInvoices();
    } catch (error: any) {
      console.error('❌ ERRO ao salvar nota:', error);
      console.error('📊 Código:', error.code);
      console.error('📝 Mensagem:', error.message);
      console.error('🔍 Detalhes:', error.details);
      
      let errorMessage = error.message || 'Erro ao salvar nota';
      if (error.code === 'PGRST116') {
        errorMessage = 'Nenhuma linha foi afetada. Verifique se você tem permissão para salvar.';
      } else if (error.code === '42501') {
        errorMessage = 'Você não tem permissão para realizar esta operação.';
      } else if (error.details) {
        errorMessage += ` - ${error.details}`;
      }
      
      toast({ 
        title: 'Erro ao Salvar', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 5000
      });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    try {
      const { error } = await supabase.from('invoices' as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Nota excluída' });
      loadInvoices();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number?.toString().includes(search) || 
      inv.supplier_customer?.toLowerCase().includes(search.toLowerCase()) ||
      inv.description?.toLowerCase().includes(search.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'entrada_recebida') {
      matchesTab = inv.type === 'entrada' && (inv.source_type === 'fornecedor' || !inv.source_type);
    } else if (activeTab === 'nota_emitida') {
      matchesTab = inv.type === 'saida' && (inv.source_type === 'cliente' || !inv.source_type);
    } else if (activeTab === 'saida') {
      matchesTab = inv.type === 'saida';
    } else if (activeTab === 'all') {
      matchesTab = true;
    }
    
    return matchesSearch && matchesTab;
  });

  const columns = [
    { 
      key: 'invoice_number', 
      header: 'Nota #', 
      cell: (item: Invoice) => (
        <div className="flex items-center gap-2">
          {item.type === 'entrada' ? (
            <ArrowDownCircle className="h-4 w-4 text-success" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 text-primary" />
          )}
          <span className="font-mono font-semibold">#{item.invoice_number}</span>
        </div>
      ) 
    },
    { 
      key: 'type', 
      header: 'Tipo', 
      cell: (item: Invoice) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.type === 'entrada' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
        }`}>
          {item.type === 'entrada' ? 'Entrada' : 'Saída'}
        </span>
      )
    },
    { 
      key: 'source_type', 
      header: 'Origem', 
      cell: (item: Invoice) => {
        const sourceType = item.source_type || (item.type === 'entrada' ? 'fornecedor' : 'cliente');
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            sourceType === 'fornecedor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          }`}>
            {sourceType === 'fornecedor' ? 'Recebida' : 'Emitida'}
          </span>
        );
      }
    },
    { key: 'supplier_customer', header: 'Fornecedor/Cliente', cell: (item: Invoice) => item.supplier_customer },
    { key: 'description', header: 'Descrição', cell: (item: Invoice) => <span className="truncate max-w-[200px] block">{item.description}</span> },
    { key: 'amount', header: 'Valor', cell: (item: Invoice) => <span className="font-semibold">{formatCurrency(item.amount)}</span> },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (item: Invoice) => { 
        const status = getPaymentStatus(item.status); 
        return <StatusBadge status={status.type} label={status.label} />; 
      } 
    },
    { key: 'issue_date', header: 'Emissão', cell: (item: Invoice) => formatDate(item.issue_date) },
    { 
      key: 'actions', 
      header: '', 
      className: 'w-32', 
      cell: (item: Invoice) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) 
    },
  ];

  const totalEntradaRecebida = invoices.filter(i => i.type === 'entrada' && (i.source_type === 'fornecedor' || !i.source_type)).reduce((sum, i) => sum + Number(i.amount), 0);
  const totalNotaEmitida = invoices.filter(i => i.type === 'saida' && (i.source_type === 'cliente' || !i.source_type)).reduce((sum, i) => sum + Number(i.amount), 0);
  const totalSaida = invoices.filter(i => i.type === 'saida').reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notas Fiscais" 
        description="Gerencie notas de entrada e saída" 
        action={{ label: 'Nova Nota', onClick: () => handleOpenDialog(), icon: Plus }}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <ArrowDownCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Entradas Recebidas</p>
            <p className="text-xl font-bold text-success">{formatCurrency(totalEntradaRecebida)}</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <ArrowUpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Notas Emitidas</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalNotaEmitida)}</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <ArrowUpCircle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Saídas</p>
            <p className="text-xl font-bold text-warning">{formatCurrency(totalSaida)}</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-info/10">
            <FileText className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Notas</p>
            <p className="text-xl font-bold">{invoices.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="entrada_recebida">Entradas Recebidas</TabsTrigger>
            <TabsTrigger value="nota_emitida">Notas Emitidas</TabsTrigger>
            <TabsTrigger value="saida">Saídas</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número, fornecedor ou descrição..." className="w-full sm:max-w-md" />
      </div>

      <DataTable columns={columns} data={filteredInvoices} loading={loading} emptyMessage="Nenhuma nota encontrada" />

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInvoice ? 'Editar Nota' : 'Nova Nota Fiscal'}</DialogTitle>
            <DialogDescription>Preencha os dados da nota</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.type} onValueChange={(v) => {
                const newType = v as InvoiceType;
                const newSourceType = newType === 'entrada' ? 'fornecedor' : 'cliente';
                setFormData({ ...formData, type: newType, source_type: newSourceType });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-success" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-primary" />
                      Saída
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem *</Label>
              <Select 
                value={formData.source_type} 
                onValueChange={(v) => setFormData({ ...formData, source_type: v as SourceType })}
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor (Recebida)</SelectItem>
                  <SelectItem value="cliente">Cliente (Emitida)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.type === 'entrada' 
                  ? 'Nota recebida de fornecedor' 
                  : 'Nota emitida para cliente'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as InvoiceStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{formData.type === 'entrada' ? 'Fornecedor *' : 'Cliente *'}</Label>
              <Input 
                value={formData.supplier_customer} 
                onChange={(e) => setFormData({ ...formData, supplier_customer: e.target.value })} 
                placeholder={formData.type === 'entrada' ? 'Nome do fornecedor' : 'Nome do cliente'}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Descrição *</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição da nota" />
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
            </div>

            <div className="space-y-2">
              <Label>Data de Emissão</Label>
              <Input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="btn-gradient" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedInvoice ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
