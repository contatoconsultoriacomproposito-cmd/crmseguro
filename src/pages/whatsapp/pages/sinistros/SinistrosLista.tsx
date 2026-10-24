import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileWarning,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import ModalNovoSinistro from "./components/ModalNovoSinistro";
import { useNavigate } from "react-router-dom";

type Sinistro = {
  id: string;
  corretora_id: string;
  responsavel_id: string | null;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  cliente_id_legado: string | null;
  item_id: string | null;
  numero_sinistro: string | null;
  protocolo: string | null;
  tipo_sinistro: string | null;
  data_evento: string | null;
  hora_evento: string | null;
  data_aviso: string | null;
  descricao_evento: string | null;
  local_evento: string | null;
  causa_evento: string | null;
  dados_especificos: Record<string, unknown> | null;
  etapa_atual: string | null;
  status: string | null;
  prioridade: string | null;
  valor_prejuizo_estimado: number | null;
  valor_indenizacao: number | null;
  valor_franquia: number | null;
  desfecho: string | null;
  data_conclusao: string | null;
  observacoes_conclusao: string | null;
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
  etapa: string;
  prioridade: string;
};

const FILTROS_INICIAIS: Filtros = {
  busca: "",
  status: "",
  etapa: "",
  prioridade: "",
};

const STATUS_OPTIONS = [
  "ABERTO",
  "AGUARDANDO_CLIENTE",
  "AGUARDANDO_SEGURADORA",
  "AGUARDANDO_TERCEIRO_PRESTADOR",
  "SUSPENSO",
  "CONCLUIDO",
  "NEGADO",
  "CANCELADO",
];

const ETAPAS_OPTIONS = [
  "ABERTURA",
  "DOCUMENTACAO",
  "REGULACAO_ANALISE",
  "LIQUIDACAO_SOLUCAO",
  "ENCERRAMENTO",
];

const PRIORIDADES_OPTIONS = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
];



function formatarTexto(valor?: string | null) {
  if (!valor) return "—";

  return valor
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";

  const partes = valor.slice(0, 10).split("-");

  if (partes.length !== 3) {
    return valor;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarMoeda(valor?: number | null) {
  if (valor === null || valor === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
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
    case "ABERTO":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";

    case "AGUARDANDO_CLIENTE":
    case "AGUARDANDO_SEGURADORA":
    case "AGUARDANDO_TERCEIRO_PRESTADOR":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";

    case "SUSPENSO":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "CONCLUIDO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "NEGADO":
    case "CANCELADO":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function classePrioridade(prioridade?: string | null) {
  switch (prioridade) {
    case "URGENTE":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";

    case "ALTA":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300";

    case "NORMAL":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";

    case "BAIXA":
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default function SinistrosLista() {
  const [sinistros, setSinistros] = useState<Sinistro[]>([]);
  const [responsaveis, setResponsaveis] = useState<Record<string, PerfilResponsavel>>({});
  const [pessoas, setPessoas] = useState<Record<string, PessoaCrm>>({});
  const [empresas, setEmpresas] = useState<Record<string, EmpresaCrm>>({});
  const [clientesLegados, setClientesLegados] = useState<Record<string, ClienteLegado>>({});
  const [modalNovoSinistroAberto, setModalNovoSinistroAberto] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  const carregarRelacionamentos = useCallback(async (lista: Sinistro[]) => {
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
      responsavelIds.length > 0
        ? supabase
            .from("usuarios_perfis")
            .select("id, nome")
            .in("id", responsavelIds)
        : Promise.resolve({ data: [], error: null }),

      pessoaIds.length > 0
        ? supabase
            .from("crm_pessoas")
            .select("id, dados")
            .in("id", pessoaIds)
        : Promise.resolve({ data: [], error: null }),

      empresaIds.length > 0
        ? supabase
            .from("crm_empresas")
            .select("id, dados")
            .in("id", empresaIds)
        : Promise.resolve({ data: [], error: null }),

      clienteLegadoIds.length > 0
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

    (responsaveisResponse.data ?? []).forEach((item: PerfilResponsavel) => {
      mapaResponsaveis[item.id] = item;
    });

    (pessoasResponse.data ?? []).forEach((item: PessoaCrm) => {
      mapaPessoas[item.id] = item;
    });

    (empresasResponse.data ?? []).forEach((item: EmpresaCrm) => {
      mapaEmpresas[item.id] = item;
    });

    (clientesLegadosResponse.data ?? []).forEach((item: ClienteLegado) => {
      mapaClientesLegados[item.id] = item;
    });

    setResponsaveis(mapaResponsaveis);
    setPessoas(mapaPessoas);
    setEmpresas(mapaEmpresas);
    setClientesLegados(mapaClientesLegados);
  }, []);

  const carregarSinistros = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const { data, error } = await supabase
        .from("crm_sinistros")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const lista = (data ?? []) as Sinistro[];

      setSinistros(lista);

      await carregarRelacionamentos(lista);
    } catch (error) {
      console.error("Erro ao carregar sinistros:", error);

      if (error instanceof Error) {
        setErro(error.message);
      } else {
        setErro("Não foi possível carregar os sinistros.");
      }
    } finally {
      setLoading(false);
    }
  }, [carregarRelacionamentos]);

  useEffect(() => {
    carregarSinistros();
  }, [carregarSinistros]);

  const obterNomeCliente = useCallback(
    (sinistro: Sinistro) => {
      if (sinistro.crm_pessoa_id) {
        const nome = obterNomePessoa(pessoas[sinistro.crm_pessoa_id]);

        if (nome) return nome;
      }

      if (sinistro.crm_empresa_id) {
        const nome = obterNomeEmpresa(empresas[sinistro.crm_empresa_id]);

        if (nome) return nome;
      }

      if (sinistro.cliente_id_legado) {
        const cliente = clientesLegados[sinistro.cliente_id_legado];

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

  const sinistrosFiltrados = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase();

    return sinistros.filter((sinistro) => {
      if (filtros.status && sinistro.status !== filtros.status) {
        return false;
      }

      if (filtros.etapa && sinistro.etapa_atual !== filtros.etapa) {
        return false;
      }

      if (
        filtros.prioridade &&
        sinistro.prioridade !== filtros.prioridade
      ) {
        return false;
      }

      if (!busca) {
        return true;
      }

      const cliente = obterNomeCliente(sinistro);

      const conteudo = [
        sinistro.numero_sinistro,
        sinistro.protocolo,
        sinistro.tipo_sinistro,
        sinistro.descricao_evento,
        sinistro.local_evento,
        cliente,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return conteudo.includes(busca);
    });
  }, [sinistros, filtros, obterNomeCliente]);

  const quantidadeFiltrosAtivos = useMemo(() => {
    return [
      filtros.status,
      filtros.etapa,
      filtros.prioridade,
    ].filter(Boolean).length;
  }, [filtros]);

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
  }

  const handleNovoSinistro = () => {
    setModalNovoSinistroAberto(true);
  };

  const handleAbrirSinistro = (sinistro: Sinistro) => {
    navigate(`/whatsapp/sinistro/${sinistro.id}`);
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <ShieldAlert size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Sinistros
                </h1>

                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Gestão e acompanhamento dos sinistros da carteira.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={carregarSinistros}
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
              onClick={handleNovoSinistro}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Novo Sinistro
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
                placeholder="Buscar por cliente, número, protocolo, tipo ou descrição..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setMostrarFiltros((atual) => !atual)}
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
              <div className="grid gap-3 md:grid-cols-3">
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
                    Etapa
                  </label>

                  <select
                    value={filtros.etapa}
                    onChange={(event) =>
                      setFiltros((atual) => ({
                        ...atual,
                        etapa: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Todas</option>

                    {ETAPAS_OPTIONS.map((etapa) => (
                      <option key={etapa} value={etapa}>
                        {formatarTexto(etapa)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Prioridade
                  </label>

                  <select
                    value={filtros.prioridade}
                    onChange={(event) =>
                      setFiltros((atual) => ({
                        ...atual,
                        prioridade: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Todas</option>

                    {PRIORIDADES_OPTIONS.map((prioridade) => (
                      <option key={prioridade} value={prioridade}>
                        {formatarTexto(prioridade)}
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
              {sinistrosFiltrados.length}
            </span>{" "}
            {sinistrosFiltrados.length === 1
              ? "sinistro encontrado"
              : "sinistros encontrados"}
          </p>
        </div>

        {erro && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Erro ao carregar sinistros</p>
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
                Carregando sinistros...
              </p>
            </div>
          </div>
        ) : sinistrosFiltrados.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FileWarning size={23} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                Nenhum sinistro encontrado
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Não existem sinistros correspondentes aos filtros selecionados.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cliente / Sinistro
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Evento
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Etapa
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Prioridade
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
                  {sinistrosFiltrados.map((sinistro) => {
                    const nomeCliente = obterNomeCliente(sinistro);

                    const responsavel = sinistro.responsavel_id
                      ? responsaveis[sinistro.responsavel_id]
                      : null;

                    return (
                      <tr
                        key={sinistro.id}
                        className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <User size={17} />
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[280px] truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {nomeCliente}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                  {formatarTexto(sinistro.tipo_sinistro)}
                                </span>

                                {sinistro.numero_sinistro && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Nº {sinistro.numero_sinistro}
                                    </span>
                                  </>
                                )}

                                {sinistro.protocolo && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Prot. {sinistro.protocolo}
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
                              className="text-slate-400"
                            />
                            {formatarData(sinistro.data_evento)}
                          </div>

                          {sinistro.local_evento && (
                            <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                              {sinistro.local_evento}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <ClipboardList
                              size={15}
                              className="text-slate-400"
                            />

                            <span className="text-sm text-slate-700 dark:text-slate-200">
                              {formatarTexto(sinistro.etapa_atual)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classeStatus(
                              sinistro.status
                            )}`}
                          >
                            {formatarTexto(sinistro.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classePrioridade(
                              sinistro.prioridade
                            )}`}
                          >
                            {formatarTexto(sinistro.prioridade)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-[180px] truncate text-sm text-slate-700 dark:text-slate-200">
                            {responsavel?.nome || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleAbrirSinistro(sinistro)}
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

        {!loading && sinistrosFiltrados.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Em aberto
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {
                  sinistros.filter(
                    (item) =>
                      !["CONCLUIDO", "NEGADO", "CANCELADO"].includes(
                        item.status ?? ""
                      )
                  ).length
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Urgentes
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {
                  sinistros.filter(
                    (item) => item.prioridade === "URGENTE"
                  ).length
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Concluídos
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {
                  sinistros.filter(
                    (item) => item.status === "CONCLUIDO"
                  ).length
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Prejuízo estimado
              </p>

              <p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">
                {formatarMoeda(
                  sinistros
                    .filter(
                      (item) =>
                        !["CANCELADO", "NEGADO"].includes(
                          item.status ?? ""
                        )
                    )
                    .reduce(
                      (total, item) =>
                        total + (item.valor_prejuizo_estimado ?? 0),
                      0
                    )
                )}
              </p>
            </div>
          </div>
        )}
      </div>
      
      
      <ModalNovoSinistro
        open={modalNovoSinistroAberto}
        onClose={() => setModalNovoSinistroAberto(false)}
        onCreated={(sinistro) => {
          setModalNovoSinistroAberto(false);
          carregarSinistros();
          console.log("Sinistro criado:", sinistro);
        }}
      />
    </div>
  );
}