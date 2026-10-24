import {
  Check,
  CheckCircle2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  formatarMoeda,
} from "../services/financeiroCalculos";

import type {
  ParcelaFinanceiraComSituacao,
  SituacaoParcelaFinanceira,
} from "../types/financeiro";

interface TabelaParcelasFinanceirasProps {
  parcelas: ParcelaFinanceiraComSituacao[];
  podeOperar: boolean;
  loading?: boolean;
  parcelasSelecionadas?: string[];
  onSelecionadasChange?: (
    ids: string[],
  ) => void;
  onBaixar: (
    parcela: ParcelaFinanceiraComSituacao,
  ) => void;
  onEditar: (
    parcela: ParcelaFinanceiraComSituacao,
  ) => void;
  onEstornar: (
    parcela: ParcelaFinanceiraComSituacao,
  ) => void;
}

function formatarData(
  data: string | null | undefined,
): string {
  if (!data) return "—";

  const [
    ano,
    mes,
    dia,
  ] = data.split("-");

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function rotuloSituacao(
  situacao: SituacaoParcelaFinanceira,
): string {
  switch (situacao) {
    case "A_VENCER":
      return "A vencer";
    case "VENCE_HOJE":
      return "Vence hoje";
    case "ATRASADA":
      return "Atrasada";
    case "PAGA":
      return "Paga";
    case "CANCELADA":
      return "Cancelada";
    default:
      return situacao;
  }
}

function classeSituacao(
  situacao: SituacaoParcelaFinanceira,
): string {
  switch (situacao) {
    case "PAGA":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "ATRASADA":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "VENCE_HOJE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    case "CANCELADA":
      return "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    case "A_VENCER":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }
}

export default function TabelaParcelasFinanceiras({
  parcelas,
  podeOperar,
  loading = false,
  parcelasSelecionadas = [],
  onSelecionadasChange,
  onBaixar,
  onEditar,
  onEstornar,
}: TabelaParcelasFinanceirasProps) {
  const checkboxTodosRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const idsElegiveis =
    useMemo(
      () =>
        parcelas
          .filter(
            (parcela) =>
              parcela.status ===
              "PENDENTE",
          )
          .map(
            (parcela) =>
              parcela.id,
          ),
      [parcelas],
    );

  const idsSelecionadosValidos =
    useMemo(
      () =>
        parcelasSelecionadas.filter(
          (id) =>
            idsElegiveis.includes(
              id,
            ),
        ),
      [
        parcelasSelecionadas,
        idsElegiveis,
      ],
    );

  const todasSelecionadas =
    idsElegiveis.length > 0 &&
    idsSelecionadosValidos.length ===
      idsElegiveis.length;

  const parcialmenteSelecionadas =
    idsSelecionadosValidos.length >
      0 &&
    !todasSelecionadas;

  useEffect(() => {
    if (
      checkboxTodosRef.current
    ) {
      checkboxTodosRef.current.indeterminate =
        parcialmenteSelecionadas;
    }
  }, [
    parcialmenteSelecionadas,
  ]);

  const alternarTodas = () => {
    if (
      !podeOperar ||
      loading ||
      !onSelecionadasChange
    ) {
      return;
    }

    if (todasSelecionadas) {
      onSelecionadasChange(
        [],
      );
      return;
    }

    onSelecionadasChange(
      idsElegiveis,
    );
  };

  const alternarParcela = (
    parcelaId: string,
  ) => {
    if (
      !podeOperar ||
      loading ||
      !onSelecionadasChange
    ) {
      return;
    }

    const selecionada =
      idsSelecionadosValidos.includes(
        parcelaId,
      );

    if (selecionada) {
      onSelecionadasChange(
        idsSelecionadosValidos.filter(
          (id) =>
            id !==
            parcelaId,
        ),
      );
      return;
    }

    onSelecionadasChange([
      ...idsSelecionadosValidos,
      parcelaId,
    ]);
  };

  if (
    parcelas.length === 0
  ) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Nenhuma parcela encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <th className="w-12 px-3 py-3 text-center">
                <input
                  ref={
                    checkboxTodosRef
                  }
                  type="checkbox"
                  checked={
                    todasSelecionadas
                  }
                  disabled={
                    !podeOperar ||
                    loading ||
                    idsElegiveis.length ===
                      0
                  }
                  onChange={
                    alternarTodas
                  }
                  title={
                    todasSelecionadas
                      ? "Desmarcar todas"
                      : "Selecionar todas as parcelas pendentes"
                  }
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                />
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Parcela
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Vencimento
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Valor
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Situação
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Pagamento
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {parcelas.map(
              (parcela) => {
                const elegivel =
                  parcela.status ===
                  "PENDENTE";

                const selecionada =
                  idsSelecionadosValidos.includes(
                    parcela.id,
                  );

                return (
                  <tr
                    key={
                      parcela.id
                    }
                    className={`transition ${
                      selecionada
                        ? "bg-blue-50/70 dark:bg-blue-950/20"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                    }`}
                  >
                    <td className="px-3 py-3 text-center">
                      {elegivel ? (
                        <input
                          type="checkbox"
                          checked={
                            selecionada
                          }
                          disabled={
                            !podeOperar ||
                            loading
                          }
                          onChange={() =>
                            alternarParcela(
                              parcela.id,
                            )
                          }
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                        />
                      ) : (
                        <span className="inline-flex h-4 w-4 items-center justify-center text-slate-300 dark:text-slate-700">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {parcela.tipo_lancamento ===
                        "AVULSO"
                          ? "Avulso"
                          : parcela.numero_parcela ??
                            "—"}
                      </div>

                      {parcela.tipo_lancamento ===
                        "AVULSO" &&
                        parcela.descricao && (
                          <div className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400">
                            {
                              parcela.descricao
                            }
                          </div>
                        )}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {formatarData(
                        parcela.data_vencimento,
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatarMoeda(
                        parcela.valor,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${classeSituacao(
                          parcela.situacao,
                        )}`}
                      >
                        {rotuloSituacao(
                          parcela.situacao,
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {parcela.status ===
                      "PAGA" ? (
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {formatarData(
                              parcela.data_pagamento,
                            )}
                          </p>

                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                            Data da baixa
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {parcela.status ===
                          "PENDENTE" && (
                          <>
                            <button
                              type="button"
                              title="Baixar parcela"
                              disabled={
                                !podeOperar ||
                                loading
                              }
                              onClick={() =>
                                onBaixar(
                                  parcela,
                                )
                              }
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                            >
                              <Check
                                size={
                                  13
                                }
                              />
                              Baixar
                            </button>

                            {parcela.tipo_lancamento ===
                              "PARCELA" && (
                              <button
                                type="button"
                                title="Editar parcela"
                                disabled={
                                  !podeOperar ||
                                  loading
                                }
                                onClick={() =>
                                  onEditar(
                                    parcela,
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              >
                                <Pencil
                                  size={
                                    13
                                  }
                                />
                              </button>
                            )}
                          </>
                        )}

                        {parcela.status ===
                          "PAGA" && (
                          <button
                            type="button"
                            title="Estornar baixa"
                            disabled={
                              !podeOperar ||
                              loading
                            }
                            onClick={() =>
                              onEstornar(
                                parcela,
                              )
                            }
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                          >
                            <RotateCcw
                              size={13}
                            />
                            Estornar
                          </button>
                        )}

                        {parcela.status ===
                          "CANCELADA" && (
                          <span className="text-xs text-slate-400">
                            Sem ações
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      {idsSelecionadosValidos.length >
        0 && (
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-blue-50/60 px-4 py-3 dark:border-slate-800 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <CheckCircle2
              size={16}
            />

            <span>
              <strong>
                {
                  idsSelecionadosValidos.length
                }
              </strong>{" "}
              {idsSelecionadosValidos.length ===
              1
                ? "parcela selecionada"
                : "parcelas selecionadas"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}