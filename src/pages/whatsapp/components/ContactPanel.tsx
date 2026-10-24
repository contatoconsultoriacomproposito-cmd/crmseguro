import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Database,
  Flame,
  Heart,
  ListTodo,
  Loader2,
  Plus,
  Search,
  Snowflake,
  ThermometerSun,
  Unlink2,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  WhatsAppConversation,
  WhatsAppKanbanStage,
} from '../types/whatsapp'

import ModalCadastroWhatsApp from '../automation/components/ModalCadastroWhatsApp'

import {
  buscarTarefasWhatsApp,
  concluirTarefaWhatsApp,
  type WhatsAppTask,
} from '../services/whatsappTaskService'

import {
  buscarClienteCrmPorContatoWhatsApp,
  buscarClientesParaVinculo,
  importarClienteLegadoEVincular,
  vincularClienteExistenteAoWhatsApp,
  desvincularClienteDoWhatsApp,
  type ClienteBuscaVinculo,
  type CrmWhatsAppVinculo,
} from '../services/crmWhatsAppClienteService'

import {
  atualizarEmpresa,
  atualizarPessoa,
  buscarProdutosPortfolioCrm,
  type CrmClassificacao,
  type CrmProdutoPortfolio,
} from '../services/crmClienteService'

import ContactHeader from './contact-panel/ContactHeader'
import ContactDadosTab from './contact-panel/ContactDadosTab'
import ContactPropostasTab from './contact-panel/ContactPropostasTab'
import ContactContratosTab from './contact-panel/ContactContratosTab'
import ContactFinanceiroTab from './contact-panel/ContactFinanceiroTab'
import ContactComissoesTab from './contact-panel/ContactComissoesTab'
import ContactAssistenciasTab from './contact-panel/ContactAssistenciasTab'
import ContactSinistrosTab from './contact-panel/ContactSinistrosTab'

interface ContactPanelProps {
  conversation?: WhatsAppConversation
  onClose?: () => void
  onContactUpdate?: (
    conversationId: string,
    updates: Partial<WhatsAppConversation['contact']>
  ) => void
  onChangeKanbanStage?: (
    conversationId: string,
    stage: WhatsAppKanbanStage
  ) => Promise<void>
}

type Tab =
  | 'dados'
  | 'propostas'
  | 'contratos'
  | 'financeiro'
  | 'comissoes'
  | 'assistencias'
  | 'sinistros'

type Temperatura =
  | ''
  | 'FRIO'
  | 'MORNO'
  | 'QUENTE'

type AccordionKey =
  | 'tarefas'
  | 'classificacao'
  | 'temperatura'
  | 'etapa'
  | 'produtos'
  | 'anotacoes'

const tabs: {
  id: Tab
  label: string
}[] = [
  {
    id: 'dados',
    label: 'Dados',
  },
  {
    id: 'propostas',
    label: 'Propostas',
  },
  {
    id: 'contratos',
    label: 'Contratos',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
  },
  {
    id: 'comissoes',
    label: 'Comissões',
  },
  {
    id: 'assistencias',
    label: 'Assistências',
  },
  {
    id: 'sinistros',
    label: 'Sinistros',
  },
]

const fases: {
  value: WhatsAppKanbanStage
  label: string
}[] = [
  {
    value: 'prospeccao',
    label: 'Prospecção',
  },
  {
    value: 'negociacao',
    label: 'Negociação',
  },
  {
    value: 'fechamento',
    label: 'Fechamento',
  },
  {
    value: 'pos_venda',
    label: 'Pós-venda',
  },
  {
    value: 'perdido',
    label: 'Perdido',
  },
  {
    value: 'assistencia',
    label: 'Assistência',
  },
  {
    value: 'sinistro',
    label: 'Sinistro',
  },
]

export default function ContactPanel({
  conversation,
  onClose,
  onChangeKanbanStage,
  onContactUpdate,
}: ContactPanelProps) {
  

  const [
    activeTab,
    setActiveTab,
  ] = useState<Tab>('dados')

  const [
    cadastroWhatsAppAberto,
    setCadastroWhatsAppAberto,
  ] = useState(false)

  const [
    clienteCrm,
    setClienteCrm,
  ] =
    useState<CrmWhatsAppVinculo | null>(
      null
    )

  const [
    carregandoClienteCrm,
    setCarregandoClienteCrm,
  ] = useState(false)

  const [
    salvandoCampo,
    setSalvandoCampo,
  ] =
    useState<string | null>(null)

  const [
    portfolio,
    setPortfolio,
  ] = useState<
    CrmProdutoPortfolio[]
  >([])

  const [
    carregandoPortfolio,
    setCarregandoPortfolio,
  ] = useState(false)

  const [
    seletorProdutosAberto,
    setSeletorProdutosAberto,
  ] = useState(false)

  const [
    buscaProduto,
    setBuscaProduto,
  ] = useState('')

  const [
    observacoes,
    setObservacoes,
  ] = useState('')

  const [
    buscaClienteAberta,
    setBuscaClienteAberta,
  ] = useState(false)

  const [
    termoBuscaCliente,
    setTermoBuscaCliente,
  ] = useState('')

  const [
    resultadosBuscaCliente,
    setResultadosBuscaCliente,
  ] = useState<
    ClienteBuscaVinculo[]
  >([])

  const [
    buscandoCliente,
    setBuscandoCliente,
  ] = useState(false)

  const [
    buscaClienteExecutada,
    setBuscaClienteExecutada,
  ] = useState(false)

  const [
    vinculandoClienteId,
    setVinculandoClienteId,
  ] =
    useState<string | null>(null)

  const [
    desvinculandoCliente,
    setDesvinculandoCliente,
  ] = useState(false)

  const [
    secaoAberta,
    setSecaoAberta,
  ] =
    useState<AccordionKey | null>(
      'classificacao'
    )

  const [
    tarefas,
    setTarefas,
  ] = useState<
    WhatsAppTask[]
  >([])

  const [
    carregandoTarefas,
    setCarregandoTarefas,
  ] = useState(false)

  const [
    concluindoTarefaId,
    setConcluindoTarefaId,
  ] =
    useState<string | null>(null)

  const carregarClienteCrm =
    useCallback(
      async (
        contatoId?: string
      ) => {
        if (!contatoId) {
          setClienteCrm(null)
          return
        }

        try {
          setCarregandoClienteCrm(
            true
          )

          const resultado =
            await buscarClienteCrmPorContatoWhatsApp(
              contatoId
            )

          setClienteCrm(
            resultado
          )
        } catch (error) {
          console.error(
            'Erro ao consultar cliente CRM do WhatsApp:',
            error
          )

          setClienteCrm(null)
        } finally {
          setCarregandoClienteCrm(
            false
          )
        }
      },
      []
    )

  const carregarPortfolio =
    useCallback(async () => {
      try {
        setCarregandoPortfolio(
          true
        )

        const resultado =
          await buscarProdutosPortfolioCrm()

        setPortfolio(
          resultado
        )
      } catch (error) {
        console.error(
          'Erro ao carregar portfólio:',
          error
        )

        toast.error(
          'Não foi possível carregar os produtos da corretora.'
        )
      } finally {
        setCarregandoPortfolio(
          false
        )
      }
    }, [])

  const carregarTarefas =
    useCallback(async () => {
      if (!conversation?.id) {
        setTarefas([])
        return
      }

      try {
        setCarregandoTarefas(
          true
        )

        const resultado =
          await buscarTarefasWhatsApp(
            conversation.id
          )

        setTarefas(
          resultado
        )
      } catch (error) {
        console.error(
          'Erro ao carregar tarefas:',
          error
        )

        setTarefas([])
      } finally {
        setCarregandoTarefas(
          false
        )
      }
    }, [conversation?.id])

  useEffect(() => {
    void carregarTarefas()
  }, [carregarTarefas])

  useEffect(() => {
    if (!conversation) {
      return
    }

    setActiveTab('dados')
    setCadastroWhatsAppAberto(
      false
    )
    setClienteCrm(null)

    setBuscaClienteAberta(
      false
    )

    setTermoBuscaCliente('')
    setResultadosBuscaCliente([])
    setBuscaClienteExecutada(
      false
    )
    setVinculandoClienteId(
      null
    )

    setSeletorProdutosAberto(
      false
    )
    setBuscaProduto('')

    setSecaoAberta(
      'classificacao'
    )

    void carregarClienteCrm(
      conversation.contact.id
    )
  }, [
    conversation?.id,
    conversation?.contact.id,
    carregarClienteCrm,
  ])

  useEffect(() => {
    if (!clienteCrm) {
      setPortfolio([])
      return
    }

    void carregarPortfolio()
  }, [
    clienteCrm,
    carregarPortfolio,
  ])

  const registro =
    useMemo(
      () =>
        getRegistroCrm(
          clienteCrm
        ),
      [clienteCrm]
    )

  const dados =
    useMemo(
      () =>
        asObject(
          registro?.dados
        ),
      [registro]
    )

  const classificacao =
    (
      registro?.classificacao ||
      'NAO_QUALIFICADO'
    ) as CrmClassificacao

  const temperatura =
    normalizarTemperatura(
      dados.temperatura
    )

  const etapaKanbanCliente =
    classificacao === 'LEAD' &&
    registro?.etapa_kanban
      ? (registro.etapa_kanban as WhatsAppKanbanStage)
      : null

  const produtosInteresse =
    asStringArray(
      dados.produtos_interesse
    )

  const clienteContexto =
    useMemo(() => {
      if (!clienteCrm) {
        return null
      }

      if (
        clienteCrm.tipo ===
        'PF'
      ) {
        return {
          clienteId:
            clienteCrm.pessoa.id,
          tipoCliente:
            'PF' as const,
        }
      }

      return {
        clienteId:
          clienteCrm.empresa.id,
        tipoCliente:
          'PJ' as const,
      }
    }, [clienteCrm])

  useEffect(() => {
    setObservacoes(
      String(
        dados.observacoes ||
          ''
      )
    )
  }, [
    registro?.id,
    dados.observacoes,
  ])

  const salvar =
    useCallback(
      async (
        campo: string,
        alteracoesDados?: Record<
          string,
          unknown
        >,
        novaClassificacao?: CrmClassificacao
      ) => {
        if (
          !clienteCrm ||
          !registro?.id
        ) {
          return
        }

        try {
          setSalvandoCampo(
            campo
          )

          const tipo =
            getTipoVinculo(
              clienteCrm
            )

          const payload: any =
            {}

          if (
            alteracoesDados
          ) {
            payload.dados =
              alteracoesDados
          }

          if (
            novaClassificacao
          ) {
            payload.classificacao =
              novaClassificacao
          }

          if (
            tipo === 'PJ'
          ) {
            await atualizarEmpresa(
              registro.id,
              payload
            )
          } else {
            await atualizarPessoa(
              registro.id,
              payload
            )
          }

          if (conversation) {
            await carregarClienteCrm(
              conversation.contact
                .id
            )

            if (
              campo ===
                'temperatura' &&
              onContactUpdate
            ) {
              const novaTemperatura =
                alteracoesDados?.temperatura

              onContactUpdate(
                conversation.id,
                {
                  temperatura:
                    novaTemperatura ===
                      'FRIO' ||
                    novaTemperatura ===
                      'MORNO' ||
                    novaTemperatura ===
                      'QUENTE'
                      ? novaTemperatura
                      : undefined,
                }
              )
            }
          }

          toast.success(
            'CRM atualizado.'
          )
        } catch (error: any) {
          console.error(
            `Erro ao atualizar ${campo}:`,
            error
          )

          toast.error(
            error?.message ||
              'Não foi possível atualizar o CRM.'
          )
        } finally {
          setSalvandoCampo(
            null
          )
        }
      },
      [
        clienteCrm,
        registro?.id,
        conversation,
        carregarClienteCrm,
        onContactUpdate,
      ]
    )

  const desvincularCliente =
    useCallback(async () => {
      if (
        !clienteCrm ||
        !conversation
          ?.contact.id ||
        desvinculandoCliente
      ) {
        return
      }

      const confirmar =
        window.confirm(
          'Deseja desvincular este cliente da conversa do WhatsApp?\n\nNenhum dado do cliente, conversa ou histórico será excluído.'
        )

      if (!confirmar) {
        return
      }

      try {
        setDesvinculandoCliente(
          true
        )

        await desvincularClienteDoWhatsApp(
          clienteCrm
        )

        await carregarClienteCrm(
          conversation.contact.id
        )

        setActiveTab(
          'dados'
        )

        toast.success(
          'Cliente desvinculado da conversa.'
        )
      } catch (error) {
        console.error(
          'Erro ao desvincular cliente:',
          error
        )

        toast.error(
          error instanceof
            Error
            ? error.message
            : 'Não foi possível desvincular o cliente.'
        )
      } finally {
        setDesvinculandoCliente(
          false
        )
      }
    }, [
      clienteCrm,
      conversation,
      desvinculandoCliente,
      carregarClienteCrm,
    ])

  const executarBuscaCliente =
    useCallback(
      async (
        termoInformado?: string
      ) => {
        const termo = (
          termoInformado ??
          termoBuscaCliente
        ).trim()

        if (
          termo.length < 3
        ) {
          setResultadosBuscaCliente(
            []
          )
          setBuscaClienteExecutada(
            false
          )
          return
        }

        try {
          setBuscandoCliente(
            true
          )

          setBuscaClienteExecutada(
            true
          )

          const resultados =
            await buscarClientesParaVinculo(
              termo
            )

          setResultadosBuscaCliente(
            resultados
          )
        } catch (error) {
          console.error(
            'Erro ao buscar clientes para vínculo:',
            error
          )

          setResultadosBuscaCliente(
            []
          )

          toast.error(
            error instanceof
              Error
              ? error.message
              : 'Não foi possível pesquisar os clientes.'
          )
        } finally {
          setBuscandoCliente(
            false
          )
        }
      },
      [termoBuscaCliente]
    )

  useEffect(() => {
    if (
      !buscaClienteAberta
    ) {
      return
    }

    const termo =
      termoBuscaCliente.trim()

    if (
      termo.length < 3
    ) {
      setResultadosBuscaCliente(
        []
      )

      setBuscaClienteExecutada(
        false
      )

      return
    }

    const timeout =
      window.setTimeout(
        () => {
          void executarBuscaCliente(
            termo
          )
        },
        400
      )

    return () => {
      window.clearTimeout(
        timeout
      )
    }
  }, [
    buscaClienteAberta,
    termoBuscaCliente,
    executarBuscaCliente,
  ])

  const fecharBuscaCliente =
    useCallback(() => {
      setBuscaClienteAberta(
        false
      )

      setTermoBuscaCliente('')
      setResultadosBuscaCliente(
        []
      )
      setBuscaClienteExecutada(
        false
      )
      setVinculandoClienteId(
        null
      )
    }, [])

  const abrirBuscaCliente =
    useCallback(() => {
      setBuscaClienteAberta(
        true
      )

      setTermoBuscaCliente('')
      setResultadosBuscaCliente(
        []
      )
      setBuscaClienteExecutada(
        false
      )
      setVinculandoClienteId(
        null
      )
    }, [])

  const vincularCliente =
    useCallback(
      async (
        cliente: ClienteBuscaVinculo
      ) => {
        if (
          !conversation
            ?.contact.id ||
          vinculandoClienteId
        ) {
          return
        }

        const chaveCliente =
          `${cliente.origem}-${cliente.id}`

        try {
          setVinculandoClienteId(
            chaveCliente
          )

          if (
            cliente.origem ===
            'LEGADO'
          ) {
            await importarClienteLegadoEVincular(
              cliente,
              conversation
                .contact.id
            )
          } else {
            await vincularClienteExistenteAoWhatsApp(
              cliente,
              conversation
                .contact.id
            )
          }

          fecharBuscaCliente()

          setActiveTab(
            'dados'
          )

          await carregarClienteCrm(
            conversation.contact.id
          )

          toast.success(
            'Cliente vinculado com sucesso.'
          )
        } catch (error: any) {
          console.error(
            'Erro ao vincular cliente ao WhatsApp:',
            error
          )

          toast.error(
            error?.message ||
              'Não foi possível vincular o cliente.'
          )
        } finally {
          setVinculandoClienteId(
            null
          )
        }
      },
      [
        conversation,
        vinculandoClienteId,
        carregarClienteCrm,
        fecharBuscaCliente,
      ]
    )

  const abrirProdutos =
    useCallback(async () => {
      setSeletorProdutosAberto(
        atual => !atual
      )

      if (
        !portfolio.length
      ) {
        await carregarPortfolio()
      }
    }, [
      portfolio.length,
      carregarPortfolio,
    ])

  const alternarProduto =
    useCallback(
      async (
        produtoId: string
      ) => {
        const novos =
          produtosInteresse.includes(
            produtoId
          )
            ? produtosInteresse.filter(
                id =>
                  id !==
                  produtoId
              )
            : [
                ...produtosInteresse,
                produtoId,
              ]

        await salvar(
          'produtos',
          {
            produtos_interesse:
              novos,
          }
        )
      },
      [
        produtosInteresse,
        salvar,
      ]
    )

  const produtosFiltrados =
    useMemo(
      () =>
        portfolio.filter(
          item =>
            !buscaProduto.trim() ||
            `${item.nome} ${
              item.categoria ||
              ''
            }`
              .toLowerCase()
              .includes(
                buscaProduto
                  .toLowerCase()
              )
        ),
      [
        portfolio,
        buscaProduto,
      ]
    )

  const alterarEtapaKanban =
    useCallback(
      async (
        novaEtapa: WhatsAppKanbanStage
      ) => {
        if (
          !conversation ||
          !onChangeKanbanStage ||
          !clienteCrm ||
          classificacao !==
            'LEAD'
        ) {
          return
        }

        if (
          etapaKanbanCliente ===
          novaEtapa
        ) {
          return
        }

        try {
          setSalvandoCampo(
            'etapa-kanban'
          )

          await onChangeKanbanStage(
            conversation.id,
            novaEtapa
          )

          await carregarClienteCrm(
            conversation.contact
              .id
          )

          toast.success(
            'Etapa atualizada.'
          )
        } catch (error: any) {
          console.error(
            'Erro ao alterar etapa do Kanban:',
            error
          )

          toast.error(
            error?.message ||
              'Não foi possível alterar a etapa.'
          )
        } finally {
          setSalvandoCampo(
            null
          )
        }
      },
      [
        conversation,
        onChangeKanbanStage,
        clienteCrm,
        classificacao,
        etapaKanbanCliente,
        carregarClienteCrm,
      ]
    )

  const handleConcluirTarefa =
    useCallback(
      async (
        tarefaId: string
      ) => {
        if (
          concluindoTarefaId
        ) {
          return
        }

        try {
          setConcluindoTarefaId(
            tarefaId
          )

          await concluirTarefaWhatsApp(
            tarefaId
          )

          setTarefas(
            atuais =>
              atuais.map(
                tarefa =>
                  tarefa.id ===
                  tarefaId
                    ? {
                        ...tarefa,
                        status:
                          'CONCLUIDA',
                      }
                    : tarefa
              )
          )

          toast.success(
            'Tarefa concluída.'
          )
        } catch (error: any) {
          console.error(
            'Erro ao concluir tarefa:',
            error
          )

          toast.error(
            error?.message ||
              'Não foi possível concluir a tarefa.'
          )
        } finally {
          setConcluindoTarefaId(
            null
          )
        }
      },
      [concluindoTarefaId]
    )

  const tarefasPendentes =
    useMemo(
      () =>
        tarefas.filter(
          tarefa =>
            tarefa.status !==
            'CONCLUIDA'
        ),
      [tarefas]
    )

  

  if (!conversation) {
    return null
  }

  const { contact } =
    conversation

  

  return (
    <>
      <aside className="flex h-full min-h-0 w-full flex-col bg-white">
        {onClose && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 xl:hidden">
            <p className="text-sm font-semibold text-slate-800">
              Informações do contato
            </p>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="shrink-0 border-b border-slate-200">
          <ContactHeader
            contatoId={
              contact.id
            }
            nome={
              contact.name
            }
            telefone={
              contact.phone
            }
            avatarUrl={
              contact.avatar
            }
            onNomeAtualizado={
              novoNome => {
                onContactUpdate?.(
                  conversation.id,
                  {
                    name: novoNome,
                  }
                )
              }
            }
          />

          {carregandoClienteCrm ? (
            <div className="flex justify-center px-4 pb-4">
              <StatusLoading />
            </div>
          ) : clienteCrm ? (
            <div className="flex items-center justify-center gap-2 px-4 pb-4">
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle2
                  size={15}
                />
                Cliente cadastrado
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    'dados'
                  )
                }
                title="Visualizar dados do cliente"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <Search size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  void desvincularCliente()
                }
                disabled={
                  desvinculandoCliente
                }
                title="Desvincular cliente"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {desvinculandoCliente ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Unlink2
                    size={16}
                  />
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={
                  abrirBuscaCliente
                }
                className="inline-flex w-full max-w-[260px] items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <Search
                  size={15}
                />
                Buscar cliente existente
              </button>

              <button
                type="button"
                onClick={() =>
                  setCadastroWhatsAppAberto(
                    true
                  )
                }
                className="inline-flex w-full max-w-[260px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={15} />
                Cadastrar novo cliente
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {tabs.map(
                tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id
                      )
                    }
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      activeTab ===
                      tab.id
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50/60 p-4">
          
          <ContactTabContent
            activeTab={activeTab}
            clienteCrm={clienteCrm}
            clienteContexto={clienteContexto}
            contatoId={conversation.contact.id}
            onClienteUpdated={() =>
              carregarClienteCrm(
                conversation.contact.id
              )
            }
          />
        </div>

          <div className="border-b border-slate-100">
            <AccordionSection
              title="Tarefas"
              summary={
                carregandoTarefas
                  ? 'Carregando...'
                  : tarefasPendentes.length
                    ? `${tarefasPendentes.length} ${
                        tarefasPendentes.length ===
                        1
                          ? 'pendente'
                          : 'pendentes'
                      }`
                    : 'Nenhuma pendente'
              }
              open={
                secaoAberta ===
                'tarefas'
              }
              onToggle={() =>
                setSecaoAberta(
                  value =>
                    value ===
                    'tarefas'
                      ? null
                      : 'tarefas'
                )
              }
            >
              {carregandoTarefas ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Carregando tarefas...
                </div>
              ) : tarefas.length ===
                0 ? (
                <div className="py-3 text-center">
                  <ListTodo
                    size={20}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Nenhuma tarefa nesta conversa.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tarefas.map(
                    tarefa => (
                      <TarefaCard
                        key={
                          tarefa.id
                        }
                        tarefa={
                          tarefa
                        }
                        concluindo={
                          concluindoTarefaId ===
                          tarefa.id
                        }
                        onConcluir={() =>
                          void handleConcluirTarefa(
                            tarefa.id
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </AccordionSection>
          </div>

          {!clienteCrm ? (
            <div className="p-5">
              <EmptySectionText text="Busque um cliente existente ou cadastre um novo cliente para habilitar as informações operacionais do CRM." />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              <AccordionSection
                title="Classificação"
                summary={
                  classificacao ===
                  'LEAD'
                    ? 'Lead'
                    : 'Não qualificado'
                }
                open={
                  secaoAberta ===
                  'classificacao'
                }
                onToggle={() =>
                  setSecaoAberta(
                    value =>
                      value ===
                      'classificacao'
                        ? null
                        : 'classificacao'
                  )
                }
              >
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    active={
                      classificacao ===
                      'NAO_QUALIFICADO'
                    }
                    disabled={
                      !!salvandoCampo
                    }
                    onClick={() =>
                      void salvar(
                        'classificação',
                        undefined,
                        'NAO_QUALIFICADO'
                      )
                    }
                  >
                    Não qualificado
                  </ChoiceButton>

                  <ChoiceButton
                    active={
                      classificacao ===
                      'LEAD'
                    }
                    disabled={
                      !!salvandoCampo
                    }
                    onClick={() =>
                      void salvar(
                        'classificação',
                        undefined,
                        'LEAD'
                      )
                    }
                  >
                    Lead
                  </ChoiceButton>
                </div>
              </AccordionSection>

              <AccordionSection
                title="Temperatura"
                summary={
                  temperatura
                    ? temperatura.charAt(
                        0
                      ) +
                      temperatura
                        .slice(1)
                        .toLowerCase()
                    : 'Não definida'
                }
                open={
                  secaoAberta ===
                  'temperatura'
                }
                onToggle={() =>
                  setSecaoAberta(
                    value =>
                      value ===
                      'temperatura'
                        ? null
                        : 'temperatura'
                  )
                }
              >
                <div className="grid grid-cols-3 gap-2">
                  <TemperatureButton
                    value="FRIO"
                    active={
                      temperatura ===
                      'FRIO'
                    }
                    disabled={
                      !!salvandoCampo
                    }
                    onClick={() =>
                      void salvar(
                        'temperatura',
                        {
                          temperatura:
                            temperatura ===
                            'FRIO'
                              ? null
                              : 'FRIO',
                        }
                      )
                    }
                  />

                  <TemperatureButton
                    value="MORNO"
                    active={
                      temperatura ===
                      'MORNO'
                    }
                    disabled={
                      !!salvandoCampo
                    }
                    onClick={() =>
                      void salvar(
                        'temperatura',
                        {
                          temperatura:
                            temperatura ===
                            'MORNO'
                              ? null
                              : 'MORNO',
                        }
                      )
                    }
                  />

                  <TemperatureButton
                    value="QUENTE"
                    active={
                      temperatura ===
                      'QUENTE'
                    }
                    disabled={
                      !!salvandoCampo
                    }
                    onClick={() =>
                      void salvar(
                        'temperatura',
                        {
                          temperatura:
                            temperatura ===
                            'QUENTE'
                              ? null
                              : 'QUENTE',
                        }
                      )
                    }
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                title="Etapa do atendimento"
                summary={
                  classificacao !==
                  'LEAD'
                    ? 'Disponível para Leads'
                    : fases.find(
                        item =>
                          item.value ===
                          etapaKanbanCliente
                      )?.label ||
                      'Prospecção'
                }
                open={
                  secaoAberta ===
                  'etapa'
                }
                onToggle={() =>
                  setSecaoAberta(
                    value =>
                      value ===
                      'etapa'
                        ? null
                        : 'etapa'
                  )
                }
              >
                <div className="relative">
                  <select
                    value={
                      etapaKanbanCliente ||
                      ''
                    }
                    disabled={
                      classificacao !==
                        'LEAD' ||
                      salvandoCampo ===
                        'etapa-kanban' ||
                      !onChangeKanbanStage
                    }
                    onChange={
                      event =>
                        void alterarEtapaKanban(
                          event
                            .target
                            .value as WhatsAppKanbanStage
                        )
                    }
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-60"
                  >
                    {classificacao !==
                      'LEAD' && (
                      <option value="">
                        Classifique como Lead para utilizar o funil
                      </option>
                    )}

                    {fases.map(
                      item => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                title="Produtos de interesse"
                summary={
                  produtosInteresse.length
                    ? `${produtosInteresse.length} ${
                        produtosInteresse.length ===
                        1
                          ? 'produto'
                          : 'produtos'
                      }`
                    : 'Nenhum produto'
                }
                open={
                  secaoAberta ===
                  'produtos'
                }
                onToggle={() =>
                  setSecaoAberta(
                    value =>
                      value ===
                      'produtos'
                        ? null
                        : 'produtos'
                  )
                }
                actionLabel={
                  seletorProdutosAberto
                    ? 'Fechar'
                    : 'Adicionar'
                }
                onAction={() =>
                  void abrirProdutos()
                }
              >
                {produtosInteresse.length >
                0 ? (
                  <div className="space-y-2">
                    {produtosInteresse.map(
                      id => {
                        const produto =
                          portfolio.find(
                            item =>
                              item.id ===
                              id
                          )

                        return (
                          <div
                            key={
                              id
                            }
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Heart
                                  size={
                                    14
                                  }
                                  className="shrink-0 text-rose-500"
                                />

                                <span className="truncate text-sm font-medium text-slate-700">
                                  {produto?.nome ||
                                    'Produto selecionado'}
                                </span>
                              </div>

                              {produto?.categoria && (
                                <p className="ml-5 mt-0.5 text-xs text-slate-400">
                                  {
                                    produto.categoria
                                  }
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={
                                !!salvandoCampo
                              }
                              onClick={() =>
                                void alternarProduto(
                                  id
                                )
                              }
                              className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                            >
                              <X
                                size={
                                  14
                                }
                              />
                            </button>
                          </div>
                        )
                      }
                    )}
                  </div>
                ) : (
                  <EmptySectionText text="Nenhum produto de interesse selecionado." />
                )}

                {seletorProdutosAberto && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <input
                      value={
                        buscaProduto
                      }
                      onChange={
                        event =>
                          setBuscaProduto(
                            event
                              .target
                              .value
                          )
                      }
                      placeholder="Buscar produto..."
                      className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />

                    {carregandoPortfolio ? (
                      <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                        <Loader2
                          size={
                            14
                          }
                          className="animate-spin"
                        />
                        Carregando portfólio...
                      </div>
                    ) : (
                      <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain">
                        {produtosFiltrados.length ? (
                          produtosFiltrados.map(
                            produto => (
                              <label
                                key={
                                  produto.id
                                }
                                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-white"
                              >
                                <input
                                  type="checkbox"
                                  checked={produtosInteresse.includes(
                                    produto.id
                                  )}
                                  disabled={
                                    !!salvandoCampo
                                  }
                                  onChange={() =>
                                    void alternarProduto(
                                      produto.id
                                    )
                                  }
                                  className="mt-0.5"
                                />

                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-slate-700">
                                    {
                                      produto.nome
                                    }
                                  </span>

                                  <span className="block text-xs text-slate-400">
                                    {[
                                      produto.categoria,
                                      produto.seguradoras
                                        .map(
                                          seguradora =>
                                            seguradora.nome
                                        )
                                        .join(
                                          ', '
                                        ),
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        ' • '
                                      )}
                                  </span>
                                </span>
                              </label>
                            )
                          )
                        ) : (
                          <EmptySectionText text="Nenhum produto encontrado no portfólio da corretora." />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                title="Anotações / Particularidades"
                summary={
                  observacoes.trim()
                    ? 'Preenchida'
                    : 'Sem anotações'
                }
                open={
                  secaoAberta ===
                  'anotacoes'
                }
                onToggle={() =>
                  setSecaoAberta(
                    value =>
                      value ===
                      'anotacoes'
                        ? null
                        : 'anotacoes'
                  )
                }
              >
                <textarea
                  value={
                    observacoes
                  }
                  onChange={
                    event =>
                      setObservacoes(
                        event
                          .target
                          .value
                      )
                  }
                  rows={4}
                  placeholder="Registre informações importantes sobre este cliente..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-700 outline-none focus:border-blue-500"
                />

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={
                      salvandoCampo ===
                      'observações'
                    }
                    onClick={() =>
                      void salvar(
                        'observações',
                        {
                          observacoes:
                            observacoes.trim() ||
                            null,
                        }
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {salvandoCampo ===
                      'observações' && (
                      <Loader2
                        size={
                          13
                        }
                        className="animate-spin"
                      />
                    )}

                    Salvar anotação
                  </button>
                </div>
              </AccordionSection>
            </div>
          )}
        </div>
      </aside>

      <ModalCadastroWhatsApp
        open={
          cadastroWhatsAppAberto
        }
        conversation={
          conversation
        }
        onClose={() =>
          setCadastroWhatsAppAberto(
            false
          )
        }
        onSuccess={() => {
          setCadastroWhatsAppAberto(
            false
          )

          setActiveTab(
            'dados'
          )

          void carregarClienteCrm(
            conversation.contact
              .id
          )
        }}
      />

      {buscaClienteAberta && (
        <ModalBuscaCliente
          termo={
            termoBuscaCliente
          }
          setTermo={
            setTermoBuscaCliente
          }
          resultados={
            resultadosBuscaCliente
          }
          buscando={
            buscandoCliente
          }
          buscaExecutada={
            buscaClienteExecutada
          }
          vinculandoClienteId={
            vinculandoClienteId
          }
          onBuscar={() =>
            void executarBuscaCliente()
          }
          onVincular={
            cliente =>
              void vincularCliente(
                cliente
              )
          }
          onClose={
            fecharBuscaCliente
          }
        />
      )}
    </>
  )
}

function ContactTabContent({
  activeTab,
  clienteCrm,
  clienteContexto,
  contatoId,
  onClienteUpdated,
}: {
  activeTab: Tab
  clienteCrm: CrmWhatsAppVinculo | null
  clienteContexto: {
    clienteId: string
    tipoCliente: 'PF' | 'PJ'
  } | null
  contatoId: string
  onClienteUpdated: () => void | Promise<void>
}) {
  if (activeTab === 'dados') {
  return clienteCrm ? (
    <ContactDadosTab
      vinculo={clienteCrm}
      onUpdated={onClienteUpdated}
    />
  ) : (
    <EmptySectionText text="Este contato ainda não possui cliente CRM vinculado." />
  )
}

  if (
    !clienteCrm ||
    !clienteContexto
  ) {
    return (
      <EmptySectionText text="Vincule um cliente CRM para consultar estas informações." />
    )
  }

  if (
    activeTab ===
    'propostas'
  ) {
    return (
      <ContactPropostasTab
        contatoId={contatoId}
        clienteId={
          clienteContexto.clienteId
        }
        tipoCliente={
          clienteContexto.tipoCliente
        }
      />
    )
  }

  if (
    activeTab ===
    'contratos'
  ) {
    return (
      <ContactContratosTab
        contatoId={contatoId}
        clienteId={
          clienteContexto.clienteId
        }
        tipoCliente={
          clienteContexto.tipoCliente
        }
      />
    )
  }

  if (
    activeTab ===
    'financeiro'
  ) {
    return (
      <ContactFinanceiroTab
        clienteId={
          clienteContexto.clienteId
        }
        tipoCliente={
          clienteContexto.tipoCliente
        }
      />
    )
  }

  if (
    activeTab ===
    'comissoes'
  ) {
    return (
      <ContactComissoesTab
        contatoId={contatoId}
        clienteId={
          clienteContexto.clienteId
        }
        tipoCliente={
          clienteContexto.tipoCliente
        }
      />
    )
  }

  if (
    activeTab ===
    'assistencias'
  ) {
    return (
      <ContactAssistenciasTab
        contatoId={contatoId}
        clienteId={
          clienteContexto.clienteId
        }
        tipoCliente={
          clienteContexto.tipoCliente
        }
      />
    )
  }

  if (
    activeTab ===
    'sinistros'
  ) {
    return (
      <ContactSinistrosTab
        contatoId={contatoId}
        clienteId={
          clienteContexto.clienteId
        }
        tipoCliente={
          clienteContexto.tipoCliente
        }
      />
    )
  }

  return null
}

function TarefaCard({
  tarefa,
  concluindo,
  onConcluir,
}: {
  tarefa: WhatsAppTask
  concluindo: boolean
  onConcluir: () => void
}) {
  const concluida =
    tarefa.status ===
    'CONCLUIDA'

  return (
    <div
      className={`rounded-lg border p-3 ${
        concluida
          ? 'border-slate-100 bg-slate-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            concluida
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          {concluida ? (
            <CircleCheck
              size={14}
            />
          ) : (
            <ListTodo
              size={13}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-medium ${
              concluida
                ? 'text-slate-400 line-through'
                : 'text-slate-700'
            }`}
          >
            {tarefa.titulo}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                tarefa.prioridade ===
                'URGENTE'
                  ? 'bg-red-50 text-red-600'
                  : tarefa.prioridade ===
                      'ALTA'
                    ? 'bg-orange-50 text-orange-600'
                    : tarefa.prioridade ===
                        'BAIXA'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-blue-50 text-blue-600'
              }`}
            >
              {tarefa.prioridade ===
              'URGENTE'
                ? 'Urgente'
                : tarefa.prioridade ===
                    'ALTA'
                  ? 'Alta'
                  : tarefa.prioridade ===
                      'BAIXA'
                    ? 'Baixa'
                    : 'Normal'}
            </span>

            {tarefa.vencimentoEm && (
              <span className="text-[10px] text-slate-400">
                {new Date(
                  tarefa.vencimentoEm
                ).toLocaleString(
                  'pt-BR',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute:
                      '2-digit',
                  }
                )}
              </span>
            )}
          </div>

          {tarefa.descricao && (
            <p className="mt-2 whitespace-pre-line text-[11px] leading-4 text-slate-500">
              {
                tarefa.descricao
              }
            </p>
          )}

          {!concluida && (
            <button
              type="button"
              disabled={
                concluindo
              }
              onClick={
                onConcluir
              }
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
            >
              {concluindo ? (
                <Loader2
                  size={12}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={12}
                />
              )}

              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalBuscaCliente({
  termo,
  setTermo,
  resultados,
  buscando,
  buscaExecutada,
  vinculandoClienteId,
  onBuscar,
  onVincular,
  onClose,
}: {
  termo: string
  setTermo: (
    value: string
  ) => void
  resultados: ClienteBuscaVinculo[]
  buscando: boolean
  buscaExecutada: boolean
  vinculandoClienteId:
    | string
    | null
  onBuscar: () => void
  onVincular: (
    cliente: ClienteBuscaVinculo
  ) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={
        event => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose()
          }
        }
      }
    >
      <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Vincular contato
            </p>

            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
              Buscar cliente existente
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Digite pelo menos 3 caracteres para iniciar a busca.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                autoFocus
                value={termo}
                onChange={
                  event =>
                    setTermo(
                      event
                        .target
                        .value
                    )
                }
                onKeyDown={
                  event => {
                    if (
                      event.key ===
                        'Enter' &&
                      termo
                        .trim()
                        .length >= 3
                    ) {
                      event.preventDefault()
                      onBuscar()
                    }
                  }
                }
                placeholder="Nome, CPF/CNPJ, telefone ou e-mail"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={
                onBuscar
              }
              disabled={
                buscando ||
                termo.trim()
                  .length < 3
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buscando ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Search
                  size={15}
                />
              )}

              Buscar
            </button>
          </div>

          {termo.trim()
            .length > 0 &&
            termo.trim()
              .length < 3 && (
              <p className="mt-2 text-xs text-slate-400">
                Digite pelo menos 3 caracteres para iniciar a busca.
              </p>
            )}
        </div>

        <div className="min-h-[240px] overflow-y-auto p-4">
          {buscando ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />

              Pesquisando clientes...
            </div>
          ) : !buscaExecutada ? (
            <div className="flex h-40 items-center justify-center text-center">
              <p className="max-w-sm text-sm text-slate-400">
                Digite uma referência do cliente para iniciar a pesquisa.
              </p>
            </div>
          ) : resultados.length ===
            0 ? (
            <div className="flex h-40 items-center justify-center text-center">
              <div>
                <Search
                  size={24}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-2 text-sm font-medium text-slate-600">
                  Nenhum cliente encontrado
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Tente pesquisar por outra informação do cliente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-xs text-slate-400">
                {
                  resultados.length
                }{' '}
                {resultados.length ===
                1
                  ? 'resultado encontrado'
                  : 'resultados encontrados'}
              </p>

              {resultados.map(
                resultado => {
                  const chaveCliente =
                    `${resultado.origem}-${resultado.id}`

                  return (
                    <ResultadoCliente
                      key={
                        chaveCliente
                      }
                      resultado={
                        resultado
                      }
                      vinculando={
                        vinculandoClienteId ===
                        chaveCliente
                      }
                      bloqueado={
                        vinculandoClienteId !==
                        null
                      }
                      onVincular={() =>
                        onVincular(
                          resultado
                        )
                      }
                    />
                  )
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultadoCliente({
  resultado,
  vinculando,
  bloqueado,
  onVincular,
}: {
  resultado: ClienteBuscaVinculo
  vinculando: boolean
  bloqueado: boolean
  onVincular: () => void
}) {
  const legado =
    resultado.origem ===
    'LEGADO'

  const documento =
    resultado.documento
      ? formatDocumento(
          resultado.documento,
          resultado.tipo
        )
      : ''

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            legado
              ? 'bg-amber-50 text-amber-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          {legado ? (
            <Database
              size={18}
            />
          ) : (
            <UserRound
              size={18}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {
                  resultado.nome
                }
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {resultado.tipo ===
                'PF'
                  ? 'Pessoa Física'
                  : 'Pessoa Jurídica'}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                legado
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {legado
                ? 'Base histórica'
                : 'Novo CRM'}
            </span>
          </div>

          <div className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {documento && (
              <ResultadoInfo
                label={
                  resultado.tipo ===
                  'PF'
                    ? 'CPF'
                    : 'CNPJ'
                }
                value={
                  documento
                }
              />
            )}

            {resultado.telefone && (
              <ResultadoInfo
                label="Telefone"
                value={
                  resultado.telefone
                }
              />
            )}

            {resultado.email && (
              <ResultadoInfo
                label="E-mail"
                value={
                  resultado.email
                }
                full
              />
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={
                onVincular
              }
              disabled={
                bloqueado
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {vinculando && (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              )}

              {vinculando
                ? 'Vinculando...'
                : 'Vincular cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultadoInfo({
  label,
  value,
  full,
}: {
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div
      className={
        full
          ? 'sm:col-span-2'
          : ''
      }
    >
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <p className="truncate text-xs text-slate-600">
        {value}
      </p>
    </div>
  )
}

function AccordionSection({
  title,
  summary,
  open,
  onToggle,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  actionLabel?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <section className="bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={
            onToggle
          }
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              open
                ? 'bg-blue-50 text-blue-600'
                : 'bg-slate-50 text-slate-400'
            }`}
          >
            {open ? (
              <ChevronDown
                size={15}
              />
            ) : (
              <ChevronRight
                size={15}
              />
            )}
          </span>

          <span className="min-w-0">
            <span className="block text-xs font-semibold text-slate-700">
              {title}
            </span>

            <span className="block truncate text-[11px] text-slate-400">
              {summary}
            </span>
          </span>
        </button>

        {actionLabel &&
          onAction && (
            <button
              type="button"
              onClick={
                event => {
                  event.stopPropagation()
                  onAction()
                }
              }
              className="rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
            >
              {
                actionLabel
              }
            </button>
          )}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </section>
  )
}

function ChoiceButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={
        onClick
      }
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
        active
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

function TemperatureButton({
  value,
  active,
  disabled,
  onClick,
}: {
  value:
    | 'FRIO'
    | 'MORNO'
    | 'QUENTE'
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const config = {
    FRIO: {
      label: 'Frio',
      icon: Snowflake,
      active:
        'border-sky-300 bg-sky-50 text-sky-700',
      idle:
        'border-slate-200 bg-white text-slate-500',
    },
    MORNO: {
      label: 'Morno',
      icon: ThermometerSun,
      active:
        'border-amber-300 bg-amber-50 text-amber-700',
      idle:
        'border-slate-200 bg-white text-slate-500',
    },
    QUENTE: {
      label: 'Quente',
      icon: Flame,
      active:
        'border-red-300 bg-red-50 text-red-700',
      idle:
        'border-slate-200 bg-white text-slate-500',
    },
  }[value]

  const Icon =
    config.icon

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={
        onClick
      }
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
        active
          ? config.active
          : config.idle
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon size={15} />
      {config.label}
    </button>
  )
}

function StatusLoading() {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
      <Loader2
        size={15}
        className="animate-spin"
      />
      Verificando cadastro...
    </div>
  )
}

function EmptySectionText({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs leading-5 text-slate-400">
      {text}
    </div>
  )
}

function asObject(
  value: unknown
): Record<string, any> {
  return value &&
    typeof value ===
      'object' &&
    !Array.isArray(value)
    ? (value as Record<
        string,
        any
      >)
    : {}
}

function asStringArray(
  value: unknown
): string[] {
  return Array.isArray(
    value
  )
    ? value.filter(
        (
          item
        ): item is string =>
          typeof item ===
            'string' &&
          !!item
      )
    : []
}

function getRegistroCrm(
  vinculo: any
): any {
  return (
    vinculo?.registro ??
    vinculo?.cliente ??
    vinculo?.pessoa ??
    vinculo?.empresa ??
    null
  )
}

function getTipoVinculo(
  vinculo: any
): 'PF' | 'PJ' {
  const tipo =
    String(
      vinculo?.tipo ??
        vinculo?.tipo_cliente ??
        vinculo?.entidade ??
        ''
    ).toUpperCase()

  if (
    tipo === 'PJ' ||
    tipo === 'EMPRESA'
  ) {
    return 'PJ'
  }

  return getRegistroCrm(
    vinculo
  )?.cnpj
    ? 'PJ'
    : 'PF'
}

function normalizarTemperatura(
  value: unknown
): Temperatura {
  const valor =
    String(
      value || ''
    )
      .trim()
      .toUpperCase()

  return valor ===
      'FRIO' ||
    valor ===
      'MORNO' ||
    valor ===
      'QUENTE'
    ? valor
    : ''
}

function formatDocumento(
  value: string,
  tipo: 'PF' | 'PJ'
) {
  const numeros =
    value.replace(
      /\D/g,
      ''
    )

  if (
    tipo === 'PF' &&
    numeros.length === 11
  ) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    )
  }

  if (
    tipo === 'PJ' &&
    numeros.length === 14
  ) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    )
  }

  return value
}