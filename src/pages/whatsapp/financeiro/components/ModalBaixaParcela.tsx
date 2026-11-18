import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type {
  ParcelaFinanceiraComSituacao,
} from "../types/financeiro";

import {
  formatarMoeda,
} from "../services/financeiroCalculos";

import {
  baixarParcela,
} from "../services/financeiroService";

interface ModalBaixaParcelaProps {
  open: boolean;
  financeiroId: string;
  parcela: ParcelaFinanceiraComSituacao | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function obterHojeISO(): string {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(
    agora.getMonth() + 1,
  ).padStart(2, "0");
  const dia = String(
    agora.getDate(),
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarData(
  data: string | null,
): string {
  if (!data) {
    return "—";
  }

  const [ano, mes, dia] =
    data.slice(0, 10).split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

export default function ModalBaixaParcela({
  open,
  financeiroId,
  parcela,
  onClose,
  onSaved,
}: ModalBaixaParcelaProps) {
  const [
    dataPagamento,
    setDataPagamento,
  ] = useState(obterHojeISO());

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDataPagamento(
      obterHojeISO(),
    );

    setSalvando(false);
  }, [
    open,
    parcela?.id,
  ]);

  async function confirmarBaixa() {
    if (
      salvando ||
      !parcela
    ) {
      return;
    }

    if (!financeiroId) {
      toast.error(
        "Financeiro não informado.",
      );
      return;
    }

    if (
      parcela.status !==
      "PENDENTE"
    ) {
      toast.error(
        "Somente parcelas pendentes podem receber baixa.",
      );
      return;
    }

    if (!dataPagamento) {
      toast.error(
        "Informe a data do pagamento.",
      );
      return;
    }

    try {
      setSalvando(true);

      await baixarParcela({
        financeiro_id:
          financeiroId,
        parcela_id:
          parcela.id,
        data_pagamento:
          dataPagamento,
      });

      toast.success(
        "Baixa realizada com sucesso.",
      );

      await onSaved();

      onClose();
    } catch (error) {
      console.error(
        "Erro ao realizar baixa da parcela:",
        error,
      );

      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a baixa.";

      toast.error(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (
    !open ||
    !parcela
  ) {
    return null;
  }

  const identificacao =
    parcela.tipo_lancamento ===
    "AVULSO"
      ? parcela.descricao?.trim() ||
        "Lançamento avulso"
      : `Parcela ${
          parcela.numero_parcela ??
          "—"
        }`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CalendarCheck
                size={19}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Dar baixa
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Confirme o recebimento da parcela selecionada.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
              <div className="col-span-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Lançamento
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {identificacao}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Valor
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatarMoeda(
                    parcela.valor,
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Vencimento
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatarData(
                    parcela.data_vencimento,
                  )}
                </p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Data do pagamento
            </span>

            <input
              type="date"
              value={
                dataPagamento
              }
              onChange={(event) =>
                setDataPagamento(
                  event.target.value,
                )
              }
              disabled={salvando}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />

            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              A data de hoje é sugerida automaticamente, mas pode ser alterada.
            </p>
          </label>

          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <CheckCircle2
              size={17}
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />

            <p className="text-xs leading-5 text-emerald-800 dark:text-emerald-300">
              Após a confirmação, este lançamento passará de{" "}
              <strong>Pendente</strong>{" "}
              para{" "}
              <strong>Pago</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void confirmarBaixa()
            }
            disabled={
              salvando ||
              !dataPagamento
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={16}
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