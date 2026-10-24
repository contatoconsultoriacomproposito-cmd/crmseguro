import {
  Building2,
  CalendarClock,
  MessageCircle,
  Target,
  UserRound,
  X,
} from 'lucide-react'
import type {
  ClienteCentral,
  ClienteKanbanStage,
} from '../../types/centralClientes'
import {
  KANBAN_STAGES,
} from '../../types/centralClientes'
import {
  formatarDataHora,
  formatarDocumento,
  labelTemperatura,
} from '../../utils/clienteFormatters'

interface Props {
  cliente: ClienteCentral
  salvando?: boolean
  onClose: () => void
  onWhatsApp: (cliente: ClienteCentral) => void
  onTornarLead: (cliente: ClienteCentral) => Promise<void>
  onAlterarEtapa: (
    cliente: ClienteCentral,
    etapa: ClienteKanbanStage
  ) => Promise<void>
}

export default function Cliente360Header({
  cliente,
  salvando = false,
  onClose,
  onWhatsApp,
  onTornarLead,
  onAlterarEtapa,
}: Props) {
  const Icon =
    cliente.tipo === 'PF' ? UserRound : Building2

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {cliente.nome}
              </h2>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500">
                {cliente.tipo}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                  cliente.classificacao === 'LEAD'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {cliente.classificacao === 'LEAD'
                  ? 'Lead'
                  : 'Não qualificado'}
              </span>

              {cliente.temperatura && (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-600">
                  {labelTemperatura(cliente.temperatura)}
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-xs text-slate-500">
              {cliente.nomeSecundario ||
                formatarDocumento(
                  cliente.documento,
                  cliente.tipo
                )}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
              <span>
                Responsável:{' '}
                <strong className="font-semibold text-slate-700">
                  {cliente.responsavelNome}
                </strong>
              </span>

              <span>
                Documento:{' '}
                <strong className="font-semibold text-slate-700">
                  {formatarDocumento(
                    cliente.documento,
                    cliente.tipo
                  )}
                </strong>
              </span>

              {cliente.proximoCompromisso && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={13} />
                  {formatarDataHora(
                    cliente.proximoCompromisso.inicioEm
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {cliente.classificacao !== 'LEAD' ? (
            <button
              type="button"
              disabled={salvando}
              onClick={() => void onTornarLead(cliente)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Target size={14} />
              Tornar Lead
            </button>
          ) : (
            <select
              value={cliente.etapaKanban || 'prospeccao'}
              disabled={salvando}
              onChange={event =>
                void onAlterarEtapa(
                  cliente,
                  event.target
                    .value as ClienteKanbanStage
                )
              }
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400"
            >
              {KANBAN_STAGES.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={!cliente.possuiWhatsApp}
            onClick={() => onWhatsApp(cliente)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-300"
            title="WhatsApp"
          >
            <MessageCircle size={15} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
