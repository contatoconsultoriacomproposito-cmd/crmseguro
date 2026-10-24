import { supabase } from '../../../../../lib/supabaseClient'
import type {
  AgendaCategoria,
  AgendaItem,
  AgendaNatureza,
  AgendaPrioridade,
  AgendaRecorrenciaTipo,
  AgendaStatus,
} from '../types/agenda'

type AgendaRow = {
  id: string
  corretora_id: string
  responsavel_id: string | null
  criado_por_id: string | null
  natureza: AgendaNatureza
  categoria: AgendaCategoria
  titulo: string
  descricao: string | null
  inicio_em: string
  fim_em: string | null
  dia_inteiro: boolean
  timezone: string
  status: AgendaStatus
  prioridade: AgendaPrioridade
  concluido_em: string | null
  cancelado_em: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  cliente_id_legado: string | null
  tipo_origem: string
  origem_id: string | null
  recorrente: boolean
  recorrencia_tipo: AgendaRecorrenciaTipo | null
  recorrencia_intervalo: number | null
  recorrencia_fim_em: string | null
  evento_pai_id: string | null
  google_event_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface BuscarCompromissosFiltros {
  corretoraId: string
  inicio: string
  fim: string
  responsavelId?: string | null
  categorias?: AgendaCategoria[]
  naturezas?: AgendaNatureza[]
  status?: AgendaStatus[]
  prioridades?: AgendaPrioridade[]
  crmPessoaId?: string
  crmEmpresaId?: string
  clienteIdLegado?: string
  tipoOrigem?: string
}

export interface CriarCompromissoPayload {
  corretoraId: string
  responsavelId?: string | null
  criadoPorId?: string | null
  natureza?: AgendaNatureza
  categoria: AgendaCategoria
  titulo: string
  descricao?: string | null
  inicioEm: string
  fimEm?: string | null
  diaInteiro?: boolean
  timezone?: string
  status?: AgendaStatus
  prioridade?: AgendaPrioridade
  crmPessoaId?: string | null
  crmEmpresaId?: string | null
  clienteIdLegado?: string | null
  tipoOrigem?: string
  origemId?: string | null
  recorrente?: boolean
  recorrenciaTipo?: AgendaRecorrenciaTipo | null
  recorrenciaIntervalo?: number | null
  recorrenciaFimEm?: string | null
  eventoPaiId?: string | null
  googleEventId?: string | null
  metadata?: Record<string, unknown>
}

export interface AtualizarCompromissoPayload {
  responsavelId?: string | null
  natureza?: AgendaNatureza
  categoria?: AgendaCategoria
  titulo?: string
  descricao?: string | null
  inicioEm?: string
  fimEm?: string | null
  diaInteiro?: boolean
  timezone?: string
  status?: AgendaStatus
  prioridade?: AgendaPrioridade
  crmPessoaId?: string | null
  crmEmpresaId?: string | null
  clienteIdLegado?: string | null
  tipoOrigem?: string
  origemId?: string | null
  recorrente?: boolean
  recorrenciaTipo?: AgendaRecorrenciaTipo | null
  recorrenciaIntervalo?: number | null
  recorrenciaFimEm?: string | null
  eventoPaiId?: string | null
  googleEventId?: string | null
  metadata?: Record<string, unknown>
}

export interface ReagendarCompromissoPayload {
  inicioEm: string
  fimEm?: string | null
  diaInteiro?: boolean
}

export interface BuscarResumoAgendaFiltros {
  corretoraId: string
  responsavelId?: string | null
}

export interface ResumoAgenda {
  hoje: number
  atrasados: number
  proximos: number
  pendentes: number
}

export type AgendaFilaOperacionalTipo =
  | 'HOJE'
  | 'ATRASADOS'
  | 'PROXIMOS'
  | 'PENDENTES'

export interface BuscarFilaOperacionalFiltros {
  corretoraId: string
  responsavelId?: string | null
  tipo: AgendaFilaOperacionalTipo
}

function mapAgendaRow(row: AgendaRow): AgendaItem {
  return {
    id: row.id,
    corretoraId: row.corretora_id,
    responsavelId: row.responsavel_id,
    criadoPorId: row.criado_por_id,
    natureza: row.natureza,
    categoria: row.categoria,
    titulo: row.titulo,
    descricao: row.descricao,
    inicioEm: row.inicio_em,
    fimEm: row.fim_em,
    diaInteiro: row.dia_inteiro,
    timezone: row.timezone,
    status: row.status,
    prioridade: row.prioridade,
    concluidoEm: row.concluido_em,
    canceladoEm: row.cancelado_em,
    crmPessoaId: row.crm_pessoa_id,
    crmEmpresaId: row.crm_empresa_id,
    clienteIdLegado: row.cliente_id_legado,
    tipoOrigem: row.tipo_origem,
    origemId: row.origem_id,
    recorrente: row.recorrente,
    recorrenciaTipo: row.recorrencia_tipo,
    recorrenciaIntervalo: row.recorrencia_intervalo,
    recorrenciaFimEm: row.recorrencia_fim_em,
    eventoPaiId: row.evento_pai_id,
    googleEventId: row.google_event_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildInsertPayload(
  payload: CriarCompromissoPayload
) {
  return {
    corretora_id: payload.corretoraId,
    responsavel_id:
      payload.responsavelId ?? null,
    criado_por_id:
      payload.criadoPorId ?? null,
    natureza:
      payload.natureza ?? 'COMPROMISSO',
    categoria: payload.categoria,
    titulo: payload.titulo.trim(),
    descricao:
      payload.descricao?.trim() || null,
    inicio_em: payload.inicioEm,
    fim_em:
      payload.fimEm ?? null,
    dia_inteiro:
      payload.diaInteiro ?? false,
    timezone:
      payload.timezone ??
      'America/Sao_Paulo',
    status:
      payload.status ?? 'PENDENTE',
    prioridade:
      payload.prioridade ?? 'NORMAL',
    crm_pessoa_id:
      payload.crmPessoaId ?? null,
    crm_empresa_id:
      payload.crmEmpresaId ?? null,
    cliente_id_legado:
      payload.clienteIdLegado ?? null,
    tipo_origem:
      payload.tipoOrigem ?? 'MANUAL',
    origem_id:
      payload.origemId ?? null,
    recorrente:
      payload.recorrente ?? false,
    recorrencia_tipo:
      payload.recorrente
        ? payload.recorrenciaTipo ?? null
        : null,
    recorrencia_intervalo:
      payload.recorrente
        ? payload.recorrenciaIntervalo ?? null
        : null,
    recorrencia_fim_em:
      payload.recorrente
        ? payload.recorrenciaFimEm ?? null
        : null,
    evento_pai_id:
      payload.eventoPaiId ?? null,
    google_event_id:
      payload.googleEventId ?? null,
    metadata:
      payload.metadata ?? {},
  }
}

function buildUpdatePayload(
  payload: AtualizarCompromissoPayload
) {
  const update: Record<string, unknown> = {}
  if (payload.responsavelId !== undefined) {
    update.responsavel_id =
      payload.responsavelId
  }
  if (payload.natureza !== undefined) {
    update.natureza = payload.natureza
  }
  if (payload.categoria !== undefined) {
    update.categoria = payload.categoria
  }
  if (payload.titulo !== undefined) {
    update.titulo = payload.titulo.trim()
  }
  if (payload.descricao !== undefined) {
    update.descricao =
      payload.descricao?.trim() || null
  }
  if (payload.inicioEm !== undefined) {
    update.inicio_em = payload.inicioEm
  }
  if (payload.fimEm !== undefined) {
    update.fim_em = payload.fimEm
  }
  if (payload.diaInteiro !== undefined) {
    update.dia_inteiro = payload.diaInteiro
  }
  if (payload.timezone !== undefined) {
    update.timezone = payload.timezone
  }
  if (payload.status !== undefined) {
    update.status = payload.status
    if (payload.status === 'PENDENTE') {
      update.concluido_em = null
      update.cancelado_em = null
    }
    if (payload.status === 'CONCLUIDO') {
      update.concluido_em =
        new Date().toISOString()
      update.cancelado_em = null
    }
    if (payload.status === 'CANCELADO') {
      update.cancelado_em =
        new Date().toISOString()
      update.concluido_em = null
    }
  }
  if (payload.prioridade !== undefined) {
    update.prioridade = payload.prioridade
  }
  if (payload.crmPessoaId !== undefined) {
    update.crm_pessoa_id =
      payload.crmPessoaId
  }
  if (payload.crmEmpresaId !== undefined) {
    update.crm_empresa_id =
      payload.crmEmpresaId
  }
  if (payload.clienteIdLegado !== undefined) {
    update.cliente_id_legado =
      payload.clienteIdLegado
  }
  if (payload.tipoOrigem !== undefined) {
    update.tipo_origem =
      payload.tipoOrigem
  }
  if (payload.origemId !== undefined) {
    update.origem_id =
      payload.origemId
  }
  if (payload.recorrente !== undefined) {
    update.recorrente =
      payload.recorrente
    if (!payload.recorrente) {
      update.recorrencia_tipo = null
      update.recorrencia_intervalo = null
      update.recorrencia_fim_em = null
    }
  }
  if (payload.recorrenciaTipo !== undefined) {
    update.recorrencia_tipo =
      payload.recorrenciaTipo
  }
  if (
    payload.recorrenciaIntervalo !== undefined
  ) {
    update.recorrencia_intervalo =
      payload.recorrenciaIntervalo
  }
  if (
    payload.recorrenciaFimEm !== undefined
  ) {
    update.recorrencia_fim_em =
      payload.recorrenciaFimEm
  }
  if (payload.eventoPaiId !== undefined) {
    update.evento_pai_id =
      payload.eventoPaiId
  }
  if (payload.googleEventId !== undefined) {
    update.google_event_id =
      payload.googleEventId
  }
  if (payload.metadata !== undefined) {
    update.metadata = payload.metadata
  }
  return update
}

export async function buscarCompromissos(
  filtros: BuscarCompromissosFiltros
): Promise<AgendaItem[]> {
  let query = supabase
    .from('crm_agenda')
    .select('*')
    .eq('corretora_id', filtros.corretoraId)
    .lt('inicio_em', filtros.fim)
    .or(
      `and(fim_em.is.null,inicio_em.gte.${filtros.inicio}),fim_em.gte.${filtros.inicio}`
    )
    .order('inicio_em', {
      ascending: true,
    })
  if (filtros.responsavelId) {
    query = query.eq(
      'responsavel_id',
      filtros.responsavelId
    )
  }
  if (
    filtros.categorias &&
    filtros.categorias.length > 0
  ) {
    query = query.in(
      'categoria',
      filtros.categorias
    )
  }
  if (
    filtros.naturezas &&
    filtros.naturezas.length > 0
  ) {
    query = query.in(
      'natureza',
      filtros.naturezas
    )
  }
  if (
    filtros.status &&
    filtros.status.length > 0
  ) {
    query = query.in(
      'status',
      filtros.status
    )
  }
  if (
    filtros.prioridades &&
    filtros.prioridades.length > 0
  ) {
    query = query.in(
      'prioridade',
      filtros.prioridades
    )
  }
  if (filtros.crmPessoaId) {
    query = query.eq(
      'crm_pessoa_id',
      filtros.crmPessoaId
    )
  }
  if (filtros.crmEmpresaId) {
    query = query.eq(
      'crm_empresa_id',
      filtros.crmEmpresaId
    )
  }
  if (filtros.clienteIdLegado) {
    query = query.eq(
      'cliente_id_legado',
      filtros.clienteIdLegado
    )
  }
  if (filtros.tipoOrigem) {
    query = query.eq(
      'tipo_origem',
      filtros.tipoOrigem
    )
  }
  const { data, error } = await query
  if (error) {
    console.error(
      'Erro ao buscar compromissos:',
      error
    )
    throw error
  }
  return ((data ?? []) as AgendaRow[]).map(
    mapAgendaRow
  )
}

export async function buscarResumoAgenda(
  filtros: BuscarResumoAgendaFiltros
): Promise<ResumoAgenda> {
  const agora = new Date()
  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    0,
    0,
    0,
    0
  )
  const inicioAmanha = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1,
    0,
    0,
    0,
    0
  )
  const inicioHojeIso =
    inicioHoje.toISOString()
  const inicioAmanhaIso =
    inicioAmanha.toISOString()
  const aplicarEscopo = (
    query: any
  ) => {
    let scopedQuery = query
      .eq(
        'corretora_id',
        filtros.corretoraId
      )
      .eq(
        'status',
        'PENDENTE'
      )
      .eq(
        'natureza',
        'COMPROMISSO'
      )
    if (filtros.responsavelId) {
      scopedQuery =
        scopedQuery.eq(
          'responsavel_id',
          filtros.responsavelId
        )
    }
    return scopedQuery
  }
  const [
    hojeResult,
    atrasadosResult,
    proximosResult,
    pendentesResult,
  ] = await Promise.all([
    aplicarEscopo(
      supabase
        .from('crm_agenda')
        .select('id', {
          count: 'exact',
          head: true,
        })
    )
      .gte(
        'inicio_em',
        inicioHojeIso
      )
      .lt(
        'inicio_em',
        inicioAmanhaIso
      ),
    aplicarEscopo(
      supabase
        .from('crm_agenda')
        .select('id', {
          count: 'exact',
          head: true,
        })
    ).lt(
      'inicio_em',
      inicioHojeIso
    ),
    aplicarEscopo(
      supabase
        .from('crm_agenda')
        .select('id', {
          count: 'exact',
          head: true,
        })
    ).gte(
      'inicio_em',
      inicioAmanhaIso
    ),
    aplicarEscopo(
      supabase
        .from('crm_agenda')
        .select('id', {
          count: 'exact',
          head: true,
        })
    ),
  ])
  const erro =
    hojeResult.error ??
    atrasadosResult.error ??
    proximosResult.error ??
    pendentesResult.error
  if (erro) {
    console.error(
      'Erro ao buscar resumo da agenda:',
      erro
    )
    throw erro
  }
  return {
    hoje:
      hojeResult.count ?? 0,
    atrasados:
      atrasadosResult.count ?? 0,
    proximos:
      proximosResult.count ?? 0,
    pendentes:
      pendentesResult.count ?? 0,
  }
}

export async function buscarFilaOperacional(
  filtros: BuscarFilaOperacionalFiltros
): Promise<AgendaItem[]> {
  const agora = new Date()
  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    0,
    0,
    0,
    0
  )
  const inicioAmanha = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1,
    0,
    0,
    0,
    0
  )
  const inicioHojeIso =
    inicioHoje.toISOString()
  const inicioAmanhaIso =
    inicioAmanha.toISOString()
  let query = supabase
    .from('crm_agenda')
    .select('*')
    .eq(
      'corretora_id',
      filtros.corretoraId
    )
    .eq(
      'status',
      'PENDENTE'
    )
    .eq(
      'natureza',
      'COMPROMISSO'
    )
  if (filtros.responsavelId) {
    query = query.eq(
      'responsavel_id',
      filtros.responsavelId
    )
  }
  if (filtros.tipo === 'HOJE') {
    query = query
      .gte(
        'inicio_em',
        inicioHojeIso
      )
      .lt(
        'inicio_em',
        inicioAmanhaIso
      )
  }
  if (filtros.tipo === 'ATRASADOS') {
    query = query.lt(
      'inicio_em',
      inicioHojeIso
    )
  }
  if (filtros.tipo === 'PROXIMOS') {
    query = query.gte(
      'inicio_em',
      inicioAmanhaIso
    )
  }
  query = query.order(
    'inicio_em',
    {
      ascending: true,
    }
  )
  const { data, error } = await query
  if (error) {
    console.error(
      'Erro ao buscar fila operacional da agenda:',
      error
    )
    throw error
  }
  return ((data ?? []) as AgendaRow[]).map(
    mapAgendaRow
  )
}

export async function buscarCompromissoPorId(
  id: string
): Promise<AgendaItem | null> {
  const { data, error } = await supabase
    .from('crm_agenda')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error(
      'Erro ao buscar compromisso:',
      error
    )
    throw error
  }
  if (!data) {
    return null
  }
  return mapAgendaRow(data as AgendaRow)
}

export async function criarCompromisso(
  payload: CriarCompromissoPayload
): Promise<AgendaItem> {
  if (!payload.titulo.trim()) {
    throw new Error(
      'O título do compromisso é obrigatório.'
    )
  }
  const insertPayload =
    buildInsertPayload(payload)
  const { data, error } = await supabase
    .from('crm_agenda')
    .insert(insertPayload)
    .select('*')
    .single()
  if (error) {
    console.error(
      'Erro ao criar compromisso:',
      error
    )
    throw error
  }
  return mapAgendaRow(data as AgendaRow)
}

export async function criarCompromissos(
  payloads: CriarCompromissoPayload[]
): Promise<AgendaItem[]> {
  if (payloads.length === 0) {
    return []
  }
  payloads.forEach((payload, index) => {
    if (!payload.titulo.trim()) {
      throw new Error(
        `O título do compromisso ${
          index + 1
        } é obrigatório.`
      )
    }
  })
  const inserts = payloads.map(
    buildInsertPayload
  )
  const { data, error } = await supabase
    .from('crm_agenda')
    .insert(inserts)
    .select('*')
  if (error) {
    console.error(
      'Erro ao criar compromissos:',
      error
    )
    throw error
  }
  return ((data ?? []) as AgendaRow[]).map(
    mapAgendaRow
  )
}

export async function atualizarCompromisso(
  id: string,
  payload: AtualizarCompromissoPayload
): Promise<AgendaItem> {
  if (
    payload.titulo !== undefined &&
    !payload.titulo.trim()
  ) {
    throw new Error(
      'O título do compromisso é obrigatório.'
    )
  }
  const updatePayload =
    buildUpdatePayload(payload)
  if (
    Object.keys(updatePayload).length === 0
  ) {
    const compromisso =
      await buscarCompromissoPorId(id)
    if (!compromisso) {
      throw new Error(
        'Compromisso não encontrado.'
      )
    }
    return compromisso
  }
  const { data, error } = await supabase
    .from('crm_agenda')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error(
      'Erro ao atualizar compromisso:',
      error
    )
    throw error
  }
  return mapAgendaRow(data as AgendaRow)
}

export async function reagendarCompromisso(
  id: string,
  payload: ReagendarCompromissoPayload
): Promise<AgendaItem> {
  const updatePayload: Record<
    string,
    unknown
  > = {
    inicio_em: payload.inicioEm,
  }
  if (payload.fimEm !== undefined) {
    updatePayload.fim_em =
      payload.fimEm
  }
  if (payload.diaInteiro !== undefined) {
    updatePayload.dia_inteiro =
      payload.diaInteiro
  }
  const { data, error } = await supabase
    .from('crm_agenda')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error(
      'Erro ao reagendar compromisso:',
      error
    )
    throw error
  }
  return mapAgendaRow(data as AgendaRow)
}

export async function concluirCompromisso(
  id: string
): Promise<AgendaItem> {
  const agora = new Date().toISOString()
  const { data, error } = await supabase
    .from('crm_agenda')
    .update({
      status: 'CONCLUIDO',
      concluido_em: agora,
      cancelado_em: null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error(
      'Erro ao concluir compromisso:',
      error
    )
    throw error
  }
  return mapAgendaRow(data as AgendaRow)
}

export async function cancelarCompromisso(
  id: string
): Promise<AgendaItem> {
  const agora = new Date().toISOString()
  const { data, error } = await supabase
    .from('crm_agenda')
    .update({
      status: 'CANCELADO',
      cancelado_em: agora,
      concluido_em: null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error(
      'Erro ao cancelar compromisso:',
      error
    )
    throw error
  }
  return mapAgendaRow(data as AgendaRow)
}
