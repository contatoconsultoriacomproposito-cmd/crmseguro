import { supabase } from '../../../lib/supabaseClient'

type ContactResponse = {
  success?: boolean
  error?: string
  crmMessageId?: string
  providerMessageId?: string | null
}

/** Envio independente de arquivo/B2; autorização completa ocorre na Edge. */
export async function enviarContatoWhatsApp(conversationId: string, contactName: string, contactPhone: string): Promise<void> {
  const nome = contactName.trim()
  const telefone = contactPhone.replace(/\D/g, '')
  if (!conversationId || nome.length < 2 || telefone.length < 10 || telefone.length > 15) {
    throw new Error('Informe um nome e um telefone válido com DDI e DDD.')
  }
  const { data, error } = await supabase.functions.invoke<ContactResponse>('dapi-send-contact', {
    body: { conversationId, contactName: nome, contactPhone: telefone },
  })
  if (error || !data?.success || !data.crmMessageId) {
    throw new Error(data?.error || 'Não foi possível compartilhar o contato.')
  }
}
