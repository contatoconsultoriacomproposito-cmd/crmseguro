export interface FiltrosRenovacoes {
  busca?: string;
  corretor_ids?: string[];
  produto_ids?: string[];
  data_venda_inicio?: string;
  data_venda_fim?: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
}

export interface RenovacaoListaItem {
  contrato_id: string;
  proposta_id: string;
  numero_proposta: string;
  cliente_nome: string;
  cliente_tipo: 'PF' | 'PJ';
  cliente_documento: string | null;
  data_venda: string | null;
  inicio_vigencia: string | null;
  fim_vigencia: string;
  produto_id: string;
  produto_nome: string;
  produto_categoria: string | null;
  valor_premio_atual: number;
  numero_apolice: string | null;
  corretor_id: string;
  corretor_nome: string;
  status_contrato: 'ATIVO' | 'ENCERRADO';
  renovacao_em_andamento: boolean;
}

export interface ResumoRenovacaoProduto {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_total: number;
}

export interface ResultadoRenovacoes {
  dados: RenovacaoListaItem[];
  por_produto: ResumoRenovacaoProduto[];
  total: number;
  valor_total: number;
  pagina: number;
  por_pagina: number;
  excedeu_limite_exportacao: boolean;
}

export interface OpcoesRenovacoes {
  corretores: { id: string; nome: string }[];
  produtos: { id: string; nome: string; categoria: string | null }[];
}
