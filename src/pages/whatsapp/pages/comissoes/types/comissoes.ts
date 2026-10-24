// src/pages/whatsapp/pages/comissoes/types/comissoes.ts

export type TipoUsuarioComissao =
  | "CORRETORA"
  | "CORRETOR"
  | "ADMIN";

export type TipoCalculoComissao =
  | "PERCENTUAL"
  | "FIXO";

export type BasePercentualSplit =
  | "COMISSAO_BRUTA"
  | "BASE_CALCULO";

export type TipoParticipanteComissao =
  | "CORRETOR"
  | "SUPERVISOR"
  | "PARCEIRO"
  | "INDICADOR"
  | "OUTRO"
  | "CORRETORA";

export type StatusRecebimentoComissao =
  | "PENDENTE"
  | "RECEBIDA"
  | "CANCELADA";

export type SituacaoRecebimentoComissao =
  | "A_RECEBER"
  | "RECEBE_HOJE"
  | "ATRASADA"
  | "RECEBIDA"
  | "CANCELADA";

export type StatusPagamentoComissao =
  | "PENDENTE"
  | "PAGA"
  | "CANCELADA";

export type SituacaoPagamentoComissao =
  | "A_PAGAR"
  | "VENCE_HOJE"
  | "ATRASADA"
  | "PAGA"
  | "CANCELADA";

export type TipoMovimentacaoComissao =
  | "CRIACAO_COMISSAO"
  | "EDICAO_COMISSAO"
  | "RECONSTRUCAO_COMISSAO"
  | "RECEBIMENTO"
  | "ESTORNO_RECEBIMENTO"
  | "CRIACAO_SPLIT"
  | "EDICAO_SPLIT"
  | "PAGAMENTO_SPLIT"
  | "ESTORNO_PAGAMENTO_SPLIT"
  | "CANCELAMENTO_PROVISAO"
  | "REVERSAO_CANCELAMENTO_PROVISAO";

export type AcaoPermissaoComissao =
  | "VISUALIZAR"
  | "CRIAR"
  | "EDITAR"
  | "RECONSTRUIR"
  | "RECEBER"
  | "ESTORNAR_RECEBIMENTO"
  | "GERENCIAR_SPLITS"
  | "PAGAR_SPLIT"
  | "ESTORNAR_PAGAMENTO"
  | "CANCELAR_PROVISAO"
  | "REVERTER_CANCELAMENTO_PROVISAO";

export type AcaoComissao =
  | "RECEBER"
  | "ESTORNAR_RECEBIMENTO"
  | "PAGAR_SPLIT"
  | "ESTORNAR_PAGAMENTO"
  | "CANCELAR_PROVISAO"
  | "REVERSAO_CANCELAMENTO_PROVISAO";

export interface ContextoContratoComissao {
  id: string;
  corretora_id: string;
  corretor_id: string;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  produto_id: string;
  seguradora_id: string;
  numero_apolice: string | null;
  valor_aceito: number;
  valor_atual: number;
  status: string;
}

export type ModoProvisionamentoComissao =
  | "ANTECIPADO"
  | "PARCELADO"
  | "VINCULADO_A_PARCELAS"
  | "VITALICIO_PROVISIONADO";

export interface Comissao {
  id: string;
  corretora_id: string;
  contrato_id: string;
  tipo_calculo_comissao: TipoCalculoComissao;
  percentual_comissao: number | null;
  valor_comissao_fixa: number | null;
  valor_base_original: number;
  valor_deducoes_base: number;
  valor_base_calculo: number;
  valor_comissao_bruta: number;

  observacoes: string | null;
  metadata: Record<string, unknown>;
  criado_por_id: string | null;
  atualizado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComissaoDeducao {
  id: string;
  corretora_id: string;
  comissao_id: string;
  descricao: string;
  tipo_calculo: TipoCalculoComissao;
  percentual: number | null;
  valor_fixo: number | null;
  valor_calculado: number;
  ordem: number;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComissaoRecebimento {
  id: string;
  corretora_id: string;
  comissao_id: string;
  contrato_id: string;
  numero_provisao: number;
  descricao: string | null;
  valor_base_referencia: number;
  percentual_previsto: number;
  valor_previsto: number;
  data_prevista: string;
  status: StatusRecebimentoComissao;
  valor_recebido: number | null;
  data_recebimento: string | null;
  recebido_por_id: string | null;
  recebido_em: string | null;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComissaoRecebimentoComSituacao
  extends ComissaoRecebimento {
  situacao: SituacaoRecebimentoComissao;
}

export interface ComissaoSplit {
  id: string;
  corretora_id: string;
  comissao_id: string;
  contrato_id: string;
  tipo_participante: TipoParticipanteComissao;
  usuario_id: string | null;
  participante_nome: string | null;
  participante_documento: string | null;
  participante_metadata: Record<string, unknown>;
  tipo_calculo: TipoCalculoComissao;
  base_percentual: BasePercentualSplit | null;
  percentual: number | null;
  valor_fixo: number | null;
  valor_bruto_split: number;
  valor_deducoes: number;
  valor_liquido_split: number;
  residual_corretora: boolean;
  ordem: number;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComissaoSplitDeducao {
  id: string;
  corretora_id: string;
  comissao_id: string;
  split_id: string;
  descricao: string;
  tipo_calculo: TipoCalculoComissao;
  percentual: number | null;
  valor_fixo: number | null;
  valor_calculado: number;
  ordem: number;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComissaoPagamento {
  id: string;
  corretora_id: string;
  comissao_id: string;
  split_id: string;
  contrato_id: string;
  numero_provisao: number;
  descricao: string | null;
  valor_previsto: number;
  data_prevista: string;
  status: StatusPagamentoComissao;
  valor_pago: number | null;
  data_pagamento: string | null;
  pago_por_id: string | null;
  pago_em: string | null;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
  valor_base_referencia: number;
  percentual_previsto: number;
}

export interface ComissaoPagamentoComSituacao
  extends ComissaoPagamento {
  situacao: SituacaoPagamentoComissao;
}

export interface ComissaoMovimentacao {
  id: string;
  corretora_id: string;
  comissao_id: string;
  contrato_id: string;
  recebimento_id: string | null;
  split_id: string | null;
  pagamento_id: string | null;
  tipo_movimentacao: TipoMovimentacaoComissao;
  justificativa: string | null;
  dados: Record<string, unknown>;
  usuario_id: string | null;
  created_at: string;
}

export interface DeducaoComissaoInput {
  descricao: string;
  tipo_calculo: TipoCalculoComissao;
  percentual?: number | null;
  valor_fixo?: number | null;
}

export interface DeducaoComissaoCalculada
  extends DeducaoComissaoInput {
  valor_calculado: number;
}

export interface RecebimentoComissaoInput {
  data_prevista: string;
  valor_base_referencia: number;
  percentual_previsto: number;
  valor_previsto: number;
  descricao?: string | null;
}

export interface ProvisaoPagamentoSplitInput {
  data_prevista: string;
  valor_base_referencia: number;
  percentual_previsto: number;
  valor_previsto: number;
  descricao?: string | null;
}

export interface SplitComissaoInput {
  tipo_participante: TipoParticipanteComissao;
  usuario_id?: string | null;
  participante_nome?: string | null;
  participante_documento?: string | null;
  participante_metadata?: Record<string, unknown>;
  tipo_calculo: TipoCalculoComissao;
  base_percentual?: BasePercentualSplit | null;
  percentual?: number | null;
  valor_fixo?: number | null;
  residual_corretora?: boolean;
  ordem?: number;
  deducoes?: DeducaoComissaoInput[];
  pagamentos?: ProvisaoPagamentoSplitInput[];
}

export interface SplitComissaoCalculado
  extends SplitComissaoInput {
  valor_bruto_split: number;
  valor_deducoes: number;
  valor_liquido_split: number;
  deducoes_calculadas: DeducaoComissaoCalculada[];
}

export interface ProvisaoComissaoGerada {
  numero_provisao: number;
  valor_previsto: number;
  data_prevista: string;
  descricao?: string | null;
}

export interface ProvisaoPagamentoSplitGerada {
  numero_provisao: number;
  valor_previsto: number;
  data_prevista: string;
  descricao?: string | null;
}

export interface CalculoComissao {
  tipo_calculo_comissao: TipoCalculoComissao;
  valor_base_original: number;
  valor_deducoes_base: number;
  valor_base_calculo: number;
  percentual_comissao: number | null;
  valor_comissao_fixa: number | null;
  valor_comissao_bruta: number;
  deducoes: DeducaoComissaoCalculada[];
}

export interface CalculoDistribuicaoComissao {
  valor_comissao_bruta: number;
  valor_distribuido: number;
  valor_residual_corretora: number;
  splits: SplitComissaoCalculado[];
}

export interface ResumoRecebimentosComissao {
  valor_total_previsto: number;
  valor_recebido: number;
  valor_pendente: number;
  valor_a_receber: number;
  valor_recebe_hoje: number;
  valor_atrasado: number;
  valor_cancelado: number;
  quantidade_total: number;
  quantidade_recebidas: number;
  quantidade_pendentes: number;
  quantidade_canceladas: number;
}

export interface ResumoPagamentosComissao {
  valor_total_previsto: number;
  valor_pago: number;
  valor_pendente: number;
  valor_a_pagar: number;
  valor_vence_hoje: number;
  valor_atrasado: number;
  valor_cancelado: number;
  quantidade_total: number;
  quantidade_pagas: number;
  quantidade_pendentes: number;
  quantidade_canceladas: number;
}

export interface ResumoSplitsComissao {
  valor_comissao_bruta: number;
  valor_distribuido_bruto: number;
  valor_deducoes_splits: number;
  valor_distribuido_liquido: number;
  valor_residual_corretora: number;
  quantidade_splits: number;
}

export interface ComissaoContratoDetalhada {
  comissao: Comissao;
  deducoes: ComissaoDeducao[];
  recebimentos: ComissaoRecebimentoComSituacao[];
  splits: ComissaoSplit[];
  split_deducoes: ComissaoSplitDeducao[];
  pagamentos: ComissaoPagamentoComSituacao[];
  movimentacoes?: ComissaoMovimentacao[];
  resumo_recebimentos: ResumoRecebimentosComissao;
  resumo_pagamentos: ResumoPagamentosComissao;
  resumo_splits: ResumoSplitsComissao;
}

export interface ContextoPermissaoComissao {
  tipoUsuario: TipoUsuarioComissao;
  usuarioId: string;
  corretoraId?: string | null;
}

export interface CriarComissaoPayload {
  contrato_id: string;
  tipo_calculo_comissao: TipoCalculoComissao;
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  valor_base_original: number;
  recebimentos: RecebimentoComissaoInput[];
  observacoes?: string | null;
  deducoes?: DeducaoComissaoInput[];
  splits?: SplitComissaoInput[];
}

export interface ResultadoCriarComissao {
  sucesso: boolean;
  comissao_id: string;
  contrato_id: string;
  reconstrucao: boolean;
  tipo_calculo_comissao: TipoCalculoComissao;
  valor_base_original: number;
  valor_base_calculo: number;
  valor_comissao_bruta: number;
  quantidade_recebimentos: number;
  quantidade_splits: number;
  valor_distribuido: number;
  valor_residual_corretora: number;
}

export interface CancelarProvisaoComissaoPayload {
  recebimento_id?: string | null;
  pagamento_id?: string | null;
  justificativa: string;
}

export interface ReverterCancelamentoProvisaoComissaoPayload {
  recebimento_id?: string | null;
  pagamento_id?: string | null;
  justificativa: string;
}

export interface ReceberComissaoPayload {
  recebimento_id: string;
  data_recebimento?: string | null;
  valor_recebido?: number | null;
}

export interface EstornarRecebimentoComissaoPayload {
  recebimento_id: string;
  justificativa: string;
}

export interface PagarComissaoSplitPayload {
  pagamento_id: string;
  data_pagamento?: string | null;
  valor_pago?: number | null;
}

export interface EstornarPagamentoComissaoPayload {
  pagamento_id: string;
  justificativa: string;
}

export interface ResultadoOperacaoComissao {
  sucesso: boolean;
  acao?: AcaoComissao;
  id?: string;
  comissao_id?: string;
  recebimento_id?: string;
  split_id?: string;
  pagamento_id?: string;
  status?: StatusRecebimentoComissao | StatusPagamentoComissao;
  valor?: number;
  quantidade?: number;
}

export interface FiltrosComissoes {
  busca?: string;
  data_inicio?: string;
  data_fim?: string;
  corretor_id?: string;
  seguradora_id?: string;
  produto_id?: string;

  situacao_recebimento?: SituacaoRecebimentoComissao | "";
  situacao_pagamento?: SituacaoPagamentoComissao | "";
  tipo_participante?: TipoParticipanteComissao | "";
  contrato_id?: string;
  cliente_id?: string;
  pagina?: number;
  limite?: number;
}

export interface ItemComissaoGeral {
  comissao: Comissao;
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
  resumo_recebimentos: ResumoRecebimentosComissao;
  resumo_pagamentos: ResumoPagamentosComissao;
  resumo_splits: ResumoSplitsComissao;
}

export interface ResumoComissoesGeral {
  valor_comissao_bruta: number;
  valor_a_receber: number;
  valor_recebe_hoje: number;
  valor_atrasado_recebimento: number;
  valor_recebido: number;
  valor_a_pagar: number;
  valor_atrasado_pagamento: number;
  valor_pago: number;
  valor_residual_corretora: number;
  quantidade_comissoes: number;
}

export interface ResultadoBuscaComissoesGeral {
  itens: ItemComissaoGeral[];
  resumo: ResumoComissoesGeral;
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

export interface ItemMinhaComissaoCorretor {
  split: ComissaoSplit;

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

  deducoes: ComissaoSplitDeducao[];
  pagamentos: ComissaoPagamentoComSituacao[];

  resumo_pagamentos: ResumoPagamentosComissao;
}

export interface ResumoMinhasComissoesCorretor {
  valor_bruto: number;
  valor_deducoes: number;
  valor_liquido: number;
  valor_a_receber: number;
  valor_vence_hoje: number;
  valor_atrasado: number;
  valor_pago: number;
  quantidade_comissoes: number;
}

export interface ResultadoBuscaMinhasComissoesCorretor {
  itens: ItemMinhaComissaoCorretor[];
  resumo: ResumoMinhasComissoesCorretor;
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

export const TIPOS_PARTICIPANTE_COMISSAO: {
  value: TipoParticipanteComissao;
  label: string;
}[] = [
  { value: "CORRETOR", label: "Corretor" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "PARCEIRO", label: "Parceiro" },
  { value: "INDICADOR", label: "Indicador" },
  { value: "OUTRO", label: "Outro" },
  { value: "CORRETORA", label: "Corretora" },
];

export const TIPOS_CALCULO_COMISSAO: {
  value: TipoCalculoComissao;
  label: string;
}[] = [
  { value: "PERCENTUAL", label: "Percentual" },
  { value: "FIXO", label: "Valor fixo" },
];

export const BASES_PERCENTUAL_SPLIT: {
  value: BasePercentualSplit;
  label: string;
}[] = [
  {
    value: "COMISSAO_BRUTA",
    label: "Comissão bruta",
  },
  {
    value: "BASE_CALCULO",
    label: "Base de cálculo",
  },
];

export const SITUACOES_RECEBIMENTO_COMISSAO: {
  value: SituacaoRecebimentoComissao;
  label: string;
}[] = [
  { value: "A_RECEBER", label: "A receber" },
  { value: "RECEBE_HOJE", label: "Recebe hoje" },
  { value: "ATRASADA", label: "Atrasada" },
  { value: "RECEBIDA", label: "Recebida" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const SITUACOES_PAGAMENTO_COMISSAO: {
  value: SituacaoPagamentoComissao;
  label: string;
}[] = [
  { value: "A_PAGAR", label: "A pagar" },
  { value: "VENCE_HOJE", label: "Vence hoje" },
  { value: "ATRASADA", label: "Atrasada" },
  { value: "PAGA", label: "Paga" },
  { value: "CANCELADA", label: "Cancelada" },
];
