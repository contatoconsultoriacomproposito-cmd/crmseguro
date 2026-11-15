import { Clock3, LockKeyhole, type LucideIcon } from "lucide-react";

export default function ModuloPermissaoPlanejado({ titulo, descricao, icon: Icon }: {
  titulo: string;
  descricao: string;
  icon: LucideIcon;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/30">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"><Icon size={22}/></span>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">{titulo}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{descricao}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><Clock3 size={14}/> Em preparação</span>
        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Estrutura visual pronta para a próxima etapa</h4>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          As ações, os escopos e as regras de segurança deste módulo ainda não foram implementados e homologados.
          Por isso, nenhuma permissão pode ser concedida ou gravada aqui nesta etapa.
        </p>
        <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
          <LockKeyhole size={17} className="mt-0.5 shrink-0" />
          Quando o módulo estiver pronto, este componente receberá as ações reais, os escopos, a persistência e a proteção RLS/RPC correspondente — sem alterar os módulos já homologados.
        </div>
      </div>
    </section>
  );
}
