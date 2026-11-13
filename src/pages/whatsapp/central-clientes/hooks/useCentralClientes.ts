import { type AcessoClientes, podeCliente } from './useAcessoClientes'
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

export function useCentralClientes(acesso: AcessoClientes | null) {
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
    if (!podeCliente(acesso, 'read')) {
      setClientes([])
      setPaginacao(PAGINACAO_INICIAL)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resultado = await buscarClientesCentral(
        filtros,
        acesso!,
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
  }, [filtros, pagina, acesso])

  const carregarKanban = useCallback(async () => {
    if (!podeCliente(acesso, 'read')) {
      setClientesKanban([])
      setLoadingKanban(false)
      return
    }
    setLoadingKanban(true)
    try {
      setClientesKanban(await buscarClientesKanban(acesso!))
    } finally {
      setLoadingKanban(false)
    }
  }, [acesso])

  const carregarApoio = useCallback(async () => {
    if (!podeCliente(acesso, 'read')) {
      setResumo(RESUMO_INICIAL)
      setResponsaveis([])
      return
    }
    try {
      const [novoResumo, novosResponsaveis] =
        await Promise.all([
          buscarResumoCentral(filtros, acesso!),
          buscarResponsaveisCentral(acesso!),
        ])
      setResumo(novoResumo)
      setResponsaveis(novosResponsaveis)
    } catch (erro) {
      setError(erro instanceof Error ? erro : new Error('Falha ao carregar resumo de clientes.'))
    }
  }, [filtros, acesso])

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
      if (!podeCliente(acesso, 'make_lead', cliente)) throw new Error('Sem permissão para tornar Lead.')
      await tornarClienteLead(cliente)
      await recarregar()
    },
    [recarregar, acesso]
  )

  const moverKanban = useCallback(
    async (
      cliente: ClienteCentral,
      etapa: ClienteKanbanStage,
      posicao: number
    ) => {
      if (!podeCliente(acesso, 'update', cliente)) throw new Error('Sem permissão para mover o Kanban.')
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
    [acesso]
  )

  const transferir = useCallback(
    async (
      cliente: ClienteCentral,
      responsavelId: string
    ) => {
      if (!podeCliente(acesso, 'transfer', cliente)) throw new Error('Sem permissão para transferir.')
      await transferirResponsavelCentral(
        cliente,
        responsavelId
      )
      await recarregar()
    },
    [recarregar, acesso]
  )

  const excluir = useCallback(
    async (cliente: ClienteCentral) => {
      if (!podeCliente(acesso, 'delete', cliente)) throw new Error('Sem permissão para excluir.')
      await excluirClienteCentral(cliente)
      await recarregar()
    },
    [recarregar, acesso]
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
