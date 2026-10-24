import {
  ChevronRight,
  CircleDollarSign,
  Loader2,
  ReceiptText,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { supabase } from '../../../../lib/supabaseClient'
import { buscarFinanceiroContratoDetalhado } from '../../pages/financeiro/services/financeiroService'

type TipoCliente = 'PF' | 'PJ'

interface Props {
  clienteId: string
  tipoCliente: TipoCliente
}

interface ContratoRow {
  id: string
  numero_apolice: string | null
  produto_id: string
  seguradora_id: string | null
  valor_atual: number | null
  produtoNome?: string
  seguradoraNome?: string
}

interface FinanceiroItem {
  contrato: ContratoRow
  detalhe: any
}

const moeda = (
  valor: number | null | undefined
) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

const formatarData = (
  valor?: string | null
) => {
  if (!valor) return '—'

  const somenteData =
    valor.includes('T')
      ? valor.split('T')[0]
      : valor

  const partes = somenteData.split('-')

  if (partes.length !== 3) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const situacaoClass = (
  situacao?: string | null
) => {
  switch (situacao) {
    case 'PAGA':
    case 'PAGO':
      return 'bg-emerald-50 text-emerald-700'

    case 'ATRASADA':
    case 'ATRASADO':
      return 'bg-rose-50 text-rose-700'

    case 'VENCE_HOJE':
      return 'bg-amber-50 text-amber-700'

    case 'CANCELADA':
    case 'CANCELADO':
      return 'bg-slate-100 text-slate-500'

    default:
      return 'bg-blue-50 text-blue-700'
  }
}

export default function ContactFinanceiroTab({
  clienteId,
  tipoCliente,
}: Props) {
  const navigate = useNavigate()

  const [itens, setItens] =
    useState<FinanceiroItem[]>([])

  const [loading, setLoading] =
    useState(true)

  const carregar =
    useCallback(async () => {
      if (!clienteId) {
        setItens([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const coluna =
          tipoCliente === 'PF'
            ? 'crm_pessoa_id'
            : 'crm_empresa_id'

        const {
          data,
          error,
        } = await supabase
          .from('crm_contratos')
          .select(`
            id,
            numero_apolice,
            produto_id,
            seguradora_id,
            valor_atual
          `)
          .eq(
            coluna,
            clienteId
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )

        if (error) {
          throw error
        }

        const contratos =
          (data || []) as ContratoRow[]

        if (!contratos.length) {
          setItens([])
          return
        }

        const produtoIds = [
          ...new Set(
            contratos
              .map(
                item =>
                  item.produto_id
              )
              .filter(Boolean)
          ),
        ]

        const seguradoraIds = [
          ...new Set(
            contratos
              .map(
                item =>
                  item.seguradora_id
              )
              .filter(
                (
                  id
                ): id is string =>
                  Boolean(id)
              )
          ),
        ]

        const [
          produtosResult,
          seguradorasResult,
          financeiros,
        ] = await Promise.all([
          produtoIds.length
            ? supabase
                .from(
                  'base_produtos'
                )
                .select(
                  'id, nome'
                )
                .in(
                  'id',
                  produtoIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          seguradoraIds.length
            ? supabase
                .from(
                  'base_seguradoras'
                )
                .select(
                  'id, nome'
                )
                .in(
                  'id',
                  seguradoraIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          Promise.all(
            contratos.map(
              contrato =>
                buscarFinanceiroContratoDetalhado(
                  contrato.id
                )
            )
          ),
        ])

        if (
          produtosResult.error
        ) {
          throw produtosResult.error
        }

        if (
          seguradorasResult.error
        ) {
          throw seguradorasResult.error
        }

        const produtosMap =
          new Map(
            (
              produtosResult.data ||
              []
            ).map(
              (item: any) => [
                item.id,
                item.nome,
              ]
            )
          )

        const seguradorasMap =
          new Map(
            (
              seguradorasResult.data ||
              []
            ).map(
              (item: any) => [
                item.id,
                item.nome,
              ]
            )
          )

        const resultado =
          contratos
            .map(
              (
                contrato,
                index
              ) => ({
                contrato: {
                  ...contrato,

                  produtoNome:
                    produtosMap.get(
                      contrato.produto_id
                    ) ||
                    'Produto',

                  seguradoraNome:
                    contrato.seguradora_id
                      ? seguradorasMap.get(
                          contrato.seguradora_id
                        ) ||
                        'Seguradora'
                      : 'Seguradora',
                },

                detalhe:
                  financeiros[
                    index
                  ],
              })
            )
            .filter(
              item =>
                item.detalhe !==
                null
            )

        setItens(resultado)
      } catch (error: any) {
        console.error(
          'Erro ao carregar financeiro do contato:',
          error
        )

        setItens([])

        toast.error(
          error?.message ||
            'Não foi possível carregar o financeiro.'
        )
      } finally {
        setLoading(false)
      }
    }, [
      clienteId,
      tipoCliente,
    ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (loading) {
    return <Loading text="Carregando financeiro..." />
  }

  if (!itens.length) {
    return (
      <Empty
        text="Nenhum financeiro lançado para os contratos deste cliente."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-700">
          Financeiro
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          Parcelas reais das vendas no
          novo núcleo.
        </p>
      </div>

      {itens.map(
        ({
          contrato,
          detalhe,
        }) => (
          <div
            key={contrato.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/whatsapp/financeiro/contratos/${contrato.id}`
                )
              }
              className="group flex w-full items-start justify-between gap-3 p-3 text-left transition hover:bg-blue-50/30"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ReceiptText
                    size={14}
                    className="shrink-0 text-blue-500"
                  />

                  <p className="truncate text-xs font-semibold text-slate-800">
                    {contrato.produtoNome}
                  </p>
                </div>

                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {contrato.seguradoraNome}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Apólice:{' '}
                  {contrato.numero_apolice ||
                    'Aguardando emissão'}
                </p>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 text-slate-300 group-hover:text-blue-500"
              />
            </button>

            <div className="border-t border-slate-100 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Resumo
                  label="Total"
                  value={moeda(
                    detalhe.resumo
                      ?.valor_total ??
                      detalhe.financeiro
                        ?.valor_total
                  )}
                />

                <Resumo
                  label="Em aberto"
                  value={moeda(
                    detalhe.resumo
                      ?.valor_em_aberto ??
                      detalhe.resumo
                        ?.valor_a_receber
                  )}
                />

                <Resumo
                  label="Pago"
                  value={moeda(
                    detalhe.resumo
                      ?.valor_pago
                  )}
                />

                <Resumo
                  label="Atrasado"
                  value={moeda(
                    detalhe.resumo
                      ?.valor_atrasado
                  )}
                />
              </div>

              <div className="mt-3 space-y-2">
                {(
                  detalhe.parcelas ||
                  []
                ).map(
                  (
                    parcela: any
                  ) => (
                    <div
                      key={
                        parcela.id
                      }
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-700">
                          {parcela.tipo_lancamento ===
                          'AVULSO'
                            ? parcela.descricao ||
                              'Lançamento avulso'
                            : `Parcela ${
                                parcela.numero_parcela ??
                                ''
                              }`}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Vencimento{' '}
                          {formatarData(
                            parcela.data_vencimento
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {moeda(
                            parcela.valor
                          )}
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${situacaoClass(
                            parcela.situacao ||
                              parcela.status
                          )}`}
                        >
                          {(
                            parcela.situacao ||
                            parcela.status ||
                            'PENDENTE'
                          ).replaceAll(
                            '_',
                            ' '
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function Resumo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  )
}

function Loading({
  text,
}: {
  text: string
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
      <Loader2
        size={16}
        className="animate-spin"
      />
      {text}
    </div>
  )
}

function Empty({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
      <CircleDollarSign
        size={22}
        className="mx-auto text-slate-300"
      />

      <p className="mt-2 text-xs font-medium text-slate-600">
        Nenhum lançamento financeiro
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {text}
      </p>
    </div>
  )
}