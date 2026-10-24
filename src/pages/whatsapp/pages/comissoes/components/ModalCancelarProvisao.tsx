import { useEffect, useState } from "react";
import {
  Ban,
  Loader2,
  X,
} from "lucide-react";
import type {
  CancelarProvisaoComissaoPayload,
  ComissaoPagamentoComSituacao,
  ComissaoRecebimentoComSituacao,
} from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface ModalCancelarProvisaoProps {
  aberto: boolean;
  recebimento?: ComissaoRecebimentoComSituacao | null;
  pagamento?: ComissaoPagamentoComSituacao | null;
  salvando?: boolean;
  onFechar: () => void;
  onConfirmar: (
    payload: CancelarProvisaoComissaoPayload
  ) => Promise<void> | void;
}

export function ModalCancelarProvisao({
  aberto,
  recebimento = null,
  pagamento = null,
  salvando = false,
  onFechar,
  onConfirmar,
}: ModalCancelarProvisaoProps) {
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
        "Informe a justificativa do cancelamento."
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
        "Informe exatamente uma provisão para cancelamento."
      );
      return;
    }

    if (
      recebimento &&
      recebimento.status !== "PENDENTE"
    ) {
      setErro(
        "Somente recebimentos pendentes podem ser cancelados."
      );
      return;
    }

    if (
      pagamento &&
      pagamento.status !== "PENDENTE"
    ) {
      setErro(
        "Somente pagamentos pendentes podem ser cancelados."
      );
      return;
    }

    const payload: CancelarProvisaoComissaoPayload =
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
          : "Não foi possível cancelar a provisão."
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

  const dataPrevista =
    recebimento?.data_prevista ??
    pagamento?.data_prevista ??
    "—";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <Ban size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Cancelar provisão
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                PENDENTE → CANCELADA
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
                ? "Recebimento"
                : "Pagamento"}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {titulo}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  Data prevista
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {dataPrevista}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Valor previsto
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatarMoedaComissao(
                    valor
                  )}
                </p>
              </div>
            </div>
          </div>

          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Justificativa do cancelamento
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
              placeholder="Informe o motivo do cancelamento..."
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
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Ban size={15} />
            )}

            Cancelar provisão
          </button>
        </div>
      </div>
    </div>
  );
}