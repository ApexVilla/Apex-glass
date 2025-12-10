'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function NovaVendaPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    numero: '',
    cliente_nome: '',
    cliente_documento: '',
    data_venda: new Date().toISOString().split('T')[0],
    valor_total: '',
    desconto: '',
    observacoes: '',
    status: 'pendente',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [produtos, setProdutos] = useState<any[]>([])

  useEffect(() => {
    loadProdutos()
  }, [])

  const loadProdutos = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('is_active', true)
      .order('nome')
    if (data) setProdutos(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        throw new Error('Perfil não encontrado')
      }

      const valorTotal = parseFloat(formData.valor_total) || 0
      const desconto = parseFloat(formData.desconto) || 0
      const valorFinal = valorTotal - desconto

      const { error: insertError } = await supabase
        .from('vendas')
        .insert({
          tenant_id: profile.tenant_id,
          numero: formData.numero,
          cliente_nome: formData.cliente_nome || null,
          cliente_documento: formData.cliente_documento || null,
          data_venda: formData.data_venda,
          valor_total: valorTotal,
          desconto: desconto,
          valor_final: valorFinal,
          status: formData.status,
          observacoes: formData.observacoes || null,
          created_by: user.id,
        })

      if (insertError) throw insertError

      router.push('/vendas')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar venda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/vendas" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Nova Venda</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                    Número da Venda *
                  </label>
                  <input
                    type="text"
                    id="numero"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="data_venda" className="block text-sm font-medium text-gray-700">
                    Data da Venda *
                  </label>
                  <input
                    type="date"
                    id="data_venda"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.data_venda}
                    onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cliente_nome" className="block text-sm font-medium text-gray-700">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    id="cliente_nome"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.cliente_nome}
                    onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="cliente_documento" className="block text-sm font-medium text-gray-700">
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    id="cliente_documento"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.cliente_documento}
                    onChange={(e) => setFormData({ ...formData, cliente_documento: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="valor_total" className="block text-sm font-medium text-gray-700">
                    Valor Total *
                  </label>
                  <input
                    type="number"
                    id="valor_total"
                    step="0.01"
                    min="0"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="desconto" className="block text-sm font-medium text-gray-700">
                    Desconto
                  </label>
                  <input
                    type="number"
                    id="desconto"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.desconto}
                    onChange={(e) => setFormData({ ...formData, desconto: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/vendas"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

