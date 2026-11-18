import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  ReceiptText,
  WalletCards,
  XCircle,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../../../../../lib/supabaseClient'
import {
  buscarFinanceiroContratoDetalhado,
} from '../../../../pages/financeiro/services/financeiroService'
import type {
  FinanceiroContratoDetalhado,
  ParcelaFinanceiraComSituacao,
} from '../../../../pages/financeiro/types/financeiro'
import {
  formatarFormaPagamento,
  formatarMoeda,
} from '../../../../pages/financeiro/services/financeiroCalculos'
import type { ClienteCentral } from '../../../types/centralClientes'

interface ContratoCliente {
  id: string
  numero_apolice: string | null
  valor_aceito: number | null
  status: string | null
}

interface ParcelaCliente {
  contrato: ContratoCliente
  financeiro: FinanceiroContratoDetalhado
  parcela: ParcelaFinanceiraComSituacao
}

const formatarData = (
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

const formatarSituacao = (
  situacao?: string | null
) => {
  switch (situacao) {
    case 'A_VENCER':
      return 'A vencer'
    case 'VENCE_HOJE':
      return 'Vence hoje'
    case 'ATRASADA':
      return 'Atrasada'
    case 'PAGA':
      return 'Paga'
    case 'CANCELADA':
      return 'Cancelada'
    default:
      return situacao
        ?.toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letra =>
          letra.toUpperCase()
        ) || '—'
  }
}

const situacaoClass = (
  situacao?: string | null
) => {
  switch (situacao) {
    case 'A_VENCER':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'VENCE_HOJE':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'ATRASADA':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'PAGA':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'CANCELADA':
      return 'border-slate-200 bg-slate-100 text-slate-500'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

const descricaoParcela = (
  item: ParcelaCliente
) => {
  if (
    item.parcela.tipo_lancamento ===
    'AVULSO'
  ) {
    return (
      item.parcela.descricao ||
      'Lançamento avulso'
    )
  }

  if (
    item.parcela.numero_parcela ==
    null
  ) {
    return 'Parcela'
  }

  return `Parcela ${item.parcela.numero_parcela}/${item.financeiro.financeiro.quantidade_parcelas}`
}

function ResumoCard({
  titulo,
  valor,
  quantidade,
  icone,
  destaque = 'normal',
}: {
  titulo: string
  valor: number
  quantidade: number
  icone: React.ReactNode
  destaque?:
    | 'normal'
    | 'alerta'
    | 'sucesso'
}) {
  const classes = {
    normal:
      'text-slate-800',
    alerta:
      'text-rose-600',
    sucesso:
      'text-emerald-600',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {titulo}
          </p>

          <p
            className={`mt-1 text-lg font-bold ${classes[destaque]}`}
          >
            {formatarMoeda(valor)}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {quantidade}{' '}
            {quantidade === 1
              ? 'lançamento'
              : 'lançamentos'}
          </p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
          {icone}
        </div>
      </div>
    </div>
  )
}

export default function ClienteFinanceiroTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const navigate = useNavigate()

  const [itens, setItens] =
    useState<ParcelaCliente[]>([])

  const [loading, setLoading] =
    useState(true)

  const carregar =
    useCallback(async () => {
      setLoading(true)

      try {
        const coluna =
          cliente.tipo === 'PF'
            ? 'crm_pessoa_id'
            : 'crm_empresa_id'

        const {
          data: contratos,
          error: contratosError,
        } = await supabase
          .from('crm_contratos')
          .select(`
            id,
            numero_apolice,
            valor_aceito,
            status
          `)
          .eq(coluna, cliente.id)
          .order('created_at', {
            ascending: false,
          })

        if (contratosError) {
          throw contratosError
        }

        if (!contratos?.length) {
          setItens([])
          return
        }

        const resultados =
          await Promise.all(
            contratos.map(
              async contrato => {
                const financeiro =
                  await buscarFinanceiroContratoDetalhado(
                    contrato.id
                  )

                return {
                  contrato:
                    contrato as ContratoCliente,
                  financeiro,
                }
              }
            )
          )

        const parcelas =
          resultados.flatMap(
            resultado => {
              if (
                !resultado.financeiro
              ) {
                return []
              }

              return resultado.financeiro.parcelas.map(
                parcela => ({
                  contrato:
                    resultado.contrato,
                  financeiro:
                    resultado.financeiro!,
                  parcela,
                })
              )
            }
          )

        parcelas.sort(
          (a, b) => {
            const dataA =
              a.parcela
                .data_vencimento || ''

            const dataB =
              b.parcela
                .data_vencimento || ''

            return dataA.localeCompare(
              dataB
            )
          }
        )

        setItens(parcelas)
      } catch (error: any) {
        console.error(
          'Erro ao carregar financeiro do cliente:',
          error
        )

        toast.error(
          error?.message ||
            'Não foi possível carregar o financeiro do cliente.'
        )

        setItens([])
      } finally {
        setLoading(false)
      }
    }, [
      cliente.id,
      cliente.tipo,
    ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const resumo = useMemo(() => {
    return itens.reduce(
      (acc, item) => {
        const valor = Number(
          item.parcela.valor || 0
        )

        switch (
          item.parcela.situacao
        ) {
          case 'A_VENCER':
            acc.valorAVencer += valor
            acc.qtdAVencer++
            break

          case 'VENCE_HOJE':
            acc.valorVenceHoje += valor
            acc.qtdVenceHoje++
            break

          case 'ATRASADA':
            acc.valorAtrasado += valor
            acc.qtdAtrasado++
            break

          case 'PAGA':
            acc.valorPago += valor
            acc.qtdPago++
            break

          case 'CANCELADA':
            acc.valorCancelado += valor
            acc.qtdCancelado++
            break
        }

        return acc
      },
      {
        valorAVencer: 0,
        valorVenceHoje: 0,
        valorAtrasado: 0,
        valorPago: 0,
        valorCancelado: 0,

        qtdAVencer: 0,
        qtdVenceHoje: 0,
        qtdAtrasado: 0,
        qtdPago: 0,
        qtdCancelado: 0,
      }
    )
  }, [itens])

  const abrirFinanceiro = (
    contratoId: string
  ) => {
    navigate(
      `/whatsapp/financeiro/contratos/${contratoId}`
    )
  }

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">
          Financeiro
        </h3>

        <p className="mt-0.5 text-xs text-slate-400">
          Parcelas e pagamentos dos
          contratos deste cliente.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ResumoCard
          titulo="A vencer"
          valor={
            resumo.valorAVencer
          }
          quantidade={
            resumo.qtdAVencer
          }
          icone={
            <CalendarClock
              size={16}
            />
          }
        />

        <ResumoCard
          titulo="Vence hoje"
          valor={
            resumo.valorVenceHoje
          }
          quantidade={
            resumo.qtdVenceHoje
          }
          icone={
            <Clock3 size={16} />
          }
        />

        <ResumoCard
          titulo="Atrasadas"
          valor={
            resumo.valorAtrasado
          }
          quantidade={
            resumo.qtdAtrasado
          }
          destaque="alerta"
          icone={
            <AlertCircle
              size={16}
            />
          }
        />

        <ResumoCard
          titulo="Pagas"
          valor={
            resumo.valorPago
          }
          quantidade={
            resumo.qtdPago
          }
          destaque="sucesso"
          icone={
            <CheckCircle2
              size={16}
            />
          }
        />

        <ResumoCard
          titulo="Canceladas"
          valor={
            resumo.valorCancelado
          }
          quantidade={
            resumo.qtdCancelado
          }
          icone={
            <XCircle size={16} />
          }
        />
      </div>

      {itens.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
            <ReceiptText
              size={18}
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-600">
            Nenhuma parcela financeira
          </p>

          <p className="mt-1 max-w-md text-xs text-slate-400">
            Este cliente ainda não possui
            parcelas financeiras lançadas
            em seus contratos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <WalletCards
                size={16}
                className="text-blue-600"
              />

              <h4 className="text-sm font-bold text-slate-800">
                Parcelas
              </h4>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {itens.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {itens.map(item => (
              <article
                key={item.parcela.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  abrirFinanceiro(
                    item.contrato.id
                  )
                }
                onKeyDown={event => {
                  if (
                    event.key ===
                      'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault()

                    abrirFinanceiro(
                      item.contrato.id
                    )
                  }
                }}
                className="group cursor-pointer p-4 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CircleDollarSign
                        size={17}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">
                          {descricaoParcela(
                            item
                          )}
                        </h4>

                        <span
                          className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${situacaoClass(
                            item.parcela
                              .situacao
                          )}`}
                        >
                          {formatarSituacao(
                            item.parcela
                              .situacao
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        <span>
                          Apólice{' '}
                          {item.contrato
                            .numero_apolice ||
                            'não informada'}
                        </span>

                        <span>•</span>

                        <span>
                          {formatarFormaPagamento(
                            item.financeiro
                              .financeiro
                              .forma_pagamento
                          )}
                        </span>

                        {item.parcela
                          .data_pagamento && (
                          <>
                            <span>•</span>

                            <span className="text-emerald-600">
                              Pago em{' '}
                              {formatarData(
                                item
                                  .parcela
                                  .data_pagamento
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Vencimento
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {formatarData(
                          item.parcela
                            .data_vencimento
                        )}
                      </p>
                    </div>

                    <div className="min-w-[110px] text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Valor
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatarMoeda(
                          Number(
                            item.parcela
                              .valor || 0
                          )
                        )}
                      </p>
                    </div>

                    <ChevronRight
                      size={17}
                      className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}