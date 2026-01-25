import React from 'react';
import { Search, RefreshCwIcon } from 'lucide-react';

interface FiltroBuscaProps {
  busca: string;
  setBusca: (val: string) => void;
  loading: boolean;
  handleRefresh: () => void;
}

export const FiltroBusca: React.FC<FiltroBuscaProps> = ({ 
  busca, 
  setBusca, 
  loading, 
  handleRefresh 
}) => {

  /**
   * Executa o refresh forçado.
   * Se você quiser que ele literalmente dê F5 na página, 
   * pode trocar handleRefresh() por window.location.reload().
   */
  const onForcedRefresh = () => {
    if (!loading) {
      handleRefresh();
    }
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div className="select-none">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
          Triagem <span className="text-blue-600">de Indicações</span>
        </h1>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">
          Central de Atendimento e Conversão
        </p>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* BOTÃO ATUALIZAR BOMBADO */}
        <button 
          onClick={onForcedRefresh} 
          disabled={loading}
          title="Sincronizar dados (F5)"
          className={`
            group relative flex items-center gap-3 h-14 px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-80
            ${loading 
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 border-transparent' 
              : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-50'
            }
          `}
        >
          <RefreshCwIcon 
            size={18} 
            className={`transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} 
          />
          <span className="relative">
            {loading ? 'Sincronizando...' : 'Atualizar'}
          </span>
          
          {/* Efeito de brilho sutil no loading */}
          {loading && (
            <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
          )}
        </button>

        {/* CAMPO DE BUSCA REFORÇADO */}
        <div className="relative flex-1 md:w-96 group">
          <Search 
            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
              busca ? 'text-blue-600' : 'text-slate-400 group-focus-within:text-blue-500'
            }`} 
            size={20} 
          />
          <input 
            type="text" 
            placeholder="PESQUISAR CLIENTE OU PARCEIRO..." 
            className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-sm placeholder:text-slate-300 group-hover:border-slate-300" 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
          />
        </div>
      </div>
    </header>
  );
};