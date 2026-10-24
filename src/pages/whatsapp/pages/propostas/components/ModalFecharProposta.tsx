import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  
  FileCheck2,
  Loader2,
  X,
} from "lucide-react";
import { fecharProposta } from "../services/propostasService";
import type {
  PropostaDetalhada,
  PropostaItem,
  ResultadoFechamentoProposta,
} from "../types/propostas";

interface ModalFecharPropostaProps {
  open: boolean;
  proposta: PropostaDetalhada;
  onClose: () => void;
  onSuccess?: (
    resultado: ResultadoFechamentoProposta
  ) => void;
}

interface ItemFechamentoState {
  selecionado: boolean;
  valor_aceito: string;
}

function hojeLocal(): string {
  const agora = new Date();
  const offset = agora.getTimezoneOffset();

  return new Date(
    agora.getTime() - offset * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
}

function formatarMoeda(
  valor?: number | null
): string {
  return Number(valor ?? 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function numeroParaCampo(
  valor?: number | null
): string {
  if (valor === undefined || valor === null) {
    return "";
  }

  return Number(valor).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function campoParaNumero(
  valor: string
): number {
  const limpo = valor
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(limpo);

  return Number.isFinite(numero)
    ? numero
    : NaN;
}

function criarEstadoItens(
  itens: PropostaItem[]
): Record<string, ItemFechamentoState> {
  const estado: Record<
    string,
    ItemFechamentoState
  > = {};

  itens.forEach((item) => {
    if (item.resultado !== "PENDENTE") {
      return;
    }

    estado[item.id] = {
      selecionado: false,
      valor_aceito: numeroParaCampo(
        item.valor_premio
      ),
    };
  });

  return estado;
}

export default function ModalFecharProposta({
  open,
  proposta,
  onClose,
  onSuccess,
}: ModalFecharPropostaProps) {
  const itensPendentes = useMemo(
    () =>
      proposta.itens.filter(
        (item) =>
          item.resultado === "PENDENTE"
      ),
    [proposta.itens]
  );

  const [itens, setItens] = useState<
    Record<string, ItemFechamentoState>
  >(() => criarEstadoItens(itensPendentes));

  const [dataVenda, setDataVenda] =
    useState(hojeLocal());

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setItens(
      criarEstadoItens(itensPendentes)
    );

    setDataVenda(hojeLocal());
    setErro(null);
    setSalvando(false);
  }, [open, itensPendentes]);

  const itensSelecionados = useMemo(
    () =>
      itensPendentes.filter(
        (item) =>
          itens[item.id]?.selecionado
      ),
    [itensPendentes, itens]
  );

  const quantidadeSelecionada =
    itensSelecionados.length;

  const totalSelecionado = useMemo(() => {
    return itensSelecionados.reduce(
      (total, item) => {
        const valor =
          campoParaNumero(
            itens[item.id]?.valor_aceito ??
              ""
          );

        return total +
          (Number.isFinite(valor)
            ? valor
            : 0);
      },
      0
    );
  }, [itensSelecionados, itens]);

  const totalOfertadoPendentes =
    useMemo(() => {
      return itensPendentes.reduce(
        (total, item) =>
          total +
          Number(
            item.valor_premio ?? 0
          ),
        0
      );
    }, [itensPendentes]);

  const totalNaoContratado =
    totalOfertadoPendentes -
    itensSelecionados.reduce(
      (total, item) =>
        total +
        Number(item.valor_premio ?? 0),
      0
    );

  function alternarItem(
    item: PropostaItem
  ) {
    setItens((atual) => ({
      ...atual,
      [item.id]: {
        ...atual[item.id],
        selecionado:
          !atual[item.id]?.selecionado,
        valor_aceito:
          atual[item.id]?.valor_aceito ||
          numeroParaCampo(
            item.valor_premio
          ),
      },
    }));

    setErro(null);
  }

  function alterarValorAceito(
    itemId: string,
    valor: string
  ) {
    setItens((atual) => ({
      ...atual,
      [itemId]: {
        ...atual[itemId],
        selecionado: true,
        valor_aceito: valor,
      },
    }));

    setErro(null);
  }

  function selecionarTodos() {
    setItens((atual) => {
      const novo = {
        ...atual,
      };

      itensPendentes.forEach(
        (item) => {
          novo[item.id] = {
            selecionado: true,
            valor_aceito:
              atual[item.id]
                ?.valor_aceito ||
              numeroParaCampo(
                item.valor_premio
              ),
          };
        }
      );

      return novo;
    });

    setErro(null);
  }

  function limparSelecao() {
    setItens((atual) => {
      const novo = {
        ...atual,
      };

      Object.keys(novo).forEach(
        (itemId) => {
          novo[itemId] = {
            ...novo[itemId],
            selecionado: false,
          };
        }
      );

      return novo;
    });

    setErro(null);
  }

  function validar(): string | null {
    if (
      proposta.status !==
      "EM_NEGOCIACAO"
    ) {
      return "A proposta não está mais em negociação.";
    }

    if (!dataVenda) {
      return "Informe a data da venda.";
    }

    if (
      dataVenda <
      proposta.data_emissao
    ) {
      return "A data da venda não pode ser anterior à emissão da proposta.";
    }

    if (
      quantidadeSelecionada === 0
    ) {
      return "Selecione pelo menos um produto contratado.";
    }

    for (const item of itensSelecionados) {
      const valor =
        campoParaNumero(
          itens[item.id]?.valor_aceito ??
            ""
        );

      if (
        !Number.isFinite(valor) ||
        valor < 0
      ) {
        return `Informe um valor aceito válido para ${
          item.produto?.nome ??
          "o produto selecionado"
        }.`;
      }
    }

    return null;
  }

  async function confirmarFechamento() {
    if (salvando) return;

    const validacao = validar();

    if (validacao) {
      setErro(validacao);
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const resultado =
        await fecharProposta({
          proposta_id: proposta.id,
          data_venda: dataVenda,
          itens_contratados:
            itensSelecionados.map(
              (item) => ({
                item_id: item.id,
                valor_aceito:
                  campoParaNumero(
                    itens[item.id]
                      .valor_aceito
                  ),
              })
            ),
        });

      onSuccess?.(resultado);
    } catch (error) {
      console.error(
        "Erro ao fechar proposta:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível fechar a proposta."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FileCheck2 size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Fechar Venda
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {proposta.numero_proposta}
                {" • "}
                Selecione os produtos contratados pelo cliente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {erro && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{erro}</span>
            </div>
          )}

          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Produtos da negociação
                </h3>

                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Marque apenas os itens efetivamente aceitos pelo cliente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selecionarTodos}
                  disabled={
                    salvando ||
                    itensPendentes.length === 0
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Check size={14} />
                  Selecionar todos
                </button>

                <button
                  type="button"
                  onClick={limparSelecao}
                  disabled={
                    salvando ||
                    quantidadeSelecionada === 0
                  }
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Limpar
                </button>
              </div>
            </div>

            {itensPendentes.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Não existem itens pendentes para fechamento.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                        <th className="w-14 px-4 py-3" />

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Produto
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Seguradora
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Cotação
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ofertado
                        </th>

                        <th className="w-[190px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Valor aceito
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {itensPendentes.map(
                        (item) => {
                          const estado =
                            itens[item.id];

                          const selecionado =
                            Boolean(
                              estado?.selecionado
                            );

                          return (
                            <tr
                              key={item.id}
                              className={
                                selecionado
                                  ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                                  : "transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                              }
                            >
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    alternarItem(
                                      item
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${
                                    selecionado
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-slate-300 bg-white text-transparent hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-900"
                                  }`}
                                >
                                  <Check
                                    size={14}
                                  />
                                </button>
                              </td>

                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {item.produto
                                    ?.nome ||
                                    "Produto"}
                                </p>

                                {item
                                  .parcelamento_cotado && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      item.parcelamento_cotado
                                    }
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {item
                                    .seguradora
                                    ?.nome ||
                                    "Seguradora"}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <p className="text-sm text-slate-700 dark:text-slate-200">
                                  {item.numero_cotacao ||
                                    "—"}
                                </p>

                                {item.meio_pagamento_cotado && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      item.meio_pagamento_cotado
                                    }
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4 text-right">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {formatarMoeda(
                                    item.valor_premio
                                  )}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                    R$
                                  </span>

                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      estado?.valor_aceito ??
                                      ""
                                    }
                                    disabled={
                                      salvando ||
                                      !selecionado
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      alterarValorAceito(
                                        item.id,
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-right text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

          <section>
            <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data da venda *
                </label>

                <input
                  type="date"
                  value={dataVenda}
                  min={
                    proposta.data_emissao
                  }
                  disabled={salvando}
                  onChange={(event) => {
                    setDataVenda(
                      event.target.value
                    );

                    setErro(null);
                  }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Atenção ao fechamento
                </p>

                <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  Os itens marcados serão registrados como contratados. Os demais itens pendentes serão preservados como não contratados. Após o fechamento, a proposta não poderá mais ser editada diretamente.
                </p>
              </div>
            </div>
          </section>

          <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

          <section>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total ofertado
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {formatarMoeda(
                    proposta.valor_total_ofertado
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Selecionados
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {quantidadeSelecionada}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Total vendido
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatarMoeda(
                    totalSelecionado
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Não contratado
                </p>

                <p className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-200">
                  {formatarMoeda(
                    totalNaoContratado
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {quantidadeSelecionada === 0
              ? "Selecione pelo menos um produto contratado."
              : `${quantidadeSelecionada} ${
                  quantidadeSelecionada === 1
                    ? "produto selecionado"
                    : "produtos selecionados"
                } para fechamento.`}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() =>
                void confirmarFechamento()
              }
              disabled={
                salvando ||
                quantidadeSelecionada ===
                  0
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 size={16} />
              )}

              Confirmar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}