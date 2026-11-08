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
 return (
  <ModuloPermissao titulo="Conversas" descricao="Controle das ações próprias do módulo de conversas e atendimento WhatsApp."
   icon={<MessagesSquare size={19} />} iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
   onAplicarTodas={escopo => onAplicarTodas(escopo === "assigned" ? "assigned" : "none")}
   mostrarTodaCorretora={false}>
   {ACOES_CONVERSAS.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
    value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_CONVERSAS} onChange={escopo => onChange(acao.key, escopo === "assigned" ? "assigned" : "none")} />)}
  </ModuloPermissao>
 );
}
