export type WhatsAppProviderName = 'mock' | 'zapi' | 'dapi' | 'meta'

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'contact'

export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type CrmClientType = 'PESSOA' | 'EMPRESA'

export type CrmClientClassification =
  | 'NAO_QUALIFICADO'
  | 'LEAD'

export type WhatsAppConversationStatus =
  | 'novo'
  | 'em_atendimento'
  | 'aguardando_cliente'
  | 'encerrada'

export type WhatsAppInstanceStatus =
  | 'conectada'
  | 'desconectada'
  | 'conectando'
  | 'erro'
  | 'aguardando_qr'

export interface WhatsAppContact {
  id: string
  name: string
  phone: string
  avatar?: string
  clienteId?: string
  clienteTipo?: CrmClientType
  classificacao?: CrmClientClassification
  temperatura?: 'FRIO' | 'MORNO' | 'QUENTE'
}

export interface WhatsAppContactLookupResult {
  id: string
  name: string
  phone: string
  whatsappId?: string
  clienteId?: string
  excluded: boolean
}

export interface WhatsAppAttendant {
  id: string
  name: string
  type: 'CORRETORA' | 'CORRETOR' | 'ADMIN'
  avatar?: string
}

export interface WhatsAppMedia {
  url: string
  type: MessageType
  name?: string
  size?: number
}

export interface WhatsAppSharedContact {
  name?: string
  phone?: string
  vcard?: string
}

export interface WhatsAppMessageMetadata {
  contact?: WhatsAppSharedContact
  contacts?: WhatsAppSharedContact[]
}

export interface WhatsAppReaction {
  id: string
  emoji: string
  direction: MessageDirection
  createdAt: string
}

export interface WhatsAppReplyReference {
  providerMessageId: string
  messageId?: string
  senderName?: string
  type?: MessageType
  text?: string
}

export interface WhatsAppMessage {
  id: string
  conversationId: string
  providerMessageId?: string
  replyTo?: WhatsAppReplyReference
  direction: MessageDirection
  type: MessageType
  text?: string
  media?: WhatsAppMedia
  metadata?: WhatsAppMessageMetadata
  timestamp: string
  status: MessageStatus
  senderName?: string
  reactions?: WhatsAppReaction[]
}

export interface StartConversationData {
  name: string
  phone: string
  instanceId: string
  assignedUserId?: string | null
}

export interface StartConversationResult {
  conversationId: string
  contactId: string
  created: boolean
  contactCreated: boolean
}

export type WhatsAppKanbanStage =
  | 'prospeccao'
  | 'negociacao'
  | 'fechamento'
  | 'pos_venda'
  | 'perdido'
  | 'assistencia'
  | 'sinistro'

export interface WhatsAppConversation {
  id: string
  contact: WhatsAppContact
  assignedUserId?: string
  lastMessage?: WhatsAppMessage
  unreadCount: number
  updatedAt: string
  etapaKanban: WhatsAppKanbanStage
  posicaoKanban: number

  status?: WhatsAppConversationStatus

  instanceId?: string
  instanceActive?: boolean
  instanceStatus?: WhatsAppInstanceStatus
  instanceName?: string
  instancePhone?: string
}

export interface SendMessageData {
  conversationId: string
  text?: string
  type?: MessageType
  media?: WhatsAppMedia
  file?: File
  replyToProviderMessageId?: string
}

export interface SendContactMessageData {
  contactId: string
  instanceId: string
  assignedUserId?: string | null
  text: string
}

export interface SendContactMessageResult {
  conversationId: string
  messageId: string
  conversationCreated: boolean
}

export interface WhatsAppProvider {
  getConversations(): Promise<WhatsAppConversation[]>

  getMessages(
    conversationId: string
  ): Promise<WhatsAppMessage[]>

  sendMessage(
    data: SendMessageData
  ): Promise<WhatsAppMessage>

  markAsRead(
    conversationId: string
  ): Promise<void>

  getAttendants(): Promise<WhatsAppAttendant[]>

  assignConversation(
    conversationId: string,
    attendantId: string | null
  ): Promise<void>

  updateConversationStatus(
    conversationId: string,
    status: WhatsAppConversationStatus
  ): Promise<void>

  updateKanbanPosition(
    conversationId: string,
    stage: WhatsAppKanbanStage,
    position: number
  ): Promise<void>

  sendReaction(
    conversationId: string,
    message: WhatsAppMessage,
    emoji: string
  ): Promise<void>

  forwardMessage(
    sourceMessageId: string,
    destinationConversationId: string
  ): Promise<WhatsAppMessage>
  
  startConversation(
    data: StartConversationData
  ): Promise<StartConversationResult>

  sendContactMessage(
    data: SendContactMessageData
  ): Promise<SendContactMessageResult>

  findActiveConversationByPhone(
    phone: string,
    instanceId: string
  ): Promise<string | null>

  findContactByPhone(
    phone: string
  ): Promise<WhatsAppContactLookupResult | null>
}
