import { useState, useEffect } from "react";
import { X, Save, Globe, Loader2, Palette, Layout, CheckCircle2, ImageIcon, Upload, Camera, Star } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

interface ModalSiteProps {
  isOpen: boolean;
  onClose: () => void;
  corretoraId: string;
}

interface HeroSlide {
  imagem_url: string;
  titulo: string;
  subtitulo: string;
  tamanho_bytes?: number; // Adicionado
}

interface Depoimento {
  autor: string;
  texto: string;
  estrelas: number;
  foto_url: string;
  tamanho_bytes?: number; // Adicionado
}

export function ModalSite({ isOpen, onClose, corretoraId }: ModalSiteProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  

    const [form, setForm] = useState({
    slug: "",
    nome_exibicao: "",
    cor_primaria: "#2563eb",
    status_site: true,
    // Novos campos da tab_corretora_config
    instagram: "",
    facebook: "",
    email_corporativo: "",
    whatsapp_comercial: "",
    logotipo_url: "",
    logo_tamanho_bytes: 0,
    hero_slides: [] as (HeroSlide & { tamanho_bytes?: number })[],
    diferenciais: {
        imagem_url: "",
        tamanho_bytes: 0,
        itens: [
            { titulo: "", descricao: "" },
            { titulo: "", descricao: "" },
            { titulo: "", descricao: "" }
        ]
    },
    sobre_conteudo: {
        historia: "",
        missao: "",
        visao: "",
        valores: "",
        imagem_sobre_url: "",
        tamanho_bytes: 0
    },
    depoimentos: [] as Depoimento[],
    });

  useEffect(() => {
    console.log("🛠️ [DEBUG MODAL] Buscando site para ID:", corretoraId);
    if (isOpen && corretoraId) fetchConfig();
  }, [isOpen, corretoraId]);

  // Função auxiliar para validar tamanho antes do upload
  const validarLimiteSessao = (novoArquivoBytes: number) => {
    const LIMITE_MAX = 50 * 1024 * 1024; // 50MB
    
    const totalAtual = 
      (form.logo_tamanho_bytes || 0) +
      (form.hero_slides?.reduce((acc, s) => acc + (s.tamanho_bytes || 0), 0) || 0) +
      (form.sobre_conteudo.tamanho_bytes || 0) +
      (form.diferenciais.tamanho_bytes || 0) +
      (form.depoimentos?.reduce((acc, d) => acc + (d.tamanho_bytes || 0), 0) || 0);

    if (totalAtual + novoArquivoBytes > LIMITE_MAX) {
      alert("⚠️ Limite de armazenamento do Plano IA atingido para esta sessão.");
      return false;
    }
    return true;
  };



async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
  try {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];

    // Validação da Trava de Armazenamento (Plano IA)
    if (!validarLimiteSessao(file.size)) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${corretoraId}-${Date.now()}.${fileExt}`;

    // Upload para o Bucket
    const { error: uploadError } = await supabase.storage
      .from('logo_corretoras')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Obtenção da URL Pública
    const { data: { publicUrl } } = supabase.storage
      .from('logo_corretoras')
      .getPublicUrl(fileName);

    // Atualização do Estado: Mantendo dados anteriores + Nova Logo + Tamanho para cálculo
    setForm({ 
      ...form, 
      logotipo_url: publicUrl, 
      logo_tamanho_bytes: file.size 
    } as any);

    // Disparo do evento para atualização em tempo real na UI (se houver listeners)
    window.dispatchEvent(new CustomEvent("logoUpdated", { detail: publicUrl }));

  } catch (err: any) {
    console.error("Erro detalhado no upload:", err);
    alert('Erro no upload: ' + err.message);
  } finally {
    setUploading(false);
  }
}

async function handleUploadHeroImage(e: React.ChangeEvent<HTMLInputElement>, index: number) {
  try {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Trava de Segurança: Valida o limite do Plano IA antes de iniciar o upload
    if (!validarLimiteSessao(file.size)) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `hero-${corretoraId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('site_assets')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('site_assets')
      .getPublicUrl(fileName);

    const newSlides = [...form.hero_slides];
    newSlides[index] = {
      ...newSlides[index],
      imagem_url: publicUrl,
      tamanho_bytes: file.size // Crucial para o cálculo dinâmico da trava
    } as any; 

    setForm({ ...form, hero_slides: newSlides });

  } catch (err: any) {
    console.error("Erro no upload do Hero:", err);
    alert('Erro no upload: ' + err.message);
  } finally {
    setUploading(false);
  }
}

const addSlide = () => {
  if (form.hero_slides.length < 5) {
    setForm({
      ...form,
      hero_slides: [
        ...form.hero_slides, 
        { 
          imagem_url: "", 
          titulo: "", 
          subtitulo: "",
          tamanho_bytes: 0 // Inicializa com 0 para evitar 'undefined' no cálculo da trava
        }
      ]
    } as any);
  }
};

const removeSlide = (index: number) => {
  setForm({
    ...form,
    hero_slides: form.hero_slides.filter((_, i) => i !== index)
  });
  // Ao remover o slide, o validarLimiteSessao calculará o novo total automaticamente 
  // na próxima tentativa de upload, liberando o espaço que era ocupado por este slide.
};

async function handleUploadAboutImage(e: React.ChangeEvent<HTMLInputElement>) {
  try {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Validação da Trava de Armazenamento (Plano IA) antes de processar
    if (!validarLimiteSessao(file.size)) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `about-${corretoraId}-${Date.now()}.${fileExt}`;

    // Upload para o bucket site_assets
    const { error: uploadError } = await supabase.storage
      .from('site_assets')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Recuperação da URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('site_assets')
      .getPublicUrl(fileName);

    // Atualização do estado preservando os campos de texto e injetando a nova imagem + peso
    setForm(prev => ({
      ...prev,
      sobre_conteudo: {
        ...prev.sobre_conteudo,
        imagem_sobre_url: publicUrl,
        tamanho_bytes: file.size // Necessário para o cálculo dinâmico da trava na sessão
      } as any // Cast para compatibilidade com a interface durante a transição
    }));

  } catch (err: any) {
    console.error("Erro no upload da imagem 'Sobre':", err);
    alert('Erro no upload da foto sobre: ' + err.message);
  } finally {
    setUploading(false);
  }
}

async function handleUploadDiferenciaisImage(e: React.ChangeEvent<HTMLInputElement>) {
  try {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Validação da Trava de Armazenamento (Plano IA) antes de iniciar o processo
    if (!validarLimiteSessao(file.size)) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `diff-${corretoraId}-${Date.now()}.${fileExt}`;

    // Upload para o bucket site_assets
    const { error: uploadError } = await supabase.storage
      .from('site_assets')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Recuperação da URL pública do arquivo enviado
    const { data: { publicUrl } } = supabase.storage
      .from('site_assets')
      .getPublicUrl(fileName);

    // Atualização do estado: preserva os 'itens' (títulos e descrições) e atualiza a imagem + tamanho
    setForm(prev => ({
      ...prev,
      diferenciais: {
        ...prev.diferenciais,
        imagem_url: publicUrl,
        tamanho_bytes: file.size // Essencial para o cálculo dinâmico da trava
      } as any // Cast para evitar conflitos com a interface durante a transição
    }));

  } catch (err: any) {
    console.error("Erro no upload dos Diferenciais:", err);
    alert('Erro no upload: ' + err.message);
  } finally {
    setUploading(false);
  }
}

async function handleUploadDepoimentoFoto(e: React.ChangeEvent<HTMLInputElement>, index: number) {
  try {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Trava Ativa: Validação do limite do Plano IA antes de iniciar o upload
    if (!validarLimiteSessao(file.size)) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `testi-${corretoraId}-${Date.now()}.${fileExt}`;

    // Upload para o bucket site_assets
    const { error: uploadError } = await supabase.storage
      .from('site_assets')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Recuperação da URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('site_assets')
      .getPublicUrl(fileName);

    // Atualização do array de depoimentos preservando dados e injetando foto + peso
    const novosDepoimentos = [...form.depoimentos];
    novosDepoimentos[index] = {
      ...novosDepoimentos[index],
      foto_url: publicUrl,
      tamanho_bytes: file.size // Necessário para o cálculo dinâmico da trava
    } as any; 

    setForm({ ...form, depoimentos: novosDepoimentos });

  } catch (err: any) {
    console.error("Erro no upload da foto do depoimento:", err);
    alert('Erro no upload: ' + err.message);
  } finally {
    setUploading(false);
  }
}

const addDepoimento = () => {
  if (form.depoimentos.length < 6) {
    setForm({
      ...form,
      depoimentos: [
        ...form.depoimentos, 
        { 
          autor: "", 
          texto: "", 
          estrelas: 5, 
          foto_url: "",
          tamanho_bytes: 0 // Inicializado para evitar erro de cálculo na trava
        } as any
      ]
    });
  }
};

async function fetchConfig() {
  setFetching(true);
  try {
    // Busca simultânea nas duas tabelas: Site e Configurações Gerais
    const [resSite, resConfig] = await Promise.all([
      supabase.from("tab_configuracoes_site").select("*").eq("corretora_id", corretoraId).maybeSingle(),
      supabase.from("tab_corretora_config").select("*").eq("id", corretoraId).maybeSingle()
    ]);

    if (resSite.data) {
      setForm(prev => ({
        ...prev,
        slug: resSite.data.slug || "",
        nome_exibicao: resSite.data.nome_exibicao || "",
        cor_primaria: resSite.data.cor_primaria || "#2563eb",
        status_site: resSite.data.status_site ?? true,
        
        // Prioriza a logo da config geral, mas mantém fallback para o site
        logotipo_url: resConfig.data?.logotipo_url || resSite.data.logo_url || "",
        logo_tamanho_bytes: resConfig.data?.logo_tamanho_bytes || resSite.data.logo_tamanho_bytes || 0,

        // Mapeia slides garantindo que o campo tamanho_bytes exista para o cálculo da trava
        hero_slides: (resSite.data.hero_slides || []).map((s: any) => ({
          ...s,
          tamanho_bytes: s.tamanho_bytes || 0
        })),

        // Garante estrutura de diferenciais com tamanho_bytes
        diferenciais: resSite.data.diferenciais?.itens 
          ? { 
              ...resSite.data.diferenciais, 
              tamanho_bytes: resSite.data.diferenciais.tamanho_bytes || 0 
            }
          : { 
              imagem_url: "", 
              tamanho_bytes: 0,
              itens: [{ titulo: "", descricao: "" }, { titulo: "", descricao: "" }, { titulo: "" , descricao: "" }] 
            },

        // Garante estrutura do Sobre com tamanho_bytes
        sobre_conteudo: {
          historia: resSite.data.sobre_conteudo?.historia || "",
          missao: resSite.data.sobre_conteudo?.missao || "",
          visao: resSite.data.sobre_conteudo?.visao || "",
          valores: resSite.data.sobre_conteudo?.valores || "",
          imagem_sobre_url: resSite.data.sobre_conteudo?.imagem_sobre_url || "",
          tamanho_bytes: resSite.data.sobre_conteudo?.tamanho_bytes || 0
        },

        // Mapeia depoimentos garantindo o campo de peso
        depoimentos: (resSite.data.depoimentos || []).map((d: any) => ({
          ...d,
          tamanho_bytes: d.tamanho_bytes || 0
        })),
      }));
    }

    // Complementa com dados da corretora (Redes Sociais e Contatos)
    if (resConfig.data) {
      setForm(prev => ({
        ...prev,
        instagram: resConfig.data.instagram || "",
        facebook: resConfig.data.facebook || "",
        email_corporativo: resConfig.data.email_corporativo || "",
        whatsapp_comercial: resConfig.data.whatsapp_comercial || "",
        // Logotipo e seu tamanho já tratados no bloco acima, mas reforçados aqui por segurança
        logotipo_url: resConfig.data.logotipo_url || prev.logotipo_url,
        logo_tamanho_bytes: resConfig.data.logo_tamanho_bytes || prev.logo_tamanho_bytes,
      }));
    }
  } catch (err) {
    console.error("Erro ao carregar dados do site/corretora:", err);
  } finally {
    setFetching(false);
  }
}

async function handleSalvar(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  try {
    const cleanSlug = form.slug.toLowerCase().trim().replace(/\s+/g, '-');

    // --- CÁLCULO DA SOMA TOTAL DO SITE (Baseado no estado atual do formulário) ---
    const heroTamanho = form.hero_slides?.reduce((acc, s) => acc + (s.tamanho_bytes || 0), 0) || 0;
    const sobreTamanho = form.sobre_conteudo?.tamanho_bytes || 0;
    const diferenciaisTamanho = form.diferenciais?.tamanho_bytes || 0;
    const depoimentosTamanho = form.depoimentos?.reduce((acc, d) => acc + (d.tamanho_bytes || 0), 0) || 0;
    const logoTamanho = form.logo_tamanho_bytes || 0;

    const totalBytesSite = heroTamanho + sobreTamanho + diferenciaisTamanho + depoimentosTamanho + logoTamanho;

    // 1. Tabela de Configurações do Site
    const promise1 = supabase
      .from("tab_configuracoes_site")
      .upsert({
        corretora_id: corretoraId,
        slug: cleanSlug,
        nome_exibicao: form.nome_exibicao,
        cor_primaria: form.cor_primaria,
        status_site: form.status_site,
        logo_url: form.logotipo_url,
        hero_slides: form.hero_slides,
        diferenciais: form.diferenciais,
        sobre_conteudo: form.sobre_conteudo,
        depoimentos: form.depoimentos,
        site_tamanho_bytes: totalBytesSite, // Persistência da trava do Plano IA
      }, { 
        onConflict: 'corretora_id' 
      });

    // 2. Tabela de Configurações da Corretora
    const promise2 = supabase
      .from("tab_corretora_config")
      .update({
        instagram: form.instagram,
        facebook: form.facebook,
        email_corporativo: form.email_corporativo,
        whatsapp_comercial: form.whatsapp_comercial,
        logotipo_url: form.logotipo_url,
        logo_tamanho_bytes: logoTamanho, // Sincroniza o peso da logo na config geral
      })
      .eq("id", corretoraId);

    const [res1, res2] = await Promise.all([promise1, promise2]);

    if (res1.error) throw res1.error;
    if (res2.error) throw res2.error;

    // 3. Sincroniza o Storage para o Dashboard atualizar na hora (RPC)
    // Isso garante que o progresso de 0/50MB no Dashboard mude imediatamente após o save
    await supabase.rpc('sync_corretora_storage_usage', { p_corretora_id: corretoraId });

    setShowSuccess(true);
    setTimeout(() => { 
      setShowSuccess(false); 
      onClose(); 
    }, 1500);

  } catch (err: any) {
    console.error("Erro ao salvar:", err);
    alert("Erro ao salvar: " + (err.message || "Erro desconhecido"));
  } finally {
    setLoading(false);
  }
}

  if (!isOpen) return null;

return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800">
      
      {/* HEADER */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configurar Site Institucional</h2>
            <p className="text-xs text-slate-500">Sessão 1: Identidade e Topo (Navbar)</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSalvar}>
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {fetching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-sm text-slate-400">Sincronizando dados das tabelas...</p>
            </div>
          ) : (
            <>
              {/* --- SESSÃO: IDENTIDADE VISUAL --- */}
<div className="space-y-6">
  <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
    <Palette size={14} /> Identidade & Link
  </h3>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 bg-slate-50/50 dark:bg-zinc-800/20 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
    
    {/* NOME DE EXIBIÇÃO */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 ml-1">
        Nome de Exibição
      </label>
      <input 
        required
        type="text"
        className="h-12 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
        value={form.nome_exibicao}
        onChange={e => setForm({...form, nome_exibicao: e.target.value})}
        placeholder="Ex: Imbi Seguros"
      />
    </div>

    {/* SLUG (URL ÚNICA) */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 ml-1">
        Slug (URL Única)
      </label>
      <div className="flex items-center h-12 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <span className="px-4 text-[9px] font-bold text-slate-400 dark:text-zinc-500 bg-slate-100/80 dark:bg-zinc-900 h-full flex items-center border-r border-slate-100 dark:border-zinc-800 whitespace-nowrap tracking-tight">
          crm-site-weld.vercel.app/
        </span>
        <input 
          required
          type="text"
          className="flex-1 h-full px-4 text-xs font-bold text-blue-600 dark:text-blue-400 outline-none bg-transparent"
          value={form.slug}
          onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
          placeholder="minha-corretora"
        />
      </div>
    </div>

    {/* COR DA IDENTIDADE */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 ml-1">
        Cor da Identidade
      </label>
      <div className="flex gap-2">
        <div className="relative w-14 h-12 shrink-0">
          <input 
            type="color" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={form.cor_primaria}
            onChange={e => setForm({...form, cor_primaria: e.target.value})}
          />
          <div 
            className="w-full h-full rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm transition-transform active:scale-90"
            style={{ backgroundColor: form.cor_primaria }}
          />
        </div>
        <input 
          type="text"
          className="flex-1 h-12 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-mono uppercase text-slate-600 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500/20 outline-none"
          value={form.cor_primaria}
          onChange={e => setForm({...form, cor_primaria: e.target.value})}
          maxLength={7}
        />
      </div>
    </div>

    {/* STATUS COM BOTÃO "VER SITE" ROBUSTO */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 ml-1">
        Status Global
      </label>
      <div className="flex flex-col gap-3">
        <button 
          type="button"
          onClick={() => setForm({...form, status_site: !form.status_site})}
          className={`h-12 px-4 rounded-xl border transition-all flex items-center justify-between group ${
            form.status_site 
            ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
            : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-500'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">
            {form.status_site ? 'Site Ativo' : 'Site Offline'}
          </span>
          <div className={`w-2.5 h-2.5 rounded-full transition-all ${
            form.status_site 
            ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
            : 'bg-slate-300 dark:bg-zinc-700'
          }`} />
        </button>

        {form.status_site && form.slug && (
          <a 
            href={`https://crm-site-weld.vercel.app/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all shadow-sm active:scale-95 group"
          >
            <Globe size={14} className="group-hover:rotate-12 transition-transform" />
            Ver Site Online
          </a>
        )}
      </div>
    </div>
  </div>

  {/* LOGOTIPO */}
  <div className="flex flex-col border-t border-slate-100 dark:border-zinc-800 pt-8 mt-4">
    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-4 ml-1">
      Logotipo da Corretora
    </label>
    <div className="flex flex-wrap items-center gap-6">
      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden group relative shadow-inner">
        {form.logotipo_url ? (
          <img src={form.logotipo_url} alt="Logo" className="w-full h-full object-contain p-3 transition-transform group-hover:scale-110" />
        ) : (
          <ImageIcon size={28} className="text-slate-200 dark:text-zinc-800" />
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 flex items-center justify-center backdrop-blur-[2px]">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-[200px] space-y-3">
        <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 cursor-pointer transition-all border border-slate-200 dark:border-zinc-700 shadow-sm active:scale-95">
          <Upload size={14} className="text-blue-500" />
          {form.logotipo_url ? 'Alterar Logotipo' : 'Selecionar Logotipo'}
          <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading} />
        </label>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
            Formatos aceitos: <span className="text-slate-600 dark:text-zinc-300 underline underline-offset-2">PNG ou SVG</span>.
          </p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
            Tamanho máximo recomendado: <span className="text-slate-600 dark:text-zinc-300 underline underline-offset-2">2MB</span>.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

              {/* --- SESSÃO: TOPO (NAVBAR & CONTATOS) --- */}
<div className="space-y-4">
  <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
    <Layout size={14} /> Dados de Contato (Navbar)
  </h3>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 dark:bg-zinc-800/20 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
    
    {/* INSTAGRAM */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1.5 ml-1">
        Instagram (@)
      </label>
      <div className="relative group">
        <input 
          type="text"
          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
          value={form.instagram}
          onChange={e => setForm({...form, instagram: e.target.value})}
          placeholder="@suacorretora"
        />
      </div>
    </div>

    {/* FACEBOOK */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1.5 ml-1">
        Facebook (URL)
      </label>
      <input 
        type="text"
        className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
        value={form.facebook}
        onChange={e => setForm({...form, facebook: e.target.value})}
        placeholder="facebook.com/nomedapagina"
      />
    </div>

    {/* WHATSAPP COMERCIAL */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1.5 ml-1">
        WhatsApp Comercial
      </label>
      <div className="relative">
        <input 
          type="text"
          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
          value={form.whatsapp_comercial}
          onChange={e => setForm({...form, whatsapp_comercial: e.target.value})}
          placeholder="(00) 00000-0000"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
    </div>

    {/* E-MAIL CORPORATIVO */}
    <div className="flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1.5 ml-1">
        E-mail Corporativo
      </label>
      <input 
        type="email"
        className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
        value={form.email_corporativo}
        onChange={e => setForm({...form, email_corporativo: e.target.value})}
        placeholder="contato@corretora.com"
      />
    </div>
    
  </div>
</div>

              {/* --- SESSÃO: HERO (SLIDESHOW) --- */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
      <ImageIcon size={14} /> Imagens e textos da capa principal
    </h3>
    <button 
      type="button"
      onClick={addSlide}
      disabled={form.hero_slides.length >= 5}
      className="text-[10px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <span>+ ADICIONAR SLIDE</span>
      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px]">{form.hero_slides.length}/5</span>
    </button>
  </div>

  <div className="space-y-4">
    {form.hero_slides.map((slide, index) => (
      <div 
        key={index} 
        className="bg-slate-50/50 dark:bg-zinc-800/20 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/50 relative animate-in fade-in slide-in-from-top-2 duration-300"
      >
        {/* BOTÃO REMOVER */}
        <button 
          type="button"
          onClick={() => removeSlide(index)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
        >
          <X size={16} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Preview/Upload Imagem */}
          <div className="flex flex-col gap-2">
            <div className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative group shadow-sm">
              {slide.imagem_url ? (
                <>
                  <img src={slide.imagem_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={`Slide ${index + 1}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-[10px] text-white font-bold">TROCAR IMAGEM</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon size={20} className="text-slate-300 dark:text-zinc-700" />
                  <span className="text-[9px] font-bold text-slate-400">SEM IMAGEM</span>
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                </div>
              )}
            </div>

            <label className={`w-full text-center py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
              uploading 
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500/50 cursor-pointer'
            }`}>
              {uploading ? 'Processando...' : 'Upload da Imagem'}
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleUploadHeroImage(e, index)} 
                disabled={uploading} 
              />
            </label>
          </div>

          {/* Textos do Slide */}
          <div className="md:col-span-3 space-y-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1.5 ml-1">Título do Slide {index + 1}</label>
              <input 
                className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                value={slide.titulo}
                onChange={e => {
                  const newSlides = [...form.hero_slides];
                  newSlides[index].titulo = e.target.value;
                  setForm({...form, hero_slides: newSlides});
                }}
                placeholder="Ex: Proteção para sua Família"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1.5 ml-1">Subtítulo (Opcional)</label>
              <textarea 
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-slate-600 dark:text-zinc-300 outline-none resize-none h-20 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                value={slide.subtitulo}
                onChange={e => {
                  const newSlides = [...form.hero_slides];
                  newSlides[index].subtitulo = e.target.value;
                  setForm({...form, hero_slides: newSlides});
                }}
                placeholder="Descreva brevemente o diferencial ou benefício..."
              />
            </div>
          </div>
        </div>
      </div>
    ))}

    {form.hero_slides.length === 0 && (
      <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-zinc-800/50 rounded-[32px] bg-slate-50/30 dark:bg-zinc-900/20">
        <div className="bg-white dark:bg-zinc-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 dark:border-zinc-700">
          <ImageIcon size={20} className="text-slate-300" />
        </div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nenhum slide configurado</p>
        <p className="text-[10px] text-slate-400 mt-1">O site exibirá o conteúdo padrão da plataforma.</p>
      </div>
    )}
  </div>
</div>

              {/* --- SESSÃO: SOBRE A EMPRESA --- */}
<div className="space-y-4 pt-8 border-t border-slate-100 dark:border-zinc-800">
  <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
    <CheckCircle2 size={14} /> Seção "Sobre Nós"
  </h3>

  <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800/50 space-y-6">
    
    {/* Upload da Foto da Equipe/Corretor */}
    <div className="flex flex-col md:flex-row gap-6 items-center">
      <div className="w-32 h-40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative shrink-0 shadow-inner group">
        {form.sobre_conteudo.imagem_sobre_url ? (
          <>
            <img 
              src={form.sobre_conteudo.imagem_sobre_url} 
              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
              alt="Sobre Nós" 
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        ) : (
          <ImageIcon size={24} className="text-slate-200 dark:text-zinc-800" />
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="animate-spin text-blue-600" size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 text-center md:text-left">
        <label className={`inline-flex items-center gap-2 px-5 py-2.5 border rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-95 ${
          uploading 
            ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700'
        }`}>
          <Upload size={14} className={uploading ? "animate-pulse" : "text-blue-500"} /> 
          {uploading ? 'Enviando arquivo...' : 'Carregar Foto da Equipe'}
          <input type="file" className="hidden" accept="image/*" onChange={handleUploadAboutImage} disabled={uploading} />
        </label>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
            Recomendado: Foto em alta resolução da Equipe ou Fachada.
          </p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
            Orientação <span className="text-slate-600 dark:text-zinc-400 font-bold">Vertical (3:4)</span> ou Quadrada.
          </p>
        </div>
      </div>
    </div>

    {/* História */}
    <div className="flex flex-col">
      <div className="flex justify-between items-end mb-2 ml-1">
        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">História da Corretora</label>
        <span className={`text-[9px] font-bold tracking-tighter ${
          form.sobre_conteudo.historia.length > 550 ? 'text-orange-500' : 'text-slate-300 dark:text-zinc-600'
        }`}>
          {form.sobre_conteudo.historia.length} / 600
        </span>
      </div>
      <textarea 
        maxLength={600}
        className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-300 outline-none resize-none h-36 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
        value={form.sobre_conteudo.historia}
        onChange={e => setForm({
          ...form, 
          sobre_conteudo: { ...form.sobre_conteudo, historia: e.target.value }
        })}
        placeholder="Conte brevemente a trajetória da empresa, anos de experiência e diferenciais..."
      />
    </div>

    {/* Pilares: Missão, Visão e Valores (CORRIGIDO COM TYPESCRIPT) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {(['missao', 'visao', 'valores'] as const).map((campo) => {
        // Casting seguro para evitar o erro de index signature
        const valor = form.sobre_conteudo[campo] as string;

        return (
          <div key={campo} className="flex flex-col">
            <div className="flex justify-between items-end mb-2 ml-1">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">
                {campo}
              </label>
              <span className="text-[8px] font-bold text-slate-300 dark:text-zinc-600">
                {valor.length}/150
              </span>
            </div>
            <textarea 
              maxLength={150}
              className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-slate-600 dark:text-zinc-400 outline-none resize-none h-24 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
              value={valor}
              onChange={e => setForm({
                ...form, 
                sobre_conteudo: { 
                  ...form.sobre_conteudo, 
                  [campo]: e.target.value 
                }
              })}
              placeholder={`Descreva sua ${campo}...`}
            />
          </div>
        );
      })}
    </div>
  </div>
</div>
              
              {/* --- SESSÃO: DIFERENCIAIS --- */}
<div className="space-y-4 pt-8 border-t border-slate-100 dark:border-zinc-800">
  <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
    <Layout size={14} /> Diferenciais Competitivos
  </h3>

  <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800/50 space-y-6">
    
    {/* Imagem dos Diferenciais */}
    <div className="flex items-center gap-6 border-b border-slate-100 dark:border-zinc-800/50 pb-6">
      <div className="w-44 aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative shrink-0 shadow-sm group">
        {form.diferenciais.imagem_url ? (
          <>
            <img src={form.diferenciais.imagem_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Diferenciais" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        ) : (
          <ImageIcon size={24} className="text-slate-200 dark:text-zinc-800" />
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="animate-spin text-blue-600" size={20} />
          </div>
        )}
      </div>
      
      <div className="flex-1 space-y-2">
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-pointer transition-all border shadow-sm active:scale-95 ${
          uploading 
            ? 'bg-slate-50 text-slate-300 border-slate-100' 
            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400'
        }`}>
          <Upload size={14} className={uploading ? "animate-pulse" : "text-blue-500"} /> 
          {uploading ? 'Enviando...' : 'Carregar Imagem Lateral'}
          <input type="file" className="hidden" accept="image/*" onChange={handleUploadDiferenciaisImage} disabled={uploading} />
        </label>
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium leading-relaxed">
          Esta imagem aparecerá estrategicamente ao lado dos seus diferenciais no site.<br/>
          Tamanho sugerido: <span className="text-slate-600 dark:text-zinc-400">800x450px</span>.
        </p>
      </div>
    </div>

    {/* Lista de Itens (3 diferenciais fixos) */}
    <div className="grid grid-cols-1 gap-4">
      {(form.diferenciais?.itens || []).map((item, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-shadow">
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                {index + 1}
              </span>
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">
                Título do Diferencial
              </label>
            </div>
            <input 
              className="h-11 px-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all placeholder:text-slate-300"
              value={item.titulo}
              onChange={e => {
                const newItens = [...form.diferenciais.itens];
                newItens[index].titulo = e.target.value;
                setForm({...form, diferenciais: { ...form.diferenciais, itens: newItens }});
              }}
              placeholder="Ex: Consultoria Personalizada"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 ml-1 md:mt-0 mt-2">
              Descrição Curta do Benefício
            </label>
            <input 
              className="h-11 px-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 text-xs text-slate-600 dark:text-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all placeholder:text-slate-300"
              value={item.descricao}
              onChange={e => {
                const newItens = [...form.diferenciais.itens];
                newItens[index].descricao = e.target.value;
                setForm({...form, diferenciais: { ...form.diferenciais, itens: newItens }});
              }}
              placeholder="Ex: Analisamos seu perfil para encontrar o melhor custo-benefício."
            />
          </div>

        </div>
      ))}
    </div>
  </div>
</div>
                
              {/* --- SESSÃO: DEPOIMENTOS --- */}
<div className="space-y-6 pt-8 border-t border-slate-100 dark:border-zinc-800">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
        <CheckCircle2 size={14} /> Depoimentos de Clientes
      </h3>
    </div>
    <button 
      type="button" 
      onClick={addDepoimento}
      className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
    >
      <span>+ ADICIONAR DEPOIMENTO</span>
      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px]">{form.depoimentos.length}</span>
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {form.depoimentos.map((dep, index) => (
      <div 
        key={index} 
        className="p-5 bg-slate-50/50 dark:bg-zinc-800/20 rounded-[24px] border border-slate-100 dark:border-zinc-800/50 space-y-4 relative animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Depoimento #0{index + 1}</span>
          <button 
            type="button" 
            onClick={() => setForm({
              ...form, 
              depoimentos: form.depoimentos.filter((_, i) => i !== index)
            })}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-4 items-start">
          {/* Avatar do Cliente */}
          <div className="flex-shrink-0">
            <label className="group relative flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-blue-500 transition-all cursor-pointer overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
              {dep.foto_url ? (
                <img src={dep.foto_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={dep.autor} />
              ) : (
                <div className="flex flex-col items-center">
                  <Camera size={16} className="text-slate-300 dark:text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload size={12} className="text-white" />
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleUploadDepoimentoFoto(e, index)} 
              />
            </label>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-col">
              <label className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-1 ml-1">Nome do Cliente</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                maxLength={50}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                value={dep.autor}
                onChange={(e) => {
                  const newDeps = [...form.depoimentos];
                  newDeps[index].autor = e.target.value;
                  setForm({ ...form, depoimentos: newDeps });
                }}
              />
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 ml-1">Avaliação:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      const newDeps = [...form.depoimentos];
                      newDeps[index].estrelas = star;
                      setForm({ ...form, depoimentos: newDeps });
                    }}
                    className={`transition-colors ${star <= dep.estrelas ? 'text-yellow-400' : 'text-slate-200 dark:text-zinc-800'}`}
                  >
                    <Star size={14} fill={star <= dep.estrelas ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex justify-between items-end mb-1 ml-1">
            <label className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500">O Depoimento</label>
            <span className="text-[8px] font-bold text-slate-300 dark:text-zinc-600">{dep.texto.length}/100</span>
          </div>
          <textarea
            placeholder="Relate a experiência do cliente (máx 100 caracteres)..."
            maxLength={100}
            rows={2}
            className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-600 dark:text-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/10 resize-none italic"
            value={dep.texto}
            onChange={(e) => {
              const newDeps = [...form.depoimentos];
              newDeps[index].texto = e.target.value;
              setForm({ ...form, depoimentos: newDeps });
            }}
          />
        </div>
      </div>
    ))}
  </div>

  {form.depoimentos.length === 0 && (
    <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-[32px]">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum depoimento adicionado</p>
    </div>
  )}
</div>
                

              {/* Alerta de Sincronização */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 flex items-start gap-3 shadow-sm">
                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-tight">
                    Configuração Sincronizada
                  </p>
                  <p className="text-[10px] text-blue-700/70 dark:text-blue-400/70 leading-relaxed font-medium">
                    As alterações feitas nestas seções alimentam automaticamente o cabeçalho, corpo e links de redirecionamento do seu site oficial.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- FOOTER DO MODAL (AÇÕES FINAIS) --- */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50 rounded-b-[40px]">
          <div className="hidden md:block">
             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">SeguroCRM • Plano IA 2026</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all active:scale-95"
            >
              Descartar
            </button>
            
            <button
              type="submit"
              disabled={loading || uploading}
              className={`flex-[2] md:flex-none px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-lg ${
                showSuccess 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                  : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : showSuccess ? (
                <CheckCircle2 size={18} className="animate-bounce" />
              ) : (
                <Save size={18} />
              )}
              
              <span>
                {loading ? 'Sincronizando...' : showSuccess ? 'Site Atualizado!' : 'Publicar Alterações'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
);
}