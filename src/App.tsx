// src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"

// Configuração
import ConfigPerfil from "./pages/configuracao/configPerfil"

// Layouts
import DashboardLayout from "./layouts/DashboardLayout"

// IA CONSULTOR
import { ConsultorIA } from "./ConsultorIA"

// PÁGINAS PÚBLICAS E AUTH
import HomePage from "./pages/homepage/HomePage"
import PortalParceiro from "./pages/portal/PortalParceiro"
import TermosUso from "./pages/juridico/TermosUso"
import PoliticaPrivacidade from "./pages/juridico/PoliticaPrivacidade"
import ResetPassword from "./components/homepage/ResetPassword"

// Páginas Privadas
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
import KanbanAtendimentos from './pages/kanban/KanbanAtendimentos'
import KanbanVendas from './pages/kanban/KanbanVendas'
import KanbanPerdas from './pages/kanban/KanbanPerdas'
import { RelatorioSinistros } from "./pages/sinistros/SinistrosLista"
import { ComissoesLista } from "./pages/comissoes/ComissoesLista"

export default function App() {
  const { user, loading, userProfile } = useAuth()
  const location = useLocation()

  // BLOQUEIO DE SEGURANÇA: Impede qualquer redirecionamento precoce durante o F5
  if (loading || user === undefined) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium animate-pulse tracking-tight">Sincronizando segurança...</p>
      </div>
    )
  }

  return (
    <NotificationProvider>
      {/* Consultor IA: Só renderiza se houver usuário E o perfil estiver carregado */}
      {user && userProfile && location.pathname !== "/reset-password" && <ConsultorIA />}

      <Routes>
        {/* --- ROTAS PÚBLICAS --- */}
        <Route path="/termos" element={<TermosUso />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/portal/:slug" element={<PortalParceiro />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {!user ? (
          /* --- FLUXO NÃO AUTENTICADO --- */
          <>
            <Route path="/" element={<HomePage />} />
            {/* O replace evita looping no histórico do navegador */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* --- FLUXO AUTENTICADO --- */
          <>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* MÓDULOS */}
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

              {/* Catch-all logado */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </NotificationProvider>
  )
}