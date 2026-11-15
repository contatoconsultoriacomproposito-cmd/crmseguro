import { FileClock } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";

export type EscopoRenovacao = "none" | "own" | "tenant";
export type AcaoPermissaoRenovacao = "read" | "export";
export type PermissoesRenovacoes = Record<AcaoPermissaoRenovacao, EscopoRenovacao>;

export const PERMISSOES_RENOVACOES_PADRAO: PermissoesRenovacoes = {
  read: "none",
  export: "none",
};

export function normalizarPermissoesRenovacoes(json: unknown): PermissoesRenovacoes {
  const root = json && typeof json === "object" && !Array.isArray(json)
    ? json as Record<string, unknown> : {};
  const operacoes = root.operacoes && typeof root.operacoes === "object" && !Array.isArray(root.operacoes)
    ? root.operacoes as Record<string, unknown> : {};
  const modulo = operacoes.renovacoes && typeof operacoes.renovacoes === "object" && !Array.isArray(operacoes.renovacoes)
    ? operacoes.renovacoes as Record<string, unknown> : {};
  const validar = (v: unknown): EscopoRenovacao =>
    v === "own" || v === "tenant" ? v : "none";
  return { read: validar(modulo.read), export: validar(modulo.export) };
}

const CAMPOS: { acao: AcaoPermissaoRenovacao; titulo: string; descricao: string }[] = [
  { acao: "read", titulo: "Visualizar renovações", descricao: "Consultar a carteira, filtros, contratos e valores agregados por produto." },
  { acao: "export", titulo: "Exportar relatório PDF", descricao: "Gerar o relatório somente dos contratos autorizados também para leitura." },
];
const OPCOES: Array<{ value: EscopoRenovacao; label: string; descricao: string }> = [
  { value: "none", label: "Sem acesso", descricao: "Ação não autorizada." },
  { value: "own", label: "Próprias", descricao: "Carteira do usuário." },
  { value: "tenant", label: "Corretora", descricao: "Toda a corretora." },
];

export default function ModalPermissoesRenovacoes({ value, disabled = false, onChange, onAplicarTodas }: {
  value: PermissoesRenovacoes;
  disabled?: boolean;
  onChange: (acao: AcaoPermissaoRenovacao, escopo: EscopoRenovacao) => void;
  onAplicarTodas: (escopo: EscopoRenovacao) => void;
}) {
  return <ModuloPermissao titulo="Renovações" descricao="Carteira de contratos a renovar e exportações controladas."
    icon={<FileClock size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Próprias" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas} rodape="Exportar não amplia o alcance da leitura. Alterar Renovações não modifica Propostas.">
    {CAMPOS.map(({ acao, titulo, descricao }) => <LinhaPermissao key={acao} label={titulo} descricao={descricao}
      value={value[acao]} disabled={disabled} opcoes={OPCOES} onChange={escopo => onChange(acao, escopo)} />)}
  </ModuloPermissao>;
}
