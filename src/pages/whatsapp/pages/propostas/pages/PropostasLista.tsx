import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import ModalNovaProposta from "../components/ModalNovaProposta";
import { useAuth } from "../../../../../auth/AuthContext";
import { usePermissoes } from "../../../hooks/usePermissoes";
import PropostaStatusBadge from "../components/PropostaStatusBadge";
import {
  listarCorretoresFiltroPropostas,
  listarProdutosFiltroPropostas,
  listarPropostas,
} from "../services/propostasService";
import type {
  FiltrosPropostas,
  Proposta,
  PropostaListaItem,
  PropostaFiltroCorretor,
  PropostaFiltroProduto,
  StatusProposta,
  TipoNegocioProposta,
} from "../types/propostas";

interface FiltrosTela {
  busca: string;

  status: StatusProposta[];
  tipo_negocio: TipoNegocioProposta[];

  corretor_ids: string[];
  produto_ids: string[];

  data_venda_inicio: string;
  data_venda_fim: string;

  vigencia_inicio: string;
  vigencia_fim: string;
}

const FILTROS_INICIAIS: FiltrosTela = {
  busca: "",

  status: [],
  tipo_negocio: [],

  corretor_ids: [],
  produto_ids: [],

  data_venda_inicio: "",
  data_venda_fim: "",

  vigencia_inicio: "",
  vigencia_fim: "",
};

const ITENS_POR_PAGINA = 20;

const STATUS_OPTIONS: Array<{
  value: StatusProposta;
  label: string;
}> = [
  {
    value: "EM_NEGOCIACAO",
    label: "Em negociação",
  },
  {
    value: "VENDIDA",
    label: "Vendida",
  },
  {
    value: "PERDIDA",
    label: "Perdida",
  },
  {
    value: "CANCELADA",
    label: "Cancelada",
  },
];

const TIPO_NEGOCIO_OPTIONS: Array<{
  value: TipoNegocioProposta;
  label: string;
}> = [
  {
    value: "NOVO",
    label: "Novo negócio",
  },
  {
    value: "RENOVACAO",
    label: "Renovação",
  },
];

function formatarMoeda(
  valor?: number | null
): string {
  return Number(
    valor ?? 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatarData(
  valor?: string | null
): string {
  if (!valor) {
    return "—";
  }

  const somenteData =
    valor.includes("T")
      ? valor.split("T")[0]
      : valor;

  const partes =
    somenteData.split("-");

  if (
    partes.length !== 3
  ) {
    return valor;
  }

  const [
    ano,
    mes,
    dia,
  ] = partes;

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarDocumento(
  documento: string | null,
  tipo: "PF" | "PJ"
): string {
  if (!documento) {
    return "Documento não informado";
  }

  const numeros =
    documento.replace(
      /\D/g,
      ""
    );

  if (
    tipo === "PF" &&
    numeros.length === 11
  ) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (
    tipo === "PJ" &&
    numeros.length === 14
  ) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return documento;
}

function formatarTipoNegocio(
  tipo: TipoNegocioProposta
): string {
  return tipo ===
    "RENOVACAO"
    ? "Renovação"
    : "Novo negócio";
}

interface PropostasLocationState {
  abrirNovaProposta?: boolean;

  clienteInicial?: {
    tipo: "PF" | "PJ";
    id: string;
  } | null;
}

export default function PropostasLista() {
  const { user, userProfile } = useAuth();
  const { escopo } = usePermissoes();

  const acessoAdministrativo =
    userProfile?.tipo_usuario === "CORRETORA" ||
    userProfile?.tipo_usuario === "ADMIN";

  const escopoVisualizacao = acessoAdministrativo
    ? "tenant"
    : escopo("operacoes.propostas", "read");
  const escopoCriacao = acessoAdministrativo
    ? "tenant"
    : escopo("operacoes.propostas", "create");

  const podeVisualizar =
    escopoVisualizacao === "tenant" || escopoVisualizacao === "own";
  const podeCriar =
    escopoCriacao === "tenant" || escopoCriacao === "own";
  const apenasProprias = escopoVisualizacao === "own";
  const corretorLogadoId = user?.id ?? null;
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const locationState =
    location.state as
      | PropostasLocationState
      | null;

  const [
    clienteInicialModal,
    setClienteInicialModal,
  ] = useState<
    PropostasLocationState["clienteInicial"]
  >(null);

  const [
    bloquearClienteInicial,
    setBloquearClienteInicial,
  ] = useState(false);

  const [
    propostas,
    setPropostas,
  ] = useState<
    PropostaListaItem[]
  >([]);

  const [
    filtros,
    setFiltros,
  ] =
    useState<FiltrosTela>(
      FILTROS_INICIAIS
    );

  const [
    buscaAplicada,
    setBuscaAplicada,
  ] = useState("");

  const [
    mostrarFiltros,
    setMostrarFiltros,
  ] = useState(false);

  const [
    modalNovaPropostaAberto,
    setModalNovaPropostaAberto,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] =
    useState<string | null>(
      null
    );

  const [
    pagina,
    setPagina,
  ] = useState(1);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    totalPaginas,
    setTotalPaginas,
  ] = useState(1);

  const [
    corretoresFiltro,
    setCorretoresFiltro,
  ] = useState<PropostaFiltroCorretor[]>([]);

  const [
    produtosFiltro,
    setProdutosFiltro,
  ] = useState<PropostaFiltroProduto[]>([]);

  const [
    carregandoOpcoesFiltro,
    setCarregandoOpcoesFiltro,
  ] = useState(false);

  const [
    erroOpcoesFiltro,
    setErroOpcoesFiltro,
  ] = useState<string | null>(null);

  const carregarOpcoesFiltros =
    useCallback(async () => {
      if (!podeVisualizar || (apenasProprias && !corretorLogadoId)) {
        setCorretoresFiltro([]);
        setProdutosFiltro([]);
        return;
      }
      setCarregandoOpcoesFiltro(true);
      setErroOpcoesFiltro(null);

      try {
        const [
          corretores,
          produtos,
        ] = await Promise.all([
          listarCorretoresFiltroPropostas(),
          listarProdutosFiltroPropostas(),
        ]);

        setCorretoresFiltro(
          apenasProprias
            ? corretores.filter((corretor) => corretor.id === corretorLogadoId)
            : corretores
        );
        setProdutosFiltro(produtos);
      } catch (error) {
        console.error(
          "Erro ao carregar opções dos filtros:",
          error
        );

        setCorretoresFiltro([]);
        setProdutosFiltro([]);

        setErroOpcoesFiltro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar corretores e produtos."
        );
      } finally {
        setCarregandoOpcoesFiltro(false);
      }
    }, [podeVisualizar, apenasProprias, corretorLogadoId]);

  useEffect(() => {
    void carregarOpcoesFiltros();
  }, [carregarOpcoesFiltros]);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          setBuscaAplicada(
            filtros.busca.trim()
          );

          setPagina(1);
        },
        400
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    filtros.busca,
  ]);

  useEffect(() => {
    if (
      !podeCriar ||
      !locationState?.abrirNovaProposta ||
      !locationState
        .clienteInicial?.id
    ) {
      return;
    }

    setClienteInicialModal(
      locationState.clienteInicial
    );

    setBloquearClienteInicial(
      true
    );

    setModalNovaPropostaAberto(
      true
    );
  }, [
    podeCriar,
    locationState?.abrirNovaProposta,
    locationState
      ?.clienteInicial?.id,
    locationState
      ?.clienteInicial?.tipo,
  ]);

  const carregarPropostas =
    useCallback(
      async () => {
        if (!podeVisualizar || (apenasProprias && !corretorLogadoId)) {
          setPropostas([]);
          setTotal(0);
          setTotalPaginas(1);
          setLoading(false);
          return;
        }
        setLoading(true);
        setErro(null);

        try {
          const parametros: FiltrosPropostas = {
            busca:
              buscaAplicada ||
              undefined,

            status:
              filtros.status.length
                ? filtros.status
                : undefined,

            tipo_negocio:
              filtros.tipo_negocio.length
                ? filtros.tipo_negocio
                : undefined,

            // Para escopo own, o corretor responsável é obrigatório.
            // O filtro informado pela interface nunca amplia esse escopo.
            corretor_ids: apenasProprias
              ? [corretorLogadoId!]
              : filtros.corretor_ids.length
                ? filtros.corretor_ids
                : undefined,

            produto_ids:
              filtros.produto_ids.length
                ? filtros.produto_ids
                : undefined,

            data_venda_inicio:
              filtros.data_venda_inicio ||
              undefined,

            data_venda_fim:
              filtros.data_venda_fim ||
              undefined,

            vigencia_inicio:
              filtros.vigencia_inicio ||
              undefined,

            vigencia_fim:
              filtros.vigencia_fim ||
              undefined,

            pagina,

            por_pagina:
              ITENS_POR_PAGINA,
          };

          const resultado =
            await listarPropostas(
              parametros
            );

          setPropostas(
            resultado.dados
          );

          setTotal(
            resultado.total
          );

          setTotalPaginas(
            Math.max(
              1,
              resultado.total_paginas
            )
          );
        } catch (error) {
          console.error(
            "Erro ao carregar propostas:",
            error
          );

          setPropostas([]);
          setTotal(0);
          setTotalPaginas(1);

          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as propostas."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        podeVisualizar,
        apenasProprias,
        corretorLogadoId,
        buscaAplicada,
        filtros.status,
        filtros.tipo_negocio,
        filtros.corretor_ids,
        filtros.produto_ids,
        filtros.data_venda_inicio,
        filtros.data_venda_fim,
        filtros.vigencia_inicio,
        filtros.vigencia_fim,
        pagina,
      ]
    );

  useEffect(() => {
    void carregarPropostas();
  }, [
    carregarPropostas,
  ]);

  useEffect(() => {
    if (
      pagina >
      totalPaginas
    ) {
      setPagina(
        totalPaginas
      );
    }
  }, [
    pagina,
    totalPaginas,
  ]);

  const quantidadeFiltrosAtivos =
    useMemo(() => {
      return [
        filtros.status.length > 0,
        filtros.tipo_negocio.length > 0,
        filtros.corretor_ids.length > 0,
        filtros.produto_ids.length > 0,
        !!(
          filtros.data_venda_inicio ||
          filtros.data_venda_fim
        ),
        !!(
          filtros.vigencia_inicio ||
          filtros.vigencia_fim
        ),
      ].filter(Boolean).length;
    }, [filtros]);

  const abrirModalNovaProposta =
    useCallback(() => {
      if (!podeCriar) return;
      setClienteInicialModal(
        null
      );

      setBloquearClienteInicial(
        false
      );

      setModalNovaPropostaAberto(
        true
      );
    }, [podeCriar]);

  const metricasPagina =
    useMemo(() => {
      let emNegociacao = 0;
      let vendidas = 0;
      let valorOfertado = 0;
      let valorVendido = 0;

      for (
        const proposta of
        propostas
      ) {
        if (
          proposta.status ===
          "EM_NEGOCIACAO"
        ) {
          emNegociacao += 1;
        }

        if (
          proposta.status ===
          "VENDIDA"
        ) {
          vendidas += 1;
        }

        valorOfertado +=
          Number(
            proposta.valor_total_ofertado ??
              0
          );

        valorVendido +=
          Number(
            proposta.valor_total_vendido ??
              0
          );
      }

      return {
        emNegociacao,
        vendidas,
        valorOfertado,
        valorVendido,
      };
    }, [propostas]);

  function atualizarFiltro<
    K extends keyof FiltrosTela
  >(
    campo: K,
    valor: FiltrosTela[K]
  ) {
    setFiltros(
      atual => ({
        ...atual,
        [campo]:
          valor,
      })
    );

    if (
      campo !== "busca"
    ) {
      setPagina(1);
    }
  }

  type CampoFiltroArray =
    | "status"
    | "tipo_negocio"
    | "corretor_ids"
    | "produto_ids";

  function alternarFiltroArray(
    campo: CampoFiltroArray,
    valor: string
  ) {
    setFiltros(atual => {
      const valoresAtuais =
        atual[campo] as string[];

      const valoresNovos =
        valoresAtuais.includes(valor)
          ? valoresAtuais.filter(
              item => item !== valor
            )
          : [
              ...valoresAtuais,
              valor,
            ];

      return {
        ...atual,
        [campo]: valoresNovos,
      } as FiltrosTela;
    });

    setPagina(1);
  }

  function limparFiltros() {
    setFiltros(
      FILTROS_INICIAIS
    );

    setBuscaAplicada("");
    setPagina(1);
  }

  const fecharModalNovaProposta =
    useCallback(() => {
      setModalNovaPropostaAberto(
        false
      );

      setClienteInicialModal(
        null
      );

      setBloquearClienteInicial(
        false
      );

      if (
        location.state
      ) {
        navigate(
          location.pathname,
          {
            replace: true,
            state: null,
          }
        );
      }
    }, [
      location.pathname,
      location.state,
      navigate,
    ]);

  function handlePropostaCriada(
    _proposta: Proposta
  ) {
    fecharModalNovaProposta();

    setPagina(1);

    void carregarPropostas();
  }

  function paginaAnterior() {
    setPagina(
      atual =>
        Math.max(
          1,
          atual - 1
        )
    );
  }

  function proximaPagina() {
    setPagina(
      atual =>
        Math.min(
          totalPaginas,
          atual + 1
        )
    );
  }

  const primeiroRegistro =
    total === 0
      ? 0
      : (
          pagina - 1
        ) *
          ITENS_POR_PAGINA +
        1;

  const ultimoRegistro =
    Math.min(
      pagina *
        ITENS_POR_PAGINA,
      total
    );

  if (!podeVisualizar) {
    return (
      <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileText size={36} className="mx-auto mb-4 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Propostas</h1>
          <p className="mt-2 text-sm text-slate-500">
            {podeCriar
              ? "Você pode adicionar propostas, mas não possui permissão para consultar a listagem."
              : "Você não possui permissão para visualizar ou criar propostas."}
          </p>
          {podeCriar && (
            <button
              type="button"
              onClick={abrirModalNovaProposta}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} /> Nova Proposta
            </button>
          )}
        </div>
        {podeCriar && (
          <ModalNovaProposta
            open={modalNovaPropostaAberto}
            clienteInicial={clienteInicialModal ?? null}
            bloquearClienteInicial={bloquearClienteInicial}
            onClose={fecharModalNovaProposta}
            onCreated={handlePropostaCriada}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FileText
                size={22}
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Propostas
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Gestão das propostas comerciais e negociações da carteira.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void carregarPropostas()
              }
              disabled={
                loading
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Atualizar
            </button>

            {podeCriar && <button
              type="button"
              onClick={
                abrirModalNovaProposta
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus
                size={17}
              />

              Nova Proposta
            </button>}
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Em negociação
              </p>

              <FileText
                size={17}
                className="text-amber-500"
              />
            </div>

            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {
                metricasPagina.emNegociacao
              }
            </p>

            <p className="mt-1 text-xs text-slate-400">
              nesta página
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vendidas
              </p>

              <CheckCircle2
                size={17}
                className="text-emerald-500"
              />
            </div>

            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {
                metricasPagina.vendidas
              }
            </p>

            <p className="mt-1 text-xs text-slate-400">
              nesta página
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Valor ofertado
              </p>

              <TrendingUp
                size={17}
                className="text-blue-500"
              />
            </div>

            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {formatarMoeda(
                metricasPagina.valorOfertado
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              nesta página
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Valor vendido
              </p>

              <CircleDollarSign
                size={17}
                className="text-emerald-500"
              />
            </div>

            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatarMoeda(
                metricasPagina.valorVendido
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              nesta página
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  filtros.busca
                }
                onChange={
                  event =>
                    atualizarFiltro(
                      "busca",
                      event
                        .target
                        .value
                    )
                }
                placeholder="Buscar por proposta, cliente, CPF ou CNPJ..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarFiltros(
                  atual =>
                    !atual
                )
              }
              className="relative inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Filter
                size={17}
              />

              Filtros

              {quantidadeFiltrosAtivos >
                0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                  {
                    quantidadeFiltrosAtivos
                  }
                </span>
              )}
            </button>
          </div>

          {mostrarFiltros && (
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <FiltroDropdown
                  titulo="Status"
                  selecionados={filtros.status.length}
                >
                  {STATUS_OPTIONS.map(status => (
                    <CheckboxFiltro
                      key={status.value}
                      checked={filtros.status.includes(status.value)}
                      label={status.label}
                      onChange={() =>
                        alternarFiltroArray(
                          "status",
                          status.value
                        )
                      }
                    />
                  ))}
                </FiltroDropdown>

                <FiltroDropdown
                  titulo="Tipo de negócio"
                  selecionados={filtros.tipo_negocio.length}
                >
                  {TIPO_NEGOCIO_OPTIONS.map(tipo => (
                    <CheckboxFiltro
                      key={tipo.value}
                      checked={filtros.tipo_negocio.includes(tipo.value)}
                      label={tipo.label}
                      onChange={() =>
                        alternarFiltroArray(
                          "tipo_negocio",
                          tipo.value
                        )
                      }
                    />
                  ))}
                </FiltroDropdown>

                <FiltroDropdown
                  titulo="Corretor"
                  selecionados={filtros.corretor_ids.length}
                  loading={carregandoOpcoesFiltro}
                  vazio={
                    !carregandoOpcoesFiltro && corretoresFiltro.length === 0
                      ? "Nenhum corretor disponível."
                      : undefined
                  }
                >
                  {corretoresFiltro.map(corretor => (
                    <CheckboxFiltro
                      key={corretor.id}
                      checked={filtros.corretor_ids.includes(corretor.id)}
                      label={corretor.nome}
                      onChange={() =>
                        alternarFiltroArray(
                          "corretor_ids",
                          corretor.id
                        )
                      }
                    />
                  ))}
                </FiltroDropdown>

                <FiltroDropdown
                  titulo="Produto"
                  selecionados={filtros.produto_ids.length}
                  loading={carregandoOpcoesFiltro}
                  vazio={
                    !carregandoOpcoesFiltro && produtosFiltro.length === 0
                      ? "Nenhum produto disponível."
                      : undefined
                  }
                >
                  {produtosFiltro.map(produto => (
                    <CheckboxFiltro
                      key={produto.id}
                      checked={filtros.produto_ids.includes(produto.id)}
                      label={produto.nome}
                      detalhe={produto.categoria || undefined}
                      onChange={() =>
                        alternarFiltroArray(
                          "produto_ids",
                          produto.id
                        )
                      }
                    />
                  ))}
                </FiltroDropdown>

                <div className="flex min-w-[290px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Venda
                  </span>

                  <input
                    type="date"
                    value={filtros.data_venda_inicio}
                    max={filtros.data_venda_fim || undefined}
                    onChange={event =>
                      atualizarFiltro(
                        "data_venda_inicio",
                        event.target.value
                      )
                    }
                    className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />

                  <span className="text-xs text-slate-400">até</span>

                  <input
                    type="date"
                    value={filtros.data_venda_fim}
                    min={filtros.data_venda_inicio || undefined}
                    onChange={event =>
                      atualizarFiltro(
                        "data_venda_fim",
                        event.target.value
                      )
                    }
                    className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div className="flex min-w-[290px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Vigência
                  </span>

                  <input
                    type="date"
                    value={filtros.vigencia_inicio}
                    max={filtros.vigencia_fim || undefined}
                    onChange={event =>
                      atualizarFiltro(
                        "vigencia_inicio",
                        event.target.value
                      )
                    }
                    className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />

                  <span className="text-xs text-slate-400">até</span>

                  <input
                    type="date"
                    value={filtros.vigencia_fim}
                    min={filtros.vigencia_inicio || undefined}
                    onChange={event =>
                      atualizarFiltro(
                        "vigencia_fim",
                        event.target.value
                      )
                    }
                    className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                {quantidadeFiltrosAtivos > 0 && (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <X size={15} />
                    Limpar
                  </button>
                )}
              </div>

              {erroOpcoesFiltro && (
                <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <span>{erroOpcoesFiltro}</span>

                  <button
                    type="button"
                    onClick={() => void carregarOpcoesFiltros()}
                    className="shrink-0 font-semibold hover:underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {total}
            </span>{" "}
            {total === 1
              ? "proposta encontrada"
              : "propostas encontradas"}
          </p>

          {total > 0 && (
            <p className="text-xs text-slate-400">
              Exibindo{" "}
              {primeiroRegistro}–
              {ultimoRegistro} de{" "}
              {total}
            </p>
          )}
        </div>

        {erro && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Erro ao carregar propostas
              </p>

              <p className="mt-0.5 text-sm">
                {erro}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="text-center">
              <Loader2
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Carregando propostas...
              </p>
            </div>
          </div>
        ) : propostas.length ===
          0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FileText
                  size={23}
                />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                Nenhuma proposta encontrada
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Não existem propostas correspondentes aos filtros selecionados.
              </p>

              {podeCriar &&
                total === 0 &&
                !buscaAplicada &&
                quantidadeFiltrosAtivos ===
                  0 && (
                  <button
                    type="button"
                    onClick={
                      abrirModalNovaProposta
                    }
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus
                      size={16}
                    />

                    Criar primeira proposta
                  </button>
                )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Proposta / Cliente
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Negócio
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Venda / Vigência
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Itens
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Produto(s)
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Vendido
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Corretor
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {propostas.map(
                    proposta => (
                      <tr
                        key={
                          proposta.id
                        }
                        className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <User
                                size={
                                  17
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-blue-700 dark:text-blue-400">
                                {
                                  proposta.numero_proposta
                                }
                              </p>

                              <p className="mt-0.5 max-w-[250px] truncate text-sm font-medium text-slate-900 dark:text-white">
                                {
                                  proposta.cliente_nome
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {formatarDocumento(
                                  proposta.cliente_documento,
                                  proposta.cliente_tipo
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {formatarTipoNegocio(
                              proposta.tipo_negocio
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <CalendarDays
                              size={
                                15
                              }
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div className="min-w-[170px]">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Venda:{" "}
                                {formatarData(
                                  proposta.data_venda
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Início:{" "}
                                {formatarData(
                                  proposta.vigencia_inicio
                                )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Fim:{" "}
                                {formatarData(
                                  proposta.vigencia_fim
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <PropostaStatusBadge
                            status={
                              proposta.status
                            }
                          />
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {
                              proposta.quantidade_itens
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {proposta.produtos
                            .length >
                          0 ? (
                            <div className="flex max-w-[280px] flex-wrap gap-1.5">
                              {proposta.produtos.map(
                                produto => (
                                  <span
                                    key={
                                      produto
                                    }
                                    title={
                                      produto
                                    }
                                    className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  >
                                    {
                                      produto
                                    }
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <p
                            className={`text-sm font-semibold ${
                              proposta.valor_total_vendido >
                              0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-400"
                            }`}
                          >
                            {formatarMoeda(
                              proposta.valor_total_vendido
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p
                            title={
                              proposta.corretor_nome ||
                              undefined
                            }
                            className="max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-200"
                          >
                            {proposta.corretor_nome ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/whatsapp/propostas/${proposta.id}`
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                          >
                            Abrir

                            <ChevronRight
                              size={
                                15
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading &&
          propostas.length >
            0 &&
          totalPaginas >
            1 && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Página{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {pagina}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {
                    totalPaginas
                  }
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={
                    paginaAnterior
                  }
                  disabled={
                    pagina <=
                      1 ||
                    loading
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronLeft
                    size={16}
                  />

                  Anterior
                </button>

                <button
                  type="button"
                  onClick={
                    proximaPagina
                  }
                  disabled={
                    pagina >=
                      totalPaginas ||
                    loading
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Próxima

                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </div>
          )}
      </div>

      <ModalNovaProposta
        open={
          modalNovaPropostaAberto
        }
        clienteInicial={
          clienteInicialModal ??
          null
        }
        bloquearClienteInicial={
          bloquearClienteInicial
        }
        onClose={
          fecharModalNovaProposta
        }
        onCreated={
          handlePropostaCriada
        }
      />
    </div>
  );
}

interface FiltroDropdownProps {
  titulo: string;
  selecionados: number;
  loading?: boolean;
  vazio?: string;
  children: ReactNode;
}

function FiltroDropdown({
  titulo,
  selecionados,
  loading = false,
  vazio,
  children,
}: FiltroDropdownProps) {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 [&::-webkit-details-marker]:hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
        <span>{titulo}</span>

        {selecionados > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
            {selecionados}
          </span>
        )}

        <ChevronDown
          size={14}
          className="ml-auto text-slate-400 transition group-open:rotate-180"
        />
      </summary>

      <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {titulo}
        </div>

        {loading ? (
          <div className="flex min-h-20 items-center justify-center gap-2 px-3 py-4 text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            Carregando opções...
          </div>
        ) : vazio ? (
          <p className="px-3 py-4 text-xs text-slate-400">
            {vazio}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto p-2">
            {children}
          </div>
        )}
      </div>
    </details>
  );
}

interface CheckboxFiltroProps {
  checked: boolean;
  label: string;
  detalhe?: string;
  onChange: () => void;
}

function CheckboxFiltro({
  checked,
  label,
  detalhe,
  onChange,
}: CheckboxFiltroProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white dark:hover:bg-slate-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
      />

      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>

        {detalhe && (
          <span className="mt-0.5 block text-xs text-slate-400">
            {detalhe}
          </span>
        )}
      </span>
    </label>
  );
}

