// src/pages/portal/components/ModalDetalhes.tsx
import { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, PartyPopper, CheckCircle2, DollarSign, Clock, ThumbsDown, ThumbsUp, Save, User, ShieldCheck, Phone, Mail, MessageSquare } from "lucide-react";
import { UploadArea } from "./UploadArea";
import { maskCPF, maskCNPJ, maskPhone } from "../../../utils/masks";

interface ModalProps {
  detalheCotacao: any;
  onClose: () => void;
  recusando: boolean;
  setRecusando: (v: boolean) => void;
  confirmandoAceite: boolean;
  setConfirmandoAceite: (v: boolean) => void;
  motivoRecusa: string;
  setMotivoRecusa: (v: string) => void;
  respondendo: boolean;
  onResponder: (status: any) => void;
  documentos: any;
  setDocumentos: (docs: any) => void;
  onSingleUpload: (tipo: string, arquivo: File) => void;
  onSaveEdits: (dados: any) => Promise<void>; 
}

export const ModalDetalhes = ({ 
  detalheCotacao, onClose, recusando, setRecusando, confirmandoAceite, setConfirmandoAceite,
  motivoRecusa, setMotivoRecusa, respondendo, onResponder, documentos, setDocumentos, onSingleUpload, onSaveEdits 
}: ModalProps) => {
  
  // Estado local para controlar os inputs de edição
  const [editForm, setEditForm] = useState<any>(null);

  // Sincroniza o estado local quando o modal abre ou a cotação muda
  useEffect(() => {
    if (detalheCotacao) {
      setEditForm({ ...detalheCotacao });
    }
  }, [detalheCotacao]);

  if (!detalheCotacao || !editForm) return null;

  const isNovo = detalheCotacao.status_indicacao === 'NOVO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Header Modal - Dinâmico por Status */}
        <div className={`p-8 ${isNovo ? 'bg-slate-900' : ['PERDIDO', 'RECUSA_PARCEIRO', 'RECUSA_CORRETOR'].includes(detalheCotacao.status_indicacao) ? 'bg-red-500' : detalheCotacao.status_indicacao === 'VENDIDO' ? 'bg-emerald-600' : 'bg-slate-900'} text-white flex justify-between items-center`}>
          <div>
            <h3 className="text-lg font-black uppercase italic truncate max-w-[200px]">
              {isNovo ? "Editar Indicação" : detalheCotacao.nome_cliente}
            </h3>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
              {detalheCotacao.produto_interesse}
            </span>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="p-8">
          {/* FLUXO DE RECUSA */}
          {recusando ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={20}/>
                <h4 className="font-black uppercase text-xs italic">Por que recusar?</h4>
              </div>
              <select 
                value={motivoRecusa} 
                onChange={(e) => setMotivoRecusa(e.target.value)} 
                className="w-full h-14 px-5 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold text-xs outline-none focus:border-red-500"
              >
                <option value="">Selecione o motivo...</option>
                <option value="CLIENTE ACHOU CARO">CLIENTE ACHOU CARO</option>
                <option value="CLIENTE FECHOU COM OUTRO">CLIENTE FECHOU COM OUTRO</option>
                <option value="COBERTURAS INSUFICIENTES">COBERTURAS INSUFICIENTES</option>
                <option value="CLIENTE DESISTIU">CLIENTE DESISTIU</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setRecusando(false)} className="h-14 font-black uppercase text-[10px] text-slate-400">Voltar</button>
                <button 
                  disabled={!motivoRecusa || respondendo} 
                  onClick={() => onResponder('RECUSA_PARCEIRO')} 
                  className="h-14 bg-red-500 text-white rounded-xl font-black uppercase text-[10px]"
                >
                  {respondendo ? <Loader2 className="animate-spin mx-auto"/> : "Confirmar Recusa"}
                </button>
              </div>
            </div>
          ) : 
          /* FLUXO DE ACEITE */
          confirmandoAceite ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <PartyPopper size={40} />
              </div>
              <h4 className="text-xl font-black uppercase italic text-slate-800">Parabéns!</h4>
              <p className="text-slate-500 text-[10px] font-bold uppercase leading-relaxed px-4">
                O corretor será notificado para emitir a proposta agora.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => setConfirmandoAceite(false)} className="h-14 font-black uppercase text-[10px] text-slate-400">Voltar</button>
                <button 
                  disabled={respondendo} 
                  onClick={() => onResponder('APROVADA_PARCEIRO')} 
                  className="h-14 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2"
                >
                  {respondendo ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={16}/>} CONFIRMAR
                </button>
              </div>
            </div>
          ) : (
            /* CONTEÚDO PRINCIPAL (EDIÇÃO OU VISUALIZAÇÃO) */
            <div className="space-y-6">
              {detalheCotacao.status_indicacao === 'VENDIDO' ? (
                /* VISUALIZAÇÃO VENDIDO / COMISSÃO */
                <div className="space-y-4">
                  <div className="p-5 bg-emerald-600 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-[9px] font-black uppercase opacity-70 mb-1">Sua Comissão</p>
                      <p className="text-2xl font-black italic">
                        R$ {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.comissao_parceiro?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="mt-4 flex justify-between items-center border-t border-white/20 pt-4">
                        <div>
                          <p className="text-[7px] font-black uppercase opacity-70">Previsão Pagamento</p>
                          <p className="text-[11px] font-black">
                            {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.data_previsao_comissao 
                              ? new Date(detalheCotacao.tab_indicacoes_cotacoes[0].data_previsao_comissao).toLocaleDateString() 
                              : 'A DEFINIR'}
                          </p>
                        </div>
                        <div className="bg-white text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">
                          {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.status_comissao_parceiro || 'PENDENTE'}
                        </div>
                      </div>
                    </div>
                    <DollarSign size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
                  </div>
                  <button onClick={onClose} className="w-full h-14 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                </div>
              ) : isNovo ? (
                /* MODO EDIÇÃO (STATUS RECEBIDO/NOVO) */
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                    <Clock className="text-amber-600 shrink-0" size={16}/>
                    <p className="text-[8px] text-amber-700 font-bold uppercase leading-tight">
                      Modo Edição: Você pode atualizar os dados e documentos antes do início da cotação.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 font-bold text-[10px] uppercase border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
                        value={editForm.nome_cliente} 
                        onChange={e => setEditForm({...editForm, nome_cliente: e.target.value})} 
                        placeholder="NOME DO CLIENTE"
                      />
                    </div>

                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 font-bold text-[10px] border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
                        value={editForm.documento_cliente} 
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setEditForm({...editForm, documento_cliente: raw.length <= 11 ? maskCPF(raw) : maskCNPJ(raw)});
                        }} 
                        placeholder="CPF/CNPJ"
                      />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 font-bold text-[10px] border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
                        value={editForm.telefone_cliente} 
                        onChange={e => setEditForm({...editForm, telefone_cliente: maskPhone(e.target.value)})} 
                        placeholder="WHATSAPP"
                      />
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 font-bold text-[10px] border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
                        value={editForm.email_cliente} 
                        onChange={e => setEditForm({...editForm, email_cliente: e.target.value})} 
                        placeholder="EMAIL"
                      />
                    </div>

                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-3 text-slate-300" size={14} />
                      <textarea 
                        rows={2} 
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 font-bold text-[10px] border-2 border-transparent focus:border-blue-500 outline-none transition-all resize-none" 
                        value={editForm.obs_indicacao} 
                        onChange={e => setEditForm({...editForm, obs_indicacao: e.target.value})} 
                        placeholder="OBSERVAÇÕES"
                      />
                    </div>
                  </div>

                  <UploadArea 
                    documentos={documentos}
                    setDocumentos={setDocumentos}
                    onSingleUpload={onSingleUpload}
                    documentosSalvos={detalheCotacao.tab_indicacoes_documentos || []}
                    />

                  <button 
                    onClick={() => onSaveEdits(editForm)}
                    disabled={respondendo}
                    className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    {respondendo ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Salvar Alterações</>}
                  </button>
                </div>
              ) : (
                /* VISUALIZAÇÃO PADRÃO (COTADO, PERDIDO, ETC) */
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Seguradora</p>
                      <p className="font-black text-slate-800 uppercase text-xs truncate">
                        {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.seguradora || '---'}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Investimento</p>
                      <p className="font-black text-blue-600 text-sm">
                        R$ {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.valor_premio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Coberturas</p>
                    <p className="text-[10px] font-bold text-slate-600 italic leading-relaxed">
                      "{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.coberturas_principais || 'Nenhuma cobertura detalhada informada.'}"
                    </p>
                  </div>

                  {detalheCotacao.status_indicacao === 'COTADO' ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => setRecusando(true)} className="h-14 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1 transition-all hover:bg-red-100"><ThumbsDown size={14}/> Recusar</button>
                      <button onClick={() => setConfirmandoAceite(true)} className="h-14 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1 shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-600"><ThumbsUp size={14}/> Aceitar</button>
                    </div>
                  ) : ['PERDIDO', 'RECUSA_PARCEIRO', 'RECUSA_CORRETOR'].includes(detalheCotacao.status_indicacao) ? (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                      <p className="text-[8px] font-black text-red-400 uppercase mb-1">Motivo da Recusa/Perda</p>
                      <p className="font-black text-red-600 text-[10px] uppercase">
                        {detalheCotacao.motivo_perda || detalheCotacao.tab_indicacoes_cotacoes?.[0]?.motivo_recusa || 'INFORMAÇÃO NÃO DISPONÍVEL'}
                      </p>
                    </div>
                  ) : (
                    <button onClick={onClose} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px]">Fechar Detalhes</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};