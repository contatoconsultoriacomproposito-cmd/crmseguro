import { supabase } from '../../../../lib/supabaseClient'

export type StorageOrigem =
  | 'WHATSAPP'
  | 'DOCUMENTOS'
  | 'SINISTRO'
  | 'ASSISTENCIA'
  | 'CLIENTE'
  | 'EMPRESA'
  | 'OUTRO'

export type StorageTipoArquivo =
  | 'IMAGEM'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENTO'
  | 'OUTRO'

export type StorageClassificacaoArquivo =
  | StorageTipoArquivo
  | 'LIGACAO'

export type StorageStatus = 'ATIVO' | 'EXCLUIDO'

export type StorageTipoTitularDocumento =
  | 'CLIENTE'
  | 'EMPRESA'
  | 'SOCIO_REPRESENTANTE'

export type StorageCategoriaDocumento =
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

export interface StorageConfig {
  id: string
  corretora_id: string
  limite_bytes: number
  max_file_size_bytes: number | null
  liberar_excedente: boolean
  ativo: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StorageResumo {
  corretora_id: string
  total_arquivos: number
  usado_bytes: number
  whatsapp_bytes: number
  documentos_bytes: number
  sinistros_bytes: number
  assistencias_bytes: number
  imagens_bytes: number
  audios_bytes: number
  videos_bytes: number
  documentos_tipo_bytes: number
}

export interface StorageArquivoContexto {
  tipo: StorageOrigem
  titulo: string
  subtitulo: string | null
  documento: string | null
  whatsappContatoId: string | null
  whatsappConversaId: string | null
  whatsappMensagemId: string | null
  whatsappDirection: 'inbound' | 'outbound' | null
  telefone: string | null
  crmPessoaId: string | null
  crmEmpresaId: string | null
  origemId: string | null
}

export interface StorageArquivo {
  id: string
  corretora_id: string
  corretor_id: string | null
  criado_por_id: string | null
  nome_original: string
  mime_type: string | null
  tamanho_bytes: number
  tipo_arquivo: StorageTipoArquivo
  origem: StorageOrigem
  origem_id: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  storage_provider: 'BACKBLAZE_B2'
  bucket: string
  storage_path: string
  status: StorageStatus
  excluido_em: string | null
  excluido_por_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  contexto: StorageArquivoContexto | null
}

export interface StorageConsumoOrigem {
  origem: StorageOrigem
  total_arquivos: number
  tamanho_bytes: number
}

export interface StorageResumoSubcategoria {
  origem: StorageOrigem
  tipo_arquivo: StorageClassificacaoArquivo
  categoria_documento: StorageCategoriaDocumento | null
  tipo_titular_documento: StorageTipoTitularDocumento | null
  total_arquivos: number
  tamanho_bytes: number
}

export interface StorageDashboard {
  config: StorageConfig
  resumo: StorageResumo
  limite_bytes: number
  usado_bytes: number
  disponivel_bytes: number
  percentual_usado: number
  total_arquivos: number
  consumo_por_origem: StorageConsumoOrigem[]
  subcategorias: StorageResumoSubcategoria[]
}

export interface StorageDashboardCarteira {
  corretora_id: string
  corretor_id: string | null
  escopo: 'CORRETORA' | 'CORRETOR'
  total_arquivos: number
  usado_bytes: number
  total_clientes: number
  consumo_por_origem: StorageConsumoOrigem[]
  subcategorias: StorageResumoSubcategoria[]
}

export interface StorageFiltros {
  busca?: string
  origem?: StorageOrigem
  tipo_arquivo?: StorageTipoArquivo
  gravacao_ligacao?: boolean
  status?: StorageStatus
  categoria_documento?: StorageCategoriaDocumento
  tipo_titular_documento?: StorageTipoTitularDocumento
  corretor_id?: string
  pagina?: number
  por_pagina?: number
}

export interface StorageArquivosPaginados {
  arquivos: StorageArquivo[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

const ORIGENS: StorageOrigem[] = [
  'WHATSAPP',
  'DOCUMENTOS',
  'SINISTRO',
  'ASSISTENCIA',
  'CLIENTE',
  'EMPRESA',
  'OUTRO',
]

function numeroSeguro(valor: unknown): number {
  if (valor === null || valor === undefined) {
    return 0
  }

  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function normalizarConfig(data: any): StorageConfig {
  return {
    id: data.id,
    corretora_id: data.corretora_id,
    limite_bytes: numeroSeguro(data.limite_bytes),
    max_file_size_bytes:
      data.max_file_size_bytes === null
        ? null
        : numeroSeguro(data.max_file_size_bytes),
    liberar_excedente: Boolean(data.liberar_excedente),
    ativo: Boolean(data.ativo),
    metadata: data.metadata ?? {},
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function normalizarResumo(
  data: any | null,
  corretoraId: string
): StorageResumo {
  return {
    corretora_id: corretoraId,
    total_arquivos: numeroSeguro(data?.total_arquivos),
    usado_bytes: numeroSeguro(data?.usado_bytes),
    whatsapp_bytes: numeroSeguro(data?.whatsapp_bytes),
    documentos_bytes: numeroSeguro(data?.documentos_bytes),
    sinistros_bytes: numeroSeguro(data?.sinistros_bytes),
    assistencias_bytes: numeroSeguro(data?.assistencias_bytes),
    imagens_bytes: numeroSeguro(data?.imagens_bytes),
    audios_bytes: numeroSeguro(data?.audios_bytes),
    videos_bytes: numeroSeguro(data?.videos_bytes),
    documentos_tipo_bytes: numeroSeguro(data?.documentos_tipo_bytes),
  }
}

function normalizarArquivo(data: any): StorageArquivo {
  return {
    id: data.id,
    corretora_id: data.corretora_id,
    corretor_id: data.corretor_id ?? null,
    criado_por_id: data.criado_por_id,
    nome_original: data.nome_original,
    mime_type: data.mime_type,
    tamanho_bytes: numeroSeguro(data.tamanho_bytes),
    tipo_arquivo: data.tipo_arquivo,
    origem: data.origem,
    origem_id: data.origem_id,
    crm_pessoa_id: data.crm_pessoa_id,
    crm_empresa_id: data.crm_empresa_id,
    storage_provider: data.storage_provider,
    bucket: data.bucket,
    storage_path: data.storage_path,
    status: data.status,
    excluido_em: data.excluido_em,
    excluido_por_id: data.excluido_por_id,
    metadata: data.metadata ?? {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    contexto: null,
  }
}

export interface StorageCorretor {
  id: string
  nome: string
}

export async function buscarStorageConfig(
  corretoraId: string
): Promise<StorageConfig> {
  if (!corretoraId) {
    throw new Error('Corretora não informada.')
  }

  const { data, error } = await supabase
    .from('crm_storage_config')
    .select('*')
    .eq('corretora_id', corretoraId)
    .eq('ativo', true)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Não foi possível carregar a configuração de armazenamento: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      'A corretora não possui uma configuração de armazenamento ativa.'
    )
  }

  return normalizarConfig(data)
}

export async function buscarStorageResumo(
  corretoraId: string
): Promise<StorageResumo> {
  if (!corretoraId) {
    throw new Error('Corretora não informada.')
  }

  const { data, error } = await supabase
    .from('crm_storage_resumo')
    .select('*')
    .eq('corretora_id', corretoraId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Não foi possível carregar o resumo de armazenamento: ${error.message}`
    )
  }

  return normalizarResumo(data, corretoraId)
}

export async function buscarStorageResumoSubcategorias(
  corretoraId: string
): Promise<StorageResumoSubcategoria[]> {
  if (!corretoraId) {
    throw new Error('Corretora não informada.')
  }

  const { data, error } = await supabase.rpc(
    'crm_storage_resumo_subcategorias',
    {
      p_corretora_id: corretoraId,
    }
  )

  if (error) {
    throw new Error(
      `Não foi possível carregar as subcategorias do armazenamento: ${error.message}`
    )
  }

  return (data ?? []).map((item: any) => ({
    origem: item.origem as StorageOrigem,

    tipo_arquivo:
      item.tipo_arquivo as StorageClassificacaoArquivo,

    categoria_documento:
      item.categoria_documento
        ? (item.categoria_documento as StorageCategoriaDocumento)
        : null,

    tipo_titular_documento:
      item.tipo_titular_documento
        ? (item.tipo_titular_documento as StorageTipoTitularDocumento)
        : null,

    total_arquivos:
      numeroSeguro(item.total_arquivos),

    tamanho_bytes:
      numeroSeguro(item.tamanho_bytes),
  }))
}

function montarConsumoPorOrigem(
  subcategorias: StorageResumoSubcategoria[]
): StorageConsumoOrigem[] {
  const consumo = new Map<
    StorageOrigem,
    StorageConsumoOrigem
  >()

  for (const origem of ORIGENS) {
    consumo.set(origem, {
      origem,
      total_arquivos: 0,
      tamanho_bytes: 0,
    })
  }

  for (const item of subcategorias) {
    const atual = consumo.get(item.origem)

    if (!atual) {
      continue
    }

    atual.total_arquivos +=
      item.total_arquivos

    atual.tamanho_bytes +=
      item.tamanho_bytes
  }

  return ORIGENS.map(
    origem => consumo.get(origem)!
  )
}

export async function buscarStorageDashboard(
  corretoraId: string
): Promise<StorageDashboard> {
  if (!corretoraId) {
    throw new Error('Corretora não informada.')
  }

  const [
    config,
    resumo,
    subcategorias,
  ] = await Promise.all([
    buscarStorageConfig(corretoraId),
    buscarStorageResumo(corretoraId),
    buscarStorageResumoSubcategorias(
      corretoraId
    ),
  ])

  const limiteBytes =
    config.limite_bytes

  const usadoBytes =
    resumo.usado_bytes

  const disponivelBytes =
    Math.max(
      0,
      limiteBytes - usadoBytes
    )

  const percentualUsado =
    limiteBytes > 0
      ? Math.min(
          100,
          (usadoBytes / limiteBytes) * 100
        )
      : 0

  const consumoPorOrigem =
    montarConsumoPorOrigem(
      subcategorias
    )

  return {
    config,
    resumo,
    limite_bytes: limiteBytes,
    usado_bytes: usadoBytes,
    disponivel_bytes:
      disponivelBytes,
    percentual_usado:
      percentualUsado,
    total_arquivos:
      resumo.total_arquivos,
    consumo_por_origem:
      consumoPorOrigem,
    subcategorias,
  }
}

export async function buscarStorageDashboardCarteira(
  corretoraId: string,
  corretorId?: string | null
): Promise<StorageDashboardCarteira> {
  if (!corretoraId) {
    throw new Error(
      'Corretora não informada.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'crm_storage_dashboard_carteira',
    {
      p_corretora_id:
        corretoraId,

      p_corretor_id:
        corretorId || null,
    }
  )

  if (error) {
    throw new Error(
      `Não foi possível carregar o dashboard da carteira: ${error.message}`
    )
  }

  const payload =
    data && typeof data === 'object'
      ? data as Record<string, any>
      : {}

  const subcategorias:
    StorageResumoSubcategoria[] =
    Array.isArray(
      payload.subcategorias
    )
      ? payload.subcategorias.map(
          (item: any) => ({
            origem:
              item.origem as StorageOrigem,

            tipo_arquivo:
              item.tipo_arquivo as StorageClassificacaoArquivo,

            categoria_documento:
              item.categoria_documento
                ? item.categoria_documento as StorageCategoriaDocumento
                : null,

            tipo_titular_documento:
              item.tipo_titular_documento
                ? item.tipo_titular_documento as StorageTipoTitularDocumento
                : null,

            total_arquivos:
              numeroSeguro(
                item.total_arquivos
              ),

            tamanho_bytes:
              numeroSeguro(
                item.tamanho_bytes
              ),
          })
        )
      : []

  return {
    corretora_id:
      String(
        payload.corretora_id ||
        corretoraId
      ),

    corretor_id:
      payload.corretor_id
        ? String(
            payload.corretor_id
          )
        : null,

    escopo:
      payload.escopo ===
        'CORRETOR'
        ? 'CORRETOR'
        : 'CORRETORA',

    total_arquivos:
      numeroSeguro(
        payload.total_arquivos
      ),

    usado_bytes:
      numeroSeguro(
        payload.usado_bytes
      ),

    total_clientes:
      numeroSeguro(
        payload.total_clientes
      ),

    consumo_por_origem:
      montarConsumoPorOrigem(
        subcategorias
      ),

    subcategorias,
  }
}



function metadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function nomePessoa(row: any): string {
  const dados = row?.dados ?? {}

  return (
    dados.nome ||
    dados.nome_completo ||
    dados.nome_razao_social ||
    'Pessoa sem nome'
  )
}

function nomeEmpresa(row: any): string {
  const dados = row?.dados ?? {}

  return (
    dados.nome_fantasia ||
    dados.razao_social ||
    dados.nome_razao_social ||
    dados.nome ||
    'Empresa sem nome'
  )
}

async function enriquecerContextoArquivos(
  corretoraId: string,
  arquivos: StorageArquivo[]
): Promise<StorageArquivo[]> {
  if (arquivos.length === 0) return arquivos

  const pessoaIds = Array.from(
    new Set(
      arquivos
        .map(item => item.crm_pessoa_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const empresaIds = Array.from(
    new Set(
      arquivos
        .map(item => item.crm_empresa_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const whatsappContatoIds = Array.from(
    new Set(
      arquivos
        .map(item =>
          metadataString(
            item.metadata,
            'whatsapp_contato_id'
          )
        )
        .filter((id): id is string => Boolean(id))
    )
  )

  const [pessoasResult, empresasResult, contatosResult] =
    await Promise.all([
      pessoaIds.length > 0
        ? supabase
            .from('crm_pessoas')
            .select('id, cpf, dados')
            .eq('corretora_id', corretoraId)
            .in('id', pessoaIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      empresaIds.length > 0
        ? supabase
            .from('crm_empresas')
            .select('id, cnpj, dados')
            .eq('corretora_id', corretoraId)
            .in('id', empresaIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      whatsappContatoIds.length > 0
        ? supabase
            .from('whatsapp_contatos')
            .select('id, nome, telefone')
            .eq('corretora_id', corretoraId)
            .in('id', whatsappContatoIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ])

  if (pessoasResult.error) {
    throw new Error(
      `Não foi possível carregar os clientes relacionados aos arquivos: ${pessoasResult.error.message}`
    )
  }

  if (empresasResult.error) {
    throw new Error(
      `Não foi possível carregar as empresas relacionadas aos arquivos: ${empresasResult.error.message}`
    )
  }

  if (contatosResult.error) {
    throw new Error(
      `Não foi possível carregar os contatos WhatsApp relacionados aos arquivos: ${contatosResult.error.message}`
    )
  }

  const pessoas = new Map(
    (pessoasResult.data ?? []).map(
      (item: any) => [item.id, item]
    )
  )

  const empresas = new Map(
    (empresasResult.data ?? []).map(
      (item: any) => [item.id, item]
    )
  )

  const contatos = new Map(
    (contatosResult.data ?? []).map(
      (item: any) => [item.id, item]
    )
  )

  return arquivos.map(arquivo => {
    const pessoa = arquivo.crm_pessoa_id
      ? pessoas.get(arquivo.crm_pessoa_id)
      : null

    const empresa = arquivo.crm_empresa_id
      ? empresas.get(arquivo.crm_empresa_id)
      : null

    const whatsappContatoId =
      metadataString(
        arquivo.metadata,
        'whatsapp_contato_id'
      )

    const contato = whatsappContatoId
      ? contatos.get(whatsappContatoId)
      : null

    const whatsappConversaId =
      metadataString(
        arquivo.metadata,
        'whatsapp_conversa_id'
      )

    const whatsappMensagemId =
      metadataString(
        arquivo.metadata,
        'whatsapp_mensagem_id'
      )

    const directionMetadata =
      metadataString(
        arquivo.metadata,
        'whatsapp_direction'
      )

    const whatsappDirection =
      directionMetadata === 'inbound' ||
      directionMetadata === 'outbound'
        ? directionMetadata
        : null

    let titulo = 'Arquivo sem vínculo'
    let subtitulo: string | null = null
    let documento: string | null = null
    let telefone: string | null = null

    if (arquivo.origem === 'WHATSAPP') {
      telefone =
        contato?.telefone ?? null

      titulo =
        contato?.nome ||
        contato?.telefone ||
        'Contato WhatsApp'

      subtitulo =
        whatsappDirection === 'outbound'
          ? 'Enviada pela corretora'
          : whatsappDirection === 'inbound'
            ? 'Recebida do contato'
            : 'Arquivo da conversa'
    } else if (arquivo.origem === 'SINISTRO') {
      if (pessoa) {
        titulo = nomePessoa(pessoa)
        documento = pessoa.cpf ?? null
      } else if (empresa) {
        titulo = nomeEmpresa(empresa)
        documento = empresa.cnpj ?? null
      } else {
        titulo = 'Sinistro'
      }

      subtitulo = 'Arquivo vinculado ao sinistro'
    } else if (arquivo.origem === 'ASSISTENCIA') {
      if (pessoa) {
        titulo = nomePessoa(pessoa)
        documento = pessoa.cpf ?? null
      } else if (empresa) {
        titulo = nomeEmpresa(empresa)
        documento = empresa.cnpj ?? null
      } else {
        titulo = 'Assistência'
      }

      subtitulo =
        'Arquivo vinculado à assistência'
    } else if (
      arquivo.origem === 'CLIENTE'
    ) {
      if (pessoa) {
        titulo = nomePessoa(pessoa)
        documento = pessoa.cpf ?? null
      } else {
        titulo = 'Cliente'
      }

      subtitulo = 'Documento do cliente'
    } else if (
      arquivo.origem === 'EMPRESA'
    ) {
      if (empresa) {
        titulo = nomeEmpresa(empresa)
        documento = empresa.cnpj ?? null
      } else {
        titulo = 'Empresa'
      }

      const titular =
        metadataString(
          arquivo.metadata,
          'tipo_titular_documento'
        )

      subtitulo =
        titular === 'SOCIO_REPRESENTANTE'
          ? 'Documento de sócio / representante'
          : 'Documento da empresa'
    } else if (
      arquivo.origem === 'DOCUMENTOS'
    ) {
      if (pessoa) {
        titulo = nomePessoa(pessoa)
        documento = pessoa.cpf ?? null
      } else if (empresa) {
        titulo = nomeEmpresa(empresa)
        documento = empresa.cnpj ?? null
      } else {
        titulo = 'Documentos'
      }

      subtitulo =
        'Documento comercial / securitário'
    } else {
      titulo = 'Outro arquivo'
      subtitulo =
        metadataString(
          arquivo.metadata,
          'descricao'
        ) ||
        metadataString(
          arquivo.metadata,
          'contexto_upload'
        )
    }

    return {
      ...arquivo,
      contexto: {
        tipo: arquivo.origem,
        titulo,
        subtitulo,
        documento,
        whatsappContatoId,
        whatsappConversaId,
        whatsappMensagemId,
        whatsappDirection,
        telefone,
        crmPessoaId:
          arquivo.crm_pessoa_id,
        crmEmpresaId:
          arquivo.crm_empresa_id,
        origemId:
          arquivo.origem_id,
      },
    }
  })
}

export async function listarStorageArquivos(
  corretoraId: string,
  filtros: StorageFiltros = {}
): Promise<StorageArquivosPaginados> {
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
      filtros.por_pagina ?? 20
    )
  )

  const inicio =
    (pagina - 1) * porPagina

  const fim =
    inicio + porPagina - 1

  let query = supabase
    .from(
      'crm_arquivos_com_responsavel'
    )
    .select(
      '*',
      {
        count: 'exact',
      }
    )
    .eq(
      'corretora_id',
      corretoraId
    )

  if (filtros.corretor_id) {
    query = query.eq(
      'corretor_id',
      filtros.corretor_id
    )
  }

  if (filtros.status) {
    query = query.eq(
      'status',
      filtros.status
    )
  } else {
    query = query.eq(
      'status',
      'ATIVO'
    )
  }

  if (filtros.origem) {
    query = query.eq(
      'origem',
      filtros.origem
    )
  }

  if (filtros.tipo_arquivo) {
    query = query.eq(
      'tipo_arquivo',
      filtros.tipo_arquivo
    )
  }

  if (
    filtros.gravacao_ligacao === true
  ) {
    query = query.contains(
      'metadata',
      {
        tipo_registro:
          'GRAVACAO_LIGACAO',
      }
    )
  }

  if (
    filtros.gravacao_ligacao ===
      false &&
    filtros.origem ===
      'WHATSAPP' &&
    filtros.tipo_arquivo ===
      'AUDIO'
  ) {
    query = query.not(
      'metadata',
      'cs',
      '{"tipo_registro":"GRAVACAO_LIGACAO"}'
    )
  }

  if (
    filtros.categoria_documento
  ) {
    query = query.contains(
      'metadata',
      {
        categoria_documento:
          filtros.categoria_documento,
      }
    )
  }

  if (
    filtros.tipo_titular_documento
  ) {
    query = query.contains(
      'metadata',
      {
        tipo_titular_documento:
          filtros.tipo_titular_documento,
      }
    )
  }

  const busca =
    filtros.busca?.trim()

  if (busca) {
    const buscaSegura =
      busca
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/,/g, ' ')

    query = query.ilike(
      'nome_original',
      `%${buscaSegura}%`
    )
  }

  const {
    data,
    error,
    count,
  } = await query
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .range(
      inicio,
      fim
    )

  if (error) {
    throw new Error(
      `Não foi possível carregar os arquivos: ${error.message}`
    )
  }

  const total =
    count ?? 0

  const arquivosNormalizados =
    (data ?? []).map(
      normalizarArquivo
    )

  const arquivos =
    await enriquecerContextoArquivos(
      corretoraId,
      arquivosNormalizados
    )

  return {
    arquivos,
    total,
    pagina,
    por_pagina: porPagina,
    total_paginas:
      Math.ceil(
        total / porPagina
      ),
  }
}

export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  const indice = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    unidades.length - 1
  )

  const valor = bytes / Math.pow(1024, indice)

  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: indice === 0 ? 0 : 1,
    maximumFractionDigits: indice === 0 ? 0 : 2,
  })} ${unidades[indice]}`
}

export async function criarUrlLeituraStorage(
  storagePath: string
): Promise<string> {
  if (!storagePath?.trim()) {
    throw new Error('Caminho do arquivo não informado.')
  }

  const { data, error } = await supabase.functions.invoke('b2-media', {
    body: {
      action: 'create-read',
      storagePath: storagePath.trim(),
    },
  })

  if (error) {
    throw new Error(
      `Não foi possível gerar o acesso ao arquivo: ${error.message}`
    )
  }

  if (!data?.success || !data?.readUrl) {
    throw new Error(
      data?.error || 'Não foi possível gerar o acesso ao arquivo.'
    )
  }

  return data.readUrl
}

export interface StorageExclusaoResultado {
  success: boolean
  arquivoId: string
  storagePath: string
  versionsDeleted: number
  physicalDeleted: boolean
  catalogUpdated: boolean
  status: StorageStatus
  excluidoEm: string | null
}

export async function excluirArquivoStorage(
  arquivoId: string
): Promise<StorageExclusaoResultado> {
  const id = arquivoId?.trim()

  if (!id) {
    throw new Error('Arquivo não informado.')
  }

  const { data, error } = await supabase.functions.invoke('b2-media', {
    body: {
      action: 'delete',
      arquivoId: id,
    },
  })

  if (error) {
    console.error('Erro ao excluir arquivo do armazenamento:', error)

    throw new Error(
      data?.error ||
        'Não foi possível excluir o arquivo do armazenamento.'
    )
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        'Não foi possível excluir o arquivo do armazenamento.'
    )
  }

  if (!data?.physicalDeleted) {
    throw new Error(
      'A exclusão física do arquivo não foi confirmada.'
    )
  }

  if (!data?.catalogUpdated) {
    throw new Error(
      'O arquivo foi removido fisicamente, mas o catálogo não foi atualizado.'
    )
  }

  return {
    success: true,
    arquivoId: String(data.arquivoId ?? id),
    storagePath: String(data.storagePath ?? ''),
    versionsDeleted: numeroSeguro(data.versionsDeleted),
    physicalDeleted: true,
    catalogUpdated: true,
    status: data.status as StorageStatus,
    excluidoEm:
      typeof data.excluidoEm === 'string'
        ? data.excluidoEm
        : null,
  }
}

export async function listarCorretoresStorage(
  corretoraId: string
): Promise<StorageCorretor[]> {
  if (!corretoraId) {
    throw new Error(
      'Corretora não informada.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('usuarios_perfis')
    .select(`
      id,
      nome
    `)
    .eq(
      'corretora_id',
      corretoraId
    )
    .eq(
      'tipo_usuario',
      'CORRETOR'
    )
    .eq(
      'ativo',
      true
    )
    .order(
      'nome',
      {
        ascending: true,
      }
    )

  if (error) {
    throw new Error(
      `Não foi possível carregar os corretores: ${error.message}`
    )
  }

  return (
    data ?? []
  ).map(
    (item: any) => ({
      id: item.id,
      nome:
        item.nome ||
        'Corretor sem nome',
    })
  )
}