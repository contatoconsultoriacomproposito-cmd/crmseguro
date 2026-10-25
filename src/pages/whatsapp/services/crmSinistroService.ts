import { supabase } from "../../../lib/supabaseClient";
import { extrairStorageQuotaError } from "./storageQuotaError";

export type CrmSinistroEtapa =
  | "ABERTURA"
  | "DOCUMENTACAO"
  | "REGULACAO_ANALISE"
  | "LIQUIDACAO_SOLUCAO"
  | "ENCERRAMENTO";

export type CrmSinistroStatus =
  | "ABERTO"
  | "AGUARDANDO_CLIENTE"
  | "AGUARDANDO_SEGURADORA"
  | "AGUARDANDO_TERCEIRO_PRESTADOR"
  | "SUSPENSO"
  | "CONCLUIDO"
  | "NEGADO"
  | "CANCELADO";

export type CrmPrioridade =
  | "BAIXA"
  | "NORMAL"
  | "ALTA"
  | "URGENTE";

export interface CrmSinistro {
  id: string;
  corretora_id: string;
  responsavel_id: string | null;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  cliente_id_legado: string | null;
  item_id: string | null;
  crm_proposta_item_id: string | null;
  numero_sinistro: string | null;
  protocolo: string | null;
  tipo_sinistro: string | null;
  data_evento: string | null;
  hora_evento: string | null;
  data_aviso: string | null;
  descricao_evento: string | null;
  local_evento: string | null;
  causa_evento: string | null;
  dados_especificos: Record<string, any>;
  etapa_atual: CrmSinistroEtapa;
  status: CrmSinistroStatus;
  prioridade: CrmPrioridade;
  valor_prejuizo_estimado: number | null;
  valor_franquia: number | null;
  valor_reclamado: number | null;
  valor_indenizado: number | null;
  desfecho: string | null;
  data_conclusao: string | null;
  observacoes_conclusao: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmSinistroOcorrencia {
  id: string;
  sinistro_id: string;
  corretora_id: string;
  responsavel_id: string | null;
  tipo_ocorrencia: string | null;
  relato: string;
  protocolo: string | null;
  ocorrido_em: string;
  created_at: string;
  updated_at: string;
}

export interface CrmSinistroEnvolvido {
  id: string;
  sinistro_id: string;
  corretora_id: string;
  tipo_envolvido: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  dados: Record<string, any>;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmEventoAnexo {
  id: string;
  corretora_id: string;
  enviado_por_id: string | null;
  tipo_origem: "SINISTRO" | "SINISTRO_OCORRENCIA";
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

export interface CriarSinistroPayload {
  corretora_id: string;
  responsavel_id?: string | null;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  cliente_id_legado?: string | null;
  item_id?: string | null;
  crm_proposta_item_id?: string | null;
  numero_sinistro?: string | null;
  protocolo?: string | null;
  tipo_sinistro?: string | null;
  data_evento?: string | null;
  hora_evento?: string | null;
  data_aviso?: string | null;
  descricao_evento?: string | null;
  local_evento?: string | null;
  causa_evento?: string | null;
  dados_especificos?: Record<string, any>;
  etapa_atual?: CrmSinistroEtapa;
  status?: CrmSinistroStatus;
  prioridade?: CrmPrioridade;
  valor_prejuizo_estimado?: number | null;
  valor_franquia?: number | null;
  valor_reclamado?: number | null;
  valor_indenizado?: number | null;
  desfecho?: string | null;
  data_conclusao?: string | null;
  observacoes_conclusao?: string | null;
}

export interface AtualizarSinistroPayload {
  responsavel_id?: string | null;
  item_id?: string | null;
  crm_proposta_item_id?: string | null;
  numero_sinistro?: string | null;
  protocolo?: string | null;
  tipo_sinistro?: string | null;
  data_evento?: string | null;
  hora_evento?: string | null;
  data_aviso?: string | null;
  descricao_evento?: string | null;
  local_evento?: string | null;
  causa_evento?: string | null;
  dados_especificos?: Record<string, any>;
  etapa_atual?: CrmSinistroEtapa;
  status?: CrmSinistroStatus;
  prioridade?: CrmPrioridade;
  valor_prejuizo_estimado?: number | null;
  valor_franquia?: number | null;
  valor_reclamado?: number | null;
  valor_indenizado?: number | null;
  desfecho?: string | null;
  data_conclusao?: string | null;
  observacoes_conclusao?: string | null;
}

export interface CriarOcorrenciaPayload {
  sinistro_id: string;
  corretora_id: string;
  responsavel_id?: string | null;
  tipo_ocorrencia?: string | null;
  relato: string;
  protocolo?: string | null;
  ocorrido_em?: string;
}

export interface CriarEnvolvidoPayload {
  sinistro_id: string;
  corretora_id: string;
  tipo_envolvido: string;
  nome: string;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  dados?: Record<string, any>;
  observacoes?: string | null;
}

export interface AtualizarEnvolvidoPayload {
  tipo_envolvido?: string;
  nome?: string;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  dados?: Record<string, any>;
  observacoes?: string | null;
}

export interface CriarCompromissoSinistroPayload {
  sinistro: CrmSinistro;
  titulo: string;
  descricao?: string | null;
  inicio_em: string;
  fim_em?: string | null;
  dia_inteiro?: boolean;
  prioridade?: CrmPrioridade;
  ocorrencia_id?: string | null;
  criado_por_id?: string | null;
}

export interface EnviarAnexoSinistroPayload {
  arquivo: File;
  corretora_id: string;
  origem_id: string;
  tipo_origem:
    | "SINISTRO"
    | "SINISTRO_OCORRENCIA";
  enviado_por_id?: string | null;
  tipo_documento?: string | null;
  descricao?: string | null;
}

export interface CrmSinistroDossie {
  sinistro: CrmSinistro;
  ocorrencias: CrmSinistroOcorrencia[];
  envolvidos: CrmSinistroEnvolvido[];
  anexos: CrmEventoAnexo[];
  compromissos: CrmAgendaEvento[];
}

export interface CrmApoliceCliente {
  crm_proposta_item_id: string;
  proposta_id: string;
  opcao_id: string;
  produto_id: string | null;
  seguradora_id: string | null;

  numero_proposta: string;
  numero_apolice: string;
  numero_cotacao: string | null;

  produto_nome: string | null;
  seguradora_nome: string | null;

  valor_premio: number;
  valor_liquido: number | null;

  parcelamento: string | null;
  meio_pagamento: string | null;

  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  data_venda: string | null;

  periodicidade: string | null;
  coberturas_franquias: string | null;

  proposta_status: string | null;
  tipo_negocio: string | null;

  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;

  cliente_nome?: string | null;
  cliente_tipo?: "PF" | "PJ" | null;

  vinculada?: boolean;
}



function removerUndefined<T extends Record<string, any>>(objeto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined)
  ) as Partial<T>;
}

function normalizarDocumento(valor?: string | null): string | null {
  if (!valor) return null;
  const documento = valor.replace(/\D/g, "");
  return documento || null;
}

function normalizarTexto(valor?: string | null): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto || null;
}



export async function criarSinistro(
  payload: CriarSinistroPayload
): Promise<CrmSinistro> {
  if (!payload.corretora_id) {
    throw new Error("Corretora não informada.");
  }

  const possuiCliente =
    Boolean(payload.crm_pessoa_id) ||
    Boolean(payload.crm_empresa_id) ||
    Boolean(payload.cliente_id_legado);

  if (!possuiCliente) {
    throw new Error("O sinistro precisa estar vinculado a um cliente.");
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
    crm_proposta_item_id:
    payload.crm_proposta_item_id ?? null,
    numero_sinistro: normalizarTexto(payload.numero_sinistro),
    protocolo: normalizarTexto(payload.protocolo),
    tipo_sinistro: normalizarTexto(payload.tipo_sinistro),
    data_evento: payload.data_evento ?? null,
    hora_evento: payload.hora_evento ?? null,
    data_aviso: payload.data_aviso ?? null,
    descricao_evento: normalizarTexto(payload.descricao_evento),
    local_evento: normalizarTexto(payload.local_evento),
    causa_evento: normalizarTexto(payload.causa_evento),
    dados_especificos: payload.dados_especificos ?? {},
    etapa_atual: payload.etapa_atual ?? "ABERTURA",
    status: payload.status ?? "ABERTO",
    prioridade: payload.prioridade ?? "NORMAL",
    valor_prejuizo_estimado: payload.valor_prejuizo_estimado ?? null,
    valor_franquia: payload.valor_franquia ?? null,
    valor_reclamado: payload.valor_reclamado ?? null,
    valor_indenizado: payload.valor_indenizado ?? null,
    desfecho: normalizarTexto(payload.desfecho),
    data_conclusao: payload.data_conclusao ?? null,
    observacoes_conclusao: normalizarTexto(
      payload.observacoes_conclusao
    ),
  });

  const { data, error } = await supabase
    .from("crm_sinistros")
    .insert(dados)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar sinistro:", error);
    throw new Error(error.message || "Não foi possível criar o sinistro.");
  }

  return data as CrmSinistro;
}

export async function buscarSinistroPorId(
  sinistroId: string
): Promise<CrmSinistro | null> {
  if (!sinistroId) {
    throw new Error("ID do sinistro não informado.");
  }

  const { data, error } = await supabase
    .from("crm_sinistros")
    .select("*")
    .eq("id", sinistroId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar sinistro:", error);
    throw new Error(error.message || "Não foi possível buscar o sinistro.");
  }

  return (data as CrmSinistro | null) ?? null;
}

export async function buscarSinistrosDoCliente(params: {
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  cliente_id_legado?: string | null;
}): Promise<CrmSinistro[]> {
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
    .from("crm_sinistros")
    .select("*")
    .order("created_at", { ascending: false });

  if (filtros.length === 1) {
    const [campo, , valor] = filtros[0].split(".");
    query = query.eq(campo, valor);
  } else {
    query = query.or(filtros.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar sinistros do cliente:", error);
    throw new Error(
      error.message || "Não foi possível buscar os sinistros do cliente."
    );
  }

  return (data ?? []) as CrmSinistro[];
}

export async function buscarSinistrosDoRelacionamentoWhatsApp(params: {
  contato_id: string;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
}): Promise<Array<CrmSinistro & {
  vinculada?: boolean;
  cliente_nome?: string | null;
}>> {
  const { contato_id, crm_pessoa_id, crm_empresa_id } = params;

  if (!contato_id) {
    throw new Error("Contato do WhatsApp não informado.");
  }

  const proprios = await buscarSinistrosDoCliente(
    crm_pessoa_id
      ? { crm_pessoa_id }
      : crm_empresa_id
        ? { crm_empresa_id }
        : {}
  );

  const propriosFormatados = proprios.map((item) => ({
    ...item,
    vinculada: false,
    cliente_nome: null,
  }));

  const { data: vinculos, error: vinculosError } =
    await supabase
      .from("crm_whatsapp_propostas_vinculos")
      .select("proposta_id")
      .eq("contato_id", contato_id);

  if (vinculosError) {
    throw vinculosError;
  }

  const propostaIds = Array.from(
    new Set(
      (vinculos ?? [])
        .map((item: any) => item.proposta_id)
        .filter(Boolean)
    )
  );

  if (!propostaIds.length) {
    return propriosFormatados;
  }

  const { data: contratos, error: contratosError } =
    await supabase
      .from("crm_contratos")
      .select(`
        proposta_item_id,
        crm_pessoa_id,
        crm_empresa_id
      `)
      .in("proposta_id", propostaIds);

  if (contratosError) {
    throw contratosError;
  }

  const contratosValidos = (contratos ?? []).filter(
    (item: any) => item.proposta_item_id
  );

  const propostaItemIds = Array.from(
    new Set(
      contratosValidos.map(
        (item: any) => item.proposta_item_id
      )
    )
  );

  if (!propostaItemIds.length) {
    return propriosFormatados;
  }

  const { data: sinistrosVinculados, error: sinistrosError } =
    await supabase
      .from("crm_sinistros")
      .select("*")
      .in("crm_proposta_item_id", propostaItemIds)
      .order("created_at", {
        ascending: false,
      });

  if (sinistrosError) {
    throw sinistrosError;
  }

  const pessoaIds = Array.from(
    new Set(
      contratosValidos
        .map((item: any) => item.crm_pessoa_id)
        .filter(Boolean)
    )
  );

  const empresaIds = Array.from(
    new Set(
      contratosValidos
        .map((item: any) => item.crm_empresa_id)
        .filter(Boolean)
    )
  );

  const nomesPessoas = new Map<string, string>();
  const nomesEmpresas = new Map<string, string>();

  if (pessoaIds.length) {
    const { data: pessoas, error } =
      await supabase
        .from("crm_pessoas")
        .select("id, dados")
        .in("id", pessoaIds);

    if (error) {
      throw error;
    }

    (pessoas ?? []).forEach((pessoa: any) => {
      nomesPessoas.set(
        pessoa.id,
        pessoa.dados?.nome ||
          pessoa.dados?.nome_completo ||
          "Pessoa"
      );
    });
  }

  if (empresaIds.length) {
    const { data: empresas, error } =
      await supabase
        .from("crm_empresas")
        .select("id, dados")
        .in("id", empresaIds);

    if (error) {
      throw error;
    }

    (empresas ?? []).forEach((empresa: any) => {
      nomesEmpresas.set(
        empresa.id,
        empresa.dados?.nome_fantasia ||
          empresa.dados?.razao_social ||
          empresa.dados?.nome_razao_social ||
          "Empresa"
      );
    });
  }

  const contratoPorItem = new Map<
    string,
    {
      crm_pessoa_id: string | null;
      crm_empresa_id: string | null;
    }
  >();

  contratosValidos.forEach((contrato: any) => {
    contratoPorItem.set(
      contrato.proposta_item_id,
      {
        crm_pessoa_id:
          contrato.crm_pessoa_id ?? null,
        crm_empresa_id:
          contrato.crm_empresa_id ?? null,
      }
    );
  });

  const vinculadosFormatados =
    (sinistrosVinculados ?? []).map(
      (sinistro: any) => {
        const contrato =
          contratoPorItem.get(
            sinistro.crm_proposta_item_id
          );

        const pertenceAoPrincipal =
          (
            !!crm_pessoa_id &&
            sinistro.crm_pessoa_id ===
              crm_pessoa_id
          ) ||
          (
            !!crm_empresa_id &&
            sinistro.crm_empresa_id ===
              crm_empresa_id
          );

        let clienteNome: string | null =
          null;

        if (contrato?.crm_pessoa_id) {
          clienteNome =
            nomesPessoas.get(
              contrato.crm_pessoa_id
            ) ?? null;
        }

        if (contrato?.crm_empresa_id) {
          clienteNome =
            nomesEmpresas.get(
              contrato.crm_empresa_id
            ) ?? null;
        }

        return {
          ...sinistro,
          vinculada:
            !pertenceAoPrincipal,
          cliente_nome:
            clienteNome,
        };
      }
    );

  const mapa = new Map<
    string,
    CrmSinistro & {
      vinculada?: boolean;
      cliente_nome?: string | null;
    }
  >();

  vinculadosFormatados.forEach(
    (item) => {
      mapa.set(item.id, item);
    }
  );

  propriosFormatados.forEach(
    (item) => {
      mapa.set(item.id, item);
    }
  );

  return Array.from(
    mapa.values()
  ).sort((a: any, b: any) => {
    const dataA =
      new Date(
        a.created_at || 0
      ).getTime();

    const dataB =
      new Date(
        b.created_at || 0
      ).getTime();

    return dataB - dataA;
  });
}

export async function buscarApolicesDoCliente(params: {
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  cliente_id_legado?: string | null;
}): Promise<CrmApoliceCliente[]> {
  const {
    crm_pessoa_id,
    crm_empresa_id,
  } = params;

  if (!crm_pessoa_id && !crm_empresa_id) {
    return [];
  }

  let query = supabase
    .from("crm_contratos")
    .select(`
      id,
      proposta_id,
      proposta_item_id,
      crm_pessoa_id,
      crm_empresa_id,
      produto_id,
      seguradora_id,
      status,
      data_venda,
      valor_aceito,
      valor_atual,
      numero_apolice,
      inicio_vigencia,
      fim_vigencia,
      periodicidade,
      proposta:crm_propostas!crm_contratos_proposta_id_fkey (
        id,
        numero_proposta,
        status,
        tipo_negocio
      ),
      item:crm_proposta_itens!crm_contratos_proposta_item_id_fkey (
        id,
        numero_cotacao,
        valor_premio,
        valor_liquido,
        parcelamento_cotado,
        meio_pagamento_cotado,
        coberturas_franquias
      ),
      produto:base_produtos!crm_contratos_produto_id_fkey (
        id,
        nome
      ),
      seguradora:base_seguradoras!crm_contratos_seguradora_id_fkey (
        id,
        nome
      )
    `)
    .not("numero_apolice", "is", null)
    .neq("numero_apolice", "")
    .in("status", ["ATIVO", "ENCERRADO"])
    .order("fim_vigencia", {
      ascending: false,
      nullsFirst: false,
    });

  if (crm_pessoa_id) {
    query = query.eq(
      "crm_pessoa_id",
      crm_pessoa_id
    );
  } else if (crm_empresa_id) {
    query = query.eq(
      "crm_empresa_id",
      crm_empresa_id
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Erro ao buscar apólices do cliente:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível buscar as apólices do cliente."
    );
  }

  return (data ?? []).map((row: any) => {
    const proposta = Array.isArray(row.proposta)
      ? row.proposta[0]
      : row.proposta;

    const item = Array.isArray(row.item)
      ? row.item[0]
      : row.item;

    const produto = Array.isArray(row.produto)
      ? row.produto[0]
      : row.produto;

    const seguradora = Array.isArray(
      row.seguradora
    )
      ? row.seguradora[0]
      : row.seguradora;

    return {
      crm_proposta_item_id: row.proposta_item_id,
      proposta_id: row.proposta_id,

      /*
       * Campo mantido somente por compatibilidade
       * com componentes antigos que ainda esperam
       * opcao_id.
       *
       * O novo núcleo não possui tab_proposta_opcoes.
       */
      opcao_id: row.proposta_item_id,

      produto_id: row.produto_id ?? null,
      seguradora_id:
        row.seguradora_id ?? null,

      numero_proposta:
        proposta?.numero_proposta || "",

      numero_apolice:
        String(
          row.numero_apolice || ""
        ).trim(),

      numero_cotacao:
        item?.numero_cotacao ?? null,

      produto_nome:
        produto?.nome ?? null,

      seguradora_nome:
        seguradora?.nome ?? null,

      valor_premio: Number(
        item?.valor_premio ??
          row.valor_aceito ??
          0
      ),

      valor_liquido:
        item?.valor_liquido !== null &&
        item?.valor_liquido !== undefined
          ? Number(item.valor_liquido)
          : null,

      parcelamento:
        item?.parcelamento_cotado ?? null,

      meio_pagamento:
        item?.meio_pagamento_cotado ?? null,

      data_inicio_vigencia:
        row.inicio_vigencia ?? null,

      data_fim_vigencia:
        row.fim_vigencia ?? null,

      data_venda:
        row.data_venda ?? null,

      periodicidade:
        row.periodicidade ?? null,

      coberturas_franquias:
        item?.coberturas_franquias ??
        null,

      proposta_status:
        proposta?.status ?? null,

      tipo_negocio:
        proposta?.tipo_negocio ?? null,

      crm_pessoa_id:
        row.crm_pessoa_id ?? null,

      crm_empresa_id:
        row.crm_empresa_id ?? null,

      vinculada: false,
          };
  });
}

export async function buscarApolicesDoRelacionamentoWhatsApp(params: {
  contato_id: string;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
}): Promise<CrmApoliceCliente[]> {
  const {
    contato_id,
    crm_pessoa_id,
    crm_empresa_id,
  } = params;

  if (!contato_id) {
    throw new Error(
      "Contato WhatsApp não informado."
    );
  }

  if (
    !crm_pessoa_id &&
    !crm_empresa_id
  ) {
    return [];
  }

  const proprias =
    await buscarApolicesDoCliente({
      crm_pessoa_id,
      crm_empresa_id,
    });

  const {
    data: vinculos,
    error: vinculosError,
  } = await supabase
    .from(
      "crm_whatsapp_propostas_vinculos"
    )
    .select("proposta_id")
    .eq(
      "contato_id",
      contato_id
    );

  if (vinculosError) {
    throw vinculosError;
  }

  

  const propostaIds =
    Array.from(
      new Set(
        (vinculos ?? [])
          .map(
            (item: any) =>
              item.proposta_id
          )
          .filter(Boolean)
      )
    );

    

  if (!propostaIds.length) {
    return proprias;
  }

  const {
    data,
    error,
  } = await supabase
    .from("crm_contratos")
    .select(`
      id,
      proposta_id,
      proposta_item_id,
      crm_pessoa_id,
      crm_empresa_id,
      produto_id,
      seguradora_id,
      status,
      data_venda,
      valor_aceito,
      valor_atual,
      numero_apolice,
      inicio_vigencia,
      fim_vigencia,
      periodicidade,

      proposta:crm_propostas!crm_contratos_proposta_id_fkey (
        id,
        numero_proposta,
        status,
        tipo_negocio
      ),

      item:crm_proposta_itens!crm_contratos_proposta_item_id_fkey (
        id,
        numero_cotacao,
        valor_premio,
        valor_liquido,
        parcelamento_cotado,
        meio_pagamento_cotado,
        coberturas_franquias
      ),

      produto:base_produtos!crm_contratos_produto_id_fkey (
        id,
        nome
      ),

      seguradora:base_seguradoras!crm_contratos_seguradora_id_fkey (
        id,
        nome
      )
    `)
    .in(
      "proposta_id",
      propostaIds
    )
    .not(
      "numero_apolice",
      "is",
      null
    )
    .neq(
      "numero_apolice",
      ""
    )
    .in(
      "status",
      [
        "ATIVO",
        "ENCERRADO",
      ]
    )
    .order(
      "fim_vigencia",
      {
        ascending: false,
        nullsFirst: false,
      }
    );

  if (error) {
    console.error(
      "Erro ao buscar apólices vinculadas ao contato:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível buscar as apólices vinculadas."
    );
  }

  

  const vinculadasBase =
    (data ?? []).map(
      (row: any) => {
        const proposta =
          Array.isArray(
            row.proposta
          )
            ? row.proposta[0]
            : row.proposta;

        const item =
          Array.isArray(
            row.item
          )
            ? row.item[0]
            : row.item;

        const produto =
          Array.isArray(
            row.produto
          )
            ? row.produto[0]
            : row.produto;

        const seguradora =
          Array.isArray(
            row.seguradora
          )
            ? row.seguradora[0]
            : row.seguradora;

        return {
          crm_proposta_item_id:
            row.proposta_item_id,

          proposta_id:
            row.proposta_id,

          opcao_id:
            row.proposta_item_id,

          produto_id:
            row.produto_id ??
            null,

          seguradora_id:
            row.seguradora_id ??
            null,

          numero_proposta:
            proposta?.numero_proposta ||
            "",

          numero_apolice:
            String(
              row.numero_apolice ||
              ""
            ).trim(),

          numero_cotacao:
            item?.numero_cotacao ??
            null,

          produto_nome:
            produto?.nome ??
            null,

          seguradora_nome:
            seguradora?.nome ??
            null,

          valor_premio:
            Number(
              item?.valor_premio ??
                row.valor_aceito ??
                0
            ),

          valor_liquido:
            item?.valor_liquido !==
              null &&
            item?.valor_liquido !==
              undefined
              ? Number(
                  item.valor_liquido
                )
              : null,

          parcelamento:
            item?.parcelamento_cotado ??
            null,

          meio_pagamento:
            item?.meio_pagamento_cotado ??
            null,

          data_inicio_vigencia:
            row.inicio_vigencia ??
            null,

          data_fim_vigencia:
            row.fim_vigencia ??
            null,

          data_venda:
            row.data_venda ??
            null,

          periodicidade:
            row.periodicidade ??
            null,

          coberturas_franquias:
            item?.coberturas_franquias ??
            null,

          proposta_status:
            proposta?.status ??
            null,

          tipo_negocio:
            proposta?.tipo_negocio ??
            null,

          crm_pessoa_id:
            row.crm_pessoa_id ??
            null,

          crm_empresa_id:
            row.crm_empresa_id ??
            null,

          vinculada: true,
        } satisfies CrmApoliceCliente;
      }
    );

  const todasBase = [
    ...proprias,
    ...vinculadasBase,
  ];

  const pessoaIds =
    Array.from(
      new Set(
        todasBase
          .map(
            item =>
              item.crm_pessoa_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const empresaIds =
    Array.from(
      new Set(
        todasBase
          .map(
            item =>
              item.crm_empresa_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const [
    pessoasResult,
    empresasResult,
  ] =
    await Promise.all([
      pessoaIds.length
        ? supabase
            .from(
              "crm_pessoas"
            )
            .select(
              "id, dados"
            )
            .in(
              "id",
              pessoaIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      empresaIds.length
        ? supabase
            .from(
              "crm_empresas"
            )
            .select(
              "id, dados"
            )
            .in(
              "id",
              empresaIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (
    pessoasResult.error
  ) {
    throw pessoasResult.error;
  }

  if (
    empresasResult.error
  ) {
    throw empresasResult.error;
  }

  const pessoas =
    new Map<
      string,
      string
    >();

  for (
    const pessoa of
    pessoasResult.data ?? []
  ) {
    const dados =
      pessoa.dados &&
      typeof pessoa.dados ===
        "object"
        ? pessoa.dados
        : {};

    pessoas.set(
      pessoa.id,
      dados.nome ||
        dados.nome_completo ||
        dados.nome_razao_social ||
        "Pessoa sem nome"
    );
  }

  const empresas =
    new Map<
      string,
      string
    >();

  for (
    const empresa of
    empresasResult.data ??
    []
  ) {
    const dados =
      empresa.dados &&
      typeof empresa.dados ===
        "object"
        ? empresa.dados
        : {};

    empresas.set(
      empresa.id,
      dados.razao_social ||
        dados.nome_razao_social ||
        dados.nome ||
        dados.nome_fantasia ||
        "Empresa sem nome"
    );
  }

  const mapa =
    new Map<
      string,
      CrmApoliceCliente
    >();

  for (
    const apolice of
    todasBase
  ) {
    const clienteNome =
      apolice.crm_pessoa_id
        ? pessoas.get(
            apolice.crm_pessoa_id
          ) || null
        : apolice.crm_empresa_id
          ? empresas.get(
              apolice.crm_empresa_id
            ) || null
          : null;

    const clienteTipo =
      apolice.crm_pessoa_id
        ? "PF"
        : apolice.crm_empresa_id
          ? "PJ"
          : null;

    const normalizada:
      CrmApoliceCliente = {
      ...apolice,
      cliente_nome:
        clienteNome,
      cliente_tipo:
        clienteTipo,
    };

    const existente =
      mapa.get(
        normalizada.crm_proposta_item_id
      );

    if (
      !existente ||
      existente.vinculada
    ) {
      mapa.set(
        normalizada.crm_proposta_item_id,
        normalizada
      );
    }
  }

  

  return Array.from(
    mapa.values()
  );
}

export async function atualizarSinistro(
  sinistroId: string,
  payload: AtualizarSinistroPayload
): Promise<CrmSinistro> {
  if (!sinistroId) {
    throw new Error("ID do sinistro não informado.");
  }

  const dados = removerUndefined({
    responsavel_id: payload.responsavel_id,
    item_id: payload.item_id,
    crm_proposta_item_id:
      payload.crm_proposta_item_id,
    numero_sinistro:
      payload.numero_sinistro !== undefined
        ? normalizarTexto(payload.numero_sinistro)
        : undefined,
    protocolo:
      payload.protocolo !== undefined
        ? normalizarTexto(payload.protocolo)
        : undefined,
    tipo_sinistro:
      payload.tipo_sinistro !== undefined
        ? normalizarTexto(payload.tipo_sinistro)
        : undefined,
    data_evento: payload.data_evento,
    hora_evento: payload.hora_evento,
    data_aviso: payload.data_aviso,
    descricao_evento:
      payload.descricao_evento !== undefined
        ? normalizarTexto(payload.descricao_evento)
        : undefined,
    local_evento:
      payload.local_evento !== undefined
        ? normalizarTexto(payload.local_evento)
        : undefined,
    causa_evento:
      payload.causa_evento !== undefined
        ? normalizarTexto(payload.causa_evento)
        : undefined,
    dados_especificos: payload.dados_especificos,
    etapa_atual: payload.etapa_atual,
    status: payload.status,
    prioridade: payload.prioridade,
    valor_prejuizo_estimado: payload.valor_prejuizo_estimado,
    valor_franquia: payload.valor_franquia,
    valor_reclamado: payload.valor_reclamado,
    valor_indenizado: payload.valor_indenizado,
    desfecho:
      payload.desfecho !== undefined
        ? normalizarTexto(payload.desfecho)
        : undefined,
    data_conclusao: payload.data_conclusao,
    observacoes_conclusao:
      payload.observacoes_conclusao !== undefined
        ? normalizarTexto(payload.observacoes_conclusao)
        : undefined,
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("crm_sinistros")
    .update(dados)
    .eq("id", sinistroId)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao atualizar sinistro:", error);
    throw new Error(error.message || "Não foi possível atualizar o sinistro.");
  }

  return data as CrmSinistro;
}

export async function criarOcorrencia(
  payload: CriarOcorrenciaPayload
): Promise<CrmSinistroOcorrencia> {
  if (!payload.sinistro_id) {
    throw new Error("Sinistro não informado.");
  }

  if (!payload.corretora_id) {
    throw new Error("Corretora não informada.");
  }

  if (!payload.relato?.trim()) {
    throw new Error("Informe o relato da ocorrência.");
  }

  const { data, error } = await supabase
    .from("crm_sinistros_ocorrencias")
    .insert({
      sinistro_id: payload.sinistro_id,
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
    console.error("Erro ao criar ocorrência:", error);
    throw new Error(error.message || "Não foi possível registrar a ocorrência.");
  }

  return data as CrmSinistroOcorrencia;
}

export async function buscarOcorrencias(
  sinistroId: string
): Promise<CrmSinistroOcorrencia[]> {
  if (!sinistroId) {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_sinistros_ocorrencias")
    .select("*")
    .eq("sinistro_id", sinistroId)
    .order("ocorrido_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar ocorrências:", error);
    throw new Error(error.message || "Não foi possível buscar as ocorrências.");
  }

  return (data ?? []) as CrmSinistroOcorrencia[];
}

export async function adicionarEnvolvido(
  payload: CriarEnvolvidoPayload
): Promise<CrmSinistroEnvolvido> {
  if (!payload.sinistro_id) {
    throw new Error("Sinistro não informado.");
  }

  if (!payload.corretora_id) {
    throw new Error("Corretora não informada.");
  }

  if (!payload.tipo_envolvido?.trim()) {
    throw new Error("Informe o tipo do envolvido.");
  }

  if (!payload.nome?.trim()) {
    throw new Error("Informe o nome do envolvido.");
  }

  const { data, error } = await supabase
    .from("crm_sinistros_envolvidos")
    .insert({
      sinistro_id: payload.sinistro_id,
      corretora_id: payload.corretora_id,
      tipo_envolvido: payload.tipo_envolvido.trim(),
      nome: payload.nome.trim(),
      cpf_cnpj: normalizarDocumento(payload.cpf_cnpj),
      telefone: normalizarTexto(payload.telefone),
      email: normalizarTexto(payload.email),
      crm_pessoa_id: payload.crm_pessoa_id ?? null,
      crm_empresa_id: payload.crm_empresa_id ?? null,
      dados: payload.dados ?? {},
      observacoes: normalizarTexto(payload.observacoes),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao adicionar envolvido:", error);
    throw new Error(error.message || "Não foi possível adicionar o envolvido.");
  }

  return data as CrmSinistroEnvolvido;
}

export async function buscarEnvolvidos(
  sinistroId: string
): Promise<CrmSinistroEnvolvido[]> {
  if (!sinistroId) {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_sinistros_envolvidos")
    .select("*")
    .eq("sinistro_id", sinistroId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar envolvidos:", error);
    throw new Error(error.message || "Não foi possível buscar os envolvidos.");
  }

  return (data ?? []) as CrmSinistroEnvolvido[];
}

export async function atualizarEnvolvido(
  envolvidoId: string,
  payload: AtualizarEnvolvidoPayload
): Promise<CrmSinistroEnvolvido> {
  if (!envolvidoId) {
    throw new Error("ID do envolvido não informado.");
  }

  const dados = removerUndefined({
    tipo_envolvido:
      payload.tipo_envolvido !== undefined
        ? payload.tipo_envolvido.trim()
        : undefined,
    nome:
      payload.nome !== undefined
        ? payload.nome.trim()
        : undefined,
    cpf_cnpj:
      payload.cpf_cnpj !== undefined
        ? normalizarDocumento(payload.cpf_cnpj)
        : undefined,
    telefone:
      payload.telefone !== undefined
        ? normalizarTexto(payload.telefone)
        : undefined,
    email:
      payload.email !== undefined
        ? normalizarTexto(payload.email)
        : undefined,
    crm_pessoa_id: payload.crm_pessoa_id,
    crm_empresa_id: payload.crm_empresa_id,
    dados: payload.dados,
    observacoes:
      payload.observacoes !== undefined
        ? normalizarTexto(payload.observacoes)
        : undefined,
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("crm_sinistros_envolvidos")
    .update(dados)
    .eq("id", envolvidoId)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao atualizar envolvido:", error);
    throw new Error(error.message || "Não foi possível atualizar o envolvido.");
  }

  return data as CrmSinistroEnvolvido;
}

export async function removerEnvolvido(
  envolvidoId: string
): Promise<void> {
  if (!envolvidoId) {
    throw new Error("ID do envolvido não informado.");
  }

  const { error } = await supabase
    .from("crm_sinistros_envolvidos")
    .delete()
    .eq("id", envolvidoId);

  if (error) {
    console.error("Erro ao remover envolvido:", error);
    throw new Error(error.message || "Não foi possível remover o envolvido.");
  }
}

export async function criarCompromissoNaAgenda(
  payload: CriarCompromissoSinistroPayload
): Promise<CrmAgendaEvento> {
  const { sinistro } = payload;

  if (!sinistro?.id) {
    throw new Error("Sinistro não informado.");
  }

  if (!payload.titulo?.trim()) {
    throw new Error("Informe o título do compromisso.");
  }

  if (!payload.inicio_em) {
    throw new Error("Informe a data do compromisso.");
  }

  const tipoOrigem = payload.ocorrencia_id
    ? "SINISTRO_OCORRENCIA"
    : "SINISTRO";

  const origemId = payload.ocorrencia_id || sinistro.id;

  const { data, error } = await supabase
    .from("crm_agenda")
    .insert({
      corretora_id: sinistro.corretora_id,
      responsavel_id: sinistro.responsavel_id,
      criado_por_id: payload.criado_por_id ?? null,
      natureza: "COMPROMISSO",
      categoria: "SINISTRO",
      titulo: payload.titulo.trim(),
      descricao: normalizarTexto(payload.descricao),
      inicio_em: payload.inicio_em,
      fim_em: payload.fim_em ?? null,
      dia_inteiro: payload.dia_inteiro ?? false,
      timezone: "America/Sao_Paulo",
      status: "PENDENTE",
      prioridade: payload.prioridade ?? sinistro.prioridade ?? "NORMAL",
      crm_pessoa_id: sinistro.crm_pessoa_id,
      crm_empresa_id: sinistro.crm_empresa_id,
      cliente_id_legado: sinistro.cliente_id_legado,
      tipo_origem: tipoOrigem,
      origem_id: origemId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar compromisso na agenda:", error);
    throw new Error(
      error.message || "Não foi possível criar o compromisso na agenda."
    );
  }

  return data as CrmAgendaEvento;
}

export async function buscarCompromissosDoSinistro(
  sinistroId: string,
  ocorrenciaIds: string[] = []
): Promise<CrmAgendaEvento[]> {
  if (!sinistroId) {
    return [];
  }

  const filtros = [`and(tipo_origem.eq.SINISTRO,origem_id.eq.${sinistroId})`];

  for (const ocorrenciaId of ocorrenciaIds) {
    filtros.push(
      `and(tipo_origem.eq.SINISTRO_OCORRENCIA,origem_id.eq.${ocorrenciaId})`
    );
  }

  const { data, error } = await supabase
    .from("crm_agenda")
    .select("*")
    .or(filtros.join(","))
    .order("inicio_em", { ascending: true });

  if (error) {
    console.error("Erro ao buscar compromissos:", error);
    throw new Error(
      error.message || "Não foi possível buscar os compromissos do sinistro."
    );
  }

  return (data ?? []) as CrmAgendaEvento[];
}

export async function concluirCompromissoAgenda(
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

export async function cancelarCompromissoAgenda(
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

function mapearArquivoB2ParaAnexo(
  arquivo: B2ArquivoEvento
): CrmEventoAnexo {
  const metadata =
    arquivo.metadata &&
    typeof arquivo.metadata === "object"
      ? arquivo.metadata
      : {};

  const tipoOrigem =
    metadata.tipo_origem === "SINISTRO_OCORRENCIA"
      ? "SINISTRO_OCORRENCIA"
      : "SINISTRO";

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

function obterMensagemErroB2(
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

export async function enviarAnexo(
  payload: EnviarAnexoSinistroPayload
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
      "Erro ao preparar upload do anexo:",
      prepareError
    );

    const storageError =
      await extrairStorageQuotaError(
        prepareError
      );

    if (storageError) {
      throw storageError;
    }

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
      obterMensagemErroB2(
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
      "Erro ao finalizar upload do anexo:",
      finalizeError
    );

    const storageError =
      await extrairStorageQuotaError(
        finalizeError
      );

    if (storageError) {
      throw storageError;
    }

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
      obterMensagemErroB2(
        finalizeData,
        "O arquivo foi enviado, mas não foi possível finalizar o cadastro."
      )
    );
  }

  return mapearArquivoB2ParaAnexo(
    finalizeData.arquivo as B2ArquivoEvento
  );
}

export async function buscarAnexos(
  tipoOrigem: "SINISTRO" | "SINISTRO_OCORRENCIA",
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
      "Erro ao buscar anexos:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível buscar os anexos."
    );
  }

  if (!data?.success) {
    throw new Error(
      obterMensagemErroB2(
        data,
        "Não foi possível buscar os anexos."
      )
    );
  }

  const arquivos = Array.isArray(data.arquivos)
    ? data.arquivos
    : [];

  return arquivos.map((arquivo: B2ArquivoEvento) =>
    mapearArquivoB2ParaAnexo(arquivo)
  );
}

export async function buscarAnexosDoSinistro(
  sinistroId: string,
  _ocorrenciaIds: string[] = []
): Promise<CrmEventoAnexo[]> {
  if (!sinistroId) {
    return [];
  }

  const { data, error } =
    await supabase.functions.invoke("b2-media", {
      body: {
        action: "event-list",
        tipoOrigem: "SINISTRO",
        origemId: sinistroId,
        incluirOcorrencias: true,
      },
    });

  if (error) {
    console.error(
      "Erro ao buscar anexos do sinistro:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível buscar os anexos do sinistro."
    );
  }

  if (!data?.success) {
    throw new Error(
      obterMensagemErroB2(
        data,
        "Não foi possível buscar os anexos do sinistro."
      )
    );
  }

  const arquivos = Array.isArray(data.arquivos)
    ? data.arquivos
    : [];

  return arquivos.map((arquivo: B2ArquivoEvento) =>
    mapearArquivoB2ParaAnexo(arquivo)
  );
}

export async function obterUrlAnexo(
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
    anexo.tipo_origem !== "SINISTRO" &&
    anexo.tipo_origem !== "SINISTRO_OCORRENCIA"
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
      "Erro ao gerar URL do anexo:",
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
      obterMensagemErroB2(
        data,
        "URL do arquivo não foi gerada."
      )
    );
  }

  return data.readUrl;
}

export async function removerAnexo(
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
      "Erro ao remover anexo:",
      error
    );

    throw new Error(
      error.message ||
        "Não foi possível remover o arquivo."
    );
  }

  if (!data?.success) {
    throw new Error(
      obterMensagemErroB2(
        data,
        "Não foi possível remover o arquivo."
      )
    );
  }
}


async function validarExclusaoSinistroCorretora(
  corretoraId: string
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_perfis")
    .select("id, tipo_usuario, ativo")
    .eq("id", user.id)
    .maybeSingle();

  if (perfilError) {
    throw new Error("Não foi possível validar a permissão de exclusão.");
  }

  if (
    !perfil ||
    perfil.ativo !== true ||
    perfil.tipo_usuario !== "CORRETORA" ||
    perfil.id !== corretoraId
  ) {
    throw new Error(
      "Somente a corretora responsável pode excluir este sinistro."
    );
  }
}

export async function excluirSinistro(
  sinistroId: string,
  corretoraId: string
): Promise<void> {
  if (!sinistroId) {
    throw new Error("ID do sinistro não informado.");
  }

  if (!corretoraId) {
    throw new Error("Corretora não informada.");
  }

  await validarExclusaoSinistroCorretora(corretoraId);

  const { data: sinistro, error: sinistroError } = await supabase
    .from("crm_sinistros")
    .select("id, corretora_id")
    .eq("id", sinistroId)
    .eq("corretora_id", corretoraId)
    .maybeSingle();

  if (sinistroError) {
    throw new Error(
      sinistroError.message ||
        "Não foi possível validar o sinistro para exclusão."
    );
  }

  if (!sinistro) {
    throw new Error(
      "Sinistro não encontrado ou não pertence a esta corretora."
    );
  }

  /*
   * Remove primeiro os arquivos físicos/catalogados.
   * buscarAnexosDoSinistro inclui anexos do sinistro e das ocorrências.
   */
  const anexos = await buscarAnexosDoSinistro(sinistroId);

  for (const anexo of anexos) {
    await removerAnexo(anexo);
  }

  const { data: ocorrencias, error: ocorrenciasError } = await supabase
    .from("crm_sinistros_ocorrencias")
    .select("id")
    .eq("sinistro_id", sinistroId)
    .eq("corretora_id", corretoraId);

  if (ocorrenciasError) {
    throw new Error(
      ocorrenciasError.message ||
        "Não foi possível preparar a exclusão das ocorrências do sinistro."
    );
  }

  const ocorrenciaIds = (ocorrencias ?? [])
    .map((item: any) => item.id)
    .filter(Boolean);

  const { error: agendaSinistroError } = await supabase
    .from("crm_agenda")
    .delete()
    .eq("corretora_id", corretoraId)
    .eq("tipo_origem", "SINISTRO")
    .eq("origem_id", sinistroId);

  if (agendaSinistroError) {
    throw new Error(
      agendaSinistroError.message ||
        "Não foi possível remover os compromissos do sinistro."
    );
  }

  if (ocorrenciaIds.length > 0) {
    const { error: agendaOcorrenciasError } = await supabase
      .from("crm_agenda")
      .delete()
      .eq("corretora_id", corretoraId)
      .eq("tipo_origem", "SINISTRO_OCORRENCIA")
      .in("origem_id", ocorrenciaIds);

    if (agendaOcorrenciasError) {
      throw new Error(
        agendaOcorrenciasError.message ||
          "Não foi possível remover os compromissos das ocorrências."
      );
    }
  }

  const { error: envolvidosError } = await supabase
    .from("crm_sinistros_envolvidos")
    .delete()
    .eq("sinistro_id", sinistroId)
    .eq("corretora_id", corretoraId);

  if (envolvidosError) {
    throw new Error(
      envolvidosError.message ||
        "Não foi possível remover os envolvidos do sinistro."
    );
  }

  const { error: ocorrenciasDeleteError } = await supabase
    .from("crm_sinistros_ocorrencias")
    .delete()
    .eq("sinistro_id", sinistroId)
    .eq("corretora_id", corretoraId);

  if (ocorrenciasDeleteError) {
    throw new Error(
      ocorrenciasDeleteError.message ||
        "Não foi possível remover as ocorrências do sinistro."
    );
  }

  const { error: deleteError } = await supabase
    .from("crm_sinistros")
    .delete()
    .eq("id", sinistroId)
    .eq("corretora_id", corretoraId);

  if (deleteError) {
    console.error("Erro ao excluir sinistro:", deleteError);
    throw new Error(
      deleteError.message ||
        "Não foi possível excluir o sinistro."
    );
  }
}

export async function buscarDossieSinistro(
  sinistroId: string
): Promise<CrmSinistroDossie | null> {
  const sinistro = await buscarSinistroPorId(sinistroId);

  if (!sinistro) {
    return null;
  }

  const [ocorrencias, envolvidos] = await Promise.all([
    buscarOcorrencias(sinistroId),
    buscarEnvolvidos(sinistroId),
  ]);

  const ocorrenciaIds = ocorrencias.map((ocorrencia) => ocorrencia.id);

  const [anexos, compromissos] = await Promise.all([
    buscarAnexosDoSinistro(sinistroId, ocorrenciaIds),
    buscarCompromissosDoSinistro(sinistroId, ocorrenciaIds),
  ]);

  return {
    sinistro,
    ocorrencias,
    envolvidos,
    anexos,
    compromissos,
  };
}