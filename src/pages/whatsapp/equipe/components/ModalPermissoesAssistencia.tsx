import { Headset } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";

export type EscopoAssistencia = "none" | "own" | "tenant";
export type AcaoAssistencia = "read" | "create" | "update" | "delete";
export type PermissoesAssistencia = Record<AcaoAssistencia, EscopoAssistencia>;

export const PERMISSOES_ASSISTENCIAS_PADRAO: PermissoesAssistencia = {
  read: "none", create: "none", update: "none", delete: "none",
};

export function normalizarPermissoesAssistencia(
  json: unknown,
): PermissoesAssistencia {
  const raiz = json && typeof json === "object" ? json as Record<string, unknown> : {};
  const operacoes = raiz.operacoes && typeof raiz.operacoes === "object"
    ? raiz.operacoes as Record<string, unknown> : {};
  const dados = operacoes["assistencias"] && typeof operacoes["assistencias"] === "object"
    ? operacoes["assistencias"] as Record<string, unknown> : {};
  return Object.fromEntries((Object.keys(PERMISSOES_ASSISTENCIAS_PADRAO) as AcaoAssistencia[])
    .map(acao => [acao, ["none", "own", "tenant"].includes(String(dados[acao]))
      ? dados[acao] : "none"])) as PermissoesAssistencia;
}

const ACOES: { key: AcaoAssistencia; label: string; hint: string }[] = [
  { key: "read", label: "Visualizar", hint: "Consultar lista e detalhamento" },
  { key: "create", label: "Abrir", hint: "Registrar novo atendimento" },
  { key: "update", label: "Editar", hint: "Alterar dados, ocorrências e envolvidos" },
  { key: "delete", label: "Excluir", hint: "Excluir o registro conforme regras do módulo" },
];
const OPCOES: { value: EscopoAssistencia; label: string; descricao: string }[] = [
  { value: "none", label: "Sem acesso", descricao: "Não permite executar a operação." },
  { value: "own", label: "Próprios", descricao: "Registros sob responsabilidade do usuário." },
  { value: "tenant", label: "Corretora", descricao: "Registros da mesma corretora." },
];
export default function ModalPermissoesAssistencia({ value, disabled, onChange, onAplicarTodas }: {
  value: PermissoesAssistencia;
  disabled: boolean;
  onChange: (acao: AcaoAssistencia, escopo: EscopoAssistencia) => void;
  onAplicarTodas: (escopo: EscopoAssistencia) => void;
}) {
  return <ModuloPermissao titulo="Assistências" descricao="Atendimentos de assistência, ocorrências e responsáveis."
    icon={<Headset size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Próprios" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas} rodape="Próprios = registros sob responsabilidade do usuário. Para abrir um registro pela interface também é necessário ter Visualizar.">
    {ACOES.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.hint}
      value={value[acao.key]} disabled={disabled} opcoes={OPCOES} onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>;
}
