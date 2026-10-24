import type { StatusProposta } from "../types/propostas";

interface PropostaStatusBadgeProps {
  status: StatusProposta;
  className?: string;
}

const CONFIG: Record<
  StatusProposta,
  { label: string; classes: string }
> = {
  EM_NEGOCIACAO: {
    label: "Em negociação",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  VENDIDA: {
    label: "Vendida",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  PERDIDA: {
    label: "Perdida",
    classes:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  },
  CANCELADA: {
    label: "Cancelada",
    classes:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

export default function PropostaStatusBadge({
  status,
  className = "",
}: PropostaStatusBadgeProps) {
  const config = CONFIG[status] ?? {
    label: status,
    classes:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}