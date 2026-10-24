import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  XCircle,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'
import { supabase } from '../../../../../../lib/supabaseClient'
import { useAuth } from '../../../../../../auth/AuthContext'
import type { ClienteCentral } from '../../../types/centralClientes'
import { formatarDataHora } from '../../../utils/clienteFormatters'
import ModalNovoCompromisso, {
  type NovoCompromissoSubmitPayload,
} from '../../../../pages/agenda/components/ModalNovoCompromisso'
import {
  buscarAgendaClientePorVinculo,
  type AgendaClienteResultado,
} from '../../../../pages/agenda/services/agendaClienteService'
import {
  cancelarCompromisso,
  concluirCompromisso,
  criarCompromisso,
  criarCompromissos,
} from '../../../../pages/agenda/services/agendaService'

interface AgendaRow {
  id: string
  natureza: string
  categoria: string
  titulo: string
  descricao: string | null
  inicio_em: string
  fim_em: string | null
  dia_inteiro: boolean
  status: string
  prioridade: string
}

interface Props {
  cliente: ClienteCentral
  onUpdated?: () => Promise<void>
}

export default function ClienteAgendaTab({
  cliente,
  onUpdated,
}: Props) {
  const { userProfile } = useAuth()

  const [itens, setItens] = useState<AgendaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoStatus, setSalvandoStatus] =
    useState<string | null>(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  const [
    clienteAgenda,
    setClienteAgenda,
  ] = useState<AgendaClienteResultado | null>(null)

  const [
    carregandoClienteAgenda,
    setCarregandoClienteAgenda,
  ] = useState(false)

  const corretoraId =
    userProfile?.tipo_usuario === 'CORRETORA'
      ? userProfile.id
      : userProfile?.corretora_id || null

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      const coluna =
        cliente.tipo === 'PF'
          ? 'crm_pessoa_id'
          : 'crm_empresa_id'

      const { data, error } = await supabase
        .from('crm_agenda')
        .select(`
          id,
          natureza,
          categoria,
          titulo,
          descricao,
          inicio_em,
          fim_em,
          dia_inteiro,
          status,
          prioridade
        `)
        .eq(coluna, cliente.id)
        .order('inicio_em', {
          ascending: false,
        })

      if (error) throw error

      const registros =
        (data || []) as AgendaRow[]

      /*
       * Pendentes primeiro:
       * - pendentes em ordem cronológica;
       * - concluídos/cancelados mais recentes primeiro.
       */
      registros.sort((a, b) => {
        const aPendente =
          a.status === 'PENDENTE'
        const bPendente =
          b.status === 'PENDENTE'

        if (aPendente && !bPendente) {
          return -1
        }

        if (!aPendente && bPendente) {
          return 1
        }

        const dataA =
          new Date(a.inicio_em).getTime()

        const dataB =
          new Date(b.inicio_em).getTime()

        if (aPendente && bPendente) {
          return dataA - dataB
        }

        return dataB - dataA
      })

      setItens(registros)
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível carregar a agenda.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    cliente.id,
    cliente.tipo,
  ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    setClienteAgenda(null)
    setModalAberto(false)
  }, [
    cliente.id,
    cliente.tipo,
  ])

  const carregarClienteParaAgenda =
    useCallback(async () => {
      if (!corretoraId) {
        throw new Error(
          'Não foi possível identificar a corretora.'
        )
      }

      const resultado =
        await buscarAgendaClientePorVinculo({
          corretoraId,
          crmPessoaId:
            cliente.tipo === 'PF'
              ? cliente.id
              : undefined,
          crmEmpresaId:
            cliente.tipo === 'PJ'
              ? cliente.id
              : undefined,
        })

      if (!resultado) {
        throw new Error(
          'Não foi possível identificar o cliente para a agenda.'
        )
      }

      return resultado
    }, [
      cliente.id,
      cliente.tipo,
      corretoraId,
    ])

  const abrirNovoCompromisso =
    async () => {
      if (
        carregandoClienteAgenda ||
        salvandoNovo
      ) {
        return
      }

      setCarregandoClienteAgenda(true)

      try {
        const resultado =
          clienteAgenda ||
          (await carregarClienteParaAgenda())

        setClienteAgenda(resultado)
        setModalAberto(true)
      } catch (error: any) {
        toast.error(
          error?.message ||
            'Não foi possível abrir o novo compromisso.'
        )
      } finally {
        setCarregandoClienteAgenda(false)
      }
    }

  const salvarNovosCompromissos =
    async (
      payload: NovoCompromissoSubmitPayload
    ) => {
      if (
        !userProfile?.id ||
        !corretoraId ||
        salvandoNovo
      ) {
        return
      }

      const vinculo =
        payload.vinculo ||
        clienteAgenda

      if (!vinculo) {
        toast.error(
          'Não foi possível identificar o cliente vinculado.'
        )
        return
      }

      if (!payload.compromissos.length) {
        return
      }

      setSalvandoNovo(true)

      try {
        const payloads =
          payload.compromissos.map(
            compromisso => ({
              corretoraId,

              /*
               * O compromisso pertence ao
               * responsável atual do cliente.
               */
              responsavelId:
                vinculo.corretorId ||
                userProfile.id,

              criadoPorId:
                userProfile.id,

              natureza:
                compromisso.natureza,

              categoria:
                compromisso.categoria,

              titulo:
                compromisso.titulo,

              descricao:
                compromisso.descricao,

              inicioEm:
                compromisso.inicioEm,

              fimEm:
                compromisso.fimEm,

              diaInteiro:
                compromisso.diaInteiro,

              prioridade:
                compromisso.prioridade,

              crmPessoaId:
                cliente.tipo === 'PF'
                  ? cliente.id
                  : null,

              crmEmpresaId:
                cliente.tipo === 'PJ'
                  ? cliente.id
                  : null,

              clienteIdLegado: null,

              tipoOrigem: 'MANUAL',
            })
          )

        if (payloads.length === 1) {
          await criarCompromisso(
            payloads[0]
          )
        } else {
          await criarCompromissos(
            payloads
          )
        }

        setModalAberto(false)

        toast.success(
          payloads.length === 1
            ? 'Compromisso criado com sucesso.'
            : `${payloads.length} compromissos criados com sucesso.`
        )

        await carregar()

        if (onUpdated) {
          await onUpdated()
        }
      } catch (error: any) {
        toast.error(
          error?.message ||
            'Não foi possível salvar o compromisso.'
        )

        throw error
      } finally {
        setSalvandoNovo(false)
      }
    }

  const atualizarStatus = async (
    id: string,
    status:
      | 'CONCLUIDO'
      | 'CANCELADO'
  ) => {
    if (salvandoStatus) {
      return
    }

    setSalvandoStatus(id)

    try {
      if (status === 'CONCLUIDO') {
        await concluirCompromisso(id)
      } else {
        await cancelarCompromisso(id)
      }

      toast.success(
        status === 'CONCLUIDO'
          ? 'Compromisso concluído.'
          : 'Compromisso cancelado.'
      )

      await carregar()

      if (onUpdated) {
        await onUpdated()
      }
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível atualizar o compromisso.'
      )
    } finally {
      setSalvandoStatus(null)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <>
      <div className="space-y-3">
        <Header
          title="Agenda"
          description="Compromissos vinculados a este cliente."
          onNovo={() =>
            void abrirNovoCompromisso()
          }
          criando={
            carregandoClienteAgenda ||
            salvandoNovo
          }
        />

        {itens.length === 0 ? (
          <Empty
            text="Nenhum compromisso encontrado."
            onNovo={() =>
              void abrirNovoCompromisso()
            }
            criando={
              carregandoClienteAgenda ||
              salvandoNovo
            }
          />
        ) : (
          itens.map(item => {
            const salvando =
              salvandoStatus === item.id

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CalendarClock
                        size={15}
                        className="shrink-0 text-blue-500"
                      />

                      <h4 className="min-w-0 truncate text-sm font-semibold text-slate-800">
                        {item.titulo}
                      </h4>

                      <Badge
                        value={
                          item.categoria
                        }
                      />

                      {item.prioridade !==
                        'NORMAL' && (
                        <Badge
                          value={
                            item.prioridade
                          }
                        />
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatarDataHora(
                        item.inicio_em
                      )}

                      {item.fim_em &&
                        ` até ${formatarDataHora(
                          item.fim_em
                        )}`}

                      {' · '}
                      {item.natureza}
                    </p>

                    {item.descricao && (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                        {item.descricao}
                      </p>
                    )}
                  </div>

                  <StatusBadge
                    status={item.status}
                  />
                </div>

                {item.status ===
                  'PENDENTE' && (
                  <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() =>
                        void atualizarStatus(
                          item.id,
                          'CONCLUIDO'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {salvando ? (
                        <Loader2
                          size={13}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2
                          size={13}
                        />
                      )}

                      Concluir
                    </button>

                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() =>
                        void atualizarStatus(
                          item.id,
                          'CANCELADO'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle
                        size={13}
                      />
                      Cancelar
                    </button>
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      {corretoraId &&
        clienteAgenda && (
          <ModalNovoCompromisso
            aberto={modalAberto}
            corretoraId={
              corretoraId
            }
            clienteInicial={
              clienteAgenda
            }
            bloquearClienteInicial
            salvando={
              salvandoNovo
            }
            onClose={() => {
              if (!salvandoNovo) {
                setModalAberto(false)
              }
            }}
            onSubmit={
              salvarNovosCompromissos
            }
          />
        )}
    </>
  )
}

function Header({
  title,
  description,
  onNovo,
  criando,
}: {
  title: string
  description: string
  onNovo: () => void
  criando: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-slate-800">
          {title}
        </h3>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onNovo}
        disabled={criando}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {criando ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Plus size={14} />
        )}

        Novo compromisso
      </button>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const classe =
    status === 'CONCLUIDO'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'CANCELADO'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-amber-50 text-amber-700'

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${classe}`}
    >
      {status}
    </span>
  )
}

function Badge({
  value,
}: {
  value: string
}) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
      {value}
    </span>
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
  text,
  onNovo,
  criando,
}: {
  text: string
  onNovo: () => void
  criando: boolean
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 text-center">
      <CalendarClock
        size={24}
        className="text-slate-300"
      />

      <p className="text-sm text-slate-400">
        {text}
      </p>

      <button
        type="button"
        onClick={onNovo}
        disabled={criando}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
      >
        {criando ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Plus size={14} />
        )}

        Criar compromisso
      </button>
    </div>
  )
}