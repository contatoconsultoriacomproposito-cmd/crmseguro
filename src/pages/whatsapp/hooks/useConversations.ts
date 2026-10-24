import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { WhatsAppConversation } from '../types/whatsapp'
import { useWhatsApp } from './useWhatsApp'
import { supabase } from '../../../lib/supabaseClient'

export function useConversations() {
  const whatsapp = useWhatsApp()
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const conversationsRef =
    useRef<WhatsAppConversation[]>([])

  const reloadTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const fetchConversations = useCallback(
    async (
      isSilent = false
    ): Promise<WhatsAppConversation[]> => {
      if (!isSilent) {
        setLoading(true)
      }

      setError(null)

      try {
        const data =
          await whatsapp.getConversations()

        conversationsRef.current = data
        setConversations(data)

        return data
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error(
                'Erro ao carregar conversas.'
              )

        setError(error)
        throw error
      } finally {
        if (!isSilent) {
          setLoading(false)
        }
      }
    },
    [whatsapp]
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
    void fetchConversations(false)
  }, [fetchConversations])

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

    const channel = supabase
      .channel('realtime_conversas_list')

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
  ])

  return {
    conversations,
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