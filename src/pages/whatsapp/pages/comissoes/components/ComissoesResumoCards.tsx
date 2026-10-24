import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import type { ResumoComissoesGeral } from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface ComissoesResumoCardsProps {
  resumo: ResumoComissoesGeral;
  loading?: boolean;
}

interface CardResumo {
  titulo: string;
  valor: number;
  descricao: string;
  icone: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}

export function ComissoesResumoCards({
  resumo,
  loading = false,
}: ComissoesResumoCardsProps) {
  const cards: CardResumo[] = [
    {
      titulo: "Comissão bruta",
      valor: resumo.valor_comissao_bruta,
      descricao: `${resumo.quantidade_comissoes} comissão(ões)`,
      icone: ReceiptText,
    },
    {
      titulo: "A receber",
      valor: resumo.valor_a_receber,
      descricao: "Seguradora → Corretora",
      icone: Landmark,
    },
    {
      titulo: "Recebe hoje",
      valor: resumo.valor_recebe_hoje,
      descricao: "Previsto para hoje",
      icone: CalendarClock,
    },
    {
      titulo: "Recebimentos atrasados",
      valor: resumo.valor_atrasado_recebimento,
      descricao: "Pendências da seguradora",
      icone: AlertTriangle,
    },
    {
      titulo: "Recebido",
      valor: resumo.valor_recebido,
      descricao: "Já recebido pela corretora",
      icone: CheckCircle2,
    },
    {
      titulo: "A pagar",
      valor: resumo.valor_a_pagar,
      descricao: "Corretora → Participantes",
      icone: HandCoins,
    },
    {
      titulo: "Pagamentos atrasados",
      valor: resumo.valor_atrasado_pagamento,
      descricao: "Comissões pendentes",
      icone: WalletCards,
    },
    {
      titulo: "Pago",
      valor: resumo.valor_pago,
      descricao: "Já pago aos participantes",
      icone: CheckCircle2,
    },
    {
      titulo: "Residual corretora",
      valor: resumo.valor_residual_corretora,
      descricao: "Parcela pertencente à corretora",
      icone: Building2,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => {
        const Icone = card.icone;

        return (
          <div
            key={card.titulo}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {card.titulo}
                </p>

                <div className="mt-2 min-h-[34px]">
                  {loading ? (
                    <div className="h-7 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                  ) : (
                    <p className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {formatarMoedaComissao(
                        card.valor
                      )}
                    </p>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {card.descricao}
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Icone size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}