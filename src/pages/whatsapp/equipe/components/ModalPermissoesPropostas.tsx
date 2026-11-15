import { FileText } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";
import { ACOES_PROPOSTAS, OPCOES_ESCOPO_PROPOSTAS, type EscopoProposta, type PermissoesPropostas } from "./permissoesTypes";
interface Props {
  value: PermissoesPropostas;
  disabled: boolean;
  onChange: (acao: keyof PermissoesPropostas, escopo: EscopoProposta) => void;
  onAplicarTodas: (escopo: EscopoProposta) => void;
}
export default function ModalPermissoesPropostas({ value, disabled, onChange, onAplicarTodas }: Props) {
  return <ModuloPermissao titulo="Propostas" descricao="Fluxo comercial, vendas, emissão, correções e ações vinculadas às propostas."
    icon={<FileText size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Próprias" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas} rodape="As ações são independentes. Conceder leitura não concede automaticamente emissão, fechamento ou lançamento financeiro.">
    {ACOES_PROPOSTAS.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
      value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_PROPOSTAS} onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>;
}
