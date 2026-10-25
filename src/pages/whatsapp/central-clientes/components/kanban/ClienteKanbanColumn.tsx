import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { LucideIcon } from 'lucide-react'
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
  description: string
  icon: LucideIcon
  accent: string
  iconStyle: string
  countStyle: string
  dropStyle: string
  clientes: ClienteCentral[]
  onOpen: (cliente: ClienteCentral) => void
}

export default function ClienteKanbanColumn({
  id,
  label,
  description,
  icon: Icon,
  accent,
  iconStyle,
  countStyle,
  dropStyle,
  clientes,
  onOpen,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${id}`,
  })

  return (
    <section
      ref={setNodeRef}
      className={`relative flex h-full w-[312px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-slate-50 transition-colors duration-150 ${
        isOver
          ? dropStyle
          : 'border-slate-200'
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-1 w-full ${accent}`}
      />

      <header className="shrink-0 border-b border-slate-200/80 bg-white px-3.5 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
            >
              <Icon size={17} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-800">
                {label}
              </h2>

              <p className="truncate text-[11px] text-slate-400">
                {description}
              </p>
            </div>
          </div>

          <span
            className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold ${countStyle}`}
          >
            {clientes.length}
          </span>
        </div>
      </header>

      <SortableContext
        items={clientes.map(clienteCardId)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={`min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 transition-colors ${
            isOver ? 'bg-white/20' : ''
          }`}
        >
          {clientes.length ? (
            clientes.map(cliente => (
              <ClienteKanbanCard
                key={clienteCardId(cliente)}
                cliente={cliente}
                onOpen={onOpen}
              />
            ))
          ) : (
            <div
              className={`flex h-28 items-center justify-center rounded-xl border border-dashed px-4 text-center transition ${
                isOver
                  ? 'border-current bg-white/60'
                  : 'border-slate-300 bg-white/40'
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-400">
                  {isOver
                    ? 'Solte o cliente aqui'
                    : 'Nenhum cliente'}
                </p>

                {!isOver && (
                  <p className="mt-1 text-[10px] text-slate-300">
                    Arraste um Lead para esta etapa
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
