export type EscopoTarefa = 'none' | 'own' | 'tenant'
export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
export type PrioridadeTarefa = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'
export type VinculoTarefa = 'LIVRE' | 'PESSOA' | 'EMPRESA' | 'CONVERSA'

export interface Tarefa {
  id: string
  corretora_id: string
  conversa_id: string | null
  mensagem_id: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  titulo: string
  descricao: string | null
  status: StatusTarefa
  prioridade: PrioridadeTarefa
  responsavel_id: string | null
  vencimento_em: string | null
  criado_por: string | null
  criado_em: string
  atualizado_em: string
  /** Resolvido na leitura para exibição; não é coluna do banco. */
  vinculo_nome?: string | null
}

export interface TarefaInput {
  titulo: string
  descricao?: string | null
  prioridade: PrioridadeTarefa
  responsavel_id: string | null
  vencimento_em: string | null
  conversa_id?: string | null
  crm_pessoa_id?: string | null
  crm_empresa_id?: string | null
}

export interface ConversaVinculavel {
  id: string
  nome: string
  telefone: string
}

export interface PessoaVinculavel {
  id: string
  nome: string
  tipo: 'PESSOA' | 'EMPRESA'
}

export interface ResumoTarefas {
  atrasadas: number
  hoje: number
  proximas: number
  semData: number
  concluidas: number
  pendentes: number
}

export function inicioDiaLocalISO(data = new Date()): string {
  const hoje = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  return hoje.toISOString()
}

export function proximoDiaLocalISO(data = new Date()): string {
  const amanha = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1)
  return amanha.toISOString()
}

export function resumoTarefas(tarefas: Tarefa[], agora = new Date()): ResumoTarefas {
  const inicio = new Date(inicioDiaLocalISO(agora)).getTime()
  const proximo = new Date(proximoDiaLocalISO(agora)).getTime()
  const resumo: ResumoTarefas = { atrasadas: 0, hoje: 0, proximas: 0, semData: 0, concluidas: 0, pendentes: 0 }
  for (const tarefa of tarefas) {
    if (tarefa.status === 'CANCELADA') continue
    if (tarefa.status === 'CONCLUIDA') { resumo.concluidas++; continue }
    resumo.pendentes++
    if (!tarefa.vencimento_em) { resumo.semData++; continue }
    const vencimento = new Date(tarefa.vencimento_em).getTime()
    if (vencimento < inicio) resumo.atrasadas++
    else if (vencimento < proximo) resumo.hoje++
    else resumo.proximas++
  }
  return resumo
}

export function categoriaTarefa(tarefa: Tarefa, agora = new Date()): 'atrasadas' | 'hoje' | 'proximas' | 'semData' | 'concluidas' {
  if (tarefa.status === 'CONCLUIDA') return 'concluidas'
  if (!tarefa.vencimento_em) return 'semData'
  const tempo = new Date(tarefa.vencimento_em).getTime()
  if (tempo < new Date(inicioDiaLocalISO(agora)).getTime()) return 'atrasadas'
  if (tempo < new Date(proximoDiaLocalISO(agora)).getTime()) return 'hoje'
  return 'proximas'
}
