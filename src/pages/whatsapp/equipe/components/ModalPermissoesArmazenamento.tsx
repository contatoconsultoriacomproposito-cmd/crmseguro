import { HardDrive } from "lucide-react";
import { LinhaPermissao, ModuloPermissao } from "./PermissaoUI";

export type EscopoArmazenamento = "none" | "own" | "tenant";
export type AcaoArmazenamento = "read" | "view" | "download" | "delete";
export type PermissoesArmazenamento = Record<AcaoArmazenamento, EscopoArmazenamento>;

export const PERMISSOES_ARMAZENAMENTO_PADRAO: PermissoesArmazenamento = {
  read: "none", view: "none", download: "none", delete: "none",
};

/** Escopos exclusivamente do caminho gestao.armazenamento (sem permissões implícitas). */
export function normalizarPermissoesArmazenamento(json: unknown): PermissoesArmazenamento {
  const raiz = json && typeof json === "object" && !Array.isArray(json)
    ? json as Record<string, unknown> : {};
  const gestao = raiz.gestao && typeof raiz.gestao === "object" && !Array.isArray(raiz.gestao)
    ? raiz.gestao as Record<string, unknown> : {};
  const modulo = gestao.armazenamento && typeof gestao.armazenamento === "object" && !Array.isArray(gestao.armazenamento)
    ? gestao.armazenamento as Record<string, unknown> : {};
  const escopo = (valor: unknown): EscopoArmazenamento =>
    valor === "own" || valor === "tenant" ? valor : "none";
  return {
    read: escopo(modulo.read),
    view: escopo(modulo.view),
    download: escopo(modulo.download),
    delete: escopo(modulo.delete),
  };
}

const CAMPOS: Array<{ acao: AcaoArmazenamento; titulo: string; descricao: string }> = [
  { acao: "read", titulo: "Consultar armazenamento", descricao: "Acessar a Central, pesquisar e listar arquivos e seus metadados dentro do escopo permitido." },
  { acao: "view", titulo: "Visualizar arquivos", descricao: "Abrir arquivos autorizados para consulta, sem conceder permissão de exclusão." },
  { acao: "download", titulo: "Baixar arquivos", descricao: "Gerar acesso para download dos arquivos autorizados." },
  { acao: "delete", titulo: "Excluir arquivos", descricao: "Excluir arquivos autorizados, inclusive pela seleção múltipla, removendo todas as versões do armazenamento." },
];

const OPCOES: Array<{ value: EscopoArmazenamento; label: string; descricao: string }> = [
  { value: "none", label: "Sem acesso", descricao: "Ação bloqueada." },
  { value: "own", label: "Carteira própria", descricao: "Ação limitada aos arquivos autorizados da carteira própria." },
  { value: "tenant", label: "Corretora", descricao: "Ação limitada aos arquivos autorizados da corretora." },
];

interface Props {
  value: PermissoesArmazenamento;
  disabled?: boolean;
  onChange: (acao: AcaoArmazenamento, escopo: EscopoArmazenamento) => void;
  onAplicarTodas: (escopo: EscopoArmazenamento) => void;
}

export default function ModalPermissoesArmazenamento({
  value, disabled = false, onChange, onAplicarTodas,
}: Props) {
  return (
    <ModuloPermissao
      titulo="Armazenamento"
      descricao="Permissões independentes para consultar, visualizar, baixar e excluir arquivos da Central de Armazenamento."
      icon={<HardDrive size={21} />}
      disabled={disabled}
      opcoesRapidas={[
        { value: "tenant", label: "Liberar tudo · corretora" },
        { value: "own", label: "Liberar tudo · carteira própria" },
        { value: "none", label: "Remover acessos" },
      ]}
      onAplicarTodas={onAplicarTodas}
      rodape="Cada ação é independente. A autorização efetiva é validada pelo backend para cada arquivo; esta tela não altera permissões de Sinistros, Assistências ou outras áreas."
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
