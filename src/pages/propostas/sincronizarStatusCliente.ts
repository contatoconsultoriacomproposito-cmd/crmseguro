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
    // 1. Busca todas as propostas atuais que o cliente possui no banco
    const { data: propostas, error: errorBusca } = await supabase
      .from('tab_propostas')
      .select('status')
      .eq('cliente_id', clienteId);

    if (errorBusca) throw errorBusca;

    let novoStatus: 'novo' | 'vendido' | 'perdido' = 'novo';
    let novaFase = 'lead';

    // Verificamos o que sobrou no histórico do cliente
    if (propostas && propostas.length > 0) {
      const temVendido = propostas.some(p => p.status === 'Vendido');
      const temPerdido = propostas.some(p => p.status === 'Perdido');

      if (temVendido) {
        // Regra 1 e 2: Prioridade total para o status de Vendido
        novoStatus = 'vendido';
        novaFase = 'pos';
      } else if (temPerdido) {
        // Regra 3: Se não há vendas, mas há perdas, o cliente é "Perdido"
        novoStatus = 'perdido';
        novaFase = 'recuperacao';
      } else {
        // Caso as propostas estejam em aberto ou negociação
        novoStatus = 'novo';
        novaFase = 'negociacao';
      }
    } else {
      // Regra 4: Se o array de propostas for vazio (exclusão de tudo)
      novoStatus = 'novo';
      novaFase = 'lead';
    }

    // 2. Atualiza a tabela de clientes com o veredito final
    const { error: errorUpdate } = await supabase
      .from('tab_clientes')
      .update({ 
        status_kanban: novoStatus, 
        fase_kanban: novaFase,
        posicao_kanban: 0, // Reseta posição para o topo da nova coluna
        updated_at: new Date().toISOString()
      })
      .eq('id', clienteId);

    if (errorUpdate) throw errorUpdate;

    console.log(`Status do cliente ${clienteId} sincronizado para: ${novoStatus}`);
    
  } catch (error) {
    console.error("Erro fatal ao sincronizar status do cliente:", error);
  }
}