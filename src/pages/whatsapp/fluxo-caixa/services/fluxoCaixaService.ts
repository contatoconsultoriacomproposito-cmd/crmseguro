import { supabase } from '../../../../lib/supabaseClient';

export type NaturezaFluxoCaixa = 'ENTRADA' | 'SAIDA';
export type TipoMovimentoFluxoCaixa = 'PREVISTO' | 'REALIZADO';
export type ModuloFluxoCaixa = 'CONTAS_RECEBER' | 'CONTAS_PAGAR';

export interface MovimentoFluxoCaixa {
  movimento_chave: string;
  corretora_id: string;
  modulo: ModuloFluxoCaixa;
  natureza: NaturezaFluxoCaixa;
  tipo_movimento: TipoMovimentoFluxoCaixa;
  lancamento_id: string;
  baixa_id: string | null;
  data_movimento: string;
  data_competencia: string | null;
  data_vencimento: string;
  valor_movimento: number;
  valor_assinado: number;
  descricao: string;
  contraparte: string | null;
  plano_conta_id: string | null;
  plano_codigo: string | null;
  plano_nome: string | null;
  plano_caminho: string | null;
  tipo_financeiro: string | null;
  origem: string | null;
  status_lancamento: string | null;
  situacao_lancamento: string | null;
  numero_documento: string | null;
  cliente_id: string | null;
  cliente_tipo: 'PF' | 'PJ' | null;
  cliente_nome: string | null;
  proposta_id: string | null;
  proposta_numero: string | null;
  proposta_item_id: string | null;
  numero_cotacao: string | null;
  contrato_id: string | null;
  contrato_numero: string | null;
  origem_id: string | null;
}

export interface FiltrosFluxoCaixa {
  busca?: string;
  dataInicial?: string;
  dataFinal?: string;
  natureza?: NaturezaFluxoCaixa | '';
  tipoMovimento?: TipoMovimentoFluxoCaixa | '';
  modulo?: ModuloFluxoCaixa | '';
  origem?: string;
}

export interface ResumoFluxoCaixa {
  entradasRealizadas: number;
  saidasRealizadas: number;
  resultadoRealizado: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  resultadoPrevisto: number;
  resultadoProjetado: number;
  quantidadeMovimentos: number;
}

export interface ResumoMensalFluxoCaixa {
  chave: string;
  label: string;
  entradasRealizadas: number;
  saidasRealizadas: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  resultadoRealizado: number;
  resultadoProjetado: number;
}

function numero(valor: unknown): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapearMovimento(row: any): MovimentoFluxoCaixa {
  return {
    movimento_chave: row.movimento_chave,
    corretora_id: row.corretora_id,
    modulo: row.modulo,
    natureza: row.natureza,
    tipo_movimento: row.tipo_movimento,
    lancamento_id: row.lancamento_id,
    baixa_id: row.baixa_id ?? null,
    data_movimento: row.data_movimento,
    data_competencia: row.data_competencia ?? null,
    data_vencimento: row.data_vencimento,
    valor_movimento: numero(row.valor_movimento),
    valor_assinado: numero(row.valor_assinado),
    descricao: row.descricao ?? '',
    contraparte: row.contraparte ?? null,
    plano_conta_id: row.plano_conta_id ?? null,
    plano_codigo: row.plano_codigo ?? null,
    plano_nome: row.plano_nome ?? null,
    plano_caminho: row.plano_caminho ?? null,
    tipo_financeiro: row.tipo_financeiro ?? null,
    origem: row.origem ?? null,
    status_lancamento: row.status_lancamento ?? null,
    situacao_lancamento: row.situacao_lancamento ?? null,
    numero_documento: row.numero_documento ?? null,
    cliente_id: row.cliente_id ?? null,
    cliente_tipo: row.cliente_tipo ?? null,
    cliente_nome: row.cliente_nome ?? null,
    proposta_id: row.proposta_id ?? null,
    proposta_numero: row.proposta_numero ?? null,
    proposta_item_id: row.proposta_item_id ?? null,
    numero_cotacao: row.numero_cotacao?.trim?.() || null,
    contrato_id: row.contrato_id ?? null,
    contrato_numero: row.contrato_numero?.trim?.() || null,
    origem_id: row.origem_id ?? null,
  };
}

export async function buscarMovimentosFluxoCaixa(
  filtros: FiltrosFluxoCaixa = {}
): Promise<MovimentoFluxoCaixa[]> {
  let query = supabase
    .from('crm_fluxo_caixa_movimentos')
    .select('*')
    .order('data_movimento', { ascending: false })
    .order('movimento_chave', { ascending: true });

  if (filtros.dataInicial) {
    query = query.gte('data_movimento', filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte('data_movimento', filtros.dataFinal);
  }

  if (filtros.natureza) {
    query = query.eq('natureza', filtros.natureza);
  }

  if (filtros.tipoMovimento) {
    query = query.eq('tipo_movimento', filtros.tipoMovimento);
  }

  if (filtros.modulo) {
    query = query.eq('modulo', filtros.modulo);
  }

  if (filtros.origem) {
    query = query.eq('origem', filtros.origem);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[FluxoCaixa] Erro ao buscar movimentos:', error);
    throw new Error(error.message || 'Não foi possível carregar o Fluxo de Caixa.');
  }

  let movimentos = (data ?? []).map(mapearMovimento);
  const busca = filtros.busca?.trim().toLocaleLowerCase('pt-BR');

  if (busca) {
    movimentos = movimentos.filter((item) => {
      const texto = [
        item.descricao,
        item.contraparte,
        item.numero_documento,
        item.plano_codigo,
        item.plano_nome,
        item.plano_caminho,
        item.cliente_nome,
        item.proposta_numero,
        item.numero_cotacao,
        item.contrato_numero,
        item.origem,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR');

      return texto.includes(busca);
    });
  }

  return movimentos;
}

export function calcularResumoFluxoCaixa(
  movimentos: MovimentoFluxoCaixa[]
): ResumoFluxoCaixa {
  let entradasRealizadas = 0;
  let saidasRealizadas = 0;
  let entradasPrevistas = 0;
  let saidasPrevistas = 0;

  for (const item of movimentos) {
    if (item.natureza === 'ENTRADA' && item.tipo_movimento === 'REALIZADO') {
      entradasRealizadas += item.valor_movimento;
    } else if (item.natureza === 'SAIDA' && item.tipo_movimento === 'REALIZADO') {
      saidasRealizadas += item.valor_movimento;
    } else if (item.natureza === 'ENTRADA' && item.tipo_movimento === 'PREVISTO') {
      entradasPrevistas += item.valor_movimento;
    } else if (item.natureza === 'SAIDA' && item.tipo_movimento === 'PREVISTO') {
      saidasPrevistas += item.valor_movimento;
    }
  }

  const resultadoRealizado = entradasRealizadas - saidasRealizadas;
  const resultadoPrevisto = entradasPrevistas - saidasPrevistas;

  return {
    entradasRealizadas,
    saidasRealizadas,
    resultadoRealizado,
    entradasPrevistas,
    saidasPrevistas,
    resultadoPrevisto,
    resultadoProjetado: resultadoRealizado + resultadoPrevisto,
    quantidadeMovimentos: movimentos.length,
  };
}

export function consolidarFluxoCaixaPorMes(
  movimentos: MovimentoFluxoCaixa[]
): ResumoMensalFluxoCaixa[] {
  const mapa = new Map<string, ResumoMensalFluxoCaixa>();

  for (const item of movimentos) {
    if (!item.data_movimento) continue;

    const chave = item.data_movimento.slice(0, 7);
    const [ano, mes] = chave.split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit',
    }).format(new Date(ano, mes - 1, 1));

    const atual = mapa.get(chave) ?? {
      chave,
      label,
      entradasRealizadas: 0,
      saidasRealizadas: 0,
      entradasPrevistas: 0,
      saidasPrevistas: 0,
      resultadoRealizado: 0,
      resultadoProjetado: 0,
    };

    if (item.natureza === 'ENTRADA' && item.tipo_movimento === 'REALIZADO') {
      atual.entradasRealizadas += item.valor_movimento;
    } else if (item.natureza === 'SAIDA' && item.tipo_movimento === 'REALIZADO') {
      atual.saidasRealizadas += item.valor_movimento;
    } else if (item.natureza === 'ENTRADA' && item.tipo_movimento === 'PREVISTO') {
      atual.entradasPrevistas += item.valor_movimento;
    } else if (item.natureza === 'SAIDA' && item.tipo_movimento === 'PREVISTO') {
      atual.saidasPrevistas += item.valor_movimento;
    }

    atual.resultadoRealizado = atual.entradasRealizadas - atual.saidasRealizadas;
    atual.resultadoProjetado =
      atual.resultadoRealizado +
      atual.entradasPrevistas -
      atual.saidasPrevistas;

    mapa.set(chave, atual);
  }

  return Array.from(mapa.values()).sort((a, b) => a.chave.localeCompare(b.chave));
}
