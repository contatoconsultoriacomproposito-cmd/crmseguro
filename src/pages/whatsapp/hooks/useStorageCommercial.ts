import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "../../../auth/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

import type {
  StoragePlanoSelecionado,
} from "../configuracao-corretora/ModalArmazenamento";

interface StorageAtual {
  limiteBytes: number;
  usadoBytes: number;
}

function formatarBytesStorage(
  bytes: number
): string {
  const valor = Number(bytes || 0);
  const gb = 1024 ** 3;
  const mb = 1024 ** 2;

  if (valor >= gb) {
    return `${(
      valor / gb
    ).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    })} GB`;
  }

  return `${(
    valor / mb
  ).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} MB`;
}

function formatarMoedaStorage(
  value: number
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(Number(value || 0));
}

export function useStorageCommercial() {
  const { userProfile } = useAuth();

  const [
    modalArmazenamentoAberto,
    setModalArmazenamentoAberto,
  ] = useState(false);

  const [
    storageAtual,
    setStorageAtual,
  ] = useState<StorageAtual>({
    limiteBytes: 0,
    usadoBytes: 0,
  });

  const [
    carregandoStorage,
    setCarregandoStorage,
  ] = useState(false);

  const corretoraId =
    useMemo(() => {
      if (!userProfile) {
        return null;
      }

      if (
        userProfile.tipo_usuario ===
        "CORRETORA"
      ) {
        return userProfile.id;
      }

      return (
        userProfile.corretora_id ??
        null
      );
    }, [userProfile]);

  const carregarStorageAtual =
    useCallback(async () => {
      if (
        !corretoraId ||
        carregandoStorage
      ) {
        return null;
      }

      try {
        setCarregandoStorage(true);

        const [
          configResponse,
          resumoResponse,
        ] = await Promise.all([
          supabase
            .from(
              "crm_storage_config"
            )
            .select(
              "limite_bytes"
            )
            .eq(
              "corretora_id",
              corretoraId
            )
            .maybeSingle(),

          supabase
            .from(
              "crm_storage_resumo"
            )
            .select(
              "usado_bytes"
            )
            .eq(
              "corretora_id",
              corretoraId
            )
            .maybeSingle(),
        ]);

        if (
          configResponse.error
        ) {
          throw configResponse.error;
        }

        if (
          resumoResponse.error
        ) {
          throw resumoResponse.error;
        }

        const storage: StorageAtual = {
          limiteBytes: Number(
            configResponse.data
              ?.limite_bytes ??
              0
          ),

          usadoBytes: Number(
            resumoResponse.data
              ?.usado_bytes ??
              0
          ),
        };

        setStorageAtual(storage);

        return storage;
      } catch (error) {
        console.error(
          "Erro ao carregar armazenamento:",
          error
        );

        toast.error(
          "Não foi possível consultar o armazenamento atual."
        );

        return null;
      } finally {
        setCarregandoStorage(
          false
        );
      }
    }, [
      corretoraId,
      carregandoStorage,
    ]);

  const abrirModalArmazenamento =
    useCallback(async () => {
      await carregarStorageAtual();

      setModalArmazenamentoAberto(
        true
      );
    }, [
      carregarStorageAtual,
    ]);

  const fecharModalArmazenamento =
    useCallback(() => {
      setModalArmazenamentoAberto(
        false
      );
    }, []);

  const solicitarArmazenamento =
    useCallback(
      async (
        plano: StoragePlanoSelecionado
      ) => {
        if (!userProfile) {
          toast.error(
            "Perfil do usuário não encontrado."
          );
          return;
        }

        if (
          userProfile.tipo_usuario !==
          "CORRETORA"
        ) {
          toast.info(
            "Somente a corretora pode contratar armazenamento adicional."
          );
          return;
        }

        if (!corretoraId) {
          toast.error(
            "Corretora não identificada."
          );
          return;
        }

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "crm_solicitar_adicional_storage",
            {
              p_storage_plano_id:
                plano.planoId,
            }
          );

          if (error) {
            if (
              error.message?.includes(
                "SOLICITACAO_PENDENTE_EXISTENTE"
              )
            ) {
              toast.info(
                "Já existe uma solicitação de armazenamento aguardando ativação."
              );

              setModalArmazenamentoAberto(
                false
              );

              return;
            }

            if (
              error.message?.includes(
                "ASSINATURA_PAGA_NAO_ENCONTRADA"
              )
            ) {
              toast.info(
                "É necessário possuir uma assinatura paga ativa para contratar armazenamento adicional."
              );

              return;
            }

            throw error;
          }

          if (!data?.sucesso) {
            throw new Error(
              "Não foi possível registrar a solicitação de armazenamento."
            );
          }

          const storage =
            data.storage;

          if (!storage) {
            throw new Error(
              "A solicitação foi criada, mas os dados comerciais do armazenamento não foram retornados."
            );
          }

          const nomeCorretora =
            userProfile.nome ||
            "N/A";

          const mensagem =
`*SOLICITAÇÃO DE ARMAZENAMENTO ADICIONAL - SEGUROCRM*
---------------------------------------

*Corretora:* ${nomeCorretora}
*ID da corretora:* ${corretoraId}
*ID da solicitação:* ${data.solicitacao_id}
*Status:* ${data.status}

*ARMAZENAMENTO*
- Plano solicitado: *${storage.nome}*
- Adicional solicitado: *${formatarBytesStorage(
  Number(
    storage.adicional_solicitado_bytes
  )
)}*
- Limite atual: *${formatarBytesStorage(
  Number(
    storage.storage_total_atual_bytes
  )
)}*
- Novo limite: *${formatarBytesStorage(
  Number(
    storage.storage_total_novo_bytes
  )
)}*

*VALORES*
- Adicional mensal: *${formatarMoedaStorage(
  Number(
    storage.valor_adicional_mensal
  )
)}*
- Valor atual de armazenamento: *${formatarMoedaStorage(
  Number(
    storage.valor_storage_atual
  )
)}/mês*
- Novo valor de armazenamento: *${formatarMoedaStorage(
  Number(
    storage.valor_storage_novo
  )
)}/mês*

---------------------------------------
Olá! Gostaria de concluir a contratação de armazenamento adicional do SeguroCRM.`;

          const whatsappUrl =
            `https://wa.me/5548996461645?text=${encodeURIComponent(
              mensagem
            )}`;

          window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
          );

          toast.success(
            "Solicitação registrada e enviada para ativação."
          );

          setModalArmazenamentoAberto(
            false
          );
        } catch (error) {
          console.error(
            "Erro ao solicitar armazenamento adicional:",
            error
          );

          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível solicitar armazenamento adicional."
          );
        }
      },
      [
        userProfile,
        corretoraId,
      ]
    );

  const modalProps =
    useMemo(
      () => ({
        isOpen:
          modalArmazenamentoAberto,

        onClose:
          fecharModalArmazenamento,

        limiteAtualBytes:
          storageAtual.limiteBytes,

        usadoBytes:
          storageAtual.usadoBytes,

        motivo:
          "LIMITE_ATINGIDO" as const,

        onSolicitar:
          solicitarArmazenamento,
      }),
      [
        modalArmazenamentoAberto,
        fecharModalArmazenamento,
        storageAtual,
        solicitarArmazenamento,
      ]
    );

  return {
    corretoraId,

    storageAtual,

    carregandoStorage,

    modalArmazenamentoAberto,

    carregarStorageAtual,

    abrirModalArmazenamento,

    fecharModalArmazenamento,

    solicitarArmazenamento,

    modalProps,
  };
}

export default useStorageCommercial;