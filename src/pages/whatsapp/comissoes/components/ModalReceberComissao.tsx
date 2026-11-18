import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  ReceiptText,
  X,
} from "lucide-react";
import type {
  ComissaoRecebimentoComSituacao,
  ReceberComissaoPayload,
} from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface ModalReceberComissaoProps {
  aberto: boolean;
  recebimento: ComissaoRecebimentoComSituacao | null;
  salvando?: boolean;
  onFechar: () => void;
  onConfirmar: (
    payload: ReceberComissaoPayload
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

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400";

export function ModalReceberComissao({
  aberto,
  recebimento,
  salvando = false,
  onFechar,
  onConfirmar,
}: ModalReceberComissaoProps) {
  const [dataRecebimento, setDataRecebimento] =
    useState(hojeISO());

  const [valorRecebido, setValorRecebido] =
    useState<number>(0);

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    if (!aberto || !recebimento) return;

    setDataRecebimento(hojeISO());
    setValorRecebido(
      recebimento.valor_previsto
    );
    setErro(null);
  }, [
    aberto,
    recebimento,
  ]);

  async function handleConfirmar() {
    if (!recebimento) return;

    if (!dataRecebimento) {
      setErro(
        "Informe a data do recebimento."
      );
      return;
    }

    if (
      valorRecebido <= 0
    ) {
      setErro(
        "O valor recebido deve ser maior que zero."
      );
      return;
    }

    if (
      Math.abs(
        valorRecebido -
          recebimento.valor_previsto
      ) > 0.009
    ) {
      setErro(
        `Não é permitida baixa parcial. O valor deve ser ${formatarMoedaComissao(
          recebimento.valor_previsto
        )}.`
      );
      return;
    }

    setErro(null);

    const payload: ReceberComissaoPayload = {
      recebimento_id:
        recebimento.id,
      data_recebimento:
        dataRecebimento,
      valor_recebido:
        valorRecebido,
    };

    try {
      await onConfirmar(payload);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o recebimento."
      );
    }
  }

  if (
    !aberto ||
    !recebimento
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ReceiptText size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Registrar recebimento
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Seguradora → Corretora
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
                  Provisão
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {recebimento.descricao ||
                    `Provisão ${recebimento.numero_provisao}`}
                </p>
              </div>

              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                {recebimento.situacao}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  Data prevista
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {recebimento.data_prevista}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Valor previsto
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatarMoedaComissao(
                    recebimento.valor_previsto
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
            <label className={labelClass}>
              Data do recebimento
            </label>

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={dataRecebimento}
                disabled={salvando}
                onChange={(event) =>
                  setDataRecebimento(
                    event.target.value
                  )
                }
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Valor recebido
            </label>

            <input
              type="number"
              min={0}
              step="0.01"
              value={valorRecebido}
              disabled={salvando}
              onChange={(event) =>
                setValorRecebido(
                  Number(
                    event.target.value
                  ) || 0
                )
              }
              className={inputClass}
            />

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nesta versão, o recebimento deve ser integral.
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
            disabled={salvando}
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
              <CheckCircle2
                size={15}
              />
            )}

            Confirmar recebimento
          </button>
        </div>
      </div>
    </div>
  );
}