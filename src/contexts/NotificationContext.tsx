import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { toast } from 'sonner';

// Importação dos modais
import { ModalGerenciamentoRenovacao } from './ModalGerenciamentoRenovacao';
import ModalContato from '../pages/agenda/modalcontatos';

interface Notificacao {
  id: string;
  tipo: 'COMERCIAL' | 'SINISTRO' | 'INDICACAO' | 'RENOVACAO' | 'ANIVERSARIO' | 'PROSPECCAO';
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
  const [clienteParaModal, setClienteParaModal] = useState<any>(null);

  const carregarNotificacoes = useCallback(async () => {
    if (!user) return;

    try {
      // Força a captura da data baseando-se estritamente no Horário de Brasília
      const dataBrasilia = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      const [diaBr, mesBr, anoBr] = dataBrasilia.split('/');
      
      const hojeLocalStr = `${anoBr}-${mesBr}-${diaBr}`; // Formato YYYY-MM-DD
      const mesDiaHoje = `${mesBr}-${diaBr}`;         // Formato MM-DD
      
      const listaGeral: Notificacao[] = [];

      // 1. BUSCAR PERFIL DO USUÁRIO
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      const isAdmin = perfil?.tipo_usuario === 'CORRETORA';
      const corretoraDonaId = perfil?.corretora_id || user.id;

      // --- CONFIGURAÇÃO DE QUERIES EM PARALELO ---

      // Query Indicações
      let queryInd = supabase
        .from('tab_indicacoes')
        .select(`id, nome_cliente, created_at, status_indicacao, tab_parceiros(nome_parceiro)`)
        .eq('status_indicacao', 'NOVO')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryInd = queryInd.or(`corretor_id.eq.${user.id},corretor_id.is.null`);

      // Query Clientes otimizada
      let queryClientes = supabase
        .from('tab_clientes')
        .select('id, nome, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, data_nascimento')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryClientes = queryClientes.eq('corretor_id', user.id);

      // Query Renovações Otimizada
      let queryRenovacoes = supabase
        .from('tab_proposta_itens')
        .select(`
          id, 
          data_renovacao, 
          horario_renovacao,
          notificacao_ativa,
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
        .eq('tab_proposta_opcoes.tab_propostas.corretora_id', corretoraDonaId);

      if (!isAdmin) queryRenovacoes = queryRenovacoes.eq('tab_proposta_opcoes.tab_propostas.corretor_id', user.id);

      // Query de Prospecção Fria (Substituindo tab_campanhas) trazendo data e horário de retorno
      let queryFrios = supabase
        .from('tab_clientes_frios_acoes')
        .select(`
          id,
          observacao,
          data_retorno,
          horario_retorno,
          tab_clientes_frios!inner (
            id,
            razao_social,
            nome_fantasia,
            corretora_id,
            corretor_id
          )
        `)
        .lte('data_retorno', hojeLocalStr)
        .eq('tab_clientes_frios.corretora_id', corretoraDonaId);

      if (!isAdmin) queryFrios = queryFrios.eq('tab_clientes_frios.corretor_id', user.id);

      // 🔥 DISPARO SIMULTÂNEO (Executa as 4 queries de dados de forma paralela e performática)
      const [resIndicacoes, resClientes, resRenovacoes, resFrios] = await Promise.all([
        queryInd,
        queryClientes,
        queryRenovacoes,
        queryFrios
      ]);

      // --- PROCESSAMENTO DOS RESULTADOS ---

      // Processar Indicações
      resIndicacoes.data?.forEach((ind: any) => {
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

      // Processar Clientes (Retornos Comerciais, Sinistros + Inteligência de Aniversário)
      resClientes.data?.forEach(c => {
        const nomeExibicao = c.nome || 'Cliente sem nome';
        
        // A) Verifica retorno comercial expirado ou de hoje
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
        
        // B) Verifica retorno de sinistro expirado ou de hoje
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

        // C) Filtro Seguro de Aniversariantes
        if (c.data_nascimento) {
          const partes = c.data_nascimento.split('-');
          if (partes.length === 3) {
            const mesDiaCliente = `${partes[1]}-${partes[2]}`;
            
            if (mesDiaCliente === mesDiaHoje) {
              listaGeral.push({
                id: `aniv-${c.id}`,
                tipo: 'ANIVERSARIO',
                titulo: `🎈 ANIVERSÁRIO HOJE: ${nomeExibicao}`,
                subtitulo: 'Parabenize seu cliente!',
                data: hojeLocalStr,
                atrasado: false,
                ref_id: c.id
              });
            }
          }
        }
      });

      // Processar Renovações
      resRenovacoes.data?.forEach((ren: any) => {
        const itemOpcao = Array.isArray(ren.tab_proposta_opcoes) ? ren.tab_proposta_opcoes[0] : ren.tab_proposta_opcoes;
        const nomeCli = itemOpcao?.tab_propostas?.tab_clientes?.nome || 'Cliente';
        listaGeral.push({
          id: `ren-${ren.id}`,
          tipo: 'RENOVACAO',
          titulo: `RENOVAÇÃO: ${nomeCli}`,
          subtitulo: 'Ajuste de vigência',
          data: ren.data_renovacao,
          horario: ren.horario_renovacao,
          atrasado: ren.data_renovacao < hojeLocalStr,
          ref_id: ren.id
        });
      });

      // Processar Prospecção Fria (Leitura de data_retorno e horario_retorno)
      resFrios.data?.forEach((acao: any) => {
        const cFrio = acao.tab_clientes_frios;
        if (!cFrio) return;

        const nomeExibicao = cFrio.nome_fantasia || cFrio.razao_social || 'Prospect Frio';

        listaGeral.push({
          id: `frio-${acao.id}`,
          tipo: 'PROSPECCAO',
          titulo: `PROSPECÇÃO (RETORNO): ${nomeExibicao}`,
          subtitulo: acao.observacao || 'Retorno agendado',
          data: acao.data_retorno,
          horario: acao.horario_retorno,
          atrasado: acao.data_retorno < hojeLocalStr,
          ref_id: cFrio.id
        });
      });

      // Ordenação Final: Indicações primeiro, depois o restante ordenado por data
      setNotificacoes(listaGeral.sort((a, b) => {
        if (a.tipo === 'INDICACAO' && b.tipo !== 'INDICACAO') return -1;
        if (a.tipo !== 'INDICACAO' && b.tipo === 'INDICACAO') return 1;
        return (a.data || '').localeCompare(b.data || '');
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

    // Se clicar em Comercial, Sinistro ou Aniversário, abre a ficha do cliente
    if (n.tipo === 'COMERCIAL' || n.tipo === 'SINISTRO' || n.tipo === 'ANIVERSARIO') {
      const { data: cliente } = await supabase
        .from('tab_clientes')
        .select('*')
        .eq('id', n.ref_id)
        .single();

      if (cliente) {
        setClienteParaModal(cliente);
        setModalAtivo({ tipo: 'CONTATO_GERAL', id: n.ref_id });
      } else {
        toast.error("Cliente não encontrado.");
      }
      return;
    }

    // Se clicar em Prospecção Fria, abre o mesmo modal adaptado com os dados da tabela fria
    if (n.tipo === 'PROSPECCAO') {
      const { data: prospect } = await supabase
        .from('tab_clientes_frios')
        .select('*')
        .eq('id', n.ref_id)
        .single();

      if (prospect) {
        const prospectNormalizado = {
          ...prospect,
          nome: prospect.nome_fantasia || prospect.razao_social || 'Sem Nome',
          isFrio: true
        };
        setClienteParaModal(prospectNormalizado);
        setModalAtivo({ tipo: 'CONTATO_GERAL', id: n.ref_id });
      } else {
        toast.error("Prospect não encontrado.");
      }
      return;
    }
  };

  const markAsReadByIndicacao = async (indicacaoId: string) => {
    setNotificacoes(prev => prev.filter(n => n.ref_id !== indicacaoId));
  };

  useEffect(() => {
    if (!user) return;
    
    // Subscrições Realtime atualizadas para escutar a tabela de ações frias no lugar de campanhas
    const channel = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_clientes' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_indicacoes' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_proposta_itens' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_clientes_frios_acoes' }, () => carregarNotificacoes())
      .subscribe();

    carregarNotificacoes();
    
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [user, carregarNotificacoes]);

  return (
    <NotificationContext.Provider value={{ 
      notificacoes, 
      refresh: carregarNotificacoes, 
      abrirNotificacao,
      markAsReadByIndicacao 
    }}>
      {children}
      
      {modalAtivo?.tipo === 'RENOVACAO' && (
        <ModalGerenciamentoRenovacao 
          isOpen={true} 
          itemId={modalAtivo.id}
          onClose={() => setModalAtivo(null)}
          onSuccess={() => { 
            carregarNotificacoes(); 
            setModalAtivo(null); 
          }}
        />
      )}

      {modalAtivo?.tipo === 'CONTATO_GERAL' && clienteParaModal && (
        <ModalContato 
          isOpen={true}
          cliente={clienteParaModal}
          onClose={() => {
            setModalAtivo(null);
            setClienteParaModal(null);
          }}
          onSuccess={() => {
            carregarNotificacoes();
            setModalAtivo(null);
            setClienteParaModal(null);
          }}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);