import { redirect } from 'next/navigation'
import { withTenant } from '@/lib/withTenant'
import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPage() {
  const { tenantId, userId, userEmail, userRole } = await withTenant()
  const supabase = await createClient()

  // Buscar dados do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', tenantId)
    .single()

  // Estatísticas rápidas
  const [produtosCount, vendasCount, fornecedoresCount] = await Promise.all([
    supabase
      .from('produtos')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('vendas')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('fornecedores')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                {tenant?.name || 'Dashboard'}
              </h1>
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="mt-1 text-sm text-gray-600">
              Bem-vindo ao sistema multi-tenant ERP
            </p>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {produtosCount.count || 0}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Produtos
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {vendasCount.count || 0}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Vendas
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {fornecedoresCount.count || 0}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Fornecedores
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {userRole}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Seu Perfil
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Links Rápidos */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/produtos"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition"
            >
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">Produtos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Gerenciar produtos e estoque
                </p>
              </div>
            </Link>

            <Link
              href="/vendas"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition"
            >
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">Vendas</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Criar e gerenciar vendas
                </p>
              </div>
            </Link>

            <Link
              href="/fornecedores"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition"
            >
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Fornecedores
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cadastrar fornecedores
                </p>
              </div>
            </Link>

            <Link
              href="/contas-receber"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition"
            >
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Contas a Receber
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Gerenciar recebimentos
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

