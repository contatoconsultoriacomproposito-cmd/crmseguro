import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Calendar, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatarDataBR } from '../../../utils/dateUtils';

interface Props {
  sinistroId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ETAPAS = ['Abertura', 'Cadastro', 'Avaliação', 'Solução', 'Conclusão'];

export const ModalGerenciamentoSinistro = ({ sinistroId, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  const [sinistro, setSinistro] = useState<any>(null);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  
  const [novaEtapa, setNovaEtapa] = useState('');
  const [relato, setRelato] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: sData } = await supabase
        .from('tab_sinistros')
        .select('*, tab_proposta_itens(base_produtos(nome))')
        .eq('id', sinistroId)
        .single();
      
      setSinistro(sData);
      setNovaEtapa(sData.etapa_atual);

      const { data: oData } = await supabase
        .from('tab_sinistros_ocorrencias')
        .select('*')
        .eq('sinistro_id', sinistroId)
        .order('criado_em', { ascending: false });

      const listaOcorrencias = oData || [];
      setOcorrencias(listaOcorrencias);

      if (listaOcorrencias.length > 0 && listaOcorrencias[0].data_retorno) {
        setDataRetorno(listaOcorrencias[0].data_retorno);
      }
    } catch (error) {
      console.error(error);
      setErro("Erro ao carregar dados do sinistro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [sinistroId]);

  const handleAtualizar = async () => {
    // Validações visuais substituindo alerts
    if (!relato.trim()) {
      setErro("Descreva o que foi feito nesta atualização.");
      return;
    }

    if (novaEtapa === 'Conclusão' && !dataRetorno) {
      setErro("Para finalizar o sinistro, você deve informar a Data de Conclusão.");
      return;
    }

    if (['Cadastro', 'Avaliação', 'Solução'].includes(novaEtapa) && !dataRetorno) {
      setErro(`Por favor, informe uma data de retorno para a fase de ${novaEtapa}.`);
      return;
    }
    
    setEnviando(true);
    setErro(null);
    const isFinalizando = novaEtapa === 'Conclusão';

    try {
      const { error: errOco } = await supabase
        .from('tab_sinistros_ocorrencias')
        .insert([{
          sinistro_id: sinistroId,
          etapa: novaEtapa,
          relato: relato,
          data_retorno: dataRetorno || null,
          data_ocorrencia: new Date()
        }]);

      if (errOco) throw errOco;

      const { error: errSin } = await supabase
        .from('tab_sinistros')
        .update({
          etapa_atual: novaEtapa,
          status: isFinalizando ? 'Encerrado' : 'Aberto',
          data_conclusao: isFinalizando ? dataRetorno : null
        })
        .eq('id', sinistroId);

      if (errSin) throw errSin;

      setSalvo(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      setErro("Erro ao processar: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return null;

  const etapaAtivaIdx = ETAPAS.indexOf(sinistro?.etapa_atual || 'Abertura');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 transition-all">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              Gerenciar Sinistro/Assistência
            </h2>
            <p className="text-[10px] font-bold text-red-500 uppercase">
              {sinistro?.tab_proposta_itens?.base_produtos?.nome || 'Produto não identificado'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {salvo ? (
          <div className="p-20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic">Sucesso!</h3>
            <p className="text-sm text-slate-500">O sinistro foi atualizado corretamente.</p>
          </div>
        ) : (
          <div className="p-8 overflow-y-auto max-h-[75vh]">
            
            {/* Mensagem de Erro Elegante */}
            {erro && (
              <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-bold uppercase">{erro}</p>
              </div>
            )}

            {/* Timeline Horizontal */}
            <div className="relative flex justify-between mb-12 px-4">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-zinc-800 -translate-y-1/2" />
              {ETAPAS.map((step, idx) => {
                const isAtivo = idx <= etapaAtivaIdx;
                const isConcluido = idx < etapaAtivaIdx;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isAtivo ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white dark:bg-zinc-900 border-slate-200 text-slate-300'
                    }`}>
                      {isConcluido ? <CheckCircle2 size={18} /> : <span className="text-xs font-black">{idx + 1}</span>}
                    </div>
                    <span className={`absolute -bottom-6 text-[9px] font-black uppercase tracking-tight ${isAtivo ? 'text-blue-600' : 'text-slate-300'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Coluna da Esquerda: Histórico */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <Clock size={14} /> Histórico de Ações
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {ocorrencias.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic">Nenhum registro encontrado.</p>
                  )}
                  {ocorrencias.map((oco) => (
                    <div key={oco.id} className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase">{oco.etapa}</span>
                        <span className="text-[8px] font-bold text-slate-400">{formatarDataBR(oco.criado_em)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">"{oco.relato}"</p>
                      {oco.data_retorno && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full w-fit">
                          <Calendar size={10} /> Retorno: {formatarDataBR(oco.data_retorno)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna da Direita: Formulário */}
              <div className="space-y-4 bg-slate-50 dark:bg-zinc-800/30 p-5 rounded-[24px] border border-slate-100 dark:border-zinc-800">
                <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <Send size={14} /> Nova Atualização
                </h3>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mudar para Etapa:</label>
                  <select 
                    value={novaEtapa}
                    onChange={(e) => { setNovaEtapa(e.target.value); setErro(null); }}
                    className="w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-bold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {ETAPAS.map(e => (
                      <option key={e} value={e} disabled={e === 'Abertura'}>{e}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">
                    {novaEtapa === 'Conclusão' ? 'Data de Conclusão (Obrigatório):' : 'Agendar Retorno (Opcional):'}
                  </label>
                  <input 
                    type="date"
                    value={dataRetorno}
                    onChange={(e) => { setDataRetorno(e.target.value); setErro(null); }}
                    className={`w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-bold outline-none ring-1 transition-all ${
                      novaEtapa === 'Conclusão' && !dataRetorno ? 'ring-red-400 bg-red-50' : 'ring-slate-200 focus:ring-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Relato da Ação:</label>
                  <textarea 
                    value={relato}
                    onChange={(e) => { setRelato(e.target.value); setErro(null); }}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="O que aconteceu nesta fase?"
                    className="w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-medium h-24 resize-none outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleAtualizar}
                  disabled={enviando || sinistro?.status === 'Encerrado'} 
                  className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
                    sinistro?.status === 'Encerrado'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : novaEtapa === 'Conclusão' 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' 
                        : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800'
                  }`}
                >
                  {enviando ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : sinistro?.status === 'Encerrado' 
                    ? 'Sinistro já Concluído' 
                    : novaEtapa === 'Conclusão' 
                      ? 'Finalizar e Concluir Sinistro' 
                      : 'Salvar Atualização'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};