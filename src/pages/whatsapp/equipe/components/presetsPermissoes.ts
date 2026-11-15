import { normalizarAtivas, type PermissoesAtivas } from "./permissoesEstado";

/** Presets locais e SUGESTIVOS: nunca acionam a Edge Function automaticamente. */
export type CargoPreset = "CORRETOR" | "ATENDIMENTO" | "COMERCIAL" | "FINANCEIRO" | "ADMINISTRATIVO" | "OUTRO";
export const CARGOS_PRESET: Array<{ value: CargoPreset; label: string; descricao: string }> = [
  { value: "CORRETOR", label: "Corretor", descricao: "Carteira própria, propostas e atendimento comercial básico." },
  { value: "ATENDIMENTO", label: "Atendimento", descricao: "Conversas e contatos atribuídos, agenda e consulta básica." },
  { value: "COMERCIAL", label: "Comercial", descricao: "Clientes e negociações da carteira própria, sem exclusões." },
  { value: "FINANCEIRO", label: "Financeiro", descricao: "Consulta controlada de comissões; novas rotinas financeiras ainda pendentes." },
  { value: "ADMINISTRATIVO", label: "Administrativo", descricao: "Visão operacional da corretora, sem poderes de exclusão ou gestão de acessos." },
  { value: "OUTRO", label: "Outros", descricao: "Base sem acessos; personalizar individualmente." },
];

/**
 * Princípio do menor privilégio: os presets NÃO concedem exclusões, alteração de
 * senhas, administração de permissões, pagamentos, estornos ou emissão de apólices.
 * Nunca incluem módulos ainda não implementados.
 */
export function construirPreset(cargo: CargoPreset): PermissoesAtivas {
  const base = normalizarAtivas({});
  if (cargo === "OUTRO") return base;

  if (cargo === "CORRETOR") {
    base.contatos = { ...base.contatos, read: "assigned", create: "assigned", update: "assigned", send: "assigned" };
    base.conversas = { ...base.conversas, read: "assigned", start: "assigned", interact: "assigned" };
    base.agenda = { read: "own", manage: "own", google: "own" };
    base.tarefas = { read: "own", create: "own", update: "own", delete: "none" };
    base.clientes = { ...base.clientes, read: "own", create: "own", open: "own", view_cadastro: "own", view_agenda: "own", view_propostas: "own", view_contratos: "own", view_sinistros: "own", view_assistencias: "own", view_arquivos: "own", update: "own", whatsapp: "own" };
    base.propostas = { ...base.propostas, read: "own", create: "own", update: "own", renew: "own" };
    base.renovacoes = { read: "own", export: "none" };
    base.comissoes = { ...base.comissoes, read_own: "own" };
    base.sinistros = { ...base.sinistros, read: "own", create: "own", update: "own" };
    base.assistencias = { ...base.assistencias, read: "own", create: "own", update: "own" };
  } else if (cargo === "ATENDIMENTO") {
    base.contatos = { ...base.contatos, read: "assigned", create: "assigned", update: "assigned", send: "assigned" };
    base.conversas = { ...base.conversas, read: "assigned", start: "assigned", interact: "assigned", manage: "assigned" };
    base.agenda = { read: "own", manage: "own", google: "none" };
    base.tarefas = { read: "own", create: "own", update: "own", delete: "none" };
    base.clientes = { ...base.clientes, read: "own", open: "own", view_cadastro: "own", view_agenda: "own", whatsapp: "own" };
  } else if (cargo === "COMERCIAL") {
    base.contatos = { ...base.contatos, read: "assigned", create: "assigned", send: "assigned" };
    base.conversas = { ...base.conversas, read: "assigned", start: "assigned", interact: "assigned" };
    base.agenda = { read: "own", manage: "own", google: "none" };
    base.tarefas = { read: "own", create: "own", update: "own", delete: "none" };
    base.clientes = { ...base.clientes, read: "own", create: "own", open: "own", view_cadastro: "own", view_propostas: "own", view_contratos: "own", update: "own", whatsapp: "own" };
    base.propostas = { ...base.propostas, read: "own", create: "own", update: "own", lose: "own", renew: "own" };
    base.renovacoes = { read: "own", export: "none" };
  } else if (cargo === "FINANCEIRO") {
    base.comissoes = { ...base.comissoes, read_own: "own", read_full: "own", report: "own" };
    base.clientes = { ...base.clientes, read: "own", open: "own", view_financeiro: "own" };
  } else if (cargo === "ADMINISTRATIVO") {
    base.agenda = { read: "tenant", manage: "none", google: "none" };
    base.clientes = { ...base.clientes, read: "tenant", open: "tenant", view_cadastro: "tenant", view_agenda: "tenant", view_propostas: "tenant", view_contratos: "tenant" };
    base.propostas = { ...base.propostas, read: "tenant" };
    base.renovacoes = { read: "tenant", export: "none" };
    base.sinistros = { ...base.sinistros, read: "tenant" };
    base.assistencias = { ...base.assistencias, read: "tenant" };
  }
  return base;
}
