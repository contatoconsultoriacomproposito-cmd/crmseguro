export function onlyDigits(
  value: string | number | null | undefined
): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function parseCPF(
  value: string | number | null | undefined
): string {
  return onlyDigits(value).slice(0, 11)
}

export function parseCNPJ(
  value: string | number | null | undefined
): string {
  return onlyDigits(value).slice(0, 14)
}

export function parsePhone(
  value: string | number | null | undefined
): string {
  let digits = onlyDigits(value)

  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2)
  }

  return digits.slice(0, 11)
}

export function parseCEP(
  value: string | number | null | undefined
): string {
  return onlyDigits(value).slice(0, 8)
}

export function parseCurrencyToNumber(
  value: string | number | null | undefined
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const clean = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const parsed = Number(clean)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

export function parseCurrencyInputToNumber(
  value: string | number | null | undefined
): number {
  const digits = onlyDigits(value)

  if (!digits) {
    return 0
  }

  return Number(digits) / 100
}

export function parsePercentageToNumber(
  value: string | number | null | undefined
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : 0
  }

  const parsed = Number(
    value
      .replace('%', '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  )

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

export function parseNullableString(
  value: unknown
): string | null {
  const result = String(value ?? '').trim()

  return result || null
}

export function parseNullableNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue)
    ? numberValue
    : null
}