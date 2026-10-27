import type {
  WhatsAppMedia,
  WhatsAppMessage,
} from '../types/whatsapp'

import type {
  WhatsAppCallTimelineItem,
} from './whatsappCallService'

import type {
  WhatsAppTimelineItem,
} from './whatsappTimelineService'

export type WhatsAppTimelineRenderable =
  | {
      kind: 'message'
      key: string
      eventAt: string
      message: WhatsAppMessage
    }
  | {
      kind: 'call'
      key: string
      eventAt: string
      call: WhatsAppCallTimelineItem
    }

function mapearMidia(
  dados: Record<string, any>
): WhatsAppMedia | undefined {
  const midia = dados?.midia

  if (!midia) {
    return undefined
  }

  return {
    url:
      typeof midia.url === 'string'
        ? midia.url
        : '',
    type: midia.type,
    name:
      midia.name || undefined,
    size:
      midia.size ?? undefined,
  }
}

function mapearMensagem(
  item: WhatsAppTimelineItem
): WhatsAppTimelineRenderable {
  const dados = item.dados

  const message: WhatsAppMessage = {
    id: dados.id || item.id,
    conversationId: dados.conversa_id,

    providerMessageId:
      dados.provider_message_id || undefined,

    reactions: Array.isArray(dados.reacoes)
      ? dados.reacoes.map((reacao: any) => ({
          id: reacao.id,
          emoji: reacao.emoji,
          direction: reacao.direction,
          createdAt: reacao.criado_em,
        }))
      : [],

    replyTo: dados.reply_to
      ? {
          providerMessageId:
            dados.reply_to.provider_message_id,

          messageId:
            dados.reply_to.id || undefined,

          senderName:
            dados.reply_to.sender_name || undefined,

          type:
            dados.reply_to.type || undefined,

          text:
            dados.reply_to.text || undefined,
        }
      : undefined,

    direction: dados.direction,
    type: dados.type,
    text: dados.text || undefined,
    media: mapearMidia(dados),

    metadata:
      dados.metadata || undefined,

    timestamp:
      dados.timestamp || item.evento_em,

    status: dados.status,

    senderName:
      dados.sender_name || undefined,
  }

  return {
    kind: 'message',
    key: item.cursor_chave,
    eventAt: item.evento_em,
    message,
  }
}

function mapearLigacao(
  item: WhatsAppTimelineItem
): WhatsAppTimelineRenderable {
  const dados = item.dados
  const gravacao = dados?.gravacao

  const gravacaoAtiva =
    gravacao?.status === 'ATIVO' &&
    Boolean(gravacao?.storage_path)

  const call: WhatsAppCallTimelineItem = {
    id:
      dados.id || item.id,

    conversaId:
      dados.conversa_id,

    direction:
      dados.direction,

    status:
      dados.status,

    iniciadoEm:
      dados.iniciado_em || item.evento_em,

    atendidoEm:
      dados.atendido_em || null,

    encerradoEm:
      dados.encerrado_em || null,

    duracaoSegundos:
      dados.duracao_segundos ?? null,

    gravacaoStatus:
      dados.gravacao_status,

    gravacaoArquivoId:
      dados.gravacao_arquivo_id || null,

    gravacao: gravacaoAtiva
      ? {
          id: gravacao.id,
          nomeOriginal:
            gravacao.nome_original,
          mimeType:
            gravacao.mime_type,
          tamanhoBytes:
            gravacao.tamanho_bytes,
          storagePath:
            gravacao.storage_path,
        }
      : undefined,
  }

  return {
    kind: 'call',
    key: item.cursor_chave,
    eventAt: item.evento_em,
    call,
  }
}

export function mapearTimelineWhatsApp(
  items: WhatsAppTimelineItem[]
): WhatsAppTimelineRenderable[] {
  return items
    .map(item => {
      if (
        item.tipo_evento === 'MENSAGEM'
      ) {
        return mapearMensagem(item)
      }

      if (
        item.tipo_evento === 'LIGACAO'
      ) {
        return mapearLigacao(item)
      }

      return null
    })
    .filter(
      (
        item
      ): item is WhatsAppTimelineRenderable =>
        item !== null
    )
}