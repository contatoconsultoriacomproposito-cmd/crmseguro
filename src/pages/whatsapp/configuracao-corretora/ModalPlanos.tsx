import {
  Check,
  Database,
  Globe,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { useAuth } from "../../../auth/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

interface ModalPlanosProps {
  isOpen: boolean;
  onClose: () => void;
  planoAtual?: string;
}

interface PlanoDb {
  id: string;
  codigo: string;
  nome: string;
  duracao_meses: number;
  valor_base_mensal: number;
  usuarios_ilimitados: boolean;
  site_incluso: boolean;
  conexoes_whatsapp_inclusas: number;
  storage_incluso_bytes: number;
  storage_max_file_size_bytes: number;
  ativo: boolean;
  ordem: number;
}

interface StoragePlanoDb {
  id: string;
  codigo: string;
  nome: string;
  adicional_bytes: number;
  valor_mensal: number;
  ativo: boolean;
  ordem: number;
}

interface WhatsappPlanoDb {
  id: string;
  codigo: string;
  total_conexoes_min: number;
  total_conexoes_max: number | null;
  valor_unitario_adicional: number;
  ativo: boolean;
  ordem: number;
}

interface SimulacaoAssinatura {
  plano: {
    id: string;
    codigo: string;
    nome: string;
    duracao_meses: number;
    valor_base_mensal: number;
  };
  storage: {
    plano_id: string | null;
    valor_mensal: number;
    max_file_size_bytes: number;
    storage_total_bytes: number;
    storage_incluso_bytes: number;
    storage_adicional_bytes: number;
  };
  whatsapp: {
    valor_mensal: number;
    conexoes_inclusas: number;
    qtd_conexoes_total: number;
    qtd_conexoes_adicionais: number;
    valor_unitario_adicional: number;
  };
  beneficios: {
    site_incluso: boolean;
    usuarios_ilimitados: boolean;
  };
  financeiro: {
    valor_base_mensal: number;
    valor_mensal_total: number;
    valor_storage_mensal: number;
    valor_whatsapp_mensal: number;
    valor_total_contratado: number;
  };
}

interface SolicitacaoAssinaturaResult {
  sucesso: boolean;
  assinatura_id: string;
  status: string;
  plano: {
    id: string;
    codigo: string;
    nome: string;
    duracao_meses: number;
  };
  storage: {
    storage_incluso_bytes: number;
    storage_adicional_bytes: number;
    storage_total_bytes: number;
  };
  whatsapp: {
    qtd_conexoes_total: number;
    qtd_conexoes_adicionais: number;
    valor_unitario_adicional: number;
  };
  financeiro: {
    valor_base_mensal: number;
    valor_storage_mensal: number;
    valor_whatsapp_mensal: number;
    valor_mensal_total: number;
    valor_total_contratado: number;
  };
}

export function ModalPlanos({
  isOpen,
  onClose,
  planoAtual,
}: ModalPlanosProps) {
  const { userProfile } = useAuth();

  const [planos, setPlanos] = useState<PlanoDb[]>([]);
  const [storagePlanos, setStoragePlanos] = useState<StoragePlanoDb[]>([]);
  const [whatsappPlanos, setWhatsappPlanos] = useState<WhatsappPlanoDb[]>([]);

  const [planoSelecionadoId, setPlanoSelecionadoId] = useState("");
  const [storageSelecionadoId, setStorageSelecionadoId] = useState("");
  const [qtdWhatsapp, setQtdWhatsapp] = useState(1);

  const [simulacao, setSimulacao] = useState<SimulacaoAssinatura | null>(null);
  const [simulacaoErro, setSimulacaoErro] = useState("");

  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [loadingSimulacao, setLoadingSimulacao] = useState(false);
  const [loadingPedido, setLoadingPedido] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const simulacaoSeq = useRef(0);

  const planoSelecionado = useMemo(
    () =>
      planos.find(
        plano => plano.id === planoSelecionadoId
      ) || null,
    [
      planos,
      planoSelecionadoId,
    ]
  );

  

  useEffect(() => {
    if (!isOpen) return;

    let ativo = true;

    const carregarCatalogos = async () => {
      setLoadingCatalogo(true);
      setSimulacao(null);
      setSimulacaoErro("");
      setShowConfirm(false);

      try {
        const [
          planosResponse,
          storageResponse,
          whatsappResponse,
        ] = await Promise.all([
          supabase
            .from("crm_planos")
            .select(`
              id,
              codigo,
              nome,
              duracao_meses,
              valor_base_mensal,
              usuarios_ilimitados,
              site_incluso,
              conexoes_whatsapp_inclusas,
              storage_incluso_bytes,
              storage_max_file_size_bytes,
              ativo,
              ordem
            `)
            .eq("ativo", true)
            .order("ordem", {
              ascending: true,
            }),

          supabase
            .from("crm_storage_planos")
            .select(`
              id,
              codigo,
              nome,
              adicional_bytes,
              valor_mensal,
              ativo,
              ordem
            `)
            .eq("ativo", true)
            .order("ordem", {
              ascending: true,
            }),

          supabase
            .from("crm_whatsapp_planos")
            .select(`
              id,
              codigo,
              total_conexoes_min,
              total_conexoes_max,
              valor_unitario_adicional,
              ativo,
              ordem
            `)
            .eq("ativo", true)
            .order("ordem", {
              ascending: true,
            }),
        ]);

        if (planosResponse.error) {
          throw planosResponse.error;
        }

        if (storageResponse.error) {
          throw storageResponse.error;
        }

        if (whatsappResponse.error) {
          throw whatsappResponse.error;
        }

        if (!ativo) return;

        const novosPlanos =
          (planosResponse.data || []) as PlanoDb[];

        const novosStoragePlanos =
          (storageResponse.data || []) as StoragePlanoDb[];

        const novosWhatsappPlanos =
          (whatsappResponse.data || []) as WhatsappPlanoDb[];

        if (!novosPlanos.length) {
          throw new Error(
            "Nenhum plano comercial ativo foi encontrado."
          );
        }

        if (!novosStoragePlanos.length) {
          throw new Error(
            "Nenhuma opção de armazenamento foi encontrada."
          );
        }

        setPlanos(novosPlanos);
        setStoragePlanos(novosStoragePlanos);
        setWhatsappPlanos(novosWhatsappPlanos);

        const planoAtualNormalizado =
          planoAtual
            ?.trim()
            .toUpperCase() || "";

        const planoInicial =
          novosPlanos.find(
            plano =>
              plano.codigo.toUpperCase() ===
                planoAtualNormalizado ||
              plano.nome.toUpperCase() ===
                planoAtualNormalizado
          ) ||
          novosPlanos[0];

        const storageInicial =
          novosStoragePlanos.find(
            storage =>
              storage.codigo ===
              "SEM_ADICIONAL"
          ) ||
          novosStoragePlanos.find(
            storage =>
              Number(
                storage.adicional_bytes
              ) === 0
          ) ||
          novosStoragePlanos[0];

        setPlanoSelecionadoId(
          planoInicial.id
        );

        setStorageSelecionadoId(
          storageInicial.id
        );

        setQtdWhatsapp(
          Math.max(
            1,
            Number(
              planoInicial
                .conexoes_whatsapp_inclusas ||
                1
            )
          )
        );
      } catch (error: any) {
        console.error(
          "Erro ao carregar catálogo comercial:",
          error
        );

        if (ativo) {
          toast.error(
            error?.message ||
              "Não foi possível carregar os planos."
          );
        }
      } finally {
        if (ativo) {
          setLoadingCatalogo(false);
        }
      }
    };

    carregarCatalogos();

    return () => {
      ativo = false;
    };
  }, [
    isOpen,
    planoAtual,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !planoSelecionadoId ||
      !storageSelecionadoId
    ) {
      return;
    }

    const seq =
      ++simulacaoSeq.current;

    const timer =
      window.setTimeout(
        async () => {
          setLoadingSimulacao(true);
          setSimulacaoErro("");

          try {
            const {
              data,
              error,
            } = await supabase.rpc(
              "crm_simular_assinatura",
              {
                p_plano_id:
                  planoSelecionadoId,

                p_storage_plano_id:
                  storageSelecionadoId,

                p_qtd_conexoes_whatsapp:
                  qtdWhatsapp,
              }
            );

            if (error) {
              throw error;
            }

            if (
              seq !==
              simulacaoSeq.current
            ) {
              return;
            }

            setSimulacao(
              data as SimulacaoAssinatura
            );
          } catch (error: any) {
            console.error(
              "Erro ao simular assinatura:",
              error
            );

            if (
              seq ===
              simulacaoSeq.current
            ) {
              setSimulacao(null);

              setSimulacaoErro(
                error?.message ||
                  "Não foi possível calcular a assinatura."
              );
            }
          } finally {
            if (
              seq ===
              simulacaoSeq.current
            ) {
              setLoadingSimulacao(false);
            }
          }
        },
        200
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    planoSelecionadoId,
    storageSelecionadoId,
    qtdWhatsapp,
  ]);

  const handleSelecionarPlano = (
    plano: PlanoDb
  ) => {
    setPlanoSelecionadoId(
      plano.id
    );

    setQtdWhatsapp(
      atual =>
        Math.max(
          atual,
          Number(
            plano
              .conexoes_whatsapp_inclusas ||
              1
          )
        )
    );
  };

  const handleFinalizarPedido =
    async () => {
      if (
        !planoSelecionadoId ||
        !storageSelecionadoId
      ) {
        toast.error(
          "Selecione o plano e o armazenamento."
        );

        return;
      }

      if (!simulacao) {
        toast.error(
          "Aguarde o cálculo da assinatura."
        );

        return;
      }

      setLoadingPedido(true);

      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          "crm_solicitar_assinatura",
          {
            p_plano_id:
              planoSelecionadoId,

            p_storage_plano_id:
              storageSelecionadoId,

            p_qtd_conexoes_whatsapp:
              qtdWhatsapp,
          }
        );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "A solicitação não retornou os dados esperados."
          );
        }

        const resultado =
          data as SolicitacaoAssinaturaResult;

        if (
          !resultado.sucesso ||
          !resultado.assinatura_id
        ) {
          throw new Error(
            "Não foi possível registrar a solicitação."
          );
        }

        const profile =
          userProfile as any;

        const corretoraId =
          profile?.corretora_id ||
          profile?.id ||
          "N/A";

        const nomeCorretora =
          profile?.nome_corretora ||
          profile?.nome ||
          "N/A";

        const mensagem =
          criarMensagemWhatsApp({
            nomeCorretora,
            corretoraId,
            resultado,
          });

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
          "Solicitação registrada. A assinatura ficará pendente até a ativação."
        );

        setShowConfirm(false);
        onClose();
      } catch (error: any) {
        console.error(
          "Erro ao solicitar assinatura:",
          error
        );

        toast.error(
          error?.message ||
            "Não foi possível registrar a solicitação."
        );
      } finally {
        setLoadingPedido(false);
      }
    };

  const planoAtualNormalizado =
    planoAtual
      ?.trim()
      .toUpperCase() || "";

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[40px] border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 p-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
                <Zap
                  className="text-yellow-500"
                  fill="currentColor"
                  size={24}
                />

                SeguroCRM Profissional
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                CRM completo, usuários ilimitados, site integrado e 1 conexão WhatsApp inclusa.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X
                size={24}
                className="text-slate-400"
              />
            </button>
          </div>

          {loadingCatalogo ? (
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="text-center">
                <Loader2
                  size={36}
                  className="mx-auto animate-spin text-blue-600"
                />

                <p className="mt-4 text-sm font-bold text-slate-500">
                  Carregando catálogo comercial...
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-12">
              <div className="space-y-8 lg:col-span-7">
                <section>
                  <label className="mb-4 ml-1 block text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    1. Escolha o ciclo
                  </label>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {planos.map(
                      plano => {
                        const selected =
                          planoSelecionadoId ===
                          plano.id;

                        const atual =
                          plano.codigo
                            .toUpperCase() ===
                            planoAtualNormalizado ||
                          plano.nome
                            .toUpperCase() ===
                            planoAtualNormalizado;

                        return (
                          <button
                            key={
                              plano.id
                            }
                            type="button"
                            onClick={() =>
                              handleSelecionarPlano(
                                plano
                              )
                            }
                            className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                                selected
                                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md dark:bg-blue-500/10 dark:text-blue-300"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300"
                                }`}
                          >
                            {atual && (
                              <span className="absolute right-2 top-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-600">
                                Atual
                              </span>
                            )}

                            <span className="block text-base font-black">
                              {
                                plano.nome
                              }
                            </span>

                            <span className="mt-1.5 block text-sm font-black">
                              {formatMoney(
                                Number(
                                  plano.valor_base_mensal
                                )
                              )}
                              /mês
                            </span>

                            <span className="mt-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {formatMoney(
                                Number(
                                  plano.valor_base_mensal
                                ) *
                                  Number(
                                    plano.duracao_meses
                                  )
                              )}{" "}
                              no ciclo
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>

                <section className="rounded-[32px] border border-slate-100 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20">
                      <Database
                        size={20}
                      />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Espaço de Armazenamento
                      </h4>

                      <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        {planoSelecionado
                          ? `${formatStorageBytes(
                              Number(
                                planoSelecionado.storage_incluso_bytes
                              )
                            )} já estão inclusos no plano`
                          : "Armazenamento incluso no plano"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {storagePlanos.map(
                      option => {
                        const selected =
                          storageSelecionadoId ===
                          option.id;

                        const custoPorGb =
                          calcularCustoPorGb(
                            Number(
                              option.adicional_bytes
                            ),
                            Number(
                              option.valor_mensal
                            )
                          );

                        return (
                          <button
                            key={
                              option.id
                            }
                            type="button"
                            onClick={() =>
                              setStorageSelecionadoId(
                                option.id
                              )
                            }
                            className={`min-h-[92px] rounded-xl border-2 p-3 text-sm font-bold transition-all ${
                                selected
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-300"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300 dark:hover:bg-zinc-800"
                                }`}
                          >
                            {Number(option.adicional_bytes) === 0 && planoSelecionado
                            ? `${formatStorageBytes(
                                Number(planoSelecionado.storage_incluso_bytes)
                                )} inclusos`
                            : option.nome}

                            <span className="mt-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {Number(
                                option.valor_mensal
                              ) === 0
                                ? "Sem adicional"
                                : `+ ${formatMoney(
                                    Number(
                                      option.valor_mensal
                                    )
                                  )}/mês`}
                            </span>

                            {custoPorGb !==
                              null && (
                              <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {formatMoney(
                                  custoPorGb
                                )}{" "}
                                por GB
                              </span>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3.5 text-sm font-medium text-slate-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-slate-300">
                    Capacidade total contratada:{" "}
                   <strong className="font-black text-indigo-700 dark:text-indigo-300">
                      {simulacao
                        ? formatStorageBytes(
                            Number(
                              simulacao
                                .storage
                                .storage_total_bytes
                            )
                          )
                        : "Calculando..."}
                    </strong>
                  </div>
                </section>

                <section className="rounded-[32px] border border-slate-100 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
                      <Smartphone
                        size={20}
                      />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Conexões WhatsApp
                      </h4>

                      <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        {planoSelecionado
                          ? `${planoSelecionado.conexoes_whatsapp_inclusas} conexão está inclusa gratuitamente`
                          : "Conexão inclusa no plano"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Total de conexões
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Você pode aumentar ou reduzir conforme sua operação.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={
                          qtdWhatsapp <=
                          Math.max(
                            1,
                            Number(
                              planoSelecionado
                                ?.conexoes_whatsapp_inclusas ||
                                1
                            )
                          )
                        }
                        onClick={() =>
                          setQtdWhatsapp(
                            value =>
                              Math.max(
                                Math.max(
                                  1,
                                  Number(
                                    planoSelecionado
                                      ?.conexoes_whatsapp_inclusas ||
                                      1
                                  )
                                ),
                                value - 1
                              )
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Minus
                          size={17}
                        />
                      </button>

                      <span className="min-w-[36px] text-center text-xl font-black text-slate-900 dark:text-white">
                        {qtdWhatsapp}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setQtdWhatsapp(
                            value =>
                              Math.min(
                                50,
                                value + 1
                              )
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-blue-600 transition hover:bg-blue-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Plus
                          size={17}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <PriceInfo
                      label="1 conexão"
                      value="Inclusa"
                    />

                    {whatsappPlanos.map(
                      faixa => (
                        <PriceInfo
                          key={
                            faixa.id
                          }
                          label={formatWhatsappFaixa(
                            faixa
                          )}
                          value={`${formatMoney(
                            Number(
                              faixa.valor_unitario_adicional
                            )
                          )}/un. adicional`}
                        />
                      )
                    )}
                  </div>

                  {qtdWhatsapp >
                    Number(
                      planoSelecionado
                        ?.conexoes_whatsapp_inclusas ||
                        1
                    ) && (
                    <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Adicional mensal de WhatsApp:{" "}
                      <strong>
                        {simulacao
                          ? formatMoney(
                              Number(
                                simulacao
                                  .financeiro
                                  .valor_whatsapp_mensal
                              )
                            )
                          : "Calculando..."}
                      </strong>
                    </div>
                  )}
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <BenefitCard
                    icon={
                      <Users
                        size={18}
                      />
                    }
                    title={
                      planoSelecionado
                        ?.usuarios_ilimitados
                        ? "Usuários ilimitados"
                        : "Usuários conforme plano"
                    }
                  />

                  <BenefitCard
                    icon={
                      <Globe
                        size={18}
                      />
                    }
                    title={
                      planoSelecionado
                        ?.site_incluso
                        ? "Site corporativo incluso"
                        : "Site não incluso"
                    }
                  />

                  <BenefitCard
                    icon={
                      <Check
                        size={18}
                      />
                    }
                    title={
                      planoSelecionado
                        ? `${formatStorageBytes(
                            Number(
                              planoSelecionado.storage_incluso_bytes
                            )
                          )} + ${planoSelecionado.conexoes_whatsapp_inclusas} WhatsApp`
                        : "Benefícios do plano"
                    }
                  />
                </section>
              </div>

              <div className="lg:col-span-5">
                <div className="sticky top-24 rounded-[32px] border border-white/5 bg-slate-900 p-8 text-white shadow-2xl dark:bg-zinc-900">
                  <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    Resumo da Assinatura
                  </h4>

                  {loadingSimulacao ? (
                    <div className="flex min-h-[250px] items-center justify-center">
                      <div className="text-center">
                        <Loader2
                          size={28}
                          className="mx-auto animate-spin text-blue-400"
                        />

                        <p className="mt-3 text-xs font-bold text-slate-400">
                          Calculando no servidor...
                        </p>
                      </div>
                    </div>
                  ) : simulacaoErro ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                      {simulacaoErro}
                    </div>
                  ) : simulacao ? (
                    <>
                      <div className="mb-8 space-y-4">
                        <ResumoLinha
                          label={`Plano ${simulacao.plano.nome}`}
                          value={formatMoney(
                            Number(
                              simulacao
                                .financeiro
                                .valor_base_mensal
                            )
                          )}
                        />

                        <ResumoLinha
                          label={`Storage ${formatStorageBytes(
                            Number(
                              simulacao
                                .storage
                                .storage_total_bytes
                            )
                          )}`}
                          value={
                            Number(
                              simulacao
                                .financeiro
                                .valor_storage_mensal
                            ) > 0
                              ? `+ ${formatMoney(
                                  Number(
                                    simulacao
                                      .financeiro
                                      .valor_storage_mensal
                                  )
                                )}`
                              : "Incluso"
                          }
                          destaque="indigo"
                        />

                        <ResumoLinha
                          label={`${simulacao.whatsapp.qtd_conexoes_total} conexão${
                            simulacao
                              .whatsapp
                              .qtd_conexoes_total >
                            1
                              ? "ões"
                              : ""
                          } WhatsApp`}
                          value={
                            Number(
                              simulacao
                                .financeiro
                                .valor_whatsapp_mensal
                            ) > 0
                              ? `+ ${formatMoney(
                                  Number(
                                    simulacao
                                      .financeiro
                                      .valor_whatsapp_mensal
                                  )
                                )}`
                              : "Incluso"
                          }
                          destaque="emerald"
                        />

                        <ResumoLinha
                          label="Usuários"
                          value={
                            simulacao
                              .beneficios
                              .usuarios_ilimitados
                              ? "Ilimitados"
                              : "Conforme plano"
                          }
                          destaque="emerald"
                        />

                        <ResumoLinha
                          label="Site + CRM"
                          value={
                            simulacao
                              .beneficios
                              .site_incluso
                              ? "Incluso"
                              : "Não incluso"
                          }
                          destaque="emerald"
                        />
                      </div>

                      <div className="border-t border-white/10 pt-6">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Mensalidade equivalente
                        </p>

                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white">
                            {formatMoney(
                              Number(
                                simulacao
                                  .financeiro
                                  .valor_mensal_total
                              )
                            )}
                          </span>

                          <span className="text-xs text-slate-400">
                            /mês
                          </span>
                        </div>

                        <p className="mb-1 mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Total do ciclo
                        </p>

                        <p className="text-2xl font-black text-blue-400">
                          {formatMoney(
                            Number(
                              simulacao
                                .financeiro
                                .valor_total_contratado
                            )
                          )}
                        </p>

                        <p className="mt-2 text-[11px] font-medium italic text-slate-400">
                          Ciclo de{" "}
                          {
                            simulacao
                              .plano
                              .duracao_meses
                          }{" "}
                          mês(es).
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          loadingPedido ||
                          loadingSimulacao
                        }
                        onClick={() =>
                          setShowConfirm(
                            true
                          )
                        }
                        className="group mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-900/40 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingCart
                          size={20}
                          className="transition-transform group-hover:scale-110"
                        />

                        Solicitar Contratação
                      </button>

                      <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-500">
                        A solicitação ficará pendente até a confirmação da ativação.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/10 p-5 text-center text-xs text-slate-400">
                      Selecione as opções para calcular sua assinatura.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirm &&
        simulacao && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md animate-in zoom-in duration-200">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20">
              <ShieldCheck
                size={40}
              />
            </div>

            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Tudo pronto!
            </h3>

            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Seu pedido será registrado no SeguroCRM e ficará pendente até a confirmação da ativação.
            </p>

            <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-left dark:bg-zinc-900">
              <ResumoConfirmacao
                label="Plano"
                value={
                  simulacao.plano.nome
                }
              />

              <ResumoConfirmacao
                label="Armazenamento"
                value={formatStorageBytes(
                  Number(
                    simulacao
                      .storage
                      .storage_total_bytes
                  )
                )}
              />

              <ResumoConfirmacao
                label="WhatsApp"
                value={`${simulacao.whatsapp.qtd_conexoes_total} conexão${
                  simulacao
                    .whatsapp
                    .qtd_conexoes_total >
                  1
                    ? "ões"
                    : ""
                }`}
              />

              <ResumoConfirmacao
                label="Mensal equivalente"
                value={formatMoney(
                  Number(
                    simulacao
                      .financeiro
                      .valor_mensal_total
                  )
                )}
              />

              <ResumoConfirmacao
                label="Total do ciclo"
                value={formatMoney(
                  Number(
                    simulacao
                      .financeiro
                      .valor_total_contratado
                  )
                )}
                strong
              />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={
                  handleFinalizarPedido
                }
                disabled={
                  loadingPedido
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                {loadingPedido ? (
                  <>
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />

                    REGISTRANDO...
                  </>
                ) : (
                  <>
                    <MessageCircle
                      size={20}
                    />

                    REGISTRAR E ABRIR WHATSAPP
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={
                  loadingPedido
                }
                onClick={() =>
                  setShowConfirm(
                    false
                  )
                }
                className="w-full py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                Revisar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function criarMensagemWhatsApp({
  nomeCorretora,
  corretoraId,
  resultado,
}: {
  nomeCorretora: string;
  corretoraId: string;
  resultado: SolicitacaoAssinaturaResult;
}) {
  return `*NOVA SOLICITAÇÃO SEGUROCRM*
---------------------------------------
*Corretora:* ${nomeCorretora}
*ID da corretora:* ${corretoraId}
*ID da solicitação:* ${resultado.assinatura_id}
*Status:* ${resultado.status}

*PLANO*
- Ciclo: *${resultado.plano.nome.toUpperCase()}*
- Duração: ${resultado.plano.duracao_meses} mês(es)
- Plano base: ${formatMoney(resultado.financeiro.valor_base_mensal)}/mês
- Usuários: *ILIMITADOS*
- Site Corporativo: *INCLUSO*
- 1 conexão WhatsApp: *INCLUSA*
- ${formatStorageBytes(resultado.storage.storage_incluso_bytes)} de armazenamento: *INCLUSOS*

*WHATSAPP*
- Total de conexões: *${resultado.whatsapp.qtd_conexoes_total}*
- Conexões adicionais: *${resultado.whatsapp.qtd_conexoes_adicionais}*
- Valor unitário adicional: *${formatMoney(resultado.whatsapp.valor_unitario_adicional)}*
- Adicional mensal: *${formatMoney(resultado.financeiro.valor_whatsapp_mensal)}*

*ARMAZENAMENTO*
- Capacidade total: *${formatStorageBytes(resultado.storage.storage_total_bytes)}*
- Espaço adicional: *${formatStorageBytes(resultado.storage.storage_adicional_bytes)}*
- Adicional mensal: *${formatMoney(resultado.financeiro.valor_storage_mensal)}*

*RESUMO*
- Mensalidade equivalente: *${formatMoney(resultado.financeiro.valor_mensal_total)}*
- Valor total do ciclo: *${formatMoney(resultado.financeiro.valor_total_contratado)}*

---------------------------------------
Olá! Gostaria de concluir a ativação da minha assinatura do SeguroCRM.`;
}

function BenefitCard({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
      <span className="text-emerald-500">
        {icon}
      </span>

      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
        {title}
      </span>
    </div>
  );
}

function PriceInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

function ResumoLinha({
  label,
  value,
  destaque,
}: {
  label: string;
  value: string;
  destaque?:
    | "indigo"
    | "emerald";
}) {
  const valueClass =
    destaque === "emerald"
      ? "text-emerald-400"
      : destaque === "indigo"
        ? "text-indigo-400"
        : "text-white";

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">
        {label}
      </span>

      <span
        className={`shrink-0 font-bold ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function ResumoConfirmacao({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-xs">
      <span className="text-slate-500">
        {label}
      </span>

      <span
        className={
          strong
            ? "font-black text-blue-600"
            : "font-bold text-slate-800 dark:text-slate-200"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(value) || 0
  );
}

function formatStorageBytes(
  bytes: number
) {
  const value =
    Number(bytes) || 0;

  if (value <= 0) {
    return "0 MB";
  }

  const mb =
    value / 1024 / 1024;

  if (mb < 1024) {
    const formatted =
      Number.isInteger(mb)
        ? mb.toFixed(0)
        : mb
            .toFixed(2)
            .replace(
              ".",
              ","
            );

    return `${formatted} MB`;
  }

  const gb =
    mb / 1024;

  const formatted =
    Number.isInteger(gb)
      ? gb.toFixed(0)
      : gb
          .toFixed(2)
          .replace(
            ".",
            ","
          );

  return `${formatted} GB`;
}

function calcularCustoPorGb(
  adicionalBytes: number,
  valorMensal: number
) {
  if (
    !adicionalBytes ||
    adicionalBytes <= 0 ||
    !valorMensal ||
    valorMensal <= 0
  ) {
    return null;
  }

  const gb =
    adicionalBytes /
    1024 /
    1024 /
    1024;

  if (gb <= 0) {
    return null;
  }

  return (
    valorMensal / gb
  );
}

function formatWhatsappFaixa(
  faixa: WhatsappPlanoDb
) {
  if (
    faixa.total_conexoes_max ===
    null
  ) {
    return `${faixa.total_conexoes_min} ou mais`;
  }

  if (
    faixa.total_conexoes_min ===
    faixa.total_conexoes_max
  ) {
    return `${faixa.total_conexoes_min} conexões`;
  }

  return `${faixa.total_conexoes_min} a ${faixa.total_conexoes_max} conexões`;
}