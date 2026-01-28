export function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export function maskPhone(value: string) {
  const numbers = value.replace(/\D/g, "")

  if (numbers.length <= 10) {
    // (11) 2345-6789
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  // (11) 92345-6789
  return numbers
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

export const maskCurrency = (value: string | number): string => {
  if (!value) return "";
  
  // Remove tudo que não é dígito
  let v = String(value).replace(/\D/g, "");
  
  // Converte para centavos
  const numberValue = Number(v) / 100;
  
  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

/**
 * Converte "R$ 1.234,56" para 1234.56 (Número puro para o banco)
 */
export const parseCurrencyToNumber = (value: string): number => {
  if (!value) return 0;
  // Remove R$, espaços e pontos, e troca vírgula por ponto
  const cleanValue = value
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(cleanValue);
};

export function maskCEP(value: string) {
  return value
    .replace(/\D/g, "") // Remove tudo que não é dígito
    .replace(/^(\d{5})(\d)/, "$1-$2") // Aplica a máscara 00000-000
    .substring(0, 9); // Limita o tamanho máximo
}