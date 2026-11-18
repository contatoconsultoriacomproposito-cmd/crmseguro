import { type AcessoClientes, podeCliente } from '../hooks/useAcessoClientes'
import { buscarClientesCentral } from './centralClientesService'
import { FILTROS_INICIAIS, type CentralClientesFiltros, type ClienteCentral } from '../types/centralClientes'
import {
  AGRUPAMENTOS_EXPORTACAO,
  CAMPOS_EXPORTACAO,
  type AgrupamentoExportacaoClientes,
  type CampoExportacaoClientes,
  type ConfiguracaoExportacaoClientes,
} from '../components/ModalExportarClientes'

export interface EnderecoExportacao {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
}
export interface ClienteExportacao {
  cliente: ClienteCentral
  endereco: EnderecoExportacao
}

const TAMANHO_PAGINA = 100
export const LABELS_CAMPOS = Object.fromEntries(CAMPOS_EXPORTACAO.map(campo => [campo.id, campo.label])) as Record<CampoExportacaoClientes, string>
export const LABELS_GRUPOS = Object.fromEntries(AGRUPAMENTOS_EXPORTACAO.map(item => [item.value, item.label])) as Record<AgrupamentoExportacaoClientes, string>

function texto(valor: unknown): string {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor).trim() : ''
}
function normalizar(valor: unknown): string {
  return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export function enderecoPrincipal(dados: Record<string, any>): EnderecoExportacao {
  const lista: any[] = Array.isArray(dados.enderecos) ? dados.enderecos : []
  const endereco = lista.find(item => item?.principal) ?? lista[0] ?? dados.endereco ?? {}
  return {
    logradouro: texto(endereco.logradouro ?? endereco.rua),
    numero: texto(endereco.numero),
    complemento: texto(endereco.complemento),
    bairro: texto(endereco.bairro),
    municipio: texto(endereco.municipio ?? dados.municipio),
    uf: texto(endereco.uf ?? dados.uf),
    cep: texto(endereco.cep),
  }
}

export function valorCampo(item: ClienteExportacao, campo: CampoExportacaoClientes): string {
  const { cliente, endereco } = item
  switch (campo) {
    case 'nome': return cliente.nome
    case 'tipo': return cliente.tipo
    case 'documento': return texto(cliente.documento)
    case 'telefone': return texto(cliente.telefone)
    case 'email': return texto(cliente.email)
    case 'produtos': return cliente.produtos.map(p => p.nome).filter(Boolean).join(', ')
    case 'logradouro': return endereco.logradouro
    case 'numero': return endereco.numero
    case 'complemento': return endereco.complemento
    case 'bairro': return endereco.bairro
    case 'municipio': return endereco.municipio
    case 'uf': return endereco.uf
    case 'cep': return endereco.cep
    case 'responsavel': return cliente.responsavelNome
    case 'classificacao': return cliente.classificacao === 'LEAD' ? 'Lead' : 'Não qualificado'
    case 'proximoCompromisso': {
      if (!cliente.proximoCompromisso) return ''
      const data = new Date(cliente.proximoCompromisso.inicioEm)
      return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR')
    }
  }
}

export function valorAgrupamento(
  item: ClienteExportacao,
  tipo: AgrupamentoExportacaoClientes,
  produtoIds: string[]
): string {
  const { cliente, endereco } = item
  switch (tipo) {
    case 'MUNICIPIO': return endereco.municipio || 'Município não informado'
    case 'BAIRRO': return endereco.bairro || 'Bairro não informado'
    case 'RESPONSAVEL': return cliente.responsavelNome || 'Não informado'
    case 'TIPO': return cliente.tipo === 'PF' ? 'Pessoas' : 'Empresas'
    case 'PRODUTO': {
      // Um cliente pode ter vários produtos; para evitar duplicação no relatório,
      // agrupamos pelo primeiro produto selecionado que esteja vinculado, ou pelo primeiro vínculo.
      const produto = cliente.produtos.find(p => produtoIds.includes(p.id)) ?? cliente.produtos[0]
      return produto?.nome || 'Sem produtos'
    }
    default: return ''
  }
}

export function ordenarExportacao(
  itens: ClienteExportacao[],
  config: ConfiguracaoExportacaoClientes
): ClienteExportacao[] {
  return [...itens].sort((a, b) => {
    for (const tipo of [config.agrupamentoPrimario, config.agrupamentoSecundario]) {
      if (tipo === 'NENHUM') continue
      const ordem = valorAgrupamento(a, tipo, config.produtoIds).localeCompare(
        valorAgrupamento(b, tipo, config.produtoIds), 'pt-BR'
      )
      if (ordem !== 0) return ordem
    }
    if (config.modelo === 'ROTEIRO') {
      const ordemEndereco = [a.endereco.municipio, a.endereco.bairro, a.endereco.logradouro, a.endereco.numero]
        .join(' ').localeCompare([b.endereco.municipio, b.endereco.bairro, b.endereco.logradouro, b.endereco.numero].join(' '), 'pt-BR')
      if (ordemEndereco) return ordemEndereco
    }
    return a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR')
  })
}

function filtrosBase(config: ConfiguracaoExportacaoClientes): CentralClientesFiltros {
  // Combina filtros atuais e filtros do modal. Quando a Central não possui filtro de
  // produtos ativo, aplica o filtro do modal já na consulta, antes da paginação.
  const filtros: CentralClientesFiltros = config.usarFiltrosAtuais && config.filtrosAtuais
    ? { ...config.filtrosAtuais, produtoIds: [...config.filtrosAtuais.produtoIds] }
    : { ...FILTROS_INICIAIS, produtoIds: [] }
  if (!filtros.semProdutos && filtros.produtoIds.length === 0) {
    filtros.semProdutos = config.semProdutos
    filtros.produtoIds = config.semProdutos ? [] : [...config.produtoIds]
  }
  return filtros
}

async function buscarCarteira(filtros: CentralClientesFiltros, acesso: AcessoClientes): Promise<ClienteCentral[]> {
  const primeira = await buscarClientesCentral(filtros, acesso, 1, TAMANHO_PAGINA)
  const clientes = [...primeira.clientes]
  for (let pagina = 2; pagina <= primeira.paginacao.totalPaginas; pagina++) {
    const resposta = await buscarClientesCentral(filtros, acesso, pagina, TAMANHO_PAGINA)
    clientes.push(...resposta.clientes)
  }
  const unicos = new Map<string, ClienteCentral>()
  for (const cliente of clientes) unicos.set(`${cliente.tipo}:${cliente.id}`, cliente)
  return [...unicos.values()]
}

export async function prepararClientesExportacao(
  config: ConfiguracaoExportacaoClientes,
  acesso: AcessoClientes
): Promise<ClienteExportacao[]> {
  if (!podeCliente(acesso, 'read') || !podeCliente(acesso, 'view_cadastro')) {
    throw new Error('Sem permissão de leitura e visualização cadastral para exportar clientes.')
  }
  if (!config.campos.length) throw new Error('Selecione pelo menos uma informação para exportar.')

  const clientes = await buscarCarteira(filtrosBase(config), acesso)
  const itens: ClienteExportacao[] = clientes
    .filter(cliente => podeCliente(acesso, 'read', cliente) && podeCliente(acesso, 'view_cadastro', cliente))
    .map(cliente => ({ cliente, endereco: enderecoPrincipal(cliente.dados || {}) }))

  const filtrados = itens.filter(({ cliente, endereco }) => {
    if (config.tipo !== 'TODOS' && cliente.tipo !== config.tipo) return false
    if (config.responsavelId && cliente.corretorId !== config.responsavelId) return false
    if (config.municipio && !normalizar(endereco.municipio).includes(normalizar(config.municipio))) return false
    if (config.bairro && !normalizar(endereco.bairro).includes(normalizar(config.bairro))) return false
    if (config.semProdutos) return cliente.produtos.length === 0
    if (config.produtoIds.length) return cliente.produtos.some(p => config.produtoIds.includes(p.id))
    return true
  })

  if (!filtrados.length) throw new Error('Nenhum cliente encontrado para os filtros selecionados.')
  return ordenarExportacao(filtrados, config)
}

export function dataNomeArquivo(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

export async function exportarClientesExcel(
  config: ConfiguracaoExportacaoClientes,
  acesso: AcessoClientes
): Promise<number> {
  const clientes = await prepararClientesExportacao(config, acesso)
  // Carregamento sob demanda evita acrescentar exceljs ao pacote inicial do sistema.
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SeguroCRM'
  workbook.created = new Date()
  const ws = workbook.addWorksheet(config.modelo === 'ROTEIRO' ? 'Roteiro de Visitas' : 'Relatório de Clientes')

  const adicionais = config.modelo === 'ROTEIRO' ? ['Visitado?', 'Data da visita', 'Resultado', 'Observações'] : []
  const totalColunas = config.campos.length + adicionais.length
  const totalCor = 'FF17365D'
  const titulo = config.modelo === 'ROTEIRO' ? 'ROTEIRO DE VISITAS' : 'RELATÓRIO DE CLIENTES'

  ws.mergeCells(1, 1, 1, totalColunas)
  ws.getCell(1, 1).value = titulo
  ws.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalCor } }
  ws.getCell(1, 1).alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 34

  ws.mergeCells(2, 1, 2, totalColunas)
  ws.getCell(2, 1).value = `Emissão: ${new Date().toLocaleString('pt-BR')}    |    Clientes: ${clientes.length}`
  ws.getRow(2).height = 22
  ws.mergeCells(3, 1, 3, totalColunas)
  ws.getCell(3, 1).value = `Município: ${config.municipio || 'Todos'}    |    Bairro: ${config.bairro || 'Todos'}    |    Produto(s): ${config.semProdutos ? 'Sem produtos' : config.produtoIds.length ? `${config.produtoIds.length} selecionado(s)` : 'Todos'}`
  ws.getRow(3).height = 22

  const cabecalhos = [...config.campos.map(id => LABELS_CAMPOS[id]), ...adicionais]
  const linhaCabecalho = ws.getRow(5)
  for (let i = 0; i < cabecalhos.length; i++) {
    const cell = linhaCabecalho.getCell(i + 1)
    cell.value = cabecalhos[i]
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalCor } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  }
  linhaCabecalho.height = 30
  for (let i = 0; i < config.campos.length; i++) {
    ws.getColumn(i + 1).width = CAMPOS_EXPORTACAO.find(c => c.id === config.campos[i])?.largura ?? 22
  }
  if (adicionais.length) [14, 18, 24, 36].forEach((largura, i) => { ws.getColumn(config.campos.length + i + 1).width = largura })
  let ultimoGrupo1: string | null = null
  let ultimoGrupo2: string | null = null
  const adicionarGrupo = (nome: string, nivel: number) => {
    const row = ws.addRow([nome])
    ws.mergeCells(row.number, 1, row.number, totalColunas)
    row.height = 24
    const cell = row.getCell(1)
    cell.font = { bold: true, color: { argb: totalCor }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: nivel === 1 ? 'FFDCEAF7' : 'FFF1F5F9' } }
    cell.alignment = { vertical: 'middle', indent: nivel === 1 ? 0 : 1 }
  }
  clientes.forEach((item, i) => {
    if (config.agrupamentoPrimario !== 'NENHUM') {
      const grupo = valorAgrupamento(item, config.agrupamentoPrimario, config.produtoIds)
      if (grupo !== ultimoGrupo1) {
        adicionarGrupo(`${LABELS_GRUPOS[config.agrupamentoPrimario]}: ${grupo}`, 1)
        ultimoGrupo1 = grupo
        ultimoGrupo2 = null
      }
    }
    if (config.agrupamentoSecundario !== 'NENHUM') {
      const grupo = valorAgrupamento(item, config.agrupamentoSecundario, config.produtoIds)
      if (grupo !== ultimoGrupo2) {
        adicionarGrupo(`${LABELS_GRUPOS[config.agrupamentoSecundario]}: ${grupo}`, 2)
        ultimoGrupo2 = grupo
      }
    }
    const valores: string[] = config.campos.map(id => valorCampo(item, id))
    if (config.modelo === 'ROTEIRO') valores.push('', '', '', '')
    const linha = ws.addRow(valores)
    linha.height = config.modelo === 'ROTEIRO' ? 31 : 24
    linha.eachCell({ includeEmpty: true }, cell => {
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.font = { size: 10, color: { argb: totalCor } }
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
      if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    })
  })
  const total = ws.addRow([`TOTAL DE CLIENTES: ${clientes.length}`])
  ws.mergeCells(total.number, 1, total.number, totalColunas)
  total.height = 27
  total.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  total.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } }
  total.getCell(1).alignment = { vertical: 'middle', indent: 1 }

  ws.views = [{ state: 'frozen', ySplit: 5 }]
  ws.pageSetup.paperSize = 9 // A4
  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.fitToPage = true
  ws.pageSetup.fitToWidth = 1
  ws.pageSetup.fitToHeight = 0
  ws.pageSetup.printTitlesRow = '1:5'
  ws.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  ws.headerFooter.oddFooter = '&LSeguroCRM&CClientes&R Página &P de &N'

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `SeguroCRM_${config.modelo === 'ROTEIRO' ? 'Roteiro_Visitas' : 'Relatorio_Clientes'}_${dataNomeArquivo()}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return clientes.length
}
