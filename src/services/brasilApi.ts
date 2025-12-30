export async function buscarCNPJ(cnpj: string) {
  const clean = cnpj.replace(/\D/g, "")
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)

  if (!res.ok) {
    throw new Error("CNPJ não encontrado")
  }

  return res.json()
}

export async function buscarCEP(cep: string) {
  const clean = cep.replace(/\D/g, "")
  const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`)

  if (!res.ok) {
    throw new Error("CEP não encontrado")
  }

  return res.json()
}
