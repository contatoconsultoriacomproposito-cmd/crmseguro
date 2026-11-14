import { FileClock, ShieldCheck } from "lucide-react";

export type EscopoRenovacao = "none" | "own" | "tenant";
export type AcaoPermissaoRenovacao = "read" | "export";
export type PermissoesRenovacoes = Record<AcaoPermissaoRenovacao, EscopoRenovacao>;

export const PERMISSOES_RENOVACOES_PADRAO: PermissoesRenovacoes = {
  read: "none",
  export: "none",
};

export function normalizarPermissoesRenovacoes(json: unknown): PermissoesRenovacoes {
  const root = json && typeof json === "object" && !Array.isArray(json)
    ? json as Record<string, unknown> : {};
  const operacoes = root.operacoes && typeof root.operacoes === "object" && !Array.isArray(root.operacoes)
    ? root.operacoes as Record<string, unknown> : {};
  const modulo = operacoes.renovacoes && typeof operacoes.renovacoes === "object" && !Array.isArray(operacoes.renovacoes)
    ? operacoes.renovacoes as Record<string, unknown> : {};
  const validar = (v: unknown): EscopoRenovacao =>
    v === "own" || v === "tenant" ? v : "none";
  return { read: validar(modulo.read), export: validar(modulo.export) };
}

const CAMPOS: { acao: AcaoPermissaoRenovacao; titulo: string; descricao: string }[] = [
  { acao: "read", titulo: "Visualizar renovações", descricao: "Consultar a carteira, filtros, contratos e valores agregados por produto." },
  { acao: "export", titulo: "Exportar relatório PDF", descricao: "Gerar o relatório somente dos contratos autorizados também para leitura." },
];

export default function ModalPermissoesRenovacoes({
  value, disabled = false, onChange, onAplicarTodas,
}: {
  value: PermissoesRenovacoes;
  disabled?: boolean;
  onChange: (acao: AcaoPermissaoRenovacao, escopo: EscopoRenovacao) => void;
  onAplicarTodas: (escopo: EscopoRenovacao) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <FileClock size={17} className="text-teal-600" />
          <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Renovações</h4>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["none", "own", "tenant"] as const).map((escopo) => (
            <button key={escopo} type="button" disabled={disabled} onClick={() => onAplicarTodas(escopo)}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              {escopo === "none" ? "Remover" : escopo === "own" ? "Somente próprias" : "Toda corretora"}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {CAMPOS.map(({ acao, titulo, descricao }) => (
          <div key={acao} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={15} className="text-zinc-400" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{titulo}</span>
            </div>
            <p className="mb-3 text-xs text-zinc-500">{descricao}</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={titulo}>
              {(["none", "own", "tenant"] as const).map((escopo) => (
                <button key={escopo} type="button" disabled={disabled} onClick={() => onChange(acao, escopo)}
                  aria-pressed={value[acao] === escopo}
                  className={`rounded-lg border px-2 py-2 text-xs font-bold transition disabled:opacity-40 ${value[acao] === escopo
                    ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}>
                  {escopo === "none" ? "Sem acesso" : escopo === "own" ? "Próprias" : "Corretora"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-zinc-100 p-3 text-[11px] text-zinc-500 dark:border-zinc-800">
        A exportação nunca amplia o alcance de leitura. Alterar aqui não modifica as permissões de Propostas.
      </p>
    </div>
  );
}
