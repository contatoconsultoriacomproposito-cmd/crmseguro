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

// ==========================================
// CRIAR NOVO CLIENTE
// ==========================================
export async function criarClienteV2(payload: any) {
  try {
    // 1. Extrai campos aceitando camelCase ou snake_case
    const tipoCliente = payload.tipo_cliente || payload.tipoCliente;
    let corretoraId = payload.corretora_id || payload.corretoraId;
    let corretorId = payload.corretor_id || payload.corretorId || payload.dono_id || null;
    const nomeRazaoSocial = payload.nome_razao_social || payload.nomeRazaoSocial;
    const cpfCnpj = payload.cpf_cnpj || payload.cpfCnpj;

    // Validation
    if (!tipoCliente) {
      throw new Error("O campo 'tipo_cliente' (PF ou PJ) é obrigatório.");
    }

    // 2. Fallback de Segurança: Se não veio corretora_id no payload, busca na sessão ativa do usuário
    if (!corretoraId || !corretorId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario')
          .eq('id', user.id)
          .single();

        if (perfil) {
          if (!corretoraId) {
            corretoraId = perfil.tipo_usuario === 'CORRETORA' ? perfil.id : perfil.corretora_id;
          }
          // CORREÇÃO AQUI: Se corretorId for nulo, assume o id do usuário ou da corretora
          if (!corretorId) {
            corretorId = perfil.tipo_usuario === 'CORRETORA' ? perfil.id : user.id;
          }
        }
      }
    }

    // Garantia final: Se corretorId ainda estiver nulo, ele DEVE ser igual a corretoraId
    if (!corretorId && corretoraId) {
      corretorId = corretoraId;
    }

    if (!corretoraId) {
      throw new Error("O campo 'corretora_id' é obrigatório para cadastrar um cliente.");
    }

    const isPF = tipoCliente === 'PF';

    const dadosPF = isPF ? {
      modo_cadastro: payload.modoCadastro || payload.modo_cadastro || 'COMPLETO',
      naturalidade: payload.naturalidade || null,
      pep: payload.pep || false
    } : {};

    const dadosReceitaObj = parseRealJson(payload.dadosReceita || payload.dados_pj, {});
    const dadosPJ = !isPF ? {
      porte: payload.porte || dadosReceitaObj.porte || null,
      data_abertura: payload.dataAbertura || payload.data_abertura || dadosReceitaObj.data_abertura || null,
      matriz_filial: payload.matrizFilial || payload.matriz_filial || dadosReceitaObj.matriz_filial || null,
      modo_cadastro: payload.modoCadastro || payload.modo_cadastro || 'RAPIDO',
      capital_social: payload.capitalSocial || payload.capital_social || dadosReceitaObj.capital_social || null,
      cnae_principal: payload.cnaePrincipal || payload.cnae_principal || dadosReceitaObj.cnae_principal || null,
      opcao_pelo_mei: payload.opcaoPeloMei ?? payload.opcao_pelo_mei ?? dadosReceitaObj.opcao_pelo_mei ?? false,
      natureza_juridica: payload.naturezaJuridica || payload.natureza_juridica || dadosReceitaObj.natureza_juridica || null,
      opcao_pelo_simples: payload.opcaoPeloSimples ?? payload.opcao_pelo_simples ?? dadosReceitaObj.opcao_pelo_simples ?? false,
      situacao_cadastral: payload.situacaoCadastral || payload.situacao_cadastral || dadosReceitaObj.situacao_cadastral || 'ATIVA'
    } : {};

    const novoCliente = {
      corretora_id: corretoraId,
      corretor_id: corretorId, // Agora NUNCA será nulo se a corretora_id existir!
      tipo_cliente: tipoCliente,
      origem: payload.origem || 'MANUAL',
      cpf_cnpj: cpfCnpj ? String(cpfCnpj).replace(/\D/g, '') : null,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: payload.nome_fantasia || payload.nomeFantasia || null,
      
      // Endereço Principal
      cep: payload.cep || null,
      logradouro: payload.logradouro || null,
      numero: payload.numero || null,
      bairro: payload.bairro || null,
      municipio: payload.municipio || null,
      uf: payload.uf || null,
      complemento: payload.complemento || null,
      cnae_principal: payload.cnae_principal || payload.cnaePrincipal || null,
      situacao_cadastral: payload.situacao_cadastral || payload.situacaoCadastral || 'ATIVA',

      // JSONB sem stringify
      contatos: padronizarContatos(payload.contatos),
      socios: padronizarSocios(payload.socios),
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
    const clienteAtual = await buscarClienteCompletoPorId(id);
    const isPF = payload.tipoCliente === 'PF';

    const pfAtuais = parseRealJson(clienteAtual?.dados_complementares_pf, {});
    const pjAtuais = parseRealJson(clienteAtual?.dados_complementares_pj, {});
    const dadosReceitaTratados = parseRealJson(payload.dadosReceita, {});

    const dadosPF = isPF ? {
      ...pfAtuais,
      modo_cadastro: payload.modoCadastro || pfAtuais.modo_cadastro || 'COMPLETO',
      naturalidade: payload.naturalidade !== undefined ? payload.naturalidade : (pfAtuais.naturalidade || null),
      pep: payload.pep !== undefined ? payload.pep : (pfAtuais.pep || false)
    } : {};

    const dadosPJ = !isPF ? {
      ...pjAtuais,
      ...dadosReceitaTratados,
      porte: payload.porte || dadosReceitaTratados.porte || pjAtuais.porte || null,
      data_abertura: payload.dataAbertura || dadosReceitaTratados.data_abertura || pjAtuais.data_abertura || null,
      matriz_filial: payload.matrizFilial || dadosReceitaTratados.matriz_filial || pjAtuais.matriz_filial || null,
      modo_cadastro: payload.modoCadastro || pjAtuais.modo_cadastro || 'RAPIDO',
      capital_social: payload.capitalSocial || dadosReceitaTratados.capital_social || pjAtuais.capital_social || null,
      cnae_principal: payload.cnaePrincipal || dadosReceitaTratados.cnae_principal || pjAtuais.cnae_principal || null,
      opcao_pelo_mei: payload.opcaoPeloMei ?? dadosReceitaTratados.opcao_pelo_mei ?? pjAtuais.opcao_pelo_mei ?? false,
      natureza_juridica: payload.naturezaJuridica || dadosReceitaTratados.natureza_juridica || pjAtuais.natureza_juridica || null,
      opcao_pelo_simples: payload.opcaoPeloSimples ?? dadosReceitaTratados.opcao_pelo_simples ?? pjAtuais.opcao_pelo_simples ?? false,
      situacao_cadastral: payload.situacaoCadastral || dadosReceitaTratados.situacao_cadastral || pjAtuais.situacao_cadastral || 'ATIVA'
    } : {};

    const dadosParaAtualizar = {
      tipo_cliente: payload.tipoCliente,
      cpf_cnpj: payload.cpfCnpj ? payload.cpfCnpj.replace(/\D/g, '') : null,
      nome_razao_social: payload.nomeRazaoSocial,
      nome_fantasia: payload.nomeFantasia || null,
      corretor_id: payload.corretor_id || payload.dono_id || null,
      cnae_principal: payload.cnaePrincipal || null,
      situacao_cadastral: payload.situacaoCadastral || 'ATIVA',
      
      // Endereço Principal (Fiscal/Matriz)
      cep: payload.cep || null,
      logradouro: payload.logradouro || null,
      numero: payload.numero || null,
      bairro: payload.bairro || null,
      municipio: payload.municipio || null,
      uf: payload.uf || null,
      complemento: payload.complemento || null,

      // Colunas JSONB padronizadas sem JSON.stringify
      contatos: padronizarContatos(payload.contatos),
      socios: padronizarSocios(payload.socios),
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao atualizar cliente no service:", error);
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
    if (filtros.status_kanban) {
        query = query.eq('status_kanban', filtros.status_kanban);
      } else {
        query = query.neq('status_kanban', 'novo');
      }
    if (filtros.fase_kanban) query = query.eq('fase_kanban', filtros.fase_kanban);

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

      const interacaoPendente = Array.isArray(cli.interacoes)
        ? cli.interacoes.find((i: any) => i.status_agendamento === 'PENDENTE')
        : null;

      return {
        id: cli.id,
        tipo_cliente: cli.tipo_cliente,
        nome_razao_social: cli.nome_razao_social,
        nome_fantasia: cli.nome_fantasia,
        cpf_cnpj: cli.cpf_cnpj,
        municipio: cli.municipio,
        uf: cli.uf,
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

    // Separa os contatos (que vão para tab_clientes) do restante do payload
    const { contatos, ...dadosInteracao } = payload;

    // Garante os campos obrigatórios e auditoria da interação
    const interacaoParaInserir = {
      cliente_id: dadosInteracao.cliente_id,
      corretora_id: sessao?.corretora_id || null,
      corretor_id: dadosInteracao.corretor_id || sessao?.id || null,
      tipo_acao: dadosInteracao.tipo_acao,
      relato: dadosInteracao.relato || dadosInteracao.descricao || '',
      resultado_acao: dadosInteracao.resultado_acao || null,
      objetivo_acao: dadosInteracao.objetivo_acao || null,
      proxima_acao: dadosInteracao.proxima_acao || null,
      relato_proxima_acao: dadosInteracao.relato_proxima_acao || null,
      produtos_interesse: dadosInteracao.produtos_interesse || null,
      data_retorno: dadosInteracao.data_retorno || null,
      horario_retorno: dadosInteracao.horario_retorno || null,
      status_agendamento: dadosInteracao.data_retorno ? (dadosInteracao.status_agendamento || 'PENDENTE') : null,
      criado_em: new Date().toISOString()
    };

    // 1. Insere a interação na tabela tab_interacoes
    const { data: interacaoSalva, error: erroInteracao } = await supabase
      .from('tab_interacoes')
      .insert([interacaoParaInserir])
      .select()
      .single();

    if (erroInteracao) {
      console.error('Erro ao inserir interação na tab_interacoes:', erroInteracao);
      throw erroInteracao;
    }

    // 2. Atualiza os dados na tab_clientes
    if (payload.cliente_id) {
      const dadosUpdateCliente: Record<string, any> = {
        atualizado_em: new Date().toISOString()
      };

      // Atualiza contatos padronizados se fornecidos
      if (contatos && Array.isArray(parseRealJson(contatos))) {
        dadosUpdateCliente.contatos = padronizarContatos(contatos);
      }

      // Se houver uma nova data de retorno no agendamento, atualiza na tabela do cliente
      if (payload.data_retorno) {
        dadosUpdateCliente.data_retorno = payload.data_retorno;
        dadosUpdateCliente.horario_retorno = payload.horario_retorno || '09:00:00';
      }

      // Atualiza fases e Kanban no cliente caso tenham mudado na ação
      if (payload.fase_atendimento) dadosUpdateCliente.fase_atendimento = payload.fase_atendimento;
      if (payload.temperatura) dadosUpdateCliente.temperatura = payload.temperatura;
      if (payload.fase_kanban) dadosUpdateCliente.fase_kanban = payload.fase_kanban;
      if (payload.status_kanban) dadosUpdateCliente.status_kanban = payload.status_kanban;

      const { error: erroUpdateCliente } = await supabase
        .from('tab_clientes')
        .update(dadosUpdateCliente)
        .eq('id', payload.cliente_id);

      if (erroUpdateCliente) {
        console.error('Erro ao atualizar tab_clientes ao salvar interação:', erroUpdateCliente);
      }
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

