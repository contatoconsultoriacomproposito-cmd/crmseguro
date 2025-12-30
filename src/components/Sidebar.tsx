import { useState, type Dispatch, type SetStateAction } from "react"
import {
  LayoutDashboard,
  UserPlus,
  List,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Building2,
  ShieldCheck,
  Columns,
  MessageCircle,
  History,
  FileText,
  FilePlus,
  DollarSign,
  AlertCircle,
  Bell
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useNotifications } from "../contexts/NotificationContext"
import { useAuth } from "../auth/AuthContext"
import LogoutButton from "./LogoutButton"

type Props = {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
}

export default function Sidebar({ collapsed, setCollapsed }: Props) {
  const { user } = useAuth()
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    corretores: false,
    clientes: false,
    propostas: false,
    kanban: false,
    sinistros: false, 
    comissoes: false,
    seguradoras: false,
  })

  const toggleMenu = (menu: string) => {
    if (collapsed) {
      setCollapsed(false)
    }
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }))
  }

  return (
    <aside
      className={`
        h-screen flex flex-col
        transition-all duration-300
        ${collapsed ? "w-20" : "w-64"}
        bg-surface-light dark:bg-[#171717]
        border-r border-zinc-200 dark:border-zinc-800
        flex-shrink-0
      `}
    >
      {/* ================= TOP: LOGO E BOTÃO COLLAPSE ================= */}
      <div className="flex items-center justify-between p-4 mb-2">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-primary-light dark:text-primary-dark">
            CRM Seguro
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* ================= USER INFO E LOGOUT ================= */}
      <div className="px-4 mb-6">
        <div className={`
          p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800
          ${collapsed ? "flex flex-col items-center gap-4" : ""}
        `}>
          {!collapsed ? (
            <>
              <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Usuário Logado</p>
              <p className="text-xs font-medium truncate opacity-80 mb-3">{user?.email}</p>
              
              <LogoutButton>
                <div className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors cursor-pointer group">
                  <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20">
                    <LogOut size={14} />
                  </div>
                  <span className="text-xs font-bold">Sair da conta</span>
                </div>
              </LogoutButton>
            </>
          ) : (
            <LogoutButton>
              <div className="text-red-500 hover:scale-110 transition-transform cursor-pointer">
                <LogOut size={20} />
              </div>
            </LogoutButton>
          )}
        </div>
      </div>

      {/* ================= MIDDLE: MENU (SCROLLABLE) ================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <nav className="px-3 space-y-1 flex-1 pb-10">
          
          {/* NOTIFICAÇÕES (SINO) */}
          <div className="mb-2">
            <NotificationBell collapsed={collapsed} />
          </div>

          <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" collapsed={collapsed} />

          {/* GRUPO CORRETORES */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<Users size={20} className="text-purple-500" />} 
              label="Corretores" 
              isOpen={openMenus.corretores} 
              onClick={() => toggleMenu("corretores")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.corretores && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/corretores/cadastro" label="Cadastro" icon={<UserPlus size={16} />} />
                <SubNavItem to="/corretores/lista" label="Ver Listagem" icon={<List size={16} />} />
              </div>
            )}
          </div>

          {/* GRUPO CLIENTES */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<Users size={20} className="text-blue-500" />} 
              label="Clientes" 
              isOpen={openMenus.clientes} 
              onClick={() => toggleMenu("clientes")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.clientes && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/clientes/cadastro" label="Novo Cadastro" icon={<UserPlus size={16} />} />
                <SubNavItem to="/clientes/lista" label="Ver Listagem" icon={<List size={16} />} />
              </div>
            )}
          </div>

          {/* GRUPO PROPOSTAS */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<FileText size={20} className="text-emerald-500" />} 
              label="Propostas" 
              isOpen={openMenus.propostas} 
              onClick={() => toggleMenu("propostas")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.propostas && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/propostas/criar" label="Criar Proposta" icon={<FilePlus size={16} />} />
                <SubNavItem to="/propostas/lista" label="Ver Propostas" icon={<List size={16} />} />
                <SubNavItem to="/propostas/produtos" label="Ver Produtos" icon={<List size={16} />} />
              </div>
            )}
          </div>

          {/* GRUPO KANBAN */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<Columns size={20} className="text-orange-500" />} 
              label="Fluxos Kanban" 
              isOpen={openMenus.kanban} 
              onClick={() => toggleMenu("kanban")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.kanban && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/kanban/atendimento" label="Atendimentos" icon={<MessageCircle size={16} />} />
                <SubNavItem to="/kanban/venda" label="Vendas / Clientes" icon={<ShieldCheck size={16} />} />
                <SubNavItem to="/kanban/perda" label="Perdas / Recuperação" icon={<History size={16} />} />
              </div>
            )}
          </div>

          {/* GRUPO SINISTROS */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<AlertCircle size={20} className="text-red-500" />} 
              label="Sinistros" 
              isOpen={openMenus.sinistros} 
              onClick={() => toggleMenu("sinistros")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.sinistros && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/sinistros/lista" label="Ver Lista Geral" icon={<List size={16} />} />
              </div>
            )}
          </div>

          {/* GRUPO COMISSÕES */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<DollarSign size={20} className="text-emerald-500" />} 
              label="Comissões" 
              isOpen={openMenus.comissoes} 
              onClick={() => toggleMenu("comissoes")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.comissoes && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/comissoes/lista" label="Ver Lista Geral" icon={<List size={16} />} />
              </div>
            )}
          </div>

          {/* GRUPO SEGURADORAS */}
          <div className="space-y-1">
            <MenuHeader 
              icon={<Building2 size={20} className="text-indigo-500" />} 
              label="Seguradoras" 
              isOpen={openMenus.seguradoras} 
              onClick={() => toggleMenu("seguradoras")}
              collapsed={collapsed}
            />
            {!collapsed && openMenus.seguradoras && (
              <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                <SubNavItem to="/seguradoras" label="Gerenciar Tudo" icon={<ShieldCheck size={16} />} />
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  )
}

// ================= COMPONENTES AUXILIARES =================

function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const { notificacoes, refresh, abrirNotificacao } = useNotifications()
  const [open, setOpen] = useState(false)
  const count = notificacoes.length

  // Função para lidar com o clique na notificação
  const handleAction = (n: any) => {
    abrirNotificacao(n);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button 
        id="btn-notificacoes"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`
          w-full flex items-center p-3 rounded-xl transition-all
          ${open ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/10 ring-1 ring-blue-100' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
          ${collapsed ? "justify-center" : "gap-3"}
        `}
      >
        <div className="relative">
          <Bell size={20} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-white dark:border-[#171717]">
              {count}
            </span>
          )}
        </div>
        {!collapsed && <span className="text-sm font-bold">Notificações</span>}
      </button>

      {open && (
        <>
          {/* Overlay invisível para fechar ao clicar fora */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          
          {/* Menu com posicionamento FIXED para ignorar o overflow da sidebar */}
          <div 
            className={`
              fixed z-[70] w-80 bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200
            `}
            style={{
              // Calcula a posição exata ao lado ou abaixo do botão
              top: '80px', 
              left: collapsed ? '75px' : '250px' 
            }}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pendências</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); refresh(); }} 
                className="text-[10px] font-bold text-blue-500 hover:underline"
              >
                Atualizar
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {notificacoes.length === 0 ? (
                <p className="text-center py-8 text-zinc-400 text-xs font-medium">Tudo em dia! 🚀</p>
              ) : (
                notificacoes.map((n) => (
                  <div 
                    key={n.id}
                    className="p-3 rounded-xl border border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center gap-3 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all cursor-pointer group"
                    onClick={() => handleAction(n)}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0
                      ${n.tipo === 'COMERCIAL' 
                        ? (n.atrasado ? 'bg-red-600 text-white' : 'bg-emerald-700 text-white')
                        : (n.atrasado ? 'bg-purple-800 text-white' : 'bg-yellow-400 text-black')
                      }
                    `}>
                      {n.tipo === 'COMERCIAL' ? 'C' : 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate dark:text-zinc-200 group-hover:text-blue-600 transition-colors">
                        {n.titulo}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {n.atrasado ? 'Atraso: ' : 'Hoje: '}
                        {n.data}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MenuHeader({ icon, label, isOpen, onClick, collapsed }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200
        text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 group
        ${collapsed ? "justify-center" : ""}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        {!collapsed && <span className="text-sm font-bold">{label}</span>}
      </div>
      {!collapsed && (
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
        />
      )}
    </button>
  )
}

function NavItem({ to, icon, label, collapsed }: any) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 p-3 rounded-xl transition-all duration-200
        ${collapsed ? "justify-center" : ""}
        ${isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold"
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`
      }
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-sm">{label}</span>}
    </NavLink>
  )
}

function SubNavItem({ to, label, icon }: any) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 py-2 px-4 transition-all duration-200
        ${isActive
          ? "text-blue-600 dark:text-blue-400 font-bold"
          : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`
      }
    >
      <span className="opacity-70">{icon}</span>
      <span className="text-xs">{label}</span>
    </NavLink>
  )
}