import { Building2 } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";

export type EscopoSeguradoras = "none" | "tenant";
export type AcaoSeguradoras = "read" | "update";
export type PermissoesSeguradoras = Record<AcaoSeguradoras, EscopoSeguradoras>;

export function normalizarPermissoesSeguradoras(json: unknown): PermissoesSeguradoras {
  const raiz = json && typeof json === "object" && !Array.isArray(json) ? json as Record<string, any> : {};
  const modulo = raiz.gestao?.seguradoras ?? {};
  return {
    read: modulo.read === "tenant" ? "tenant" : "none",
    update: modulo.update === "tenant" ? "tenant" : "none",
  };
}

const OPCOES: Array<{ value: EscopoSeguradoras; label: string; descricao: string }> = [
  { value: "none", label: "Sem acesso", descricao: "Permissão bloqueada." },
  { value: "tenant", label: "Corretora", descricao: "Limitado ao portfólio da corretora." },
];

interface Props {
  value: PermissoesSeguradoras;
  disabled?: boolean;
  onChange: (acao: AcaoSeguradoras, escopo: EscopoSeguradoras) => void;
  onAplicarTodas: (escopo: EscopoSeguradoras) => void;
}
export default function ModalPermissoesSeguradoras({ value, disabled = false, onChange, onAplicarTodas }: Props) {
  return (
    <ModuloPermissao
      titulo="Seguradoras e produtos"
      descricao="Seleção das seguradoras e ramos operados pela corretora. O catálogo compartilhado é gerenciado apenas pela administração do SeguroCRM."
      icon={<Building2 size={21} />}
      disabled={disabled}
      opcoesRapidas={[
        { value: "tenant", label: "Liberar acesso e edição" },
        { value: "none", label: "Remover acessos" },
      ]}
      onAplicarTodas={onAplicarTodas}
      rodape="Consultar e atualizar são independentes. Nenhuma destas permissões permite cadastrar ou editar seguradoras e produtos na base global."
    >
      <LinhaPermissao label="Visualizar seguradoras e produtos" descricao="Consultar o catálogo e as escolhas atuais da corretora." value={value.read} disabled={disabled} opcoes={OPCOES} onChange={(v) => onChange("read", v)} />
      <LinhaPermissao label="Atualizar seguradoras e produtos" descricao="Ativar ou desativar vínculos da corretora com seguradoras e ramos disponíveis." value={value.update} disabled={disabled} opcoes={OPCOES} onChange={(v) => onChange("update", v)} />
    </ModuloPermissao>
  );
}
