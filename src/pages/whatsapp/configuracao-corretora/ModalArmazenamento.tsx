import {
  AlertTriangle,
  Check,
  Database,
  HardDrive,
  Loader2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../../lib/supabaseClient";

interface StoragePlanoDb {
  id: string;
  codigo: string;
  nome: string;
  adicional_bytes: number;
  valor_mensal: number;
  ativo: boolean;
  ordem: number;
}

export interface StoragePlanoSelecionado {
  planoId: string;
  codigo: string;
  nome: string;
  adicionalBytes: number;
  valorMensal: number;
}

interface ModalArmazenamentoProps {
  isOpen: boolean;
  onClose: () => void;

  limiteAtualBytes: number;
  usadoBytes: number;

  motivo?: "LIMITE_ATINGIDO" | "GESTAO";

  onSolicitar: (
    plano: StoragePlanoSelecionado,
  ) => Promise<void> | void;
}

function numeroSeguro(
  value: unknown,
): number {
  const numero = Number(value);

  return Number.isFinite(numero)
    ? Math.max(0, numero)
    : 0;
}

function formatBytes(
  bytes: number,
): string {
  const valor =
    numeroSeguro(bytes);

  if (valor === 0) {
    return "0 MB";
  }

  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  const tb = gb * 1024;

  if (valor >= tb) {
    return `${(
      valor / tb
    ).toFixed(2)} TB`;
  }

  if (valor >= gb) {
    const quantidade =
      valor / gb;

    return `${quantidade.toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits:
          quantidade < 10 ? 2 : 1,
        maximumFractionDigits: 2,
      },
    )} GB`;
  }

  return `${(
    valor / mb
  ).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits:
        valor < mb ? 2 : 0,
      maximumFractionDigits: 2,
    },
  )} MB`;
}

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    numeroSeguro(value),
  );
}

function percentualUso(
  usadoBytes: number,
  limiteBytes: number,
): number {
  if (
    limiteBytes <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (usadoBytes /
        limiteBytes) *
        100,
    ),
  );
}

export default function ModalArmazenamento({
  isOpen,
  onClose,
  limiteAtualBytes,
  usadoBytes,
  motivo = "LIMITE_ATINGIDO",
  onSolicitar,
}: ModalArmazenamentoProps) {
  const [
    planos,
    setPlanos,
  ] =
    useState<
      StoragePlanoDb[]
    >([]);

  const [
    planoSelecionadoId,
    setPlanoSelecionadoId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ativo = true;

    const carregar =
      async () => {
        setLoading(true);
        setError("");
        setPlanoSelecionadoId(
          "",
        );

        try {
          const {
            data,
            error:
              queryError,
          } =
            await supabase
              .from(
                "crm_storage_planos",
              )
              .select(`
                id,
                codigo,
                nome,
                adicional_bytes,
                valor_mensal,
                ativo,
                ordem
              `)
              .eq(
                "ativo",
                true,
              )
              .gt(
                "adicional_bytes",
                0,
              )
              .order(
                "ordem",
                {
                  ascending:
                    true,
                },
              );

          if (
            queryError
          ) {
            throw queryError;
          }

          if (!ativo) {
            return;
          }

          const lista =
            (
              data ??
              []
            ).map(
              plano => ({
                ...plano,
                adicional_bytes:
                  numeroSeguro(
                    plano.adicional_bytes,
                  ),
                valor_mensal:
                  numeroSeguro(
                    plano.valor_mensal,
                  ),
              }),
            ) as StoragePlanoDb[];

          setPlanos(
            lista,
          );

          if (
            lista.length >
            0
          ) {
            setPlanoSelecionadoId(
              lista[0].id,
            );
          }
        } catch (
          currentError
        ) {
          console.error(
            "Erro ao carregar planos de armazenamento:",
            currentError,
          );

          if (ativo) {
            setPlanos(
              [],
            );

            setError(
              "Não foi possível carregar as opções de armazenamento.",
            );
          }
        } finally {
          if (ativo) {
            setLoading(
              false,
            );
          }
        }
      };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [isOpen]);

  const limiteAtual =
    numeroSeguro(
      limiteAtualBytes,
    );

  const usado =
    numeroSeguro(
      usadoBytes,
    );

  const disponivelAtual =
    Math.max(
      0,
      limiteAtual -
        usado,
    );

  const percentualAtual =
    percentualUso(
      usado,
      limiteAtual,
    );

  const planoSelecionado =
    useMemo(
      () =>
        planos.find(
          plano =>
            plano.id ===
            planoSelecionadoId,
        ) ?? null,
      [
        planos,
        planoSelecionadoId,
      ],
    );

  const novoLimite =
    limiteAtual +
    numeroSeguro(
      planoSelecionado
        ?.adicional_bytes,
    );

  const novoDisponivel =
    Math.max(
      0,
      novoLimite -
        usado,
    );

  const novoPercentual =
    percentualUso(
      usado,
      novoLimite,
    );

  const handleSolicitar =
    async () => {
      if (
        !planoSelecionado ||
        submitting
      ) {
        return;
      }

      try {
        setSubmitting(
          true,
        );

        await onSolicitar({
          planoId:
            planoSelecionado.id,
          codigo:
            planoSelecionado.codigo,
          nome:
            planoSelecionado.nome,
          adicionalBytes:
            planoSelecionado.adicional_bytes,
          valorMensal:
            planoSelecionado.valor_mensal,
        });
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                motivo ===
                "LIMITE_ATINGIDO"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-cyan-50 text-cyan-600"
              }`}
            >
              {motivo ===
              "LIMITE_ATINGIDO" ? (
                <AlertTriangle
                  size={22}
                />
              ) : (
                <HardDrive
                  size={22}
                />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {motivo ===
                "LIMITE_ATINGIDO"
                  ? "Espaço de armazenamento esgotado"
                  : "Aumentar armazenamento"}
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                {motivo ===
                "LIMITE_ATINGIDO"
                  ? "Seu limite atual não possui espaço suficiente para este arquivo. Escolha uma capacidade adicional para continuar armazenando arquivos."
                  : "Escolha uma capacidade adicional para ampliar o armazenamento da sua corretora."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              submitting
            }
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X
              size={19}
            />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <ResumoCard
              label="Contratado"
              value={
                formatBytes(
                  limiteAtual,
                )
              }
            />

            <ResumoCard
              label="Utilizado"
              value={
                formatBytes(
                  usado,
                )
              }
            />

            <ResumoCard
              label="Disponível"
              value={
                formatBytes(
                  disponivelAtual,
                )
              }
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-slate-600">
                Uso atual
              </span>

              <span className="font-semibold text-slate-800">
                {percentualAtual.toLocaleString(
                  "pt-BR",
                  {
                    maximumFractionDigits: 1,
                  },
                )}
                %
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  percentualAtual >=
                  95
                    ? "bg-red-500"
                    : percentualAtual >=
                        80
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                }`}
                style={{
                  width: `${percentualAtual}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-slate-500">
              <span>
                {formatBytes(
                  usado,
                )}{" "}
                utilizados
              </span>

              <span>
                Limite{" "}
                {formatBytes(
                  limiteAtual,
                )}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Escolha o espaço adicional
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                O valor selecionado será acrescentado mensalmente à sua assinatura.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Carregando opções...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : planos.length ===
              0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Nenhuma opção adicional de armazenamento está disponível no momento.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {planos.map(
                  plano => {
                    const selecionado =
                      plano.id ===
                      planoSelecionadoId;

                    return (
                      <button
                        key={
                          plano.id
                        }
                        type="button"
                        onClick={() =>
                          setPlanoSelecionadoId(
                            plano.id,
                          )
                        }
                        className={`relative rounded-xl border p-4 text-left transition ${
                          selecionado
                            ? "border-cyan-500 bg-cyan-50/70 ring-1 ring-cyan-500"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {selecionado && (
                          <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-white">
                            <Check
                              size={
                                14
                              }
                            />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              selecionado
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Database
                              size={
                                19
                              }
                            />
                          </div>

                          <div className="min-w-0 pr-7">
                            <div className="text-base font-semibold text-slate-900">
                              +
                              {formatBytes(
                                plano.adicional_bytes,
                              )}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {
                                plano.nome
                              }
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <span className="text-base font-bold text-slate-900">
                            {formatMoney(
                              plano.valor_mensal,
                            )}
                          </span>

                          <span className="ml-1 text-xs text-slate-500">
                            /mês
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {planoSelecionado && (
            <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                <HardDrive
                  size={17}
                />
                Como ficará seu armazenamento
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ResumoInterno
                  label="Novo limite"
                  value={
                    formatBytes(
                      novoLimite,
                    )
                  }
                />

                <ResumoInterno
                  label="Disponível"
                  value={
                    formatBytes(
                      novoDisponivel,
                    )
                  }
                />

                <ResumoInterno
                  label="Novo uso"
                  value={`${novoPercentual.toLocaleString(
                    "pt-BR",
                    {
                      maximumFractionDigits: 1,
                    },
                  )}%`}
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-cyan-100 pt-4">
                <span className="text-sm text-cyan-800">
                  Acréscimo mensal
                </span>

                <span className="text-lg font-bold text-cyan-950">
                  {formatMoney(
                    planoSelecionado.valor_mensal,
                  )}
                  <span className="ml-1 text-xs font-medium text-cyan-700">
                    /mês
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              submitting
            }
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/70 disabled:opacity-50"
          >
            Agora não
          </button>

          <button
            type="button"
            disabled={
              !planoSelecionado ||
              loading ||
              submitting
            }
            onClick={() =>
              void handleSolicitar()
            }
            className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Solicitando...
              </>
            ) : (
              "Solicitar aumento"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResumoCardProps {
  label: string;
  value: string;
}

function ResumoCard({
  label,
  value,
}: ResumoCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function ResumoInterno({
  label,
  value,
}: ResumoCardProps) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-cyan-700">
        {label}
      </div>

      <div className="mt-1 text-sm font-bold text-cyan-950">
        {value}
      </div>
    </div>
  );
}