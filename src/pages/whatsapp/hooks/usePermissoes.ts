import { useCallback, useEffect, useMemo, useState } from "react"
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
  "none",
  "own",
  "team",
  "assigned",
  "tenant",
  "all",
])

function lerCaminho(
  origem: unknown,
  caminho: string,
): unknown {
  if (!origem || typeof origem !== "object") {
    return undefined
  }

  return caminho
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((valor, chave) => {
      if (!valor || typeof valor !== "object") {
        return undefined
      }

      return (valor as Record<string, unknown>)[chave]
    }, origem)
}

export function usePermissoes() {
  const { user, userProfile } = useAuth()

  const [permissoes, setPermissoes] =
    useState<PermissoesJson>({})

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const tipoUsuario = userProfile?.tipo_usuario

  const acessoEstruturalTotal =
    tipoUsuario === "CORRETORA" ||
    tipoUsuario === "ADMIN"

  const tenantId = useMemo(() => {
    if (!userProfile) return null

    if (userProfile.corretora_id) {
      return userProfile.corretora_id
    }

    if (tipoUsuario === "CORRETORA") {
      return userProfile.id ?? user?.id ?? null
    }

    return null
  }, [userProfile, tipoUsuario, user?.id])

  const carregar = useCallback(async () => {
    if (!user?.id || !userProfile) {
      setPermissoes({})
      setErro(null)
      setLoading(false)
      return
    }

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

      if (error) {
        throw error
      }

      const json =
        data?.permissoes &&
        typeof data.permissoes === "object"
          ? (data.permissoes as PermissoesJson)
          : {}

      setPermissoes(json)
    } catch (error) {
      console.error(
        "Erro ao carregar permissões do usuário:",
        error,
      )

      setPermissoes({})
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as permissões.",
      )
    } finally {
      setLoading(false)
    }
  }, [
    user?.id,
    userProfile,
    acessoEstruturalTotal,
    tenantId,
  ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const escopo = useCallback(
    (
      recurso: string,
      acao: string,
    ): EscopoPermissao => {
      /*
       * CORRETORA / ADMIN possuem acesso estrutural total
       * dentro do tenant, mas Google Calendar é sempre
       * pessoal. Nunca devolvemos tenant para agenda.google.
       */
      if (acessoEstruturalTotal) {
        if (
          recurso === "atendimento.agenda" &&
          acao === "google"
        ) {
          return "own"
        }

        return "tenant"
      }

      const valor = lerCaminho(
        permissoes,
        `${recurso}.${acao}`,
      )

      return typeof valor === "string" &&
        ESCOPOS_VALIDOS.has(valor as EscopoPermissao)
        ? (valor as EscopoPermissao)
        : "none"
    },
    [permissoes, acessoEstruturalTotal],
  )

  const possui = useCallback(
    (recurso: string, acao: string) =>
      escopo(recurso, acao) !== "none",
    [escopo],
  )

  return {
    permissoes,
    loading,
    erro,
    tenantId,
    escopo,
    possui,
    refresh: carregar,
  }
}
