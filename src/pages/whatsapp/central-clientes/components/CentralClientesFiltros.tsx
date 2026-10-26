import {
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import type {
  CentralClientesFiltros as Filtros,
  ResponsavelCentral,
} from '../types/centralClientes'

interface Props {
  filtros: Filtros
  responsaveis: ResponsavelCentral[]
  buscaValida: boolean
  onChange: (patch: Partial<Filtros>) => void
  onReset: () => void
}

const DEBOUNCE_BUSCA_MS = 400
const MIN_CARACTERES_BUSCA = 3

export default function CentralClientesFiltros({
  filtros,
  responsaveis,
  onChange,
  onReset,
}: Props) {
  const [
    buscaDigitada,
    setBuscaDigitada,
  ] = useState(
    filtros.busca || ''
  )

  const termoBusca =
    buscaDigitada.trim()

  const buscaLocalValida =
    termoBusca.length === 0 ||
    termoBusca.length >=
      MIN_CARACTERES_BUSCA

  /*
   * Sincroniza o campo quando a busca
   * for alterada externamente, por exemplo
   * ao limpar todos os filtros.
   */
  useEffect(() => {
    setBuscaDigitada(
      filtros.busca || ''
    )
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
    if (
      termoBusca.length === 0
    ) {
      if (filtros.busca) {
        onChange({
          busca: '',
        })
      }

      return
    }

    if (
      termoBusca.length <
      MIN_CARACTERES_BUSCA
    ) {
      return
    }

    if (
      termoBusca ===
      filtros.busca.trim()
    ) {
      return
    }

    const timeout =
      window.setTimeout(() => {
        onChange({
          busca: termoBusca,
        })
      }, DEBOUNCE_BUSCA_MS)

    return () => {
      window.clearTimeout(
        timeout
      )
    }
  }, [
    termoBusca,
    filtros.busca,
    onChange,
  ])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
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
                setBuscaDigitada(
                  event.target.value
                )
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex">
          <select
            value={filtros.tipo}
            onChange={event =>
              onChange({
                tipo:
                  event.target
                    .value as Filtros['tipo'],
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

          <select
            value={
              filtros.classificacao
            }
            onChange={event =>
              onChange({
                classificacao:
                  event.target
                    .value as Filtros['classificacao'],
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

          <select
            value={
              filtros.responsavelId
            }
            onChange={event =>
              onChange({
                responsavelId:
                  event.target.value,
              })
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="">
              Responsável
            </option>

            {responsaveis.map(
              item => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.nome}
                </option>
              )
            )}
          </select>

          <select
            value={
              filtros.compromisso
            }
            onChange={event =>
              onChange({
                compromisso:
                  event.target
                    .value as Filtros['compromisso'],
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
        </div>

        <div className="flex gap-2">
          <select
            value={
              filtros.ordenacao
            }
            onChange={event =>
              onChange({
                ordenacao:
                  event.target
                    .value as Filtros['ordenacao'],
              })
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400"
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
            onClick={onReset}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <RotateCcw
              size={15}
            />
          </button>

          <div className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 xl:flex">
            <Filter
              size={15}
            />
          </div>
        </div>
      </div>
    </div>
  )
}