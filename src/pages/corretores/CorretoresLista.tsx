import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../auth/AuthContext"
import { 
  Search, Edit2, Trash2, User, Phone, Mail, 
  Shield, AlertCircle, Loader2, ArrowRightLeft 
} from "lucide-react"
import { useNavigate } from "react-router-dom"

interface Corretor {
  id: string
  nome: string
  email: string
  telefone_corretor: string
  registro_susep: string
  cpf_corretor: string
  ativo: boolean
}

export default function CorretoresLista() {
  const { user: adminUser } = useAuth()
  const navigate = useNavigate()
  
  // Estados Principais
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [perfilLogado, setPerfilLogado] = useState<any>(null)

  // Estados de Exclusão e Transferência
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [corretorParaExcluir, setCorretorParaExcluir] = useState<Corretor | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loadingVinculos, setLoadingVinculos] = useState(false)
  const [contagemClientes, setContagemClientes] = useState(0)
  const [transferirParaId, setTransferirParaId] = useState<string>("")

  useEffect(() => {
    if (adminUser) {
      fetchCorretores()
    }
  }, [adminUser])

  async function fetchCorretores() {
    try {
      setLoading(true)
      
      // 1. Pegamos o perfil do usuário logado
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfis")
        .select("id, corretora_id, tipo_usuario")
        .eq("id", adminUser?.id)
        .single()

      if (perfilError || !perfil) {
        setIsAuthorized(false)
        return
      }

      // 2. Trava de segurança
      if (perfil.tipo_usuario === "CORRETOR") {
        setIsAuthorized(false)
        return
      }

      setPerfilLogado(perfil)
      setIsAuthorized(true)

      // 3. Buscamos corretores da mesma corretora
      const { data, error } = await supabase
        .from("usuarios_perfis")
        .select("*")
        .eq("corretora_id", perfil.corretora_id)
        .eq("tipo_usuario", "CORRETOR")
        .order("nome", { ascending: true })

      if (error) throw error
      setCorretores(data || [])

    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    } finally {
      setLoading(false)
    }
  }

  // Função para checar clientes antes de abrir o modal
  async function handleAbrirModalExclusao(corretor: Corretor) {
    setCorretorParaExcluir(corretor)
    setIsDeleteModalOpen(true)
    setLoadingVinculos(true)
    setContagemClientes(0)

    try {
      const { count, error } = await supabase
        .from("tab_clientes")
        .select("*", { count: 'exact', head: true })
        .eq("corretor_id", corretor.id)

      if (!error) setContagemClientes(count || 0)
      
      // Destino padrão é o ID da corretora mãe (quem está logado)
      setTransferirParaId(perfilLogado?.id || "")
    } catch (err) {
      console.error("Erro ao checar vínculos:", err)
    } finally {
      setLoadingVinculos(false)
    }
  }

  async function handleExcluir() {
  if (!corretorParaExcluir || !perfilLogado) return
  setDeleting(true)

  try {
    // 1. Transfere clientes se houver (via cliente comum, pois o RLS deve permitir à corretora mãe)
    if (contagemClientes > 0) {
      const { error: transferError } = await supabase
        .from("tab_clientes")
        .update({ corretor_id: transferirParaId })
        .eq("corretor_id", corretorParaExcluir.id)

      if (transferError) throw new Error("Erro na transferência: " + transferError.message)
    }

    // 2. NOVA LÓGICA: Deleta no Auth chamando a Edge Function
    const { data, error: functionError } = await supabase.functions.invoke('deletar-usuario', {
      body: { userId: corretorParaExcluir.id }
    })
    
    if (functionError || data?.error) throw new Error(functionError?.message || data?.error)

    // 3. Deleta o perfil na tabela (RLS deve permitir à corretora mãe)
    const { error: dbError } = await supabase
      .from("usuarios_perfis")
      .delete()
      .eq("id", corretorParaExcluir.id)
    
    if (dbError) throw dbError

    setCorretores(prev => prev.filter(c => c.id !== corretorParaExcluir.id))
    setIsDeleteModalOpen(false)
    alert("Corretor removido e clientes migrados!")
  } catch (error: any) {
    alert("Erro ao excluir: " + error.message)
  } finally {
    setDeleting(false)
    setCorretorParaExcluir(null)
  }
}

  // Filtragem para a busca
  const corretoresFiltrados = corretores.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Renderização de Acesso Negado
  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-6">
          <Shield size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-zinc-500 max-w-md">
          Esta página é destinada apenas para administradores da corretora.
        </p>
        <button 
          onClick={() => navigate("/dashboard")}
          className="mt-8 px-8 py-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl font-bold"
        >
          Voltar para o Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Corretores</h1>
          <p className="text-zinc-500 font-medium">Gerencie sua equipe de vendas</p>
        </div>
        
        <button 
          onClick={() => navigate("/corretores/cadastro")}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-95"
        >
          + Adicionar Corretor
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="h-8 w-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : corretores.length === 0 ? (
        <div className="text-center p-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
           <User size={48} className="mx-auto text-zinc-300 mb-4" />
           <p className="text-zinc-500 font-bold">Nenhum corretor encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corretoresFiltrados.map((corretor) => (
            <div key={corretor.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-500/10 rounded-2xl text-purple-600">
                  <User size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/corretores/editar/${corretor.id}`)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleAbrirModalExclusao(corretor)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 truncate">{corretor.nome}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Mail size={14} /> <span className="truncate">{corretor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Phone size={14} /> <span>{corretor.telefone_corretor || "Não informado"}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${corretor.ativo ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-500'}`}>
                  {corretor.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium uppercase">ID: {corretor.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Exclusão Inteligente */}
      {isDeleteModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-center mb-2">Excluir Corretor?</h2>
              <p className="text-zinc-500 text-center mb-6">
                Você removerá o acesso de <b>{corretorParaExcluir?.nome}</b>.
              </p>

              {loadingVinculos ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-purple-500" /></div>
              ) : contagemClientes > 0 && (
                <div className="mb-8 p-5 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
                  <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400 mb-4">
                    <ArrowRightLeft size={20} className="shrink-0 mt-1" />
                    <p className="text-sm font-medium">
                      Este corretor possui <b>{contagemClientes} clientes</b>. Escolha o novo responsável:
                    </p>
                  </div>

                  <select 
                    value={transferirParaId}
                    onChange={(e) => setTransferirParaId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 text-sm outline-none"
                  >
                    <option value={perfilLogado?.id}>Minha Corretora (Gestão Direta)</option>
                    {corretores
                      .filter(c => c.id !== corretorParaExcluir?.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>Corretor: {c.nome}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)} 
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleExcluir} 
                  disabled={deleting} 
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-red-600 text-white shadow-lg shadow-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="animate-spin" size={18} /> : "Confirmar"}
                </button>
              </div>
            </div>
         </div>
      )}
    </div>
  )
}