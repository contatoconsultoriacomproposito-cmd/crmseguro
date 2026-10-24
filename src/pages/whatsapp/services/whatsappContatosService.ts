import { supabase } from "../../../lib/supabaseClient"
import {
  getBrazilPhoneVariants,
  normalizeWhatsAppPhone,
} from '../utils/whatsappPhone'

export interface WhatsAppContato {
  id: string
  corretora_id: string
  cliente_id: string | null
  nome: string | null
  telefone: string
  whatsapp_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  excluido_em: string | null
  excluido_por_id: string | null
}

export interface FiltrosWhatsAppContatos {
  busca?: string
  pagina?: number
  porPagina?: number
  situacao?: 'ativos' | 'excluidos'
}

export interface ResultadoWhatsAppContatos {
  contatos: WhatsAppContato[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
}

function somenteNumeros(value: string): string {
  return value.replace(/\D/g, '')
}

function escaparBusca(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .trim()
}

export async function listarWhatsAppContatos(
  corretoraId: string,
  filtros: FiltrosWhatsAppContatos = {}
): Promise<ResultadoWhatsAppContatos> {
  if (!corretoraId) {
    throw new Error('Corretora não informada.')
  }

  const pagina = Math.max(
    1,
    filtros.pagina ?? 1
  )

  const porPagina = Math.min(
    100,
    Math.max(
      1,
      filtros.porPagina ?? 20
    )
  )

  const inicio =
    (pagina - 1) * porPagina

  const fim =
    inicio + porPagina - 1

  let query = supabase
    .from('whatsapp_contatos')
    .select(
    `
      id,
      corretora_id,
      cliente_id,
      nome,
      telefone,
      whatsapp_id,
      avatar_url,
      excluido_em,
      excluido_por_id,
      created_at,
      updated_at
    `,
    {
      count: 'exact',
    }
  )
  .eq(
    'corretora_id',
    corretoraId
  )

  const situacao =
    filtros.situacao ?? 'ativos'

  if (situacao === 'excluidos') {
    query = query.not(
      'excluido_em',
      'is',
      null
    )
  } else {
    query = query.is(
      'excluido_em',
      null
    )
  }

  const busca =
    filtros.busca?.trim()

  if (busca) {
    const texto =
      escaparBusca(busca)

    const telefone =
      somenteNumeros(busca)

    if (
      telefone &&
      telefone.length >= 3
    ) {
      query = query.or(
        `nome.ilike.%${texto}%,telefone.ilike.%${telefone}%`
      )
    } else {
      query = query.ilike(
        'nome',
        `%${texto}%`
      )
    }
  }

  const {
    data,
    error,
    count,
  } = await query
    .order('nome', {
      ascending: true,
      nullsFirst: false,
    })
    .order('telefone', {
      ascending: true,
    })
    .range(inicio, fim)

  if (error) {
    throw new Error(
      `Não foi possível carregar os contatos do WhatsApp: ${error.message}`
    )
  }

  const contatos =
    (data ?? []) as WhatsAppContato[]

  const total =
    count ?? 0

  return {
    contatos,
    total,
    pagina,
    porPagina,
    totalPaginas:
      Math.ceil(
        total / porPagina
      ),
  }
}

export async function buscarWhatsAppContatoPorId(
  corretoraId: string,
  contatoId: string
): Promise<WhatsAppContato | null> {
  if (!corretoraId) {
    throw new Error(
      'Corretora não informada.'
    )
  }

  if (!contatoId) {
    throw new Error(
      'Contato não informado.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_contatos')
    .select(`
      id,
      corretora_id,
      cliente_id,
      nome,
      telefone,
      whatsapp_id,
      avatar_url,
      excluido_em,
      excluido_por_id,
      created_at,
      updated_at
    `)
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'id',
      contatoId
    )
    .maybeSingle()

  if (error) {
    throw new Error(
      `Não foi possível carregar o contato: ${error.message}`
    )
  }

  return data
    ? (data as WhatsAppContato)
    : null
}

export interface DApiContatoDiagnostico {
  jid?: string
  name?: string
  phone?: string
  [key: string]: unknown
}

export interface DApiContatosDiagnostico {
  total: number
  whatsapp: number
  lid: number
  outros: number
  semJid: number
  exemplosWhatsapp:
    DApiContatoDiagnostico[]
  exemplosLid:
    DApiContatoDiagnostico[]
  exemplosOutros:
    DApiContatoDiagnostico[]
}

export interface DApiContatosDiagnosticoResultado {
  success: boolean
  action?: string
  instancia?: {
    id: string
    nome: string | null
    telefone: string | null
    provider: string
    status: string | null
  }
  elapsedMs?: number
  diagnostico?:
    DApiContatosDiagnostico
  provider?: unknown
  error?: string
}

export interface ResultadoSincronizacaoDapi {
  recebidos: number
  sincronizaveis: number
  novos: number
  atualizados: number
  jaExistentes: number
  mescladosPorIdentidade: number
  vinculadosInstancia: number
  ignoradosExcluidos: number
  ignoradosLid: number
  ignoradosOutros: number
}

export interface SincronizarContatosDapiResultado {
  success: boolean
  action?: string
  instancia?: {
    id: string
    nome: string | null
    telefone?: string | null
    provider?: string
    status?: string | null
  }
  elapsedMs?: number
  diagnostico?: DApiContatosDiagnostico
  sincronizacao?: ResultadoSincronizacaoDapi
  error?: string
}

export interface WhatsAppInstanciaResumo {
  id: string
  nome: string
  telefone: string | null
  provider: string
  provider_instance_id: string | null
  status: string
  ativo: boolean
  padrao_envio: boolean
}

export async function listarInstanciasDapiAtivas(
  corretoraId: string
): Promise<WhatsAppInstanciaResumo[]> {
  if (!corretoraId) {
    throw new Error(
      'Corretora não informada.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_instancias')
    .select(`
      id,
      nome,
      telefone,
      provider,
      provider_instance_id,
      status,
      ativo,
      padrao_envio
    `)
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'provider',
      'dapi'
    )
    .eq(
      'ativo',
      true
    )
    .order(
      'padrao_envio',
      {
        ascending: false,
      }
    )
    .order(
      'nome',
      {
        ascending: true,
      }
    )

  if (error) {
    throw new Error(
      `Não foi possível carregar as conexões WhatsApp: ${error.message}`
    )
  }

  return (
    data ?? []
  ) as WhatsAppInstanciaResumo[]
}

export async function listarContatosDapiDiagnostico(
  instanciaId: string
): Promise<DApiContatosDiagnosticoResultado> {
  if (!instanciaId) {
    throw new Error(
      'Instância WhatsApp não informada.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'dapi-contacts',
      {
        body: {
          action: 'list',
          instanciaId,
        },
      }
    )

  if (error) {
    throw new Error(
      error.message ||
        'Não foi possível consultar os contatos da D-API.'
    )
  }

  const response =
    data as
      | DApiContatosDiagnosticoResultado
      | null

  if (!response) {
    throw new Error(
      'A D-API não retornou uma resposta válida.'
    )
  }

  if (
    response.success === false
  ) {
    throw new Error(
      response.error ||
        'Não foi possível consultar os contatos da D-API.'
    )
  }

  return response
}

export async function sincronizarContatosDapi(
  instanciaId: string
): Promise<SincronizarContatosDapiResultado> {
  if (!instanciaId) {
    throw new Error(
      'Instância WhatsApp não informada.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'dapi-contacts',
      {
        body: {
          action: 'sync',
          instanciaId,
        },
      }
    )

  if (error) {
  console.error(
    'Erro bruto da Edge dapi-contacts:',
    error
  )

  let mensagem =
    error.message ||
    'Não foi possível sincronizar os contatos.'

  const context =
    (
      error as {
        context?: Response
      }
    ).context

  if (context) {
    try {
      const payload =
        await context
          .clone()
          .json()

      console.error(
        'Resposta da Edge dapi-contacts:',
        payload
      )

      mensagem =
        payload?.detalhes ||
        payload?.error ||
        mensagem
    } catch {
      try {
        const texto =
          await context
            .clone()
            .text()

        console.error(
          'Resposta textual da Edge dapi-contacts:',
          texto
        )

        if (texto) {
          mensagem =
            texto
        }
      } catch {
        // Mantém a mensagem original.
      }
    }
  }

  throw new Error(
    mensagem
  )
}

  const response =
    data as
      | SincronizarContatosDapiResultado
      | null

  if (!response) {
    throw new Error(
      'A sincronização não retornou uma resposta válida.'
    )
  }

  if (
    response.success === false
  ) {
    throw new Error(
      response.error ||
        'Não foi possível sincronizar os contatos.'
    )
  }

  if (!response.sincronizacao) {
    throw new Error(
      'A sincronização não retornou o resumo esperado.'
    )
  }

  return response
}

export interface SalvarWhatsAppContatoData {
  nome: string
  telefone: string
}

async function verificarTelefoneEmUso(
  corretoraId: string,
  telefone: string,
  ignorarContatoId?: string
) {
  const normalizado =
    normalizeWhatsAppPhone(
      telefone
    )

  const variantes =
    getBrazilPhoneVariants(
      normalizado
    )

  let query = supabase
    .from('whatsapp_contatos')
    .select('id, nome, telefone')
    .eq(
      'corretora_id',
      corretoraId
    )
    .in(
      'telefone',
      variantes
    )

  if (ignorarContatoId) {
    query = query.neq(
      'id',
      ignorarContatoId
    )
  }

  const {
    data,
    error,
  } = await query.limit(1)

  if (error) {
    throw new Error(
      `Não foi possível validar o telefone: ${error.message}`
    )
  }

  return {
    normalizado,
    existente:
      data?.[0] ?? null,
  }
}

export async function criarWhatsAppContato(
  corretoraId: string,
  dados: SalvarWhatsAppContatoData
): Promise<WhatsAppContato> {
  const nome =
    dados.nome.trim()

  if (!nome) {
    throw new Error(
      'Informe o nome do contato.'
    )
  }

  const {
    normalizado,
    existente,
  } =
    await verificarTelefoneEmUso(
      corretoraId,
      dados.telefone
    )

  if (existente) {
    throw new Error(
      `Este WhatsApp já está cadastrado${
        existente.nome
          ? ` para ${existente.nome}`
          : ''
      }.`
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_contatos')
    .insert({
      corretora_id:
        corretoraId,
      nome,
      telefone:
        normalizado,
    })
    .select(`
      id,
      corretora_id,
      cliente_id,
      nome,
      telefone,
      whatsapp_id,
      avatar_url,
      excluido_em,
      excluido_por_id,
      created_at,
      updated_at
    `)
    .single()

  if (error || !data) {
    throw new Error(
      error?.message ||
        'Não foi possível criar o contato.'
    )
  }

  return data as WhatsAppContato
}

export async function atualizarWhatsAppContato(
  corretoraId: string,
  contato: WhatsAppContato,
  dados: SalvarWhatsAppContatoData
): Promise<WhatsAppContato> {
  const nome =
    dados.nome.trim()

  if (!nome) {
    throw new Error(
      'Informe o nome do contato.'
    )
  }

  if (contato.excluido_em) {
    throw new Error(
      'Um contato excluído precisa ser restaurado antes de ser editado.'
    )
  }

  const telefoneAtual =
    normalizeWhatsAppPhone(
      contato.telefone
    )

  const telefoneNovo =
    normalizeWhatsAppPhone(
      dados.telefone
    )

  /*
   * Contato identificado pelo provider:
   * preservamos o telefone que compõe
   * sua identidade WhatsApp.
   */
  if (
    contato.whatsapp_id &&
    telefoneNovo !==
      telefoneAtual
  ) {
    throw new Error(
      'O telefone de um contato sincronizado não pode ser alterado manualmente. Altere apenas o nome.'
    )
  }

  const {
    normalizado,
    existente,
  } =
    await verificarTelefoneEmUso(
      corretoraId,
      telefoneNovo,
      contato.id
    )

  if (existente) {
    throw new Error(
      `Este WhatsApp já pertence a outro contato${
        existente.nome
          ? `: ${existente.nome}`
          : '.'
      }`
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_contatos')
    .update({
      nome,
      telefone:
        normalizado,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'id',
      contato.id
    )
    .select(`
      id,
      corretora_id,
      cliente_id,
      nome,
      telefone,
      whatsapp_id,
      avatar_url,
      excluido_em,
      excluido_por_id,
      created_at,
      updated_at
    `)
    .single()

  if (error || !data) {
    throw new Error(
      error?.message ||
        'Não foi possível atualizar o contato.'
    )
  }

  return data as WhatsAppContato
}

export async function excluirWhatsAppContato(
  corretoraId: string,
  contatoId: string
): Promise<void> {
  if (!corretoraId) {
    throw new Error(
      'Corretora não informada.'
    )
  }

  if (!contatoId) {
    throw new Error(
      'Contato não informado.'
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user?.id) {
    throw new Error(
      'Usuário não autenticado.'
    )
  }

  const agora =
    new Date().toISOString()

  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_contatos')
    .update({
      excluido_em: agora,
      excluido_por_id: user.id,
      updated_at: agora,
    })
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'id',
      contatoId
    )
    .is(
      'excluido_em',
      null
    )
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(
      `Não foi possível excluir o contato: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      'Contato não encontrado ou já excluído.'
    )
  }
}

export async function restaurarWhatsAppContato(
  corretoraId: string,
  contatoId: string
): Promise<void> {
  if (!corretoraId) {
    throw new Error(
      'Corretora não informada.'
    )
  }

  if (!contatoId) {
    throw new Error(
      'Contato não informado.'
    )
  }

  const agora =
    new Date().toISOString()

  const {
    data,
    error,
  } = await supabase
    .from('whatsapp_contatos')
    .update({
      excluido_em: null,
      excluido_por_id: null,
      updated_at: agora,
    })
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'id',
      contatoId
    )
    .not(
      'excluido_em',
      'is',
      null
    )
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(
      `Não foi possível restaurar o contato: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      'Contato não encontrado ou já está ativo.'
    )
  }
}