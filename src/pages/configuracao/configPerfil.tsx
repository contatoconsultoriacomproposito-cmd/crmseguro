import { useState, useEffect, useCallback } from "react";
import { 
  Building2, Save, MapPin, Phone, Mail, Loader2, 
  CheckCircle2, Globe, ShieldCheck, Upload, X, ImageIcon, Instagram, Facebook, User, UserCheck, ShieldAlert, FileText
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import { buscarCNPJ, buscarCEP } from "../../services/brasilApi";
import { maskCNPJ, maskPhone } from "../../utils/masks";
import { ModalPlanos } from './components/modalPlanos';
import { useNavigate } from "react-router-dom";
import { ModalSite } from "./components/modalSite";

export default function ConfigCorretora() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"perfil" | "plano" | "pessoal">("perfil");
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalPlanosOpen, setIsModalPlanosOpen] = useState(false);
  const [assinaturaDb, setAssinaturaDb] = useState<any>(null);
  const [usoStorage, setUsoStorage] = useState({ bytes: 0, mb: 0, percentual: 0 });
  const [isSyncingStorage, setIsSyncingStorage] = useState(false);
  const [isModalSiteOpen, setIsModalSiteOpen] = useState(false);

  const [form, setForm] = useState({
    razao_social: "",
    cnpj: "",
    logotipo_url: "",
    website: "",
    instagram: "",
    facebook: "",
    registro_susep:"",
    whatsapp_comercial: "",
    plano: "FREE",
    status_pagamento: "ATIVO",
    data_expiracao: "",
    nome_fantasia: "",
    descricao_identificador_matriz_filial: "",
    natureza_juridica: "",
    porte: "",
    capital_social: "",
    opcao_pelo_mei: false,
    opcao_pelo_simples: false,
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    municipio: "",
    uf: "",
    complemento: "",
    email_corporativo: "",
    ddd_telefone_1: "",
    nome_responsavel: "",
    telefone_responsavel: "",
    email_responsavel: ""
  });

  const fetchConfig = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: corretora, error: errC } = await supabase
        .from("tab_corretora_config")
        .select(`*, usuarios_perfis ( created_at )`)
        .eq("id", user.id)
        .maybeSingle();

      if (errC) throw errC;
      if (!corretora) {
        setFetchingConfig(false);
        return;
      }

      const { storage_usado_bytes, ...dadosLimpos } = corretora;
      const dataCriacaoRaw = corretora.usuarios_perfis?.created_at;
      const dataCriacao = dataCriacaoRaw ? new Date(dataCriacaoRaw) : new Date();
      
      const expiracaoFree = new Date(dataCriacao);
      expiracaoFree.setDate(expiracaoFree.getDate() + 7);

      setForm(prev => ({
        ...prev,
        ...dadosLimpos,
        data_expiracao: corretora.data_expiracao || expiracaoFree.toISOString(),
        status_pagamento: corretora.status_pagamento || "ATIVO",
        capital_social: corretora.capital_social?.toString() || "",
      }));
    } catch (err) {
      console.error("Erro fetchConfig:", err);
    } finally {
      setFetchingConfig(false);
    }
  }, [user?.id]);

  const fetchAssinatura = useCallback(async () => {
    if (!userProfile?.corretora_id) return;
    try {
      const { data, error } = await supabase
        .from('tab_planos')
        .select('*')
        .eq('corretora_id', userProfile.corretora_id)
        .order('data_inicio', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data?.[0]) setAssinaturaDb(data[0]);
    } catch (err) {
      console.error("Erro fetchAssinatura:", err);
    }
  }, [userProfile?.corretora_id]);

  const fetchUsoStorage = useCallback(async () => {
  if (!userProfile?.corretora_id) return;
  try {
    // ALTERAÇÃO PONTUAL: Removido o .toString() para evitar conflito de tipo UUID no RPC
    const { error: rpcError } = await supabase.rpc('sync_corretora_storage_usage', { 
      p_corretora_id: userProfile.corretora_id 
    });

    if (rpcError) {
      console.warn("Erro ao sincronizar via RPC:", rpcError);
    }

    const { data, error } = await supabase
      .from('tab_corretora_config')
      .select('storage_usado_bytes')
      .eq('id', userProfile.corretora_id)
      .maybeSingle();

    if (error) throw error;

    const bytes = Number(data?.storage_usado_bytes || 0);
    const mb = bytes / (1024 * 1024);
    // O limite vem da assinatura ou assume 50MB como padrão do Plano IA
    const limitePlano = assinaturaDb?.storage_limite_mb || 50;

    setUsoStorage({ 
      bytes, 
      mb, 
      percentual: Math.min((mb / limitePlano) * 100, 100) 
    });
  } catch (err) {
    console.error("Erro fetchUsoStorage:", err);
  }
}, [userProfile?.corretora_id, assinaturaDb?.storage_limite_mb]);

  // CORREÇÃO AQUI: Usando .list() para obter o tamanho do arquivo
  const repairStorageSizes = async () => {
  if (!userProfile?.corretora_id) return;
  setIsSyncingStorage(true);
  try {
    // Agora apenas chamamos a RPC, que já faz todo o trabalho pesado no servidor
    await fetchUsoStorage();
    alert("O uso de armazenamento foi sincronizado com sucesso com os arquivos reais!");
  } catch (err: any) {
    console.error("Erro ao reparar:", err);
    alert("Erro na sincronização: " + err.message);
  } finally {
    setIsSyncingStorage(false);
  }
};

  useEffect(() => {
    if (user?.id) fetchConfig();
  }, [user?.id, fetchConfig]);

  useEffect(() => {
    if (activeTab === "plano" && userProfile?.corretora_id) {
      fetchAssinatura();
      fetchUsoStorage();
    }
  }, [activeTab, userProfile?.corretora_id, fetchAssinatura, fetchUsoStorage]);

  // Dentro do seu export default function ConfigCorretora() { ... }

  useEffect(() => {
    const handleLogoUpdate = (event: any) => {
      const newUrl = event.detail;
      if (newUrl) {
        setForm(prev => ({ ...prev, logotipo_url: newUrl }));
      }
    };

    // Escuta o evento disparado tanto pela função handleUpload interna quanto pela handleUploadLogo do ModalSite
    window.addEventListener("logoUpdated", handleLogoUpdate);

    return () => {
      window.removeEventListener("logoUpdated", handleLogoUpdate);
    };
  }, []);

  if (authLoading || (fetchingConfig && !form.razao_social)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Autenticando sessão segura...</p>
      </div>
    );
  }

  if (!userProfile || userProfile.tipo_usuario !== "CORRETORA") {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-red-100 text-center">
        <ShieldAlert className="text-red-600 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <button onClick={() => navigate(-1)} className="mt-4 bg-slate-100 px-6 py-2 rounded-xl">Voltar</button>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let finalValue: any = type === "checkbox" ? checked : value;
    if (name === "cnpj") finalValue = maskCNPJ(value);
    if (["whatsapp_comercial", "ddd_telefone_1", "telefone_responsavel"].includes(name)) finalValue = maskPhone(value);
    setForm(prev => ({ ...prev, [name]: finalValue }));
  };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userProfile?.corretora_id}-${Date.now()}.${fileExt}`;
      
      // 1. Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('logo_corretoras')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Pegar a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logo_corretoras')
        .getPublicUrl(fileName);

      // 3. ALTERAÇÃO AQUI: Salva direto no banco de dados (como no ModalSite)
      const { error: dbError } = await supabase
        .from("tab_corretora_config")
        .upsert({ 
          id: userProfile?.corretora_id, 
          logotipo_url: publicUrl,
          logo_tamanho_bytes: file.size 
        });

      if (dbError) throw dbError;

      // 4. Atualiza o estado local e dispara o evento global
      setForm(prev => ({ ...prev, logotipo_url: publicUrl }));
      window.dispatchEvent(new CustomEvent("logoUpdated", { detail: publicUrl }));
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      await fetchUsoStorage();
      
    } catch (error: any) { 
      console.error("Erro no upload:", error);
      alert('Erro no upload: ' + error.message); 
    } finally { 
      setUploading(false); 
    }
  }

  async function handleBuscarCNPJ() {
    const clean = form.cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return alert("CNPJ inválido");
    setLoadingCNPJ(true);
    try {
      const data = await buscarCNPJ(clean);
      setForm(prev => ({
        ...prev,
        razao_social: (data.razao_social || "").toUpperCase(),
        nome_fantasia: (data.nome_fantasia || "").toUpperCase(),
        natureza_juridica: (data.natureza_juridica || "").toUpperCase(),
        porte: (data.porte || "").toUpperCase(),
        capital_social: data.capital_social?.toString() || "",
        ddd_telefone_1: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : "",
        opcao_pelo_mei: !!data.opcao_pelo_mei,
        opcao_pelo_simples: !!data.opcao_pelo_simples,
        cep: data.cep || prev.cep,
        logradouro: (data.logradouro || "").toUpperCase(),
        bairro: (data.bairro || "").toUpperCase(),
        municipio: (data.municipio || "").toUpperCase(),
        uf: (data.uf || "").toUpperCase(),
        numero: data.numero || "",
      }));
    } catch { alert("Erro ao buscar CNPJ."); }
    finally { setLoadingCNPJ(false); }
  }

  async function handleBuscarCEP() {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) return alert("CEP inválido");
    setLoadingCEP(true);
    try {
      const data = await buscarCEP(clean);
      setForm(prev => ({
        ...prev,
        logradouro: (data.street || "").toUpperCase(),
        bairro: (data.neighborhood || "").toUpperCase(),
        municipio: (data.city || "").toUpperCase(),
        uf: (data.state || "").toUpperCase()
      }));
    } catch { alert("CEP não encontrado."); }
    finally { setLoadingCEP(false); }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    const payload: any = {};
    const lowercaseFields = ["logotipo_url", "website", "instagram", "facebook", "email_corporativo", "email_responsavel"];
    
    Object.keys(form).forEach(key => {
      if (["usuarios_perfis", "storage_usado_bytes"].includes(key)) return; 
      const value = (form as any)[key];
      if (typeof value === "string" && value.trim() === "") {
        payload[key] = null;
      } else if (key === "capital_social") {
        payload[key] = value ? parseFloat(value.toString().replace(",", ".")) : null;
      } else if (lowercaseFields.includes(key)) {
        payload[key] = typeof value === "string" ? value.toLowerCase().trim() : value;
      } else {
        payload[key] = typeof value === "string" ? value.toUpperCase() : value;
      }
    });

    payload.id = userProfile?.corretora_id;

    try {
      const { error } = await supabase.from("tab_corretora_config").upsert(payload);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("logoUpdated", { detail: payload.logotipo_url }));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) { alert(`Erro: ${err.message}`); } 
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right">
          <CheckCircle2 size={24} /> <span className="font-bold">Configurações salvas!</span>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel da Corretora</h1>
        <p className="text-slate-500 text-sm">Gerencie os dados institucionais e sua assinatura.</p>
      </header>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-900 w-fit rounded-2xl mb-8">
        <TabButton active={activeTab === "perfil"} onClick={() => setActiveTab("perfil")} icon={<Building2 size={18} />} label="Dados da Empresa" />
        <TabButton active={activeTab === "pessoal"} onClick={() => setActiveTab("pessoal")} icon={<Phone size={18} />} label="Dados do Responsável" />
        <TabButton active={false} onClick={() => setIsModalSiteOpen(true)} icon={<Globe size={18} />} label="Site Corporativo" />
        <TabButton active={activeTab === "plano"} onClick={() => setActiveTab("plano")} icon={<ShieldCheck size={18} />} label="Assinatura" />
      </div>

      {activeTab === "perfil" && (
        <form onSubmit={handleSalvar} className="space-y-6 animate-in fade-in duration-300">
          <Section icon={<Building2 size={20} className="text-blue-500" />} title="Identificação Jurídica">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div className="md:col-span-2">
                <ActionInput label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} onAction={handleBuscarCNPJ} loading={loadingCNPJ} placeholder="00.000.000/0000-00" />
              </div>
              <div className="md:col-span-4"><Input label="Razão Social" name="razao_social" value={form.razao_social} onChange={handleChange} readOnly /></div>
              <div className="md:col-span-3"><Input label="Nome Fantasia" name="nome_fantasia" value={form.nome_fantasia} onChange={handleChange} readOnly /></div>
              <div className="md:col-span-3"><Input label="Natureza Jurídica" name="natureza_juridica" value={form.natureza_juridica} onChange={handleChange} readOnly /></div>
              <div className="md:col-span-6">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Logotipo da Corretora</label>
                <div className="flex items-center gap-6 p-4 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="w-24 h-24 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden relative group">
                    {form.logotipo_url ? (
                      <>
                        <img src={form.logotipo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, logotipo_url: "" }))} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <ImageIcon size={32} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-3">Arraste ou clique para selecionar (PNG, JPG de até 2MB)</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                      {uploading ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <Upload size={18} className="text-blue-600" />}
                      {uploading ? "Enviando..." : "Selecionar Logo"}
                      <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2"><Input label="Capital Social" name="capital_social" value={form.capital_social} onChange={handleChange} readOnly /></div>
              <div className="md:col-span-2"><Input label="Porte" name="porte" value={form.porte} onChange={handleChange} readOnly /></div>
            </div>
          </Section>

          <Section icon={<MapPin size={20} className="text-orange-500" />} title="Sede da Empresa">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div className="md:col-span-2">
                <ActionInput label="CEP" name="cep" value={form.cep} onChange={handleChange} onAction={handleBuscarCEP} loading={loadingCEP} placeholder="00000-000" />
              </div>
              <div className="md:col-span-3"><Input label="Logradouro" name="logradouro" value={form.logradouro} onChange={handleChange} /></div>
              <div className="md:col-span-1"><Input label="Nº" name="numero" value={form.numero} onChange={handleChange} /></div>
              <div className="md:col-span-2"><Input label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} /></div>
              <div className="md:col-span-2"><Input label="Cidade" name="municipio" value={form.municipio} onChange={handleChange} readOnly /></div>
              <div className="md:col-span-1"><Input label="UF" name="uf" value={form.uf} onChange={handleChange} maxLength={2} readOnly /></div>
              <div className="md:col-span-1"><Input label="Comp." name="complemento" value={form.complemento} onChange={handleChange} /></div>
            </div>
          </Section>

          <Section icon={<Globe size={20} className="text-indigo-500" />} title="Canais Digitais">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input label="WhatsApp Comercial" name="whatsapp_comercial" icon={<Phone size={14}/>} value={form.whatsapp_comercial} onChange={handleChange} />
              <Input label="Telefone API (CNPJ)" name="ddd_telefone_1" icon={<Phone size={14}/>} value={form.ddd_telefone_1} onChange={handleChange} />
              <Input label="E-mail Corporativo" name="email_corporativo" type="email" icon={<Mail size={14}/>} value={form.email_corporativo} onChange={handleChange} />
              <Input label="Website" name="website" icon={<Globe size={14}/>} value={form.website} onChange={handleChange} />
              <Input label="Instagram" name="instagram" icon={<Instagram size={14}/>} value={form.instagram} onChange={handleChange} />
              <Input label="Facebook" name="facebook" icon={<Facebook size={14}/>} value={form.facebook} onChange={handleChange} />
              <Input label="Registro SUSEP" name="registro_susep" value={form.registro_susep} onChange={handleChange} placeholder="Obrigatório para PJ" icon={<FileText size={14}/>} />
            </div>
          </Section>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-12 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/25 transition-all">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Dados Empresariais
            </button>
          </div>
        </form>
      )}

      {activeTab === "pessoal" && (
        <form onSubmit={handleSalvar} className="space-y-6 animate-in fade-in duration-300">
          <Section icon={<UserCheck size={20} className="text-green-500" />} title="Responsável e Contato Direto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Input label="Nome do Contato / Responsável" name="nome_responsavel" placeholder="NOME COMPLETO" icon={<User size={14}/>} value={form.nome_responsavel} onChange={handleChange} />
              </div>
              <Input label="Telefone Whats (Pessoal)" name="telefone_responsavel" placeholder="(00) 00000-0000" icon={<Phone size={14}/>} value={form.telefone_responsavel} onChange={handleChange} />
              <Input label="E-mail Pessoal" name="email_responsavel" type="email" placeholder="email@exemplo.com" icon={<Mail size={14}/>} value={form.email_responsavel} onChange={handleChange} />
            </div>
          </Section>
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-12 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/25 transition-all">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Dados do Responsável
            </button>
          </div>
        </form>
      )}

      {activeTab === "plano" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase">
                      Plano {assinaturaDb?.plano_nome || form.plano || 'FREE'}
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${(form?.status_pagamento || 'PENDENTE') === 'ATIVO' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {form?.status_pagamento || 'STATUS INDEFINIDO'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-0.5">
                    {form?.plano === 'FREE' ? 'Período de teste de 7 dias.' : 'Assinatura profissional identificada.'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalPlanosOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                {form?.plano === 'FREE' ? 'Escolher Plano Pro' : 'Gerenciar Plano'}
              </button>
            </div>

            {assinaturaDb ? (
              <div className="mt-8 p-6 bg-slate-50/50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Investimento</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(assinaturaDb?.valor_total || 0))}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Usuários Extras</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">+{assinaturaDb?.qtd_usuarios_adicionais || 0} contas</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Site Corporativo</p>
                    <p className={`text-sm font-black ${assinaturaDb?.possui_site ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {assinaturaDb?.possui_site ? 'ATIVADO' : 'NÃO INCLUSO'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Armazenamento IA</p>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-black text-blue-600">
                        {usoStorage.mb.toFixed(2)} MB <span className="text-slate-400 font-medium">/ {assinaturaDb?.storage_limite_mb || 50} MB</span>
                      </p>
                      
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 ${usoStorage.percentual > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                          style={{ width: `${usoStorage.percentual}%` }}
                        />
                      </div>
                      
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Soma total da corretora e corretores vinculados.
                      </p>

                      <button 
                        onClick={repairStorageSizes}
                        disabled={isSyncingStorage}
                        className="mt-2 flex items-center justify-start gap-2 text-[10px] font-bold uppercase tracking-tighter text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSyncingStorage ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                        {isSyncingStorage ? "Sincronizando..." : "Atualizar Tamanho Real"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 p-6 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-center">
                <p className="text-sm text-slate-400 italic">Carregando detalhes do plano...</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${(form?.status_pagamento || 'PENDENTE') === 'ATIVO' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>Próxima renovação:</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 ml-1">
                  {form?.data_expiracao ? new Date(form.data_expiracao).toLocaleDateString('pt-BR') : '--/--/----'}
                </span>
              </div>
            </div>
          </div>
          <ModalPlanos isOpen={isModalPlanosOpen} onClose={() => { setIsModalPlanosOpen(false); fetchConfig(); fetchAssinatura(); }} planoAtual={form?.plano || 'FREE'} />
        </div>
      )}
      <ModalSite 
        isOpen={isModalSiteOpen} 
        onClose={() => setIsModalSiteOpen(false)} 
        corretoraId={userProfile?.corretora_id} 
      />
    </div>
  );
}

function Section({ title, icon, children }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[24px] shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50/50 dark:bg-zinc-800/30 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-3">
        {icon} <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">{title}</h2>
      </div>
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}

function Input({ label, icon, className = "", ...props }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">{label}</label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-4 text-slate-400">{icon}</span>}
        <input 
          {...props} 
          value={props.value ?? ""}
          className={`w-full h-11 ${icon ? 'pl-11' : 'px-4'} rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${className}`} 
        />
      </div>
    </div>
  );
}

function ActionInput({ label, onAction, loading, ...props }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">{label}</label>
      <div className="relative">
        <input 
          {...props} 
          value={props.value ?? ""}
          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
        />
        <button type="button" onClick={onAction} disabled={loading} className="absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center border border-blue-100 dark:border-blue-800">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Buscar"}
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: any) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"}`}>{icon} {label}</button>
  );
}
