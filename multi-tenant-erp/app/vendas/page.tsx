import { redirect } from 'next/navigation'
import { withTenant } from '@/lib/withTenant'
import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function VendasPage() {
  const { tenantId, userEmail } = await withTenant()
  const supabase = await createClient()

  const { data: vendas, error } = await supabase
    .from('vendas')
    .select('*')
    .order('data_venda', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error loading vendas:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Vendas</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{userEmail}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Lista de Vendas</h2>
            <Link
              href="/vendas/nova"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Nova Venda
            </Link>
          </div>

          {vendas && vendas.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {vendas.map((venda) => (
                  <li key={venda.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Venda #{venda.numero}
                          </p>
                          <p className="text-sm text-gray-500">
                            {venda.cliente_nome || 'Cliente não informado'} |{' '}
                            {format(new Date(venda.data_venda), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              venda.status === 'pago'
                                ? 'bg-green-100 text-green-800'
                                : venda.status === 'pendente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {venda.status}
                          </span>
                          <p className="text-sm font-medium text-gray-900">
                            R$ {Number(venda.valor_final).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">Nenhuma venda cadastrada ainda.</p>
              <Link
                href="/vendas/nova"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Criar primeira venda
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

