// src/pages/portal/PortalParceiro.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabasePublic as supabase } from "../../lib/supabaseClient";
import { Loader2, CheckCircle2, Search } from "lucide-react";
import { Toaster, toast } from "sonner"; // Importação do componente de feedback

// Componentes Modulares
import { HeaderPortal } from "./components/HeaderPortal";
import { FormIndicacao } from "./components/FormIndicacao";
import { CardHistorico } from "./components/CardHistorico";
import { ModalDetalhes } from "./components/ModalDetalhes";

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

  const [confirmandoAceite, setConfirmandoAceite] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [form, setForm] = useState({
    nome_cliente: "",
    documento_cliente: "",
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

  const uploadArquivoUnico = async (indicacaoId: string, arquivo: File, tipo: string) => {
    try {
      const cleanFileName = arquivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.-]/g, "_");

      const path = `${indicacaoId}/${crypto.randomUUID()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_indicacoes')
        .upload(path, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_indicacoes')
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from('tab_indicacoes_documentos').insert([{
        indicacao_id: indicacaoId,
        nome_arquivo: arquivo.name,
        url_arquivo: publicUrl,
        tipo: tipo,
        storage_path: path
      }]);

      if (dbError) throw dbError;
      return true;
    } catch (err) {
      console.error("Erro no upload do arquivo:", err);
      return false;
    }
  };

  const carregarHistorico = useCallback(async (parceiroId: string) => {
    try {
      const { data: indicacoes, error: errInd } = await supabase
        .from("tab_indicacoes")
        .select(`
          *, 
          tab_indicacoes_cotacoes!tab_indicacoes_cotacoes_indicacao_id_fkey (*),
          tab_indicacoes_documentos (*)
        `)
        .eq("parceiro_id", parceiroId)
        .order("created_at", { ascending: false });

      if (errInd) throw errInd;
      setHistorico(indicacoes || []);
    } catch (err) {
      toast.error("Erro ao carregar histórico de indicações.");
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
        toast.error("Erro ao inicializar o portal.");
      } finally {
        setLoading(false);
      }
    }
    inicializarPortal();
  }, [slug, carregarHistorico]);

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
    const categories = [
      { file: documentos.pessoal, tipo: 'RG/CNH' },
      { file: documentos.residencia, tipo: 'RESIDENCIA' },
      { file: documentos.veiculo, tipo: 'VEICULO' },
      { file: documentos.apolice, tipo: 'APOLICE' },
      { file: documentos.social, tipo: 'CONTRATO_SOCIAL' }
    ];

    for (const item of categories) {
      if (item.file) await uploadArquivoUnico(indicacaoId, item.file, item.tipo);
    }
    for (const file of documentos.outros) {
      await uploadArquivoUnico(indicacaoId, file, 'OUTROS');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parceiro?.id) return;
    setEnviando(true);
    const toastId = toast.loading("Enviando indicação...");
    try {
      const documentoLimpo = form.documento_cliente.replace(/\D/g, "");
      const { data: novaIndicacao, error: errorIns } = await supabase
        .from("tab_indicacoes")
        .insert([{
          parceiro_id: parceiro.id,
          corretora_id: parceiro.corretora_id,
          corretor_id: parceiro.corretor_id,
          nome_cliente: form.nome_cliente.toUpperCase(),
          documento_cliente: documentoLimpo,
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
      toast.success("Indicação enviada com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`, { id: toastId });
    } finally {
      setEnviando(false);
    }
  };

  const handleSaveEdits = async (dadosEditados: any) => {
    if (!parceiro) return;
    setRespondendo(true);
    
    // Feedback visual imediato com Sonner
    const toastId = toast.loading("Salvando alterações...");

    try {
      const documentoLimpo = dadosEditados.documento_cliente.replace(/\D/g, "");
      const { error } = await supabase
        .from("tab_indicacoes")
        .update({
          nome_cliente: dadosEditados.nome_cliente.toUpperCase(),
          documento_cliente: documentoLimpo,
          telefone_cliente: dadosEditados.telefone_cliente,
          email_cliente: dadosEditados.email_cliente.toLowerCase(),
          obs_indicacao: dadosEditados.obs_indicacao
        })
        .eq("id", dadosEditados.id);

      if (error) throw error;

      // 1. Atualiza o histórico ao fundo para refletir as mudanças na lista
      await carregarHistorico(parceiro.id);

      // 2. Feedback de sucesso
      toast.success("Indicação atualizada!", { id: toastId });
      
      // 3. FECHA O MODAL: limpando o estado que controla a abertura dele
      setDetalheCotacao(null); 
      setRecusando(false);
      setConfirmandoAceite(false);

    } catch (err) {
      toast.error("Erro ao salvar alterações.", { id: toastId });
      console.error(err);
    } finally {
      setRespondendo(false);
    }
  };

  const responderCotacao = async (novoStatus: 'APROVADA_PARCEIRO' | 'RECUSA_PARCEIRO') => {
    if (!detalheCotacao || !parceiro) return;
    setRespondendo(true);
    try {
      const statusPrincipal = novoStatus === 'RECUSA_PARCEIRO' ? 'PERDIDO' : 'APROVADA_PARCEIRO';
      await supabase.from("tab_indicacoes").update({ 
        status_indicacao: statusPrincipal,
        motivo_perda: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null
      }).eq("id", detalheCotacao.id);

      const cotacaoId = detalheCotacao.tab_indicacoes_cotacoes?.[0]?.id;
      if (cotacaoId) {
        await supabase.from("tab_indicacoes_cotacoes").update({
          status_feedback: novoStatus === 'RECUSA_PARCEIRO' ? 'RECUSADO' : 'APROVADO',
          motivo_recusa: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null,
          status_comissao_parceiro: novoStatus === 'RECUSA_PARCEIRO' ? 'NEGADA' : 'PENDENTE'
        }).eq("id", cotacaoId);
      }
      setDetalheCotacao((prev: any) => ({ ...prev, status_indicacao: statusPrincipal, motivo_perda: novoStatus === 'RECUSA_PARCEIRO' ? motivoRecusa : null }));
      setConfirmandoAceite(false);
      setRecusando(false);
      await carregarHistorico(parceiro.id);
      toast.success(novoStatus === 'RECUSA_PARCEIRO' ? "Indicação recusada." : "Indicação aprovada!");
    } catch (err) {
      toast.error("Erro ao processar resposta.");
    } finally {
      setRespondendo(false);
    }
  };

  const onSingleUpload = async (tipo: string, arquivo: File) => {
    if (!detalheCotacao?.id) return;
    setRespondendo(true);
    const toastId = toast.loading(`Enviando ${tipo}...`);
    
    try {
      const sucesso = await uploadArquivoUnico(detalheCotacao.id, arquivo, tipo);
      
      if (sucesso) {
        const { data: updatedInd, error: searchError } = await supabase
          .from("tab_indicacoes")
          .select(`
            *, 
            tab_indicacoes_cotacoes!tab_indicacoes_cotacoes_indicacao_id_fkey (*),
            tab_indicacoes_documentos (*)
          `)
          .eq("id", detalheCotacao.id)
          .single();

        if (updatedInd && !searchError) {
          setDetalheCotacao(updatedInd);
        }
        await carregarHistorico(parceiro.id);
        toast.success("Documento anexado com sucesso!", { id: toastId });
      } else {
        toast.error("Erro ao realizar upload.", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro no processo de upload.", { id: toastId });
    } finally {
      setRespondendo(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      <Toaster position="top-right" richColors closeButton />
      
      <HeaderPortal 
        nomeParceiro={parceiro?.nome_parceiro} 
        abaAtiva={abaAtiva} 
        setAbaAtiva={setAbaAtiva} 
        onRefresh={() => carregarHistorico(parceiro?.id)} 
      />

      <main className="max-w-2xl mx-auto mt-8 px-4">
        {abaAtiva === 'NOVA' ? (
          !sent ? (
            <FormIndicacao 
              form={form} setForm={setForm} 
              produtos={produtos} 
              documentos={documentos} setDocumentos={setDocumentos} 
              enviando={enviando} onSubmit={handleSubmit} 
            />
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 shadow-xl text-center border border-slate-100">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-6" />
              <h2 className="text-xl font-black uppercase mb-2">Sucesso!</h2>
              <button onClick={() => { setSent(false); setForm({nome_cliente:"", documento_cliente:"", telefone_cliente:"", email_cliente:"", produto_interesse:"", obs_indicacao:""}); setDocumentos({pessoal:null, residencia:null, veiculo:null, apolice:null, social:null, outros:[]}); }} className="h-14 w-full border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-blue-600 tracking-widest hover:bg-slate-50 transition-all">Nova indicação</button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input className="w-full h-11 pl-11 pr-4 bg-slate-50 rounded-xl text-[10px] font-bold uppercase outline-none border border-transparent focus:border-blue-500" placeholder="BUSCAR POR NOME..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="w-full h-11 px-4 bg-slate-50 rounded-xl text-[10px] font-bold outline-none" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                <input type="date" className="w-full h-11 px-4 bg-slate-50 rounded-xl text-[10px] font-bold outline-none" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {historicoFiltrado.map((item) => (
                <CardHistorico key={item.id} item={item} onClick={() => setDetalheCotacao(item)} />
              ))}
            </div>
          </div>
        )}
      </main>

      <ModalDetalhes 
        detalheCotacao={detalheCotacao}
        onClose={() => { setDetalheCotacao(null); setRecusando(false); setConfirmandoAceite(false); }}
        recusando={recusando}
        setRecusando={setRecusando}
        confirmandoAceite={confirmandoAceite}
        setConfirmandoAceite={setConfirmandoAceite}
        motivoRecusa={motivoRecusa}
        setMotivoRecusa={setMotivoRecusa}
        respondendo={respondendo}
        onResponder={responderCotacao}
        documentos={documentos}
        setDocumentos={setDocumentos}
        onSaveEdits={handleSaveEdits}
        onSingleUpload={onSingleUpload}
      />
    </div>
  );
}