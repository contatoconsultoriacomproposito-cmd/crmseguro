import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  baixarParcelasEmLote,
} from "../services/financeiroService";

import {
  formatarMoeda,
} from "../services/financeiroCalculos";

import type {
  ParcelaFinanceiraComSituacao,
} from "../types/financeiro";

interface ModalBaixaLoteProps {
  open: boolean;
  financeiroId: string;
  parcelas: ParcelaFinanceiraComSituacao[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function dataHoje(): string {
  const agora = new Date();

  const ano =
    agora.getFullYear();

  const mes =
    String(
      agora.getMonth() + 1,
    ).padStart(2, "0");

  const dia =
    String(
      agora.getDate(),
    ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarData(
  data: string,
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

export default function ModalBaixaLote({
  open,
  financeiroId,
  parcelas,
  onClose,
  onSaved,
}: ModalBaixaLoteProps) {
  const [
    dataPagamento,
    setDataPagamento,
  ] = useState(
    dataHoje(),
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const parcelasValidas =
    useMemo(
      () =>
        parcelas.filter(
          (parcela) =>
            parcela.status ===
            "PENDENTE",
        ),
      [parcelas],
    );

  const valorTotal =
    useMemo(
      () =>
        parcelasValidas.reduce(
          (
            total,
            parcela,
          ) =>
            total +
            Number(
              parcela.valor ||
                0,
            ),
          0,
        ),
      [parcelasValidas],
    );

  useEffect(() => {
    if (!open) {
      setSaving(false);
      return;
    }

    setDataPagamento(
      dataHoje(),
    );
  }, [open]);

  if (!open) {
    return null;
  }

  const confirmarBaixa =
    async () => {
      if (saving) return;

      if (!financeiroId) {
        toast.error(
          "Financeiro não informado.",
        );
        return;
      }

      if (
        parcelasValidas.length ===
        0
      ) {
        toast.error(
          "Selecione ao menos uma parcela pendente.",
        );
        return;
      }

      if (!dataPagamento) {
        toast.error(
          "Informe a data da baixa.",
        );
        return;
      }

      try {
        setSaving(true);

        await baixarParcelasEmLote({
          financeiro_id:
            financeiroId,
          parcela_ids:
            parcelasValidas.map(
              (parcela) =>
                parcela.id,
            ),
          data_pagamento:
            dataPagamento,
        });

        toast.success(
          parcelasValidas.length ===
            1
            ? "Parcela baixada com sucesso."
            : `${parcelasValidas.length} parcelas baixadas com sucesso.`,
        );

        await onSaved();

        onClose();
      } catch (error) {
        console.error(
          "Erro ao realizar baixa em lote:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível realizar a baixa em lote.",
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2
                size={18}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Baixar parcelas
              </h2>

              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Confirme a baixa das parcelas selecionadas.
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

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecionadas
              </p>

              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {
                  parcelasValidas.length
                }
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Valor total
              </p>

              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {formatarMoeda(
                  valorTotal,
                )}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              Parcelas selecionadas
            </div>

            <div className="max-h-52 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {parcelasValidas.map(
                (parcela) => (
                  <div
                    key={
                      parcela.id
                    }
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {parcela.tipo_lancamento ===
                        "AVULSO"
                          ? parcela.descricao ||
                            "Avulso"
                          : `Parcela ${
                              parcela.numero_parcela ??
                              "—"
                            }`}
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Vencimento{" "}
                        {formatarData(
                          parcela.data_vencimento,
                        )}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatarMoeda(
                        parcela.valor,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Data da baixa
            </span>

            <div className="relative mt-1.5">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="date"
                value={
                  dataPagamento
                }
                onChange={(
                  event,
                ) =>
                  setDataPagamento(
                    event.target
                      .value,
                  )
                }
                disabled={saving}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </label>

          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Todas as parcelas selecionadas receberão a mesma data de baixa. A operação será registrada no histórico financeiro.
          </p>
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
              void confirmarBaixa()
            }
            disabled={
              saving ||
              !dataPagamento ||
              parcelasValidas.length ===
                0
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Baixando...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={15}
                />
                Confirmar baixa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}