import { Download, FileText, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FiltrosComissoes } from "../types/comissoes";
import { buscarDadosRelatorioComissoes, gerarPdfRelatorioComissoes, type DadosRelatorioComissoes } from "../services/comissoesRelatorioService";
import { formatarMoedaComissao } from "../services/comissoesCalculos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filtros: FiltrosComissoes;
  filtrosDescricao?: string[];
  participanteNome?: string | null;
}
export default function ModalRelatorioComissoes({ isOpen, onClose, filtros, filtrosDescricao = [], participanteNome = null }: Props) {
  const [dados, setDados] = useState<DadosRelatorioComissoes | null>(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    let ativo = true;
    setDados(null); setErro(null); setLoading(true);
    void buscarDadosRelatorioComissoes(filtros)
      .then((resultado) => { if (ativo) setDados(resultado); })
      .catch((e: unknown) => { if (ativo) setErro(e instanceof Error ? e.message : "Falha ao preparar relatório."); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [isOpen, filtros]);
  if (!isOpen) return null;
  const metricas = dados ? [
    ["Comissão bruta", dados.resumo.valor_comissao_bruta],
    ["A receber", dados.resumo.valor_total_a_receber],
    ["Recebido", dados.resumo.valor_recebido],
    ["A pagar", dados.resumo.valor_total_a_pagar],
    ["Pago", dados.resumo.valor_pago],
  ] as const : [];
  return <div role="dialog" aria-modal="true" aria-label="Exportar comissões" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4">
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5"><FileText size={19} className="text-blue-600" /><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Exportar comissões</h2><p className="text-xs text-slate-500">PDF resumido dos resultados filtrados</p></div></div>
        <button type="button" aria-label="Fechar relatório" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"><X size={18}/></button>
      </div>
      <div className="space-y-4 p-5">
        {loading && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> Preparando relatório...</p>}
        {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{erro}</p>}
        {dados && <>
          <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{dados.total}</strong> comissões · {dados.filtros.data_inicio || 'Sem data inicial'} até {dados.filtros.data_fim || 'sem data final'}</p>
          {filtrosDescricao.length > 0 && <p className="text-xs leading-5 text-slate-500">Filtros: {filtrosDescricao.join(' · ')}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{metricas.map(([rotulo, valor]) => <div key={rotulo} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><p className="text-[11px] text-slate-500">{rotulo}</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{formatarMoedaComissao(valor)}</p></div>)}</div>
          <p className="text-xs text-slate-500">O arquivo traz uma tabela única por comissão, sem detalhamento individual de parcelas. {participanteNome ? `Participante filtrado: ${participanteNome}.` : ''}</p>
        </>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button>
        <button type="button" disabled={!dados || loading || gerando} onClick={() => {
          if (!dados) return;
          try { setGerando(true); setErro(null); gerarPdfRelatorioComissoes(dados, { filtrosDescricao, participanteNome }); }
          catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao gerar PDF.'); }
          finally { setGerando(false); }
        }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Download size={15} /> Exportar PDF</button>
      </div>
    </div>
  </div>;
}
