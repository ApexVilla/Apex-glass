import { supabase } from '@/integrations/supabase/client';

export interface StockMovementFilters {
  startDate: string;
  endDate: string;
  movementType?: string; // 'all', 'entrada_compra', 'entrada_manual', 'saida_venda', 'saida_manual', 'ajuste', 'separacao', 'devolucao_cliente', 'devolucao_fornecedor', 'transferencia'
  productId?: string;
  productCode?: string;
  productName?: string;
  categoryId?: string;
  brand?: string;
  userId?: string;
  deposito?: string;
  saleNumber?: number;
  invoiceNumber?: string;
  pickingId?: string;
  includeFinancial?: boolean;
}

export interface StockMovement {
  id: string;
  created_at: string;
  type: string;
  quantity: number;
  saldo_anterior: number;
  saldo_atual: number;
  custo_unitario: number;
  custo_total: number;
  deposito: string;
  deposito_origem?: string;
  deposito_destino?: string;
  lote?: string;
  validade?: string;
  reason?: string;
  observacoes?: string;
  reference_id?: string;
  reference_type?: string;
  user?: {
    id: string;
    full_name?: string;
    email: string;
  };
  product: {
    id: string;
    internal_code: string;
    manufacturer_code?: string;
    name: string;
    category?: {
      id: string;
      name: string;
    };
    brand?: string;
    sale_price: number;
  };
  sale?: {
    sale_number: number;
    customer?: {
      name: string;
    };
  };
  invoice?: {
    invoice_number: number;
    type: string;
  };
  picking?: {
    id: string;
    sale?: {
      sale_number: number;
    };
  };
}

export interface StockMovementSummary {
  totalEntradas: number;
  totalSaidas: number;
  totalAjustes: number;
  saldoFinal: number;
  totalMovimentadoValor: number;
  movements: StockMovement[];
}

export const inventoryReportService = {
  async generateReport(
    companyId: string,
    filters: StockMovementFilters
  ): Promise<StockMovementSummary> {
    console.log('🔍 inventoryReportService.generateReport: Iniciando geração de relatório');
    console.log('📋 Filtros aplicados:', JSON.stringify(filters, null, 2));
    console.log('🏢 company_id:', companyId);
    
    // Buscar movimentações SEM relacionamento primeiro para evitar problemas com RLS
    // Depois buscar produtos separadamente
    console.log('🔍 Buscando movimentações sem relacionamento para evitar problemas com RLS...');

    // Mapear tipos de filtro para tipos reais na tabela
    const typeMapping: Record<string, string[]> = {
      'entrada_compra': ['entrada_compra', 'entrada', 'in'],
      'entrada_manual': ['entrada_manual', 'entrada', 'in'],
      'saida_venda': ['saida_venda', 'saida', 'out'],
      'saida_manual': ['saida_manual', 'saida', 'out'],
      'entrada_ajuste': ['entrada_ajuste', 'ajuste', 'in'],
      'saida_ajuste': ['saida_ajuste', 'ajuste', 'out'],
      'saida_separacao': ['saida_separacao', 'out'],
      'entrada_devolucao_cliente': ['entrada_devolucao_cliente', 'entrada_devolucao', 'entrada', 'in'],
      'saida_devolucao_cliente': ['saida_devolucao_cliente', 'saida', 'out'],
      'entrada_devolucao_fornecedor': ['entrada_devolucao_fornecedor', 'entrada', 'in'],
      'transferencia': ['transferencia'],
    };

    console.log('📅 Período:', `${filters.startDate}T00:00:00` + ' até ' + `${filters.endDate}T23:59:59`);

    // Primeiro, verificar se há movimentações sem filtros para debug
    const { data: debugMovements, error: debugError } = await supabase
      .from('inventory_movements')
      .select('id, product_id, type, quantity, created_at, company_id')
      .eq('company_id', companyId)
      .limit(5);
    
    if (debugError) {
      console.error('❌ Erro ao verificar movimentações (debug):', debugError);
    } else {
      console.log('🔍 Debug: Total de movimentações encontradas (últimas 5) sem filtros de data:', debugMovements?.length || 0);
      if (debugMovements && debugMovements.length > 0) {
        debugMovements.forEach((m: any, i: number) => {
          console.log(`   ${i + 1}. ID: ${m.id}, Tipo: ${m.type}, Qtd: ${m.quantity}, Data: ${m.created_at}`);
        });
      }
    }

    // Executar query - Buscar TODAS as movimentações usando paginação se necessário
    // O Supabase tem limite padrão de 1000 registros, então precisamos buscar em lotes
    let allMovements: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // Limite máximo do Supabase
    
    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      // Buscar movimentações SEM relacionamento para evitar problemas com RLS
      let pageQuery = supabase
        .from('inventory_movements')
        .select('*') // Buscar todos os campos da tabela
        .eq('company_id', companyId)
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Aplicar filtros
      if (filters.movementType && filters.movementType !== 'all') {
        const typesToFilter = typeMapping[filters.movementType] || [filters.movementType];
        console.log('🔽 Filtrando por tipo:', typesToFilter);
        pageQuery = pageQuery.in('type', typesToFilter);
      }

      if (filters.productId) {
        console.log('🔽 Filtrando por product_id:', filters.productId);
        pageQuery = pageQuery.eq('product_id', filters.productId);
      }

      if (filters.userId) {
        console.log('🔽 Filtrando por user_id:', filters.userId);
        pageQuery = pageQuery.eq('user_id', filters.userId);
      }

      if (filters.deposito) {
        console.log('🔽 Filtrando por depósito:', filters.deposito);
        pageQuery = pageQuery.or(`deposito_origem.eq.${filters.deposito},deposito_destino.eq.${filters.deposito}`);
      }
      
      const { data: movementsPageRaw, error } = await pageQuery;
      
      if (error) {
        console.error('❌ Erro ao buscar movimentações:', error);
        console.error('❌ Código do erro:', error.code);
        console.error('❌ Mensagem do erro:', error.message);
        throw error;
      }
      
      // Se encontrou movimentações, buscar produtos separadamente
      let movementsPage: any[] = [];
      if (movementsPageRaw && movementsPageRaw.length > 0) {
        // Buscar produtos de todas as movimentações desta página
        const productIds = [...new Set(movementsPageRaw.map((m: any) => m.product_id).filter(Boolean))];
        
        if (productIds.length > 0) {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
              id,
              internal_code,
              manufacturer_code,
              name,
              brand,
              sale_price,
              purchase_price,
              quantity,
              category_id,
              category:product_categories(id, name)
            `)
            .in('id', productIds)
            .eq('company_id', companyId);
          
          if (productsError) {
            console.error('❌ Erro ao buscar produtos:', productsError);
            // Continuar mesmo com erro, produtos serão null
          }
          
          const productsMap = (products || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
          
          // Combinar movimentações com produtos
          movementsPage = movementsPageRaw.map((m: any) => ({
            ...m,
            product: productsMap[m.product_id] || null,
          }));
        } else {
          movementsPage = movementsPageRaw;
        }
      }
      
      if (movementsPage && movementsPage.length > 0) {
        allMovements = [...allMovements, ...movementsPage];
        hasMore = movementsPage.length === pageSize; // Se retornou menos que pageSize, não há mais
        page++;
        console.log(`📦 Página ${page}: ${movementsPage.length} movimentações encontradas (Total: ${allMovements.length})`);
        
        // Log das primeiras movimentações da página para debug
        if (page === 1) {
          console.log('📋 Primeiras movimentações encontradas:');
          movementsPage.slice(0, 3).forEach((m: any, i: number) => {
            console.log(`   ${i + 1}. ID: ${m.id}, Produto: ${m.product?.name || 'N/A'}, Tipo: ${m.type}, Qtd: ${m.quantity}, Data: ${m.created_at}`);
          });
        }
      } else {
        hasMore = false;
        if (page === 0) {
          console.warn('⚠️ Nenhuma movimentação encontrada na primeira página. Verificando se há movimentações no período...');
        }
      }
    }
    
    const movements = allMovements;
    
    console.log('✅ Movimentações encontradas na query:', movements?.length || 0);
    
    // Se nenhuma movimentação foi encontrada, verificar se há movimentações no banco
    if (!movements || movements.length === 0) {
      console.log('🔍 Nenhuma movimentação encontrada com filtros. Verificando movimentações no banco...');
      
      // Verificar todas as movimentações da empresa (sem filtros de data)
      const { data: allMovementsDebug, error: debugError } = await supabase
        .from('inventory_movements')
        .select('id, product_id, type, quantity, created_at, reference_id, reference_type')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!debugError && allMovementsDebug) {
        console.log(`📦 Total de movimentações encontradas (últimas 50) sem filtros: ${allMovementsDebug.length}`);
        
        // Filtrar apenas saída de venda
        const saidaVendaMovements = allMovementsDebug.filter((m: any) => 
          m.type === 'saida_venda' || 
          m.type === 'out' || 
          m.type?.includes('saida_venda') ||
          m.reference_type === 'sale'
        );
        
        console.log(`🛒 Movimentações de VENDA encontradas: ${saidaVendaMovements.length}`);
        // Buscar nomes dos produtos para debug
        const productIdsForDebug = [...new Set(saidaVendaMovements.map((m: any) => m.product_id))];
        const { data: productsForDebug } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIdsForDebug)
          .eq('company_id', companyId);
        
        const productsDebugMap = (productsForDebug || []).reduce((acc: any, p: any) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
        
        saidaVendaMovements.slice(0, 10).forEach((m: any, i: number) => {
          const date = new Date(m.created_at).toISOString().split('T')[0];
          console.log(`   ${i + 1}. Tipo: ${m.type}, Qtd: ${m.quantity}, Data: ${date}, Produto: ${productsDebugMap[m.product_id] || 'N/A'}, Reference: ${m.reference_id || 'N/A'}`);
        });
        
        // Se há filtro de produto, verificar movimentações desse produto
        if (filters.productId) {
          const productMovements = allMovementsDebug.filter((m: any) => m.product_id === filters.productId);
          console.log(`📦 Movimentações do produto filtrado (sem filtro de data): ${productMovements.length}`);
          productMovements.slice(0, 10).forEach((m: any, i: number) => {
            const date = new Date(m.created_at).toISOString().split('T')[0];
            console.log(`   ${i + 1}. Tipo: ${m.type}, Qtd: ${m.quantity}, Data: ${date}`);
          });
          
          if (productMovements.length > 0) {
            const firstDate = new Date(productMovements[productMovements.length - 1].created_at).toISOString().split('T')[0];
            const lastDate = new Date(productMovements[0].created_at).toISOString().split('T')[0];
            console.log(`📅 Período das movimentações do produto: ${firstDate} até ${lastDate}`);
            console.log(`📅 Período do filtro aplicado: ${filters.startDate} até ${filters.endDate}`);
            
            // Verificar se as datas estão dentro do período
            const filterStart = new Date(filters.startDate);
            const filterEnd = new Date(filters.endDate + 'T23:59:59');
            const movementsInRange = productMovements.filter((m: any) => {
              const mDate = new Date(m.created_at);
              return mDate >= filterStart && mDate <= filterEnd;
            });
            console.log(`📊 Movimentações do produto dentro do período do filtro: ${movementsInRange.length}`);
          }
        }
      } else if (debugError) {
        console.error('❌ Erro ao buscar movimentações para debug:', debugError);
      }
    }
    if (movements && movements.length > 0) {
      console.log('📦 Primeiras 3 movimentações:');
      movements.slice(0, 3).forEach((m: any, i: number) => {
        console.log(`   ${i + 1}. ID: ${m.id}, Produto: ${m.product?.name || 'N/A'}, Tipo: ${m.type}, Qtd: ${m.quantity}, Data: ${m.created_at}`);
      });
    } else {
      console.warn('⚠️ Nenhuma movimentação encontrada com os filtros aplicados');
      // Verificar se há movimentações sem filtros para debug
      const { data: allMovements, error: debugError } = await supabase
        .from('inventory_movements')
        .select('id, product_id, type, created_at')
        .eq('company_id', companyId)
        .limit(10);
      
      if (!debugError && allMovements && allMovements.length > 0) {
        // Buscar nomes dos produtos
        const productIdsForDebug2 = [...new Set(allMovements.map((m: any) => m.product_id))];
        const { data: productsForDebug2 } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIdsForDebug2)
          .eq('company_id', companyId);
        
        const productsDebugMap2 = (productsForDebug2 || []).reduce((acc: any, p: any) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
        
        console.log('🔍 Debug: Total de movimentações (últimas 10) sem filtros de data:');
        allMovements.forEach((m: any, i: number) => {
          console.log(`   ${i + 1}. Produto ID: ${m.product_id}, Nome: ${productsDebugMap2[m.product_id] || 'N/A'}, Tipo: ${m.type}, Data: ${m.created_at}`);
        });
      }
    }

    // Filter by product name, code, category, brand if provided
    let filteredMovements = (movements || []) as any[];

    if (filters.productCode) {
      filteredMovements = filteredMovements.filter(m =>
        m.product?.internal_code?.toLowerCase().includes(filters.productCode!.toLowerCase()) ||
        m.product?.manufacturer_code?.toLowerCase().includes(filters.productCode!.toLowerCase())
      );
    }

    if (filters.productName) {
      filteredMovements = filteredMovements.filter(m =>
        m.product?.name?.toLowerCase().includes(filters.productName!.toLowerCase())
      );
    }

    if (filters.categoryId) {
      filteredMovements = filteredMovements.filter(m =>
        m.product?.category?.id === filters.categoryId
      );
    }

    if (filters.brand) {
      filteredMovements = filteredMovements.filter(m =>
        m.product?.brand?.toLowerCase().includes(filters.brand!.toLowerCase())
      );
    }

    // Calcular saldos anteriores para cada produto
    // Usar os valores salvos na tabela se existirem, caso contrário calcular
    const productIds = [...new Set(filteredMovements.map(m => m.product_id))];
    const saldosIniciais: Record<string, number> = {};
    
    // Buscar todos os produtos de uma vez
    const { data: products } = await supabase
      .from('products')
      .select('id, quantity')
      .in('id', productIds);
    
    const productsMap = (products || []).reduce((acc, p) => {
      acc[p.id] = p.quantity || 0;
      return acc;
    }, {} as Record<string, number>);
    
    // Para cada produto, calcular o saldo antes do período
    for (const productId of productIds) {
      // Buscar a primeira movimentação do período para este produto
      const firstMovement = filteredMovements
        .filter(m => m.product_id === productId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      
      // Se a primeira movimentação do período tem estoque_anterior salvo, usar ele
      if (firstMovement && firstMovement.estoque_anterior !== null && firstMovement.estoque_anterior !== undefined) {
        saldosIniciais[productId] = firstMovement.estoque_anterior;
      } else {
        // Calcular retroativamente: buscar todas as movimentações anteriores ao período
        const { data: previousMovements } = await supabase
          .from('inventory_movements')
          .select('type, quantity, estoque_posterior')
          .eq('company_id', companyId)
          .eq('product_id', productId)
          .lt('created_at', `${filters.startDate}T00:00:00`)
          .order('created_at', { ascending: false });
        
        // Começar com a quantidade atual do produto
        let saldoInicial = productsMap[productId] || 0;
        
        // Retroceder todas as movimentações do período atual
        const periodMovements = filteredMovements
          .filter(m => m.product_id === productId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        periodMovements.forEach(m => {
          if (m.type.includes('entrada') || m.type === 'in' || m.type === 'entrada_compra' || m.type === 'entrada_manual' || m.type === 'entrada_devolucao' || m.type === 'entrada_ajuste') {
            saldoInicial -= m.quantity;
          } else if (m.type.includes('saida') || m.type === 'out' || m.type === 'saida_venda' || m.type === 'saida_manual' || m.type === 'saida_separacao' || m.type === 'saida_ajuste') {
            saldoInicial += m.quantity;
          } else if (m.type === 'ajuste') {
            // Para ajuste, a quantidade pode ser positiva ou negativa
            saldoInicial -= m.quantity;
          } else if (m.type === 'transferencia') {
            // Transferência não altera o estoque total, apenas move entre depósitos
            // Não precisa retroceder
          }
        });
        
        // Retroceder movimentações anteriores ao período
        if (previousMovements) {
          previousMovements.forEach(m => {
            if (m.type.includes('entrada') || m.type === 'in' || m.type === 'entrada_compra' || m.type === 'entrada_manual' || m.type === 'entrada_devolucao' || m.type === 'entrada_ajuste') {
              saldoInicial -= m.quantity;
            } else if (m.type.includes('saida') || m.type === 'out' || m.type === 'saida_venda' || m.type === 'saida_manual' || m.type === 'saida_separacao' || m.type === 'saida_ajuste') {
              saldoInicial += m.quantity;
            } else if (m.type === 'ajuste') {
              saldoInicial -= m.quantity;
            }
          });
        }
        
        saldosIniciais[productId] = Math.max(0, saldoInicial);
      }
    }
    
    // Ordenar movimentações por data (mais antigas primeiro) para calcular saldos corretamente
    const sortedMovements = [...filteredMovements].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Calcular saldos para cada movimentação
    const movementsWithSaldo = sortedMovements.map((m) => {
      const productId = m.product_id;
      
      // Usar estoque_anterior salvo se existir, caso contrário calcular
      let saldoAnterior = m.estoque_anterior !== null && m.estoque_anterior !== undefined 
        ? m.estoque_anterior 
        : saldosIniciais[productId] || 0;
      
      // Se não tem saldo anterior salvo, calcular baseado nas movimentações anteriores no período
      if (m.estoque_anterior === null || m.estoque_anterior === undefined) {
        const previousMovements = sortedMovements.filter(prev => 
          prev.product_id === productId && 
          new Date(prev.created_at) < new Date(m.created_at)
        );
        
        previousMovements.forEach(prev => {
          if (prev.type.includes('entrada') || prev.type === 'in' || prev.type === 'entrada_compra' || prev.type === 'entrada_manual' || prev.type === 'entrada_devolucao' || prev.type === 'entrada_ajuste') {
            saldoAnterior += prev.quantity;
          } else if (prev.type.includes('saida') || prev.type === 'out' || prev.type === 'saida_venda' || prev.type === 'saida_manual' || prev.type === 'saida_separacao' || prev.type === 'saida_ajuste') {
            saldoAnterior -= prev.quantity;
          } else if (prev.type === 'ajuste') {
            // Para ajuste, usar a diferença
            saldoAnterior = (prev.estoque_posterior !== null ? prev.estoque_posterior : saldoAnterior) - prev.quantity;
          }
        });
      }
      
      // Calcular saldo atual
      let saldoAtual = m.estoque_posterior !== null && m.estoque_posterior !== undefined
        ? m.estoque_posterior
        : saldoAnterior;
      
      if (m.estoque_posterior === null || m.estoque_posterior === undefined) {
        if (m.type.includes('entrada') || m.type === 'in' || m.type === 'entrada_compra' || m.type === 'entrada_manual' || m.type === 'entrada_devolucao' || m.type === 'entrada_ajuste') {
          saldoAtual = saldoAnterior + m.quantity;
        } else if (m.type.includes('saida') || m.type === 'out' || m.type === 'saida_venda' || m.type === 'saida_manual' || m.type === 'saida_separacao' || m.type === 'saida_ajuste') {
          saldoAtual = saldoAnterior - m.quantity;
        } else if (m.type === 'ajuste') {
          saldoAtual = saldoAnterior + m.quantity; // Ajuste pode ser positivo ou negativo
        } else if (m.type === 'transferencia') {
          saldoAtual = saldoAnterior; // Transferência não altera o estoque total
        }
      }
      
      return {
        ...m,
        saldo_anterior: Math.max(0, saldoAnterior),
        saldo_atual: Math.max(0, saldoAtual),
        deposito_origem: m.deposito_origem,
        deposito_destino: m.deposito_destino,
      };
    });
    
    // Reordenar por data descendente para exibição
    movementsWithSaldo.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Apply reference filters before enrichment (more efficient)
    if (filters.saleNumber) {
      // Filter by sale number - need to check reference_id matches sale
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .eq('company_id', companyId)
        .eq('sale_number', filters.saleNumber)
        .limit(1);
      
      if (sales && sales.length > 0) {
        movementsWithSaldo.forEach(m => {
          // Tentar determinar reference_type baseado no tipo de movimento
          if (m.reference_id === sales[0].id && m.type.includes('saida_venda')) {
            m.reference_type = 'sale';
          }
        });
        const filtered = movementsWithSaldo.filter(m =>
          m.reference_id === sales[0].id
        );
        movementsWithSaldo.length = 0;
        movementsWithSaldo.push(...filtered);
      } else {
        movementsWithSaldo.length = 0;
      }
    }
    
    if (filters.invoiceNumber) {
      // Filter by invoice number
      const { data: invoices } = await supabase
        .from('nf_entrada')
        .select('id')
        .eq('company_id', companyId)
        .eq('numero', filters.invoiceNumber)
        .limit(1);
      
      if (invoices && invoices.length > 0) {
        movementsWithSaldo.forEach(m => {
          if (m.reference_id === invoices[0].id) {
            m.reference_type = m.type.includes('entrada') ? 'nf_entrada' : 'nf_saida';
          }
        });
        const filtered = movementsWithSaldo.filter(m =>
          m.reference_id === invoices[0].id
        );
        movementsWithSaldo.length = 0;
        movementsWithSaldo.push(...filtered);
      } else {
        movementsWithSaldo.length = 0;
      }
    }
    
    if (filters.pickingId) {
      movementsWithSaldo.forEach(m => {
        if (m.reference_id === filters.pickingId) {
          m.reference_type = 'picking';
        }
      });
      const filtered = movementsWithSaldo.filter(m =>
        m.reference_id === filters.pickingId
      );
      movementsWithSaldo.length = 0;
      movementsWithSaldo.push(...filtered);
    }
    
    // Load related data (sales, invoices, picking)
    const enrichedMovements = await this.enrichMovements(movementsWithSaldo, companyId, filters);

    // Calculate summary
    const summary = this.calculateSummary(enrichedMovements);

    return {
      ...summary,
      movements: enrichedMovements,
    };
  },

  async enrichMovements(
    movements: any[],
    companyId: string,
    filters: StockMovementFilters
  ): Promise<StockMovement[]> {
    const enriched: StockMovement[] = [];

    // Buscar todos os user_ids únicos para fazer uma única consulta
    const userIds = [...new Set(movements.map(m => m.user_id).filter(Boolean))];
    let usersMap: Record<string, { id: string; full_name?: string; email: string }> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .eq('company_id', companyId);

      if (users) {
        usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, { id: string; full_name?: string; email: string }>);
      }
    }

    // Buscar todas as notas fiscais de entrada de uma vez
    const nfEntradaIds = [...new Set(
      movements
        .filter(m => (m.type.includes('entrada_compra') || m.type === 'in') && m.reference_id)
        .map(m => m.reference_id)
    )];
    let nfEntradaMap: Record<string, { id: string; numero: number; serie: string }> = {};

    if (nfEntradaIds.length > 0) {
      const { data: nfEntradas } = await supabase
        .from('nf_entrada')
        .select('id, numero, serie')
        .in('id', nfEntradaIds);

      if (nfEntradas) {
        nfEntradaMap = nfEntradas.reduce((acc, nf) => {
          acc[nf.id] = nf;
          return acc;
        }, {} as Record<string, { id: string; numero: number; serie: string }>);
      }
    }

    for (const movement of movements) {
      // Determinar reference_type baseado no tipo de movimento se não estiver definido
      let referenceType = movement.reference_type;
      if (!referenceType && movement.reference_id) {
        if (movement.type.includes('saida_venda')) {
          referenceType = 'sale';
        } else if (movement.type.includes('entrada_devolucao_cliente')) {
          // Devolução de cliente (cancelamento de venda) também referencia uma venda
          referenceType = 'sale';
        } else if (movement.type.includes('entrada_compra') || movement.type === 'in') {
          // Verificar se o reference_id aponta para uma nota fiscal de entrada
          if (nfEntradaMap[movement.reference_id]) {
            referenceType = 'nf_entrada';
          } else {
            // Se não for NF, pode ser entrada manual
            referenceType = movement.type === 'in' ? undefined : 'nf_entrada';
          }
        } else if (movement.type.includes('saida_separacao')) {
          referenceType = 'picking';
        }
      }
      
      const custoUnitario = movement.product?.purchase_price || 0;
      
      const enrichedMovement: StockMovement = {
        id: movement.id,
        created_at: movement.created_at,
        type: movement.type,
        quantity: movement.quantity,
        saldo_anterior: movement.saldo_anterior || 0,
        saldo_atual: movement.saldo_atual || 0,
        custo_unitario: custoUnitario,
        custo_total: custoUnitario * movement.quantity,
        deposito: movement.deposito_origem || movement.deposito_destino || 'principal',
        deposito_origem: movement.deposito_origem,
        deposito_destino: movement.deposito_destino,
        lote: undefined,
        validade: undefined,
        reason: movement.reason || undefined,
        observacoes: movement.observacao || undefined,
        reference_id: movement.reference_id || undefined,
        reference_type: referenceType,
        user: movement.user_id ? usersMap[movement.user_id] : undefined,
        product: {
          id: movement.product?.id,
          internal_code: movement.product?.internal_code || '',
          manufacturer_code: movement.product?.manufacturer_code,
          name: movement.product?.name || '',
          category: movement.product?.category,
          brand: movement.product?.brand,
          sale_price: movement.product?.sale_price || 0,
        },
      };

      // Load sale if reference_type is 'sale' or 'picking'
      if (enrichedMovement.reference_id && (enrichedMovement.reference_type === 'sale' || enrichedMovement.reference_type === 'picking')) {
        if (enrichedMovement.reference_type === 'sale') {
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select(`
              sale_number,
              customer:customers(name)
            `)
            .eq('id', enrichedMovement.reference_id)
            .maybeSingle();

          if (sale) {
            enrichedMovement.sale = {
              sale_number: sale.sale_number,
              customer: sale.customer,
            };
          } else {
            // Venda não encontrada (provavelmente foi deletada/cancelada)
            // Ainda assim, mostrar a movimentação no relatório
            // Usar sale_number = 0 para indicar que a venda foi cancelada/deletada
            enrichedMovement.sale = {
              sale_number: 0, // Indicar que a venda foi cancelada/deletada
              customer: undefined,
            };
          }
        } else if (enrichedMovement.reference_type === 'picking') {
          const { data: picking } = await supabase
            .from('picking')
            .select(`
              id,
              sale:sales(sale_number)
            `)
            .eq('id', enrichedMovement.reference_id)
            .single();

          if (picking) {
            enrichedMovement.picking = {
              id: picking.id,
              sale: picking.sale,
            };
          }
        }
      }

      // Load invoice if reference_type is 'nf_entrada' or 'nf_saida'
      if (enrichedMovement.reference_id && (enrichedMovement.reference_type === 'nf_entrada' || enrichedMovement.reference_type === 'nf_saida')) {
        const nfEntrada = nfEntradaMap[enrichedMovement.reference_id];
        if (nfEntrada) {
          enrichedMovement.invoice = {
            invoice_number: nfEntrada.numero,
            type: enrichedMovement.reference_type,
          };
        }
      }

      enriched.push(enrichedMovement);
    }

    return enriched;
  },

  calculateSummary(movements: StockMovement[]): Omit<StockMovementSummary, 'movements'> {
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalAjustes = 0;
    let totalMovimentadoValor = 0;

    movements.forEach(movement => {
      const isEntrada = movement.type.includes('entrada');
      const isSaida = movement.type.includes('saida');
      const isAjuste = movement.type.includes('ajuste');

      if (isEntrada) {
        totalEntradas += movement.quantity;
      } else if (isSaida) {
        totalSaidas += movement.quantity;
      } else if (isAjuste) {
        totalAjustes += Math.abs(movement.quantity);
      }

      totalMovimentadoValor += movement.custo_total;
    });

    // Get final balance (last movement's saldo_atual for each product, or current product quantity)
    const saldoFinal = movements.length > 0
      ? movements[0].saldo_atual // Assuming sorted by date desc, first is most recent
      : 0;

    return {
      totalEntradas,
      totalSaidas,
      totalAjustes,
      saldoFinal,
      totalMovimentadoValor,
    };
  },

  async getProducts(companyId: string) {
    console.log('🔍 inventoryReportService.getProducts: Buscando produtos para company_id:', companyId);
    
    if (!companyId) {
      console.error('❌ inventoryReportService.getProducts: companyId não fornecido');
      return [];
    }
    
    // Removido filtro is_active para retornar TODOS os produtos cadastrados
    // A política RLS já filtra por company_id automaticamente através de get_user_company_id()
    // Então não precisamos filtrar manualmente na query
    try {
      // Query simples - RLS já filtra por company_id automaticamente
      const { data, error, count } = await supabase
        .from('products')
        .select('id, internal_code, name, brand, description', { count: 'exact' })
        .order('name');

      if (error) {
        console.error('❌ inventoryReportService.getProducts: Erro na query:', error);
        console.error('❌ Código do erro:', error.code);
        console.error('❌ Mensagem do erro:', error.message);
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ inventoryReportService.getProducts: Query executada com sucesso');
      console.log('✅ inventoryReportService.getProducts: Produtos encontrados:', data?.length || 0, 'de', count || 0, 'total');
      
      if (data && data.length > 0) {
        console.log('📦 inventoryReportService.getProducts: Primeiros 5 produtos:');
        data.slice(0, 5).forEach((p, i) => {
          console.log(`   ${i + 1}. ID: ${p.id}, Nome: ${p.name}, Código: ${p.internal_code}`);
        });
        
        // Verificar se os produtos pertencem à company_id correta
        const wrongCompany = data.filter(p => (p as any).company_id && (p as any).company_id !== companyId);
        if (wrongCompany.length > 0) {
          console.warn(`⚠️ Encontrados ${wrongCompany.length} produtos de outra empresa`);
        }
      } else {
        console.warn('⚠️ inventoryReportService.getProducts: Nenhum produto encontrado');
        console.warn('⚠️ company_id usado:', companyId);
        console.warn('⚠️ Verifique se há produtos cadastrados para esta empresa');
      }
      
      return data || [];
    } catch (err: any) {
      console.error('❌ inventoryReportService.getProducts: Exceção capturada:', err);
      console.error('❌ Stack trace:', err.stack);
      throw err;
    }
  },

  async getUsers(companyId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  async getCategories(companyId: string) {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};

