import {
  LayoutGrid,
  List,
  Plus,
  Users,
} from 'lucide-react'
import type { VisualizacaoCentral } from '../types/centralClientes'

interface Props {
  visualizacao: VisualizacaoCentral
  onVisualizacaoChange: (value: VisualizacaoCentral) => void
  onNovoCliente: () => void
}

export default function CentralClientesHeader({
  visualizacao,
  onVisualizacaoChange,
  onNovoCliente,
}: Props) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Users size={19} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Central de Clientes
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Pessoas, empresas e oportunidades em uma única visão.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onVisualizacaoChange('LISTA')}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                visualizacao === 'LISTA'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List size={15} />
              Lista
            </button>
            <button
              type="button"
              onClick={() => onVisualizacaoChange('KANBAN')}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                visualizacao === 'KANBAN'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={15} />
              Kanban
            </button>
          </div>

          <button
            type="button"
            onClick={onNovoCliente}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Novo cliente
          </button>
        </div>
      </div>
    </header>
  )
}
