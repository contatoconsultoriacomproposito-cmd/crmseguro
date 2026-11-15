import { supabase } from '../../../../lib/supabaseClient'
import type { ConversaVinculavel, PessoaVinculavel, Tarefa, TarefaInput } from '../types/tarefas'

/** Evento local após uma escrita confirmada. Sincroniza outras instâncias de useTarefas
 * na mesma aba, inclusive o sino, sem depender do intervalo ou do Realtime. */
export const EVENTO_TAREFAS_ALTERADAS = 'segurocrm:tarefas-alteradas'

function notificarAlteracaoTarefa(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_TAREFAS_ALTERADAS))
}

const CAMPOS = 'id,corretora_id,conversa_id,mensagem_id,crm_pessoa_id,crm_empresa_id,titulo,descricao,status,prioridade,responsavel_id,vencimento_em,criado_por,criado_em,atualizado_em'

function tratarErro(erro: unknown): never {
  const mensagem = erro && typeof erro === 'object' && 'message' in erro
    ? String(erro.message)
    : 'Não foi possível concluir a operação.'
  throw new Error(mensagem)
}

function validarInput(input: TarefaInput): void {
  if (!input.titulo.trim()) throw new Error('Informe o título da tarefa.')
  if (input.titulo.trim().length > 240) throw new Error('O título deve ter até 240 caracteres.')
  const vinculos = [input.conversa_id, input.crm_pessoa_id, input.crm_empresa_id].filter(Boolean)
  if (vinculos.length > 1) throw new Error('Escolha somente um vínculo por tarefa.')
}

/** A RLS da tabela é a autorização final. Nunca usamos service_role no browser. */
/** Enriquece apenas a apresentação. Ausência de leitura em outra tabela não oculta tarefas. */
async function enriquecerVinculos(tarefas: Tarefa[]): Promise<Tarefa[]> {
  if (!tarefas.length) return tarefas
  const nomes = new Map<string, string>()
  const pessoaIds = [...new Set(tarefas.map(t => t.crm_pessoa_id).filter((id): id is string => !!id))]
  const empresaIds = [...new Set(tarefas.map(t => t.crm_empresa_id).filter((id): id is string => !!id))]
  const conversaIds = [...new Set(tarefas.map(t => t.conversa_id).filter((id): id is string => !!id))]
  const extrairNome = (dados: unknown, fallback: string) => {
    const d = dados && typeof dados === 'object' ? dados as Record<string, unknown> : {}
    return String(d.nome || d.nome_completo || d.razao_social || d.nome_fantasia || fallback)
  }
  if (pessoaIds.length) {
    const { data } = await supabase.from('crm_pessoas').select('id,dados').in('id', pessoaIds)
    for (const pessoa of data ?? []) nomes.set('P:' + pessoa.id, extrairNome(pessoa.dados, 'Pessoa vinculada'))
  }
  if (empresaIds.length) {
    const { data } = await supabase.from('crm_empresas').select('id,dados').in('id', empresaIds)
    for (const empresa of data ?? []) nomes.set('E:' + empresa.id, extrairNome(empresa.dados, 'Empresa vinculada'))
  }
  if (conversaIds.length) {
    const { data: conversas } = await supabase.from('whatsapp_conversas').select('id,contato_id').in('id', conversaIds)
    const contatosIds = [...new Set((conversas ?? []).map(c => c.contato_id).filter((id): id is string => !!id))]
    if (contatosIds.length) {
      const { data: contatos } = await supabase.from('whatsapp_contatos').select('*').in('id', contatosIds)
      const porContato = new Map<string, string>()
      for (const raw of contatos ?? []) {
        const c = raw as Record<string, unknown>
        porContato.set(String(c.id), String(c.nome || c.name || c.nome_contato || c.telefone || c.phone || c.numero || 'Contato WhatsApp'))
      }
      for (const conversa of conversas ?? []) nomes.set('W:' + conversa.id, porContato.get(conversa.contato_id) ?? 'Conversa WhatsApp')
    }
  }
  return tarefas.map(t => ({
    ...t,
    vinculo_nome: t.crm_pessoa_id ? nomes.get('P:' + t.crm_pessoa_id) ?? 'Pessoa vinculada'
      : t.crm_empresa_id ? nomes.get('E:' + t.crm_empresa_id) ?? 'Empresa vinculada'
      : t.conversa_id ? nomes.get('W:' + t.conversa_id) ?? 'Conversa WhatsApp'
      : null,
  }))
}

/** A RLS da tabela é a autorização final. Nunca usamos service_role no browser. */
export async function listarTarefas(corretoraId: string, responsavelId?: string | null): Promise<Tarefa[]> {
  const resultado: Tarefa[] = []
  const lote = 500
  for (let offset = 0; offset < 5000; offset += lote) {
    let consulta = supabase.from('whatsapp_tarefas').select(CAMPOS)
      .eq('corretora_id', corretoraId).neq('status', 'CANCELADA')
      .order('criado_em', { ascending: false }).range(offset, offset + lote - 1)
    if (responsavelId) consulta = consulta.eq('responsavel_id', responsavelId)
    const { data, error } = await consulta
    if (error) tratarErro(error)
    const pagina = (data ?? []) as unknown as Tarefa[]
    resultado.push(...pagina)
    if (pagina.length < lote) break
  }
  return enriquecerVinculos(resultado)
}

export async function listarTarefasConversa(conversaId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase.from('whatsapp_tarefas').select(CAMPOS)
    .eq('conversa_id', conversaId).neq('status', 'CANCELADA')
    .order('criado_em', { ascending: false })
  if (error) tratarErro(error)
  return enriquecerVinculos((data ?? []) as unknown as Tarefa[])
}

export async function criarTarefa(corretoraId: string, usuarioId: string, input: TarefaInput): Promise<Tarefa> {
  validarInput(input)
  const { data, error } = await supabase.from('whatsapp_tarefas').insert({
    corretora_id: corretoraId,
    criado_por: usuarioId,
    titulo: input.titulo.trim(),
    descricao: input.descricao?.trim() || null,
    prioridade: input.prioridade,
    status: 'PENDENTE',
    responsavel_id: input.responsavel_id,
    vencimento_em: input.vencimento_em,
    conversa_id: input.conversa_id || null,
    crm_pessoa_id: input.crm_pessoa_id || null,
    crm_empresa_id: input.crm_empresa_id || null,
    mensagem_id: null,
  }).select(CAMPOS).single()
  if (error) tratarErro(error)
  const gravada = data as unknown as Tarefa
  if (gravada.crm_pessoa_id !== (input.crm_pessoa_id || null) ||
      gravada.crm_empresa_id !== (input.crm_empresa_id || null) ||
      gravada.conversa_id !== (input.conversa_id || null)) {
    throw new Error('O banco não confirmou o vínculo. Verifique a tarefa antes de tentar novamente.')
  }
  notificarAlteracaoTarefa()
  return gravada
}

export async function editarTarefa(tarefaId: string, input: TarefaInput): Promise<void> {
  validarInput(input)
  const { data, error } = await supabase.from('whatsapp_tarefas').update({
    titulo: input.titulo.trim(), descricao: input.descricao?.trim() || null,
    prioridade: input.prioridade, responsavel_id: input.responsavel_id,
    vencimento_em: input.vencimento_em, conversa_id: input.conversa_id || null,
    crm_pessoa_id: input.crm_pessoa_id || null, crm_empresa_id: input.crm_empresa_id || null,
    atualizado_em: new Date().toISOString(),
  }).eq('id', tarefaId).select('id,crm_pessoa_id,crm_empresa_id,conversa_id')
  if (error) tratarErro(error)
  if (!data?.length) throw new Error('A tarefa não foi alterada. Verifique a permissão de edição.')
  const atual = data[0]
  if (atual.crm_pessoa_id !== (input.crm_pessoa_id || null) ||
      atual.crm_empresa_id !== (input.crm_empresa_id || null) ||
      atual.conversa_id !== (input.conversa_id || null)) {
    throw new Error('O banco não confirmou o vínculo da tarefa.')
  }
  notificarAlteracaoTarefa()
}

export async function alterarStatusTarefa(tarefaId: string, concluida: boolean): Promise<void> {
  const { data, error } = await supabase.from('whatsapp_tarefas').update({
    status: concluida ? 'CONCLUIDA' : 'PENDENTE',
    atualizado_em: new Date().toISOString(),
  }).eq('id', tarefaId).select('id')
  if (error) tratarErro(error)
  if (!data?.length) throw new Error('Não foi possível alterar o status. Verifique suas permissões.')
  notificarAlteracaoTarefa()
}

export async function reagendarTarefa(tarefaId: string, vencimentoEm: string | null): Promise<void> {
  const { data, error } = await supabase.from('whatsapp_tarefas').update({
    vencimento_em: vencimentoEm, atualizado_em: new Date().toISOString(),
  }).eq('id', tarefaId).select('id')
  if (error) tratarErro(error)
  if (!data?.length) throw new Error('Não foi possível reagendar. Verifique suas permissões.')
  notificarAlteracaoTarefa()
}

export async function excluirTarefa(tarefaId: string): Promise<void> {
  const { data, error } = await supabase.from('whatsapp_tarefas').delete()
    .eq('id', tarefaId).select('id')
  if (error) tratarErro(error)
  if (!data?.length) throw new Error('Não foi possível excluir. Verifique suas permissões.')
  notificarAlteracaoTarefa()
}

export async function buscarResponsaveis(corretoraId: string): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase.from('usuarios_perfis').select('id,nome')
    .eq('corretora_id', corretoraId).eq('ativo', true).order('nome').limit(200)
  if (error) tratarErro(error)
  return (data ?? []) as Array<{ id: string; nome: string }>
}

/** Busca breve por nome no JSON 'dados' do núcleo CRM; respeita a RLS de Clientes. */
export async function buscarVinculosCliente(termo: string): Promise<PessoaVinculavel[]> {
  const busca = termo.trim().replace(/[%,()]/g, '')
  if (busca.length < 3) return []
  const [pf, pj] = await Promise.all([
    supabase.from('crm_pessoas').select('id,dados').ilike('dados->>nome', `%${busca}%`).limit(15),
    supabase.from('crm_empresas').select('id,dados').ilike('dados->>razao_social', `%${busca}%`).limit(15),
  ])
  if (pf.error) tratarErro(pf.error)
  if (pj.error) tratarErro(pj.error)
  const pessoas = (pf.data ?? []).map(p => ({
    id: String(p.id), nome: String((p.dados as Record<string, unknown> | null)?.nome ?? 'Pessoa'), tipo: 'PESSOA' as const,
  }))
  const empresas = (pj.data ?? []).map(p => ({
    id: String(p.id), nome: String((p.dados as Record<string, unknown> | null)?.razao_social ?? 'Empresa'), tipo: 'EMPRESA' as const,
  }))
  return [...pessoas, ...empresas]
}

/** Busca conversas por nome/telefone do contato, nunca exige UUID manual.
 * Pesquisa somente os contatos visíveis pela RLS de WhatsApp.
 */
export async function buscarConversasPorContato(termo: string): Promise<ConversaVinculavel[]> {
  const texto = termo.trim().toLocaleLowerCase('pt-BR')
  const numeros = termo.replace(/\D/g, '')
  if (texto.length < 3) return []
  // Consulta limitada; em instalações grandes recomenda-se RPC paginada com busca no servidor.
  const { data: contatos, error } = await supabase.from('whatsapp_contatos').select('*').limit(500)
  if (error) tratarErro(error)
  const candidatos = (contatos ?? []).map(raw => {
    const c = raw as Record<string, unknown>
    const nome = String(c.nome || c.name || c.nome_contato || c.push_name || '')
    const telefone = String(c.telefone || c.phone || c.numero || c.numero_telefone || '')
    return { id: String(c.id), nome, telefone }
  }).filter(c => c.nome.toLocaleLowerCase('pt-BR').includes(texto) || (numeros.length >= 3 && c.telefone.replace(/\D/g, '').includes(numeros)))
  if (!candidatos.length) return []
  const ids = candidatos.slice(0, 40).map(c => c.id)
  const { data: conversas, error: erroConversas } = await supabase.from('whatsapp_conversas')
    .select('id,contato_id,ultima_mensagem_at').in('contato_id', ids)
    .order('ultima_mensagem_at', { ascending: false }).limit(100)
  if (erroConversas) tratarErro(erroConversas)
  const porContato = new Map(candidatos.map(c => [c.id, c]))
  return (conversas ?? []).map(c => {
    const contato = porContato.get(c.contato_id)
    return { id: c.id as string, nome: contato?.nome || contato?.telefone || 'Contato', telefone: contato?.telefone ?? '' }
  })
}
