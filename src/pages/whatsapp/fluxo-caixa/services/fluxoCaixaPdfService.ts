import type { MovimentoFluxoCaixa, FiltrosFluxoCaixa } from './fluxoCaixaService';

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const dataBR = (s: string | null | undefined) => s ? s.slice(0,10).split('-').reverse().join('/') : '—';

/** Exporta a mesma lista filtrada e exibida em tela; não faz consulta independente. */
export async function gerarPdfFluxoCaixa(movimentos: MovimentoFluxoCaixa[], filtros: FiltrosFluxoCaixa): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 40, 63); doc.rect(0,0,W,30,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(255,255,255);
  doc.text('Fluxo de Caixa | SeguroCRM',14,15);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text('Emitido: ' + new Date().toLocaleString('pt-BR'), 14,23);
  doc.setTextColor(44,55,70);
  const periodo = `${dataBR(filtros.dataInicial)} a ${dataBR(filtros.dataFinal)}`;
  const filtroTexto = [
    `Período: ${periodo}`, `Natureza: ${filtros.natureza || 'Todas'}`,
    `Situação: ${filtros.tipoMovimento || 'Todas'}`, `Módulo: ${filtros.modulo || 'Todos'}`,
    `Origem: ${filtros.origem || 'Todas'}`, `Busca: ${filtros.busca || '—'}`,
  ];
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(filtroTexto.join('   |   '), W-28),14,38);
  let entradas = 0, saidas = 0;
  movimentos.forEach(m => { if(m.tipo_movimento==='REALIZADO') { if(m.natureza==='ENTRADA') entradas+=m.valor_movimento; else saidas+=m.valor_movimento; } });
  doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text(`Entradas realizadas: ${moeda(entradas)}    Saídas realizadas: ${moeda(saidas)}    Resultado: ${moeda(entradas-saidas)}`,14,57);
  autoTable(doc, {
    startY: 65,
    head: [['Data','Natureza','Situação','Origem','Descrição / Contraparte','Plano de contas','Valor']],
    body: movimentos.map(m => [dataBR(m.data_movimento),m.natureza==='ENTRADA'?'Entrada':'Saída',m.tipo_movimento==='REALIZADO'?'Realizado':'Previsto',m.origem || '—', [m.descricao,m.contraparte].filter(Boolean).join(' | '),m.plano_caminho || m.plano_nome || '—',moeda(m.valor_assinado)]),
    theme:'striped', margin:{left:14,right:14,bottom:17},
    styles:{fontSize:7,cellPadding:2.2,overflow:'linebreak'},
    headStyles:{fillColor:[15,65,87],textColor:[255,255,255]},
    columnStyles:{4:{cellWidth:66},5:{cellWidth:54},6:{halign:'right',cellWidth:31}},
    didDrawPage: () => {
      doc.setFontSize(7);doc.setTextColor(110,120,130);
      doc.text('SeguroCRM • Relatório de Fluxo de Caixa',14,doc.internal.pageSize.getHeight()-8);
      doc.text(`Página ${doc.getNumberOfPages()}`,W-14,doc.internal.pageSize.getHeight()-8,{align:'right'});
    },
  });
  doc.save(`fluxo_caixa_${new Date().toISOString().slice(0,10)}.pdf`);
}
