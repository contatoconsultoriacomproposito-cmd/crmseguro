// src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabaseClient"

interface AuthContextData {
  user: User | null
  userProfile: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // ==============================
  // Buscar perfil (não bloqueia auth)
  // ==============================
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("usuarios_perfis")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar perfil:", error)
      return null
    }

    return data
  }

  // ==============================
  // Inicialização à prova de recovery travado
  // ==============================
  useEffect(() => {
  let mounted = true

  async function initialize() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!mounted) return

    if (!session?.user) {
      setUser(null)
      setUserProfile(null)
      setLoading(false)
      return
    }

    setUser(session.user)
    setLoading(false)

    const profile = await fetchProfile(session.user.id)

    if (!mounted) return

    if (profile?.ativo === false) {
      await supabase.auth.signOut()
      return
    }

    setUserProfile(profile)
  }

  initialize()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!mounted) return

      if (!session?.user) {
        setUser(null)
        setUserProfile(null)
        return
      }

      setUser(session.user)

      const profile = await fetchProfile(session.user.id)

      if (!mounted) return

      if (profile?.ativo === false) {
        await supabase.auth.signOut()
        return
      }

      setUserProfile(profile)
    }
  )

  return () => {
    mounted = false
    subscription.unsubscribe()
  }
}, [])


  // ==============================
  // Logout
  // ==============================
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  // ==============================
  // Atualizar perfil manualmente
  // ==============================
  async function refreshProfile() {
    if (!user) return
    const profile = await fetchProfile(user.id)
    setUserProfile(profile)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
