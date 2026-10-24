import type { WhatsAppConversation } from '../types/whatsapp'
import type { WhatsAppAgendaCommitment } from '../services/whatsappAgendaService'
import { CalendarDays, FileText, Image, Mic, Smartphone, UserRound, Video } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ConversationItemProps {
  conversation: WhatsAppConversation
  selected?: boolean
  onClick: () => void
  nextCommitment?: WhatsAppAgendaCommitment
  onCommitmentClick?: (commitment: WhatsAppAgendaCommitment) => void
  assignedTo?: string
  crmContext?: ConversationCrmContext
}

type Classification = 'Cliente' | 'Não Cliente'
type Temperature = 'Frio' | 'Morno' | 'Quente'

type KanbanStage =
  | 'prospeccao'
  | 'negociacao'
  | 'fechamento'
  | 'pos_venda'
  | 'perdido'
  | 'assistencia'
  | 'sinistro'

interface ConversationCrmContext {
  isCliente: boolean
  temperature?: Temperature
  kanbanStage?: KanbanStage
}

export default function ConversationItem({
  conversation,
  selected,
  onClick,
  nextCommitment,
  onCommitmentClick,
  assignedTo,
  crmContext,
}: ConversationItemProps) {
  const { contact, lastMessage, unreadCount } = conversation
  const [avatarComErro, setAvatarComErro] =
    useState(false)

  useEffect(() => {
    setAvatarComErro(false)
  }, [contact.avatar])
  const time = formatConversationTime(lastMessage?.timestamp || conversation.updatedAt)
  const preview = getMessagePreview(lastMessage)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full border-b px-3 py-3 text-left transition-colors ${selected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}`}
    >
      {selected && <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500" />}

      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
            {contact.avatar && !avatarComErro ? (
              <img
                src={contact.avatar}
                alt={contact.name}
                onError={() =>
                  setAvatarComErro(true)
                }
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(contact.name)
            )}
          </div>

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${unreadCount > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
              {contact.name}
            </span>

            <span className={`shrink-0 text-[10px] ${unreadCount > 0 ? 'font-medium text-emerald-600' : 'text-slate-400'}`}>
              {time}
            </span>
          </div>

          <div className="mt-0.5 flex min-w-0 items-center">
              <MessagePreview
                conversation={conversation}
                preview={preview}
                unread={unreadCount > 0}
              />
            </div>

            {(conversation.instanceName || conversation.instancePhone) && (
              <div
                className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-400"
                title={[
                  conversation.instanceName,
                  conversation.instancePhone
                    ? formatInstancePhone(conversation.instancePhone)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <Smartphone
                  size={11}
                  className={`shrink-0 ${
                    conversation.instanceActive === false
                      ? 'text-slate-300'
                      : 'text-blue-500'
                  }`}
                />

                <span className="truncate">
                  {conversation.instanceName || 'Conexão WhatsApp'}
                </span>

                {conversation.instancePhone && (
                  <>
                    <span className="shrink-0 text-slate-300">
                      ·
                    </span>

                    <span className="shrink-0">
                      {formatInstancePhone(
                        conversation.instancePhone
                      )}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="mt-2 flex min-w-0 items-center gap-1.5">
            <ClassificationBadge classification={crmContext?.isCliente ? 'Cliente' : 'Não Cliente'} />

            {crmContext?.isCliente && crmContext.temperature && (
              <TemperatureBadge temperature={crmContext.temperature} />
            )}

            {crmContext?.isCliente && crmContext.kanbanStage && (
              <KanbanStageBadge stage={crmContext.kanbanStage} />
            )}
          </div>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
              <UserRound
                size={11}
                className={assignedTo ? 'shrink-0 text-slate-400' : 'shrink-0 text-amber-500'}
              />
              <span className={`truncate ${assignedTo ? 'text-slate-400' : 'font-medium text-amber-600'}`}>
                {assignedTo || 'Não atribuído'}
              </span>
            </div>

            {nextCommitment && (
              <CommitmentBadge
                commitment={nextCommitment}
                onClick={onCommitmentClick}
              />
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function CommitmentBadge({
  commitment,
  onClick,
}: {
  commitment: WhatsAppAgendaCommitment
  onClick?: (commitment: WhatsAppAgendaCommitment) => void
}) {
  const label = formatCommitmentLabel(commitment)
  const atrasado = commitment.situacao === 'ATRASADO'

  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation()

    if (!onClick) return

    onClick(commitment)
  }

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={`${commitment.titulo} • ${formatCommitmentDateTime(commitment.inicioEm)}`}
      onClick={handleClick}
      onKeyDown={event => {
        if (!onClick) return

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          onClick(commitment)
        }
      }}
      className={`flex max-w-[132px] shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
        atrasado ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
      } ${onClick ? 'cursor-pointer transition hover:ring-1 hover:ring-current/20' : ''}`}
    >
      <CalendarDays size={10} className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function MessagePreview({
  conversation,
  preview,
  unread,
}: {
  conversation: WhatsAppConversation
  preview: MessagePreviewData
  unread: boolean
}) {
  const lastMessage = conversation.lastMessage

  if (!lastMessage) {
    return <span className="truncate text-xs text-slate-400">Nenhuma mensagem</span>
  }

  const sent = lastMessage.direction === 'outbound'

  return (
    <div className="flex min-w-0 items-center gap-1">
      {preview.icon}
      <span className={`min-w-0 truncate text-xs ${unread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
        {sent && <span className="text-slate-400">Você: </span>}
        {preview.text}
      </span>
    </div>
  )
}

function ClassificationBadge({ classification }: { classification: Classification }) {
  const styles: Record<Classification, string> = {
    Cliente: 'bg-blue-50 text-blue-600',
    'Não Cliente': 'bg-slate-100 text-slate-500',
  }

  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${styles[classification]}`}>
      {classification}
    </span>
  )
}

function TemperatureBadge({ temperature }: { temperature: Temperature }) {
  const styles: Record<Temperature, string> = {
    Frio: 'bg-sky-50 text-sky-600',
    Morno: 'bg-amber-50 text-amber-600',
    Quente: 'bg-orange-50 text-orange-600',
  }

  const labels: Record<Temperature, string> = {
    Frio: '❄ Frio',
    Morno: '◐ Morno',
    Quente: '🔥 Quente',
  }

  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${styles[temperature]}`}>
      {labels[temperature]}
    </span>
  )
}

function KanbanStageBadge({ stage }: { stage: KanbanStage }) {
  const styles: Record<KanbanStage, string> = {
    prospeccao: 'bg-sky-50 text-sky-600',
    negociacao: 'bg-violet-50 text-violet-600',
    fechamento: 'bg-amber-50 text-amber-600',
    pos_venda: 'bg-emerald-50 text-emerald-600',
    perdido: 'bg-slate-100 text-slate-500',
    assistencia: 'bg-cyan-50 text-cyan-600',
    sinistro: 'bg-rose-50 text-rose-600',
  }

  const labels: Record<KanbanStage, string> = {
    prospeccao: 'Prospecção',
    negociacao: 'Negociação',
    fechamento: 'Fechamento',
    pos_venda: 'Pós-venda',
    perdido: 'Perdido',
    assistencia: 'Assistência',
    sinistro: 'Sinistro',
  }

  return (
    <span className={`truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${styles[stage]}`}>
      {labels[stage]}
    </span>
  )
}

interface MessagePreviewData {
  text: string
  icon?: React.ReactNode
}

function getMessagePreview(message?: WhatsAppConversation['lastMessage']): MessagePreviewData {
  if (!message) return { text: 'Nenhuma mensagem' }

  if (message.type === 'image') {
    return {
      text: message.text || 'Imagem',
      icon: <Image size={12} className="shrink-0 text-slate-400" />,
    }
  }

  if (message.type === 'audio') {
    return {
      text: 'Mensagem de áudio',
      icon: <Mic size={12} className="shrink-0 text-slate-400" />,
    }
  }

  if (message.type === 'video') {
    return {
      text: message.text || 'Vídeo',
      icon: <Video size={12} className="shrink-0 text-slate-400" />,
    }
  }

  if (message.type === 'document') {
    return {
      text: message.media?.name || message.text || 'Documento',
      icon: <FileText size={12} className="shrink-0 text-slate-400" />,
    }
  }

  return { text: message.text || 'Mensagem' }
}

function formatCommitmentLabel(commitment: WhatsAppAgendaCommitment) {
  const date = new Date(commitment.inicioEm)
  if (Number.isNaN(date.getTime())) return 'Compromisso'

  const time = commitment.diaInteiro
    ? ''
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (commitment.situacao === 'ATRASADO') return time ? `Atrasado ${time}` : 'Atrasado'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const commitmentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (commitmentDay.getTime() === today.getTime()) return time ? `Hoje ${time}` : 'Hoje'
  if (commitmentDay.getTime() === tomorrow.getTime()) return time ? `Amanhã ${time}` : 'Amanhã'

  const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return time ? `${formattedDate} ${time}` : formattedDate
}

function formatCommitmentDateTime(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatConversationTime(timestamp?: string) {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const differenceInDays = Math.round((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))

  if (differenceInDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (differenceInDays === 1) return 'Ontem'

  if (differenceInDays > 1 && differenceInDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

function formatInstancePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  let national = digits

  if (
    national.startsWith('55') &&
    national.length >= 12
  ) {
    national = national.slice(2)
  }

  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`
  }

  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`
  }

  return phone
}