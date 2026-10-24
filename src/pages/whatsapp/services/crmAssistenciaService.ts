import { supabase } from "../../../lib/supabaseClient";

export type CrmAssistenciaStatus =
  | "SOLICITADA"
  | "AGUARDANDO_SEGURADORA"
  | "AGUARDANDO_PRESTADOR"
  | "AGENDADA"
  | "EM_ATENDIMENTO"
  | "CONCLUIDA"
  | "CANCELADA"
  | "NAO_ATENDIDA";

export type CrmPrioridade =
  | "BAIXA"
  | "NORMAL"
  | "ALTA"
  | "URGENTE";

export interface CrmAssistencia {
  id: string;
  corretora_id: string;
  responsavel_id: string | null;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  cliente_id_legado: string | null;
  item_id: string | null;
  crm_proposta_item_id: string | null;
  tipo_assistencia: string;
  descricao_solicitacao: string | null;
  protocolo: string | null;
  numero_atendimento: string | null;
  solicitado_em: string;
  prestador_nome: string | null;
  prestador_telefone: string | null;
  previsao_atendimento_em: string | null;
  atendimento_iniciado_em: string | null;
  atendimento_concluido_em: string | null;
  status: CrmAssistenciaStatus;
  observacoes: string | null;
  dados_especificos: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CrmAssistenciaOcorrencia {
  id: string;
  assistencia_id: string;
  corretora_id: string;
  responsavel_id: string | null;
  tipo_ocorrencia: string | null;
  relato: string;
  protocolo: string | null;
  ocorrido_em: string;
  created_at: string;
  updated_at: string;
}

export interface CrmEventoAnexo {
  id: string;
  corretora_id: string;
  enviado_por_id: string | null;
  tipo_origem: "ASSISTENCIA" | "ASSISTENCIA_OCORRENCIA";
  origem_id: string;
  tipo_documento: string | null;
  nome_arquivo: string;
  mime_type: string | null;
  tamanho: number | null;
  storage_path: string;
  descricao: string | null;
  created_at: string;
}

export interface CrmAgendaEvento {
  id: string;
  corretora_id: string;
  responsavel_id: string | null;
  criado_por_id: string | null;
  natureza: "COMPROMISSO" | "INFORMATIVO";
  categoria: string;
  titulo: string;
  descricao: string | null;
  inicio_em: string;
  fim_em: string | null;
  dia_inteiro: boolean;
  timezone: string;
  status: "PENDENTE" | "CONCLUIDO" | "CANCELADO";
  prioridade: CrmPrioridade;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  cliente_id_legado: string | null;
  tipo_origem: string;
  origem_id: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CriarAssistenciaPayload {
  corretora_id: string;
  responsavel_id?: string | null;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  cliente_id_legado?: string | null;
  item_id?: string | null;
  crm_proposta_item_id?: string | null;
  tipo_assistencia: string;
  descricao_solicitacao?: string | null;
  protocolo?: string | null;
  numero_atendimento?: string | null;
  solicitado_em?: string;
  prestador_nome?: string | null;
  prestador_telefone?: string | null;
  previsao_atendimento_em?: string | null;
  atendimento_iniciado_em?: string | null;
  atendimento_concluido_em?: string | null;
  status?: CrmAssistenciaStatus;
  observacoes?: string | null;
  dados_especificos?: Record<string, any>;
}

export interface AtualizarAssistenciaPayload {
  responsavel_id?: string | null;
  item_id?: string | null;
  crm_proposta_item_id?: string | null;
  tipo_assistencia?: string;
  descricao_solicitacao?: string | null;
  protocolo?: string | null;
  numero_atendimento?: string | null;
  solicitado_em?: string;
  prestador_nome?: string | null;
  prestador_telefone?: string | null;
  previsao_atendimento_em?: string | null;
  atendimento_iniciado_em?: string | null;
  atendimento_concluido_em?: string | null;
  status?: CrmAssistenciaStatus;
  observacoes?: string | null;
  dados_especificos?: Record<string, any>;
}

export interface CriarOcorrenciaAssistenciaPayload {
  assistencia_id: string;
  corretora_id: string;
  responsavel_id?: string | null;
  tipo_ocorrencia?: string | null;
  relato: string;
  protocolo?: string | null;
  ocorrido_em?: string;
}

export interface CriarCompromissoAssistenciaPayload {
  assistencia: CrmAssistencia;
  titulo: string;
  descricao?: string | null;
  inicio_em: string;
  fim_em?: string | null;
  dia_inteiro?: boolean;
  prioridade?: CrmPrioridade;
  ocorrencia_id?: string | null;
  criado_por_id?: string | null;
}

export interface EnviarAnexoAssistenciaPayload {
  arquivo: File;
  corretora_id: string;
  origem_id: string;
  tipo_origem:
    | "ASSISTENCIA"
    | "ASSISTENCIA_OCORRENCIA";
  enviado_por_id?: string | null;
  tipo_documento?: string | null;
  descricao?: string | null;
}

export interface CrmAssistenciaDossie {
  assistencia: CrmAssistencia;
  ocorrencias: CrmAssistenciaOcorrencia[];
  anexos: CrmEventoAnexo[];
  compromissos: CrmAgendaEvento[];
}



function removerUndefined<T extends Record<string, any>>(objeto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined)
  ) as Partial<T>;
}

function normalizarTexto(valor?: string | null): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto || null;
}



export async function criarAssistencia(
  payload: CriarAssistenciaPayload
): Promise<CrmAssistencia> {
  if (!payload.corretora_id) {
    throw new Error("Corretora não informada.");
  }

  if (!payload.tipo_assistencia?.trim()) {
    throw new Error("Informe o tipo da assistência.");
  }

  const possuiCliente =
    Boolean(payload.crm_pessoa_id) ||
    Boolean(payload.crm_empresa_id) ||
    Boolean(payload.cliente_id_legado);

  if (!possuiCliente) {
    throw new Error("A assistência precisa estar vinculada a um cliente.");
  }

  const quantidadeVinculos = [
    payload.crm_pessoa_id,
    payload.crm_empresa_id,
    payload.cliente_id_legado,
  ].filter(Boolean).length;

  if (quantidadeVinculos > 1) {
    throw new Error(
      "Informe somente um vínculo de cliente: pessoa, empresa ou cliente legado."
    );
  }

  const dados = removerUndefined({
    corretora_id: payload.corretora_id,
    responsavel_id: payload.responsavel_id ?? null,
    crm_pessoa_id: payload.crm_pessoa_id ?? null,
    crm_empresa_id: payload.crm_empresa_id ?? null,
    cliente_id_legado: payload.cliente_id_legado ?? null,
    item_id: payload.item_id ?? null,
    crm_proposta_item_id: payload.crm_proposta_item_id ?? null,
    tipo_assistencia: payload.tipo_assistencia.trim(),
    descricao_solicitacao: normalizarTexto(payload.descricao_solicitacao),
    protocolo: normalizarTexto(payload.protocolo),
    numero_atendimento: normalizarTexto(payload.numero_atendimento),
    solicitado_em: payload.solicitado_em ?? new Date().toISOString(),
    prestador_nome: normalizarTexto(payload.prestador_nome),
    prestador_telefone: normalizarTexto(payload.prestador_telefone),
    previsao_atendimento_em: payload.previsao_atendimento_em ?? null,
    atendimento_iniciado_em: payload.atendimento_iniciado_em ?? null,
    atendimento_concluido_em: payload.atendimento_concluido_em ?? null,
    status: payload.status ?? "SOLICITADA",
    observacoes: normalizarTexto(payload.observacoes),
    dados_especificos: payload.dados_especificos ?? {},
  });

  const { data, error } = await supabase
    .from("crm_assistencias")
    .insert(dados)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar assistência:", error);
    throw new Error(error.message || "Não foi possível criar a assistência.");
  }

  return data as CrmAssistencia;
}

export async function buscarAssistenciaPorId(
  assistenciaId: string
): Promise<CrmAssistencia | null> {
  if (!assistenciaId) {
    throw new Error("ID da assistência não informado.");
  }

  const { data, error } = await supabase
    .from("crm_assistencias")
    .select("*")
    .eq("id", assistenciaId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar assistência:", error);
    throw new Error(error.message || "Não foi possível buscar a assistência.");
  }

  return (data as CrmAssistencia | null) ?? null;
}

export async function buscarAssistenciasDoCliente(params: {
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  cliente_id_legado?: string | null;
}): Promise<CrmAssistencia[]> {
  const {
    crm_pessoa_id,
    crm_empresa_id,
    cliente_id_legado,
  } = params;

  if (!crm_pessoa_id && !crm_empresa_id && !cliente_id_legado) {
    return [];
  }

  const filtros: string[] = [];

  if (crm_pessoa_id) {
    filtros.push(`crm_pessoa_id.eq.${crm_pessoa_id}`);
  }

  if (crm_empresa_id) {
    filtros.push(`crm_empresa_id.eq.${crm_empresa_id}`);
  }

  if (cliente_id_legado) {
    filtros.push(`cliente_id_legado.eq.${cliente_id_legado}`);
  }

  let query = supabase
    .from("crm_assistencias")
    .select("*")
    .order("solicitado_em", { ascending: false });

  if (filtros.length === 1) {
    const [campo, , valor] = filtros[0].split(".");
    query = query.eq(campo, valor);
  } else {
    query = query.or(filtros.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar assistências do cliente:", error);
    throw new Error(
      error.message || "Não foi possível buscar as assistências do cliente."
    );
  }

  return (data ?? []) as CrmAssistencia[];
}

export async function atualizarAssistencia(
  assistenciaId: string,
  payload: AtualizarAssistenciaPayload
): Promise<CrmAssistencia> {
  if (!assistenciaId) {
    throw new Error("ID da assistência não informado.");
  }

  const dados = removerUndefined({
    responsavel_id: payload.responsavel_id,
    item_id: payload.item_id,
    crm_proposta_item_id: payload.crm_proposta_item_id,
    tipo_assistencia:
      payload.tipo_assistencia !== undefined
        ? payload.tipo_assistencia.trim()
        : undefined,
    descricao_solicitacao:
      payload.descricao_solicitacao !== undefined
        ? normalizarTexto(payload.descricao_solicitacao)
        : undefined,
    protocolo:
      payload.protocolo !== undefined
        ? normalizarTexto(payload.protocolo)
        : undefined,
    numero_atendimento:
      payload.numero_atendimento !== undefined
        ? normalizarTexto(payload.numero_atendimento)
        : undefined,
    solicitado_em: payload.solicitado_em,
    prestador_nome:
      payload.prestador_nome !== undefined
        ? normalizarTexto(payload.prestador_nome)
        : undefined,
    prestador_telefone:
      payload.prestador_telefone !== undefined
        ? normalizarTexto(payload.prestador_telefone)
        : undefined,
    previsao_atendimento_em: payload.previsao_atendimento_em,
    atendimento_iniciado_em: payload.atendimento_iniciado_em,
    atendimento_concluido_em: payload.atendimento_concluido_em,
    status: payload.status,
    observacoes:
      payload.observacoes !== undefined
        ? normalizarTexto(payload.observacoes)
        : undefined,
    dados_especificos: payload.dados_especificos,
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("crm_assistencias")
    .update(dados)
    .eq("id", assistenciaId)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao atualizar assistência:", error);
    throw new Error(
      error.message || "Não foi possível atualizar a assistência."
    );
  }

  return data as CrmAssistencia;
}

export async function criarOcorrenciaAssistencia(
  payload: CriarOcorrenciaAssistenciaPayload
): Promise<CrmAssistenciaOcorrencia> {
  if (!payload.assistencia_id) {
    throw new Error("Assistência não informada.");
  }

  if (!payload.corretora_id) {
    throw new Error("Corretora não informada.");
  }

  if (!payload.relato?.trim()) {
    throw new Error("Informe o relato da ocorrência.");
  }

  const { data, error } = await supabase
    .from("crm_assistencias_ocorrencias")
    .insert({
      assistencia_id: payload.assistencia_id,
      corretora_id: payload.corretora_id,
      responsavel_id: payload.responsavel_id ?? null,
      tipo_ocorrencia: normalizarTexto(payload.tipo_ocorrencia),
      relato: payload.relato.trim(),
      protocolo: normalizarTexto(payload.protocolo),
      ocorrido_em: payload.ocorrido_em ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar ocorrência da assistência:", error);
    throw new Error(
      error.message || "Não foi possível registrar a ocorrência."
    );
  }

  return data as CrmAssistenciaOcorrencia;
}

export async function buscarOcorrenciasAssistencia(
  assistenciaId: string
): Promise<CrmAssistenciaOcorrencia[]> {
  if (!assistenciaId) {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_assistencias_ocorrencias")
    .select("*")
    .eq("assistencia_id", assistenciaId)
    .order("ocorrido_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar ocorrências da assistência:", error);
    throw new Error(
      error.message || "Não foi possível buscar as ocorrências."
    );
  }

  return (data ?? []) as CrmAssistenciaOcorrencia[];
}

export async function criarCompromissoAssistencia(
  payload: CriarCompromissoAssistenciaPayload
): Promise<CrmAgendaEvento> {
  const { assistencia } = payload;

  if (!assistencia?.id) {
    throw new Error("Assistência não informada.");
  }

  if (!payload.titulo?.trim()) {
    throw new Error("Informe o título do compromisso.");
  }

  if (!payload.inicio_em) {
    throw new Error("Informe a data do compromisso.");
  }

  const tipoOrigem = payload.ocorrencia_id
    ? "ASSISTENCIA_OCORRENCIA"
    : "ASSISTENCIA";

  const origemId = payload.ocorrencia_id || assistencia.id;

  const { data, error } = await supabase
    .from("crm_agenda")
    .insert({
      corretora_id: assistencia.corretora_id,
      responsavel_id: assistencia.responsavel_id,
      criado_por_id: payload.criado_por_id ?? null,
      natureza: "COMPROMISSO",
      categoria: "ASSISTENCIA",
      titulo: payload.titulo.trim(),
      descricao: normalizarTexto(payload.descricao),
      inicio_em: payload.inicio_em,
      fim_em: payload.fim_em ?? null,
      dia_inteiro: payload.dia_inteiro ?? false,
      timezone: "America/Sao_Paulo",
      status: "PENDENTE",
      prioridade: payload.prioridade ?? "NORMAL",
      crm_pessoa_id: assistencia.crm_pessoa_id,
      crm_empresa_id: assistencia.crm_empresa_id,
      cliente_id_legado: assistencia.cliente_id_legado,
      tipo_origem: tipoOrigem,
      origem_id: origemId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar compromisso da assistência:", error);
    throw new Error(
      error.message || "Não foi possível criar o compromisso na agenda."
    );
  }

  return data as CrmAgendaEvento;
}

export async function buscarCompromissosAssistencia(
  assistenciaId: string,
  ocorrenciaIds: string[] = []
): Promise<CrmAgendaEvento[]> {
  if (!assistenciaId) {
    return [];
  }

  const filtros = [
    `and(tipo_origem.eq.ASSISTENCIA,origem_id.eq.${assistenciaId})`,
  ];

  for (const ocorrenciaId of ocorrenciaIds) {
    filtros.push(
      `and(tipo_origem.eq.ASSISTENCIA_OCORRENCIA,origem_id.eq.${ocorrenciaId})`
    );
  }

  const { data, error } = await supabase
    .from("crm_agenda")
    .select("*")
    .or(filtros.join(","))
    .order("inicio_em", { ascending: true });

  if (error) {
    console.error("Erro ao buscar compromissos da assistência:", error);
    throw new Error(
      error.message ||
        "Não foi possível buscar os compromissos da assistência."
    );
  }

  return (data ?? []) as CrmAgendaEvento[];
}

export async function concluirCompromissoAssistencia(
  compromissoId: string
): Promise<CrmAgendaEvento> {
  if (!compromissoId) {
    throw new Error("Compromisso não informado.");
  }

  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from("crm_agenda")
    .update({
      status: "CONCLUIDO",
      concluido_em: agora,
      cancelado_em: null,
      updated_at: agora,
    })
    .eq("id", compromissoId)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao concluir compromisso:", error);
    throw new Error(
      error.message || "Não foi possível concluir o compromisso."
    );
  }

  return data as CrmAgendaEvento;
}

export async function cancelarCompromissoAssistencia(
  compromissoId: string
): Promise<CrmAgendaEvento> {
  if (!compromissoId) {
    throw new Error("Compromisso não informado.");
  }

  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from("crm_agenda")
    .update({
      status: "CANCELADO",
      cancelado_em: agora,
      concluido_em: null,
      updated_at: agora,
    })
    .eq("id", compromissoId)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao cancelar compromisso:", error);
    throw new Error(
      error.message || "Não foi possível cancelar o compromisso."
    );
  }

  return data as CrmAgendaEvento;
}

type B2ArquivoEvento = {
  id: string;
  corretora_id: string;
  criado_por_id?: string | null;
  nome_original: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  tipo_arquivo?: string | null;
  origem: "SINISTRO" | "ASSISTENCIA";
  origem_id: string;
  storage_path: string;
  metadata?: Record<string, any> | null;
  created_at: string;
};

function mapearArquivoB2ParaAnexoAssistencia(
  arquivo: B2ArquivoEvento
): CrmEventoAnexo {
  const metadata =
    arquivo.metadata &&
    typeof arquivo.metadata === "object"
      ? arquivo.metadata
      : {};

  const tipoOrigem =
    metadata.tipo_origem === "ASSISTENCIA_OCORRENCIA"
      ? "ASSISTENCIA_OCORRENCIA"
      : "ASSISTENCIA";

  return {
    id: arquivo.id,
    corretora_id: arquivo.corretora_id,
    enviado_por_id:
      typeof metadata.enviado_por_id === "string"
        ? metadata.enviado_por_id
        : arquivo.criado_por_id ?? null,
    tipo_origem: tipoOrigem,
    origem_id: arquivo.origem_id,
    tipo_documento:
      typeof metadata.tipo_documento === "string"
        ? metadata.tipo_documento
        : null,
    nome_arquivo: arquivo.nome_original,
    mime_type: arquivo.mime_type ?? null,
    tamanho:
      typeof arquivo.tamanho_bytes === "number"
        ? arquivo.tamanho_bytes
        : null,
    storage_path: arquivo.storage_path,
    descricao:
      typeof metadata.descricao === "string"
        ? metadata.descricao
        : null,
    created_at: arquivo.created_at,
  };
}

function obterMensagemErroB2Assistencia(
  data: any,
  fallback: string
): string {
  if (
    data &&
    typeof data.error === "string" &&
    data.error.trim()
  ) {
    return data.error;
  }

  return fallback;
}

export async function enviarAnexoAssistencia(
  payload: EnviarAnexoAssistenciaPayload
): Promise<CrmEventoAnexo> {
  if (!payload.arquivo) {
    throw new Error("Arquivo não informado.");
  }

  if (!payload.corretora_id) {
    throw new Error("Corretora não informada.");
  }

  if (!payload.origem_id) {
    throw new Error("Origem do anexo não informada.");
  }

  const mimeType =
    payload.arquivo.type ||
    "application/octet-stream";

  const { data: prepareData, error: prepareError } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "event-create-upload",
        tipoOrigem: payload.tipo_origem,
        origemId: payload.origem_id,
        corretoraId: payload.corretora_id,
        fileName: payload.arquivo.name,
        mimeType,
        fileSize: payload.arquivo.size,
      },
    });

  if (prepareError) {
    console.error(
      "Erro ao preparar upload do anexo da assistência:",
      prepareError
    );

    throw new Error(
      prepareError.message ||
        "Não foi possível preparar o envio do arquivo."
    );
  }

  if (
    !prepareData?.success ||
    !prepareData?.uploadUrl ||
    !prepareData?.storagePath
  ) {
    throw new Error(
      obterMensagemErroB2Assistencia(
        prepareData,
        "Não foi possível preparar o envio do arquivo."
      )
    );
  }

  const uploadResponse = await fetch(
    prepareData.uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: payload.arquivo,
    }
  );

  if (!uploadResponse.ok) {
    const detalhe = await uploadResponse
      .text()
      .catch(() => "");

    console.error(
      "Erro no upload direto para o Backblaze:",
      uploadResponse.status,
      detalhe
    );

    throw new Error(
      "Não foi possível enviar o arquivo para o armazenamento."
    );
  }

  const { data: finalizeData, error: finalizeError } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "event-finalize",
        tipoOrigem: payload.tipo_origem,
        origemId: payload.origem_id,
        storagePath: prepareData.storagePath,
        fileName: payload.arquivo.name,
        mimeType,
        tipoDocumento:
          normalizarTexto(payload.tipo_documento),
        descricao:
          normalizarTexto(payload.descricao),
      },
    });

  if (finalizeError) {
    console.error(
      "Erro ao finalizar upload do anexo da assistência:",
      finalizeError
    );

    throw new Error(
      finalizeError.message ||
        "O arquivo foi enviado, mas não foi possível finalizar o cadastro."
    );
  }

  if (
    !finalizeData?.success ||
    !finalizeData?.arquivo
  ) {
    throw new Error(
      obterMensagemErroB2Assistencia(
        finalizeData,
        "O arquivo foi enviado, mas não foi possível finalizar o cadastro."
      )
    );
  }

  return mapearArquivoB2ParaAnexoAssistencia(
    finalizeData.arquivo as B2ArquivoEvento
  );
}

export async function buscarAnexosAssistencia(
  tipoOrigem: "ASSISTENCIA" | "ASSISTENCIA_OCORRENCIA",
  origemId: string
): Promise<CrmEventoAnexo[]> {
  if (!origemId) {
    return [];
  }

  const { data, error } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "event-list",
        tipoOrigem,
        origemId,
        incluirOcorrencias: false,
      },
    });

  if (error) {
    console.error(
      "Erro ao buscar anexos da assistência:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível buscar os anexos."
    );
  }

  if (!data?.success) {
    throw new Error(
      obterMensagemErroB2Assistencia(
        data,
        "Não foi possível buscar os anexos."
      )
    );
  }

  const arquivos = Array.isArray(data.arquivos)
    ? data.arquivos
    : [];

  return arquivos.map((arquivo: B2ArquivoEvento) =>
    mapearArquivoB2ParaAnexoAssistencia(arquivo)
  );
}

export async function buscarTodosAnexosAssistencia(
  assistenciaId: string,
  _ocorrenciaIds: string[] = []
): Promise<CrmEventoAnexo[]> {
  if (!assistenciaId) {
    return [];
  }

  const { data, error } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "event-list",
        tipoOrigem: "ASSISTENCIA",
        origemId: assistenciaId,
        incluirOcorrencias: true,
      },
    });

  if (error) {
    console.error(
      "Erro ao buscar anexos da assistência:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível buscar os anexos da assistência."
    );
  }

  if (!data?.success) {
    throw new Error(
      obterMensagemErroB2Assistencia(
        data,
        "Não foi possível buscar os anexos da assistência."
      )
    );
  }

  const arquivos = Array.isArray(data.arquivos)
    ? data.arquivos
    : [];

  return arquivos.map((arquivo: B2ArquivoEvento) =>
    mapearArquivoB2ParaAnexoAssistencia(arquivo)
  );
}

export async function obterUrlAnexoAssistencia(
  anexo: CrmEventoAnexo,
  _expiresIn = 3600
): Promise<string> {
  if (!anexo?.id) {
    throw new Error("Anexo não informado.");
  }

  if (!anexo.origem_id) {
    throw new Error(
      "Origem do anexo não informada."
    );
  }

  if (
    anexo.tipo_origem !== "ASSISTENCIA" &&
    anexo.tipo_origem !== "ASSISTENCIA_OCORRENCIA"
  ) {
    throw new Error(
      "Tipo de origem do anexo inválido."
    );
  }

  const { data, error } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "event-create-read",
        tipoOrigem: anexo.tipo_origem,
        origemId: anexo.origem_id,
        arquivoId: anexo.id,
        download: false,
      },
    });

  if (error) {
    console.error(
      "Erro ao gerar URL do anexo da assistência:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível acessar o arquivo."
    );
  }

  if (
    !data?.success ||
    typeof data?.readUrl !== "string" ||
    !data.readUrl
  ) {
    throw new Error(
      obterMensagemErroB2Assistencia(
        data,
        "URL do arquivo não foi gerada."
      )
    );
  }

  return data.readUrl;
}

export async function removerAnexoAssistencia(
  anexo: CrmEventoAnexo
): Promise<void> {
  if (!anexo?.id) {
    throw new Error("Anexo não informado.");
  }

  const { data, error } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "delete",
        arquivoId: anexo.id,
      },
    });

  if (error) {
    console.error(
      "Erro ao remover anexo da assistência:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível remover o arquivo."
    );
  }

  if (!data?.success) {
    throw new Error(
      obterMensagemErroB2Assistencia(
        data,
        "Não foi possível remover o arquivo."
      )
    );
  }
}

export async function buscarDossieAssistencia(
  assistenciaId: string
): Promise<CrmAssistenciaDossie | null> {
  const assistencia = await buscarAssistenciaPorId(assistenciaId);

  if (!assistencia) {
    return null;
  }

  const ocorrencias = await buscarOcorrenciasAssistencia(
    assistenciaId
  );

  const ocorrenciaIds = ocorrencias.map(
    (ocorrencia) => ocorrencia.id
  );

  const [anexos, compromissos] = await Promise.all([
    buscarTodosAnexosAssistencia(
      assistenciaId,
      ocorrenciaIds
    ),
    buscarCompromissosAssistencia(
      assistenciaId,
      ocorrenciaIds
    ),
  ]);

  return {
    assistencia,
    ocorrencias,
    anexos,
    compromissos,
  };
}