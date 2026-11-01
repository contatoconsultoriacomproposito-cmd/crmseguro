export type TipoNegocioProposta =
  | 'NOVO'
  | 'RENOVACAO';

export type StatusProposta =
  | 'EM_NEGOCIACAO'
  | 'VENDIDA'
  | 'PERDIDA'
  | 'CANCELADA';

export type ResultadoPropostaItem =
  | 'PENDENTE'
  | 'CONTRATADO'
  | 'NAO_CONTRATADO';

export type StatusContrato =
  | 'AGUARDANDO_EMISSAO'
  | 'ATIVO'
  | 'CANCELADO'
  | 'ENCERRADO';

export type PeriodicidadeContrato =
  | 'ANUAL'
  | 'MENSAL'
  | 'PERSONALIZADO'
  | 'UNICO';

export type TipoClienteProposta =
  | 'PF'
  | 'PJ';

export type OrigemClienteProposta =
  | 'CRM_PESSOA'
  | 'CRM_EMPRESA'
  | 'LEGADO';


/*
 * ============================================================
 * CLIENTE
 * ============================================================
 */

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


/*
 * ============================================================
 * FILTROS / OPÇÕES DA LISTAGEM
 * ============================================================
 *
 * Estruturas utilizadas para alimentar
 * os filtros da tela de propostas.
 */

export interface PropostaFiltroCorretor {
  id: string;
  nome: string;
}

export interface PropostaFiltroProduto {
  id: string;
  nome: string;
  categoria: string | null;
}


/*
 * ============================================================
 * CONTRATOS
 * ============================================================
 */

export interface EmitirContratoPayload {
  contrato_id: string;
  numero_apolice: string;
  inicio_vigencia: string;
  fim_vigencia: string;
  periodicidade: PeriodicidadeContrato;
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

  periodicidade:
    | PeriodicidadeContrato
    | null;

  contrato_anterior_id:
    | string
    | null;
}


/*
 * ============================================================
 * PESSOA / EMPRESA
 * ============================================================
 */

export interface PropostaPessoa {
  id: string;

  corretora_id: string;
  corretor_id: string;

  cpf: string | null;

  dados: Record<
    string,
    unknown
  >;

  classificacao:
    | string
    | null;

  created_at?: string;
  updated_at?: string;

  cliente_id_legado?:
    | string
    | null;
}

export interface PropostaEmpresa {
  id: string;

  corretora_id: string;
  corretor_id: string;

  cnpj: string | null;

  dados: Record<
    string,
    unknown
  >;

  dados_api_cnpj?:
    | Record<
        string,
        unknown
      >
    | null;

  classificacao:
    | string
    | null;

  created_at?: string;
  updated_at?: string;

  cliente_id_legado?:
    | string
    | null;
}


/*
 * ============================================================
 * PORTFÓLIO
 * ============================================================
 */

export interface ProdutoPortfolio {
  id: string;
  nome: string;

  categoria:
    | string
    | null;

  descricao:
    | string
    | null;
}

export interface SeguradoraPortfolio {
  id: string;
  nome: string;

  cnpj:
    | string
    | null;

  site:
    | string
    | null;

  logo_url:
    | string
    | null;
}

export interface PortfolioItem {
  id: string;

  corretora_id: string;

  produto_id: string;
  seguradora_id: string;

  produto: ProdutoPortfolio;
  seguradora: SeguradoraPortfolio;
}


/*
 * ============================================================
 * ITENS DA PROPOSTA
 * ============================================================
 */

export interface PropostaItem {
  id: string;

  corretora_id: string;
  proposta_id: string;

  produto_id: string;
  seguradora_id: string;

  valor_premio: number;

  valor_liquido:
    | number
    | null;

  numero_cotacao:
    | string
    | null;

  parcelamento_cotado:
    | string
    | null;

  meio_pagamento_cotado:
    | string
    | null;

  coberturas_franquias:
    unknown[];

  resultado:
    ResultadoPropostaItem;

  ordem: number;

  created_at: string;
  updated_at: string;

  produto?:
    | ProdutoPortfolio
    | null;

  seguradora?:
    | SeguradoraPortfolio
    | null;
}


/*
 * ============================================================
 * PROPOSTA
 * ============================================================
 */

export interface Proposta {
  id: string;

  corretora_id: string;
  corretor_id: string;

  crm_pessoa_id:
    | string
    | null;

  crm_empresa_id:
    | string
    | null;

  numero_proposta: string;

  tipo_negocio:
    TipoNegocioProposta;

  status:
    StatusProposta;

  data_emissao: string;

  data_validade:
    | string
    | null;

  data_venda:
    | string
    | null;

  motivo_perda:
    | string
    | null;

  observacoes:
    | string
    | null;

  valor_total_ofertado:
    number;

  valor_total_vendido:
    number;

  contrato_origem_renovacao_id:
    | string
    | null;

  criado_por_id: string;
  atualizado_por_id: string;

  created_at: string;
  updated_at: string;
}


/*
 * ============================================================
 * LISTAGEM DE PROPOSTAS
 * ============================================================
 */

export interface PropostaListaItem
  extends Proposta {

  cliente_nome: string;

  cliente_documento:
    | string
    | null;

  cliente_tipo:
    TipoClienteProposta;

  corretor_nome:
    | string
    | null;

  quantidade_itens:
    number;

  /*
   * Produtos existentes nos itens
   * da proposta.
   *
   * Uma proposta pode possuir várias
   * cotações e mais de um produto.
   */
  produtos: string[];

  /*
   * Vigência efetiva.
   *
   * A vigência não pertence à
   * crm_propostas.
   *
   * Ela é derivada dos contratos
   * gerados pela proposta.
   */
  vigencia_inicio:
    | string
    | null;

  vigencia_fim:
    | string
    | null;
}


/*
 * ============================================================
 * PROPOSTA DETALHADA
 * ============================================================
 */

export interface PropostaDetalhada
  extends Proposta {

  cliente:
    | PropostaClienteResumo
    | null;

  corretor_nome:
    | string
    | null;

  itens:
    PropostaItem[];

  contratos:
    ContratoResumo[];
}


/*
 * ============================================================
 * FILTROS DA LISTAGEM
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Os filtros abaixo representam a nova
 * arquitetura da tela.
 *
 * Filtros categóricos utilizam arrays
 * porque a interface permitirá marcar
 * várias opções simultaneamente.
 *
 * Exemplos:
 *
 * status:
 * [
 *   'VENDIDA',
 *   'EM_NEGOCIACAO'
 * ]
 *
 * corretor_ids:
 * [
 *   'uuid-1',
 *   'uuid-2'
 * ]
 *
 * produto_ids:
 * [
 *   'uuid-produto-1',
 *   'uuid-produto-2'
 * ]
 */

export interface FiltrosPropostas {
  /*
   * Busca global:
   *
   * - número da proposta
   * - nome do cliente
   * - CPF
   * - CNPJ
   */
  busca?: string;

  /*
   * Status selecionados.
   *
   * Quando vazio ou undefined,
   * considera todos.
   */
  status?:
    StatusProposta[];

  /*
   * Tipos de negócio selecionados.
   *
   * Quando vazio ou undefined,
   * considera todos.
   */
  tipo_negocio?:
    TipoNegocioProposta[];

  /*
   * Corretores selecionados.
   */
  corretor_ids?:
    string[];

  /*
   * Produtos selecionados.
   *
   * O relacionamento será realizado
   * através de crm_proposta_itens.
   */
  produto_ids?:
    string[];

  /*
   * Intervalo da data efetiva
   * da venda.
   *
   * Campo:
   * crm_propostas.data_venda
   */
  data_venda_inicio?:
    string;

  data_venda_fim?:
    string;

  /*
   * Intervalo de vigência.
   *
   * Esses dados pertencem a
   * crm_contratos.
   *
   * vigencia_inicio:
   * compara com inicio_vigencia
   *
   * vigencia_fim:
   * compara com fim_vigencia
   */
  vigencia_inicio?:
    string;

  vigencia_fim?:
    string;

  /*
   * Mantido para telas que abrem
   * propostas vinculadas diretamente
   * a determinado cliente.
   */
  cliente_id?:
    string;

  pagina?:
    number;

  por_pagina?:
    number;
}

export interface ResultadoListaPropostas {
  dados:
    PropostaListaItem[];

  total: number;

  pagina: number;

  por_pagina:
    number;

  total_paginas:
    number;
}


/*
 * ============================================================
 * CRIAÇÃO / EDIÇÃO DA PROPOSTA
 * ============================================================
 */

export interface CriarPropostaPayload {
  corretor_id: string;

  crm_pessoa_id?:
    | string
    | null;

  crm_empresa_id?:
    | string
    | null;

  tipo_negocio?:
    TipoNegocioProposta;

  data_emissao?:
    string;

  data_validade?:
    | string
    | null;

  observacoes?:
    | string
    | null;

  contrato_origem_renovacao_id?:
    | string
    | null;
}

export interface AtualizarPropostaPayload {
  corretor_id?:
    string;

  data_validade?:
    | string
    | null;

  observacoes?:
    | string
    | null;
}


/*
 * ============================================================
 * ITENS
 * ============================================================
 */

export interface CriarPropostaItemPayload {
  proposta_id: string;

  produto_id: string;
  seguradora_id: string;

  valor_premio:
    number;

  valor_liquido?:
    | number
    | null;

  numero_cotacao?:
    | string
    | null;

  parcelamento_cotado?:
    | string
    | null;

  meio_pagamento_cotado?:
    | string
    | null;

  coberturas_franquias?:
    unknown[];

  ordem?:
    number;
}

export interface AtualizarPropostaItemPayload {
  produto_id?:
    string;

  seguradora_id?:
    string;

  valor_premio?:
    number;

  valor_liquido?:
    | number
    | null;

  numero_cotacao?:
    | string
    | null;

  parcelamento_cotado?:
    | string
    | null;

  meio_pagamento_cotado?:
    | string
    | null;

  coberturas_franquias?:
    unknown[];

  ordem?:
    number;
}


/*
 * ============================================================
 * FECHAMENTO
 * ============================================================
 */

export interface ItemFechamentoProposta {
  item_id: string;
  valor_aceito: number;
}

export interface FecharPropostaPayload {
  proposta_id: string;

  itens_contratados:
    ItemFechamentoProposta[];

  data_venda?:
    string;
}

export interface ContratoGeradoFechamento {
  id: string;

  status:
    StatusContrato;

  data_venda:
    string;

  produto_id:
    string;

  seguradora_id:
    string;

  proposta_item_id:
    string;

  valor_aceito:
    number;

  valor_atual:
    number;
}

export interface ResultadoFechamentoProposta {
  sucesso: boolean;

  proposta_id:
    string;

  numero_proposta:
    string;

  status:
    'VENDIDA';

  data_venda:
    string;

  valor_total_ofertado:
    number;

  valor_total_vendido:
    number;

  quantidade_itens_contratados:
    number;

  quantidade_contratos_criados:
    number;

  contratos:
    ContratoGeradoFechamento[];
}


/*
 * ============================================================
 * RENOVAÇÃO
 * ============================================================
 */

export interface IniciarRenovacaoContratoPayload {
  contrato_id: string;
  corretor_id: string;
}

export interface ResultadoInicioRenovacao {
  proposta:
    PropostaDetalhada;

  renovacao_existente:
    boolean;
}

export interface ProdutoRenovacaoOrigem {
  contrato_id: string;

  produto_id: string;

  produto_nome: string;

  produto_categoria:
    | string
    | null;
}


/*
 * ============================================================
 * AÇÕES DA PROPOSTA
 * ============================================================
 */

export type AcaoExecutavelProposta =
  | 'EXCLUIR'
  | 'MARCAR_PERDIDA'
  | 'REABRIR'
  | 'REVERTER_VENDA';

export interface ExecutarAcaoPropostaPayload {
  proposta_id:
    string;

  acao:
    AcaoExecutavelProposta;

  motivo_perda?:
    | string
    | null;
}

export interface ResultadoAcaoProposta {
  sucesso:
    boolean;

  acao:
    AcaoExecutavelProposta;

  proposta_id:
    string;

  status:
    | StatusProposta
    | null;
}