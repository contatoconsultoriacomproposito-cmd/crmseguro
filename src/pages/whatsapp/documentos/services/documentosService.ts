import { supabase } from '../../../../lib/supabaseClient'

import { buscarClienteCrmPorContatoWhatsApp } from '../../services/crmWhatsAppClienteService'

import {
  buscarCategoriaDocumento,
  buscarOrigemDocumento,
  buscarTipoTitularDocumento,
  categoriaPermitidaParaCliente,
  identificarTipoArquivoDocumento,
  validarCategoriaDocumento,
  type DocumentoArquivo,
  type DocumentoCategoria,
  type DocumentoClienteVinculado,
  type DocumentoOrigem,
  type DocumentoTipoArquivo,
  type DocumentoUploadPayload,
  type DocumentoUploadResultado,
} from '../types/documentos'

import {
  extrairStorageQuotaError,
} from '../../services/storageQuotaError'

interface B2MediaBaseResponse {
  success?: boolean
  error?: string
}

interface B2DocumentoListarResponse extends B2MediaBaseResponse {
  documentos?: unknown[]
}

interface B2DocumentoPrepararUploadResponse extends B2MediaBaseResponse {
  uploadUrl?: string
  storagePath?: string
  uploadHeaders?: Record<string, string>
}

interface B2DocumentoFinalizarUploadResponse extends B2MediaBaseResponse {
  arquivo?: unknown
}

interface B2DocumentoLeituraResponse extends B2MediaBaseResponse {
  readUrl?: string
}

interface B2DocumentoDownloadResponse extends B2MediaBaseResponse {
  readUrl?: string
}

export interface ListarDocumentosParams {
  conversationId: string
  busca?: string
  categoria?: DocumentoCategoria | null
}

export interface CriarUrlDocumentoParams {
  conversationId: string
  arquivoId: string
}

function numeroSeguro(
  valor: unknown,
  fallback = 0
): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor
  }

  if (typeof valor === 'string') {
    const convertido = Number(valor)

    if (Number.isFinite(convertido)) {
      return convertido
    }
  }

  return fallback
}

function textoOuNull(
  valor: unknown
): string | null {
  if (typeof valor !== 'string') {
    return null
  }

  const texto = valor.trim()

  return texto || null
}

function registroSeguro(
  valor: unknown
): Record<string, unknown> {
  if (
    valor &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  ) {
    return valor as Record<string, unknown>
  }

  return {}
}

function normalizarOrigem(
  valor: unknown
): DocumentoOrigem {
  if (
    valor === 'DOCUMENTOS' ||
    valor === 'CLIENTE' ||
    valor === 'EMPRESA'
  ) {
    return valor
  }

  throw new Error(
    'Origem de documento inválida retornada pelo servidor.'
  )
}

function normalizarTipoArquivo(
  valor: unknown,
  mimeType: string | null
): DocumentoTipoArquivo {
  if (
    valor === 'IMAGEM' ||
    valor === 'DOCUMENTO' ||
    valor === 'OUTRO'
  ) {
    return valor
  }

  return identificarTipoArquivoDocumento(mimeType)
}

function normalizarCategoria(
  valor: unknown
): DocumentoCategoria | null {
  if (typeof valor !== 'string') {
    return null
  }

  const categorias: DocumentoCategoria[] = [
    'APOLICE',
    'COTACAO',
    'PROPOSTA',
    'ENDOSSO',
    'BOLETO',
    'CERTIFICADO',

    'RG',
    'CNH',
    'CPF',
    'COMPROVANTE_RESIDENCIA',
    'COMPROVANTE_RENDA',
    'CERTIDAO_NASCIMENTO',
    'CERTIDAO_CASAMENTO',
    'PASSAPORTE',
    'CRLV',
    'OUTRO_PF',

    'CONTRATO_SOCIAL',
    'CARTAO_CNPJ',
    'ALTERACAO_CONTRATUAL',
    'COMPROVANTE_ENDERECO_PJ',
    'FATURAMENTO',
    'BALANCO_DRE',
    'RELACAO_FUNCIONARIOS',
    'RELACAO_VEICULOS',
    'OUTRO_PJ',
  ]

  return categorias.includes(
    valor as DocumentoCategoria
  )
    ? (valor as DocumentoCategoria)
    : null
}

function normalizarDocumento(
  valor: unknown
): DocumentoArquivo {
  const registro = registroSeguro(valor)

  const metadata = registroSeguro(
    registro.metadata
  )

  const mimeType =
    textoOuNull(
      registro.mimeType ??
        registro.mime_type
    )

  const categoria =
    normalizarCategoria(
      registro.categoria ??
        metadata.categoria_documento
    )

  return {
    id: String(registro.id ?? ''),

    corretoraId: String(
      registro.corretoraId ??
        registro.corretora_id ??
        ''
    ),

    criadoPorId:
      textoOuNull(
        registro.criadoPorId ??
          registro.criado_por_id
      ),

    nomeOriginal: String(
      registro.nomeOriginal ??
        registro.nome_original ??
        ''
    ),

    mimeType,

    tamanhoBytes: numeroSeguro(
      registro.tamanhoBytes ??
        registro.tamanho_bytes
    ),

    tipoArquivo: normalizarTipoArquivo(
      registro.tipoArquivo ??
        registro.tipo_arquivo,
      mimeType
    ),

    origem: normalizarOrigem(
      registro.origem
    ),

    categoria,

    pessoaId:
      textoOuNull(
        registro.pessoaId ??
          registro.crm_pessoa_id
      ),

    empresaId:
      textoOuNull(
        registro.empresaId ??
          registro.crm_empresa_id
      ),

    storagePath: String(
      registro.storagePath ??
        registro.storage_path ??
        ''
    ),

    createdAt: String(
      registro.createdAt ??
        registro.created_at ??
        ''
    ),

    metadata,
  }
}

function validarRespostaFunction(
  data: B2MediaBaseResponse | null | undefined,
  mensagemPadrao: string
): void {
  if (!data?.success) {
    throw new Error(
      data?.error || mensagemPadrao
    )
  }
}

function extrairMensagemErroFunction(
  error: unknown,
  data: B2MediaBaseResponse | null | undefined,
  mensagemPadrao: string
): Error {
  if (data?.error) {
    return new Error(data.error)
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (
      error as { message?: unknown }
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

  return new Error(mensagemPadrao)
}

export async function buscarClienteDocumentoPorContato(
  contatoId: string
): Promise<DocumentoClienteVinculado | null> {
  const id = contatoId?.trim()

  if (!id) {
    throw new Error(
      'Contato do WhatsApp não informado.'
    )
  }

  const clienteCrm =
    await buscarClienteCrmPorContatoWhatsApp(id)

  if (!clienteCrm) {
    return null
  }

  if (
    clienteCrm.tipo === 'PF' &&
    clienteCrm.pessoa
  ) {
    return {
      tipo: 'PF',

      pessoaId:
        clienteCrm.pessoa.id,

      empresaId: null,

      nome:
        clienteCrm.pessoa.dados?.nome?.trim() ||
        'Cliente',

        documento:
        clienteCrm.pessoa.cpf ??
        null,
    }
  }

  if (
    clienteCrm.tipo === 'PJ' &&
    clienteCrm.empresa
  ) {
    return {
      tipo: 'PJ',

      pessoaId: null,

      empresaId:
        clienteCrm.empresa.id,

      nome:
        clienteCrm.empresa.dados?.nome_fantasia?.trim() ||
        clienteCrm.empresa.dados?.razao_social?.trim() ||
        'Empresa',

        documento:
        clienteCrm.empresa.cnpj ??
        null,
    }
  }

  return null
}

export async function listarDocumentos(
  params: ListarDocumentosParams
): Promise<DocumentoArquivo[]> {
  const conversationId =
    params.conversationId?.trim()

  if (!conversationId) {
    throw new Error(
      'Conversa do WhatsApp não informada.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke<
      B2DocumentoListarResponse
    >('b2-media', {
      body: {
        action: 'document-list',
        conversationId,

        busca:
          params.busca?.trim() ||
          null,

        categoria:
          params.categoria ??
          null,
      },
    })

  if (error) {
    console.error(
      'Erro ao listar documentos:',
      error
    )

    const response =
      error &&
      typeof error === 'object' &&
      'context' in error
        ? (error as { context?: Response }).context
        : undefined

    if (response?.status === 409) {
      throw new Error(
        'Vincule este contato a um cliente do CRM para acessar os documentos.'
      )
    }

    throw extrairMensagemErroFunction(
      error,
      data,
      'Não foi possível carregar os documentos.'
    )
  }

  validarRespostaFunction(
    data,
    'Não foi possível carregar os documentos.'
  )

  if (!Array.isArray(data?.documentos)) {
    return []
  }

  return data.documentos
    .map(normalizarDocumento)
    .filter(documento => documento.id)
}

export async function prepararUploadDocumento(
  payload: DocumentoUploadPayload
): Promise<{
  uploadUrl: string
  storagePath: string
  uploadHeaders: Record<string, string>
}> {
  const conversationId =
    payload.conversationId?.trim()

  if (!conversationId) {
    throw new Error(
      'Conversa do WhatsApp não informada.'
    )
  }

  if (!payload.arquivo) {
    throw new Error(
      'Selecione um arquivo.'
    )
  }

  if (payload.arquivo.size <= 0) {
    throw new Error(
      'O arquivo selecionado está vazio.'
    )
  }

  validarCategoriaDocumento(
    payload.categoria,
    payload.cliente
  )

  const categoria =
    buscarCategoriaDocumento(
      payload.categoria
    )

  if (!categoria) {
    throw new Error(
      'Categoria de documento inválida.'
    )
  }

  if (
    !categoriaPermitidaParaCliente(
      payload.categoria,
      payload.cliente.tipo
    )
  ) {
    throw new Error(
      'Esta categoria não é permitida para este cliente.'
    )
  }

  const origem =
  buscarOrigemDocumento(
    payload.categoria,
    payload.cliente.tipo
  )

const tipoTitularDocumento =
  buscarTipoTitularDocumento(
    payload.categoria,
    payload.cliente.tipo
  )

const tipoArquivo =
  identificarTipoArquivoDocumento(
    payload.arquivo.type
  )

  const { data, error } =
    await supabase.functions.invoke<
      B2DocumentoPrepararUploadResponse
    >('b2-media', {
      body: {
    action: 'document-create-upload',

    conversationId,

    categoria:
        payload.categoria,

    origem,

    tipoTitularDocumento,

    tipoArquivo,

    fileName:
        payload.arquivo.name,

    mimeType:
        payload.arquivo.type ||
        'application/octet-stream',

    size:
        payload.arquivo.size,
    },
    })

  if (error) {
  console.error(
    'Erro ao preparar upload de documento:',
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
    uploadUrl: data.uploadUrl,
    storagePath: data.storagePath,
    uploadHeaders:
      data.uploadHeaders &&
      typeof data.uploadHeaders === 'object'
        ? data.uploadHeaders
        : {},
  }
}

async function enviarArquivoParaB2(
  arquivo: File,
  uploadUrl: string,
  uploadHeaders: Record<string, string>
): Promise<void> {
  const headers = new Headers(
    uploadHeaders
  )

  if (!headers.has('Content-Type')) {
    headers.set(
      'Content-Type',
      arquivo.type ||
        'application/octet-stream'
    )
  }

  const response = await fetch(
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
      detalhe = await response.text()
    } catch {
      detalhe = ''
    }

    console.error(
      'Erro no upload para o B2:',
      response.status,
      detalhe
    )

    throw new Error(
      'Não foi possível enviar o arquivo para o armazenamento.'
    )
  }
}

export async function finalizarUploadDocumento(
  payload: DocumentoUploadPayload,
  storagePath: string
): Promise<DocumentoArquivo> {
  const conversationId =
    payload.conversationId?.trim()

  const path =
    storagePath?.trim()

  if (!conversationId) {
    throw new Error(
      'Conversa do WhatsApp não informada.'
    )
  }

  if (!path) {
    throw new Error(
      'Caminho do arquivo não informado.'
    )
  }

  validarCategoriaDocumento(
    payload.categoria,
    payload.cliente
  )

  const origem =
    buscarOrigemDocumento(
        payload.categoria,
        payload.cliente.tipo
    )

    const tipoTitularDocumento =
    buscarTipoTitularDocumento(
        payload.categoria,
        payload.cliente.tipo
    )

    const tipoArquivo =
    identificarTipoArquivoDocumento(
        payload.arquivo.type
    )

  const { data, error } =
    await supabase.functions.invoke<
      B2DocumentoFinalizarUploadResponse
    >('b2-media', {
      body: {
    action: 'document-finalize',

    conversationId,

    storagePath: path,

    categoria:
        payload.categoria,

    origem,

    tipoTitularDocumento,

    tipoArquivo,

    fileName:
        payload.arquivo.name,

    mimeType:
        payload.arquivo.type ||
        'application/octet-stream',

    size:
        payload.arquivo.size,
    },
    })

  if (error) {
  console.error(
    'Erro ao finalizar documento:',
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

  return normalizarDocumento(
    data.arquivo
  )
}

export async function enviarDocumento(
  payload: DocumentoUploadPayload
): Promise<DocumentoUploadResultado> {
  validarCategoriaDocumento(
    payload.categoria,
    payload.cliente
  )

  const preparado =
    await prepararUploadDocumento(
      payload
    )

  await enviarArquivoParaB2(
    payload.arquivo,
    preparado.uploadUrl,
    preparado.uploadHeaders
  )

  const arquivo =
    await finalizarUploadDocumento(
      payload,
      preparado.storagePath
    )

  return {
    arquivo,
  }
}

export async function criarUrlLeituraDocumento(
  params: CriarUrlDocumentoParams
): Promise<string> {
  const conversationId =
    params.conversationId?.trim()

  const arquivoId =
    params.arquivoId?.trim()

  if (!conversationId) {
    throw new Error(
      'Conversa do WhatsApp não informada.'
    )
  }

  if (!arquivoId) {
    throw new Error(
      'Documento não informado.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke<
      B2DocumentoLeituraResponse
    >('b2-media', {
      body: {
        action: 'document-create-read',
        conversationId,
        arquivoId,
      },
    })

  if (error) {
    console.error(
      'Erro ao gerar acesso ao documento:',
      error
    )

    throw extrairMensagemErroFunction(
      error,
      data,
      'Não foi possível acessar o documento.'
    )
  }

  validarRespostaFunction(
    data,
    'Não foi possível acessar o documento.'
  )

  if (!data?.readUrl) {
    throw new Error(
      'O servidor não retornou a URL de leitura do documento.'
    )
  }

  return data.readUrl
}

export async function visualizarDocumento(
  params: CriarUrlDocumentoParams
): Promise<void> {
  const readUrl =
    await criarUrlLeituraDocumento(
      params
    )

  window.open(
    readUrl,
    '_blank',
    'noopener,noreferrer'
  )
}

export async function baixarDocumento(
  params: CriarUrlDocumentoParams
): Promise<void> {
  const conversationId =
    params.conversationId?.trim()

  const arquivoId =
    params.arquivoId?.trim()

  if (!conversationId) {
    throw new Error(
      'Conversa do WhatsApp não informada.'
    )
  }

  if (!arquivoId) {
    throw new Error(
      'Documento não informado.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke<
      B2DocumentoDownloadResponse
    >('b2-media', {
      body: {
        action: 'document-create-read',
        conversationId,
        arquivoId,
        download: true,
        },
    })

  if (error) {
    console.error(
      'Erro ao gerar download do documento:',
      error
    )

    throw extrairMensagemErroFunction(
      error,
      data,
      'Não foi possível baixar o documento.'
    )
  }

  validarRespostaFunction(
    data,
    'Não foi possível baixar o documento.'
  )

  if (!data?.readUrl) {
    throw new Error(
      'O servidor não retornou a URL de download.'
    )
  }

  const link =
    document.createElement('a')

  link.href = data.readUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'

  document.body.appendChild(link)

    link.click()
  link.remove()
}

export async function excluirDocumento(
  arquivoId: string
): Promise<void> {
  const id = arquivoId?.trim()

  if (!id) {
    throw new Error('Documento não informado.')
  }

  const { data, error } =
    await supabase.functions.invoke<B2MediaBaseResponse>(
      'b2-media',
      {
        body: {
          action: 'delete',
          arquivoId: id,
        },
      }
    )

  if (error) {
    console.error(
      'Erro ao excluir documento:',
      error
    )

    throw extrairMensagemErroFunction(
      error,
      data,
      'Não foi possível excluir o documento.'
    )
  }

  validarRespostaFunction(
    data,
    'Não foi possível excluir o documento.'
  )
}