import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
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
  const [horarioRetorno, setHorarioRetorno] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: sData, error: sError } = await supabase
        .from('tab_sinistros')
        .select('*, tab_proposta_itens(base_produtos(nome))')
        .eq('id', sinistroId)
        .single();
      
      if (sError) throw sError;
      
      setSinistro(sData);
      setNovaEtapa(sData.etapa_atual);

      const { data: oData } = await supabase
        .from('tab_sinistros_ocorrencias')
        .select('*')
        .eq('sinistro_id', sinistroId)
        .order('criado_em', { ascending: false });

      setOcorrencias(oData || []);

      if (oData && oData.length > 0) {
        if (oData[0].data_retorno) setDataRetorno(oData[0].data_retorno);
        if (oData[0].horario_retorno) setHorarioRetorno(oData[0].horario_retorno);
      }
    } catch (error: any) {
      console.error("Erro ao carregar:", error);
      setErro("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [sinistroId]);

  const handleAtualizar = async () => {
    if (!relato.trim()) {
      setErro("Descreva o que foi feito nesta atualização.");
      return;
    }

    if (['Cadastro', 'Avaliação', 'Solução', 'Conclusão'].includes(novaEtapa) && !dataRetorno) {
      setErro(`Informe a data para a fase de ${novaEtapa}.`);
      return;
    }
    
    setEnviando(true);
    setErro(null);

    try {
      const isFinalizando = novaEtapa === 'Conclusão';

      // 1. Gravação na tab_sinistros_ocorrencias
      const { error: errOco } = await supabase
        .from('tab_sinistros_ocorrencias')
        .insert({
          sinistro_id: sinistroId,
          etapa: novaEtapa,
          relato: relato,
          data_retorno: dataRetorno || null,
          horario_retorno: horarioRetorno || null,
          data_ocorrencia: new Date().toISOString().split('T')[0]
        });

      if (errOco) throw new Error(`Erro ao gravar histórico: ${errOco.message}`);

      // 2. Atualização na tab_clientes (Para disparar o Webhook da Agenda)
      if (sinistro?.cliente_id) {
        const { error: errCli } = await supabase
          .from('tab_clientes')
          .update({
            data_retorno_sinistro: isFinalizando ? null : (dataRetorno || null),
            horario_retorno_sinistro: isFinalizando ? null : (horarioRetorno || null)
          })
          .eq('id', sinistro.cliente_id);
        
        if (errCli) throw new Error(`Erro ao atualizar agenda do cliente: ${errCli.message}`);
      }

      // 3. ATUALIZAÇÃO DA TABELA MESTRA (tab_sinistros) - CORREÇÃO DOS BUGS
      const { error: errSin } = await supabase
        .from('tab_sinistros')
        .update({
          etapa_atual: novaEtapa, // Atualiza a bolinha no timeline
          status: isFinalizando ? 'Encerrado' : 'Aberto', // Finaliza o sinistro
          data_conclusao: isFinalizando ? new Date().toISOString() : null // Grava data de fim
        })
        .eq('id', sinistroId);

      if (errSin) throw new Error(`Erro ao atualizar status do sinistro: ${errSin.message}`);

      setSalvo(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (error: any) {
      setErro(error.message);
      console.error("Erro completo no processo:", error);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return null;
  const etapaAtivaIdx = ETAPAS.indexOf(sinistro?.etapa_atual || 'Abertura');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              Gerenciar Sinistro
            </h2>
            <p className="text-[10px] font-bold text-red-500 uppercase">
              {sinistro?.tab_proposta_itens?.base_produtos?.nome || 'Produto'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {salvo ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic">Sucesso!</h3>
          </div>
        ) : (
          <div className="p-8 overflow-y-auto max-h-[75vh]">
            
            {erro && (
              <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-bold uppercase">{erro}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="relative flex justify-between mb-12 px-4">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-zinc-800 -translate-y-1/2" />
              {ETAPAS.map((step, idx) => {
                const isAtivo = idx <= etapaAtivaIdx;
                const isConcluido = idx < etapaAtivaIdx;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isAtivo ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-zinc-900 border-slate-200 text-slate-300'
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
              {/* Histórico */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <Clock size={14} /> Histórico
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {ocorrencias.map((oco) => (
                    <div key={oco.id} className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase">{oco.etapa}</span>
                        <span className="text-[8px] font-bold text-slate-400">{formatarDataBR(oco.criado_em)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">"{oco.relato}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4 bg-slate-50 dark:bg-zinc-800/30 p-5 rounded-[24px]">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Etapa:</label>
                  <select 
                    value={novaEtapa}
                    onChange={(e) => { setNovaEtapa(e.target.value); setErro(null); }}
                    className="w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-bold outline-none ring-1 ring-slate-200"
                  >
                    {ETAPAS.map(e => (
                      <option key={e} value={e} disabled={e === 'Abertura'}>{e}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data Retorno:</label>
                    <input 
                      type="date"
                      value={dataRetorno}
                      onChange={(e) => { setDataRetorno(e.target.value); setErro(null); }}
                      className="w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-bold ring-1 ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Horário:</label>
                    <input 
                      type="time"
                      value={horarioRetorno}
                      onChange={(e) => { setHorarioRetorno(e.target.value); setErro(null); }}
                      className="w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-bold ring-1 ring-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Relato:</label>
                  <textarea 
                    value={relato}
                    onChange={(e) => { setRelato(e.target.value); setErro(null); }}
                    // Bloqueia a propagação para que o Dashboard não intercepte as teclas
                    onKeyDown={(e) => e.stopPropagation()} 
                    className="w-full mt-1 p-3 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-medium h-24 resize-none ring-1 ring-slate-200"
                  />
                </div>

                <button
                  onClick={handleAtualizar}
                  disabled={enviando || sinistro?.status === 'Encerrado'} 
                  className="w-full py-4 rounded-2xl text-[11px] font-black uppercase bg-slate-900 text-white hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {enviando ? "Processando..." : "Salvar Atualização"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};