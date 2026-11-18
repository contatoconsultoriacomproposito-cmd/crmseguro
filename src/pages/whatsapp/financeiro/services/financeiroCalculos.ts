import type {
  GerarParcelamentoParams,
  ParcelaFinanceira,
  ParcelaFinanceiraComSituacao,
  ParcelaFinanceiraGerada,
  ResumoFinanceiroContrato,
  SituacaoParcelaFinanceira,
} from "../types/financeiro";

const CENTAVOS = 100;

function normalizarDataISO(data: string): string {
  return data.slice(0, 10);
}

function dataISOParaUTC(data: string): Date {
  const [ano, mes, dia] = normalizarDataISO(data)
    .split("-")
    .map(Number);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function dataParaISO(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterHojeISO(): string {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function adicionarMesesMantendoDia(
  dataInicial: string,
  quantidadeMeses: number,
): string {
  const data = dataISOParaUTC(dataInicial);

  const anoInicial = data.getUTCFullYear();
  const mesInicial = data.getUTCMonth();
  const diaInicial = data.getUTCDate();

  const primeiroDiaMesDestino = new Date(
    Date.UTC(
      anoInicial,
      mesInicial + quantidadeMeses,
      1,
    ),
  );

  const anoDestino = primeiroDiaMesDestino.getUTCFullYear();
  const mesDestino = primeiroDiaMesDestino.getUTCMonth();

  const ultimoDiaMesDestino = new Date(
    Date.UTC(
      anoDestino,
      mesDestino + 1,
      0,
    ),
  ).getUTCDate();

  const diaDestino = Math.min(
    diaInicial,
    ultimoDiaMesDestino,
  );

  return dataParaISO(
    new Date(
      Date.UTC(
        anoDestino,
        mesDestino,
        diaDestino,
      ),
    ),
  );
}

export function arredondarMoeda(
  valor: number,
): number {
  return Math.round(
    (valor + Number.EPSILON) * CENTAVOS,
  ) / CENTAVOS;
}

export function somarValores(
  valores: number[],
): number {
  return arredondarMoeda(
    valores.reduce(
      (total, valor) => total + valor,
      0,
    ),
  );
}

export function calcularSituacaoParcela(
  parcela: Pick<
    ParcelaFinanceira,
    "status" | "data_vencimento"
  >,
  hojeISO = obterHojeISO(),
): SituacaoParcelaFinanceira {
  if (parcela.status === "PAGA") {
    return "PAGA";
  }

  if (parcela.status === "CANCELADA") {
    return "CANCELADA";
  }

  const vencimento =
    normalizarDataISO(parcela.data_vencimento);

  const hoje = normalizarDataISO(hojeISO);

  if (vencimento < hoje) {
    return "ATRASADA";
  }

  if (vencimento === hoje) {
    return "VENCE_HOJE";
  }

  return "A_VENCER";
}

export function adicionarSituacaoParcelas(
  parcelas: ParcelaFinanceira[],
  hojeISO = obterHojeISO(),
): ParcelaFinanceiraComSituacao[] {
  return parcelas.map((parcela) => ({
    ...parcela,
    situacao: calcularSituacaoParcela(
      parcela,
      hojeISO,
    ),
  }));
}

export function gerarParcelamento(
  params: GerarParcelamentoParams,
): ParcelaFinanceiraGerada[] {
  const {
    valor_total,
    quantidade_parcelas,
    primeiro_vencimento,
  } = params;

  const valorTotal =
    arredondarMoeda(valor_total);

  if (!Number.isFinite(valorTotal)) {
    throw new Error(
      "O valor total do parcelamento é inválido.",
    );
  }

  if (valorTotal <= 0) {
    throw new Error(
      "O valor total do parcelamento deve ser maior que zero.",
    );
  }

  if (
    !Number.isInteger(quantidade_parcelas) ||
    quantidade_parcelas <= 0
  ) {
    throw new Error(
      "A quantidade de parcelas deve ser um número inteiro maior que zero.",
    );
  }

  if (!primeiro_vencimento) {
    throw new Error(
      "Informe o primeiro vencimento.",
    );
  }

  const primeiraData =
    dataISOParaUTC(primeiro_vencimento);

  if (
    Number.isNaN(
      primeiraData.getTime(),
    )
  ) {
    throw new Error(
      "A data do primeiro vencimento é inválida.",
    );
  }

  /*
   * Fazemos o cálculo em centavos para evitar problemas
   * de ponto flutuante.
   *
   * Exemplo:
   * R$ 1.000 / 3
   *
   * 1/3 = 333,33
   * 2/3 = 333,33
   * 3/3 = 333,34
   */
  const totalCentavos =
    Math.round(
      valorTotal * CENTAVOS,
    );

  const valorBaseCentavos =
    Math.floor(
      totalCentavos /
        quantidade_parcelas,
    );

  const restoCentavos =
    totalCentavos -
    valorBaseCentavos *
      quantidade_parcelas;

  const parcelas: ParcelaFinanceiraGerada[] =
    [];

  for (
    let indice = 0;
    indice < quantidade_parcelas;
    indice += 1
  ) {
    /*
     * Distribuímos os centavos restantes pelas últimas
     * parcelas para que o total feche exatamente.
     */
    const deveReceberCentavoExtra =
      indice >=
      quantidade_parcelas -
        restoCentavos;

    const valorCentavos =
      valorBaseCentavos +
      (deveReceberCentavoExtra
        ? 1
        : 0);

    parcelas.push({
      numero_parcela: indice + 1,
      valor: valorCentavos / CENTAVOS,
      data_vencimento:
        adicionarMesesMantendoDia(
          primeiro_vencimento,
          indice,
        ),
    });
  }

  return parcelas;
}

export function calcularTotalParcelas(
  parcelas: Array<{
    valor: number;
  }>,
): number {
  return somarValores(
    parcelas.map(
      (parcela) => parcela.valor,
    ),
  );
}

export function calcularDiferencaParcelamento(
  parcelas: Array<{
    valor: number;
  }>,
  valorContrato: number,
): number {
  return arredondarMoeda(
    calcularTotalParcelas(parcelas) -
      arredondarMoeda(valorContrato),
  );
}

export function parcelamentoFechaComContrato(
  parcelas: Array<{
    valor: number;
  }>,
  valorContrato: number,
): boolean {
  return (
    calcularDiferencaParcelamento(
      parcelas,
      valorContrato,
    ) === 0
  );
}

export function validarParcelamento(
  parcelas: ParcelaFinanceiraGerada[],
  valorContrato: number,
): string[] {
  const erros: string[] = [];

  if (parcelas.length === 0) {
    erros.push(
      "Informe pelo menos uma parcela.",
    );

    return erros;
  }

  const numeros =
    parcelas.map(
      (parcela) =>
        parcela.numero_parcela,
    );

  const numerosUnicos =
    new Set(numeros);

  if (
    numerosUnicos.size !==
    parcelas.length
  ) {
    erros.push(
      "Existem números de parcelas duplicados.",
    );
  }

  parcelas.forEach(
    (parcela, indice) => {
      const numeroEsperado =
        indice + 1;

      if (
        parcela.numero_parcela !==
        numeroEsperado
      ) {
        erros.push(
          `A parcela ${numeroEsperado} está com numeração inválida.`,
        );
      }

      if (
        !Number.isFinite(
          parcela.valor,
        ) ||
        parcela.valor <= 0
      ) {
        erros.push(
          `A parcela ${parcela.numero_parcela} possui valor inválido.`,
        );
      }

      if (
        !parcela.data_vencimento
      ) {
        erros.push(
          `A parcela ${parcela.numero_parcela} não possui vencimento.`,
        );
      }
    },
  );

  if (
    !parcelamentoFechaComContrato(
      parcelas,
      valorContrato,
    )
  ) {
    const total =
      calcularTotalParcelas(
        parcelas,
      );

    erros.push(
      `O total das parcelas (${formatarMoeda(total)}) deve ser igual ao valor do contrato (${formatarMoeda(valorContrato)}).`,
    );
  }

  return erros;
}

export function calcularResumoFinanceiroContrato(
  parcelas: ParcelaFinanceira[],
  hojeISO = obterHojeISO(),
): ResumoFinanceiroContrato {
  const resumo: ResumoFinanceiroContrato =
    {
      valor_total: 0,
      valor_pago: 0,
      valor_pendente: 0,
      valor_a_vencer: 0,
      valor_vence_hoje: 0,
      valor_atrasado: 0,
      valor_cancelado: 0,
      valor_avulso: 0,
      quantidade_parcelas: 0,
      quantidade_pagas: 0,
      quantidade_pendentes: 0,
      quantidade_canceladas: 0,
    };

  parcelas.forEach((parcela) => {
    const valor =
      arredondarMoeda(
        parcela.valor,
      );

    const situacao =
      calcularSituacaoParcela(
        parcela,
        hojeISO,
      );

    /*
     * valor_total representa apenas o parcelamento normal
     * do contrato.
     *
     * Lançamentos AVULSOS ficam separados.
     */
    if (
      parcela.tipo_lancamento ===
      "AVULSO"
    ) {
      resumo.valor_avulso += valor;
    } else {
      resumo.valor_total += valor;
      resumo.quantidade_parcelas += 1;
    }

    if (
      parcela.status === "PAGA"
    ) {
      resumo.valor_pago += valor;
      resumo.quantidade_pagas += 1;
    }

    if (
      parcela.status ===
      "CANCELADA"
    ) {
      resumo.valor_cancelado += valor;
      resumo.quantidade_canceladas += 1;
    }

    if (
      parcela.status ===
      "PENDENTE"
    ) {
      resumo.valor_pendente += valor;
      resumo.quantidade_pendentes += 1;

      if (
        situacao === "A_VENCER"
      ) {
        resumo.valor_a_vencer += valor;
      }

      if (
        situacao ===
        "VENCE_HOJE"
      ) {
        resumo.valor_vence_hoje +=
          valor;
      }

      if (
        situacao === "ATRASADA"
      ) {
        resumo.valor_atrasado +=
          valor;
      }
    }
  });

  return {
    valor_total: arredondarMoeda(
      resumo.valor_total,
    ),
    valor_pago: arredondarMoeda(
      resumo.valor_pago,
    ),
    valor_pendente:
      arredondarMoeda(
        resumo.valor_pendente,
      ),
    valor_a_vencer:
      arredondarMoeda(
        resumo.valor_a_vencer,
      ),
    valor_vence_hoje:
      arredondarMoeda(
        resumo.valor_vence_hoje,
      ),
    valor_atrasado:
      arredondarMoeda(
        resumo.valor_atrasado,
      ),
    valor_cancelado:
      arredondarMoeda(
        resumo.valor_cancelado,
      ),
    valor_avulso:
      arredondarMoeda(
        resumo.valor_avulso,
      ),
    quantidade_parcelas:
      resumo.quantidade_parcelas,
    quantidade_pagas:
      resumo.quantidade_pagas,
    quantidade_pendentes:
      resumo.quantidade_pendentes,
    quantidade_canceladas:
      resumo.quantidade_canceladas,
  };
}

export function formatarMoeda(
  valor: number,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    arredondarMoeda(valor),
  );
}

export function formatarFormaPagamento(
  forma: string,
): string {
  const labels: Record<
    string,
    string
  > = {
    CARTAO_CREDITO:
      "Cartão de crédito",
    DEBITO_CONTA:
      "Débito em conta",
    BOLETO: "Boleto",
    PIX: "PIX",
    DINHEIRO: "Dinheiro",
    OUTROS: "Outros",
  };

  return labels[forma] ?? forma;
}

export function formatarSituacaoFinanceira(
  situacao: SituacaoParcelaFinanceira,
): string {
  const labels: Record<
    SituacaoParcelaFinanceira,
    string
  > = {
    A_VENCER: "A vencer",
    VENCE_HOJE: "Vence hoje",
    ATRASADA: "Atrasada",
    PAGA: "Paga",
    CANCELADA: "Cancelada",
  };

  return labels[situacao];
}