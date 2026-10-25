import {
  CalendarClock,
  GripVertical,
  MessageCircle,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ClienteCentral } from '../../types/centralClientes'
import {
  formatarDataHora,
  formatarTelefone,
} from '../../utils/clienteFormatters'

export const clienteCardId = (cliente: ClienteCentral) =>
  `${cliente.tipo}:${cliente.id}`

interface Props {
  cliente: ClienteCentral
  onOpen: (cliente: ClienteCentral) => void
}

type SortableAttributes = ReturnType<typeof useSortable>['attributes']
type SortableListeners = ReturnType<typeof useSortable>['listeners']

interface ContentProps {
  cliente: ClienteCentral
  dragging?: boolean
  dragAttributes?: SortableAttributes
  dragListeners?: SortableListeners
  onOpen?: (cliente: ClienteCentral) => void
}

export function ClienteKanbanCardContent({
  cliente,
  dragging = false,
  dragAttributes,
  dragListeners,
  onOpen,
}: ContentProps) {
  return (
    <div
      onClick={() => {
        if (!dragging) {
          onOpen?.(cliente)
        }
      }}
      className={`rounded-xl border bg-white p-3 shadow-sm transition-all duration-150 ${
        dragging
          ? 'border-blue-300 shadow-2xl ring-2 ring-blue-100'
          : 'cursor-pointer border-slate-200 hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">
            {cliente.nome}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {cliente.nomeSecundario ||
              (cliente.tipo === 'PF'
                ? 'Pessoa física'
                : 'Pessoa jurídica')}
          </p>
        </div>

        {!dragging && (
          <button
            type="button"
            {...dragAttributes}
            {...dragListeners}
            onClick={event => event.stopPropagation()}
            className="flex h-7 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
            title="Mover cliente"
            aria-label={`Mover ${cliente.nome}`}
          >
            <GripVertical size={15} />
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <MessageCircle size={12} />
          {formatarTelefone(cliente.telefone)}
        </p>

        {cliente.proximoCompromisso && (
          <p className="flex items-center gap-2 text-[11px] text-slate-500">
            <CalendarClock size={12} />
            {formatarDataHora(
              cliente.proximoCompromisso.inicioEm
            )}
          </p>
        )}
      </div>

      {cliente.produtos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {cliente.produtos.slice(0, 2).map(produto => (
            <span
              key={produto.id}
              className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-500"
            >
              {produto.nome}
            </span>
          ))}
          {cliente.produtos.length > 2 && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-500">
              +{cliente.produtos.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-2">
        <p className="truncate text-[10px] font-medium text-slate-400">
          {cliente.responsavelNome}
        </p>
      </div>
    </div>
  )
}

export default function ClienteKanbanCard({
  cliente,
  onOpen,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: clienteCardId(cliente),
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={
        isDragging
          ? 'relative z-10 opacity-25'
          : 'relative z-0'
      }
    >
      <ClienteKanbanCardContent
        cliente={cliente}
        dragAttributes={attributes}
        dragListeners={listeners}
        onOpen={onOpen}
      />
    </div>
  )
}
