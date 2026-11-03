import { supabase } from '../../../lib/supabaseClient'
import type { WhatsAppConversation } from '../types/whatsapp'

export type WhatsAppCommitmentSituation =
  | 'ATRASADO'
  | 'HOJE'
  | 'PROXIMO'

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
  tipoOrigem: string
  origemId: string | null
  situacao: WhatsAppCommitmentSituation
}

export interface WhatsAppAgendaData {
  atrasados: WhatsAppAgendaCommitment[]
  hoje: WhatsAppAgendaCommitment[]
  proximos: WhatsAppAgendaCommitment[]
  todos: WhatsAppAgendaCommitment[]
  proximoPorConversa: Record<
    string,
    WhatsAppAgendaCommitment
  >
}

interface CrmPessoaLinkRow {
  id: string
  dados: unknown
  created_at: string
}

interface CrmEmpresaLinkRow {
  id: string
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
  tipo_origem: string
  origem_id: string | null
}

const CRM_LOOKUP_BATCH_SIZE = 10

const emptyAgendaData =
  (): WhatsAppAgendaData => ({
    atrasados: [],
    hoje: [],
    proximos: [],
    todos: [],
    proximoPorConversa: {},
  })

const filtroWhatsApp = (
  contatoId: string
) => ({
  campos_adicionais: {
    whatsapp: {
      contato_id: contatoId,
    },
  },
})

function getWhatsAppContactId(
  dados: unknown
): string | null {
  if (
    !dados ||
    typeof dados !== 'object'
  ) {
    return null
  }

  const camposAdicionais =
    (
      dados as Record<
        string,
        unknown
      >
    ).campos_adicionais

  if (
    !camposAdicionais ||
    typeof camposAdicionais !==
      'object'
  ) {
    return null
  }

  const whatsapp =
    (
      camposAdicionais as Record<
        string,
        unknown
      >
    ).whatsapp

  if (
    !whatsapp ||
    typeof whatsapp !== 'object'
  ) {
    return null
  }

  const contatoId =
    (
      whatsapp as Record<
        string,
        unknown
      >
    ).contato_id

  return (
    typeof contatoId === 'string' &&
    contatoId.trim()
      ? contatoId
      : null
  )
}

function getSituation(
  inicioEm: string,
  inicioHoje: Date,
  inicioAmanha: Date
): WhatsAppCommitmentSituation {
  const inicio =
    new Date(inicioEm)

  if (inicio < inicioHoje) {
    return 'ATRASADO'
  }

  if (inicio < inicioAmanha) {
    return 'HOJE'
  }

  return 'PROXIMO'
}

function chunk<T>(
  items: T[],
  size: number
): T[][] {
  const chunks: T[][] = []

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(
        index,
        index + size
      )
    )
  }

  return chunks
}

async function buscarPessoasPorContatos(
  corretoraId: string,
  contactIds: string[]
): Promise<CrmPessoaLinkRow[]> {
  const results:
    CrmPessoaLinkRow[] = []

  for (
    const batch of chunk(
      contactIds,
      CRM_LOOKUP_BATCH_SIZE
    )
  ) {
    const responses =
      await Promise.all(
        batch.map(contatoId =>
          supabase
            .from('crm_pessoas')
            .select(
              'id, dados, created_at'
            )
            .eq(
              'corretora_id',
              corretoraId
            )
            .contains(
              'dados',
              filtroWhatsApp(
                contatoId
              )
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle()
        )
      )

    for (
      const response of responses
    ) {
      if (response.error) {
        throw response.error
      }

      if (response.data) {
        results.push(
          response.data as
            CrmPessoaLinkRow
        )
      }
    }
  }

  return results
}

async function buscarEmpresasPorContatos(
  corretoraId: string,
  contactIds: string[]
): Promise<CrmEmpresaLinkRow[]> {
  const results:
    CrmEmpresaLinkRow[] = []

  for (
    const batch of chunk(
      contactIds,
      CRM_LOOKUP_BATCH_SIZE
    )
  ) {
    const responses =
      await Promise.all(
        batch.map(contatoId =>
          supabase
            .from('crm_empresas')
            .select(
              'id, dados, created_at'
            )
            .eq(
              'corretora_id',
              corretoraId
            )
            .contains(
              'dados',
              filtroWhatsApp(
                contatoId
              )
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle()
        )
      )

    for (
      const response of responses
    ) {
      if (response.error) {
        throw response.error
      }

      if (response.data) {
        results.push(
          response.data as
            CrmEmpresaLinkRow
        )
      }
    }
  }

  return results
}

export async function buscarAgendaWhatsApp(
  corretoraId: string,
  conversations:
    WhatsAppConversation[],
  responsavelId?:
    | string
    | null
): Promise<WhatsAppAgendaData> {
  if (
    !corretoraId ||
    conversations.length === 0
  ) {
    return emptyAgendaData()
  }

  /*
   * Índices de conversas.
   *
   * 1. conversationById:
   *    vínculo direto quando o compromisso
   *    nasceu da conversa do WhatsApp.
   *
   * 2. conversationByContactId:
   *    utilizado para resolver o contato
   *    para Pessoa/Empresa do CRM.
   */
  const conversationById =
    new Map<
      string,
      WhatsAppConversation
    >()

  const conversationByContactId =
    new Map<
      string,
      WhatsAppConversation
    >()

  for (
    const conversation of
      conversations
  ) {
    conversationById.set(
      conversation.id,
      conversation
    )

    if (conversation.contact?.id) {
      conversationByContactId.set(
        conversation.contact.id,
        conversation
      )
    }
  }

  const contactIds =
    Array.from(
      conversationByContactId.keys()
    )

  if (
    contactIds.length === 0
  ) {
    return emptyAgendaData()
  }

  /*
   * Descobre quais Pessoas/Empresas
   * do novo CRM estão vinculadas aos
   * contatos presentes no WhatsApp.
   */
  const [
    pessoas,
    empresas,
  ] = await Promise.all([
    buscarPessoasPorContatos(
      corretoraId,
      contactIds
    ),

    buscarEmpresasPorContatos(
      corretoraId,
      contactIds
    ),
  ])

  const conversationByPessoaId =
    new Map<
      string,
      WhatsAppConversation
    >()

  const conversationByEmpresaId =
    new Map<
      string,
      WhatsAppConversation
    >()

  /*
   * Pessoa CRM -> conversa.
   */
  for (
    const pessoa of pessoas
  ) {
    const contactId =
      getWhatsAppContactId(
        pessoa.dados
      )

    if (!contactId) {
      continue
    }

    const conversation =
      conversationByContactId.get(
        contactId
      )

    if (!conversation) {
      continue
    }

    conversationByPessoaId.set(
      pessoa.id,
      conversation
    )
  }

  /*
   * Empresa CRM -> conversa.
   */
  for (
    const empresa of empresas
  ) {
    const contactId =
      getWhatsAppContactId(
        empresa.dados
      )

    if (!contactId) {
      continue
    }

    const conversation =
      conversationByContactId.get(
        contactId
      )

    if (!conversation) {
      continue
    }

    conversationByEmpresaId.set(
      empresa.id,
      conversation
    )
  }

  /*
   * crm_agenda é a fonte de verdade.
   *
   * Carregamos somente:
   *
   * - compromissos;
   * - pendentes;
   * - pertencentes à corretora;
   * - opcionalmente de um responsável.
   *
   * Não limitamos por data porque a
   * visualização compacta do WhatsApp
   * precisa montar:
   *
   * ATRASADOS + HOJE + PRÓXIMOS.
   */
  let agendaQuery =
    supabase
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
        tipo_origem,
        origem_id
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .eq(
        'status',
        'PENDENTE'
      )
      .eq(
        'natureza',
        'COMPROMISSO'
      )
      .order(
        'inicio_em',
        {
          ascending: true,
        }
      )

  if (responsavelId) {
    agendaQuery =
      agendaQuery.eq(
        'responsavel_id',
        responsavelId
      )
  }

  const {
    data: agendaData,
    error: agendaError,
  } = await agendaQuery

  if (agendaError) {
    throw agendaError
  }

  const inicioHoje =
    new Date()

  inicioHoje.setHours(
    0,
    0,
    0,
    0
  )

  const inicioAmanha =
    new Date(inicioHoje)

  inicioAmanha.setDate(
    inicioAmanha.getDate() + 1
  )

  const commitments:
    WhatsAppAgendaCommitment[] = []

  const commitmentIds =
    new Set<string>()

  const agendaRows =
  (agendaData ?? []) as AgendaRow[]

  for (const row of agendaRows) {
    let conversation:
      | WhatsAppConversation
      | undefined

    /*
     * 1. Origem direta WhatsApp.
     *
     * O compromisso foi criado a partir
     * daquela conversa específica.
     */
    if (
      row.tipo_origem ===
        'WHATSAPP' &&
      row.origem_id
    ) {
      conversation =
        conversationById.get(
          row.origem_id
        )
    }

    /*
     * 2. Pessoa do novo CRM.
     *
     * Permite exibir na conversa um
     * compromisso criado diretamente
     * pela Agenda ou ficha do cliente.
     */
    if (
      !conversation &&
      row.crm_pessoa_id
    ) {
      conversation =
        conversationByPessoaId.get(
          row.crm_pessoa_id
        )
    }

    /*
     * 3. Empresa do novo CRM.
     */
    if (
      !conversation &&
      row.crm_empresa_id
    ) {
      conversation =
        conversationByEmpresaId.get(
          row.crm_empresa_id
        )
    }

    /*
     * Se o compromisso não puder ser
     * relacionado a uma conversa atual,
     * ele não pertence à visualização
     * compacta do WhatsApp.
     */
    if (
      !conversation ||
      commitmentIds.has(
        row.id
      )
    ) {
      continue
    }

    commitmentIds.add(row.id)

    commitments.push({
      id: row.id,

      conversationId:
        conversation.id,

      contactId:
        conversation.contact.id,

      contactName:
        conversation.contact.name,

      contactPhone:
        conversation.contact.phone ||
        undefined,

      titulo:
        row.titulo,

      descricao:
        row.descricao,

      inicioEm:
        row.inicio_em,

      fimEm:
        row.fim_em,

      diaInteiro:
        row.dia_inteiro,

      categoria:
        row.categoria,

      prioridade:
        row.prioridade,

      responsavelId:
        row.responsavel_id,

      crmPessoaId:
        row.crm_pessoa_id,

      crmEmpresaId:
        row.crm_empresa_id,

      tipoOrigem:
        row.tipo_origem,

      origemId:
        row.origem_id,

      situacao:
        getSituation(
          row.inicio_em,
          inicioHoje,
          inicioAmanha
        ),
    })
  }

  commitments.sort(
    (
      a,
      b
    ) =>
      new Date(
        a.inicioEm
      ).getTime() -
      new Date(
        b.inicioEm
      ).getTime()
  )

  const atrasados:
    WhatsAppAgendaCommitment[] = []

  const hoje:
    WhatsAppAgendaCommitment[] = []

  const proximos:
    WhatsAppAgendaCommitment[] = []

  for (
    const commitment of
      commitments
  ) {
    if (
      commitment.situacao ===
      'ATRASADO'
    ) {
      atrasados.push(
        commitment
      )

      continue
    }

    if (
      commitment.situacao ===
      'HOJE'
    ) {
      hoje.push(
        commitment
      )

      continue
    }

    proximos.push(
      commitment
    )
  }

  /*
   * Badge mostrado ao lado da conversa:
   *
   * 1. atraso mais antigo;
   * 2. compromisso de hoje;
   * 3. próximo compromisso futuro.
   */
  const proximoPorConversa:
    Record<
      string,
      WhatsAppAgendaCommitment
    > = {}

  for (
    const commitment of [
      ...atrasados,
      ...hoje,
      ...proximos,
    ]
  ) {
    if (
      !proximoPorConversa[
        commitment.conversationId
      ]
    ) {
      proximoPorConversa[
        commitment.conversationId
      ] = commitment
    }
  }

  return {
    atrasados,
    hoje,
    proximos,

    todos: [
      ...atrasados,
      ...hoje,
      ...proximos,
    ],

    proximoPorConversa,
  }
}

export function subscribeAgendaWhatsApp(
  corretoraId: string,
  onChange: () => void
) {
  if (!corretoraId) {
    return () => {}
  }

  const channel =
    supabase
      .channel(
        `whatsapp-agenda-${corretoraId}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table:
            'crm_agenda',
          filter:
            `corretora_id=eq.${corretoraId}`,
        },
        () => {
          onChange()
        }
      )
      .subscribe()

  return () => {
    void supabase.removeChannel(
      channel
    )
  }
}