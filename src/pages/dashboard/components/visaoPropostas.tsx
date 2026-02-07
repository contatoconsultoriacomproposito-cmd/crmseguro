import React, { useMemo, useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, XCircle, 
  Target, Users, CalendarDays, Wallet, Filter, Loader2, AlertCircle  
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, CartesianGrid, Legend, YAxis
} from 'recharts';

import type { LucideProps } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

// --- Interfaces ---
interface PropostaData {
  id: string;
  numero_proposta: string;
  status: string;
  motivo_perda?: string;
  valor_total_proposta: number;
  corretor_id: string;
  data_emissao: string;
  created_at: string;
  data_venda?: string;
  updated_at?: string;
  parceiro_id?: string;
}

interface VisaoPropostasProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

interface StatCardProps {
  label: string;
  val: number;
  money: number;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
  icon: React.ReactElement<LucideProps>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function VisaoPropostas({ 
  corretoraId,
  corretoresLista,
  userLevel,
  userId
}: VisaoPropostasProps) {
  
  // --- Estados ---
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [propostasLocais, setPropostasLocais] = useState<PropostaData[]>([]);
  const [parceirosLocais, setParceirosLocais] = useState<any[]>([]);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  const [corretorLocal, setCorretorLocal] = useState(userLevel?.toUpperCase() === 'CORRETOR' ? userId : 'todos');
  const [statusFiltro, setStatusFiltro] = useState<string[]>(['Vendido', 'Em Negociação', 'Perdido']);

  useEffect(() => {
    if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
      setCorretorLocal(userId);
    }
  }, [userId, userLevel]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. BUSCA DATA INICIAL
  useEffect(() => {
    async function buscarPrimeiraData() {
      if (!corretoraId) return;
      let query = supabase.from('tab_propostas').select('created_at').eq('corretora_id', corretoraId);
      
      if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
        query = query.eq('corretor_id', userId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(); 

      if (!error && data) {
        setDataInicio(data.created_at.split('T')[0]);
      } else {
        setDataInicio(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraData();
  }, [corretoraId, userLevel, userId]);

  // 2. BUSCA DE DADOS
  useEffect(() => {
    async function fetchDados() {
      if (!corretoraId || !dataInicio) return; 

      const filtroCorretorFinal = userLevel?.toUpperCase() === 'CORRETOR' ? userId : corretorLocal;

      setLoading(true);
      try {
        let query = supabase
          .from('tab_propostas')
          .select('*')
          .eq('corretora_id', corretoraId)
          .gte('created_at', `${dataInicio}T00:00:00`) 
          .lte('created_at', `${dataFim}T23:59:59`);

        if (filtroCorretorFinal === 'casa') {
          query = query.is('corretor_id', null);
        } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
          query = query.eq('corretor_id', filtroCorretorFinal);
        }

        const [resPropostas, resParceiros] = await Promise.all([
          query,
          supabase.from('tab_parceiros').select('*').eq('corretora_id', corretoraId)
        ]);

        if (resPropostas.error) throw resPropostas.error;
        
        setPropostasLocais(resPropostas.data || []);
        setParceirosLocais(resParceiros.data || []);
      } catch (err) {
        console.error("Erro ao carregar Visão Propostas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDados();
  }, [dataInicio, dataFim, corretorLocal, corretoraId, userLevel, userId]);

  // 3. PROCESSAMENTO (AQUI O FILTRO DE STATUS PASSA A SER GLOBAL)
  const stats = useMemo(() => {
    const acc = {
      // Dados que obedecem ao statusFiltro
      filtradosQtd: 0,
      filtradosVlr: 0,
      
      statusCount: {} as Record<string, number>,
      motivosPerda: {} as Record<string, number>,
      vendasPorMes: {} as Record<string, { Vendido: number; Perdido: number; EmNegociacao: number }>,
      vendasPorParceiro: {} as Record<string, { nome: string; qtd: number; valor: number }>
    };

    const mapaNomesParceiros: Record<string, string> = {};
    parceirosLocais.forEach(parc => {
      mapaNomesParceiros[String(parc.id).toLowerCase()] = parc.nome_parceiro;
    });

    propostasLocais.forEach(p => {
      const valor = Number(p.valor_total_proposta || 0);
      const statusComp = p.status || 'Em Negociação';
      const dataRef = (p.created_at || '').substring(0, 7);
      
      // FILTRO GLOBAL DE STATUS: Se não estiver no filtro, o dado é ignorado em todos os cálculos
      if (statusFiltro.includes(statusComp)) {
        acc.filtradosQtd++;
        acc.filtradosVlr += valor;
        acc.statusCount[statusComp] = (acc.statusCount[statusComp] || 0) + 1;

        // Evolução mensal (agora respeitando o filtro)
        if (!acc.vendasPorMes[dataRef]) acc.vendasPorMes[dataRef] = { Vendido: 0, Perdido: 0, EmNegociacao: 0 };
        if (statusComp === 'Vendido') acc.vendasPorMes[dataRef].Vendido += valor;
        else if (statusComp === 'Perdido') acc.vendasPorMes[dataRef].Perdido += valor;
        else acc.vendasPorMes[dataRef].EmNegociacao += valor;

        // Motivos de perda
        if (statusComp === 'Perdido') {
          const motivo = p.motivo_perda || 'Não informado';
          acc.motivosPerda[motivo] = (acc.motivosPerda[motivo] || 0) + 1;
        }

        // Parceiros
        const pId = p.parceiro_id ? String(p.parceiro_id).toLowerCase() : null;
        if (pId) {
          const nomeEncontrado = mapaNomesParceiros[pId] || 'Parceiro Não Localizado';
          if (!acc.vendasPorParceiro[pId]) {
            acc.vendasPorParceiro[pId] = { nome: nomeEncontrado, qtd: 0, valor: 0 };
          }
          acc.vendasPorParceiro[pId].qtd++;
          acc.vendasPorParceiro[pId].valor += valor;
        }
      }
    });

    // Métricas de conversão baseadas no total de propostas carregadas (independente de filtro visual)
    const vendidasCount = propostasLocais.filter(p => p.status === 'Vendido').length;
    const vlrVendidasTotal = propostasLocais
      .filter(p => p.status === 'Vendido')
      .reduce((s, p) => s + Number(p.valor_total_proposta || 0), 0);

    return { 
      ...acc, 
      ticketMedio: vendidasCount > 0 ? vlrVendidasTotal / vendidasCount : 0,
      conversao: propostasLocais.length > 0 ? (vendidasCount / propostasLocais.length) * 100 : 0
    };
  }, [propostasLocais, parceirosLocais, statusFiltro]);

  const toggleStatus = (s: string) => {
    setStatusFiltro(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <Filter size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500">Parâmetros:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
            />
            <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
            <input 
              type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
            />
          </div>

          <select 
            value={corretorLocal} 
            onChange={(e) => setCorretorLocal(e.target.value)}
            disabled={userLevel?.toUpperCase() === 'CORRETOR'}
            className="ml-auto bg-white border border-slate-100 rounded-lg text-xs font-bold p-2 min-w-[200px]"
          >
            {userLevel?.toUpperCase() !== 'CORRETOR' ? (
              <>
                <option value="todos">Todos os Corretores</option>
                <option value="casa">ATENDIMENTO DIRETO (CORRETORA)</option>
                {corretoresLista
                  .filter(c => c.nome.toUpperCase() !== "ATENDIMENTO DIRETO (CORRETORA)")
                  .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)
                }
              </>
            ) : (
              <option value={userId}>{corretoresLista.find(c => c.id === userId)?.nome || 'Meu Usuário'}</option>
            )}
          </select>
        </div>

        <div className="flex gap-2 border-t border-slate-50 pt-4">
          {[
            { id: 'Vendido', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { id: 'Em Negociação', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { id: 'Perdido', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => toggleStatus(st.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                statusFiltro.includes(st.id) 
                ? `${st.bg} ${st.color} ${st.border} font-black shadow-sm scale-105` 
                : 'bg-white border-slate-100 text-slate-400 font-bold opacity-60'
              } text-[10px] uppercase`}
            >
              <st.icon size={14} /> {st.id}
            </button>
          ))}
          {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-auto" />}
        </div>
      </div>

      {/* KPI CARDS (RESPEITANDO O FILTRO GLOBAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Itens no Filtro" 
          val={stats.filtradosQtd} 
          money={stats.filtradosVlr} 
          color="indigo" 
          icon={<FileText size={20}/>} 
        />
        
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[12px] font-black uppercase text-slate-400 mb-1">Taxa de Conversão</p>
          <p className="text-4xl font-black text-slate-800">{stats.conversao.toFixed(1)}%</p>
          <div className="w-full h-1.5 bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${stats.conversao}%` }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[12px] font-black uppercase text-slate-400 mb-1">Ticket Médio (Vendas)</p>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.ticketMedio)}
          </p>
        </div>

        {/* CARD CORRIGIDO: Total da Carteira agora usa stats.filtradosVlr */}
        <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
          <ShieldCheck size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Total Selecionado (Status)</p>
          <p className="text-2xl font-black">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.filtradosVlr)}
          </p>
          <p className="text-[10px] font-bold mt-2 bg-white/20 inline-block px-2 py-1 rounded-lg">
            {stats.filtradosQtd} Propostas Selecionadas
          </p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* MIX DE STATUS */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <Target size={18} className="text-indigo-500" /> Distribuição de Status
          </h3>
          <div className="h-64">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={Object.entries(stats.statusCount).map(([name, value]) => ({ name, value }))} 
                    innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                  >
                    {Object.keys(stats.statusCount).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* MOTIVOS DE PERDA */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <XCircle size={18} className="text-rose-500" /> Motivos de Perda
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.motivosPerda).length > 0 ? (
              Object.entries(stats.motivosPerda).sort((a,b)=>b[1]-a[1]).map(([motivo, qtd]) => (
                <div key={motivo}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-600 uppercase">{motivo}</span>
                    <span className="text-xs font-black text-rose-500">{qtd}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-400 h-full" style={{ width: `${(qtd / (stats.filtradosQtd || 1)) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 opacity-20">
                <ShieldCheck size={48} />
                <p className="text-[10px] font-bold uppercase mt-2">Nenhuma perda no filtro</p>
              </div>
            )}
          </div>
        </div>

        {/* EVOLUÇÃO FINANCEIRA CORRIGIDA: As barras agora respeitam o filtro de status */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[32px]">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-500" /> Evolução Financeira (Filtro)
          </h3>
          <div className="h-64">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(stats.vendasPorMes).sort().map(([name, v]) => ({ name, ...v }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 900}} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                  <Bar dataKey="Vendido" stackId="a" fill="#10b981" />
                  <Bar dataKey="EmNegociacao" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Perdido" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* RANKING PARCEIROS */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase text-slate-500 mb-8 flex items-center gap-2">
          <Users size={18} className="text-indigo-500" /> Desempenho por Parceiro (No Filtro)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(stats.vendasPorParceiro).length > 0 ? (
            Object.entries(stats.vendasPorParceiro)
              .sort((a,b) => b[1].valor - a[1].valor)
              .map(([id, data]) => (
                <div key={id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 uppercase">
                      {data.qtd} itens
                    </span>
                    <Wallet size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase truncate mb-1">{data.nome}</p>
                  <p className="text-xl font-black text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor)}
                  </p>
                </div>
              ))
          ) : (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200 opacity-50 font-bold uppercase text-xs">
              Nenhum dado para o filtro selecionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Subcomponente StatCard Original ---
function StatCard({ label, val, money, color, icon }: StatCardProps) {
  const colorMap = {
    indigo: 'bg-indigo-500 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-500 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-500 text-amber-600 border-amber-100',
    rose: 'bg-rose-500 text-rose-600 border-rose-100',
  };
  const currentStyles = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
      <div className={`w-10 h-10 ${currentStyles.split(' ')[0]} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
        {icon}
      </div>
      <p className="text-[12px] font-black uppercase text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800">{val || 0}</p>
      <p className={`text-[13px] font-bold mt-1 ${currentStyles.split(' ')[1]}`}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(money || 0)}
      </p>
      <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
        {React.cloneElement(icon as any, { size: 100 })}
      </div>
    </div>
  );
}