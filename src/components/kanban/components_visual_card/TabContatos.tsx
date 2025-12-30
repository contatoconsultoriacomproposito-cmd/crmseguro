import { useState, useEffect } from 'react';
import { MessageSquare, Calendar, ChevronLeft, ChevronRight, Eye, EyeOff, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatarDataBR } from '../../../utils/dateUtils';
import { ModalInclusaoAcao } from '../ModalInclusaoAcao';

export const TabContatos = ({ clienteId, onUpdate }: { clienteId: string, onUpdate: () => void }) => {
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [indiceAcao, setIndiceAcao] = useState(0);
  const [verRelatoCompleto, setVerRelatoCompleto] = useState(false);
  const [exibirModalAcao, setExibirModalAcao] = useState(false);

  const fetchHistorico = async () => {
    if (!clienteId) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('tab_interacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_historico', { ascending: false })
        .order('horario_historico', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { fetchHistorico(); }, [clienteId]);

  const acaoAtual = historico[indiceAcao];

  return (
    <div className="flex flex-col">
      {carregando ? (
        <div className="flex items-center justify-center h-20 text-[10px] font-bold text-slate-400 animate-pulse uppercase">Carregando...</div>
      ) : acaoAtual ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-blue-600 uppercase">{acaoAtual.tipo_acao}</span>
            <span className="text-[9px] text-slate-400">{formatarDataBR(acaoAtual.criado_em)}</span>
          </div>

          <div className="relative">
            <p className={`text-[15px] text-slate-600 leading-relaxed ${!verRelatoCompleto ? 'line-clamp-3' : 'whitespace-pre-wrap'}`}>
              "{acaoAtual.relato}"
            </p>
            {acaoAtual.relato?.length > 100 && (
              <button onClick={() => setVerRelatoCompleto(!verRelatoCompleto)} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-blue-500 uppercase">
                {verRelatoCompleto ? <><EyeOff size={12} /> Recolher</> : <><Eye size={12} /> Ler tudo</>}
              </button>
            )}
          </div>

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50">
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[12px] font-bold text-slate-400">
                {new Date(acaoAtual.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
              </span>
            </div>
            <div className="flex gap-1">
              <button disabled={indiceAcao === historico.length - 1} onClick={() => setIndiceAcao(prev => prev + 1)} className="p-1 hover:bg-white rounded border disabled:opacity-30"><ChevronLeft size={18} /></button>
              <button disabled={indiceAcao === 0} onClick={() => setIndiceAcao(prev => prev - 1)} className="p-1 hover:bg-white rounded border disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-20 text-slate-400">
          <MessageSquare size={20} className="mb-1 opacity-20" />
          <span className="text-[9px] uppercase font-bold">Sem histórico</span>
        </div>
      )}

      <button onClick={() => setExibirModalAcao(true)} className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 rounded-lg transition-all">
        <Plus size={18} strokeWidth={2.5} />
        <span className="text-sm font-bold uppercase">Incluir Novo Contato</span>
      </button>

      {exibirModalAcao && (
        <ModalInclusaoAcao 
          clienteId={clienteId} 
          onClose={() => setExibirModalAcao(false)} 
          onSuccess={() => { fetchHistorico(); onUpdate(); }} 
        />
      )}
    </div>
  );
};