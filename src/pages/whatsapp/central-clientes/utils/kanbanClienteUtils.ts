import type {
  ClienteCentral,
  ClienteKanbanStage,
} from '../types/centralClientes'

export function clientesDaEtapa(
  clientes: ClienteCentral[],
  etapa: ClienteKanbanStage
): ClienteCentral[] {
  return clientes
    .filter(
      cliente =>
        cliente.classificacao === 'LEAD' &&
        (cliente.etapaKanban || 'prospeccao') === etapa
    )
    .sort(
      (a, b) =>
        (a.posicaoKanban ?? 0) - (b.posicaoKanban ?? 0)
    )
}

export function normalizarPosicoes(
  clientes: ClienteCentral[],
  etapa: ClienteKanbanStage
): ClienteCentral[] {
  return clientes.map((cliente, index) => ({
    ...cliente,
    etapaKanban: etapa,
    posicaoKanban: index,
  }))
}

export function moverClienteKanban(
  clientes: ClienteCentral[],
  clienteId: string,
  etapaDestino: ClienteKanbanStage,
  indiceDestino?: number
): ClienteCentral[] {
  const cliente = clientes.find(item => item.id === clienteId)
  if (!cliente) return clientes

  const origem = cliente.etapaKanban || 'prospeccao'
  const itensOrigem = clientesDaEtapa(clientes, origem).filter(
    item => item.id !== clienteId
  )
  const itensDestino =
    origem === etapaDestino
      ? itensOrigem
      : clientesDaEtapa(clientes, etapaDestino).filter(
          item => item.id !== clienteId
        )

  const destino = Math.max(
    0,
    Math.min(
      indiceDestino ?? itensDestino.length,
      itensDestino.length
    )
  )

  itensDestino.splice(destino, 0, {
    ...cliente,
    etapaKanban: etapaDestino,
  })

  const atualizados = new Map<string, ClienteCentral>()
  normalizarPosicoes(itensOrigem, origem).forEach(item =>
    atualizados.set(item.id, item)
  )
  normalizarPosicoes(itensDestino, etapaDestino).forEach(item =>
    atualizados.set(item.id, item)
  )

  return clientes.map(item => atualizados.get(item.id) || item)
}
