import { supabase } from '../../../../lib/supabaseClient';

export type TipoContaExclusao = 'pagar' | 'receber';

export interface ResultadoExclusaoFinanceira {
  sucesso: boolean;
  tipo: TipoContaExclusao;
  lancamento_id: string;
  auditoria_id: number;
}

/** Exclusão física transacional; autorização e integridade são verificadas pela RPC. */
export async function excluirDefinitivamenteLancamentoFinanceiro(
  tipo: TipoContaExclusao,
  lancamentoId: string,
  justificativa: string,
): Promise<ResultadoExclusaoFinanceira> {
  const motivo = justificativa.trim();
  if (!lancamentoId) throw new Error('Lançamento não informado.');
  if (motivo.length < 20) throw new Error('Informe uma justificativa de pelo menos 20 caracteres.');

  const { data, error } = await supabase.rpc('crm_financeiro_excluir_lancamento_manual', {
    p_tipo: tipo,
    p_lancamento_id: lancamentoId,
    p_justificativa: motivo,
  });
  if (error) throw new Error(error.message);
  const resultado = data as ResultadoExclusaoFinanceira | null;
  if (!resultado || resultado.sucesso !== true || resultado.lancamento_id !== lancamentoId) {
    throw new Error('O servidor não confirmou a exclusão definitiva do lançamento.');
  }
  return resultado;
}
