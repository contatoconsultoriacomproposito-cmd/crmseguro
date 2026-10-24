import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  File,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import {
  adicionarEnvolvido,
  atualizarSinistro,
  buscarDossieSinistro,
  cancelarCompromissoAgenda,
  concluirCompromissoAgenda,
  criarCompromissoNaAgenda,
  criarOcorrencia,
  enviarAnexo,
  obterUrlAnexo,
  removerAnexo,
  type CrmAgendaEvento,
  type CrmEventoAnexo,
  type CrmPrioridade,
  type CrmSinistro,
  type CrmSinistroDossie,
  type CrmSinistroEtapa,
  type CrmSinistroStatus,
} from "../../services/crmSinistroService";

type Aba =
  | "RESUMO"
  | "OCORRENCIAS"
  | "ENVOLVIDOS"
  | "AGENDA"
  | "ANEXOS";

interface ClienteInfo {
  nome: string;
  documento: string | null;
  tipo: "PF" | "PJ" | "LEGADO";
}

interface ResponsavelInfo {
  id: string;
  nome: string;
}

const ETAPAS: Array<{ value: CrmSinistroEtapa; label: string }> = [
  { value: "ABERTURA", label: "Abertura" },
  { value: "DOCUMENTACAO", label: "Documentação" },
  { value: "REGULACAO_ANALISE", label: "Regulação / Análise" },
  { value: "LIQUIDACAO_SOLUCAO", label: "Liquidação / Solução" },
  { value: "ENCERRAMENTO", label: "Encerramento" },
];

const STATUS: Array<{ value: CrmSinistroStatus; label: string }> = [
  { value: "ABERTO", label: "Aberto" },
  { value: "AGUARDANDO_CLIENTE", label: "Aguardando cliente" },
  { value: "AGUARDANDO_SEGURADORA", label: "Aguardando seguradora" },
  {
    value: "AGUARDANDO_TERCEIRO_PRESTADOR",
    label: "Aguardando terceiro / prestador",
  },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "NEGADO", label: "Negado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const PRIORIDADES: Array<{ value: CrmPrioridade; label: string }> = [
  { value: "BAIXA", label: "Baixa" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

const TIPOS_OCORRENCIA = [
  "CONTATO_CLIENTE",
  "CONTATO_SEGURADORA",
  "ENVIO_DOCUMENTO",
  "RECEBIMENTO_DOCUMENTO",
  "REGULACAO",
  "VISTORIA",
  "ATUALIZACAO",
  "PENDENCIA",
  "DECISAO",
  "OUTROS",
];

const TIPOS_ENVOLVIDO = [
  "SEGURADO",
  "CONDUTOR",
  "TERCEIRO",
  "BENEFICIARIO",
  "PRESTADOR",
  "REGULADOR",
  "ADVOGADO",
  "TESTEMUNHA",
  "OUTRO",
];

function formatarData(valor?: string | null) {
  if (!valor) return "—";

  const somenteData = valor.substring(0, 10);
  const [ano, mes, dia] = somenteData.split("-");

  if (!ano || !mes || !dia) return valor;

  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function formatarMoeda(valor?: number | null) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDocumento(valor?: string | null) {
  if (!valor) return "—";

  const numeros = valor.replace(/\D/g, "");

  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (numeros.length === 14) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return valor;
}

function formatarBytes(valor?: number | null) {
  if (!valor) return "—";

  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;

  return `${(valor / 1024 / 1024).toFixed(1)} MB`;
}

function labelEnum(valor?: string | null) {
  if (!valor) return "—";

  return valor
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "green" | "red" | "yellow" | "blue";
}) {
  const classes = {
    default:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    yellow:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes[variant]}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        {icon}
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SinistroDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);

  const [dossie, setDossie] = useState<CrmSinistroDossie | null>(null);
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [responsavel, setResponsavel] = useState<ResponsavelInfo | null>(null);
  const [usuarioId, setUsuarioId] = useState("");

  const [aba, setAba] = useState<Aba>("RESUMO");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [modalOcorrencia, setModalOcorrencia] = useState(false);
  const [modalEnvolvido, setModalEnvolvido] = useState(false);
  const [modalCompromisso, setModalCompromisso] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  const [tipoOcorrencia, setTipoOcorrencia] = useState("ATUALIZACAO");
  const [relatoOcorrencia, setRelatoOcorrencia] = useState("");
  const [protocoloOcorrencia, setProtocoloOcorrencia] = useState("");

  const [tipoEnvolvido, setTipoEnvolvido] = useState("TERCEIRO");
  const [nomeEnvolvido, setNomeEnvolvido] = useState("");
  const [documentoEnvolvido, setDocumentoEnvolvido] = useState("");
  const [telefoneEnvolvido, setTelefoneEnvolvido] = useState("");
  const [emailEnvolvido, setEmailEnvolvido] = useState("");
  const [observacoesEnvolvido, setObservacoesEnvolvido] = useState("");

  const [tituloCompromisso, setTituloCompromisso] = useState("");
  const [descricaoCompromisso, setDescricaoCompromisso] = useState("");
  const [dataCompromisso, setDataCompromisso] = useState("");
  const [horaCompromisso, setHoraCompromisso] = useState("");
  const [prioridadeCompromisso, setPrioridadeCompromisso] =
    useState<CrmPrioridade>("NORMAL");

  const sinistro = dossie?.sinistro ?? null;

  const carregarDadosComplementares = useCallback(
    async (sinistroAtual: CrmSinistro) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUsuarioId(user?.id ?? "");

      const tarefas: Promise<void>[] = [];

      if (sinistroAtual.responsavel_id) {
        tarefas.push(
          (async () => {
            const { data } = await supabase
              .from("usuarios_perfis")
              .select("id, nome")
              .eq("id", sinistroAtual.responsavel_id)
              .maybeSingle();

            if (data) {
              setResponsavel({
                id: data.id,
                nome: data.nome || "Responsável",
              });
            }
          })()
        );
      }

      if (sinistroAtual.crm_pessoa_id) {
        tarefas.push(
          (async () => {
            const { data } = await supabase
              .from("crm_pessoas")
              .select("cpf, dados")
              .eq("id", sinistroAtual.crm_pessoa_id)
              .maybeSingle();

            if (data) {
              setCliente({
                tipo: "PF",
                documento: data.cpf ?? null,
                nome:
                  data.dados?.nome ||
                  data.dados?.nome_completo ||
                  "Pessoa sem nome",
              });
            }
          })()
        );
      } else if (sinistroAtual.crm_empresa_id) {
        tarefas.push(
          (async () => {
            const { data } = await supabase
              .from("crm_empresas")
              .select("cnpj, dados")
              .eq("id", sinistroAtual.crm_empresa_id)
              .maybeSingle();

            if (data) {
              setCliente({
                tipo: "PJ",
                documento: data.cnpj ?? null,
                nome:
                  data.dados?.nome_fantasia ||
                  data.dados?.razao_social ||
                  data.dados?.nome_razao_social ||
                  "Empresa sem nome",
              });
            }
          })()
        );
      } else if (sinistroAtual.cliente_id_legado) {
        tarefas.push(
          (async () => {
            const { data } = await supabase
              .from("tab_clientes")
              .select(
                "tipo_cliente, cpf_cnpj, nome_razao_social, nome_fantasia"
              )
              .eq("id", sinistroAtual.cliente_id_legado)
              .maybeSingle();

            if (data) {
              setCliente({
                tipo: "LEGADO",
                documento: data.cpf_cnpj ?? null,
                nome:
                  data.nome_fantasia ||
                  data.nome_razao_social ||
                  "Cliente sem nome",
              });
            }
          })()
        );
      }

      await Promise.all(tarefas);
    },
    []
  );

  const carregarDossie = useCallback(async () => {
    if (!id) {
      setErro("ID do sinistro não informado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const resultado = await buscarDossieSinistro(id);

      if (!resultado) {
        setDossie(null);
        setErro("Sinistro não encontrado.");
        return;
      }

      setDossie(resultado);
      await carregarDadosComplementares(resultado.sinistro);
    } catch (error: any) {
      console.error("Erro ao carregar dossiê:", error);
      setErro(error?.message || "Não foi possível carregar o sinistro.");
    } finally {
      setLoading(false);
    }
  }, [id, carregarDadosComplementares]);

  useEffect(() => {
    carregarDossie();
  }, [carregarDossie]);

  const atualizarCampoSinistro = async (
    campo: "etapa_atual" | "status" | "prioridade",
    valor: string
  ) => {
    if (!sinistro) return;

    setSalvando(true);
    setErro("");

    try {
      const atualizado = await atualizarSinistro(sinistro.id, {
        [campo]: valor,
      });

      setDossie((anterior) =>
        anterior
          ? {
              ...anterior,
              sinistro: atualizado,
            }
          : anterior
      );
    } catch (error: any) {
      console.error("Erro ao atualizar sinistro:", error);
      setErro(error?.message || "Não foi possível atualizar o sinistro.");
    } finally {
      setSalvando(false);
    }
  };

  const salvarOcorrencia = async () => {
    if (!sinistro) return;

    if (!relatoOcorrencia.trim()) {
      setErro("Informe o relato da ocorrência.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await criarOcorrencia({
        sinistro_id: sinistro.id,
        corretora_id: sinistro.corretora_id,
        responsavel_id: sinistro.responsavel_id,
        tipo_ocorrencia: tipoOcorrencia,
        relato: relatoOcorrencia.trim(),
        protocolo: protocoloOcorrencia.trim() || null,
      });

      setModalOcorrencia(false);
      setRelatoOcorrencia("");
      setProtocoloOcorrencia("");
      setTipoOcorrencia("ATUALIZACAO");

      await carregarDossie();
      setAba("OCORRENCIAS");
    } catch (error: any) {
      console.error("Erro ao registrar ocorrência:", error);
      setErro(error?.message || "Não foi possível registrar a ocorrência.");
    } finally {
      setSalvando(false);
    }
  };

  const salvarEnvolvido = async () => {
    if (!sinistro) return;

    if (!nomeEnvolvido.trim()) {
      setErro("Informe o nome do envolvido.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await adicionarEnvolvido({
        sinistro_id: sinistro.id,
        corretora_id: sinistro.corretora_id,
        tipo_envolvido: tipoEnvolvido,
        nome: nomeEnvolvido.trim(),
        cpf_cnpj: documentoEnvolvido || null,
        telefone: telefoneEnvolvido || null,
        email: emailEnvolvido || null,
        observacoes: observacoesEnvolvido || null,
      });

      setModalEnvolvido(false);
      setNomeEnvolvido("");
      setDocumentoEnvolvido("");
      setTelefoneEnvolvido("");
      setEmailEnvolvido("");
      setObservacoesEnvolvido("");
      setTipoEnvolvido("TERCEIRO");

      await carregarDossie();
      setAba("ENVOLVIDOS");
    } catch (error: any) {
      console.error("Erro ao adicionar envolvido:", error);
      setErro(error?.message || "Não foi possível adicionar o envolvido.");
    } finally {
      setSalvando(false);
    }
  };

  const salvarCompromisso = async () => {
    if (!sinistro) return;

    if (!tituloCompromisso.trim()) {
      setErro("Informe o título do compromisso.");
      return;
    }

    if (!dataCompromisso || !horaCompromisso) {
      setErro("Informe a data e o horário do compromisso.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const inicio = new Date(
        `${dataCompromisso}T${horaCompromisso}:00`
      ).toISOString();

      await criarCompromissoNaAgenda({
        sinistro,
        titulo: tituloCompromisso.trim(),
        descricao: descricaoCompromisso.trim() || null,
        inicio_em: inicio,
        prioridade: prioridadeCompromisso,
        criado_por_id: usuarioId || null,
      });

      setModalCompromisso(false);
      setTituloCompromisso("");
      setDescricaoCompromisso("");
      setDataCompromisso("");
      setHoraCompromisso("");
      setPrioridadeCompromisso("NORMAL");

      await carregarDossie();
      setAba("AGENDA");
    } catch (error: any) {
      console.error("Erro ao criar compromisso:", error);
      setErro(error?.message || "Não foi possível criar o compromisso.");
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatusCompromisso = async (
    compromisso: CrmAgendaEvento,
    acao: "CONCLUIR" | "CANCELAR"
  ) => {
    setSalvando(true);
    setErro("");

    try {
      if (acao === "CONCLUIR") {
        await concluirCompromissoAgenda(compromisso.id);
      } else {
        await cancelarCompromissoAgenda(compromisso.id);
      }

      await carregarDossie();
    } catch (error: any) {
      console.error("Erro ao alterar compromisso:", error);
      setErro(error?.message || "Não foi possível alterar o compromisso.");
    } finally {
      setSalvando(false);
    }
  };

  const selecionarArquivo = () => {
    inputArquivoRef.current?.click();
  };

  const handleArquivo = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];

    if (!arquivo || !sinistro) return;

    setEnviandoAnexo(true);
    setErro("");

    try {
      await enviarAnexo({
        arquivo,
        corretora_id: sinistro.corretora_id,
        origem_id: sinistro.id,
        tipo_origem: "SINISTRO",
        enviado_por_id: usuarioId || null,
        tipo_documento: "DOCUMENTO_SINISTRO",
      });

      await carregarDossie();
      setAba("ANEXOS");
    } catch (error: any) {
      console.error("Erro ao enviar anexo:", error);
      setErro(error?.message || "Não foi possível enviar o arquivo.");
    } finally {
      setEnviandoAnexo(false);

      if (inputArquivoRef.current) {
        inputArquivoRef.current.value = "";
      }
    }
  };

  const abrirAnexo = async (anexo: CrmEventoAnexo) => {
    try {
      const url = await obterUrlAnexo(anexo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      setErro(error?.message || "Não foi possível abrir o arquivo.");
    }
  };

  const excluirAnexo = async (anexo: CrmEventoAnexo) => {
    const confirmar = window.confirm(
      `Deseja realmente remover "${anexo.nome_arquivo}"?`
    );

    if (!confirmar) return;

    setSalvando(true);
    setErro("");

    try {
      await removerAnexo(anexo);
      await carregarDossie();
    } catch (error: any) {
      setErro(error?.message || "Não foi possível remover o arquivo.");
    } finally {
      setSalvando(false);
    }
  };

  const apolice = useMemo(
    () => sinistro?.dados_especificos?.apolice ?? null,
    [sinistro]
  );

  const compromissosPendentes = useMemo(
    () =>
      dossie?.compromissos.filter(
        (compromisso) => compromisso.status === "PENDENTE"
      ).length ?? 0,
    [dossie]
  );

  const abas = useMemo(
    () => [
      { id: "RESUMO" as Aba, label: "Resumo" },
      {
        id: "OCORRENCIAS" as Aba,
        label: "Ocorrências",
        count: dossie?.ocorrencias.length ?? 0,
      },
      {
        id: "ENVOLVIDOS" as Aba,
        label: "Envolvidos",
        count: dossie?.envolvidos.length ?? 0,
      },
      {
        id: "AGENDA" as Aba,
        label: "Agenda",
        count: compromissosPendentes,
      },
      {
        id: "ANEXOS" as Aba,
        label: "Anexos",
        count: dossie?.anexos.length ?? 0,
      },
    ],
    [dossie, compromissosPendentes]
  );

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={22} className="animate-spin" />
          Carregando dossiê do sinistro...
        </div>
      </div>
    );
  }

  if (!sinistro || !dossie) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {erro || "Sinistro não encontrado."}
        </div>

        <button
          type="button"
          onClick={() => navigate("/whatsapp/sinistro")}
          className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600"
        >
          <ArrowLeft size={16} />
          Voltar para Sinistros
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <input
        ref={inputArquivoRef}
        type="file"
        className="hidden"
        onChange={handleArquivo}
      />

      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="px-6 py-5">
          <button
            type="button"
            onClick={() => navigate("/whatsapp/sinistro")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Sinistros
          </button>

          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="red">{labelEnum(sinistro.tipo_sinistro)}</Badge>

                <Badge variant="blue">
                  {labelEnum(sinistro.etapa_atual)}
                </Badge>

                <Badge
                  variant={
                    sinistro.status === "CONCLUIDO"
                      ? "green"
                      : sinistro.status === "NEGADO" ||
                        sinistro.status === "CANCELADO"
                      ? "red"
                      : "yellow"
                  }
                >
                  {labelEnum(sinistro.status)}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Sinistro{" "}
                {sinistro.numero_sinistro
                  ? `#${sinistro.numero_sinistro}`
                  : "sem número"}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <User size={15} />
                  {cliente?.nome || "Cliente"}
                </span>

                <span className="flex items-center gap-1.5">
                  <Calendar size={15} />
                  Evento em {formatarData(sinistro.data_evento)}
                </span>

                {sinistro.local_evento && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} />
                    {sinistro.local_evento}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModalOcorrencia(true)}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus size={16} />
                Ocorrência
              </button>

              <button
                type="button"
                onClick={() => setModalCompromisso(true)}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <CalendarPlus size={16} />
                Compromisso
              </button>

              <button
                type="button"
                onClick={selecionarArquivo}
                disabled={enviandoAnexo}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {enviandoAnexo ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}
                Anexo
              </button>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto px-6">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-medium transition ${
                aba === item.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {item.label}

              {item.count !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {erro && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {aba === "RESUMO" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <Card
                title="Andamento do sinistro"
                icon={<RefreshCw size={18} className="text-blue-600" />}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Etapa
                    </label>

                    <select
                      value={sinistro.etapa_atual}
                      disabled={salvando}
                      onChange={(event) =>
                        atualizarCampoSinistro(
                          "etapa_atual",
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {ETAPAS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </label>

                    <select
                      value={sinistro.status}
                      disabled={salvando}
                      onChange={(event) =>
                        atualizarCampoSinistro("status", event.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {STATUS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Prioridade
                    </label>

                    <select
                      value={sinistro.prioridade}
                      disabled={salvando}
                      onChange={(event) =>
                        atualizarCampoSinistro(
                          "prioridade",
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {PRIORIDADES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              <Card
                title="Evento"
                icon={<AlertTriangle size={18} className="text-red-500" />}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Descrição
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {sinistro.descricao_evento || "—"}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Causa
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {sinistro.causa_evento || "—"}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Data e horário
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {formatarData(sinistro.data_evento)}
                      {sinistro.hora_evento
                        ? ` às ${sinistro.hora_evento.substring(0, 5)}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Local
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {sinistro.local_evento || "—"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                title="Valores"
                icon={
                  <CircleDollarSign size={18} className="text-emerald-600" />
                }
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [
                      "Prejuízo estimado",
                      formatarMoeda(sinistro.valor_prejuizo_estimado),
                    ],
                    ["Franquia", formatarMoeda(sinistro.valor_franquia)],
                    [
                      "Valor reclamado",
                      formatarMoeda(sinistro.valor_reclamado),
                    ],
                    [
                      "Valor indenizado",
                      formatarMoeda(sinistro.valor_indenizado),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900"
                    >
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-5">
              <Card
                title="Cliente"
                icon={<User size={18} className="text-blue-600" />}
              >
                <div className="font-semibold text-slate-900 dark:text-white">
                  {cliente?.nome || "Cliente não identificado"}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {formatarDocumento(cliente?.documento)}
                </div>

                <div className="mt-3">
                  <Badge>
                    {cliente?.tipo === "PF"
                      ? "Pessoa Física"
                      : cliente?.tipo === "PJ"
                      ? "Pessoa Jurídica"
                      : "Cadastro legado"}
                  </Badge>
                </div>
              </Card>

              <Card
                title="Apólice"
                icon={<ShieldCheck size={18} className="text-emerald-600" />}
              >
                {apolice ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Apólice</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {apolice.numero_apolice || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">Produto</div>
                      <div>{apolice.produto_nome || "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">Seguradora</div>
                      <div>{apolice.seguradora_nome || "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">Vigência</div>
                      <div>
                        {formatarData(apolice.data_inicio_vigencia)} até{" "}
                        {formatarData(apolice.data_fim_vigencia)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    Nenhuma informação de apólice registrada.
                  </div>
                )}
              </Card>

              <Card
                title="Controle"
                icon={<Building2 size={18} className="text-violet-600" />}
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Responsável</div>
                    <div className="font-medium">
                      {responsavel?.nome || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Protocolo</div>
                    <div>{sinistro.protocolo || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Data do aviso</div>
                    <div>{formatarData(sinistro.data_aviso)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Criado em</div>
                    <div>{formatarDataHora(sinistro.created_at)}</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {aba === "OCORRENCIAS" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Histórico de ocorrências
                </h2>
                <p className="text-sm text-slate-500">
                  Linha do tempo operacional do sinistro.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOcorrencia(true)}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Nova ocorrência
              </button>
            </div>

            {dossie.ocorrencias.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                Nenhuma ocorrência registrada.
              </div>
            ) : (
              <div className="space-y-3">
                {dossie.ocorrencias.map((ocorrencia) => (
                  <div
                    key={ocorrencia.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <Badge variant="blue">
                          {labelEnum(ocorrencia.tipo_ocorrencia)}
                        </Badge>

                        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {ocorrencia.relato}
                        </p>

                        {ocorrencia.protocolo && (
                          <div className="mt-3 text-xs text-slate-500">
                            Protocolo: {ocorrencia.protocolo}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-xs text-slate-500">
                        {formatarDataHora(ocorrencia.ocorrido_em)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === "ENVOLVIDOS" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Envolvidos
                </h2>
                <p className="text-sm text-slate-500">
                  Terceiros, condutores, prestadores e demais participantes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalEnvolvido(true)}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                <UserPlus size={16} />
                Adicionar envolvido
              </button>
            </div>

            {dossie.envolvidos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                Nenhum envolvido cadastrado.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dossie.envolvidos.map((envolvido) => (
                  <div
                    key={envolvido.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <User size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {envolvido.nome}
                        </div>

                        <div className="mt-1">
                          <Badge>{labelEnum(envolvido.tipo_envolvido)}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm text-slate-500">
                      {envolvido.cpf_cnpj && (
                        <div>{formatarDocumento(envolvido.cpf_cnpj)}</div>
                      )}
                      {envolvido.telefone && <div>{envolvido.telefone}</div>}
                      {envolvido.email && <div>{envolvido.email}</div>}
                    </div>

                    {envolvido.observacoes && (
                      <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                        {envolvido.observacoes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === "AGENDA" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Agenda do sinistro
                </h2>
                <p className="text-sm text-slate-500">
                  Compromissos vinculados ao acompanhamento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalCompromisso(true)}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CalendarPlus size={16} />
                Novo compromisso
              </button>
            </div>

            {dossie.compromissos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                Nenhum compromisso cadastrado.
              </div>
            ) : (
              <div className="space-y-3">
                {dossie.compromissos.map((compromisso) => (
                  <div
                    key={compromisso.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                        <Calendar size={19} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {compromisso.titulo}
                          </span>

                          <Badge
                            variant={
                              compromisso.status === "CONCLUIDO"
                                ? "green"
                                : compromisso.status === "CANCELADO"
                                ? "red"
                                : "yellow"
                            }
                          >
                            {labelEnum(compromisso.status)}
                          </Badge>
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <Clock3 size={14} />
                          {formatarDataHora(compromisso.inicio_em)}
                        </div>

                        {compromisso.descricao && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {compromisso.descricao}
                          </p>
                        )}
                      </div>
                    </div>

                    {compromisso.status === "PENDENTE" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() =>
                            alterarStatusCompromisso(compromisso, "CONCLUIR")
                          }
                          className="flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 size={15} />
                          Concluir
                        </button>

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() =>
                            alterarStatusCompromisso(compromisso, "CANCELAR")
                          }
                          className="flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <X size={15} />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === "ANEXOS" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Anexos
                </h2>
                <p className="text-sm text-slate-500">
                  Documentos e arquivos relacionados ao sinistro.
                </p>
              </div>

              <button
                type="button"
                onClick={selecionarArquivo}
                disabled={enviandoAnexo}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {enviandoAnexo ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}
                Enviar arquivo
              </button>
            </div>

            {dossie.anexos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                Nenhum arquivo anexado.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                {dossie.anexos.map((anexo, index) => (
                  <div
                    key={anexo.id}
                    className={`flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center ${
                      index > 0
                        ? "border-t border-slate-200 dark:border-slate-800"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <File size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {anexo.nome_arquivo}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatarBytes(anexo.tamanho)} •{" "}
                          {formatarDataHora(anexo.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirAnexo(anexo)}
                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <Download size={15} />
                        Abrir
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirAnexo(anexo)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modalOcorrencia && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-semibold">Nova ocorrência</h3>
                <p className="text-sm text-slate-500">
                  Registre uma atualização no histórico.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOcorrencia(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Tipo
                </label>

                <select
                  value={tipoOcorrencia}
                  onChange={(e) => setTipoOcorrencia(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  {TIPOS_OCORRENCIA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {labelEnum(tipo)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Protocolo
                </label>

                <input
                  value={protocoloOcorrencia}
                  onChange={(e) => setProtocoloOcorrencia(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Relato *
                </label>

                <textarea
                  value={relatoOcorrencia}
                  onChange={(e) => setRelatoOcorrencia(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalOcorrencia(false)}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={salvando}
                onClick={salvarOcorrencia}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={15} className="animate-spin" />}
                Registrar ocorrência
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEnvolvido && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-semibold">Adicionar envolvido</h3>
                <p className="text-sm text-slate-500">
                  Registre uma pessoa ou entidade envolvida.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalEnvolvido(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Tipo *
                </label>

                <select
                  value={tipoEnvolvido}
                  onChange={(e) => setTipoEnvolvido(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  {TIPOS_ENVOLVIDO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {labelEnum(tipo)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Nome *
                </label>

                <input
                  value={nomeEnvolvido}
                  onChange={(e) => setNomeEnvolvido(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  CPF / CNPJ
                </label>

                <input
                  value={documentoEnvolvido}
                  onChange={(e) => setDocumentoEnvolvido(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Telefone
                </label>

                <input
                  value={telefoneEnvolvido}
                  onChange={(e) => setTelefoneEnvolvido(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  E-mail
                </label>

                <input
                  value={emailEnvolvido}
                  onChange={(e) => setEmailEnvolvido(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  Observações
                </label>

                <textarea
                  value={observacoesEnvolvido}
                  onChange={(e) => setObservacoesEnvolvido(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalEnvolvido(false)}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={salvando}
                onClick={salvarEnvolvido}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={15} className="animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCompromisso && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-semibold">Novo compromisso</h3>
                <p className="text-sm text-slate-500">
                  Adicione um acompanhamento à agenda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalCompromisso(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Título *
                </label>

                <input
                  value={tituloCompromisso}
                  onChange={(e) => setTituloCompromisso(e.target.value)}
                  placeholder="Ex.: Retorno da seguradora"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Data *
                  </label>

                  <input
                    type="date"
                    value={dataCompromisso}
                    onChange={(e) => setDataCompromisso(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Horário *
                  </label>

                  <input
                    type="time"
                    value={horaCompromisso}
                    onChange={(e) => setHoraCompromisso(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Prioridade
                </label>

                <select
                  value={prioridadeCompromisso}
                  onChange={(e) =>
                    setPrioridadeCompromisso(
                      e.target.value as CrmPrioridade
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  {PRIORIDADES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Descrição
                </label>

                <textarea
                  value={descricaoCompromisso}
                  onChange={(e) => setDescricaoCompromisso(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalCompromisso(false)}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={salvando}
                onClick={salvarCompromisso}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={15} className="animate-spin" />}
                Criar compromisso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}