import { CalendarDays, Check, CheckCircle2, MessageCircle, Pencil, Trash2, UserRound, Building2, RotateCcw } from 'lucide-react'
import type { Tarefa } from '../types/tarefas'

interface Props {
  tarefa: Tarefa
  podeEditar: boolean
  podeExcluir: boolean
  ocupado?: boolean
  responsavelNome?: string
  onEditar: (tarefa: Tarefa) => void
  onConcluir: (tarefa: Tarefa, concluida: boolean) => void
  onExcluir: (tarefa: Tarefa) => void
}

const CORES = {
  BAIXA: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  NORMAL: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  ALTA: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  URGENTE: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
}

export default function TarefaCard({ tarefa, podeEditar, podeExcluir, ocupado, responsavelNome, onEditar, onConcluir, onExcluir }: Props) {
  const concluida = tarefa.status === 'CONCLUIDA'
  return (
    <article className={`group flex min-w-0 items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-zinc-900 ${concluida ? 'border-zinc-100 opacity-70 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800'}`}>
      <button type="button" aria-label={concluida ? 'Reabrir tarefa' : 'Concluir tarefa'} title={concluida ? 'Reabrir' : 'Concluir'} disabled={!podeEditar || ocupado} onClick={() => onConcluir(tarefa, !concluida)} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-30 ${concluida ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-zinc-600'}`}><Check size={16}/></button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`break-words text-sm font-semibold ${concluida ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>{tarefa.titulo}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CORES[tarefa.prioridade]}`}>{tarefa.prioridade === 'NORMAL' ? 'Normal' : tarefa.prioridade === 'BAIXA' ? 'Baixa' : tarefa.prioridade === 'ALTA' ? 'Alta' : 'Urgente'}</span>
        </div>
        {tarefa.descricao && <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">{tarefa.descricao}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {tarefa.vencimento_em && <span className="inline-flex items-center gap-1"><CalendarDays size={13}/>{new Date(tarefa.vencimento_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          {responsavelNome && <span className="inline-flex items-center gap-1"><UserRound size={13}/>{responsavelNome}</span>}
          {tarefa.conversa_id && <span title="Vinculada a uma conversa" className="inline-flex items-center gap-1"><MessageCircle size={13}/>{tarefa.vinculo_nome ? ` WhatsApp · ${tarefa.vinculo_nome}` : " WhatsApp"}</span>}
          {tarefa.crm_pessoa_id && <span className="inline-flex items-center gap-1"><UserRound size={13}/>{tarefa.vinculo_nome ? ` Pessoa · ${tarefa.vinculo_nome}` : " Pessoa"}</span>}
          {tarefa.crm_empresa_id && <span className="inline-flex items-center gap-1"><Building2 size={13}/>{tarefa.vinculo_nome ? ` Empresa · ${tarefa.vinculo_nome}` : " Empresa"}</span>}
          {concluida && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13}/> Concluída</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {podeEditar && <button type="button" title="Editar" aria-label="Editar tarefa" disabled={ocupado} onClick={() => onEditar(tarefa)} className="rounded-lg p-2 text-zinc-400 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30"><Pencil size={16}/></button>}
        {podeExcluir && <button type="button" title="Excluir" aria-label="Excluir tarefa" disabled={ocupado} onClick={() => onExcluir(tarefa)} className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 size={16}/></button>}
        {concluida && podeEditar && <button type="button" title="Reabrir" aria-label="Reabrir tarefa" disabled={ocupado} onClick={() => onConcluir(tarefa, false)} className="hidden rounded-lg p-2 text-zinc-400 hover:bg-slate-100 sm:inline-flex"><RotateCcw size={15}/></button>}
      </div>
    </article>
  )
}
