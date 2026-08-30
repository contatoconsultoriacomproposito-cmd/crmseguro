// src/App.tsx
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"

// Layout
import DashboardLayout from "./layouts/DashboardLayout"

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
import ClientesAcoes from "./pages/clientes/ClientesAcoes"
import LeadsProspeccao from "./pages/clientes/Leads/LeadsProspeccao"
import CampanhasClientes from "./pages/clientes/components/painel-marketing/CampanhasClientes"
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
import PlanoContas from "./pages/financeiro/PlanoContas"
import Lancamentos from "./pages/financeiro/Lancamentos"

// 🛡️ Módulo de Seguros de Vida
import PropostasAvulsas from "./pages/propostas/PropostasAvulsas"


// ===============================
// 🔐 ROTA PRIVADA BLINDADA
// ===============================
function PrivateWrapper() {
  const { user, userProfile, loading } = useAuth()
  const location = useLocation()

  // 1. Loading state enquanto o contexto recupera token e perfil
  if (loading || (user && userProfile === null)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 2. Não autenticado
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // 3. Usuário inativo no sistema (Evita loop de redirecionamento)
  if (userProfile?.ativo === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Acesso Inativo</h1>
        <p className="text-slate-600 max-w-md">
          Sua conta está inativa ou pendente de aprovação pelo administrador da corretora.
        </p>
      </div>
    )
  }

  return <Outlet />
}


// ===============================
// 🌍 ROTA PÚBLICA SOMENTE PARA NÃO LOGADOS
// ===============================
function PublicOnlyWrapper() {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Só envia para o Dashboard se estiver autenticado E com perfil ativo
  if (user && userProfile && userProfile.ativo !== false) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}


// ===============================
// 🚀 APP PRINCIPAL
// ===============================
export default function App() {
  const { user, userProfile } = useAuth()

  return (
    <NotificationProvider>
      <Routes>

        {/* ================= PÚBLICAS ================= */}
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
            <Route path="/clientes/acoes" element={<ClientesAcoes />} /> 
            <Route path="/clientes/campanhas" element={<CampanhasClientes />} />
            <Route path="/clientes/leads" element={<LeadsProspeccao />} />

            <Route path="/propostas/criar" element={<PropostasCadastro key="nova" />} />
            <Route path="/propostas/lista" element={<PropostasLista />} />
            <Route path="/propostas/editar/:id" element={<PropostasCadastro key="editar" />} />
            <Route path="/propostas/produtos" element={<ProdutosLista />} />

            <Route path="/seguros-vida" element={<PropostasAvulsas />} />

            <Route path="/seguradoras" element={<SeguradorasLista />} />

            <Route path="/kanban/atendimento" element={<KanbanAtendimentos />} />
            <Route path="/kanban/venda" element={<KanbanVendas />} />
            <Route path="/kanban/perda" element={<KanbanPerdas />} />

            <Route path="/comissoes/lista" element={<ComissoesLista />} />
            <Route path="/sinistros/lista" element={<RelatorioSinistros />} />
            <Route 
              path="/financeiro/plano-contas" 
              element={
                <PlanoContas 
                  corretoraId={userProfile?.corretora_id} 
                  usuarioId={userProfile?.id} 
                />
              } 
            />
            <Route 
              path="/financeiro/lancamentos" 
              element={
                <Lancamentos 
                  corretoraId={userProfile?.corretora_id} 
                  usuarioId={userProfile?.id} 
                />
              } 
            />

            <Route path="/configuracao/perfil" element={<ConfigPerfil />} />
          </Route>
        </Route>

        {/* ================= FALLBACK INTELIGENTE ================= */}
        <Route 
          path="*" 
          element={<Navigate to={user && userProfile?.ativo ? "/dashboard" : "/"} replace />} 
        />

      </Routes>
    </NotificationProvider>
  )
}