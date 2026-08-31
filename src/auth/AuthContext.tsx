import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"

import type { ReactNode } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "../lib/supabaseClient"

interface SignInResult {
  success: boolean
  message: string
}

interface AuthContextData {
  user: User | null
  userProfile: any | null
  loading: boolean

  signIn: (
    email: string,
    password: string
  ) => Promise<SignInResult>

  signOut: () => Promise<void>

  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
)


export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {


  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const initializingRef = useRef(true)
  const signingInRef = useRef(false)
  const signingOutRef = useRef(false)
  const initializedRef = useRef(false)
  const activeUserIdRef = useRef<string | null>(null)
  const clearAuthState = useCallback(() => {
    if (!mountedRef.current) return

    activeUserIdRef.current = null

    setUser(null)
    setUserProfile(null)
  }, [])

  const fetchProfile = useCallback(
    async (userId: string) => {
      console.log("Buscando perfil:", userId)

      const {
        data,
        error,
      } = await supabase
        .from("usuarios_perfis")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.error(
          "Erro ao buscar perfil:",
          error
        )

        return {
          profile: null,
          error,
        }
      }

      return {
        profile: data,
        error: null,
      }
    },
    []
  )

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<SignInResult> => {
      /*
       * Evita duas tentativas simultâneas.
       */
      if (signingInRef.current) {
        return {
          success: false,
          message:
            "Já existe uma tentativa de acesso em andamento.",
        }
      }

      signingInRef.current = true

      console.log("Iniciando login...")

      try {
        const {
          data,
          error,
        } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          console.warn(
            "Falha de autenticação:",
            error.message
          )

          return {
            success: false,
            message:
              "E-mail ou senha incorretos.",
          }
        }

        const authenticatedUser =
          data?.user

        if (!authenticatedUser) {
          return {
            success: false,
            message:
              "Não foi possível validar sua conta. Tente novamente.",
          }
        }

        console.log(
          "Usuário autenticado:",
          authenticatedUser.id
        )

        const {
          profile,
          error: profileError,
        } = await fetchProfile(
          authenticatedUser.id
        )

        if (profileError) {
          console.error(
            "Erro ao consultar perfil."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return {
            success: false,
            message:
              "Não foi possível verificar os dados da sua conta. Tente novamente.",
          }
        }

        if (!profile) {
          console.warn(
            "Usuário autenticado sem perfil."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return {
            success: false,
            message:
              "Seu perfil de acesso não foi encontrado. Entre em contato com o suporte.",
          }
        }

        if (profile.ativo === false) {
          console.warn(
            "Conta inativa ou expirada."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return {
            success: false,
            message:
              "Sua conta está inativa ou expirada. Entre em contato com o suporte para regularizar seu acesso.",
          }
        }

        activeUserIdRef.current =
          authenticatedUser.id

        if (mountedRef.current) {
          setUser(authenticatedUser)
          setUserProfile(profile)
        }

        console.log(
          "Login concluído com sucesso."
        )

        return {
          success: true,
          message: "",
        }
      } catch (error: any) {
        console.error(
          "Erro inesperado no login:",
          error
        )

        clearAuthState()

        return {
          success: false,
          message:
            error?.message ||
            "Houve um erro inesperado ao acessar sua conta.",
        }
      } finally {
        signingInRef.current = false
      }
    },
    [clearAuthState, fetchProfile]
  )

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return

    signingOutRef.current = true

    console.log("Iniciando logout...")

    try {
      await supabase.auth.signOut({
        scope: "local",
      })
    } catch (error) {
      console.warn(
        "Erro durante logout:",
        error
      )
    } finally {
      clearAuthState()

      signingOutRef.current = false

      console.log(
        "Logout concluído."
      )
    }
  }, [clearAuthState])


  const refreshProfile = useCallback(
    async () => {
      try {
        const {
          data: {
            user: currentUser,
          },
        } =
          await supabase.auth.getUser()

        if (!currentUser) {
          clearAuthState()
          return
        }

        const {
          profile,
          error,
        } = await fetchProfile(
          currentUser.id
        )

        if (error || !profile) {
          clearAuthState()
          return
        }

        if (profile.ativo === false) {
          console.warn(
            "Conta ficou inativa durante a sessão."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return
        }

        if (!mountedRef.current) return

        activeUserIdRef.current =
          currentUser.id

        setUser(currentUser)
        setUserProfile(profile)
      } catch (error) {
        console.error(
          "Erro ao atualizar perfil:",
          error
        )
      }
    },
    [clearAuthState, fetchProfile]
  )

  useEffect(() => {
    mountedRef.current = true

    if (initializedRef.current) {
      return
    }

    initializedRef.current = true

    let cancelled = false

    async function initializeAuth() {
      console.log(
        "Boot da autenticação iniciado."
      )

      try {

        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession()

        if (
          cancelled ||
          !mountedRef.current
        ) {
          return
        }


        if (!session?.user) {
          console.log(
            "Nenhuma sessão encontrada."
          )

          return
        }

        const {
          data: {
            user: verifiedUser,
          },
          error: userError,
        } =
          await supabase.auth.getUser()

        if (
          cancelled ||
          !mountedRef.current
        ) {
          return
        }

        if (
          userError ||
          !verifiedUser
        ) {
          console.warn(
            "Sessão inválida."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return
        }


        const {
          profile,
          error: profileError,
        } = await fetchProfile(
          verifiedUser.id
        )

        if (
          cancelled ||
          !mountedRef.current
        ) {
          return
        }

        if (
          profileError ||
          !profile
        ) {
          console.warn(
            "Perfil não encontrado."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return
        }


        if (profile.ativo === false) {
          console.warn(
            "Conta inativa detectada durante o boot."
          )

          await supabase.auth.signOut({
            scope: "local",
          }).catch(() => {})

          clearAuthState()

          return
        }

        activeUserIdRef.current =
          verifiedUser.id

        setUser(verifiedUser)
        setUserProfile(profile)

        console.log(
          "Boot da autenticação concluído."
        )
      } catch (error) {
        console.error(
          "Erro crítico no boot:",
          error
        )

        if (
          !cancelled &&
          mountedRef.current
        ) {
          clearAuthState()
        }
      } finally {


        if (
          !cancelled &&
          mountedRef.current
        ) {
          setLoading(false)
        }

        initializingRef.current = false
      }
    }

    initializeAuth()


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
         
          if (initializingRef.current) {
            return
          }

          if (!mountedRef.current) {
            return
          }

          console.log(
            "Evento Supabase:",
            event
          )

          

          if (event === "SIGNED_IN") {
            if (
              signingInRef.current
            ) {
              console.log(
                "SIGNED_IN ignorado durante login controlado."
              )

              return
            }

            

            if (
              session?.user &&
              activeUserIdRef.current ===
                session.user.id
            ) {
              setUser(
                session.user
              )
            }

            return
          }

          

          if (event === "SIGNED_OUT") {
            

            clearAuthState()

            return
          }

          

          if (
            event === "TOKEN_REFRESHED" &&
            session?.user
          ) {
            

            if (
              activeUserIdRef.current ===
              session.user.id
            ) {
              setUser(
                session.user
              )
            }

            return
          }

          

          if (
            event === "USER_UPDATED" &&
            session?.user
          ) {
            if (
              activeUserIdRef.current ===
              session.user.id
            ) {
              setUser(
                session.user
              )
            }

            return
          }
        }
      )


    return () => {
      cancelled = true
      mountedRef.current = false

      subscription.unsubscribe()
    }
  }, [
    clearAuthState,
    fetchProfile,
  ])

  

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
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
