export type EscopoContato = "none" | "assigned" | "tenant";
export type EscopoConversa = "none" | "assigned";
export type EscopoAgenda = "none" | "own" | "tenant";
export type EscopoAgendaGoogle = "none" | "own";
export type EscopoEquipe = "none" | "tenant";

export interface PermissoesEquipe {
  create: EscopoEquipe;
  delete: EscopoEquipe;
  update: EscopoEquipe;
  password: EscopoEquipe;
  permissions: EscopoEquipe;
}

export interface PermissoesAgenda {
  read: EscopoAgenda;
  manage: EscopoAgenda;
  google: EscopoAgendaGoogle;
}

export interface PermissoesContatos {
  read: EscopoContato;
  create: EscopoContato;
  update: EscopoContato;
  delete: EscopoContato;
  restore: EscopoContato;
  sync: EscopoContato;
  send: EscopoContato;
}

export interface PermissoesConversas {
  read: EscopoConversa;
  start: EscopoConversa;
  interact: EscopoConversa;
  assign: EscopoConversa;
  manage: EscopoConversa;
  call: EscopoConversa;
  automation: EscopoConversa;
}

export interface ModalPermissoesUsuarioProps {
  open: boolean;
  usuarioId: string | null;
  corretoraId: string | null;
  nomeUsuario?: string | null;
  emailUsuario?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const PERMISSOES_CONTATOS_PADRAO: PermissoesContatos = {
  read: "none",
  create: "none",
  update: "none",
  delete: "none",
  restore: "none",
  sync: "none",
  send: "none",
};

export const PERMISSOES_CONVERSAS_PADRAO: PermissoesConversas = {
  read: "none",
  start: "none",
  interact: "none",
  assign: "none",
  manage: "none",
  call: "none",
  automation: "none",
};

export const PERMISSOES_AGENDA_PADRAO: PermissoesAgenda = {
  read: "none",
  manage: "none",
  google: "none",
};

export const PERMISSOES_EQUIPE_PADRAO: PermissoesEquipe = {
  create: "none",
  delete: "none",
  update: "none",
  password: "none",
  permissions: "none",
};


// Permissões da área Operações → Propostas. Escopo own = corretor_id da proposta.
export type EscopoProposta = "none" | "own" | "tenant";

export interface PermissoesPropostas {
  create: EscopoProposta;
  read: EscopoProposta;
  update: EscopoProposta;
  delete: EscopoProposta;
  lose: EscopoProposta;
  reverse: EscopoProposta;
  close: EscopoProposta;
  issue: EscopoProposta;
  correct_term: EscopoProposta;
  reactivate: EscopoProposta;
  financial: EscopoProposta;
  commissions: EscopoProposta;
  renew: EscopoProposta;
}


export const PERMISSOES_PROPOSTAS_PADRAO: PermissoesPropostas = {
  create: "none",
  read: "none",
  update: "none",
  delete: "none",
  lose: "none",
  reverse: "none",
  close: "none",
  issue: "none",
  correct_term: "none",
  reactivate: "none",
  financial: "none",
  commissions: "none",
  renew: "none",
};


export const ACOES_PROPOSTAS: Array<{
  key: keyof PermissoesPropostas;
  label: string;
  descricao: string;
}> = [
  {
    key: "create",
    label: "Adicionar novas propostas",
    descricao: "Criar propostas de novos negócios ou renovação.",
  },
  {
    key: "read",
    label: "Abrir detalhamento de proposta",
    descricao: "Consultar dados, itens, valores e histórico de uma proposta.",
  },
  {
    key: "update",
    label: "Editar dados da proposta",
    descricao: "Alterar dados e itens quando o status permitir.",
  },
  {
    key: "delete",
    label: "Excluir proposta",
    descricao: "Excluir propostas conforme as regras de integridade do módulo.",
  },
  {
    key: "lose",
    label: "Marcar como perdida",
    descricao: "Registrar a perda de uma negociação.",
  },
  {
    key: "reverse",
    label: "Reverter venda",
    descricao: "Executar a reversão de uma venda conforme as regras do módulo.",
  },
  {
    key: "close",
    label: "Fechar venda",
    descricao: "Converter proposta negociada em venda e contrato.",
  },
  {
    key: "issue",
    label: "Emitir apólice",
    descricao: "Executar a emissão inicial de apólices e contratos.",
  },
  {
    key: "correct_term",
    label: "Corrigir vigência",
    descricao:
      "Corrigir as datas de início e fim da vigência de contratos ativos.",
  },
  {
    key: "reactivate",
    label: "Reativar contrato encerrado",
    descricao:
      "Corrigir a vigência e reativar contratos encerrados, respeitando as regras de renovação.",
  },
  {
    key: "financial",
    label: "Lançar financeiro",
    descricao:
      "Acionar lançamentos financeiros a partir de Propostas.",
  },
  {
    key: "commissions",
    label: "Lançar comissões",
    descricao:
      "Acionar lançamentos de comissões a partir de Propostas.",
  },
  {
    key: "renew",
    label: "Renovar",
    descricao:
      "Iniciar uma renovação vinculada ao contrato de origem.",
  },
];

export const OPCOES_ESCOPO_PROPOSTAS: Array<{
  value: EscopoProposta; label: string; descricao: string;
}> = [
  { value: "none", label: "Sem acesso", descricao: "A ação não estará disponível." },
  { value: "own", label: "Próprias propostas", descricao: "Somente propostas sob responsabilidade do corretor." },
  { value: "tenant", label: "Toda a corretora", descricao: "Propostas de qualquer corretor da mesma corretora." },
];
export function normalizarPermissoesPropostas(value: any): PermissoesPropostas {
  const propostas = value?.operacoes?.propostas;
  const resultado = { ...PERMISSOES_PROPOSTAS_PADRAO };
  for (const chave of Object.keys(resultado) as Array<keyof PermissoesPropostas>) {
    const escopo = propostas?.[chave];
    resultado[chave] = escopo === "own" || escopo === "tenant" ? escopo : "none";
  }
  return resultado;
}

export const OPCOES_ESCOPO_EQUIPE: Array<{
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

export const ACOES_EQUIPE: Array<{
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

export const OPCOES_ESCOPO_CONTATOS: Array<{
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

export const OPCOES_ESCOPO_CONVERSAS: Array<{
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

export const OPCOES_ESCOPO_AGENDA: Array<{
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

export const OPCOES_ESCOPO_AGENDA_GOOGLE: Array<{
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

export const ACOES_CONTATOS: Array<{
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

export const ACOES_CONVERSAS: Array<{
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

export function normalizarPermissoesContatos(
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

export function normalizarPermissoesConversas(
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

export function normalizarPermissoesAgenda(
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

export function normalizarPermissoesEquipe(value: any): PermissoesEquipe {
  const equipe = value?.operacoes?.equipe;
  return {
    create: equipe?.create === "tenant" ? "tenant" : "none",
    delete: equipe?.delete === "tenant" ? "tenant" : "none",
    update: equipe?.update === "tenant" ? "tenant" : "none",
    password: equipe?.password === "tenant" ? "tenant" : "none",
    permissions: equipe?.permissions === "tenant" ? "tenant" : "none",
  };
}

