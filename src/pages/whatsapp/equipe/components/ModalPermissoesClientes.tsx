import { useState } from "react";
import { ChevronDown, ChevronRight, ContactRound, LayoutPanelTop, ShieldCheck } from "lucide-react";
import { LinhaPermissao } from "./PermissaoUI";

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

export default function ModalPermissoesClientes({
  value,
  disabled = false,
  onChange,
  onAplicarTodas,
}: ModalPermissoesClientesProps) {
  const [abasExpandidas, setAbasExpandidas] = useState(true);
  const botao = "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

  function renderizarLinha(acao: DefinicaoAcao) {
    return (
      <LinhaPermissao
        key={acao.key}
        label={acao.label}
        descricao={acao.descricao}
        value={value[acao.key]}
        disabled={disabled}
        opcoes={OPCOES_ESCOPO_CLIENTES}
        onChange={(escopo) => onChange(acao.key, escopo as EscopoCliente)}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ContactRound size={19} />
            </div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">Clientes</p>
              <p className="mt-0.5 text-xs text-zinc-500">Acesso à carteira, ao Cliente 360° e às ações comerciais.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => onAplicarTodas("own")} className={botao}>Próprios</button>
            <button type="button" disabled={disabled} onClick={() => onAplicarTodas("tenant")} className={botao}>Toda corretora</button>
            <button type="button" disabled={disabled} onClick={() => onAplicarTodas("none")} className={botao + " !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400"}>Remover acessos</button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {ACOES_GERAIS.map(renderizarLinha)}

        <div>
          <div className="flex items-center gap-2 bg-indigo-50/50 px-4 py-3 dark:bg-indigo-500/5">
            <LayoutPanelTop size={17} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Card do cliente (360°)</span>
          </div>
          {renderizarLinha(ACAO_CARD)}
          <button
            type="button"
            aria-expanded={abasExpandidas}
            onClick={() => setAbasExpandidas((anterior) => !anterior)}
            className="flex w-full items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 text-left text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <span>Permissões individuais das nove abas</span>
            {abasExpandidas ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {abasExpandidas && (
            <div className="ml-4 border-l-2 border-indigo-200 dark:border-indigo-900">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ACOES_ABAS.map(renderizarLinha)}
              </div>
              <p className="border-t border-zinc-100 px-4 py-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                O acesso às abas é independente da leitura dos módulos gerais. As ações realizadas dentro das abas continuam sujeitas às permissões específicas.
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 bg-indigo-50/50 px-4 py-3 dark:bg-indigo-500/5">
            <ShieldCheck size={17} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Ações do cliente</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {ACOES_OPERACIONAIS.map(renderizarLinha)}
          </div>
        </div>
      </div>
    </section>
  );
}
