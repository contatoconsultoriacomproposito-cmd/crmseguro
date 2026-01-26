import { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Shield } from 'lucide-react';

interface VisaoSinistrosProps {
  sinistrosRaw: any[];
  propostasRaw: any[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

export default function VisaoSinistros({ sinistrosRaw, dataInicio, dataFim, corretorId }: VisaoSinistrosProps) {
  
  const stats = useMemo(() => {
    const s = {
      abertos: 0,
      finalizados: 0,
      detalheAbertos: [] as { produto: string; quantidade: number }[],
      detalheFinalizados: [] as { produto: string; quantidade: number }[]
    };

    sinistrosRaw.forEach((sin: any) => {
      // 1. Filtro de Corretor
      const pertenceAoCorretor = corretorId === 'todos' || sin.corretor_id === corretorId;
      if (!pertenceAoCorretor) return;

      // 2. Filtro de Data
      const dataBruta = sin.data_abertura || sin.criado_em || '';
      const dataRef = dataBruta.split(/[ T]/)[0];

      if (dataRef >= dataInicio && dataRef <= dataFim) {
        const status = String(sin.status || '').toLowerCase().trim();
        
        // --- AJUSTE AQUI: Acessando o nome via relação indireta ---
        // A query agora traz: sin.tab_proposta_itens.base_produtos.nome
        const nomeProduto = sin.tab_proposta_itens?.base_produtos?.nome || 'Seguro Geral';

        // Lógica de Agrupamento por Status
        if (['aberto', 'em andamento', 'cadastro', 'pendente'].includes(status)) {
          s.abertos++;
          updateDetalhe(s.detalheAbertos, nomeProduto);
        } 
        else if (['finalizado', 'concluído', 'concluido', 'encerrado', 'pago'].includes(status)) {
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

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500" /> 8. Visão de Sinistros/Assistências (Análise por Produto)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SinistroCard 
          title="Sinistros/Assistências em Aberto"
          icon={<Clock size={20} />}
          color="amber"
          total={stats.abertos}
          detalhes={stats.detalheAbertos}
        />

        <SinistroCard 
          title="Sinistros/Assistências Finalizadas"
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
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
          <h3 className="font-black uppercase text-slate-800 italic tracking-tighter">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase">Volume</p>
          <p className="text-3xl font-black text-slate-800">{total}</p>
        </div>
      </div>

      <div className="space-y-2">
        {detalhes.length > 0 ? detalhes.sort((a: any, b: any) => b.quantidade - a.quantidade).map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-slate-300" />
              <span className="text-xs font-black uppercase text-slate-600">{item.produto}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">QTD</span>
                <span className="text-base font-black text-slate-800">{item.quantidade}</span>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <Shield size={32} className="text-slate-200 mb-2" />
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Sem movimentação</p>
          </div>
        )}
      </div>
    </div>
  );
}