import { CalendarDays } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";
import { OPCOES_ESCOPO_AGENDA, OPCOES_ESCOPO_AGENDA_GOOGLE, type PermissoesAgenda, type EscopoAgenda, type EscopoAgendaGoogle } from "./permissoesTypes";
interface Props {
  value: PermissoesAgenda;
  disabled: boolean;
  onChange: (acao: keyof PermissoesAgenda, escopo: EscopoAgenda | EscopoAgendaGoogle) => void;
  onAplicarOperacional: (escopo: EscopoAgenda) => void;
  onRemover: () => void;
}
export default function ModalPermissoesAgenda({ value, disabled, onChange, onAplicarOperacional, onRemover }: Props) {
  return <ModuloPermissao titulo="Agenda" descricao="Compromissos do CRM e integração pessoal do Google Calendar."
    icon={<CalendarDays size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Própria agenda" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={escopo => escopo === "none" ? onRemover() : onAplicarOperacional(escopo)}
    rodape="Os atalhos Própria agenda e Corretora alteram somente Visualizar e Gerenciar; Google Calendar é sempre uma permissão independente.">
    <LinhaPermissao label="Visualizar" descricao="Visualizar compromissos na agenda." value={value.read} disabled={disabled} opcoes={OPCOES_ESCOPO_AGENDA} onChange={escopo => onChange("read", escopo)} />
    <LinhaPermissao label="Gerenciar" descricao="Criar, editar, reagendar, concluir e cancelar compromissos." value={value.manage} disabled={disabled} opcoes={OPCOES_ESCOPO_AGENDA} onChange={escopo => onChange("manage", escopo)} />
    <LinhaPermissao label="Google Calendar" descricao="Conectar, desconectar e sincronizar apenas a própria conta Google." value={value.google} disabled={disabled} opcoes={OPCOES_ESCOPO_AGENDA_GOOGLE} onChange={escopo => onChange("google", escopo)} />
  </ModuloPermissao>;
}
