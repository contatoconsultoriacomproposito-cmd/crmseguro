import { MessagesSquare } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";
import { ACOES_CONVERSAS, OPCOES_ESCOPO_CONVERSAS, type PermissoesConversas, type EscopoConversa } from "./permissoesTypes";

interface Props {
  value: PermissoesConversas;
  disabled: boolean;
  onChange: (acao: keyof PermissoesConversas, escopo: EscopoConversa) => void;
  onAplicarTodas: (escopo: EscopoConversa) => void;
}
export default function ModalPermissoesConversas({ value, disabled, onChange, onAplicarTodas }: Props) {
  return <ModuloPermissao titulo="Conversas" descricao="Ações de atendimento e mensagens nas conexões atribuídas ao usuário."
    icon={<MessagesSquare size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "assigned", label: "Atribuídas" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas}>
    {ACOES_CONVERSAS.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
      value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_CONVERSAS} onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>;
}
