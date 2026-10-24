import { supabase } from '../../../../../lib/supabaseClient';
import type {
  PortfolioItem,
  ProdutoPortfolio,
  SeguradoraPortfolio,
} from '../types/propostas';

type UsuarioPerfilMinimo = {
  id: string;
  tipo_usuario: 'CORRETORA' | 'CORRETOR';
  corretora_id: string;
};

type PortfolioRow = {
  id: string;
  corretora_id: string;
  base_produto_id: string;
  base_seguradora_id: string;
  produto: ProdutoPortfolio | ProdutoPortfolio[] | null;
  seguradora: SeguradoraPortfolio | SeguradoraPortfolio[] | null;
};

function normalizarRelacao<T>(valor: T | T[] | null): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

async function obterCorretoraAtual(): Promise<string> {
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

  const perfil = data as UsuarioPerfilMinimo;

  return perfil.tipo_usuario === 'CORRETORA'
    ? perfil.id
    : perfil.corretora_id;
}

export async function buscarPortfolioCorretora(): Promise<PortfolioItem[]> {
  const corretoraId = await obterCorretoraAtual();

  const { data, error } = await supabase
    .from('tab_corretora_portfolio')
    .select(`
      id,
      corretora_id,
      base_produto_id,
      base_seguradora_id,
      produto:base_produtos!tab_corretora_portfolio_base_produto_id_fkey(
        id,
        nome,
        categoria,
        descricao
      ),
      seguradora:base_seguradoras!tab_corretora_portfolio_base_seguradora_id_fkey(
        id,
        nome,
        cnpj,
        site,
        logo_url
      )
    `)
    .eq('corretora_id', corretoraId);

  if (error) throw error;

  return ((data ?? []) as unknown as PortfolioRow[])
    .map((row): PortfolioItem | null => {
      const produto = normalizarRelacao(row.produto);
      const seguradora = normalizarRelacao(row.seguradora);

      if (!produto || !seguradora) return null;

      return {
        id: row.id,
        corretora_id: row.corretora_id,
        produto_id: row.base_produto_id,
        seguradora_id: row.base_seguradora_id,
        produto,
        seguradora,
      };
    })
    .filter((item): item is PortfolioItem => item !== null)
    .sort((a, b) => {
      const produto = a.produto.nome.localeCompare(b.produto.nome, 'pt-BR');
      if (produto !== 0) return produto;

      return a.seguradora.nome.localeCompare(
        b.seguradora.nome,
        'pt-BR',
      );
    });
}

export async function buscarProdutosPortfolio(): Promise<ProdutoPortfolio[]> {
  const portfolio = await buscarPortfolioCorretora();
  const produtos = new Map<string, ProdutoPortfolio>();

  for (const item of portfolio) {
    produtos.set(item.produto.id, item.produto);
  }

  return Array.from(produtos.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

export async function buscarSeguradorasPorProduto(
  produtoId: string,
): Promise<SeguradoraPortfolio[]> {
  if (!produtoId) return [];

  const portfolio = await buscarPortfolioCorretora();
  const seguradoras = new Map<string, SeguradoraPortfolio>();

  for (const item of portfolio) {
    if (item.produto_id === produtoId) {
      seguradoras.set(item.seguradora.id, item.seguradora);
    }
  }

  return Array.from(seguradoras.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

export async function combinacaoExisteNoPortfolio(
  produtoId: string,
  seguradoraId: string,
): Promise<boolean> {
  if (!produtoId || !seguradoraId) return false;

  const corretoraId = await obterCorretoraAtual();

  const { data, error } = await supabase
    .from('tab_corretora_portfolio')
    .select('id')
    .eq('corretora_id', corretoraId)
    .eq('base_produto_id', produtoId)
    .eq('base_seguradora_id', seguradoraId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}