export type DocumentoOrigem =
  | 'DOCUMENTOS'
  | 'CLIENTE'
  | 'EMPRESA'

export type DocumentoCategoria =
  | 'APOLICE'
  | 'COTACAO'
  | 'PROPOSTA'
  | 'ENDOSSO'
  | 'BOLETO'
  | 'CERTIFICADO'
  | 'RG'
  | 'CNH'
  | 'CPF'
  | 'COMPROVANTE_RESIDENCIA'
  | 'COMPROVANTE_RENDA'
  | 'CERTIDAO_NASCIMENTO'
  | 'CERTIDAO_CASAMENTO'
  | 'PASSAPORTE'
  | 'CRLV'
  | 'OUTRO_PF'
  | 'CONTRATO_SOCIAL'
  | 'CARTAO_CNPJ'
  | 'ALTERACAO_CONTRATUAL'
  | 'COMPROVANTE_ENDERECO_PJ'
  | 'FATURAMENTO'
  | 'BALANCO_DRE'
  | 'RELACAO_FUNCIONARIOS'
  | 'RELACAO_VEICULOS'
  | 'OUTRO_PJ'

export type DocumentoGrupo =
  | 'DOCUMENTOS'
  | 'PESSOA_FISICA'
  | 'PESSOA_JURIDICA'
  | 'SOCIOS_REPRESENTANTES'

export type DocumentoTipoCliente =
  | 'PF'
  | 'PJ'

export type DocumentoTipoArquivo =
  | 'IMAGEM'
  | 'DOCUMENTO'
  | 'OUTRO'

export type DocumentoTipoTitular =
  | 'CLIENTE'
  | 'EMPRESA'
  | 'SOCIO_REPRESENTANTE'

export interface DocumentoCategoriaOpcao {
  value: DocumentoCategoria
  label: string
  grupo: DocumentoGrupo
  origem: DocumentoOrigem
  tiposCliente: DocumentoTipoCliente[]
}

export interface DocumentoClienteVinculado {
  tipo: DocumentoTipoCliente

  pessoaId: string | null
  empresaId: string | null

  nome: string
  documento: string | null
}

export interface DocumentoArquivo {
  id: string

  corretoraId: string
  criadoPorId: string | null

  nomeOriginal: string
  mimeType: string | null
  tamanhoBytes: number

  tipoArquivo: DocumentoTipoArquivo
  origem: DocumentoOrigem

  categoria: DocumentoCategoria | null

  pessoaId: string | null
  empresaId: string | null

  storagePath: string

  createdAt: string

  metadata: Record<string, unknown>
}

export interface DocumentoUploadPayload {
  conversationId: string

  categoria: DocumentoCategoria

  arquivo: File

  cliente: DocumentoClienteVinculado
}

export interface DocumentoUploadPreparado {
  uploadUrl: string
  storagePath: string

  arquivoId?: string

  headers?: Record<string, string>
}

export interface DocumentoUploadResultado {
  arquivo: DocumentoArquivo
}

const CATEGORIAS_PESSOAIS: DocumentoCategoria[] = [
  'RG',
  'CNH',
  'CPF',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'CERTIDAO_NASCIMENTO',
  'CERTIDAO_CASAMENTO',
  'PASSAPORTE',
  'OUTRO_PF',
]

export const DOCUMENTO_CATEGORIAS: DocumentoCategoriaOpcao[] = [
  {
    value: 'APOLICE',
    label: 'Apólice',
    grupo: 'DOCUMENTOS',
    origem: 'DOCUMENTOS',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'COTACAO',
    label: 'Cotação',
    grupo: 'DOCUMENTOS',
    origem: 'DOCUMENTOS',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'PROPOSTA',
    label: 'Proposta',
    grupo: 'DOCUMENTOS',
    origem: 'DOCUMENTOS',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'ENDOSSO',
    label: 'Endosso',
    grupo: 'DOCUMENTOS',
    origem: 'DOCUMENTOS',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'BOLETO',
    label: 'Boleto / Parcela',
    grupo: 'DOCUMENTOS',
    origem: 'DOCUMENTOS',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'CERTIFICADO',
    label: 'Certificado / Carteirinha',
    grupo: 'DOCUMENTOS',
    origem: 'DOCUMENTOS',
    tiposCliente: ['PF', 'PJ'],
  },

  {
    value: 'RG',
    label: 'RG',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'CNH',
    label: 'CNH',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'CPF',
    label: 'CPF',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'COMPROVANTE_RESIDENCIA',
    label: 'Comprovante de residência',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'COMPROVANTE_RENDA',
    label: 'Comprovante de renda',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'CERTIDAO_NASCIMENTO',
    label: 'Certidão de nascimento',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'CERTIDAO_CASAMENTO',
    label: 'Certidão de casamento',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'PASSAPORTE',
    label: 'Passaporte',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'CRLV',
    label: 'CRLV / Documento do veículo',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },
  {
    value: 'OUTRO_PF',
    label: 'Outro documento pessoal',
    grupo: 'PESSOA_FISICA',
    origem: 'CLIENTE',
    tiposCliente: ['PF', 'PJ'],
  },

  {
    value: 'CONTRATO_SOCIAL',
    label: 'Contrato social',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'CARTAO_CNPJ',
    label: 'Cartão CNPJ',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'ALTERACAO_CONTRATUAL',
    label: 'Alteração contratual',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'COMPROVANTE_ENDERECO_PJ',
    label: 'Comprovante de endereço',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'FATURAMENTO',
    label: 'Faturamento',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'BALANCO_DRE',
    label: 'Balanço / DRE',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'RELACAO_FUNCIONARIOS',
    label: 'Relação de funcionários',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'RELACAO_VEICULOS',
    label: 'Frota / Relação de veículos',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
  {
    value: 'OUTRO_PJ',
    label: 'Outro documento empresarial',
    grupo: 'PESSOA_JURIDICA',
    origem: 'EMPRESA',
    tiposCliente: ['PJ'],
  },
]

export const DOCUMENTO_GRUPOS: Array<{
  value: DocumentoGrupo
  label: string
}> = [
  {
    value: 'DOCUMENTOS',
    label: 'Documentos',
  },
  {
    value: 'PESSOA_FISICA',
    label: 'Documentos pessoais',
  },
  {
    value: 'PESSOA_JURIDICA',
    label: 'Documentos empresariais',
  },
  {
    value: 'SOCIOS_REPRESENTANTES',
    label: 'Documentos dos sócios / representantes',
  },
]

export function buscarCategoriaDocumento(
  categoria: DocumentoCategoria
): DocumentoCategoriaOpcao | null {
  return (
    DOCUMENTO_CATEGORIAS.find(
      item => item.value === categoria
    ) ?? null
  )
}

export function categoriaPessoalDocumento(
  categoria: DocumentoCategoria
): boolean {
  return CATEGORIAS_PESSOAIS.includes(categoria)
}

export function buscarOrigemDocumento(
  categoria: DocumentoCategoria,
  tipoCliente?: DocumentoTipoCliente
): DocumentoOrigem {
  const configuracao = buscarCategoriaDocumento(categoria)

  if (!configuracao) {
    throw new Error(
      `Categoria de documento inválida: ${categoria}`
    )
  }

  if (tipoCliente === 'PJ') {
    if (
      categoriaPessoalDocumento(categoria) ||
      categoria === 'CRLV'
    ) {
      return 'EMPRESA'
    }
  }

  return configuracao.origem
}

export function buscarGrupoDocumento(
  categoria: DocumentoCategoria,
  tipoCliente?: DocumentoTipoCliente
): DocumentoGrupo {
  const configuracao = buscarCategoriaDocumento(categoria)

  if (!configuracao) {
    throw new Error(
      `Categoria de documento inválida: ${categoria}`
    )
  }

  if (tipoCliente === 'PJ') {
    if (categoriaPessoalDocumento(categoria)) {
      return 'SOCIOS_REPRESENTANTES'
    }

    if (categoria === 'CRLV') {
      return 'PESSOA_JURIDICA'
    }
  }

  return configuracao.grupo
}

export function buscarTipoTitularDocumento(
  categoria: DocumentoCategoria,
  tipoCliente: DocumentoTipoCliente
): DocumentoTipoTitular {
  if (
    tipoCliente === 'PJ' &&
    categoriaPessoalDocumento(categoria)
  ) {
    return 'SOCIO_REPRESENTANTE'
  }

  if (tipoCliente === 'PJ') {
    return 'EMPRESA'
  }

  return 'CLIENTE'
}

export function categoriaPermitidaParaCliente(
  categoria: DocumentoCategoria,
  tipoCliente: DocumentoTipoCliente
): boolean {
  const configuracao = buscarCategoriaDocumento(categoria)

  if (!configuracao) {
    return false
  }

  return configuracao.tiposCliente.includes(tipoCliente)
}

export function listarCategoriasParaCliente(
  tipoCliente: DocumentoTipoCliente
): DocumentoCategoriaOpcao[] {
  return DOCUMENTO_CATEGORIAS
    .filter(
      categoria =>
        categoria.tiposCliente.includes(tipoCliente)
    )
    .map(categoria => ({
      ...categoria,
      grupo: buscarGrupoDocumento(
        categoria.value,
        tipoCliente
      ),
      origem: buscarOrigemDocumento(
        categoria.value,
        tipoCliente
      ),
    }))
}

export function listarCategoriasPorGrupo(
  grupo: DocumentoGrupo,
  tipoCliente?: DocumentoTipoCliente
): DocumentoCategoriaOpcao[] {
  const categorias = tipoCliente
    ? listarCategoriasParaCliente(tipoCliente)
    : DOCUMENTO_CATEGORIAS

  return categorias.filter(
    categoria => categoria.grupo === grupo
  )
}

export function obterLabelCategoriaDocumento(
  categoria: DocumentoCategoria | null | undefined
): string {
  if (!categoria) {
    return 'Documento'
  }

  return (
    buscarCategoriaDocumento(categoria)?.label ??
    'Documento'
  )
}

export function obterLabelGrupoDocumento(
  grupo: DocumentoGrupo
): string {
  return (
    DOCUMENTO_GRUPOS.find(
      item => item.value === grupo
    )?.label ?? 'Documentos'
  )
}

export function identificarTipoArquivoDocumento(
  mimeType: string | null | undefined
): DocumentoTipoArquivo {
  const mime = mimeType?.trim().toLowerCase() ?? ''

  if (mime.startsWith('image/')) {
    return 'IMAGEM'
  }

  if (
    mime === 'application/pdf' ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime === 'text/plain' ||
    mime === 'text/csv'
  ) {
    return 'DOCUMENTO'
  }

  return 'OUTRO'
}

export function validarCategoriaDocumento(
  categoria: DocumentoCategoria,
  cliente: DocumentoClienteVinculado
): void {
  const configuracao = buscarCategoriaDocumento(categoria)

  if (!configuracao) {
    throw new Error(
      'Categoria de documento inválida.'
    )
  }

  if (
    !configuracao.tiposCliente.includes(cliente.tipo)
  ) {
    throw new Error(
      'Esta categoria de documento não é permitida para este tipo de cliente.'
    )
  }

  if (
    cliente.tipo === 'PF' &&
    !cliente.pessoaId
  ) {
    throw new Error(
      'A pessoa física vinculada ao documento não foi identificada.'
    )
  }

  if (
    cliente.tipo === 'PJ' &&
    !cliente.empresaId
  ) {
    throw new Error(
      'A empresa vinculada ao documento não foi identificada.'
    )
  }
}
