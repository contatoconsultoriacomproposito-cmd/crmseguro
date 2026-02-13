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

    // SE O USUÁRIO ESTIVER INATIVO, DESLOGAMOS AQUI NO NÍVEL DO CONTEXTO
    if (data && data.ativo === false) {
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      return null
    }

    setUserProfile(data)
    return data
  }

  useEffect(() => {
    // Checagem inicial
    supabase.auth.getUser().then(async ({ data }) => {
      const currentUser = data.user
      if (currentUser) {
        setUser(currentUser)
        await fetchProfile(currentUser.id)
      }
      setLoading(false) // Só libera o app após a checa do perfil
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      
      if (event === 'SIGNED_IN' && currentUser) {
        const perfil = await fetchProfile(currentUser.id)
        // Se fetchProfile retornar null (inativo), o setUser(null) já foi feito lá dentro
        if (perfil) setUser(currentUser)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
      }
      
      setLoading(false)
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