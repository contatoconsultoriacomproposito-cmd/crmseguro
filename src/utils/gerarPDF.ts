import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabaseClient';
import { formatarDataBR } from "./dateUtils";

export async function gerarPDFProposta(dados: any) {
  const doc = new jsPDF();

  // 1. BUSCA DE DADOS COMPLEMENTARES (GARANTIA 100%)
  const { data: corretor } = await supabase
    .from('usuarios_perfis')
    .select('*')
    .eq('id', dados.corretorId)
    .single();

  const { data: corretora } = await supabase
    .from('usuarios_perfis')
    .select('*')
    .limit(1)
    .single();

  // --- CABEÇALHO ---
  doc.setFontSize(18);
  doc.text("PROPOSTA COMERCIAL", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Identificador: ${dados.numeroProposta}`, 105, 22, { align: "center" });

  // --- SEÇÃO: DADOS DO CLIENTE, CORRETOR E CORRETORA ---
  autoTable(doc, {
    startY: 30,
    head: [['DADOS DO CLIENTE', 'CORRETOR', 'CORRETORA']],
    body: [[
      `Nome/Razão: ${dados.cliente.nome}\nDocumento: ${dados.cliente.documento}\nWhatsApp: ${dados.cliente.whatsapp}`,
      `Nome: ${corretor?.nome || '-'}\nEmail: ${corretor?.email || '-'}\nSUSEP: ${corretor?.registro_susep || '-'}\nFone: ${corretor?.telefone_corretor || '-'}`,
      `Empresa: ${corretora?.nome || '-'}\nEmail: ${corretora?.email || '-'}`
    ]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40] }
  });

  // Preparação de colunas dinâmicas (Opção 1, 2, 3...)
  const colunasOpcoes = dados.opcoes.map((_: any, i: number) => `OPÇÃO ${i + 1}\n(${_.companhia})`);
  const headerComum = ['Produto / Plano', ...colunasOpcoes];

  // --- TABELA 1: COMPARATIVO DE VALORES ---
  const rowsValores = dados.produtosUnicos.map((prodNome: string) => {
    const linha = [prodNome];
    dados.opcoes.forEach((opt: any) => {
      const item = opt.itens.find((i: any) => i.nomeProduto === prodNome);
      linha.push(item ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor) : '-');
    });
    return linha;
  });

  // Linha de Total
  const linhaTotal = ['TOTAL DA OPÇÃO'];
  dados.opcoes.forEach((opt: any) => {
    const total = opt.itens.reduce((acc: number, curr: any) => acc + curr.valor, 0);
    linhaTotal.push(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total));
  });
  rowsValores.push(linhaTotal);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [headerComum],
    body: rowsValores,
    headStyles: { fillColor: [0, 51, 153] },
    footStyles: { fontStyle: 'bold' }
  });

  // --- TABELA 2: COBERTURAS & FRANQUIAS ---
  const rowsCoberturas = dados.produtosUnicos.map((prodNome: string) => {
    const linha = [prodNome];
    dados.opcoes.forEach((opt: any) => {
      const item = opt.itens.find((i: any) => i.nomeProduto === prodNome);
      linha.push(item?.cobertura || '-');
    });
    return linha;
  });

  doc.setFontSize(10);
  doc.text("COBERTURAS E FRANQUIAS", 14, (doc as any).lastAutoTable.finalY + 8);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Cobertura', ...colunasOpcoes]],
    body: rowsCoberturas,
    styles: { fontSize: 7, overflow: 'linebreak' }
  });

  // --- TABELA 3: CONDIÇÕES DE PAGAMENTO ---
  const rowsPagamento = dados.produtosUnicos.map((prodNome: string) => {
    const linha = [prodNome];
    dados.opcoes.forEach((opt: any) => {
      const item = opt.itens.find((i: any) => i.nomeProduto === prodNome);
      linha.push(item ? `${item.parcelamento} no ${item.meio}` : '-');
    });
    return linha;
  });

  doc.text("CONDIÇÕES DE PAGAMENTO", 14, (doc as any).lastAutoTable.finalY + 8);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Condições', ...colunasOpcoes]],
    body: rowsPagamento,
    styles: { fontSize: 8 }
  });

  // --- RODAPÉ ---
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Proposta válida até: ${formatarDataBR(dados.validade)}`, 14, finalY);
  doc.text("Esta proposta tem caráter informativo e está sujeita a alterações pela seguradora.", 14, finalY + 5);

  doc.save(`Proposta_${dados.numeroProposta}.pdf`);
}