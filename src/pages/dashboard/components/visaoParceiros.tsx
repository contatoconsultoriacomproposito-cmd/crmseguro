import { useMemo, useState, useEffect } from 'react';
import { 
  Crown, PieChart as PieIcon, BarChart3, 
  Loader2, Filter, AlertTriangle, TrendingUp, Users, User
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

  // 1. ESTADOS DE FILTRO
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 2. BUSCA DA DATA MAIS ANTIGA (Retrovisor Automático)
  useEffect(() => {
    async function buscarPrimeiraProposta() {
      if (!corretoraId) return;
      const { data, error } = await supabase
        .from('tab_propostas')
        .select('created_at')
        .eq('corretora_id', corretoraId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!error && data) {
        setDataInicio(data.created_at.split('T')[0]);
      } else {
        // Fallback: Início do ano corrente
        setDataInicio(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraProposta();
  }, [corretoraId]);

  // 3. BUSCA DE DADOS (Parceiros + Propostas Filtradas)
  useEffect(() => {
  async function fetchData() {
    if (!dataInicio || !corretoraId) return;

    setLoading(true);
    setErrorLog(null);

    try {
      // 1. Busca Parceiros
      const { data: pData, error: pError } = await supabase
        .from('tab_parceiros')
        .select('*')
        .eq('corretora_id', corretoraId);

      if (pError) throw pError;

      // 2. Construção da Query de Propostas
      let query = supabase
        .from('tab_propostas')
        .select('*')
        .eq('corretora_id', corretoraId)
        .gte('created_at', `${dataInicio}T00:00:00`)
        .lte('created_at', `${dataFim}T23:59:59`);

      // --- LÓGICA DE FILTRO CORRIGIDA ---
      if (corretorLocal !== 'todos') {
        query = query.eq('corretor_id', corretorLocal);
      }
      // ----------------------------------

      const { data: propData, error: propError } = await query;
      if (propError) throw propError;
      
      setParceiros(pData || []);
      setPropostas(propData || []);
    } catch (err: any) {
      console.error("Erro Visão Parceiros:", err);
      setErrorLog(err.message);
    } finally {
      setLoading(false);
    }
  }

  fetchData();
}, [corretoraId, dataInicio, dataFim, corretorLocal]);

  // 4. PROCESSAMENTO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const acc = {
      tipos: { INTERNO: 0, EXTERNO: 0 },
      setores: {} as Record<string, number>,
      performance: {} as Record<string, { nome: string; total: number; qtd: number; tipo: string; setor: string }>,
      totalVendasConvertidasParceiro: 0
    };

    parceiros.forEach(p => {
      const pId = String(p.id);
      const tipo = (p.tipo_parceiro || 'INTERNO').toUpperCase();
      const setor = p.setor_parceiro || 'Não Informado';

      if (tipo === 'INTERNO') acc.tipos.INTERNO++; else acc.tipos.EXTERNO++;
      acc.setores[setor] = (acc.setores[setor] || 0) + 1;
      
      acc.performance[pId] = { 
        nome: p.nome_parceiro, total: 0, qtd: 0, tipo, setor 
      };
    });

    propostas.forEach(prop => {
      if (!prop.parceiro_id) return;
      
      const pId = String(prop.parceiro_id);
      const status = (prop.status || '').toLowerCase();
      const eSucesso = ['emit', 'vend', 'pag', 'fech', 'concl'].some(s => status.includes(s));

      if (eSucesso) {
        acc.totalVendasConvertidasParceiro++;
        if (acc.performance[pId]) {
          acc.performance[pId].total += Number(prop.valor_total_proposta || 0);
          acc.performance[pId].qtd += 1;
        }
      }
    });

    const ranking = Object.values(acc.performance)
      .filter(item => item.qtd > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    return {
      ranking,
      totalParceiros: parceiros.length,
      vendasConvertidas: acc.totalVendasConvertidasParceiro,
      dataTipos: [
        { name: 'Internos', value: acc.tipos.INTERNO },
        { name: 'Externos', value: acc.tipos.EXTERNO }
      ].filter(v => v.value > 0),
      totalVolumeRanking: ranking.reduce((sum, item) => sum + item.total, 0)
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* FILTROS */}
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
          <span className="ml-2 text-[9px] font-black text-cyan-600 uppercase bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100">
            🤝 Base: Produção Total da Rede
          </span>
        </div>

        <div className="flex items-center gap-2 px-4 border-l border-slate-100 ml-auto">
          <User size={14} className="text-slate-400" />
          <select 
            value={corretorLocal} 
            onChange={(e) => setCorretorLocal(e.target.value)} 
            className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer focus:text-indigo-600 min-w-[160px]"
          >
            <option value="todos">Todos os Corretores</option>
            {/* Se for na visão de Produtividade, mantenha a opção 'casa' abaixo se ela existir no seu banco */}
            {/* <option value="casa">Somente a Casa</option> */}
            {(corretoresLista || []).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {errorLog && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertTriangle size={20} />
          <span className="text-xs font-black uppercase">Erro: {errorLog}</span>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 opacity-20" size={100} />
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Total da Rede</p>
          <h2 className="text-5xl font-black mt-1">{stats.totalParceiros}</h2>
          <p className="text-[10px] mt-3 font-bold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">Parceiros Cadastrados</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas via Parceiros</p>
          <h2 className="text-5xl font-black text-slate-800 mt-1">{stats.vendasConvertidas}</h2>
          <div className="flex items-center gap-1 text-emerald-500 mt-2 font-bold text-xs">
            <TrendingUp size={14} /> <span>Participação Efetiva</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Top Performance</p>
          <h2 className="text-3xl font-black text-emerald-600 mt-1">
            {stats.totalVolumeRanking.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h2>
          <p className="text-[10px] mt-2 font-bold text-slate-400 uppercase italic">Soma do Ranking Principal</p>
        </div>
      </div>

      {/* GRÁFICOS E RANKING */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-400 mb-8 flex items-center gap-2 tracking-widest">
            <PieIcon size={16} className="text-indigo-500" /> Perfil da Rede
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.dataTipos} 
                  innerRadius={70} 
                  outerRadius={90} 
                  paddingAngle={10} 
                  dataKey="value"
                >
                  {stats.dataTipos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {stats.dataTipos.map((t, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-2xl text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase block">{t.name}</span>
                <span className="text-xl font-black text-slate-700">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
              <Crown size={18} className="text-amber-500" /> Top Performance por Parceiro
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.ranking.length > 0 ? stats.ranking.map((p, idx) => (
              <div key={idx} className="group p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {idx + 1}º
                    </div>
                    <div>
                      <span className="text-[12px] font-black text-slate-800 uppercase block leading-tight">{p.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.setor}</span>
                    </div>
                  </div>
                  <div className="bg-indigo-100 px-3 py-1 rounded-full text-[8px] font-black text-indigo-600 uppercase tracking-widest">{p.tipo}</div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Produção Acumulada</p>
                    <p className="text-2xl font-black text-emerald-600 leading-none">
                      {p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-700 leading-none">{p.qtd}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Vendas</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-300">
                <BarChart3 size={40} className="mb-2 opacity-20" />
                <p className="font-black uppercase text-[10px] tracking-widest italic">Nenhum resultado para os filtros atuais</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}