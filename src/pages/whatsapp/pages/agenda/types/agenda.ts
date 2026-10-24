export type AgendaNatureza =
  | 'COMPROMISSO'
  | 'INFORMATIVO'

export type AgendaCategoria =
  | 'COMERCIAL'
  | 'RENOVACAO'
  | 'SINISTRO'
  | 'ASSISTENCIA'
  | 'ANIVERSARIO'
  | 'MARKETING'
  | 'TAREFA'
  | 'TREINAMENTO'
  | 'REUNIAO'
  | 'OUTRO'

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
  clienteIdLegado: string | null

  tipoOrigem: string
  origemId: string | null

  recorrente: boolean
  recorrenciaTipo: AgendaRecorrenciaTipo | null
  recorrenciaIntervalo: number | null
  recorrenciaFimEm: string | null
  eventoPaiId: string | null

  googleEventId: string | null

  metadata: Record<string, unknown>

  createdAt: string
  updatedAt: string
}