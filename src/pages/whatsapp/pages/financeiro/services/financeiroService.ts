import { supabase } from "../../../../../lib/supabaseClient";

import type {
  BaixarParcelaPayload,
  BaixarParcelasLotePayload,
  EditarParcelasPayload,
  EstornarBaixaPayload,
  ExecutarAcaoFinanceiroPayload,
  FiltrosFinanceiro,
  FinanceiroContrato,
  FinanceiroContratoDetalhado,
  FormaPagamentoFinanceiro,
  ItemFinanceiroGeral,
  LancamentoAvulsoPayload,
  MovimentacaoFinanceira,
  ParcelaFinanceira,
  ParcelaFinanceiraComSituacao,
  ResultadoAcaoFinanceiro,
  ResultadoBuscaFinanceiroGeral,
  ResultadoSalvarFinanceiroContrato,
  ResumoFinanceiroGeral,
  SalvarFinanceiroContratoPayload,
} from "../types/financeiro";

import {
  adicionarSituacaoParcelas,
  calcularResumoFinanceiroContrato,
} from "./financeiroCalculos";

export async function buscarFinanceiroPorContrato(
  contratoId: string,
): Promise<FinanceiroContrato | null> {
  if (!contratoId) {
    throw new Error("Contrato não informado.");
  }

  const { data, error } = await supabase
    .from("crm_financeiros")
    .select("*")
    .eq("contrato_id", contratoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FinanceiroContrato | null;
}

export async function buscarParcelasFinanceiro(
  financeiroId: string,
): Promise<ParcelaFinanceira[]> {
  if (!financeiroId) {
    throw new Error("Financeiro não informado.");
  }

  const { data, error } = await supabase
    .from("crm_financeiro_parcelas")
    .select("*")
    .eq("financeiro_id", financeiroId)
    .order("tipo_lancamento", {
      ascending: true,
    })
    .order("numero_parcela", {
      ascending: true,
      nullsFirst: false,
    })
    .order("data_vencimento", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as ParcelaFinanceira[];
}

export async function buscarMovimentacoesFinanceiro(
  financeiroId: string,
): Promise<MovimentacaoFinanceira[]> {
  if (!financeiroId) {
    throw new Error("Financeiro não informado.");
  }

  const { data, error } = await supabase
    .from("crm_financeiro_movimentacoes")
    .select("*")
    .eq("financeiro_id", financeiroId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as MovimentacaoFinanceira[];
}

export async function buscarFinanceiroContratoDetalhado(
  contratoId: string,
): Promise<FinanceiroContratoDetalhado | null> {
  const financeiro =
    await buscarFinanceiroPorContrato(
      contratoId,
    );

  if (!financeiro) {
    return null;
  }

  const [parcelas, movimentacoes] =
    await Promise.all([
      buscarParcelasFinanceiro(
        financeiro.id,
      ),
      buscarMovimentacoesFinanceiro(
        financeiro.id,
      ),
    ]);

  const parcelasComSituacao:
    ParcelaFinanceiraComSituacao[] =
    adicionarSituacaoParcelas(parcelas);

  const resumo =
    calcularResumoFinanceiroContrato(
      parcelas,
    );

  return {
    financeiro,
    parcelas: parcelasComSituacao,
    movimentacoes,
    resumo,
  };
}

export async function salvarFinanceiroContrato(
  payload: SalvarFinanceiroContratoPayload,
): Promise<ResultadoSalvarFinanceiroContrato> {
  if (!payload.contrato_id) {
    throw new Error(
      "Contrato não informado.",
    );
  }

  if (!payload.forma_pagamento) {
    throw new Error(
      "Forma de pagamento não informada.",
    );
  }

  if (
    !payload.parcelas ||
    payload.parcelas.length === 0
  ) {
    throw new Error(
      "Informe pelo menos uma parcela.",
    );
  }

  const { data, error } =
    await supabase.rpc(
      "crm_salvar_financeiro_contrato",
      {
        p_contrato_id:
          payload.contrato_id,
        p_forma_pagamento:
          payload.forma_pagamento,
        p_baixa_automatica:
          payload.baixa_automatica,
        p_parcelas:
          payload.parcelas,
      },
    );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "A operação não retornou resultado.",
    );
  }

  return data as ResultadoSalvarFinanceiroContrato;
}

export async function executarAcaoFinanceiro(
  payload: ExecutarAcaoFinanceiroPayload,
): Promise<ResultadoAcaoFinanceiro> {
  if (!payload.financeiro_id) {
    throw new Error(
      "Financeiro não informado.",
    );
  }

  if (!payload.acao) {
    throw new Error(
      "Ação financeira não informada.",
    );
  }

  const { data, error } =
    await supabase.rpc(
      "crm_executar_acao_financeiro",
      {
        p_financeiro_id:
          payload.financeiro_id,
        p_acao:
          payload.acao,
        p_parcela_ids:
          payload.parcela_ids ?? null,
        p_data_pagamento:
          payload.data_pagamento ?? null,
        p_justificativa:
          payload.justificativa ?? null,
        p_parcelas:
          payload.parcelas ?? null,
        p_descricao:
          payload.descricao ?? null,
        p_valor:
          payload.valor ?? null,
        p_data_vencimento:
          payload.data_vencimento ?? null,
      },
    );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "A operação financeira não retornou resultado.",
    );
  }

  return data as ResultadoAcaoFinanceiro;
}

export async function baixarParcela(
  payload: BaixarParcelaPayload,
): Promise<ResultadoAcaoFinanceiro> {
  return executarAcaoFinanceiro({
    financeiro_id:
      payload.financeiro_id,
    acao: "BAIXAR",
    parcela_ids: [
      payload.parcela_id,
    ],
    data_pagamento:
      payload.data_pagamento ?? null,
  });
}

export async function baixarParcelasEmLote(
  payload: BaixarParcelasLotePayload,
): Promise<ResultadoAcaoFinanceiro> {
  if (
    !payload.parcela_ids ||
    payload.parcela_ids.length === 0
  ) {
    throw new Error(
      "Selecione pelo menos uma parcela.",
    );
  }

  return executarAcaoFinanceiro({
    financeiro_id:
      payload.financeiro_id,
    acao: "BAIXAR_LOTE",
    parcela_ids:
      payload.parcela_ids,
    data_pagamento:
      payload.data_pagamento ?? null,
  });
}

export async function estornarBaixaParcela(
  payload: EstornarBaixaPayload,
): Promise<ResultadoAcaoFinanceiro> {
  if (
    !payload.justificativa.trim()
  ) {
    throw new Error(
      "Informe a justificativa do estorno.",
    );
  }

  return executarAcaoFinanceiro({
    financeiro_id:
      payload.financeiro_id,
    acao: "ESTORNAR",
    parcela_ids: [
      payload.parcela_id,
    ],
    justificativa:
      payload.justificativa.trim(),
  });
}

export async function editarParcelasFinanceiro(
  payload: EditarParcelasPayload,
): Promise<ResultadoAcaoFinanceiro> {
  if (
    !payload.parcelas ||
    payload.parcelas.length === 0
  ) {
    throw new Error(
      "Informe pelo menos uma parcela para edição.",
    );
  }

  return executarAcaoFinanceiro({
    financeiro_id:
      payload.financeiro_id,
    acao: "EDITAR_PARCELAS",
    parcelas:
      payload.parcelas,
  });
}

export async function criarLancamentoAvulso(
  payload: LancamentoAvulsoPayload,
): Promise<ResultadoAcaoFinanceiro> {
  if (
    !payload.descricao.trim()
  ) {
    throw new Error(
      "Informe a descrição do lançamento avulso.",
    );
  }

  if (
    !Number.isFinite(
      payload.valor,
    ) ||
    payload.valor <= 0
  ) {
    throw new Error(
      "Informe um valor válido.",
    );
  }

  if (
    !payload.data_vencimento
  ) {
    throw new Error(
      "Informe o vencimento.",
    );
  }

  return executarAcaoFinanceiro({
    financeiro_id:
      payload.financeiro_id,
    acao: "LANCAMENTO_AVULSO",
    descricao:
      payload.descricao.trim(),
    valor:
      payload.valor,
    data_vencimento:
      payload.data_vencimento,
  });
}

/* =========================================================
   CONSULTA GERAL DO FINANCEIRO
========================================================= */

interface DadosJson {
  [key: string]: unknown;
}

interface PessoaRelacionada {
  id: string;
  cpf: string | null;
  dados: DadosJson | null;
}

interface EmpresaRelacionada {
  id: string;
  cnpj: string | null;
  dados: DadosJson | null;
}

interface ProdutoRelacionado {
  id: string;
  nome: string | null;
}

interface SeguradoraRelacionada {
  id: string;
  nome: string | null;
}

interface CorretorRelacionado {
  id: string;
  nome: string | null;
}

interface ContratoFinanceiroRelacionado {
  id: string;
  numero_apolice: string | null;
  produto_id: string | null;
  seguradora_id: string | null;
  corretor_id: string | null;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  valor_aceito: number;
  valor_atual: number;
  status: string;
  pessoa:
    | PessoaRelacionada
    | PessoaRelacionada[]
    | null;
  empresa:
    | EmpresaRelacionada
    | EmpresaRelacionada[]
    | null;
  produto:
    | ProdutoRelacionado
    | ProdutoRelacionado[]
    | null;
  seguradora:
    | SeguradoraRelacionada
    | SeguradoraRelacionada[]
    | null;
  corretor:
    | CorretorRelacionado
    | CorretorRelacionado[]
    | null;
}

interface FinanceiroRelacionado {
  id: string;
  corretora_id: string;
  contrato_id: string;
  forma_pagamento:
    FormaPagamentoFinanceiro;
  quantidade_parcelas: number;
  baixa_automatica: boolean;
  valor_total: number;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ParcelaFinanceiraGeralBanco
  extends ParcelaFinanceira {
  financeiro:
    | FinanceiroRelacionado
    | FinanceiroRelacionado[]
    | null;
  contrato:
    | ContratoFinanceiroRelacionado
    | ContratoFinanceiroRelacionado[]
    | null;
}

function primeiroRelacionamento<T>(
  valor:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!valor) {
    return null;
  }

  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }

  return valor;
}

function textoJson(
  dados: DadosJson | null,
  chaves: string[],
): string | null {
  if (!dados) {
    return null;
  }

  for (const chave of chaves) {
    const valor =
      dados[chave];

    if (
      typeof valor === "string" &&
      valor.trim()
    ) {
      return valor.trim();
    }
  }

  return null;
}

function obterNomePessoa(
  pessoa: PessoaRelacionada,
): string {
  return (
    textoJson(
      pessoa.dados,
      [
        "nome",
        "nome_completo",
        "nomeCompleto",
        "nome_razao_social",
      ],
    ) ??
    pessoa.cpf ??
    "Pessoa não identificada"
  );
}

function obterNomeEmpresa(
  empresa: EmpresaRelacionada,
): string {
  return (
    textoJson(
      empresa.dados,
      [
        "nome_fantasia",
        "nomeFantasia",
        "razao_social",
        "razaoSocial",
        "nome",
        "nome_razao_social",
      ],
    ) ??
    empresa.cnpj ??
    "Empresa não identificada"
  );
}

function normalizarTextoBusca(
  valor:
    | string
    | null
    | undefined,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function criarResumoFinanceiroGeral(
  itens: ItemFinanceiroGeral[],
): ResumoFinanceiroGeral {
  const resumo: ResumoFinanceiroGeral = {
    valor_a_vencer: 0,
    valor_vence_hoje: 0,
    valor_atrasado: 0,
    valor_pago: 0,
    valor_cancelado: 0,
    quantidade_a_vencer: 0,
    quantidade_vence_hoje: 0,
    quantidade_atrasada: 0,
    quantidade_paga: 0,
    quantidade_cancelada: 0,
  };

  for (const item of itens) {
    const valor =
      Number(
        item.parcela.valor,
      ) || 0;

    switch (
      item.parcela.situacao
    ) {
      case "A_VENCER":
        resumo.valor_a_vencer +=
          valor;
        resumo.quantidade_a_vencer +=
          1;
        break;

      case "VENCE_HOJE":
        resumo.valor_vence_hoje +=
          valor;
        resumo.quantidade_vence_hoje +=
          1;
        break;

      case "ATRASADA":
        resumo.valor_atrasado +=
          valor;
        resumo.quantidade_atrasada +=
          1;
        break;

      case "PAGA":
        resumo.valor_pago +=
          valor;
        resumo.quantidade_paga +=
          1;
        break;

      case "CANCELADA":
        resumo.valor_cancelado +=
          valor;
        resumo.quantidade_cancelada +=
          1;
        break;
    }
  }

  return resumo;
}

export async function buscarFinanceiroGeral(
  filtros: FiltrosFinanceiro = {},
): Promise<ResultadoBuscaFinanceiroGeral> {
  const pagina =
    Math.max(
      1,
      filtros.pagina ?? 1,
    );

  const limite =
    Math.max(
      1,
      filtros.limite ?? 20,
    );

  const { data, error } =
    await supabase
      .from(
        "crm_financeiro_parcelas",
      )
      .select(`
        *,
        financeiro:crm_financeiros!crm_financeiro_parcelas_financeiro_id_fkey (
          id,
          corretora_id,
          contrato_id,
          forma_pagamento,
          quantidade_parcelas,
          baixa_automatica,
          valor_total,
          criado_por_id,
          created_at,
          updated_at
        ),
        contrato:crm_contratos!crm_financeiro_parcelas_contrato_id_fkey (
          id,
          numero_apolice,
          produto_id,
          seguradora_id,
          corretor_id,
          crm_pessoa_id,
          crm_empresa_id,
          valor_aceito,
          valor_atual,
          status,
          pessoa:crm_pessoas!crm_contratos_crm_pessoa_id_fkey (
            id,
            cpf,
            dados
          ),
          empresa:crm_empresas!crm_contratos_crm_empresa_id_fkey (
            id,
            cnpj,
            dados
          ),
          produto:base_produtos!crm_contratos_produto_id_fkey (
            id,
            nome
          ),
          seguradora:base_seguradoras!crm_contratos_seguradora_id_fkey (
            id,
            nome
          ),
          corretor:usuarios_perfis!crm_contratos_corretor_id_fkey (
            id,
            nome
          )
        )
      `)
      .order(
        "data_vencimento",
        {
          ascending: true,
        },
      )
      .order(
        "numero_parcela",
        {
          ascending: true,
          nullsFirst: false,
        },
      );

  if (error) {
    throw error;
  }

  const registros =
    (data ??
      []) as unknown as ParcelaFinanceiraGeralBanco[];

  const itens: ItemFinanceiroGeral[] =
    [];

  for (const registro of registros) {
    const financeiro =
      primeiroRelacionamento(
        registro.financeiro,
      );

    const contrato =
      primeiroRelacionamento(
        registro.contrato,
      );

    if (
      !financeiro ||
      !contrato
    ) {
      continue;
    }

    const pessoa =
      primeiroRelacionamento(
        contrato.pessoa,
      );

    const empresa =
      primeiroRelacionamento(
        contrato.empresa,
      );

    const produto =
      primeiroRelacionamento(
        contrato.produto,
      );

    const seguradora =
      primeiroRelacionamento(
        contrato.seguradora,
      );

    const corretor =
      primeiroRelacionamento(
        contrato.corretor,
      );

    const [
      parcelaComSituacao,
    ] =
      adicionarSituacaoParcelas([
        registro,
      ]);

    if (!parcelaComSituacao) {
      continue;
    }

    const cliente =
      pessoa
        ? {
            id:
              pessoa.id,
            nome:
              obterNomePessoa(
                pessoa,
              ),
            tipo:
              "PF" as const,
          }
        : empresa
          ? {
              id:
                empresa.id,
              nome:
                obterNomeEmpresa(
                  empresa,
                ),
              tipo:
                "PJ" as const,
            }
          : null;

    itens.push({
      parcela:
        parcelaComSituacao,
      financeiro: {
        id:
          financeiro.id,
        corretora_id:
          financeiro.corretora_id,
        contrato_id:
          financeiro.contrato_id,
        forma_pagamento:
          financeiro.forma_pagamento,
        quantidade_parcelas:
          Number(
            financeiro.quantidade_parcelas,
          ),
        baixa_automatica:
          Boolean(
            financeiro.baixa_automatica,
          ),
        valor_total:
          Number(
            financeiro.valor_total,
          ),
        criado_por_id:
          financeiro.criado_por_id,
        created_at:
          financeiro.created_at,
        updated_at:
          financeiro.updated_at,
      },
      contrato: {
        id:
          contrato.id,
        numero_apolice:
          contrato.numero_apolice,
        produto_id:
          contrato.produto_id ??
          "",
        seguradora_id:
          contrato.seguradora_id ??
          "",
        corretor_id:
          contrato.corretor_id ??
          "",
        valor_aceito:
          Number(
            contrato.valor_aceito,
          ),
        valor_atual:
          Number(
            contrato.valor_atual,
          ),
        status:
          contrato.status,
      },
      cliente,
      produto_nome:
        produto?.nome ?? null,
      seguradora_nome:
        seguradora?.nome ??
        null,
      corretor_nome:
        corretor?.nome ?? null,
    });
  }

  let filtrados =
    itens;

  if (
    filtros.data_inicio
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.parcela
            .data_vencimento >=
          filtros.data_inicio!,
      );
  }

  if (
    filtros.data_fim
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.parcela
            .data_vencimento <=
          filtros.data_fim!,
      );
  }

  if (
    filtros.corretor_id
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.contrato
            .corretor_id ===
          filtros.corretor_id,
      );
  }

  if (
    filtros.seguradora_id
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.contrato
            .seguradora_id ===
          filtros.seguradora_id,
      );
  }

  if (
    filtros.produto_id
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.contrato
            .produto_id ===
          filtros.produto_id,
      );
  }

  if (
    filtros.forma_pagamento
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.financeiro
            .forma_pagamento ===
          filtros.forma_pagamento,
      );
  }

  if (
    filtros.situacao
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.parcela
            .situacao ===
          filtros.situacao,
      );
  }

  if (
    filtros.tipo_lancamento
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.parcela
            .tipo_lancamento ===
          filtros.tipo_lancamento,
      );
  }

  if (
    filtros.contrato_id
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.contrato.id ===
          filtros.contrato_id,
      );
  }

  if (
    filtros.cliente_id
  ) {
    filtrados =
      filtrados.filter(
        (item) =>
          item.cliente?.id ===
          filtros.cliente_id,
      );
  }

  if (
    filtros.busca?.trim()
  ) {
    const busca =
      normalizarTextoBusca(
        filtros.busca,
      );

    filtrados =
      filtrados.filter(
        (item) => {
          const campos = [
            item.cliente?.nome,
            item.contrato
              .numero_apolice,
            item.produto_nome,
            item.seguradora_nome,
            item.corretor_nome,
            item.parcela
              .descricao,
            item.parcela
              .numero_parcela != null
              ? String(
                  item.parcela
                    .numero_parcela,
                )
              : null,
          ];

          return campos.some(
            (campo) =>
              normalizarTextoBusca(
                campo,
              ).includes(
                busca,
              ),
          );
        },
      );
  }

  const resumo =
    criarResumoFinanceiroGeral(
      filtrados,
    );

  const total =
    filtrados.length;

  const totalPaginas =
    total === 0
      ? 0
      : Math.ceil(
          total / limite,
        );

  const inicio =
    (pagina - 1) *
    limite;

  const fim =
    inicio + limite;

  const itensPagina =
    filtrados.slice(
      inicio,
      fim,
    );

  return {
    itens:
      itensPagina,
    resumo,
    total,
    pagina,
    limite,
    total_paginas:
      totalPaginas,
  };
}