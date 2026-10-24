import type { LucideIcon } from 'lucide-react'

interface AutomationMetricCardProps {
  title: string
  value: number | string
  description: string
  icon: LucideIcon
}

export function AutomationMetricCard({
  title,
  value,
  description,
  icon: Icon,
}: AutomationMetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}