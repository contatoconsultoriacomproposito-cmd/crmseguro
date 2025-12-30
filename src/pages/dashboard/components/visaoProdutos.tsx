
import { Briefcase } from 'lucide-react';

export default function VisaoProdutos({ data }: { data: any[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <Briefcase size={14}/> 3. Performance por Produto
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((p: any) => (
          <div key={p.nome} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <p className="font-black text-slate-800 uppercase text-xs">{p.nome}</p>
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-slate-400 text-[10px] font-bold uppercase">Criadas</p>
                <p className="font-bold text-xs">{p.criadas} (R$ {p.vlrCriado.toLocaleString()})</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl">
                <p className="text-emerald-600 font-bold text-[10px] uppercase">Vendidas</p>
                <p className="font-bold text-emerald-700 text-xs">{p.vendidas} (R$ {p.vlrVendido.toLocaleString()})</p>
              </div>
            </div>
            <p className="text-[12px] font-black text-indigo-600">CONVERSÃO: {((p.vendidas/(p.criadas || 1))*100).toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}