import { useMemo } from 'react';
import { 
  MessageCircle, Phone, Mail, Monitor, 
  MapPin, TrendingUp, UserCheck, Users, Calendar
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

interface Interacao {
  id: string;
  cliente_id: string;
  tipo_acao: string;
  data_historico: string;
  corretor_id: string;
  tab_clientes?: {
    nome: string | null;
  };
}

interface VisaoProdutividadeProps {
  interacoesRaw: Interacao[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

export default function VisaoProdutividade({ 
  interacoesRaw, 
  dataInicio, 
  dataFim, 
  corretorId 
}: VisaoProdutividadeProps) {

  const stats = useMemo(() => {
    const counts = { whatsapp: 0, ligacao: 0, email: 0, reuniaoOn: 0, reuniaoPres: 0, visita: 0, outros: 0 };
    const rankingClientes: Record<string, { nome: string; qtd: number }> = {};
    const evolucaoTemporal: Record<string, number> = {};

    interacoesRaw.forEach(inter => {
      const dataInter = inter.data_historico;
      const dentroPeriodo = dataInter >= dataInicio && dataInter <= dataFim;
      const filtroCorretor = corretorId === 'todos' || inter.corretor_id === corretorId;

      if (dentroPeriodo && filtroCorretor) {
        // 1. Contagem de Ações
        const acao = (inter.tipo_acao || '').toUpperCase();
        if (acao.includes('WHATSAPP')) counts.whatsapp++;
        else if (acao.includes('LIGAÇÃO') || acao.includes('TELEFONE')) counts.ligacao++;
        else if (acao.includes('EMAIL')) counts.email++;
        else if (acao.includes('ONLINE')) counts.reuniaoOn++;
        else if (acao.includes('PRESENCIAL')) counts.reuniaoPres++;
        else if (acao.includes('VISITA')) counts.visita++;
        else counts.outros++;

        // 2. Ranking de Clientes (Simplificado)
        const nomeCliente = inter.tab_clientes?.nome || "NOME NÃO INFORMADO";
        
        if (!rankingClientes[inter.cliente_id]) {
          rankingClientes[inter.cliente_id] = { nome: nomeCliente, qtd: 0 };
        }
        rankingClientes[inter.cliente_id].qtd += 1;

        // 3. Evolução Mensal
        const mesAno = dataInter.substring(0, 7); 
        evolucaoTemporal[mesAno] = (evolucaoTemporal[mesAno] || 0) + 1;
      }
    });

    return {
      counts,
      topClientes: Object.values(rankingClientes)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5),
      timeline: Object.entries(evolucaoTemporal)
        .sort()
        .map(([name, total]) => ({ name, total }))
    };
  }, [interacoesRaw, dataInicio, dataFim, corretorId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* CARDS DE AÇÃO */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <ActionCard icon={<MessageCircle size={20}/>} label="WhatsApp" val={stats.counts.whatsapp} color="text-emerald-600" bg="bg-emerald-50" />
        <ActionCard icon={<Phone size={20}/>} label="Ligação" val={stats.counts.ligacao} color="text-blue-600" bg="bg-blue-50" />
        <ActionCard icon={<Mail size={20}/>} label="E-mail" val={stats.counts.email} color="text-amber-600" bg="bg-amber-50" />
        <ActionCard icon={<Monitor size={20}/>} label="R. Online" val={stats.counts.reuniaoOn} color="text-indigo-600" bg="bg-indigo-50" />
        <ActionCard icon={<MapPin size={20}/>} label="R. Presencial" val={stats.counts.reuniaoPres} color="text-rose-600" bg="bg-rose-50" />
        <ActionCard icon={<UserCheck size={20}/>} label="Visitas" val={stats.counts.visita} color="text-violet-600" bg="bg-violet-50" />
        <ActionCard icon={<TrendingUp size={20}/>} label="Outros" val={stats.counts.outros} color="text-slate-600" bg="bg-slate-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* GRÁFICO */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-500"/> Intensidade de Ações
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} 
                  axisLine={false} 
                  tickFormatter={(val) => val.split('-').reverse().join('/')}
                />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fill="#6366f120" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RANKING SIMPLIFICADO */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <Users size={18} className="text-indigo-500"/> Ranking de Atendimento
          </h3>
          <div className="space-y-3">
            {stats.topClientes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                    {idx + 1}º
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase truncate max-w-[200px]">
                    {item.nome}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-800 block">{item.qtd}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Ações</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function ActionCard({ icon, label, val, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center space-y-2">
      <div className={`inline-flex p-2 rounded-xl ${bg} ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-800 leading-none">{val}</p>
        <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}