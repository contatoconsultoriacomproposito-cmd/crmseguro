import { supabase } from '../../../../../lib/supabaseClient';
import type {
  PropostaClienteResumo,
  PropostaEmpresa,
  PropostaPessoa,
} from '../types/propostas';

type UsuarioPerfilMinimo = {
  id: string;
  tipo_usuario: 'CORRETORA' | 'CORRETOR';
  corretora_id: string;
};

type ClienteLegadoRow = {
  id: string;
  corretora_id: string;
  corretor_id: string | null;
  tipo_cliente: 'PF' | 'PJ';
  cpf_cnpj: string | null;
  nome_razao_social: string | null;
  nome_fantasia: string | null;
  cep: string | null;
  uf: string | null;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  contatos: unknown;
  socios: unknown;
  dados_complementares_pf: unknown;
  dados_complementares_pj: unknown;
  cnae_principal: string | null;
  situacao_cadastral: string | null;
  origem: string | null;
  fase_atendimento: string | null;
  temperatura: string | null;
};

function somenteDigitos(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '');
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const resultado = valor.trim();
  return resultado || null;
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return {};
  }

  return valor as Record<string, unknown>;
}

function array(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function extrairPrimeiroTexto(
  dados: Record<string, unknown>,
  campos: string[],
): string | null {
  for (const campo of campos) {
    const valor = texto(dados[campo]);

    if (valor) {
      return valor;
    }
  }

  return null;
}

function extrairEndereco(
  dados: Record<string, unknown>,
): Record<string, unknown> {
  return objeto(dados.endereco);
}

function extrairContatoPrincipal(
  contatos: unknown,
): Record<string, unknown> {
  const lista = array(contatos).filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) &&
      typeof item === 'object' &&
      !Array.isArray(item),
  );

  if (!lista.length) return {};

  const principal = lista.find(
    (item) => item.principal === true,
  );

  return principal ?? lista[0];
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
    .select('id,tipo_usuario,corretora_id')
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

function mapearPessoa(
  row: Record<string, unknown>,
): PropostaClienteResumo {
  const dados = objeto(row.dados);
  const endereco = extrairEndereco(dados);

  return {
    id: String(row.id),
    tipo: 'PF',
    origem: 'CRM_PESSOA',
    nome:
      extrairPrimeiroTexto(dados, [
        'nome',
        'nome_completo',
        'nome_razao_social',
      ]) ?? 'Pessoa sem nome',
    documento: texto(row.cpf),
    corretora_id: String(row.corretora_id),
    corretor_id: String(row.corretor_id),
    telefone: extrairPrimeiroTexto(dados, [
      'telefone',
      'celular',
      'whatsapp',
    ]),
    email: extrairPrimeiroTexto(dados, ['email']),
    municipio:
      extrairPrimeiroTexto(endereco, ['municipio', 'cidade']) ??
      extrairPrimeiroTexto(dados, ['municipio', 'cidade']),
    uf:
      extrairPrimeiroTexto(endereco, ['uf', 'estado']) ??
      extrairPrimeiroTexto(dados, ['uf', 'estado']),
    cliente_id_legado: texto(row.cliente_id_legado),
  };
}

function mapearEmpresa(
  row: Record<string, unknown>,
): PropostaClienteResumo {
  const dados = objeto(row.dados);
  const endereco = extrairEndereco(dados);

  return {
    id: String(row.id),
    tipo: 'PJ',
    origem: 'CRM_EMPRESA',
    nome:
      extrairPrimeiroTexto(dados, [
        'nome_fantasia',
        'razao_social',
        'nome_razao_social',
        'nome',
      ]) ?? 'Empresa sem nome',
    documento: texto(row.cnpj),
    corretora_id: String(row.corretora_id),
    corretor_id: String(row.corretor_id),
    telefone: extrairPrimeiroTexto(dados, [
      'telefone',
      'celular',
      'whatsapp',
    ]),
    email: extrairPrimeiroTexto(dados, ['email']),
    municipio:
      extrairPrimeiroTexto(endereco, ['municipio', 'cidade']) ??
      extrairPrimeiroTexto(dados, ['municipio', 'cidade']),
    uf:
      extrairPrimeiroTexto(endereco, ['uf', 'estado']) ??
      extrairPrimeiroTexto(dados, ['uf', 'estado']),
    cliente_id_legado: texto(row.cliente_id_legado),
  };
}

function mapearLegado(
  row: ClienteLegadoRow,
): PropostaClienteResumo {
  const contato = extrairContatoPrincipal(row.contatos);

  return {
    id: row.id,
    tipo: row.tipo_cliente,
    origem: 'LEGADO',
    nome:
      texto(row.nome_fantasia) ??
      texto(row.nome_razao_social) ??
      'Cliente sem nome',
    documento: texto(row.cpf_cnpj),
    corretora_id: row.corretora_id,
    corretor_id: row.corretor_id ?? '',
    telefone:
      extrairPrimeiroTexto(contato, [
        'telefone',
        'celular',
        'whatsapp',
      ]) ?? null,
    email:
      extrairPrimeiroTexto(contato, ['email']) ?? null,
    municipio: texto(row.municipio),
    uf: texto(row.uf),
    cliente_id_legado: row.id,
  };
}

export async function buscarClientesProposta(
  busca = '',
  limite = 30,
): Promise<PropostaClienteResumo[]> {
  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  const termo = busca.trim();
  const documento = somenteDigitos(termo);

  if (termo.length < 2) {
    return [];
  }

  const termoLike = `%${termo}%`;

  let pessoasQuery = supabase
    .from('crm_pessoas')
    .select(
      'id,corretora_id,corretor_id,cpf,dados,cliente_id_legado',
    )
    .eq('corretora_id', corretoraId)
    .or(
      documento
        ? `cpf.ilike.%${documento}%,dados->>nome.ilike.${termoLike},dados->>nome_completo.ilike.${termoLike},dados->>nome_razao_social.ilike.${termoLike}`
        : `dados->>nome.ilike.${termoLike},dados->>nome_completo.ilike.${termoLike},dados->>nome_razao_social.ilike.${termoLike}`,
    )
    .limit(limite);

  let empresasQuery = supabase
    .from('crm_empresas')
    .select(
      'id,corretora_id,corretor_id,cnpj,dados,cliente_id_legado',
    )
    .eq('corretora_id', corretoraId)
    .or(
      documento
        ? `cnpj.ilike.%${documento}%,dados->>razao_social.ilike.${termoLike},dados->>nome_fantasia.ilike.${termoLike},dados->>nome_razao_social.ilike.${termoLike}`
        : `dados->>razao_social.ilike.${termoLike},dados->>nome_fantasia.ilike.${termoLike},dados->>nome_razao_social.ilike.${termoLike}`,
    )
    .limit(limite);

  let legadosQuery = supabase
    .from('tab_clientes')
    .select(`
      id,
      corretora_id,
      corretor_id,
      tipo_cliente,
      cpf_cnpj,
      nome_razao_social,
      nome_fantasia,
      cep,
      uf,
      municipio,
      bairro,
      logradouro,
      numero,
      complemento,
      contatos,
      socios,
      dados_complementares_pf,
      dados_complementares_pj,
      cnae_principal,
      situacao_cadastral,
      origem,
      fase_atendimento,
      temperatura
    `)
    .eq('corretora_id', corretoraId)
    .or(
      documento
        ? `cpf_cnpj.ilike.%${documento}%,nome_razao_social.ilike.${termoLike},nome_fantasia.ilike.${termoLike}`
        : `nome_razao_social.ilike.${termoLike},nome_fantasia.ilike.${termoLike}`,
    )
    .limit(limite);

  if (perfil.tipo_usuario === 'CORRETOR') {
    pessoasQuery = pessoasQuery.eq('corretor_id', perfil.id);
    empresasQuery = empresasQuery.eq('corretor_id', perfil.id);
    legadosQuery = legadosQuery.eq('corretor_id', perfil.id);
  }

  const [
    pessoasResult,
    empresasResult,
    legadosResult,
  ] = await Promise.all([
    pessoasQuery,
    empresasQuery,
    legadosQuery,
  ]);

  if (pessoasResult.error) throw pessoasResult.error;
  if (empresasResult.error) throw empresasResult.error;
  if (legadosResult.error) throw legadosResult.error;

  const pessoas = (
    (pessoasResult.data ?? []) as Record<string, unknown>[]
  ).map(mapearPessoa);

  const empresas = (
    (empresasResult.data ?? []) as Record<string, unknown>[]
  ).map(mapearEmpresa);

  const idsLegadosJaMigrados = new Set<string>();

  for (const cliente of [...pessoas, ...empresas]) {
    if (cliente.cliente_id_legado) {
      idsLegadosJaMigrados.add(cliente.cliente_id_legado);
    }
  }

  const legados = (
    (legadosResult.data ?? []) as ClienteLegadoRow[]
  )
    .filter(
      (cliente) =>
        !idsLegadosJaMigrados.has(cliente.id),
    )
    .map(mapearLegado);

  return [
    ...pessoas,
    ...empresas,
    ...legados,
  ]
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    )
    .slice(0, limite);
}

async function buscarClienteLegado(
  clienteId: string,
  corretoraId: string,
): Promise<ClienteLegadoRow> {
  const { data, error } = await supabase
    .from('tab_clientes')
    .select(`
      id,
      corretora_id,
      corretor_id,
      tipo_cliente,
      cpf_cnpj,
      nome_razao_social,
      nome_fantasia,
      cep,
      uf,
      municipio,
      bairro,
      logradouro,
      numero,
      complemento,
      contatos,
      socios,
      dados_complementares_pf,
      dados_complementares_pj,
      cnae_principal,
      situacao_cadastral,
      origem,
      fase_atendimento,
      temperatura
    `)
    .eq('id', clienteId)
    .eq('corretora_id', corretoraId)
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error('Cliente legado não encontrado.');
  }

  return data as ClienteLegadoRow;
}

async function resolverPessoaLegada(
  cliente: ClienteLegadoRow,
  corretorId: string,
): Promise<PropostaClienteResumo> {
  const { data: existenteLegado, error: existenteLegadoError } =
    await supabase
      .from('crm_pessoas')
      .select(
        'id,corretora_id,corretor_id,cpf,dados,cliente_id_legado',
      )
      .eq('corretora_id', cliente.corretora_id)
      .eq('cliente_id_legado', cliente.id)
      .maybeSingle();

  if (existenteLegadoError) throw existenteLegadoError;

  if (existenteLegado) {
    return mapearPessoa(
      existenteLegado as Record<string, unknown>,
    );
  }

  const cpf = somenteDigitos(cliente.cpf_cnpj) || null;

  if (cpf) {
    const { data: existenteCpf, error: existenteCpfError } =
      await supabase
        .from('crm_pessoas')
        .select(
          'id,corretora_id,corretor_id,cpf,dados,cliente_id_legado',
        )
        .eq('corretora_id', cliente.corretora_id)
        .eq('cpf', cpf)
        .maybeSingle();

    if (existenteCpfError) throw existenteCpfError;

    if (existenteCpf) {
      if (!existenteCpf.cliente_id_legado) {
        const { data: atualizado, error: atualizarError } =
          await supabase
            .from('crm_pessoas')
            .update({
              cliente_id_legado: cliente.id,
            })
            .eq('id', existenteCpf.id)
            .select(
              'id,corretora_id,corretor_id,cpf,dados,cliente_id_legado',
            )
            .single();

        if (atualizarError) throw atualizarError;

        return mapearPessoa(
          atualizado as Record<string, unknown>,
        );
      }

      return mapearPessoa(
        existenteCpf as Record<string, unknown>,
      );
    }
  }

  const contato = extrairContatoPrincipal(cliente.contatos);

  const dados = {
    nome:
      texto(cliente.nome_razao_social) ??
      texto(cliente.nome_fantasia),
    nome_completo:
      texto(cliente.nome_razao_social) ??
      texto(cliente.nome_fantasia),
    telefone: extrairPrimeiroTexto(contato, [
      'telefone',
      'celular',
      'whatsapp',
    ]),
    email: extrairPrimeiroTexto(contato, ['email']),
    endereco: {
      cep: texto(cliente.cep),
      uf: texto(cliente.uf),
      municipio: texto(cliente.municipio),
      bairro: texto(cliente.bairro),
      logradouro: texto(cliente.logradouro),
      numero: texto(cliente.numero),
      complemento: texto(cliente.complemento),
    },
    contatos: array(cliente.contatos),
    dados_complementares_pf:
      objeto(cliente.dados_complementares_pf),
    origem: texto(cliente.origem),
    fase_atendimento:
      texto(cliente.fase_atendimento),
    temperatura: texto(cliente.temperatura),
  };

  const { data, error } = await supabase
    .from('crm_pessoas')
    .insert({
      corretora_id: cliente.corretora_id,
      corretor_id: corretorId,
      cpf,
      dados,
      cliente_id_legado: cliente.id,
    })
    .select(
      'id,corretora_id,corretor_id,cpf,dados,cliente_id_legado',
    )
    .single();

  if (error) throw error;

  return mapearPessoa(
    data as Record<string, unknown>,
  );
}

async function resolverEmpresaLegada(
  cliente: ClienteLegadoRow,
  corretorId: string,
): Promise<PropostaClienteResumo> {
  const { data: existenteLegado, error: existenteLegadoError } =
    await supabase
      .from('crm_empresas')
      .select(
        'id,corretora_id,corretor_id,cnpj,dados,cliente_id_legado',
      )
      .eq('corretora_id', cliente.corretora_id)
      .eq('cliente_id_legado', cliente.id)
      .maybeSingle();

  if (existenteLegadoError) throw existenteLegadoError;

  if (existenteLegado) {
    return mapearEmpresa(
      existenteLegado as Record<string, unknown>,
    );
  }

  const cnpj = somenteDigitos(cliente.cpf_cnpj) || null;

  if (cnpj) {
    const { data: existenteCnpj, error: existenteCnpjError } =
      await supabase
        .from('crm_empresas')
        .select(
          'id,corretora_id,corretor_id,cnpj,dados,cliente_id_legado',
        )
        .eq('corretora_id', cliente.corretora_id)
        .eq('cnpj', cnpj)
        .maybeSingle();

    if (existenteCnpjError) throw existenteCnpjError;

    if (existenteCnpj) {
      if (!existenteCnpj.cliente_id_legado) {
        const { data: atualizado, error: atualizarError } =
          await supabase
            .from('crm_empresas')
            .update({
              cliente_id_legado: cliente.id,
            })
            .eq('id', existenteCnpj.id)
            .select(
              'id,corretora_id,corretor_id,cnpj,dados,cliente_id_legado',
            )
            .single();

        if (atualizarError) throw atualizarError;

        return mapearEmpresa(
          atualizado as Record<string, unknown>,
        );
      }

      return mapearEmpresa(
        existenteCnpj as Record<string, unknown>,
      );
    }
  }

  const contato = extrairContatoPrincipal(cliente.contatos);

  const dados = {
    razao_social: texto(cliente.nome_razao_social),
    nome_razao_social:
      texto(cliente.nome_razao_social),
    nome_fantasia: texto(cliente.nome_fantasia),
    telefone: extrairPrimeiroTexto(contato, [
      'telefone',
      'celular',
      'whatsapp',
    ]),
    email: extrairPrimeiroTexto(contato, ['email']),
    endereco: {
      cep: texto(cliente.cep),
      uf: texto(cliente.uf),
      municipio: texto(cliente.municipio),
      bairro: texto(cliente.bairro),
      logradouro: texto(cliente.logradouro),
      numero: texto(cliente.numero),
      complemento: texto(cliente.complemento),
    },
    contatos: array(cliente.contatos),
    socios: array(cliente.socios),
    dados_complementares_pj:
      objeto(cliente.dados_complementares_pj),
    cnae_principal:
      texto(cliente.cnae_principal),
    situacao_cadastral:
      texto(cliente.situacao_cadastral),
    origem: texto(cliente.origem),
    fase_atendimento:
      texto(cliente.fase_atendimento),
    temperatura: texto(cliente.temperatura),
  };

  const { data, error } = await supabase
    .from('crm_empresas')
    .insert({
      corretora_id: cliente.corretora_id,
      corretor_id: corretorId,
      cnpj,
      dados,
      cliente_id_legado: cliente.id,
    })
    .select(
      'id,corretora_id,corretor_id,cnpj,dados,cliente_id_legado',
    )
    .single();

  if (error) throw error;

  return mapearEmpresa(
    data as Record<string, unknown>,
  );
}

export async function resolverClienteProposta(
  cliente: PropostaClienteResumo,
): Promise<PropostaClienteResumo> {
  if (cliente.origem !== 'LEGADO') {
    return cliente;
  }

  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  const legado = await buscarClienteLegado(
    cliente.id,
    corretoraId,
  );

  const corretorId =
    legado.corretor_id ||
    (perfil.tipo_usuario === 'CORRETOR'
      ? perfil.id
      : perfil.id);

  if (legado.tipo_cliente === 'PF') {
    return resolverPessoaLegada(
      legado,
      corretorId,
    );
  }

  if (legado.tipo_cliente === 'PJ') {
    return resolverEmpresaLegada(
      legado,
      corretorId,
    );
  }

  throw new Error(
    'Tipo de cliente legado não suportado.',
  );
}

export async function buscarPessoaProposta(
  id: string,
): Promise<PropostaPessoa> {
  const { data, error } = await supabase
    .from('crm_pessoas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as PropostaPessoa;
}

export async function buscarEmpresaProposta(
  id: string,
): Promise<PropostaEmpresa> {
  const { data, error } = await supabase
    .from('crm_empresas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as PropostaEmpresa;
}

export async function buscarClientePropostaPorId(
  tipo: 'PF' | 'PJ',
  id: string,
): Promise<PropostaClienteResumo> {
  if (tipo === 'PF') {
    const pessoa = await buscarPessoaProposta(id);

    return mapearPessoa(
      pessoa as unknown as Record<string, unknown>,
    );
  }

  const empresa = await buscarEmpresaProposta(id);

  return mapearEmpresa(
    empresa as unknown as Record<string, unknown>,
  );
}

export interface ClienteInicialProposta {
  tipo: 'PF' | 'PJ';
  id: string;
}

function textoInicial(
  valor: unknown
): string | null {
  if (typeof valor !== 'string') return null;

  const resultado = valor.trim();

  return resultado || null;
}

function objetoInicial(
  valor: unknown
): Record<string, unknown> {
  if (
    !valor ||
    typeof valor !== 'object' ||
    Array.isArray(valor)
  ) {
    return {};
  }

  return valor as Record<string, unknown>;
}

function primeiroTextoInicial(
  dados: Record<string, unknown>,
  campos: string[]
): string | null {
  for (const campo of campos) {
    const valor = textoInicial(
      dados[campo]
    );

    if (valor) return valor;
  }

  return null;
}

export async function buscarClienteInicialProposta(
  cliente: ClienteInicialProposta
): Promise<PropostaClienteResumo> {
  if (!cliente?.id) {
    throw new Error(
      'Cliente inicial da proposta não informado.'
    );
  }

  if (cliente.tipo === 'PF') {
    const { data, error } = await supabase
      .from('crm_pessoas')
      .select(`
        id,
        corretora_id,
        corretor_id,
        cpf,
        cliente_id_legado,
        dados
      `)
      .eq('id', cliente.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Pessoa vinculada à conversa não encontrada no CRM.'
      );
    }

    const dados =
      objetoInicial(data.dados);

    return {
      id: String(data.id),
      tipo: 'PF',
      origem: 'CRM_PESSOA',
      nome:
        primeiroTextoInicial(
          dados,
          [
            'nome',
            'nome_completo',
            'nome_razao_social',
          ]
        ) ?? 'Pessoa sem nome',
      documento:
        textoInicial(data.cpf),
      corretora_id:
        String(data.corretora_id),
      corretor_id:
        String(data.corretor_id ?? ''),
      telefone:
        primeiroTextoInicial(
          dados,
          [
            'telefone',
            'celular',
            'whatsapp',
          ]
        ),
      email:
        primeiroTextoInicial(
          dados,
          ['email']
        ),
      municipio:
        primeiroTextoInicial(
          objetoInicial(
            dados.endereco
          ),
          [
            'municipio',
            'cidade',
          ]
        ) ??
        primeiroTextoInicial(
          dados,
          [
            'municipio',
            'cidade',
          ]
        ),
      uf:
        primeiroTextoInicial(
          objetoInicial(
            dados.endereco
          ),
          [
            'uf',
            'estado',
          ]
        ) ??
        primeiroTextoInicial(
          dados,
          [
            'uf',
            'estado',
          ]
        ),
      cliente_id_legado:
        textoInicial(
          data.cliente_id_legado
        ),
    };
  }

  const { data, error } = await supabase
    .from('crm_empresas')
    .select(`
      id,
      corretora_id,
      corretor_id,
      cnpj,
      cliente_id_legado,
      dados
    `)
    .eq('id', cliente.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      'Empresa vinculada à conversa não encontrada no CRM.'
    );
  }

  const dados =
    objetoInicial(data.dados);

  return {
    id: String(data.id),
    tipo: 'PJ',
    origem: 'CRM_EMPRESA',
    nome:
      primeiroTextoInicial(
        dados,
        [
          'nome_fantasia',
          'razao_social',
          'nome',
          'nome_razao_social',
        ]
      ) ?? 'Empresa sem nome',
    documento:
      textoInicial(data.cnpj),
    corretora_id:
      String(data.corretora_id),
    corretor_id:
      String(data.corretor_id ?? ''),
    telefone:
      primeiroTextoInicial(
        dados,
        [
          'telefone',
          'celular',
          'whatsapp',
        ]
      ),
    email:
      primeiroTextoInicial(
        dados,
        ['email']
      ),
    municipio:
      primeiroTextoInicial(
        objetoInicial(
          dados.endereco
        ),
        [
          'municipio',
          'cidade',
        ]
      ) ??
      primeiroTextoInicial(
        dados,
        [
          'municipio',
          'cidade',
        ]
      ),
    uf:
      primeiroTextoInicial(
        objetoInicial(
          dados.endereco
        ),
        [
          'uf',
          'estado',
        ]
      ) ??
      primeiroTextoInicial(
        dados,
        [
          'uf',
          'estado',
        ]
      ),
    cliente_id_legado:
      textoInicial(
        data.cliente_id_legado
      ),
  };
}