import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  ComissaoPagamentoComSituacao,
  ComissaoSplit,
  EstornarPagamentoComissaoPayload,
} from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface ModalEstornarPagamentoProps {
  aberto: boolean;
  pagamento: ComissaoPagamentoComSituacao | null;
  split: ComissaoSplit | null;
  salvando?: boolean;
  onFechar: () => void;
  onConfirmar: (
    payload: EstornarPagamentoComissaoPayload
  ) => Promise<void> | void;
}

function obterNomeParticipante(
  split: ComissaoSplit | null
): string {
  if (!split) {
    return "Participante";
  }

  if (
    split.tipo_participante === "CORRETORA" ||
    split.residual_corretora
  ) {
    return "Corretora";
  }

  if (split.participante_nome?.trim()) {
    return split.participante_nome.trim();
  }

  if (split.usuario_id) {
    return "Participante interno";
  }

  return "Participante";
}

export function ModalEstornarPagamento({
  aberto,
  pagamento,
  split,
  salvando = false,
  onFechar,
  onConfirmar,
}: ModalEstornarPagamentoProps) {
  const [justificativa, setJustificativa] =
    useState("");

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;

    setJustificativa("");
    setErro(null);
  }, [
    aberto,
    pagamento?.id,
  ]);

  async function handleConfirmar() {
    if (!pagamento) return;

    const justificativaFinal =
      justificativa.trim();

    if (!justificativaFinal) {
      setErro(
        "Informe a justificativa do estorno."
      );
      return;
    }

    if (
      split?.tipo_participante === "CORRETORA" ||
      split?.residual_corretora
    ) {
      setErro(
        "O residual da corretora não possui pagamento operacional para estorno."
      );
      return;
    }

    setErro(null);

    const payload: EstornarPagamentoComissaoPayload = {
      pagamento_id: pagamento.id,
      justificativa: justificativaFinal,
    };

    try {
      await onConfirmar(payload);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível estornar o pagamento."
      );
    }
  }

  if (
    !aberto ||
    !pagamento
  ) {
    return null;
  }

  const nomeParticipante =
    obterNomeParticipante(split);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <RotateCcw size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Estornar pagamento
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                PAGA → PENDENTE
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={salvando}
            onClick={onFechar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Participante
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {nomeParticipante}
                </p>

                {split && (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {split.tipo_participante}
                  </p>
                )}
              </div>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                {pagamento.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  Provisão
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {pagamento.descricao ||
                    `Pagamento ${pagamento.numero_provisao}`}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Data do pagamento
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {pagamento.data_pagamento ??
                    "—"}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-slate-500">
                  Valor pago
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatarMoedaComissao(
                    pagamento.valor_pago ??
                      pagamento.valor_previsto
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="text-sm font-medium">
                O pagamento voltará para pendente.
              </p>

              <p className="mt-1 text-xs leading-5">
                A data e o valor pagos serão removidos do estado atual, mas o histórico do estorno continuará registrado para auditoria.
              </p>
            </div>
          </div>

          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Justificativa do estorno
            </label>

            <textarea
              rows={4}
              value={justificativa}
              disabled={salvando}
              onChange={(event) =>
                setJustificativa(
                  event.target.value
                )
              }
              placeholder="Informe o motivo do estorno..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
            />

            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Campo obrigatório para auditoria.
              </p>

              <span className="text-xs text-slate-400">
                {justificativa.trim().length} caracteres
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            disabled={salvando}
            onClick={onFechar}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={
              salvando ||
              split?.tipo_participante === "CORRETORA" ||
              split?.residual_corretora
            }
            onClick={() => {
              void handleConfirmar();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <RotateCcw size={15} />
            )}

            Confirmar estorno
          </button>
        </div>
      </div>
    </div>
  );
}