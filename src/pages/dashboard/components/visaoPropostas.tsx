import React, { useMemo } from 'react';
import { 
  FileText, ShieldCheck, XCircle, TrendingUp, 
  Target, Users, 
  CalendarDays, Wallet
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, CartesianGrid, Legend
} from 'recharts';

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
  tab_parceiros?: { nome: string }; // Join vindo do Supabase/Backend
}

interface VisaoPropostasProps {
  propostasRaw: PropostaData[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function VisaoPropostas({ propostasRaw, dataInicio, dataFim, corretorId }: VisaoPropostasProps) {
  
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

    const dataFiltrada = (propostasRaw || []).filter(p => 
      corretorId === 'todos' || p.corretor_id === corretorId
    );

    dataFiltrada.forEach(p => {
      const valor = Number(p.valor_total_proposta || 0);
      const status = (p.status || 'Em Negociação');
      const dEmissao = (p.data_emissao || p.created_at || '').split(/[ T]/)[0];
      const dVenda = (p.data_venda || '').split(/[ T]/)[0];
      const dUpdate = (p.updated_at || p.created_at || '').split(/[ T]/)[0];

      // 1. GERAL (Baseado na Emissão dentro do período)
      if (dEmissao >= dataInicio && dEmissao <= dataFim) {
        acc.total++;
        acc.vlrCriado += valor;
        acc.statusCount[status] = (acc.statusCount[status] || 0) + 1;
      }

      // 2. VENDIDAS
      if (status.toLowerCase() === 'vendido') {
        const dataRefVenda = dVenda || dEmissao;
        if (dataRefVenda >= dataInicio && dataRefVenda <= dataFim) {
          acc.vendidas++;
          acc.vlrVendido += valor;

          // Agrupamento Mensal (Vendas)
          const mesAno = dataRefVenda.substring(0, 7); // YYYY-MM
          if (!acc.vendasPorMes[mesAno]) acc.vendasPorMes[mesAno] = { qtd: 0, valor: 0 };
          acc.vendasPorMes[mesAno].qtd++;
          acc.vendasPorMes[mesAno].valor += valor;

          // Vendas por Parceiro
          if (p.parceiro_id) {
            const nomeParceiro = p.tab_parceiros?.nome || 'Parceiro não Identificado';
            if (!acc.vendasPorParceiro[p.parceiro_id]) {
              acc.vendasPorParceiro[p.parceiro_id] = { nome: nomeParceiro, qtd: 0, valor: 0 };
            }
            acc.vendasPorParceiro[p.parceiro_id].qtd++;
            acc.vendasPorParceiro[p.parceiro_id].valor += valor;
          }
        }
      }

      // 3. PERDIDAS
      if (status.toLowerCase() === 'perdido') {
        if (dUpdate >= dataInicio && dUpdate <= dataFim) {
          acc.perdidas++;
          acc.vlrPerdido += valor;
          const motivo = p.motivo_perda || 'Não informado';
          acc.motivosPerda[motivo] = (acc.motivosPerda[motivo] || 0) + 1;
        }
      }
    });

    const ticketMedio = acc.vendidas > 0 ? acc.vlrVendido / acc.vendidas : 0;
    const conversao = acc.total > 0 ? (acc.vendidas / acc.total) * 100 : 0;

    return { ...acc, ticketMedio, conversao };
  }, [propostasRaw, dataInicio, dataFim, corretorId]);

  // Formatação para Gráficos
  const chartStatus = Object.entries(stats.statusCount).map(([name, value]) => ({ name, value }));
  const chartMeses = Object.entries(stats.vendasPorMes)
    .sort()
    .map(([name, data]) => ({ name, valor: data.valor, qtd: data.qtd }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. CARDS DE PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Propostas Criadas" 
          val={stats.total} 
          money={stats.vlrCriado} 
          color="indigo" 
          icon={<FileText size={20}/>}
        />
        <StatCard 
          label="Vendas Realizadas" 
          val={stats.vendidas} 
          money={stats.vlrVendido} 
          color="emerald" 
          icon={<ShieldCheck size={20}/>}
        />
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[12px] font-black uppercase text-slate-400 mb-1">Ticket Médio (Vendas)</p>
          <p className="text-3xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.ticketMedio)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-emerald-600">
            <TrendingUp size={14}/>
            <span className="text-[11px] font-bold uppercase">Base: {stats.vendidas} vendas</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[12px] font-black uppercase text-slate-400 mb-1">Taxa de Conversão</p>
          <p className="text-4xl font-black text-slate-800">{stats.conversao.toFixed(1)}%</p>
          <div className="w-full h-1.5 bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(stats.conversao, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 2. STATUS E MOTIVOS DE PERDA */}
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
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900' }} />
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
                <div key={motivo} className="group">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-black text-slate-600 uppercase">{motivo}</span>
                    <span className="text-xs font-black text-rose-500">{qtd}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-400 h-full" style={{ width: `${(qtd / (stats.perdidas || 1)) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 text-xs py-20 font-bold uppercase italic">Sem perdas registradas</p>
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
                  formatter={(val: any) => 
                    new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(Number(val || 0))
                  }
                />
                <Bar dataKey="valor" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. VENDAS POR PARCEIRO */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Vendas por Parceiros</h3>
            <p className="text-xs font-bold text-slate-400">Ranking de produção por origem de indicação</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(stats.vendasPorParceiro).length > 0 ? (
            Object.entries(stats.vendasPorParceiro)
              .sort((a,b) => b[1].valor - a[1].valor)
              .map(([id, data]) => (
                <div key={id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 uppercase">
                      {data.qtd} Vendas
                    </span>
                    <Wallet size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase truncate mb-1">{data.nome}</p>
                    <p className="text-xl font-black text-slate-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor)}
                    </p>
                  </div>
                </div>
              ))
          ) : (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase text-xs italic">Nenhuma venda vinculada a parceiro no período</p>
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
    rose: 'bg-rose-500 text-rose-600 border-rose-100'
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
      <div className={`w-10 h-10 ${colorMap[color].split(' ')[0]} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-${color}-200`}>
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