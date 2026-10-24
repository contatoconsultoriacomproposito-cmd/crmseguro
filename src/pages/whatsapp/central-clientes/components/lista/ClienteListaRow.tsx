import {
  Building2,
  CalendarClock,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import type { ClienteCentral } from '../../types/centralClientes'
import {
  formatarDataHora,
  formatarDocumento,
  formatarTelefone,
  labelEtapa,
} from '../../utils/clienteFormatters'
import ClienteAcoesMenu from './ClienteAcoesMenu'

interface Props {
  cliente: ClienteCentral
  onOpen: (cliente: ClienteCentral) => void
  onWhatsApp: (cliente: ClienteCentral) => void
  onTornarLead: (cliente: ClienteCentral) => void
  onExcluir: (cliente: ClienteCentral) => void
}

export default function ClienteListaRow({
  cliente,
  onOpen,
  onWhatsApp,
  onTornarLead,
  onExcluir,
}: Props) {
  const Icon =
    cliente.tipo === 'PF' ? UserRound : Building2

  return (
    <tr
      onClick={() => onOpen(cliente)}
      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/80"
    >
      <td className="px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="max-w-[260px] truncate text-sm font-semibold text-slate-800">
                {cliente.nome}
              </p>
              {cliente.classificacao === 'LEAD' && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-600">
                  {labelEtapa(cliente.etapaKanban)}
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-slate-400">
              {cliente.nomeSecundario ||
                (cliente.tipo === 'PF'
                  ? 'Pessoa física'
                  : 'Pessoa jurídica')}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5 text-xs text-slate-600">
        {formatarDocumento(
          cliente.documento,
          cliente.tipo
        )}
      </td>

      <td className="px-4 py-3.5">
        <p className="text-xs font-medium text-slate-600">
          {formatarTelefone(cliente.telefone)}
        </p>
        <p className="mt-0.5 max-w-[190px] truncate text-[11px] text-slate-400">
          {cliente.email || 'E-mail não informado'}
        </p>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex max-w-[220px] flex-wrap gap-1">
          {cliente.produtos.length ? (
            <>
              {cliente.produtos.slice(0, 2).map(produto => (
                <span
                  key={produto.id}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600"
                >
                  {produto.nome}
                </span>
              ))}
              {cliente.produtos.length > 2 && (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                  +{cliente.produtos.length - 2}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-slate-400">
              Sem contratos ativos
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-3.5">
        {cliente.proximoCompromisso ? (
          <div className="flex items-start gap-2">
            <CalendarClock
              size={14}
              className="mt-0.5 text-blue-500"
            />
            <div>
              <p className="text-xs font-medium text-slate-600">
                {formatarDataHora(
                  cliente.proximoCompromisso.inicioEm
                )}
              </p>
              <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-400">
                {cliente.proximoCompromisso.titulo}
              </p>
            </div>
          </div>
        ) : (
          <span
            className={`text-[11px] ${
              cliente.compromissoAtrasado
                ? 'font-medium text-rose-600'
                : 'text-slate-400'
            }`}
          >
            {cliente.compromissoAtrasado
              ? 'Possui compromisso atrasado'
              : 'Sem compromisso'}
          </span>
        )}
      </td>

      <td className="px-4 py-3.5">
        <span className="text-xs font-medium text-slate-600">
          {cliente.responsavelNome}
        </span>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            title={
              cliente.possuiWhatsApp
                ? 'Abrir WhatsApp'
                : 'WhatsApp não vinculado'
            }
            disabled={!cliente.possuiWhatsApp}
            onClick={event => {
              event.stopPropagation()
              onWhatsApp(cliente)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <MessageCircle size={15} />
          </button>

          <ClienteAcoesMenu
            cliente={cliente}
            onTornarLead={onTornarLead}
            onExcluir={onExcluir}
          />
        </div>
      </td>
    </tr>
  )
}
