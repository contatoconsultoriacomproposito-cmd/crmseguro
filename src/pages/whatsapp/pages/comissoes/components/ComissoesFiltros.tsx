import { useEffect, useState } from "react";
import {
  RotateCcw,
  Search,
} from "lucide-react";
import type {
  FiltrosComissoes,
  SituacaoPagamentoComissao,
  SituacaoRecebimentoComissao,
  TipoParticipanteComissao,
} from "../types/comissoes";
import {
  SITUACOES_PAGAMENTO_COMISSAO,
  SITUACOES_RECEBIMENTO_COMISSAO,
  TIPOS_PARTICIPANTE_COMISSAO,
} from "../types/comissoes";

interface OpcaoFiltro {
  value: string;
  label: string;
}

interface ComissoesFiltrosProps {
  filtros: FiltrosComissoes;
  loading?: boolean;
  temFiltrosAtivos?: boolean;
  corretores?: OpcaoFiltro[];
  seguradoras?: OpcaoFiltro[];
  produtos?: OpcaoFiltro[];
  participantes?: OpcaoFiltro[];
  onFiltroChange: <
    K extends keyof FiltrosComissoes
  >(
    campo: K,
    valor: FiltrosComissoes[K]
  ) => void;
  onLimpar: () => void;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950";

const selectClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950";

export function ComissoesFiltros({
  filtros,
  loading = false,
  temFiltrosAtivos = false,
  corretores = [],
  seguradoras = [],
  produtos = [],
  participantes = [],
  onFiltroChange,
  onLimpar,
}: ComissoesFiltrosProps) {
  const [dataInicioDigitada, setDataInicioDigitada] =
    useState(filtros.data_inicio ?? "");
  const [dataFimDigitada, setDataFimDigitada] =
    useState(filtros.data_fim ?? "");

  useEffect(() => {
    setDataInicioDigitada(
      filtros.data_inicio ?? ""
    );
  }, [filtros.data_inicio]);

  useEffect(() => {
    setDataFimDigitada(
      filtros.data_fim ?? ""
    );
  }, [filtros.data_fim]);

  const periodoAlterado =
    dataInicioDigitada !==
      (filtros.data_inicio ?? "") ||
    dataFimDigitada !==
      (filtros.data_fim ?? "");

  const periodoInvalido =
    Boolean(
      dataInicioDigitada &&
        dataFimDigitada &&
        dataFimDigitada < dataInicioDigitada
    );

  function aplicarPeriodo() {
    if (periodoInvalido) return;

    onFiltroChange(
      "data_inicio",
      dataInicioDigitada
    );

    onFiltroChange(
      "data_fim",
      dataFimDigitada
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Buscar
          </label>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={filtros.busca ?? ""}
              disabled={loading}
              onChange={(event) =>
                onFiltroChange(
                  "busca",
                  event.target.value
                )
              }
              placeholder="Cliente, apólice, produto, seguradora ou corretor..."
              className={`${inputClassName} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Data da venda - inicial
          </label>

          <input
            type="date"
            value={dataInicioDigitada}
            disabled={loading}
            onChange={(event) =>
              setDataInicioDigitada(
                event.target.value
              )
            }
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Data da venda - final
          </label>

          <input
            type="date"
            value={dataFimDigitada}
            disabled={loading}
            onChange={(event) =>
              setDataFimDigitada(
                event.target.value
              )
            }
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Corretor responsável
          </label>

          <select
            value={filtros.corretor_id ?? ""}
            disabled={loading}
            onChange={(event) =>
              onFiltroChange(
                "corretor_id",
                event.target.value
              )
            }
            className={selectClassName}
          >
            <option value="">
              Todos os corretores
            </option>

            {corretores.map((opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Seguradora
          </label>

          <select
            value={filtros.seguradora_id ?? ""}
            disabled={loading}
            onChange={(event) =>
              onFiltroChange(
                "seguradora_id",
                event.target.value
              )
            }
            className={selectClassName}
          >
            <option value="">
              Todas as seguradoras
            </option>

            {seguradoras.map((opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Produto
          </label>

          <select
            value={filtros.produto_id ?? ""}
            disabled={loading}
            onChange={(event) =>
              onFiltroChange(
                "produto_id",
                event.target.value
              )
            }
            className={selectClassName}
          >
            <option value="">
              Todos os produtos
            </option>

            {produtos.map((opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Situação do recebimento
          </label>

          <select
            value={
              filtros.situacao_recebimento ??
              ""
            }
            disabled={loading}
            onChange={(event) =>
              onFiltroChange(
                "situacao_recebimento",
                event.target
                  .value as
                  | SituacaoRecebimentoComissao
                  | ""
              )
            }
            className={selectClassName}
          >
            <option value="">
              Todas
            </option>

            {SITUACOES_RECEBIMENTO_COMISSAO.map(
              (opcao) => (
                <option
                  key={opcao.value}
                  value={opcao.value}
                >
                  {opcao.label}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Situação do pagamento
          </label>

          <select
            value={
              filtros.situacao_pagamento ??
              ""
            }
            disabled={loading}
            onChange={(event) =>
              onFiltroChange(
                "situacao_pagamento",
                event.target
                  .value as
                  | SituacaoPagamentoComissao
                  | ""
              )
            }
            className={selectClassName}
          >
            <option value="">
              Todas
            </option>

            {SITUACOES_PAGAMENTO_COMISSAO.map(
              (opcao) => (
                <option
                  key={opcao.value}
                  value={opcao.value}
                >
                  {opcao.label}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Tipo de participante
          </label>

          <select
            value={
              filtros.tipo_participante ??
              ""
            }
            disabled={loading}
            onChange={(event) => {
              onFiltroChange(
                "tipo_participante",
                event.target.value as
                  | TipoParticipanteComissao
                  | ""
              );
              onFiltroChange(
                "participante_id",
                ""
              );
            }}
            className={selectClassName}
          >
            <option value="">
              Todos
            </option>

            {TIPOS_PARTICIPANTE_COMISSAO.map(
              (opcao) => (
                <option
                  key={opcao.value}
                  value={opcao.value}
                >
                  {opcao.label}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Participante específico
          </label>

          <select
            value={filtros.participante_id ?? ""}
            disabled={loading || participantes.length === 0}
            onChange={(event) =>
              onFiltroChange(
                "participante_id",
                event.target.value
              )
            }
            className={selectClassName}
          >
            <option value="">
              Todos os participantes
            </option>

            {participantes.map((opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={
            loading ||
            !periodoAlterado ||
            periodoInvalido
          }
          onClick={aplicarPeriodo}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Aplicar período
        </button>

        {periodoInvalido && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            A data final não pode ser anterior à data inicial.
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {temFiltrosAtivos
            ? "Filtros ativos na consulta."
            : "Nenhum filtro adicional aplicado."}
        </div>

        <button
          type="button"
          disabled={
            loading ||
            !temFiltrosAtivos
          }
          onClick={onLimpar}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <RotateCcw size={15} />
          Limpar filtros
        </button>
      </div>
    </div>
  );
}