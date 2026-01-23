import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabasePublic as supabase } from "../../lib/supabaseClient";
import { 
  Send, Loader2, CheckCircle2, ShieldCheck, History, ChevronRight, 
  X, DollarSign, Upload, User, Phone, Mail, MessageSquare,
  Clock, Ban, Info, ThumbsUp, ThumbsDown, AlertCircle, PartyPopper, RefreshCw, 
  FileText, MapPin, Briefcase, Car, Plus, Paperclip, Search, Calendar
} from "lucide-react";
import { maskPhone } from "../../utils/masks";

export default function PortalParceiro() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [parceiro, setParceiro] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [sent, setSent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [respondendo, setRespondendo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'NOVA' | 'HISTORICO'>('NOVA');
  const [historico, setHistorico] = useState<any[]>([]);
  const [detalheCotacao, setDetalheCotacao] = useState<any>(null);

  // Filtros de Acompanhamento
  const [filtroNome, setFiltroNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

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

  const [documentos, setDocumentos] = useState({
    pessoal: null as File | null,
    residencia: null as File | null,
    veiculo: null as File | null,
    apolice: null as File | null,
    social: null as File | null,
    outros: [] as File[]
  });

  const carregarHistorico = useCallback(async (parceiroId: string) => {
    try {
      const { data: indicacoes, error: errInd } = await supabase
        .from("tab_indicacoes")
        .select(`*, tab_indicacoes_cotacoes!tab_indicacoes_cotacoes_indicacao_id_fkey (*)`)
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
        const { data } = await supabase
          .from("tab_parceiros")
          .select("id, nome_parceiro, corretora_id, corretor_id")
          .eq("slug_link", slug)
          .maybeSingle();

        if (data) {
          setParceiro(data);
          await carregarHistorico(data.id);
          const { data: prodData } = await supabase.from("base_produtos").select("nome").order("nome", { ascending: true });
          if (prodData) setProdutos(prodData);
        }
      } catch (err) {
        console.error("Erro ao carregar portal:", err);
      } finally {
        setLoading(false);
      }
    }
    inicializarPortal();
  }, [slug, carregarHistorico]);

  // Lógica de Filtragem Local para Performance
  const historicoFiltrado = useMemo(() => {
    return historico.filter(item => {
      const matchNome = item.nome_cliente.toLowerCase().includes(filtroNome.toLowerCase());
      const dataItem = new Date(item.created_at).toISOString().split('T')[0];
      
      const matchDataInicio = dataInicio ? dataItem >= dataInicio : true;
      const matchDataFim = dataFim ? dataItem <= dataFim : true;

      return matchNome && matchDataInicio && matchDataFim;
    });
  }, [historico, filtroNome, dataInicio, dataFim]);

  const handleFileUpload = async (indicacaoId: string) => {
    // Mapeamento dos arquivos para a nova tabela tab_indicacoes_documentos
    const categories = [
      { file: documentos.pessoal, tipo: 'RG/CNH' },
      { file: documentos.residencia, tipo: 'RESIDENCIA' },
      { file: documentos.veiculo, tipo: 'VEICULO' },
      { file: documentos.apolice, tipo: 'APOLICE' },
      { file: documentos.social, tipo: 'CONTRATO_SOCIAL' }
    ];

    // Processar categorias fixas
    for (const item of categories) {
      if (item.file) {
        const fileName = `${indicacaoId}/${crypto.randomUUID()}_${item.file.name}`;
        
        // Mantemos o bucket 'documentos_clientes' ou altere para o seu bucket de triagem
        const { error: uploadError } = await supabase.storage
          .from('documentos_indicacoes')
          .upload(fileName, item.file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('documentos_indicacoes')
            .getPublicUrl(fileName);

          // ALTERAÇÃO AQUI: Agora salva na tab_indicacoes_documentos
          await supabase.from('tab_indicacoes_documentos').insert([{
            indicacao_id: indicacaoId, // Nome da coluna correto
            nome_arquivo: item.file.name,
            url_arquivo: publicUrl,
            tipo: item.tipo,
            storage_path: fileName
          }]);
        }
      }
    }

    // Processar arquivos extras ("Outros")
    for (const file of documentos.outros) {
      const fileName = `${indicacaoId}/${crypto.randomUUID()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos_indicacoes')
        .upload(fileName, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('documentos_indicacoes')
          .getPublicUrl(fileName);

        // ALTERAÇÃO AQUI: Agora salva na tab_indicacoes_documentos
        await supabase.from('tab_indicacoes_documentos').insert([{
          indicacao_id: indicacaoId, // Nome da coluna correto
          nome_arquivo: file.name,
          url_arquivo: publicUrl,
          tipo: 'OUTROS',
          storage_path: fileName
        }]);
      }
    }
  };

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
      if (novaIndicacao) await handleFileUpload(novaIndicacao.id);

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
    if (novoStatus === 'RECUSA_PARCEIRO' && !motivoRecusa) return alert("Selecione um motivo.");
    setRespondendo(true);
    try {
      const statusIndicacaoPrincipal = novoStatus === 'RECUSA_PARCEIRO' ? 'PERDIDO' : 'APROVADA_PARCEIRO';
      
      // 1. Atualiza a Indicação Principal
      await supabase.from("tab_indicacoes").update({ 
        status_indicacao: statusIndicacaoPrincipal,
        motivo_perda: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null
      }).eq("id", detalheCotacao.id);

      const cotacaoId = detalheCotacao.tab_indicacoes_cotacoes?.[0]?.id;
      if (cotacaoId) {
        // 2. Atualiza a Cotação específica
        await supabase.from("tab_indicacoes_cotacoes").update({
          status_feedback: novoStatus === 'RECUSA_PARCEIRO' ? 'RECUSADO' : 'APROVADO',
          motivo_recusa: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null,
          status_comissao_parceiro: novoStatus === 'RECUSA_PARCEIRO' ? 'NEGADA' : 'PENDENTE'
        }).eq("id", cotacaoId);
      }

      // --- A MÁGICA DA ATUALIZAÇÃO IMEDIATA ---
      // 3. Atualizamos o objeto 'detalheCotacao' localmente para refletir a mudança na hora
      setDetalheCotacao((prev: any) => ({
        ...prev,
        status_indicacao: statusIndicacaoPrincipal,
        motivo_perda: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null
      }));

      // 4. Limpamos as travas de tela para o modal renderizar o novo status
      setConfirmandoAceite(false);
      setRecusando(false);

      // 5. Atualiza a lista de fundo (histórico)
      await carregarHistorico(parceiro.id);
      
    } catch (err) {
      console.error(err);
      alert("Erro ao processar resposta.");
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
      case 'VENDIDO': return { label: 'CONCLUÍDO', color: 'bg-emerald-600 text-white', icon: <PartyPopper size={10}/> };
      case 'PERDIDO': case 'RECUSA_PARCEIRO': case 'RECUSA_CORRETOR': return { label: 'NÃO ATENDIDO', color: 'bg-red-50 text-red-500', icon: <Ban size={10}/> };
      default: return { label: status, color: 'bg-slate-100 text-slate-500', icon: null };
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header Estilizado */}
      <div className="bg-zinc-900 text-white pt-10 pb-16 px-6 text-center rounded-b-[3.5rem] shadow-xl relative">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg rotate-3"><ShieldCheck size={32} /></div>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Central do Parceiro</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="text-blue-400 font-bold uppercase text-[9px] tracking-[0.2em]">{parceiro?.nome_parceiro}</p>
          <button onClick={() => carregarHistorico(parceiro.id)} className="p-1.5 bg-zinc-800 rounded-full text-blue-400 hover:text-white transition-all active:rotate-180 duration-500"><RefreshCw size={10} /></button>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex bg-zinc-800 p-1 rounded-t-xl">
          <button onClick={() => setAbaAtiva('NOVA')} className={`px-5 py-2.5 rounded-t-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all ${abaAtiva === 'NOVA' ? 'bg-slate-50 text-blue-600' : 'text-slate-400'}`}><Send size={12}/> Nova Indicação</button>
          <button onClick={() => setAbaAtiva('HISTORICO')} className={`px-5 py-2.5 rounded-t-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all ${abaAtiva === 'HISTORICO' ? 'bg-slate-50 text-blue-600' : 'text-slate-400'}`}><History size={12}/> Acompanhamento</button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto mt-8 px-4">
        {abaAtiva === 'NOVA' ? (
          !sent ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-4">
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="NOME DO CLIENTE" value={form.nome_cliente} onChange={e => setForm({...form, nome_cliente: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative"><Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input required className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="WHATSAPP" value={form.telefone_cliente} onChange={e => setForm({...form, telefone_cliente: maskPhone(e.target.value)})} /></div>
                <div className="relative"><Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="email" required className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="EMAIL" value={form.email_cliente} onChange={e => setForm({...form, email_cliente: e.target.value})} /></div>
              </div>

              <div className="relative">
                <select required className="w-full h-14 px-5 rounded-xl bg-slate-50 font-bold text-xs appearance-none outline-none border-2 border-transparent focus:border-blue-500 transition-all cursor-pointer" value={form.produto_interesse} onChange={e => setForm({...form, produto_interesse: e.target.value})}>
                  <option value="">PRODUTO DE INTERESSE...</option>
                  {produtos.map((p, idx) => <option key={idx} value={p.nome}>{p.nome}</option>)}
                </select>
                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={18} />
              </div>

              {/* ÁREA DE DOCUMENTOS */}
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={14}/> Documentação do Cliente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {[
                    { id: 'pessoal', label: 'Doc. Pessoal (RG/CNH)', icon: <User size={14}/> },
                    { id: 'residencia', label: 'Comprovante Residência', icon: <MapPin size={14}/> },
                    { id: 'veiculo', label: 'Documento do Veículo', icon: <Car size={14}/> },
                    { id: 'apolice', label: 'Contrato de Apólice', icon: <FileText size={14}/> },
                    { id: 'social', label: 'Contrato Social', icon: <Briefcase size={14}/> }
                  ].map((doc) => (
                    <label key={doc.id} className="group relative flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-400 cursor-pointer transition-all shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="text-blue-500 group-hover:scale-110 transition-transform">{doc.icon}</div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                          {(documentos as any)[doc.id] ? (documentos as any)[doc.id].name : doc.label}
                        </span>
                      </div>
                      <Upload size={14} className={(documentos as any)[doc.id] ? "text-green-500" : "text-slate-300"} />
                      <input type="file" className="hidden" onChange={(e) => setDocumentos({...documentos, [doc.id]: e.target.files?.[0] || null})} />
                    </label>
                  ))}
                </div>
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Paperclip size={12}/> Outros Documentos</p>
                  {documentos.outros.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-[9px] font-bold text-blue-700">
                      <span className="truncate">{file.name}</span>
                      <button type="button" onClick={() => setDocumentos({...documentos, outros: documentos.outros.filter((_, i) => i !== idx)})} className="text-blue-400 hover:text-red-500"><X size={14}/></button>
                    </div>
                  ))}
                  <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-blue-600 hover:bg-blue-50 transition-all cursor-pointer uppercase">
                    <Plus size={14}/> Adicionar outro documento
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setDocumentos({...documentos, outros: [...documentos.outros, e.target.files[0]]})} />
                  </label>
                </div>
              </div>

              <div className="relative">
                <MessageSquare className="absolute left-5 top-4 text-slate-300" size={18} />
                <textarea rows={2} className="w-full pl-14 pr-5 py-4 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all resize-none" placeholder="OBSERVAÇÕES ADICIONAIS" value={form.obs_indicacao} onChange={e => setForm({...form, obs_indicacao: e.target.value})} />
              </div>

              <button type="submit" disabled={enviando} className="w-full h-16 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-blue-100">
                {enviando ? <Loader2 className="animate-spin" /> : <Send size={18} />} ENVIAR PARA COTAÇÃO
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 shadow-xl text-center border border-slate-100">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-6" />
              <h2 className="text-xl font-black uppercase mb-2">Sucesso!</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 tracking-tighter">O corretor analisará sua indicação. Acompanhe o status na aba ao lado.</p>
              <button onClick={() => { setSent(false); setForm({nome_cliente:"", telefone_cliente:"", email_cliente:"", produto_interesse:"", obs_indicacao:""}); setDocumentos({pessoal:null, residencia:null, veiculo:null, apolice:null, social:null, outros:[]}); }} className="h-14 w-full border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-blue-600 tracking-widest hover:bg-slate-50 transition-all">Nova indicação</button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* FILTROS DE BUSCA */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input className="w-full h-11 pl-11 pr-4 bg-slate-50 rounded-xl text-[10px] font-bold uppercase outline-none border border-transparent focus:border-blue-500 transition-all" placeholder="BUSCAR POR NOME DO CLIENTE..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input type="date" className="w-full h-11 pl-10 pr-4 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-blue-500" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input type="date" className="w-full h-11 pl-10 pr-4 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-blue-500" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {historicoFiltrado.length > 0 ? historicoFiltrado.map((item) => {
                const status = getStatusInfo(item.status_indicacao);
                const temAcao = ['COTADO', 'VENDIDO', 'PERDIDO', 'APROVADA_PARCEIRO', 'RECUSA_PARCEIRO', 'RECUSA_CORRETOR'].includes(item.status_indicacao);
                return (
                  <div key={item.id} onClick={() => temAcao && setDetalheCotacao(item)} className={`bg-white p-5 rounded-[2rem] shadow-sm border-2 transition-all hover:shadow-md ${item.status_indicacao === 'COTADO' ? 'border-emerald-500 scale-[1.02]' : 'border-slate-100'} ${temAcao ? 'cursor-pointer' : 'opacity-80'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-[10px] text-blue-600 shadow-inner">{item.nome_cliente.substring(0,2)}</div>
                        <div><h4 className="text-[11px] font-black text-slate-800 uppercase leading-none">{item.nome_cliente}</h4><p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{item.produto_interesse} • {new Date(item.created_at).toLocaleDateString()}</p></div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 ${status.color}`}>{status.icon} {status.label}</div>
                    </div>
                    {temAcao && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50 text-blue-600">
                        <span className="text-[9px] font-black uppercase flex items-center gap-1"><Info size={12}/> {item.status_indicacao === 'VENDIDO' ? 'Ver Dados da Comissão' : 'Ver Detalhes e Feedback'}</span>
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </div>
                );
              }) : <div className="text-center py-20 opacity-30 font-black text-[10px] uppercase">Nenhuma indicação encontrada</div>}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE DETALHES */}
      {detalheCotacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className={`p-8 ${['PERDIDO', 'RECUSA_PARCEIRO', 'RECUSA_CORRETOR'].includes(detalheCotacao.status_indicacao) ? 'bg-red-500' : detalheCotacao.status_indicacao === 'VENDIDO' ? 'bg-emerald-600' : 'bg-slate-900'} text-white flex justify-between items-center`}>
              <div><h3 className="text-lg font-black uppercase italic truncate max-w-[200px]">{detalheCotacao.nome_cliente}</h3><span className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">{detalheCotacao.produto_interesse}</span></div>
              <button onClick={() => { setDetalheCotacao(null); setRecusando(false); setConfirmandoAceite(false); }} className="bg-white/10 p-2 rounded-full"><X size={20}/></button>
            </div>

            <div className="p-8">
              {recusando ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-red-500"><AlertCircle size={20}/><h4 className="font-black uppercase text-xs italic">Por que recusar?</h4></div>
                  <select value={motivoRecusa} onChange={(e) => setMotivoRecusa(e.target.value)} className="w-full h-14 px-5 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold text-xs">
                    <option value="">Selecione o motivo...</option>
                    <option value="CLIENTE ACHOU CARO">CLIENTE ACHOU CARO</option>
                    <option value="CLIENTE FECHOU COM OUTRO">CLIENTE FECHOU COM OUTRO</option>
                    <option value="COBERTURAS INSUFICIENTES">COBERTURAS INSUFICIENTES</option>
                    <option value="CLIENTE DESISTIU">CLIENTE DESISTIU</option>
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setRecusando(false)} className="h-14 font-black uppercase text-[10px] text-slate-400">Voltar</button>
                    <button disabled={!motivoRecusa || respondendo} onClick={() => responderCotacao('RECUSA_PARCEIRO')} className="h-14 bg-red-500 text-white rounded-xl font-black uppercase text-[10px]">{respondendo ? <Loader2 className="animate-spin mx-auto"/> : "Confirmar Recusa"}</button>
                  </div>
                </div>
              ) : confirmandoAceite ? (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><PartyPopper size={40} /></div>
                  <h4 className="text-xl font-black uppercase italic text-slate-800">Parabéns!</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase leading-relaxed px-4">O corretor será notificado para emitir a proposta agora.</p>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => setConfirmandoAceite(false)} className="h-14 font-black uppercase text-[10px] text-slate-400">Voltar</button>
                    <button disabled={respondendo} onClick={() => responderCotacao('APROVADA_PARCEIRO')} className="h-14 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2">{respondendo ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={16}/>} CONFIRMAR</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {detalheCotacao.status_indicacao === 'VENDIDO' ? (
                    <div className="space-y-4">
                      <div className="p-5 bg-emerald-600 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                          <p className="text-[9px] font-black uppercase opacity-70 mb-1">Sua Comissão</p>
                          <p className="text-2xl font-black italic">R$ {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.comissao_parceiro?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <div className="mt-4 flex justify-between items-center border-t border-white/20 pt-4">
                            <div><p className="text-[7px] font-black uppercase opacity-70">Previsão Pagamento</p><p className="text-[11px] font-black">{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.data_previsao_comissao ? new Date(detalheCotacao.tab_indicacoes_cotacoes[0].data_previsao_comissao).toLocaleDateString() : 'A DEFINIR'}</p></div>
                            <div className="bg-white text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.status_comissao_parceiro || 'PENDENTE'}</div>
                          </div>
                        </div>
                        <DollarSign size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
                      </div>
                      <button onClick={() => setDetalheCotacao(null)} className="w-full h-14 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Seguradora</p>
                          <p className="font-black text-slate-800 uppercase text-xs truncate">{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.seguradora || '---'}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Investimento</p>
                          <p className="font-black text-blue-600 text-sm">R$ {detalheCotacao.tab_indicacoes_cotacoes?.[0]?.valor_premio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Coberturas</p>
                        <p className="text-[10px] font-bold text-slate-600 italic leading-relaxed">"{detalheCotacao.tab_indicacoes_cotacoes?.[0]?.coberturas_principais || 'Nenhuma cobertura detalhada informada.'}"</p>
                      </div>

                      {/* LÓGICA DE EXIBIÇÃO DE RODAPÉ DO MODAL CORRIGIDA */}
                      {detalheCotacao.status_indicacao === 'COTADO' ? (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button onClick={() => setRecusando(true)} className="h-14 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1 transition-all hover:bg-red-100"><ThumbsDown size={14}/> Recusar</button>
                          <button onClick={() => setConfirmandoAceite(true)} className="h-14 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1 shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-600"><ThumbsUp size={14}/> Aceitar</button>
                        </div>
                      ) : (
                        // Aqui tratamos os status finais (Não atendido, perdido, etc)
                        ['PERDIDO', 'RECUSA_PARCEIRO', 'RECUSA_CORRETOR'].includes(detalheCotacao.status_indicacao) ? (
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                            <p className="text-[8px] font-black text-red-400 uppercase mb-1">Motivo da Recusa/Perda</p>
                            <p className="font-black text-red-600 text-[10px] uppercase">{detalheCotacao.motivo_perda || detalheCotacao.tab_indicacoes_cotacoes?.[0]?.motivo_recusa || 'INFORMAÇÃO NÃO DISPONÍVEL'}</p>
                          </div>
                        ) : (
                          // Aguardando finalização (Apenas para status intermediário após aceite do parceiro)
                          detalheCotacao.status_indicacao === 'APROVADA_PARCEIRO' && (
                            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-center space-y-4">
                                <Loader2 size={32} className="text-blue-400 mx-auto animate-spin" />
                                <div>
                                <h4 className="text-white font-black uppercase text-[10px] italic">Aguardando Finalização</h4>
                                <p className="text-slate-400 text-[8px] font-bold uppercase px-4">O corretor recebeu seu aceite e está emitindo a proposta.</p>
                                </div>
                                {/* Botão para fechar o modal após o sucesso */}
                                <button 
                                onClick={() => setDetalheCotacao(null)}
                                className="w-full h-10 bg-white/10 text-white rounded-xl font-black uppercase text-[9px] hover:bg-white/20 transition-all"
                                >
                                Entendi, fechar
                                </button>
                            </div>
                            )
                        )
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