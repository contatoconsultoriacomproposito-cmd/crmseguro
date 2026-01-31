import { useMemo } from 'react';
import { 
  Crown, 
  Handshake, 
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface Parceiro {
  id: string;
  nome_parceiro: string;
  tipo_parceiro: 'INTERNO' | 'EXTERNO';
  setor_parceiro: string;
  status_parceiro: string;
}

interface VisaoParceirosProps {
  parceirosRaw: Parceiro[];
  indicacoesRaw: any[];
  cotacoesRaw: any[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function VisaoParceiros({ 
  parceirosRaw = [], 
  indicacoesRaw = [], 
  cotacoesRaw = [] 
}: VisaoParceirosProps) {

  const stats = useMemo(() => {
    // 1. Contagem de Tipos (Interno vs Externo)
    const tipos = { INTERNO: 0, EXTERNO: 0 };
    parceirosRaw.forEach(p => {
      const t = (p.tipo_parceiro || 'EXTERNO').toUpperCase();
      if (t === 'INTERNO') tipos.INTERNO++;
      else tipos.EXTERNO++;
    });

    const dataTipos = [
      { name: 'Internos', value: tipos.INTERNO },
      { name: 'Externos', value: tipos.EXTERNO }
    ];

    // 2. Performance por Parceiro (Baseado em cotacoesRaw)
    const performance: Record<string, { nome: string, total: number, vendido: number, qtd: number }> = {};
    
    // Inicializa com os parceiros da base
    parceirosRaw.forEach(p => {
      performance[p.id] = { nome: p.nome_parceiro, total: 0, vendido: 0, qtd: 0 };
    });

    // Processa as cotações/propostas para medir o valor financeiro
    cotacoesRaw.forEach(cot => {
      if (cot.parceiro_id && performance[cot.parceiro_id]) {
        const valor = Number(cot.valor_total_proposta || cot.valor_premio || 0);
        performance[cot.parceiro_id].total += valor;
        performance[cot.parceiro_id].qtd++;
        
        const status = (cot.status || '').toLowerCase();
        if (status.includes('vendido') || status.includes('fechado') || status.includes('emitido')) {
          performance[cot.parceiro_id].vendido += valor;
        }
      }
    });

    const ranking = Object.values(performance)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // 3. Distribuição por Setor
    const setoresMap: Record<string, number> = {};
    parceirosRaw.forEach(p => {
      const s = p.setor_parceiro || 'Não Informado';
      setoresMap[s] = (setoresMap[s] || 0) + 1;
    });

    const dataSetores = Object.entries(setoresMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { dataTipos, ranking, dataSetores, totalParceiros: parceirosRaw.length };
  }, [parceirosRaw, indicacoesRaw, cotacoesRaw]);

  return (
    <section className="space-y-6 animate-in fade-in duration-700 pb-10">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
            <Handshake size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ecosystem de Parceiros</h2>
            <p className="text-xs font-bold text-slate-400">Gestão de indicações e origens de negócio</p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Total na Base</span>
          <span className="text-xl font-black text-indigo-600">{stats.totalParceiros}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* CARD 1: PERFIL DA REDE */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon size={18} className="text-indigo-500" />
            <h3 className="text-sm font-black uppercase text-slate-600 tracking-wider">Perfil da Rede</h3>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.dataTipos} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {stats.dataTipos.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {stats.dataTipos.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase">{item.name}</p>
                <p className="text-lg font-black text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 2: RANKING DE PERFORMANCE */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              <h3 className="text-sm font-black uppercase text-slate-600 tracking-wider">Top Parceiros (Volume Financeiro)</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.ranking.length > 0 ? stats.ranking.map((p, idx) => (
              <div key={idx} className="relative group p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shadow-md shadow-indigo-100">
                      {idx + 1}º
                    </span>
                    <span className="text-[11px] font-black text-slate-700 uppercase italic truncate max-w-[140px]">{p.nome}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Qtd</span>
                    <p className="text-xs font-black text-slate-800 leading-none">{p.qtd}</p>
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-end">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Vendas: <span className="text-emerald-600 font-black">
                        {p.vendido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span></span>
                   </div>
                   <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000" 
                        style={{ width: `${(p.vendido / (p.total || 1)) * 100}%` }}
                      />
                   </div>
                   <p className="text-[9px] font-black text-slate-400 text-right uppercase">Total: {p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            )) : (
              <div className="col-span-2 h-48 flex items-center justify-center text-slate-300 uppercase text-[10px] font-black tracking-widest">Aguardando dados...</div>
            )}
          </div>
        </div>

        {/* CARD 3: SETORES QUE MAIS INDICAM */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm xl:col-span-3">
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 size={18} className="text-emerald-500" />
            <h3 className="text-sm font-black uppercase text-slate-600 tracking-wider">Origem por Setor de Atuação</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dataSetores} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40}>
                   {stats.dataSetores.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}