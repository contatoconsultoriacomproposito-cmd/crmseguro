import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  AlertTriangle,
  ChevronDown,
  CircleDollarSign,
  Filter,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  WalletCards,
  FolderTree
} from 'lucide-react';

import {
  buscarContasReceber,
  buscarPlanoContasAtivo,
  buscarResumoContasReceber,
  type ContaReceberResumo,
  type FiltrosContasReceber,
  type OrigemContaReceber,
  type PlanoContaItem,
  type ResumoFinanceiroContasReceber,
  type SituacaoContaReceber,
  type TipoReceitaContaReceber,
} from '../services/contasReceberService';

import ModalNovoLancamento from '../components/ModalNovoLancamento';
import ModalPlanoContas from '../components/ModalPlanoContas';
import ModalDetalheContaReceber from '../components/ModalDetalheContaReceber';

type FiltroSituacao =
  | SituacaoContaReceber
  | 'TODAS';

interface FiltrosTela {
  tipoReceita: TipoReceitaContaReceber | '';
  origem: OrigemContaReceber | '';
  planoContaId: string;
  vencimentoInicial: string;
  vencimentoFinal: string;
  valorMinimo: string;
  valorMaximo: string;
}

const FILTROS_INICIAIS: FiltrosTela = {
  tipoReceita: '',
  origem: '',
  planoContaId: '',
  vencimentoInicial: '',
  vencimentoFinal: '',
  valorMinimo: '',
  valorMaximo: '',
};

const RESUMO_INICIAL: ResumoFinanceiroContasReceber = {
  totalPendente: 0,
  totalVencido: 0,
  venceEsteMes: 0,
  recebidoEsteMes: 0,

  quantidadePendente: 0,
  quantidadeVencida: 0,
  quantidadeVenceEsteMes: 0,
  quantidadeRecebidoEsteMes: 0,
};

export default function ContasReceber() {
  const [busca, setBusca] = useState('');

  const [situacao, setSituacao] =
    useState<FiltroSituacao>('TODAS');

  const [filtrosAbertos, setFiltrosAbertos] =
    useState(false);

  const [filtrosEdicao, setFiltrosEdicao] =
    useState<FiltrosTela>(FILTROS_INICIAIS);

  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosTela>(FILTROS_INICIAIS);

  const [lancamentos, setLancamentos] = useState<
    ContaReceberResumo[]
  >([]);

  const [planoContas, setPlanoContas] = useState<
    PlanoContaItem[]
  >([]);

  const [resumo, setResumo] =
    useState<ResumoFinanceiroContasReceber>(
      RESUMO_INICIAL
    );

  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] =
    useState(false);

  const [erro, setErro] = useState('');

  const [
    modalNovoLancamentoAberto,
    setModalNovoLancamentoAberto,
  ] = useState(false);

  const [
    modalPlanoContasAberto,
    setModalPlanoContasAberto,
  ] = useState(false);

  const [
    modalDetalheAberto,
    setModalDetalheAberto,
  ] = useState(false);

  const [
    lancamentoSelecionadoId,
    setLancamentoSelecionadoId,
  ] = useState<string | null>(null);

  const filtrosService = useMemo<FiltrosContasReceber>(
    () => ({
      busca,
      situacao,

      tipoReceita:
        filtrosAplicados.tipoReceita,

      origem:
        filtrosAplicados.origem,

      planoContaId:
        filtrosAplicados.planoContaId ||
        undefined,

      vencimentoInicial:
        filtrosAplicados.vencimentoInicial ||
        undefined,

      vencimentoFinal:
        filtrosAplicados.vencimentoFinal ||
        undefined,

      valorMinimo:
        converterValorFiltro(
          filtrosAplicados.valorMinimo
        ),

      valorMaximo:
        converterValorFiltro(
          filtrosAplicados.valorMaximo
        ),
    }),
    [
      busca,
      situacao,
      filtrosAplicados,
    ]
  );

  const carregarLancamentos = useCallback(
    async (
      mostrarLoadingPrincipal = false
    ) => {
      try {
        if (mostrarLoadingPrincipal) {
          setLoading(true);
        } else {
          setAtualizando(true);
        }

        setErro('');

        const dados =
          await buscarContasReceber(
            filtrosService
          );

        setLancamentos(dados);
      } catch (error) {
        console.error(
          '[ContasReceber] Erro ao carregar lançamentos:',
          error
        );

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os lançamentos.'
        );
      } finally {
        setLoading(false);
        setAtualizando(false);
      }
    },
    [filtrosService]
  );

  const carregarResumo = useCallback(
    async () => {
      try {
        const dados =
          await buscarResumoContasReceber();

        setResumo(dados);
      } catch (error) {
        console.error(
          '[ContasReceber] Erro ao carregar resumo:',
          error
        );
      }
    },
    []
  );

  const carregarPlanoContas = useCallback(
    async () => {
      try {
        const dados =
          await buscarPlanoContasAtivo();

        setPlanoContas(dados);
      } catch (error) {
        console.error(
          '[ContasReceber] Erro ao carregar plano de contas:',
          error
        );
      }
    },
    []
  );

  const carregarInicial = useCallback(
    async () => {
      setLoading(true);
      setErro('');

      try {
        const [
          dadosLancamentos,
          dadosResumo,
          dadosPlano,
        ] = await Promise.all([
          buscarContasReceber(
            filtrosService
          ),
          buscarResumoContasReceber(),
          buscarPlanoContasAtivo(),
        ]);

        setLancamentos(
          dadosLancamentos
        );

        setResumo(
          dadosResumo
        );

        setPlanoContas(
          dadosPlano
        );
      } catch (error) {
        console.error(
          '[ContasReceber] Erro na carga inicial:',
          error
        );

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o Contas a Receber.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void carregarInicial();
  }, [carregarInicial]);

  /*
   * Busca e situação são filtros rápidos.
   * Quando eles mudam, atualizamos a tabela.
   *
   * Os filtros avançados somente entram em ação
   * depois do botão "Aplicar filtros".
   */
  useEffect(() => {
    if (loading) {
      return;
    }

    void carregarLancamentos();
  }, [
    busca,
    situacao,
    filtrosAplicados,
  ]);

  const handleLancamentoCriado = async () => {
    setModalNovoLancamentoAberto(false);

    await Promise.all([
        carregarLancamentos(),
        carregarResumo(),
        carregarPlanoContas(),
    ]);
    };

  const handleAtualizar = async () => {
    try {
      setAtualizando(true);

      await Promise.all([
        carregarLancamentos(),
        carregarResumo(),
        carregarPlanoContas(),
      ]);
    } finally {
      setAtualizando(false);
    }
  };

  const handleAplicarFiltros = () => {
    setFiltrosAplicados({
      ...filtrosEdicao,
    });
  };

  const handleLimparFiltros = () => {
    setFiltrosEdicao(
      FILTROS_INICIAIS
    );

    setFiltrosAplicados(
      FILTROS_INICIAIS
    );
  };

  const handleAbrirLancamento = (
    id: string
    ) => {
    setLancamentoSelecionadoId(
        id
    );

    setModalDetalheAberto(
        true
    );
    };

  const possuiFiltrosAvancados =
    Boolean(
      filtrosAplicados.tipoReceita ||
        filtrosAplicados.origem ||
        filtrosAplicados.planoContaId ||
        filtrosAplicados.vencimentoInicial ||
        filtrosAplicados.vencimentoFinal ||
        filtrosAplicados.valorMinimo ||
        filtrosAplicados.valorMaximo
    );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-4 md:p-6">
        {/* CABEÇALHO */}
        <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <WalletCards size={16} />
              Financeiro
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Contas a Receber
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Controle receitas, vencimentos,
              recebimentos e provisionamentos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setModalPlanoContasAberto(true)
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FolderTree size={17} />
              Plano de Contas
            </button>

            <button
              type="button"
              onClick={() =>
                setModalNovoLancamentoAberto(true)
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Novo lançamento
            </button>
          </div>
        </section>

        {/* RESUMO */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Total pendente"
            valor={formatarMoeda(
              resumo.totalPendente
            )}
            detalhe={`${resumo.quantidadePendente} lançamento${
              resumo.quantidadePendente === 1
                ? ''
                : 's'
            } em aberto`}
            icon={
              <CircleDollarSign
                size={20}
              />
            }
          />

          <ResumoCard
            titulo="Vencido"
            valor={formatarMoeda(
              resumo.totalVencido
            )}
            detalhe={`${resumo.quantidadeVencida} lançamento${
              resumo.quantidadeVencida === 1
                ? ''
                : 's'
            } vencido${
              resumo.quantidadeVencida === 1
                ? ''
                : 's'
            }`}
            icon={
              <AlertTriangle
                size={20}
              />
            }
          />

          <ResumoCard
            titulo="Vence este mês"
            valor={formatarMoeda(
              resumo.venceEsteMes
            )}
            detalhe={`${resumo.quantidadeVenceEsteMes} compromisso${
              resumo.quantidadeVenceEsteMes ===
              1
                ? ''
                : 's'
            } no período`}
            icon={
              <TrendingUp
                size={20}
              />
            }
          />

          <ResumoCard
            titulo="Recebido este mês"
            valor={formatarMoeda(
              resumo.recebidoEsteMes
            )}
            detalhe={`${resumo.quantidadeRecebidoEsteMes} lançamento${
              resumo.quantidadeRecebidoEsteMes === 1
                ? ''
                : 's'
            } contabilizado${
              resumo.quantidadeRecebidoEsteMes === 1
                ? ''
                : 's'
            }`}
            icon={
              <ReceiptText
                size={20}
              />
            }
          />
        </section>

        {/* FILTROS */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            {/* BUSCA */}
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={busca}
                onChange={(e) =>
                  setBusca(
                    e.target.value
                  )
                }
                placeholder="Buscar por descrição, pagador ou documento..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* SITUAÇÃO */}
            <div className="relative min-w-[190px]">
              <select
                value={situacao}
                onChange={(e) =>
                  setSituacao(
                    e.target
                      .value as FiltroSituacao
                  )
                }
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="TODAS">
                  Todas as situações
                </option>

                <option value="PENDENTE">
                  Pendentes
                </option>

                <option value="VENCIDA">
                  Vencidas
                </option>

                <option value="RECEBIDA">
                  Recebidas
                </option>

                <option value="CANCELADA">
                  Canceladas
                </option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* MAIS FILTROS */}
            <button
              type="button"
              onClick={() =>
                setFiltrosAbertos(
                  (prev) => !prev
                )
              }
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
                possuiFiltrosAvancados
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal
                size={17}
              />

              Mais filtros

              {possuiFiltrosAvancados && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </button>

            {/* ATUALIZAR */}
            <button
              type="button"
              title="Atualizar"
              onClick={() =>
                void handleAtualizar()
              }
              disabled={atualizando}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={17}
                className={
                  atualizando
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>
          </div>

          {/* FILTROS AVANÇADOS */}
          {filtrosAbertos && (
            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <CampoFiltro label="Vencimento inicial">
                  <input
                    type="date"
                    value={
                      filtrosEdicao.vencimentoInicial
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          vencimentoInicial:
                            e.target
                              .value,
                        })
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </CampoFiltro>

                <CampoFiltro label="Vencimento final">
                  <input
                    type="date"
                    value={
                      filtrosEdicao.vencimentoFinal
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          vencimentoFinal:
                            e.target
                              .value,
                        })
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </CampoFiltro>

                <CampoFiltro label="Tipo de receita">
                  <select
                    value={
                      filtrosEdicao.tipoReceita
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          tipoReceita:
                            e.target
                              .value as
                              | TipoReceitaContaReceber
                              | '',
                        })
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">
                      Todas
                    </option>

                    <option value="FIXA">
                      Fixa
                    </option>

                    <option value="VARIAVEL">
                      Variável
                    </option>
                  </select>
                </CampoFiltro>

                <CampoFiltro label="Plano de contas">
                  <select
                    value={
                      filtrosEdicao.planoContaId
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          planoContaId:
                            e.target
                              .value,
                        })
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">
                      Todos
                    </option>

                    {planoContas.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.codigo
                            ? `${item.codigo} - `
                            : ''}
                          {item.nome}
                        </option>
                      )
                    )}
                  </select>
                </CampoFiltro>

                <CampoFiltro label="Valor mínimo">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      filtrosEdicao.valorMinimo
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          valorMinimo:
                            e.target
                              .value,
                        })
                      )
                    }
                    placeholder="0,00"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </CampoFiltro>

                <CampoFiltro label="Valor máximo">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      filtrosEdicao.valorMaximo
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          valorMaximo:
                            e.target
                              .value,
                        })
                      )
                    }
                    placeholder="0,00"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </CampoFiltro>

                <CampoFiltro label="Origem">
                  <select
                    value={
                      filtrosEdicao.origem
                    }
                    onChange={(e) =>
                      setFiltrosEdicao(
                        (prev) => ({
                          ...prev,
                          origem:
                            e.target
                              .value as
                              | OrigemContaReceber
                              | '',
                        })
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">
                      Todas
                    </option>

                    <option value="MANUAL">
                      Manual
                    </option>

                    <option value="PROVISIONAMENTO">
                      Provisionamento
                    </option>

                    <option value="COMISSAO">
                      Comissão
                    </option>
                  </select>
                </CampoFiltro>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={
                    handleLimparFiltros
                  }
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Limpar filtros
                </button>

                <button
                  type="button"
                  onClick={
                    handleAplicarFiltros
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Filter size={16} />
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ERRO */}
        {erro && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Não foi possível carregar o Contas a Receber
              </p>

              <p className="mt-0.5">
                {erro}
              </p>
            </div>
          </div>
        )}

        {/* TABELA */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                  <Th>
                    Vencimento
                  </Th>

                  <Th>
                    Descrição / Pagador
                  </Th>

                  <Th>
                    Cliente / Proposta / Contrato
                  </Th>

                  <Th>
                    Plano de contas
                  </Th>

                  <Th>
                    Tipo
                  </Th>

                  <Th>
                    Origem
                  </Th>

                  <Th align="right">
                    Previsto
                  </Th>

                  <Th align="right">
                    Recebido
                  </Th>

                  <Th align="right">
                    Saldo
                  </Th>

                  <Th>
                    Situação
                  </Th>

                  <Th align="center">
                    Ações
                  </Th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-16"
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        <RefreshCw
                          size={26}
                          className="mb-3 animate-spin text-blue-500"
                        />

                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          Carregando contas a receber...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : lancamentos.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={11}
                    >
                      <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                          <ReceiptText
                            size={26}
                          />
                        </div>

                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                          Nenhum lançamento encontrado
                        </h3>

                        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                          Não existem contas
                          correspondentes aos
                          filtros selecionados.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lancamentos.map(
                    (item) => (
                      <LinhaContaReceber
                        key={item.id}
                        item={item}
                        onAbrir={
                            handleAbrirLancamento
                        }
                        />
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {lancamentos.length}{' '}
                lançamento
                {lancamentos.length === 1
                  ? ''
                  : 's'}{' '}
                encontrado
                {lancamentos.length === 1
                  ? ''
                  : 's'}
              </span>

              {lancamentos.length >
                0 && (
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Saldo exibido:{' '}
                  {formatarMoeda(
                    lancamentos.reduce(
                      (
                        total,
                        item
                      ) =>
                        total +
                        item.saldo,
                      0
                    )
                  )}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <ModalNovoLancamento
        aberto={modalNovoLancamentoAberto}
        planoContas={planoContas}
        onClose={() =>
          setModalNovoLancamentoAberto(false)
        }
        onCriado={() =>
          void handleLancamentoCriado()
        }
      />

      <ModalPlanoContas
        aberto={modalPlanoContasAberto}
        onClose={() =>
          setModalPlanoContasAberto(false)
        }
        onAlterado={async () => {
          await Promise.all([
            carregarPlanoContas(),
            carregarLancamentos(),
          ]);
        }}
      />

      <ModalDetalheContaReceber
        aberto={modalDetalheAberto}
        lancamentoId={lancamentoSelecionadoId}
        onClose={() => {
          setModalDetalheAberto(false);
          setLancamentoSelecionadoId(null);
        }}
        onAlterado={async () => {
          await Promise.all([
            carregarLancamentos(),
            carregarResumo(),
          ]);
        }}
      />

    </div>
  );
}

/* ============================================================
 * LINHA DA TABELA
 * ============================================================
 */

function LinhaContaReceber({
  item,
  onAbrir,
}: {
  item: ContaReceberResumo;
  onAbrir: (
    id: string
  ) => void;
}) {
  return (
    <tr className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
      {/* VENCIMENTO */}
      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {formatarData(
            item.data_vencimento
          )}
        </div>

        {item.data_competencia && (
          <div className="mt-0.5 text-xs text-slate-400">
            Comp.{' '}
            {formatarCompetencia(
              item.data_competencia
            )}
          </div>
        )}
      </td>

      {/* DESCRIÇÃO */}
      <td className="px-4 py-3.5 align-middle">
        <div className="max-w-[320px]">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {item.descricao}
          </p>

          {item.pagador && (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {item.pagador}
            </p>
          )}

          {item.numero_documento && (
            <p className="mt-0.5 text-xs text-slate-400">
              Doc.:{' '}
              {item.numero_documento}
            </p>
          )}
        </div>
      </td>

      {/* VÍNCULO COMERCIAL */}
      <td className="px-4 py-3.5 align-middle">
        <div className="max-w-[300px]">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {item.cliente_nome || '—'}
          </p>

          {item.proposta_numero && (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              Proposta: {item.proposta_numero}
            </p>
          )}

          {(item.contrato_numero || item.numero_cotacao) && (
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {item.contrato_numero
                ? `Contrato: ${item.contrato_numero}`
                : `Cotação: ${item.numero_cotacao}`}
            </p>
          )}
        </div>
      </td>

      {/* PLANO DE CONTAS */}
      <td className="px-4 py-3.5 align-middle">
        <div className="max-w-[280px]">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {item.plano_conta_caminho ||
              item.plano_conta_nome ||
              '—'}
          </p>

          {item.plano_conta_codigo && (
            <p className="mt-0.5 text-xs text-slate-400">
              {
                item.plano_conta_codigo
              }
            </p>
          )}
        </div>
      </td>

      {/* TIPO */}
      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
        <BadgeTipo
          tipo={
            item.tipo_receita
          }
        />
      </td>

      {/* ORIGEM */}
      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
        <BadgeOrigem
          origem={
            item.origem
          }
        />
      </td>

      {/* PREVISTO */}
      <td className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {formatarMoeda(
            item.valor_previsto
          )}
        </span>
      </td>

      {/* PAGO */}
      <td className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {formatarMoeda(
            item.total_baixado
          )}
        </div>

        {item.parcialmente_recebida && (
          <div className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Parcial
          </div>
        )}
      </td>

      {/* SALDO */}
      <td className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
        <span
          className={`text-sm font-semibold ${
            item.saldo > 0
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400'
          }`}
        >
          {formatarMoeda(
            item.saldo
          )}
        </span>
      </td>

      {/* SITUAÇÃO */}
      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
        <BadgeSituacao
          situacao={
            item.situacao
          }
          parcial={
            item.parcialmente_recebida
          }
        />
      </td>

      {/* AÇÕES */}
      <td className="whitespace-nowrap px-4 py-3.5 text-center align-middle">
        <button
            type="button"
            title="Abrir lançamento"
            onClick={() =>
                onAbrir(
                item.id
                )
            }
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            >
            Abrir
        </button>
      </td>
    </tr>
  );
}

/* ============================================================
 * BADGES
 * ============================================================
 */

function BadgeSituacao({
  situacao,
  parcial,
}: {
  situacao: SituacaoContaReceber;
  parcial: boolean;
}) {
  if (
    parcial &&
    situacao !== 'RECEBIDA' &&
    situacao !== 'CANCELADA'
  ) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        Parcial
      </span>
    );
  }

  const configuracao: Record<
    SituacaoContaReceber,
    {
      texto: string;
      classe: string;
    }
  > = {
    PENDENTE: {
      texto: 'Pendente',
      classe:
        'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    },

    VENCIDA: {
      texto: 'Vencida',
      classe:
        'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    },

    RECEBIDA: {
      texto: 'Recebida',
      classe:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    },

    CANCELADA: {
      texto: 'Cancelada',
      classe:
        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    },
  };

  const config =
    configuracao[situacao];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.classe}`}
    >
      {config.texto}
    </span>
  );
}

function BadgeTipo({
  tipo,
}: {
  tipo: TipoReceitaContaReceber;
}) {
  if (tipo === 'FIXA') {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Fixa
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
      Variável
    </span>
  );
}

function BadgeOrigem({
  origem,
}: {
  origem: OrigemContaReceber;
}) {
  const configuracao: Record<
    OrigemContaReceber,
    {
      texto: string;
      classe: string;
    }
  > = {
    MANUAL: {
      texto: 'Manual',
      classe:
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },

    PROVISIONAMENTO: {
      texto: 'Provisionamento',
      classe:
        'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    },

    COMISSAO: {
      texto: 'Comissão',
      classe:
        'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    },
  };

  const config =
    configuracao[origem];

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${config.classe}`}
    >
      {config.texto}
    </span>
  );
}

/* ============================================================
 * COMPONENTES VISUAIS
 * ============================================================
 */

function ResumoCard({
  titulo,
  valor,
  detalhe,
  icon,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {titulo}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {valor}
          </p>

          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {detalhe}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function CampoFiltro({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}) {
  const alinhamento =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${alinhamento}`}
    >
      {children}
    </th>
  );
}

/* ============================================================
 * FORMATADORES
 * ============================================================
 */

function formatarMoeda(
  valor: number
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(valor || 0);
}

function formatarData(
  data: string | null
): string {
  if (!data) {
    return '—';
  }

  const [ano, mes, dia] =
    data.split('-');

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarCompetencia(
  data: string
): string {
  const [ano, mes] =
    data.split('-');

  if (!ano || !mes) {
    return data;
  }

  return `${mes}/${ano}`;
}

function converterValorFiltro(
  valor: string
): number | null {
  const texto =
    valor.trim();

  if (!texto) {
    return null;
  }

  const numero =
    Number(texto);

  return Number.isFinite(numero)
    ? numero
    : null;
}
