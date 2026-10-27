import type {
  SendContactMessageData,
  SendContactMessageResult,
  SendMessageData,
  StartConversationData,
  StartConversationResult,
  WhatsAppConversationStatus,
  WhatsAppKanbanStage,
  WhatsAppMessage,
  WhatsAppProvider,
} from '../types/whatsapp'

export class WhatsAppService {
  private provider: WhatsAppProvider

  constructor(provider: WhatsAppProvider) {
    this.provider = provider
  }

  getConversations() {
    return this.provider.getConversations()
  }

  getMessages(
    conversationId: string
  ) {
    return this.provider.getMessages(
      conversationId
    )
  }

  startConversation(
    data: StartConversationData
  ): Promise<StartConversationResult> {
    return this.provider.startConversation(
      data
    )
  }

  sendContactMessage(
    data: SendContactMessageData
  ): Promise<SendContactMessageResult> {
    return this.provider.sendContactMessage(
      data
    )
  }

  sendMessage(
    data: SendMessageData
  ) {
    return this.provider.sendMessage(
      data
    )
  }

  forwardMessage(
    sourceMessageId: string,
    destinationConversationId: string
  ) {
    return this.provider.forwardMessage(
      sourceMessageId,
      destinationConversationId
    )
  }

  sendReaction(
    conversationId: string,
    message: WhatsAppMessage,
    emoji: string
  ) {
    return this.provider.sendReaction(
      conversationId,
      message,
      emoji
    )
  }

  markAsRead(
    conversationId: string
  ) {
    return this.provider.markAsRead(
      conversationId
    )
  }

  getAttendants() {
    return this.provider.getAttendants()
  }

  assignConversation(
    conversationId: string,
    attendantId: string | null
  ) {
    return this.provider.assignConversation(
      conversationId,
      attendantId
    )
  }

  updateConversationStatus(
    conversationId: string,
    status: WhatsAppConversationStatus
  ) {
    return this.provider.updateConversationStatus(
      conversationId,
      status
    )
  }

  updateKanbanPosition(
    conversationId: string,
    stage: WhatsAppKanbanStage,
    position: number
  ) {
    return this.provider.updateKanbanPosition(
      conversationId,
      stage,
      position
    )
  }
}
