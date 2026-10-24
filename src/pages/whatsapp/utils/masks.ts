import { onlyDigits } from "./parsers"

export function maskCPF(
  value: string | number | null | undefined
): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCNPJ(
  value: string | number | null | undefined
): string {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskPhone(
  value: string | number | null | undefined
): string {
  let numbers = onlyDigits(value)

  if (numbers.startsWith('55') && numbers.length > 11) {
    numbers = numbers.slice(2)
  }

  numbers = numbers.slice(0, 11)

  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  return numbers
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCEP(
  value: string | number | null | undefined
): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2')
}

export function maskCurrencyInput(
  value: string | number | null | undefined
): string {
  const digits = onlyDigits(value)

  if (!digits) {
    return ''
  }

  const amount = Number(digits) / 100

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatCurrency(
  value: string | number | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'R$ 0,00'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return 'R$ 0,00'
  }

  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function maskPercentageInput(
  value: string | number | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return ''
  }

  const raw = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace('.', ',')

  const [inteiro, decimal = ''] = raw.split(',')

  const inteiroLimpo = inteiro
    .replace(/\D/g, '')
    .slice(0, 3)

  const decimalLimpo = decimal
    .replace(/\D/g, '')
    .slice(0, 2)

  if (!inteiroLimpo && !decimalLimpo) {
    return ''
  }

  return decimalLimpo
    ? `${inteiroLimpo || '0'},${decimalLimpo}`
    : inteiroLimpo
}

export function formatPercentage(
  value: string | number | null | undefined,
  casas = 2
): string {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '0%'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '0%'
  }

  return `${numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  })}%`
}