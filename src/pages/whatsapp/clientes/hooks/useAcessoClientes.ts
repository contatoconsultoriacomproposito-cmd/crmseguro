import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useAuth } from '../../../../auth/AuthContext'
import type { Cliente360Tab, ClienteCentral } from '../types/centralClientes'

export type EscopoCliente = 'none' | 'own' | 'tenant'
export const ACOES_CLIENTES = [
  'read', 'create', 'open', 'view_cadastro', 'view_agenda', 'view_propostas',
  'view_contratos', 'view_sinistros', 'view_assistencias', 'view_financeiro',
  'view_comissoes', 'view_arquivos', 'update', 'transfer', 'make_lead',
  'delete', 'whatsapp',
] as const
export type AcaoCliente = typeof ACOES_CLIENTES[number]
export type AcessoClientes = {
  usuarioId: string
  corretoraId: string
  escopos: Record<AcaoCliente, EscopoCliente>
}
const NENHUM = Object.fromEntries(ACOES_CLIENTES.map(acao => [acao, 'none'])) as Record<AcaoCliente, EscopoCliente>
const TODOS = Object.fromEntries(ACOES_CLIENTES.map(acao => [acao, 'tenant'])) as Record<AcaoCliente, EscopoCliente>

export function podeCliente(acesso: AcessoClientes | null, acao: AcaoCliente, cliente?: Pick<ClienteCentral, 'corretorId' | 'corretoraId'> | null): boolean {
  if (!acesso) return false
  const escopo = acesso.escopos[acao]
  if (escopo === 'none') return false
  if (cliente && cliente.corretoraId !== acesso.corretoraId) return false
  return escopo === 'tenant' || (escopo === 'own' && (!cliente || cliente.corretorId === acesso.usuarioId))
}
export const ACAO_POR_ABA: Record<Cliente360Tab, AcaoCliente> = {
  cadastro: 'view_cadastro', agenda: 'view_agenda', propostas: 'view_propostas',
  contratos: 'view_contratos', sinistros: 'view_sinistros', assistencias: 'view_assistencias',
  financeiro: 'view_financeiro', comissoes: 'view_comissoes', arquivos: 'view_arquivos',
}
export const ABAS_CLIENTE: Cliente360Tab[] = [
  'cadastro', 'agenda', 'propostas', 'contratos', 'sinistros',
  'assistencias', 'financeiro', 'comissoes', 'arquivos',
]
export function abasPermitidas(acesso: AcessoClientes | null, cliente: ClienteCentral): Cliente360Tab[] {
  return ABAS_CLIENTE.filter(aba => podeCliente(acesso, ACAO_POR_ABA[aba], cliente))
}
export function exigirCliente(acesso: AcessoClientes | null, acao: AcaoCliente, cliente?: ClienteCentral): void {
  if (!podeCliente(acesso, acao, cliente)) throw new Error('Você não possui permissão para esta operação.')
}

export function useAcessoClientes() {
  const { userProfile } = useAuth()
  const [acesso, setAcesso] = useState<AcessoClientes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const usuarioId = userProfile?.id ?? null
  const corretoraId = userProfile?.corretora_id ?? null
  const tipo = userProfile?.tipo_usuario
  const ativo = (userProfile as { ativo?: boolean } | null | undefined)?.ativo !== false

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setAcesso(null)
    setError(null)
    if (!usuarioId || !corretoraId || !ativo) {
      setLoading(false)
      return
    }
    if (tipo === 'CORRETORA') {
      setAcesso({ usuarioId, corretoraId, escopos: { ...TODOS } })
      setLoading(false)
      return
    }
    if (tipo !== 'CORRETOR') {
      setAcesso({ usuarioId, corretoraId, escopos: { ...NENHUM } })
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const resultados = await Promise.all(ACOES_CLIENTES.map(acao =>
          supabase.rpc('crm_escopo_permissao', { p_recurso: 'operacoes.clientes', p_acao: acao })
        ))
        const falha = resultados.find(resultado => resultado.error)
        if (falha?.error) throw falha.error
        const escopos = { ...NENHUM }
        ACOES_CLIENTES.forEach((acao, i) => {
          const valor = resultados[i].data
          escopos[acao] = valor === 'own' || valor === 'tenant' ? valor : 'none'
        })
        if (!cancelado) setAcesso({ usuarioId, corretoraId, escopos })
      } catch (erro) {
        if (!cancelado) setError(erro instanceof Error ? erro.message : 'Falha ao consultar permissões de Clientes.')
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()
    return () => { cancelado = true }
  }, [usuarioId, corretoraId, tipo, ativo])

  return { acesso, loading, error }
}
