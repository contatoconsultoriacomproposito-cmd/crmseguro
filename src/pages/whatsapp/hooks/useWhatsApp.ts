import { useMemo } from 'react'
import { WhatsAppService } from '../services/WhatsAppService'
import { SupabaseWhatsAppProvider } from '../providers/SupabaseWhatsAppProvider'

export function useWhatsApp() {
  return useMemo(
    () => new WhatsAppService(new SupabaseWhatsAppProvider()),
    []
  )
}