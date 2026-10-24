import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  MessageCircle,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Smartphone,
  Trash2,
  Unplug,
  UserRound,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ModalConexoes } from "../configuracao-corretora/ModalConexoes";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../auth/AuthContext";
import {
  useWhatsAppConnections,
  type WhatsAppConnection,
  type WhatsAppQrCode,
} from "../hooks/useWhatsAppConnections";


type ModalType =
  | "create"
  | "limit"
  | "qr"
  | "cancel"
  | "disconnect"
  | null;

function formatPhone(value: string | null) {
  if (!value) return "Número ainda não identificado";
  const phone = value.replace(/\D/g, "");
  if (phone.length === 13 && phone.startsWith("55")) {
    return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
  }
  if (phone.length === 12 && phone.startsWith("55")) {
    return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
  }
  return `+${phone}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(Number(value) || 0);
}

function getResponsible(connection: WhatsAppConnection) {
  if (Array.isArray(connection.responsavel)) return connection.responsavel[0] || null;
  return connection.responsavel || null;
}

function getFunctionLabel(value?: string | null) {
  const labels: Record<string, string> = {
    CORRETOR: "Corretor",
    ATENDIMENTO: "Atendimento",
    COMERCIAL: "Comercial",
    FINANCEIRO: "Financeiro",
    ADMINISTRATIVO: "Administrativo",
    OUTRO: "Outro",
  };

  return value ? labels[value] || value : "Membro da equipe";
}

function StatusBadge({ status }: { status: WhatsAppConnection["status"] }) {
  const config = {
    conectada: {
      label: "Conectado",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    conectando: {
      label: "Conectando",
      icon: Loader2,
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    aguardando_qr: {
      label: "Aguardando QR",
      icon: QrCode,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    desconectada: {
      label: "Desconectado",
      icon: WifiOff,
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
    erro: {
      label: "Erro",
      icon: AlertCircle,
      className: "bg-red-50 text-red-700 border-red-200",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      <Icon size={13} className={status === "conectando" ? "animate-spin" : ""} />
      {config.label}
    </span>
  );
}

export default function ConexoesWhatsApp() {
  const { userProfile } = useAuth();

  const {
    connections,
    commercialLimit,
    responsibles,
    operatorsByConnection,
    loading,
    loadingResponsibles,
    loadingOperators,
    creating,
    processingId,
    savingOperatorsId,
    createConnection,
    getQrCode,
    checkStatus,
    saveOperators,
    updateResponsible,
    disconnectConnection,
    cancelConnection,
  } = useWhatsAppConnections();

  const [modal, setModal] = useState<ModalType>(null);
  const [showModalConexoes, setShowModalConexoes] = useState(false);
  const [selected, setSelected] = useState<WhatsAppConnection | null>(null);
  const [name, setName] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [qr, setQr] = useState<WhatsAppQrCode | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const connectedCount = useMemo(
    () => connections.filter((item) => item.status === "conectada").length,
    [connections],
  );

  const openCreateModal = () => {
    setName("");
    setResponsibleId("");
    setSelected(null);
    setQr(null);

    if (commercialLimit?.atingido) {
      setModal("limit");
      return;
    }

    setModal("create");
  };

  const closeModal = () => {
    if (creating || loadingQr || processingId) return;
    setModal(null);
    setSelected(null);
    setQr(null);
    setResponsibleId("");
    };

  const handleCreate = async () => {
    if (commercialLimit?.atingido) {
      setModal("limit");
      return;
    }

    if (!name.trim()) {
      toast.error("Informe um nome para a conexão.");
      return;
    }

    let connection: WhatsAppConnection;

    try {
        connection = await createConnection({
        nome: name,
        responsavel_padrao_id: responsibleId || null,
        });

        setName("");
        setResponsibleId("");
        setSelected(connection);
        setQr(null);
        setModal("qr");
    } catch (error) {
        toast.error(
        error instanceof Error
            ? error.message
            : "Não foi possível criar a conexão.",
        );
        return;
    }

    setLoadingQr(true);

    try {
        const result = await getQrCode(connection.id);
        setQr(result);
        toast.success("Conexão criada. Escaneie o QR Code.");
    } catch (error) {
        toast.warning(
        error instanceof Error
            ? error.message
            : "Conexão criada, mas o QR Code ainda não está disponível.",
        );
    } finally {
        setLoadingQr(false);
    }
    };

  const handleQr = async (connection: WhatsAppConnection) => {
    setSelected(connection);
    setQr(null);
    setModal("qr");
    setLoadingQr(true);
    try {
      setQr(await getQrCode(connection.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível obter o QR Code.");
    } finally {
      setLoadingQr(false);
    }
  };

  const handleStatus = async (connection: WhatsAppConnection) => {
    try {
      const result = await checkStatus(connection.id);
      if (!result.existsRemote) {
        toast.warning("A sessão não existe mais na D-API.");
        return;
      }
      if (result.connection.status === "conectada") {
        toast.success("WhatsApp conectado.");
        if (modal === "qr") {
          setModal(null);
          setQr(null);
          setSelected(null);
        }
      } else {
        toast.info(`Status atual: ${result.connection.status.replace("_", " ")}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível verificar o status.");
    }
    };

  const handleResponsibleChange = async (
  connection: WhatsAppConnection,
  responsavelId: string,
  ) => {
  try {
      await updateResponsible(
      connection.id,
      responsavelId || null,
      );

      toast.success(
      responsavelId
          ? "Responsável padrão atualizado."
          : "Responsável padrão removido.",
      );
  } catch (error) {
      toast.error(
      error instanceof Error
          ? error.message
          : "Não foi possível alterar o responsável padrão.",
      );
  }
    };

    const handleOperatorToggle = async (
    connection: WhatsAppConnection,
    usuarioId: string,
    checked: boolean,
  ) => {
    const current = operatorsByConnection[connection.id] || [];

    const next = checked
      ? Array.from(new Set([...current, usuarioId]))
      : current.filter((id) => id !== usuarioId);

    try {
      await saveOperators(connection.id, next);

      toast.success(
        checked
          ? "Operador autorizado nesta conexão."
          : "Permissão de operação removida.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar os operadores da conexão.",
      );
    }
  };

  const handleDisconnect = async () => {
    if (!selected) return;
    try {
      await disconnectConnection(selected.id);
      toast.success("WhatsApp desconectado.");
      setModal(null);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desconectar.");
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    try {
      const result = await cancelConnection(selected.id);
      toast.success(
        result.historyPreserved
          ? "Conexão cancelada. O histórico foi preservado."
          : "Conexão cancelada.",
      );
      setModal(null);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar.");
    }
  };

  const handleSolicitarConexoes = async (
  novaQuantidade: number,
) => {
  const { data, error } = await supabase.rpc(
    "crm_solicitar_adicional_whatsapp",
    {
      p_qtd_conexoes_total: novaQuantidade,
    },
  );

  if (error) {
    if (
      error.message?.includes(
        "SOLICITACAO_PENDENTE_EXISTENTE",
      )
    ) {
      throw new Error(
        "Já existe uma solicitação de conexões aguardando ativação.",
      );
    }

    if (
      error.message?.includes(
        "ASSINATURA_PAGA_NAO_ENCONTRADA",
      )
    ) {
      throw new Error(
        "Não foi encontrada uma assinatura ativa para contratar conexões adicionais.",
      );
    }

    throw error;
  }

  if (!data?.sucesso) {
    throw new Error(
      "Não foi possível registrar a solicitação.",
    );
  }

  const profile = userProfile as any;

  const corretoraId =
    profile?.corretora_id ||
    profile?.id ||
    "N/A";

  const nomeCorretora =
    profile?.nome_corretora ||
    profile?.nome ||
    "N/A";

  const whatsapp = data.whatsapp;

  const mensagem = `*SOLICITAÇÃO DE CONEXÕES WHATSAPP - SEGUROCRM*
---------------------------------------

*Corretora:* ${nomeCorretora}
*ID da corretora:* ${corretoraId}
*ID da solicitação:* ${data.solicitacao_id}
*Status:* ${data.status}

*CONEXÕES WHATSAPP*
- Quantidade atual: *${whatsapp.qtd_conexoes_atual}*
- Nova quantidade solicitada: *${whatsapp.qtd_conexoes_nova}*
- Novas conexões: *+${whatsapp.qtd_conexoes_adicionadas}*

*VALORES*
- Valor unitário adicional: *${formatMoney(Number(whatsapp.valor_unitario_adicional))}*
- Adicional atual: *${formatMoney(Number(whatsapp.valor_whatsapp_atual))}/mês*
- Novo adicional: *${formatMoney(Number(whatsapp.valor_whatsapp_novo))}/mês*
- Acréscimo mensal: *${formatMoney(Number(whatsapp.acrescimo_mensal))}*

---------------------------------------
Olá! Gostaria de concluir a contratação das novas conexões WhatsApp do SeguroCRM.`;

  const whatsappUrl =
    `https://wa.me/5548996461645?text=${encodeURIComponent(
      mensagem,
    )}`;

  window.open(
    whatsappUrl,
    "_blank",
    "noopener,noreferrer",
  );

  toast.success(
    "Solicitação registrada e enviada para ativação.",
  );

  setShowModalConexoes(false);
};

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <MessageCircle size={23} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Conexões WhatsApp</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Gerencie os números de WhatsApp conectados à sua corretora.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
            <Plus size={18} />
            Nova conexão
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Conexões
            </div>

            <div className="mt-1 flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {commercialLimit?.utilizadas ?? connections.length}
              </span>

              {commercialLimit && (
                <span className="mb-0.5 text-sm font-medium text-slate-400">
                  de {commercialLimit.limite} utilizadas
                </span>
              )}
            </div>

            {commercialLimit && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    commercialLimit.atingido
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      commercialLimit.limite > 0
                        ? (commercialLimit.utilizadas /
                            commercialLimit.limite) *
                            100
                        : 100,
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conectadas</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{connectedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Desconectadas</div>
            <div className="mt-1 text-2xl font-bold text-slate-700">{connections.length - connectedCount}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Carregando conexões...
            </div>
          </div>
        ) : connections.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Smartphone size={27} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Nenhuma conexão WhatsApp</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Adicione um número para começar a receber e enviar mensagens pelo SeguroCRM.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={17} />
              Adicionar conexão
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {connections.map((connection) => {
              const responsible = getResponsible(connection);
              const processing = processingId === connection.id;

              return (
                <div key={connection.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <MessageCircle size={22} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-900">{connection.nome}</h2>
                        <p className="mt-0.5 text-sm text-slate-500">{formatPhone(connection.telefone)}</p>
                      </div>
                    </div>
                    <StatusBadge status={connection.status} />
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <UserRound size={14} />
                        Responsável padrão
                    </div>

                    <select
                        value={connection.responsavel_padrao_id || ""}
                        disabled={processing || loadingResponsibles}
                        onChange={(event) =>
                        void handleResponsibleChange(connection, event.target.value)
                        }
                        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="">Sem responsável</option>

                        {connection.responsavel_padrao_id &&
                        !responsibles.some(
                            (item) => item.id === connection.responsavel_padrao_id,
                        ) && (
                            <option value={connection.responsavel_padrao_id}>
                            {responsible?.nome || "Responsável atual"} — indisponível
                            </option>
                        )}

                        {responsibles.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.nome} — {getFunctionLabel(item.funcao_equipe)}
                        </option>
                        ))}
                    </select>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        Aplicado automaticamente somente às novas conversas recebidas por este número.
                    </p>
                    </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <UsersRound size={14} />
                        Quem pode operar esta conexão
                      </div>

                      {savingOperatorsId === connection.id && (
                        <Loader2
                          size={14}
                          className="animate-spin text-emerald-600"
                        />
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      A corretora sempre possui acesso. Selecione os membros
                      que poderão visualizar e operar este número.
                    </p>

                    {loadingOperators || loadingResponsibles ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 size={14} className="animate-spin" />
                        Carregando equipe...
                      </div>
                    ) : responsibles.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-400">
                        Nenhum membro ativo disponível.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {responsibles.map((member) => {
                          const selectedOperators =
                            operatorsByConnection[connection.id] || [];

                          const checked =
                            selectedOperators.includes(member.id);

                          const isDefaultResponsible =
                            connection.responsavel_padrao_id ===
                            member.id;

                          const saving =
                            savingOperatorsId === connection.id;

                          return (
                            <label
                              key={member.id}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition hover:bg-slate-50 ${
                                checked
                                  ? "border-emerald-200 bg-emerald-50/60"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-700">
                                  {member.nome}
                                </div>

                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                                  <span>
                                    {getFunctionLabel(
                                      member.funcao_equipe,
                                    )}
                                  </span>

                                  {isDefaultResponsible && (
                                    <>
                                      <span>·</span>
                                      <span className="font-medium text-emerald-600">
                                        Responsável padrão
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={saving}
                                onChange={(event) =>
                                  void handleOperatorToggle(
                                    connection,
                                    member.id,
                                    event.target.checked,
                                  )
                                }
                                className="h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <p className="mt-3 text-[11px] leading-5 text-slate-400">
                      Ao remover a permissão do responsável padrão, ele também deixará
                      automaticamente de ser o responsável padrão desta conexão.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(connection.status === "aguardando_qr" ||
                      connection.status === "desconectada" ||
                      connection.status === "erro" ||
                      connection.status === "conectando") && (
                      <button
                        onClick={() => void handleQr(connection)}
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <QrCode size={15} />
                        QR Code
                      </button>
                    )}

                    <button
                      onClick={() => void handleStatus(connection)}
                      disabled={processing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {processing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      Verificar status
                    </button>

                    {connection.status === "conectada" && (
                      <button
                        onClick={() => {
                          setSelected(connection);
                          setModal("disconnect");
                        }}
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Unplug size={15} />
                        Desconectar
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelected(connection);
                        setModal("cancel");
                      }}
                      disabled={processing}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

        {modal === "limit" && commercialLimit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <CircleDollarSign size={22} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Limite de conexões atingido
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Todas as conexões WhatsApp disponíveis na sua assinatura
                        estão atualmente em uso.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-600">
                      Conexões utilizadas
                    </span>

                    <span className="text-lg font-bold text-slate-900">
                      {commercialLimit.utilizadas} de {commercialLimit.limite}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full w-full rounded-full bg-amber-500" />
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Precisa conectar outro número?
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Adicione novas conexões à sua assinatura para utilizar outros
                    números de WhatsApp no SeguroCRM.
                  </p>
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <MessageCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Sua conexão atual continua funcionando normalmente.
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        A contratação adicional apenas aumenta a quantidade de
                        números que sua corretora pode manter ativos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Agora não
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setShowModalConexoes(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus size={17} />
                  Adicionar conexão
                </button>
              </div>
            </div>
          </div>
        )}

        {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Nova conexão WhatsApp</h2>
                <p className="mt-0.5 text-xs text-slate-500">Crie uma nova conexão para sua corretora.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome da conexão</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: WhatsApp Comercial"
                autoFocus
                className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !creating) void handleCreate();
                }}
              />
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Responsável padrão
                </label>

                <select
                    value={responsibleId}
                    onChange={(event) => setResponsibleId(event.target.value)}
                    disabled={creating || loadingResponsibles}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-60"
                >
                    <option value="">
                    {loadingResponsibles
                        ? "Carregando equipe..."
                        : "Sem responsável"}
                    </option>

                    {responsibles.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.nome} — {getFunctionLabel(item.funcao_equipe)}
                    </option>
                    ))}
                </select>

                <p className="mt-1.5 text-xs text-slate-500">
                    Opcional. Novas conversas deste número serão atribuídas automaticamente a este membro.
                </p>
                </div>
              <p className="mt-2 text-xs text-slate-500">
                Depois da criação, você conectará o número escaneando um QR Code.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={closeModal}
                disabled={creating}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !name.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? <Loader2 size={17} className="animate-spin" /> : <Power size={17} />}
                Criar conexão
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "qr" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Conectar WhatsApp</h2>
                <p className="mt-0.5 text-xs text-slate-500">{selected.nome}</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex min-h-96 flex-col items-center justify-center p-6 text-center">
              {loadingQr ? (
                <>
                  <Loader2 size={32} className="animate-spin text-emerald-600" />
                  <p className="mt-3 text-sm text-slate-500">Gerando QR Code...</p>
                </>
              ) : qr?.qrCodeImage ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <img src={qr.qrCodeImage} alt="QR Code WhatsApp" className="h-64 w-64" />
                  </div>
                  <h3 className="mt-5 font-semibold text-slate-900">Escaneie pelo WhatsApp</h3>
                  <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                    No WhatsApp, acesse Aparelhos conectados, escolha Conectar um aparelho e escaneie este código.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => void handleQr(selected)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw size={16} />
                      Atualizar QR
                    </button>
                    <button
                      onClick={() => void handleStatus(selected)}
                      disabled={processingId === selected.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {processingId === selected.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Já conectei
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={34} className="text-amber-500" />
                  <p className="mt-3 text-sm text-slate-600">O QR Code não foi retornado.</p>
                  <button
                    onClick={() => void handleQr(selected)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw size={16} />
                    Tentar novamente
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modal === "disconnect" && selected && (
        <ConfirmModal
          title="Desconectar WhatsApp?"
          description={`O número ${formatPhone(selected.telefone)} será desconectado da D-API. A conexão continuará cadastrada no SeguroCRM.`}
          confirmLabel="Desconectar"
          loading={processingId === selected.id}
          onCancel={closeModal}
          onConfirm={() => void handleDisconnect()}
        />
      )}

      {modal === "cancel" && selected && (
        <ConfirmModal
          danger
          title="Cancelar conexão?"
          description="A sessão será removida da D-API e deixará de receber novas mensagens. Todo o histórico de conversas, mensagens e arquivos continuará preservado no SeguroCRM."
          confirmLabel="Cancelar conexão"
          loading={processingId === selected.id}
          onCancel={closeModal}
          onConfirm={() => void handleCancel()}
        />
      )}

      <ModalConexoes
        isOpen={showModalConexoes}
        onClose={() => setShowModalConexoes(false)}
        quantidadeAtual={commercialLimit?.limite ?? 1}
        onSolicitar={handleSolicitarConexoes}
      />
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-5">
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
            danger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          }`}>
            {danger ? <Trash2 size={21} /> : <Unplug size={21} />}
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-800 hover:bg-slate-900"
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
      
    </div>
  );
}