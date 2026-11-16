import { Download, FileText, Loader2, X, CheckSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FiltrosComissoes } from "../types/comissoes";
import { buscarDadosRelatorioComissoes, gerarPdfRelatorioComissoes, CAMPOS_RELATORIO_COMISSOES, CAMPOS_PADRAO_RELATORIO, type DadosRelatorioComissoes, type CampoRelatorioComissoes, type GrupoCampoRelatorio } from "../services/comissoesRelatorioService";

interface Props { isOpen:boolean; onClose:()=>void; filtros:FiltrosComissoes; filtrosDescricao?:string[]; participanteNome?:string|null }
const grupos: {id:GrupoCampoRelatorio; titulo:string}[] = [
  {id:"identificacao",titulo:"Identificação do contrato"}, {id:"calculo",titulo:"Composição e cálculo"},
  {id:"distribuicao",titulo:"Divisão entre participantes"}, {id:"financeiro",titulo:"Recebimentos e pagamentos"}
];
export default function ModalRelatorioComissoes({isOpen,onClose,filtros,filtrosDescricao=[],participanteNome=null}:Props) {
  const [dados,setDados]=useState<DadosRelatorioComissoes|null>(null);
  const [loading,setLoading]=useState(false); const [gerando,setGerando]=useState(false);const [erro,setErro]=useState<string|null>(null);
  const [campos,setCampos]=useState<CampoRelatorioComissoes[]>([...CAMPOS_PADRAO_RELATORIO]);
  const [resumo,setResumo]=useState(true); const [titulo,setTitulo]=useState("Relatório de Comissões");
  const selecionados=useMemo(()=>new Set(campos),[campos]);
  useEffect(()=>{if(!isOpen)return;let ativo=true;setDados(null);setErro(null);setLoading(true);
    void buscarDadosRelatorioComissoes(filtros).then(r=>{if(ativo)setDados(r)}).catch((e:unknown)=>{if(ativo)setErro(e instanceof Error?e.message:"Falha ao preparar relatório")}).finally(()=>{if(ativo)setLoading(false)});
    return ()=>{ativo=false};},[isOpen,filtros]);
  const alternar=(id:CampoRelatorioComissoes)=>setCampos(prev=>prev.includes(id)?prev.filter(c=>c!==id):[...prev,id]);
  const selecionarGrupo=(grupo:GrupoCampoRelatorio)=>{const ids=CAMPOS_RELATORIO_COMISSOES.filter(c=>c.grupo===grupo).map(c=>c.id);
    setCampos(prev=>ids.every(id=>prev.includes(id))?prev.filter(c=>!ids.includes(c)):Array.from(new Set([...prev,...ids])));};
  if(!isOpen)return null;
  return <div role="dialog" aria-modal="true" aria-label="Configurar relatório de comissões" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
    <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3"><FileText size={20} className="text-blue-600"/><div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Relatório personalizável de comissões</h2><p className="text-xs text-slate-500">Escolha quais informações estarão no PDF, respeitando os filtros selecionados.</p></div></div>
        <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900"><X size={18}/></button>
      </div>
      <div className="space-y-4 overflow-y-auto p-5">
        {loading&&<p className="flex gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={15}/>Carregando dados...</p>}
        {erro&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {dados&&<p className="text-sm text-slate-600 dark:text-slate-300"><strong>{dados.total}</strong> comissões correspondem aos filtros aplicados.</p>}
        {filtrosDescricao.length>0&&<p className="text-xs text-slate-500">Filtros: {filtrosDescricao.join(" · ")}</p>}
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Título do documento
          <input value={titulo} maxLength={90} onChange={e=>setTitulo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"/>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Colunas selecionadas: {campos.length}</p>
          <div className="flex gap-2"><button type="button" onClick={()=>setCampos([...CAMPOS_PADRAO_RELATORIO])} className="rounded-md border px-3 py-1.5 text-xs dark:border-slate-700">Modelo padrão</button>
            <button type="button" onClick={()=>setCampos(CAMPOS_RELATORIO_COMISSOES.map(c=>c.id))} className="rounded-md border px-3 py-1.5 text-xs dark:border-slate-700">Marcar todas</button>
            <button type="button" onClick={()=>setCampos([])} className="rounded-md border px-3 py-1.5 text-xs dark:border-slate-700">Limpar</button></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{grupos.map(g=><section key={g.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <button type="button" className="mb-3 flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200" onClick={()=>selecionarGrupo(g.id)}><span>{g.titulo}</span><span className="flex items-center gap-1 text-xs text-blue-600"><CheckSquare size={13}/> Selecionar grupo</span></button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{CAMPOS_RELATORIO_COMISSOES.filter(c=>c.grupo===g.id).map(c=><label key={c.id} className="flex cursor-pointer items-start gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={selecionados.has(c.id)} onChange={()=>alternar(c.id)} className="mt-0.5 accent-blue-600"/><span>{c.titulo}</span></label>)}</div>
        </section>)}</div>
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"><input type="checkbox" className="accent-blue-600" checked={resumo} onChange={e=>setResumo(e.target.checked)}/> Incluir cartões de totais no cabeçalho</label>
        <p className="text-xs leading-5 text-slate-500">Os percentuais de corretora e corretor correspondem às taxas configuradas nos rateios. Participações residuais automáticas e valores fixos são identificados separadamente. Muitas colunas podem dividir a tabela em blocos horizontais de páginas.</p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700">Cancelar</button>
        <button type="button" disabled={!dados||loading||gerando||!campos.length} onClick={()=>{if(!dados)return;try{setGerando(true);setErro(null);gerarPdfRelatorioComissoes(dados,{titulo,filtrosDescricao,participanteNome,campos: CAMPOS_RELATORIO_COMISSOES.filter(c=>selecionados.has(c.id)).map(c=>c.id),mostrarResumo:resumo});}catch(e){setErro(e instanceof Error?e.message:"Falha na exportação")}finally{setGerando(false)}}} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Download size={16}/> Exportar PDF ({campos.length})</button>
      </div>
    </div>
  </div>;
}
