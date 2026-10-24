import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { supabase } from "../../../../../lib/supabaseClient";
import {
  buscarApolicesDoCliente,
  buscarApolicesDoRelacionamentoWhatsApp,
  criarSinistro,
  type CrmApoliceCliente,
  type CrmPrioridade,
  type CrmSinistro,
} from "../../../services/crmSinistroService";

type TipoClienteSinistro = "PF" | "PJ" | "LEGADO";

interface ClienteSinistro {
  id: string;
  tipo: TipoClienteSinistro;
  nome: string;
  documento: string | null;
  corretor_id: string | null;
  origem: "crm_pessoas" | "crm_empresas" | "tab_clientes";
}

interface ResponsavelOpcao {
  id: string;
  nome: string;
}

export interface ClienteInicialSinistro {
  tipo: "PF" | "PJ" | "LEGADO";
  id: string;
}

interface ModalNovoSinistroProps {
  open: boolean
  onClose: () => void
  onCreated?: (sinistro: CrmSinistro) => void
  clienteInicial?: ClienteInicialSinistro | null
  bloquearClienteInicial?: boolean
  contatoId?: string | null
}

interface FormState {
  cliente: ClienteSinistro | null;
  apolice: CrmApoliceCliente | null;
  responsavel_id: string;
  tipo_sinistro: string;
  data_evento: string;
  hora_evento: string;
  data_aviso: string;
  local_evento: string;
  causa_evento: string;
  descricao_evento: string;
  prioridade: CrmPrioridade;
  numero_sinistro: string;
  protocolo: string;
  valor_prejuizo_estimado: string;
  valor_franquia: string;
  valor_reclamado: string;
}

const TIPOS_SINISTRO = [
  "AUTOMOVEL",
  "RESIDENCIAL",
  "EMPRESARIAL",
  "VIDA",
  "SAUDE",
  "ODONTOLOGICO",
  "PREVIDENCIA",
  "VIAGEM",
  "RESPONSABILIDADE_CIVIL",
  "TRANSPORTE",
  "RURAL",
  "CONDOMINIO",
  "EQUIPAMENTOS",
  "OUTROS",
];

const PRIORIDADES: Array<{
  value: CrmPrioridade;
  label: string;
}> = [
  { value: "BAIXA", label: "Baixa" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

function dataHoje(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDocumento(
  documento: string | null,
  tipo: TipoClienteSinistro
): string {
  if (!documento) return "Documento não informado";

  const numeros = documento.replace(/\D/g, "");

  if (tipo === "PF" && numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (
    (tipo === "PJ" || tipo === "LEGADO") &&
    numeros.length === 14
  ) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return documento;
}

function formatarData(data?: string | null): string {
  if (!data) return "Não informada";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor?: number | null): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function converterNumero(valor: string): number | null {
  const limpo = valor
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!limpo) return null;

  const numero = Number(limpo);

  return Number.isFinite(numero) ? numero : null;
}

function obterNomePessoa(
  dados: Record<string, any> | null
): string {
  if (!dados) return "Pessoa sem nome";

  return (
    dados.nome ||
    dados.nome_completo ||
    dados.nome_razao_social ||
    "Pessoa sem nome"
  );
}

function obterNomeEmpresa(
  dados: Record<string, any> | null
): string {
  if (!dados) return "Empresa sem nome";

  return (
    dados.nome_fantasia ||
    dados.razao_social ||
    dados.nome_razao_social ||
    dados.nome ||
    "Empresa sem nome"
  );
}

function obterNomeLegado(
  cliente: Record<string, any>
): string {
  return (
    cliente.nome_fantasia ||
    cliente.nome_razao_social ||
    "Cliente sem nome"
  );
}

const estadoInicial = (): FormState => ({
  cliente: null,
  apolice: null,
  responsavel_id: "",
  tipo_sinistro: "",
  data_evento: dataHoje(),
  hora_evento: "",
  data_aviso: dataHoje(),
  local_evento: "",
  causa_evento: "",
  descricao_evento: "",
  prioridade: "NORMAL",
  numero_sinistro: "",
  protocolo: "",
  valor_prejuizo_estimado: "",
  valor_franquia: "",
  valor_reclamado: "",
});

export default function ModalNovoSinistro({
  open,
  onClose,
  onCreated,
  clienteInicial = null,
  bloquearClienteInicial = false,
  contatoId = null,
}: ModalNovoSinistroProps) {
  const [form, setForm] =
    useState<FormState>(estadoInicial);

  const [corretoraId, setCorretoraId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("");

  const [responsaveis, setResponsaveis] = useState<
    ResponsavelOpcao[]
  >([]);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientes, setClientes] = useState<
    ClienteSinistro[]
  >([]);
  const [buscandoClientes, setBuscandoClientes] =
    useState(false);
  const [clientesAberto, setClientesAberto] =
    useState(false);

  const [apolices, setApolices] = useState<
    CrmApoliceCliente[]
  >([]);
  const [buscandoApolices, setBuscandoApolices] =
    useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const podeEscolherResponsavel =
    tipoUsuario === "CORRETORA";

  const atualizarForm = useCallback(
    <K extends keyof FormState>(
      campo: K,
      valor: FormState[K]
    ) => {
      setForm((anterior) => ({
        ...anterior,
        [campo]: valor,
      }));
    },
    []
  );

  const carregarSessao = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: perfil, error: perfilError } =
      await supabase
        .from("usuarios_perfis")
        .select(
          "id, nome, tipo_usuario, corretora_id, ativo"
        )
        .eq("id", user.id)
        .single();

    if (perfilError) throw perfilError;

    if (!perfil?.ativo) {
      throw new Error("Usuário inativo.");
    }

    if (
      perfil.tipo_usuario !== "CORRETORA" &&
      perfil.tipo_usuario !== "CORRETOR"
    ) {
      throw new Error(
        "Perfil sem permissão para registrar sinistros."
      );
    }

    const tenantId =
      perfil.tipo_usuario === "CORRETORA"
        ? perfil.id
        : perfil.corretora_id;

    if (!tenantId) {
      throw new Error("Corretora não identificada.");
    }

    setCorretoraId(tenantId);
    setUsuarioId(perfil.id);
    setTipoUsuario(perfil.tipo_usuario);

    if (perfil.tipo_usuario === "CORRETOR") {
      setResponsaveis([
        {
          id: perfil.id,
          nome: perfil.nome || "Corretor",
        },
      ]);

      setForm((anterior) => ({
        ...anterior,
        responsavel_id: perfil.id,
      }));

      return;
    }

    const { data: usuarios, error: usuariosError } =
      await supabase
        .from("usuarios_perfis")
        .select("id, nome, tipo_usuario")
        .eq("corretora_id", tenantId)
        .eq("ativo", true)
        .in("tipo_usuario", ["CORRETOR"]);

    if (usuariosError) throw usuariosError;

    const lista: ResponsavelOpcao[] = [
      {
        id: perfil.id,
        nome: perfil.nome || "Corretora",
      },
      ...(usuarios ?? [])
        .filter((item) => item.id !== perfil.id)
        .map((item) => ({
          id: item.id,
          nome: item.nome || "Corretor",
        })),
    ];

    setResponsaveis(lista);

    setForm((anterior) => ({
      ...anterior,
      responsavel_id: perfil.id,
    }));
  }, []);

  const buscarClientes = useCallback(
    async (termo: string) => {
      if (!corretoraId) return;

      const busca = termo.trim();

      if (busca.length < 2) {
        setClientes([]);
        return;
      }

      setBuscandoClientes(true);

      try {
        const termoLike = `%${busca}%`;
        const documento = busca.replace(/\D/g, "");

        const consultas: PromiseLike<any>[] = [
          supabase
            .from("crm_pessoas")
            .select("id, cpf, corretor_id, dados")
            .eq("corretora_id", corretoraId)
            .or(
              documento
                ? `cpf.ilike.%${documento}%,dados->>nome.ilike.${termoLike}`
                : `dados->>nome.ilike.${termoLike}`
            )
            .limit(15),

          supabase
            .from("crm_empresas")
            .select("id, cnpj, corretor_id, dados")
            .eq("corretora_id", corretoraId)
            .or(
              documento
                ? `cnpj.ilike.%${documento}%,dados->>razao_social.ilike.${termoLike},dados->>nome_fantasia.ilike.${termoLike}`
                : `dados->>razao_social.ilike.${termoLike},dados->>nome_fantasia.ilike.${termoLike}`
            )
            .limit(15),

          supabase
            .from("tab_clientes")
            .select(
              "id, tipo_cliente, cpf_cnpj, nome_razao_social, nome_fantasia, corretor_id"
            )
            .eq("corretora_id", corretoraId)
            .or(
              documento
                ? `cpf_cnpj.ilike.%${documento}%,nome_razao_social.ilike.${termoLike},nome_fantasia.ilike.${termoLike}`
                : `nome_razao_social.ilike.${termoLike},nome_fantasia.ilike.${termoLike}`
            )
            .limit(15),
        ];

        const [
          pessoasResult,
          empresasResult,
          legadosResult,
        ] = await Promise.all(consultas);

        if (pessoasResult.error) {
          throw pessoasResult.error;
        }

        if (empresasResult.error) {
          throw empresasResult.error;
        }

        if (legadosResult.error) {
          throw legadosResult.error;
        }

        const pessoas: ClienteSinistro[] = (
          pessoasResult.data ?? []
        ).map((pessoa: any) => ({
          id: pessoa.id,
          tipo: "PF",
          nome: obterNomePessoa(pessoa.dados),
          documento: pessoa.cpf ?? null,
          corretor_id: pessoa.corretor_id ?? null,
          origem: "crm_pessoas",
        }));

        const empresas: ClienteSinistro[] = (
          empresasResult.data ?? []
        ).map((empresa: any) => ({
          id: empresa.id,
          tipo: "PJ",
          nome: obterNomeEmpresa(empresa.dados),
          documento: empresa.cnpj ?? null,
          corretor_id: empresa.corretor_id ?? null,
          origem: "crm_empresas",
        }));

        const legados: ClienteSinistro[] = (
          legadosResult.data ?? []
        ).map((cliente: any) => ({
          id: cliente.id,
          tipo: "LEGADO",
          nome: obterNomeLegado(cliente),
          documento: cliente.cpf_cnpj ?? null,
          corretor_id: cliente.corretor_id ?? null,
          origem: "tab_clientes",
        }));

        const resultado = [
          ...pessoas,
          ...empresas,
          ...legados,
        ].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        );

        setClientes(resultado);
      } catch (error: any) {
        console.error(
          "Erro ao buscar clientes para sinistro:",
          error
        );

        setClientes([]);

        setErro(
          error?.message ||
            "Não foi possível pesquisar os clientes."
        );
      } finally {
        setBuscandoClientes(false);
      }
    },
    [corretoraId]
  );

  const selecionarCliente = useCallback(
  async (cliente: ClienteSinistro) => {
    setForm((anterior) => ({
      ...anterior,
      cliente,
      apolice: null,
      responsavel_id:
        tipoUsuario === "CORRETOR"
          ? usuarioId
          : cliente.corretor_id ||
            anterior.responsavel_id,
    }));

    setBuscaCliente(cliente.nome);
    setClientesAberto(false);
    setApolices([]);
    setErro("");
    setBuscandoApolices(true);

    try {
      let resultado: CrmApoliceCliente[] = [];

      const mesmoClienteInicial =
        !!clienteInicial &&
        cliente.id === clienteInicial.id &&
        (
          cliente.tipo === "PF" ||
          cliente.tipo === "PJ"
        );

      if (
        contatoId &&
        mesmoClienteInicial
      ) {
        resultado =
          await buscarApolicesDoRelacionamentoWhatsApp({
            contato_id: contatoId,
            crm_pessoa_id:
              cliente.tipo === "PF"
                ? cliente.id
                : null,
            crm_empresa_id:
              cliente.tipo === "PJ"
                ? cliente.id
                : null,
          });
      } else {
        const parametros =
          cliente.origem === "crm_pessoas"
            ? {
                crm_pessoa_id: cliente.id,
              }
            : cliente.origem === "crm_empresas"
            ? {
                crm_empresa_id: cliente.id,
              }
            : {
                cliente_id_legado: cliente.id,
              };

        resultado =
          await buscarApolicesDoCliente(
            parametros
          );
      }

      setApolices(resultado);

      if (resultado.length === 1) {
        setForm((anterior) => ({
          ...anterior,
          apolice: resultado[0],
        }));
      }
    } catch (error: any) {
      console.error(
        "Erro ao buscar apólices:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível buscar as apólices do cliente."
      );
    } finally {
      setBuscandoApolices(false);
    }
  },
  [
    tipoUsuario,
    usuarioId,
    contatoId,
    clienteInicial,
  ]
);

  const carregarClienteInicial = useCallback(
    async (cliente: ClienteInicialSinistro) => {
      if (!corretoraId) return;

      try {
        let clienteEncontrado: ClienteSinistro;

        if (cliente.tipo === "PF") {
          const { data, error } = await supabase
            .from("crm_pessoas")
            .select("id, cpf, corretor_id, dados")
            .eq("id", cliente.id)
            .eq("corretora_id", corretoraId)
            .single();

          if (error) throw error;

          clienteEncontrado = {
            id: data.id,
            tipo: "PF",
            nome: obterNomePessoa(data.dados),
            documento: data.cpf ?? null,
            corretor_id: data.corretor_id ?? null,
            origem: "crm_pessoas",
          };
        } else if (cliente.tipo === "PJ") {
          const { data, error } = await supabase
            .from("crm_empresas")
            .select("id, cnpj, corretor_id, dados")
            .eq("id", cliente.id)
            .eq("corretora_id", corretoraId)
            .single();

          if (error) throw error;

          clienteEncontrado = {
            id: data.id,
            tipo: "PJ",
            nome: obterNomeEmpresa(data.dados),
            documento: data.cnpj ?? null,
            corretor_id: data.corretor_id ?? null,
            origem: "crm_empresas",
          };
        } else {
          const { data, error } = await supabase
            .from("tab_clientes")
            .select(
              "id, tipo_cliente, cpf_cnpj, nome_razao_social, nome_fantasia, corretor_id"
            )
            .eq("id", cliente.id)
            .eq("corretora_id", corretoraId)
            .single();

          if (error) throw error;

          clienteEncontrado = {
            id: data.id,
            tipo: "LEGADO",
            nome: obterNomeLegado(data),
            documento: data.cpf_cnpj ?? null,
            corretor_id: data.corretor_id ?? null,
            origem: "tab_clientes",
          };
        }

        await selecionarCliente(clienteEncontrado);
      } catch (error: any) {
        console.error(
          "Erro ao carregar cliente inicial do sinistro:",
          error
        );

        setErro(
          error?.message ||
            "Não foi possível carregar o cliente selecionado."
        );
      }
    },
    [corretoraId, selecionarCliente]
  );

  const limparCliente = useCallback(() => {
    setForm((anterior) => ({
      ...anterior,
      cliente: null,
      apolice: null,
    }));

    setBuscaCliente("");
    setClientes([]);
    setApolices([]);
    setClientesAberto(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    setErro("");
    setForm(estadoInicial());
    setBuscaCliente("");
    setClientes([]);
    setApolices([]);
    setClientesAberto(false);

    setCorretoraId("");
    setUsuarioId("");
    setTipoUsuario("");
    setResponsaveis([]);

    carregarSessao().catch((error: any) => {
      console.error(
        "Erro ao carregar sessão do sinistro:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os dados do usuário."
      );
    });
  }, [open, carregarSessao]);

  useEffect(() => {
    if (
      !open ||
      !corretoraId ||
      !clienteInicial
    ) {
      return;
    }

    void carregarClienteInicial(clienteInicial);
  }, [
    open,
    corretoraId,
    clienteInicial,
    carregarClienteInicial,
  ]);

  useEffect(() => {
    if (!open || !corretoraId) return;

    if (clienteInicial && form.cliente) {
      return;
    }

    const timeout = window.setTimeout(() => {
      buscarClientes(buscaCliente);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    buscaCliente,
    corretoraId,
    open,
    buscarClientes,
    clienteInicial,
    form.cliente,
  ]);

  const validar = useCallback((): string | null => {
    if (!form.cliente) {
      return "Selecione o cliente do sinistro.";
    }

    if (!form.apolice) {
      return "Selecione a apólice relacionada ao sinistro.";
    }

    if (!form.responsavel_id) {
      return "Selecione o responsável pelo sinistro.";
    }

    if (!form.tipo_sinistro) {
      return "Informe o tipo do sinistro.";
    }

    if (!form.data_evento) {
      return "Informe a data do evento.";
    }

    if (!form.descricao_evento.trim()) {
      return "Descreva o evento do sinistro.";
    }

    return null;
  }, [form]);

  const salvar = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (salvando) return;

      const validacao = validar();

      if (validacao) {
        setErro(validacao);
        return;
      }

      if (!form.cliente || !form.apolice) {
        return;
      }

      setSalvando(true);
      setErro("");

      try {
        const cliente = form.cliente;
      const apolice = form.apolice;

      const apoliceTemTitularCrm =
        !!apolice.crm_pessoa_id ||
        !!apolice.crm_empresa_id;

      const crmPessoaIdFinal =
        apoliceTemTitularCrm
          ? apolice.crm_pessoa_id ?? null
          : cliente.origem === "crm_pessoas"
            ? cliente.id
            : null;

      const crmEmpresaIdFinal =
        apoliceTemTitularCrm
          ? apolice.crm_empresa_id ?? null
          : cliente.origem === "crm_empresas"
            ? cliente.id
            : null;

      const clienteLegadoIdFinal =
        !apoliceTemTitularCrm &&
        cliente.origem === "tab_clientes"
          ? cliente.id
          : null;

        const sinistro = await criarSinistro({
          corretora_id: corretoraId,
          responsavel_id: form.responsavel_id,

          crm_pessoa_id:
            crmPessoaIdFinal,

          crm_empresa_id:
            crmEmpresaIdFinal,

          cliente_id_legado:
            clienteLegadoIdFinal,

          crm_proposta_item_id:
            apolice.crm_proposta_item_id,

          numero_sinistro:
            form.numero_sinistro.trim() || null,

          protocolo:
            form.protocolo.trim() || null,

          tipo_sinistro: form.tipo_sinistro,

          data_evento:
            form.data_evento || null,

          hora_evento:
            form.hora_evento || null,

          data_aviso:
            form.data_aviso || null,

          descricao_evento:
            form.descricao_evento.trim(),

          local_evento:
            form.local_evento.trim() || null,

          causa_evento:
            form.causa_evento.trim() || null,

          etapa_atual: "ABERTURA",
          status: "ABERTO",
          prioridade: form.prioridade,

          valor_prejuizo_estimado:
            converterNumero(
              form.valor_prejuizo_estimado
            ),

          valor_franquia:
            converterNumero(form.valor_franquia),

          valor_reclamado:
            converterNumero(form.valor_reclamado),

          dados_especificos: {
            apolice: {
              numero_apolice:
                form.apolice.numero_apolice,
              numero_proposta:
                form.apolice.numero_proposta,
              numero_cotacao:
                form.apolice.numero_cotacao,
              produto_id:
                form.apolice.produto_id,
              produto_nome:
                form.apolice.produto_nome,
              seguradora_id:
                form.apolice.seguradora_id,
              seguradora_nome:
                form.apolice.seguradora_nome,
              data_inicio_vigencia:
                form.apolice.data_inicio_vigencia,
              data_fim_vigencia:
                form.apolice.data_fim_vigencia,
            },
          },
        });

        onCreated?.(sinistro);
        onClose();
      } catch (error: any) {
        console.error(
          "Erro ao criar sinistro:",
          error
        );

        setErro(
          error?.message ||
            "Não foi possível criar o sinistro."
        );
      } finally {
        setSalvando(false);
      }
    },
    [
      corretoraId,
      form,
      onClose,
      onCreated,
      salvando,
      validar,
    ]
  );

  const tituloApolice = useMemo(() => {
    if (!form.apolice) return "";

    return [
      form.apolice.numero_apolice,
      form.apolice.produto_nome,
      form.apolice.seguradora_nome,
    ]
      .filter(Boolean)
      .join(" • ");
  }, [form.apolice]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Novo Sinistro
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Registre a abertura inicial do sinistro.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={salvar}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {erro && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <span>{erro}</span>
              </div>
            )}

            <section>
              <div className="mb-4 flex items-center gap-2">
                <User
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Cliente e apólice
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cliente *
                  </label>

                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={buscaCliente}
                      disabled={bloquearClienteInicial}
                      onChange={(event) => {
                        if (bloquearClienteInicial) {
                          return
                        }

                        setBuscaCliente(
                          event.target.value
                        )

                        setClientesAberto(true)

                        if (form.cliente) {
                          setForm((anterior) => ({
                            ...anterior,
                            cliente: null,
                            apolice: null,
                          }))

                          setApolices([])
                        }
                      }}
                      onFocus={() => {
                        if (!bloquearClienteInicial) {
                          setClientesAberto(true)
                        }
                      }}
                      placeholder="Nome, CPF, CNPJ..."
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                    />

                    {buscandoClientes ? (
                      <Loader2
                        size={17}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                      />
                    ) : form.cliente &&
                      !bloquearClienteInicial ? (
                    <button
                      type="button"
                      onClick={limparCliente}
                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                  </div>

                  {!bloquearClienteInicial &&
                    clientesAberto &&
                    buscaCliente.trim().length >= 2 &&
                    !form.cliente && (
                      <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        {buscandoClientes ? (
                          <div className="px-3 py-4 text-center text-sm text-slate-500">
                            Pesquisando...
                          </div>
                        ) : clientes.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-slate-500">
                            Nenhum cliente encontrado.
                          </div>
                        ) : (
                          clientes.map((cliente) => (
                            <button
                              key={`${cliente.origem}-${cliente.id}`}
                              type="button"
                              onClick={() =>
                                selecionarCliente(
                                  cliente
                                )
                              }
                              className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <User size={16} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {cliente.nome}
                                </div>

                                <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                                  <span>
                                    {cliente.origem ===
                                    "crm_pessoas"
                                      ? "Pessoa"
                                      : cliente.origem ===
                                        "crm_empresas"
                                      ? "Empresa"
                                      : "Cadastro legado"}
                                  </span>

                                  <span>•</span>

                                  <span>
                                    {formatarDocumento(
                                      cliente.documento,
                                      cliente.tipo
                                    )}
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Apólice *
                  </label>

                  <div className="relative">
                    <select
                      value={
                        form.apolice?.crm_proposta_item_id ?? ""
                      }
                      onChange={(event) => {
                        const apolice =
                          apolices.find(
                            (item) =>
                              item.crm_proposta_item_id ===
                                event.target.value
                          ) ?? null;

                        atualizarForm(
                          "apolice",
                          apolice
                        );
                      }}
                      disabled={
                        !form.cliente ||
                        buscandoApolices
                      }
                      className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                    >
                      <option value="">
                        {buscandoApolices
                          ? "Buscando apólices..."
                          : !form.cliente
                          ? "Selecione primeiro o cliente"
                          : apolices.length === 0
                          ? "Nenhuma apólice encontrada"
                          : "Selecione a apólice"}
                      </option>

                      {apolices.map((apolice) => (
                        <option
                            key={apolice.crm_proposta_item_id}
                            value={apolice.crm_proposta_item_id}
                          >
                          {apolice.numero_apolice}

                          {apolice.produto_nome
                            ? ` - ${apolice.produto_nome}`
                            : ""}

                          {apolice.seguradora_nome
                            ? ` - ${apolice.seguradora_nome}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {buscandoApolices ? (
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
              </div>

              {form.apolice && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck
                      size={18}
                      className="text-emerald-600 dark:text-emerald-400"
                    />

                    <span className="font-medium text-emerald-900 dark:text-emerald-200">
                      {tituloApolice}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        Proposta
                      </div>

                      <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                        {
                          form.apolice
                            .numero_proposta
                        }
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        Vigência
                      </div>

                      <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                        {formatarData(
                          form.apolice
                            .data_inicio_vigencia
                        )}{" "}
                        até{" "}
                        {formatarData(
                          form.apolice
                            .data_fim_vigencia
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        Prêmio
                      </div>

                      <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                        {formatarMoeda(
                          form.apolice.valor_premio
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        Status da proposta
                      </div>

                      <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                        {form.apolice
                          .proposta_status ||
                          "Não informado"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

            <section>
              <div className="mb-4 flex items-center gap-2">
                <FileText
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Dados da abertura
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tipo de sinistro *
                  </label>

                  <select
                    value={form.tipo_sinistro}
                    onChange={(event) =>
                      atualizarForm(
                        "tipo_sinistro",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="">
                      Selecione
                    </option>

                    {TIPOS_SINISTRO.map((tipo) => (
                      <option
                        key={tipo}
                        value={tipo}
                      >
                        {tipo.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Responsável *
                  </label>

                  <select
                    value={form.responsavel_id}
                    onChange={(event) =>
                      atualizarForm(
                        "responsavel_id",
                        event.target.value
                      )
                    }
                    disabled={
                      !podeEscolherResponsavel
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/50"
                  >
                    <option value="">
                      Selecione
                    </option>

                    {responsaveis.map(
                      (responsavel) => (
                        <option
                          key={responsavel.id}
                          value={responsavel.id}
                        >
                          {responsavel.nome}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Prioridade
                  </label>

                  <select
                    value={form.prioridade}
                    onChange={(event) =>
                      atualizarForm(
                        "prioridade",
                        event.target
                          .value as CrmPrioridade
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  >
                    {PRIORIDADES.map(
                      (prioridade) => (
                        <option
                          key={prioridade.value}
                          value={prioridade.value}
                        >
                          {prioridade.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Data do evento *
                  </label>

                  <input
                    type="date"
                    value={form.data_evento}
                    onChange={(event) =>
                      atualizarForm(
                        "data_evento",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Horário do evento
                  </label>

                  <input
                    type="time"
                    value={form.hora_evento}
                    onChange={(event) =>
                      atualizarForm(
                        "hora_evento",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Data do aviso
                  </label>

                  <input
                    type="date"
                    value={form.data_aviso}
                    onChange={(event) =>
                      atualizarForm(
                        "data_aviso",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Local do evento
                  </label>

                  <input
                    value={form.local_evento}
                    onChange={(event) =>
                      atualizarForm(
                        "local_evento",
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Imbituba/SC"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Causa
                  </label>

                  <input
                    value={form.causa_evento}
                    onChange={(event) =>
                      atualizarForm(
                        "causa_evento",
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Colisão"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Descrição do evento *
                  </label>

                  <textarea
                    value={form.descricao_evento}
                    onChange={(event) =>
                      atualizarForm(
                        "descricao_evento",
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Descreva o que aconteceu..."
                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            </section>

            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

            <section>
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Identificação e valores
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Número do sinistro
                  </label>

                  <input
                    value={form.numero_sinistro}
                    onChange={(event) =>
                      atualizarForm(
                        "numero_sinistro",
                        event.target.value
                      )
                    }
                    placeholder="Se já informado pela seguradora"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Protocolo
                  </label>

                  <input
                    value={form.protocolo}
                    onChange={(event) =>
                      atualizarForm(
                        "protocolo",
                        event.target.value
                      )
                    }
                    placeholder="Protocolo da seguradora"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Prejuízo estimado
                  </label>

                  <input
                    inputMode="decimal"
                    value={
                      form.valor_prejuizo_estimado
                    }
                    onChange={(event) =>
                      atualizarForm(
                        "valor_prejuizo_estimado",
                        event.target.value
                      )
                    }
                    placeholder="0,00"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Franquia
                  </label>

                  <input
                    inputMode="decimal"
                    value={form.valor_franquia}
                    onChange={(event) =>
                      atualizarForm(
                        "valor_franquia",
                        event.target.value
                      )
                    }
                    placeholder="0,00"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Valor reclamado
                  </label>

                  <input
                    inputMode="decimal"
                    value={form.valor_reclamado}
                    onChange={(event) =>
                      atualizarForm(
                        "valor_reclamado",
                        event.target.value
                      )
                    }
                    placeholder="0,00"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="hidden text-xs text-slate-500 sm:block">
              O sinistro será criado em{" "}
              <strong>ABERTURA / ABERTO</strong>.
            </div>

            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Abrir sinistro
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}