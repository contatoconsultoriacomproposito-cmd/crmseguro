// src/pages/portal/components/HeaderPortal.tsx
import { ShieldCheck, RefreshCw, Send, History } from "lucide-react";

interface HeaderProps {
  nomeParceiro: string;
  abaAtiva: 'NOVA' | 'HISTORICO';
  setAbaAtiva: (aba: 'NOVA' | 'HISTORICO') => void;
  onRefresh: () => void;
}

export const HeaderPortal = ({ nomeParceiro, abaAtiva, setAbaAtiva, onRefresh }: HeaderProps) => (
  <div className="bg-zinc-900 text-white pt-10 pb-16 px-6 text-center rounded-b-[3.5rem] shadow-xl relative">
    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg rotate-3">
      <ShieldCheck size={32} />
    </div>
    <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Central do Parceiro</h1>
    <div className="flex items-center justify-center gap-2 mt-2">
      <p className="text-blue-400 font-bold uppercase text-[9px] tracking-[0.2em]">{nomeParceiro}</p>
      <button onClick={onRefresh} className="p-1.5 bg-zinc-800 rounded-full text-blue-400 hover:text-white transition-all active:rotate-180 duration-500">
        <RefreshCw size={10} />
      </button>
    </div>
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex bg-zinc-800 p-1 rounded-t-xl">
      <button onClick={() => setAbaAtiva('NOVA')} className={`px-5 py-2.5 rounded-t-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all ${abaAtiva === 'NOVA' ? 'bg-slate-50 text-blue-600' : 'text-slate-400'}`}>
        <Send size={12}/> Nova Indicação
      </button>
      <button onClick={() => setAbaAtiva('HISTORICO')} className={`px-5 py-2.5 rounded-t-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all ${abaAtiva === 'HISTORICO' ? 'bg-slate-50 text-blue-600' : 'text-slate-400'}`}>
        <History size={12}/> Acompanhamento
      </button>
    </div>
  </div>
);