import type {
  WhatsAppConversation,
  WhatsAppKanbanStage,
} from '../types/whatsapp'

export function getStageItems(
  conversations: WhatsAppConversation[],
  stage: WhatsAppKanbanStage
) {
  return conversations
    .filter(
      conversation =>
        conversation.etapaKanban === stage
    )
    .sort(
      (a, b) =>
        a.posicaoKanban - b.posicaoKanban
    )
}

export function normalizePositions(
  conversations: WhatsAppConversation[],
  stage: WhatsAppKanbanStage
) {
  return conversations.map(
    (conversation, index) => ({
      ...conversation,
      etapaKanban: stage,
      posicaoKanban: index + 1,
    })
  )
}

export function rebuildConversations(
  original: WhatsAppConversation[],
  replacements: Partial<
    Record<
      WhatsAppKanbanStage,
      WhatsAppConversation[]
    >
  >
) {
  const replacementIds = new Set(
    Object.values(replacements)
      .flatMap(items => items ?? [])
      .map(item => item.id)
  )

  const untouched = original.filter(
    conversation =>
      !replacementIds.has(conversation.id)
  )

  const replacementItems =
    Object.values(replacements).flatMap(
      items => items ?? []
    )

  return [
    ...untouched,
    ...replacementItems,
  ]
}

export function normalizeAllStages(
  conversations: WhatsAppConversation[],
  stages: WhatsAppKanbanStage[]
) {
  let result = [...conversations]

  stages.forEach(stage => {
    const stageItems = getStageItems(
      result,
      stage
    )

    result = rebuildConversations(
      result,
      {
        [stage]: normalizePositions(
          stageItems,
          stage
        ),
      }
    )
  })

  return result
}

export function moveConversationToStageTop(
  conversations: WhatsAppConversation[],
  conversationId: string,
  targetStage: WhatsAppKanbanStage
) {
  const movingConversation =
    conversations.find(
      conversation =>
        conversation.id === conversationId
    )

  if (!movingConversation) {
    return conversations
  }

  if (
    movingConversation.etapaKanban ===
    targetStage
  ) {
    return conversations
  }

  const sourceStage =
    movingConversation.etapaKanban

  const sourceItems = getStageItems(
    conversations,
    sourceStage
  ).filter(
    conversation =>
      conversation.id !== conversationId
  )

  const targetItems = getStageItems(
    conversations,
    targetStage
  ).filter(
    conversation =>
      conversation.id !== conversationId
  )

  const movedConversation: WhatsAppConversation = {
    ...movingConversation,
    etapaKanban: targetStage,
  }

  targetItems.unshift(movedConversation)

  return rebuildConversations(
    conversations,
    {
      [sourceStage]: normalizePositions(
        sourceItems,
        sourceStage
      ),
      [targetStage]: normalizePositions(
        targetItems,
        targetStage
      ),
    }
  )
}