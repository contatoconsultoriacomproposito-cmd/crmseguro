import React, { useMemo, useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, XCircle, 
  Target, Users, CalendarDays, Wallet, Filter, Loader2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, CartesianGrid, Legend
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

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
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function VisaoPropostas({ 
  corretoraId,
  corretoresLista 
}: VisaoPropostasProps) {
  
  const [loading, setLoading] = useState(true);
  const [propostasLocais, setPropostasLocais] = useState<PropostaData[]>([]);
  const [parceirosLocais, setParceirosLocais] = useState<any[]>([]);

  // 1. ESTADOS DE FILTRO (Data de início começa vazia para ser preenchida pelo useEffect)
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 2. BUSCAR A DATA DA PROPOSTA MAIS ANTIGA
  useEffect(() => {
    async function buscarPrimeiraData() {
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
        // Fallback: Primeiro dia do mês atual caso não haja propostas
        setDataInicio(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraData();
  }, [corretoraId]);

  // 3. BUSCA DE DADOS
  useEffect(() => {
    async function fetchPropostas() {
      if (!dataInicio) return; // Aguarda a definição da data de início
      
      setLoading(true);
      try {
        let query = supabase
          .from('tab_propostas')
          .select('*')
          .eq('corretora_id', corretoraId)
          .gte('created_at', `${dataInicio}T00:00:00`)
          .lte('created_at', `${dataFim}T23:59:59`);

        if (corretorLocal !== 'todos') {
          query = query.eq('corretor_id', corretorLocal);
        }

        const { data: propData, error: propError } = await query;
        if (propError) throw propError;

        const { data: parcData } = await supabase
          .from('tab_parceiros')
          .select('*')
          .eq('corretora_id', corretoraId);

        setPropostasLocais(propData || []);
        setParceirosLocais(parcData || []);
      } catch (err) {
        console.error("Erro ao carregar Visão Propostas:", err);
      } finally {
        setLoading(false);
      }
    }

    if (corretoraId) fetchPropostas();
  }, [dataInicio, dataFim, corretorLocal, corretoraId]);

  // 4. PROCESSAMENTO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const acc = {
      total: 0, vlrCriado: 0,
      vendidas: 0, vlrVendido: 0,
      perdidas: 0, vlrPerdido: 0,
      statusCount: {} as Record<string, number>,
      motivosPerda: {} as Record<string, number>,
      vendasPorMes: {} as Record<string, { qtd: number; valor: number }>,
      vendasPorParceiro: {} as Record<string, { nome: string; qtd: number; valor: number }>
    };

    const mapaNomesParceiros: Record<string, string> = {};
    (parceirosLocais || []).forEach(parc => {
      if (parc.id) {
        mapaNomesParceiros[String(parc.id).toLowerCase()] = parc.nome_parceiro;
      }
    });

    propostasLocais.forEach(p => {
      const valor = Number(p.valor_total_proposta || 0);
      const status = p.status || 'Em Negociação';
      const statusLower = status.toLowerCase();
      const pId = p.parceiro_id ? String(p.parceiro_id).toLowerCase() : null;

      acc.total++;
      acc.vlrCriado += valor;
      acc.statusCount[status] = (acc.statusCount[status] || 0) + 1;

      if (statusLower === 'vendido' || statusLower === 'fechado' || statusLower === 'concluído') {
        acc.vendidas++;
        acc.vlrVendido += valor;

        const dataRefVenda = (p.data_venda || p.created_at || '').split(/[ T]/)[0];
        const mesAno = dataRefVenda.substring(0, 7);
        if (!acc.vendasPorMes[mesAno]) acc.vendasPorMes[mesAno] = { qtd: 0, valor: 0 };
        acc.vendasPorMes[mesAno].qtd++;
        acc.vendasPorMes[mesAno].valor += valor;

        if (pId) {
          const nomeEncontrado = mapaNomesParceiros[pId] || 'Parceiro Não Localizado';
          if (!acc.vendasPorParceiro[pId]) {
            acc.vendasPorParceiro[pId] = { nome: nomeEncontrado, qtd: 0, valor: 0 };
          }
          acc.vendasPorParceiro[pId].qtd++;
          acc.vendasPorParceiro[pId].valor += valor;
        }
      }

      if (statusLower === 'perdido' || statusLower === 'cancelado') {
        acc.perdidas++;
        acc.vlrPerdido += valor;
        const motivo = p.motivo_perda || 'Não informado';
        acc.motivosPerda[motivo] = (acc.motivosPerda[motivo] || 0) + 1;
      }
    });

    return { 
      ...acc, 
      ticketMedio: acc.vendidas > 0 ? acc.vlrVendido / acc.vendidas : 0, 
      conversao: acc.total > 0 ? (acc.vendidas / acc.total) * 100 : 0 
    };
  }, [propostasLocais, parceirosLocais]);

  const chartStatus = Object.entries(stats.statusCount).map(([name, value]) => ({ name, value }));
  const chartMeses = Object.entries(stats.vendasPorMes)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, data]) => ({ name, valor: data.valor, qtd: data.qtd }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Analítico de Propostas:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />
          <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
          <input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />

          <span className="ml-2 text-[9px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
            📑 Período: Data de Entrada
          </span>
        </div>

        <select 
          value={corretorLocal} 
          onChange={(e) => setCorretorLocal(e.target.value)}
          className="ml-auto bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px]"
        >
          <option value="todos">Todos os Corretores / Casa</option>
          {(corretoresLista || []).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        {loading && (
          <div className="flex items-center gap-2 ml-2 animate-pulse">
            <Loader2 size={16} className="text-indigo-500 animate-spin" />
            <span className="text-[10px] font-bold text-indigo-500 uppercase">Sincronizando...</span>
          </div>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Propostas Criadas" val={stats.total} money={stats.vlrCriado} color="indigo" icon={<FileText size={20}/>} />
        <StatCard label="Vendas Realizadas" val={stats.vendidas} money={stats.vlrVendido} color="emerald" icon={<ShieldCheck size={20}/>} />
        
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[12px] font-black uppercase text-slate-400 mb-1">Ticket Médio (Vendas)</p>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.ticketMedio)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[12px] font-black uppercase text-slate-400 mb-1">Taxa de Conversão</p>
          <p className="text-4xl font-black text-slate-800">{stats.conversao.toFixed(1)}%</p>
          <div className="w-full h-1.5 bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.min(stats.conversao, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <Target size={18} className="text-indigo-500" /> Status das Propostas
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartStatus} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {chartStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <XCircle size={18} className="text-rose-500" /> Motivos de Perda
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.motivosPerda).length > 0 ? (
              Object.entries(stats.motivosPerda).sort((a,b)=>b[1]-a[1]).map(([motivo, qtd]) => (
                <div key={motivo}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-black text-slate-600 uppercase">{motivo}</span>
                    <span className="text-xs font-black text-rose-500">{qtd}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-400 h-full transition-all duration-1000" style={{ width: `${(qtd / (stats.perdidas || 1)) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 opacity-20">
                <XCircle size={48} />
                <p className="text-xs font-bold uppercase mt-2">Sem perdas registradas</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[32px]">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-500" /> Vendas por Mês
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMeses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900}} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0))}
                />
                <Bar dataKey="valor" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RANKING DE PARCEIROS */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 text-indigo-600">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Produção por Parceiros</h3>
            <p className="text-xs font-bold text-slate-400">Ranking baseado no volume financeiro vendido</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(stats.vendasPorParceiro).length > 0 ? (
            Object.entries(stats.vendasPorParceiro)
              .sort((a,b) => b[1].valor - a[1].valor)
              .map(([id, data]) => (
                <div key={id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 uppercase">
                      {data.qtd} Vendas
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
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase text-xs italic">Nenhuma produção vinculada a parceiros neste período.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val, money, color, icon }: any) {
  const colorMap: any = {
    indigo: 'bg-indigo-500 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-500 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
      <div className={`w-10 h-10 ${colorMap[color].split(' ')[0]} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
        {icon}
      </div>
      <p className="text-[12px] font-black uppercase text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800">{val || 0}</p>
      <p className={`text-[13px] font-bold mt-1 ${colorMap[color].split(' ')[1]}`}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(money || 0)}
      </p>
      <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );
}