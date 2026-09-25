import { supabase } from "../../lib/supabaseClient";

export interface FiltrosClientesV2 {
  buscaGlobal?: string;
  uf?: string;
  municipio?: string;
  bairro?: string;
  cep?: string;
  situacao_cadastral?: string;
  cnae_principal: string[];
  tipo_cliente?: string;
  origem?: string;
  fase_atendimento?: string;
  temperatura?: string;
  status_kanban?: string;
  fase_kanban?: string;
  corretor_id?: string;
  porte?: string;
  matriz_filial?: string;
  opcao_pelo_mei?: string;
  opcao_pelo_simples?: string;
  busca_socio?: string;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  
  // Grupo Retorno CRM & Interações
  data_retorno_inicio?: string;
  data_retorno_fim?: string;
  data_retorno_sinistro_inicio?: string;
  data_retorno_sinistro_fim?: string;
  tipo_acao?: string;
  proxima_acao_interacao?: string;

  data_venda_inicio?: string;
  data_venda_fim?: string;
  valor_proposta_min?: number | string;
  valor_proposta_max?: number | string;
  status_proposta?: string;
  seguradora_id?: string;
  produto_id?: string;
  data_cotacao_inicio?: string;
  data_cotacao_fim?: string;
  data_inicio_vigencia?: string;
  data_fim_vigencia?: string;
  periodicidade?: string;
  status_renovacao?: string;
}

export interface ClienteV2Formatado {
  id: string;
  tipo_cliente: 'PF' | 'PJ';
  nome_razao_social: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  municipio: string | null;
  uf: string | null;
  socios_texto: string;
  responsavel_nome: string;
  data_retorno: string | null;
  proxima_acao: string | null;
  produtos: string[];
  clienteOriginal: any;
  status_kanban?: string;
}

interface UsuarioSessao {
  id: string;
  corretora_id: string;
  tipo_usuario?: string;
}

export interface CnaeOpcao {
  cnae_principal: string;
  count: number;
}

// ==========================================
// FUNÇÕES AUXILIARES / SANITIZAÇÃO
// ==========================================

const parseRealJson = (valor: any, padrao: any = null) => {
  if (!valor) return padrao;
  let atual = valor;
  while (typeof atual === 'string') {
    try {
      atual = JSON.parse(atual);
    } catch {
      break;
    }
  }
  return atual || padrao;
};

const padronizarContatos = (contatosInput: any) => {
  const lista = parseRealJson(contatosInput, []);
  if (!Array.isArray(lista)) return [];

  return lista.map((c: any) => {
    // Trata endereço vindo de sub-objeto ou vindo direto da raiz do contato
    const end = c.endereco || {};

    return {
      id: c.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      nome: c.nome || '',
      sexo: c.sexo || '',
      email: c.email || '',
      telefone: c.telefone || '',
      principal: typeof c.principal === 'boolean' ? c.principal : false,
      data_nascimento: c.data_nascimento || '',
      cargo_parentesco: c.cargo_parentesco || c.cargo || '',

      // Documentos e Dados Pessoais (Suporta as variações de chave)
      cpf: c.cpf || '',
      rg: c.rg || c.rg_numero || '',
      rg_numero: c.rg || c.rg_numero || '', // Mantém compatibilidade com ambas as chaves
      rg_orgao: c.rg_orgao || '',
      data_emissao_rg: c.data_emissao_rg || c.data_emissao_doc || '',
      data_emissao_doc: c.data_emissao_rg || c.data_emissao_doc || '', // Mantém compatibilidade com ambas as chaves
      estado_civil: c.estado_civil || '',
      naturalidade: c.naturalidade || '',
      ocupacao: c.ocupacao || '',
      outros: c.outros || '',

      // Endereço Próprio (Lê da raiz 'c.cep' ou do objeto 'c.endereco.cep')
      usar_endereco_principal: typeof c.usar_endereco_principal === 'boolean' ? c.usar_endereco_principal : true,
      cep: c.cep || end.cep || '',
      uf: c.uf || end.uf || '',
      municipio: c.municipio || end.municipio || '',
      bairro: c.bairro || end.bairro || '',
      logradouro: c.logradouro || end.logradouro || '',
      numero: c.numero || end.numero || '',
      complemento: c.complemento || end.complemento || '',

      // Sub-objeto 'endereco' espelhado para retrocompatibilidade
      endereco: {
        cep: c.cep || end.cep || '',
        logradouro: c.logradouro || end.logradouro || '',
        numero: c.numero || end.numero || '',
        bairro: c.bairro || end.bairro || '',
        municipio: c.municipio || end.municipio || '',
        uf: c.uf || end.uf || '',
        complemento: c.complemento || end.complemento || ''
      },

      // Flags de visibilidade de interface (para não fechar as seções abertas ao salvar)
      mostrarEndereco: !!c.mostrarEndereco,
      mostrarDocs: !!c.mostrarDocs
    };
  });
};

const padronizarSocios = (sociosInput: any) => {
  const lista = parseRealJson(sociosInput, []);
  if (!Array.isArray(lista)) return [];

  return lista.map((s: any) => ({
    nome: s.nome || '',
    cpf_cnpj: s.cpf_cnpj || '',
    faixa_etaria: s.faixa_etaria || '',
    qualificacao: s.qualificacao || 'Sócio'
  }));
};

// ==========================================
// CONSULTAS E OPERAÇÕES BASE
// ==========================================

export async function buscarHistoricoInteracoesPorCliente(clienteId: string) {
  if (!clienteId) return [];

  const { data, error } = await supabase
    .from('tab_interacoes')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de interações:', error);
    return [];
  }

  return data || [];
}

export async function buscarClienteCompletoPorId(id: string) {
  try {
    const { data, error } = await supabase
      .from('tab_clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar dados completos do cliente:", error);
    return null;
  }
}

export async function excluirClienteV2(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tab_clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao excluir cliente no service:", error);
    return false;
  }
}

export async function buscarListaCnaes(): Promise<CnaeOpcao[]> {
  const { data, error } = await supabase.rpc('get_cnaes_agrupados');

  if (error) {
    console.error('Erro ao buscar lista de CNAEs:', error);
    return [];
  }

  return data || [];
}

const obterDadosSessao = async (): Promise<UsuarioSessao | null> => {
  try {
    const chavesSessao = ['usuario_logado', 'user', 'usuario', 'auth_user', 'sb-user'];
    for (const chave of chavesSessao) {
      const item = localStorage.getItem(chave);
      if (item) {
        const parsed = JSON.parse(item);
        const u = parsed?.user || parsed?.perfil || parsed;
        if (u?.corretora_id && u?.id) {
          return {
            id: u.id,
            corretora_id: u.corretora_id,
            tipo_usuario: u.tipo_usuario
          };
        }
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, corretora_id, tipo_usuario')
        .eq('id', session.user.id)
        .single();
      
      if (perfil) return perfil;
    }
  } catch (err) {
    console.error('Erro ao recuperar sessão:', err);
  }

  return null;
};

// Helper para tratar valores vazios ou undefined e não passar strings vazias para o Postgres
const cleanVal = (val: any) => (val === "" || val === undefined ? null : val);

// ==========================================
// CRIAR NOVO CLIENTE
// ==========================================
export async function criarClienteV2(payload: any) {
  try {
    // 1. Extrai campos aceitando camelCase ou snake_case
    const tipoCliente = payload.tipo_cliente || payload.tipoCliente;
    let corretoraId = payload.corretora_id || payload.corretoraId || null;
    let corretorId = payload.corretor_id || payload.corretorId || payload.dono_id || null;
    const nomeRazaoSocial = payload.nome_razao_social || payload.nomeRazaoSocial;
    const cpfCnpjBruto = payload.cpf_cnpj || payload.cpfCnpj;
    const cpfCnpj = cpfCnpjBruto ? String(cpfCnpjBruto).replace(/\D/g, '') : null;

    // Validação de tipo
    if (!tipoCliente) {
      throw new Error("O campo 'tipo_cliente' (PF ou PJ) é obrigatório.");
    }

    // 2. BUSCA O PERFIL REAL DO USUÁRIO LOGADO NO BANCO DE DADOS
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, corretora_id, tipo_usuario')
        .eq('id', user.id)
        .maybeSingle();

      if (perfil) {
        if (perfil.tipo_usuario === 'CORRETORA') {
          corretoraId = perfil.id;
        } else if (perfil.corretora_id) {
          corretoraId = perfil.corretora_id;
        }

        if (!corretorId) {
          corretorId = user.id;
        }
      }
    }

    // Trava de segurança para impedir salvar o cliente se a corretora_id for inválida
    if (!corretoraId) {
      throw new Error("Não foi possível determinar o 'corretora_id'. Verifique se o perfil do usuário possui uma corretora vinculada.");
    }

    const isPF = tipoCliente === 'PF';

    const dadosPF = isPF ? {
      modo_cadastro: payload.modoCadastro || payload.modo_cadastro || 'COMPLETO',
      naturalidade: cleanVal(payload.naturalidade),
      pep: Boolean(payload.pep),
      data_nascimento: cleanVal(payload.data_nascimento),
      sexo: cleanVal(payload.sexo),
      ocupacao: cleanVal(payload.ocupacao),
      rg_numero: cleanVal(payload.rg_numero || payload.rg),
      rg_orgao: cleanVal(payload.rg_orgao),
      data_emissao_rg: cleanVal(payload.data_emissao_rg),
      estado_civil: cleanVal(payload.estado_civil)
    } : {};

    const dadosReceitaObj = parseRealJson(payload.dados_pj || payload.dadosReceita, {});
    
    const dadosPJ = !isPF ? {
      porte: cleanVal(payload.porte || dadosReceitaObj.porte),
      data_abertura: cleanVal(payload.dataAbertura || payload.data_abertura || dadosReceitaObj.data_abertura),
      matriz_filial: cleanVal(payload.matrizFilial || payload.matriz_filial || dadosReceitaObj.matriz_filial),
      modo_cadastro: payload.modoCadastro || payload.modo_cadastro || 'RAPIDO',
      capital_social: cleanVal(payload.capitalSocial || payload.capital_social || dadosReceitaObj.capital_social),
      cnae_principal: cleanVal(payload.cnaePrincipal || payload.cnae_principal || dadosReceitaObj.cnae_principal),
      opcao_pelo_mei: Boolean(payload.opcaoPeloMei ?? payload.opcao_pelo_mei ?? dadosReceitaObj.opcao_pelo_mei),
      natureza_juridica: cleanVal(payload.naturezaJuridica || payload.natureza_juridica || dadosReceitaObj.natureza_juridica),
      opcao_pelo_simples: Boolean(payload.opcaoPeloSimples ?? payload.opcao_pelo_simples ?? dadosReceitaObj.opcao_pelo_simples),
      situacao_cadastral: payload.situacaoCadastral || payload.situacao_cadastral || dadosReceitaObj.situacao_cadastral || 'ATIVA'
    } : {};

    // Garante que contatos e socios sejam sempre arrays válidos
    const contatosTratados = padronizarContatos(payload.contatos);
    const sociosTratados = padronizarSocios(payload.socios);

    const novoCliente = {
      corretora_id: corretoraId,
      corretor_id: corretorId,
      tipo_cliente: tipoCliente,
      fase_atendimento: payload.fase_atendimento || payload.faseAtendimento || 'LEAD',
      origem: payload.origem || 'MANUAL',
      cpf_cnpj: cpfCnpj || null,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: cleanVal(payload.nome_fantasia || payload.nomeFantasia),
      
      // Endereço Principal
      cep: cleanVal(payload.cep),
      logradouro: cleanVal(payload.logradouro),
      numero: cleanVal(payload.numero),
      bairro: cleanVal(payload.bairro),
      municipio: cleanVal(payload.municipio),
      uf: cleanVal(payload.uf),
      complemento: cleanVal(payload.complemento),
      
      // Mapeamento correto do CNAE e Situação para a raiz da tabela
      cnae_principal: cleanVal(payload.cnae_principal || payload.cnaePrincipal || dadosPJ.cnae_principal),
      situacao_cadastral: payload.situacao_cadastral || payload.situacaoCadastral || dadosPJ.situacao_cadastral || 'ATIVA',

      // JSONB
      contatos: Array.isArray(contatosTratados) ? contatosTratados : [],
      socios: Array.isArray(sociosTratados) ? sociosTratados : [],
      dados_complementares_pf: dadosPF,
      dados_complementares_pj: dadosPJ
    };

    const { data, error } = await supabase
      .from('tab_clientes')
      .insert([novoCliente])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao criar cliente no service:", error);
    throw error;
  }
}

// ==========================================
// ATUALIZAR CLIENTE EXISTENTE
// ==========================================
export async function atualizarClienteV2(id: string, payload: any) {
  try {
    if (!id) {
      throw new Error('ID do cliente não informado.');
    }

    const clienteAtual = await buscarClienteCompletoPorId(id);

    if (!clienteAtual) {
      throw new Error(`Cliente ${id} não encontrado.`);
    }

    const tipoCliente = payload.tipo_cliente || payload.tipoCliente || clienteAtual.tipo_cliente;
    const isPF = tipoCliente === 'PF';

    const cpfCnpjBruto = payload.cpf_cnpj ?? payload.cpfCnpj;
    const cpfCnpjTratado = cpfCnpjBruto !== undefined 
      ? (cpfCnpjBruto ? String(cpfCnpjBruto).replace(/\D/g, '') : null) 
      : clienteAtual.cpf_cnpj;

    const nomeRazaoSocial =
      payload.nome_razao_social ??
      payload.nomeRazaoSocial ??
      clienteAtual.nome_razao_social;

    const nomeFantasia =
      payload.nome_fantasia ??
      payload.nomeFantasia ??
      clienteAtual.nome_fantasia;

    const corretorId =
      payload.corretor_id ||
      payload.corretorId ||
      payload.dono_id ||
      payload.donoId ||
      clienteAtual.corretor_id ||
      null;

    const pfAtuais = parseRealJson(clienteAtual.dados_complementares_pf, {});
    const pjAtuais = parseRealJson(clienteAtual.dados_complementares_pj, {});
    const dadosPJRecebidos = parseRealJson(
      payload.dados_pj || payload.dadosReceita,
      {}
    );

    const dadosPF = isPF
      ? {
          ...pfAtuais,
          modo_cadastro:
            payload.modoCadastro ||
            payload.modo_cadastro ||
            pfAtuais.modo_cadastro ||
            'COMPLETO',

          naturalidade:
            payload.naturalidade !== undefined
              ? payload.naturalidade
              : pfAtuais.naturalidade ?? null,

          pep:
            payload.pep !== undefined
              ? payload.pep
              : pfAtuais.pep ?? false,

          data_nascimento:
            payload.data_nascimento !== undefined
              ? payload.data_nascimento
              : pfAtuais.data_nascimento ?? null,

          sexo:
            payload.sexo !== undefined
              ? payload.sexo
              : pfAtuais.sexo ?? null,

          ocupacao:
            payload.ocupacao !== undefined
              ? payload.ocupacao
              : pfAtuais.ocupacao ?? null,

          rg_numero:
            payload.rg_numero !== undefined
              ? payload.rg_numero
              : (payload.rg !== undefined ? payload.rg : (pfAtuais.rg_numero ?? null)),

          rg_orgao:
            payload.rg_orgao !== undefined
              ? payload.rg_orgao
              : pfAtuais.rg_orgao ?? null,

          data_emissao_rg:
            payload.data_emissao_rg !== undefined
              ? payload.data_emissao_rg
              : pfAtuais.data_emissao_rg ?? null,

          estado_civil:
            payload.estado_civil !== undefined
              ? payload.estado_civil
              : pfAtuais.estado_civil ?? null
        }
      : pfAtuais;

    const dadosPJ = !isPF
      ? {
          ...pjAtuais,

          porte:
            dadosPJRecebidos.porte ??
            pjAtuais.porte ??
            null,

          data_abertura:
            dadosPJRecebidos.data_abertura ??
            pjAtuais.data_abertura ??
            null,

          matriz_filial:
            dadosPJRecebidos.matriz_filial ??
            pjAtuais.matriz_filial ??
            null,

          modo_cadastro:
            payload.modoCadastro ||
            payload.modo_cadastro ||
            dadosPJRecebidos.modo_cadastro ||
            pjAtuais.modo_cadastro ||
            'RAPIDO',

          capital_social:
            dadosPJRecebidos.capital_social ??
            pjAtuais.capital_social ??
            null,

          cnae_principal:
            dadosPJRecebidos.cnae_principal ??
            payload.cnae_principal ??
            payload.cnaePrincipal ??
            pjAtuais.cnae_principal ??
            null,

          opcao_pelo_mei:
            dadosPJRecebidos.opcao_pelo_mei ??
            pjAtuais.opcao_pelo_mei ??
            false,

          natureza_juridica:
            dadosPJRecebidos.natureza_juridica ??
            pjAtuais.natureza_juridica ??
            null,

          opcao_pelo_simples:
            dadosPJRecebidos.opcao_pelo_simples ??
            pjAtuais.opcao_pelo_simples ??
            false,

          situacao_cadastral:
            dadosPJRecebidos.situacao_cadastral ??
            payload.situacao_cadastral ??
            payload.situacaoCadastral ??
            pjAtuais.situacao_cadastral ??
            'ATIVA'
        }
      : pjAtuais;

    const dadosParaAtualizar = {
      tipo_cliente: tipoCliente,
      cpf_cnpj: cpfCnpjTratado,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: nomeFantasia || null,
      corretor_id: corretorId,

      cnae_principal:
        payload.cnae_principal ??
        payload.cnaePrincipal ??
        dadosPJ.cnae_principal ??
        clienteAtual.cnae_principal ??
        null,

      situacao_cadastral:
        payload.situacao_cadastral ??
        payload.situacaoCadastral ??
        dadosPJ.situacao_cadastral ??
        clienteAtual.situacao_cadastral ??
        null,

      cep:
        payload.cep ??
        clienteAtual.cep ??
        null,

      logradouro:
        payload.logradouro ??
        clienteAtual.logradouro ??
        null,

      numero:
        payload.numero ??
        clienteAtual.numero ??
        null,

      bairro:
        payload.bairro ??
        clienteAtual.bairro ??
        null,

      municipio:
        payload.municipio ??
        clienteAtual.municipio ??
        null,

      uf:
        payload.uf ??
        clienteAtual.uf ??
        null,

      complemento:
        payload.complemento ??
        clienteAtual.complemento ??
        null,

      contatos:
        payload.contatos !== undefined
          ? padronizarContatos(payload.contatos)
          : parseRealJson(clienteAtual.contatos, []),

      socios:
        payload.socios !== undefined
          ? padronizarSocios(payload.socios)
          : parseRealJson(clienteAtual.socios, []),

      dados_complementares_pf: dadosPF,
      dados_complementares_pj: dadosPJ,

      atualizado_em: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tab_clientes')
      .update(dadosParaAtualizar)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('O Supabase não retornou o cliente atualizado.');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const buscarClientesV2 = async (
  filtros: FiltrosClientesV2,
  pagina: number = 1,
  itensPorPagina: number = 10
): Promise<{ dados: ClienteV2Formatado[]; total: number }> => {
  try {
    const inicio = (pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina - 1;

    const sessao = await obterDadosSessao();

    if (!sessao?.corretora_id) {
      console.warn('Aguardando identificação da corretora no boot da sessão...');
      return { dados: [], total: 0 };
    }

    let query = supabase
      .from('tab_clientes')
      .select(`
        *,
        interacoes:tab_interacoes(
          proxima_acao,
          data_retorno,
          status_agendamento,
          tipo_acao
        )
      `, { count: 'exact' })
      .eq('corretora_id', sessao.corretora_id);

    if (sessao.tipo_usuario === 'CORRETOR') {
      query = query.eq('corretor_id', sessao.id);
    } else if (filtros.corretor_id) {
      query = query.eq('corretor_id', filtros.corretor_id);
    }

    // ==========================================
    // 1. FILTRO GLOBAL
    // ==========================================
    if (filtros.buscaGlobal && filtros.buscaGlobal.trim() !== '') {
      const termoBusca = filtros.buscaGlobal.trim();
      const term = `%${termoBusca}%`;

      // Busca na tabela de itens de proposta (apólice / cotação)
      const { data: itensComTermo } = await supabase
        .from('tab_proposta_itens')
        .select('opcao:tab_proposta_opcoes!inner(proposta:tab_propostas!inner(cliente_id))')
        .or(`numero_apolice.ilike.${term},numero_cotacao.ilike.${term}`);

      const idsPorApolice = itensComTermo
        ? [...new Set(itensComTermo.map((item: any) => item?.opcao?.proposta?.cliente_id).filter(Boolean))]
        : [];

      // RPC Busca por Sócio
      const { data: idsSocioData } = await supabase.rpc('buscar_ids_por_socio', {
        p_corretora_id: sessao.corretora_id,
        p_termo: termoBusca
      });

      const idsPorSocio = Array.isArray(idsSocioData) ? idsSocioData : [];
      const todosIdsExtras = [...new Set([...idsPorApolice, ...idsPorSocio])];

      const baseOrFiltros = `nome_razao_social.ilike.${term},nome_fantasia.ilike.${term},cpf_cnpj.ilike.${term}`;

      if (todosIdsExtras.length > 0) {
        const idsString = `(${todosIdsExtras.join(',')})`;
        query = query.or(`${baseOrFiltros},id.in.${idsString}`);
      } else {
        query = query.or(baseOrFiltros);
      }
    }

    // ==========================================
    // 2. LOCALIZAÇÃO E CNAE
    // ==========================================
    if (filtros.uf) query = query.eq('uf', filtros.uf.toUpperCase());
    if (filtros.municipio) query = query.ilike('municipio', `%${filtros.municipio}%`);
    if (filtros.bairro) query = query.ilike('bairro', `%${filtros.bairro}%`);
    if (filtros.cep) query = query.ilike('cep', `%${filtros.cep}%`);
    
    if (filtros.situacao_cadastral && filtros.situacao_cadastral !== '') {
      const situacao = filtros.situacao_cadastral.toUpperCase();
      if (situacao === 'ATIVA') {
        query = query.or(`situacao_cadastral.eq.ATIVA,tipo_cliente.eq.PF,situacao_cadastral.is.null`);
      } else {
        query = query.eq('situacao_cadastral', situacao);
      }
    }

    if (filtros.cnae_principal && filtros.cnae_principal.length > 0) {
      query = query.in('cnae_principal', filtros.cnae_principal);
    }

    // ==========================================
    // 3. PERFIL CRM
    // ==========================================
    if (filtros.tipo_cliente) query = query.eq('tipo_cliente', filtros.tipo_cliente);
    if (filtros.origem) query = query.eq('origem', filtros.origem);
    if (filtros.fase_atendimento) query = query.eq('fase_atendimento', filtros.fase_atendimento);
    if (filtros.temperatura) query = query.eq('temperatura', filtros.temperatura);

    // LÓGICA CORRIGIDA DO KANBAN:
    const temBuscaGlobal = Boolean(
      filtros.buscaGlobal?.trim()
    );

    // Na busca global, não restringe os clientes pelo status Kanban.
    // Assim, clientes "novo" também podem ser encontrados.
    if (!temBuscaGlobal) {
      if (filtros.status_kanban) {
        query = query.eq('status_kanban', filtros.status_kanban);
      } else {
        // Com a busca global vazia, oculta os clientes "novo".
        query = query.neq('status_kanban', 'novo');
      }
    }

    if (filtros.fase_kanban) {
      query = query.eq('fase_kanban', filtros.fase_kanban);
    }

    // ==========================================
    // 4. RETORNO CRM E INTERAÇÕES
    // ==========================================
    if (filtros.data_retorno_inicio) query = query.gte('data_retorno', filtros.data_retorno_inicio);
    if (filtros.data_retorno_fim) query = query.lte('data_retorno', filtros.data_retorno_fim);
    if (filtros.data_retorno_sinistro_inicio) query = query.gte('data_retorno_sinistro', filtros.data_retorno_sinistro_inicio);
    if (filtros.data_retorno_sinistro_fim) query = query.lte('data_retorno_sinistro', filtros.data_retorno_sinistro_fim);

    if ((filtros.tipo_acao && filtros.tipo_acao !== '') || (filtros.proxima_acao_interacao && filtros.proxima_acao_interacao !== '')) {
      let interacaoQuery = supabase.from('tab_interacoes').select('cliente_id').eq('corretora_id', sessao.corretora_id);

      if (filtros.tipo_acao && filtros.tipo_acao !== '') {
        interacaoQuery = interacaoQuery.eq('tipo_acao', filtros.tipo_acao);
      }
      if (filtros.proxima_acao_interacao && filtros.proxima_acao_interacao !== '') {
        interacaoQuery = interacaoQuery.eq('proxima_acao', filtros.proxima_acao_interacao);
      }

      const { data: interacoesFiltradas, error: errInteracao } = await interacaoQuery;
      if (errInteracao) console.error('Erro ao filtrar interações:', errInteracao);

      const idsClientesInteracao = [...new Set(interacoesFiltradas?.map((i: any) => i.cliente_id) || [])];
      query = query.in('id', idsClientesInteracao.length > 0 ? idsClientesInteracao : ['00000000-0000-0000-0000-000000000000']);
    }

    // ==========================================
    // 5. FILTROS DE PROPOSTA
    // ==========================================
    const temFiltroProposta = 
      (filtros.status_proposta && filtros.status_proposta !== '') ||
      Boolean(filtros.data_venda_inicio) || Boolean(filtros.data_venda_fim) ||
      (filtros.valor_proposta_min !== undefined && filtros.valor_proposta_min !== '') ||
      (filtros.valor_proposta_max !== undefined && filtros.valor_proposta_max !== '') ||
      Boolean(filtros.seguradora_id) || Boolean(filtros.produto_id) ||
      Boolean(filtros.data_cotacao_inicio) || Boolean(filtros.data_cotacao_fim) ||
      Boolean(filtros.data_inicio_vigencia) || Boolean(filtros.data_fim_vigencia) ||
      Boolean(filtros.periodicidade) || Boolean(filtros.status_renovacao);

    if (temFiltroProposta) {
      const filtroNivelItem = 
        filtros.produto_id || 
        filtros.data_cotacao_inicio || 
        filtros.data_cotacao_fim || 
        filtros.data_inicio_vigencia || 
        filtros.data_fim_vigencia || 
        filtros.periodicidade || 
        filtros.status_renovacao;

      const filtroNivelOpcao = filtros.seguradora_id || filtroNivelItem;

      let selectString = 'cliente_id';

      if (filtroNivelItem) {
        selectString = `cliente_id, tab_proposta_opcoes!inner(seguradora_id, tab_proposta_itens!inner(produto_id, data_cotacao, data_inicio_vigencia, data_fim_vigencia, periodicidade, status_renovacao))`;
      } else if (filtroNivelOpcao) {
        selectString = `cliente_id, tab_proposta_opcoes!inner(seguradora_id)`;
      }

      let propQuery = supabase.from('tab_propostas').select(selectString);

      if (filtros.status_proposta && filtros.status_proposta !== '') {
        propQuery = propQuery.eq('status', filtros.status_proposta);
      }
      if (filtros.data_venda_inicio) propQuery = propQuery.gte('data_venda', filtros.data_venda_inicio);
      if (filtros.data_venda_fim) propQuery = propQuery.lte('data_venda', filtros.data_venda_fim);
      if (filtros.valor_proposta_min !== undefined && filtros.valor_proposta_min !== '') {
        propQuery = propQuery.gte('valor_total_proposta', Number(filtros.valor_proposta_min));
      }
      if (filtros.valor_proposta_max !== undefined && filtros.valor_proposta_max !== '') {
        propQuery = propQuery.lte('valor_total_proposta', Number(filtros.valor_proposta_max));
      }

      if (filtros.seguradora_id) {
        propQuery = propQuery.eq('tab_proposta_opcoes.seguradora_id', filtros.seguradora_id);
      }
      if (filtros.produto_id) {
        propQuery = propQuery.eq('tab_proposta_opcoes.tab_proposta_itens.produto_id', filtros.produto_id);
      }
      if (filtros.periodicidade) {
        propQuery = propQuery.eq('tab_proposta_opcoes.tab_proposta_itens.periodicidade', filtros.periodicidade);
      }
      if (filtros.status_renovacao) {
        propQuery = propQuery.eq('tab_proposta_opcoes.tab_proposta_itens.status_renovacao', filtros.status_renovacao);
      }
      if (filtros.data_cotacao_inicio) {
        propQuery = propQuery.gte('tab_proposta_opcoes.tab_proposta_itens.data_cotacao', filtros.data_cotacao_inicio);
      }
      if (filtros.data_cotacao_fim) {
        propQuery = propQuery.lte('tab_proposta_opcoes.tab_proposta_itens.data_cotacao', filtros.data_cotacao_fim);
      }
      if (filtros.data_inicio_vigencia) {
        propQuery = propQuery.gte('tab_proposta_opcoes.tab_proposta_itens.data_inicio_vigencia', filtros.data_inicio_vigencia);
      }
      if (filtros.data_fim_vigencia) {
        propQuery = propQuery.lte('tab_proposta_opcoes.tab_proposta_itens.data_fim_vigencia', filtros.data_fim_vigencia);
      }

      const { data: propostasFiltradas, error: errProposta } = await propQuery;
      if (errProposta) {
        console.error('Erro ao filtrar propostas:', errProposta);
        throw errProposta;
      }
      
      const idsClientesComProposta = [...new Set(propostasFiltradas?.map((p: any) => p.cliente_id) || [])];
      query = query.in('id', idsClientesComProposta.length > 0 ? idsClientesComProposta : ['00000000-0000-0000-0000-000000000000']);
    }

    // ==========================================
    // 6. FILTROS JSONB (DADOS COMPLEMENTARES PJ)
    // CORRIGIDO: dados_complementares -> dados_complementares_pj
    // ==========================================
    if (filtros.porte && filtros.porte !== '') {
      query = query.eq('dados_complementares_pj->>porte', filtros.porte);
    }

    if (filtros.matriz_filial) {
      query = query.eq('dados_complementares_pj->>matriz_filial', filtros.matriz_filial);
    }

    if (filtros.opcao_pelo_mei === 'true' || filtros.opcao_pelo_mei === 'false') {
      const isMei = filtros.opcao_pelo_mei === 'true';
      // Sintaxe corrigida para booleans em JSONB no PostgREST
      query = query.eq('dados_complementares_pj->opcao_pelo_mei', isMei);
    }

    if (filtros.opcao_pelo_simples === 'true' || filtros.opcao_pelo_simples === 'false') {
      const isSimples = filtros.opcao_pelo_simples === 'true';
      // Sintaxe corrigida para booleans em JSONB no PostgREST
      query = query.eq('dados_complementares_pj->opcao_pelo_simples', isSimples);
    }

    if (filtros.tipo_cliente !== 'PF') {
      if (filtros.data_abertura_inicio) {
        query = query.gte('dados_complementares_pj->>data_abertura', filtros.data_abertura_inicio);
      }
      if (filtros.data_abertura_fim) {
        query = query.lte('dados_complementares_pj->>data_abertura', filtros.data_abertura_fim);
      }
    }

    // ==========================================
    // EXECUÇÃO DA CONSULTA PRINCIPAL
    // ==========================================
    const { data: clientes, count, error } = await query
      .range(inicio, fim)
      .order('criado_em', { ascending: false });

    if (error) throw error;
    if (!clientes || clientes.length === 0) return { dados: [], total: 0 };

    const clienteIds = clientes.map((c) => c.id);
    const corretorIds = Array.from(
      new Set(clientes.map((c) => c.corretor_id).filter((id): id is string => Boolean(id)))
    );

    const [resUsuarios, resPropostas] = await Promise.all([
      corretorIds.length > 0
        ? supabase.from('usuarios_perfis').select('id, nome').in('id', corretorIds)
        : Promise.resolve({ data: [] }),
      
      supabase
        .from('tab_propostas')
        .select(`
          cliente_id,
          status,
          data_venda,
          valor_total_proposta,
          opcoes:tab_proposta_opcoes(
            itens:tab_proposta_itens(
              produto:base_produtos(nome)
            )
          )
        `)
        .in('cliente_id', clienteIds)
    ]);

    const mapaResponsaveis: Record<string, string> = {};
    if (resUsuarios.data) {
      resUsuarios.data.forEach((u: any) => {
        mapaResponsaveis[u.id] = u.nome;
      });
    }

    const produtosPorCliente: Record<string, string[]> = {};
    
    if (resPropostas.data) {
      resPropostas.data.forEach((prop: any) => {
        const cId = prop.cliente_id;
        if (!produtosPorCliente[cId]) produtosPorCliente[cId] = [];

        if (prop.status === 'Vendido' && Array.isArray(prop.opcoes)) {
          prop.opcoes.forEach((op: any) => {
            if (Array.isArray(op.itens)) {
              op.itens.forEach((it: any) => {
                const nomeProduto = it.produto?.nome;
                if (nomeProduto && !produtosPorCliente[cId].includes(nomeProduto)) {
                  produtosPorCliente[cId].push(nomeProduto);
                }
              });
            }
          });
        }
      });
    }

    const dadosFormatados: ClienteV2Formatado[] = clientes.map((cli: any) => {
        let sociosTexto = '';

        if (Array.isArray(cli.socios) && cli.socios.length > 0) {
          sociosTexto = cli.socios.map((s: any) => s.nome).join(', ');
        }

        // =====================================================
        // DADOS DO CONTATO PRINCIPAL
        // =====================================================
        const contatosCliente = padronizarContatos(cli.contatos);

        const contatoPrincipal =
          contatosCliente.find((c: any) => c.principal === true) ||
          contatosCliente[0] ||
          null;

        // =====================================================
        // CPF / CNPJ
        // =====================================================
        // PJ continua usando o campo da raiz.
        // PF pode ter o CPF armazenado no contato principal.
        const cpfCnpj =
          cli.cpf_cnpj ||
          contatoPrincipal?.cpf ||
          null;

        // =====================================================
        // LOCALIZAÇÃO
        // =====================================================
        // Primeiro tenta a estrutura antiga da raiz.
        // Se não existir, utiliza o endereço do contato principal.
        const municipio =
          cli.municipio ||
          contatoPrincipal?.municipio ||
          contatoPrincipal?.endereco?.municipio ||
          null;

        const uf =
          cli.uf ||
          contatoPrincipal?.uf ||
          contatoPrincipal?.endereco?.uf ||
          null;

        const interacaoPendente = Array.isArray(cli.interacoes)
          ? cli.interacoes.find((i: any) => i.status_agendamento === 'PENDENTE')
          : null;

        return {
        id: cli.id,
        tipo_cliente: cli.tipo_cliente,
        nome_razao_social: cli.nome_razao_social,
        nome_fantasia: cli.nome_fantasia,
        cpf_cnpj: cpfCnpj,
        municipio: municipio,
        uf: uf,
        socios_texto: sociosTexto,
        responsavel_nome: cli.corretor_id ? (mapaResponsaveis[cli.corretor_id] || 'Não Encontrado') : 'Não Atribuído',
        data_retorno: interacaoPendente?.data_retorno || cli.data_retorno || null,
        proxima_acao: interacaoPendente?.proxima_acao || 'Nenhuma ação pendente',
        produtos: produtosPorCliente[cli.id] || [],
        status_kanban: cli.status_kanban, // <--- ADICIONE ESTA LINHA AQUI!
        clienteOriginal: cli
      };
    });

    return {
      dados: dadosFormatados,
      total: count || 0,
    };
  } catch (error) {
    console.error('Erro na busca de clientes V2:', error);
    return { dados: [], total: 0 };
  }
};

// ==========================================
// REGISTRAR AÇÃO COMERCIAL / INTERAÇÃO (tab_interacoes)
// ==========================================
export async function salvarAcaoComercialV2(payload: any) {
  try {
    const sessao = await obterDadosSessao();

    if (!payload.cliente_id) {
      throw new Error('Cliente não informado.');
    }

    if (payload.tipo_acao === 'reagendamento' && !payload.data_retorno) {
      throw new Error('A data do reagendamento é obrigatória.');
    }

    const { contatos, ...dadosInteracao } = payload;

    const ehReagendamento = dadosInteracao.tipo_acao === 'reagendamento';

    const interacaoParaInserir = {
      cliente_id: dadosInteracao.cliente_id,
      corretora_id: sessao?.corretora_id || null,
      corretor_id: dadosInteracao.corretor_id || sessao?.id || null,
      tipo_acao: dadosInteracao.tipo_acao,
      relato: ehReagendamento
        ? 'Retorno reagendado'
        : dadosInteracao.relato || dadosInteracao.descricao || '',
      resultado_acao: ehReagendamento
        ? null
        : dadosInteracao.resultado_acao || null,
      objetivo_acao: ehReagendamento
        ? null
        : dadosInteracao.objetivo_acao || null,
      proxima_acao: ehReagendamento
        ? null
        : dadosInteracao.proxima_acao || null,
      relato_proxima_acao: ehReagendamento
        ? null
        : dadosInteracao.relato_proxima_acao || null,
      produtos_interesse: ehReagendamento
        ? null
        : dadosInteracao.produtos_interesse || null,
      data_retorno: dadosInteracao.data_retorno || null,
      horario_retorno: dadosInteracao.horario_retorno || null,
      status_agendamento: dadosInteracao.data_retorno
        ? 'PENDENTE'
        : null,
      criado_em: new Date().toISOString()
    };

    const { data: interacaoSalva, error: erroInteracao } = await supabase
      .from('tab_interacoes')
      .insert([interacaoParaInserir])
      .select()
      .single();

    if (erroInteracao) {
      throw erroInteracao;
    }

    const dadosUpdateCliente: Record<string, any> = {
      atualizado_em: new Date().toISOString()
    };

    if (contatos && Array.isArray(parseRealJson(contatos))) {
      dadosUpdateCliente.contatos = padronizarContatos(contatos);
    }

    if (dadosInteracao.data_retorno) {
      dadosUpdateCliente.data_retorno = dadosInteracao.data_retorno;
      dadosUpdateCliente.horario_retorno =
        dadosInteracao.horario_retorno || '09:00:00';
    }

    if (dadosInteracao.fase_atendimento) {
      dadosUpdateCliente.fase_atendimento = dadosInteracao.fase_atendimento;
    }

    if (dadosInteracao.temperatura) {
      dadosUpdateCliente.temperatura = dadosInteracao.temperatura;
    }

    if (dadosInteracao.fase_kanban) {
      dadosUpdateCliente.fase_kanban = dadosInteracao.fase_kanban;
    }

    if (dadosInteracao.status_kanban) {
      dadosUpdateCliente.status_kanban = dadosInteracao.status_kanban;
    }

    const { error: erroUpdateCliente } = await supabase
      .from('tab_clientes')
      .update(dadosUpdateCliente)
      .eq('id', dadosInteracao.cliente_id);

    if (erroUpdateCliente) {
      throw erroUpdateCliente;
    }

    return interacaoSalva;
  } catch (error) {
    console.error('Erro ao salvar ação comercial no service:', error);
    throw error;
  }
}

// ==========================================
// CONVERTER EM LEAD (PARA APARECER NO KANBAN)
// ==========================================

export async function converterClienteEmLead(clienteId: string): Promise<boolean> {
  try {
    // 1. Verifica se existe ao menos 1 registro na tab_interacoes para este cliente
    const { count, error: countError } = await supabase
      .from('tab_interacoes')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', clienteId);

    if (countError) {
      console.error('Erro ao verificar interações do cliente:', countError);
      return false;
    }

    // Define a fase com base na existência de interações
    const novaFaseKanban = (count && count > 0) ? 'contato_realizado' : 'nao_contatado';

    // 2. Atualiza a tab_clientes
    const { error: updateError } = await supabase
      .from('tab_clientes')
      .update({
        status_kanban: 'lead',
        fase_kanban: novaFaseKanban,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', clienteId);

    if (updateError) {
      console.error('Erro ao converter cliente para Lead:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao executar conversão para Lead:', error);
    return false;
  }
}

