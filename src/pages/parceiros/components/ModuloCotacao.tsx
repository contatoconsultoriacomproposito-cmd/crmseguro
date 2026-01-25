import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Search, Building2, ChevronLeft, Send, ShieldCheck, FileUp, FileText, X } from 'lucide-react';

interface ModuloCotacaoProps {
  onBack: () => void;
  onSend: (dados: any) => void;
  maskCurrency: (val: string) => string;
}

export const ModuloCotacao: React.FC<ModuloCotacaoProps> = ({ onBack, onSend, maskCurrency }) => {
  const [seguradoraBusca, setSeguradoraBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Refatorado para bater exatamente com as colunas da tab_indicacoes_cotacoes
  const [dados, setDados] = useState({
    seguradora: '',
    valor_premio: '',          // Corrigido de valorPremio
    coberturas_principais: '', // Corrigido de cobertura
    url_documento: '',         // Corrigido de pdfUrl
    pdfPath: '', 
    nomeArquivo: ''
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      if (!error && data) setSugestoes(data);
    };
    const timer = setTimeout(buscarSeguradoras, 300);
    return () => clearTimeout(timer);
  }, [seguradoraBusca]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        alert("Por favor, envie apenas arquivos PDF.");
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      // Gerando nome único para evitar conflitos no Storage
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `cotacoes_tecnicas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_indicacoes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_indicacoes')
        .getPublicUrl(filePath);

      setDados({ 
        ...dados, 
        url_documento: publicUrl, // Agora preenche o campo correto
        pdfPath: filePath,
        nomeArquivo: file.name 
      });

    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!dados.seguradora || !dados.valor_premio) {
      alert("Preencha seguradora e valor.");
      return;
    }
    if (!dados.url_documento) {
      alert("É obrigatório anexar o PDF da cotação para o parceiro.");
      return;
    }
    onSend(dados);
  };

  return (
    <div className="bg-slate-50 rounded-[2.5rem] p-8 border-2 border-indigo-100 shadow-inner animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ChevronLeft size={18} /> Voltar
        </button>
        <h3 className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-3">
          <ShieldCheck className="text-indigo-600" size={24} /> Nova Cotação Técnica
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Campo Seguradora */}
        <div className="relative" ref={wrapperRef}>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Seguradora</label>
          <div className="relative">
            <input 
              type="text"
              value={seguradoraBusca}
              onChange={(e) => { setSeguradoraBusca(e.target.value); setShowSugestoes(true); }}
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
            value={dados.valor_premio}
            onChange={(e) => setDados({ ...dados, valor_premio: maskCurrency(e.target.value) })}
            placeholder="0,00"
            className="w-full h-14 px-6 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-black text-indigo-600 text-lg"
          />
        </div>

        {/* Campo Resumo de Coberturas */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Resumo de Coberturas</label>
          <textarea 
            rows={3}
            value={dados.coberturas_principais}
            onChange={(e) => setDados({ ...dados, coberturas_principais: e.target.value })}
            placeholder="Ex: Cobertura total para colisão, incêndio e roubo..."
            className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 outline-none transition-all font-medium text-slate-600 text-sm"
          />
        </div>

        {/* UPLOAD DE PDF */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Anexar Documento da Cotação (PDF)</label>
          
          {!dados.url_documento ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`w-full py-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all ${
                uploading ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30'
              }`}
            >
              {uploading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Subindo arquivo...</span>
                </div>
              ) : (
                <>
                  <FileUp size={32} className="text-indigo-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Clique para selecionar o PDF da Seguradora</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase">Arquivo Anexado</p>
                  <p className="text-xs font-bold text-slate-700 truncate max-w-[250px]">{dados.nomeArquivo}</p>
                </div>
              </div>
              <button 
                onClick={() => setDados({ ...dados, url_documento: '', pdfPath: '', nomeArquivo: '' })}
                className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".pdf" 
            className="hidden" 
          />
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={uploading}
        className="w-full mt-8 h-16 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95"
      >
        <Send size={18} /> Enviar Cotação para o Parceiro
      </button>
    </div>
  );
};