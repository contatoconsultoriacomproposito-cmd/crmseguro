import { supabase } from '../../../lib/supabaseClient'

export type WhatsAppCallStatus =
  | 'starting'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'failed'
  | 'missed'
  | 'rejected'
  | 'cancelled'

export type WhatsAppCallRecordingStatus =
  | 'none'
  | 'processing'
  | 'ready'
  | 'failed'

interface CriarLigacaoParams {
  corretoraId: string
  conversaId: string
  contatoId: string
  criadoPorId?: string | null
}

interface AtualizarLigacaoIniciadaParams {
  ligacaoId: string
  instanciaId: string
  providerCallId: string
}

export async function criarLigacaoWhatsApp({
  corretoraId,
  conversaId,
  contatoId,
  criadoPorId = null,
}: CriarLigacaoParams): Promise<string> {
  const { data, error } = await supabase
    .from('whatsapp_ligacoes')
    .insert({
      corretora_id: corretoraId,
      conversa_id: conversaId,
      contato_id: contatoId,
      provider: 'dapi',
      direction: 'outbound',
      status: 'starting',
      gravacao_status: 'none',
      criado_por: criadoPorId,
    })
    .select('id')
    .single()

  if (error) {
    console.error(
      'Erro ao registrar ligação:',
      error
    )

    throw new Error(
      'Não foi possível registrar a ligação.'
    )
  }

  return data.id
}

export async function marcarLigacaoIniciada({
  ligacaoId,
  instanciaId,
  providerCallId,
}: AtualizarLigacaoIniciadaParams): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      instancia_id: instanciaId,
      provider_call_id: providerCallId,
      status: 'calling',
    })
    .eq('id', ligacaoId)

  if (error) {
    console.error(
      'Erro ao atualizar ligação iniciada:',
      error
    )

    throw new Error(
      'Não foi possível atualizar o registro da ligação.'
    )
  }
}

export async function marcarLigacaoTocando(
  ligacaoId: string
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      status: 'ringing',
    })
    .eq('id', ligacaoId)

  if (error) {
    console.error(
      'Erro ao registrar chamada tocando:',
      error
    )
  }
}

export async function marcarLigacaoAtendida(
  ligacaoId: string
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      status: 'connected',
      atendido_em: new Date().toISOString(),
      gravacao_status: 'processing',
    })
    .eq('id', ligacaoId)

  if (error) {
    console.error(
      'Erro ao registrar ligação atendida:',
      error
    )
  }
}

export async function finalizarLigacaoWhatsApp(
  ligacaoId: string,
  duracaoSegundos?: number | null
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      status: 'ended',
      encerrado_em: new Date().toISOString(),
      duracao_segundos:
        duracaoSegundos != null
          ? Math.max(0, Math.round(duracaoSegundos))
          : null,
    })
    .eq('id', ligacaoId)

  if (error) {
    console.error(
      'Erro ao finalizar registro da ligação:',
      error
    )
  }
}

export async function marcarLigacaoFalhou(
  ligacaoId: string
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      status: 'failed',
      encerrado_em: new Date().toISOString(),
    })
    .eq('id', ligacaoId)

  if (error) {
    console.error(
      'Erro ao registrar falha da ligação:',
      error
    )
  }
}

export interface WhatsAppCallTimelineItem {
  id: string
  conversaId: string
  direction: 'outbound' | 'inbound'
  status: WhatsAppCallStatus
  iniciadoEm: string
  atendidoEm: string | null
  encerradoEm: string | null
  duracaoSegundos: number | null
  gravacaoStatus: WhatsAppCallRecordingStatus
  gravacaoArquivoId: string | null
  gravacao?: {
    id: string
    nomeOriginal: string
    mimeType: string | null
    tamanhoBytes: number
    storagePath: string
  } | null
}

interface B2ReadResponse {
  success: boolean
  readUrl?: string
  error?: string
}

export async function buscarLigacoesConversa(
  conversaId: string
): Promise<WhatsAppCallTimelineItem[]> {
  if (!conversaId) {
    return []
  }

  const {
    data: ligacoes,
    error: ligacoesError,
  } = await supabase
    .from('whatsapp_ligacoes')
    .select(`
      id,
      conversa_id,
      direction,
      status,
      iniciado_em,
      atendido_em,
      encerrado_em,
      duracao_segundos,
      gravacao_status,
      gravacao_arquivo_id
    `)
    .eq('conversa_id', conversaId)
    .order('iniciado_em', {
      ascending: true,
    })

  if (ligacoesError) {
    console.error(
      'Erro ao buscar ligações da conversa:',
      ligacoesError
    )

    throw new Error(
      'Não foi possível carregar o histórico de ligações.'
    )
  }

  if (!ligacoes?.length) {
  return []
}

const agora = Date.now()
const limiteProcessamentoMs =
  10 * 60 * 1000

const ligacoesProcessamentoExpirado =
  ligacoes.filter(ligacao => {
    if (
      ligacao.gravacao_status !==
        'processing' ||
      ligacao.status !== 'ended'
    ) {
      return false
    }

    const referencia =
      ligacao.encerrado_em ||
      ligacao.iniciado_em

    const timestamp =
      new Date(referencia).getTime()

    if (!Number.isFinite(timestamp)) {
      return false
    }

    return (
      agora - timestamp >
      limiteProcessamentoMs
    )
  })

const idsProcessamentoExpirado =
  ligacoesProcessamentoExpirado.map(
    ligacao => ligacao.id
  )

if (
  idsProcessamentoExpirado.length > 0
) {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      gravacao_status: 'failed',
    })
    .in(
      'id',
      idsProcessamentoExpirado
    )
    .eq(
      'gravacao_status',
      'processing'
    )

  if (error) {
    console.error(
      'Erro ao encerrar gravações pendentes:',
      error
    )
  } else {
    const idsExpirados = new Set(
      idsProcessamentoExpirado
    )

    for (const ligacao of ligacoes) {
      if (
        idsExpirados.has(ligacao.id)
      ) {
        ligacao.gravacao_status =
          'failed'
      }
    }
  }
}

const arquivoIds = [
    ...new Set(
      ligacoes
        .map(ligacao =>
          ligacao.gravacao_arquivo_id
        )
        .filter(
          (id): id is string =>
            typeof id === 'string' &&
            id.length > 0
        )
    ),
  ]

  const arquivosPorId = new Map<
    string,
    {
      id: string
      nome_original: string
      mime_type: string | null
      tamanho_bytes: number
      storage_path: string
    }
  >()

  if (arquivoIds.length > 0) {
    const {
      data: arquivos,
      error: arquivosError,
    } = await supabase
      .from('crm_arquivos')
      .select(`
        id,
        nome_original,
        mime_type,
        tamanho_bytes,
        storage_path
      `)
      .in('id', arquivoIds)
      .eq('status', 'ATIVO')

    if (arquivosError) {
      console.error(
        'Erro ao buscar gravações das ligações:',
        arquivosError
      )
    } else {
      for (const arquivo of arquivos ?? []) {
        arquivosPorId.set(
          arquivo.id,
          arquivo
        )
      }
    }
  }

  return ligacoes.map(ligacao => {
    const arquivo =
      ligacao.gravacao_arquivo_id
        ? arquivosPorId.get(
            ligacao.gravacao_arquivo_id
          )
        : undefined

    return {
      id: ligacao.id,
      conversaId: ligacao.conversa_id,
      direction: ligacao.direction,
      status: ligacao.status,
      iniciadoEm: ligacao.iniciado_em,
      atendidoEm:
        ligacao.atendido_em ?? null,
      encerradoEm:
        ligacao.encerrado_em ?? null,
      duracaoSegundos:
        ligacao.duracao_segundos ?? null,
      gravacaoStatus:
        ligacao.gravacao_status,
      gravacaoArquivoId:
        ligacao.gravacao_arquivo_id ?? null,

      gravacao: arquivo
        ? {
            id: arquivo.id,
            nomeOriginal:
              arquivo.nome_original,
            mimeType:
              arquivo.mime_type,
            tamanhoBytes:
              arquivo.tamanho_bytes,
            storagePath:
              arquivo.storage_path,
          }
        : null,
    }
  })
}

export async function criarUrlGravacaoLigacao(
  storagePath: string
): Promise<string> {
  if (!storagePath) {
    throw new Error(
      'Caminho da gravação não informado.'
    )
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke<B2ReadResponse>(
    'b2-media',
    {
      body: {
        action: 'create-read',
        storagePath,
      },
    }
  )

  if (error) {
    console.error(
      'Erro ao gerar URL da gravação:',
      error
    )

    throw new Error(
      'Não foi possível carregar a gravação.'
    )
  }

  if (
    !data?.success ||
    !data.readUrl
  ) {
    throw new Error(
      data?.error ||
        'Não foi possível carregar a gravação.'
    )
  }

  return data.readUrl
}