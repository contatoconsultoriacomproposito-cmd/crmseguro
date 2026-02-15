// src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabaseClient"

interface AuthContextData {
  user: User | null | undefined // undefined = inicializando, null = deslogado
  userProfile: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Mudança Crucial: user começa como undefined para evitar que o App.tsx redirecione antes da hora
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Ref para evitar que o onAuthStateChange atropele o init() no F5
  const isInitializing = useRef(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios_perfis')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) return null
      return data
    } catch {
      return null
    }
  }

  const handleUserSession = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setUser(null)
      setUserProfile(null)
      setLoading(false)
      return
    }

    const profile = await fetchProfile(sessionUser.id)

    if (profile && profile.ativo === false) {
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
    } else {
      setUser(sessionUser)
      setUserProfile(profile)
    }
    
    setLoading(false)
    isInitializing.current = false
  }

  useEffect(() => {
    // 1. Busca imediata da sessão (Executa uma única vez no F5)
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      await handleUserSession(session?.user ?? null)
    }

    init()

    // 2. Listener de eventos de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignora eventos iniciais redundantes enquanto o init() está rodando
      if (isInitializing.current && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        return
      }

      if (event === 'SIGNED_IN') {
        await handleUserSession(session?.user ?? null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setUserProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id)
      setUserProfile(data)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}