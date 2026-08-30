import { useState } from "react"
import { motion } from "framer-motion"
import { X, Mail, Lock, Loader2, LogIn, ShieldCheck } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { useNavigate } from "react-router-dom"

export default function LoginModal({ onClose, onSwitch }: any) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  async function handleForgotPassword() {
    if (!email) {
      setError("Por favor, digite seu e-mail para recuperar a senha.")
      return
    }

    setLoading(true)
    setResetSent(false)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setResetSent(false)
    } else {
      setResetSent(true)
      setError(null)
    }
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (authData?.user) {
        // Sucesso: fecha o modal e navega para o dashboard.
        // O AuthProvider cuidará da validação de perfil (inativo) e do preenchimento dos estados em background.
        onClose?.()
        navigate("/dashboard")
      }
    } catch (err: any) {
      setLoading(false)
      
      // Quando a senha estiver errada, não executamos nenhum signOut.
      // Apenas exibimos a mensagem de erro e a interface permanece limpa para a próxima tentativa.
      if (err.message?.includes("Invalid login credentials")) {
        setError("E-mail ou senha incorretos.")
      } else {
        setError(err.message || "Houve um erro ao acessar a conta.")
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-[#121212] rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ShieldCheck className="text-white" size={20} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Login</h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
            >
              <X size={20}/>
            </button>
          </div>

          {resetSent && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center"
            >
              E-mail de recuperação enviado! Verifique sua caixa de entrada.
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold text-center leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                E-mail de Acesso
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  required 
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                  placeholder="seu@email.com" 
                  autoComplete="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Senha
                </label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  required 
                  type="password" 
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                  placeholder="••••••••" 
                  autoComplete="current-password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-zinc-900 dark:bg-blue-600 hover:bg-zinc-800 dark:hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Acessar Painel</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <p className="text-sm text-zinc-500">
              Ainda não tem uma conta?{" "}
              <button 
                onClick={onSwitch}
                className="text-blue-600 font-bold hover:underline"
              >
                Cadastre sua Corretora
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}