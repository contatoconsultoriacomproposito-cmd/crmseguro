import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  GripVertical,
  Plus,
  Route,
  Save,
  Trash2,
} from 'lucide-react'

import type {
  AutomationVariable,
  PreviewMessage,
  RoutingConfig,
  RoutingOption,
} from '../types/automationTypes'

import { AutomationPreview } from '../components/AutomationPreview'

interface RoutingEditorProps {
  initialConfig: RoutingConfig
  variables: AutomationVariable[]
  onBack: () => void
  onSave: (config: RoutingConfig) => void
}

type EditableMessageField =
  | 'initialMessage'
  | 'completionMessage'

interface MessageFieldProps {
  label: string
  description?: string
  value: string
  placeholder?: string
  variables: AutomationVariable[]
  onChange: (value: string) => void
}

function MessageField({
  label,
  description,
  value,
  placeholder,
  variables,
  onChange,
}: MessageFieldProps) {
  const [variablesOpen, setVariablesOpen] = useState(false)

  const insertVariable = (variable: AutomationVariable) => {
    const separator =
      value.length > 0 && !value.endsWith(' ')
        ? ' '
        : ''

    onChange(`${value}${separator}${variable.key}`)
    setVariablesOpen(false)
  }

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <label className="text-sm font-medium text-slate-800">
            {label}
          </label>

          {description && (
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() =>
              setVariablesOpen((current) => !current)
            }
            className="
              inline-flex items-center gap-1 rounded-md px-2 py-1
              text-xs font-medium text-slate-500 transition-colors
              hover:bg-slate-100 hover:text-slate-700
            "
          >
            {'{ }'}
            Variável
            <ChevronDown size={13} />
          </button>

          {variablesOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {variables.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="
                    flex w-full flex-col px-3 py-2 text-left
                    transition-colors hover:bg-slate-50
                  "
                >
                  <span className="text-xs font-medium text-slate-700">
                    {variable.key}
                  </span>

                  <span className="mt-0.5 text-[11px] text-slate-400">
                    {variable.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="
          w-full resize-none rounded-xl border border-slate-200
          bg-white px-3.5 py-3 text-sm leading-6 text-slate-800
          outline-none transition
          placeholder:text-slate-400
          focus:border-slate-300 focus:ring-4 focus:ring-slate-100
        "
      />
    </div>
  )
}

function createOptionId() {
  return `routing-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function RoutingEditor({
  initialConfig,
  variables,
  onBack,
  onSave,
}: RoutingEditorProps) {
  const [config, setConfig] = useState<RoutingConfig>(() => ({
    ...initialConfig,
    options: initialConfig.options.map((option) => ({
      ...option,
    })),
  }))

  const [saved, setSaved] = useState(false)

  const updateMessage = (
    field: EditableMessageField,
    value: string,
  ) => {
    setSaved(false)

    setConfig((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const toggleEnabled = () => {
    setSaved(false)

    setConfig((current) => ({
      ...current,
      enabled: !current.enabled,
    }))
  }

  const toggleOption = (optionId: string) => {
    setSaved(false)

    setConfig((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              enabled: !option.enabled,
            }
          : option,
      ),
    }))
  }

  const renameOption = (
    optionId: string,
    label: string,
  ) => {
    setSaved(false)

    setConfig((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              label,
            }
          : option,
      ),
    }))
  }

  const addOption = () => {
    setSaved(false)

    setConfig((current) => {
      const nextOrder =
        current.options.length > 0
          ? Math.max(
              ...current.options.map((option) => option.order),
            ) + 1
          : 1

      const newOption: RoutingOption = {
        id: createOptionId(),
        label: 'Nova opção',
        enabled: true,
        order: nextOrder,
      }

      return {
        ...current,
        options: [...current.options, newOption],
      }
    })
  }

  const removeOption = (optionId: string) => {
    setSaved(false)

    setConfig((current) => {
      const remainingOptions = current.options
        .filter((option) => option.id !== optionId)
        .sort((a, b) => a.order - b.order)
        .map((option, index) => ({
          ...option,
          order: index + 1,
        }))

      return {
        ...current,
        options: remainingOptions,
      }
    })
  }

  const moveOption = (
    optionId: string,
    direction: 'up' | 'down',
  ) => {
    setSaved(false)

    setConfig((current) => {
      const orderedOptions = [...current.options].sort(
        (a, b) => a.order - b.order,
      )

      const currentIndex = orderedOptions.findIndex(
        (option) => option.id === optionId,
      )

      if (currentIndex === -1) {
        return current
      }

      const targetIndex =
        direction === 'up'
          ? currentIndex - 1
          : currentIndex + 1

      if (
        targetIndex < 0 ||
        targetIndex >= orderedOptions.length
      ) {
        return current
      }

      const nextOptions = [...orderedOptions]

      const currentOption = nextOptions[currentIndex]
      const targetOption = nextOptions[targetIndex]

      nextOptions[currentIndex] = targetOption
      nextOptions[targetIndex] = currentOption

      return {
        ...current,
        options: nextOptions.map((option, index) => ({
          ...option,
          order: index + 1,
        })),
      }
    })
  }

  const orderedOptions = useMemo(
    () =>
      [...config.options].sort(
        (a, b) => a.order - b.order,
      ),
    [config.options],
  )

  const enabledOptions = useMemo(
    () =>
      orderedOptions.filter(
        (option) =>
          option.enabled && option.label.trim().length > 0,
      ),
    [orderedOptions],
  )

  const previewMessages = useMemo<PreviewMessage[]>(() => {
    const messages: PreviewMessage[] = []

    if (config.initialMessage.trim()) {
      messages.push({
        id: 'routing-initial',
        type: 'outgoing',
        text: config.initialMessage,
        buttons: enabledOptions.map((option) => ({
          id: option.id,
          label: option.label,
        })),
      })
    }

    if (enabledOptions.length > 0) {
      messages.push({
        id: 'routing-answer',
        type: 'incoming',
        text: enabledOptions[0].label,
      })
    }

    if (config.completionMessage.trim()) {
      messages.push({
        id: 'routing-completion',
        type: 'outgoing',
        text: config.completionMessage,
      })
    }

    return messages
  }, [
    config.initialMessage,
    config.completionMessage,
    enabledOptions,
  ])

  const handleSave = () => {
    onSave(config)
    setSaved(true)

    window.setTimeout(() => {
      setSaved(false)
    }, 2000)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="
                mt-0.5 flex h-9 w-9 shrink-0 items-center
                justify-center rounded-lg border border-slate-200
                bg-white text-slate-500 transition-colors
                hover:bg-slate-50 hover:text-slate-800
              "
              aria-label="Voltar para automações"
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Route size={17} strokeWidth={1.8} />
                </div>

                <h1 className="text-lg font-semibold text-slate-900">
                  Triagem de atendimento
                </h1>
              </div>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Configure como clientes que já tiveram contato com
                sua empresa serão direcionados antes do atendimento
                humano.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-700">
                Automação
              </p>

              <p className="text-[11px] text-slate-400">
                {config.enabled ? 'Ativa' : 'Desativada'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={config.enabled}
              onClick={toggleEnabled}
              className={`
                relative h-6 w-11 shrink-0 rounded-full
                transition-colors duration-200
                ${
                  config.enabled
                    ? 'bg-emerald-500'
                    : 'bg-slate-300'
                }
              `}
            >
              <span
                className={`
                  absolute top-0.5 h-5 w-5 rounded-full
                  bg-white shadow-sm transition-all duration-200
                  ${
                    config.enabled
                      ? 'left-[22px]'
                      : 'left-0.5'
                  }
                `}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto grid max-w-[1500px] gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">
                  Etapa 1
                </p>

                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Recepção
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Pergunte ao cliente qual é o motivo do contato.
                </p>
              </div>

              <MessageField
                label="Mensagem inicial"
                description="Esta mensagem será exibida junto com as opções de atendimento."
                value={config.initialMessage}
                variables={variables}
                onChange={(value) =>
                  updateMessage('initialMessage', value)
                }
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-600">
                    Etapa 2
                  </p>

                  <h2 className="mt-1 text-base font-semibold text-slate-900">
                    Opções de atendimento
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Defina quais motivos poderão ser selecionados
                    pelo cliente.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  {enabledOptions.length} ativas
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                {orderedOptions.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Route
                      size={22}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-sm font-medium text-slate-600">
                      Nenhuma opção cadastrada
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Adicione pelo menos uma opção de atendimento.
                    </p>
                  </div>
                ) : (
                  orderedOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className={`
                        flex items-center gap-3 bg-white px-3.5 py-3
                        ${
                          index < orderedOptions.length - 1
                            ? 'border-b border-slate-100'
                            : ''
                        }
                      `}
                    >
                      <GripVertical
                        size={16}
                        className="shrink-0 text-slate-300"
                      />

                      <button
                        type="button"
                        role="switch"
                        aria-checked={option.enabled}
                        onClick={() => toggleOption(option.id)}
                        className={`
                          relative h-5 w-9 shrink-0 rounded-full
                          transition-colors
                          ${
                            option.enabled
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }
                        `}
                      >
                        <span
                          className={`
                            absolute top-0.5 h-4 w-4 rounded-full
                            bg-white shadow-sm transition-all
                            ${
                              option.enabled
                                ? 'left-[18px]'
                                : 'left-0.5'
                            }
                          `}
                        />
                      </button>

                      <input
                        type="text"
                        value={option.label}
                        maxLength={40}
                        onChange={(event) =>
                          renameOption(
                            option.id,
                            event.target.value,
                          )
                        }
                        className={`
                          min-w-0 flex-1 rounded-lg border
                          border-transparent bg-transparent px-2 py-1.5
                          text-sm font-medium outline-none transition
                          hover:border-slate-200
                          focus:border-slate-300 focus:bg-white
                          focus:ring-4 focus:ring-slate-100
                          ${
                            option.enabled
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }
                        `}
                      />

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveOption(option.id, 'up')
                          }
                          className="
                            flex h-7 w-7 items-center justify-center
                            rounded-md text-slate-400 transition-colors
                            hover:bg-slate-100 hover:text-slate-700
                            disabled:cursor-not-allowed
                            disabled:opacity-25
                          "
                          aria-label={`Mover ${option.label} para cima`}
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          disabled={
                            index === orderedOptions.length - 1
                          }
                          onClick={() =>
                            moveOption(option.id, 'down')
                          }
                          className="
                            flex h-7 w-7 items-center justify-center
                            rounded-md text-slate-400 transition-colors
                            hover:bg-slate-100 hover:text-slate-700
                            disabled:cursor-not-allowed
                            disabled:opacity-25
                          "
                          aria-label={`Mover ${option.label} para baixo`}
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeOption(option.id)}
                          className="
                            flex h-7 w-7 items-center justify-center
                            rounded-md text-slate-400 transition-colors
                            hover:bg-red-50 hover:text-red-600
                          "
                          aria-label={`Remover ${option.label}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={addOption}
                className="
                  mt-3 inline-flex items-center gap-1.5 rounded-lg
                  border border-slate-200 bg-white px-3 py-2
                  text-sm font-medium text-slate-600
                  transition-colors hover:bg-slate-50
                  hover:text-slate-800
                "
              >
                <Plus size={15} />
                Adicionar opção
              </button>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                Evite muitas opções. Uma triagem curta facilita a
                escolha do cliente e agiliza o atendimento.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  Etapa 3
                </p>

                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Conclusão
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Informe que a solicitação foi identificada e que
                  um atendente dará continuidade à conversa.
                </p>
              </div>

              <MessageField
                label="Mensagem após a escolha"
                value={config.completionMessage}
                variables={variables}
                onChange={(value) =>
                  updateMessage('completionMessage', value)
                }
              />
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3 pb-2">
              {saved && (
                <div className="mr-auto flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Check size={16} />
                  Alterações salvas
                </div>
              )}

              <button
                type="button"
                onClick={onBack}
                className="
                  rounded-lg border border-slate-200 bg-white
                  px-4 py-2.5 text-sm font-medium text-slate-600
                  transition-colors hover:bg-slate-50
                  hover:text-slate-800
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="
                  inline-flex items-center gap-2 rounded-lg
                  bg-slate-900 px-4 py-2.5 text-sm font-medium
                  text-white transition-colors hover:bg-slate-800
                "
              >
                <Save size={16} />
                Salvar alterações
              </button>
            </div>
          </div>

          <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <AutomationPreview
              title="Pré-visualização"
              subtitle="As alterações aparecem aqui em tempo real."
              messages={previewMessages}
              variables={variables}
            />

            {!config.enabled && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium text-amber-800">
                  Esta automação está desativada.
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  A configuração será preservada, mas a triagem não
                  será iniciada automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}