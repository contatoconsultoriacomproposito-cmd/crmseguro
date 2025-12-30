import { AlertTriangle, Clock, CheckCircle2, Shield } from 'lucide-react';

type SinistroData = {
  abertos: number;
  finalizados: number;
  detalheAbertos: { produto: string; quantidade: number }[];
  detalheFinalizados: { produto: string; quantidade: number }[];
};

export default function VisaoSinistros({ data }: { data: SinistroData }) {
  return (
    <section className="space-y-6">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500" /> 5. Visão de Sinistros (Análise por Produto)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SinistroCard 
          title="Sinistros em Aberto"
          icon={<Clock size={20} />}
          color="amber"
          total={data.abertos}
          detalhes={data.detalheAbertos}
        />

        <SinistroCard 
          title="Sinistros Finalizados"
          icon={<CheckCircle2 size={20} />}
          color="emerald"
          total={data.finalizados}
          detalhes={data.detalheFinalizados}
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
        {detalhes.length > 0 ? detalhes.map((item: any, idx: number) => (
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