export type AutomationType =
  | 'pre_qualification'
  | 'routing'

export type AutomationStatus =
  | 'active'
  | 'inactive'

export type AutomationEditor =
  | 'pre_qualification'
  | 'routing'
  | null

export interface AutomationMetrics {
  automatedAttendances: number
  preQualified: number
  routed: number
}

export interface AutomationSummary {
  id: string
  type: AutomationType
  title: string
  description: string
  status: AutomationStatus
}

export interface PreQualificationProduct {
  id: string
  name: string
  enabled: boolean
  order: number
}

export interface PreQualificationConfig {
  enabled: boolean

  welcomeMessage: string

  introductionMessage: string

  nameQuestion: string

  emailQuestion: string

  productQuestion: string

  products: PreQualificationProduct[]

  completionMessage: string
}

export interface RoutingOption {
  id: string
  label: string
  enabled: boolean
  order: number
}

export interface RoutingConfig {
  enabled: boolean

  initialMessage: string

  options: RoutingOption[]

  completionMessage: string
}

export interface AutomationVariable {
  key: string
  label: string
  example: string
}

export type PreviewMessageType =
  | 'incoming'
  | 'outgoing'

export interface PreviewButton {
  id: string
  label: string
}

export interface PreviewMessage {
  id: string
  type: PreviewMessageType
  text: string
  buttons?: PreviewButton[]
}