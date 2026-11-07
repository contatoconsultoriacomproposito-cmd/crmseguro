import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Save,
  ShieldCheck,
  UsersRound,
  UserRoundCog,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

type EscopoContato = "none" | "assigned" | "tenant";
type EscopoConversa = "none" | "assigned";
type EscopoAgenda = "none" | "own" | "tenant";
type EscopoAgendaGoogle = "none" | "own";
type EscopoEquipe = "none" | "tenant";

interface PermissoesEquipe {
  create: EscopoEquipe;
  delete: EscopoEquipe;
  update: EscopoEquipe;
  password: EscopoEquipe;
  permissions: EscopoEquipe;
}

interface PermissoesAgenda {
  read: EscopoAgenda;
  manage: EscopoAgenda;
  google: EscopoAgendaGoogle;
}

interface PermissoesContatos {
  read: EscopoContato;
  create: EscopoContato;
  update: EscopoContato;
  delete: EscopoContato;
  restore: EscopoContato;
  sync: EscopoContato;
  send: EscopoContato;
}

interface PermissoesConversas {
  read: EscopoConversa;
  start: EscopoConversa;
  interact: EscopoConversa;
  assign: EscopoConversa;
  manage: EscopoConversa;
  call: EscopoConversa;
  automation: EscopoConversa;
}

interface ModalPermissoesUsuarioProps {
  open: boolean;
  usuarioId: string | null;
  corretoraId: string | null;
  nomeUsuario?: string | null;
  emailUsuario?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const PERMISSOES_CONTATOS_PADRAO: PermissoesContatos = {
  read: "none",
  create: "none",
  update: "none",
  delete: "none",
  restore: "none",
  sync: "none",
  send: "none",
};

const PERMISSOES_CONVERSAS_PADRAO: PermissoesConversas = {
  read: "none",
  start: "none",
  interact: "none",
  assign: "none",
  manage: "none",
  call: "none",
  automation: "none",
};

const PERMISSOES_AGENDA_PADRAO: PermissoesAgenda = {
  read: "none",
  manage: "none",
  google: "none",
};

const PERMISSOES_EQUIPE_PADRAO: PermissoesEquipe = {
  create: "none",
  delete: "none",
  update: "none",
  password: "none",
  permissions: "none",
};

const OPCOES_ESCOPO_EQUIPE: Array<{
  value: EscopoEquipe;
  label: string;
  descricao: string;
}> = [
  {
    value: "none",
    label: "Sem acesso",
    descricao: "Não permite executar esta operação.",
  },
  {
    value: "tenant",
    label: "Toda a corretora",
    descricao: "Permite gerenciar membros da própria corretora conforme a ação.",
  },
];

const ACOES_EQUIPE: Array<{
  key: keyof PermissoesEquipe;
  label: string;
  descricao: string;
}> = [
  { key: "create", label: "Adicionar novo membro", descricao: "Cadastrar usuários vinculados à corretora." },
  { key: "delete", label: "Remover membros", descricao: "Desativar e reativar membros, preservando o histórico." },
  { key: "update", label: "Editar membros", descricao: "Alterar os dados cadastrais e a função dos membros." },
  { key: "password", label: "Alterar senha", descricao: "Redefinir a senha de acesso de outro membro." },
  { key: "permissions", label: "Editar permissões", descricao: "Consultar e alterar as permissões de outros membros." },
];

const OPCOES_ESCOPO_CONTATOS: Array<{
  value: EscopoContato;
  label: string;
  descricao: string;
}> = [
  {
    value: "none",
    label: "Sem acesso",
    descricao: "A ação não estará disponível para este usuário.",
  },
  {
    value: "assigned",
    label: "Conexões atribuídas",
    descricao:
      "Permite a ação somente nas conexões WhatsApp atribuídas ao usuário.",
  },
  {
    value: "tenant",
    label: "Toda a corretora",
    descricao:
      "Permite a ação em todas as conexões e registros do módulo dentro da corretora.",
  },
];

const OPCOES_ESCOPO_CONVERSAS: Array<{
  value: EscopoConversa;
  label: string;
  descricao: string;
}> = [
  {
    value: "none",
    label: "Sem acesso",
    descricao: "A ação não estará disponível para este usuário.",
  },
  {
    value: "assigned",
    label: "Conexões atribuídas",
    descricao:
      "Permite a ação somente nas conexões WhatsApp atribuídas ao usuário.",
  },
];

const OPCOES_ESCOPO_AGENDA: Array<{
  value: EscopoAgenda;
  label: string;
  descricao: string;
}> = [
  {
    value: "none",
    label: "Sem acesso",
    descricao: "A ação não estará disponível para este usuário.",
  },
  {
    value: "own",
    label: "Própria agenda",
    descricao: "Permite a ação somente nos compromissos do próprio usuário.",
  },
  {
    value: "tenant",
    label: "Toda a corretora",
    descricao: "Permite a ação nos compromissos de toda a corretora.",
  },
];

const OPCOES_ESCOPO_AGENDA_GOOGLE: Array<{
  value: EscopoAgendaGoogle;
  label: string;
  descricao: string;
}> = [
  {
    value: "none",
    label: "Sem acesso",
    descricao: "Não permite conectar ou sincronizar Google Calendar.",
  },
  {
    value: "own",
    label: "Própria conta",
    descricao: "Permite conectar e sincronizar somente a própria conta Google.",
  },
];

const ACOES_CONTATOS: Array<{
  key: keyof PermissoesContatos;
  label: string;
  descricao: string;
}> = [
  {
    key: "read",
    label: "Visualizar",
    descricao: "Visualizar e pesquisar contatos.",
  },
  {
    key: "create",
    label: "Criar",
    descricao: "Cadastrar novos contatos.",
  },
  {
    key: "update",
    label: "Editar",
    descricao: "Alterar nome, telefone e demais dados do contato.",
  },
  {
    key: "delete",
    label: "Excluir",
    descricao: "Enviar o contato para a lista de excluídos.",
  },
  {
    key: "restore",
    label: "Restaurar",
    descricao: "Restaurar contatos anteriormente excluídos.",
  },
  {
    key: "sync",
    label: "Sincronizar",
    descricao: "Sincronizar contatos das conexões permitidas.",
  },
  {
    key: "send",
    label: "Enviar mensagem",
    descricao: "Iniciar uma conversa com o contato.",
  },
];

const ACOES_CONVERSAS: Array<{
  key: keyof PermissoesConversas;
  label: string;
  descricao: string;
}> = [
  {
    key: "read",
    label: "Visualizar",
    descricao: "Visualizar a lista de conversas e abrir o histórico permitido.",
  },
  {
    key: "start",
    label: "Iniciar conversa",
    descricao: "Iniciar novas conversas pelas conexões permitidas.",
  },
  {
    key: "interact",
    label: "Interagir",
    descricao:
      "Enviar mensagens, mídias e áudios, responder, reagir e encaminhar mensagens.",
  },
  {
    key: "assign",
    label: "Alterar responsável",
    descricao:
      "Trocar o responsável da conversa entre usuários autorizados na conexão.",
  },
  {
    key: "manage",
    label: "Gerenciar conversa",
    descricao:
      "Encerrar, reabrir, organizar e alterar informações operacionais da conversa e do Kanban.",
  },
  {
    key: "call",
    label: "Realizar ligações",
    descricao: "Efetuar ligações pelas conexões permitidas.",
  },
  {
    key: "automation",
    label: "Automações",
    descricao:
      "Executar ações de automação, triagem e pré-qualificação da conversa.",
  },
];

function escopoContatoValido(
  value: unknown,
): value is EscopoContato {
  return (
    value === "none" ||
    value === "assigned" ||
    value === "tenant"
  );
}

function normalizarEscopoConversa(
  value: unknown,
): EscopoConversa {
  if (value === "assigned") {
    return "assigned";
  }

  /*
   * Compatibilidade:
   * Conversas não usa mais "tenant".
   * Se houver valor antigo salvo, tratamos como
   * "assigned" para não ampliar acesso além das
   * conexões autorizadas ao usuário.
   */
  if (value === "tenant") {
    return "assigned";
  }

  return "none";
}

function normalizarPermissoesContatos(
  value: any,
): PermissoesContatos {
  const contatos = value?.atendimento?.contatos;

  if (!contatos || typeof contatos !== "object") {
    return { ...PERMISSOES_CONTATOS_PADRAO };
  }

  return {
    read: escopoContatoValido(contatos.read)
      ? contatos.read
      : "none",
    create: escopoContatoValido(contatos.create)
      ? contatos.create
      : "none",
    update: escopoContatoValido(contatos.update)
      ? contatos.update
      : "none",
    delete: escopoContatoValido(contatos.delete)
      ? contatos.delete
      : "none",
    restore: escopoContatoValido(contatos.restore)
      ? contatos.restore
      : "none",
    sync: escopoContatoValido(contatos.sync)
      ? contatos.sync
      : "none",
    send: escopoContatoValido(contatos.send)
      ? contatos.send
      : "none",
  };
}

function normalizarPermissoesConversas(
  value: any,
): PermissoesConversas {
  const conversas = value?.atendimento?.conversas;

  if (!conversas || typeof conversas !== "object") {
    return { ...PERMISSOES_CONVERSAS_PADRAO };
  }

  return {
    read: normalizarEscopoConversa(conversas.read),
    start: normalizarEscopoConversa(conversas.start),
    interact: normalizarEscopoConversa(conversas.interact),
    assign: normalizarEscopoConversa(conversas.assign),
    manage: normalizarEscopoConversa(conversas.manage),
    call: normalizarEscopoConversa(conversas.call),
    automation: normalizarEscopoConversa(conversas.automation),
  };
}


function normalizarEscopoAgenda(
  value: unknown,
): EscopoAgenda {
  if (value === "own" || value === "tenant") {
    return value;
  }

  return "none";
}

function normalizarEscopoAgendaGoogle(
  value: unknown,
): EscopoAgendaGoogle {
  return value === "own" ? "own" : "none";
}

function normalizarPermissoesAgenda(
  value: any,
): PermissoesAgenda {
  const agenda = value?.atendimento?.agenda;

  if (!agenda || typeof agenda !== "object") {
    return { ...PERMISSOES_AGENDA_PADRAO };
  }

  return {
    read: normalizarEscopoAgenda(agenda.read),
    manage: normalizarEscopoAgenda(agenda.manage),
    google: normalizarEscopoAgendaGoogle(agenda.google),
  };
}

function normalizarPermissoesEquipe(value: any): PermissoesEquipe {
  const equipe = value?.operacoes?.equipe;
  return {
    create: equipe?.create === "tenant" ? "tenant" : "none",
    delete: equipe?.delete === "tenant" ? "tenant" : "none",
    update: equipe?.update === "tenant" ? "tenant" : "none",
    password: equipe?.password === "tenant" ? "tenant" : "none",
    permissions: equipe?.permissions === "tenant" ? "tenant" : "none",
  };
}

async function chamarEquipe(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("cadastrar-usuario", { body });

  if (error) {
    let mensagem = error.message;
    try {
      const context = (error as any).context;
      if (context && typeof context.json === "function") {
        const resposta = await context.json();
        if (typeof resposta?.error === "string") mensagem = resposta.error;
      }
    } catch {
      // Mantemos a mensagem da função.
    }
    throw new Error(mensagem);
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error("A operação não retornou confirmação de sucesso.");
  return data;
}

export default function ModalPermissoesUsuario({
  open,
  usuarioId,
  corretoraId,
  nomeUsuario,
  emailUsuario,
  onClose,
  onSaved,
}: ModalPermissoesUsuarioProps) {
  const [
    permissoesContatos,
    setPermissoesContatos,
  ] = useState<PermissoesContatos>({
    ...PERMISSOES_CONTATOS_PADRAO,
  });

  const [
    permissoesConversas,
    setPermissoesConversas,
  ] = useState<PermissoesConversas>({
    ...PERMISSOES_CONVERSAS_PADRAO,
  });

  const [
    permissoesAgenda,
    setPermissoesAgenda,
  ] = useState<PermissoesAgenda>({
    ...PERMISSOES_AGENDA_PADRAO,
  });

  const [permissoesEquipe, setPermissoesEquipe] =
    useState<PermissoesEquipe>({ ...PERMISSOES_EQUIPE_PADRAO });

  const [permissoesOriginais, setPermissoesOriginais] = useState<any>({});

  const [loading, setLoading] =
    useState(false);

  const [permissoesCarregadas, setPermissoesCarregadas] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [sucesso, setSucesso] =
    useState("");

  useEffect(() => {
    if (
      !open ||
      !usuarioId ||
      !corretoraId
    ) {
      return;
    }

    void carregarPermissoes();
  }, [
    open,
    usuarioId,
    corretoraId,
  ]);

  async function carregarPermissoes() {
    if (!usuarioId || !corretoraId) return;

    try {
      setLoading(true);
      setPermissoesCarregadas(false);
      setErro("");
      setSucesso("");

      const resposta = await chamarEquipe({
        action: "CONSULTAR_PERMISSOES",
        membro_id: usuarioId,
      });

      const jsonAtual =
        resposta?.permissoes &&
        typeof resposta.permissoes === "object" &&
        !Array.isArray(resposta.permissoes)
          ? resposta.permissoes
          : {};

      setPermissoesOriginais(jsonAtual);
      setPermissoesContatos(normalizarPermissoesContatos(jsonAtual));
      setPermissoesConversas(normalizarPermissoesConversas(jsonAtual));
      setPermissoesAgenda(normalizarPermissoesAgenda(jsonAtual));
      setPermissoesEquipe(normalizarPermissoesEquipe(jsonAtual));
      setPermissoesCarregadas(true);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      setErro(error instanceof Error ? error.message : "Não foi possível carregar as permissões do usuário.");
    } finally {
      setLoading(false);
    }
  }

  function alterarPermissaoEquipe(acao: keyof PermissoesEquipe, escopo: EscopoEquipe) {
    setPermissoesEquipe((prev) => ({ ...prev, [acao]: escopo }));
    setSucesso("");
  }

  function aplicarTodasEquipe(escopo: EscopoEquipe) {
    setPermissoesEquipe({
      create: escopo,
      delete: escopo,
      update: escopo,
      password: escopo,
      permissions: escopo,
    });
    setSucesso("");
  }

  function alterarPermissaoContato(
    acao: keyof PermissoesContatos,
    escopo: EscopoContato,
  ) {
    setPermissoesContatos(
      (prev) => ({
        ...prev,
        [acao]: escopo,
      }),
    );

    setSucesso("");
  }

  function alterarPermissaoConversa(
    acao: keyof PermissoesConversas,
    escopo: EscopoConversa,
  ) {
    setPermissoesConversas(
      (prev) => ({
        ...prev,
        [acao]: escopo,
      }),
    );

    setSucesso("");
  }

  function alterarPermissaoAgenda(
    acao: keyof PermissoesAgenda,
    escopo: EscopoAgenda | EscopoAgendaGoogle,
  ) {
    setPermissoesAgenda((prev) => ({
      ...prev,
      [acao]: escopo,
    }));

    setSucesso("");
  }

  function aplicarAgendaOperacional(
    escopo: EscopoAgenda,
  ) {
    setPermissoesAgenda((prev) => ({
      ...prev,
      read: escopo,
      manage: escopo,
    }));

    setSucesso("");
  }

  function aplicarTodasContatos(
    escopo: EscopoContato,
  ) {
    setPermissoesContatos({
      read: escopo,
      create: escopo,
      update: escopo,
      delete: escopo,
      restore: escopo,
      sync: escopo,
      send: escopo,
    });

    setSucesso("");
  }

  function aplicarTodasConversas(
    escopo: EscopoConversa,
  ) {
    setPermissoesConversas({
      read: escopo,
      start: escopo,
      interact: escopo,
      assign: escopo,
      manage: escopo,
      call: escopo,
      automation: escopo,
    });

    setSucesso("");
  }

  async function salvarPermissoes() {
    if (!usuarioId || !corretoraId || saving || loading || !permissoesCarregadas) return;

    try {
      setSaving(true);
      setErro("");
      setSucesso("");

      // Enviamos somente os módulos editáveis. O servidor faz a mesclagem
      // com o JSON atual, preservando os demais módulos da corretora.
      const alteracoes = {
        atendimento: {
          contatos: { ...permissoesContatos },
          conversas: { ...permissoesConversas },
          agenda: { ...permissoesAgenda },
        },
        operacoes: {
          equipe: { ...permissoesEquipe },
        },
      };

      const resposta = await chamarEquipe({
        action: "ALTERAR_PERMISSOES",
        membro_id: usuarioId,
        permissoes: alteracoes,
      });

      const jsonSalvo = resposta?.permissoes && typeof resposta.permissoes === "object"
        ? resposta.permissoes
        : {
            ...permissoesOriginais,
            atendimento: {
              ...(permissoesOriginais?.atendimento || {}),
              ...alteracoes.atendimento,
            },
            operacoes: {
              ...(permissoesOriginais?.operacoes || {}),
              ...alteracoes.operacoes,
            },
          };

      setPermissoesOriginais(jsonSalvo);
      setPermissoesEquipe(normalizarPermissoesEquipe(jsonSalvo));
      setSucesso("Permissões atualizadas com sucesso.");
      onSaved?.();
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as permissões.");
    } finally {
      setSaving(false);
    }
  }

  function fechar() {
    if (saving) return;

    setErro("");
    setSucesso("");
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <ShieldCheck
                size={23}
              />
            </div>

            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                Permissões do usuário
              </h2>

              <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {nomeUsuario ||
                  "Membro da equipe"}
              </p>

              {emailUsuario && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  {emailUsuario}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={fechar}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
              <Loader2
                size={30}
                className="animate-spin text-purple-600"
              />

              <p className="text-sm font-medium text-zinc-500">
                Carregando permissões...
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* AVISO */}
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-bold">
                    Permissões por módulo
                  </p>

                  <p className="mt-1 text-xs leading-5 opacity-80">
                    As permissões abaixo
                    afetam somente o módulo
                    selecionado. O acesso
                    entre corretoras
                    permanece sempre
                    isolado.
                  </p>
                </div>
              </div>

              {/* GRUPO */}
              <div className="mb-3 flex items-center gap-2">
                <UsersRound
                  size={18}
                  className="text-purple-600"
                />

                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Atendimento
                </h3>
              </div>

              <div className="space-y-5">
                {/* MÓDULO: CONTATOS */}
                <ModuloPermissao
                  titulo="Contatos"
                  descricao="Controle de acesso aos contatos vinculados às conexões WhatsApp."
                  icon={
                    <MessageCircle
                      size={19}
                    />
                  }
                  iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  onAplicarTodas={
                    aplicarTodasContatos
                  }
                >
                  {ACOES_CONTATOS.map(
                    (acao) => (
                      <LinhaPermissao
                        key={
                          acao.key
                        }
                        label={
                          acao.label
                        }
                        descricao={
                          acao.descricao
                        }
                        value={
                          permissoesContatos[
                            acao.key
                          ]
                        }
                        disabled={
                          saving
                        }
                        opcoes={
                          OPCOES_ESCOPO_CONTATOS
                        }
                        onChange={(
                          escopo,
                        ) =>
                          alterarPermissaoContato(
                            acao.key,
                            escopo,
                          )
                        }
                      />
                    ),
                  )}
                </ModuloPermissao>

                {/* MÓDULO: CONVERSAS */}
                <ModuloPermissao
                  titulo="Conversas"
                  descricao="Controle das ações próprias do módulo de conversas e atendimento WhatsApp."
                  icon={
                    <MessagesSquare
                      size={19}
                    />
                  }
                  iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  onAplicarTodas={(
                    escopo,
                  ) =>
                    aplicarTodasConversas(
                      escopo === "assigned"
                        ? "assigned"
                        : "none",
                    )
                  }
                  mostrarTodaCorretora={false}
                >
                  {ACOES_CONVERSAS.map(
                    (acao) => (
                      <LinhaPermissao
                        key={
                          acao.key
                        }
                        label={
                          acao.label
                        }
                        descricao={
                          acao.descricao
                        }
                        value={
                          permissoesConversas[
                            acao.key
                          ]
                        }
                        disabled={
                          saving
                        }
                        opcoes={
                          OPCOES_ESCOPO_CONVERSAS
                        }
                        onChange={(
                          escopo,
                        ) =>
                          alterarPermissaoConversa(
                            acao.key,
                            escopo === "assigned"
                              ? "assigned"
                              : "none",
                          )
                        }
                      />
                    ),
                  )}
                </ModuloPermissao>


                {/* MÓDULO: AGENDA */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                          <CalendarDays size={19} />
                        </div>

                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white">
                            Agenda
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-500">
                            Controle da agenda CRM e da integração pessoal com Google Calendar.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            aplicarAgendaOperacional("own")
                          }
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Própria agenda
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            aplicarAgendaOperacional("tenant")
                          }
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Toda corretora
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPermissoesAgenda({
                              read: "none",
                              manage: "none",
                              google: "none",
                            });
                            setSucesso("");
                          }}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Remover acessos
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <LinhaPermissao
                      label="Visualizar"
                      descricao="Visualizar compromissos na agenda."
                      value={permissoesAgenda.read}
                      disabled={saving}
                      opcoes={OPCOES_ESCOPO_AGENDA}
                      onChange={(escopo) =>
                        alterarPermissaoAgenda(
                          "read",
                          escopo as EscopoAgenda,
                        )
                      }
                    />

                    <LinhaPermissao
                      label="Gerenciar"
                      descricao="Criar, editar, reagendar, concluir e cancelar compromissos."
                      value={permissoesAgenda.manage}
                      disabled={saving}
                      opcoes={OPCOES_ESCOPO_AGENDA}
                      onChange={(escopo) =>
                        alterarPermissaoAgenda(
                          "manage",
                          escopo as EscopoAgenda,
                        )
                      }
                    />

                    <LinhaPermissao
                      label="Google Calendar"
                      descricao="Conectar, desconectar e sincronizar somente a própria conta Google."
                      value={permissoesAgenda.google}
                      disabled={saving}
                      opcoes={OPCOES_ESCOPO_AGENDA_GOOGLE}
                      onChange={(escopo) =>
                        alterarPermissaoAgenda(
                          "google",
                          escopo as EscopoAgendaGoogle,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* GRUPO: OPERAÇÕES */}
              <div className="mb-3 mt-8 flex items-center gap-2">
                <UserRoundCog size={18} className="text-purple-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Operações
                </h3>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                        <UsersRound size={19} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">Equipe</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Administração dos membros vinculados à corretora.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving || loading}
                        onClick={() => aplicarTodasEquipe("tenant")}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Toda corretora
                      </button>
                      <button
                        type="button"
                        disabled={saving || loading}
                        onClick={() => aplicarTodasEquipe("none")}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        Remover acessos
                      </button>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {ACOES_EQUIPE.map((acao) => (
                    <LinhaPermissao
                      key={acao.key}
                      label={acao.label}
                      descricao={acao.descricao}
                      value={permissoesEquipe[acao.key]}
                      disabled={saving || loading}
                      opcoes={OPCOES_ESCOPO_EQUIPE}
                      onChange={(escopo) => alterarPermissaoEquipe(acao.key, escopo)}
                    />
                  ))}
                </div>
              </div>

              {/* LEGENDA GERAL — CONTATOS */}
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {OPCOES_ESCOPO_CONTATOS.map(
                  (opcao) => (
                    <div
                      key={
                        opcao.value
                      }
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <p className="text-xs font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                        {opcao.label}
                      </p>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        {
                          opcao.descricao
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>

              {/* FEEDBACK */}
              {erro && (
                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  {erro}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FEEDBACK DE SUCESSO NO TOPO */}
        {sucesso && (
          <div className="absolute left-6 right-6 top-[108px] z-20 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 shadow-sm dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            {sucesso}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-zinc-100 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={fechar}
            disabled={saving}
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void salvarPermissoes()
            }
            disabled={
              saving ||
              loading ||
              !usuarioId ||
              !corretoraId
            }
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {saving
              ? "Salvando..."
              : "Salvar permissões"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModuloPermissao({
  titulo,
  descricao,
  icon,
  iconClassName,
  onAplicarTodas,
  mostrarTodaCorretora = true,
  children,
}: {
  titulo: string;
  descricao: string;
  icon: ReactNode;
  iconClassName: string;
  onAplicarTodas: (
    escopo: EscopoContato,
  ) => void;
  mostrarTodaCorretora?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
            >
              {icon}
            </div>

            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {titulo}
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {descricao}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onAplicarTodas(
                  "assigned",
                )
              }
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Todas atribuídas
            </button>

            {mostrarTodaCorretora && (
              <button
                type="button"
                onClick={() =>
                  onAplicarTodas(
                    "tenant",
                  )
                }
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Toda corretora
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onAplicarTodas("none")
              }
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Remover acessos
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {children}
      </div>
    </div>
  );
}

type EscopoLinhaPermissao =
  | "none"
  | "own"
  | "assigned"
  | "tenant";

function LinhaPermissao<
  T extends EscopoLinhaPermissao,
>({
  label,
  descricao,
  value,
  disabled,
  opcoes,
  onChange,
}: {
  label: string;
  descricao: string;
  value: T;
  disabled: boolean;
  opcoes: Array<{
    value: T;
    label: string;
    descricao: string;
  }>;
  onChange: (
    escopo: T,
  ) => void;
}) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-[1fr_260px] sm:items-center">
      <div>
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {descricao}
        </p>
      </div>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value as T,
          )
        }
        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
      >
        {opcoes.map(
          (opcao) => (
            <option
              key={opcao.value}
              value={opcao.value}
            >
              {opcao.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
