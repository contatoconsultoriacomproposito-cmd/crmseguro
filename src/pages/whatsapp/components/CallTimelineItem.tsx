import {
  Headphones,
  Loader2,
  LockKeyhole,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  criarUrlGravacaoLigacao,
  type WhatsAppCallTimelineItem,
} from '../services/whatsappCallService'

interface CallTimelineItemProps {
  call: WhatsAppCallTimelineItem
}

function formatarDuracao(
  segundos: number | null
): string {
  if (
    segundos == null ||
    !Number.isFinite(segundos)
  ) {
    return '—'
  }

  const total = Math.max(
    0,
    Math.round(segundos)
  )

  const minutos = Math.floor(total / 60)
  const restante = total % 60

  return `${minutos}:${String(
    restante
  ).padStart(2, '0')}`
}

function formatarHorario(
  data: string
): string {
  const parsed = new Date(data)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleTimeString(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function descricaoStatus(
  status: WhatsAppCallTimelineItem['status']
): string {
  switch (status) {
    case 'ended':
      return 'Ligação realizada'

    case 'connected':
      return 'Ligação em andamento'

    case 'ringing':
      return 'Chamando'

    case 'calling':
    case 'starting':
      return 'Iniciando ligação'

    case 'missed':
      return 'Ligação não atendida'

    case 'rejected':
      return 'Ligação recusada'

    case 'cancelled':
      return 'Ligação cancelada'

    case 'failed':
      return 'Falha na ligação'

    default:
      return 'Ligação'
  }
}

export function CallTimelineItem({
  call,
}: CallTimelineItemProps) {
  const [audioUrl, setAudioUrl] =
    useState<string | null>(null)

  const [
    carregandoAudio,
    setCarregandoAudio,
  ] = useState(false)

  const [
    erroAudio,
    setErroAudio,
  ] = useState<string | null>(null)

  const carregouRef = useRef(false)

  useEffect(() => {
    setAudioUrl(null)
    setErroAudio(null)
    setCarregandoAudio(false)
    carregouRef.current = false
  }, [call.id])

  const carregarGravacao =
    async (): Promise<void> => {
      if (
        audioUrl ||
        carregandoAudio ||
        carregouRef.current
      ) {
        return
      }

      const storagePath =
        call.gravacao?.storagePath

      if (!storagePath) {
        return
      }

      carregouRef.current = true
      setCarregandoAudio(true)
      setErroAudio(null)

      try {
        const url =
          await criarUrlGravacaoLigacao(
            storagePath
          )

        setAudioUrl(url)
      } catch (error) {
        carregouRef.current = false

        console.error(
          'Erro ao carregar gravação da ligação:',
          error
        )

        setErroAudio(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a gravação.'
        )
      } finally {
        setCarregandoAudio(false)
      }
    }

  const IconeDirecao =
    call.direction === 'inbound'
      ? PhoneIncoming
      : PhoneOutgoing

  const temGravacao =
    call.gravacaoStatus === 'ready' &&
    Boolean(call.gravacao?.storagePath)

  return (
    <div className="flex w-full justify-center py-2">
      <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <IconeDirecao size={17} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Phone
                    size={14}
                    className="text-slate-500"
                  />

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {descricaoStatus(
                      call.status
                    )}
                  </span>
                </div>

                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {call.direction ===
                  'outbound'
                    ? 'Ligação realizada pelo CRM'
                    : 'Ligação recebida pelo CRM'}

                  {call.duracaoSegundos !=
                    null && (
                    <>
                      {' · '}
                      {formatarDuracao(
                        call.duracaoSegundos
                      )}
                    </>
                  )}
                </div>
              </div>

              <span className="shrink-0 text-[11px] text-slate-400">
                {formatarHorario(
                  call.iniciadoEm
                )}
              </span>
            </div>

            {temGravacao && (
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-1.5">
                  <Headphones
                    size={14}
                    className="text-slate-500"
                  />

                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Gravação da ligação
                  </span>
                </div>

                {!audioUrl &&
                  !erroAudio && (
                    <button
                      type="button"
                      onClick={() => {
                        void carregarGravacao()
                      }}
                      disabled={
                        carregandoAudio
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {carregandoAudio ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Headphones
                            size={14}
                          />
                          Ouvir gravação
                        </>
                      )}
                    </button>
                  )}

                {audioUrl && (
                  <audio
                    controls
                    preload="metadata"
                    src={audioUrl}
                    className="h-9 w-full"
                  />
                )}

                {erroAudio && (
                  <button
                    type="button"
                    onClick={() => {
                      void carregarGravacao()
                    }}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                  >
                    {erroAudio}
                    <span className="ml-1 font-medium">
                      Tentar novamente
                    </span>
                  </button>
                )}

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <LockKeyhole size={11} />

                  <span>
                    Registro interno · visível
                    somente no CRM
                  </span>
                </div>
              </div>
            )}

            {call.gravacaoStatus ===
              'processing' && (
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                <Loader2
                  size={13}
                  className="animate-spin"
                />
                Processando gravação...
              </div>
            )}

            {call.gravacaoStatus ===
              'failed' && (
              <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-red-500 dark:border-slate-800">
                Não foi possível salvar a
                gravação desta ligação.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CallTimelineItem