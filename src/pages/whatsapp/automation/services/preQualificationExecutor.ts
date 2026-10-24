import { supabase } from "../../../../lib/supabaseClient"
import { SupabaseWhatsAppProvider } from '../../providers/SupabaseWhatsAppProvider'

interface StartPreQualificationParams {
  conversationId: string
  userProfile: any
}

interface PreQualificationStoredConfig {
  welcomeMessage?: string
  introductionMessage?: string
  nameQuestion?: string
  emailQuestion?: string
  productQuestion?: string
  completionMessage?: string
  products?: Array<{
    id: string
    name: string
    enabled: boolean
    order: number
  }>
}

function getEffectiveCorretoraId(userProfile: any): string {
  if (!userProfile?.id) {
    throw new Error('Perfil do usuário não encontrado.')
  }

  if (userProfile.tipo_usuario === 'CORRETORA') {
    return userProfile.id
  }

  if (!userProfile.corretora_id) {
    throw new Error('Corretora do usuário não encontrada.')
  }

  return userProfile.corretora_id
}

function replaceVariables(
  text: string,
  variables: {
    nome?: string
    corretora?: string
    corretor?: string
  },
) {
  return text
    .replace(/\{nome\}/g, variables.nome || '')
    .replace(/\{corretora\}/g, variables.corretora || '')
    .replace(/\{corretor\}/g, variables.corretor || '')
}

export async function startRealPreQualification({
  conversationId,
  userProfile,
}: StartPreQualificationParams) {
  if (!conversationId) {
    throw new Error('Conversa não informada.')
  }

  const corretoraId = getEffectiveCorretoraId(userProfile)

  const { data: conversation, error: conversationError } = await supabase
    .from('whatsapp_conversas')
    .select(`
      id,
      corretora_id,
      contato:whatsapp_contatos (
        id,
        nome
      )
    `)
    .eq('id', conversationId)
    .single()

  if (conversationError || !conversation) {
    console.error('Erro ao buscar conversa para pré-qualificação:', conversationError)
    throw new Error('Conversa não encontrada.')
  }

  if (conversation.corretora_id !== corretoraId) {
    throw new Error('A conversa não pertence à corretora do usuário.')
  }

  const { data: automationConfig, error: configError } = await supabase
    .from('whatsapp_automacoes_config')
    .select('id, ativo, configuracao')
    .eq('corretora_id', corretoraId)
    .eq('tipo', 'pre_qualification')
    .maybeSingle()

  if (configError) {
    console.error('Erro ao buscar configuração da pré-qualificação:', configError)
    throw new Error('Não foi possível carregar a configuração da pré-qualificação.')
  }

  if (!automationConfig) {
    throw new Error('A pré-qualificação ainda não foi configurada.')
  }

  if (!automationConfig.ativo) {
    throw new Error('A pré-qualificação está desativada.')
  }

  const config = automationConfig.configuracao as PreQualificationStoredConfig

  const { data: existingSession, error: existingSessionError } = await supabase
    .from('whatsapp_automacoes_sessoes')
    .select('id, status, etapa_atual')
    .eq('conversa_id', conversationId)
    .in('status', ['running', 'awaiting_human'])
    .maybeSingle()

  if (existingSessionError) {
    console.error('Erro ao verificar sessão existente:', existingSessionError)
    throw new Error('Não foi possível verificar a automação desta conversa.')
  }

  if (existingSession) {
    throw new Error('Esta conversa já possui uma automação em andamento.')
  }

  const { data: session, error: sessionError } = await supabase
    .from('whatsapp_automacoes_sessoes')
    .insert({
      corretora_id: corretoraId,
      conversa_id: conversationId,
      tipo: 'pre_qualification',
      status: 'running',
      etapa_atual: 1,
      dados: {
        nome: null,
        email: null,
        produto: null,
      },
      iniciado_por: userProfile.id,
    })
    .select('id, status, etapa_atual')
    .single()

  if (sessionError || !session) {
    console.error('Erro ao criar sessão de pré-qualificação:', sessionError)
    throw new Error('Não foi possível iniciar a pré-qualificação.')
  }

  const contact = Array.isArray(conversation.contato)
    ? conversation.contato[0]
    : conversation.contato

  const variables = {
    nome: contact?.nome || '',
    corretora: userProfile.tipo_usuario === 'CORRETORA'
      ? userProfile.nome || ''
      : '',
    corretor: userProfile.nome || '',
  }

  const provider = new SupabaseWhatsAppProvider()

  const initialMessages = [
    config.welcomeMessage,
    config.introductionMessage,
    config.nameQuestion,
  ]
    .filter((message): message is string => Boolean(message?.trim()))
    .map(message => replaceVariables(message, variables).trim())
    .filter(Boolean)

  try {
    for (const text of initialMessages) {
      await provider.sendMessage({
        conversationId,
        type: 'text',
        text,
      })
    }

    return session
  } catch (error) {
    await supabase
      .from('whatsapp_automacoes_sessoes')
      .update({
        status: 'cancelled',
        finalizado_em: new Date().toISOString(),
      })
      .eq('id', session.id)

    throw error
  }
}