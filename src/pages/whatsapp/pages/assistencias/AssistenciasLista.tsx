import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Headset,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabaseClient";
import ModalNovaAssistencia from "./components/ModalNovaAssistencia";

type Assistencia = {
  id: string;
  corretora_id: string;
  responsavel_id: string | null;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  cliente_id_legado: string | null;
  item_id: string | null;
  tipo_assistencia: string | null;
  descricao_solicitacao: string | null;
  protocolo: string | null;
  numero_atendimento: string | null;
  solicitado_em: string | null;
  prestador_nome: string | null;
  prestador_telefone: string | null;
  previsao_atendimento_em: string | null;
  atendimento_iniciado_em: string | null;
  atendimento_concluido_em: string | null;
  status: string | null;
  observacoes: string | null;
  dados_especificos: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PerfilResponsavel = {
  id: string;
  nome: string | null;
};

type PessoaCrm = {
  id: string;
  dados: Record<string, any> | null;
};

type EmpresaCrm = {
  id: string;
  dados: Record<string, any> | null;
};

type ClienteLegado = {
  id: string;
  nome_razao_social: string | null;
  nome_fantasia: string | null;
};

type Filtros = {
  busca: string;
  status: string;
  tipo: string;
};

const FILTROS_INICIAIS: Filtros = {
  busca: "",
  status: "",
  tipo: "",
};

const STATUS_OPTIONS = [
  "SOLICITADA",
  "AGUARDANDO_SEGURADORA",
  "AGUARDANDO_PRESTADOR",
  "AGENDADA",
  "EM_ATENDIMENTO",
  "CONCLUIDA",
  "CANCELADA",
  "NAO_ATENDIDA",
];

function formatarTexto(valor?: string | null) {
  if (!valor) return "—";

  return valor
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function obterNomePessoa(pessoa?: PessoaCrm) {
  if (!pessoa?.dados) return null;

  return (
    pessoa.dados.nome ||
    pessoa.dados.nome_completo ||
    pessoa.dados.nome_razao_social ||
    null
  );
}

function obterNomeEmpresa(empresa?: EmpresaCrm) {
  if (!empresa?.dados) return null;

  return (
    empresa.dados.nome_fantasia ||
    empresa.dados.razao_social ||
    empresa.dados.nome_razao_social ||
    empresa.dados.nome ||
    null
  );
}

function classeStatus(status?: string | null) {
  switch (status) {
    case "SOLICITADA":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";

    case "AGUARDANDO_SEGURADORA":
    case "AGUARDANDO_PRESTADOR":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";

    case "AGENDADA":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";

    case "EM_ATENDIMENTO":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300";

    case "CONCLUIDA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "CANCELADA":
    case "NAO_ATENDIDA":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default function AssistenciasLista() {
  const navigate = useNavigate();
  const [modalNovaAssistenciaAberto, setModalNovaAssistenciaAberto] = useState(false);  
  const [assistencias, setAssistencias] = useState<Assistencia[]>([]);
  const [responsaveis, setResponsaveis] = useState<
    Record<string, PerfilResponsavel>
  >({});
  const [pessoas, setPessoas] = useState<Record<string, PessoaCrm>>({});
  const [empresas, setEmpresas] = useState<Record<string, EmpresaCrm>>({});
  const [clientesLegados, setClientesLegados] = useState<
    Record<string, ClienteLegado>
  >({});

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarRelacionamentos = useCallback(
    async (lista: Assistencia[]) => {
      const responsavelIds = [
        ...new Set(
          lista
            .map((item) => item.responsavel_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const pessoaIds = [
        ...new Set(
          lista
            .map((item) => item.crm_pessoa_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const empresaIds = [
        ...new Set(
          lista
            .map((item) => item.crm_empresa_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const clienteLegadoIds = [
        ...new Set(
          lista
            .map((item) => item.cliente_id_legado)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const [
        responsaveisResponse,
        pessoasResponse,
        empresasResponse,
        clientesLegadosResponse,
      ] = await Promise.all([
        responsavelIds.length
          ? supabase
              .from("usuarios_perfis")
              .select("id, nome")
              .in("id", responsavelIds)
          : Promise.resolve({ data: [], error: null }),

        pessoaIds.length
          ? supabase
              .from("crm_pessoas")
              .select("id, dados")
              .in("id", pessoaIds)
          : Promise.resolve({ data: [], error: null }),

        empresaIds.length
          ? supabase
              .from("crm_empresas")
              .select("id, dados")
              .in("id", empresaIds)
          : Promise.resolve({ data: [], error: null }),

        clienteLegadoIds.length
          ? supabase
              .from("tab_clientes")
              .select("id, nome_razao_social, nome_fantasia")
              .in("id", clienteLegadoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (responsaveisResponse.error) {
        throw responsaveisResponse.error;
      }

      if (pessoasResponse.error) {
        throw pessoasResponse.error;
      }

      if (empresasResponse.error) {
        throw empresasResponse.error;
      }

      if (clientesLegadosResponse.error) {
        throw clientesLegadosResponse.error;
      }

      const mapaResponsaveis: Record<string, PerfilResponsavel> = {};
      const mapaPessoas: Record<string, PessoaCrm> = {};
      const mapaEmpresas: Record<string, EmpresaCrm> = {};
      const mapaClientesLegados: Record<string, ClienteLegado> = {};

      (responsaveisResponse.data ?? []).forEach(
        (item: PerfilResponsavel) => {
          mapaResponsaveis[item.id] = item;
        }
      );

      (pessoasResponse.data ?? []).forEach((item: PessoaCrm) => {
        mapaPessoas[item.id] = item;
      });

      (empresasResponse.data ?? []).forEach((item: EmpresaCrm) => {
        mapaEmpresas[item.id] = item;
      });

      (clientesLegadosResponse.data ?? []).forEach(
        (item: ClienteLegado) => {
          mapaClientesLegados[item.id] = item;
        }
      );

      setResponsaveis(mapaResponsaveis);
      setPessoas(mapaPessoas);
      setEmpresas(mapaEmpresas);
      setClientesLegados(mapaClientesLegados);
    },
    []
  );

  const carregarAssistencias = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const { data, error } = await supabase
        .from("crm_assistencias")
        .select("*")
        .order("solicitado_em", { ascending: false });

      if (error) {
        throw error;
      }

      const lista = (data ?? []) as Assistencia[];

      setAssistencias(lista);

      await carregarRelacionamentos(lista);
    } catch (error) {
      console.error("Erro ao carregar assistências:", error);

      if (error instanceof Error) {
        setErro(error.message);
      } else {
        setErro("Não foi possível carregar as assistências.");
      }
    } finally {
      setLoading(false);
    }
  }, [carregarRelacionamentos]);

  useEffect(() => {
    void carregarAssistencias();
  }, [carregarAssistencias]);

  const obterNomeCliente = useCallback(
    (assistencia: Assistencia) => {
      if (assistencia.crm_pessoa_id) {
        const nome = obterNomePessoa(
          pessoas[assistencia.crm_pessoa_id]
        );

        if (nome) return nome;
      }

      if (assistencia.crm_empresa_id) {
        const nome = obterNomeEmpresa(
          empresas[assistencia.crm_empresa_id]
        );

        if (nome) return nome;
      }

      if (assistencia.cliente_id_legado) {
        const cliente =
          clientesLegados[assistencia.cliente_id_legado];

        if (cliente) {
          return (
            cliente.nome_fantasia ||
            cliente.nome_razao_social ||
            "Cliente legado"
          );
        }
      }

      return "Cliente não identificado";
    },
    [pessoas, empresas, clientesLegados]
  );

  const tiposAssistencia = useMemo(() => {
    return Array.from(
      new Set(
        assistencias
          .map((item) => item.tipo_assistencia)
          .filter((tipo): tipo is string => Boolean(tipo))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [assistencias]);

  const assistenciasFiltradas = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase();

    return assistencias.filter((assistencia) => {
      if (
        filtros.status &&
        assistencia.status !== filtros.status
      ) {
        return false;
      }

      if (
        filtros.tipo &&
        assistencia.tipo_assistencia !== filtros.tipo
      ) {
        return false;
      }

      if (!busca) {
        return true;
      }

      const cliente = obterNomeCliente(assistencia);

      const conteudo = [
        cliente,
        assistencia.tipo_assistencia,
        assistencia.descricao_solicitacao,
        assistencia.protocolo,
        assistencia.numero_atendimento,
        assistencia.prestador_nome,
        assistencia.prestador_telefone,
        assistencia.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return conteudo.includes(busca);
    });
  }, [assistencias, filtros, obterNomeCliente]);

  const quantidadeFiltrosAtivos = useMemo(() => {
    return [filtros.status, filtros.tipo].filter(Boolean).length;
  }, [filtros]);

  const totalEmAndamento = useMemo(() => {
    return assistencias.filter(
      (item) =>
        ![
          "CONCLUIDA",
          "CANCELADA",
          "NAO_ATENDIDA",
        ].includes(item.status ?? "")
    ).length;
  }, [assistencias]);

  const totalAgendadas = useMemo(() => {
    return assistencias.filter(
      (item) => item.status === "AGENDADA"
    ).length;
  }, [assistencias]);

  const totalConcluidas = useMemo(() => {
    return assistencias.filter(
      (item) => item.status === "CONCLUIDA"
    ).length;
  }, [assistencias]);

  const totalNaoAtendidas = useMemo(() => {
    return assistencias.filter(
      (item) => item.status === "NAO_ATENDIDA"
    ).length;
  }, [assistencias]);

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
  }

  function handleNovaAssistencia() {
    setModalNovaAssistenciaAberto(true);
    }

  function handleAbrirAssistencia(assistencia: Assistencia) {
    navigate(`/whatsapp/assistencia/${assistencia.id}`);
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Headset size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Assistências
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Gestão e acompanhamento das assistências da carteira.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void carregarAssistencias()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={handleNovaAssistencia}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Nova Assistência
            </button>
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
                value={filtros.busca}
                onChange={(event) =>
                  setFiltros((atual) => ({
                    ...atual,
                    busca: event.target.value,
                  }))
                }
                placeholder="Buscar por cliente, protocolo, atendimento, tipo ou prestador..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarFiltros((atual) => !atual)
              }
              className="relative inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Filter size={17} />
              Filtros

              {quantidadeFiltrosAtivos > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                  {quantidadeFiltrosAtivos}
                </span>
              )}
            </button>
          </div>

          {mostrarFiltros && (
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </label>

                  <select
                    value={filtros.status}
                    onChange={(event) =>
                      setFiltros((atual) => ({
                        ...atual,
                        status: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Todos</option>

                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatarTexto(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tipo de assistência
                  </label>

                  <select
                    value={filtros.tipo}
                    onChange={(event) =>
                      setFiltros((atual) => ({
                        ...atual,
                        tipo: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Todos</option>

                    {tiposAssistencia.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {formatarTexto(tipo)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {quantidadeFiltrosAtivos > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <X size={15} />
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {assistenciasFiltradas.length}
            </span>{" "}
            {assistenciasFiltradas.length === 1
              ? "assistência encontrada"
              : "assistências encontradas"}
          </p>
        </div>

        {erro && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Erro ao carregar assistências
              </p>
              <p className="mt-0.5 text-sm">{erro}</p>
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
                Carregando assistências...
              </p>
            </div>
          </div>
        ) : assistenciasFiltradas.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Headset size={23} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                Nenhuma assistência encontrada
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Não existem assistências correspondentes aos filtros selecionados.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cliente / Assistência
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Solicitação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Prestador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Previsão
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Responsável
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assistenciasFiltradas.map((assistencia) => {
                    const nomeCliente =
                      obterNomeCliente(assistencia);

                    const responsavel =
                      assistencia.responsavel_id
                        ? responsaveis[
                            assistencia.responsavel_id
                          ]
                        : null;

                    return (
                      <tr
                        key={assistencia.id}
                        className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <User size={17} />
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {nomeCliente}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                  {formatarTexto(
                                    assistencia.tipo_assistencia
                                  )}
                                </span>

                                {assistencia.numero_atendimento && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Nº{" "}
                                      {
                                        assistencia.numero_atendimento
                                      }
                                    </span>
                                  </>
                                )}

                                {assistencia.protocolo && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Prot.{" "}
                                      {assistencia.protocolo}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <CalendarDays
                              size={15}
                              className="shrink-0 text-slate-400"
                            />
                            {formatarDataHora(
                              assistencia.solicitado_em
                            )}
                          </div>

                          {assistencia.descricao_solicitacao && (
                            <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">
                              {
                                assistencia.descricao_solicitacao
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {assistencia.prestador_nome ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <Truck
                                  size={15}
                                  className="text-slate-400"
                                />
                                <p className="max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-200">
                                  {
                                    assistencia.prestador_nome
                                  }
                                </p>
                              </div>

                              {assistencia.prestador_telefone && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    assistencia.prestador_telefone
                                  }
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Não definido
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classeStatus(
                              assistencia.status
                            )}`}
                          >
                            {formatarTexto(
                              assistencia.status
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <Clock3
                              size={15}
                              className="shrink-0 text-slate-400"
                            />
                            {formatarDataHora(
                              assistencia.previsao_atendimento_em
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-200">
                            {responsavel?.nome || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleAbrirAssistencia(
                                assistencia
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                          >
                            Abrir
                            <ChevronRight size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && assistencias.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Em andamento
                </p>
                <Clock3
                  size={16}
                  className="text-blue-500"
                />
              </div>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {totalEmAndamento}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Agendadas
                </p>
                <CalendarDays
                  size={16}
                  className="text-violet-500"
                />
              </div>

              <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                {totalAgendadas}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Concluídas
                </p>
                <CheckCircle2
                  size={16}
                  className="text-emerald-500"
                />
              </div>

              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalConcluidas}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Não atendidas
                </p>
                <XCircle
                  size={16}
                  className="text-red-500"
                />
              </div>

              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {totalNaoAtendidas}
              </p>
            </div>
          </div>
        )}
      </div>
      <ModalNovaAssistencia
        open={modalNovaAssistenciaAberto}
        onClose={() => setModalNovaAssistenciaAberto(false)}
        onCreated={(assistencia) => {
            setModalNovaAssistenciaAberto(false);
            void carregarAssistencias();
            console.log("Assistência criada:", assistencia);
        }}
        />
    </div>
  );
}