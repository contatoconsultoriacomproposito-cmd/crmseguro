import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { 
  Send, Loader2, CheckCircle2, 
  ShieldCheck, History, ChevronRight, 
  X, DollarSign, Upload, User, Phone, Mail, MessageSquare
} from "lucide-react";
import { maskPhone } from "../../utils/masks";

export default function PortalParceiro() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [parceiro, setParceiro] = useState<any>(null);
  const [sent, setSent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'NOVA' | 'HISTORICO'>('NOVA');
  const [historico, setHistorico] = useState<any[]>([]);
  const [detalheCotacao, setDetalheCotacao] = useState<any>(null);

  const [form, setForm] = useState({
    nome_cliente: "",
    telefone_cliente: "",
    email_cliente: "",
    produto_interesse: "",
    obs_indicacao: ""
  });
  const [arquivos, setArquivos] = useState<File[]>([]);

  // Carregar Histórico
  const carregarHistorico = useCallback(async (parceiroId: string) => {
    try {
        // Busca primeiro apenas as indicações (tabela pai)
        const { data: indicacoes, error: errInd } = await supabase
        .from("tab_indicacoes")
        .select("*")
        .eq("parceiro_id", parceiroId)
        .order("created_at", { ascending: false });

        if (errInd) {
        console.error("Erro ao carregar indicações:", errInd.message);
        return;
        }

        // Tenta carregar as cotações separadamente para não quebrar a lista principal
        const { data: cotacoes, error: errCot } = await supabase
        .from("tab_indicacoes_cotacoes")
        .select("*");

        if (errCot) {
        console.warn("Aviso: Sem acesso às cotações, mas listando indicações.");
        }

        // Une os dados manualmente para garantir que a lista apareça
        const historicoCompleto = indicacoes?.map(ind => ({
        ...ind,
        tab_indicacoes_cotacoes: cotacoes?.filter(c => c.indicacao_id === ind.id) || []
        }));

        setHistorico(historicoCompleto || []);
    } catch (err) {
        console.error("Erro inesperado:", err);
    }
    }, []);

  // Inicialização
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

      // Upload Simples
      if (arquivos.length > 0 && novaIndicacao) {
        for (const file of arquivos) {
          const fileName = `${novaIndicacao.id}/${Date.now()}-${file.name}`;
          await supabase.storage.from('documentos_indicacoes').upload(fileName, file);
        }
      }

      setSent(true);
      await carregarHistorico(parceiro.id); // Atualiza a lista após enviar
    } catch (err) {
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  async function responderCotacao(indicacaoId: string, resposta: 'ACEITO' | 'RECUSADO') {
    try {
      const { error } = await supabase
        .from('tab_indicacoes_cotacoes')
        .update({ status_feedback: resposta })
        .eq('indicacao_id', indicacaoId);

      if (error) throw error;
      setDetalheCotacao(null);
      await carregarHistorico(parceiro.id);
    } catch (err) {
      alert("Erro ao processar resposta.");
    }
  }

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
          !sent ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 space-y-6">
              <div className="relative">
                <User className="absolute left-5 top-4 text-slate-300" size={18} />
                <input required className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 font-bold text-sm outline-none" placeholder="NOME DO CLIENTE" value={form.nome_cliente} onChange={e => setForm({...form, nome_cliente: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Phone className="absolute left-5 top-4 text-slate-300" size={18} />
                  <input required className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 font-bold text-sm" placeholder="WHATSAPP" value={form.telefone_cliente} onChange={e => setForm({...form, telefone_cliente: maskPhone(e.target.value)})} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-5 top-4 text-slate-300" size={18} />
                  <input type="email" required className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 font-bold text-sm" placeholder="EMAIL" value={form.email_cliente} onChange={e => setForm({...form, email_cliente: e.target.value})} />
                </div>
              </div>
              <select required className="w-full h-14 px-6 rounded-2xl bg-slate-50 font-bold text-sm appearance-none" value={form.produto_interesse} onChange={e => setForm({...form, produto_interesse: e.target.value})}>
                <option value="">PRODUTO DE INTERESSE...</option>
                <option value="AUTO">AUTO</option>
                <option value="VIDA">VIDA</option>
                <option value="RESIDENCIAL">RESIDENCIAL</option>
              </select>

              <div className="bg-blue-50/50 border-2 border-dashed border-blue-100 p-6 rounded-[2rem]">
                <input type="file" multiple onChange={(e) => e.target.files && setArquivos(Array.from(e.target.files))} className="hidden" id="file-portal" />
                <label htmlFor="file-portal" className="flex flex-col items-center cursor-pointer">
                  <Upload size={20} className="text-blue-600 mb-2"/>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {arquivos.length > 0 ? `${arquivos.length} ARQUIVOS` : "ANEXAR DOCUMENTOS"}
                  </span>
                </label>
              </div>

              <div className="relative">
                <MessageSquare className="absolute left-5 top-4 text-slate-300" size={18} />
                <textarea rows={2} className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none resize-none" placeholder="OBSERVAÇÕES" value={form.obs_indicacao} onChange={e => setForm({...form, obs_indicacao: e.target.value})} />
              </div>

              <button type="submit" disabled={enviando} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all">
                {enviando ? <Loader2 className="animate-spin" /> : <Send size={18} />} ENVIAR INDICAÇÃO
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black uppercase mb-4 leading-none">Indicação Enviada!</h2>
              <button onClick={() => { setSent(false); setForm({nome_cliente:"", telefone_cliente:"", email_cliente:"", produto_interesse:"", obs_indicacao:""}); setArquivos([]); }} className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Fazer outra indicação</button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {historico.length > 0 ? historico.map((item) => {
              const temCotacao = item.tab_indicacoes_cotacoes?.length > 0;
              return (
                <div 
                  key={item.id} 
                  onClick={() => temCotacao && setDetalheCotacao(item)}
                  className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group transition-all ${temCotacao ? 'cursor-pointer hover:border-blue-500 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-xs text-blue-600">
                      {item.nome_cliente.substring(0,2)}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-800 uppercase">{item.nome_cliente}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{item.produto_interesse} • {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                      item.status_indicacao === 'NOVO' ? 'bg-amber-100 text-amber-600' : 
                      item.status_indicacao === 'COTADO' ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.status_indicacao === 'COTADO' ? 'VER COTAÇÃO' : item.status_indicacao}
                    </span>
                    {temCotacao && <ChevronRight size={14} className="text-blue-500" />}
                  </div>
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

      {/* MODAL DETALHES */}
      {detalheCotacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-start">
              <h3 className="text-xl font-black uppercase italic italic">{detalheCotacao.nome_cliente}</h3>
              <button onClick={() => setDetalheCotacao(null)} className="bg-white/20 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Seguradora</p>
                  <p className="font-black text-slate-800 uppercase">{detalheCotacao.tab_indicacoes_cotacoes[0].seguradora}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Investimento</p>
                  <p className="font-black text-blue-600 text-lg flex items-center gap-1">
                    <DollarSign size={14}/> {detalheCotacao.tab_indicacoes_cotacoes[0].valor_premio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {detalheCotacao.tab_indicacoes_cotacoes[0].status_feedback === 'PENDENTE' ? (
                <div className="flex gap-3">
                  <button onClick={() => responderCotacao(detalheCotacao.id, 'RECUSADO')} className="flex-1 h-14 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Recusar</button>
                  <button onClick={() => responderCotacao(detalheCotacao.id, 'ACEITO')} className="flex-[2] h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px]">Aceitar</button>
                </div>
              ) : (
                <div className="p-4 bg-slate-100 rounded-2xl text-center font-black uppercase text-[10px]">Status: {detalheCotacao.tab_indicacoes_cotacoes[0].status_feedback}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}