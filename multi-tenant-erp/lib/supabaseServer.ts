import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Client com service_role para operações administrativas
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variáveis de ambiente não configuradas: ' +
      `NEXT_PUBLIC_SUPABASE_URL=${!!supabaseUrl}, ` +
      `SUPABASE_SERVICE_ROLE_KEY=${!!serviceRoleKey}`
    )
  }

  // Verificar se são valores placeholder
  if (supabaseUrl.includes('seu-projeto') || 
      serviceRoleKey.includes('sua-chave') || 
      serviceRoleKey.includes('COLE_AQUI')) {
    throw new Error(
      'Variáveis de ambiente ainda contêm valores placeholder. ' +
      'Configure os valores reais do Supabase no arquivo .env.local'
    )
  }

  // Verificar formato básico da chave
  // Aceita tanto JWT (eyJ...) quanto publishable keys modernas (sb_...)
  const isValidFormat = 
    serviceRoleKey.startsWith('eyJ') || // JWT token (service_role tradicional)
    serviceRoleKey.startsWith('sb_') || // Publishable key moderna
    serviceRoleKey.startsWith('sb_secret_') // Publishable secret key

  if (!isValidFormat) {
    throw new Error(
      'SERVICE_ROLE_KEY parece estar em formato incorreto. ' +
      'A chave deve começar com "eyJ" (JWT), "sb_" ou "sb_secret_" (publishable). ' +
      'Verifique se copiou a chave correta do Supabase Dashboard.'
    )
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

