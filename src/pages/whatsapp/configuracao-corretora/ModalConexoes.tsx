import {
  Check,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

interface ModalConexoesProps {
  isOpen: boolean;
  onClose: () => void;
  quantidadeAtual: number;
  onSolicitar: (novaQuantidade: number) => Promise<void> | void;
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

export function ModalConexoes({
  isOpen,
  onClose,
  quantidadeAtual,
  onSolicitar,
}: ModalConexoesProps) {
  const [planos, setPlanos] = useState<WhatsappPlanoDb[]>([]);
  const [quantidade, setQuantidade] = useState(
    Math.max(2, quantidadeAtual + 1),
  );
  const [loading, setLoading] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setQuantidade(
      Math.max(2, quantidadeAtual + 1),
    );
    setErro("");

    let ativo = true;

    const carregar = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
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
          });

        if (error) {
          throw error;
        }

        if (!ativo) return;

        setPlanos(
          (data || []) as WhatsappPlanoDb[],
        );
      } catch (error: any) {
        console.error(
          "Erro ao carregar preços de WhatsApp:",
          error,
        );

        if (ativo) {
          setErro(
            error?.message ||
              "Não foi possível carregar as opções de conexão.",
          );
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [
    isOpen,
    quantidadeAtual,
  ]);

  const encontrarFaixa = (
    total: number,
  ) => {
    if (total <= 1) {
      return null;
    }

    return (
      planos.find(
        faixa =>
          total >=
            Number(
              faixa.total_conexoes_min,
            ) &&
          (
            faixa.total_conexoes_max ===
              null ||
            total <=
              Number(
                faixa.total_conexoes_max,
              )
          ),
      ) || null
    );
  };

  const calcularWhatsappMensal = (
    total: number,
  ) => {
    if (total <= 1) {
      return 0;
    }

    const faixa =
      encontrarFaixa(total);

    if (!faixa) {
      return 0;
    }

    const adicionais =
      Math.max(
        0,
        total - 1,
      );

    return (
      adicionais *
      Number(
        faixa.valor_unitario_adicional,
      )
    );
  };

  const faixaAtual = useMemo(
    () =>
      encontrarFaixa(
        quantidadeAtual,
      ),
    [
      quantidadeAtual,
      planos,
    ],
  );

  const faixaNova = useMemo(
    () =>
      encontrarFaixa(
        quantidade,
      ),
    [
      quantidade,
      planos,
    ],
  );

  const valorAtual = useMemo(
    () =>
      calcularWhatsappMensal(
        quantidadeAtual,
      ),
    [
      quantidadeAtual,
      planos,
    ],
  );

  const novoValor = useMemo(
    () =>
      calcularWhatsappMensal(
        quantidade,
      ),
    [
      quantidade,
      planos,
    ],
  );

  const acrescimoMensal =
    Math.max(
      0,
      novoValor - valorAtual,
    );

  const adicionaisAtuais =
    Math.max(
      0,
      quantidadeAtual - 1,
    );

  const novosAdicionais =
    Math.max(
      0,
      quantidade - 1,
    );

  const novasConexoes =
    Math.max(
      0,
      quantidade -
        quantidadeAtual,
    );

  const handleSolicitar =
    async () => {
      if (
        quantidade <=
        quantidadeAtual
      ) {
        return;
      }

      setSolicitando(true);
      setErro("");

      try {
        await onSolicitar(
          quantidade,
        );
      } catch (error: any) {
        console.error(
          "Erro ao solicitar conexões:",
          error,
        );

        setErro(
          error?.message ||
            "Não foi possível solicitar as novas conexões.",
        );
      } finally {
        setSolicitando(false);
      }
    };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <MessageCircle
                size={22}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Adicionar conexões WhatsApp
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Aumente a quantidade de números disponíveis na sua assinatura.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={solicitando}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8">
            <Loader2
              size={30}
              className="animate-spin text-emerald-600"
            />

            <p className="mt-3 text-sm font-medium text-slate-500">
              Carregando opções...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Contratadas hoje
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <Smartphone
                      size={19}
                      className="text-slate-500"
                    />

                    <span className="text-2xl font-bold text-slate-900">
                      {quantidadeAtual}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Nova quantidade
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <Smartphone
                      size={19}
                      className="text-emerald-600"
                    />

                    <span className="text-2xl font-bold text-emerald-700">
                      {quantidade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Total de conexões
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      A primeira conexão já está incluída na assinatura.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={
                        quantidade <=
                        quantidadeAtual + 1
                      }
                      onClick={() =>
                        setQuantidade(
                          atual =>
                            Math.max(
                              quantidadeAtual +
                                1,
                              atual - 1,
                            ),
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Minus
                        size={17}
                      />
                    </button>

                    <span className="min-w-[38px] text-center text-2xl font-black text-slate-900">
                      {quantidade}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantidade(
                          atual =>
                            Math.min(
                              50,
                              atual + 1,
                            ),
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <Plus
                        size={17}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Resumo
                </p>

                <div className="mt-4 space-y-3">
                  <ResumoLinha
                    label="Quantidade atual"
                    value={`${quantidadeAtual} conexão${
                      quantidadeAtual !== 1
                        ? "ões"
                        : ""
                    }`}
                  />

                  <ResumoLinha
                    label="Novas conexões"
                    value={`+ ${novasConexoes}`}
                    destaque
                  />

                  <ResumoLinha
                    label="Adicionais atuais"
                    value={`${adicionaisAtuais}`}
                  />

                  <ResumoLinha
                    label="Novos adicionais"
                    value={`${novosAdicionais}`}
                  />

                  <ResumoLinha
                    label="Valor unitário"
                    value={
                      faixaNova
                        ? `${formatMoney(
                            Number(
                              faixaNova.valor_unitario_adicional,
                            ),
                          )}/mês`
                        : "Incluso"
                    }
                  />
                </div>

                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Novo adicional WhatsApp
                      </p>

                      <p className="mt-1 text-2xl font-black text-white">
                        {formatMoney(
                          novoValor,
                        )}
                        <span className="ml-1 text-xs font-medium text-slate-400">
                          /mês
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400">
                        Acréscimo estimado
                      </p>

                      <p className="mt-1 text-lg font-bold text-emerald-400">
                        +{" "}
                        {formatMoney(
                          acrescimoMensal,
                        )}
                        /mês
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {faixaAtual &&
                faixaNova &&
                Number(
                  faixaNova.valor_unitario_adicional,
                ) <
                  Number(
                    faixaAtual.valor_unitario_adicional,
                  ) && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <Check
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <p className="text-xs leading-5 text-emerald-700">
                      Com essa quantidade, sua assinatura entra em uma faixa com valor unitário menor por conexão adicional.
                    </p>
                  </div>
                )}

              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <p className="text-xs leading-5 text-slate-400">
                Os valores apresentados seguem a tabela comercial vigente. A nova quantidade só deverá ficar disponível depois da confirmação da contratação.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={solicitando}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Agora não
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSolicitar()
                }
                disabled={
                  solicitando ||
                  quantidade <=
                    quantidadeAtual ||
                  !faixaNova
                }
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {solicitando ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Plus size={17} />
                )}

                Solicitar conexões
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResumoLinha({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">
        {label}
      </span>

      <span
        className={
          destaque
            ? "font-bold text-emerald-400"
            : "font-bold text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    Number(value) || 0,
  );
}