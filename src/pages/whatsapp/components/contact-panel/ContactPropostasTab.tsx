import {
  Building2,
  ChevronRight,
  FileText,
  Link2,
  Loader2,
  Plus,
  Search,
  Unlink2,
  UserRound,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { supabase } from '../../../../lib/supabaseClient'
import ModalNovaProposta from '../../pages/propostas/components/ModalNovaProposta'

type TipoCliente = 'PF' | 'PJ'

interface Props {
  contatoId: string
  clienteId: string
  tipoCliente: TipoCliente
}

interface PropostaBaseRow {
  id: string
  corretora_id: string
  crm_pessoa_id: string | null
  crm_empresa_id: string | null
  numero_proposta: string
  data_emissao: string | null
  data_validade: string | null
  data_venda: string | null
  status: string
  tipo_negocio: string
  valor_total_ofertado: number | null
  valor_total_vendido: number | null
  motivo_perda: string | null
  created_at: string
}

interface PropostaRow extends PropostaBaseRow {
  cliente_nome: string
  cliente_documento: string | null
  cliente_tipo: TipoCliente | null
  vinculada: boolean
  vinculo_id: string | null
}

interface PessoaRow {
  id: string
  cpf: string | null
  dados: Record<string, any> | null
}

interface EmpresaRow {
  id: string
  cnpj: string | null
  dados: Record<string, any> | null
}

interface VinculoRow {
  id: string
  proposta_id: string
}

interface ItemBuscaRow {
  numero_cotacao: string | null
  produto: any
  seguradora: any
}

interface PropostaBuscaBanco extends PropostaBaseRow {
  itens?: ItemBuscaRow[] | null
}

interface ResultadoBusca extends PropostaRow {
  jaVinculada: boolean
  jaPertenceAoCliente: boolean
  produtos: string[]
  seguradoras: string[]
  cotacoes: string[]
}

const SELECT_BASE = `
  id,
  corretora_id,
  crm_pessoa_id,
  crm_empresa_id,
  numero_proposta,
  data_emissao,
  data_validade,
  data_venda,
  status,
  tipo_negocio,
  valor_total_ofertado,
  valor_total_vendido,
  motivo_perda,
  created_at
`

const SELECT_BUSCA = `
  ${SELECT_BASE},
  itens:crm_proposta_itens (
    numero_cotacao,
    produto:base_produtos (
      id,
      nome,
      categoria
    ),
    seguradora:base_seguradoras (
      id,
      nome
    )
  )
`

const moeda = (valor: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))

const formatarData = (valor: string | null | undefined) => {
  if (!valor) return '—'

  const somenteData = valor.includes('T')
    ? valor.split('T')[0]
    : valor

  const partes = somenteData.split('-')

  if (partes.length !== 3) return valor

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const normalizarStatus = (status: string) =>
  String(status || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')

const formatarStatus = (status: string) => {
  const labels: Record<string, string> = {
    EM_NEGOCIACAO: 'Em negociação',
    VENDIDA: 'Vendida',
    PERDIDA: 'Perdida',
    CANCELADA: 'Cancelada',
  }

  return labels[normalizarStatus(status)] || status
}

const formatarTipoNegocio = (tipo: string) => {
  const labels: Record<string, string> = {
    NOVO: 'Novo negócio',
    RENOVACAO: 'Renovação',
  }

  return labels[String(tipo || '').trim().toUpperCase()] || tipo
}

const statusClass = (status: string) => {
  switch (normalizarStatus(status)) {
    case 'VENDIDA':
      return 'bg-emerald-50 text-emerald-700'
    case 'PERDIDA':
      return 'bg-rose-50 text-rose-700'
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-amber-50 text-amber-700'
  }
}

const somenteNumeros = (valor?: string | null) =>
  String(valor || '').replace(/\D/g, '')

const normalizarBuscaTexto = (valor?: string | null) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()

const objeto = (valor: unknown): Record<string, any> => {
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    return valor as Record<string, any>
  }

  return {}
}

const primeiraRelacao = <T,>(valor: T | T[] | null | undefined): T | null => {
  if (!valor) return null
  return Array.isArray(valor) ? valor[0] || null : valor
}

async function carregarMapasClientes(propostas: PropostaBaseRow[]) {
  const pessoaIds = Array.from(
    new Set(
      propostas
        .map(item => item.crm_pessoa_id)
        .filter((id): id is string => !!id)
    )
  )

  const empresaIds = Array.from(
    new Set(
      propostas
        .map(item => item.crm_empresa_id)
        .filter((id): id is string => !!id)
    )
  )

  const [resultadoPessoas, resultadoEmpresas] = await Promise.all([
    pessoaIds.length
      ? supabase
          .from('crm_pessoas')
          .select('id, cpf, dados')
          .in('id', pessoaIds)
      : Promise.resolve({ data: [], error: null }),

    empresaIds.length
      ? supabase
          .from('crm_empresas')
          .select('id, cnpj, dados')
          .in('id', empresaIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (resultadoPessoas.error) throw resultadoPessoas.error
  if (resultadoEmpresas.error) throw resultadoEmpresas.error

  const pessoas = new Map<string, PessoaRow>()
  const empresas = new Map<string, EmpresaRow>()

  for (const pessoa of (resultadoPessoas.data || []) as PessoaRow[]) {
    pessoas.set(pessoa.id, pessoa)
  }

  for (const empresa of (resultadoEmpresas.data || []) as EmpresaRow[]) {
    empresas.set(empresa.id, empresa)
  }

  return { pessoas, empresas }
}

function normalizarProposta(
  proposta: PropostaBaseRow,
  pessoas: Map<string, PessoaRow>,
  empresas: Map<string, EmpresaRow>,
  vinculada = false,
  vinculoId: string | null = null
): PropostaRow {
  if (proposta.crm_pessoa_id) {
    const pessoa = pessoas.get(proposta.crm_pessoa_id)
    const dados = objeto(pessoa?.dados)

    return {
      ...proposta,
      cliente_nome:
        dados.nome ||
        dados.nome_completo ||
        dados.nome_razao_social ||
        'Pessoa sem nome',
      cliente_documento: pessoa?.cpf || null,
      cliente_tipo: 'PF',
      vinculada,
      vinculo_id: vinculoId,
    }
  }

  if (proposta.crm_empresa_id) {
    const empresa = empresas.get(proposta.crm_empresa_id)
    const dados = objeto(empresa?.dados)

    return {
      ...proposta,
      cliente_nome:
        dados.razao_social ||
        dados.nome_razao_social ||
        dados.nome ||
        dados.nome_fantasia ||
        'Empresa sem nome',
      cliente_documento: empresa?.cnpj || null,
      cliente_tipo: 'PJ',
      vinculada,
      vinculo_id: vinculoId,
    }
  }

  return {
    ...proposta,
    cliente_nome: 'Cliente não identificado',
    cliente_documento: null,
    cliente_tipo: null,
    vinculada,
    vinculo_id: vinculoId,
  }
}

const propostaPertenceAoCliente = (
  proposta: PropostaBaseRow,
  clienteId: string,
  tipoCliente: TipoCliente
) =>
  tipoCliente === 'PF'
    ? proposta.crm_pessoa_id === clienteId
    : proposta.crm_empresa_id === clienteId

function extrairItensBusca(proposta: PropostaBuscaBanco) {
  const produtos = new Set<string>()
  const seguradoras = new Set<string>()
  const cotacoes = new Set<string>()

  for (const item of proposta.itens || []) {
    const produto = primeiraRelacao<any>(item.produto)
    const seguradora = primeiraRelacao<any>(item.seguradora)

    if (produto?.nome) produtos.add(produto.nome)
    if (seguradora?.nome) seguradoras.add(seguradora.nome)
    if (item.numero_cotacao) cotacoes.add(item.numero_cotacao)
  }

  return {
    produtos: [...produtos],
    seguradoras: [...seguradoras],
    cotacoes: [...cotacoes],
  }
}

export default function ContactPropostasTab({
  contatoId,
  clienteId,
  tipoCliente,
}: Props) {
  const navigate = useNavigate()

  const [itens, setItens] = useState<PropostaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovaPropostaAberto, setModalNovaPropostaAberto] = useState(false)
  const [modalVinculosAberto, setModalVinculosAberto] = useState(false)

  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaExecutada, setBuscaExecutada] = useState(false)
  const [vinculandoId, setVinculandoId] = useState<string | null>(null)
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null)
 

  const carregar = useCallback(async () => {
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

      const resultadoProprias = await supabase
        .from('crm_propostas')
        .select(SELECT_BASE)
        .eq(colunaCliente, clienteId)
        .order('created_at', { ascending: false })

      if (resultadoProprias.error) {
        throw resultadoProprias.error
      }

      const proprias =
        (resultadoProprias.data || []) as unknown as PropostaBaseRow[]

      let vinculos: VinculoRow[] = []

      if (contatoId) {
        const resultadoVinculos = await supabase
          .from('crm_whatsapp_propostas_vinculos')
          .select('id, proposta_id')
          .eq('contato_id', contatoId)

        if (resultadoVinculos.error) {
          throw resultadoVinculos.error
        }

        vinculos =
          (resultadoVinculos.data || []) as VinculoRow[]
      }

      const idsVinculados = Array.from(
        new Set(
          vinculos
            .map(item => item.proposta_id)
            .filter(Boolean)
        )
      )

      let vinculadas: PropostaBaseRow[] = []

      if (idsVinculados.length > 0) {
        const resultadoVinculadas = await supabase
          .from('crm_propostas')
          .select(SELECT_BASE)
          .in('id', idsVinculados)
          .order('created_at', { ascending: false })

        if (resultadoVinculadas.error) {
          throw resultadoVinculadas.error
        }

        vinculadas =
          (resultadoVinculadas.data || []) as unknown as PropostaBaseRow[]
      }

      const todas = [
        ...proprias,
        ...vinculadas,
      ]

      const { pessoas, empresas } =
        await carregarMapasClientes(todas)

      const vinculoPorProposta = new Map<string, string>(
        vinculos.map(item => [
          item.proposta_id,
          item.id,
        ])
      )

      const mapa = new Map<string, PropostaRow>()

      for (const proposta of proprias) {
        mapa.set(
          proposta.id,
          normalizarProposta(
            proposta,
            pessoas,
            empresas,
            false,
            null
          )
        )
      }

      for (const proposta of vinculadas) {
        if (mapa.has(proposta.id)) continue

        mapa.set(
          proposta.id,
          normalizarProposta(
            proposta,
            pessoas,
            empresas,
            true,
            vinculoPorProposta.get(proposta.id) || null
          )
        )
      }

      const lista = Array.from(mapa.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )

      setItens(lista)
    } catch (error: any) {
      console.error(
        'Erro ao carregar propostas do contato:',
        error
      )

      setItens([])

      toast.error(
        error?.message ||
          'Não foi possível carregar as propostas.'
      )
    } finally {
      setLoading(false)
    }
  }, [clienteId, contatoId, tipoCliente])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const propostaCriada = async () => {
    setModalNovaPropostaAberto(false)
    await carregar()

    toast.success(
      'Proposta adicionada ao cliente.'
    )
  }

  const abrirProposta = (propostaId: string) => {
    navigate(`/whatsapp/propostas/${propostaId}`)
  }

  const abrirModalVinculos = () => {
    setModalVinculosAberto(true)
    setTermoBusca('')
    setResultadosBusca([])
    setBuscaExecutada(false)
  }

  const fecharModalVinculos = () => {
    setModalVinculosAberto(false)
    setTermoBusca('')
    setResultadosBusca([])
    setBuscaExecutada(false)
    setVinculandoId(null)
  }

  const executarBusca = useCallback(async () => {
    const termo = termoBusca.trim()

    if (termo.length < 3) {
      toast.error(
        'Digite pelo menos 3 caracteres para pesquisar.'
      )
      return
    }

    try {
      setBuscando(true)
      setBuscaExecutada(true)

      const [resultadoPropostas, resultadoVinculos] =
        await Promise.all([
          supabase
            .from('crm_propostas')
            .select(SELECT_BUSCA)
            .order('created_at', { ascending: false }),

          contatoId
            ? supabase
                .from('crm_whatsapp_propostas_vinculos')
                .select('id, proposta_id')
                .eq('contato_id', contatoId)
            : Promise.resolve({ data: [], error: null }),
        ])

      if (resultadoPropostas.error) {
        throw resultadoPropostas.error
      }

      if (resultadoVinculos.error) {
        throw resultadoVinculos.error
      }

      const propostas =
        (resultadoPropostas.data || []) as unknown as PropostaBuscaBanco[]

      const vinculos =
        (resultadoVinculos.data || []) as VinculoRow[]

      const mapaVinculos = new Map(
        vinculos.map(item => [
          item.proposta_id,
          item.id,
        ])
      )

      const { pessoas, empresas } =
        await carregarMapasClientes(propostas)

      const termoTexto = normalizarBuscaTexto(termo)

      const termoNumerico =
        somenteNumeros(termo)

      const resultados: ResultadoBusca[] =
        propostas
          .map(proposta => {
            const base =
              normalizarProposta(
                proposta,
                pessoas,
                empresas,
                mapaVinculos.has(proposta.id),
                mapaVinculos.get(proposta.id) || null
              )

            const extras =
              extrairItensBusca(proposta)

            return {
              ...base,
              jaVinculada:
                mapaVinculos.has(proposta.id),
              jaPertenceAoCliente:
                propostaPertenceAoCliente(
                  proposta,
                  clienteId,
                  tipoCliente
                ),
              produtos: extras.produtos,
              seguradoras: extras.seguradoras,
              cotacoes: extras.cotacoes,
            }
          })
          .filter(proposta => {
            const texto = normalizarBuscaTexto(
              [
                proposta.numero_proposta,
                proposta.cliente_nome,
                proposta.cliente_documento,
                proposta.status,
                proposta.tipo_negocio,
                ...proposta.produtos,
                ...proposta.seguradoras,
                ...proposta.cotacoes,
              ]
                .filter(Boolean)
                .join(' ')
            )

            if (texto.includes(termoTexto)) {
              return true
            }

            if (!termoNumerico) {
              return false
            }

            return (
              somenteNumeros(
                proposta.cliente_documento
              ).includes(termoNumerico) ||
              somenteNumeros(
                proposta.numero_proposta
              ).includes(termoNumerico) ||
              proposta.cotacoes.some(cotacao =>
                somenteNumeros(cotacao).includes(
                  termoNumerico
                )
              )
            )
          })
          .slice(0, 50)

      setResultadosBusca(resultados)
    } catch (error: any) {
      console.error(
        'Erro ao pesquisar propostas:',
        error
      )

      setResultadosBusca([])

      toast.error(
        error?.message ||
          'Não foi possível pesquisar as propostas.'
      )
    } finally {
      setBuscando(false)
    }
  }, [
    clienteId,
    contatoId,
    termoBusca,
    tipoCliente,
  ])

  useEffect(() => {
    const termo = termoBusca.trim()

    if (termo.length < 3) {
      setResultadosBusca([])
      setBuscaExecutada(false)
      return
    }

    const timer = window.setTimeout(() => {
      void executarBusca()
    }, 350)

    return () => window.clearTimeout(timer)
  }, [termoBusca, executarBusca])

  const vincularProposta = useCallback(
    async (proposta: ResultadoBusca) => {
      if (
        vinculandoId ||
        proposta.jaVinculada ||
        proposta.jaPertenceAoCliente
      ) {
        return
      }

      if (!contatoId) {
        toast.error('Contato WhatsApp não identificado.')
        return
      }

      try {
        setVinculandoId(proposta.id)

        const { error } = await supabase
          .from('crm_whatsapp_propostas_vinculos')
          .insert({
            corretora_id: proposta.corretora_id,
            contato_id: contatoId,
            proposta_id: proposta.id,
          })

        if (error) {
          if (error.code === '23505') {
            throw new Error(
              'Esta proposta já está vinculada a este contato.'
            )
          }

          throw error
        }

        setResultadosBusca(atuais =>
          atuais.map(item =>
            item.id === proposta.id
              ? {
                  ...item,
                  jaVinculada: true,
                  vinculada: true,
                }
              : item
          )
        )

        await carregar()

        toast.success(
          'Proposta vinculada ao contato.'
        )
      } catch (error: any) {
        console.error(
          'Erro ao vincular proposta:',
          error
        )

        toast.error(
          error?.message ||
            'Não foi possível vincular a proposta.'
        )
      } finally {
        setVinculandoId(null)
      }
    },
    [
      carregar,
      contatoId,
      vinculandoId,
    ]
  )

  const desvincularProposta = useCallback(
    async (proposta: PropostaRow) => {
      if (
        !proposta.vinculada ||
        !proposta.vinculo_id ||
        desvinculandoId
      ) {
        return
      }

      const confirmar = window.confirm(
        `Deseja desvincular a proposta ${
          proposta.numero_proposta || ''
        } deste contato?\n\nA proposta e seus dados não serão excluídos.`
      )

      if (!confirmar) return

      try {
        setDesvinculandoId(proposta.id)

        const { error } = await supabase
          .from('crm_whatsapp_propostas_vinculos')
          .delete()
          .eq('id', proposta.vinculo_id)

        if (error) throw error

        await carregar()

        setResultadosBusca(atuais =>
          atuais.map(item =>
            item.id === proposta.id
              ? {
                  ...item,
                  jaVinculada: false,
                  vinculada: false,
                  vinculo_id: null,
                }
              : item
          )
        )

        toast.success(
          'Proposta desvinculada do contato.'
        )
      } catch (error: any) {
        console.error(
          'Erro ao desvincular proposta:',
          error
        )

        toast.error(
          error?.message ||
            'Não foi possível desvincular a proposta.'
        )
      } finally {
        setDesvinculandoId(null)
      }
    },
    [
      carregar,
      desvinculandoId,
    ]
  )

  const quantidadeProprias = useMemo(
    () =>
      itens.filter(item => !item.vinculada)
        .length,
    [itens]
  )

  const quantidadeVinculadas = useMemo(
    () =>
      itens.filter(item => item.vinculada)
        .length,
    [itens]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
        <Loader2
          size={16}
          className="animate-spin"
        />
        Carregando propostas...
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">
                Propostas
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                {quantidadeProprias}{' '}
                {quantidadeProprias === 1
                  ? 'própria'
                  : 'próprias'}

                {quantidadeVinculadas > 0 &&
                  ` • ${quantidadeVinculadas} ${
                    quantidadeVinculadas === 1
                      ? 'vinculada'
                      : 'vinculadas'
                  }`}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setModalNovaPropostaAberto(true)
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={14} />
              Nova proposta
            </button>
          </div>

          <button
            type="button"
            onClick={abrirModalVinculos}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <Link2 size={14} />
            Vincular propostas
          </button>
        </div>

        {!itens.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
            <FileText
              size={22}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-xs font-medium text-slate-600">
              Nenhuma proposta encontrada
            </p>

            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Este cliente ainda não possui
              propostas próprias ou vinculadas
              a este contato.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {itens.map(proposta => (
              <div
                key={proposta.id}
                className={`rounded-xl border bg-white transition ${
                  proposta.vinculada
                    ? 'border-violet-200'
                    : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    abrirProposta(proposta.id)
                  }
                  className="group w-full p-3 text-left transition hover:bg-blue-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText
                          size={14}
                          className="shrink-0 text-blue-500"
                        />

                        <p className="truncate text-xs font-semibold text-slate-800">
                          {proposta.numero_proposta ||
                            'Proposta'}
                        </p>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[11px] font-medium text-slate-600">
                          {proposta.cliente_nome}
                        </p>

                        {proposta.vinculada && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
                            Vinculada
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatarTipoNegocio(
                          proposta.tipo_negocio
                        )}

                        {proposta.cliente_documento &&
                          ` • ${formatarDocumento(
                            proposta.cliente_documento,
                            proposta.cliente_tipo
                          )}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass(
                          proposta.status
                        )}`}
                      >
                        {formatarStatus(
                          proposta.status
                        )}
                      </span>

                      <ChevronRight
                        size={16}
                        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                    <Info
                      label="Ofertado"
                      value={moeda(
                        proposta.valor_total_ofertado
                      )}
                    />

                    <Info
                      label="Vendido"
                      value={moeda(
                        proposta.valor_total_vendido
                      )}
                      destaque={
                        normalizarStatus(
                          proposta.status
                        ) === 'VENDIDA'
                      }
                    />

                    <Info
                      label="Emissão"
                      value={formatarData(
                        proposta.data_emissao
                      )}
                    />

                    <Info
                      label="Validade"
                      value={formatarData(
                        proposta.data_validade
                      )}
                    />

                    {proposta.data_venda && (
                      <Info
                        label="Venda"
                        value={formatarData(
                          proposta.data_venda
                        )}
                        destaque
                      />
                    )}
                  </div>

                  {proposta.motivo_perda && (
                    <p className="mt-3 line-clamp-2 border-t border-slate-100 pt-2 text-[11px] text-rose-600">
                      Motivo da perda:{' '}
                      {proposta.motivo_perda}
                    </p>
                  )}
                </button>

                {proposta.vinculada && (
                  <div className="flex items-center justify-between border-t border-violet-100 bg-violet-50/40 px-3 py-2">
                    <span className="text-[10px] text-violet-600">
                      Negócio relacionado a este
                      contato
                    </span>

                    <button
                      type="button"
                      disabled={
                        desvinculandoId === proposta.id
                      }
                      onClick={() =>
                        void desvincularProposta(
                          proposta
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {desvinculandoId ===
                      proposta.id ? (
                        <Loader2
                          size={11}
                          className="animate-spin"
                        />
                      ) : (
                        <Unlink2 size={11} />
                      )}

                      Desvincular
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalNovaProposta
        open={modalNovaPropostaAberto}
        clienteInicial={{
          id: clienteId,
          tipo: tipoCliente,
        }}
        bloquearClienteInicial
        onClose={() =>
          setModalNovaPropostaAberto(false)
        }
        onCreated={() => {
          void propostaCriada()
        }}
      />

      {modalVinculosAberto && (
        <ModalVincularPropostas
          termo={termoBusca}
          setTermo={setTermoBusca}
          resultados={resultadosBusca}
          buscando={buscando}
          buscaExecutada={buscaExecutada}
          vinculandoId={vinculandoId}
          onBuscar={() =>
            void executarBusca()
          }
          onVincular={proposta =>
            void vincularProposta(proposta)
          }
          onAbrirProposta={abrirProposta}
          onClose={fecharModalVinculos}
        />
      )}
    </>
  )
}

function ModalVincularPropostas({
  termo,
  setTermo,
  resultados,
  buscando,
  buscaExecutada,
  vinculandoId,
  onBuscar,
  onVincular,
  onAbrirProposta,
  onClose,
}: {
  termo: string
  setTermo: (value: string) => void
  resultados: ResultadoBusca[]
  buscando: boolean
  buscaExecutada: boolean
  vinculandoId: string | null
  onBuscar: () => void
  onVincular: (proposta: ResultadoBusca) => void
  onAbrirProposta: (propostaId: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={event => {
        if (
          event.target === event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Negócios relacionados
            </p>

            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
              Vincular propostas
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Localize uma proposta de outro
              cliente e vincule-a comercialmente
              a este contato.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-200 p-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                autoFocus
                value={termo}
                onChange={event =>
                  setTermo(event.target.value)
                }
                onKeyDown={event => {
                  if (
                    event.key === 'Enter' &&
                    termo.trim().length >= 3
                  ) {
                    event.preventDefault()
                    onBuscar()
                  }
                }}
                placeholder="Cliente, CPF/CNPJ, proposta, cotação, produto ou seguradora"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              disabled={
                buscando ||
                termo.trim().length < 3
              }
              onClick={onBuscar}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buscando ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Search size={14} />
              )}

              Buscar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {buscando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Pesquisando propostas...
            </div>
          ) : !buscaExecutada ? (
            <div className="py-10 text-center">
              <Search
                size={26}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Pesquise uma proposta
              </p>
            </div>
          ) : !resultados.length ? (
            <div className="py-10 text-center">
              <FileText
                size={26}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Nenhuma proposta encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {resultados.map(proposta => (
                <div
                  key={proposta.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        proposta.cliente_tipo === 'PJ'
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {proposta.cliente_tipo ===
                      'PJ' ? (
                        <Building2 size={17} />
                      ) : (
                        <UserRound size={17} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirProposta(proposta.id)
                        }
                        className="truncate text-left text-xs font-semibold text-slate-800 hover:text-blue-600"
                      >
                        {proposta.numero_proposta ||
                          'Proposta'}
                      </button>

                      <p className="mt-1 truncate text-xs font-medium text-slate-700">
                        {proposta.cliente_nome}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {proposta.cliente_documento
                          ? formatarDocumento(
                              proposta.cliente_documento,
                              proposta.cliente_tipo
                            )
                          : 'Documento não informado'}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {proposta.jaPertenceAoCliente ? (
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-2 text-[10px] font-medium text-slate-500">
                          Já é própria
                        </span>
                      ) : proposta.jaVinculada ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-2 text-[10px] font-medium text-violet-700">
                          <Link2 size={11} />
                          Vinculada
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            vinculandoId === proposta.id
                          }
                          onClick={() =>
                            onVincular(proposta)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {vinculandoId ===
                          proposta.id ? (
                            <Loader2
                              size={11}
                              className="animate-spin"
                            />
                          ) : (
                            <Link2 size={11} />
                          )}

                          Vincular
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                    <Info
                      label="Ofertado"
                      value={moeda(
                        proposta.valor_total_ofertado
                      )}
                    />
                    <Info
                      label="Vendido"
                      value={moeda(
                        proposta.valor_total_vendido
                      )}
                    />
                    <Info
                      label="Emissão"
                      value={formatarData(
                        proposta.data_emissao
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatarDocumento(
  documento: string | null | undefined,
  tipo: TipoCliente | null
) {
  const numeros = somenteNumeros(documento)

  if (
    tipo === 'PF' &&
    numeros.length === 11
  ) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    )
  }

  if (
    tipo === 'PJ' &&
    numeros.length === 14
  ) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    )
  }

  return documento || '—'
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
            ? 'font-semibold text-emerald-600'
            : 'font-medium text-slate-600'
        }`}
      >
        {value}
      </span>
    </div>
  )
}