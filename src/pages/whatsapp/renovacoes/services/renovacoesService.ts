import { supabase } from '../../../../lib/supabaseClient';
import type {
  FiltrosRenovacoes,
  OpcoesRenovacoes,
  ResultadoRenovacoes,
  RenovacaoListaItem,
  ResumoRenovacaoProduto,
} from '../types/renovacoes';

function numero(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizarResultado(raw: unknown): ResultadoRenovacoes {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('A consulta de renovações retornou um formato inválido.');
  }

  const result = raw as Record<string, unknown>;
  const dados = Array.isArray(result.dados) ? result.dados : [];
  const porProduto = Array.isArray(result.por_produto) ? result.por_produto : [];

  return {
    dados: dados.map((item: unknown) => {
      const r = item as RenovacaoListaItem;
      return { ...r, valor_premio_atual: numero(r.valor_premio_atual) };
    }),
    por_produto: porProduto.map((item: unknown) => {
      const r = item as ResumoRenovacaoProduto;
      return { ...r, valor_total: numero(r.valor_total), quantidade: numero(r.quantidade) };
    }),
    total: numero(result.total),
    valor_total: numero(result.valor_total),
    pagina: numero(result.pagina) || 1,
    por_pagina: numero(result.por_pagina) || 20,
    excedeu_limite_exportacao: result.excedeu_limite_exportacao === true,
  };
}

export async function listarRenovacoes(
  filtros: FiltrosRenovacoes,
  pagina = 1,
  porPagina = 20,
  exportar = false,
): Promise<ResultadoRenovacoes> {
  const busca = filtros.busca?.trim() ?? '';

  const { data, error } = await supabase.rpc('crm_listar_renovacoes', {
    p_busca: busca.length >= 3 ? busca : null,
    p_corretor_ids: filtros.corretor_ids?.length ? filtros.corretor_ids : null,
    p_produto_ids: filtros.produto_ids?.length ? filtros.produto_ids : null,
    p_data_venda_inicio: filtros.data_venda_inicio || null,
    p_data_venda_fim: filtros.data_venda_fim || null,
    p_vigencia_inicio: filtros.vigencia_inicio || null,
    p_vigencia_fim: filtros.vigencia_fim || null,
    p_pagina: pagina,
    p_por_pagina: porPagina,
    p_exportar: exportar,
  });

  if (error) throw error;
  const resultado = normalizarResultado(data);
  if (exportar && resultado.excedeu_limite_exportacao) {
    throw new Error(
      'O relatório ultrapassa 5.000 contratos. Reduza o período ou utilize mais filtros para exportar o PDF completo.',
    );
  }
  return resultado;
}

export async function obterOpcoesRenovacoes(): Promise<OpcoesRenovacoes> {
  const { data, error } = await supabase.rpc('crm_opcoes_filtro_renovacoes');
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Não foi possível carregar as opções de filtros.');
  }
  const raw = data as Record<string, unknown>;
  return {
    corretores: (Array.isArray(raw.corretores) ? raw.corretores : []) as OpcoesRenovacoes['corretores'],
    produtos: (Array.isArray(raw.produtos) ? raw.produtos : []) as OpcoesRenovacoes['produtos'],
  };
}
