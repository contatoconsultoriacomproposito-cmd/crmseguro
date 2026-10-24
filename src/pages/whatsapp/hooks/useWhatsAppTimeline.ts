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
    useRef<ReturnType<typeof setTimeout> | null>(
      null
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

      setLoading(true)
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

        const itemsIniciais =
        deduplicarTimeline(
          pagina.items
        )

      setItems(
        itemsIniciais
      )

      setHasMore(
        pagina.hasMore
      )

      cursorRef.current =
        pagina.nextCursor

      void resolverUrlsMidias(
        itemsIniciais
      )
      .then(itemsComUrls => {
        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return
        }

        setItems(
          deduplicarTimeline(
            itemsComUrls
          )
        )
      })
      .catch(error => {
        console.error(
          '❌ Timeline → erro ao resolver mídias em segundo plano:',
          error
        )
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
    }, [conversationId])

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

        setItems(current =>
          deduplicarTimeline([
            ...pagina.items,
            ...current,
          ])
        )

        setHasMore(
          pagina.hasMore
        )

        cursorRef.current =
          pagina.nextCursor
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

        setItems(current =>
          deduplicarTimeline([
            ...current,
            ...pagina.items,
          ]).sort((a, b) => {
            const diferenca =
              new Date(
                a.evento_em
              ).getTime() -
              new Date(
                b.evento_em
              ).getTime()

            if (diferenca !== 0) {
              return diferenca
            }

            return a.cursor_chave.localeCompare(
              b.cursor_chave
            )
          })
        )
      } catch (err) {
        console.error(
          'Erro ao atualizar eventos recentes:',
          err
        )
      }
    }, [conversationId])

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
              table: 'whatsapp_mensagens',
            },
            payload => {
              if (
                payload.eventType !== 'INSERT' &&
                payload.eventType !== 'UPDATE'
              ) {
                return
              }

              const conversaIdEvento =
                payload.new?.conversa_id

              if (
                conversaIdEvento !==
                conversationId
              ) {
                return
              }

              agendarAtualizacaoRecentes()
            }
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whatsapp_reacoes',
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
