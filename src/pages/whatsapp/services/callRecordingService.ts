import { supabase } from '../../../lib/supabaseClient'

interface UploadCallRecordingParams {
  conversationId: string
  ligacaoId: string
  blob: Blob
}

interface CallCreateUploadResponse {
  success: boolean
  storagePath?: string
  uploadUrl?: string
  error?: string
}

interface CallFinalizeResponse {
  success: boolean
  arquivo?: {
    id: string
    nome_original: string
    mime_type: string | null
    tamanho_bytes: number
    tipo_arquivo: string
    origem: string
    origem_id: string | null
    storage_path: string
    created_at: string
    metadata: Record<string, unknown>
  }
  alreadyFinalized?: boolean
  error?: string
}

export interface CallRecordingUploadResult {
  arquivoId: string
  storagePath: string
  fileName: string
  mimeType: string
  size: number
}

function resolverMimeType(blob: Blob): string {
  const mimeType = blob.type?.trim()

  if (
    mimeType &&
    mimeType.toLowerCase().startsWith('audio/')
  ) {
    return mimeType
  }

  return 'audio/webm'
}

function resolverExtensao(mimeType: string): string {
  const normalizado = mimeType.toLowerCase()

  if (normalizado.includes('ogg')) {
    return 'ogg'
  }

  if (normalizado.includes('mpeg')) {
    return 'mp3'
  }

  if (normalizado.includes('mp4')) {
    return 'm4a'
  }

  if (normalizado.includes('wav')) {
    return 'wav'
  }

  return 'webm'
}

function criarNomeArquivo(
  ligacaoId: string,
  mimeType: string
): string {
  const extensao = resolverExtensao(mimeType)

  return `ligacao-${ligacaoId}.${extensao}`
}

async function marcarGravacaoComoFalha(
  ligacaoId: string
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_ligacoes')
    .update({
      gravacao_status: 'failed',
    })
    .eq('id', ligacaoId)

  if (error) {
    console.error(
      'Erro ao marcar gravação como falha:',
      error
    )
  }
}

export async function uploadCallRecording({
  conversationId,
  ligacaoId,
  blob,
}: UploadCallRecordingParams): Promise<CallRecordingUploadResult> {
  if (!conversationId) {
    throw new Error(
      'ID da conversa não informado.'
    )
  }

  if (!ligacaoId) {
    throw new Error(
      'ID da ligação não informado.'
    )
  }

  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new Error(
      'A gravação da ligação está vazia.'
    )
  }

  const mimeType = resolverMimeType(blob)
  const fileName = criarNomeArquivo(
    ligacaoId,
    mimeType
  )

  try {
    const {
      data: uploadData,
      error: uploadError,
    } = await supabase.functions.invoke<CallCreateUploadResponse>(
      'b2-media',
      {
        body: {
          action: 'call-create-upload',
          conversationId,
          ligacaoId,
          fileName,
          mimeType,
          fileSize: blob.size,
        },
      }
    )

    if (uploadError) {
      console.error(
        'Erro ao preparar upload da gravação:',
        uploadError
      )

      throw new Error(
        'Não foi possível preparar o envio da gravação.'
      )
    }

    if (
      !uploadData?.success ||
      !uploadData.uploadUrl ||
      !uploadData.storagePath
    ) {
      throw new Error(
        uploadData?.error ||
          'Não foi possível preparar o envio da gravação.'
      )
    }

    const uploadResponse = await fetch(
      uploadData.uploadUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: blob,
      }
    )

    if (!uploadResponse.ok) {
      throw new Error(
        `Falha ao enviar gravação para o armazenamento (${uploadResponse.status}).`
      )
    }

    const {
      data: finalizeData,
      error: finalizeError,
    } = await supabase.functions.invoke<CallFinalizeResponse>(
      'b2-media',
      {
        body: {
          action: 'call-finalize',
          conversationId,
          ligacaoId,
          storagePath: uploadData.storagePath,
          fileName,
          mimeType,
        },
      }
    )

    if (finalizeError) {
      console.error(
        'Erro ao finalizar gravação:',
        finalizeError
      )

      throw new Error(
        'A gravação foi enviada, mas não foi possível finalizar seu registro.'
      )
    }

    if (
      !finalizeData?.success ||
      !finalizeData.arquivo?.id
    ) {
      throw new Error(
        finalizeData?.error ||
          'Não foi possível finalizar o registro da gravação.'
      )
    }

    return {
      arquivoId: finalizeData.arquivo.id,
      storagePath:
        finalizeData.arquivo.storage_path,
      fileName:
        finalizeData.arquivo.nome_original,
      mimeType:
        finalizeData.arquivo.mime_type ||
        mimeType,
      size:
        finalizeData.arquivo.tamanho_bytes,
    }
  } catch (error) {
    await marcarGravacaoComoFalha(
      ligacaoId
    )

    console.error(
      'Erro no upload da gravação da ligação:',
      error
    )

    throw error instanceof Error
      ? error
      : new Error(
          'Erro inesperado ao salvar a gravação da ligação.'
        )
  }
}