import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  buscarProdutosPortfolio,
  buscarSeguradorasPorProduto,
} from "../services/propostaPortfolioService";
import type {
  CriarPropostaItemPayload,
  ProdutoPortfolio,
  SeguradoraPortfolio,
} from "../types/propostas";

export type PropostaItemFormValue = Omit<
  CriarPropostaItemPayload,
  "proposta_id"
>;

interface PropostaItemFormProps {
  onSubmit: (item: PropostaItemFormValue) => void | Promise<void>;
  onCancel?: () => void;
  initialValue?: Partial<PropostaItemFormValue>;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  produtoFixoId?: string | null;
  produtoFixoNome?: string | null;
}

interface FormState {
  produto_id: string;
  seguradora_id: string;
  valor_premio: string;
  valor_liquido: string;
  numero_cotacao: string;
  parcelamento_cotado: string;
  meio_pagamento_cotado: string;
}

const ESTADO_INICIAL: FormState = {
  produto_id: "",
  seguradora_id: "",
  valor_premio: "",
  valor_liquido: "",
  numero_cotacao: "",
  parcelamento_cotado: "",
  meio_pagamento_cotado: "",
};

function moedaParaNumero(valor: string): number {
  const normalizado = valor
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : NaN;
}

function numeroParaCampo(valor?: number | null): string {
  if (valor === undefined || valor === null) return "";
  return String(valor).replace(".", ",");
}

export default function PropostaItemForm({
  onSubmit,
  onCancel,
  initialValue,
  submitLabel = "Adicionar item",
  loading = false,
  disabled = false,
  produtoFixoId = null,
  produtoFixoNome = null,
}: PropostaItemFormProps) {
  const [form, setForm] = useState<FormState>({
    ...ESTADO_INICIAL,
    produto_id:
      produtoFixoId ??
      initialValue?.produto_id ??
      "",
    
    seguradora_id: initialValue?.seguradora_id ?? "",
    valor_premio: numeroParaCampo(initialValue?.valor_premio),
    valor_liquido: numeroParaCampo(initialValue?.valor_liquido),
    numero_cotacao: initialValue?.numero_cotacao ?? "",
    parcelamento_cotado: initialValue?.parcelamento_cotado ?? "",
    meio_pagamento_cotado:
      initialValue?.meio_pagamento_cotado ?? "",
  });

  const [produtos, setProdutos] = useState<ProdutoPortfolio[]>([]);
  const [seguradoras, setSeguradoras] = useState<
    SeguradoraPortfolio[]
  >([]);

  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingSeguradoras, setLoadingSeguradoras] = useState(false);
  const [erro, setErro] = useState("");
  const produtoBloqueado = Boolean(produtoFixoId);
  const bloqueado = disabled || loading;

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoadingProdutos(true);
      setErro("");

      try {
        const lista = await buscarProdutosPortfolio();

        if (ativo) {
          setProdutos(lista);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar produtos do portfólio:",
          error
        );

        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os produtos."
          );
        }
      } finally {
        if (ativo) {
          setLoadingProdutos(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!form.produto_id) {
      setSeguradoras([]);
      return;
    }

    let ativo = true;

    async function carregar() {
      setLoadingSeguradoras(true);
      setErro("");

      try {
        const lista = await buscarSeguradorasPorProduto(
          form.produto_id
        );

        if (!ativo) return;

        setSeguradoras(lista);

        setForm((atual) => {
          if (
            atual.seguradora_id &&
            lista.some(
              (seguradora) =>
                seguradora.id === atual.seguradora_id
            )
          ) {
            return atual;
          }

          return {
            ...atual,
            seguradora_id: "",
          };
        });
      } catch (error) {
        console.error(
          "Erro ao carregar seguradoras do produto:",
          error
        );

        if (ativo) {
          setSeguradoras([]);
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as seguradoras."
          );
        }
      } finally {
        if (ativo) {
          setLoadingSeguradoras(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [form.produto_id]);

  useEffect(() => {
    if (!produtoFixoId) return;

    setForm((atual) => {
      if (atual.produto_id === produtoFixoId) {
        return atual;
      }

      return {
        ...atual,
        produto_id: produtoFixoId,
        seguradora_id: "",
      };
    });
  }, [produtoFixoId]);

  const produtoSelecionado = useMemo(
    () =>
      produtos.find(
        (produto) => produto.id === form.produto_id
      ) ?? null,
    [form.produto_id, produtos]
  );

  const seguradoraSelecionada = useMemo(
    () =>
      seguradoras.find(
        (seguradora) =>
          seguradora.id === form.seguradora_id
      ) ?? null,
    [form.seguradora_id, seguradoras]
  );

  function atualizar<K extends keyof FormState>(
    campo: K,
    valor: FormState[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setErro("");
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();

    if (bloqueado) return;

    const produtoIdFinal =
      produtoFixoId ?? form.produto_id;

    if (!produtoIdFinal) {
      setErro("Selecione o produto.");
      return;
    }

    if (!form.seguradora_id) {
      setErro("Selecione a seguradora.");
      return;
    }

    if (!form.valor_premio.trim()) {
      setErro("Informe o valor do prêmio.");
      return;
    }

    const valorPremio = moedaParaNumero(form.valor_premio);

    if (!Number.isFinite(valorPremio) || valorPremio < 0) {
      setErro("Informe um valor de prêmio válido.");
      return;
    }

    let valorLiquido: number | null = null;

    if (form.valor_liquido.trim()) {
      valorLiquido = moedaParaNumero(form.valor_liquido);

      if (
        !Number.isFinite(valorLiquido) ||
        valorLiquido < 0
      ) {
        setErro("Informe um valor líquido válido.");
        return;
      }
    }

    setErro("");

    await onSubmit({
      produto_id: produtoIdFinal,
      seguradora_id: form.seguradora_id,
      valor_premio: valorPremio,
      valor_liquido: valorLiquido,
      numero_cotacao:
        form.numero_cotacao.trim() || null,
      parcelamento_cotado:
        form.parcelamento_cotado.trim() || null,
      meio_pagamento_cotado:
        form.meio_pagamento_cotado.trim() || null,
      coberturas_franquias:
        initialValue?.coberturas_franquias ?? [],
      ordem: initialValue?.ordem ?? 0,
    });
  }

  return (
    <form
      onSubmit={salvar}
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
            Produto da proposta
          </h4>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Informe o produto, seguradora e condições apresentadas.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={bloqueado}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {erro && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0"
          />
          <span>{erro}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Produto *
            </label>

            {produtoBloqueado ? (
              <>
                <div className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {produtoFixoNome ||
                      produtoSelecionado?.nome ||
                      "Produto da renovação"}
                  </span>

                  <span className="ml-3 shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Fixo
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  O produto é definido pelo contrato de origem e
                  não pode ser alterado na renovação.
                </p>
              </>
            ) : (
              <div className="relative">
                <select
                  value={form.produto_id}
                  disabled={bloqueado || loadingProdutos}
                  onChange={(event) => {
                    setForm((atual) => ({
                      ...atual,
                      produto_id: event.target.value,
                      seguradora_id: "",
                    }));

                    setErro("");
                  }}
                  className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                >
                  <option value="">
                    {loadingProdutos
                      ? "Carregando produtos..."
                      : "Selecione o produto"}
                  </option>

                  {produtos.map((produto) => (
                    <option
                      key={produto.id}
                      value={produto.id}
                    >
                      {produto.nome}
                    </option>
                  ))}
                </select>

                {loadingProdutos ? (
                  <Loader2
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                  />
                ) : (
                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                )}
              </div>
            )}
          </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Seguradora *
          </label>

          <div className="relative">
            <select
              value={form.seguradora_id}
              disabled={
                bloqueado ||
                !form.produto_id ||
                loadingSeguradoras
              }
              onChange={(event) =>
                atualizar(
                  "seguradora_id",
                  event.target.value
                )
              }
              className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
            >
              <option value="">
                {!form.produto_id
                  ? "Selecione primeiro o produto"
                  : loadingSeguradoras
                  ? "Carregando seguradoras..."
                  : seguradoras.length === 0
                  ? "Nenhuma seguradora disponível"
                  : "Selecione a seguradora"}
              </option>

              {seguradoras.map((seguradora) => (
                <option
                  key={seguradora.id}
                  value={seguradora.id}
                >
                  {seguradora.nome}
                </option>
              ))}
            </select>

            {loadingSeguradoras ? (
              <Loader2
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
              />
            ) : (
              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Prêmio *
          </label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              R$
            </span>

            <input
              type="text"
              inputMode="decimal"
              value={form.valor_premio}
              disabled={bloqueado}
              onChange={(event) =>
                atualizar("valor_premio", event.target.value)
              }
              placeholder="0,00"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Valor líquido
          </label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              R$
            </span>

            <input
              type="text"
              inputMode="decimal"
              value={form.valor_liquido}
              disabled={bloqueado}
              onChange={(event) =>
                atualizar("valor_liquido", event.target.value)
              }
              placeholder="0,00"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nº da cotação
          </label>

          <input
            type="text"
            value={form.numero_cotacao}
            disabled={bloqueado}
            onChange={(event) =>
              atualizar("numero_cotacao", event.target.value)
            }
            placeholder="Número da cotação"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Parcelamento
          </label>

          <input
            type="text"
            value={form.parcelamento_cotado}
            disabled={bloqueado}
            onChange={(event) =>
              atualizar(
                "parcelamento_cotado",
                event.target.value
              )
            }
            placeholder="Ex.: 10x de R$ 175,00"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Meio de pagamento
          </label>

          <input
            type="text"
            value={form.meio_pagamento_cotado}
            disabled={bloqueado}
            onChange={(event) =>
              atualizar(
                "meio_pagamento_cotado",
                event.target.value
              )
            }
            placeholder="Ex.: Cartão de crédito, débito em conta..."
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
          />
        </div>
      </div>

      {produtoSelecionado && seguradoraSelecionada && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {produtoSelecionado.nome}
          </span>

          <span className="mx-2 text-slate-300 dark:text-slate-600">
            •
          </span>

          <span className="text-slate-600 dark:text-slate-300">
            {seguradoraSelecionada.nome}
          </span>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={bloqueado}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={bloqueado}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}

          {submitLabel}
        </button>
      </div>
    </form>
  );
}