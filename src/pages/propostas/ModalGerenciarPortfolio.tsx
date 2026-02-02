import { useEffect, useState } from "react";
import { X, Search, Building2, Check, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";

interface ModalGerenciarPortfolioProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Para avisar o componente pai que algo mudou
}

export function ModalGerenciarPortfolio({ isOpen, onClose, onUpdate }: ModalGerenciarPortfolioProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [baseSeguradoras, setBaseSeguradoras] = useState<any[]>([]);
  const [baseProdutos, setBaseProdutos] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [corretoraIdEfetivo, setCorretoraIdEfetivo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) carregarDados();
  }, [isOpen, user]);

  async function carregarDados() {
    try {
      setLoading(true);
      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("tipo_usuario, corretora_id")
        .eq("id", user?.id)
        .single();

      if (!perfil) return;
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
    } finally {
      setLoading(false);
    }
  }

  const isProdutoAtivo = (segId: string, prodId: string) => 
    portfolio.some(p => p.base_seguradora_id === segId && p.base_produto_id === prodId);

  const toggleProduto = async (segId: string, prodId: string) => {
    if (!corretoraIdEfetivo) return;
    const ativo = isProdutoAtivo(segId, prodId);
    try {
      if (ativo) {
        await supabase.from("tab_corretora_portfolio").delete()
          .eq("corretora_id", corretoraIdEfetivo).eq("base_seguradora_id", segId).eq("base_produto_id", prodId);
        setPortfolio(prev => prev.filter(p => !(p.base_seguradora_id === segId && p.base_produto_id === prodId)));
      } else {
        const { data } = await supabase.from("tab_corretora_portfolio").insert({
          corretora_id: corretoraIdEfetivo, base_seguradora_id: segId, base_produto_id: prodId
        }).select().single();
        if (data) setPortfolio(prev => [...prev, data]);
      }
      onUpdate(); // Notifica o formulário para atualizar os selects
    } catch (error) { console.error(error); }
  };

  const seguradorasFiltradas = baseSeguradoras.filter(seg => 
    seg.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#F8FAFC] dark:bg-[#09090B] w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Gerenciar Portfólio</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Ative seguradoras e ramos em tempo real</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Busca */}
        <div className="p-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar seguradora..."
              className="w-full pl-12 pr-4 h-12 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 outline-none focus:ring-2 ring-blue-500/20 font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-[10px] font-black uppercase text-slate-400">Carregando Bases...</span>
            </div>
          ) : (
            seguradorasFiltradas.map(seg => (
              <div key={seg.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Building2 size={20} />
                  </div>
                  <span className="font-black uppercase text-sm">{seg.nome}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {baseProdutos.map(prod => {
                    const ativo = isProdutoAtivo(seg.id, prod.id);
                    return (
                      <button
                        key={prod.id}
                        onClick={() => toggleProduto(seg.id, prod.id)}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-between ${
                          ativo ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-zinc-950 border-transparent text-slate-500'
                        }`}
                      >
                        <span className="truncate">{prod.nome}</span>
                        {ativo && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}