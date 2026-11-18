import { FileDown, FileSpreadsheet, FileText, MapPinned, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  CentralClientesFiltros,
  ClienteProdutoResumo,
  ResponsavelCentral,
} from '../types/centralClientes'

export type ModeloExportacaoClientes = 'RELATORIO' | 'ROTEIRO'
export type FormatoExportacaoClientes = 'EXCEL' | 'PDF'
export type EspacoAnotacoes = 'REDUZIDO' | 'AMPLIADO'
export type CampoExportacaoClientes =
  | 'nome' | 'tipo' | 'documento' | 'telefone' | 'email'
  | 'produtos' | 'logradouro' | 'numero' | 'complemento'
  | 'bairro' | 'municipio' | 'uf' | 'cep' | 'responsavel'
  | 'classificacao' | 'proximoCompromisso'
export type AgrupamentoExportacaoClientes =
  | 'NENHUM' | 'MUNICIPIO' | 'BAIRRO' | 'PRODUTO' | 'RESPONSAVEL' | 'TIPO'

export interface ConfiguracaoExportacaoClientes {
  modelo: ModeloExportacaoClientes
  formato: FormatoExportacaoClientes
  espacoAnotacoes: EspacoAnotacoes
  usarFiltrosAtuais: boolean
  filtrosAtuais: CentralClientesFiltros | null
  tipo: 'TODOS' | 'PF' | 'PJ'
  responsavelId: string
  produtoIds: string[]
  semProdutos: boolean
  municipio: string
  bairro: string
  campos: CampoExportacaoClientes[]
  agrupamentoPrimario: AgrupamentoExportacaoClientes
  agrupamentoSecundario: AgrupamentoExportacaoClientes
}

interface Props {
  open: boolean
  onClose: () => void
  onExportar: (config: ConfiguracaoExportacaoClientes) => Promise<void>
  produtosDisponiveis: ClienteProdutoResumo[]
  responsaveis: ResponsavelCentral[]
  filtrosAtuais?: CentralClientesFiltros
}

export const CAMPOS_EXPORTACAO: Array<{ id: CampoExportacaoClientes; label: string; largura: number }> = [
  { id: 'nome', label: 'Nome / Razão social', largura: 34 },
  { id: 'tipo', label: 'Tipo PF / PJ', largura: 12 },
  { id: 'documento', label: 'CPF / CNPJ', largura: 20 },
  { id: 'telefone', label: 'Telefone / WhatsApp', largura: 23 },
  { id: 'email', label: 'E-mail', largura: 32 },
  { id: 'produtos', label: 'Produtos relacionados', largura: 38 },
  { id: 'logradouro', label: 'Logradouro', largura: 33 },
  { id: 'numero', label: 'Número', largura: 11 },
  { id: 'complemento', label: 'Complemento', largura: 23 },
  { id: 'bairro', label: 'Bairro', largura: 23 },
  { id: 'municipio', label: 'Município', largura: 25 },
  { id: 'uf', label: 'UF', largura: 8 },
  { id: 'cep', label: 'CEP', largura: 15 },
  { id: 'responsavel', label: 'Corretor responsável', largura: 27 },
  { id: 'classificacao', label: 'Classificação', largura: 19 },
  { id: 'proximoCompromisso', label: 'Próximo compromisso', largura: 23 },
]

export const AGRUPAMENTOS_EXPORTACAO: Array<{ value: AgrupamentoExportacaoClientes; label: string }> = [
  { value: 'NENHUM', label: 'Sem agrupamento' },
  { value: 'MUNICIPIO', label: 'Município' },
  { value: 'BAIRRO', label: 'Bairro' },
  { value: 'PRODUTO', label: 'Produto' },
  { value: 'RESPONSAVEL', label: 'Corretor responsável' },
  { value: 'TIPO', label: 'Pessoas / Empresas' },
]

const CAMPOS_RELATORIO: CampoExportacaoClientes[] = [
  'nome', 'tipo', 'documento', 'telefone', 'produtos', 'bairro', 'municipio', 'uf', 'responsavel',
]
const CAMPOS_ROTEIRO: CampoExportacaoClientes[] = [
  'nome', 'telefone', 'produtos', 'logradouro', 'numero', 'complemento',
  'bairro', 'municipio', 'uf', 'cep', 'responsavel',
]
const CLASSE_INPUT = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400'
const CLASSE_LABEL = 'mb-1 block text-xs font-semibold text-slate-600'

export default function ModalExportarClientes({
  open, onClose, onExportar, produtosDisponiveis, responsaveis, filtrosAtuais,
}: Props) {
  const [modelo, setModelo] = useState<ModeloExportacaoClientes>('RELATORIO')
  const [formato, setFormato] = useState<FormatoExportacaoClientes>('EXCEL')
  const [espacoAnotacoes, setEspacoAnotacoes] = useState<EspacoAnotacoes>('AMPLIADO')
  const [usarFiltrosAtuais, setUsarFiltrosAtuais] = useState(false)
  const [tipo, setTipo] = useState<'TODOS' | 'PF' | 'PJ'>('TODOS')
  const [responsavelId, setResponsavelId] = useState('')
  const [produtoIds, setProdutoIds] = useState<string[]>([])
  const [semProdutos, setSemProdutos] = useState(false)
  const [municipio, setMunicipio] = useState('')
  const [bairro, setBairro] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [campos, setCampos] = useState<CampoExportacaoClientes[]>(CAMPOS_RELATORIO)
  const [agrupamentoPrimario, setAgrupamentoPrimario] = useState<AgrupamentoExportacaoClientes>('NENHUM')
  const [agrupamentoSecundario, setAgrupamentoSecundario] = useState<AgrupamentoExportacaoClientes>('NENHUM')
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setModelo('RELATORIO')
    setFormato('EXCEL')
    setEspacoAnotacoes('AMPLIADO')
    setUsarFiltrosAtuais(false)
    setTipo('TODOS')
    setResponsavelId('')
    setProdutoIds([])
    setSemProdutos(false)
    setMunicipio('')
    setBairro('')
    setBuscaProduto('')
    setCampos([...CAMPOS_RELATORIO])
    setAgrupamentoPrimario('NENHUM')
    setAgrupamentoSecundario('NENHUM')
    setErro(null)
  }, [open])

  useEffect(() => {
    if (!open || exportando) return
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [open, onClose, exportando])

  const produtos = useMemo(
    () => [...(produtosDisponiveis ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtosDisponiveis]
  )
  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLocaleLowerCase('pt-BR')
    return termo ? produtos.filter(produto => produto.nome.toLocaleLowerCase('pt-BR').includes(termo)) : produtos
  }, [produtos, buscaProduto])

  const todosProdutosSelecionados = produtos.length > 0 && produtos.every(item => produtoIds.includes(item.id))
  const alternarProduto = (id: string) => {
    setSemProdutos(false)
    setProdutoIds(atuais => atuais.includes(id) ? atuais.filter(item => item !== id) : [...atuais, id])
  }
  const alternarCampo = (id: CampoExportacaoClientes) => {
    setCampos(atuais => atuais.includes(id) ? atuais.filter(item => item !== id) : [...atuais, id])
  }
  const alterarModelo = (valor: ModeloExportacaoClientes) => {
    setModelo(valor)
    setCampos(valor === 'ROTEIRO' ? [...CAMPOS_ROTEIRO] : [...CAMPOS_RELATORIO])
    setAgrupamentoPrimario(valor === 'ROTEIRO' ? 'MUNICIPIO' : 'NENHUM')
    setAgrupamentoSecundario(valor === 'ROTEIRO' ? 'BAIRRO' : 'NENHUM')
  }

  const exportar = async () => {
    if (exportando || campos.length === 0) return
    const config: ConfiguracaoExportacaoClientes = {
      modelo, formato, espacoAnotacoes, usarFiltrosAtuais,
      filtrosAtuais: usarFiltrosAtuais && filtrosAtuais
        ? { ...filtrosAtuais, produtoIds: [...filtrosAtuais.produtoIds] }
        : null,
      tipo, responsavelId, produtoIds: [...produtoIds], semProdutos,
      municipio: municipio.trim(), bairro: bairro.trim(), campos: [...campos],
      agrupamentoPrimario, agrupamentoSecundario,
    }
    setErro(null)
    setExportando(true)
    try {
      await onExportar(config)
      onClose()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível exportar os clientes.')
    } finally {
      setExportando(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 md:p-6"
      onMouseDown={event => { if (event.target === event.currentTarget && !exportando) onClose() }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-exportar-clientes"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><FileDown size={23} /></div>
            <div>
              <h2 id="titulo-exportar-clientes" className="text-lg font-bold text-slate-900">Exportar clientes</h2>
              <p className="mt-1 text-xs text-slate-500">Escolha o formato, os filtros, as informações e os agrupamentos.</p>
            </div>
          </div>
          <button type="button" aria-label="Fechar" disabled={exportando} onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={19}/></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-800">Modelo de relatório</h3>
              <div className="flex flex-col gap-2">
                {(['RELATORIO', 'ROTEIRO'] as ModeloExportacaoClientes[]).map(valor => (
                  <button key={valor} type="button" onClick={() => alterarModelo(valor)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold ${modelo === valor ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700'}`}>
                    {valor === 'ROTEIRO' ? <MapPinned size={18}/> : <FileSpreadsheet size={18}/>}
                    {valor === 'ROTEIRO' ? 'Roteiro de visitas' : 'Relatório de clientes'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-800">Formato do arquivo</h3>
              <div className="flex flex-col gap-2">
                {(['EXCEL', 'PDF'] as FormatoExportacaoClientes[]).map(valor => (
                  <button key={valor} type="button" onClick={() => setFormato(valor)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold ${formato === valor ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700'}`}>
                    {valor === 'EXCEL' ? <FileSpreadsheet size={18}/> : <FileText size={18}/>}
                    {valor === 'EXCEL' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 text-sm font-bold text-slate-800">Filtros do relatório</h3>
            {filtrosAtuais && (
              <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 p-3">
                <input type="checkbox" checked={usarFiltrosAtuais} onChange={e => setUsarFiltrosAtuais(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                <span className="text-xs font-medium text-slate-700">Aplicar também os filtros atuais da Central de Clientes</span>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={CLASSE_LABEL}>Tipo de cliente</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as 'TODOS' | 'PF' | 'PJ')} className={CLASSE_INPUT}>
                  <option value="TODOS">Pessoas e empresas</option><option value="PF">Somente pessoas</option><option value="PJ">Somente empresas</option>
                </select>
              </div>
              <div><label className={CLASSE_LABEL}>Corretor responsável</label>
                <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)} className={CLASSE_INPUT}>
                  <option value="">Todos os responsáveis</option>
                  {responsaveis.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </div>
              <div><label className={CLASSE_LABEL}>Município</label>
                <input className={CLASSE_INPUT} value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Ex.: Imbituba" />
              </div>
              <div><label className={CLASSE_LABEL}>Bairro</label>
                <input className={CLASSE_INPUT} value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Ex.: Centro" />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-600">Produtos relacionados</label>
                <div className="flex gap-3">
                  <button type="button" disabled={!produtos.length} onClick={() => { setProdutoIds(produtos.map(p => p.id)); setSemProdutos(false) }} className="text-xs font-semibold text-blue-600 disabled:opacity-40">Todos</button>
                  <button type="button" onClick={() => { setProdutoIds([]); setSemProdutos(false) }} className="text-xs font-semibold text-slate-500">Desmarcar todos</button>
                </div>
              </div>
              <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 p-3">
                <input type="checkbox" checked={semProdutos} onChange={e => { setSemProdutos(e.target.checked); if (e.target.checked) setProdutoIds([]) }} className="h-4 w-4 accent-blue-600" />
                <span className="text-xs font-medium text-slate-700">Sem produtos relacionados</span>
              </label>
              <div className="mb-2 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3">
                <Search size={15} className="text-slate-400" />
                <input value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} placeholder="Pesquisar na lista (opcional)..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {produtosFiltrados.length === 0 ? (
                  <p className="p-3 text-center text-xs text-slate-400">{produtos.length ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.'}</p>
                ) : produtosFiltrados.map(item => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <input type="checkbox" checked={!semProdutos && produtoIds.includes(item.id)} onChange={() => alternarProduto(item.id)} className="h-4 w-4 accent-blue-600" />
                    <span className="text-xs text-slate-700">{item.nome}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {semProdutos ? 'Clientes sem produtos relacionados.' : todosProdutosSelecionados ? 'Todos os produtos selecionados.' : produtoIds.length ? `${produtoIds.length} produto(s) selecionado(s).` : 'Sem restrição por produto.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">Informações a exportar</h3>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCampos(CAMPOS_EXPORTACAO.map(c => c.id))} className="text-xs font-semibold text-blue-600">Selecionar todos</button>
                <button type="button" onClick={() => setCampos([])} className="text-xs font-semibold text-slate-500">Nenhum</button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_EXPORTACAO.map(campo => (
                <label key={campo.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50">
                  <input type="checkbox" checked={campos.includes(campo.id)} onChange={() => alternarCampo(campo.id)} className="h-4 w-4 accent-blue-600" />
                  <span className="text-xs text-slate-700">{campo.label}</span>
                </label>
              ))}
            </div>
            {!campos.length && <p className="mt-2 text-xs text-amber-600">Selecione pelo menos uma informação.</p>}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 text-sm font-bold text-slate-800">Agrupamentos e organização</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={CLASSE_LABEL}>Primeiro agrupamento</label>
                <select value={agrupamentoPrimario} onChange={e => {
                  const valor = e.target.value as AgrupamentoExportacaoClientes
                  setAgrupamentoPrimario(valor)
                  if (valor === 'NENHUM' || valor === agrupamentoSecundario) setAgrupamentoSecundario('NENHUM')
                }} className={CLASSE_INPUT}>
                  {AGRUPAMENTOS_EXPORTACAO.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div><label className={CLASSE_LABEL}>Segundo agrupamento</label>
                <select value={agrupamentoSecundario} disabled={agrupamentoPrimario === 'NENHUM'}
                  onChange={e => setAgrupamentoSecundario(e.target.value as AgrupamentoExportacaoClientes)}
                  className={`${CLASSE_INPUT} disabled:bg-slate-50 disabled:text-slate-400`}>
                  {AGRUPAMENTOS_EXPORTACAO.filter(item => item.value === 'NENHUM' || item.value !== agrupamentoPrimario).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            {modelo === 'ROTEIRO' && formato === 'PDF' && (
              <div className="mt-4">
                <label className={CLASSE_LABEL}>Espaço para anotações no PDF</label>
                <select value={espacoAnotacoes} onChange={e => setEspacoAnotacoes(e.target.value as EspacoAnotacoes)} className={CLASSE_INPUT}>
                  <option value="REDUZIDO">Reduzido — mais espaço para informações</option>
                  <option value="AMPLIADO">Ampliado — ficha de visita com mais linhas</option>
                </select>
              </div>
            )}
            {modelo === 'ROTEIRO' && <p className="mt-3 text-xs text-blue-700">O roteiro terá campos de visita, resultado e anotações; no PDF, uma ficha por cliente.</p>}
          </div>
          {erro && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{erro}</div>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 md:px-6">
          <span className="text-xs text-slate-500">{campos.length} informação(ões) selecionada(s)</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={exportando} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void exportar()} disabled={exportando || !campos.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <FileDown size={17} />{exportando ? 'Gerando arquivo...' : `Exportar ${formato === 'PDF' ? 'PDF' : 'Excel'}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
