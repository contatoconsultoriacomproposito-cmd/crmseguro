import { useMemo, useState, useEffect } from 'react';
import { 
  MessageCircle, Phone, Mail, Monitor, 
  MapPin, TrendingUp, UserCheck, Users, Calendar, Filter, Loader2, User
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

// Interface atualizada para evitar erros no componente pai
interface VisaoProdutividadeProps {
  corretoraId: string; 
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

export default function VisaoProdutividade({ 
  corretoraId, 
  corretoresLista,
  userLevel,
  userId
}: VisaoProdutividadeProps) {

  const [loading, setLoading] = useState(true);
  const [interacoesLocais, setInteracoesLocais] = useState<any[]>([]);
  
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 1. BUSCA DATA INICIAL (Histórico de Interações)
  useEffect(() => {
    async function buscarPrimeiraInteracao() {
      if (!corretoraId) return;
      const { data, error } = await supabase
        .from('tab_interacoes')
        .select('data_historico')
        .eq('corretora_id', corretoraId)
        .order('data_historico', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setDataInicio(data.data_historico);
      } else {
        setDataInicio(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraInteracao();
  }, [corretoraId]);

  // 2. BUSCA DE DADOS COM TRAVA DE SEGURANÇA
  useEffect(() => {
    async function fetchProdutividade() {
      if (!dataInicio || !corretoraId) return;
      
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

        // Lógica de Segurança: Corretor só vê suas próprias interações
        if (userLevel === 'corretor' && userId) {
          query = query.eq('corretor_id', userId);
        } else {
          // Lógica para Admin/Dono
          if (corretorLocal === 'casa') {
            query = query.eq('corretor_id', corretoraId);
          } else if (corretorLocal !== 'todos') {
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
  }, [dataInicio, dataFim, corretorLocal, corretoraId, userId, userLevel]);

  // 3. PROCESSAMENTO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const counts = { whatsapp: 0, ligacao: 0, email: 0, reuniaoOn: 0, reuniaoPres: 0, visita: 0, outros: 0 };
    const rankingClientes: Record<string, { nome: string; qtd: number }> = {};
    const evolucaoTemporal: Record<string, number> = {};

    interacoesLocais.forEach(inter => {
      const acao = (inter.tipo_acao || '').toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (acao.includes('whatsapp') || acao.includes('wpp')) counts.whatsapp++;
      else if (acao.includes('ligacao') || acao.includes('fone') || acao.includes('tel') || acao.includes('chamada')) counts.ligacao++;
      else if (acao.includes('email')) counts.email++;
      else if (acao.includes('online') || acao.includes('meet') || acao.includes('zoom') || acao.includes('video')) counts.reuniaoOn++;
      else if (acao.includes('presencial')) counts.reuniaoPres++;
      else if (acao.includes('visita')) counts.visita++;
      else counts.outros++;

      const nomeCliente = inter.tab_clientes?.nome || "Cliente não Identificado";
      const cId = inter.cliente_id || 'sem-id';
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
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Produtividade:</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
            <input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        </div>

        {/* Só exibe seletor se não for corretor restrito */}
        {userLevel !== 'corretor' && (
          <div className="flex items-center gap-2 px-4 border-l border-slate-100 ml-auto">
            <User size={14} className="text-slate-400" />
            <select 
              value={corretorLocal} 
              onChange={(e) => setCorretorLocal(e.target.value)} 
              className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer focus:text-indigo-600 min-w-[160px]"
            >
              <option value="todos">Todos os Corretores</option>
              <option value="casa">ATENDIMENTO DIRETO (CASA)</option>
              {(corretoresLista || [])
                .filter(c => c.nome.toUpperCase() !== "ATENDIMENTO DIRETO (CASA)")
                .map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))
              }
            </select>
          </div>
        )}

        {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-2" />}
      </div>

      {/* CARDS DE AÇÕES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <ActionCard icon={<MessageCircle size={20}/>} label="WhatsApp" val={stats.counts.whatsapp} color="text-emerald-600" bg="bg-emerald-50" />
        <ActionCard icon={<Phone size={20}/>} label="Ligação" val={stats.counts.ligacao} color="text-blue-600" bg="bg-blue-50" />
        <ActionCard icon={<Mail size={20}/>} label="E-mail" val={stats.counts.email} color="text-amber-600" bg="bg-amber-50" />
        <ActionCard icon={<Monitor size={20}/>} label="R. Online" val={stats.counts.reuniaoOn} color="text-indigo-600" bg="bg-indigo-50" />
        <ActionCard icon={<MapPin size={20}/>} label="R. Presencial" val={stats.counts.reuniaoPres} color="text-rose-600" bg="bg-rose-50" />
        <ActionCard icon={<UserCheck size={20}/>} label="Visitas" val={stats.counts.visita} color="text-violet-600" bg="bg-violet-50" />
        <ActionCard icon={<TrendingUp size={20}/>} label="Outros" val={stats.counts.outros} color="text-slate-600" bg="bg-slate-50" />
      </div>

      {/* GRÁFICO E RANKING */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-8 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-500"/> Volume de Atendimento Diário
          </h3>
          <div className="flex-1 w-full min-h-[300px]">
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
                <Area type="monotone" dataKey="total" name="Ações" stroke="#6366f1" strokeWidth={4} fill="url(#colorIndigo)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-8 flex items-center gap-2">
            <Users size={18} className="text-indigo-500"/> Clientes mais Atendidos
          </h3>
          <div className="space-y-4">
            {stats.topClientes.length > 0 ? stats.topClientes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white text-slate-600 flex items-center justify-center text-[11px] font-black transition-colors border border-slate-100 uppercase italic">
                    {idx + 1}º
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.nome}</span>
                </div>
                <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm group-hover:border-indigo-200 transition-colors">
                    <span className="text-sm font-black text-indigo-600">{item.qtd}</span>
                    <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">Ações</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
                <TrendingUp size={40} className="mb-4" />
                <p className="text-xs font-black uppercase italic tracking-widest">Aguardando dados...</p>
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
    <div className="bg-white p-5 rounded-[32px] border border-slate-100 text-center space-y-2 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 hover:-translate-y-1 group">
      <div className={`inline-flex p-3 rounded-2xl ${bg} ${color} shadow-sm group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{val}</p>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      </div>
    </div>
  );
}