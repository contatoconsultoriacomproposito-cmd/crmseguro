import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Loader2 } from 'lucide-react'
import type {
  ClienteCentral,
  ClienteKanbanStage,
} from '../../types/centralClientes'
import {
  KANBAN_STAGES,
} from '../../types/centralClientes'
import ClienteKanbanColumn from './ClienteKanbanColumn'

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

const cardId = (cliente: ClienteCentral) =>
  `${cliente.tipo}:${cliente.id}`

export default function ClientesKanban({
  clientes,
  loading,
  onOpen,
  onMove,
}: Props) {
  const [local, setLocal] =
    useState<ClienteCentral[]>(clientes)

  useEffect(() => {
    setLocal(clientes)
  }, [clientes])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  )

  const porEtapa = useMemo(() => {
    const mapa = new Map<
      ClienteKanbanStage,
      ClienteCentral[]
    >()

    KANBAN_STAGES.forEach(stage =>
      mapa.set(stage.id, [])
    )

    local.forEach(cliente => {
      const etapa =
        cliente.etapaKanban || 'prospeccao'
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
  }, [local])

  const handleDragEnd = async (
    event: DragEndEvent
  ) => {
    if (!event.over) return

    const activeId = String(event.active.id)
    const overId = String(event.over.id)

    const cliente = local.find(
      item => cardId(item) === activeId
    )
    if (!cliente) return

    let etapaDestino: ClienteKanbanStage
    let posicaoDestino = 0

    if (overId.startsWith('column:')) {
      etapaDestino = overId.replace(
        'column:',
        ''
      ) as ClienteKanbanStage

      const itens =
        porEtapa.get(etapaDestino) || []
      posicaoDestino =
        itens.length === 0
          ? 0
          : Math.max(
              ...itens.map(
                item => item.posicaoKanban ?? 0
              )
            ) + 1
    } else {
      const alvo = local.find(
        item => cardId(item) === overId
      )
      if (!alvo) return

      etapaDestino =
        alvo.etapaKanban || 'prospeccao'

      const posicaoAlvo =
        alvo.posicaoKanban ?? 0

      posicaoDestino =
        posicaoAlvo - 0.5
    }

    const snapshot = local

    setLocal(atual =>
      atual.map(item =>
        cardId(item) === activeId
          ? {
              ...item,
              etapaKanban: etapaDestino,
              posicaoKanban: posicaoDestino,
            }
          : item
      )
    )

    try {
      await onMove(
        cliente,
        etapaDestino,
        posicaoDestino
      )
    } catch (error) {
      console.error(
        'Erro ao mover cliente no Kanban:',
        error
      )
      setLocal(snapshot)
    }
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-slate-100/70">
        <div className="flex h-full min-w-max gap-3 p-3">
          {KANBAN_STAGES.map(stage => (
            <ClienteKanbanColumn
              key={stage.id}
              id={stage.id}
              label={stage.label}
              clientes={porEtapa.get(stage.id) || []}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}
