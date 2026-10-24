import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'

import type {
  WhatsAppMessage,
} from '../types/whatsapp'

interface ModalExcluirMensagemProps {
  open: boolean
  message: WhatsAppMessage
  deleting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function ModalExcluirMensagem({
  open,
  message,
  deleting,
  onClose,
  onConfirm,
}: ModalExcluirMensagemProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Excluir mensagem
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Confirme a exclusão desta mensagem.
            </p>
          </div>

          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-red-500"
            />

            <div className="min-w-0">
              <p className="text-sm font-medium text-red-800">
                Esta ação não poderá ser desfeita.
              </p>

              <p className="mt-1 text-xs text-red-700/80">
                A mensagem selecionada será excluída.
              </p>

              {(message.text ||
                message.media) && (
                <div className="mt-3 rounded-lg border border-red-100 bg-white/70 p-3">
                  <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs text-gray-700">
                    {message.text ||
                      getMediaLabel(
                        message.type
                      )}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                void onConfirm()
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={14} />
              )}

              Excluir mensagem
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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