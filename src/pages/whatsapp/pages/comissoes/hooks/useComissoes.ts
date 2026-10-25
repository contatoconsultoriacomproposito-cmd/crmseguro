import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../../../../../auth/AuthContext";

import type {
  FiltrosComissoes,
  ResultadoBuscaComissoesGeral,
  ResultadoBuscaMinhasComissoesCorretor,
} from "../types/comissoes";

import {
  buscarComissoesGeral,
  buscarMinhasComissoesCorretor,
} from "../services/comissoesService";

const FILTROS_INICIAIS: FiltrosComissoes = {
  busca: "",
  data_inicio: "",
  data_fim: "",
  corretor_id: "",
  seguradora_id: "",
  produto_id: "",
  situacao_recebimento: "",
  situacao_pagamento: "",
  tipo_participante: "",
  contrato_id: "",
  cliente_id: "",
  pagina: 1,
  limite: 20,
};

const RESULTADO_INICIAL_CORRETORA: ResultadoBuscaComissoesGeral = {
  itens: [],
  resumo: {
    valor_comissao_bruta: 0,

    valor_total_a_receber: 0,
    valor_a_receber: 0,
    valor_recebe_hoje: 0,
    valor_atrasado_recebimento: 0,
    valor_recebido: 0,

    valor_total_a_pagar: 0,
    valor_a_pagar: 0,
    valor_vence_hoje_pagamento: 0,
    valor_atrasado_pagamento: 0,
    valor_pago: 0,

    valor_residual_corretora: 0,
    quantidade_comissoes: 0,
  },
  total: 0,
  pagina: 1,
  limite: 20,
  total_paginas: 0,
};

const RESULTADO_INICIAL_CORRETOR: ResultadoBuscaMinhasComissoesCorretor = {
  itens: [],
  resumo: {
    valor_bruto: 0,
    valor_deducoes: 0,
    valor_liquido: 0,
    valor_a_receber: 0,
    valor_vence_hoje: 0,
    valor_atrasado: 0,
    valor_pago: 0,
    quantidade_comissoes: 0,
  },
  total: 0,
  pagina: 1,
  limite: 20,
  total_paginas: 0,
};

export function useComissoes() {
  const { userProfile } = useAuth();

  const visao =
    userProfile?.tipo_usuario ===
    "CORRETOR"
      ? "CORRETOR"
      : "CORRETORA";

  const [
    filtros,
    setFiltros,
  ] = useState<FiltrosComissoes>(
    FILTROS_INICIAIS
  );

  const [
    resultadoCorretora,
    setResultadoCorretora,
  ] =
    useState<ResultadoBuscaComissoesGeral>(
      RESULTADO_INICIAL_CORRETORA
    );

  const [
    resultadoCorretor,
    setResultadoCorretor,
  ] =
    useState<ResultadoBuscaMinhasComissoesCorretor>(
      RESULTADO_INICIAL_CORRETOR
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState<string | null>(
    null
  );

  const carregarDados =
    useCallback(
      async (
        filtrosBusca: FiltrosComissoes
      ) => {
        if (
          userProfile?.tipo_usuario ===
          "CORRETOR"
        ) {
          const dados =
            await buscarMinhasComissoesCorretor(
              filtrosBusca
            );

          return {
            tipo:
              "CORRETOR" as const,
            dados,
          };
        }

        const dados =
          await buscarComissoesGeral(
            filtrosBusca
          );

        return {
          tipo:
            "CORRETORA" as const,
          dados,
        };
      },
      [userProfile]
    );

  const carregar =
    useCallback(
      async (
        filtrosBusca: FiltrosComissoes =
          filtros
      ) => {
        if (!userProfile) {
          return;
        }

        setLoading(true);
        setErro(null);

        try {
          const resultado =
            await carregarDados(
              filtrosBusca
            );

          if (
            resultado.tipo ===
            "CORRETOR"
          ) {
            setResultadoCorretor(
              resultado.dados
            );
          } else {
            setResultadoCorretora(
              resultado.dados
            );
          }
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as comissões.";

          setErro(mensagem);

          if (
            userProfile.tipo_usuario ===
            "CORRETOR"
          ) {
            setResultadoCorretor(
              RESULTADO_INICIAL_CORRETOR
            );
          } else {
            setResultadoCorretora(
              RESULTADO_INICIAL_CORRETORA
            );
          }
        } finally {
          setLoading(false);
        }
      },
      [
        carregarDados,
        filtros,
        userProfile,
      ]
    );

  useEffect(() => {
    let ativo = true;

    async function executar() {
      if (!userProfile) {
        return;
      }

      setLoading(true);
      setErro(null);

      try {
        const resultado =
          await carregarDados(
            filtros
          );

        if (!ativo) return;

        if (
          resultado.tipo ===
          "CORRETOR"
        ) {
          setResultadoCorretor(
            resultado.dados
          );
        } else {
          setResultadoCorretora(
            resultado.dados
          );
        }
      } catch (error) {
        if (!ativo) return;

        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as comissões.";

        setErro(mensagem);

        if (
          userProfile.tipo_usuario ===
          "CORRETOR"
        ) {
          setResultadoCorretor(
            RESULTADO_INICIAL_CORRETOR
          );
        } else {
          setResultadoCorretora(
            RESULTADO_INICIAL_CORRETORA
          );
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void executar();

    return () => {
      ativo = false;
    };
  }, [
    carregarDados,
    filtros,
    userProfile,
  ]);

  const atualizarFiltro =
    useCallback(
      <
        K extends keyof FiltrosComissoes,
      >(
        campo: K,
        valor: FiltrosComissoes[K]
      ) => {
        setFiltros(
          (atual) => ({
            ...atual,
            [campo]: valor,
            pagina:
              campo === "pagina"
                ? Number(valor) || 1
                : 1,
          })
        );
      },
      []
    );

  const atualizarFiltros =
    useCallback(
      (
        novosFiltros: Partial<FiltrosComissoes>
      ) => {
        setFiltros(
          (atual) => ({
            ...atual,
            ...novosFiltros,
            pagina:
              novosFiltros.pagina ??
              1,
          })
        );
      },
      []
    );

  const limparFiltros =
    useCallback(() => {
      setFiltros(
        FILTROS_INICIAIS
      );
    }, []);

  const resultadoAtual =
    visao === "CORRETOR"
      ? resultadoCorretor
      : resultadoCorretora;

  const irParaPagina =
    useCallback(
      (pagina: number) => {
        const totalPaginas =
          resultadoAtual.total_paginas;

        if (pagina < 1) return;

        if (
          totalPaginas > 0 &&
          pagina > totalPaginas
        ) {
          return;
        }

        setFiltros(
          (atual) => ({
            ...atual,
            pagina,
          })
        );
      },
      [
        resultadoAtual
          .total_paginas,
      ]
    );

  const paginaAnterior =
    useCallback(() => {
      irParaPagina(
        Math.max(
          1,
          resultadoAtual.pagina -
            1
        )
      );
    }, [
      irParaPagina,
      resultadoAtual.pagina,
    ]);

  const proximaPagina =
    useCallback(() => {
      if (
        resultadoAtual
          .total_paginas > 0 &&
        resultadoAtual.pagina >=
          resultadoAtual
            .total_paginas
      ) {
        return;
      }

      irParaPagina(
        resultadoAtual.pagina +
          1
      );
    }, [
      irParaPagina,
      resultadoAtual.pagina,
      resultadoAtual
        .total_paginas,
    ]);

  const temFiltrosAtivos =
    useMemo(() => {
      return Boolean(
        filtros.busca?.trim() ||
          filtros.data_inicio ||
          filtros.data_fim ||
          filtros.corretor_id ||
          filtros.seguradora_id ||
          filtros.produto_id ||
          filtros
            .situacao_recebimento ||
          filtros
            .situacao_pagamento ||
          filtros.tipo_participante ||
          filtros.contrato_id ||
          filtros.cliente_id
      );
    }, [filtros]);

  const possuiResultados =
    resultadoAtual.itens.length >
    0;

  const vazio =
    !loading &&
    !erro &&
    !possuiResultados;

  return {
    visao,

    filtros,

    resultadoCorretora,
    resultadoCorretor,

    itens:
      resultadoCorretora.itens,

    resumo:
      resultadoCorretora.resumo,

    itensCorretor:
      resultadoCorretor.itens,

    resumoCorretor:
      resultadoCorretor.resumo,

    total:
      resultadoAtual.total,

    pagina:
      resultadoAtual.pagina,

    limite:
      resultadoAtual.limite,

    totalPaginas:
      resultadoAtual
        .total_paginas,

    loading,
    erro,
    vazio,
    possuiResultados,
    temFiltrosAtivos,

    setFiltros,
    atualizarFiltro,
    atualizarFiltros,
    limparFiltros,
    irParaPagina,
    paginaAnterior,
    proximaPagina,

    recarregar: carregar,
  };
}