import { useMemo, useState, useEffect } from 'react';
import { 
  Crown, PieChart as PieIcon, BarChart3, 
  Loader2, Filter, AlertTriangle, TrendingUp, Users
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoParceirosProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function VisaoParceiros({ corretoraId, corretoresLista }: VisaoParceirosProps) {
  const [loading, setLoading] = useState(true);
  const [parceiros, setParceiros] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Estados de Filtro - Começam vazios para gatilho da data automática
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [corretorLocal, setCorretorLocal] = useState('todos');

  useEffect(() => {
    let isMounted = true;

    async function fetchDataBruta() {
      if (!corretoraId) {
        console.warn("⚠️ [DASHBOARD] corretoraId ausente.");
        return;
      }

      console.log("🚀 [FETCH] Iniciando busca total...");
      setLoading(true);
      setErrorLog(null);

      try {
        // 1. BUSCA PARCEIROS
        const { data: pData, error: pError } = await supabase
          .from('tab_parceiros')
          .select('*')
          .eq('corretora_id', corretoraId);

        if (pError) throw pError;

        // 2. BUSCA PROPOSTAS
        let query = supabase
          .from('tab_propostas')
          .select('*')
          .eq('corretora_id', corretoraId);

        // Aplica filtros se houver data definida
        if (dataInicio) query = query.gte('created_at', dataInicio);
        if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`);

        if (corretorLocal !== 'todos') {
          query = query.eq('corretor_id', corretorLocal);
        }

        const { data: propData, error: propError } = await query;
        if (propError) throw propError;
        
        if (isMounted) {
          console.log(`✅ [SYNC] Parceiros: ${pData?.length}, Propostas: ${propData?.length}`);
          
          // LÓGICA 1: FILTRO DE DATAS AUTOMÁTICO (Caso ainda não setado)
          if (propData && propData.length > 0 && !dataInicio && !dataFim) {
            const timestamps = propData.map(p => new Date(p.created_at).getTime());
            const minDate = new Date(Math.min(...timestamps)).toISOString().split('T')[0];
            const maxDate = new Date(Math.max(...timestamps)).toISOString().split('T')[0];
            
            setDataInicio(minDate);
            setDataFim(maxDate);
          }

          setParceiros(pData || []);
          setPropostas(propData || []);
        }

      } catch (err: any) {
        console.error("💥 [ERRO CRÍTICO]:", err);
        setErrorLog(err.message || "Erro ao conectar com o banco de dados.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDataBruta();
    return () => { isMounted = false; };
  }, [corretoraId, dataInicio, dataFim, corretorLocal]);

  const stats = useMemo(() => {
    const acc = {
      tipos: { INTERNO: 0, EXTERNO: 0 },
      setores: {} as Record<string, number>,
      performance: {} as Record<string, { nome: string; total: number; qtd: number; tipo: string; setor: string }>,
      totalVendasConvertidasParceiro: 0
    };

    // Mapeia Parceiros
    parceiros.forEach(p => {
      const pId = String(p.id);
      const tipo = (p.tipo_parceiro || 'INTERNO').toUpperCase();
      const setor = p.setor_parceiro || 'Não Informado';

      if (tipo === 'INTERNO') acc.tipos.INTERNO++; else acc.tipos.EXTERNO++;
      acc.setores[setor] = (acc.setores[setor] || 0) + 1;
      
      acc.performance[pId] = { 
        nome: p.nome_parceiro, 
        total: 0, 
        qtd: 0, 
        tipo, 
        setor 
      };
    });

    // Processa Propostas de Venda
    propostas.forEach(prop => {
      // LÓGICA 2: PARTICIPAÇÃO DE PARCEIRO (PARCEIRO_ID NÃO NULO)
      if (!prop.parceiro_id) return;
      
      const pId = String(prop.parceiro_id);
      const status = (prop.status || '').toLowerCase();
      const eSucesso = ['emit', 'vend', 'pag', 'fech', 'concl'].some(s => status.includes(s));

      if (eSucesso) {
        acc.totalVendasConvertidasParceiro++; // Incrementa contador de vendas via parceiro

        if (acc.performance[pId]) {
          acc.performance[pId].total += Number(prop.valor_total_proposta || 0);
          acc.performance[pId].qtd += 1;
        }
      }
    });

    return {
      ranking: Object.values(acc.performance)
        .filter(item => item.qtd > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
      totalParceiros: parceiros.length,
      vendasConvertidas: acc.totalVendasConvertidasParceiro,
      dataTipos: [
        { name: 'Internos', value: acc.tipos.INTERNO },
        { name: 'Externos', value: acc.tipos.EXTERNO }
      ].filter(v => v.value > 0),
      dataSetores: Object.entries(acc.setores)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    };
  }, [parceiros, propostas]);

  if (loading && !dataInicio) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Rede...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* BARRA DE FILTROS SUPERIOR */}
      <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
          <Filter size={16} className="text-indigo-500" />
          <input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)} 
            className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none" 
          />
          <span className="text-slate-300 font-black text-[9px]">ATÉ</span>
          <input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)} 
            className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none" 
          />

          {/* RÓTULO DE PRECISÃO PARA PARCEIROS */}
          <span className="ml-2 text-[9px] font-black text-cyan-600 uppercase bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100">
            🤝 Base: Produção da Rede no Período
          </span>
        </div>

        <select 
          value={corretorLocal} 
          onChange={(e) => setCorretorLocal(e.target.value)}
          className="ml-auto bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 p-2.5 min-w-[220px] shadow-sm outline-none focus:ring-2 focus:ring-indigo-50"
        >
          <option value="todos">🌍 Todos os Corretores</option>
          {corretoresLista?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {errorLog && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-bounce">
          <AlertTriangle size={20} />
          <span className="text-xs font-black uppercase tracking-tight">Erro no Banco: {errorLog}</span>
        </div>
      )}

      {/* KPI CARDS RAPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 opacity-20" size={100} />
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Total da Rede</p>
          <h2 className="text-4xl font-black mt-1">{stats.totalParceiros}</h2>
          <p className="text-[10px] mt-2 font-bold bg-indigo-500 w-fit px-2 py-1 rounded-lg">Parceiros Cadastrados</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas via Parceiros</p>
          <h2 className="text-4xl font-black text-slate-800 mt-1">
            {stats.vendasConvertidas}
          </h2>
          <div className="flex items-center gap-1 text-emerald-500 mt-2 font-bold text-xs">
            <TrendingUp size={14} /> <span>Participação Efetiva</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Total (Ranking)</p>
          <h2 className="text-3xl font-black text-emerald-600 mt-1">
            {stats.ranking.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h2>
          <p className="text-[10px] mt-2 font-bold text-slate-400 uppercase italic">Soma do Top 6</p>
        </div>
      </div>

      {/* GRÁFICOS E RANKING */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Perfil */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[35px] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest">
              <PieIcon size={16} className="text-indigo-500" /> Distribuição de Tipo
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stats.dataTipos} 
                    innerRadius={70} 
                    outerRadius={90} 
                    paddingAngle={10} 
                    dataKey="value"
                  >
                    {stats.dataTipos.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {stats.dataTipos.map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{t.name}</span>
                  <span className="text-lg font-black text-slate-700">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lado Direito: Ranking de Performance (Destaque) */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[35px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
              <Crown size={18} className="text-amber-500" /> Top Performance por Parceiro
            </h3>
            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">
              Somente Vendas Concluídas
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.ranking.length > 0 ? stats.ranking.map((p, idx) => (
              <div key={idx} className="group p-5 rounded-[24px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-slate-800 uppercase block leading-tight">{p.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.setor}</span>
                    </div>
                  </div>
                  <div className="bg-white px-2 py-1 rounded-lg text-[8px] font-black text-indigo-500 border border-indigo-50">{p.tipo}</div>
                </div>
                
                <div className="flex items-end justify-between mt-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Produção Total</p>
                    <p className="text-xl font-black text-emerald-600 leading-none">
                      {p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-black text-slate-700 leading-none">{p.qtd}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Vendas</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-300">
                <BarChart3 size={40} className="mb-2 opacity-20" />
                <p className="font-black uppercase text-[10px] tracking-widest">Nenhuma venda via parceiro no período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}