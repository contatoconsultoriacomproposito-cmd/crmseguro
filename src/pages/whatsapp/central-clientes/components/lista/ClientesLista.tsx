import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import type {
  CentralClientesPaginacao,
  ClienteCentral,
} from '../../types/centralClientes'
import ClienteListaRow from './ClienteListaRow'

interface Props {
  clientes: ClienteCentral[]
  paginacao: CentralClientesPaginacao
  loading: boolean
  onPaginaChange: (pagina: number) => void
  onOpen: (cliente: ClienteCentral) => void
  onWhatsApp: (cliente: ClienteCentral) => void
  onTornarLead: (cliente: ClienteCentral) => void
  onExcluir: (cliente: ClienteCentral) => void
}

export default function ClientesLista({
  clientes,
  paginacao,
  loading,
  onPaginaChange,
  onOpen,
  onWhatsApp,
  onTornarLead,
  onExcluir,
}: Props) {
  return (
    <div className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="min-h-0 overflow-auto">
        <table className="w-full min-w-[1180px] border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200">
              {[
                'Cliente',
                'CPF/CNPJ',
                'Contato',
                'Produtos',
                'Próximo compromisso',
                'Responsável',
                'Ações',
              ].map(label => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 last:text-right"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!loading &&
              clientes.map(cliente => (
                <ClienteListaRow
                  key={`${cliente.tipo}:${cliente.id}`}
                  cliente={cliente}
                  onOpen={onOpen}
                  onWhatsApp={onWhatsApp}
                  onTornarLead={onTornarLead}
                  onExcluir={onExcluir}
                />
              ))}
          </tbody>
        </table>

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2
              size={24}
              className="animate-spin text-blue-600"
            />
          </div>
        )}

        {!loading && clientes.length === 0 && (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-400">
          {paginacao.total} cliente
          {paginacao.total === 1 ? '' : 's'}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={paginacao.pagina <= 1 || loading}
            onClick={() =>
              onPaginaChange(paginacao.pagina - 1)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-medium text-slate-500">
            {paginacao.pagina} / {paginacao.totalPaginas}
          </span>
          <button
            type="button"
            disabled={
              paginacao.pagina >= paginacao.totalPaginas ||
              loading
            }
            onClick={() =>
              onPaginaChange(paginacao.pagina + 1)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  )
}
