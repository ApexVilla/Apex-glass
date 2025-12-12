import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge, getStockStatus } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { Edit, Trash2, Loader2, Package, AlertTriangle, MapPin, Box, ClipboardCheck, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { PickingList } from '@/components/inventory/PickingList';
import { PickingProcess } from '@/components/inventory/PickingProcess';
import { ConferenceList } from '@/components/inventory/ConferenceList';
import { ConferenceProcess } from '@/components/inventory/ConferenceProcess';
import { ProductLabelModal } from '@/components/inventory/labels/ProductLabelModal';

const productTypes = [
  { value: 'windshield', label: 'Para-brisa' },
  { value: 'side_glass', label: 'Vidro Lateral' },
  { value: 'rear_glass', label: 'Vidro Traseiro' },
  { value: 'rubber', label: 'Borracha' },
  { value: 'sensor', label: 'Sensor' },
  { value: 'accessory', label: 'Acessório' },
];

export default function Inventory() {
  const { profile, user, company } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelProduct, setLabelProduct] = useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  // Picking & Conference State
  const [activeTab, setActiveTab] = useState('products');
  const [activePickingId, setActivePickingId] = useState<string | null>(null);
  const [activeConferenceId, setActiveConferenceId] = useState<string | null>(null);
  const [conferenceListKey, setConferenceListKey] = useState(0); // Para forçar recarregamento da lista

  const [formData, setFormData] = useState({
    name: '', type: 'windshield', tipo_item: 'produto', car_model: '', manufacturer_code: '', description: '', brand: '', compatible_vehicles: '',
    has_sensor: false, sensor_count: 0, has_hud: false, has_band: false, has_thermal_complement: false,
    purchase_price: 0, sale_price: 0, wholesale_price: 0, retail_price: 0,
    quantity: 0, min_quantity: 5,
    location_street: '', location_building: '', location_apartment: '',
  });

  useEffect(() => {
    const currentCompanyId = company?.id || profile?.company_id;
    console.log('🔄 Inventory: useEffect disparado', {
      hasProfile: !!profile,
      hasCompany: !!company,
      companyId: currentCompanyId,
      currentPage,
      pageSize,
      search,
      filterType
    });

    if (currentCompanyId) {
      const timer = setTimeout(() => {
        loadProducts();
      }, 100); // Reduzir delay para 100ms
      return () => clearTimeout(timer);
    } else {
      console.warn('⚠️ Inventory: company_id não disponível');
      setLoading(false);
    }
  }, [company?.id, profile?.company_id, currentPage, pageSize, search, filterType]);

  // Função para parsear location do banco para os três campos
  const parseLocation = (location: string | null) => {
    if (!location) return { street: '', building: '', apartment: '' };
    try {
      // Tenta parsear como JSON primeiro
      const parsed = JSON.parse(location);
      return {
        street: parsed.street || parsed.rua || '',
        building: parsed.building || parsed.predio || '',
        apartment: parsed.apartment || parsed.apartamento || ''
      };
    } catch {
      // Se não for JSON, assume formato antigo (texto simples)
      return { street: location, building: '', apartment: '' };
    }
  };

  // Função para construir location para salvar no banco
  const buildLocation = (street: string, building: string, apartment: string) => {
    const parts = [street, building, apartment].filter(Boolean);
    if (parts.length === 0) return null;
    // Salva como JSON para manter estrutura
    return JSON.stringify({ street, building, apartment });
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Obter company_id atual (prioridade: company do contexto > profile.company_id)
      const currentCompanyId = company?.id || profile?.company_id;

      if (!currentCompanyId) {
        console.warn('⚠️ Inventory: company_id não disponível');
        setLoading(false);
        return;
      }

      console.log('🔍 Inventory - Company ID:', currentCompanyId);

      // Primeiro, buscar todos os produtos para debug (apenas da empresa atual)
      const { data: allData, error: allError } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('company_id', currentCompanyId);

      console.log('🔍 Inventory - Total produtos encontrados:', allData?.length || 0);
      console.log('🔍 Inventory - Produtos ativos:', allData?.filter(p => p.is_active === true).length || 0);
      console.log('🔍 Inventory - Produtos inativos:', allData?.filter(p => p.is_active === false).length || 0);
      console.log('🔍 Inventory - Produtos sem is_active:', allData?.filter(p => p.is_active == null).length || 0);

      if (allError) {
        console.error('❌ Inventory - Erro ao buscar todos os produtos:', allError);
      }

      // CRÍTICO: Filtrar explicitamente por company_id para garantir isolamento
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('company_id', currentCompanyId) // Filtro explícito por empresa
        .order('internal_code', { ascending: true, nullsFirst: false });

      // Removido filtro is_active para mostrar todos os produtos
      // Filtros Server-Side
      if (search) {
        // Verifica se é número para busca exata por código interno, senão busca por texto
        if (!isNaN(Number(search))) {
          query = query.or(`name.ilike.%${search}%,internal_code.eq.${search},manufacturer_code.ilike.%${search}%`);
        } else {
          query = query.or(`name.ilike.%${search}%,manufacturer_code.ilike.%${search}%`);
        }
      }

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      // Paginação
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Inventory - Erro na query:', error);
        throw error;
      }

      console.log('✅ Inventory - Produtos retornados na página:', data?.length || 0, 'de', count || 0, 'total');
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('❌ Inventory - Erro ao carregar produtos:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar produtos', variant: 'destructive' });
    } finally { setLoading(false); }
  };



  const loadLastSale = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          sale:sales!inner (
            created_at,
            customer:customers (
              name
            )
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { foreignTable: 'sales', ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLastSale(data);
    } catch (error) {
      console.error('Erro ao carregar última venda:', error);
      setLastSale(null);
    }
  };

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setSelectedProduct(product);
      loadLastSale(product.id);
      const locationData = parseLocation(product.location);
      setFormData({
        name: product.name, type: product.type || 'windshield', tipo_item: product.tipo_item || 'produto', car_model: product.car_model || '', manufacturer_code: product.manufacturer_code || '',
        description: product.description || '', brand: product.brand || '', compatible_vehicles: product.compatible_vehicles || '',
        has_sensor: product.has_sensor, sensor_count: product.sensor_count, has_hud: product.has_hud, has_band: product.has_band, has_thermal_complement: product.has_thermal_complement || false,
        purchase_price: product.purchase_price || 0,
        sale_price: product.sale_price || 0,
        wholesale_price: product.wholesale_price || 0,
        retail_price: product.retail_price || product.sale_price || 0,
        quantity: product.quantity, min_quantity: product.min_quantity,
        location_street: locationData.street,
        location_building: locationData.building,
        location_apartment: locationData.apartment,
      });
    } else {
      setSelectedProduct(null);
      setLastSale(null);
      setFormData({
        name: '', type: 'windshield', tipo_item: 'produto', car_model: '', manufacturer_code: '', description: '', brand: '', compatible_vehicles: '',
        has_sensor: false, sensor_count: 0, has_hud: false, has_band: false, has_thermal_complement: false,
        purchase_price: 0, sale_price: 0, wholesale_price: 0, retail_price: 0,
        quantity: 0, min_quantity: 5,
        location_street: '', location_building: '', location_apartment: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' }); return; }
    setIsSaving(true);
    try {
      // Construir location a partir dos três campos
      const location = buildLocation(
        formData.location_street,
        formData.location_building,
        formData.location_apartment
      );

      // Criar objeto de dados sem os campos temporários de localização
      const { location_street, location_building, location_apartment, ...restFormData } = formData;

      // Remover campos que ainda não existem no banco (serão adicionados após executar o script SQL)
      // TODO: Remover este filtro após executar ADICIONAR-COLUNAS-PRODUCTS.sql no Supabase
      const { tipo_item, car_model, wholesale_price, retail_price, has_thermal_complement, ...baseFormData } = restFormData;

      // Usar company?.id (empresa selecionada) ao invés de profile?.company_id para manter consistência
      const currentCompanyId = company?.id || profile?.company_id;

      console.log('🔍 handleSave - Company ID usado:', currentCompanyId, 'Company name:', company?.name);

      const productData = {
        ...baseFormData,
        company_id: currentCompanyId || null,
        location: location,
      };

      if (selectedProduct) {
        console.log('🔵 Atualizando produto:', selectedProduct.id, productData);
        const { error } = await supabase.from('products').update(productData).eq('id', selectedProduct.id);
        if (error) {
          console.error('❌ Erro ao atualizar produto:', error);
          throw error;
        }

        // Verificar se foi atualizado
        const { data: verifyProduct, error: verifyError } = await supabase
          .from('products')
          .select('*')
          .eq('id', selectedProduct.id)
          .single();

        if (verifyError || !verifyProduct) {
          console.error('❌ Erro ao verificar produto atualizado:', verifyError);
          throw new Error('Produto não foi atualizado corretamente. Recarregue a página.');
        }

        console.log('✅ Produto atualizado com sucesso');
        toast({ title: 'Sucesso', description: 'Produto atualizado' });
      } else {
        console.log('🔵 Inserindo novo produto:', productData);
        // internal_code is auto-generated by trigger (deixar null ou vazio)
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([{ ...productData, internal_code: '' }])
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao inserir produto:', error);
          throw error;
        }

        if (!newProduct || !newProduct.id) {
          console.error('❌ Produto não foi criado corretamente');
          throw new Error('Produto não foi criado. Verifique os dados e tente novamente.');
        }

        // Verificar se foi realmente salvo
        const { data: verifyProduct, error: verifyError } = await supabase
          .from('products')
          .select('*')
          .eq('id', newProduct.id)
          .single();

        if (verifyError || !verifyProduct) {
          console.error('❌ Erro ao verificar produto salvo:', verifyError);
          throw new Error('Produto foi criado mas não foi encontrado. Por favor, recarregue a página.');
        }

        console.log('✅ Produto criado e verificado com sucesso:', newProduct.id);
        toast({ title: 'Sucesso', description: 'Produto cadastrado' });
      }
      setIsDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      console.error('❌ ERRO ao salvar produto:', error);
      console.error('📊 Código:', error.code);
      console.error('📝 Mensagem:', error.message);
      console.error('🔍 Detalhes:', error.details);

      let errorMessage = error.message || 'Erro ao salvar produto';
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
    if (!confirm('Tem certeza?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Produto excluído' }); loadProducts(); }
  };

  const handleOpenLabelModal = (product: any) => {
    setLabelProduct(product);
    setIsLabelModalOpen(true);
  };


  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.internal_code?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity);

  const columns = [
    { key: 'internal_code', header: 'Código', cell: (item: any) => <span className="font-mono text-sm">{item.internal_code}</span> },
    { key: 'name', header: 'Produto', cell: (item: any) => <p className="font-medium">{item.name}</p> },
    { key: 'brand', header: 'Marca', cell: (item: any) => <span className="text-sm">{item.brand || <span className="text-muted-foreground">-</span>}</span> },
    { key: 'type', header: 'Tipo', cell: (item: any) => productTypes.find(t => t.value === item.type)?.label || item.type },
    { key: 'quantity', header: 'Estoque', cell: (item: any) => { const status = getStockStatus(item.quantity, item.min_quantity); return <div className="flex items-center gap-2"><span className="font-medium">{item.quantity}</span><StatusBadge status={status.type} label={status.label} /></div>; } },
    { key: 'sale_price', header: 'Preço', cell: (item: any) => formatCurrency(item.sale_price) },
    { key: 'actions', header: 'Opções', className: 'w-32', cell: (item: any) => <div className="flex gap-1"><Button variant="ghost" size="icon" title="Imprimir Etiqueta" onClick={() => handleOpenLabelModal(item)}><Printer className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></div> },
  ];

  // Render content based on active state
  if (activePickingId) {
    console.log('Inventory: Renderizando PickingProcess com ID:', activePickingId);
    return (
      <PickingProcess
        pickingId={activePickingId}
        onBack={() => {
          console.log('Inventory: Voltar da separação');
          setActivePickingId(null);
        }}
        onFinish={() => {
          console.log('Inventory: Finalizar separação');
          setActivePickingId(null);
          // Recarregar produtos para atualizar estoque
          if (profile?.company_id) {
            loadProducts();
          }
        }}
      />
    );
  }

  if (activeConferenceId) {
    console.log('Inventory: Renderizando ConferenceProcess com ID:', activeConferenceId);
    return (
      <ConferenceProcess
        pickingId={activeConferenceId}
        onBack={() => {
          console.log('Inventory: Voltar da conferência');
          setActiveConferenceId(null);
        }}
        onFinish={() => {
          console.log('Inventory: Finalizar conferência');
          setActiveConferenceId(null);
          // Recarregar produtos para atualizar estoque
          if (profile?.company_id) {
            loadProducts();
            // Forçar recarregamento da lista de conferência
            setConferenceListKey(prev => prev + 1);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque" description="Gerencie seus produtos e separações" action={{ label: 'Novo Produto', onClick: () => handleOpenDialog(), icon: Package }} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Produtos
          </TabsTrigger>
          <TabsTrigger value="picking" className="flex items-center gap-2">
            <Box className="h-4 w-4" /> Separação (Picking)
          </TabsTrigger>
          <TabsTrigger value="conference" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Conferência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {lowStockProducts.length > 0 && <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20"><AlertTriangle className="h-5 w-5 text-warning" /><div><p className="font-medium text-warning">Estoque Baixo</p><p className="text-sm text-muted-foreground">{lowStockProducts.length} produto(s) precisam de reposição</p></div></div>}
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou código..." className="w-full sm:max-w-md" />
            <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{productTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <DataTable columns={columns} data={products} loading={loading} emptyMessage="Nenhum produto encontrado" />

          {/* Paginação */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="5000">5000</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-2">
                Total: {totalCount} produtos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm font-medium">
                Página {currentPage} de {Math.ceil(totalCount / pageSize) || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="picking">
          <PickingList onStartPicking={setActivePickingId} />
        </TabsContent>

        <TabsContent value="conference">
          <ConferenceList key={conferenceListKey} onStartConference={setActiveConferenceId} />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle><DialogDescription>Preencha os dados</DialogDescription></DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Básicos</TabsTrigger>
              <TabsTrigger value="variations">Complementos</TabsTrigger>
              <TabsTrigger value="pricing">Preços</TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Localização
              </TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2"><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tipo de Item *</Label><Select value={formData.tipo_item || 'produto'} onValueChange={(v) => setFormData({ ...formData, tipo_item: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produto">Produto</SelectItem><SelectItem value="servico">Serviço</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Define se será gerada NFe ou NFS-e</p></div>
                <div className="space-y-2"><Label>Marca</Label><Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Ex: Pilkington, Saint-Gobain, AGC..." /></div>
                <div className="space-y-2"><Label>Tipo</Label><Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{productTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2">
                  <Label>Modelo do Carro</Label>
                  <Input
                    value={formData.car_model}
                    onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                    placeholder="Ex: Civic, Corolla, HB20..."
                  />
                </div>
                <div className="space-y-2"><Label>Código Fabricação</Label><Input value={formData.manufacturer_code} onChange={(e) => setFormData({ ...formData, manufacturer_code: e.target.value })} /></div>
                <div className="col-span-2 space-y-2"><Label>Veículos Compatíveis</Label><Textarea value={formData.compatible_vehicles} onChange={(e) => setFormData({ ...formData, compatible_vehicles: e.target.value })} rows={2} /></div>
              </div>

              {/* Seção de Última Venda (Movido para cá) */}
              {selectedProduct && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <ClipboardCheck className="h-4 w-4" />
                    Última Venda
                  </h3>
                  {lastSale ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="font-medium text-sm truncate" title={lastSale.sale?.customer?.name}>{lastSale.sale?.customer?.name || 'Cliente Balcão'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-medium text-sm">{lastSale.sale?.created_at ? formatDate(lastSale.sale.created_at) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Qtd.</p>
                        <p className="font-medium text-sm">{lastSale.quantity}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="variations" className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border"><div><p className="font-medium">Possui Sensor</p></div><Switch checked={formData.has_sensor} onCheckedChange={(c) => setFormData({ ...formData, has_sensor: c })} /></div>
              {formData.has_sensor && <div className="pl-4 space-y-2"><Label>Qtd Sensores</Label><Select value={formData.sensor_count.toString()} onValueChange={(v) => setFormData({ ...formData, sensor_count: parseInt(v) })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent></Select></div>}
              <div className="flex items-center justify-between p-4 rounded-lg border"><div><p className="font-medium">Possui HUD</p></div><Switch checked={formData.has_hud} onCheckedChange={(c) => setFormData({ ...formData, has_hud: c })} /></div>
              <div className="flex items-center justify-between p-4 rounded-lg border"><div><p className="font-medium">Possui Faixa</p></div><Switch checked={formData.has_band} onCheckedChange={(c) => setFormData({ ...formData, has_band: c })} /></div>
              <div className="flex items-center justify-between p-4 rounded-lg border"><div><p className="font-medium">Térmico</p></div><Switch checked={formData.has_thermal_complement} onCheckedChange={(c) => setFormData({ ...formData, has_thermal_complement: c })} /></div>
            </TabsContent>
            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Preço Compra</Label><Input type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Preço Venda (Geral)</Label><Input type="number" step="0.01" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })} placeholder="Preço padrão" /></div>
                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="font-medium mb-3">Tabela de Preços</p>
                </div>
                <div className="space-y-2">
                  <Label>Preço Varejo *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Preço para varejo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Atacado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Preço para atacado"
                  />
                </div>
                <div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" value={formData.min_quantity} onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 5 })} /></div>
              </div>
            </TabsContent>
            <TabsContent value="location" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Rua</Label>
                  <Input
                    value={formData.location_street}
                    onChange={(e) => setFormData({ ...formData, location_street: e.target.value })}
                    placeholder="Ex: Rua A, Corredor Principal..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prédio</Label>
                  <Input
                    value={formData.location_building}
                    onChange={(e) => setFormData({ ...formData, location_building: e.target.value })}
                    placeholder="Ex: Prédio 1, Galpão B..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apartamento</Label>
                  <Input
                    value={formData.location_apartment}
                    onChange={(e) => setFormData({ ...formData, location_apartment: e.target.value })}
                    placeholder="Ex: Apartamento 3, Sala 2..."
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Informe a localização física do produto no estoque para facilitar a localização.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="btn-gradient" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selectedProduct ? 'Salvar' : 'Cadastrar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        product={labelProduct}
      />
    </div>
  );
}
