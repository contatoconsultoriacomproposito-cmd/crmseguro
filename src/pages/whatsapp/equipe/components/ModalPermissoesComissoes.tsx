import { Banknote, ChartNoAxesCombined, FileText, HandCoins, ShieldCheck } from "lucide-react";
import { LinhaPermissao } from "./PermissaoUI";

export type EscopoComissao = "none" | "own" | "tenant";

export type AcaoPermissaoComissao =
  | "read_own"
  | "read_full"
  | "create"
  | "update"
  | "manage_splits"
  | "receive"
  | "reverse_receive"
  | "pay"
  | "reverse_pay"
  | "cancel_provision"
  | "restore_provision"
  | "report";

export type PermissoesComissoes = Record<AcaoPermissaoComissao, EscopoComissao>;

export const PERMISSOES_COMISSOES_PADRAO: PermissoesComissoes = {
  read_own: "none",
  read_full: "none",
  create: "none",
  update: "none",
  manage_splits: "none",
  receive: "none",
  reverse_receive: "none",
  pay: "none",
  reverse_pay: "none",
  cancel_provision: "none",
  restore_provision: "none",
  report: "none",
};

const OPCOES_ESCOPO_COMISSOES: {
  value: EscopoComissao;
  label: string;
  descricao: string;
}[] = [
  { value: "none", label: "Sem acesso", descricao: "Operação não autorizada" },
  { value: "own", label: "Próprios", descricao: "Apenas registros autorizados do usuário" },
  { value: "tenant", label: "Toda corretora", descricao: "Registros da corretora" },
];

type DefinicaoAcao = {
  key: AcaoPermissaoComissao;
  label: string;
  descricao: string;
};

const ACOES_CONSULTA: DefinicaoAcao[] = [
  {
    key: "read_own",
    label: "Visualizar minhas comissões",
    descricao: "Consultar somente a própria participação nos rateios, inclusive em contratos de outros responsáveis. O escopo 'Próprios' é o adequado para essa visão pessoal.",
  },
  {
    key: "read_full",
    label: "Visualizar comissão completa",
    descricao: "Consultar comissão bruta, deduções, rateios, provisões, recebimentos e pagamentos. 'Próprios' = contratos sob responsabilidade do usuário; 'Toda corretora' = todos os contratos da corretora.",
  },
  {
    key: "report",
    label: "Gerar relatório",
    descricao: "Exportar relatórios somente com informações permitidas pelas autorizações de leitura. Esta permissão não amplia a visibilidade financeira.",
  },
];

const ACOES_LANCAMENTO: DefinicaoAcao[] = [
  {
    key: "create",
    label: "Lançar comissão",
    descricao: "Registrar comissão em Proposta Detalhes. Depende também da autorização necessária para acessar a proposta.",
  },
  {
    key: "update",
    label: "Editar comissão",
    descricao: "Alterar parâmetros, percentuais, condições e provisões da comissão, sem conceder automaticamente a gestão dos rateios.",
  },
  {
    key: "manage_splits",
    label: "Gerenciar rateios",
    descricao: "Adicionar, remover ou alterar participantes, participações e deduções individuais.",
  },
];

const ACOES_FINANCEIRAS: DefinicaoAcao[] = [
  {
    key: "receive",
    label: "Baixar comissão recebida",
    descricao: "Registrar o recebimento de comissão pela corretora, pago pela seguradora.",
  },
  {
    key: "reverse_receive",
    label: "Estornar recebimento",
    descricao: "Estornar uma baixa de recebimento previamente registrada.",
  },
  {
    key: "pay",
    label: "Baixar comissão paga",
    descricao: "Liquidar pagamento a participante pelo fluxo integrado ao Contas a Pagar, sem gerar baixa duplicada.",
  },
  {
    key: "reverse_pay",
    label: "Estornar pagamento",
    descricao: "Estornar uma baixa de pagamento pelo mesmo fluxo financeiro integrado.",
  },
];

const ACOES_PROVISOES: DefinicaoAcao[] = [
  {
    key: "cancel_provision",
    label: "Cancelar provisão",
    descricao: "Cancelar uma provisão individual de recebimento ou pagamento; não cancela a comissão inteira.",
  },
  {
    key: "restore_provision",
    label: "Reverter cancelamento",
    descricao: "Reativar uma provisão individual anteriormente cancelada.",
  },
];

export function normalizarPermissoesComissoes(json: unknown): PermissoesComissoes {
  const raiz = json && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : {};
  const operacoes = raiz.operacoes && typeof raiz.operacoes === "object" && !Array.isArray(raiz.operacoes)
    ? (raiz.operacoes as Record<string, unknown>)
    : {};
  const comissoes = operacoes.comissoes && typeof operacoes.comissoes === "object" && !Array.isArray(operacoes.comissoes)
    ? (operacoes.comissoes as Record<string, unknown>)
    : {};

  const resultado = { ...PERMISSOES_COMISSOES_PADRAO };
  for (const acao of Object.keys(resultado) as AcaoPermissaoComissao[]) {
    const valor = comissoes[acao];
    if (valor === "none" || valor === "own" || valor === "tenant") {
      resultado[acao] = valor;
    }
  }
  return resultado;
}

export interface ModalPermissoesComissoesProps {
  value: PermissoesComissoes;
  disabled?: boolean;
  onChange: (acao: AcaoPermissaoComissao, escopo: EscopoComissao) => void;
  onAplicarTodas: (escopo: EscopoComissao) => void;
}

export default function ModalPermissoesComissoes({
  value,
  disabled = false,
  onChange,
  onAplicarTodas,
}: ModalPermissoesComissoesProps) {
  const botao = "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

  const renderizarLinha = (acao: DefinicaoAcao) => (
    <LinhaPermissao
      key={acao.key}
      label={acao.label}
      descricao={acao.descricao}
      value={value[acao.key]}
      disabled={disabled}
      opcoes={OPCOES_ESCOPO_COMISSOES}
      onChange={(escopo) => onChange(acao.key, escopo as EscopoComissao)}
    />
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <HandCoins size={19} />
            </div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">Comissões</p>
              <p className="mt-0.5 text-xs text-zinc-500">Visibilidade financeira, lançamentos, rateios, baixas e provisões.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => onAplicarTodas("own")} className={botao}>Próprios</button>
            <button type="button" disabled={disabled} onClick={() => onAplicarTodas("tenant")} className={botao}>Toda corretora</button>
            <button type="button" disabled={disabled} onClick={() => onAplicarTodas("none")} className={botao + " !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400"}>Remover acessos</button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div>
          <div className="flex items-center gap-2 bg-emerald-50/50 px-4 py-3 dark:bg-emerald-500/5">
            <ChartNoAxesCombined size={17} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Consulta e relatórios</span>
          </div>
          {ACOES_CONSULTA.map(renderizarLinha)}
        </div>
        <div>
          <div className="flex items-center gap-2 bg-emerald-50/50 px-4 py-3 dark:bg-emerald-500/5">
            <FileText size={17} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Lançamento e manutenção</span>
          </div>
          {ACOES_LANCAMENTO.map(renderizarLinha)}
        </div>
        <div>
          <div className="flex items-center gap-2 bg-emerald-50/50 px-4 py-3 dark:bg-emerald-500/5">
            <Banknote size={17} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Recebimentos e pagamentos</span>
          </div>
          {ACOES_FINANCEIRAS.map(renderizarLinha)}
        </div>
        <div>
          <div className="flex items-center gap-2 bg-emerald-50/50 px-4 py-3 dark:bg-emerald-500/5">
            <ShieldCheck size={17} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Controle de provisões</span>
          </div>
          {ACOES_PROVISOES.map(renderizarLinha)}
        </div>
      </div>
      <p className="border-t border-zinc-100 px-4 py-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        As permissões são independentes. A visão pessoal mostra somente a participação do usuário; a visão completa pode mostrar valores de outros participantes conforme o escopo. Baixas de pagamentos e estornos devem respeitar a integração com Contas a Pagar.
      </p>
    </section>
  );
}
