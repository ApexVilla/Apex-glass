export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          email: string | null
          phone: string | null
          address: string | null
          cnpj: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          email?: string | null
          phone?: string | null
          address?: string | null
          cnpj?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          cnpj?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string
          role: string
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name: string
          role?: string
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string
          role?: string
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      produtos: {
        Row: {
          id: string
          tenant_id: string
          codigo: string
          nome: string
          descricao: string | null
          preco: number
          estoque: number
          unidade: string
          categoria: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          codigo: string
          nome: string
          descricao?: string | null
          preco?: number
          estoque?: number
          unidade?: string
          categoria?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          codigo?: string
          nome?: string
          descricao?: string | null
          preco?: number
          estoque?: number
          unidade?: string
          categoria?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      fornecedores: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          cnpj: string | null
          email: string | null
          phone: string | null
          endereco: string | null
          contato: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          cnpj?: string | null
          email?: string | null
          phone?: string | null
          endereco?: string | null
          contato?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          cnpj?: string | null
          email?: string | null
          phone?: string | null
          endereco?: string | null
          contato?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vendas: {
        Row: {
          id: string
          tenant_id: string
          numero: string
          cliente_nome: string | null
          cliente_documento: string | null
          data_venda: string
          valor_total: number
          desconto: number
          valor_final: number
          status: string
          observacoes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          numero: string
          cliente_nome?: string | null
          cliente_documento?: string | null
          data_venda?: string
          valor_total?: number
          desconto?: number
          valor_final?: number
          status?: string
          observacoes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          numero?: string
          cliente_nome?: string | null
          cliente_documento?: string | null
          data_venda?: string
          valor_total?: number
          desconto?: number
          valor_final?: number
          status?: string
          observacoes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      venda_itens: {
        Row: {
          id: string
          venda_id: string
          produto_id: string | null
          codigo_produto: string | null
          nome_produto: string | null
          quantidade: number
          preco_unitario: number
          desconto: number
          valor_total: number
          created_at: string
        }
        Insert: {
          id?: string
          venda_id: string
          produto_id?: string | null
          codigo_produto?: string | null
          nome_produto?: string | null
          quantidade?: number
          preco_unitario?: number
          desconto?: number
          valor_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          venda_id?: string
          produto_id?: string | null
          codigo_produto?: string | null
          nome_produto?: string | null
          quantidade?: number
          preco_unitario?: number
          desconto?: number
          valor_total?: number
          created_at?: string
        }
      }
      contas_receber: {
        Row: {
          id: string
          tenant_id: string
          venda_id: string | null
          numero: string
          cliente_nome: string
          descricao: string
          valor_total: number
          valor_pago: number
          valor_pendente: number
          data_vencimento: string
          data_pagamento: string | null
          status: string
          observacoes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          venda_id?: string | null
          numero: string
          cliente_nome: string
          descricao: string
          valor_total?: number
          valor_pago?: number
          valor_pendente?: number
          data_vencimento: string
          data_pagamento?: string | null
          status?: string
          observacoes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          venda_id?: string | null
          numero?: string
          cliente_nome?: string
          descricao?: string
          valor_total?: number
          valor_pago?: number
          valor_pendente?: number
          data_vencimento?: string
          data_pagamento?: string | null
          status?: string
          observacoes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

