import { type AcessoClientes } from '../hooks/useAcessoClientes'
import type { ConfiguracaoExportacaoClientes } from '../components/ModalExportarClientes'
import {
  dataNomeArquivo,
  LABELS_CAMPOS,
  LABELS_GRUPOS,
  prepararClientesExportacao,
  valorAgrupamento,
  valorCampo,
  type ClienteExportacao,
} from './clientesExportacaoService'

function tratarPdf(valor: string): string {
  // Conteúdo originado do banco é texto, nunca instrução de formatação ou HTML.
  return valor || '—'
}

export async function exportarClientesPdf(
  config: ConfiguracaoExportacaoClientes,
  acesso: AcessoClientes
): Promise<number> {
  const clientes = await prepararClientesExportacao(config, acesso)
  const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const roteiro = config.modelo === 'ROTEIRO'
  const doc = new JsPDF({ orientation: roteiro ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' })
  const largura = doc.internal.pageSize.getWidth()
  const altura = doc.internal.pageSize.getHeight()
  const margem = 14
  const azul: [number, number, number] = [23, 54, 93]
  const titulo = roteiro ? 'ROTEIRO DE VISITAS' : 'RELATÓRIO DE CLIENTES'
  const emissao = new Date().toLocaleString('pt-BR')

  const cabecalho = (subtitulo: string) => {
    doc.setFillColor(...azul)
    doc.rect(0, 0, largura, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(titulo, margem, 11)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`SeguroCRM  |  Emissão: ${emissao}`, margem, 18)
    doc.setTextColor(...azul)
    doc.setFontSize(9)
    doc.text(subtitulo, margem, 31)
  }

  if (!roteiro) {
    cabecalho(`Total de clientes: ${clientes.length}`)
    const filtros = `Município: ${config.municipio || 'Todos'}  |  Bairro: ${config.bairro || 'Todos'}  |  Produtos: ${config.semProdutos ? 'Sem produtos' : config.produtoIds.length ? `${config.produtoIds.length} selecionado(s)` : 'Todos'}`
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(doc.splitTextToSize(filtros, largura - 2 * margem), margem, 37)

    const linhas: Array<{ valores: string[]; grupo: boolean; nivel?: number }> = []
    let grupo1: string | null = null
    let grupo2: string | null = null
    for (const item of clientes) {
      if (config.agrupamentoPrimario !== 'NENHUM') {
        const valor = valorAgrupamento(item, config.agrupamentoPrimario, config.produtoIds)
        if (valor !== grupo1) {
          linhas.push({ grupo: true, nivel: 1, valores: [`${LABELS_GRUPOS[config.agrupamentoPrimario]}: ${valor}`] })
          grupo1 = valor
          grupo2 = null
        }
      }
      if (config.agrupamentoSecundario !== 'NENHUM') {
        const valor = valorAgrupamento(item, config.agrupamentoSecundario, config.produtoIds)
        if (valor !== grupo2) {
          linhas.push({ grupo: true, nivel: 2, valores: [`${LABELS_GRUPOS[config.agrupamentoSecundario]}: ${valor}`] })
          grupo2 = valor
        }
      }
      linhas.push({ grupo: false, valores: config.campos.map(campo => valorCampo(item, campo)) })
    }

    // Agrupamentos são linhas separadas com mesclagem horizontal.
    const body = linhas.map(linha => linha.grupo
      ? [{ content: linha.valores[0], colSpan: config.campos.length, styles: { fillColor: linha.nivel === 1 ? [224, 235, 246] as [number, number, number] : [242, 246, 249] as [number, number, number], textColor: azul, fontStyle: 'bold' as const } }]
      : linha.valores
    )
    autoTable(doc, {
      head: [config.campos.map(campo => LABELS_CAMPOS[campo])],
      body,
      startY: 45,
      theme: 'grid',
      margin: { left: margem, right: margem, top: 30, bottom: 16 },
      styles: { font: 'helvetica', fontSize: config.campos.length > 10 ? 6 : 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: azul, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: data => {
        if (data.pageNumber > 1) cabecalho(`Total de clientes: ${clientes.length}`)
      },
    })
  } else {
    // Uma ficha por cliente com espaço para preenchimento manual.
    // A margem de cada ficha é respeitada independentemente da quantidade de campos.
    const alturaCampo = (rotulo: string, valor: string, larguraDisponivel: number) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const larguraRotulo = doc.getTextWidth(`${rotulo}:`) + 3
      doc.setFont('helvetica', 'normal')
      const linhas = doc.splitTextToSize(tratarPdf(valor), Math.max(30, larguraDisponivel - larguraRotulo)) as string[]
      return { larguraRotulo, linhas, altura: Math.max(7, linhas.length * 5 + 2) }
    }
    const desenharCampo = (rotulo: string, valor: string, y: number, larguraDisponivel: number): number => {
      const info = alturaCampo(rotulo, valor, larguraDisponivel)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...azul)
      doc.text(`${rotulo}:`, margem, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(44, 56, 72)
      doc.text(info.linhas, margem + info.larguraRotulo, y)
      return y + info.altura
    }

    clientes.forEach((item: ClienteExportacao, indice) => {
      if (indice > 0) doc.addPage()
      const bairro = item.endereco.bairro || 'Bairro não informado'
      const cidade = item.endereco.municipio || 'Município não informado'
      const subtitulo = `${indice + 1} de ${clientes.length}  |  ${cidade} / ${item.endereco.uf || '--'} — ${bairro}`
      cabecalho(subtitulo)
      let y = 42
      for (const campo of config.campos) {
        const valor = valorCampo(item, campo)
        const alturaNecessaria = alturaCampo(LABELS_CAMPOS[campo], valor, largura - margem * 2).altura
        if (y + alturaNecessaria > 157) {
          doc.addPage()
          cabecalho(`${subtitulo} — continuação`)
          y = 42
        }
        y = desenharCampo(LABELS_CAMPOS[campo], valor, y, largura - margem * 2)
      }
      // Caso o conteúdo ultrapasse a área de dados, ele continua em outra página.
      // Uma área fixa na parte inferior é preservada para anotações manuscritas.
      const inicioVisita = Math.max(163, Math.min(y + 5, 189))
      doc.setDrawColor(205, 215, 224)
      doc.line(margem, inicioVisita, largura - margem, inicioVisita)
      doc.setTextColor(...azul)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('REGISTRO DA VISITA', margem, inicioVisita + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Data: ____/____/________', margem, inicioVisita + 17)
      doc.text('[  ] Realizada    [  ] Não encontrado    [  ] Reagendar', margem, inicioVisita + 25)
      doc.text('Resultado / Oportunidade:', margem, inicioVisita + 34)
      const quantidadeLinhas = config.espacoAnotacoes === 'AMPLIADO' ? 7 : 4
      const yInicioLinhas = inicioVisita + 45
      const yMax = altura - 23
      const intervalo = Math.min(9, (yMax - yInicioLinhas) / Math.max(1, quantidadeLinhas))
      doc.setDrawColor(180, 190, 200)
      for (let i = 0; i < quantidadeLinhas; i++) {
        const linhaY = yInicioLinhas + i * intervalo
        if (linhaY < yMax) doc.line(margem, linhaY, largura - margem, linhaY)
      }
      doc.setTextColor(80, 90, 100)
      doc.setFontSize(8)
      doc.text('Próximo contato: ____/____/________', margem, altura - 13)
    })
  }

  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 100, 112)
    doc.text(`SeguroCRM  |  Página ${pagina} de ${paginas}`, largura - margem, altura - 7, { align: 'right' })
  }
  doc.save(`SeguroCRM_${roteiro ? 'Roteiro_Visitas' : 'Relatorio_Clientes'}_${dataNomeArquivo()}.pdf`)
  return clientes.length
}
