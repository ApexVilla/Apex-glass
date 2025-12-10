import { redirect } from 'next/navigation'
import { withTenant } from '@/lib/withTenant'
import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ContasReceberPage() {
  const { tenantId, userEmail } = await withTenant()
  const supabase = await createClient()

  const { data: contas, error } = await supabase
    .from('contas_receber')
    .select('*')
    .order('data_vencimento', { ascending: true })

  if (error) {
    console.error('Error loading contas_receber:', error)
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
              <h1 className="text-xl font-bold text-gray-900">Contas a Receber</h1>
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
            <h2 className="text-2xl font-bold text-gray-900">Lista de Contas a Receber</h2>
            <Link
              href="/contas-receber/nova"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Nova Conta
            </Link>
          </div>

          {contas && contas.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {contas.map((conta) => (
                  <li key={conta.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {conta.descricao} - {conta.cliente_nome}
                          </p>
                          <p className="text-sm text-gray-500">
                            Vencimento: {format(new Date(conta.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                            {conta.data_pagamento && ` | Pago em: ${format(new Date(conta.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              conta.status === 'pago'
                                ? 'bg-green-100 text-green-800'
                                : conta.status === 'vencido'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {conta.status}
                          </span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              R$ {Number(conta.valor_total).toFixed(2)}
                            </p>
                            {conta.valor_pendente > 0 && (
                              <p className="text-xs text-gray-500">
                                Pendente: R$ {Number(conta.valor_pendente).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">Nenhuma conta a receber cadastrada ainda.</p>
              <Link
                href="/contas-receber/nova"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Criar primeira conta
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

