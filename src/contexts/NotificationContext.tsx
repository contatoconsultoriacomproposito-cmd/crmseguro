import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

// Importação dos modais para abertura via notificação
import { ModalInclusaoAcao } from '../components/kanban/ModalInclusaoAcao';
import { ModalGerenciamentoSinistro } from '../components/kanban/components_visual_card/ModalGerenciamentoSinistro';

interface Notificacao {
  id: string;
  tipo: 'COMERCIAL' | 'SINISTRO' | 'INDICACAO';
  titulo: string;
  subtitulo?: string;
  data: string;
  horario?: string;
  atrasado: boolean;
  ref_id: string;
}

interface NotificationContextData {
  notificacoes: Notificacao[];
  refresh: () => void;
  abrirNotificacao: (n: Notificacao) => void;
  markAsReadByIndicacao: (indicacaoId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [modalAtivo, setModalAtivo] = useState<{ tipo: string, id: string } | null>(null);

  const carregarNotificacoes = useCallback(async () => {
    if (!user) return;

    try {
      const agora = new Date();
      const hojeLocalStr = agora.getFullYear() + '-' + 
                           String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(agora.getDate()).padStart(2, '0');
      
      const listaGeral: Notificacao[] = [];

      // 1. BUSCAR PERFIL DO USUÁRIO PARA DEFINIR HIERARQUIA E CORRETORA
      const { data: perfil, error: errP } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      if (errP) throw errP;

      const isAdmin = perfil?.tipo_usuario === 'CORRETORA';
      const corretoraDonaId = perfil?.corretora_id || user.id;

      // --- 2. BUSCAR INDICAÇÕES COM STATUS 'NOVO' ---
      // CORREÇÃO CRÍTICA: Se o status for 'NOVO', o corretor_id pode ser NULL.
      // Precisamos buscar leads da corretora que estejam sem corretor OU vinculados ao usuário logado.
      let queryInd = supabase
        .from('tab_indicacoes')
        .select(`
          id, 
          nome_cliente, 
          created_at, 
          status_indicacao,
          corretor_id, 
          corretora_id,
          tab_parceiros ( nome_parceiro )
        `)
        .eq('status_indicacao', 'NOVO')
        .eq('corretora_id', corretoraDonaId); // FILTRO MÃE: Se é da corretora, a Raquel vê.

      // Se NÃO for admin (corretora mãe), aí sim filtramos apenas para o que for dele ou fila
      if (!isAdmin) {
        queryInd = queryInd.or(`corretor_id.eq.${user.id},corretor_id.is.null`);
      }

      // O segredo para a Raquel ver TUDO é NÃO aplicar mais filtros se ela for Admin.
      // Como ela é 'CORRETORA', a query para ela será apenas: STATUS=NOVO + CORRETORA_ID=Dela.

      const { data: indicacoes, error: errInd } = await queryInd;
      
      if (!errInd && indicacoes) {
        indicacoes.forEach((ind: any) => {
          const parceiroObj = Array.isArray(ind.tab_parceiros) ? ind.tab_parceiros[0] : ind.tab_parceiros;
          
          listaGeral.push({
            id: `ind-${ind.id}`,
            tipo: 'INDICACAO',
            titulo: `NOVA INDICAÇÃO: ${ind.nome_cliente}`,
            subtitulo: `Parceiro: ${parceiroObj?.nome_parceiro || 'Link Direto'}`,
            data: ind.created_at,
            atrasado: false,
            ref_id: ind.id
          });
        });
      }

      // --- 3. BUSCAR PENDÊNCIAS COMERCIAIS (TAB_CLIENTES) ---
      let queryClientes = supabase
        .from('tab_clientes')
        .select('id, nome, data_retorno, horario_retorno, corretor_id, corretora_id')
        .not('data_retorno', 'is', null)
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) {
        queryClientes = queryClientes.eq('corretor_id', user.id);
      }

      const { data: clientes } = await queryClientes;
      clientes?.forEach(c => {
        if (c.data_retorno <= hojeLocalStr) {
          listaGeral.push({
            id: `com-${c.id}`,
            tipo: 'COMERCIAL',
            titulo: c.nome || 'Sem Nome',
            data: c.data_retorno,
            horario: c.horario_retorno,
            atrasado: c.data_retorno < hojeLocalStr,
            ref_id: c.id
          });
        }
      });

      // --- 4. BUSCAR PENDÊNCIAS DE SINISTROS (TAB_SINISTROS) ---
      let querySinistros = supabase
        .from('tab_sinistros')
        .select(`
          id, status, corretor_id, corretora_id,
          tab_proposta_itens(base_produtos(nome)),
          tab_sinistros_ocorrencias(data_retorno)
        `)
        .eq('status', 'Aberto')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) {
        querySinistros = querySinistros.eq('corretor_id', user.id);
      }

      const { data: sinistros } = await querySinistros as any;
      sinistros?.forEach((s: any) => {
        const item = Array.isArray(s.tab_proposta_itens) ? s.tab_proposta_itens[0] : s.tab_proposta_itens;
        const produto = Array.isArray(item?.base_produtos) ? item?.base_produtos[0] : item?.base_produtos;
        const ocorrenciaVencida = s.tab_sinistros_ocorrencias
          ?.filter((o: any) => o.data_retorno && o.data_retorno <= hojeLocalStr)
          .sort((a: any, b: any) => b.data_retorno.localeCompare(a.data_retorno))[0];

        if (ocorrenciaVencida) {
          listaGeral.push({
            id: `sin-${s.id}`,
            tipo: 'SINISTRO',
            titulo: produto?.nome || 'Sinistro em Andamento',
            data: ocorrenciaVencida.data_retorno,
            atrasado: ocorrenciaVencida.data_retorno < hojeLocalStr,
            ref_id: s.id
          });
        }
      });

      // Ordenar: Indicações primeiro (top priority), depois as outras por data decrescente
      setNotificacoes(listaGeral.sort((a, b) => {
        if (a.tipo === 'INDICACAO' && b.tipo !== 'INDICACAO') return -1;
        if (a.tipo !== 'INDICACAO' && b.tipo === 'INDICACAO') return 1;
        return b.data.localeCompare(a.data);
      }));
      
    } catch (error) {
      console.error("Erro crítico no NotificationProvider:", error);
    }
  }, [user]);

  // Função para marcar como lido localmente (remove da lista instantaneamente)
  const markAsReadByIndicacao = async (indicacaoId: string) => {
    setNotificacoes(prev => prev.filter(n => n.ref_id !== indicacaoId));
  };

  // REALTIME ATIVO PARA ATUALIZAÇÃO INSTANTÂNEA
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_indicacoes' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_clientes' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_sinistros' }, () => carregarNotificacoes())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, carregarNotificacoes]);

  useEffect(() => {
    carregarNotificacoes();
    // Intervalo de segurança para casos onde o Realtime possa falhar
    const interval = setInterval(carregarNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [carregarNotificacoes]);

  const abrirNotificacao = (n: Notificacao) => {
    if (n.tipo === 'INDICACAO') {
      // Ao clicar, redireciona para a triagem com o ID
      window.location.href = `/parceiros/triagem?id=${n.ref_id}`;
    } else {
      setModalAtivo({ tipo: n.tipo, id: n.ref_id });
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notificacoes, 
      refresh: carregarNotificacoes, 
      abrirNotificacao,
      markAsReadByIndicacao 
    }}>
      {children}
      {modalAtivo?.tipo === 'COMERCIAL' && (
        <ModalInclusaoAcao 
          clienteId={modalAtivo.id}
          onClose={() => setModalAtivo(null)}
          onSuccess={() => { carregarNotificacoes(); setModalAtivo(null); }}
        />
      )}
      {modalAtivo?.tipo === 'SINISTRO' && (
        <ModalGerenciamentoSinistro 
          sinistroId={modalAtivo.id}
          onClose={() => setModalAtivo(null)}
          onSuccess={() => { carregarNotificacoes(); setModalAtivo(null); }}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);