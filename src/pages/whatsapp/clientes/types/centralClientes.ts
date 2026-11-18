export type ClienteCentralTipo = 'PF' | 'PJ'
export type ClienteClassificacao = 'NAO_QUALIFICADO' | 'LEAD'
export type ClienteTemperatura = 'FRIO' | 'MORNO' | 'QUENTE' | null
export type ClienteKanbanStage =
  | 'prospeccao'
  | 'negociacao'
  | 'fechamento'
  | 'pos_venda'
  | 'perdido'
  | 'assistencia'
  | 'sinistro'

export type VisualizacaoCentral = 'LISTA' | 'KANBAN'
export type OrdenacaoCentral =
  | 'RECENTES'
  | 'NOME_ASC'
  | 'NOME_DESC'
  | 'PROXIMO_COMPROMISSO'
  | 'SEM_COMPROMISSO'

export type FiltroCompromisso =
  | 'TODOS'
  | 'COM_COMPROMISSO'
  | 'SEM_COMPROMISSO'
  | 'ATRASADO'

export interface ClienteProdutoResumo {
  id: string
  nome: string
  status?: string | null
}

export interface ClienteCompromissoResumo {
  id: string
  titulo: string
  inicioEm: string
  categoria?: string | null
  prioridade?: string | null
}

export interface ClienteCentral {
  id: string
  tipo: ClienteCentralTipo
  corretoraId: string
  corretorId: string
  clienteIdLegado?: string | null
  nome: string
  nomeSecundario?: string | null
  documento?: string | null
  telefone?: string | null
  email?: string | null
  municipio?: string | null
  uf?: string | null
  classificacao: ClienteClassificacao
  temperatura: ClienteTemperatura
  etapaKanban: ClienteKanbanStage | null
  posicaoKanban: number | null
  responsavelNome: string
  produtos: ClienteProdutoResumo[]
  proximoCompromisso: ClienteCompromissoResumo | null
  compromissoAtrasado: boolean
  possuiWhatsApp: boolean
  whatsappContatoId?: string | null
  whatsappConversationId?: string | null
  dados: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CentralClientesFiltros {
  busca: string
  tipo: 'TODOS' | ClienteCentralTipo
  classificacao: 'TODOS' | ClienteClassificacao
  responsavelId: string
  compromisso: FiltroCompromisso
  ordenacao: OrdenacaoCentral
}

export interface CentralClientesResumo {
  total: number
  pessoas: number
  empresas: number
  leads: number
  semCompromisso: number
}

export interface CentralClientesPaginacao {
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
}

export interface CentralClientesResultado {
  clientes: ClienteCentral[]
  paginacao: CentralClientesPaginacao
}

export interface ResponsavelCentral {
  id: string
  nome: string
  tipoUsuario: string
}

export type Cliente360Tab =
  | 'cadastro'
  | 'agenda'
  | 'propostas'
  | 'contratos'
  | 'sinistros'
  | 'assistencias'
  | 'financeiro'
  | 'comissoes'
  | 'arquivos'

export interface Cliente360Contadores {
  agenda: number
  propostas: number
  contratos: number
  sinistros: number
  assistencias: number
  financeiro: number
  arquivos: number
}

export const KANBAN_STAGES: Array<{
  id: ClienteKanbanStage
  label: string
}> = [
  { id: 'prospeccao', label: 'Prospecção' },
  { id: 'negociacao', label: 'Negociação' },
  { id: 'fechamento', label: 'Fechamento' },
  { id: 'pos_venda', label: 'Pós-venda' },
  { id: 'perdido', label: 'Perdido' },
  { id: 'assistencia', label: 'Assistência' },
  { id: 'sinistro', label: 'Sinistro' },
]

export const FILTROS_INICIAIS: CentralClientesFiltros = {
  busca: '',
  tipo: 'TODOS',
  classificacao: 'TODOS',
  responsavelId: '',
  compromisso: 'TODOS',
  ordenacao: 'RECENTES',
}
