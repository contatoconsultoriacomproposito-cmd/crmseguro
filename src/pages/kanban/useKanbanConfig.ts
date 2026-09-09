import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface KanbanConfig {
  fase_chave: string;
  nome_exibicao: string;
  cor_hex: string;
}

export function useKanbanConfig(grupo: 'atendimento' | 'vendas' | 'perdas') {
  const [colunas, setColunas] = useState<{ id: string, title: string, colorHex: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', user.id)
        .single();

      if (!perfil) throw new Error('Perfil não encontrado');

      const { data: configs, error } = await supabase
        .from('tab_kanban_config')
        .select('fase_chave, nome_exibicao, cor_hex')
        .eq('corretora_id', perfil.corretora_id)
        .eq('grupo', grupo)
        .returns<KanbanConfig[]>();

      if (error) throw error;

      if (configs && configs.length > 0) {
        // Atualizado com as novas chaves exatas das suas regras
        const ordemDesejada: Record<string, string[]> = {
          atendimento: ['nao_contatado', 'contato_realizado', 'negociacao_lead'],
          vendas: ['pos_vendas', 'renovacao', 'negociacao_cliente'],
          perdas: ['recuperacao', 'contato_realizado_perdido', 'negociacao_perdido'],
          novo: ['novo']
        };

        const ordemAtual = ordemDesejada[grupo] || [];

        const colunasFormatadas = configs
          .map(c => ({
            id: c.fase_chave,
            title: c.nome_exibicao,
            colorHex: c.cor_hex,
          }))
          .sort((a, b) => ordemAtual.indexOf(a.id) - ordemAtual.indexOf(b.id));

        setColunas(colunasFormatadas);
      } else {
        throw new Error('Configurações não encontradas no banco');
      }

    } catch (err) {
      console.error('Erro ao carregar config do Kanban:', err);

      // Fallback atualizado com as novas chaves
      const padrao: Record<string, any[]> = {
        atendimento: [
          { id: 'nao_contatado', title: 'Não Contatado', colorHex: '#64748b' },
          { id: 'contato_realizado', title: 'Contato Realizado', colorHex: '#2563eb' },
          { id: 'negociacao_lead', title: 'Em Negociação', colorHex: '#d97706' }
        ],
        vendas: [
          { id: 'pos_vendas', title: 'Pós-Vendas', colorHex: '#16a34a' },
          { id: 'renovacao', title: 'Renovação', colorHex: '#2563eb' },
          { id: 'negociacao_cliente', title: 'Em Negociação', colorHex: '#ca8a04' }
        ],
        perdas: [
          { id: 'recuperacao', title: 'Em Recuperação', colorHex: '#64748b' },
          { id: 'contato_realizado_perdido', title: 'Contato Realizado', colorHex: '#2563eb' },
          { id: 'negociacao_perdido', title: 'Renegociação', colorHex: '#d97706' }
        ],
        novo: [
          { id: 'novo', title: 'Novo', colorHex: '#64748b' }
        ]
      };

      setColunas(padrao[grupo] || []);
    } finally {
      setLoading(false);
    }
  }, [grupo]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return { colunas, loading, refresh: loadConfigs };
}