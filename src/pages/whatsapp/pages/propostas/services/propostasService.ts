import { supabase } from '../../../../../lib/supabaseClient';
import type {
  AtualizarPropostaItemPayload,
  AtualizarPropostaPayload,
  ContratoResumo,
  CriarPropostaItemPayload,
  CriarPropostaPayload,
  FecharPropostaPayload,
  FiltrosPropostas,
  Proposta,
  PropostaClienteResumo,
  PropostaDetalhada,
  PropostaItem,
  PropostaListaItem,
  ResultadoFechamentoProposta,
  ResultadoListaPropostas,
  TipoClienteProposta,
  IniciarRenovacaoContratoPayload,
  ResultadoInicioRenovacao,
  ProdutoRenovacaoOrigem,
  ExecutarAcaoPropostaPayload,
  ResultadoAcaoProposta,
  PropostaFiltroCorretor,
  PropostaFiltroProduto,
} from '../types/propostas';

import type { EmitirContratoPayload } from '../types/propostas';

type UsuarioPerfilMinimo = {
  id: string;
  nome: string | null;
  tipo_usuario: 'CORRETORA' | 'CORRETOR' | 'ADMIN';
  corretora_id: string;
};

type PropostaRow = Proposta & {
  corretor?:
    | {
        id: string;
        nome: string | null;
      }
    | {
        id: string;
        nome: string | null;
      }[]
    | null;

  pessoa?:
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null;

  empresa?:
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null;

  itens?: PropostaItem[] | null;
};

type ContratoListaRow = Pick<
  ContratoResumo,
  | 'proposta_id'
  | 'inicio_vigencia'
  | 'fim_vigencia'
>;

/**
 * Verificação preventiva no cliente. A autorização definitiva deve existir
 * nas policies RLS e nas RPCs executadas pelo Supabase.
 * Não consultar a tabela de permissões diretamente para decidir acesso:
 * a RPC usa auth.uid() e o tenant da sessão autenticada.
 */
type AcaoPermissaoProposta =
  | 'create' | 'read' | 'update' | 'delete' | 'lose'
  | 'reverse' | 'close' | 'issue' | 'financial'
  | 'commissions' | 'renew';
type EscopoProposta = 'none' | 'own' | 'tenant';

async function escopoProposta(
  perfil: UsuarioPerfilMinimo,
  acao: AcaoPermissaoProposta,
): Promise<EscopoProposta> {
  if (perfil.tipo_usuario === 'CORRETORA' || perfil.tipo_usuario === 'ADMIN') {
    return 'tenant';
  }
  const { data, error } = await supabase.rpc('crm_escopo_permissao', {
    p_recurso: 'operacoes.propostas',
    p_acao: acao,
  });
  if (error) throw error;
  return data === 'own' || data === 'tenant' ? data : 'none';
}

async function exigirPermissaoProposta(
  perfil: UsuarioPerfilMinimo,
  acao: AcaoPermissaoProposta,
  corretorResponsavelId?: string | null,
): Promise<EscopoProposta> {
  const escopo = await escopoProposta(perfil, acao);
  if (escopo === 'none') {
    throw new Error(`Sem permissão para ${acao} em Propostas.`);
  }
  if (escopo === 'own' && corretorResponsavelId !== undefined &&
      corretorResponsavelId !== perfil.id) {
    throw new Error('Esta operação está restrita às próprias propostas.');
  }
  return escopo;
}

async function obterPropostaAutorizada(
  perfil: UsuarioPerfilMinimo,
  propostaId: string,
  acao: AcaoPermissaoProposta,
): Promise<{ id: string; corretor_id: string; status: string; tipo_negocio: string }> {
  const corretoraId = obterCorretoraId(perfil);
  const { data, error } = await supabase
    .from('crm_propostas')
    .select('id, corretor_id, status, tipo_negocio')
    .eq('id', propostaId)
    .eq('corretora_id', corretoraId)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Proposta não encontrada.');
  await exigirPermissaoProposta(perfil, acao, data.corretor_id);
  return data;
}

async function obterPropostaDoItemAutorizada(
  perfil: UsuarioPerfilMinimo,
  itemId: string,
  acao: 'update',
): Promise<{ item_id: string; proposta_id: string }> {
  const { data, error } = await supabase.from('crm_proposta_itens')
    .select('id, proposta_id')
    .eq('id', itemId)
    .eq('corretora_id', obterCorretoraId(perfil))
    .single();
  if (error) throw error;
  if (!data) throw new Error('Item não encontrado.');
  await obterPropostaAutorizada(perfil, data.proposta_id, acao);
  return { item_id: data.id, proposta_id: data.proposta_id };
}

function normalizarRelacao<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function numero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const resultado = valor.trim();
  return resultado || null;
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return valor as Record<string, unknown>;
}

function primeiroTexto(
  dados: Record<string, unknown>,
  campos: string[],
): string | null {
  for (const campo of campos) {
    const valor = texto(dados[campo]);
    if (valor) return valor;
  }
  return null;
}

function mapearClienteDaProposta(
  row: PropostaRow,
): PropostaClienteResumo | null {
  const pessoa = normalizarRelacao(row.pessoa);
  const empresa = normalizarRelacao(row.empresa);

  if (pessoa) {
    const dados = objeto(pessoa.dados);

    return {
        id: String(pessoa.id),
        tipo: 'PF',
        origem: 'CRM_PESSOA',
        nome:
            primeiroTexto(dados, ['nome', 'nome_completo', 'nome_razao_social']) ??
            'Pessoa sem nome',
        documento: texto(pessoa.cpf),
        corretora_id: String(pessoa.corretora_id),
        corretor_id: String(pessoa.corretor_id),
        telefone: primeiroTexto(dados, ['telefone', 'celular', 'whatsapp']),
        email: primeiroTexto(dados, ['email']),
        municipio:
            primeiroTexto(objeto(dados.endereco), ['municipio', 'cidade']) ??
            primeiroTexto(dados, ['municipio', 'cidade']),
        uf:
            primeiroTexto(objeto(dados.endereco), ['uf', 'estado']) ??
            primeiroTexto(dados, ['uf', 'estado']),
        cliente_id_legado: texto(pessoa.cliente_id_legado),
        };
  }

  if (empresa) {
    const dados = objeto(empresa.dados);

    return {
    id: String(empresa.id),
    tipo: 'PJ',
    origem: 'CRM_EMPRESA',
    nome:
        primeiroTexto(dados, [
        'nome_fantasia',
        'razao_social',
        'nome',
        'nome_razao_social',
        ]) ?? 'Empresa sem nome',
    documento: texto(empresa.cnpj),
    corretora_id: String(empresa.corretora_id),
    corretor_id: String(empresa.corretor_id),
    telefone: primeiroTexto(dados, ['telefone', 'celular', 'whatsapp']),
    email: primeiroTexto(dados, ['email']),
    municipio:
        primeiroTexto(objeto(dados.endereco), ['municipio', 'cidade']) ??
        primeiroTexto(dados, ['municipio', 'cidade']),
    uf:
        primeiroTexto(objeto(dados.endereco), ['uf', 'estado']) ??
        primeiroTexto(dados, ['uf', 'estado']),
    cliente_id_legado: texto(empresa.cliente_id_legado),
    };
  }

  return null;
}

function normalizarProposta(row: PropostaRow): Proposta {
  return {
    ...row,
    valor_total_ofertado: numero(row.valor_total_ofertado),
    valor_total_vendido: numero(row.valor_total_vendido),
  };
}

function normalizarItem(item: PropostaItem): PropostaItem {
  return {
    ...item,
    valor_premio: numero(item.valor_premio),
    valor_liquido:
      item.valor_liquido === null ? null : numero(item.valor_liquido),
  };
}

async function buscarPerfilAtual(): Promise<UsuarioPerfilMinimo> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('Usuário não autenticado.');

  const { data, error } = await supabase
    .from('usuarios_perfis')
    .select('id,nome,tipo_usuario,corretora_id')
    .eq('id', user.id)
    .eq('ativo', true)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Perfil do usuário não encontrado.');

  return data as UsuarioPerfilMinimo;
}

function obterCorretoraId(perfil: UsuarioPerfilMinimo): string {
  return perfil.tipo_usuario === 'CORRETORA'
    ? perfil.id
    : perfil.corretora_id;
}

export async function listarCorretoresFiltroPropostas(): Promise<
  PropostaFiltroCorretor[]
> {
  const perfil =
    await buscarPerfilAtual();

  const corretoraId = obterCorretoraId(perfil);
  const escopo = await exigirPermissaoProposta(perfil, 'read');

  if (escopo === 'own') {
    return [
      {
        id: perfil.id,
        nome:
          perfil.nome?.trim() ||
          'Corretor',
      },
    ];
  }

  const { data, error } =
    await supabase
      .from('usuarios_perfis')
      .select(`
        id,
        nome,
        tipo_usuario,
        corretora_id
      `)
      .eq('ativo', true)
      .in(
        'tipo_usuario',
        [
          'CORRETORA',
          'CORRETOR',
        ],
      )
      .or(
        `id.eq.${corretoraId},corretora_id.eq.${corretoraId}`,
      )
      .order(
        'nome',
        {
          ascending: true,
        },
      );

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    usuario => ({
      id: usuario.id,
      nome:
        usuario.nome?.trim() ||
        'Sem nome',
    }),
  );
}


export async function listarProdutosFiltroPropostas(): Promise<
  PropostaFiltroProduto[]
> {
  const perfil =
    await buscarPerfilAtual();

  const corretoraId = obterCorretoraId(perfil);
  await exigirPermissaoProposta(perfil, 'read');

  /*
   * Buscamos somente produtos que
   * efetivamente aparecem em propostas
   * desta corretora.
   */
  const { data, error } =
    await supabase
      .from('crm_proposta_itens')
      .select(`
        produto_id,
        produto:base_produtos(
          id,
          nome,
          categoria
        )
      `)
      .eq(
        'corretora_id',
        corretoraId,
      );

  if (error) {
    throw error;
  }

  const produtos =
    new Map<
      string,
      PropostaFiltroProduto
    >();

  for (
    const item of
    data ?? []
  ) {
    const produto =
      normalizarRelacao(
        (item as any).produto,
      );

    if (
      !produto?.id
    ) {
      continue;
    }

    produtos.set(
      produto.id,
      {
        id:
          String(
            produto.id,
          ),

        nome:
          texto(
            produto.nome,
          ) ||
          'Produto sem nome',

        categoria:
          texto(
            produto.categoria,
          ),
      },
    );
  }

  return Array.from(
    produtos.values(),
  ).sort(
    (a, b) =>
      a.nome.localeCompare(
        b.nome,
        'pt-BR',
      ),
  );
}

export async function listarPropostas(
  filtros: FiltrosPropostas = {},
): Promise<ResultadoListaPropostas> {
  const perfil =
    await buscarPerfilAtual();

  const corretoraId = obterCorretoraId(perfil);
  const escopoLeitura = await exigirPermissaoProposta(perfil, 'read');

  const pagina =
    Math.max(
      1,
      filtros.pagina ?? 1,
    );

  const porPagina =
    Math.min(
      100,
      Math.max(
        1,
        filtros.por_pagina ?? 20,
      ),
    );

  const inicio =
    (pagina - 1) *
    porPagina;

  const fim =
    inicio +
    porPagina -
    1;

  const busca =
    filtros.busca
      ?.trim()
      .toLocaleLowerCase(
        'pt-BR',
      ) ?? '';

  const statusSelecionados =
    filtros.status ?? [];

  const tiposNegocioSelecionados =
    filtros.tipo_negocio ?? [];

  const corretoresSelecionados =
    filtros.corretor_ids ?? [];

  const produtosSelecionados =
    filtros.produto_ids ?? [];


  /*
   * ============================================================
   * FILTROS RELACIONAIS
   * ============================================================
   *
   * Produto pertence a:
   * crm_proposta_itens
   *
   * Vigência pertence a:
   * crm_contratos
   *
   * Antes de consultar crm_propostas,
   * identificamos os IDs compatíveis.
   *
   * Quando produto + vigência são
   * utilizados juntos, fazemos a
   * interseção entre as propostas.
   */

  const intersectarIds = (
    atuais:
      | Set<string>
      | null,
    novos:
      string[],
  ): Set<string> => {
    const novoSet =
      new Set(novos);

    if (
      atuais === null
    ) {
      return novoSet;
    }

    return new Set(
      Array.from(
        atuais,
      ).filter(
        id =>
          novoSet.has(id),
      ),
    );
  };


  let propostaIdsRelacionados:
    | Set<string>
    | null =
    null;


  /*
   * ============================================================
   * PRODUTOS
   * ============================================================
   *
   * Vários produtos selecionados
   * funcionam como OU:
   *
   * Produto A OU Produto B.
   */

  if (
    produtosSelecionados.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('crm_proposta_itens')
      .select('proposta_id')
      .eq(
        'corretora_id',
        corretoraId,
      )
      .in(
        'produto_id',
        produtosSelecionados,
      );

    if (error) {
      throw error;
    }

    const ids =
      Array.from(
        new Set(
          (data ?? [])
            .map(
              item =>
                item.proposta_id,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    propostaIdsRelacionados =
      intersectarIds(
        propostaIdsRelacionados,
        ids,
      );
  }


  /*
   * ============================================================
   * VIGÊNCIA
   * ============================================================
   *
   * A proposta entra no resultado se
   * possuir pelo menos um contrato cuja
   * vigência intersecte o período
   * selecionado.
   *
   * Exemplo:
   *
   * filtro 01/01 -> 31/01
   *
   * contrato 15/12 -> 15/01
   *
   * entra no resultado porque existe
   * sobreposição.
   */

  if (
  filtros.vigencia_inicio ||
  filtros.vigencia_fim
) {
  let queryContratos =
    supabase
      .from('crm_contratos')
      .select('proposta_id')
      .eq(
        'corretora_id',
        corretoraId,
      );

  /*
   * Filtro de renovação:
   * procura contratos pelo FIM da vigência.
   *
   * Exemplo:
   * 01/01/2027 até 31/01/2027
   *
   * retorna contratos cujo
   * fim_vigencia esteja dentro desse período.
   */

  if (
    filtros.vigencia_inicio
  ) {
    queryContratos =
      queryContratos.gte(
        'fim_vigencia',
        filtros.vigencia_inicio,
      );
  }

  if (
    filtros.vigencia_fim
  ) {
    queryContratos =
      queryContratos.lte(
        'fim_vigencia',
        filtros.vigencia_fim,
      );
  }

  const {
    data,
    error,
  } =
    await queryContratos;

  if (error) {
    throw error;
  }

  const ids =
    Array.from(
      new Set(
        (data ?? [])
          .map(
            contrato =>
              contrato.proposta_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    );

  propostaIdsRelacionados =
    intersectarIds(
      propostaIdsRelacionados,
      ids,
    );
}


  /*
   * Se algum filtro relacional foi
   * utilizado mas não encontrou nenhuma
   * proposta, já podemos encerrar.
   */

  if (
    propostaIdsRelacionados !==
      null &&
    propostaIdsRelacionados
      .size === 0
  ) {
    return {
      dados: [],
      total: 0,
      pagina,
      por_pagina: porPagina,
      total_paginas: 1,
    };
  }


  /*
   * ============================================================
   * QUERY BASE DE PROPOSTAS
   * ============================================================
   */

  const criarQuery = () => {
    let query =
      supabase
        .from('crm_propostas')
        .select(
          `
            *,
            corretor:usuarios_perfis!crm_propostas_corretor_id_fkey(
              id,
              nome
            ),
            pessoa:crm_pessoas!crm_propostas_crm_pessoa_id_fkey(
              id,
              corretora_id,
              corretor_id,
              cpf,
              dados,
              cliente_id_legado
            ),
            empresa:crm_empresas!crm_propostas_crm_empresa_id_fkey(
              id,
              corretora_id,
              corretor_id,
              cnpj,
              dados,
              cliente_id_legado
            ),
            itens:crm_proposta_itens(
              id,
              proposta_id,
              corretora_id,
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
              updated_at,
              produto:base_produtos(
                id,
                nome,
                categoria,
                descricao
              )
            )
          `,
          {
            count: 'exact',
          },
        )
        .eq(
          'corretora_id',
          corretoraId,
        )
        .order(
          'created_at',
          {
            ascending: false,
          },
        );


    /* Escopo own é obrigatório, independentemente dos filtros da tela. */
    if (escopoLeitura === 'own') {
      query =
        query.eq(
          'corretor_id',
          perfil.id,
        );
    }

    /*
     * Para CORRETORA:
     * vários corretores selecionados.
     */
    else if (
      corretoresSelecionados.length >
      0
    ) {
      query =
        query.in(
          'corretor_id',
          corretoresSelecionados,
        );
    }


    /*
     * Vários status selecionados.
     */
    if (
      statusSelecionados.length >
      0
    ) {
      query =
        query.in(
          'status',
          statusSelecionados,
        );
    }


    /*
     * Vários tipos de negócio.
     */
    if (
      tiposNegocioSelecionados.length >
      0
    ) {
      query =
        query.in(
          'tipo_negocio',
          tiposNegocioSelecionados,
        );
    }


    /*
     * Data efetiva da venda.
     *
     * Substitui completamente o antigo
     * filtro por data_emissao.
     */
    if (
      filtros.data_venda_inicio
    ) {
      query =
        query.gte(
          'data_venda',
          filtros.data_venda_inicio,
        );
    }

    if (
      filtros.data_venda_fim
    ) {
      query =
        query.lte(
          'data_venda',
          filtros.data_venda_fim,
        );
    }


    /*
     * Cliente específico.
     */
    if (
      filtros.cliente_id
    ) {
      query =
        query.or(
          `crm_pessoa_id.eq.${filtros.cliente_id},crm_empresa_id.eq.${filtros.cliente_id}`,
        );
    }


    /*
     * Resultado dos filtros relacionais
     * de produto / vigência.
     */
    if (
      propostaIdsRelacionados !==
      null
    ) {
      query =
        query.in(
          'id',
          Array.from(
            propostaIdsRelacionados,
          ),
        );
    }

    return query;
  };


  /*
   * ============================================================
   * MAPA DE CONTRATOS
   * ============================================================
   *
   * Mantém a lógica atual da listagem:
   *
   * menor início de vigência;
   * maior fim de vigência.
   */

  const buscarContratosPorProposta =
    async (
      rows: PropostaRow[],
    ): Promise<
      Map<
        string,
        ContratoListaRow[]
      >
    > => {
      const mapa =
        new Map<
          string,
          ContratoListaRow[]
        >();

      const propostaIds =
        Array.from(
          new Set(
            rows
              .map(
                row =>
                  row.id,
              )
              .filter(Boolean),
          ),
        );

      if (
        propostaIds.length ===
        0
      ) {
        return mapa;
      }

      const {
        data,
        error,
      } = await supabase
        .from('crm_contratos')
        .select(`
          proposta_id,
          inicio_vigencia,
          fim_vigencia
        `)
        .eq(
          'corretora_id',
          corretoraId,
        )
        .in(
          'proposta_id',
          propostaIds,
        );

      if (error) {
        throw error;
      }

      for (
        const contrato of
        (data ??
          []) as ContratoListaRow[]
      ) {
        if (
          !contrato.proposta_id
        ) {
          continue;
        }

        const atuais =
          mapa.get(
            contrato.proposta_id,
          ) ?? [];

        atuais.push(
          contrato,
        );

        mapa.set(
          contrato.proposta_id,
          atuais,
        );
      }

      return mapa;
    };


  /*
   * ============================================================
   * NORMALIZAÇÃO DA LISTA
   * ============================================================
   */

  const mapearPropostas =
    async (
      rows: PropostaRow[],
    ): Promise<
      PropostaListaItem[]
    > => {
      if (
        rows.length === 0
      ) {
        return [];
      }

      const contratosPorProposta =
        await buscarContratosPorProposta(
          rows,
        );

      return rows.map(
        (
          row,
        ): PropostaListaItem => {
          const proposta =
            normalizarProposta(
              row,
            );

          const cliente =
            mapearClienteDaProposta(
              row,
            );

          const corretor =
            normalizarRelacao(
              row.corretor,
            );


          /*
           * Produtos sem repetição.
           */
          const produtos =
            Array.from(
              new Set(
                (
                  Array.isArray(
                    row.itens,
                  )
                    ? row.itens
                    : []
                )
                  .map(
                    item => {
                      const produto =
                        normalizarRelacao(
                          item.produto,
                        );

                      const nome =
                        produto
                          ?.nome
                          ?.trim();

                      return (
                        nome ||
                        ''
                      );
                    },
                  )
                  .filter(
                    (
                      nome,
                    ): nome is string =>
                      Boolean(
                        nome,
                      ),
                  ),
              ),
            );


          const contratos =
            contratosPorProposta.get(
              row.id,
            ) ?? [];


          const inicios =
            contratos
              .map(
                contrato =>
                  contrato
                    .inicio_vigencia,
              )
              .filter(
                (
                  valor,
                ): valor is string =>
                  Boolean(
                    valor,
                  ),
              )
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.localeCompare(
                    b,
                  ),
              );


          const fins =
            contratos
              .map(
                contrato =>
                  contrato
                    .fim_vigencia,
              )
              .filter(
                (
                  valor,
                ): valor is string =>
                  Boolean(
                    valor,
                  ),
              )
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.localeCompare(
                    b,
                  ),
              );


          return {
            ...proposta,

            cliente_nome:
              cliente?.nome ??
              'Cliente não identificado',

            cliente_documento:
              cliente
                ?.documento ??
              null,

            cliente_tipo: (
              cliente?.tipo ??
              'PF'
            ) as TipoClienteProposta,

            corretor_nome:
              corretor?.nome ??
              null,

            quantidade_itens:
              Array.isArray(
                row.itens,
              )
                ? row.itens
                    .length
                : 0,

            produtos,

            vigencia_inicio:
              inicios[0] ??
              null,

            vigencia_fim:
              fins.length >
              0
                ? fins[
                    fins.length -
                      1
                  ]
                : null,
          };
        },
      );
    };


  /*
   * ============================================================
   * SEM BUSCA GLOBAL
   * ============================================================
   */

  if (!busca) {
    const {
      data,
      error,
      count,
    } =
      await criarQuery()
        .range(
          inicio,
          fim,
        );

    if (error) {
      throw error;
    }

    const rows =
      (data ??
        []) as unknown as PropostaRow[];

    const propostas =
      await mapearPropostas(
        rows,
      );

    const total =
      count ??
      propostas.length;

    return {
      dados:
        propostas,

      total,

      pagina,

      por_pagina:
        porPagina,

      total_paginas:
        Math.max(
          1,
          Math.ceil(
            total /
              porPagina,
          ),
        ),
    };
  }


  /*
   * ============================================================
   * COM BUSCA GLOBAL
   * ============================================================
   *
   * Mantemos a estratégia já utilizada:
   *
   * busca todos os registros que passaram
   * pelos filtros estruturados;
   *
   * depois aplica:
   *
   * - número proposta
   * - cliente
   * - CPF
   * - CNPJ
   */

  const todasRows:
    PropostaRow[] =
    [];

  const tamanhoLote =
    1000;

  let offset =
    0;

  while (true) {
    const {
      data,
      error,
    } =
      await criarQuery()
        .range(
          offset,
          offset +
            tamanhoLote -
            1,
        );

    if (error) {
      throw error;
    }

    const lote =
      (data ??
        []) as unknown as PropostaRow[];

    todasRows.push(
      ...lote,
    );

    if (
      lote.length <
      tamanhoLote
    ) {
      break;
    }

    offset +=
      tamanhoLote;
  }


  const buscaNumerica =
    busca.replace(
      /\D/g,
      '',
    );


  const rowsFiltradas =
    todasRows.filter(
      row => {
        const cliente =
          mapearClienteDaProposta(
            row,
          );

        const numeroProposta =
          row.numero_proposta
            ?.toLocaleLowerCase(
              'pt-BR',
            ) ?? '';

        const clienteNome =
          cliente?.nome
            ?.toLocaleLowerCase(
              'pt-BR',
            ) ?? '';

        const documento =
          (
            cliente?.documento ??
            ''
          ).replace(
            /\D/g,
            '',
          );

        return (
          numeroProposta.includes(
            busca,
          ) ||
          clienteNome.includes(
            busca,
          ) ||
          (
            !!buscaNumerica &&
            documento.includes(
              buscaNumerica,
            )
          )
        );
      },
    );


  const total =
    rowsFiltradas.length;


  const rowsPaginadas =
    rowsFiltradas.slice(
      inicio,
      inicio +
        porPagina,
    );


  const propostasPaginadas =
    await mapearPropostas(
      rowsPaginadas,
    );


  return {
    dados:
      propostasPaginadas,

    total,

    pagina,

    por_pagina:
      porPagina,

    total_paginas:
      Math.max(
        1,
        Math.ceil(
          total /
            porPagina,
        ),
      ),
  };
}

async function buscarPropostaPorIdInterna(
  propostaId: string,
): Promise<PropostaDetalhada> {
  const { data, error } = await supabase
    .from('crm_propostas')
    .select(`
      *,
      corretor:usuarios_perfis!crm_propostas_corretor_id_fkey(
        id,
        nome
      ),
      pessoa:crm_pessoas!crm_propostas_crm_pessoa_id_fkey(
        id,
        corretora_id,
        corretor_id,
        cpf,
        dados
      ),
      empresa:crm_empresas!crm_propostas_crm_empresa_id_fkey(
        id,
        corretora_id,
        corretor_id,
        cnpj,
        dados
      ),
      itens:crm_proposta_itens(
        *,
        produto:base_produtos(
          id,
          nome,
          categoria,
          descricao
        ),
        seguradora:base_seguradoras(
          id,
          nome,
          cnpj,
          site,
          logo_url
        )
      )
    `)
    .eq('id', propostaId)
    .single();

  if (error) throw error;

  const row = data as unknown as PropostaRow;
  const proposta = normalizarProposta(row);
  const cliente = mapearClienteDaProposta(row);
  const corretor = normalizarRelacao(row.corretor);

  const { data: contratosData, error: contratosError } = await supabase
    .from('crm_contratos')
    .select('*')
    .eq('proposta_id', propostaId)
    .order('created_at', { ascending: true });

  if (contratosError) throw contratosError;

  return {
    ...proposta,
    cliente,
    corretor_nome: corretor?.nome ?? null,
    itens: ((row.itens ?? []) as PropostaItem[])
      .map(normalizarItem)
      .sort((a, b) => a.ordem - b.ordem),
    contratos: ((contratosData ?? []) as ContratoResumo[]).map((contrato) => ({
      ...contrato,
      valor_aceito: numero(contrato.valor_aceito),
      valor_atual: numero(contrato.valor_atual),
    })),
  };
}

// Inserção compartilhada: a renovação exige "renew", não "create".
// A função é privada e somente é chamada após validação da ação.
async function inserirPropostaAutorizada(
  payload: CriarPropostaPayload,
  perfil: UsuarioPerfilMinimo,
  corretoraId: string,
): Promise<Proposta> {
  const { data, error } = await supabase
    .from('crm_propostas')
    .insert({
      corretora_id: corretoraId,
      corretor_id: payload.corretor_id,
      crm_pessoa_id: payload.crm_pessoa_id ?? null,
      crm_empresa_id: payload.crm_empresa_id ?? null,
      tipo_negocio: payload.tipo_negocio ?? 'NOVO',
      status: 'EM_NEGOCIACAO',
      data_emissao:
        payload.data_emissao ?? new Date().toISOString().slice(0, 10),
      data_validade: payload.data_validade ?? null,
      observacoes: payload.observacoes?.trim() || null,
      contrato_origem_renovacao_id:
        payload.contrato_origem_renovacao_id ?? null,
      criado_por_id: perfil.id,
      atualizado_por_id: perfil.id,
    })
    .select('*')
    .single();

  if (error) throw error;

  return normalizarProposta(data as PropostaRow);
}

export async function buscarPropostaPorId(
  propostaId: string,
): Promise<PropostaDetalhada> {
  const perfil = await buscarPerfilAtual();
  await obterPropostaAutorizada(perfil, propostaId, 'read');
  return buscarPropostaPorIdInterna(propostaId);
}

export async function criarProposta(
  payload: CriarPropostaPayload,
): Promise<Proposta> {
  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);
  await exigirPermissaoProposta(perfil, 'create', payload.corretor_id);

  if (!!payload.crm_pessoa_id === !!payload.crm_empresa_id) {
    throw new Error('Informe uma pessoa ou uma empresa para a proposta.');
  }

  if (
    perfil.tipo_usuario === 'CORRETOR' &&
    payload.corretor_id !== perfil.id
  ) {
    throw new Error('Corretor não pode criar proposta para outro responsável.');
  }

  return inserirPropostaAutorizada(payload, perfil, corretoraId);
}

export async function atualizarProposta(
  propostaId: string,
  payload: AtualizarPropostaPayload,
): Promise<Proposta> {
  const perfil = await buscarPerfilAtual();
  await obterPropostaAutorizada(perfil, propostaId, 'update');

  const alteracoes: Record<string, unknown> = {
    atualizado_por_id: perfil.id,
  };

  if (payload.corretor_id !== undefined) {
    if (
      perfil.tipo_usuario === 'CORRETOR' &&
      payload.corretor_id !== perfil.id
    ) {
      throw new Error('Corretor não pode transferir proposta para outro responsável.');
    }

    alteracoes.corretor_id = payload.corretor_id;
  }

  if (payload.data_emissao !== undefined) {
    // Não ampliar a edição de emissão para negócios novos.
    const corretoraId = obterCorretoraId(perfil);
    const { data: propostaAtual, error: consultaError } = await supabase
      .from('crm_propostas')
      .select('id, tipo_negocio, status, corretora_id')
      .eq('id', propostaId)
      .eq('corretora_id', corretoraId)
      .single();

    if (consultaError) throw consultaError;
    if (propostaAtual.tipo_negocio !== 'RENOVACAO' ||
        propostaAtual.status !== 'EM_NEGOCIACAO') {
      throw new Error('A emissão só pode ser editada em renovações em negociação.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.data_emissao)) {
      throw new Error('Informe uma data de emissão válida.');
    }
    alteracoes.data_emissao = payload.data_emissao;
  }

  if (payload.data_validade !== undefined) {
    alteracoes.data_validade = payload.data_validade;
  }

  if (payload.observacoes !== undefined) {
    alteracoes.observacoes = payload.observacoes?.trim() || null;
  }

  const { data, error } = await supabase
    .from('crm_propostas')
    .update(alteracoes)
    .eq('id', propostaId)
    .eq('status', 'EM_NEGOCIACAO')
    .select('*')
    .single();

  if (error) throw error;

  return normalizarProposta(data as PropostaRow);
}

async function validarProdutoItemProposta(
  propostaId: string,
  produtoId: string,
): Promise<void> {
  if (!propostaId) {
    throw new Error(
      'Proposta não informada para validação do produto.',
    );
  }

  if (!produtoId) {
    throw new Error(
      'Produto não informado para a proposta.',
    );
  }

  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  const { data: proposta, error: propostaError } =
    await supabase
      .from('crm_propostas')
      .select(`
        id,
        corretora_id,
        tipo_negocio,
        status,
        contrato_origem_renovacao_id
      `)
      .eq('id', propostaId)
      .eq('corretora_id', corretoraId)
      .single();

  if (propostaError) throw propostaError;

  if (!proposta) {
    throw new Error('Proposta não encontrada.');
  }

  if (proposta.status !== 'EM_NEGOCIACAO') {
    throw new Error(
      'Somente propostas em negociação podem ter produtos alterados.',
    );
  }

  if (proposta.tipo_negocio !== 'RENOVACAO') {
    return;
  }

  if (!proposta.contrato_origem_renovacao_id) {
    throw new Error(
      'Proposta de renovação não possui contrato de origem.',
    );
  }

  const { data: contrato, error: contratoError } =
    await supabase
      .from('crm_contratos')
      .select(`
        id,
        corretora_id,
        produto_id
      `)
      .eq(
        'id',
        proposta.contrato_origem_renovacao_id,
      )
      .eq('corretora_id', corretoraId)
      .single();

  if (contratoError) throw contratoError;

  if (!contrato) {
    throw new Error(
      'Contrato de origem da renovação não encontrado.',
    );
  }

  if (!contrato.produto_id) {
    throw new Error(
      'Contrato de origem não possui produto vinculado.',
    );
  }

  if (contrato.produto_id !== produtoId) {
    throw new Error(
      'O produto da renovação deve ser o mesmo produto do contrato de origem.',
    );
  }
}

export async function adicionarItemProposta(
  payload: CriarPropostaItemPayload,
): Promise<PropostaItem> {
  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);
  await obterPropostaAutorizada(perfil, payload.proposta_id, 'update');

  if (payload.valor_premio < 0) {
    throw new Error(
      'Valor do prêmio não pode ser negativo.',
    );
  }

  await validarProdutoItemProposta(
    payload.proposta_id,
    payload.produto_id,
  );

  const { data, error } = await supabase
    .from('crm_proposta_itens')
    .insert({
      corretora_id: corretoraId,
      proposta_id: payload.proposta_id,
      produto_id: payload.produto_id,
      seguradora_id: payload.seguradora_id,
      valor_premio: payload.valor_premio,
      valor_liquido: payload.valor_liquido ?? null,
      numero_cotacao: payload.numero_cotacao?.trim() || null,
      parcelamento_cotado: payload.parcelamento_cotado?.trim() || null,
      meio_pagamento_cotado: payload.meio_pagamento_cotado?.trim() || null,
      coberturas_franquias: payload.coberturas_franquias ?? [],
      ordem: payload.ordem ?? 0,
    })
    .select(`
      *,
      produto:base_produtos(
        id,
        nome,
        categoria,
        descricao
      ),
      seguradora:base_seguradoras(
        id,
        nome,
        cnpj,
        site,
        logo_url
      )
    `)
    .single();

  if (error) throw error;

  return normalizarItem(data as unknown as PropostaItem);
}

export async function atualizarItemProposta(
  itemId: string,
  payload: AtualizarPropostaItemPayload,
): Promise<PropostaItem> {
  const perfil = await buscarPerfilAtual();
  await obterPropostaDoItemAutorizada(perfil, itemId, 'update');
  const corretoraId = obterCorretoraId(perfil);

  const { data: itemAtual, error: itemAtualError } =
    await supabase
      .from('crm_proposta_itens')
      .select(`
        id,
        proposta_id,
        produto_id,
        corretora_id
      `)
      .eq('id', itemId)
      .eq('corretora_id', corretoraId)
      .single();

  if (itemAtualError) throw itemAtualError;

  if (!itemAtual) {
    throw new Error(
      'Item da proposta não encontrado.',
    );
  }

  const produtoIdFinal =
    payload.produto_id ??
    itemAtual.produto_id;

  if (!produtoIdFinal) {
    throw new Error(
      'Produto não informado para o item da proposta.',
    );
  }

  await validarProdutoItemProposta(
    itemAtual.proposta_id,
    produtoIdFinal,
  );

  const alteracoes: Record<string, unknown> = {};

  if (payload.produto_id !== undefined) {
    alteracoes.produto_id = payload.produto_id;
  }

  if (payload.seguradora_id !== undefined) {
    alteracoes.seguradora_id = payload.seguradora_id;
  }

  if (payload.valor_premio !== undefined) {
    if (payload.valor_premio < 0) {
      throw new Error('Valor do prêmio não pode ser negativo.');
    }

    alteracoes.valor_premio = payload.valor_premio;
  }

  if (payload.valor_liquido !== undefined) {
    alteracoes.valor_liquido = payload.valor_liquido;
  }

  if (payload.numero_cotacao !== undefined) {
    alteracoes.numero_cotacao = payload.numero_cotacao?.trim() || null;
  }

  if (payload.parcelamento_cotado !== undefined) {
    alteracoes.parcelamento_cotado =
      payload.parcelamento_cotado?.trim() || null;
  }

  if (payload.meio_pagamento_cotado !== undefined) {
    alteracoes.meio_pagamento_cotado =
      payload.meio_pagamento_cotado?.trim() || null;
  }

  if (payload.coberturas_franquias !== undefined) {
    alteracoes.coberturas_franquias = payload.coberturas_franquias;
  }

  if (payload.ordem !== undefined) {
    alteracoes.ordem = payload.ordem;
  }

  const { data, error } = await supabase
    .from('crm_proposta_itens')
    .update(alteracoes)
    .eq('id', itemId)
    .eq('corretora_id', corretoraId)
    .select('*')
    .single();

  if (error) throw error;

  return normalizarItem(data as PropostaItem);
}

export async function excluirItemProposta(itemId: string): Promise<void> {
  const perfil = await buscarPerfilAtual();
  await obterPropostaDoItemAutorizada(perfil, itemId, 'update');
  const { error } = await supabase
    .from('crm_proposta_itens')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function fecharProposta(
  payload: FecharPropostaPayload,
): Promise<ResultadoFechamentoProposta> {
  const perfil = await buscarPerfilAtual();
  await obterPropostaAutorizada(perfil, payload.proposta_id, 'close');
  if (!payload.itens_contratados.length) {
    throw new Error('Selecione pelo menos um item para fechar a proposta.');
  }

  for (const item of payload.itens_contratados) {
    if (!item.item_id) {
      throw new Error('Item contratado sem identificador.');
    }

    if (!Number.isFinite(item.valor_aceito) || item.valor_aceito < 0) {
      throw new Error('Valor aceito inválido.');
    }
  }

  const { data, error } = await supabase.rpc('crm_fechar_proposta', {
    p_proposta_id: payload.proposta_id,
    p_itens_contratados: payload.itens_contratados,
    p_data_venda:
      payload.data_venda ?? new Date().toISOString().slice(0, 10),
  });

  if (error) throw error;
  if (!data) throw new Error('Fechamento da proposta não retornou resultado.');

  return data as ResultadoFechamentoProposta;
}

export async function buscarContratoPorId(
  contratoId: string,
): Promise<ContratoResumo> {
  if (!contratoId) {
    throw new Error('Contrato não informado.');
  }

  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  const { data, error } = await supabase
    .from('crm_contratos')
    .select('*')
    .eq('id', contratoId)
    .eq('corretora_id', corretoraId)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error('Contrato não encontrado.');
  }
  await obterPropostaAutorizada(perfil, data.proposta_id, 'read');

  return {
    ...(data as ContratoResumo),
    valor_aceito: numero(data.valor_aceito),
    valor_atual: numero(data.valor_atual),
  };
}

export async function emitirContrato(
  payload: EmitirContratoPayload,
): Promise<ContratoResumo> {
  if (!payload.contrato_id) {
    throw new Error('Contrato não informado.');
  }

  const numeroApolice = payload.numero_apolice.trim();
  if (!numeroApolice) {
    throw new Error('Informe o número da apólice.');
  }
  if (!payload.inicio_vigencia) {
    throw new Error('Informe o início da vigência.');
  }
  if (!payload.fim_vigencia) {
    throw new Error('Informe o fim da vigência.');
  }
  if (payload.fim_vigencia < payload.inicio_vigencia) {
    throw new Error('O fim da vigência não pode ser anterior ao início.');
  }

  // A autorização definitiva (inclusive issue=tenant) acontece na RPC.
  // Não consultar crm_contratos antes: a policy SELECT atual limita
  // corretores aos próprios contratos e bloquearia o escopo tenant.
  const { data, error } = await supabase.rpc('crm_emitir_contrato', {
    p_contrato_id: payload.contrato_id,
    p_numero_apolice: numeroApolice,
    p_inicio_vigencia: payload.inicio_vigencia,
    p_fim_vigencia: payload.fim_vigencia,
    p_periodicidade: payload.periodicidade,
  });

  if (error) throw error;
  if (!data) throw new Error('A emissão não retornou o contrato.');

  const contrato = data as ContratoResumo;
  return {
    ...contrato,
    valor_aceito: numero(contrato.valor_aceito),
    valor_atual: numero(contrato.valor_atual),
  };
}

/**
 * Atualiza exclusivamente o número da apólice
 * de um contrato já emitido.
 *
 * A autorização definitiva ocorre na RPC:
 * crm_atualizar_numero_apolice
 *
 * Permissão: operacoes.propostas.issue
 * Escopos: own / tenant
 */
export async function atualizarNumeroApoliceContrato(
  contratoId: string,
  novoNumeroApolice: string,
): Promise<{
  sucesso: boolean;
  alterado: boolean;
  contrato_id: string;
  numero_anterior?: string | null;
  numero_apolice: string;
}> {
  if (!contratoId) {
    throw new Error('Contrato não informado.');
  }

  const numeroApolice = novoNumeroApolice.trim();

  if (!numeroApolice) {
    throw new Error('Informe o novo número da apólice.');
  }

  const { data, error } = await supabase.rpc(
    'crm_atualizar_numero_apolice',
    {
      p_contrato_id: contratoId,
      p_numero_apolice: numeroApolice,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        'Não foi possível atualizar o número da apólice.',
    );
  }

  if (!data || data.sucesso !== true) {
    throw new Error(
      'A atualização da apólice não retornou um resultado válido.',
    );
  }

  return {
    sucesso: true,
    alterado: data.alterado === true,
    contrato_id: data.contrato_id,
    numero_anterior: data.numero_anterior ?? null,
    numero_apolice: data.numero_apolice,
  };
}


/**
 * Corrige as datas de vigência de um contrato já emitido.
 *
 * A autorização definitiva ocorre na RPC:
 * crm_atualizar_vigencia_contrato
 *
 * Permissão: operacoes.propostas.correct_term
 * Escopos: own / tenant
 *
 * Atualiza exclusivamente inicio_vigencia e fim_vigencia,
 * além dos campos de auditoria no banco.
 */
export async function atualizarVigenciaContrato(
  contratoId: string,
  inicioVigencia: string,
  fimVigencia: string,
): Promise<{
  sucesso: boolean;
  alterado: boolean;
  contrato_id: string;
  inicio_anterior: string | null;
  fim_anterior: string | null;
  inicio_vigencia: string;
  fim_vigencia: string;
}> {
  if (!contratoId) {
    throw new Error('Contrato não informado.');
  }

  const validarData = (valor: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return false;
    }

    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return (
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia
    );
  };

  if (!validarData(inicioVigencia)) {
    throw new Error('Informe uma data de início de vigência válida.');
  }

  if (!validarData(fimVigencia)) {
    throw new Error('Informe uma data de fim de vigência válida.');
  }

  if (fimVigencia < inicioVigencia) {
    throw new Error(
      'O fim da vigência não pode ser anterior ao início.',
    );
  }

  const { data, error } = await supabase.rpc(
    'crm_atualizar_vigencia_contrato',
    {
      p_contrato_id: contratoId,
      p_inicio_vigencia: inicioVigencia,
      p_fim_vigencia: fimVigencia,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        'Não foi possível atualizar a vigência do contrato.',
    );
  }

  if (
    !data ||
    data.sucesso !== true ||
    data.contrato_id !== contratoId ||
    !validarData(data.inicio_vigencia) ||
    !validarData(data.fim_vigencia)
  ) {
    throw new Error(
      'A atualização da vigência não retornou um resultado válido.',
    );
  }

  return {
    sucesso: true,
    alterado: data.alterado === true,
    contrato_id: data.contrato_id,
    inicio_anterior: data.inicio_anterior ?? null,
    fim_anterior: data.fim_anterior ?? null,
    inicio_vigencia: data.inicio_vigencia,
    fim_vigencia: data.fim_vigencia,
  };
}



/**
 * Reativa um contrato ENCERRADO com a vigência corrigida.
 *
 * Permissão: operacoes.propostas.reactivate
 * Escopos: own / tenant
 *
 * A autorização, as regras de renovação e a auditoria
 * são executadas pelo banco através da RPC.
 */
export async function reativarContrato(
  contratoId: string,
  inicioVigencia: string,
  fimVigencia: string,
): Promise<{
  sucesso: boolean;
  alterado: boolean;
  contrato_id: string;
  status_anterior: string;
  status: string;
  inicio_anterior: string | null;
  fim_anterior: string | null;
  inicio_vigencia: string;
  fim_vigencia: string;
}> {
  if (!contratoId) {
    throw new Error('Contrato não informado.');
  }

  const validarData = (valor: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return false;
    }

    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return (
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia
    );
  };

  if (!validarData(inicioVigencia)) {
    throw new Error('Informe uma data de início de vigência válida.');
  }

  if (!validarData(fimVigencia)) {
    throw new Error('Informe uma data de fim de vigência válida.');
  }

  if (fimVigencia < inicioVigencia) {
    throw new Error(
      'O fim da vigência não pode ser anterior ao início.',
    );
  }

  const { data, error } = await supabase.rpc(
    'crm_reativar_contrato',
    {
      p_contrato_id: contratoId,
      p_inicio_vigencia: inicioVigencia,
      p_fim_vigencia: fimVigencia,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        'Não foi possível reativar o contrato.',
    );
  }

  if (
    !data ||
    data.sucesso !== true ||
    data.alterado !== true ||
    data.contrato_id !== contratoId ||
    data.status_anterior !== 'ENCERRADO' ||
    data.status !== 'ATIVO' ||
    !validarData(data.inicio_vigencia) ||
    !validarData(data.fim_vigencia)
  ) {
    throw new Error(
      'A reativação não retornou um resultado válido.',
    );
  }

  return {
    sucesso: true,
    alterado: true,
    contrato_id: data.contrato_id,
    status_anterior: data.status_anterior,
    status: data.status,
    inicio_anterior: data.inicio_anterior ?? null,
    fim_anterior: data.fim_anterior ?? null,
    inicio_vigencia: data.inicio_vigencia,
    fim_vigencia: data.fim_vigencia,
  };
}


export async function iniciarRenovacaoContrato(
  payload: IniciarRenovacaoContratoPayload,
): Promise<ResultadoInicioRenovacao> {
  if (!payload.contrato_id) {
    throw new Error('Contrato de origem não informado.');
  }

  if (!payload.corretor_id) {
    throw new Error('Selecione o corretor responsável pela renovação.');
  }

  // A autorização, a validação do contrato e a criação da proposta
  // são executadas atomicamente pela RPC no banco.
  // A permissão "renew" é independente de "create".
  const { data, error } = await supabase.rpc(
    'crm_iniciar_renovacao_contrato',
    {
      p_contrato_id: payload.contrato_id,
      p_corretor_id: payload.corretor_id,
    },
  );

  if (error) throw error;

  const resultado = data as {
    proposta_id?: string;
    renovacao_existente?: boolean;
  } | null;

  if (!resultado?.proposta_id) {
    throw new Error('A renovação não retornou uma proposta válida.');
  }

  // Preserva a assinatura e o formato de retorno anteriores.
  // Observação: este SELECT continua sujeito às policies RLS de
  // crm_propostas e tabelas relacionadas. O acesso "tenant" a
  // propostas de terceiros requer ajuste posterior dessas policies.
  const proposta = await buscarPropostaPorIdInterna(resultado.proposta_id);

  return {
    proposta,
    renovacao_existente: resultado.renovacao_existente === true,
  };
}

export async function buscarProdutoRenovacaoOrigem(
  propostaId: string,
): Promise<ProdutoRenovacaoOrigem | null> {
  if (!propostaId) {
    throw new Error(
      "Proposta não informada para identificação do produto da renovação.",
    );
  }

  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  // 1. Identifica a proposta e o contrato que originou a renovação.
  const { data: proposta, error: propostaError } = await supabase
    .from("crm_propostas")
    .select(`
      id,
      corretora_id,
      tipo_negocio,
      contrato_origem_renovacao_id
    `)
    .eq("id", propostaId)
    .eq("corretora_id", corretoraId)
    .single();

  if (propostaError) throw propostaError;

  if (!proposta) {
    throw new Error("Proposta não encontrada.");
  }
  await obterPropostaAutorizada(perfil, propostaId, 'read');

  // Negócio NOVO não possui produto fixo de renovação.
  if (proposta.tipo_negocio !== "RENOVACAO") {
    return null;
  }

  if (!proposta.contrato_origem_renovacao_id) {
    throw new Error(
      "Proposta de renovação não possui contrato de origem.",
    );
  }

  // 2. Busca o produto diretamente no contrato original.
  const { data: contrato, error: contratoError } = await supabase
    .from("crm_contratos")
    .select(`
      id,
      corretora_id,
      produto_id,
      produto:base_produtos (
        id,
        nome,
        categoria
      )
    `)
    .eq(
      "id",
      proposta.contrato_origem_renovacao_id,
    )
    .eq("corretora_id", corretoraId)
    .single();

  if (contratoError) throw contratoError;

  if (!contrato) {
    throw new Error(
      "Contrato de origem da renovação não encontrado.",
    );
  }

  if (!contrato.produto_id) {
    throw new Error(
      "Contrato de origem não possui produto vinculado.",
    );
  }

  const produtoRaw = contrato.produto;

  const produto = Array.isArray(produtoRaw)
    ? produtoRaw[0]
    : produtoRaw;

  if (!produto) {
    throw new Error(
      "Produto do contrato de origem não encontrado.",
    );
  }

  return {
    contrato_id: contrato.id,
    produto_id: contrato.produto_id,
    produto_nome:
      produto.nome || "Produto não identificado",
    produto_categoria:
      produto.categoria ?? null,
  };
}

export async function executarAcaoProposta(
  payload: ExecutarAcaoPropostaPayload,
): Promise<ResultadoAcaoProposta> {
  const perfil = await buscarPerfilAtual();
  if (!['EXCLUIR', 'MARCAR_PERDIDA', 'REABRIR', 'REVERTER_VENDA'].includes(payload.acao)) {
    throw new Error('Ação de proposta não disponível.');
  }
  const acaoPermissao: AcaoPermissaoProposta =
    payload.acao === 'EXCLUIR' ? 'delete'
    : payload.acao === 'MARCAR_PERDIDA' ? 'lose'
    : payload.acao === 'REVERTER_VENDA' ? 'reverse'
    : payload.acao === 'REABRIR' ? 'lose'
    : 'update';
  await obterPropostaAutorizada(perfil, payload.proposta_id, acaoPermissao);
  if (payload.acao === 'REABRIR') {
    await obterPropostaAutorizada(perfil, payload.proposta_id, 'update');
  }
  const { data, error } = await supabase.rpc(
    'crm_executar_acao_proposta',
    {
      p_proposta_id: payload.proposta_id,
      p_acao: payload.acao,
      p_motivo_perda:
        payload.motivo_perda ?? null,
    },
  );

  if (error) throw error;

  if (!data) {
    throw new Error(
      'A operação não retornou resultado.',
    );
  }

  return data as ResultadoAcaoProposta;
}

export async function excluirProposta(
  propostaId: string,
): Promise<ResultadoAcaoProposta> {
  return executarAcaoProposta({
    proposta_id: propostaId,
    acao: 'EXCLUIR',
  });
}

export async function marcarPropostaPerdida(
  propostaId: string,
  motivoPerda: string,
): Promise<ResultadoAcaoProposta> {
  return executarAcaoProposta({
    proposta_id: propostaId,
    acao: 'MARCAR_PERDIDA',
    motivo_perda: motivoPerda,
  });
}

export async function reabrirProposta(
  propostaId: string,
): Promise<ResultadoAcaoProposta> {
  return executarAcaoProposta({
    proposta_id: propostaId,
    acao: 'REABRIR',
  });
}

export async function reverterVendaProposta(
  propostaId: string,
): Promise<ResultadoAcaoProposta> {
  return executarAcaoProposta({
    proposta_id: propostaId,
    acao: 'REVERTER_VENDA',
  });
}