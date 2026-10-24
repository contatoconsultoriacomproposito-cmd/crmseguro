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
} from '../types/propostas';

import type { EmitirContratoPayload } from '../types/propostas';

type UsuarioPerfilMinimo = {
  id: string;
  nome: string | null;
  tipo_usuario: 'CORRETORA' | 'CORRETOR';
  corretora_id: string;
};

type PropostaRow = Proposta & {
  corretor?: { id: string; nome: string | null } | { id: string; nome: string | null }[] | null;
  pessoa?: Record<string, unknown> | Record<string, unknown>[] | null;
  empresa?: Record<string, unknown> | Record<string, unknown>[] | null;
  itens?: PropostaItem[] | null;
};

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

export async function listarPropostas(
  filtros: FiltrosPropostas = {},
): Promise<ResultadoListaPropostas> {
  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  const pagina = Math.max(1, filtros.pagina ?? 1);
  const porPagina = Math.min(
    100,
    Math.max(1, filtros.por_pagina ?? 20),
  );

  const inicio = (pagina - 1) * porPagina;
  const fim = inicio + porPagina - 1;

  const busca =
    filtros.busca
      ?.trim()
      .toLocaleLowerCase('pt-BR') ?? '';

  const criarQuery = () => {
    let query = supabase
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
          updated_at
        )
      `, { count: 'exact' })
      .eq('corretora_id', corretoraId)
      .order('created_at', {
        ascending: false,
      });

    if (perfil.tipo_usuario === 'CORRETOR') {
      query = query.eq(
        'corretor_id',
        perfil.id,
      );
    }

    if (filtros.status) {
      query = query.eq(
        'status',
        filtros.status,
      );
    }

    if (filtros.tipo_negocio) {
      query = query.eq(
        'tipo_negocio',
        filtros.tipo_negocio,
      );
    }

    if (filtros.corretor_id) {
      query = query.eq(
        'corretor_id',
        filtros.corretor_id,
      );
    }

    if (filtros.data_inicio) {
      query = query.gte(
        'data_emissao',
        filtros.data_inicio,
      );
    }

    if (filtros.data_fim) {
      query = query.lte(
        'data_emissao',
        filtros.data_fim,
      );
    }

    if (filtros.cliente_id) {
      query = query.or(
        `crm_pessoa_id.eq.${filtros.cliente_id},crm_empresa_id.eq.${filtros.cliente_id}`,
      );
    }

    return query;
  };

  const mapearPropostas = (
    rows: PropostaRow[],
  ): PropostaListaItem[] => {
    return rows.map(
      (row): PropostaListaItem => {
        const proposta =
          normalizarProposta(row);

        const cliente =
          mapearClienteDaProposta(row);

        const corretor =
          normalizarRelacao(
            row.corretor,
          );

        return {
          ...proposta,
          cliente_nome:
            cliente?.nome ??
            'Cliente não identificado',
          cliente_documento:
            cliente?.documento ?? null,
          cliente_tipo: (
            cliente?.tipo ?? 'PF'
          ) as TipoClienteProposta,
          corretor_nome:
            corretor?.nome ?? null,
          quantidade_itens:
            Array.isArray(row.itens)
              ? row.itens.length
              : 0,
        };
      },
    );
  };

  if (!busca) {
    const {
      data,
      error,
      count,
    } = await criarQuery().range(
      inicio,
      fim,
    );

    if (error) throw error;

    const propostas =
      mapearPropostas(
        (data ?? []) as unknown as PropostaRow[],
      );

    const total =
      count ?? propostas.length;

    return {
      dados: propostas,
      total,
      pagina,
      por_pagina: porPagina,
      total_paginas: Math.max(
        1,
        Math.ceil(
          total / porPagina,
        ),
      ),
    };
  }

  const todasRows: PropostaRow[] = [];
  const tamanhoLote = 1000;
  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await criarQuery().range(
      offset,
      offset + tamanhoLote - 1,
    );

    if (error) throw error;

    const lote =
      (data ?? []) as unknown as PropostaRow[];

    todasRows.push(...lote);

    if (
      lote.length < tamanhoLote
    ) {
      break;
    }

    offset += tamanhoLote;
  }

  let propostas =
    mapearPropostas(todasRows);

  const buscaNumerica =
    busca.replace(/\D/g, '');

  propostas =
    propostas.filter(
      (proposta) => {
        const numeroProposta =
          proposta.numero_proposta
            ?.toLocaleLowerCase(
              'pt-BR',
            ) ?? '';

        const clienteNome =
          proposta.cliente_nome
            ?.toLocaleLowerCase(
              'pt-BR',
            ) ?? '';

        const documento =
          (
            proposta.cliente_documento ??
            ''
          ).replace(/\D/g, '');

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

  const total = propostas.length;

  const propostasPaginadas =
    propostas.slice(
      inicio,
      inicio + porPagina,
    );

  return {
    dados: propostasPaginadas,
    total,
    pagina,
    por_pagina: porPagina,
    total_paginas: Math.max(
      1,
      Math.ceil(
        total / porPagina,
      ),
    ),
  };
}

export async function buscarPropostaPorId(
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

export async function criarProposta(
  payload: CriarPropostaPayload,
): Promise<Proposta> {
  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  if (!!payload.crm_pessoa_id === !!payload.crm_empresa_id) {
    throw new Error('Informe uma pessoa ou uma empresa para a proposta.');
  }

  if (
    perfil.tipo_usuario === 'CORRETOR' &&
    payload.corretor_id !== perfil.id
  ) {
    throw new Error('Corretor não pode criar proposta para outro responsável.');
  }

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

export async function atualizarProposta(
  propostaId: string,
  payload: AtualizarPropostaPayload,
): Promise<Proposta> {
  const perfil = await buscarPerfilAtual();

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
  const { error } = await supabase
    .from('crm_proposta_itens')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function fecharProposta(
  payload: FecharPropostaPayload,
): Promise<ResultadoFechamentoProposta> {
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

  if (
    payload.fim_vigencia <
    payload.inicio_vigencia
  ) {
    throw new Error(
      'O fim da vigência não pode ser anterior ao início.',
    );
  }

  const { data, error } = await supabase
    .from('crm_contratos')
    .update({
      numero_apolice: numeroApolice,
      inicio_vigencia: payload.inicio_vigencia,
      fim_vigencia: payload.fim_vigencia,
      periodicidade: payload.periodicidade,
      status: 'ATIVO',
    })
    .eq('id', payload.contrato_id)
    .eq('status', 'AGUARDANDO_EMISSAO')
    .select('*')
    .single();

  if (error) throw error;

  return {
    ...(data as ContratoResumo),
    valor_aceito: numero(data.valor_aceito),
    valor_atual: numero(data.valor_atual),
  };
}

export async function iniciarRenovacaoContrato(
  payload: IniciarRenovacaoContratoPayload,
): Promise<ResultadoInicioRenovacao> {
  if (!payload.contrato_id) {
    throw new Error('Contrato de origem não informado.');
  }

  if (!payload.corretor_id) {
    throw new Error(
      'Selecione o corretor responsável pela renovação.',
    );
  }

  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  // 1. Busca e valida o contrato de origem.
  const { data: contrato, error: contratoError } = await supabase
    .from('crm_contratos')
    .select(`
      id,
      corretora_id,
      proposta_id,
      proposta_item_id,
      status,
      numero_apolice,
      inicio_vigencia,
      fim_vigencia,
      valor_aceito,
      valor_atual
    `)
    .eq('id', payload.contrato_id)
    .eq('corretora_id', corretoraId)
    .single();

  if (contratoError) throw contratoError;

  if (!contrato) {
    throw new Error(
      'Contrato de origem não encontrado.',
    );
  }

  if (contrato.status !== 'ATIVO') {
    throw new Error(
      'Somente contratos ativos podem iniciar uma renovação.',
    );
  }

  // 2. Busca a proposta que originou o contrato.
  const { data: propostaOrigem, error: propostaOrigemError } =
    await supabase
      .from('crm_propostas')
      .select(`
        id,
        corretora_id,
        corretor_id,
        crm_pessoa_id,
        crm_empresa_id,
        numero_proposta,
        tipo_negocio,
        status
      `)
      .eq('id', contrato.proposta_id)
      .eq('corretora_id', corretoraId)
      .single();

  if (propostaOrigemError) {
    throw propostaOrigemError;
  }

  if (!propostaOrigem) {
    throw new Error(
      'A proposta de origem do contrato não foi encontrada.',
    );
  }

  if (
    !propostaOrigem.crm_pessoa_id &&
    !propostaOrigem.crm_empresa_id
  ) {
    throw new Error(
      'O contrato de origem não possui cliente vinculado.',
    );
  }

  if (
    propostaOrigem.crm_pessoa_id &&
    propostaOrigem.crm_empresa_id
  ) {
    throw new Error(
      'A proposta de origem possui vínculo de cliente inválido.',
    );
  }

  // 3. Valida se o corretor escolhido pertence à corretora.
  const { data: corretor, error: corretorError } = await supabase
    .from('usuarios_perfis')
    .select(`
      id,
      nome,
      tipo_usuario,
      corretora_id,
      ativo
    `)
    .eq('id', payload.corretor_id)
    .eq('ativo', true)
    .maybeSingle();

  if (corretorError) throw corretorError;

  if (!corretor) {
    throw new Error(
      'Corretor responsável não encontrado ou inativo.',
    );
  }

  const corretorPertenceCorretora =
    corretor.id === corretoraId ||
    corretor.corretora_id === corretoraId;

  if (!corretorPertenceCorretora) {
    throw new Error(
      'O responsável selecionado não pertence a esta corretora.',
    );
  }

  // 4. Impede outra renovação aberta para o mesmo contrato.
  const { data: renovacaoExistente, error: renovacaoExistenteError } =
    await supabase
      .from('crm_propostas')
      .select('id')
      .eq('corretora_id', corretoraId)
      .eq(
        'contrato_origem_renovacao_id',
        contrato.id,
      )
      .eq('tipo_negocio', 'RENOVACAO')
      .eq('status', 'EM_NEGOCIACAO')
      .maybeSingle();

  if (renovacaoExistenteError) {
    throw renovacaoExistenteError;
  }

  if (renovacaoExistente) {
    const proposta = await buscarPropostaPorId(
      renovacaoExistente.id,
    );

    return {
      proposta,
      renovacao_existente: true,
    };
  }

  // 5. Cria a nova proposta de renovação.
//
// Não copiamos os itens antigos.
// As novas cotações serão cadastradas normalmente
// na nova proposta.
const novaProposta = await criarProposta({
  corretor_id: payload.corretor_id,
  crm_pessoa_id:
    propostaOrigem.crm_pessoa_id ?? null,
  crm_empresa_id:
    propostaOrigem.crm_empresa_id ?? null,
  tipo_negocio: 'RENOVACAO',
  data_emissao: new Date()
    .toISOString()
    .slice(0, 10),
  data_validade: null,
  observacoes:
    contrato.numero_apolice
      ? `Renovação da apólice ${contrato.numero_apolice}.`
      : 'Renovação de contrato.',
  contrato_origem_renovacao_id:
    contrato.id,
});

if (!novaProposta) {
  throw new Error(
    'Não foi possível criar a proposta de renovação.',
  );
}

// 6. Retorna a proposta já no formato utilizado pelo frontend.
const proposta = await buscarPropostaPorId(
  novaProposta.id,
);

return {
  proposta,
  renovacao_existente: false,
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