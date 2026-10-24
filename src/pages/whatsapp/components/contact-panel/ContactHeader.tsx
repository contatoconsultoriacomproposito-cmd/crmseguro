import {
  Check,
  Edit3,
  Loader2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'

import { supabase } from '../../../../lib/supabaseClient'

interface Props {
  contatoId: string
  nome: string
  telefone: string
  avatarUrl?: string | null
  onNomeAtualizado?: (
    nome: string
  ) => void
}

export default function ContactHeader({
  contatoId,
  nome,
  telefone,
  avatarUrl,
  onNomeAtualizado,
}: Props) {
  const [editando, setEditando] =
    useState(false)

  const [
    nomeEditado,
    setNomeEditado,
  ] = useState(nome)

  const [salvando, setSalvando] =
    useState(false)

  useEffect(() => {
    if (!editando) {
      setNomeEditado(nome)
    }
  }, [
    nome,
    editando,
  ])

  const [avatarComErro, setAvatarComErro] =
    useState(false)

  useEffect(() => {
    setAvatarComErro(false)
  }, [avatarUrl])

  const salvarNome =
    async () => {
      const novoNome =
        nomeEditado.trim()

      if (!novoNome) {
        toast.error(
          'Informe o nome do contato.'
        )
        return
      }

      if (
        novoNome ===
        nome.trim()
      ) {
        setEditando(false)
        return
      }

      setSalvando(true)

      try {
        const {
          data,
          error,
        } = await supabase
          .from(
            'whatsapp_contatos'
          )
          .update({
            nome: novoNome,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            contatoId
          )
          .select(
            'id, nome'
          )
          .single()

        if (
          error ||
          !data
        ) {
          throw (
            error ||
            new Error(
              'Contato não atualizado.'
            )
          )
        }

        setEditando(false)

        onNomeAtualizado?.(
          data.nome
        )

        toast.success(
          'Nome atualizado.'
        )
      } catch (error: any) {
        toast.error(
          error?.message ||
            'Não foi possível atualizar o nome.'
        )
      } finally {
        setSalvando(false)
      }
    }

  const cancelar = () => {
    setNomeEditado(nome)
    setEditando(false)
  }

  const iniciais =
    (nome || telefone || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(item =>
        item.charAt(0)
      )
      .join('')
      .toUpperCase()

  return (
    <div className="flex flex-col items-center px-4 pb-4 pt-5 text-center">
      {avatarUrl && !avatarComErro ? (
        <img
          src={avatarUrl}
          alt={nome}
          onError={() =>
            setAvatarComErro(true)
          }
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white">
          {iniciais}
        </div>
      )}

      {editando ? (
        <div className="mt-3 flex w-full max-w-[280px] items-center gap-1.5">
          <input
            autoFocus
            value={nomeEditado}
            disabled={salvando}
            onChange={event =>
              setNomeEditado(
                event.target.value
              )
            }
            onKeyDown={event => {
              if (
                event.key ===
                'Enter'
              ) {
                void salvarNome()
              }

              if (
                event.key ===
                'Escape'
              ) {
                cancelar()
              }
            }}
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="button"
            disabled={salvando}
            onClick={() =>
              void salvarNome()
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Check
                size={14}
              />
            )}
          </button>

          <button
            type="button"
            disabled={salvando}
            onClick={cancelar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5">
          <h2 className="max-w-[230px] truncate text-sm font-semibold text-slate-800">
            {nome ||
              'Contato sem nome'}
          </h2>

          <button
            type="button"
            title="Editar nome"
            onClick={() =>
              setEditando(true)
            }
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
          >
            <Edit3 size={14} />
          </button>
        </div>
      )}

      <p className="mt-1 text-xs text-slate-400">
        {telefone}
      </p>
    </div>
  )
}