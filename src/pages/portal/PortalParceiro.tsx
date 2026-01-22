import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabasePublic as supabase } from "../../lib/supabaseClient";
import { 
  Send, Loader2, CheckCircle2, 
  ShieldCheck, History, ChevronRight, 
  X, DollarSign, Upload, User, Phone, Mail, MessageSquare,
  Clock, Ban, Info, ThumbsUp, ThumbsDown, AlertCircle, PartyPopper
} from "lucide-react";
import { maskPhone } from "../../utils/masks";

export default function PortalParceiro() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [parceiro, setParceiro] = useState<any>(null);
  const [sent, setSent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [respondendo, setRespondendo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'NOVA' | 'HISTORICO'>('NOVA');
  const [historico, setHistorico] = useState<any[]>([]);
  const [detalheCotacao, setDetalheCotacao] = useState<any>(null);

  // Estados para UX de Aceite/Recusa
  const [confirmandoAceite, setConfirmandoAceite] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  const [form, setForm] = useState({
    nome_cliente: "",
    telefone_cliente: "",
    email_cliente: "",
    produto_interesse: "",
    obs_indicacao: ""
  });
  const [arquivos, setArquivos] = useState<File[]>([]);

  const carregarHistorico = useCallback(async (parceiroId: string) => {
    try {
        // Forçamos a query a ignorar filtros de usuário autenticado nas RLS
        // usando apenas o parceiro_id como chave de acesso
        const { data: indicacoes, error: errInd } = await supabase
        .from("tab_indicacoes")
        .select(`*, tab_indicacoes_cotacoes (*)`)
        .eq("parceiro_id", parceiroId)
        .order("created_at", { ascending: false });

        if (errInd) throw errInd;
        setHistorico(indicacoes || []);
    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
    }
    }, []);

  useEffect(() => {
    async function inicializarPortal() {
      if (!slug) return;
      try {
        const { data, error } = await supabase
          .from("tab_parceiros")
          .select("id, nome_parceiro, corretora_id, corretor_id")
          .eq("slug_link", slug)
          .single();

        if (error) throw error;
        setParceiro(data);
        await carregarHistorico(data.id);
      } catch (err) {
        console.error("Erro ao carregar portal");
      } finally {
        setLoading(false);
      }
    }
    inicializarPortal();
  }, [slug, carregarHistorico]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parceiro) return;
    setEnviando(true);
    try {
      const { data: novaIndicacao, error: errorIns } = await supabase
        .from("tab_indicacoes")
        .insert([{
          parceiro_id: parceiro.id,
          corretora_id: parceiro.corretora_id,
          corretor_id: parceiro.corretor_id,
          nome_cliente: form.nome_cliente.toUpperCase(),
          telefone_cliente: form.telefone_cliente,
          email_cliente: form.email_cliente.toLowerCase(),
          produto_interesse: form.produto_interesse,
          obs_indicacao: form.obs_indicacao,
          origem_url: slug,
          status_indicacao: 'NOVO'
        }])
        .select().single();

      if (errorIns) throw errorIns;

      if (arquivos.length > 0 && novaIndicacao) {
        for (const file of arquivos) {
          const fileName = `${novaIndicacao.id}/${Date.now()}-${file.name}`;
          await supabase.storage.from('documentos_indicacoes').upload(fileName, file);
        }
      }
      setSent(true);
      await carregarHistorico(parceiro.id);
    } catch (err) {
      alert("Erro ao enviar indicação.");
    } finally {
      setEnviando(false);
    }
  };

  const responderCotacao = async (novoStatus: 'APROVADA_PARCEIRO' | 'RECUSA_PARCEIRO') => {
  if (!detalheCotacao || !parceiro) return;
  
  if (novoStatus === 'RECUSA_PARCEIRO' && !motivoRecusa) {
    alert("Por favor, selecione um motivo para a recusa.");
    return;
  }

  setRespondendo(true);
  try {
    const statusIndicacaoPrincipal = novoStatus === 'RECUSA_PARCEIRO' ? 'PERDIDO' : 'APROVADA_PARCEIRO';

    // 1. ATUALIZA A TABELA PAI (tab_indicacoes)
    // Aqui gravamos o motivo em 'motivo_perda'
    const { error: errIndicacao } = await supabase
      .from("tab_indicacoes")
      .update({ 
        status_indicacao: statusIndicacaoPrincipal,
        motivo_perda: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null
      })
      .eq("id", detalheCotacao.id);

    if (errIndicacao) throw errIndicacao;

    // 2. ATUALIZA A TABELA FILHA (tab_indicacoes_cotacoes)
    // É AQUI que o status da comissão deve mudar para 'NEGADA'
    const cotacoes = detalheCotacao.tab_indicacoes_cotacoes;
    
    if (Array.isArray(cotacoes) && cotacoes.length > 0) {
      const cotacaoId = cotacoes[0].id;
      
      console.log("Atualizando cotação ID:", cotacaoId); // LOG PARA DEBUG

      const { error: errCotacao } = await supabase
        .from("tab_indicacoes_cotacoes")
        .update({
          status_feedback: novoStatus === 'RECUSA_PARCEIRO' ? 'RECUSADO' : 'APROVADO',
          motivo_recusa: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null, // NOME CORRETO DA COLUNA NA SUA TABELA
          status_comissao_parceiro: novoStatus === 'RECUSA_PARCEIRO' ? 'NEGADA' : 'PENDENTE'
        })
        .eq("id", cotacaoId);

      if (errCotacao) {
        console.error("Erro na tabela de cotações:", errCotacao);
        throw new Error("Erro ao atualizar dados da comissão/recusa.");
      }
    } else {
      console.warn("Nenhuma cotação encontrada para vincular a recusa.");
    }

    // 3. LIMPEZA E FEEDBACK
    setDetalheCotacao(null);
    setConfirmandoAceite(false);
    setRecusando(false);
    setMotivoRecusa("");
    
    await carregarHistorico(parceiro.id);
    alert(novoStatus === 'RECUSA_PARCEIRO' ? "Recusado e comissão cancelada." : "Sucesso!");
    
  } catch (err: any) {
    console.error("Erro geral:", err);
    alert("Falha: " + err.message);
  } finally {
    setRespondendo(false);
  }
};

  const getStatusInfo = (status: string) => {
    switch(status) {
        case 'NOVO': return { label: 'RECEBIDO', color: 'bg-amber-100 text-amber-600', icon: <Clock size={10}/> };
        case 'EM_ATENDIMENTO': return { label: 'COTAÇÃO INICIADA', color: 'bg-blue-100 text-blue-600', icon: <Loader2 size={10} className="animate-spin"/> };
        case 'COTADO': return { label: 'COTAÇÃO REALIZADA', color: 'bg-emerald-500 text-white animate-bounce', icon: <CheckCircle2 size={10}/> };
        case 'APROVADA_PARCEIRO': return { label: 'COTAÇÃO ACEITA', color: 'bg-blue-600 text-white', icon: <ThumbsUp size={10}/> };
        
        // NOVOS STATUS DE RECUSA DEFINIDOS POR VOCÊ:
        case 'RECUSA_CORRETOR': return { label: 'RECUSA CORRETOR', color: 'bg-red-50 text-red-500', icon: <Ban size={10}/> };
        case 'RECUSA_PARCEIRO': return { label: 'RECUSA PARCEIRO', color: 'bg-red-100 text-red-600', icon: <Ban size={10}/> };
        
        case 'PERDIDO': return { label: 'NÃO ATENDIDO', color: 'bg-red-50 text-red-500', icon: <Ban size={10}/> };
        case 'VENDIDO': return { label: 'CONCLUÍDO', color: 'bg-emerald-600 text-white', icon: <PartyPopper size={10}/> };
        default: return { label: status, color: 'bg-slate-100 text-slate-500', icon: null };
        }
    };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* HEADER */}
      <div className="bg-zinc-900 text-white pt-16 pb-24 px-6 text-center rounded-b-[4rem] shadow-2xl relative">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg rotate-3">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Central do Parceiro</h1>
        <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">{parceiro?.nome_parceiro}</p>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex bg-zinc-800 p-1 rounded-t-2xl">
          <button onClick={() => setAbaAtiva('NOVA')} className={`px-6 py-3 rounded-t-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${abaAtiva === 'NOVA' ? 'bg-slate-50 text-blue-600' : 'text-slate-400'}`}>
            <Send size={14}/> Nova Indicação
          </button>
          <button onClick={() => setAbaAtiva('HISTORICO')} className={`px-6 py-3 rounded-t-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${abaAtiva === 'HISTORICO' ? 'bg-slate-50 text-blue-600' : 'text-slate-400'}`}>
            <History size={14}/> Acompanhamento
          </button>
        </div>
      </div>

      <main className="max-w-xl mx-auto mt-10 px-6">
        {abaAtiva === 'NOVA' ? (
          /* FORMULÁRIO */
          !sent ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 space-y-6">
              <div className="relative">
                <User className="absolute left-5 top-4 text-slate-300" size={18} />
                <input required className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="NOME DO CLIENTE" value={form.nome_cliente} onChange={e => setForm({...form, nome_cliente: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Phone className="absolute left-5 top-4 text-slate-300" size={18} />
                  <input required className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="WHATSAPP" value={form.telefone_cliente} onChange={e => setForm({...form, telefone_cliente: maskPhone(e.target.value)})} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-5 top-4 text-slate-300" size={18} />
                  <input type="email" required className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="EMAIL" value={form.email_cliente} onChange={e => setForm({...form, email_cliente: e.target.value})} />
                </div>
              </div>
              <select required className="w-full h-14 px-6 rounded-2xl bg-slate-50 font-bold text-sm appearance-none outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={form.produto_interesse} onChange={e => setForm({...form, produto_interesse: e.target.value})}>
                <option value="">PRODUTO DE INTERESSE...</option>
                <option value="AUTO">AUTO</option>
                <option value="VIDA">VIDA</option>
                <option value="RESIDENCIAL">RESIDENCIAL</option>
                <option value="EMPRESARIAL">EMPRESARIAL</option>
              </select>

              <div className="bg-blue-50/50 border-2 border-dashed border-blue-100 p-6 rounded-[2rem]">
                <input type="file" multiple onChange={(e) => e.target.files && setArquivos(Array.from(e.target.files))} className="hidden" id="file-portal" />
                <label htmlFor="file-portal" className="flex flex-col items-center cursor-pointer">
                  <Upload size={20} className="text-blue-600 mb-2"/>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                    {arquivos.length > 0 ? `${arquivos.length} ARQUIVOS SELECIONADOS` : "ANEXAR DOCUMENTOS DO CLIENTE"}
                  </span>
                </label>
              </div>

              <div className="relative">
                <MessageSquare className="absolute left-5 top-4 text-slate-300" size={18} />
                <textarea rows={2} className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all resize-none" placeholder="OBSERVAÇÕES ADICIONAIS" value={form.obs_indicacao} onChange={e => setForm({...form, obs_indicacao: e.target.value})} />
              </div>

              <button type="submit" disabled={enviando} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-blue-200">
                {enviando ? <Loader2 className="animate-spin" /> : <Send size={18} />} ENVIAR PARA COTAÇÃO
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl text-center border border-slate-100">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black uppercase mb-4 leading-none text-slate-800">Sucesso!</h2>
              <p className="text-slate-500 text-xs font-medium mb-8 uppercase tracking-tighter">Sua indicação foi recebida. Acompanhe o status na aba ao lado.</p>
              <button onClick={() => { setSent(false); setForm({nome_cliente:"", telefone_cliente:"", email_cliente:"", produto_interesse:"", obs_indicacao:""}); setArquivos([]); }} className="h-14 w-full border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-blue-600 tracking-widest hover:bg-slate-50 transition-all">Fazer nova indicação</button>
            </div>
          )
        ) : (
          /* HISTÓRICO */
          <div className="space-y-4">
            {historico.length > 0 ? historico.map((item) => {
              const status = getStatusInfo(item.status_indicacao);
              const temAcao = ['COTADO', 'RECUSA_CORRETOR', 'RECUSA_PARCEIRO', 'PERDIDO', 'APROVADA_PARCEIRO', 'VENDIDO'].includes(item.status_indicacao);

              return (
                <div 
                  key={item.id} 
                  onClick={() => temAcao && setDetalheCotacao(item)}
                  className={`bg-white p-5 rounded-[2rem] shadow-sm border-2 transition-all ${
                    item.status_indicacao === 'COTADO' ? 'border-emerald-500 cursor-pointer scale-[1.02] shadow-emerald-100' : 
                    item.status_indicacao === 'VENDIDO' ? 'border-emerald-100 cursor-pointer hover:border-emerald-300' :
                    temAcao ? 'border-slate-100 cursor-pointer hover:border-blue-200' : 'border-slate-100 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-[10px] text-blue-600">
                        {item.nome_cliente.substring(0,2)}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{item.nome_cliente}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{item.produto_interesse} • {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${status.color}`}>
                      {status.icon} {status.label}
                    </div>
                  </div>

                  {temAcao && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <span className="text-[9px] font-black uppercase flex items-center gap-1 text-blue-600">
                        <Info size={12}/> {item.status_indicacao === 'VENDIDO' ? 'Ver Dados da Comissão' : 'Ver Detalhes e Interações'}
                      </span>
                      <ChevronRight size={16} className="text-blue-500" />
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                 <p className="text-[10px] font-black uppercase text-slate-300">Nenhuma indicação encontrada</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE DETALHES + UX DE COMISSÃO */}
      {detalheCotacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
            
            {/* Header Modal */}
            <div className={`p-8 ${['PERDIDO', 'RECUSA_CORRETOR', 'RECUSA_PARCEIRO'].includes(detalheCotacao.status_indicacao) ? 'bg-red-500' : detalheCotacao.status_indicacao === 'VENDIDO' ? 'bg-emerald-600' : 'bg-slate-900'} text-white ...`}>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1">{detalheCotacao.nome_cliente}</h3>
                <span className="bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{detalheCotacao.produto_interesse}</span>
              </div>
              <button onClick={() => { setDetalheCotacao(null); setConfirmandoAceite(false); setRecusando(false); }} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-8">
              {recusando ? (
                /* ESTADO: RECUSANDO */
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <div className="flex items-center gap-3 text-red-500 mb-4">
                      <AlertCircle size={24} />
                      <h4 className="font-black uppercase italic text-sm">Por que recusar esta proposta?</h4>
                   </div>
                   <select 
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-xs outline-none focus:border-red-400 transition-all"
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                   >
                     <option value="">Selecione um motivo...</option>
                     <option value="CLIENTE ACHOU CARO">CLIENTE ACHOU CARO</option>
                     <option value="CLIENTE FECHOU COM OUTRO">CLIENTE FECHOU COM OUTRO</option>
                     <option value="COBERTURAS INSUFICIENTES">COBERTURAS INSUFICIENTES</option>
                     <option value="CLIENTE DESISTIU DO PRODUTO">CLIENTE DESISTIU DO PRODUTO</option>
                     <option value="OUTRO">OUTRO MOTIVO</option>
                   </select>

                   <div className="grid grid-cols-2 gap-4 pt-4">
                     <button onClick={() => setRecusando(false)} className="h-14 font-black uppercase text-[10px] text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                     <button 
                      disabled={!motivoRecusa || respondendo}
                      onClick={() => responderCotacao('RECUSA_PARCEIRO')}
                      className="h-14 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-100 disabled:opacity-50"
                     >
                       {respondendo ? <Loader2 className="animate-spin mx-auto"/> : "Confirmar Recusa"}
                     </button>
                   </div>
                </div>
              ) : confirmandoAceite ? (
                /* ESTADO: CONFIRMANDO ACEITE */
                <div className="space-y-6 text-center animate-in slide-in-from-right-4 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PartyPopper size={40} />
                    </div>
                    <h4 className="text-xl font-black uppercase italic text-slate-800 leading-tight">Parabéns pela venda!</h4>
                    <p className="text-slate-500 text-[10px] font-bold uppercase leading-relaxed px-4">
                      O corretor irá finalizar a proposta e em breve os dados da sua comissão aparecerão aqui.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-6">
                      <button onClick={() => setConfirmandoAceite(false)} className="h-14 font-black uppercase text-[10px] text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Voltar</button>
                      <button 
                        disabled={respondendo}
                        onClick={() => responderCotacao('APROVADA_PARCEIRO')}
                        className="h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        {respondendo ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={16}/>} ACEITAR
                      </button>
                    </div>
                </div>
              ) : (
                /* ESTADO: DETALHES DA COTAÇÃO / COMISSÃO */
                <div className="space-y-6 animate-in fade-in duration-500">
                  {detalheCotacao.status_indicacao === 'PERDIDO' ? (
                    <div className="space-y-6 text-center">
                      <div className="p-6 bg-red-50 rounded-3xl border-2 border-dashed border-red-100">
                        <Ban size={32} className="text-red-400 mx-auto mb-3" />
                        <h4 className="text-red-800 font-black uppercase text-xs">Não Atendido</h4>
                        <p className="text-red-600/70 text-[9px] font-bold uppercase mt-1">{detalheCotacao.motivo_perda || 'RECUSADO'}</p>
                      </div>
                      <button onClick={() => setDetalheCotacao(null)} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                    </div>
                  ) : detalheCotacao.status_indicacao === 'VENDIDO' ? (
                    /* CARD DE COMISSÃO (CONCLUÍDO) */
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Seguradora</p>
                          <p className="font-black text-slate-800 uppercase text-sm">{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.seguradora}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-right">
                          <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Sua Comissão</p>
                          <p className="font-black text-emerald-600 text-lg">
                            R$ {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.comissao_parceiro?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 bg-emerald-600 rounded-[2rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-4">
                             <div className="bg-white/20 p-2 rounded-xl"><DollarSign size={20}/></div>
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${detalheCotacao.tab_indicacoes_cotacoes?.[0]?.status_comissao_parceiro === 'PAGO' ? 'bg-white text-emerald-600' : 'bg-emerald-800/50 text-emerald-100'}`}>
                               {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.status_comissao_parceiro || 'AGUARDANDO'}
                             </span>
                          </div>
                          <p className="text-[9px] font-black uppercase text-emerald-100 opacity-80">Previsão de Pagamento</p>
                          <p className="text-xl font-black italic">
                            {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.data_previsao_comissao 
                              ? new Date(detalheCotacao.tab_indicacoes_cotacoes[0].data_previsao_comissao).toLocaleDateString('pt-BR') 
                              : 'A DEFINIR'}
                          </p>
                        </div>
                        <div className="absolute -right-4 -bottom-6 opacity-10 rotate-12"><CheckCircle2 size={120}/></div>
                      </div>

                      <button onClick={() => setDetalheCotacao(null)} className="w-full h-14 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-50 transition-all">Voltar ao Histórico</button>
                    </div>
                  ) : (
                    /* COTAÇÃO EM ANDAMENTO / COTADO */
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Seguradora</p>
                          <p className="font-black text-slate-800 uppercase text-sm">{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.seguradora}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Investimento</p>
                          <p className="font-black text-blue-600 text-lg flex items-center gap-1">
                            <DollarSign size={14}/> {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.valor_premio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Coberturas</p>
                        <p className="text-xs font-bold text-slate-700 italic leading-relaxed whitespace-pre-wrap">
                          "{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.coberturas_principais || 'Consulte detalhes.'}"
                        </p>
                      </div>

                      {detalheCotacao.status_indicacao === 'COTADO' ? (
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <button onClick={() => setRecusando(true)} className="h-14 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95"><ThumbsDown size={16}/> Recusar</button>
                          <button onClick={() => setConfirmandoAceite(true)} className="h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95"><ThumbsUp size={16}/> Aceitar</button>
                        </div>
                      ) : (
                        <div className="p-6 bg-slate-900 rounded-[2.5rem] text-center space-y-2">
                          <Loader2 size={32} className="text-blue-400 mx-auto animate-spin" />
                          <h4 className="text-white font-black uppercase text-xs italic">Aguardando Finalização</h4>
                          <p className="text-slate-400 text-[9px] font-bold uppercase px-4">O corretor já recebeu seu aceite e está emitindo a proposta.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}