import { ChartNoAxesCombined } from "lucide-react";
import { LinhaPermissao, ModuloPermissao, SecaoPermissao } from "./PermissaoUI";

export type EscopoFinanceiro = "none" | "tenant";
export type AcaoFluxoCaixa = "read" | "export";
export type PermissoesFluxoCaixa = Record<AcaoFluxoCaixa, EscopoFinanceiro>;
export const PADRAO_FLUXO_CAIXA: PermissoesFluxoCaixa = {read: "none", export: "none"};

export function normalizarPermissoesFluxoCaixa(json: unknown): PermissoesFluxoCaixa {
  const bruto = (json as any)?.financeiro?.fluxo_caixa;
  const resultado = { ...PADRAO_FLUXO_CAIXA };
  for (const chave of Object.keys(resultado) as Array<AcaoFluxoCaixa>) {
    resultado[chave] = bruto?.[chave] === "tenant" ? "tenant" : "none";
  }
  return resultado;
}

const opcoes = [{ value: "none" as const, label: "Sem acesso" }, { value: "tenant" as const, label: "Toda corretora" }];
export default function ModalPermissoesFluxoCaixa({ value, disabled=false, onChange, onAplicarTodas }: {
 value: PermissoesFluxoCaixa; disabled?: boolean; onChange: (acao: AcaoFluxoCaixa, escopo: EscopoFinanceiro) => void; onAplicarTodas: (escopo: EscopoFinanceiro) => void;
}) {
 return <ModuloPermissao titulo="Fluxo de Caixa" descricao="Acesso separado por operação financeira. Não concede permissões de comissões." icon={<ChartNoAxesCombined size={21} />} disabled={disabled} opcoesRapidas={[{value:"tenant",label:"Liberar tudo"},{value:"none",label:"Remover acessos"}]} onAplicarTodas={onAplicarTodas}>
   <SecaoPermissao titulo="Consulta e exportação">
     <LinhaPermissao label="Visualizar Fluxo de Caixa" descricao="Consultar movimentos previstos e realizados da corretora." value={value.read} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("read",v)} />
     <LinhaPermissao label="Exportar PDF" descricao="Gerar relatório personalizado considerando os filtros selecionados." value={value.export} disabled={disabled} opcoes={opcoes} onChange={v=>onChange("export",v)} />
   </SecaoPermissao>
 </ModuloPermissao>;
}
