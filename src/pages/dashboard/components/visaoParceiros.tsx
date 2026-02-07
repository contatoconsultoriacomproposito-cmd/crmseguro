import { useMemo, useState, useEffect } from 'react';
import { 
  Crown, PieChart as PieIcon, BarChart3, 
  Filter, AlertTriangle, TrendingUp, Users, User, CheckCircle2, Loader2,
  Clock, XCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoParceirosProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function VisaoParceiros({ 
  corretoraId, 
  corretoresLista,
  userLevel,
  userId 
}: VisaoParceirosProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parceiros, setParceiros] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // 1. ESTADOS DE FILTRO (AGORA COM OS STATUS ESPECÍFICOS)
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  // Opções: 'todos', 'vendido', 'negociacao', 'perdido'
  const [statusFiltro, setStatusFiltro] = useState('todos'); 
  
  const [corretorLocal, setCorretorLocal] = useState(
    userLevel?.toUpperCase() === 'CORRETOR' ? userId : 'todos'
  );

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
      setCorretorLocal(userId);
    }
  }, [userId, userLevel]);

  // 2. BUSCA DA DATA INICIAL
  useEffect(() => {
    async function buscarPrimeiraProposta() {
      if (!corretoraId) return;
      let query = supabase.from('tab_propostas').select('created_at').eq('corretora_id', corretoraId);
      
      if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
        query = query.eq('corretor_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();

      if (!error && data) {
        setDataInicio(data.created_at.split('T')[0]);
      } else {
        setDataInicio(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraProposta();
  }, [corretoraId, userLevel, userId]);

  // 3. BUSCA DE DADOS
  useEffect(() => {
    async function fetchData() {
      if (!dataInicio || !corretoraId) return;

      const filtroFinal = userLevel?.toUpperCase() === 'CORRETOR' ? userId : corretorLocal;

      setLoading(true);
      setErrorLog(null);

      try {
        let pQuery = supabase.from('tab_parceiros').select('*').eq('corretora_id', corretoraId);

        let query = supabase.from('tab_propostas').select('*')
          .eq('corretora_id', corretoraId)
          .gte('created_at', `${dataInicio}T00:00:00`)
          .lte('created_at', `${dataFim}T23:59:59`);

        if (filtroFinal === 'casa') {
          const filtroCasa = `corretor_id.is.null,corretor_id.eq.${corretoraId}`;
          pQuery = pQuery.or(filtroCasa);
          query = query.or(filtroCasa);
        } else if (filtroFinal !== 'todos' && filtroFinal) {
          pQuery = pQuery.eq('corretor_id', filtroFinal);
          query = query.eq('corretor_id', filtroFinal);
        }

        const [pRes, propRes] = await Promise.all([pQuery, query]);

        if (pRes.error) throw pRes.error;
        if (propRes.error) throw propRes.error;

        setParceiros(pRes.data || []);
        setPropostas(propRes.data || []);
      } catch (err: any) {
        setErrorLog(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [corretoraId, dataInicio, dataFim, corretorLocal, userLevel, userId]);

  // 4. PROCESSAMENTO DAS ESTATÍSTICAS COM LÓGICA DE STATUS REFINADA
  const stats = useMemo(() => {
    const acc = {
      tipos: { INTERNO: 0, EXTERNO: 0 },
      performance: {} as Record<string, { nome: string; total: number; qtd: number; tipo: string; setor: string }>,
      count: 0,
      volume: 0
    };

    parceiros.forEach(p => {
      const pId = String(p.id);
      const tipo = (p.tipo_parceiro || 'INTERNO').toUpperCase();
      if (tipo === 'INTERNO') acc.tipos.INTERNO++; else acc.tipos.EXTERNO++;
      
      acc.performance[pId] = { 
        nome: p.nome_parceiro, total: 0, qtd: 0, tipo, setor: p.setor_parceiro || 'Não Informado'
      };
    });

    propostas.forEach(prop => {
      const status = (prop.status || '').toLowerCase();
      
      // Definição de grupos de status
      const isVendido = ['emit', 'vend', 'pag', 'fech', 'concl'].some(s => status.includes(s));
      const isPerdido = ['canc', 'perdid', 'recus', 'nao'].some(s => status.includes(s));
      const isNegociacao = !isVendido && !isPerdido;

      let passaFiltro = false;
      if (statusFiltro === 'todos') passaFiltro = true;
      else if (statusFiltro === 'vendido') passaFiltro = isVendido;
      else if (statusFiltro === 'negociacao') passaFiltro = isNegociacao;
      else if (statusFiltro === 'perdido') passaFiltro = isPerdido;

      if (passaFiltro) {
        const valor = Number(prop.valor_total_proposta || 0);
        acc.count++;
        acc.volume += valor;

        if (prop.parceiro_id && acc.performance[String(prop.parceiro_id)]) {
          const pId = String(prop.parceiro_id);
          acc.performance[pId].total += valor;
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
      vendasCount: acc.count,
      volumeTotal: acc.volume,
      dataTipos: [
        { name: 'Internos', value: acc.tipos.INTERNO },
        { name: 'Externos', value: acc.tipos.EXTERNO }
      ].filter(v => v.value > 0),
    };
  }, [parceiros, propostas, statusFiltro]);

return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* BARRA DE FILTROS REFATORADA PARA O PADRÃO DE BOTÕES */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* FILTRO DE DATA */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <Filter size={16} className="text-indigo-500" />
            <input 
              type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} 
              className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none" 
            />
            <span className="text-slate-300 font-black text-[9px]">ATÉ</span>
            <input 
              type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} 
              className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none" 
            />
          </div>

          {/* SELETOR DE CORRETOR COM TRAVA (ALINHADO À DIREITA) */}
          <div className="flex items-center gap-2 px-4 border-l border-slate-100 ml-auto">
            <User size={14} className="text-slate-400" />
            <select 
              value={corretorLocal} 
              onChange={(e) => setCorretorLocal(e.target.value)} 
              disabled={userLevel?.toUpperCase() === 'CORRETOR'}
              className={`text-[10px] font-black uppercase bg-transparent outline-none min-w-[160px] ${
                userLevel?.toUpperCase() === 'CORRETOR' ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-indigo-600'
              }`}
            >
              {userLevel?.toUpperCase() !== 'CORRETOR' ? (
                <>
                  <option value="todos">Todos os Corretores</option>
                  <option value="casa">ATENDIMENTO DIRETO (CORRETORA)</option>
                  {corretoresLista
                    .filter(c => c.nome?.toUpperCase() !== "ATENDIMENTO DIRETO (CORRETORA)")
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))
                  }
                </>
              ) : (
                <option value={userId}>
                  {corretoresLista.find(c => c.id === userId)?.nome || 'Minha Produção'}
                </option>
              )}
            </select>
            {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-2" />}
          </div>
        </div>

        {/* BOTÕES DE STATUS (PADRÃO IMAGEM 2) */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-50">
          <button
            onClick={() => setStatusFiltro('todos')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
              statusFiltro === 'todos' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            📋 Todas
          </button>

          <button
            onClick={() => setStatusFiltro('vendido')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
              statusFiltro === 'vendido' 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
              : 'bg-emerald-50/50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 size={14} /> Vendido
          </button>

          <button
            onClick={() => setStatusFiltro('negociacao')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
              statusFiltro === 'negociacao' 
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' 
              : 'bg-amber-50/50 text-amber-600 border border-amber-100 hover:bg-amber-50'
            }`}
          >
            <Clock size={14} /> Em Negociação
          </button>

          <button
            onClick={() => setStatusFiltro('perdido')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
              statusFiltro === 'perdido' 
              ? 'bg-red-500 text-white shadow-lg shadow-red-100' 
              : 'bg-red-50/50 text-red-600 border border-red-100 hover:bg-red-50'
            }`}
          >
            <XCircle size={14} /> Perdido
          </button>
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
        <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
          <Users className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Sua Rede</p>
          <h2 className="text-5xl font-black mt-1">{stats.totalParceiros}</h2>
          <p className="text-[10px] mt-3 font-bold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">Parceiros Vinculados</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</p>
          <h2 className="text-5xl font-black text-slate-800 mt-1">{stats.vendasCount}</h2>
          <div className={`flex items-center gap-1 mt-2 font-bold text-xs uppercase italic 
            ${statusFiltro === 'vendido' ? 'text-emerald-500' : 
              statusFiltro === 'perdido' ? 'text-red-500' : 'text-amber-500'}`}>
            <TrendingUp size={14} /> 
            <span>
              {statusFiltro === 'todos' ? 'Total do Funil' : 
               statusFiltro === 'vendido' ? 'Vendas Confirmadas' : 
               statusFiltro === 'perdido' ? 'Perdas' : 'Em Aberto'}
            </span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Financeiro</p>
          <h2 className={`text-3xl font-black mt-1 
            ${statusFiltro === 'vendido' ? 'text-emerald-600' : 
              statusFiltro === 'perdido' ? 'text-red-600' : 'text-amber-600'}`}>
            {stats.volumeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h2>
          <p className="text-[10px] mt-2 font-bold text-slate-400 uppercase italic">Produção por Status</p>
        </div>
      </div>

      {/* GRÁFICOS E RANKING */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-400 mb-8 flex items-center gap-2 tracking-widest">
            <PieIcon size={16} className="text-indigo-500" /> Distribuição de Parceiros
          </h3>
          
          <div className="h-64 w-full relative">
            {isMounted && stats.dataTipos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stats.dataTipos} innerRadius={70} outerRadius={90} 
                    paddingAngle={10} dataKey="value"
                  >
                    {stats.dataTipos.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] font-black text-slate-300 tracking-widest uppercase italic">
                Aguardando dados...
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            {stats.dataTipos.map((t, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase block">{t.name}</span>
                <span className="text-xl font-black text-slate-700">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
              <Crown size={18} className="text-amber-500" /> Melhores Parceiros
            </h3>
            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase
              ${statusFiltro === 'vendido' ? 'bg-emerald-50 text-emerald-600' : 
                statusFiltro === 'perdido' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              {statusFiltro === 'todos' ? 'Total Pipeline' : 
               statusFiltro === 'vendido' ? 'Ranking de Vendas' : 
               statusFiltro === 'negociacao' ? 'Ranking de Propostas' : 'Ranking de Perdas'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.ranking.length > 0 ? stats.ranking.map((p, idx) => (
              <div key={idx} className="group p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {idx + 1}º
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-slate-800 uppercase block leading-tight">{p.nome}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{p.setor}</span>
                    </div>
                  </div>
                  <div className="bg-indigo-100 px-2 py-0.5 rounded-full text-[7px] font-black text-indigo-600 uppercase">{p.tipo}</div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Produção do Período</p>
                    <p className={`text-xl font-black leading-none 
                      ${statusFiltro === 'vendido' ? 'text-emerald-600' : 
                        statusFiltro === 'perdido' ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-700 leading-none">{p.qtd}</p>
                    <p className="text-[7px] font-black text-slate-400 uppercase">Qtd</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-300">
                <BarChart3 size={40} className="mb-2 opacity-20" />
                <p className="font-black uppercase text-[9px] tracking-widest italic text-center">
                  Nenhum dado encontrado para este status no período.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}