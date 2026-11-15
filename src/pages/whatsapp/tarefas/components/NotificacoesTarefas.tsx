import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bell, BellRing, CalendarClock, Check, ChevronRight, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTarefas } from '../hooks/useTarefas'
import { categoriaTarefa, type Tarefa } from '../types/tarefas'

type Props = {
  rotaTarefas?: string
  /** Esquerda para o menu desktop; direita para o cabeçalho mobile. */
  alinhamento?: 'esquerda' | 'direita'
}

/** Sino com tarefas vencidas ou previstas para hoje do usuário responsável. */
export default function NotificacoesTarefas({
  rotaTarefas = '/whatsapp/tarefas',
  alinhamento = 'direita',
}: Props) {
  const navigate = useNavigate()
  const {
    tarefas,
    atualizar,
    podeVisualizar,
    permiteEditar,
    concluir,
    reagendar,
    operando,
    carregando,
    usuarioId,
  } = useTarefas()

  const [aberto, setAberto] = useState(false)
  const [reagendando, setReagendando] = useState<Tarefa | null>(null)
  const [novaData, setNovaData] = useState('')
  const [descricoesAbertas, setDescricoesAbertas] = useState<string[]>([])

  function alternarDescricao(id: string) {
    setDescricoesAbertas(anteriores =>
      anteriores.includes(id) ? anteriores.filter(item => item !== id) : [...anteriores, id]
    )
  }

  const pendencias = useMemo(
    () => tarefas
      .filter(t =>
        t.responsavel_id === usuarioId &&
        t.status !== 'CONCLUIDA' &&
        t.status !== 'CANCELADA' &&
        ['hoje', 'atrasadas'].includes(categoriaTarefa(t))
      )
      .sort((a, b) => (a.vencimento_em ?? '').localeCompare(b.vencimento_em ?? '')),
    [tarefas, usuarioId],
  )

  useEffect(() => {
    if (!podeVisualizar) return
    const id = window.setInterval(() => { void atualizar() }, 60_000)
    return () => window.clearInterval(id)
  }, [podeVisualizar, atualizar])

  if (!podeVisualizar) return null

  async function salvarReagendamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!novaData || !reagendando) return
    const data = new Date(novaData)
    if (Number.isNaN(data.getTime())) return
    if (await reagendar(reagendando, data.toISOString())) {
      setReagendando(null)
      setNovaData('')
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`${pendencias.length} tarefas vencidas ou para hoje`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        title="Pendências de tarefas"
        onClick={() => setAberto(v => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-violet-50 hover:text-violet-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pendencias.length ? <BellRing size={21} /> : <Bell size={21} />}
        {pendencias.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white">
            {pendencias.length > 99 ? '99+' : pendencias.length}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Minhas pendências"
          className={`absolute top-12 z-[80] w-[min(92vw,370px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 ${alinhamento === 'esquerda' ? 'left-0' : 'right-0'}`}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Minhas pendências</p>
              <p className="text-xs text-zinc-500">Atrasadas e de hoje · {pendencias.length}</p>
            </div>
            <button type="button" aria-label="Fechar" onClick={() => { setAberto(false); setReagendando(null) }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[min(55vh,430px)] space-y-2 overflow-y-auto p-3">
            {carregando && (
              <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={14} className="animate-spin" /> Atualizando...</div>
            )}
            {!pendencias.length && <p className="py-7 text-center text-xs text-zinc-500">Tudo em dia por aqui! ✨</p>}
            {pendencias.slice(0, 30).map(t => (
              <div key={t.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="break-words text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.titulo}</p>
                {(t.crm_pessoa_id || t.crm_empresa_id || t.conversa_id) && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-violet-700 dark:text-violet-300">
                    <span className="shrink-0 font-bold">{t.crm_pessoa_id ? 'Pessoa:' : t.crm_empresa_id ? 'Empresa:' : 'WhatsApp:'}</span>
                    <span className="min-w-0 break-words">{t.vinculo_nome || (t.crm_pessoa_id ? 'Pessoa vinculada' : t.crm_empresa_id ? 'Empresa vinculada' : 'Conversa vinculada')}</span>
                  </div>
                )}
                {t.descricao?.trim() && (() => {
                  const descricao = t.descricao.trim()
                  const expandida = descricoesAbertas.includes(t.id)
                  const longa = descricao.length > 135
                  return (
                    <div className="mt-2 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                      <p className="whitespace-pre-wrap break-words">
                        {expandida || !longa ? descricao : `${descricao.slice(0, 135).trimEnd()}…`}
                      </p>
                      {longa && (
                        <button
                          type="button"
                          aria-expanded={expandida}
                          onClick={() => alternarDescricao(t.id)}
                          className="mt-1 font-bold text-violet-700 hover:underline dark:text-violet-300"
                        >
                          {expandida ? 'Ver menos' : 'Ver mais'}
                        </button>
                      )}
                    </div>
                  )})()}
                <p className={`mt-1.5 text-[11px] ${categoriaTarefa(t) === 'atrasadas' ? 'text-rose-600' : 'text-amber-600'}`}>
                  {categoriaTarefa(t) === 'atrasadas' ? 'Atrasada · ' : 'Hoje · '}
                  {t.vencimento_em ? new Date(t.vencimento_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                </p>
                {permiteEditar(t) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={operando} onClick={() => void concluir(t)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 disabled:opacity-40">
                      <Check size={13} /> Concluir
                    </button>
                    <button type="button" disabled={operando} onClick={() => { setReagendando(t); setNovaData('') }} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 disabled:opacity-40">
                      <CalendarClock size={13} /> Reagendar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => { setAberto(false); navigate(rotaTarefas) }} className="flex w-full items-center justify-center gap-2 border-t border-zinc-100 px-4 py-3 text-xs font-bold text-violet-700 hover:bg-violet-50 dark:border-zinc-800">
            Ver todas as tarefas <ChevronRight size={15} />
          </button>
          {reagendando && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-4 dark:bg-zinc-950/95">
              <form className="w-full space-y-3" onSubmit={salvarReagendamento}>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Reagendar tarefa</p>
                <p className="break-words text-xs text-zinc-500">{reagendando.titulo}</p>
                <input type="datetime-local" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:bg-zinc-900" required />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReagendando(null)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold">Cancelar</button>
                  <button type="submit" disabled={operando || !novaData} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Salvar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
