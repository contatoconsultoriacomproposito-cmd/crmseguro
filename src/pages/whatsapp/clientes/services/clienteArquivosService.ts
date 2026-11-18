import { supabase } from '../../../../lib/supabaseClient'
import type {
  DocumentoCategoria,
} from '../../documentos/types/documentos'


import {
  extrairStorageQuotaError,
} from '../../services/storageQuotaError'



export interface ClienteArquivoUpload {
  clienteId: string
  clienteTipo: 'PF' | 'PJ'
  categoria: DocumentoCategoria
  arquivo: File
}

export interface ClienteArquivoRegistro {
  id: string
  nome_original: string
  mime_type: string | null
  tamanho_bytes: number
  tipo_arquivo:
    | 'IMAGEM'
    | 'AUDIO'
    | 'VIDEO'
    | 'DOCUMENTO'
    | 'OUTRO'
  origem: string | null
  origem_id: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  storage_path: string
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

export interface ClienteArquivoUploadResultado {
  arquivo: ClienteArquivoRegistro
  alreadyFinalized: boolean
}

interface B2BaseResponse {
  success?: boolean
  error?: string
  code?: string
}

interface B2ClientePrepararUploadResponse
  extends B2BaseResponse {
  uploadUrl?: string
  storagePath?: string
  uploadHeaders?: Record<string, string>
}

interface B2ClienteFinalizarUploadResponse
  extends B2BaseResponse {
  arquivo?: unknown
  alreadyFinalized?: boolean
}

function validarPayload(
  payload: ClienteArquivoUpload
): void {
  const clienteId =
    payload.clienteId?.trim()

  if (!clienteId) {
    throw new Error(
      'Cliente não informado.'
    )
  }

  if (
    payload.clienteTipo !== 'PF' &&
    payload.clienteTipo !== 'PJ'
  ) {
    throw new Error(
      'Tipo de cliente inválido.'
    )
  }

  if (!payload.categoria) {
    throw new Error(
      'Selecione a categoria do documento.'
    )
  }

  if (!payload.arquivo) {
    throw new Error(
      'Selecione um arquivo.'
    )
  }

  if (
    payload.arquivo.size <= 0
  ) {
    throw new Error(
      'O arquivo selecionado está vazio.'
    )
  }
}

function validarRespostaFunction(
  data:
    | B2BaseResponse
    | null
    | undefined,
  mensagemPadrao: string
): void {
  if (!data?.success) {
    throw new Error(
      data?.error ||
        mensagemPadrao
    )
  }
}

function extrairMensagemErroFunction(
  error: unknown,
  data:
    | B2BaseResponse
    | null
    | undefined,
  mensagemPadrao: string
): Error {
  if (data?.error) {
    return new Error(
      data.error
    )
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (
      error as {
        message?: unknown
      }
    ).message === 'string'
  ) {
    return new Error(
      (
        error as {
          message: string
        }
      ).message
    )
  }

  return new Error(
    mensagemPadrao
  )
}

function normalizarArquivo(
  registro: unknown
): ClienteArquivoRegistro {
  if (
    !registro ||
    typeof registro !== 'object'
  ) {
    throw new Error(
      'O servidor retornou um documento inválido.'
    )
  }

  const item =
    registro as Record<
      string,
      unknown
    >

  const id =
    typeof item.id === 'string'
      ? item.id
      : ''

  const storagePath =
    typeof item.storage_path ===
    'string'
      ? item.storage_path
      : typeof item.storagePath ===
          'string'
        ? item.storagePath
        : ''

  if (
    !id ||
    !storagePath
  ) {
    throw new Error(
      'O servidor retornou um documento incompleto.'
    )
  }

  const metadata =
    item.metadata &&
    typeof item.metadata ===
      'object' &&
    !Array.isArray(
      item.metadata
    )
      ? (
          item.metadata as Record<
            string,
            unknown
          >
        )
      : {}

  const tipoArquivo =
    typeof item.tipo_arquivo ===
    'string'
      ? item.tipo_arquivo
      : 'OUTRO'

  const tiposValidos = new Set([
    'IMAGEM',
    'AUDIO',
    'VIDEO',
    'DOCUMENTO',
    'OUTRO',
  ])

  return {
    id,

    nome_original:
      typeof item.nome_original ===
      'string'
        ? item.nome_original
        : '',

    mime_type:
      typeof item.mime_type ===
      'string'
        ? item.mime_type
        : null,

    tamanho_bytes:
      Number(
        item.tamanho_bytes ||
          0
      ),

    tipo_arquivo:
      tiposValidos.has(
        tipoArquivo
      )
        ? (
            tipoArquivo as ClienteArquivoRegistro['tipo_arquivo']
          )
        : 'OUTRO',

    origem:
      typeof item.origem ===
      'string'
        ? item.origem
        : null,

    origem_id:
      typeof item.origem_id ===
      'string'
        ? item.origem_id
        : null,

    crm_pessoa_id:
      typeof item.crm_pessoa_id ===
      'string'
        ? item.crm_pessoa_id
        : null,

    crm_empresa_id:
      typeof item.crm_empresa_id ===
      'string'
        ? item.crm_empresa_id
        : null,

    storage_path:
      storagePath,

    status:
      typeof item.status ===
      'string'
        ? item.status
        : 'ATIVO',

    created_at:
      typeof item.created_at ===
      'string'
        ? item.created_at
        : '',

    metadata,
  }
}

async function prepararUploadArquivoCliente(
  payload: ClienteArquivoUpload
): Promise<{
  uploadUrl: string
  storagePath: string
  uploadHeaders: Record<
    string,
    string
  >
}> {
  validarPayload(
    payload
  )

  const clienteId =
    payload.clienteId.trim()

  const mimeType =
    payload.arquivo.type ||
    'application/octet-stream'

  const {
    data,
    error,
  } =
    await supabase.functions.invoke<
      B2ClientePrepararUploadResponse
    >('b2-media', {
      body: {
        action:
          'client-document-create-upload',

        clienteTipo:
          payload.clienteTipo,

        clienteId,

        categoria:
          payload.categoria,

        fileName:
          payload.arquivo.name,

        mimeType,

        size:
          payload.arquivo.size,
      },
    })

  if (error) {
    console.error(
      'Erro ao preparar upload do arquivo do cliente:',
      error
    )

    const storageError =
      await extrairStorageQuotaError(
        error
      )

    if (storageError) {
      throw storageError
    }

    throw extrairMensagemErroFunction(
      error,
      data,
      'Não foi possível preparar o envio do documento.'
    )
  }

  validarRespostaFunction(
    data,
    'Não foi possível preparar o envio do documento.'
  )

  if (
    !data?.uploadUrl ||
    !data?.storagePath
  ) {
    throw new Error(
      'O servidor não retornou os dados necessários para o upload.'
    )
  }

  return {
    uploadUrl:
      data.uploadUrl,

    storagePath:
      data.storagePath,

    uploadHeaders:
      data.uploadHeaders &&
      typeof data.uploadHeaders ===
        'object'
        ? data.uploadHeaders
        : {},
  }
}

async function enviarArquivoParaB2(
  arquivo: File,
  uploadUrl: string,
  uploadHeaders: Record<
    string,
    string
  >
): Promise<void> {
  const headers =
    new Headers(
      uploadHeaders
    )

  if (
    !headers.has(
      'Content-Type'
    )
  ) {
    headers.set(
      'Content-Type',
      arquivo.type ||
        'application/octet-stream'
    )
  }

  const response =
    await fetch(
      uploadUrl,
      {
        method: 'PUT',
        headers,
        body: arquivo,
      }
    )

  if (!response.ok) {
    let detalhe = ''

    try {
      detalhe =
        await response.text()
    } catch {
      detalhe = ''
    }

    console.error(
      'Erro no upload do arquivo do cliente para o B2:',
      response.status,
      detalhe
    )

    throw new Error(
      'Não foi possível enviar o arquivo para o armazenamento.'
    )
  }
}

async function finalizarUploadArquivoCliente(
  payload: ClienteArquivoUpload,
  storagePath: string
): Promise<ClienteArquivoUploadResultado> {
  validarPayload(
    payload
  )

  const clienteId =
    payload.clienteId.trim()

  const path =
    storagePath?.trim()

  if (!path) {
    throw new Error(
      'Caminho do arquivo não informado.'
    )
  }

  const mimeType =
    payload.arquivo.type ||
    'application/octet-stream'

  const {
    data,
    error,
  } =
    await supabase.functions.invoke<
      B2ClienteFinalizarUploadResponse
    >('b2-media', {
      body: {
        action:
          'client-document-finalize',

        clienteTipo:
          payload.clienteTipo,

        clienteId,

        storagePath:
          path,

        categoria:
          payload.categoria,

        fileName:
          payload.arquivo.name,

        mimeType,

        size:
          payload.arquivo.size,
      },
    })

  if (error) {
    console.error(
      'Erro ao finalizar arquivo do cliente:',
      error
    )

    const storageError =
      await extrairStorageQuotaError(
        error
      )

    if (storageError) {
      throw storageError
    }

    throw extrairMensagemErroFunction(
      error,
      data,
      'O arquivo foi enviado, mas não foi possível registrá-lo no CRM.'
    )
  }

  validarRespostaFunction(
    data,
    'Não foi possível registrar o documento no CRM.'
  )

  if (!data?.arquivo) {
    throw new Error(
      'O servidor não retornou o documento registrado.'
    )
  }

  return {
    arquivo:
      normalizarArquivo(
        data.arquivo
      ),

    alreadyFinalized:
      data.alreadyFinalized ===
      true,
  }
}

export async function adicionarArquivoCliente(
  payload: ClienteArquivoUpload
): Promise<ClienteArquivoUploadResultado> {
  validarPayload(
    payload
  )

  const preparado =
    await prepararUploadArquivoCliente(
      payload
    )

  await enviarArquivoParaB2(
    payload.arquivo,
    preparado.uploadUrl,
    preparado.uploadHeaders
  )

  return finalizarUploadArquivoCliente(
    payload,
    preparado.storagePath
  )
}