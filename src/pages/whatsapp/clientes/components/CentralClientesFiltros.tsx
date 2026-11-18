import {
  Check,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  CentralClientesFiltros as Filtros,
  ClienteProdutoResumo,
  ResponsavelCentral,
} from '../types/centralClientes'

interface Props {
  filtros: Filtros
  responsaveis: ResponsavelCentral[]
  produtosDisponiveis: ClienteProdutoResumo[]
  buscaValida: boolean
  onChange: (patch: Partial<Filtros>) => void
  onReset: () => void
}

const DEBOUNCE_BUSCA_MS = 400
const MIN_CARACTERES_BUSCA = 3

export default function CentralClientesFiltros({
  filtros,
  responsaveis,
  produtosDisponiveis,
  onChange,
  onReset,
}: Props) {
  const [buscaDigitada, setBuscaDigitada] = useState(
    filtros.busca || ''
  )

  const [produtosAberto, setProdutosAberto] = useState(false)
  const [buscaProduto, setBuscaProduto] = useState('')

  const produtosRef = useRef<HTMLDivElement>(null)

  const termoBusca = buscaDigitada.trim()

  const buscaLocalValida =
    termoBusca.length === 0 ||
    termoBusca.length >= MIN_CARACTERES_BUSCA

  // A lista completa aparece mesmo sem digitar na pesquisa.
  const produtosDaLista = [...(produtosDisponiveis ?? [])].sort(
    (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')
  )
  const produtosSelecionados = filtros.produtoIds ?? []
  const semProdutos = filtros.semProdutos ?? false
  const quantidadeSelecionada = produtosSelecionados.length

  const produtosFiltrados = produtosDaLista.filter(produto =>
    produto.nome
      .toLocaleLowerCase('pt-BR')
      .includes(buscaProduto.trim().toLocaleLowerCase('pt-BR'))
  )

  const todosSelecionados =
    produtosDaLista.length > 0 &&
    produtosDaLista.every(produto =>
      produtosSelecionados.includes(produto.id)
    ) &&
    !semProdutos

  const tituloProdutos = semProdutos
    ? 'Sem produtos'
    : quantidadeSelecionada > 0
      ? `Produtos (${quantidadeSelecionada})`
      : 'Produtos'

  /*
   * Sincroniza o campo quando a busca for
   * alterada externamente, por exemplo
   * ao limpar todos os filtros.
   */
  useEffect(() => {
    setBuscaDigitada(filtros.busca || '')
  }, [filtros.busca])

  /*
   * A busca global não atualiza os filtros
   * a cada tecla.
   *
   * - vazio: limpa imediatamente;
   * - 1 ou 2 caracteres: não pesquisa;
   * - 3 ou mais: debounce de 400ms.
   */
  useEffect(() => {
    if (termoBusca.length === 0) {
      if (filtros.busca) {
        onChange({
          busca: '',
        })
      }

      return
    }

    if (termoBusca.length < MIN_CARACTERES_BUSCA) {
      return
    }

    if (termoBusca === filtros.busca.trim()) {
      return
    }

    const timeout = window.setTimeout(() => {
      onChange({
        busca: termoBusca,
      })
    }, DEBOUNCE_BUSCA_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    termoBusca,
    filtros.busca,
    onChange,
  ])

  /*
   * Fecha o seletor de produtos quando
   * o usuário clica fora dele.
   */
  useEffect(() => {
    if (!produtosAberto) return

    const fecharAoClicarFora = (event: MouseEvent) => {
      if (
        produtosRef.current &&
        !produtosRef.current.contains(event.target as Node)
      ) {
        setProdutosAberto(false)
      }
    }

    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProdutosAberto(false)
      }
    }

    document.addEventListener(
      'mousedown',
      fecharAoClicarFora
    )

    document.addEventListener(
      'keydown',
      fecharComEscape
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        fecharAoClicarFora
      )

      document.removeEventListener(
        'keydown',
        fecharComEscape
      )
    }
  }, [produtosAberto])

  // Múltiplos produtos: o cliente precisa ter ao menos um dos selecionados.
  const alternarProduto = (produtoId: string) => {
    const selecionado = produtosSelecionados.includes(produtoId)
    onChange({
      produtoIds: selecionado
        ? produtosSelecionados.filter(id => id !== produtoId)
        : [...produtosSelecionados, produtoId],
      semProdutos: false,
    })
  }

  // Marca todos os produtos disponíveis (independente da pesquisa).
  const selecionarTodos = () => {
    if (!produtosDaLista.length) return
    onChange({
      produtoIds: produtosDaLista.map(produto => produto.id),
      semProdutos: false,
    })
  }

  // Desmarca todos: a listagem fica sem restrição por produto.
  const desmarcarTodos = () => {
    onChange({
      produtoIds: [],
      semProdutos: false,
    })
  }

  // Exclusivo: clientes sem contrato/produto relacionado.
  const alternarSemProdutos = () => {
    onChange({
      semProdutos: !semProdutos,
      produtoIds: [],
    })
  }

  const limparFiltroProdutos = () => {
    desmarcarTodos()
    setBuscaProduto('')
  }

  const limparTodosFiltros = () => {
    setBuscaProduto('')
    setProdutosAberto(false)
    onReset()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        {/* BUSCA GLOBAL */}
        <div className="min-w-0 flex-1">
          <div
            className={`flex h-10 items-center gap-2 rounded-lg border bg-white px-3 ${
              buscaLocalValida
                ? 'border-slate-200 focus-within:border-blue-400'
                : 'border-amber-300'
            }`}
          >
            <Search
              size={16}
              className="text-slate-400"
            />

            <input
              value={buscaDigitada}
              onChange={event =>
                setBuscaDigitada(event.target.value)
              }
              placeholder="Nome, CPF/CNPJ, telefone, e-mail, município..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {!buscaLocalValida && (
            <p className="mt-1 text-[11px] text-amber-600">
              Digite pelo menos 3 caracteres para pesquisar.
            </p>
          )}
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:items-center">
          {/* TIPO */}
          <select
            value={filtros.tipo}
            onChange={event =>
              onChange({
                tipo: event.target.value as Filtros['tipo'],
              })
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="TODOS">
              Todos os tipos
            </option>

            <option value="PF">
              Pessoas
            </option>

            <option value="PJ">
              Empresas
            </option>
          </select>

          {/* CLASSIFICAÇÃO */}
          <select
            value={filtros.classificacao}
            onChange={event =>
              onChange({
                classificacao:
                  event.target.value as Filtros['classificacao'],
              })
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="TODOS">
              Classificação
            </option>

            <option value="NAO_QUALIFICADO">
              Não qualificado
            </option>

            <option value="LEAD">
              Lead
            </option>
          </select>

          {/* RESPONSÁVEL */}
          <select
            value={filtros.responsavelId}
            onChange={event =>
              onChange({
                responsavelId: event.target.value,
              })
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="">
              Responsável
            </option>

            {responsaveis.map(item => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.nome}
              </option>
            ))}
          </select>

          {/* COMPROMISSOS */}
          <select
            value={filtros.compromisso}
            onChange={event =>
              onChange({
                compromisso:
                  event.target.value as Filtros['compromisso'],
              })
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="TODOS">
              Compromissos
            </option>

            <option value="COM_COMPROMISSO">
              Com compromisso
            </option>

            <option value="SEM_COMPROMISSO">
              Sem compromisso
            </option>

            <option value="ATRASADO">
              Atrasados
            </option>
          </select>

          {/* PRODUTOS */}
          <div
            ref={produtosRef}
            className="relative min-w-0 xl:w-40"
          >
            <button
              type="button"
              onClick={() =>
                setProdutosAberto(atual => !atual)
              }
              aria-expanded={produtosAberto}
              aria-haspopup="true"
              className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-xs font-medium outline-none transition ${
                semProdutos || quantidadeSelecionada > 0
                  ? 'border-blue-400 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-blue-400'
              }`}
            >
              <span className="truncate">
                {tituloProdutos}
              </span>

              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${
                  produtosAberto ? 'rotate-180' : ''
                }`}
              />
            </button>

            {produtosAberto && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(340px,calc(100vw-32px))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Filtrar por produtos
                  </span>
                  <button
                    type="button"
                    onClick={limparFiltroProdutos}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Limpar
                  </button>
                </div>

                {/* Ações rápidas: selecionar todos ou nenhum */}
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={selecionarTodos}
                    disabled={produtosDaLista.length === 0}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      todosSelecionados
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={desmarcarTodos}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Desmarcar todos
                  </button>
                </div>

                {/* Sem produtos é diferente de desmarcar todos */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={semProdutos}
                    onChange={alternarSemProdutos}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Sem produtos relacionados
                  </span>
                </label>

                <div className="my-3 border-t border-slate-100" />

                {/* A pesquisa é opcional; a lista aparece imediatamente */}
                <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2">
                  <Search size={14} className="text-slate-400" />
                  <input
                    value={buscaProduto}
                    onChange={event => setBuscaProduto(event.target.value)}
                    placeholder="Pesquisar na lista (opcional)..."
                    className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Lista completa, com seleção individual */}
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  {produtosFiltrados.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {produtosDaLista.length === 0
                        ? 'Nenhum produto disponível. Verifique o carregamento no serviço.'
                        : 'Nenhum produto corresponde à pesquisa.'}
                    </div>
                  ) : (
                    produtosFiltrados.map(produto => {
                      const selecionado =
                        !semProdutos &&
                        produtosSelecionados.includes(produto.id)

                      return (
                        <label
                          key={produto.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => alternarProduto(produto.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
                          />
                          <span className="min-w-0 flex-1 text-xs text-slate-700">
                            {produto.nome}
                          </span>
                          {selecionado && (
                            <Check size={14} className="shrink-0 text-blue-600" />
                          )}
                        </label>
                      )
                    })
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-500">
                    {semProdutos
                      ? 'Clientes sem produtos'
                      : quantidadeSelecionada === 0
                        ? 'Sem restrição por produto'
                        : `${quantidadeSelecionada} produto(s) selecionado(s)`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProdutosAberto(false)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ORDENAÇÃO E AÇÕES */}
        <div className="flex gap-2">
          <select
            value={filtros.ordenacao}
            onChange={event =>
              onChange({
                ordenacao:
                  event.target.value as Filtros['ordenacao'],
              })
            }
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 xl:flex-none"
          >
            <option value="RECENTES">
              Mais recentes
            </option>

            <option value="NOME_ASC">
              Nome A-Z
            </option>

            <option value="NOME_DESC">
              Nome Z-A
            </option>

            <option value="PROXIMO_COMPROMISSO">
              Próximo compromisso
            </option>

            <option value="SEM_COMPROMISSO">
              Sem compromisso
            </option>
          </select>

          <button
            type="button"
            title="Limpar filtros"
            onClick={limparTodosFiltros}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <RotateCcw size={15} />
          </button>

          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 xl:flex">
            <Filter size={15} />
          </div>
        </div>
      </div>
    </div>
  )
}
