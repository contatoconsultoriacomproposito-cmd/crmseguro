import {
  normalizarPermissoesAgenda, normalizarPermissoesContatos, normalizarPermissoesConversas,
  normalizarPermissoesEquipe, normalizarPermissoesPropostas,
  type PermissoesAgenda, type PermissoesContatos, type PermissoesConversas,
  type PermissoesEquipe, type PermissoesPropostas,
} from "./permissoesTypes";
import {
  normalizarPermissoesRenovacoes, type PermissoesRenovacoes,
} from "./ModalPermissoesRenovacoes";
import { normalizarPermissoesClientes, type PermissoesClientes } from "./ModalPermissoesClientes";
import { normalizarPermissoesComissoes, type PermissoesComissoes } from "./ModalPermissoesComissoes";
import { normalizarPermissoesSinistro, type PermissoesSinistro } from "./ModalPermissoesSinistro";
import { normalizarPermissoesAssistencia, type PermissoesAssistencia } from "./ModalPermissoesAssistencia";
import { normalizarPermissoesTarefas, type PermissoesTarefas } from "./ModalPermissoesTarefas";
import { normalizarPermissoesContasPagar, type PermissoesContasPagar } from "./ModalPermissoesContasPagar";
import { normalizarPermissoesContasReceber, type PermissoesContasReceber } from "./ModalPermissoesContasReceber";
import { normalizarPermissoesFluxoCaixa, type PermissoesFluxoCaixa } from "./ModalPermissoesFluxoCaixa";
import { normalizarPermissoesParcelasClientes, type PermissoesParcelasClientes } from "./ModalPermissoesParcelasClientes";
import { normalizarPermissoesConexoesWhatsapp, type PermissoesConexoesWhatsapp } from "./ModalPermissoesConexoesWhatsapp";
import { MODULOS_ATIVOS, type ModuloAtivoId } from "./estruturaPermissoes";

export interface PermissoesAtivas {
  contatos: PermissoesContatos;
  conversas: PermissoesConversas;
  agenda: PermissoesAgenda;
  tarefas: PermissoesTarefas;
  equipe: PermissoesEquipe;
  clientes: PermissoesClientes;
  propostas: PermissoesPropostas;
  renovacoes: PermissoesRenovacoes;
  comissoes: PermissoesComissoes;
  contas_pagar: PermissoesContasPagar;
  contas_receber: PermissoesContasReceber;
  fluxo_caixa: PermissoesFluxoCaixa;
  parcelas_clientes: PermissoesParcelasClientes;
  sinistros: PermissoesSinistro;
  assistencias: PermissoesAssistencia;
  conexoes_whatsapp: PermissoesConexoesWhatsapp;
}
export type EscopoAtivo = "none" | "assigned" | "own" | "tenant";

export function normalizarAtivas(json: unknown): PermissoesAtivas {
  return {
    contatos: normalizarPermissoesContatos(json),
    conversas: normalizarPermissoesConversas(json),
    agenda: normalizarPermissoesAgenda(json),
    tarefas: normalizarPermissoesTarefas(json),
    equipe: normalizarPermissoesEquipe(json),
    clientes: normalizarPermissoesClientes(json),
    propostas: normalizarPermissoesPropostas(json),
    renovacoes: normalizarPermissoesRenovacoes(json),
    comissoes: normalizarPermissoesComissoes(json),
    contas_pagar: normalizarPermissoesContasPagar(json),
    contas_receber: normalizarPermissoesContasReceber(json),
    fluxo_caixa: normalizarPermissoesFluxoCaixa(json),
    parcelas_clientes: normalizarPermissoesParcelasClientes(json),
    sinistros: normalizarPermissoesSinistro(json),
    assistencias: normalizarPermissoesAssistencia(json),
    conexoes_whatsapp: normalizarPermissoesConexoesWhatsapp(json),
  };
}

export function atualizarModulo<K extends ModuloAtivoId>(
  estado: PermissoesAtivas, modulo: K, proximo: PermissoesAtivas[K],
): PermissoesAtivas {
  return { ...estado, [modulo]: proximo };
}

const GRUPO_DO_MODULO: Record<ModuloAtivoId, "atendimento" | "operacoes" | "financeiro" | "gestao"> = {
  contatos: "atendimento", conversas: "atendimento", agenda: "atendimento", tarefas: "atendimento",
  equipe: "operacoes", clientes: "operacoes", propostas: "operacoes",
  renovacoes: "operacoes", comissoes: "operacoes", sinistros: "operacoes", assistencias: "operacoes",
  contas_pagar: "financeiro", contas_receber: "financeiro", fluxo_caixa: "financeiro", parcelas_clientes: "financeiro",
  conexoes_whatsapp: "gestao",
};

export type Diferenca = {
  modulo: ModuloAtivoId;
  acao: string;
  anterior: string;
  proximo: string;
};

export function compararPermissoes(origem: PermissoesAtivas, destino: PermissoesAtivas): Diferenca[] {
  const diferencas: Diferenca[] = [];
  for (const modulo of MODULOS_ATIVOS) {
    const antes = origem[modulo] as unknown as Record<string, string>;
    const depois = destino[modulo] as unknown as Record<string, string>;
    for (const chave of Object.keys(depois)) {
      if (antes[chave] !== depois[chave]) {
        diferencas.push({ modulo, acao: chave, anterior: antes[chave], proximo: depois[chave] });
      }
    }
  }
  return diferencas;
}

/** Atualiza APENAS as ações alteradas. O backend mescla as ações em seu JSON atual. */
export function criarPayloadParcial(diferencas: Diferenca[]) {
  const resultado: Record<string, Record<string, Record<string, string>>> = {};
  for (const diferenca of diferencas) {
    const grupo = GRUPO_DO_MODULO[diferenca.modulo];
    resultado[grupo] ??= {};
    resultado[grupo][diferenca.modulo] ??= {};
    resultado[grupo][diferenca.modulo][diferenca.acao] = diferenca.proximo;
  }
  return resultado;
}

export function contarConcedidas(estado: PermissoesAtivas): number {
  let total = 0;
  for (const modulo of MODULOS_ATIVOS) {
    const acoes = estado[modulo] as unknown as Record<string, string>;
    for (const escopo of Object.values(acoes)) if (escopo !== "none") total++;
  }
  return total;
}

export function permissoesCriticas(diferencas: Diferenca[]): number {
  const sensiveis = new Set(["delete", "delete_cascade", "permissions", "password", "reverse", "reverse_receive", "reverse_pay", "pay", "receive", "manage_splits", "issue", "close", "financial", "commissions"]);
  return diferencas.filter(({ acao, proximo, anterior }) =>
    proximo !== "none" && proximo !== anterior && (proximo === "tenant" || sensiveis.has(acao))).length;
}
