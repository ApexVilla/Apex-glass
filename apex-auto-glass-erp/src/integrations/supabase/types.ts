export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_vehicles: {
        Row: {
          brand: string | null
          chassis: string | null
          color: string | null
          company_id: string
          created_at: string
          customer_id: string
          id: string
          model: string | null
          plate: string
          updated_at: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          chassis?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          model?: string | null
          plate: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          chassis?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          model?: string | null
          plate?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          city: string | null
          company_id: string
          cpf_cnpj: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          pix_key: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          city?: string | null
          company_id: string
          cpf_cnpj?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pix_key?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          city?: string | null
          company_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pix_key?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          paid_date: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          paid_date?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          paid_date?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          invoice_number: number
          issue_date: string
          notes: string | null
          status: string
          supplier_customer: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          invoice_number?: number
          issue_date?: string
          notes?: string | null
          status?: string
          supplier_customer: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          invoice_number?: number
          issue_date?: string
          notes?: string | null
          status?: string
          supplier_customer?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          company_id: string
          compatible_vehicles: string | null
          created_at: string
          description: string | null
          has_band: boolean | null
          has_hud: boolean | null
          has_sensor: boolean | null
          id: string
          image_url: string | null
          internal_code: string
          is_active: boolean | null
          location: string | null
          manufacturer_code: string | null
          min_quantity: number | null
          name: string
          purchase_price: number | null
          quantity: number | null
          sale_price: number | null
          sensor_count: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          company_id: string
          compatible_vehicles?: string | null
          created_at?: string
          description?: string | null
          has_band?: boolean | null
          has_hud?: boolean | null
          has_sensor?: boolean | null
          id?: string
          image_url?: string | null
          internal_code: string
          is_active?: boolean | null
          location?: string | null
          manufacturer_code?: string | null
          min_quantity?: number | null
          name: string
          purchase_price?: number | null
          quantity?: number | null
          sale_price?: number | null
          sensor_count?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          company_id?: string
          compatible_vehicles?: string | null
          created_at?: string
          description?: string | null
          has_band?: boolean | null
          has_hud?: boolean | null
          has_sensor?: boolean | null
          id?: string
          image_url?: string | null
          internal_code?: string
          is_active?: boolean | null
          location?: string | null
          manufacturer_code?: string | null
          min_quantity?: number | null
          name?: string
          purchase_price?: number | null
          quantity?: number | null
          sale_price?: number | null
          sensor_count?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          product_id: string | null
          quantity: number
          sale_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          discount: number | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          sale_number: number
          seller_id: string | null
          service_order_id: string | null
          subtotal: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          sale_number?: number
          seller_id?: string | null
          service_order_id?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          sale_number?: number
          seller_id?: string | null
          service_order_id?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          product_id: string | null
          quantity: number
          service_order_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          service_order_id: string
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          service_order_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          company_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          labor_cost: number | null
          notes: string | null
          order_number: number
          scheduled_date: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          technician_id: string | null
          total_amount: number | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          labor_cost?: number | null
          notes?: string | null
          order_number?: number
          scheduled_date?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          technician_id?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          labor_cost?: number | null
          notes?: string | null
          order_number?: number
          scheduled_date?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          technician_id?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "customer_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          company_id: string | null
          tipo_pessoa: "PF" | "PJ" | null
          nome_razao: string
          nome_fantasia: string | null
          cpf_cnpj: string | null
          ie: string | null
          im: string | null
          cnae: string | null
          regime_tributario: string | null
          cep: string | null
          logradouro: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          pais: string | null
          telefone1: string | null
          telefone2: string | null
          whatsapp: string | null
          email_principal: string | null
          email_financeiro: string | null
          site: string | null
          contato_principal: string | null
          vendedor_fornecedor: string | null
          observacoes: string | null
          prazo_entrega: string | null
          linha_produtos: string | null
          banco: string | null
          agencia: string | null
          conta: string | null
          tipo_conta: string | null
          pix: string | null
          limite_credito: number | null
          condicao_pagamento: string | null
          metodo_pagamento: string | null
          retencao_impostos: boolean | null
          impostos_retidos: Json | null
          regime_icms: string | null
          indicador_contribuinte: string | null
          cod_municipio: string | null
          aliquota_iss: number | null
          lista_servicos: string | null
          retem_iss: boolean | null
          ativo: boolean | null
          categoria: string | null
          prioridade: string | null
          is_transportadora: boolean | null
          emite_nfe: boolean | null
          emite_nfse: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          tipo_pessoa?: "PF" | "PJ" | null
          nome_razao: string
          nome_fantasia?: string | null
          cpf_cnpj?: string | null
          ie?: string | null
          im?: string | null
          cnae?: string | null
          regime_tributario?: string | null
          cep?: string | null
          logradouro?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          pais?: string | null
          telefone1?: string | null
          telefone2?: string | null
          whatsapp?: string | null
          email_principal?: string | null
          email_financeiro?: string | null
          site?: string | null
          contato_principal?: string | null
          vendedor_fornecedor?: string | null
          observacoes?: string | null
          prazo_entrega?: string | null
          linha_produtos?: string | null
          banco?: string | null
          agencia?: string | null
          conta?: string | null
          tipo_conta?: string | null
          pix?: string | null
          limite_credito?: number | null
          condicao_pagamento?: string | null
          metodo_pagamento?: string | null
          retencao_impostos?: boolean | null
          impostos_retidos?: Json | null
          regime_icms?: string | null
          indicador_contribuinte?: string | null
          cod_municipio?: string | null
          aliquota_iss?: number | null
          lista_servicos?: string | null
          retem_iss?: boolean | null
          ativo?: boolean | null
          categoria?: string | null
          prioridade?: string | null
          is_transportadora?: boolean | null
          emite_nfe?: boolean | null
          emite_nfse?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          tipo_pessoa?: "PF" | "PJ" | null
          nome_razao?: string
          nome_fantasia?: string | null
          cpf_cnpj?: string | null
          ie?: string | null
          im?: string | null
          cnae?: string | null
          regime_tributario?: string | null
          cep?: string | null
          logradouro?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          pais?: string | null
          telefone1?: string | null
          telefone2?: string | null
          whatsapp?: string | null
          email_principal?: string | null
          email_financeiro?: string | null
          site?: string | null
          contato_principal?: string | null
          vendedor_fornecedor?: string | null
          observacoes?: string | null
          prazo_entrega?: string | null
          linha_produtos?: string | null
          banco?: string | null
          agencia?: string | null
          conta?: string | null
          tipo_conta?: string | null
          pix?: string | null
          limite_credito?: number | null
          condicao_pagamento?: string | null
          metodo_pagamento?: string | null
          retencao_impostos?: boolean | null
          impostos_retidos?: Json | null
          regime_icms?: string | null
          indicador_contribuinte?: string | null
          cod_municipio?: string | null
          aliquota_iss?: number | null
          lista_servicos?: string | null
          retem_iss?: boolean | null
          ativo?: boolean | null
          categoria?: string | null
          prioridade?: string | null
          is_transportadora?: boolean | null
          emite_nfe?: boolean | null
          emite_nfse?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      user_permissions: {
        Row: {
          company_id: string | null
          created_at: string
          granted: boolean
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          granted: boolean
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          granted?: boolean
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      service_order_status: "open" | "in_progress" | "completed" | "cancelled"
      transaction_type: "income" | "expense"
      user_role: "admin" | "manager" | "seller" | "installer" | "stock" | "separador" | "supervisor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      service_order_status: ["open", "in_progress", "completed", "cancelled"],
      transaction_type: ["income", "expense"],
      user_role: ["admin", "manager", "seller", "installer", "stock", "separador", "supervisor"],
    },
  },
} as const
