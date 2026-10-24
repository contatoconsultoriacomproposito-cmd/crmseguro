import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'

import type {
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core'

import type {
  DateClickArg,
  EventResizeDoneArg,
} from '@fullcalendar/interaction'

import type {
  AgendaItem,
  AgendaCategoria,
} from '../types/agenda'

export type AgendaCalendarView =
  | 'dayGridMonth'
  | 'timeGridWeek'
  | 'timeGridDay'

export interface AgendaCalendarPeriodo {
  inicio: string
  fim: string
  dataReferencia: Date
  visualizacao: AgendaCalendarView
}

export interface AgendaCalendarNovoHorario {
  inicioEm: string
  fimEm: string | null
  diaInteiro: boolean
}

export interface AgendaCalendarReagendamento {
  compromisso: AgendaItem
  inicioEm: string
  fimEm: string | null
  diaInteiro: boolean
}

export interface AgendaCalendarRef {
  anterior: () => void
  proximo: () => void
  hoje: () => void
  alterarVisualizacao: (
    visualizacao: AgendaCalendarView
  ) => void
}

interface AgendaCalendarProps {
  compromissos: AgendaItem[]

  visualizacao: AgendaCalendarView

  onCompromissoClick?: (
    compromisso: AgendaItem
  ) => void

  onNovoHorario?: (
    horario: AgendaCalendarNovoHorario
  ) => void

  onPeriodoChange?: (
    periodo: AgendaCalendarPeriodo
  ) => void

  onReagendar?: (
    reagendamento: AgendaCalendarReagendamento
  ) => Promise<void> | void
}

const categoriaConfig: Record<
  AgendaCategoria,
  {
    label: string
    className: string
  }
> = {
  COMERCIAL: {
    label: 'Comercial',
    className:
      'agenda-evento-comercial',
  },

  RENOVACAO: {
    label: 'Renovação',
    className:
      'agenda-evento-renovacao',
  },

  SINISTRO: {
    label: 'Sinistro',
    className:
      'agenda-evento-sinistro',
  },

  ASSISTENCIA: {
    label: 'Assistência',
    className:
      'agenda-evento-assistencia',
  },

  ANIVERSARIO: {
    label: 'Aniversário',
    className:
      'agenda-evento-aniversario',
  },

  MARKETING: {
    label: 'Marketing',
    className:
      'agenda-evento-marketing',
  },

  TAREFA: {
    label: 'Tarefa',
    className:
      'agenda-evento-tarefa',
  },

  TREINAMENTO: {
    label: 'Treinamento',
    className:
      'agenda-evento-treinamento',
  },

  REUNIAO: {
    label: 'Reunião',
    className:
      'agenda-evento-reuniao',
  },

  OUTRO: {
    label: 'Outro',
    className:
      'agenda-evento-outro',
  },
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

function normalizarDataIso(
  data: Date | null
) {
  return data
    ? data.toISOString()
    : null
}

const AgendaCalendar = forwardRef<
    AgendaCalendarRef,
    AgendaCalendarProps
    >(function AgendaCalendar(
    {
        compromissos,
        visualizacao,
        onCompromissoClick,
        onNovoHorario,
        onPeriodoChange,
        onReagendar,
    },
    ref
    ) {
  const calendarRef =
    useRef<FullCalendar | null>(null)

    useImperativeHandle(
        ref,
        () => ({
            anterior() {
            calendarRef.current
                ?.getApi()
                .prev()
            },

            proximo() {
            calendarRef.current
                ?.getApi()
                .next()
            },

            hoje() {
            calendarRef.current
                ?.getApi()
                .today()
            },

            alterarVisualizacao(
            novaVisualizacao
            ) {
            const api =
                calendarRef.current?.getApi()

            if (!api) {
                return
            }

            if (
                api.view.type ===
                novaVisualizacao
            ) {
                return
            }

            api.changeView(
                novaVisualizacao
            )
            },
        }),
        []
        )

    useEffect(() => {
        const api =
            calendarRef.current?.getApi()

        if (!api) {
            return
        }

        if (
            api.view.type ===
            visualizacao
        ) {
            return
        }

        api.changeView(visualizacao)
        }, [visualizacao])

  const eventos = useMemo(
    () =>
      compromissos.map(
        compromisso => {
          const config =
            categoriaConfig[
              compromisso.categoria
            ]

          return {
            id: compromisso.id,

            title: compromisso.titulo,

            start: compromisso.inicioEm,

            end:
              compromisso.fimEm ??
              undefined,

            allDay:
              compromisso.diaInteiro,

            editable:
              compromisso.status ===
              'PENDENTE',

            startEditable:
              compromisso.status ===
              'PENDENTE',

            durationEditable:
              compromisso.status ===
                'PENDENTE' &&
              !compromisso.diaInteiro,

            classNames: [
              'agenda-evento',
              config.className,

              `agenda-prioridade-${compromisso.prioridade.toLowerCase()}`,

              `agenda-status-${compromisso.status.toLowerCase()}`,

              compromisso.natureza ===
              'INFORMATIVO'
                ? 'agenda-evento-informativo'
                : 'agenda-evento-compromisso',
            ],

            extendedProps: {
              compromisso,
              categoriaLabel:
                config.label,
            },
          }
        }
      ),
    [compromissos]
  )

  const handleEventClick = (
    info: EventClickArg
  ) => {
    const compromisso =
      info.event.extendedProps
        .compromisso as
        | AgendaItem
        | undefined

    if (!compromisso) {
      return
    }

    onCompromissoClick?.(
      compromisso
    )
  }

  const handleDateClick = (
    info: DateClickArg
  ) => {
    if (!onNovoHorario) {
      return
    }

    if (info.allDay) {
      onNovoHorario({
        inicioEm:
          info.date.toISOString(),

        fimEm: null,

        diaInteiro: true,
      })

      return
    }

    const fimPadrao =
      adicionarMinutos(
        info.date,
        30
      )

    onNovoHorario({
      inicioEm:
        info.date.toISOString(),

      fimEm:
        fimPadrao.toISOString(),

      diaInteiro: false,
    })
  }

  const handleEventDrop = async (
    info: EventDropArg
  ) => {
    const compromisso =
      info.event.extendedProps
        .compromisso as
        | AgendaItem
        | undefined

    if (
      !compromisso ||
      !info.event.start ||
      !onReagendar
    ) {
      info.revert()
      return
    }

    try {
      await onReagendar({
        compromisso,

        inicioEm:
          info.event.start.toISOString(),

        fimEm:
          normalizarDataIso(
            info.event.end
          ),

        diaInteiro:
          info.event.allDay,
      })
    } catch (error) {
      console.error(
        'Erro ao mover compromisso:',
        error
      )

      info.revert()
    }
  }

  const handleEventResize = async (
    info: EventResizeDoneArg
  ) => {
    const compromisso =
      info.event.extendedProps
        .compromisso as
        | AgendaItem
        | undefined

    if (
      !compromisso ||
      !info.event.start ||
      !onReagendar
    ) {
      info.revert()
      return
    }

    try {
      await onReagendar({
        compromisso,

        inicioEm:
          info.event.start.toISOString(),

        fimEm:
          normalizarDataIso(
            info.event.end
          ),

        diaInteiro:
          info.event.allDay,
      })
    } catch (error) {
      console.error(
        'Erro ao alterar duração do compromisso:',
        error
      )

      info.revert()
    }
  }

  return (
    <div className="agenda-calendar w-full">
      <FullCalendar
        ref={calendarRef}

        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
        ]}

        locale={ptBrLocale}

        initialView={visualizacao}

        headerToolbar={false}

        height="auto"

        expandRows

        stickyHeaderDates

        nowIndicator

        selectable

        editable

        eventStartEditable

        eventDurationEditable

        dayMaxEvents={4}

        moreLinkClick="popover"

        weekends

        firstDay={0}

        slotMinTime="06:00:00"

        slotMaxTime="23:00:00"

        slotDuration="00:30:00"

        slotLabelInterval="01:00:00"

        scrollTime="08:00:00"

        allDaySlot

        allDayText="Dia inteiro"

        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}

        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}

        dayHeaderFormat={
            visualizacao === 'dayGridMonth'
                ? {
                    weekday: 'long',
                }
                : {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                }
            }

        events={eventos}

        eventClick={
          handleEventClick
        }

        dateClick={
          handleDateClick
        }

        eventDrop={
          handleEventDrop
        }

        eventResize={
          handleEventResize
        }

        datesSet={info => {
          const viewType =
            info.view
              .type as AgendaCalendarView

          onPeriodoChange?.({
            inicio:
              info.start.toISOString(),

            fim:
              info.end.toISOString(),

            dataReferencia:
              info.view.currentStart,

            visualizacao:
              viewType,
          })
        }}

        eventContent={info => {
          const compromisso =
            info.event
              .extendedProps
              .compromisso as AgendaItem

          const categoriaLabel =
            info.event
              .extendedProps
              .categoriaLabel as string

          if (
            info.view.type ===
            'dayGridMonth'
          ) {
            return (
              <div className="min-w-0 px-1 py-0.5">
                <div className="flex min-w-0 items-center gap-1">
                  {!compromisso.diaInteiro &&
                    info.timeText && (
                      <span className="shrink-0 text-[10px] font-bold opacity-80">
                        {info.timeText}
                      </span>
                    )}

                  <span className="truncate text-[11px] font-semibold">
                    {
                      compromisso.titulo
                    }
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div className="min-w-0 overflow-hidden px-1.5 py-1">
              {info.timeText && (
                <div className="text-[10px] font-bold opacity-80">
                  {info.timeText}
                </div>
              )}

              <div className="truncate text-xs font-bold">
                {compromisso.titulo}
              </div>

              <div className="mt-0.5 truncate text-[10px] opacity-75">
                {categoriaLabel}
              </div>
            </div>
          )
        }}
      />
    </div>
  )
})
export default AgendaCalendar