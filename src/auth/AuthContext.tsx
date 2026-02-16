import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
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
  
  // Refs para controle de fluxo e evitar loops
  const isLoggingOut = useRef(false)
  const hasInitialized = useRef(false)

  const handleSignOut = useCallback(async () => {
    if (isLoggingOut.current) return
    isLoggingOut.current = true

    console.log("🚨 [AUTH] Iniciando limpeza de sessão...")
    
    try {
      await supabase.auth.signOut().catch(() => {})
    } finally {
      localStorage.removeItem("sb-corretor-auth")
      localStorage.clear()
      
      setUser(null)
      setUserProfile(null)
      
      // Só redireciona se estiver em página privada
      if (window.location.pathname !== "/" && !window.location.pathname.startsWith("/portal")) {
        console.log("✅ [AUTH] Redirecionando para Home...")
        window.location.href = "/"
      } else {
        setLoading(false)
        isLoggingOut.current = false
      }
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    console.log(`🔍 [AUTH] Buscando perfil: ${userId}`)
    const { data, error } = await supabase
      .from("usuarios_perfis")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.error("❌ [AUTH] Erro ao buscar perfil:", error)
      return null
    }
    return data
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const data = await fetchProfile(currentUser.id)
      setUserProfile(data)
    }
  }, [fetchProfile])

  useEffect(() => {
    // Se já inicializou uma vez, não permite reiniciar o efeito (Trava de Loop)
    if (hasInitialized.current) return
    hasInitialized.current = true

    let mounted = true
    let isInitializing = true 

    console.log("🚀 [AUTH] Boot iniciado...")

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          console.log("⚠️ [AUTH] Sem sessão inicial no cache.")
          if (mounted) setLoading(false)
          isInitializing = false
          return
        }

        console.log("2️⃣ [AUTH] Validando token no servidor...")
        const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !verifiedUser) {
          console.error("❌ [AUTH] Sessão inválida no boot.")
          if (mounted) await handleSignOut()
          return
        }

        const profile = await fetchProfile(verifiedUser.id)

        if (mounted) {
          if (profile?.ativo === false) {
            await handleSignOut()
          } else {
            setUser(verifiedUser)
            setUserProfile(profile)
            console.log("✅ [AUTH] Boot concluído com sucesso.")
            setLoading(false)
          }
        }
      } catch (error) {
        console.error("💥 [AUTH] Erro crítico no boot:", error)
        if (mounted) await handleSignOut()
      } finally {
        isInitializing = false
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignora eventos durante o boot inicial
      if (isInitializing) return

      console.log(`🔔 [AUTH] Evento: ${event}`)
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        await handleSignOut()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Só atualiza se o usuário mudou de fato
          setUser(session.user)
          const profile = await fetchProfile(session.user.id)
          setUserProfile(profile)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // REMOVIDO 'user' da lista de dependências para matar o loop infinito
  }, [fetchProfile, handleSignOut]) 

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }