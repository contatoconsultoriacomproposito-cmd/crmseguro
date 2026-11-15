import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, ListTodo, Loader2, Plus, RefreshCw, Search, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import ModalTarefa from './components/ModalTarefa'
import TarefaCard from './components/TarefaCard'
import { useTarefas } from './hooks/useTarefas'
import { buscarResponsaveis } from './services/tarefasService'
import { categoriaTarefa, type Tarefa } from './types/tarefas'

type Filtro = 'todas' | 'atrasadas' | 'hoje' | 'proximas' | 'semData' | 'concluidas'

const FILTROS: Array<{ id: Filtro; nome: string }> = [
  { id: 'todas', nome: 'Todas' }, { id: 'atrasadas', nome: 'Atrasadas' },
  { id: 'hoje', nome: 'Hoje' }, { id: 'proximas', nome: 'Próximas' },
  { id: 'semData', nome: 'Sem data' }, { id: 'concluidas', nome: 'Concluídas' },
]

export default function Tarefas() {
  const estado = useTarefas()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Tarefa | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const [somenteMinhas, setSomenteMinhas] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Array<{ id: string; nome: string }>>([])

  useEffect(() => {
    if (!estado.corretoraId || !estado.podeVisualizar) return
    let cancelado = false
    void buscarResponsaveis(estado.corretoraId).then(data => { if (!cancelado) setResponsaveis(data) })
      .catch(() => { if (!cancelado) setResponsaveis([]) })
    return () => { cancelado = true }
  }, [estado.corretoraId, estado.podeVisualizar])

  const porId = useMemo(() => new Map(responsaveis.map(r => [r.id, r.nome])), [responsaveis])
  const tarefasVisiveis = useMemo(() => estado.tarefas.filter(t => {
    if (somenteMinhas && t.responsavel_id !== estado.usuarioId) return false
    if (busca.trim() && !`${t.titulo} ${t.descricao ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase())) return false
    const categoria = categoriaTarefa(t)
    return filtro === 'todas' || filtro === categoria
  }).sort((a,b) => {
    if (a.status === 'CONCLUIDA' && b.status !== 'CONCLUIDA') return 1
    if (b.status === 'CONCLUIDA' && a.status !== 'CONCLUIDA') return -1
    const av = a.vencimento_em ? new Date(a.vencimento_em).getTime() : Infinity
    const bv = b.vencimento_em ? new Date(b.vencimento_em).getTime() : Infinity
    return av - bv
  }), [estado.tarefas, estado.usuarioId, somenteMinhas, busca, filtro])

  function abrirNovo() { setEditando(null); setModalAberto(true) }
  function abrirEdicao(tarefa: Tarefa) { setEditando(tarefa); setModalAberto(true) }
  function confirmarExclusao(tarefa: Tarefa) {
    if (!window.confirm(`Excluir definitivamente a tarefa “${tarefa.titulo}”?`)) return
    void estado.excluir(tarefa)
  }

  const resumo = estado.resumo
  const cards = [
    { id: 'atrasadas' as const, label: 'Atrasadas', total: resumo.atrasadas, icon: AlertCircle, cor: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { id: 'hoje' as const, label: 'Para hoje', total: resumo.hoje, icon: CalendarDays, cor: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { id: 'proximas' as const, label: 'Próximas', total: resumo.proximas, icon: Clock3, cor: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { id: 'concluidas' as const, label: 'Concluídas', total: resumo.concluidas, icon: CheckCircle2, cor: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ]

  return <div className="min-h-full w-full bg-zinc-50 px-3 py-5 text-zinc-900 dark:bg-zinc-950 dark:text-white sm:px-5 lg:px-8">
    <div className="mx-auto max-w-[1350px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><ListTodo size={23}/></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-violet-600">Atendimento</p><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tarefas</h1><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pendências simples, organizadas no seu ritmo.</p></div></div>
        <div className="flex gap-2"><button type="button" disabled={estado.carregando} onClick={() => void estado.atualizar()} title="Atualizar" className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900"><RefreshCw size={18} className={estado.carregando ? 'animate-spin' : ''}/></button>{estado.podeCriar && <button type="button" onClick={abrirNovo} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"><Plus size={18}/> Nova tarefa</button>}</div>
      </header>

      {estado.carregandoPermissoes ? <div className="flex min-h-64 items-center justify-center gap-2 text-zinc-500"><Loader2 size={19} className="animate-spin"/> Verificando permissões...</div> : !estado.podeVisualizar ? <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900"><ShieldAlert size={30} className="mx-auto mb-3 text-zinc-400"/><h2 className="font-bold">Acesso não autorizado</h2><p className="mt-2 text-sm text-zinc-500">Você não possui permissão para visualizar tarefas.</p></div> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(card => <button key={card.id} type="button" onClick={() => setFiltro(card.id)} className={`flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:bg-zinc-900 ${filtro === card.id ? 'border-violet-400 ring-2 ring-violet-100 dark:ring-violet-900' : 'border-zinc-200 dark:border-zinc-800'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${card.bg} ${card.cor}`}><card.icon size={20}/></span><div><p className="text-2xl font-extrabold tabular-nums">{card.total}</p><p className="text-xs text-zinc-500">{card.label}</p></div></button>)}</div>
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="space-y-3 border-b border-zinc-100 p-4 dark:border-zinc-800 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-zinc-400"/><h2 className="text-sm font-extrabold">Organizar tarefas</h2><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">{tarefasVisiveis.length}</span></div><label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300"><input type="checkbox" checked={somenteMinhas} onChange={e => setSomenteMinhas(e.target.checked)} className="accent-violet-600"/>Somente minhas</label></div><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-zinc-400"/><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar uma pendência..." className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"/></div><nav aria-label="Filtrar tarefas" className="flex flex-wrap gap-1.5">{FILTROS.map(item => <button key={item.id} type="button" aria-pressed={filtro === item.id} onClick={() => setFiltro(item.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filtro === item.id ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-violet-50 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item.nome}</button>)}</nav></div>
          <div className="space-y-2 bg-zinc-50/60 p-3 dark:bg-zinc-950/50 sm:p-5">{estado.erro && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{estado.erro}</div>}{estado.carregando ? <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 size={18} className="animate-spin"/> Carregando tarefas...</div> : tarefasVisiveis.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center"><span className="rounded-2xl bg-violet-50 p-4 text-violet-500 dark:bg-violet-500/10"><CheckCircle2 size={30}/></span><p className="font-bold">Nenhuma tarefa por aqui</p><p className="max-w-xs text-xs leading-5 text-zinc-500">Crie uma tarefa rápida ou escolha outro filtro para ver suas pendências.</p>{estado.podeCriar && <button type="button" onClick={abrirNovo} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">Criar tarefa</button>}</div> : tarefasVisiveis.map(tarefa => <TarefaCard key={tarefa.id} tarefa={tarefa} responsavelNome={tarefa.responsavel_id ? porId.get(tarefa.responsavel_id) : 'Sem responsável'} podeEditar={estado.permiteEditar(tarefa)} podeExcluir={estado.permiteExcluir(tarefa)} ocupado={estado.operando} onEditar={abrirEdicao} onConcluir={(t, c) => void estado.concluir(t, c)} onExcluir={confirmarExclusao}/>)}</div>
        </section>
      </>}
    </div>
    {estado.usuarioId && <ModalTarefa open={modalAberto} tarefa={editando} usuarioId={estado.usuarioId} somenteProprio={Boolean(editando) && estado.edicao === 'own'} responsaveis={responsaveis} ocupado={estado.operando} onClose={() => { setModalAberto(false); setEditando(null) }} onSave={input => editando ? estado.editar(editando, input) : estado.criar(input)}/>}
  </div>
}
