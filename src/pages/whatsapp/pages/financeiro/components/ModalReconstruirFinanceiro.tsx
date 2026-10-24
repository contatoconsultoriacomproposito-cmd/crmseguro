import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type {
  FinanceiroContratoDetalhado,
  FormaPagamentoFinanceiro,
  ParcelaFinanceiraGerada,
} from "../types/financeiro";

import {
  FORMAS_PAGAMENTO_FINANCEIRO,
} from "../types/financeiro";

import {
  formatarFormaPagamento,
  formatarMoeda,
  gerarParcelamento,
} from "../services/financeiroCalculos";

import {
  salvarFinanceiroContrato,
} from "../services/financeiroService";

interface ModalReconstruirFinanceiroProps {
  open: boolean;
  financeiro: FinanceiroContratoDetalhado;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function hoje(): string {
  const data = new Date();

  const ano =
    data.getFullYear();

  const mes =
    String(
      data.getMonth() + 1,
    ).padStart(2, "0");

  const dia =
    String(
      data.getDate(),
    ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function somarParcelas(
  parcelas: ParcelaFinanceiraGerada[],
): number {
  return (
    Math.round(
      parcelas.reduce(
        (
          total,
          parcela,
        ) =>
          total +
          Number(
            parcela.valor || 0,
          ),
        0,
      ) * 100,
    ) / 100
  );
}

function normalizarValorInput(
  valor: string,
): number {
  const texto =
    valor.trim();

  if (!texto) {
    return 0;
  }

  if (
    texto.includes(",")
  ) {
    return Number(
      texto
        .replace(/\./g, "")
        .replace(",", "."),
    );
  }

  return Number(texto);
}

function valorParaInput(
  valor: number,
): string {
  return Number(
    valor || 0,
  ).toFixed(2);
}

export default function ModalReconstruirFinanceiro({
  open,
  financeiro,
  onClose,
  onSaved,
}: ModalReconstruirFinanceiroProps) {
  const [
    formaPagamento,
    setFormaPagamento,
  ] =
    useState<FormaPagamentoFinanceiro>(
      financeiro.financeiro
        .forma_pagamento,
    );

  const [
    baixaAutomatica,
    setBaixaAutomatica,
  ] = useState(
    financeiro.financeiro
      .baixa_automatica,
  );

  const [
    quantidadeParcelas,
    setQuantidadeParcelas,
  ] = useState(
    financeiro.financeiro
      .quantidade_parcelas,
  );

  const [
    primeiroVencimento,
    setPrimeiroVencimento,
  ] = useState(
    hoje(),
  );

  const [
    parcelas,
    setParcelas,
  ] = useState<
    ParcelaFinanceiraGerada[]
  >([]);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const parcelasPlanoAtual =
    useMemo(
      () =>
        financeiro.parcelas
          .filter(
            (parcela) =>
              parcela.tipo_lancamento ===
              "PARCELA",
          )
          .sort(
            (a, b) =>
              Number(
                a.numero_parcela ||
                  0,
              ) -
              Number(
                b.numero_parcela ||
                  0,
              ),
          ),
      [financeiro.parcelas],
    );

  const avulsos =
    useMemo(
      () =>
        financeiro.parcelas.filter(
          (parcela) =>
            parcela.tipo_lancamento ===
            "AVULSO",
        ),
      [financeiro.parcelas],
    );

  const parcelasPagas =
    useMemo(
      () =>
        parcelasPlanoAtual.filter(
          (parcela) =>
            parcela.status ===
            "PAGA",
        ),
      [parcelasPlanoAtual],
    );

  const possuiParcelasPagas =
    parcelasPagas.length > 0;

  const valorContrato =
    Number(
      financeiro.financeiro
        .valor_total || 0,
    );

  const valorNovoPlano =
    useMemo(
      () =>
        somarParcelas(
          parcelas,
        ),
      [parcelas],
    );

  const diferenca =
    Math.round(
      (
        valorContrato -
        valorNovoPlano
      ) * 100,
    ) / 100;

  const planoFecha =
    Math.abs(
      diferenca,
    ) < 0.01;

  useEffect(() => {
    if (!open) {
      return;
    }

    const planoOrdenado =
      financeiro.parcelas
        .filter(
          (parcela) =>
            parcela.tipo_lancamento ===
            "PARCELA",
        )
        .sort(
          (a, b) =>
            Number(
              a.numero_parcela ||
                0,
            ) -
            Number(
              b.numero_parcela ||
                0,
            ),
        );

    setFormaPagamento(
      financeiro.financeiro
        .forma_pagamento,
    );

    setBaixaAutomatica(
      financeiro.financeiro
        .baixa_automatica,
    );

    setQuantidadeParcelas(
      planoOrdenado.length ||
        financeiro.financeiro
          .quantidade_parcelas,
    );

    setPrimeiroVencimento(
      planoOrdenado[0]
        ?.data_vencimento ||
        hoje(),
    );

    setParcelas(
      planoOrdenado.map(
        (
          parcela,
          index,
        ) => ({
          numero_parcela:
            index + 1,
          valor:
            Number(
              parcela.valor,
            ),
          data_vencimento:
            parcela.data_vencimento,
        }),
      ),
    );

    setSaving(false);
  }, [
    open,
    financeiro,
  ]);

  if (!open) {
    return null;
  }

  const gerarNovoPlano =
    () => {
      const quantidade =
        Number(
          quantidadeParcelas,
        );

      if (
        !Number.isInteger(
          quantidade,
        ) ||
        quantidade <= 0
      ) {
        toast.error(
          "Informe uma quantidade válida de parcelas.",
        );
        return;
      }

      if (
        !primeiroVencimento
      ) {
        toast.error(
          "Informe o primeiro vencimento.",
        );
        return;
      }

      try {
        const novasParcelas =
          gerarParcelamento({
            valor_total:
              valorContrato,
            quantidade_parcelas:
              quantidade,
            primeiro_vencimento:
              primeiroVencimento,
          });

        setParcelas(
          novasParcelas,
        );
      } catch (error) {
        console.error(
          "Erro ao gerar novo parcelamento:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o novo parcelamento.",
        );
      }
    };

  const alterarValor =
    (
      index: number,
      valor: string,
    ) => {
      const numero =
        normalizarValorInput(
          valor,
        );

      setParcelas(
        (atual) =>
          atual.map(
            (
              parcela,
              indice,
            ) =>
              indice === index
                ? {
                    ...parcela,
                    valor:
                      Number.isFinite(
                        numero,
                      )
                        ? numero
                        : 0,
                  }
                : parcela,
          ),
      );
    };

  const alterarVencimento =
    (
      index: number,
      dataVencimento: string,
    ) => {
      setParcelas(
        (atual) =>
          atual.map(
            (
              parcela,
              indice,
            ) =>
              indice === index
                ? {
                    ...parcela,
                    data_vencimento:
                      dataVencimento,
                  }
                : parcela,
          ),
      );
    };

  const adicionarParcela =
    () => {
      const ultima =
        parcelas[
          parcelas.length - 1
        ];

      setParcelas(
        (atual) => [
          ...atual,
          {
            numero_parcela:
              atual.length + 1,
            valor: 0,
            data_vencimento:
              ultima
                ?.data_vencimento ||
              primeiroVencimento ||
              hoje(),
          },
        ],
      );

      setQuantidadeParcelas(
        parcelas.length + 1,
      );
    };

  const removerParcela =
    (
      index: number,
    ) => {
      if (
        parcelas.length <= 1
      ) {
        toast.error(
          "O financeiro precisa possuir pelo menos uma parcela.",
        );
        return;
      }

      const novas =
        parcelas
          .filter(
            (
              _,
              indice,
            ) =>
              indice !== index,
          )
          .map(
            (
              parcela,
              indice,
            ) => ({
              ...parcela,
              numero_parcela:
                indice + 1,
            }),
          );

      setParcelas(
        novas,
      );

      setQuantidadeParcelas(
        novas.length,
      );
    };

  const confirmar =
    async () => {
      if (saving) {
        return;
      }

      if (
        possuiParcelasPagas
      ) {
        toast.error(
          "Existem parcelas pagas. Estorne as baixas antes de reconstruir o financeiro.",
        );
        return;
      }

      if (
        parcelas.length === 0
      ) {
        toast.error(
          "O novo plano precisa possuir pelo menos uma parcela.",
        );
        return;
      }

      const possuiValorInvalido =
        parcelas.some(
          (parcela) =>
            !Number.isFinite(
              Number(
                parcela.valor,
              ),
            ) ||
            Number(
              parcela.valor,
            ) <= 0,
        );

      if (
        possuiValorInvalido
      ) {
        toast.error(
          "Todas as parcelas precisam possuir valor maior que zero.",
        );
        return;
      }

      const possuiVencimentoInvalido =
        parcelas.some(
          (parcela) =>
            !parcela.data_vencimento,
        );

      if (
        possuiVencimentoInvalido
      ) {
        toast.error(
          "Todas as parcelas precisam possuir vencimento.",
        );
        return;
      }

      if (!planoFecha) {
        toast.error(
          `O novo parcelamento precisa totalizar ${formatarMoeda(
            valorContrato,
          )}.`,
        );
        return;
      }

      try {
        setSaving(true);

        await salvarFinanceiroContrato({
          contrato_id:
            financeiro.financeiro
              .contrato_id,
          forma_pagamento:
            formaPagamento,
          baixa_automatica:
            baixaAutomatica,
          parcelas:
            parcelas.map(
              (
                parcela,
                index,
              ) => ({
                numero_parcela:
                  index + 1,
                valor:
                  Math.round(
                    Number(
                      parcela.valor,
                    ) * 100,
                  ) / 100,
                data_vencimento:
                  parcela.data_vencimento,
              }),
            ),
        });

        toast.success(
          "Financeiro reconstruído com sucesso.",
        );

        await onSaved();

        onClose();
      } catch (error) {
        console.error(
          "Erro ao reconstruir financeiro:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível reconstruir o financeiro.",
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
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
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <RefreshCw
                size={18}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Reconstruir financeiro
              </h2>

              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Substitua o parcelamento atual por um novo plano financeiro.
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Esta ação substitui o parcelamento atual
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    O histórico da reconstrução será preservado. Lançamentos avulsos não serão excluídos.
                  </p>
                </div>
              </div>
            </div>

            {possuiParcelasPagas && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />

                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Reconstrução bloqueada
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-400">
                      Existem {parcelasPagas.length}{" "}
                      {parcelasPagas.length ===
                      1
                        ? "parcela paga"
                        : "parcelas pagas"}{" "}
                      neste plano. Estorne as baixas antes de reconstruir o financeiro.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Valor contratado
                </p>

                <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatarMoeda(
                    valorContrato,
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Plano atual
                </p>

                <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {
                    parcelasPlanoAtual.length
                  }{" "}
                  {parcelasPlanoAtual.length ===
                  1
                    ? "parcela"
                    : "parcelas"}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Avulsos preservados
                </p>

                <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {avulsos.length}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Novo plano
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Forma de pagamento
                  </span>

                  <select
                    value={
                      formaPagamento
                    }
                    onChange={(
                      event,
                    ) =>
                      setFormaPagamento(
                        event.target
                          .value as FormaPagamentoFinanceiro,
                      )
                    }
                    disabled={
                      saving ||
                      possuiParcelasPagas
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {FORMAS_PAGAMENTO_FINANCEIRO.map(
                      (forma) => (
                        <option
                          key={
                            forma.value
                          }
                          value={
                            forma.value
                          }
                        >
                          {formatarFormaPagamento(
                            forma.value,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="flex min-h-[66px] items-center justify-between gap-4 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <div>
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Baixa automática
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                      Marca o novo plano como pago automaticamente.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      baixaAutomatica
                    }
                    onChange={(
                      event,
                    ) =>
                      setBaixaAutomatica(
                        event.target
                          .checked,
                      )
                    }
                    disabled={
                      saving ||
                      possuiParcelasPagas
                    }
                    className="h-4 w-4 shrink-0 rounded border-zinc-300"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                <label>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Quantidade
                  </span>

                  <input
                    type="number"
                    min={1}
                    value={
                      quantidadeParcelas
                    }
                    onChange={(
                      event,
                    ) =>
                      setQuantidadeParcelas(
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value,
                          ) || 1,
                        ),
                      )
                    }
                    disabled={
                      saving ||
                      possuiParcelasPagas
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Primeiro vencimento
                  </span>

                  <div className="relative mt-1.5">
                    <CalendarDays
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />

                    <input
                      type="date"
                      value={
                        primeiroVencimento
                      }
                      onChange={(
                        event,
                      ) =>
                        setPrimeiroVencimento(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        saving ||
                        possuiParcelasPagas
                      }
                      className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={
                      gerarNovoPlano
                    }
                    disabled={
                      saving ||
                      possuiParcelasPagas
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      size={14}
                    />
                    Gerar plano
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Parcelas do novo plano
                  </h3>

                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Valores e vencimentos podem ser ajustados antes da confirmação.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    adicionarParcela
                  }
                  disabled={
                    saving ||
                    possuiParcelasPagas
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {parcelas.map(
                  (
                    parcela,
                    index,
                  ) => (
                    <div
                      key={
                        `${parcela.numero_parcela}-${index}`
                      }
                      className="grid gap-3 px-4 py-3 sm:grid-cols-[70px_minmax(0,1fr)_170px_36px] sm:items-end"
                    >
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                          Parcela
                        </span>

                        <div className="mt-1 flex h-10 items-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {index + 1}/
                          {
                            parcelas.length
                          }
                        </div>
                      </div>

                      <label>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                          Valor
                        </span>

                        <input
                          type="text"
                          inputMode="decimal"
                          value={valorParaInput(
                            parcela.valor,
                          )}
                          onChange={(
                            event,
                          ) =>
                            alterarValor(
                              index,
                              event.target
                                .value,
                            )
                          }
                          disabled={
                            saving ||
                            possuiParcelasPagas
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </label>

                      <label>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                          Vencimento
                        </span>

                        <input
                          type="date"
                          value={
                            parcela.data_vencimento
                          }
                          onChange={(
                            event,
                          ) =>
                            alterarVencimento(
                              index,
                              event.target
                                .value,
                            )
                          }
                          disabled={
                            saving ||
                            possuiParcelasPagas
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </label>

                      <button
                        type="button"
                        title="Remover parcela"
                        onClick={() =>
                          removerParcela(
                            index,
                          )
                        }
                        disabled={
                          saving ||
                          possuiParcelasPagas ||
                          parcelas.length <=
                            1
                        }
                        className="flex h-10 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/30"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div
              className={`rounded-lg border p-4 ${
                planoFecha
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                  : "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20"
              }`}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Contrato
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatarMoeda(
                      valorContrato,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Novo plano
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatarMoeda(
                      valorNovoPlano,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Diferença
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      planoFecha
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {formatarMoeda(
                      diferenca,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
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
              possuiParcelasPagas ||
              parcelas.length ===
                0 ||
              !planoFecha
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Reconstruindo...
              </>
            ) : (
              <>
                <RefreshCw
                  size={15}
                />
                Confirmar reconstrução
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}