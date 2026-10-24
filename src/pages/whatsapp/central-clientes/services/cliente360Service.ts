import { supabase } from '../../../../lib/supabaseClient'
import { buscarClienteCentralPorId } from './centralClientesService'
import type {
  Cliente360Contadores,
  ClienteCentral,
} from '../types/centralClientes'

export async function buscarCliente360Cabecalho(
  tipo: 'PF' | 'PJ',
  id: string
): Promise<ClienteCentral | null> {
  return buscarClienteCentralPorId(tipo, id)
}

async function contar(
  tabela: string,
  coluna: string,
  id: string
): Promise<number> {
  const { count, error } = await supabase
    .from(tabela)
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(coluna, id)

  if (error) throw error
  return count || 0
}

export async function buscarContadoresCliente360(
  cliente: Pick<ClienteCentral, 'id' | 'tipo'>
): Promise<Cliente360Contadores> {
  const coluna =
    cliente.tipo === 'PF'
      ? 'crm_pessoa_id'
      : 'crm_empresa_id'

  const [
    agenda,
    propostas,
    contratos,
    sinistros,
    assistencias,
    arquivos,
  ] = await Promise.all([
    contar('crm_agenda', coluna, cliente.id),
    contar('crm_propostas', coluna, cliente.id),
    contar('crm_contratos', coluna, cliente.id),
    contar('crm_sinistros', coluna, cliente.id),
    contar('crm_assistencias', coluna, cliente.id),
    contar('crm_arquivos', coluna, cliente.id),
  ])

  const { data: contratosCliente, error: contratosError } =
    await supabase
      .from('crm_contratos')
      .select('id')
      .eq(coluna, cliente.id)

  if (contratosError) throw contratosError

  const idsContratos = (contratosCliente || []).map(
    (item: any) => item.id
  )

  let financeiro = 0
  if (idsContratos.length) {
    const { count, error } = await supabase
      .from('crm_comissoes')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .in('contrato_id', idsContratos)

    if (error) throw error
    financeiro = count || 0
  }

  return {
    agenda,
    propostas,
    contratos,
    sinistros,
    assistencias,
    financeiro,
    arquivos,
  }
}
