import { useMemo, useState, useEffect } from 'react';
import { 
  Briefcase, Calendar, CreditCard, 
  RefreshCw, TrendingUp, Filter, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoProdutosProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function VisaoProdutos({ corretoraId, corretoresLista }: VisaoProdutosProps) {
  
  const [loading, setLoading] = useState(true);
  const [propostasLocais, setPropostasLocais] = useState<any[]>([]);

  // 1. ESTADOS DE FILTRO (Data inicial focada no ano corrente para análise de produtos)
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 2. BUSCA DE DADOS AUTÔNOMA (Com joins para pegar itens e nomes de produtos)
  useEffect(() => {
    async function fetchDadosProdutos() {
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
          .gte('created_at', `${dataInicio}T00:00:00`)
          .lte('created_at', `${dataFim}T23:59:59`);

        if (corretorLocal !== 'todos') {
          query = query.eq('corretor_id', corretorLocal);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPropostasLocais(data || []);
      } catch (err) {
        console.error("Erro ao carregar Visão Produtos:", err);
      } finally {
        setLoading(false);
      }
    }

    if (corretoraId) fetchDadosProdutos();
  }, [dataInicio, dataFim, corretorLocal, corretoraId]);

  // 3. PROCESSAMENTO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const acc = {
      produtos: {} as Record<string, any>,
      cotacoesPorMes: {} as Record<string, number>,
      pagamentos: {} as Record<string, number>,
      renovacoesFuturas: {} as Record<string, { qtd: number; valor: number }>,
    };

    propostasLocais.forEach(p => {
      const status = String(p.status || '').toLowerCase();

      p.tab_proposta_opcoes?.forEach((opcao: any) => {
        opcao.tab_proposta_itens?.forEach((item: any) => {
          const valorItem = Number(item.valor_premio || 0);
          const nomeProd = item.base_produtos?.nome || 'OUTROS';
          
          // Performance por Produto
          if (!acc.produtos[nomeProd]) {
            acc.produtos[nomeProd] = { nome: nomeProd, criadas: 0, vendidas: 0, vlrCriado: 0, vlrVendido: 0 };
          }
          acc.produtos[nomeProd].criadas++;
          acc.produtos[nomeProd].vlrCriado += valorItem;

          // Fluxo de Cotações
          if (item.data_cotacao) {
            const mesCot = item.data_cotacao.substring(0, 7);
            acc.cotacoesPorMes[mesCot] = (acc.cotacoesPorMes[mesCot] || 0) + 1;
          }
          
          if (status === 'vendido' || status === 'fechado') {
            acc.produtos[nomeProd].vendidas++;
            acc.produtos[nomeProd].vlrVendido += valorItem;

            // Meio de Pagamento
            const mp = item.meio_pagamento || 'NÃO INFORMADO';
            acc.pagamentos[mp] = (acc.pagamentos[mp] || 0) + 1;

            // Projeção de Renovações
            if (item.data_fim_vigencia) {
              const mesFim = item.data_fim_vigencia.substring(0, 7);
              if (!acc.renovacoesFuturas[mesFim]) acc.renovacoesFuturas[mesFim] = { qtd: 0, valor: 0 };
              acc.renovacoesFuturas[mesFim].qtd++;
              acc.renovacoesFuturas[mesFim].valor += valorItem;
            }
          }
        });
      });
    });

    const mesAtual = new Date().toISOString().substring(0, 7);

    return {
      rankingProdutos: Object.values(acc.produtos).sort((a, b) => b.vlrVendido - a.vlrVendido),
      graficoCotacoes: Object.entries(acc.cotacoesPorMes).sort().map(([name, value]) => ({ name, value })),
      graficoPagamentos: Object.entries(acc.pagamentos).map(([name, value]) => ({ name, value })),
      graficoRenovacoes: Object.entries(acc.renovacoesFuturas)
        .sort()
        .filter(([mes]) => mes >= mesAtual)
        .slice(0, 6)
        .map(([name, data]) => ({ name, valor: data.valor, qtd: data.qtd }))
    };
  }, [propostasLocais]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Filtrar Período:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />
          <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
          <input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />

          {/* RÓTULO DE PRECISÃO PARA PRODUTOS */}
          <span className="ml-2 text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
            📦 Base: Propostas Criadas no Período
          </span>
        </div>

        <select 
          value={corretorLocal} 
          onChange={(e) => setCorretorLocal(e.target.value)}
          className="ml-auto bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px]"
        >
          <option value="todos">Todos os Corretores / Casa</option>
          {(corretoresLista || []).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-2" />}
      </div>

      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-indigo-600 p-2 rounded-xl text-white">
          <Briefcase size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Análise de Produtos e Projeções</h2>
          <p className="text-xs font-bold text-slate-400">Visão técnica de itens e previsibilidade de renovações</p>
        </div>
      </div>

      {/* 1. PERFORMANCE POR PRODUTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.rankingProdutos.length > 0 ? stats.rankingProdutos.map((p: any) => (
          <div key={p.nome} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:border-indigo-100 transition-all group">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">{p.nome}</span>
              <TrendingUp size={14} className="text-emerald-500 opacity-50" />
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-black text-slate-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.vlrVendido)}
                </p>
                <div className="flex gap-2 text-[9px] font-bold uppercase mt-1">
                  <span className="text-emerald-600">{p.vendidas} Vendidas</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-400">{p.criadas} Cotadas</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-indigo-600">
                  <span>Conversão</span>
                  <span>{((p.vendidas / (p.criadas || 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${(p.vendidas / (p.criadas || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-xs italic">
            Nenhum produto identificado no período.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. PROJEÇÃO DE RENOVAÇÕES */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                <RefreshCw size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-600 tracking-widest">Projeção de Renovação (6 Meses)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.graficoRenovacoes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), 'Volume']}
                  />
                  <Bar dataKey="valor" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* 3. PAGAMENTOS E COTAÇÕES */}
        <div className="grid grid-rows-2 gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center">
            <div className="w-1/2">
              <h3 className="text-xs font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-500" /> Meios de Pagto
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.graficoPagamentos} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {stats.graficoPagamentos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-1/2 space-y-3 pl-6 border-l border-slate-100 overflow-y-auto max-h-40">
               {stats.graficoPagamentos.map((item) => (
                 <div key={item.name} className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase truncate pr-2">{item.name}</span>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{item.value}</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-col justify-center">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" /> Fluxo de Cotações (Mês)
            </h3>
            <div className="flex items-end gap-3 h-28 px-2">
              {stats.graficoCotacoes.length > 0 ? stats.graficoCotacoes.slice(-8).map((item) => (
                <div key={item.name} className="flex-1 flex flex-col items-center gap-2 group">
                   <div 
                    className="w-full bg-indigo-200 group-hover:bg-indigo-500 rounded-t-xl transition-all duration-300 relative" 
                    style={{ height: `${(item.value / (Math.max(...stats.graficoCotacoes.map(g => g.value)) || 1)) * 100}%` }}
                   >
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-indigo-600">
                        {item.value}
                     </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-1">{item.name.split('-')[1]}/{item.name.split('-')[0].substring(2)}</span>
                </div>
              )) : (
                <div className="w-full text-center text-[10px] font-bold text-slate-300 italic uppercase">Sem cotações registradas</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}