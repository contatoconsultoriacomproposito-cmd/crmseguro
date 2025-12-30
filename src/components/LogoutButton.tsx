import type { ReactNode } from "react"
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from "react-router-dom"

type Props = {
  children: ReactNode
}

export default function LogoutButton({ children }: Props) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left"
    >
      {children}
    </button>
  )
}
