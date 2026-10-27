import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WhatsAppAttendant, WhatsAppConversation } from '../types/whatsapp'
import { useWhatsApp } from '../hooks/useWhatsApp'
import ConversationItem from './ConversationItem'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter,
  Inbox,
  Search,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import { buscarAgendaWhatsApp, subscribeAgendaWhatsApp } from '../services/whatsappAgendaService'
import type { WhatsAppAgendaCommitment, WhatsAppAgendaData } from '../services/whatsappAgendaService'
import {
  buscarResumoClientesWhatsApp,
  subscribeResumoClientesWhatsApp,
  type WhatsAppClienteResumo,
} from '../services/crmWhatsAppClienteService'
import ModalCompromisso, {
  type ModalCompromissoEdicao,
  type ModalCompromissoReagendamento,
} from '../pages/agenda/components/ModalCompromisso'
import {
  atualizarCompromisso,
  buscarCompromissoPorId,
  cancelarCompromisso,
  concluirCompromisso,
  reagendarCompromisso,
} from '../pages/agenda/services/agendaService'

import type { AgendaItem } from '../pages/agenda/types/agenda'



interface ConversationListProps {
  conversations: WhatsAppConversation[]
  selectedId?: string
  loading?: boolean
  onSelect: (id: string) => void
}

type InboxFilter =
  | 'all'
  | 'mine'
  | 'unassigned'
  | 'closed_inactive'
type RegistrationFilter = 'all' | 'client' | 'non_client'
type QualificationFilter = 'all' | 'NAO_QUALIFICADO' | 'LEAD'
type KanbanStageFilter =
  | 'all'
  | 'prospeccao'
  | 'negociacao'
  | 'fechamento'
  | 'pos_venda'
  | 'perdido'
  | 'assistencia'
  | 'sinistro'
type TemperatureFilter = 'all' | 'Frio' | 'Morno' | 'Quente'
type ResponsibleFilter = 'all' | 'unassigned' | string
type ViewMode = 'conversations' | 'commitments'
type CommitmentFilter = 'all' | 'overdue' | 'today' | 'upcoming'

const EMPTY_AGENDA: WhatsAppAgendaData = {
  atrasados: [],
  hoje: [],
  proximos: [],
  todos: [],
  proximoPorConversa: {},
}

export default function ConversationList({
  conversations,
  selectedId,
  loading,
  onSelect,
}: ConversationListProps) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const whatsapp = useWhatsApp()
  const [attendants, setAttendants] = useState<WhatsAppAttendant[]>([])
  const [attendantsLoading, setAttendantsLoading] = useState(false)
  const [crmClientsByContactId, setCrmClientsByContactId] = useState<Map<string, WhatsAppClienteResumo>>(
    () => new Map()
  )
  const [search, setSearch] = useState('')
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>('all')
  const [qualificationFilter, setQualificationFilter] = useState<QualificationFilter>('all')
  const [kanbanStageFilter, setKanbanStageFilter] = useState<KanbanStageFilter>('all')
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>('all')
  const [responsibleFilter, setResponsibleFilter] = useState<ResponsibleFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('conversations')
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('all')
  const [agenda, setAgenda] = useState<WhatsAppAgendaData>(EMPTY_AGENDA)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [agendaError, setAgendaError] = useState<string | null>(null)
  const [compromissoSelecionado, setCompromissoSelecionado] = useState<AgendaItem | null>(null)
  const [modalCompromissoAberto, setModalCompromissoAberto] = useState(false)
  const [salvandoCompromisso, setSalvandoCompromisso] = useState(false)

  const corretoraId = userProfile?.tipo_usuario === 'CORRETORA' ? userProfile.id : userProfile?.corretora_id

  useEffect(() => {
  let active = true

  const loadAttendants = async () => {
    if (!userProfile?.id) {
      setAttendants([])
      return
    }

    setAttendantsLoading(true)

    try {
      const data = await whatsapp.getAttendants()
      if (active) setAttendants(data)
    } catch (error) {
      console.error('❌ ConversationList → erro ao carregar responsáveis:', error)
      if (active) setAttendants([])
    } finally {
      if (active) setAttendantsLoading(false)
    }
  }

  void loadAttendants()

  return () => {
    active = false
  }
}, [userProfile?.id, whatsapp])

const loadCrmClients = useCallback(async () => {
  if (!corretoraId || conversations.length === 0) {
    setCrmClientsByContactId(new Map())
    return
  }

  try {
    const data = await buscarResumoClientesWhatsApp()
    setCrmClientsByContactId(data)
  } catch (error) {
    console.error('❌ ConversationList → erro ao carregar vínculos CRM:', error)
  }
}, [corretoraId, conversations.length])

useEffect(() => {
  void loadCrmClients()
}, [loadCrmClients])

useEffect(() => {
  if (!corretoraId) return

  return subscribeResumoClientesWhatsApp(corretoraId, () => {
    void loadCrmClients()
  })
}, [corretoraId, loadCrmClients])

const attendantById = useMemo(
  () => new Map(attendants.map(attendant => [attendant.id, attendant])),
  [attendants]
)

  const loadAgenda = useCallback(async (silent = false) => {
  if (!corretoraId || conversations.length === 0) {
    setAgenda(EMPTY_AGENDA)
    setAgendaError(null)
    setAgendaLoading(false)
    return
  }

  if (!silent) setAgendaLoading(true)
  setAgendaError(null)

  try {
    const data = await buscarAgendaWhatsApp(corretoraId, conversations)
    setAgenda(data)
  } catch (error) {
    console.error('❌ ConversationList → erro ao carregar compromissos:', error)
    if (!silent) setAgenda(EMPTY_AGENDA)
    setAgendaError('Não foi possível carregar os compromissos.')
  } finally {
    if (!silent) setAgendaLoading(false)
  }
}, [corretoraId, conversations])

useEffect(() => {
  void loadAgenda()
}, [loadAgenda])

useEffect(() => {
  if (!corretoraId) return

  return subscribeAgendaWhatsApp(corretoraId, () => {
    void loadAgenda(true)
  })
}, [corretoraId, loadAgenda])

const handleAbrirCompromisso = useCallback(async (commitment: WhatsAppAgendaCommitment) => {
  try {
    const compromisso = await buscarCompromissoPorId(commitment.id)

    if (!compromisso) {
      console.warn('⚠️ ConversationList → compromisso não encontrado:', commitment.id)
      return
    }

    setCompromissoSelecionado(compromisso)
    setModalCompromissoAberto(true)
  } catch (error) {
    console.error('❌ ConversationList → erro ao abrir compromisso:', error)
  }
}, [])

const handleFecharCompromisso = useCallback(() => {
  if (salvandoCompromisso) return

  setModalCompromissoAberto(false)
  setCompromissoSelecionado(null)
}, [salvandoCompromisso])

const handleConcluirCompromisso = useCallback(async (compromisso: AgendaItem) => {
  setSalvandoCompromisso(true)

  try {
    await concluirCompromisso(compromisso.id)
    setModalCompromissoAberto(false)
    setCompromissoSelecionado(null)
    await loadAgenda(true)
  } finally {
    setSalvandoCompromisso(false)
  }
}, [loadAgenda])

const handleReagendarCompromisso = useCallback(async (
  compromisso: AgendaItem,
  payload: ModalCompromissoReagendamento
) => {
  setSalvandoCompromisso(true)

  try {
    await reagendarCompromisso(compromisso.id, payload)
    setModalCompromissoAberto(false)
    setCompromissoSelecionado(null)
    await loadAgenda(true)
  } finally {
    setSalvandoCompromisso(false)
  }
}, [loadAgenda])

const handleEditarCompromisso = useCallback(async (
  compromisso: AgendaItem,
  payload: ModalCompromissoEdicao
) => {
  setSalvandoCompromisso(true)

  try {
    await atualizarCompromisso(compromisso.id, payload)
    setModalCompromissoAberto(false)
    setCompromissoSelecionado(null)
    await loadAgenda(true)
  } finally {
    setSalvandoCompromisso(false)
  }
}, [loadAgenda])

const handleCancelarCompromisso = useCallback(async (compromisso: AgendaItem) => {
  setSalvandoCompromisso(true)

  try {
    await cancelarCompromisso(compromisso.id)
    setModalCompromissoAberto(false)
    setCompromissoSelecionado(null)
    await loadAgenda(true)
  } finally {
    setSalvandoCompromisso(false)
  }
}, [loadAgenda])

  const filteredConversations = useMemo(() => {
    const normalizedSearch = normalizeText(search)

    return conversations.filter(conversation => {
      const isClosedOrInactive =
        conversation.status === 'encerrada' ||
        conversation.instanceActive === false

      if (inboxFilter === 'closed_inactive') {
        if (!isClosedOrInactive) {
          return false
        }
      } else if (isClosedOrInactive) {
        return false
      }

      const crmClient =
        crmClientsByContactId.get(conversation.contact.id)

      const isCliente = Boolean(crmClient)
      const isLead =
        crmClient?.classificacao === 'LEAD'

      const currentTemperature =
        crmClient?.temperatura === 'FRIO'
          ? 'Frio'
          : crmClient?.temperatura === 'MORNO'
            ? 'Morno'
            : crmClient?.temperatura === 'QUENTE'
              ? 'Quente'
              : null

      if (
        registrationFilter === 'client' &&
        !isCliente
      ) {
        return false
      }

      if (
        registrationFilter === 'non_client' &&
        isCliente
      ) {
        return false
      }

      if (
        qualificationFilter !== 'all' &&
        crmClient?.classificacao !== qualificationFilter
      ) {
        return false
      }

      if (kanbanStageFilter !== 'all') {
        if (!isLead) {
          return false
        }

        if (
          conversation.etapaKanban !==
          kanbanStageFilter
        ) {
          return false
        }
      }

      if (
        temperatureFilter !== 'all' &&
        currentTemperature !== temperatureFilter
      ) {
        return false
      }

      if (
        inboxFilter === 'mine' &&
        conversation.assignedUserId !== userProfile?.id
      ) {
        return false
      }

      if (
        inboxFilter === 'unassigned' &&
        conversation.assignedUserId
      ) {
        return false
      }

      if (
        responsibleFilter === 'unassigned' &&
        conversation.assignedUserId
      ) {
        return false
      }

      if (
        responsibleFilter !== 'all' &&
        responsibleFilter !== 'unassigned' &&
        conversation.assignedUserId !== responsibleFilter
      ) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const contactName =
        normalizeText(conversation.contact.name)

      const phone =
        normalizeText(conversation.contact.phone)

      const lastMessage =
        normalizeText(
          conversation.lastMessage?.text || ''
        )

      const responsibleName =
        conversation.assignedUserId
          ? normalizeText(
              attendantById.get(
                conversation.assignedUserId
              )?.name || ''
            )
          : ''

      const instanceName =
        normalizeText(
          conversation.instanceName || ''
        )

      const instancePhone =
        normalizeText(
          conversation.instancePhone || ''
        )

      return (
        contactName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        lastMessage.includes(normalizedSearch) ||
        responsibleName.includes(normalizedSearch) ||
        instanceName.includes(normalizedSearch) ||
        instancePhone.includes(normalizedSearch)
      )
    })
  }, [
    conversations,
    search,
    inboxFilter,
    registrationFilter,
    qualificationFilter,
    kanbanStageFilter,
    temperatureFilter,
    responsibleFilter,
    userProfile?.id,
    attendantById,
    crmClientsByContactId,
  ])

  const commitmentsByFilter = useMemo(() => {
    if (commitmentFilter === 'overdue') return agenda.atrasados
    if (commitmentFilter === 'today') return agenda.hoje
    if (commitmentFilter === 'upcoming') return agenda.proximos
    return agenda.todos
  }, [agenda, commitmentFilter])

  const filteredCommitments = useMemo(() => {
    const normalizedSearch = normalizeText(search)
    if (!normalizedSearch) return commitmentsByFilter

    return commitmentsByFilter.filter(commitment => {
      return (
        normalizeText(commitment.contactName).includes(normalizedSearch) ||
        normalizeText(commitment.contactPhone || '').includes(normalizedSearch) ||
        normalizeText(commitment.titulo).includes(normalizedSearch) ||
        normalizeText(commitment.descricao || '').includes(normalizedSearch) ||
        normalizeText(commitment.categoria).includes(normalizedSearch)
      )
    })
  }, [commitmentsByFilter, search])

  const groupedCommitments = useMemo(() => {
    if (commitmentFilter !== 'all') return null

    const filteredIds = new Set(filteredCommitments.map(item => item.id))

    return {
      atrasados: agenda.atrasados.filter(item => filteredIds.has(item.id)),
      hoje: agenda.hoje.filter(item => filteredIds.has(item.id)),
      proximos: agenda.proximos.filter(item => filteredIds.has(item.id)),
    }
  }, [agenda, commitmentFilter, filteredCommitments])

  const activeAdvancedFilters =
    Number(registrationFilter !== 'all') +
    Number(qualificationFilter !== 'all') +
    Number(kanbanStageFilter !== 'all') +
    Number(temperatureFilter !== 'all') +
    Number(responsibleFilter !== 'all')

  const hasAdvancedFilters = activeAdvancedFilters > 0

  const clearAdvancedFilters = () => {
    setRegistrationFilter('all')
    setQualificationFilter('all')
    setKanbanStageFilter('all')
    setTemperatureFilter('all')
    setResponsibleFilter('all')
  }

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    setSearch('')
    setFiltersOpen(false)

    if (mode === 'conversations') setCommitmentFilter('all')
  }

  const handleOpenConversation = (conversationId: string) => {
    setViewMode('conversations')
    setSearch('')
    onSelect(conversationId)
  }
return (
  <>
    <aside className="flex h-full w-full min-w-0 flex-col bg-white">
      <div className="shrink-0 border-b bg-white">
        <div className="px-3 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                {viewMode === 'conversations' ? 'Conversas' : 'Compromissos'}
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-400">
                {viewMode === 'conversations'
                  ? filteredConversations.length === 1
                    ? '1 conversa'
                    : `${filteredConversations.length} conversas`
                  : agenda.todos.length === 1
                    ? '1 compromisso'
                    : `${agenda.todos.length} compromissos`}
              </p>
            </div>
<div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                title="Visualização Kanban"
                onClick={() => navigate('/whatsapp/kanban')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <Columns3 size={16} />
              </button>

              <button
                type="button"
                title={viewMode === 'conversations' ? 'Visualizar compromissos' : 'Voltar para conversas'}
                onClick={() => changeViewMode(viewMode === 'conversations' ? 'commitments' : 'conversations')}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  viewMode === 'commitments'
                    ? 'border-blue-200 bg-blue-50 text-blue-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <CalendarDays size={16} />

                {viewMode === 'conversations' && agenda.atrasados.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">
                    {agenda.atrasados.length > 99 ? '99+' : agenda.atrasados.length}
                  </span>
                )}
              </button>

              {viewMode === 'conversations' && (
                <button
                  type="button"
                  title="Filtros"
                  onClick={() => setFiltersOpen(current => !current)}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                    filtersOpen || hasAdvancedFilters
                      ? 'border-blue-200 bg-blue-50 text-blue-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <SlidersHorizontal size={16} />

                  {activeAdvancedFilters > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[9px] font-bold text-white">
                      {activeAdvancedFilters}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={viewMode === 'conversations' ? 'Pesquisar conversa...' : 'Pesquisar compromisso...'}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Limpar pesquisa"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {viewMode === 'conversations' ? (
          <>
            <div className="grid grid-cols-4 px-2">
              <InboxTab
                active={inboxFilter === 'all'}
                icon={<Inbox size={13} />}
                label="Todas"
                onClick={() => setInboxFilter('all')}
              />

              <InboxTab
                active={inboxFilter === 'mine'}
                icon={<UserRound size={13} />}
                label="Minhas"
                onClick={() => setInboxFilter('mine')}
              />

              <InboxTab
                active={inboxFilter === 'unassigned'}
                icon={<UsersRound size={13} />}
                label="Sem dono"
                onClick={() => setInboxFilter('unassigned')}
              />

              <InboxTab
                active={inboxFilter === 'closed_inactive'}
                icon={<Archive size={13} />}
                label="Encerradas"
                title="Encerradas / Inativas"
                onClick={() => setInboxFilter('closed_inactive')}
              />
            </div>

            {filtersOpen && (
              <AdvancedFilters
                registration={registrationFilter}
                qualification={qualificationFilter}
                kanbanStage={kanbanStageFilter}
                temperature={temperatureFilter}
                responsible={responsibleFilter}
                attendants={attendants}
                attendantsLoading={attendantsLoading}
                onRegistrationChange={setRegistrationFilter}
                onQualificationChange={setQualificationFilter}
                onKanbanStageChange={setKanbanStageFilter}
                onTemperatureChange={setTemperatureFilter}
                onResponsibleChange={setResponsibleFilter}
                onClear={clearAdvancedFilters}
                onClose={() => setFiltersOpen(false)}
              />
            )}

            {hasAdvancedFilters && !filtersOpen && (
              <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-2">
                <Filter size={11} className="shrink-0 text-blue-500" />

                <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-blue-600">
                  {activeAdvancedFilters === 1 ? '1 filtro ativo' : `${activeAdvancedFilters} filtros ativos`}
                </span>

                <button type="button" onClick={clearAdvancedFilters} className="text-[10px] font-medium text-slate-400 transition hover:text-slate-700">
                  Limpar
                </button>
              </div>
            )}
          </>
        ) : (
          <CommitmentTabs
            active={commitmentFilter}
            total={agenda.todos.length}
            overdue={agenda.atrasados.length}
            today={agenda.hoje.length}
            upcoming={agenda.proximos.length}
            onChange={setCommitmentFilter}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewMode === 'conversations' ? (
          loading ? (
            <ConversationListLoading />
          ) : filteredConversations.length === 0 ? (
            <EmptyState hasSearch={Boolean(search.trim())} />
          ) : (
            filteredConversations.map(conversation => {
            const assignedTo = conversation.assignedUserId
              ? attendantById.get(conversation.assignedUserId)?.name
              : undefined

            const crmClient = crmClientsByContactId.get(conversation.contact.id)

            const temperature =
              crmClient?.temperatura === 'FRIO'
                ? 'Frio'
                : crmClient?.temperatura === 'MORNO'
                  ? 'Morno'
                  : crmClient?.temperatura === 'QUENTE'
                    ? 'Quente'
                    : undefined

            const kanbanStage =
              crmClient?.classificacao === 'LEAD'
                ? conversation.etapaKanban
                : undefined

            return (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                selected={conversation.id === selectedId}
                nextCommitment={agenda.proximoPorConversa[conversation.id]}
                onCommitmentClick={handleAbrirCompromisso}
                assignedTo={assignedTo}
                crmContext={{
                  isCliente: Boolean(crmClient),
                  temperature,
                  kanbanStage,
                }}
                onClick={() => onSelect(conversation.id)}
              />
            )
          })
          )
        ) : agendaLoading ? (
          <CommitmentListLoading />
        ) : agendaError ? (
          <CommitmentError message={agendaError} />
        ) : filteredCommitments.length === 0 ? (
          <CommitmentEmptyState hasSearch={Boolean(search.trim())} filter={commitmentFilter} />
        ) : groupedCommitments ? (
          <div className="pb-2">
            <CommitmentGroup
              title="Atrasados"
              items={groupedCommitments.atrasados}
              variant="overdue"
              onOpenConversation={handleOpenConversation}
            />

            <CommitmentGroup
              title="Hoje"
              items={groupedCommitments.hoje}
              variant="today"
              onOpenConversation={handleOpenConversation}
            />

            <CommitmentGroup
              title="Próximos"
              items={groupedCommitments.proximos}
              variant="upcoming"
              onOpenConversation={handleOpenConversation}
            />
          </div>
        ) : (
          <div className="pb-2">
            {filteredCommitments.map(commitment => (
              <CommitmentItem key={commitment.id} commitment={commitment} onOpenConversation={handleOpenConversation} />
            ))}
          </div>
        )}
      </div>

      {viewMode === 'commitments' && (
        <div className="shrink-0 border-t border-slate-100 bg-white p-2.5">
          <button
            type="button"
            onClick={() => navigate('/agenda')}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            Abrir agenda completa
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </aside>

    <ModalCompromisso
      aberto={modalCompromissoAberto}
      compromisso={compromissoSelecionado}
      salvando={salvandoCompromisso}
      onClose={handleFecharCompromisso}
      onConcluir={handleConcluirCompromisso}
      onReagendar={handleReagendarCompromisso}
      onEditar={handleEditarCompromisso}
      onCancelar={handleCancelarCompromisso}
    />
  </>
)
}

function InboxTab({
  active,
  icon,
  label,
  title,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      className={`relative flex min-w-0 items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium transition ${
        active
          ? 'text-blue-600'
          : 'text-slate-400 hover:text-slate-700'
      }`}
    >
      <span className="shrink-0">
        {icon}
      </span>

      <span className="truncate">
        {label}
      </span>

      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-500" />
      )}
    </button>
  )
}

function CommitmentTabs({
  active,
  total,
  overdue,
  today,
  upcoming,
  onChange,
}: {
  active: CommitmentFilter
  total: number
  overdue: number
  today: number
  upcoming: number
  onChange: (filter: CommitmentFilter) => void
}) {
  return (
    <div className="flex border-t border-slate-100 px-1">
      <CommitmentTab active={active === 'all'} label="Todos" count={total} onClick={() => onChange('all')} />
      <CommitmentTab active={active === 'overdue'} label="Atrasados" count={overdue} danger={overdue > 0} onClick={() => onChange('overdue')} />
      <CommitmentTab active={active === 'today'} label="Hoje" count={today} onClick={() => onChange('today')} />
      <CommitmentTab active={active === 'upcoming'} label="Próximos" count={upcoming} onClick={() => onChange('upcoming')} />
    </div>
  )
}

function CommitmentTab({
  active,
  label,
  count,
  danger = false,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium transition ${
        active ? (danger ? 'text-red-600' : 'text-blue-600') : 'text-slate-400 hover:text-slate-700'
      }`}
    >
      <span className="truncate">{label}</span>

      <span
        className={`flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[8px] font-semibold ${
          active
            ? danger
              ? 'bg-red-50 text-red-600'
              : 'bg-blue-50 text-blue-600'
            : danger && count > 0
              ? 'bg-red-50 text-red-500'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {count > 99 ? '99+' : count}
      </span>

      {active && <span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${danger ? 'bg-red-500' : 'bg-blue-500'}`} />}
    </button>
  )
}

function CommitmentGroup({
  title,
  items,
  variant,
  onOpenConversation,
}: {
  title: string
  items: WhatsAppAgendaCommitment[]
  variant: 'overdue' | 'today' | 'upcoming'
  onOpenConversation: (conversationId: string) => void
}) {
  if (items.length === 0) return null

  const titleStyle =
    variant === 'overdue'
      ? 'text-red-500'
      : variant === 'today'
        ? 'text-blue-600'
        : 'text-slate-500'

  return (
    <section>
      <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-slate-100 bg-slate-50/95 px-3 py-2 backdrop-blur-sm">
        <span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${titleStyle}`}>{title}</span>
        <span className="text-[9px] font-medium text-slate-400">{items.length}</span>
      </div>

      {items.map(commitment => (
        <CommitmentItem key={commitment.id} commitment={commitment} onOpenConversation={onOpenConversation} />
      ))}
    </section>
  )
}

function CommitmentItem({
  commitment,
  onOpenConversation,
}: {
  commitment: WhatsAppAgendaCommitment
  onOpenConversation: (conversationId: string) => void
}) {
  const overdue = commitment.situacao === 'ATRASADO'

  return (
    <div className="border-b border-slate-100 bg-white px-3 py-3 transition hover:bg-slate-50">
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            overdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
          }`}
        >
          {getInitials(commitment.contactName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
              {commitment.contactName}
            </span>

            <span className={`shrink-0 text-[10px] font-semibold ${overdue ? 'text-red-500' : 'text-slate-500'}`}>
              {formatCommitmentWhen(commitment)}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600">{commitment.titulo}</p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
              {formatCategory(commitment.categoria)}
            </span>

            <button
              type="button"
              onClick={() => onOpenConversation(commitment.conversationId)}
              className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Abrir conversa
              <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdvancedFilters({
  registration,
  qualification,
  kanbanStage,
  temperature,
  responsible,
  attendants,
  attendantsLoading,
  onRegistrationChange,
  onQualificationChange,
  onKanbanStageChange,
  onTemperatureChange,
  onResponsibleChange,
  onClear,
  onClose,
}: {
  registration: RegistrationFilter
  qualification: QualificationFilter
  kanbanStage: KanbanStageFilter
  temperature: TemperatureFilter
  responsible: ResponsibleFilter
  attendants: WhatsAppAttendant[]
  attendantsLoading: boolean
  onRegistrationChange: (value: RegistrationFilter) => void
  onQualificationChange: (value: QualificationFilter) => void
  onKanbanStageChange: (value: KanbanStageFilter) => void
  onTemperatureChange: (value: TemperatureFilter) => void
  onResponsibleChange: (value: ResponsibleFilter) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Filtros</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-3">
        <FilterSelect
          label="Cadastro"
          value={registration}
          options={['all', 'client', 'non_client']}
          labels={{
            all: 'Todos',
            client: 'Cliente',
            non_client: 'Não Cliente',
          }}
          onChange={value => onRegistrationChange(value as RegistrationFilter)}
        />

        <FilterSelect
          label="Qualificação"
          value={qualification}
          options={['all', 'NAO_QUALIFICADO', 'LEAD']}
          labels={{
            all: 'Todas',
            NAO_QUALIFICADO: 'Não qualificado',
            LEAD: 'Lead',
          }}
          onChange={value => onQualificationChange(value as QualificationFilter)}
        />

        <FilterSelect
          label="Etapa do Kanban"
          value={kanbanStage}
          options={[
            'all',
            'prospeccao',
            'negociacao',
            'fechamento',
            'pos_venda',
            'perdido',
            'assistencia',
            'sinistro',
          ]}
          labels={{
            all: 'Todas',
            prospeccao: 'Prospecção',
            negociacao: 'Negociação',
            fechamento: 'Fechamento',
            pos_venda: 'Pós-venda',
            perdido: 'Perdido',
            assistencia: 'Assistência',
            sinistro: 'Sinistro',
          }}
          onChange={value => onKanbanStageChange(value as KanbanStageFilter)}
        />

        <FilterSelect
          label="Temperatura"
          value={temperature}
          options={['all', 'Frio', 'Morno', 'Quente']}
          labels={{
            all: 'Todas',
            Frio: '❄ Frio',
            Morno: '◐ Morno',
            Quente: '🔥 Quente',
          }}
          onChange={value => onTemperatureChange(value as TemperatureFilter)}
        />

        <FilterSelect
          label="Responsável"
          value={responsible}
          options={['all', 'unassigned', ...attendants.map(attendant => attendant.id)]}
          labels={{
            all: 'Todos',
            unassigned: 'Não atribuído',
            ...Object.fromEntries(
              attendants.map(attendant => [attendant.id, attendant.name])
            ),
          }}
          onChange={value => onResponsibleChange(value as ResponsibleFilter)}
          disabled={attendantsLoading}
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-slate-500 transition hover:text-slate-800"
        >
          Limpar filtros
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-700"
        >
          Concluir
        </button>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  options: string[]
  labels: Record<string, string>
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-slate-500">{label}</label>

      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
          className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 pr-8 text-[11px] text-slate-700 outline-none transition focus:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {options.map(option => (
            <option key={option} value={option}>
              {labels[option]}
            </option>
          ))}
        </select>

        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

function ConversationListLoading() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex animate-pulse gap-3 rounded-lg px-1 py-3">
          <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-2.5 w-8 rounded bg-slate-100" />
            </div>

            <div className="mt-2 h-2.5 w-full rounded bg-slate-100" />

            <div className="mt-2 flex gap-1.5">
              <div className="h-4 w-12 rounded bg-slate-100" />
              <div className="h-4 w-14 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CommitmentListLoading() {
  return (
    <div className="p-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex animate-pulse gap-2.5 border-b border-slate-100 py-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />

          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-3">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-2.5 w-14 rounded bg-slate-100" />
            </div>

            <div className="mt-2 h-2.5 w-36 rounded bg-slate-100" />

            <div className="mt-2 flex justify-between">
              <div className="h-4 w-16 rounded bg-slate-100" />
              <div className="h-3 w-20 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {hasSearch ? <Search size={18} /> : <Inbox size={18} />}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">
        {hasSearch ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
      </p>

      <p className="mt-1 max-w-[200px] text-[11px] leading-4 text-slate-400">
        {hasSearch
          ? 'Tente pesquisar por outro nome, telefone ou conteúdo da mensagem.'
          : 'As conversas do WhatsApp aparecerão aqui.'}
      </p>
    </div>
  )
}

function CommitmentEmptyState({ hasSearch, filter }: { hasSearch: boolean; filter: CommitmentFilter }) {
  const message = hasSearch
    ? 'Nenhum compromisso encontrado'
    : filter === 'overdue'
      ? 'Nenhum compromisso atrasado'
      : filter === 'today'
        ? 'Nenhum compromisso para hoje'
        : filter === 'upcoming'
          ? 'Nenhum próximo compromisso'
          : 'Nenhum compromisso'

  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {hasSearch ? <Search size={18} /> : <CalendarDays size={18} />}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>

      <p className="mt-1 max-w-[210px] text-[11px] leading-4 text-slate-400">
        {hasSearch
          ? 'Tente pesquisar por outro cliente, título ou categoria.'
          : 'Os compromissos relacionados às conversas aparecerão aqui.'}
      </p>
    </div>
  )
}

function CommitmentError({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-400">
        <CalendarDays size={18} />
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">Agenda indisponível</p>
      <p className="mt-1 max-w-[210px] text-[11px] leading-4 text-slate-400">{message}</p>
    </div>
  )
}

function formatCommitmentWhen(commitment: WhatsAppAgendaCommitment) {
  const date = new Date(commitment.inicioEm)
  if (Number.isNaN(date.getTime())) return ''

  const time = commitment.diaInteiro
    ? 'Dia inteiro'
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (commitment.situacao === 'ATRASADO') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const commitmentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (commitmentDay.getTime() === yesterday.getTime()) {
      return commitment.diaInteiro ? 'Ontem' : `Ontem ${time}`
    }

    const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    return commitment.diaInteiro ? formattedDate : `${formattedDate} ${time}`
  }

  if (commitment.situacao === 'HOJE') {
    return commitment.diaInteiro ? 'Hoje' : time
  }

  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  tomorrow.setDate(tomorrow.getDate() + 1)

  const commitmentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (commitmentDay.getTime() === tomorrow.getTime()) {
    return commitment.diaInteiro ? 'Amanhã' : `Amanhã ${time}`
  }

  const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return commitment.diaInteiro ? formattedDate : `${formattedDate} ${time}`
}

function formatCategory(category: string) {
  if (!category) return 'Compromisso'

  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, character => character.toUpperCase())
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}