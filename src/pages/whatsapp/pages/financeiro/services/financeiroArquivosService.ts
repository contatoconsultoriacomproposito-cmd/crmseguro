import { supabase } from "../../../../../lib/supabaseClient";

export type FinanceiroTipoOrigem =
  | 'CONTAS_PAGAR'
  | 'CONTAS_RECEBER';

export type FinanceiroContextoArquivo =
  | 'LANCAMENTO'
  | 'BAIXA';

export type FinanceiroTipoArquivo =
  | 'IMAGEM'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENTO'
  | 'OUTRO';

export interface FinanceiroArquivoMetadata {
  modulo?: string | null;

  tipo_origem?: FinanceiroTipoOrigem | string | null;

  contexto_financeiro?:
    | FinanceiroContextoArquivo
    | string
    | null;

  lancamento_id?: string | null;

  baixa_id?: string | null;

  baixa_status?: string | null;

  descricao_lancamento?: string | null;

  cliente_tipo?: 'PF' | 'PJ' | string | null;

  cliente_id?: string | null;

  proposta_id?: string | null;

  proposta_numero?: string | null;

  contrato_id?: string | null;

  contrato_numero?: string | null;

  enviado_por_id?: string | null;

  finalizado_em?: string | null;

  [key: string]: unknown;
}

export interface FinanceiroArquivo {
  id: string;

  corretora_id: string;

  criado_por_id: string | null;

  nome_original: string;

  mime_type: string | null;

  tamanho_bytes: number;

  tipo_arquivo: FinanceiroTipoArquivo;

  origem: FinanceiroTipoOrigem;

  origem_id: string;

  crm_pessoa_id: string | null;

  crm_empresa_id: string | null;

  storage_provider: string;

  bucket: string | null;

  storage_path: string;

  status: 'ATIVO' | 'EXCLUIDO' | string;

  metadata: FinanceiroArquivoMetadata;

  created_at: string;

  updated_at?: string | null;
}

export interface ListarFinanceiroArquivosParams {
  tipoOrigem: FinanceiroTipoOrigem;

  lancamentoId: string;

  contextoFinanceiro:
    FinanceiroContextoArquivo;

  baixaId?: string | null;
}

export interface UploadFinanceiroArquivoParams
  extends ListarFinanceiroArquivosParams {
  file: File;
}

interface FinanceiroCreateUploadResponse {
  success: boolean;

  action?: string;

  tipoOrigem?: FinanceiroTipoOrigem;

  contextoFinanceiro?:
    FinanceiroContextoArquivo;

  lancamentoId?: string;

  baixaId?: string | null;

  storagePath?: string;

  uploadUrl?: string;

  uploadExpiresIn?: number;

  error?: string;

  code?: string;
}

interface FinanceiroFinalizeResponse {
  success: boolean;

  action?: string;

  arquivo?: FinanceiroArquivo;

  alreadyFinalized?: boolean;

  error?: string;

  code?: string;
}

function validarParametrosBase(
  params: ListarFinanceiroArquivosParams
): void {
  if (
    params.tipoOrigem !==
      'CONTAS_PAGAR' &&
    params.tipoOrigem !==
      'CONTAS_RECEBER'
  ) {
    throw new Error(
      'Origem financeira inválida.'
    );
  }

  if (!params.lancamentoId?.trim()) {
    throw new Error(
      'Lançamento financeiro não informado.'
    );
  }

  if (
    params.contextoFinanceiro !==
      'LANCAMENTO' &&
    params.contextoFinanceiro !==
      'BAIXA'
  ) {
    throw new Error(
      'Contexto financeiro inválido.'
    );
  }

  if (
    params.contextoFinanceiro ===
      'BAIXA' &&
    !params.baixaId?.trim()
  ) {
    throw new Error(
      'Baixa financeira não informada.'
    );
  }
}

function normalizarNumero(
  valor: unknown
): number {
  const numero =
    Number(valor ?? 0);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function normalizarMetadata(
  valor: unknown
): FinanceiroArquivoMetadata {
  if (
    valor &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  ) {
    return valor as FinanceiroArquivoMetadata;
  }

  return {};
}

function normalizarArquivo(
  row: any
): FinanceiroArquivo {
  return {
    id:
      String(row.id),

    corretora_id:
      String(row.corretora_id),

    criado_por_id:
      row.criado_por_id
        ? String(row.criado_por_id)
        : null,

    nome_original:
      String(
        row.nome_original ?? ''
      ),

    mime_type:
      typeof row.mime_type === 'string'
        ? row.mime_type
        : null,

    tamanho_bytes:
      normalizarNumero(
        row.tamanho_bytes
      ),

    tipo_arquivo:
      row.tipo_arquivo as FinanceiroTipoArquivo,

    origem:
      row.origem as FinanceiroTipoOrigem,

    origem_id:
      String(row.origem_id),

    crm_pessoa_id:
      row.crm_pessoa_id
        ? String(row.crm_pessoa_id)
        : null,

    crm_empresa_id:
      row.crm_empresa_id
        ? String(row.crm_empresa_id)
        : null,

    storage_provider:
      String(
        row.storage_provider ?? ''
      ),

    bucket:
      typeof row.bucket === 'string'
        ? row.bucket
        : null,

    storage_path:
      String(
        row.storage_path ?? ''
      ),

    status:
      String(
        row.status ?? ''
      ),

    metadata:
      normalizarMetadata(
        row.metadata
      ),

    created_at:
      String(
        row.created_at ?? ''
      ),

    updated_at:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : null,
  };
}

/*
 * =========================================================
 * LISTAGEM
 * =========================================================
 *
 * origem/origem_id continuam apontando para o lançamento.
 *
 * A separação entre:
 *
 * - LANCAMENTO
 * - BAIXA
 *
 * acontece pelo metadata.
 *
 * Arquivos financeiros antigos, criados antes da existência
 * de contexto_financeiro, são considerados anexos do
 * lançamento para manter compatibilidade.
 */
export async function listarFinanceiroArquivos(
  params: ListarFinanceiroArquivosParams
): Promise<FinanceiroArquivo[]> {
  validarParametrosBase(params);

  const {
    data,
    error,
  } = await supabase
    .from('crm_arquivos')
    .select(`
      id,
      corretora_id,
      criado_por_id,
      nome_original,
      mime_type,
      tamanho_bytes,
      tipo_arquivo,
      origem,
      origem_id,
      crm_pessoa_id,
      crm_empresa_id,
      storage_provider,
      bucket,
      storage_path,
      status,
      metadata,
      created_at,
      updated_at
    `)
    .eq(
      'origem',
      params.tipoOrigem
    )
    .eq(
      'origem_id',
      params.lancamentoId
    )
    .eq(
      'status',
      'ATIVO'
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      '[FinanceiroArquivos] Erro ao listar arquivos:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível carregar os anexos.'
    );
  }

  const arquivos =
    (data ?? []).map(
      normalizarArquivo
    );

  if (
    params.contextoFinanceiro ===
    'BAIXA'
  ) {
    const baixaId =
      params.baixaId?.trim();

    return arquivos.filter(
      (arquivo) => {
        const metadata =
          arquivo.metadata;

        return (
          metadata.contexto_financeiro ===
            'BAIXA' &&
          metadata.baixa_id ===
            baixaId
        );
      }
    );
  }

  /*
   * Arquivo antigo:
   *
   * metadata.contexto_financeiro ausente
   *
   * => considera como anexo do lançamento.
   */
  return arquivos.filter(
    (arquivo) =>
      arquivo.metadata
        .contexto_financeiro !==
      'BAIXA'
  );
}

/*
 * =========================================================
 * UPLOAD
 * =========================================================
 */
export async function enviarFinanceiroArquivo(
  params: UploadFinanceiroArquivoParams
): Promise<FinanceiroArquivo> {
  validarParametrosBase(params);

  const file =
    params.file;

  if (!file) {
    throw new Error(
      'Arquivo não informado.'
    );
  }

  if (
    !Number.isSafeInteger(
      file.size
    ) ||
    file.size <= 0
  ) {
    throw new Error(
      'O arquivo selecionado está vazio ou possui tamanho inválido.'
    );
  }

  const mimeType =
    file.type?.trim() ||
    'application/octet-stream';

  /*
   * 1. Solicita URL assinada.
   */
  const {
    data: createData,
    error: createError,
  } = await supabase.functions.invoke(
    'b2-media',
    {
      body: {
        action:
          'financeiro-create-upload',

        tipoOrigem:
          params.tipoOrigem,

        contextoFinanceiro:
          params.contextoFinanceiro,

        lancamentoId:
          params.lancamentoId,

        baixaId:
          params.contextoFinanceiro ===
          'BAIXA'
            ? params.baixaId
            : undefined,

        fileName:
          file.name,

        mimeType,

        fileSize:
          file.size,
      },
    }
  );

  const createResponse =
    createData as
      | FinanceiroCreateUploadResponse
      | null;

  if (
    createError ||
    !createResponse?.success ||
    !createResponse.uploadUrl ||
    !createResponse.storagePath
  ) {
    console.error(
      '[FinanceiroArquivos] Erro no create-upload:',
      createError,
      createResponse
    );

    throw new Error(
      createResponse?.error ||
        createError?.message ||
        'Não foi possível preparar o upload do arquivo.'
    );
  }

  /*
   * 2. Upload físico para o Backblaze.
   */
  const putResponse =
    await fetch(
      createResponse.uploadUrl,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            mimeType,
        },

        body: file,
      }
    );

  if (!putResponse.ok) {
    let detalhe = '';

    try {
      detalhe =
        await putResponse.text();
    } catch {
      detalhe = '';
    }

    console.error(
      '[FinanceiroArquivos] Erro no PUT B2:',
      putResponse.status,
      detalhe
    );

    throw new Error(
      `Não foi possível enviar o arquivo para o armazenamento (${putResponse.status}).`
    );
  }

  /*
   * 3. Finaliza e cataloga.
   */
  const {
    data: finalizeData,
    error: finalizeError,
  } = await supabase.functions.invoke(
    'b2-media',
    {
      body: {
        action:
          'financeiro-finalize',

        tipoOrigem:
          params.tipoOrigem,

        contextoFinanceiro:
          params.contextoFinanceiro,

        lancamentoId:
          params.lancamentoId,

        baixaId:
          params.contextoFinanceiro ===
          'BAIXA'
            ? params.baixaId
            : undefined,

        storagePath:
          createResponse.storagePath,

        fileName:
          file.name,

        mimeType,
      },
    }
  );

  const finalizeResponse =
    finalizeData as
      | FinanceiroFinalizeResponse
      | null;

  if (
    finalizeError ||
    !finalizeResponse?.success ||
    !finalizeResponse.arquivo
  ) {
    console.error(
      '[FinanceiroArquivos] Erro no finalize:',
      finalizeError,
      finalizeResponse
    );

    throw new Error(
      finalizeResponse?.error ||
        finalizeError?.message ||
        'O arquivo foi enviado, mas não foi possível finalizar o cadastro.'
    );
  }

  return normalizarArquivo(
    finalizeResponse.arquivo
  );
}

/*
 * =========================================================
 * URL DE LEITURA
 * =========================================================
 */
export async function criarUrlLeituraFinanceiroArquivo(
  storagePath: string
): Promise<string> {
  const caminho =
    storagePath?.trim();

  if (!caminho) {
    throw new Error(
      'Caminho do arquivo não informado.'
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'b2-media',
    {
      body: {
        action:
          'create-read',

        storagePath:
          caminho,
      },
    }
  );

  if (
    error ||
    !data?.success ||
    !data?.readUrl
  ) {
    console.error(
      '[FinanceiroArquivos] Erro ao gerar URL de leitura:',
      error,
      data
    );

    throw new Error(
      data?.error ||
        error?.message ||
        'Não foi possível abrir o arquivo.'
    );
  }

  return String(
    data.readUrl
  );
}

/*
 * =========================================================
 * EXCLUSÃO
 * =========================================================
 */
export async function excluirFinanceiroArquivo(
  arquivoId: string
): Promise<void> {
  const id =
    arquivoId?.trim();

  if (!id) {
    throw new Error(
      'Arquivo não informado.'
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'b2-media',
    {
      body: {
        action:
          'delete',

        arquivoId:
          id,
      },
    }
  );

  if (
    error ||
    !data?.success
  ) {
    console.error(
      '[FinanceiroArquivos] Erro ao excluir arquivo:',
      error,
      data
    );

    throw new Error(
      data?.error ||
        error?.message ||
        'Não foi possível excluir o arquivo.'
    );
  }

  if (
    data.physicalDeleted !== true
  ) {
    throw new Error(
      'A exclusão física do arquivo não foi confirmada.'
    );
  }

  if (
    data.catalogUpdated !== true
  ) {
    throw new Error(
      'O arquivo foi removido, mas o catálogo não foi atualizado.'
    );
  }
}

/*
 * =========================================================
 * FORMATADORES
 * =========================================================
 */
export function formatarTamanhoFinanceiroArquivo(
  bytes: number
): string {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return '0 B';
  }

  const unidades = [
    'B',
    'KB',
    'MB',
    'GB',
    'TB',
  ];

  const indice =
    Math.min(
      Math.floor(
        Math.log(bytes) /
          Math.log(1024)
      ),
      unidades.length - 1
    );

  const valor =
    bytes /
    Math.pow(
      1024,
      indice
    );

  return `${valor.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        indice === 0
          ? 0
          : 1,

      maximumFractionDigits:
        indice === 0
          ? 0
          : 2,
    }
  )} ${unidades[indice]}`;
}

export function formatarDataFinanceiroArquivo(
  valor: string | null | undefined
): string {
  if (!valor) {
    return '-';
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  ).format(data);
}