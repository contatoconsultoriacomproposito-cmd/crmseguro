import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  PencilLine,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  editarParcelasFinanceiro,
} from "../services/financeiroService";

import type {
  ParcelaFinanceiraComSituacao,
  ParcelaFinanceiraEditavel,
} from "../types/financeiro";

interface ModalEditarParcelamentoProps {
  open: boolean;
  financeiroId: string;
  parcelas: ParcelaFinanceiraComSituacao[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

interface ParcelaEdicao {
  id: string;
  numero_parcela: number | null;
  valor: string;
  data_vencimento: string;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

function numeroParaInput(valor: number): string {
  return Number(valor || 0)
    .toFixed(2)
    .replace(".", ",");
}

function inputParaNumero(valor: string): number {
  const limpo = valor
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(limpo);
}

function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export default function ModalEditarParcelamento({
  open,
  financeiroId,
  parcelas,
  onClose,
  onSaved,
}: ModalEditarParcelamentoProps) {
  const [parcelasEdicao, setParcelasEdicao] =
    useState<ParcelaEdicao[]>([]);

  const [saving, setSaving] =
    useState(false);

  const parcelasPendentes =
    useMemo(
      () =>
        parcelas
          .filter(
            (parcela) =>
              parcela.tipo_lancamento === "PARCELA" &&
              parcela.status === "PENDENTE",
          )
          .sort(
            (a, b) =>
              (a.numero_parcela ?? 0) -
              (b.numero_parcela ?? 0),
          ),
      [parcelas],
    );

  const parcelasNaoEditaveis =
    useMemo(
      () =>
        parcelas.filter(
          (parcela) =>
            parcela.tipo_lancamento === "PARCELA" &&
            parcela.status !== "PENDENTE",
        ),
      [parcelas],
    );

  const valorParcelasNaoEditaveis =
    useMemo(
      () =>
        arredondarMoeda(
          parcelasNaoEditaveis.reduce(
            (total, parcela) =>
              total + Number(parcela.valor || 0),
            0,
          ),
        ),
      [parcelasNaoEditaveis],
    );

  const valorTotalPlano =
    useMemo(
      () =>
        arredondarMoeda(
          parcelas
            .filter(
              (parcela) =>
                parcela.tipo_lancamento === "PARCELA",
            )
            .reduce(
              (total, parcela) =>
                total + Number(parcela.valor || 0),
              0,
            ),
        ),
      [parcelas],
    );

  const valorEditado =
    useMemo(
      () =>
        arredondarMoeda(
          parcelasEdicao.reduce(
            (total, parcela) => {
              const valor =
                inputParaNumero(parcela.valor);

              return (
                total +
                (Number.isFinite(valor)
                  ? valor
                  : 0)
              );
            },
            0,
          ),
        ),
      [parcelasEdicao],
    );

  const valorFinal =
    arredondarMoeda(
      valorParcelasNaoEditaveis +
        valorEditado,
    );

  const diferenca =
    arredondarMoeda(
      valorTotalPlano -
        valorFinal,
    );

  const totalValido =
    Math.abs(diferenca) < 0.01;

  useEffect(() => {
    if (!open) {
      setParcelasEdicao([]);
      setSaving(false);
      return;
    }

    setParcelasEdicao(
      parcelasPendentes.map(
        (parcela) => ({
          id: parcela.id,
          numero_parcela:
            parcela.numero_parcela,
          valor:
            numeroParaInput(
              parcela.valor,
            ),
          data_vencimento:
            parcela.data_vencimento,
        }),
      ),
    );
  }, [
    open,
    parcelasPendentes,
  ]);

  if (!open) {
    return null;
  }

  const alterarValor = (
    id: string,
    valor: string,
  ) => {
    const tratado =
      valor.replace(
        /[^\d.,]/g,
        "",
      );

    setParcelasEdicao(
      (atual) =>
        atual.map(
          (parcela) =>
            parcela.id === id
              ? {
                  ...parcela,
                  valor: tratado,
                }
              : parcela,
        ),
    );
  };

  const alterarVencimento = (
    id: string,
    dataVencimento: string,
  ) => {
    setParcelasEdicao(
      (atual) =>
        atual.map(
          (parcela) =>
            parcela.id === id
              ? {
                  ...parcela,
                  data_vencimento:
                    dataVencimento,
                }
              : parcela,
        ),
    );
  };

  const confirmarEdicao =
    async () => {
      if (saving) return;

      if (!financeiroId) {
        toast.error(
          "Financeiro não informado.",
        );
        return;
      }

      if (
        parcelasEdicao.length === 0
      ) {
        toast.error(
          "Não existem parcelas pendentes para edição.",
        );
        return;
      }

      const payload:
        ParcelaFinanceiraEditavel[] =
        [];

      for (const parcela of parcelasEdicao) {
        const valor =
          inputParaNumero(
            parcela.valor,
          );

        if (
          !Number.isFinite(valor) ||
          valor <= 0
        ) {
          toast.error(
            `Informe um valor válido para a parcela ${
              parcela.numero_parcela ??
              ""
            }.`,
          );
          return;
        }

        if (
          !parcela.data_vencimento
        ) {
          toast.error(
            `Informe o vencimento da parcela ${
              parcela.numero_parcela ??
              ""
            }.`,
          );
          return;
        }

        payload.push({
          id: parcela.id,
          valor:
            arredondarMoeda(
              valor,
            ),
          data_vencimento:
            parcela.data_vencimento,
        });
      }

      if (!totalValido) {
        toast.error(
          "A soma das parcelas precisa permanecer igual ao valor total do plano.",
        );
        return;
      }

      try {
        setSaving(true);

        await editarParcelasFinanceiro({
          financeiro_id:
            financeiroId,
          parcelas:
            payload,
        });

        toast.success(
          "Parcelamento atualizado com sucesso.",
        );

        await onSaved();

        onClose();
      } catch (error) {
        console.error(
          "Erro ao editar parcelamento:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o parcelamento.",
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <PencilLine
                size={18}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Editar parcelamento
              </h2>

              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Altere valores e vencimentos das parcelas pendentes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {parcelasPendentes.length ===
          0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              Não existem parcelas pendentes disponíveis para edição.
            </div>
          ) : (
            <div className="space-y-4">
              {parcelasNaoEditaveis.length >
                0 && (
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <p className="text-xs leading-5">
                    Parcelas pagas ou canceladas não podem ser alteradas diretamente. O valor delas permanece fixo no plano.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {parcelasEdicao.map(
                  (
                    parcela,
                    index,
                  ) => (
                    <div
                      key={
                        parcela.id
                      }
                      className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)] sm:items-end"
                    >
                      <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Parcela
                        </span>

                        <div className="mt-1 flex h-10 items-center font-semibold text-zinc-800 dark:text-zinc-200">
                          {parcela.numero_parcela ??
                            index +
                              1}
                        </div>
                      </div>

                      <label>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Valor
                        </span>

                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                            R$
                          </span>

                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              parcela.valor
                            }
                            onChange={(
                              event,
                            ) =>
                              alterarValor(
                                parcela.id,
                                event
                                  .target
                                  .value,
                              )
                            }
                            disabled={
                              saving
                            }
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                      </label>

                      <label>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Vencimento
                        </span>

                        <div className="relative mt-1">
                          <CalendarDays
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                          />

                          <input
                            type="date"
                            value={
                              parcela.data_vencimento
                            }
                            onChange={(
                              event,
                            ) =>
                              alterarVencimento(
                                parcela.id,
                                event
                                  .target
                                  .value,
                              )
                            }
                            disabled={
                              saving
                            }
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                      </label>
                    </div>
                  ),
                )}
              </div>

              <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Total do plano
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatarMoeda(
                      valorTotalPlano,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Total após edição
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      totalValido
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatarMoeda(
                      valorFinal,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Diferença
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      totalValido
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatarMoeda(
                      diferenca,
                    )}
                  </p>
                </div>
              </div>

              {!totalValido && (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <p className="text-xs leading-5">
                    Redistribua a diferença entre as parcelas pendentes. O valor total do plano não pode ser alterado por esta operação.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void confirmarEdicao()
            }
            disabled={
              saving ||
              parcelasEdicao.length ===
                0 ||
              !totalValido
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Salvando...
              </>
            ) : (
              <>
                <PencilLine
                  size={15}
                />
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}