import { useEffect, useState } from 'react'
import {
  Loader2,
  Mic,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from 'lucide-react'

export type CallStatus =
  | 'starting'
  | 'calling'
  | 'ringing'
  | 'connected'

interface CallModalProps {
  open: boolean
  contactName: string
  phone: string
  status: CallStatus
  muted: boolean
  speakerMuted: boolean
  onToggleSpeaker: () => void
  onToggleMute: () => void
  onHangup: () => void
}

function formatPhone(phone: string) {
  const numbers = phone.replace(/\D/g, '')

  if (numbers.length === 13 && numbers.startsWith('55')) {
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`
  }

  return phone
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getStatusLabel(status: CallStatus) {
  switch (status) {
    case 'starting':
      return 'Iniciando chamada...'

    case 'calling':
      return 'Chamando...'

    case 'ringing':
      return 'Telefone tocando...'

    case 'connected':
      return 'Em ligação'
  }
}

export function CallModal({
  open,
  contactName,
  phone,
  status,
  muted,
  speakerMuted,
  onToggleMute,
  onToggleSpeaker,
  onHangup,
}: CallModalProps) {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!open) {
      setDuration(0)
      return
    }

    if (status !== 'connected') {
      return
    }

    const startedAt = Date.now()

    setDuration(0)

    const interval = window.setInterval(() => {
      setDuration(
        Math.floor((Date.now() - startedAt) / 1000)
      )
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [open, status])

  if (!open) {
    return null
  }

  const connected = status === 'connected'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="px-6 pb-7 pt-8">
          <div className="flex flex-col items-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              {connected ? (
                <Phone size={32} />
              ) : (
                <Loader2
                  size={32}
                  className="animate-spin"
                />
              )}
            </div>

            <h2 className="max-w-full truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
              {contactName || 'Contato'}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatPhone(phone)}
            </p>

            <div className="mt-7 flex min-h-[64px] flex-col items-center justify-center">
              {connected ? (
                <>
                  <span className="font-mono text-3xl font-semibold tracking-wide text-slate-900 dark:text-white">
                    {formatDuration(duration)}
                  </span>

                  <span className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                    Em ligação
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {getStatusLabel(status)}
                </span>
              )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        if (connected) {
                        onToggleMute()
                        }
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                        muted
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : connected
                            ? 'cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-50 dark:bg-slate-800'
                    }`}
                    title={muted ? 'Ativar microfone' : 'Silenciar microfone'}
                    aria-label={muted ? 'Ativar microfone' : 'Silenciar microfone'}
                    >
                    <Mic size={20} />
                    </button>

                <span
                    className={`text-xs ${
                    muted
                        ? 'font-medium text-red-600 dark:text-red-400'
                        : 'text-slate-500'
                    }`}
                >
                    {muted ? 'Ativar seu áudio' : 'Silenciar seu áudio'}
                </span>
                </div>

              <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                    if (connected) {
                        onToggleSpeaker()
                    }
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                    speakerMuted
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : connected
                        ? 'cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-50 dark:bg-slate-800'
                    }`}
                    title={speakerMuted ? 'Ativar áudio' : 'Silenciar áudio'}
                    aria-label={speakerMuted ? 'Ativar áudio' : 'Silenciar áudio'}
                >
                    {speakerMuted ? (
                    <VolumeX size={20} />
                    ) : (
                    <Volume2 size={20} />
                    )}
                </button>

                <span
                    className={`text-xs ${
                    speakerMuted
                        ? 'font-medium text-red-600 dark:text-red-400'
                        : 'text-slate-500'
                    }`}
                >
                    {speakerMuted ? 'Ouvir o cliente' : 'Silenciar o cliente'}
                </span>
                </div>
            </div>

            <button
              type="button"
              onClick={onHangup}
              className="mt-9 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
              title="Encerrar ligação"
              aria-label="Encerrar ligação"
            >
              <PhoneOff size={24} />
            </button>

            <span className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Encerrar
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}