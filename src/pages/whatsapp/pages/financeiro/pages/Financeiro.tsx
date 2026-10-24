import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  buscarFinanceiroGeral,
} from "../services/financeiroService";

import {
  FORMAS_PAGAMENTO_FINANCEIRO,
  SITUACOES_FINANCEIRAS,
} from "../types/financeiro";

import type {
  FiltrosFinanceiro,
  FormaPagamentoFinanceiro,
  ItemFinanceiroGeral,
  ResultadoBuscaFinanceiroGeral,
  SituacaoParcelaFinanceira,
  TipoLancamentoFinanceiro,
} from "../types/financeiro";

const LIMITE_POR_PAGINA = 20;

const RESULTADO_VAZIO: ResultadoBuscaFinanceiroGeral = {
  itens: [],
  resumo: {
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
  },
  total: 0,
  pagina: 1,
  limite: LIMITE_POR_PAGINA,
  total_paginas: 0,
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

function formatarData(data: string | null | undefined): string {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarFormaPagamento(
  forma: FormaPagamentoFinanceiro,
): string {
  return (
    FORMAS_PAGAMENTO_FINANCEIRO.find(
      (item) => item.value === forma,
    )?.label ?? forma
  );
}

function formatarSituacao(
  situacao: SituacaoParcelaFinanceira,
): string {
  return (
    SITUACOES_FINANCEIRAS.find(
      (item) => item.value === situacao,
    )?.label ?? situacao
  );
}

function obterClasseSituacao(
  situacao: SituacaoParcelaFinanceira,
): string {
  switch (situacao) {
    case "A_VENCER":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";

    case "VENCE_HOJE":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";

    case "ATRASADA":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";

    case "PAGA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "CANCELADA":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function obterDescricaoParcela(
  item: ItemFinanceiroGeral,
): string {
  if (item.parcela.tipo_lancamento === "AVULSO") {
    return item.parcela.descricao?.trim() || "Avulso";
  }

  if (item.parcela.numero_parcela == null) {
    return "Parcela";
  }

  return `${item.parcela.numero_parcela}/${item.financeiro.quantidade_parcelas}`;
}

interface ResumoCardProps {
  titulo: string;
  valor: number;
  quantidade: number;
  icone: React.ReactNode;
  destaque?: "normal" | "alerta" | "sucesso";
}

function ResumoCard({
  titulo,
  valor,
  quantidade,
  icone,
  destaque = "normal",
}: ResumoCardProps) {
  const classes = {
    normal:
      "text-zinc-700 dark:text-zinc-200",
    alerta:
      "text-red-600 dark:text-red-400",
    sucesso:
      "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {titulo}
          </p>

          <p
            className={`mt-2 text-xl font-semibold ${classes[destaque]}`}
          >
            {formatarMoeda(valor)}
          </p>

          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {quantidade}{" "}
            {quantidade === 1
              ? "lançamento"
              : "lançamentos"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {icone}
        </div>
      </div>
    </div>
  );
}

export default function Financeiro() {
  const navigate = useNavigate();

  const [resultado, setResultado] =
    useState<ResultadoBuscaFinanceiroGeral>(
      RESULTADO_VAZIO,
    );

  const [loading, setLoading] =
    useState(true);

  const [buscaDigitada, setBuscaDigitada] =
    useState("");

  const [busca, setBusca] =
    useState("");

  const [situacao, setSituacao] =
    useState<
      SituacaoParcelaFinanceira | ""
    >("");

  const [
    formaPagamento,
    setFormaPagamento,
  ] =
    useState<
      FormaPagamentoFinanceiro | ""
    >("");

  const [
    tipoLancamento,
    setTipoLancamento,
  ] =
    useState<
      TipoLancamentoFinanceiro | ""
    >("");

  const [dataInicio, setDataInicio] =
    useState("");

  const [dataFim, setDataFim] =
    useState("");

  const [pagina, setPagina] =
    useState(1);

  const filtros =
    useMemo<FiltrosFinanceiro>(
      () => ({
        busca:
          busca || undefined,
        situacao:
          situacao || undefined,
        forma_pagamento:
          formaPagamento || undefined,
        tipo_lancamento:
          tipoLancamento || undefined,
        data_inicio:
          dataInicio || undefined,
        data_fim:
          dataFim || undefined,
        pagina,
        limite:
          LIMITE_POR_PAGINA,
      }),
      [
        busca,
        situacao,
        formaPagamento,
        tipoLancamento,
        dataInicio,
        dataFim,
        pagina,
      ],
    );

  const carregar =
    useCallback(async () => {
      setLoading(true);

      try {
        const dados =
          await buscarFinanceiroGeral(
            filtros,
          );

        setResultado(dados);
      } catch (error) {
        console.error(
          "Erro ao carregar financeiro:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o financeiro.",
        );

        setResultado(
          RESULTADO_VAZIO,
        );
      } finally {
        setLoading(false);
      }
    }, [filtros]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setPagina(1);
        setBusca(
          buscaDigitada.trim(),
        );
      }, 400);

    return () =>
      window.clearTimeout(timer);
  }, [buscaDigitada]);

  const alterarSituacao = (
    valor:
      | SituacaoParcelaFinanceira
      | "",
  ) => {
    setPagina(1);
    setSituacao(valor);
  };

  const alterarFormaPagamento = (
    valor:
      | FormaPagamentoFinanceiro
      | "",
  ) => {
    setPagina(1);
    setFormaPagamento(valor);
  };

  const alterarTipoLancamento = (
    valor:
      | TipoLancamentoFinanceiro
      | "",
  ) => {
    setPagina(1);
    setTipoLancamento(valor);
  };

  const alterarDataInicio = (
    valor: string,
  ) => {
    setPagina(1);
    setDataInicio(valor);
  };

  const alterarDataFim = (
    valor: string,
  ) => {
    setPagina(1);
    setDataFim(valor);
  };

  const limparFiltros = () => {
    setBuscaDigitada("");
    setBusca("");
    setSituacao("");
    setFormaPagamento("");
    setTipoLancamento("");
    setDataInicio("");
    setDataFim("");
    setPagina(1);
  };

  const possuiFiltros =
    Boolean(busca) ||
    Boolean(situacao) ||
    Boolean(formaPagamento) ||
    Boolean(tipoLancamento) ||
    Boolean(dataInicio) ||
    Boolean(dataFim);

  const abrirContrato = (
    contratoId: string,
  ) => {
    navigate(
      `/whatsapp/financeiro/contratos/${contratoId}`,
    );
  };

  const {
    resumo,
    itens,
    total,
    total_paginas: totalPaginas,
  } = resultado;

  return (
    <div className="min-h-full bg-zinc-50 p-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 md:p-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CircleDollarSign
                size={24}
                className="text-emerald-600 dark:text-emerald-400"
              />

              <h1 className="text-xl font-semibold tracking-tight">
                Financeiro
              </h1>
            </div>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Acompanhamento de prêmios e parcelas dos contratos.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void carregar()
            }
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Atualizar
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResumoCard
            titulo="A vencer"
            valor={
              resumo.valor_a_vencer
            }
            quantidade={
              resumo.quantidade_a_vencer
            }
            icone={
              <CalendarClock
                size={18}
              />
            }
          />

          <ResumoCard
            titulo="Vence hoje"
            valor={
              resumo.valor_vence_hoje
            }
            quantidade={
              resumo.quantidade_vence_hoje
            }
            icone={
              <Clock3
                size={18}
              />
            }
          />

          <ResumoCard
            titulo="Atrasadas"
            valor={
              resumo.valor_atrasado
            }
            quantidade={
              resumo.quantidade_atrasada
            }
            destaque="alerta"
            icone={
              <AlertCircle
                size={18}
              />
            }
          />

          <ResumoCard
            titulo="Pagas"
            valor={
              resumo.valor_pago
            }
            quantidade={
              resumo.quantidade_paga
            }
            destaque="sucesso"
            icone={
              <CheckCircle2
                size={18}
              />
            }
          />

          <ResumoCard
            titulo="Canceladas"
            valor={
              resumo.valor_cancelado
            }
            quantidade={
              resumo.quantidade_cancelada
            }
            icone={
              <XCircle
                size={18}
              />
            }
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="text"
                value={
                  buscaDigitada
                }
                onChange={(event) =>
                  setBuscaDigitada(
                    event.target.value,
                  )
                }
                placeholder="Cliente, apólice, produto, seguradora..."
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            <select
              value={situacao}
              onChange={(event) =>
                alterarSituacao(
                  event.target
                    .value as
                    | SituacaoParcelaFinanceira
                    | "",
                )
              }
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2"
            >
              <option value="">
                Todas as situações
              </option>

              {SITUACOES_FINANCEIRAS.map(
                (opcao) => (
                  <option
                    key={
                      opcao.value
                    }
                    value={
                      opcao.value
                    }
                  >
                    {opcao.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                formaPagamento
              }
              onChange={(event) =>
                alterarFormaPagamento(
                  event.target
                    .value as
                    | FormaPagamentoFinanceiro
                    | "",
                )
              }
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2"
            >
              <option value="">
                Todas as formas
              </option>

              {FORMAS_PAGAMENTO_FINANCEIRO.map(
                (opcao) => (
                  <option
                    key={
                      opcao.value
                    }
                    value={
                      opcao.value
                    }
                  >
                    {opcao.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                tipoLancamento
              }
              onChange={(event) =>
                alterarTipoLancamento(
                  event.target
                    .value as
                    | TipoLancamentoFinanceiro
                    | "",
                )
              }
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2"
            >
              <option value="">
                Todos os lançamentos
              </option>
              <option value="PARCELA">
                Parcelas
              </option>
              <option value="AVULSO">
                Avulsos
              </option>
            </select>

            <button
              type="button"
              onClick={
                limparFiltros
              }
              disabled={
                !possuiFiltros
              }
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:col-span-2"
            >
              Limpar filtros
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Vencimento inicial
              </span>

              <input
                type="date"
                value={dataInicio}
                onChange={(event) =>
                  alterarDataInicio(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Vencimento final
              </span>

              <input
                type="date"
                value={dataFim}
                onChange={(event) =>
                  alterarDataFim(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-semibold">
                Prêmios / Parcelas
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {total}{" "}
                {total === 1
                  ? "lançamento encontrado"
                  : "lançamentos encontrados"}
              </p>
            </div>

            <WalletCards
              size={18}
              className="text-zinc-400"
            />
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2
                  size={24}
                  className="animate-spin"
                />
                <span className="text-sm">
                  Carregando financeiro...
                </span>
              </div>
            </div>
          ) : itens.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="rounded-full bg-zinc-100 p-3 text-zinc-400 dark:bg-zinc-900">
                <FileText
                  size={22}
                />
              </div>

              <p className="mt-3 text-sm font-medium">
                Nenhum lançamento encontrado
              </p>

              <p className="mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
                Não existem parcelas que correspondam aos filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900/60">
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Cliente
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Produto / Seguradora
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Apólice
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Parcela
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Vencimento
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Valor
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Situação
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Pagamento
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500">
                      Corretor
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {itens.map(
                    (item) => (
                      <tr
                        key={
                          item.parcela.id
                        }
                        className="border-b border-zinc-100 transition last:border-b-0 hover:bg-zinc-50/80 dark:border-zinc-900 dark:hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-3">
                          <div className="max-w-[220px]">
                            <p className="truncate text-sm font-medium">
                              {item
                                .cliente
                                ?.nome ??
                                "Cliente não identificado"}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              {item
                                .cliente
                                ?.tipo ??
                                "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[210px]">
                            <p className="truncate text-sm">
                              {item.produto_nome ??
                                "Produto não identificado"}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              {item.seguradora_nome ??
                                "Seguradora não identificada"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                          {item.contrato
                            .numero_apolice ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">
                              {obterDescricaoParcela(
                                item,
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              {formatarFormaPagamento(
                                item
                                  .financeiro
                                  .forma_pagamento,
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          {formatarData(
                            item.parcela
                              .data_vencimento,
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold">
                          {formatarMoeda(
                            item.parcela
                              .valor,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${obterClasseSituacao(
                              item.parcela
                                .situacao,
                            )}`}
                          >
                            {formatarSituacao(
                              item.parcela
                                .situacao,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                          {item.parcela
                            .data_pagamento
                            ? formatarData(
                                item
                                  .parcela
                                  .data_pagamento,
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                          {item.corretor_nome ??
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            title="Ver financeiro do contrato"
                            onClick={() =>
                              abrirContrato(
                                item
                                  .contrato
                                  .id,
                              )
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                          >
                            <Eye
                              size={15}
                            />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading &&
            total > 0 && (
              <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Página {pagina}
                  {totalPaginas > 0
                    ? ` de ${totalPaginas}`
                    : ""}
                  {" • "}
                  {total} registros
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      pagina <= 1 ||
                      loading
                    }
                    onClick={() =>
                      setPagina(
                        (atual) =>
                          Math.max(
                            1,
                            atual - 1,
                          ),
                      )
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <ChevronLeft
                      size={14}
                    />
                    Anterior
                  </button>

                  <button
                    type="button"
                    disabled={
                      totalPaginas ===
                        0 ||
                      pagina >=
                        totalPaginas ||
                      loading
                    }
                    onClick={() =>
                      setPagina(
                        (atual) =>
                          atual + 1,
                      )
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Próxima
                    <ChevronRight
                      size={14}
                    />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}