import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export interface RamalEstado {
  responsavel_principal_id: string
  operador_ativo_id: string
  versao: number
}

export function useWhatsAppRamal(conversationId?: string) {
  const [estado, setEstado] = useState<RamalEstado | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const atualizar = useCallback(async () => {
    if (!conversationId) {
      setEstado(null)
      setErro(null)
      return
    }
    const { data, error } = await supabase.rpc(
      'crm_whatsapp_ramal_estado_ui',
      { p_conversa_id: conversationId }
    )
    if (error) {
      setErro(error.message)
      setEstado(null)
      return
    }
    setErro(null)
    setEstado((data as RamalEstado | null) ?? null)
  }, [conversationId])

  useEffect(() => {
    let ativo = true
    setEstado(null)
    setErro(null)
    setCarregando(true)
    const carregar = async () => {
      try { await atualizar() } finally { if (ativo) setCarregando(false) }
    }
    void carregar()
    // Atualização isolada: nunca recarrega a timeline de mensagens.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void atualizar()
    }, 20000)
    const onFocus = () => { void atualizar() }
    window.addEventListener('focus', onFocus)
    return () => {
      ativo = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [atualizar])

  const ativar = useCallback(async () => {
    if (!conversationId) throw new Error('Conversa não selecionada.')
    const { error } = await supabase.rpc('crm_whatsapp_ramal_ativar_ui', {
      p_conversa_id: conversationId,
    })
    if (error) throw error
    await atualizar()
  }, [conversationId, atualizar])

  const transferir = useCallback(async (destinatarioId: string, motivo: string) => {
    if (!conversationId) throw new Error('Conversa não selecionada.')
    const { error } = await supabase.rpc('crm_whatsapp_ramal_transferir', {
      p_conversa_id: conversationId,
      p_novo_operador_id: destinatarioId,
      p_motivo: motivo.trim(),
    })
    if (error) throw error
    await atualizar()
  }, [conversationId, atualizar])

  return { estado, carregando, erro, atualizar, ativar, transferir }
}
