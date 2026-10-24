import { useEffect, useState } from "react";
import {
  CheckCircle2,
  HandCoins,
  Loader2,
  WalletCards,
  X,
} from "lucide-react";
import type {
  ComissaoPagamentoComSituacao,
  ComissaoSplit,
  PagarComissaoSplitPayload,
} from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface ModalPagarComissaoSplitProps {
  aberto: boolean;
  pagamento: ComissaoPagamentoComSituacao | null;
  split: ComissaoSplit | null;
  salvando?: boolean;
  onFechar: () => void;
  onConfirmar: (
    payload: PagarComissaoSplitPayload
  ) => Promise<void> | void;
}

function hojeISO(): string {
  const agora = new Date();

  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
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

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400";

export function ModalPagarComissaoSplit({
  aberto,
  pagamento,
  split,
  salvando = false,
  onFechar,
  onConfirmar,
}: ModalPagarComissaoSplitProps) {
  const [dataPagamento, setDataPagamento] =
    useState(hojeISO());

  const [valorPago, setValorPago] =
    useState<number>(0);

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    if (!aberto || !pagamento) return;

    setDataPagamento(hojeISO());
    setValorPago(
      pagamento.valor_previsto
    );
    setErro(null);
  }, [
    aberto,
    pagamento,
  ]);

  async function handleConfirmar() {
    if (!pagamento) return;

    if (
      split?.tipo_participante === "CORRETORA" ||
      split?.residual_corretora
    ) {
      setErro(
        "O residual da corretora não gera pagamento para a própria corretora."
      );
      return;
    }

    if (!dataPagamento) {
      setErro(
        "Informe a data do pagamento."
      );
      return;
    }

    if (valorPago <= 0) {
      setErro(
        "O valor pago deve ser maior que zero."
      );
      return;
    }

    if (
      Math.abs(
        valorPago -
          pagamento.valor_previsto
      ) > 0.009
    ) {
      setErro(
        `Não é permitido pagamento parcial. O valor deve ser ${formatarMoedaComissao(
          pagamento.valor_previsto
        )}.`
      );
      return;
    }

    setErro(null);

    const payload: PagarComissaoSplitPayload = {
      pagamento_id:
        pagamento.id,
      data_pagamento:
        dataPagamento,
      valor_pago:
        valorPago,
    };

    try {
      await onConfirmar(payload);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o pagamento."
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <HandCoins size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Registrar pagamento
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Corretora → Participante
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

              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                {pagamento.situacao}
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
                  Data prevista
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {pagamento.data_prevista}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-slate-500">
                  Valor previsto
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatarMoedaComissao(
                    pagamento.valor_previsto
                  )}
                </p>
              </div>
            </div>
          </div>

          {split && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  Split bruto
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatarMoedaComissao(
                    split.valor_bruto_split
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  Deduções
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatarMoedaComissao(
                    split.valor_deducoes
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  Split líquido
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatarMoedaComissao(
                    split.valor_liquido_split
                  )}
                </p>
              </div>
            </div>
          )}

          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {erro}
            </div>
          )}

          <div>
            <label className={labelClass}>
              Data do pagamento
            </label>

            <input
              type="date"
              value={dataPagamento}
              disabled={salvando}
              onChange={(event) =>
                setDataPagamento(
                  event.target.value
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Valor pago
            </label>

            <input
              type="number"
              min={0}
              step="0.01"
              value={valorPago}
              disabled={salvando}
              onChange={(event) =>
                setValorPago(
                  Number(
                    event.target.value
                  ) || 0
                )
              }
              className={inputClass}
            />

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nesta versão, o pagamento deve ser integral.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <WalletCards
              size={17}
              className="mt-0.5 shrink-0 text-slate-500"
            />

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Este pagamento é independente do recebimento da seguradora. A provisão do participante pode ser paga conforme o calendário configurado no split.
            </p>
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
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <CheckCircle2 size={15} />
            )}

            Confirmar pagamento
          </button>
        </div>
      </div>
    </div>
  );
}