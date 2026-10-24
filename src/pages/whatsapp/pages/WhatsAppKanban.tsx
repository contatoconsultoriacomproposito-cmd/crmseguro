import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  GripVertical,
  Handshake,
  Headphones,
  MessageCircle,
  MessagesSquare,
  Search,
  ShieldAlert,
} from 'lucide-react'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

import { useConversations } from '../hooks/useConversations'
import { useWhatsApp } from '../hooks/useWhatsApp'

import {
  getStageItems,
  normalizePositions,
  normalizeAllStages,
  rebuildConversations,
} from '../utils/kanbanUtils'


import type {
  WhatsAppConversation,
  WhatsAppKanbanStage,
} from '../types/whatsapp'
import { useNavigate } from 'react-router-dom'

interface KanbanColumn {
  id: WhatsAppKanbanStage
  label: string
  description: string
  icon: typeof Search
  accent: string
  iconStyle: string
  countStyle: string
  dropStyle: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'prospeccao',
    label: 'Prospecção',
    description: 'Novos contatos',
    icon: Search,
    accent: 'bg-sky-500',
    iconStyle: 'bg-sky-50 text-sky-600',
    countStyle: 'bg-sky-50 text-sky-700',
    dropStyle: 'border-sky-300 bg-sky-50/70',
  },
  {
    id: 'negociacao',
    label: 'Negociação',
    description: 'Em andamento',
    icon: Handshake,
    accent: 'bg-violet-500',
    iconStyle: 'bg-violet-50 text-violet-600',
    countStyle: 'bg-violet-50 text-violet-700',
    dropStyle: 'border-violet-300 bg-violet-50/70',
  },
  {
    id: 'fechamento',
    label: 'Fechamento',
    description: 'Decisão final',
    icon: CheckCircle2,
    accent: 'bg-amber-500',
    iconStyle: 'bg-amber-50 text-amber-600',
    countStyle: 'bg-amber-50 text-amber-700',
    dropStyle: 'border-amber-300 bg-amber-50/70',
  },
  {
    id: 'pos_venda',
    label: 'Pós-venda',
    description: 'Clientes ativos',
    icon: BriefcaseBusiness,
    accent: 'bg-emerald-500',
    iconStyle: 'bg-emerald-50 text-emerald-600',
    countStyle: 'bg-emerald-50 text-emerald-700',
    dropStyle: 'border-emerald-300 bg-emerald-50/70',
  },
  {
    id: 'perdido',
    label: 'Perdido',
    description: 'Oportunidades perdidas',
    icon: AlertTriangle,
    accent: 'bg-slate-500',
    iconStyle: 'bg-slate-100 text-slate-600',
    countStyle: 'bg-slate-100 text-slate-600',
    dropStyle: 'border-slate-400 bg-slate-100/80',
  },
  {
    id: 'assistencia',
    label: 'Assistência',
    description: 'Suporte ao cliente',
    icon: Headphones,
    accent: 'bg-cyan-500',
    iconStyle: 'bg-cyan-50 text-cyan-600',
    countStyle: 'bg-cyan-50 text-cyan-700',
    dropStyle: 'border-cyan-300 bg-cyan-50/70',
  },
  {
    id: 'sinistro',
    label: 'Sinistro',
    description: 'Ocorrências',
    icon: ShieldAlert,
    accent: 'bg-rose-500',
    iconStyle: 'bg-rose-50 text-rose-600',
    countStyle: 'bg-rose-50 text-rose-700',
    dropStyle: 'border-rose-300 bg-rose-50/70',
  },
]

export default function WhatsAppKanban() {
  const navigate = useNavigate()
  const {
    conversations,
    loading,
    updateConversationKanban,
  } = useConversations()

  const whatsapp = useWhatsApp()

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null)

  const [localConversations, setLocalConversations] =
    useState<WhatsAppConversation[] | null>(null)

  const [snapshot, setSnapshot] =
    useState<WhatsAppConversation[] | null>(null)

  

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const kanbanConversations = useMemo(() => {
  const byClient =
    new Map<string, WhatsAppConversation>()

  conversations.forEach(conversation => {
    const clienteId =
      conversation.contact.clienteId

    if (
      !clienteId ||
      conversation.contact.classificacao !==
        'LEAD'
    ) {
      return
    }

    const key =
      `${conversation.contact.clienteTipo ?? 'CLIENTE'}:${clienteId}`

    const atual =
      byClient.get(key)

    if (!atual) {
      byClient.set(
        key,
        conversation
      )
      return
    }

    const atualTimestamp =
      new Date(
        atual.updatedAt
      ).getTime()

    const novoTimestamp =
      new Date(
        conversation.updatedAt
      ).getTime()

    if (
      novoTimestamp >
      atualTimestamp
    ) {
      byClient.set(
        key,
        conversation
      )
    }
  })

  return Array.from(
    byClient.values()
  )
}, [conversations])

  const workingConversations =
    localConversations ?? kanbanConversations

  const activeConversation = useMemo(
    () =>
      workingConversations.find(
        conversation =>
          conversation.id === activeConversationId
      ),
    [workingConversations, activeConversationId]
  )

  const conversationsByStage = useMemo(() => {
    return groupConversations(workingConversations)
  }, [workingConversations])

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
        navigate('/whatsapp', {
        state: {
            conversationId,
        },
        })
    },
    [navigate]
    )

  const handleDragStart = (
    event: DragStartEvent
  ) => {
    const conversationId = String(event.active.id)

    setSnapshot(
      workingConversations.map(conversation => ({
        ...conversation,
      }))
    )

    setLocalConversations(
      workingConversations.map(conversation => ({
        ...conversation,
      }))
    )

    setActiveConversationId(conversationId)
  }

  const handleDragOver = (
    event: DragOverEvent
  ) => {
    const { active, over } = event

    if (!over) {
      return
    }

    setLocalConversations(current => {
      if (!current) {
        return current
      }

      const activeId = String(active.id)
      const overId = String(over.id)

      const activeConversation = current.find(
        conversation =>
          conversation.id === activeId
      )

      if (!activeConversation) {
        return current
      }

      const targetStage = getTargetStage(
        overId,
        current
      )

      if (!targetStage) {
        return current
      }

      const sourceStage =
        activeConversation.etapaKanban

      if (sourceStage === targetStage) {
        return current
      }

      const sourceItems = getStageItems(
        current,
        sourceStage
      )

      const targetItems = getStageItems(
        current,
        targetStage
      )

      const activeIndex = sourceItems.findIndex(
        item => item.id === activeId
      )

      if (activeIndex === -1) {
        return current
      }

      const [movingConversation] =
        sourceItems.splice(activeIndex, 1)

      const overIndex = targetItems.findIndex(
        item => item.id === overId
      )

      const insertIndex =
        overIndex >= 0
          ? overIndex
          : targetItems.length

      targetItems.splice(insertIndex, 0, {
        ...movingConversation,
        etapaKanban: targetStage,
      })

      return rebuildConversations(
        current,
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
    })
  }

  const handleDragEnd = async (
    event: DragEndEvent
  ) => {
    const { active, over } = event

    const activeId = String(active.id)

    if (!over) {
      handleDragCancel()
      return
    }

    let finalState =
      localConversations ??
      workingConversations

    const overId = String(over.id)

    const activeConversation =
      finalState.find(
        conversation =>
          conversation.id === activeId
      )

    if (!activeConversation) {
      handleDragCancel()
      return
    }

    const targetStage = getTargetStage(
      overId,
      finalState
    )

    if (!targetStage) {
      handleDragCancel()
      return
    }

    const targetItems = getStageItems(
      finalState,
      targetStage
    )

    const oldIndex = targetItems.findIndex(
      item => item.id === activeId
    )

    const overIndex = targetItems.findIndex(
      item => item.id === overId
    )

    if (
      oldIndex !== -1 &&
      overIndex !== -1 &&
      oldIndex !== overIndex
    ) {
      const reordered = arrayMove(
        targetItems,
        oldIndex,
        overIndex
      )

      finalState = rebuildConversations(
        finalState,
        {
          [targetStage]: normalizePositions(
            reordered,
            targetStage
          ),
        }
      )
    } else {
      finalState = rebuildConversations(
        finalState,
        {
          [targetStage]: normalizePositions(
            targetItems,
            targetStage
          ),
        }
      )
    }

    const normalizedFinalState =
        normalizeAllStages(
            finalState,
            KANBAN_COLUMNS.map(column => column.id)
        )

    setLocalConversations(
      normalizedFinalState
    )

    setActiveConversationId(null)

    normalizedFinalState.forEach(
      conversation => {
        updateConversationKanban(
          conversation.id,
          conversation.etapaKanban,
          conversation.posicaoKanban
        )
      }
    )

    try {
      await persistKanbanChanges(
        snapshot ?? conversations,
        normalizedFinalState,
        whatsapp
      )

      setSnapshot(null)

      setLocalConversations(null)
    } catch (error) {
      console.error(
        '❌ Erro ao persistir movimentação do Kanban:',
        error
      )

      if (snapshot) {
        snapshot.forEach(conversation => {
          updateConversationKanban(
            conversation.id,
            conversation.etapaKanban,
            conversation.posicaoKanban
          )
        })
      }

      setLocalConversations(null)
      setSnapshot(null)
    }
  }

  const handleDragCancel = () => {
    if (snapshot) {
      snapshot.forEach(conversation => {
        updateConversationKanban(
          conversation.id,
          conversation.etapaKanban,
          conversation.posicaoKanban
        )
      })
    }

    setLocalConversations(null)
    setSnapshot(null)
    setActiveConversationId(null)
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />

          <span className="text-sm text-slate-500">
            Carregando Kanban...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-100 pt-[72px] md:p-3 lg:p-4">
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <MessageCircle size={19} />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Kanban WhatsApp
                </h1>

                <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                  Organize as conversas e acompanhe cada etapa do atendimento.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                title="Visualização de conversas"
                onClick={() => navigate('/whatsapp')}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <MessagesSquare size={16} />

                <span className="hidden text-xs font-semibold sm:inline">
                  Conversas
                </span>
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Conversas
                </p>

                <p className="text-base font-bold leading-5 text-slate-800">
                  {workingConversations.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-slate-100/70">
            <div className="flex h-full min-w-max gap-3 p-3 md:gap-4 md:p-4">
              {KANBAN_COLUMNS.map(column => (
                <KanbanColumnComponent
                    key={column.id}
                    column={column}
                    conversations={
                        conversationsByStage.get(
                        column.id
                        ) ?? []
                    }
                    onOpenConversation={handleOpenConversation}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeConversation ? (
              <div className="w-[296px] rotate-[1.5deg]">
                <ConversationKanbanCardContent
                  conversation={
                    activeConversation
                  }
                  dragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

function KanbanColumnComponent({
  column,
  conversations,
  onOpenConversation,
}: {
  column: KanbanColumn
  conversations: WhatsAppConversation[]
  onOpenConversation: (conversationId: string) => void
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: column.id,
  })

  const Icon = column.icon

  return (
    <section
      ref={setNodeRef}
      className={`relative flex h-full w-[312px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-slate-50 transition-colors duration-150 ${
        isOver
          ? column.dropStyle
          : 'border-slate-200'
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-1 w-full ${column.accent}`}
      />

      <header className="shrink-0 border-b border-slate-200/80 bg-white px-3.5 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${column.iconStyle}`}
            >
              <Icon size={17} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-800">
                {column.label}
              </h2>

              <p className="truncate text-[11px] text-slate-400">
                {column.description}
              </p>
            </div>
          </div>

          <span
            className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold ${column.countStyle}`}
          >
            {conversations.length}
          </span>
        </div>
      </header>

      <SortableContext
        items={conversations.map(
          conversation => conversation.id
        )}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={`min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 transition-colors ${
            isOver ? 'bg-white/20' : ''
          }`}
        >
          {conversations.length === 0 ? (
            <div
              className={`flex h-28 items-center justify-center rounded-xl border border-dashed px-4 text-center transition ${
                isOver
                  ? 'border-current bg-white/60'
                  : 'border-slate-300 bg-white/40'
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-400">
                  {isOver
                    ? 'Solte a conversa aqui'
                    : 'Nenhuma conversa'}
                </p>

                {!isOver && (
                  <p className="mt-1 text-[10px] text-slate-300">
                    Arraste um atendimento para esta etapa
                  </p>
                )}
              </div>
            </div>
          ) : (
            conversations.map(conversation => (
              <SortableConversationCard
                key={conversation.id}
                conversation={conversation}
                onOpenConversation={onOpenConversation}
                />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  )
}

function SortableConversationCard({
  conversation,
  onOpenConversation,
}: {
  conversation: WhatsAppConversation
  onOpenConversation: (conversationId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: conversation.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'relative z-10 opacity-25'
          : 'relative z-0'
      }
    >
      <ConversationKanbanCardContent
        conversation={conversation}
        dragAttributes={attributes}
        dragListeners={listeners}
        onOpenConversation={onOpenConversation}
      />
    </div>
  )
}

function ConversationKanbanCardContent({
  conversation,
  dragging = false,
  dragAttributes,
  dragListeners,
  onOpenConversation,
}: {
  conversation: WhatsAppConversation
  dragging?: boolean
  dragAttributes?: React.HTMLAttributes<HTMLElement>
  dragListeners?: Record<string, unknown>
  onOpenConversation?: (conversationId: string) => void
}) {
  const contactName =
    conversation.contact.name ||
    conversation.contact.phone

  const initial =
    contactName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
        onClick={() => {
            if (!dragging) {
            onOpenConversation?.(conversation.id)
            }
        }}
        className={`group w-full rounded-xl border bg-white p-3 text-left transition-all duration-150 ${
            dragging
            ? 'border-blue-300 shadow-2xl ring-2 ring-blue-100'
            : 'cursor-pointer border-slate-200 shadow-sm hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md'
        }`}
        >
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white shadow-sm">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">
                {contactName}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {conversation.contact.phone}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {conversation.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {conversation.unreadCount > 99
                    ? '99+'
                    : conversation.unreadCount}
                </span>
              )}

              {!dragging && (
                <button
                    type="button"
                    onClick={event => {
                    event.stopPropagation()
                    }}
                    {...dragAttributes}
                    {...dragListeners}
                    className="flex h-7 w-6 touch-none cursor-grab items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
                    title="Mover conversa"
                    aria-label={`Mover conversa de ${contactName}`}
                >
                    <GripVertical size={15} />
                </button>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2">
        <p className="line-clamp-2 min-h-[34px] text-xs leading-[17px] text-slate-500">
          {getMessagePreview(conversation)}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-slate-400">
          #{conversation.posicaoKanban}
        </span>

        {conversation.lastMessage && (
          <span className="text-[10px] text-slate-400">
            {formatMessageTime(
              conversation.lastMessage.timestamp
            )}
          </span>
        )}
      </div>
    </div>
  )
}

function groupConversations(
  conversations: WhatsAppConversation[]
) {
  const grouped = new Map<
    WhatsAppKanbanStage,
    WhatsAppConversation[]
  >()

  KANBAN_COLUMNS.forEach(column => {
    grouped.set(column.id, [])
  })

  conversations.forEach(conversation => {
    const stage =
      conversation.etapaKanban || 'prospeccao'

    grouped.get(stage)?.push(conversation)
  })

  grouped.forEach(items => {
    items.sort(
      (a, b) =>
        a.posicaoKanban - b.posicaoKanban
    )
  })

  return grouped
}



function getTargetStage(
  overId: string,
  conversations: WhatsAppConversation[]
): WhatsAppKanbanStage | null {
  const column = KANBAN_COLUMNS.find(
    item => item.id === overId
  )

  if (column) {
    return column.id
  }

  const conversation = conversations.find(
    item => item.id === overId
  )

  return conversation?.etapaKanban ?? null
}


async function persistKanbanChanges(
  previous: WhatsAppConversation[],
  next: WhatsAppConversation[],
  whatsapp: ReturnType<typeof useWhatsApp>
) {
  const previousMap = new Map(
    previous.map(conversation => [
      conversation.id,
      conversation,
    ])
  )

  const changed = next.filter(
    conversation => {
      const oldConversation =
        previousMap.get(conversation.id)

      if (!oldConversation) {
        return false
      }

      return (
        oldConversation.etapaKanban !==
          conversation.etapaKanban ||
        oldConversation.posicaoKanban !==
          conversation.posicaoKanban
      )
    }
  )

  await Promise.all(
    changed.map(conversation =>
      whatsapp.updateKanbanPosition(
        conversation.id,
        conversation.etapaKanban,
        conversation.posicaoKanban
      )
    )
  )
}

function formatMessageTime(
  timestamp: string
) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date)
}

function getMessagePreview(
  conversation: WhatsAppConversation
): string {
  const message = conversation.lastMessage

  if (!message) {
    return 'Sem mensagens'
  }

  if (message.text?.trim()) {
    return message.text.trim()
  }

  switch (message.type) {
    case 'image':
      return '📷 Imagem'

    case 'audio':
      return '🎵 Áudio'

    case 'video':
      return '🎥 Vídeo'

    case 'document':
      return '📄 Documento'

    default:
      return 'Mensagem'
  }
}