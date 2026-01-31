import { useState, useMemo, useEffect } from 'react';
import { DollarSign, CheckCircle2, Clock, Calendar, User, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient'; // Ajuste o caminho conforme seu projeto

interface VisaoComissoesProps {
  corretoraId: string;
  corretoresLista: any[];
}

export default function VisaoComissoes({ 
  corretoraId, 
  corretoresLista = [] 
}: VisaoComissoesProps) {
  
  // --- 1. ESTADOS ---
  const [comissoesRaw, setComissoesRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorId, setCorretorId] = useState('todos');

  // --- 2. QUERY ISOLADA ---
  useEffect(() => {
    async function fetchComissoes() {
      if (!corretoraId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tab_comissoes')
          .select(`
            *,
            tab_clientes ( nome )
          `)
          .eq('corretora_id', corretoraId);

        if (error) throw error;
        setComissoesRaw(data || []);
      } catch (err) {
        console.error('Erro ao buscar comissões:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchComissoes();
  }, [corretoraId]);

  const bcl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- 3. LÓGICA DE CÁLCULO (MEMO) ---
  const stats = useMemo(() => {
    const s = { total: 0, recebido: 0, pendente: 0, detalhe: [] as any[] };

    comissoesRaw.forEach((c) => {
      const itemCorretorId = c.corretor_id || '';
      const passaFiltroCorretor = corretorId === 'todos' || itemCorretorId === corretorId;

      const dataRef = (c.data_venda || '').split(/[ T]/)[0];
      const dentroDoPeriodo = dataRef >= dataInicio && dataRef <= dataFim;

      if (dentroDoPeriodo && passaFiltroCorretor) {
        const valor = Number(c.valor_comissao || 0);
        const isLiquidado = !!(c.data_recebimento);

        s.total += valor;
        if (isLiquidado) s.recebido += valor;
        else s.pendente += valor;
        
        s.detalhe.push({
          ...c,
          status_real: isLiquidado ? 'LIQUIDADO' : 'AGUARDANDO'
        });
      }
    });

    s.detalhe.sort((a, b) => {
       const dA = a.data_venda ? new Date(a.data_venda).getTime() : 0;
       const dB = b.data_venda ? new Date(b.data_venda).getTime() : 0;
       return dB - dA;
    });

    return { ...s, percentual: s.total > 0 ? (s.recebido / s.total) * 100 : 0 };
  }, [comissoesRaw, dataInicio, dataFim, corretorId]);

  const resetFiltros = () => {
    setDataInicio(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    setDataFim(new Date().toISOString().split('T')[0]);
    setCorretorId('todos');
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Financeiro...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER E FILTROS */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-100">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Comissões e Receita</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Performance Financeira Isolada</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-indigo-600 p-1" />
              <span className="text-slate-300">/</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-indigo-600 p-1" />
              
              {/* RÓTULO DE PRECISÃO FINANCEIRA */}
              <span className="ml-2 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 whitespace-nowrap">
                💰 Base: Data de Venda
              </span>
            </div>

            <div className="flex items-center gap-2 px-3">
              <User size={14} className="text-slate-400" />
              <select value={corretorId} onChange={(e) => setCorretorId(e.target.value)} className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer focus:text-indigo-600 min-w-[140px]">
                <option value="todos">Todos os Corretores</option>
                {corretoresLista.map(corr => (
                  <option key={corr.id} value={corr.id}>{corr.nome}</option>
                ))}
              </select>
            </div>

            <button onClick={resetFiltros} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all">
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>

      {/* CARDS DE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 text-center italic">Previsão Bruta</p>
          <p className="text-2xl font-black text-slate-800 text-center tracking-tighter">{bcl(stats.total)}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm border-b-4 border-b-emerald-500">
          <p className="text-[10px] font-black text-emerald-500 uppercase mb-1 flex items-center justify-center gap-1 italic">
            <CheckCircle2 size={10} /> Liquidado
          </p>
          <p className="text-2xl font-black text-emerald-600 text-center tracking-tighter">{bcl(stats.recebido)}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm border-b-4 border-b-amber-500">
          <p className="text-[10px] font-black text-amber-500 uppercase mb-1 flex items-center justify-center gap-1 italic">
            <Clock size={10} /> Pendente
          </p>
          <p className="text-2xl font-black text-amber-500 text-center tracking-tighter">{bcl(stats.pendente)}</p>
        </div>

        <div className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-100 flex flex-col justify-center">
          <p className="text-[10px] font-black text-indigo-100 uppercase mb-1 text-center italic tracking-widest">Eficiência</p>
          <p className="text-3xl font-black text-white text-center">{stats.percentual.toFixed(1)}%</p>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Venda</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cliente / Seguradora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {stats.detalhe.length > 0 ? stats.detalhe.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500">
                    {item.data_venda ? new Date(item.data_venda).toLocaleDateString('pt-BR') : '---'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 uppercase tracking-tighter italic">
                        {item.tab_clientes?.nome || 'CLIENTE N/A'}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-bold uppercase">{item.nome_seguradora || 'S/N'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      item.status_real === 'LIQUIDADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.status_real}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">
                    {bcl(item.valor_comissao)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center opacity-30 italic font-black uppercase text-xs tracking-widest">
                    Nenhum lançamento identificado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}