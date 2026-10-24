import { supabase } from "../../../lib/supabaseClient"

export type QuickReplyScope = 'pessoal' | 'corretora'

export interface QuickReply {
  id: string
  corretora_id: string
  criado_por: string
  escopo: QuickReplyScope
  titulo: string
  texto: string
  atalho: string | null
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface QuickReplyUserProfile {
  id: string
  tipo_usuario: string
  corretora_id?: string | null
  nome?: string | null
}

export interface CreateQuickReplyInput {
  titulo: string
  texto: string
  atalho?: string | null
  escopo?: QuickReplyScope
  ordem?: number
  ativo?: boolean
}

export interface UpdateQuickReplyInput {
  titulo?: string
  texto?: string
  atalho?: string | null
  escopo?: QuickReplyScope
  ordem?: number
  ativo?: boolean
}

function getCorretoraId(userProfile: QuickReplyUserProfile): string {
  const corretoraId = userProfile.tipo_usuario === 'CORRETORA'
    ? userProfile.id
    : userProfile.corretora_id

  if (!corretoraId) {
    throw new Error('Não foi possível identificar a corretora do usuário.')
  }

  return corretoraId
}

function normalizeShortcut(value?: string | null): string | null {
  if (!value?.trim()) return null

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function validateContent(titulo: string, texto: string) {
  if (!titulo.trim()) {
    throw new Error('Informe um título para a resposta rápida.')
  }

  if (!texto.trim()) {
    throw new Error('Informe o texto da resposta rápida.')
  }
}

function normalizeError(error: any, fallback: string): Error {
  if (error?.code === '23505') {
    return new Error('Já existe uma resposta rápida utilizando este atalho.')
  }

  if (error?.code === '42501') {
    return new Error('Você não possui permissão para realizar esta operação.')
  }

  return new Error(error?.message || fallback)
}

export async function listQuickReplies(userProfile: QuickReplyUserProfile): Promise<QuickReply[]> {
  const corretoraId = getCorretoraId(userProfile)

  const { data, error } = await supabase
    .from('whatsapp_respostas_rapidas')
    .select('*')
    .eq('corretora_id', corretoraId)
    .eq('ativo', true)
    .order('escopo', { ascending: true })
    .order('ordem', { ascending: true })
    .order('titulo', { ascending: true })

  if (error) {
    console.error('Erro ao listar respostas rápidas:', error)
    throw normalizeError(error, 'Não foi possível carregar as respostas rápidas.')
  }

  return (data ?? []) as QuickReply[]
}

export async function listAllQuickReplies(userProfile: QuickReplyUserProfile): Promise<QuickReply[]> {
  const corretoraId = getCorretoraId(userProfile)

  const { data, error } = await supabase
    .from('whatsapp_respostas_rapidas')
    .select('*')
    .eq('corretora_id', corretoraId)
    .order('escopo', { ascending: true })
    .order('ordem', { ascending: true })
    .order('titulo', { ascending: true })

  if (error) {
    console.error('Erro ao listar todas as respostas rápidas:', error)
    throw normalizeError(error, 'Não foi possível carregar as respostas rápidas.')
  }

  return (data ?? []) as QuickReply[]
}

export async function createQuickReply(
  userProfile: QuickReplyUserProfile,
  input: CreateQuickReplyInput
): Promise<QuickReply> {
  const corretoraId = getCorretoraId(userProfile)
  const titulo = input.titulo.trim()
  const texto = input.texto.trim()
  const escopo = input.escopo ?? 'pessoal'

  validateContent(titulo, texto)

  if (escopo === 'corretora' && userProfile.tipo_usuario !== 'CORRETORA') {
    throw new Error('Somente a corretora pode criar respostas rápidas padrão para a equipe.')
  }

  const payload = {
    corretora_id: corretoraId,
    criado_por: userProfile.id,
    escopo,
    titulo,
    texto,
    atalho: normalizeShortcut(input.atalho),
    ordem: Math.max(0, input.ordem ?? 0),
    ativo: input.ativo ?? true,
  }

  const { data, error } = await supabase
    .from('whatsapp_respostas_rapidas')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar resposta rápida:', error)
    throw normalizeError(error, 'Não foi possível criar a resposta rápida.')
  }

  return data as QuickReply
}

export async function updateQuickReply(
  id: string,
  userProfile: QuickReplyUserProfile,
  input: UpdateQuickReplyInput
): Promise<QuickReply> {
  if (!id) {
    throw new Error('Resposta rápida não informada.')
  }

  getCorretoraId(userProfile)

  if (input.escopo === 'corretora' && userProfile.tipo_usuario !== 'CORRETORA') {
    throw new Error('Somente a corretora pode transformar uma resposta em padrão para a equipe.')
  }

  const payload: Record<string, unknown> = {}

  if (input.titulo !== undefined) {
    const titulo = input.titulo.trim()
    if (!titulo) throw new Error('Informe um título para a resposta rápida.')
    payload.titulo = titulo
  }

  if (input.texto !== undefined) {
    const texto = input.texto.trim()
    if (!texto) throw new Error('Informe o texto da resposta rápida.')
    payload.texto = texto
  }

  if (input.atalho !== undefined) payload.atalho = normalizeShortcut(input.atalho)
  if (input.escopo !== undefined) payload.escopo = input.escopo
  if (input.ordem !== undefined) payload.ordem = Math.max(0, input.ordem)
  if (input.ativo !== undefined) payload.ativo = input.ativo

  if (Object.keys(payload).length === 0) {
    throw new Error('Nenhuma alteração foi informada.')
  }

  const { data, error } = await supabase
    .from('whatsapp_respostas_rapidas')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao atualizar resposta rápida:', error)
    throw normalizeError(error, 'Não foi possível atualizar a resposta rápida.')
  }

  return data as QuickReply
}

export async function deleteQuickReply(
  id: string,
  userProfile: QuickReplyUserProfile
): Promise<void> {
  if (!id) {
    throw new Error('Resposta rápida não informada.')
  }

  getCorretoraId(userProfile)

  const { error } = await supabase
    .from('whatsapp_respostas_rapidas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir resposta rápida:', error)
    throw normalizeError(error, 'Não foi possível excluir a resposta rápida.')
  }
}

export async function setQuickReplyActive(
  id: string,
  ativo: boolean,
  userProfile: QuickReplyUserProfile
): Promise<QuickReply> {
  return updateQuickReply(id, userProfile, { ativo })
}

export function applyQuickReplyVariables(
  texto: string,
  variables: {
    nome?: string | null
    corretora?: string | null
    corretor?: string | null
  }
): string {
  const values: Record<string, string> = {
    nome: variables.nome?.trim() || '',
    corretora: variables.corretora?.trim() || '',
    corretor: variables.corretor?.trim() || '',
  }

  return texto.replace(/\{(nome|corretora|corretor)\}/gi, (_, key: string) => {
    return values[key.toLowerCase()] ?? ''
  })
}