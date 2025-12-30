import { useState } from 'react';
import { Users, User, Building2, PieChart as PieIcon, BarChart as BarIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis } from 'recharts';

// Interfaces para resolver os erros de Tipagem
interface ClienteData {
  id: string;
  tipo_cliente: string;
  origem_cliente?: string;
  status_kanban?: string;
  motivo_perda?: string;
  fase_kanban?: string;
  created_at: string;
}

interface VisaoClienteProps {
  dataRaw: ClienteData[];
  dataInicio: string;
  dataFim: string;
}

export default function VisaoCliente({ dataRaw, dataInicio, dataFim }: VisaoClienteProps) {
  const [showPerdaModal, setShowPerdaModal] = useState(false);

  const stats = (() => {
    const filtered = dataRaw.filter(c => {
      const d = (c.created_at || '').split(/[ T]/)[0];
      return d >= dataInicio && d <= dataFim;
    });

    const counts = { pf: 0, pj: 0, total: filtered.length };
    const origens: Record<string, number> = {};
    const status: Record<string, number> = {};
    const fases: Record<string, number> = {};
    const motivosPerda: Record<string, number> = {};

    filtered.forEach(c => {
      if (String(c.tipo_cliente).toUpperCase() === 'PF') counts.pf++; else counts.pj++;
      
      const ori = c.origem_cliente || 'Não Informado';
      origens[ori] = (origens[ori] || 0) + 1;

      const st = c.status_kanban || 'lead';
      status[st] = (status[st] || 0) + 1;
      if (st === 'perdido' && c.motivo_perda) {
        motivosPerda[c.motivo_perda] = (motivosPerda[c.motivo_perda] || 0) + 1;
      }

      const fase = c.fase_kanban || 'Sem Fase';
      fases[fase] = (fases[fase] || 0) + 1;
    });

    return { counts, origens, status, fases, motivosPerda, total: filtered.length };
  })();

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#64748b'];

  const chartOrigens = Object.entries(stats.origens).map(([name, value]) => ({ name, value }));
  const chartStatus = Object.entries(stats.status).map(([name, value]) => ({ name, value }));
  const chartFases = Object.entries(stats.fases).map(([name, value]) => ({ name, value }));

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <Users size={14}/> 1. Inteligência de Carteira (tab_clientes)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* COLUNA 1: PF vs PJ */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center">Perfil de Clientes</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl">
              <div className="flex items-center gap-2 text-blue-700 font-bold"><User size={16}/> PF</div>
              <span className="text-xl font-black">{stats.counts.pf}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-2xl">
              <div className="flex items-center gap-2 text-orange-700 font-bold"><Building2 size={16}/> PJ</div>
              <span className="text-xl font-black">{stats.counts.pj}</span>
            </div>
          </div>
        </div>

        {/* COLUNA 2: Origens (Pizza) - CORRIGIDO */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
            <PieIcon size={12}/> Origens de Clientes
          </p>
          {/* Substituído className="h-48" por style fixo */}
          <div style={{ width: '100%', height: 192 }}> 
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartOrigens} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                  {chartOrigens.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} formatter={(value: string, entry: any) => {
                  const val = entry.payload.value;
                  const pct = stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) : "0";
                  return <span className="text-[9px] font-bold text-slate-600 uppercase">{value} ({val} | {pct}%)</span>
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA 3: Status Kanban - CORRIGIDO */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
              <BarIcon size={12}/> Status Kanban
            </p>
            {stats.status['perdido'] > 0 && (
              <button 
                onClick={() => setShowPerdaModal(true)}
                className="text-[9px] bg-rose-50 text-rose-600 font-black px-2 py-1 rounded-lg border border-rose-100"
              >
                VER PERDAS
              </button>
            )}
          </div>
          {/* Substituído className="h-48" por style fixo */}
          <div style={{ width: '100%', height: 192 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatus} margin={{ top: 20, right: 30, left: 30, bottom: 20 }} barCategoryGap="30%">
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                  interval={0}
                  dy={10}
                  tickFormatter={(value) => value.toUpperCase()}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
                  {chartStatus.map((entry, index) => (
                    <Cell 
                      key={`cell-bar-${index}`} 
                      fill={
                        entry.name.toLowerCase() === 'perdido' ? '#f43f5e' : 
                        entry.name.toLowerCase() === 'vendido' ? '#10b981' : 
                        '#6366f1'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA 4: Fases Kanban (Pizza) - CORRIGIDO */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
            <Building2 size={12}/> Distribuição por Fases
          </p>
          {/* Substituído className="h-48" por style fixo */}
          <div style={{ width: '100%', height: 192 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartFases} outerRadius={60} dataKey="value">
                  {chartFases.map((_, index) => <Cell key={`cell-fase-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} formatter={(value: string, entry: any) => {
                   const val = entry.payload.value;
                   const pct = stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) : "0";
                   return <span className="text-[9px] font-bold text-slate-600">{value}: {val} ({pct}%)</span>
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* POPUP MOTIVOS DE PERDA (Modal) */}
      {showPerdaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 uppercase italic mb-6">Análise de Perdas</h3>
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {Object.entries(stats.motivosPerda).length > 0 ? (
                Object.entries(stats.motivosPerda).map(([motivo, qtd]) => (
                  <div key={motivo} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="font-bold text-slate-600 text-xs uppercase">{motivo}</span>
                    <span className="bg-white px-3 py-1 rounded-xl border border-slate-200 font-black text-indigo-600">{qtd}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 font-bold py-4">Nenhum motivo registrado.</p>
              )}
            </div>
            <button 
              onClick={() => setShowPerdaModal(false)}
              className="w-full mt-8 bg-slate-800 text-white font-black py-4 rounded-2xl uppercase hover:bg-slate-700 transition-all"
            >
              Fechar Análise
            </button>
          </div>
        </div>
      )}
    </section>
  );
}