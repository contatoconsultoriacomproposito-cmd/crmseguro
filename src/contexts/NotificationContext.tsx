import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

import { ModalGerenciamentoRenovacao } from './ModalGerenciamentoRenovacao';
import { ModalAcoesComerciais } from '../pages/clientes/ModalAcoesComerciais';
import { ModalGerenciamentoSinistro } from './ModalGerenciamentoSinistro';
import { salvarAcaoComercialV2 } from '../pages/clientes/clienteServiceV2';

export interface Notificacao {
  id: string;
  tipo:
    | 'COMERCIAL'
    | 'SINISTRO'
    | 'INDICACAO'
    | 'RENOVACAO'
    | 'ANIVERSARIO';
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

const NotificationContext = createContext<NotificationContextData>(
  {} as NotificationContextData
);

const obterNomeExibicao = (
  item: any,
  fallbackDefault = 'Cliente sem nome'
): string => {
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
    (nome) =>
      nome &&
      String(nome).trim() !== '' &&
      String(nome).trim().toUpperCase() !== 'NULL'
  );

  return (nomeValido as string) || fallbackDefault;
};

const optionDeepSafe = (val: any) =>
  Array.isArray(val) ? val[0] : val;

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [modalAtivo, setModalAtivo] = useState<{
    tipo: string;
    id: string;
  } | null>(null);

  const [clienteParaModal, setClienteParaModal] = useState<any>(null);

  const carregarNotificacoes = useCallback(async () => {
    if (!user) {
      setNotificacoes([]);
      return;
    }

    try {
      const dataBrasilia = new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      });

      const [diaBr, mesBr, anoBr] = dataBrasilia.split('/');

      const hojeLocalStr = `${anoBr}-${mesBr}-${diaBr}`;
      const mesDiaHoje = `${mesBr}-${diaBr}`;

      const dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 30);

      const [diaFut, mesFut, anoFut] =
        dataFutura
          .toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
          })
          .split('/');

      const dataLimiteRenovacaoStr =
        `${anoFut}-${mesFut}-${diaFut}`;

      const listaGeral: Notificacao[] = [];

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      const isAdmin = perfil?.tipo_usuario === 'CORRETORA';
      const corretoraDonaId = perfil?.corretora_id || user.id;

      const queryInd = supabase
        .from('tab_indicacoes')
        .select(`
          id,
          nome_cliente,
          created_at,
          status_indicacao,
          corretor_id,
          tab_parceiros(nome_parceiro)
        `)
        .eq('status_indicacao', 'NOVO')
        .eq('corretora_id', corretoraDonaId);

      const queryClientes = supabase
        .from('tab_clientes')
        .select(`
          id,
          nome_razao_social,
          nome_fantasia,
          data_retorno,
          horario_retorno,
          data_retorno_sinistro,
          horario_retorno_sinistro,
          fase_atendimento,
          dados_complementares_pf,
          corretor_id
        `)
        .eq('corretora_id', corretoraDonaId)
        .or(
          `data_retorno.lte.${hojeLocalStr},data_retorno_sinistro.lte.${hojeLocalStr}`
        );

      const queryRenovacoes = supabase
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
              tab_clientes(
                id,
                nome_razao_social,
                nome_fantasia
              )
            )
          )
        `)
        .eq('notificacao_ativa', true)
        .eq('status_renovacao', 'A RENOVAR')
        .lte('data_renovacao', dataLimiteRenovacaoStr);

      const resultados = await Promise.allSettled([
        queryInd,
        queryClientes,
        queryRenovacoes
      ]);

      const rawIndicacoes =
        resultados[0].status === 'fulfilled'
          ? resultados[0].value.data ?? []
          : [];

      const rawClientes =
        resultados[1].status === 'fulfilled'
          ? resultados[1].value.data ?? []
          : [];

      const rawRenovacoes =
        resultados[2].status === 'fulfilled'
          ? resultados[2].value.data ?? []
          : [];

      let finalIndicacoes = rawIndicacoes;
      let finalClientes = rawClientes;
      let finalRenovacoes = rawRenovacoes;

      if (!isAdmin) {
        finalIndicacoes = rawIndicacoes.filter(
          (indicacao: any) =>
            !indicacao.corretor_id ||
            indicacao.corretor_id === user.id
        );

        finalClientes = rawClientes.filter(
          (cliente: any) =>
            !cliente.corretor_id ||
            cliente.corretor_id === user.id
        );

        finalRenovacoes = rawRenovacoes.filter(
          (renovacao: any) => {
            const opcao = Array.isArray(
              renovacao.tab_proposta_opcoes
            )
              ? renovacao.tab_proposta_opcoes[0]
              : renovacao.tab_proposta_opcoes;

            const proposta = optionDeepSafe(
              opcao?.tab_propostas
            );

            return (
              (!renovacao.corretor_id ||
                renovacao.corretor_id === user.id) &&
              (!proposta?.corretor_id ||
                proposta.corretor_id === user.id)
            );
          }
        );
      }

      finalIndicacoes.forEach((indicacao: any) => {
        const parceiro = Array.isArray(
          indicacao.tab_parceiros
        )
          ? indicacao.tab_parceiros[0]
          : indicacao.tab_parceiros;

        const nomeCliente = obterNomeExibicao(
          indicacao,
          'Indicação sem nome'
        );

        listaGeral.push({
          id: `ind-${indicacao.id}`,
          tipo: 'INDICACAO',
          prioridade: 'ALTA',
          titulo: `INDICAÇÃO: ${nomeCliente}`,
          subtitulo:
            parceiro?.nome_parceiro || 'Link Direto',
          data: indicacao.created_at,
          atrasado: false,
          ref_id: indicacao.id
        });
      });

      finalClientes.forEach((cliente: any) => {
        const nomeExibicao = obterNomeExibicao(
          cliente,
          'Cliente sem nome'
        );

        if (
          cliente.data_retorno &&
          cliente.data_retorno <= hojeLocalStr
        ) {
          listaGeral.push({
            id: `com-${cliente.id}`,
            tipo: 'COMERCIAL',
            prioridade: 'NORMAL',
            titulo: `RETORNO COMERCIAL: ${nomeExibicao}`,
            data: cliente.data_retorno,
            horario: cliente.horario_retorno,
            atrasado:
              cliente.data_retorno < hojeLocalStr,
            ref_id: cliente.id
          });
        }

        if (
          cliente.data_retorno_sinistro &&
          cliente.data_retorno_sinistro <= hojeLocalStr
        ) {
          listaGeral.push({
            id: `sin-${cliente.id}`,
            tipo: 'SINISTRO',
            prioridade: 'ALTA',
            titulo: `SINISTRO (RETORNO): ${nomeExibicao}`,
            data: cliente.data_retorno_sinistro,
            horario: cliente.horario_retorno_sinistro,
            atrasado:
              cliente.data_retorno_sinistro < hojeLocalStr,
            ref_id: cliente.id
          });
        }

        const dataNascimentoPf =
          cliente.dados_complementares_pf?.data_nascimento;

        if (dataNascimentoPf) {
          const partes = dataNascimentoPf.split('-');

          if (
            partes.length === 3 &&
            `${partes[1]}-${partes[2]}` === mesDiaHoje
          ) {
            listaGeral.push({
              id: `aniv-${cliente.id}`,
              tipo: 'ANIVERSARIO',
              prioridade: 'NORMAL',
              titulo: `🎈 ANIVERSÁRIO HOJE: ${nomeExibicao}`,
              subtitulo: 'Parabenize seu cliente!',
              data: hojeLocalStr,
              atrasado: false,
              ref_id: cliente.id
            });
          }
        }
      });

      finalRenovacoes.forEach((renovacao: any) => {
        const opcao = Array.isArray(
          renovacao.tab_proposta_opcoes
        )
          ? renovacao.tab_proposta_opcoes[0]
          : renovacao.tab_proposta_opcoes;

        const proposta = optionDeepSafe(
          opcao?.tab_propostas
        );

        const clienteObj = proposta?.tab_clientes;

        const cliente = Array.isArray(clienteObj)
          ? clienteObj[0]
          : clienteObj;

        const nomeCli = obterNomeExibicao(
          cliente,
          'Cliente sem nome'
        );

        const dataRenova = new Date(
          renovacao.data_renovacao + 'T00:00:00'
        );

        const dataHoje = new Date(
          hojeLocalStr + 'T00:00:00'
        );

        const diferencaTempo =
          dataRenova.getTime() - dataHoje.getTime();

        const diasRestantes = Math.ceil(
          diferencaTempo /
            (1000 * 60 * 60 * 24)
        );

        let avisoVencimento =
          `Vence em ${diasRestantes} dias!`;

        if (diasRestantes === 0) {
          avisoVencimento = 'Vence HOJE!';
        }

        if (diasRestantes < 0) {
          avisoVencimento =
            `Vencida há ${Math.abs(
              diasRestantes
            )} dias!`;
        }

        listaGeral.push({
          id: `ren-${renovacao.id}`,
          tipo: 'RENOVACAO',
          prioridade: 'CRITICA',
          titulo: `🚨 RENOVAÇÃO: ${nomeCli}`,
          subtitulo: avisoVencimento,
          data: renovacao.data_renovacao,
          horario: renovacao.horario_renovacao,
          atrasado:
            renovacao.data_renovacao < hojeLocalStr,
          ref_id: renovacao.id
        });
      });

      const notificacoesUnicas = Array.from(
        new Map(
          listaGeral.map((notificacao) => [
            notificacao.id,
            notificacao
          ])
        ).values()
      );

      setNotificacoes(
        notificacoesUnicas.sort((a, b) =>
          (a.data || '').localeCompare(
            b.data || ''
          )
        )
      );
    } catch (error) {
      console.error(
        'Erro ao carregar notificações:',
        error
      );
    }
  }, [user]);

  const abrirNotificacao = async (
    notificacao: Notificacao
  ) => {
    if (notificacao.tipo === 'INDICACAO') {
      window.location.href =
        `/parceiros/triagem?id=${notificacao.ref_id}`;
      return;
    }

    if (notificacao.tipo === 'RENOVACAO') {
      setModalAtivo({
        tipo: 'RENOVACAO',
        id: notificacao.ref_id
      });
      return;
    }

    if (notificacao.tipo === 'SINISTRO') {
      setModalAtivo({
        tipo: 'SINISTRO_GERAL',
        id: notificacao.ref_id
      });
      return;
    }

    if (
      notificacao.tipo === 'COMERCIAL' ||
      notificacao.tipo === 'ANIVERSARIO'
    ) {
      const { data: cliente } = await supabase
        .from('tab_clientes')
        .select('*')
        .eq('id', notificacao.ref_id)
        .single();

      if (cliente) {
        setClienteParaModal(cliente);

        setModalAtivo({
          tipo: 'CONTATO_GERAL',
          id: notificacao.ref_id
        });
      } else {
        console.error(
          'Cliente não encontrado para a notificação.'
        );
      }
    }
  };

  const markAsReadByIndicacao = async (
    indicacaoId: string
  ) => {
    setNotificacoes((prev) =>
      prev.filter(
        (notificacao) =>
          notificacao.ref_id !== indicacaoId
      )
    );
  };

  useEffect(() => {
    if (!user) {
      setNotificacoes([]);
      return;
    }

    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tab_clientes'
        },
        () => {
          carregarNotificacoes();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tab_indicacoes'
        },
        () => {
          carregarNotificacoes();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tab_proposta_itens'
        },
        () => {
          carregarNotificacoes();
        }
      )
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

      {modalAtivo?.tipo === 'CONTATO_GERAL' &&
        clienteParaModal && (
          <ModalAcoesComerciais
            isOpen={true}
            lead={clienteParaModal}
            onClose={() => {
              setModalAtivo(null);
              setClienteParaModal(null);
            }}
            onSave={async (dadosAcao) => {
              try {
                await salvarAcaoComercialV2(
                  dadosAcao
                );
              } catch (error) {
                console.error(
                  'Erro ao salvar pelo service v2:',
                  error
                );
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

export const useNotifications =
  () => useContext(NotificationContext);


