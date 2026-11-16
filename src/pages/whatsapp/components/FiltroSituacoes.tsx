import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Opcao<T extends string> = { valor: T; rotulo: string };

interface FiltroSituacoesProps<T extends string> {
  selecionadas: T[];
  onChange: (selecionadas: T[]) => void;
  opcoes: readonly Opcao<T>[];
}

/** Seleção múltipla; lista vazia = todas as situações. */
export default function FiltroSituacoes<T extends string>({
  selecionadas,
  onChange,
  opcoes,
}: FiltroSituacoesProps<T>) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (evento: MouseEvent | TouchEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) setAberto(false);
    };
    const fecharEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('touchstart', fecharFora);
    document.addEventListener('keydown', fecharEscape);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('touchstart', fecharFora);
      document.removeEventListener('keydown', fecharEscape);
    };
  }, [aberto]);

  const texto = selecionadas.length === 0
    ? 'Todas as situações'
    : selecionadas.length === 1
      ? opcoes.find((opcao) => opcao.valor === selecionadas[0])?.rotulo ?? '1 situação'
      : `${selecionadas.length} situações selecionadas`;

  const alternar = (valor: T) => {
    onChange(selecionadas.includes(valor)
      ? selecionadas.filter((selecionada) => selecionada !== valor)
      : opcoes.filter((opcao) => opcao.valor === valor || selecionadas.includes(opcao.valor)).map((opcao) => opcao.valor));
  };

  return (
    <div ref={raiz} className="relative min-w-[190px]">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => setAberto((anterior) => !anterior)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        <span className="truncate">{texto}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[210px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Todas as situações
            {selecionadas.length === 0 && <Check size={15} className="text-blue-600" />}
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          {opcoes.map((opcao) => (
            <label key={opcao.valor} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={selecionadas.includes(opcao.valor)}
                onChange={() => alternar(opcao.valor)}
                className="h-4 w-4 accent-blue-600"
              />
              {opcao.rotulo}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
