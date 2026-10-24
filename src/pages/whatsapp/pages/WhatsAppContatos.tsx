import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  UserRound,
  UsersRound,
  
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../../auth/AuthContext'
import {
  listarInstanciasDapiAtivas,
  listarWhatsAppContatos,
  sincronizarContatosDapi,
  type WhatsAppContato,
  type WhatsAppInstanciaResumo,
} from '../services/whatsappContatosService'

import {
  criarWhatsAppContato,
  atualizarWhatsAppContato,
  excluirWhatsAppContato,
  restaurarWhatsAppContato,
} from '../services/whatsappContatosService'

import WhatsAppContatoModal from '../components/WhatsAppContatoModal'

import { useNavigate } from 'react-router-dom'
import { useWhatsApp } from '../hooks/useWhatsApp'
import WhatsAppContatoMensagemModal from '../components/WhatsAppContatoMensagemModal'

const ITENS_POR_PAGINA = 20

function somenteNumeros(value: string) {
  return value.replace(/\D/g, '')
}

function formatarTelefone(value: string) {
  const digits = somenteNumeros(value)

  const nacional =
    digits.startsWith('55') &&
    digits.length >= 12
      ? digits.slice(2)
      : digits

  if (nacional.length === 11) {
    return nacional.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    )
  }

  if (nacional.length === 10) {
    return nacional.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      '($1) $2-$3'
    )
  }

  return value
}

function iniciais(nome?: string | null) {
  const value = nome?.trim()

  if (!value) return '?'

  const partes =
    value.split(/\s+/).filter(Boolean)

  if (partes.length === 1) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return `${partes[0][0]}${
    partes[partes.length - 1][0]
  }`.toUpperCase()
}

function formatarData(value: string) {
  const data = new Date(value)

  if (Number.isNaN(data.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(data)
}

export default function WhatsAppContatos() {
  const { userProfile } = useAuth()

  const navigate = useNavigate()
  const whatsapp = useWhatsApp()

  const [
    contatoMensagem,
    setContatoMensagem,
  ] =
    useState<WhatsAppContato | null>(
      null
    )

  const [
    mensagemModalOpen,
    setMensagemModalOpen,
  ] = useState(false)

  const [contatos, setContatos] =
    useState<WhatsAppContato[]>([])

  const [busca, setBusca] =
    useState('')

  const [buscaAplicada, setBuscaAplicada] =
    useState('')

  const [pagina, setPagina] =
    useState(1)

  const [total, setTotal] =
    useState(0)

  const [totalPaginas, setTotalPaginas] =
    useState(0)

  const [
    situacaoContatos,
    setSituacaoContatos,
  ] = useState<'ativos' | 'excluidos'>(
    'ativos'
  )

  const [
    restaurandoContatoId,
    setRestaurandoContatoId,
  ] = useState<string | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [atualizando, setAtualizando] =
    useState(false)

  const [
    contatoModalOpen,
    setContatoModalOpen,
  ] = useState(false)

  const [
    contatoEditando,
    setContatoEditando,
  ] =
    useState<WhatsAppContato | null>(
      null
    )

  const [
  menuContatoId,
  setMenuContatoId,
] = useState<string | null>(null)

const [
  contatoParaExcluir,
  setContatoParaExcluir,
] =
  useState<WhatsAppContato | null>(
    null
  )

const [
  excluindoContato,
  setExcluindoContato,
] =
  useState(false)

    const [
  instancias,
  setInstancias,
] =
  useState<
    WhatsAppInstanciaResumo[]
  >([])

const [
  instanciaSelecionada,
  setInstanciaSelecionada,
] =
  useState('')

const [
  mostrarSincronizacao,
  setMostrarSincronizacao,
] =
  useState(false)

const [
  sincronizando,
  setSincronizando,
] =
  useState(false)

  const corretoraId =
    userProfile?.tipo_usuario ===
    'CORRETORA'
      ? userProfile.id
      : userProfile?.corretora_id

  const carregarContatos =
    useCallback(
      async (
        silencioso = false
      ) => {
        if (!corretoraId) {
          setContatos([])
          setTotal(0)
          setTotalPaginas(0)
          setLoading(false)
          return
        }

        if (silencioso) {
          setAtualizando(true)
        } else {
          setLoading(true)
        }

        try {
          const resultado =
            await listarWhatsAppContatos(
              corretoraId,
              {
                busca:
                  buscaAplicada ||
                  undefined,
                pagina,
                porPagina:
                  ITENS_POR_PAGINA,
                situacao:
                  situacaoContatos,
              }
            )

          setContatos(
            resultado.contatos
          )

          setTotal(
            resultado.total
          )

          setTotalPaginas(
            resultado.totalPaginas
          )
        } catch (error) {
          console.error(
            'Erro ao carregar contatos WhatsApp:',
            error
          )

          toast.error(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os contatos.'
          )
        } finally {
          setLoading(false)
          setAtualizando(false)
        }
      },
      [
        corretoraId,
        buscaAplicada,
        pagina,
        situacaoContatos,
      ]
    )

  useEffect(() => {
    void carregarContatos()
  }, [carregarContatos])

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setPagina(1)
        setBuscaAplicada(
          busca.trim()
        )
      }, 400)

    return () =>
      window.clearTimeout(timer)
  }, [busca])

  const inicioExibicao =
    total === 0
      ? 0
      : (pagina - 1) *
          ITENS_POR_PAGINA +
        1

  const fimExibicao =
    Math.min(
      pagina *
        ITENS_POR_PAGINA,
      total
    )

  const descricaoQuantidade =
    useMemo(() => {
      if (loading) {
        return 'Carregando contatos...'
      }

      if (total === 0) {
        if (buscaAplicada) {
          return 'Nenhum contato encontrado'
        }

        return situacaoContatos ===
          'excluidos'
          ? 'Nenhum contato excluído'
          : 'Nenhum contato cadastrado'
      }

      return total === 1
        ? '1 contato'
        : `${total.toLocaleString(
            'pt-BR'
          )} contatos`
    }, [
      loading,
      total,
      buscaAplicada,
      situacaoContatos,
    ])

  const handleTrocarSituacao = (
    situacao: 'ativos' | 'excluidos'
  ) => {
    if (
      situacao ===
      situacaoContatos
    ) {
      return
    }

    setSituacaoContatos(
      situacao
    )

    setPagina(1)
    setMenuContatoId(null)
  }

  const handleNovoContato = () => {
    setContatoEditando(null)
    setContatoModalOpen(true)
  }

  const handleEditarContato = (
    contato: WhatsAppContato
  ) => {
    setMenuContatoId(null)
    setContatoEditando(contato)
    setContatoModalOpen(true)
  }

  const handleSalvarContato =
  async (dados: {
    nome: string
    telefone: string
  }) => {
    if (!corretoraId) {
      throw new Error(
        'Corretora não identificada.'
      )
    }

    if (contatoEditando) {
      await atualizarWhatsAppContato(
        corretoraId,
        contatoEditando,
        dados
      )

      toast.success(
        'Contato atualizado.'
      )
    } else {
      await criarWhatsAppContato(
        corretoraId,
        dados
      )

      toast.success(
        'Contato criado.'
      )
    }

    await carregarContatos(
      true
    )
  }

  const abrirSincronizacao =
  async () => {
    if (!corretoraId) {
      toast.error(
        'Corretora não identificada.'
      )
      return
    }

    try {
      const resultado =
        await listarInstanciasDapiAtivas(
          corretoraId
        )

      setInstancias(
        resultado
      )

      if (
        resultado.length === 0
      ) {
        toast.error(
          'Nenhuma conexão D-API ativa encontrada.'
        )
        return
      }

      const padrao =
        resultado.find(
          (item) =>
            item.padrao_envio
        )

      setInstanciaSelecionada(
        padrao?.id ??
          resultado[0].id
      )

      setMostrarSincronizacao(
        true
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as conexões.'
      )
    }
  }

  const handleSincronizar  =
  async () => {
    if (
      !instanciaSelecionada
    ) {
      toast.error(
        'Selecione uma conexão WhatsApp.'
      )
      return
    }

    try {
      setSincronizando(true)

      const resultado =
        await sincronizarContatosDapi(
          instanciaSelecionada
        )

      const resumo =
        resultado.sincronizacao

      console.log(
        'D-API SINCRONIZAÇÃO:',
        resumo
      )

      toast.success(
        `${resumo?.novos ?? 0} novos, ${
          resumo?.ignoradosExcluidos ?? 0
        } excluídos ignorados.`
      )

      setMostrarSincronizacao(
        false
      )

      if (pagina === 1) {
        await carregarContatos(
          true
        )
      } else {
        setPagina(1)
      }
    } catch (error) {
      console.error(
        'Erro ao sincronizar contatos D-API:',
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível sincronizar os contatos.'
      )
    } finally {
      setSincronizando(false)
    }
  }

  const handleEnviarMensagem = (
    contato: WhatsAppContato
  ) => {
    setContatoMensagem(
      contato
    )

    setMensagemModalOpen(
      true
    )
  }

  const handleSolicitarExclusao = (
  contato: WhatsAppContato
) => {
  setMenuContatoId(null)
  setContatoParaExcluir(
    contato
  )
}

const handleConfirmarExclusao =
  async () => {
    if (
      !corretoraId ||
      !contatoParaExcluir ||
      excluindoContato
    ) {
      return
    }

    try {
      setExcluindoContato(true)

      await excluirWhatsAppContato(
        corretoraId,
        contatoParaExcluir.id
      )

      toast.success(
        'Contato excluído.'
      )

      setContatoParaExcluir(
        null
      )

      if (
        contatos.length === 1 &&
        pagina > 1
      ) {
        setPagina(
          atual =>
            Math.max(
              1,
              atual - 1
            )
        )
      } else {
        await carregarContatos(
          true
        )
      }
    } catch (error) {
      console.error(
        'Erro ao excluir contato:',
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o contato.'
      )
    } finally {
      setExcluindoContato(
        false
      )
    }
  }

const handleRestaurarContato =
  async (
    contato: WhatsAppContato
  ) => {
    if (
      !corretoraId ||
      restaurandoContatoId
    ) {
      return
    }

    try {
      setRestaurandoContatoId(
        contato.id
      )

      await restaurarWhatsAppContato(
        corretoraId,
        contato.id
      )

      toast.success(
        'Contato restaurado.'
      )

      if (
        contatos.length === 1 &&
        pagina > 1
      ) {
        setPagina(
          atual =>
            Math.max(
              1,
              atual - 1
            )
        )
      } else {
        await carregarContatos(
          true
        )
      }
    } catch (error) {
      console.error(
        'Erro ao restaurar contato:',
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível restaurar o contato.'
      )
    } finally {
      setRestaurandoContatoId(
        null
      )
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <UsersRound
                  size={21}
                />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Contatos WhatsApp
                </h1>

                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Gerencie os contatos
                  disponíveis para
                  atendimento pelo
                  WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void carregarContatos(
                  true
                )
              }
              disabled={
                atualizando ||
                loading
              }
              title="Atualizar contatos"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={
                  atualizando
                    ? 'animate-spin'
                    : ''
                }
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() =>
                void abrirSincronizacao()
                }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw  size={16} />
              Sincronizar contatos
            </button>

            <button
              type="button"
              onClick={
                handleNovoContato
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Novo contato
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          
          <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() =>
                handleTrocarSituacao(
                  'ativos'
                )
              }
              className={`relative px-4 py-3 text-sm font-medium transition ${
                situacaoContatos ===
                'ativos'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Ativos

              {situacaoContatos ===
                'ativos' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                handleTrocarSituacao(
                  'excluidos'
                )
              }
              className={`relative px-4 py-3 text-sm font-medium transition ${
                situacaoContatos ===
                'excluidos'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Excluídos

              {situacaoContatos ===
                'excluidos' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          </div>
          
          
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={busca}
                onChange={(e) =>
                  setBusca(
                    e.target.value
                  )
                }
                placeholder="Buscar por nome ou telefone..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <UsersRound
                size={16}
              />
              {descricaoQuantidade}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
              <Loader2
                size={28}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Carregando contatos...
              </p>
            </div>
          ) : contatos.length ===
            0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900">
                <UserRound
                  size={25}
                />
              </div>

              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {buscaAplicada
                  ? 'Nenhum contato encontrado'
                  : situacaoContatos ===
                      'excluidos'
                    ? 'Nenhum contato excluído'
                    : 'Nenhum contato cadastrado'}
              </h2>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {buscaAplicada
                  ? 'Tente pesquisar utilizando outro nome ou número de telefone.'
                  : situacaoContatos ===
                      'excluidos'
                    ? 'Os contatos excluídos aparecerão aqui e poderão ser restaurados.'
                    : 'Cadastre um contato manualmente ou sincronize uma conexão WhatsApp para começar.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Contato
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        WhatsApp
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Vínculo CRM
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {situacaoContatos ===
                        'excluidos'
                          ? 'Excluído em'
                          : 'Cadastrado em'}
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {contatos.map(
                      (contato) => (
                        <tr
                          key={
                            contato.id
                          }
                          className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/40"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              {contato.avatar_url ? (
                                <img
                                  src={
                                    contato.avatar_url
                                  }
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                  {iniciais(
                                    contato.nome
                                  )}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="max-w-[280px] truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {contato.nome ||
                                    'Contato sem nome'}
                                </p>

                                {contato.whatsapp_id ? (
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    WhatsApp identificado
                                  </p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Cadastro local
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <MessageCircle
                                size={15}
                                className="text-emerald-500"
                              />

                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {formatarTelefone(
                                  contato.telefone
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {contato.cliente_id ? (
                              <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                Cliente vinculado
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">
                                Não vinculado
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {formatarData(
                              situacaoContatos ===
                                'excluidos' &&
                              contato.excluido_em
                                ? contato.excluido_em
                                : contato.created_at
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {situacaoContatos ===
                            'excluidos' ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRestaurarContato(
                                      contato
                                    )
                                  }
                                  disabled={
                                    restaurandoContatoId ===
                                    contato.id
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                                >
                                  {restaurandoContatoId ===
                                  contato.id ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <RefreshCw
                                      size={15}
                                    />
                                  )}

                                  {restaurandoContatoId ===
                                  contato.id
                                    ? 'Restaurando...'
                                    : 'Restaurar'}
                                </button>
                              </div>
                            ) : (
                              <div className="relative flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  title="Enviar mensagem"
                                  onClick={() =>
                                    handleEnviarMensagem(
                                      contato
                                    )
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                                >
                                  <MessageCircle
                                    size={15}
                                  />
                                  Mensagem
                                </button>

                                <button
                                  type="button"
                                  title="Mais ações"
                                  onClick={() =>
                                    setMenuContatoId(
                                      atual =>
                                        atual === contato.id
                                          ? null
                                          : contato.id
                                    )
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                >
                                  <MoreVertical
                                    size={16}
                                  />
                                </button>

                                {menuContatoId ===
                                  contato.id && (
                                  <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleEditarContato(
                                          contato
                                        )
                                      }
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                      <Pencil
                                        size={15}
                                      />
                                      Editar contato
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSolicitarExclusao(
                                          contato
                                        )
                                      }
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                      <Trash2
                                        size={15}
                                      />
                                      Excluir contato
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mostrando{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {inicioExibicao}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {fimExibicao}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {total}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      pagina <= 1
                    }
                    onClick={() =>
                      setPagina(
                        (atual) =>
                          Math.max(
                            1,
                            atual - 1
                          )
                      )
                    }
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft
                      size={16}
                    />
                    Anterior
                  </button>

                  <span className="min-w-[100px] text-center text-sm text-slate-500 dark:text-slate-400">
                    Página{' '}
                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                      {pagina}
                    </strong>{' '}
                    de{' '}
                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                      {Math.max(
                        totalPaginas,
                        1
                      )}
                    </strong>
                  </span>

                  <button
                    type="button"
                    disabled={
                      pagina >=
                      totalPaginas
                    }
                    onClick={() =>
                      setPagina(
                        (atual) =>
                          Math.min(
                            totalPaginas,
                            atual + 1
                          )
                      )
                    }
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Próxima
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {mostrarSincronizacao && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Sincronizar contatos
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Escolha a conexão WhatsApp
          que deseja sincronizar.
        </p>
      </div>

      <select
        value={
          instanciaSelecionada
        }
        onChange={(e) =>
          setInstanciaSelecionada(
            e.target.value
          )
        }
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        {instancias.map(
          (instancia) => (
            <option
              key={
                instancia.id
              }
              value={
                instancia.id
              }
            >
              {instancia.nome}
              {instancia.telefone
                ? ` — ${formatarTelefone(
                    instancia.telefone
                  )}`
                : ''}
              {instancia.padrao_envio
                ? ' — Padrão'
                : ''}
            </option>
          )
        )}
      </select>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            setMostrarSincronizacao(
              false
            )
          }
          disabled={
            sincronizando
          }
          className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() =>
            void handleSincronizar ()
          }
          disabled={
            sincronizando ||
            !instanciaSelecionada
          }
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sincronizando && (
            <Loader2
              size={16}
              className="animate-spin"
            />
          )}

          {sincronizando
            ? 'Sincronizando...'
            : 'Sincronizar'}
        </button>
      </div>
    </div>
  </div>
)}

<WhatsAppContatoModal
  open={contatoModalOpen}
  contato={contatoEditando}
  onClose={() => {
    setContatoModalOpen(false)
    setContatoEditando(null)
  }}
  onSave={
    handleSalvarContato
  }
/>

<WhatsAppContatoMensagemModal
  open={
    mensagemModalOpen
  }
  contato={
    contatoMensagem
  }
  onClose={() => {
    setMensagemModalOpen(
      false
    )

    setContatoMensagem(
      null
    )
  }}
  onSend={(data) =>
    whatsapp.sendContactMessage(
      data
    )
  }
  onSent={(
    conversationId
  ) => {
    navigate(
      '/whatsapp',
      {
        state: {
          conversationId,
        },
      }
    )
  }}
/>

{contatoParaExcluir && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="p-5">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <Trash2
            size={20}
          />
        </div>

        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Excluir contato?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Você está prestes a
          excluir{' '}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {contatoParaExcluir.nome ||
              formatarTelefone(
                contatoParaExcluir.telefone
              )}
          </strong>.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          O contato será removido da
          lista de ativos, mas seu
          histórico e vínculos serão
          preservados. Você poderá
          restaurá-lo posteriormente
          pela aba Excluídos.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() =>
            setContatoParaExcluir(
              null
            )
          }
          disabled={
            excluindoContato
          }
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() =>
            void handleConfirmarExclusao()
          }
          disabled={
            excluindoContato
          }
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {excluindoContato ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Trash2
              size={16}
            />
          )}

          {excluindoContato
            ? 'Excluindo...'
            : 'Excluir contato'}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}