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

  // Transformamos o loadConfigs em uma função estável com useCallback
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
        const ordemDesejada: Record<string, string[]> = {
          atendimento: ['lead', 'contato', 'negociacao'],
          vendas: ['pos', 'renovacao', 'negociacao_vendas'],
          perdas: ['recuperacao', 'contato_perda', 'negociacao_perdas']
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

      const padrao: Record<string, any[]> = {
        atendimento: [
          { id: 'lead', title: 'Novo Lead', colorHex: '#64748b' },
          { id: 'contato', title: 'Lead Contatado', colorHex: '#2563eb' },
          { id: 'negociacao', title: 'Lead em Negociação', colorHex: '#d97706' }
        ],
        vendas: [
          { id: 'pos', title: 'Cliente em Pós-Vendas', colorHex: '#64748b' },
          { id: 'renovacao', title: 'Renovação do Seguro', colorHex: '#2563eb' },
          { id: 'negociacao_vendas', title: 'Cliente em negociação', colorHex: '#d97706' }
        ],
        perdas: [
          { id: 'recuperacao', title: 'Em recuperação', colorHex: '#64748b' },
          { id: 'contato_perda', title: 'Contato em recuperação', colorHex: '#2563eb' },
          { id: 'negociacao_perdas', title: 'Renegociação', colorHex: '#d97706' }
        ]
      };

      setColunas(padrao[grupo] || []);
    } finally {
      setLoading(false);
    }
  }, [grupo]);

  // Carrega automaticamente quando o grupo mudar
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Retornamos colunas, loading e agora o refresh
  return { colunas, loading, refresh: loadConfigs };
}