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

  // Bases Globais
  const [baseSeguradoras, setBaseSeguradoras] = useState<any[]>([]);
  const [baseProdutos, setBaseProdutos] = useState<any[]>([]);
  
  // Portfólio do Usuário (O que está ativo)
  const [portfolio, setPortfolio] = useState<any[]>([]);

  async function carregarDados() {
    try {
      setLoading(true);

      // 1. Verificar Perfil
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfis")
        .select("tipo_usuario")
        .eq("id", user?.id)
        .single();

      if (perfilError || perfil?.tipo_usuario !== "CORRETORA") {
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);

      // 2. Carregar Bases Globais e Portfólio Atual do Usuário
      const [resSegs, resProds, resPort] = await Promise.all([
        supabase.from("base_seguradoras").select("*").order("nome"),
        supabase.from("base_produtos").select("*").order("nome"),
        supabase.from("tab_corretora_portfolio").select("*").eq("corretora_id", user?.id)
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

  // Função para verificar se uma seguradora tem algum produto ativo
  const isSeguradoraAtiva = (segId: string) => {
    return portfolio.some(p => p.base_seguradora_id === segId);
  };

  // Função para verificar se um produto específico está ativo para uma seguradora
  const isProdutoAtivo = (segId: string, prodId: string) => {
    return portfolio.some(p => p.base_seguradora_id === segId && p.base_produto_id === prodId);
  };

  // Lógica de Ativar/Desativar Produto (Portfólio)
  const toggleProduto = async (segId: string, prodId: string) => {
    const ativo = isProdutoAtivo(segId, prodId);

    try {
      if (ativo) {
        // Remover do portfólio
        const { error } = await supabase
          .from("tab_corretora_portfolio")
          .delete()
          .eq("corretora_id", user?.id)
          .eq("base_seguradora_id", segId)
          .eq("base_produto_id", prodId);
        
        if (error) throw error;
        setPortfolio(prev => prev.filter(p => !(p.base_seguradora_id === segId && p.base_produto_id === prodId)));
      } else {
        // Adicionar ao portfólio
        const { data, error } = await supabase
          .from("tab_corretora_portfolio")
          .insert({
            corretora_id: user?.id,
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

  // Desligar Seguradora Inteira
  const desligarSeguradora = async (segId: string) => {
    if (!confirm("Isso desativará todos os produtos desta seguradora no seu perfil. Continuar?")) return;

    try {
      const { error } = await supabase
        .from("tab_corretora_portfolio")
        .delete()
        .eq("corretora_id", user?.id)
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

  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center min-h-screen">
        <Shield size={60} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <button onClick={() => navigate("/dashboard")} className="mt-4 px-6 py-2 bg-zinc-900 text-white rounded-xl">Voltar</button>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] pb-20">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">Portfólio de Seguros</h1>
            <p className="text-sm text-slate-500">Ative as seguradoras e ramos que você opera.</p>
          </div>
        </header>

        {/* BUSCA */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar seguradora..."
            className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* LISTA */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
          ) : (
            seguradorasFiltradas.map((seg) => {
              const ativa = isSeguradoraAtiva(seg.id);
              return (
                <div key={seg.id} className={`bg-white dark:bg-zinc-900 rounded-3xl border transition-all ${ativa ? 'border-blue-500/30 shadow-md' : 'border-slate-200 dark:border-zinc-800 opacity-80'}`}>
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${ativa ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                        <Building2 size={28} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-slate-800 dark:text-zinc-100">{seg.nome}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${ativa ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {ativa ? 'Ativa no Portfólio' : 'Inativa'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => ativa ? desligarSeguradora(seg.id) : null}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                          ativa 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                          : 'bg-slate-100 text-slate-400 cursor-default'
                        }`}
                      >
                        <Power size={18} />
                        {ativa ? 'Desativar Tudo' : 'Aguardando Ativação'}
                      </button>
                    </div>
                  </div>

                  {/* GRADE DE PRODUTOS - SÓ APARECE OU FICA EDITÁVEL SE A SEGURADORA TIVER PRODUTOS OU FOR SER ATIVADA */}
                  <div className="p-6 pt-0 border-t border-slate-50 dark:border-zinc-800/50 mt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Ramos Disponíveis</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {baseProdutos.map((prod) => {
                        const prodAtivo = isProdutoAtivo(seg.id, prod.id);
                        return (
                          <button
                            key={prod.id}
                            onClick={() => toggleProduto(seg.id, prod.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                              prodAtivo 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                              : 'bg-transparent border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-blue-500'
                            }`}
                          >
                            <span className="truncate">{prod.nome}</span>
                            {prodAtivo && <Check size={14} />}
                          </button>
                        );
                      })}
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