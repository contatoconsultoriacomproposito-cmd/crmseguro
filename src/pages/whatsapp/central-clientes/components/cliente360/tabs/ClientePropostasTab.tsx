import {
  ChevronRight,
  FileText,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../../../../../lib/supabaseClient'
import ModalNovaProposta from '../../../../pages/propostas/components/ModalNovaProposta'
import type { ClienteCentral } from '../../../types/centralClientes'

interface PropostaRow {
  id: string
  numero_proposta: string
  data_emissao: string | null
  data_validade: string | null
  data_venda: string | null
  status: string
  tipo_negocio: string
  valor_total_ofertado: number | null
  valor_total_vendido: number | null
  motivo_perda: string | null
  observacoes: string | null
  created_at: string
}

const moeda = (
  valor: number | null | undefined
) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

const formatarData = (
  valor: string | null | undefined
) => {
  if (!valor) return '—'

  const partes = valor.split('-')
  if (partes.length !== 3) return valor

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const formatarStatus = (status: string) => {
  const labels: Record<string, string> = {
    EM_NEGOCIACAO: 'Em negociação',
    VENDIDA: 'Vendida',
    PERDIDA: 'Perdida',
    CANCELADA: 'Cancelada',
  }

  return labels[status] || status
}

const formatarTipoNegocio = (
  tipo: string
) => {
  const labels: Record<string, string> = {
    NOVO: 'Novo negócio',
    RENOVACAO: 'Renovação',
  }

  return labels[tipo] || tipo
}

const statusClass = (status: string) => {
  switch (status) {
    case 'VENDIDA':
      return 'bg-emerald-50 text-emerald-700'
    case 'PERDIDA':
      return 'bg-rose-50 text-rose-700'
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-amber-50 text-amber-700'
  }
}

export default function ClientePropostasTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const navigate = useNavigate()

  const [itens, setItens] = useState<
    PropostaRow[]
  >([])
  const [loading, setLoading] =
    useState(true)
  const [
    modalNovaPropostaAberto,
    setModalNovaPropostaAberto,
  ] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      const coluna =
        cliente.tipo === 'PF'
          ? 'crm_pessoa_id'
          : 'crm_empresa_id'

      const { data, error } = await supabase
        .from('crm_propostas')
        .select(`
          id,
          numero_proposta,
          data_emissao,
          data_validade,
          data_venda,
          status,
          tipo_negocio,
          valor_total_ofertado,
          valor_total_vendido,
          motivo_perda,
          observacoes,
          created_at
        `)
        .eq(coluna, cliente.id)
        .order('created_at', {
          ascending: false,
        })

      if (error) throw error

      setItens(
        (data || []) as PropostaRow[]
      )
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível carregar as propostas.'
      )
    } finally {
      setLoading(false)
    }
  }, [cliente.id, cliente.tipo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const propostaCriada = async () => {
    setModalNovaPropostaAberto(false)
    await carregar()

    toast.success(
      'Proposta adicionada ao cliente.'
    )
  }

  const abrirProposta = (
    propostaId: string
  ) => {
    navigate(
      `/whatsapp/propostas/${propostaId}`
    )
  }

  if (loading) {
    return <Loading />
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Header
            title="Propostas"
            description="Histórico comercial e negociações deste cliente."
          />

          <button
            type="button"
            onClick={() =>
              setModalNovaPropostaAberto(true)
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={15} />
            Nova proposta
          </button>
        </div>

        {itens.length === 0 ? (
          <Empty
            onCreate={() =>
              setModalNovaPropostaAberto(true)
            }
          />
        ) : (
          <div className="space-y-3">
            {itens.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  abrirProposta(item.id)
                }
                className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText size={17} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">
                          {item.numero_proposta}
                        </h4>

                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass(
                            item.status
                          )}`}
                        >
                          {formatarStatus(
                            item.status
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span>
                          {formatarTipoNegocio(
                            item.tipo_negocio
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          Emitida em{' '}
                          {formatarData(
                            item.data_emissao
                          )}
                        </span>

                        {item.data_validade && (
                          <>
                            <span>•</span>

                            <span>
                              Validade{' '}
                              {formatarData(
                                item.data_validade
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      {item.data_venda && (
                        <p className="mt-2 text-xs font-medium text-emerald-600">
                          Venda realizada em{' '}
                          {formatarData(
                            item.data_venda
                          )}
                        </p>
                      )}

                      {item.motivo_perda && (
                        <p className="mt-2 text-xs text-rose-600">
                          Motivo da perda:{' '}
                          {item.motivo_perda}
                        </p>
                      )}

                      {item.observacoes && (
                        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                          {item.observacoes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="grid grid-cols-2 gap-3 lg:min-w-[300px]">
                      <Valor
                        label="Ofertado"
                        valor={moeda(
                          item.valor_total_ofertado
                        )}
                      />

                      <Valor
                        label="Vendido"
                        valor={moeda(
                          item.valor_total_vendido
                        )}
                        destaque={
                          item.status === 'VENDIDA'
                        }
                      />
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ModalNovaProposta
        open={modalNovaPropostaAberto}
        clienteInicial={{
          id: cliente.id,
          tipo: cliente.tipo,
        }}
        bloquearClienteInicial
        onClose={() =>
          setModalNovaPropostaAberto(false)
        }
        onCreated={() => {
          void propostaCriada()
        }}
      />
    </>
  )
}

function Valor({
  label,
  valor,
  destaque = false,
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${
          destaque
            ? 'text-emerald-600'
            : 'text-slate-700'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}

function Header({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-0.5 text-xs text-slate-400">
        {description}
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <FileText size={18} />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        Nenhuma proposta encontrada.
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Cadastre a primeira proposta comercial deste cliente.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus size={15} />
        Nova proposta
      </button>
    </div>
  )
}
