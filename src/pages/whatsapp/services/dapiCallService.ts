import { supabase } from '../../../lib/supabaseClient'

interface DapiCallStartResponse {
  success: boolean
  callId?: string
  wsUrl?: string
  error?: string
  provider?: unknown
}

export interface DapiCallSession {
  callId: string
  wsUrl: string
  instanciaId: string
}

export async function iniciarChamadaDapi(
  corretoraId: string,
  phone: string
): Promise<DapiCallSession> {
  const telefone = phone.replace(/\D/g, '')

  if (!corretoraId) {
    throw new Error('Corretora não identificada.')
  }

  if (!telefone) {
    throw new Error('O contato não possui um telefone válido.')
  }

  const { data: instancia, error: instanciaError } =
    await supabase
      .from('whatsapp_instancias')
      .select(
        'id, provider, provider_instance_id, status, ativo, padrao_envio'
      )
      .eq('corretora_id', corretoraId)
      .eq('provider', 'dapi')
      .eq('padrao_envio', true)
      .eq('ativo', true)
      .maybeSingle()

  if (instanciaError) {
    console.error(
      'Erro ao localizar instância D-API:',
      instanciaError
    )

    throw new Error(
      'Não foi possível localizar a conexão do WhatsApp.'
    )
  }

  if (!instancia) {
    throw new Error(
      'Nenhuma instância D-API padrão está configurada.'
    )
  }

  if (instancia.status !== 'conectada') {
    throw new Error(
      'A conexão D-API não está conectada.'
    )
  }

  const sessionId =
    instancia.provider_instance_id?.trim()

  if (!sessionId) {
    throw new Error(
      'A sessão D-API não está configurada.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke<DapiCallStartResponse>(
      'dapi-call-start',
      {
        body: {
          sessionId,
          phone: telefone,
        },
      }
    )

  if (error) {
    console.error(
      'Erro ao iniciar chamada D-API:',
      error
    )

    throw new Error(
      'Não foi possível iniciar a ligação.'
    )
  }

  if (
    !data?.success ||
    !data.callId ||
    !data.wsUrl
  ) {
    throw new Error(
      data?.error ||
        'A D-API não confirmou o início da ligação.'
    )
  }

  return {
    callId: data.callId,
    wsUrl: data.wsUrl,
    instanciaId: instancia.id,
  }
}