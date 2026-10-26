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
import ModalCompromisso, {
  type ModalCompromissoEdicao,
  type ModalCompromissoReagendamento,
} from '../../../../pages/agenda/components/ModalCompromisso'
import type {
  AgendaItem,
} from '../../../../pages/agenda/types/agenda'
import {
  buscarAgendaClientePorVinculo,
  type AgendaClienteResultado,
} from '../../../../pages/agenda/services/agendaClienteService'
import {
  atualizarCompromisso,
  buscarCompromissoPorId,
  cancelarCompromisso,
  concluirCompromisso,
  criarCompromisso,
  criarCompromissos,
  reagendarCompromisso,
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

  const [
    itens,
    setItens,
  ] = useState<AgendaRow[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    salvandoStatus,
    setSalvandoStatus,
  ] = useState<string | null>(
    null
  )

  /*
   * Modal de novo compromisso.
   */
  const [
    modalAberto,
    setModalAberto,
  ] = useState(false)

  const [
    salvandoNovo,
    setSalvandoNovo,
  ] = useState(false)

  const [
    clienteAgenda,
    setClienteAgenda,
  ] =
    useState<AgendaClienteResultado | null>(
      null
    )

  const [
    carregandoClienteAgenda,
    setCarregandoClienteAgenda,
  ] = useState(false)

  /*
   * Modal de visualização/edição
   * de compromisso existente.
   */
  const [
    compromissoSelecionado,
    setCompromissoSelecionado,
  ] = useState<AgendaItem | null>(
    null
  )

  const [
    modalCompromissoAberto,
    setModalCompromissoAberto,
  ] = useState(false)

  const [
    salvandoCompromisso,
    setSalvandoCompromisso,
  ] = useState(false)

  const [
    abrindoCompromissoId,
    setAbrindoCompromissoId,
  ] = useState<string | null>(
    null
  )

  const corretoraId =
    userProfile?.tipo_usuario ===
    'CORRETORA'
      ? userProfile.id
      : userProfile?.corretora_id ||
        null

  const carregar =
    useCallback(async () => {
      setLoading(true)

      try {
        const coluna =
          cliente.tipo === 'PF'
            ? 'crm_pessoa_id'
            : 'crm_empresa_id'

        const {
          data,
          error,
        } = await supabase
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
          .eq(
            coluna,
            cliente.id
          )
          .order(
            'inicio_em',
            {
              ascending: false,
            }
          )

        if (error) {
          throw error
        }

        const registros =
          (data ||
            []) as AgendaRow[]

        /*
         * Pendentes primeiro:
         *
         * - pendentes em ordem cronológica;
         * - concluídos/cancelados mais
         *   recentes primeiro.
         */
        registros.sort(
          (
            a,
            b
          ) => {
            const aPendente =
              a.status ===
              'PENDENTE'

            const bPendente =
              b.status ===
              'PENDENTE'

            if (
              aPendente &&
              !bPendente
            ) {
              return -1
            }

            if (
              !aPendente &&
              bPendente
            ) {
              return 1
            }

            const dataA =
              new Date(
                a.inicio_em
              ).getTime()

            const dataB =
              new Date(
                b.inicio_em
              ).getTime()

            if (
              aPendente &&
              bPendente
            ) {
              return (
                dataA -
                dataB
              )
            }

            return (
              dataB -
              dataA
            )
          }
        )

        setItens(
          registros
        )
      } catch (
        error: any
      ) {
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

  /*
   * Ao trocar o cliente, limpa todos
   * os estados vinculados ao cliente
   * anterior.
   */
  useEffect(() => {
    setClienteAgenda(null)

    setModalAberto(false)

    setCompromissoSelecionado(
      null
    )

    setModalCompromissoAberto(
      false
    )

    setAbrindoCompromissoId(
      null
    )
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
        await buscarAgendaClientePorVinculo(
          {
            corretoraId,

            crmPessoaId:
              cliente.tipo ===
              'PF'
                ? cliente.id
                : undefined,

            crmEmpresaId:
              cliente.tipo ===
              'PJ'
                ? cliente.id
                : undefined,
          }
        )

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

  /*
   * NOVO COMPROMISSO
   */

  const abrirNovoCompromisso =
    async () => {
      if (
        carregandoClienteAgenda ||
        salvandoNovo
      ) {
        return
      }

      setCarregandoClienteAgenda(
        true
      )

      try {
        const resultado =
          clienteAgenda ||
          (await carregarClienteParaAgenda())

        setClienteAgenda(
          resultado
        )

        setModalAberto(
          true
        )
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ||
            'Não foi possível abrir o novo compromisso.'
        )
      } finally {
        setCarregandoClienteAgenda(
          false
        )
      }
    }

  const salvarNovosCompromissos =
    async (
      payload:
        NovoCompromissoSubmitPayload
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

      if (
        !payload
          .compromissos
          .length
      ) {
        return
      }

      setSalvandoNovo(
        true
      )

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
                cliente.tipo ===
                'PF'
                  ? cliente.id
                  : null,

              crmEmpresaId:
                cliente.tipo ===
                'PJ'
                  ? cliente.id
                  : null,

              clienteIdLegado:
                null,

              tipoOrigem:
                'MANUAL',
            })
          )

        if (
          payloads.length ===
          1
        ) {
          await criarCompromisso(
            payloads[0]
          )
        } else {
          await criarCompromissos(
            payloads
          )
        }

        setModalAberto(
          false
        )

        toast.success(
          payloads.length ===
          1
            ? 'Compromisso criado com sucesso.'
            : `${payloads.length} compromissos criados com sucesso.`
        )

        await carregar()

        if (onUpdated) {
          await onUpdated()
        }
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ||
            'Não foi possível salvar o compromisso.'
        )

        throw error
      } finally {
        setSalvandoNovo(
          false
        )
      }
    }

  /*
   * ABRIR COMPROMISSO EXISTENTE
   */

  const abrirCompromisso =
    async (
      item: AgendaRow
    ) => {
      if (
        abrindoCompromissoId ||
        salvandoCompromisso
      ) {
        return
      }

      setAbrindoCompromissoId(
        item.id
      )

      try {
        /*
         * O card possui apenas os campos
         * resumidos usados nesta aba.
         *
         * O ModalCompromisso trabalha com
         * AgendaItem completo, então buscamos
         * o registro completo pelo ID.
         */
        const compromisso =
          await buscarCompromissoPorId(
            item.id
          )

        if (!compromisso) {
          throw new Error(
            'Compromisso não encontrado.'
          )
        }

        setCompromissoSelecionado(
          compromisso
        )

        setModalCompromissoAberto(
          true
        )
      } catch (error) {
        console.error(
          'Erro ao abrir compromisso:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível abrir o compromisso.'
        )
      } finally {
        setAbrindoCompromissoId(
          null
        )
      }
    }

  const fecharCompromisso =
    () => {
      if (
        salvandoCompromisso
      ) {
        return
      }

      setModalCompromissoAberto(
        false
      )

      setCompromissoSelecionado(
        null
      )
    }

  const atualizarAposAcaoCompromisso =
    async () => {
      await carregar()

      if (onUpdated) {
        await onUpdated()
      }
    }

  /*
   * AÇÕES DO MODAL
   */

  const handleConcluirCompromisso =
    async (
      compromisso: AgendaItem
    ) => {
      if (
        salvandoCompromisso
      ) {
        return
      }

      setSalvandoCompromisso(
        true
      )

      try {
        await concluirCompromisso(
          compromisso.id
        )

        setModalCompromissoAberto(
          false
        )

        setCompromissoSelecionado(
          null
        )

        toast.success(
          'Compromisso concluído.'
        )

        await atualizarAposAcaoCompromisso()
      } catch (error) {
        console.error(
          'Erro ao concluir compromisso:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir o compromisso.'
        )

        throw error
      } finally {
        setSalvandoCompromisso(
          false
        )
      }
    }

  const handleReagendarCompromisso =
    async (
      compromisso: AgendaItem,
      reagendamento:
        ModalCompromissoReagendamento
    ) => {
      if (
        salvandoCompromisso
      ) {
        return
      }

      setSalvandoCompromisso(
        true
      )

      try {
        await reagendarCompromisso(
          compromisso.id,
          {
            inicioEm:
              reagendamento.inicioEm,

            fimEm:
              reagendamento.fimEm,

            diaInteiro:
              reagendamento.diaInteiro,
          }
        )

        setModalCompromissoAberto(
          false
        )

        setCompromissoSelecionado(
          null
        )

        toast.success(
          'Compromisso reagendado.'
        )

        await atualizarAposAcaoCompromisso()
      } catch (error) {
        console.error(
          'Erro ao reagendar compromisso:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível reagendar o compromisso.'
        )

        throw error
      } finally {
        setSalvandoCompromisso(
          false
        )
      }
    }

  const handleEditarCompromisso =
    async (
      compromisso: AgendaItem,
      edicao:
        ModalCompromissoEdicao
    ) => {
      if (
        salvandoCompromisso
      ) {
        return
      }

      setSalvandoCompromisso(
        true
      )

      try {
        await atualizarCompromisso(
          compromisso.id,
          {
            titulo:
              edicao.titulo,

            descricao:
              edicao.descricao,

            categoria:
              edicao.categoria,

            prioridade:
              edicao.prioridade,
          }
        )

        setModalCompromissoAberto(
          false
        )

        setCompromissoSelecionado(
          null
        )

        toast.success(
          'Compromisso atualizado.'
        )

        await atualizarAposAcaoCompromisso()
      } catch (error) {
        console.error(
          'Erro ao editar compromisso:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o compromisso.'
        )

        throw error
      } finally {
        setSalvandoCompromisso(
          false
        )
      }
    }

  const handleCancelarCompromisso =
    async (
      compromisso: AgendaItem
    ) => {
      if (
        salvandoCompromisso
      ) {
        return
      }

      setSalvandoCompromisso(
        true
      )

      try {
        await cancelarCompromisso(
          compromisso.id
        )

        setModalCompromissoAberto(
          false
        )

        setCompromissoSelecionado(
          null
        )

        toast.success(
          'Compromisso cancelado.'
        )

        await atualizarAposAcaoCompromisso()
      } catch (error) {
        console.error(
          'Erro ao cancelar compromisso:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível cancelar o compromisso.'
        )

        throw error
      } finally {
        setSalvandoCompromisso(
          false
        )
      }
    }

  /*
   * BOTÕES RÁPIDOS DO CARD
   *
   * Mantidos para preservar exatamente
   * o comportamento atual da ficha.
   */
  const atualizarStatus =
    async (
      id: string,
      status:
        | 'CONCLUIDO'
        | 'CANCELADO'
    ) => {
      if (
        salvandoStatus
      ) {
        return
      }

      setSalvandoStatus(
        id
      )

      try {
        if (
          status ===
          'CONCLUIDO'
        ) {
          await concluirCompromisso(
            id
          )
        } else {
          await cancelarCompromisso(
            id
          )
        }

        toast.success(
          status ===
          'CONCLUIDO'
            ? 'Compromisso concluído.'
            : 'Compromisso cancelado.'
        )

        await carregar()

        if (onUpdated) {
          await onUpdated()
        }
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ||
            'Não foi possível atualizar o compromisso.'
        )
      } finally {
        setSalvandoStatus(
          null
        )
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

        {itens.length ===
        0 ? (
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
          itens.map(
            item => {
              const salvando =
                salvandoStatus ===
                item.id

              const abrindo =
                abrindoCompromissoId ===
                item.id

              return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir compromisso ${item.titulo}`}
                  onClick={() =>
                    void abrirCompromisso(
                      item
                    )
                  }
                  onKeyDown={
                    event => {
                      if (
                        event.key ===
                          'Enter' ||
                        event.key ===
                          ' '
                      ) {
                        event.preventDefault()

                        void abrirCompromisso(
                          item
                        )
                      }
                    }
                  }
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {abrindo ? (
                          <Loader2
                            size={
                              15
                            }
                            className="shrink-0 animate-spin text-blue-500"
                          />
                        ) : (
                          <CalendarClock
                            size={
                              15
                            }
                            className="shrink-0 text-blue-500"
                          />
                        )}

                        <h4 className="min-w-0 truncate text-sm font-semibold text-slate-800">
                          {
                            item.titulo
                          }
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

                        {
                          item.natureza
                        }
                      </p>

                      {item.descricao && (
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                          {
                            item.descricao
                          }
                        </p>
                      )}
                    </div>

                    <StatusBadge
                      status={
                        item.status
                      }
                    />
                  </div>

                  {item.status ===
                    'PENDENTE' && (
                    <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        disabled={
                          salvando ||
                          abrindo
                        }
                        onClick={
                          event => {
                            /*
                             * Impede que o clique
                             * no botão também abra
                             * o ModalCompromisso.
                             */
                            event.stopPropagation()

                            void atualizarStatus(
                              item.id,
                              'CONCLUIDO'
                            )
                          }
                        }
                        onKeyDown={
                          event =>
                            event.stopPropagation()
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {salvando ? (
                          <Loader2
                            size={
                              13
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCircle2
                            size={
                              13
                            }
                          />
                        )}

                        Concluir
                      </button>

                      <button
                        type="button"
                        disabled={
                          salvando ||
                          abrindo
                        }
                        onClick={
                          event => {
                            /*
                             * Impede que o clique
                             * no botão também abra
                             * o ModalCompromisso.
                             */
                            event.stopPropagation()

                            void atualizarStatus(
                              item.id,
                              'CANCELADO'
                            )
                          }
                        }
                        onKeyDown={
                          event =>
                            event.stopPropagation()
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {salvando ? (
                          <Loader2
                            size={
                              13
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <XCircle
                            size={
                              13
                            }
                          />
                        )}

                        Cancelar
                      </button>
                    </div>
                  )}
                </article>
              )
            }
          )
        )}
      </div>

      {/*
       * MODAL DE COMPROMISSO EXISTENTE
       *
       * Mesmo componente utilizado pela
       * Agenda principal.
       */}
      <ModalCompromisso
        aberto={
          modalCompromissoAberto
        }
        compromisso={
          compromissoSelecionado
        }
        salvando={
          salvandoCompromisso
        }
        onClose={
          fecharCompromisso
        }
        onConcluir={
          handleConcluirCompromisso
        }
        onReagendar={
          handleReagendarCompromisso
        }
        onEditar={
          handleEditarCompromisso
        }
        onCancelar={
          handleCancelarCompromisso
        }
      />

      {/*
       * MODAL DE NOVO COMPROMISSO
       *
       * Fluxo existente preservado.
       */}
      {corretoraId &&
        clienteAgenda && (
          <ModalNovoCompromisso
            aberto={
              modalAberto
            }
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
              if (
                !salvandoNovo
              ) {
                setModalAberto(
                  false
                )
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
        onClick={
          onNovo
        }
        disabled={
          criando
        }
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {criando ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Plus
            size={14}
          />
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
    status ===
    'CONCLUIDO'
      ? 'bg-emerald-50 text-emerald-700'
      : status ===
          'CANCELADO'
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
        onClick={
          onNovo
        }
        disabled={
          criando
        }
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
      >
        {criando ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Plus
            size={14}
          />
        )}

        Criar compromisso
      </button>
    </div>
  )
}