import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  buscarMembrosAtivosDaCorretora,
  type MembroEquipeAtivo,
} from "../services/equipeService";
import {
  atualizarOperadoresDaInstancia,
  buscarVinculosOperadores,
  garantirOperadorDaInstancia,
} from "../services/instanciaUsuariosService";

export type WhatsAppConnectionStatus =
  | "conectada"
  | "desconectada"
  | "conectando"
  | "erro"
  | "aguardando_qr";

export interface WhatsAppConnectionResponsible {
  id: string;
  nome: string;
  email: string;
  funcao_equipe?: string | null;
  ativo: boolean;
}

export interface WhatsAppConnection {
  id: string;
  corretora_id: string;
  nome: string;
  telefone: string | null;
  provider: "dapi";
  provider_instance_id: string | null;
  status: WhatsAppConnectionStatus;
  ativo: boolean;
  padrao_envio: boolean;
  responsavel_padrao_id: string | null;
  created_at: string;
  updated_at: string;
  responsavel?:
    | WhatsAppConnectionResponsible
    | WhatsAppConnectionResponsible[]
    | null;
}

export interface CreateWhatsAppConnectionInput {
  nome: string;
  responsavel_padrao_id?: string | null;
}

export interface WhatsAppQrCode {
  instancia_id: string;
  status: WhatsAppConnectionStatus;
  qrCode: string | null;
  qrCodeImage: string | null;
  qrCodeUpdatedAt: string | null;
}

interface DapiResponse<T = unknown> {
  success: boolean;
  error?: string;
  instancia?: WhatsAppConnection;
  instancias?: WhatsAppConnection[];
  instancia_id?: string;
  status?: WhatsAppConnectionStatus;
  qrCode?: string | null;
  qrCodeImage?: string | null;
  qrCodeUpdatedAt?: string | null;
  existsRemote?: boolean;
  cancelled?: boolean;
  historyPreserved?: boolean;
  provider?: unknown;
  data?: T;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useWhatsAppConnections() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [responsibles, setResponsibles] = useState<MembroEquipeAtivo[]>([]);
  const [operatorsByConnection, setOperatorsByConnection] = useState<
    Record<string, string[]>
  >({});
  const [loadingResponsibles, setLoadingResponsibles] = useState(true);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [savingOperatorsId, setSavingOperatorsId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(
    async <T = unknown>(
      body: Record<string, unknown>,
    ): Promise<DapiResponse<T>> => {
      const { data, error: invokeError } =
        await supabase.functions.invoke("dapi-sessions", { body });

      if (invokeError) {
        throw new Error(
          invokeError.message ||
            "Erro ao comunicar com o serviço de conexões.",
        );
      }

      const response = data as DapiResponse<T> | null;

      if (!response?.success) {
        throw new Error(
          response?.error || "A operação não pôde ser concluída.",
        );
      }

      return response;
    },
    [],
  );

  const replaceConnection = useCallback(
    (connection: WhatsAppConnection) => {
      setConnections((current) =>
        current.map((item) =>
          item.id === connection.id
            ? { ...item, ...connection }
            : item,
        ),
      );
    },
    [],
  );

  const listConnections = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      setError(null);

      try {
        const response = await invoke({ action: "LISTAR" });

        const items = Array.isArray(response.instancias)
          ? response.instancias
          : [];

        setConnections(items);

        return items;
      } catch (err) {
        const message = getErrorMessage(
          err,
          "Não foi possível carregar as conexões.",
        );

        setError(message);

        throw err;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [invoke],
  );

  const listResponsibles = useCallback(async () => {
    setLoadingResponsibles(true);

    try {
      const items = await buscarMembrosAtivosDaCorretora();

      setResponsibles(items);

      return items;
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Não foi possível carregar os responsáveis.",
        ),
      );

      throw err;
    } finally {
      setLoadingResponsibles(false);
    }
  }, []);

  const listOperators = useCallback(async () => {
    setLoadingOperators(true);

    try {
      const vinculos = await buscarVinculosOperadores();

      const grouped = vinculos.reduce<Record<string, string[]>>(
        (acc, vinculo) => {
          if (!acc[vinculo.instancia_id]) {
            acc[vinculo.instancia_id] = [];
          }

          acc[vinculo.instancia_id].push(vinculo.usuario_id);

          return acc;
        },
        {},
      );

      setOperatorsByConnection(grouped);

      return grouped;
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Não foi possível carregar os operadores das conexões.",
        ),
      );

      throw err;
    } finally {
      setLoadingOperators(false);
    }
  }, []);

  const createConnection = useCallback(
    async (input: CreateWhatsAppConnectionInput) => {
      const nome = input.nome.trim();

      if (!nome) {
        throw new Error("Informe um nome para a conexão.");
      }

      setCreating(true);
      setError(null);

      try {
        const response = await invoke({
          action: "CRIAR",
          nome,
          responsavel_padrao_id:
            input.responsavel_padrao_id || null,
        });

        if (!response.instancia) {
          throw new Error(
            "A conexão foi criada, mas a instância não foi retornada.",
          );
        }

        if (input.responsavel_padrao_id) {
          await garantirOperadorDaInstancia(
            response.instancia.id,
            input.responsavel_padrao_id,
          );

          setOperatorsByConnection((current) => ({
            ...current,
            [response.instancia!.id]: Array.from(
              new Set([
                ...(current[response.instancia!.id] || []),
                input.responsavel_padrao_id!,
              ]),
            ),
          }));
        }

        setConnections((current) => [
          response.instancia!,
          ...current.filter(
            (item) => item.id !== response.instancia!.id,
          ),
        ]);

        return response.instancia;
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível criar a conexão.",
          ),
        );

        throw err;
      } finally {
        setCreating(false);
      }
    },
    [invoke],
  );

  const getQrCode = useCallback(
    async (
      instanciaId: string,
    ): Promise<WhatsAppQrCode> => {
      setProcessingId(instanciaId);
      setError(null);

      try {
        const maxTentativas = 4;
        const intervaloMs = 1500;

        for (
          let tentativa = 1;
          tentativa <= maxTentativas;
          tentativa++
        ) {
          const response = await invoke({
            action: "QR_CODE",
            instancia_id: instanciaId,
          });

          if (!response.instancia_id) {
            throw new Error(
              "A D-API não retornou a identificação da instância.",
            );
          }

          if (response.status) {
            setConnections((current) =>
              current.map((item) =>
                item.id === instanciaId
                  ? {
                      ...item,
                      status: response.status!,
                    }
                  : item,
              ),
            );
          }

          if (response.qrCodeImage || response.qrCode) {
            return {
              instancia_id: response.instancia_id,
              status: response.status || "aguardando_qr",
              qrCode: response.qrCode ?? null,
              qrCodeImage: response.qrCodeImage ?? null,
              qrCodeUpdatedAt:
                response.qrCodeUpdatedAt ?? null,
            };
          }

          if (response.status === "conectada") {
            throw new Error(
              "Este WhatsApp já está conectado.",
            );
          }

          if (tentativa < maxTentativas) {
            await sleep(intervaloMs);
          }
        }

        throw new Error(
          "O QR Code ainda não está disponível. Tente novamente em alguns segundos.",
        );
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível obter o QR Code.",
          ),
        );

        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [invoke],
  );

  const checkStatus = useCallback(
    async (instanciaId: string) => {
      setProcessingId(instanciaId);
      setError(null);

      try {
        const response = await invoke({
          action: "STATUS",
          instancia_id: instanciaId,
        });

        if (!response.instancia) {
          throw new Error(
            "A situação da conexão não foi retornada.",
          );
        }

        replaceConnection(response.instancia);

        return {
          connection: response.instancia,
          existsRemote: response.existsRemote !== false,
        };
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível verificar o status.",
          ),
        );

        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [invoke, replaceConnection],
  );

  const saveOperators = useCallback(
    async (
      instanciaId: string,
      usuarioIds: string[],
    ) => {
      setSavingOperatorsId(instanciaId);
      setError(null);

      try {
        const connection = connections.find(
          (item) => item.id === instanciaId,
        );

        const responsavelAtual =
          connection?.responsavel_padrao_id || null;

        const idsFinais = Array.from(
          new Set(usuarioIds.filter(Boolean)),
        );

        const removendoResponsavelPadrao =
          responsavelAtual &&
          !idsFinais.includes(responsavelAtual);

        if (removendoResponsavelPadrao) {
          const response = await invoke({
            action: "ATUALIZAR_RESPONSAVEL",
            instancia_id: instanciaId,
            responsavel_padrao_id: null,
          });

          if (!response.instancia) {
            throw new Error(
              "Não foi possível remover o responsável padrão da conexão.",
            );
          }

          replaceConnection(response.instancia);
        }

        const saved =
          await atualizarOperadoresDaInstancia(
            instanciaId,
            idsFinais,
          );

        setOperatorsByConnection((current) => ({
          ...current,
          [instanciaId]: saved,
        }));

        return saved;
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível alterar os operadores da conexão.",
          ),
        );

        throw err;
      } finally {
        setSavingOperatorsId(null);
      }
    },
    [
      connections,
      invoke,
      replaceConnection,
    ],
  );

  const updateResponsible = useCallback(
    async (
      instanciaId: string,
      responsavelId: string | null,
    ) => {
      setProcessingId(instanciaId);
      setError(null);

      try {
        if (responsavelId) {
          await garantirOperadorDaInstancia(
            instanciaId,
            responsavelId,
          );

          setOperatorsByConnection((current) => ({
            ...current,
            [instanciaId]: Array.from(
              new Set([
                ...(current[instanciaId] || []),
                responsavelId,
              ]),
            ),
          }));
        }

        const response = await invoke({
          action: "ATUALIZAR_RESPONSAVEL",
          instancia_id: instanciaId,
          responsavel_padrao_id: responsavelId,
        });

        if (!response.instancia) {
          throw new Error(
            "A conexão atualizada não foi retornada.",
          );
        }

        await listConnections(true);

        return response.instancia;
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível alterar o responsável padrão.",
          ),
        );

        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [invoke, listConnections],
  );

  const disconnectConnection = useCallback(
    async (instanciaId: string) => {
      setProcessingId(instanciaId);
      setError(null);

      try {
        const response = await invoke({
          action: "DESCONECTAR",
          instancia_id: instanciaId,
        });

        if (!response.instancia) {
          throw new Error(
            "A conexão atualizada não foi retornada.",
          );
        }

        replaceConnection(response.instancia);

        return response.instancia;
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível desconectar o WhatsApp.",
          ),
        );

        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [invoke, replaceConnection],
  );

  const cancelConnection = useCallback(
    async (instanciaId: string) => {
      setProcessingId(instanciaId);
      setError(null);

      try {
        const response = await invoke({
          action: "CANCELAR",
          instancia_id: instanciaId,
        });

        setConnections((current) =>
          current.filter(
            (item) => item.id !== instanciaId,
          ),
        );

        setOperatorsByConnection((current) => {
          const next = { ...current };

          delete next[instanciaId];

          return next;
        });

        return {
          cancelled: response.cancelled === true,
          historyPreserved:
            response.historyPreserved === true,
        };
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Não foi possível cancelar a conexão.",
          ),
        );

        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [invoke],
  );

  const clearError = useCallback(
    () => setError(null),
    [],
  );

  useEffect(() => {
    void listConnections().catch(() => undefined);
    void listResponsibles().catch(() => undefined);
    void listOperators().catch(() => undefined);
  }, [
    listConnections,
    listResponsibles,
    listOperators,
  ]);

  return {
    connections,
    responsibles,
    operatorsByConnection,
    loading,
    loadingResponsibles,
    loadingOperators,
    creating,
    processingId,
    savingOperatorsId,
    error,
    listConnections,
    listResponsibles,
    listOperators,
    createConnection,
    getQrCode,
    checkStatus,
    saveOperators,
    updateResponsible,
    disconnectConnection,
    cancelConnection,
    clearError,
  };
}