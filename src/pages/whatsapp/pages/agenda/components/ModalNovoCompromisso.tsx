import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  CopyPlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import type {
  AgendaCategoria,
  AgendaNatureza,
  AgendaPrioridade,
} from '../types/agenda'

import type {
  AgendaCalendarNovoHorario,
} from './AgendaCalendar'

import AgendaClienteSelector from './AgendaClienteSelector'

import type {
  AgendaClienteResultado,
} from '../services/agendaClienteService'

export interface NovoCompromissoItem {
  idLocal: string

  natureza: AgendaNatureza
  categoria: AgendaCategoria
  prioridade: AgendaPrioridade

  titulo: string
  descricao: string

  data: string
  horario: string

  diaInteiro: boolean

  fimData: string
  fimHorario: string
}

export interface NovoCompromissoSubmitItem {
  natureza: AgendaNatureza
  categoria: AgendaCategoria
  prioridade: AgendaPrioridade

  titulo: string
  descricao: string | null

  inicioEm: string
  fimEm: string | null

  diaInteiro: boolean
}

export interface NovoCompromissoSubmitPayload {
  vinculo:
    | AgendaClienteResultado
    | null

  compromissos:
    NovoCompromissoSubmitItem[]
}

interface ModalNovoCompromissoProps {
  aberto: boolean

  corretoraId: string

  horarioInicial?:
    | AgendaCalendarNovoHorario
    | null

  clienteInicial?:
    | AgendaClienteResultado
    | null

  bloquearClienteInicial?: boolean

  salvando?: boolean

  onClose: () => void

  onSubmit: (
    payload: NovoCompromissoSubmitPayload
  ) => Promise<void> | void
}

const categorias: Array<{
  value: AgendaCategoria
  label: string
}> = [
  {
    value: 'COMERCIAL',
    label: 'Comercial',
  },
  {
    value: 'RENOVACAO',
    label: 'Renovação',
  },
  {
    value: 'SINISTRO',
    label: 'Sinistro',
  },
  {
    value: 'ASSISTENCIA',
    label: 'Assistência',
  },
  {
    value: 'ANIVERSARIO',
    label: 'Aniversário',
  },
  {
    value: 'MARKETING',
    label: 'Marketing',
  },
  {
    value: 'TAREFA',
    label: 'Tarefa',
  },
  {
    value: 'TREINAMENTO',
    label: 'Treinamento',
  },
  {
    value: 'REUNIAO',
    label: 'Reunião',
  },
  {
    value: 'OUTRO',
    label: 'Outro',
  },
]

const prioridades: Array<{
  value: AgendaPrioridade
  label: string
}> = [
  {
    value: 'BAIXA',
    label: 'Baixa',
  },
  {
    value: 'NORMAL',
    label: 'Normal',
  },
  {
    value: 'ALTA',
    label: 'Alta',
  },
  {
    value: 'URGENTE',
    label: 'Urgente',
  },
]

function gerarIdLocal() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

function pad2(valor: number) {
  return String(valor).padStart(2, '0')
}

function formatarDataInput(
  data: Date
) {
  return [
    data.getFullYear(),
    pad2(data.getMonth() + 1),
    pad2(data.getDate()),
  ].join('-')
}

function formatarHorarioInput(
  data: Date
) {
  return `${pad2(
    data.getHours()
  )}:${pad2(data.getMinutes())}`
}

function adicionarMinutos(
  data: Date,
  minutos: number
) {
  return new Date(
    data.getTime() +
      minutos * 60 * 1000
  )
}

function criarDataLocal(
  data: string,
  horario: string
) {
  if (!data) {
    return null
  }

  const [
    ano,
    mes,
    dia,
  ] = data
    .split('-')
    .map(Number)

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return null
  }

  if (!horario) {
    return new Date(
      ano,
      mes - 1,
      dia,
      0,
      0,
      0,
      0
    )
  }

  const [
    hora,
    minuto,
  ] = horario
    .split(':')
    .map(Number)

  return new Date(
    ano,
    mes - 1,
    dia,
    hora || 0,
    minuto || 0,
    0,
    0
  )
}

function criarItemInicial(
  horarioInicial?:
    | AgendaCalendarNovoHorario
    | null
): NovoCompromissoItem {
  const agora = new Date()

  let inicio = agora
  let fim = adicionarMinutos(
    agora,
    30
  )

  let diaInteiro = false

  if (horarioInicial?.inicioEm) {
    inicio = new Date(
      horarioInicial.inicioEm
    )

    diaInteiro =
      horarioInicial.diaInteiro

    if (horarioInicial.fimEm) {
      fim = new Date(
        horarioInicial.fimEm
      )
    } else {
      fim = adicionarMinutos(
        inicio,
        30
      )
    }
  }

  return {
    idLocal: gerarIdLocal(),

    natureza: 'COMPROMISSO',
    categoria: 'COMERCIAL',
    prioridade: 'NORMAL',

    titulo: '',
    descricao: '',

    data:
      formatarDataInput(inicio),

    horario:
      diaInteiro
        ? ''
        : formatarHorarioInput(
            inicio
          ),

    diaInteiro,

    fimData:
      formatarDataInput(fim),

    fimHorario:
      diaInteiro
        ? ''
        : formatarHorarioInput(
            fim
          ),
  }
}

function criarNovoItem(
  referencia?: NovoCompromissoItem
): NovoCompromissoItem {
  const agora = new Date()

  const data =
    referencia?.data ||
    formatarDataInput(agora)

  return {
    idLocal: gerarIdLocal(),

    natureza:
      referencia?.natureza ??
      'COMPROMISSO',

    categoria:
      referencia?.categoria ??
      'COMERCIAL',

    prioridade:
      referencia?.prioridade ??
      'NORMAL',

    titulo: '',
    descricao: '',

    data,

    horario:
      referencia?.diaInteiro
        ? ''
        : referencia?.horario ||
          '09:00',

    diaInteiro:
      referencia?.diaInteiro ??
      false,

    fimData: data,

    fimHorario:
      referencia?.diaInteiro
        ? ''
        : '',
  }
}

function converterParaSubmit(
  item: NovoCompromissoItem
): NovoCompromissoSubmitItem {
  const inicio =
    criarDataLocal(
      item.data,
      item.diaInteiro
        ? ''
        : item.horario
    )

  if (!inicio) {
    throw new Error(
      'Data inicial inválida.'
    )
  }

  if (item.diaInteiro) {
    return {
      natureza: item.natureza,
      categoria: item.categoria,
      prioridade:
        item.prioridade,

      titulo: item.titulo.trim(),

      descricao:
        item.descricao.trim() ||
        null,

      inicioEm:
        inicio.toISOString(),

      fimEm: null,

      diaInteiro: true,
    }
  }

  let fim: Date | null = null

  if (
    item.fimData &&
    item.fimHorario
  ) {
    fim = criarDataLocal(
      item.fimData,
      item.fimHorario
    )
  }

  return {
    natureza: item.natureza,
    categoria: item.categoria,
    prioridade:
      item.prioridade,

    titulo: item.titulo.trim(),

    descricao:
      item.descricao.trim() ||
      null,

    inicioEm:
      inicio.toISOString(),

    fimEm:
      fim?.toISOString() ??
      null,

    diaInteiro: false,
  }
}

export default function ModalNovoCompromisso({
  aberto,
  corretoraId,
  horarioInicial = null,
  clienteInicial = null,
  bloquearClienteInicial = false,
  salvando = false,
  onClose,
  onSubmit,
}: ModalNovoCompromissoProps) {
  const [
    itens,
    setItens,
  ] = useState<
    NovoCompromissoItem[]
  >([])

  const [
    erro,
    setErro,
  ] = useState('')

  const [
    vinculoCliente,
    setVinculoCliente,
    ] = useState<
    AgendaClienteResultado | null
    >(null)

  useEffect(() => {
    if (!aberto) {
      return
    }

    setErro('')

    setErro('')
    setVinculoCliente(
      clienteInicial
      )

    setItens([
    criarItemInicial(
        horarioInicial
    ),
    ])
  }, [
    aberto,
    horarioInicial,
    clienteInicial,
  ])

  const multiplos =
    itens.length > 1

  const tituloModal =
    multiplos
      ? 'Novos compromissos'
      : 'Novo compromisso'

  const quantidadeTexto =
    useMemo(() => {
      if (itens.length === 1) {
        return '1 compromisso'
      }

      return `${itens.length} compromissos`
    }, [itens.length])

  if (!aberto) {
    return null
  }

  const atualizarItem = <
    K extends keyof NovoCompromissoItem
  >(
    idLocal: string,
    campo: K,
    valor: NovoCompromissoItem[K]
  ) => {
    setItens(current =>
      current.map(item =>
        item.idLocal === idLocal
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    )
  }

  const atualizarDiaInteiro = (
    idLocal: string,
    checked: boolean
  ) => {
    setItens(current =>
      current.map(item => {
        if (
          item.idLocal !== idLocal
        ) {
          return item
        }

        return {
          ...item,
          diaInteiro: checked,

          horario: checked
            ? ''
            : item.horario ||
              '09:00',

          fimData: checked
            ? item.data
            : item.fimData ||
              item.data,

          fimHorario: checked
            ? ''
            : item.fimHorario,
        }
      })
    )
  }

  const adicionarItem = () => {
    setErro('')

    setItens(current => {
      const ultimo =
        current[
          current.length - 1
        ]

      return [
        ...current,
        criarNovoItem(ultimo),
      ]
    })
  }

  const duplicarItem = (
    item: NovoCompromissoItem
  ) => {
    setErro('')

    setItens(current => [
      ...current,
      {
        ...item,
        idLocal:
          gerarIdLocal(),
      },
    ])
  }

  const removerItem = (
    idLocal: string
  ) => {
    setErro('')

    setItens(current => {
      if (
        current.length === 1
      ) {
        return current
      }

      return current.filter(
        item =>
          item.idLocal !==
          idLocal
      )
    })
  }

  const validar = () => {
    if (itens.length === 0) {
      return 'Inclua pelo menos um compromisso.'
    }

    for (
      let index = 0;
      index < itens.length;
      index += 1
    ) {
      const item =
        itens[index]

      const numero =
        index + 1

      if (!item.titulo.trim()) {
        return `Informe o título do compromisso ${numero}.`
      }

      if (!item.data) {
        return `Informe a data do compromisso ${numero}.`
      }

      if (
        !item.diaInteiro &&
        !item.horario
      ) {
        return `Informe o horário do compromisso ${numero}.`
      }

      const inicio =
        criarDataLocal(
          item.data,
          item.diaInteiro
            ? ''
            : item.horario
        )

      if (!inicio) {
        return `A data do compromisso ${numero} é inválida.`
      }

      if (
        !item.diaInteiro &&
        item.fimHorario
      ) {
        const fim =
          criarDataLocal(
            item.fimData ||
              item.data,
            item.fimHorario
          )

        if (!fim) {
          return `O horário final do compromisso ${numero} é inválido.`
        }

        if (
          fim.getTime() <
          inicio.getTime()
        ) {
          return `O término do compromisso ${numero} não pode ser anterior ao início.`
        }
      }
    }

    return null
  }

  const handleSubmit = async () => {
    if (salvando) {
      return
    }

    setErro('')

    const erroValidacao =
      validar()

    if (erroValidacao) {
      setErro(
        erroValidacao
      )
      return
    }

    try {
      const compromissos =
        itens.map(
            converterParaSubmit
        )

        await onSubmit({
        vinculo:
            vinculoCliente,

        compromissos,
        })
    } catch (error) {
      console.error(
        'Erro ao preparar compromissos:',
        error
      )

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar os compromissos.'
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Fechar"
        onClick={
          salvando
            ? undefined
            : onClose
        }
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays
                size={20}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">
                {tituloModal}
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Organize uma ou
                várias ações futuras
                em uma única operação.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Fechar"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
                <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                    Cliente relacionado
                </h3>

                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Opcional
                </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                Vincule estes compromissos a uma pessoa,
                empresa ou cliente já existente no CRM.
                </p>
            </div>

            <AgendaClienteSelector
                corretoraId={
                corretoraId
                }

                value={
                vinculoCliente
                }

                onChange={
                setVinculoCliente
                }

                disabled={
                  salvando ||
                  bloquearClienteInicial
                }
            />
            </div>
            {itens.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    item.idLocal
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-bold text-white">
                        {index + 1}
                      </span>

                      <span className="text-sm font-bold text-slate-700">
                        Compromisso
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          duplicarItem(
                            item
                          )
                        }
                        disabled={
                          salvando
                        }
                        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-blue-600 disabled:opacity-50"
                        title="Duplicar compromisso"
                      >
                        <CopyPlus
                          size={15}
                        />
                        Duplicar
                      </button>

                      {itens.length >
                        1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removerItem(
                              item.idLocal
                            )
                          }
                          disabled={
                            salvando
                          }
                          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Remover compromisso"
                        >
                          <Trash2
                            size={15}
                          />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Natureza
                      </label>

                      <select
                        value={
                          item.natureza
                        }
                        onChange={e =>
                          atualizarItem(
                            item.idLocal,
                            'natureza',
                            e.target
                              .value as AgendaNatureza
                          )
                        }
                        disabled={
                          salvando
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      >
                        <option value="COMPROMISSO">
                          Compromisso
                        </option>

                        <option value="INFORMATIVO">
                          Informativo
                        </option>
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Categoria
                      </label>

                      <select
                        value={
                          item.categoria
                        }
                        onChange={e =>
                          atualizarItem(
                            item.idLocal,
                            'categoria',
                            e.target
                              .value as AgendaCategoria
                          )
                        }
                        disabled={
                          salvando
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      >
                        {categorias.map(
                          categoria => (
                            <option
                              key={
                                categoria.value
                              }
                              value={
                                categoria.value
                              }
                            >
                              {
                                categoria.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Prioridade
                      </label>

                      <select
                        value={
                          item.prioridade
                        }
                        onChange={e =>
                          atualizarItem(
                            item.idLocal,
                            'prioridade',
                            e.target
                              .value as AgendaPrioridade
                          )
                        }
                        disabled={
                          salvando
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      >
                        {prioridades.map(
                          prioridade => (
                            <option
                              key={
                                prioridade.value
                              }
                              value={
                                prioridade.value
                              }
                            >
                              {
                                prioridade.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="flex items-end lg:col-span-3">
                      <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={
                            item.diaInteiro
                          }
                          onChange={e =>
                            atualizarDiaInteiro(
                              item.idLocal,
                              e.target
                                .checked
                            )
                          }
                          disabled={
                            salvando
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />

                        Dia inteiro
                      </label>
                    </div>

                    <div className="lg:col-span-12">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Título
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <input
                        type="text"
                        value={
                          item.titulo
                        }
                        onChange={e =>
                          atualizarItem(
                            item.idLocal,
                            'titulo',
                            e.target.value
                          )
                        }
                        disabled={
                          salvando
                        }
                        placeholder="Ex.: Contatar cliente sobre renovação do seguro Auto"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      />
                    </div>

                    <div
                      className={
                        item.diaInteiro
                          ? 'lg:col-span-12'
                          : 'lg:col-span-4'
                      }
                    >
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Data
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          type="date"
                          value={
                            item.data
                          }
                          onChange={e => {
                            const novaData =
                              e.target
                                .value

                            atualizarItem(
                              item.idLocal,
                              'data',
                              novaData
                            )

                            if (
                              !item
                                .fimData ||
                              item
                                .fimData ===
                                item.data
                            ) {
                              atualizarItem(
                                item.idLocal,
                                'fimData',
                                novaData
                              )
                            }
                          }}
                          disabled={
                            salvando
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    {!item.diaInteiro && (
                      <>
                        <div className="lg:col-span-2">
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Início
                            <span className="ml-1 text-red-500">
                              *
                            </span>
                          </label>

                          <div className="relative">
                            <Clock3
                              size={16}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                              type="time"
                              value={
                                item.horario
                              }
                              onChange={e =>
                                atualizarItem(
                                  item.idLocal,
                                  'horario',
                                  e.target
                                    .value
                                )
                              }
                              disabled={
                                salvando
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                            />
                          </div>
                        </div>

                        <div className="lg:col-span-4">
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Data final
                          </label>

                          <input
                            type="date"
                            value={
                              item.fimData
                            }
                            onChange={e =>
                              atualizarItem(
                                item.idLocal,
                                'fimData',
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              salvando
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Término
                          </label>

                          <input
                            type="time"
                            value={
                              item.fimHorario
                            }
                            onChange={e =>
                              atualizarItem(
                                item.idLocal,
                                'fimHorario',
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              salvando
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                          />
                        </div>
                      </>
                    )}

                    <div className="lg:col-span-12">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Descrição
                      </label>

                      <textarea
                        value={
                          item.descricao
                        }
                        onChange={e =>
                          atualizarItem(
                            item.idLocal,
                            'descricao',
                            e.target.value
                          )
                        }
                        disabled={
                          salvando
                        }
                        rows={2}
                        placeholder="Observações, contexto ou instruções para este compromisso..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              )
            )}

            <button
              type="button"
              onClick={adicionarItem}
              disabled={salvando}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm font-bold text-blue-600 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />

              Adicionar outro compromisso
            </button>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          {erro && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {erro}
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-medium text-slate-500">
              {quantidadeTexto}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  handleSubmit
                }
                disabled={
                  salvando
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check
                      size={17}
                    />

                    {itens.length >
                    1
                      ? `Salvar ${itens.length} compromissos`
                      : 'Salvar compromisso'}
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}