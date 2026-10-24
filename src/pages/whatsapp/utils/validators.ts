import {
  onlyDigits,
  parseCurrencyToNumber,
  parsePercentageToNumber,
} from './parsers'

export function validarCPF(
  value: string | number | null | undefined
): boolean {
  const cpf = onlyDigits(value)

  if (cpf.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let soma = 0

  for (let i = 0; i < 9; i++) {
    soma += Number(cpf[i]) * (10 - i)
  }

  let digito = 11 - (soma % 11)

  if (digito >= 10) {
    digito = 0
  }

  if (digito !== Number(cpf[9])) {
    return false
  }

  soma = 0

  for (let i = 0; i < 10; i++) {
    soma += Number(cpf[i]) * (11 - i)
  }

  digito = 11 - (soma % 11)

  if (digito >= 10) {
    digito = 0
  }

  return digito === Number(cpf[10])
}

export function validarCNPJ(
  value: string | number | null | undefined
): boolean {
  const cnpj = onlyDigits(value)

  if (cnpj.length !== 14) {
    return false
  }

  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false
  }

  const calcularDigito = (
    base: string,
    pesos: number[]
  ) => {
    const soma = base
      .split('')
      .reduce(
        (total, numero, index) =>
          total +
          Number(numero) *
            pesos[index],
        0
      )

    const resto = soma % 11

    return resto < 2
      ? 0
      : 11 - resto
  }

  const primeiro = calcularDigito(
    cnpj.slice(0, 12),
    [
      5, 4, 3, 2,
      9, 8, 7, 6,
      5, 4, 3, 2,
    ]
  )

  if (primeiro !== Number(cnpj[12])) {
    return false
  }

  const segundo = calcularDigito(
    cnpj.slice(0, 13),
    [
      6, 5, 4, 3,
      2, 9, 8, 7,
      6, 5, 4, 3,
      2,
    ]
  )

  return segundo === Number(cnpj[13])
}

export function validarCEP(
  value: string | number | null | undefined
): boolean {
  return onlyDigits(value).length === 8
}

export function validarTelefone(
  value: string | number | null | undefined
): boolean {
  let telefone = onlyDigits(value)

  if (
    telefone.startsWith('55') &&
    telefone.length > 11
  ) {
    telefone = telefone.slice(2)
  }

  return (
    telefone.length === 10 ||
    telefone.length === 11
  )
}

export function validarCelular(
  value: string | number | null | undefined
): boolean {
  let telefone = onlyDigits(value)

  if (
    telefone.startsWith('55') &&
    telefone.length > 11
  ) {
    telefone = telefone.slice(2)
  }

  return (
    telefone.length === 11 &&
    telefone[2] === '9'
  )
}

export function validarEmail(
  value: string | null | undefined
): boolean {
  const email = String(value ?? '').trim()

  if (!email) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  )
}

export function validarMoedaPositiva(
  value: string | number | null | undefined
): boolean {
  return parseCurrencyToNumber(value) > 0
}

export function validarPercentual(
  value: string | number | null | undefined,
  minimo = 0,
  maximo = 100
): boolean {
  const percentual =
    parsePercentageToNumber(value)

  return (
    Number.isFinite(percentual) &&
    percentual >= minimo &&
    percentual <= maximo
  )
}

export function validarObrigatorio(
  value: unknown
): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return false
  }

  if (typeof value === 'string') {
    return Boolean(value.trim())
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  return true
}