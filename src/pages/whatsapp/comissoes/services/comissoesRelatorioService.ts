import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FiltrosComissoes, ItemComissaoGeral, ResumoComissoesGeral } from "../types/comissoes";
import { buscarComissoesGeral } from "./comissoesService";
import { supabase } from "../../../../lib/supabaseClient";

export interface ItemRelatorioComissoes { item: ItemComissaoGeral; detalhe: null; percentualCorretor: string; percentualCorretora: string }
export interface DadosRelatorioComissoes {
  filtros: FiltrosComissoes;
  resumo: ResumoComissoesGeral;
  total: number;
  itens: ItemRelatorioComissoes[];
  geradoEm: string;
}

export type CampoRelatorioComissoes =
  | "cliente" | "tipo_cliente" | "apolice" | "venda" | "produto" | "seguradora" | "corretor" | "status_contrato"
  | "premio" | "base_original" | "deducoes_base" | "base_calculo" | "tipo_calculo" | "percentual_comissao"
  | "comissao_bruta" | "valor_distribuido" | "deducoes_participantes" | "comissao_corretora"
  | "percentual_corretora" | "comissao_corretor" | "percentual_corretor"
  | "previsto_receber" | "recebido" | "saldo_receber" | "previsto_pagar" | "pago" | "saldo_pagar"
  | "pago_corretor" | "situacao_corretor";
export type GrupoCampoRelatorio = "identificacao" | "calculo" | "distribuicao" | "financeiro";
interface DefinicaoCampo { id: CampoRelatorioComissoes; titulo: string; grupo: GrupoCampoRelatorio; valor: (i: ItemComissaoGeral, relatorio?: ItemRelatorioComissoes) => string; numerico?: boolean }
const moeda = (n?: number | null) => Number(n ?? 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const percentual = (n?: number | null) => n === null || n === undefined ? "—" : `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%`;
const dataBR = (v?: string | null) => v && /^\d{4}-\d{2}-\d{2}/.test(v) ? `${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}` : "—";
// A participação é calculada sobre a comissão bruta, e não confundida com o percentual contratual do split.
// Taxas de rateio são extraídas dos splits reais; não inferir a partir da proporção monetária.
export const CAMPOS_RELATORIO_COMISSOES: DefinicaoCampo[] = [
  { id:"cliente", titulo:"Cliente", grupo:"identificacao", valor:i=>i.cliente?.nome ?? "—" },
  { id:"tipo_cliente", titulo:"Tipo cliente", grupo:"identificacao", valor:i=>i.cliente?.tipo ?? "—" },
  { id:"apolice", titulo:"Apólice", grupo:"identificacao", valor:i=>i.contrato.numero_apolice ?? "—" },
  { id:"venda", titulo:"Data da venda", grupo:"identificacao", valor:i=>dataBR(i.contrato.data_venda) },
  { id:"produto", titulo:"Produto", grupo:"identificacao", valor:i=>i.produto_nome ?? "—" },
  { id:"seguradora", titulo:"Seguradora", grupo:"identificacao", valor:i=>i.seguradora_nome ?? "—" },
  { id:"corretor", titulo:"Corretor responsável", grupo:"identificacao", valor:i=>i.corretor_nome ?? "—" },
  { id:"status_contrato", titulo:"Status contrato", grupo:"identificacao", valor:i=>i.contrato.status },
  { id:"premio", titulo:"Prêmio aceito", grupo:"calculo", valor:i=>moeda(i.contrato.valor_aceito), numerico:true },
  { id:"base_original", titulo:"Base original", grupo:"calculo", valor:i=>moeda(i.comissao.valor_base_original), numerico:true },
  { id:"deducoes_base", titulo:"Deduções da base", grupo:"calculo", valor:i=>moeda(i.comissao.valor_deducoes_base), numerico:true },
  { id:"base_calculo", titulo:"Base de cálculo", grupo:"calculo", valor:i=>moeda(i.comissao.valor_base_calculo), numerico:true },
  { id:"tipo_calculo", titulo:"Cálculo", grupo:"calculo", valor:i=>i.comissao.tipo_calculo_comissao === "PERCENTUAL" ? "Percentual" : "Valor fixo" },
  { id:"percentual_comissao", titulo:"Taxa da comissão", grupo:"calculo", valor:i=>i.comissao.tipo_calculo_comissao === "PERCENTUAL" ? percentual(i.comissao.percentual_comissao) : "Valor fixo", numerico:true },
  { id:"comissao_bruta", titulo:"Comissão bruta", grupo:"calculo", valor:i=>moeda(i.comissao.valor_comissao_bruta), numerico:true },
  { id:"valor_distribuido", titulo:"Distribuído bruto", grupo:"distribuicao", valor:i=>moeda(i.resumo_splits.valor_distribuido_bruto), numerico:true },
  { id:"deducoes_participantes", titulo:"Deduções participantes", grupo:"distribuicao", valor:i=>moeda(i.resumo_splits.valor_deducoes_splits), numerico:true },
  { id:"comissao_corretora", titulo:"Corretora (residual)", grupo:"distribuicao", valor:i=>moeda(i.resumo_splits.valor_residual_corretora), numerico:true },
  { id:"percentual_corretora", titulo:"Participação corretora (%)", grupo:"distribuicao", valor:(_i, linha)=>linha?.percentualCorretora ?? "—", numerico:true },
  { id:"comissao_corretor", titulo:"Corretor (líquido)", grupo:"distribuicao", valor:i=>moeda(i.valor_comissao_corretor), numerico:true },
  { id:"percentual_corretor", titulo:"Participação corretor (%)", grupo:"distribuicao", valor:(_i, linha)=>linha?.percentualCorretor ?? "—", numerico:true },
  { id:"previsto_receber", titulo:"Previsto receber", grupo:"financeiro", valor:i=>moeda(i.resumo_recebimentos.valor_total_previsto), numerico:true },
  { id:"recebido", titulo:"Recebido", grupo:"financeiro", valor:i=>moeda(i.resumo_recebimentos.valor_recebido), numerico:true },
  { id:"saldo_receber", titulo:"Saldo receber", grupo:"financeiro", valor:i=>moeda(i.resumo_recebimentos.valor_pendente), numerico:true },
  { id:"previsto_pagar", titulo:"Previsto pagar", grupo:"financeiro", valor:i=>moeda(i.resumo_pagamentos.valor_total_previsto), numerico:true },
  { id:"pago", titulo:"Pago", grupo:"financeiro", valor:i=>moeda(i.resumo_pagamentos.valor_pago), numerico:true },
  { id:"saldo_pagar", titulo:"Saldo pagar", grupo:"financeiro", valor:i=>moeda(i.resumo_pagamentos.valor_pendente), numerico:true },
  { id:"pago_corretor", titulo:"Pago ao corretor", grupo:"financeiro", valor:i=>moeda(i.valor_pago_corretor), numerico:true },
  { id:"situacao_corretor", titulo:"Situação corretor", grupo:"financeiro", valor:i=>i.situacao_pagamento_corretor ?? "—" },
];
export const CAMPOS_PADRAO_RELATORIO: CampoRelatorioComissoes[] = ["cliente","apolice","produto","seguradora","corretor","comissao_bruta","comissao_corretora","comissao_corretor","recebido","pago_corretor"];
export interface OpcoesPdfRelatorioComissoes {
  titulo?: string; subtitulo?: string; filtrosDescricao?: string[]; participanteNome?: string | null; nomeArquivo?: string;
  campos?: CampoRelatorioComissoes[]; mostrarResumo?: boolean;
}
export async function buscarDadosRelatorioComissoes(filtros: FiltrosComissoes = {}): Promise<DadosRelatorioComissoes> {
  const filtrosSemPaginacao = { ...filtros, pagina:1, limite:100 };
  const primeira = await buscarComissoesGeral(filtrosSemPaginacao);
  const itens = [...primeira.itens];
  for (let pagina=2; pagina<=primeira.total_paginas; pagina++) {
    const parte = await buscarComissoesGeral({ ...filtrosSemPaginacao, pagina });
    itens.push(...parte.itens);
  }
  const unicos = [...new Map(itens.map(item=>[item.comissao.id,item])).values()];
  const mapaSplits = new Map<string, Array<{ tipo_participante:string; usuario_id:string|null; percentual:number|null; tipo_calculo:string; residual_corretora:boolean }>>();
  const ids = unicos.map(item=>item.comissao.id);
  for (let inicio=0; inicio<ids.length; inicio+=100) {
    const {data,error}=await supabase.from("crm_comissao_splits")
      .select("comissao_id,tipo_participante,usuario_id,percentual,tipo_calculo,residual_corretora")
      .in("comissao_id",ids.slice(inicio,inicio+100));
    if (error) throw new Error(`Falha ao obter taxas reais de rateio: ${error.message}`);
    for (const r of data ?? []) {
      const chave = r.comissao_id as string;
      const anteriores = mapaSplits.get(chave) ?? [];
      anteriores.push({tipo_participante:r.tipo_participante,usuario_id:r.usuario_id,percentual:r.percentual,tipo_calculo:r.tipo_calculo,residual_corretora:r.residual_corretora});
      mapaSplits.set(chave,anteriores);
    }
  }
  const taxaSplit = (split: {percentual:number|null;tipo_calculo:string;residual_corretora:boolean} | undefined) => {
    if (!split) return "—";
    if (split.residual_corretora) return "Residual automático";
    return split.tipo_calculo === "PERCENTUAL" ? percentual(split.percentual) : "Valor fixo";
  };
  const linhas:ItemRelatorioComissoes[] = unicos.map(item=>{
    const splits=mapaSplits.get(item.comissao.id) ?? [];
    return {
      item, detalhe:null,
      percentualCorretor: taxaSplit(splits.find(s=>s.tipo_participante==="CORRETOR" && s.usuario_id===item.contrato.corretor_id)),
      percentualCorretora: taxaSplit(splits.find(s=>s.tipo_participante==="CORRETORA" || s.residual_corretora)),
    };
  });
  return { filtros:{...filtros,pagina:undefined,limite:undefined}, resumo:primeira.resumo, total:unicos.length,
    itens:linhas, geradoEm:new Date().toISOString() };
}
export function gerarPdfRelatorioComissoes(dados: DadosRelatorioComissoes, opcoes: OpcoesPdfRelatorioComissoes = {}): void {
  const escolhidos = opcoes.campos ?? CAMPOS_PADRAO_RELATORIO;
  const colunas = escolhidos.map(id=>CAMPOS_RELATORIO_COMISSOES.find(c=>c.id===id)).filter((c):c is DefinicaoCampo=>Boolean(c));
  if (!colunas.length) throw new Error("Selecione ao menos um campo para exportar.");
  const pdf = new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const largura = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(25,42,68); pdf.rect(0,0,largura,29,"F");
  pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(16);
  pdf.text(opcoes.titulo?.trim() || "Relatório de Comissões",12,12);
  pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(210,222,238);
  pdf.text(`${dados.total} comissões | Vendas: ${dataBR(dados.filtros.data_inicio)} a ${dataBR(dados.filtros.data_fim)}`,12,20);
  pdf.text(`Emitido: ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`,largura-12,20,{align:"right"});
  let y = 34;
  const legenda = [opcoes.subtitulo?.trim(), ...(opcoes.filtrosDescricao ?? []), opcoes.participanteNome ? `Participante: ${opcoes.participanteNome}` : ""].filter(Boolean).join("  |  ");
  if (legenda) { pdf.setTextColor(88,101,120);pdf.setFontSize(8);const linhas=pdf.splitTextToSize(legenda,largura-25);pdf.text(linhas,12,y);y+=linhas.length*4.2+3; }
  if (opcoes.mostrarResumo !== false) {
    const metricas: Array<[string,number]> = [["BRUTA",dados.resumo.valor_comissao_bruta],["PREVISTO RECEBER",dados.resumo.valor_total_a_receber],["RECEBIDO",dados.resumo.valor_recebido],["PREVISTO PAGAR",dados.resumo.valor_total_a_pagar],["PAGO",dados.resumo.valor_pago]];
    const passo=(largura-24)/metricas.length;
    metricas.forEach(([rotulo,valor],idx)=>{const x=12+idx*passo;pdf.setFillColor(246,248,252);pdf.setDrawColor(226,231,239);pdf.roundedRect(x+0.7,y,passo-2,19,2,2,"FD");pdf.setFont("helvetica","normal");pdf.setFontSize(7);pdf.setTextColor(93,105,125);pdf.text(rotulo,x+3,y+6);pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(31,48,72);pdf.text(moeda(valor),x+3,y+14);});
    y+=25;
  }
  const minWidth = Math.max(16, Math.min(38,(largura-24)/colunas.length));
  const styles: Record<number, { cellWidth: number; halign: "right" | "left" }> = {};
  colunas.forEach((c,index)=>{ styles[index] = {cellWidth:minWidth,halign:c.numerico ? "right" : "left"}; });
  autoTable(pdf,{
    startY:y, head:[colunas.map(c=>c.titulo)], body:dados.itens.map(linha=>colunas.map(c=>c.valor(linha.item,linha))),
    theme:"striped", margin:{left:12,right:12,top:13,bottom:15},
    styles:{font:"helvetica",fontSize:Math.max(5.6,7.6-colunas.length*0.065),cellPadding:1.8,overflow:"linebreak",valign:"middle",textColor:[39,52,70]},
    headStyles:{fillColor:[40,65,98],textColor:[255,255,255],fontStyle:"bold"},
    alternateRowStyles:{fillColor:[247,249,252]}, columnStyles:styles,
    horizontalPageBreak:true, horizontalPageBreakRepeat:[],
    didDrawPage:()=>{const h=pdf.internal.pageSize.getHeight();pdf.setFont("helvetica","normal");pdf.setFontSize(7);pdf.setTextColor(128,139,153);pdf.text("SeguroCRM | Relatório personalizado de comissões",12,h-7);pdf.text(`Página ${pdf.getNumberOfPages()}`,largura-12,h-7,{align:"right"});}
  });
  pdf.save(opcoes.nomeArquivo || `comissoes_personalizado_${new Date().toISOString().slice(0,10)}.pdf`);
}
