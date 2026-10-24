import {
  Loader2,
  MessageCirclePlus,
  Phone,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { toast } from 'sonner'
import {
  buscarContextoNovaConversa,
  buscarResponsaveisDaConexao,
  type NovaConversaConnection,
  type NovaConversaContext,
  type NovaConversaResponsible,
} from '../services/novaConversaService'
import type {
  StartConversationResult,
} from '../types/whatsapp'

interface NewConversationModalProps {
  open: boolean
  onClose: () => void
  onStartConversation: (data: {
    name: string
    phone: string
    instanceId: string
    assignedUserId?: string | null
  }) => Promise<StartConversationResult>
  onCreated: (conversationId: string) => Promise<void> | void
}

function formatPhone(value: string | null) {
  if (!value) return 'Número não identificado'

  const digits = value.replace(/\D/g, '')
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

  return value
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function getFunctionLabel(
  member: NovaConversaResponsible
) {
  if (member.tipo_usuario === 'CORRETORA') {
    return 'Corretora'
  }

  const labels: Record<string, string> = {
    CORRETOR: 'Corretor',
    ATENDIMENTO: 'Atendimento',
    COMERCIAL: 'Comercial',
    FINANCEIRO: 'Financeiro',
    ADMINISTRATIVO: 'Administrativo',
    OUTRO: 'Outro',
  }

  return member.funcao_equipe
    ? labels[member.funcao_equipe] ||
        member.funcao_equipe
    : 'Corretor'
}

export default function NewConversationModal({
  open,
  onClose,
  onStartConversation,
  onCreated,
}: NewConversationModalProps) {
  const [context, setContext] =
    useState<NovaConversaContext | null>(null)

  const [connections, setConnections] =
    useState<NovaConversaConnection[]>([])

  const [responsibles, setResponsibles] =
    useState<NovaConversaResponsible[]>([])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [connectionId, setConnectionId] =
    useState('')
  const [responsibleId, setResponsibleId] =
    useState('')

  const [loading, setLoading] = useState(false)
  const [loadingResponsibles, setLoadingResponsibles] =
    useState(false)
  const [saving, setSaving] = useState(false)

  const isBroker =
    context?.tipoUsuario === 'CORRETOR'

  const selectedConnection = useMemo(
    () =>
      connections.find(
        item => item.id === connectionId
      ),
    [connections, connectionId]
  )

  useEffect(() => {
    if (!open) return

    let active = true

    const load = async () => {
      setLoading(true)
      setName('')
      setPhone('')
      setConnectionId('')
      setResponsibleId('')
      setResponsibles([])

      try {
        const result =
          await buscarContextoNovaConversa()

        if (!active) return

        setContext(result)
        setConnections(result.connections)

        if (result.connections.length === 1) {
          setConnectionId(
            result.connections[0].id
          )
        }
      } catch (error) {
        if (!active) return

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as conexões.'
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!open || !connectionId) {
      setResponsibles([])
      setResponsibleId('')
      return
    }

    let active = true

    const load = async () => {
      setLoadingResponsibles(true)

      try {
        const items =
          await buscarResponsaveisDaConexao(
            connectionId
          )

        if (!active) return

        setResponsibles(items)

        if (
          context?.tipoUsuario === 'CORRETOR'
        ) {
          setResponsibleId(
            context.userId
          )
          return
        }

        setResponsibleId('')
      } catch (error) {
        if (!active) return

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os responsáveis.'
        )
      } finally {
        if (active) {
          setLoadingResponsibles(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [
    open,
    connectionId,
    context?.tipoUsuario,
    context?.userId,
  ])

  const handleSubmit = async () => {
    if (saving) return

    if (!name.trim()) {
      toast.error('Informe o nome do contato.')
      return
    }

    const digits = phone.replace(/\D/g, '')

    if (digits.length < 10) {
      toast.error(
        'Informe um WhatsApp válido com DDD.'
      )
      return
    }

    if (!connectionId) {
      toast.error(
        'Selecione a conexão WhatsApp.'
      )
      return
    }

    setSaving(true)

    try {
      const result =
        await onStartConversation({
          name: name.trim(),
          phone,
          instanceId: connectionId,
          assignedUserId:
            responsibleId || null,
        })

      if (result.created) {
        toast.success(
          result.contactCreated
            ? 'Contato e conversa criados.'
            : 'Nova conversa criada para o contato.'
        )
      } else {
        toast.info(
          'Este contato já possui uma conversa ativa nessa conexão.'
        )
      }

      await onCreated(
        result.conversationId
      )

      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar a conversa.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageCirclePlus size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Novo contato
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Crie o contato e prepare uma nova conversa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Carregando conexões...
            </div>
          ) : connections.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Nenhuma conexão WhatsApp conectada está disponível para seu usuário.
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <UserRound size={15} />
                  Nome
                </label>

                <input
                  value={name}
                  onChange={event =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: João da Silva"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Phone size={15} />
                  WhatsApp
                </label>

                <input
                  value={phone}
                  onChange={event =>
                    setPhone(
                      maskPhone(
                        event.target.value
                      )
                    )
                  }
                  inputMode="tel"
                  placeholder="(48) 99999-9999"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Conexão WhatsApp
                </label>

                <select
                  value={connectionId}
                  onChange={event =>
                    setConnectionId(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="">
                    Selecione a conexão
                  </option>

                  {connections.map(
                    connection => (
                      <option
                        key={connection.id}
                        value={connection.id}
                      >
                        {connection.nome}
                        {connection.telefone
                          ? ` · ${formatPhone(
                              connection.telefone
                            )}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                {selectedConnection && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    As mensagens desta conversa serão enviadas pelo número{' '}
                    <strong>
                      {selectedConnection.nome}
                    </strong>.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <UsersRound size={15} />
                  Responsável
                </label>

                {loadingResponsibles ? (
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-400">
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                    Carregando...
                  </div>
                ) : (
                  <select
                    value={responsibleId}
                    onChange={event =>
                      setResponsibleId(
                        event.target.value
                      )
                    }
                    disabled={
                      !connectionId ||
                      isBroker
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    {!isBroker && (
                      <option value="">
                        Sem responsável
                      </option>
                    )}

                    {responsibles.map(
                      responsible => (
                        <option
                          key={
                            responsible.id
                          }
                          value={
                            responsible.id
                          }
                        >
                          {responsible.nome} —{' '}
                          {getFunctionLabel(
                            responsible
                          )}
                        </option>
                      )
                    )}
                  </select>
                )}

                {isBroker && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Conversas iniciadas pelo corretor ficam atribuídas a ele.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void handleSubmit()
            }
            disabled={
              saving ||
              loading ||
              connections.length === 0
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <MessageCirclePlus
                size={17}
              />
            )}

            Criar e abrir conversa
          </button>
        </div>
      </div>
    </div>
  )
}