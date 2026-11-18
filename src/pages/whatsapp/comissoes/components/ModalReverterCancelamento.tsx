import { useEffect, useState } from "react";
import {
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  ComissaoPagamentoComSituacao,
  ComissaoRecebimentoComSituacao,
  ReverterCancelamentoProvisaoComissaoPayload,
} from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface ModalReverterCancelamentoProps {
  aberto: boolean;
  recebimento?: ComissaoRecebimentoComSituacao | null;
  pagamento?: ComissaoPagamentoComSituacao | null;
  salvando?: boolean;
  onFechar: () => void;
  onConfirmar: (
    payload: ReverterCancelamentoProvisaoComissaoPayload
  ) => Promise<void> | void;
}

export function ModalReverterCancelamento({
  aberto,
  recebimento = null,
  pagamento = null,
  salvando = false,
  onFechar,
  onConfirmar,
}: ModalReverterCancelamentoProps) {
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
    recebimento?.id,
    pagamento?.id,
  ]);

  async function handleConfirmar() {
    const justificativaFinal =
      justificativa.trim();

    if (!justificativaFinal) {
      setErro(
        "Informe a justificativa da reversão."
      );
      return;
    }

    const possuiRecebimento =
      Boolean(recebimento);

    const possuiPagamento =
      Boolean(pagamento);

    if (
      Number(possuiRecebimento) +
        Number(possuiPagamento) !==
      1
    ) {
      setErro(
        "Informe exatamente uma provisão cancelada."
      );
      return;
    }

    if (
      recebimento &&
      recebimento.status !== "CANCELADA"
    ) {
      setErro(
        "Somente recebimentos cancelados podem ser revertidos."
      );
      return;
    }

    if (
      pagamento &&
      pagamento.status !== "CANCELADA"
    ) {
      setErro(
        "Somente pagamentos cancelados podem ser revertidos."
      );
      return;
    }

    const payload: ReverterCancelamentoProvisaoComissaoPayload =
      {
        recebimento_id:
          recebimento?.id ?? null,
        pagamento_id:
          pagamento?.id ?? null,
        justificativa:
          justificativaFinal,
      };

    try {
      await onConfirmar(payload);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível reverter o cancelamento."
      );
    }
  }

  if (!aberto) return null;

  const item =
    recebimento ?? pagamento;

  if (!item) return null;

  const titulo =
    recebimento
      ? recebimento.descricao ||
        `Provisão ${recebimento.numero_provisao}`
      : pagamento?.descricao ||
        `Pagamento ${pagamento?.numero_provisao}`;

  const valor =
    recebimento?.valor_previsto ??
    pagamento?.valor_previsto ??
    0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <RotateCcw size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Reverter cancelamento
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                CANCELADA → PENDENTE
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
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {recebimento
                ? "Recebimento cancelado"
                : "Pagamento cancelado"}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {titulo}
            </p>

            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatarMoedaComissao(
                valor
              )}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="text-sm font-medium">
              A provisão voltará ao estado pendente.
            </p>

            <p className="mt-1 text-xs leading-5">
              A reversão não registra recebimento nem pagamento. Ela apenas reabre a provisão para operação futura.
            </p>
          </div>

          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Justificativa da reversão
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
              placeholder="Informe o motivo da reversão..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            disabled={salvando}
            onClick={onFechar}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Voltar
          </button>

          <button
            type="button"
            disabled={salvando}
            onClick={() => {
              void handleConfirmar();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <RotateCcw size={15} />
            )}

            Reverter cancelamento
          </button>
        </div>
      </div>
    </div>
  );
}