import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  HandCoins,
  Loader2,
  ReceiptText,
  WalletCards,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../../../../../auth/AuthContext'
import { supabase } from '../../../../../../lib/supabaseClient'
import type { ClienteCentral } from '../../../types/centralClientes'

interface ContratoComissao {
  id: string
  numero_apolice: string | null
}

interface ComissaoCorretora {
  id: string
  contrato_id: string
  percentual_comissao: number | null
  valor_base_calculo: number
  valor_comissao_bruta: number
  modo_provisionamento: string | null
  quantidade_provisoes: number | null
  tipo_calculo_comissao: string
  valor_comissao_fixa: number | null
  created_at: string
}

interface RecebimentoComissao {
  id: string
  comissao_id: string
  contrato_id: string
  numero_provisao: number
  valor_previsto: number
  data_prevista: string
  status: 'PENDENTE' | 'RECEBIDA' | 'CANCELADA'
  valor_recebido: number | null
  data_recebimento: string | null
}

interface SplitCorretor {
  id: string
  comissao_id: string
  contrato_id: string
  tipo_participante: string
  tipo_calculo: string
  base_percentual: string | null
  percentual: number | null
  valor_fixo: number | null
  valor_bruto_split: number
  valor_deducoes: number
  valor_liquido_split: number
}

interface PagamentoCorretor {
  id: string
  comissao_id: string
  split_id: string
  contrato_id: string
  numero_provisao: number
  descricao: string | null
  valor_previsto: number
  data_prevista: string
  status: 'PENDENTE' | 'PAGA' | 'CANCELADA'
  valor_pago: number | null
  data_pagamento: string | null
}

interface ItemCorretora {
  contrato: ContratoComissao
  comissao: ComissaoCorretora
  recebimentos: RecebimentoComissao[]
}

interface ItemCorretor {
  contrato: ContratoComissao
  split: SplitCorretor
  pagamentos: PagamentoCorretor[]
}

const moeda = (
  valor?: number | null
) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

const percentual = (
  valor?: number | null
) => {
  if (valor == null) return '—'

  return `${Number(valor)
    .toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}%`
}

const data = (
  valor?: string | null
) => {
  if (!valor) return '—'

  const [ano, mes, dia] =
    valor.substring(0, 10).split('-')

  if (!ano || !mes || !dia) {
    return valor
  }

  return `${dia}/${mes}/${ano}`
}

const modoProvisionamento = (
  valor?: string | null
) => {
  switch (valor) {
    case 'ANTECIPADO':
      return 'Antecipado'
    case 'PARCELADO':
      return 'Parcelado'
    case 'VINCULADO_A_PARCELAS':
      return 'Vinculado às parcelas'
    case 'VITALICIO_PROVISIONADO':
      return 'Vitalício provisionado'
    default:
      return '—'
  }
}

function CardResumo({
  titulo,
  valor,
  descricao,
  icone,
}: {
  titulo: string
  valor: string
  descricao: string
  icone: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {titulo}
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {valor}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {descricao}
          </p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          {icone}
        </div>
      </div>
    </div>
  )
}

export default function ClienteComissoesTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const [itensCorretora, setItensCorretora] =
    useState<ItemCorretora[]>([])

  const [itensCorretor, setItensCorretor] =
    useState<ItemCorretor[]>([])

  const [loading, setLoading] =
    useState(true)

  const carregar = useCallback(async () => {
    if (!userProfile) return

    setLoading(true)

    try {
      setItensCorretora([])
      setItensCorretor([])

      const coluna =
        cliente.tipo === 'PF'
          ? 'crm_pessoa_id'
          : 'crm_empresa_id'

      const {
        data: contratosData,
        error: contratosError,
      } = await supabase
        .from('crm_contratos')
        .select(`
          id,
          numero_apolice
        `)
        .eq(coluna, cliente.id)
        .order('created_at', {
          ascending: false,
        })

      if (contratosError) {
        throw contratosError
      }

      const contratos =
        (contratosData ||
          []) as ContratoComissao[]

      if (!contratos.length) {
        return
      }

      const contratoIds =
        contratos.map(item => item.id)

      const contratoMap =
        new Map(
          contratos.map(item => [
            item.id,
            item,
          ])
        )

      /*
       * ============================
       * CORRETORA
       * ============================
       *
       * Pode enxergar a estrutura
       * econômica completa.
       */
      if (
        userProfile.tipo_usuario ===
        'CORRETORA'
      ) {
        const {
          data: comissoesData,
          error: comissoesError,
        } = await supabase
          .from('crm_comissoes')
          .select(`
            id,
            contrato_id,
            percentual_comissao,
            valor_base_calculo,
            valor_comissao_bruta,
            modo_provisionamento,
            quantidade_provisoes,
            tipo_calculo_comissao,
            valor_comissao_fixa,
            created_at
          `)
          .in(
            'contrato_id',
            contratoIds
          )
          .order('created_at', {
            ascending: false,
          })

        if (comissoesError) {
          throw comissoesError
        }

        const comissoes =
          (comissoesData ||
            []) as ComissaoCorretora[]

        if (!comissoes.length) {
          return
        }

        const comissaoIds =
          comissoes.map(
            item => item.id
          )

        const {
          data: recebimentosData,
          error: recebimentosError,
        } = await supabase
          .from(
            'crm_comissao_recebimentos'
          )
          .select(`
            id,
            comissao_id,
            contrato_id,
            numero_provisao,
            valor_previsto,
            data_prevista,
            status,
            valor_recebido,
            data_recebimento
          `)
          .in(
            'comissao_id',
            comissaoIds
          )
          .order('data_prevista', {
            ascending: true,
          })

        if (recebimentosError) {
          throw recebimentosError
        }

        const recebimentos =
          (recebimentosData ||
            []) as RecebimentoComissao[]

        setItensCorretora(
          comissoes
            .map(comissao => {
              const contrato =
                contratoMap.get(
                  comissao.contrato_id
                )

              if (!contrato) {
                return null
              }

              return {
                contrato,
                comissao,
                recebimentos:
                  recebimentos.filter(
                    recebimento =>
                      recebimento
                        .comissao_id ===
                      comissao.id
                  ),
              }
            })
            .filter(
              Boolean
            ) as ItemCorretora[]
        )

        return
      }

      /*
       * ============================
       * CORRETOR
       * ============================
       *
       * NÃO consulta crm_comissoes.
       *
       * Começa diretamente pelo
       * próprio split.
       */
      if (
        userProfile.tipo_usuario ===
        'CORRETOR'
      ) {
        const {
          data: splitsData,
          error: splitsError,
        } = await supabase
          .from('crm_comissao_splits')
          .select(`
            id,
            comissao_id,
            contrato_id,
            tipo_participante,
            tipo_calculo,
            base_percentual,
            percentual,
            valor_fixo,
            valor_bruto_split,
            valor_deducoes,
            valor_liquido_split
          `)
          .eq(
            'usuario_id',
            userProfile.id
          )
          .in(
            'contrato_id',
            contratoIds
          )
          .order('created_at', {
            ascending: false,
          })

        if (splitsError) {
          throw splitsError
        }

        const splits =
          (splitsData ||
            []) as SplitCorretor[]

        if (!splits.length) {
          return
        }

        const splitIds =
          splits.map(item => item.id)

        const {
          data: pagamentosData,
          error: pagamentosError,
        } = await supabase
          .from(
            'crm_comissao_pagamentos'
          )
          .select(`
            id,
            comissao_id,
            split_id,
            contrato_id,
            numero_provisao,
            descricao,
            valor_previsto,
            data_prevista,
            status,
            valor_pago,
            data_pagamento
          `)
          .in(
            'split_id',
            splitIds
          )
          .order('data_prevista', {
            ascending: true,
          })

        if (pagamentosError) {
          throw pagamentosError
        }

        const pagamentos =
          (pagamentosData ||
            []) as PagamentoCorretor[]

        setItensCorretor(
          splits
            .map(split => {
              const contrato =
                contratoMap.get(
                  split.contrato_id
                )

              if (!contrato) {
                return null
              }

              return {
                contrato,
                split,
                pagamentos:
                  pagamentos.filter(
                    pagamento =>
                      pagamento
                        .split_id ===
                      split.id
                  ),
              }
            })
            .filter(
              Boolean
            ) as ItemCorretor[]
        )

        return
      }
    } catch (error: any) {
      console.error(
        'Erro ao carregar comissões do cliente:',
        error
      )

      toast.error(
        error?.message ||
          'Não foi possível carregar as comissões do cliente.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    cliente.id,
    cliente.tipo,
    userProfile,
  ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /*
   * ============================
   * RESUMO CORRETORA
   * ============================
   */

  const resumoCorretora =
    useMemo(() => {
      return itensCorretora.reduce(
        (acc, item) => {
          acc.comissaoBruta +=
            Number(
              item.comissao
                .valor_comissao_bruta ||
                0
            )

          item.recebimentos.forEach(
            recebimento => {
              if (
                recebimento.status ===
                'RECEBIDA'
              ) {
                acc.recebido += Number(
                  recebimento
                    .valor_recebido ||
                    recebimento
                      .valor_previsto ||
                    0
                )
              }

              if (
                recebimento.status ===
                'PENDENTE'
              ) {
                acc.pendente += Number(
                  recebimento
                    .valor_previsto || 0
                )
              }
            }
          )

          return acc
        },
        {
          comissaoBruta: 0,
          recebido: 0,
          pendente: 0,
        }
      )
    }, [itensCorretora])

  /*
   * ============================
   * RESUMO CORRETOR
   * ============================
   */

  const resumoCorretor =
    useMemo(() => {
      return itensCorretor.reduce(
        (acc, item) => {
          acc.valorLiquido +=
            Number(
              item.split
                .valor_liquido_split ||
                0
            )

          item.pagamentos.forEach(
            pagamento => {
              if (
                pagamento.status ===
                'PAGA'
              ) {
                acc.pago += Number(
                  pagamento.valor_pago ||
                    pagamento.valor_previsto ||
                    0
                )
              }

              if (
                pagamento.status ===
                'PENDENTE'
              ) {
                acc.pendente += Number(
                  pagamento
                    .valor_previsto || 0
                )
              }
            }
          )

          return acc
        },
        {
          valorLiquido: 0,
          pago: 0,
          pendente: 0,
        }
      )
    }, [itensCorretor])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          size={22}
          className="animate-spin text-blue-600"
        />
      </div>
    )
  }

  /*
   * ============================
   * CORRETORA
   * ============================
   */

  if (
    userProfile?.tipo_usuario ===
    'CORRETORA'
  ) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Comissões
          </h3>

          <p className="mt-0.5 text-xs text-slate-400">
            Comissões relacionadas aos
            contratos deste cliente.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CardResumo
            titulo="Comissão bruta"
            valor={moeda(
              resumoCorretora.comissaoBruta
            )}
            descricao="Total provisionado"
            icone={
              <HandCoins size={16} />
            }
          />

          <CardResumo
            titulo="Recebido"
            valor={moeda(
              resumoCorretora.recebido
            )}
            descricao="Recebido pela corretora"
            icone={
              <CheckCircle2
                size={16}
              />
            }
          />

          <CardResumo
            titulo="A receber"
            valor={moeda(
              resumoCorretora.pendente
            )}
            descricao="Provisões pendentes"
            icone={
              <CalendarClock
                size={16}
              />
            }
          />
        </div>

        {itensCorretora.length ===
        0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            {itensCorretora.map(
              item => {
                const recebido =
                  item.recebimentos
                    .filter(
                      recebimento =>
                        recebimento.status ===
                        'RECEBIDA'
                    )
                    .reduce(
                      (total, atual) =>
                        total +
                        Number(
                          atual.valor_recebido ||
                            atual.valor_previsto ||
                            0
                        ),
                      0
                    )

                const pendente =
                  item.recebimentos
                    .filter(
                      recebimento =>
                        recebimento.status ===
                        'PENDENTE'
                    )
                    .reduce(
                      (total, atual) =>
                        total +
                        Number(
                          atual.valor_previsto ||
                            0
                        ),
                      0
                    )

                return (
                  <article
                    key={
                      item.comissao.id
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(
                        `/whatsapp/comissoes/contratos/${item.contrato.id}`
                      )
                    }
                    onKeyDown={event => {
                      if (
                        event.key ===
                          'Enter' ||
                        event.key === ' '
                      ) {
                        event.preventDefault()

                        navigate(
                          `/whatsapp/comissoes/contratos/${item.contrato.id}`
                        )
                      }
                    }}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <HandCoins
                            size={18}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800">
                              {item
                                .contrato
                                .numero_apolice
                                ? `Apólice ${item.contrato.numero_apolice}`
                                : 'Contrato'}
                            </h4>

                            <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-700">
                              {modoProvisionamento(
                                item
                                  .comissao
                                  .modo_provisionamento
                              )}
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {item.comissao
                              .tipo_calculo_comissao ===
                            'PERCENTUAL'
                              ? `${percentual(
                                  item
                                    .comissao
                                    .percentual_comissao
                                )} sobre ${moeda(
                                  item
                                    .comissao
                                    .valor_base_calculo
                                )}`
                              : `Comissão fixa de ${moeda(
                                  item
                                    .comissao
                                    .valor_comissao_fixa
                                )}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <MiniValor
                          titulo="Comissão"
                          valor={moeda(
                            item.comissao
                              .valor_comissao_bruta
                          )}
                        />

                        <MiniValor
                          titulo="Recebido"
                          valor={moeda(
                            recebido
                          )}
                          classe="text-emerald-700"
                        />

                        <MiniValor
                          titulo="Pendente"
                          valor={moeda(
                            pendente
                          )}
                        />

                        <ChevronRight
                          size={17}
                          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600"
                        />
                      </div>
                    </div>
                  </article>
                )
              }
            )}
          </div>
        )}
      </div>
    )
  }

  /*
   * ============================
   * CORRETOR
   * ============================
   */

  if (
    userProfile?.tipo_usuario ===
    'CORRETOR'
  ) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Minhas comissões
          </h3>

          <p className="mt-0.5 text-xs text-slate-400">
            Somente seus próprios
            splits e pagamentos
            relacionados a este cliente.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CardResumo
            titulo="Minha comissão"
            valor={moeda(
              resumoCorretor.valorLiquido
            )}
            descricao="Valor líquido dos seus splits"
            icone={
              <CircleDollarSign
                size={16}
              />
            }
          />

          <CardResumo
            titulo="Recebido"
            valor={moeda(
              resumoCorretor.pago
            )}
            descricao="Pagamentos recebidos"
            icone={
              <CheckCircle2
                size={16}
              />
            }
          />

          <CardResumo
            titulo="A receber"
            valor={moeda(
              resumoCorretor.pendente
            )}
            descricao="Pagamentos pendentes"
            icone={
              <Clock3 size={16} />
            }
          />
        </div>

        {itensCorretor.length ===
        0 ? (
          <Empty
            mensagem="Nenhuma comissão destinada a você foi encontrada para os contratos deste cliente."
          />
        ) : (
          <div className="space-y-3">
            {itensCorretor.map(
              item => {
                const pago =
                  item.pagamentos
                    .filter(
                      pagamento =>
                        pagamento.status ===
                        'PAGA'
                    )
                    .reduce(
                      (total, atual) =>
                        total +
                        Number(
                          atual.valor_pago ||
                            atual.valor_previsto ||
                            0
                        ),
                      0
                    )

                const pendente =
                  item.pagamentos
                    .filter(
                      pagamento =>
                        pagamento.status ===
                        'PENDENTE'
                    )
                    .reduce(
                      (total, atual) =>
                        total +
                        Number(
                          atual.valor_previsto ||
                            0
                        ),
                      0
                    )

                return (
                  <article
                    key={
                      item.split.id
                    }
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <HandCoins
                            size={18}
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800">
                            {item.contrato
                              .numero_apolice
                              ? `Apólice ${item.contrato.numero_apolice}`
                              : 'Contrato'}
                          </h4>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {item.split
                              .tipo_calculo ===
                            'PERCENTUAL'
                              ? `${percentual(
                                  item
                                    .split
                                    .percentual
                                )} • Split ${item.split.tipo_participante}`
                              : `Valor fixo • Split ${item.split.tipo_participante}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <MiniValor
                          titulo="Bruto"
                          valor={moeda(
                            item.split
                              .valor_bruto_split
                          )}
                        />

                        <MiniValor
                          titulo="Deduções"
                          valor={moeda(
                            item.split
                              .valor_deducoes
                          )}
                        />

                        <MiniValor
                          titulo="Líquido"
                          valor={moeda(
                            item.split
                              .valor_liquido_split
                          )}
                          classe="text-amber-700"
                        />

                        <MiniValor
                          titulo="Pago"
                          valor={moeda(
                            pago
                          )}
                          classe="text-emerald-700"
                        />

                        <MiniValor
                          titulo="Pendente"
                          valor={moeda(
                            pendente
                          )}
                        />
                      </div>
                    </div>

                    {item.pagamentos.length >
                      0 && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <WalletCards
                            size={14}
                            className="text-slate-400"
                          />

                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Minhas provisões
                          </p>
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {item.pagamentos.map(
                            pagamento => (
                              <div
                                key={
                                  pagamento.id
                                }
                                className="rounded-lg bg-slate-50 px-3 py-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-slate-600">
                                    Provisão{' '}
                                    {
                                      pagamento.numero_provisao
                                    }
                                  </span>

                                  <span
                                    className={`text-[9px] font-bold uppercase ${
                                      pagamento.status ===
                                      'PAGA'
                                        ? 'text-emerald-600'
                                        : pagamento.status ===
                                            'CANCELADA'
                                          ? 'text-rose-500'
                                          : 'text-amber-600'
                                    }`}
                                  >
                                    {
                                      pagamento.status
                                    }
                                  </span>
                                </div>

                                <div className="mt-2 flex items-end justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] text-slate-400">
                                      {pagamento.status ===
                                      'PAGA'
                                        ? `Pago em ${data(
                                            pagamento.data_pagamento
                                          )}`
                                        : `Previsto para ${data(
                                            pagamento.data_prevista
                                          )}`}
                                    </p>
                                  </div>

                                  <p className="text-xs font-bold text-slate-700">
                                    {moeda(
                                      pagamento.status ===
                                        'PAGA'
                                        ? pagamento.valor_pago
                                        : pagamento.valor_previsto
                                    )}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                )
              }
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Empty
      mensagem="Seu perfil não possui acesso definido ao módulo de comissões."
    />
  )
}

function MiniValor({
  titulo,
  valor,
  classe = 'text-slate-800',
}: {
  titulo: string
  valor: string
  classe?: string
}) {
  return (
    <div className="min-w-[90px]">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>

      <p
        className={`mt-1 text-xs font-bold ${classe}`}
      >
        {valor}
      </p>
    </div>
  )
}

function Empty({
  mensagem = 'Nenhuma comissão encontrada para os contratos deste cliente.',
}: {
  mensagem?: string
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <ReceiptText size={18} />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        Nenhuma comissão
      </p>

      <p className="mt-1 max-w-md text-xs text-slate-400">
        {mensagem}
      </p>
    </div>
  )
}