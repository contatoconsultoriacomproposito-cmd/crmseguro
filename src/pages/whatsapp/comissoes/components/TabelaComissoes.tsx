import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import type { ItemComissaoGeral } from "../types/comissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface Props {
  itens: ItemComissaoGeral[];
  loading?: boolean;
  pagina: number;
  totalPaginas: number;
  total: number;
  onAbrirComissao: (item: ItemComissaoGeral) => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
  onIrParaPagina?: (pagina: number) => void;
}

function resumoStatus(status: string): { texto: string; cor: string } {
  switch (status) {
    case "PAGA": case "RECEBIDA": return { texto: "Recebido", cor: "text-emerald-700 dark:text-emerald-400" };
    case "ATRASADA": return { texto: "Atrasado", cor: "text-red-600 dark:text-red-400" };
    case "VENCE_HOJE": case "RECEBE_HOJE": return { texto: "Vence hoje", cor: "text-amber-600 dark:text-amber-400" };
    case "PARCIAL": return { texto: "Parcial", cor: "text-amber-600 dark:text-amber-400" };
    case "CANCELADA": return { texto: "Cancelado", cor: "text-slate-500" };
    case "SEM_PROVISAO": return { texto: "Sem previsão", cor: "text-slate-500" };
    default: return { texto: "Pendente", cor: "text-blue-600 dark:text-blue-400" };
  }
}
function statusRecebimento(item: ItemComissaoGeral): string {
  const r = item.resumo_recebimentos;
  if (r.valor_atrasado > 0) return "ATRASADA";
  if (r.valor_recebe_hoje > 0) return "RECEBE_HOJE";
  if (r.quantidade_recebidas > 0 && r.quantidade_pendentes > 0) return "PARCIAL";
  if (r.valor_a_receber > 0) return "PENDENTE";
  if (r.quantidade_recebidas > 0) return "RECEBIDA";
  if (r.quantidade_canceladas > 0) return "CANCELADA";
  return "SEM_PROVISAO";
}
function Montante({ valor, status }: { valor: number; status: string }) {
  const situacao = resumoStatus(status);
  return <div className="text-right">
    <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatarMoedaComissao(valor)}</p>
    <p className={`mt-0.5 text-[11px] font-medium ${situacao.cor}`}>{situacao.texto}</p>
  </div>;
}
const cabecalho = "whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
export function TabelaComissoes({ itens, loading = false, pagina, totalPaginas, total, onAbrirComissao, onPaginaAnterior, onProximaPagina, onIrParaPagina }: Props) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Comissões</h2><p className="text-xs text-slate-500">{total} resultado(s)</p></div>
      {loading && <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Atualizando</span>}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1320px] border-collapse text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/70"><tr className="border-b border-slate-200 dark:border-slate-800">
          {['Cliente','Apólice','Produto','Seguradora','Corretor','Comissão bruta','Comissão corretora','Comissão corretor','Recebido corretora','Recebido corretor','Ações'].map((nome,i) =>
            <th key={nome} className={`${cabecalho} ${i >= 5 && i <= 9 ? 'text-right' : ''} ${i === 10 ? 'text-center' : ''}`}>{nome}</th>)}
        </tr></thead>
        <tbody>
          {itens.length === 0 && <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "Carregando comissões..." : "Nenhuma comissão corresponde aos filtros."}</td></tr>}
          {itens.map((item) => <tr key={item.comissao.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 dark:border-slate-800/70 dark:hover:bg-slate-900/40">
            <td className="max-w-[200px] px-3 py-3"><p className="truncate font-medium text-slate-900 dark:text-slate-100" title={item.cliente?.nome ?? ''}>{item.cliente?.nome ?? 'Cliente não identificado'}</p><span className="text-[11px] text-slate-400">{item.cliente?.tipo ?? ''}</span></td>
            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{item.contrato.numero_apolice || '—'}</td>
            <td className="max-w-[155px] px-3 py-3"><span className="block truncate" title={item.produto_nome ?? ''}>{item.produto_nome || '—'}</span></td>
            <td className="max-w-[150px] px-3 py-3"><span className="block truncate" title={item.seguradora_nome ?? ''}>{item.seguradora_nome || '—'}</span></td>
            <td className="max-w-[160px] px-3 py-3"><span className="block truncate" title={item.corretor_nome ?? ''}>{item.corretor_nome || '—'}</span></td>
            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatarMoedaComissao(item.comissao.valor_comissao_bruta)}</td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatarMoedaComissao(item.resumo_splits.valor_residual_corretora)}</td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatarMoedaComissao(item.valor_comissao_corretor)}</td>
            <td className="px-3 py-3"><Montante valor={item.resumo_recebimentos.valor_recebido} status={statusRecebimento(item)} /></td>
            <td className="px-3 py-3"><Montante valor={item.valor_pago_corretor} status={item.situacao_pagamento_corretor} /></td>
            <td className="px-3 py-3 text-center"><button type="button" title="Abrir comissão" aria-label={`Abrir comissão de ${item.cliente?.nome ?? 'cliente'}`} onClick={() => onAbrirComissao(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Eye size={15}/></button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
      <span className="text-xs text-slate-500">Página {pagina} de {Math.max(1,totalPaginas)}</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={loading || pagina <= 1} onClick={onPaginaAnterior} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={15}/>Anterior</button>
        {onIrParaPagina && totalPaginas > 2 && <span className="text-xs text-slate-500">{pagina} / {totalPaginas}</span>}
        <button type="button" disabled={loading || totalPaginas === 0 || pagina >= totalPaginas} onClick={onProximaPagina} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium disabled:opacity-40 dark:border-slate-700">Próxima<ChevronRight size={15}/></button>
      </div>
    </div>
  </section>;
}
