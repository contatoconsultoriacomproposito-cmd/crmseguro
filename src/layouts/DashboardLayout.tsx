import { Outlet, Navigate } from "react-router-dom" // Adicione Navigate
import Sidebar from "../components/Sidebar"
import { useState } from "react"
import { useAuth } from "../auth/AuthContext" // Adicione useAuth

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, userProfile, loading } = useAuth()

  // 1. Se estiver carregando, tela branca ou spinner
  if (loading) return null 

  // 2. Se cair aqui sem perfil ou inativo, bloqueia e redireciona
  if (!user || (userProfile && userProfile.ativo === false)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-zinc-900 dark:text-zinc-100">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 h-full overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  )
}