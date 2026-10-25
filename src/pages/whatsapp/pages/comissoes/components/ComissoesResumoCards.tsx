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
  participanteNome?: string | null;
}

interface CardResumo {
  titulo: string;
  valor: number;
  descricao: string;
  icone: React.ComponentType<{ size?: number; className?: string }>;
  destaque?: boolean;
}

function Card({ card, loading }: { card: CardResumo; loading: boolean }) {
  const Icone = card.icone;
  return (
    <div className={`min-w-0 rounded-xl border p-4 shadow-sm ${
      card.destaque
        ? "border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/20"
        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {card.titulo}
          </p>
          <div className="mt-2 min-h-[34px]">
            {loading ? (
              <div className="h-7 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            ) : (
              <p className="whitespace-nowrap text-xl font-semibold text-slate-900 dark:text-slate-100" title={formatarMoedaComissao(card.valor)}>
                {formatarMoedaComissao(card.valor)}
              </p>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {card.descricao}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Icone size={18} />
        </div>
      </div>
    </div>
  );
}

function Grupo({ titulo, cards, loading, colunas }: { titulo: string; cards: CardResumo[]; loading: boolean; colunas: string }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {titulo}
      </p>
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${colunas}`}>
        {cards.map((card) => <Card key={card.titulo} card={card} loading={loading} />)}
      </div>
    </section>
  );
}

export function ComissoesResumoCards({
  resumo,
  loading = false,
  participanteNome = null,
}: ComissoesResumoCardsProps) {
  const escopoPagamento = participanteNome
    ? `Para ${participanteNome}`
    : "Todos os participantes";

  const gerencial: CardResumo[] = [
    { titulo: "Comissão bruta", valor: resumo.valor_comissao_bruta, descricao: `${resumo.quantidade_comissoes} comissão(ões)`, icone: ReceiptText },
    { titulo: "Total a receber", valor: resumo.valor_total_a_receber, descricao: "Ainda devido pelas seguradoras", icone: Landmark, destaque: true },
    { titulo: "Total a pagar", valor: resumo.valor_total_a_pagar, descricao: escopoPagamento, icone: HandCoins, destaque: true },
    { titulo: "Residual corretora", valor: resumo.valor_residual_corretora, descricao: "Parcela pertencente à corretora", icone: Building2 },
  ];

  const recebimentos: CardResumo[] = [
    { titulo: "Recebido", valor: resumo.valor_recebido, descricao: "Já recebido das seguradoras", icone: CheckCircle2 },
    { titulo: "Recebe hoje", valor: resumo.valor_recebe_hoje, descricao: "Previsto para hoje", icone: CalendarClock },
    { titulo: "Atrasado", valor: resumo.valor_atrasado_recebimento, descricao: "Pendências vencidas da seguradora", icone: AlertTriangle },
  ];

  const repasses: CardResumo[] = [
    { titulo: "Pago", valor: resumo.valor_pago, descricao: participanteNome ? `Já pago a ${participanteNome}` : "Já pago aos participantes", icone: CheckCircle2 },
    { titulo: "Vence hoje", valor: resumo.valor_vence_hoje_pagamento, descricao: escopoPagamento, icone: WalletCards },
    { titulo: "Atrasado", valor: resumo.valor_atrasado_pagamento, descricao: participanteNome ? `Em atraso para ${participanteNome}` : "Repasses vencidos", icone: AlertTriangle },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Grupo titulo="Visão gerencial" cards={gerencial} loading={loading} colunas="xl:grid-cols-4" />
      <Grupo titulo="Recebimentos da seguradora" cards={recebimentos} loading={loading} colunas="xl:grid-cols-3" />
      <Grupo titulo="Repasses a participantes" cards={repasses} loading={loading} colunas="xl:grid-cols-3" />
    </div>
  );
}
