import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

// Importação dos modais oficiais corretos
import { ModalGerenciamentoRenovacao } from './ModalGerenciamentoRenovacao';
import { ModalAcoesComerciais } from '../pages/clientes/ModalAcoesComerciais';
import { ModalGerenciamentoSinistro } from './ModalGerenciamentoSinistro';
import { salvarAcaoComercialV2 } from '../pages/clientes/clienteServiceV2';

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

/**
 * Função para higienizar o nome e evitar textos como "NULL", "undefined" ou strings vazias.
 */
const obterNomeExibicao = (item: any, fallbackDefault = 'Cliente sem nome'): string => {
  if (!item) return fallbackDefault;

  const possiveisNomes = [
    item.nome_fantasia,
    item.razao_social,
    item.nome_cliente,
    item.nome,
    item.empresa,
    item.nome_contato,
    item.nome_razao_social
  ];

  const nomeValido = possiveisNomes.find(
    (n) => n && String(n).trim() !== '' && String(n).trim().toUpperCase() !== 'NULL'
  );

  return (nomeValido as string) || fallbackDefault;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [modalAtivo, setModalAtivo] = useState<{ tipo: string; id: string } | null>(null);
  const [clienteParaModal, setClienteParaModal] = useState<any>(null);

  const carregarNotificacoes = useCallback(async () => {
    if (!user) return;

    try {
      const dataBrasilia = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const [diaBr, mesBr, anoBr] = dataBrasilia.split('/');

      const hojeLocalStr = `${anoBr}-${mesBr}-${diaBr}`;
      const mesDiaHoje = `${mesBr}-${diaBr}`;

      const dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 30);
      const [diaFut, mesFut, anoFut] = dataFutura.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
      const dataLimiteRenovacaoStr = `${anoFut}-${mesFut}-${diaFut}`;

      const listaGeral: Notificacao[] = [];

      // 1. PERFIL DO USUÁRIO
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      const isAdmin = perfil?.tipo_usuario === 'CORRETORA';
      const corretoraDonaId = perfil?.corretora_id || user.id;

      // 2. PREPARAÇÃO DAS QUERIES OTIMIZADAS (Com colunas validadas na DDL)
      let queryInd = supabase
        .from('tab_indicacoes')
        .select(`id, nome_cliente, created_at, status_indicacao, corretor_id, tab_parceiros(nome_parceiro)`)
        .eq('status_indicacao', 'NOVO')
        .eq('corretora_id', corretoraDonaId);

      let queryClientes = supabase
        .from('tab_clientes')
        .select('id, nome_razao_social, nome_fantasia, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, fase_atendimento, dados_complementares_pf, corretor_id')
        .eq('corretora_id', corretoraDonaId);

      let queryRenovacoes = supabase
        .from('tab_proposta_itens')
        .select(`
          id, 
          data_renovacao, 
          horario_renovacao,
          notificacao_ativa,
          status_renovacao,
          corretor_id,
          opcao_id,
          tab_proposta_opcoes(
            tab_propostas(
              corretor_id,
              tab_clientes(id, nome_razao_social, nome_fantasia)
            )
          )
        `)
        .eq('notificacao_ativa', true)
        .eq('status_renovacao', 'A RENOVAR')
        .lte('data_renovacao', dataLimiteRenovacaoStr);

      let queryFrios = supabase
        .from('tab_clientes')
        .select('id, nome_razao_social, nome_fantasia, data_retorno, horario_retorno, corretor_id')
        .lte('data_retorno', hojeLocalStr)
        .neq('fase_atendimento', 'vendido')
        .eq('corretora_id', corretoraDonaId);

      let queryAgenda = supabase
        .from('tab_clientes')
        .select('id, nome_razao_social, nome_fantasia, data_retorno, horario_retorno, fase_atendimento, corretor_id')
        .not('data_retorno', 'is', null)
        .lte('data_retorno', hojeLocalStr)
        .eq('corretora_id', corretoraDonaId);

      // 3. EXECUÇÃO RESISTENTE A ERROS (Promise.allSettled)
      const resultados = await Promise.allSettled([
        queryInd,
        queryClientes,
        queryRenovacoes,
        queryFrios,
        queryAgenda
      ]);

      const rawIndicacoes = resultados[0].status === 'fulfilled' ? (resultados[0].value.data ?? []) : [];
      const rawClientes   = resultados[1].status === 'fulfilled' ? (resultados[1].value.data ?? []) : [];
      const rawRenovacoes = resultados[2].status === 'fulfilled' ? (resultados[2].value.data ?? []) : [];
      const rawFrios      = resultados[3].status === 'fulfilled' ? (resultados[3].value.data ?? []) : [];
      const rawAgenda     = resultados[4].status === 'fulfilled' ? (resultados[4].value.data ?? []) : [];

      let finalIndicacoes = rawIndicacoes;
      let finalClientes = rawClientes;
      let finalRenovacoes = rawRenovacoes;
      let finalFrios = rawFrios;
      let finalAgenda = rawAgenda;

      if (!isAdmin) {
        finalIndicacoes = rawIndicacoes.filter((i: any) => !i.corretor_id || i.corretor_id === user.id);
        finalClientes = rawClientes.filter((c: any) => !c.corretor_id || c.corretor_id === user.id);
        finalRenovacoes = rawRenovacoes.filter((r: any) => {
          const prop = Array.isArray(r.tab_proposta_opcoes) 
            ? r.tab_proposta_opcoes[0]?.tab_propostas 
            : r.tab_proposta_opcoes?.tab_propostas;
          return (!r.corretor_id || r.corretor_id === user.id) && (!prop?.corretor_id || prop.corretor_id === user.id);
        });
        finalFrios = rawFrios.filter((f: any) => !f.corretor_id || f.corretor_id === user.id);
        finalAgenda = rawAgenda.filter((a: any) => !a.corretor_id || a.corretor_id === user.id);
      }

      // 4. PROCESSAMENTO DOS RESULTADOS

      finalIndicacoes.forEach((ind: any) => {
        const parceiro = Array.isArray(ind.tab_parceiros) ? ind.tab_parceiros[0] : ind.tab_parceiros;
        const nomeCliente = obterNomeExibicao(ind, 'Indicação sem nome');

        listaGeral.push({
          id: `ind-${ind.id}`,
          tipo: 'INDICACAO',
          prioridade: 'ALTA',
          titulo: `INDICAÇÃO: ${nomeCliente}`,
          subtitulo: parceiro?.nome_parceiro || 'Link Direto',
          data: ind.created_at,
          atrasado: false,
          ref_id: ind.id
        });
      });

      finalClientes.forEach((c: any) => {
        const nomeExibicao = obterNomeExibicao(c, 'Cliente sem nome');

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

        // Lê a data de nascimento de dentro do JSONB dados_complementares_pf se existir
        const dataNascimentoPf = c.dados_complementares_pf?.data_nascimento;
        if (dataNascimentoPf) {
          const partes = dataNascimentoPf.split('-');
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

      finalRenovacoes.forEach((ren: any) => {
        const opcao = Array.isArray(ren.tab_proposta_opcoes) ? ren.tab_proposta_opcoes[0] : ren.tab_proposta_opcoes;
        const proposta = optionDeepSafe(opcao?.tab_propostas);
        const clienteObj = proposta?.tab_clientes;
        const cliente = Array.isArray(clienteObj) ? clienteObj[0] : clienteObj;

        const nomeCli = obterNomeExibicao(cliente, 'Cliente sem nome');

        const dataRenova = new Date(ren.data_renovacao + 'T00:00:00');
        const dataHoje = new Date(hojeLocalStr + 'T00:00:00');
        const diferencaTempo = dataRenova.getTime() - dataHoje.getTime();
        const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

        let avisoVencimento = `Vence em ${diasRestantes} dias!`;
        if (diasRestantes === 0) avisoVencimento = 'Vence HOJE!';
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

      finalFrios.forEach((lead: any) => {
        const nomeExibicao = obterNomeExibicao(lead, 'Prospect Frio');

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

      finalAgenda.forEach((item: any) => {
        const nomeExibicao = obterNomeExibicao(item, 'Cliente Agenda');

        listaGeral.push({
          id: `ag-${item.id}`,
          tipo: 'AGENDA',
          prioridade: 'NORMAL',
          titulo: `AGENDA: ${nomeExibicao}`,
          subtitulo: 'Retorno de agenda',
          data: item.data_retorno,
          horario: item.horario_retorno,
          atrasado: item.data_retorno < hojeLocalStr,
          ref_id: item.id
        });
      });

      setNotificacoes(listaGeral.sort((a, b) => (a.data || '').localeCompare(b.data || '')));
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
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
      setModalAtivo({ tipo: 'SINISTRO_GERAL', id: n.ref_id });
      return;
    }

    if (n.tipo === 'COMERCIAL' || n.tipo === 'ANIVERSARIO' || n.tipo === 'PROSPECCAO' || n.tipo === 'AGENDA') {
      const { data: cliente } = await supabase
        .from('tab_clientes')
        .select('*')
        .eq('id', n.ref_id)
        .single();

      if (cliente) {
        setClienteParaModal(cliente);
        setModalAtivo({ tipo: 'CONTATO_GERAL', id: n.ref_id });
      } else {
        console.error('Cliente não encontrado para a notificação.');
      }
      return;
    }
  };

  const markAsReadByIndicacao = async (indicacaoId: string) => {
    setNotificacoes((prev) => prev.filter((n) => n.ref_id !== indicacaoId));
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, carregarNotificacoes]);

  return (
    <NotificationContext.Provider
      value={{
        notificacoes,
        refresh: carregarNotificacoes,
        abrirNotificacao,
        markAsReadByIndicacao
      }}
    >
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
        <ModalAcoesComerciais
          isOpen={true}
          lead={clienteParaModal}
          onClose={() => {
            setModalAtivo(null);
            setClienteParaModal(null);
          }}
          onSave={async (dadosAcao) => {
            try {
              await salvarAcaoComercialV2(dadosAcao);
            } catch (error) {
              console.error('Erro ao salvar pelo service v2:', error);
            } finally {
              carregarNotificacoes();
              setModalAtivo(null);
              setClienteParaModal(null);
            }
          }}
        />
      )}

      {modalAtivo?.tipo === 'SINISTRO_GERAL' && (
        <ModalGerenciamentoSinistro
          clienteId={modalAtivo.id}
          onClose={() => setModalAtivo(null)}
          onSuccess={() => {
            carregarNotificacoes();
            setModalAtivo(null);
          }}
        />
      )}
    </NotificationContext.Provider>
  );
};

const optionDeepSafe = (val: any) => (Array.isArray(val) ? val[0] : val);

export const useNotifications = () => useContext(NotificationContext);