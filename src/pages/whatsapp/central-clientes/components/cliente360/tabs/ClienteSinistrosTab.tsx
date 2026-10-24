import {
  AlertTriangle,
  CalendarDays,
  FileWarning,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'
import {
  buscarSinistrosDoCliente,
  type CrmSinistro,
} from '../../../../services/crmSinistroService'
import ModalNovoSinistro from '../../../../pages/sinistros/components/ModalNovoSinistro'
import type { ClienteCentral } from '../../../types/centralClientes'
import { useNavigate } from 'react-router-dom'

const moeda = (
  valor: number | null | undefined
) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

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

const formatarData = (
  valor?: string | null
) => {
  if (!valor) return 'Não informada'

  const partes = valor.split('-')
  if (partes.length !== 3) return valor

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const statusClass = (
  status?: string | null
) => {
  switch (status) {
    case 'CONCLUIDO':
      return 'bg-emerald-50 text-emerald-700'
    case 'NEGADO':
    case 'CANCELADO':
      return 'bg-rose-50 text-rose-700'
    case 'SUSPENSO':
      return 'bg-slate-100 text-slate-600'
    case 'AGUARDANDO_CLIENTE':
    case 'AGUARDANDO_SEGURADORA':
    case 'AGUARDANDO_TERCEIRO_PRESTADOR':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-blue-50 text-blue-700'
  }
}

const prioridadeClass = (
  prioridade?: string | null
) => {
  switch (prioridade) {
    case 'URGENTE':
      return 'text-rose-600'
    case 'ALTA':
      return 'text-orange-600'
    case 'BAIXA':
      return 'text-slate-400'
    default:
      return 'text-slate-600'
  }
}

export default function ClienteSinistrosTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const navigate = useNavigate()
  const [itens, setItens] = useState<
    CrmSinistro[]
  >([])
  const [loading, setLoading] =
    useState(true)
  const [
    modalNovoSinistroAberto,
    setModalNovoSinistroAberto,
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
        await buscarSinistrosDoCliente(
          parametros
        )

      const statusAbertos = new Set([
        'ABERTO',
        'AGUARDANDO_CLIENTE',
        'AGUARDANDO_SEGURADORA',
        'AGUARDANDO_TERCEIRO_PRESTADOR',
        'SUSPENSO',
      ])

      setItens(
        (resultado || []).filter(
          item =>
            statusAbertos.has(item.status)
        ) as CrmSinistro[]
      )
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível carregar os sinistros.'
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

  const sinistroCriado = async () => {
    setModalNovoSinistroAberto(false)
    await carregar()

    toast.success(
      'Sinistro adicionado ao cliente.'
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
              setModalNovoSinistroAberto(true)
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={15} />
            Novo sinistro
          </button>
        </div>

        {itens.length === 0 ? (
          <Empty
            onCreate={() =>
              setModalNovoSinistroAberto(true)
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
                  navigate(`/whatsapp/sinistro/${item.id}`)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault()
                    navigate(`/whatsapp/sinistro/${item.id}`)
                  }
                }}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <AlertTriangle size={17} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">
                          {item.numero_sinistro ||
                            formatarTexto(
                              item.tipo_sinistro
                            ) ||
                            'Sinistro'}
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

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span>
                          {formatarTexto(
                            item.tipo_sinistro
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          Evento em{' '}
                          {formatarData(
                            item.data_evento
                          )}
                        </span>

                        {item.hora_evento && (
                          <>
                            <span>•</span>
                            <span>
                              {item.hora_evento.slice(
                                0,
                                5
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      {item.descricao_evento && (
                        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                          {item.descricao_evento}
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

                        <span>
                          Etapa:{' '}
                          <strong className="font-semibold text-slate-700">
                            {formatarTexto(
                              item.etapa_atual
                            )}
                          </strong>
                        </span>

                        <span>
                          Prioridade:{' '}
                          <strong
                            className={`font-semibold ${prioridadeClass(
                              item.prioridade
                            )}`}
                          >
                            {formatarTexto(
                              item.prioridade
                            )}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                    <InfoCard
                      icon={
                        <FileWarning size={14} />
                      }
                      label="Prejuízo estimado"
                      value={
                        item.valor_prejuizo_estimado !==
                        null
                          ? moeda(
                              item.valor_prejuizo_estimado
                            )
                          : 'Não informado'
                      }
                    />

                    <InfoCard
                      icon={
                        <CalendarDays size={14} />
                      }
                      label="Data do aviso"
                      value={formatarData(
                        item.data_aviso
                      )}
                    />
                  </div>
                </div>

                {(item.local_evento ||
                  item.causa_evento) && (
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {item.local_evento && (
                      <span>
                        Local:{' '}
                        <strong className="font-semibold text-slate-700">
                          {item.local_evento}
                        </strong>
                      </span>
                    )}

                    {item.causa_evento && (
                      <span>
                        Causa:{' '}
                        <strong className="font-semibold text-slate-700">
                          {item.causa_evento}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <ModalNovoSinistro
        open={modalNovoSinistroAberto}
        clienteInicial={{
          id: cliente.id,
          tipo: cliente.tipo,
        }}
        bloquearClienteInicial
        onClose={() =>
          setModalNovoSinistroAberto(false)
        }
        onCreated={() => {
          void sinistroCriado()
        }}
      />
    </>
  )
}

function Header() {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-800">
        Sinistros
      </h3>

      <p className="mt-0.5 text-xs text-slate-400">
        Ocorrências e acompanhamento de sinistros deste cliente.
      </p>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle size={18} />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        Nenhum sinistro encontrado.
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Registre o primeiro sinistro deste cliente.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus size={15} />
        Novo sinistro
      </button>
    </div>
  )
}
