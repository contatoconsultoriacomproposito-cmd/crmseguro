export function normalizeWhatsAppPhone(
  value: string
): string {
  let digits =
    value.replace(/\D/g, '')

  if (!digits) {
    throw new Error(
      'Informe o número do WhatsApp.'
    )
  }

  if (digits.startsWith('0')) {
    digits =
      digits.replace(/^0+/, '')
  }

  if (!digits.startsWith('55')) {
    if (
      digits.length === 10 ||
      digits.length === 11
    ) {
      digits = `55${digits}`
    }
  }

  if (
    digits.length < 12 ||
    digits.length > 13
  ) {
    throw new Error(
      'Informe um número de WhatsApp válido com DDD.'
    )
  }

  return digits
}

export function getBrazilPhoneVariants(
  value: string
): string[] {
  const phone =
    value.replace(/\D/g, '')

  const variants =
    new Set<string>()

  if (!phone) {
    return []
  }

  variants.add(phone)

  if (!phone.startsWith('55')) {
    return [...variants]
  }

  if (
    phone.length === 13 &&
    phone.charAt(4) === '9'
  ) {
    variants.add(
      `${phone.slice(0, 4)}${phone.slice(5)}`
    )
  }

  if (
    phone.length === 12 &&
    /^[6789]/.test(
      phone.charAt(4)
    )
  ) {
    variants.add(
      `${phone.slice(0, 4)}9${phone.slice(4)}`
    )
  }

  return [...variants]
}