import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { X, RefreshCcw, ExternalLink, Calendar, CheckCircle2, AlertCircle, Trash2, Link2, ArrowRightLeft } from "lucide-react";

const formatarDataBR = (dataStr: string | null) => {
  if (!dataStr) return "---";
  const date = new Date(dataStr + "T00:00:00Z");
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

interface ModalRenovacaoProps {
  isOpen: boolean;
  onClose: () => void;
  itemOriginal: { 
    id_item: string; 
    cliente: string; 
    cliente_id: string;
  };
  onSuccess: () => void;
}

export default function ModalRenovacao({ isOpen, onClose, itemOriginal, onSuccess }: ModalRenovacaoProps) {
  const [loading, setLoading] = useState(false);
  const [dadosAtuais, setDadosAtuais] = useState<any>(null);
  const [propostasCandidatas, setPropostasCandidatas] = useState<any[]>([]);
  const [selectedItemSucessorId, setSelectedItemSucessorId] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("Vendido");
  const [modoEdicao, setModoEdicao] = useState(false);

  // 1. BUSCA O ESTADO REAL DO ITEM (IMAGEM 1 VS IMAGEM 2)
  const fetchEstadoAtual = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tab_proposta_itens")
        .select(`
          status_renovacao, 
          proposta_sucessora_id,
          sucessora:proposta_sucessora_id (
            id,
            base_produtos ( nome ),
            tab_proposta_opcoes ( 
              tab_propostas ( numero_proposta ) 
            )
          )
        `)
        .eq("id", itemOriginal.id_item)
        .single();

      if (error) throw error;
      setDadosAtuais(data);
      
      // Se já está vinculado (Imagem 1), mostra o card verde. Se não (Imagem 2), abre busca.
      if (data?.status_renovacao === 'RENOVADO' && data?.proposta_sucessora_id) {
        setModoEdicao(false);
      } else {
        setModoEdicao(true);
      }
    } catch (err) {
      console.error("Erro ao buscar estado:", err);
    } finally {
      setLoading(false);
    }
  }, [itemOriginal.id_item]);

  // 2. BUSCA CANDIDATAS PARA VÍNCULO (LISTA DA IMAGEM 2)
  const fetchCandidatas = useCallback(async () => {
    try {
      const { data: propostas } = await supabase
        .from("tab_propostas")
        .select("id")
        .eq("cliente_id", itemOriginal.cliente_id)
        .eq("status", statusFiltro);

      const ids = propostas?.map(p => p.id) || [];
      
      const { data, error } = await supabase
        .from("tab_proposta_itens")
        .select(`
          id, data_inicio_vigencia, data_fim_vigencia,
          base_produtos ( nome ),
          tab_proposta_opcoes!inner ( 
            tab_propostas!inner ( numero_proposta, data_venda ) 
          )
        `)
        .in("tab_proposta_opcoes.proposta_id", ids)
        .neq("id", itemOriginal.id_item);

      if (error) throw error;
      setPropostasCandidatas(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [itemOriginal.cliente_id, itemOriginal.id_item, statusFiltro]);

  useEffect(() => {
    if (isOpen) {
      fetchEstadoAtual();
    }
  }, [isOpen, fetchEstadoAtual]);

  useEffect(() => {
    if (modoEdicao && isOpen) {
      fetchCandidatas();
    }
  }, [modoEdicao, statusFiltro, fetchCandidatas, isOpen]);

  // 3. AÇÃO DE SALVAR / EXCLUIR VÍNCULO
  async function handleAcao(novoStatus: 'RENOVADO' | 'PENDENTE' | 'NAO_RENOVADO', sucessoraId: string | null) {
    setLoading(true);
    try {
      // DEFINIMOS A REGRA: Só fica ativa se estiver PENDENTE
      const isNotificacaoAtiva = novoStatus === 'PENDENTE';

      const { error } = await supabase
        .from("tab_proposta_itens")
        .update({
          status_renovacao: novoStatus,
          proposta_sucessora_id: sucessoraId,
          // Se for renovado ou perdido, desativa a notificação para "limpar" a sidebar do corretor
          notificacao_ativa: isNotificacaoAtiva, 
          // Se for pendente (excluir vínculo), limpamos a data de renovação. 
          // Se for ação definitiva, registramos a data de hoje.
          data_renovacao: novoStatus === 'PENDENTE' ? null : new Date().toISOString().split('T')[0]
        })
        .eq("id", itemOriginal.id_item);

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao processar alteração:", err);
      alert("Erro ao processar alteração.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
        
        {/* HEADER CONFORME IMAGEM */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCcw size={18} className={`text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tighter">Vincular Renovação</h3>
            </div>
            <p className="text-[10px] text-blue-500 font-bold uppercase mt-1 italic leading-none">
              Cliente: {itemOriginal.cliente}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* INTERFACE DA IMAGEM 1: VÍNCULO JÁ EXISTENTE */}
          {dadosAtuais?.status_renovacao === 'RENOVADO' && dadosAtuais?.proposta_sucessora_id && !modoEdicao ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[32px] relative flex flex-col items-start min-h-[160px] justify-center">
                <div className="absolute top-4 left-6 bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                  Vínculo Confirmado
                </div>
                
                <div className="w-full flex justify-between items-center mt-4">
                  <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase italic mb-1 block">Proposta de Destino:</span>
                    <h4 className="text-xl font-black text-slate-700 tracking-tighter uppercase leading-tight">
                      {dadosAtuais.sucessora?.base_produtos?.nome}
                    </h4>
                    <span className="text-blue-600 text-lg font-black tracking-tighter">
                      PROP: {dadosAtuais.sucessora?.tab_proposta_opcoes?.[0]?.tab_propostas?.numero_proposta}
                    </span>
                  </div>
                  <Link2 size={48} className="text-emerald-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setModoEdicao(true)}
                  className="h-14 bg-white border-2 border-blue-100 text-blue-600 rounded-[20px] text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                >
                  <ArrowRightLeft size={18} /> Alterar Vínculo
                </button>
                <button 
                  onClick={() => handleAcao('PENDENTE', null)}
                  className="h-14 bg-white border-2 border-red-100 text-red-500 rounded-[20px] text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
                >
                  <Trash2 size={18} /> Excluir Vínculo
                </button>
              </div>
            </div>
          ) : (
            /* INTERFACE DA IMAGEM 2: BUSCANDO / NÃO VINCULADO */
            <div className="space-y-5 animate-in slide-in-from-bottom-2">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-center">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600 font-black">#</div>
                <p className="text-[10px] font-bold text-amber-700 leading-tight uppercase italic">
                  Selecione a nova proposta abaixo. O sistema vinculará o histórico ao item selecionado.
                </p>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase italic ml-2">Status da Busca:</label>
                <div className="flex gap-1">
                  {['Em Negociação', 'Vendido', 'Perdido'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFiltro(st)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                        statusFiltro === st 
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {propostasCandidatas.length === 0 && !loading ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                    <AlertCircle size={24} className="text-slate-300" />
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Nenhuma proposta encontrada.</p>
                  </div>
                ) : (
                  propostasCandidatas.map((item) => {
                    const prop = item.tab_proposta_opcoes?.tab_propostas;
                    const isSelected = selectedItemSucessorId === item.id;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedItemSucessorId(item.id)}
                        className={`relative p-5 rounded-[24px] border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100' 
                            : 'border-slate-100 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[9px] font-black text-blue-600 uppercase italic block mb-1">Vincular ao Produto:</span>
                            <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">
                              {item.base_produtos?.nome} — PROP: {prop?.numero_proposta}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 size={22} className="text-blue-500" />}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Calendar size={14} /></div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Data Venda</span>
                              <span className="text-[11px] font-bold text-slate-600">{formatarDataBR(prop?.data_venda)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col text-right justify-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Vigência</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                              {formatarDataBR(item.data_inicio_vigencia)} a {formatarDataBR(item.data_fim_vigencia)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  disabled={!selectedItemSucessorId || loading}
                  onClick={() => handleAcao('RENOVADO', selectedItemSucessorId)}
                  className="h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl text-[11px] font-black uppercase transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  Confirmar Renovação
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleAcao('NAO_RENOVADO', null)}
                  className="h-12 bg-white border border-slate-200 text-red-500 hover:bg-red-50 rounded-2xl text-[11px] font-black uppercase transition-all"
                >
                  Marcar Perda
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button 
            type="button"
            onClick={() => window.open('/propostas/novo', '_blank')}
            className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase flex items-center gap-1 transition-colors group"
          >
            <ExternalLink size={12} /> Não localizou? Criar nova proposta agora
          </button>
        </div>
      </div>
    </div>
  );
}