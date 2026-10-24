import { supabase } from "../../../lib/supabaseClient";



// ============================================================

// TIPOS BASE

// ============================================================



export type CrmClassificacao = 'NAO_QUALIFICADO' | 'LEAD';

export type CrmKanbanStage =
  | 'prospeccao'
  | 'negociacao'
  | 'fechamento'
  | 'pos_venda'
  | 'perdido'
  | 'assistencia'
  | 'sinistro';



export type CrmTipoEntidade = 'PF' | 'PJ';



export interface CrmUsuarioSessao {

  id: string;

  corretora_id: string;

  tipo_usuario: 'CORRETORA' | 'CORRETOR';

}



export interface CrmTelefone {

  id?: string;

  numero: string;

  tipo?: string | null;

  whatsapp?: boolean;

  principal?: boolean;

  observacao?: string | null;

}



export interface CrmEmail {

  id?: string;

  email: string;

  tipo?: string | null;

  principal?: boolean;

  observacao?: string | null;

}



export interface CrmEndereco {

  id?: string;

  tipo?: string | null;

  principal?: boolean;



  cep?: string | null;

  logradouro?: string | null;

  numero?: string | null;

  complemento?: string | null;

  bairro?: string | null;

  municipio?: string | null;

  uf?: string | null;



  observacao?: string | null;

}



export interface CrmDocumentoPessoa {

  rg_numero?: string | null;

  rg_orgao?: string | null;

  data_emissao_rg?: string | null;



  cnh_numero?: string | null;

  cnh_categoria?: string | null;

  cnh_validade?: string | null;



  outros?: Record<string, any>;

}



export interface CrmCnae {

  codigo: string;

  descricao?: string | null;

  principal?: boolean;

}



export interface CrmContatoEmpresa {

  id?: string;



  nome: string;



  telefone?: string | null;

  email?: string | null;



  cargo?: string | null;

  departamento?: string | null;



  principal?: boolean;



  observacao?: string | null;

}



// ============================================================

// DADOS OPERACIONAIS DA PESSOA

// ============================================================



export interface CrmPessoaDados {

  nome: string;



  modo_cadastro?: 'RAPIDO' | 'COMPLETO' | string;



  data_nascimento?: string | null;

  sexo?: string | null;

  estado_civil?: string | null;

  naturalidade?: string | null;

  ocupacao?: string | null;

  pep?: boolean;



  documentos?: CrmDocumentoPessoa;



  telefones?: CrmTelefone[];

  emails?: CrmEmail[];

  enderecos?: CrmEndereco[];



  origem?: string | null;

  canal_entrada?: string | null;



  fase_atendimento?: string | null;

  temperatura?: string | null;



  observacoes?: string | null;



  tags?: string[];
  produtos_interesse?: string[];

  campos_adicionais?: Record<string, any>;

}



// ============================================================

// DADOS OPERACIONAIS DA EMPRESA

// ============================================================



export interface CrmEmpresaDados {

  razao_social: string;



  nome_fantasia?: string | null;



  modo_cadastro?: 'RAPIDO' | 'COMPLETO' | string;



  situacao_cadastral?: string | null;



  data_abertura?: string | null;



  porte?: string | null;



  matriz_filial?: string | null;



  natureza_juridica?: string | null;



  capital_social?: number | null;



  cnae_principal?: string | null;

  cnae_principal_descricao?: string | null;



  cnaes_secundarios?: CrmCnae[];



  opcao_pelo_mei?: boolean | null;

  opcao_pelo_simples?: boolean | null;



  telefones?: CrmTelefone[];

  emails?: CrmEmail[];

  enderecos?: CrmEndereco[];



  contatos?: CrmContatoEmpresa[];



  origem?: string | null;

  canal_entrada?: string | null;



  fase_atendimento?: string | null;

  temperatura?: string | null;



  observacoes?: string | null;



  tags?: string[];
  produtos_interesse?: string[];

  campos_adicionais?: Record<string, any>;

}



// ============================================================

// ENTIDADES DO BANCO

// ============================================================



export interface CrmPessoa {
  id: string;
  corretora_id: string;
  corretor_id: string;
  cpf: string | null;
  cliente_id_legado: string | null;
  dados: CrmPessoaDados;
  classificacao: CrmClassificacao;
  etapa_kanban: CrmKanbanStage | null;
  posicao_kanban: number | null;
  created_at: string;
  updated_at: string;
}



export interface CrmEmpresa {
  id: string;
  corretora_id: string;
  corretor_id: string;
  cnpj: string | null;
  cliente_id_legado: string | null;
  dados: CrmEmpresaDados;
  dados_api_cnpj: Record<string, any>;
  classificacao: CrmClassificacao;
  etapa_kanban: CrmKanbanStage | null;
  posicao_kanban: number | null;
  created_at: string;
  updated_at: string;
}



export interface CrmPessoaEmpresaVinculo {

  id: string;



  corretora_id: string;



  pessoa_id: string;

  empresa_id: string;



  papel: string | null;

  origem_vinculo: string | null;



  created_at: string;

  updated_at: string;

}



// ============================================================

// TIPOS PARA CRIAÇÃO / ATUALIZAÇÃO

// ============================================================



export interface CriarCrmPessoaPayload {
  corretor_id?: string | null
  cpf?: string | null
  cliente_id_legado?: string | null
  dados: CrmPessoaDados
  classificacao?: CrmClassificacao
}



export interface AtualizarCrmPessoaPayload {

  corretor_id?: string;



  cpf?: string | null;



  dados?: Partial<CrmPessoaDados>;



  classificacao?: CrmClassificacao;

}



export interface CriarCrmEmpresaPayload {
  corretor_id?: string | null
  cnpj?: string | null
  cliente_id_legado?: string | null
  dados: CrmEmpresaDados
  dados_api_cnpj?: Record<string, any> | null
  classificacao?: CrmClassificacao
}



export interface AtualizarCrmEmpresaPayload {

  corretor_id?: string;



  cnpj?: string | null;



  dados?: Partial<CrmEmpresaDados>;



  dados_api_cnpj?: Record<string, any> | null;



  classificacao?: CrmClassificacao;

}



export interface CriarCrmVinculoPayload {

  pessoa_id: string;

  empresa_id: string;



  papel?: string | null;



  origem_vinculo?: string | null;

}



export interface AtualizarCrmVinculoPayload {

  papel?: string | null;

  origem_vinculo?: string | null;

}



// ============================================================

// RESULTADOS DE DUPLICIDADE

// ============================================================



export interface CrmVerificacaoDuplicidade {

  existe: boolean;

  pertence_ao_usuario: boolean;



  corretor_id: string | null;

  corretor_nome: string | null;



  entidade: 'PESSOA' | 'EMPRESA';

}



// ============================================================

// AUXILIARES

// ============================================================



const gerarIdLocal = (): string => {

  if (

    typeof crypto !== 'undefined' &&

    typeof crypto.randomUUID === 'function'

  ) {

    return crypto.randomUUID();

  }



  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;

};



const limparTexto = (

  valor: unknown

): string | null => {

  if (valor === undefined || valor === null) {

    return null;

  }



  const texto = String(valor).trim();



  return texto === '' ? null : texto;

};



const somenteNumeros = (

  valor: unknown

): string | null => {

  const texto = limparTexto(valor);



  if (!texto) {

    return null;

  }



  const numeros = texto.replace(/\D/g, '');



  return numeros || null;

};



const normalizarCpf = (

  cpf: unknown

): string | null => {

  const numeros = somenteNumeros(cpf);



  if (!numeros) {

    return null;

  }



  return numeros;

};



const normalizarCnpj = (

  cnpj: unknown

): string | null => {

  const numeros = somenteNumeros(cnpj);



  if (!numeros) {

    return null;

  }



  return numeros;

};



const normalizarBoolean = (

  valor: unknown,

  padrao: boolean | null = null

): boolean | null => {

  if (typeof valor === 'boolean') {

    return valor;

  }



  if (typeof valor === 'number') {

    return valor !== 0;

  }



  if (typeof valor === 'string') {

    const texto = valor.trim().toLowerCase();



    if (

      ['true', '1', 'sim', 's', 'yes'].includes(texto)

    ) {

      return true;

    }



    if (

      ['false', '0', 'não', 'nao', 'n', 'no'].includes(texto)

    ) {

      return false;

    }

  }



  return padrao;

};



const normalizarNumero = (

  valor: unknown

): number | null => {

  if (

    valor === undefined ||

    valor === null ||

    valor === ''

  ) {

    return null;

  }



  if (typeof valor === 'number') {

    return Number.isFinite(valor) ? valor : null;

  }



  const texto = String(valor)

    .trim()

    .replace(/\./g, '')

    .replace(',', '.');



  const numero = Number(texto);



  return Number.isFinite(numero)

    ? numero

    : null;

};



const normalizarTelefones = (

  telefones: CrmTelefone[] | undefined

): CrmTelefone[] => {

  if (!Array.isArray(telefones)) {

    return [];

  }



  return telefones

    .filter(Boolean)

    .map((telefone) => ({

      id: telefone.id || gerarIdLocal(),



      numero:

        limparTexto(telefone.numero) || '',



      tipo:

        limparTexto(telefone.tipo),



      whatsapp:

        Boolean(telefone.whatsapp),



      principal:

        Boolean(telefone.principal),



      observacao:

        limparTexto(telefone.observacao)

    }))

    .filter((telefone) => Boolean(telefone.numero));

};



const normalizarEmails = (

  emails: CrmEmail[] | undefined

): CrmEmail[] => {

  if (!Array.isArray(emails)) {

    return [];

  }



  return emails

    .filter(Boolean)

    .map((email) => ({

      id: email.id || gerarIdLocal(),



      email:

        limparTexto(email.email)?.toLowerCase() || '',



      tipo:

        limparTexto(email.tipo),



      principal:

        Boolean(email.principal),



      observacao:

        limparTexto(email.observacao)

    }))

    .filter((email) => Boolean(email.email));

};



const normalizarEnderecos = (

  enderecos: CrmEndereco[] | undefined

): CrmEndereco[] => {

  if (!Array.isArray(enderecos)) {

    return [];

  }



  return enderecos

    .filter(Boolean)

    .map((endereco) => ({

      id:

        endereco.id || gerarIdLocal(),



      tipo:

        limparTexto(endereco.tipo),



      principal:

        Boolean(endereco.principal),



      cep:

        somenteNumeros(endereco.cep),



      logradouro:

        limparTexto(endereco.logradouro),



      numero:

        limparTexto(endereco.numero),



      complemento:

        limparTexto(endereco.complemento),



      bairro:

        limparTexto(endereco.bairro),



      municipio:

        limparTexto(endereco.municipio),



      uf:

        limparTexto(endereco.uf)?.toUpperCase() || null,



      observacao:

        limparTexto(endereco.observacao)

    }));

};



const normalizarContatosEmpresa = (

  contatos: CrmContatoEmpresa[] | undefined

): CrmContatoEmpresa[] => {

  if (!Array.isArray(contatos)) {

    return [];

  }



  return contatos

    .filter(Boolean)

    .map((contato) => ({

      id:

        contato.id || gerarIdLocal(),



      nome:

        limparTexto(contato.nome) || '',



      telefone:

        limparTexto(contato.telefone),



      email:

        limparTexto(contato.email)?.toLowerCase() || null,



      cargo:

        limparTexto(contato.cargo),



      departamento:

        limparTexto(contato.departamento),



      principal:

        Boolean(contato.principal),



      observacao:

        limparTexto(contato.observacao)

    }))

    .filter((contato) => Boolean(contato.nome));

};



const normalizarCnaes = (

  cnaes: CrmCnae[] | undefined

): CrmCnae[] => {

  if (!Array.isArray(cnaes)) {

    return [];

  }



  return cnaes

    .filter(Boolean)

    .map((cnae) => ({

      codigo:

        limparTexto(cnae.codigo) || '',



      descricao:

        limparTexto(cnae.descricao),



      principal:

        Boolean(cnae.principal)

    }))

    .filter((cnae) => Boolean(cnae.codigo));

};



// ============================================================

// NORMALIZAÇÃO DOS DADOS DA PESSOA

// ============================================================



const normalizarDadosPessoa = (

  dados: CrmPessoaDados

): CrmPessoaDados => {

  return {

    nome:

      limparTexto(dados.nome) || '',



    modo_cadastro:

      limparTexto(dados.modo_cadastro) || 'COMPLETO',



    data_nascimento:

      limparTexto(dados.data_nascimento),



    sexo:

      limparTexto(dados.sexo),



    estado_civil:

      limparTexto(dados.estado_civil),



    naturalidade:

      limparTexto(dados.naturalidade),



    ocupacao:

      limparTexto(dados.ocupacao),



    pep:

      Boolean(dados.pep),



    documentos: {

      rg_numero:

        limparTexto(dados.documentos?.rg_numero),



      rg_orgao:

        limparTexto(dados.documentos?.rg_orgao),



      data_emissao_rg:

        limparTexto(dados.documentos?.data_emissao_rg),



      cnh_numero:

        limparTexto(dados.documentos?.cnh_numero),



      cnh_categoria:

        limparTexto(dados.documentos?.cnh_categoria),



      cnh_validade:

        limparTexto(dados.documentos?.cnh_validade),



      outros:

        dados.documentos?.outros || {}

    },



    telefones:

      normalizarTelefones(dados.telefones),



    emails:

      normalizarEmails(dados.emails),



    enderecos:

      normalizarEnderecos(dados.enderecos),



    origem:

      limparTexto(dados.origem) || 'MANUAL',



    canal_entrada:

      limparTexto(dados.canal_entrada),



    fase_atendimento:

      limparTexto(dados.fase_atendimento),



    temperatura:

      limparTexto(dados.temperatura),



    observacoes:

      limparTexto(dados.observacoes),



    tags:

      Array.isArray(dados.tags)

        ? dados.tags

            .map((tag) => limparTexto(tag))

            .filter((tag): tag is string => Boolean(tag))

        : [],

    produtos_interesse:
      Array.isArray(dados.produtos_interesse)
        ? [...new Set(dados.produtos_interesse.map((id) => limparTexto(id)).filter((id): id is string => Boolean(id)))]
        : [],



    campos_adicionais:

      dados.campos_adicionais || {}

  };

};



// ============================================================

// NORMALIZAÇÃO DOS DADOS DA EMPRESA

// ============================================================



const normalizarDadosEmpresa = (

  dados: CrmEmpresaDados

): CrmEmpresaDados => {

  return {

    razao_social:

      limparTexto(dados.razao_social) || '',



    nome_fantasia:

      limparTexto(dados.nome_fantasia),



    modo_cadastro:

      limparTexto(dados.modo_cadastro) || 'COMPLETO',



    situacao_cadastral:

      limparTexto(dados.situacao_cadastral),



    data_abertura:

      limparTexto(dados.data_abertura),



    porte:

      limparTexto(dados.porte),



    matriz_filial:

      limparTexto(dados.matriz_filial),



    natureza_juridica:

      limparTexto(dados.natureza_juridica),



    capital_social:

      normalizarNumero(dados.capital_social),



    cnae_principal:

      limparTexto(dados.cnae_principal),



    cnae_principal_descricao:

      limparTexto(dados.cnae_principal_descricao),



    cnaes_secundarios:

      normalizarCnaes(dados.cnaes_secundarios),



    opcao_pelo_mei:

      normalizarBoolean(

        dados.opcao_pelo_mei

      ),



    opcao_pelo_simples:

      normalizarBoolean(

        dados.opcao_pelo_simples

      ),



    telefones:

      normalizarTelefones(dados.telefones),



    emails:

      normalizarEmails(dados.emails),



    enderecos:

      normalizarEnderecos(dados.enderecos),



    contatos:

      normalizarContatosEmpresa(dados.contatos),



    origem:

      limparTexto(dados.origem) || 'MANUAL',



    canal_entrada:

      limparTexto(dados.canal_entrada),



    fase_atendimento:

      limparTexto(dados.fase_atendimento),



    temperatura:

      limparTexto(dados.temperatura),



    observacoes:

      limparTexto(dados.observacoes),



    tags:

      Array.isArray(dados.tags)

        ? dados.tags

            .map((tag) => limparTexto(tag))

            .filter((tag): tag is string => Boolean(tag))

        : [],

    produtos_interesse:
      Array.isArray(dados.produtos_interesse)
        ? [...new Set(dados.produtos_interesse.map((id) => limparTexto(id)).filter((id): id is string => Boolean(id)))]
        : [],



    campos_adicionais:

      dados.campos_adicionais || {}

  };

};



// ============================================================

// MERGE PROFUNDO CONTROLADO

// ============================================================



const mergePessoaDados = (

  atual: CrmPessoaDados,

  parcial: Partial<CrmPessoaDados>

): CrmPessoaDados => {

  return {

    ...atual,

    ...parcial,



    documentos:

      parcial.documentos !== undefined

        ? {

            ...(atual.documentos || {}),

            ...(parcial.documentos || {})

          }

        : atual.documentos,



    telefones:

      parcial.telefones !== undefined

        ? parcial.telefones

        : atual.telefones,



    emails:

      parcial.emails !== undefined

        ? parcial.emails

        : atual.emails,



    enderecos:

      parcial.enderecos !== undefined

        ? parcial.enderecos

        : atual.enderecos,



    tags:

      parcial.tags !== undefined

        ? parcial.tags

        : atual.tags,

    produtos_interesse:
      parcial.produtos_interesse !== undefined
        ? parcial.produtos_interesse
        : atual.produtos_interesse,



    campos_adicionais:

      parcial.campos_adicionais !== undefined

        ? {

            ...(atual.campos_adicionais || {}),

            ...(parcial.campos_adicionais || {})

          }

        : atual.campos_adicionais

  };

};



const mergeEmpresaDados = (

  atual: CrmEmpresaDados,

  parcial: Partial<CrmEmpresaDados>

): CrmEmpresaDados => {

  return {

    ...atual,

    ...parcial,



    telefones:

      parcial.telefones !== undefined

        ? parcial.telefones

        : atual.telefones,



    emails:

      parcial.emails !== undefined

        ? parcial.emails

        : atual.emails,



    enderecos:

      parcial.enderecos !== undefined

        ? parcial.enderecos

        : atual.enderecos,



    contatos:

      parcial.contatos !== undefined

        ? parcial.contatos

        : atual.contatos,



    cnaes_secundarios:

      parcial.cnaes_secundarios !== undefined

        ? parcial.cnaes_secundarios

        : atual.cnaes_secundarios,



    tags:

      parcial.tags !== undefined

        ? parcial.tags

        : atual.tags,

    produtos_interesse:
      parcial.produtos_interesse !== undefined
        ? parcial.produtos_interesse
        : atual.produtos_interesse,



    campos_adicionais:

      parcial.campos_adicionais !== undefined

        ? {

            ...(atual.campos_adicionais || {}),

            ...(parcial.campos_adicionais || {})

          }

        : atual.campos_adicionais

  };

};



// ============================================================

// SESSÃO / PERFIL

// ============================================================



export async function obterSessaoCrm(): Promise<CrmUsuarioSessao> {

  const {

    data: { user },

    error: authError

  } = await supabase.auth.getUser();



  if (authError) {

    throw authError;

  }



  if (!user?.id) {

    throw new Error('Usuário não autenticado.');

  }



  const { data: perfil, error } = await supabase

    .from('usuarios_perfis')

    .select(`

      id,

      corretora_id,

      tipo_usuario,

      ativo

    `)

    .eq('id', user.id)

    .single();



  if (error) {

    throw error;

  }



  if (!perfil) {

    throw new Error('Perfil do usuário não encontrado.');

  }



  if (!perfil.ativo) {

    throw new Error('Usuário inativo.');

  }



  if (

    perfil.tipo_usuario !== 'CORRETORA' &&

    perfil.tipo_usuario !== 'CORRETOR'

  ) {

    throw new Error('Tipo de usuário inválido.');

  }



  return {

    id: perfil.id,

    corretora_id: perfil.corretora_id,

    tipo_usuario: perfil.tipo_usuario

  };

}



// ============================================================

// DEFINIÇÃO DO RESPONSÁVEL

// ============================================================



const resolverResponsavel = async (

  sessao: CrmUsuarioSessao,

  corretorSolicitado?: string | null

): Promise<string> => {

  if (sessao.tipo_usuario === 'CORRETOR') {

    return sessao.id;

  }



  if (!corretorSolicitado) {

    throw new Error(

      'Informe o corretor responsável pelo cliente.'

    );

  }



  const { data, error } = await supabase

    .from('usuarios_perfis')

    .select(`

      id,

      corretora_id,

      tipo_usuario,

      ativo

    `)

    .eq('id', corretorSolicitado)

    .eq('corretora_id', sessao.corretora_id)

    .eq('ativo', true)

    .maybeSingle();



  if (error) {

    throw error;

  }



  if (!data) {

    throw new Error(

      'O responsável informado não pertence à corretora ou está inativo.'

    );

  }



  return data.id;

};



// ============================================================

// TRATAMENTO DE ERROS DE DUPLICIDADE

// ============================================================



const tratarErroDuplicidade = (

  error: any,

  entidade: 'CPF' | 'CNPJ'

): never => {

  if (error?.code === '23505') {

    throw new Error(

      `${entidade} já cadastrado nesta corretora. ` +

      'O cadastro pode ter sido realizado por outro usuário após a verificação inicial. ' +

      'Atualize a pesquisa e tente novamente.'

    );

  }



  throw error;

};



export function obterMensagemDocumentoExistente(

  resultado: CrmVerificacaoDuplicidade,

  tipo: 'CPF' | 'CNPJ'

): string | null {

  if (!resultado.existe) {

    return null;

  }



  if (resultado.pertence_ao_usuario) {

    return `Este ${tipo} já está cadastrado na sua carteira.`;

  }



  if (resultado.corretor_nome) {

    return (

      `Este ${tipo} já está cadastrado nesta corretora e pertence ` +

      `à carteira de ${resultado.corretor_nome}.`

    );

  }



  return `Este ${tipo} já está cadastrado nesta corretora.`;

}



// ============================================================

// BUSCAR PESSOA

// ============================================================



export async function buscarPessoaPorId(

  id: string

): Promise<CrmPessoa | null> {

  if (!id) {

    return null;

  }



  const { data, error } = await supabase

    .from('crm_pessoas')

    .select('*')

    .eq('id', id)

    .maybeSingle();



  if (error) {

    throw error;

  }



  return data as CrmPessoa | null;

}



// ============================================================

// BUSCAR EMPRESA

// ============================================================



export async function buscarEmpresaPorId(

  id: string

): Promise<CrmEmpresa | null> {

  if (!id) {

    return null;

  }



  const { data, error } = await supabase

    .from('crm_empresas')

    .select('*')

    .eq('id', id)

    .maybeSingle();



  if (error) {

    throw error;

  }



  return data as CrmEmpresa | null;

}



// ============================================================

// VERIFICAÇÃO DE DOCUMENTO NA CORRETORA

// ============================================================



async function verificarDocumentoExistente(

  tipo: 'CPF' | 'CNPJ',

  documento: string

): Promise<CrmVerificacaoDuplicidade> {

  const documentoNormalizado =

    tipo === 'CPF'

      ? normalizarCpf(documento)

      : normalizarCnpj(documento);



  const entidade: 'PESSOA' | 'EMPRESA' =

    tipo === 'CPF'

      ? 'PESSOA'

      : 'EMPRESA';



  if (!documentoNormalizado) {

    return {

      existe: false,

      pertence_ao_usuario: false,

      corretor_id: null,

      corretor_nome: null,

      entidade

    };

  }



  const { data, error } = await supabase.rpc(

    'crm_verificar_documento_existente',

    {

      p_tipo: tipo,

      p_documento: documentoNormalizado

    }

  );



  if (error) {

    console.error(

      `Erro ao verificar ${tipo} na base da corretora:`,

      error

    );



    throw error;

  }



  const resultado =

    Array.isArray(data)

      ? data[0]

      : data;



  if (!resultado) {

    return {

      existe: false,

      pertence_ao_usuario: false,

      corretor_id: null,

      corretor_nome: null,

      entidade

    };

  }



  return {

    existe: Boolean(resultado.existe),



    pertence_ao_usuario: Boolean(

      resultado.pertence_ao_usuario

    ),



    corretor_id:

      resultado.corretor_id || null,



    corretor_nome:

      resultado.corretor_nome || null,



    entidade

  };

}



// ============================================================

// VERIFICAR CPF

// ============================================================



export async function verificarCpfExistente(

  cpf: string

): Promise<CrmVerificacaoDuplicidade> {

  return verificarDocumentoExistente(

    'CPF',

    cpf

  );

}



// ============================================================

// VERIFICAR CNPJ

// ============================================================



export async function verificarCnpjExistente(

  cnpj: string

): Promise<CrmVerificacaoDuplicidade> {

  return verificarDocumentoExistente(

    'CNPJ',

    cnpj

  );

}





// ============================================================

// CRIAR PESSOA

// ============================================================



export async function criarPessoa(

  payload: CriarCrmPessoaPayload

): Promise<CrmPessoa> {

  const sessao = await obterSessaoCrm();



  const corretorId = await resolverResponsavel(

    sessao,

    payload.corretor_id

  );



  const cpf = normalizarCpf(payload.cpf);



  const dados = normalizarDadosPessoa(

    payload.dados

  );



  if (!dados.nome) {

    throw new Error(

      'O nome da pessoa é obrigatório.'

    );

  }



  const registro = {
    corretora_id: sessao.corretora_id,
    corretor_id: corretorId,
    cpf,
    cliente_id_legado: payload.cliente_id_legado || null,
    dados,
    classificacao: payload.classificacao || 'NAO_QUALIFICADO'
  }



  const { data, error } = await supabase

    .from('crm_pessoas')

    .insert(registro)

    .select()

    .single();



  if (error) {

    tratarErroDuplicidade(

      error,

      'CPF'

    );

  }



  return data as CrmPessoa;

}



// ============================================================

// CRIAR EMPRESA

// ============================================================



export async function criarEmpresa(

  payload: CriarCrmEmpresaPayload

): Promise<CrmEmpresa> {

  const sessao = await obterSessaoCrm();



  const corretorId = await resolverResponsavel(

    sessao,

    payload.corretor_id

  );



  const cnpj = normalizarCnpj(payload.cnpj);



  const dados = normalizarDadosEmpresa(

    payload.dados

  );



  if (!dados.razao_social) {

    throw new Error(

      'A razão social é obrigatória.'

    );

  }



  const registro = {
    corretora_id: sessao.corretora_id,
    corretor_id: corretorId,
    cnpj,
    cliente_id_legado: payload.cliente_id_legado || null,
    dados,
    dados_api_cnpj: payload.dados_api_cnpj || {},
    classificacao: payload.classificacao || 'NAO_QUALIFICADO'
  }



  const { data, error } = await supabase

    .from('crm_empresas')

    .insert(registro)

    .select()

    .single();



  if (error) {

    tratarErroDuplicidade(

      error,

      'CNPJ'

    );

  }



  return data as CrmEmpresa;

}



// ============================================================

// ATUALIZAR PESSOA

// ============================================================



export async function atualizarPessoa(

  id: string,

  payload: AtualizarCrmPessoaPayload

): Promise<CrmPessoa> {

  if (!id) {

    throw new Error(

      'ID da pessoa não informado.'

    );

  }



  const atual =

    await buscarPessoaPorId(id);



  if (!atual) {

    throw new Error(

      'Pessoa não encontrada.'

    );

  }



  const sessao =

    await obterSessaoCrm();



  const update: Record<string, any> = {};



  if (payload.cpf !== undefined) {

    update.cpf =

      normalizarCpf(payload.cpf);

  }



  if (payload.dados !== undefined) {

    const dadosMesclados =

      mergePessoaDados(

        atual.dados || ({ nome: '' } as CrmPessoaDados),

        payload.dados

      );



    update.dados =

      normalizarDadosPessoa(

        dadosMesclados

      );

  }



  if (payload.classificacao !== undefined) {
    update.classificacao = payload.classificacao;

    if (payload.classificacao === 'NAO_QUALIFICADO') {
      update.etapa_kanban = null;
      update.posicao_kanban = null;
    } else if (
      atual.classificacao !== 'LEAD' ||
      !atual.etapa_kanban
    ) {
      update.etapa_kanban = 'prospeccao';
      update.posicao_kanban = 0;
    }
  }



  if (

    payload.corretor_id !== undefined

  ) {

    if (

      sessao.tipo_usuario !== 'CORRETORA'

    ) {

      if (

        payload.corretor_id !== sessao.id

      ) {

        throw new Error(

          'Somente a corretora pode transferir a responsabilidade pelo cliente.'

        );

      }

    }



    update.corretor_id =

      await resolverResponsavel(

        sessao,

        payload.corretor_id

      );

  }



  const { data, error } = await supabase

    .from('crm_pessoas')

    .update(update)

    .eq('id', id)

    .select()

    .single();



  if (error) {

    tratarErroDuplicidade(

      error,

      'CPF'

    );

  }



  return data as CrmPessoa;

}



// ============================================================

// ATUALIZAR EMPRESA

// ============================================================



export async function atualizarEmpresa(

  id: string,

  payload: AtualizarCrmEmpresaPayload

): Promise<CrmEmpresa> {

  if (!id) {

    throw new Error(

      'ID da empresa não informado.'

    );

  }



  const atual =

    await buscarEmpresaPorId(id);



  if (!atual) {

    throw new Error(

      'Empresa não encontrada.'

    );

  }



  const sessao =

    await obterSessaoCrm();



  const update: Record<string, any> = {};



  if (payload.cnpj !== undefined) {

    update.cnpj =

      normalizarCnpj(payload.cnpj);

  }



  if (payload.dados !== undefined) {

    const dadosMesclados =

      mergeEmpresaDados(

        atual.dados || ({ razao_social: '' } as CrmEmpresaDados),

        payload.dados

      );



    update.dados =

      normalizarDadosEmpresa(

        dadosMesclados

      );

  }



  if (

    payload.dados_api_cnpj !== undefined

  ) {

    update.dados_api_cnpj =

      payload.dados_api_cnpj || {};

  }



  if (payload.classificacao !== undefined) {
    update.classificacao = payload.classificacao;

    if (payload.classificacao === 'NAO_QUALIFICADO') {
      update.etapa_kanban = null;
      update.posicao_kanban = null;
    } else if (
      atual.classificacao !== 'LEAD' ||
      !atual.etapa_kanban
    ) {
      update.etapa_kanban = 'prospeccao';
      update.posicao_kanban = 0;
    }
  }



  if (

    payload.corretor_id !== undefined

  ) {

    if (

      sessao.tipo_usuario !== 'CORRETORA'

    ) {

      if (

        payload.corretor_id !== sessao.id

      ) {

        throw new Error(

          'Somente a corretora pode transferir a responsabilidade pela empresa.'

        );

      }

    }



    update.corretor_id =

      await resolverResponsavel(

        sessao,

        payload.corretor_id

      );

  }



  const { data, error } = await supabase

    .from('crm_empresas')

    .update(update)

    .eq('id', id)

    .select()

    .single();



  if (error) {

    tratarErroDuplicidade(

      error,

      'CNPJ'

    );

  }



  return data as CrmEmpresa;

}



// ============================================================

// EXCLUIR PESSOA

// ============================================================



export async function excluirPessoa(

  id: string

): Promise<void> {

  if (!id) {

    throw new Error(

      'ID da pessoa não informado.'

    );

  }



  const { error } = await supabase

    .from('crm_pessoas')

    .delete()

    .eq('id', id);



  if (error) {

    throw error;

  }

}



// ============================================================

// EXCLUIR EMPRESA

// ============================================================



export async function excluirEmpresa(

  id: string

): Promise<void> {

  if (!id) {

    throw new Error(

      'ID da empresa não informado.'

    );

  }



  const { error } = await supabase

    .from('crm_empresas')

    .delete()

    .eq('id', id);



  if (error) {

    throw error;

  }

}



// ============================================================

// CRIAR VÍNCULO PESSOA ↔ EMPRESA

// ============================================================



export async function criarVinculoPessoaEmpresa(

  payload: CriarCrmVinculoPayload

): Promise<CrmPessoaEmpresaVinculo> {

  const sessao =

    await obterSessaoCrm();



  if (!payload.pessoa_id) {

    throw new Error(

      'Pessoa não informada.'

    );

  }



  if (!payload.empresa_id) {

    throw new Error(

      'Empresa não informada.'

    );

  }



  const registro = {

    corretora_id:

      sessao.corretora_id,



    pessoa_id:

      payload.pessoa_id,



    empresa_id:

      payload.empresa_id,



    papel:

      limparTexto(payload.papel),



    origem_vinculo:

      limparTexto(

        payload.origem_vinculo

      ) || 'MANUAL'

  };



  const { data, error } = await supabase

    .from(

      'crm_pessoas_empresas_vinculos'

    )

    .insert(registro)

    .select()

    .single();



  if (error) {

    if (error.code === '23505') {

      throw new Error(

        'Esta pessoa já possui vínculo com esta empresa.'

      );

    }



    throw error;

  }



  return data as CrmPessoaEmpresaVinculo;

}



// ============================================================

// ATUALIZAR VÍNCULO

// ============================================================



export async function atualizarVinculoPessoaEmpresa(

  id: string,

  payload: AtualizarCrmVinculoPayload

): Promise<CrmPessoaEmpresaVinculo> {

  if (!id) {

    throw new Error(

      'ID do vínculo não informado.'

    );

  }



  const update: Record<string, any> = {};



  if (payload.papel !== undefined) {

    update.papel =

      limparTexto(payload.papel);

  }



  if (

    payload.origem_vinculo !== undefined

  ) {

    update.origem_vinculo =

      limparTexto(

        payload.origem_vinculo

      );

  }



  const { data, error } = await supabase

    .from(

      'crm_pessoas_empresas_vinculos'

    )

    .update(update)

    .eq('id', id)

    .select()

    .single();



  if (error) {

    throw error;

  }



  return data as CrmPessoaEmpresaVinculo;

}



// ============================================================

// REMOVER VÍNCULO

// ============================================================



export async function removerVinculoPessoaEmpresa(

  id: string

): Promise<void> {

  if (!id) {

    throw new Error(

      'ID do vínculo não informado.'

    );

  }



  const { error } = await supabase

    .from(

      'crm_pessoas_empresas_vinculos'

    )

    .delete()

    .eq('id', id);



  if (error) {

    throw error;

  }

}



// ============================================================

// VÍNCULOS DA EMPRESA

// ============================================================



export async function buscarVinculosDaEmpresa(

  empresaId: string

): Promise<

  Array<

    CrmPessoaEmpresaVinculo & {

      pessoa: CrmPessoa | null;

    }

  >

> {

  if (!empresaId) {

    return [];

  }



  const { data, error } = await supabase

    .from(

      'crm_pessoas_empresas_vinculos'

    )

    .select(`

      *,

      pessoa:crm_pessoas(*)

    `)

    .eq('empresa_id', empresaId)

    .order('created_at', {

      ascending: true

    });



  if (error) {

    throw error;

  }



  return (data || []) as Array<

    CrmPessoaEmpresaVinculo & {

      pessoa: CrmPessoa | null;

    }

  >;

}



// ============================================================

// VÍNCULOS DA PESSOA

// ============================================================



export async function buscarVinculosDaPessoa(

  pessoaId: string

): Promise<

  Array<

    CrmPessoaEmpresaVinculo & {

      empresa: CrmEmpresa | null;

    }

  >

> {

  if (!pessoaId) {

    return [];

  }



  const { data, error } = await supabase

    .from(

      'crm_pessoas_empresas_vinculos'

    )

    .select(`

      *,

      empresa:crm_empresas(*)

    `)

    .eq('pessoa_id', pessoaId)

    .order('created_at', {

      ascending: true

    });



  if (error) {

    throw error;

  }



  return (data || []) as Array<

    CrmPessoaEmpresaVinculo & {

      empresa: CrmEmpresa | null;

    }

  >;

}



// ============================================================

// TRANSFERIR PESSOA

// A própria RLS continua sendo a proteção definitiva.

// ============================================================



export async function transferirPessoa(

  pessoaId: string,

  novoCorretorId: string

): Promise<CrmPessoa> {

  const sessao =

    await obterSessaoCrm();



  if (

    sessao.tipo_usuario !== 'CORRETORA'

  ) {

    throw new Error(

      'Somente a corretora pode transferir clientes.'

    );

  }



  return atualizarPessoa(

    pessoaId,

    {

      corretor_id:

        novoCorretorId

    }

  );

}



// ============================================================

// TRANSFERIR EMPRESA

// ============================================================



export async function transferirEmpresa(

  empresaId: string,

  novoCorretorId: string

): Promise<CrmEmpresa> {

  const sessao =

    await obterSessaoCrm();



  if (

    sessao.tipo_usuario !== 'CORRETORA'

  ) {

    throw new Error(

      'Somente a corretora pode transferir empresas.'

    );

  }



  return atualizarEmpresa(

    empresaId,

    {

      corretor_id:

        novoCorretorId

    }

  );

}



// ============================================================

// ENVIAR PESSOA PARA LEAD

// ============================================================



export async function enviarPessoaParaLead(
  pessoaId: string
): Promise<CrmPessoa> {
  if (!pessoaId) {
    throw new Error(
      'Pessoa não informada.'
    );
  }

  return atualizarPessoa(
    pessoaId,
    {
      classificacao: 'LEAD',
    }
  );
}



// ============================================================

// ENVIAR EMPRESA PARA LEAD

// ============================================================



export async function enviarEmpresaParaLead(
  empresaId: string
): Promise<CrmEmpresa> {
  if (!empresaId) {
    throw new Error(
      'Empresa não informada.'
    );
  }

  return atualizarEmpresa(
    empresaId,
    {
      classificacao: 'LEAD',
    }
  );
}

// ============================================================
// PORTFÓLIO DE PRODUTOS DA CORRETORA
// ============================================================
export interface CrmProdutoPortfolio {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  seguradoras: Array<{ id: string; nome: string; logo_url: string | null }>;
}

export async function buscarProdutosPortfolioCrm(): Promise<CrmProdutoPortfolio[]> {
  const sessao = await obterSessaoCrm();
  const { data, error } = await supabase
    .from('tab_corretora_portfolio')
    .select(`
      base_produto:base_produtos(id, nome, categoria, descricao),
      base_seguradora:base_seguradoras(id, nome, logo_url, ativo)
    `)
    .eq('corretora_id', sessao.corretora_id)
    .not('base_produto_id', 'is', null);
  if (error) throw error;
  const mapa = new Map<string, CrmProdutoPortfolio>();
  for (const item of data || []) {
    const produtoRaw = Array.isArray((item as any).base_produto) ? (item as any).base_produto[0] : (item as any).base_produto;
    const seguradoraRaw = Array.isArray((item as any).base_seguradora) ? (item as any).base_seguradora[0] : (item as any).base_seguradora;
    if (!produtoRaw?.id) continue;
    const existente: CrmProdutoPortfolio = mapa.get(produtoRaw.id) || {
      id: produtoRaw.id,
      nome: produtoRaw.nome,
      categoria: produtoRaw.categoria || null,
      descricao: produtoRaw.descricao || null,
      seguradoras: []
    };
    if (seguradoraRaw?.id && seguradoraRaw.ativo !== false && !existente.seguradoras.some((s) => s.id === seguradoraRaw.id)) {
      existente.seguradoras.push({ id: seguradoraRaw.id, nome: seguradoraRaw.nome, logo_url: seguradoraRaw.logo_url || null });
    }
    mapa.set(produtoRaw.id, existente);
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
