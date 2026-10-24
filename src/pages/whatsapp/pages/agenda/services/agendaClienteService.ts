import { supabase } from '../../../../../lib/supabaseClient'

export type AgendaClienteTipo =
  | 'PESSOA'
  | 'EMPRESA'
  | 'LEGADO'

export interface AgendaClienteResultado {
  tipo: AgendaClienteTipo
  id: string

  nome: string
  nomeSecundario: string | null

  documento: string | null
  telefone: string | null

  corretorId: string | null

  clienteIdLegado: string | null

  classificacao: string | null

  origemLabel: string
}

interface BuscarAgendaClientesParams {
  corretoraId: string
  termo: string
  limite?: number
}

export interface BuscarAgendaClientePorVinculoParams {
  corretoraId: string
  crmPessoaId?: string | null
  crmEmpresaId?: string | null
  clienteIdLegado?: string | null
}

type JsonObject =
  Record<string, unknown>

type PessoaRow = {
  id: string
  corretor_id: string
  cpf: string | null
  dados: JsonObject | null
  classificacao: string
  cliente_id_legado: string | null
}

type EmpresaRow = {
  id: string
  corretor_id: string
  cnpj: string | null
  dados: JsonObject | null
  dados_api_cnpj: JsonObject | null
  classificacao: string
  cliente_id_legado: string | null
}

type ClienteLegadoRow = {
  id: string
  corretor_id: string | null
  tipo_cliente: string
  cpf_cnpj: string | null
  nome_razao_social: string
  nome_fantasia: string | null
  contatos: unknown
  fase_atendimento: string | null
}

function somenteNumeros(
  valor: string
) {
  return valor.replace(/\D/g, '')
}

function obterString(
  objeto: JsonObject | null | undefined,
  chaves: string[]
): string | null {
  if (!objeto) {
    return null
  }

  for (const chave of chaves) {
    const valor = objeto[chave]

    if (
      typeof valor === 'string' &&
      valor.trim()
    ) {
      return valor.trim()
    }
  }

  return null
}

function obterObjeto(
  objeto: JsonObject | null | undefined,
  chaves: string[]
): JsonObject | null {
  if (!objeto) {
    return null
  }

  for (const chave of chaves) {
    const valor = objeto[chave]

    if (
      valor &&
      typeof valor === 'object' &&
      !Array.isArray(valor)
    ) {
      return valor as JsonObject
    }
  }

  return null
}

function obterNomePessoa(
  dados: JsonObject | null
) {
  return (
    obterString(
      dados,
      [
        'nome',
        'nome_completo',
        'nomeCompleto',
        'nome_razao_social',
      ]
    ) ??
    'Pessoa sem nome'
  )
}

function obterTelefonePessoa(
  dados: JsonObject | null
) {
  const telefoneDireto =
    obterString(
      dados,
      [
        'telefone',
        'celular',
        'whatsapp',
        'phone',
      ]
    )

  if (telefoneDireto) {
    return telefoneDireto
  }

  const contato =
    obterObjeto(
      dados,
      [
        'contato',
        'contatos',
      ]
    )

  return obterString(
    contato,
    [
      'telefone',
      'celular',
      'whatsapp',
      'phone',
    ]
  )
}

function obterNomeEmpresa(
  dados: JsonObject | null,
  dadosApi: JsonObject | null
) {
  return (
    obterString(
      dados,
      [
        'razao_social',
        'razaoSocial',
        'nome_razao_social',
        'nome',
      ]
    ) ??
    obterString(
      dadosApi,
      [
        'razao_social',
        'razaoSocial',
        'nome',
      ]
    ) ??
    'Empresa sem nome'
  )
}

function obterFantasiaEmpresa(
  dados: JsonObject | null,
  dadosApi: JsonObject | null
) {
  return (
    obterString(
      dados,
      [
        'nome_fantasia',
        'nomeFantasia',
        'fantasia',
      ]
    ) ??
    obterString(
      dadosApi,
      [
        'nome_fantasia',
        'nomeFantasia',
        'fantasia',
      ]
    )
  )
}

function obterTelefoneEmpresa(
  dados: JsonObject | null,
  dadosApi: JsonObject | null
) {
  return (
    obterString(
      dados,
      [
        'telefone',
        'celular',
        'whatsapp',
        'phone',
      ]
    ) ??
    obterString(
      dadosApi,
      [
        'telefone',
        'celular',
        'whatsapp',
        'phone',
      ]
    )
  )
}

function obterTelefoneLegado(
  contatos: unknown
): string | null {
  if (!Array.isArray(contatos)) {
    return null
  }

  const contatoPrincipal =
    contatos.find(contato => {
      if (
        !contato ||
        typeof contato !== 'object'
      ) {
        return false
      }

      return (
        'principal' in contato &&
        contato.principal === true
      )
    }) ??
    contatos[0]

  if (
    !contatoPrincipal ||
    typeof contatoPrincipal !== 'object'
  ) {
    return null
  }

  const contato =
    contatoPrincipal as JsonObject

  return obterString(
    contato,
    [
      'telefone',
      'celular',
      'whatsapp',
      'phone',
    ]
  )
}

function mapPessoa(
  row: PessoaRow
): AgendaClienteResultado {
  return {
    tipo: 'PESSOA',
    id: row.id,

    nome:
      obterNomePessoa(row.dados),

    nomeSecundario: null,

    documento: row.cpf,

    telefone:
      obterTelefonePessoa(
        row.dados
      ),

    corretorId:
      row.corretor_id,

    clienteIdLegado:
      row.cliente_id_legado,

    classificacao:
      row.classificacao,

    origemLabel: 'Pessoa CRM',
  }
}

function mapEmpresa(
  row: EmpresaRow
): AgendaClienteResultado {
  return {
    tipo: 'EMPRESA',
    id: row.id,

    nome:
      obterNomeEmpresa(
        row.dados,
        row.dados_api_cnpj
      ),

    nomeSecundario:
      obterFantasiaEmpresa(
        row.dados,
        row.dados_api_cnpj
      ),

    documento: row.cnpj,

    telefone:
      obterTelefoneEmpresa(
        row.dados,
        row.dados_api_cnpj
      ),

    corretorId:
      row.corretor_id,

    clienteIdLegado:
      row.cliente_id_legado,

    classificacao:
      row.classificacao,

    origemLabel: 'Empresa CRM',
  }
}

function mapClienteLegado(
  row: ClienteLegadoRow
): AgendaClienteResultado {
  return {
    tipo: 'LEGADO',
    id: row.id,

    nome:
      row.nome_razao_social,

    nomeSecundario:
      row.nome_fantasia,

    documento:
      row.cpf_cnpj,

    telefone:
      obterTelefoneLegado(
        row.contatos
      ),

    corretorId:
      row.corretor_id,

    clienteIdLegado:
      row.id,

    classificacao:
      row.fase_atendimento,

    origemLabel:
      row.tipo_cliente === 'PJ'
        ? 'Cliente PJ legado'
        : 'Cliente PF legado',
  }
}

function normalizarBusca(
  valor: string
) {
  return valor
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
}

function resultadoContemTermo(
  resultado: AgendaClienteResultado,
  termo: string
) {
  const termoTexto =
    normalizarBusca(termo)

  const termoNumerico =
    somenteNumeros(termo)

  const campos = [
    resultado.nome,
    resultado.nomeSecundario,
    resultado.documento,
    resultado.telefone,
  ]
    .filter(Boolean)
    .map(valor =>
      normalizarBusca(
        String(valor)
      )
    )

  if (
    campos.some(campo =>
      campo.includes(termoTexto)
    )
  ) {
    return true
  }

  if (
    termoNumerico.length >= 3
  ) {
    return campos.some(campo =>
      somenteNumeros(campo)
        .includes(termoNumerico)
    )
  }

  return false
}

function removerDuplicidades(
  resultados:
    AgendaClienteResultado[]
) {
  const crmLegados =
    new Set<string>()

  resultados.forEach(resultado => {
    if (
      resultado.tipo !== 'LEGADO' &&
      resultado.clienteIdLegado
    ) {
      crmLegados.add(
        resultado.clienteIdLegado
      )
    }
  })

  return resultados.filter(
    resultado => {
      if (
        resultado.tipo !== 'LEGADO'
      ) {
        return true
      }

      return !crmLegados.has(
        resultado.id
      )
    }
  )
}

export async function buscarAgendaClientes({
  corretoraId,
  termo,
  limite = 20,
}: BuscarAgendaClientesParams): Promise<
  AgendaClienteResultado[]
> {
  const busca = termo.trim()

  if (
    !corretoraId ||
    busca.length < 2
  ) {
    return []
  }

  const limiteFonte =
    Math.max(
      limite,
      30
    )

  const [
    pessoasResponse,
    empresasResponse,
    legadoResponse,
  ] = await Promise.all([
    supabase
      .from('crm_pessoas')
      .select(`
        id,
        corretor_id,
        cpf,
        dados,
        classificacao,
        cliente_id_legado
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .limit(limiteFonte),

    supabase
      .from('crm_empresas')
      .select(`
        id,
        corretor_id,
        cnpj,
        dados,
        dados_api_cnpj,
        classificacao,
        cliente_id_legado
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .limit(limiteFonte),

    supabase
      .from('tab_clientes')
      .select(`
        id,
        corretor_id,
        tipo_cliente,
        cpf_cnpj,
        nome_razao_social,
        nome_fantasia,
        contatos,
        fase_atendimento
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .limit(limiteFonte),
  ])

  if (pessoasResponse.error) {
    console.error(
      'Erro ao buscar pessoas para agenda:',
      pessoasResponse.error
    )
  }

  if (empresasResponse.error) {
    console.error(
      'Erro ao buscar empresas para agenda:',
      empresasResponse.error
    )
  }

  if (legadoResponse.error) {
    console.error(
      'Erro ao buscar clientes legados para agenda:',
      legadoResponse.error
    )
  }

  if (
    pessoasResponse.error &&
    empresasResponse.error &&
    legadoResponse.error
  ) {
    throw new Error(
      'Não foi possível pesquisar clientes.'
    )
  }

  const pessoas =
    (
      pessoasResponse.data ??
      []
    )
      .map(row =>
        mapPessoa(
          row as PessoaRow
        )
      )
      .filter(resultado =>
        resultadoContemTermo(
          resultado,
          busca
        )
      )

  const empresas =
    (
      empresasResponse.data ??
      []
    )
      .map(row =>
        mapEmpresa(
          row as EmpresaRow
        )
      )
      .filter(resultado =>
        resultadoContemTermo(
          resultado,
          busca
        )
      )

  const legados =
    (
      legadoResponse.data ??
      []
    )
      .map(row =>
        mapClienteLegado(
          row as ClienteLegadoRow
        )
      )
      .filter(resultado =>
        resultadoContemTermo(
          resultado,
          busca
        )
      )

  const resultados =
    removerDuplicidades([
      ...pessoas,
      ...empresas,
      ...legados,
    ])

  resultados.sort(
    (a, b) => {
      const nomeA =
        normalizarBusca(a.nome)

      const nomeB =
        normalizarBusca(b.nome)

      const termoNormalizado =
        normalizarBusca(busca)

      const aComeca =
        nomeA.startsWith(
          termoNormalizado
        )

      const bComeca =
        nomeB.startsWith(
          termoNormalizado
        )

      if (
        aComeca !== bComeca
      ) {
        return aComeca ? -1 : 1
      }

      return a.nome.localeCompare(
        b.nome,
        'pt-BR'
      )
    }
  )

  return resultados.slice(
    0,
    limite
  )
}

export async function buscarAgendaClientePorVinculo({
  corretoraId,
  crmPessoaId = null,
  crmEmpresaId = null,
  clienteIdLegado = null,
}: BuscarAgendaClientePorVinculoParams): Promise<
  AgendaClienteResultado | null
> {
  if (!corretoraId) {
    return null
  }

  if (crmPessoaId) {
    const {
      data,
      error,
    } = await supabase
      .from('crm_pessoas')
      .select(`
        id,
        corretor_id,
        cpf,
        dados,
        classificacao,
        cliente_id_legado
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .eq(
        'id',
        crmPessoaId
      )
      .maybeSingle()

    if (error) {
      console.error(
        'Erro ao buscar pessoa vinculada à agenda:',
        error
      )

      throw new Error(
        'Não foi possível carregar a pessoa vinculada.'
      )
    }

    if (!data) {
      return null
    }

    return mapPessoa(
      data as PessoaRow
    )
  }

  if (crmEmpresaId) {
    const {
      data,
      error,
    } = await supabase
      .from('crm_empresas')
      .select(`
        id,
        corretor_id,
        cnpj,
        dados,
        dados_api_cnpj,
        classificacao,
        cliente_id_legado
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .eq(
        'id',
        crmEmpresaId
      )
      .maybeSingle()

    if (error) {
      console.error(
        'Erro ao buscar empresa vinculada à agenda:',
        error
      )

      throw new Error(
        'Não foi possível carregar a empresa vinculada.'
      )
    }

    if (!data) {
      return null
    }

    return mapEmpresa(
      data as EmpresaRow
    )
  }

  if (clienteIdLegado) {
    const {
      data,
      error,
    } = await supabase
      .from('tab_clientes')
      .select(`
        id,
        corretor_id,
        tipo_cliente,
        cpf_cnpj,
        nome_razao_social,
        nome_fantasia,
        contatos,
        fase_atendimento
      `)
      .eq(
        'corretora_id',
        corretoraId
      )
      .eq(
        'id',
        clienteIdLegado
      )
      .maybeSingle()

    if (error) {
      console.error(
        'Erro ao buscar cliente legado vinculado à agenda:',
        error
      )

      throw new Error(
        'Não foi possível carregar o cliente vinculado.'
      )
    }

    if (!data) {
      return null
    }

    return mapClienteLegado(
      data as ClienteLegadoRow
    )
  }

  return null
}