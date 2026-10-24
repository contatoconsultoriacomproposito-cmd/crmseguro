import {
  ArrowRight,
  Bot,
  Mail,
  PackageSearch,
  Route,
  UserRound,
} from 'lucide-react'

import type {
  AutomationSummary,
  AutomationType,
} from '../types/automationTypes'

import { AutomationStatusBadge } from './AutomationStatusBadge'

interface AutomationCardProps {
  automation: AutomationSummary
  onConfigure: (type: AutomationType) => void
}

const automationVisuals: Record<
  AutomationType,
  {
    icon: typeof Bot
    iconClassName: string
    iconBackgroundClassName: string
    steps: {
      label: string
      icon: typeof UserRound
    }[]
  }
> = {
  pre_qualification: {
    icon: Bot,
    iconClassName: 'text-violet-600',
    iconBackgroundClassName: 'bg-violet-50',
    steps: [
      {
        label: 'Nome',
        icon: UserRound,
      },
      {
        label: 'E-mail',
        icon: Mail,
      },
      {
        label: 'Produto',
        icon: PackageSearch,
      },
    ],
  },

  routing: {
    icon: Route,
    iconClassName: 'text-blue-600',
    iconBackgroundClassName: 'bg-blue-50',
    steps: [
      {
        label: 'Comercial',
        icon: Route,
      },
      {
        label: 'Assistência',
        icon: Route,
      },
      {
        label: 'Sinistro',
        icon: Route,
      },
    ],
  },
}

export function AutomationCard({
  automation,
  onConfigure,
}: AutomationCardProps) {
  const visual = automationVisuals[automation.type]
  const Icon = visual.icon

  return (
    <article className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`
            flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
            ${visual.iconBackgroundClassName}
            ${visual.iconClassName}
          `}
        >
          <Icon size={21} strokeWidth={1.8} />
        </div>

        <AutomationStatusBadge status={automation.status} />
      </div>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-slate-900">
          {automation.title}
        </h3>

        <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">
          {automation.description}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {visual.steps.map((step, index) => {
          const StepIcon = step.icon

          return (
            <div
              key={step.label}
              className="flex items-center gap-2"
            >
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                <StepIcon
                  size={13}
                  strokeWidth={1.8}
                  className="text-slate-400"
                />

                {step.label}
              </div>

              {index < visual.steps.length - 1 && (
                <ArrowRight
                  size={13}
                  strokeWidth={1.8}
                  className="text-slate-300"
                />
              )}
            </div>
          )
        })}

        {automation.type === 'routing' && (
          <span className="text-xs font-medium text-slate-400">
            + outras opções
          </span>
        )}
      </div>

      <div className="mt-auto pt-6">
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => onConfigure(automation.type)}
            className="
              inline-flex items-center gap-1.5 rounded-lg px-3 py-2
              text-sm font-medium text-slate-700
              transition-colors
              hover:bg-slate-100 hover:text-slate-900
              focus:outline-none focus:ring-2 focus:ring-slate-300
            "
          >
            Configurar

            <ArrowRight
              size={15}
              strokeWidth={1.8}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </article>
  )
}