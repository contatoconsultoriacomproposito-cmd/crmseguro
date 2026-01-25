import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Search, Building2, ChevronLeft, Send, ShieldCheck } from 'lucide-react'; // Corrigido ShieldCheck

interface ModuloCotacaoProps {
  onBack: () => void;
  onSend: (dados: any) => void;
  maskCurrency: (val: string) => string;
}

export const ModuloCotacao: React.FC<ModuloCotacaoProps> = ({ onBack, onSend, maskCurrency }) => {
  // Removi o 'loading' não utilizado para limpar o aviso do TS
  const [seguradoraBusca, setSeguradoraBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  
  const [dados, setDados] = useState({
    seguradora: '',
    valorPremio: '',
    cobertura: ''
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha as sugestões se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca seguradoras na tabela public.base_seguradoras
  useEffect(() => {
    const buscarSeguradoras = async () => {
      if (seguradoraBusca.length < 2) {
        setSugestoes([]);
        return;
      }

      const { data, error } = await supabase
        .from('base_seguradoras')
        .select('nome, logo_url')
        .ilike('nome', `%${seguradoraBusca}%`)
        .eq('ativo', true)
        .limit(5);

      if (!error && data) {
        setSugestoes(data);
      }
    };

    const timer = setTimeout(buscarSeguradoras, 300);
    return () => clearTimeout(timer);
  }, [seguradoraBusca]);

  const handleSubmit = () => {
    if (!dados.seguradora || !dados.valorPremio) {
      alert("Por favor, preencha a seguradora e o valor.");
      return;
    }
    onSend(dados);
  };

  return (
    <div className="bg-slate-50 rounded-[2.5rem] p-8 border-2 border-indigo-100 shadow-inner">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-black uppercase text-[10px] tracking-widest"
        >
          <ChevronLeft size={18} /> Voltar
        </button>
        <h3 className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-3">
          <ShieldCheck className="text-indigo-600" size={24} /> Nova Cotação Técnica
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campo Seguradora com Autocomplete */}
        <div className="relative" ref={wrapperRef}>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Seguradora</label>
          <div className="relative">
            <input 
              type="text"
              value={seguradoraBusca}
              onChange={(e) => {
                setSeguradoraBusca(e.target.value);
                setShowSugestoes(true);
              }}
              placeholder="Digite o nome..."
              className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
            />
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          </div>

          {showSugestoes && sugestoes.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
              {sugestoes.map((s, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setDados({ ...dados, seguradora: s.nome });
                    setSeguradoraBusca(s.nome);
                    setShowSugestoes(false);
                  }}
                  className="w-full p-4 text-left hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                >
                  <Search size={14} className="text-indigo-400" />
                  <span className="font-bold text-slate-700 text-sm uppercase">{s.nome}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campo Valor do Prêmio */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Valor do Prêmio (R$)</label>
          <input 
            type="text"
            value={dados.valorPremio}
            onChange={(e) => setDados({ ...dados, valorPremio: maskCurrency(e.target.value) })}
            placeholder="0,00"
            className="w-full h-14 px-6 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-black text-indigo-600 text-lg"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Resumo de Coberturas</label>
          <textarea 
            rows={4}
            value={dados.cobertura}
            onChange={(e) => setDados({ ...dados, cobertura: e.target.value })}
            placeholder="Ex: Cobertura total para colisão, incêndio e roubo..."
            className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 outline-none transition-all font-medium text-slate-600 text-sm"
          />
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        className="w-full mt-8 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95"
      >
        <Send size={18} /> Enviar Cotação para o Parceiro
      </button>
    </div>
  );
};