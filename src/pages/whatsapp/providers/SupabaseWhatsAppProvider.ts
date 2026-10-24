import { supabase } from '../../../lib/supabaseClient'

import type {
  SendContactMessageData,
  SendContactMessageResult,
  SendMessageData,
  StartConversationData,
  StartConversationResult,
  WhatsAppConversation,
  WhatsAppMedia,
  WhatsAppMessage,
  WhatsAppAttendant,
  WhatsAppProvider,
  WhatsAppKanbanStage,
  WhatsAppConversationStatus,
  WhatsAppInstanceStatus,
} from '../types/whatsapp'
import { getWhatsAppTransport } from './transports/getWhatsAppTransport'
import type { WhatsAppTransportName } from './transports/WhatsAppTransport'
import { getBrazilPhoneVariants, normalizeWhatsAppPhone } from '../utils/whatsappPhone'


interface SupabaseMidia {
  id: string
  type: 'image' | 'audio' | 'video' | 'document'
  name: string | null
  size: number | null
  mime_type: string | null
  storage_path: string | null
  provider_url: string | null
}

interface SupabaseMensagem {
  id: string
  conversa_id: string
  direction: 'inbound' | 'outbound'
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  text: string | null
  timestamp: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sender_name: string | null
  provider_message_id?: string | null
  provider_command_id?: string | null
  whatsapp_midias?: SupabaseMidia[]
}

interface InboxConversationRpcRow {
  id: string
  status: WhatsAppConversationStatus
  responsavel_id: string | null
  unread_count: number
  ultima_mensagem_at: string | null
  updated_at: string
  contato_id: string
  corretora_id: string

  classificacao:
    | 'NAO_QUALIFICADO'
    | 'LEAD'
    | null

  etapa_kanban:
    | WhatsAppKanbanStage
    | null

  posicao_kanban:
    | number
    | null

  instancia_id: string | null
  instancia_ativa: boolean | null
  instancia_status: WhatsAppInstanceStatus | null
  instancia_nome: string | null
  instancia_telefone: string | null

  contato: {
    id: string
    nome: string
    telefone: string
    avatar_url: string | null
    cliente_id: string | null
    cliente_tipo:
      | 'PESSOA'
      | 'EMPRESA'
      | null
    classificacao:
      | 'NAO_QUALIFICADO'
      | 'LEAD'
      | null
    temperatura:
      | 'FRIO'
      | 'MORNO'
      | 'QUENTE'
      | null
  }

  ultima_mensagem: {
    id: string
    conversa_id: string
    direction: 'inbound' | 'outbound'
    type: 'text' | 'image' | 'audio' | 'video' | 'document'
    text: string | null
    timestamp: string
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
    sender_name: string | null
    provider_message_id: string | null

    media: {
      id: string
      type: 'image' | 'audio' | 'video' | 'document'
      name: string | null
      size: number | null
    } | null
  } | null
}

interface B2UploadResponse {

  success?: boolean

  storagePath?: string

  uploadUrl?: string

  readUrl?: string

  error?: string

}

interface B2ReadBatchResponse {

  success?: boolean

  files?: Array<{ storagePath: string; readUrl: string }>

  error?: string

}

function mapMidiaToWhatsAppMedia(
  midia?: SupabaseMidia,
  readUrls?: Map<string, string>
): WhatsAppMedia | undefined {
  if (!midia) return undefined

  const url = midia.storage_path
    ? readUrls?.get(midia.storage_path) || midia.provider_url || ''
    : midia.provider_url || ''

  return {
    url,
    type: midia.type,
    name: midia.name || undefined,
    size: midia.size || undefined,
  }
}

const B2_READ_URL_CACHE_TTL_MS = 50 * 60 * 1000



interface B2ReadUrlCacheEntry {

  url: string

  expiresAt: number

}



const b2ReadUrlCache = new Map<string, B2ReadUrlCacheEntry>()



function getCachedB2ReadUrl(storagePath: string): string | undefined {

  const cached = b2ReadUrlCache.get(storagePath)



  if (!cached) return undefined



  if (cached.expiresAt <= Date.now()) {

    b2ReadUrlCache.delete(storagePath)

    return undefined

  }



  return cached.url

}



function setCachedB2ReadUrl(storagePath: string, url: string): void {

  b2ReadUrlCache.set(storagePath, {

    url,

    expiresAt: Date.now() + B2_READ_URL_CACHE_TTL_MS,

  })

}



async function createB2ReadUrlMap(

  midias: SupabaseMidia[]

): Promise<Map<string, string>> {

  const storagePaths = [

    ...new Set(

      midias

        .map(midia => midia.storage_path?.trim())

        .filter((path): path is string => Boolean(path))

    ),

  ]



  const readUrls = new Map<string, string>()

  const pathsToSign: string[] = []



  for (const storagePath of storagePaths) {

    const cachedUrl = getCachedB2ReadUrl(storagePath)



    if (cachedUrl) {

      readUrls.set(storagePath, cachedUrl)

    } else {

      pathsToSign.push(storagePath)

    }

  }



  if (!pathsToSign.length) return readUrls



  for (let index = 0; index < pathsToSign.length; index += 100) {

    const batch = pathsToSign.slice(index, index + 100)



    const { data, error } = await supabase.functions.invoke('b2-media', {

      body: {

        action: 'create-read-batch',

        storagePaths: batch,

      },

    })



    if (error) {

      console.error(

        '❌ SupabaseWhatsAppProvider → erro ao gerar URLs de leitura B2:',

        error

      )

      continue

    }



    const response = data as B2ReadBatchResponse | null



    if (!response || response.success === false || response.error) {

      console.error(

        '❌ SupabaseWhatsAppProvider → B2 não confirmou URLs de leitura:',

        response?.error || 'Resposta inválida.'

      )

      continue

    }



    for (const file of response.files || []) {

      if (!file.storagePath || !file.readUrl) continue



      readUrls.set(file.storagePath, file.readUrl)

      setCachedB2ReadUrl(file.storagePath, file.readUrl)

    }

  }



  return readUrls

}



async function finalizeWhatsAppMediaInStorage(
  mediaId: string
): Promise<boolean> {
  if (!mediaId) return false

  try {
    const { data, error } = await supabase.functions.invoke(
      'b2-media',
      {
        body: {
          action: 'whatsapp-finalize',
          mediaId,
        },
      }
    )

    if (error) {
      console.error(
        '❌ Central Storage → erro ao finalizar mídia WhatsApp:',
        {
          mediaId,
          error,
        }
      )
      return false
    }

    const response = data as
      | {
          success?: boolean
          error?: string
          alreadyFinalized?: boolean
          arquivo?: {
            id?: string
            storage_path?: string
            tamanho_bytes?: number
          }
        }
      | null

    if (
      !response ||
      response.success === false ||
      response.error
    ) {
      console.error(
        '❌ Central Storage → mídia não foi catalogada:',
        {
          mediaId,
          response,
        }
      )
      return false
    }

    console.log(
      '✅ Central Storage → mídia WhatsApp catalogada:',
      {
        mediaId,
        arquivoId: response.arquivo?.id,
        storagePath:
          response.arquivo?.storage_path,
        tamanhoBytes:
          response.arquivo?.tamanho_bytes,
        alreadyFinalized:
          response.alreadyFinalized === true,
      }
    )

    return true
  } catch (error) {
    console.error(
      '❌ Central Storage → falha inesperada ao finalizar mídia:',
      {
        mediaId,
        error,
      }
    )
    return false
  }
}

export class SupabaseWhatsAppProvider implements WhatsAppProvider {

 async getConversations(): Promise<WhatsAppConversation[]> {
  const { data, error } = await supabase.rpc(
    'whatsapp_listar_conversas_inbox'
  )

  if (error) {
    console.error(
      '❌ SupabaseWhatsAppProvider.getConversations:',
      error
    )
    throw error
  }

  const rows =
    (data || []) as InboxConversationRpcRow[]

  return rows.map(row => {
    const mensagem = row.ultima_mensagem
    const media = mensagem?.media

    return {
      id: row.id,

      contact: {
        id: row.contato.id,
        name: row.contato.nome,
        phone: row.contato.telefone,

        ...(row.contato.avatar_url
          ? {
              avatar: row.contato.avatar_url,
            }
          : {}),

        clienteId:
          row.contato.cliente_id || undefined,

        clienteTipo:
          row.contato.cliente_tipo || undefined,

        classificacao:
          row.contato.classificacao || undefined,

        temperatura:
          row.contato.temperatura || undefined,
      },

      assignedUserId:
        row.responsavel_id || undefined,

      lastMessage: mensagem
        ? {
            id: mensagem.id,
            conversationId:
              mensagem.conversa_id,
            direction:
              mensagem.direction,
            type:
              mensagem.type,
            text:
              mensagem.text || undefined,

            media: media
              ? {
                  url: '',
                  type: media.type,
                  name: media.name || undefined,
                  size: media.size || undefined,
                }
              : undefined,

            timestamp:
              mensagem.timestamp,

            status:
              mensagem.status,

            senderName:
              mensagem.sender_name || undefined,
          }
        : undefined,

      unreadCount:
        row.unread_count,

      updatedAt:
        row.ultima_mensagem_at ||
        row.updated_at,

      etapaKanban:
        row.etapa_kanban ?? 'prospeccao',

      posicaoKanban:
        typeof row.posicao_kanban === 'number'
          ? row.posicao_kanban
          : 0,

      status:
        row.status,

      instanceId:
        row.instancia_id || undefined,

      instanceActive:
        typeof row.instancia_ativa === 'boolean'
          ? row.instancia_ativa
          : undefined,

      instanceStatus:
        row.instancia_status || undefined,

      instanceName:
        row.instancia_nome || undefined,

      instancePhone:
        row.instancia_telefone || undefined,
    }
  })
}

  async getMessages(
    conversationId: string
  ): Promise<WhatsAppMessage[]> {
    const { data, error } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        id,
        conversa_id,
        direction,
        type,
        text,
        timestamp,
        status,
        sender_name,
        whatsapp_midias (
          id,
          type,
          name,
          size,
          storage_path,
          provider_url
        )
      `)
      .eq('conversa_id', conversationId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('❌ SupabaseWhatsAppProvider.getMessages:', error)
      throw error
    }

    const mensagens = (data || []) as SupabaseMensagem[]

    const midias = mensagens
      .map(mensagem => mensagem.whatsapp_midias?.[0])
      .filter((midia): midia is SupabaseMidia => Boolean(midia))

    const readUrls = await createB2ReadUrlMap(midias)

    return mensagens.map(mensagem => ({
      id: mensagem.id,
      conversationId: mensagem.conversa_id,
      direction: mensagem.direction,
      type: mensagem.type,
      text: mensagem.text || undefined,
      media: mapMidiaToWhatsAppMedia(
        mensagem.whatsapp_midias?.[0],
        readUrls
      ),
      timestamp: mensagem.timestamp,
      status: mensagem.status,
      senderName: mensagem.sender_name || undefined,
    }))
  }

  async startConversation(
  data: StartConversationData
): Promise<StartConversationResult> {
  const name = data.name?.trim()
  const phone = normalizeWhatsAppPhone(data.phone)
  const phoneVariants = getBrazilPhoneVariants(phone)
  const instanceId = data.instanceId?.trim()
  const assignedUserId = data.assignedUserId?.trim() || null

  if (!name) {
    throw new Error('Informe o nome do contato.')
  }

  if (!instanceId) {
    throw new Error('Selecione uma conexão WhatsApp.')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error(
      '❌ startConversation → autenticação:',
      authError
    )
    throw authError
  }

  if (!user?.id) {
    throw new Error('Usuário não autenticado.')
  }

  const {
    data: perfil,
    error: perfilError,
  } = await supabase
    .from('usuarios_perfis')
    .select(`
      id,
      corretora_id,
      tipo_usuario,
      ativo
    `)
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil) {
    console.error(
      '❌ startConversation → perfil:',
      perfilError
    )

    throw new Error(
      'Perfil do usuário não encontrado.'
    )
  }

  if (perfil.ativo !== true) {
    throw new Error(
      'Seu usuário está inativo.'
    )
  }

  const corretoraId =
    perfil.tipo_usuario === 'CORRETORA'
      ? perfil.id
      : perfil.corretora_id

  if (!corretoraId) {
    throw new Error(
      'Corretora do usuário não encontrada.'
    )
  }

  const {
    data: instancia,
    error: instanciaError,
  } = await supabase
    .from('whatsapp_instancias')
    .select(`
      id,
      corretora_id,
      nome,
      telefone,
      status,
      ativo
    `)
    .eq('id', instanceId)
    .eq('corretora_id', corretoraId)
    .maybeSingle()

  if (instanciaError) {
    console.error(
      '❌ startConversation → instância:',
      instanciaError
    )
    throw instanciaError
  }

  if (!instancia) {
    throw new Error(
      'A conexão WhatsApp selecionada não foi encontrada.'
    )
  }

  if (!instancia.ativo) {
    throw new Error(
      'A conexão WhatsApp selecionada está inativa.'
    )
  }

  if (instancia.status !== 'conectada') {
    throw new Error(
      'A conexão WhatsApp selecionada não está conectada.'
    )
  }

  /*
   * CORRETORA possui acesso master.
   * Demais usuários precisam estar vinculados à conexão.
   */
  if (perfil.tipo_usuario !== 'CORRETORA') {
    const {
      data: permissao,
      error: permissaoError,
    } = await supabase
      .from('whatsapp_instancias_usuarios')
      .select('id')
      .eq('corretora_id', corretoraId)
      .eq('instancia_id', instanceId)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (permissaoError) {
      console.error(
        '❌ startConversation → permissão da conexão:',
        permissaoError
      )
      throw permissaoError
    }

    if (!permissao) {
      throw new Error(
        'Você não possui permissão para operar esta conexão WhatsApp.'
      )
    }
  }

  /*
   * Se houver responsável, validamos:
   * - usuário ativo;
   * - mesma corretora;
   * - e, se não for a própria CORRETORA,
   *   precisa ser operador autorizado da conexão.
   */
  if (assignedUserId) {
    const {
      data: responsavel,
      error: responsavelError,
    } = await supabase
      .from('usuarios_perfis')
      .select(`
        id,
        corretora_id,
        tipo_usuario,
        ativo
      `)
      .eq('id', assignedUserId)
      .maybeSingle()

    if (responsavelError) {
      console.error(
        '❌ startConversation → responsável:',
        responsavelError
      )
      throw responsavelError
    }

    if (!responsavel || responsavel.ativo !== true) {
      throw new Error(
        'O responsável selecionado não está disponível.'
      )
    }

    const responsavelCorretoraId =
      responsavel.tipo_usuario === 'CORRETORA'
        ? responsavel.id
        : responsavel.corretora_id

    if (responsavelCorretoraId !== corretoraId) {
      throw new Error(
        'O responsável selecionado não pertence a esta corretora.'
      )
    }

    if (responsavel.tipo_usuario !== 'CORRETORA') {
      const {
        data: permissaoResponsavel,
        error: permissaoResponsavelError,
      } = await supabase
        .from('whatsapp_instancias_usuarios')
        .select('id')
        .eq('corretora_id', corretoraId)
        .eq('instancia_id', instanceId)
        .eq('usuario_id', assignedUserId)
        .maybeSingle()

      if (permissaoResponsavelError) {
        console.error(
          '❌ startConversation → permissão do responsável:',
          permissaoResponsavelError
        )
        throw permissaoResponsavelError
      }

      if (!permissaoResponsavel) {
        throw new Error(
          'O responsável selecionado não possui permissão para operar esta conexão.'
        )
      }
    }
  }

  /*
   * 1. Localiza contato existente.
   */
  const {
    data: contatosExistentes,
    error: contatoBuscaError,
  } = await supabase
    .from('whatsapp_contatos')
    .select(`
      id,
      nome,
      telefone,
      created_at
    `)
    .eq('corretora_id', corretoraId)
    .in('telefone', phoneVariants)
    .order('created_at', {
      ascending: true,
    })
    .limit(1)

const contatoExistente =
  contatosExistentes?.[0] || null

  if (contatoBuscaError) {
    console.error(
      '❌ startConversation → buscar contato:',
      contatoBuscaError
    )
    throw contatoBuscaError
  }

  let contactId = contatoExistente?.id || ''
  let contactCreated = false

  /*
   * 2. Cria somente se ainda não existir.
   */
  if (!contactId) {
    const {
      data: novoContato,
      error: contatoInsertError,
    } = await supabase
      .from('whatsapp_contatos')
      .insert({
        corretora_id: corretoraId,
        nome: name,
        telefone: phone,
      })
      .select(`
        id,
        nome,
        telefone
      `)
      .single()

    if (contatoInsertError || !novoContato) {
      console.error(
        '❌ startConversation → criar contato:',
        contatoInsertError
      )

      /*
       * Proteção para dois usuários tentando cadastrar
       * o mesmo número praticamente ao mesmo tempo.
       */
      if (contatoInsertError?.code === '23505') {
        const {
          data: contatoConcorrente,
          error: concorrenteError,
        } = await supabase
          .from('whatsapp_contatos')
          .select('id')
          .eq('corretora_id', corretoraId)
          .eq('telefone', phone)
          .single()

        if (concorrenteError || !contatoConcorrente) {
          throw (
            concorrenteError ||
            contatoInsertError
          )
        }

        contactId = contatoConcorrente.id
      } else {
        throw (
          contatoInsertError ||
          new Error(
            'Não foi possível criar o contato.'
          )
        )
      }
    } else {
      contactId = novoContato.id
      contactCreated = true
    }
  }

  /*
   * 3. Procura conversa ativa deste contato
   *    especificamente nesta conexão.
   *
   * Mesmo contato + outra conexão
   * continua podendo ter outra conversa ativa.
   */
  const {
    data: conversaExistente,
    error: conversaBuscaError,
  } = await supabase
    .from('whatsapp_conversas')
    .select(`
      id,
      responsavel_id,
      status,
      instancia_id
    `)
    .eq('corretora_id', corretoraId)
    .eq('contato_id', contactId)
    .eq('instancia_id', instanceId)
    .neq('status', 'encerrada')
    .maybeSingle()

  if (conversaBuscaError) {
    console.error(
      '❌ startConversation → buscar conversa:',
      conversaBuscaError
    )
    throw conversaBuscaError
  }

  /*
   * Se já existe conversa ativa nessa conexão,
   * reutilizamos e NÃO alteramos automaticamente
   * o responsável existente.
   */
  if (conversaExistente) {
    return {
      conversationId: conversaExistente.id,
      contactId,
      created: false,
      contactCreated,
    }
  }

  const now = new Date().toISOString()

const conversationId =
  typeof crypto !== 'undefined' &&
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

const {
  error: conversaInsertError,
} = await supabase
  .from('whatsapp_conversas')
  .insert({
    id: conversationId,
    corretora_id: corretoraId,
    contato_id: contactId,
    instancia_id: instanceId,
    responsavel_id: assignedUserId,
    status: 'novo',
    unread_count: 0,
    ultima_mensagem_at: null,
    updated_at: now,
  })

  if (conversaInsertError) {
    console.error(
      '❌ startConversation → criar conversa:',
      conversaInsertError
    )

    /*
     * O índice UNIQUE que já criamos protege contra
     * duas conversas ativas iguais.
     *
     * Se ocorreu concorrência, reaproveitamos a conversa
     * criada pelo outro processo.
     */
    if (conversaInsertError?.code === '23505') {
      const {
        data: conversaConcorrente,
        error: concorrenteError,
      } = await supabase
        .from('whatsapp_conversas')
        .select('id')
        .eq('corretora_id', corretoraId)
        .eq('contato_id', contactId)
        .eq('instancia_id', instanceId)
        .neq('status', 'encerrada')
        .single()

      if (
        concorrenteError ||
        !conversaConcorrente
      ) {
        throw (
          concorrenteError ||
          conversaInsertError
        )
      }

      return {
        conversationId:
          conversaConcorrente.id,
        contactId,
        created: false,
        contactCreated,
      }
    }

    throw (
      conversaInsertError ||
      new Error(
        'Não foi possível criar a conversa.'
      )
    )
  }

  return {
    conversationId,
    contactId,
    created: true,
    contactCreated,
  }
}

async sendContactMessage(
  data: SendContactMessageData
): Promise<SendContactMessageResult> {
  const contactId =
    data.contactId?.trim()

  const instanceId =
    data.instanceId?.trim()

  const assignedUserId =
    data.assignedUserId?.trim() || null

  const text =
    data.text?.trim()

  if (!contactId) {
    throw new Error(
      'Contato não informado.'
    )
  }

  if (!instanceId) {
    throw new Error(
      'Selecione uma conexão WhatsApp.'
    )
  }

  if (!text) {
    throw new Error(
      'A mensagem não pode estar vazia.'
    )
  }

  /*
   * ======================================================
   * USUÁRIO / CORRETORA
   * ======================================================
   */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error(
      '❌ sendContactMessage → autenticação:',
      authError
    )
    throw authError
  }

  if (!user?.id) {
    throw new Error(
      'Usuário não autenticado.'
    )
  }

  const {
    data: perfil,
    error: perfilError,
  } = await supabase
    .from('usuarios_perfis')
    .select(`
      id,
      corretora_id,
      tipo_usuario,
      ativo
    `)
    .eq('id', user.id)
    .single()

  if (
    perfilError ||
    !perfil
  ) {
    console.error(
      '❌ sendContactMessage → perfil:',
      perfilError
    )

    throw new Error(
      'Perfil do usuário não encontrado.'
    )
  }

  if (perfil.ativo !== true) {
    throw new Error(
      'Seu usuário está inativo.'
    )
  }

  const corretoraId =
    perfil.tipo_usuario ===
    'CORRETORA'
      ? perfil.id
      : perfil.corretora_id

  if (!corretoraId) {
    throw new Error(
      'Corretora do usuário não encontrada.'
    )
  }

  /*
   * ======================================================
   * CONTATO
   * ======================================================
   */
  const {
    data: contato,
    error: contatoError,
  } = await supabase
    .from('whatsapp_contatos')
    .select(`
      id,
      corretora_id,
      telefone
    `)
    .eq(
      'id',
      contactId
    )
    .eq(
      'corretora_id',
      corretoraId
    )
    .maybeSingle()

  if (
    contatoError ||
    !contato
  ) {
    console.error(
      '❌ sendContactMessage → contato:',
      contatoError
    )

    throw new Error(
      'Contato não encontrado.'
    )
  }

  const phone =
    normalizeWhatsAppPhone(
      contato.telefone
    )

  /*
   * ======================================================
   * INSTÂNCIA
   * ======================================================
   */
  const {
    data: instancia,
    error: instanciaError,
  } = await supabase
    .from('whatsapp_instancias')
    .select(`
      id,
      corretora_id,
      provider,
      provider_instance_id,
      status,
      ativo
    `)
    .eq(
      'id',
      instanceId
    )
    .eq(
      'corretora_id',
      corretoraId
    )
    .maybeSingle()

  if (instanciaError) {
    console.error(
      '❌ sendContactMessage → instância:',
      instanciaError
    )
    throw instanciaError
  }

  if (!instancia) {
    throw new Error(
      'A conexão WhatsApp selecionada não foi encontrada.'
    )
  }

  if (!instancia.ativo) {
    throw new Error(
      'A conexão WhatsApp selecionada está inativa.'
    )
  }

  if (
    instancia.status !==
    'conectada'
  ) {
    throw new Error(
      'A conexão WhatsApp selecionada não está conectada.'
    )
  }

  /*
   * ======================================================
   * PERMISSÃO DO USUÁRIO NA CONEXÃO
   * ======================================================
   */
  if (
    perfil.tipo_usuario !==
    'CORRETORA'
  ) {
    const {
      data: permissao,
      error: permissaoError,
    } = await supabase
      .from(
        'whatsapp_instancias_usuarios'
      )
      .select('id')
      .eq(
        'corretora_id',
        corretoraId
      )
      .eq(
        'instancia_id',
        instanceId
      )
      .eq(
        'usuario_id',
        user.id
      )
      .maybeSingle()

    if (permissaoError) {
      console.error(
        '❌ sendContactMessage → permissão:',
        permissaoError
      )
      throw permissaoError
    }

    if (!permissao) {
      throw new Error(
        'Você não possui permissão para operar esta conexão WhatsApp.'
      )
    }
  }

  /*
   * ======================================================
   * RESPONSÁVEL
   * ======================================================
   */
  if (assignedUserId) {
    const {
      data: responsavel,
      error: responsavelError,
    } = await supabase
      .from('usuarios_perfis')
      .select(`
        id,
        corretora_id,
        tipo_usuario,
        ativo
      `)
      .eq(
        'id',
        assignedUserId
      )
      .maybeSingle()

    if (responsavelError) {
      console.error(
        '❌ sendContactMessage → responsável:',
        responsavelError
      )
      throw responsavelError
    }

    if (
      !responsavel ||
      responsavel.ativo !== true
    ) {
      throw new Error(
        'O responsável selecionado não está disponível.'
      )
    }

    const responsavelCorretoraId =
      responsavel.tipo_usuario ===
      'CORRETORA'
        ? responsavel.id
        : responsavel.corretora_id

    if (
      responsavelCorretoraId !==
      corretoraId
    ) {
      throw new Error(
        'O responsável selecionado não pertence a esta corretora.'
      )
    }

    if (
      responsavel.tipo_usuario !==
      'CORRETORA'
    ) {
      const {
        data: permissaoResponsavel,
        error:
          permissaoResponsavelError,
      } = await supabase
        .from(
          'whatsapp_instancias_usuarios'
        )
        .select('id')
        .eq(
          'corretora_id',
          corretoraId
        )
        .eq(
          'instancia_id',
          instanceId
        )
        .eq(
          'usuario_id',
          assignedUserId
        )
        .maybeSingle()

      if (
        permissaoResponsavelError
      ) {
        console.error(
          '❌ sendContactMessage → permissão responsável:',
          permissaoResponsavelError
        )
        throw permissaoResponsavelError
      }

      if (!permissaoResponsavel) {
        throw new Error(
          'O responsável selecionado não possui permissão para operar esta conexão.'
        )
      }
    }
  }

  /*
   * ======================================================
   * CONVERSA ATIVA JÁ EXISTE?
   * ======================================================
   */
  const {
    data: conversaExistente,
    error: conversaBuscaError,
  } = await supabase
    .from('whatsapp_conversas')
    .select(`
      id,
      responsavel_id
    `)
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'contato_id',
      contactId
    )
    .eq(
      'instancia_id',
      instanceId
    )
    .neq(
      'status',
      'encerrada'
    )
    .maybeSingle()

  if (conversaBuscaError) {
    console.error(
      '❌ sendContactMessage → buscar conversa:',
      conversaBuscaError
    )
    throw conversaBuscaError
  }

  /*
   * Se a conversa já existe,
   * reutiliza todo o fluxo já
   * homologado de sendMessage().
   */
  if (conversaExistente) {
    const mensagem =
      await this.sendMessage({
        conversationId:
          conversaExistente.id,
        type: 'text',
        text,
      })

    return {
      conversationId:
        conversaExistente.id,
      messageId:
        mensagem.id,
      conversationCreated:
        false,
    }
  }

  /*
   * ======================================================
   * PRIMEIRO ENVIA AO PROVIDER
   * ======================================================
   *
   * Nenhuma conversa foi criada até aqui.
   */
  const transportProvider =
    instancia.provider as
      WhatsAppTransportName

  const transport =
    getWhatsAppTransport(
      transportProvider
    )

  const transportResult =
    await transport.sendText({
      instance: {
        provider:
          transportProvider,
        providerInstanceId:
          instancia.provider_instance_id ||
          null,
      },
      phone,
      text,
    })

  const providerMessageId =
    transportResult.providerMessageId

  if (!providerMessageId) {
    throw new Error(
      `O transporte ${transportProvider} não retornou o ID da mensagem enviada.`
    )
  }

  /*
   * ======================================================
   * SOMENTE AGORA CRIA A CONVERSA
   * ======================================================
   */
  const now =
    new Date().toISOString()

  let conversationId =
    crypto.randomUUID()

  let conversationCreated =
    true

  const {
    error: conversaInsertError,
  } = await supabase
    .from('whatsapp_conversas')
    .insert({
      id:
        conversationId,
      corretora_id:
        corretoraId,
      contato_id:
        contactId,
      instancia_id:
        instanceId,
      responsavel_id:
        assignedUserId,
      status:
        'novo',
      unread_count:
        0,
      ultima_mensagem_at:
        now,
      updated_at:
        now,
    })

  /*
   * Concorrência:
   * outra operação pode ter criado
   * a conversa entre nossa consulta
   * e o INSERT.
   */
  if (conversaInsertError) {
    if (
      conversaInsertError.code !==
      '23505'
    ) {
      console.error(
        '❌ sendContactMessage → criar conversa:',
        conversaInsertError
      )

      throw new Error(
        'A mensagem foi enviada pelo WhatsApp, mas não foi possível criar a conversa no CRM.'
      )
    }

    const {
      data: conversaConcorrente,
      error: concorrenteError,
    } = await supabase
      .from('whatsapp_conversas')
      .select('id')
      .eq(
        'corretora_id',
        corretoraId
      )
      .eq(
        'contato_id',
        contactId
      )
      .eq(
        'instancia_id',
        instanceId
      )
      .neq(
        'status',
        'encerrada'
      )
      .single()

    if (
      concorrenteError ||
      !conversaConcorrente
    ) {
      console.error(
        '❌ sendContactMessage → recuperar conversa concorrente:',
        concorrenteError
      )

      throw new Error(
        'A mensagem foi enviada pelo WhatsApp, mas a conversa não pôde ser recuperada no CRM.'
      )
    }

    conversationId =
      conversaConcorrente.id

    conversationCreated =
      false
  }

  /*
   * ======================================================
   * PERSISTE A PRIMEIRA MENSAGEM
   * ======================================================
   */
  const messageId =
    crypto.randomUUID()

  const {
    data: mensagem,
    error: mensagemError,
  } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      id:
        messageId,
      corretora_id:
        corretoraId,
      conversa_id:
        conversationId,
      instancia_id:
        instanceId,
      provider_message_id:
        providerMessageId,
      provider_command_id:
        null,
      reply_to_provider_message_id:
        null,
      direction:
        'outbound',
      type:
        'text',
      text,
      status:
        'sent',
      timestamp:
        now,
      sender_name:
        null,
    })
    .select('id')
    .single()

  if (
    mensagemError ||
    !mensagem
  ) {
    console.error(
      '❌ sendContactMessage → salvar primeira mensagem:',
      mensagemError
    )

    /*
     * Se nós mesmos acabamos de criar
     * a conversa e a persistência da
     * primeira mensagem falhou,
     * removemos a conversa para não
     * deixar conversa vazia no CRM.
     */
    if (conversationCreated) {
      const {
        error: rollbackError,
      } = await supabase
        .from(
          'whatsapp_conversas'
        )
        .delete()
        .eq(
          'id',
          conversationId
        )

      if (rollbackError) {
        console.error(
          '❌ sendContactMessage → rollback da conversa:',
          rollbackError
        )
      }
    }

    throw new Error(
      'A mensagem foi enviada pelo WhatsApp, mas não pôde ser registrada no CRM.'
    )
  }

  /*
   * Registra que este contato pertence
   * também a esta conexão.
   */
  const {
    error: vinculoError,
  } = await supabase
    .from(
      'whatsapp_contatos_instancias'
    )
    .upsert(
      {
        corretora_id:
          corretoraId,
        contato_id:
          contactId,
        instancia_id:
          instanceId,
        sincronizado_em:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          'contato_id,instancia_id',
      }
    )

  if (vinculoError) {
    console.error(
      '⚠️ sendContactMessage → vínculo contato/instância:',
      vinculoError
    )
  }

  return {
    conversationId,
    messageId:
      mensagem.id,
    conversationCreated,
  }
}

  async sendMessage(
  data: SendMessageData
): Promise<WhatsAppMessage> {
  const perfInicioTotal = performance.now()
  const messageType = data.type || 'text'
  const messageText = data.text?.trim() || ''

  console.log(
    '🧪 SupabaseWhatsAppProvider.sendMessage → reply:',
    {
      conversationId: data.conversationId,
      replyToProviderMessageId:
        data.replyToProviderMessageId,
      text: data.text,
      type: data.type,
    }
  )

  const {
    data: conversa,
    error: conversaError,
  } = await supabase
    .from('whatsapp_conversas')
    .select(`
      id,
      corretora_id,
      contato_id,
      instancia_id
    `)
    .eq('id', data.conversationId)
    .single()

  if (conversaError || !conversa) {
    console.error(
      '❌ SupabaseWhatsAppProvider.sendMessage → conversa:',
      conversaError
    )

    throw new Error(
      'Conversa não encontrada.'
    )
  }

  if (!conversa.instancia_id) {
    throw new Error(
      'Esta conversa é legada e não possui uma conexão WhatsApp vinculada. O envio foi bloqueado para evitar o uso do número incorreto.'
    )
  }

  const {
    data: instancia,
    error: instanciaError,
  } = await supabase
    .from('whatsapp_instancias')
    .select(`
      id,
      corretora_id,
      provider,
      provider_instance_id,
      status,
      ativo,
      padrao_envio
    `)
    .eq(
      'id',
      conversa.instancia_id
    )
    .eq(
      'corretora_id',
      conversa.corretora_id
    )
    .single()

  if (
    instanciaError ||
    !instancia
  ) {
    console.error(
      '❌ SupabaseWhatsAppProvider.sendMessage → instância da conversa:',
      instanciaError
    )

    throw new Error(
      'A conexão WhatsApp vinculada a esta conversa não foi encontrada.'
    )
  }

  if (
    instancia.corretora_id !==
    conversa.corretora_id
  ) {
    throw new Error(
      'A conexão WhatsApp não pertence à corretora desta conversa.'
    )
  }

  if (!instancia.ativo) {
    throw new Error(
      'A conexão WhatsApp vinculada a esta conversa está inativa.'
    )
  }

  if (
    instancia.status !==
    'conectada'
  ) {
    throw new Error(
      'A conexão WhatsApp vinculada a esta conversa não está conectada.'
    )
  }

  const transportProvider =
    instancia.provider as WhatsAppTransportName

  const transport =
    getWhatsAppTransport(
      transportProvider
    )

  const transportInstance = {
    provider:
      transportProvider,

    providerInstanceId:
      instancia.provider_instance_id ||
      null,
  }

  const {
    data: contato,
    error: contatoError,
  } = await supabase
    .from('whatsapp_contatos')
    .select(
      'id, telefone'
    )
    .eq(
      'id',
      conversa.contato_id
    )
    .single()

  if (
    contatoError ||
    !contato
  ) {
    throw new Error(
      'Contato não encontrado.'
    )
  }

  const phone =
    contato.telefone?.replace(
      /\D/g,
      ''
    )

  if (!phone) {
    throw new Error(
      'O contato desta conversa não possui um telefone válido.'
    )
  }

  let providerMessageId:
    string | undefined

  let providerCommandId:
    string | undefined

  let mediaReadUrl = ''
  let storagePath = ''

  /*
   * ======================================================
   * MÍDIA
   * ======================================================
   */
  if (
    messageType !==
    'text'
  ) {
    if (!data.file) {
      throw new Error(
        'Arquivo de mídia não fornecido para envio.'
      )
    }

    const mimeType =
      data.file.type ||
      'application/octet-stream'

    /*
     * 1. Prepara upload no B2.
     */
    const perfCreateUpload =
      performance.now()

    const {
      data: b2Data,
      error: b2Error,
    } =
      await supabase.functions.invoke(
        'b2-media',
        {
          body: {
            action:
              'create-upload',

            corretoraId:
              conversa.corretora_id,

            conversationId:
              conversa.id,

            fileName:
              data.file.name,

            mimeType,
          },
        }
      )

    console.log(
      `⏱️ [WHATSAPP PERF] A create-upload: ${(performance.now() - perfCreateUpload).toFixed(0)} ms`
    )

    if (b2Error) {
      console.error(
        '❌ SupabaseWhatsAppProvider.sendMessage → assinatura B2:',
        b2Error
      )

      throw new Error(
        b2Error.message ||
          'Erro ao preparar upload da mídia no Backblaze.'
      )
    }

    const b2Response =
      b2Data as
        | B2UploadResponse
        | null

    if (
      !b2Response ||
      b2Response.success ===
        false ||
      b2Response.error ||
      !b2Response.storagePath ||
      !b2Response.uploadUrl ||
      !b2Response.readUrl
    ) {
      throw new Error(
        b2Response?.error ||
          'O Backblaze não retornou os dados necessários para o upload.'
      )
    }

    storagePath =
      b2Response.storagePath

    mediaReadUrl =
      b2Response.readUrl

    /*
     * 2. Upload físico para B2.
     */
    const perfUploadB2 =
      performance.now()

    const uploadResponse =
      await fetch(
        b2Response.uploadUrl,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              mimeType,
          },

          body:
            data.file,
        }
      )

    console.log(
      `⏱️ [WHATSAPP PERF] B upload B2: ${(performance.now() - perfUploadB2).toFixed(0)} ms`
    )

    if (
      !uploadResponse.ok
    ) {
      const uploadErrorText =
        await uploadResponse
          .text()
          .catch(
            () => ''
          )

      console.error(
        '❌ SupabaseWhatsAppProvider.sendMessage → upload Backblaze:',
        uploadResponse.status,
        uploadErrorText
      )

      throw new Error(
        `Erro ao salvar mídia no Backblaze (${uploadResponse.status}).`
      )
    }

    setCachedB2ReadUrl(
      storagePath,
      mediaReadUrl
    )

    /*
     * 3. Envia URL para o transporte.
     *
     * IMPORTANTE:
     * NÃO existe mais base64 neste fluxo.
     */
    console.log(
      '📎 [D-API URL] fonte preparada:',
      {
        type:
          messageType,

        mode:
          'signed-url',

        fileBytes:
          data.file.size,

        urlChars:
          mediaReadUrl.length,
      }
    )

    const perfDapi =
      performance.now()

    try {
      const transportResult =
        await transport.sendMedia(
          {
            instance:
              transportInstance,

            phone,

            type:
              messageType,

            mediaUrl:
              mediaReadUrl,

            caption:
              messageText,

            fileName:
              data.file.name,

            mimeType:
              data.file.type ||
              mimeType,

            replyToProviderMessageId:
              data.replyToProviderMessageId,
          }
        )

      console.log(
        `⏱️ [WHATSAPP PERF] C transport.sendMedia: ${(performance.now() - perfDapi).toFixed(0)} ms`
      )

      providerMessageId =
        transportResult.providerMessageId

      providerCommandId =
        transportResult.commandId

      if (
        !providerMessageId &&
        !providerCommandId
      ) {
        throw new Error(
          `O transporte ${transportProvider} não retornou providerMessageId nem commandId para a mídia.`
        )
      }

      console.log(
        '📡 SupabaseWhatsAppProvider → resultado transporte de mídia:',
        {
          provider:
            transportProvider,

          providerMessageId:
            providerMessageId ||
            null,

          providerCommandId:
            providerCommandId ||
            null,

          async:
            transportResult.async ===
            true,
        }
      )
    } catch (error) {
      console.error(
        `⏱️ [WHATSAPP PERF] C transport.sendMedia FALHOU após ${(performance.now() - perfDapi).toFixed(0)} ms`,
        error
      )

      throw error
    }
  }

  /*
   * ======================================================
   * TEXTO
   * ======================================================
   */
  else {
    if (!messageText) {
      throw new Error(
        'A mensagem não pode estar vazia.'
      )
    }

    const transportResult =
      await transport.sendText(
        {
          instance:
            transportInstance,

          phone,

          text:
            messageText,

          replyToProviderMessageId:
            data.replyToProviderMessageId,
        }
      )

    providerMessageId =
      transportResult.providerMessageId

    /*
     * Texto continua síncrono.
     */
    if (!providerMessageId) {
      throw new Error(
        `O transporte ${transportProvider} não retornou o ID da mensagem enviada.`
      )
    }
  }

  /*
   * ======================================================
   * STATUS INICIAL
   * ======================================================
   *
   * providerMessageId já existe:
   * → provider confirmou mensagem real.
   * → SENT.
   *
   * somente commandId:
   * → provider apenas aceitou o processamento.
   * → PENDING.
   */
  const initialStatus:
    'pending' | 'sent' =
    providerMessageId
      ? 'sent'
      : 'pending'

  const perfPersistencia =
    performance.now()

  const messageId =
    typeof crypto !==
      'undefined' &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`

  const now =
    new Date().toISOString()

  /*
   * ======================================================
   * PERSISTE MENSAGEM
   * ======================================================
   */
  const {
    data: insertedMessage,
    error: insertError,
  } = await supabase
    .from(
      'whatsapp_mensagens'
    )
    .insert({
      id:
        messageId,

      corretora_id:
        conversa.corretora_id,

      conversa_id:
        data.conversationId,

      instancia_id:
        instancia.id,

      provider_message_id:
        providerMessageId ||
        null,

      provider_command_id:
        providerCommandId ||
        null,

      reply_to_provider_message_id:
        data.replyToProviderMessageId ||
        null,

      direction:
        'outbound',

      type:
        messageType,

      text:
        messageText ||
        null,

      status:
        initialStatus,

      timestamp:
        now,

      sender_name:
        null,
    })
    .select(`
      id,
      conversa_id,
      direction,
      type,
      text,
      timestamp,
      status,
      sender_name,
      provider_message_id,
      provider_command_id,
      reply_to_provider_message_id
    `)
    .single()

  if (
    insertError ||
    !insertedMessage
  ) {
    console.error(
      '❌ Erro ao salvar mensagem enviada:',
      insertError
    )

    throw (
      insertError ||
      new Error(
        'A mensagem foi aceita pelo provider, mas não pôde ser registrada no CRM.'
      )
    )
  }

  /*
   * ======================================================
   * PERSISTE MÍDIA
   * ======================================================
   */
  let savedMedia:
    | WhatsAppMedia
    | undefined

  if (
    messageType !==
    'text'
  ) {
    const {
      data: insertedMedia,
      error: mediaInsertError,
    } = await supabase
      .from(
        'whatsapp_midias'
      )
      .insert({
        corretora_id:
          conversa.corretora_id,

        mensagem_id:
          insertedMessage.id,

        type:
          messageType,

        name:
          data.file?.name ||
          null,

        mime_type:
          data.file?.type ||
          null,

        size:
          data.file?.size ||
          null,

        storage_path:
          storagePath,

        provider_url:
          null,
      })
      .select(`
        id,
        type,
        name,
        size,
        mime_type,
        storage_path,
        provider_url
      `)
      .single()

    if (
      mediaInsertError ||
      !insertedMedia
    ) {
      console.error(
        '❌ Erro ao registrar mídia em whatsapp_midias:',
        mediaInsertError
      )

      throw (
        mediaInsertError ||
        new Error(
          'A mídia foi aceita pelo provider, mas não pôde ser registrada no CRM.'
        )
      )
    }

    savedMedia =
      mapMidiaToWhatsAppMedia(
        insertedMedia as SupabaseMidia,
        new Map([
          [
            storagePath,
            mediaReadUrl,
          ],
        ])
      )

    /*
     * Continua catalogando no núcleo
     * Central Storage exatamente como antes.
     */
    const finalized =
      await finalizeWhatsAppMediaInStorage(
        insertedMedia.id
      )

    if (!finalized) {
      console.error(
        '❌ Central Storage → mídia enviada, mas a catalogação não foi confirmada:',
        {
          mediaId:
            insertedMedia.id,

          storagePath,
        }
      )
    }
  }

  console.log(
    `⏱️ [WHATSAPP PERF] D persistência + finalize: ${(performance.now() - perfPersistencia).toFixed(0)} ms`
  )

  /*
   * ======================================================
   * ATUALIZA CONVERSA
   * ======================================================
   */
  const {
    error:
      conversaUpdateError,
  } = await supabase
    .from(
      'whatsapp_conversas'
    )
    .update({
      ultima_mensagem_at:
        now,

      updated_at:
        now,
    })
    .eq(
      'id',
      data.conversationId
    )

  if (
    conversaUpdateError
  ) {
    console.error(
      '⚠️ SupabaseWhatsAppProvider.sendMessage → atualizar conversa:',
      conversaUpdateError
    )
  }

  const mensagem =
    insertedMessage as SupabaseMensagem

  console.log(
    `⏱️ [WHATSAPP PERF] TOTAL sendMessage: ${(performance.now() - perfInicioTotal).toFixed(0)} ms`
  )

  return {
    id:
      mensagem.id,

    conversationId:
      mensagem.conversa_id,

    providerMessageId:
      mensagem.provider_message_id ||
      undefined,

    direction:
      mensagem.direction,

    type:
      mensagem.type,

    text:
      mensagem.text ||
      undefined,

    media:
      savedMedia,

    timestamp:
      mensagem.timestamp,

    status:
      mensagem.status,

    senderName:
      mensagem.sender_name ||
      undefined,
  }
}

  async forwardMessage(
    sourceMessageId: string,
    destinationConversationId: string
  ): Promise<WhatsAppMessage> {
    const {
      data: sourceMessage,
      error: sourceError,
    } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        id,
        corretora_id,
        conversa_id,
        direction,
        type,
        text,
        timestamp,
        status,
        sender_name,
        provider_message_id,
        whatsapp_midias (
          id,
          type,
          name,
          size,
          mime_type,
          storage_path,
          provider_url
        )
      `)
      .eq('id', sourceMessageId)
      .single()

    if (sourceError || !sourceMessage) {
      console.error(
        '❌ forwardMessage → mensagem origem:',
        sourceError
      )
      throw new Error('Mensagem original não encontrada.')
    }

    const messageType =
      sourceMessage.type as WhatsAppMessage['type']
    const messageText =
      sourceMessage.text?.trim() || ''

    if (messageType === 'text') {
      return this.sendMessage({
        conversationId: destinationConversationId,
        type: 'text',
        text: messageText,
      })
    }

    const sourceMedia =
      sourceMessage.whatsapp_midias?.[0] as
        | SupabaseMidia
        | undefined

    if (!sourceMedia) {
      throw new Error(
        'A mídia original não está mais disponível.'
      )
    }

    /*
     * Nova regra de integridade:
     * encaminhamento de mídia só pode partir de arquivo
     * já arquivado no Backblaze próprio.
     *
     * Mídias legadas sem storage_path devem ser reconciliadas
     * antes do encaminhamento. Não usamos provider_url como
     * origem de um novo outbound.
     */
    if (!sourceMedia.storage_path) {
      throw new Error(
        'Esta mídia é legada e ainda não está arquivada no Backblaze do CRM. Reconcilie o arquivo antes de encaminhá-lo.'
      )
    }

    const {
      data: destinationConversation,
      error: conversationError,
    } = await supabase
      .from('whatsapp_conversas')
      .select(`
        id,
        corretora_id,
        contato_id,
        instancia_id
      `)
      .eq('id', destinationConversationId)
      .single()

    if (
      conversationError ||
      !destinationConversation
    ) {
      throw new Error(
        'Conversa de destino não encontrada.'
      )
    }

    if (
      String(sourceMessage.corretora_id) !==
      String(destinationConversation.corretora_id)
    ) {
      throw new Error(
        'Não é permitido encaminhar mídia entre corretoras diferentes.'
      )
    }

    if (!destinationConversation.instancia_id) {
      throw new Error(
        'Esta conversa de destino é legada e não possui uma conexão WhatsApp vinculada. O encaminhamento foi bloqueado para evitar o uso do número incorreto.'
      )
    }

    /*
     * Garante que o arquivo de origem esteja catalogado
     * na Central antes de gerar a URL de leitura.
     */
    const sourceFinalized =
      await finalizeWhatsAppMediaInStorage(sourceMedia.id)

    if (!sourceFinalized) {
      throw new Error(
        'A mídia original existe no Backblaze, mas não foi possível confirmar sua catalogação na Central de Arquivos.'
      )
    }

    const readUrls = await createB2ReadUrlMap([
      sourceMedia,
    ])

    const mediaReadUrl =
      readUrls.get(sourceMedia.storage_path) || ''

    if (!mediaReadUrl) {
      throw new Error(
        'Não foi possível gerar a URL de leitura da mídia no Backblaze.'
      )
    }

    const {
      data: instancia,
      error: instanciaError,
    } = await supabase
      .from('whatsapp_instancias')
      .select(`
        id,
        corretora_id,
        provider,
        provider_instance_id,
        status,
        ativo
      `)
      .eq('id', destinationConversation.instancia_id)
      .eq(
        'corretora_id',
        destinationConversation.corretora_id
      )
      .single()

    if (instanciaError || !instancia) {
      console.error(
        '❌ forwardMessage → instância da conversa de destino:',
        instanciaError
      )
      throw new Error(
        'A conexão WhatsApp vinculada à conversa de destino não foi encontrada.'
      )
    }

    if (!instancia.ativo) {
      throw new Error(
        'A conexão WhatsApp vinculada à conversa de destino está inativa.'
      )
    }

    if (instancia.status !== 'conectada') {
      throw new Error(
        'A conexão WhatsApp vinculada à conversa de destino não está conectada.'
      )
    }

    const transportProvider =
      instancia.provider as WhatsAppTransportName
    const transport =
      getWhatsAppTransport(transportProvider)
    const transportInstance = {
      provider: transportProvider,
      providerInstanceId:
        instancia.provider_instance_id || null,
    }

    const {
      data: contato,
      error: contatoError,
    } = await supabase
      .from('whatsapp_contatos')
      .select('id, telefone')
      .eq(
        'id',
        destinationConversation.contato_id
      )
      .single()

    if (contatoError || !contato) {
      throw new Error(
        'Contato de destino não encontrado.'
      )
    }

    const phone =
      contato.telefone?.replace(/\D/g, '')

    if (!phone) {
      throw new Error(
        'O contato de destino não possui telefone válido.'
      )
    }

    const transportResult =
      await transport.sendMedia({
        instance: transportInstance,
        phone,
        type: messageType,
        mediaUrl: mediaReadUrl,
        caption: messageText,
        fileName:
          sourceMedia.name ||
          getForwardMediaFileName(messageType),
        mimeType:
          sourceMedia.mime_type ||
          getForwardMediaMimeType(messageType),
      })

    const providerMessageId =
      transportResult.providerMessageId

    const providerCommandId =
      transportResult.commandId

    if (
      !providerMessageId &&
      !providerCommandId
    ) {
      throw new Error(
        `O transporte ${transportProvider} não retornou providerMessageId nem commandId para a mensagem encaminhada.`
      )
    }

    const initialStatus:
      'pending' | 'sent' =
      providerMessageId
        ? 'sent'
        : 'pending'

    const messageId =
      typeof crypto !== 'undefined' &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    const now = new Date().toISOString()

    const {
      data: insertedMessage,
      error: insertError,
    } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        id: messageId,
        corretora_id:
          destinationConversation.corretora_id,
        conversa_id: destinationConversationId,
        instancia_id: instancia.id,
        
        
        provider_message_id:
          providerMessageId ||
          null,

        provider_command_id:
          providerCommandId ||
          null,

        direction:
          'outbound',

        type:
          messageType,

        text:
          messageText ||
          null,

        status:
          initialStatus,
        
        
        timestamp: now,
        sender_name: null,
      })
      .select(`
        id,
        conversa_id,
        direction,
        type,
        text,
        timestamp,
        status,
        sender_name,
        provider_message_id,
        provider_command_id
      `)
      .single()

    if (insertError || !insertedMessage) {
      console.error(
        '❌ forwardMessage → salvar mensagem:',
        insertError
      )
      throw (
        insertError ||
        new Error(
          'Não foi possível registrar a mensagem encaminhada.'
        )
      )
    }

    /*
     * O encaminhamento reutiliza o mesmo objeto físico.
     * Portanto mantém o mesmo storage_path e não cria
     * uma segunda cópia no Backblaze.
     *
     * O whatsapp-finalize reutiliza o crm_arquivos
     * existente por storage_path, evitando dupla cobrança.
     */
    const {
      data: insertedMedia,
      error: mediaInsertError,
    } = await supabase
      .from('whatsapp_midias')
      .insert({
        corretora_id:
          destinationConversation.corretora_id,
        mensagem_id: insertedMessage.id,
        type: messageType,
        name: sourceMedia.name,
        mime_type: sourceMedia.mime_type,
        size: sourceMedia.size,
        storage_path: sourceMedia.storage_path,
        provider_url: null,
      })
      .select(`
        id,
        type,
        name,
        size,
        mime_type,
        storage_path,
        provider_url
      `)
      .single()

    if (mediaInsertError || !insertedMedia) {
      console.error(
        '❌ forwardMessage → registrar mídia:',
        mediaInsertError
      )
      throw (
        mediaInsertError ||
        new Error(
          'A mensagem foi encaminhada, mas a mídia não pôde ser registrada no CRM.'
        )
      )
    }

    const finalized =
      await finalizeWhatsAppMediaInStorage(
        insertedMedia.id
      )

    if (!finalized) {
      console.error(
        '❌ forwardMessage → mídia encaminhada, mas a catalogação na Central não foi confirmada:',
        {
          mediaId: insertedMedia.id,
          storagePath: sourceMedia.storage_path,
        }
      )
    }

    const { error: conversaUpdateError } =
      await supabase
        .from('whatsapp_conversas')
        .update({
          ultima_mensagem_at: now,
          updated_at: now,
        })
        .eq(
          'id',
          destinationConversationId
        )

    if (conversaUpdateError) {
      console.error(
        '⚠️ forwardMessage → atualizar conversa:',
        conversaUpdateError
      )
    }

    const mensagem =
      insertedMessage as SupabaseMensagem

    return {
      id: mensagem.id,
      conversationId: mensagem.conversa_id,
      direction: mensagem.direction,
      type: mensagem.type,
      text: mensagem.text || undefined,
      media: mapMidiaToWhatsAppMedia(
        insertedMedia as SupabaseMidia,
        new Map([
          [
            sourceMedia.storage_path,
            mediaReadUrl,
          ],
        ])
      ),
      timestamp: mensagem.timestamp,
      status: mensagem.status,
      senderName:
        mensagem.sender_name || undefined,
    }
  }

  async getAttendants(): Promise<WhatsAppAttendant[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('❌ SupabaseWhatsAppProvider.getAttendants → auth:', authError)
    throw authError
  }

  const userId = authData.user?.id
  if (!userId) throw new Error('Usuário não autenticado.')

  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios_perfis')
    .select('id, tipo_usuario, corretora_id')
    .eq('id', userId)
    .single()

  if (perfilError) {
    console.error('❌ SupabaseWhatsAppProvider.getAttendants → perfil:', perfilError)
    throw perfilError
  }

  const corretoraId = perfil.tipo_usuario === 'CORRETORA' ? perfil.id : perfil.corretora_id
  if (!corretoraId) throw new Error('Corretora do usuário não encontrada.')

  const { data: usuarios, error } = await supabase
    .from('usuarios_perfis')
    .select('id, nome, tipo_usuario, avatar_url')
    .or(`id.eq.${corretoraId},corretora_id.eq.${corretoraId}`)
    .eq('ativo', true)
    .in('tipo_usuario', ['CORRETORA', 'CORRETOR', 'ADMIN'])
    .order('nome', { ascending: true })

  if (error) {
    console.error('❌ SupabaseWhatsAppProvider.getAttendants:', error)
    throw error
  }

  return (usuarios || []).map(usuario => ({
    id: usuario.id,
    name: usuario.nome,
    type: usuario.tipo_usuario as WhatsAppAttendant['type'],
    avatar: usuario.avatar_url || undefined,
  }))
}

  async assignConversation(

    conversationId: string,

    attendantId: string | null

  ): Promise<void> {

    const { error } = await supabase

      .from('whatsapp_conversas')

      .update({

        responsavel_id: attendantId,

        updated_at:

          new Date().toISOString(),

      })

      .eq('id', conversationId)

    if (error) {

      console.error(

        '❌ SupabaseWhatsAppProvider.assignConversation:',

        error

      )

      throw error

    }

  }

  async updateKanbanPosition(
  conversationId: string,
  stage: WhatsAppKanbanStage,
  position: number
): Promise<void> {
  const { data, error } = await supabase.rpc(
    'whatsapp_atualizar_kanban_cliente',
    {
      p_conversa_id: conversationId,
      p_etapa_kanban: stage,
      p_posicao_kanban: position,
    }
  )

  if (error) {
    console.error(
      '❌ SupabaseWhatsAppProvider.updateKanbanPosition:',
      error
    )
    throw error
  }

  const response = data as
    | {
        ok?: boolean
        cliente_id?: string
        cliente_tipo?: 'PESSOA' | 'EMPRESA'
        classificacao?: 'LEAD'
        etapa_kanban?: WhatsAppKanbanStage
        posicao_kanban?: number
      }
    | null

  if (!response?.ok) {
    throw new Error(
      'Não foi possível atualizar a etapa do cliente.'
    )
  }
}

  async markAsRead(

    conversationId: string

  ): Promise<void> {

    const { error } = await supabase

      .from('whatsapp_conversas')

      .update({

        unread_count: 0,

      })

      .eq('id', conversationId)

    if (error) {

      console.error(

        '❌ SupabaseWhatsAppProvider.markAsRead:',

        error

      )

      throw error

    }

  }

  async sendReaction(
  conversationId: string,
  message: WhatsAppMessage,
  emoji: string
): Promise<void> {
  if (!message.providerMessageId) {
    throw new Error(
      'A mensagem não possui ID do provider para receber reação.'
    )
  }

  const {
  data: conversa,
  error: conversaError,
} = await supabase
  .from('whatsapp_conversas')
  .select(`
    id,
    corretora_id,
    contato_id,
    instancia_id
  `)
  .eq('id', conversationId)
  .single()

if (
  conversaError ||
  !conversa
) {
  throw new Error(
    'Conversa não encontrada.'
  )
}

if (!conversa.instancia_id) {
  throw new Error(
    'Esta conversa é legada e não possui uma conexão WhatsApp vinculada. A reação foi bloqueada para evitar o uso do número incorreto.'
  )
}

  const {
  data: instancia,
  error: instanciaError,
} = await supabase
  .from('whatsapp_instancias')
  .select(`
    id,
    corretora_id,
    provider,
    provider_instance_id,
    status,
    ativo
  `)
  .eq(
    'id',
    conversa.instancia_id
  )
  .eq(
    'corretora_id',
    conversa.corretora_id
  )
  .single()

if (
  instanciaError ||
  !instancia
) {
  console.error(
    '❌ sendReaction → instância da conversa:',
    instanciaError
  )

  throw new Error(
    'A conexão WhatsApp vinculada a esta conversa não foi encontrada.'
  )
}

if (!instancia.ativo) {
  throw new Error(
    'A conexão WhatsApp vinculada a esta conversa está inativa.'
  )
}

if (
  instancia.status !==
  'conectada'
) {
  throw new Error(
    'A conexão WhatsApp vinculada a esta conversa não está conectada.'
  )
}

  const {
    data: contato,
    error: contatoError,
  } = await supabase
    .from('whatsapp_contatos')
    .select('telefone')
    .eq(
      'id',
      conversa.contato_id
    )
    .single()

  if (
    contatoError ||
    !contato
  ) {
    throw new Error(
      'Contato não encontrado.'
    )
  }

  const phone =
    contato.telefone?.replace(
      /\D/g,
      ''
    )

  if (!phone) {
    throw new Error(
      'O contato não possui telefone válido.'
    )
  }

  const transportProvider =
    instancia.provider as WhatsAppTransportName

  const transport =
    getWhatsAppTransport(
      transportProvider
    )

  await transport.sendReaction({
      instance: {
        provider: transportProvider,
        providerInstanceId:
          instancia.provider_instance_id || null,
      },
      phone,
      messageId: message.providerMessageId,
      emoji,
    })

    const { error: reactionError } =
      await supabase
        .from('whatsapp_reacoes')
        .upsert(
          {
            corretora_id:
              conversa.corretora_id,

            conversa_id:
              conversationId,

            mensagem_id:
              message.id,

            provider_message_id:
              message.providerMessageId,

            emoji,

            direction:
              'outbound',
          },
          {
            onConflict:
              'mensagem_id,direction',
          }
        )

    if (reactionError) {
      console.error(
        '❌ Erro ao salvar reação:',
        reactionError
      )

      throw new Error(
        'A reação foi enviada ao WhatsApp, mas não pôde ser salva no CRM.'
      )
    }
  }

}

function getForwardMediaFileName(
  type: WhatsAppMessage['type']
) {
  switch (type) {
    case 'image':
      return 'imagem-encaminhada.jpg'

    case 'audio':
      return 'audio-encaminhado.ogg'

    case 'video':
      return 'video-encaminhado.mp4'

    case 'document':
      return 'documento-encaminhado'

    default:
      return 'arquivo-encaminhado'
  }
}

function getForwardMediaMimeType(
  type: WhatsAppMessage['type']
) {
  switch (type) {
    case 'image':
      return 'image/jpeg'

    case 'audio':
      return 'audio/ogg'

    case 'video':
      return 'video/mp4'

    default:
      return 'application/octet-stream'
  }
}
