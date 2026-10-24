import { supabase } from '../../../../lib/supabaseClient'
import {
  enviarEmpresaParaLead,
  enviarPessoaParaLead,
  excluirEmpresa,
  excluirPessoa,
  obterSessaoCrm,
  transferirEmpresa,
  transferirPessoa,
} from '../../services/crmClienteService'
import type {
  CentralClientesFiltros,
  CentralClientesResultado,
  CentralClientesResumo,
  ClienteCentral,
  ClienteCompromissoResumo,
  ClienteKanbanStage,
  ClienteProdutoResumo,
  ResponsavelCentral,
} from '../types/centralClientes'

type EntidadeRow = {
  id: string
  corretora_id: string
  corretor_id: string
  documento: string | null
  cliente_id_legado: string | null
  dados: Record<string, any> | null
  classificacao: 'NAO_QUALIFICADO' | 'LEAD'
  etapa_kanban: ClienteKanbanStage | null
  posicao_kanban: number | null
  created_at: string
  updated_at: string
  tipo: 'PF' | 'PJ'
}

type AgendaResumo = {
  proximo: ClienteCompromissoResumo | null
  atrasado: boolean
}

const texto = (valor: unknown) =>
  typeof valor === 'string' ? valor.trim() : ''

const chaveEntidade = (
  tipo: 'PF' | 'PJ',
  id: string
) => `${tipo}:${id}`

const primeiroTelefone = (dados: Record<string, any>) => {
  const lista = Array.isArray(dados.telefones)
    ? dados.telefones
    : Array.isArray(dados.contatos)
      ? dados.contatos
      : []

  const principal =
    lista.find((item: any) => item?.principal) || lista[0]

  return (
    texto(
      principal?.numero ||
        principal?.telefone ||
        principal?.whatsapp
    ) || null
  )
}

const primeiroEmail = (dados: Record<string, any>) => {
  const lista = Array.isArray(dados.emails)
    ? dados.emails
    : []

  const principal =
    lista.find((item: any) => item?.principal) || lista[0]

  return texto(principal?.email || principal?.valor) || null
}

const endereco = (dados: Record<string, any>) => {
  const end = dados.endereco || {}

  return {
    municipio:
      texto(end.municipio || dados.municipio) || null,
    uf: texto(end.uf || dados.uf) || null,
  }
}

const nomeEntidade = (row: EntidadeRow) => {
  const dados = row.dados || {}

  if (row.tipo === 'PF') {
    return (
      texto(dados.nome) ||
      texto(dados.nome_completo) ||
      'Pessoa sem nome'
    )
  }

  return (
    texto(dados.nome_fantasia) ||
    texto(dados.razao_social) ||
    'Empresa sem nome'
  )
}

const nomeSecundario = (row: EntidadeRow) => {
  if (row.tipo === 'PF') return null

  const dados = row.dados || {}
  const principal = nomeEntidade(row)
  const razao = texto(dados.razao_social)

  return razao && razao !== principal ? razao : null
}

const temperatura = (dados: Record<string, any>) => {
  const valor = texto(dados.temperatura).toUpperCase()

  return valor === 'FRIO' ||
    valor === 'MORNO' ||
    valor === 'QUENTE'
    ? valor
    : null
}

const contatoWhatsAppId = (dados: Record<string, any>) =>
  texto(
    dados?.campos_adicionais?.whatsapp?.contato_id
  ) || null

async function carregarEntidades(): Promise<EntidadeRow[]> {
  const [
    { data: pessoas, error: pessoasError },
    { data: empresas, error: empresasError },
  ] = await Promise.all([
    supabase
      .from('crm_pessoas')
      .select(`
        id,
        corretora_id,
        corretor_id,
        cpf,
        cliente_id_legado,
        dados,
        classificacao,
        etapa_kanban,
        posicao_kanban,
        created_at,
        updated_at
      `),
    supabase
      .from('crm_empresas')
      .select(`
        id,
        corretora_id,
        corretor_id,
        cnpj,
        cliente_id_legado,
        dados,
        classificacao,
        etapa_kanban,
        posicao_kanban,
        created_at,
        updated_at
      `),
  ])

  if (pessoasError) throw pessoasError
  if (empresasError) throw empresasError

  return [
    ...(pessoas || []).map((row: any) => ({
      ...row,
      documento: row.cpf || null,
      tipo: 'PF' as const,
    })),
    ...(empresas || []).map((row: any) => ({
      ...row,
      documento: row.cnpj || null,
      tipo: 'PJ' as const,
    })),
  ]
}

async function carregarEntidadesKanban(): Promise<
  EntidadeRow[]
> {
  const [
    { data: pessoas, error: pessoasError },
    { data: empresas, error: empresasError },
  ] = await Promise.all([
    supabase
      .from('crm_pessoas')
      .select(`
        id,
        corretora_id,
        corretor_id,
        cpf,
        cliente_id_legado,
        dados,
        classificacao,
        etapa_kanban,
        posicao_kanban,
        created_at,
        updated_at
      `)
      .eq('classificacao', 'LEAD'),
    supabase
      .from('crm_empresas')
      .select(`
        id,
        corretora_id,
        corretor_id,
        cnpj,
        cliente_id_legado,
        dados,
        classificacao,
        etapa_kanban,
        posicao_kanban,
        created_at,
        updated_at
      `)
      .eq('classificacao', 'LEAD'),
  ])

  if (pessoasError) throw pessoasError
  if (empresasError) throw empresasError

  return [
    ...(pessoas || []).map((row: any) => ({
      ...row,
      documento: row.cpf || null,
      tipo: 'PF' as const,
    })),
    ...(empresas || []).map((row: any) => ({
      ...row,
      documento: row.cnpj || null,
      tipo: 'PJ' as const,
    })),
  ]
}

async function carregarResponsaveis(
  ids: string[]
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))]
  if (!unicos.length) return new Map()

  const { data, error } = await supabase
    .from('usuarios_perfis')
    .select('id, nome')
    .in('id', unicos)

  if (error) throw error

  return new Map(
    (data || []).map((item: any) => [
      item.id,
      item.nome || 'Sem nome',
    ])
  )
}

async function carregarProdutos(
  entidades: EntidadeRow[]
): Promise<Map<string, ClienteProdutoResumo[]>> {
  const mapa = new Map<
    string,
    ClienteProdutoResumo[]
  >()

  const pessoas = entidades
    .filter(item => item.tipo === 'PF')
    .map(item => item.id)

  const empresas = entidades
    .filter(item => item.tipo === 'PJ')
    .map(item => item.id)

  if (!pessoas.length && !empresas.length) {
    return mapa
  }

  const consultas: PromiseLike<any>[] = []

  if (pessoas.length) {
    consultas.push(
      supabase
        .from('crm_contratos')
        .select(`
          id,
          crm_pessoa_id,
          crm_empresa_id,
          produto_id,
          status
        `)
        .in('status', ['AGUARDANDO_EMISSAO', 'ATIVO'])
        .in('crm_pessoa_id', pessoas)
    )
  }

  if (empresas.length) {
    consultas.push(
      supabase
        .from('crm_contratos')
        .select(`
          id,
          crm_pessoa_id,
          crm_empresa_id,
          produto_id,
          status
        `)
        .in('status', ['AGUARDANDO_EMISSAO', 'ATIVO'])
        .in('crm_empresa_id', empresas)
    )
  }

  const resultados = await Promise.all(consultas)

  const contratos: any[] = []

  resultados.forEach(resultado => {
    if (resultado.error) throw resultado.error
    contratos.push(...(resultado.data || []))
  })

  const produtoIds = [
    ...new Set(
      contratos
        .map(item => item.produto_id)
        .filter(Boolean)
    ),
  ]

  const nomes = new Map<string, string>()

  if (produtoIds.length) {
    const { data: produtos, error } = await supabase
      .from('base_produtos')
      .select('id, nome')
      .in('id', produtoIds)

    if (error) throw error

    ;(produtos || []).forEach((item: any) => {
      nomes.set(item.id, item.nome || 'Produto')
    })
  }

  contratos.forEach((contrato: any) => {
    const chave = contrato.crm_pessoa_id
      ? chaveEntidade('PF', contrato.crm_pessoa_id)
      : contrato.crm_empresa_id
        ? chaveEntidade('PJ', contrato.crm_empresa_id)
        : null

    if (!chave || !contrato.produto_id) return

    const atual = mapa.get(chave) || []

    if (
      !atual.some(
        item => item.id === contrato.produto_id
      )
    ) {
      atual.push({
        id: contrato.produto_id,
        nome:
          nomes.get(contrato.produto_id) || 'Produto',
        status: contrato.status,
      })
    }

    mapa.set(chave, atual)
  })

  return mapa
}

async function carregarAgenda(
  entidades: EntidadeRow[]
): Promise<Map<string, AgendaResumo>> {
  const mapa = new Map<string, AgendaResumo>()

  const pessoas = entidades
    .filter(item => item.tipo === 'PF')
    .map(item => item.id)

  const empresas = entidades
    .filter(item => item.tipo === 'PJ')
    .map(item => item.id)

  if (!pessoas.length && !empresas.length) {
    return mapa
  }

  const consultas: PromiseLike<any>[] = []

  if (pessoas.length) {
    consultas.push(
      supabase
        .from('crm_agenda')
        .select(`
          id,
          crm_pessoa_id,
          crm_empresa_id,
          titulo,
          inicio_em,
          categoria,
          prioridade,
          status
        `)
        .eq('status', 'PENDENTE')
        .in('crm_pessoa_id', pessoas)
        .order('inicio_em', { ascending: true })
    )
  }

  if (empresas.length) {
    consultas.push(
      supabase
        .from('crm_agenda')
        .select(`
          id,
          crm_pessoa_id,
          crm_empresa_id,
          titulo,
          inicio_em,
          categoria,
          prioridade,
          status
        `)
        .eq('status', 'PENDENTE')
        .in('crm_empresa_id', empresas)
        .order('inicio_em', { ascending: true })
    )
  }

  const resultados = await Promise.all(consultas)
  const compromissos: any[] = []

  resultados.forEach(resultado => {
    if (resultado.error) throw resultado.error
    compromissos.push(...(resultado.data || []))
  })

  compromissos.sort(
    (a, b) =>
      new Date(a.inicio_em).getTime() -
      new Date(b.inicio_em).getTime()
  )

  const agora = Date.now()

  compromissos.forEach((item: any) => {
    const chave = item.crm_pessoa_id
      ? chaveEntidade('PF', item.crm_pessoa_id)
      : item.crm_empresa_id
        ? chaveEntidade('PJ', item.crm_empresa_id)
        : null

    if (!chave) return

    const atual = mapa.get(chave) || {
      proximo: null,
      atrasado: false,
    }

    const timestamp = new Date(item.inicio_em).getTime()

    if (timestamp < agora) {
      atual.atrasado = true
    } else if (!atual.proximo) {
      atual.proximo = {
        id: item.id,
        titulo: item.titulo,
        inicioEm: item.inicio_em,
        categoria: item.categoria,
        prioridade: item.prioridade,
      }
    }

    mapa.set(chave, atual)
  })

  return mapa
}

async function carregarConversasWhatsApp(
  entidades: EntidadeRow[]
): Promise<Map<string, string>> {
  const contatoIds = [
    ...new Set(
      entidades
        .map(item =>
          contatoWhatsAppId(item.dados || {})
        )
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (!contatoIds.length) return new Map()

  const { data, error } = await supabase
    .from('whatsapp_conversas')
    .select(`
      id,
      contato_id,
      status,
      ultima_mensagem_at,
      updated_at
    `)
    .in('contato_id', contatoIds)
    .neq('status', 'encerrada')
    .order('ultima_mensagem_at', { ascending: false })

  if (error) throw error

  const mapa = new Map<string, string>()

  ;(data || []).forEach((item: any) => {
    if (!mapa.has(item.contato_id)) {
      mapa.set(item.contato_id, item.id)
    }
  })

  return mapa
}

function atendeBuscaEntidade(
  row: EntidadeRow,
  busca: string
) {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')

  if (!termo || termo.length < 3) return true

  const dados = row.dados || {}
  const end = endereco(dados)
  const telefone = primeiroTelefone(dados)
  const email = primeiroEmail(dados)
  const numerico = termo.replace(/\D/g, '')

  const campos = [
    nomeEntidade(row),
    nomeSecundario(row),
    row.documento,
    telefone,
    email,
    end.municipio,
    end.uf,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR')

  return (
    campos.includes(termo) ||
    (!!numerico &&
      campos.replace(/\D/g, '').includes(numerico))
  )
}

function ordenarEntidades(
  entidades: EntidadeRow[],
  ordenacao: CentralClientesFiltros['ordenacao']
) {
  const resultado = [...entidades]

  switch (ordenacao) {
    case 'NOME_ASC':
      return resultado.sort((a, b) =>
        nomeEntidade(a).localeCompare(
          nomeEntidade(b),
          'pt-BR'
        )
      )

    case 'NOME_DESC':
      return resultado.sort((a, b) =>
        nomeEntidade(b).localeCompare(
          nomeEntidade(a),
          'pt-BR'
        )
      )

    case 'RECENTES':
    default:
      return resultado.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
  }
}

async function enriquecerEntidades(
  entidades: EntidadeRow[]
): Promise<ClienteCentral[]> {
  if (!entidades.length) return []

  const [responsaveis, produtos, agenda, conversas] =
    await Promise.all([
      carregarResponsaveis(
        entidades.map(item => item.corretor_id)
      ),
      carregarProdutos(entidades),
      carregarAgenda(entidades),
      carregarConversasWhatsApp(entidades),
    ])

  return entidades.map(row => {
    const dados = row.dados || {}
    const chave = chaveEntidade(row.tipo, row.id)
    const agendaItem = agenda.get(chave)
    const contatoId = contatoWhatsAppId(dados)
    const end = endereco(dados)

    return {
      id: row.id,
      tipo: row.tipo,
      corretoraId: row.corretora_id,
      corretorId: row.corretor_id,
      clienteIdLegado: row.cliente_id_legado,
      nome: nomeEntidade(row),
      nomeSecundario: nomeSecundario(row),
      documento: row.documento,
      telefone: primeiroTelefone(dados),
      email: primeiroEmail(dados),
      municipio: end.municipio,
      uf: end.uf,
      classificacao:
        row.classificacao === 'LEAD'
          ? 'LEAD'
          : 'NAO_QUALIFICADO',
      temperatura: temperatura(dados),
      etapaKanban:
        row.classificacao === 'LEAD'
          ? row.etapa_kanban || 'prospeccao'
          : null,
      posicaoKanban:
        row.classificacao === 'LEAD'
          ? row.posicao_kanban ?? 0
          : null,
      responsavelNome:
        responsaveis.get(row.corretor_id) ||
        'Não identificado',
      produtos: produtos.get(chave) || [],
      proximoCompromisso:
        agendaItem?.proximo || null,
      compromissoAtrasado:
        agendaItem?.atrasado || false,
      possuiWhatsApp: Boolean(contatoId),
      whatsappContatoId: contatoId,
      whatsappConversationId:
        contatoId
          ? conversas.get(contatoId) || null
          : null,
      dados,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } satisfies ClienteCentral
  })
}

function ordenarClientesEnriquecidos(
  clientes: ClienteCentral[],
  ordenacao: CentralClientesFiltros['ordenacao']
) {
  const resultado = [...clientes]

  switch (ordenacao) {
    case 'PROXIMO_COMPROMISSO':
      return resultado.sort((a, b) => {
        const ta = a.proximoCompromisso
          ? new Date(
              a.proximoCompromisso.inicioEm
            ).getTime()
          : Number.MAX_SAFE_INTEGER

        const tb = b.proximoCompromisso
          ? new Date(
              b.proximoCompromisso.inicioEm
            ).getTime()
          : Number.MAX_SAFE_INTEGER

        return ta - tb
      })

    case 'SEM_COMPROMISSO':
      return resultado.sort(
        (a, b) =>
          Number(Boolean(a.proximoCompromisso)) -
          Number(Boolean(b.proximoCompromisso))
      )

    default:
      return resultado
  }
}

async function montarClientes(
  entidades: EntidadeRow[]
): Promise<ClienteCentral[]> {
  return enriquecerEntidades(entidades)
}

export async function buscarClientesCentral(
  filtros: CentralClientesFiltros,
  pagina = 1,
  porPagina = 20
): Promise<CentralClientesResultado> {
  const entidades = await carregarEntidades()

  let filtradas = entidades.filter(row => {
    if (
      filtros.tipo !== 'TODOS' &&
      row.tipo !== filtros.tipo
    ) {
      return false
    }

    if (
      filtros.classificacao !== 'TODOS' &&
      row.classificacao !== filtros.classificacao
    ) {
      return false
    }

    if (
      filtros.responsavelId &&
      row.corretor_id !== filtros.responsavelId
    ) {
      return false
    }

    return atendeBuscaEntidade(row, filtros.busca)
  })

  filtradas = ordenarEntidades(
    filtradas,
    filtros.ordenacao
  )

  /*
   * Os filtros abaixo dependem de dados da agenda.
   * Quando algum deles está ativo, enriquecemos a base
   * filtrada antes da paginação para preservar a semântica.
   *
   * Na navegação normal, somente a página atual é enriquecida.
   */
  const dependeAgenda =
    filtros.compromisso !== 'TODOS' ||
    filtros.ordenacao === 'PROXIMO_COMPROMISSO' ||
    filtros.ordenacao === 'SEM_COMPROMISSO'

  if (dependeAgenda) {
    let clientes = await enriquecerEntidades(filtradas)

    clientes = clientes.filter(cliente => {
      if (
        filtros.compromisso === 'COM_COMPROMISSO' &&
        !cliente.proximoCompromisso
      ) {
        return false
      }

      if (
        filtros.compromisso === 'SEM_COMPROMISSO' &&
        cliente.proximoCompromisso
      ) {
        return false
      }

      if (
        filtros.compromisso === 'ATRASADO' &&
        !cliente.compromissoAtrasado
      ) {
        return false
      }

      return true
    })

    clientes = ordenarClientesEnriquecidos(
      clientes,
      filtros.ordenacao
    )

    const total = clientes.length
    const totalPaginas = Math.max(
      1,
      Math.ceil(total / porPagina)
    )
    const paginaSegura = Math.min(
      Math.max(1, pagina),
      totalPaginas
    )
    const inicio =
      (paginaSegura - 1) * porPagina

    return {
      clientes: clientes.slice(
        inicio,
        inicio + porPagina
      ),
      paginacao: {
        pagina: paginaSegura,
        porPagina,
        total,
        totalPaginas,
      },
    }
  }

  const total = filtradas.length
  const totalPaginas = Math.max(
    1,
    Math.ceil(total / porPagina)
  )
  const paginaSegura = Math.min(
    Math.max(1, pagina),
    totalPaginas
  )
  const inicio =
    (paginaSegura - 1) * porPagina

  const paginaEntidades = filtradas.slice(
    inicio,
    inicio + porPagina
  )

  const clientes = await enriquecerEntidades(
    paginaEntidades
  )

  return {
    clientes,
    paginacao: {
      pagina: paginaSegura,
      porPagina,
      total,
      totalPaginas,
    },
  }
}

export async function buscarClientesKanban(): Promise<
  ClienteCentral[]
> {
  const entidades = await carregarEntidadesKanban()
  const clientes = await montarClientes(entidades)

  return clientes.sort(
    (a, b) =>
      (a.posicaoKanban ?? 0) -
      (b.posicaoKanban ?? 0)
  )
}

export async function buscarResumoCentral(
  filtros: CentralClientesFiltros
): Promise<CentralClientesResumo> {
  const entidades = await carregarEntidades()

  let filtradas = entidades.filter(row => {
    if (
      filtros.tipo !== 'TODOS' &&
      row.tipo !== filtros.tipo
    ) {
      return false
    }

    if (
      filtros.classificacao !== 'TODOS' &&
      row.classificacao !== filtros.classificacao
    ) {
      return false
    }

    if (
      filtros.responsavelId &&
      row.corretor_id !== filtros.responsavelId
    ) {
      return false
    }

    return atendeBuscaEntidade(row, filtros.busca)
  })

  /*
   * Produto ainda não participa do resumo porque o filtro
   * atualmente aplicado na listagem também não aparece
   * neste bloco base.
   *
   * Compromisso precisa da agenda para ser avaliado.
   */
  const agenda = await carregarAgenda(filtradas)

  if (filtros.compromisso !== 'TODOS') {
    filtradas = filtradas.filter(entidade => {
      const item = agenda.get(
        chaveEntidade(entidade.tipo, entidade.id)
      )

      if (
        filtros.compromisso === 'COM_COMPROMISSO'
      ) {
        return Boolean(item?.proximo)
      }

      if (
        filtros.compromisso === 'SEM_COMPROMISSO'
      ) {
        return !item?.proximo
      }

      if (filtros.compromisso === 'ATRASADO') {
        return Boolean(item?.atrasado)
      }

      return true
    })
  }

  let pessoas = 0
  let empresas = 0
  let leads = 0
  let semCompromisso = 0

  filtradas.forEach(entidade => {
    if (entidade.tipo === 'PF') {
      pessoas += 1
    } else {
      empresas += 1
    }

    if (entidade.classificacao === 'LEAD') {
      leads += 1
    }

    const item = agenda.get(
      chaveEntidade(entidade.tipo, entidade.id)
    )

    if (!item?.proximo) {
      semCompromisso += 1
    }
  })

  return {
    total: filtradas.length,
    pessoas,
    empresas,
    leads,
    semCompromisso,
  }
}

export async function buscarResponsaveisCentral(): Promise<
  ResponsavelCentral[]
> {
  const sessao = await obterSessaoCrm()
  const corretoraId = sessao.corretora_id

  const { data, error } = await supabase
    .from('usuarios_perfis')
    .select(
      'id, nome, tipo_usuario, corretora_id, ativo'
    )
    .eq('ativo', true)
    .or(
      `id.eq.${corretoraId},corretora_id.eq.${corretoraId}`
    )
    .order('nome', { ascending: true })

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.id,
    nome: item.nome || 'Sem nome',
    tipoUsuario: item.tipo_usuario,
  }))
}

export async function buscarClienteCentralPorId(
  tipo: 'PF' | 'PJ',
  id: string
): Promise<ClienteCentral | null> {
  const tabela =
    tipo === 'PF'
      ? 'crm_pessoas'
      : 'crm_empresas'

  const documento =
    tipo === 'PF'
      ? 'cpf'
      : 'cnpj'

  const { data, error } = await supabase
    .from(tabela)
    .select(`
      id,
      corretora_id,
      corretor_id,
      ${documento},
      cliente_id_legado,
      dados,
      classificacao,
      etapa_kanban,
      posicao_kanban,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row: EntidadeRow = {
    ...(data as any),
    documento: (data as any)[documento] || null,
    tipo,
  }

  const [cliente] = await enriquecerEntidades([row])

  return cliente || null
}

export async function tornarClienteLead(
  cliente: Pick<ClienteCentral, 'id' | 'tipo'>
): Promise<void> {
  if (cliente.tipo === 'PF') {
    await enviarPessoaParaLead(cliente.id)
  } else {
    await enviarEmpresaParaLead(cliente.id)
  }
}

export async function atualizarKanbanCliente(
  cliente: Pick<ClienteCentral, 'id' | 'tipo'>,
  etapa: ClienteKanbanStage,
  posicao: number
): Promise<void> {
  const tabela =
    cliente.tipo === 'PF'
      ? 'crm_pessoas'
      : 'crm_empresas'

  const { error } = await supabase
    .from(tabela)
    .update({
      classificacao: 'LEAD',
      etapa_kanban: etapa,
      posicao_kanban: posicao,
    })
    .eq('id', cliente.id)

  if (error) throw error
}

export async function transferirResponsavelCentral(
  cliente: Pick<ClienteCentral, 'id' | 'tipo'>,
  novoResponsavelId: string
): Promise<void> {
  if (cliente.tipo === 'PF') {
    await transferirPessoa(
      cliente.id,
      novoResponsavelId
    )
  } else {
    await transferirEmpresa(
      cliente.id,
      novoResponsavelId
    )
  }
}

export async function excluirClienteCentral(
  cliente: Pick<ClienteCentral, 'id' | 'tipo'>
): Promise<void> {
  if (cliente.tipo === 'PF') {
    await excluirPessoa(cliente.id)
  } else {
    await excluirEmpresa(cliente.id)
  }
}