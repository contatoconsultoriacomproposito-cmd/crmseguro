import { CalendarDays } from "lucide-react";
import { LinhaPermissao } from "./PermissaoUI";
import { OPCOES_ESCOPO_AGENDA, OPCOES_ESCOPO_AGENDA_GOOGLE, type PermissoesAgenda, type EscopoAgenda, type EscopoAgendaGoogle } from "./permissoesTypes";
interface Props {
 value: PermissoesAgenda;
 disabled: boolean;
 onChange: (acao: keyof PermissoesAgenda, escopo: EscopoAgenda | EscopoAgendaGoogle) => void;
 onAplicarOperacional: (escopo: EscopoAgenda) => void;
 onRemover: () => void;
}
export default function ModalPermissoesAgenda({ value, disabled, onChange, onAplicarOperacional, onRemover }: Props) {
 const botao = "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";
 return (
  <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
   <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
     <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"><CalendarDays size={19}/></div>
      <div><p className="font-bold text-zinc-900 dark:text-white">Agenda</p><p className="mt-0.5 text-xs text-zinc-500">Controle da agenda CRM e da integração pessoal com Google Calendar.</p></div>
     </div>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => onAplicarOperacional("own")} className={botao}>Própria agenda</button>
      <button type="button" disabled={disabled} onClick={() => onAplicarOperacional("tenant")} className={botao}>Toda corretora</button>
      <button type="button" disabled={disabled} onClick={onRemover} className={botao + " !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400"}>Remover acessos</button>
     </div>
    </div>
   </div>
   <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
    <LinhaPermissao label="Visualizar" descricao="Visualizar compromissos na agenda." value={value.read} disabled={disabled} opcoes={OPCOES_ESCOPO_AGENDA} onChange={escopo => onChange("read", escopo)}/>
    <LinhaPermissao label="Gerenciar" descricao="Criar, editar, reagendar, concluir e cancelar compromissos." value={value.manage} disabled={disabled} opcoes={OPCOES_ESCOPO_AGENDA} onChange={escopo => onChange("manage", escopo)}/>
    <LinhaPermissao label="Google Calendar" descricao="Conectar, desconectar e sincronizar somente a própria conta Google." value={value.google} disabled={disabled} opcoes={OPCOES_ESCOPO_AGENDA_GOOGLE} onChange={escopo => onChange("google", escopo)}/>
   </div>
  </div>
 );
}
