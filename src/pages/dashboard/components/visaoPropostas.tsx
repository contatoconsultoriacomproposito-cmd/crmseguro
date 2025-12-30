import React from 'react';
import { FileText, ShieldCheck, XCircle } from 'lucide-react';

export default function VisaoPropostas({ data }: { data: any }) {
  // Fallback seguro para evitar divisão por zero ou undefined
  const total = data?.total || 0;
  const vendidas = data?.vendidas || 0;
  const conversao = total > 0 ? ((vendidas / total) * 100).toFixed(1) : "0.0";

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <FileText size={14}/> 3. Visão de Propostas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Criadas" val={total} money={data?.vlrCriado} color="bg-indigo-500" icon={<FileText/>}/>
        <StatCard label="Vendidas" val={vendidas} money={data?.vlrVendido} color="bg-emerald-500" icon={<ShieldCheck/>}/>
        <StatCard label="Perdidas" val={data?.perdidas || 0} money={data?.vlrPerdido} color="bg-red-500" icon={<XCircle/>}/>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[14px] font-black uppercase text-slate-400">Taxa de Conversão</p>
          <p className="text-3xl font-black text-slate-800">{conversao}%</p>
          <div className="w-full h-1 bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${conversao}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, val, money, color, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5 text-slate-800">{React.cloneElement(icon, { size: 80 })}</div>
      <div className={`${color} w-8 h-8 rounded-xl flex items-center justify-center text-white mb-4`}>{React.cloneElement(icon, { size: 16 })}</div>
      <p className="text-[14px] font-black uppercase text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-800">{val || 0}</p>
      {/* O SEGREDO ESTÁ AQUI: (money || 0) */}
      <p className="text-[14px] font-bold text-slate-500 mt-1">R$ {(money || 0).toLocaleString('pt-BR')}</p>
    </div>
  );
}