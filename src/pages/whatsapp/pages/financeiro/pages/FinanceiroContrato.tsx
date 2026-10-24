import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  ReceiptText,
  RefreshCw,
  WalletCards,
  FilePlus2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../../../../../auth/AuthContext";


import ModalBaixaParcela from "../components/ModalBaixaParcela";
import ModalEditarParcelamento from "../components/ModalEditarParcelamento";
import ModalEstornoBaixa from "../components/ModalEstornoBaixa";
import TabelaParcelasFinanceiras from "../components/TabelaParcelasFinanceiras";
import ModalBaixaLote from "../components/ModalBaixaLote";
import ModalLancamentoAvulso from "../components/ModalLancamentoAvulso";
import ModalReconstruirFinanceiro from "../components/ModalReconstruirFinanceiro";

import type {
  ContextoPermissaoFinanceiro,
  FinanceiroContratoDetalhado,
  ParcelaFinanceiraComSituacao,
} from "../types/financeiro";

import {
  formatarFormaPagamento,
  formatarMoeda,
} from "../services/financeiroCalculos";

import {
  buscarFinanceiroContratoDetalhado,
} from "../services/financeiroService";

import {
  podeOperarFinanceiro,
} from "../services/financeiroPermissoes";

interface FinanceiroContratoProps {
  contratoId?: string;
  onVoltar?: () => void;
}

export default function FinanceiroContrato({
  contratoId: contratoIdProp,
  onVoltar,
}: FinanceiroContratoProps) {
  const navigate = useNavigate();
  const params = useParams();
  const { userProfile } = useAuth();

  const contratoId =
    contratoIdProp ??
    params.contratoId ??
    "";

  const [
    financeiro,
    setFinanceiro,
  ] = useState<FinanceiroContratoDetalhado | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    atualizando,
    setAtualizando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState<string | null>(null);

  const [
    parcelaParaBaixa,
    setParcelaParaBaixa,
  ] = useState<ParcelaFinanceiraComSituacao | null>(null);

  const [
    parcelaEstorno,
    setParcelaEstorno,
  ] = useState<ParcelaFinanceiraComSituacao | null>(null);

  const [
    modalBaixaLote,
    setModalBaixaLote,
  ] = useState(false);

  const [
    parcelasSelecionadas,
    setParcelasSelecionadas,
  ] = useState<string[]>([]);

  const [
    modalEditarParcelamento,
    setModalEditarParcelamento,
  ] = useState(false);

  const [
    modalLancamentoAvulso,
    setModalLancamentoAvulso,
  ] = useState(false);

  const [
    modalReconstruir,
    setModalReconstruir,
  ] = useState(false);

  const contextoFinanceiro =
    useMemo<ContextoPermissaoFinanceiro | null>(() => {
      if (!userProfile) {
        return null;
      }

      if (
        userProfile.tipo_usuario !== "CORRETORA" &&
        userProfile.tipo_usuario !== "CORRETOR" &&
        userProfile.tipo_usuario !== "ADMIN"
      ) {
        return null;
      }

      return {
        tipoUsuario:
          userProfile.tipo_usuario,
        usuarioId:
          userProfile.id,
      };
    }, [userProfile]);

  const usuarioPodeOperar =
    contextoFinanceiro
      ? podeOperarFinanceiro(
          contextoFinanceiro,
        )
      : false;

  const carregarFinanceiro =
    useCallback(
      async (
        mostrarLoadingPrincipal = false,
      ) => {
        if (!contratoId) {
          setFinanceiro(null);
          setErro(
            "Contrato não informado.",
          );
          setLoading(false);
          return;
        }

        if (mostrarLoadingPrincipal) {
          setLoading(true);
        } else {
          setAtualizando(true);
        }

        setErro(null);

        try {
          const resultado =
            await buscarFinanceiroContratoDetalhado(
              contratoId,
            );

          setFinanceiro(resultado);

          if (!resultado) {
            setErro(
              "Nenhum financeiro foi lançado para este contrato.",
            );
          }
        } catch (error) {
          console.error(
            "Erro ao carregar financeiro do contrato:",
            error,
          );

          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o financeiro do contrato.";

          setFinanceiro(null);
          setErro(mensagem);
        } finally {
          setLoading(false);
          setAtualizando(false);
        }
      },
      [contratoId],
    );

  useEffect(() => {
    void carregarFinanceiro(true);
  }, [carregarFinanceiro]);

  const voltar = () => {
    if (onVoltar) {
      onVoltar();
      return;
    }

    navigate(-1);
  };

  const atualizar = async () => {
    try {
      await carregarFinanceiro(false);
    } catch (error) {
      console.error(
        "Erro ao atualizar financeiro:",
        error,
      );

      toast.error(
        "Não foi possível atualizar os dados financeiros.",
      );
    }
  };

  const abrirBaixa = (
    parcela: ParcelaFinanceiraComSituacao,
  ) => {
    if (!usuarioPodeOperar) {
      toast.error(
        "Você não possui permissão para realizar baixas financeiras.",
      );
      return;
    }

    if (
      parcela.status !== "PENDENTE"
    ) {
      toast.error(
        "Somente parcelas pendentes podem receber baixa.",
      );
      return;
    }

    setParcelaParaBaixa(
      parcela,
    );
  };

  const abrirEdicao = (
    parcela: ParcelaFinanceiraComSituacao,
  ) => {
    if (!usuarioPodeOperar) {
      toast.error(
        "Você não possui permissão para editar parcelas financeiras.",
      );
      return;
    }

    if (
      parcela.tipo_lancamento !== "PARCELA" ||
      parcela.status !== "PENDENTE"
    ) {
      toast.error(
        "Somente parcelas pendentes podem ser editadas.",
      );
      return;
    }

    setModalEditarParcelamento(
      true,
    );
  };

  const abrirEstorno = (
    parcela: ParcelaFinanceiraComSituacao,
  ) => {
    if (!usuarioPodeOperar) {
      toast.error(
        "Você não possui permissão para estornar baixas financeiras.",
      );
      return;
    }

    if (parcela.status !== "PAGA") {
      toast.error(
        "Somente parcelas pagas podem ter a baixa estornada.",
      );
      return;
    }

    setParcelaEstorno(parcela);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2
            size={28}
            className="animate-spin text-blue-600"
          />

          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Carregando financeiro
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Buscando parcelas e movimentações do contrato...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    !financeiro ||
    erro
  ) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={voltar}
            className="mb-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
              <AlertTriangle
                size={22}
              />
            </div>

            <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              Financeiro indisponível
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {erro ??
                "Nenhum financeiro foi encontrado para este contrato."}
            </p>

            <button
              type="button"
              onClick={() =>
                void carregarFinanceiro(
                  true,
                )
              }
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw
                size={16}
              />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    financeiro: cabecalho,
    parcelas,
    resumo,
  } = financeiro;

  const parcelasSelecionadasLote =
  parcelas.filter(
    (parcela) =>
      parcelasSelecionadas.includes(
        parcela.id,
      ) &&
      parcela.status ===
        "PENDENTE",
  );

const valorSelecionadoLote =
  parcelasSelecionadasLote.reduce(
    (total, parcela) =>
      total +
      Number(
        parcela.valor || 0,
      ),
    0,
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={voltar}
              title="Voltar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Financeiro do contrato
                </h1>

                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Lançado
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {formatarFormaPagamento(
                  cabecalho.forma_pagamento,
                )}
                {" • "}
                {
                  cabecalho.quantidade_parcelas
                }{" "}
                {cabecalho.quantidade_parcelas ===
                1
                  ? "parcela"
                  : "parcelas"}
                {cabecalho.baixa_automatica
                  ? " • Baixa automática"
                  : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void atualizar()
            }
            disabled={atualizando}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <RefreshCw
              size={16}
              className={
                atualizando
                  ? "animate-spin"
                  : ""
              }
            />

            {atualizando
              ? "Atualizando..."
              : "Atualizar"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <WalletCards
                size={15}
              />
              Total
            </div>

            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              {formatarMoeda(
                resumo.valor_total,
              )}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              <CheckCircle2
                size={15}
              />
              Pago
            </div>

            <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-300">
              {formatarMoeda(
                resumo.valor_pago,
              )}
            </p>

            <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-400/70">
              {
                resumo.quantidade_pagas
              }{" "}
              {resumo.quantidade_pagas ===
              1
                ? "lançamento pago"
                : "lançamentos pagos"}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-400">
              <CalendarClock
                size={15}
              />
              A vencer
            </div>

            <p className="mt-2 text-xl font-semibold text-blue-800 dark:text-blue-300">
              {formatarMoeda(
                resumo.valor_a_vencer,
              )}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              <Clock3 size={15} />
              Vence hoje
            </div>

            <p className="mt-2 text-xl font-semibold text-amber-800 dark:text-amber-300">
              {formatarMoeda(
                resumo.valor_vence_hoje,
              )}
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
              <AlertTriangle
                size={15}
              />
              Atrasado
            </div>

            <p className="mt-2 text-xl font-semibold text-red-800 dark:text-red-300">
              {formatarMoeda(
                resumo.valor_atrasado,
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            {parcelasSelecionadasLote.length >
              0 && (
              <div className="mb-3 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    {
                      parcelasSelecionadasLote.length
                    }{" "}
                    {parcelasSelecionadasLote.length ===
                    1
                      ? "parcela selecionada"
                      : "parcelas selecionadas"}
                  </p>

                  <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                    Total selecionado:{" "}
                    {formatarMoeda(
                      valorSelecionadoLote,
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setParcelasSelecionadas(
                        [],
                      )
                    }
                    className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    Limpar seleção
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setModalBaixaLote(
                        true,
                      )
                    }
                    disabled={
                      !usuarioPodeOperar
                    }
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={15}
                    />

                    Baixar selecionadas (
                    {
                      parcelasSelecionadasLote.length
                    })
                  </button>
                </div>
              </div>
            )}

  
            <TabelaParcelasFinanceiras
              parcelas={parcelas}
              podeOperar={
                usuarioPodeOperar
              }
              loading={
                atualizando
              }
              parcelasSelecionadas={
                parcelasSelecionadas
              }
              onSelecionadasChange={
                setParcelasSelecionadas
              }
              onBaixar={
                abrirBaixa
              }
              onEditar={
                abrirEdicao
              }
              onEstornar={
                abrirEstorno
              }
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <CircleDollarSign
                  size={17}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Resumo
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Pendente
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatarMoeda(
                      resumo.valor_pendente,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Parcelas pendentes
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {
                      resumo.quantidade_pendentes
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Canceladas
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {
                      resumo.quantidade_canceladas
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Valor cancelado
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatarMoeda(
                      resumo.valor_cancelado,
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Avulsos
                    </span>

                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatarMoeda(
                        resumo.valor_avulso,
                      )}
                    </span>
                  </div>
                </div>
                {usuarioPodeOperar && (
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setModalLancamentoAvulso(
                          true,
                        )
                      }
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
                    >
                      <FilePlus2
                        size={15}
                      />
                      Novo lançamento avulso
                    </button>

                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          setModalReconstruir(
                            true,
                          )
                        }
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-900/60 dark:bg-slate-950 dark:text-amber-300 dark:hover:bg-amber-950/20"
                      >
                        <RefreshCw
                          size={14}
                        />
                        Reconstruir financeiro
                      </button>

                      <p className="mt-2 text-[10px] leading-4 text-slate-400">
                        Substitui o parcelamento atual preservando o histórico financeiro.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-start gap-2.5">
                <ReceiptText
                  size={16}
                  className="mt-0.5 shrink-0 text-slate-400"
                />

                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Controle financeiro
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    Este módulo acompanha o pagamento do prêmio pelo cliente à seguradora.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/*
          Mantemos o card disponível neste componente porque ele será
          útil caso FinanceiroContrato seja reutilizado futuramente
          em uma composição menor. Não o renderizamos aqui para evitar
          duplicar o resumo da página.
        */}
        
      </div>

      <ModalBaixaParcela
        open={Boolean(
          parcelaParaBaixa,
        )}
        financeiroId={
          cabecalho.id
        }
        parcela={
          parcelaParaBaixa
        }
        onClose={() =>
          setParcelaParaBaixa(
            null,
          )
        }
        onSaved={async () => {
          setParcelaParaBaixa(
            null,
          );

          setParcelasSelecionadas(
            [],
          );

          await carregarFinanceiro(
            false,
          );
        }}
      />

      <ModalEstornoBaixa
        open={Boolean(
          parcelaEstorno,
        )}
        financeiroId={
          cabecalho.id
        }
        parcela={
          parcelaEstorno
        }
        onClose={() =>
          setParcelaEstorno(
            null,
          )
        }
        onSaved={async () => {
          setParcelaEstorno(
            null,
          );

          await carregarFinanceiro(
            false,
          );
        }}
      />

      <ModalEditarParcelamento
        open={
          modalEditarParcelamento
        }
        financeiroId={
          cabecalho.id
        }
        parcelas={
          parcelas
        }
        onClose={() =>
          setModalEditarParcelamento(
            false,
          )
        }
        onSaved={async () => {
          setModalEditarParcelamento(
            false,
          );

          setParcelasSelecionadas(
            [],
          );

          await carregarFinanceiro(
            false,
          );
        }}
      />

      <ModalBaixaLote
      open={
        modalBaixaLote
      }
      financeiroId={
        cabecalho.id
      }
      parcelas={
        parcelasSelecionadasLote
      }
      onClose={() =>
        setModalBaixaLote(
          false,
        )
      }
      onSaved={async () => {
        setModalBaixaLote(
          false,
        );

        setParcelasSelecionadas(
          [],
        );

        await carregarFinanceiro(
          false,
        );
      }}
    />

    <ModalLancamentoAvulso
      open={
        modalLancamentoAvulso
      }
      financeiroId={
        cabecalho.id
      }
      onClose={() =>
        setModalLancamentoAvulso(
          false,
        )
      }
      onSaved={async () => {
        setModalLancamentoAvulso(
          false,
        );

        setParcelasSelecionadas(
          [],
        );

        await carregarFinanceiro(
          false,
        );
      }}
    />

    <ModalReconstruirFinanceiro
      open={
        modalReconstruir
      }
      financeiro={
        financeiro
      }
      onClose={() =>
        setModalReconstruir(
          false,
        )
      }
      onSaved={async () => {
        setModalReconstruir(
          false,
        );

        setParcelasSelecionadas(
          [],
        );

        await carregarFinanceiro(
          false,
        );
      }}
    />


    </div>
  );
}