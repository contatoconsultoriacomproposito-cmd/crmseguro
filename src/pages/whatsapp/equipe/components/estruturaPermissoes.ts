import type { LucideIcon } from "lucide-react";
import {
  CalendarDays, ClipboardList, ContactRound, CreditCard,
  FileClock, FileText, HardDrive, Headset, HandCoins, Landmark, ListChecks,
  MessageCircle, MessagesSquare, Settings2, ShieldCheck, UsersRound, Wallet,
  Workflow, Building2,
} from "lucide-react";

export type GrupoPermissao = "atendimento" | "operacoes" | "financeiro" | "gestao";
export type ModuloPermissaoId =
  | "contatos" | "conversas" | "agenda" | "tarefas"
  | "equipe" | "clientes" | "propostas" | "renovacoes" | "comissoes" | "sinistros" | "assistencias"
  | "contas_pagar" | "contas_receber" | "fluxo_caixa" | "parcelas_clientes"
  | "conexoes_whatsapp" | "armazenamento" | "seguradoras" | "configuracoes";
export type ModuloAtivoId = Exclude<ModuloPermissaoId,
  "seguradoras" | "configuracoes">;

export interface DefinicaoModulo {
  id: ModuloPermissaoId;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  implementado: boolean;
}
export interface DefinicaoGrupo {
  id: GrupoPermissao;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  modulos: DefinicaoModulo[];
}

export const GRUPOS_PERMISSOES: DefinicaoGrupo[] = [
  {
    id: "atendimento", titulo: "Atendimento", icon: MessagesSquare,
    descricao: "Comunicação, contatos e organização do dia a dia.",
    modulos: [
      { id: "contatos", titulo: "Contatos", descricao: "Cadastros do WhatsApp", icon: ContactRound, implementado: true },
      { id: "conversas", titulo: "Conversas", descricao: "Atendimento por mensagens", icon: MessageCircle, implementado: true },
      { id: "agenda", titulo: "Agenda", descricao: "Compromissos e Google", icon: CalendarDays, implementado: true },
      { id: "tarefas", titulo: "Tarefas", descricao: "Organização de atividades", icon: ListChecks, implementado: true },
    ],
  },
  {
    id: "operacoes", titulo: "Operação", icon: Workflow,
    descricao: "Equipe, clientes e ciclo comercial de seguros.",
    modulos: [
      { id: "equipe", titulo: "Equipe", descricao: "Gestão de membros", icon: UsersRound, implementado: true },
      { id: "clientes", titulo: "Clientes", descricao: "Cliente 360° e carteira", icon: ContactRound, implementado: true },
      { id: "propostas", titulo: "Propostas", descricao: "Negociação e emissão", icon: FileText, implementado: true },
      { id: "renovacoes", titulo: "Renovações", descricao: "Carteira a renovar", icon: FileClock, implementado: true },
      { id: "comissoes", titulo: "Comissões", descricao: "Rateios e provisionamentos", icon: HandCoins, implementado: true },
      { id: "sinistros", titulo: "Sinistros", descricao: "Acompanhamento de sinistros", icon: ClipboardList, implementado: true },
      { id: "assistencias", titulo: "Assistências", descricao: "Solicitações de assistência", icon: Headset, implementado: true },
    ],
  },
  {
    id: "financeiro", titulo: "Financeiro", icon: Wallet,
    descricao: "Contas, recebimentos, fluxo e parcelas de clientes.",
    modulos: [
      { id: "contas_pagar", titulo: "Contas a pagar", descricao: "Despesas e baixas", icon: CreditCard, implementado: true },
      { id: "contas_receber", titulo: "Contas a receber", descricao: "Receitas e cobranças", icon: Landmark, implementado: true },
      { id: "fluxo_caixa", titulo: "Fluxo de caixa", descricao: "Visão consolidada", icon: ListChecks, implementado: true },
      { id: "parcelas_clientes", titulo: "Parcelas clientes", descricao: "Parcelas e recebimentos", icon: FileText, implementado: true },
    ],
  },
  {
    id: "gestao", titulo: "Gestão", icon: Settings2,
    descricao: "Conexões, infraestrutura e configurações da corretora.",
    modulos: [
      { id: "conexoes_whatsapp", titulo: "Conexões WhatsApp", descricao: "Números e sessões corporativas", icon: MessageCircle, implementado: true },
      { id: "armazenamento", titulo: "Armazenamento", descricao: "Arquivos e limites", icon: HardDrive, implementado: true },
      { id: "seguradoras", titulo: "Seguradoras", descricao: "Catálogo de seguradoras", icon: Building2, implementado: false },
      { id: "configuracoes", titulo: "Configurações", descricao: "Parâmetros da corretora", icon: ShieldCheck, implementado: false },
    ],
  },
];

export const MODULOS_ATIVOS: ModuloAtivoId[] = GRUPOS_PERMISSOES
  .flatMap(grupo => grupo.modulos)
  .filter(modulo => modulo.implementado)
  .map(modulo => modulo.id as ModuloAtivoId);

export function localizarModulo(id: ModuloPermissaoId) {
  for (const grupo of GRUPOS_PERMISSOES) {
    const modulo = grupo.modulos.find(item => item.id === id);
    if (modulo) return modulo;
  }
  return null;
}
