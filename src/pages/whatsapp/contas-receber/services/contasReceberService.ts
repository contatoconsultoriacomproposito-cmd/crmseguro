import { supabase } from '../../../../lib/supabaseClient';

export type SituacaoContaReceber =
  | 'PENDENTE'
  | 'VENCIDA'
  | 'RECEBIDA'
  | 'CANCELADA';

export type TipoReceitaContaReceber =
  | 'FIXA'
  | 'VARIAVEL';

export type OrigemContaReceber =
  | 'MANUAL'
  | 'PROVISIONAMENTO'
  | 'COMISSAO';

export interface ContaReceberResumo {
  id: string;
  corretora_id: string;

  plano_conta_id: string | null;
  plano_conta_codigo: string | null;
  plano_conta_nome: string | null;
  plano_conta_caminho: string | null;

  descricao: string;
  pagador: string | null;
  numero_documento: string | null;

  tipo_receita: TipoReceitaContaReceber;

  data_competencia: string | null;
  data_emissao: string | null;
  data_vencimento: string;

  valor_previsto: number;
  total_baixado: number;
  saldo: number;

  status: string;
  situacao: SituacaoContaReceber;
  parcialmente_recebida: boolean;

  origem: OrigemContaReceber;
  origem_id: string | null;

  cliente_id: string | null;
  cliente_tipo: 'PF' | 'PJ' | null;
  cliente_nome: string | null;

  proposta_id: string | null;
  proposta_numero: string | null;

  proposta_item_id: string | null;
  numero_cotacao: string | null;

  contrato_id: string | null;
  contrato_numero: string | null;

  observacoes: string | null;

  criado_por_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface CriarContaReceberPayload {
  plano_conta_id: string;
  descricao: string;
  pagador?: string | null;
  numero_documento?: string | null;

  data_competencia?: string | null;
  data_emissao?: string | null;
  data_vencimento: string;

  valor_previsto: number;

  observacoes?: string | null;
}

export interface PlanoContaItem {
  id: string;
  corretora_id: string;
  parent_id: string | null;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  tipo_receita: TipoReceitaContaReceber;
  ativo: boolean;
}

export interface FiltrosContasReceber {
  busca?: string;

  situacao?: SituacaoContaReceber | 'TODAS';

  tipoReceita?: TipoReceitaContaReceber | '';

  origem?: OrigemContaReceber | '';

  planoContaId?: string;

  vencimentoInicial?: string;

  vencimentoFinal?: string;

  valorMinimo?: number | null;

  valorMaximo?: number | null;
}

export interface ResumoFinanceiroContasReceber {
  totalPendente: number;
  totalVencido: number;
  venceEsteMes: number;
  recebidoEsteMes: number;

  quantidadePendente: number;
  quantidadeVencida: number;
  quantidadeVenceEsteMes: number;
  quantidadeRecebidoEsteMes: number;
}

function normalizarNumero(valor: unknown): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 0;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function mapearContaReceber(
  row: any
): ContaReceberResumo {
  return {
    id: row.lancamento_id,
    corretora_id: row.corretora_id,

    plano_conta_id:
      row.plano_conta_id ?? null,

    plano_conta_codigo:
      row.plano_codigo ?? null,

    plano_conta_nome:
      row.plano_nome ?? null,

    plano_conta_caminho:
      row.plano_caminho ?? null,

    descricao:
      row.descricao ?? '',

    pagador:
      row.pagador ?? null,

    numero_documento:
      row.numero_documento ?? null,

    tipo_receita:
      row.tipo_receita,

    data_competencia:
      row.data_competencia ?? null,

    data_emissao:
      row.data_emissao ?? null,

    data_vencimento:
      row.data_vencimento,

    valor_previsto:
      normalizarNumero(
        row.valor_previsto
      ),

    total_baixado:
      normalizarNumero(
        row.total_baixado
      ),

    saldo:
      normalizarNumero(
        row.saldo_pendente
      ),

    status:
      row.status,

    situacao:
      row.situacao,

    parcialmente_recebida:
      Boolean(
        row.parcialmente_recebida
      ),

    origem:
      row.origem,

    origem_id:
      row.origem_id ?? null,

    cliente_id:
      row.cliente_id ?? null,

    cliente_tipo:
      row.cliente_tipo ?? null,

    cliente_nome:
      row.cliente_nome ?? null,

    proposta_id:
      row.proposta_id ?? null,

    proposta_numero:
      row.proposta_numero ?? null,

    proposta_item_id:
      row.proposta_item_id ?? null,

    numero_cotacao:
      typeof row.numero_cotacao === 'string'
        ? row.numero_cotacao.trim() || null
        : null,

    contrato_id:
      row.contrato_id ?? null,

    contrato_numero:
      typeof row.contrato_numero === 'string'
        ? row.contrato_numero.trim() || null
        : null,

    observacoes:
      row.observacoes ?? null,

    criado_por_id:
      row.criado_por_id ?? null,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}

export async function buscarContasReceber(
  filtros: FiltrosContasReceber = {}
): Promise<ContaReceberResumo[]> {
  let query = supabase
    .from('crm_contas_receber_resumo')
    .select('*')
    .order(
      'data_vencimento',
      {
        ascending: true,
      }
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (
    filtros.situacao &&
    filtros.situacao !== 'TODAS'
  ) {
    query = query.eq(
      'situacao',
      filtros.situacao
    );
  }

  if (
    filtros.tipoReceita
  ) {
    query = query.eq(
      'tipo_receita',
      filtros.tipoReceita
    );
  }

  if (
    filtros.origem
  ) {
    query = query.eq(
      'origem',
      filtros.origem
    );
  }

  if (
    filtros.planoContaId
  ) {
    query = query.eq(
      'plano_conta_id',
      filtros.planoContaId
    );
  }

  if (
    filtros.vencimentoInicial
  ) {
    query = query.gte(
      'data_vencimento',
      filtros.vencimentoInicial
    );
  }

  if (
    filtros.vencimentoFinal
  ) {
    query = query.lte(
      'data_vencimento',
      filtros.vencimentoFinal
    );
  }

  if (
    filtros.valorMinimo !== null &&
    filtros.valorMinimo !== undefined
  ) {
    query = query.gte(
      'valor_previsto',
      filtros.valorMinimo
    );
  }

  if (
    filtros.valorMaximo !== null &&
    filtros.valorMaximo !== undefined
  ) {
    query = query.lte(
      'valor_previsto',
      filtros.valorMaximo
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      '[ContasReceber] Erro ao buscar lançamentos:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível carregar as contas a receber.'
    );
  }

  let resultado = (
    data ?? []
  ).map(
    mapearContaReceber
  );

  /*
   * A busca textual fica inicialmente no front/service.
   *
   * Motivo:
   * a view possui vários campos úteis e não precisamos
   * criar RPC ou função adicional antes de validar a tela.
   *
   * Depois, se o volume crescer, podemos mover essa busca
   * para SQL sem alterar a interface do service.
   */
  const busca =
    filtros.busca
      ?.trim()
      .toLocaleLowerCase(
        'pt-BR'
      );

  if (busca) {
    resultado =
      resultado.filter(
        (item) => {
          const texto = [
            item.descricao,
            item.pagador,
            item.numero_documento,
            item.plano_conta_codigo,
            item.plano_conta_nome,
            item.plano_conta_caminho,
            item.cliente_nome,
            item.proposta_numero,
            item.numero_cotacao,
            item.contrato_numero,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase(
              'pt-BR'
            );

          return texto.includes(
            busca
          );
        }
      );
  }

  return resultado;
}

export async function buscarPlanoContasAtivo(): Promise<
  PlanoContaItem[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_plano_contas'
    )
    .select(`
    id,
    corretora_id,
    parent_id,
    codigo,
    nome,
    descricao,
    tipo_receita,
    ativo
    `)
    .eq(
    'ativo',
    true
    )
    .order(
    'codigo',
    {
        ascending: true,
    }
    )
    .order(
    'nome',
    {
        ascending: true,
    }
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao buscar plano de contas:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível carregar o plano de contas.'
    );
  }

  return (
    data ?? []
  ) as PlanoContaItem[];
}

export async function buscarResumoContasReceber(): Promise<ResumoFinanceiroContasReceber> {
  const hoje = new Date();

  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const primeiroDiaMes = `${anoAtual}-${String(
    mesAtual + 1
  ).padStart(2, '0')}-01`;

  const ultimoDiaMesDate = new Date(
    anoAtual,
    mesAtual + 1,
    0
  );

  const ultimoDiaMes = `${anoAtual}-${String(
    mesAtual + 1
  ).padStart(2, '0')}-${String(
    ultimoDiaMesDate.getDate()
  ).padStart(2, '0')}`;

  const [
    resultadoLancamentos,
    resultadoBaixas,
  ] = await Promise.all([
    supabase
      .from('crm_contas_receber_resumo')
      .select(`
        situacao,
        data_vencimento,
        valor_previsto,
        total_baixado,
        saldo_pendente
      `),

    supabase
      .from('crm_contas_receber_baixas')
      .select(`
        id,
        valor_baixado,
        valor_recebido,
        data_recebimento
      `)
      .eq('status', 'ATIVA')
      .gte(
        'data_recebimento',
        primeiroDiaMes
      )
      .lte(
        'data_recebimento',
        ultimoDiaMes
      ),
  ]);

  if (resultadoLancamentos.error) {
    console.error(
      '[ContasReceber] Erro ao buscar resumo financeiro:',
      resultadoLancamentos.error
    );

    throw new Error(
      resultadoLancamentos.error.message ||
        'Não foi possível carregar o resumo do Contas a Receber.'
    );
  }

  if (resultadoBaixas.error) {
    console.error(
      '[ContasReceber] Erro ao buscar recebimentos do mês:',
      resultadoBaixas.error
    );

    throw new Error(
      resultadoBaixas.error.message ||
        'Não foi possível carregar os recebimentos do mês.'
    );
  }

  let totalPendente = 0;
  let totalVencido = 0;
  let venceEsteMes = 0;

  let quantidadePendente = 0;
  let quantidadeVencida = 0;
  let quantidadeVenceEsteMes = 0;

  for (
    const row of resultadoLancamentos.data ?? []
  ) {
    const situacao =
      row.situacao as SituacaoContaReceber;

    const saldo =
      normalizarNumero(
        row.saldo_pendente
      );

    const vencimento =
      row.data_vencimento
        ? new Date(
            `${row.data_vencimento}T12:00:00`
          )
        : null;

    if (
      situacao === 'PENDENTE'
    ) {
      totalPendente += saldo;
      quantidadePendente += 1;
    }

    if (
      situacao === 'VENCIDA'
    ) {
      totalVencido += saldo;
      quantidadeVencida += 1;
    }

    if (
      vencimento &&
      vencimento.getFullYear() ===
        anoAtual &&
      vencimento.getMonth() ===
        mesAtual &&
      (
        situacao ===
          'PENDENTE' ||
        situacao ===
          'VENCIDA'
      )
    ) {
      venceEsteMes += saldo;
      quantidadeVenceEsteMes += 1;
    }
  }

  const recebidoEsteMes =
    (
      resultadoBaixas.data ??
      []
    ).reduce(
      (
        total,
        baixa
      ) =>
        total +
        normalizarNumero(
          baixa.valor_recebido
        ),
      0
    );

  const quantidadeRecebidoEsteMes =
    (
      resultadoBaixas.data ??
      []
    ).length;

  return {
    totalPendente,
    totalVencido,
    venceEsteMes,
    recebidoEsteMes,

    quantidadePendente,
    quantidadeVencida,
    quantidadeVenceEsteMes,
    quantidadeRecebidoEsteMes,
  };
}

export async function criarContaReceber(
  payload: CriarContaReceberPayload
): Promise<string> {
  const contexto =
    await buscarContextoUsuarioFinanceiro();

  const descricao =
    payload.descricao.trim();

  if (!descricao) {
    throw new Error(
      'Informe a descrição.'
    );
  }

  if (!payload.plano_conta_id) {
    throw new Error(
      'Selecione o plano de contas.'
    );
  }

  if (!payload.data_vencimento) {
    throw new Error(
      'Informe a data de vencimento.'
    );
  }

  if (
    !Number.isFinite(
      payload.valor_previsto
    ) ||
    payload.valor_previsto <= 0
  ) {
    throw new Error(
      'Informe um valor válido.'
    );
  }

  const planoConta =
    await buscarPlanoContaPorId(
      payload.plano_conta_id,
      contexto.corretoraId
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_lancamentos'
    )
    .insert({
      corretora_id:
        contexto.corretoraId,

      plano_conta_id:
        planoConta.id,

      descricao,

      pagador:
        payload.pagador?.trim() ||
        null,

      numero_documento:
        payload.numero_documento?.trim() ||
        null,

      /*
       * Regra central:
       * o tipo da receita vem sempre do Plano de Contas.
       *
       * Mantemos o valor também no lançamento como snapshot histórico.
       */
      tipo_receita:
        planoConta.tipo_receita,

      data_competencia:
        payload.data_competencia ||
        null,

      data_emissao:
        payload.data_emissao ||
        null,

      data_vencimento:
        payload.data_vencimento,

      valor_previsto:
        payload.valor_previsto,

      status:
        'PENDENTE',

      origem:
        'MANUAL',

      origem_id:
        null,

      observacoes:
        payload.observacoes?.trim() ||
        null,

      criado_por_id:
        contexto.userId,
    })
    .select('id')
    .single();

  if (error) {
    console.error(
      '[ContasReceber] Erro ao criar lançamento:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível criar o lançamento.'
    );
  }

  return data.id;
}

export interface CriarPlanoContaPayload {
  parent_id?: string | null;
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  tipo_receita: TipoReceitaContaReceber;
}

export interface AtualizarPlanoContaPayload {
  codigo?: string | null;
  nome?: string;
  descricao?: string | null;
  parent_id?: string | null;
  tipo_receita?: TipoReceitaContaReceber;
}

async function buscarContextoUsuarioFinanceiro() {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(
      authError.message ||
        'Não foi possível identificar o usuário autenticado.'
    );
  }

  const userId =
    authData.user?.id;

  if (!userId) {
    throw new Error(
      'Usuário autenticado não encontrado.'
    );
  }

  const {
    data: perfil,
    error: perfilError,
  } = await supabase
    .from('usuarios_perfis')
    .select(`
      id,
      tipo_usuario,
      corretora_id,
      ativo
    `)
    .eq('id', userId)
    .maybeSingle();

  if (perfilError) {
    throw new Error(
      perfilError.message ||
        'Não foi possível carregar o perfil do usuário.'
    );
  }

  if (!perfil) {
    throw new Error(
      'Perfil do usuário não encontrado.'
    );
  }

  if (perfil.ativo === false) {
    throw new Error(
      'Usuário inativo.'
    );
  }

  const corretoraId =
    perfil.tipo_usuario === 'CORRETORA'
      ? perfil.id
      : perfil.corretora_id;

  if (!corretoraId) {
    throw new Error(
      'Corretora do usuário não identificada.'
    );
  }

  return {
    userId,
    corretoraId,
  };
}

async function buscarPlanoContaPorId(
  planoContaId: string,
  corretoraId: string
): Promise<PlanoContaItem> {
  if (!planoContaId) {
    throw new Error(
      'Plano de contas não informado.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_plano_contas'
    )
    .select(`
      id,
      corretora_id,
      parent_id,
      codigo,
      nome,
      descricao,
      tipo_receita,
      ativo
    `)
    .eq(
      'id',
      planoContaId
    )
    .eq(
      'corretora_id',
      corretoraId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
        'Não foi possível carregar o plano de contas.'
    );
  }

  if (!data) {
    throw new Error(
      'Plano de contas não encontrado.'
    );
  }

  if (
    data.tipo_receita !==
      'FIXA' &&
    data.tipo_receita !==
      'VARIAVEL'
  ) {
    throw new Error(
      'O plano de contas não possui uma classificação de receita válida.'
    );
  }

  return data as PlanoContaItem;
}

export async function criarPlanoConta(
  payload: CriarPlanoContaPayload
): Promise<string> {
  const {
    userId,
    corretoraId,
  } =
    await buscarContextoUsuarioFinanceiro();

  const nome =
    payload.nome.trim();

  if (!nome) {
    throw new Error(
      'Informe o nome da conta.'
    );
  }

  if (
    payload.tipo_receita !==
      'FIXA' &&
    payload.tipo_receita !==
      'VARIAVEL'
  ) {
    throw new Error(
      'Informe se a receita é fixa ou variável.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_plano_contas'
    )
    .insert({
      corretora_id:
        corretoraId,

      parent_id:
        payload.parent_id ||
        null,

      codigo:
        payload.codigo?.trim() ||
        null,

      nome,

      descricao:
        payload.descricao?.trim() ||
        null,

      tipo_receita:
        payload.tipo_receita,

      ativo: true,

      ordem: 0,

      criado_por_id:
        userId,
    })
    .select('id')
    .single();

  if (error) {
    console.error(
      '[ContasReceber] Erro ao criar plano de contas:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível criar a conta.'
    );
  }

  return data.id;
}

export async function atualizarPlanoConta(
  id: string,
  payload: AtualizarPlanoContaPayload
): Promise<void> {
  if (!id) {
    throw new Error(
      'Conta do plano de contas não informada.'
    );
  }

  const dadosAtualizacao: Record<
    string,
    unknown
  > = {};

  if (
    payload.nome !== undefined
  ) {
    const nome =
      payload.nome.trim();

    if (!nome) {
      throw new Error(
        'Informe o nome da conta.'
      );
    }

    dadosAtualizacao.nome =
      nome;
  }

  if (
    payload.codigo !== undefined
  ) {
    dadosAtualizacao.codigo =
      payload.codigo?.trim() ||
      null;
  }

  if (
    payload.descricao !== undefined
  ) {
    dadosAtualizacao.descricao =
      payload.descricao?.trim() ||
      null;
  }


  if (
    payload.parent_id !== undefined
  ) {
    dadosAtualizacao.parent_id =
      payload.parent_id ||
      null;
  }

  if (
    payload.tipo_receita !== undefined
  ) {
    if (
      payload.tipo_receita !==
        'FIXA' &&
      payload.tipo_receita !==
        'VARIAVEL'
    ) {
      throw new Error(
        'Informe se a receita é fixa ou variável.'
      );
    }

    dadosAtualizacao.tipo_receita =
      payload.tipo_receita;
  }

  const {
    error,
  } = await supabase
    .from(
      'crm_contas_receber_plano_contas'
    )
    .update(
      dadosAtualizacao
    )
    .eq(
      'id',
      id
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao atualizar plano de contas:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível atualizar a conta.'
    );
  }
}

export async function alterarStatusPlanoConta(
  id: string,
  ativo: boolean
): Promise<void> {
  if (!id) {
    throw new Error(
      'Conta do plano de contas não informada.'
    );
  }

  const {
    error,
  } = await supabase
    .from(
      'crm_contas_receber_plano_contas'
    )
    .update({
      ativo,
    })
    .eq(
      'id',
      id
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao alterar status do plano de contas:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível alterar o status da conta.'
    );
  }
}

export async function buscarPlanoContasCompleto(): Promise<
  PlanoContaItem[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_plano_contas'
    )
    .select(`
        id,
        corretora_id,
        parent_id,
        codigo,
        nome,
        descricao,
        tipo_receita,
        ativo
        `)
        .order(
        'codigo',
        {
            ascending: true,
        }
        )
        .order(
        'nome',
        {
            ascending: true,
        }
        );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao buscar plano de contas completo:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível carregar o plano de contas.'
    );
  }

  return (
    data ?? []
  ) as PlanoContaItem[];
}

export type FormaRecebimentoContaReceber =
  | 'PIX'
  | 'BOLETO'
  | 'TRANSFERENCIA'
  | 'DEBITO_CONTA'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'DINHEIRO'
  | 'CHEQUE'
  | 'OUTROS';

export interface RecebimentoContaReceber {
  id: string;
  corretora_id: string;
  lancamento_id: string;

  data_recebimento: string;

  valor_baixado: number;
  juros: number;
  multa: number;
  desconto: number;
  valor_recebido: number;

  forma_recebimento: FormaRecebimentoContaReceber;

  numero_documento: string | null;
  observacoes: string | null;

  status: 'ATIVA' | 'ESTORNADA';

  recebido_por_id: string | null;

  estornado_por_id: string | null;
  estornado_em: string | null;
  motivo_estorno: string | null;

  created_at: string;
  updated_at: string;
}

export interface NovoRecebimentoContaReceberPayload {
  lancamento_id: string;

  data_recebimento: string;

  valor_baixado: number;

  juros?: number;
  multa?: number;
  desconto?: number;

  forma_recebimento: FormaRecebimentoContaReceber;

  numero_documento?: string | null;
  observacoes?: string | null;
}

export interface DetalheContaReceber
  extends ContaReceberResumo {
  cancelado_por_id?: string | null;
  cancelado_em?: string | null;
  motivo_cancelamento?: string | null;
}

function mapearRecebimentoContaReceber(
  row: any
): RecebimentoContaReceber {
  return {
    id: row.id,
    corretora_id: row.corretora_id,
    lancamento_id: row.lancamento_id,

    data_recebimento:
      row.data_recebimento,

    valor_baixado:
      normalizarNumero(
        row.valor_baixado
      ),

    juros:
      normalizarNumero(
        row.juros
      ),

    multa:
      normalizarNumero(
        row.multa
      ),

    desconto:
      normalizarNumero(
        row.desconto
      ),

    valor_recebido:
      normalizarNumero(
        row.valor_recebido
      ),

    forma_recebimento:
      row.forma_recebimento,

    numero_documento:
      row.numero_documento ?? null,

    observacoes:
      row.observacoes ?? null,

    status:
      row.status,

    recebido_por_id:
      row.recebido_por_id ?? null,

    estornado_por_id:
      row.estornado_por_id ?? null,

    estornado_em:
      row.estornado_em ?? null,

    motivo_estorno:
      row.motivo_estorno ?? null,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}

export async function buscarContaReceberPorId(
  id: string
): Promise<DetalheContaReceber> {
  if (!id) {
    throw new Error(
      'Lançamento não informado.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_resumo'
    )
    .select('*')
    .eq(
      'lancamento_id',
      id
    )
    .maybeSingle();

  if (error) {
    console.error(
      '[ContasReceber] Erro ao buscar lançamento:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível carregar o lançamento.'
    );
  }

  if (!data) {
    throw new Error(
      'Lançamento não encontrado.'
    );
  }

  const resumo =
    mapearContaReceber(data);

  return {
    ...resumo,

    cancelado_por_id:
      data.cancelado_por_id ??
      null,

    cancelado_em:
      data.cancelado_em ??
      null,

    motivo_cancelamento:
      data.motivo_cancelamento ??
      null,
  };
}

export async function buscarRecebimentosContaReceber(
  lancamentoId: string
): Promise<RecebimentoContaReceber[]> {
  if (!lancamentoId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_baixas'
    )
    .select('*')
    .eq(
      'lancamento_id',
      lancamentoId
    )
    .order(
      'data_recebimento',
      {
        ascending: false,
      }
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao buscar recebimentos:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível carregar os recebimentos do lançamento.'
    );
  }

  return (
    data ?? []
  ).map(
    mapearRecebimentoContaReceber
  );
}

export async function registrarRecebimentoContaReceber(
  payload: NovoRecebimentoContaReceberPayload
): Promise<string> {
  if (!payload.lancamento_id) {
    throw new Error(
      'Lançamento não informado.'
    );
  }

  if (!payload.data_recebimento) {
    throw new Error(
      'Informe a data do recebimento.'
    );
  }

  if (
    !Number.isFinite(
      payload.valor_baixado
    ) ||
    payload.valor_baixado <= 0
  ) {
    throw new Error(
      'Informe um valor de recebimento válido.'
    );
  }

  const juros =
    normalizarNumero(
      payload.juros
    );

  const multa =
    normalizarNumero(
      payload.multa
    );

  const desconto =
    normalizarNumero(
      payload.desconto
    );

  if (
    juros < 0 ||
    multa < 0 ||
    desconto < 0
  ) {
    throw new Error(
      'Juros, multa e desconto não podem ser negativos.'
    );
  }

  const contexto =
    await buscarContextoUsuarioFinanceiro();

  const lancamento =
    await buscarContaReceberPorId(
      payload.lancamento_id
    );

  if (
    lancamento.situacao ===
    'CANCELADA'
  ) {
    throw new Error(
      'Não é possível registrar recebimento em lançamento cancelado.'
    );
  }

  if (
    lancamento.situacao ===
    'RECEBIDA'
  ) {
    throw new Error(
      'Este lançamento já está totalmente recebido.'
    );
  }

  if (
    payload.valor_baixado >
    lancamento.saldo
  ) {
    throw new Error(
      `O valor do recebimento não pode ser superior ao saldo pendente de ${formatarValorErro(
        lancamento.saldo
      )}.`
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'crm_contas_receber_baixas'
    )
    .insert({
      corretora_id:
        contexto.corretoraId,

      lancamento_id:
        payload.lancamento_id,

      data_recebimento:
        payload.data_recebimento,

      valor_baixado:
        payload.valor_baixado,

      juros,

      multa,

      desconto,

      forma_recebimento:
        payload.forma_recebimento,

      numero_documento:
        payload.numero_documento?.trim() ||
        null,

      observacoes:
        payload.observacoes?.trim() ||
        null,

      status:
        'ATIVA',

      recebido_por_id:
        contexto.userId,
    })
    .select('id')
    .single();

  if (error) {
    console.error(
      '[ContasReceber] Erro ao registrar recebimento:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível registrar o recebimento.'
    );
  }

  return data.id;
}

function formatarValorErro(
  valor: number
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(valor);
}

export interface EstornarRecebimentoContaReceberPayload {
  baixa_id: string;
  motivo: string;
}

export async function estornarRecebimentoContaReceber(
  payload: EstornarRecebimentoContaReceberPayload
): Promise<void> {
  if (!payload.baixa_id) {
    throw new Error(
      'Recebimento não informado.'
    );
  }

  const motivo =
    payload.motivo.trim();

  if (!motivo) {
    throw new Error(
      'Informe o motivo do estorno.'
    );
  }

  const contexto =
    await buscarContextoUsuarioFinanceiro();

  const {
    data: baixa,
    error: baixaError,
  } = await supabase
    .from(
      'crm_contas_receber_baixas'
    )
    .select(`
      id,
      status
    `)
    .eq(
      'id',
      payload.baixa_id
    )
    .maybeSingle();

  if (baixaError) {
    throw new Error(
      baixaError.message ||
        'Não foi possível consultar o recebimento.'
    );
  }

  if (!baixa) {
    throw new Error(
      'Recebimento não encontrado.'
    );
  }

  if (
    baixa.status ===
    'ESTORNADA'
  ) {
    throw new Error(
      'Este recebimento já está estornado.'
    );
  }

  const {
    error,
  } = await supabase
    .from(
      'crm_contas_receber_baixas'
    )
    .update({
      status:
        'ESTORNADA',

      estornado_por_id:
        contexto.userId,

      estornado_em:
        new Date().toISOString(),

      motivo_estorno:
        motivo,
    })
    .eq(
      'id',
      payload.baixa_id
    )
    .eq(
      'status',
      'ATIVA'
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao estornar recebimento:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível estornar o recebimento.'
    );
  }
}

export interface AtualizarContaReceberPayload {
  plano_conta_id: string;

  descricao: string;

  pagador?: string | null;
  numero_documento?: string | null;

  data_competencia?: string | null;
  data_emissao?: string | null;
  data_vencimento: string;

  valor_previsto: number;

  observacoes?: string | null;
}

export async function atualizarContaReceber(
  id: string,
  payload: AtualizarContaReceberPayload
): Promise<void> {
  if (!id) {
    throw new Error(
      'Lançamento não informado.'
    );
  }

  const lancamento =
    await buscarContaReceberPorId(
      id
    );

  if (
    lancamento.origem ===
    'COMISSAO'
  ) {
    throw new Error(
      'Lançamentos originados de comissão não podem ser editados manualmente.'
    );
  }

  const descricao =
    payload.descricao.trim();

  if (!descricao) {
    throw new Error(
      'Informe a descrição.'
    );
  }

  if (
    !payload.plano_conta_id
  ) {
    throw new Error(
      'Selecione o plano de contas.'
    );
  }

  if (
    !payload.data_vencimento
  ) {
    throw new Error(
      'Informe a data de vencimento.'
    );
  }

  if (
    !Number.isFinite(
      payload.valor_previsto
    ) ||
    payload.valor_previsto <= 0
  ) {
    throw new Error(
      'Informe um valor válido.'
    );
  }

  const contexto =
    await buscarContextoUsuarioFinanceiro();

  const planoConta =
    await buscarPlanoContaPorId(
      payload.plano_conta_id,
      contexto.corretoraId
    );

  const {
    error,
  } = await supabase
    .from(
      'crm_contas_receber_lancamentos'
    )
    .update({
      plano_conta_id:
        payload.plano_conta_id,

      descricao,

      pagador:
        payload.pagador?.trim() ||
        null,

      numero_documento:
        payload.numero_documento?.trim() ||
        null,

      tipo_receita:
        planoConta.tipo_receita,

      data_competencia:
        payload.data_competencia ||
        null,

      data_emissao:
        payload.data_emissao ||
        null,

      data_vencimento:
        payload.data_vencimento,

      valor_previsto:
        payload.valor_previsto,

      observacoes:
        payload.observacoes?.trim() ||
        null,
    })
    .eq(
      'id',
      id
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao atualizar lançamento:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível atualizar o lançamento.'
    );
  }
}

export interface CancelarContaReceberPayload {
  lancamento_id: string;
  motivo: string;
}

export async function cancelarContaReceber(
  payload: CancelarContaReceberPayload
): Promise<void> {
  if (!payload.lancamento_id) {
    throw new Error(
      'Lançamento não informado.'
    );
  }

  const motivo =
    payload.motivo.trim();

  if (!motivo) {
    throw new Error(
      'Informe o motivo do cancelamento.'
    );
  }

  const contexto =
    await buscarContextoUsuarioFinanceiro();

  const lancamento =
    await buscarContaReceberPorId(
      payload.lancamento_id
    );

  if (
    lancamento.situacao ===
    'CANCELADA'
  ) {
    throw new Error(
      'Este lançamento já está cancelado.'
    );
  }

  if (
    lancamento.origem ===
    'COMISSAO'
  ) {
    throw new Error(
      'Lançamentos originados de comissão não podem ser cancelados manualmente.'
    );
  }

  const {
    data: baixasAtivas,
    error: baixasError,
  } = await supabase
    .from(
      'crm_contas_receber_baixas'
    )
    .select('id')
    .eq(
      'lancamento_id',
      payload.lancamento_id
    )
    .eq(
      'status',
      'ATIVA'
    )
    .limit(1);

  if (baixasError) {
    throw new Error(
      baixasError.message ||
        'Não foi possível verificar os recebimentos do lançamento.'
    );
  }

  if (
    baixasAtivas &&
    baixasAtivas.length > 0
  ) {
    throw new Error(
      'Este lançamento possui recebimento ativo. Estorne os recebimentos antes de cancelar.'
    );
  }

  const {
    error,
  } = await supabase
    .from(
      'crm_contas_receber_lancamentos'
    )
    .update({
      status:
        'CANCELADA',

      cancelado_por_id:
        contexto.userId,

      cancelado_em:
        new Date().toISOString(),

      motivo_cancelamento:
        motivo,
    })
    .eq(
      'id',
      payload.lancamento_id
    );

  if (error) {
    console.error(
      '[ContasReceber] Erro ao cancelar lançamento:',
      error
    );

    throw new Error(
      error.message ||
        'Não foi possível cancelar o lançamento.'
    );
  }
}

export type PeriodicidadeProvisionamento =
  | 'DIARIA'
  | 'SEMANAL'
  | 'MENSAL'
  | 'ANUAL';

export interface CriarProvisionamentoPayload {
  plano_conta_id: string;

  descricao: string;
  pagador?: string | null;

  valor_base: number;

  data_inicio: string;
  data_fim: string;

  periodicidade: PeriodicidadeProvisionamento;

  intervalo?: number;

  dia_vencimento?: number | null;

  observacoes?: string | null;
}

function formatarDataISO(
  data: Date
): string {
  const ano =
    data.getFullYear();

  const mes =
    String(
      data.getMonth() + 1
    ).padStart(2, '0');

  const dia =
    String(
      data.getDate()
    ).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function criarDataLocal(
  valor: string
): Date {
  const [
    ano,
    mes,
    dia,
  ] = valor
    .split('-')
    .map(Number);

  return new Date(
    ano,
    mes - 1,
    dia,
    12,
    0,
    0
  );
}

function ultimoDiaMes(
  ano: number,
  mes: number
): number {
  return new Date(
    ano,
    mes + 1,
    0
  ).getDate();
}

function ajustarDiaVencimento(
  dataBase: Date,
  diaVencimento: number
): Date {
  const ano =
    dataBase.getFullYear();

  const mes =
    dataBase.getMonth();

  const ultimoDia =
    ultimoDiaMes(
      ano,
      mes
    );

  return new Date(
    ano,
    mes,
    Math.min(
      diaVencimento,
      ultimoDia
    ),
    12,
    0,
    0
  );
}

function avancarDataProvisionamento(
  dataAtual: Date,
  periodicidade: PeriodicidadeProvisionamento,
  intervalo: number
): Date {
  const proxima =
    new Date(
      dataAtual.getTime()
    );

  switch (
    periodicidade
  ) {
    case 'DIARIA':
      proxima.setDate(
        proxima.getDate() +
          intervalo
      );
      break;

    case 'SEMANAL':
      proxima.setDate(
        proxima.getDate() +
          7 * intervalo
      );
      break;

    case 'MENSAL':
      proxima.setMonth(
        proxima.getMonth() +
          intervalo
      );
      break;

    case 'ANUAL':
      proxima.setFullYear(
        proxima.getFullYear() +
          intervalo
      );
      break;
  }

  return proxima;
}

interface ItemProvisionamentoGerado {
  numero_item: number;
  descricao: string;
  data_competencia: string;
  data_vencimento: string;
  valor_previsto: number;
  observacoes: string | null;
}

function gerarItensProvisionamento(
  payload: CriarProvisionamentoPayload
): ItemProvisionamentoGerado[] {
  const inicio =
    criarDataLocal(
      payload.data_inicio
    );

  const fim =
    criarDataLocal(
      payload.data_fim
    );

  const intervalo =
    payload.intervalo ?? 1;

  const itens: ItemProvisionamentoGerado[] =
    [];

  let atual =
    new Date(
      inicio.getTime()
    );

  let numeroItem = 1;

  while (
    atual.getTime() <=
    fim.getTime()
  ) {
    const competencia =
      new Date(
        atual.getTime()
      );

    let vencimento =
      new Date(
        atual.getTime()
      );

    /*
     * Para recorrências mensais e anuais,
     * podemos usar um dia fixo de vencimento.
     *
     * Para diária/semanal, o próprio dia
     * da competência é o vencimento.
     */
    if (
      payload.dia_vencimento &&
      (
        payload.periodicidade ===
          'MENSAL' ||
        payload.periodicidade ===
          'ANUAL'
      )
    ) {
      vencimento =
        ajustarDiaVencimento(
          competencia,
          payload.dia_vencimento
        );
    }

    itens.push({
      numero_item:
        numeroItem,

      descricao:
        payload.descricao.trim(),

      data_competencia:
        formatarDataISO(
          competencia
        ),

      data_vencimento:
        formatarDataISO(
          vencimento
        ),

      valor_previsto:
        payload.valor_base,

      observacoes:
        payload.observacoes?.trim() ||
        null,
    });

    numeroItem += 1;

    atual =
      avancarDataProvisionamento(
        atual,
        payload.periodicidade,
        intervalo
      );
  }

  return itens;
}

async function rollbackCriacaoProvisionamento(
  provisionamentoId: string,
  itemIds: string[]
): Promise<void> {
  try {
    if (itemIds.length > 0) {
      /*
       * Primeiro removemos os itens, pois eles podem estar
       * vinculados aos lançamentos através de lancamento_id.
       */
      const {
        error: itensRollbackError,
      } = await supabase
        .from(
          'crm_contas_receber_provisionamento_itens'
        )
        .delete()
        .eq(
          'provisionamento_id',
          provisionamentoId
        );

      if (itensRollbackError) {
        console.error(
          '[ContasReceber] Falha no rollback dos itens do provisionamento:',
          itensRollbackError
        );
      }

      const {
        error: lancamentosRollbackError,
      } = await supabase
        .from(
          'crm_contas_receber_lancamentos'
        )
        .delete()
        .eq(
          'origem',
          'PROVISIONAMENTO'
        )
        .in(
          'origem_id',
          itemIds
        );

      if (lancamentosRollbackError) {
        console.error(
          '[ContasReceber] Falha no rollback dos lançamentos do provisionamento:',
          lancamentosRollbackError
        );
      }
    }

    const {
      error: provisionamentoRollbackError,
    } = await supabase
      .from(
        'crm_contas_receber_provisionamentos'
      )
      .delete()
      .eq(
        'id',
        provisionamentoId
      );

    if (provisionamentoRollbackError) {
      console.error(
        '[ContasReceber] Falha no rollback do cabeçalho do provisionamento:',
        provisionamentoRollbackError
      );
    }
  } catch (rollbackError) {
    console.error(
      '[ContasReceber] Erro inesperado durante rollback do provisionamento:',
      rollbackError
    );
  }
}

export async function criarProvisionamento(
  payload: CriarProvisionamentoPayload
): Promise<string> {
  const contexto =
    await buscarContextoUsuarioFinanceiro();

  const descricao =
    payload.descricao.trim();

  if (!descricao) {
    throw new Error(
      'Informe a descrição do provisionamento.'
    );
  }

  if (
    !payload.plano_conta_id
  ) {
    throw new Error(
      'Selecione o plano de contas.'
    );
  }

  const planoConta =
    await buscarPlanoContaPorId(
      payload.plano_conta_id,
      contexto.corretoraId
    );

  if (
    !Number.isFinite(
      payload.valor_base
    ) ||
    payload.valor_base <= 0
  ) {
    throw new Error(
      'Informe um valor válido.'
    );
  }

  if (
    !payload.data_inicio ||
    !payload.data_fim
  ) {
    throw new Error(
      'Informe o período do provisionamento.'
    );
  }

  if (
    payload.data_fim <
    payload.data_inicio
  ) {
    throw new Error(
      'A data final não pode ser anterior à data inicial.'
    );
  }

  /*
   * O front não expõe mais intervalo.
   * Mantemos a coluna no banco por compatibilidade,
   * mas a regra operacional atual é sempre intervalo = 1.
   */
  const intervalo = 1;

  if (
    payload.dia_vencimento !==
      null &&
    payload.dia_vencimento !==
      undefined &&
    (
      payload.dia_vencimento < 1 ||
      payload.dia_vencimento > 31
    )
  ) {
    throw new Error(
      'O dia de vencimento deve estar entre 1 e 31.'
    );
  }

  const itens =
    gerarItensProvisionamento({
      ...payload,
      intervalo,
    });

  if (
    itens.length === 0
  ) {
    throw new Error(
      'Nenhum lançamento foi gerado para o período informado.'
    );
  }

  /*
   * Proteção simples para evitar uma criação acidental
   * de milhares de lançamentos em uma única operação.
   */
  if (
    itens.length > 10000
  ) {
    throw new Error(
      'O período informado gera lançamentos demais. Reduza o período.'
    );
  }

  /* ============================================================
   * 1. CRIAR CABEÇALHO DO PROVISIONAMENTO
   * ============================================================
   */

  const {
    data: provisionamento,
    error: provisionamentoError,
  } = await supabase
    .from(
      'crm_contas_receber_provisionamentos'
    )
    .insert({
      corretora_id:
        contexto.corretoraId,

      plano_conta_id:
        payload.plano_conta_id,

      descricao,

      pagador:
        payload.pagador?.trim() ||
        null,

      tipo_receita:
        planoConta.tipo_receita,

      valor_base:
        payload.valor_base,

      data_inicio:
        payload.data_inicio,

      data_fim:
        payload.data_fim,

      periodicidade:
        payload.periodicidade,

      intervalo,

      dia_vencimento:
        payload.dia_vencimento ??
        null,

      observacoes:
        payload.observacoes?.trim() ||
        null,

      /*
       * Nasce GERADO somente durante a operação.
       * Depois que todos os lançamentos forem criados,
       * o status será alterado para CONFIRMADO.
       */
      status:
        'GERADO',

      criado_por_id:
        contexto.userId,
    })
    .select('id')
    .single();

  if (
    provisionamentoError
  ) {
    console.error(
      '[ContasReceber] Erro ao criar provisionamento:',
      provisionamentoError
    );

    throw new Error(
      provisionamentoError.message ||
        'Não foi possível criar o provisionamento.'
    );
  }

  const provisionamentoId =
    provisionamento.id;

  let itemIds: string[] = [];

  try {
    /* ============================================================
     * 2. CRIAR ITENS TÉCNICOS DO PROVISIONAMENTO
     * ============================================================
     *
     * Eles são criados PENDENTES somente durante esta mesma
     * operação para obtermos os IDs que serão usados como
     * origem_id dos lançamentos reais.
     */

    const payloadItens =
      itens.map(
        (item) => ({
          corretora_id:
            contexto.corretoraId,

          provisionamento_id:
            provisionamentoId,

          numero_item:
            item.numero_item,

          descricao:
            item.descricao,

          data_competencia:
            item.data_competencia,

          data_vencimento:
            item.data_vencimento,

          valor_previsto:
            item.valor_previsto,

          observacoes:
            item.observacoes,

          status:
            'PENDENTE',

          lancamento_id:
            null,

          criado_por_id:
            contexto.userId,

          confirmado_por_id:
            null,

          confirmado_em:
            null,
        })
      );

    const {
      data: itensCriados,
      error: itensError,
    } = await supabase
      .from(
        'crm_contas_receber_provisionamento_itens'
      )
      .insert(
        payloadItens
      )
      .select(`
        id,
        numero_item,
        descricao,
        data_competencia,
        data_vencimento,
        valor_previsto,
        observacoes
      `);

    if (itensError) {
      throw itensError;
    }

    if (
      !itensCriados ||
      itensCriados.length !==
        itens.length
    ) {
      throw new Error(
        'Nem todos os itens do provisionamento foram criados.'
      );
    }

    itemIds =
      itensCriados.map(
        (item) => item.id
      );

    /* ============================================================
     * 3. CRIAR TODOS OS LANÇAMENTOS REAIS
     * ============================================================
     *
     * A partir daqui cada ocorrência já passa a existir na grade
     * normal do Contas a Receber.
     */

    const payloadLancamentos =
      itensCriados.map(
        (item) => ({
          corretora_id:
            contexto.corretoraId,

          plano_conta_id:
            payload.plano_conta_id,

          descricao:
            item.descricao,

          pagador:
            payload.pagador?.trim() ||
            null,

          numero_documento:
            null,

          tipo_receita:
            planoConta.tipo_receita,

          data_competencia:
            item.data_competencia,

          data_emissao:
            null,

          data_vencimento:
            item.data_vencimento,

          valor_previsto:
            normalizarNumero(
              item.valor_previsto
            ),

          status:
            'PENDENTE',

          origem:
            'PROVISIONAMENTO',

          /*
           * O vínculo é com o item específico.
           * Assim cada lançamento sabe exatamente
           * qual ocorrência da recorrência o originou.
           */
          origem_id:
            item.id,

          observacoes:
            item.observacoes ??
            payload.observacoes?.trim() ??
            null,

          criado_por_id:
            contexto.userId,
        })
      );

    const {
      data: lancamentosCriados,
      error: lancamentosError,
    } = await supabase
      .from(
        'crm_contas_receber_lancamentos'
      )
      .insert(
        payloadLancamentos
      )
      .select(`
        id,
        origem_id
      `);

    if (lancamentosError) {
      throw lancamentosError;
    }

    if (
      !lancamentosCriados ||
      lancamentosCriados.length !==
        itensCriados.length
    ) {
      throw new Error(
        'Nem todos os lançamentos recorrentes foram criados.'
      );
    }

    const lancamentoPorItem =
      new Map<
        string,
        string
      >();

    for (
      const lancamento of
        lancamentosCriados
    ) {
      if (
        lancamento.origem_id
      ) {
        lancamentoPorItem.set(
          lancamento.origem_id,
          lancamento.id
        );
      }
    }

    const confirmadoEm =
      new Date().toISOString();

    /* ============================================================
     * 4. CONFIRMAR TODOS OS ITENS
     * ============================================================
     */

    const resultadosConfirmacao =
      await Promise.all(
        itensCriados.map(
          async (item) => {
            const lancamentoId =
              lancamentoPorItem.get(
                item.id
              );

            if (!lancamentoId) {
              throw new Error(
                `Lançamento do item ${item.numero_item} não encontrado.`
              );
            }

            const {
              data: itemConfirmado,
              error: confirmacaoError,
            } = await supabase
              .from(
                'crm_contas_receber_provisionamento_itens'
              )
              .update({
                status:
                  'CONFIRMADO',

                lancamento_id:
                  lancamentoId,

                confirmado_por_id:
                  contexto.userId,

                confirmado_em:
                  confirmadoEm,
              })
              .eq(
                'id',
                item.id
              )
              .eq(
                'status',
                'PENDENTE'
              )
              .select('id')
              .single();

            if (
              confirmacaoError
            ) {
              throw confirmacaoError;
            }

            return itemConfirmado;
          }
        )
      );

    if (
      resultadosConfirmacao.length !==
      itensCriados.length
    ) {
      throw new Error(
        'Nem todos os itens foram confirmados.'
      );
    }

    /* ============================================================
     * 5. FINALIZAR PROVISIONAMENTO
     * ============================================================
     */

    const {
      data: provisionamentoConfirmado,
      error: statusError,
    } = await supabase
      .from(
        'crm_contas_receber_provisionamentos'
      )
      .update({
        status:
          'CONFIRMADO',
      })
      .eq(
        'id',
        provisionamentoId
      )
      .select('id')
      .single();

    if (statusError) {
      throw statusError;
    }

    if (
      !provisionamentoConfirmado
    ) {
      throw new Error(
        'Não foi possível finalizar o provisionamento.'
      );
    }

    return provisionamentoId;
  } catch (error) {
    console.error(
      '[ContasReceber] Erro ao gerar lançamentos recorrentes:',
      error
    );

    await rollbackCriacaoProvisionamento(
      provisionamentoId,
      itemIds
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'Não foi possível gerar os lançamentos recorrentes.'
    );
  }
}
