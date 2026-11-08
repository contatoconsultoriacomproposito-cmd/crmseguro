import { UsersRound } from "lucide-react";
import { LinhaPermissao } from "./PermissaoUI";
import { ACOES_EQUIPE, OPCOES_ESCOPO_EQUIPE, type EscopoEquipe, type PermissoesEquipe } from "./permissoesTypes";
interface Props {
 value: PermissoesEquipe;
 disabled: boolean;
 onChange: (acao: keyof PermissoesEquipe, escopo: EscopoEquipe) => void;
 onAplicarTodas: (escopo: EscopoEquipe) => void;
}
export default function ModalPermissoesEquipe({ value, disabled, onChange, onAplicarTodas }: Props) {
 const botao = "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";
 return (
  <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
   <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
     <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"><UsersRound size={19}/></div>
      <div><p className="font-bold text-zinc-900 dark:text-white">Equipe</p><p className="mt-0.5 text-xs text-zinc-500">Administração dos membros vinculados à corretora.</p></div>
     </div>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => onAplicarTodas("tenant")} className={botao}>Toda corretora</button>
      <button type="button" disabled={disabled} onClick={() => onAplicarTodas("none")} className={botao + " !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400"}>Remover acessos</button>
     </div>
    </div>
   </div>
   <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
    {ACOES_EQUIPE.map(acao => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao} value={value[acao.key]}
     disabled={disabled} opcoes={OPCOES_ESCOPO_EQUIPE} onChange={escopo => onChange(acao.key, escopo)}/>) }
   </div>
  </div>
 );
}
