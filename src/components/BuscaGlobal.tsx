import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BuscaGlobalProps {
  onSearch: (termo: string) => void;
  placeholder?: string;
}

export const BuscaGlobal = ({ onSearch, placeholder = "Buscar por nome, CPF/CNPJ, e-mail..." }: BuscaGlobalProps) => {
  const [termo, setTermo] = useState('');

  // Debounce: Espera 500ms após o usuário parar de digitar para disparar a busca
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onSearch(termo);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [termo]);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search size={18} className="text-slate-400" />
      </div>
      <input
        type="text"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-12 pr-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
      />
      {termo && (
        <button 
          onClick={() => setTermo('')}
          className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};