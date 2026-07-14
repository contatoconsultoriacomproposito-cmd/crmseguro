// Arquivo: /services/brasilApi.ts

// Função auxiliar para traduzir o QSA das APIs no padrão exato do seu useState de sócios
const formatarSocios = (qsa: any[]): Array<{ nome: string; cpf_cnpj: string; telefone: string; faixa_etaria: string }> => {
  if (!qsa || !Array.isArray(qsa)) return [];
  
  return qsa.map((socio) => ({
    nome: socio.nome_socio || socio.nome || "",
    cpf_cnpj: socio.cnpj_cpf_do_socio || socio.cpf_cnpj || "",
    telefone: "", // Sempre inicia vazio para o usuário preencher no formulário
    faixa_etaria: socio.faixa_etaria || "Não informada"
  }));
};

// 1. O Tradutor da BrasilAPI
const formatarBrasilAPI = (data: any) => ({
  cnpj: data.cnpj || "",
  razao_social: data.razao_social || "",
  nome_fantasia: data.nome_fantasia || "",
  porte: data.porte || "",
  capital_social: data.capital_social,
  natureza_juridica: data.natureza_juridica || "",
  opcao_pelo_mei: data.opcao_pelo_mei || false,
  opcao_pelo_simples: data.opcao_pelo_simples || false,
  ddd_telefone_1: data.ddd_telefone_1 || "",
  descricao_identificador_matriz_filial: data.descricao_identificador_matriz_filial || "",
  cep: data.cep || "",
  uf: data.uf || "",
  municipio: data.municipio || "",
  logradouro: data.logradouro || "",
  bairro: data.bairro || "",
  numero: data.numero || "",
  complemento: data.complemento || "",
  socios: formatarSocios(data.qsa),
  
  // Captura dos novos campos
  cnae_principal: data.cnae_fiscal_descricao || "",
  data_abertura: data.data_inicio_atividade || "", // Vem formatado como YYYY-MM-DD
  situacao_cadastral: data.descricao_situacao_cadastral || ""
});

// 2. O Tradutor da Minha Receita
const formatarMinhaReceita = (data: any) => ({
  cnpj: data.cnpj || "",
  razao_social: data.razao_social || "", 
  nome_fantasia: data.nome_fantasia || "",
  porte: data.porte || "",
  capital_social: data.capital_social,
  natureza_juridica: data.natureza_juridica || "",
  opcao_pelo_mei: data.opcao_pelo_mei || false,
  opcao_pelo_simples: data.opcao_pelo_simples || false,
  ddd_telefone_1: data.ddd_telefone_1 || "",
  descricao_identificador_matriz_filial: data.descricao_identificador_matriz_filial || "",
  cep: data.cep || "",
  uf: data.uf || "",
  municipio: data.municipio || "",
  logradouro: data.logradouro || "",
  bairro: data.bairro || "",
  numero: data.numero || "",
  complemento: data.complemento || "",
  socios: formatarSocios(data.qsa),
  
  // Captura dos novos campos
  cnae_principal: data.cnae_fiscal_descricao || "",
  data_abertura: data.data_inicio_atividade || "", // Vem formatado como YYYY-MM-DD
  situacao_cadastral: data.descricao_situacao_cadastral || ""
});

// 3. O Orquestrador que faz as buscas
export async function buscarCNPJ(cnpj: string) {
  const clean = cnpj.replace(/\D/g, "");

  // TENTA PRIMEIRO A BRASIL API
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (res.ok) {
      const data = await res.json();
      return formatarBrasilAPI(data); // Retorna com chaves idênticas ao useState
    }
    throw new Error("BrasilAPI falhou"); 
  } catch (err) {
    console.warn("BrasilAPI indisponível. Tentando Minha Receita...");
    
    // TENTA A MINHA RECEITA COMO PLANO B
    try {
      const res = await fetch(`https://minhareceita.org/${clean}`);
      if (res.ok) {
        const data = await res.json();
        return formatarMinhaReceita(data); // Retorna com chaves idênticas ao useState
      }
      throw new Error("Minha Receita também falhou");
    } catch (err2) {
      throw new Error("Não foi possível consultar os dados automaticamente. Por favor, preencha manualmente.");
    }
  }
}

export async function buscarCEP(cep: string) {
  const clean = cep.replace(/\D/g, "")
  const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`)

  if (!res.ok) {
    throw new Error("CEP não encontrado")
  }

  return res.json()
}
