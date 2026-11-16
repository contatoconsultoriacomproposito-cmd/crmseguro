import { CreditCard } from "lucide-react";
import { LinhaPermissao, ModuloPermissao, SecaoPermissao } from "./PermissaoUI";

export type EscopoFinanceiro = "none" | "tenant";
export type AcaoContasPagar = "read" | "plano_create" | "plano_update" | "plano_delete" | "lancamento_create" | "lancamento_update" | "lancamento_delete" | "baixar" | "estornar";
export type PermissoesContasPagar = Record<AcaoContasPagar, EscopoFinanceiro>;
export const PADRAO_CONTAS_PAGAR: PermissoesContasPagar = {read: "none", plano_create: "none", plano_update: "none", plano_delete: "none", lancamento_create: "none", lancamento_update: "none", lancamento_delete: "none", baixar: "none", estornar: "none"};

export function normalizarPermissoesContasPagar(json: unknown): PermissoesContasPagar {
  const bruto = (json as any)?.financeiro?.contas_pagar;
  const resultado = { ...PADRAO_CONTAS_PAGAR };
  for (const chave of Object.keys(resultado) as Array<AcaoContasPagar>) {
    resultado[chave] = bruto?.[chave] === "tenant" ? "tenant" : "none";
  }
  return resultado;
}

const opcoes = [{ value: "none" as const, label: "Sem acesso" }, { value: "tenant" as const, label: "Toda corretora" }];
export default function ModalPermissoesContasPagar({ value, disabled=false, onChange, onAplicarTodas }: {
 value: PermissoesContasPagar; disabled?: boolean; onChange: (acao: AcaoContasPagar, escopo: EscopoFinanceiro) => void; onAplicarTodas: (escopo: EscopoFinanceiro) => void;
}) {
 return <ModuloPermissao titulo="Contas a Pagar" descricao="Acesso separado por operação financeira. Não concede permissões de comissões." icon={<CreditCard size={21} />} disabled={disabled} opcoesRapidas={[{value:"tenant",label:"Liberar tudo"},{value:"none",label:"Remover acessos"}]} onAplicarTodas={onAplicarTodas}>
   <SecaoPermissao titulo="Consulta">
     <LinhaPermissao label="Visualizar" descricao="Consultar plano de contas, lançamentos, baixas e saldos." value={value.read} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("read",v)} />
   </SecaoPermissao>
   <SecaoPermissao titulo="Plano de contas">
     <LinhaPermissao label="Criar categoria" descricao="Adicionar categoria no plano de contas." value={value.plano_create} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("plano_create",v)} />
     <LinhaPermissao label="Editar categoria" descricao="Alterar nome, hierarquia e classificação de categorias." value={value.plano_update} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("plano_update",v)} />
     <LinhaPermissao label="Desativar categoria" descricao="Desativar categorias sem excluir o histórico." value={value.plano_delete} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("plano_delete",v)} />
   </SecaoPermissao>
   <SecaoPermissao titulo="Lançamentos e provisionamentos">
     <LinhaPermissao label="Criar lançamento" descricao="Criar lançamentos e provisionamentos de despesa." value={value.lancamento_create} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("lancamento_create",v)} />
     <LinhaPermissao label="Editar lançamento" descricao="Editar lançamentos e itens de provisionamento." value={value.lancamento_update} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("lancamento_update",v)} />
     <LinhaPermissao label="Cancelar lançamento" descricao="Cancelar lançamentos/provisionamentos preservando histórico." value={value.lancamento_delete} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("lancamento_delete",v)} />
   </SecaoPermissao>
   <SecaoPermissao titulo="Liquidação">
     <LinhaPermissao label="Registrar pagamento" descricao="Efetivar baixas totais ou parciais de despesa." value={value.baixar} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("baixar",v)} />
     <LinhaPermissao label="Estornar pagamento" descricao="Reverter uma baixa já realizada, com justificativa." value={value.estornar} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("estornar",v)} />
   </SecaoPermissao>
 </ModuloPermissao>;
}
