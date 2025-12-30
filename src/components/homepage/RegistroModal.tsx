import { useState } from "react"
import { motion } from "framer-motion"
import { X, User, Mail, Phone, CreditCard, Lock, Loader2, CheckCircle2, Award } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"

// FUNÇÕES DE MÁSCARA
const maskCPF = (v: string) => {
  v = v.replace(/\D/g, "")
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2")
    v = v.replace(/(\d{3})(\d)/, "$1.$2")
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }
  return v.substring(0, 14)
}

const maskPhone = (v: string) => {
  v = v.replace(/\D/g, "")
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2")
  v = v.replace(/(\d{5})(\d)/, "$1-$2")
  return v.substring(0, 15)
}

export default function RegistroModal({ onClose }: any) {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    susep: "",
    senha: ""
  })

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      // 1. Criar Usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: { data: { nome: formData.nome } }
      })

      if (authError) throw authError
      const newId = authData.user?.id
      if (!newId) throw new Error("ID do usuário não gerado.")

      // 2. Criar o Perfil Administrativo (Essencial para o login)
      const { error: perfilError } = await supabase
        .from("usuarios_perfis")
        .insert({
          id: newId,
          nome: formData.nome,
          email: formData.email,
          cpf_corretor: formData.cpf,
          telefone_corretor: formData.telefone,
          registro_susep: formData.susep,
          tipo_usuario: "CORRETORA",
          corretora_id: newId,
          ativo: true
        })

      if (perfilError) throw perfilError

      setSucesso(true)
      
      // Forçar recarregamento para garantir que a sessão do Supabase seja injetada no app
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 2000)

    } catch (error: any) {
      console.error("Erro no registro:", error)
      alert(error.message || "Erro ao criar conta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        {sucesso ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black mb-2 dark:text-white">Conta Criada!</h2>
            <p className="text-zinc-500">Estamos preparando seu painel administrativo...</p>
          </div>
        ) : (
          <>
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <h2 className="text-xl font-black dark:text-white">Nova Conta Corretora</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cadastro Admin</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors dark:text-white"><X size={20}/></button>
            </div>

            <form onSubmit={handleRegistro} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Razão Social / Gestor</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input required className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    placeholder="Nome da Corretora" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input required type="email" className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    placeholder="email@corretora.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">WhatsApp</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input required className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    placeholder="(00) 00000-0000" value={formData.telefone} onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">CPF</label>
                <div className="relative group">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input required className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Registro SUSEP</label>
                <div className="relative group">
                  <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input required className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    placeholder="Susep n°" value={formData.susep} onChange={e => setFormData({...formData, susep: e.target.value})} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Senha de Acesso</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input required type="password" minLength={6} className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    placeholder="Mínimo 6 caracteres" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} />
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" /> : "Criar Minha Conta"}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}