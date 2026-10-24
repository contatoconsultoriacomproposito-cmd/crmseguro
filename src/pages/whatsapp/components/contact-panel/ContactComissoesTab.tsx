import {
  ChevronRight,
  HandCoins,
  Link2,
  Loader2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { supabase } from '../../../../lib/supabaseClient'
import { useAuth } from '../../../../auth/AuthContext'

type TipoCliente = 'PF' | 'PJ'

interface Props {
  contatoId: string
  clienteId: string
  tipoCliente: TipoCliente
}

interface Contrato {
  id: string
  proposta_id: string | null
  numero_apolice: string | null
  produto_id: string
  seguradora_id: string | null
  corretor_id: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  produtoNome?: string
  seguradoraNome?: string
  clienteNome?: string
  vinculada: boolean
}

interface ItemComissao {
  id: string
  contratoId: string
  contrato: Contrato
  bruto: number
  deducoes: number
  liquido: number
  pago: number
  pendente: number
  modo: 'PESSOAL' | 'GLOBAL'
}

interface VinculoRow {
  proposta_id: string
}

interface PessoaRow {
  id: string
  dados: Record<string, any> | null
}

interface EmpresaRow {
  id: string
  dados: Record<string, any> | null
}

const SELECT_CONTRATO = `
  id,
  proposta_id,
  numero_apolice,
  produto_id,
  seguradora_id,
  corretor_id,
  crm_pessoa_id,
  crm_empresa_id
`

const moeda = (
  valor?: number | null
) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

const objeto = (
  valor: unknown
): Record<string, any> => {
  if (
    valor &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  ) {
    return valor as Record<string, any>
  }

  return {}
}

async function carregarNomesClientes(
  contratos: Contrato[]
) {
  const pessoaIds = Array.from(
    new Set(
      contratos
        .map(item => item.crm_pessoa_id)
        .filter((id): id is string => !!id)
    )
  )

  const empresaIds = Array.from(
    new Set(
      contratos
        .map(item => item.crm_empresa_id)
        .filter((id): id is string => !!id)
    )
  )

  const [
    pessoasResult,
    empresasResult,
  ] = await Promise.all([
    pessoaIds.length
      ? supabase
          .from('crm_pessoas')
          .select('id, dados')
          .in('id', pessoaIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    empresaIds.length
      ? supabase
          .from('crm_empresas')
          .select('id, dados')
          .in('id', empresaIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  if (pessoasResult.error) {
    throw pessoasResult.error
  }

  if (empresasResult.error) {
    throw empresasResult.error
  }

  const pessoas = new Map<
    string,
    PessoaRow
  >()

  const empresas = new Map<
    string,
    EmpresaRow
  >()

  for (
    const pessoa of
    (pessoasResult.data || []) as PessoaRow[]
  ) {
    pessoas.set(
      pessoa.id,
      pessoa
    )
  }

  for (
    const empresa of
    (empresasResult.data || []) as EmpresaRow[]
  ) {
    empresas.set(
      empresa.id,
      empresa
    )
  }

  return {
    pessoas,
    empresas,
  }
}

function obterNomeCliente(
  contrato: Contrato,
  pessoas: Map<string, PessoaRow>,
  empresas: Map<string, EmpresaRow>
) {
  if (
    contrato.crm_pessoa_id
  ) {
    const pessoa =
      pessoas.get(
        contrato.crm_pessoa_id
      )

    const dados =
      objeto(
        pessoa?.dados
      )

    return (
      dados.nome ||
      dados.nome_completo ||
      dados.nome_razao_social ||
      'Pessoa sem nome'
    )
  }

  if (
    contrato.crm_empresa_id
  ) {
    const empresa =
      empresas.get(
        contrato.crm_empresa_id
      )

    const dados =
      objeto(
        empresa?.dados
      )

    return (
      dados.razao_social ||
      dados.nome_razao_social ||
      dados.nome ||
      dados.nome_fantasia ||
      'Empresa sem nome'
    )
  }

  return 'Cliente não identificado'
}

export default function ContactComissoesTab({
  contatoId,
  clienteId,
  tipoCliente,
}: Props) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const [itens, setItens] =
    useState<ItemComissao[]>([])

  const [loading, setLoading] =
    useState(true)

  const carregar =
    useCallback(async () => {
      if (
        !clienteId ||
        !userProfile
      ) {
        setItens([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const colunaCliente =
          tipoCliente === 'PF'
            ? 'crm_pessoa_id'
            : 'crm_empresa_id'

        /*
         * 1. CONTRATOS PRÓPRIOS DO CLIENTE
         */
        const resultadoProprios =
          await supabase
            .from('crm_contratos')
            .select(
              SELECT_CONTRATO
            )
            .eq(
              colunaCliente,
              clienteId
            )

        if (
          resultadoProprios.error
        ) {
          throw resultadoProprios.error
        }

        const proprios =
          (resultadoProprios.data ||
            []) as unknown as Contrato[]

        /*
         * 2. PROPOSTAS VINCULADAS AO CONTATO WHATSAPP
         */
        let vinculos:
          VinculoRow[] = []

        if (contatoId) {
          const resultadoVinculos =
            await supabase
              .from(
                'crm_whatsapp_propostas_vinculos'
              )
              .select(
                'proposta_id'
              )
              .eq(
                'contato_id',
                contatoId
              )

          if (
            resultadoVinculos.error
          ) {
            throw resultadoVinculos.error
          }

          vinculos =
            (resultadoVinculos.data ||
              []) as VinculoRow[]
        }

        const propostasVinculadas =
          Array.from(
            new Set(
              vinculos
                .map(
                  item =>
                    item.proposta_id
                )
                .filter(Boolean)
            )
          )

        /*
         * 3. CONTRATOS DAS PROPOSTAS VINCULADAS
         */
        let vinculados:
          Contrato[] = []

        if (
          propostasVinculadas.length
        ) {
          const resultadoVinculados =
            await supabase
              .from(
                'crm_contratos'
              )
              .select(
                SELECT_CONTRATO
              )
              .in(
                'proposta_id',
                propostasVinculadas
              )

          if (
            resultadoVinculados.error
          ) {
            throw resultadoVinculados.error
          }

          vinculados =
            (resultadoVinculados.data ||
              []) as unknown as Contrato[]
        }

        /*
         * 4. MERGE
         * Contrato próprio sempre ganha prioridade.
         */
        const mapa =
          new Map<
            string,
            Contrato
          >()

        for (
          const contrato of
          proprios
        ) {
          mapa.set(
            contrato.id,
            {
              ...contrato,
              vinculada: false,
            }
          )
        }

        for (
          const contrato of
          vinculados
        ) {
          if (
            mapa.has(
              contrato.id
            )
          ) {
            continue
          }

          mapa.set(
            contrato.id,
            {
              ...contrato,
              vinculada: true,
            }
          )
        }

        const contratos =
          Array.from(
            mapa.values()
          )

        if (!contratos.length) {
          setItens([])
          return
        }

        const contratoIds =
          contratos.map(
            contrato =>
              contrato.id
          )

        const produtoIds = [
          ...new Set(
            contratos.map(
              item =>
                item.produto_id
            )
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
          clientesResult,
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

          carregarNomesClientes(
            contratos
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

        const contratosMap =
          new Map(
            contratos.map(
              contrato => [
                contrato.id,
                {
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

                  clienteNome:
                    obterNomeCliente(
                      contrato,
                      clientesResult.pessoas,
                      clientesResult.empresas
                    ),
                },
              ]
            )
          )

        /*
         * ============================================================
         * CORRETOR
         *
         * Mantém a regra atual:
         * vê SOMENTE os próprios splits,
         * inclusive quando o contrato veio de proposta vinculada.
         * ============================================================
         */
        if (
          userProfile.tipo_usuario ===
          'CORRETOR'
        ) {
          const {
            data: splits,
            error: splitsError,
          } = await supabase
            .from(
              'crm_comissao_splits'
            )
            .select('*')
            .eq(
              'usuario_id',
              userProfile.id
            )
            .eq(
              'tipo_participante',
              'CORRETOR'
            )
            .in(
              'contrato_id',
              contratoIds
            )

          if (splitsError) {
            throw splitsError
          }

          const splitRows =
            splits || []

          if (!splitRows.length) {
            setItens([])
            return
          }

          const splitIds =
            splitRows.map(
              item =>
                item.id
            )

          const {
            data: pagamentos,
            error:
              pagamentosError,
          } = await supabase
            .from(
              'crm_comissao_pagamentos'
            )
            .select('*')
            .in(
              'split_id',
              splitIds
            )

          if (
            pagamentosError
          ) {
            throw pagamentosError
          }

          setItens(
            splitRows.flatMap(
              (split: any) => {
                const contrato =
                  contratosMap.get(
                    split.contrato_id
                  )

                if (!contrato) {
                  return []
                }

                const pagamentosSplit =
                  (
                    pagamentos ||
                    []
                  ).filter(
                    (item: any) =>
                      item.split_id ===
                      split.id
                  )

                const pago =
                  pagamentosSplit.reduce(
                    (
                      total:
                        number,
                      pagamento: any
                    ) =>
                      total +
                      (pagamento.status ===
                      'PAGA'
                        ? Number(
                            pagamento.valor_pago ||
                              pagamento.valor_previsto ||
                              0
                          )
                        : 0),
                    0
                  )

                const pendente =
                  pagamentosSplit.reduce(
                    (
                      total:
                        number,
                      pagamento: any
                    ) =>
                      total +
                      (pagamento.status ===
                      'PENDENTE'
                        ? Number(
                            pagamento.valor_previsto ||
                              0
                          )
                        : 0),
                    0
                  )

                return [
                  {
                    id: split.id,
                    contratoId:
                      split.contrato_id,
                    contrato,
                    bruto: Number(
                      split.valor_bruto_split ||
                        0
                    ),
                    deducoes:
                      Number(
                        split.valor_deducoes ||
                          0
                      ),
                    liquido:
                      Number(
                        split.valor_liquido_split ||
                          0
                      ),
                    pago,
                    pendente,
                    modo:
                      'PESSOAL' as const,
                  },
                ]
              }
            )
          )

          return
        }

        /*
         * ============================================================
         * CORRETORA / ADMIN
         *
         * Mantém visão econômica global.
         * ============================================================
         */
        const {
          data: comissoes,
          error: comissoesError,
        } = await supabase
          .from('crm_comissoes')
          .select('*')
          .in(
            'contrato_id',
            contratoIds
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )

        if (comissoesError) {
          throw comissoesError
        }

        setItens(
          (comissoes || []).flatMap(
            (comissao: any) => {
              const contrato =
                contratosMap.get(
                  comissao.contrato_id
                )

              if (!contrato) {
                return []
              }

              return [
                {
                  id: comissao.id,
                  contratoId:
                    comissao.contrato_id,
                  contrato,
                  bruto: Number(
                    comissao.valor_comissao_bruta ||
                      0
                  ),
                  deducoes: Number(
                    comissao.valor_deducoes_base ||
                      0
                  ),
                  liquido: Number(
                    comissao.valor_comissao_bruta ||
                      0
                  ),
                  pago: 0,
                  pendente: 0,
                  modo:
                    'GLOBAL' as const,
                },
              ]
            }
          )
        )
      } catch (error: any) {
        console.error(
          'Erro ao carregar comissões do contato:',
          error
        )

        setItens([])

        toast.error(
          error?.message ||
            'Não foi possível carregar as comissões.'
        )
      } finally {
        setLoading(false)
      }
    }, [
      clienteId,
      contatoId,
      tipoCliente,
      userProfile,
    ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
        <Loader2
          size={16}
          className="animate-spin"
        />
        Carregando comissões...
      </div>
    )
  }

  if (!itens.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
        <HandCoins
          size={22}
          className="mx-auto text-slate-300"
        />

        <p className="mt-2 text-xs font-medium text-slate-600">
          Nenhuma comissão encontrada
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Não existem comissões disponíveis para os contratos deste relacionamento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-700">
          {userProfile?.tipo_usuario ===
          'CORRETOR'
            ? 'Minhas comissões'
            : 'Comissões'}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          {userProfile?.tipo_usuario ===
          'CORRETOR'
            ? 'Somente sua participação nos contratos próprios e vinculados deste contato.'
            : 'Comissões dos contratos próprios e vinculados deste contato.'}
        </p>
      </div>

      {itens.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            if (
              item.modo ===
              'GLOBAL'
            ) {
              navigate(
                `/whatsapp/comissoes/contratos/${item.contratoId}`
              )
            }
          }}
          className={`group w-full rounded-xl border bg-white p-3 text-left transition hover:bg-violet-50/20 ${
            item.contrato.vinculada
              ? 'border-violet-200 hover:border-violet-300'
              : 'border-slate-200 hover:border-violet-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <HandCoins
                  size={14}
                  className="shrink-0 text-violet-500"
                />

                <p className="truncate text-xs font-semibold text-slate-800">
                  {
                    item.contrato
                      .produtoNome
                  }
                </p>

                {item.contrato.vinculada && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
                    <Link2 size={9} />
                    Vinculada
                  </span>
                )}
              </div>

              <p className="mt-1 truncate text-[11px] text-slate-500">
                {
                  item.contrato
                    .seguradoraNome
                }
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Apólice:{' '}
                {item.contrato
                  .numero_apolice ||
                  '—'}
              </p>

              {item.contrato.vinculada && (
                <p className="mt-0.5 truncate text-[10px] font-medium text-violet-600">
                  {item.contrato.clienteNome}
                </p>
              )}
            </div>

            {item.modo ===
              'GLOBAL' && (
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-violet-500"
              />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <Valor
              label="Bruto"
              valor={moeda(
                item.bruto
              )}
            />

            <Valor
              label="Deduções"
              valor={moeda(
                item.deducoes
              )}
            />

            <Valor
              label="Líquido"
              valor={moeda(
                item.liquido
              )}
              destaque
            />

            {item.modo ===
              'PESSOAL' && (
              <>
                <Valor
                  label="A receber"
                  valor={moeda(
                    item.pendente
                  )}
                />

                <Valor
                  label="Pago"
                  valor={moeda(
                    item.pago
                  )}
                  destaque
                />
              </>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function Valor({
  label,
  valor,
  destaque = false,
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-[11px] font-semibold ${
          destaque
            ? 'text-emerald-600'
            : 'text-slate-700'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}
