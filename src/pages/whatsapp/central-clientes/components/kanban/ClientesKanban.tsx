import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Headphones,
  Loader2,
  Search,
  ShieldAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import type {
  ClienteCentral,
  ClienteKanbanStage,
} from '../../types/centralClientes'
import {
  KANBAN_STAGES,
} from '../../types/centralClientes'
import ClienteKanbanColumn from './ClienteKanbanColumn'
import {
  ClienteKanbanCardContent,
  clienteCardId,
} from './ClienteKanbanCard'

interface Props {
  clientes: ClienteCentral[]
  loading: boolean
  onOpen: (cliente: ClienteCentral) => void
  onMove: (
    cliente: ClienteCentral,
    etapa: ClienteKanbanStage,
    posicao: number
  ) => Promise<void>
}

interface StageVisual {
  description: string
  icon: LucideIcon
  accent: string
  iconStyle: string
  countStyle: string
  dropStyle: string
}

const STAGE_VISUALS: Record<string, StageVisual> = {
  prospeccao: {
    description: 'Novos contatos',
    icon: Search,
    accent: 'bg-sky-500',
    iconStyle: 'bg-sky-50 text-sky-600',
    countStyle: 'bg-sky-50 text-sky-700',
    dropStyle: 'border-sky-300 bg-sky-50/70',
  },
  negociacao: {
    description: 'Em andamento',
    icon: Handshake,
    accent: 'bg-violet-500',
    iconStyle: 'bg-violet-50 text-violet-600',
    countStyle: 'bg-violet-50 text-violet-700',
    dropStyle: 'border-violet-300 bg-violet-50/70',
  },
  fechamento: {
    description: 'Decisão final',
    icon: CheckCircle2,
    accent: 'bg-amber-500',
    iconStyle: 'bg-amber-50 text-amber-600',
    countStyle: 'bg-amber-50 text-amber-700',
    dropStyle: 'border-amber-300 bg-amber-50/70',
  },
  pos_venda: {
    description: 'Clientes ativos',
    icon: BriefcaseBusiness,
    accent: 'bg-emerald-500',
    iconStyle: 'bg-emerald-50 text-emerald-600',
    countStyle: 'bg-emerald-50 text-emerald-700',
    dropStyle: 'border-emerald-300 bg-emerald-50/70',
  },
  perdido: {
    description: 'Oportunidades perdidas',
    icon: AlertTriangle,
    accent: 'bg-slate-500',
    iconStyle: 'bg-slate-100 text-slate-600',
    countStyle: 'bg-slate-100 text-slate-600',
    dropStyle: 'border-slate-400 bg-slate-100/80',
  },
  assistencia: {
    description: 'Suporte ao cliente',
    icon: Headphones,
    accent: 'bg-cyan-500',
    iconStyle: 'bg-cyan-50 text-cyan-600',
    countStyle: 'bg-cyan-50 text-cyan-700',
    dropStyle: 'border-cyan-300 bg-cyan-50/70',
  },
  sinistro: {
    description: 'Ocorrências',
    icon: ShieldAlert,
    accent: 'bg-rose-500',
    iconStyle: 'bg-rose-50 text-rose-600',
    countStyle: 'bg-rose-50 text-rose-700',
    dropStyle: 'border-rose-300 bg-rose-50/70',
  },
}

const DEFAULT_STAGE_VISUAL: StageVisual = {
  description: 'Etapa do atendimento',
  icon: BriefcaseBusiness,
  accent: 'bg-blue-500',
  iconStyle: 'bg-blue-50 text-blue-600',
  countStyle: 'bg-blue-50 text-blue-700',
  dropStyle: 'border-blue-300 bg-blue-50/70',
}

function visualDaEtapa(
  id: ClienteKanbanStage
): StageVisual {
  return (
    STAGE_VISUALS[String(id)] ??
    DEFAULT_STAGE_VISUAL
  )
}

function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function coletarValores(
  valor: unknown,
  profundidade = 0
): string[] {
  if (
    valor == null ||
    profundidade > 3
  ) {
    return []
  }

  if (
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return [String(valor)]
  }

  if (Array.isArray(valor)) {
    return valor.flatMap(item =>
      coletarValores(
        item,
        profundidade + 1
      )
    )
  }

  if (typeof valor === 'object') {
    return Object.values(
      valor as Record<string, unknown>
    ).flatMap(item =>
      coletarValores(
        item,
        profundidade + 1
      )
    )
  }

  return []
}

function clienteAtendeBusca(
  cliente: ClienteCentral,
  busca: string
): boolean {
  const termo =
    normalizarTexto(busca)

  if (!termo) return true

  const numerico =
    termo.replace(/\D/g, '')

  const campos = [
    cliente.nome,
    cliente.nomeSecundario,
    cliente.documento,
    cliente.telefone,
    cliente.email,
    cliente.municipio,
    cliente.uf,
    cliente.responsavelNome,
    cliente.tipo,
    cliente.temperatura,
    ...cliente.produtos.map(
      produto => produto.nome
    ),
    ...coletarValores(cliente.dados),
  ]
    .filter(Boolean)
    .join(' ')

  const normalizado =
    normalizarTexto(campos)

  if (normalizado.includes(termo)) {
    return true
  }

  return Boolean(
    numerico &&
      normalizado
        .replace(/\D/g, '')
        .includes(numerico)
  )
}

function agruparPorEtapa(
  clientes: ClienteCentral[]
) {
  const mapa = new Map<
    ClienteKanbanStage,
    ClienteCentral[]
  >()

  KANBAN_STAGES.forEach(stage =>
    mapa.set(stage.id, [])
  )

  clientes.forEach(cliente => {
    const etapa =
      cliente.etapaKanban ||
      'prospeccao'

    mapa.get(etapa)?.push(cliente)
  })

  mapa.forEach(itens =>
    itens.sort(
      (a, b) =>
        (a.posicaoKanban ?? 0) -
        (b.posicaoKanban ?? 0)
    )
  )

  return mapa
}

function obterEtapaDestino(
  overId: string,
  clientes: ClienteCentral[]
): ClienteKanbanStage | null {
  if (overId.startsWith('column:')) {
    return overId.replace(
      'column:',
      ''
    ) as ClienteKanbanStage
  }

  const alvo = clientes.find(
    item =>
      clienteCardId(item) === overId
  )

  return alvo?.etapaKanban ?? null
}

function etapaDoCliente(
  cliente: ClienteCentral
): ClienteKanbanStage {
  return (
    cliente.etapaKanban ||
    'prospeccao'
  )
}

function normalizarEtapa(
  clientes: ClienteCentral[],
  etapa: ClienteKanbanStage
): ClienteCentral[] {
  const itensEtapa = clientes
    .filter(
      cliente =>
        etapaDoCliente(cliente) === etapa
    )
    .sort(
      (a, b) =>
        (a.posicaoKanban ?? 0) -
        (b.posicaoKanban ?? 0)
    )
    .map((cliente, index) => ({
      ...cliente,
      etapaKanban: etapa,
      posicaoKanban: index,
    }))

  const porId = new Map(
    itensEtapa.map(cliente => [
      clienteCardId(cliente),
      cliente,
    ])
  )

  return clientes.map(
    cliente =>
      porId.get(
        clienteCardId(cliente)
      ) ?? cliente
  )
}

function normalizarEtapas(
  clientes: ClienteCentral[],
  etapas: ClienteKanbanStage[]
): ClienteCentral[] {
  return Array.from(
    new Set(etapas)
  ).reduce(
    (estado, etapa) =>
      normalizarEtapa(
        estado,
        etapa
      ),
    clientes
  )
}

function moverEntreEtapas(
  clientes: ClienteCentral[],
  activeId: string,
  overId: string,
  etapaDestino: ClienteKanbanStage
): ClienteCentral[] {
  const ativo = clientes.find(
    cliente =>
      clienteCardId(cliente) === activeId
  )

  if (!ativo) {
    return clientes
  }

  const etapaOrigem =
    etapaDoCliente(ativo)

  if (etapaOrigem === etapaDestino) {
    return clientes
  }

  const origem = clientes
    .filter(
      cliente =>
        etapaDoCliente(cliente) ===
          etapaOrigem &&
        clienteCardId(cliente) !== activeId
    )
    .sort(
      (a, b) =>
        (a.posicaoKanban ?? 0) -
        (b.posicaoKanban ?? 0)
    )

  const destino = clientes
    .filter(
      cliente =>
        etapaDoCliente(cliente) ===
          etapaDestino &&
        clienteCardId(cliente) !== activeId
    )
    .sort(
      (a, b) =>
        (a.posicaoKanban ?? 0) -
        (b.posicaoKanban ?? 0)
    )

  let indiceDestino = destino.length

  if (!overId.startsWith('column:')) {
    const indiceAlvo =
      destino.findIndex(
        cliente =>
          clienteCardId(cliente) ===
          overId
      )

    if (indiceAlvo >= 0) {
      indiceDestino = indiceAlvo
    }
  }

  destino.splice(
    indiceDestino,
    0,
    {
      ...ativo,
      etapaKanban: etapaDestino,
    }
  )

  const idsAfetados = new Set([
    ...origem.map(cliente =>
      clienteCardId(cliente)
    ),
    ...destino.map(cliente =>
      clienteCardId(cliente)
    ),
  ])

  const normalizados = [
    ...origem.map(
      (cliente, index) => ({
        ...cliente,
        etapaKanban: etapaOrigem,
        posicaoKanban: index,
      })
    ),
    ...destino.map(
      (cliente, index) => ({
        ...cliente,
        etapaKanban: etapaDestino,
        posicaoKanban: index,
      })
    ),
  ]

  const porId = new Map(
    normalizados.map(cliente => [
      clienteCardId(cliente),
      cliente,
    ])
  )

  return clientes.map(cliente => {
    const id = clienteCardId(cliente)

    if (!idsAfetados.has(id)) {
      return cliente
    }

    return porId.get(id) ?? cliente
  })
}

function reordenarNaEtapa(
  clientes: ClienteCentral[],
  activeId: string,
  overId: string,
  etapa: ClienteKanbanStage
): ClienteCentral[] {
  if (
    overId.startsWith('column:') ||
    activeId === overId
  ) {
    return normalizarEtapa(
      clientes,
      etapa
    )
  }

  const itens = clientes
    .filter(
      cliente =>
        etapaDoCliente(cliente) === etapa
    )
    .sort(
      (a, b) =>
        (a.posicaoKanban ?? 0) -
        (b.posicaoKanban ?? 0)
    )

  const indiceAtual =
    itens.findIndex(
      cliente =>
        clienteCardId(cliente) ===
        activeId
    )

  const indiceDestino =
    itens.findIndex(
      cliente =>
        clienteCardId(cliente) ===
        overId
    )

  if (
    indiceAtual < 0 ||
    indiceDestino < 0
  ) {
    return normalizarEtapa(
      clientes,
      etapa
    )
  }

  const reordenados = arrayMove(
    itens,
    indiceAtual,
    indiceDestino
  ).map(
    (cliente, index) => ({
      ...cliente,
      etapaKanban: etapa,
      posicaoKanban: index,
    })
  )

  const porId = new Map(
    reordenados.map(cliente => [
      clienteCardId(cliente),
      cliente,
    ])
  )

  return clientes.map(
    cliente =>
      porId.get(
        clienteCardId(cliente)
      ) ?? cliente
  )
}

export default function ClientesKanban({
  clientes,
  loading,
  onOpen,
  onMove,
}: Props) {
  const [local, setLocal] =
    useState<ClienteCentral[]>(
      clientes
    )

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<ClienteCentral[] | null>(
      null
    )

  const [
    activeId,
    setActiveId,
  ] =
    useState<string | null>(
      null
    )

  const [busca, setBusca] =
    useState('')

  const scrollRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const persistindoMovimentoRef =
    useRef(false)

  useEffect(() => {
    if (
      !activeId &&
      !persistindoMovimentoRef.current
    ) {
      setLocal(clientes)
    }
  }, [
    clientes,
    activeId,
  ])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter:
        sortableKeyboardCoordinates,
    })
  )

  const clientesFiltrados =
    useMemo(() => {
      if (!busca.trim()) {
        return local
      }

      return local.filter(cliente =>
        clienteAtendeBusca(
          cliente,
          busca
        )
      )
    }, [
      local,
      busca,
    ])

  const porEtapa =
    useMemo(
      () =>
        agruparPorEtapa(
          clientesFiltrados
        ),
      [clientesFiltrados]
    )

  const activeCliente =
    useMemo(
      () =>
        local.find(
          cliente =>
            clienteCardId(cliente) ===
            activeId
        ) ?? null,
      [
        local,
        activeId,
      ]
    )

  const moverHorizontal =
    useCallback(
      (
        direcao:
          | 'esquerda'
          | 'direita'
      ) => {
        const elemento =
          scrollRef.current

        if (!elemento) return

        const deslocamento =
          Math.max(
            220,
            elemento.clientWidth *
              0.35
          )

        elemento.scrollBy({
          left:
            direcao ===
            'direita'
              ? deslocamento
              : -deslocamento,
          behavior: 'smooth',
        })
      },
      []
    )

  const handleDragStart = (
    event: DragStartEvent
  ) => {
    const id =
      String(event.active.id)

    setSnapshot(
      local.map(cliente => ({
        ...cliente,
      }))
    )

    setActiveId(id)
  }

  const handleDragOver = (
    event: DragOverEvent
  ) => {
    const {
      active,
      over,
    } = event

    if (!over) return

    const activeCardId =
      String(active.id)

    const overId =
      String(over.id)

    setLocal(atual => {
      const clienteAtivo =
        atual.find(
          cliente =>
            clienteCardId(cliente) ===
            activeCardId
        )

      if (!clienteAtivo) {
        return atual
      }

      const etapaOrigem =
        etapaDoCliente(
          clienteAtivo
        )

      const etapaDestino =
        obterEtapaDestino(
          overId,
          atual
        )

      if (
        !etapaDestino ||
        etapaOrigem === etapaDestino
      ) {
        return atual
      }

      return moverEntreEtapas(
        atual,
        activeCardId,
        overId,
        etapaDestino
      )
    })
  }

  const handleDragEnd = async (
    event: DragEndEvent
  ) => {
    const {
      active,
      over,
    } = event

    const activeCardId =
      String(active.id)

    if (!over) {
      handleDragCancel()
      return
    }

    const clienteOriginal =
      snapshot?.find(
        cliente =>
          clienteCardId(cliente) ===
          activeCardId
      ) ??
      clientes.find(
        cliente =>
          clienteCardId(cliente) ===
          activeCardId
      )

    if (!clienteOriginal) {
      handleDragCancel()
      return
    }

    const overId =
      String(over.id)

    const clienteAtual =
      local.find(
        cliente =>
          clienteCardId(cliente) ===
          activeCardId
      )

    if (!clienteAtual) {
      handleDragCancel()
      return
    }

    const etapaAtual =
      etapaDoCliente(
        clienteAtual
      )

    const etapaDestino =
      obterEtapaDestino(
        overId,
        local
      ) ?? etapaAtual

    let estadoFinal = local

    if (
      etapaAtual === etapaDestino
    ) {
      estadoFinal =
        reordenarNaEtapa(
          local,
          activeCardId,
          overId,
          etapaDestino
        )
    } else {
      estadoFinal =
        moverEntreEtapas(
          local,
          activeCardId,
          overId,
          etapaDestino
        )
    }

    estadoFinal =
      normalizarEtapas(
        estadoFinal,
        [
          etapaDoCliente(
            clienteOriginal
          ),
          etapaDestino,
        ]
      )

    const clienteFinal =
      estadoFinal.find(
        cliente =>
          clienteCardId(cliente) ===
          activeCardId
      )

    if (!clienteFinal) {
      handleDragCancel()
      return
    }

    const posicaoDestino =
      clienteFinal.posicaoKanban ?? 0

    persistindoMovimentoRef.current = true
    setLocal(estadoFinal)
    setActiveId(null)

    try {
      await onMove(
        clienteOriginal,
        etapaDestino,
        posicaoDestino
      )

      setSnapshot(null)
    } catch (error) {
      console.error(
        'Erro ao mover cliente no Kanban:',
        error
      )

      if (snapshot) {
        setLocal(snapshot)
      }

      setSnapshot(null)
    } finally {
      persistindoMovimentoRef.current = false
    }
  }

  const handleDragCancel = () => {
    if (snapshot) {
      setLocal(snapshot)
    }

    setSnapshot(null)
    setActiveId(null)
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <Loader2
          size={24}
          className="animate-spin text-blue-600"
        />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="sticky top-0 z-30 flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={busca}
            onChange={event =>
              setBusca(
                event.target.value
              )
            }
            placeholder="Buscar cliente, telefone, documento, responsável, produto..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          {busca && (
            <button
              type="button"
              onClick={() =>
                setBusca('')
              }
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            {busca.trim()
              ? `${clientesFiltrados.length} de ${local.length} encontrados`
              : `${local.length} cliente${local.length === 1 ? '' : 's'}`}
          </div>

          <button
            type="button"
            onClick={() =>
              moverHorizontal(
                'esquerda'
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            title="Colunas anteriores"
            aria-label="Mover Kanban para a esquerda"
          >
            <ChevronLeft
              size={18}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              moverHorizontal(
                'direita'
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            title="Próximas colunas"
            aria-label="Mover Kanban para a direita"
          >
            <ChevronRight
              size={18}
            />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={
          closestCenter
        }
        onDragStart={
          handleDragStart
        }
        onDragOver={
          handleDragOver
        }
        onDragEnd={
          handleDragEnd
        }
        onDragCancel={
          handleDragCancel
        }
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-x-auto overflow-y-visible bg-slate-100/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-h-full min-w-max gap-3 p-3 md:gap-4 md:p-4">
            {KANBAN_STAGES.map(
              stage => {
                const visual =
                  visualDaEtapa(
                    stage.id
                  )

                return (
                  <ClienteKanbanColumn
                    key={stage.id}
                    id={stage.id}
                    label={
                      stage.label
                    }
                    description={
                      visual.description
                    }
                    icon={
                      visual.icon
                    }
                    accent={
                      visual.accent
                    }
                    iconStyle={
                      visual.iconStyle
                    }
                    countStyle={
                      visual.countStyle
                    }
                    dropStyle={
                      visual.dropStyle
                    }
                    clientes={
                      porEtapa.get(
                        stage.id
                      ) || []
                    }
                    onOpen={
                      onOpen
                    }
                  />
                )
              }
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCliente ? (
            <div className="w-[296px] rotate-[1.5deg]">
              <ClienteKanbanCardContent
                cliente={
                  activeCliente
                }
                dragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
