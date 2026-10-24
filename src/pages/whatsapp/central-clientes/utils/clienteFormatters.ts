import type {
  ClienteKanbanStage,
  ClienteTemperatura,
} from '../types/centralClientes'

export function somenteNumeros(valor?: string | null): string {
  return String(valor || '').replace(/\D/g, '')
}

export function formatarCpf(valor?: string | null): string {
  const n = somenteNumeros(valor)
  if (n.length !== 11) return valor || '—'
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarCnpj(valor?: string | null): string {
  const n = somenteNumeros(valor)
  if (n.length !== 14) return valor || '—'
  return n.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  )
}

export function formatarDocumento(
  valor: string | null | undefined,
  tipo: 'PF' | 'PJ'
): string {
  return tipo === 'PF'
    ? formatarCpf(valor)
    : formatarCnpj(valor)
}

export function formatarTelefone(valor?: string | null): string {
  const n = somenteNumeros(valor)
  if (!n) return '—'
  if (n.length === 11) {
    return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (n.length === 10) {
    return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return valor || '—'
}

export function formatarDataHora(valor?: string | null): string {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

export function labelTemperatura(
  valor: ClienteTemperatura
): string {
  switch (valor) {
    case 'FRIO':
      return 'Frio'
    case 'MORNO':
      return 'Morno'
    case 'QUENTE':
      return 'Quente'
    default:
      return 'Não definida'
  }
}

export function labelEtapa(
  etapa?: ClienteKanbanStage | null
): string {
  switch (etapa) {
    case 'prospeccao':
      return 'Prospecção'
    case 'negociacao':
      return 'Negociação'
    case 'fechamento':
      return 'Fechamento'
    case 'pos_venda':
      return 'Pós-venda'
    case 'perdido':
      return 'Perdido'
    case 'assistencia':
      return 'Assistência'
    case 'sinistro':
      return 'Sinistro'
    default:
      return 'Sem etapa'
  }
}
