import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  atualizarKanbanCliente,
  buscarClientesCentral,
  buscarClientesKanban,
  buscarResponsaveisCentral,
  buscarResumoCentral,
  excluirClienteCentral,
  tornarClienteLead,
  transferirResponsavelCentral,
} from '../services/centralClientesService'
import {
  FILTROS_INICIAIS,
  type CentralClientesFiltros,
  type CentralClientesPaginacao,
  type CentralClientesResumo,
  type ClienteCentral,
  type ClienteKanbanStage,
  type ResponsavelCentral,
  type VisualizacaoCentral,
} from '../types/centralClientes'

const PAGINACAO_INICIAL: CentralClientesPaginacao = {
  pagina: 1,
  porPagina: 20,
  total: 0,
  totalPaginas: 1,
}

const RESUMO_INICIAL: CentralClientesResumo = {
  total: 0,
  pessoas: 0,
  empresas: 0,
  leads: 0,
  semCompromisso: 0,
}

export function useCentralClientes() {
  const [visualizacao, setVisualizacao] =
    useState<VisualizacaoCentral>('LISTA')
  const [filtros, setFiltros] =
    useState<CentralClientesFiltros>(FILTROS_INICIAIS)
  const [pagina, setPagina] = useState(1)
  const [clientes, setClientes] = useState<ClienteCentral[]>([])
  const [clientesKanban, setClientesKanban] = useState<
    ClienteCentral[]
  >([])
  const [resumo, setResumo] =
    useState<CentralClientesResumo>(RESUMO_INICIAL)
  const [paginacao, setPaginacao] =
    useState<CentralClientesPaginacao>(PAGINACAO_INICIAL)
  const [responsaveis, setResponsaveis] = useState<
    ResponsavelCentral[]
  >([])
  const [loading, setLoading] = useState(true)
  const [loadingKanban, setLoadingKanban] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const carregarLista = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resultado = await buscarClientesCentral(
        filtros,
        pagina,
        20
      )
      setClientes(resultado.clientes)
      setPaginacao(resultado.paginacao)
    } catch (erro) {
      const falha =
        erro instanceof Error
          ? erro
          : new Error('Erro ao carregar clientes.')
      setError(falha)
    } finally {
      setLoading(false)
    }
  }, [filtros, pagina])

  const carregarKanban = useCallback(async () => {
    setLoadingKanban(true)
    try {
      setClientesKanban(await buscarClientesKanban())
    } finally {
      setLoadingKanban(false)
    }
  }, [])

  const carregarApoio = useCallback(async () => {
    const [novoResumo, novosResponsaveis] =
      await Promise.all([
        buscarResumoCentral(filtros),
        buscarResponsaveisCentral(),
      ])

    setResumo(novoResumo)
    setResponsaveis(novosResponsaveis)
  }, [filtros])

  const recarregar = useCallback(async () => {
    await Promise.all([
      carregarLista(),
      carregarApoio(),
      visualizacao === 'KANBAN'
        ? carregarKanban()
        : Promise.resolve(),
    ])
  }, [
    carregarLista,
    carregarApoio,
    carregarKanban,
    visualizacao,
  ])

  useEffect(() => {
    void carregarLista()
  }, [carregarLista])

  useEffect(() => {
    void carregarApoio()
  }, [carregarApoio])

  useEffect(() => {
    if (visualizacao === 'KANBAN') {
      void carregarKanban()
    }
  }, [visualizacao, carregarKanban])

  const atualizarFiltros = useCallback(
    (patch: Partial<CentralClientesFiltros>) => {
      setPagina(1)
      setFiltros(atual => ({
        ...atual,
        ...patch,
      }))
    },
    []
  )

  const limparFiltros = useCallback(() => {
    setPagina(1)
    setFiltros(FILTROS_INICIAIS)
  }, [])

  const tornarLead = useCallback(
    async (cliente: ClienteCentral) => {
      await tornarClienteLead(cliente)
      await recarregar()
    },
    [recarregar]
  )

  const moverKanban = useCallback(
    async (
      cliente: ClienteCentral,
      etapa: ClienteKanbanStage,
      posicao: number
    ) => {
      await atualizarKanbanCliente(
        cliente,
        etapa,
        posicao
      )

      setClientesKanban(atual =>
        atual.map(item =>
          item.id === cliente.id &&
          item.tipo === cliente.tipo
            ? {
                ...item,
                classificacao: 'LEAD',
                etapaKanban: etapa,
                posicaoKanban: posicao,
              }
            : item
        )
      )
    },
    []
  )

  const transferir = useCallback(
    async (
      cliente: ClienteCentral,
      responsavelId: string
    ) => {
      await transferirResponsavelCentral(
        cliente,
        responsavelId
      )
      await recarregar()
    },
    [recarregar]
  )

  const excluir = useCallback(
    async (cliente: ClienteCentral) => {
      await excluirClienteCentral(cliente)
      await recarregar()
    },
    [recarregar]
  )

  const buscaValida = useMemo(
    () =>
      !filtros.busca.trim() ||
      filtros.busca.trim().length >= 3,
    [filtros.busca]
  )

  return {
    visualizacao,
    setVisualizacao,
    filtros,
    atualizarFiltros,
    limparFiltros,
    pagina,
    setPagina,
    clientes,
    clientesKanban,
    resumo,
    paginacao,
    responsaveis,
    loading,
    loadingKanban,
    error,
    buscaValida,
    recarregar,
    tornarLead,
    moverKanban,
    transferir,
    excluir,
  }
}
