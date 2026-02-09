import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"

// Configuração
import ConfigPerfil from "./pages/configuracao/configPerfil"

// Layouts
import DashboardLayout from "./layouts/DashboardLayout"

// IA CONSULTOR
import { ConsultorIA } from "./ConsultorIA"

// PÁGINAS PÚBLICAS
import HomePage from "./pages/homepage/HomePage"
import PortalParceiro from "./pages/portal/PortalParceiro"
import TermosUso from "./pages/juridico/TermosUso"
import PoliticaPrivacidade from "./pages/juridico/PoliticaPrivacidade"

// Páginas Privadas - Corretores e parceiros
import CorretoresCadastro from "./pages/corretores/CorretoresCadastro"
import CorretoresLista from "./pages/corretores/CorretoresLista"
import ParceirosCadastro from "./pages/parceiros/ParceirosCadastro"
import ParceirosTriagem from "./pages/parceiros/ParceirosTriagem"

// Páginas Privadas - Agenda
import AgendaCorretor from "./pages/agenda/AgendaCorretor"

// Páginas Privadas - Clientes
import ClientesCadastro from "./pages/clientes/ClientesCadastro"
import ClientesLista from "./pages/clientes/ClientesLista"

// Páginas Privadas - Seguradoras e Produtos
import SeguradorasLista from "./pages/seguradoras/SeguradorasLista"
import ProdutosLista from "./pages/propostas/ProdutosLista"

// Páginas Privadas - Propostas
import PropostasCadastro from "./pages/propostas/PropostasCadastro"
import PropostasLista from "./pages/propostas/PropostasLista"

// Páginas Privadas - Kanban e Dash
import Dashboard from "./pages/dashboard/Dashboard"
import KanbanAtendimentos from './pages/kanban/KanbanAtendimentos'
import KanbanVendas from './pages/kanban/KanbanVendas'
import KanbanPerdas from './pages/kanban/KanbanPerdas'

// Páginas Privadas - Sinistros
import { RelatorioSinistros } from "./pages/sinistros/SinistrosLista"

// Páginas Privadas - Comissões
import { ComissoesLista } from "./pages/comissoes/ComissoesLista"

export default function App() {
  const { user, loading } = useAuth()

  // Evita redirecionamentos enquanto verifica se o usuário está logado
  if (loading) {
    return null 
  }

  // --- ROTAS PARA USUÁRIOS NÃO LOGADOS (PÚBLICO) ---
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Rota do Portal acessível sem login */}
        <Route path="/portal/:slug" element={<PortalParceiro />} /> 
        <Route path="/termos" element={<TermosUso />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    )
  }

  // --- ROTAS PARA USUÁRIOS LOGADOS (PRIVADO) ---
  return (
    <NotificationProvider>

      {/* O componente de IA deve ficar FORA do Routes para não causar o erro de invariant */}
      <ConsultorIA />


      <Routes>
        {/* Rota do Portal também acessível para usuários logados (fora do layout do dashboard) */}
        <Route path="/portal/:slug" element={<PortalParceiro />} />

        <Route element={<DashboardLayout />}>
          
          {/* INÍCIO */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* MÓDULO: AGENDA */}
          <Route path="/agenda" element={<AgendaCorretor />} />
          
          {/* MÓDULO: CORRETORES E PARCEIROS */}
          <Route path="/corretores/cadastro" element={<CorretoresCadastro />} />
          <Route path="/corretores/lista" element={<CorretoresLista />} />
          <Route path="/corretores/editar/:id" element={<CorretoresCadastro />} />
          <Route path="/parceiros/cadastro" element={<ParceirosCadastro />} />
          <Route path="/parceiros/editar/:id" element={<ParceirosCadastro />} />
          <Route path="/parceiros/triagem" element={<ParceirosTriagem />} />

          {/* MÓDULO: CLIENTES */}
          <Route path="/clientes/cadastro" element={<ClientesCadastro />} />
          <Route path="/clientes/lista" element={<ClientesLista />} />
          <Route path="/clientes/editar/:id" element={<ClientesCadastro />} />

          {/* MÓDULO: PROPOSTAS E PRODUTOS */}
          <Route path="/propostas/criar" element={<PropostasCadastro key="nova" />} />
          <Route path="/propostas/lista" element={<PropostasLista />} />
          <Route path="/propostas/editar/:id" element={<PropostasCadastro key="editar" />} />
          <Route path="/propostas/produtos" element={<ProdutosLista />} />

          {/* MÓDULO: SEGURADORAS */}
          <Route path="/seguradoras" element={<SeguradorasLista />} />

          {/* MÓDULO: KANBAN */}
          <Route path="/kanban/atendimento" element={<KanbanAtendimentos />} />
          <Route path="/kanban/venda" element={<KanbanVendas />} />
          <Route path="/kanban/perda" element={<KanbanPerdas />} />

          {/* MÓDULO: COMISSÕES */}
          <Route path="/comissoes/lista" element={<ComissoesLista />} />

          {/* MÓDULO: SINISTROS */}
          <Route path="/sinistros/lista" element={<RelatorioSinistros />} />

          {/* MÓDULO: CONFIGURAÇÕES */}
          <Route path="/configuracao/perfil" element={<ConfigPerfil />} />

          {/* CATCH-ALL LOGADO */}
          <Route path="*" element={<Navigate to="/dashboard" />} />

        </Route>
      </Routes>
    </NotificationProvider>
  )
}