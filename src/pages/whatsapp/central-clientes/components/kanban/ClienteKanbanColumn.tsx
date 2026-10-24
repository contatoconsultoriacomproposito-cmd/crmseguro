import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type {
  ClienteCentral,
  ClienteKanbanStage,
} from '../../types/centralClientes'
import ClienteKanbanCard, {
  clienteCardId,
} from './ClienteKanbanCard'

interface Props {
  id: ClienteKanbanStage
  label: string
  clientes: ClienteCentral[]
  onOpen: (cliente: ClienteCentral) => void
}

export default function ClienteKanbanColumn({
  id,
  label,
  clientes,
  onOpen,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${id}`,
  })

  return (
    <section
      ref={setNodeRef}
      className={`flex h-full w-[305px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-slate-50 transition ${
        isOver
          ? 'border-blue-300 bg-blue-50/40'
          : 'border-slate-200'
      }`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3.5 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            {label}
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {clientes.length} cliente
            {clientes.length === 1 ? '' : 's'}
          </p>
        </div>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-600">
          {clientes.length}
        </span>
      </header>

      <SortableContext
        items={clientes.map(clienteCardId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
          {clientes.length ? (
            clientes.map(cliente => (
              <ClienteKanbanCard
                key={clienteCardId(cliente)}
                cliente={cliente}
                onOpen={onOpen}
              />
            ))
          ) : (
            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-xs text-slate-400">
              Solte um Lead nesta etapa
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
