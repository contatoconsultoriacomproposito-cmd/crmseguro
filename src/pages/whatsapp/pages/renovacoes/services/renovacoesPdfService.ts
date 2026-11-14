import type { FiltrosRenovacoes, ResultadoRenovacoes } from '../types/renovacoes';

const moeda = (n: number): string =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (value: string | null | undefined): string => {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export async function gerarPdfRenovacoes(
  resultado: ResultadoRenovacoes,
  filtros: FiltrosRenovacoes,
): Promise<void> {
  // Dependencias: npm install jspdf jspdf-autotable
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const largura = pdf.internal.pageSize.getWidth();
  const altura = pdf.internal.pageSize.getHeight();
  const margem = 13;
  const disponivel = largura - 2 * margem;
  const corAzul: [number, number, number] = [29, 78, 216];

  function cabecalho(): void {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, largura, 22, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('SeguroCRM  |  Relatório de Renovações', margem, 12);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, largura - margem, 12, {
      align: 'right',
    });
    pdf.setTextColor(15, 23, 42);
  }

  cabecalho();
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const periodo = `Vencimento: ${dataBR(filtros.vigencia_inicio)} até ${dataBR(filtros.vigencia_fim)}`;
  const venda = `Venda: ${dataBR(filtros.data_venda_inicio)} até ${dataBR(filtros.data_venda_fim)}`;
  pdf.text(periodo, margem, 29);
  pdf.text(venda, margem + 105, 29);
  if (filtros.busca && filtros.busca.trim().length >= 3) {
    pdf.text(`Busca: ${filtros.busca.slice(0, 80)}`, margem, 35);
  }

  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(margem, 40, disponivel, 18, 2.5, 2.5, 'F');
  pdf.setTextColor(...corAzul);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`Contratos a renovar: ${resultado.total}`, margem + 5, 50.5);
  pdf.text(`Prêmio atual estimado: ${moeda(resultado.valor_total)}`, largura - margem - 5, 50.5, {
    align: 'right',
  });
  pdf.setTextColor(15, 23, 42);

  let y = 66;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Estimativa por produto', margem, y);
  y += 4;

  const espaco = 3;
  const colunas = 3;
  const larguraCard = (disponivel - espaco * (colunas - 1)) / colunas;
  const alturaCard = 17;

  resultado.por_produto.forEach((produto, indice) => {
    const coluna = indice % colunas;
    if (coluna === 0 && y + alturaCard > altura - 19) {
      pdf.addPage();
      cabecalho();
      y = 29;
    }
    const x = margem + coluna * (larguraCard + espaco);
    pdf.setDrawColor(219, 234, 254);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, larguraCard, alturaCard, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(8);
    const nome = pdf.splitTextToSize(produto.produto_nome, larguraCard - 9)[0] || produto.produto_nome;
    pdf.text(nome, x + 4, y + 5);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(moeda(produto.valor_total), x + 4, y + 12);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${produto.quantidade} contratos`, x + larguraCard - 4, y + 12, { align: 'right' });
    if (coluna === colunas - 1 || indice === resultado.por_produto.length - 1) {
      y += alturaCard + espaco;
    }
  });

  if (y + 17 > altura - 15) {
    pdf.addPage();
    cabecalho();
    y = 29;
  }
  y += 6;
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Carteira de contratos filtrada', margem, y);
  y += 3;

  autoTable(pdf, {
    startY: y,
    margin: { left: margem, right: margem, top: 29, bottom: 15 },
    head: [[
      'Proposta / Cliente', 'Venda / Vigência', 'Produto', 'Prêmio atual',
      'Apólice atual', 'Corretor',
    ]],
    body: resultado.dados.map(item => [
      `${item.numero_proposta}\n${item.cliente_nome}`,
      `Venda: ${dataBR(item.data_venda)}\nInício: ${dataBR(item.inicio_vigencia)}\nFim: ${dataBR(item.fim_vigencia)}`,
      item.produto_nome,
      moeda(item.valor_premio_atual),
      item.numero_apolice || '—',
      item.corretor_nome,
    ]),
    theme: 'striped',
    styles: { fontSize: 7.6, cellPadding: 2.5, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: corAzul, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 49 },
      2: { cellWidth: 49 },
      3: { cellWidth: 39, halign: 'right' },
      4: { cellWidth: 43 },
      5: { cellWidth: 34 },
    },
    didDrawPage: () => {
      // Cabecalho para novas paginas; a primeira ja foi desenhada.
      if (pdf.getCurrentPageInfo().pageNumber > 1) cabecalho();
    },
  });

  const paginas = pdf.getNumberOfPages();
  for (let n = 1; n <= paginas; n += 1) {
    pdf.setPage(n);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margem, altura - 12, largura - margem, altura - 12);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Valores estimados com base no prêmio atual; não representam cotação de renovação.', margem, altura - 7);
    pdf.text(`Página ${n} de ${paginas}`, largura - margem, altura - 7, { align: 'right' });
  }
  const dia = new Date().toISOString().slice(0, 10);
  pdf.save(`renovacoes_${dia}.pdf`);
}
