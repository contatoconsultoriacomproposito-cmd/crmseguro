import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import type { MessageType, SendMessageData, WhatsAppMessage } from '../types/whatsapp'
import type { AutomationMachineState } from '../automation/engine/automationMachine'
import { Bot, CheckCircle2, FileText, Image, Loader2, Mic, Paperclip, Route, SendHorizontal, Square, UserRoundCheck, Video, X, Zap, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { applyQuickReplyVariables, createQuickReply, deleteQuickReply, listQuickReplies, updateQuickReply, type QuickReply, type QuickReplyScope } from '../services/quickReplyService'
interface MessageComposerProps {
  onSend: (data: Omit<SendMessageData, 'conversationId'>) => Promise<void>
  replyMessage?: WhatsAppMessage | null
  onCancelReply?: () => void
  automationState?: AutomationMachineState | null
  automationHistory?: AutomationHistory
  onStartPreQualification?: () => void
  onStartRouting?: () => void
  onTakeOverAutomation?: () => void
    quickReplyVariables?: {
    nome?: string | null
    corretora?: string | null
    corretor?: string | null
  }
}
interface AutomationHistory {
  preQualificationExecuted: boolean
  routingExecuted: boolean
}
type AttachmentType = 'image' | 'video' | 'audio' | 'document'
interface RecordedAudioDraft {
  file: File
  url: string
}
function getSupportedAudioMimeType(): string {
  const types = [
    'audio/ogg;codecs=opus',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}
function getAudioExtension(mimeType: string): string {
  if (mimeType.includes('ogg')) {
    return 'ogg'
  }
  if (mimeType.includes('mp4')) {
    return 'm4a'
  }
  if (mimeType.includes('webm')) {
    return 'webm'
  }
  return 'webm'
}
function formatRecordingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}
export default function MessageComposer({
  onSend,
  replyMessage,
  onCancelReply,
  automationState,
  automationHistory,
  onStartPreQualification,
  onStartRouting,
  onTakeOverAutomation,
  quickReplyVariables,
}: MessageComposerProps) {
  const { userProfile } = useAuth()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingError, setRecordingError] = useState('')
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudioDraft | null>(null)
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [automationMenuOpen, setAutomationMenuOpen] = useState(false)
  const [selectedAttachmentType, setSelectedAttachmentType] = useState<AttachmentType>('document')
  const [quickReplyMenuOpen, setQuickReplyMenuOpen] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [quickReplyLoading, setQuickReplyLoading] = useState(false)
  const [quickReplySearch, setQuickReplySearch] = useState('')
  const [quickReplyMode, setQuickReplyMode] = useState<'list' | 'form'>('list')
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null)
  const [quickReplyTitle, setQuickReplyTitle] = useState('')
  const [quickReplyText, setQuickReplyText] = useState('')
  const [quickReplyShortcut, setQuickReplyShortcut] = useState('')
  const [quickReplyScope, setQuickReplyScope] = useState<QuickReplyScope>('pessoal')
  const [quickReplySaving, setQuickReplySaving] = useState(false)
  const [quickReplyDeletingId, setQuickReplyDeletingId] = useState<string | null>(null)
  const [quickReplyError, setQuickReplyError] = useState('')






  const fileInput = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const quickReplyMenuRef = useRef<HTMLDivElement>(null)
  const automationMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node

    if (attachmentMenuOpen && attachmentMenuRef.current && !attachmentMenuRef.current.contains(target)) {
      setAttachmentMenuOpen(false)
    }

    if (quickReplyMenuOpen && quickReplyMenuRef.current && !quickReplyMenuRef.current.contains(target)) {
      setQuickReplyMenuOpen(false)
      setQuickReplySearch('')
    }

    if (automationMenuOpen && automationMenuRef.current && !automationMenuRef.current.contains(target)) {
      setAutomationMenuOpen(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [attachmentMenuOpen, quickReplyMenuOpen, automationMenuOpen])


  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelRecordingRef = useRef(false)
  const recordedAudioRef = useRef<RecordedAudioDraft | null>(null)
  useEffect(() => {
    if (!replyMessage) {
      return
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      onCancelReply?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [replyMessage, onCancelReply])
  const stopRecordingTimer = () => {
    if (!recordingTimerRef.current) {
      return
    }
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }
  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop())
    mediaStreamRef.current = null
  }
  const cleanupRecording = () => {
    stopRecordingTimer()
    stopMediaStream()
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    setRecording(false)
    setRecordingTime(0)
  }
  const resetTextareaHeight = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = 'auto'
  }
  const resizeTextarea = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = 'auto'
    const maxHeight = 120
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }
  const closeComposerMenus = () => {
    setAttachmentMenuOpen(false)
    setAutomationMenuOpen(false)
    setQuickReplyMenuOpen(false)
  }
  const send = async () => {
    const value = text.trim()
    if (!value || sending || recording || recordedAudio) {
      return
    }
    setSending(true)
    setRecordingError('')
    closeComposerMenus()
    try {
      await onSend({
        text: value,
        type: 'text',
        replyToProviderMessageId: replyMessage?.providerMessageId,
      })
      setText('')
      requestAnimationFrame(() => {
        resetTextareaHeight()
        textareaRef.current?.focus()
      })
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
    } finally {
      setSending(false)
    }
  }
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
    requestAnimationFrame(
      resizeTextarea
    )
  }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }
  const openFilePicker = (
    type: AttachmentType
  ) => {
    if (sending || recording || recordedAudio) {
      return
    }
    setSelectedAttachmentType(type)
    closeComposerMenus()
    requestAnimationFrame(() => fileInput.current?.click())
  }

  const sendAttachmentFile = async (
    file: File
  ) => {
    if (
      !file ||
      sending ||
      recording ||
      recordedAudio
    ) {
      return
    }

    const type =
      getMessageTypeFromFile(
        file,
        'document'
      )

    const objectUrl =
      URL.createObjectURL(file)

    const media = {
      url: objectUrl,
      type,
      name: file.name,
      size: file.size,
    }

    setSending(true)
    setRecordingError('')
    closeComposerMenus()

    try {
      await onSend({
        type,
        media,
        file,
        replyToProviderMessageId:
          replyMessage?.providerMessageId,
      })
    } catch (error) {
      console.error(
        '❌ Erro ao enviar arquivo:',
        error
      )
    } finally {
      setSending(false)
      URL.revokeObjectURL(
        objectUrl
      )
    }
  }


  const handleFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      event.target.value = ''
      return
    }

    await sendAttachmentFile(file)

    event.target.value = ''
  }

  const handlePaste = (
    event: React.ClipboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      sending ||
      recording ||
      recordedAudio
    ) {
      return
    }

    const items =
      Array.from(
        event.clipboardData.items
      )

    const imageItem =
      items.find(
        item =>
          item.kind === 'file' &&
          item.type.startsWith(
            'image/'
          )
      )

    if (!imageItem) {
      return
    }

    const clipboardFile =
      imageItem.getAsFile()

    if (!clipboardFile) {
      return
    }

    event.preventDefault()

    const mimeType =
      clipboardFile.type ||
      'image/png'

    let extension = 'png'

    if (
      mimeType === 'image/jpeg'
    ) {
      extension = 'jpg'
    } else if (
      mimeType === 'image/webp'
    ) {
      extension = 'webp'
    } else if (
      mimeType === 'image/gif'
    ) {
      extension = 'gif'
    }

    const file = new File(
      [clipboardFile],
      `print-${Date.now()}.${extension}`,
      {
        type: mimeType,
        lastModified:
          Date.now(),
      }
    )

    void sendAttachmentFile(
      file
    )
  }


  const startRecording = async () => {
    if (sending || recording || recordedAudio) {
      return
    }
    setRecordingError('')
    closeComposerMenus()
    if (!navigator.mediaDevices ?.getUserMedia) {
      setRecordingError('Seu navegador não permite acesso ao microfone neste ambiente.')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setRecordingError('Seu navegador não oferece suporte à gravação de áudio.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia( { audio: true, } )
      const mimeType = getSupportedAudioMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream)
      audioChunksRef.current = []
      cancelRecordingRef.current = false
      mediaStreamRef.current = stream
      mediaRecorderRef.current =
        recorder
      recorder.ondataavailable =
        event => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(
              event.data
            )
          }
        }
      recorder.onstop = () => {
        const wasCancelled = cancelRecordingRef.current
        const chunks = [
          ...audioChunksRef.current,
        ]
        const actualMimeType = recorder.mimeType || mimeType || 'audio/webm'
        cleanupRecording()
        if (wasCancelled || chunks.length === 0) {
          return
        }
        const blob = new Blob(chunks, {
          type: actualMimeType,
        })
        if (!blob.size) {
          setRecordingError('Não foi possível capturar o áudio.')
          return
        }
        const extension = getAudioExtension( actualMimeType )
        const file = new File(
          [blob],
          `audio-${Date.now()}.${extension}`,
          {
            type: actualMimeType,
            lastModified: Date.now(),
          }
        )
        const url = URL.createObjectURL(file)
        const draft = {
          file,
          url,
        }
        recordedAudioRef.current = draft
        setRecordedAudio(draft)
      }
      recorder.onerror = () => {
        setRecordingError('Ocorreu um erro durante a gravação.')
        cancelRecordingRef.current = true
        cleanupRecording()
      }
      recorder.start()
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current =
        setInterval(() => {
          setRecordingTime(
            current => current + 1
          )
        }, 1000)
    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error)
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setRecordingError('Permissão para usar o microfone foi negada.')
        } else if (
          error.name ===
          'NotFoundError'
        ) {
          setRecordingError('Nenhum microfone foi encontrado neste dispositivo.')
        } else {
          setRecordingError('Não foi possível iniciar a gravação de áudio.')
        }
      } else {
        setRecordingError('Não foi possível iniciar a gravação de áudio.')
      }
      cleanupRecording()
    }
  }
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      return
    }
    stopRecordingTimer()
    recorder.stop()
  }
  const cancelRecording = () => {
    cancelRecordingRef.current = true
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      cleanupRecording()
    }
    setRecordingError('')
  }
  const discardRecordedAudio = () => {
    const draft = recordedAudioRef.current
    if (draft) {
      URL.revokeObjectURL(draft.url)
    }
    recordedAudioRef.current = null
    setRecordedAudio(null)
    setRecordingError('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
  const sendRecordedAudio = async () => {
  const draft = recordedAudioRef.current

  if (!draft || sending) {
    return
  }

  setSending(true)
  setRecordingError('')

  try {
    await onSend({
      type: 'audio',
      media: {
        url: draft.url,
        type: 'audio',
        name: draft.file.name,
        size: draft.file.size,
      },
      file: draft.file,
      replyToProviderMessageId:
        replyMessage?.providerMessageId,
    })

    URL.revokeObjectURL(draft.url)
    recordedAudioRef.current = null
    setRecordedAudio(null)

    requestAnimationFrame(() =>
      textareaRef.current?.focus()
    )
  } catch (error) {
    console.error(
      '❌ Erro ao enviar áudio gravado:',
      error
    )

    setRecordingError(
      'Não foi possível enviar o áudio. Você pode tentar novamente ou descartá-lo.'
    )
  } finally {
    setSending(false)
  }
}
  const handleQuickReply = async () => {
    if (sending || recording || recordedAudio || !userProfile) return

    if (quickReplyMenuOpen) {
      setQuickReplyMenuOpen(false)
      return
    }

    setAttachmentMenuOpen(false)
    setAutomationMenuOpen(false)
    setQuickReplyMenuOpen(true)
    setQuickReplySearch('')

    try {
      setQuickReplyLoading(true)
      const respostas = await listQuickReplies(userProfile)
      setQuickReplies(respostas)
    } catch (error) {
      console.error('❌ Erro ao carregar respostas rápidas:', error)
      setQuickReplies([])
    } finally {
      setQuickReplyLoading(false)
    }
  }

  const resetQuickReplyForm = () => {
  setEditingQuickReply(null)
  setQuickReplyTitle('')
  setQuickReplyText('')
  setQuickReplyShortcut('')
  setQuickReplyScope('pessoal')
  setQuickReplyError('')
}

const reloadQuickReplies = async () => {
  if (!userProfile) return
  const respostas = await listQuickReplies(userProfile)
  setQuickReplies(respostas)
}

const handleSelectQuickReply = (reply: QuickReply) => {
  const processedText = applyQuickReplyVariables(reply.texto, quickReplyVariables ?? {})
  setText(processedText)
  setQuickReplyMenuOpen(false)
  setQuickReplySearch('')
  requestAnimationFrame(() => {
    resizeTextarea()
    textareaRef.current?.focus()
    textareaRef.current?.setSelectionRange(processedText.length, processedText.length)
  })
}

const handleNewQuickReply = () => {
  resetQuickReplyForm()
  setQuickReplyMode('form')
}

const handleEditQuickReply = (reply: QuickReply) => {
  setEditingQuickReply(reply)
  setQuickReplyTitle(reply.titulo)
  setQuickReplyText(reply.texto)
  setQuickReplyShortcut(reply.atalho ?? '')
  setQuickReplyScope(reply.escopo)
  setQuickReplyError('')
  setQuickReplyMode('form')
}

const handleCancelQuickReplyForm = () => {
  resetQuickReplyForm()
  setQuickReplyMode('list')
}

const handleSaveQuickReply = async () => {
  if (!userProfile || quickReplySaving) return

  if (!quickReplyTitle.trim()) {
    setQuickReplyError('Informe um título.')
    return
  }

  if (!quickReplyText.trim()) {
    setQuickReplyError('Informe a mensagem.')
    return
  }

  try {
    setQuickReplySaving(true)
    setQuickReplyError('')

    const payload = {
      titulo: quickReplyTitle,
      texto: quickReplyText,
      atalho: quickReplyShortcut,
      escopo: userProfile.tipo_usuario === 'CORRETORA' ? quickReplyScope : 'pessoal' as QuickReplyScope,
    }

    if (editingQuickReply) {
      await updateQuickReply(editingQuickReply.id, userProfile, payload)
    } else {
      await createQuickReply(userProfile, payload)
    }

    await reloadQuickReplies()
    resetQuickReplyForm()
    setQuickReplyMode('list')
  } catch (error) {
    setQuickReplyError(error instanceof Error ? error.message : 'Não foi possível salvar a resposta rápida.')
  } finally {
    setQuickReplySaving(false)
  }
}

const handleDeleteQuickReply = async (reply: QuickReply) => {
  if (!userProfile || quickReplyDeletingId) return
  if (!window.confirm(`Excluir a resposta rápida "${reply.titulo}"?`)) return

  try {
    setQuickReplyDeletingId(reply.id)
    setQuickReplyError('')
    await deleteQuickReply(reply.id, userProfile)
    await reloadQuickReplies()
  } catch (error) {
    setQuickReplyError(error instanceof Error ? error.message : 'Não foi possível excluir a resposta rápida.')
  } finally {
    setQuickReplyDeletingId(null)
  }
}

const filteredQuickReplies = quickReplies.filter(reply => {
  const search = quickReplySearch.trim().toLowerCase()
  if (!search) return true
  return reply.titulo.toLowerCase().includes(search)
    || reply.texto.toLowerCase().includes(search)
    || reply.atalho?.toLowerCase().includes(search)
})

const canManageQuickReply = (reply: QuickReply) => {
  if (!userProfile) return false
  if (reply.escopo === 'corretora') return userProfile.tipo_usuario === 'CORRETORA'
  return reply.criado_por === userProfile.id
}
  
 
  const toggleAttachmentMenu = () => {
    if (sending || recording || recordedAudio) return

    setQuickReplyMenuOpen(false)
    setQuickReplySearch('')
    setAutomationMenuOpen(false)
    setAttachmentMenuOpen(current => !current)
  }

  const toggleAutomationMenu = () => {
    if (sending || recording || recordedAudio) return

    setAttachmentMenuOpen(false)
    setQuickReplyMenuOpen(false)
    setQuickReplySearch('')
    setAutomationMenuOpen(current => !current)
  }
  const handleStartPreQualification = () => {
    setAutomationMenuOpen(false)
    onStartPreQualification?.()
  }
  const handleStartRouting = () => {
    setAutomationMenuOpen(false)
    onStartRouting?.()
  }
  const handleTakeOverAutomation = () => {
    setAutomationMenuOpen(false)
    onTakeOverAutomation?.()
  }
  useEffect(() => {
    return () => {
      stopRecordingTimer()
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        cancelRecordingRef.current = true
        recorder.stop()
      }
      stopMediaStream()
      const draft = recordedAudioRef.current
      if (draft) {
        URL.revokeObjectURL(draft.url)
        recordedAudioRef.current = null
      }
    }
  }, [])
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5">
      {replyMessage && (
        <ReplyPreview
          message={replyMessage}
          onCancel={() =>
            onCancelReply?.()
          }
        />
      )}
      {recordingError && (
        <div className="mb-2 flex items-start justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          <p className="min-w-0 flex-1 text-xs leading-4 text-red-600">
            {recordingError}
          </p>
          <button
            type="button"
            onClick={() =>
              setRecordingError('')
            }
            title="Fechar aviso"
            className="shrink-0 rounded p-0.5 text-red-400 transition hover:bg-red-100 hover:text-red-600"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {recording ? (
        <RecordingComposer
          recordingTime={ recordingTime }
          sending={sending}
          onCancel={ cancelRecording }
          onStop={stopRecording}
        />
      ) : recordedAudio ? (
        <RecordedAudioPreview
          audio={recordedAudio}
          sending={sending}
          onDiscard={ discardRecordedAudio }
          onSend={() =>
            void sendRecordedAudio()
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50">
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Digite uma mensagem..."
            disabled={sending}
            className="block max-h-[120px] min-h-[44px] w-full resize-none overflow-y-auto bg-transparent px-3.5 pb-2 pt-3 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:bg-slate-50"
          />
          <div className="flex min-h-[40px] items-center gap-1 border-t border-slate-100 px-2 py-1.5">
            <div ref={attachmentMenuRef} className="relative">
              <ComposerButton
                title="Anexar"
                active={ attachmentMenuOpen }
                disabled={sending}
                onClick={ toggleAttachmentMenu }
              >
                <Paperclip
                  size={17}
                />
              </ComposerButton>
              {attachmentMenuOpen && (
                <AttachmentMenu
                  onSelect={ openFilePicker }
                  onClose={() =>
                    setAttachmentMenuOpen(false)
                  }
                />
              )}
            </div>
            <div ref={quickReplyMenuRef} className="relative">
            <ComposerButton
              title="Respostas rápidas"
              active={quickReplyMenuOpen}
              disabled={sending}
              onClick={() => void handleQuickReply()}
            >
              <Zap size={16} />
            </ComposerButton>

              {quickReplyMenuOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-2 w-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  {quickReplyMode === 'list' ? (
                    <>
                      <div className="border-b border-slate-100 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Zap size={16} className="text-amber-500" />
                            <span className="text-sm font-semibold text-slate-800">Respostas rápidas</span>
                          </div>
                          <button type="button" onClick={handleNewQuickReply} title="Nova resposta rápida" className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50">
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5">
                          <Search size={14} className="shrink-0 text-slate-400" />
                          <input
                            type="text"
                            value={quickReplySearch}
                            onChange={event => setQuickReplySearch(event.target.value)}
                            placeholder="Buscar resposta ou atalho..."
                            className="h-9 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                            autoFocus
                          />
                        </div>
                      </div>

                      {quickReplyError && (
                        <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                          {quickReplyError}
                        </div>
                      )}

                      <div className="max-h-72 overflow-y-auto p-1.5">
                        {quickReplyLoading ? (
                          <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500">
                            <Loader2 size={16} className="animate-spin" />
                            Carregando respostas...
                          </div>
                        ) : filteredQuickReplies.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-slate-500">
                            Nenhuma resposta rápida encontrada.
                          </div>
                        ) : (
                          filteredQuickReplies.map(reply => (
                            <div key={reply.id} className="group flex items-start gap-1 rounded-lg transition hover:bg-slate-50">
                              <button type="button" onClick={() => handleSelectQuickReply(reply)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-slate-800">{reply.titulo}</span>
                                  {reply.atalho && (
                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                                      {reply.atalho}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{reply.texto}</p>
                                <span className="mt-1.5 inline-block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                  {reply.escopo === 'corretora' ? 'Padrão da equipe' : 'Pessoal'}
                                </span>
                              </button>

                              {canManageQuickReply(reply) && (
                                <div className="flex shrink-0 gap-0.5 pr-2 pt-2">
                                  <button type="button" onClick={() => handleEditQuickReply(reply)} title="Editar resposta" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-600">
                                    <Pencil size={14} />
                                  </button>
                                  <button type="button" onClick={() => void handleDeleteQuickReply(reply)} disabled={quickReplyDeletingId === reply.id} title="Excluir resposta" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                                    {quickReplyDeletingId === reply.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="border-t border-slate-100 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickReplyMenuOpen(false)
                            setQuickReplySearch('')
                            resetQuickReplyForm()
                            setQuickReplyMode('list')
                          }}
                          className="w-full rounded-lg px-3 py-1.5 text-left text-[11px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                        >
                          Fechar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border-b border-slate-100 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {editingQuickReply ? 'Editar resposta rápida' : 'Nova resposta rápida'}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {editingQuickReply ? 'Altere os dados da resposta.' : 'Crie uma mensagem para reutilizar no atendimento.'}
                            </p>
                          </div>
                          <button type="button" onClick={handleCancelQuickReplyForm} title="Cancelar" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                            <X size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 p-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Título</label>
                          <input
                            type="text"
                            value={quickReplyTitle}
                            onChange={event => setQuickReplyTitle(event.target.value)}
                            placeholder="Ex.: Envio de proposta"
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Atalho</label>
                          <input
                            type="text"
                            value={quickReplyShortcut}
                            onChange={event => setQuickReplyShortcut(event.target.value)}
                            placeholder="/proposta"
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Mensagem</label>
                          <textarea
                            value={quickReplyText}
                            onChange={event => setQuickReplyText(event.target.value)}
                            placeholder="Digite a mensagem..."
                            rows={5}
                            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                          />
                          <p className="mt-1 text-[10px] text-slate-400">
                            Variáveis disponíveis: {'{nome}'}, {'{corretor}'}, {'{corretora}'}
                          </p>
                        </div>

                        {userProfile?.tipo_usuario === 'CORRETORA' && (
                          <div>
                            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Disponibilidade</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setQuickReplyScope('pessoal')}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${quickReplyScope === 'pessoal' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                Pessoal
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickReplyScope('corretora')}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${quickReplyScope === 'corretora' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                Padrão da equipe
                              </button>
                            </div>
                          </div>
                        )}

                        {userProfile?.tipo_usuario !== 'CORRETORA' && (
                          <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                            Esta resposta será salva como pessoal e ficará disponível somente para você.
                          </div>
                        )}

                        {quickReplyError && (
                          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                            {quickReplyError}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-2.5">
                        <button type="button" onClick={handleCancelQuickReplyForm} disabled={quickReplySaving} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40">
                          Cancelar
                        </button>
                        <button type="button" onClick={() => void handleSaveQuickReply()} disabled={quickReplySaving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                          {quickReplySaving && <Loader2 size={13} className="animate-spin" />}
                          {editingQuickReply ? 'Salvar alterações' : 'Criar resposta'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div ref={automationMenuRef} className="relative">
              <ComposerButton
                title="Automações"
                active={ automationMenuOpen }
                disabled={sending}
                onClick={ toggleAutomationMenu }
              >
                <Bot size={17} />
              </ComposerButton>
              {automationMenuOpen && (
                <AutomationMenu
                  state={automationState}
                  history={automationHistory}
                  onStartPreQualification={handleStartPreQualification}
                  onStartRouting={handleStartRouting}
                  onTakeOver={handleTakeOverAutomation}
                  onClose={() => setAutomationMenuOpen(false)}
                />
              )}
            </div>
            <div className="flex-1" />
            {!text.trim() && (
              <ComposerButton
                title="Gravar áudio"
                disabled={sending}
                onClick={ startRecording }
              >
                <Mic size={18} />
              </ComposerButton>
            )}
            {text.trim() && (
              <button
                type="button"
                onClick={() =>
                  void send()
                }
                disabled={sending}
                title="Enviar mensagem"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <SendHorizontal
                    size={16}
                  />
                )}
              </button>
            )}
          </div>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept={getFileAccept(
          selectedAttachmentType
        )}
        onChange={handleFile}
        disabled={sending}
      />
    </div>
  )
}
function ReplyPreview({
  message,
  onCancel,
}: {
  message: WhatsAppMessage
  onCancel: () => void
}) {
  const sent = message.direction === 'outbound'
  const senderLabel = sent
    ? message.senderName || 'Você'
    : message.senderName || 'Contato'
  const previewText = getReplyPreviewText(message)
  return (
    <div className="mb-2 flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="w-1 shrink-0 bg-emerald-500" />
      <div className="min-w-0 flex-1 px-3 py-2">
        <p className="truncate text-xs font-semibold text-emerald-600">
          Respondendo a {senderLabel}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {previewText}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        title="Cancelar resposta"
        className="flex w-10 shrink-0 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={16} />
      </button>
    </div>
  )
}
function getReplyPreviewText(message: WhatsAppMessage): string {
  if (message.text?.trim()) {
    return message.text.trim()
  }
  if (!message.media) {
    return 'Mensagem'
  }
  if (message.type === 'audio') {
    return '🎤 Mensagem de áudio'
  }
  if (message.type === 'image') {
    return '🖼️ Imagem'
  }
  if (message.type === 'video') {
    return '🎬 Vídeo'
  }
  if (message.type === 'document') {
    return message.media.name
      ? `📄 ${message.media.name}`
      : '📄 Documento'
  }
  return 'Mensagem'
}
function ComposerButton({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
function AttachmentMenu({
  onSelect,
  onClose,
}: {
  onSelect: (
    type: AttachmentType
  ) => void
  onClose: () => void
}) {
  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      <AttachmentMenuItem
        icon={<Image size={16} />}
        label="Imagem"
        description="JPG, PNG, WEBP..."
        onClick={() =>
          onSelect('image')
        }
      />
      <AttachmentMenuItem
        icon={<Video size={16} />}
        label="Vídeo"
        description="Arquivos de vídeo"
        onClick={() =>
          onSelect('video')
        }
      />
      <AttachmentMenuItem
        icon={<Mic size={16} />}
        label="Áudio"
        description="Arquivo de áudio"
        onClick={() =>
          onSelect('audio')
        }
      />
      <AttachmentMenuItem
        icon={<FileText size={16} />}
        label="Documento"
        description="PDF, Word, Excel..."
        onClick={() =>
          onSelect('document')
        }
      />
      <div className="my-1 border-t border-slate-100" />
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-lg px-3 py-1.5 text-left text-[11px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
      >
        Fechar
      </button>
    </div>
  )
}
function AttachmentMenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {description}
        </p>
      </div>
    </button>
  )
}
function AutomationMenu({
  state,
  history,
  onStartPreQualification,
  onStartRouting,
  onTakeOver,
  onClose,
}: {
  state?: AutomationMachineState | null
  history?: AutomationHistory
  onStartPreQualification: () => void
  onStartRouting: () => void
  onTakeOver: () => void
  onClose: () => void
}) {
  const status = state?.status ?? 'idle'
  const automationRunning = status === 'pre_qualification' || status === 'routing'
  const waitingForHuman = status === 'awaiting_human'
  const activeAutomation = automationRunning || waitingForHuman
  const preQualificationExecuted = history?.preQualificationExecuted ?? false
  const routingExecuted = history?.routingExecuted ?? false
  const canStartPreQualification = !activeAutomation && !preQualificationExecuted
  const canStartRouting = !activeAutomation && !routingExecuted
  const allAutomationsExecuted = preQualificationExecuted && routingExecuted && !activeAutomation
  const canTakeOver = automationRunning || waitingForHuman

  
  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-[290px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Bot size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">
              Automações
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
              Escolha uma ação para esta conversa
            </p>
          </div>
        </div>
      </div>
      <div className="p-1.5">
        {canStartPreQualification && (
          <AutomationMenuItem
            icon={ <UserRoundCheck size={16} /> }
            title="Pré-qualificação"
            description="Iniciar a qualificação deste contato"
            onClick={ onStartPreQualification }
          />
        )}
        {canStartRouting && (
          <AutomationMenuItem
            icon={<Route size={16} />}
            title="Triagem de atendimento"
            description="Identificar o motivo deste contato"
            onClick={ onStartRouting }
          />
        )}
        {automationRunning && (
          <>
            <AutomationStatusItem
              state={state!}
            />
            {canTakeOver && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <AutomationMenuItem
                  icon={ <UserRoundCheck size={16} /> }
                  title="Assumir atendimento"
                  description="Interromper a automação e assumir esta conversa"
                  onClick={ onTakeOver }
                  danger
                />
              </>
            )}
          </>
        )}
        {waitingForHuman && (
          <>
            <AutomationCompletedItem
              state={state!}
            />
            {canTakeOver && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <AutomationMenuItem
                  icon={ <UserRoundCheck size={16} /> }
                  title="Assumir atendimento"
                  description="Continuar esta conversa manualmente"
                  onClick={ onTakeOver }
                />
              </>
            )}
          </>
        )}
        {allAutomationsExecuted && (
          <div className="px-3 py-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700">
                  Automações concluídas
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Pré-qualificação e triagem já foram realizadas nesta conversa.
                </p>
              </div>
            </div>
          </div>
        )}
        {!state && (
          <div className="px-3 py-3">
            <p className="text-[11px] leading-4 text-slate-400">
              Nenhuma informação de automação disponível para esta conversa.
            </p>
          </div>
        )}
        <div className="my-1 border-t border-slate-100" />
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg px-3 py-1.5 text-left text-[11px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
function AutomationMenuItem({
  icon,
  title,
  description,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-slate-50"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-blue-600'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700">
          {title}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
          {description}
        </p>
      </div>
    </button>
  )
}
function AutomationStatusItem({
  state,
}: {
  state: AutomationMachineState
}) {
  const isPreQualification = state.status === 'pre_qualification'
  return (
    <div className="px-2.5 py-2.5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          {isPreQualification ? (
            <UserRoundCheck
              size={16}
            />
          ) : (
            <Route size={16} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-700">
            {isPreQualification
              ? 'Pré-qualificação em andamento'
              : 'Triagem em andamento'}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
            {isPreQualification
              ? `Etapa ${state.currentStep} de ${state.totalSteps}`
              : 'A automação está processando esta conversa.'}
          </p>
        </div>
      </div>
    </div>
  )
}
function AutomationCompletedItem({
  state,
}: {
  state: AutomationMachineState
}) {
  const isPreQualification = state.type === 'pre_qualification'
  return (
    <div className="px-2.5 py-2.5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <CheckCircle2
            size={16}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-700">
            {isPreQualification
              ? 'Pré-qualificação concluída'
              : 'Triagem concluída'}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
            A automação terminou e aguarda atendimento humano.
          </p>
        </div>
      </div>
    </div>
  )
}
function RecordingComposer({
  recordingTime,
  sending,
  onCancel,
  onStop,
}: {
  recordingTime: number
  sending: boolean
  onCancel: () => void
  onStop: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-white p-2 shadow-sm">
      <button
        type="button"
        onClick={onCancel}
        disabled={sending}
        title="Cancelar gravação"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X size={17} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-red-600">
            Gravando áudio
          </p>
          <p className="text-[10px] text-slate-400">
            Pare a gravação para ouvir antes de enviar
          </p>
        </div>
        <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-slate-600">
          {formatRecordingTime(recordingTime)}
        </span>
      </div>
      <button
        type="button"
        onClick={onStop}
        disabled={sending}
        title="Parar gravação"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Square
          size={13}
          fill="currentColor"
        />
      </button>
    </div>
  )
}
function RecordedAudioPreview({
  audio,
  sending,
  onDiscard,
  onSend,
}: {
  audio: RecordedAudioDraft
  sending: boolean
  onDiscard: () => void
  onSend: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={sending}
          title="Descartar áudio"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <audio
            src={audio.url}
            controls
            preload="metadata"
            className="h-9 w-full"
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          title="Enviar áudio"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <SendHorizontal
              size={16}
            />
          )}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-11">
        <span className="text-[10px] text-slate-400">
          Ouça o áudio antes de enviar
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {formatFileSize(audio.file.size)}
        </span>
      </div>
    </div>
  )
}
function getMessageTypeFromFile(file: File, fallback: AttachmentType): MessageType {
  if (file.type.startsWith('image/')) {
    return 'image'
  }
  if (file.type.startsWith('audio/')) {
    return 'audio'
  }
  if (file.type.startsWith('video/')) {
    return 'video'
  }
  if (fallback === 'image') {
    return 'image'
  }
  if (fallback === 'audio') {
    return 'audio'
  }
  if (fallback === 'video') {
    return 'video'
  }
  return 'document'
}
function getFileAccept(type: AttachmentType): string {
  if (type === 'image') {
    return 'image/*'
  }
  if (type === 'video') {
    return 'video/*'
  }
  if (type === 'audio') {
    return 'audio/*'
  }
  return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
}
function formatFileSize(bytes: number): string {
  if (!bytes) {
    return '0 B'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${( bytes / 1024 ).toFixed(1)} KB`
  }
  return `${( bytes / (1024 * 1024) ).toFixed(1)} MB`
}
