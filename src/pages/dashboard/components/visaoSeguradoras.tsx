import { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, Award, Filter, Loader2, Target, AlertCircle, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoSeguradorasProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function VisaoSeguradoras({ 
  corretoraId, 
  corretoresLista, 
  userLevel, 
  userId 
}: VisaoSeguradorasProps) {
  
  const [loading, setLoading] = useState(true);
  const [propostasLocais, setPropostasLocais] = useState<any[]>([]);

  // 1. ESTADOS DE FILTRO
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  // TRAVA DE SEGURANÇA: Inicializa com o userId se for corretor
  const [corretorLocal, setCorretorLocal] = useState(userLevel?.toUpperCase() === 'CORRETOR' ? userId : 'todos');
  const [statusFiltro, setStatusFiltro] = useState<string[]>(['Vendido']); // Padrão focado em vendas

  // Reforço da Trava de Visão via Effect
  useEffect(() => {
    if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
      setCorretorLocal(userId);
    }
  }, [userId, userLevel]);

  // 2. BUSCA DATA INICIAL
  useEffect(() => {
    async function buscarPrimeiraData() {
      if (!corretoraId) return;
      const { data } = await supabase
        .from('tab_propostas')
        .select('created_at')
        .eq('corretora_id', corretoraId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setDataInicio(data.created_at.split('T')[0]);
      } else {
        setDataInicio(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraData();
  }, [corretoraId]);

  // 3. BUSCA DE DADOS (COM TRAVA E FILTROS DE STATUS)
  useEffect(() => {
    async function fetchDados() {
      if (!corretoraId || !dataInicio) return;
      
      const filtroCorretorFinal = userLevel?.toUpperCase() === 'CORRETOR' ? userId : corretorLocal;
      
      setLoading(true);
      try {
        let query = supabase
          .from('tab_propostas')
          .select(`
            *,
            tab_proposta_opcoes (
              *,
              base_seguradoras (nome),
              tab_proposta_itens (
                *,
                base_produtos (nome)
              )
            )
          `)
          .eq('corretora_id', corretoraId)
          .gte('created_at', `${dataInicio}T00:00:00`)
          .lte('created_at', `${dataFim}T23:59:59`);

        // Filtro de Corretor
        if (filtroCorretorFinal === 'casa') {
          query = query.is('corretor_id', null);
        } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
          query = query.eq('corretor_id', filtroCorretorFinal);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPropostasLocais(data || []);
      } catch (err) {
        console.error("Erro Visão Seguradoras:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDados();
  }, [dataInicio, dataFim, corretorLocal, corretoraId, userId, userLevel]);

  // 4. PROCESSAMENTO DINÂMICO (RESPEITANDO STATUS SELECIONADOS)
  const stats = useMemo(() => {
    const resumoSeg: Record<string, any> = {};

    // Filtra propostas pelo status antes de processar
    const propostasFiltradas = propostasLocais.filter(p => 
      statusFiltro.includes(p.status || 'Em Negociação')
    );

    propostasFiltradas.forEach(p => {
      p.tab_proposta_opcoes?.forEach((opcao: any) => {
        const nomeSeg = opcao.base_seguradoras?.nome || 'NÃO INFORMADA';
        const valorOpcao = Number(opcao.valor_total_opcao || 0);

        if (!resumoSeg[nomeSeg]) {
          resumoSeg[nomeSeg] = { 
            nome: nomeSeg, 
            qtd: 0, 
            valor: 0, 
            produtos: {} as Record<string, {qtd: number, valor: number}> 
          };
        }
        resumoSeg[nomeSeg].qtd++;
        resumoSeg[nomeSeg].valor += valorOpcao;

        opcao.tab_proposta_itens?.forEach((item: any) => {
          const nomeProd = item.base_produtos?.nome || 'OUTROS';
          const valorPremio = Number(item.valor_premio || 0);

          if (!resumoSeg[nomeSeg].produtos[nomeProd]) {
            resumoSeg[nomeSeg].produtos[nomeProd] = { qtd: 0, valor: 0 };
          }
          resumoSeg[nomeSeg].produtos[nomeProd].qtd++;
          resumoSeg[nomeSeg].produtos[nomeProd].valor += valorPremio;
        });
      });
    });

    const listaOrdenada = Object.values(resumoSeg).sort((a: any, b: any) => b.valor - a.valor);
    const totalGeral = listaOrdenada.reduce((acc, curr) => acc + curr.valor, 0);

    return {
      seguradoras: listaOrdenada,
      totalGeral,
      chartData: listaOrdenada.map(s => ({ name: s.nome, value: s.valor }))
    };
  }, [propostasLocais, statusFiltro]);

  const toggleStatus = (s: string) => {
    setStatusFiltro(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* FILTROS PADRONIZADOS */}
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
            <span className="text-slate-300 font-bold text-[10px]">ATÉ</span>
            <input 
              type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
            />
          </div>

          <select 
            value={corretorLocal} 
            onChange={(e) => setCorretorLocal(e.target.value)}
            disabled={userLevel?.toUpperCase() === 'CORRETOR'}
            className="ml-auto bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px] disabled:opacity-50"
          >
            {userLevel?.toUpperCase() !== 'CORRETOR' && (
              <>
                <option value="todos">Todos os Corretores</option>
                <option value="casa">ATENDIMENTO DIRETO (CORRETORA)</option>
              </>
            )}
            {corretoresLista
              .filter(c => c.nome.toUpperCase() !== "ATENDIMENTO DIRETO (CORRETORA)")
              .map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))
            }
          </select>
        </div>

        {/* FILTRO DE STATUS (A MIOPIA ACABOU AQUI) */}
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
              <st.icon size={14} />
              {st.id}
            </button>
          ))}
          {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-auto" />}
        </div>
      </div>

      {/* MARKET SHARE E TOTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h2 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500"/> Share por Volume
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.chartData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {stats.chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-indigo-600 p-8 rounded-[32px] text-white flex flex-col justify-center relative overflow-hidden shadow-xl shadow-indigo-100">
          <Award size={180} className="absolute -right-10 -bottom-10 opacity-10 rotate-12" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-[0.2em] mb-2">Produção no Período Selecionado</p>
            <h1 className="text-5xl font-black mb-4 transition-all">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalGeral)}
            </h1>
            <div className="flex gap-6">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-indigo-100 uppercase">Líder do Filtro</p>
                <p className="text-sm font-black uppercase italic">{stats.seguradoras[0]?.nome || '---'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-indigo-100 uppercase">Companhias com Dados</p>
                <p className="text-sm font-black">{stats.seguradoras.length} Parceiras</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMANCE POR COMPANHIA */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} className="text-indigo-500"/> Performance por Companhia
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.seguradoras.map((seg: any, idx) => (
            <div key={idx} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:border-indigo-100 transition-colors group">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{seg.nome}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{seg.qtd} Propostas no Status</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seg.valor)}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Volume Financeiro</p>
                </div>
              </div>

              <div className="p-6 space-y-3 bg-white">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Mix de Produtos</p>
                {Object.entries(seg.produtos).map(([prodNome, data]: any) => (
                  <div key={prodNome} className="flex items-center justify-between group/line">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span className="text-xs font-bold text-slate-600 uppercase">{prodNome}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{data.qtd} un.</span>
                      <span className="text-xs font-black text-slate-700 w-24 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(data.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEEDBACK VAZIO */}
      {!loading && stats.seguradoras.length === 0 && (
        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
          <ShieldCheck size={32} className="text-slate-200 mb-2" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest text-center px-4">
            Nenhum dado encontrado para os filtros de status aplicados.
          </p>
        </div>
      )}
    </div>
  );
}