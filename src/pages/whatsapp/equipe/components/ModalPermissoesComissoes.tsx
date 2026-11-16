import { HandCoins } from "lucide-react";
import { LinhaPermissao, ModuloPermissao, SecaoPermissao } from "./PermissaoUI";

export type EscopoComissao = "none" | "own" | "tenant";

export type AcaoPermissaoComissao =
  | "read_own"
  | "read_full"
  | "create"
  | "update"
  | "manage_splits"
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
export default function ModalPermissoesComissoes({ value, disabled = false, onChange, onAplicarTodas }: ModalPermissoesComissoesProps) {
  const linha = (acao: DefinicaoAcao) => <LinhaPermissao key={acao.key} label={acao.label} descricao={acao.descricao}
    value={value[acao.key]} disabled={disabled} opcoes={OPCOES_ESCOPO_COMISSOES} onChange={escopo => onChange(acao.key, escopo)} />;
  return <ModuloPermissao titulo="Comissões" descricao="Cálculo, distribuição, provisões e acompanhamento. Baixas financeiras são controladas em Contas a Pagar/Receber."
    icon={<HandCoins size={21} />} disabled={disabled}
    opcoesRapidas={[{ value: "own", label: "Próprios" }, { value: "tenant", label: "Corretora" }, { value: "none", label: "Remover acessos" }]}
    onAplicarTodas={onAplicarTodas} rodape="Leitura pessoal e leitura completa são autorizações diferentes. Recebimentos e pagamentos são registrados exclusivamente no grupo Financeiro.">
    <SecaoPermissao titulo="Consulta e relatórios">{ACOES_CONSULTA.map(linha)}</SecaoPermissao>
    <SecaoPermissao titulo="Lançamentos e manutenção">{ACOES_LANCAMENTO.map(linha)}</SecaoPermissao>
    <SecaoPermissao titulo="Controle de provisões">{ACOES_PROVISOES.map(linha)}</SecaoPermissao>
  </ModuloPermissao>;
}
