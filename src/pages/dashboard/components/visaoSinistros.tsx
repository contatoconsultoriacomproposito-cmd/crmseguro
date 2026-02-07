import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Shield, Calendar, User, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface VisaoSinistrosProps {
  corretoraId: string;
  corretoresLista: any[];
  userLevel?: string;
  userId?: string;
}

export default function VisaoSinistros({ 
  corretoraId, 
  corretoresLista = [],
  userLevel,
  userId
}: VisaoSinistrosProps) {
  // --- 1. ESTADOS ---
  const [sinistrosRaw, setSinistrosRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtro
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorId, setCorretorId] = useState('todos');

  // --- 2. BUSCA DA DATA MAIS ANTIGA ---
  useEffect(() => {
    async function buscarPrimeiroSinistro() {
      if (!corretoraId) return;
      
      const { data, error } = await supabase
        .from('tab_sinistros')
        .select('data_abertura, criado_em')
        .eq('corretora_id', corretoraId)
        .order('data_abertura', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && (data?.data_abertura || data?.criado_em)) {
        const dataRef = data.data_abertura || data.criado_em;
        setDataInicio(dataRef.split(' ')[0].split('T')[0]);
      } else {
        setDataInicio(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiroSinistro();
  }, [corretoraId]);

  // --- 3. QUERY PRINCIPAL COM TRAVA DE SEGURANÇA ---
  useEffect(() => {
    async function fetchSinistros() {
      if (!corretoraId || !dataInicio) return;
      setLoading(true);
      try {
        let query = supabase
          .from('tab_sinistros')
          .select(`
            *,
            tab_proposta_itens (
              base_produtos ( nome )
            )
          `)
          .eq('corretora_id', corretoraId);

        // Trava de Segurança
        if (userLevel === 'corretor' && userId) {
          query = query.eq('corretor_id', userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setSinistrosRaw(data || []);
      } catch (err) {
        console.error('Erro ao buscar sinistros:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSinistros();
  }, [corretoraId, dataInicio, userLevel, userId]);

  // --- 4. LÓGICA DE PROCESSAMENTO (MEMO) ---
  const stats = useMemo(() => {
    const s = {
      abertos: 0,
      finalizados: 0,
      detalheAbertos: [] as { produto: string; quantidade: number }[],
      detalheFinalizados: [] as { produto: string; quantidade: number }[]
    };

    sinistrosRaw.forEach((sin: any) => {
      // Filtro local adicional para Admin (se selecionado corretor específico)
      const itemCorretorId = sin.corretor_id || '';
      if (userLevel !== 'corretor' && corretorId !== 'todos' && itemCorretorId !== corretorId) return;

      const dataBruta = sin.data_abertura || sin.criado_em || '';
      const dataRef = dataBruta.split(/[ T]/)[0];

      if (dataRef >= dataInicio && dataRef <= dataFim) {
        const status = String(sin.status || '').toLowerCase().trim();
        const nomeProduto = sin.tab_proposta_itens?.base_produtos?.nome || 'Seguro Geral';

        const isAberto = ['aberto', 'em andamento', 'cadastro', 'pendente', 'vistoria'].includes(status);
        const isFinalizado = ['finalizado', 'concluído', 'concluido', 'encerrado', 'pago', 'recusado'].includes(status);

        if (isAberto) {
          s.abertos++;
          updateDetalhe(s.detalheAbertos, nomeProduto);
        } 
        else if (isFinalizado) {
          s.finalizados++;
          updateDetalhe(s.detalheFinalizados, nomeProduto);
        }
      }
    });

    return s;
  }, [sinistrosRaw, dataInicio, dataFim, corretorId, userLevel]);

  function updateDetalhe(arr: any[], produto: string) {
    const exist = arr.find(d => d.produto === produto);
    if (exist) exist.quantidade++;
    else arr.push({ produto, quantidade: 1 });
  }

  const resetFiltros = () => {
    setCorretorId('todos');
    setDataFim(new Date().toISOString().split('T')[0]);
  };

  if (loading && !dataInicio) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest italic">Mapeando Sinistralidade...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl text-white shadow-lg shadow-amber-100">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Sinistros e Assistências</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Monitoramento de Ocorrências</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-4 border-r border-slate-100">
            <Calendar size={14} className="text-amber-500" />
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-amber-600 p-1" />
            <span className="text-slate-300">/</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-amber-600 p-1" />
            
            <span className="ml-3 text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 whitespace-nowrap">
              ⚠️ Base: Data de Abertura
            </span>
          </div>

          {userLevel !== 'corretor' && (
            <div className="flex items-center gap-2 px-4">
              <User size={14} className="text-slate-400" />
              <select value={corretorId} onChange={(e) => setCorretorId(e.target.value)} className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer focus:text-indigo-600 min-w-[160px]">
                <option value="todos">Todos os Corretores</option>
                {corretoresLista.map(corr => (
                  <option key={corr.id} value={corr.id}>{corr.nome}</option>
                ))}
              </select>
            </div>
          )}

          <button onClick={resetFiltros} className="p-2.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-amber-600 transition-all">
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SinistroCard 
          title="Em Aberto / Em Andamento"
          icon={<Clock size={20} />}
          color="amber"
          total={stats.abertos}
          detalhes={stats.detalheAbertos}
        />

        <SinistroCard 
          title="Finalizados / Liquidados"
          icon={<CheckCircle2 size={20} />}
          color="emerald"
          total={stats.finalizados}
          detalhes={stats.detalheFinalizados}
        />
      </div>
    </section>
  );
}

function SinistroCard({ title, icon, color, total, detalhes }: any) {
  const colorClasses = {
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100"
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500">
      <div className="flex items-center justify-between border-b border-slate-50 pb-8">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-[20px] border ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
          <h3 className="font-black text-lg uppercase text-slate-800 italic tracking-tighter leading-tight">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
          <p className="text-5xl font-black text-slate-800 tracking-tighter leading-none">{total}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {detalhes.length > 0 ? (
          detalhes
            .sort((a: any, b: any) => b.quantidade - a.quantidade)
            .map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-5 rounded-[24px] border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-indigo-50 transition-colors">
                    <Shield size={14} className="text-slate-300 group-hover:text-indigo-500" />
                  </div>
                  <span className="text-[11px] font-black uppercase text-slate-600 tracking-tighter group-hover:text-slate-900">{item.produto}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qtd</span>
                  <span className="text-xl font-black text-slate-800">{item.quantidade}</span>
                </div>
              </div>
            ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 opacity-40">
            <Shield size={40} className="text-slate-200 mb-3" />
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] text-center">
              Nenhuma ocorrência registrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}