import { Bot, CheckCheck, MessageCircleMore } from 'lucide-react'

import type {
  AutomationVariable,
  PreviewMessage,
} from '../types/automationTypes'

interface AutomationPreviewProps {
  title?: string
  subtitle?: string
  messages: PreviewMessage[]
  variables?: AutomationVariable[]
}

function replaceVariables(
  text: string,
  variables: AutomationVariable[],
) {
  return variables.reduce((result, variable) => {
    return result.split(variable.key).join(variable.example)
  }, text)
}

export function AutomationPreview({
  title = 'Pré-visualização',
  subtitle = 'Veja como a conversa será apresentada ao cliente.',
  messages,
  variables = [],
}: AutomationPreviewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {subtitle}
        </p>
      </div>

      <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Bot size={18} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Atendimento automático
            </p>

            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              <span className="text-[11px] font-medium text-slate-500">
                Simulação
              </span>
            </div>
          </div>
        </div>

        <div
          className="
            flex flex-1 flex-col gap-3 overflow-y-auto
            bg-slate-50 px-4 py-5
          "
        >
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-[240px] text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <MessageCircleMore size={18} strokeWidth={1.8} />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-600">
                  Nenhuma mensagem para visualizar
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  As mensagens configuradas aparecerão aqui.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOutgoing = message.type === 'outgoing'

              const renderedText = replaceVariables(
                message.text,
                variables,
              )

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isOutgoing
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`
                        rounded-2xl px-3.5 py-2.5 shadow-sm
                        ${
                          isOutgoing
                            ? 'rounded-br-md bg-emerald-100 text-slate-800'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                        }
                      `}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-5">
                        {renderedText}
                      </p>

                      {message.buttons &&
                        message.buttons.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {message.buttons.map((button) => (
                              <button
                                key={button.id}
                                type="button"
                                disabled
                                className="
                                  flex w-full cursor-default items-center
                                  justify-center rounded-lg border
                                  border-emerald-200 bg-white px-3 py-2
                                  text-xs font-medium text-emerald-700
                                "
                              >
                                {button.label}
                              </button>
                            ))}
                          </div>
                        )}

                      <div
                        className={`
                          mt-1 flex items-center justify-end gap-1
                          text-[10px]
                          ${
                            isOutgoing
                              ? 'text-slate-500'
                              : 'text-slate-400'
                          }
                        `}
                      >
                        <span>
                          {isOutgoing ? '09:42' : '09:41'}
                        </span>

                        {isOutgoing && (
                          <CheckCheck
                            size={13}
                            strokeWidth={1.8}
                            className="text-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex h-9 items-center rounded-full bg-slate-100 px-4">
            <span className="text-xs text-slate-400">
              Pré-visualização da conversa
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}