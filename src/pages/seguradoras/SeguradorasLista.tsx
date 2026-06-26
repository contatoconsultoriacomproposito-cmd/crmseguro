import { useEffect, useState } from "react";
import { 
  Building2, Loader2, Search, Shield, 
  Power, Check, Plus, X 
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SeguradorasLista() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // Estados para o Modal de Nova Seguradora
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ nome: "", cnpj: "", site: "", logo: null as File | null });

  const [corretoraIdEfetivo, setCorretoraIdEfetivo] = useState<string | null>(null);
  const [baseSeguradoras, setBaseSeguradoras] = useState<any[]>([]);
  const [baseProdutos, setBaseProdutos] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  async function carregarDados() {
    try {
      setLoading(true);
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfis")
        .select("tipo_usuario, corretora_id")
        .eq("id", user?.id)
        .single();

      if (perfilError || !perfil) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      const targetId = perfil.tipo_usuario === "CORRETORA" ? user?.id : perfil.corretora_id;
      setCorretoraIdEfetivo(targetId);

      const [resSegs, resProds, resPort] = await Promise.all([
        supabase.from("base_seguradoras").select("*").order("nome"),
        supabase.from("base_produtos").select("*").order("nome"),
        supabase.from("tab_corretora_portfolio").select("*").eq("corretora_id", targetId)
      ]);

      setBaseSeguradoras(resSegs.data || []);
      setBaseProdutos(resProds.data || []);
      setPortfolio(resPort.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleNovaSeguradora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.logo || !formData.nome) return alert("Nome e logo são obrigatórios!");

    setIsUploading(true);
    try {
      const fileExt = formData.logo.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logo_seguradoras')
        .upload(fileName, formData.logo);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logo_seguradoras')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("base_seguradoras")
        .insert({
          nome: formData.nome.toUpperCase(),
          cnpj: formData.cnpj,
          site: formData.site,
          logo_url: publicUrl
        });

      if (dbError) throw dbError;
      
      alert("Seguradora cadastrada com sucesso!");
      setShowModal(false);
      setFormData({ nome: "", cnpj: "", site: "", logo: null });
      carregarDados();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (user) carregarDados();
  }, [user]);

  const isSeguradoraAtiva = (segId: string) => portfolio.some(p => p.base_seguradora_id === segId);
  const isProdutoAtivo = (segId: string, prodId: string) => portfolio.some(p => p.base_seguradora_id === segId && p.base_produto_id === prodId);

  const toggleProduto = async (segId: string, prodId: string) => {
    if (!corretoraIdEfetivo) return;
    const ativo = isProdutoAtivo(segId, prodId);
    try {
      if (ativo) {
        await supabase.from("tab_corretora_portfolio").delete().eq("corretora_id", corretoraIdEfetivo).eq("base_seguradora_id", segId).eq("base_produto_id", prodId);
        setPortfolio(prev => prev.filter(p => !(p.base_seguradora_id === segId && p.base_produto_id === prodId)));
      } else {
        const { data, error } = await supabase.from("tab_corretora_portfolio").insert({ corretora_id: corretoraIdEfetivo, base_seguradora_id: segId, base_produto_id: prodId }).select().single();
        if (error) throw error;
        setPortfolio(prev => [...prev, data]);
      }
    } catch (error) { console.error(error); }
  };

  const desligarSeguradora = async (segId: string) => {
    if (!corretoraIdEfetivo || !confirm("Isso desativará todos os produtos desta seguradora. Continuar?")) return;
    try {
      await supabase.from("tab_corretora_portfolio").delete().eq("corretora_id", corretoraIdEfetivo).eq("base_seguradora_id", segId);
      setPortfolio(prev => prev.filter(p => p.base_seguradora_id !== segId));
    } catch (error) { console.error(error); }
  };

  const seguradorasFiltradas = baseSeguradoras.filter(seg => seg.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center min-h-screen">
        <Shield size={60} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold font-black italic tracking-tighter uppercase">Erro de Vínculo</h1>
        <p className="text-slate-500 text-sm">Não encontramos uma corretora vinculada.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-6 px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest">Voltar ao Dashboard</button>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] pb-20">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-100 italic tracking-tighter uppercase leading-none">Portfólio de Seguros</h1>
            <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wider">Ative as seguradoras e ramos operados.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
          >
            <Plus size={16} /> Nova Seguradora
          </button>
        </header>

        {/* Modal de Inclusão */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleNovaSeguradora} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-zinc-100">Nova Seguradora</h2>
                <button type="button" onClick={() => setShowModal(false)}><X size={20} className="text-slate-500"/></button>
              </div>
              <input type="text" placeholder="Nome da Seguradora" className="w-full p-4 mb-3 rounded-xl border bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700" onChange={e => setFormData({...formData, nome: e.target.value})} required />
              <input type="text" placeholder="CNPJ" className="w-full p-4 mb-3 rounded-xl border bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700" onChange={e => setFormData({...formData, cnpj: e.target.value})} />
              <input type="text" placeholder="Site" className="w-full p-4 mb-3 rounded-xl border bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700" onChange={e => setFormData({...formData, site: e.target.value})} />
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">Logo da Seguradora</label>
              <input type="file" accept="image/*" onChange={e => setFormData({...formData, logo: e.target.files?.[0] || null})} className="mb-6 w-full" required />
              <button disabled={isUploading} className="w-full p-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {isUploading ? <Loader2 className="animate-spin mx-auto"/> : "CADASTRAR SEGURADORA"}
              </button>
            </form>
          </div>
        )}

        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar seguradora pelo nome..."
            className="w-full pl-12 pr-4 h-16 rounded-[24px] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm font-bold text-slate-700 dark:text-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sincronizando Portfólio...</p>
            </div>
          ) : (
            seguradorasFiltradas.map((seg) => {
              const ativa = isSeguradoraAtiva(seg.id);
              return (
                <div key={seg.id} className={`bg-white dark:bg-zinc-900 rounded-[32px] border transition-all duration-300 ${ativa ? 'border-blue-500/40 shadow-xl shadow-blue-500/5' : 'border-slate-200 dark:border-zinc-800 opacity-90'}`}>
                  <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${ativa ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                        {seg.logo_url ? <img src={seg.logo_url} className="w-10 h-10 object-contain rounded" alt={seg.nome} /> : <Building2 size={32} />}
                      </div>
                      <div>
                        <h3 className="font-black text-2xl text-slate-800 dark:text-zinc-100 leading-none mb-1">{seg.nome}</h3>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${ativa ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => ativa ? desligarSeguradora(seg.id) : null}
                      disabled={!ativa}
                      className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${ativa ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                      <Power size={16} /> {ativa ? 'Desativar Seguradora' : 'Indisponível'}
                    </button>
                  </div>
                  <div className="px-8 pb-8">
                    <div className="bg-slate-50 dark:bg-zinc-950/50 rounded-[24px] p-6 border border-slate-100 dark:border-zinc-800/50">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-5 tracking-[0.2em] flex items-center gap-2">
                        <span className="w-4 h-[2px] bg-blue-500" /> Ramos Disponíveis
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {baseProdutos.map((prod) => {
                          const prodAtivo = isProdutoAtivo(seg.id, prod.id);
                          return (
                            <button
                              key={prod.id}
                              onClick={() => toggleProduto(seg.id, prod.id)}
                              className={`flex items-center justify-between p-4 rounded-2xl border text-[11px] font-black uppercase transition-all ${prodAtivo ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-zinc-900 border-slate-200 text-slate-500'}`}
                            >
                              <span className="truncate">{prod.nome}</span>
                              {prodAtivo && <Check size={14} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}