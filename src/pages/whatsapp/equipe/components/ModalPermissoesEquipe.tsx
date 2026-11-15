import { UsersRound } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";
import { ACOES_EQUIPE, OPCOES_ESCOPO_EQUIPE, type EscopoEquipe, type PermissoesEquipe } from "./permissoesTypes";
interface Props {
  value: PermissoesEquipe;
  disabled: boolean;
  onChange: (acao: keyof PermissoesEquipe, escopo: EscopoEquipe) => void;
  onAplicarTodas: (escopo: EscopoEquipe) => void;
}
export default function ModalPermissoesEquipe({ value, disabled, onChange, onAplicarTodas }: Props) {
  return <ModuloPermissao titulo="Equipe" descricao="Administração de membros, senhas e permissões da própria corretora."
    icon={<UsersRound size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas} rodape="Equipe aceita apenas Sem acesso ou Toda corretora; o escopo Próprios não se aplica à gestão de outros membros.">
    {ACOES_EQUIPE.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
      value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_EQUIPE} onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>;
}
