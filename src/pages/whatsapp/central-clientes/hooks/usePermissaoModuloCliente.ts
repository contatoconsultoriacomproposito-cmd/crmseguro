import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useAuth } from '../../../../auth/AuthContext'
import type { ClienteCentral } from '../types/centralClientes'

/** A permissão para visualizar a aba não libera as ações do módulo geral. */
export function usePermissaoModuloCliente(recurso: string, acao: string, cliente: ClienteCentral) {
  const { userProfile } = useAuth()
  const [permitido, setPermitido] = useState(false)
  const usuarioId = userProfile?.id
  const corretoraId = userProfile?.corretora_id
  const tipo = userProfile?.tipo_usuario
  const ativo = (userProfile as { ativo?: boolean } | null | undefined)?.ativo !== false
  const dono = cliente.corretorId === usuarioId
  const mesmaCorretora = cliente.corretoraId === corretoraId
  useEffect(() => {
    let cancelado = false
    setPermitido(false)
    if (!usuarioId || !mesmaCorretora || !ativo) return
    if (tipo === 'CORRETORA') { setPermitido(true); return }
    if (tipo !== 'CORRETOR') return
    void (async () => {
      const { data, error } = await supabase.rpc('crm_escopo_permissao', {
        p_recurso: recurso, p_acao: acao,
      })
      if (!cancelado && !error) setPermitido(data === 'tenant' || (data === 'own' && dono))
    })()
    return () => { cancelado = true }
  }, [recurso, acao, usuarioId, mesmaCorretora, tipo, ativo, dono])
  return permitido
}
