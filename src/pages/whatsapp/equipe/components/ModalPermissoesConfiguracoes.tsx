import {
  Building2,
  Globe,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export default function ModalPermissoesConfiguracoes() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Configurações da Corretora
            </h3>

            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Este módulo possui acesso administrativo protegido
              pelas regras de segurança do SeguroCRM.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <LockKeyhole size={17} />
            Acesso restrito
          </div>

          <p className="mt-2 text-sm leading-6 text-emerald-800/90 dark:text-emerald-300/90">
            Atualmente, somente usuários com perfil CORRETORA
            ou ADMIN podem acessar as configurações da corretora.
            Essa autorização não pode ser alterada pelo
            cadastro de permissões da equipe.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Building2
            size={20}
            className="text-violet-600"
          />

          <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
            Dados da corretora
          </h4>

          <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Administração das informações institucionais,
            cadastrais e configurações da corretora.
          </p>

          <span className="mt-3 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Acesso administrativo
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Globe
            size={20}
            className="text-violet-600"
          />

          <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
            Gestão do site
          </h4>

          <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Futuramente, poderá ser disponibilizada uma
            permissão específica para que membros autorizados
            gerenciem conteúdos do site da corretora.
          </p>

          <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
            Permissão futura
          </span>
        </div>
      </div>

      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Nenhuma alteração de acesso é realizada nesta seção.
        As regras administrativas são aplicadas diretamente
        pelo sistema e pelo banco de dados.
      </p>
    </div>
  );
}