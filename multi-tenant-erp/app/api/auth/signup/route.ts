import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, tenantName, tenantSlug } = body

    // Validações
    if (!email || !password || !fullName || !tenantName || !tenantSlug) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Usar service_role para criar usuário e tenant
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch (configError: any) {
      return NextResponse.json(
        { error: configError.message || 'Erro de configuração do Supabase' },
        { status: 500 }
      )
    }

    // 1. Criar empresa na tabela companies (sistema principal)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: tenantName,
        email: email, // Email do admin
      })
      .select()
      .single()

    if (companyError) {
      // Se nome já existe, retornar erro
      if (companyError.code === '23505') {
        return NextResponse.json(
          { error: 'Esta empresa já está cadastrada. Escolha outro nome.' },
          { status: 400 }
        )
      }
      throw companyError
    }

    // 2. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
    })

    if (authError) throw authError

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // 3. Criar profile ligando usuário à empresa (company_id em vez de tenant_id)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        company_id: company.id, // Usa company_id (sistema principal)
        email,
        full_name: fullName,
        role: 'admin', // Primeiro usuário é admin
      })

    if (profileError) {
      // Se der erro, deletar usuário criado
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    // 4. Criar role de admin para o usuário
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin',
        company_id: company.id,
      })

    if (roleError) {
      console.error('Erro ao criar role:', roleError)
      // Não falha, mas loga o erro
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
      userId: authData.user.id,
      companyId: company.id,
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Mensagens de erro mais específicas
    let errorMessage = 'Erro ao criar conta'
    
    if (error.message) {
      errorMessage = error.message
    } else if (error.code) {
      errorMessage = `Erro do banco: ${error.code} - ${error.message || 'Erro desconhecido'}`
    }
    
    // Verificar se é erro de configuração
    if (error.message?.includes('NEXT_PUBLIC_SUPABASE_URL') || 
        error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      errorMessage = 'Erro de configuração: Verifique as variáveis de ambiente no .env.local'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

