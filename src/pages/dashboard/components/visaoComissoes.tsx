import { useState, useMemo, useEffect } from 'react';
import { DollarSign, CheckCircle2, Clock, Calendar, User, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface VisaoComissoesProps {
  corretoraId: string;
  corretoresLista: any[];
  userLevel?: string;
  userId?: string;
}

export default function VisaoComissoes({ 
  corretoraId, 
  corretoresLista = [],
  userLevel,
  userId
}: VisaoComissoesProps) {
  
  const [comissoesRaw, setComissoesRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. ESTADOS DE FILTRO
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorId, setCorretorId] = useState('todos');

  // 2. BUSCA AUTOMÁTICA DA DATA DA PRIMEIRA VENDA
  useEffect(() => {
    async function buscarPrimeiroLancamento() {
      if (!corretoraId) return;
      
      const { data, error } = await supabase
        .from('tab_comissoes')
        .select('data_venda')
        .eq('corretora_id', corretoraId)
        .order('data_venda', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data?.data_venda) {
        setDataInicio(data.data_venda.split(' ')[0]);
      } else {
        const now = new Date();
        setDataInicio(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiroLancamento();
  }, [corretoraId]);

  // 3. BUSCA DE DADOS COM TRAVA DE SEGURANÇA
  useEffect(() => {
    async function fetchComissoes() {
      if (!corretoraId || !dataInicio) return;
      setLoading(true);
      try {
        let query = supabase
          .from('tab_comissoes')
          .select(`
            *,
            tab_clientes ( nome )
          `)
          .eq('corretora_id', corretoraId)
          .gte('data_venda', dataInicio)
          .lte('data_venda', dataFim);

        // Trava de Segurança: Corretor só vê o dele
        if (userLevel === 'corretor' && userId) {
          query = query.eq('corretor_id', userId);
        } else if (corretorId !== 'todos') {
          query = query.eq('corretor_id', corretorId);
        }

        const { data, error } = await query.order('data_venda', { ascending: false });

        if (error) throw error;
        setComissoesRaw(data || []);
      } catch (err) {
        console.error('Erro ao buscar comissões:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchComissoes();
  }, [corretoraId, dataInicio, dataFim, corretorId, userLevel, userId]);

  const bcl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // 4. LÓGICA DE CÁLCULO
  const stats = useMemo(() => {
    const s = { total: 0, recebido: 0, pendente: 0, detalhe: [] as any[] };

    comissoesRaw.forEach((c) => {
      const valor = Number(c.valor_comissao || 0);
      const isLiquidado = !!(c.data_recebimento);

      s.total += valor;
      if (isLiquidado) s.recebido += valor;
      else s.pendente += valor;
      
      s.detalhe.push({
        ...c,
        status_real: isLiquidado ? 'LIQUIDADO' : 'AGUARDANDO'
      });
    });

    return { ...s, percentual: s.total > 0 ? (s.recebido / s.total) * 100 : 0 };
  }, [comissoesRaw]);

  const resetFiltros = () => {
    setCorretorId('todos');
    setDataFim(new Date().toISOString().split('T')[0]);
  };

  if (loading && !dataInicio) {
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
          <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-100">
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Comissões e Receita</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Performance Financeira Consolidada</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-4 border-r border-slate-100">
            <Calendar size={14} className="text-indigo-500" />
            <input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-indigo-600 p-1" 
            />
            <span className="text-slate-300">/</span>
            <input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-indigo-600 p-1" 
            />
            
            <span className="ml-3 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 whitespace-nowrap">
              💰 Base: Data de Venda
            </span>
          </div>

          {/* Filtro de Corretor visível apenas para Admin/Dono */}
          {userLevel !== 'corretor' && (
            <div className="flex items-center gap-2 px-4">
              <User size={14} className="text-slate-400" />
              <select 
                value={corretorId} 
                onChange={(e) => setCorretorId(e.target.value)} 
                className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer focus:text-indigo-600 min-w-[160px]"
              >
                <option value="todos">Todos os Corretores</option>
                {corretoresLista.map(corr => (
                  <option key={corr.id} value={corr.id}>{corr.nome}</option>
                ))}
              </select>
            </div>
          )}

          <button onClick={resetFiltros} className="p-2.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all">
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {/* CARDS DE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-center tracking-widest">Previsão Bruta</p>
          <p className="text-3xl font-black text-slate-800 text-center tracking-tighter group-hover:scale-105 transition-transform">{bcl(stats.total)}</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-b-[6px] border-b-emerald-500 group">
          <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 flex items-center justify-center gap-1 tracking-widest">
            <CheckCircle2 size={12} /> Liquidado
          </p>
          <p className="text-3xl font-black text-emerald-600 text-center tracking-tighter group-hover:scale-105 transition-transform">{bcl(stats.recebido)}</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-b-[6px] border-b-amber-500 group">
          <p className="text-[10px] font-black text-amber-500 uppercase mb-2 flex items-center justify-center gap-1 tracking-widest">
            <Clock size={12} /> Pendente
          </p>
          <p className="text-3xl font-black text-amber-500 text-center tracking-tighter group-hover:scale-105 transition-transform">{bcl(stats.pendente)}</p>
        </div>

        <div className="bg-indigo-600 p-8 rounded-[32px] shadow-xl shadow-indigo-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
            <DollarSign size={60} className="text-white" />
          </div>
          <p className="text-[10px] font-black text-indigo-100 uppercase mb-2 text-center tracking-widest relative z-10">Taxa de Recebimento</p>
          <p className="text-4xl font-black text-white text-center relative z-10">{stats.percentual.toFixed(1)}%</p>
        </div>
      </div>

      {/* TABELA DE LANÇAMENTOS */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        )}
        
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
           <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest italic">Detalhamento de Entradas</h3>
           <span className="text-[10px] font-black text-indigo-500 bg-white px-3 py-1 rounded-full border border-indigo-50 shadow-sm">
             {stats.detalhe.length} Registros
           </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Data Venda</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Cliente & Seguradora</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-center">Status Financeiro</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Valor Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {stats.detalhe.length > 0 ? (
                stats.detalhe.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-5 font-bold text-slate-500">
                      {item.data_venda ? new Date(item.data_venda).toLocaleDateString('pt-BR') : '---'}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase tracking-tighter italic group-hover:text-indigo-600 transition-colors">
                          {item.tab_clientes?.nome || 'CLIENTE N/A'}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase">{item.nome_seguradora || 'S/N'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border shadow-sm ${
                        item.status_real === 'LIQUIDADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {item.status_real}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-800 text-sm">
                      {bcl(item.valor_comissao)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                       <DollarSign size={48} className="mb-2" />
                       <p className="font-black uppercase text-xs tracking-[0.2em]">Nenhum lançamento no período</p>
                    </div>
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