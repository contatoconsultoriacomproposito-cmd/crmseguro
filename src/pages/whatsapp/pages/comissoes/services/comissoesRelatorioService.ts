import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FiltrosComissoes, ItemComissaoGeral, ResumoComissoesGeral } from "../types/comissoes";
import { buscarComissoesGeral } from "./comissoesService";

export interface ItemRelatorioComissoes { item: ItemComissaoGeral; detalhe: null }
export interface DadosRelatorioComissoes {
  filtros: FiltrosComissoes;
  resumo: ResumoComissoesGeral;
  total: number;
  itens: ItemRelatorioComissoes[];
  geradoEm: string;
}
export interface OpcoesPdfRelatorioComissoes {
  titulo?: string;
  subtitulo?: string;
  filtrosDescricao?: string[];
  participanteNome?: string | null;
  nomeArquivo?: string;
}
const moeda = (n?: number | null) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (v?: string | null) => v && /^\d{4}-\d{2}-\d{2}/.test(v) ? `${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}` : "—";

/** Respeita todos os filtros e busca TODAS as páginas, não apenas a exibida na tela. */
export async function buscarDadosRelatorioComissoes(filtros: FiltrosComissoes = {}): Promise<DadosRelatorioComissoes> {
  const filtrosSemPaginacao = { ...filtros, pagina: 1, limite: 100 };
  const primeira = await buscarComissoesGeral(filtrosSemPaginacao);
  const itens = [...primeira.itens];
  for (let pagina = 2; pagina <= primeira.total_paginas; pagina++) {
    const parte = await buscarComissoesGeral({ ...filtrosSemPaginacao, pagina });
    itens.push(...parte.itens);
  }
  const itensUnicos = [...new Map(itens.map((item) => [item.comissao.id, item])).values()];
  return {
    filtros: { ...filtros, pagina: undefined, limite: undefined },
    resumo: primeira.resumo,
    total: primeira.total,
    itens: itensUnicos.map((item) => ({ item, detalhe: null })),
    geradoEm: new Date().toISOString(),
  };
}

/** PDF gerencial conciso: cabeçalho, cinco totais e uma tabela, sem páginas por contrato. */
export function gerarPdfRelatorioComissoes(dados: DadosRelatorioComissoes, opcoes: OpcoesPdfRelatorioComissoes = {}): void {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const largura = pdf.internal.pageSize.getWidth();
  const titulo = opcoes.titulo ?? "Comissões | Resumo";
  pdf.setFillColor(27, 45, 71);
  pdf.rect(0, 0, largura, 27, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.setTextColor(255, 255, 255);
  pdf.text(titulo, 12, 13);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(210, 220, 232);
  const periodo = `Vendas: ${dados.filtros.data_inicio ? dataBR(dados.filtros.data_inicio) : "início"} a ${dados.filtros.data_fim ? dataBR(dados.filtros.data_fim) : "hoje"}`;
  pdf.text(`${periodo}   •   ${dados.total} comissões`, 12, 20);
  pdf.text(`Gerado em ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`, largura - 12, 20, { align: "right" });

  const metricas: Array<[string, number]> = [
    ["COMISSÃO BRUTA", dados.resumo.valor_comissao_bruta],
    ["A RECEBER", dados.resumo.valor_total_a_receber],
    ["RECEBIDO", dados.resumo.valor_recebido],
    ["A PAGAR", dados.resumo.valor_total_a_pagar],
    ["PAGO", dados.resumo.valor_pago],
  ];
  const passo = (largura - 24) / metricas.length;
  metricas.forEach(([nome, valor], index) => {
    const x = 12 + passo * index;
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x + 1, 32, passo - 3, 21, 2, 2, "FD");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(90, 104, 125);
    pdf.text(nome, x + 4, 39);
    pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 41, 59);
    pdf.text(moeda(valor), x + 4, 47);
  });

  // A legenda dos filtros só ocupa uma linha; o documento permanece legível.
  const filtrosTexto = (opcoes.filtrosDescricao ?? []).join("  •  ");
  if (filtrosTexto) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
    pdf.text(pdf.splitTextToSize(`Filtros: ${filtrosTexto}`, largura - 26).slice(0, 2), 13, 59);
  }
  const yTabela = filtrosTexto ? 67 : 59;
  const corpo = dados.itens.map(({ item }) => [
    item.cliente?.nome ?? "—",
    item.contrato.numero_apolice ?? "—",
    item.produto_nome ?? "—",
    item.seguradora_nome ?? "—",
    item.corretor_nome ?? "—",
    moeda(item.comissao.valor_comissao_bruta),
    moeda(item.resumo_splits.valor_residual_corretora),
    moeda(item.valor_comissao_corretor),
    moeda(item.resumo_recebimentos.valor_recebido),
    moeda(item.valor_pago_corretor),
  ]);
  autoTable(pdf, {
    startY: yTabela,
    head: [["Cliente", "Apólice", "Produto", "Seguradora", "Corretor", "Bruta", "Corretora", "Corretor", "Rec. segur.", "Pago corretor"]],
    body: corpo,
    theme: "striped",
    margin: { left: 12, right: 12, top: 13, bottom: 14 },
    styles: { font: "helvetica", fontSize: 7.1, cellPadding: 2.1, overflow: "linebreak", valign: "middle", textColor: [43, 54, 70] },
    headStyles: { fillColor: [40, 65, 98], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.3 },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { cellWidth: 40 }, 1: { cellWidth: 21 }, 2: { cellWidth: 33 },
      3: { cellWidth: 23 }, 4: { cellWidth: 29 },
      5: { cellWidth: 23, halign: "right" },
      6: { cellWidth: 23, halign: "right" },
      7: { cellWidth: 23, halign: "right" },
      8: { cellWidth: 25, halign: "right" },
      9: { cellWidth: 25, halign: "right" },
    },
    didDrawPage: () => {
      const pagina = pdf.internal.pages.length - 1;
      const altura = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 142, 158);
      pdf.text("SeguroCRM • Comissões", 12, altura - 7);
      pdf.text(`Página ${pagina}`, largura - 12, altura - 7, { align: "right" });
    },
  });
  if (!corpo.length) {
    pdf.setFontSize(10); pdf.setTextColor(100, 116, 139);
    pdf.text("Nenhuma comissão corresponde aos filtros selecionados.", 14, yTabela + 18);
  }
  pdf.save(opcoes.nomeArquivo ?? `comissoes_${new Date().toISOString().slice(0, 10)}.pdf`);
}
