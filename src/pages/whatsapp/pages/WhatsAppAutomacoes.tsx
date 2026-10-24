import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../../auth/AuthContext'
import {
  buscarConfiguracoesAutomacao,
  salvarPreQualificationConfig,
  salvarRoutingConfig,
} from '../automation/services/automationConfigService'
import {
  Bot,
  Info,
  Route,
  UserCheck,
  Workflow,
} from 'lucide-react'

import type {
  AutomationEditor,
  AutomationType,
  PreQualificationConfig,
  RoutingConfig,
} from '../automation/types/automationTypes'

import {
  automationMetricsMock,
  automationsMock,
  automationVariablesMock,
  preQualificationConfigMock,
  routingConfigMock,
} from '../automation/mocks/automationMocks'

import { AutomationMetricCard } from '../automation/components/AutomationMetricCard'
import { AutomationCard } from '../automation/components/AutomationCard'
import { PreQualificationEditor } from '../automation/editors/PreQualificationEditor'
import { RoutingEditor } from '../automation/editors/RoutingEditor'

export default function WhatsAppAutomacoes() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeEditor, setActiveEditor] =
    useState<AutomationEditor>(null)

  const [preQualificationConfig, setPreQualificationConfig] =
    useState<PreQualificationConfig>(() => ({
      ...preQualificationConfigMock,
      products: preQualificationConfigMock.products.map(
        (product) => ({
          ...product,
        }),
      ),
    }))

  const [routingConfig, setRoutingConfig] =
    useState<RoutingConfig>(() => ({
      ...routingConfigMock,
      options: routingConfigMock.options.map((option) => ({
        ...option,
      })),
    }))

  useEffect(() => {
  if (!userProfile) return

  let cancelled = false

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true)

      const configs = await buscarConfiguracoesAutomacao(userProfile)
      if (cancelled) return

      const preQualification = configs.find(item => item.tipo === 'pre_qualification')
      const routing = configs.find(item => item.tipo === 'routing')

      if (preQualification) {
        setPreQualificationConfig({
          ...preQualificationConfigMock,
          ...preQualification.configuracao,
          enabled: preQualification.ativo,
          products: Array.isArray(preQualification.configuracao.products)
            ? preQualification.configuracao.products
            : preQualificationConfigMock.products,
        } as PreQualificationConfig)
      }

      if (routing) {
        setRoutingConfig({
          ...routingConfigMock,
          ...routing.configuracao,
          enabled: routing.ativo,
          options: Array.isArray(routing.configuracao.options)
            ? routing.configuracao.options
            : routingConfigMock.options,
        } as RoutingConfig)
      }
    } catch (error) {
      console.error('Erro ao carregar automações:', error)
      toast.error('Não foi possível carregar as configurações de automação.')
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  void carregarConfiguracoes()

  return () => {
    cancelled = true
  }
}, [userProfile])

  const automations = useMemo(
    () =>
      automationsMock.map((automation) => {
        if (automation.type === 'pre_qualification') {
          return {
            ...automation,
            status: preQualificationConfig.enabled
              ? ('active' as const)
              : ('inactive' as const),
          }
        }

        if (automation.type === 'routing') {
          return {
            ...automation,
            status: routingConfig.enabled
              ? ('active' as const)
              : ('inactive' as const),
          }
        }

        return automation
      }),
    [
      preQualificationConfig.enabled,
      routingConfig.enabled,
    ],
  )

  const handleConfigure = (type: AutomationType) => {
    setActiveEditor(type)
  }

  const handleBack = () => {
    setActiveEditor(null)
  }

  const handleSavePreQualification = async (config: PreQualificationConfig) => {
    if (!userProfile) return

    try {
      await salvarPreQualificationConfig(userProfile, config)

      setPreQualificationConfig({
        ...config,
        products: config.products.map(product => ({ ...product })),
      })

      toast.success('Pré-qualificação salva com sucesso.')
    } catch (error) {
      console.error('Erro ao salvar pré-qualificação:', error)
      toast.error('Não foi possível salvar a pré-qualificação.')
      throw error
    }
  }

  const handleSaveRouting = async (config: RoutingConfig) => {
  if (!userProfile) return

  try {
    await salvarRoutingConfig(userProfile, config)

    setRoutingConfig({
      ...config,
      options: config.options.map(option => ({ ...option })),
    })

    toast.success('Triagem salva com sucesso.')
  } catch (error) {
    console.error('Erro ao salvar triagem:', error)
    toast.error('Não foi possível salvar a triagem.')
    throw error
  }
}

  if (loading) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-slate-50">
      <div className="text-sm text-slate-500">Carregando automações...</div>
    </div>
  )
}

  if (activeEditor === 'pre_qualification') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <PreQualificationEditor
          key={`pre-qualification-${String(
            preQualificationConfig.enabled,
          )}`}
          initialConfig={preQualificationConfig}
          variables={automationVariablesMock}
          onBack={handleBack}
          onSave={handleSavePreQualification}
        />
      </div>
    )
  }

  if (activeEditor === 'routing') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <RoutingEditor
          key={`routing-${String(routingConfig.enabled)}`}
          initialConfig={routingConfig}
          variables={automationVariablesMock}
          onBack={handleBack}
          onSave={handleSaveRouting}
        />
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-7">
        <header className="mb-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Workflow size={21} strokeWidth={1.8} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Automações
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Configure como seus clientes são recebidos e
                direcionados antes do atendimento humano.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Visão geral
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Acompanhamento das automações neste mês.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              <Info size={12} />
              Dados demonstrativos
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <AutomationMetricCard
              title="Atendimentos automatizados"
              value={
                automationMetricsMock.automatedAttendances
              }
              description="Atendimentos realizados este mês"
              icon={Bot}
            />

            <AutomationMetricCard
              title="Pré-qualificados"
              value={automationMetricsMock.preQualified}
              description="Novos contatos pré-qualificados este mês"
              icon={UserCheck}
            />

            <AutomationMetricCard
              title="Triagens"
              value={automationMetricsMock.routed}
              description="Atendimentos direcionados este mês"
              icon={Route}
            />
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Recepção e triagem
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Automatize apenas as etapas iniciais do atendimento e
              permita que sua equipe assuma a conversa quando
              necessário.
            </p>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            {automations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onConfigure={handleConfigure}
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Bot size={17} strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-800">
                Atendimento humano sempre disponível
              </p>

              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">
                As automações foram pensadas apenas para recepção,
                pré-qualificação e triagem. Quando um atendente
                assumir uma conversa, o atendimento automático
                poderá ser interrompido imediatamente.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}