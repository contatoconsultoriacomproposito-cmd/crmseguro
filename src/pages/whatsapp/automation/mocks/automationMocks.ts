import type {
  AutomationMetrics,
  AutomationSummary,
  AutomationVariable,
  PreQualificationConfig,
  RoutingConfig,
} from '../types/automationTypes'

// ======================================================
// MÉTRICAS MOCKADAS
// Futuramente serão calculadas a partir dos atendimentos
// reais registrados no CRM.
// ======================================================

export const automationMetricsMock: AutomationMetrics = {
  automatedAttendances: 42,
  preQualified: 31,
  routed: 11,
}

// ======================================================
// AUTOMAÇÕES DISPONÍVEIS
// ======================================================

export const automationsMock: AutomationSummary[] = [
  {
    id: 'pre-qualification',
    type: 'pre_qualification',
    title: 'Pré-qualificação de novos contatos',
    description:
      'Recepciona novos contatos e coleta informações antes do atendimento humano.',
    status: 'active',
  },
  {
    id: 'routing',
    type: 'routing',
    title: 'Triagem de atendimento',
    description:
      'Identifica o motivo do contato e direciona clientes que já tiveram atendimento.',
    status: 'active',
  },
]

// ======================================================
// VARIÁVEIS DISPONÍVEIS
// ======================================================

export const automationVariablesMock: AutomationVariable[] = [
  {
    key: '{nome}',
    label: 'Nome do cliente',
    example: 'João',
  },
  {
    key: '{corretora}',
    label: 'Nome da corretora',
    example: 'SeguroCRM Corretora',
  },
  {
    key: '{corretor}',
    label: 'Nome do corretor',
    example: 'Bruce',
  },
]

// ======================================================
// PRÉ-QUALIFICAÇÃO
// ======================================================

export const preQualificationConfigMock: PreQualificationConfig = {
  enabled: true,

  welcomeMessage:
    'Olá! 👋 Seja muito bem-vindo(a) à {corretora}.',

  introductionMessage:
    'Antes de iniciarmos, gostaria de fazer algumas perguntas rápidas para direcionar melhor o seu atendimento.',

  nameQuestion:
    'Como você gostaria de ser chamado(a)?',

  emailQuestion:
    'Perfeito, {nome}! Qual é o seu melhor e-mail?',

  productQuestion:
    'Para qual tipo de seguro você gostaria de atendimento?',

  products: [
    {
      id: 'auto',
      name: 'Seguro Auto',
      enabled: true,
      order: 1,
    },
    {
      id: 'residencial',
      name: 'Seguro Residencial',
      enabled: true,
      order: 2,
    },
    {
      id: 'empresarial',
      name: 'Seguro Empresarial',
      enabled: true,
      order: 3,
    },
    {
      id: 'saude',
      name: 'Plano de Saúde',
      enabled: true,
      order: 4,
    },
    {
      id: 'vida',
      name: 'Seguro de Vida',
      enabled: true,
      order: 5,
    },
    {
      id: 'equipamentos',
      name: 'Seguro Equipamentos',
      enabled: true,
      order: 6,
    },
    {
      id: 'outros',
      name: 'Outros',
      enabled: true,
      order: 7,
    },
  ],

  completionMessage:
    'Muito obrigado pelas informações, {nome}! 😊 Em breve você será atendido por um de nossos consultores.',
}

// ======================================================
// TRIAGEM DE ATENDIMENTO
// ======================================================

export const routingConfigMock: RoutingConfig = {
  enabled: true,

  initialMessage:
    'Olá, {nome}! 👋 Como podemos ajudá-lo hoje?',

  options: [
    {
      id: 'comercial',
      label: 'Comercial',
      enabled: true,
      order: 1,
    },
    {
      id: 'assistencia',
      label: 'Assistência',
      enabled: true,
      order: 2,
    },
    {
      id: 'sinistro',
      label: 'Sinistro',
      enabled: true,
      order: 3,
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      enabled: true,
      order: 4,
    },
    {
      id: 'outros',
      label: 'Outros',
      enabled: true,
      order: 5,
    },
  ],

  completionMessage:
    'Obrigado, {nome}! Aguarde um momento que um de nossos consultores irá atendê-lo.',
}