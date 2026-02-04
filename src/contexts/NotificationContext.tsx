import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

// Importação dos modais
import { ModalInclusaoAcao } from '../components/kanban/ModalInclusaoAcao';
import { ModalGerenciamentoSinistro } from '../components/kanban/components_visual_card/ModalGerenciamentoSinistro';
import { ModalGerenciamentoRenovacao } from './ModalGerenciamentoRenovacao';

interface Notificacao {
  id: string;
  tipo: 'COMERCIAL' | 'SINISTRO' | 'INDICACAO' | 'RENOVACAO';
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

      // 1. BUSCAR PERFIL
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      const isAdmin = perfil?.tipo_usuario === 'CORRETORA';
      const corretoraDonaId = perfil?.corretora_id || user.id;

      // --- 2. BUSCAR INDICAÇÕES ---
      let queryInd = supabase
        .from('tab_indicacoes')
        .select(`id, nome_cliente, created_at, status_indicacao, tab_parceiros(nome_parceiro)`)
        .eq('status_indicacao', 'NOVO')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryInd = queryInd.or(`corretor_id.eq.${user.id},corretor_id.is.null`);

      const { data: indicacoes } = await queryInd;
      indicacoes?.forEach((ind: any) => {
        const parceiro = Array.isArray(ind.tab_parceiros) ? ind.tab_parceiros[0] : ind.tab_parceiros;
        listaGeral.push({
          id: `ind-${ind.id}`,
          tipo: 'INDICACAO',
          titulo: `INDICAÇÃO: ${ind.nome_cliente}`,
          subtitulo: parceiro?.nome_parceiro || 'Link Direto',
          data: ind.created_at,
          atrasado: false,
          ref_id: ind.id
        });
      });

      // --- 3. BUSCA NA TAB_CLIENTES (COMERCIAL E SINISTRO) ---
      let queryClientes = supabase
        .from('tab_clientes')
        .select('id, nome, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro')
        .eq('corretora_id', corretoraDonaId)
        .or(`data_retorno.lte.${hojeLocalStr},data_retorno_sinistro.lte.${hojeLocalStr}`);

      if (!isAdmin) queryClientes = queryClientes.eq('corretor_id', user.id);

      const { data: clientes } = await queryClientes;
      
      clientes?.forEach(c => {
        const nomeExibicao = c.nome || 'Cliente sem nome';
        if (c.data_retorno && c.data_retorno <= hojeLocalStr) {
          listaGeral.push({
            id: `com-${c.id}`,
            tipo: 'COMERCIAL',
            titulo: `RETORNO COMERCIAL: ${nomeExibicao}`,
            data: c.data_retorno,
            horario: c.horario_retorno,
            atrasado: c.data_retorno < hojeLocalStr,
            ref_id: c.id
          });
        }
        if (c.data_retorno_sinistro && c.data_retorno_sinistro <= hojeLocalStr) {
          listaGeral.push({
            id: `sin-${c.id}`,
            tipo: 'SINISTRO',
            titulo: `SINISTRO (RETORNO): ${nomeExibicao}`,
            data: c.data_retorno_sinistro,
            horario: c.horario_retorno_sinistro,
            atrasado: c.data_retorno_sinistro < hojeLocalStr,
            ref_id: c.id
          });
        }
      });

      // --- 4. BUSCA DE RENOVAÇÕES (CORRIGIDO PARA UNIFORMIZAR TÍTULO E COR) ---
      const { data: renovacoes, error: errorRen } = await supabase
        .from('tab_proposta_itens')
        .select(`
          id, 
          data_renovacao, 
          horario_renovacao,
          tab_proposta_opcoes!inner (
            tab_propostas!inner (
              corretora_id,
              corretor_id,
              tab_clientes (nome)
            )
          )
        `)
        .eq('notificacao_ativa', true)
        .lte('data_renovacao', hojeLocalStr)
        .filter('tab_proposta_opcoes.tab_propostas.corretora_id', 'eq', corretoraDonaId);

      if (errorRen) console.error("Erro na query de renovações:", errorRen);

      let listaRenovacoes = renovacoes || [];
      if (!isAdmin) {
        listaRenovacoes = listaRenovacoes.filter((r: any) => 
          r.tab_proposta_opcoes?.tab_propostas?.corretor_id === user.id
        );
      }

      listaRenovacoes.forEach((ren: any) => {
        const nomeCli = ren.tab_proposta_opcoes?.tab_propostas?.tab_clientes?.nome || 'Cliente';
        listaGeral.push({
          id: `ren-${ren.id}`,
          tipo: 'RENOVACAO',
          // Incluímos o nome do cliente no título para que apareça na Sidebar
          titulo: `RENOVAÇÃO: ${nomeCli}`,
          subtitulo: 'Ajuste de vigência',
          data: ren.data_renovacao,
          horario: ren.horario_renovacao,
          atrasado: ren.data_renovacao < hojeLocalStr,
          ref_id: ren.id
        });
      });

      // Ordenação Final
      setNotificacoes(listaGeral.sort((a, b) => {
        if (a.tipo === 'INDICACAO' && b.tipo !== 'INDICACAO') return -1;
        if (a.tipo !== 'INDICACAO' && b.tipo === 'INDICACAO') return 1;
        return a.data.localeCompare(b.data);
      }));
      
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  }, [user]);

  const abrirNotificacao = async (n: Notificacao) => {
    if (n.tipo === 'INDICACAO') {
      window.location.href = `/parceiros/triagem?id=${n.ref_id}`;
      return;
    }

    if (n.tipo === 'RENOVACAO') {
      setModalAtivo({ tipo: 'RENOVACAO', id: n.ref_id });
      return;
    }

    if (n.tipo === 'SINISTRO') {
      const { data } = await supabase
        .from('tab_sinistros')
        .select('id')
        .eq('cliente_id', n.ref_id)
        .eq('status', 'Aberto')
        .maybeSingle();

      if (data) {
        setModalAtivo({ tipo: 'SINISTRO', id: data.id });
      } else {
        alert("Sinistro não encontrado ou já encerrado.");
        carregarNotificacoes();
      }
    } else {
      setModalAtivo({ tipo: 'COMERCIAL', id: n.ref_id });
    }
  };

  const markAsReadByIndicacao = async (indicacaoId: string) => {
    setNotificacoes(prev => prev.filter(n => n.ref_id !== indicacaoId));
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_clientes' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_indicacoes' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_proposta_itens' }, () => carregarNotificacoes())
      .subscribe();

    carregarNotificacoes();
    return () => { supabase.removeChannel(channel); };
  }, [user, carregarNotificacoes]);

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
      {modalAtivo?.tipo === 'RENOVACAO' && (
        <ModalGerenciamentoRenovacao 
          itemId={modalAtivo.id}
          onClose={() => setModalAtivo(null)}
          onSuccess={() => { carregarNotificacoes(); setModalAtivo(null); }}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);