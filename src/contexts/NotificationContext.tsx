import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { toast } from 'sonner';

// Importação dos modais
import { ModalGerenciamentoRenovacao } from './ModalGerenciamentoRenovacao';
import ModalContato from '../pages/agenda/modalcontatos';

export interface Notificacao {
  id: string;
  tipo: 'COMERCIAL' | 'SINISTRO' | 'INDICACAO' | 'RENOVACAO' | 'ANIVERSARIO' | 'PROSPECCAO' | 'AGENDA';
  prioridade: 'NORMAL' | 'ALTA' | 'CRITICA';
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
      const mesDiaHoje = `${mesBr}-${diaBr}`;          // Formato MM-DD
      
      // Inteligência de Antecedência: Calcula a data limite para alertas de renovação (30 dias no futuro)
      const dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 30);
      const [diaFut, mesFut, anoFut] = dataFutura.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
      const dataLimiteRenovacaoStr = `${anoFut}-${mesFut}-${diaFut}`;
      
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

      // Query Indicações (Prioridade: ALTA)
      let queryInd = supabase
        .from('tab_indicacoes')
        .select(`id, nome_cliente, created_at, status_indicacao, tab_parceiros(nome_parceiro)`)
        .eq('status_indicacao', 'NOVO')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryInd = queryInd.or(`corretor_id.eq.${user.id},corretor_id.is.null`);

      // Query Clientes (Retornos Comerciais, Sinistros e Aniversariantes)
      let queryClientes = supabase
        .from('tab_clientes')
        .select('id, nome, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, data_nascimento')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryClientes = queryClientes.eq('corretor_id', user.id);

      // Query Renovações (Prioridade: CRITICA)
      let queryRenovacoes = supabase
        .from('tab_proposta_itens')
        .select(`
          id, 
          data_renovacao, 
          horario_renovacao,
          notificacao_ativa,
          status_renovacao,
          corretor_id,
          tab_proposta_opcoes!inner (
            tab_propostas!inner (
              corretora_id,
              tab_clientes (
                nome
              )
            )
          )
        `)
        .eq('notificacao_ativa', true)
        .eq('status_renovacao', 'A RENOVAR')
        .lte('data_renovacao', dataLimiteRenovacaoStr);

      if (isAdmin) {
        queryRenovacoes = queryRenovacoes.eq('tab_proposta_opcoes.tab_propostas.corretora_id', corretoraDonaId);
      } else {
        queryRenovacoes = queryRenovacoes.eq('corretor_id', user.id);
      }

      // Query de Prospecção Fria (Prioridade: NORMAL)
      let queryFrios = supabase
        .from('tab_clientes_frios')
        .select('id, razao_social, nome_fantasia, data_retorno, horario_retorno')
        .lte('data_retorno', hojeLocalStr)
        .neq('status_prospeccao', 'convertido')
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryFrios = queryFrios.eq('corretor_id', user.id);

      // Query Agenda de Clientes (tab_clientes_agenda)
      let queryAgenda = supabase
        .from('tab_clientes_agenda')
        .select('id, nome_cliente, data_retorno, horario_retorno, tel_cliente, email_cliente, breve_descricao')
        .lte('data_retorno', hojeLocalStr)
        .eq('corretora_id', corretoraDonaId);

      if (!isAdmin) queryAgenda = queryAgenda.eq('corretor_id', user.id);

      // 🔥 DISPARO SIMULTÂNEO
      const [resIndicacoes, resClientes, resRenovacoes, resFrios, resAgenda] = await Promise.all([
        queryInd,
        queryClientes,
        queryRenovacoes,
        queryFrios,
        queryAgenda
      ]);

      // --- PROCESSAMENTO DOS RESULTADOS ---

      // Processar Indicações (ALTA)
      resIndicacoes.data?.forEach((ind: any) => {
        const parceiro = Array.isArray(ind.tab_parceiros) ? ind.tab_parceiros[0] : ind.tab_parceiros;
        listaGeral.push({
          id: `ind-${ind.id}`,
          tipo: 'INDICACAO',
          prioridade: 'ALTA',
          titulo: `INDICAÇÃO: ${ind.nome_cliente}`,
          subtitulo: parceiro?.nome_parceiro || 'Link Direto',
          data: ind.created_at,
          atrasado: false,
          ref_id: ind.id
        });
      });

      // Processar Clientes (NORMAL / ALTA)
      resClientes.data?.forEach(c => {
        const nomeExibicao = c.nome || 'Cliente sem nome';
        
        if (c.data_retorno && c.data_retorno <= hojeLocalStr) {
          listaGeral.push({
            id: `com-${c.id}`,
            tipo: 'COMERCIAL',
            prioridade: 'NORMAL',
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
            prioridade: 'ALTA',
            titulo: `SINISTRO (RETORNO): ${nomeExibicao}`,
            data: c.data_retorno_sinistro,
            horario: c.horario_retorno_sinistro,
            atrasado: c.data_retorno_sinistro < hojeLocalStr,
            ref_id: c.id
          });
        }

        if (c.data_nascimento) {
          const partes = c.data_nascimento.split('-');
          if (partes.length === 3 && `${partes[1]}-${partes[2]}` === mesDiaHoje) {
            listaGeral.push({
              id: `aniv-${c.id}`,
              tipo: 'ANIVERSARIO',
              prioridade: 'NORMAL',
              titulo: `🎈 ANIVERSÁRIO HOJE: ${nomeExibicao}`,
              subtitulo: 'Parabenize seu cliente!',
              data: hojeLocalStr,
              atrasado: false,
              ref_id: c.id
            });
          }
        }
      });

      // Processar Renovações (CRÍTICA)
      resRenovacoes.data?.forEach((ren: any) => {
        const opcao = Array.isArray(ren.tab_proposta_opcoes) ? ren.tab_proposta_opcoes[0] : ren.tab_proposta_opcoes;
        const proposta = opcao?.tab_propostas;
        const cliente = Array.isArray(proposta?.tab_clientes) ? proposta.tab_clientes[0] : proposta?.tab_clientes;
        
        const nomeCli = cliente?.nome || 'Cliente';
        
        const dataRenova = new Date(ren.data_renovacao + 'T00:00:00');
        const dataHoje = new Date(hojeLocalStr + 'T00:00:00');
        const diferencaTempo = dataRenova.getTime() - dataHoje.getTime();
        const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

        let avisoVencimento = `Vence em ${diasRestantes} dias!`;
        if (diasRestantes === 0) avisoVencimento = "Vence HOJE!";
        if (diasRestantes < 0) avisoVencimento = `Vencida há ${Math.abs(diasRestantes)} dias!`;

        listaGeral.push({
          id: `ren-${ren.id}`,
          tipo: 'RENOVACAO',
          prioridade: 'CRITICA',
          titulo: `🚨 RENOVAÇÃO: ${nomeCli}`,
          subtitulo: avisoVencimento,
          data: ren.data_renovacao,
          horario: ren.horario_renovacao,
          atrasado: ren.data_renovacao < hojeLocalStr,
          ref_id: ren.id
        });
      });

      // Processar Prospecção Fria (NORMAL)
      resFrios.data?.forEach((lead: any) => {
        const nomeExibicao = lead.nome_fantasia || lead.razao_social || 'Prospect Frio';

        listaGeral.push({
          id: `frio-${lead.id}`,
          tipo: 'PROSPECCAO',
          prioridade: 'NORMAL',
          titulo: `PROSPECÇÃO: ${nomeExibicao}`,
          subtitulo: 'Retorno agendado',
          data: lead.data_retorno,
          horario: lead.horario_retorno,
          atrasado: lead.data_retorno < hojeLocalStr,
          ref_id: lead.id
        });
      });

      // Processar Agenda (tab_clientes_agenda)
      resAgenda.data?.forEach((item: any) => {
        // Dá prioridade para a breve descrição no subtítulo; se vazia, usa telefone/email
        const subtituloNotificacao = item.breve_descricao || item.tel_cliente || item.email_cliente || 'Retorno de agenda';

        listaGeral.push({
          id: `ag-${item.id}`,
          tipo: 'AGENDA',
          prioridade: 'NORMAL',
          titulo: `AGENDA: ${item.nome_cliente}`,
          subtitulo: subtituloNotificacao,
          data: item.data_retorno,
          horario: item.horario_retorno,
          atrasado: item.data_retorno < hojeLocalStr,
          ref_id: item.id
        });
      });

      // Ordenação base por data cronológica
      setNotificacoes(listaGeral.sort((a, b) => (a.data || '').localeCompare(b.data || '')));
      
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

    if (n.tipo === 'PROSPECCAO') {
      window.location.href = `/clientes/leads?leadId=${n.ref_id}`;
      return;
    }

    if (n.tipo === 'AGENDA') {
      window.location.href = `/agenda?id=${n.ref_id}`;
      return;
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_clientes_frios' }, () => carregarNotificacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_clientes_agenda' }, () => carregarNotificacoes())
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