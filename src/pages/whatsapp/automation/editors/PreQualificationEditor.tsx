import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  PackageSearch,
  Save,
  UserRound,
} from 'lucide-react'

import type {
  AutomationVariable,
  PreQualificationConfig,
  PreviewMessage,
} from '../types/automationTypes'

import { AutomationPreview } from '../components/AutomationPreview'

interface PreQualificationEditorProps {
  initialConfig: PreQualificationConfig
  variables: AutomationVariable[]
  onBack: () => void
  onSave: (config: PreQualificationConfig) => void
}

type EditableMessageField =
  | 'welcomeMessage'
  | 'introductionMessage'
  | 'nameQuestion'
  | 'emailQuestion'
  | 'productQuestion'
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
            onClick={() => setVariablesOpen((current) => !current)}
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
          w-full resize-none rounded-xl border border-slate-200 bg-white
          px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none
          transition
          placeholder:text-slate-400
          focus:border-slate-300 focus:ring-4 focus:ring-slate-100
        "
      />
    </div>
  )
}

export function PreQualificationEditor({
  initialConfig,
  variables,
  onBack,
  onSave,
}: PreQualificationEditorProps) {
  const [config, setConfig] =
    useState<PreQualificationConfig>(() => ({
      ...initialConfig,
      products: initialConfig.products.map((product) => ({
        ...product,
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

  const toggleProduct = (productId: string) => {
    setSaved(false)

    setConfig((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              enabled: !product.enabled,
            }
          : product,
      ),
    }))
  }

  const moveProduct = (
    productId: string,
    direction: 'up' | 'down',
  ) => {
    setSaved(false)

    setConfig((current) => {
      const orderedProducts = [...current.products].sort(
        (a, b) => a.order - b.order,
      )

      const currentIndex = orderedProducts.findIndex(
        (product) => product.id === productId,
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
        targetIndex >= orderedProducts.length
      ) {
        return current
      }

      const nextProducts = [...orderedProducts]

      const currentProduct = nextProducts[currentIndex]
      const targetProduct = nextProducts[targetIndex]

      nextProducts[currentIndex] = targetProduct
      nextProducts[targetIndex] = currentProduct

      return {
        ...current,
        products: nextProducts.map((product, index) => ({
          ...product,
          order: index + 1,
        })),
      }
    })
  }

  const orderedProducts = useMemo(
    () =>
      [...config.products].sort(
        (a, b) => a.order - b.order,
      ),
    [config.products],
  )

  const enabledProducts = useMemo(
    () => orderedProducts.filter((product) => product.enabled),
    [orderedProducts],
  )

  const previewMessages = useMemo<PreviewMessage[]>(() => {
    const messages: PreviewMessage[] = []

    if (config.welcomeMessage.trim()) {
      messages.push({
        id: 'welcome',
        type: 'outgoing',
        text: config.welcomeMessage,
      })
    }

    if (config.introductionMessage.trim()) {
      messages.push({
        id: 'introduction',
        type: 'outgoing',
        text: config.introductionMessage,
      })
    }

    if (config.nameQuestion.trim()) {
      messages.push({
        id: 'name-question',
        type: 'outgoing',
        text: config.nameQuestion,
      })
    }

    messages.push({
      id: 'name-answer',
      type: 'incoming',
      text: 'João',
    })

    if (config.emailQuestion.trim()) {
      messages.push({
        id: 'email-question',
        type: 'outgoing',
        text: config.emailQuestion,
      })
    }

    messages.push({
      id: 'email-answer',
      type: 'incoming',
      text: 'joao@email.com',
    })

    if (config.productQuestion.trim()) {
      messages.push({
        id: 'product-question',
        type: 'outgoing',
        text: config.productQuestion,
        buttons: enabledProducts.map((product) => ({
          id: product.id,
          label: product.name,
        })),
      })
    }

    if (enabledProducts.length > 0) {
      messages.push({
        id: 'product-answer',
        type: 'incoming',
        text: enabledProducts[0].name,
      })
    }

    if (config.completionMessage.trim()) {
      messages.push({
        id: 'completion',
        type: 'outgoing',
        text: config.completionMessage,
      })
    }

    return messages
  }, [
    config.welcomeMessage,
    config.introductionMessage,
    config.nameQuestion,
    config.emailQuestion,
    config.productQuestion,
    config.completionMessage,
    enabledProducts,
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Bot size={17} strokeWidth={1.8} />
                </div>

                <h1 className="text-lg font-semibold text-slate-900">
                  Pré-qualificação de novos contatos
                </h1>
              </div>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Configure como novos contatos serão recebidos antes
                do atendimento humano.
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
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-600">
                  Etapa 1
                </p>

                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Recepção
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Defina como o contato será recebido antes das
                  perguntas de qualificação.
                </p>
              </div>

              <div className="space-y-5">
                <MessageField
                  label="Mensagem de boas-vindas"
                  description="Primeira mensagem enviada ao iniciar a pré-qualificação."
                  value={config.welcomeMessage}
                  variables={variables}
                  onChange={(value) =>
                    updateMessage('welcomeMessage', value)
                  }
                />

                <MessageField
                  label="Mensagem de introdução"
                  description="Explique brevemente por que algumas informações serão solicitadas."
                  value={config.introductionMessage}
                  variables={variables}
                  onChange={(value) =>
                    updateMessage('introductionMessage', value)
                  }
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">
                  Etapa 2
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <UserRound
                    size={17}
                    className="text-slate-400"
                  />

                  <h2 className="text-base font-semibold text-slate-900">
                    Identificação
                  </h2>
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Colete somente as informações essenciais para
                  identificar o novo contato.
                </p>
              </div>

              <div className="space-y-5">
                <MessageField
                  label="Pergunta sobre o nome"
                  value={config.nameQuestion}
                  variables={variables}
                  onChange={(value) =>
                    updateMessage('nameQuestion', value)
                  }
                />

                <MessageField
                  label="Pergunta sobre o e-mail"
                  value={config.emailQuestion}
                  variables={variables}
                  onChange={(value) =>
                    updateMessage('emailQuestion', value)
                  }
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-600">
                  Etapa 3
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <PackageSearch
                    size={17}
                    className="text-slate-400"
                  />

                  <h2 className="text-base font-semibold text-slate-900">
                    Interesse comercial
                  </h2>
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Escolha quais produtos poderão ser apresentados
                  durante a pré-qualificação.
                </p>
              </div>

              <MessageField
                label="Pergunta sobre o produto"
                value={config.productQuestion}
                variables={variables}
                onChange={(value) =>
                  updateMessage('productQuestion', value)
                }
              />

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Produtos disponíveis
                    </p>

                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      Ative, desative e defina a ordem de
                      apresentação.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    {enabledProducts.length} ativos
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {orderedProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className={`
                        flex items-center gap-3 bg-white px-3.5 py-3
                        ${
                          index < orderedProducts.length - 1
                            ? 'border-b border-slate-100'
                            : ''
                        }
                      `}
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={product.enabled}
                        onClick={() => toggleProduct(product.id)}
                        className={`
                          relative h-5 w-9 shrink-0 rounded-full
                          transition-colors
                          ${
                            product.enabled
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
                              product.enabled
                                ? 'left-[18px]'
                                : 'left-0.5'
                            }
                          `}
                        />
                      </button>

                      <span
                        className={`
                          min-w-0 flex-1 truncate text-sm font-medium
                          ${
                            product.enabled
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }
                        `}
                      >
                        {product.name}
                      </span>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveProduct(product.id, 'up')
                          }
                          className="
                            flex h-7 w-7 items-center justify-center
                            rounded-md text-slate-400 transition-colors
                            hover:bg-slate-100 hover:text-slate-700
                            disabled:cursor-not-allowed
                            disabled:opacity-25
                          "
                          aria-label={`Mover ${product.name} para cima`}
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          disabled={
                            index === orderedProducts.length - 1
                          }
                          onClick={() =>
                            moveProduct(product.id, 'down')
                          }
                          className="
                            flex h-7 w-7 items-center justify-center
                            rounded-md text-slate-400 transition-colors
                            hover:bg-slate-100 hover:text-slate-700
                            disabled:cursor-not-allowed
                            disabled:opacity-25
                          "
                          aria-label={`Mover ${product.name} para baixo`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Futuramente esta lista será carregada a partir do
                  portfólio da corretora.
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  Etapa 4
                </p>

                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Conclusão
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Informe ao contato que a pré-qualificação foi
                  concluída e que o atendimento humano continuará.
                </p>
              </div>

              <MessageField
                label="Mensagem de conclusão"
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
                  A configuração será preservada, mas o fluxo não
                  será iniciado para novos contatos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}