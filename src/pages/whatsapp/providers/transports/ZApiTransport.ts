import { supabase } from '../../../../lib/supabaseClient'

import type {
  SendMediaTransportData,
  SendReactionTransportData,
  SendTextTransportData,
  WhatsAppProviderResponse,
  WhatsAppTransport,
  WhatsAppTransportResult,
} from './WhatsAppTransport'

import {
  createFallbackProviderMessageId,
  extractProviderMessageId,
} from './WhatsAppTransport'

export class ZApiTransport implements WhatsAppTransport {
  readonly name = 'zapi' as const

  async sendText(
    data: SendTextTransportData
  ): Promise<WhatsAppTransportResult> {
    const {
      data: zapiResponse,
      error: zapiError,
    } = await supabase.functions.invoke(
      'zapi-send-text',
      {
        body: {
          phone: data.phone,
          message: data.text,
        },
      }
    )

    if (zapiError) {
      console.error(
        '❌ ZApiTransport.sendText:',
        zapiError
      )

      throw new Error(
        zapiError.message ||
          'Erro ao enviar mensagem pela Z-API.'
      )
    }

    const response =
      zapiResponse as WhatsAppProviderResponse | null

    if (
      !response ||
      response.success === false ||
      response.error
    ) {
      throw new Error(
        response?.error ||
          'A Z-API não confirmou o envio da mensagem.'
      )
    }

    let providerMessageId =
      extractProviderMessageId(response)

    if (!providerMessageId) {
      console.warn(
        '⚠️ Z-API confirmou o envio, mas nenhum ID explícito foi identificado na resposta. Utilizando ID fallback.'
      )

      providerMessageId =
        createFallbackProviderMessageId(this.name)
    }

    return {
      providerMessageId,
    }
  }

  async sendMedia(
    data: SendMediaTransportData
  ): Promise<WhatsAppTransportResult> {
    const {
      data: zapiResponse,
      error: zapiError,
    } = await supabase.functions.invoke(
      'zapi-send-media',
      {
        body: {
          phone: data.phone,
          type: data.type,
          mediaUrl: data.mediaUrl,
          caption: data.caption || '',
          fileName: data.fileName,
        },
      }
    )

    if (zapiError) {
      console.error(
        '❌ ZApiTransport.sendMedia:',
        zapiError
      )

      throw new Error(
        zapiError.message ||
          'Erro ao enviar mídia pela Z-API.'
      )
    }

    const response =
      zapiResponse as WhatsAppProviderResponse | null

    if (
      !response ||
      response.success === false ||
      response.error
    ) {
      throw new Error(
        response?.error ||
          'A Z-API não confirmou o envio da mídia.'
      )
    }

    let providerMessageId =
      extractProviderMessageId(response)

    if (!providerMessageId) {
      console.warn(
        '⚠️ Z-API confirmou o envio da mídia, mas nenhum ID explícito foi identificado na resposta. Utilizando ID fallback.'
      )

      providerMessageId =
        createFallbackProviderMessageId(this.name)
    }

    return {
      providerMessageId,
    }
  }
  async sendReaction(
  _data: SendReactionTransportData
): Promise<WhatsAppTransportResult> {
  throw new Error(
    'Reações não estão implementadas no transporte legado Z-API.'
  )
}
}