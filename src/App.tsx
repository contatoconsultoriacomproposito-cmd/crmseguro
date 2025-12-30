import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"

// Layouts
import DashboardLayout from "./layouts/DashboardLayout"

// Páginas Públicas
import HomePage from "./pages/homepage/HomePage"

// Páginas Privadas - Corretores
import CorretoresCadastro from "./pages/corretores/CorretoresCadastro"
import CorretoresLista from "./pages/corretores/CorretoresLista"

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
    return null // Aqui você pode colocar um componente de Loading se desejar
  }

  // --- ROTAS PARA USUÁRIOS NÃO LOGADOS (PÚBLICO) ---
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    )
  }

  // --- ROTAS PARA USUÁRIOS LOGADOS (PRIVADO) ---
  // Envolvemos com o NotificationProvider para que a Sidebar e os Modais funcionem globalmente
  return (
    <NotificationProvider>
      <Routes>
        <Route element={<DashboardLayout />}>
          
          {/* INÍCIO */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* MÓDULO: CORRETORES */}
          <Route path="/corretores/cadastro" element={<CorretoresCadastro />} />
          <Route path="/corretores/lista" element={<CorretoresLista />} />
          <Route path="/corretores/editar/:id" element={<CorretoresCadastro />} />

          {/* MÓDULO: CLIENTES */}
          <Route path="/clientes/cadastro" element={<ClientesCadastro />} />
          <Route path="/clientes/lista" element={<ClientesLista />} />
          <Route path="/clientes/editar/:id" element={<ClientesCadastro />} />

          {/* MÓDULO: PROPOSTAS E PRODUTOS */}
          <Route path="/propostas/criar" element={<PropostasCadastro key="nova" />} />
          <Route path="/propostas/lista" element={<PropostasLista />} />
          <Route path="/propostas/editar/:id" element={<PropostasCadastro key="editar" />} />
          <Route path="/propostas/produtos" element={<ProdutosLista />} />

          {/* MÓDULO: SEGURADORAS E CONFIGURAÇÕES */}
          <Route path="/seguradoras" element={<SeguradorasLista />} />

          {/* MÓDULO: KANBAN */}
          <Route path="/kanban/atendimento" element={<KanbanAtendimentos />} />
          <Route path="/kanban/venda" element={<KanbanVendas />} />
          <Route path="/kanban/perda" element={<KanbanPerdas />} />

          {/* MÓDULO: COMISSÕES */}
          <Route path="/comissoes/lista" element={<ComissoesLista />} />

          {/* MÓDULO: SINISTROS */}
          <Route path="/sinistros/lista" element={<RelatorioSinistros />} />

          {/* CATCH-ALL LOGADO */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
          
        </Route>
      </Routes>
    </NotificationProvider>
  )
}