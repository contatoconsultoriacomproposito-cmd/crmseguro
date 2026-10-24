import { supabase } from '../../../lib/supabaseClient'

export interface WhatsAppTimelineCursor {
  evento_em: string
  cursor_chave: string
}

export type WhatsAppTimelineTipoEvento =
  | 'MENSAGEM'
  | 'LIGACAO'

export interface WhatsAppTimelineItem {
  id: string
  tipo_evento: WhatsAppTimelineTipoEvento
  evento_em: string
  cursor_chave: string
  dados: Record<string, any>
}

export interface WhatsAppTimelinePage {
  items: WhatsAppTimelineItem[]
  hasMore: boolean
  nextCursor: WhatsAppTimelineCursor | null
}

interface RpcTimelineResponse {
  items?: WhatsAppTimelineItem[]
  has_more?: boolean
  next_cursor?: WhatsAppTimelineCursor | null
}

interface B2ReadBatchResponse {
  success?: boolean
  files?: Array<{
    storagePath: string
    readUrl: string
  }>
  error?: string
}

export async function resolverUrlsMidias(
  items: WhatsAppTimelineItem[]
): Promise<WhatsAppTimelineItem[]> {
  const storagePaths = [
    ...new Set(
      items
        .filter(
          item =>
            item.tipo_evento === 'MENSAGEM'
        )
        .map(item =>
          item.dados?.midia?.storage_path?.trim()
        )
        .filter(
          (path): path is string =>
            Boolean(path)
        )
    ),
  ]

  if (!storagePaths.length) {
    return items
  }

  const { data, error } =
    await supabase.functions.invoke(
      'b2-media',
      {
        body: {
          action: 'create-read-batch',
          storagePaths,
        },
      }
    )

  if (error) {
    console.error(
      '❌ Timeline → erro ao gerar URLs B2:',
      error
    )

    return items
  }

  const response =
    data as B2ReadBatchResponse | null

  if (
    !response ||
    response.success === false ||
    response.error
  ) {
    console.error(
      '❌ Timeline → B2 não confirmou URLs:',
      response?.error || 'Resposta inválida.'
    )

    return items
  }

  const urls = new Map<string, string>()

  for (const file of response.files || []) {
    if (
      file.storagePath &&
      file.readUrl
    ) {
      urls.set(
        file.storagePath,
        file.readUrl
      )
    }
  }

  return items.map(item => {
    if (
      item.tipo_evento !== 'MENSAGEM' ||
      !item.dados?.midia
    ) {
      return item
    }

    const midia = item.dados.midia
    const storagePath =
      midia.storage_path?.trim()

    const url =
      (storagePath
        ? urls.get(storagePath)
        : undefined) ||
      midia.provider_url ||
      ''

    return {
      ...item,
      dados: {
        ...item.dados,
        midia: {
          ...midia,
          url,
        },
      },
    }
  })
}

export async function buscarTimelineWhatsApp(
  conversaId: string,
  cursor: WhatsAppTimelineCursor | null = null,
  limite = 20
): Promise<WhatsAppTimelinePage> {
  if (!conversaId) {
    throw new Error('ID da conversa não informado.')
  }

  

  const { data, error } = await supabase.rpc(
    'whatsapp_buscar_timeline',
    {
      p_conversa_id: conversaId,
      p_limite: limite,
      p_cursor_em:
        cursor?.evento_em ?? null,
      p_cursor_chave:
        cursor?.cursor_chave ?? null,
    }
  )

  

  if (error) {
    console.error(
      '❌ buscarTimelineWhatsApp:',
      error
    )

    throw error
  }

  const response =
    (data ?? {}) as RpcTimelineResponse

  const items =
    Array.isArray(response.items)
      ? response.items
      : []


  return {
    items,
    hasMore:
      response.has_more === true,
    nextCursor:
      response.next_cursor ?? null,
  }
}