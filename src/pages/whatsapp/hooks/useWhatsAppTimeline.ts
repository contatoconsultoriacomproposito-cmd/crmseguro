import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  buscarTimelineWhatsApp,
  resolverUrlsMidias,
  type WhatsAppTimelineCursor,
  type WhatsAppTimelineItem,
} from '../services/whatsappTimelineService'

import { supabase } from '../../../lib/supabaseClient'

const PAGE_SIZE = 20

/**
 * A Edge b2-media agora entrega URLs de leitura com 12 horas.
 * Mantemos o cache do front por 11 horas para trabalhar com
 * uma margem de segurança de 1 hora antes da expiração.
 */
const TIMELINE_CACHE_TTL_MS =
  11 * 60 * 60 * 1000

interface TimelineCacheEntry {
  items: WhatsAppTimelineItem[]
  hasMore: boolean
  cursor: WhatsAppTimelineCursor | null
  expiresAt: number
}

/**
 * Cache em memória por conversa.
 *
 * Ele permanece vivo enquanto a aplicação SPA estiver aberta.
 * Portanto:
 *
 * conversa A -> conversa B -> conversa A
 *
 * reutiliza imediatamente os itens já carregados, inclusive
 * as signed URLs das mídias.
 *
 * Um F5 reinicia naturalmente este cache.
 */
const timelineCache =
  new Map<string, TimelineCacheEntry>()

function ordenarTimeline(
  items: WhatsAppTimelineItem[]
): WhatsAppTimelineItem[] {
  return [...items].sort((a, b) => {
    const diferenca =
      new Date(a.evento_em).getTime() -
      new Date(b.evento_em).getTime()

    if (diferenca !== 0) {
      return diferenca
    }

    return a.cursor_chave.localeCompare(
      b.cursor_chave
    )
  })
}

function deduplicarTimeline(
  items: WhatsAppTimelineItem[]
): WhatsAppTimelineItem[] {
  const mapa =
    new Map<string, WhatsAppTimelineItem>()

  for (const item of items) {
    mapa.set(
      item.cursor_chave,
      item
    )
  }

  return [...mapa.values()]
}

function normalizarTimeline(
  items: WhatsAppTimelineItem[]
): WhatsAppTimelineItem[] {
  return ordenarTimeline(
    deduplicarTimeline(items)
  )
}

function obterCacheTimeline(
  conversationId: string
): TimelineCacheEntry | null {
  const cached =
    timelineCache.get(conversationId)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    timelineCache.delete(conversationId)
    return null
  }

  return cached
}

function salvarCacheTimeline(
  conversationId: string,
  items: WhatsAppTimelineItem[],
  hasMore: boolean,
  cursor: WhatsAppTimelineCursor | null
): void {
  timelineCache.set(
    conversationId,
    {
      items,
      hasMore,
      cursor,
      expiresAt:
        Date.now() +
        TIMELINE_CACHE_TTL_MS,
    }
  )
}

/**
 * Mescla dados recém-buscados com o estado atual,
 * preservando os campos já resolvidos em memória.
 *
 * Isso mantém as signed URLs das mídias que já foram
 * carregadas e evita voltar ao estado "Carregando..."
 * quando o banco envia novamente o mesmo item.
 */
function mesclarPreservandoAtual(
  current: WhatsAppTimelineItem[],
  incoming: WhatsAppTimelineItem[]
): WhatsAppTimelineItem[] {
  const atuaisPorChave =
    new Map(
      current.map(item => [
        item.cursor_chave,
        item,
      ])
    )

  const mesclados =
    incoming.map(itemNovo => {
      const itemAtual =
        atuaisPorChave.get(
          itemNovo.cursor_chave
        )

      if (!itemAtual) {
        return itemNovo
      }

      const dadosNovos =
        itemNovo.dados as any

      const dadosAtuais =
        itemAtual.dados as any

      return {
        ...itemAtual,
        ...itemNovo,

        dados: {
          ...dadosAtuais,
          ...dadosNovos,

          /*
           * O banco deve vencer para status,
           * provider_message_id, reactions etc.
           *
           * Preservamos apenas a mídia já
           * resolvida no frontend.
           */
          midia:
            dadosAtuais?.midia &&
            dadosNovos?.midia
              ? {
                  ...dadosNovos.midia,
                  ...dadosAtuais.midia,
                }
              : dadosNovos?.midia ??
                dadosAtuais?.midia,
        },
      }
    })

  return normalizarTimeline([
    ...current,
    ...mesclados,
  ])
}

/**
 * Quando resolverUrlsMidias() retorna, o item resolvido
 * precisa vencer o anterior, porque é ele que contém
 * a URL assinada atualizada.
 */
function mesclarResolvidos(
  current: WhatsAppTimelineItem[],
  resolved: WhatsAppTimelineItem[]
): WhatsAppTimelineItem[] {
  return normalizarTimeline([
    ...current,
    ...resolved,
  ])
}

export function useWhatsAppTimeline(
  conversationId?: string
) {
  const [items, setItems] =
    useState<WhatsAppTimelineItem[]>([])

  const [loading, setLoading] =
    useState(false)

  const [loadingOlder, setLoadingOlder] =
    useState(false)

  const [hasMore, setHasMore] =
    useState(false)

  const [error, setError] =
    useState<Error | null>(null)

  const cursorRef =
    useRef<WhatsAppTimelineCursor | null>(
      null
    )

  const requestSequenceRef =
    useRef(0)

  const realtimeRefreshRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)

  /**
   * Mantém o cache sincronizado com o estado atual.
   */
  const aplicarEstadoTimeline =
    useCallback(
      (
        nextItems: WhatsAppTimelineItem[],
        nextHasMore: boolean,
        nextCursor:
          WhatsAppTimelineCursor | null
      ) => {
        const normalized =
          normalizarTimeline(nextItems)

        setItems(normalized)
        setHasMore(nextHasMore)
        cursorRef.current = nextCursor

        if (conversationId) {
          salvarCacheTimeline(
            conversationId,
            normalized,
            nextHasMore,
            nextCursor
          )
        }
      },
      [conversationId]
    )

  const carregarInicial =
    useCallback(async () => {
      if (!conversationId) {
        requestSequenceRef.current += 1

        setItems([])
        setHasMore(false)
        setLoading(false)
        setLoadingOlder(false)
        setError(null)

        cursorRef.current = null

        return
      }

      const requestSequence =
        ++requestSequenceRef.current

      const cached =
        obterCacheTimeline(
          conversationId
        )

      /**
       * Se já conhecemos a conversa, restauramos
       * imediatamente a timeline resolvida.
       *
       * Isso evita o flash de "Carregando..."
       * quando o usuário volta para uma conversa
       * já visitada.
       */
      if (cached) {
        setItems(cached.items)
        setHasMore(cached.hasMore)
        cursorRef.current =
          cached.cursor
        setLoading(false)
      } else {
        setLoading(true)
      }

      setError(null)

      try {
        const pagina =
          await buscarTimelineWhatsApp(
            conversationId,
            null,
            PAGE_SIZE
          )

        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return
        }

        const atuais =
          cached?.items ?? []

        /**
         * Atualizamos textos/status/eventos sem
         * jogar fora os campos que já estão
         * resolvidos no cache.
         */
        const baseAtualizada =
          mesclarPreservandoAtual(
            atuais,
            pagina.items
          )

        aplicarEstadoTimeline(
          baseAtualizada,
          pagina.hasMore,
          pagina.nextCursor
        )

        /**
         * O histórico base já chegou.
         *
         * Não bloqueamos mais toda a conversa
         * enquanto as URLs das mídias são
         * resolvidas.
         */
        setLoading(false)

        /**
         * Primeira abertura:
         * resolve todas as mídias normalmente.
         *
         * Reabertura com cache:
         * resolve somente itens que ainda não
         * existiam na conversa cacheada.
         *
         * Assim, ao voltar para uma conversa,
         * as signed URLs antigas continuam sendo
         * reutilizadas em vez de serem recriadas.
         */
        const chavesCache =
          new Set(
            atuais.map(
              item =>
                item.cursor_chave
            )
          )

        const itensParaResolver =
          cached
            ? pagina.items.filter(
                item =>
                  !chavesCache.has(
                    item.cursor_chave
                  )
              )
            : pagina.items

        if (
          itensParaResolver.length === 0
        ) {
          return
        }

        const itemsComUrls =
          await resolverUrlsMidias(
            itensParaResolver
          )

        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return
        }

        setItems(current => {
          const merged =
            mesclarResolvidos(
              current,
              itemsComUrls
            )

          salvarCacheTimeline(
            conversationId,
            merged,
            pagina.hasMore,
            pagina.nextCursor
          )

          return merged
        })
      } catch (err) {
        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return
        }

        setError(
          err instanceof Error
            ? err
            : new Error(
                'Erro ao carregar timeline.'
              )
        )
      } finally {
        if (
          requestSequence ===
          requestSequenceRef.current
        ) {
          setLoading(false)
        }
      }
    }, [
      conversationId,
      aplicarEstadoTimeline,
    ])

  const carregarAnteriores =
    useCallback(async () => {
      if (
        !conversationId ||
        loading ||
        loadingOlder ||
        !hasMore ||
        !cursorRef.current
      ) {
        return
      }

      const cursor =
        cursorRef.current

      setLoadingOlder(true)
      setError(null)

      try {
        const pagina =
          await buscarTimelineWhatsApp(
            conversationId,
            cursor,
            PAGE_SIZE
          )

        /**
         * Primeiro mostra os registros rapidamente.
         */
        setItems(current => {
          const merged =
            mesclarPreservandoAtual(
              current,
              pagina.items
            )

          salvarCacheTimeline(
            conversationId,
            merged,
            pagina.hasMore,
            pagina.nextCursor
          )

          return merged
        })

        setHasMore(
          pagina.hasMore
        )

        cursorRef.current =
          pagina.nextCursor

        /**
         * Corrige um ponto do hook anterior:
         * páginas antigas também precisam resolver
         * suas mídias.
         */
        const itemsComUrls =
          await resolverUrlsMidias(
            pagina.items
          )

        setItems(current => {
          const merged =
            mesclarResolvidos(
              current,
              itemsComUrls
            )

          salvarCacheTimeline(
            conversationId,
            merged,
            pagina.hasMore,
            pagina.nextCursor
          )

          return merged
        })
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error(
                'Erro ao carregar histórico anterior.'
              )
        )
      } finally {
        setLoadingOlder(false)
      }
    }, [
      conversationId,
      hasMore,
      loading,
      loadingOlder,
    ])

  const atualizarRecentes =
    useCallback(async () => {
      if (!conversationId) {
        return
      }

      try {
        const pagina =
          await buscarTimelineWhatsApp(
            conversationId,
            null,
            PAGE_SIZE
          )

        /**
         * Usamos o cache como snapshot síncrono do
         * estado atual. Assim não dependemos do timing
         * interno do setState do React para descobrir
         * quais itens são realmente novos.
         */
        const snapshotAtual =
          obterCacheTimeline(
            conversationId
          )?.items ?? []

        const chavesAntes =
          new Set(
            snapshotAtual.map(
              item =>
                item.cursor_chave
            )
          )

        const merged =
          mesclarPreservandoAtual(
            snapshotAtual,
            pagina.items
          )

        setItems(merged)

        salvarCacheTimeline(
          conversationId,
          merged,
          hasMore,
          cursorRef.current
        )

        /**
         * Para eventos realmente novos, resolvemos
         * as mídias normalmente.
         *
         * Itens que já estavam na tela continuam
         * usando as signed URLs que já possuíam.
         */
        const itensNovos =
          pagina.items.filter(
            item =>
              !chavesAntes.has(
                item.cursor_chave
              )
          )

        /**
         * Se todos os itens já existiam, não há
         * motivo para pedir novas signed URLs.
         */
        if (
          itensNovos.length === 0
        ) {
          return
        }

        const itemsComUrls =
          await resolverUrlsMidias(
            itensNovos
          )

        setItems(current => {
          const merged =
            mesclarResolvidos(
              current,
              itemsComUrls
            )

          salvarCacheTimeline(
            conversationId,
            merged,
            hasMore,
            cursorRef.current
          )

          return merged
        })
      } catch (err) {
        console.error(
          'Erro ao atualizar eventos recentes:',
          err
        )
      }
    
    
    
    }, [
  conversationId,
  hasMore,
])

/**
 * Resolve novamente apenas a mensagem cuja
 * linha de mídia acabou de ser criada.
 *
 * Isso cobre a corrida:
 *
 * whatsapp_mensagens
 *      ↓
 * timeline carrega
 *      ↓
 * whatsapp_midias é inserida depois
 *
 * Sem recriar URLs das demais mídias
 * que já estão em cache.
 */
const resolverMidiaDaMensagem =
  useCallback(
    async (
      mensagemId: string
    ) => {
      if (
        !conversationId ||
        !mensagemId
      ) {
        return
      }

      try {
        const pagina =
          await buscarTimelineWhatsApp(
            conversationId,
            null,
            PAGE_SIZE
          )

        const itemMensagem =
          pagina.items.find(
            item =>
              item.tipo_evento ===
                'MENSAGEM' &&
              item.id ===
                mensagemId
          )

        if (!itemMensagem) {
          return
        }

        const [itemResolvido] =
          await resolverUrlsMidias([
            itemMensagem,
          ])

        if (!itemResolvido) {
          return
        }

        setItems(current => {
          const merged =
            mesclarResolvidos(
              current,
              [itemResolvido]
            )

          salvarCacheTimeline(
            conversationId,
            merged,
            hasMore,
            cursorRef.current
          )

          return merged
        })
      } catch (error) {
        console.error(
          '❌ Timeline → erro ao resolver mídia recém-criada:',
          error
        )
      }
    },
    [
      conversationId,
      hasMore,
    ]
  )

const agendarAtualizacaoRecentes =
  useCallback(() => {
      if (
        realtimeRefreshRef.current
      ) {
        clearTimeout(
          realtimeRefreshRef.current
        )
      }

      realtimeRefreshRef.current =
        setTimeout(() => {
          realtimeRefreshRef.current =
            null

          void atualizarRecentes()
        }, 150)
    }, [atualizarRecentes])

  useEffect(() => {
    void carregarInicial()
  }, [carregarInicial])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    let ativo = true

    let channel: ReturnType<
      typeof supabase.channel
    > | null = null

    const iniciarRealtime =
      async () => {
        const {
          data: { session },
          error,
        } =
          await supabase.auth.getSession()

        if (error) {
          console.error(
            '❌ Timeline → erro ao obter sessão:',
            error
          )

          return
        }

        if (
          !session?.access_token
        ) {
          console.warn(
            '⚠️ Timeline → sessão autenticada não disponível.'
          )

          return
        }

        await supabase.realtime.setAuth(
          session.access_token
        )

        if (!ativo) {
          return
        }

        channel = supabase
          .channel(
            `whatsapp-timeline:${conversationId}`
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'whatsapp_mensagens',
            },
            payload => {
              if (
                payload.eventType !==
                  'INSERT' &&
                payload.eventType !==
                  'UPDATE'
              ) {
                return
              }

              const conversaIdEvento =
                payload.new
                  ?.conversa_id

              if (
                conversaIdEvento !==
                conversationId
              ) {
                return
              }

                            agendarAtualizacaoRecentes()
            }
          )

          /**
           * A mensagem pode entrar antes de sua
           * respectiva whatsapp_midias.
           *
           * Quando a mídia aparecer, resolvemos
           * somente aquela mensagem novamente.
           */
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table:
                'whatsapp_midias',
            },
            async payload => {
              const mensagemId =
                payload.new
                  ?.mensagem_id

              if (!mensagemId) {
                return
              }

              /**
               * whatsapp_midias não possui
               * conversa_id. Confirmamos primeiro
               * a conversa da mensagem para não
               * atualizar outro chat.
               */
              const {
                data: mensagem,
                error:
                  mensagemError,
              } = await supabase
                .from(
                  'whatsapp_mensagens'
                )
                .select(
                  'conversa_id'
                )
                .eq(
                  'id',
                  mensagemId
                )
                .maybeSingle()

              if (mensagemError) {
                console.error(
                  '❌ Timeline → erro ao identificar conversa da mídia:',
                  mensagemError
                )

                return
              }

              if (
                mensagem?.conversa_id !==
                conversationId
              ) {
                return
              }

              await resolverMidiaDaMensagem(
                mensagemId
              )
            }
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'whatsapp_reacoes',
              filter:
                `conversa_id=eq.${conversationId}`,
            },



            () => {
              agendarAtualizacaoRecentes()
            }
          )

          .subscribe()
      }

    void iniciarRealtime()

    return () => {
      ativo = false

      if (
        realtimeRefreshRef.current
      ) {
        clearTimeout(
          realtimeRefreshRef.current
        )

        realtimeRefreshRef.current =
          null
      }

      if (channel) {
        void supabase.removeChannel(
          channel
        )
      }
    }



  }, [
    conversationId,
    agendarAtualizacaoRecentes,
    resolverMidiaDaMensagem,
  ])

  return {
    items,
    loading,
    loadingOlder,
    hasMore,
    error,
    carregarAnteriores,
    atualizarRecentes,
    reload: carregarInicial,
  }
}
