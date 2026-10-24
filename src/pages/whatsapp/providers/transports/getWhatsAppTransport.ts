import type {
  WhatsAppTransport,
  WhatsAppTransportName,
} from './WhatsAppTransport'

import { DApiTransport } from './DApiTransport'
import { ZApiTransport } from './ZApiTransport'

const transports: Partial<
  Record<WhatsAppTransportName, WhatsAppTransport>
> = {
  dapi: new DApiTransport(),
  zapi: new ZApiTransport(),
}

export function getWhatsAppTransport(
  provider: WhatsAppTransportName
): WhatsAppTransport {
  const transport = transports[provider]

  if (!transport) {
    throw new Error(
      `Provider WhatsApp ainda não possui transporte implementado: ${provider}`
    )
  }

  return transport
}