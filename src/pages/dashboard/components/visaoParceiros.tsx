import { useMemo, useState } from 'react';
import { 
  Users, 
  ArrowUpRight, 
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, LabelList 
} from 'recharts';

interface VisaoParceirosProps {
  parceirosRaw: any[];
  indicacoesRaw: any[];
  cotacoesRaw: any[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function VisaoParceiros({ parceirosRaw, indicacoesRaw, cotacoesRaw }: VisaoParceirosProps) {
  const [filtroFeedback, setFiltroFeedback] = useState<string>('TODOS');

  const stats = useMemo(() => {
    // --- 1. PROCESSAMENTO PARCEIROS (Proteção contra nulos) ---
    const baseParceiros = parceirosRaw || [];
    const setores: Record<string, number> = {};
    const tipos: Record<string, number> = {};
    
    baseParceiros.forEach(p => {
      const s = p.setor_parceiro || 'NÃO INFORMADO';
      setores[s] = (setores[s] || 0) + 1;
      
      const t = p.tipo_parceiro || 'OUTROS';
      tipos[t] = (tipos[t] || 0) + 1;
    });

    const dataTipos = Object.entries(tipos).map(([name, value]) => ({ 
      name, 
      value,
      percentage: ((value / (baseParceiros.length || 1)) * 100).toFixed(1)
    }));

    // --- 2. PROCESSAMENTO INDICAÇÕES ---
    const baseIndicacoes = indicacoesRaw || [];
    const statusInd: Record<string, number> = {};
    const motivosPerda: Record<string, number> = {};
    
    baseIndicacoes.forEach(i => {
      const st = (i.status_indicacao || 'NOVO').toUpperCase();
      statusInd[st] = (statusInd[st] || 0) + 1;

      if (st === 'PERDIDO' && i.motivo_perda) {
        motivosPerda[i.motivo_perda] = (motivosPerda[i.motivo_perda] || 0) + 1;
      }
    });

    const dataStatus = Object.entries(statusInd).map(([name, value]) => ({ name, value }));
    const dataMotivos = Object.entries(motivosPerda).map(([name, value]) => ({ 
      name, 
      value,
      percentage: ((value / (statusInd['PERDIDO'] || 1)) * 100).toFixed(1)
    }));

    // --- 3. PROCESSAMENTO COTAÇÕES (Com filtro dinâmico) ---
    const baseCotacoes = cotacoesRaw || [];
    const filteredCotacoes = filtroFeedback === 'TODOS' 
      ? baseCotacoes 
      : baseCotacoes.filter(c => String(c.status_feedback).toUpperCase() === filtroFeedback);

    const seguradoras: Record<string, { nome: string, valor: number, qtd: number }> = {};
    filteredCotacoes.forEach(c => {
      const seg = c.seguradora || 'NÃO INFORMADA';
      if (!seguradoras[seg]) seguradoras[seg] = { nome: seg, valor: 0, qtd: 0 };
      seguradoras[seg].valor += Number(c.valor_premio || 0);
      seguradoras[seg].qtd++;
    });

    return { 
      dataTipos, 
      setores, 
      dataStatus, 
      dataMotivos, 
      dataSeguradoras: Object.values(seguradoras).sort((a, b) => b.valor - a.valor) 
    };
  }, [parceirosRaw, indicacoesRaw, cotacoesRaw, filtroFeedback]);

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <Users size={14}/> 2. Inteligência de Parceiros
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* CONTAINER 1: BASE DE PARCEIROS */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Users size={20} /></div>
            <h3 className="font-black uppercase italic text-slate-800 text-sm">Parceiros Ativos</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {Object.entries(stats.setores).map(([setor, qtd]) => (
              <div key={setor} className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                <span className="block text-xl font-black text-indigo-600 leading-none">{qtd}</span>
                <span className="text-[9px] font-black text-slate-500 uppercase truncate mt-1 block">{setor}</span>
              </div>
            ))}
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.dataTipos} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {stats.dataTipos.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend content={({ payload }: any) => (
                  <ul className="text-[9px] font-black uppercase flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {payload.map((entry: any, index: number) => (
                      <li key={index} style={{ color: entry.color }}>{entry.value}</li>
                    ))}
                  </ul>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CONTAINER 2: FUNIL DE INDICAÇÕES */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp size={20} /></div>
            <h3 className="font-black uppercase italic text-slate-800 text-sm">Funil de Indicações</h3>
          </div>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={stats.dataStatus} margin={{ left: -10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 900 }} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} barSize={16}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-48 pt-4 border-t border-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Análise de Perdas</p>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.dataMotivos} innerRadius={40} outerRadius={60} dataKey="value">
                  {stats.dataMotivos.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={6} wrapperStyle={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CONTAINER 3: PERFORMANCE SEGURADORAS */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><ShieldCheck size={20} /></div>
              <h3 className="font-black uppercase italic text-slate-800 text-sm">Performance</h3>
            </div>
            
            <select 
              className="text-[9px] font-black uppercase border-none bg-slate-100 rounded-xl p-2 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
              value={filtroFeedback}
              onChange={(e) => setFiltroFeedback(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="PENDENTE">PENDENTES</option>
              <option value="APROVADO">APROVADOS</option>
              <option value="RECUSADO">RECUSADOS</option>
            </select>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {stats.dataSeguradoras.length > 0 ? stats.dataSeguradoras.map((seg, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-[24px] border border-slate-100 hover:border-amber-200 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{seg.nome}</span>
                  <span className="text-xs font-bold text-slate-600">{seg.qtd} Cotações</span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-black text-slate-800">
                    {seg.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                  <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-500 uppercase">
                    <ArrowUpRight size={10} /> Em Prêmios
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full opacity-30 py-10">
                <ShieldCheck size={40} className="text-slate-200 mb-2" />
                <p className="text-[10px] uppercase font-black">Nenhum dado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}