import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge, getStockStatus } from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { Package, Search, Eye, CheckCircle, XCircle, Cpu, Sun, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

const productTypes = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'windshield', label: 'Para-brisa' },
  { value: 'side_glass', label: 'Vidro Lateral' },
  { value: 'rear_glass', label: 'Vidro Traseiro' },
  { value: 'rubber', label: 'Borracha' },
  { value: 'sensor', label: 'Sensor' },
  { value: 'accessory', label: 'Acessório' },
];

interface Product {
  id: string;
  internal_code: string;
  name: string;
  type: string;
  brand: string | null;
  quantity: number;
  min_quantity: number;
  sale_price: number;
  wholesale_price?: number;
  retail_price?: number;
  has_sensor: boolean;
  sensor_count: number;
  has_hud: boolean;
  has_band: boolean;
  compatible_vehicles: string | null;
  location: string | null;
  description: string | null;
  category?: { name: string } | null;
}

export default function ProductConsultation() {
  const { profile, company } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Função para formatar localização
  const formatLocation = (location: string | null) => {
    if (!location) return null;
    try {
      const parsed = JSON.parse(location);
      const parts = [];
      if (parsed.street) parts.push(`Rua: ${parsed.street}`);
      if (parsed.building) parts.push(`Prédio: ${parsed.building}`);
      if (parsed.apartment) parts.push(`Apartamento: ${parsed.apartment}`);
      return parts.length > 0 ? parts.join(' | ') : location;
    } catch {
      return location;
    }
  };

  useEffect(() => {
    const currentCompanyId = company?.id || profile?.company_id;
    if (currentCompanyId) {
      loadProducts();
    }
  }, [company?.id, profile?.company_id]);

  const loadProducts = async () => {
    try {
      // Obter company_id atual (prioridade: company do contexto > profile.company_id)
      const currentCompanyId = company?.id || profile?.company_id;
      
      if (!currentCompanyId) {
        console.warn('⚠️ ProductConsultation: company_id não disponível');
        setLoading(false);
        return;
      }
      
      console.log('🔍 ProductConsultation - Company ID:', currentCompanyId);
      
      // Primeiro, buscar todos os produtos (sem filtro is_active) para debug - APENAS DA EMPRESA ATUAL
      const { data: allData, error: allError } = await supabase
        .from('products')
        .select('*, category:product_categories(name)')
        .eq('company_id', currentCompanyId) // Filtro explícito por empresa
        .order('name');
      
      console.log('🔍 ProductConsultation - Total produtos encontrados:', allData?.length || 0);
      console.log('🔍 ProductConsultation - Produtos ativos:', allData?.filter(p => p.is_active === true).length || 0);
      console.log('🔍 ProductConsultation - Produtos inativos:', allData?.filter(p => p.is_active === false).length || 0);
      console.log('🔍 ProductConsultation - Produtos sem is_active:', allData?.filter(p => p.is_active == null).length || 0);
      
      if (allError) {
        console.error('❌ ProductConsultation - Erro ao buscar produtos:', allError);
        throw allError;
      }
      
      // Agora buscar apenas produtos ativos (ou todos se is_active for null/true) - APENAS DA EMPRESA ATUAL
      const { data, error } = await supabase
        .from('products')
        .select('*, category:product_categories(name)')
        .eq('company_id', currentCompanyId) // Filtro explícito por empresa
        .or('is_active.eq.true,is_active.is.null')
        .order('name');
      
      // Se a query acima falhar, tentar buscar todos e filtrar depois
      if (error && error.code === 'PGRST116') {
        const { data: allProducts, error: allError } = await supabase
          .from('products')
          .select('*, category:product_categories(name)')
          .eq('company_id', currentCompanyId) // Filtro explícito por empresa
          .order('name');
        
        if (!allError && allProducts) {
          // Filtrar client-side: produtos ativos ou sem is_active definido
          const filtered = allProducts.filter(p => p.is_active === true || p.is_active == null);
          setProducts(filtered);
          return;
        }
      }
      
      if (error) {
        console.error('❌ ProductConsultation - Erro ao filtrar produtos:', error);
        throw error;
      }
      
      console.log('✅ ProductConsultation - Produtos retornados:', data?.length || 0);
      setProducts(data || []);
    } catch (error) {
      console.error('❌ ProductConsultation - Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.internal_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.compatible_vehicles?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesStock = filterStock === 'all' || 
      (filterStock === 'available' && p.quantity > 0) ||
      (filterStock === 'low' && p.quantity <= p.min_quantity && p.quantity > 0) ||
      (filterStock === 'out' && p.quantity === 0);
    return matchesSearch && matchesType && matchesStock;
  });

  const getTypeLabel = (type: string) => productTypes.find(t => t.value === type)?.label || type;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Consulta de Produtos" description="Consulte a disponibilidade de produtos" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Consulta de Produtos" description="Consulte a disponibilidade de produtos no estoque" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Produtos</p>
                <p className="text-xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
                <p className="text-xl font-bold">{products.filter(p => p.quantity > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Package className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estoque Baixo</p>
                <p className="text-xl font-bold">{products.filter(p => p.quantity <= p.min_quantity && p.quantity > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem Estoque</p>
                <p className="text-xl font-bold">{products.filter(p => p.quantity === 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Buscar por nome, código, marca ou veículo..." 
          className="w-full sm:max-w-md" 
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStock} onValueChange={setFilterStock}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="low">Estoque Baixo</SelectItem>
            <SelectItem value="out">Sem Estoque</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priceType} onValueChange={(value: 'retail' | 'wholesale') => setPriceType(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tabela de Preço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">Varejo</SelectItem>
            <SelectItem value="wholesale">Atacado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.quantity, product.min_quantity);
            return (
              <Card 
                key={product.id} 
                className="card-elevated hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-mono text-muted-foreground">{product.internal_code}</span>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                      {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
                    </div>
                    <StatusBadge status={stockStatus.type} label={stockStatus.label} />
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {getTypeLabel(product.type)}
                    </span>
                    {product.has_sensor && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> {product.sensor_count} sensor{product.sensor_count > 1 ? 'es' : ''}
                      </span>
                    )}
                    {product.has_hud && (
                      <span className="text-xs px-2 py-1 rounded-full bg-info/10 text-info flex items-center gap-1">
                        <Sun className="h-3 w-3" /> HUD
                      </span>
                    )}
                    {product.has_band && (
                      <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Faixa
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">Estoque</p>
                      <p className={`text-2xl font-bold ${product.quantity === 0 ? 'text-destructive' : product.quantity <= product.min_quantity ? 'text-warning' : 'text-success'}`}>
                        {product.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Preço {priceType === 'retail' ? 'Varejo' : 'Atacado'}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          priceType === 'retail' 
                            ? (product.retail_price || product.sale_price || 0)
                            : (product.wholesale_price || product.sale_price || 0)
                        )}
                      </p>
                    </div>
                  </div>

                  {product.location && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      📍 {formatLocation(product.location)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Detalhes do Produto
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-mono text-muted-foreground">{selectedProduct.internal_code}</span>
                  <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                  {selectedProduct.brand && <p className="text-muted-foreground">{selectedProduct.brand}</p>}
                </div>
                <StatusBadge status={getStockStatus(selectedProduct.quantity, selectedProduct.min_quantity).type} label={getStockStatus(selectedProduct.quantity, selectedProduct.min_quantity).label} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{getTypeLabel(selectedProduct.type)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedProduct.category?.name || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Quantidade em Estoque</p>
                  <p className={`text-2xl font-bold ${selectedProduct.quantity === 0 ? 'text-destructive' : 'text-success'}`}>
                    {selectedProduct.quantity}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-muted-foreground mb-1">Preço Varejo</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedProduct.retail_price || selectedProduct.sale_price || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground mb-1">Preço Atacado</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedProduct.wholesale_price || selectedProduct.sale_price || 0)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedProduct.has_sensor && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
                    <Cpu className="h-4 w-4" /> Com Sensor ({selectedProduct.sensor_count})
                  </span>
                )}
                {selectedProduct.has_hud && (
                  <span className="px-3 py-1 rounded-full bg-info/10 text-info text-sm flex items-center gap-1">
                    <Sun className="h-4 w-4" /> Com HUD
                  </span>
                )}
                {selectedProduct.has_band && (
                  <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-sm flex items-center gap-1">
                    <Layers className="h-4 w-4" /> Com Faixa
                  </span>
                )}
              </div>

              {selectedProduct.compatible_vehicles && (
                <div>
                  <p className="text-sm font-medium mb-1">Veículos Compatíveis</p>
                  <p className="text-sm text-muted-foreground">{selectedProduct.compatible_vehicles}</p>
                </div>
              )}

              {selectedProduct.location && (
                <div>
                  <p className="text-sm font-medium mb-1">Localização no Estoque</p>
                  <p className="text-sm text-muted-foreground">📍 {formatLocation(selectedProduct.location)}</p>
                </div>
              )}

              {selectedProduct.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Descrição</p>
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
