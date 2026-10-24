import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  FilePlus2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  criarLancamentoAvulso,
} from "../services/financeiroService";

interface ModalLancamentoAvulsoProps {
  open: boolean;
  financeiroId: string;
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

function inputParaNumero(
  valor: string,
): number {
  const normalizado =
    valor
      .trim()
      .replace(/\./g, "")
      .replace(",", ".");

  return Number(
    normalizado,
  );
}

function formatarMoeda(
  valor: number,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    Number(valor) || 0,
  );
}

export default function ModalLancamentoAvulso({
  open,
  financeiroId,
  onClose,
  onSaved,
}: ModalLancamentoAvulsoProps) {
  const [
    descricao,
    setDescricao,
  ] = useState("");

  const [
    valor,
    setValor,
  ] = useState("");

  const [
    dataVencimento,
    setDataVencimento,
  ] = useState(
    dataHoje(),
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const valorNumerico =
    useMemo(
      () => {
        const numero =
          inputParaNumero(
            valor,
          );

        return Number.isFinite(
          numero,
        )
          ? numero
          : 0;
      },
      [valor],
    );

  useEffect(() => {
    if (!open) {
      setDescricao("");
      setValor("");
      setDataVencimento(
        dataHoje(),
      );
      setSaving(false);
      return;
    }

    setDescricao("");
    setValor("");
    setDataVencimento(
      dataHoje(),
    );
  }, [open]);

  if (!open) {
    return null;
  }

  const confirmar =
    async () => {
      if (saving) {
        return;
      }

      const descricaoFinal =
        descricao.trim();

      if (!financeiroId) {
        toast.error(
          "Financeiro não informado.",
        );
        return;
      }

      if (!descricaoFinal) {
        toast.error(
          "Informe a descrição do lançamento.",
        );
        return;
      }

      if (
        descricaoFinal.length <
        3
      ) {
        toast.error(
          "Informe uma descrição mais detalhada.",
        );
        return;
      }

      if (
        !Number.isFinite(
          valorNumerico,
        ) ||
        valorNumerico <= 0
      ) {
        toast.error(
          "Informe um valor válido maior que zero.",
        );
        return;
      }

      if (!dataVencimento) {
        toast.error(
          "Informe a data de vencimento.",
        );
        return;
      }

      try {
        setSaving(true);

        await criarLancamentoAvulso({
          financeiro_id:
            financeiroId,
          descricao:
            descricaoFinal,
          valor:
            Math.round(
              valorNumerico *
                100,
            ) / 100,
          data_vencimento:
            dataVencimento,
        });

        toast.success(
          "Lançamento avulso criado com sucesso.",
        );

        await onSaved();

        onClose();
      } catch (error) {
        console.error(
          "Erro ao criar lançamento avulso:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível criar o lançamento avulso.",
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
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <FilePlus2
                size={18}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Novo lançamento avulso
              </h2>

              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Registre um valor adicional vinculado a este contrato.
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
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descrição
            </span>

            <input
              type="text"
              value={
                descricao
              }
              onChange={(
                event,
              ) =>
                setDescricao(
                  event.target
                    .value,
                )
              }
              maxLength={200}
              disabled={saving}
              placeholder="Ex.: Valor residual após cancelamento"
              className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />

            <div className="mt-1 text-right text-[10px] text-zinc-400">
              {
                descricao.length
              }
              /200
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Valor
              </span>

              <div className="relative mt-1.5">
                <CircleDollarSign
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    valor
                  }
                  onChange={(
                    event,
                  ) =>
                    setValor(
                      event.target.value.replace(
                        /[^\d.,]/g,
                        "",
                      ),
                    )
                  }
                  disabled={
                    saving
                  }
                  placeholder="0,00"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Vencimento
              </span>

              <div className="relative mt-1.5">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="date"
                  value={
                    dataVencimento
                  }
                  onChange={(
                    event,
                  ) =>
                    setDataVencimento(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    saving
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </label>
          </div>

          {valorNumerico >
            0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
              <p className="text-xs text-violet-600 dark:text-violet-400">
                Valor do lançamento
              </p>

              <p className="mt-1 text-xl font-semibold text-violet-800 dark:text-violet-300">
                {formatarMoeda(
                  valorNumerico,
                )}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              O lançamento avulso não altera o valor do parcelamento original. Ele será registrado separadamente e poderá receber baixa e estorno normalmente.
            </p>
          </div>
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
              void confirmar()
            }
            disabled={
              saving ||
              !descricao.trim() ||
              valorNumerico <=
                0 ||
              !dataVencimento
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                <FilePlus2
                  size={15}
                />
                Criar lançamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}