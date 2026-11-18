import type { ResumoComissoesGeral, ResumoMinhasComissoesCorretor } from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface Props {
  resumo: ResumoComissoesGeral;
  loading?: boolean;
  participanteNome?: string | null;
  apenasCorretor?: boolean;
  resumoCorretor?: ResumoMinhasComissoesCorretor;
}
export function ComissoesResumoCards({ resumo, loading = false, apenasCorretor = false, resumoCorretor }: Props) {
  const cards = apenasCorretor
    ? [
      { label: "Minha comissão", valor: resumoCorretor?.valor_liquido ?? 0 },
      { label: "A receber", valor: (resumoCorretor?.valor_a_receber ?? 0) + (resumoCorretor?.valor_vence_hoje ?? 0) + (resumoCorretor?.valor_atrasado ?? 0) },
      { label: "Total recebido", valor: resumoCorretor?.valor_pago ?? 0 },
    ]
    : [
      { label: "Comissão bruta", valor: resumo.valor_comissao_bruta },
      { label: "Total a receber", valor: resumo.valor_total_a_receber },
      { label: "Total recebido", valor: resumo.valor_recebido },
      { label: "Total a pagar", valor: resumo.valor_total_a_pagar },
      { label: "Total pago", valor: resumo.valor_pago },
    ];
  return (
    <section aria-label="Indicadores conforme os filtros" className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${apenasCorretor ? "lg:grid-cols-3" : "lg:grid-cols-5"}`}>
      {cards.map((card) => <div key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</p>
        {loading ? <div className="mt-2 h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> :
          <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100" title={formatarMoedaComissao(card.valor)}>{formatarMoedaComissao(card.valor)}</p>}
      </div>)}
    </section>
  );
}
