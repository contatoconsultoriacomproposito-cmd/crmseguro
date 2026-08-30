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

  const isLoggingOut = useRef(false)
  const hasInitialized = useRef(false)
  const activeUserIdRef = useRef<string | null>(null)

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
      activeUserIdRef.current = null

      if (window.location.pathname !== "/" && !window.location.pathname.startsWith("/portal")) {
        console.log("✅ [AUTH] Redirecionando para Home...")
        window.location.href = "/"
      } else {
        setLoading(false)
      }
      
      // Garante a liberação da trava de logout para os próximos logins
      isLoggingOut.current = false
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
      if (data?.ativo === false) {
        await handleSignOut()
      } else {
        activeUserIdRef.current = currentUser.id
        setUser(currentUser)
        setUserProfile(data)
      }
    }
  }, [fetchProfile, handleSignOut])

  useEffect(() => {
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
            activeUserIdRef.current = verifiedUser.id
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
      if (isInitializing) return
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        activeUserIdRef.current = null
        await handleSignOut()
      } 
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          if (activeUserIdRef.current === session.user.id) {
            console.log("⏭️ [AUTH] Trava Ref: Usuário já ativo. Ignorando re-fetch silencioso.")
            setLoading(false)
            return
          }

          console.log(`🔔 [AUTH] Evento: ${event} - Validando perfil antes de liberar acesso...`)
          
          // Mantém o loading ativo enquanto busca o perfil para evitar a colisão com o ProtectedRoute
          setLoading(true)

          const profile = await fetchProfile(session.user.id)

          if (profile?.ativo === false) {
            console.warn("🚫 [AUTH] Tentativa de login com conta inativa detectada!")
            activeUserIdRef.current = null
            await handleSignOut()
            return
          }

          activeUserIdRef.current = session.user.id
          setUser(session.user)
          setUserProfile(profile)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, handleSignOut])

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }