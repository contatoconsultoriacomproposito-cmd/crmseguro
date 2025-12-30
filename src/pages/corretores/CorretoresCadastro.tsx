import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient" // Removido o supabaseAdmin por segurança
import { useAuth } from "../../auth/AuthContext"
import { Loader2, UserPlus, ArrowLeft, CheckCircle2, XCircle, ShieldAlert } from "lucide-react"

export default function CorretorCadastro() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone_corretor: "",
    registro_susep: "",
    cpf_corretor: "",
    senha: ""
  })

  useEffect(() => {
    async function checkPermission() {
      if (!authUser?.id) {
        navigate("/login")
        return
      }

      try {
        const { data, error } = await supabase
          .from("usuarios_perfis")
          .select("tipo_usuario")
          .eq("id", authUser.id)
          .single()

        if (error || data?.tipo_usuario !== "CORRETORA") {
          setIsAuthorized(false)
        } else {
          setIsAuthorized(true)
        }
      } catch (err) {
        setIsAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [authUser, navigate])

  const maskCPF = (v: string) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !isAuthorized) return
    setSubmitting(true)
    setErrorMsg(null)

    try {
      // NOVA LÓGICA: Chamando a função RPC que criamos no SQL
      // Isso executa no servidor (DB) e evita o erro 403 de permissão
      const { error: rpcError } = await supabase.rpc('cadastrar_novo_corretor', {
        p_email: formData.email,
        p_nome: formData.nome,
        p_cpf: formData.cpf_corretor,
        p_telefone: formData.telefone_corretor,
        p_susep: formData.registro_susep, // Adicione esta linha aqui
        p_corretora_id: authUser?.id, // ID da Corretora Master logada
        p_senha: formData.senha
      })

      if (rpcError) throw rpcError

      // Se chegou aqui, o usuário e o perfil foram criados com sucesso
      setShowSuccess(true)
      setTimeout(() => navigate("/corretores/lista"), 2000)

    } catch (error: any) {
      // Captura erros amigáveis (ex: e-mail já cadastrado)
      setErrorMsg(error.message || "Erro ao processar cadastro")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-red-100 dark:border-red-900/30 text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="text-red-600" size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-zinc-500 mb-6">Apenas administradores da corretora podem cadastrar novos membros.</p>
        <button onClick={() => navigate(-1)} className="text-purple-600 font-semibold hover:underline">Voltar</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 relative animate-in fade-in duration-500">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-zinc-500 mb-6 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft size={18} /> Voltar para a lista
      </button>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Novo Corretor</h1>
          <p className="text-zinc-500 text-sm font-medium">Cadastre membros da sua equipe</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
            <XCircle size={18} /> {errorMsg}
          </div>
        )}
        
        <input
          required
          placeholder="Nome Completo"
          className="w-full p-4 rounded-2xl border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/20"
          value={formData.nome}
          onChange={e => setFormData({...formData, nome: e.target.value})}
        />

        <input
          required
          type="email"
          placeholder="E-mail Profissional"
          className="w-full p-4 rounded-2xl border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/20"
          value={formData.email}
          onChange={e => setFormData({...formData, email: e.target.value})}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            placeholder="CPF"
            maxLength={14}
            className="w-full p-4 rounded-2xl border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700"
            value={formData.cpf_corretor}
            onChange={e => setFormData({...formData, cpf_corretor: maskCPF(e.target.value)})}
          />
          <input
            placeholder="Registro SUSEP"
            className="w-full p-4 rounded-2xl border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700"
            value={formData.registro_susep}
            onChange={e => setFormData({...formData, registro_susep: e.target.value})}
          />
        </div>

        <input
          required
          type="password"
          placeholder="Senha de Acesso"
          className="w-full p-4 rounded-2xl border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/20"
          value={formData.senha}
          onChange={e => setFormData({...formData, senha: e.target.value})}
        />

        <button
          type="submit"
          disabled={submitting || showSuccess}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} /> Cadastrar Corretor</>}
        </button>
      </form>

      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-10 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-zinc-800 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-500" size={44} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sucesso!</h2>
            <p className="text-slate-500 dark:text-zinc-400">O corretor foi cadastrado com sucesso e já pode acessar o painel com as credenciais informadas.</p>
          </div>
        </div>
      )}
    </div>
  )
}