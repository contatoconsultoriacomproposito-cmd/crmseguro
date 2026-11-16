import { FileClock } from "lucide-react";
import { LinhaPermissao, ModuloPermissao, SecaoPermissao } from "./PermissaoUI";

export type EscopoParcelasClientes = "none" | "tenant";
export type AcaoParcelasClientes = "read" | "view_contract" | "update" | "settle" | "reverse" | "create_extra" | "rebuild";
export type PermissoesParcelasClientes = Record<AcaoParcelasClientes, EscopoParcelasClientes>;
export const PADRAO_PARCELAS_CLIENTES: PermissoesParcelasClientes = {
  read: "none", view_contract: "none", update: "none", settle: "none", reverse: "none", create_extra: "none", rebuild: "none",
};
export function normalizarPermissoesParcelasClientes(json: unknown): PermissoesParcelasClientes {
  const raiz = json as { financeiro?: { parcelas_clientes?: Partial<PermissoesParcelasClientes> } } | null;
  const bruto = raiz?.financeiro?.parcelas_clientes;
  const resultado = { ...PADRAO_PARCELAS_CLIENTES };
  for (const chave of Object.keys(resultado) as AcaoParcelasClientes[]) {
    resultado[chave] = bruto?.[chave] === "tenant" ? "tenant" : "none";
  }
  return resultado;
}
const opcoes = [{value:"none" as const,label:"Sem acesso"},{value:"tenant" as const,label:"Toda corretora"}];
export default function ModalPermissoesParcelasClientes({value,disabled=false,onChange,onAplicarTodas}: {
  value: PermissoesParcelasClientes; disabled?: boolean;
  onChange:(acao:AcaoParcelasClientes,escopo:EscopoParcelasClientes)=>void;
  onAplicarTodas:(escopo:EscopoParcelasClientes)=>void;
}) {
  return <ModuloPermissao titulo="Parcelas Clientes" descricao="Permissões independentes para consulta e operações do financeiro de contratos." icon={<FileClock size={21}/>} disabled={disabled} opcoesRapidas={[{value:"tenant",label:"Liberar tudo"},{value:"none",label:"Remover acessos"}]} onAplicarTodas={onAplicarTodas}>
    <SecaoPermissao titulo="Consulta">
      <LinhaPermissao label="Visualizar controle de parcelas" descricao="Página geral, indicadores, filtros e listagem." value={value.read} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("read",v)}/>
      <LinhaPermissao label="Visualizar financeiro do contrato" descricao="Abrir e consultar parcelas de um contrato, inclusive por acesso direto." value={value.view_contract} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("view_contract",v)}/>
    </SecaoPermissao>
    <SecaoPermissao titulo="Operações">
      <LinhaPermissao label="Editar parcelas" descricao="Alterar parcelas e vencimentos pendentes." value={value.update} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("update",v)}/>
      <LinhaPermissao label="Baixar parcelas" descricao="Registrar baixas individuais e em lote." value={value.settle} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("settle",v)}/>
      <LinhaPermissao label="Estornar parcelas" descricao="Estornar baixas realizadas." value={value.reverse} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("reverse",v)}/>
      <LinhaPermissao label="Novo lançamento avulso" descricao="Criar lançamento complementar no financeiro do contrato." value={value.create_extra} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("create_extra",v)}/>
      <LinhaPermissao label="Reconstruir financeiro" descricao="Substituir parcelamento, preservando auditoria." value={value.rebuild} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("rebuild",v)}/>
    </SecaoPermissao>
  </ModuloPermissao>;
}
