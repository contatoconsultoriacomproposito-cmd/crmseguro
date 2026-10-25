import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FiltrosComissoes,
} from "../types/comissoes";

import {
  buscarDadosRelatorioComissoes,
  gerarPdfRelatorioComissoes,
  type DadosRelatorioComissoes,
} from "../services/comissoesRelatorioService";

import {
  formatarMoedaComissao,
} from "../services/comissoesCalculos";

interface ModalRelatorioComissoesProps {
  isOpen: boolean;
  onClose: () => void;
  filtros: FiltrosComissoes;
  filtrosDescricao?: string[];
  participanteNome?: string | null;
}

function formatarData(
  valor?: string | null
): string {
  if (!valor) return "Sem limite";

  const partes =
    valor.slice(0, 10).split("-");

  if (partes.length !== 3) {
    return valor;
  }

  const [ano, mes, dia] =
    partes;

  return `${dia}/${mes}/${ano}`;
}

export default function ModalRelatorioComissoes({
  isOpen,
  onClose,
  filtros,
  filtrosDescricao = [],
  participanteNome = null,
}: ModalRelatorioComissoesProps) {
  const [
    dados,
    setDados,
  ] =
    useState<DadosRelatorioComissoes | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    gerandoPdf,
    setGerandoPdf,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ativo = true;

    async function carregar() {
      try {
        setLoading(true);
        setErro(null);
        setDados(null);

        const resultado =
          await buscarDadosRelatorioComissoes(
            filtros
          );

        if (!ativo) {
          return;
        }

        setDados(resultado);
      } catch (error) {
        console.error(
          "Erro ao carregar relatório de comissões:",
          error
        );

        if (!ativo) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados do relatório."
        );
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [
    isOpen,
    filtros,
  ]);

  const periodo = useMemo(
    () => {
      const inicio =
        formatarData(
          filtros.data_inicio
        );

      const fim =
        formatarData(
          filtros.data_fim
        );

      return `${inicio} até ${fim}`;
    },
    [
      filtros.data_inicio,
      filtros.data_fim,
    ]
  );

  async function handleGerarPdf() {
    if (
      !dados ||
      gerandoPdf
    ) {
      return;
    }

    try {
      setGerandoPdf(true);
      setErro(null);

      gerarPdfRelatorioComissoes(
        dados,
        {
          filtrosDescricao,
          participanteNome,
        }
      );
    } catch (error) {
      console.error(
        "Erro ao gerar PDF de comissões:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF."
      );
    } finally {
      setGerandoPdf(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <FileText
                size={20}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Relatório detalhado de comissões
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Conferência financeira das comissões geradas pelas vendas no período.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Período da venda</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{periodo}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Comissão bruta</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {formatarMoedaComissao(dados?.resumo.valor_comissao_bruta ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{dados?.total ?? 0} comissão(ões)</p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">Total a receber</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {formatarMoedaComissao(dados?.resumo.valor_total_a_receber ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Ainda devido pelas seguradoras</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Total a pagar</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {formatarMoedaComissao(dados?.resumo.valor_total_a_pagar ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {participanteNome ? `Ainda devido a ${participanteNome}` : "Ainda devido aos participantes"}
              </p>
            </div>
          </div>

          {filtrosDescricao.length > 0 && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Filtros aplicados
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {filtrosDescricao.map(
                  (filtro) => (
                    <span
                      key={filtro}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {filtro}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                <Loader2
                  size={28}
                  className="animate-spin"
                />

                <p className="text-sm">
                  Preparando relatório detalhado...
                </p>
              </div>
            </div>
          )}

          {!loading && erro && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="text-sm font-semibold">
                  Não foi possível preparar o relatório
                </p>

                <p className="mt-1 text-xs leading-5">
                  {erro}
                </p>
              </div>
            </div>
          )}

          {!loading &&
            !erro &&
            dados &&
            dados.itens.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
                <FileText
                  size={30}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nenhuma comissão encontrada para os filtros atuais.
                </p>
              </div>
            )}

          {!loading &&
            !erro &&
            dados &&
            dados.itens.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Prévia do documento
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Exibindo os primeiros 15 registros. O PDF incluirá todos.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-white dark:bg-slate-950">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 font-medium">
                          Venda
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Cliente
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Apólice
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Produto
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Seguradora
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Comissão
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-900 dark:bg-slate-950">
                      {dados.itens
                        .slice(0, 15)
                        .map(({ item }) => (
                          <tr
                            key={item.comissao.id}
                            className="text-slate-700 dark:text-slate-300"
                          >
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatarData(
                                item.contrato
                                  .data_venda
                              )}
                            </td>

                            <td className="max-w-[260px] truncate px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                              {item.cliente?.nome ??
                                "Cliente não identificado"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              {item.contrato
                                .numero_apolice ??
                                "-"}
                            </td>

                            <td className="max-w-[220px] truncate px-4 py-3">
                              {item.produto_nome ??
                                "-"}
                            </td>

                            <td className="max-w-[220px] truncate px-4 py-3">
                              {item.seguradora_nome ??
                                "-"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                              {formatarMoedaComissao(
                                item.comissao
                                  .valor_comissao_bruta
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={
              loading ||
              gerandoPdf ||
              !dados ||
              dados.itens.length === 0
            }
            onClick={() => {
              void handleGerarPdf();
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {gerandoPdf ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Download size={16} />
            )}

            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
