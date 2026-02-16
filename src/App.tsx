// src/App.tsx
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"

// Layout
import DashboardLayout from "./layouts/DashboardLayout"

// IA
import { ConsultorIA } from "./ConsultorIA"

// Páginas Públicas
import HomePage from "./pages/homepage/HomePage"
import PortalParceiro from "./pages/portal/PortalParceiro"
import TermosUso from "./pages/juridico/TermosUso"
import PoliticaPrivacidade from "./pages/juridico/PoliticaPrivacidade"
import ResetPassword from "./components/homepage/ResetPassword"

// Páginas Privadas
import ConfigPerfil from "./pages/configuracao/configPerfil"
import CorretoresCadastro from "./pages/corretores/CorretoresCadastro"
import CorretoresLista from "./pages/corretores/CorretoresLista"
import ParceirosCadastro from "./pages/parceiros/ParceirosCadastro"
import ParceirosTriagem from "./pages/parceiros/ParceirosTriagem"
import AgendaCorretor from "./pages/agenda/AgendaCorretor"
import ClientesCadastro from "./pages/clientes/ClientesCadastro"
import ClientesLista from "./pages/clientes/ClientesLista"
import SeguradorasLista from "./pages/seguradoras/SeguradorasLista"
import ProdutosLista from "./pages/propostas/ProdutosLista"
import PropostasCadastro from "./pages/propostas/PropostasCadastro"
import PropostasLista from "./pages/propostas/PropostasLista"
import Dashboard from "./pages/dashboard/Dashboard"
import KanbanAtendimentos from "./pages/kanban/KanbanAtendimentos"
import KanbanVendas from "./pages/kanban/KanbanVendas"
import KanbanPerdas from "./pages/kanban/KanbanPerdas"
import { RelatorioSinistros } from "./pages/sinistros/SinistrosLista"
import { ComissoesLista } from "./pages/comissoes/ComissoesLista"



// ===============================
// 🔐 ROTA PRIVADA BLINDADA
// ===============================
function PrivateWrapper() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Se não houver user, mandamos para a home e salvamos de onde ele veio
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <Outlet />
}



// ===============================
// 🌍 ROTA PÚBLICA SOMENTE PARA NÃO LOGADOS
// ===============================
function PublicOnlyWrapper() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Se já está logado e tenta ir para a Home (/), jogamos para o Dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}


// ===============================
// 🚀 APP PRINCIPAL (ESTÁVEL)
// ===============================
export default function App() {
  const { user, userProfile } = useAuth()
  const location = useLocation()

  return (
    <NotificationProvider>
      {/* IA apenas se autenticado */}
      {user &&
        userProfile &&
        location.pathname !== "/reset-password" && (
          <ConsultorIA />
        )}

      <Routes>

        {/* ================= PUBLICAS ================= */}
        <Route element={<PublicOnlyWrapper />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route path="/portal/:slug" element={<PortalParceiro />} />
        <Route path="/termos" element={<TermosUso />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/reset-password" element={<ResetPassword />} />


        {/* ================= PRIVADAS ================= */}
        <Route element={<PrivateWrapper />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agenda" element={<AgendaCorretor />} />

            <Route path="/corretores/cadastro" element={<CorretoresCadastro />} />
            <Route path="/corretores/lista" element={<CorretoresLista />} />
            <Route path="/corretores/editar/:id" element={<CorretoresCadastro />} />

            <Route path="/parceiros/cadastro" element={<ParceirosCadastro />} />
            <Route path="/parceiros/editar/:id" element={<ParceirosCadastro />} />
            <Route path="/parceiros/triagem" element={<ParceirosTriagem />} />

            <Route path="/clientes/cadastro" element={<ClientesCadastro />} />
            <Route path="/clientes/lista" element={<ClientesLista />} />
            <Route path="/clientes/editar/:id" element={<ClientesCadastro />} />

            <Route path="/propostas/criar" element={<PropostasCadastro key="nova" />} />
            <Route path="/propostas/lista" element={<PropostasLista />} />
            <Route path="/propostas/editar/:id" element={<PropostasCadastro key="editar" />} />
            <Route path="/propostas/produtos" element={<ProdutosLista />} />

            <Route path="/seguradoras" element={<SeguradorasLista />} />

            <Route path="/kanban/atendimento" element={<KanbanAtendimentos />} />
            <Route path="/kanban/venda" element={<KanbanVendas />} />
            <Route path="/kanban/perda" element={<KanbanPerdas />} />

            <Route path="/comissoes/lista" element={<ComissoesLista />} />
            <Route path="/sinistros/lista" element={<RelatorioSinistros />} />

            <Route path="/configuracao/perfil" element={<ConfigPerfil />} />
          </Route>
        </Route>

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </NotificationProvider>
  )
}
