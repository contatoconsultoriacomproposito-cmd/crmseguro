import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interface da tabela public.tab_corretora_config
interface ConfigCorretora {
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  website: string | null;
  whatsapp_comercial: string | null;
  email_corporativo: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  logotipo_url: string | null;
}

// Interface do Plano de Contas estruturado da sua árvore
interface CategoriaPlano {
  id: string;
  name: string;
  tipo: 'entrada' | 'saida';
  parent_id: string | null;
  depth: number;
  ordem: number;
}

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

export function gerarPDFLancamentos(
  lancamentos: Lancamento[], 
  resumo: DadosResumo,
  categorias: CategoriaPlano[],
  configCorretora: ConfigCorretora | null
) {
  // 1. Inicializa o documento em formato A4, orientação Retrato (Portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const dataEmissao = new Date().toLocaleDateString('pt-BR');

  // ================= 1. CABEÇALHO CORPORATIVO DINÂMICO =================
  doc.setFillColor(30, 41, 59); // Slate 800 (Cor institucional escura)
  doc.rect(0, 0, 210, 45, 'F');

  // Coluna Esquerda: Dados da Corretora vindo do Banco de Dados
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  
  let nomeEmpresa = configCorretora?.razao_social || configCorretora?.nome_fantasia || 'CRM SEGURO';
  nomeEmpresa = nomeEmpresa.toUpperCase();
  
  // 2. Trava de segurança: se o nome tiver mais de 40 caracteres, ele corta e adiciona "..."
  if (nomeEmpresa.length > 40) {
    nomeEmpresa = nomeEmpresa.substring(0, 37) + '...';
  }
  
  doc.text(nomeEmpresa, 15, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  
  if (configCorretora?.cnpj) {
    doc.text(`CNPJ: ${configCorretora.cnpj}`, 15, 22);
  }
  
  // Monta o endereço se existir
  if (configCorretora?.logradouro) {
    const endereco = `${configCorretora.logradouro}, ${configCorretora.numero || 'S/N'} - ${configCorretora.bairro || ''}`;
    const localidade = `${configCorretora.municipio || ''}/${configCorretora.uf || ''}`;
    doc.text(`${endereco} | ${localidade}`, 15, 27);
  } else {
    doc.text('Relatório Financeiro Gerencial Consolidado', 15, 27);
  }

  if (configCorretora?.email_corporativo) {
    doc.text(`E-mail: ${configCorretora.email_corporativo}`, 15, 32);
  }

  // Coluna Direita: Metadados do Relatório (Alinhados à direita)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DEMONSTRATIVO DE FLUXO DE CAIXA', 195, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Emissão: ${dataEmissao}`, 195, 22, { align: 'right' });
  doc.text(`Status: Visão Consolidada`, 195, 27, { align: 'right' });

  // Exibe Contatos Comerciais/Website se houver
  const informacaoContato = [
    configCorretora?.whatsapp_comercial ? `Whats: ${configCorretora.whatsapp_comercial}` : '',
    configCorretora?.website ? `Web: ${configCorretora.website}` : ''
  ].filter(Boolean).join('  |  ');
  
  if (informacaoContato) {
    doc.text(informacaoContato, 195, 34, { align: 'right' });
  }

  // ================= 2. QUADRO DE RESUMO METRICADO =================
  doc.setFillColor(248, 250, 252); // Gray 50
  doc.setDrawColor(226, 232, 240); // Gray 200
  doc.roundedRect(15, 52, 180, 22, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // Muted Label

  doc.text('TOTAL ENTRADAS', 25, 58);
  doc.text('TOTAL SAÍDAS', 85, 58);
  doc.text('SALDO DO PERÍODO', 145, 58);

  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // Verde
  doc.text(`R$ ${resumo.entradas.toFixed(2)}`, 25, 67);

  doc.setTextColor(239, 68, 68); // Vermelho
  doc.text(`R$ ${resumo.saidas.toFixed(2)}`, 85, 67);

  if (resumo.saldo >= 0) {
    doc.setTextColor(37, 99, 235); // Azul
  } else {
    doc.setTextColor(217, 119, 6); // Laranja
  }
  doc.text(`R$ ${resumo.saldo.toFixed(2)}`, 145, 67);

  // ================= SECTION A: ESTRUTURA DO PLANO DE CONTAS COM ACUMULADOS =================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Visão por Categoria (Estrutura de Resultados)', 15, 87);

  // --- LÓGICA DE CÁLCULO E AGREGAÇÃO RECURSIVA ---
  // Mapeia o valor líquido direto lançado em cada categoria específica
  const lancamentosPorCategoria = new Map<string, number>();
  lancamentos.forEach(l => {
    const valorLiquido = (l.valor + l.juros) - l.desconto;
    lancamentosPorCategoria.set(l.categoriaId, (lancamentosPorCategoria.get(l.categoriaId) || 0) + valorLiquido);
  });

  // Função recursiva para calcular o somatório da categoria + subcategorias filhas
  const calcularTotalAcumulado = (catId: string): number => {
    let total = lancamentosPorCategoria.get(catId) || 0;
    const filhas = categorias.filter(c => c.parent_id === catId);
    filhas.forEach(filha => {
      total += calcularTotalAcumulado(filha.id);
    });
    return total;
  };

  const colunasPlano = ['Código', 'Classificação Gerencial da Conta', 'Fluxo', 'Total Movimentado'];
  const linhasPlano: any[] = [];
  
  // Array paralelo para armazenar metadados de estilização das linhas
  const metaLinhasPlano: { isParent: boolean; depth: number }[] = [];

  // Função para mapear a árvore e preencher a tabela respeitando a hierarquia
  const processarNoArvore = (cat: CategoriaPlano, prefixoCodigo: string) => {
    const totalAcumulado = calcularTotalAcumulado(cat.id);
    const temFilhos = categorias.some(c => c.parent_id === cat.id);
    
    // Aplica indentação visual elegante baseada no depth
    const recuo = cat.depth > 0 ? `${'    '.repeat(cat.depth)}-> ` : '';
    const nomeFormatado = `${recuo}${cat.name}`;
    const tipoLabel = cat.tipo === 'entrada' ? 'RECEITA' : 'DESPESA';
    
    linhasPlano.push([
      prefixoCodigo,
      nomeFormatado,
      tipoLabel,
      `R$ ${totalAcumulado.toFixed(2)}`
    ]);
    
    metaLinhasPlano.push({
      isParent: temFilhos,
      depth: cat.depth
    });

    // Filtra e processa as filhas diretas deste nó ordenadamente
    const filhas = categorias
      .filter(c => c.parent_id === cat.id)
      .sort((a, b) => a.ordem - b.ordem);
      
    filhas.forEach((filha, index) => {
      processarNoArvore(filha, `${prefixoCodigo}.${index + 1}`);
    });
  };

  // Divide e processa a árvore separando os blocos (1. Receitas e 2. Despesas) estilo DRE
  const raizesEntrada = categorias.filter(c => c.parent_id === null && c.tipo === 'entrada').sort((a, b) => a.ordem - b.ordem);
  raizesEntrada.forEach((cat, index) => processarNoArvore(cat, `1.${index + 1}`));

  const raizesSaida = categorias.filter(c => c.parent_id === null && c.tipo === 'saida').sort((a, b) => a.ordem - b.ordem);
  raizesSaida.forEach((cat, index) => processarNoArvore(cat, `2.${index + 1}`));

  // Renderiza a tabela gerencial do Plano de Contas estruturado
  autoTable(doc, {
    startY: 92,
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
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 105 },
      2: { cellWidth: 25, fontStyle: 'bold' },
      3: { cellWidth: 30, fontStyle: 'bold', halign: 'right' }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body') {
        const meta = metaLinhasPlano[data.row.index];
        
        // Se a categoria for Pai (tiver subníveis), destaca a linha inteira aplicando negrito e tom cinza de subtotal
        if (meta && meta.isParent) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249]; // Cinza claro de destaque
        }
        
        // Pinta a identificação do fluxo (Receita/Despesa)
        if (data.column.index === 2) {
          if (data.cell.raw === 'RECEITA') {
            data.cell.styles.textColor = [16, 185, 129];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    },
    margin: { left: 15, right: 15 }
  });

  // Captura dinamicamente o fim da tabela gerencial para empurrar o extrato operacional
  const finalYPlano = (doc as any).lastAutoTable.finalY;

  // ================= SECTION B: TABELA DE LANÇAMENTOS OPERACIONAIS DIÁRIOS =================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Demonstrativo de Lançamentos Diários (Detalhamento)', 15, finalYPlano + 12);

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