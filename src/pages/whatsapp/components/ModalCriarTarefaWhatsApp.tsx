import { useEffect, useState } from 'react'
import {
  Calendar,
  Loader2,
  X,
} from 'lucide-react'

interface ModalCriarTarefaWhatsAppProps {
  open: boolean
  messageText?: string
  saving?: boolean
  onClose: () => void
  onSave: (data: {
    titulo: string
    descricao: string
    prioridade:
      | 'BAIXA'
      | 'NORMAL'
      | 'ALTA'
      | 'URGENTE'
    vencimentoEm: string | null
  }) => Promise<void>
}

export default function ModalCriarTarefaWhatsApp({
  open,
  messageText,
  saving = false,
  onClose,
  onSave,
}: ModalCriarTarefaWhatsAppProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] =
    useState('')
  const [prioridade, setPrioridade] =
    useState<
      'BAIXA' |
      'NORMAL' |
      'ALTA' |
      'URGENTE'
    >('NORMAL')

  const [vencimentoEm, setVencimentoEm] =
    useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    setTitulo('Retornar contato')

    setDescricao(
      messageText
        ? `Tarefa criada a partir da mensagem:\n\n${messageText}`
        : 'Tarefa criada a partir de uma mensagem do WhatsApp.'
    )

    setPrioridade('NORMAL')
    setVencimentoEm('')
  }, [open, messageText])

  if (!open) {
    return null
  }

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    if (!titulo.trim() || saving) {
      return
    }

    await onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      vencimentoEm:
        vencimentoEm || null,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Criar tarefa
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Criar tarefa vinculada à mensagem.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={17} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-5"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Título
            </label>

            <input
              value={titulo}
              onChange={event =>
                setTitulo(
                  event.target.value
                )
              }
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Ex.: Retornar contato"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Descrição
            </label>

            <textarea
              value={descricao}
              onChange={event =>
                setDescricao(
                  event.target.value
                )
              }
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Prioridade
              </label>

              <select
                value={prioridade}
                onChange={event =>
                  setPrioridade(
                    event.target.value as
                      | 'BAIXA'
                      | 'NORMAL'
                      | 'ALTA'
                      | 'URGENTE'
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              >
                <option value="BAIXA">
                  Baixa
                </option>
                <option value="NORMAL">
                  Normal
                </option>
                <option value="ALTA">
                  Alta
                </option>
                <option value="URGENTE">
                  Urgente
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Vencimento
              </label>

              <div className="relative">
                <Calendar
                  size={15}
                  className="pointer-events-none absolute left-3 top-2.5 text-gray-400"
                />

                <input
                  type="datetime-local"
                  value={vencimentoEm}
                  onChange={event =>
                    setVencimentoEm(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !titulo.trim()
              }
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              )}

              Criar tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}