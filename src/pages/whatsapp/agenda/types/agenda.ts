export type AgendaNatureza =
  | 'COMPROMISSO'
  | 'INFORMATIVO'

export type AgendaCategoria =
  | 'ANIVERSARIO'
  | 'ASSISTENCIA'
  | 'COMERCIAL'
  | 'OUTRO'
  | 'SINISTRO'

export type AgendaStatus =
  | 'PENDENTE'
  | 'CONCLUIDO'
  | 'CANCELADO'

export type AgendaPrioridade =
  | 'BAIXA'
  | 'NORMAL'
  | 'ALTA'
  | 'URGENTE'

export type AgendaRecorrenciaTipo =
  | 'DIARIA'
  | 'SEMANAL'
  | 'MENSAL'
  | 'ANUAL'

export type AgendaTipoOrigem =
  | 'MANUAL'
  | 'WHATSAPP'
  | 'SINISTRO'
  | 'SINISTRO_OCORRENCIA'
  | 'ASSISTENCIA'
  | 'ASSISTENCIA_OCORRENCIA'

export interface AgendaItem {
  id: string

  corretoraId: string
  responsavelId: string | null
  criadoPorId: string | null

  natureza: AgendaNatureza
  categoria: AgendaCategoria

  titulo: string
  descricao: string | null

  inicioEm: string
  fimEm: string | null

  diaInteiro: boolean
  timezone: string

  status: AgendaStatus
  prioridade: AgendaPrioridade

  concluidoEm: string | null
  canceladoEm: string | null

  crmPessoaId: string | null
  crmEmpresaId: string | null

  tipoOrigem: AgendaTipoOrigem
  origemId: string | null

  recorrente: boolean
  recorrenciaTipo: AgendaRecorrenciaTipo | null
  recorrenciaIntervalo: number | null
  recorrenciaFimEm: string | null
  eventoPaiId: string | null

  metadata: Record<string, unknown>

  createdAt: string
  updatedAt: string
}