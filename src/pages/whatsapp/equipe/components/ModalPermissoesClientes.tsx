import { ContactRound } from "lucide-react";
import { LinhaPermissao, ModuloPermissao, SecaoPermissao } from "./PermissaoUI";

export type EscopoCliente = "none" | "own" | "tenant";

export type AcaoPermissaoCliente =
  | "read"
  | "create"
  | "open"
  | "view_cadastro"
  | "view_agenda"
  | "view_propostas"
  | "view_contratos"
  | "view_sinistros"
  | "view_assistencias"
  | "view_financeiro"
  | "view_comissoes"
  | "view_arquivos"
  | "update"
  | "transfer"
  | "make_lead"
  | "delete"
  | "whatsapp";

export type PermissoesClientes = Record<AcaoPermissaoCliente, EscopoCliente>;

export const PERMISSOES_CLIENTES_PADRAO: PermissoesClientes = {
  read: "none",
  create: "none",
  open: "none",
  view_cadastro: "none",
  view_agenda: "none",
  view_propostas: "none",
  view_contratos: "none",
  view_sinistros: "none",
  view_assistencias: "none",
  view_financeiro: "none",
  view_comissoes: "none",
  view_arquivos: "none",
  update: "none",
  transfer: "none",
  make_lead: "none",
  delete: "none",
  whatsapp: "none",
};

const OPCOES_ESCOPO_CLIENTES: {
  value: EscopoCliente;
  label: string;
  descricao: string;
}[] = [
  {
    value: "none",
    label: "Sem acesso",
    descricao: "Não permite executar esta ação.",
  },
  {
    value: "own",
    label: "Próprios",
    descricao: "Permite executar esta ação nos clientes sob sua responsabilidade.",
  },
  {
    value: "tenant",
    label: "Toda corretora",
    descricao: "Permite executar esta ação nos clientes da corretora.",
  },
];

type DefinicaoAcao = {
  key: AcaoPermissaoCliente;
  label: string;
  descricao: string;
};

const ACOES_GERAIS: DefinicaoAcao[] = [
  { key: "read", label: "Visualizar lista de clientes", descricao: "Consultar a lista e o Kanban dos clientes autorizados." },
  { key: "create", label: "Criar novo cliente", descricao: "Cadastrar novos clientes no CRM." },
];

const ACAO_CARD: DefinicaoAcao = {
  key: "open",
  label: "Acessar card do cliente",
  descricao: "Abrir o Cliente 360°. O conteúdo de cada aba depende da respectiva permissão.",
};

const ACOES_ABAS: DefinicaoAcao[] = [
  { key: "view_cadastro", label: "Cadastro", descricao: "Consultar informações cadastrais do cliente." },
  { key: "view_agenda", label: "Agenda", descricao: "Consultar a agenda dentro do card do cliente." },
  { key: "view_propostas", label: "Propostas", descricao: "Consultar propostas vinculadas ao cliente." },
  { key: "view_contratos", label: "Contratos", descricao: "Consultar contratos vinculados ao cliente." },
  { key: "view_sinistros", label: "Sinistros", descricao: "Consultar sinistros vinculados ao cliente." },
  { key: "view_assistencias", label: "Assistências", descricao: "Consultar assistências vinculadas ao cliente." },
  { key: "view_financeiro", label: "Financeiro", descricao: "Consultar informações financeiras do cliente." },
  { key: "view_comissoes", label: "Comissões", descricao: "Consultar comissões vinculadas ao cliente." },
  { key: "view_arquivos", label: "Arquivos", descricao: "Consultar arquivos vinculados ao cliente." },
];

const ACOES_OPERACIONAIS: DefinicaoAcao[] = [
  { key: "update", label: "Editar cadastro / mover no Kanban", descricao: "Alterar informações cadastrais e movimentar etapas do Kanban." },
  { key: "transfer", label: "Transferir responsável", descricao: "Transferir clientes entre corretores autorizados, independentemente da edição cadastral." },
  { key: "make_lead", label: "Tornar Lead", descricao: "Alterar a classificação do cliente para Lead." },
  { key: "delete", label: "Excluir cliente", descricao: "Excluir clientes conforme o escopo autorizado." },
  { key: "whatsapp", label: "Abrir WhatsApp", descricao: "Iniciar conversa pelo WhatsApp a partir do cliente." },
];

export function normalizarPermissoesClientes(json: unknown): PermissoesClientes {
  const raiz = json && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : {};
  const operacoes = raiz.operacoes && typeof raiz.operacoes === "object" && !Array.isArray(raiz.operacoes)
    ? (raiz.operacoes as Record<string, unknown>)
    : {};
  const clientes = operacoes.clientes && typeof operacoes.clientes === "object" && !Array.isArray(operacoes.clientes)
    ? (operacoes.clientes as Record<string, unknown>)
    : {};

  const resultado = { ...PERMISSOES_CLIENTES_PADRAO };
  for (const acao of Object.keys(resultado) as AcaoPermissaoCliente[]) {
    const valor = clientes[acao];
    if (valor === "none" || valor === "own" || valor === "tenant") {
      resultado[acao] = valor;
    }
  }
  return resultado;
}

export interface ModalPermissoesClientesProps {
  value: PermissoesClientes;
  disabled?: boolean;
  onChange: (acao: AcaoPermissaoCliente, escopo: EscopoCliente) => void;
  onAplicarTodas: (escopo: EscopoCliente) => void;
}
export default function ModalPermissoesClientes({ value, disabled = false, onChange, onAplicarTodas }: ModalPermissoesClientesProps) {
  const linha = (acao: DefinicaoAcao) => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
    value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_CLIENTES} onChange={escopo => onChange(acao.key, escopo)} />;
  return <ModuloPermissao titulo="Clientes" descricao="Cliente 360°, abas independentes e movimentações do Kanban."
    icon={<ContactRound size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Próprios" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas} rodape="As abas do Cliente 360° são independentes das permissões gerais dos outros módulos. Visualizar cadastro e Editar são ações distintas.">
    <SecaoPermissao titulo="Listagem e criação">{ACOES_GERAIS.map(linha)}</SecaoPermissao>
    <SecaoPermissao titulo="Card do cliente">{linha(ACAO_CARD)}</SecaoPermissao>
    <SecaoPermissao titulo="Abas do Cliente 360°">{ACOES_ABAS.map(linha)}</SecaoPermissao>
    <SecaoPermissao titulo="Ações operacionais">{ACOES_OPERACIONAIS.map(linha)}</SecaoPermissao>
  </ModuloPermissao>;
}
