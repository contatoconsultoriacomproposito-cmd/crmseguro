import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { WhatsAppConversation } from '../types/whatsapp'
import { useWhatsApp } from './useWhatsApp'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../auth/AuthContext'

const CONVERSATIONS_CACHE_TTL_MS =
  11 * 60 * 60 * 1000

interface ConversationsCacheEntry {
  userId: string
  conversations: WhatsAppConversation[]
  expiresAt: number
}

let conversationsCache: ConversationsCacheEntry | null = null

function obterCacheConversas(userId?: string): ConversationsCacheEntry | null {
  if (!userId || !conversationsCache) return null
  if (conversationsCache.userId !== userId || conversationsCache.expiresAt <= Date.now()) {
    conversationsCache = null
    return null
  }
  return conversationsCache
}

function salvarCacheConversas(userId: string, conversations: WhatsAppConversation[]): void {
  conversationsCache = {
    userId,
    conversations,
    expiresAt: Date.now() + CONVERSATIONS_CACHE_TTL_MS,
  }
}

export interface RamalNotification {
  id: string
  conversa_id: string
  criado_em: string
}

export function useConversations() {
  const whatsapp = useWhatsApp()
  const { userProfile } = useAuth()
  const userId = userProfile?.id
  // A referência é atualizada no render: respostas antigas nunca entram no novo login.
  const activeUserRef = useRef(userId)
  activeUserRef.current = userId
  const requestVersionRef = useRef(0)

  const cacheInicial = obterCacheConversas(userId)

  const [loadedUserId, setLoadedUserId] = useState(userId)
  const [ramalNotifications, setRamalNotifications] = useState<RamalNotification[]>([])
  const pendingReadRef = useRef(new Set<string>())
  const notificationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [conversations, setConversations] =
    useState<WhatsAppConversation[]>(
      () =>
        cacheInicial?.conversations ??
        []
    )

  const [loading, setLoading] =
    useState(
      () =>
        !cacheInicial
    )

  const [error, setError] =
    useState<Error | null>(null)

  const conversationsRef =
    useRef<WhatsAppConversation[]>(
      cacheInicial?.conversations ??
      []
    )

  const reloadTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const fetchConversations = useCallback(
    async (
      isSilent = false
    ): Promise<WhatsAppConversation[]> => {
      const targetUser = userId
      if (!targetUser) return []
      const requestVersion = ++requestVersionRef.current
      if (!isSilent) setLoading(true)
      setError(null)

      try {
        const data = await whatsapp.getConversations()
        if (activeUserRef.current !== targetUser || requestVersion !== requestVersionRef.current) {
          return []
        }
        conversationsRef.current = data
        setConversations(data)
        setLoadedUserId(targetUser)
        salvarCacheConversas(targetUser, data)
        return data
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error(
                'Erro ao carregar conversas.'
              )

        if (activeUserRef.current === targetUser && requestVersion === requestVersionRef.current) {
          setError(error)
          throw error
        }
        return []
      } finally {
        if (!isSilent && activeUserRef.current === targetUser && requestVersion === requestVersionRef.current) {
          setLoading(false)
        }
      }
    },
    [whatsapp, userId]
  )

  const scheduleSilentReload = useCallback(() => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current)
    }

    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null
      void fetchConversations(true)
    }, 120)
  }, [fetchConversations])

  const promoteConversationFromMessage = useCallback(
    (message: any) => {
      const conversationId =
        message?.conversa_id

      if (!conversationId) return

      setConversations(current => {
        const index = current.findIndex(
          conversation =>
            conversation.id === conversationId
        )

        if (index === -1) {
          scheduleSilentReload()
          return current
        }

        const currentConversation =
          current[index]

        const updatedConversation: WhatsAppConversation = {
          ...currentConversation,
          updatedAt:
            message.timestamp ||
            new Date().toISOString(),
          lastMessage: {
            id: message.id,
            conversationId,
            direction: message.direction,
            type: message.type,
            text: message.text || undefined,
            timestamp:
              message.timestamp ||
              new Date().toISOString(),
            status: message.status,
            senderName:
              message.sender_name || undefined,
          },
        }

        const updated = [
          updatedConversation,
          ...current.filter(
            conversation =>
              conversation.id !== conversationId
          ),
        ]

        conversationsRef.current = updated

        return updated
      })
    },
    [scheduleSilentReload]
  )

  const markAsRead = useCallback(
    (conversationId: string) => {
      setConversations(current =>
        current.map(conversation =>
          conversation.id === conversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation
        )
      )
    },
    []
  )

  const updateConversationKanban = useCallback(
    (
      conversationId: string,
      etapaKanban: WhatsAppConversation['etapaKanban'],
      posicaoKanban: number
    ) => {
      setConversations(current =>
        current.map(conversation =>
          conversation.id === conversationId
            ? {
                ...conversation,
                etapaKanban,
                posicaoKanban,
              }
            : conversation
        )
      )
    },
    []
  )

  const updateConversationContact = useCallback(
    (
      conversationId: string,
      updates: Partial<
        WhatsAppConversation['contact']
      >
    ) => {
      setConversations(current =>
        current.map(conversation =>
          conversation.id === conversationId
            ? {
                ...conversation,
                contact: {
                  ...conversation.contact,
                  ...updates,
                },
              }
            : conversation
        )
      )
    },
    []
  )

useEffect(() => {
  requestVersionRef.current += 1
  const cached = obterCacheConversas(userId)
  conversationsRef.current = cached?.conversations ?? []
  setConversations(cached?.conversations ?? [])
  setLoadedUserId(userId)
  setRamalNotifications([])
  pendingReadRef.current.clear()
  setError(null)

  if (!userId) {
    setLoading(false)
    return
  }
  setLoading(!cached)
  void fetchConversations(Boolean(cached))
}, [userId, fetchConversations])

const fetchRamalNotifications = useCallback(async () => {
  const targetUser = userId
  if (!targetUser) return
  const { data, error: notificationError } = await supabase
    .from('whatsapp_ramal_notificacoes')
    .select('id, conversa_id, criado_em')
    .eq('destinatario_id', targetUser)
    .is('lida_em', null)
    .order('criado_em', { ascending: false })
    .limit(100)
  if (notificationError) {
    console.error('Erro ao consultar notificações do Ramal:', notificationError)
    return
  }
  if (activeUserRef.current !== targetUser) return
  setRamalNotifications((data ?? []) as RamalNotification[])
}, [userId])

const scheduleNotificationsRefresh = useCallback(() => {
  if (notificationsTimerRef.current) clearTimeout(notificationsTimerRef.current)
  notificationsTimerRef.current = setTimeout(() => {
    notificationsTimerRef.current = null
    void fetchRamalNotifications()
  }, 180)
}, [fetchRamalNotifications])

const reconhecerRamal = useCallback(async (conversationId: string) => {
  if (!userId || pendingReadRef.current.has(conversationId)) return
  if (!ramalNotifications.some(n => n.conversa_id === conversationId)) return
  pendingReadRef.current.add(conversationId)
  try {
    const { error: rpcError } = await supabase.rpc('crm_whatsapp_ramal_notificacao_ler', {
      p_conversa_id: conversationId,
    })
    if (rpcError) throw rpcError
    if (activeUserRef.current === userId) {
      setRamalNotifications(current => current.filter(n => n.conversa_id !== conversationId))
    }
  } catch (notificationError) {
    console.error('Erro ao reconhecer notificação do Ramal:', notificationError)
  } finally {
    pendingReadRef.current.delete(conversationId)
  }
}, [userId, ramalNotifications])

useEffect(() => {
  if (!userId) return
  void fetchRamalNotifications()
  return () => {
    if (notificationsTimerRef.current) clearTimeout(notificationsTimerRef.current)
    notificationsTimerRef.current = null
  }
}, [userId, fetchRamalNotifications])

  useEffect(() => {
    const crmChangeIsRelevant = (
      row: any,
      tipo: 'PESSOA' | 'EMPRESA'
    ) => {
      if (!row?.id) return false

      const contatoId =
        row?.dados?.campos_adicionais
          ?.whatsapp?.contato_id

      return conversationsRef.current.some(
        conversation =>
          (
            conversation.contact.clienteId ===
              row.id &&
            conversation.contact.clienteTipo ===
              tipo
          ) ||
          (
            contatoId &&
            conversation.contact.id ===
              contatoId
          )
      )
    }

    if (!userId) return
    const channel = supabase
      .channel(`realtime_conversas_list_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_ramal_notificacoes',
          filter: `destinatario_id=eq.${userId}`,
        },
        () => {
          scheduleSilentReload()
          scheduleNotificationsRefresh()
        },
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversas',
        },
        payload => {
          const eventType =
            payload.eventType

          if (
            eventType === 'INSERT' ||
            eventType === 'DELETE'
          ) {
            scheduleSilentReload()
            return
          }

          if (eventType !== 'UPDATE') {
            return
          }

          const updatedConversation =
            payload.new as {
              id?: string
              status?: WhatsAppConversation['status']
              unread_count?: number | null
              responsavel_id?: string | null
              ultima_mensagem_at?: string | null
              instancia_id?: string | null
            }

          if (!updatedConversation.id) {
            return
          }

          const currentConversation =
            conversationsRef.current.find(
              conversation =>
                conversation.id ===
                updatedConversation.id
            )

          if (!currentConversation) {
            scheduleSilentReload()
            return
          }

          const statusChanged =
            updatedConversation.status !==
              undefined &&
            updatedConversation.status !==
              currentConversation.status

          const instanceChanged =
            updatedConversation.instancia_id !==
              undefined &&
            (
              updatedConversation.instancia_id ||
              undefined
            ) !== currentConversation.instanceId

          const newLastMessageAt =
            updatedConversation
              .ultima_mensagem_at

          const currentLastMessageAt =
            currentConversation
              .lastMessage?.timestamp

          const lastMessageChanged =
            Boolean(newLastMessageAt) &&
            newLastMessageAt !==
              currentLastMessageAt

          if (
            statusChanged ||
            instanceChanged ||
            lastMessageChanged
          ) {
            scheduleSilentReload()
            return
          }

          setConversations(current =>
            current.map(conversation => {
              if (
                conversation.id !==
                updatedConversation.id
              ) {
                return conversation
              }

              return {
                ...conversation,

                unreadCount:
                  typeof updatedConversation
                    .unread_count === 'number'
                    ? updatedConversation
                        .unread_count
                    : conversation.unreadCount,

                assignedUserId:
                  updatedConversation
                    .responsavel_id ??
                  undefined,
              }
            })
          )
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
        },
        payload => {
          promoteConversationFromMessage(
            payload.new
          )
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instancias',
        },
        payload => {
          const updatedInstance =
            payload.new as {
              id?: string
            }

          if (!updatedInstance.id) {
            return
          }

          const relevant =
            conversationsRef.current.some(
              conversation =>
                conversation.instanceId ===
                updatedInstance.id
            )

          if (relevant) {
            scheduleSilentReload()
          }
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_pessoas',
        },
        payload => {
          if (
            crmChangeIsRelevant(
              payload.new,
              'PESSOA'
            ) ||
            crmChangeIsRelevant(
              payload.old,
              'PESSOA'
            )
          ) {
            scheduleSilentReload()
          }
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_empresas',
        },
        payload => {
          if (
            crmChangeIsRelevant(
              payload.new,
              'EMPRESA'
            ) ||
            crmChangeIsRelevant(
              payload.old,
              'EMPRESA'
            )
          ) {
            scheduleSilentReload()
          }
        }
      )

      .subscribe()

    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(
          reloadTimerRef.current
        )
        reloadTimerRef.current = null
      }

      supabase.removeChannel(channel)
    }
  }, [
    promoteConversationFromMessage,
    scheduleSilentReload,
    scheduleNotificationsRefresh,
    userId,
  ])

  return {
    conversations: loadedUserId === userId ? conversations : [],
    ramalNotifications: loadedUserId === userId ? ramalNotifications : [],
    reconhecerRamal,
    loading,
    error,

    reload: async () => {
      return await fetchConversations(false)
    },

    markAsRead,
    updateConversationKanban,
    updateConversationContact,
  }
}