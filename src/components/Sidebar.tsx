import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react"
import {
  Bot,
  Building2,
  Cable,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  HandCoins,
  HardDrive,
  Headphones,
  LogOut,
  Menu,
  MessagesSquare,
  Settings,
  ShieldCheck,
  User,
  UserRoundCog,
  Users,
  X,
} from "lucide-react"
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom"

import { useAuth } from "../auth/AuthContext"
import { supabase } from "../lib/supabaseClient"
import LogoutButton from "./LogoutButton"

type Props = {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
}

type NavItemProps = {
  to: string
  icon: ReactNode
  label: string
  collapsed: boolean
  end?: boolean
  onNavigate?: () => void
  iconClassName?: string
}

export default function Sidebar({
  collapsed,
  setCollapsed,
}: Props) {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileOpen, setMobileOpen] =
    useState(false)

  const [
    corretoraLogo,
    setCorretoraLogo,
  ] = useState<string | null>(null)

  const corretoraId =
    userProfile?.tipo_usuario === "CORRETORA"
      ? user?.id || null
      : userProfile?.corretora_id || null

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    async function carregarLogo() {
      if (!corretoraId) {
        setCorretoraLogo(null)
        return
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("crm_corretoras")
          .select("logotipo_url")
          .eq("id", corretoraId)
          .maybeSingle()

        if (error) {
          throw error
        }

        setCorretoraLogo(
          data?.logotipo_url?.trim() ||
            null
        )
      } catch (error) {
        console.error(
          "Erro ao carregar logo da corretora:",
          error
        )

        setCorretoraLogo(null)
      }
    }

    void carregarLogo()

    const handleLogoUpdate = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<string>

      if (customEvent.detail) {
        setCorretoraLogo(
          customEvent.detail.trim()
        )
      }
    }

    window.addEventListener(
      "logoUpdated",
      handleLogoUpdate
    )

    return () => {
      window.removeEventListener(
        "logoUpdated",
        handleLogoUpdate
      )
    }
  }, [corretoraId])

  const renderNavigation = (
    isMobile = false
  ) => {
    const isCollapsed =
      isMobile ? false : collapsed

    const handleNavigate = () => {
      if (isMobile) {
        setMobileOpen(false)
      }
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-5 custom-scrollbar">
        {/* =================================================
            ESTRUTURA
        ================================================= */}

        <NavSection
          title="Estrutura"
          collapsed={isCollapsed}
        >
          <SidebarItem
            to="/whatsapp/equipe"
            icon={<UserRoundCog size={18} />}
            label="Equipe"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          />

          <SidebarItem
            to="/whatsapp/conexoes"
            icon={<Cable size={18} />}
            label="Conexões WhatsApp"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />

          <SidebarItem
            to="/whatsapp/contatos"
            icon={<Users size={18} />}
            label="Contatos"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
          />
        </NavSection>

        {/* =================================================
            ATENDIMENTO
        ================================================= */}

        <NavSection
          title="Atendimento"
          collapsed={isCollapsed}
        >
          <SidebarItem
            to="/whatsapp"
            icon={<MessagesSquare size={18} />}
            label="Conversas"
            collapsed={isCollapsed}
            end
            onNavigate={handleNavigate}
            iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />

          <SidebarItem
            to="/whatsapp/agenda"
            icon={<Calendar size={18} />}
            label="Agenda"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          />

          <SidebarItem
            to="/whatsapp/automacoes"
            icon={<Bot size={18} />}
            label="Automações"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400"
          />
        </NavSection>

        {/* =================================================
            OPERAÇÃO
        ================================================= */}

        <NavSection
          title="Operação"
          collapsed={isCollapsed}
        >
          <SidebarItem
            to="/whatsapp/clientes"
            icon={<Users size={18} />}
            label="Clientes"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
          />

          <SidebarItem
            to="/whatsapp/propostas"
            icon={<FileText size={18} />}
            label="Propostas"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          />

          <SidebarItem
            to="/whatsapp/financeiro"
            icon={<DollarSign size={18} />}
            label="Financeiro"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />

          <SidebarItem
            to="/whatsapp/comissoes"
            icon={<HandCoins size={18} />}
            label="Comissões"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400"
          />

          <SidebarItem
            to="/whatsapp/sinistro"
            icon={<ShieldCheck size={18} />}
            label="Sinistros"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
          />

          <SidebarItem
            to="/whatsapp/assistencia"
            icon={<Headphones size={18} />}
            label="Assistências"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
          />
        </NavSection>

        {/* =================================================
            GESTÃO
        ================================================= */}

        <NavSection
          title="Gestão"
          collapsed={isCollapsed}
        >
          <SidebarItem
            to="/whatsapp/armazenamento"
            icon={<HardDrive size={18} />}
            label="Armazenamento"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
          />

          <SidebarItem
            to="/whatsapp/seguradoras"
            icon={<Building2 size={18} />}
            label="Seguradoras"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          />

          <SidebarItem
            to="/whatsapp/configuracao/perfil"
            icon={<Settings size={18} />}
            label="Configurações"
            collapsed={isCollapsed}
            onNavigate={handleNavigate}
            iconClassName="bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
          />
        </NavSection>
      </div>
    )
  }

  const renderUserProfile = (
    isMobile = false
  ) => {
    const isCollapsed =
      isMobile ? false : collapsed

    if (isCollapsed) {
      return (
        <div className="border-t border-slate-200 px-3 py-4 dark:border-zinc-800">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              title="Configurações"
              onClick={() =>
                navigate(
                  "/whatsapp/configuracao/perfil"
                )
              }
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
            >
              {corretoraLogo ? (
                <img
                  src={corretoraLogo}
                  alt="Logo"
                  className="h-full w-full object-contain p-1"
                  onError={() =>
                    setCorretoraLogo(null)
                  }
                />
              ) : (
                <User
                  size={18}
                  className="text-blue-600"
                />
              )}
            </button>

            <LogoutButton>
              <div
                title="Sair"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-red-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <LogOut size={18} />
              </div>
            </LogoutButton>
          </div>
        </div>
      )
    }

    return (
      <div className="border-t border-slate-200 p-3 dark:border-zinc-800">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigate(
                  "/whatsapp/configuracao/perfil"
                )

                if (isMobile) {
                  setMobileOpen(false)
                }
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {corretoraLogo ? (
                <img
                  src={corretoraLogo}
                  alt="Logo da corretora"
                  className="h-full w-full object-contain p-1"
                  onError={() =>
                    setCorretoraLogo(null)
                  }
                />
              ) : (
                <User
                  size={18}
                  className="text-blue-600"
                />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {userProfile?.nome_completo ||
                  user?.email?.split("@")[0] ||
                  "Usuário"}
              </p>

              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {userProfile?.tipo_usuario ||
                  "SeguroCRM"}
              </p>
            </div>

            <button
              type="button"
              title="Configurações"
              onClick={() => {
                navigate(
                  "/whatsapp/configuracao/perfil"
                )

                if (isMobile) {
                  setMobileOpen(false)
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white hover:text-blue-600 hover:shadow-sm dark:hover:bg-zinc-800"
            >
              <Settings size={15} />
            </button>
          </div>

          <div className="my-3 h-px bg-slate-200/70 dark:bg-zinc-800" />

          <LogoutButton>
            <div className="group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-xs font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
              <LogOut size={15} />
              <span>Sair da conta</span>
            </div>
          </LogoutButton>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ===================================================
          HEADER MOBILE
      =================================================== */}

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur-xl md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setMobileOpen(prev => !prev)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            aria-label="Abrir menu"
          >
            {mobileOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <BrandIcon />

            <div>
              <p className="text-sm font-black leading-none tracking-tight text-slate-900 dark:text-white">
                SeguroCRM
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Gestão de Seguros
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/whatsapp/configuracao/perfil"
            )
          }
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {corretoraLogo ? (
            <img
              src={corretoraLogo}
              alt="Logo"
              className="h-full w-full object-contain p-1"
              onError={() =>
                setCorretoraLogo(null)
              }
            />
          ) : (
            <User
              size={16}
              className="text-blue-600"
            />
          )}
        </button>
      </header>

      {/* ===================================================
          BACKDROP MOBILE
      =================================================== */}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      {/* ===================================================
          DRAWER MOBILE
      =================================================== */}

      <aside
        className={`
          fixed bottom-0 left-0 top-0 z-50 flex w-[286px] flex-col
          border-r border-slate-200 bg-white
          shadow-2xl transition-transform duration-300 ease-out
          md:hidden
          dark:border-zinc-800 dark:bg-zinc-950
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <BrandIcon />

            <div>
              <p className="font-black leading-none tracking-tight text-slate-900 dark:text-white">
                SeguroCRM
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Gestão de Seguros
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(false)
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        {renderNavigation(true)}
        {renderUserProfile(true)}
      </aside>

      {/* ===================================================
          SIDEBAR DESKTOP
      =================================================== */}

      <aside
        className={`
          hidden h-screen shrink-0 flex-col
          border-r border-slate-200 bg-white
          transition-[width] duration-300 ease-out
          md:flex
          dark:border-zinc-800 dark:bg-zinc-950
          ${
            collapsed
              ? "w-[76px]"
              : "w-[268px]"
          }
        `}
      >
        {/* BRAND */}

        <div
          className={`
            flex h-[72px] shrink-0 items-center
            border-b border-slate-100
            dark:border-zinc-800
            ${
              collapsed
                ? "justify-center px-2"
                : "justify-between px-4"
            }
          `}
        >
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <BrandIcon />

              <div className="min-w-0">
                <p className="truncate font-black leading-none tracking-tight text-slate-900 dark:text-white">
                  SeguroCRM
                </p>

                <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Gestão de Seguros
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              setCollapsed(prev => !prev)
            }
            title={
              collapsed
                ? "Expandir menu"
                : "Recolher menu"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* NAVEGAÇÃO */}

        {renderNavigation(false)}

        {/* PERFIL */}

        {renderUserProfile(false)}
      </aside>
    </>
  )
}

function BrandIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
      <ShieldCheck size={21} />
    </div>
  )
}

function NavSection({
  title,
  collapsed,
  children,
}: {
  title: string
  collapsed: boolean
  children: ReactNode
}) {
  return (
    <div className="pt-5">
      {!collapsed ? (
        <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600">
          {title}
        </p>
      ) : (
        <div className="mx-auto mb-2 h-px w-7 bg-slate-200 dark:bg-zinc-800" />
      )}

      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

function SidebarItem({
  to,
  icon,
  label,
  collapsed,
  end = false,
  onNavigate,
  iconClassName = "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300",
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={
        collapsed
          ? label
          : undefined
      }
      onClick={onNavigate}
      className={({ isActive }) =>
        `
          group relative flex h-11 items-center rounded-xl
          transition-all duration-200
          ${
            collapsed
              ? "justify-center px-0"
              : "gap-3 px-2"
          }
          ${
            isActive
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          }
        `
      }
    >
      {({ isActive }) => (
        <>
          {collapsed &&
            isActive && (
              <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-blue-600" />
            )}

          <span
            className={`
              flex h-8 w-8 shrink-0 items-center justify-center
              rounded-lg
              transition-all duration-200
              group-hover:scale-105
              ${
                isActive
                  ? "bg-white/15 text-white"
                  : iconClassName
              }
            `}
          >
            {icon}
          </span>

          {!collapsed && (
            <span
              className={`
                truncate text-[13px] font-bold
                ${
                  isActive
                    ? "text-white"
                    : ""
                }
              `}
            >
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}