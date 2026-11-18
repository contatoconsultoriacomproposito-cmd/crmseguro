import type { AcessoClientes } from '../hooks/useAcessoClientes'
import type { Cliente360Tab } from '../types/centralClientes'
import { supabase } from '../../../../lib/supabaseClient'
import { buscarClienteCentralPorId } from './centralClientesService'
import type {
  Cliente360Contadores,
  ClienteCentral,
} from '../types/centralClientes'

export async function buscarCliente360Cabecalho(
  tipo: 'PF' | 'PJ',
  id: string,
  acesso: AcessoClientes
): Promise<ClienteCentral | null> {
  return buscarClienteCentralPorId(tipo, id, acesso)
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

  // Uma consulta auxiliar negada não deve bloquear todo o card 360°.
  if (error) return 0
  return count || 0
}

export async function buscarContadoresCliente360(
  cliente: Pick<ClienteCentral, 'id' | 'tipo'>,
  abas: Cliente360Tab[]
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
    abas.includes('agenda') ? contar('crm_agenda', coluna, cliente.id) : Promise.resolve(0),
    abas.includes('propostas') ? contar('crm_propostas', coluna, cliente.id) : Promise.resolve(0),
    abas.includes('contratos') ? contar('crm_contratos', coluna, cliente.id) : Promise.resolve(0),
    abas.includes('sinistros') ? contar('crm_sinistros', coluna, cliente.id) : Promise.resolve(0),
    abas.includes('assistencias') ? contar('crm_assistencias', coluna, cliente.id) : Promise.resolve(0),
    abas.includes('arquivos') ? contar('crm_arquivos', coluna, cliente.id) : Promise.resolve(0),
  ])

  const { data: contratosCliente, error: contratosError } =
    abas.includes('financeiro') ? await supabase
      .from('crm_contratos')
      .select('id')
      .eq(coluna, cliente.id) : { data: [] as { id: string }[], error: null }

  if (contratosError) return { agenda, propostas, contratos, sinistros, assistencias, financeiro: 0, arquivos }

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

    if (!error) financeiro = count || 0
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
