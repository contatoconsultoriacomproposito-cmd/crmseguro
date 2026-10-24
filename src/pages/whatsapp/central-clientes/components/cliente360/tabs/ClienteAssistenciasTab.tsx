import {
  CalendarClock,
  Headphones,
  Loader2,
  Plus,
  UserRound,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  buscarAssistenciasDoCliente,
  type CrmAssistencia,
} from '../../../../services/crmAssistenciaService'
import ModalNovaAssistencia from '../../../../pages/assistencias/components/ModalNovaAssistencia'
import type { ClienteCentral } from '../../../types/centralClientes'
import { useNavigate } from 'react-router-dom'

const formatarTexto = (
  valor?: string | null
) => {
  if (!valor) return '—'

  return valor
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letra =>
      letra.toUpperCase()
    )
}

const formatarDataHora = (
  valor?: string | null
) => {
  if (!valor) return 'Data não informada'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return valor
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

const statusClass = (
  status?: string | null
) => {
  switch (status) {
    case 'CONCLUIDA':
      return 'bg-emerald-50 text-emerald-700'
    case 'CANCELADA':
    case 'NAO_ATENDIDA':
      return 'bg-rose-50 text-rose-700'
    case 'EM_ATENDIMENTO':
      return 'bg-blue-50 text-blue-700'
    case 'AGENDADA':
      return 'bg-violet-50 text-violet-700'
    case 'AGUARDANDO_SEGURADORA':
    case 'AGUARDANDO_PRESTADOR':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-cyan-50 text-cyan-700'
  }
}

export default function ClienteAssistenciasTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const navigate = useNavigate()
  const [itens, setItens] = useState<
    CrmAssistencia[]
  >([])
  const [loading, setLoading] =
    useState(true)
  const [
    modalNovaAssistenciaAberto,
    setModalNovaAssistenciaAberto,
  ] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      const parametros =
        cliente.tipo === 'PF'
          ? {
              crm_pessoa_id: cliente.id,
              cliente_id_legado:
                cliente.clienteIdLegado || null,
            }
          : {
              crm_empresa_id: cliente.id,
              cliente_id_legado:
                cliente.clienteIdLegado || null,
            }

      const resultado =
        await buscarAssistenciasDoCliente(
          parametros
        )

      setItens(
        (resultado || []) as CrmAssistencia[]
      )
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível carregar as assistências.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    cliente.id,
    cliente.tipo,
    cliente.clienteIdLegado,
  ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const assistenciaCriada = async () => {
    setModalNovaAssistenciaAberto(false)
    await carregar()

    toast.success(
      'Assistência adicionada ao cliente.'
    )
  }

  if (loading) {
    return <Loading />
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Header />

          <button
            type="button"
            onClick={() =>
              setModalNovaAssistenciaAberto(true)
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={15} />
            Nova assistência
          </button>
        </div>

        {itens.length === 0 ? (
          <Empty
            onCreate={() =>
              setModalNovaAssistenciaAberto(true)
            }
          />
        ) : (
          <div className="space-y-3">
            {itens.map(item => (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(`/whatsapp/assistencia/${item.id}`)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault()
                    navigate(`/whatsapp/assistencia/${item.id}`)
                  }
                }}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                      <Headphones size={17} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">
                          {formatarTexto(
                            item.tipo_assistencia
                          )}
                        </h4>

                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass(
                            item.status
                          )}`}
                        >
                          {formatarTexto(
                            item.status
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        Solicitada em{' '}
                        {formatarDataHora(
                          item.solicitado_em
                        )}
                      </p>

                      {item.descricao_solicitacao && (
                        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                          {
                            item.descricao_solicitacao
                          }
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        {item.protocolo && (
                          <span>
                            Protocolo:{' '}
                            <strong className="font-semibold text-slate-700">
                              {item.protocolo}
                            </strong>
                          </span>
                        )}

                        {item.numero_atendimento && (
                          <span>
                            Atendimento:{' '}
                            <strong className="font-semibold text-slate-700">
                              {
                                item.numero_atendimento
                              }
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                    <InfoCard
                      icon={
                        <UserRound size={14} />
                      }
                      label="Prestador"
                      value={
                        item.prestador_nome ||
                        'Não informado'
                      }
                    />

                    <InfoCard
                      icon={
                        <CalendarClock size={14} />
                      }
                      label="Previsão"
                      value={formatarDataHora(
                        item.previsao_atendimento_em
                      )}
                    />
                  </div>
                </div>

                {item.observacoes && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Observações
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                      {item.observacoes}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <ModalNovaAssistencia
        open={modalNovaAssistenciaAberto}
        clienteInicial={{
          id: cliente.id,
          tipo: cliente.tipo,
        }}
        bloquearClienteInicial
        onClose={() =>
          setModalNovaAssistenciaAberto(false)
        }
        onCreated={() => {
          void assistenciaCriada()
        }}
      />
    </>
  )
}

function Header() {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-800">
        Assistências
      </h3>

      <p className="mt-0.5 text-xs text-slate-400">
        Solicitações e histórico de assistência deste cliente.
      </p>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <p className="text-[9px] font-bold uppercase tracking-wide">
          {label}
        </p>
      </div>

      <p className="mt-1 text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2
        size={22}
        className="animate-spin text-blue-600"
      />
    </div>
  )
}

function Empty({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
        <Headphones size={18} />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        Nenhuma assistência encontrada.
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Registre a primeira solicitação de assistência deste cliente.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus size={15} />
        Nova assistência
      </button>
    </div>
  )
}
