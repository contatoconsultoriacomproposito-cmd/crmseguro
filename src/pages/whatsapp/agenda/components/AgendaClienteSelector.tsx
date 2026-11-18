import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Building2,
  Check,
  Loader2,
  Search,
  User,
  Users,
  X,
} from 'lucide-react'

import {
  buscarAgendaClientes,
  type AgendaClienteResultado,
} from '../services/agendaClienteService'

interface AgendaClienteSelectorProps {
  corretoraId: string

  value:
    | AgendaClienteResultado
    | null

  onChange: (
    cliente:
      | AgendaClienteResultado
      | null
  ) => void

  disabled?: boolean
}

function formatarDocumento(
  documento: string | null
) {
  if (!documento) {
    return null
  }

  const numeros =
    documento.replace(/\D/g, '')

  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    )
  }

  if (numeros.length === 14) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    )
  }

  return documento
}

function formatarTelefone(
  telefone: string | null
) {
  if (!telefone) {
    return null
  }

  const numeros =
    telefone.replace(/\D/g, '')

  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{2})(\d{5})(\d{4})/,
      '($1) $2-$3'
    )
  }

  if (numeros.length === 10) {
    return numeros.replace(
      /(\d{2})(\d{4})(\d{4})/,
      '($1) $2-$3'
    )
  }

  return telefone
}

function obterIcone(
  cliente: AgendaClienteResultado
) {
  if (cliente.tipo === 'PESSOA') {
    return User
  }

  if (cliente.tipo === 'EMPRESA') {
    return Building2
  }

  return Users
}

function obterClassesTipo(
  cliente: AgendaClienteResultado
) {
  if (cliente.tipo === 'PESSOA') {
    return {
      icone:
        'bg-blue-50 text-blue-600',
      badge:
        'bg-blue-50 text-blue-700',
    }
  }

  if (cliente.tipo === 'EMPRESA') {
    return {
      icone:
        'bg-violet-50 text-violet-600',
      badge:
        'bg-violet-50 text-violet-700',
    }
  }

  return {
    icone:
      'bg-slate-100 text-slate-600',
    badge:
      'bg-slate-100 text-slate-600',
  }
}

export default function AgendaClienteSelector({
  corretoraId,
  value,
  onChange,
  disabled = false,
}: AgendaClienteSelectorProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null)

  const requestRef =
    useRef(0)

  const [
    termo,
    setTermo,
  ] = useState('')

  const [
    resultados,
    setResultados,
  ] = useState<
    AgendaClienteResultado[]
  >([])

  const [
    aberto,
    setAberto,
  ] = useState(false)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    erro,
    setErro,
  ] = useState('')

  useEffect(() => {
    const handleMouseDown = (
      event: MouseEvent
    ) => {
      if (
        !containerRef.current ||
        containerRef.current.contains(
          event.target as Node
        )
      ) {
        return
      }

      setAberto(false)
    }

    document.addEventListener(
      'mousedown',
      handleMouseDown
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleMouseDown
      )
    }
  }, [])

  useEffect(() => {
    if (
      value ||
      disabled
    ) {
      setResultados([])
      setAberto(false)
      setLoading(false)
      return
    }

    const busca =
      termo.trim()

    if (busca.length < 2) {
      setResultados([])
      setAberto(false)
      setLoading(false)
      setErro('')
      return
    }

    const timeout =
      window.setTimeout(
        async () => {
          const requestId =
            requestRef.current + 1

          requestRef.current =
            requestId

          setLoading(true)
          setErro('')
          setAberto(true)

          try {
            const data =
              await buscarAgendaClientes({
                corretoraId,
                termo: busca,
                limite: 20,
              })

            if (
              requestRef.current !==
              requestId
            ) {
              return
            }

            setResultados(data)
          } catch (error) {
            if (
              requestRef.current !==
              requestId
            ) {
              return
            }

            console.error(
              'Erro ao pesquisar cliente da agenda:',
              error
            )

            setResultados([])
            setErro(
              'Não foi possível pesquisar clientes.'
            )
          } finally {
            if (
              requestRef.current ===
              requestId
            ) {
              setLoading(false)
            }
          }
        },
        350
      )

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    corretoraId,
    termo,
    value,
    disabled,
  ])

  const selecionarCliente = (
    cliente: AgendaClienteResultado
  ) => {
    onChange(cliente)

    setTermo('')
    setResultados([])
    setAberto(false)
    setErro('')
  }

  const removerCliente = () => {
    if (disabled) {
      return
    }

    onChange(null)

    setTermo('')
    setResultados([])
    setAberto(false)
    setErro('')
  }

  if (value) {
    const Icone =
      obterIcone(value)

    const classes =
      obterClassesTipo(value)

    const documento =
      formatarDocumento(
        value.documento
      )

    const telefone =
      formatarTelefone(
        value.telefone
      )

    return (
      <div
        ref={containerRef}
        className="rounded-xl border border-blue-200 bg-blue-50/40 p-3"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icone}`}
          >
            <Icone size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-bold text-slate-800">
                {value.nome}
              </span>

              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${classes.badge}`}
              >
                {value.origemLabel}
              </span>
            </div>

            {value.nomeSecundario &&
              value.nomeSecundario !==
                value.nome && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {
                    value.nomeSecundario
                  }
                </p>
              )}

            {(documento ||
              telefone) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {documento && (
                  <span>
                    {documento}
                  </span>
                )}

                {telefone && (
                  <span>
                    {telefone}
                  </span>
                )}
              </div>
            )}
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={
                removerCliente
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-500"
              title="Remover vínculo"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={termo}
          onChange={event => {
            setTermo(
              event.target.value
            )
          }}
          onFocus={() => {
            if (
              termo.trim().length >=
              2
            ) {
              setAberto(true)
            }
          }}
          disabled={disabled}
          autoComplete="off"
          placeholder="Buscar por nome, CPF, CNPJ ou telefone..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />

        {loading && (
          <Loader2
            size={17}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500"
          />
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-400">
        Pesquise nas pessoas,
        empresas e clientes do CRM.
      </p>

      {aberto && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[130] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {erro ? (
            <div className="px-4 py-4 text-sm text-red-600">
              {erro}
            </div>
          ) : loading &&
            resultados.length ===
              0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-slate-500">
              <Loader2
                size={16}
                className="animate-spin"
              />

              Pesquisando...
            </div>
          ) : resultados.length ===
            0 ? (
            <div className="px-4 py-5 text-center">
              <Search
                size={20}
                className="mx-auto text-slate-300"
              />

              <p className="mt-2 text-sm font-semibold text-slate-600">
                Nenhum resultado
                encontrado
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tente pesquisar por
                outro nome, documento
                ou telefone.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-1.5">
              {resultados.map(
                cliente => {
                  const Icone =
                    obterIcone(
                      cliente
                    )

                  const classes =
                    obterClassesTipo(
                      cliente
                    )

                  const documento =
                    formatarDocumento(
                      cliente.documento
                    )

                  const telefone =
                    formatarTelefone(
                      cliente.telefone
                    )

                  return (
                    <button
                      key={`${cliente.tipo}-${cliente.id}`}
                      type="button"
                      onClick={() =>
                        selecionarCliente(
                          cliente
                        )
                      }
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${classes.icone}`}
                      >
                        <Icone
                          size={17}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {
                              cliente.nome
                            }
                          </span>

                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${classes.badge}`}
                          >
                            {
                              cliente.origemLabel
                            }
                          </span>
                        </div>

                        {cliente.nomeSecundario &&
                          cliente.nomeSecundario !==
                            cliente.nome && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {
                                cliente.nomeSecundario
                              }
                            </p>
                          )}

                        {(documento ||
                          telefone) && (
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                            {documento && (
                              <span>
                                {
                                  documento
                                }
                              </span>
                            )}

                            {telefone && (
                              <span>
                                {
                                  telefone
                                }
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <Check
                        size={16}
                        className="shrink-0 text-blue-500 opacity-0 transition group-hover:opacity-100"
                      />
                    </button>
                  )
                }
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}