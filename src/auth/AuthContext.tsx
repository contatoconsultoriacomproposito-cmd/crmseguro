import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabaseClient"

interface AuthContextData {
  user: User | null
  userProfile: any | null // Dados da tabela usuarios_perfis
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void> // Para atualizar após mudar config
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('usuarios_perfis')
      .select('*')
      .eq('id', userId)
      .single()
    setUserProfile(data)
  }

  useEffect(() => {
    // Checagem inicial
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}