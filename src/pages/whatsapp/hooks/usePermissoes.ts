import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "../../../auth/AuthContext"
import { supabase } from "../../../lib/supabaseClient"

export type EscopoPermissao =
  | "none"
  | "own"
  | "team"
  | "assigned"
  | "tenant"
  | "all"

type PermissoesJson = Record<string, unknown>

const ESCOPOS_VALIDOS = new Set<EscopoPermissao>([
  "none", "own", "team", "assigned", "tenant", "all",
])

function lerCaminho(origem: unknown, caminho: string): unknown {
  if (!origem || typeof origem !== "object") return undefined

  return caminho
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((valor, chave) => {
      if (!valor || typeof valor !== "object") return undefined
      return (valor as Record<string, unknown>)[chave]
    }, origem)
}

export function usePermissoes() {
  const { user, userProfile } = useAuth()
  const [permissoes, setPermissoes] = useState<PermissoesJson>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const ultimaRequisicao = useRef(0)

  const tipoUsuario = userProfile?.tipo_usuario
  const acessoEstruturalTotal = tipoUsuario === "CORRETORA" || tipoUsuario === "ADMIN"

  const tenantId = useMemo(() => {
    if (!userProfile) return null
    if (userProfile.corretora_id) return userProfile.corretora_id
    if (tipoUsuario === "CORRETORA") return userProfile.id ?? user?.id ?? null
    return null
  }, [userProfile, tipoUsuario, user?.id])

  const carregar = useCallback(async () => {
    const requisicao = ++ultimaRequisicao.current

    if (!user?.id) {
      setPermissoes({})
      setErro(null)
      setLoading(false)
      return
    }

    if (!userProfile) {
      setPermissoes({})
      setErro(null)
      setLoading(true)
      return
    }

    // Mantém o comportamento existente dos módulos que concedem acesso
    // estrutural à CORRETORA / ADMIN. Gestão será tratada separadamente
    // durante a homologação integral desses perfis.
    if (acessoEstruturalTotal) {
      setPermissoes({})
      setErro(null)
      setLoading(false)
      return
    }

    if (!tenantId) {
      setPermissoes({})
      setErro("Corretora não identificada.")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErro(null)

      const { data, error } = await supabase
        .from("crm_usuario_permissoes")
        .select("permissoes")
        .eq("usuario_id", user.id)
        .eq("corretora_id", tenantId)
        .maybeSingle()

      if (error) throw error
      if (requisicao !== ultimaRequisicao.current) return

      const json = data?.permissoes && typeof data.permissoes === "object" && !Array.isArray(data.permissoes)
        ? (data.permissoes as PermissoesJson)
        : {}

      setPermissoes(json)
    } catch (error) {
      if (requisicao !== ultimaRequisicao.current) return
      console.error("Erro ao carregar permissões do usuário:", error)
      setPermissoes({})
      setErro(error instanceof Error ? error.message : "Não foi possível carregar as permissões.")
    } finally {
      if (requisicao === ultimaRequisicao.current) setLoading(false)
    }
  }, [user?.id, userProfile, acessoEstruturalTotal, tenantId])

  useEffect(() => {
    void carregar()
    return () => { ultimaRequisicao.current += 1 }
  }, [carregar])

  // Uma permissão alterada em outra sessão/aba deve ser refletida ao
  // retornar ao sistema, sem exigir logout ou recarga manual da página.
  useEffect(() => {
    const aoFocar = () => { void carregar() }
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") void carregar()
    }

    window.addEventListener("focus", aoFocar)
    document.addEventListener("visibilitychange", aoMudarVisibilidade)

    return () => {
      window.removeEventListener("focus", aoFocar)
      document.removeEventListener("visibilitychange", aoMudarVisibilidade)
    }
  }, [carregar])

  const escopo = useCallback((recurso: string, acao: string): EscopoPermissao => {
    if (acessoEstruturalTotal) {
      if (recurso === "atendimento.agenda" && acao === "google") return "own"
      return "tenant"
    }

    const valor = lerCaminho(permissoes, `${recurso}.${acao}`)
    return typeof valor === "string" && ESCOPOS_VALIDOS.has(valor as EscopoPermissao)
      ? (valor as EscopoPermissao)
      : "none"
  }, [permissoes, acessoEstruturalTotal])

  const possui = useCallback(
    (recurso: string, acao: string) => escopo(recurso, acao) !== "none",
    [escopo],
  )

  return { permissoes, loading, erro, tenantId, escopo, possui, refresh: carregar }
}
