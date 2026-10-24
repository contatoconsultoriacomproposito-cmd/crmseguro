import { supabase } from '../../../lib/supabaseClient'
import type { WhatsAppConversation } from '../types/whatsapp'

export type WhatsAppCommitmentSituation = 'ATRASADO' | 'HOJE' | 'PROXIMO'

export interface WhatsAppAgendaCommitment {
  id: string
  conversationId: string
  contactId: string
  contactName: string
  contactPhone?: string
  titulo: string
  descricao: string | null
  inicioEm: string
  fimEm: string | null
  diaInteiro: boolean
  categoria: string
  prioridade: string
  responsavelId: string | null
  crmPessoaId: string | null
  crmEmpresaId: string | null
  clienteIdLegado: string | null
  tipoOrigem: string
  origemId: string | null
  situacao: WhatsAppCommitmentSituation
}

export interface WhatsAppAgendaData {
  atrasados: WhatsAppAgendaCommitment[]
  hoje: WhatsAppAgendaCommitment[]
  proximos: WhatsAppAgendaCommitment[]
  todos: WhatsAppAgendaCommitment[]
  proximoPorConversa: Record<string, WhatsAppAgendaCommitment>
}

interface CrmLink {
  crmPessoaId?: string
  crmEmpresaId?: string
  clienteIdLegado?: string
}

interface CrmPessoaLinkRow {
  id: string
  cliente_id_legado: string | null
  dados: unknown
  created_at: string
}

interface CrmEmpresaLinkRow {
  id: string
  cliente_id_legado: string | null
  dados: unknown
  created_at: string
}

interface AgendaRow {
  id: string
  responsavel_id: string | null
  categoria: string
  titulo: string
  descricao: string | null
  inicio_em: string
  fim_em: string | null
  dia_inteiro: boolean
  prioridade: string
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  cliente_id_legado: string | null
  tipo_origem: string
  origem_id: string | null
}

const CRM_LOOKUP_BATCH_SIZE = 10

const emptyAgendaData = (): WhatsAppAgendaData => ({
  atrasados: [],
  hoje: [],
  proximos: [],
  todos: [],
  proximoPorConversa: {},
})

const filtroWhatsApp = (contatoId: string) => ({
  campos_adicionais: {
    whatsapp: {
      contato_id: contatoId,
    },
  },
})

function getWhatsAppContactId(dados: unknown): string | null {
  if (!dados || typeof dados !== 'object') return null

  const camposAdicionais = (dados as Record<string, unknown>).campos_adicionais
  if (!camposAdicionais || typeof camposAdicionais !== 'object') return null

  const whatsapp = (camposAdicionais as Record<string, unknown>).whatsapp
  if (!whatsapp || typeof whatsapp !== 'object') return null

  const contatoId = (whatsapp as Record<string, unknown>).contato_id
  return typeof contatoId === 'string' && contatoId.trim() ? contatoId : null
}

function getSituation(inicioEm: string, inicioHoje: Date, inicioAmanha: Date): WhatsAppCommitmentSituation {
  const inicio = new Date(inicioEm)
  if (inicio < inicioHoje) return 'ATRASADO'
  if (inicio < inicioAmanha) return 'HOJE'
  return 'PROXIMO'
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

async function buscarPessoasPorContatos(corretoraId: string, contactIds: string[]): Promise<CrmPessoaLinkRow[]> {
  const results: CrmPessoaLinkRow[] = []

  for (const batch of chunk(contactIds, CRM_LOOKUP_BATCH_SIZE)) {
    const responses = await Promise.all(
      batch.map(contatoId =>
        supabase
          .from('crm_pessoas')
          .select('id, cliente_id_legado, dados, created_at')
          .eq('corretora_id', corretoraId)
          .contains('dados', filtroWhatsApp(contatoId))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )

    for (const response of responses) {
      if (response.error) throw response.error
      if (response.data) results.push(response.data as CrmPessoaLinkRow)
    }
  }

  return results
}

async function buscarEmpresasPorContatos(corretoraId: string, contactIds: string[]): Promise<CrmEmpresaLinkRow[]> {
  const results: CrmEmpresaLinkRow[] = []

  for (const batch of chunk(contactIds, CRM_LOOKUP_BATCH_SIZE)) {
    const responses = await Promise.all(
      batch.map(contatoId =>
        supabase
          .from('crm_empresas')
          .select('id, cliente_id_legado, dados, created_at')
          .eq('corretora_id', corretoraId)
          .contains('dados', filtroWhatsApp(contatoId))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )

    for (const response of responses) {
      if (response.error) throw response.error
      if (response.data) results.push(response.data as CrmEmpresaLinkRow)
    }
  }

  return results
}

export async function buscarAgendaWhatsApp(
  corretoraId: string,
  conversations: WhatsAppConversation[],
  responsavelId?: string | null
): Promise<WhatsAppAgendaData> {
  if (!corretoraId || conversations.length === 0) return emptyAgendaData()

  const conversationById = new Map<string, WhatsAppConversation>()
  const conversationByContactId = new Map<string, WhatsAppConversation>()

  for (const conversation of conversations) {
    conversationById.set(conversation.id, conversation)
    if (conversation.contact?.id) conversationByContactId.set(conversation.contact.id, conversation)
  }

  const contactIds = Array.from(conversationByContactId.keys())
  if (contactIds.length === 0) return emptyAgendaData()

  const [pessoas, empresas] = await Promise.all([
    buscarPessoasPorContatos(corretoraId, contactIds),
    buscarEmpresasPorContatos(corretoraId, contactIds),
  ])

  const crmByContactId = new Map<string, CrmLink>()
  const conversationByPessoaId = new Map<string, WhatsAppConversation>()
  const conversationByEmpresaId = new Map<string, WhatsAppConversation>()
  const conversationByLegadoId = new Map<string, WhatsAppConversation>()

  for (const pessoa of pessoas) {
    const contactId = getWhatsAppContactId(pessoa.dados)
    if (!contactId) continue

    const conversation = conversationByContactId.get(contactId)
    if (!conversation) continue

    const current = crmByContactId.get(contactId) || {}
    crmByContactId.set(contactId, {
      ...current,
      crmPessoaId: pessoa.id,
      clienteIdLegado: pessoa.cliente_id_legado || current.clienteIdLegado,
    })

    conversationByPessoaId.set(pessoa.id, conversation)
    if (pessoa.cliente_id_legado) conversationByLegadoId.set(pessoa.cliente_id_legado, conversation)
  }

  for (const empresa of empresas) {
    const contactId = getWhatsAppContactId(empresa.dados)
    if (!contactId) continue

    const conversation = conversationByContactId.get(contactId)
    if (!conversation) continue

    const current = crmByContactId.get(contactId) || {}
    crmByContactId.set(contactId, {
      ...current,
      crmEmpresaId: empresa.id,
      clienteIdLegado: empresa.cliente_id_legado || current.clienteIdLegado,
    })

    conversationByEmpresaId.set(empresa.id, conversation)
    if (empresa.cliente_id_legado) conversationByLegadoId.set(empresa.cliente_id_legado, conversation)
  }

  /*
   * Compatibilidade adicional com o cliente legado já exposto pelo contato,
   * caso o tipo WhatsAppConversation possua clienteId/clientId.
   */
  for (const conversation of conversations) {
    const contact = conversation.contact as typeof conversation.contact & {
      clienteId?: string | null
      clientId?: string | null
    }

    const legacyId = contact.clienteId || contact.clientId
    if (legacyId && !conversationByLegadoId.has(legacyId)) {
      conversationByLegadoId.set(legacyId, conversation)
    }
  }

  /*
   * A agenda é a fonte de verdade.
   * Carregamos apenas COMPROMISSOS PENDENTES da corretora.
   *
   * Não limitamos por data aqui porque o modo compacto precisa mostrar:
   * ATRASADOS + HOJE + PRÓXIMOS.
   */
  let agendaQuery = supabase
    .from('crm_agenda')
    .select(`
      id,
      responsavel_id,
      categoria,
      titulo,
      descricao,
      inicio_em,
      fim_em,
      dia_inteiro,
      prioridade,
      crm_pessoa_id,
      crm_empresa_id,
      cliente_id_legado,
      tipo_origem,
      origem_id
    `)
    .eq('corretora_id', corretoraId)
    .eq('status', 'PENDENTE')
    .eq('natureza', 'COMPROMISSO')
    .order('inicio_em', { ascending: true })

  if (responsavelId) agendaQuery = agendaQuery.eq('responsavel_id', responsavelId)

  const { data: agendaData, error: agendaError } = await agendaQuery
  if (agendaError) throw agendaError

  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)

  const inicioAmanha = new Date(inicioHoje)
  inicioAmanha.setDate(inicioAmanha.getDate() + 1)

  const commitments: WhatsAppAgendaCommitment[] = []
  const commitmentIds = new Set<string>()

  for (const row of (agendaData ?? []) as AgendaRow[]) {
    let conversation: WhatsAppConversation | undefined

    /*
     * 1. Vínculo direto.
     * Compromisso originado naquela conversa do WhatsApp.
     */
    if (row.tipo_origem === 'WHATSAPP' && row.origem_id) {
      conversation = conversationById.get(row.origem_id)
    }

    /*
     * 2. CRM novo - Pessoa.
     * Permite que compromissos criados diretamente na Agenda também
     * apareçam na conversa correspondente.
     */
    if (!conversation && row.crm_pessoa_id) {
      conversation = conversationByPessoaId.get(row.crm_pessoa_id)
    }

    /*
     * 3. CRM novo - Empresa.
     */
    if (!conversation && row.crm_empresa_id) {
      conversation = conversationByEmpresaId.get(row.crm_empresa_id)
    }

    /*
     * 4. Compatibilidade com o CRM legado.
     */
    if (!conversation && row.cliente_id_legado) {
      conversation = conversationByLegadoId.get(row.cliente_id_legado)
    }

    if (!conversation || commitmentIds.has(row.id)) continue
    commitmentIds.add(row.id)

    commitments.push({
      id: row.id,
      conversationId: conversation.id,
      contactId: conversation.contact.id,
      contactName: conversation.contact.name,
      contactPhone: conversation.contact.phone || undefined,
      titulo: row.titulo,
      descricao: row.descricao,
      inicioEm: row.inicio_em,
      fimEm: row.fim_em,
      diaInteiro: row.dia_inteiro,
      categoria: row.categoria,
      prioridade: row.prioridade,
      responsavelId: row.responsavel_id,
      crmPessoaId: row.crm_pessoa_id,
      crmEmpresaId: row.crm_empresa_id,
      clienteIdLegado: row.cliente_id_legado,
      tipoOrigem: row.tipo_origem,
      origemId: row.origem_id,
      situacao: getSituation(row.inicio_em, inicioHoje, inicioAmanha),
    })
  }

  commitments.sort((a, b) => new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime())

  const atrasados: WhatsAppAgendaCommitment[] = []
  const hoje: WhatsAppAgendaCommitment[] = []
  const proximos: WhatsAppAgendaCommitment[] = []

  for (const commitment of commitments) {
    if (commitment.situacao === 'ATRASADO') atrasados.push(commitment)
    else if (commitment.situacao === 'HOJE') hoje.push(commitment)
    else proximos.push(commitment)
  }

  /*
   * Badge da conversa:
   *
   * 1º atraso mais antigo;
   * senão 1º compromisso de hoje;
   * senão próximo compromisso futuro.
   */
  const proximoPorConversa: Record<string, WhatsAppAgendaCommitment> = {}

  for (const commitment of [...atrasados, ...hoje, ...proximos]) {
    if (!proximoPorConversa[commitment.conversationId]) {
      proximoPorConversa[commitment.conversationId] = commitment
    }
  }

  return {
    atrasados,
    hoje,
    proximos,
    todos: [...atrasados, ...hoje, ...proximos],
    proximoPorConversa,
  }
}

export function subscribeAgendaWhatsApp(
  corretoraId: string,
  onChange: () => void
) {
  if (!corretoraId) return () => {}

  const channel = supabase
    .channel(`whatsapp-agenda-${corretoraId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'crm_agenda',
        filter: `corretora_id=eq.${corretoraId}`,
      },
      () => {
        onChange()
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}