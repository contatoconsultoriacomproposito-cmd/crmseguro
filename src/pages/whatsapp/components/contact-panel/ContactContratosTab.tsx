import {
  ChevronRight,
  FileCheck2,
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

type TipoCliente = 'PF' | 'PJ'

interface Props {
  contatoId: string
  clienteId: string
  tipoCliente: TipoCliente
}

interface ContratoBaseRow {
  id: string
  proposta_id: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  produto_id: string
  seguradora_id: string | null
  numero_apolice: string | null
  inicio_vigencia: string | null
  fim_vigencia: string | null
  status: string
  valor_aceito: number | null
  valor_atual: number | null
  created_at: string
}

interface ContratoRow extends ContratoBaseRow {
  produtoNome?: string
  seguradoraNome?: string
  clienteNome?: string
  clienteTipo?: TipoCliente | null
  vinculada: boolean
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
  crm_pessoa_id,
  crm_empresa_id,
  produto_id,
  seguradora_id,
  numero_apolice,
  inicio_vigencia,
  fim_vigencia,
  status,
  valor_aceito,
  valor_atual,
  created_at
`

const moeda = (
  valor: number | null | undefined
) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

const formatarData = (
  valor: string | null | undefined
) => {
  if (!valor) return '—'

  const somenteData =
    valor.includes('T')
      ? valor.split('T')[0]
      : valor

  const partes =
    somenteData.split('-')

  if (partes.length !== 3) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const formatarStatus = (
  status: string
) => {
  const labels: Record<string, string> = {
    PENDENTE_EMISSAO: 'Pendente de emissão',
    EMITIDO: 'Emitido',
    ATIVO: 'Ativo',
    CANCELADO: 'Cancelado',
    ENCERRADO: 'Encerrado',
    RENOVADO: 'Renovado',
  }

  return (
    labels[status] ||
    status.replaceAll('_', ' ')
  )
}

const statusClass = (
  status: string
) => {
  switch (status) {
    case 'ATIVO':
    case 'EMITIDO':
      return 'bg-emerald-50 text-emerald-700'
    case 'PENDENTE_EMISSAO':
      return 'bg-amber-50 text-amber-700'
    case 'CANCELADO':
      return 'bg-rose-50 text-rose-700'
    case 'RENOVADO':
      return 'bg-blue-50 text-blue-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

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
  contratos: ContratoBaseRow[]
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
  contrato: ContratoBaseRow,
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

    return {
      nome:
        dados.nome ||
        dados.nome_completo ||
        dados.nome_razao_social ||
        'Pessoa sem nome',
      tipo: 'PF' as const,
    }
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

    return {
      nome:
        dados.razao_social ||
        dados.nome_razao_social ||
        dados.nome ||
        dados.nome_fantasia ||
        'Empresa sem nome',
      tipo: 'PJ' as const,
    }
  }

  return {
    nome:
      'Cliente não identificado',
    tipo: null,
  }
}

export default function ContactContratosTab({
  contatoId,
  clienteId,
  tipoCliente,
}: Props) {
  const navigate =
    useNavigate()

  const [
    itens,
    setItens,
  ] =
    useState<ContratoRow[]>([])

  const [
    loading,
    setLoading,
  ] =
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
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            )

        if (
          resultadoProprios.error
        ) {
          throw resultadoProprios.error
        }

        const proprios =
          (resultadoProprios.data ||
            []) as unknown as ContratoBaseRow[]

        /*
         * 2. PROPOSTAS VINCULADAS AO CONTATO
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
         * 3. CONTRATOS DERIVADOS DAS PROPOSTAS VINCULADAS
         */
        let vinculados:
          ContratoBaseRow[] = []

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
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              )

          if (
            resultadoVinculados.error
          ) {
            throw resultadoVinculados.error
          }

          vinculados =
            (resultadoVinculados.data ||
              []) as unknown as ContratoBaseRow[]
        }

        /*
         * 4. MERGE
         *
         * Contrato próprio sempre tem prioridade.
         */
        const mapa =
          new Map<
            string,
            {
              contrato: ContratoBaseRow
              vinculada: boolean
            }
          >()

        for (
          const contrato of
          proprios
        ) {
          mapa.set(
            contrato.id,
            {
              contrato,
              vinculada:
                false,
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
              contrato,
              vinculada:
                true,
            }
          )
        }

        const contratos =
          Array.from(
            mapa.values()
          )

        if (
          !contratos.length
        ) {
          setItens([])
          return
        }

        const contratosBase =
          contratos.map(
            item =>
              item.contrato
          )

        /*
         * 5. ENRIQUECIMENTO
         */
        const produtoIds = [
          ...new Set(
            contratosBase
              .map(
                item =>
                  item.produto_id
              )
              .filter(Boolean)
          ),
        ]

        const seguradoraIds = [
          ...new Set(
            contratosBase
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
        ] =
          await Promise.all([
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
              contratosBase
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
          new Map<
            string,
            string
          >(
            (
              produtosResult.data ||
              []
            ).map(
              (
                item: any
              ) => [
                item.id,
                item.nome,
              ]
            )
          )

        const seguradorasMap =
          new Map<
            string,
            string
          >(
            (
              seguradorasResult.data ||
              []
            ).map(
              (
                item: any
              ) => [
                item.id,
                item.nome,
              ]
            )
          )

        const lista:
          ContratoRow[] =
          contratos.map(
            item => {
              const cliente =
                obterNomeCliente(
                  item.contrato,
                  clientesResult.pessoas,
                  clientesResult.empresas
                )

              return {
                ...item.contrato,

                vinculada:
                  item.vinculada,

                clienteNome:
                  cliente.nome,

                clienteTipo:
                  cliente.tipo,

                produtoNome:
                  produtosMap.get(
                    item.contrato
                      .produto_id
                  ) ||
                  'Produto não informado',

                seguradoraNome:
                  item.contrato
                    .seguradora_id
                    ? seguradorasMap.get(
                        item.contrato
                          .seguradora_id
                      ) ||
                      'Seguradora não informada'
                    : 'Seguradora não informada',
              }
            }
          )

        lista.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        )

        setItens(
          lista
        )
      } catch (
        error: any
      ) {
        console.error(
          'Erro ao carregar contratos do contato:',
          error
        )

        setItens([])

        toast.error(
          error?.message ||
            'Não foi possível carregar os contratos.'
        )
      } finally {
        setLoading(false)
      }
    }, [
      clienteId,
      contatoId,
      tipoCliente,
    ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const abrirContrato = (
    contrato: ContratoRow
  ) => {
    if (
      !contrato.proposta_id
    ) {
      toast.error(
        'Este contrato não possui proposta de origem vinculada.'
      )
      return
    }

    navigate(
      `/whatsapp/propostas/${contrato.proposta_id}`,
      {
        state: {
          contratoId:
            contrato.id,
        },
      }
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
        <Loader2
          size={16}
          className="animate-spin"
        />
        Carregando contratos...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-700">
          Contratos
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          Contratos próprios e negócios vinculados a este contato.
        </p>
      </div>

      {!itens.length ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
          <FileCheck2
            size={22}
            className="mx-auto text-slate-300"
          />

          <p className="mt-2 text-xs font-medium text-slate-600">
            Nenhum contrato encontrado
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Os contratos gerados pelas propostas deste relacionamento aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map(
            contrato => (
              <button
                key={
                  contrato.id
                }
                type="button"
                onClick={() =>
                  abrirContrato(
                    contrato
                  )
                }
                className={`group w-full rounded-xl border bg-white p-3 text-left transition hover:bg-emerald-50/30 ${
                  contrato.vinculada
                    ? 'border-violet-200 hover:border-violet-300'
                    : 'border-slate-200 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCheck2
                        size={14}
                        className="shrink-0 text-emerald-600"
                      />

                      <p className="truncate text-xs font-semibold text-slate-800">
                        {contrato.produtoNome}
                      </p>

                      {contrato.vinculada && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
                          <Link2 size={9} />
                          Vinculado
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {contrato.seguradoraNome}
                    </p>

                    {contrato.vinculada && (
                      <p className="mt-0.5 truncate text-[10px] font-medium text-violet-600">
                        {contrato.clienteNome}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass(
                        contrato.status
                      )}`}
                    >
                      {formatarStatus(
                        contrato.status
                      )}
                    </span>

                    <ChevronRight
                      size={16}
                      className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                  <Info
                    label="Apólice"
                    value={
                      contrato.numero_apolice ||
                      'Aguardando emissão'
                    }
                  />

                  <Info
                    label="Valor"
                    value={moeda(
                      contrato.valor_atual ??
                        contrato.valor_aceito
                    )}
                    destaque
                  />

                  <Info
                    label="Início"
                    value={formatarData(
                      contrato.inicio_vigencia
                    )}
                  />

                  <Info
                    label="Fim"
                    value={formatarData(
                      contrato.fim_vigencia
                    )}
                  />
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

function Info({
  label,
  value,
  destaque = false,
}: {
  label: string
  value: string
  destaque?: boolean
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <span
        className={`block truncate text-[11px] ${
          destaque
            ? 'font-semibold text-slate-800'
            : 'font-medium text-slate-600'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
