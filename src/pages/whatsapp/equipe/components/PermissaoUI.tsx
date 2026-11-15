import type { ReactNode } from "react";

export type EscopoVisual = "none" | "assigned" | "own" | "tenant";
export interface OpcaoEscopo<T extends EscopoVisual> {
  value: T;
  label: string;
  descricao?: string;
}

const BOTAO = "rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40";

export function ModuloPermissao<T extends EscopoVisual>({
  titulo, descricao, icon, iconClassName = "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  disabled = false, opcoesRapidas, onAplicarTodas, rodape, children,
}: {
  titulo: string;
  descricao: string;
  icon: ReactNode;
  iconClassName?: string;
  disabled?: boolean;
  opcoesRapidas?: Array<{ value: T; label: string }>;
  onAplicarTodas?: (escopo: T) => void;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 bg-zinc-50/80 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}>{icon}</span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{titulo}</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{descricao}</p>
            </div>
          </div>
          {opcoesRapidas && onAplicarTodas && (
            <div className="flex flex-wrap gap-2" aria-label={`Aplicar em todas as ações de ${titulo}`}>
              {opcoesRapidas.map((opcao) => (
                <button type="button" key={opcao.value} disabled={disabled} onClick={() => onAplicarTodas(opcao.value)}
                  className={`${BOTAO} ${opcao.value === "none"
                    ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>
                  {opcao.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
      {rodape && <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">{rodape}</div>}
    </section>
  );
}

export function SecaoPermissao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="border-y border-zinc-100 bg-violet-50/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-violet-800 first:border-t-0 dark:border-zinc-800 dark:bg-violet-500/5 dark:text-violet-300">{titulo}</h4>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
    </section>
  );
}

export function LinhaPermissao<T extends EscopoVisual>({
  label, descricao, value, disabled, opcoes, onChange,
}: {
  label: string;
  descricao: string;
  value: T;
  disabled: boolean;
  opcoes: Array<OpcaoEscopo<T>>;
  onChange: (escopo: T) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(230px,auto)] sm:items-center sm:gap-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{descricao}</p>
      </div>
      <div className="w-full sm:w-auto">
        <select aria-label={`${label}: escopo de acesso`} value={value} disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:hidden">
          {opcoes.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
        </select>
        <div className="hidden flex-wrap justify-end gap-1.5 sm:flex" role="group" aria-label={`Escopo: ${label}`}>
          {opcoes.map((opcao) => (
            <button key={opcao.value} type="button" aria-pressed={value === opcao.value} title={opcao.descricao}
              disabled={disabled} onClick={() => onChange(opcao.value)}
              className={`${BOTAO} ${value === opcao.value
                ? "border-violet-600 bg-violet-600 text-white shadow-sm dark:border-violet-500 dark:bg-violet-600"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
              {opcao.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
