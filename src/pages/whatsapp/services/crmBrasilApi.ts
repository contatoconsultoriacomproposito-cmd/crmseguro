export interface CrmConsultaCnpjResultado {
  fonte: 'BRASIL_API'
  consultado_em: string
  dados_api_cnpj: Record<string, any>
}

export interface CrmCepResultado {
  cep: string
  logradouro: string
  bairro: string
  municipio: string
  uf: string
  complemento: string
  dados_api_cep: Record<string, any>
}

const somenteNumeros = (valor?: string | null) =>
  String(valor || '').replace(/\D/g, '')

export async function buscarCnpjCrm(
  cnpj: string
): Promise<CrmConsultaCnpjResultado> {
  const documento = somenteNumeros(cnpj)

  if (documento.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.')
  }

  const response = await fetch(
    `https://brasilapi.com.br/api/cnpj/v1/${documento}`
  )

  if (!response.ok) {
    throw new Error('CNPJ não encontrado na BrasilAPI.')
  }

  const raw = (await response.json()) as Record<string, any>

  return {
    fonte: 'BRASIL_API',
    consultado_em: new Date().toISOString(),
    dados_api_cnpj: raw,
  }
}

export async function buscarCepCrm(
  cep: string
): Promise<CrmCepResultado | null> {
  const documento = somenteNumeros(cep)

  if (documento.length !== 8) {
    return null
  }

  const response = await fetch(
    `https://brasilapi.com.br/api/cep/v2/${documento}`
  )

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error('Não foi possível consultar o CEP.')
  }

  const raw = (await response.json()) as Record<string, any>

  return {
    cep: somenteNumeros(raw.cep || documento),
    logradouro: String(raw.street || raw.logradouro || '').trim(),
    bairro: String(raw.neighborhood || raw.bairro || '').trim(),
    municipio: String(raw.city || raw.localidade || raw.municipio || '').trim(),
    uf: String(raw.state || raw.uf || '').trim().toUpperCase(),
    complemento: String(raw.complemento || '').trim(),
    dados_api_cep: raw,
  }
}
