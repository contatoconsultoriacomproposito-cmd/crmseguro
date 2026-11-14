import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { valoresFiltro } from "../services/filtrosComissoesUtils";

export interface OpcaoMultiSelectComissoes { value: string; label: string }
interface Props {
  label: string;
  opcoes: OpcaoMultiSelectComissoes[];
  value?: string | string[];
  onChange: (novasSelecoes: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Dropdown multisseleção com checkboxes; não usa <select multiple>. */
export function MultiSelectComissoes({
  label, opcoes, value, onChange, placeholder = "Todas", disabled = false,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  const selecionados = valoresFiltro(value);
  const selecionadosSet = new Set(selecionados);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (event: PointerEvent) => {
      if (!caixa.current?.contains(event.target as Node)) setAberto(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", fechar);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fechar);
      document.removeEventListener("keydown", escape);
    };
  }, [aberto]);

  const opcoesVisiveis = useMemo(() => {
    const texto = busca.trim().toLocaleLowerCase("pt-BR");
    return opcoes.filter((opcao) =>
      !texto || opcao.label.toLocaleLowerCase("pt-BR").includes(texto)
    );
  }, [busca, opcoes]);

  const texto = selecionados.length === 0
    ? placeholder
    : selecionados.length === 1
      ? (opcoes.find((opcao) => opcao.value === selecionados[0])?.label ?? "1 selecionado")
      : `${selecionados.length} selecionados`;

  return (
    <div ref={caixa} className="relative min-w-0">
      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
        className={`flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm outline-none transition disabled:opacity-60 dark:bg-slate-950 ${aberto ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950" : "border-slate-200 dark:border-slate-800"}`}>
        <span className={`truncate ${selecionados.length ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>{texto}</span>
        <span className="flex shrink-0 items-center gap-1">
          {selecionados.length > 0 && <span className="rounded-md bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{selecionados.length}</span>}
          <ChevronDown size={15} className={`text-slate-500 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </span>
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[230px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {opcoes.length > 6 && (
            <div className="relative border-b border-slate-100 p-2 dark:border-slate-800">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar opções..." className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <button type="button" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              onClick={() => onChange(Array.from(new Set([...selecionados, ...opcoesVisiveis.map((op) => op.value)])))}>Marcar todos</button>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600" onClick={() => onChange([])}><X size={12} /> Limpar</button>
          </div>
          <div role="listbox" aria-multiselectable="true" className="max-h-60 overflow-y-auto py-1">
            {opcoesVisiveis.length === 0 && <div className="px-3 py-3 text-xs text-slate-500">Nenhuma opção encontrada.</div>}
            {opcoesVisiveis.map((opcao) => {
              const marcado = selecionadosSet.has(opcao.value);
              return <button type="button" role="option" aria-selected={marcado} key={opcao.value}
                onClick={() => onChange(marcado ? selecionados.filter((id) => id !== opcao.value) : [...selecionados, opcao.value])}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${marcado ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                  {marcado && <Check size={12} />}
                </span>
                <span className="truncate">{opcao.label}</span>
              </button>;
            })}
          </div>
          <div className="border-t border-slate-100 p-2 text-right dark:border-slate-800">
            <button type="button" onClick={() => setAberto(false)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Concluir</button>
          </div>
        </div>
      )}
    </div>
  );
}
