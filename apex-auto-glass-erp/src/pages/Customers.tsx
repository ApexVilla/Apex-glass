import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatPhone, formatCPFCNPJ, formatCurrency } from '@/lib/format';
import { Edit, Trash2, Loader2, Users, Car, DollarSign, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAddressByCep } from '@/services/viacep';

export default function Customers() {
  const { profile, company } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [pendingVehicles, setPendingVehicles] = useState<any[]>([]); // Veículos temporários antes de salvar o cliente
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryCustomer, setSummaryCustomer] = useState<any>(null);
  const [loadingCep, setLoadingCep] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf_cnpj: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    // Financial data
    credit_limit: 0,
    payment_terms: 'avista',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    pix_key: '',
  });

  const [vehicleData, setVehicleData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    chassis: '',
  });

  // Usar company do contexto (que já considera override para master users)
  const currentCompanyId = company?.id || profile?.company_id;

  useEffect(() => {
    if (currentCompanyId) {
      loadCustomers();
    }
  }, [currentCompanyId]);

  // Debounce para busca - aguarda 300ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (currentCompanyId) {
      loadCustomers();
    }
  }, [searchDebounced, currentPage, pageSize]);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      // Usar company do contexto (já considera override para master users)
      const activeCompanyId = company?.id || profile?.company_id;

      console.log('🔍 Customers - Company ID:', activeCompanyId);
      console.log('🔍 Customers - Company name:', company?.name);
      console.log('🔍 Customers - Profile company_id:', profile?.company_id);

      if (!activeCompanyId) {
        console.warn('⚠️ Customers: company_id não disponível');
        setCustomers([]);
        setLoading(false);
        return;
      }

      // 1. Carregar clientes com paginação e filtros
      let customersQuery = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // Filtrar pela empresa ativa (que já considera override para master)
      customersQuery = customersQuery.eq('company_id', activeCompanyId);
      
      console.log('🔍 Customers - Query filtrada por company_id:', activeCompanyId);

      // Filtro de busca
      if (searchDebounced) {
        const term = searchDebounced.trim();
        // Busca simples por nome, email, cpf ou cidade
        customersQuery = customersQuery.or(`name.ilike.%${term}%,email.ilike.%${term}%,cpf_cnpj.ilike.%${term}%,city.ilike.%${term}%`);
      }

      // Paginação
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: customersData, error: customersError, count } = await customersQuery
        .order('name', { ascending: true })
        .range(from, to);

      if (customersError) {
        console.error('❌ Customers - Erro na query:', customersError);
        throw customersError;
      }

      console.log('✅ Customers - Clientes encontrados:', customersData?.length || 0, 'de', count || 0, 'total');
      console.log('✅ Customers - Company IDs dos clientes:', customersData?.map(c => ({ id: c.id, name: c.name, company_id: c.company_id })));

      setTotalCount(count || 0);

      // 2. Carregar veículos APENAS dos clientes carregados
      if (customersData && customersData.length > 0) {
        const customerIds = customersData.map(c => c.id);

        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('customer_vehicles')
          .select('id, customer_id, plate, brand, model')
          .in('customer_id', customerIds);

        if (vehiclesError) console.warn('Erro ao carregar veículos:', vehiclesError);

        // 3. Combinar dados
        const customersWithVehicles = customersData.map(customer => {
          const customerVehicles = vehiclesData?.filter(v => v.customer_id === customer.id) || [];
          return {
            ...customer,
            customer_vehicles: customerVehicles
          };
        });

        setCustomers(customersWithVehicles);
      } else {
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar clientes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async (customerId: string) => {
    const { data } = await supabase
      .from('customer_vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('plate');
    setVehicles(data || []);
  };

  const handleRowClick = (customer: any) => {
    setSummaryCustomer(customer);
    setIsSummaryOpen(true);
  };

  const handleOpenDialog = (customer?: any) => {
    try {
      if (customer) {
        setSelectedCustomer(customer);
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          cpf_cnpj: customer.cpf_cnpj || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          zip_code: customer.zip_code || '',
          notes: customer.notes || '',
          credit_limit: customer.credit_limit || 0,
          payment_terms: customer.payment_terms || 'avista',
          bank_name: customer.bank_name || '',
          bank_agency: customer.bank_agency || '',
          bank_account: customer.bank_account || '',
          pix_key: customer.pix_key || '',
        });
        if (customer.id) {
          loadVehicles(customer.id).catch((error) => {
            console.error('Erro ao carregar veículos:', error);
            toast({ title: 'Aviso', description: 'Erro ao carregar veículos', variant: 'destructive' });
          });
        }
      } else {
        setSelectedCustomer(null);
        setFormData({
          name: '', phone: '', email: '', cpf_cnpj: '', address: '', city: '', state: '', zip_code: '', notes: '',
          credit_limit: 0, payment_terms: 'avista', bank_name: '', bank_agency: '', bank_account: '', pix_key: ''
        });
        setVehicles([]);
        setPendingVehicles([]); // Limpar veículos pendentes ao abrir novo cliente
      }
      setVehicleData({ plate: '', brand: '', model: '', year: '', color: '', chassis: '' });
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao abrir diálogo:', error);
      toast({ title: 'Erro', description: 'Erro ao abrir formulário', variant: 'destructive' });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Limpar estado quando fechar o diálogo
    setSelectedCustomer(null);
    setVehicles([]);
    setPendingVehicles([]);
    setVehicleData({ plate: '', brand: '', model: '', year: '', color: '', chassis: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', selectedCustomer.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso' });
      } else {
        const customerData = {
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          cpf_cnpj: formData.cpf_cnpj || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          notes: formData.notes || null,
          credit_limit: formData.credit_limit || 0,
          payment_terms: formData.payment_terms || 'avista',
          bank_name: formData.bank_name || null,
          bank_agency: formData.bank_agency || null,
          bank_account: formData.bank_account || null,
          pix_key: formData.pix_key || null,
          company_id: company?.id || profile?.company_id || null
        };

        console.log('🔵 Inserindo cliente no Supabase...', { name: customerData.name, company_id: customerData.company_id });

        const { data: insertedData, error: insertError } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao inserir cliente:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          throw insertError;
        }

        if (!insertedData || !insertedData.id) {
          throw new Error('Cliente não foi inserido corretamente');
        }

        console.log('✅ Cliente inserido com sucesso:', insertedData.id);

        // Salvar veículos pendentes se houver
        if (pendingVehicles.length > 0) {
          try {
            const vehiclesToInsert = pendingVehicles.map(v => ({
              plate: v.plate,
              brand: v.brand || null,
              model: v.model || null,
              year: v.year || null,
              color: v.color || null,
              chassis: v.chassis || null,
              customer_id: insertedData.id,
              company_id: company?.id || profile?.company_id,
            }));

            const { error: vehiclesError } = await supabase
              .from('customer_vehicles')
              .insert(vehiclesToInsert);

            if (vehiclesError) {
              console.error('Erro ao salvar veículos:', vehiclesError);
              toast({
                title: 'Aviso',
                description: 'Cliente cadastrado, mas alguns veículos não puderam ser salvos. Você pode adicioná-los agora.',
                variant: 'default'
              });
            } else {
              toast({
                title: 'Sucesso',
                description: `Cliente cadastrado com sucesso. ${pendingVehicles.length} veículo(s) adicionado(s).`
              });
              setPendingVehicles([]); // Limpar veículos pendentes
            }
          } catch (error) {
            console.error('Erro ao salvar veículos:', error);
          }
        } else {
          toast({ title: 'Sucesso', description: 'Cliente cadastrado com sucesso. Você pode adicionar veículos agora.' });
        }

        // Atualizar selectedCustomer com o cliente recém-criado
        setSelectedCustomer(insertedData);

        // Recarregar clientes do banco (mantém diálogo aberto)
        await loadCustomers();

        // Carregar veículos do cliente recém-criado
        await loadVehicles(insertedData.id);
      }
    } catch (error: any) {
      console.error('❌ ERRO COMPLETO ao salvar cliente:', error);
      console.error('📊 Stack trace:', error.stack);
      console.error('📋 Código do erro:', error.code);
      console.error('📝 Mensagem:', error.message);
      console.error('🔍 Detalhes:', error.details);
      console.error('💡 Hint:', error.hint);
      console.error('👤 Profile:', profile);
      console.error('🏢 Company ID:', company?.id || profile?.company_id);

      let errorMessage = 'Erro ao salvar cliente';
      let errorDetails = '';

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.code) {
        errorDetails = `Código: ${error.code}`;
      }

      // Mensagens mais amigáveis para erros comuns
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('new row violates row-level security')) {
        errorMessage = '❌ SEM PERMISSÃO: Você não tem permissão para criar clientes.';
        errorDetails = 'Verifique se você está logado corretamente e se sua conta tem permissões adequadas.';
      } else if (error.code === '23503' || error.message?.includes('foreign key')) {
        errorMessage = '❌ COMPANY ID INVÁLIDO: O ID da empresa não foi encontrado.';
        errorDetails = 'Faça logout e login novamente para atualizar suas credenciais.';
      } else if (error.message?.includes('RLS') || error.message?.includes('row-level security')) {
        errorMessage = '❌ ERRO DE PERMISSÃO RLS: Política de segurança bloqueou a operação.';
        errorDetails = 'Verifique se você tem acesso à empresa e se as políticas RLS estão configuradas corretamente.';
      } else if (error.code === 'PGRST116' || error.message?.includes('The result contains 0 rows')) {
        errorMessage = '⚠️ Cliente não foi encontrado após inserção.';
        errorDetails = 'O cliente pode ter sido inserido, mas não está visível devido a políticas RLS.';
      } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
        errorMessage = '❌ DADOS DUPLICADOS: Já existe um cliente com esses dados.';
        errorDetails = 'Verifique se o CPF/CNPJ ou email já está cadastrado.';
      }

      // Mostrar toast com detalhes
      toast({
        title: errorMessage,
        description: errorDetails || `Erro: ${error.code || 'Desconhecido'}`,
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!vehicleData.plate.trim()) {
      toast({ title: 'Erro', description: 'Placa é obrigatória', variant: 'destructive' });
      return;
    }

    // Se o cliente já foi salvo, adicionar diretamente ao banco
    if (selectedCustomer && selectedCustomer.id) {
      try {
        const { error } = await supabase.from('customer_vehicles').insert([{
          ...vehicleData,
          year: vehicleData.year ? parseInt(vehicleData.year) : null,
          customer_id: selectedCustomer.id,
          company_id: company?.id || profile?.company_id,
        }]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Veículo adicionado' });
        setVehicleData({ plate: '', brand: '', model: '', year: '', color: '', chassis: '' });
        await loadVehicles(selectedCustomer.id);
      } catch (error: any) {
        console.error('Erro ao adicionar veículo:', error);
        toast({ title: 'Erro', description: error.message || 'Erro ao adicionar veículo', variant: 'destructive' });
      }
    } else {
      // Se o cliente ainda não foi salvo, adicionar à lista temporária
      const newVehicle = {
        ...vehicleData,
        year: vehicleData.year ? parseInt(vehicleData.year) : null,
        id: `temp-${Date.now()}`, // ID temporário
      };
      setPendingVehicles([...pendingVehicles, newVehicle]);
      toast({ title: 'Sucesso', description: 'Veículo adicionado. Será salvo quando o cliente for cadastrado.' });
      setVehicleData({ plate: '', brand: '', model: '', year: '', color: '', chassis: '' });
    }
  };

  const handleRemovePendingVehicle = (index: number) => {
    setPendingVehicles(pendingVehicles.filter((_, i) => i !== index));
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Excluir este veículo?')) return;
    try {
      const { error } = await supabase.from('customer_vehicles').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Veículo excluído' });
      loadVehicles(selectedCustomer.id);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Cliente excluído com sucesso' });
      loadCustomers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, zip_code: e.target.value });

    if (cep.length === 8) {
      setLoadingCep(true);
      const address = await fetchAddressByCep(cep);
      setLoadingCep(false);

      if (address) {
        setFormData(prev => ({
          ...prev,
          address: address.logradouro,
          city: address.localidade,
          state: address.uf,
          // Mantém outros campos
        }));
        toast({ title: 'Endereço encontrado', description: `${address.logradouro}, ${address.localidade} - ${address.uf}` });
      } else {
        toast({ title: 'Erro', description: 'CEP não encontrado', variant: 'destructive' });
      }
    }
  };

  // Removido useMemo complexo em favor da paginação server-side
  const filteredCustomers = customers;

  const columns = [
    { key: 'code', header: 'Código', cell: (item: any) => <span className="font-mono text-sm font-medium">{item.code || '-'}</span> },
    { key: 'name', header: 'Nome', cell: (item: any) => <span className="font-medium">{item.name}</span> },
    { key: 'phone', header: 'Telefone', cell: (item: any) => item.phone ? formatPhone(item.phone) : '-' },
    { key: 'email', header: 'Email', cell: (item: any) => item.email || '-' },
    { key: 'cpf_cnpj', header: 'CPF/CNPJ', cell: (item: any) => item.cpf_cnpj ? formatCPFCNPJ(item.cpf_cnpj) : '-' },
    { key: 'credit_limit', header: 'Limite', cell: (item: any) => item.credit_limit ? formatCurrency(item.credit_limit) : '-' },
    { key: 'city', header: 'Cidade', cell: (item: any) => item.city || '-' },
    {
      key: 'actions', header: 'Opções', className: 'w-24',
      cell: (item: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                handleOpenDialog(item);
              } catch (error) {
                console.error('Erro ao abrir diálogo:', error);
                toast({ title: 'Erro', description: 'Erro ao abrir formulário', variant: 'destructive' });
              }
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                handleDelete(item.id);
              } catch (error) {
                console.error('Erro ao deletar:', error);
                toast({ title: 'Erro', description: 'Erro ao excluir cliente', variant: 'destructive' });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Gerencie seus clientes" action={{ label: 'Novo Cliente', onClick: () => handleOpenDialog(), icon: Users }} />
      <div className="relative max-w-md">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            // Se limpar a busca, limpar também o debounced imediatamente
            if (!value.trim()) {
              setSearchDebounced('');
            }
          }}
          placeholder={search.trim().length > 0 && search.trim().length < 3
            ? "Digite pelo menos 3 letras para buscar..."
            : "Buscar por nome, telefone, email, CPF/CNPJ, cidade ou veículo..."}
          className="w-full"
        />
        {search.trim().length > 0 && search.trim().length < 3 && (
          <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
            Digite mais {3 - search.trim().length} letra(s) para buscar...
          </p>
        )}
        {search.trim().length >= 3 && filteredCustomers.length > 0 && (
          <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
            {filteredCustomers.length} cliente(s) encontrado(s)
          </p>
        )}
        {search.trim().length >= 3 && filteredCustomers.length === 0 && (
          <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
            Nenhum cliente encontrado
          </p>
        )}
      </div>
      <DataTable
        columns={columns}
        data={filteredCustomers}
        loading={loading}
        emptyMessage="Nenhum cliente encontrado"
        onRowClick={handleRowClick}
      />

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
            Total: {totalCount} clientes
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseDialog();
          // Recarregar clientes quando fechar para garantir que os veículos estão atualizados
          loadCustomers();
        } else {
          setIsDialogOpen(true);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription>Preencha os dados do cliente</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Dados Financeiros
              </TabsTrigger>
              <TabsTrigger value="veiculos" className="flex items-center gap-2">
                <Car className="h-4 w-4" /> Veículos
                {(pendingVehicles.length > 0 || (selectedCustomer && vehicles.length > 0)) && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {selectedCustomer ? vehicles.length : pendingVehicles.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados">
              <div className="grid grid-cols-2 gap-4">
                {selectedCustomer && (
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input value={selectedCustomer.code || '-'} disabled className="bg-muted font-mono" />
                  </div>
                )}
                <div className={selectedCustomer ? "space-y-2" : "col-span-2 space-y-2"}>
                  <Label>Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>CPF/CNPJ</Label><Input value={formData.cpf_cnpj} onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      value={formData.zip_code}
                      onChange={handleCepChange}
                      maxLength={9}
                      placeholder="00000-000"
                    />
                    {loadingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 space-y-2"><Label>Endereço</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cidade</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} maxLength={2} /></div>
                <div className="col-span-2 space-y-2"><Label>Observações</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite de Crédito</Label>
                  <Input type="number" step="0.01" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Condição de Pagamento</Label>
                  <Select value={formData.payment_terms} onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avista">À Vista</SelectItem>
                      <SelectItem value="7dias">7 Dias</SelectItem>
                      <SelectItem value="14dias">14 Dias</SelectItem>
                      <SelectItem value="21dias">21 Dias</SelectItem>
                      <SelectItem value="30dias">30 Dias</SelectItem>
                      <SelectItem value="30-60dias">30/60 Dias</SelectItem>
                      <SelectItem value="30-60-90dias">30/60/90 Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="font-medium mb-3">Dados Bancários</p>
                </div>
                <div className="space-y-2"><Label>Banco</Label><Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="Ex: Banco do Brasil" /></div>
                <div className="space-y-2"><Label>Agência</Label><Input value={formData.bank_agency} onChange={(e) => setFormData({ ...formData, bank_agency: e.target.value })} /></div>
                <div className="space-y-2"><Label>Conta</Label><Input value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} /></div>
                <div className="space-y-2"><Label>Chave PIX</Label><Input value={formData.pix_key} onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })} placeholder="CPF, Email, Telefone ou Aleatória" /></div>
              </div>
            </TabsContent>

            <TabsContent value="veiculos">
              <div className="space-y-4">
                {!selectedCustomer && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      💡 Você pode adicionar veículos aqui. Eles serão salvos quando você cadastrar o cliente.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-1"><Label className="text-xs">Placa *</Label><Input value={vehicleData.plate} onChange={(e) => setVehicleData({ ...vehicleData, plate: e.target.value.toUpperCase() })} placeholder="ABC1234" /></div>
                  <div className="space-y-1"><Label className="text-xs">Marca</Label><Input value={vehicleData.brand} onChange={(e) => setVehicleData({ ...vehicleData, brand: e.target.value })} placeholder="Ex: Fiat" /></div>
                  <div className="space-y-1"><Label className="text-xs">Modelo</Label><Input value={vehicleData.model} onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })} placeholder="Ex: Argo" /></div>
                  <div className="space-y-1"><Label className="text-xs">Ano</Label><Input value={vehicleData.year} onChange={(e) => setVehicleData({ ...vehicleData, year: e.target.value })} placeholder="2024" /></div>
                  <div className="space-y-1"><Label className="text-xs">Cor</Label><Input value={vehicleData.color} onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })} placeholder="Branco" /></div>
                  <div className="space-y-1"><Label className="text-xs">Chassi</Label><Input value={vehicleData.chassis} onChange={(e) => setVehicleData({ ...vehicleData, chassis: e.target.value })} /></div>
                  <div className="col-span-3">
                    <Button onClick={handleAddVehicle} size="sm" className="w-full btn-gradient">
                      Adicionar Veículo
                    </Button>
                  </div>
                </div>

                {/* Mostrar veículos pendentes (antes de salvar o cliente) */}
                {!selectedCustomer && pendingVehicles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Veículos a serem cadastrados ({pendingVehicles.length})</p>
                    {pendingVehicles.map((v, index) => (
                      <div key={v.id || index} className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-mono font-semibold">{v.plate}</p>
                            <p className="text-sm text-muted-foreground">
                              {[v.brand, v.model, v.year, v.color].filter(Boolean).join(' - ') || 'Sem detalhes'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemovePendingVehicle(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mostrar veículos cadastrados (após salvar o cliente) */}
                {selectedCustomer && vehicles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Veículos Cadastrados</p>
                    {vehicles.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-mono font-semibold">{v.plate}</p>
                            <p className="text-sm text-muted-foreground">
                              {[v.brand, v.model, v.year, v.color].filter(Boolean).join(' - ') || 'Sem detalhes'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteVehicle(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSave} className="btn-gradient" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCustomer ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Summary Dialog */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resumo do Cliente</DialogTitle>
            <DialogDescription>Detalhes completos do cliente</DialogDescription>
          </DialogHeader>

          {summaryCustomer && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="font-medium">{summaryCustomer.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="font-mono">{summaryCustomer.code || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <p>{summaryCustomer.phone ? formatPhone(summaryCustomer.phone) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p>{summaryCustomer.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                  <p>{summaryCustomer.cpf_cnpj ? formatCPFCNPJ(summaryCustomer.cpf_cnpj) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cidade/UF</Label>
                  <p>{summaryCustomer.city ? `${summaryCustomer.city}/${summaryCustomer.state || ''}` : '-'}</p>
                </div>
              </div>

              {summaryCustomer.notes && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="text-sm bg-muted p-2 rounded-md">{summaryCustomer.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" /> Veículos
                </h4>
                {summaryCustomer.customer_vehicles && summaryCustomer.customer_vehicles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summaryCustomer.customer_vehicles.map((v: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-mono font-semibold text-sm">{v.plate}</p>
                          <p className="text-xs text-muted-foreground">
                            {[v.brand, v.model].filter(Boolean).join(' - ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSummaryOpen(false)}>Fechar</Button>
            <Button onClick={() => {
              setIsSummaryOpen(false);
              handleOpenDialog(summaryCustomer);
            }} className="btn-gradient">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
