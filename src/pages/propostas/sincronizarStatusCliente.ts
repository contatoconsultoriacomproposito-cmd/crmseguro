import { supabase } from "../../lib/supabaseClient";

/**
 * sincronizarStatusCliente
 * * Esta função é o "Cérebro" que garante a integridade entre as Propostas e o Cliente.
 * Ela implementa as 4 Regras de Ouro:
 * 1. Pelo menos uma vendida = Status 'vendido' / Fase 'pos'
 * 2. Vendida + Perdida = Status 'vendido' / Fase 'pos'
 * 3. Apenas Perdida(s) = Status 'perdido' / Fase 'recuperacao'
 * 4. Sem propostas = Status 'novo' / Fase 'lead'
 */
export async function sincronizarStatusCliente(clienteId: string) {
  if (!clienteId) return;

  try {
    const { data: propostas, error: errorBusca } = await supabase
      .from('tab_propostas')
      .select('status')
      .eq('cliente_id', clienteId);

    if (errorBusca) throw errorBusca;

    let novoStatus: 'novo' | 'vendido' | 'perdido' = 'novo';
    let novaFase = 'lead';

    if (propostas && propostas.length > 0) {
      const temVendido = propostas.some(p => p.status === 'Vendido');
      const temPerdido = propostas.some(p => p.status === 'Perdido');
      const temEmNegociacao = propostas.some(p => p.status === 'Em Negociação');

      if (temVendido) {
        novoStatus = 'vendido';
        // REGRA OURO: Se tem algo sendo negociado, fase de negociação, senão POS.
        novaFase = temEmNegociacao ? 'negociacao_vendas' : 'pos';
      } 
      else if (temPerdido) {
        novoStatus = 'perdido';
        // REGRA OURO: Se tem algo sendo negociado, fase de negociação de perdas, senão RECUPERACAO.
        novaFase = temEmNegociacao ? 'negociacao_perdas' : 'recuperacao';
      } 
      else {
        novoStatus = 'novo';
        novaFase = 'negociacao';
      }
    } else {
      novoStatus = 'novo';
      novaFase = 'lead';
    }

    const { error: errorUpdate } = await supabase
      .from('tab_clientes')
      .update({ 
        status_kanban: novoStatus, 
        fase_kanban: novaFase,
        posicao_kanban: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', clienteId);

    if (errorUpdate) throw errorUpdate;
    
  } catch (error) {
    console.error("Erro fatal ao sincronizar status do cliente:", error);
  }
}