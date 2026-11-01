import { supabase } from '../../../lib/supabaseClient'

import {
  atualizarEmpresa,
  atualizarPessoa,
  buscarVinculosDaPessoa,
  obterSessaoCrm,
  type CrmEmpresa,
  type CrmPessoa,
  type CrmPessoaEmpresaVinculo,
  type CrmKanbanStage,
} from '../services/crmClienteService'


export type CrmWhatsAppVinculo =
  | {
      tipo: 'PF'
      pessoa: CrmPessoa
      empresa: null
      vinculos: Array<
        CrmPessoaEmpresaVinculo & {
          empresa?: CrmEmpresa | null
        }
      >
    }
  | {
      tipo: 'PJ'
      pessoa: null
      empresa: CrmEmpresa
      vinculos: []
    }

export type OrigemBuscaCliente =
  | 'CRM_PESSOA'
  | 'CRM_EMPRESA'

export interface ClienteBuscaVinculo {
  id: string
  origem: OrigemBuscaCliente
  tipo: 'PF' | 'PJ'
  nome: string
  documento: string | null
  telefone: string | null
  email: string | null
  cliente_id_legado: string | null
  registro: CrmPessoa | CrmEmpresa
}

interface RpcClienteBuscaVinculo {
  id: string
  origem: OrigemBuscaCliente
  tipo_cliente: string
  nome: string | null
  documento: string | null
  telefone: string | null
  email: string | null
  cliente_id_legado: string | null
  registro: Record<string, any> | null
}

export interface ResultadoVinculoWhatsApp {
  tipo: 'PF' | 'PJ'
  origem: 'CRM_EXISTENTE'
  pessoa: CrmPessoa | null
  empresa: CrmEmpresa | null
}

export interface CrmHistoricoProduto {
  id: string
  proposta_id: string
  opcao_id: string
  produto_id: string | null
  produto_nome: string
  produto_categoria: string | null
  seguradora_id: string | null
  seguradora_nome: string | null
  valor_premio: number
  valor_liquido: number
  numero_cotacao: string | null
  numero_apolice: string | null
  data_cotacao: string | null
  data_inicio_vigencia: string | null
  data_fim_vigencia: string | null
  data_venda: string | null
  data_renovacao: string | null
  horario_renovacao: string | null
  status_renovacao: string | null
  periodicidade: string | null
  parcelamento: string | null
  meio_pagamento: string | null
  coberturas_franquias: string | null
  motivo_cancelamento: string | null
}

export interface CrmHistoricoOpcao {
  id: string
  proposta_id: string
  seguradora_id: string | null
  seguradora_nome: string | null
  ordem_opcao: number | null
  valor_total_opcao: number
  produtos: CrmHistoricoProduto[]
}

export type CrmHistoricoPropostaOrigem =
  | 'LEGADO'
  | 'NOVO_CRM'

export interface CrmHistoricoProposta {
  id: string
  origem: CrmHistoricoPropostaOrigem
  numero_proposta: string
  cliente_id: string | null
  data_emissao: string | null
  data_validade: string | null
  status: string | null
  motivo_perda: string | null
  valor_total_proposta: number
  observacoes_fechamento: string | null
  data_venda: string | null
  tipo_negocio: string | null
  parceiro_id: string | null
  opcoes: CrmHistoricoOpcao[]
}

export interface CrmHistoricoComercial {
  cliente_id_legado: string | null
  propostas: CrmHistoricoProposta[]
  produtos: CrmHistoricoProduto[]
}


const filtroWhatsApp = (contatoId: string) => ({
  campos_adicionais: {
    whatsapp: {
      contato_id: contatoId,
    },
  },
})

const camposAdicionaisComWhatsApp = (
  camposAtuais: Record<string, any> | undefined,
  contatoId: string
): Record<string, any> => ({
  ...(camposAtuais || {}),
  whatsapp: {
    ...(camposAtuais?.whatsapp || {}),
    contato_id: contatoId,
  },
})


export async function buscarContatosLeadWhatsApp(): Promise<Set<string>> {
  const [
    { data: pessoas, error: pessoasError },
    { data: empresas, error: empresasError },
  ] = await Promise.all([
    supabase
      .from('crm_pessoas')
      .select('dados')
      .eq('classificacao', 'LEAD'),

    supabase
      .from('crm_empresas')
      .select('dados')
      .eq('classificacao', 'LEAD'),
  ])

  if (pessoasError) {
    console.error(
      'Erro ao buscar pessoas Lead vinculadas ao WhatsApp:',
      pessoasError
    )
    throw pessoasError
  }

  if (empresasError) {
    console.error(
      'Erro ao buscar empresas Lead vinculadas ao WhatsApp:',
      empresasError
    )
    throw empresasError
  }

  const contatoIds = new Set<string>()

  const adicionarContatoId = (
    registro: {
      dados?: Record<string, any> | null
    }
  ) => {
    const contatoId =
      registro.dados?.campos_adicionais
        ?.whatsapp?.contato_id

    if (
      typeof contatoId === 'string' &&
      contatoId.trim()
    ) {
      contatoIds.add(contatoId.trim())
    }
  }

  ;(pessoas || []).forEach(adicionarContatoId)
  ;(empresas || []).forEach(adicionarContatoId)

  return contatoIds
}

export interface WhatsAppClienteResumo {
  contatoId: string
  tipo: 'PF' | 'PJ'
  crmId: string
  classificacao: 'NAO_QUALIFICADO' | 'LEAD'
  temperatura: 'FRIO' | 'MORNO' | 'QUENTE' | null
  etapaKanban: CrmKanbanStage | null
  posicaoKanban: number | null
}

export async function buscarResumoClientesWhatsApp(): Promise<Map<string, WhatsAppClienteResumo>> {
  const [
    { data: pessoas, error: pessoasError },
    { data: empresas, error: empresasError },
  ] = await Promise.all([
    supabase
      .from('crm_pessoas')
      .select('id, classificacao, etapa_kanban, posicao_kanban, dados'),

    supabase
      .from('crm_empresas')
      .select('id, classificacao, etapa_kanban, posicao_kanban, dados'),
  ])

  if (pessoasError) {
    console.error(
      'Erro ao buscar pessoas vinculadas ao WhatsApp:',
      pessoasError
    )
    throw pessoasError
  }

  if (empresasError) {
    console.error(
      'Erro ao buscar empresas vinculadas ao WhatsApp:',
      empresasError
    )
    throw empresasError
  }

  const resultado = new Map<string, WhatsAppClienteResumo>()

  const adicionar = (
    registro: any,
    tipo: 'PF' | 'PJ'
  ) => {
    const contatoId =
      registro.dados?.campos_adicionais
        ?.whatsapp?.contato_id

    if (
      typeof contatoId !== 'string' ||
      !contatoId.trim()
    ) {
      return
    }

    const classificacao:
      WhatsAppClienteResumo['classificacao'] =
      registro.classificacao === 'LEAD'
        ? 'LEAD'
        : 'NAO_QUALIFICADO'

    const temperaturaRaw = String(
      registro.dados?.temperatura || ''
    ).toUpperCase()

    const temperatura:
      WhatsAppClienteResumo['temperatura'] =
      temperaturaRaw === 'FRIO' ||
      temperaturaRaw === 'MORNO' ||
      temperaturaRaw === 'QUENTE'
        ? temperaturaRaw
        : null

    const etapaKanban:
      WhatsAppClienteResumo['etapaKanban'] =
      classificacao === 'LEAD'
        ? registro.etapa_kanban || null
        : null

    const posicaoKanban:
      WhatsAppClienteResumo['posicaoKanban'] =
      classificacao === 'LEAD' &&
      typeof registro.posicao_kanban === 'number' &&
      Number.isFinite(registro.posicao_kanban)
        ? registro.posicao_kanban
        : null

    resultado.set(
      contatoId.trim(),
      {
        contatoId: contatoId.trim(),
        tipo,
        crmId: registro.id,
        classificacao,
        temperatura,
        etapaKanban,
        posicaoKanban,
      }
    )
  }

  ;(pessoas || []).forEach(registro =>
    adicionar(registro, 'PF')
  )

  ;(empresas || []).forEach(registro =>
    adicionar(registro, 'PJ')
  )

  return resultado
}

export async function buscarClienteCrmPorContatoWhatsApp(
  contatoId?: string | null
): Promise<CrmWhatsAppVinculo | null> {
  if (!contatoId) return null

  const { data: pessoa, error: pessoaError } =
    await supabase
      .from('crm_pessoas')
      .select('*')
      .contains(
        'dados',
        filtroWhatsApp(contatoId)
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

  if (pessoaError) throw pessoaError

  if (pessoa) {
    const vinculos =
      await buscarVinculosDaPessoa(
        pessoa.id
      )

    return {
      tipo: 'PF',
      pessoa: pessoa as CrmPessoa,
      empresa: null,
      vinculos,
    }
  }

  const { data: empresa, error: empresaError } =
    await supabase
      .from('crm_empresas')
      .select('*')
      .contains(
        'dados',
        filtroWhatsApp(contatoId)
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

  if (empresaError) throw empresaError

  if (!empresa) return null

  return {
    tipo: 'PJ',
    pessoa: null,
    empresa: empresa as CrmEmpresa,
    vinculos: [],
  }
}

export async function buscarClientesParaVinculo(
  termo: string
): Promise<ClienteBuscaVinculo[]> {
  const busca = termo.trim()

  if (busca.length < 2) return []

  const sessao =
    await obterSessaoCrm()

  const { data, error } =
    await supabase.rpc(
      'crm_buscar_clientes_para_vinculo',
      {
        p_corretora_id:
          sessao.corretora_id,
        p_termo: busca,
      }
    )

  if (error) {
    console.error(
      'Erro ao buscar clientes para vínculo:',
      error
    )

    throw error
  }

  const resultados =
    (data || []) as RpcClienteBuscaVinculo[]

  return resultados.map(
    (
      item
    ): ClienteBuscaVinculo => ({
      id: item.id,

      origem:
        item.origem,

      tipo:
        item.tipo_cliente === 'PJ'
          ? 'PJ'
          : 'PF',

      nome:
        item.nome ||
        'Cliente sem nome',

      documento:
        item.documento || null,

      telefone:
        item.telefone || null,

      email:
        item.email || null,

      cliente_id_legado:
        item.cliente_id_legado ||
        null,

      registro:
        item.origem === 'CRM_PESSOA'
          ? (item.registro as CrmPessoa)
          : (item.registro as CrmEmpresa),
    })
  )
}

export async function desvincularClienteDoWhatsApp(
  vinculo: CrmWhatsAppVinculo
): Promise<void> {
  const registro =
    vinculo.tipo === 'PF'
      ? vinculo.pessoa
      : vinculo.empresa

  if (!registro?.id) {
    throw new Error(
      'Cliente CRM vinculado não encontrado.'
    )
  }

  const camposAtuais =
    registro.dados?.campos_adicionais || {}

  const whatsappAtual =
    camposAtuais.whatsapp || {}

  const camposAdicionaisAtualizados = {
    ...camposAtuais,
    whatsapp: {
      ...whatsappAtual,
      contato_id: null,
    },
  }

  if (vinculo.tipo === 'PF') {
    await atualizarPessoa(
      registro.id,
      {
        dados: {
          campos_adicionais:
            camposAdicionaisAtualizados,
        },
      }
    )

    return
  }

  await atualizarEmpresa(
    registro.id,
    {
      dados: {
        campos_adicionais:
          camposAdicionaisAtualizados,
      },
    }
  )
}

export async function vincularClienteExistenteAoWhatsApp(
  cliente: ClienteBuscaVinculo,
  contatoId: string
): Promise<ResultadoVinculoWhatsApp> {
  if (!contatoId) {
    throw new Error(
      'Contato do WhatsApp não informado.'
    )
  }

  if (cliente.origem === 'CRM_PESSOA') {
    const pessoa =
      cliente.registro as CrmPessoa

    const pessoaAtualizada =
      await atualizarPessoa(
        pessoa.id,
        {
          dados: {
            campos_adicionais:
              camposAdicionaisComWhatsApp(
                pessoa.dados
                  ?.campos_adicionais,
                contatoId
              ),
          },
        }
      )

    return {
      tipo: 'PF',
      origem: 'CRM_EXISTENTE',
      pessoa: pessoaAtualizada,
      empresa: null,
    }
  }

  if (cliente.origem === 'CRM_EMPRESA') {
    const empresa =
      cliente.registro as CrmEmpresa

    const empresaAtualizada =
      await atualizarEmpresa(
        empresa.id,
        {
          dados: {
            campos_adicionais:
              camposAdicionaisComWhatsApp(
                empresa.dados
                  ?.campos_adicionais,
                contatoId
              ),
          },
        }
      )

    return {
      tipo: 'PJ',
      origem: 'CRM_EXISTENTE',
      pessoa: null,
      empresa: empresaAtualizada,
    }
  }

  throw new Error(
    'Origem do cliente inválida.'
  )
}

const jsonParaTexto = (
  valor: unknown
): string | null => {
  if (valor === undefined || valor === null) {
    return null
  }

  if (typeof valor === 'string') {
    return valor.trim() || null
  }

  try {
    return JSON.stringify(valor)
  } catch {
    return null
  }
}

export async function buscarHistoricoComercialCliente(
  vinculo: CrmWhatsAppVinculo | null
): Promise<CrmHistoricoComercial> {
  const registro =
    vinculo?.tipo === 'PF'
      ? vinculo.pessoa
      : vinculo?.tipo === 'PJ'
        ? vinculo.empresa
        : null

  if (!registro) {
    return {
      cliente_id_legado: null,
      propostas: [],
      produtos: [],
    }
  }

  const clienteIdLegado =
    registro.cliente_id_legado || null

  /*
   * ==========================================================
   * 1. HISTÓRICO LEGADO
   * ==========================================================
   */

  let queryLegado = supabase
    .from('tab_propostas')
    .select(`
      id,
      numero_proposta,
      cliente_id,
      crm_pessoa_id,
      crm_empresa_id,
      data_emissao,
      data_validade,
      status,
      motivo_perda,
      valor_total_proposta,
      observacoes_fechamento,
      data_venda,
      tipo_negocio,
      parceiro_id,
      tab_proposta_opcoes (
        id,
        proposta_id,
        seguradora_id,
        ordem_opcao,
        valor_total_opcao,
        base_seguradoras (
          id,
          nome
        ),
        tab_proposta_itens (
          id,
          opcao_id,
          produto_id,
          valor_premio,
          valor_liquido,
          data_cotacao,
          parcelamento,
          meio_pagamento,
          coberturas_franquias,
          numero_cotacao,
          numero_apolice,
          data_inicio_vigencia,
          data_fim_vigencia,
          periodicidade,
          data_venda,
          data_renovacao,
          horario_renovacao,
          status_renovacao,
          motivo_cancelamento,
          base_produtos (
            id,
            nome,
            categoria
          )
        )
      )
    `)

  if (vinculo?.tipo === 'PF') {
    queryLegado = clienteIdLegado
      ? queryLegado.or(
          `cliente_id.eq.${clienteIdLegado},crm_pessoa_id.eq.${registro.id}`
        )
      : queryLegado.eq(
          'crm_pessoa_id',
          registro.id
        )
  } else {
    queryLegado = clienteIdLegado
      ? queryLegado.or(
          `cliente_id.eq.${clienteIdLegado},crm_empresa_id.eq.${registro.id}`
        )
      : queryLegado.eq(
          'crm_empresa_id',
          registro.id
        )
  }

  /*
   * ==========================================================
   * 2. PROPOSTAS DO NOVO NÚCLEO
   * ==========================================================
   */

  let queryNovo = supabase
    .from('crm_propostas')
    .select(`
      id,
      numero_proposta,
      crm_pessoa_id,
      crm_empresa_id,
      data_emissao,
      data_validade,
      status,
      motivo_perda,
      valor_total_ofertado,
      valor_total_vendido,
      observacoes,
      data_venda,
      tipo_negocio,
      created_at,
      itens:crm_proposta_itens (
        id,
        proposta_id,
        produto_id,
        seguradora_id,
        valor_premio,
        valor_liquido,
        numero_cotacao,
        parcelamento_cotado,
        meio_pagamento_cotado,
        coberturas_franquias,
        resultado,
        ordem,
        created_at,
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
    `)

  if (vinculo?.tipo === 'PF') {
    queryNovo = queryNovo.eq(
      'crm_pessoa_id',
      registro.id
    )
  } else {
    queryNovo = queryNovo.eq(
      'crm_empresa_id',
      registro.id
    )
  }

  /*
   * As duas bases são independentes e podem ser consultadas
   * em paralelo.
   */
  const [
    resultadoLegado,
    resultadoNovo,
  ] = await Promise.all([
    queryLegado.order(
      'created_at',
      { ascending: false }
    ),
    queryNovo.order(
      'created_at',
      { ascending: false }
    ),
  ])

  if (resultadoLegado.error) {
    console.error(
      'Erro ao buscar histórico comercial legado:',
      resultadoLegado.error
    )

    throw new Error(
      'Não foi possível carregar o histórico comercial legado do cliente.'
    )
  }

  if (resultadoNovo.error) {
    console.error(
      'Erro ao buscar propostas do novo núcleo:',
      resultadoNovo.error
    )

    throw new Error(
      'Não foi possível carregar as propostas comerciais atuais do cliente.'
    )
  }

  /*
   * ==========================================================
   * 3. NORMALIZA LEGADO
   * ==========================================================
   */

  const propostasLegado: CrmHistoricoProposta[] =
    (resultadoLegado.data || []).map(
      (proposta: any) => {
        const opcoes: CrmHistoricoOpcao[] = (
          proposta.tab_proposta_opcoes || []
        ).map((opcao: any) => {
          const seguradora = Array.isArray(
            opcao.base_seguradoras
          )
            ? opcao.base_seguradoras[0]
            : opcao.base_seguradoras

          const produtos: CrmHistoricoProduto[] = (
            opcao.tab_proposta_itens || []
          ).map((item: any) => {
            const produto = Array.isArray(
              item.base_produtos
            )
              ? item.base_produtos[0]
              : item.base_produtos

            return {
              id: item.id,
              proposta_id: proposta.id,
              opcao_id: opcao.id,
              produto_id:
                item.produto_id || null,
              produto_nome:
                produto?.nome ||
                'Produto não identificado',
              produto_categoria:
                produto?.categoria || null,
              seguradora_id:
                opcao.seguradora_id || null,
              seguradora_nome:
                seguradora?.nome || null,
              valor_premio:
                Number(
                  item.valor_premio || 0
                ),
              valor_liquido:
                Number(
                  item.valor_liquido || 0
                ),
              numero_cotacao:
                item.numero_cotacao || null,
              numero_apolice:
                item.numero_apolice || null,
              data_cotacao:
                item.data_cotacao || null,
              data_inicio_vigencia:
                item.data_inicio_vigencia ||
                null,
              data_fim_vigencia:
                item.data_fim_vigencia ||
                null,
              data_venda:
                item.data_venda || null,
              data_renovacao:
                item.data_renovacao || null,
              horario_renovacao:
                item.horario_renovacao ||
                null,
              status_renovacao:
                item.status_renovacao || null,
              periodicidade:
                item.periodicidade || null,
              parcelamento:
                item.parcelamento || null,
              meio_pagamento:
                item.meio_pagamento || null,
              coberturas_franquias:
                item.coberturas_franquias ||
                null,
              motivo_cancelamento:
                item.motivo_cancelamento ||
                null,
            }
          })

          return {
            id: opcao.id,
            proposta_id: proposta.id,
            seguradora_id:
              opcao.seguradora_id || null,
            seguradora_nome:
              seguradora?.nome || null,
            ordem_opcao:
              opcao.ordem_opcao ?? null,
            valor_total_opcao:
              Number(
                opcao.valor_total_opcao || 0
              ),
            produtos,
          }
        })

        return {
          id: proposta.id,
          origem: 'LEGADO',
          numero_proposta:
            proposta.numero_proposta,
          cliente_id:
            proposta.cliente_id || null,
          data_emissao:
            proposta.data_emissao || null,
          data_validade:
            proposta.data_validade || null,
          status:
            proposta.status || null,
          motivo_perda:
            proposta.motivo_perda || null,
          valor_total_proposta:
            Number(
              proposta.valor_total_proposta ||
                0
            ),
          observacoes_fechamento:
            proposta.observacoes_fechamento ||
            null,
          data_venda:
            proposta.data_venda || null,
          tipo_negocio:
            proposta.tipo_negocio || null,
          parceiro_id:
            proposta.parceiro_id || null,
          opcoes,
        }
      }
    )

  /*
   * ==========================================================
   * 4. BUSCA CONTRATOS DO NOVO NÚCLEO
   * ==========================================================
   */

  const idsPropostasNovas = (
    resultadoNovo.data || []
  ).map(
    (proposta: any) =>
      String(proposta.id)
  )

  let contratosNovos: any[] = []

  if (idsPropostasNovas.length > 0) {
    const { data, error } = await supabase
      .from('crm_contratos')
      .select(`
        id,
        proposta_id,
        proposta_item_id,
        numero_apolice,
        inicio_vigencia,
        fim_vigencia,
        data_venda,
        periodicidade,
        status
      `)
      .in(
        'proposta_id',
        idsPropostasNovas
      )

    if (error) {
      console.error(
        'Erro ao buscar contratos do novo núcleo:',
        error
      )

      throw new Error(
        'Não foi possível carregar os contratos comerciais do cliente.'
      )
    }

    contratosNovos = data || []
  }

  const contratosPorItem = new Map<
    string,
    any
  >()

  for (const contrato of contratosNovos) {
    if (contrato.proposta_item_id) {
      contratosPorItem.set(
        contrato.proposta_item_id,
        contrato
      )
    }
  }

  /*
   * ==========================================================
   * 5. NORMALIZA NOVO NÚCLEO PARA O FORMATO DO CONTACT PANEL
   * ==========================================================
   */

  const propostasNovas: CrmHistoricoProposta[] =
    (resultadoNovo.data || []).map(
      (proposta: any) => {
        /*
         * O núcleo novo não possui tab_proposta_opcoes.
         * Cada crm_proposta_item representa uma cotação.
         *
         * Criamos uma "opção histórica" virtual para cada item,
         * apenas para preservar o contrato atual do ContactPanel.
         */
        const opcoes: CrmHistoricoOpcao[] = (
          proposta.itens || []
        )
          .sort(
            (a: any, b: any) =>
              Number(a.ordem || 0) -
              Number(b.ordem || 0)
          )
          .map(
            (
              item: any,
              index: number
            ) => {
              const produto = Array.isArray(
                item.produto
              )
                ? item.produto[0]
                : item.produto

              const seguradora =
                Array.isArray(
                  item.seguradora
                )
                  ? item.seguradora[0]
                  : item.seguradora

              const contrato =
                contratosPorItem.get(
                  item.id
                )

              const produtoHistorico: CrmHistoricoProduto =
                {
                  id: item.id,
                  proposta_id:
                    proposta.id,
                  opcao_id:
                    `crm-${item.id}`,
                  produto_id:
                    item.produto_id ||
                    null,
                  produto_nome:
                    produto?.nome ||
                    'Produto não identificado',
                  produto_categoria:
                    produto?.categoria ||
                    null,
                  seguradora_id:
                    item.seguradora_id ||
                    null,
                  seguradora_nome:
                    seguradora?.nome ||
                    null,
                  valor_premio:
                    Number(
                      item.valor_premio ||
                        0
                    ),
                  valor_liquido:
                    Number(
                      item.valor_liquido ||
                        0
                    ),
                  numero_cotacao:
                    item.numero_cotacao ||
                    null,
                  numero_apolice:
                    contrato
                      ?.numero_apolice ||
                    null,
                  data_cotacao:
                    item.created_at
                      ? String(
                          item.created_at
                        ).slice(0, 10)
                      : proposta
                          .data_emissao ||
                        null,
                  data_inicio_vigencia:
                    contrato
                      ?.inicio_vigencia ||
                    null,
                  data_fim_vigencia:
                    contrato
                      ?.fim_vigencia ||
                    null,
                  data_venda:
                    contrato?.data_venda ||
                    proposta.data_venda ||
                    null,
                  data_renovacao:
                    null,
                  horario_renovacao:
                    null,
                  status_renovacao:
                    null,
                  periodicidade:
                    contrato
                      ?.periodicidade ||
                    null,
                  parcelamento:
                    item.parcelamento_cotado ||
                    null,
                  meio_pagamento:
                    item.meio_pagamento_cotado ||
                    null,
                  coberturas_franquias:
                    jsonParaTexto(
                      item.coberturas_franquias
                    ),
                  motivo_cancelamento:
                    null,
                }

              return {
                id: `crm-${item.id}`,
                proposta_id:
                  proposta.id,
                seguradora_id:
                  item.seguradora_id ||
                  null,
                seguradora_nome:
                  seguradora?.nome ||
                  null,
                ordem_opcao:
                  index + 1,
                valor_total_opcao:
                  Number(
                    item.valor_premio ||
                      0
                  ),
                produtos: [
                  produtoHistorico,
                ],
              }
            }
          )

        const valorOfertado =
          Number(
            proposta.valor_total_ofertado ||
              0
          )

        const valorVendido =
          Number(
            proposta.valor_total_vendido ||
              0
          )

        return {
          id: proposta.id,
          origem: 'NOVO_CRM',
          numero_proposta:
            proposta.numero_proposta,
          cliente_id: null,
          data_emissao:
            proposta.data_emissao ||
            null,
          data_validade:
            proposta.data_validade ||
            null,
          status:
            proposta.status || null,
          motivo_perda:
            proposta.motivo_perda ||
            null,
          valor_total_proposta:
            valorVendido > 0
              ? valorVendido
              : valorOfertado,
          observacoes_fechamento:
            proposta.observacoes ||
            null,
          data_venda:
            proposta.data_venda ||
            null,
          tipo_negocio:
            proposta.tipo_negocio ||
            null,
          parceiro_id: null,
          opcoes,
        }
      }
    )

  /*
   * ==========================================================
   * 6. HISTÓRICO ÚNICO
   * ==========================================================
   */

  const propostas = [
    ...propostasNovas,
    ...propostasLegado,
  ].sort((a, b) => {
    const dataA =
      a.data_emissao ||
      a.data_venda ||
      ''

    const dataB =
      b.data_emissao ||
      b.data_venda ||
      ''

    return dataB.localeCompare(
      dataA
    )
  })

  const produtos =
    propostas.flatMap(
      proposta =>
        proposta.opcoes.flatMap(
          opcao =>
            opcao.produtos
        )
    )

  return {
    cliente_id_legado:
      clienteIdLegado,
    propostas,
    produtos,
  }
}

export function subscribeResumoClientesWhatsApp(
  corretoraId: string,
  onChange: () => void
) {
  const channel = supabase
    .channel(`crm-whatsapp-resumo-${corretoraId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'crm_pessoas',
        filter: `corretora_id=eq.${corretoraId}`,
      },
      () => onChange()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'crm_empresas',
        filter: `corretora_id=eq.${corretoraId}`,
      },
      () => onChange()
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}