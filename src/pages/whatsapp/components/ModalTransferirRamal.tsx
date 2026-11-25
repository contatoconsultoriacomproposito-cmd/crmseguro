import { useEffect, useState } from 'react'
import type { WhatsAppAttendant } from '../types/whatsapp'
import { Loader2, X } from 'lucide-react'

type Props = {
  aberto: boolean
  atendentes: WhatsAppAttendant[]
  operadorAtivoId: string
  principalId: string
  salvando: boolean
  onClose: () => void
  onConfirmar: (operadorId: string, motivo: string) => Promise<void>
}

export default function ModalTransferirRamal({
  aberto, atendentes, operadorAtivoId, principalId, salvando, onClose, onConfirmar,
}: Props) {
  const [destino, setDestino] = useState('')
  const [motivo, setMotivo] = useState('')
  useEffect(() => {
    if (aberto) { setDestino(''); setMotivo('') }
  }, [aberto])
  if (!aberto) return null

  const elegiveis = atendentes.filter(a => a.id !== operadorAtivoId)
  const valido = Boolean(destino && motivo.trim().length >= 3 && motivo.trim().length <= 2000)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !salvando) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Transferir atendimento">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Transferir Ramal</h3>
          <button type="button" disabled={salvando} onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18}/></button>
        </div>
        <p className="mb-4 text-xs text-gray-500">O responsável principal permanece o mesmo. Apenas o operador ativo muda.</p>
        <label className="mb-1 block text-xs font-semibold text-gray-700" htmlFor="ramal-destinatario">Novo operador</label>
        <select id="ramal-destinatario" value={destino} disabled={salvando} onChange={e => setDestino(e.target.value)} className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <option value="">Selecione um usuário</option>
          {elegiveis.map(a => <option key={a.id} value={a.id}>{a.name}{a.id === principalId ? ' (reassunção)' : ''}</option>)}
        </select>
        <label className="mb-1 block text-xs font-semibold text-gray-700" htmlFor="ramal-motivo">Motivo obrigatório</label>
        <textarea id="ramal-motivo" value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} rows={3} maxLength={2000} placeholder="Informe o motivo da transferência..." className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"/>
        <p className="mt-1 text-right text-[11px] text-gray-400">{motivo.trim().length}/2000</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={salvando} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-gray-700">Cancelar</button>
          <button type="button" disabled={!valido || salvando} onClick={() => void onConfirmar(destino, motivo)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {salvando && <Loader2 size={14} className="animate-spin"/>} Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
