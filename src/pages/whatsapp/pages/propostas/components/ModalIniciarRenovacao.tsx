import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  buscarCorretoresProposta,
  type CorretorProposta,
} from "../services/propostaCorretoresService";
import { iniciarRenovacaoContrato } from "../services/propostasService";
import type {
  ContratoResumo,
  PropostaClienteResumo,
  PropostaItem,
  ResultadoInicioRenovacao,
} from "../types/propostas";

interface ModalIniciarRenovacaoProps {
  open: boolean;
  contrato: ContratoResumo | null;
  cliente: PropostaClienteResumo | null;
  item?: PropostaItem | null;
  corretorAtualId?: string | null;
  onClose: () => void;
  onSuccess?: (resultado: ResultadoInicioRenovacao) => void;
}

function formatarMoeda(valor?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor ?? 0));
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarDocumento(
  documento?: string | null,
) {
  if (!documento) return "Documento não informado";

  const numeros = documento.replace(/\D/g, "");

  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4",
    );
  }

  if (numeros.length === 14) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return documento;
}

export default function ModalIniciarRenovacao({
  open,
  contrato,
  cliente,
  item = null,
  corretorAtualId = null,
  onClose,
  onSuccess,
}: ModalIniciarRenovacaoProps) {
  const [corretores, setCorretores] = useState<
    CorretorProposta[]
  >([]);
  const [corretorId, setCorretorId] =
    useState("");
  const [loadingCorretores, setLoadingCorretores] =
    useState(false);
  const [salvando, setSalvando] =
    useState(false);
  const [erro, setErro] = useState("");

  const corretorSelecionado = useMemo(
    () =>
      corretores.find(
        (corretor) => corretor.id === corretorId,
      ) ?? null,
    [corretores, corretorId],
  );

  useEffect(() => {
    if (!open) return;

    let ativo = true;

    async function carregarCorretores() {
      try {
        setLoadingCorretores(true);
        setErro("");

        const lista =
          await buscarCorretoresProposta();

        if (!ativo) return;

        setCorretores(lista);

        const atualDisponivel =
          corretorAtualId &&
          lista.some(
            (corretor) =>
              corretor.id === corretorAtualId,
          );

        setCorretorId(
          atualDisponivel
            ? corretorAtualId
            : "",
        );
      } catch (error) {
        if (!ativo) return;

        console.error(
          "Erro ao carregar responsáveis:",
          error,
        );

        setCorretores([]);
        setCorretorId("");
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os responsáveis.",
        );
      } finally {
        if (ativo) {
          setLoadingCorretores(false);
        }
      }
    }

    void carregarCorretores();

    return () => {
      ativo = false;
    };
  }, [open, corretorAtualId]);

  useEffect(() => {
    if (open) return;

    setCorretores([]);
    setCorretorId("");
    setErro("");
    setSalvando(false);
  }, [open]);

  if (!open || !contrato) {
    return null;
  }

  const handleClose = () => {
    if (salvando) return;
    onClose();
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (salvando) return;

    if (contrato.status !== "ATIVO") {
      setErro(
        "Somente contratos ativos podem iniciar uma renovação.",
      );
      return;
    }

    if (!cliente) {
      setErro(
        "Não foi possível identificar o cliente deste contrato.",
      );
      return;
    }

    if (!corretorId) {
      setErro(
        "Selecione o responsável pela renovação.",
      );
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const resultado =
        await iniciarRenovacaoContrato({
          contrato_id: contrato.id,
          corretor_id: corretorId,
        });

      if (resultado.renovacao_existente) {
        toast.info(
          "Já existe uma renovação em negociação para este contrato.",
        );
      } else {
        toast.success(
          "Proposta de renovação criada com sucesso.",
        );
      }

      onSuccess?.(resultado);
    } catch (error) {
      console.error(
        "Erro ao iniciar renovação:",
        error,
      );

      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a renovação.";

      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <RefreshCw size={21} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Iniciar renovação
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Crie uma nova proposta vinculada ao
                contrato atual.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={salvando}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {erro && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <span>{erro}</span>
              </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Contrato de origem
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Apólice
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {contrato.numero_apolice ||
                      "Não informada"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Vigência
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    <CalendarDays size={14} />
                    <span>
                      {formatarData(
                        contrato.inicio_vigencia,
                      )}{" "}
                      até{" "}
                      {formatarData(
                        contrato.fim_vigencia,
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Valor atual
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatarMoeda(
                      contrato.valor_atual,
                    )}
                  </p>
                </div>
              </div>

              {item && (
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <FileText
                      size={16}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.produto?.nome ||
                          "Produto"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {item.seguradora?.nome ||
                          "Seguradora não informada"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-4 flex items-center gap-2">
                <UserRound
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Cliente
                </h3>
              </div>

              {cliente ? (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {cliente.nome}
                    </p>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {cliente.tipo}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {formatarDocumento(
                      cliente.documento,
                    )}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    O cliente é herdado do contrato de
                    origem e não pode ser alterado nesta
                    renovação.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Cliente não identificado.
                </p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="corretor-renovacao"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Responsável pela renovação
                </label>

                {corretorSelecionado && (
                  <span className="text-xs text-slate-400">
                    {corretorSelecionado.tipo_usuario ===
                    "CORRETORA"
                      ? "Corretora"
                      : "Corretor"}
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  id="corretor-renovacao"
                  value={corretorId}
                  onChange={(event) => {
                    setCorretorId(
                      event.target.value,
                    );
                    setErro("");
                  }}
                  disabled={
                    loadingCorretores || salvando
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">
                    {loadingCorretores
                      ? "Carregando responsáveis..."
                      : "Selecione o responsável"}
                  </option>

                  {corretores.map((corretor) => (
                    <option
                      key={corretor.id}
                      value={corretor.id}
                    >
                      {corretor.nome}
                      {corretor.tipo_usuario ===
                      "CORRETORA"
                        ? " — Corretora"
                        : ""}
                    </option>
                  ))}
                </select>

                {loadingCorretores && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                  />
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                O responsável pode ser diferente do
                corretor do contrato original.
              </p>
            </section>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Será criada uma nova proposta do tipo{" "}
                <strong>Renovação</strong>. Nenhuma
                informação do contrato atual será
                alterada.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={handleClose}
              disabled={salvando}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                salvando ||
                loadingCorretores ||
                !cliente ||
                !corretorId
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Criando renovação...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Iniciar renovação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}