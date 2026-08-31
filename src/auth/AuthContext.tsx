import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabaseClient"

interface AuthContextData {
  user: User | null
  userProfile: any | null
  loading: boolean
  authError: string | null
  setAuthError: (error: string | null) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signIn: (email: string, pass: string) => Promise<void> // <- NOVA FUNÇÃO
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const isAuthProcessing = useRef(false) // TRAVA MESTRA: Impede recarregamentos fantasmas
  const hasInitialized = useRef(false)
  const activeUserIdRef = useRef<string | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("usuarios_perfis").select("*").eq("id", userId).maybeSingle()
    return data
  }, [])

  const handleSignOut = useCallback(async () => {
    if (isAuthProcessing.current) return 
    isAuthProcessing.current = true

    try {
      await supabase.auth.signOut().catch(() => {})
    } finally {
      localStorage.removeItem("sb-corretor-auth")
      setUser(null)
      setUserProfile(null)
      activeUserIdRef.current = null

      if (window.location.pathname !== "/" && !window.location.pathname.startsWith("/portal")) {
        window.location.href = "/"
      } else {
        setLoading(false)
      }
      isAuthProcessing.current = false
    }
  }, [])

  // A MÁGICA ACONTECE AQUI: Uma função blindada de login
  const signIn = async (email: string, pass: string) => {
    isAuthProcessing.current = true; // Fecha os olhos do listener global
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error

      if (data?.user) {
        const profile = await fetchProfile(data.user.id)
        
        if (profile?.ativo === false) {
          await supabase.auth.signOut().catch(() => {}) // Desloga silenciosamente
          throw new Error("INACTIVE_ACCOUNT") // Envia o erro pro modal
        }

        // Se estiver tudo certo, carrega o usuário no estado global
        activeUserIdRef.current = data.user.id
        setUser(data.user)
        setUserProfile(profile)
      }
    } finally {
      isAuthProcessing.current = false; // Abre os olhos do listener novamente
    }
  }

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

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          if (mounted) setLoading(false)
          return
        }

        const profile = await fetchProfile(session.user.id)
        if (mounted) {
          if (profile?.ativo === false) {
            await supabase.auth.signOut().catch(() => {})
            setUser(null)
            setUserProfile(null)
            setLoading(false)
          } else {
            activeUserIdRef.current = session.user.id
            setUser(session.user)
            setUserProfile(profile)
            setLoading(false)
          }
        }
      } catch (error) {
        if (mounted) await handleSignOut()
      }
    }
    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // IGNORA OS EVENTOS SE O USUÁRIO ESTIVER APERTANDO O BOTÃO DE LOGIN
      if (isAuthProcessing.current) return;

      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        activeUserIdRef.current = null
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      } 
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user && activeUserIdRef.current !== session.user.id) {
          setLoading(true)
          const profile = await fetchProfile(session.user.id)
          
          if (profile?.ativo === false) {
            await supabase.auth.signOut().catch(() => {})
            activeUserIdRef.current = null
            setUser(null)
            setUserProfile(null)
            setLoading(false)
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
    <AuthContext.Provider value={{ user, userProfile, loading, authError, setAuthError, signOut: handleSignOut, refreshProfile, signIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }