import { MessageCircle } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";

export type EscopoConexoesWhatsapp = "none" | "tenant";
export type AcaoConexoesWhatsapp = "create" | "disconnect" | "cancel";
export type PermissoesConexoesWhatsapp = Record<AcaoConexoesWhatsapp, EscopoConexoesWhatsapp>;

export const PERMISSOES_CONEXOES_WHATSAPP_PADRAO: PermissoesConexoesWhatsapp = {
  create: "none",
  disconnect: "none",
  cancel: "none",
};

/** Lê exclusivamente gestao.conexoes_whatsapp; a permissão legada manage não concede acesso. */
export function normalizarPermissoesConexoesWhatsapp(json: unknown): PermissoesConexoesWhatsapp {
  const raiz = json && typeof json === "object" && !Array.isArray(json)
    ? json as Record<string, unknown> : {};
  const gestao = raiz.gestao && typeof raiz.gestao === "object" && !Array.isArray(raiz.gestao)
    ? raiz.gestao as Record<string, unknown> : {};
  const modulo = gestao.conexoes_whatsapp && typeof gestao.conexoes_whatsapp === "object" && !Array.isArray(gestao.conexoes_whatsapp)
    ? gestao.conexoes_whatsapp as Record<string, unknown> : {};
  const escopo = (valor: unknown): EscopoConexoesWhatsapp => valor === "tenant" ? "tenant" : "none";
  return {
    create: escopo(modulo.create),
    disconnect: escopo(modulo.disconnect),
    cancel: escopo(modulo.cancel),
  };
}

const CAMPOS: Array<{ acao: AcaoConexoesWhatsapp; titulo: string; descricao: string }> = [
  {
    acao: "create",
    titulo: "Criar conexão",
    descricao: "Criar sessões, visualizar QR Code para conectar ou reconectar e gerenciar responsáveis e operadores das conexões.",
  },
  {
    acao: "disconnect",
    titulo: "Desconectar conexão",
    descricao: "Desconectar o número do WhatsApp sem cancelar a instância ou apagar seu histórico.",
  },
  {
    acao: "cancel",
    titulo: "Cancelar conexão",
    descricao: "Cancelar a instância e liberar a capacidade contratada, preservando conversas, mensagens e histórico.",
  },
];

const OPCOES: Array<{ value: EscopoConexoesWhatsapp; label: string; descricao: string }> = [
  { value: "none", label: "Sem acesso", descricao: "Ação não autorizada." },
  { value: "tenant", label: "Corretora", descricao: "Permite a ação nas conexões da própria corretora." },
];

interface Props {
  value: PermissoesConexoesWhatsapp;
  disabled?: boolean;
  onChange: (acao: AcaoConexoesWhatsapp, escopo: EscopoConexoesWhatsapp) => void;
  onAplicarTodas: (escopo: EscopoConexoesWhatsapp) => void;
}

export default function ModalPermissoesConexoesWhatsapp({
  value, disabled = false, onChange, onAplicarTodas,
}: Props) {
  return (
    <ModuloPermissao
      titulo="Conexões WhatsApp"
      descricao="Gestão de sessões corporativas com autorizações independentes para criar, desconectar e cancelar."
      icon={<MessageCircle size={21} />}
      disabled={disabled}
      opcoesRapidas={[
        { value: "tenant", label: "Liberar tudo" },
        { value: "none", label: "Remover acessos" },
      ]}
      onAplicarTodas={onAplicarTodas}
      rodape="Criar conexão também autoriza administrar responsáveis e operadores. Visualização da lista e consulta de status exigem pelo menos uma das três permissões. As permissões são restritas à própria corretora."
    >
      {CAMPOS.map(({ acao, titulo, descricao }) => (
        <LinhaPermissao
          key={acao}
          label={titulo}
          descricao={descricao}
          value={value[acao]}
          disabled={disabled}
          opcoes={OPCOES}
          onChange={(escopo) => onChange(acao, escopo)}
        />
      ))}
    </ModuloPermissao>
  );
}
