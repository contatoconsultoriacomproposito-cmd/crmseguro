import { MessageCircle } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";
import { ACOES_CONTATOS, OPCOES_ESCOPO_CONTATOS, type PermissoesContatos, type EscopoContato } from "./permissoesTypes";

interface Props {
 value: PermissoesContatos;
 disabled: boolean;
 onChange: (acao: keyof PermissoesContatos, escopo: EscopoContato) => void;
 onAplicarTodas: (escopo: EscopoContato) => void;
}
export default function ModalPermissoesContatos({ value, disabled, onChange, onAplicarTodas }: Props) {
 return (
  <ModuloPermissao titulo="Contatos" descricao="Controle de acesso aos contatos vinculados às conexões WhatsApp."
   icon={<MessageCircle size={19} />} iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
   onAplicarTodas={onAplicarTodas}>
   {ACOES_CONTATOS.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
    value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_CONTATOS} onChange={escopo => onChange(acao.key, escopo)} />)}
  </ModuloPermissao>
 );
}
