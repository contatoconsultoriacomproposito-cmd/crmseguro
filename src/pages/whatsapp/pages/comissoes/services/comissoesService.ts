import { supabase } from "../../../../../lib/supabaseClient";
import type {
  Comissao,
  ComissaoContratoDetalhada,
  ContextoContratoComissao,
  ComissaoDeducao,
  ComissaoMovimentacao,
  ComissaoPagamento,
  ComissaoRecebimento,
  ComissaoSplit,
  ComissaoSplitDeducao,
  FiltrosComissoes,
  ItemComissaoGeral,
  ResumoComissoesGeral,
  ResultadoBuscaComissoesGeral,
  TipoUsuarioComissao,
  CriarComissaoPayload,
  ResultadoCriarComissao,
  ReceberComissaoPayload,
  EstornarRecebimentoComissaoPayload,
  PagarComissaoSplitPayload,
  EstornarPagamentoComissaoPayload,
  CancelarProvisaoComissaoPayload,
  ReverterCancelamentoProvisaoComissaoPayload,
  ResultadoOperacaoComissao,
  ItemMinhaComissaoCorretor,
  ResumoMinhasComissoesCorretor,
  ResultadoBuscaMinhasComissoesCorretor,
} from "../types/comissoes";
import {
  adicionarSituacaoPagamentos,
  adicionarSituacaoRecebimentos,
  arredondarMoeda,
  calcularResumoPagamentos,
  calcularResumoRecebimentos,
  calcularResumoSplits,
} from "./comissoesCalculos";

interface PerfilComissao {
  id: string;
  tipo_usuario: TipoUsuarioComissao;
  corretora_id: string | null;
  nome: string | null;
  ativo: boolean;
}

interface UsuarioEquipeComissaoDb {
  id: string;
  nome: string | null;
  tipo_usuario: TipoUsuarioComissao;
  corretora_id: string | null;
  superior_id: string | null;
  ativo: boolean;
}

export interface OpcaoParticipanteComissao {
  value: string;
  label: string;
  tipo?: string;
}

interface ContratoComissaoDb {
  id: string;
  corretora_id: string;
  corretor_id: string;
  crm_pessoa_id: string | null;
  crm_empresa_id: string | null;
  produto_id: string;
  seguradora_id: string;
  numero_apolice: string | null;
  data_venda: string | null;
  valor_aceito: number;
  valor_atual: number;
  status: string;
}

interface PessoaDb {
  id: string;
  dados: Record<string, unknown> | null;
}

interface EmpresaDb {
  id: string;
  dados: Record<string, unknown> | null;
}

interface CadastroNomeDb {
  id: string;
  nome: string | null;
}

interface ComissaoGeralDb extends Comissao {
  crm_contratos: ContratoComissaoDb | null;
}

function mensagemErro(
  erro: unknown,
  fallback = "Erro ao processar a operação."
): string {
  if (erro instanceof Error && erro.message) {
    return erro.message;
  }

  if (
    typeof erro === "object" &&
    erro !== null &&
    "message" in erro &&
    typeof (erro as { message?: unknown }).message === "string"
  ) {
    return (erro as { message: string }).message;
  }

  return fallback;
}

function normalizarNumero(valor: unknown): number {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarPagina(
  pagina?: number,
  limite?: number
): {
  pagina: number;
  limite: number;
  inicio: number;
  fim: number;
} {
  const paginaFinal =
    Number.isInteger(pagina) && Number(pagina) > 0
      ? Number(pagina)
      : 1;

  const limiteFinal =
    Number.isInteger(limite) && Number(limite) > 0
      ? Math.min(Number(limite), 100)
      : 20;

  const inicio = (paginaFinal - 1) * limiteFinal;
  const fim = inicio + limiteFinal - 1;

  return {
    pagina: paginaFinal,
    limite: limiteFinal,
    inicio,
    fim,
  };
}

function extrairTexto(
  dados: Record<string, unknown> | null | undefined,
  chaves: string[]
): string | null {
  if (!dados) return null;

  for (const chave of chaves) {
    const valor = dados[chave];

    if (
      typeof valor === "string" &&
      valor.trim().length > 0
    ) {
      return valor.trim();
    }
  }

  return null;
}

function obterNomePessoa(
  dados: Record<string, unknown> | null | undefined
): string {
  return (
    extrairTexto(dados, [
      "nome",
      "nome_completo",
      "nome_razao_social",
    ]) ?? "Pessoa sem nome"
  );
}

function obterNomeEmpresa(
  dados: Record<string, unknown> | null | undefined
): string {
  return (
    extrairTexto(dados, [
      "nome_fantasia",
      "razao_social",
      "nome_razao_social",
      "nome",
    ]) ?? "Empresa sem nome"
  );
}

async function buscarPerfilAtualComissao(): Promise<PerfilComissao> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select(`
      id,
      tipo_usuario,
      corretora_id,
      nome,
      ativo
    `)
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Perfil do usuário não encontrado.");
  }

  if (!data.ativo) {
    throw new Error("Usuário inativo.");
  }

  if (
    !["CORRETORA", "CORRETOR", "ADMIN"].includes(
      data.tipo_usuario
    )
  ) {
    throw new Error("Tipo de usuário não suportado.");
  }

  return data as PerfilComissao;
}

export async function buscarContextoContratoComissao(
  contratoId: string
): Promise<ContextoContratoComissao> {
  try {
    if (!contratoId) {
      throw new Error("Contrato não informado.");
    }

    const perfil = await buscarPerfilAtualComissao();

    const { data, error } = await supabase
      .from("crm_contratos")
      .select(`
        id,
        corretora_id,
        corretor_id,
        crm_pessoa_id,
        crm_empresa_id,
        produto_id,
        seguradora_id,
        numero_apolice,
        valor_aceito,
        valor_atual,
        status,
        data_venda
      `)
      .eq("id", contratoId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Contrato não encontrado.");
    }

    if (perfil.tipo_usuario === "ADMIN") {
      throw new Error(
        "ADMIN ainda não possui permissão definida para este módulo."
      );
    }

    const corretoraIdPermitida =
      perfil.tipo_usuario === "CORRETORA"
        ? perfil.id
        : perfil.corretora_id;

    if (
      !corretoraIdPermitida ||
      data.corretora_id !== corretoraIdPermitida
    ) {
      throw new Error(
        "Você não possui acesso a este contrato."
      );
    }

    if (
      perfil.tipo_usuario === "CORRETOR" &&
      data.corretor_id !== perfil.id
    ) {
      throw new Error(
        "Você não possui acesso a este contrato."
      );
    }

    return {
      id: data.id,
      corretora_id: data.corretora_id,
      corretor_id: data.corretor_id,
      crm_pessoa_id: data.crm_pessoa_id,
      crm_empresa_id: data.crm_empresa_id,
      produto_id: data.produto_id,
      seguradora_id: data.seguradora_id,
      numero_apolice: data.numero_apolice,
      data_venda: data.data_venda,
      valor_aceito: normalizarNumero(
        data.valor_aceito
      ),
      valor_atual: normalizarNumero(
        data.valor_atual
      ),
      status: data.status,
    };
  } catch (erro) {
    throw new Error(
      mensagemErro(
        erro,
        "Não foi possível carregar os dados do contrato."
      )
    );
  }
}

export async function buscarComissaoPorContrato(
  contratoId: string
): Promise<Comissao | null> {
  if (!contratoId) {
    throw new Error("Contrato não informado.");
  }

  const { data, error } = await supabase
    .from("crm_comissoes")
    .select("*")
    .eq("contrato_id", contratoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Comissao | null) ?? null;
}

export async function buscarComissaoPorId(
  comissaoId: string
): Promise<Comissao | null> {
  if (!comissaoId) {
    throw new Error("Comissão não informada.");
  }

  const { data, error } = await supabase
    .from("crm_comissoes")
    .select("*")
    .eq("id", comissaoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Comissao | null) ?? null;
}

export async function buscarDeducoesComissao(
  comissaoId: string
): Promise<ComissaoDeducao[]> {
  if (!comissaoId) return [];

  const { data, error } = await supabase
    .from("crm_comissao_deducoes")
    .select("*")
    .eq("comissao_id", comissaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoDeducao[];
}

export async function buscarRecebimentosComissao(
  comissaoId: string
): Promise<ComissaoRecebimento[]> {
  if (!comissaoId) return [];

  const { data, error } = await supabase
    .from("crm_comissao_recebimentos")
    .select("*")
    .eq("comissao_id", comissaoId)
    .order("numero_provisao", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoRecebimento[];
}

export async function buscarSplitsComissao(
  comissaoId: string
): Promise<ComissaoSplit[]> {
  if (!comissaoId) return [];

  const { data, error } = await supabase
    .from("crm_comissao_splits")
    .select("*")
    .eq("comissao_id", comissaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoSplit[];
}

export async function buscarDeducoesSplitsComissao(
  comissaoId: string
): Promise<ComissaoSplitDeducao[]> {
  if (!comissaoId) return [];

  const { data, error } = await supabase
    .from("crm_comissao_split_deducoes")
    .select("*")
    .eq("comissao_id", comissaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoSplitDeducao[];
}

export async function buscarPagamentosComissao(
  comissaoId: string
): Promise<ComissaoPagamento[]> {
  if (!comissaoId) return [];

  const { data, error } = await supabase
    .from("crm_comissao_pagamentos")
    .select("*")
    .eq("comissao_id", comissaoId)
    .order("data_prevista", { ascending: true })
    .order("numero_provisao", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoPagamento[];
}

export async function buscarMovimentacoesComissao(
  comissaoId: string
): Promise<ComissaoMovimentacao[]> {
  if (!comissaoId) return [];

  const { data, error } = await supabase
    .from("crm_comissao_movimentacoes")
    .select("*")
    .eq("comissao_id", comissaoId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoMovimentacao[];
}

export async function buscarComissaoContratoDetalhada(
  contratoId: string,
  incluirMovimentacoes = false
): Promise<ComissaoContratoDetalhada | null> {
  if (!contratoId) {
    throw new Error("Contrato não informado.");
  }

  const perfil = await buscarPerfilAtualComissao();

  if (perfil.tipo_usuario === "ADMIN") {
    throw new Error(
      "ADMIN ainda não possui permissão definida para este módulo."
    );
  }

  const contextoContrato =
    await buscarContextoContratoComissao(
      contratoId
    );

  const corretoraIdPermitida =
    perfil.tipo_usuario === "CORRETORA"
      ? perfil.id
      : perfil.corretora_id;

  if (
    !corretoraIdPermitida ||
    contextoContrato.corretora_id !== corretoraIdPermitida
  ) {
    throw new Error(
      "Você não possui acesso à comissão deste contrato."
    );
  }

  if (
    perfil.tipo_usuario === "CORRETOR" &&
    contextoContrato.corretor_id !== perfil.id
  ) {
    throw new Error(
      "Você não possui acesso à comissão deste contrato."
    );
  }

  const comissao = await buscarComissaoPorContrato(
    contratoId
  );

  if (!comissao) {
    return null;
  }

  const [
    deducoes,
    recebimentosBrutos,
    splits,
    splitDeducoes,
    pagamentosBrutos,
    movimentacoes,
  ] = await Promise.all([
    buscarDeducoesComissao(comissao.id),
    buscarRecebimentosComissao(comissao.id),
    buscarSplitsComissao(comissao.id),
    buscarDeducoesSplitsComissao(comissao.id),
    buscarPagamentosComissao(comissao.id),
    incluirMovimentacoes
      ? buscarMovimentacoesComissao(comissao.id)
      : Promise.resolve([] as ComissaoMovimentacao[]),
  ]);

  const recebimentos =
    adicionarSituacaoRecebimentos(recebimentosBrutos);

  const pagamentos =
    adicionarSituacaoPagamentos(pagamentosBrutos);

  return {
    comissao,
    deducoes,
    recebimentos,
    splits,
    split_deducoes: splitDeducoes,
    pagamentos,
    movimentacoes: incluirMovimentacoes
      ? movimentacoes
      : undefined,
    resumo_recebimentos:
      calcularResumoRecebimentos(recebimentos),
    resumo_pagamentos:
      calcularResumoPagamentos(pagamentos),
    resumo_splits: calcularResumoSplits({
      valor_comissao_bruta:
        comissao.valor_comissao_bruta,
      splits,
    }),
  };
}

export async function buscarMinhasComissoesCorretor(
  filtros: FiltrosComissoes = {}
): Promise<ResultadoBuscaMinhasComissoesCorretor> {
  try {
    const perfil = await buscarPerfilAtualComissao();

    const pagina =
      Number.isInteger(filtros.pagina) &&
      Number(filtros.pagina) > 0
        ? Number(filtros.pagina)
        : 1;

    const limite =
      Number.isInteger(filtros.limite) &&
      Number(filtros.limite) > 0
        ? Math.min(Number(filtros.limite), 100)
        : 20;

    const resultadoVazio: ResultadoBuscaMinhasComissoesCorretor = {
      itens: [],
      resumo: {
        valor_bruto: 0,
        valor_deducoes: 0,
        valor_liquido: 0,
        valor_a_receber: 0,
        valor_vence_hoje: 0,
        valor_atrasado: 0,
        valor_pago: 0,
        quantidade_comissoes: 0,
      },
      total: 0,
      pagina,
      limite,
      total_paginas: 0,
    };

    if (perfil.tipo_usuario !== "CORRETOR") {
      return resultadoVazio;
    }

    /*
     * O CORRETOR parte exclusivamente dos próprios splits.
     * Não consultamos crm_comissoes aqui.
     */
    const { data: splitsData, error: splitsError } =
      await supabase
        .from("crm_comissao_splits")
        .select("*")
        .eq("usuario_id", perfil.id)
        .eq("tipo_participante", "CORRETOR")
        .eq("residual_corretora", false)
        .order("created_at", {
          ascending: false,
        });

    if (splitsError) {
      throw new Error(splitsError.message);
    }

    const splits =
      (splitsData ?? []) as ComissaoSplit[];

    if (!splits.length) {
      return resultadoVazio;
    }

    const contratoIds = idsUnicos(
      splits.map((split) => split.contrato_id)
    );

    const splitIds = idsUnicos(
      splits.map((split) => split.id)
    );

    const [
      contratosResult,
      deducoesResult,
      pagamentosResult,
    ] = await Promise.all([
      supabase
        .from("crm_contratos")
        .select(`
          id,
          corretora_id,
          corretor_id,
          crm_pessoa_id,
          crm_empresa_id,
          produto_id,
          seguradora_id,
          numero_apolice,
          data_venda,
          valor_aceito,
          valor_atual,
          status
        `)
        .in("id", contratoIds),

      supabase
        .from("crm_comissao_split_deducoes")
        .select("*")
        .in("split_id", splitIds)
        .order("ordem", {
          ascending: true,
        }),

      supabase
        .from("crm_comissao_pagamentos")
        .select("*")
        .in("split_id", splitIds)
        .order("data_prevista", {
          ascending: true,
        })
        .order("numero_provisao", {
          ascending: true,
        }),
    ]);

    if (contratosResult.error) {
      throw new Error(
        contratosResult.error.message
      );
    }

    if (deducoesResult.error) {
      throw new Error(
        deducoesResult.error.message
      );
    }

    if (pagamentosResult.error) {
      throw new Error(
        pagamentosResult.error.message
      );
    }

    const contratos =
      (contratosResult.data ??
        []) as ContratoComissaoDb[];

    const deducoes =
      (deducoesResult.data ??
        []) as ComissaoSplitDeducao[];

    const pagamentos =
      (pagamentosResult.data ??
        []) as ComissaoPagamento[];

    /*
     * Segunda barreira:
     * mesmo que o RLS já proteja, só aceitamos contratos
     * efetivamente pertencentes ao corretor autenticado.
     */
    const contratosPermitidos =
      contratos.filter(
        (contrato) =>
          contrato.corretor_id === perfil.id &&
          contrato.corretora_id ===
            perfil.corretora_id
      );

    const mapaContratos = new Map(
      contratosPermitidos.map(
        (contrato) => [
          contrato.id,
          contrato,
        ]
      )
    );

    const [
      pessoas,
      empresas,
      produtos,
      seguradoras,
    ] = await Promise.all([
      buscarPessoasPorIds(
        idsUnicos(
          contratosPermitidos.map(
            (contrato) =>
              contrato.crm_pessoa_id
          )
        )
      ),

      buscarEmpresasPorIds(
        idsUnicos(
          contratosPermitidos.map(
            (contrato) =>
              contrato.crm_empresa_id
          )
        )
      ),

      buscarProdutosPorIds(
        idsUnicos(
          contratosPermitidos.map(
            (contrato) =>
              contrato.produto_id
          )
        )
      ),

      buscarSeguradorasPorIds(
        idsUnicos(
          contratosPermitidos.map(
            (contrato) =>
              contrato.seguradora_id
          )
        )
      ),
    ]);

    let itens: ItemMinhaComissaoCorretor[] =
      splits.flatMap((split) => {
        const contrato =
          mapaContratos.get(
            split.contrato_id
          );

        if (!contrato) {
          return [];
        }

        const pessoa =
          contrato.crm_pessoa_id
            ? pessoas.get(
                contrato.crm_pessoa_id
              )
            : null;

        const empresa =
          contrato.crm_empresa_id
            ? empresas.get(
                contrato.crm_empresa_id
              )
            : null;

        const cliente = pessoa
          ? {
              id: pessoa.id,
              nome: obterNomePessoa(
                pessoa.dados
              ),
              tipo: "PF" as const,
            }
          : empresa
            ? {
                id: empresa.id,
                nome: obterNomeEmpresa(
                  empresa.dados
                ),
                tipo: "PJ" as const,
              }
            : null;

        const deducoesSplit =
          deducoes.filter(
            (deducao) =>
              deducao.split_id ===
              split.id
          );

        const pagamentosSplit =
          adicionarSituacaoPagamentos(
            pagamentos.filter(
              (pagamento) =>
                pagamento.split_id ===
                split.id
            )
          );

        return [
          {
            split,

            contrato: {
              id: contrato.id,
              numero_apolice:
                contrato.numero_apolice,
              data_venda:
                contrato.data_venda,
              produto_id:
                contrato.produto_id,
              seguradora_id:
                contrato.seguradora_id,
              corretor_id:
                contrato.corretor_id,
              valor_aceito:
                normalizarNumero(
                  contrato.valor_aceito
                ),
              valor_atual:
                normalizarNumero(
                  contrato.valor_atual
                ),
              status:
                contrato.status,
            },

            cliente,

            produto_nome:
              produtos.get(
                contrato.produto_id
              )?.nome ?? null,

            seguradora_nome:
              seguradoras.get(
                contrato.seguradora_id
              )?.nome ?? null,

            deducoes:
              deducoesSplit,

            pagamentos:
              pagamentosSplit,

            resumo_pagamentos:
              calcularResumoPagamentos(
                pagamentosSplit
              ),
          },
        ];
      });

    /*
     * Busca textual.
     */
    const busca =
      filtros.busca
        ?.trim()
        .toLocaleLowerCase(
          "pt-BR"
        ) ?? "";

    if (busca) {
      itens = itens.filter(
        (item) => {
          const texto = [
            item.cliente?.nome,
            item.contrato.numero_apolice,
            item.produto_nome,
            item.seguradora_nome,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(
              "pt-BR"
            );

          return texto.includes(busca);
        }
      );
    }

    if (filtros.seguradora_id) {
      itens = itens.filter(
        (item) =>
          item.contrato.seguradora_id ===
          filtros.seguradora_id
      );
    }

    if (filtros.produto_id) {
      itens = itens.filter(
        (item) =>
          item.contrato.produto_id ===
          filtros.produto_id
      );
    }

    if (filtros.contrato_id) {
      itens = itens.filter(
        (item) =>
          item.contrato.id ===
          filtros.contrato_id
      );
    }

    if (filtros.cliente_id) {
      itens = itens.filter(
        (item) =>
          item.cliente?.id ===
          filtros.cliente_id
      );
    }

    /*
     * Na visão pessoal, corretor_id só pode ser o próprio
     * usuário. Se chegar outro ID pelo filtro, não retorna nada.
     */
    if (
      filtros.corretor_id &&
      filtros.corretor_id !== perfil.id
    ) {
      itens = [];
    }

    if (
      filtros.situacao_pagamento
    ) {
      itens = itens.filter(
        (item) =>
          item.pagamentos.some(
            (pagamento) =>
              pagamento.situacao ===
              filtros.situacao_pagamento
          )
      );
    }

    if (filtros.data_inicio) {
      itens = itens.filter(
        (item) =>
          Boolean(item.contrato.data_venda) &&
          item.contrato.data_venda! >=
            filtros.data_inicio!
      );
    }

    if (filtros.data_fim) {
      itens = itens.filter(
        (item) =>
          Boolean(item.contrato.data_venda) &&
          item.contrato.data_venda! <=
            filtros.data_fim!
      );
    }

    /*
     * O filtro de recebimento não se aplica à visão do
     * corretor, pois recebimento é Seguradora → Corretora.
     */

    const resumo: ResumoMinhasComissoesCorretor = {
      valor_bruto: arredondarMoeda(
        itens.reduce(
          (total, item) =>
            total +
            normalizarNumero(
              item.split
                .valor_bruto_split
            ),
          0
        )
      ),

      valor_deducoes:
        arredondarMoeda(
          itens.reduce(
            (total, item) =>
              total +
              normalizarNumero(
                item.split
                  .valor_deducoes
              ),
            0
          )
        ),

      valor_liquido:
        arredondarMoeda(
          itens.reduce(
            (total, item) =>
              total +
              normalizarNumero(
                item.split
                  .valor_liquido_split
              ),
            0
          )
        ),

      valor_a_receber:
        arredondarMoeda(
          itens.reduce(
            (total, item) =>
              total +
              item.resumo_pagamentos
                .valor_a_pagar,
            0
          )
        ),

      valor_vence_hoje:
        arredondarMoeda(
          itens.reduce(
            (total, item) =>
              total +
              item.resumo_pagamentos
                .valor_vence_hoje,
            0
          )
        ),

      valor_atrasado:
        arredondarMoeda(
          itens.reduce(
            (total, item) =>
              total +
              item.resumo_pagamentos
                .valor_atrasado,
            0
          )
        ),

      valor_pago:
        arredondarMoeda(
          itens.reduce(
            (total, item) =>
              total +
              item.resumo_pagamentos
                .valor_pago,
            0
          )
        ),

      quantidade_comissoes:
        itens.length,
    };

    const total = itens.length;

    const totalPaginas =
      total > 0
        ? Math.ceil(
            total / limite
          )
        : 0;

    const inicio =
      (pagina - 1) * limite;

    const fim =
      inicio + limite;

    const itensPaginados =
      itens.slice(
        inicio,
        fim
      );

    return {
      itens: itensPaginados,
      resumo,
      total,
      pagina,
      limite,
      total_paginas:
        totalPaginas,
    };
  } catch (erro) {
    throw new Error(
      mensagemErro(
        erro,
        "Não foi possível carregar suas comissões."
      )
    );
  }
}

export async function buscarMinhaComissaoContratoCorretor(
  contratoId: string
): Promise<ItemMinhaComissaoCorretor | null> {
  if (!contratoId) {
    throw new Error("Contrato não informado.");
  }

  const resultado =
    await buscarMinhasComissoesCorretor({
      contrato_id: contratoId,
      pagina: 1,
      limite: 1,
    });

  return resultado.itens[0] ?? null;
}

export async function buscarMeusSplitsComissao(): Promise<
  ComissaoSplit[]
> {
  const perfil = await buscarPerfilAtualComissao();

  if (perfil.tipo_usuario !== "CORRETOR") {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_comissao_splits")
    .select("*")
    .eq("usuario_id", perfil.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoSplit[];
}

export async function buscarMeusPagamentosComissao(): Promise<
  ComissaoPagamento[]
> {
  const perfil = await buscarPerfilAtualComissao();

  if (perfil.tipo_usuario !== "CORRETOR") {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_comissao_pagamentos")
    .select(`
      *,
      crm_comissao_splits!inner (
        usuario_id
      )
    `)
    .eq("crm_comissao_splits.usuario_id", perfil.id)
    .order("data_prevista", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => {
    const {
      crm_comissao_splits: _split,
      ...pagamento
    } = item;

    return pagamento as ComissaoPagamento;
  });
}

export async function buscarMinhasDeducoesSplits(): Promise<
  ComissaoSplitDeducao[]
> {
  const perfil = await buscarPerfilAtualComissao();

  if (perfil.tipo_usuario !== "CORRETOR") {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_comissao_split_deducoes")
    .select(`
      *,
      crm_comissao_splits!inner (
        usuario_id
      )
    `)
    .eq("crm_comissao_splits.usuario_id", perfil.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => {
    const {
      crm_comissao_splits: _split,
      ...deducao
    } = item;

    return deducao as ComissaoSplitDeducao;
  });
}

export async function buscarMinhasMovimentacoesComissao(): Promise<
  ComissaoMovimentacao[]
> {
  const perfil = await buscarPerfilAtualComissao();

  if (perfil.tipo_usuario !== "CORRETOR") {
    return [];
  }

  const { data, error } = await supabase
    .from("crm_comissao_movimentacoes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComissaoMovimentacao[];
}

async function buscarPessoasPorIds(
  ids: string[]
): Promise<Map<string, PessoaDb>> {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("crm_pessoas")
    .select("id, dados")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as PessoaDb[]).map((item) => [
      item.id,
      item,
    ])
  );
}

async function buscarEmpresasPorIds(
  ids: string[]
): Promise<Map<string, EmpresaDb>> {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("crm_empresas")
    .select("id, dados")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as EmpresaDb[]).map((item) => [
      item.id,
      item,
    ])
  );
}

async function buscarProdutosPorIds(
  ids: string[]
): Promise<Map<string, CadastroNomeDb>> {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("base_produtos")
    .select("id, nome")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as CadastroNomeDb[]).map((item) => [
      item.id,
      item,
    ])
  );
}

async function buscarSeguradorasPorIds(
  ids: string[]
): Promise<Map<string, CadastroNomeDb>> {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("base_seguradoras")
    .select("id, nome")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as CadastroNomeDb[]).map((item) => [
      item.id,
      item,
    ])
  );
}

async function buscarCorretoresPorIds(
  ids: string[]
): Promise<Map<string, CadastroNomeDb>> {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select("id, nome")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as CadastroNomeDb[]).map((item) => [
      item.id,
      item,
    ])
  );
}

export async function buscarCorretoresComissao(): Promise<
  OpcaoParticipanteComissao[]
> {
  try {
    const perfil = await buscarPerfilAtualComissao();

    if (perfil.tipo_usuario === "ADMIN") {
      return [];
    }

    const corretoraId =
      perfil.tipo_usuario === "CORRETORA"
        ? perfil.id
        : perfil.corretora_id;

    if (!corretoraId) {
      return [];
    }

    const { data, error } = await supabase
      .from("usuarios_perfis")
      .select(`
        id,
        nome,
        tipo_usuario,
        corretora_id,
        superior_id,
        ativo
      `)
      .eq("corretora_id", corretoraId)
      .eq("tipo_usuario", "CORRETOR")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as UsuarioEquipeComissaoDb[]).map(
      (usuario) => ({
        value: usuario.id,
        label:
          usuario.nome?.trim() ||
          "Corretor sem nome",
      })
    );
  } catch (erro) {
    throw new Error(
      mensagemErro(
        erro,
        "Não foi possível carregar os corretores."
      )
    );
  }
}

function idsUnicos(
  valores: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      valores.filter(
        (valor): valor is string =>
          typeof valor === "string" &&
          valor.length > 0
      )
    )
  );
}

export async function buscarSupervisoresComissao(): Promise<
  OpcaoParticipanteComissao[]
> {
  try {
    const perfil = await buscarPerfilAtualComissao();

    if (perfil.tipo_usuario === "ADMIN") {
      return [];
    }

    const corretoraId =
      perfil.tipo_usuario === "CORRETORA"
        ? perfil.id
        : perfil.corretora_id;

    if (!corretoraId) {
      return [];
    }

    const { data: equipe, error: equipeError } =
      await supabase
        .from("usuarios_perfis")
        .select(`
          id,
          nome,
          tipo_usuario,
          corretora_id,
          superior_id,
          ativo
        `)
        .eq("corretora_id", corretoraId)
        .eq("tipo_usuario", "CORRETOR")
        .eq("ativo", true);

    if (equipeError) {
      throw new Error(equipeError.message);
    }

    const idsSupervisores = Array.from(
      new Set(
        (
          (equipe ?? []) as UsuarioEquipeComissaoDb[]
        )
          .map((usuario) => usuario.superior_id)
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              id.length > 0
          )
      )
    );

    if (idsSupervisores.length === 0) {
      return [];
    }

    const {
      data: supervisores,
      error: supervisoresError,
    } = await supabase
      .from("usuarios_perfis")
      .select(`
        id,
        nome,
        tipo_usuario,
        corretora_id,
        superior_id,
        ativo
      `)
      .in("id", idsSupervisores)
      .eq("tipo_usuario", "CORRETOR")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (supervisoresError) {
      throw new Error(supervisoresError.message);
    }

    return (
      (supervisores ?? []) as UsuarioEquipeComissaoDb[]
    )
      .filter(
        (usuario) =>
          usuario.corretora_id === corretoraId
      )
      .map((usuario) => ({
        value: usuario.id,
        label:
          usuario.nome?.trim() ||
          "Supervisor sem nome",
      }));
  } catch (erro) {
    throw new Error(
      mensagemErro(
        erro,
        "Não foi possível carregar os supervisores."
      )
    );
  }
}

function criarReferenciaParticipanteSplit(
  split: Pick<
    ComissaoSplit,
    "usuario_id" | "participante_nome" | "tipo_participante"
  >
): string | null {
  if (split.usuario_id) {
    return `usuario:${split.usuario_id}`;
  }

  const nome = split.participante_nome?.trim();
  if (!nome) return null;

  return `nome:${split.tipo_participante}:${encodeURIComponent(nome)}`;
}

function splitCorrespondeParticipante(
  split: ComissaoSplit,
  participanteId?: string
): boolean {
  if (!participanteId) return true;
  return criarReferenciaParticipanteSplit(split) === participanteId;
}

export async function buscarParticipantesFiltroComissao(): Promise<
  OpcaoParticipanteComissao[]
> {
  try {
    const perfil = await buscarPerfilAtualComissao();

    if (perfil.tipo_usuario !== "CORRETORA") {
      return [];
    }

    const { data, error } = await supabase
      .from("crm_comissao_splits")
      .select("usuario_id, participante_nome, tipo_participante")
      .eq("corretora_id", perfil.id);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      usuario_id: string | null;
      participante_nome: string | null;
      tipo_participante: string;
    }>;

    const idsUsuarios = Array.from(
      new Set(
        rows
          .map((row) => row.usuario_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const nomesUsuarios = new Map<string, string>();

    if (idsUsuarios.length > 0) {
      const { data: usuarios, error: usuariosError } = await supabase
        .from("usuarios_perfis")
        .select("id, nome")
        .in("id", idsUsuarios);

      if (usuariosError) throw new Error(usuariosError.message);

      for (const usuario of usuarios ?? []) {
        if (usuario.id && usuario.nome) {
          nomesUsuarios.set(usuario.id, usuario.nome);
        }
      }
    }

    const mapa = new Map<string, OpcaoParticipanteComissao>();

    for (const row of rows) {
      const ref = criarReferenciaParticipanteSplit(
        row as Pick<ComissaoSplit, "usuario_id" | "participante_nome" | "tipo_participante">
      );

      if (!ref) continue;

      const nome = row.participante_nome?.trim();
      const nomeUsuario = row.usuario_id
        ? nomesUsuarios.get(row.usuario_id)
        : null;
      const label = nome || nomeUsuario ||
        (row.tipo_participante === "CORRETORA"
          ? "Corretora"
          : row.tipo_participante);

      mapa.set(ref, {
        value: ref,
        label,
        tipo: row.tipo_participante,
      });
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR")
    );
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível carregar os participantes da comissão.")
    );
  }
}

async function buscarResumosComissoes(
  comissoes: Comissao[],
  filtros: FiltrosComissoes = {}
): Promise<
  Map<
    string,
    {
      recebimentos: ReturnType<
        typeof calcularResumoRecebimentos
      >;
      pagamentos: ReturnType<
        typeof calcularResumoPagamentos
      >;
      splits: ReturnType<typeof calcularResumoSplits>;
      correspondeParticipante: boolean;
    }
  >
> {
  const ids = comissoes.map((item) => item.id);

  if (!ids.length) return new Map();

  const [recebimentosResult, pagamentosResult, splitsResult] =
    await Promise.all([
      supabase.from("crm_comissao_recebimentos").select("*").in("comissao_id", ids),
      supabase.from("crm_comissao_pagamentos").select("*").in("comissao_id", ids),
      supabase.from("crm_comissao_splits").select("*").in("comissao_id", ids),
    ]);

  if (recebimentosResult.error) throw new Error(recebimentosResult.error.message);
  if (pagamentosResult.error) throw new Error(pagamentosResult.error.message);
  if (splitsResult.error) throw new Error(splitsResult.error.message);

  const recebimentos = (recebimentosResult.data ?? []) as ComissaoRecebimento[];
  const pagamentos = (pagamentosResult.data ?? []) as ComissaoPagamento[];
  const splits = (splitsResult.data ?? []) as ComissaoSplit[];

  const possuiFiltroParticipante = Boolean(
    filtros.tipo_participante || filtros.participante_id
  );

  const mapa = new Map<
    string,
    {
      recebimentos: ReturnType<typeof calcularResumoRecebimentos>;
      pagamentos: ReturnType<typeof calcularResumoPagamentos>;
      splits: ReturnType<typeof calcularResumoSplits>;
      correspondeParticipante: boolean;
    }
  >();

  for (const comissao of comissoes) {
    const recebimentosComissao = adicionarSituacaoRecebimentos(
      recebimentos.filter((item) => item.comissao_id === comissao.id)
    );

    const splitsComissao = splits.filter(
      (item) => item.comissao_id === comissao.id
    );

    const splitsEscopo = splitsComissao.filter((split) => {
      if (
        filtros.tipo_participante &&
        split.tipo_participante !== filtros.tipo_participante
      ) {
        return false;
      }

      return splitCorrespondeParticipante(
        split,
        filtros.participante_id
      );
    });

    const idsSplitsEscopo = new Set(
      splitsEscopo.map((split) => split.id)
    );

    const pagamentosBase = pagamentos.filter(
      (item) => item.comissao_id === comissao.id
    );

    const pagamentosComissao = adicionarSituacaoPagamentos(
      possuiFiltroParticipante
        ? pagamentosBase.filter((item) =>
            idsSplitsEscopo.has(item.split_id)
          )
        : pagamentosBase
    );

    mapa.set(comissao.id, {
      recebimentos: calcularResumoRecebimentos(recebimentosComissao),
      pagamentos: calcularResumoPagamentos(pagamentosComissao),
      splits: calcularResumoSplits({
        valor_comissao_bruta: comissao.valor_comissao_bruta,
        splits: splitsComissao,
      }),
      correspondeParticipante:
        !possuiFiltroParticipante || splitsEscopo.length > 0,
    });
  }

  return mapa;
}

function criarResumoGeralVazio(): ResumoComissoesGeral {
  return {
    valor_comissao_bruta: 0,
    valor_total_a_receber: 0,
    valor_a_receber: 0,
    valor_recebe_hoje: 0,
    valor_atrasado_recebimento: 0,
    valor_recebido: 0,
    valor_total_a_pagar: 0,
    valor_a_pagar: 0,
    valor_vence_hoje_pagamento: 0,
    valor_atrasado_pagamento: 0,
    valor_pago: 0,
    valor_residual_corretora: 0,
    quantidade_comissoes: 0,
  };
}

function calcularResumoGeral(
  itens: ItemComissaoGeral[]
): ResumoComissoesGeral {
  const resumo = criarResumoGeralVazio();
  resumo.quantidade_comissoes = itens.length;

  for (const item of itens) {
    resumo.valor_comissao_bruta += item.comissao.valor_comissao_bruta;
    resumo.valor_a_receber += item.resumo_recebimentos.valor_a_receber;
    resumo.valor_recebe_hoje += item.resumo_recebimentos.valor_recebe_hoje;
    resumo.valor_atrasado_recebimento += item.resumo_recebimentos.valor_atrasado;
    resumo.valor_recebido += item.resumo_recebimentos.valor_recebido;

    resumo.valor_a_pagar += item.resumo_pagamentos.valor_a_pagar;
    resumo.valor_vence_hoje_pagamento += item.resumo_pagamentos.valor_vence_hoje;
    resumo.valor_atrasado_pagamento += item.resumo_pagamentos.valor_atrasado;
    resumo.valor_pago += item.resumo_pagamentos.valor_pago;

    resumo.valor_residual_corretora +=
      item.resumo_splits.valor_residual_corretora;
  }

  resumo.valor_total_a_receber =
    resumo.valor_a_receber +
    resumo.valor_recebe_hoje +
    resumo.valor_atrasado_recebimento;

  resumo.valor_total_a_pagar =
    resumo.valor_a_pagar +
    resumo.valor_vence_hoje_pagamento +
    resumo.valor_atrasado_pagamento;

  return {
    valor_comissao_bruta: arredondarMoeda(resumo.valor_comissao_bruta),
    valor_total_a_receber: arredondarMoeda(resumo.valor_total_a_receber),
    valor_a_receber: arredondarMoeda(resumo.valor_a_receber),
    valor_recebe_hoje: arredondarMoeda(resumo.valor_recebe_hoje),
    valor_atrasado_recebimento: arredondarMoeda(resumo.valor_atrasado_recebimento),
    valor_recebido: arredondarMoeda(resumo.valor_recebido),
    valor_total_a_pagar: arredondarMoeda(resumo.valor_total_a_pagar),
    valor_a_pagar: arredondarMoeda(resumo.valor_a_pagar),
    valor_vence_hoje_pagamento: arredondarMoeda(resumo.valor_vence_hoje_pagamento),
    valor_atrasado_pagamento: arredondarMoeda(resumo.valor_atrasado_pagamento),
    valor_pago: arredondarMoeda(resumo.valor_pago),
    valor_residual_corretora: arredondarMoeda(resumo.valor_residual_corretora),
    quantidade_comissoes: resumo.quantidade_comissoes,
  };
}

export async function buscarComissoesGeral(
  filtros: FiltrosComissoes = {}
): Promise<ResultadoBuscaComissoesGeral> {
  try {
    const perfil = await buscarPerfilAtualComissao();

    if (perfil.tipo_usuario === "ADMIN") {
      return {
        itens: [],
        resumo: criarResumoGeralVazio(),
        total: 0,
        pagina: 1,
        limite: filtros.limite ?? 20,
        total_paginas: 0,
      };
    }

    /*
     * IMPORTANTE:
     * A tela geral completa pertence à CORRETORA.
     *
     * CORRETOR não pode consultar crm_comissoes devido ao RLS,
     * pois isso revelaria comissão bruta, base, residual etc.
     *
     * Para CORRETOR teremos posteriormente uma visão própria,
     * construída sobre splits/pagamentos.
     */
    if (perfil.tipo_usuario !== "CORRETORA") {
      return {
        itens: [],
        resumo: criarResumoGeralVazio(),
        total: 0,
        pagina: 1,
        limite: filtros.limite ?? 20,
        total_paginas: 0,
      };
    }

    const {
      pagina,
      limite,
    } = normalizarPagina(
      filtros.pagina,
      filtros.limite
    );

    let query = supabase
      .from("crm_comissoes")
      .select(
        `
          *,
          crm_contratos!inner (
            id,
            corretora_id,
            corretor_id,
            crm_pessoa_id,
            crm_empresa_id,
            produto_id,
            seguradora_id,
            numero_apolice,
            data_venda,
            valor_aceito,
            valor_atual,
            status
          )
        `,
        { count: "exact" }
      )
      .eq("corretora_id", perfil.id);

    if (filtros.contrato_id) {
      query = query.eq(
        "contrato_id",
        filtros.contrato_id
      );
    }

    if (filtros.corretor_id) {
      query = query.eq(
        "crm_contratos.corretor_id",
        filtros.corretor_id
      );
    }

    if (filtros.seguradora_id) {
      query = query.eq(
        "crm_contratos.seguradora_id",
        filtros.seguradora_id
      );
    }

    if (filtros.produto_id) {
      query = query.eq(
        "crm_contratos.produto_id",
        filtros.produto_id
      );
    }

    if (filtros.data_inicio) {
      query = query.gte(
        "crm_contratos.data_venda",
        filtros.data_inicio
      );
    }

    if (filtros.data_fim) {
      query = query.lte(
        "crm_contratos.data_venda",
        filtros.data_fim
      );
    }

    const {
      data,
      error,
    } = await query
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const registros =
      (data ?? []) as unknown as ComissaoGeralDb[];

    const comissoes = registros.map(
      (item) =>
        ({
          id: item.id,
          corretora_id: item.corretora_id,
          contrato_id: item.contrato_id,
          tipo_calculo_comissao:
            item.tipo_calculo_comissao,
          percentual_comissao:
            item.percentual_comissao,
          valor_comissao_fixa:
            item.valor_comissao_fixa,
          valor_base_original:
            normalizarNumero(
              item.valor_base_original
            ),
          valor_deducoes_base:
            normalizarNumero(
              item.valor_deducoes_base
            ),
          valor_base_calculo:
            normalizarNumero(
              item.valor_base_calculo
            ),
          valor_comissao_bruta:
            normalizarNumero(
              item.valor_comissao_bruta
            ),
          observacoes: item.observacoes,
          metadata: item.metadata ?? {},
          criado_por_id: item.criado_por_id,
          atualizado_por_id:
            item.atualizado_por_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }) satisfies Comissao
    );

    const contratos = registros
      .map((item) => item.crm_contratos)
      .filter(
        (
          contrato
        ): contrato is ContratoComissaoDb =>
          Boolean(contrato)
      );

    const [
      pessoas,
      empresas,
      produtos,
      seguradoras,
      corretores,
      resumos,
    ] = await Promise.all([
      buscarPessoasPorIds(
        idsUnicos(
          contratos.map(
            (contrato) =>
              contrato.crm_pessoa_id
          )
        )
      ),
      buscarEmpresasPorIds(
        idsUnicos(
          contratos.map(
            (contrato) =>
              contrato.crm_empresa_id
          )
        )
      ),
      buscarProdutosPorIds(
        idsUnicos(
          contratos.map(
            (contrato) =>
              contrato.produto_id
          )
        )
      ),
      buscarSeguradorasPorIds(
        idsUnicos(
          contratos.map(
            (contrato) =>
              contrato.seguradora_id
          )
        )
      ),
      buscarCorretoresPorIds(
        idsUnicos(
          contratos.map(
            (contrato) =>
              contrato.corretor_id
          )
        )
      ),
      buscarResumosComissoes(comissoes, filtros),
    ]);

    let itens: ItemComissaoGeral[] =
      registros.flatMap((registro) => {
        const contrato =
          registro.crm_contratos;

        if (!contrato) {
          return [];
        }

        const comissao = comissoes.find(
          (item) => item.id === registro.id
        );

        if (!comissao) {
          return [];
        }

        const pessoa = contrato.crm_pessoa_id
          ? pessoas.get(contrato.crm_pessoa_id)
          : null;

        const empresa =
          contrato.crm_empresa_id
            ? empresas.get(
                contrato.crm_empresa_id
              )
            : null;

        const cliente = pessoa
          ? {
              id: pessoa.id,
              nome: obterNomePessoa(
                pessoa.dados
              ),
              tipo: "PF" as const,
            }
          : empresa
            ? {
                id: empresa.id,
                nome: obterNomeEmpresa(
                  empresa.dados
                ),
                tipo: "PJ" as const,
              }
            : null;

        const resumo = resumos.get(
          comissao.id
        );

        if (!resumo) {
          return [];
        }

        if (!resumo.correspondeParticipante) {
          return [];
        }

        return [
          {
            comissao,
            contrato: {
              id: contrato.id,
              numero_apolice:
                contrato.numero_apolice,
              data_venda:
                contrato.data_venda,
              produto_id:
                contrato.produto_id,
              seguradora_id:
                contrato.seguradora_id,
              corretor_id:
                contrato.corretor_id,
              valor_aceito:
                normalizarNumero(
                  contrato.valor_aceito
                ),
              valor_atual:
                normalizarNumero(
                  contrato.valor_atual
                ),
              status: contrato.status,
            },
            cliente,
            produto_nome:
              produtos.get(
                contrato.produto_id
              )?.nome ?? null,
            seguradora_nome:
              seguradoras.get(
                contrato.seguradora_id
              )?.nome ?? null,
            corretor_nome:
              corretores.get(
                contrato.corretor_id
              )?.nome ?? null,
            resumo_recebimentos:
              resumo.recebimentos,
            resumo_pagamentos:
              resumo.pagamentos,
            resumo_splits:
              resumo.splits,
          },
        ];
      });

    /*
     * Os filtros abaixo dependem de dados derivados ou de
     * entidades buscadas separadamente. Por enquanto são
     * aplicados sobre a página carregada.
     *
     * Antes de produção, filtros globais + paginação deverão
     * ser levados para RPC/view SQL para que o total seja
     * matematicamente global.
     */
    if (filtros.cliente_id) {
      itens = itens.filter(
        (item) =>
          item.cliente?.id ===
          filtros.cliente_id
      );
    }

    if (filtros.busca?.trim()) {
      const busca =
        filtros.busca
          .trim()
          .toLocaleLowerCase("pt-BR");

      itens = itens.filter((item) => {
        const campos = [
          item.cliente?.nome,
          item.contrato.numero_apolice,
          item.produto_nome,
          item.seguradora_nome,
          item.corretor_nome,
        ];

        return campos.some((campo) =>
          String(campo ?? "")
            .toLocaleLowerCase("pt-BR")
            .includes(busca)
        );
      });
    }

    if (filtros.situacao_recebimento) {
      itens = itens.filter((item) => {
        const resumo =
          item.resumo_recebimentos;

        switch (
          filtros.situacao_recebimento
        ) {
          case "A_RECEBER":
            return resumo.valor_a_receber > 0;
          case "RECEBE_HOJE":
            return resumo.valor_recebe_hoje > 0;
          case "ATRASADA":
            return resumo.valor_atrasado > 0;
          case "RECEBIDA":
            return resumo.valor_recebido > 0;
          case "CANCELADA":
            return resumo.valor_cancelado > 0;
          default:
            return true;
        }
      });
    }

    if (filtros.situacao_pagamento) {
      itens = itens.filter((item) => {
        const resumo =
          item.resumo_pagamentos;

        switch (
          filtros.situacao_pagamento
        ) {
          case "A_PAGAR":
            return resumo.valor_a_pagar > 0;
          case "VENCE_HOJE":
            return resumo.valor_vence_hoje > 0;
          case "ATRASADA":
            return resumo.valor_atrasado > 0;
          case "PAGA":
            return resumo.valor_pago > 0;
          case "CANCELADA":
            return resumo.valor_cancelado > 0;
          default:
            return true;
        }
      });
    }


    const resumo =
      calcularResumoGeral(itens);

    const total =
      itens.length;

    const totalPaginas =
      total > 0
        ? Math.ceil(
            total / limite
          )
        : 0;

    const inicioPagina =
      (pagina - 1) * limite;

    const fimPagina =
      inicioPagina + limite;

    const itensPaginados =
      itens.slice(
        inicioPagina,
        fimPagina
      );

    return {
      itens: itensPaginados,
      resumo,
      total,
      pagina,
      limite,
      total_paginas:
        totalPaginas,
    };
  } catch (erro) {
    throw new Error(
      mensagemErro(
        erro,
        "Não foi possível carregar as comissões."
      )
    );
  }
}

export async function salvarComissaoContrato(
  payload: CriarComissaoPayload
): Promise<ResultadoCriarComissao> {
  try {
    if (!payload.contrato_id) throw new Error("Contrato não informado.");
    if (!payload.recebimentos?.length) {
      throw new Error("Informe ao menos um recebimento da seguradora.");
    }

    const { data, error } = await supabase.rpc("crm_salvar_comissao_contrato", {
      p_contrato_id: payload.contrato_id,
      p_tipo_calculo_comissao: payload.tipo_calculo_comissao,
      p_percentual_comissao: payload.percentual_comissao ?? null,
      p_valor_comissao_fixa: payload.valor_comissao_fixa ?? null,
      p_valor_base_original: payload.valor_base_original,
      p_recebimentos: payload.recebimentos ?? [],
      p_deducoes: payload.deducoes ?? [],
      p_splits: payload.splits ?? [],
      p_observacoes: payload.observacoes ?? null,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou os dados da comissão.");

    return data as ResultadoCriarComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível salvar a comissão do contrato.")
    );
  }
}

export async function receberComissao(
  payload: ReceberComissaoPayload
): Promise<ResultadoOperacaoComissao> {
  try {
    if (!payload.recebimento_id) throw new Error("Recebimento não informado.");

    const { data, error } = await supabase.rpc("crm_executar_acao_comissao", {
      p_acao: "RECEBER",
      p_recebimento_id: payload.recebimento_id,
      p_pagamento_id: null,
      p_data: payload.data_recebimento ?? null,
      p_valor: payload.valor_recebido ?? null,
      p_justificativa: null,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou o recebimento atualizado.");

    return data as ResultadoOperacaoComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível registrar o recebimento.")
    );
  }
}

export async function estornarRecebimentoComissao(
  payload: EstornarRecebimentoComissaoPayload
): Promise<ResultadoOperacaoComissao> {
  try {
    if (!payload.recebimento_id) throw new Error("Recebimento não informado.");
    if (!payload.justificativa?.trim()) throw new Error("Informe a justificativa do estorno.");

    const { data, error } = await supabase.rpc("crm_executar_acao_comissao", {
      p_acao: "ESTORNAR_RECEBIMENTO",
      p_recebimento_id: payload.recebimento_id,
      p_pagamento_id: null,
      p_data: null,
      p_valor: null,
      p_justificativa: payload.justificativa.trim(),
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou o recebimento atualizado.");

    return data as ResultadoOperacaoComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível estornar o recebimento.")
    );
  }
}

export async function pagarComissaoSplit(
  payload: PagarComissaoSplitPayload
): Promise<ResultadoOperacaoComissao> {
  try {
    if (!payload.pagamento_id) throw new Error("Pagamento não informado.");

    const { data, error } = await supabase.rpc("crm_executar_acao_comissao", {
      p_acao: "PAGAR_SPLIT",
      p_recebimento_id: null,
      p_pagamento_id: payload.pagamento_id,
      p_data: payload.data_pagamento ?? null,
      p_valor: payload.valor_pago ?? null,
      p_justificativa: null,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou o pagamento atualizado.");

    return data as ResultadoOperacaoComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível registrar o pagamento da comissão.")
    );
  }
}

export async function estornarPagamentoComissao(
  payload: EstornarPagamentoComissaoPayload
): Promise<ResultadoOperacaoComissao> {
  try {
    if (!payload.pagamento_id) throw new Error("Pagamento não informado.");
    if (!payload.justificativa?.trim()) throw new Error("Informe a justificativa do estorno.");

    const { data, error } = await supabase.rpc("crm_executar_acao_comissao", {
      p_acao: "ESTORNAR_PAGAMENTO",
      p_recebimento_id: null,
      p_pagamento_id: payload.pagamento_id,
      p_data: null,
      p_valor: null,
      p_justificativa: payload.justificativa.trim(),
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou o pagamento atualizado.");

    return data as ResultadoOperacaoComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível estornar o pagamento da comissão.")
    );
  }
}

export async function cancelarProvisaoComissao(
  payload: CancelarProvisaoComissaoPayload
): Promise<ResultadoOperacaoComissao> {
  try {
    const possuiRecebimento = Boolean(payload.recebimento_id);
    const possuiPagamento = Boolean(payload.pagamento_id);

    if (possuiRecebimento === possuiPagamento) {
      throw new Error("Informe exatamente uma provisão para cancelamento.");
    }

    if (!payload.justificativa?.trim()) {
      throw new Error("Informe a justificativa do cancelamento.");
    }

    const { data, error } = await supabase.rpc("crm_executar_acao_comissao", {
      p_acao: "CANCELAR_PROVISAO",
      p_recebimento_id: payload.recebimento_id ?? null,
      p_pagamento_id: payload.pagamento_id ?? null,
      p_data: null,
      p_valor: null,
      p_justificativa: payload.justificativa.trim(),
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou a provisão atualizada.");

    return data as ResultadoOperacaoComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível cancelar a provisão.")
    );
  }
}

export async function reverterCancelamentoProvisaoComissao(
  payload: ReverterCancelamentoProvisaoComissaoPayload
): Promise<ResultadoOperacaoComissao> {
  try {
    const possuiRecebimento = Boolean(payload.recebimento_id);
    const possuiPagamento = Boolean(payload.pagamento_id);

    if (possuiRecebimento === possuiPagamento) {
      throw new Error("Informe exatamente uma provisão para reversão.");
    }

    if (!payload.justificativa?.trim()) {
      throw new Error("Informe a justificativa da reversão.");
    }

    const { data, error } = await supabase.rpc("crm_executar_acao_comissao", {
      p_acao: "REVERSAO_CANCELAMENTO_PROVISAO",
      p_recebimento_id: payload.recebimento_id ?? null,
      p_pagamento_id: payload.pagamento_id ?? null,
      p_data: null,
      p_valor: null,
      p_justificativa: payload.justificativa.trim(),
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("A operação não retornou a provisão atualizada.");

    return data as ResultadoOperacaoComissao;
  } catch (erro) {
    throw new Error(
      mensagemErro(erro, "Não foi possível reverter o cancelamento da provisão.")
    );
  }
}
