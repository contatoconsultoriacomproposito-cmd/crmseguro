export type TipoNegocioProposta = 'NOVO' | 'RENOVACAO';
export type StatusProposta = 'EM_NEGOCIACAO' | 'VENDIDA' | 'PERDIDA' | 'CANCELADA';
export type ResultadoPropostaItem = 'PENDENTE' | 'CONTRATADO' | 'NAO_CONTRATADO';
export type StatusContrato = 'AGUARDANDO_EMISSAO' | 'ATIVO' | 'CANCELADO' | 'ENCERRADO';
export type PeriodicidadeContrato = 'ANUAL' | 'MENSAL' | 'PERSONALIZADO' | 'UNICO';
export type TipoClienteProposta = 'PF' | 'PJ';

export type OrigemClienteProposta =
  | 'CRM_PESSOA'
  | 'CRM_EMPRESA'
  | 'LEGADO';

export interface PropostaClienteResumo {
  id: string;
  tipo: TipoClienteProposta;
  origem: OrigemClienteProposta;
  nome: string;
  documento: string | null;
  corretora_id: string;
  corretor_id: string;
  telefone: string | null;
  email: string | null;
  municipio: string | null;
  uf: string | null;
  cliente_id_legado?: string | null;
}

export interface EmitirContratoPayload {
  contrato_id: string;
  numero_apolice: string;
  inicio_vigencia: string;
  fim_vigencia: string;
  periodicidade: PeriodicidadeContrato;
}

export interface PropostaPessoa {
  id: string;
  corretora_id: string;
  corretor_id: string;
  cpf: string | null;
  dados: Record<string, unknown>;
  classificacao: string | null;
  created_at?: string;
  updated_at?: string;
  cliente_id_legado?: string | null;
}

export interface PropostaEmpresa {
  id: string;
  corretora_id: string;
  corretor_id: string;
  cnpj: string | null;
  dados: Record<string, unknown>;
  dados_api_cnpj?: Record<string, unknown> | null;
  classificacao: string | null;
  created_at?: string;
  updated_at?: string;
  cliente_id_legado?: string | null;
}

export interface ProdutoPortfolio {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
}

export interface SeguradoraPortfolio {
  id: string;
  nome: string;
  cnpj: string | null;
  site: string | null;
  logo_url: string | null;
}

export interface PortfolioItem {
  id: string;
  corretora_id: string;
  produto_id: string;
  seguradora_id: string;
  produto: ProdutoPortfolio;
  seguradora: SeguradoraPortfolio;
}

export interface PropostaItem {
  id: string;
  corretora_id: string;
  proposta_id: string;
  produto_id: string;
  seguradora_id: string;
  valor_premio: number;
  valor_liquido: number | null;
  numero_cotacao: string | null;
  parcelamento_cotado: string | null;
  meio_pagamento_cotado: string | null;
  coberturas_franquias: unknown[];
  resultado: ResultadoPropostaItem;
  ordem: number;
  created_at: string;
  updated_at: string;
  produto?: ProdutoPortfolio | null;
  seguradora?: SeguradoraPortfolio | null;
}

export interface ContratoResumo {
  id: string;
  corretora_id: string;
  corretor_id: string;
  proposta_id: string;
  proposta_item_id: string;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  produto_id: string;
  seguradora_id: string;
  status: StatusContrato;
  data_venda: string;
  valor_aceito: number;
  valor_atual: number;
  numero_apolice: string | null;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  periodicidade: PeriodicidadeContrato | null;
  contrato_anterior_id: string | null;
}

export interface Proposta {
  id: string;
  corretora_id: string;
  corretor_id: string;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  numero_proposta: string;
  tipo_negocio: TipoNegocioProposta;
  status: StatusProposta;
  data_emissao: string;
  data_validade: string | null;
  data_venda: string | null;
  motivo_perda: string | null;
  observacoes: string | null;
  valor_total_ofertado: number;
  valor_total_vendido: number;
  contrato_origem_renovacao_id: string | null;
  criado_por_id: string;
  atualizado_por_id: string;
  created_at: string;
  updated_at: string;
}

export interface IniciarRenovacaoContratoPayload {
  contrato_id: string;
  corretor_id: string;
}

export interface ResultadoInicioRenovacao {
  proposta: PropostaDetalhada;
  renovacao_existente: boolean;
}

export interface ProdutoRenovacaoOrigem {
  contrato_id: string;
  produto_id: string;
  produto_nome: string;
  produto_categoria: string | null;
}

export interface PropostaListaItem extends Proposta {
  cliente_nome: string;
  cliente_documento: string | null;
  cliente_tipo: TipoClienteProposta;
  corretor_nome: string | null;
  quantidade_itens: number;
}

export interface PropostaDetalhada extends Proposta {
  cliente: PropostaClienteResumo | null;
  corretor_nome: string | null;
  itens: PropostaItem[];
  contratos: ContratoResumo[];
}

export interface FiltrosPropostas {
  busca?: string;
  status?: StatusProposta | '';
  tipo_negocio?: TipoNegocioProposta | '';
  corretor_id?: string;
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface ResultadoListaPropostas {
  dados: PropostaListaItem[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

export interface CriarPropostaPayload {
  corretor_id: string;
  crm_pessoa_id?: string | null;
  crm_empresa_id?: string | null;
  tipo_negocio?: TipoNegocioProposta;
  data_emissao?: string;
  data_validade?: string | null;
  observacoes?: string | null;
  contrato_origem_renovacao_id?: string | null;
}

export interface AtualizarPropostaPayload {
  corretor_id?: string;
  data_validade?: string | null;
  observacoes?: string | null;
}

export interface CriarPropostaItemPayload {
  proposta_id: string;
  produto_id: string;
  seguradora_id: string;
  valor_premio: number;
  valor_liquido?: number | null;
  numero_cotacao?: string | null;
  parcelamento_cotado?: string | null;
  meio_pagamento_cotado?: string | null;
  coberturas_franquias?: unknown[];
  ordem?: number;
}

export interface AtualizarPropostaItemPayload {
  produto_id?: string;
  seguradora_id?: string;
  valor_premio?: number;
  valor_liquido?: number | null;
  numero_cotacao?: string | null;
  parcelamento_cotado?: string | null;
  meio_pagamento_cotado?: string | null;
  coberturas_franquias?: unknown[];
  ordem?: number;
}

export interface ItemFechamentoProposta {
  item_id: string;
  valor_aceito: number;
}

export interface FecharPropostaPayload {
  proposta_id: string;
  itens_contratados: ItemFechamentoProposta[];
  data_venda?: string;
}

export interface ContratoGeradoFechamento {
  id: string;
  status: StatusContrato;
  data_venda: string;
  produto_id: string;
  seguradora_id: string;
  proposta_item_id: string;
  valor_aceito: number;
  valor_atual: number;
}

export interface ResultadoFechamentoProposta {
  sucesso: boolean;
  proposta_id: string;
  numero_proposta: string;
  status: 'VENDIDA';
  data_venda: string;
  valor_total_ofertado: number;
  valor_total_vendido: number;
  quantidade_itens_contratados: number;
  quantidade_contratos_criados: number;
  contratos: ContratoGeradoFechamento[];
}

export type AcaoExecutavelProposta =
  | 'EXCLUIR'
  | 'MARCAR_PERDIDA'
  | 'REABRIR'
  | 'REVERTER_VENDA';

export interface ExecutarAcaoPropostaPayload {
  proposta_id: string;
  acao: AcaoExecutavelProposta;
  motivo_perda?: string | null;
}

export interface ResultadoAcaoProposta {
  sucesso: boolean;
  acao: AcaoExecutavelProposta;
  proposta_id: string;
  status:
    | StatusProposta
    | null;
}