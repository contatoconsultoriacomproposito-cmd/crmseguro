import { ContactRound } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";
import { ACOES_CONTATOS, OPCOES_ESCOPO_CONTATOS, type PermissoesContatos, type EscopoContato } from "./permissoesTypes";

interface Props {
  value: PermissoesContatos;
  disabled: boolean;
  onChange: (acao: keyof PermissoesContatos, escopo: EscopoContato) => void;
  onAplicarTodas: (escopo: EscopoContato) => void;
}
export default function ModalPermissoesContatos({ value, disabled, onChange, onAplicarTodas }: Props) {
  return <ModuloPermissao titulo="Contatos" descricao="Contatos vinculados às conexões WhatsApp autorizadas."
    icon={<ContactRound size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "assigned", label: "Atribuídas" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas}>
    {ACOES_CONTATOS.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
      value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_CONTATOS} onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>;
}
