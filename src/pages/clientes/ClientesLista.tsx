import { useEffect, useState } from "react";
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  User, 
  Phone,
  AlertTriangle, // Ícone para o modal
  Loader2        // Ícone de carregamento
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ClientesLista() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null); // NOVO: Estado para o perfil
  
  // Estados para exclusão
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<any | null>(null);

  // 1. Primeiro carregamos o perfil para saber qual corretora filtrar
  // 1. Carrega o perfil inicial
  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario')
          .eq('id', user.id)
          .single();
        
        setUserProfile(perfil);
      }
    }
    getInitialData();
  }, []);

  
  // 2. ÚNICO useEffect necessário para carregar a lista
  // Ele rodará quando o perfil for carregado OU quando houver deleção (se necessário)
  useEffect(() => {
    if (userProfile?.corretora_id) {
      carregarClientes();
    }
  }, [userProfile]); // Removemos o useEffect vazio que causava chamadas sem ID


  async function carregarClientes() {
    // TRAVA DE SEGURANÇA: Se o perfil não existe, não faz nada
    if (!userProfile?.corretora_id) return;
    try {
      setLoading(true);
      // FILTRO DE SEGURANÇA: .eq("corretora_id", userProfile.corretora_id)
      let query = supabase
        .from("tab_clientes")
        .select(`*, usuarios_perfis!tab_clientes_corretor_id_fkey(nome)`)
        .eq("corretora_id", userProfile.corretora_id) // A mágica acontece aqui
        .order("created_at", { ascending: false });

      // Se for corretor, ele só vê os clientes dele. Se for admin, vê da corretora toda.
      if (userProfile.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', userProfile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  // FUNÇÃO DE EXCLUSÃO REAL
  async function handleExcluir() {
    if (!confirmarExclusao || !userProfile) return;

    try {
      setExcluindoId(confirmarExclusao.id);
      
      let deleteQuery = supabase
        .from("tab_clientes")
        .delete()
        .eq("id", confirmarExclusao.id)
        .eq("corretora_id", userProfile.corretora_id); // TRAVA EXTRA

      // Se for corretor, ele só pode deletar se o cliente for dele
      if (userProfile.tipo_usuario === 'CORRETOR') {
        deleteQuery = deleteQuery.eq('corretor_id', userProfile.id);
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== confirmarExclusao.id));
      setConfirmarExclusao(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir cliente.");
    } finally {
      setExcluindoId(null);
    }
  }

  // BUSCA INTELIGENTE (Corrigida conforme nossa conversa anterior)
  const clientesFiltrados = clientes.filter((c) => {
    if (!busca) return true;
    const termo = busca.toLowerCase().trim();
    const termoApenasNumeros = termo.replace(/\D/g, "");

    const nome = (c.nome || "").toLowerCase();
    const razaoSocial = (c.razao_social || "").toLowerCase();
    const nomeFantasia = (c.nome_fantasia || "").toLowerCase();
    const cpf = (c.cpf || "").replace(/\D/g, "");
    const cnpj = (c.cnpj || "").replace(/\D/g, "");
    const whatsOriginal = (c.telefone_whats || "").toLowerCase();
    const whatsLimpo = whatsOriginal.replace(/\D/g, "");

    if (termo.includes("(") || termo.includes(")")) {
      return whatsOriginal.includes(termo);
    }

    if (termoApenasNumeros && termo === termoApenasNumeros) {
      return (
        cpf.includes(termoApenasNumeros) || 
        cnpj.includes(termoApenasNumeros) || 
        whatsLimpo.includes(termoApenasNumeros)
      );
    }

    return nome.includes(termo) || razaoSocial.includes(termo) || nomeFantasia.includes(termo);
  });

  return (
    <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] transition-colors pb-20">
      
      {/* HEADER E CAMPO DE BUSCA (Mantidos iguais) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Base de dados unificada de segurados.</p>
        </div>
        <button 
          onClick={() => navigate("/clientes/cadastro")}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/25 font-bold active:scale-95"
        >
          <Plus size={20} /> Novo Cadastro
        </button>
      </div>

      <div className="max-w-7xl mx-auto relative mb-6">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Pesquisar por CPF/CNPJ, Nome, Telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-zinc-100"
        />
      </div>

      {/* TABELA */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-[24px] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente / Nome Fantasia</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">WhatsApp</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Corretor</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={6} className="p-20 text-center text-slate-400 animate-pulse">Carregando dados...</td></tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-medium">Nenhum cliente encontrado.</td></tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                    <td className="p-5 text-center">
                      {cliente.tipo_cliente === "PJ" ? (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto border border-blue-100/50 dark:border-blue-500/20">
                          <Building2 size={18} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-100/50 dark:border-indigo-500/20">
                          <User size={18} />
                        </div>
                      )}
                    </td>

                    <td className="p-5 text-sm font-semibold text-slate-600 dark:text-zinc-300">
                      {cliente.tipo_cliente === "PJ" ? cliente.cnpj : cliente.cpf}
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-zinc-100">
                          {cliente.tipo_cliente === "PJ" ? cliente.razao_social : cliente.nome}
                        </span>
                        {cliente.nome_fantasia && (
                          <span className="text-[11px] text-slate-400 font-medium uppercase">{cliente.nome_fantasia}</span>
                        )}
                      </div>
                    </td>

                    <td className="p-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-500/20">
                        <Phone size={14} /> {cliente.telefone_whats || "Sem Whats"}
                      </div>
                    </td>

                    <td className="p-5 text-xs font-bold text-slate-500 dark:text-zinc-400">
                      <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                        {cliente.usuarios_perfis?.nome || "Geral"}
                      </span>
                    </td>

                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => navigate(`/clientes/editar/${cliente.id}`)}
                          className="p-2.5 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100 dark:border-blue-900/30"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          disabled={excluindoId === cliente.id}
                          onClick={() => setConfirmarExclusao(cliente)}
                          className="p-2.5 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 dark:border-red-900/30 disabled:opacity-50"
                        >
                          {excluindoId === cliente.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmarExclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-zinc-800 transform animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-center text-slate-800 dark:text-zinc-100 mb-2">Excluir Cliente?</h2>
            <p className="text-center text-slate-500 dark:text-zinc-400 text-sm mb-8">
              Você está prestes a excluir <strong>{confirmarExclusao.nome || confirmarExclusao.razao_social}</strong>. Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleExcluir}
                disabled={excluindoId !== null}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {excluindoId ? <Loader2 className="animate-spin" /> : "Sim, Excluir"}
              </button>
              <button 
                onClick={() => setConfirmarExclusao(null)}
                className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}