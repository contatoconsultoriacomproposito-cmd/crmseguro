import { useMemo, useState, useEffect } from 'react';
import { 
  Briefcase, CreditCard, 
  RefreshCw, TrendingUp, Filter, Loader2, Clock, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

// Atualizado para incluir userLevel e evitar erros de tipagem
interface VisaoProdutosProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string; // Nível de acesso (admin, corretor, etc)
  userId?: string;    // ID do usuário logado
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
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 2. BUSCAR A DATA DA PROPOSTA MAIS ANTIGA
  useEffect(() => {
    async function buscarPrimeiraData() {
      if (!corretoraId) return;
      const { data, error } = await supabase
        .from('tab_propostas')
        .select('created_at')
        .eq('corretora_id', corretoraId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
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
      if (!dataInicio || !corretoraId) return;
      
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

        // APLICAÇÃO DO FILTRO DE SEGURANÇA (Resolve o aviso de 'never read')
        if (userLevel === 'corretor' && userId) {
          query = query.eq('corretor_id', userId);
        } else {
          // Se for admin, respeita o filtro do Select
          if (corretorLocal === 'casa') {
            query = query.is('corretor_id', null);
          } else if (corretorLocal !== 'todos') {
            query = query.eq('corretor_id', corretorLocal);
          }
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

    fetchDadosProdutos();
    // Adicionado userId e userLevel às dependências
  }, [dataInicio, dataFim, corretorLocal, corretoraId, userId, userLevel]);

  // 4. PROCESSAMENTO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const acc = {
      produtos: {} as Record<string, any>,
      historicoMes: {} as Record<string, { qtd: number; valor: number }>,
      pagamentos: {} as Record<string, number>,
      periodicidade: {} as Record<string, number>,
      renovacoesFuturas: {} as Record<string, { qtd: number; valor: number }>,
    };

    propostasLocais.forEach(p => {
      const status = String(p.status || '').toLowerCase();
      const dataRef = (p.created_at || '').substring(0, 7);

      p.tab_proposta_opcoes?.forEach((opcao: any) => {
        opcao.tab_proposta_itens?.forEach((item: any) => {
          const valorItem = Number(item.valor_premio || 0);
          const nomeProd = item.base_produtos?.nome || 'OUTROS';
          
          if (!acc.produtos[nomeProd]) {
            acc.produtos[nomeProd] = { nome: nomeProd, criadas: 0, vendidas: 0, vlrCriado: 0, vlrVendido: 0 };
          }
          acc.produtos[nomeProd].criadas++;
          acc.produtos[nomeProd].vlrCriado += valorItem;

          if (!acc.historicoMes[dataRef]) acc.historicoMes[dataRef] = { qtd: 0, valor: 0 };
          acc.historicoMes[dataRef].qtd++;
          acc.historicoMes[dataRef].valor += valorItem;
          
          if (['vendido', 'fechado', 'concluído', 'emitido'].includes(status)) {
            acc.produtos[nomeProd].vendidas++;
            acc.produtos[nomeProd].vlrVendido += valorItem;

            const mp = item.meio_pagamento || 'NÃO INFORMADO';
            acc.pagamentos[mp] = (acc.pagamentos[mp] || 0) + 1;

            const perio = item.periodicidade || 'Não Informada';
            acc.periodicidade[perio] = (acc.periodicidade[perio] || 0) + 1;

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
      rankingProdutos: Object.values(acc.produtos).sort((a: any, b: any) => b.vlrVendido - a.vlrVendido),
      graficoHistorico: Object.entries(acc.historicoMes)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, d]) => ({ 
          name: `${name.split('-')[1]}/${name.split('-')[0].substring(2)}`, 
          quantidade: d.qtd, 
          valor: d.valor 
        })),
      graficoPagamentos: Object.entries(acc.pagamentos).map(([name, value]) => ({ name, value })),
      graficoPeriodicidade: Object.entries(acc.periodicidade).map(([name, value]) => ({ name, value })),
      graficoRenovacoes: Object.entries(acc.renovacoesFuturas)
        .sort()
        .filter(([mes]) => mes >= mesAtual)
        .slice(0, 6)
        .map(([name, data]) => ({ name, valor: data.valor, qtd: data.qtd }))
    };
  }, [propostasLocais]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* FILTROS PADRONIZADOS */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Inteligência de Produtos:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />
          <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
          <input 
            type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />
          <span className="ml-2 text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
            📦 Base: Data de Entrada
          </span>
        </div>

        <select 
          value={corretorLocal} onChange={(e) => setCorretorLocal(e.target.value)}
          className="ml-auto bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px]"
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

        {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-2" />}
      </div>

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-indigo-600 p-2 rounded-xl text-white">
          <Briefcase size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Análise Técnica de Carteira</h2>
          <p className="text-xs font-bold text-slate-400">Desempenho por produto e projeções financeiras</p>
        </div>
      </div>

      {/* 1. CARDS DE PRODUTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.rankingProdutos.length > 0 ? stats.rankingProdutos.map((p: any) => (
          <div key={p.nome} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:border-indigo-100 transition-all">
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
            Nenhum produto identificado no período selecionado.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. RENOVAÇÕES */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                <RefreshCw size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-600 tracking-widest">Pipeline de Renovação (6 Meses)</h3>
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

        {/* 3. PAGAMENTO E PERIODICIDADE */}
        <div className="grid grid-rows-2 gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center">
            <div className="w-1/2">
              <h3 className="text-[11px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                <CreditCard size={14} className="text-indigo-500" /> Meios de Pagto
              </h3>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.graficoPagamentos} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                      {stats.graficoPagamentos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-1/2 space-y-2 pl-6 border-l border-slate-100">
               {stats.graficoPagamentos.slice(0, 4).map((item) => (
                 <div key={item.name} className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase truncate pr-2">{item.name}</span>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{item.value}</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center">
            <div className="w-1/2">
              <h3 className="text-[11px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                <Clock size={14} className="text-indigo-500" /> Periodicidade
              </h3>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.graficoPeriodicidade} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                      {stats.graficoPeriodicidade.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-1/2 space-y-2 pl-6 border-l border-slate-100">
               {stats.graficoPeriodicidade.map((item) => (
                 <div key={item.name} className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase truncate pr-2">{item.name}</span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{item.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. HISTÓRICO MÊS A MÊS */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500" /> Histórico Mensal: Volume vs. Premiação
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Qtd Propostas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-400 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Valor Total</span>
            </div>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.graficoHistorico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="#6366f1" tick={{fontSize: 10, fontWeight: 900}} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{fontSize: 10, fontWeight: 900}} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value: any, name: any) => {
                  if (name === "valor") return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Valor Total'];
                  return [value, 'Quantidade'];
                }}
              />
              <Bar yAxisId="left" dataKey="quantidade" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={25} />
              <Bar yAxisId="right" dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} barSize={25} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}