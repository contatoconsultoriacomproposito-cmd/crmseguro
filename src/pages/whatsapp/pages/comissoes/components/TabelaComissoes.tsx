import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
} from "lucide-react";
import type { ItemComissaoGeral } from "../types/comissoes";
import {
  formatarMoedaComissao,
  formatarPercentualComissao,
} from "../services/comissoesCalculos";

interface TabelaComissoesProps {
  itens: ItemComissaoGeral[];
  loading?: boolean;
  pagina: number;
  totalPaginas: number;
  total: number;
  onAbrirComissao: (item: ItemComissaoGeral) => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
  onIrParaPagina?: (pagina: number) => void;
}

function formatarModoProvisionamento(
  modo: ItemComissaoGeral["comissao"]["modo_provisionamento"]
): string {
  switch (modo) {
    case "ANTECIPADO":
      return "Antecipado";
    case "PARCELADO":
      return "Parcelado";
    case "VINCULADO_A_PARCELAS":
      return "Vinculado às parcelas";
    case "VITALICIO_PROVISIONADO":
      return "Vitalício provisionado";
    default:
      return modo;
  }
}

function obterIdentificacaoCliente(
  item: ItemComissaoGeral
): string {
  if (!item.cliente) {
    return "Cliente não identificado";
  }

  return item.cliente.nome;
}

function obterTipoCliente(
  item: ItemComissaoGeral
): string {
  if (!item.cliente) return "—";
  return item.cliente.tipo;
}

function obterComissaoConfigurada(
  item: ItemComissaoGeral
): string {
  const comissao = item.comissao;

  if (
    comissao.tipo_calculo_comissao ===
    "PERCENTUAL"
  ) {
    return formatarPercentualComissao(
      comissao.percentual_comissao
    );
  }

  return formatarMoedaComissao(
    comissao.valor_comissao_fixa
  );
}

function obterSituacaoRecebimento(
  item: ItemComissaoGeral
): {
  label: string;
  className: string;
} {
  const resumo = item.resumo_recebimentos;

  if (resumo.valor_atrasado > 0) {
    return {
      label: "Atrasado",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    };
  }

  if (resumo.valor_recebe_hoje > 0) {
    return {
      label: "Recebe hoje",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  if (resumo.valor_a_receber > 0) {
    return {
      label: "A receber",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    };
  }

  if (
    resumo.quantidade_recebidas > 0 &&
    resumo.quantidade_pendentes === 0
  ) {
    return {
      label: "Recebida",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  if (
    resumo.quantidade_canceladas > 0 &&
    resumo.quantidade_pendentes === 0 &&
    resumo.quantidade_recebidas === 0
  ) {
    return {
      label: "Cancelada",
      className:
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
    };
  }

  return {
    label: "Sem pendência",
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  };
}

function obterSituacaoPagamento(
  item: ItemComissaoGeral
): {
  label: string;
  className: string;
} {
  const resumo = item.resumo_pagamentos;

  if (resumo.valor_atrasado > 0) {
    return {
      label: "Atrasado",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    };
  }

  if (resumo.valor_vence_hoje > 0) {
    return {
      label: "Vence hoje",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  if (resumo.valor_a_pagar > 0) {
    return {
      label: "A pagar",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    };
  }

  if (
    resumo.quantidade_pagas > 0 &&
    resumo.quantidade_pendentes === 0
  ) {
    return {
      label: "Paga",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  if (
    resumo.quantidade_canceladas > 0 &&
    resumo.quantidade_pendentes === 0 &&
    resumo.quantidade_pagas === 0
  ) {
    return {
      label: "Cancelada",
      className:
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
    };
  }

  return {
    label: "Sem pendência",
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  };
}

function BadgeSituacao({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function TabelaComissoes({
  itens,
  loading = false,
  pagina,
  totalPaginas,
  total,
  onAbrirComissao,
  onPaginaAnterior,
  onProximaPagina,
  onIrParaPagina,
}: TabelaComissoesProps) {
  const podeVoltar = pagina > 1;
  const podeAvancar =
    totalPaginas > 0 &&
    pagina < totalPaginas;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Comissões
          </h3>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {total} registro(s) encontrado(s)
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2
              size={14}
              className="animate-spin"
            />
            Atualizando...
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1450px] w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Cliente
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Apólice
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Produto
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Seguradora
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Corretor
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Base
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Comissão
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Bruta
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Provisionamento
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Recebimento
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Pagamentos
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Residual
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && itens.length === 0 ? (
              Array.from({ length: 6 }).map(
                (_, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                  >
                    {Array.from({
                      length: 13,
                    }).map((__, coluna) => (
                      <td
                        key={coluna}
                        className="px-4 py-4"
                      >
                        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                )
              )
            ) : itens.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-12 text-center"
                >
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nenhuma comissão encontrada.
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Ajuste os filtros ou registre
                    uma comissão para um contrato.
                  </p>
                </td>
              </tr>
            ) : (
              itens.map((item) => {
                const situacaoRecebimento =
                  obterSituacaoRecebimento(
                    item
                  );

                const situacaoPagamento =
                  obterSituacaoPagamento(
                    item
                  );

                return (
                  <tr
                    key={item.comissao.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80 last:border-b-0 dark:border-slate-900 dark:hover:bg-slate-900/40"
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-[220px]">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {obterIdentificacaoCliente(
                            item
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {obterTipoCliente(item)}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {item.contrato
                          .numero_apolice ||
                          "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-300">
                        {item.produto_nome ||
                          "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-300">
                        {item.seguradora_nome ||
                          "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-300">
                        {item.corretor_nome ||
                          "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {formatarMoedaComissao(
                          item.comissao
                            .valor_base_calculo
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {obterComissaoConfigurada(
                            item
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {item.comissao
                            .tipo_calculo_comissao ===
                          "PERCENTUAL"
                            ? "Percentual"
                            : "Valor fixo"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatarMoedaComissao(
                          item.comissao
                            .valor_comissao_bruta
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {formatarModoProvisionamento(
                            item.comissao
                              .modo_provisionamento
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {
                            item.comissao
                              .quantidade_provisoes
                          }{" "}
                          provisão(ões)
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <BadgeSituacao
                          {...situacaoRecebimento}
                        />

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatarMoedaComissao(
                            item
                              .resumo_recebimentos
                              .valor_pendente
                          )}{" "}
                          pendente
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <BadgeSituacao
                          {...situacaoPagamento}
                        />

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatarMoedaComissao(
                            item
                              .resumo_pagamentos
                              .valor_pendente
                          )}{" "}
                          pendente
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatarMoedaComissao(
                          item.resumo_splits
                            .valor_residual_corretora
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        title="Visualizar comissão"
                        onClick={() =>
                          onAbrirComissao(item)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Página {pagina}
          {totalPaginas > 0
            ? ` de ${totalPaginas}`
            : ""}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={
              loading || !podeVoltar
            }
            onClick={onPaginaAnterior}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ChevronLeft size={15} />
            Anterior
          </button>

          {onIrParaPagina &&
            totalPaginas > 1 && (
              <div className="hidden items-center gap-1 md:flex">
                {Array.from({
                  length: Math.min(
                    totalPaginas,
                    5
                  ),
                }).map((_, index) => {
                  let numero =
                    index + 1;

                  if (
                    totalPaginas > 5 &&
                    pagina > 3
                  ) {
                    numero =
                      Math.min(
                        totalPaginas - 4,
                        pagina - 2
                      ) + index;
                  }

                  const ativo =
                    numero === pagina;

                  return (
                    <button
                      type="button"
                      key={numero}
                      disabled={loading}
                      onClick={() =>
                        onIrParaPagina(
                          numero
                        )
                      }
                      className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        ativo
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                      }`}
                    >
                      {numero}
                    </button>
                  );
                })}
              </div>
            )}

          <button
            type="button"
            disabled={
              loading || !podeAvancar
            }
            onClick={onProximaPagina}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Próxima
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}