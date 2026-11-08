import type { ReactNode } from "react";
import type { EscopoContato } from "./permissoesTypes";

export function ModuloPermissao({
  titulo,
  descricao,
  icon,
  iconClassName,
  onAplicarTodas,
  mostrarTodaCorretora = true,
  children,
}: {
  titulo: string;
  descricao: string;
  icon: ReactNode;
  iconClassName: string;
  onAplicarTodas: (
    escopo: EscopoContato,
  ) => void;
  mostrarTodaCorretora?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
            >
              {icon}
            </div>

            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {titulo}
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {descricao}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onAplicarTodas(
                  "assigned",
                )
              }
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Todas atribuídas
            </button>

            {mostrarTodaCorretora && (
              <button
                type="button"
                onClick={() =>
                  onAplicarTodas(
                    "tenant",
                  )
                }
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Toda corretora
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onAplicarTodas("none")
              }
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Remover acessos
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {children}
      </div>
    </div>
  );
}

type EscopoLinhaPermissao =
  | "none"
  | "own"
  | "assigned"
  | "tenant";

export function LinhaPermissao<
  T extends EscopoLinhaPermissao,
>({
  label,
  descricao,
  value,
  disabled,
  opcoes,
  onChange,
}: {
  label: string;
  descricao: string;
  value: T;
  disabled: boolean;
  opcoes: Array<{
    value: T;
    label: string;
    descricao: string;
  }>;
  onChange: (
    escopo: T,
  ) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 p-3">
      <div>
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {descricao}
        </p>
      </div>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value as T,
          )
        }
        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
      >
        {opcoes.map(
          (opcao) => (
            <option
              key={opcao.value}
              value={opcao.value}
            >
              {opcao.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
