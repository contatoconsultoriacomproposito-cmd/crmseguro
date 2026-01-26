import { useState, useMemo } from 'react';
import { Users, User, Building2, PieChart as PieIcon, BarChart as BarIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis } from 'recharts';

interface ClienteData {
  id: string;
  corretor_id: string | null; // Corrigido para aceitar null (padrão SQL)
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
  corretorId: string; 
}

export default function VisaoCliente({ dataRaw, dataInicio, dataFim, corretorId }: VisaoClienteProps) {
  const [showPerdaModal, setShowPerdaModal] = useState(false);

  const stats = useMemo(() => {
    // 1. FILTRAGEM SEGURA
    const filtered = (dataRaw || []).filter(c => {
      // Filtro de Data
      const dataCriacao = (c.created_at || '').split(/[ T]/)[0];
      const dentroDoPeriodo = dataCriacao >= dataInicio && dataCriacao <= dataFim;

      // Filtro de Corretor: 
      // Se 'todos', permitimos tudo que veio (pois o Dashboard.tsx já filtrou por idsFiltro no banco)
      // Se for um ID específico, comparamos.
      const filtroCorretor = corretorId === 'todos' || c.corretor_id === corretorId;

      return dentroDoPeriodo && filtroCorretor;
    });

    const counts = { pf: 0, pj: 0, total: filtered.length };
    const origens: Record<string, number> = {};
    const status: Record<string, number> = {};
    const fases: Record<string, number> = {};
    const motivosPerda: Record<string, number> = {};

    filtered.forEach(c => {
      // Normalização exata baseada no enum do banco (tipo_cliente_enum)
      const tipo = String(c.tipo_cliente || '').toUpperCase();
      if (tipo === 'PJ') counts.pj++; else counts.pf++;
      
      const ori = c.origem_cliente || 'Não Informado';
      origens[ori] = (origens[ori] || 0) + 1;

      // Normalização baseada no check constraint do banco (novo, vendido, perdido)
      const st = (c.status_kanban || 'novo').toLowerCase();
      status[st] = (status[st] || 0) + 1;
      
      if (st === 'perdido' && c.motivo_perda) {
        motivosPerda[c.motivo_perda] = (motivosPerda[c.motivo_perda] || 0) + 1;
      }

      const fase = c.fase_kanban || 'Sem Fase';
      fases[fase] = (fases[fase] || 0) + 1;
    });

    return { 
      counts, 
      origens, 
      status, 
      fases, 
      motivosPerda, 
      total: filtered.length,
      chartOrigens: Object.entries(origens).map(([name, value]) => ({ name, value })),
      chartStatus: Object.entries(status).map(([name, value]) => ({ name, value })),
      chartFases: Object.entries(fases).map(([name, value]) => ({ name, value }))
    };
  }, [dataRaw, dataInicio, dataFim, corretorId]);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#64748b'];

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <Users size={14}/> 1. Inteligência de Carteira 
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* COLUNA 1: PERFIL */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center italic">Perfil de Clientes</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
              <div className="flex items-center gap-2 text-indigo-700 font-bold"><User size={16}/> PF</div>
              <span className="text-xl font-black text-indigo-900">{stats.counts.pf}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50">
              <div className="flex items-center gap-2 text-amber-700 font-bold"><Building2 size={16}/> PJ</div>
              <span className="text-xl font-black text-amber-900">{stats.counts.pj}</span>
            </div>
          </div>
        </div>

        {/* COLUNA 2: ORIGENS */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2 italic">
            <PieIcon size={12}/> Origens
          </p>
          <div className="h-48 w-full"> 
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.chartOrigens} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                  {stats.chartOrigens.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" content={({ payload }: any) => (
                  <ul className="text-[8px] font-black uppercase flex flex-wrap justify-center gap-2 mt-2">
                    {payload.map((entry: any, index: number) => (
                      <li key={index} style={{ color: entry.color }}>
                        {entry.value}: {stats.chartOrigens[index]?.value}
                      </li>
                    ))}
                  </ul>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA 3: STATUS KANBAN */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 italic">
              <BarIcon size={12}/> Status
            </p>
            {stats.status['perdido'] > 0 && (
              <button 
                onClick={() => setShowPerdaModal(true)}
                className="text-[8px] bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded-full hover:bg-rose-200 transition-colors"
              >
                MOTIVOS PERDA
              </button>
            )}
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: '900' }}
                  tickFormatter={(val) => val.toUpperCase()}
                />
                <Tooltip cursor={{ fill: '#f1f5f9', radius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={32}>
                  {stats.chartStatus.map((entry, index) => (
                    <Cell 
                      key={`cell-bar-${index}`} 
                      fill={
                        entry.name === 'perdido' ? '#f43f5e' : 
                        entry.name === 'vendido' ? '#10b981' : '#6366f1'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA 4: FASES */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2 italic">
            <Building2 size={12}/> Fases
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.chartFases} outerRadius={60} dataKey="value">
                  {stats.chartFases.map((_, index) => <Cell key={`cell-fase-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" content={({ payload }: any) => (
                  <ul className="text-[8px] font-black uppercase flex flex-wrap justify-center gap-2 mt-2">
                    {payload.map((entry: any, index: number) => (
                      <li key={index} style={{ color: entry.color }}>{entry.value}</li>
                    ))}
                  </ul>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MODAL REVISADO */}
      {showPerdaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><BarIcon size={24}/></div>
              <h3 className="text-xl font-black text-slate-800 uppercase italic">Por que perdemos?</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.motivosPerda).map(([motivo, qtd]) => (
                <div key={motivo} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-black text-slate-500 text-[10px] uppercase tracking-tighter">{motivo}</span>
                  <span className="text-lg font-black text-rose-600">{qtd}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowPerdaModal(false)}
              className="w-full mt-8 bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-xs hover:bg-slate-800 transition-all shadow-lg"
            >
              Fechar Análise
            </button>
          </div>
        </div>
      )}
    </section>
  );
}