import {
  Check,
  Minus,
  Plus,
  Database,
  Globe,
  Loader2,
  MessageCircle,
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

type PlanoKey =
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual";

interface StorageOption {
  adicionalMb: number;
  precoMensal: number;
  label: string;
  custoPorGb?: number;
}

const STORAGE_INCLUSO_MB =
  250;

const PLANOS_CONFIG: Record<
  PlanoKey,
  {
    nome: string;
    meses: number;
    valorMensal: number;
  }
> = {
  mensal: {
    nome: "Mensal",
    meses: 1,
    valorMensal: 129.9,
  },

  trimestral: {
    nome: "Trimestral",
    meses: 3,
    valorMensal: 119.9,
  },

  semestral: {
    nome: "Semestral",
    meses: 6,
    valorMensal: 109.9,
  },

  anual: {
    nome: "Anual",
    meses: 12,
    valorMensal: 97.9,
  },
};

const STORAGE_OPTIONS: StorageOption[] =
  [
    {
      adicionalMb: 0,
      precoMensal: 0,
      label:
        "250 MB inclusos",
    },

    {
      adicionalMb: 512,
      precoMensal: 19.9,
      label:
        "+ 0,5 GB",
      custoPorGb: 39.8,
    },

    {
      adicionalMb: 1024,
      precoMensal: 29.9,
      label:
        "+ 1 GB",
      custoPorGb: 29.9,
    },

    {
      adicionalMb: 3072,
      precoMensal: 74.7,
      label:
        "+ 3 GB",
      custoPorGb: 24.9,
    },

    {
      adicionalMb: 5120,
      precoMensal: 99.5,
      label:
        "+ 5 GB",
      custoPorGb: 19.9,
    },

    {
      adicionalMb: 10240,
      precoMensal: 159,
      label:
        "+ 10 GB",
      custoPorGb: 15.9,
    },

    {
      adicionalMb: 51200,
      precoMensal: 645,
      label:
        "+ 50 GB",
      custoPorGb: 12.9,
    },

    {
      adicionalMb: 102400,
      precoMensal: 990,
      label:
        "+ 100 GB",
      custoPorGb: 9.9,
    },
  ];

export function ModalPlanos({
  isOpen,
  onClose,
  planoAtual,
}: ModalPlanosProps) {
  const {
    userProfile,
  } = useAuth();

  const [
    planoSel,
    setPlanoSel,
  ] = useState<PlanoKey>(
    "mensal"
  );

  const [
    storageSel,
    setStorageSel,
  ] = useState<StorageOption>(
    STORAGE_OPTIONS[0]
  );

  const [
    qtdWhatsapp,
    setQtdWhatsapp,
  ] = useState(1);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    showConfirm,
    setShowConfirm,
  ] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const atual =
      planoAtual
        ?.toLowerCase()
        .trim();

    if (
      atual &&
      atual in PLANOS_CONFIG
    ) {
      setPlanoSel(
        atual as PlanoKey
      );
    }
  }, [
    isOpen,
    planoAtual,
  ]);

  const calculo =
    useMemo(() => {
      const plano =
        PLANOS_CONFIG[
          planoSel
        ];

      const valorWhatsappMensal =
        calcularWhatsappMensal(
          qtdWhatsapp
        );

      const valorStorageMensal =
        storageSel
          .precoMensal;

      const valorMensalTotal =
        plano.valorMensal +
        valorStorageMensal +
        valorWhatsappMensal;

      const valorTotal =
        valorMensalTotal *
        plano.meses;

      const storageTotalMb =
        STORAGE_INCLUSO_MB +
        storageSel
          .adicionalMb;

      return {
        plano,
        valorBaseMensal:
          plano.valorMensal,

        valorStorageMensal,
        valorWhatsappMensal,
        valorMensalTotal,
        valorTotal,

        storageTotalMb,

        storageAdicionalMb:
          storageSel
            .adicionalMb,
      };
    }, [
      planoSel,
      storageSel,
      qtdWhatsapp,
    ]);

  const handleFinalizarPedido =
    async () => {
      if (
        !userProfile
          ?.corretora_id
      ) {
        toast.error(
          "Perfil da corretora não identificado."
        );
        return;
      }

      setLoading(true);

      try {
        const dataFim =
          new Date();

        dataFim.setMonth(
          dataFim.getMonth() +
            calculo.plano.meses
        );

        const {
          error: dbError,
        } = await supabase
          .from("tab_planos")
          .insert([
            {
              corretora_id:
                userProfile
                  .corretora_id,

              plano_nome:
                calculo.plano.nome
                  .toUpperCase(),

              periodicidade:
                planoSel,

              valor_base_mensal:
                calculo
                  .valorBaseMensal,

              valor_storage_mensal:
                calculo
                  .valorStorageMensal,

              valor_whatsapp_mensal:
                calculo
                  .valorWhatsappMensal,

              valor_mensal_total:
                calculo
                  .valorMensalTotal,

              valor_total:
                calculo
                  .valorTotal,

              qtd_conexoes_whatsapp:
                qtdWhatsapp,

              /*
                Mantido por compatibilidade
                com estruturas antigas do CRM.
                Comercialmente os usuários são
                ilimitados.
              */
              qtd_usuarios_adicionais:
                999,

              possui_site:
                true,

              /*
                Campo legado mantido ativo
                enquanto ainda existir no banco.
                Representa o módulo Site + IA.
              */
              possui_manychat:
                true,

              storage_adicional_mb:
                calculo
                  .storageAdicionalMb,

              storage_limite_mb:
                calculo
                  .storageTotalMb,

              storage_max_file_size_mb:
                50,

              data_fim:
                dataFim
                  .toISOString(),

              status_assinatura:
                "PENDENTE_WHATSAPP",
            },
          ]);

        if (dbError) {
          throw dbError;
        }

        const mensagem =
          criarMensagemWhatsApp({
            nomeCorretora:
              userProfile
                .nome_corretora ||
              userProfile.nome ||
              "N/A",

            corretoraId:
              userProfile
                .corretora_id,

            plano:
              calculo.plano.nome,

            meses:
              calculo.plano.meses,

            valorBaseMensal:
              calculo
                .valorBaseMensal,

            qtdWhatsapp,

            valorWhatsappMensal:
              calculo
                .valorWhatsappMensal,

            storageTotalMb:
              calculo
                .storageTotalMb,

            storageAdicionalMb:
              calculo
                .storageAdicionalMb,

            valorStorageMensal:
              calculo
                .valorStorageMensal,

            valorMensalTotal:
              calculo
                .valorMensalTotal,

            valorTotal:
              calculo
                .valorTotal,
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
          "Pedido registrado. Finalize a ativação pelo WhatsApp."
        );

        setShowConfirm(
          false
        );

        onClose();
      } catch (error: any) {
        console.error(
          "Erro ao gerar pedido:",
          error
        );

        toast.error(
          error?.message ||
          "Não foi possível gerar o pedido."
        );
      } finally {
        setLoading(false);
      }
    };

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

          <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-7">
              <section>
                <label className="mb-4 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  1. Escolha o ciclo
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    Object.keys(
                      PLANOS_CONFIG
                    ) as PlanoKey[]
                  ).map(key => {
                    const plano =
                      PLANOS_CONFIG[
                        key
                      ];

                    const selected =
                      planoSel === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setPlanoSel(
                            key
                          )
                        }
                        className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                          selected
                            ? "border-blue-600 bg-blue-50 text-blue-600 shadow-md dark:bg-blue-500/10"
                            : "border-slate-100 text-slate-500 hover:border-slate-200 dark:border-zinc-800"
                        }`}
                      >
                        {planoAtual
                          ?.toLowerCase() ===
                          key && (
                          <span className="absolute right-2 top-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-600">
                            Atual
                          </span>
                        )}

                        <span className="block text-sm font-bold">
                          {plano.nome}
                        </span>

                        <span className="mt-1 block text-[10px] font-black">
                          {formatMoney(
                            plano.valorMensal
                          )}
                          /mês
                        </span>

                        <span className="mt-1 block text-[9px] text-slate-400">
                          {formatMoney(
                            plano.valorMensal *
                              plano.meses
                          )}{" "}
                          no ciclo
                        </span>
                      </button>
                    );
                  })}
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

                    <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                      250 MB já estão inclusos no plano
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STORAGE_OPTIONS.map(
                    option => {
                      const selected =
                        storageSel
                          .adicionalMb ===
                        option.adicionalMb;

                      return (
                        <button
                          key={
                            option.adicionalMb
                          }
                          type="button"
                          onClick={() =>
                            setStorageSel(
                              option
                            )
                          }
                          className={`rounded-xl border-2 p-3 text-[11px] font-bold transition-all ${
                            selected
                              ? "border-indigo-500 bg-white text-indigo-600 shadow-sm dark:bg-zinc-800"
                              : "border-transparent text-slate-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          {option.label}

                          <span className="mt-1 block text-[9px] opacity-70">
                            {option.precoMensal ===
                            0
                              ? "Sem adicional"
                              : `+ ${formatMoney(
                                  option.precoMensal
                                )}/mês`}
                          </span>

                          {option.custoPorGb && (
                            <span className="mt-0.5 block text-[8px] font-medium opacity-50">
                              {formatMoney(
                                option.custoPorGb
                              )}{" "}
                              por GB
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  Capacidade total contratada:{" "}
                  <strong>
                    {formatStorage(
                      calculo
                        .storageTotalMb
                    )}
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

                    <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                      1 conexão está inclusa gratuitamente
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
                        qtdWhatsapp <= 1
                      }
                      onClick={() =>
                        setQtdWhatsapp(
                          value =>
                            Math.max(
                              1,
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

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PriceInfo
                    label="1 conexão"
                    value="Inclusa"
                  />

                  <PriceInfo
                    label="2 conexões"
                    value="R$ 95,90 adicional"
                  />

                  <PriceInfo
                    label="3 conexões"
                    value="R$ 89,90/un. adicional"
                  />

                  <PriceInfo
                    label="4 conexões"
                    value="R$ 85,90/un. adicional"
                  />

                  <PriceInfo
                    label="5 conexões"
                    value="R$ 81,90/un. adicional"
                  />

                  <PriceInfo
                    label="6 ou mais"
                    value="R$ 79,90/un. adicional"
                  />
                </div>

                {qtdWhatsapp >
                  1 && (
                  <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Adicional mensal de WhatsApp:{" "}
                    <strong>
                      {formatMoney(
                        calculo
                          .valorWhatsappMensal
                      )}
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
                  title="Usuários ilimitados"
                />

                <BenefitCard
                  icon={
                    <Globe
                      size={18}
                    />
                  }
                  title="Site corporativo incluso"
                />

                <BenefitCard
                  icon={
                    <Check
                      size={18}
                    />
                  }
                  title="250 MB + 1 WhatsApp"
                />
              </section>
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-24 rounded-[32px] border border-white/5 bg-slate-900 p-8 text-white shadow-2xl dark:bg-zinc-900">
                <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                  Resumo da Assinatura
                </h4>

                <div className="mb-8 space-y-4">
                  <ResumoLinha
                    label={`Plano ${calculo.plano.nome}`}
                    value={formatMoney(
                      calculo
                        .valorBaseMensal
                    )}
                  />

                  <ResumoLinha
                    label={`Storage ${formatStorage(
                      calculo
                        .storageTotalMb
                    )}`}
                    value={
                      calculo
                        .valorStorageMensal >
                      0
                        ? `+ ${formatMoney(
                            calculo
                              .valorStorageMensal
                          )}`
                        : "Incluso"
                    }
                    destaque="indigo"
                  />

                  <ResumoLinha
                    label={`${qtdWhatsapp} conexão${
                      qtdWhatsapp >
                      1
                        ? "ões"
                        : ""
                    } WhatsApp`}
                    value={
                      calculo
                        .valorWhatsappMensal >
                      0
                        ? `+ ${formatMoney(
                            calculo
                              .valorWhatsappMensal
                          )}`
                        : "Incluso"
                    }
                    destaque="emerald"
                  />

                  <ResumoLinha
                    label="Usuários"
                    value="Ilimitados"
                    destaque="emerald"
                  />

                  <ResumoLinha
                    label="Site + CRM"
                    value="Incluso"
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
                        calculo
                          .valorMensalTotal
                      )}
                    </span>

                    <span className="text-xs text-slate-400">
                      /mês
                    </span>
                  </div>

                  <p className="mt-6 mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Total do ciclo
                  </p>

                  <p className="text-2xl font-black text-blue-400">
                    {formatMoney(
                      calculo
                        .valorTotal
                    )}
                  </p>

                  <p className="mt-2 text-[11px] font-medium italic text-slate-400">
                    Ciclo de{" "}
                    {
                      calculo.plano
                        .meses
                    }{" "}
                    mês(es).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirm(
                      true
                    )
                  }
                  className="group mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-900/40 transition-all hover:bg-blue-500"
                >
                  <ShoppingCart
                    size={20}
                    className="transition-transform group-hover:scale-110"
                  />

                  Contratar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
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
              Seu pedido será registrado e você será direcionado ao WhatsApp para concluir a ativação.
            </p>

            <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-left dark:bg-zinc-900">
              <ResumoConfirmacao
                label="Plano"
                value={
                  calculo.plano.nome
                }
              />

              <ResumoConfirmacao
                label="Armazenamento"
                value={formatStorage(
                  calculo
                    .storageTotalMb
                )}
              />

              <ResumoConfirmacao
                label="WhatsApp"
                value={`${qtdWhatsapp} conexão${
                  qtdWhatsapp >
                  1
                    ? "ões"
                    : ""
                }`}
              />

              <ResumoConfirmacao
                label="Mensal equivalente"
                value={formatMoney(
                  calculo
                    .valorMensalTotal
                )}
              />

              <ResumoConfirmacao
                label="Total do ciclo"
                value={formatMoney(
                  calculo
                    .valorTotal
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
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <MessageCircle
                      size={20}
                    />

                    INICIAR NO WHATSAPP
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  setShowConfirm(
                    false
                  )
                }
                className="w-full py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-600"
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

function calcularWhatsappMensal(
  quantidadeTotal: number
) {
  if (
    quantidadeTotal <= 1
  ) {
    return 0;
  }

  const adicionais =
    quantidadeTotal - 1;

  if (
    quantidadeTotal === 2
  ) {
    return (
      adicionais *
      95.9
    );
  }

  if (
    quantidadeTotal === 3
  ) {
    return (
      adicionais *
      89.9
    );
  }

  if (
    quantidadeTotal === 4
  ) {
    return (
      adicionais *
      85.9
    );
  }

  if (
    quantidadeTotal === 5
  ) {
    return (
      adicionais *
      81.9
    );
  }

  return (
    adicionais *
    79.9
  );
}

function criarMensagemWhatsApp({
  nomeCorretora,
  corretoraId,
  plano,
  meses,
  valorBaseMensal,
  qtdWhatsapp,
  valorWhatsappMensal,
  storageTotalMb,
  storageAdicionalMb,
  valorStorageMensal,
  valorMensalTotal,
  valorTotal,
}: {
  nomeCorretora: string;
  corretoraId: string;
  plano: string;
  meses: number;
  valorBaseMensal: number;
  qtdWhatsapp: number;
  valorWhatsappMensal: number;
  storageTotalMb: number;
  storageAdicionalMb: number;
  valorStorageMensal: number;
  valorMensalTotal: number;
  valorTotal: number;
}) {
  return `*NOVO PEDIDO SEGUROCRM* 🚀
---------------------------------------
*Corretora:* ${nomeCorretora}
*ID:* ${corretoraId}

*PLANO*
- Ciclo: *${plano.toUpperCase()}*
- Duração: ${meses} mês(es)
- Plano base: ${formatMoney(valorBaseMensal)}/mês
- Usuários: *ILIMITADOS* ✅
- Site Corporativo: *INCLUSO* ✅
- 1 conexão WhatsApp: *INCLUSA* ✅
- 250 MB de armazenamento: *INCLUSOS* ✅

*WHATSAPP*
- Total de conexões: *${qtdWhatsapp}*
- Adicional mensal: *${formatMoney(valorWhatsappMensal)}*

*ARMAZENAMENTO*
- Capacidade total: *${formatStorage(storageTotalMb)}*
- Espaço adicional: *${formatStorage(storageAdicionalMb)}*
- Adicional mensal: *${formatMoney(valorStorageMensal)}*

*RESUMO*
- Mensalidade equivalente: *${formatMoney(valorMensalTotal)}*
- Valor total do ciclo: *${formatMoney(valorTotal)}*

---------------------------------------
Olá! Gostaria de concluir a ativação do meu SeguroCRM.`;
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
    <div className="rounded-xl bg-white p-3 dark:bg-zinc-900">
      <p className="text-[9px] font-black uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-bold text-slate-700 dark:text-slate-200">
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
    destaque ===
    "emerald"
      ? "text-emerald-400"
      : destaque ===
        "indigo"
        ? "text-indigo-400"
        : "text-white";

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">
        {label}
      </span>

      <span className={`shrink-0 font-bold ${valueClass}`}>
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
  ).format(value || 0);
}

function formatStorage(
  mb: number
) {
  if (!mb) {
    return "0 MB";
  }

  if (mb < 1024) {
    return `${mb} MB`;
  }

  const gb =
    mb / 1024;

  return `${
    Number.isInteger(gb)
      ? gb
      : gb
          .toFixed(2)
          .replace(
            ".",
            ","
          )
  } GB`;
}