import { useEffect, useState } from 'react'
import { ContactRound, Loader2, Search, X } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

type Contato = { id: string; nome: string; telefone: string }

interface Props {
  aberto: boolean
  enviando: boolean
  onClose: () => void
  onEnviar: (nome: string, telefone: string) => Promise<void>
}

const somenteDigitos = (valor: string) => valor.replace(/\D/g, '')

export default function ModalCompartilharContato({ aberto, enviando, onClose, onEnviar }: Props) {
  const [busca, setBusca] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [contatos, setContatos] = useState<Contato[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')

  useEffect(() => {
    if (!aberto) return
    setBusca('')
    setNome('')
    setTelefone('')
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    let ativo = true
    const timer = setTimeout(async () => {
      setCarregando(true)
      setErroBusca('')
      // Apenas contatos que as políticas RLS permitem ao usuário consultar.
      const query = supabase.from('whatsapp_contatos')
        .select('id,nome,telefone')
        .order('nome', { ascending: true })
        .limit(30)
      const termo = busca.trim()
      const digitos = somenteDigitos(termo)
      const { data, error } = termo.length >= 2
        ? await query.or(`nome.ilike.%${termo.replace(/[%,()]/g, '')}%,telefone.ilike.%${digitos || '__sem_telefone__'}%`)
        : await query
      if (!ativo) return
      if (error) {
        setContatos([])
        setErroBusca('Não foi possível carregar a lista de contatos. Você ainda pode informar os dados manualmente.')
      } else {
        setContatos((data || []) as Contato[])
      }
      setCarregando(false)
    }, 250)
    return () => { ativo = false; clearTimeout(timer) }
  }, [aberto, busca])

  if (!aberto) return null
  const numero = somenteDigitos(telefone)
  const valido = nome.trim().length >= 2 && numero.length >= 10 && numero.length <= 15

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !enviando) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="Compartilhar contato" className="flex max-h-[90vh] w-full max-w-[470px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5"><ContactRound size={20} className="text-emerald-600" /><h2 className="text-base font-semibold text-slate-800">Compartilhar contato</h2></div>
          <button type="button" aria-label="Fechar" title="Fechar" disabled={enviando} onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Pesquisar contato já cadastrado</label>
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400" placeholder="Nome ou telefone" value={busca} onChange={e => setBusca(e.target.value)} disabled={enviando} />
          </div>
          {erroBusca && <p className="mt-2 text-xs text-amber-700">{erroBusca}</p>}
          <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-100">
            {carregando ? <div className="flex items-center gap-2 p-3 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Buscando...</div> :
              contatos.length === 0 ? <p className="p-3 text-xs text-slate-400">Nenhum contato encontrado. Preencha abaixo manualmente.</p> :
              contatos.map(contato => <button key={contato.id} type="button" disabled={enviando} onClick={() => { setNome(contato.nome || ''); setTelefone(contato.telefone || '') }} className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-3 py-2 text-left hover:bg-emerald-50"><span className="truncate text-xs font-medium text-slate-700">{contato.nome}</span><span className="shrink-0 text-[11px] text-slate-500">{contato.telefone}</span></button>) }
          </div>
          <div className="my-4 border-t border-slate-100" />
          <p className="mb-3 text-xs text-slate-500">Confira os dados antes de compartilhar. É possível inserir um contato manualmente.</p>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome do contato</label>
          <input value={nome} onChange={e => setNome(e.target.value)} disabled={enviando} maxLength={160} placeholder="Nome completo" className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
          <label className="mb-1 block text-xs font-medium text-slate-700">Telefone com DDI e DDD</label>
          <input value={telefone} onChange={e => setTelefone(e.target.value)} disabled={enviando} inputMode="tel" placeholder="5548999999999" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
          {telefone && !valido && <p className="mt-1 text-[11px] text-slate-500">Informe nome e número com 10 a 15 dígitos, incluindo DDI.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} disabled={enviando} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Cancelar</button>
          <button type="button" disabled={!valido || enviando} onClick={() => void onEnviar(nome.trim(), numero)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{enviando && <Loader2 size={15} className="animate-spin" />}Compartilhar</button>
        </div>
      </section>
    </div>
  )
}
