import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, FileText, ReceiptText, RefreshCw, X, Eye } from "lucide-react";
import { useComissoes } from "../hooks/useComissoes";
import { ComissoesResumoCards } from "../components/ComissoesResumoCards";
import { ComissoesFiltros } from "../components/ComissoesFiltros";
import { TabelaComissoes } from "../components/TabelaComissoes";
import ModalRelatorioComissoes from "../components/ModalRelatorioComissoes";
import { formatarMoedaComissao } from "../services/comissoesCalculos";
import { buscarComissoesGeral, buscarMinhasComissoesCorretor, buscarParticipantesFiltroComissao, type OpcaoParticipanteComissao } from "../services/comissoesService";
import { valoresFiltro } from "../services/filtrosComissoesUtils";
import type { FiltrosComissoes, ItemComissaoGeral, ItemMinhaComissaoCorretor } from "../types/comissoes";

interface Opcao { value: string; label: string }
function opcoesUnicas(itens: Array<{ value: string | null | undefined; label: string | null | undefined }>): Opcao[] {
  const unico = new Map<string, string>();
  itens.forEach(({ value, label }) => { if (value && label) unico.set(value, label); });
  return [...unico].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
const statusLabel: Record<string,string> = {
  PAGA: "Pago", PARCIAL: "Parcial", A_PAGAR: "A receber", VENCE_HOJE: "Vence hoje", ATRASADA: "Atrasado", CANCELADA: "Cancelado",
};

function TabelaPessoal({ itens, loading, total, pagina, totalPaginas, onAnterior, onProxima, onAbrir }: {
  itens: ItemMinhaComissaoCorretor[]; loading: boolean; total: number; pagina: number; totalPaginas: number;
  onAnterior: () => void; onProxima: () => void; onAbrir: (item: ItemMinhaComissaoCorretor) => void;
}) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">Minhas comissões <span className="ml-2 text-xs font-normal text-slate-500">{total} registros</span></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-sm">
      <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr>
        {['Cliente','Apólice','Produto','Seguradora','Minha comissão','Recebido','Situação','Ações'].map((rotulo, i) => <th key={rotulo} className={`px-3 py-3 ${i === 4 || i === 5 ? 'text-right' : ''}`}>{rotulo}</th>)}
      </tr></thead>
      <tbody>
        {!itens.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">{loading ? 'Carregando...' : 'Nenhuma comissão encontrada.'}</td></tr>}
        {itens.map((item) => {
          const situacoes = item.pagamentos.map((p) => p.situacao);
          const status = situacoes.includes('ATRASADA') ? 'ATRASADA' : situacoes.includes('VENCE_HOJE') ? 'VENCE_HOJE' : situacoes.includes('PARCIAL') ? 'PARCIAL' : situacoes.length && situacoes.every((s) => s === 'PAGA') ? 'PAGA' : situacoes.includes('A_PAGAR') ? 'A_PAGAR' : 'CANCELADA';
          return <tr key={item.split.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60">
            <td className="max-w-[200px] px-3 py-3 font-medium"><span className="block truncate" title={item.cliente?.nome ?? ''}>{item.cliente?.nome ?? '—'}</span></td>
            <td className="px-3 py-3">{item.contrato.numero_apolice ?? '—'}</td>
            <td className="max-w-[160px] px-3 py-3"><span className="block truncate">{item.produto_nome ?? '—'}</span></td>
            <td className="max-w-[150px] px-3 py-3"><span className="block truncate">{item.seguradora_nome ?? '—'}</span></td>
            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{formatarMoedaComissao(item.split.valor_liquido_split)}</td>
            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-emerald-600">{formatarMoedaComissao(item.resumo_pagamentos.valor_pago)}</td>
            <td className="px-3 py-3 text-xs text-slate-500">{statusLabel[status] ?? 'Sem provisão'}</td>
            <td className="px-3 py-3 text-center"><button type="button" title="Ver meus pagamentos" aria-label="Ver meus pagamentos" onClick={() => onAbrir(item)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700"><Eye size={15}/></button></td>
          </tr>;
        })}
      </tbody>
    </table></div>
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800"><span>Página {pagina} de {Math.max(1,totalPaginas)}</span><div className="flex gap-2"><button disabled={loading || pagina <= 1} onClick={onAnterior} className="rounded-lg border px-3 py-2 disabled:opacity-40 dark:border-slate-700">Anterior</button><button disabled={loading || pagina >= totalPaginas} onClick={onProxima} className="rounded-lg border px-3 py-2 disabled:opacity-40 dark:border-slate-700">Próxima</button></div></div>
  </section>;
}

export default function Comissoes() {
  const navigate = useNavigate();
  const { visao, filtros, itens, resumo, itensCorretor, resumoCorretor, total, pagina, totalPaginas, loading, erro,
    atualizarFiltro, limparFiltros, irParaPagina, paginaAnterior, proximaPagina, recarregar, temFiltrosAtivos } = useComissoes();
  const apenasCorretor = visao === "CORRETOR";
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [participantes, setParticipantes] = useState<OpcaoParticipanteComissao[]>([]);
  const [catalogoCorretora, setCatalogoCorretora] = useState<ItemComissaoGeral[]>([]);
  const [catalogoCorretor, setCatalogoCorretor] = useState<ItemMinhaComissaoCorretor[]>([]);
  const [detalhePessoal, setDetalhePessoal] = useState<ItemMinhaComissaoCorretor | null>(null);

  // Opções independentes da página atual e dos filtros ativos. Não são dados novos nem permissões adicionais.
  useEffect(() => {
    let ativo = true;
    async function carregarCatalogo() {
      try {
        if (apenasCorretor) {
          const primeira = await buscarMinhasComissoesCorretor({ pagina: 1, limite: 100 });
          const lista = [...primeira.itens];
          for (let i = 2; i <= primeira.total_paginas; i++) {
            const paginaResultado = await buscarMinhasComissoesCorretor({ pagina: i, limite: 100 });
            lista.push(...paginaResultado.itens);
          }
          if (ativo) setCatalogoCorretor(lista);
        } else {
          const [primeira, participantesEncontrados] = await Promise.all([
            buscarComissoesGeral({ pagina: 1, limite: 100 }), buscarParticipantesFiltroComissao(),
          ]);
          const lista = [...primeira.itens];
          for (let i = 2; i <= primeira.total_paginas; i++) {
            const paginaResultado = await buscarComissoesGeral({ pagina: i, limite: 100 });
            lista.push(...paginaResultado.itens);
          }
          if (ativo) { setCatalogoCorretora(lista); setParticipantes(participantesEncontrados); }
        }
      } catch (e) {
        console.error("Erro ao carregar opções dos filtros de comissões:", e);
      }
    }
    void carregarCatalogo();
    return () => { ativo = false; };
  }, [apenasCorretor]);

  const todosItens = catalogoCorretora.length ? catalogoCorretora : itens;
  const todosItensCorretor = catalogoCorretor.length ? catalogoCorretor : itensCorretor;
  const corretores = useMemo(() => opcoesUnicas(todosItens.map((i) => ({ value: i.contrato.corretor_id, label: i.corretor_nome }))), [todosItens]);
  const seguradoras = useMemo(() => opcoesUnicas(apenasCorretor ? todosItensCorretor.map((i) => ({ value: i.contrato.seguradora_id, label: i.seguradora_nome })) : todosItens.map((i) => ({ value: i.contrato.seguradora_id, label: i.seguradora_nome }))), [apenasCorretor, todosItens, todosItensCorretor]);
  const produtos = useMemo(() => opcoesUnicas(apenasCorretor ? todosItensCorretor.map((i) => ({ value: i.contrato.produto_id, label: i.produto_nome })) : todosItens.map((i) => ({ value: i.contrato.produto_id, label: i.produto_nome }))), [apenasCorretor, todosItens, todosItensCorretor]);
  const opcoesParticipantes = useMemo(() => participantes.map(({value,label}) => ({value,label})), [participantes]);

  const filtrosDescricao = useMemo(() => {
    const campos: Array<[string, string | string[] | undefined, Opcao[]]> = [
      ["Corretor", filtros.corretor_id, corretores],
      ["Seguradora", filtros.seguradora_id, seguradoras],
      ["Produto", filtros.produto_id, produtos],
      ["Recebimento", filtros.situacao_recebimento, [{value:'A_RECEBER',label:'A receber'},{value:'RECEBE_HOJE',label:'Hoje'},{value:'ATRASADA',label:'Atrasada'},{value:'RECEBIDA',label:'Recebida'},{value:'CANCELADA',label:'Cancelada'}]],
      ["Pagamento", filtros.situacao_pagamento, [{value:'A_PAGAR',label:'A pagar'},{value:'VENCE_HOJE',label:'Hoje'},{value:'ATRASADA',label:'Atrasada'},{value:'PAGA',label:'Paga'},{value:'CANCELADA',label:'Cancelada'}]],
      ["Tipo", filtros.tipo_participante, [{value:'CORRETOR',label:'Corretor'},{value:'SUPERVISOR',label:'Supervisor'},{value:'PARCEIRO',label:'Parceiro'},{value:'INDICADOR',label:'Indicador'},{value:'OUTRO',label:'Outro'},{value:'CORRETORA',label:'Corretora'}]],
      ["Participante", filtros.participante_id, opcoesParticipantes],
    ];
    const descricoes = campos.flatMap(([titulo, value, opcoes]) => {
      const selecoes = valoresFiltro(value);
      return selecoes.length ? [`${titulo}: ${selecoes.map((id) => opcoes.find((o) => o.value === id)?.label ?? id).join(', ')}`] : [];
    });
    if (filtros.busca) descricoes.unshift(`Busca: ${filtros.busca}`);
    return descricoes;
  }, [filtros, corretores, seguradoras, produtos, opcoesParticipantes]);

  const handleFiltro = <K extends keyof FiltrosComissoes>(campo: K, valor: FiltrosComissoes[K]) => atualizarFiltro(campo, valor);
  return <div className="min-h-full bg-slate-50 dark:bg-slate-950">
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900"><ReceiptText size={20}/></div>
          <div><h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{apenasCorretor ? 'Minhas comissões' : 'Comissões'}</h1><p className="mt-0.5 text-xs text-slate-500">{apenasCorretor ? 'Seus valores e pagamentos' : 'Recebimentos e repasses em um só lugar'}</p></div>
        </div>
        <div className="flex gap-2">
          {!apenasCorretor && <button onClick={() => setModalRelatorioAberto(true)} type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"><FileText size={15}/> Exportar PDF</button>}
          <button onClick={() => void recarregar()} disabled={loading} type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Atualizar</button>
        </div>
      </div>
      <ComissoesResumoCards resumo={resumo} resumoCorretor={resumoCorretor} apenasCorretor={apenasCorretor} loading={loading}/>
      <ComissoesFiltros filtros={filtros} loading={false} temFiltrosAtivos={temFiltrosAtivos} apenasCorretor={apenasCorretor} corretores={corretores} seguradoras={seguradoras} produtos={produtos} participantes={opcoesParticipantes} onFiltroChange={handleFiltro} onLimpar={limparFiltros}/>
      {erro && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><AlertCircle size={18} />{erro}</div>}
      {apenasCorretor ?
        <TabelaPessoal itens={itensCorretor} loading={loading} total={total} pagina={pagina} totalPaginas={totalPaginas} onAnterior={paginaAnterior} onProxima={proximaPagina} onAbrir={setDetalhePessoal} /> :
        <TabelaComissoes itens={itens} loading={loading} total={total} pagina={pagina} totalPaginas={totalPaginas} onPaginaAnterior={paginaAnterior} onProximaPagina={proximaPagina} onIrParaPagina={irParaPagina} onAbrirComissao={(item) => navigate(`/whatsapp/comissoes/contratos/${item.contrato.id}`)}/>}
    </div>
    {!apenasCorretor && <ModalRelatorioComissoes isOpen={modalRelatorioAberto} onClose={() => setModalRelatorioAberto(false)} filtros={filtros} filtrosDescricao={filtrosDescricao} />}
    {detalhePessoal && <div role="dialog" aria-modal="true" aria-label="Meus pagamentos da comissão" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-semibold">Meus pagamentos</h2><p className="text-xs text-slate-500">{detalhePessoal.cliente?.nome ?? 'Cliente'}</p></div><button onClick={() => setDetalhePessoal(null)} aria-label="Fechar" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900"><X size={18}/></button></div>
        <div className="max-h-[50vh] space-y-2 overflow-auto">
          {detalhePessoal.pagamentos.length === 0 && <p className="py-4 text-sm text-slate-500">Sem provisões.</p>}
          {detalhePessoal.pagamentos.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div><p className="text-sm font-semibold">{formatarMoedaComissao(p.valor_previsto)}</p><p className="text-xs text-slate-500">Previsto: {p.data_prevista?.split('-').reverse().join('/')}</p></div><div className="text-right"><p className="text-xs text-slate-600 dark:text-slate-300">{statusLabel[p.situacao] ?? p.situacao}</p><p className="text-xs text-emerald-600">Pago: {formatarMoedaComissao(p.valor_pago)}</p></div></div>)}
        </div>
        <div className="mt-4 flex justify-end"><button onClick={() => setDetalhePessoal(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Fechar</button></div>
      </div>
    </div>}
  </div>;
}
