import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react"
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

type EstadoPermissoes = {
  permissoes: PermissoesJson
  loading: boolean
  erro: string | null
}

type StorePermissoes = {
  usuarioId: string
  tenantId: string
  estado: EstadoPermissoes
  ouvintes: Set<() => void>
  requisicao: Promise<void> | null
  ultimaConsultaEm: number
  ultimaTentativaEm: number
  iniciarEventos: (() => void) | null
}

const ESCOPOS_VALIDOS = new Set<EscopoPermissao>([
  "none", "own", "team", "assigned", "tenant", "all",
])

// Cada usuário/corretora tem um único estado e uma única requisição.
// Diferentes componentes podem usar o hook sem repetir o SELECT.
const stores = new Map<string, StorePermissoes>()

const ESTADO_SEM_SESSAO: EstadoPermissoes = Object.freeze({
  permissoes: {},
  loading: false,
  erro: null,
})

const ESTADO_AGUARDANDO_PERFIL: EstadoPermissoes = Object.freeze({
  permissoes: {},
  loading: true,
  erro: null,
})

const INTERVALO_MINIMO_FOCO_MS = 2000
const VALIDADE_CACHE_MONTAGEM_MS = 30000

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

function obterStore(usuarioId: string, tenantId: string): StorePermissoes {
  const chave = `${usuarioId}:${tenantId}`
  const existente = stores.get(chave)
  if (existente) return existente

  const novo: StorePermissoes = {
    usuarioId,
    tenantId,
    estado: { permissoes: {}, loading: true, erro: null },
    ouvintes: new Set(),
    requisicao: null,
    ultimaConsultaEm: 0,
    ultimaTentativaEm: 0,
    iniciarEventos: null,
  }

  stores.set(chave, novo)
  return novo
}

function publicar(store: StorePermissoes, proximo: EstadoPermissoes) {
  const anterior = store.estado
  if (
    anterior.permissoes === proximo.permissoes &&
    anterior.loading === proximo.loading &&
    anterior.erro === proximo.erro
  ) return

  store.estado = proximo
  store.ouvintes.forEach(notificar => notificar())
}

function converterPermissoes(valor: unknown): PermissoesJson {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as PermissoesJson)
    : {}
}

function mesmasPermissoes(a: PermissoesJson, b: PermissoesJson): boolean {
  // O JSONB retorna valores serializáveis e, normalmente, chaves estáveis.
  // Se nada mudou, preservamos a mesma referência usada pelos componentes.
  return JSON.stringify(a) === JSON.stringify(b)
}

async function consultarPermissoes(
  store: StorePermissoes,
  mostrarLoading: boolean,
): Promise<void> {
  // Uma só consulta pendente, mesmo que vários componentes peçam atualização.
  if (store.requisicao) return store.requisicao

  store.ultimaTentativaEm = Date.now()

  if (mostrarLoading && store.ultimaConsultaEm === 0) {
    publicar(store, { ...store.estado, loading: true, erro: null })
  }

  const requisicao = (async () => {
    try {
      const { data, error } = await supabase
        .from("crm_usuario_permissoes")
        .select("permissoes")
        .eq("usuario_id", store.usuarioId)
        .eq("corretora_id", store.tenantId)
        .maybeSingle()

      if (error) throw error

      const recebidas = converterPermissoes(data?.permissoes)
      const atuais = store.estado.permissoes
      const permissoes = mesmasPermissoes(atuais, recebidas)
        ? atuais
        : recebidas

      store.ultimaConsultaEm = Date.now()
      publicar(store, { permissoes, loading: false, erro: null })
    } catch (error) {
      console.error("Erro ao carregar permissões do usuário:", error)

      // Na primeira carga, continua sem permissões (fail closed).
      // Em atualizações posteriores, mantém a última configuração visível;
      // as políticas RLS continuam sendo a autorização efetiva no servidor.
      publicar(store, {
        permissoes: store.estado.permissoes,
        loading: false,
        erro: error instanceof Error
          ? error.message
          : "Não foi possível carregar as permissões.",
      })
    }
  })()

  store.requisicao = requisicao
  try {
    await requisicao
  } finally {
    if (store.requisicao === requisicao) store.requisicao = null
  }
}

function solicitarAtualizacaoPorFoco(store: StorePermissoes) {
  const agora = Date.now()
  if (agora - store.ultimaTentativaEm < INTERVALO_MINIMO_FOCO_MS) return
  void consultarPermissoes(store, false)
}

function assinarStore(store: StorePermissoes, notificar: () => void) {
  store.ouvintes.add(notificar)

  if (store.ouvintes.size === 1) {
    const aoFocar = () => solicitarAtualizacaoPorFoco(store)
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") {
        solicitarAtualizacaoPorFoco(store)
      }
    }

    window.addEventListener("focus", aoFocar)
    document.addEventListener("visibilitychange", aoMudarVisibilidade)

    store.iniciarEventos = () => {
      window.removeEventListener("focus", aoFocar)
      document.removeEventListener("visibilitychange", aoMudarVisibilidade)
    }
  }

  return () => {
    store.ouvintes.delete(notificar)
    if (store.ouvintes.size === 0) {
      store.iniciarEventos?.()
      store.iniciarEventos = null
    }
  }
}

export function usePermissoes() {
  const { user, userProfile } = useAuth()
  const usuarioId: string | null = user?.id ?? null
  const perfilDisponivel = Boolean(userProfile)
  const tipoUsuario = userProfile?.tipo_usuario
  const acessoEstruturalTotal =
    tipoUsuario === "CORRETORA" || tipoUsuario === "ADMIN"

  const tenantId: string | null =
    userProfile?.corretora_id ||
    (tipoUsuario === "CORRETORA"
      ? (userProfile?.id ?? usuarioId)
      : null)

  const store = useMemo(() => {
    if (!usuarioId || !userProfile || acessoEstruturalTotal || !tenantId) {
      return null
    }
    return obterStore(usuarioId, tenantId)
  }, [usuarioId, perfilDisponivel, acessoEstruturalTotal, tenantId])

  const subscribe = useCallback(
    (notificar: () => void) =>
      store ? assinarStore(store, notificar) : () => {},
    [store],
  )

  const getSnapshot = useCallback((): EstadoPermissoes => {
    if (store) return store.estado
    if (usuarioId && !userProfile) return ESTADO_AGUARDANDO_PERFIL
    return ESTADO_SEM_SESSAO
  }, [store, usuarioId, perfilDisponivel])

  const estado = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!store) return
    const agora = Date.now()
    if (
      !store.ultimaConsultaEm ||
      agora - store.ultimaConsultaEm >= VALIDADE_CACHE_MONTAGEM_MS
    ) {
      void consultarPermissoes(store, store.ultimaConsultaEm === 0)
    }
  }, [store])

  const refresh = useCallback(async (): Promise<void> => {
    if (store) await consultarPermissoes(store, false)
  }, [store])

  const escopo = useCallback((recurso: string, acao: string): EscopoPermissao => {
    if (acessoEstruturalTotal) {
      if (recurso === "atendimento.agenda" && acao === "google") return "own"
      return "tenant"
    }

    const valor = lerCaminho(estado.permissoes, `${recurso}.${acao}`)
    return typeof valor === "string" && ESCOPOS_VALIDOS.has(valor as EscopoPermissao)
      ? (valor as EscopoPermissao)
      : "none"
  }, [estado.permissoes, acessoEstruturalTotal])

  const possui = useCallback(
    (recurso: string, acao: string) => escopo(recurso, acao) !== "none",
    [escopo],
  )

  return {
    permissoes: estado.permissoes,
    loading: estado.loading,
    erro: !tenantId && usuarioId && userProfile && !acessoEstruturalTotal
      ? "Corretora não identificada."
      : estado.erro,
    tenantId,
    escopo,
    possui,
    refresh,
  }
}
