import { redirect } from 'next/navigation'
import { withTenant } from '@/lib/withTenant'
import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function FornecedoresPage() {
  const { tenantId, userEmail } = await withTenant()
  const supabase = await createClient()

  const { data: fornecedores, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('is_active', true)
    .order('nome')

  if (error) {
    console.error('Error loading fornecedores:', error)
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
              <h1 className="text-xl font-bold text-gray-900">Fornecedores</h1>
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
            <h2 className="text-2xl font-bold text-gray-900">Lista de Fornecedores</h2>
            <Link
              href="/fornecedores/novo"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Novo Fornecedor
            </Link>
          </div>

          {fornecedores && fornecedores.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {fornecedores.map((fornecedor) => (
                  <li key={fornecedor.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {fornecedor.nome}
                          </p>
                          <p className="text-sm text-gray-500">
                            {fornecedor.cnpj && `CNPJ: ${fornecedor.cnpj}`}
                            {fornecedor.email && ` | Email: ${fornecedor.email}`}
                          </p>
                        </div>
                        <div>
                          <Link
                            href={`/fornecedores/${fornecedor.id}/editar`}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Editar
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">Nenhum fornecedor cadastrado ainda.</p>
              <Link
                href="/fornecedores/novo"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Criar primeiro fornecedor
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

