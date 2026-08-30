import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import type { ReactNode } from "react"

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const { user, userProfile, loading } = useAuth()

  // Enquanto estiver validando usuário ou buscando o perfil recém-criado
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-medium">
        Carregando...
      </div>
    )
  }

  // Se não há usuário logado OU se o perfil/corretora ainda não foi associado
  if (!user || !userProfile) {
    return <Navigate to="/" replace />
  }

  return children
}