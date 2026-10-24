import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Loader2,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
  Plus,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useComissaoContrato } from "../hooks/useComissaoContrato";
import {
  formatarMoedaComissao,
  formatarPercentualComissao,
} from "../services/comissoesCalculos";

import {
  buscarContextoContratoComissao,
  buscarCorretoresComissao,
  buscarSupervisoresComissao,
} from "../services/comissoesService";
import type {
  OpcaoParticipanteComissao,
} from "../services/comissoesService";

import { ModalLancamentoComissao } from "../components/ModalLancamentoComissao";
import type {
  CancelarProvisaoComissaoPayload,
  ComissaoPagamentoComSituacao,
  ComissaoRecebimentoComSituacao,
  ComissaoSplit,
  CriarComissaoPayload,
  ContextoContratoComissao,
  EstornarPagamentoComissaoPayload,
  EstornarRecebimentoComissaoPayload,
  PagarComissaoSplitPayload,
  ReceberComissaoPayload,
  ReverterCancelamentoProvisaoComissaoPayload,
  ContextoPermissaoComissao,
} from "../types/comissoes";
import { ModalReceberComissao } from "../components/ModalReceberComissao";
import { ModalEstornarRecebimento } from "../components/ModalEstornarRecebimento";
import { ModalPagarComissaoSplit } from "../components/ModalPagarComissaoSplit";
import { ModalEstornarPagamento } from "../components/ModalEstornarPagamento";
import { ModalCancelarProvisao } from "../components/ModalCancelarProvisao";
import { ModalReverterCancelamento } from "../components/ModalReverterCancelamento";
import { useAuth } from "../../../../../auth/AuthContext";

import {
  podeCancelarProvisaoComissao,
  podeCriarComissao,
  podeEditarComissao,
  podeEstornarPagamentoComissao,
  podeEstornarRecebimentoComissao,
  podePagarSplitComissao,
  podeReceberComissao,
  podeReverterCancelamentoProvisaoComissao,
} from "../services/comissoesPermissoes";

function CardIndicador({
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

          <p className="mt-2 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
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



export default function ComissaoContrato() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const { contratoId } = useParams<{
    contratoId: string;
  }>();

  const contextoPermissao =
    useMemo<ContextoPermissaoComissao | null>(
      () => {
        if (!userProfile) {
          return null;
        }

        if (
          userProfile.tipo_usuario !== "CORRETORA" &&
          userProfile.tipo_usuario !== "CORRETOR" &&
          userProfile.tipo_usuario !== "ADMIN"
        ) {
          return null;
        }

        return {
          tipoUsuario:
            userProfile.tipo_usuario,
          usuarioId:
            userProfile.id,
          corretoraId:
            userProfile.tipo_usuario === "CORRETORA"
              ? userProfile.id
              : userProfile.corretora_id ?? null,
        };
      },
      [userProfile]
    );

  const acessoEconomicoCompleto =
    contextoPermissao?.tipoUsuario ===
    "CORRETORA";

  const {
    dados,
    comissao,
    deducoes,
    recebimentos,
    splits,
    splitDeducoes,
    pagamentos,
    movimentacoes,
    resumoRecebimentos,
    resumoPagamentos,
    resumoSplits,
    loading,
    erro,
    operando,
    operacoes,
    possuiComissao,
    recarregar,
    salvar,
    receber,
    estornarRecebimento,
    pagar,
    estornarPagamento,
    cancelarProvisao,
    reverterCancelamento,
    } = useComissaoContrato({
    contratoId,
    incluirMovimentacoes: true,
    carregarAutomaticamente:
      acessoEconomicoCompleto,
  });

  const [
    modalLancamentoAberto,
    setModalLancamentoAberto,
    ] = useState(false);

  type ModalOperacao =
  | "RECEBER"
  | "ESTORNAR_RECEBIMENTO"
  | "PAGAR"
  | "ESTORNAR_PAGAMENTO"
  | "CANCELAR_RECEBIMENTO"
  | "CANCELAR_PAGAMENTO"
  | "REVERTER_RECEBIMENTO"
  | "REVERTER_PAGAMENTO"
  | null;

  const [
    modalOperacao,
    setModalOperacao,
  ] = useState<ModalOperacao>(null);

  const [
    recebimentoSelecionado,
    setRecebimentoSelecionado,
  ] = useState<ComissaoRecebimentoComSituacao | null>(null);

  const [
    pagamentoSelecionado,
    setPagamentoSelecionado,
  ] = useState<ComissaoPagamentoComSituacao | null>(null);

  const [
    splitSelecionado,
    setSplitSelecionado,
  ] = useState<ComissaoSplit | null>(null);

  const [
    opcoesCorretores,
    setOpcoesCorretores,
  ] = useState<OpcaoParticipanteComissao[]>([]);

  const [
    opcoesSupervisores,
    setOpcoesSupervisores,
  ] = useState<OpcaoParticipanteComissao[]>([]);

  const [
    carregandoParticipantes,
    setCarregandoParticipantes,
  ] = useState(false);

  const [
    erroParticipantes,
    setErroParticipantes,
  ] = useState<string | null>(null);

  const [
    contextoContrato,
    setContextoContrato,
  ] = useState<ContextoContratoComissao | null>(
    null
  );

  const [
    carregandoContextoContrato,
    setCarregandoContextoContrato,
  ] = useState(false);

  const [
    erroContextoContrato,
    setErroContextoContrato,
  ] = useState<string | null>(null);

  const [
  splitsExpandidos,
  setSplitsExpandidos,
] = useState<Set<string>>(
  () => new Set()
);

function alternarSplitExpandido(
  splitId: string
) {
  setSplitsExpandidos(
    (atual) => {
      const proximo = new Set(atual);

      if (proximo.has(splitId)) {
        proximo.delete(splitId);
      } else {
        proximo.add(splitId);
      }

      return proximo;
    }
  );
}

const podeCriar =
  contextoPermissao
    ? podeCriarComissao(
        contextoPermissao
      )
    : false;

const podeEditar =
  contextoPermissao
    ? podeEditarComissao(
        contextoPermissao
      )
    : false;

const podeReceber =
  contextoPermissao
    ? podeReceberComissao(
        contextoPermissao
      )
    : false;

const podeEstornarRecebimento =
  contextoPermissao
    ? podeEstornarRecebimentoComissao(
        contextoPermissao
      )
    : false;

const podePagar =
  contextoPermissao
    ? podePagarSplitComissao(
        contextoPermissao
      )
    : false;

const podeEstornarPagamento =
  contextoPermissao
    ? podeEstornarPagamentoComissao(
        contextoPermissao
      )
    : false;

const podeCancelarProvisao =
  contextoPermissao
    ? podeCancelarProvisaoComissao(
        contextoPermissao
      )
    : false;

const podeReverterCancelamento =
  contextoPermissao
    ? podeReverterCancelamentoProvisaoComissao(
        contextoPermissao
      )
    : false;

useEffect(() => {
  let ativo = true;

  async function carregarParticipantes() {
    if (!podeCriar && !podeEditar) {
      setOpcoesCorretores([]);
      setOpcoesSupervisores([]);
      setCarregandoParticipantes(false);
      setErroParticipantes(null);
      return;
    }

    try {
      setCarregandoParticipantes(true);
      setErroParticipantes(null);

      const [
        corretores,
        supervisores,
      ] = await Promise.all([
        buscarCorretoresComissao(),
        buscarSupervisoresComissao(),
      ]);

      if (!ativo) return;

      setOpcoesCorretores(corretores);
      setOpcoesSupervisores(supervisores);
    } catch (error) {
      if (!ativo) return;

      setOpcoesCorretores([]);
      setOpcoesSupervisores([]);

      setErroParticipantes(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os participantes."
      );
    } finally {
      if (ativo) {
        setCarregandoParticipantes(false);
      }
    }
  }

  void carregarParticipantes();

  return () => {
    ativo = false;
  };
}, [podeCriar, podeEditar]);

useEffect(() => {
  let ativo = true;

  async function carregarParticipantes() {
  if (!podeCriar && !podeEditar) {
    setOpcoesCorretores([]);
    setOpcoesSupervisores([]);
    setCarregandoParticipantes(false);
    setErroParticipantes(null);
    return;
  }

  try {
    setCarregandoParticipantes(true);
      setErroParticipantes(null);

      const [
        corretores,
        supervisores,
      ] = await Promise.all([
        buscarCorretoresComissao(),
        buscarSupervisoresComissao(),
      ]);

      if (!ativo) return;

      setOpcoesCorretores(corretores);
      setOpcoesSupervisores(supervisores);
    } catch (error) {
      if (!ativo) return;

      setOpcoesCorretores([]);
      setOpcoesSupervisores([]);

      setErroParticipantes(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os participantes."
      );
    } finally {
      if (ativo) {
        setCarregandoParticipantes(false);
      }
    }
  }

  void carregarParticipantes();

  return () => {
    ativo = false;
  };
}, [podeCriar, podeEditar]);


useEffect(() => {
  let ativo = true;

  async function carregarContextoContrato() {
    if (!contratoId) {
      if (ativo) {
        setContextoContrato(null);
        setErroContextoContrato(
          "Contrato não informado."
        );
      }

      return;
    }

    try {
      setCarregandoContextoContrato(true);
      setErroContextoContrato(null);

      const contexto =
        await buscarContextoContratoComissao(
          contratoId
        );

      if (!ativo) return;

      setContextoContrato(contexto);
    } catch (error) {
      if (!ativo) return;

      setContextoContrato(null);

      setErroContextoContrato(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o contrato."
      );
    } finally {
      if (ativo) {
        setCarregandoContextoContrato(false);
      }
    }
  }

  void carregarContextoContrato();

  return () => {
    ativo = false;
  };
}, [contratoId]);

  const splitsParticipantes = useMemo(
    () =>
      splits.filter(
        (split) =>
          !split.residual_corretora &&
          split.tipo_participante !== "CORRETORA"
      ),
    [splits]
  );

  const splitResidual = useMemo(
    () =>
      splits.find(
        (split) =>
          split.residual_corretora ||
          split.tipo_participante === "CORRETORA"
      ) ?? null,
    [splits]
  );

  

  if (
  userProfile &&
  !acessoEconomicoCompleto
) {
  const mensagem =
    userProfile.tipo_usuario === "CORRETOR"
      ? "A visão econômica completa da comissão é restrita à corretora. Sua área de comissões exibirá apenas seus próprios splits, deduções e pagamentos."
      : "ADMIN ainda não possui permissão definida para o módulo de comissões.";

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />

            <div>
              <h1 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Acesso restrito
              </h1>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                {mensagem}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  if (loading && !dados) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Carregando comissão...
        </div>
      </div>
    );
  }

  async function handleSalvarComissao(
    payload: CriarComissaoPayload
    ) {
    await salvar(payload);
    setModalLancamentoAberto(false);
    }
  
    function fecharModalOperacao() {
    setModalOperacao(null);
    setRecebimentoSelecionado(null);
    setPagamentoSelecionado(null);
    setSplitSelecionado(null);
  }

  function abrirOperacaoRecebimento(
    operacao: ModalOperacao,
    recebimento: ComissaoRecebimentoComSituacao
  ) {
    setPagamentoSelecionado(null);
    setSplitSelecionado(null);
    setRecebimentoSelecionado(recebimento);
    setModalOperacao(operacao);
  }

  function abrirOperacaoPagamento(
    operacao: ModalOperacao,
    pagamento: ComissaoPagamentoComSituacao
  ) {
    const split =
      splits.find(
        (item) =>
          item.id === pagamento.split_id
      ) ?? null;

    setRecebimentoSelecionado(null);
    setPagamentoSelecionado(pagamento);
    setSplitSelecionado(split);
    setModalOperacao(operacao);
  }

  async function handleReceber(
    payload: ReceberComissaoPayload
  ) {
    await receber(payload);
    fecharModalOperacao();
  }

  async function handleEstornarRecebimento(
    payload: EstornarRecebimentoComissaoPayload
  ) {
    await estornarRecebimento(payload);
    fecharModalOperacao();
  }

  async function handlePagar(
    payload: PagarComissaoSplitPayload
  ) {
    await pagar(payload);
    fecharModalOperacao();
  }

  async function handleEstornarPagamento(
    payload: EstornarPagamentoComissaoPayload
  ) {
    await estornarPagamento(payload);
    fecharModalOperacao();
  }

  async function handleCancelarProvisao(
    payload: CancelarProvisaoComissaoPayload
  ) {
    await cancelarProvisao(payload);
    fecharModalOperacao();
  }

  async function handleReverterCancelamento(
    payload: ReverterCancelamentoProvisaoComissaoPayload
  ) {
    await reverterCancelamento(payload);
    fecharModalOperacao();
  }

  

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Voltar"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <ReceiptText size={21} />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl">
                Comissão do contrato
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                {contextoContrato?.numero_apolice && (
                  <span>
                    Apólice:{" "}
                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                      {contextoContrato.numero_apolice}
                    </strong>
                  </span>
                )}

                {contextoContrato && (
                  <>
                    <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">
                      •
                    </span>

                    <span>
                      Valor aceito:{" "}
                      <strong className="font-medium text-slate-700 dark:text-slate-300">
                        {formatarMoedaComissao(
                          contextoContrato.valor_aceito
                        )}
                      </strong>
                    </span>

                    <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">
                      •
                    </span>

                    <span>
                      Status:{" "}
                      <strong className="font-medium text-slate-700 dark:text-slate-300">
                        {contextoContrato.status}
                      </strong>
                    </span>
                  </>
                )}

                {!contextoContrato &&
                  !carregandoContextoContrato && (
                    <span>
                      Recebimentos, distribuição e pagamentos vinculados ao contrato.
                    </span>
                  )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || operando}
            onClick={() => {
              void recarregar();
            }}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 lg:self-auto"
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

        {erro && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="text-sm font-medium">
                Não foi possível carregar a comissão
              </p>

              <p className="mt-1 text-xs">
                {erro}
              </p>
            </div>
          </div>
        )}

        {!possuiComissao &&
          !loading &&
          podeCriar ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950">
            <ReceiptText
            size={30}
            className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Este contrato ainda não possui comissão configurada.
            </p>

            <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-400">
            Configure a comissão, os recebimentos da seguradora e a distribuição entre participantes.
            </p>

            <button
            type="button"
            disabled={
              operando ||
              carregandoParticipantes ||
              carregandoContextoContrato ||
              !contextoContrato
            }
            onClick={() =>
              setModalLancamentoAberto(true)
            }
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregandoParticipantes ||
              carregandoContextoContrato ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Plus size={16} />
              )}

              {carregandoContextoContrato
                ? "Carregando contrato..."
                : carregandoParticipantes
                  ? "Carregando participantes..."
                  : "Configurar comissão"}
          </button>

          {erroParticipantes && (
            <p className="mx-auto mt-3 max-w-lg text-xs text-red-600 dark:text-red-400">
              {erroParticipantes}
            </p>
          )}
          {erroContextoContrato && (
            <p className="mx-auto mt-3 max-w-lg text-xs text-red-600 dark:text-red-400">
              {erroContextoContrato}
            </p>
          )}
        </div>
        ) : null}

        {possuiComissao && comissao && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CardIndicador
                titulo="Base original"
                valor={formatarMoedaComissao(
                  comissao.valor_base_original
                )}
                descricao="Base antes das deduções"
                icone={ReceiptText}
              />

              <CardIndicador
                titulo="Base de cálculo"
                valor={formatarMoedaComissao(
                  comissao.valor_base_calculo
                )}
                descricao={`${formatarMoedaComissao(
                  comissao.valor_deducoes_base
                )} em deduções`}
                icone={CalendarClock}
              />

              <CardIndicador
                titulo="Comissão bruta"
                valor={formatarMoedaComissao(
                  comissao.valor_comissao_bruta
                )}
                descricao={
                  comissao.tipo_calculo_comissao === "PERCENTUAL"
                    ? formatarPercentualComissao(
                        comissao.percentual_comissao
                      )
                    : "Valor fixo"
                }
                icone={HandCoins}
              />

              <CardIndicador
                titulo="Residual corretora"
                valor={formatarMoedaComissao(
                  resumoSplits?.valor_residual_corretora ??
                    splitResidual?.valor_liquido_split ??
                    0
                )}
                descricao="Parcela pertencente à corretora"
                icone={Building2}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <ReceiptText
                    size={17}
                    className="text-slate-500"
                  />

                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Configuração da comissão
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Tipo
                    </span>

                    <span className="text-right font-medium text-slate-800 dark:text-slate-200">
                      {comissao.tipo_calculo_comissao === "PERCENTUAL"
                        ? "Percentual"
                        : "Valor fixo"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Comissão
                    </span>

                    <span className="text-right font-medium text-slate-800 dark:text-slate-200">
                      {comissao.tipo_calculo_comissao === "PERCENTUAL"
                        ? formatarPercentualComissao(
                            comissao.percentual_comissao
                          )
                        : formatarMoedaComissao(
                            comissao.valor_comissao_fixa
                          )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Deduções
                    </span>

                    <span className="text-right font-medium text-slate-800 dark:text-slate-200">
                      {deducoes.length}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={17}
                    className="text-slate-500"
                  />

                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Recebimentos
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                        Total previsto
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                        {formatarMoedaComissao(
                        resumoRecebimentos?.valor_total_previsto ?? 0
                        )}
                    </span>
                    </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      A receber
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatarMoedaComissao(
                        resumoRecebimentos?.valor_a_receber ?? 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Recebido
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatarMoedaComissao(
                        resumoRecebimentos?.valor_recebido ?? 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Provisões
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {recebimentos.length}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <WalletCards
                    size={17}
                    className="text-slate-500"
                  />

                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Pagamentos
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      A pagar
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatarMoedaComissao(
                        resumoPagamentos?.valor_a_pagar ?? 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Pago
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatarMoedaComissao(
                        resumoPagamentos?.valor_pago ?? 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Participantes
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {splitsParticipantes.length}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Provisões
                    </span>

                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {pagamentos.length}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CalendarClock
                    size={17}
                    className="text-slate-500"
                  />

                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Recebimentos da seguradora
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Seguradora → Corretora
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[850px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Provisão
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Data prevista
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Valor
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recebimentos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Nenhum recebimento provisionado.
                        </td>
                      </tr>
                    ) : (
                      recebimentos.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {item.descricao ||
                              `Provisão ${item.numero_provisao}`}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {item.data_prevista}
                          </td>

                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                            {formatarMoedaComissao(
                              item.valor_previsto
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {item.situacao ??
                              item.status}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              {item.status === "PENDENTE" &&
                                (podeReceber ||
                                  podeCancelarProvisao) && (
                                <>
                                  {podeReceber && (
                                    <button
                                      type="button"
                                      disabled={operando}
                                      onClick={() =>
                                        abrirOperacaoRecebimento(
                                          "RECEBER",
                                          item
                                        )
                                      }
                                    className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                                  >
                                    Receber
                                  </button>
                                  )}

                                  {podeCancelarProvisao && (
                                    <button
                                      type="button"
                                      disabled={operando}
                                      onClick={() =>
                                        abrirOperacaoRecebimento(
                                          "CANCELAR_RECEBIMENTO",
                                          item
                                        )
                                      }
                                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                </>
                              )}

                              {item.status === "RECEBIDA" &&
                                podeEstornarRecebimento && (
                                <button
                                  type="button"
                                  disabled={operando}
                                  onClick={() =>
                                    abrirOperacaoRecebimento(
                                      "ESTORNAR_RECEBIMENTO",
                                      item
                                    )
                                  }
                                  className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30"
                                >
                                  Estornar
                                </button>
                              )}

                              {item.status === "CANCELADA" &&
                                podeReverterCancelamento && (
                                <button
                                  type="button"
                                  disabled={operando}
                                  onClick={() =>
                                    abrirOperacaoRecebimento(
                                      "REVERTER_RECEBIMENTO",
                                      item
                                    )
                                  }
                                  className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                >
                                  Reverter
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users
                    size={17}
                    className="text-slate-500"
                  />

                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Distribuição da comissão
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Splits, deduções e pagamentos por participante
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {splits.length}{" "}
                  {splits.length === 1
                    ? "participante"
                    : "participantes"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                      <th className="w-12 px-4 py-3" />

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Participante
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tipo
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

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pagamentos
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {splits.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Nenhum split configurado.
                        </td>
                      </tr>
                    ) : (
                      splits.map((split) => {
                        const expandido =
                          splitsExpandidos.has(
                            split.id
                          );

                        const deducoesDoSplit =
                          splitDeducoes.filter(
                            (deducao) =>
                              deducao.split_id ===
                              split.id
                          );

                        const pagamentosDoSplit =
                          pagamentos.filter(
                            (pagamento) =>
                              pagamento.split_id ===
                              split.id
                          );

                        const nomeParticipante =
                          split.tipo_participante ===
                            "CORRETORA" ||
                          split.residual_corretora
                            ? "Corretora"
                            : split.participante_nome ||
                              split.usuario_id ||
                              "Participante";

                        return (
                          <Fragment key={split.id}>
                            <tr
                              
                              className="border-b border-slate-100 dark:border-slate-900"
                            >
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    alternarSplitExpandido(
                                      split.id
                                    )
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                                  title={
                                    expandido
                                      ? "Ocultar detalhes"
                                      : "Ver detalhes"
                                  }
                                >
                                  {expandido ? (
                                    <ChevronDown
                                      size={16}
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={16}
                                    />
                                  )}
                                </button>
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {nomeParticipante}
                                  </p>

                                  {split.residual_corretora && (
                                    <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                                      Residual automático
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                {
                                  split.tipo_participante
                                }
                              </td>

                              <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                                {formatarMoedaComissao(
                                  split.valor_bruto_split
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                                {formatarMoedaComissao(
                                  split.valor_deducoes
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {formatarMoedaComissao(
                                  split.valor_liquido_split
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {split.residual_corretora ? (
                                  <span className="text-xs text-slate-400">
                                    Não aplicável
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                    {
                                      pagamentosDoSplit.length
                                    }
                                  </span>
                                )}
                              </td>
                            </tr>

                            {expandido && (
                              <tr
                                
                                className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-900 dark:bg-slate-900/20"
                              >
                                <td />

                                <td
                                  colSpan={6}
                                  className="px-4 py-4"
                                >
                                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                                      <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          Deduções do participante
                                        </h3>

                                        <span className="text-xs text-slate-500">
                                          {
                                            deducoesDoSplit.length
                                          }
                                        </span>
                                      </div>

                                      {deducoesDoSplit.length ===
                                      0 ? (
                                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                                          Nenhuma dedução aplicada.
                                        </p>
                                      ) : (
                                        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-900">
                                          {deducoesDoSplit.map(
                                            (deducao) => (
                                              <div
                                                key={
                                                  deducao.id
                                                }
                                                className="flex items-center justify-between gap-4 py-2.5"
                                              >
                                                <div className="min-w-0">
                                                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {deducao.descricao}
                                                  </p>

                                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                    {deducao.tipo_calculo === "PERCENTUAL"
                                                      ? formatarPercentualComissao(
                                                          deducao.percentual
                                                        )
                                                      : `Valor fixo: ${formatarMoedaComissao(
                                                          deducao.valor_fixo
                                                        )}`}
                                                  </p>
                                                </div>

                                                <span className="shrink-0 text-sm font-medium text-slate-800 dark:text-slate-200">
                                                  {formatarMoedaComissao(
                                                    deducao.valor_calculado
                                                  )}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}

                                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                                        <span className="text-xs font-medium text-slate-500">
                                          Total de deduções
                                        </span>

                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {formatarMoedaComissao(
                                            split.valor_deducoes
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                                      <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          Pagamentos do participante
                                        </h3>

                                        <span className="text-xs text-slate-500">
                                          {
                                            pagamentosDoSplit.length
                                          }
                                        </span>
                                      </div>

                                      {split.residual_corretora ? (
                                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                                          O residual pertence à própria corretora e não gera provisões de pagamento.
                                        </div>
                                      ) : pagamentosDoSplit.length ===
                                        0 ? (
                                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                                          Nenhum pagamento provisionado.
                                        </p>
                                      ) : (
                                        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-900">
                                          {pagamentosDoSplit.map(
                                            (pagamento) => (
                                              <div
                                                key={
                                                  pagamento.id
                                                }
                                                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2.5"
                                              >
                                                <div className="min-w-0">
                                                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {pagamento.descricao ||
                                                      `Pagamento ${pagamento.numero_provisao}`}
                                                  </p>

                                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                    {
                                                      pagamento.data_prevista
                                                    }
                                                  </p>
                                                </div>

                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                  {formatarMoedaComissao(
                                                    pagamento.valor_previsto
                                                  )}
                                                </span>

                                                <span
                                                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                                                    pagamento.status ===
                                                    "PAGA"
                                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                      : pagamento.status ===
                                                          "CANCELADA"
                                                        ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                                  }`}
                                                >
                                                  {pagamento.situacao ??
                                                    pagamento.status}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}

                                      {!split.residual_corretora &&
                                        pagamentosDoSplit.length >
                                          0 && (
                                          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                                            <span className="text-xs font-medium text-slate-500">
                                              Total provisionado
                                            </span>

                                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                              {formatarMoedaComissao(
                                                pagamentosDoSplit.reduce(
                                                  (
                                                    total,
                                                    pagamento
                                                  ) =>
                                                    total +
                                                    pagamento.valor_previsto,
                                                  0
                                                )
                                              )}
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <WalletCards
                    size={17}
                    className="text-slate-500"
                  />

                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Pagamentos aos participantes
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Corretora → Participantes
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[850px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Provisão
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Data prevista
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Valor
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagamentos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Nenhum pagamento provisionado.
                        </td>
                      </tr>
                    ) : (
                      pagamentos.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {item.descricao ||
                              `Pagamento ${item.numero_provisao}`}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {item.data_prevista}
                          </td>

                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                            {formatarMoedaComissao(
                              item.valor_previsto
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {item.situacao ??
                              item.status}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              {item.status === "PENDENTE" &&
                                (podePagar ||
                                  podeCancelarProvisao) && (
                                <>
                                  {podePagar && (
                                  <button
                                    type="button"
                                    disabled={operando}
                                    onClick={() =>
                                      abrirOperacaoPagamento(
                                        "PAGAR",
                                        item
                                      )
                                    }
                                    className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                                  >
                                    Pagar
                                  </button>
                                  )}

                                  {podeCancelarProvisao && (
                                  <button
                                    type="button"
                                    disabled={operando}
                                    onClick={() =>
                                      abrirOperacaoPagamento(
                                        "CANCELAR_PAGAMENTO",
                                        item
                                      )
                                    }
                                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                                  >
                                    Cancelar
                                  </button>
                                  )}
                                </>
                              )}

                              {item.status === "PAGA" &&
                                podeEstornarPagamento && (
                                <button
                                  type="button"
                                  disabled={operando}
                                  onClick={() =>
                                    abrirOperacaoPagamento(
                                      "ESTORNAR_PAGAMENTO",
                                      item
                                    )
                                  }
                                  className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30"
                                >
                                  Estornar
                                </button>
                              )}

                              {item.status === "CANCELADA" &&
                                podeReverterCancelamento && (
                                <button
                                  type="button"
                                  disabled={operando}
                                  onClick={() =>
                                    abrirOperacaoPagamento(
                                      "REVERTER_PAGAMENTO",
                                      item
                                    )
                                  }
                                  className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                >
                                  Reverter
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {movimentacoes.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Histórico da comissão
                </h2>

                <div className="mt-4 space-y-3">
                  {movimentacoes.map(
                    (movimentacao) => (
                      <div
                        key={movimentacao.id}
                        className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {
                              movimentacao.tipo_movimentacao
                            }
                          </span>

                          <span className="text-xs text-slate-500">
                            {
                              movimentacao.created_at
                            }
                          </span>
                        </div>

                        {movimentacao.justificativa && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {
                              movimentacao.justificativa
                            }
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            
          </>
        )}
      </div>

      <ModalLancamentoComissao
        aberto={modalLancamentoAberto}
        contratoId={contratoId ?? ""}
        valorBaseSugerido={
          comissao?.valor_base_original ??
          contextoContrato?.valor_aceito ??
          0
        }
        dadosIniciais={dados}
        salvando={operacoes.salvando}
        corretores={opcoesCorretores}
        supervisores={opcoesSupervisores}
        onFechar={() =>
          setModalLancamentoAberto(false)
        }
        onSalvar={handleSalvarComissao}
      />

        <ModalReceberComissao
  aberto={
    modalOperacao === "RECEBER"
  }
  recebimento={
    recebimentoSelecionado
  }
  salvando={
    operacoes.recebendo
  }
  onFechar={fecharModalOperacao}
  onConfirmar={handleReceber}
/>

<ModalEstornarRecebimento
  aberto={
    modalOperacao ===
    "ESTORNAR_RECEBIMENTO"
  }
  recebimento={
    recebimentoSelecionado
  }
  salvando={
    operacoes.estornandoRecebimento
  }
  onFechar={fecharModalOperacao}
  onConfirmar={
    handleEstornarRecebimento
  }
/>

<ModalPagarComissaoSplit
  aberto={
    modalOperacao === "PAGAR"
  }
  pagamento={
    pagamentoSelecionado
  }
  split={splitSelecionado}
  salvando={operacoes.pagando}
  onFechar={fecharModalOperacao}
  onConfirmar={handlePagar}
/>

<ModalEstornarPagamento
  aberto={
    modalOperacao ===
    "ESTORNAR_PAGAMENTO"
  }
  pagamento={
    pagamentoSelecionado
  }
  split={splitSelecionado}
  salvando={
    operacoes.estornandoPagamento
  }
  onFechar={fecharModalOperacao}
  onConfirmar={
    handleEstornarPagamento
  }
/>

<ModalCancelarProvisao
  aberto={
    modalOperacao ===
      "CANCELAR_RECEBIMENTO" ||
    modalOperacao ===
      "CANCELAR_PAGAMENTO"
  }
  recebimento={
    modalOperacao ===
    "CANCELAR_RECEBIMENTO"
      ? recebimentoSelecionado
      : null
  }
  pagamento={
    modalOperacao ===
    "CANCELAR_PAGAMENTO"
      ? pagamentoSelecionado
      : null
  }
  salvando={
    operacoes.cancelandoProvisao
  }
  onFechar={fecharModalOperacao}
  onConfirmar={
    handleCancelarProvisao
  }
/>

  <ModalReverterCancelamento
    aberto={
      modalOperacao ===
        "REVERTER_RECEBIMENTO" ||
      modalOperacao ===
        "REVERTER_PAGAMENTO"
    }
    recebimento={
      modalOperacao ===
      "REVERTER_RECEBIMENTO"
        ? recebimentoSelecionado
        : null
    }
    pagamento={
      modalOperacao ===
      "REVERTER_PAGAMENTO"
        ? pagamentoSelecionado
        : null
    }
    salvando={
      operacoes.revertendoCancelamento
    }
    onFechar={fecharModalOperacao}
    onConfirmar={
      handleReverterCancelamento
    }
  />
    </div>
  );
}