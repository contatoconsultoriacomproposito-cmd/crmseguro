import { useEffect, useState } from "react";
import { 
  Building2, Loader2, Search, Shield, 
  Power, Check
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
  
  // ID da Corretora que será usado para gravar no portfólio
  const [corretoraIdEfetivo, setCorretoraIdEfetivo] = useState<string | null>(null);

  const [baseSeguradoras, setBaseSeguradoras] = useState<any[]>([]);
  const [baseProdutos, setBaseProdutos] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  async function carregarDados() {
    try {
      setLoading(true);

      // 1. Verificar Perfil e Capturar o ID da Corretora Pai
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfis")
        .select("tipo_usuario, corretora_id")
        .eq("id", user?.id)
        .single();

      // Agora permitimos CORRETORA e CORRETOR
      if (perfilError || !perfil) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);

      // Define qual ID usar para o portfólio: 
      // Se for Corretora, usa o próprio ID. Se for Corretor, usa o corretora_id vinculado.
      const targetId = perfil.tipo_usuario === "CORRETORA" ? user?.id : perfil.corretora_id;
      setCorretoraIdEfetivo(targetId);

      // 2. Carregar Bases Globais e Portfólio usando o ID alvo
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
        const { error } = await supabase
          .from("tab_corretora_portfolio")
          .delete()
          .eq("corretora_id", corretoraIdEfetivo)
          .eq("base_seguradora_id", segId)
          .eq("base_produto_id", prodId);
        
        if (error) throw error;
        setPortfolio(prev => prev.filter(p => !(p.base_seguradora_id === segId && p.base_produto_id === prodId)));
      } else {
        const { data, error } = await supabase
          .from("tab_corretora_portfolio")
          .insert({
            corretora_id: corretoraIdEfetivo,
            base_seguradora_id: segId,
            base_produto_id: prodId
          })
          .select()
          .single();

        if (error) throw error;
        setPortfolio(prev => [...prev, data]);
      }
    } catch (error) {
      console.error("Erro ao atualizar portfólio:", error);
    }
  };

  const desligarSeguradora = async (segId: string) => {
    if (!corretoraIdEfetivo || !confirm("Isso desativará todos os produtos desta seguradora. Continuar?")) return;

    try {
      const { error } = await supabase
        .from("tab_corretora_portfolio")
        .delete()
        .eq("corretora_id", corretoraIdEfetivo)
        .eq("base_seguradora_id", segId);

      if (error) throw error;
      setPortfolio(prev => prev.filter(p => p.base_seguradora_id !== segId));
    } catch (error) {
      console.error("Erro ao desativar seguradora:", error);
    }
  };

  const seguradorasFiltradas = baseSeguradoras.filter(seg => 
    seg.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Renderização (Manteve o seu padrão visual excelente) APENAS PARA USUÁRIOS SEM PERFIL (SE CAIR AQUI HÁ ALGO ERRADO NO SISTEMA)
  if (isAuthorized === false) {
  return (
    <div className="flex flex-col items-center justify-center p-20 text-center min-h-screen">
      <Shield size={60} className="text-red-500 mb-4" />
      <h1 className="text-2xl font-bold font-black italic tracking-tighter uppercase">Erro de Vínculo</h1>
      <p className="text-slate-500 text-sm">Não encontramos uma corretora vinculada ao seu perfil. Entre em contato com o suporte.</p>
      <button onClick={() => navigate("/dashboard")} className="mt-6 px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest transition-all hover:scale-105">Voltar ao Dashboard</button>
    </div>
  );
}

  return (
    <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] pb-20">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-100 italic tracking-tighter uppercase leading-none">Portfólio de Seguros</h1>
            <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wider">Ative as seguradoras e ramos operados pela corretora.</p>
          </div>
        </header>

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
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${ativa ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 rotate-3' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                        <Building2 size={32} />
                      </div>
                      <div>
                        <h3 className="font-black text-2xl text-slate-800 dark:text-zinc-100 leading-none mb-1">{seg.nome}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${ativa ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'}`}>
                            {ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => ativa ? desligarSeguradora(seg.id) : null}
                      disabled={!ativa}
                      className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                        ativa 
                        ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-500/10 shadow-sm' 
                        : 'bg-slate-100 text-slate-300 dark:bg-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      <Power size={16} />
                      {ativa ? 'Desativar Seguradora' : 'Indisponível'}
                    </button>
                  </div>

                  <div className="px-8 pb-8">
                    <div className="bg-slate-50 dark:bg-zinc-950/50 rounded-[24px] p-6 border border-slate-100 dark:border-zinc-800/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-5 tracking-[0.2em] flex items-center gap-2">
                        <div className="w-4 h-[2px] bg-blue-500" /> Ramos Disponíveis
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {baseProdutos.map((prod) => {
                          const prodAtivo = isProdutoAtivo(seg.id, prod.id);
                          return (
                            <button
                              key={prod.id}
                              onClick={() => toggleProduto(seg.id, prod.id)}
                              className={`flex items-center justify-between p-4 rounded-2xl border text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 ${
                                prodAtivo 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-blue-500 hover:text-blue-600'
                              }`}
                            >
                              <span className="truncate">{prod.nome}</span>
                              {prodAtivo && <Check size={14} className="shrink-0" />}
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