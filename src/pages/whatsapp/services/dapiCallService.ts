import { supabase } from '../../../lib/supabaseClient'

interface DapiCallStartResponse {
  success: boolean
  callId?: string
  wsUrl?: string
  instanciaId?: string
  error?: string
}

export interface DapiCallSession {
  callId: string
  wsUrl: string
  instanciaId: string
}

/** A Edge obtém usuário, destinatário e sessão diretamente do Supabase. */
export async function iniciarChamadaDapi(conversationId: string): Promise<DapiCallSession> {
  if (!conversationId) throw new Error('Conversa não identificada.')

  const { data, error } = await supabase.functions.invoke<DapiCallStartResponse>(
    'dapi-call-start',
    { body: { conversationId } }
  )

  if (error || !data?.success || !data.callId || !data.wsUrl || !data.instanciaId) {
    console.error('Erro ao iniciar chamada D-API:', error || data?.error)
    throw new Error(data?.error || 'Não foi possível iniciar a ligação.')
  }
  return { callId: data.callId, wsUrl: data.wsUrl, instanciaId: data.instanciaId }
}
