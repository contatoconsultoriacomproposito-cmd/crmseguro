import type { AutomationStatus } from '../types/automationTypes'

interface AutomationStatusBadgeProps {
  status: AutomationStatus
}

export function AutomationStatusBadge({
  status,
}: AutomationStatusBadgeProps) {
  const isActive = status === 'active'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
        text-xs font-medium
        ${
          isActive
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-100 text-slate-500'
        }
      `}
    >
      <span
        className={`
          h-1.5 w-1.5 rounded-full
          ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}
        `}
      />

      {isActive ? 'Ativa' : 'Desativada'}
    </span>
  )
}