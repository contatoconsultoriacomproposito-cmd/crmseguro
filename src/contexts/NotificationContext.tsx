import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

// Importação dos modais para abertura via notificação
import { ModalInclusaoAcao } from '../components/kanban/ModalInclusaoAcao';
import { ModalGerenciamentoSinistro } from '../components/kanban/components_visual_card/ModalGerenciamentoSinistro';

interface Notificacao {
  id: string;
  tipo: 'COMERCIAL' | 'SINISTRO';
  titulo: string;
  data: string;
  horario?: string;
  atrasado: boolean;
  ref_id: string;
}

interface NotificationContextData {
  notificacoes: Notificacao[];
  refresh: () => void;
  abrirNotificacao: (n: Notificacao) => void;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [modalAtivo, setModalAtivo] = useState<{ tipo: 'COMERCIAL' | 'SINISTRO', id: string } | null>(null);

  const carregarNotificacoes = useCallback(async () => {
    if (!user) return;

    try {
      const agora = new Date();
      const hojeLocalStr = agora.getFullYear() + '-' + 
                           String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(agora.getDate()).padStart(2, '0');
      
      const listaGeral: Notificacao[] = [];

      // 1. BUSCAR PERFIL PARA DEFINIR HIERARQUIA
      const { data: perfil, error: errP } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      if (errP) throw errP;

      // Define se o usuário logado é o administrador da corretora
      const isAdmin = perfil?.tipo_usuario === 'CORRETORA';
      const corretoraDonaId = perfil?.corretora_id;

      // 2. BUSCAR PENDÊNCIAS COMERCIAIS (TAB_CLIENTES)
      let queryClientes = supabase
        .from('tab_clientes')
        .select('id, nome, data_retorno, horario_retorno, corretor_id, corretora_id')
        .not('data_retorno', 'is', null);

      if (isAdmin) {
        // Regra 1: Administrador vê tudo da sua corretora
        queryClientes = queryClientes.eq('corretora_id', corretoraDonaId || user.id);
      } else {
        // Regra 2: Corretor vê apenas os seus próprios clientes
        queryClientes = queryClientes.eq('corretor_id', user.id);
      }

      const { data: clientes, error: errC } = await queryClientes;
      if (errC) throw errC;

      clientes?.forEach(c => {
        // Só adiciona se a data for hoje ou passada
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

      // 3. BUSCAR PENDÊNCIAS DE SINISTROS (TAB_SINISTROS)
      let querySinistros = supabase
        .from('tab_sinistros')
        .select(`
          id, status, corretor_id, corretora_id,
          tab_proposta_itens(base_produtos(nome)),
          tab_sinistros_ocorrencias(data_retorno)
        `)
        .eq('status', 'Aberto');

      if (isAdmin) {
        querySinistros = querySinistros.eq('corretora_id', corretoraDonaId || user.id);
      } else {
        querySinistros = querySinistros.eq('corretor_id', user.id);
      }

      const { data: sinistros, error: errS } = await querySinistros as any;
      if (errS) throw errS;

      sinistros?.forEach((s: any) => {
        const item = Array.isArray(s.tab_proposta_itens) ? s.tab_proposta_itens[0] : s.tab_proposta_itens;
        const produto = Array.isArray(item?.base_produtos) ? item?.base_produtos[0] : item?.base_produtos;
        
        // Pega a ocorrência mais recente que já venceu
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

      // Ordenação final: O que está mais atrasado aparece no topo
      setNotificacoes(listaGeral.sort((a, b) => a.data.localeCompare(b.data)));
      
    } catch (error) {
      console.error("Erro no processamento de notificações:", error);
    }
  }, [user]);

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 5 * 60 * 1000); // Atualiza a cada 5 min
    return () => clearInterval(interval);
  }, [carregarNotificacoes]);

  const abrirNotificacao = (n: Notificacao) => {
    setModalAtivo({ tipo: n.tipo, id: n.ref_id });
  };

  return (
    <NotificationContext.Provider value={{ notificacoes, refresh: carregarNotificacoes, abrirNotificacao }}>
      {children}

      {/* Renderização condicional dos modais de ação */}
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