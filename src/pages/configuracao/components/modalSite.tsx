import { useState, useEffect } from "react";
import { X, Save, Globe, Loader2, Palette, Layout, CheckCircle2, ImageIcon, Upload } from "lucide-react";
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
}

interface Depoimento {
  autor: string;
  texto: string;
  estrelas: number;
  foto_url: string;
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
    hero_slides: [] as HeroSlide[],
    diferenciais: {
        imagem_url: "",
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
        imagem_sobre_url: ""
    },
    depoimentos: [] as Depoimento[],
    });

  useEffect(() => {
    console.log("🛠️ [DEBUG MODAL] Buscando site para ID:", corretoraId);
    if (isOpen && corretoraId) fetchConfig();
  }, [isOpen, corretoraId]);

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    try {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        // Dica: Use Date.now() em vez de Math.random() para evitar cache do navegador
        const fileName = `${corretoraId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. Upload para o Storage
        const { error: uploadError } = await supabase.storage
        .from('logo_corretoras')
        .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Pegar a URL pública
        const { data: { publicUrl } } = supabase.storage
        .from('logo_corretoras')
        .getPublicUrl(filePath);

        // 3. Atualizar o estado do form local
        setForm({ ...form, logotipo_url: publicUrl });

        // --- ADIÇÃO AQUI: Disparar o evento global para atualizar o CRM instantaneamente ---
        window.dispatchEvent(new CustomEvent("logoUpdated", { detail: publicUrl }));

    } catch (err: any) {
        alert('Erro no upload: ' + err.message);
    } finally {
        setUploading(false);
    }
    }

  async function handleUploadHeroImage(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    try {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `hero-${corretoraId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
        .from('site_assets') // Certifique-se que este bucket existe
        .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
        .from('site_assets')
        .getPublicUrl(fileName);

        const newSlides = [...form.hero_slides];
        newSlides[index] = { ...newSlides[index], imagem_url: publicUrl };
        setForm({ ...form, hero_slides: newSlides });

    } catch (err: any) {
        alert('Erro no upload: ' + err.message);
    } finally {
        setUploading(false);
    }
    }

    const addSlide = () => {
    if (form.hero_slides.length < 5) {
        setForm({
        ...form,
        hero_slides: [...form.hero_slides, { imagem_url: "", titulo: "", subtitulo: "" }]
        });
    }
    };

    const removeSlide = (index: number) => {
    setForm({
        ...form,
        hero_slides: form.hero_slides.filter((_, i) => i !== index)
    });
    };  

  async function handleUploadAboutImage(e: React.ChangeEvent<HTMLInputElement>) {
    try {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `about-${corretoraId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
        .from('site_assets')
        .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
        .from('site_assets')
        .getPublicUrl(fileName);

        setForm(prev => ({
        ...prev,
        sobre_conteudo: { ...prev.sobre_conteudo, imagem_sobre_url: publicUrl }
        }));

    } catch (err: any) {
        alert('Erro no upload da foto sobre: ' + err.message);
    } finally {
        setUploading(false);
    }
    }  

  async function handleUploadDiferenciaisImage(e: React.ChangeEvent<HTMLInputElement>) {
    try {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileName = `diff-${corretoraId}-${Date.now()}.${file.name.split('.').pop()}`;
        
        const { error: uploadError } = await supabase.storage.from('site_assets').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('site_assets').getPublicUrl(fileName);

        setForm(prev => ({
        ...prev,
        diferenciais: { ...prev.diferenciais, imagem_url: publicUrl }
        }));
    } catch (err: any) {
        alert('Erro no upload: ' + err.message);
    } finally {
        setUploading(false);
    }
    }

  async function handleUploadDepoimentoFoto(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    try {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileName = `testi-${corretoraId}-${Date.now()}.${file.name.split('.').pop()}`;
        
        const { error: uploadError } = await supabase.storage.from('site_assets').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('site_assets').getPublicUrl(fileName);

        const novosDepoimentos = [...form.depoimentos];
        novosDepoimentos[index] = { ...novosDepoimentos[index], foto_url: publicUrl };
        setForm({ ...form, depoimentos: novosDepoimentos });
    } catch (err: any) {
        alert('Erro no upload: ' + err.message);
    } finally {
        setUploading(false);
    }
    }

    const addDepoimento = () => {
    if (form.depoimentos.length < 6) {
        setForm({
        ...form,
        depoimentos: [...form.depoimentos, { autor: "", texto: "", estrelas: 5, foto_url: "" }]
        });
    }
    };

  async function fetchConfig() {
  setFetching(true);
  try {
    // Busca simultânea nas duas tabelas
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
        // Se a config da corretora estiver vazia, tenta pegar a logo daqui
        logotipo_url: prev.logotipo_url || resSite.data.logo_url || "", 
        hero_slides: resSite.data.hero_slides || [],
        diferenciais: resSite.data.diferenciais?.itens 
            ? resSite.data.diferenciais 
            : { imagem_url: "", itens: [{ titulo: "", descricao: "" }, { titulo: "", descricao: "" }, { titulo: "", descricao: "" }] },
        sobre_conteudo: resSite.data.sobre_conteudo || {
            historia: "", missao: "", visao: "", valores: "", imagem_sobre_url: ""
        },
        depoimentos: resSite.data.depoimentos || [],
    }));
    }

    if (resConfig.data) {
      setForm(prev => ({
        ...prev,
        instagram: resConfig.data.instagram || "",
        facebook: resConfig.data.facebook || "",
        email_corporativo: resConfig.data.email_corporativo || "",
        whatsapp_comercial: resConfig.data.whatsapp_comercial || "",
        logotipo_url: resConfig.data.logotipo_url || "",
      }));
    }
  } catch (err) {
    console.error("Erro ao carregar dados do topo:", err);
  } finally {
    setFetching(false);
  }
}

async function handleSalvar(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  try {
    const cleanSlug = form.slug.toLowerCase().trim().replace(/\s+/g, '-');

    // 1. Tabela de Configurações do Site (Identidade)
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
      }, { 
        onConflict: 'corretora_id' 
      });

    // 2. Tabela de Configurações da Corretora (Contatos)
    const promise2 = supabase
      .from("tab_corretora_config")
      .update({
        instagram: form.instagram,
        facebook: form.facebook,
        email_corporativo: form.email_corporativo,
        whatsapp_comercial: form.whatsapp_comercial,
        logotipo_url: form.logotipo_url, 
      })
      .eq("id", corretoraId);

    const [res1, res2] = await Promise.all([promise1, promise2]);

    if (res1.error) throw res1.error;
    if (res2.error) throw res2.error;

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
                <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-[2px] flex items-center gap-2">
                  <Palette size={14} /> Identidade & Link
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 bg-slate-50/50 dark:bg-zinc-800/20 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
                  
                  {/* NOME DE EXIBIÇÃO */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Nome de Exibição</label>
                    <input 
                      required
                      className="h-12 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={form.nome_exibicao}
                      onChange={e => setForm({...form, nome_exibicao: e.target.value})}
                      placeholder="Ex: Imbi Seguros"
                    />
                  </div>

                  {/* SLUG CORRIGIDO (MAIS ESPAÇO) */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Slug (URL Única)</label>
                    <div className="flex items-center h-12 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                      <span className="px-4 text-[9px] font-bold text-slate-400 bg-slate-100/80 dark:bg-zinc-900 h-full flex items-center border-r border-slate-100 dark:border-zinc-800 whitespace-nowrap tracking-tight">
                        crm-site-weld.vercel.app/
                      </span>
                      <input 
                        required
                        className="flex-1 h-full px-4 text-xs font-bold text-blue-600 outline-none bg-transparent"
                        value={form.slug}
                        onChange={e => setForm({...form, slug: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* COR DA IDENTIDADE */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Cor da Identidade</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-14 h-12 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-1 bg-white"
                        value={form.cor_primaria}
                        onChange={e => setForm({...form, cor_primaria: e.target.value})}
                      />
                      <input 
                        className="flex-1 h-12 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500/20 outline-none"
                        value={form.cor_primaria}
                        onChange={e => setForm({...form, cor_primaria: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* STATUS COM BOTÃO "VER SITE" ROBUSTO */}
                  <div className="flex flex-col relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Status Global</label>
                    <div className="flex flex-col gap-3">
                      <button 
                        type="button"
                        onClick={() => setForm({...form, status_site: !form.status_site})}
                        className={`h-12 px-4 rounded-xl border transition-all flex items-center justify-between ${form.status_site ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                      >
                        <span className="text-xs font-bold uppercase">{form.status_site ? 'Site Ativo' : 'Site Offline'}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${form.status_site ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      </button>

                      {form.status_site && form.slug && (
                        <a 
                          href={`https://crm-site-weld.vercel.app/${form.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <Globe size={14} />
                          Ver Site Online
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* LOGOTIPO */}
                <div className="flex flex-col border-t border-slate-100 dark:border-zinc-800 pt-8 mt-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-4 ml-1">Logotipo da Corretora</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden group relative shadow-inner">
                      {form.logotipo_url ? (
                        <img src={form.logotipo_url} alt="Logo" className="w-full h-full object-contain p-3" />
                      ) : (
                        <ImageIcon size={28} className="text-slate-300" />
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center">
                          <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer transition-all border border-slate-200 dark:border-zinc-700 shadow-sm">
                        <Upload size={14} />
                        {form.logotipo_url ? 'Alterar Logotipo' : 'Selecionar Logotipo'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading} />
                      </label>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Formatos: PNG ou SVG (preferencialmente sem fundo).<br/>Tamanho máximo: 2MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- SESSÃO: TOPO (NAVBAR & CONTATOS) --- */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-[2px] flex items-center gap-2">
                  <Layout size={14} /> Dados de Contato (Navbar)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 dark:bg-zinc-800/20 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Instagram (@)</label>
                    <input 
                      className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none"
                      value={form.instagram}
                      onChange={e => setForm({...form, instagram: e.target.value})}
                      placeholder="@suacorretora"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Facebook (URL)</label>
                    <input 
                      className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none"
                      value={form.facebook}
                      onChange={e => setForm({...form, facebook: e.target.value})}
                      placeholder="facebook.com/..."
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">WhatsApp Comercial</label>
                    <input 
                      className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none font-bold text-emerald-600"
                      value={form.whatsapp_comercial}
                      onChange={e => setForm({...form, whatsapp_comercial: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">E-mail Corporativo</label>
                    <input 
                      className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none"
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
                    <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-[2px] flex items-center gap-2">
                    <ImageIcon size={14} /> Imagens e textos da capa principal
                    </h3>
                    <button 
                    type="button"
                    onClick={addSlide}
                    disabled={form.hero_slides.length >= 5}
                    className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                    + ADICIONAR SLIDE ({form.hero_slides.length}/5)
                    </button>
                </div>

                <div className="space-y-4">
                    {form.hero_slides.map((slide, index) => (
                    <div key={index} className="bg-slate-50/50 dark:bg-zinc-800/20 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/50 relative animate-in fade-in slide-in-from-top-2">
                        <button 
                        type="button"
                        onClick={() => removeSlide(index)}
                        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                        <X size={16} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        {/* Preview/Upload Imagem */}
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative">
                            {slide.imagem_url ? (
                                <img src={slide.imagem_url} className="w-full h-full object-cover" alt="Slide" />
                            ) : (
                                <ImageIcon size={20} className="text-slate-300" />
                            )}
                            </div>
                            <label className="mt-2 w-full text-center py-2 bg-slate-200 dark:bg-zinc-800 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-300 transition-all">
                            {uploading ? 'Subindo...' : 'Fazer Upload'}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadHeroImage(e, index)} disabled={uploading} />
                            </label>
                        </div>

                        {/* Textos do Slide */}
                        <div className="md:col-span-3 space-y-3">
                            <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Título do Slide {index + 1}</label>
                            <input 
                                className="h-10 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none"
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
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Subtítulo</label>
                            <textarea 
                                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs outline-none resize-none h-16"
                                value={slide.subtitulo}
                                onChange={e => {
                                const newSlides = [...form.hero_slides];
                                newSlides[index].subtitulo = e.target.value;
                                setForm({...form, hero_slides: newSlides});
                                }}
                                placeholder="Descreva brevemente o benefício deste seguro..."
                            />
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}

                    {form.hero_slides.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-[32px]">
                        <p className="text-xs text-slate-400">Nenhum slide configurado. O site usará o padrão.</p>
                    </div>
                    )}
                </div>
                </div>

              {/* --- SESSÃO: SOBRE A EMPRESA --- */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-[2px] flex items-center gap-2">
                    <CheckCircle2 size={14} /> Seção "Sobre Nós"
                </h3>

                <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/50 space-y-6">
                    
                    {/* Upload da Foto da Equipe/Corretor */}
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-32 h-40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative shrink-0">
                        {form.sobre_conteudo.imagem_sobre_url ? (
                        <img src={form.sobre_conteudo.imagem_sobre_url} className="w-full h-full object-cover" alt="Sobre" />
                        ) : (
                        <ImageIcon size={24} className="text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-all">
                        <Upload size={14} /> {uploading ? 'Enviando...' : 'Carregar Foto da Equipe'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadAboutImage} disabled={uploading} />
                        </label>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                        Recomendado: Foto em alta resolução (Equipe ou Fachada).<br/>Orientação Vertical ou Quadrada.
                        </p>
                    </div>
                    </div>

                    {/* História */}
                    <div className="flex flex-col">
                    <div className="flex justify-between items-end mb-1.5 ml-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">História da Corretora</label>
                        <span className={`text-[9px] font-bold ${form.sobre_conteudo.historia.length > 550 ? 'text-red-500' : 'text-slate-400'}`}>
                        {form.sobre_conteudo.historia.length}/600
                        </span>
                    </div>
                    <textarea 
                        maxLength={600}
                        className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none resize-none h-32 focus:ring-2 focus:ring-blue-500/20"
                        value={form.sobre_conteudo.historia}
                        onChange={e => setForm({...form, sobre_conteudo: {...form.sobre_conteudo, historia: e.target.value}})}
                        placeholder="Conte brevemente a trajetória da empresa..."
                    />
                    </div>

                    {/* Pilares: Missão, Visão e Valores */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['missao', 'visao', 'valores'].map((campo) => (
                        <div key={campo} className="flex flex-col">
                        <div className="flex justify-between items-end mb-1.5 ml-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">{campo}</label>
                            <span className="text-[8px] font-bold text-slate-300">{form.sobre_conteudo[campo as keyof typeof form.sobre_conteudo]?.length}/150</span>
                        </div>
                        <textarea 
                            maxLength={150}
                            className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs outline-none resize-none h-20"
                            value={form.sobre_conteudo[campo as keyof typeof form.sobre_conteudo]}
                            onChange={e => setForm({...form, sobre_conteudo: {...form.sobre_conteudo, [campo]: e.target.value}})}
                            placeholder={`Nossa ${campo}...`}
                        />
                        </div>
                    ))}
                    </div>
                </div>
                </div>
              
              {/* --- SESSÃO: DIFERENCIAIS --- */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-[2px] flex items-center gap-2">
                    <Layout size={14} /> Diferenciais Competitivos
                </h3>

                <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/50 space-y-6">
                    
                    {/* Imagem dos Diferenciais */}
                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-zinc-800/50 pb-6">
                    <div className="w-40 aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative shrink-0">
                        {form.diferenciais.imagem_url ? (
                        <img src={form.diferenciais.imagem_url} className="w-full h-full object-cover" alt="Diferenciais" />
                        ) : (
                        <ImageIcon size={24} className="text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1">
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 rounded-xl text-[10px] font-bold cursor-pointer hover:bg-slate-50 transition-all">
                        <Upload size={14} /> {uploading ? 'Enviando...' : 'Carregar Imagem Lateral'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadDiferenciaisImage} disabled={uploading} />
                        </label>
                        <p className="text-[9px] text-slate-400 mt-2">Esta imagem aparecerá ao lado dos textos dos diferenciais.</p>
                    </div>
                    </div>

                    {/* Lista de Itens (Sempre 3 itens fixos conforme planejado) */}
                    <div className="space-y-4">
                    {(form.diferenciais?.itens || []).map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Título {index + 1}</label>
                            <input 
                            className="h-10 px-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={item.titulo}
                            onChange={e => {
                                const newItens = [...form.diferenciais.itens];
                                newItens[index].titulo = e.target.value;
                                setForm({...form, diferenciais: { ...form.diferenciais, itens: newItens }});
                            }}
                            placeholder="Ex: Atendimento 24h"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Descrição Curta</label>
                            <input 
                            className="h-10 px-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={item.descricao}
                            onChange={e => {
                                const newItens = [...form.diferenciais.itens];
                                newItens[index].descricao = e.target.value;
                                setForm({...form, diferenciais: { ...form.diferenciais, itens: newItens }});
                            }}
                            placeholder="Ex: Suporte completo em qualquer horário."
                            />
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
                </div>
                
              {/* SESSÃO: DEPOIMENTOS */}
              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-blue-600" size={20} />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Sessão: Depoimentos de Clientes</h3>
                    </div>
                    <button 
                    type="button" 
                    onClick={addDepoimento}
                    className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                    >
                    + ADICIONAR DEPOIMENTO
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {form.depoimentos.map((dep, index) => (
                    <div key={index} className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400">DEPOIMENTO #0{index + 1}</span>
                            <button 
                            type="button" 
                            onClick={() => setForm({...form, depoimentos: form.depoimentos.filter((_, i) => i !== index)})}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                            >
                            REMOVER
                            </button>
                        </div>

                        <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <label className="relative flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 transition-all cursor-pointer overflow-hidden bg-white">
                            {dep.foto_url ? (
                                <img src={dep.foto_url} className="w-full h-full object-cover" />
                            ) : (
                                <Upload size={16} className="text-slate-400" />
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadDepoimentoFoto(e, index)} />
                            </label>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                            <input
                            type="text"
                            placeholder="Nome do Cliente (Ex: João Silva)"
                            maxLength={50}
                            className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            value={dep.autor}
                            onChange={(e) => {
                                const newDeps = [...form.depoimentos];
                                newDeps[index].autor = e.target.value;
                                setForm({ ...form, depoimentos: newDeps });
                            }}
                            />
                            
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">Estrelas:</span>
                                <select 
                                    value={dep.estrelas}
                                    className="bg-transparent text-xs font-bold text-yellow-600 outline-none"
                                    onChange={(e) => {
                                        const newDeps = [...form.depoimentos];
                                        newDeps[index].estrelas = Number(e.target.value);
                                        setForm({ ...form, depoimentos: newDeps });
                                    }}
                                >
                                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Estrelas</option>)}
                                </select>
                            </div>
                        </div>
                        </div>

                        <textarea
                        placeholder="O depoimento (Máx 100 caracteres)"
                        maxLength={100}
                        rows={2}
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={dep.texto}
                        onChange={(e) => {
                            const newDeps = [...form.depoimentos];
                            newDeps[index].texto = e.target.value;
                            setForm({ ...form, depoimentos: newDeps });
                        }}
                        />
                    </div>
                    ))}
                </div>
                </div>
                

              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-blue-600 mt-0.5" />
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>Configuração Sincronizada:</strong> Estes dados alimentam automaticamente o cabeçalho do seu site e os links de redirecionamento para redes sociais.
                </p>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-zinc-800/50">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading || fetching} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (showSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />)}
            {showSuccess ? "Dados Salvos!" : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}