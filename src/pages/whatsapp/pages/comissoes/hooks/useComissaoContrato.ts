import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CancelarProvisaoComissaoPayload,
  ComissaoContratoDetalhada,
  CriarComissaoPayload,
  EstornarPagamentoComissaoPayload,
  EstornarRecebimentoComissaoPayload,
  PagarComissaoSplitPayload,
  ReceberComissaoPayload,
  ReverterCancelamentoProvisaoComissaoPayload,
  ResultadoCriarComissao,
  ResultadoOperacaoComissao,
} from "../types/comissoes";
import {
  buscarComissaoContratoDetalhada,
  cancelarProvisaoComissao,
  estornarPagamentoComissao,
  estornarRecebimentoComissao,
  pagarComissaoSplit,
  receberComissao,
  reverterCancelamentoProvisaoComissao,
  salvarComissaoContrato,
} from "../services/comissoesService";

interface UseComissaoContratoOptions {
  contratoId?: string | null;
  incluirMovimentacoes?: boolean;
  carregarAutomaticamente?: boolean;
}

interface EstadoOperacao {
  salvando: boolean;
  recebendo: boolean;
  estornandoRecebimento: boolean;
  pagando: boolean;
  estornandoPagamento: boolean;
  cancelandoProvisao: boolean;
  revertendoCancelamento: boolean;
}

const ESTADO_OPERACAO_INICIAL: EstadoOperacao = {
  salvando: false,
  recebendo: false,
  estornandoRecebimento: false,
  pagando: false,
  estornandoPagamento: false,
  cancelandoProvisao: false,
  revertendoCancelamento: false,
};

export function useComissaoContrato(
  options: UseComissaoContratoOptions = {}
) {
  const {
    contratoId = null,
    incluirMovimentacoes = true,
    carregarAutomaticamente = true,
  } = options;

  const [dados, setDados] =
    useState<ComissaoContratoDetalhada | null>(null);

  const [loading, setLoading] = useState(
    Boolean(contratoId && carregarAutomaticamente)
  );

  const [erro, setErro] = useState<string | null>(null);

  const [operacoes, setOperacoes] =
    useState<EstadoOperacao>(
      ESTADO_OPERACAO_INICIAL
    );

  const definirOperacao = useCallback(
    (
      campo: keyof EstadoOperacao,
      valor: boolean
    ) => {
      setOperacoes((atual) => ({
        ...atual,
        [campo]: valor,
      }));
    },
    []
  );

  const carregar = useCallback(
    async (
      idContrato: string | null | undefined =
        contratoId
    ): Promise<ComissaoContratoDetalhada | null> => {
      if (!idContrato) {
        setDados(null);
        setErro(null);
        setLoading(false);
        return null;
      }

      setLoading(true);
      setErro(null);

      try {
        const resultado =
          await buscarComissaoContratoDetalhada(
            idContrato,
            incluirMovimentacoes
          );

        setDados(resultado);

        return resultado;
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a comissão do contrato.";

        setErro(mensagem);
        setDados(null);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      contratoId,
      incluirMovimentacoes,
    ]
  );

  useEffect(() => {
    if (!carregarAutomaticamente) return;

    let ativo = true;

    async function executar() {
      if (!contratoId) {
        if (ativo) {
          setDados(null);
          setErro(null);
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setErro(null);

      try {
        const resultado =
          await buscarComissaoContratoDetalhada(
            contratoId,
            incluirMovimentacoes
          );

        if (!ativo) return;

        setDados(resultado);
      } catch (error) {
        if (!ativo) return;

        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a comissão do contrato.";

        setErro(mensagem);
        setDados(null);
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    executar();

    return () => {
      ativo = false;
    };
  }, [
    contratoId,
    incluirMovimentacoes,
    carregarAutomaticamente,
  ]);

  const salvar = useCallback(
    async (
      payload: CriarComissaoPayload
    ): Promise<ResultadoCriarComissao> => {
      definirOperacao("salvando", true);
      setErro(null);

      try {
        const resultado =
          await salvarComissaoContrato(
            payload
          );

        await carregar(
          payload.contrato_id
        );

        return resultado;
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a comissão.";

        setErro(mensagem);

        throw error;
      } finally {
        definirOperacao("salvando", false);
      }
    },
    [
      carregar,
      definirOperacao,
    ]
  );

  const receber = useCallback(
    async (
      payload: ReceberComissaoPayload
    ): Promise<ResultadoOperacaoComissao> => {
      definirOperacao("recebendo", true);
      setErro(null);

      try {
        const resultado =
          await receberComissao(
            payload
          );

        await carregar();

        return resultado;
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o recebimento.";

        setErro(mensagem);

        throw error;
      } finally {
        definirOperacao("recebendo", false);
      }
    },
    [
      carregar,
      definirOperacao,
    ]
  );

  const estornarRecebimento =
    useCallback(
      async (
        payload: EstornarRecebimentoComissaoPayload
      ): Promise<ResultadoOperacaoComissao> => {
        definirOperacao(
          "estornandoRecebimento",
          true
        );

        setErro(null);

        try {
          const resultado =
            await estornarRecebimentoComissao(
              payload
            );

          await carregar();

          return resultado;
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível estornar o recebimento.";

          setErro(mensagem);

          throw error;
        } finally {
          definirOperacao(
            "estornandoRecebimento",
            false
          );
        }
      },
      [
        carregar,
        definirOperacao,
      ]
    );

  const pagar = useCallback(
    async (
      payload: PagarComissaoSplitPayload
    ): Promise<ResultadoOperacaoComissao> => {
      definirOperacao("pagando", true);
      setErro(null);

      try {
        const resultado =
          await pagarComissaoSplit(
            payload
          );

        await carregar();

        return resultado;
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o pagamento.";

        setErro(mensagem);

        throw error;
      } finally {
        definirOperacao("pagando", false);
      }
    },
    [
      carregar,
      definirOperacao,
    ]
  );

  const estornarPagamento =
    useCallback(
      async (
        payload: EstornarPagamentoComissaoPayload
      ): Promise<ResultadoOperacaoComissao> => {
        definirOperacao(
          "estornandoPagamento",
          true
        );

        setErro(null);

        try {
          const resultado =
            await estornarPagamentoComissao(
              payload
            );

          await carregar();

          return resultado;
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível estornar o pagamento.";

          setErro(mensagem);

          throw error;
        } finally {
          definirOperacao(
            "estornandoPagamento",
            false
          );
        }
      },
      [
        carregar,
        definirOperacao,
      ]
    );

  const cancelarProvisao =
    useCallback(
      async (
        payload: CancelarProvisaoComissaoPayload
      ): Promise<ResultadoOperacaoComissao> => {
        definirOperacao(
          "cancelandoProvisao",
          true
        );

        setErro(null);

        try {
          const resultado =
            await cancelarProvisaoComissao(
              payload
            );

          await carregar();

          return resultado;
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível cancelar a provisão.";

          setErro(mensagem);

          throw error;
        } finally {
          definirOperacao(
            "cancelandoProvisao",
            false
          );
        }
      },
      [
        carregar,
        definirOperacao,
      ]
    );

  const reverterCancelamento =
    useCallback(
      async (
        payload: ReverterCancelamentoProvisaoComissaoPayload
      ): Promise<ResultadoOperacaoComissao> => {
        definirOperacao(
          "revertendoCancelamento",
          true
        );

        setErro(null);

        try {
          const resultado =
            await reverterCancelamentoProvisaoComissao(
              payload
            );

          await carregar();

          return resultado;
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível reverter o cancelamento.";

          setErro(mensagem);

          throw error;
        } finally {
          definirOperacao(
            "revertendoCancelamento",
            false
          );
        }
      },
      [
        carregar,
        definirOperacao,
      ]
    );

  const possuiComissao =
    Boolean(dados?.comissao);

  const possuiRecebimentos =
    Boolean(
      dados?.recebimentos.length
    );

  const possuiSplits =
    Boolean(
      dados?.splits.length
    );

  const possuiPagamentos =
    Boolean(
      dados?.pagamentos.length
    );

  const possuiMovimentacoes =
    Boolean(
      dados?.movimentacoes?.length
    );

  const operando = useMemo(
    () =>
      Object.values(operacoes).some(
        Boolean
      ),
    [operacoes]
  );

  const recebimentosPendentes =
    useMemo(
      () =>
        dados?.recebimentos.filter(
          (item) =>
            item.status === "PENDENTE"
        ) ?? [],
      [dados?.recebimentos]
    );

  const recebimentosRecebidos =
    useMemo(
      () =>
        dados?.recebimentos.filter(
          (item) =>
            item.status === "RECEBIDA"
        ) ?? [],
      [dados?.recebimentos]
    );

  const recebimentosCancelados =
    useMemo(
      () =>
        dados?.recebimentos.filter(
          (item) =>
            item.status === "CANCELADA"
        ) ?? [],
      [dados?.recebimentos]
    );

  const pagamentosPendentes =
    useMemo(
      () =>
        dados?.pagamentos.filter(
          (item) =>
            item.status === "PENDENTE"
        ) ?? [],
      [dados?.pagamentos]
    );

  const pagamentosPagos =
    useMemo(
      () =>
        dados?.pagamentos.filter(
          (item) =>
            item.status === "PAGA"
        ) ?? [],
      [dados?.pagamentos]
    );

  const pagamentosCancelados =
    useMemo(
      () =>
        dados?.pagamentos.filter(
          (item) =>
            item.status === "CANCELADA"
        ) ?? [],
      [dados?.pagamentos]
    );

  return {
    dados,
    comissao:
      dados?.comissao ?? null,
    deducoes:
      dados?.deducoes ?? [],
    recebimentos:
      dados?.recebimentos ?? [],
    splits:
      dados?.splits ?? [],
    splitDeducoes:
      dados?.split_deducoes ?? [],
    pagamentos:
      dados?.pagamentos ?? [],
    movimentacoes:
      dados?.movimentacoes ?? [],
    resumoRecebimentos:
      dados?.resumo_recebimentos ?? null,
    resumoPagamentos:
      dados?.resumo_pagamentos ?? null,
    resumoSplits:
      dados?.resumo_splits ?? null,

    loading,
    erro,
    operando,
    operacoes,

    possuiComissao,
    possuiRecebimentos,
    possuiSplits,
    possuiPagamentos,
    possuiMovimentacoes,

    recebimentosPendentes,
    recebimentosRecebidos,
    recebimentosCancelados,
    pagamentosPendentes,
    pagamentosPagos,
    pagamentosCancelados,

    carregar,
    recarregar: carregar,
    salvar,
    receber,
    estornarRecebimento,
    pagar,
    estornarPagamento,
    cancelarProvisao,
    reverterCancelamento,
  };
}