// utils/dateUtils.ts

export const formatarDataBR = (dataString: string | null | undefined) => {
  if (!dataString) return '---';

  try {
    // Se a string contiver o "T" ou espaço, é um timestamp (data + hora)
    // Se não, é uma data pura (YYYY-MM-DD)
    if (dataString.includes('T') || dataString.includes(' ')) {
      // Para Timestamps, usamos o Date padrão, pois a hora ajuda o JS a se localizar
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR');
    } else {
      // Para datas puras (Renovação), fazemos o split para ignorar o fuso horário
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    }
  } catch (error) {
    console.error("Erro ao formatar data:", dataString);
    return 'Data inválida';
  }
};