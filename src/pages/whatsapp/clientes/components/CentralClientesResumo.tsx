import {
  Building2,
  CalendarOff,
  Target,
  UserRound,
  Users,
} from 'lucide-react'
import type { CentralClientesResumo as Resumo } from '../types/centralClientes'

interface Props {
  resumo: Resumo
}

const cards = [
  {
    key: 'total' as const,
    label: 'Total',
    icon: Users,
  },
  {
    key: 'pessoas' as const,
    label: 'Pessoas',
    icon: UserRound,
  },
  {
    key: 'empresas' as const,
    label: 'Empresas',
    icon: Building2,
  },
  {
    key: 'leads' as const,
    label: 'Leads',
    icon: Target,
  },
  {
    key: 'semCompromisso' as const,
    label: 'Sem compromisso',
    icon: CalendarOff,
  },
]

export default function CentralClientesResumo({
  resumo,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {resumo[card.key]}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Icon size={17} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
