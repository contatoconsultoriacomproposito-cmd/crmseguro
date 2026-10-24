import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  estornarBaixaParcela,
} from "../services/financeiroService";

import type {
  ParcelaFinanceiraComSituacao,
} from "../types/financeiro";

interface ModalEstornoBaixaProps {
  open: boolean;
  financeiroId: string;
  parcela: ParcelaFinanceiraComSituacao | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

function formatarData(
  data: string | null | undefined,
): string {
  if (!data) return "—";

  const [ano, mes, dia] =
    data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

export default function ModalEstornoBaixa({
  open,
  financeiroId,
  parcela,
  onClose,
  onSaved,
}: ModalEstornoBaixaProps) {
  const [
    justificativa,
    setJustificativa,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!open) {
      setJustificativa("");
      setSaving(false);
      return;
    }

    setJustificativa("");
  }, [open, parcela?.id]);

  if (!open || !parcela) {
    return null;
  }

  const podeEstornar =
    parcela.status === "PAGA";

  const confirmarEstorno =
    async () => {
      if (saving) return;

      if (!podeEstornar) {
        toast.error(
          "Somente parcelas pagas podem ter a baixa estornada.",
        );
        return;
      }

      const motivo =
        justificativa.trim();

      if (!motivo) {
        toast.error(
          "Informe a justificativa do estorno.",
        );
        return;
      }

      try {
        setSaving(true);

        await estornarBaixaParcela({
          financeiro_id:
            financeiroId,
          parcela_id:
            parcela.id,
          justificativa:
            motivo,
        });

        toast.success(
          "Baixa estornada com sucesso.",
        );

        await onSaved();

        onClose();
      } catch (error) {
        console.error(
          "Erro ao estornar baixa:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível estornar a baixa.",
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
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <RotateCcw size={18} />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Estornar baixa
              </h2>

              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                A parcela voltará para
                pendente.
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

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Parcela
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {parcela.numero_parcela !=
                  null
                    ? `Parcela ${parcela.numero_parcela}`
                    : parcela.descricao ||
                      "Lançamento"}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Valor
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatarMoeda(
                    parcela.valor,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Vencimento
                </p>

                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {formatarData(
                    parcela.data_vencimento,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Data da baixa
                </p>

                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {formatarData(
                    parcela.data_pagamento,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-xs leading-5">
              O estorno não apaga o
              histórico da baixa. Uma nova
              movimentação de estorno será
              registrada e a parcela voltará
              para pendente.
            </p>
          </div>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Justificativa
              </span>

              <span className="text-xs text-red-500">
                Obrigatória
              </span>
            </div>

            <textarea
              value={justificativa}
              onChange={(event) =>
                setJustificativa(
                  event.target.value,
                )
              }
              disabled={saving}
              rows={4}
              maxLength={500}
              autoFocus
              placeholder="Informe o motivo do estorno da baixa..."
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />

            <div className="mt-1 text-right text-xs text-zinc-400">
              {justificativa.length}/500
            </div>
          </label>
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
              void confirmarEstorno()
            }
            disabled={
              saving ||
              !justificativa.trim() ||
              !podeEstornar
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Estornando...
              </>
            ) : (
              <>
                <RotateCcw
                  size={15}
                />
                Confirmar estorno
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}