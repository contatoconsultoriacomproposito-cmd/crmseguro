import { useEffect, useState } from 'react'
import { ArrowLeftRight, Check, ChevronRight, History, Loader2, X } from 'lucide-react'
import type { WhatsAppAttendant } from '../types/whatsapp'
import { supabase } from '../../../lib/supabaseClient'

interface HistoricoRamal {
  id: string
  tipo_acao: string
  motivo: string
  criado_em: string
  operador_anterior: string | null
  operador_novo: string | null
  executado_por: string | null
}

interface Props {
  conversationId: string
  ramalAtivo: boolean
  responsavelPrincipal: string
  operadorAtivo: string | null
  responsavelId: string
  atendentes: WhatsAppAttendant[]
  carregandoAtendentes: boolean
  atribuindoResponsavel: boolean
  podeAlterarResponsavel: boolean
  podeAtivarRamal: boolean
  ativandoRamal: boolean
  podeTransferirRamal: boolean
  transferindoRamal: boolean
  onAlterarResponsavel: (id: string) => void | Promise<void>
  onAtivarRamal: () => void
  onTransferir: () => void
  onClose: () => void
}

export default function PainelGestaoAtendimento({
  conversationId, ramalAtivo, responsavelPrincipal, operadorAtivo,
  responsavelId, atendentes, carregandoAtendentes, atribuindoResponsavel,
  podeAlterarResponsavel, podeAtivarRamal, ativandoRamal,
  podeTransferirRamal, transferindoRamal, onAlterarResponsavel,
  onAtivarRamal, onTransferir, onClose,
}: Props) {
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [historico, setHistorico] = useState<HistoricoRamal[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [erroHistorico, setErroHistorico] = useState<string | null>(null)

  useEffect(() => {
    setMostrarHistorico(false)
    setHistorico([])
    setErroHistorico(null)
  }, [conversationId])

  useEffect(() => {
    if (!mostrarHistorico || !ramalAtivo) return
    let cancelado = false
    const carregar = async () => {
      setCarregandoHistorico(true)
      setErroHistorico(null)
      const { data, error } = await supabase.rpc('crm_whatsapp_ramal_historico_ui', {
        p_conversa_id: conversationId,
      })
      if (cancelado) return
      if (error) {
        setErroHistorico('Não foi possível consultar o histórico.')
      } else {
        setHistorico(Array.isArray(data) ? data as HistoricoRamal[] : [])
      }
      setCarregandoHistorico(false)
    }
    void carregar()
    return () => { cancelado = true }
  }, [conversationId, mostrarHistorico, ramalAtivo])

  return (
    <div
      className="absolute right-0 top-11 z-50 w-[min(340px,calc(100vw-24px))] rounded-xl border border-gray-200 bg-white shadow-xl"
      role="dialog"
      aria-label="Gestão do atendimento"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-semibold text-gray-800">Gestão do atendimento</span>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100" aria-label="Fechar painel"><X size={16}/></button>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Responsável principal</p>
          <p className="mt-0.5 truncate text-sm font-medium text-gray-800">{responsavelPrincipal}</p>
          {ramalAtivo && <p className="mt-0.5 text-[11px] text-gray-500">Titularidade preservada durante transferências.</p>}
        </div>
        {ramalAtivo ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Operador ativo</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-blue-800">{operadorAtivo || 'Não identificado'}</p>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500">Atendimento tradicional — Ramal não ativado.</p>
            {podeAlterarResponsavel && (
              <label className="mt-2 block text-xs text-gray-600">
                Alterar responsável
                <select
                  value={responsavelId}
                  disabled={carregandoAtendentes || atribuindoResponsavel}
                  onChange={e => void onAlterarResponsavel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 disabled:opacity-60"
                >
                  <option value="">Não atribuído</option>
                  {atendentes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        {ramalAtivo && podeTransferirRamal && (
          <button
            type="button" disabled={transferindoRamal}
            onClick={onTransferir}
            className="flex w-full items-center justify-between rounded-lg border border-blue-200 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
          >
            <span className="flex items-center gap-2"><ArrowLeftRight size={15}/> Transferir ou reassumir</span>
            {transferindoRamal ? <Loader2 size={15} className="animate-spin"/> : <ChevronRight size={15}/>}
          </button>
        )}
        {!ramalAtivo && podeAtivarRamal && (
          <button type="button" disabled={ativandoRamal} onClick={onAtivarRamal}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {ativandoRamal ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>} Ativar Ramal
          </button>
        )}
        {ramalAtivo && (
          <div className="border-t border-gray-100 pt-2">
            <button type="button" onClick={() => setMostrarHistorico(v => !v)}
              aria-expanded={mostrarHistorico}
              className="flex w-full items-center justify-between py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900">
              <span className="flex items-center gap-2"><History size={15}/> Histórico de transferências</span>
              <ChevronRight size={15} className={mostrarHistorico ? 'rotate-90' : ''}/>
            </button>
            {mostrarHistorico && (
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                {carregandoHistorico && <p className="text-xs text-gray-500">Carregando histórico...</p>}
                {erroHistorico && <p className="text-xs text-amber-700">{erroHistorico}</p>}
                {!carregandoHistorico && !erroHistorico && historico.length === 0 && <p className="text-xs text-gray-500">Nenhuma movimentação registrada.</p>}
                {!carregandoHistorico && historico.map(item => (
                  <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                    <div className="flex justify-between gap-2 text-[11px] font-semibold text-gray-700">
                      <span>{item.tipo_acao === 'REASSUNCAO' ? 'Reassunção' : item.tipo_acao === 'INICIALIZACAO' ? 'Inicialização' : 'Transferência'}</span>
                      <time className="shrink-0 font-normal text-gray-400">{new Date(item.criado_em).toLocaleString('pt-BR')}</time>
                    </div>
                    <p className="mt-1 text-xs text-gray-700">{item.operador_anterior || 'Início'} → {item.operador_novo || 'Não identificado'}</p>
                    <p className="mt-1 text-[11px] text-gray-500">Por {item.executado_por || 'Usuário não identificado'}</p>
                    {item.motivo && <p className="mt-1 text-[11px] text-gray-600">Motivo: {item.motivo}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
