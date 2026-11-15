import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { buscarVinculosCliente } from '../services/tarefasService'
import type { PessoaVinculavel, PrioridadeTarefa, Tarefa, TarefaInput, VinculoTarefa } from '../types/tarefas'

interface Props {
  open: boolean
  tarefa?: Tarefa | null
  usuarioId: string
  somenteProprio: boolean
  responsaveis: Array<{ id: string; nome: string }>
  ocupado?: boolean
  conversaInicialId?: string | null
  onClose: () => void
  onSave: (input: TarefaInput) => Promise<boolean>
}

function datetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function tipoVinculo(tarefa?: Tarefa | null, conversaInicialId?: string | null): VinculoTarefa {
  if (tarefa?.crm_pessoa_id) return 'PESSOA'
  if (tarefa?.crm_empresa_id) return 'EMPRESA'
  if (tarefa?.conversa_id || conversaInicialId) return 'CONVERSA'
  return 'LIVRE'
}

export default function ModalTarefa({ open, tarefa, usuarioId, somenteProprio, responsaveis, ocupado, conversaInicialId, onClose, onSave }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('NORMAL')
  const [responsavel, setResponsavel] = useState(usuarioId)
  const [vencimento, setVencimento] = useState('')
  const [vinculo, setVinculo] = useState<VinculoTarefa>('LIVRE')
  const [conversaId, setConversaId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [busca, setBusca] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [resultados, setResultados] = useState<PessoaVinculavel[]>([])
  const [pesquisando, setPesquisando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitulo(tarefa?.titulo ?? '')
    setDescricao(tarefa?.descricao ?? '')
    setPrioridade(tarefa?.prioridade ?? 'NORMAL')
    setResponsavel(somenteProprio && tarefa ? usuarioId : tarefa?.responsavel_id ?? usuarioId)
    setVencimento(datetimeLocal(tarefa?.vencimento_em ?? null))
    setVinculo(tipoVinculo(tarefa, conversaInicialId))
    setConversaId(tarefa?.conversa_id ?? conversaInicialId ?? '')
    setClienteId(tarefa?.crm_pessoa_id ?? tarefa?.crm_empresa_id ?? '')
    setBusca('')
    setNomeCliente(tarefa?.crm_pessoa_id || tarefa?.crm_empresa_id ? tarefa.vinculo_nome ?? 'Cliente vinculado' : '')
    setResultados([])
  }, [open, tarefa, usuarioId, somenteProprio, conversaInicialId])

  useEffect(() => {
    if (!open || (vinculo !== 'PESSOA' && vinculo !== 'EMPRESA') || busca.trim().length < 3) { setResultados([]); return }
    let cancelado = false
    const timeout = setTimeout(() => {
      setPesquisando(true)
      void buscarVinculosCliente(busca).then(lista => {
        if (!cancelado) setResultados(lista.filter(item => item.tipo === vinculo))
      }).catch(error => {
        if (!cancelado) toast.error(error instanceof Error ? error.message : 'Erro ao pesquisar clientes.')
      }).finally(() => { if (!cancelado) setPesquisando(false) })
    }, 350)
    return () => { cancelado = true; clearTimeout(timeout) }
  }, [busca, vinculo, open])


  // O vínculo WhatsApp é definido exclusivamente pelo Contact Panel.
  // Ao editar uma tarefa vinculada, o ID original permanece preservado.
  const conversaFixada = Boolean(tarefa?.conversa_id || conversaInicialId)

  if (!open) return null

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!titulo.trim()) return toast.error('Informe a tarefa.')
    if (!responsavel) return toast.error('Selecione um responsável para a tarefa.')
    if ((vinculo === 'PESSOA' || vinculo === 'EMPRESA') && !clienteId) return toast.error('Selecione um cliente.')
    if (vinculo === 'CONVERSA' && !conversaId) return toast.error('A conversa vinculada não foi identificada.')
    const input: TarefaInput = {
      titulo: titulo.trim(), descricao: descricao.trim() || null, prioridade,
      responsavel_id: somenteProprio && tarefa ? usuarioId : responsavel || null,
      vencimento_em: vencimento ? new Date(vencimento).toISOString() : null,
      conversa_id: vinculo === 'CONVERSA' ? conversaId.trim() : null,
      crm_pessoa_id: vinculo === 'PESSOA' ? clienteId : null,
      crm_empresa_id: vinculo === 'EMPRESA' ? clienteId : null,
    }
    setSalvando(true)
    try { if (await onSave(input)) onClose() }
    finally { setSalvando(false) }
  }

  const inputClass = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-zinc-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !salvando) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={tarefa ? 'Editar tarefa' : 'Nova tarefa'} className="flex max-h-[95dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-950 sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Atendimento · Tarefas</p><h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">{tarefa ? 'Editar tarefa' : 'Nova tarefa'}</h2></div>
          <button type="button" disabled={salvando} onClick={onClose} aria-label="Fechar" className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={20}/></button>
        </header>
        <form onSubmit={e => void salvar(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">O que precisa ser feito? *<input value={titulo} autoFocus maxLength={240} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Retornar ligação do cliente" className={`mt-1.5 ${inputClass}`} required/></label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Observação (opcional)<textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Anote algum detalhe importante..." className={`mt-1.5 resize-none ${inputClass}`}/></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Prioridade<select value={prioridade} onChange={e => setPrioridade(e.target.value as PrioridadeTarefa)} className={`mt-1.5 ${inputClass}`}><option value="BAIXA">Baixa</option><option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></label>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Vencimento (opcional)<span className="relative mt-1.5 block"><CalendarDays size={15} className="pointer-events-none absolute left-3 top-3 text-zinc-400"/><input type="datetime-local" value={vencimento} onChange={e => setVencimento(e.target.value)} className={`${inputClass} pl-9`}/></span></label>
            </div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Responsável<select value={somenteProprio && tarefa ? usuarioId : responsavel} onChange={e => setResponsavel(e.target.value)} disabled={somenteProprio && !!tarefa} className={`mt-1.5 ${inputClass} disabled:opacity-60`}><option value="" disabled={!!tarefa || somenteProprio}>Selecione o responsável</option>{!responsaveis.some(r => r.id === usuarioId) && <option value={usuarioId}>Eu</option>}{responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select><p className="mt-1.5 text-[11px] font-normal text-zinc-500">Você pode atribuir uma nova tarefa a qualquer colaborador ativo da sua corretora. O responsável verá a pendência em sua lista.</p></label>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Vincular a (opcional)<select value={vinculo} disabled={conversaFixada} onChange={e => { setVinculo(e.target.value as VinculoTarefa); setClienteId(''); setConversaId(''); setNomeCliente(''); setBusca(''); setResultados([]) }} className={`mt-1.5 ${inputClass} disabled:opacity-60`}><option value="LIVRE">Sem vínculo — tarefa livre</option><option value="PESSOA">Pessoa física (CRM)</option><option value="EMPRESA">Empresa (CRM)</option>{conversaFixada && <option value="CONVERSA">Conversa do WhatsApp (origem preservada)</option>}</select></label>
              {(vinculo === 'PESSOA' || vinculo === 'EMPRESA') && (
                <div className="mt-3 space-y-2">
                  {clienteId && <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><span>✓ {nomeCliente || 'Cliente vinculado'}</span><button type="button" onClick={() => { setClienteId(''); setNomeCliente(''); setBusca('') }} className="underline">Trocar</button></div>}
                  <label className="relative block"><Search size={16} className="absolute left-3 top-3 text-zinc-400"/><input value={busca} onChange={e => { setBusca(e.target.value); setClienteId(''); setNomeCliente('') }} placeholder="Buscar cliente pelo nome (mínimo 3 letras)" className={`${inputClass} pl-9`}/></label>
                  {pesquisando && <p className="text-xs text-zinc-400">Pesquisando...</p>}
                  {resultados.length > 0 && <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">{resultados.map(item => <button key={item.id} type="button" onClick={() => { setClienteId(item.id); setNomeCliente(item.nome); setBusca(''); setResultados([]) }} className="block w-full border-b border-zinc-100 p-2.5 text-left text-xs hover:bg-violet-50 dark:border-zinc-800">{item.nome}</button>)}</div>}
                </div>
              )}
              {vinculo === 'CONVERSA' && conversaFixada && (
                <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                  Tarefa vinculada ao WhatsApp. A conversa de origem é preservada. Para criar novas tarefas de conversa, utilize o Contact Panel.
                </p>
              )}
            </div>
          </div>
          <footer className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"><button type="button" disabled={salvando || ocupado} onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:border-zinc-700">Cancelar</button><button type="submit" disabled={salvando || ocupado || !titulo.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40">{salvando && <Loader2 size={16} className="animate-spin"/>}{tarefa ? 'Salvar alterações' : 'Criar tarefa'}</button></footer>
        </form>
      </div>
    </div>
  )
}
