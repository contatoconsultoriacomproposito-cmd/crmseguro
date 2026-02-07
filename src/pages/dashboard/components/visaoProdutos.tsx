import { useMemo, useState, useEffect } from 'react';
import { 
  Briefcase, RefreshCw, TrendingUp, Filter, 
  Loader2, BarChart3, Target, XCircle, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoProdutosProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function VisaoProdutos({ 
  corretoraId, 
  corretoresLista, 
  userLevel, 
  userId 
}: VisaoProdutosProps) {
  
  const [loading, setLoading] = useState(true);
  const [propostasLocais, setPropostasLocais] = useState<any[]>([]);

  // 1. ESTADOS DE FILTRO
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  // CORREÇÃO: Inicializa com o userId se for corretor, caso contrário 'todos'
  const [corretorLocal, setCorretorLocal] = useState(userLevel === 'CORRETOR' ? userId : 'todos');
  const [statusFiltro, setStatusFiltro] = useState<string[]>(['Vendido', 'Em Negociação', 'Perdido']);

  // Reforço da Trava de Visão
  useEffect(() => {
    if (userLevel === 'CORRETOR' && userId) {
      setCorretorLocal(userId);
    }
  }, [userId, userLevel]);

  // Busca data inicial
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

  // 3. BUSCA DE DADOS
  useEffect(() => {
    async function fetchDadosProdutos() {
      if (!corretoraId || !dataInicio) return;
      
      // Se for corretor, ele só pode ver os dele, sem exceção
      const filtroCorretorFinal = userLevel === 'CORRETOR' ? userId : corretorLocal;
      
      setLoading(true);
      try {
        let query = supabase
          .from('tab_propostas')
          .select(`
            *,
            tab_proposta_opcoes (
              *,
              tab_proposta_itens (
                *,
                base_produtos (nome)
              )
            )
          `)
          .eq('corretora_id', corretoraId)
          .gte('created_at', dataInicio)
          .lte('created_at', `${dataFim}T23:59:59`);

        // Aplicação do Filtro de Corretor
        if (filtroCorretorFinal === 'casa') {
          query = query.is('corretor_id', null);
        } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
          query = query.eq('corretor_id', filtroCorretorFinal);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPropostasLocais(data || []);
      } catch (err) {
        console.error("Erro Visão Produtos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDadosProdutos();
  }, [dataInicio, dataFim, corretorLocal, corretoraId, userId, userLevel]);

  // 4. PROCESSAMENTO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const acc = {
      produtos: {} as Record<string, any>,
      historicoMes: {} as Record<string, { Vendido: number; Perdido: number; EmNegociacao: number; total: number }>,
      pagamentos: {} as Record<string, number>,
      periodicidade: {} as Record<string, number>,
      statusRenovacao: {} as Record<string, number>,
      renovacoesFuturas: {} as Record<string, { qtd: number; valor: number }>,
    };

    propostasLocais.forEach(p => {
      const statusComp = (p.status || 'Em Negociação').trim();
      const dataRef = (p.created_at || '').substring(0, 7);

      if (!acc.historicoMes[dataRef]) {
        acc.historicoMes[dataRef] = { Vendido: 0, Perdido: 0, EmNegociacao: 0, total: 0 };
      }

      p.tab_proposta_opcoes?.forEach((opcao: any) => {
        opcao.tab_proposta_itens?.forEach((item: any) => {
          const valorItem = Number(item.valor_premio || 0);
          const nomeProd = item.base_produtos?.nome || 'OUTROS';
          
          if (!acc.produtos[nomeProd]) {
            acc.produtos[nomeProd] = { 
              nome: nomeProd, 
              qtdVendido: 0, vlrVendido: 0,
              qtdPerdido: 0, vlrPerdido: 0,
              qtdNegocio: 0, vlrNegocio: 0,
              totalGeral: 0 
            };
          }

          acc.produtos[nomeProd].totalGeral++;

          if (statusComp === 'Vendido') {
            acc.produtos[nomeProd].qtdVendido++;
            acc.produtos[nomeProd].vlrVendido += valorItem;
            acc.historicoMes[dataRef].Vendido += valorItem;
            
            const mp = item.meio_pagamento || 'NÃO INFORMADO';
            acc.pagamentos[mp] = (acc.pagamentos[mp] || 0) + 1;
            const perio = item.periodicidade || 'ANUAL';
            acc.periodicidade[perio] = (acc.periodicidade[perio] || 0) + 1;
            const stRenov = item.status_renovacao || 'PENDENTE';
            acc.statusRenovacao[stRenov] = (acc.statusRenovacao[stRenov] || 0) + 1;

            if (item.data_fim_vigencia) {
              const mesFim = item.data_fim_vigencia.substring(0, 7);
              if (!acc.renovacoesFuturas[mesFim]) acc.renovacoesFuturas[mesFim] = { qtd: 0, valor: 0 };
              acc.renovacoesFuturas[mesFim].qtd++;
              acc.renovacoesFuturas[mesFim].valor += valorItem;
            }
          } else if (statusComp === 'Perdido') {
            acc.produtos[nomeProd].qtdPerdido++;
            acc.produtos[nomeProd].vlrPerdido += valorItem;
            acc.historicoMes[dataRef].Perdido += valorItem;
          } else {
            acc.produtos[nomeProd].qtdNegocio++;
            acc.produtos[nomeProd].vlrNegocio += valorItem;
            acc.historicoMes[dataRef].EmNegociacao += valorItem;
          }
        });
      });
    });

    const mesAtual = new Date().toISOString().substring(0, 7);

    const rankingFiltrado = Object.values(acc.produtos)
      .map(p => {
        let valorExibicao = 0;
        let qtdExibicao = 0;

        if (statusFiltro.includes('Vendido')) {
          valorExibicao += p.vlrVendido;
          qtdExibicao += p.qtdVendido;
        }
        if (statusFiltro.includes('Em Negociação')) {
          valorExibicao += p.vlrNegocio;
          qtdExibicao += p.qtdNegocio;
        }
        if (statusFiltro.includes('Perdido')) {
          valorExibicao += p.vlrPerdido;
          qtdExibicao += p.qtdPerdido;
        }

        return { ...p, valorExibicao, qtdExibicao };
      })
      .sort((a, b) => b.valorExibicao - a.valorExibicao);

    return {
      rankingProdutos: rankingFiltrado,
      graficoHistorico: Object.entries(acc.historicoMes).sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, d]) => ({ 
          name: `${name.split('-')[1]}/${name.split('-')[0].substring(2)}`, 
          ...d 
        })),
      graficoPagamentos: Object.entries(acc.pagamentos).map(([name, value]) => ({ name, value })),
      graficoPeriodicidade: Object.entries(acc.periodicidade).map(([name, value]) => ({ name, value })),
      graficoStatusRenovacao: Object.entries(acc.statusRenovacao).map(([name, value]) => ({ name, value })),
      graficoRenovacoes: Object.entries(acc.renovacoesFuturas).sort().filter(([mes]) => mes >= mesAtual).slice(0, 6)
        .map(([name, data]) => ({ name, valor: data.valor, qtd: data.qtd }))
    };
  }, [propostasLocais, statusFiltro]);

  const toggleStatus = (s: string) => {
    setStatusFiltro(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* FILTROS E HEADER */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <Filter size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500">Inteligência:</span>
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
            // CORREÇÃO: Disable real se for nível CORRETOR
            disabled={userLevel === 'CORRETOR'}
            className="ml-auto bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* CORREÇÃO: Só mostra "Todos" e "Casa" se não for nível corretor */}
            {userLevel !== 'CORRETOR' && (
              <>
                <option value="todos">Todos os Corretores</option>
                <option value="casa">ATENDIMENTO DIRETO (CORRETORA)</option>
              </>
            )}
            
            {/* CORREÇÃO: Filtra para não duplicar o 'casa' vindo da lista, caso exista */}
            {corretoresLista
              .filter(c => c.nome !== 'ATENDIMENTO DIRETO (CORRETORA)')
              .map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))
            }
          </select>
        </div>

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

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
          <Briefcase size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Análise Técnica de Carteira</h2>
          <p className="text-xs font-bold text-slate-400">Os números abaixo reagem aos botões de status selecionados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.rankingProdutos.length > 0 ? stats.rankingProdutos.map((p: any) => (
          <div key={p.nome} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:border-indigo-100 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">{p.nome}</span>
              <TrendingUp size={14} className="text-emerald-500 opacity-50" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-black text-slate-800 transition-all">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.valorExibicao)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {p.qtdExibicao} propostas no filtro
                </p>
                <div className="grid grid-cols-3 gap-1 text-[8px] font-black uppercase mt-3">
                  <div className={`p-1 rounded text-center ${statusFiltro.includes('Vendido') ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300 bg-slate-50'}`}>{p.qtdVendido} Vend.</div>
                  <div className={`p-1 rounded text-center ${statusFiltro.includes('Em Negociação') ? 'text-amber-600 bg-amber-50' : 'text-slate-300 bg-slate-50'}`}>{p.qtdNegocio} Negoc.</div>
                  <div className={`p-1 rounded text-center ${statusFiltro.includes('Perdido') ? 'text-rose-600 bg-rose-50' : 'text-slate-300 bg-slate-50'}`}>{p.qtdPerdido} Perd.</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-50">
                <div className="flex justify-between text-[10px] font-black uppercase text-indigo-600 mb-1">
                  <span>Taxa de Conversão</span>
                  <span>{((p.qtdVendido / (p.totalGeral || 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: `${(p.qtdVendido / (p.totalGeral || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-xs italic">
            Nenhum dado encontrado para os filtros aplicados.
          </div>
        )}
      </div>

      {/* RENOVAÇÕES E PIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                <RefreshCw size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-600 tracking-widest">Pipeline de Renovação (Vendas Ativas)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.graficoRenovacoes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} axisLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="valor" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4">Status Renovação</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.graficoStatusRenovacao} innerRadius={40} outerRadius={55} dataKey="value">
                    {stats.graficoStatusRenovacao.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#f43f5e'][i % 3]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {stats.graficoStatusRenovacao.map((item, i) => (
                <div key={i} className="flex justify-between text-[9px] font-black uppercase">
                  <span className="text-slate-500">{item.name}</span>
                  <span className="text-indigo-600">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4">Periodicidade</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.graficoPeriodicidade} innerRadius={40} outerRadius={55} dataKey="value">
                    {stats.graficoPeriodicidade.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {stats.graficoPeriodicidade.map((item, i) => (
                <div key={i} className="flex justify-between text-[9px] font-black uppercase">
                  <span className="text-slate-500">{item.name}</span>
                  <span className="text-emerald-600">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2 mb-8">
          <BarChart3 size={18} className="text-indigo-500" /> Saúde da Carteira: Volume Financeiro por Status
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.graficoHistorico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} />
              <YAxis tick={{fontSize: 10, fontWeight: 900}} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} />
              <Bar dataKey="Vendido" stackId="a" fill="#10b981" />
              <Bar dataKey="EmNegociacao" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Perdido" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}