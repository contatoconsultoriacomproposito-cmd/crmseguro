import type {
  CalculoComissao,
  CalculoDistribuicaoComissao,
  ComissaoPagamento,
  ComissaoPagamentoComSituacao,
  ComissaoRecebimento,
  ComissaoRecebimentoComSituacao,
  ComissaoSplit,
  DeducaoComissaoCalculada,
  DeducaoComissaoInput,
  ProvisaoPagamentoSplitGerada,
  RecebimentoComissaoInput,
  ProvisaoPagamentoSplitInput,
  ResumoPagamentosComissao,
  ResumoRecebimentosComissao,
  ResumoSplitsComissao,
  SituacaoPagamentoComissao,
  SituacaoRecebimentoComissao,
  SplitComissaoCalculado,
  SplitComissaoInput,
} from "../types/comissoes";

const ZERO = 0;

export function arredondarMoeda(valor: number): number {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

export function somarValores(valores: number[]): number {
  return arredondarMoeda(
    valores.reduce((total, valor) => total + Number(valor || 0), 0)
  );
}

export function hojeISO(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function criarDataUTC(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.split("-").map(Number);

  if (!ano || !mes || !dia) {
    throw new Error(`Data inválida: ${dataISO}`);
  }

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarDataUTC(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function ultimoDiaMesUTC(ano: number, mesZeroBased: number): number {
  return new Date(Date.UTC(ano, mesZeroBased + 1, 0)).getUTCDate();
}

export function adicionarMesesPreservandoDia(
  dataISO: string,
  quantidadeMeses: number
): string {
  const origem = criarDataUTC(dataISO);

  const diaOriginal = origem.getUTCDate();
  const mesAbsoluto =
    origem.getUTCFullYear() * 12 +
    origem.getUTCMonth() +
    quantidadeMeses;

  const anoDestino = Math.floor(mesAbsoluto / 12);
  const mesDestino = mesAbsoluto % 12;

  const ultimoDia = ultimoDiaMesUTC(anoDestino, mesDestino);
  const diaDestino = Math.min(diaOriginal, ultimoDia);

  return formatarDataUTC(
    new Date(Date.UTC(anoDestino, mesDestino, diaDestino))
  );
}

export function compararDatasISO(
  dataA: string,
  dataB: string
): -1 | 0 | 1 {
  if (dataA === dataB) return 0;
  return dataA < dataB ? -1 : 1;
}

export function calcularDeducao(
  base: number,
  deducao: DeducaoComissaoInput
): DeducaoComissaoCalculada {
  const baseTratada = arredondarMoeda(Math.max(ZERO, Number(base || 0)));

  if (!deducao.descricao?.trim()) {
    throw new Error("Informe a descrição da dedução.");
  }

  if (deducao.tipo_calculo === "PERCENTUAL") {
    const percentual = Number(deducao.percentual ?? 0);

    if (percentual < 0) {
      throw new Error("O percentual da dedução não pode ser negativo.");
    }

    const valorCalculado = arredondarMoeda(
      baseTratada * (percentual / 100)
    );

    return {
      ...deducao,
      descricao: deducao.descricao.trim(),
      percentual,
      valor_fixo: null,
      valor_calculado: valorCalculado,
    };
  }

  const valorFixo = arredondarMoeda(
    Number(deducao.valor_fixo ?? 0)
  );

  if (valorFixo < 0) {
    throw new Error("O valor fixo da dedução não pode ser negativo.");
  }

  return {
    ...deducao,
    descricao: deducao.descricao.trim(),
    percentual: null,
    valor_fixo: valorFixo,
    valor_calculado: valorFixo,
  };
}

export function calcularComissao(params: {
  valor_base_original: number;
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  deducoes?: DeducaoComissaoInput[];
}): CalculoComissao {
  const valorBaseOriginal = arredondarMoeda(
    Number(params.valor_base_original || 0)
  );

  if (valorBaseOriginal < 0) {
    throw new Error("A base original da comissão não pode ser negativa.");
  }

  const deducoes = (params.deducoes ?? []).map((deducao) =>
    calcularDeducao(valorBaseOriginal, deducao)
  );

  const valorDeducoesBase = somarValores(
    deducoes.map((deducao) => deducao.valor_calculado)
  );

  if (valorDeducoesBase > valorBaseOriginal) {
    throw new Error(
      "As deduções não podem superar a base original da comissão."
    );
  }

  const valorBaseCalculo = arredondarMoeda(
    valorBaseOriginal - valorDeducoesBase
  );

  const percentual =
    params.percentual_comissao === null ||
    params.percentual_comissao === undefined
      ? null
      : Number(params.percentual_comissao);

  if (percentual !== null && percentual < 0) {
    throw new Error("O percentual de comissão não pode ser negativo.");
  }

  const valorFixo =
    params.valor_comissao_fixa === null ||
    params.valor_comissao_fixa === undefined
      ? null
      : arredondarMoeda(Number(params.valor_comissao_fixa));

  if (valorFixo !== null && valorFixo < 0) {
    throw new Error("O valor da comissão não pode ser negativo.");
  }

  if (percentual !== null && valorFixo !== null) {
    throw new Error(
      "Informe percentual de comissão ou valor fixo, não os dois."
    );
  }

  if (percentual === null && valorFixo === null) {
    throw new Error(
      "Informe o percentual ou o valor da comissão."
    );
  }

  const valorComissaoBruta =
    valorFixo !== null
      ? valorFixo
      : arredondarMoeda(
          valorBaseCalculo * ((percentual ?? 0) / 100)
        );

  return {
    tipo_calculo_comissao:
        percentual !== null ? "PERCENTUAL" : "FIXO",
    valor_base_original: valorBaseOriginal,
    valor_deducoes_base: valorDeducoesBase,
    valor_base_calculo: valorBaseCalculo,
    percentual_comissao: percentual,
    valor_comissao_fixa: valorFixo,
    valor_comissao_bruta: valorComissaoBruta,
    deducoes,
    };
}

export function calcularSplitComissao(
  split: SplitComissaoInput,
  contexto: {
    valor_comissao_bruta: number;
    valor_base_calculo: number;
  }
): SplitComissaoCalculado {
  let valorBrutoSplit = ZERO;

  if (split.tipo_calculo === "PERCENTUAL") {
    const percentual = Number(split.percentual ?? 0);

    if (percentual < 0) {
      throw new Error(
        "O percentual do participante não pode ser negativo."
      );
    }

    if (!split.base_percentual) {
      throw new Error(
        "Informe a base percentual do participante."
      );
    }

    const base =
      split.base_percentual === "COMISSAO_BRUTA"
        ? contexto.valor_comissao_bruta
        : contexto.valor_base_calculo;

    valorBrutoSplit = arredondarMoeda(
      Number(base || 0) * (percentual / 100)
    );
  } else {
    const valorFixo = arredondarMoeda(
      Number(split.valor_fixo ?? 0)
    );

    if (valorFixo < 0) {
      throw new Error(
        "O valor fixo do participante não pode ser negativo."
      );
    }

    valorBrutoSplit = valorFixo;
  }

  const deducoesCalculadas = (split.deducoes ?? []).map(
    (deducao) => calcularDeducao(valorBrutoSplit, deducao)
  );

  const valorDeducoes = somarValores(
    deducoesCalculadas.map(
      (deducao) => deducao.valor_calculado
    )
  );

  if (valorDeducoes > valorBrutoSplit) {
    throw new Error(
      "As deduções do participante não podem superar seu valor bruto."
    );
  }

  return {
    ...split,
    percentual:
      split.tipo_calculo === "PERCENTUAL"
        ? Number(split.percentual ?? 0)
        : null,
    valor_fixo:
      split.tipo_calculo === "FIXO"
        ? arredondarMoeda(Number(split.valor_fixo ?? 0))
        : null,
    base_percentual:
      split.tipo_calculo === "PERCENTUAL"
        ? split.base_percentual ?? null
        : null,
    residual_corretora: Boolean(split.residual_corretora),
    ordem: split.ordem ?? 0,
    valor_bruto_split: valorBrutoSplit,
    valor_deducoes: valorDeducoes,
    valor_liquido_split: arredondarMoeda(
      valorBrutoSplit - valorDeducoes
    ),
    deducoes_calculadas: deducoesCalculadas,
  };
}

export function calcularDistribuicaoComissao(params: {
  valor_comissao_bruta: number;
  valor_base_calculo: number;
  splits: SplitComissaoInput[];
}): CalculoDistribuicaoComissao {
  const valorComissaoBruta = arredondarMoeda(
    Number(params.valor_comissao_bruta || 0)
  );

  const splitsSemResidual = params.splits.filter(
    (split) => !split.residual_corretora
  );

  const splitsCalculados = splitsSemResidual.map((split) =>
    calcularSplitComissao(split, {
      valor_comissao_bruta: valorComissaoBruta,
      valor_base_calculo: params.valor_base_calculo,
    })
  );

  const valorDistribuido = somarValores(
    splitsCalculados.map((split) => split.valor_bruto_split)
  );

  if (valorDistribuido > valorComissaoBruta) {
    throw new Error(
      "A distribuição não pode superar a comissão bruta."
    );
  }

  const valorResidual = arredondarMoeda(
    valorComissaoBruta - valorDistribuido
  );

  const residualExistente = params.splits.find(
    (split) =>
      split.tipo_participante === "CORRETORA" &&
      split.residual_corretora
  );

  const splitResidual: SplitComissaoCalculado = {
    tipo_participante: "CORRETORA",
    usuario_id: null,
    participante_nome: residualExistente?.participante_nome ?? null,
    participante_documento:
      residualExistente?.participante_documento ?? null,
    participante_metadata:
      residualExistente?.participante_metadata ?? {},
    tipo_calculo: "FIXO",
    base_percentual: null,
    percentual: null,
    valor_fixo: valorResidual,
    residual_corretora: true,
    ordem:
      residualExistente?.ordem ??
      splitsCalculados.length + 1,
    deducoes: [],
    valor_bruto_split: valorResidual,
    valor_deducoes: ZERO,
    valor_liquido_split: valorResidual,
    deducoes_calculadas: [],
  };

  return {
    valor_comissao_bruta: valorComissaoBruta,
    valor_distribuido: valorDistribuido,
    valor_residual_corretora: valorResidual,
    splits: [...splitsCalculados, splitResidual],
  };
}

function distribuirValorEmProvisoes(
  valorTotal: number,
  quantidade: number
): number[] {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error(
      "A quantidade de provisões deve ser maior que zero."
    );
  }

  const totalCentavos = Math.round(
    arredondarMoeda(valorTotal) * 100
  );

  const baseCentavos = Math.floor(
    totalCentavos / quantidade
  );

  const restoCentavos =
    totalCentavos - baseCentavos * quantidade;

  return Array.from(
    { length: quantidade },
    (_, indice) =>
      (baseCentavos + (indice < restoCentavos ? 1 : 0)) /
      100
  );
}

export function calcularValorRecebimento(
  valorBaseReferencia: number,
  percentualPrevisto: number
): number {
  const valorBase = arredondarMoeda(
    Number(valorBaseReferencia || 0)
  );
  const percentual = Number(percentualPrevisto || 0);

  if (valorBase < 0) {
    throw new Error(
      "A base de referência não pode ser negativa."
    );
  }

  if (percentual < 0) {
    throw new Error(
      "O percentual previsto não pode ser negativo."
    );
  }

  return arredondarMoeda(
    valorBase * (percentual / 100)
  );
}

export function calcularPercentualRecebimento(
  valorBaseReferencia: number,
  valorPrevisto: number
): number {
  const valorBase = arredondarMoeda(
    Number(valorBaseReferencia || 0)
  );
  const valor = arredondarMoeda(
    Number(valorPrevisto || 0)
  );

  if (valorBase <= 0) return ZERO;

  if (valor < 0) {
    throw new Error(
      "O valor previsto do recebimento não pode ser negativo."
    );
  }

  return Number(
    ((valor / valorBase) * 100).toFixed(6)
  );
}

export function calcularComissaoBrutaRecebimentos(
  recebimentos: RecebimentoComissaoInput[]
): number {
  return somarValores(
    (recebimentos ?? []).map(
      (recebimento) =>
        normalizarValorRecebimento(
          recebimento
        ).valor_previsto
    )
  );
}

export function normalizarValorRecebimento(
  recebimento: RecebimentoComissaoInput
): RecebimentoComissaoInput {
  const valorBaseReferencia = arredondarMoeda(
    Number(recebimento.valor_base_referencia || 0)
  );

  const percentualPrevisto = Number(
    recebimento.percentual_previsto || 0
  );

  const valorPrevisto = calcularValorRecebimento(
    valorBaseReferencia,
    percentualPrevisto
  );

  return {
    ...recebimento,
    valor_base_referencia: valorBaseReferencia,
    percentual_previsto: percentualPrevisto,
    valor_previsto: valorPrevisto,
  };
}

export function validarRecebimentosComissao(params: {
  recebimentos: RecebimentoComissaoInput[];
}): string[] {
  const erros: string[] = [];
  const recebimentos = params.recebimentos ?? [];

  if (!recebimentos.length) {
    return [
      "Informe ao menos um recebimento da seguradora.",
    ];
  }

  recebimentos.forEach((recebimento, indice) => {
    const numero = indice + 1;
    const baseReferencia = arredondarMoeda(
      Number(recebimento.valor_base_referencia || 0)
    );
    const percentual = Number(
      recebimento.percentual_previsto || 0
    );
    const valor = arredondarMoeda(
      Number(recebimento.valor_previsto || 0)
    );

    if (!recebimento.data_prevista) {
      erros.push(
        `Recebimento ${numero}: informe a data prevista.`
      );
    }

    if (baseReferencia <= 0) {
      erros.push(
        `Recebimento ${numero}: a base de referência deve ser maior que zero.`
      );
    }

    if (percentual <= 0) {
      erros.push(
        `Recebimento ${numero}: o percentual deve ser maior que 0%.`
      );
    }

    if (valor <= 0) {
      erros.push(
        `Recebimento ${numero}: o valor deve ser maior que zero.`
      );
    }

    if (baseReferencia > 0 && percentual > 0) {
      const valorCalculado = calcularValorRecebimento(
        baseReferencia,
        percentual
      );

      if (Math.abs(valor - valorCalculado) > 0.01) {
        erros.push(
          `Recebimento ${numero}: percentual e valor não correspondem à base de referência informada.`
        );
      }
    }
  });

  return erros;
}

export function calcularValorPagamentoSplit(
  valorBaseReferencia: number,
  percentualPrevisto: number
): number {
  const valorBase = arredondarMoeda(
    Number(valorBaseReferencia || 0)
  );
  const percentual = Number(
    percentualPrevisto || 0
  );

  if (valorBase < 0) {
    throw new Error(
      "A base de referência do pagamento não pode ser negativa."
    );
  }

  if (percentual < 0) {
    throw new Error(
      "O percentual previsto do pagamento não pode ser negativo."
    );
  }

  return arredondarMoeda(
    valorBase * (percentual / 100)
  );
}

export function calcularPercentualPagamentoSplit(
  valorBaseReferencia: number,
  valorPrevisto: number
): number {
  const valorBase = arredondarMoeda(
    Number(valorBaseReferencia || 0)
  );

  const valor = arredondarMoeda(
    Number(valorPrevisto || 0)
  );

  if (valorBase <= 0) return ZERO;

  if (valor < 0) {
    throw new Error(
      "O valor previsto do pagamento não pode ser negativo."
    );
  }

  return Number(
    ((valor / valorBase) * 100).toFixed(6)
  );
}

export function validarPagamentosSplit(params: {
  valor_liquido_split: number;
  pagamentos: ProvisaoPagamentoSplitInput[];
}): string[] {
  const erros: string[] = [];

  const valorLiquido = arredondarMoeda(
    Number(params.valor_liquido_split || 0)
  );

  const pagamentos =
    params.pagamentos ?? [];

  if (valorLiquido > 0 && !pagamentos.length) {
    return [
      "Informe ao menos um pagamento do participante.",
    ];
  }

  if (
    valorLiquido === 0 &&
    pagamentos.length > 0
  ) {
    return [
      "Participante com valor líquido zero não deve possuir pagamentos.",
    ];
  }

  let totalPagamentos = ZERO;

  pagamentos.forEach(
    (pagamento, indice) => {
      const numero = indice + 1;

      const baseReferencia =
        arredondarMoeda(
          Number(
            pagamento.valor_base_referencia ||
              0
          )
        );

      const percentual = Number(
        pagamento.percentual_previsto || 0
      );

      const valor = arredondarMoeda(
        Number(
          pagamento.valor_previsto || 0
        )
      );

      if (!pagamento.data_prevista) {
        erros.push(
          `Pagamento ${numero}: informe a data prevista.`
        );
      }

      if (
        Math.abs(
          baseReferencia - valorLiquido
        ) > 0.009
      ) {
        erros.push(
          `Pagamento ${numero}: a base de referência deve corresponder ao valor líquido do participante.`
        );
      }

      if (percentual <= 0) {
        erros.push(
          `Pagamento ${numero}: o percentual deve ser maior que 0%.`
        );
      }

      if (valor <= 0) {
        erros.push(
          `Pagamento ${numero}: o valor deve ser maior que zero.`
        );
      }

      if (
        baseReferencia > 0 &&
        percentual > 0
      ) {
        const valorCalculado =
          calcularValorPagamentoSplit(
            baseReferencia,
            percentual
          );

        if (
          Math.abs(
            valor - valorCalculado
          ) > 0.01
        ) {
          erros.push(
            `Pagamento ${numero}: percentual e valor não correspondem à base líquida do participante.`
          );
        }
      }

      totalPagamentos =
        arredondarMoeda(
          totalPagamentos + valor
        );
    }
  );

  if (
    Math.abs(
      totalPagamentos - valorLiquido
    ) > 0.009
  ) {
    erros.push(
      "A soma dos pagamentos deve corresponder exatamente ao valor líquido do participante."
    );
  }

  return erros;
}

export function gerarProvisoesPagamentoSplit(params: {
  valor_total: number;
  quantidade_provisoes: number;
  primeiro_pagamento: string;
  datas?: string[];
}): ProvisaoPagamentoSplitGerada[] {
  const quantidade = params.datas?.length
    ? params.datas.length
    : params.quantidade_provisoes;

  if (!params.primeiro_pagamento && !params.datas?.length) {
    throw new Error(
      "Informe a data do primeiro pagamento."
    );
  }

  const valores = distribuirValorEmProvisoes(
    params.valor_total,
    quantidade
  );

  return valores.map((valor, indice) => ({
    numero_provisao: indice + 1,
    valor_previsto: valor,
    data_prevista:
      params.datas?.[indice] ??
      adicionarMesesPreservandoDia(
        params.primeiro_pagamento,
        indice
      ),
    descricao:
      quantidade === 1
        ? "Pagamento de comissão"
        : `Pagamento ${indice + 1}/${quantidade}`,
  }));
}

export function obterSituacaoRecebimento(
  recebimento: Pick<
    ComissaoRecebimento,
    "status" | "data_prevista"
  >,
  dataReferencia = hojeISO()
): SituacaoRecebimentoComissao {
  if (recebimento.status === "RECEBIDA") {
    return "RECEBIDA";
  }

  if (recebimento.status === "CANCELADA") {
    return "CANCELADA";
  }

  const comparacao = compararDatasISO(
    recebimento.data_prevista,
    dataReferencia
  );

  if (comparacao < 0) return "ATRASADA";
  if (comparacao === 0) return "RECEBE_HOJE";

  return "A_RECEBER";
}

export function obterSituacaoPagamento(
  pagamento: Pick<
    ComissaoPagamento,
    "status" | "data_prevista"
  >,
  dataReferencia = hojeISO()
): SituacaoPagamentoComissao {
  if (pagamento.status === "PAGA") {
    return "PAGA";
  }

  if (pagamento.status === "CANCELADA") {
    return "CANCELADA";
  }

  const comparacao = compararDatasISO(
    pagamento.data_prevista,
    dataReferencia
  );

  if (comparacao < 0) return "ATRASADA";
  if (comparacao === 0) return "VENCE_HOJE";

  return "A_PAGAR";
}

export function adicionarSituacaoRecebimentos(
  recebimentos: ComissaoRecebimento[],
  dataReferencia = hojeISO()
): ComissaoRecebimentoComSituacao[] {
  return recebimentos.map((recebimento) => ({
    ...recebimento,
    situacao: obterSituacaoRecebimento(
      recebimento,
      dataReferencia
    ),
  }));
}

export function adicionarSituacaoPagamentos(
  pagamentos: ComissaoPagamento[],
  dataReferencia = hojeISO()
): ComissaoPagamentoComSituacao[] {
  return pagamentos.map((pagamento) => ({
    ...pagamento,
    situacao: obterSituacaoPagamento(
      pagamento,
      dataReferencia
    ),
  }));
}

export function calcularResumoRecebimentos(
  recebimentos: ComissaoRecebimentoComSituacao[]
): ResumoRecebimentosComissao {
  const resumo: ResumoRecebimentosComissao = {
    valor_total_previsto: ZERO,
    valor_recebido: ZERO,
    valor_pendente: ZERO,
    valor_a_receber: ZERO,
    valor_recebe_hoje: ZERO,
    valor_atrasado: ZERO,
    valor_cancelado: ZERO,
    quantidade_total: recebimentos.length,
    quantidade_recebidas: ZERO,
    quantidade_pendentes: ZERO,
    quantidade_canceladas: ZERO,
  };

  for (const recebimento of recebimentos) {
    resumo.valor_total_previsto +=
      recebimento.valor_previsto;

    if (recebimento.status === "RECEBIDA") {
      resumo.quantidade_recebidas += 1;
      resumo.valor_recebido +=
        recebimento.valor_recebido ??
        recebimento.valor_previsto;
      continue;
    }

    if (recebimento.status === "CANCELADA") {
      resumo.quantidade_canceladas += 1;
      resumo.valor_cancelado +=
        recebimento.valor_previsto;
      continue;
    }

    resumo.quantidade_pendentes += 1;
    resumo.valor_pendente += recebimento.valor_previsto;

    if (recebimento.situacao === "A_RECEBER") {
      resumo.valor_a_receber +=
        recebimento.valor_previsto;
    }

    if (recebimento.situacao === "RECEBE_HOJE") {
      resumo.valor_recebe_hoje +=
        recebimento.valor_previsto;
    }

    if (recebimento.situacao === "ATRASADA") {
      resumo.valor_atrasado +=
        recebimento.valor_previsto;
    }
  }

  return {
    ...resumo,
    valor_total_previsto: arredondarMoeda(
      resumo.valor_total_previsto
    ),
    valor_recebido: arredondarMoeda(
      resumo.valor_recebido
    ),
    valor_pendente: arredondarMoeda(
      resumo.valor_pendente
    ),
    valor_a_receber: arredondarMoeda(
      resumo.valor_a_receber
    ),
    valor_recebe_hoje: arredondarMoeda(
      resumo.valor_recebe_hoje
    ),
    valor_atrasado: arredondarMoeda(
      resumo.valor_atrasado
    ),
    valor_cancelado: arredondarMoeda(
      resumo.valor_cancelado
    ),
  };
}

export function calcularResumoPagamentos(
  pagamentos: ComissaoPagamentoComSituacao[]
): ResumoPagamentosComissao {
  const resumo: ResumoPagamentosComissao = {
    valor_total_previsto: ZERO,
    valor_pago: ZERO,
    valor_pendente: ZERO,
    valor_a_pagar: ZERO,
    valor_vence_hoje: ZERO,
    valor_atrasado: ZERO,
    valor_cancelado: ZERO,
    quantidade_total: pagamentos.length,
    quantidade_pagas: ZERO,
    quantidade_pendentes: ZERO,
    quantidade_canceladas: ZERO,
  };

  for (const pagamento of pagamentos) {
    resumo.valor_total_previsto += pagamento.valor_previsto;

    if (pagamento.status === "PAGA") {
      resumo.quantidade_pagas += 1;
      resumo.valor_pago +=
        pagamento.valor_pago ??
        pagamento.valor_previsto;
      continue;
    }

    if (pagamento.status === "CANCELADA") {
      resumo.quantidade_canceladas += 1;
      resumo.valor_cancelado += pagamento.valor_previsto;
      continue;
    }

    resumo.quantidade_pendentes += 1;
    resumo.valor_pendente += pagamento.valor_previsto;

    if (pagamento.situacao === "A_PAGAR") {
      resumo.valor_a_pagar += pagamento.valor_previsto;
    }

    if (pagamento.situacao === "VENCE_HOJE") {
      resumo.valor_vence_hoje += pagamento.valor_previsto;
    }

    if (pagamento.situacao === "ATRASADA") {
      resumo.valor_atrasado += pagamento.valor_previsto;
    }
  }

  return {
    ...resumo,
    valor_total_previsto: arredondarMoeda(
      resumo.valor_total_previsto
    ),
    valor_pago: arredondarMoeda(resumo.valor_pago),
    valor_pendente: arredondarMoeda(
      resumo.valor_pendente
    ),
    valor_a_pagar: arredondarMoeda(
      resumo.valor_a_pagar
    ),
    valor_vence_hoje: arredondarMoeda(
      resumo.valor_vence_hoje
    ),
    valor_atrasado: arredondarMoeda(
      resumo.valor_atrasado
    ),
    valor_cancelado: arredondarMoeda(
      resumo.valor_cancelado
    ),
  };
}

export function calcularResumoSplits(params: {
  valor_comissao_bruta: number;
  splits: ComissaoSplit[];
}): ResumoSplitsComissao {
  const splitsParticipantes = params.splits.filter(
    (split) => !split.residual_corretora
  );

  const residual = params.splits
    .filter((split) => split.residual_corretora)
    .reduce(
      (total, split) =>
        total + Number(split.valor_liquido_split || 0),
      ZERO
    );

  return {
    valor_comissao_bruta: arredondarMoeda(
      params.valor_comissao_bruta
    ),
    valor_distribuido_bruto: somarValores(
      splitsParticipantes.map(
        (split) => split.valor_bruto_split
      )
    ),
    valor_deducoes_splits: somarValores(
      splitsParticipantes.map(
        (split) => split.valor_deducoes
      )
    ),
    valor_distribuido_liquido: somarValores(
      splitsParticipantes.map(
        (split) => split.valor_liquido_split
      )
    ),
    valor_residual_corretora: arredondarMoeda(residual),
    quantidade_splits: splitsParticipantes.length,
  };
}

export function validarDistribuicaoComissao(params: {
  valor_comissao_bruta: number;
  splits: SplitComissaoCalculado[];
}): string[] {
  const erros: string[] = [];

  const participantes = params.splits.filter(
    (split) => !split.residual_corretora
  );

  const residuais = params.splits.filter(
    (split) => split.residual_corretora
  );

  if (residuais.length > 1) {
    erros.push(
      "A comissão pode possuir apenas um residual da corretora."
    );
  }

  const totalDistribuido = somarValores(
    participantes.map((split) => split.valor_bruto_split)
  );

  if (
    totalDistribuido >
    arredondarMoeda(params.valor_comissao_bruta)
  ) {
    erros.push(
      "A distribuição supera o valor da comissão bruta."
    );
  }

  for (const split of participantes) {
    if (
      ["CORRETOR", "SUPERVISOR"].includes(
        split.tipo_participante
      ) &&
      !split.usuario_id
    ) {
      erros.push(
        `${split.tipo_participante}: selecione um usuário.`
      );
    }

    if (
      ["PARCEIRO", "INDICADOR", "OUTRO"].includes(
        split.tipo_participante
      ) &&
      !split.participante_nome?.trim()
    ) {
      erros.push(
        `${split.tipo_participante}: informe o participante.`
      );
    }

    if (split.valor_deducoes > split.valor_bruto_split) {
      erros.push(
        `As deduções de ${
          split.participante_nome ??
          split.tipo_participante
        } superam o valor bruto do split.`
      );
    }
  }

  return erros;
}

export function formatarMoedaComissao(
  valor: number | null | undefined
): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor ?? 0));
}

export function formatarPercentualComissao(
  valor: number | null | undefined
): string {
  if (valor === null || valor === undefined) {
    return "—";
  }

  return `${Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })}%`;
}