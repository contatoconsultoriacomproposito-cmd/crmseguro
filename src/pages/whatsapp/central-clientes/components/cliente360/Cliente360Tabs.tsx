import type {
  Cliente360Contadores,
  Cliente360Tab,
} from '../../types/centralClientes'

interface Props {
  active: Cliente360Tab
  contadores: Cliente360Contadores
  onChange: (tab: Cliente360Tab) => void
}

const tabs: Array<{
  id: Cliente360Tab
  label: string
  contador?: keyof Cliente360Contadores
}> = [
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'agenda', label: 'Agenda', contador: 'agenda' },
  {
    id: 'propostas',
    label: 'Propostas',
    contador: 'propostas',
  },
  {
    id: 'contratos',
    label: 'Contratos',
    contador: 'contratos',
  },
  {
    id: 'sinistros',
    label: 'Sinistros',
    contador: 'sinistros',
  },
  {
    id: 'assistencias',
    label: 'Assistências',
    contador: 'assistencias',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
  },
  {
    id: 'comissoes',
    label: 'Comissões',
  },
  {
    id: 'arquivos',
    label: 'Arquivos',
  },
]

export default function Cliente360Tabs({
  active,
  contadores,
  onChange,
}: Props) {
  return (
    <nav className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4">
      <div className="flex min-w-max">
        {tabs.map(tab => {
          const count = tab.contador
            ? contadores[tab.contador]
            : null

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative px-3.5 py-3 text-xs font-semibold transition ${
                active === tab.id
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {count !== null && count > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                  {count}
                </span>
              )}
              {active === tab.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
