import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  MessageCirclePlus,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'

import ConversationList from '../components/ConversationList'
import ChatWindow from '../components/ChatWindow'
import ContactPanel from '../components/ContactPanel'
import NewConversationModal from '../components/NewConversationModal'
import { useConversations } from '../hooks/useConversations'
import { useWhatsApp } from '../hooks/useWhatsApp'
  

import type {
  WhatsAppKanbanStage,
  WhatsAppMessage,
  WhatsAppSharedContact,
} from '../types/whatsapp'

export default function WhatsAppInbox() {
  const location = useLocation()

  const conversationIdFromNavigation =
    (
      location.state as {
        conversationId?: string
      } | null
    )?.conversationId

  const {
    conversations,
    loading,
    reload,
    markAsRead,
    updateConversationKanban,
    updateConversationContact,
  } = useConversations()

  const whatsapp = useWhatsApp()

  const [selectedId, setSelectedId] =
    useState<string>()

  const [
    newConversationOpen,
    setNewConversationOpen,
  ] = useState(false)

  const [
    newConversationInitialData,
    setNewConversationInitialData,
  ] = useState<{
    name?: string
    phone?: string
    instanceId?: string
  }>({})

  const kanbanSelectionAppliedRef =
    useRef(false)

  const [
    contactPanelOpen,
    setContactPanelOpen,
  ] = useState(true)

  const [
    mobileContactPanelOpen,
    setMobileContactPanelOpen,
  ] = useState(false)

  const selectedConversation =
    conversations.find(
      conversation =>
        conversation.id === selectedId
    )

  const handleSelectConversation =
    useCallback(
      (
        selectedConversationId: string
      ) => {
        setSelectedId(
          selectedConversationId
        )

        setMobileContactPanelOpen(false)
      },
      []
    )

  const handleBackToConversations =
    useCallback(() => {
      setSelectedId(undefined)
      setMobileContactPanelOpen(false)
    }, [])

  const handleMarkedAsRead =
    useCallback(
      (
        selectedConversationId: string
      ) => {
        markAsRead(
          selectedConversationId
        )
      },
      [markAsRead]
    )

  const toggleContactPanel =
    useCallback(() => {
      setContactPanelOpen(
        current => !current
      )
    }, [])

  const handleConversationCreated = useCallback(
    async (conversationId: string) => {
      const updatedConversations =
        await reload()

      const conversationExists =
        updatedConversations.some(
          conversation =>
            conversation.id === conversationId
        )

      console.log(
        '🧪 Nova conversa → reload do Inbox:',
        {
          conversationId,
          total:
            updatedConversations.length,
          encontrada:
            conversationExists,
        }
      )

      setSelectedId(conversationId)
      setMobileContactPanelOpen(false)
      setContactPanelOpen(true)
    },
    [reload]
  )

  const handleOpenSharedContact = useCallback(
    async (
      _message: WhatsAppMessage,
      sharedContact: WhatsAppSharedContact
    ) => {
      const phone =
        sharedContact.phone

      if (!phone) {
        console.error(
          '❌ Contato compartilhado sem telefone.'
        )
        return
      }

    if (!selectedConversation?.instanceId) {
      console.error(
        '❌ Conversa atual sem instância vinculada.'
      )
      return
    }

    try {
      const conversationId =
        await whatsapp.findActiveConversationByPhone(
          phone,
          selectedConversation.instanceId
        )

      

      if (conversationId) {
        setSelectedId(conversationId)
        setMobileContactPanelOpen(false)
        setContactPanelOpen(true)
        return
      }

      /*
      * Não existe conversa ativa deste número
      * nesta instância.
      *
      * Agora verificamos se o contato já existe
      * na base global da corretora.
      */
      const existingContact =
        await whatsapp.findContactByPhone(
          phone
        )

      

      setNewConversationInitialData({
        name:
          existingContact?.name ||
          sharedContact.name ||
          '',
        phone:
          existingContact?.phone ||
          phone,
        instanceId:
          selectedConversation.instanceId,
      })

      setNewConversationOpen(true)


    } catch (error) {
      console.error(
        '❌ Erro ao localizar conversa do contato compartilhado:',
        error
      )
    }
  },
  [
    whatsapp,
    selectedConversation,
  ]
)


  const handleConversationStatusChanged =
    useCallback(async () => {
      await reload()
      setSelectedId(undefined)
      setMobileContactPanelOpen(false)
      setContactPanelOpen(true)
    }, [reload])

  const handleChangeKanbanStage = useCallback(
  async (
    conversationId: string,
    targetStage: WhatsAppKanbanStage
  ) => {
    const currentConversation =
      conversations.find(
        conversation =>
          conversation.id === conversationId
      )

    if (!currentConversation) {
      return
    }

    if (
      currentConversation.etapaKanban ===
      targetStage
    ) {
      return
    }

    const previousStage =
      currentConversation.etapaKanban

    const previousPosition =
      currentConversation.posicaoKanban

    const targetPositions =
      conversations
        .filter(
          conversation =>
            conversation.id !== conversationId &&
            Boolean(
              conversation.contact.clienteId
            ) &&
            conversation.contact.classificacao ===
              'LEAD' &&
            conversation.etapaKanban ===
              targetStage
        )
        .map(
          conversation =>
            conversation.posicaoKanban
        )
        .filter(
          position =>
            Number.isFinite(position)
        )

    const nextPosition =
      targetPositions.length > 0
        ? Math.min(...targetPositions) - 1
        : 0

    updateConversationKanban(
      conversationId,
      targetStage,
      nextPosition
    )

    try {
      await whatsapp.updateKanbanPosition(
        conversationId,
        targetStage,
        nextPosition
      )
    } catch (error) {
      console.error(
        '❌ Erro ao alterar etapa do cliente:',
        error
      )

      updateConversationKanban(
        conversationId,
        previousStage,
        previousPosition
      )

      throw error
    }
  },
  [
    conversations,
    updateConversationKanban,
    whatsapp,
  ]
)

  useEffect(() => {
    if (
      kanbanSelectionAppliedRef.current
    ) {
      return
    }

    if (conversations.length === 0) {
      return
    }

    if (conversationIdFromNavigation) {
      const conversationExists =
        conversations.some(
          conversation =>
            conversation.id ===
            conversationIdFromNavigation
        )

      if (!conversationExists) {
        return
      }

      kanbanSelectionAppliedRef.current =
        true

      setSelectedId(
        conversationIdFromNavigation
      )

      setMobileContactPanelOpen(false)

      return
    }

    kanbanSelectionAppliedRef.current =
      true

    setSelectedId(
      conversations[0].id
    )

    setMobileContactPanelOpen(false)
  }, [
    conversationIdFromNavigation,
    conversations,
  ])

  return (
    <>
      <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-100 pt-[72px] md:p-3 lg:p-4">
        <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-white md:rounded-xl md:border md:border-slate-200 md:shadow-sm">
          <section
            className={`h-full min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white md:flex md:w-[300px] lg:w-[320px] ${
              selectedConversation
                ? 'hidden'
                : 'flex w-full'
            }`}
          >
            <div className="shrink-0 border-b border-slate-100 p-3">
              <button
                type="button"
                onClick={() => {
                  setNewConversationInitialData({})
                  setNewConversationOpen(true)
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <MessageCirclePlus
                  size={17}
                />
                Novo contato
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <ConversationList
                conversations={
                  conversations
                }
                selectedId={selectedId}
                loading={loading}
                onSelect={
                  handleSelectConversation
                }
              />
            </div>
          </section>

          <section
            className={`relative h-full min-h-0 min-w-0 flex-1 ${
              selectedConversation
                ? 'flex'
                : 'hidden md:flex'
            }`}
          >
            <ChatWindow
              conversation={
                selectedConversation
              }
              onBack={
                handleBackToConversations
              }
              onMarkedAsRead={
                handleMarkedAsRead
              }
              onOpenContactPanel={() =>
                setMobileContactPanelOpen(
                  true
                )
              }
              onConversationStatusChanged={
                handleConversationStatusChanged
              }
              onOpenSharedContact={
                handleOpenSharedContact
              }
            />

            {selectedConversation && (
              <ContactPanelToggle
                open={contactPanelOpen}
                onClick={
                  toggleContactPanel
                }
              />
            )}

            {selectedConversation &&
              mobileContactPanelOpen && (
                <div className="absolute inset-0 z-40 bg-white xl:hidden">
                  <ContactPanel
                    conversation={
                      selectedConversation
                    }
                    onChangeKanbanStage={
                      handleChangeKanbanStage
                    }
                    onContactUpdate={
                      updateConversationContact
                    }
                    onClose={() =>
                      setMobileContactPanelOpen(
                        false
                      )
                    }
                  />
                </div>
              )}
          </section>

          <div
            className={`hidden h-full min-h-0 shrink-0 overflow-hidden border-l border-slate-200 bg-white transition-[width] duration-200 xl:block ${
              selectedConversation &&
              contactPanelOpen
                ? 'w-[400px]'
                : 'w-0 border-l-0'
            }`}
          >
            <div className="h-full w-[400px]">
              <ContactPanel
                conversation={
                  selectedConversation
                }
                onChangeKanbanStage={
                  handleChangeKanbanStage
                }
                onContactUpdate={
                  updateConversationContact
                }
              />
            </div>
          </div>
        </div>
      </div>

      <NewConversationModal
        open={newConversationOpen}
        onClose={() =>
          setNewConversationOpen(false)
        }
        initialName={
          newConversationInitialData.name
        }
        initialPhone={
          newConversationInitialData.phone
        }
        initialInstanceId={
          newConversationInitialData.instanceId
        }
        findContactByPhone={(phone) =>
          whatsapp.findContactByPhone(phone)
        }
        onStartConversation={(data) =>
          whatsapp.startConversation(data)
        }
        onCreated={
          handleConversationCreated
        }
      />
    </>
  )
}

function ContactPanelToggle({
  open,
  onClick,
}: {
  open: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        open
          ? 'Ocultar informações do cliente'
          : 'Mostrar informações do cliente'
      }
      className="absolute right-2 top-[84px] z-20 hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 xl:flex"
    >
      {open ? (
        <PanelRightClose size={16} />
      ) : (
        <PanelRightOpen size={16} />
      )}
    </button>
  )
}