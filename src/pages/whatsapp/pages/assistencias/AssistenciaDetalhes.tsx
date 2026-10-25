import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Headset,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../auth/AuthContext";
import ModalArmazenamento from "../../configuracao-corretora/ModalArmazenamento";
import { useStorageCommercial } from "../../hooks/useStorageCommercial";
import { isStorageLimitError } from "../../services/storageQuotaError";
import {
  atualizarAssistencia,
  buscarDossieAssistencia,
  cancelarCompromissoAssistencia,
  concluirCompromissoAssistencia,
  criarCompromissoAssistencia,
  criarOcorrenciaAssistencia,
  enviarAnexoAssistencia,
  excluirAssistencia,
  obterUrlAnexoAssistencia,
  removerAnexoAssistencia,
  type CrmAgendaEvento,
  type CrmAssistencia,
  type CrmAssistenciaDossie,
  type CrmAssistenciaOcorrencia,
  type CrmAssistenciaStatus,
  type CrmEventoAnexo,
  type CrmPrioridade,
} from "../../services/crmAssistenciaService";

type ClienteDetalhes = {
  nome: string;
  documento: string | null;
  tipo: "PF" | "PJ" | "LEGADO" | null;
};

type ApoliceDetalhes = {
  numero_apolice: string | null;
  numero_proposta: string | null;
  numero_cotacao: string | null;
  produto_nome: string | null;
  seguradora_nome: string | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
};

type FormAssistencia = {
  tipo_assistencia: string;
  status: CrmAssistenciaStatus;
  protocolo: string;
  numero_atendimento: string;
  descricao_solicitacao: string;
  prestador_nome: string;
  prestador_telefone: string;
  previsao_atendimento_em: string;
  atendimento_iniciado_em: string;
  atendimento_concluido_em: string;
  observacoes: string;
};

type FormOcorrencia = {
  tipo_ocorrencia: string;
  relato: string;
  protocolo: string;
  ocorrido_em: string;
};

type FormCompromisso = {
  titulo: string;
  descricao: string;
  inicio_em: string;
  fim_em: string;
  prioridade: CrmPrioridade;
};

const STATUS_OPTIONS: Array<{
  value: CrmAssistenciaStatus;
  label: string;
}> = [
  { value: "SOLICITADA", label: "Solicitada" },
  {
    value: "AGUARDANDO_SEGURADORA",
    label: "Aguardando seguradora",
  },
  {
    value: "AGUARDANDO_PRESTADOR",
    label: "Aguardando prestador",
  },
  { value: "AGENDADA", label: "Agendada" },
  { value: "EM_ATENDIMENTO", label: "Em atendimento" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "NAO_ATENDIDA", label: "Não atendida" },
];

const PRIORIDADES: CrmPrioridade[] = [
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

function formatarDataHora(valor?: string | null) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function paraInputDataHora(valor?: string | null) {
  if (!valor) return "";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return "";

  const local = new Date(
    data.getTime() - data.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function agoraInput() {
  const agora = new Date();

  return new Date(
    agora.getTime() - agora.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);
}

function formatarTamanho(bytes?: number | null) {
  if (!bytes) return "—";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function classeStatus(status: CrmAssistenciaStatus) {
  switch (status) {
    case "SOLICITADA":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300";

    case "AGUARDANDO_SEGURADORA":
    case "AGUARDANDO_PRESTADOR":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";

    case "AGENDADA":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300";

    case "EM_ATENDIMENTO":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300";

    case "CONCLUIDA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";

    case "CANCELADA":
    case "NAO_ATENDIDA":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function classeAgenda(status: CrmAgendaEvento["status"]) {
  if (status === "CONCLUIDO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formDaAssistencia(
  assistencia: CrmAssistencia
): FormAssistencia {
  return {
    tipo_assistencia: assistencia.tipo_assistencia || "",
    status: assistencia.status,
    protocolo: assistencia.protocolo || "",
    numero_atendimento: assistencia.numero_atendimento || "",
    descricao_solicitacao:
      assistencia.descricao_solicitacao || "",
    prestador_nome: assistencia.prestador_nome || "",
    prestador_telefone:
      assistencia.prestador_telefone || "",
    previsao_atendimento_em: paraInputDataHora(
      assistencia.previsao_atendimento_em
    ),
    atendimento_iniciado_em: paraInputDataHora(
      assistencia.atendimento_iniciado_em
    ),
    atendimento_concluido_em: paraInputDataHora(
      assistencia.atendimento_concluido_em
    ),
    observacoes: assistencia.observacoes || "",
  };
}

export default function AssistenciaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useAuth();
  const storageCommercial = useStorageCommercial();
  const podeExcluir = userProfile?.tipo_usuario === "CORRETORA";

  const [dossie, setDossie] =
    useState<CrmAssistenciaDossie | null>(null);

  const [cliente, setCliente] = useState<ClienteDetalhes>({
    nome: "Cliente",
    documento: null,
    tipo: null,
  });

  const [responsavelNome, setResponsavelNome] =
    useState("—");

  const [apolice, setApolice] =
    useState<ApoliceDetalhes | null>(null);

  const [form, setForm] =
    useState<FormAssistencia | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modalOcorrencia, setModalOcorrencia] =
    useState(false);

  const [modalCompromisso, setModalCompromisso] =
    useState(false);

  const [enviandoAnexo, setEnviandoAnexo] =
    useState(false);

  const [excluindoAssistencia, setExcluindoAssistencia] =
    useState(false);

  const [usuarioId, setUsuarioId] =
    useState<string | null>(null);

  const [formOcorrencia, setFormOcorrencia] =
    useState<FormOcorrencia>({
      tipo_ocorrencia: "",
      relato: "",
      protocolo: "",
      ocorrido_em: agoraInput(),
    });

  const [formCompromisso, setFormCompromisso] =
    useState<FormCompromisso>({
      titulo: "",
      descricao: "",
      inicio_em: "",
      fim_em: "",
      prioridade: "NORMAL",
    });

  const assistencia = dossie?.assistencia ?? null;

  const carregarRelacionamentos = useCallback(
    async (item: CrmAssistencia) => {
        try {
        // =========================
        // RESPONSÁVEL
        // =========================

        if (item.responsavel_id) {
            const {
            data: responsavel,
            error: responsavelError,
            } = await supabase
            .from("usuarios_perfis")
            .select("id, nome")
            .eq("id", item.responsavel_id)
            .maybeSingle();

            if (responsavelError) {
            throw responsavelError;
            }

            setResponsavelNome(
            responsavel?.nome || "—"
            );
        } else {
            setResponsavelNome("—");
        }

        // =========================
        // CLIENTE PF
        // =========================

        if (item.crm_pessoa_id) {
            const {
            data: pessoa,
            error: pessoaError,
            } = await supabase
            .from("crm_pessoas")
            .select("id, cpf, dados")
            .eq("id", item.crm_pessoa_id)
            .maybeSingle();

            if (pessoaError) {
            throw pessoaError;
            }

            if (pessoa) {
            const dados = pessoa.dados || {};

            setCliente({
                nome:
                dados.nome ||
                dados.nome_completo ||
                "Pessoa sem nome",
                documento: pessoa.cpf || null,
                tipo: "PF",
            });
            } else {
            setCliente({
                nome: "Pessoa não encontrada",
                documento: null,
                tipo: "PF",
            });
            }
        }

        // =========================
        // CLIENTE PJ
        // =========================

        else if (item.crm_empresa_id) {
            const {
            data: empresa,
            error: empresaError,
            } = await supabase
            .from("crm_empresas")
            .select("id, cnpj, dados")
            .eq("id", item.crm_empresa_id)
            .maybeSingle();

            if (empresaError) {
            throw empresaError;
            }

            if (empresa) {
            const dados = empresa.dados || {};

            setCliente({
                nome:
                dados.nome_fantasia ||
                dados.razao_social ||
                dados.nome_razao_social ||
                dados.nome ||
                "Empresa sem nome",
                documento: empresa.cnpj || null,
                tipo: "PJ",
            });
            } else {
            setCliente({
                nome: "Empresa não encontrada",
                documento: null,
                tipo: "PJ",
            });
            }
        }

        // =========================
        // CLIENTE LEGADO
        // =========================

        else if (item.cliente_id_legado) {
            const {
            data: clienteLegado,
            error: clienteLegadoError,
            } = await supabase
            .from("tab_clientes")
            .select(
                "id, tipo_cliente, cpf_cnpj, nome_razao_social, nome_fantasia"
            )
            .eq("id", item.cliente_id_legado)
            .maybeSingle();

            if (clienteLegadoError) {
            throw clienteLegadoError;
            }

            if (clienteLegado) {
            setCliente({
                nome:
                clienteLegado.nome_fantasia ||
                clienteLegado.nome_razao_social ||
                "Cliente legado",
                documento:
                clienteLegado.cpf_cnpj || null,
                tipo: "LEGADO",
            });
            } else {
            setCliente({
                nome: "Cliente legado não encontrado",
                documento: null,
                tipo: "LEGADO",
            });
            }
        }

        // =========================
        // SEM CLIENTE VINCULADO
        // =========================

        else {
            setCliente({
            nome: "Cliente não identificado",
            documento: null,
            tipo: null,
            });
        }

        // =========================
        // SNAPSHOT DA APÓLICE
        // =========================

        const snapshot =
            item.dados_especificos?.apolice || null;

        if (snapshot) {
            setApolice({
            numero_apolice:
                snapshot.numero_apolice || null,

            numero_proposta:
                snapshot.numero_proposta || null,

            numero_cotacao:
                snapshot.numero_cotacao || null,

            produto_nome:
                snapshot.produto_nome || null,

            seguradora_nome:
                snapshot.seguradora_nome || null,

            data_inicio_vigencia:
                snapshot.data_inicio_vigencia || null,

            data_fim_vigencia:
                snapshot.data_fim_vigencia || null,
            });
        } else {
            setApolice(null);
        }
        } catch (error) {
        console.error(
            "Erro ao carregar relacionamentos da assistência:",
            error
        );

        throw error;
        }
    },
    []
    );

  const carregarDossie = useCallback(async () => {
    if (!id) {
      setErro("ID da assistência não informado.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErro(null);

      const resultado =
        await buscarDossieAssistencia(id);

      if (!resultado) {
        setDossie(null);
        setErro("Assistência não encontrada.");
        return;
      }

      setDossie(resultado);
      setForm(formDaAssistencia(resultado.assistencia));

      await carregarRelacionamentos(
        resultado.assistencia
      );
    } catch (error: any) {
      console.error(
        "Erro ao carregar dossiê da assistência:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar a assistência."
      );
    } finally {
      setLoading(false);
    }
  }, [id, carregarRelacionamentos]);

  useEffect(() => {
    void carregarDossie();
  }, [carregarDossie]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUsuarioId(data.user?.id ?? null);
    });
  }, []);

  const atualizarForm = useCallback(
    <K extends keyof FormAssistencia>(
      campo: K,
      valor: FormAssistencia[K]
    ) => {
      setForm((anterior) =>
        anterior
          ? {
              ...anterior,
              [campo]: valor,
            }
          : anterior
      );
    },
    []
  );

  const salvarAssistencia = useCallback(async () => {
    if (!assistencia || !form || salvando) return;

    try {
      setSalvando(true);

      const atualizada = await atualizarAssistencia(
        assistencia.id,
        {
          tipo_assistencia:
            form.tipo_assistencia,
          status: form.status,
          protocolo: form.protocolo || null,
          numero_atendimento:
            form.numero_atendimento || null,
          descricao_solicitacao:
            form.descricao_solicitacao || null,
          prestador_nome:
            form.prestador_nome || null,
          prestador_telefone:
            form.prestador_telefone || null,
          previsao_atendimento_em:
            form.previsao_atendimento_em
              ? new Date(
                  form.previsao_atendimento_em
                ).toISOString()
              : null,
          atendimento_iniciado_em:
            form.atendimento_iniciado_em
              ? new Date(
                  form.atendimento_iniciado_em
                ).toISOString()
              : null,
          atendimento_concluido_em:
            form.atendimento_concluido_em
              ? new Date(
                  form.atendimento_concluido_em
                ).toISOString()
              : null,
          observacoes: form.observacoes || null,
        }
      );

      setDossie((anterior) =>
        anterior
          ? {
              ...anterior,
              assistencia: atualizada,
            }
          : anterior
      );

      setForm(formDaAssistencia(atualizada));

      toast.success("Assistência atualizada.");
    } catch (error: any) {
      console.error(
        "Erro ao atualizar assistência:",
        error
      );

      toast.error(
        error?.message ||
          "Não foi possível atualizar a assistência."
      );
    } finally {
      setSalvando(false);
    }
  }, [assistencia, form, salvando]);

  const salvarOcorrencia = useCallback(async () => {
    if (!assistencia) return;

    if (!formOcorrencia.relato.trim()) {
      toast.error("Informe o relato da ocorrência.");
      return;
    }

    try {
      await criarOcorrenciaAssistencia({
        assistencia_id: assistencia.id,
        corretora_id: assistencia.corretora_id,
        responsavel_id:
          assistencia.responsavel_id,
        tipo_ocorrencia:
          formOcorrencia.tipo_ocorrencia ||
          null,
        relato: formOcorrencia.relato,
        protocolo:
          formOcorrencia.protocolo || null,
        ocorrido_em: formOcorrencia.ocorrido_em
          ? new Date(
              formOcorrencia.ocorrido_em
            ).toISOString()
          : undefined,
      });

      setModalOcorrencia(false);

      setFormOcorrencia({
        tipo_ocorrencia: "",
        relato: "",
        protocolo: "",
        ocorrido_em: agoraInput(),
      });

      await carregarDossie();

      toast.success("Ocorrência registrada.");
    } catch (error: any) {
      toast.error(
        error?.message ||
          "Não foi possível registrar a ocorrência."
      );
    }
  }, [
    assistencia,
    formOcorrencia,
    carregarDossie,
  ]);

  const salvarCompromisso =
    useCallback(async () => {
      if (!assistencia) return;

      if (!formCompromisso.titulo.trim()) {
        toast.error(
          "Informe o título do compromisso."
        );
        return;
      }

      if (!formCompromisso.inicio_em) {
        toast.error(
          "Informe a data e hora do compromisso."
        );
        return;
      }

      try {
        await criarCompromissoAssistencia({
          assistencia,
          titulo: formCompromisso.titulo,
          descricao:
            formCompromisso.descricao || null,
          inicio_em: new Date(
            formCompromisso.inicio_em
          ).toISOString(),
          fim_em: formCompromisso.fim_em
            ? new Date(
                formCompromisso.fim_em
              ).toISOString()
            : null,
          prioridade:
            formCompromisso.prioridade,
          criado_por_id: usuarioId,
        });

        setModalCompromisso(false);

        setFormCompromisso({
          titulo: "",
          descricao: "",
          inicio_em: "",
          fim_em: "",
          prioridade: "NORMAL",
        });

        await carregarDossie();

        toast.success(
          "Compromisso adicionado à agenda."
        );
      } catch (error: any) {
        toast.error(
          error?.message ||
            "Não foi possível criar o compromisso."
        );
      }
    }, [
      assistencia,
      formCompromisso,
      usuarioId,
      carregarDossie,
    ]);

  const concluirCompromisso =
    useCallback(
      async (compromisso: CrmAgendaEvento) => {
        try {
          await concluirCompromissoAssistencia(
            compromisso.id
          );

          await carregarDossie();

          toast.success("Compromisso concluído.");
        } catch (error: any) {
          toast.error(
            error?.message ||
              "Não foi possível concluir o compromisso."
          );
        }
      },
      [carregarDossie]
    );

  const cancelarCompromisso =
    useCallback(
      async (compromisso: CrmAgendaEvento) => {
        try {
          await cancelarCompromissoAssistencia(
            compromisso.id
          );

          await carregarDossie();

          toast.success("Compromisso cancelado.");
        } catch (error: any) {
          toast.error(
            error?.message ||
              "Não foi possível cancelar o compromisso."
          );
        }
      },
      [carregarDossie]
    );

  const enviarArquivo = useCallback(
    async (arquivo: File) => {
      if (!assistencia) return;

      try {
        setEnviandoAnexo(true);

        await enviarAnexoAssistencia({
          arquivo,
          corretora_id:
            assistencia.corretora_id,
          origem_id: assistencia.id,
          tipo_origem: "ASSISTENCIA",
          enviado_por_id: usuarioId,
          tipo_documento: "DOCUMENTO",
        });

        await carregarDossie();

        toast.success("Anexo enviado.");
      } catch (error: any) {
        console.error(
          "Erro ao enviar anexo da assistência:",
          error
        );

        if (isStorageLimitError(error)) {
          await storageCommercial.abrirModalArmazenamento();
          return;
        }

        toast.error(
          error?.message ||
            "Não foi possível enviar o anexo."
        );
      } finally {
        setEnviandoAnexo(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      assistencia,
      usuarioId,
      carregarDossie,
      storageCommercial.abrirModalArmazenamento,
    ]
  );

  const handleExcluirAssistencia = useCallback(async () => {
    if (
      !assistencia ||
      !podeExcluir ||
      excluindoAssistencia
    ) {
      return;
    }

    const identificacao =
      assistencia.numero_atendimento ||
      assistencia.protocolo ||
      formatarTexto(assistencia.tipo_assistencia);

    const confirmou = window.confirm(
      `Excluir definitivamente a assistência "${identificacao}"?\n\n` +
        "Esta ação removerá também ocorrências, compromissos e anexos armazenados.\n\n" +
        "Esta ação não pode ser desfeita."
    );

    if (!confirmou) return;

    try {
      setExcluindoAssistencia(true);

      await excluirAssistencia(
        assistencia.id,
        assistencia.corretora_id
      );

      toast.success("Assistência excluída com sucesso.");
      navigate("/whatsapp/assistencias");
    } catch (error: any) {
      console.error(
        "Erro ao excluir assistência:",
        error
      );

      toast.error(
        error?.message ||
          "Não foi possível excluir a assistência."
      );
    } finally {
      setExcluindoAssistencia(false);
    }
  }, [
    assistencia,
    podeExcluir,
    excluindoAssistencia,
    navigate,
  ]);

  const abrirAnexo = useCallback(
    async (anexo: CrmEventoAnexo) => {
      try {
        const url =
          await obterUrlAnexoAssistencia(anexo);

        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      } catch (error: any) {
        toast.error(
          error?.message ||
            "Não foi possível abrir o anexo."
        );
      }
    },
    []
  );

  const excluirAnexo = useCallback(
    async (anexo: CrmEventoAnexo) => {
      const confirmou = window.confirm(
        `Remover o arquivo "${anexo.nome_arquivo}"?`
      );

      if (!confirmou) return;

      try {
        await removerAnexoAssistencia(anexo);
        await carregarDossie();

        toast.success("Anexo removido.");
      } catch (error: any) {
        toast.error(
          error?.message ||
            "Não foi possível remover o anexo."
        );
      }
    },
    [carregarDossie]
  );

  const compromissosPendentes = useMemo(
    () =>
      dossie?.compromissos.filter(
        (item) => item.status === "PENDENTE"
      ).length ?? 0,
    [dossie]
  );

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2
            size={32}
            className="mx-auto animate-spin text-blue-600"
          />
          <p className="mt-3 text-sm text-slate-500">
            Carregando assistência...
          </p>
        </div>
      </div>
    );
  }

  if (erro || !assistencia || !dossie || !form) {
    return (
      <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex gap-3">
            <AlertTriangle size={21} />
            <div>
              <p className="font-semibold">
                Não foi possível abrir a assistência
              </p>
              <p className="mt-1 text-sm">
                {erro || "Assistência não encontrada."}
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/whatsapp/assistencias")
                }
                className="mt-4 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate("/whatsapp/assistencias")
              }
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Headset size={21} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatarTexto(
                    assistencia.tipo_assistencia
                  )}
                </h1>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classeStatus(
                    assistencia.status
                  )}`}
                >
                  {formatarTexto(
                    assistencia.status
                  )}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {cliente.nome}
                {assistencia.numero_atendimento
                  ? ` • Atendimento ${assistencia.numero_atendimento}`
                  : ""}
                {assistencia.protocolo
                  ? ` • Protocolo ${assistencia.protocolo}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void carregarDossie()
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() =>
                void salvarAssistencia()
              }
              disabled={salvando}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Save size={16} />
              )}
              Salvar alterações
            </button>

            {podeExcluir && (
              <button
                type="button"
                onClick={() => void handleExcluirAssistencia()}
                disabled={excluindoAssistencia}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                {excluindoAssistencia ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={16} />
                )}
                Excluir assistência
              </button>
            )}
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResumoCard
            titulo="Solicitada em"
            valor={formatarDataHora(
              assistencia.solicitado_em
            )}
            icon={<Clock3 size={17} />}
          />

          <ResumoCard
            titulo="Prestador"
            valor={
              assistencia.prestador_nome ||
              "Não definido"
            }
            icon={<Truck size={17} />}
          />

          <ResumoCard
            titulo="Ocorrências"
            valor={String(
              dossie.ocorrencias.length
            )}
            icon={<FileText size={17} />}
          />

          <ResumoCard
            titulo="Compromissos pendentes"
            valor={String(compromissosPendentes)}
            icon={<CalendarClock size={17} />}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
          <div className="space-y-5">
            <Card
              titulo="Dados da assistência"
              icon={<Headset size={18} />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Campo
                  label="Tipo de assistência"
                  value={form.tipo_assistencia}
                  onChange={(value) =>
                    atualizarForm(
                      "tipo_assistencia",
                      value
                    )
                  }
                />

                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      atualizarForm(
                        "status",
                        event.target
                          .value as CrmAssistenciaStatus
                      )
                    }
                    className={inputClass}
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Campo
                  label="Protocolo"
                  value={form.protocolo}
                  onChange={(value) =>
                    atualizarForm(
                      "protocolo",
                      value
                    )
                  }
                />

                <Campo
                  label="Nº atendimento"
                  value={form.numero_atendimento}
                  onChange={(value) =>
                    atualizarForm(
                      "numero_atendimento",
                      value
                    )
                  }
                />

                <Campo
                  label="Prestador"
                  value={form.prestador_nome}
                  onChange={(value) =>
                    atualizarForm(
                      "prestador_nome",
                      value
                    )
                  }
                />

                <Campo
                  label="Telefone do prestador"
                  value={form.prestador_telefone}
                  onChange={(value) =>
                    atualizarForm(
                      "prestador_telefone",
                      value
                    )
                  }
                />

                <CampoDataHora
                  label="Previsão de atendimento"
                  value={
                    form.previsao_atendimento_em
                  }
                  onChange={(value) =>
                    atualizarForm(
                      "previsao_atendimento_em",
                      value
                    )
                  }
                />

                <CampoDataHora
                  label="Atendimento iniciado"
                  value={
                    form.atendimento_iniciado_em
                  }
                  onChange={(value) =>
                    atualizarForm(
                      "atendimento_iniciado_em",
                      value
                    )
                  }
                />

                <CampoDataHora
                  label="Atendimento concluído"
                  value={
                    form.atendimento_concluido_em
                  }
                  onChange={(value) =>
                    atualizarForm(
                      "atendimento_concluido_em",
                      value
                    )
                  }
                />
              </div>

              <div className="mt-4">
                <Label>Descrição da solicitação</Label>
                <textarea
                  rows={4}
                  value={form.descricao_solicitacao}
                  onChange={(event) =>
                    atualizarForm(
                      "descricao_solicitacao",
                      event.target.value
                    )
                  }
                  className={`${inputClass} h-auto py-2.5`}
                />
              </div>

              <div className="mt-4">
                <Label>Observações</Label>
                <textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={(event) =>
                    atualizarForm(
                      "observacoes",
                      event.target.value
                    )
                  }
                  className={`${inputClass} h-auto py-2.5`}
                />
              </div>
            </Card>

            <Card
              titulo="Ocorrências"
              icon={<FileText size={18} />}
              action={
                <button
                  type="button"
                  onClick={() =>
                    setModalOcorrencia(true)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={15} />
                  Nova ocorrência
                </button>
              }
            >
              {dossie.ocorrencias.length === 0 ? (
                <EmptyState texto="Nenhuma ocorrência registrada." />
              ) : (
                <div className="space-y-3">
                  {dossie.ocorrencias.map(
                    (ocorrencia) => (
                      <OcorrenciaCard
                        key={ocorrencia.id}
                        ocorrencia={ocorrencia}
                      />
                    )
                  )}
                </div>
              )}
            </Card>

            <Card
              titulo="Agenda"
              icon={<CalendarClock size={18} />}
              action={
                <button
                  type="button"
                  onClick={() =>
                    setModalCompromisso(true)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={15} />
                  Novo compromisso
                </button>
              }
            >
              {dossie.compromissos.length === 0 ? (
                <EmptyState texto="Nenhum compromisso relacionado." />
              ) : (
                <div className="space-y-3">
                  {dossie.compromissos.map(
                    (compromisso) => (
                      <div
                        key={compromisso.id}
                        className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {compromisso.titulo}
                              </p>

                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classeAgenda(
                                  compromisso.status
                                )}`}
                              >
                                {formatarTexto(
                                  compromisso.status
                                )}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {formatarTexto(
                                  compromisso.prioridade
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatarDataHora(
                                compromisso.inicio_em
                              )}
                            </p>

                            {compromisso.descricao && (
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                {compromisso.descricao}
                              </p>
                            )}
                          </div>

                          {compromisso.status ===
                            "PENDENTE" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                title="Concluir"
                                onClick={() =>
                                  void concluirCompromisso(
                                    compromisso
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              >
                                <Check size={15} />
                              </button>

                              <button
                                type="button"
                                title="Cancelar"
                                onClick={() =>
                                  void cancelarCompromisso(
                                    compromisso
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card
              titulo="Cliente"
              icon={<User size={18} />}
            >
              <p className="font-semibold text-slate-900 dark:text-white">
                {cliente.nome}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {cliente.tipo || "—"}
                {cliente.documento
                  ? ` • ${cliente.documento}`
                  : ""}
              </p>

              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Responsável
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {responsavelNome}
                </p>
              </div>
            </Card>

            <Card
              titulo="Apólice vinculada"
              icon={<FileText size={18} />}
            >
              {apolice ? (
                <div className="space-y-3">
                  <Info
                    label="Apólice"
                    valor={
                      apolice.numero_apolice ||
                      "—"
                    }
                  />
                  <Info
                    label="Produto"
                    valor={
                      apolice.produto_nome || "—"
                    }
                  />
                  <Info
                    label="Seguradora"
                    valor={
                      apolice.seguradora_nome ||
                      "—"
                    }
                  />
                  <Info
                    label="Proposta"
                    valor={
                      apolice.numero_proposta ||
                      "—"
                    }
                  />
                  <Info
                    label="Cotação"
                    valor={
                      apolice.numero_cotacao ||
                      "—"
                    }
                  />
                  <Info
                    label="Vigência"
                    valor={`${apolice.data_inicio_vigencia || "Não informada"} até ${apolice.data_fim_vigencia || "Não informada"}`}
                  />
                </div>
              ) : (
                <EmptyState texto="Dados da apólice não disponíveis no snapshot." />
              )}
            </Card>

            <Card
              titulo="Anexos"
              icon={<Paperclip size={18} />}
              action={
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const arquivo =
                        event.target.files?.[0];

                      if (arquivo) {
                        void enviarArquivo(arquivo);
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={enviandoAnexo}
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {enviandoAnexo ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Plus size={15} />
                    )}
                    Adicionar
                  </button>
                </>
              }
            >
              {dossie.anexos.length === 0 ? (
                <EmptyState texto="Nenhum anexo enviado." />
              ) : (
                <div className="space-y-2">
                  {dossie.anexos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <FileText size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {anexo.nome_arquivo}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatarTamanho(
                            anexo.tamanho
                          )}{" "}
                          •{" "}
                          {formatarDataHora(
                            anexo.created_at
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        title="Abrir"
                        onClick={() =>
                          void abrirAnexo(anexo)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                      >
                        <Download size={15} />
                      </button>

                      <button
                        type="button"
                        title="Excluir"
                        onClick={() =>
                          void excluirAnexo(anexo)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              titulo="Linha do atendimento"
              icon={<Clock3 size={18} />}
            >
              <div className="space-y-3">
                <TimelineItem
                  titulo="Solicitação"
                  valor={formatarDataHora(
                    assistencia.solicitado_em
                  )}
                  ativo
                />

                <TimelineItem
                  titulo="Previsão"
                  valor={formatarDataHora(
                    assistencia.previsao_atendimento_em
                  )}
                  ativo={Boolean(
                    assistencia.previsao_atendimento_em
                  )}
                />

                <TimelineItem
                  titulo="Atendimento iniciado"
                  valor={formatarDataHora(
                    assistencia.atendimento_iniciado_em
                  )}
                  ativo={Boolean(
                    assistencia.atendimento_iniciado_em
                  )}
                />

                <TimelineItem
                  titulo="Atendimento concluído"
                  valor={formatarDataHora(
                    assistencia.atendimento_concluido_em
                  )}
                  ativo={Boolean(
                    assistencia.atendimento_concluido_em
                  )}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {modalOcorrencia && (
        <ModalBase
          titulo="Nova ocorrência"
          onClose={() =>
            setModalOcorrencia(false)
          }
          onSave={() =>
            void salvarOcorrencia()
          }
          saveLabel="Registrar ocorrência"
        >
          <div className="space-y-4">
            <Campo
              label="Tipo da ocorrência"
              value={
                formOcorrencia.tipo_ocorrencia
              }
              onChange={(value) =>
                setFormOcorrencia((atual) => ({
                  ...atual,
                  tipo_ocorrencia: value,
                }))
              }
              placeholder="Ex.: CONTATO_SEGURADORA"
            />

            <Campo
              label="Protocolo"
              value={formOcorrencia.protocolo}
              onChange={(value) =>
                setFormOcorrencia((atual) => ({
                  ...atual,
                  protocolo: value,
                }))
              }
            />

            <CampoDataHora
              label="Ocorrido em"
              value={formOcorrencia.ocorrido_em}
              onChange={(value) =>
                setFormOcorrencia((atual) => ({
                  ...atual,
                  ocorrido_em: value,
                }))
              }
            />

            <div>
              <Label>Relato *</Label>
              <textarea
                rows={5}
                value={formOcorrencia.relato}
                onChange={(event) =>
                  setFormOcorrencia((atual) => ({
                    ...atual,
                    relato: event.target.value,
                  }))
                }
                className={`${inputClass} h-auto py-2.5`}
              />
            </div>
          </div>
        </ModalBase>
      )}

      {modalCompromisso && (
        <ModalBase
          titulo="Novo compromisso"
          onClose={() =>
            setModalCompromisso(false)
          }
          onSave={() =>
            void salvarCompromisso()
          }
          saveLabel="Adicionar à agenda"
        >
          <div className="space-y-4">
            <Campo
              label="Título *"
              value={formCompromisso.titulo}
              onChange={(value) =>
                setFormCompromisso((atual) => ({
                  ...atual,
                  titulo: value,
                }))
              }
            />

            <div>
              <Label>Prioridade</Label>
              <select
                value={
                  formCompromisso.prioridade
                }
                onChange={(event) =>
                  setFormCompromisso(
                    (atual) => ({
                      ...atual,
                      prioridade:
                        event.target
                          .value as CrmPrioridade,
                    })
                  )
                }
                className={inputClass}
              >
                {PRIORIDADES.map(
                  (prioridade) => (
                    <option
                      key={prioridade}
                      value={prioridade}
                    >
                      {formatarTexto(
                        prioridade
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <CampoDataHora
              label="Início *"
              value={formCompromisso.inicio_em}
              onChange={(value) =>
                setFormCompromisso((atual) => ({
                  ...atual,
                  inicio_em: value,
                }))
              }
            />

            <CampoDataHora
              label="Fim"
              value={formCompromisso.fim_em}
              onChange={(value) =>
                setFormCompromisso((atual) => ({
                  ...atual,
                  fim_em: value,
                }))
              }
            />

            <div>
              <Label>Descrição</Label>
              <textarea
                rows={4}
                value={
                  formCompromisso.descricao
                }
                onChange={(event) =>
                  setFormCompromisso(
                    (atual) => ({
                      ...atual,
                      descricao:
                        event.target.value,
                    })
                  )
                }
                className={`${inputClass} h-auto py-2.5`}
              />
            </div>
          </div>
        </ModalBase>
      )}

      <ModalArmazenamento
        {...storageCommercial.modalProps}
      />
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function Label({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function CampoDataHora({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={inputClass}
      />
    </div>
  );
}

function Card({
  titulo,
  icon,
  action,
  children,
}: {
  titulo: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <span className="text-blue-600 dark:text-blue-400">
            {icon}
          </span>
          <h2 className="font-semibold">{titulo}</h2>
        </div>

        {action}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function ResumoCard({
  titulo,
  valor,
  icon,
}: {
  titulo: string;
  valor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {titulo}
        </p>
        <span className="text-blue-500">
          {icon}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
        {valor}
      </p>
    </div>
  );
}

function Info({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        {valor}
      </p>
    </div>
  );
}

function EmptyState({
  texto,
}: {
  texto: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
      {texto}
    </div>
  );
}

function OcorrenciaCard({
  ocorrencia,
}: {
  ocorrencia: CrmAssistenciaOcorrencia;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {formatarTexto(
              ocorrencia.tipo_ocorrencia
            )}
          </span>

          {ocorrencia.protocolo && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {ocorrencia.protocolo}
            </span>
          )}
        </div>

        <span className="text-xs text-slate-400">
          {formatarDataHora(
            ocorrencia.ocorrido_em
          )}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
        {ocorrencia.relato}
      </p>
    </div>
  );
}

function TimelineItem({
  titulo,
  valor,
  ativo,
}: {
  titulo: string;
  valor: string;
  ativo: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="pt-0.5">
        {ativo ? (
          <CheckCircle2
            size={17}
            className="text-emerald-500"
          />
        ) : (
          <Clock3
            size={17}
            className="text-slate-300"
          />
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {titulo}
        </p>
        <p className="text-xs text-slate-500">
          {valor}
        </p>
      </div>
    </div>
  );
}

function ModalBase({
  titulo,
  children,
  onClose,
  onSave,
  saveLabel,
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {titulo}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {children}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}