import { Outlet } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import { useState } from "react"

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-zinc-900 dark:text-zinc-100">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 h-full overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  )
}
