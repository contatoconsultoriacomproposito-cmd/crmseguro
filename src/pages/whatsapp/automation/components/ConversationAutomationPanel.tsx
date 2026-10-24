import {
  Bot,
  Check,
  CheckCircle2,
  CircleUserRound,
  Mail,
  PackageSearch,
  Play,
  Route,
  UserRoundCheck,
  X,
} from 'lucide-react'

export type ConversationAutomationStatus =
  | 'awaiting_decision'
  | 'pre_qualification'
  | 'routing'
  | 'awaiting_human'
  | 'human'

export type ConversationAutomationType =
  | 'pre_qualification'
  | 'routing'

export interface ConversationQualificationData {
  name?: string
  email?: string
  product?: string
}

export interface ConversationRoutingData {
  reason?: string
}

interface ConversationAutomationPanelProps {
  status: ConversationAutomationStatus
  type?: ConversationAutomationType

  currentStep?: number
  totalSteps?: number

  qualificationData?: ConversationQualificationData
  routingData?: ConversationRoutingData

  onStartPreQualification?: () => void
  onAttendNormally?: () => void
  onTakeOver?: () => void
  onDismiss?: () => void
}

export function ConversationAutomationPanel({
  status,
  type = 'pre_qualification',
  currentStep = 1,
  totalSteps = 4,
  qualificationData,
  routingData,
  onStartPreQualification,
  onAttendNormally,
  onTakeOver,
  onDismiss,
}: ConversationAutomationPanelProps) {
  if (status === 'human') {
    return null
  }

  if (status === 'awaiting_decision') {
    return (
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl rounded-xl border border-violet-200 bg-violet-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Bot size={18} strokeWidth={1.8} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Pré-qualificação disponível
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Este contato ainda não passou pela
                    pré-qualificação. Você pode iniciar a automação
                    ou assumir o atendimento normalmente.
                  </p>
                </div>

                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="
                      flex h-7 w-7 shrink-0 items-center justify-center
                      rounded-md text-slate-400 transition-colors
                      hover:bg-white hover:text-slate-600
                    "
                    aria-label="Fechar aviso"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onStartPreQualification}
                  className="
                    inline-flex items-center gap-1.5 rounded-lg
                    bg-violet-600 px-3 py-2 text-xs font-semibold
                    text-white transition-colors hover:bg-violet-700
                  "
                >
                  <Play size={14} fill="currentColor" />
                  Iniciar pré-qualificação
                </button>

                <button
                  type="button"
                  onClick={onAttendNormally}
                  className="
                    inline-flex items-center gap-1.5 rounded-lg
                    border border-slate-200 bg-white px-3 py-2
                    text-xs font-semibold text-slate-600
                    transition-colors hover:bg-slate-50
                    hover:text-slate-800
                  "
                >
                  <CircleUserRound size={14} />
                  Atender normalmente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'pre_qualification') {
    const safeTotalSteps = Math.max(totalSteps, 1)

    const safeCurrentStep = Math.min(
      Math.max(currentStep, 1),
      safeTotalSteps,
    )

    const progress =
      (safeCurrentStep / safeTotalSteps) * 100

    return (
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Bot size={18} strokeWidth={1.8} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      Pré-qualificação em andamento
                    </p>

                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      Automação ativa
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    O atendimento automático está coletando as
                    informações iniciais do contato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onTakeOver}
                  className="
                    inline-flex shrink-0 items-center gap-1.5
                    rounded-lg border border-slate-200 bg-white
                    px-3 py-2 text-xs font-semibold text-slate-700
                    transition-colors hover:bg-slate-50
                  "
                >
                  <UserRoundCheck size={14} />
                  Assumir atendimento
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-slate-500">
                    Etapa {safeCurrentStep} de {safeTotalSteps}
                  </span>

                  <span className="text-[11px] font-medium text-blue-600">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'routing') {
    return (
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Route size={18} strokeWidth={1.8} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      Triagem em andamento
                    </p>

                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      Automação ativa
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Estamos identificando o motivo do contato antes de
                    encaminhar a conversa para atendimento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onTakeOver}
                  className="
                    inline-flex shrink-0 items-center gap-1.5
                    rounded-lg border border-slate-200 bg-white
                    px-3 py-2 text-xs font-semibold text-slate-700
                    transition-colors hover:bg-slate-50
                  "
                >
                  <UserRoundCheck size={14} />
                  Assumir atendimento
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'awaiting_human') {
    if (type === 'routing') {
      return (
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Route size={18} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Triagem concluída
                      </p>

                      <CheckCircle2
                        size={15}
                        className="text-emerald-600"
                      />
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      O motivo do contato foi identificado e a
                      conversa está pronta para atendimento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onTakeOver}
                    className="
                      inline-flex shrink-0 items-center gap-1.5
                      rounded-lg bg-emerald-600 px-3 py-2
                      text-xs font-semibold text-white
                      transition-colors hover:bg-emerald-700
                    "
                  >
                    <UserRoundCheck size={14} />
                    Assumir atendimento
                  </button>
                </div>

                <div className="mt-3 rounded-lg border border-emerald-200/80 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Motivo do contato
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {routingData?.reason || 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={18} strokeWidth={1.8} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Pré-qualificação concluída
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    As informações iniciais foram coletadas. A
                    conversa está aguardando atendimento humano.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onTakeOver}
                  className="
                    inline-flex shrink-0 items-center gap-1.5
                    rounded-lg bg-emerald-600 px-3 py-2
                    text-xs font-semibold text-white
                    transition-colors hover:bg-emerald-700
                  "
                >
                  <UserRoundCheck size={14} />
                  Assumir atendimento
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <QualificationItem
                  icon={<Check size={14} />}
                  label="Nome"
                  value={
                    qualificationData?.name ||
                    'Não informado'
                  }
                />

                <QualificationItem
                  icon={<Mail size={14} />}
                  label="E-mail"
                  value={
                    qualificationData?.email ||
                    'Não informado'
                  }
                />

                <QualificationItem
                  icon={<PackageSearch size={14} />}
                  label="Interesse"
                  value={
                    qualificationData?.product ||
                    'Não informado'
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

interface QualificationItemProps {
  icon: React.ReactNode
  label: string
  value: string
}

function QualificationItem({
  icon,
  label,
  value,
}: QualificationItemProps) {
  return (
    <div className="min-w-0 rounded-lg border border-emerald-200/80 bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-emerald-600">
        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>

      <p
        className="mt-1 truncate text-xs font-semibold text-slate-700"
        title={value}
      >
        {value}
      </p>
    </div>
  )
}