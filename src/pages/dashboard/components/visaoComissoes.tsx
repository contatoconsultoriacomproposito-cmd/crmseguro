import { useState, useMemo, useEffect } from 'react';
import { Calendar, User, RefreshCcw, Loader2, Layers, Building2, TrendingUp, PieChart, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

// 1. TIPAGENS REFORÇADAS (Para evitar erros de 'any')
interface VisaoComissoesProps {
  corretoraId: string;
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

interface ComissaoRegra {
  id: string;
  base_calculo_valor: number;
  pct_comissao_venda: number;
  pct_corretor: number;
  pct_parceiro: number;
  tipo_recorrencia: string;
  quantidade_parcelas: number;
  data_venda: string;
  base_produtos?: { nome: string };
  base_seguradoras?: { nome: string };
}

interface ApoioData {
  id: string;
  nome: string;
}

export default function VisaoComissoes({ 
  corretoraId, 
  corretoresLista = [],
  userLevel,
  userId
}: VisaoComissoesProps) {
  
  // 2. ESTADOS
  const [comissoesRaw, setComissoesRaw] = useState<ComissaoRegra[]>([]);
  const [produtosLista, setProdutosLista] = useState<ApoioData[]>([]);
  const [seguradorasLista, setSeguradorasLista] = useState<ApoioData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 3. FILTROS
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [produtoFiltro, setProdutoFiltro] = useState('todos');
  const [seguradoraFiltro, setSeguradoraFiltro] = useState('todos');
  const [corretorFiltro, setCorretorFiltro] = useState(
    userLevel?.toUpperCase() === 'CORRETOR' ? userId || 'todos' : 'todos'
  );

  // Helper Financeiro
  const bcl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

  // 4. EFEITOS DE BUSCA DE DADOS
  useEffect(() => {
    async function carregarDadosApoio() {
      try {
        const [prodRes, segRes] = await Promise.all([
          supabase.from('base_produtos').select('id, nome').order('nome'),
          supabase.from('base_seguradoras').select('id, nome').order('nome')
        ]);
        if (prodRes.data) setProdutosLista(prodRes.data);
        if (segRes.data) setSeguradorasLista(segRes.data);
      } catch (err) {
        console.error("Erro ao carregar listas de apoio", err);
      }
    }
    carregarDadosApoio();
  }, []);

  useEffect(() => {
    async function buscarPrimeiroLancamento() {
      if (!corretoraId) return;
      const { data, error } = await supabase
        .from('tab_comissoes_regras')
        .select('data_venda')
        .eq('corretora_id', corretoraId)
        .order('data_venda', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data?.data_venda) {
        setDataInicio(data.data_venda);
      } else {
        const now = new Date();
        setDataInicio(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiroLancamento();
  }, [corretoraId]);

  useEffect(() => {
    async function fetchComissoesRegras() {
      if (!corretoraId || !dataInicio) return;
      setLoading(true); // Utilização obrigatória do estado Loading
      try {
        let query = supabase
          .from('tab_comissoes_regras')
          .select(`
            id, base_calculo_valor, pct_comissao_venda, pct_corretor, pct_parceiro, 
            tipo_recorrencia, quantidade_parcelas, data_venda,
            base_produtos ( nome ),
            base_seguradoras ( nome )
          `)
          .eq('corretora_id', corretoraId)
          .gte('data_venda', dataInicio)
          .lte('data_venda', dataFim);

        if (userLevel?.toUpperCase() === 'CORRETOR' || corretorFiltro !== 'todos') {
          query = query.eq('corretor_id', userLevel?.toUpperCase() === 'CORRETOR' ? userId : corretorFiltro);
        }
        if (produtoFiltro !== 'todos') query = query.eq('produto_id', produtoFiltro);
        if (seguradoraFiltro !== 'todos') query = query.eq('seguradora_id', seguradoraFiltro);

        const { data, error } = await query.order('data_venda', { ascending: false });
        if (!error && data) {
          // Cast seguro garantindo que atende à interface
          setComissoesRaw(data as unknown as ComissaoRegra[]);
        }
      } catch (err) {
        console.error("Erro ao buscar regras", err);
      } finally {
        setLoading(false); // Libera o Loading
      }
    }
    fetchComissoesRegras();
  }, [corretoraId, dataInicio, dataFim, corretorFiltro, produtoFiltro, seguradoraFiltro, userLevel, userId]);

  // 5. MOTOR DE INTELIGÊNCIA FINANCEIRA
  const dashboardData = useMemo(() => {
    const d = {
      receitaBruta: 0,
      liquidoCasa: 0,
      repasseCorretores: 0,
      repasseParceiros: 0,
      vendasCount: 0,
      porProduto: {} as Record<string, { nome: string; bruto: number; count: number; liquido: number }>,
      porSeguradora: {} as Record<string, { nome: string; bruto: number; count: number }>,
      porRecorrencia: { UNICA: 0, RECORRENTE: 0, MENSAL: 0 } as Record<string, number>
    };

    comissoesRaw.forEach((c) => {
      const base = Number(c.base_calculo_valor || 0);
      const pctVenda = Number(c.pct_comissao_venda || 0);
      const comissaoCheia = base * (pctVenda / 100);
      
      const corrVal = comissaoCheia * (Number(c.pct_corretor || 0) / 100);
      const parcVal = comissaoCheia * (Number(c.pct_parceiro || 0) / 100);
      const casaVal = comissaoCheia - corrVal - parcVal;

      d.receitaBruta += comissaoCheia;
      d.repasseCorretores += corrVal;
      d.repasseParceiros += parcVal;
      d.liquidoCasa += casaVal;
      d.vendasCount += 1;

      // Agrupamento por Produto (Para os Cards)
      const prodNome = c.base_produtos?.nome || 'NÃO ESPECIFICADO';
      if (!d.porProduto[prodNome]) {
        d.porProduto[prodNome] = { nome: prodNome, bruto: 0, count: 0, liquido: 0 };
      }
      d.porProduto[prodNome].bruto += comissaoCheia;
      d.porProduto[prodNome].liquido += casaVal;
      d.porProduto[prodNome].count += 1;

      // Agrupamento por Seguradora (Novo Uso Analítico)
      const segNome = c.base_seguradoras?.nome || 'NÃO ESPECIFICADA';
      if (!d.porSeguradora[segNome]) {
        d.porSeguradora[segNome] = { nome: segNome, bruto: 0, count: 0 };
      }
      d.porSeguradora[segNome].bruto += comissaoCheia;
      d.porSeguradora[segNome].count += 1;

      // Agrupamento de Recorrência
      const tipo = (c.tipo_recorrencia || 'UNICA').toUpperCase();
      if (tipo in d.porRecorrencia) {
        d.porRecorrencia[tipo] += 1;
      } else {
        d.porRecorrencia['RECORRENTE'] += 1;
      }
    });

    return d;
  }, [comissoesRaw]);

  const resetFiltros = () => {
    if (userLevel?.toUpperCase() !== 'CORRETOR') setCorretorFiltro('todos');
    setProdutoFiltro('todos');
    setSeguradoraFiltro('todos');
    setDataFim(new Date().toISOString().split('T')[0]);
  };

  return (
    <section className="space-y-7 animate-in fade-in duration-500 pb-10 relative">
      
      {/* OVERLAY DE LOADING: Trava a tela e resolve o warning da variável */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-[2px] flex items-center justify-center rounded-[32px]">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-slate-100">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recalculando Projeções...</p>
          </div>
        </div>
      )}

      {/* HEADER E FILTROS COMPLETOS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Inteligência de Comissões
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Painel Executivo de Repasses e Performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
          {/* Datas */}
          <div className="flex items-center gap-1.5 px-3 border-r border-slate-100">
            <Calendar size={13} className="text-indigo-500" />
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none p-1 text-slate-600" />
            <span className="text-slate-300 text-xs">/</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none p-1 text-slate-600" />
          </div>

          {/* Corretor */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-100">
            <User size={13} className="text-slate-400" />
            <select value={corretorFiltro} onChange={(e) => setCorretorFiltro(e.target.value)} disabled={userLevel?.toUpperCase() === 'CORRETOR'} className="text-[10px] font-bold uppercase bg-transparent outline-none text-slate-600 max-w-[130px] cursor-pointer">
              {userLevel?.toUpperCase() !== 'CORRETOR' ? (
                <>
                  <option value="todos">Todos os Corretores</option>
                  <option value="casa">A casa (Direto)</option>
                  {corretoresLista.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </>
              ) : (
                <option value={userId}>Minha Produção</option>
              )}
            </select>
          </div>

          {/* Produto */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-100">
            <Layers size={13} className="text-slate-400" />
            <select value={produtoFiltro} onChange={(e) => setProdutoFiltro(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none text-slate-600 max-w-[120px] cursor-pointer">
              <option value="todos">Todos Produtos</option>
              {produtosLista.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* Seguradora (Resolvendo o warning e explorando os dados) */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-100">
            <Building2 size={13} className="text-slate-400" />
            <select value={seguradoraFiltro} onChange={(e) => setSeguradoraFiltro(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none text-slate-600 max-w-[120px] cursor-pointer">
              <option value="todos">Seguradoras</option>
              {seguradorasLista.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          <button onClick={resetFiltros} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all">
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {/* 🚀 BLOCO 1: RATEIO GLOBAL DE COMISSIONAMENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[28px] text-white flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={100} /></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Geração Bruta Estimada</p>
            <p className="text-3xl font-black text-white tracking-tighter mt-1">{bcl(dashboardData.receitaBruta)}</p>
          </div>
          <span className="text-[9px] font-medium text-slate-400 mt-4 block relative z-10">Valor total pago pelas seguradoras</span>
        </div>

        <div className="bg-white p-6 rounded-[28px] border-l-[6px] border-l-emerald-500 border border-slate-100 shadow-sm flex flex-col justify-between group">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
               Líquido Retido (Casa)
            </p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter mt-1 group-hover:text-emerald-600 transition-colors">
              {userLevel?.toUpperCase() === 'CORRETOR' ? '---' : bcl(dashboardData.liquidoCasa)}
            </p>
          </div>
          <span className="text-[9px] font-medium text-slate-400 mt-4 block">Sobra final após repasses de parceiros e corretores</span>
        </div>

        <div className="bg-white p-6 rounded-[28px] border-l-[6px] border-l-indigo-500 border border-slate-100 shadow-sm flex flex-col justify-between group">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Rateio da Força de Vendas</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter mt-1 group-hover:text-indigo-600 transition-colors">{bcl(dashboardData.repasseCorretores)}</p>
          </div>
          <span className="text-[9px] font-medium text-slate-400 mt-4 block">Montante destinado aos corretores associados</span>
        </div>

        <div className="bg-white p-6 rounded-[28px] border-l-[6px] border-l-amber-500 border border-slate-100 shadow-sm flex flex-col justify-between group">
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Custo de Rede Externa</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter mt-1 group-hover:text-amber-500 transition-colors">
              {userLevel?.toUpperCase() === 'CORRETOR' ? '---' : bcl(dashboardData.repasseParceiros)}
            </p>
          </div>
          <span className="text-[9px] font-medium text-slate-400 mt-4 block">Repasse para parceiros e indicações (Lead)</span>
        </div>
      </div>

      {/* 📊 BLOCO 2: CARDS DE PRODUTOS */}
      <div>
        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest italic mb-4 ml-2">Performance Comercial por Produto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.values(dashboardData.porProduto).map((prod) => {
            const pesoNoFaturamento = dashboardData.receitaBruta > 0 ? (prod.bruto / dashboardData.receitaBruta) * 100 : 0;
            return (
              <div key={prod.nome} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative group hover:shadow-md hover:border-emerald-100 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[80%]">{prod.nome}</span>
                  <ArrowUpRight size={16} className="text-emerald-500 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                
                <p className="text-2xl font-black text-slate-800 tracking-tight">{bcl(userLevel?.toUpperCase() === 'CORRETOR' ? prod.bruto : prod.liquido)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-5">{prod.count} Vendas atreladas</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase">
                    <span className="text-emerald-600 tracking-wider">Relevância no Caixa</span>
                    <span className="text-slate-700">{pesoNoFaturamento.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pesoNoFaturamento}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
          {Object.keys(dashboardData.porProduto).length === 0 && !loading && (
            <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nenhuma movimentação para o filtro selecionado.</p>
            </div>
          )}
        </div>
      </div>

      {/* 🧩 BLOCO 3: ANÁLISE DE SEGURADORAS E RECORRÊNCIA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Lista de Força das Seguradoras */}
        <div className="xl:col-span-2 bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-2 bg-slate-50/50">
            <ShieldCheck size={16} className="text-indigo-500" />
            <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Ranking de Geração por Seguradora</h3>
          </div>
          <div className="p-2">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-50 text-xs">
                {Object.values(dashboardData.porSeguradora)
                  .sort((a, b) => b.bruto - a.bruto) // Ordena da maior receita para a menor
                  .slice(0, 5) // Mostra o Top 5
                  .map((seg, idx) => (
                  <tr key={seg.nome} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-4 py-3 font-bold text-slate-500 w-10 text-center">{idx + 1}º</td>
                    <td className="px-4 py-3 font-black text-slate-700 uppercase text-[10px]">{seg.nome}</td>
                    <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-400">{seg.count} Contratos</td>
                    <td className="px-4 py-3 text-right font-black text-indigo-600 text-sm">{bcl(seg.bruto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Distribuição da Recorrência */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={16} className="text-purple-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periodicidade Contratual</span>
            </div>

            <div className="flex justify-center items-center my-4">
              <div className="w-28 h-28 rounded-full border-8 border-slate-50 flex items-center justify-center relative shadow-inner" style={{
                background: `conic-gradient(#6366f1 0% 40%, #a855f7 40% 85%, #cbd5e1 85% 100%)`
              }}>
                <div className="absolute inset-0 m-4 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                  <span className="text-lg font-black text-slate-800 leading-none">{dashboardData.vendasCount}</span>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Ativas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
                <span className="text-slate-500">Único / À Vista</span>
              </div>
              <span className="text-slate-800 font-black">{dashboardData.porRecorrencia.UNICA} vendas</span>
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                <span className="text-slate-500">Recorrente / Mensal</span>
              </div>
              <span className="text-slate-800 font-black">{dashboardData.porRecorrencia.MENSAL + dashboardData.porRecorrencia.RECORRENTE} vendas</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}