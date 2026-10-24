import { supabase } from '../../../lib/supabaseClient'

export interface NovaConversaConnection {
  id: string
  nome: string
  telefone: string | null
  status: string
}

export interface NovaConversaResponsible {
  id: string
  nome: string
  email: string
  tipo_usuario: string
  funcao_equipe: string | null
}

export interface NovaConversaContext {
  userId: string
  corretoraId: string
  tipoUsuario: 'CORRETORA' | 'CORRETOR' | 'ADMIN'
  connections: NovaConversaConnection[]
}

interface PerfilLogado {
  id: string
  corretora_id: string | null
  tipo_usuario: 'CORRETORA' | 'CORRETOR' | 'ADMIN'
  ativo: boolean
}

export async function buscarContextoNovaConversa(): Promise<NovaConversaContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw authError
  if (!user?.id) throw new Error('Usuário não autenticado.')

  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios_perfis')
    .select('id, corretora_id, tipo_usuario, ativo')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError
  if (!perfil) throw new Error('Perfil não encontrado.')
  if (perfil.ativo !== true) throw new Error('Usuário inativo.')

  const perfilLogado = perfil as PerfilLogado

  const corretoraId =
    perfilLogado.tipo_usuario === 'CORRETORA'
      ? perfilLogado.id
      : perfilLogado.corretora_id

  if (!corretoraId) {
    throw new Error('Corretora do usuário não encontrada.')
  }

  if (
    perfilLogado.tipo_usuario === 'CORRETORA' ||
    perfilLogado.tipo_usuario === 'ADMIN'
  ) {
    const { data, error } = await supabase
      .from('whatsapp_instancias')
      .select('id, nome, telefone, status')
      .eq('corretora_id', corretoraId)
      .eq('ativo', true)
      .eq('status', 'conectada')
      .order('nome', { ascending: true })

    if (error) throw error

    return {
      userId: perfilLogado.id,
      corretoraId,
      tipoUsuario: perfilLogado.tipo_usuario,
      connections: (data || []) as NovaConversaConnection[],
    }
  }

  const { data: vinculos, error: vinculosError } = await supabase
    .from('whatsapp_instancias_usuarios')
    .select('instancia_id')
    .eq('corretora_id', corretoraId)
    .eq('usuario_id', perfilLogado.id)

  if (vinculosError) throw vinculosError

  const instanciaIds = Array.from(
    new Set((vinculos || []).map(item => item.instancia_id))
  )

  if (!instanciaIds.length) {
    return {
      userId: perfilLogado.id,
      corretoraId,
      tipoUsuario: perfilLogado.tipo_usuario,
      connections: [],
    }
  }

  const { data: instancias, error: instanciasError } = await supabase
    .from('whatsapp_instancias')
    .select('id, nome, telefone, status')
    .eq('corretora_id', corretoraId)
    .eq('ativo', true)
    .eq('status', 'conectada')
    .in('id', instanciaIds)
    .order('nome', { ascending: true })

  if (instanciasError) throw instanciasError

  return {
    userId: perfilLogado.id,
    corretoraId,
    tipoUsuario: perfilLogado.tipo_usuario,
    connections: (instancias || []) as NovaConversaConnection[],
  }
}

export async function buscarResponsaveisDaConexao(
  connectionId: string
): Promise<NovaConversaResponsible[]> {
  if (!connectionId) return []

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw authError
  if (!user?.id) throw new Error('Usuário não autenticado.')

  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios_perfis')
    .select('id, corretora_id, tipo_usuario, ativo')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError
  if (!perfil) throw new Error('Perfil não encontrado.')

  const perfilLogado = perfil as PerfilLogado

  const corretoraId =
    perfilLogado.tipo_usuario === 'CORRETORA'
      ? perfilLogado.id
      : perfilLogado.corretora_id

  if (!corretoraId) {
    throw new Error('Corretora do usuário não encontrada.')
  }

  /*
   * CORRETOR:
   * ao iniciar uma conversa manualmente, ela nasce atribuída a ele.
   */
  if (perfilLogado.tipo_usuario === 'CORRETOR') {
    const { data, error } = await supabase
      .from('usuarios_perfis')
      .select('id, nome, email, tipo_usuario, funcao_equipe')
      .eq('id', perfilLogado.id)
      .eq('ativo', true)
      .single()

    if (error) throw error

    return data
      ? [data as NovaConversaResponsible]
      : []
  }

  /*
   * CORRETORA/ADMIN:
   * pode escolher a própria corretora ou qualquer operador
   * autorizado para esta conexão.
   */
  const { data: vinculos, error: vinculosError } = await supabase
    .from('whatsapp_instancias_usuarios')
    .select('usuario_id')
    .eq('corretora_id', corretoraId)
    .eq('instancia_id', connectionId)

  if (vinculosError) throw vinculosError

  const operadorIds = Array.from(
    new Set((vinculos || []).map(item => item.usuario_id))
  )

  const ids = Array.from(
    new Set([
      corretoraId,
      ...operadorIds,
    ])
  )

  if (!ids.length) return []

  const { data, error } = await supabase
    .from('usuarios_perfis')
    .select(`
      id,
      nome,
      email,
      tipo_usuario,
      funcao_equipe
    `)
    .in('id', ids)
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (error) throw error

  return (data || []) as NovaConversaResponsible[]
}