import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import type {
  FinanceiroContratoDetalhado,
} from "../types/financeiro";

import {
  formatarFormaPagamento,
  formatarMoeda,
} from "../services/financeiroCalculos";



interface FinanceiroContratoCardProps {
  loading?: boolean;
  financeiro: FinanceiroContratoDetalhado | null;
  podeOperar: boolean;
  onLancarFinanceiro: () => void;
  onVerFinanceiro?: () => void;
}

export default function FinanceiroContratoCard({
  loading = false,
  financeiro,
  podeOperar,
  onLancarFinanceiro,
  onVerFinanceiro,
}: FinanceiroContratoCardProps) {
  if (loading) {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Loader2 size={17} className="animate-spin" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Financeiro
            </p>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Carregando...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!financeiro) {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <ReceiptText size={17} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Financeiro
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Financeiro ainda não lançado para este contrato.
            </p>

            {podeOperar && (
              <button
                type="button"
                onClick={onLancarFinanceiro}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={15} />
                Lançar financeiro
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const {
    financeiro: cabecalho,
    resumo,
  } = financeiro;

  const temAtraso =
    resumo.valor_atrasado > 0;

  const temVencimentoHoje =
    resumo.valor_vence_hoje > 0;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <CircleDollarSign size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Financeiro
            </p>

            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Lançado
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {formatarFormaPagamento(
              cabecalho.forma_pagamento,
            )}
            {" • "}
            {cabecalho.quantidade_parcelas}{" "}
            {cabecalho.quantidade_parcelas === 1
              ? "parcela"
              : "parcelas"}
          </p>

          {cabecalho.baixa_automatica && (
            <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Baixa automática
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <WalletCards size={14} className="shrink-0" />
              <span>Total</span>
            </div>

            <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
              {formatarMoeda(
                resumo.valor_total,
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Pago</span>
            </div>

            <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {formatarMoeda(
                resumo.valor_pago,
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <CircleDollarSign size={14} className="shrink-0" />
              <span>Pendente</span>
            </div>

            <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatarMoeda(
                resumo.valor_pendente,
              )}
            </span>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <CalendarClock size={14} className="shrink-0" />
              <span>A vencer</span>
            </div>

            <span className="shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {formatarMoeda(
                resumo.valor_a_vencer,
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div
              className={`flex min-w-0 items-center gap-2 text-xs ${
                temVencimentoHoje
                  ? "font-medium text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <Clock3 size={14} className="shrink-0" />
              <span>Vence hoje</span>
            </div>

            <span
              className={`shrink-0 text-xs font-semibold ${
                temVencimentoHoje
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {formatarMoeda(
                resumo.valor_vence_hoje,
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div
              className={`flex min-w-0 items-center gap-2 text-xs ${
                temAtraso
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span>Atrasado</span>
            </div>

            <span
              className={`shrink-0 text-xs font-semibold ${
                temAtraso
                  ? "text-red-700 dark:text-red-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {formatarMoeda(
                resumo.valor_atrasado,
              )}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Parcelas pendentes
            </span>

            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {resumo.quantidade_pendentes}
            </span>
          </div>

          {(resumo.quantidade_canceladas > 0 ||
            resumo.valor_avulso > 0) && (
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              {resumo.quantidade_canceladas > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Canceladas
                  </span>

                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {resumo.quantidade_canceladas}
                  </span>
                </div>
              )}

              {resumo.valor_avulso > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lançamentos avulsos
                  </span>

                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatarMoeda(
                      resumo.valor_avulso,
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {onVerFinanceiro && (
        <button
          type="button"
          onClick={onVerFinanceiro}
          className="flex w-full items-center justify-between border-t border-slate-200 px-4 py-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50/70 dark:border-slate-800 dark:text-blue-400 dark:hover:bg-blue-950/20"
        >
          <span>Ver financeiro completo</span>
          <ChevronRight size={15} />
        </button>
      )}
    </section>
  );
}