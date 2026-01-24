import React from 'react';
import { Search, RefreshCwIcon } from 'lucide-react';

interface FiltroBuscaProps {
  busca: string;
  setBusca: (val: string) => void;
  loading: boolean;
  handleRefresh: () => void;
}

export const FiltroBusca: React.FC<FiltroBuscaProps> = ({ busca, setBusca, loading, handleRefresh }) => {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
          Triagem <span className="text-blue-600">de Indicações</span>
        </h1>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">
          Central de Atendimento e Conversão
        </p>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto">
        <button 
          onClick={handleRefresh} 
          disabled={loading}
          className="flex items-center gap-2 h-12 px-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCwIcon size={16} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>

        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="PESQUISAR CLIENTE OU PARCEIRO..." 
            className="w-full h-12 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all shadow-sm" 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
          />
        </div>
      </div>
    </header>
  );
};