export type StatusParcelaFinanceira =
  | "PENDENTE"
  | "PAGA"
  | "CANCELADA";

export type SituacaoParcelaFinanceira =
  | "A_VENCER"
  | "VENCE_HOJE"
  | "ATRASADA"
  | "PAGA"
  | "CANCELADA";

export type FormaPagamentoFinanceiro =
  | "CARTAO_CREDITO"
  | "DEBITO_CONTA"
  | "BOLETO"
  | "PIX"
  | "DINHEIRO"
  | "OUTROS";

export type TipoLancamentoFinanceiro =
  | "PARCELA"
  | "AVULSO";

export type TipoMovimentacaoFinanceira =
  | "CRIACAO_FINANCEIRO"
  | "EDICAO_PARCELA"
  | "BAIXA"
  | "BAIXA_LOTE"
  | "ESTORNO_BAIXA"
  | "RECONSTRUCAO"
  | "LANCAMENTO_AVULSO"
  | "CANCELAMENTO_PARCELA"
  | "EXCLUSAO_FINANCEIRO";

export type AcaoFinanceiro =
  | "BAIXAR"
  | "BAIXAR_LOTE"
  | "ESTORNAR"
  | "EDITAR_PARCELAS"
  | "LANCAMENTO_AVULSO";

export type TipoUsuarioFinanceiro =
  | "CORRETORA"
  | "CORRETOR"
  | "ADMIN";

export interface FinanceiroContrato {
  id: string;
  corretora_id: string;
  contrato_id: string;
  forma_pagamento: FormaPagamentoFinanceiro;
  quantidade_parcelas: number;
  baixa_automatica: boolean;
  valor_total: number;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelaFinanceira {
  id: string;
  corretora_id: string;
  financeiro_id: string;
  contrato_id: string;
  tipo_lancamento: TipoLancamentoFinanceiro;
  numero_parcela: number | null;
  descricao: string | null;
  valor: number;
  data_vencimento: string;
  status: StatusParcelaFinanceira;
  data_pagamento: string | null;
  baixado_por_id: string | null;
  baixado_em: string | null;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelaFinanceiraComSituacao
  extends ParcelaFinanceira {
  situacao: SituacaoParcelaFinanceira;
}

export interface MovimentacaoFinanceira {
  id: string;
  corretora_id: string;
  financeiro_id: string;
  parcela_id: string | null;
  contrato_id: string;
  tipo_movimentacao: TipoMovimentacaoFinanceira;
  justificativa: string | null;
  dados: Record<string, unknown>;
  usuario_id: string | null;
  created_at: string;
}

export interface ParcelaFinanceiraGerada {
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
}

export interface ParcelaFinanceiraEditavel {
  id: string;
  valor: number;
  data_vencimento: string;
}

export interface GerarParcelamentoParams {
  valor_total: number;
  quantidade_parcelas: number;
  primeiro_vencimento: string;
}

export interface ContextoPermissaoFinanceiro {
  tipoUsuario: TipoUsuarioFinanceiro;
  usuarioId: string;
}

export interface ResumoFinanceiroContrato {
  valor_total: number;
  valor_pago: number;
  valor_pendente: number;
  valor_a_vencer: number;
  valor_vence_hoje: number;
  valor_atrasado: number;
  valor_cancelado: number;
  valor_avulso: number;
  quantidade_parcelas: number;
  quantidade_pagas: number;
  quantidade_pendentes: number;
  quantidade_canceladas: number;
}

export interface FinanceiroContratoDetalhado {
  financeiro: FinanceiroContrato;
  parcelas: ParcelaFinanceiraComSituacao[];
  movimentacoes?: MovimentacaoFinanceira[];
  resumo: ResumoFinanceiroContrato;
}

export interface SalvarFinanceiroContratoPayload {
  contrato_id: string;
  forma_pagamento: FormaPagamentoFinanceiro;
  baixa_automatica: boolean;
  parcelas: ParcelaFinanceiraGerada[];
}

export interface ResultadoSalvarFinanceiroContrato {
  sucesso: boolean;
  financeiro_id: string;
  contrato_id: string;
  reconstrucao: boolean;
  quantidade_parcelas: number;
  valor_total: number;
  baixa_automatica: boolean;
}

export interface ExecutarAcaoFinanceiroPayload {
  financeiro_id: string;
  acao: AcaoFinanceiro;
  parcela_ids?: string[] | null;
  data_pagamento?: string | null;
  justificativa?: string | null;
  parcelas?: ParcelaFinanceiraEditavel[] | null;
  descricao?: string | null;
  valor?: number | null;
  data_vencimento?: string | null;
}

export interface ResultadoAcaoFinanceiro {
  sucesso: boolean;
  acao: AcaoFinanceiro;
  quantidade?: number;
  data_pagamento?: string;
  parcela_id?: string;
  status?: StatusParcelaFinanceira;
  valor?: number;
  valor_total?: number;
}

export interface BaixarParcelaPayload {
  financeiro_id: string;
  parcela_id: string;
  data_pagamento?: string | null;
}

export interface BaixarParcelasLotePayload {
  financeiro_id: string;
  parcela_ids: string[];
  data_pagamento?: string | null;
}

export interface EstornarBaixaPayload {
  financeiro_id: string;
  parcela_id: string;
  justificativa: string;
}

export interface EditarParcelasPayload {
  financeiro_id: string;
  parcelas: ParcelaFinanceiraEditavel[];
}

export interface LancamentoAvulsoPayload {
  financeiro_id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
}

export interface FiltrosFinanceiro {
  busca?: string;
  data_inicio?: string;
  data_fim?: string;
  corretor_id?: string;
  seguradora_id?: string;
  produto_id?: string;
  forma_pagamento?: FormaPagamentoFinanceiro | "";
  situacao?: SituacaoParcelaFinanceira | "";
  tipo_lancamento?: TipoLancamentoFinanceiro | "";
  contrato_id?: string;
  cliente_id?: string;
  pagina?: number;
  limite?: number;
}

export interface ItemFinanceiroGeral {
  parcela: ParcelaFinanceiraComSituacao;
  financeiro: FinanceiroContrato;
  contrato: {
    id: string;
    numero_apolice: string | null;
    produto_id: string;
    seguradora_id: string;
    corretor_id: string;
    valor_aceito: number;
    valor_atual: number;
    status: string;
  };
  cliente?: {
    id: string;
    nome: string;
    tipo: "PF" | "PJ";
  } | null;
  produto_nome?: string | null;
  seguradora_nome?: string | null;
  corretor_nome?: string | null;
}

export interface ResumoFinanceiroGeral {
  valor_a_vencer: number;
  valor_vence_hoje: number;
  valor_atrasado: number;
  valor_pago: number;
  valor_cancelado: number;
  quantidade_a_vencer: number;
  quantidade_vence_hoje: number;
  quantidade_atrasada: number;
  quantidade_paga: number;
  quantidade_cancelada: number;
}

export interface ResultadoBuscaFinanceiroGeral {
  itens: ItemFinanceiroGeral[];
  resumo: ResumoFinanceiroGeral;
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

export interface OpcaoFormaPagamento {
  value: FormaPagamentoFinanceiro;
  label: string;
}

export interface OpcaoSituacaoFinanceira {
  value: SituacaoParcelaFinanceira;
  label: string;
}

export const FORMAS_PAGAMENTO_FINANCEIRO: OpcaoFormaPagamento[] = [
  {
    value: "CARTAO_CREDITO",
    label: "Cartão de crédito",
  },
  {
    value: "DEBITO_CONTA",
    label: "Débito em conta",
  },
  {
    value: "BOLETO",
    label: "Boleto",
  },
  {
    value: "PIX",
    label: "PIX",
  },
  {
    value: "DINHEIRO",
    label: "Dinheiro",
  },
  {
    value: "OUTROS",
    label: "Outros",
  },
];

export const SITUACOES_FINANCEIRAS: OpcaoSituacaoFinanceira[] = [
  {
    value: "A_VENCER",
    label: "A vencer",
  },
  {
    value: "VENCE_HOJE",
    label: "Vence hoje",
  },
  {
    value: "ATRASADA",
    label: "Atrasada",
  },
  {
    value: "PAGA",
    label: "Paga",
  },
  {
    value: "CANCELADA",
    label: "Cancelada",
  },
];