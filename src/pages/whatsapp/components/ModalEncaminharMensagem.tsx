import {
  Forward,
  Loader2,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'

import type {
  WhatsAppMessage,
} from '../types/whatsapp'

import {
  useConversations,
} from '../hooks/useConversations'

interface ModalEncaminharMensagemProps {
  open: boolean
  message: WhatsAppMessage
  currentConversationId: string
  sending: boolean
  onClose: () => void
  onForward: (
    destinationConversationId: string
  ) => Promise<void>
}

export default function ModalEncaminharMensagem({
  open,
  message,
  currentConversationId,
  sending,
  onClose,
  onForward,
}: ModalEncaminharMensagemProps) {
  const {
    conversations,
    loading,
  } = useConversations()

  const [search, setSearch] =
    useState('')

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<string | null>(null)

  const filteredConversations =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(search)

      return conversations
        .filter(
          conversation =>
            conversation.id !==
            currentConversationId
        )
        .filter(conversation => {
          if (!normalizedSearch) {
            return true
          }

          const name =
            normalizeText(
              conversation.contact.name
            )

          const phone =
            normalizeText(
              conversation.contact.phone
            )

          return (
            name.includes(
              normalizedSearch
            ) ||
            phone.includes(
              normalizedSearch
            )
          )
        })
    }, [
      conversations,
      currentConversationId,
      search,
    ])

  const selectedConversation =
    useMemo(
      () =>
        conversations.find(
          conversation =>
            conversation.id ===
            selectedConversationId
        ) || null,
      [
        conversations,
        selectedConversationId,
      ]
    )

  if (!open) {
    return null
  }

  const handleForward = async () => {
    if (
      !selectedConversationId ||
      sending
    ) {
      return
    }

    await onForward(
      selectedConversationId
    )
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={event => {
        if (
          event.target ===
            event.currentTarget &&
          !sending
        ) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Encaminhar mensagem
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Escolha a conversa de destino.
            </p>
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <div className="shrink-0 space-y-4 border-b border-gray-100 p-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Mensagem a encaminhar
            </p>

            <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-700">
              {message.text ||
                getMediaLabel(
                  message.type
                )}
            </p>
          </div>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por nome ou telefone..."
              autoFocus
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2
                size={17}
                className="animate-spin"
              />

              Carregando conversas...
            </div>
          ) : filteredConversations.length ===
            0 ? (
            <div className="flex h-40 items-center justify-center text-center">
              <div>
                <Search
                  size={24}
                  className="mx-auto text-gray-300"
                />

                <p className="mt-2 text-sm font-medium text-gray-600">
                  Nenhuma conversa encontrada
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Tente pesquisar por outro
                  nome ou telefone.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map(
                conversation => {
                  const selected =
                    conversation.id ===
                    selectedConversationId

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      disabled={sending}
                      onClick={() =>
                        setSelectedConversationId(
                          conversation.id
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {conversation.contact
                          .avatar ? (
                          <img
                            src={
                              conversation
                                .contact
                                .avatar
                            }
                            alt={
                              conversation
                                .contact
                                .name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(
                            conversation
                              .contact.name
                          )
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium ${
                            selected
                              ? 'text-blue-800'
                              : 'text-gray-800'
                          }`}
                        >
                          {
                            conversation
                              .contact.name
                          }
                        </p>

                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {
                            conversation
                              .contact.phone
                          }
                        </p>

                        {conversation
                          .lastMessage?.text && (
                          <p className="mt-1 truncate text-xs text-gray-400">
                            {
                              conversation
                                .lastMessage
                                .text
                            }
                          </p>
                        )}
                      </div>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {selected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  )
                }
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
          {selectedConversation && (
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              <UserRound
                size={13}
                className="text-blue-500"
              />

              Encaminhar para

              <span className="font-medium text-gray-700">
                {
                  selectedConversation
                    .contact.name
                }
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={
                sending ||
                !selectedConversationId
              }
              onClick={() => {
                void handleForward()
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Forward size={14} />
              )}

              {sending
                ? 'Encaminhando...'
                : 'Encaminhar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function normalizeText(
  value?: string | null
) {
  return String(value || '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
}

function getInitials(
  name?: string | null
) {
  const parts = String(
    name || ''
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return `${
    parts[0][0]
  }${
    parts[
      parts.length - 1
    ][0]
  }`.toUpperCase()
}

function getMediaLabel(
  type: WhatsAppMessage['type']
) {
  switch (type) {
    case 'image':
      return '📷 Imagem'

    case 'audio':
      return '🎵 Áudio'

    case 'video':
      return '🎥 Vídeo'

    case 'document':
      return '📄 Documento'

    default:
      return 'Mensagem'
  }
}