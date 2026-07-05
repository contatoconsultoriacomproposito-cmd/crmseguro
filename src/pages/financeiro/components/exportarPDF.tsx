import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces tipadas para garantir a consistência dos dados
interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  categoriaId: string; 
  categoriaNome: string; 
  dataVencimento: string;
  dataQuitacao: string | null;
  status: 'pendente' | 'pago';
  juros: number;
  desconto: number;
}

interface DadosResumo {
  entradas: number;
  saidas: number;
  saldo: number;
}

// Interface opcional para enviar a estrutura real do Plano de Contas, 
// caso queira passar direto do estado do componente. Se não enviada, o PDF monta a árvore dinamicamente.
interface CategoriaPlano {
  codigo: string; // Ex: "1.1", "1.1.1"
  nome: string;
  tipo: 'entrada' | 'saida';
}

export function gerarPDFLancamentos(
  lancamentos: Lancamento[], 
  resumo: DadosResumo,
  planoDeContasMock?: CategoriaPlano[]
) {
  // 1. Inicializa o documento em formato A4, orientação Retrato (Portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const dataEmissao = new Date().toLocaleDateString('pt-BR');

  // ================= 1. CABEÇALHO DO RELATÓRIO CORRETO =================
  doc.setFillColor(30, 41, 59); // Slate 800 (Cor institucional escura)
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CRM SEGURO', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Relatório Financeiro Gerencial Consolidado', 15, 26);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Data de Emissão: ${dataEmissao}`, 155, 18);
  doc.text('Status: Plano & Movimentações', 155, 24);

  // ================= 2. QUADRO DE RESUMO METRICADO =================
  doc.setFillColor(248, 250, 252); // Gray 50
  doc.setDrawColor(226, 232, 240); // Gray 200
  doc.roundedRect(15, 48, 180, 22, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // Muted Label

  doc.text('TOTAL ENTRADAS', 25, 54);
  doc.text('TOTAL SAÍDAS', 85, 54);
  doc.text('SALDO DO PERÍODO', 145, 54);

  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // Verde
  doc.text(`R$ ${resumo.entradas.toFixed(2)}`, 25, 63);

  doc.setTextColor(239, 68, 68); // Vermelho
  doc.text(`R$ ${resumo.saidas.toFixed(2)}`, 85, 63);

  if (resumo.saldo >= 0) {
    doc.setTextColor(37, 99, 235); // Azul
  } else {
    doc.setTextColor(217, 119, 6); // Laranja
  }
  doc.text(`R$ ${resumo.saldo.toFixed(2)}`, 145, 63);

  // ================= SECTION A: ESTRUTURA ESTRUTURAL DO PLANO DE CONTAS =================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Estrutura do Plano de Contas Ativo', 15, 80);

  // Gerar linhas do plano de contas de forma hierárquica estruturada
  const colunasPlano = ['Código Estrutural', 'Classificação / Natureza da Conta', 'Tipo de Fluxo'];
  
  let linhasPlano: any[] = [];
  
  if (planoDeContasMock && planoDeContasMock.length > 0) {
    linhasPlano = planoDeContasMock.map(p => [p.codigo, p.nome, p.tipo === 'entrada' ? 'RECEITA' : 'DESPESA']);
  } else {
    // Fallback Inteligente: Extrai as categorias exclusivas usadas nos lançamentos atuais e formata como árvore estrutural simples
    const categoriasUnicas = Array.from(new Set(lancamentos.map(l => l.categoriaNome)));
    linhasPlano = categoriasUnicas.map((cat, index) => {
      const deparaTipo = lancamentos.find(l => l.categoriaNome === cat)?.tipo === 'entrada' ? 'RECEITA' : 'DESPESA';
      return [`1.${index + 1}`, `└─ ${cat}`, deparaTipo];
    });
  }

  // Renderiza a tabela do plano de contas primeiro
  autoTable(doc, {
    startY: 84,
    head: [colunasPlano],
    body: linhasPlano,
    theme: 'striped',
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 110 },
      2: { cellWidth: 35, fontStyle: 'bold' }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'RECEITA') {
          data.cell.styles.textColor = [16, 185, 129];
        } else {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    margin: { left: 15, right: 15 }
  });

  // Captura onde a tabela do plano de contas terminou para empurrar os lançamentos dinamicamente
  const finalYPlano = (doc as any).lastAutoTable.finalY;

  // ================= SECTION B: TABELA DE LANÇAMENTOS OPERACIONAIS =================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  // Adiciona um espaçamento de segurança de 10mm após a tabela anterior
  doc.text('2. Demonstrativo de Lançamentos Diários', 15, finalYPlano + 12);

  const colunasLancamentos = ['Fluxo', 'Descrição / Categoria', 'Vencimento', 'Pagamento', 'Valor Líquido'];

  const linhasLancamentos = lancamentos.map(item => {
    const tipoLabel = item.tipo === 'entrada' ? 'RECEITA' : 'DESPESA';
    const quitacaoLabel = item.dataQuitacao ? item.dataQuitacao : 'Em aberto';
    const valorLiquido = (item.valor + item.juros) - item.desconto;
    
    return [
      tipoLabel,
      `${item.descricao}\nCategoria: ${item.categoriaNome}`,
      item.dataVencimento,
      quitacaoLabel,
      `R$ ${valorLiquido.toFixed(2)}`
    ];
  });

  // Renderização da tabela operacional usando o finalY da anterior de forma segura contra quebras de página
  autoTable(doc, {
    startY: finalYPlano + 16,
    head: [colunasLancamentos],
    body: linhasLancamentos,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 }, 
      1: { cellWidth: 75 },
      2: { halign: 'left', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 26 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 31 }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 0) {
        if (data.cell.raw === 'RECEITA') {
          data.cell.styles.textColor = [16, 185, 129]; 
        } else {
          data.cell.styles.textColor = [239, 68, 68]; 
        }
      }
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'Em aberto') {
        data.cell.styles.textColor = [217, 119, 6]; 
      }
    },
    margin: { top: 20, right: 15, bottom: 20, left: 15 }
  });

  // ================= 4. RODAPÉ DE PÁGINAS DINÂMICO CONSOLIDADO =================
  const totalPaginas = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    
    // Linha divisória de rodapé
    doc.setDrawColor(241, 245, 249);
    doc.line(15, 285, 195, 285);
    
    doc.text('CRM Seguro - Relatório de Auditoria Integrada (Plano de Contas + Fluxo)', 15, 289);
    doc.text(`Página ${i} de ${totalPaginas}`, 180, 289);
  }

  // 5. Faz o download do arquivo no navegador do usuário
  doc.save(`relatorio-financeiro-gerencial-${dataEmissao.replace(/\//g, '-')}.pdf`);
}