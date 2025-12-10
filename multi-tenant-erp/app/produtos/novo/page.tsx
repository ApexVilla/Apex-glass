'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function NovoProdutoPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    preco: '',
    estoque: '',
    unidade: 'UN',
    categoria: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Verificar autenticação e obter tenant_id
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

      // Inserir produto
      const { error: insertError } = await supabase
        .from('produtos')
        .insert({
          tenant_id: profile.tenant_id,
          codigo: formData.codigo,
          nome: formData.nome,
          descricao: formData.descricao || null,
          preco: parseFloat(formData.preco),
          estoque: parseInt(formData.estoque) || 0,
          unidade: formData.unidade,
          categoria: formData.categoria || null,
        })

      if (insertError) throw insertError

      router.push('/produtos')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar produto')
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
              <Link href="/produtos" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Novo Produto</h1>
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
              <div>
                <label htmlFor="codigo" className="block text-sm font-medium text-gray-700">
                  Código *
                </label>
                <input
                  type="text"
                  id="codigo"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                  Nome *
                </label>
                <input
                  type="text"
                  id="nome"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="preco" className="block text-sm font-medium text-gray-700">
                    Preço *
                  </label>
                  <input
                    type="number"
                    id="preco"
                    step="0.01"
                    min="0"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="estoque" className="block text-sm font-medium text-gray-700">
                    Estoque
                  </label>
                  <input
                    type="number"
                    id="estoque"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.estoque}
                    onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="unidade" className="block text-sm font-medium text-gray-700">
                    Unidade
                  </label>
                  <select
                    id="unidade"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  >
                    <option value="UN">UN</option>
                    <option value="KG">KG</option>
                    <option value="LT">LT</option>
                    <option value="MT">MT</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <input
                    type="text"
                    id="categoria"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/produtos"
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

