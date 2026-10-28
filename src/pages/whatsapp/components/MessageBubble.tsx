import {
  useEffect,
  useRef,
  useState,
} from 'react'
import type { WhatsAppMessage } from '../types/whatsapp'
import MediaMessage from './MediaMessage'
import {
  Check,
  CheckCheck,
  ContactRound,
  Ellipsis,
  Forward,
  ListTodo,
  Loader2,
  MessageSquareReply,
  SmilePlus,
  Trash2,
  TriangleAlert,
} from 'lucide-react'

interface MessageBubbleProps {
  message: WhatsAppMessage

  onReply?: (
    message: WhatsAppMessage
  ) => void

  onNavigateToMessage?: (
    messageId: string
  ) => void

  onReact?: (
    message: WhatsAppMessage,
    emoji: string
  ) => Promise<void>

  onCreateTask?: (
    message: WhatsAppMessage
  ) => void

  onForward?: (
    message: WhatsAppMessage
  ) => void

  onDelete?: (
    message: WhatsAppMessage
  ) => void

  onOpenSharedContact?: (
    message: WhatsAppMessage
  ) => Promise<void> | void
}

export default function MessageBubble({
  message,
  onReply,
  onNavigateToMessage,
  onReact,
  onCreateTask,
  onForward,
  onDelete,
  onOpenSharedContact,
}: MessageBubbleProps) {

  const [menuOpen, setMenuOpen] = useState(false)
    const [reactionOpen, setReactionOpen] =
    useState(false)

  const [imagemAmpliada, setImagemAmpliada] =
    useState<string | null>(null)

  const [sendingReaction, setSendingReaction] =
    useState(false)

  const [
    openingSharedContact,
    setOpeningSharedContact,
  ] = useState(false)

  const menuRef = useRef<HTMLDivElement | null>(null)

  const sent = message.direction === 'outbound'
  const isPending = message.status === 'pending'
  const isFailed = message.status === 'failed'
  const isOptimistic =
    message.id.startsWith('optimistic-')

  const showMediaSendingOverlay =
    isPending &&
    isOptimistic &&
    !!message.media

  const canUseActions =
    !isPending && !isFailed

  const time = new Date(
    message.timestamp
  ).toLocaleTimeString(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  )

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (
      event: MouseEvent
    ) => {
      const target =
        event.target as Node

      if (
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown
    )

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [menuOpen])

  

  const handleReply = () => {
  if (!canUseActions) {
    return
  }

  console.log(
    '🧪 RESPOSTA → mensagem:',
    {
      id: message.id,
      providerMessageId:
        message.providerMessageId,
      text: message.text,
      type: message.type,
    }
  )

  onReply?.(message)

  setMenuOpen(false)
}

  const handleReaction = () => {
    if (!canUseActions) {
      return
    }

    setReactionOpen(
      current => !current
    )

    setMenuOpen(false)
  }
  const handleSelectReaction = async (
    emoji: string
  ) => {
    if (
      !canUseActions ||
      sendingReaction ||
      !onReact
    ) {
      return
    }

    try {
      setSendingReaction(true)

      await onReact(
        message,
        emoji
      )

      setReactionOpen(false)
    } catch (error) {
      console.error(
        'Erro ao reagir à mensagem:',
        error
      )
    } finally {
      setSendingReaction(false)
    }
  }

  const handleForward = () => {
    if (!canUseActions) {
      return
    }

    onForward?.(message)

    setMenuOpen(false)
  }

  const handleCreateTask = () => {
    if (!canUseActions) {
      return
    }

    onCreateTask?.(message)

    setMenuOpen(false)
  }


  const handleDelete = () => {
    if (!canUseActions) {
      return
    }

    onDelete?.(message)

    setMenuOpen(false)
  }

  const handleOpenSharedContact = async () => {
    if (
      openingSharedContact ||
      !onOpenSharedContact
    ) {
      return
    }

    try {
      setOpeningSharedContact(true)

      await onOpenSharedContact(message)
    } catch (error) {
      console.error(
        'Erro ao abrir contato compartilhado:',
        error
      )
    } finally {
      setOpeningSharedContact(false)
    }
  }

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex w-full ${
        sent
          ? 'justify-end'
          : 'justify-start'
      }`}
    >
      <div
        className={`flex max-w-[85%] items-start gap-1.5 ${
          sent
            ? 'flex-row-reverse'
            : 'flex-row'
        }`}
      >
        <div
          ref={menuRef}
          className="relative min-w-0"
        >
          {sent && (
            <div className="mb-1 flex justify-end px-1">
              <span className="text-[10px] font-medium text-gray-400">
                {message.senderName ||
                  'Atendente'}
              </span>
            </div>
          )}

          <div
            className={`relative max-w-full rounded-xl px-3 py-2 shadow-sm transition ${
              sent
                ? isFailed
                  ? 'rounded-br-sm border border-red-200 bg-red-50 text-gray-900'
                  : 'rounded-br-sm bg-green-100 text-gray-900'
                : 'rounded-bl-sm border border-gray-100 bg-white text-gray-900'
            }`}
          >
            {message.replyTo && (
              <ReplyReference
                replyTo={message.replyTo}
                sent={sent}
                onNavigate={
                  message.replyTo.messageId
                    ? () =>
                        onNavigateToMessage?.(
                          message.replyTo!.messageId!
                        )
                    : undefined
                }
              />
            )}

            {message.type === 'contact' &&
              message.metadata?.contact ? (
                <div className="min-w-[240px]">
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <ContactRound size={24} />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {message.metadata.contact.name ||
                          'Contato'}
                      </div>

                      {message.metadata.contact.phone && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {message.metadata.contact.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenSharedContact}
                    disabled={openingSharedContact}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
                  >
                    {openingSharedContact && (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    )}

                    {openingSharedContact
                      ? 'Buscando contato no CRM...'
                      : 'Mensagem'}
                  </button>
                </div>
            ) : message.media ? (
              <>
                <div className="relative overflow-hidden rounded-lg">
                  {message.media.type === 'image' &&
                  message.media.url ? (
                    <button
                      type="button"
                      onClick={() =>
                        setImagemAmpliada(
                          message.media!.url!
                        )
                      }
                      className="block w-full cursor-zoom-in"
                      title="Clique para ampliar"
                    >
                      <MediaMessage
                        media={message.media}
                      />
                    </button>
                  ) : (
                    <MediaMessage
                      media={message.media}
                    />
                  )}

                  {showMediaSendingOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
                      <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow">
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />

                        <span>
                          Enviando mídia...
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {message.text && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5">
                    {message.text}
                  </p>
                )}
              </>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-5">
                {message.text}
              </p>
            )}

            {isFailed && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                <TriangleAlert
                  size={13}
                />

                <span>
                  Falha no envio
                </span>
              </div>
            )}

            <div
              className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                isFailed
                  ? 'text-red-400'
                  : sent
                    ? 'text-gray-500'
                    : 'text-gray-400'
              }`}
            >
              {sent && isPending && (
                <span className="flex items-center gap-1">
                  <Loader2
                    size={10}
                    className="animate-spin"
                  />

                  Enviando...
                </span>
              )}

              <span>{time}</span>

              {sent && !isPending && (
                <MessageStatus
                  status={message.status}
                />
              )}
            </div>
            {message.reactions &&
          message.reactions.length > 0 && (
            <div
              className={`absolute -bottom-3 z-10 flex ${
                sent
                  ? 'right-2'
                  : 'left-2'
              }`}
            >
              {message.reactions.map(
                reaction => (
                  <div
                    key={reaction.id}
                    className="flex h-6 min-w-6 items-center justify-center rounded-full border border-gray-200 bg-white px-1.5 text-sm shadow-sm"
                    title="Reação"
                  >
                    {reaction.emoji}
                  </div>
                )
              )}
            </div>
          )}
          </div>

          {menuOpen &&
            canUseActions && (
              <MessageMoreMenu
                sent={sent}
                onForward={
                  handleForward
                }
                onCreateTask={
                  handleCreateTask
                }
                onDelete={
                  handleDelete
                }
              />
            )}
        </div>

                {canUseActions && (
          <div
            className={`relative flex shrink-0 items-center gap-0.5 self-center transition-opacity ${
              menuOpen || reactionOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <MessageActionButton
              title="Responder"
              onClick={handleReply}
            >
              <MessageSquareReply size={14} />
            </MessageActionButton>

            <MessageActionButton
              title="Reagir"
              onClick={handleReaction}
            >
              <SmilePlus size={14} />
            </MessageActionButton>

            {reactionOpen && (
              <ReactionPicker
                sent={sent}
                disabled={sendingReaction}
                onSelect={handleSelectReaction}
              />
            )}

            <MessageActionButton
              title="Mais ações"
              active={menuOpen}
              onClick={() =>
                setMenuOpen(current => !current)
              }
            >
              <Ellipsis size={15} />
            </MessageActionButton>
          </div>
        )}
      </div>

      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
          onClick={() =>
            setImagemAmpliada(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setImagemAmpliada(null)
            }
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
            title="Fechar"
          >
            ×
          </button>

          <img
            src={imagemAmpliada}
            alt="Imagem ampliada"
            onClick={event =>
              event.stopPropagation()
            }
            className="max-h-[92vh] max-w-[95vw] object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

function ReplyReference({
  replyTo,
  sent,
  onNavigate,
}: {
  replyTo: NonNullable<WhatsAppMessage['replyTo']>
  sent: boolean
  onNavigate?: () => void
}) {
  const senderLabel =
    replyTo.senderName ||
    'Mensagem'

  const previewText =
    replyTo.text ||
    getReplyTypeLabel(replyTo.type)

  return (
    <button
      type="button"
      onClick={onNavigate}
      disabled={!onNavigate}
      className={`mb-2 block w-full overflow-hidden rounded-lg border-l-4 px-3 py-2 text-left transition ${
        sent
          ? 'border-emerald-500 bg-black/5'
          : 'border-blue-500 bg-gray-50'
      } ${
        onNavigate
          ? 'cursor-pointer hover:bg-black/10'
          : 'cursor-default'
      }`}
    >
      <div className="text-[11px] font-semibold text-emerald-700">
        {senderLabel}
      </div>

      <div className="mt-0.5 line-clamp-2 text-xs leading-4 text-gray-600">
        {previewText}
      </div>
    </button>
  )
}

function getReplyTypeLabel(
  type?: WhatsAppMessage['type']
) {
  switch (type) {
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

function ReactionPicker({
  sent,
  disabled,
  onSelect,
}: {
  sent: boolean
  disabled: boolean
  onSelect: (
    emoji: string
  ) => void
}) {
  const emojis = [
    '👍',
    '❤️',
    '😂',
    '😮',
    '😢',
    '🙏',
  ]

  return (
    <div
      className={`absolute bottom-full z-50 mb-2 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-xl ${
        sent
          ? 'right-0'
          : 'left-0'
      }`}
    >
    
      {emojis.map(emoji => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          onClick={() =>
            onSelect(emoji)
          }
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-gray-100 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

function MessageActionButton({
  title,
  active = false,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-600'
          : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function MessageMoreMenu({
  sent,
  onForward,
  onCreateTask,
  onDelete,
}: {
  sent: boolean
  onForward: () => void
  onCreateTask: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`absolute top-full z-30 mt-1 w-[230px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ${
        sent
          ? 'right-0'
          : 'left-0'
      }`}
    >
      <MenuItem
        icon={
          <Forward size={15} />
        }
        label="Encaminhar"
        onClick={onForward}
      />

      <div className="my-1 border-t border-gray-100" />

      <MenuItem
        icon={
          <ListTodo size={15} />
        }
        label="Criar tarefa"
        onClick={onCreateTask}
      />

      

      <div className="my-1 border-t border-gray-100" />

      <MenuItem
        icon={
          <Trash2 size={15} />
        }
        label="Excluir mensagem"
        onClick={onDelete}
        danger
      />
      
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span
        className={
          danger
            ? 'text-red-400'
            : 'text-gray-400'
        }
      >
        {icon}
      </span>

      {label}
    </button>
  )
}

function MessageStatus({
  status,
}: {
  status: WhatsAppMessage['status']
}) {
  if (status === 'failed') {
    return (
      <span
        title="Falha no envio"
        className="flex items-center text-red-500"
      >
        <TriangleAlert
          size={12}
        />
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span
        title="Enviando"
        className="flex items-center text-gray-400"
      >
        <Loader2
          size={11}
          className="animate-spin"
        />
      </span>
    )
  }

  if (status === 'sent') {
    return (
      <span
        title="Enviada"
        className="flex items-center text-gray-500"
      >
        <Check size={13} />
      </span>
    )
  }

  if (
    status === 'delivered'
  ) {
    return (
      <span
        title="Entregue"
        className="flex items-center text-gray-500"
      >
        <CheckCheck
          size={14}
        />
      </span>
    )
  }

  if (status === 'read') {
    return (
      <span
        title="Lida"
        className="flex items-center text-blue-500"
      >
        <CheckCheck
          size={14}
        />
      </span>
    )
  }

  return null
}