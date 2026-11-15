import { ListChecks } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";

export type EscopoTarefas = "none" | "own" | "tenant";
export type AcaoTarefas = "read" | "create" | "update" | "delete";
export type PermissoesTarefas = Record<AcaoTarefas, EscopoTarefas>;

export const PERMISSOES_TAREFAS_PADRAO: PermissoesTarefas = {
  read: "none", create: "none", update: "none", delete: "none",
};

export function normalizarPermissoesTarefas(json: unknown): PermissoesTarefas {
  const raiz = json && typeof json === "object" ? json as Record<string, unknown> : {};
  const atendimento = raiz.atendimento && typeof raiz.atendimento === "object"
    ? raiz.atendimento as Record<string, unknown> : {};
  const dados = atendimento.tarefas && typeof atendimento.tarefas === "object"
    ? atendimento.tarefas as Record<string, unknown> : {};
  const resultado = { ...PERMISSOES_TAREFAS_PADRAO };
  for (const acao of Object.keys(resultado) as AcaoTarefas[]) {
    const escopo = dados[acao];
    if (escopo === "none" || escopo === "own" || escopo === "tenant") resultado[acao] = escopo;
  }
  return resultado;
}

const ACOES: { key: AcaoTarefas; label: string; descricao: string }[] = [
  { key: "read", label: "Visualizar", descricao: "Visualizar tarefas recebidas e delegadas pelo usuário" },
  { key: "create", label: "Criar", descricao: "Criar tarefas próprias ou delegar a qualquer membro da corretora" },
  { key: "update", label: "Editar", descricao: "Editar, concluir e reagendar tarefas" },
  { key: "delete", label: "Excluir", descricao: "Excluir tarefas conforme a política de acesso" },
];
const OPCOES: { value: EscopoTarefas; label: string; descricao: string }[] = [
  { value: "none", label: "Sem acesso", descricao: "Nenhuma tarefa autorizada" },
  { value: "own", label: "Próprios", descricao: "Tarefas atribuídas ao usuário" },
  { value: "tenant", label: "Corretora", descricao: "Tarefas de toda a corretora" },
];

export default function ModalPermissoesTarefas({ value, disabled, onChange, onAplicarTodas }: {
  value: PermissoesTarefas;
  disabled: boolean;
  onChange: (acao: AcaoTarefas, escopo: EscopoTarefas) => void;
  onAplicarTodas: (escopo: EscopoTarefas) => void;
}) {
  return <ModuloPermissao titulo="Tarefas" descricao="Pendências rápidas, checklists e vínculos opcionais com clientes ou conversas."
    icon={<ListChecks size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Próprios" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas}
    rodape="Visualizar Próprios inclui tarefas recebidas e criadas pelo usuário. Criar Próprios permite delegar para colaboradores ativos da mesma corretora. Editar/Excluir Próprios só alcançam tarefas atribuídas ao usuário. Concluir e reagendar exigem Editar.">
    {ACOES.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
      value={value[acao.key]} disabled={disabled} opcoes={OPCOES}
      onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>;
}
