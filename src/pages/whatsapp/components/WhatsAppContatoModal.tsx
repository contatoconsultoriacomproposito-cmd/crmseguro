import {
  Loader2,
  Phone,
  UserRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'
import type {
  WhatsAppContato,
} from '../services/whatsappContatosService'

interface Props {
  open: boolean
  contato?: WhatsAppContato | null
  onClose: () => void
  onSave: (data: {
    nome: string
    telefone: string
  }) => Promise<void>
}

function maskPhone(
  value: string
) {
  let digits =
    value.replace(/\D/g, '')

  if (
    digits.startsWith('55') &&
    digits.length > 11
  ) {
    digits =
      digits.slice(2)
  }

  digits =
    digits.slice(0, 11)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 6) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      6
    )}-${digits.slice(6)}`
  }

  return `(${digits.slice(
    0,
    2
  )}) ${digits.slice(
    2,
    7
  )}-${digits.slice(7)}`
}

export default function WhatsAppContatoModal({
  open,
  contato,
  onClose,
  onSave,
}: Props) {
  const [nome, setNome] =
    useState('')

  const [
    telefone,
    setTelefone,
  ] = useState('')

  const [saving, setSaving] =
    useState(false)

  const editando =
    Boolean(contato)

  const telefoneBloqueado =
    Boolean(
      contato?.whatsapp_id
    )

  useEffect(() => {
    if (!open) return

    setNome(
      contato?.nome ?? ''
    )

    setTelefone(
      contato?.telefone
        ? maskPhone(
            contato.telefone
          )
        : ''
    )
  }, [
    open,
    contato,
  ])

  if (!open) return null

  const handleSubmit =
    async () => {
      if (saving) return

      if (!nome.trim()) {
        toast.error(
          'Informe o nome do contato.'
        )
        return
      }

      if (
        telefone
          .replace(/\D/g, '')
          .length < 10
      ) {
        toast.error(
          'Informe um WhatsApp válido com DDD.'
        )
        return
      }

      try {
        setSaving(true)

        await onSave({
          nome:
            nome.trim(),
          telefone,
        })

        onClose()
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o contato.'
        )
      } finally {
        setSaving(false)
      }
    }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {editando
                ? 'Editar contato'
                : 'Novo contato'}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {editando
                ? 'Atualize os dados do contato.'
                : 'Cadastre um contato sem criar uma conversa.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <UserRound size={15} />
              Nome
            </label>

            <input
              value={nome}
              onChange={e =>
                setNome(
                  e.target.value
                )
              }
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Phone size={15} />
              WhatsApp
            </label>

            <input
              value={telefone}
              disabled={
                telefoneBloqueado
              }
              onChange={e =>
                setTelefone(
                  maskPhone(
                    e.target.value
                  )
                )
              }
              inputMode="tel"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-900"
            />

            {telefoneBloqueado && (
              <p className="mt-1.5 text-xs text-slate-500">
                O telefone é mantido pela sincronização do WhatsApp.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void handleSubmit()
            }
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {editando
              ? 'Salvar alterações'
              : 'Criar contato'}
          </button>
        </div>
      </div>
    </div>
  )
}