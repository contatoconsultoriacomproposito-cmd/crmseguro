import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  SendMessageData,
  WhatsAppMedia,
  WhatsAppMessage,
} from '../types/whatsapp'

import { useWhatsApp } from './useWhatsApp'

const OPTIMISTIC_ID_PREFIX = 'optimistic-'

function getMediaUrl(
  message: WhatsAppMessage
): string {
  const msg = message as any

  return (
    message.media?.url ||
    msg.mediaUrl ||
    msg.media_url ||
    msg.url ||
    ''
  )
}

function deduplicateMessages(
  msgs: WhatsAppMessage[]
): WhatsAppMessage[] {
  const seenIds = new Set<string>()
  const seenProviderIds = new Set<string>()
  const result: WhatsAppMessage[] = []

  for (const msg of msgs) {
    if (!msg?.id) continue
    if (seenIds.has(msg.id)) continue

    const current = msg as any

    const providerId =
      current.providerMessageId ||
      current.provider_message_id ||
      current.zaapId ||
      current.zaap_id ||
      current.messageId ||
      current.message_id

    if (
      providerId &&
      seenProviderIds.has(providerId)
    ) {
      continue
    }

    const currentMediaUrl =
      getMediaUrl(msg)

    const isDuplicateMedia =
      currentMediaUrl &&
      result.some(previousMessage => {
        const previous =
          previousMessage as any

        const previousFromMe =
          previous.fromMe ??
          previous.from_me ??
          previous.isOutgoing

        const currentFromMe =
          current.fromMe ??
          current.from_me ??
          current.isOutgoing

        if (
          previousFromMe !== undefined &&
          currentFromMe !== undefined &&
          previousFromMe !== currentFromMe
        ) {
          return false
        }

        const previousMediaUrl =
          getMediaUrl(previousMessage)

        if (
          !previousMediaUrl ||
          previousMediaUrl !==
            currentMediaUrl
        ) {
          return false
        }

        const previousTime =
          new Date(
            previousMessage.timestamp ||
              previous.created_at ||
              Date.now()
          ).getTime()

        const currentTime =
          new Date(
            msg.timestamp ||
              current.created_at ||
              Date.now()
          ).getTime()

        return (
          Math.abs(
            previousTime - currentTime
          ) < 5000
        )
      })

    if (isDuplicateMedia) continue

    seenIds.add(msg.id)

    if (providerId) {
      seenProviderIds.add(providerId)
    }

    result.push(msg)
  }

  return result
}

function sortMessages(
  messages: WhatsAppMessage[]
): WhatsAppMessage[] {
  return [...messages].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  )
}

export function useMessages(
  conversationId?: string,
  onMarkedAsRead?: (
    conversationId: string
  ) => void
) {
  const whatsapp = useWhatsApp()

  const [messages, setMessages] =
    useState<WhatsAppMessage[]>([])

  const [error, setError] =
    useState<Error | null>(null)

  const onMarkedAsReadRef =
    useRef(onMarkedAsRead)

  const activeConversationIdRef =
    useRef<string | undefined>(
      conversationId
    )

  activeConversationIdRef.current =
    conversationId

  const optimisticMessagesRef =
    useRef<
      Map<string, WhatsAppMessage>
    >(new Map())

  const objectUrlsRef =
    useRef<Map<string, string>>(
      new Map()
    )

  useEffect(() => {
    onMarkedAsReadRef.current =
      onMarkedAsRead
  }, [onMarkedAsRead])

  const revokeObjectUrl = useCallback(
    (messageId: string) => {
      const objectUrl =
        objectUrlsRef.current.get(
          messageId
        )

      if (!objectUrl) return

      URL.revokeObjectURL(objectUrl)

      objectUrlsRef.current.delete(
        messageId
      )
    },
    []
  )

  const clearOptimisticMessages =
    useCallback(() => {
      for (
        const objectUrl
        of objectUrlsRef.current.values()
      ) {
        URL.revokeObjectURL(objectUrl)
      }

      objectUrlsRef.current.clear()

      optimisticMessagesRef.current.clear()
    }, [])

  const marcarComoLida =
    useCallback(async () => {
      if (!conversationId) return

      try {
        await whatsapp.markAsRead(
          conversationId
        )

        onMarkedAsReadRef.current?.(
          conversationId
        )
      } catch (err) {
        console.error(
          '❌ useMessages → erro ao marcar conversa como lida:',
          err
        )
      }
    }, [
      conversationId,
      whatsapp,
    ])

  const createOptimisticMessage =
    useCallback(
      (
        data: Omit<
          SendMessageData,
          'conversationId'
        >,
        currentConversationId: string
      ): WhatsAppMessage => {
        const messageId =
          `${OPTIMISTIC_ID_PREFIX}` +
          `${Date.now()}-` +
          `${Math.random()
            .toString(36)
            .substring(2, 9)}`

        const messageType =
          data.type || 'text'

        let media:
          | WhatsAppMedia
          | undefined

        if (
          messageType !== 'text' &&
          data.file
        ) {
          const objectUrl =
            URL.createObjectURL(
              data.file
            )

          objectUrlsRef.current.set(
            messageId,
            objectUrl
          )

          media = {
            url: objectUrl,
            type: messageType,
            name:
              data.file.name ||
              undefined,
            size:
              data.file.size ||
              undefined,
          }
        }

        return {
          id: messageId,
          conversationId:
            currentConversationId,
          direction: 'outbound',
          type: messageType,
          text:
            data.text?.trim() ||
            undefined,
          media,
          timestamp:
            new Date().toISOString(),
          status: 'pending',
        }
      },
      []
    )

  const send = useCallback(
    async (
      data: Omit<
        SendMessageData,
        'conversationId'
      >
    ): Promise<
      WhatsAppMessage | undefined
    > => {
      if (!conversationId) return

      const sendConversationId =
        conversationId

      setError(null)

      const optimisticMessage =
        createOptimisticMessage(
          data,
          sendConversationId
        )

      optimisticMessagesRef.current.set(
        optimisticMessage.id,
        optimisticMessage
      )

      setMessages(current =>
        sortMessages(
          deduplicateMessages([
            ...current,
            optimisticMessage,
          ])
        )
      )

      try {
        const message =
          await whatsapp.sendMessage({
            ...data,
            conversationId:
              sendConversationId,
          })

        if (!message) {
          throw new Error(
            'O envio não retornou uma mensagem válida.'
          )
        }

        /**
         * O envio pode ter começado em uma conversa
         * e terminado depois que o usuário abriu outra.
         *
         * O backend continua normalmente, mas o retorno
         * antigo não pode alterar a conversa atualmente
         * exibida.
         */
        if (
          activeConversationIdRef.current !==
          sendConversationId
        ) {
          optimisticMessagesRef.current.delete(
            optimisticMessage.id
          )

          revokeObjectUrl(
            optimisticMessage.id
          )

          return message
        }

        optimisticMessagesRef.current.delete(
          optimisticMessage.id
        )

        revokeObjectUrl(
          optimisticMessage.id
        )

        setMessages(current => {
          const withoutOptimistic =
            current.filter(
              currentMessage =>
                currentMessage.id !==
                optimisticMessage.id
            )

          return sortMessages(
            deduplicateMessages([
              ...withoutOptimistic,
              message,
            ])
          )
        })

        return message
      } catch (err) {
        const currentError =
          err instanceof Error
            ? err
            : new Error(
                'Erro ao enviar mensagem'
              )

        const failedMessage:
          WhatsAppMessage = {
          ...optimisticMessage,
          status: 'failed',
        }

        optimisticMessagesRef.current.set(
            optimisticMessage.id,
            failedMessage
          )

          /**
           * Se o usuário já mudou de conversa,
           * não contaminamos o estado visual da
           * conversa atual com a falha do envio anterior.
           */
          if (
            activeConversationIdRef.current !==
            sendConversationId
          ) {
            setError(currentError)

            throw currentError
          }

          setMessages(current =>
            current.map(
            currentMessage =>
              currentMessage.id ===
              optimisticMessage.id
                ? failedMessage
                : currentMessage
          )
        )

        setError(currentError)

        throw currentError
      }
    },
    [
      conversationId,
      whatsapp,
      createOptimisticMessage,
      revokeObjectUrl,
    ]
  )

  useEffect(() => {
    clearOptimisticMessages()

    setMessages([])
    setError(null)

    if (conversationId) {
      void marcarComoLida()
    }
  }, [
    conversationId,
    clearOptimisticMessages,
    marcarComoLida,
  ])

  useEffect(() => {
    return () => {
      clearOptimisticMessages()
    }
  }, [clearOptimisticMessages])

  return {
    messages,
    loading: false,
    error,
    send,
    reload: marcarComoLida,
  }
}