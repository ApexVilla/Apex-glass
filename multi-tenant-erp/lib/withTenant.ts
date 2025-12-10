import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'

export interface TenantContext {
  tenantId: string
  userId: string
  userEmail: string
  userRole: string
}

/**
 * Middleware helper para obter tenant_id do usuário logado
 * Redireciona para login se não autenticado
 */
export async function withTenant(): Promise<TenantContext> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Buscar profile com tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  return {
    tenantId: profile.tenant_id,
    userId: user.id,
    userEmail: user.email || '',
    userRole: profile.role || 'user'
  }
}

/**
 * Verifica se o usuário tem permissão (role específico)
 */
export async function requireRole(allowedRoles: string[]): Promise<TenantContext> {
  const context = await withTenant()
  
  if (!allowedRoles.includes(context.userRole)) {
    redirect('/dashboard')
  }

  return context
}

