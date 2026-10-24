import { supabase } from '../../../lib/supabaseClient'

export type WhatsAppTaskPriority =
  | 'BAIXA'
  | 'NORMAL'
  | 'ALTA'
  | 'URGENTE'

export interface CriarTarefaWhatsAppPayload {
  corretoraId: string
  conversaId: string
  mensagemId: string
  titulo: string
  descricao?: string | null
  prioridade: WhatsAppTaskPriority
  responsavelId?: string | null
  vencimentoEm?: string | null
  criadoPorId: string
}

export async function criarTarefaWhatsApp(
  payload: CriarTarefaWhatsAppPayload
) {
  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_tarefas')
    .insert({
      corretora_id:
        payload.corretoraId,

      conversa_id:
        payload.conversaId,

      mensagem_id:
        payload.mensagemId,

      titulo:
        payload.titulo,

      descricao:
        payload.descricao || null,

      prioridade:
        payload.prioridade,

      status:
        'PENDENTE',

      responsavel_id:
        payload.responsavelId || null,

      vencimento_em:
        payload.vencimentoEm || null,

      criado_por:
        payload.criadoPorId,
    })
    .select('id')
    .single()

  if (error) {
    console.error(
      '❌ criarTarefaWhatsApp:',
      error
    )

    throw error
  }

  return data
}

export interface WhatsAppTask {
  id: string
  conversaId: string
  mensagemId: string | null
  titulo: string
  descricao: string | null
  status:
    | 'PENDENTE'
    | 'EM_ANDAMENTO'
    | 'CONCLUIDA'
    | 'CANCELADA'
  prioridade:
    | 'BAIXA'
    | 'NORMAL'
    | 'ALTA'
    | 'URGENTE'
  responsavelId: string | null
  vencimentoEm: string | null
  criadoEm: string
  atualizadoEm: string
}

export async function buscarTarefasWhatsApp(
  conversationId: string
): Promise<WhatsAppTask[]> {
  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_tarefas')
    .select(`
      id,
      conversa_id,
      mensagem_id,
      titulo,
      descricao,
      status,
      prioridade,
      responsavel_id,
      vencimento_em,
      criado_em,
      atualizado_em
    `)
    .eq(
      'conversa_id',
      conversationId
    )
    .neq(
      'status',
      'CANCELADA'
    )
    .order(
      'criado_em',
      {
        ascending: false,
      }
    )

  if (error) {
    console.error(
      '❌ buscarTarefasWhatsApp:',
      error
    )

    throw error
  }

  return (data || []).map(
    tarefa => ({
      id:
        tarefa.id,
      conversaId:
        tarefa.conversa_id,
      mensagemId:
        tarefa.mensagem_id,
      titulo:
        tarefa.titulo,
      descricao:
        tarefa.descricao,
      status:
        tarefa.status,
      prioridade:
        tarefa.prioridade,
      responsavelId:
        tarefa.responsavel_id,
      vencimentoEm:
        tarefa.vencimento_em,
      criadoEm:
        tarefa.criado_em,
      atualizadoEm:
        tarefa.atualizado_em,
    })
  )
}

export async function concluirTarefaWhatsApp(
  tarefaId: string
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('whatsapp_tarefas')
    .update({
      status:
        'CONCLUIDA',
      atualizado_em:
        new Date().toISOString(),
    })
    .eq(
      'id',
      tarefaId
    )

  if (error) {
    console.error(
      '❌ concluirTarefaWhatsApp:',
      error
    )

    throw error
  }
}