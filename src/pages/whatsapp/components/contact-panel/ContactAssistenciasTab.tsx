import {
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { supabase } from '../../../../lib/supabaseClient'

import {
  buscarAssistenciasDoCliente,
  type CrmAssistencia,
} from '../../services/crmAssistenciaService'

import ModalNovaAssistencia from '../../pages/assistencias/components/ModalNovaAssistencia'

type TipoCliente = 'PF' | 'PJ'

interface Props {
  contatoId: string
  clienteId: string
  tipoCliente: TipoCliente
}

interface AssistenciaRow extends CrmAssistencia {
  vinculada: boolean
  cliente_nome?: string | null
}

interface VinculoRow {
  proposta_id: string
}

interface ContratoVinculadoRow {
  proposta_id: string | null
  proposta_item_id: string | null
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
}

interface PessoaRow {
  id: string
  dados: Record<string, any> | null
}

interface EmpresaRow {
  id: string
  dados: Record<string, any> | null
}

const formatarDataHora = (
  valor?: string | null
) => {
  if (!valor) return '—'

  const data = new Date(valor)

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return valor
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  ).format(data)
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
  contratos: ContratoVinculadoRow[]
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

  const pessoas =
    new Map<string, string>()

  const empresas =
    new Map<string, string>()

  for (
    const pessoa of
    (pessoasResult.data || []) as PessoaRow[]
  ) {
    const dados =
      objeto(
        pessoa.dados
      )

    pessoas.set(
      pessoa.id,
      dados.nome ||
        dados.nome_completo ||
        dados.nome_razao_social ||
        'Pessoa sem nome'
    )
  }

  for (
    const empresa of
    (empresasResult.data || []) as EmpresaRow[]
  ) {
    const dados =
      objeto(
        empresa.dados
      )

    empresas.set(
      empresa.id,
      dados.razao_social ||
        dados.nome_razao_social ||
        dados.nome ||
        dados.nome_fantasia ||
        'Empresa sem nome'
    )
  }

  return {
    pessoas,
    empresas,
  }
}

export default function ContactAssistenciasTab({
  contatoId,
  clienteId,
  tipoCliente,
}: Props) {
  
  const navigate = useNavigate()

  const [itens, setItens] =
    useState<AssistenciaRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [
    modalAberto,
    setModalAberto,
  ] = useState(false)

  const carregar =
    useCallback(async () => {
      if (!clienteId) {
        setItens([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        /*
         * ============================================================
         * 1. ASSISTÊNCIAS PRÓPRIAS DO CLIENTE PRINCIPAL
         * ============================================================
         */
        const proprias =
          await buscarAssistenciasDoCliente(
            tipoCliente === 'PF'
              ? {
                  crm_pessoa_id:
                    clienteId,
                }
              : {
                  crm_empresa_id:
                    clienteId,
                }
          )

        /*
         * ============================================================
         * 2. PROPOSTAS VINCULADAS AO CONTATO
         * ============================================================
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

        const propostaIds =
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
         * ============================================================
         * 3. CONTRATOS / ITENS DAS PROPOSTAS VINCULADAS
         * ============================================================
         */
        let contratosVinculados:
          ContratoVinculadoRow[] = []

        if (
          propostaIds.length
        ) {
          const resultadoContratos =
            await supabase
              .from(
                'crm_contratos'
              )
              .select(`
                proposta_id,
                proposta_item_id,
                crm_pessoa_id,
                crm_empresa_id
              `)
              .in(
                'proposta_id',
                propostaIds
              )

          if (
            resultadoContratos.error
          ) {
            throw resultadoContratos.error
          }

          contratosVinculados =
            (resultadoContratos.data ||
              []) as ContratoVinculadoRow[]
        }

        const propostaItemIds =
          Array.from(
            new Set(
              contratosVinculados
                .map(
                  item =>
                    item.proposta_item_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
            )
          )

        /*
         * ============================================================
         * 4. ASSISTÊNCIAS DOS ITENS VINCULADOS
         * ============================================================
         */
        let vinculadas:
          CrmAssistencia[] = []

        if (
          propostaItemIds.length
        ) {
          const resultadoAssistencias =
            await supabase
              .from(
                'crm_assistencias'
              )
              .select('*')
              .in(
                'crm_proposta_item_id',
                propostaItemIds
              )
              .order(
                'solicitado_em',
                {
                  ascending:
                    false,
                }
              )

          if (
            resultadoAssistencias.error
          ) {
            throw resultadoAssistencias.error
          }

          vinculadas =
            (resultadoAssistencias.data ||
              []) as CrmAssistencia[]
        }

        /*
         * ============================================================
         * 5. NOMES DOS DONOS REAIS DOS CONTRATOS VINCULADOS
         * ============================================================
         */
        const {
          pessoas,
          empresas,
        } =
          await carregarNomesClientes(
            contratosVinculados
          )

        const donoPorItem =
          new Map<
            string,
            string
          >()

        for (
          const contrato of
          contratosVinculados
        ) {
          if (
            !contrato.proposta_item_id
          ) {
            continue
          }

          const nome =
            contrato.crm_pessoa_id
              ? pessoas.get(
                  contrato.crm_pessoa_id
                ) ||
                'Pessoa sem nome'
              : contrato.crm_empresa_id
                ? empresas.get(
                    contrato.crm_empresa_id
                  ) ||
                  'Empresa sem nome'
                : 'Cliente não identificado'

          donoPorItem.set(
            contrato.proposta_item_id,
            nome
          )
        }

        /*
         * ============================================================
         * 6. MERGE
         *
         * Assistência própria sempre ganha prioridade.
         * ============================================================
         */
        const mapa =
          new Map<
            string,
            AssistenciaRow
          >()

        for (
          const assistencia of
          proprias
        ) {
          mapa.set(
            assistencia.id,
            {
              ...assistencia,
              vinculada: false,
              cliente_nome: null,
            }
          )
        }

        for (
          const assistencia of
          vinculadas
        ) {
          if (
            mapa.has(
              assistencia.id
            )
          ) {
            continue
          }

          mapa.set(
            assistencia.id,
            {
              ...assistencia,
              vinculada: true,
              cliente_nome:
                assistencia.crm_proposta_item_id
                  ? donoPorItem.get(
                      assistencia.crm_proposta_item_id
                    ) ||
                    null
                  : null,
            }
          )
        }

        const lista =
          Array.from(
            mapa.values()
          ).sort(
            (a, b) =>
              new Date(
                b.solicitado_em ||
                  b.created_at
              ).getTime() -
              new Date(
                a.solicitado_em ||
                  a.created_at
              ).getTime()
          )

        setItens(lista)
      } catch (error: any) {
        console.error(
          'Erro ao carregar assistências do contato:',
          error
        )

        setItens([])

        toast.error(
          error?.message ||
            'Não foi possível carregar as assistências.'
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

  const clienteInicial = {
    id: clienteId,
    tipo: tipoCliente,
  } as const

  if (loading) {
    return (
      <Loading text="Carregando assistências..." />
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Assistências
            </p>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Assistências próprias e vinculadas a este contato.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setModalAberto(true)
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Nova assistência
          </button>
        </div>

        {!itens.length ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {itens.map(
              assistencia => (
                <button
                  key={
                    assistencia.id
                  }
                  type="button"
                  onClick={() =>
                    navigate(
                      `/whatsapp/assistencia/${assistencia.id}`
                    )
                  }
                  className={`group w-full rounded-xl border bg-white p-3 text-left transition hover:bg-blue-50/30 ${
                    assistencia.vinculada
                      ? 'border-violet-200 hover:border-violet-300'
                      : 'border-slate-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className="text-blue-500"
                        />

                        <p className="truncate text-xs font-semibold text-slate-800">
                          {assistencia.tipo_assistencia
                            ?.replaceAll(
                              '_',
                              ' '
                            ) ||
                            'Assistência'}
                        </p>

                        {assistencia.vinculada && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
                            <Link2 size={9} />
                            Vinculada
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500">
                        {assistencia.numero_atendimento
                          ? `Atendimento ${assistencia.numero_atendimento}`
                          : assistencia.protocolo
                            ? `Protocolo ${assistencia.protocolo}`
                            : 'Sem protocolo'}
                      </p>

                      {assistencia.vinculada &&
                        assistencia.cliente_nome && (
                          <p className="mt-0.5 truncate text-[10px] font-medium text-violet-600">
                            {assistencia.cliente_nome}
                          </p>
                        )}
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-blue-500"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <Info
                      label="Solicitada"
                      value={formatarDataHora(
                        assistencia.solicitado_em
                      )}
                    />

                    <Info
                      label="Status"
                      value={
                        assistencia.status?.replaceAll(
                          '_',
                          ' '
                        ) || '—'
                      }
                    />

                    <Info
                      label="Prestador"
                      value={
                        assistencia.prestador_nome ||
                        'Não informado'
                      }
                    />

                    <Info
                      label="Previsão"
                      value={formatarDataHora(
                        assistencia.previsao_atendimento_em
                      )}
                    />
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </div>

      <ModalNovaAssistencia
        open={modalAberto}
        contatoId={contatoId}
        clienteInicial={clienteInicial}
        onClose={() =>
          setModalAberto(false)
        }
        onCreated={() => {
          setModalAberto(false)
          void carregar()
        }}
      />
    </>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600">
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

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
      <CheckCircle2
        size={22}
        className="mx-auto text-slate-300"
      />

      <p className="mt-2 text-xs font-medium text-slate-600">
        Nenhuma assistência registrada
      </p>
    </div>
  )
}
