import { useEffect, useMemo, useRef, useState } from 'react';
import type { WhatsAppAttendant, WhatsAppConversation, WhatsAppConversationStatus, WhatsAppMessage, WhatsAppSharedContact } from '../types/whatsapp';
import ModalEncaminharMensagem from './ModalEncaminharMensagem';
import ModalExcluirMensagem from './ModalExcluirMensagem';
import { useMessages } from '../hooks/useMessages';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useConversationAutomation } from '../hooks/useConversationAutomation';
import type { AutomationMachineState } from '../automation/engine/automationMachine';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import DocumentosMenu from '../documentos/components/DocumentosMenu';
import ModalAdicionarDocumento from '../documentos/components/ModalAdicionarDocumento';
import { useAuth } from '../../../auth/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import { Archive, ArrowLeft, Check, ChevronDown, FolderOpen, Phone, RotateCcw, UserRound, CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { startRealPreQualification } from '../automation/services/preQualificationExecutor';
import { startRealRouting } from '../automation/services/routingExecutor';
import ModalNovoCompromisso, { type NovoCompromissoSubmitPayload } from '../pages/agenda/components/ModalNovoCompromisso';
import { criarCompromisso, criarCompromissos } from '../pages/agenda/services/agendaService';
import type { AgendaClienteResultado } from '../pages/agenda/services/agendaClienteService';
import { buscarClienteCrmPorContatoWhatsApp } from '../services/crmWhatsAppClienteService';
import { iniciarChamadaDapi } from '../services/dapiCallService';
import { CallModal } from './CallModal';
import { criarLigacaoWhatsApp, marcarLigacaoIniciada, marcarLigacaoTocando, marcarLigacaoAtendida, finalizarLigacaoWhatsApp, marcarLigacaoFalhou } from '../services/whatsappCallService';
import { uploadCallRecording } from '../services/callRecordingService';
import CallTimelineItem from './CallTimelineItem';
import { useWhatsAppTimeline } from '../hooks/useWhatsAppTimeline';
import { mapearTimelineWhatsApp, type WhatsAppTimelineRenderable } from '../services/whatsappTimelineMapper';
import ModalCriarTarefaWhatsApp from './ModalCriarTarefaWhatsApp';
import { criarTarefaWhatsApp } from '../services/whatsappTaskService';
import ModalArmazenamento from '../configuracao-corretora/ModalArmazenamento';

import {
  isStorageLimitError,
} from '../services/storageQuotaError';

import { useStorageCommercial } from '../hooks/useStorageCommercial';

const avataresComErroChat = new Set<string>()

interface ChatWindowProps {
    conversation?: WhatsAppConversation;
    onBack?: () => void;
    onMarkedAsRead?: (conversationId: string) => void;
    onOpenContactPanel?: () => void;
    onConversationStatusChanged?: () => Promise<void> | void;
    onOpenSharedContact?: (
        message: WhatsAppMessage,
        contact: WhatsAppSharedContact
        ) => Promise<void> | void
}
type HeaderMenu = 'responsavel' | 'documentos' | null;

export default function ChatWindow({
    conversation,
    onBack,
    onMarkedAsRead,
    onOpenContactPanel,
    onConversationStatusChanged,
    onOpenSharedContact,
    }: ChatWindowProps) {
    const whatsapp = useWhatsApp();

    const avatarUrl = conversation?.contact.avatar?.trim() || ''

    const [avatarComErro, setAvatarComErro] = useState(
    () => Boolean(
        avatarUrl &&
        avataresComErroChat.has(avatarUrl)
    )
    )

    useEffect(() => {
    setAvatarComErro(
        Boolean(
        avatarUrl &&
        avataresComErroChat.has(avatarUrl)
        )
    )
    }, [avatarUrl])
    const handleReactMessage = async (
    message: WhatsAppMessage,
    emoji: string
    ) => {
    if (!conversation) {
        return
    }
    try {
        await whatsapp.sendReaction(
        conversation.id,
        message,
        emoji
        )
        toast.success(
        `Reação ${emoji} enviada.`
        )
    } catch (error) {
        console.error(
        '❌ Erro ao reagir à mensagem:',
        error
        )
        toast.error(
        error instanceof Error
            ? error.message
            : 'Não foi possível enviar a reação.'
        )
        throw error
    }
    }
    const storageCommercial =
        useStorageCommercial();
    const { userProfile } = useAuth();
    const podeAlterarResponsavel = userProfile?.tipo_usuario === 'CORRETORA' ||
        userProfile?.tipo_usuario === 'ADMIN';
    const corretoraId = userProfile?.tipo_usuario ===
        'CORRETORA'
        ? userProfile.id
        : userProfile?.corretora_id ??
            null;
    const {
    messages,
    send,
    } = useMessages(
    conversation?.id,
    onMarkedAsRead
    )
    const timeline = useWhatsAppTimeline(
    conversation?.id
    )
    const loading = timeline.loading
    const { state: automationState, startPreQualification, startRouting, takeOver } = useConversationAutomation({
    conversationId: conversation?.id,
    contactName: conversation?.contact.name,
    });
    const [activeMenu, setActiveMenu] = useState<HeaderMenu>(null);
    type RealAutomationSession = {
    tipo: 'pre_qualification' | 'routing';
    status: 'running' | 'awaiting_human';
    };

    type AutomationHistory = {
        preQualificationExecuted: boolean;
        routingExecuted: boolean;
    };

    const [realAutomationSession, setRealAutomationSession] = useState<RealAutomationSession | null>(null);
    const [automationHistory, setAutomationHistory] = useState<AutomationHistory>({
        preQualificationExecuted: false,
        routingExecuted: false,
    });
    const [takingOverAutomation, setTakingOverAutomation] = useState(false);
    const [modalDocumentoAberto, setModalDocumentoAberto] = useState(false);
    const [
    taskMessage,
    setTaskMessage,
    ] = useState<WhatsAppMessage | null>(null)
    const [
    forwardMessage,
    setForwardMessage,
    ] = useState<WhatsAppMessage | null>(null)
    const [
    deleteMessage,
    setDeleteMessage,
    ] = useState<WhatsAppMessage | null>(null)
    const [
    forwardingMessage,
    setForwardingMessage,
    ] = useState(false)
    const [
    deletingMessage,
    setDeletingMessage,
    ] = useState(false)
    const [
    savingTask,
    setSavingTask,
    ] = useState(false)
    const [replyMessage, setReplyMessage] =
    useState<WhatsAppMessage | null>(null)
    const [
    pendingNavigateMessageId,
    setPendingNavigateMessageId,
    ] = useState<string | null>(null)
    const [documentosRefreshKey, setDocumentosRefreshKey] = useState(0);
    const [chamadaStatus, setChamadaStatus] = useState<
    'idle' | 'starting' | 'calling' | 'ringing' | 'connected'
    >('idle')
    const [microfoneMutado, setMicrofoneMutado] = useState(false)
    const [speakerMutado, setSpeakerMutado] = useState(false)
    const callSocketRef = useRef<WebSocket | null>(null)
    const callAudioContextRef = useRef<AudioContext | null>(null)
    const callMicRef = useRef<MediaStream | null>(null)
    const callNodeRef = useRef<AudioWorkletNode | null>(null)
    const canSendUplinkRef = useRef(false)
    const callOutputGainRef = useRef<GainNode | null>(null)
    const microphoneMutedRef = useRef(false)
    const callRecorderRef = useRef<MediaRecorder | null>(null)
    const callRecordingChunksRef = useRef<Blob[]>([])
    const callDatabaseIdRef = useRef<string | null>(null)
    const callConnectedAtRef = useRef<number | null>(null)
    const callFinalizedRef = useRef(false)
    const [attendants, setAttendants] = useState<WhatsAppAttendant[]>([]);
    const [loadingAttendants, setLoadingAttendants] = useState(false);
    const [assigningResponsible, setAssigningResponsible] = useState(false);
    const [responsavelId, setResponsavelId] = useState(conversation?.assignedUserId ?? '');
    const [modalAgendaAberto, setModalAgendaAberto,] = useState(false);
    const [clienteAgenda, setClienteAgenda,] = useState<AgendaClienteResultado | null>(null);
    const [carregandoAgenda, setCarregandoAgenda,] = useState(false);
    const [salvandoAgenda, setSalvandoAgenda,] = useState(false);
    const [alterandoStatusConversa, setAlterandoStatusConversa] = useState(false);
    useEffect(() => {
        setResponsavelId(
            conversation?.assignedUserId ?? ''
        );
        setActiveMenu(null);
        setModalDocumentoAberto(false);
        setReplyMessage(null);
        }, [
        conversation?.id,
        conversation?.assignedUserId,
        ]);
        useEffect(() => {
        if (!conversation?.id || !corretoraId) {
            setRealAutomationSession(null);
            setAutomationHistory({
                preQualificationExecuted: false,
                routingExecuted: false,
            });
            return;
        }

        let mounted = true;

        const carregarAutomacoes = async () => {
            const { data, error } = await supabase
                .from('whatsapp_automacoes_sessoes')
                .select('tipo, status, iniciado_em')
                .eq('corretora_id', corretoraId)
                .eq('conversa_id', conversation.id)
                .order('iniciado_em', { ascending: false });

            if (error) {
                console.error('Erro ao carregar automações da conversa:', error);
                return;
            }

            if (!mounted) return;

            const sessoes = data ?? [];

            const sessaoAtiva = sessoes.find(
                sessao => sessao.status === 'running' || sessao.status === 'awaiting_human'
            );

            setRealAutomationSession(
                sessaoAtiva
                    ? {
                        tipo: sessaoAtiva.tipo as 'pre_qualification' | 'routing',
                        status: sessaoAtiva.status as 'running' | 'awaiting_human',
                    }
                    : null
            );

            setAutomationHistory({
                preQualificationExecuted: sessoes.some(
                    sessao => sessao.tipo === 'pre_qualification' && sessao.status !== 'cancelled'
                ),
                routingExecuted: sessoes.some(
                    sessao => sessao.tipo === 'routing' && sessao.status !== 'cancelled'
                ),
            });
        };

        void carregarAutomacoes();

        const channel = supabase
            .channel(`whatsapp-automation-${conversation.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'whatsapp_automacoes_sessoes',
                filter: `conversa_id=eq.${conversation.id}`,
            }, () => {
                void carregarAutomacoes();
            })
            .subscribe();

        return () => {
            mounted = false;
            void supabase.removeChannel(channel);
        };
    }, [conversation?.id, corretoraId]);
    const automationStatePersisted = useMemo<AutomationMachineState | null>(() => {
    if (!realAutomationSession) return automationState;

    const totalSteps = automationState?.totalSteps ?? (
        realAutomationSession.tipo === 'pre_qualification' ? 4 : 2
    );

    return {
        status:
            realAutomationSession.status === 'awaiting_human'
                ? 'awaiting_human'
                : realAutomationSession.tipo === 'pre_qualification'
                    ? 'pre_qualification'
                    : 'routing',
        type: realAutomationSession.tipo,
        sessionId: automationState?.sessionId,
        currentStep:
            realAutomationSession.status === 'awaiting_human'
                ? totalSteps
                : automationState?.currentStep ?? 1,
        totalSteps,
        qualificationData: automationState?.qualificationData ?? {},
        routingData: automationState?.routingData ?? {},
        startedAt: automationState?.startedAt,
        updatedAt: new Date().toISOString(),
        completedAt: automationState?.completedAt,
        humanTakeover: false,
        stopReason: null,
    };
    }, [automationState, realAutomationSession]);
        useEffect(() => {
        let mounted = true;
        const loadAttendants = async () => {
            setLoadingAttendants(true);
            try {
                const data = await whatsapp.getAttendants();
                if (mounted) {
                    setAttendants(data);
                }
            }
            catch (error) {
                console.error('❌ ChatWindow → erro ao carregar responsáveis:', error);
                if (mounted) {
                    setAttendants([]);
                }
            }
            finally {
                if (mounted) {
                    setLoadingAttendants(false);
                }
            }
        };
        void loadAttendants();
        return () => {
            mounted = false;
        };
    }, [whatsapp]);
    const eventosTimeline = useMemo(
  () =>
mapearTimelineWhatsApp(
  timeline.items
),
  [timeline.items]
)
const handleCreateTaskFromMessage = (
  message: WhatsAppMessage
) => {
  setTaskMessage(message)
}
const handleSaveTask = async (data: {
  titulo: string
  descricao: string
  prioridade:
| 'BAIXA'
| 'NORMAL'
| 'ALTA'
| 'URGENTE'
  vencimentoEm: string | null
}) => {
  if (
!conversation ||
!taskMessage ||
!corretoraId ||
!userProfile?.id
  ) {
return
  }
  try {
setSavingTask(true)
await criarTarefaWhatsApp({
  corretoraId,
  conversaId:
    conversation.id,
  mensagemId:
    taskMessage.id,
  titulo:
    data.titulo,
  descricao:
    data.descricao || null,
  prioridade:
    data.prioridade,
  responsavelId:
    responsavelId ||
    userProfile.id,
  vencimentoEm:
    data.vencimentoEm
      ? new Date(
          data.vencimentoEm
        ).toISOString()
      : null,
  criadoPorId:
    userProfile.id,
})
toast.success(
  'Tarefa criada com sucesso.'
)
setTaskMessage(null)
  } catch (error) {
console.error(
  'Erro ao criar tarefa:',
  error
)
toast.error(
  'Não foi possível criar a tarefa.'
)
  } finally {
setSavingTask(false)
  }
}
const handleForwardMessage = (
  message: WhatsAppMessage
) => {
  setForwardMessage(message)
}
const handleDeleteMessage = (
  message: WhatsAppMessage
) => {
  setDeleteMessage(message)
}
const handleConfirmForward =
  async (
destinationConversationId: string
  ) => {
if (
  !forwardMessage ||
  forwardingMessage
) {
  return
}
try {
  setForwardingMessage(true)
  await whatsapp.forwardMessage(
    forwardMessage.id,
    destinationConversationId
  )
  toast.success(
    'Mensagem encaminhada com sucesso.'
  )
  setForwardMessage(null)
} catch (error) {
  console.error(
    '❌ Erro ao encaminhar mensagem:',
    error
  )
  toast.error(
    error instanceof Error
      ? error.message
      : 'Não foi possível encaminhar a mensagem.'
  )
} finally {
  setForwardingMessage(false)
}
  }
const handleConfirmDelete = async () => {
  if (
!deleteMessage ||
deletingMessage
  ) {
return
  }
  try {
setDeletingMessage(true)
console.log(
  'Excluir mensagem:',
  deleteMessage
)
toast.success(
  'Mensagem excluída.'
)
setDeleteMessage(null)
  } catch (error) {
console.error(
  'Erro ao excluir mensagem:',
  error
)
toast.error(
  'Não foi possível excluir a mensagem.'
)
  } finally {
setDeletingMessage(false)
  }
}
const timelineItems =
  useMemo<
    WhatsAppTimelineRenderable[]
  >(() => {
    /*
     * ======================================================
     * MENSAGENS LOCAIS POR ID
     * ======================================================
     *
     * Depois que sendMessage() retorna, useMessages pode ter
     * uma versão local definitiva da mensagem enquanto a
     * timeline ainda não resolveu a URL permanente da mídia.
     */
    const mensagensLocaisPorId =
      new Map(
        messages.map(message => [
          message.id,
          message,
        ])
      )

    /*
     * ======================================================
     * HIDRATAÇÃO TEMPORÁRIA DA TIMELINE
     * ======================================================
     *
     * Se a timeline já conhece a mensagem mas ainda não tem
     * media.url, reaproveitamos temporariamente a mídia local.
     *
     * Assim:
     *
     * - não criamos uma segunda bolha;
     * - não exibimos "Carregando imagem..." desnecessariamente;
     * - não precisamos de F5;
     * - quando a timeline receber a URL definitiva do B2,
     *   ela naturalmente passa a prevalecer.
     */
    const eventosTimelineHidratados =
      eventosTimeline.map(item => {
        if (
          item.kind !== 'message'
        ) {
          return item
        }

        if (
          item.message.type === 'text' ||
          item.message.media?.url
        ) {
          return item
        }

        const mensagemLocal =
          mensagensLocaisPorId.get(
            item.message.id
          )

        if (
          !mensagemLocal?.media?.url
        ) {
          return item
        }

        return {
          ...item,
          message: {
            ...item.message,
            media: {
              ...mensagemLocal.media,
              ...item.message.media,

              /*
               * A URL local precisa prevalecer porque sabemos
               * que a da timeline ainda está vazia.
               */
              url:
                mensagemLocal.media.url,
            },
          },
        }
      })

    const idsMensagensTimeline =
      new Set(
        eventosTimelineHidratados
          .filter(
            item =>
              item.kind ===
              'message'
          )
          .map(
            item =>
              item.message.id
          )
      )

    /*
     * Mensagens reais outbound já existentes
     * na timeline.
     *
     * Elas são utilizadas para reconciliar
     * previews optimistic.
     */
    const mensagensReaisOutbound =
      eventosTimelineHidratados
        .filter(
          (
            item
          ): item is Extract<
            WhatsAppTimelineRenderable,
            { kind: 'message' }
          > =>
            item.kind ===
              'message' &&
            item.message.direction ===
              'outbound' &&
            !item.message.id.startsWith(
              'optimistic-'
            )
        )
        .map(
          item =>
            item.message
        )

    /*
     * Cada mensagem real substitui no máximo
     * UMA optimistic.
     */
    const optimisticSubstituidas =
      new Set<string>()

    const otimistas =
      messages
        .filter(
          message =>
            message.id.startsWith(
              'optimistic-'
            ) &&
            message.direction ===
              'outbound'
        )
        .sort(
          (a, b) =>
            new Date(
              a.timestamp
            ).getTime() -
            new Date(
              b.timestamp
            ).getTime()
        )

    const reaisOrdenadas =
      [
        ...mensagensReaisOutbound,
      ].sort(
        (a, b) =>
          new Date(
            a.timestamp
          ).getTime() -
          new Date(
            b.timestamp
          ).getTime()
      )

    const optimisticJaAssociadas =
      new Set<string>()

    for (
      const mensagemReal
      of reaisOrdenadas
    ) {
      const realTime =
        new Date(
          mensagemReal.timestamp
        ).getTime()

      let melhorOptimistic:
        | WhatsAppMessage
        | undefined

      let menorDiferenca =
        Number.POSITIVE_INFINITY

      for (
        const optimistic
        of otimistas
      ) {
        if (
          optimisticJaAssociadas.has(
            optimistic.id
          )
        ) {
          continue
        }

        if (
          optimistic.type !==
          mensagemReal.type
        ) {
          continue
        }

        const optimisticTime =
          new Date(
            optimistic.timestamp
          ).getTime()

        const diferencaTempo =
          Math.abs(
            realTime -
              optimisticTime
          )

        /*
         * O envio de mídia pode levar alguns
         * segundos. Mantemos uma margem segura
         * para reconciliar a mensagem correta.
         */
        if (
          diferencaTempo >
          30000
        ) {
          continue
        }

        /*
         * TEXTO:
         * compara o conteúdo.
         */
        if (
          mensagemReal.type ===
          'text'
        ) {
          const textoOptimistic =
            optimistic.text?.trim() ||
            ''

          const textoReal =
            mensagemReal.text?.trim() ||
            ''

          if (
            textoOptimistic !==
            textoReal
          ) {
            continue
          }
        } else {
          /*
           * MÍDIA:
           *
           * Não comparamos URL porque:
           *
           * optimistic → blob:
           * real       → URL assinada B2
           *
           * Nome e tamanho são características
           * mais estáveis para reconciliação.
           */
          const nomeOptimistic =
            optimistic.media?.name ||
            ''

          const nomeReal =
            mensagemReal.media?.name ||
            ''

          const tamanhoOptimistic =
            optimistic.media?.size

          const tamanhoReal =
            mensagemReal.media?.size

          if (
            nomeOptimistic &&
            nomeReal &&
            nomeOptimistic !==
              nomeReal
          ) {
            continue
          }

          if (
            typeof tamanhoOptimistic ===
              'number' &&
            typeof tamanhoReal ===
              'number' &&
            tamanhoOptimistic !==
              tamanhoReal
          ) {
            continue
          }
        }

        if (
          diferencaTempo <
          menorDiferenca
        ) {
          menorDiferenca =
            diferencaTempo

          melhorOptimistic =
            optimistic
        }
      }

      if (
        melhorOptimistic
      ) {
        optimisticJaAssociadas.add(
          melhorOptimistic.id
        )

        optimisticSubstituidas.add(
          melhorOptimistic.id
        )
      }
    }

    const ultimoEvento =
      timeline.items[
        timeline.items.length - 1
      ]

    const ultimoEventoMs =
      ultimoEvento
        ? new Date(
            ultimoEvento.evento_em
          ).getTime()
        : 0

    const mensagensExtras =
      messages
        .filter(message => {
          /*
           * A timeline já contém exatamente
           * esta mensagem.
           *
           * Não adicionamos uma segunda bolha.
           * Caso a timeline ainda estivesse sem
           * URL, ela já foi hidratada acima.
           */
          if (
            idsMensagensTimeline.has(
              message.id
            )
          ) {
            return false
          }

          /*
           * Preview optimistic ainda sem
           * mensagem real correspondente.
           */
          if (
            message.id.startsWith(
              'optimistic-'
            )
          ) {
            return (
              !optimisticSubstituidas.has(
                message.id
              )
            )
          }

          /*
           * Mensagem local definitiva que
           * ainda não apareceu na timeline.
           */
          if (!ultimoEventoMs) {
            return false
          }

          return (
            new Date(
              message.timestamp
            ).getTime() >
            ultimoEventoMs
          )
        })
        .map(message => ({
          kind:
            'message' as const,

          key:
            `MENSAGEM_LOCAL:${message.id}`,

          eventAt:
            message.timestamp,

          message,
        }))

    return [
      ...eventosTimelineHidratados,
      ...mensagensExtras,
    ].sort((a, b) => {
      const diferenca =
        new Date(
          a.eventAt
        ).getTime() -
        new Date(
          b.eventAt
        ).getTime()

      if (
        diferenca !== 0
      ) {
        return diferenca
      }

      return a.key.localeCompare(
        b.key
      )
    })
  }, [
    eventosTimeline,
    messages,
    timeline.items,
  ])
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesContentRef = useRef<HTMLDivElement | null>(null);
    const previousConversationIdRef = useRef<string | undefined>(undefined);
    const previousLastTimelineIdRef =
        useRef<string | undefined>(undefined)
    const shouldFollowLatestRef = useRef(true)
    const loadingOlderRef = useRef(false)
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        const container = messagesContainerRef.current;
        if (!container)
            return;
        container.scrollTo({
            top: container.scrollHeight,
            behavior,
        });
    };
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || loading)
            return;
        const lastTimelineItem =
        timelineItems[
            timelineItems.length - 1
        ]
        const conversationChanged =
        previousConversationIdRef.current !==
        conversation?.id
        const lastTimelineItemChanged =
        previousLastTimelineIdRef.current !==
        lastTimelineItem?.key
        previousConversationIdRef.current =
        conversation?.id
        previousLastTimelineIdRef.current =
        lastTimelineItem?.key
        if (conversationChanged) {
            shouldFollowLatestRef.current = true;
            requestAnimationFrame(() => {
                scrollToBottom('auto');
            });
            return;
        }
        if (lastTimelineItemChanged) {
            shouldFollowLatestRef.current = true;
            requestAnimationFrame(() => {
                scrollToBottom('auto');
            });
        }
    }, [
        conversation?.id,
        loading,
        timelineItems,
    ]);
    useEffect(() => {
        const content = messagesContentRef.current;
        if (!content)
            return;
        const observer = new ResizeObserver(() => {
            if (!shouldFollowLatestRef.current)
                return;
            requestAnimationFrame(() => {
                scrollToBottom('auto');
            });
        });
        observer.observe(content);
        return () => {
            observer.disconnect();
        };
    }, [conversation?.id]);
    const handleMessagesScroll = () => {
    const container =
        messagesContainerRef.current
    if (!container) return
    const distanceFromBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight
    shouldFollowLatestRef.current =
        distanceFromBottom < 120
    if (
        container.scrollTop > 80 ||
        !timeline.hasMore ||
        timeline.loadingOlder ||
        loadingOlderRef.current
    ) {
        return
    }
    const scrollHeightAnterior =
        container.scrollHeight
    const scrollTopAnterior =
        container.scrollTop
    loadingOlderRef.current = true
    void timeline
        .carregarAnteriores()
        .finally(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
            const currentContainer =
                messagesContainerRef.current
            if (!currentContainer) {
                loadingOlderRef.current = false
                return
            }
            const diferencaAltura =
                currentContainer.scrollHeight -
                scrollHeightAnterior
            currentContainer.scrollTop =
                scrollTopAnterior +
                diferencaAltura
            loadingOlderRef.current = false
            })
        })
        })
    }
    const handleNavigateToMessage = (
        messageId: string
        ) => {
        setPendingNavigateMessageId(messageId)
        }
    useEffect(() => {
    if (!pendingNavigateMessageId) {
        return
    }
    const element = document.getElementById(
        `message-${pendingNavigateMessageId}`
    )
    if (element) {
        element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        })
        element.classList.add(
        'ring-2',
        'ring-blue-400',
        'ring-offset-2',
        'rounded-xl'
        )
        const timeout = window.setTimeout(() => {
        element.classList.remove(
            'ring-2',
            'ring-blue-400',
            'ring-offset-2',
            'rounded-xl'
        )
        }, 1200)
        setPendingNavigateMessageId(null)
        return () => {
        window.clearTimeout(timeout)
        }
    }
    if (
        timeline.hasMore &&
        !timeline.loadingOlder
    ) {
        void timeline.carregarAnteriores()
        return
    }
    if (
        !timeline.hasMore &&
        !timeline.loadingOlder
    ) {
        setPendingNavigateMessageId(null)
        toast.info(
        'A mensagem original não está mais disponível no histórico.'
        )
    }
    }, [
    pendingNavigateMessageId,
    timelineItems,
    timeline.hasMore,
    timeline.loadingOlder,
    timeline.carregarAnteriores,
    ])
    const responsavel = useMemo(() => attendants.find(attendant => attendant.id === responsavelId), [attendants, responsavelId]);
    const toggleMenu = (menu: HeaderMenu) => {
        setActiveMenu(current => (current === menu ? null : menu));
    };
    const handleAlterarStatusConversa = async () => {
        if (!conversation || alterandoStatusConversa) {
            return;
        }

        const reabrindo = conversation.status === 'encerrada';
        const novoStatus: WhatsAppConversationStatus = reabrindo
            ? 'em_atendimento'
            : 'encerrada';

        setAlterandoStatusConversa(true);

        try {
            await whatsapp.updateConversationStatus(
                conversation.id,
                novoStatus
            );

            toast.success(
                reabrindo
                    ? 'Conversa reaberta.'
                    : 'Conversa encerrada.'
            );

            await onConversationStatusChanged?.();
        } catch (error) {
            console.error(
                '❌ ChatWindow → erro ao alterar status da conversa:',
                error
            );

            toast.error(
                error instanceof Error
                    ? error.message
                    : reabrindo
                        ? 'Não foi possível reabrir a conversa.'
                        : 'Não foi possível encerrar a conversa.'
            );
        } finally {
            setAlterandoStatusConversa(false);
        }
    };

    const handleAssignResponsible = async (id: string) => {
        if (!conversation || assigningResponsible)
            return;
        const previousResponsibleId = responsavelId;
        setAssigningResponsible(true);
        setResponsavelId(id);
        try {
            await whatsapp.assignConversation(conversation.id, id || null);
            setActiveMenu(null);
        }
        catch (error) {
            setResponsavelId(previousResponsibleId);
            console.error('❌ ChatWindow → erro ao atribuir responsável:', error);
        }
        finally {
            setAssigningResponsible(false);
        }
    };
    const handleStartPreQualification = async () => {
    if (!conversation?.id) {
        toast.error('Conversa não encontrada.')
        return
    }
    if (!userProfile) {
        toast.error('Perfil do usuário não encontrado.')
        return
    }
    try {
        await startRealPreQualification({
        conversationId: conversation.id,
        userProfile,
        })
        startPreQualification()
        toast.success('Pré-qualificação iniciada.')
    } catch (error) {
        console.error('Erro ao iniciar pré-qualificação:', error)
        toast.error(
        error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a pré-qualificação.'
        )
    }
    }
    const handleStartRouting = async () => {
    if (!conversation?.id) {
        toast.error('Conversa não encontrada.')
        return
    }

    if (!userProfile) {
        toast.error('Perfil do usuário não encontrado.')
        return
    }

    try {
        await startRealRouting({
        conversationId: conversation.id,
        userProfile,
        })

        startRouting()
        toast.success('Triagem iniciada.')
    } catch (error) {
        console.error('Erro ao iniciar triagem:', error)
        toast.error(
        error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a triagem.'
        )
    }
    }
    const handleTakeOver = async () => {
        if (!conversation?.id || !corretoraId || takingOverAutomation) return;
        setTakingOverAutomation(true);
        try {
            const { data: sessao, error: sessaoError } = await supabase
                .from('whatsapp_automacoes_sessoes')
                .select('id, status')
                .eq('corretora_id', corretoraId)
                .eq('conversa_id', conversation.id)
                .in('status', ['running', 'awaiting_human'])
                .order('iniciado_em', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (sessaoError) throw sessaoError;
            if (!sessao) {
                toast.error('Nenhuma automação ativa encontrada nesta conversa.');
                return;
            }
            const { error: updateError } = await supabase
                .from('whatsapp_automacoes_sessoes')
                .update({ status: 'human', finalizado_em: new Date().toISOString() })
                .eq('id', sessao.id)
                .in('status', ['running', 'awaiting_human']);
            if (updateError) throw updateError;
            setRealAutomationSession(null);
            takeOver();
            toast.success('Atendimento assumido com sucesso.');
        } catch (error) {
            console.error('Erro ao assumir atendimento:', error);
            toast.error(error instanceof Error ? error.message : 'Não foi possível assumir o atendimento.');
        } finally {
            setTakingOverAutomation(false);
        }
    }
    const handleAbrirAgenda = async () => {
        if (!conversation ||
            !corretoraId ||
            carregandoAgenda) {
            return;
        }
        setCarregandoAgenda(true);
        try {
            const clienteCrm = await buscarClienteCrmPorContatoWhatsApp(conversation.contact.id);
            if (!clienteCrm) {
                toast.error('Este contato ainda não está vinculado a um cliente do CRM.');
                return;
            }
            let cliente: AgendaClienteResultado | null = null;
            if (clienteCrm.tipo === 'PF' &&
                clienteCrm.pessoa) {
                cliente = {
                    tipo: 'PESSOA',
                    id: clienteCrm.pessoa.id,
                    nome: conversation.contact.name,
                    nomeSecundario: null,
                    documento: clienteCrm.pessoa.cpf ??
                        null,
                    telefone: conversation.contact.phone ??
                        null,
                    corretorId: null,
                    clienteIdLegado: null,
                    classificacao: null,
                    origemLabel: 'Pessoa CRM',
                };
            }
            if (clienteCrm.tipo === 'PJ' &&
                clienteCrm.empresa) {
                cliente = {
                    tipo: 'EMPRESA',
                    id: clienteCrm.empresa.id,
                    nome: conversation.contact.name,
                    nomeSecundario: null,
                    documento: clienteCrm.empresa.cnpj ??
                        null,
                    telefone: conversation.contact.phone ??
                        null,
                    corretorId: null,
                    clienteIdLegado: null,
                    classificacao: null,
                    origemLabel: 'Empresa CRM',
                };
            }
            if (!cliente) {
                toast.error('Não foi possível identificar o vínculo deste contato com o CRM.');
                return;
            }
            setClienteAgenda(cliente);
            setModalAgendaAberto(true);
        }
        catch (error) {
            console.error('❌ ChatWindow → erro ao preparar compromisso:', error);
            toast.error('Não foi possível abrir o agendamento deste cliente.');
        }
        finally {
            setCarregandoAgenda(false);
        }
    };
    const handleSalvarAgenda = async (payload: NovoCompromissoSubmitPayload) => {
        if (!conversation ||
            !userProfile ||
            !corretoraId) {
            return;
        }
        setSalvandoAgenda(true);
        try {
            const { vinculo, compromissos, } = payload;
            const payloads = compromissos.map(compromisso => ({
                corretoraId,
                responsavelId: conversation.assignedUserId ??
                    userProfile.id,
                criadoPorId: userProfile.id,
                natureza: compromisso.natureza,
                categoria: compromisso.categoria,
                titulo: compromisso.titulo,
                descricao: compromisso.descricao,
                inicioEm: compromisso.inicioEm,
                fimEm: compromisso.fimEm,
                diaInteiro: compromisso.diaInteiro,
                prioridade: compromisso.prioridade,
                crmPessoaId: vinculo?.tipo ===
                    'PESSOA'
                    ? vinculo.id
                    : null,
                crmEmpresaId: vinculo?.tipo ===
                    'EMPRESA'
                    ? vinculo.id
                    : null,
                clienteIdLegado: vinculo?.tipo ===
                    'LEGADO'
                    ? vinculo.id
                    : null,
                tipoOrigem: 'WHATSAPP',
                origemId: conversation.id,
            }));
            if (payloads.length === 1) {
                await criarCompromisso(payloads[0]);
            }
            else {
                await criarCompromissos(payloads);
            }
            setModalAgendaAberto(false);
            setClienteAgenda(null);
            toast.success(payloads.length === 1
                ? 'Compromisso agendado.'
                : `${payloads.length} compromissos agendados.`);
        }
        catch (error) {
            console.error('❌ ChatWindow → erro ao criar compromisso:', error);
            toast.error('Não foi possível criar o compromisso.');
            throw error;
        }
        finally {
            setSalvandoAgenda(false);
        }
    };
    const limparAudioChamada = async () => {
        if (
            callRecorderRef.current &&
            callRecorderRef.current.state !== 'inactive'
            ) {
            callRecorderRef.current.stop()
            }
            callRecorderRef.current = null
    canSendUplinkRef.current = false
    setMicrofoneMutado(false)
    microphoneMutedRef.current = false
    setSpeakerMutado(false)
    if (callOutputGainRef.current) {
    callOutputGainRef.current.disconnect()
    callOutputGainRef.current = null
    }
    if (callMicRef.current) {
        callMicRef.current
        .getTracks()
        .forEach(track => track.stop())
        callMicRef.current = null
    }
    if (callNodeRef.current) {
        callNodeRef.current.disconnect()
        callNodeRef.current = null
    }
    if (
        callAudioContextRef.current &&
        callAudioContextRef.current.state !== 'closed'
    ) {
        await callAudioContextRef.current.close()
    }
    callAudioContextRef.current = null
    }
    const handleToggleMicrofone = () => {
        if (!callMicRef.current) return
        const novoMutado = !microphoneMutedRef.current
        microphoneMutedRef.current = novoMutado
        setMicrofoneMutado(novoMutado)
        }
    const handleToggleSpeaker = () => {
        const gainNode = callOutputGainRef.current
        if (!gainNode) return
        const novoMutado = !speakerMutado
        gainNode.gain.value = novoMutado ? 0 : 1
        setSpeakerMutado(novoMutado)
        }
    const finalizarRegistroLigacao = async (
    falhou = false
    ) => {
    const ligacaoId = callDatabaseIdRef.current
    if (
        !ligacaoId ||
        callFinalizedRef.current
    ) {
        return
    }
    callFinalizedRef.current = true
    if (falhou) {
        await marcarLigacaoFalhou(ligacaoId)
        return
    }
    const duracaoSegundos =
        callConnectedAtRef.current
        ? Math.max(
            0,
            Math.round(
                (Date.now() -
                callConnectedAtRef.current) /
                1000
            )
            )
        : null
    await finalizarLigacaoWhatsApp(
        ligacaoId,
        duracaoSegundos
    )
    }
    const handleLigar = async () => {
        if (!conversation || !corretoraId) return
        if (callSocketRef.current) {
        const ws = callSocketRef.current
        if (ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
            type: 'hangup',
            })
        )
        }
        await finalizarRegistroLigacao()
        ws.close(1000)
        callSocketRef.current = null
        await limparAudioChamada()
        setChamadaStatus('idle')
        toast.success('Ligação encerrada.')
        return
    }
    callDatabaseIdRef.current = null
    callConnectedAtRef.current = null
    callFinalizedRef.current = false
    try {
        setChamadaStatus('starting')
        const audioContext = new AudioContext({
        sampleRate: 16000,
        })
        callAudioContextRef.current = audioContext
        await audioContext.audioWorklet.addModule(
        '/voip-worklet.js'
        )
        const mic =
        await navigator.mediaDevices.getUserMedia({
            audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            },
        })
        callMicRef.current = mic
        const node = new AudioWorkletNode(
        audioContext,
        'voip-io',
        {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
        }
        )
        callNodeRef.current = node
        const micSource =
        audioContext.createMediaStreamSource(mic)
        micSource.connect(node)
        const outputGain = audioContext.createGain()
        outputGain.gain.value = 1
        callOutputGainRef.current = outputGain
        const recordingDestination =
        audioContext.createMediaStreamDestination()
        micSource.connect(recordingDestination)
        node.connect(recordingDestination)
        node.connect(outputGain)
        outputGain.connect(audioContext.destination)
        const recorder = new MediaRecorder(
        recordingDestination.stream
        )
        callRecorderRef.current = recorder
        callRecordingChunksRef.current = []
        recorder.ondataavailable = event => {
        if (event.data.size > 0) {
            callRecordingChunksRef.current.push(event.data)
        }
        }
        recorder.onstop = () => {
        const chunks = [
            ...callRecordingChunksRef.current,
        ]
        callRecordingChunksRef.current = []
        const ligacaoId =
            callDatabaseIdRef.current
        if (
            !ligacaoId ||
            !conversation?.id ||
            chunks.length === 0
        ) {
            return
        }
        const blob = new Blob(chunks, {
            type:
            recorder.mimeType ||
            'audio/webm',
        })
        if (blob.size <= 0) {
            return
        }
        void uploadCallRecording({
            conversationId: conversation.id,
            ligacaoId,
            blob,
        })
            .then(resultado => {
            console.log(
                '🎙️ Gravação da ligação salva:',
                {
                ligacaoId,
                arquivoId:
                    resultado.arquivoId,
                size:
                    resultado.size,
                }
            )
            void timeline.atualizarRecentes()
            })
            .catch(error => {
            console.error(
                '❌ Erro ao salvar gravação da ligação:',
                error
            )
            toast.error(
                error instanceof Error
                ? error.message
                : 'Não foi possível salvar a gravação da ligação.'
            )
            })
        }
        const ligacaoId = await criarLigacaoWhatsApp({
            corretoraId,
            conversaId: conversation.id,
            contatoId: conversation.contact.id,
            criadoPorId: userProfile?.id ?? null,
            })
            callDatabaseIdRef.current = ligacaoId
            const session = await iniciarChamadaDapi(
            corretoraId,
            conversation.contact.phone
            )
            await marcarLigacaoIniciada({
            ligacaoId,
            instanciaId: session.instanciaId,
            providerCallId: session.callId,
            })
        const ws = new WebSocket(session.wsUrl)
        ws.binaryType = 'arraybuffer'
        callSocketRef.current = ws
        canSendUplinkRef.current = false
        node.port.onmessage = event => {
        if (
            event.data?.kind === 'out' &&
            canSendUplinkRef.current &&
            ws.readyState === WebSocket.OPEN
        ) {
            if (microphoneMutedRef.current) {
            ws.send(
                new ArrayBuffer(event.data.pcm.byteLength)
            )
            } else {
            ws.send(event.data.pcm)
            }
        }
        }
        ws.onmessage = event => {
        if (typeof event.data !== 'string') {
            if (event.data instanceof ArrayBuffer) {
            node.port.postMessage(
                {
                kind: 'in',
                pcm: event.data,
                },
                [event.data]
            )
            }
            return
        }
        try {
            const mensagem = JSON.parse(event.data)
            switch (mensagem.type) {
            case 'calling':
            setChamadaStatus('calling')
            break
            case 'ringing':
            setChamadaStatus('ringing')
            if (callDatabaseIdRef.current) {
                void marcarLigacaoTocando(
                callDatabaseIdRef.current
                )
            }
            break
            case 'accepted':
            case 'connected': {
            canSendUplinkRef.current = true
            setChamadaStatus('connected')
            if (!callConnectedAtRef.current) {
                callConnectedAtRef.current = Date.now()
                if (callDatabaseIdRef.current) {
                void marcarLigacaoAtendida(
                    callDatabaseIdRef.current
                )
                }
            }
            if (
                callRecorderRef.current &&
                callRecorderRef.current.state === 'inactive'
            ) {
                callRecorderRef.current.start(1000)
            }
            toast.success('Ligação atendida.')
            break
            }
            case 'ended':
                callSocketRef.current = null
                setChamadaStatus('idle')
                void finalizarRegistroLigacao()
                void limparAudioChamada()
                toast.info('Ligação encerrada.')
                break
            case 'error':
                callSocketRef.current = null
                setChamadaStatus('idle')
                void finalizarRegistroLigacao(true)
                void limparAudioChamada()
                toast.error(
                    mensagem.msg ||
                    'Erro durante a ligação.'
                )
                break
            }
        } catch (error) {
            console.error(
            'Erro ao interpretar evento da chamada:',
            error
            )
        }
        }
        ws.onerror = () => {
        toast.error(
            'Erro na conexão da ligação.'
        )
        }
        ws.onclose = () => {
            callSocketRef.current = null
            canSendUplinkRef.current = false
            setChamadaStatus('idle')
            void finalizarRegistroLigacao()
            void limparAudioChamada()
            }
    } catch (error) {
        console.error(
        'Erro ao iniciar ligação:',
        error
        )
        callSocketRef.current = null
        setChamadaStatus('idle')
        await finalizarRegistroLigacao(true)
        await limparAudioChamada()
        toast.error(
        error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a ligação.'
        )
    }
    }
    if (!conversation) {
        return (<main className="flex h-full min-w-0 flex-1 items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
        <div className="mb-2 text-4xl">💬</div>
        <p className="text-sm">Selecione uma conversa</p>
        </div>
    </main>);
    }

    return (<main className="flex h-full min-w-0 flex-1 flex-col bg-gray-50">
    <header className="relative z-20 shrink-0 border-b bg-white">
        <div className="flex min-h-[76px] items-center gap-3 px-4">
        {onBack && (<button type="button" onClick={onBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 md:hidden" aria-label="Voltar para conversas">
            <ArrowLeft size={20}/>
            </button>)}
        <div className="flex min-w-0 flex-1 items-center gap-3">
            
            
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-semibold text-gray-600">
            {avatarUrl && !avatarComErro ? (
                <img
                src={avatarUrl}
                alt={conversation.contact.name}
                onError={() => {
                    avataresComErroChat.add(avatarUrl)
                    setAvatarComErro(true)
                }}
                className="h-full w-full object-cover"
                />
            ) : (
                conversation.contact.name
                .charAt(0)
                .toUpperCase()
            )}
            </div>


            <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-gray-900">
                {conversation.contact.name}
                </h2>
                <div className="hidden items-center gap-1.5 lg:flex">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    conversation.contact.clienteId
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                    {conversation.contact.clienteId ? 'Cliente CRM' : 'Não vinculado'}
                    </span>
                    {conversation.contact.temperatura && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        conversation.contact.temperatura === 'QUENTE'
                        ? 'bg-orange-50 text-orange-700'
                        : conversation.contact.temperatura === 'MORNO'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                    }`}>
                        {conversation.contact.temperatura === 'QUENTE'
                        ? '🔥 Quente'
                        : conversation.contact.temperatura === 'MORNO'
                            ? '🌤️ Morno'
                            : '❄️ Frio'}
                    </span>
                    )}
                </div>
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">
                {conversation.contact.phone}
            </p>
            </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
            {onOpenContactPanel && (<div className="xl:hidden">
                <HeaderIconButton title="Informações do contato" onClick={onOpenContactPanel}>
                <UserRound size={18}/>
                </HeaderIconButton>
            </div>)}
            <HeaderIconButton title="Agendar compromisso" onClick={() => {
            void handleAbrirAgenda();
        }}>
            {carregandoAgenda ? (<Loader2 size={18} className="animate-spin"/>) : (<CalendarPlus size={18}/>)}
        </HeaderIconButton>
            <div className="relative hidden lg:block">
            <button type="button" disabled={!podeAlterarResponsavel} onClick={() => {
            if (podeAlterarResponsavel) {
                toggleMenu('responsavel');
            }
        }} className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition ${podeAlterarResponsavel
            ? activeMenu === 'responsavel'
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            : 'cursor-default border-gray-200 bg-gray-50 text-gray-500'}`}>
                <UserRound size={15}/>
                <span className="max-w-[110px] truncate">
                {responsavel?.name || 'Não atribuído'}
                </span>
                {podeAlterarResponsavel && <ChevronDown size={14}/>}
            </button>
            {podeAlterarResponsavel && activeMenu === 'responsavel' && (<ResponsavelMenu attendants={attendants} responsavelId={responsavelId} loading={loadingAttendants} assigning={assigningResponsible} onSelect={handleAssignResponsible}/>)}
            </div>
            <div className="relative">
            <HeaderIconButton title="Central de documentos" active={activeMenu === 'documentos'} onClick={() => toggleMenu('documentos')}>
                <FolderOpen size={18}/>
            </HeaderIconButton>
            {activeMenu === 'documentos' && (<DocumentosMenu conversationId={conversation.id} onClose={() => setActiveMenu(null)} onAdicionarDocumento={() => {
                setActiveMenu(null);
                setModalDocumentoAberto(true);
            }} refreshKey={documentosRefreshKey}/>)}
            </div>
            <HeaderIconButton
            title={
                chamadaStatus === 'idle'
                ? 'Ligar'
                : 'Encerrar ligação'
            }
            onClick={() => {
                void handleLigar()
            }}
            >
            {chamadaStatus === 'starting' ? (
                <Loader2
                size={18}
                className="animate-spin"
                />
            ) : (
                <Phone size={18} />
            )}
            </HeaderIconButton>
            <HeaderIconButton
            title={
                conversation.status === 'encerrada'
                    ? 'Reabrir conversa'
                    : 'Encerrar conversa'
            }
            onClick={() => {
                void handleAlterarStatusConversa()
            }}
            >
            {alterandoStatusConversa ? (
                <Loader2
                size={18}
                className="animate-spin"
                />
            ) : conversation.status === 'encerrada' ? (
                <RotateCcw size={18} />
            ) : (
                <Archive size={18} />
            )}
            </HeaderIconButton>
        </div>
        </div>
        <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 lg:hidden">
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
            Cliente
        </span>
        <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700">
            🔥 Quente
        </span>
        <button type="button" onClick={() => toggleMenu('responsavel')} className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100">
            <UserRound size={13}/>
            {responsavel?.name || 'Não atribuído'}
            <ChevronDown size={12}/>
        </button>
        {activeMenu === 'responsavel' && (<ResponsavelMenu attendants={attendants} responsavelId={responsavelId} loading={loadingAttendants} assigning={assigningResponsible} mobile onSelect={handleAssignResponsible}/>)}
        </div>
    </header>
    <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto p-4">
    {loading ? (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Carregando histórico...
    </div>
    ) : timelineItems.length === 0 ? (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Nenhum registro nesta conversa.
    </div>
    ) : (
    <div
    ref={messagesContentRef}
    className="mx-auto flex max-w-4xl flex-col gap-2"
    >
    {timeline.loadingOlder && (
        <div className="flex justify-center py-2">
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm">
            <Loader2
            size={14}
            className="animate-spin"
            />
            Carregando mensagens anteriores...
        </div>
        </div>
    )}
    {timelineItems.map(item =>
    item.kind === 'message' ? (
        <MessageBubble
        key={item.key}
        message={item.message}
        onReply={setReplyMessage}
        onNavigateToMessage={
            handleNavigateToMessage
        }
        onReact={
            handleReactMessage
        }
        onCreateTask={
            handleCreateTaskFromMessage
        }
        onForward={
            handleForwardMessage
        }
        onDelete={
            handleDeleteMessage
        }
        onOpenSharedContact={
            onOpenSharedContact
        }
        />
    ) : (
        <CallTimelineItem
        key={item.key}
        call={item.call}
        />
    )
    )}
    </div>
    )}
    </div>
    <MessageComposer
        replyMessage={replyMessage}
        onCancelReply={() => setReplyMessage(null)}
        automationState={automationStatePersisted}
        automationHistory={automationHistory}
        onStartPreQualification={handleStartPreQualification}
        onStartRouting={handleStartRouting}
        onTakeOverAutomation={handleTakeOver}
        onSend={async data => {
        try {
            await send(data)

            setReplyMessage(
            null,
            )
        } catch (error) {
            if (
            isStorageLimitError(
                error,
            )
            ) {
            await storageCommercial
                .abrirModalArmazenamento()

            return
            }

            throw error
        }
        }}
        quickReplyVariables={{
        nome: conversation.contact.name,
        corretor: userProfile?.nome ?? null,
        corretora: userProfile?.tipo_usuario === 'CORRETORA'
            ? userProfile.nome ?? null
            : null,
        }}
    />
    {corretoraId && (<ModalNovoCompromisso aberto={modalAgendaAberto} corretoraId={corretoraId} clienteInicial={clienteAgenda} bloquearClienteInicial salvando={salvandoAgenda} onClose={() => {
                if (salvandoAgenda) {
                    return;
                }
                setModalAgendaAberto(false);
                setClienteAgenda(null);
            }} onSubmit={handleSalvarAgenda}/>)}
    {modalDocumentoAberto && conversation && (
        <ModalAdicionarDocumento
            conversationId={
                conversation.id
            }
            contatoId={
                conversation.contact.id
            }
            onClose={() => {
                setModalDocumentoAberto(
                false
                )
            }}
            onSuccess={() => {
                setDocumentosRefreshKey(
                current =>
                    current + 1
                )
            }}
            onStorageLimit={
                storageCommercial
                    .abrirModalArmazenamento
            }
            />)}
    {chamadaStatus !== 'idle' && (
        <CallModal
            open
            contactName={conversation.contact.name}
            phone={conversation.contact.phone}
            status={chamadaStatus}
            muted={microfoneMutado}
            speakerMuted={speakerMutado}
            onToggleMute={handleToggleMicrofone}
            onToggleSpeaker={handleToggleSpeaker}
            onHangup={() => {
                void handleLigar()
            }}
            />
        )}

        <ModalArmazenamento
            {...storageCommercial.modalProps}
        />
    <ModalCriarTarefaWhatsApp
    open={Boolean(taskMessage)}
    messageText={
        taskMessage?.text
    }
    saving={savingTask}
    onClose={() => {
        if (savingTask) {
        return
        }
        setTaskMessage(null)
    }}
    onSave={handleSaveTask}
    />
    {forwardMessage && (
    <ModalEncaminharMensagem
        open
        message={forwardMessage}
        currentConversationId={
        conversation.id
        }
        sending={forwardingMessage}
        onClose={() => {
        if (forwardingMessage) {
            return
        }
        setForwardMessage(null)
        }}
        onForward={
        handleConfirmForward
        }
    />
    )}
    {deleteMessage && (
    <ModalExcluirMensagem
        open
        message={deleteMessage}
        deleting={deletingMessage}
        onClose={() => {
        if (deletingMessage) {
            return
        }
        setDeleteMessage(null)
        }}
        onConfirm={
        handleConfirmDelete
        }
    />
    )}
    </main>
    )
    }
function HeaderIconButton({ title, active, onClick, children, }: {
    title: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (<button type="button" title={title} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${active
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
    {children}
    </button>);
}
function ResponsavelMenu({ attendants, responsavelId, onSelect, loading, assigning, mobile = false, }: {
    attendants: WhatsAppAttendant[];
    responsavelId: string;
    onSelect: (id: string) => void | Promise<void>;
    loading: boolean;
    assigning: boolean;
    mobile?: boolean;
}) {
    const getInitials = (name: string) => {
        const parts = name
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (parts.length === 0)
            return '?';
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    };
    return (<div className={`absolute z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${mobile
            ? 'right-4 top-[112px] w-[260px]'
            : 'right-0 top-[44px] w-[260px]'}`}>
    <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Responsável pelo atendimento
        </p>
    </div>
    <div className="max-h-[320px] overflow-y-auto p-2">
        {loading ? (<div className="px-3 py-5 text-center text-xs text-gray-400">
            Carregando responsáveis...
        </div>) : attendants.length === 0 ? (<div className="px-3 py-5 text-center text-xs text-gray-400">
            Nenhum responsável disponível.
        </div>) : (attendants.map(attendant => {
            const selected = attendant.id === responsavelId;
            return (<button key={attendant.id} type="button" disabled={assigning} onClick={() => {
                    void onSelect(attendant.id);
                }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600">
                {attendant.avatar ? (<img src={attendant.avatar} alt={attendant.name} className="h-full w-full object-cover"/>) : (getInitials(attendant.name))}
                </div>
                <div className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-700">
                    {attendant.name}
                </span>
                <span className="block text-[10px] text-gray-400">
                    {attendant.type === 'CORRETORA'
                    ? 'Corretora'
                    : attendant.type === 'ADMIN'
                        ? 'Administrador'
                        : 'Corretor'}
                </span>
                </div>
                {selected && (<Check size={16} className="shrink-0 text-blue-600"/>)}
            </button>);
        }))}
        <button type="button" disabled={assigning} onClick={() => {
            void onSelect('');
        }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <UserRound size={14}/>
        </div>
        <span className="min-w-0 flex-1">
            Não atribuído
        </span>
        {!responsavelId && (<Check size={16} className="shrink-0 text-blue-600"/>)}
        </button>
    </div>
    </div>);
}
