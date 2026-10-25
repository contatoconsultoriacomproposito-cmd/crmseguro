// src/App.tsx
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { Toaster } from "sonner"

import { useAuth } from "./auth/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import DashboardLayout from "./layouts/DashboardLayout"

// ======================================================
// PÁGINAS PÚBLICAS
// ======================================================
import HomePage from "./pages/homepage/HomePage"
import PortalParceiro from "./pages/portal/PortalParceiro"
import TermosUso from "./pages/juridico/TermosUso"
import PoliticaPrivacidade from "./pages/juridico/PoliticaPrivacidade"
import ResetPassword from "./components/homepage/ResetPassword"

// ======================================================
// NOVO NÚCLEO CRM
// Tudo que pertence à área privada principal fica em:
// src/pages/whatsapp
// ======================================================

// WhatsApp
import WhatsAppInbox from "./pages/whatsapp/pages/WhatsAppInbox"
import WhatsAppContatos from "./pages/whatsapp/pages/WhatsAppContatos"
import WhatsAppAutomacoes from "./pages/whatsapp/pages/WhatsAppAutomacoes"
import WhatsAppKanban from "./pages/whatsapp/pages/WhatsAppKanban"

// Agenda
import AgendaCRM from "./pages/whatsapp/pages/agenda/pages/AgendaCRM"

// Clientes
import CentralClientes from "./pages/whatsapp/central-clientes/CentralClientes"

// Propostas
import PropostasLista from "./pages/whatsapp/pages/propostas/pages/PropostasLista"
import PropostaDetalhes from "./pages/whatsapp/pages/propostas/pages/PropostaDetalhes"

// Financeiro
import Financeiro from "./pages/whatsapp/pages/financeiro/pages/Financeiro"
import FinanceiroContrato from "./pages/whatsapp/pages/financeiro/pages/FinanceiroContrato"

// Comissões
import Comissoes from "./pages/whatsapp/pages/comissoes/pages/Comissoes"
import ComissaoContrato from "./pages/whatsapp/pages/comissoes/pages/ComissaoContrato"

// Sinistros
import SinistrosLista from "./pages/whatsapp/pages/sinistros/SinistrosLista"
import SinistroDetalhes from "./pages/whatsapp/pages/sinistros/SinistroDetalhes"

// Assistências
import AssistenciasLista from "./pages/whatsapp/pages/assistencias/AssistenciasLista"
import AssistenciaDetalhes from "./pages/whatsapp/pages/assistencias/AssistenciaDetalhes"

// Equipe
import Equipe from "./pages/whatsapp/equipe/Equipe"
import NovoMembro from "./pages/whatsapp/equipe/NovoMembro"

// Configurações / Infraestrutura
import ConexoesWhatsApp from "./pages/whatsapp/configuracoes/ConexoesWhatsApp"
import CentralArmazenamento from "./pages/whatsapp/armazenamento/services/CentralArmazenamento"
import ConfigCorretora from "./pages/whatsapp/configuracao-corretora/ConfigCorretora"
import SeguradorasLista from "./pages/whatsapp/pages/seguradoras/SeguradorasLista"

// ======================================================
// ROTA PRIVADA
// ======================================================
function PrivateWrapper() {
  const { user, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading || (user && userProfile === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/"
        state={{ from: location }}
        replace
      />
    )
  }

  if (userProfile?.ativo === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-slate-800">
          Acesso Inativo
        </h1>

        <p className="max-w-md text-slate-600">
          Sua conta está inativa ou pendente de aprovação pelo administrador da corretora.
        </p>
      </div>
    )
  }

  return <Outlet />
}

// ======================================================
// ROTA PÚBLICA SOMENTE PARA NÃO LOGADOS
// ======================================================
function PublicOnlyWrapper() {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (
    user &&
    userProfile &&
    userProfile.ativo !== false
  ) {
    return (
      <Navigate
        to="/whatsapp/kanban"
        replace
      />
    )
  }

  return <Outlet />
}

// ======================================================
// APP PRINCIPAL
// ======================================================
export default function App() {
  const { user, userProfile } = useAuth()

  const usuarioAtivo =
    Boolean(user) &&
    Boolean(userProfile) &&
    userProfile?.ativo !== false

  return (
    <NotificationProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
      />

      <Routes>
        {/* ==================================================
            PÚBLICAS
        ================================================== */}

        <Route element={<PublicOnlyWrapper />}>
          <Route
            path="/"
            element={<HomePage />}
          />
        </Route>

        <Route
          path="/portal/:slug"
          element={<PortalParceiro />}
        />

        <Route
          path="/termos"
          element={<TermosUso />}
        />

        <Route
          path="/privacidade"
          element={<PoliticaPrivacidade />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* ==================================================
            ÁREA PRIVADA
        ================================================== */}

        <Route element={<PrivateWrapper />}>
          <Route element={<DashboardLayout />}>

            {/* ================================================
                WHATSAPP / ATENDIMENTO
            ================================================ */}

            <Route
              path="/whatsapp"
              element={<WhatsAppInbox />}
            />

            <Route
              path="/whatsapp/contatos"
              element={<WhatsAppContatos />}
            />

            <Route
              path="/whatsapp/automacoes"
              element={<WhatsAppAutomacoes />}
            />

            <Route
              path="/whatsapp/kanban"
              element={<WhatsAppKanban />}
            />

            <Route
              path="/whatsapp/agenda"
              element={<AgendaCRM />}
            />

            {/* ================================================
                CLIENTES
            ================================================ */}

            <Route
              path="/whatsapp/clientes"
              element={<CentralClientes />}
            />

            {/* ================================================
                PROPOSTAS
            ================================================ */}

            <Route
              path="/whatsapp/propostas"
              element={<PropostasLista />}
            />

            <Route
              path="/whatsapp/propostas/:id"
              element={<PropostaDetalhes />}
            />

            {/* ================================================
                FINANCEIRO
            ================================================ */}

            <Route
              path="/whatsapp/financeiro"
              element={<Financeiro />}
            />

            <Route
              path="/whatsapp/financeiro/contratos/:contratoId"
              element={<FinanceiroContrato />}
            />

            {/* ================================================
                COMISSÕES
            ================================================ */}

            <Route
              path="/whatsapp/comissoes"
              element={<Comissoes />}
            />

            <Route
              path="/whatsapp/comissoes/contratos/:contratoId"
              element={<ComissaoContrato />}
            />

            {/* ================================================
                SINISTROS
            ================================================ */}

            <Route
              path="/whatsapp/sinistro"
              element={<SinistrosLista />}
            />

            <Route
              path="/whatsapp/sinistro/:id"
              element={<SinistroDetalhes />}
            />

            {/* ================================================
                ASSISTÊNCIAS
            ================================================ */}

            <Route
              path="/whatsapp/assistencia"
              element={<AssistenciasLista />}
            />

            <Route
              path="/whatsapp/assistencia/:id"
              element={<AssistenciaDetalhes />}
            />

            {/* ================================================
                EQUIPE
            ================================================ */}

            <Route
              path="/whatsapp/equipe"
              element={<Equipe />}
            />

            <Route
              path="/whatsapp/equipe/cadastro"
              element={<NovoMembro />}
            />

            {/* ================================================
                CONFIGURAÇÕES
            ================================================ */}

            <Route
              path="/whatsapp/conexoes"
              element={<ConexoesWhatsApp />}
            />

            <Route
              path="/whatsapp/armazenamento"
              element={<CentralArmazenamento />}
            />

            <Route
              path="/whatsapp/seguradoras"
              element={<SeguradorasLista />}
            />

            <Route
              path="/whatsapp/configuracao/perfil"
              element={<ConfigCorretora />}
            />

            {/* ================================================
                CONVERSA INDIVIDUAL

                Deixar depois das rotas específicas mantém
                a estrutura visual mais fácil de entender.
                O React Router também prioriza rotas estáticas.
            ================================================ */}

            <Route
              path="/whatsapp/:conversationId"
              element={<WhatsAppInbox />}
            />

            {/* ================================================
                COMPATIBILIDADE TEMPORÁRIA COM LINKS ANTIGOS

                Podemos remover depois que Sidebar e demais
                referências estiverem totalmente migrados.
            ================================================ */}

            <Route
              path="/dashboard"
              element={
                <Navigate
                  to="/whatsapp"
                  replace
                />
              }
            />

            <Route
              path="/agenda"
              element={
                <Navigate
                  to="/whatsapp"
                  replace
                />
              }
            />

            <Route
              path="/equipe"
              element={
                <Navigate
                  to="/whatsapp/equipe"
                  replace
                />
              }
            />

            <Route
              path="/equipe/cadastro"
              element={
                <Navigate
                  to="/whatsapp/equipe/cadastro"
                  replace
                />
              }
            />

            <Route
              path="/conexoes"
              element={
                <Navigate
                  to="/whatsapp/conexoes"
                  replace
                />
              }
            />

            <Route
              path="/armazenamento"
              element={
                <Navigate
                  to="/whatsapp/armazenamento"
                  replace
                />
              }
            />

            <Route
              path="/seguradoras"
              element={
                <Navigate
                  to="/whatsapp/seguradoras"
                  replace
                />
              }
            />

            <Route
              path="/configuracao/perfil"
              element={
                <Navigate
                  to="/whatsapp/configuracao/perfil"
                  replace
                />
              }
            />

            {/* ================================================
                NÚCLEO ANTIGO DESATIVADO

                Mantido apenas como referência durante esta
                etapa final de homologação.

                /clientes/*
                /propostas/*
                /kanban/*
                /financeiro/*
                /comissoes/lista
                /sinistros/lista
                /corretores/*
                /parceiros/*
                /seguros-vida
            ================================================ */}

          </Route>
        </Route>

        {/* ==================================================
            FALLBACK
        ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to={
                usuarioAtivo
                  ? "/whatsapp"
                  : "/"
              }
              replace
            />
          }
        />
      </Routes>
    </NotificationProvider>
  )
}