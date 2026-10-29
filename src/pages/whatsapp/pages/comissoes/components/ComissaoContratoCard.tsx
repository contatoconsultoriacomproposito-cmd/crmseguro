import {
  HandCoins,
  Loader2,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import type {
  ComissaoContratoDetalhada,
  ItemMinhaComissaoCorretor,
} from "../types/comissoes";

import {
  formatarMoedaComissao,
} from "../services/comissoesCalculos";

interface ComissaoContratoCardProps {
  loading?: boolean;

  comissao: ComissaoContratoDetalhada | null;

  minhaComissao?: ItemMinhaComissaoCorretor | null;

  podeOperar: boolean;

  onConfigurarComissao: () => void;
  onVerComissao: () => void;
}

export default function ComissaoContratoCard({
  loading = false,
  comissao,
  minhaComissao = null,
  podeOperar,
  onConfigurarComissao,
  onVerComissao,
}: ComissaoContratoCardProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
          <Loader2
            size={17}
            className="animate-spin"
          />

          Carregando comissão...
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * VISÃO PESSOAL DO CORRETOR
   * =========================================================
   *
   * O corretor não acessa crm_comissoes.
   * Sua visão parte exclusivamente do próprio split,
   * deduções e pagamentos.
   */
  if (minhaComissao) {
    const {
      split,
      resumo_pagamentos,
    } = minhaComissao;

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <HandCoins size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Comissão
            </p>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Sua comissão está configurada para este contrato.
            </p>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <HandCoins size={15} />

                <span className="text-sm">
                  Comissão bruta
                </span>
              </div>

              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatarMoedaComissao(
                  split.valor_bruto_split
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Deduções
              </span>

              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {formatarMoedaComissao(
                  split.valor_deducoes
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Comissão líquida
              </span>

              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatarMoedaComissao(
                  split.valor_liquido_split
                )}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2">
                <WalletCards
                  size={14}
                  className="text-blue-500"
                />

                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Seus pagamentos
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    A receber
                  </span>

                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {formatarMoedaComissao(
                      resumo_pagamentos.valor_a_pagar
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Pago
                  </span>

                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatarMoedaComissao(
                      resumo_pagamentos.valor_pago
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * SEM COMISSÃO
   * =========================================================
   */
  if (!comissao) {
    return (
      <div className="overflow-hidden rounded-xl border border-amber-300 bg-white dark:border-amber-900/60 dark:bg-slate-900">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <HandCoins size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Comissão
              </p>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Nenhuma comissão configurada para este contrato.
              </p>
            </div>
          </div>

          {podeOperar && (
            <button
              type="button"
              onClick={onConfigurarComissao}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              <HandCoins size={14} />
              Configurar comissão
            </button>
          )}
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * VISÃO COMPLETA DA CORRETORA
   * =========================================================
   */
  const {
    comissao: dadosComissao,
    resumo_recebimentos,
    resumo_pagamentos,
    resumo_splits,
  } = comissao;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <HandCoins size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Comissão
            </p>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comissão configurada para este contrato.
            </p>
          </div>
        </div>

        {podeOperar && (
          <button
            type="button"
            onClick={onConfigurarComissao}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <HandCoins size={14} />
            Editar
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <HandCoins size={15} />

              <span className="text-sm">
                Comissão bruta
              </span>
            </div>

            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatarMoedaComissao(
                dadosComissao.valor_comissao_bruta
              )}
            </span>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-2">
              <ReceiptText
                size={14}
                className="text-blue-500"
              />

              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Recebimentos
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                A receber
              </span>

              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {formatarMoedaComissao(
                  resumo_recebimentos.valor_a_receber
                )}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-2">
              <WalletCards
                size={14}
                className="text-slate-500"
              />

              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Distribuição
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  A pagar
                </span>

                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatarMoedaComissao(
                    resumo_pagamentos.valor_a_pagar
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Residual corretora
                </span>

                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatarMoedaComissao(
                    resumo_splits.valor_residual_corretora
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onVerComissao}
        className="flex w-full items-center justify-between border-t border-slate-200 px-4 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:border-slate-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
      >
        <span>
          Ver comissão completa
        </span>

        <ReceiptText size={15} />
      </button>
    </div>
  );
}