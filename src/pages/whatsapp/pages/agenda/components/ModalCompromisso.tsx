import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertCircle,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  RotateCcw,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react'

import type {
  AgendaCategoria,
  AgendaItem,
  AgendaPrioridade,
} from '../types/agenda'

import {
  buscarAgendaClientePorVinculo,
  type AgendaClienteResultado,
} from '../services/agendaClienteService'

export interface ModalCompromissoReagendamento {
  inicioEm: string
  fimEm: string | null
  diaInteiro: boolean
}

export interface ModalCompromissoEdicao {
  titulo: string
  descricao: string | null
  categoria: AgendaCategoria
  prioridade: AgendaPrioridade
}

interface ModalCompromissoProps {
  aberto: boolean

  compromisso:
    | AgendaItem
    | null

  salvando?: boolean

  onClose: () => void

  onConcluir: (
    compromisso: AgendaItem
  ) => Promise<void> | void

  onReagendar: (
    compromisso: AgendaItem,
    reagendamento: ModalCompromissoReagendamento
  ) => Promise<void> | void

  onEditar: (
    compromisso: AgendaItem,
    edicao: ModalCompromissoEdicao
  ) => Promise<void> | void

  onCancelar: (
    compromisso: AgendaItem
  ) => Promise<void> | void

  onAbrirVinculo?: (
    compromisso: AgendaItem
  ) => void
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

type ModoModal =
  | 'VISUALIZAR'
  | 'REAGENDAR'
  | 'EDITAR'
  | 'CANCELAR'

function pad2(
  valor: number
) {
  return String(valor).padStart(
    2,
    '0'
  )
}

function formatarDataInput(
  data: Date
) {
  return [
    data.getFullYear(),
    pad2(
      data.getMonth() + 1
    ),
    pad2(
      data.getDate()
    ),
  ].join('-')
}

function formatarHorarioInput(
  data: Date
) {
  return `${pad2(
    data.getHours()
  )}:${pad2(
    data.getMinutes()
  )}`
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

function formatarDataExibicao(
  valor: string
) {
  const data =
    new Date(valor)

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  ).format(data)
}

function formatarHorarioExibicao(
  valor: string
) {
  const data =
    new Date(valor)

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(data)
}

function formatarCategoria(
  categoria: AgendaCategoria
) {
  return (
    categorias.find(
      item =>
        item.value ===
        categoria
    )?.label ??
    categoria
  )
}

function formatarPrioridade(
  prioridade: AgendaPrioridade
) {
  return (
    prioridades.find(
      item =>
        item.value ===
        prioridade
    )?.label ??
    prioridade
  )
}

function formatarOrigem(
  origem: string
) {
  if (
    origem === 'MANUAL'
  ) {
    return 'Manual'
  }

  return origem
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(
      /(^|\s)\S/g,
      letra =>
        letra.toUpperCase()
    )
}

function formatarDocumento(
  documento: string | null
) {
  if (!documento) {
    return null
  }

  const numeros =
    documento.replace(
      /\D/g,
      ''
    )

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
    telefone.replace(
      /\D/g,
      ''
    )

  const telefoneBrasil =
    numeros.length > 11 &&
    numeros.startsWith('55')
      ? numeros.slice(2)
      : numeros

  if (
    telefoneBrasil.length === 11
  ) {
    return telefoneBrasil.replace(
      /(\d{2})(\d{5})(\d{4})/,
      '($1) $2-$3'
    )
  }

  if (
    telefoneBrasil.length === 10
  ) {
    return telefoneBrasil.replace(
      /(\d{2})(\d{4})(\d{4})/,
      '($1) $2-$3'
    )
  }

  return telefone
}

function obterVinculo(
  compromisso: AgendaItem
) {
  if (
    compromisso.crmPessoaId
  ) {
    return {
      tipo: 'PESSOA',
      label: 'Pessoa CRM',
      id:
        compromisso.crmPessoaId,
      Icone: User,
    }
  }

  if (
    compromisso.crmEmpresaId
  ) {
    return {
      tipo: 'EMPRESA',
      label: 'Empresa CRM',
      id:
        compromisso.crmEmpresaId,
      Icone: Building2,
    }
  }

  if (
    compromisso.clienteIdLegado
  ) {
    return {
      tipo: 'LEGADO',
      label: 'Cliente legado',
      id:
        compromisso.clienteIdLegado,
      Icone: Users,
    }
  }

  return null
}

function obterClassesPrioridade(
  prioridade: AgendaPrioridade
) {
  switch (prioridade) {
    case 'URGENTE':
      return 'border-red-200 bg-red-50 text-red-700'

    case 'ALTA':
      return 'border-orange-200 bg-orange-50 text-orange-700'

    case 'BAIXA':
      return 'border-slate-200 bg-slate-50 text-slate-600'

    default:
      return 'border-blue-200 bg-blue-50 text-blue-700'
  }
}

function obterClassesStatus(
  status: AgendaItem['status']
) {
  switch (status) {
    case 'CONCLUIDO':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'

    case 'CANCELADO':
      return 'border-slate-200 bg-slate-100 text-slate-500'

    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
  }
}

function formatarStatus(
  status: AgendaItem['status']
) {
  if (
    status === 'CONCLUIDO'
  ) {
    return 'Concluído'
  }

  if (
    status === 'CANCELADO'
  ) {
    return 'Cancelado'
  }

  return 'Pendente'
}

export default function ModalCompromisso({
  aberto,
  compromisso,
  salvando = false,
  onClose,
  onConcluir,
  onReagendar,
  onEditar,
  onCancelar,
  onAbrirVinculo,
}: ModalCompromissoProps) {
  const [
    modo,
    setModo,
  ] = useState<ModoModal>(
    'VISUALIZAR'
  )

  const [
    erro,
    setErro,
  ] = useState('')

  const [
    titulo,
    setTitulo,
  ] = useState('')

  const [
    descricao,
    setDescricao,
  ] = useState('')

  const [
    categoria,
    setCategoria,
  ] =
    useState<AgendaCategoria>(
      'COMERCIAL'
    )

  const [
    prioridade,
    setPrioridade,
  ] =
    useState<AgendaPrioridade>(
      'NORMAL'
    )

  const [
    dataInicio,
    setDataInicio,
  ] = useState('')

  const [
    horarioInicio,
    setHorarioInicio,
  ] = useState('')

  const [
    dataFim,
    setDataFim,
  ] = useState('')

  const [
    horarioFim,
    setHorarioFim,
  ] = useState('')

  const [
    diaInteiro,
    setDiaInteiro,
  ] = useState(false)

  const [
  clienteRelacionado,
  setClienteRelacionado,
] =
  useState<AgendaClienteResultado | null>(
    null
  )

const [
  carregandoCliente,
  setCarregandoCliente,
] = useState(false)

const [
  erroCliente,
  setErroCliente,
] = useState(false)

  useEffect(() => {
    if (
      !aberto ||
      !compromisso
    ) {
      return
    }

    const inicio =
      new Date(
        compromisso.inicioEm
      )

    const fim =
      compromisso.fimEm
        ? new Date(
            compromisso.fimEm
          )
        : null

    setModo('VISUALIZAR')
    setErro('')

    setTitulo(
      compromisso.titulo
    )

    setDescricao(
      compromisso.descricao ??
        ''
    )

    setCategoria(
      compromisso.categoria
    )

    setPrioridade(
      compromisso.prioridade
    )

    setDiaInteiro(
      compromisso.diaInteiro
    )

    setDataInicio(
      formatarDataInput(
        inicio
      )
    )

    setHorarioInicio(
      compromisso.diaInteiro
        ? ''
        : formatarHorarioInput(
            inicio
          )
    )

    setDataFim(
      fim
        ? formatarDataInput(
            fim
          )
        : formatarDataInput(
            inicio
          )
    )

    setHorarioFim(
      compromisso.diaInteiro ||
        !fim
        ? ''
        : formatarHorarioInput(
            fim
          )
    )
  }, [
    aberto,
    compromisso,
  ])

  useEffect(() => {
  if (
    !aberto ||
    !compromisso
  ) {
    setClienteRelacionado(null)
    setCarregandoCliente(false)
    setErroCliente(false)
    return
  }

  const possuiVinculo =
    compromisso.crmPessoaId ||
    compromisso.crmEmpresaId ||
    compromisso.clienteIdLegado

  if (!possuiVinculo) {
    setClienteRelacionado(null)
    setCarregandoCliente(false)
    setErroCliente(false)
    return
  }

  let ativo = true

  const carregarCliente =
    async () => {
      setCarregandoCliente(true)
      setErroCliente(false)
      setClienteRelacionado(null)

      try {
        const resultado =
          await buscarAgendaClientePorVinculo({
            corretoraId:
              compromisso.corretoraId,

            crmPessoaId:
              compromisso.crmPessoaId,

            crmEmpresaId:
              compromisso.crmEmpresaId,

            clienteIdLegado:
              compromisso.clienteIdLegado,
          })

        if (!ativo) {
          return
        }

        setClienteRelacionado(
          resultado
        )

        if (!resultado) {
          setErroCliente(true)
        }
      } catch (error) {
        console.error(
          'Erro ao carregar cliente relacionado:',
          error
        )

        if (ativo) {
          setClienteRelacionado(null)
          setErroCliente(true)
        }
      } finally {
        if (ativo) {
          setCarregandoCliente(false)
        }
      }
    }

  carregarCliente()

  return () => {
    ativo = false
  }
}, [
  aberto,
  compromisso,
])

  const vinculo =
    useMemo(
      () =>
        compromisso
          ? obterVinculo(
              compromisso
            )
          : null,
      [compromisso]
    )

  if (
    !aberto ||
    !compromisso
  ) {
    return null
  }

  const pendente =
    compromisso.status ===
    'PENDENTE'

  const fechar = () => {
    if (salvando) {
      return
    }

    onClose()
  }

  const voltarVisualizacao =
    () => {
      if (salvando) {
        return
      }

      setErro('')
      setModo('VISUALIZAR')
    }

  const handleConcluir =
    async () => {
      if (
        salvando ||
        !pendente
      ) {
        return
      }

      setErro('')

      try {
        await onConcluir(
          compromisso
        )
      } catch (error) {
        console.error(
          'Erro ao concluir compromisso:',
          error
        )

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir o compromisso.'
        )
      }
    }

  const handleReagendar =
    async () => {
      if (
        salvando ||
        !pendente
      ) {
        return
      }

      setErro('')

      const inicio =
        criarDataLocal(
          dataInicio,
          diaInteiro
            ? ''
            : horarioInicio
        )

      if (!inicio) {
        setErro(
          'Informe uma data inicial válida.'
        )
        return
      }

      if (
        !diaInteiro &&
        !horarioInicio
      ) {
        setErro(
          'Informe o horário inicial.'
        )
        return
      }

      let fim:
        | Date
        | null = null

      if (
        !diaInteiro &&
        horarioFim
      ) {
        fim =
          criarDataLocal(
            dataFim ||
              dataInicio,
            horarioFim
          )

        if (!fim) {
          setErro(
            'Informe um término válido.'
          )
          return
        }

        if (
          fim.getTime() <
          inicio.getTime()
        ) {
          setErro(
            'O término não pode ser anterior ao início.'
          )
          return
        }
      }

      try {
        await onReagendar(
          compromisso,
          {
            inicioEm:
              inicio.toISOString(),

            fimEm:
              fim?.toISOString() ??
              null,

            diaInteiro,
          }
        )
      } catch (error) {
        console.error(
          'Erro ao reagendar compromisso:',
          error
        )

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível reagendar o compromisso.'
        )
      }
    }

  const handleEditar =
    async () => {
      if (
        salvando ||
        !pendente
      ) {
        return
      }

      setErro('')

      if (!titulo.trim()) {
        setErro(
          'Informe o título do compromisso.'
        )
        return
      }

      try {
        await onEditar(
          compromisso,
          {
            titulo:
              titulo.trim(),

            descricao:
              descricao.trim() ||
              null,

            categoria,

            prioridade,
          }
        )
      } catch (error) {
        console.error(
          'Erro ao editar compromisso:',
          error
        )

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível editar o compromisso.'
        )
      }
    }

  const handleCancelar =
    async () => {
      if (
        salvando ||
        !pendente
      ) {
        return
      }

      setErro('')

      try {
        await onCancelar(
          compromisso
        )
      } catch (error) {
        console.error(
          'Erro ao cancelar compromisso:',
          error
        )

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível cancelar o compromisso.'
        )
      }
    }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarClock
                size={20}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-slate-900">
                  {modo ===
                  'VISUALIZAR'
                    ? compromisso.titulo
                    : modo ===
                        'REAGENDAR'
                      ? 'Reagendar compromisso'
                      : modo ===
                          'EDITAR'
                        ? 'Editar compromisso'
                        : 'Cancelar compromisso'}
                </h2>

                {modo ===
                  'VISUALIZAR' && (
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${obterClassesStatus(
                      compromisso.status
                    )}`}
                  >
                    {formatarStatus(
                      compromisso.status
                    )}
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-sm text-slate-500">
                {modo ===
                'VISUALIZAR'
                  ? 'Decida a próxima ação deste compromisso.'
                  : modo ===
                      'REAGENDAR'
                    ? 'Defina a nova data e horário.'
                    : modo ===
                        'EDITAR'
                      ? 'Atualize as informações do compromisso.'
                      : 'Confirme o cancelamento deste compromisso.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fechar}
            disabled={salvando}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Fechar"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
          {modo ===
            'VISUALIZAR' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <Tag
                      size={14}
                    />

                    {formatarCategoria(
                      compromisso.categoria
                    )}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${obterClassesPrioridade(
                      compromisso.prioridade
                    )}`}
                  >
                    <Flag
                      size={14}
                    />

                    {formatarPrioridade(
                      compromisso.prioridade
                    )}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <FileText
                      size={14}
                    />

                    {compromisso.natureza ===
                    'COMPROMISSO'
                      ? 'Compromisso'
                      : 'Informativo'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      <CalendarDays
                        size={14}
                      />
                      Data
                    </div>

                    <p className="mt-1.5 text-sm font-semibold capitalize text-slate-700">
                      {formatarDataExibicao(
                        compromisso.inicioEm
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      <Clock3
                        size={14}
                      />
                      Horário
                    </div>

                    <p className="mt-1.5 text-sm font-semibold text-slate-700">
                      {compromisso.diaInteiro
                        ? 'Dia inteiro'
                        : compromisso.fimEm
                          ? `${formatarHorarioExibicao(
                              compromisso.inicioEm
                            )} até ${formatarHorarioExibicao(
                              compromisso.fimEm
                            )}`
                          : formatarHorarioExibicao(
                              compromisso.inicioEm
                            )}
                    </p>
                  </div>
                </div>

                {compromisso.descricao && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Descrição
                    </p>

                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {
                        compromisso.descricao
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Cliente relacionado
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Pessoa ou empresa vinculada a este compromisso.
                  </p>
                </div>

                {!vinculo ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center">
                    <Users
                    size={20}
                    className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                    Nenhum cliente vinculado
                    </p>
                </div>
                ) : carregandoCliente ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <Loader2
                        size={18}
                        className="animate-spin"
                    />
                    </div>

                    <div>
                    <p className="text-sm font-semibold text-slate-600">
                        Carregando cliente...
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                        Consultando dados do CRM
                    </p>
                    </div>
                </div>
                ) : clienteRelacionado ? (
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    {clienteRelacionado.tipo ===
                    'PESSOA' ? (
                        <User size={18} />
                    ) : clienteRelacionado.tipo ===
                        'EMPRESA' ? (
                        <Building2 size={18} />
                    ) : (
                        <Users size={18} />
                    )}
                    </div>

                    <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                        {clienteRelacionado.nome}
                    </p>

                    {clienteRelacionado.nomeSecundario &&
                        clienteRelacionado.nomeSecundario !==
                        clienteRelacionado.nome && (
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {
                            clienteRelacionado.nomeSecundario
                            }
                        </p>
                        )}

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        {clienteRelacionado.documento && (
                        <span>
                            {formatarDocumento(
                            clienteRelacionado.documento
                            )}
                        </span>
                        )}

                        {clienteRelacionado.documento &&
                        clienteRelacionado.telefone && (
                            <span className="text-slate-300">
                            •
                            </span>
                        )}

                        {clienteRelacionado.telefone && (
                        <span>
                            {formatarTelefone(
                            clienteRelacionado.telefone
                            )}
                        </span>
                        )}
                    </div>

                    <p className="mt-1 text-[11px] font-semibold text-blue-600">
                        {
                        clienteRelacionado.origemLabel
                        }
                    </p>
                    </div>

                    
                </div>
                ) : erroCliente ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                    <p className="text-sm font-semibold text-amber-800">
                        Cliente vinculado não encontrado
                    </p>

                    <p className="mt-0.5 text-xs text-amber-700">
                        O compromisso possui um vínculo, mas não foi possível carregar os dados do cliente.
                    </p>
                    </div>
                </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800">
                  Origem
                </h3>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatarOrigem(
                        compromisso.tipoOrigem
                      )}
                    </p>

                    {compromisso.origemId && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Registro de origem vinculado
                      </p>
                    )}
                  </div>

                  {compromisso.tipoOrigem ===
                    'WHATSAPP' &&
                  compromisso.origemId &&
                  onAbrirVinculo ? (
                    <button
                      type="button"
                      onClick={() =>
                        onAbrirVinculo(
                          compromisso
                        )
                      }
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                    >
                      <ExternalLink
                        size={14}
                      />

                      Abrir conversa
                    </button>
                  ) : (
                    <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 shadow-sm">
                      {
                        compromisso.tipoOrigem
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {modo ===
            'REAGENDAR' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={
                    diaInteiro
                  }
                  onChange={event => {
                    const checked =
                      event.target
                        .checked

                    setDiaInteiro(
                      checked
                    )

                    if (checked) {
                      setHorarioInicio(
                        ''
                      )
                      setHorarioFim(
                        ''
                      )
                    }
                  }}
                  disabled={
                    salvando
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />

                Dia inteiro
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Data
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={
                      dataInicio
                    }
                    onChange={event => {
                      const valor =
                        event.target
                          .value

                      const dataFimAcompanhavaInicio =
                        !dataFim ||
                        dataFim ===
                          dataInicio

                      setDataInicio(
                        valor
                      )

                      if (
                        dataFimAcompanhavaInicio
                      ) {
                        setDataFim(
                          valor
                        )
                      }
                    }}
                    disabled={
                      salvando
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                {!diaInteiro && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Horário
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      type="time"
                      value={
                        horarioInicio
                      }
                      onChange={
                        event =>
                          setHorarioInicio(
                            event.target
                              .value
                          )
                      }
                      disabled={
                        salvando
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                    />
                  </div>
                )}

                {!diaInteiro && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Data final
                      </label>

                      <input
                        type="date"
                        value={
                          dataFim
                        }
                        onChange={
                          event =>
                            setDataFim(
                              event.target
                                .value
                            )
                        }
                        disabled={
                          salvando
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Término
                      </label>

                      <input
                        type="time"
                        value={
                          horarioFim
                        }
                        onChange={
                          event =>
                            setHorarioFim(
                              event.target
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
              </div>
            </div>
          )}

          {modo ===
            'EDITAR' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Título
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={titulo}
                  onChange={
                    event =>
                      setTitulo(
                        event.target
                          .value
                      )
                  }
                  disabled={
                    salvando
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Categoria
                  </label>

                  <select
                    value={
                      categoria
                    }
                    onChange={
                      event =>
                        setCategoria(
                          event.target
                            .value as AgendaCategoria
                        )
                    }
                    disabled={
                      salvando
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    {categorias.map(
                      item => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Prioridade
                  </label>

                  <select
                    value={
                      prioridade
                    }
                    onChange={
                      event =>
                        setPrioridade(
                          event.target
                            .value as AgendaPrioridade
                        )
                    }
                    disabled={
                      salvando
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    {prioridades.map(
                      item => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Descrição
                </label>

                <textarea
                  value={
                    descricao
                  }
                  onChange={
                    event =>
                      setDescricao(
                        event.target
                          .value
                      )
                  }
                  disabled={
                    salvando
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>
            </div>
          )}

          {modo ===
            'CANCELAR' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600">
                  <AlertCircle
                    size={20}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-red-800">
                    Cancelar compromisso?
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    O compromisso será mantido no histórico da agenda com status cancelado.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-red-800">
                    {
                      compromisso.titulo
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {erro && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {erro}
              </span>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          {modo ===
          'VISUALIZAR' ? (
            <div className="flex flex-col gap-3">
              {pendente ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={
                        handleConcluir
                      }
                      disabled={
                        salvando
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvando ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2
                          size={17}
                        />
                      )}

                      Concluir
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErro('')
                        setModo(
                          'REAGENDAR'
                        )
                      }}
                      disabled={
                        salvando
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RotateCcw
                        size={17}
                      />

                      Reagendar
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErro('')
                        setModo(
                          'EDITAR'
                        )
                      }}
                      disabled={
                        salvando
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Edit3
                        size={16}
                      />

                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErro('')
                        setModo(
                          'CANCELAR'
                        )
                      }}
                      disabled={
                        salvando
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2
                        size={16}
                      />

                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Este compromisso está{' '}
                    <strong>
                      {formatarStatus(
                        compromisso.status
                      ).toLowerCase()}
                    </strong>
                    .
                  </p>

                  <button
                    type="button"
                    onClick={fechar}
                    className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={
                  voltarVisualizacao
                }
                disabled={
                  salvando
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Voltar
              </button>

              {modo ===
                'REAGENDAR' && (
                <button
                  type="button"
                  onClick={
                    handleReagendar
                  }
                  disabled={
                    salvando
                  }
                  className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  Salvar reagendamento
                </button>
              )}

              {modo ===
                'EDITAR' && (
                <button
                  type="button"
                  onClick={
                    handleEditar
                  }
                  disabled={
                    salvando
                  }
                  className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  Salvar alterações
                </button>
              )}

              {modo ===
                'CANCELAR' && (
                <button
                  type="button"
                  onClick={
                    handleCancelar
                  }
                  disabled={
                    salvando
                  }
                  className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={16}
                    />
                  )}

                  Confirmar cancelamento
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}