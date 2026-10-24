import {
  MoreHorizontal,
  Target,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ClienteCentral } from '../../types/centralClientes'

interface Props {
  cliente: ClienteCentral
  onTornarLead: (cliente: ClienteCentral) => void
  onExcluir: (cliente: ClienteCentral) => void
}

export default function ClienteAcoesMenu({
  cliente,
  onTornarLead,
  onExcluir,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fechar = (event: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', fechar)
    return () =>
      document.removeEventListener('mousedown', fechar)
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
        title="Mais ações"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {cliente.classificacao !== 'LEAD' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onTornarLead(cliente)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Target size={14} />
              Tornar Lead
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onExcluir(cliente)
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={14} />
            Excluir cliente
          </button>
        </div>
      )}
    </div>
  )
}
