import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabaseClient"

interface AuthContextData {
  user: User | null
  userProfile: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const handleSignOut = useCallback(async () => {
    console.log("🚨 [AUTH] Executando handleSignOut...");
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("sb-corretor-auth");
      console.log("✅ [AUTH] Storage limpo com sucesso.");
    } catch (e) {
      console.error("❌ [AUTH] Erro ao deslogar:", e);
    } finally {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log(`🔍 [AUTH] Buscando perfil para ID: ${userId}`);
    const { data, error } = await supabase
      .from("usuarios_perfis")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ [AUTH] Erro no fetchProfile:", error);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
  let mounted = true;
  // FLAG CRÍTICA: Impede que o evento onAuthStateChange interfira no boot inicial
  let isInitializing = true; 

  console.log("🚀 [AUTH] Boot iniciado...");

  async function initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("⚠️ [AUTH] Sem sessão inicial.");
        if (mounted) setLoading(false);
        isInitializing = false;
        return;
      }

      console.log("2️⃣ [AUTH] Validando no servidor...");
      const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !verifiedUser) {
        console.error("❌ [AUTH] Token inválido!");
        if (mounted) await handleSignOut();
        isInitializing = false;
        return;
      }

      const profile = await fetchProfile(verifiedUser.id);

      if (mounted) {
        if (profile?.ativo === false) {
          await handleSignOut();
        } else {
          setUser(verifiedUser);
          setUserProfile(profile);
          console.log("✅ [AUTH] Boot finalizado com sucesso.");
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("💥 [AUTH] Erro no boot:", error);
      if (mounted) {
        await handleSignOut();
        setLoading(false);
      }
    } finally {
      isInitializing = false; // Libera o onAuthStateChange
    }
  }

  initialize();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    // SE ESTIVER INICIALIZANDO, IGNORA O EVENTO (O initialize já vai cuidar disso)
    if (isInitializing) {
      console.log(`⏳ [AUTH] Evento ${event} ignorado durante o boot.`);
      return;
    }

    console.log(`🔔 [AUTH] Evento Pós-Boot: ${event}`);
    if (!mounted) return;

    if (event === 'SIGNED_OUT') {
      await handleSignOut();
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session?.user) {
        setUser(session.user);
        const profile = await fetchProfile(session.user.id);
        setUserProfile(profile);
      }
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, [fetchProfile, handleSignOut]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut: handleSignOut, refreshProfile: async () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }