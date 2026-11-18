import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type {
  FormaPagamentoFinanceiro,
  ParcelaFinanceiraGerada,
} from "../types/financeiro";

import {
  FORMAS_PAGAMENTO_FINANCEIRO,
} from "../types/financeiro";

import {
  calcularDiferencaParcelamento,
  calcularTotalParcelas,
  formatarMoeda,
  gerarParcelamento,
  parcelamentoFechaComContrato,
  validarParcelamento,
} from "../services/financeiroCalculos";

import {
  salvarFinanceiroContrato,
} from "../services/financeiroService";

interface ModalLancamentoFinanceiroProps {
  open: boolean;
  contratoId: string;
  valorContrato: number;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function obterPrimeiroVencimentoPadrao(): string {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const dia = hoje.getDate();

  const proximoMes = new Date(
    ano,
    mes + 1,
    1,
  );

  const ultimoDiaProximoMes =
    new Date(
      proximoMes.getFullYear(),
      proximoMes.getMonth() + 1,
      0,
    ).getDate();

  const diaFinal = Math.min(
    dia,
    ultimoDiaProximoMes,
  );

  const data = new Date(
    proximoMes.getFullYear(),
    proximoMes.getMonth(),
    diaFinal,
  );

  const anoFinal =
    data.getFullYear();

  const mesFinal = String(
    data.getMonth() + 1,
  ).padStart(2, "0");

  const diaFormatado = String(
    data.getDate(),
  ).padStart(2, "0");

  return `${anoFinal}-${mesFinal}-${diaFormatado}`;
}

export default function ModalLancamentoFinanceiro({
  open,
  contratoId,
  valorContrato,
  onClose,
  onSaved,
}: ModalLancamentoFinanceiroProps) {
  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState<FormaPagamentoFinanceiro>(
    "CARTAO_CREDITO",
  );

  const [
    quantidadeParcelas,
    setQuantidadeParcelas,
  ] = useState(1);

  const [
    primeiroVencimento,
    setPrimeiroVencimento,
  ] = useState(
    obterPrimeiroVencimentoPadrao(),
  );

  const [
    baixaAutomatica,
    setBaixaAutomatica,
  ] = useState(false);

  const [
    parcelas,
    setParcelas,
  ] = useState<
    ParcelaFinanceiraGerada[]
  >([]);

  const [
    gerado,
    setGerado,
  ] = useState(false);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormaPagamento(
      "CARTAO_CREDITO",
    );

    setQuantidadeParcelas(1);

    setPrimeiroVencimento(
      obterPrimeiroVencimentoPadrao(),
    );

    setBaixaAutomatica(false);

    setParcelas([]);

    setGerado(false);
    setSalvando(false);
  }, [open, contratoId]);

  const totalParcelas =
    useMemo(
      () =>
        calcularTotalParcelas(
          parcelas,
        ),
      [parcelas],
    );

  const diferenca =
    useMemo(
      () =>
        calcularDiferencaParcelamento(
          parcelas,
          valorContrato,
        ),
      [
        parcelas,
        valorContrato,
      ],
    );

  const parcelamentoValido =
    useMemo(
      () =>
        parcelas.length > 0 &&
        parcelamentoFechaComContrato(
          parcelas,
          valorContrato,
        ),
      [
        parcelas,
        valorContrato,
      ],
    );

  function gerarParcelas() {
    try {
      const novasParcelas =
        gerarParcelamento({
          valor_total:
            valorContrato,
          quantidade_parcelas:
            quantidadeParcelas,
          primeiro_vencimento:
            primeiroVencimento,
        });

      setParcelas(
        novasParcelas,
      );

      setGerado(true);
    } catch (error) {
      console.error(
        "Erro ao gerar parcelamento:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o parcelamento.",
      );
    }
  }

  function atualizarValorParcela(
    indice: number,
    valor: string,
  ) {
    const valorNumerico =
      Number(
        valor.replace(",", "."),
      );

    setParcelas(
      (parcelasAtuais) =>
        parcelasAtuais.map(
          (
            parcela,
            index,
          ) =>
            index === indice
              ? {
                  ...parcela,
                  valor:
                    Number.isFinite(
                      valorNumerico,
                    )
                      ? valorNumerico
                      : 0,
                }
              : parcela,
        ),
    );
  }

  function atualizarVencimentoParcela(
    indice: number,
    dataVencimento: string,
  ) {
    setParcelas(
      (parcelasAtuais) =>
        parcelasAtuais.map(
          (
            parcela,
            index,
          ) =>
            index === indice
              ? {
                  ...parcela,
                  data_vencimento:
                    dataVencimento,
                }
              : parcela,
        ),
    );
  }

  async function salvar() {
    if (salvando) {
      return;
    }

    if (!contratoId) {
      toast.error(
        "Contrato não informado.",
      );
      return;
    }

    if (
      !Number.isFinite(
        valorContrato,
      ) ||
      valorContrato <= 0
    ) {
      toast.error(
        "O contrato não possui valor válido.",
      );
      return;
    }

    if (
      parcelas.length === 0
    ) {
      toast.error(
        "Gere o parcelamento antes de salvar.",
      );
      return;
    }

    const erros =
      validarParcelamento(
        parcelas,
        valorContrato,
      );

    if (erros.length > 0) {
      toast.error(erros[0]);
      return;
    }

    try {
      setSalvando(true);

      const resultado =
        await salvarFinanceiroContrato({
          contrato_id:
            contratoId,
          forma_pagamento:
            formaPagamento,
          baixa_automatica:
            baixaAutomatica,
          parcelas,
        });

      toast.success(
        resultado.reconstrucao
          ? "Financeiro reconstruído com sucesso."
          : "Financeiro lançado com sucesso.",
      );

      await onSaved();

      onClose();
    } catch (error) {
      console.error(
        "Erro ao salvar financeiro:",
        error,
      );

      const mensagem =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message ===
          "string"
          ? error.message
          : "Não foi possível salvar o financeiro.";

      toast.error(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Lançar financeiro
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Defina a condição de pagamento do contrato e revise as parcelas antes de confirmar.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Valor do contrato
                </div>

                <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {formatarMoeda(
                    valorContrato,
                  )}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Forma de pagamento
                </span>

                <select
                  value={
                    formaPagamento
                  }
                  onChange={(event) => {
                    setFormaPagamento(
                      event.target
                        .value as FormaPagamentoFinanceiro,
                    );
                    setGerado(false);
                  }}
                  disabled={salvando}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                        {
                          forma.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Quantidade de parcelas
                </span>

                <input
                  type="number"
                  min={1}
                  step={1}
                  value={
                    quantidadeParcelas
                  }
                  onChange={(event) => {
                    const valor =
                      Number(
                        event.target
                          .value,
                      );

                    setQuantidadeParcelas(
                      Number.isFinite(
                        valor,
                      )
                        ? Math.max(
                            1,
                            Math.trunc(
                              valor,
                            ),
                          )
                        : 1,
                    );

                    setGerado(false);
                  }}
                  disabled={salvando}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Primeiro vencimento
                </span>

                <input
                  type="date"
                  value={
                    primeiroVencimento
                  }
                  onChange={(event) => {
                    setPrimeiroVencimento(
                      event.target
                        .value,
                    );
                    setGerado(false);
                  }}
                  disabled={salvando}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    baixaAutomatica
                  }
                  onChange={(event) =>
                    setBaixaAutomatica(
                      event.target
                        .checked,
                    )
                  }
                  disabled={salvando}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Baixa automática
                  </div>

                  <div className="mt-0.5 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
                    Todas as parcelas serão consideradas pagas no momento do lançamento, utilizando a própria data de vencimento como data de pagamento.
                  </div>
                </div>
              </label>

              <button
                type="button"
                onClick={
                  gerarParcelas
                }
                disabled={
                  salvando ||
                  quantidadeParcelas <=
                    0 ||
                  !primeiroVencimento
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                />

                {gerado
                  ? "Regerar parcelas"
                  : "Gerar parcelas"}
              </button>
            </div>

            {parcelas.length >
              0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <CreditCard
                    size={17}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Parcelamento
                  </div>

                  <span className="ml-auto text-xs text-slate-500">
                    {
                      parcelas.length
                    }{" "}
                    parcela
                    {parcelas.length ===
                    1
                      ? ""
                      : "s"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Parcela
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Valor
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Vencimento
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Situação inicial
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {parcelas.map(
                        (
                          parcela,
                          indice,
                        ) => (
                          <tr
                            key={
                              parcela.numero_parcela
                            }
                            className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {
                                  parcela.numero_parcela
                                }
                                /
                                {
                                  parcelas.length
                                }
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="relative max-w-[180px]">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                  R$
                                </span>

                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={
                                    parcela.valor
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    atualizarValorParcela(
                                      indice,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="relative max-w-[190px]">
                                <CalendarDays
                                  size={
                                    15
                                  }
                                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                  type="date"
                                  value={
                                    parcela.data_vencimento
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    atualizarVencimentoParcela(
                                      indice,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {baixaAutomatica ? (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  Paga
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parcelas.length >
              0 && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Valor do contrato
                  </div>

                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {formatarMoeda(
                      valorContrato,
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total das parcelas
                  </div>

                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {formatarMoeda(
                      totalParcelas,
                    )}
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    parcelamentoValido
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                      : "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20"
                  }`}
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Diferença
                  </div>

                  <div
                    className={`mt-1 text-lg font-semibold ${
                      parcelamentoValido
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {formatarMoeda(
                      diferenca,
                    )}
                  </div>
                </div>
              </div>
            )}

            {parcelas.length >
              0 &&
              parcelamentoValido && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />

                  <div>
                    <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Parcelamento válido
                    </div>

                    <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                      O total das parcelas corresponde exatamente ao valor contratado.
                    </div>
                  </div>
                </div>
              )}
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
              void salvar()
            }
            disabled={
              salvando ||
              !parcelamentoValido
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                Confirmar lançamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}