import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Shield, Calendar, User, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface VisaoSinistrosProps {
  corretoraId: string;
  corretoresLista: any[];
}

export default function VisaoSinistros({ corretoraId, corretoresLista = [] }: VisaoSinistrosProps) {
  // --- 1. ESTADOS ---
  const [sinistrosRaw, setSinistrosRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorId, setCorretorId] = useState('todos');

  // --- 2. QUERY ISOLADA ---
  useEffect(() => {
    async function fetchSinistros() {
      if (!corretoraId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tab_sinistros')
          .select(`
            *,
            tab_proposta_itens (
              base_produtos ( nome )
            )
          `)
          .eq('corretora_id', corretoraId);

        if (error) throw error;
        setSinistrosRaw(data || []);
      } catch (err) {
        console.error('Erro ao buscar sinistros:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSinistros();
  }, [corretoraId]);

  // --- 3. LÓGICA DE PROCESSAMENTO (MEMO) ---
  const stats = useMemo(() => {
    const s = {
      abertos: 0,
      finalizados: 0,
      detalheAbertos: [] as { produto: string; quantidade: number }[],
      detalheFinalizados: [] as { produto: string; quantidade: number }[]
    };

    sinistrosRaw.forEach((sin: any) => {
      const itemCorretorId = sin.corretor_id || '';
      if (corretorId !== 'todos' && itemCorretorId !== corretorId) return;

      const dataBruta = sin.data_abertura || sin.criado_em || '';
      const dataRef = dataBruta.split(/[ T]/)[0];

      if (dataRef >= dataInicio && dataRef <= dataFim) {
        const status = String(sin.status || '').toLowerCase().trim();
        // Acesso ao join profundo: proposta -> item -> produto
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
  }, [sinistrosRaw, dataInicio, dataFim, corretorId]);

  function updateDetalhe(arr: any[], produto: string) {
    const exist = arr.find(d => d.produto === produto);
    if (exist) exist.quantidade++;
    else arr.push({ produto, quantidade: 1 });
  }

  const resetFiltros = () => {
    setDataInicio(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    setDataFim(new Date().toISOString().split('T')[0]);
    setCorretorId('todos');
  };

  if (loading) {
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
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shadow-sm border border-amber-200">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Sinistros e Assistências</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Gestão de Ocorrências Isolada</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-indigo-600 p-1" />
            <span className="text-slate-300">/</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none focus:text-indigo-600 p-1" />
            
            {/* RÓTULO DE PRECISÃO PARA SINISTROS */}
            <span className="ml-2 text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded-md border border-amber-100 whitespace-nowrap">
              ⚠️ Base: Data de Abertura
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <User size={14} className="text-slate-400" />
            <select value={corretorId} onChange={(e) => setCorretorId(e.target.value)} className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer focus:text-indigo-600 min-w-[140px]">
              <option value="todos">Todos os Corretores</option>
              {corretoresLista.map(corr => (
                <option key={corr.id} value={corr.id}>{corr.nome}</option>
              ))}
            </select>
          </div>

          <button onClick={resetFiltros} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all">
            <RefreshCcw size={14} />
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
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between border-b border-slate-50 pb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
          <h3 className="font-black uppercase text-slate-800 italic tracking-tighter leading-tight">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase">Ocorrências</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{total}</p>
        </div>
      </div>

      <div className="grid gap-2">
        {detalhes.length > 0 ? (
          detalhes
            .sort((a: any, b: any) => b.quantidade - a.quantidade)
            .map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <Shield size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-[11px] font-black uppercase text-slate-600 tracking-tighter">{item.produto}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Qtd</span>
                  <span className="text-lg font-black text-slate-800">{item.quantidade}</span>
                </div>
              </div>
            ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 opacity-40">
            <Shield size={32} className="text-slate-200 mb-2" />
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest text-center">
              Sem registros encontrados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}