import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  HandCoins,
  FileText,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";

import { useComissoes } from "../hooks/useComissoes";
import { ComissoesResumoCards } from "../components/ComissoesResumoCards";
import { ComissoesFiltros } from "../components/ComissoesFiltros";
import { TabelaComissoes } from "../components/TabelaComissoes";
import ModalRelatorioComissoes from "../components/ModalRelatorioComissoes";

import { formatarMoedaComissao } from "../services/comissoesCalculos";
import {
  buscarParticipantesFiltroComissao,
  type OpcaoParticipanteComissao,
} from "../services/comissoesService";

import type {
  ItemComissaoGeral,
  ItemMinhaComissaoCorretor,
  SituacaoPagamentoComissao,
} from "../types/comissoes";

interface OpcaoFiltro {
  value: string;
  label: string;
}

function criarOpcoesUnicas(
  itens: Array<{
    value: string | null | undefined;
    label: string | null | undefined;
  }>
): OpcaoFiltro[] {
  const mapa = new Map<string, string>();

  for (const item of itens) {
    const value = item.value?.trim();
    const label = item.label?.trim();

    if (!value || !label) continue;

    mapa.set(value, label);
  }

  return Array.from(mapa.entries())
    .map(([value, label]) => ({
      value,
      label,
    }))
    .sort((a, b) =>
      a.label.localeCompare(
        b.label,
        "pt-BR"
      )
    );
}

function obterSituacaoMinhaComissao(
  item: ItemMinhaComissaoCorretor
): {
  label: string;
  className: string;
} {
  const situacoes =
    item.pagamentos.map(
      (pagamento) =>
        pagamento.situacao
    );

  if (
    situacoes.includes(
      "ATRASADA"
    )
  ) {
    return {
      label: "Atrasada",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    };
  }

  if (
    situacoes.includes(
      "VENCE_HOJE"
    )
  ) {
    return {
      label: "Vence hoje",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
    };
  }

  if (
    situacoes.length > 0 &&
    situacoes.every(
      (situacao) =>
        situacao === "PAGA"
    )
  ) {
    return {
      label: "Paga",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }

  if (
    situacoes.some(
      (situacao) =>
        situacao === "PAGA"
    ) &&
    situacoes.some(
      (situacao) =>
        situacao === "A_PAGAR"
    )
  ) {
    return {
      label: "Parcial",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
    };
  }

  if (
    situacoes.includes(
      "A_PAGAR"
    )
  ) {
    return {
      label: "A receber",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    };
  }

  if (
    situacoes.length > 0 &&
    situacoes.every(
      (situacao) =>
        situacao === "CANCELADA"
    )
  ) {
    return {
      label: "Cancelada",
      className:
        "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
    };
  }

  return {
    label: "Sem provisão",
    className:
      "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  };
}

function CardMinhaComissao({
  titulo,
  valor,
  descricao,
  icone: Icone,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icone: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {titulo}
          </p>

          <p
            className="mt-2 whitespace-nowrap text-xl font-semibold text-slate-900 dark:text-slate-100"
            title={valor}
          >
            {valor}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {descricao}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Icone size={18} />
        </div>
      </div>
    </div>
  );
}

export default function Comissoes() {
  const navigate = useNavigate();

  const {
    visao,

    filtros,

    itens,
    resumo,

    itensCorretor,
    resumoCorretor,

    total,
    pagina,
    totalPaginas,

    loading,
    erro,
    vazio,
    temFiltrosAtivos,

    atualizarFiltro,
    limparFiltros,
    irParaPagina,
    paginaAnterior,
    proximaPagina,
    recarregar,
  } = useComissoes();

  const isCorretor =
    visao === "CORRETOR";

  const [
    modalRelatorioAberto,
    setModalRelatorioAberto,
  ] = useState(false);

  const [
    participantesDisponiveis,
    setParticipantesDisponiveis,
  ] = useState<OpcaoParticipanteComissao[]>([]);

  const [
    loadingParticipantes,
    setLoadingParticipantes,
  ] = useState(false);

  const [buscaDigitada, setBuscaDigitada] =
  useState(filtros.busca ?? "");

const [dataInicioDigitada, setDataInicioDigitada] =
  useState(filtros.data_inicio ?? "");

const [dataFimDigitada, setDataFimDigitada] =
  useState(filtros.data_fim ?? "");

useEffect(() => {
  setDataInicioDigitada(
    filtros.data_inicio ?? ""
  );
}, [filtros.data_inicio]);

useEffect(() => {
  setDataFimDigitada(
    filtros.data_fim ?? ""
  );
}, [filtros.data_fim]);

const periodoCorretorAlterado =
  dataInicioDigitada !==
    (filtros.data_inicio ?? "") ||
  dataFimDigitada !==
    (filtros.data_fim ?? "");

const periodoCorretorInvalido =
  Boolean(
    dataInicioDigitada &&
      dataFimDigitada &&
      dataFimDigitada < dataInicioDigitada
  );

function aplicarPeriodoCorretor() {
  if (periodoCorretorInvalido) return;

  atualizarFiltro(
    "data_inicio",
    dataInicioDigitada
  );

  atualizarFiltro(
    "data_fim",
    dataFimDigitada
  );
}

useEffect(() => {
  const busca =
    buscaDigitada.trim();

  if (!busca) {
    if (filtros.busca) {
      atualizarFiltro("busca", "");
    }

    return;
  }

  if (busca.length < 3) {
    return;
  }

  if (busca === filtros.busca) {
    return;
  }

  const timeout =
    window.setTimeout(() => {
      atualizarFiltro(
        "busca",
        busca
      );
    }, 500);

  return () => {
    window.clearTimeout(timeout);
  };
}, [
  buscaDigitada,
  filtros.busca,
  atualizarFiltro,
]);

function atualizarFiltroInteligente(
  campo: string,
  valor: any
) {
  if (campo === "busca") {
    setBuscaDigitada(
      String(valor ?? "")
    );

    return;
  }

  atualizarFiltro(
    campo as any,
    valor
  );
}

  useEffect(() => {
    if (isCorretor) {
      setParticipantesDisponiveis([]);
      return;
    }

    let ativo = true;

    async function carregarParticipantes() {
      try {
        setLoadingParticipantes(true);
        const opcoes = await buscarParticipantesFiltroComissao();
        if (ativo) setParticipantesDisponiveis(opcoes);
      } catch (error) {
        console.error(
          "Erro ao carregar participantes da comissão:",
          error
        );
        if (ativo) setParticipantesDisponiveis([]);
      } finally {
        if (ativo) setLoadingParticipantes(false);
      }
    }

    void carregarParticipantes();

    return () => {
      ativo = false;
    };
  }, [isCorretor]);

  const participantesFiltrados = useMemo(
    () =>
      participantesDisponiveis.filter(
        (opcao) =>
          !filtros.tipo_participante ||
          opcao.tipo === filtros.tipo_participante
      ),
    [
      participantesDisponiveis,
      filtros.tipo_participante,
    ]
  );

  const participanteSelecionado = useMemo(
    () =>
      participantesDisponiveis.find(
        (opcao) =>
          opcao.value === filtros.participante_id
      ) ?? null,
    [
      participantesDisponiveis,
      filtros.participante_id,
    ]
  );

  const temFiltrosAtivosTela =
    temFiltrosAtivos ||
    Boolean(filtros.participante_id);

  /*
   * ============================================================
   * OPÇÕES DA VISÃO CORRETORA
   * ============================================================
   */

  const corretores = useMemo(
    () =>
      criarOpcoesUnicas(
        itens.map((item) => ({
          value:
            item.contrato
              .corretor_id,
          label:
            item.corretor_nome,
        }))
      ),
    [itens]
  );

  const seguradorasCorretora =
    useMemo(
      () =>
        criarOpcoesUnicas(
          itens.map((item) => ({
            value:
              item.contrato
                .seguradora_id,
            label:
              item.seguradora_nome,
          }))
        ),
      [itens]
    );

  const produtosCorretora =
    useMemo(
      () =>
        criarOpcoesUnicas(
          itens.map((item) => ({
            value:
              item.contrato
                .produto_id,
            label:
              item.produto_nome,
          }))
        ),
      [itens]
    );

  /*
   * ============================================================
   * OPÇÕES DA VISÃO CORRETOR
   * ============================================================
   */

  const seguradorasCorretor =
    useMemo(
      () =>
        criarOpcoesUnicas(
          itensCorretor.map(
            (item) => ({
              value:
                item.contrato
                  .seguradora_id,
              label:
                item.seguradora_nome,
            })
          )
        ),
      [itensCorretor]
    );

  const produtosCorretor =
    useMemo(
      () =>
        criarOpcoesUnicas(
          itensCorretor.map(
            (item) => ({
              value:
                item.contrato
                  .produto_id,
              label:
                item.produto_nome,
            })
          )
        ),
      [itensCorretor]
    );

  const filtrosRelatorio = useMemo(
    () => ({
      ...filtros,
    }),
    [
      filtros.busca,
      filtros.data_inicio,
      filtros.data_fim,
      filtros.corretor_id,
      filtros.seguradora_id,
      filtros.produto_id,
      filtros.situacao_recebimento,
      filtros.situacao_pagamento,
      filtros.tipo_participante,
      filtros.participante_id,
      filtros.contrato_id,
      filtros.cliente_id,
    ]
  );

  const filtrosDescricaoRelatorio =
    useMemo(() => {
      const descricoes: string[] = [];

      const buscarLabel = (
        opcoes: OpcaoFiltro[],
        value?: string
      ) =>
        opcoes.find(
          (opcao) =>
            opcao.value === value
        )?.label ?? value;

      if (filtros.busca?.trim()) {
        descricoes.push(
          `Busca: ${filtros.busca.trim()}`
        );
      }

      if (filtros.corretor_id) {
        descricoes.push(
          `Corretor responsável: ${
            buscarLabel(
              corretores,
              filtros.corretor_id
            ) ??
            filtros.corretor_id
          }`
        );
      }

      if (filtros.seguradora_id) {
        descricoes.push(
          `Seguradora: ${
            buscarLabel(
              seguradorasCorretora,
              filtros.seguradora_id
            ) ??
            filtros.seguradora_id
          }`
        );
      }

      if (filtros.produto_id) {
        descricoes.push(
          `Produto: ${
            buscarLabel(
              produtosCorretora,
              filtros.produto_id
            ) ??
            filtros.produto_id
          }`
        );
      }

      if (
        filtros.situacao_recebimento
      ) {
        const labels: Record<
          string,
          string
        > = {
          A_RECEBER: "A receber",
          RECEBE_HOJE: "Recebe hoje",
          ATRASADA: "Atrasada",
          RECEBIDA: "Recebida",
          CANCELADA: "Cancelada",
        };

        descricoes.push(
          `Situação do recebimento: ${
            labels[
              filtros
                .situacao_recebimento
            ] ??
            filtros
              .situacao_recebimento
          }`
        );
      }

      if (
        filtros.situacao_pagamento
      ) {
        const labels: Record<
          string,
          string
        > = {
          A_PAGAR: "A pagar",
          VENCE_HOJE: "Vence hoje",
          ATRASADA: "Atrasada",
          PAGA: "Paga",
          CANCELADA: "Cancelada",
        };

        descricoes.push(
          `Situação do pagamento: ${
            labels[
              filtros
                .situacao_pagamento
            ] ??
            filtros
              .situacao_pagamento
          }`
        );
      }

      if (
        filtros.tipo_participante
      ) {
        const labels: Record<
          string,
          string
        > = {
          CORRETOR: "Corretor",
          SUPERVISOR: "Supervisor",
          PARCEIRO: "Parceiro",
          INDICADOR: "Indicador",
          OUTRO: "Outro",
          CORRETORA: "Corretora",
        };

        descricoes.push(
          `Tipo de participante: ${
            labels[
              filtros
                .tipo_participante
            ] ??
            filtros
              .tipo_participante
          }`
        );
      }


      if (filtros.participante_id) {
        descricoes.push(
          `Participante específico: ${
            participanteSelecionado?.label ??
            filtros.participante_id
          }`
        );
      }
      return descricoes;
    }, [
      filtros.busca,
      filtros.corretor_id,
      filtros.seguradora_id,
      filtros.produto_id,
      filtros.situacao_recebimento,
      filtros.situacao_pagamento,
      filtros.tipo_participante,
      corretores,
      seguradorasCorretora,
      produtosCorretora,
      filtros.participante_id,
      participanteSelecionado,
    ]);

  function handleAbrirComissao(
    item: ItemComissaoGeral
  ) {
    navigate(
      `/whatsapp/comissoes/contratos/${item.contrato.id}`
    );
  }

  /*
   * O detalhe econômico completo continua restrito à corretora.
   * Por isso a tabela pessoal não navega para ComissaoContrato.
   */

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-4 md:p-6">
        {/* =====================================================
            CABEÇALHO
        ====================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <ReceiptText
                size={21}
              />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl">
                {isCorretor
                  ? "Minhas Comissões"
                  : "Comissões"}
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                {isCorretor
                  ? "Acompanhe suas comissões, deduções e pagamentos vinculados aos seus contratos."
                  : "Controle de recebimentos das seguradoras, distribuição entre participantes e pagamentos de comissão."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {!isCorretor && (
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  setModalRelatorioAberto(
                    true
                  )
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                <FileText size={16} />

                Gerar relatório
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                void recarregar();
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Atualizar
            </button>
          </div>
        </div>

        {/* =====================================================
            VISÃO CORRETORA
        ====================================================== */}

        {!isCorretor && (
          <>
            <ComissoesResumoCards
              resumo={resumo}
              loading={loading}
              participanteNome={
                participanteSelecionado?.label ?? null
              }
            />

            <ComissoesFiltros
              filtros={{
                ...filtros,
                busca: buscaDigitada,
              }}
              loading={loading}
              temFiltrosAtivos={
                temFiltrosAtivosTela
              }
              corretores={
                corretores
              }
              seguradoras={
                seguradorasCorretora
              }
              produtos={
                produtosCorretora
              }
              participantes={
                loadingParticipantes
                  ? []
                  : participantesFiltrados
              }
              onFiltroChange={
                atualizarFiltroInteligente
              }
              onLimpar={() => {
                setBuscaDigitada("");
                atualizarFiltro(
                  "participante_id",
                  ""
                );
                limparFiltros();
              }}
            />

            {erro && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Não foi possível
                    carregar as
                    comissões
                  </p>

                  <p className="mt-1 break-words text-xs opacity-90">
                    {erro}
                  </p>
                </div>
              </div>
            )}

            <TabelaComissoes
              itens={itens}
              loading={loading}
              pagina={pagina}
              totalPaginas={
                totalPaginas
              }
              total={total}
              onAbrirComissao={
                handleAbrirComissao
              }
              onPaginaAnterior={
                paginaAnterior
              }
              onProximaPagina={
                proximaPagina
              }
              onIrParaPagina={
                irParaPagina
              }
            />

            {vazio &&
              !temFiltrosAtivosTela && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-950">
                  <ReceiptText
                    size={28}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Ainda não existem
                    comissões
                    cadastradas.
                  </p>

                  <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-400">
                    As comissões serão
                    criadas a partir dos
                    contratos ativos.
                  </p>
                </div>
              )}
          </>
        )}

        {/* =====================================================
            VISÃO CORRETOR
        ====================================================== */}

        {isCorretor && (
          <>
            {/* RESUMO PESSOAL */}

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CardMinhaComissao
                  titulo="Minha comissão"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_liquido
                  )}
                  descricao="Valor líquido total"
                  icone={HandCoins}
                />

                <CardMinhaComissao
                  titulo="Bruto"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_bruto
                  )}
                  descricao="Antes das deduções"
                  icone={ReceiptText}
                />

                <CardMinhaComissao
                  titulo="Deduções"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_deducoes
                  )}
                  descricao="Descontos aplicados"
                  icone={CircleDollarSign}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CardMinhaComissao
                  titulo="A receber"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_a_receber
                  )}
                  descricao="Pagamentos pendentes"
                  icone={WalletCards}
                />

                <CardMinhaComissao
                  titulo="Vence hoje"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_vence_hoje
                  )}
                  descricao="Previsto para hoje"
                  icone={CalendarDays}
                />

                <CardMinhaComissao
                  titulo="Atrasado"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_atrasado
                  )}
                  descricao="Pagamento vencido"
                  icone={Clock3}
                />

                <CardMinhaComissao
                  titulo="Recebido"
                  valor={formatarMoedaComissao(
                    resumoCorretor.valor_pago
                  )}
                  descricao="Já pago pela corretora"
                  icone={HandCoins}
                />
              </div>
            </div>

            {/* FILTROS PESSOAIS */}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Buscar
                  </label>

                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                     value={
                        buscaDigitada
                      }
                      disabled={
                        loading
                      }
                      onChange={(
                        event
                      ) =>
                        setBuscaDigitada(
                          event.target.value
                        )
                      }
                      placeholder="Cliente, apólice, produto ou seguradora..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Data da venda - inicial
                  </label>

                  <input
                    type="date"
                    value={dataInicioDigitada}
                    disabled={loading}
                    onChange={(event) =>
                      setDataInicioDigitada(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Data da venda - final
                  </label>

                  <input
                    type="date"
                    value={dataFimDigitada}
                    disabled={loading}
                    onChange={(event) =>
                      setDataFimDigitada(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Seguradora
                  </label>

                  <select
                    value={
                      filtros.seguradora_id ??
                      ""
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      atualizarFiltro(
                        "seguradora_id",
                        event.target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                  >
                    <option value="">
                      Todas
                    </option>

                    {seguradorasCorretor.map(
                      (opcao) => (
                        <option
                          key={
                            opcao.value
                          }
                          value={
                            opcao.value
                          }
                        >
                          {
                            opcao.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Produto
                  </label>

                  <select
                    value={
                      filtros.produto_id ??
                      ""
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      atualizarFiltro(
                        "produto_id",
                        event.target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                  >
                    <option value="">
                      Todos
                    </option>

                    {produtosCorretor.map(
                      (opcao) => (
                        <option
                          key={
                            opcao.value
                          }
                          value={
                            opcao.value
                          }
                        >
                          {
                            opcao.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Situação
                  </label>

                  <select
                    value={
                      filtros.situacao_pagamento ??
                      ""
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      atualizarFiltro(
                        "situacao_pagamento",
                        event.target
                          .value as
                          | SituacaoPagamentoComissao
                          | ""
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                  >
                    <option value="">
                      Todas
                    </option>

                    <option value="A_PAGAR">
                      A receber
                    </option>

                    <option value="VENCE_HOJE">
                      Vence hoje
                    </option>

                    <option value="ATRASADA">
                      Atrasada
                    </option>

                    <option value="PAGA">
                      Paga
                    </option>

                    <option value="CANCELADA">
                      Cancelada
                    </option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={
                      loading ||
                      !periodoCorretorAlterado ||
                      periodoCorretorInvalido
                    }
                    onClick={aplicarPeriodoCorretor}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    Aplicar período
                  </button>
                </div>

                {periodoCorretorInvalido && (
                  <div className="flex items-end xl:col-span-2">
                    <span className="pb-2 text-xs font-medium text-red-600 dark:text-red-400">
                      A data final não pode ser anterior à data inicial.
                    </span>
                  </div>
                )}

                {temFiltrosAtivos && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={() => {
                        setBuscaDigitada("");
                        setDataInicioDigitada("");
                        setDataFimDigitada("");
                        limparFiltros();
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      <RotateCcw
                        size={15}
                      />
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ERRO */}

            {erro && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Não foi possível
                    carregar suas
                    comissões
                  </p>

                  <p className="mt-1 break-words text-xs opacity-90">
                    {erro}
                  </p>
                </div>
              </div>
            )}

            {/* TABELA PESSOAL */}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Minhas comissões
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {total}{" "}
                    {total === 1
                      ? "comissão encontrada"
                      : "comissões encontradas"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cliente
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Apólice
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Produto
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Seguradora
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Bruto
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Deduções
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Líquido
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        A receber
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pago
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Situação
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={
                            10
                          }
                          className="px-4 py-12 text-center text-sm text-slate-500"
                        >
                          Carregando suas
                          comissões...
                        </td>
                      </tr>
                    ) : itensCorretor.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={
                            10
                          }
                          className="px-4 py-12 text-center"
                        >
                          <ReceiptText
                            size={
                              28
                            }
                            className="mx-auto text-slate-400"
                          />

                          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                            Nenhuma
                            comissão
                            encontrada.
                          </p>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            As
                            comissões
                            atribuídas a
                            você
                            aparecerão
                            aqui.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      itensCorretor.map(
                        (item) => {
                          const situacao =
                            obterSituacaoMinhaComissao(
                              item
                            );

                          return (
                            <tr
                              key={
                                item
                                  .split
                                  .id
                              }
                              className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="max-w-[240px] truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {item
                                      .cliente
                                      ?.nome ??
                                      "Cliente não identificado"}
                                  </p>

                                  {item
                                    .cliente && (
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                      {
                                        item
                                          .cliente
                                          .tipo
                                      }
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                {item
                                  .contrato
                                  .numero_apolice ??
                                  "—"}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                {item
                                  .produto_nome ??
                                  "—"}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                {item
                                  .seguradora_nome ??
                                  "—"}
                              </td>

                              <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                                {formatarMoedaComissao(
                                  item
                                    .split
                                    .valor_bruto_split
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm text-red-600 dark:text-red-400">
                                {formatarMoedaComissao(
                                  item
                                    .split
                                    .valor_deducoes
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {formatarMoedaComissao(
                                  item
                                    .split
                                    .valor_liquido_split
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                                {formatarMoedaComissao(
                                  item
                                    .resumo_pagamentos
                                    .valor_a_pagar
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                {formatarMoedaComissao(
                                  item
                                    .resumo_pagamentos
                                    .valor_pago
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${situacao.className}`}
                                >
                                  {
                                    situacao.label
                                  }
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO */}

              {!loading &&
                totalPaginas >
                  0 && (
                  <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Página{" "}
                      <strong>
                        {pagina}
                      </strong>{" "}
                      de{" "}
                      <strong>
                        {
                          totalPaginas
                        }
                      </strong>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={
                          pagina <=
                          1
                        }
                        onClick={
                          paginaAnterior
                        }
                        className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                      >
                        Anterior
                      </button>

                      <select
                        value={
                          pagina
                        }
                        onChange={(
                          event
                        ) =>
                          irParaPagina(
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        }
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        {Array.from(
                          {
                            length:
                              totalPaginas,
                          },
                          (
                            _,
                            index
                          ) =>
                            index +
                            1
                        ).map(
                          (
                            numero
                          ) => (
                            <option
                              key={
                                numero
                              }
                              value={
                                numero
                              }
                            >
                              {
                                numero
                              }
                            </option>
                          )
                        )}
                      </select>

                      <button
                        type="button"
                        disabled={
                          pagina >=
                          totalPaginas
                        }
                        onClick={
                          proximaPagina
                        }
                        className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
            </section>
          </>
        )}

        {!isCorretor && (
          <ModalRelatorioComissoes
            isOpen={
              modalRelatorioAberto
            }
            onClose={() =>
              setModalRelatorioAberto(
                false
              )
            }
            filtros={
              filtrosRelatorio
            }
            filtrosDescricao={
              filtrosDescricaoRelatorio
            }
            participanteNome={
              participanteSelecionado?.label ?? null
            }
          />
        )}
      </div>
    </div>
  );
}