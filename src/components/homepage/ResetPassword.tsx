import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    // 1. Validação de tamanho mínimo (segurança básica)
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    
    // O Supabase usa a sessão do link de e-mail para identificar o usuário
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Erro ao atualizar senha: " + error.message);
      setLoading(false);
    } else {
      toast.success("Senha atualizada com sucesso!");
      
      // 2. IMPORTANTE: Deslogar após trocar a senha.
      // Isso limpa a sessão temporária de recovery e força o usuário
      // a fazer um login limpo com a nova credencial.
      await supabase.auth.signOut();
      
      navigate("/", { replace: true }); 
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-blue-600 rounded-lg">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Nova Senha</h2>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
              Digite a nova senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                required
                type="password"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="No mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
              Confirme a nova senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                required
                type="password"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "DEFINIR NOVA SENHA"}
          </button>
        </form>
      </div>
    </div>
  );
}