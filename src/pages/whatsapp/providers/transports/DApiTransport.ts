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

type DApiMediaResponse =
  WhatsAppProviderResponse & {
    async?: boolean
    commandId?: string | null
    providerMessageId?: string | null
    elapsedMs?: number
  }

function stringValue(
  value: unknown
): string | undefined {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : undefined
}

function extractDapiCommandId(
  response: DApiMediaResponse
): string | undefined {
  const direct =
    stringValue(response.commandId)

  if (direct) {
    return direct
  }

  const provider =
    response.provider

  if (
    provider &&
    typeof provider === 'object'
  ) {
    const providerRecord =
      provider as Record<
        string,
        unknown
      >

    const candidates = [
      providerRecord.commandId,
      providerRecord.command_id,
      providerRecord.command,
    ]

    for (const candidate of candidates) {
      const value =
        stringValue(candidate)

      if (value) {
        return value
      }
    }

    const nestedData =
      providerRecord.data

    if (
      nestedData &&
      typeof nestedData === 'object'
    ) {
      const nested =
        nestedData as Record<
          string,
          unknown
        >

      const nestedCandidates = [
        nested.commandId,
        nested.command_id,
        nested.command,
      ]

      for (
        const candidate
        of nestedCandidates
      ) {
        const value =
          stringValue(candidate)

        if (value) {
          return value
        }
      }
    }
  }

  return undefined
}

function extractDapiMediaMessageId(
  response: DApiMediaResponse
): string | undefined {
  const direct =
    stringValue(
      response.providerMessageId
    )

  if (direct) {
    return direct
  }

  const extracted =
    extractProviderMessageId(
      response.provider ||
        response
    )

  return extracted ||
    undefined
}

function extractProviderError(
  response:
    | WhatsAppProviderResponse
    | null
): string | undefined {
  if (!response) {
    return undefined
  }

  const provider =
    response.provider

  if (
    provider &&
    typeof provider === 'object'
  ) {
    const providerRecord =
      provider as Record<
        string,
        unknown
      >

    const providerError =
      stringValue(
        providerRecord.error
      )

    if (providerError) {
      return providerError
    }

    const providerMessage =
      stringValue(
        providerRecord.message
      )

    if (providerMessage) {
      return providerMessage
    }
  }

  return stringValue(
    response.error
  )
}

export class DApiTransport
  implements WhatsAppTransport
{
  readonly name =
    'dapi' as const

  async sendText(
    data: SendTextTransportData
  ): Promise<WhatsAppTransportResult> {
    const sessionId =
      data.instance
        .providerInstanceId

    if (!sessionId) {
      throw new Error(
        'A sessão D-API não está configurada nesta instância.'
      )
    }

    const {
      data: dapiResponse,
      error: dapiError,
    } =
      await supabase.functions.invoke(
        'dapi-send-text',
        {
          body: {
            sessionId,
            to: data.phone,
            text: data.text,
            replyToProviderMessageId:
              data.replyToProviderMessageId,
          },
        }
      )

    if (dapiError) {
      console.error(
        '❌ DApiTransport.sendText:',
        dapiError
      )

      throw new Error(
        dapiError.message ||
          'Erro ao enviar mensagem pela D-API.'
      )
    }

    const response =
      dapiResponse as
        | WhatsAppProviderResponse
        | null

    if (
      !response ||
      response.success === false ||
      response.error
    ) {
      throw new Error(
        extractProviderError(
          response
        ) ||
          'A D-API não confirmou o envio da mensagem.'
      )
    }

    let providerMessageId =
      extractProviderMessageId(
        response.provider ||
          response
      )

    /*
     * Texto continua usando o fluxo
     * síncrono atual.
     *
     * Não estamos alterando esse
     * comportamento neste passo.
     */
    if (!providerMessageId) {
      console.warn(
        '⚠️ D-API confirmou o envio de texto, mas nenhum ID explícito foi identificado. Utilizando ID fallback.'
      )

      providerMessageId =
        createFallbackProviderMessageId(
          this.name
        )
    }

    return {
      providerMessageId,
      async: false,
    }
  }

  async sendMedia(
    data: SendMediaTransportData
  ): Promise<WhatsAppTransportResult> {
    const sessionId =
      data.instance
        .providerInstanceId

    if (!sessionId) {
      throw new Error(
        'A sessão D-API não está configurada nesta instância.'
      )
    }

    const {
      data: dapiResponse,
      error: dapiError,
    } =
      await supabase.functions.invoke(
        'dapi-send-media',
        {
          body: {
            sessionId,
            to: data.phone,
            type: data.type,
            mediaUrl:
              data.mediaUrl,
            caption:
              data.caption || '',
            fileName:
              data.fileName,
            mimeType:
              data.mimeType,
            ptt:
              data.type ===
              'audio',
            replyToProviderMessageId:
              data.replyToProviderMessageId,
          },
        }
      )

    if (dapiError) {
      console.error(
        '❌ DApiTransport.sendMedia:',
        dapiError
      )

      throw new Error(
        dapiError.message ||
          'Erro ao enviar mídia pela D-API.'
      )
    }

    const response =
      dapiResponse as
        | DApiMediaResponse
        | null

    if (
      !response ||
      response.success === false ||
      response.error
    ) {
      throw new Error(
        extractProviderError(
          response
        ) ||
          'A D-API não confirmou o envio da mídia.'
      )
    }

    const providerMessageId =
      extractDapiMediaMessageId(
        response
      )

    const commandId =
      extractDapiCommandId(
        response
      )

    /*
     * IMPORTANTE:
     *
     * No modo async:true existem
     * dois resultados legítimos:
     *
     * 1) providerMessageId já veio.
     *
     * 2) apenas commandId veio e a
     *    mensagem ainda está sendo
     *    processada pela D-API.
     *
     * NÃO criamos fallback para mídia.
     */
    if (
      !providerMessageId &&
      !commandId
    ) {
      console.error(
        '❌ DApiTransport.sendMedia → D-API confirmou a requisição, mas não retornou providerMessageId nem commandId:',
        response
      )

      throw new Error(
        'A D-API aceitou a requisição de mídia, mas não retornou identificador de processamento.'
      )
    }

    console.log(
      '✅ DApiTransport.sendMedia → mídia aceita:',
      {
        async:
          response.async === true,
        commandId:
          commandId || null,
        providerMessageId:
          providerMessageId ||
          null,
        elapsedMs:
          response.elapsedMs ??
          null,
      }
    )

    return {
      providerMessageId,
      commandId,
      async:
        response.async === true ||
        Boolean(
          commandId &&
            !providerMessageId
        ),
    }
  }

  async sendReaction(
    data: SendReactionTransportData
  ): Promise<WhatsAppTransportResult> {
    const sessionId =
      data.instance
        .providerInstanceId

    if (!sessionId) {
      throw new Error(
        'A sessão D-API não está configurada nesta instância.'
      )
    }

    if (!data.messageId) {
      throw new Error(
        'A mensagem não possui ID do provider para receber reação.'
      )
    }

    const {
      data: dapiResponse,
      error: dapiError,
    } =
      await supabase.functions.invoke(
        'dapi-send-reaction',
        {
          body: {
            sessionId,
            to: data.phone,
            messageId:
              data.messageId,
            emoji:
              data.emoji,
          },
        }
      )

    if (dapiError) {
      console.error(
        '❌ DApiTransport.sendReaction:',
        dapiError
      )

      throw new Error(
        dapiError.message ||
          'Erro ao enviar reação pela D-API.'
      )
    }

    const response =
      dapiResponse as
        | WhatsAppProviderResponse
        | null

    if (
      !response ||
      response.success === false ||
      response.error
    ) {
      throw new Error(
        extractProviderError(
          response
        ) ||
          'A D-API não confirmou a reação.'
      )
    }

    let providerMessageId =
      extractProviderMessageId(
        response.provider ||
          response
      )

    /*
     * Reação continua com a lógica
     * existente. Não faz parte do
     * novo fluxo async de mídia.
     */
    if (!providerMessageId) {
      providerMessageId =
        createFallbackProviderMessageId(
          this.name
        )
    }

    return {
      providerMessageId,
      async: false,
    }
  }
}