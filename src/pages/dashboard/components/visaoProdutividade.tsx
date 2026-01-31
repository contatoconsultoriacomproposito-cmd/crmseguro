import { useMemo, useState, useEffect } from 'react';
import { 
  MessageCircle, Phone, Mail, Monitor, 
  MapPin, TrendingUp, UserCheck, Users, Calendar, Filter, Loader2
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoProdutividadeProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
}

export default function VisaoProdutividade({ 
  corretoraId, 
  corretoresLista 
}: VisaoProdutividadeProps) {

  const [loading, setLoading] = useState(true);
  const [interacoesLocais, setInteracoesLocais] = useState<any[]>([]);
  
  // Estados para limites de data do banco
  const [limitesData, setLimitesData] = useState({ min: '', max: '' });

  // 1. FILTROS
  const [dataInicio, setDataInicio] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 2. BUSCA LIMITES DE DATAS (Padrão das outras visões)
  useEffect(() => {
    async function fetchLimites() {
      if (!corretoraId) return;
      const { data } = await supabase
        .from('tab_interacoes')
        .select('data_historico')
        .eq('corretora_id', corretoraId)
        .order('data_historico', { ascending: true });

      if (data && data.length > 0) {
        setLimitesData({
          min: data[0].data_historico,
          max: data[data.length - 1].data_historico
        });
      }
    }
    fetchLimites();
  }, [corretoraId]);

  // 3. BUSCA DE DADOS PRINCIPAL
  useEffect(() => {
    async function fetchProdutividade() {
      if (!corretoraId) return;
      setLoading(true);
      try {
        let query = supabase
          .from('tab_interacoes') 
          .select(`
            *,
            tab_clientes ( nome )
          `)
          .eq('corretora_id', corretoraId)
          .gte('data_historico', dataInicio)
          .lte('data_historico', dataFim);

        if (corretorLocal !== 'todos') {
          if (corretorLocal === 'casa') {
            query = query.is('corretor_id', null);
          } else {
            query = query.eq('corretor_id', corretorLocal);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        setInteracoesLocais(data || []);
      } catch (err) {
        console.error("Erro ao carregar Visão Produtividade:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProdutividade();
  }, [dataInicio, dataFim, corretorLocal, corretoraId]);

  // 4. PROCESSAMENTO
  const stats = useMemo(() => {
    const counts = { whatsapp: 0, ligacao: 0, email: 0, reuniaoOn: 0, reuniaoPres: 0, visita: 0, outros: 0 };
    const rankingClientes: Record<string, { nome: string; qtd: number }> = {};
    const evolucaoTemporal: Record<string, number> = {};

    interacoesLocais.forEach(inter => {
      const acao = (inter.tipo_acao || '').toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (acao.includes('whatsapp') || acao.includes('wpp')) counts.whatsapp++;
      else if (acao.includes('ligacao') || acao.includes('fone') || acao.includes('tel')) counts.ligacao++;
      else if (acao.includes('email')) counts.email++;
      else if (acao.includes('online') || acao.includes('meet')) counts.reuniaoOn++;
      else if (acao.includes('presencial')) counts.reuniaoPres++;
      else if (acao.includes('visita')) counts.visita++;
      else counts.outros++;

      const nomeCliente = inter.tab_clientes?.nome || "Cliente não Identificado";
      const cId = inter.cliente_id;
      if (!rankingClientes[cId]) rankingClientes[cId] = { nome: nomeCliente, qtd: 0 };
      rankingClientes[cId].qtd += 1;

      const dataRef = inter.data_historico;
      if (dataRef) evolucaoTemporal[dataRef] = (evolucaoTemporal[dataRef] || 0) + 1;
    });

    return {
      counts,
      topClientes: Object.values(rankingClientes).sort((a, b) => b.qtd - a.qtd).slice(0, 5),
      timeline: Object.entries(evolucaoTemporal).sort().map(([name, total]) => ({ name, total }))
    };
  }, [interacoesLocais]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full">
      
      {/* BARRA DE FILTROS PADRONIZADA */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Filtros:</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dataInicio} 
              min={limitesData.min}
              max={limitesData.max}
              onChange={(e) => setDataInicio(e.target.value)} 
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2 focus:ring-2 focus:ring-indigo-500" 
            />
            <span className="text-slate-300 font-bold text-[10px]">ATÉ</span>
            <input 
              type="date" 
              value={dataFim} 
              min={limitesData.min}
              max={limitesData.max}
              onChange={(e) => setDataFim(e.target.value)} 
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2 focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          {/* INDICADOR DE CONTEXTO AO LADO DAS DATAS */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">
              Filtrando Histórico de Interações
            </span>
          </div>
        </div>

        <select 
          value={corretorLocal} 
          onChange={(e) => setCorretorLocal(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px] outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="todos">Todos os Corretores</option>
          <option value="casa">🏠 Somente a Casa</option>
          {(corretoresLista || []).map(c => (
            <option key={c.id} value={c.id}>👤 {c.nome}</option>
          ))}
        </select>

        {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-auto" />}
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <ActionCard icon={<MessageCircle size={20}/>} label="WhatsApp" val={stats.counts.whatsapp} color="text-emerald-600" bg="bg-emerald-50" />
        <ActionCard icon={<Phone size={20}/>} label="Ligação" val={stats.counts.ligacao} color="text-blue-600" bg="bg-blue-50" />
        <ActionCard icon={<Mail size={20}/>} label="E-mail" val={stats.counts.email} color="text-amber-600" bg="bg-amber-50" />
        <ActionCard icon={<Monitor size={20}/>} label="R. Online" val={stats.counts.reuniaoOn} color="text-indigo-600" bg="bg-indigo-50" />
        <ActionCard icon={<MapPin size={20}/>} label="R. Presencial" val={stats.counts.reuniaoPres} color="text-rose-600" bg="bg-rose-50" />
        <ActionCard icon={<UserCheck size={20}/>} label="Visitas" val={stats.counts.visita} color="text-violet-600" bg="bg-violet-50" />
        <ActionCard icon={<TrendingUp size={20}/>} label="Outros" val={stats.counts.outros} color="text-slate-600" bg="bg-slate-50" />
      </div>

      {/* CONTEÚDO GRÁFICO E RANKING */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[400px]">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-500"/> Volume de Atendimento Diário
          </h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <defs>
                  <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickFormatter={(val) => val.split('-').reverse().slice(0,2).join('/')} 
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  labelFormatter={(lbl) => `Data: ${lbl.split('-').reverse().join('/')}`}
                />
                <Area type="monotone" dataKey="total" name="Ações" stroke="#6366f1" strokeWidth={4} fill="url(#colorIndigo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <Users size={18} className="text-indigo-500"/> Clientes com mais Interações
          </h3>
          <div className="space-y-3">
            {stats.topClientes.length > 0 ? stats.topClientes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 group-hover:bg-indigo-100 group-hover:text-indigo-600 text-slate-600 flex items-center justify-center text-[10px] font-black transition-colors">{idx + 1}º</div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.nome}</span>
                </div>
                <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm group-hover:border-indigo-100 transition-colors">
                   <span className="text-sm font-black text-indigo-600">{item.qtd}</span>
                   <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">Ações</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <TrendingUp size={40} className="mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase italic">Nenhuma interação no período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, label, val, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center space-y-2 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
      <div className={`inline-flex p-2 rounded-xl ${bg} ${color} shadow-sm group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{val}</p>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      </div>
    </div>
  );
}