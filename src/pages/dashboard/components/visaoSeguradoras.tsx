
import { ShieldCheck } from 'lucide-react';

export default function VisaoSeguradoras({ data }: { data: any[] }) {
  // Proteção: se data não for array, retorna vazio para não quebrar o dashboard
  if (!data || !Array.isArray(data)) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <ShieldCheck size={14}/> 7. Performance por Seguradora
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((seg, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="font-black text-slate-800 uppercase italic text-sm">{seg.nome}</h3>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {seg.vendidas} Vendas
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Volume Produzido</span>
                <span className="text-sm font-black text-slate-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seg.valor || 0)}
                </span>
              </div>
              
              {/* Proteção aqui: verificamos se prodStats existe antes de converter para Object.values */}
              <div className="pt-2 space-y-1">
                {seg.prodStats && Object.values(seg.prodStats).map((ps: any, pIdx: number) => (
                  <div key={pIdx} className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded-xl">
                    <span className="font-bold text-slate-500 uppercase">{ps.nome}</span>
                    <span className="font-black text-slate-700">{ps.vendidas}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}