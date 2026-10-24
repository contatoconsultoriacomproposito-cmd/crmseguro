import type {
  MessageType,
  WhatsAppProviderName,
} from '../../types/whatsapp'

export type WhatsAppTransportName = Exclude<
  WhatsAppProviderName,
  'mock'
>

export type WhatsAppMediaTransportType = Exclude<
  MessageType,
  'text'
>

export interface WhatsAppTransportInstance {
  provider: WhatsAppTransportName
  providerInstanceId: string | null
}

export interface SendTextTransportData {
  instance: WhatsAppTransportInstance
  phone: string
  text: string
  replyToProviderMessageId?: string
}

export interface SendMediaTransportData {
  instance: WhatsAppTransportInstance
  phone: string
  type: WhatsAppMediaTransportType
  mediaUrl: string
  caption?: string
  fileName?: string
  mimeType?: string
  replyToProviderMessageId?: string
}

export interface SendReactionTransportData {
  instance: WhatsAppTransportInstance
  phone: string
  messageId: string
  emoji: string
}

export interface WhatsAppTransportResult {
  providerMessageId?: string
  commandId?: string
  async?: boolean
}

export interface WhatsAppTransport {
  readonly name: WhatsAppTransportName

  sendText(
    data: SendTextTransportData
  ): Promise<WhatsAppTransportResult>

  sendMedia(
    data: SendMediaTransportData
  ): Promise<WhatsAppTransportResult>

  sendReaction(
    data: SendReactionTransportData
  ): Promise<WhatsAppTransportResult>
}

export interface WhatsAppProviderResponse {
  success?: boolean
  zaapId?: string
  messageId?: string
  id?: string
  data?: Record<string, any>
  response?: Record<string, any>
  result?: Record<string, any>
  payload?: Record<string, any>
  provider?: Record<string, any>
  error?: string
  message?: string
  status?: number
  [key: string]: any
}

export function extractProviderMessageId(
  response: any
): string {
  if (!response) return ''

  return (
    response.zaapId ||
    response.messageId ||
    response.id ||
    response.data?.zaapId ||
    response.data?.messageId ||
    response.data?.id ||
    response.response?.zaapId ||
    response.response?.messageId ||
    response.response?.id ||
    response.result?.zaapId ||
    response.result?.messageId ||
    response.result?.id ||
    response.payload?.zaapId ||
    response.payload?.messageId ||
    response.payload?.id ||
    response.provider?.zaapId ||
    response.provider?.messageId ||
    response.provider?.id ||
    ''
  )
}

export function createFallbackProviderMessageId(
  provider: WhatsAppTransportName
): string {
  return (
    `${provider}_${Date.now()}_` +
    Math.random()
      .toString(36)
      .substring(2, 9)
  )
}