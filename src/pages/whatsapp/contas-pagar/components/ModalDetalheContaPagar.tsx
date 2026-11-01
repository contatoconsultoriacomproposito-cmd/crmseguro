import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  AlertTriangle,
  Banknote,

  CheckCircle2,

  CreditCard,

  Loader2,
  ReceiptText,
  RefreshCw,
  WalletCards,
  X,
} from 'lucide-react';

import {
  buscarBaixasContaPagar,
  buscarContaPagarPorId,
  registrarBaixaContaPagar,
  estornarBaixaContaPagar,
  atualizarContaPagar,
  buscarPlanoContasAtivo,
  cancelarContaPagar,
  type PlanoContaItem,
  type BaixaContaPagar,
  type DetalheContaPagar,
  type FormaPagamentoContaPagar,
} from '../services/contasPagarService';

import FinanceiroArquivos from '../../pages/financeiro/components/FinanceiroArquivos';

interface Props {
  aberto: boolean;
  lancamentoId: string | null;
  onClose: () => void;
  onAlterado?: () => void | Promise<void>;
}

interface FormBaixaState {
  dataPagamento: string;
  valorBaixado: string;
  juros: string;
  multa: string;
  desconto: string;
  formaPagamento: FormaPagamentoContaPagar;
  numeroDocumento: string;
  observacoes: string;
}

interface FormEdicaoState {
  planoContaId: string;
  descricao: string;
  favorecido: string;
  numeroDocumento: string;
  dataCompetencia: string;
  dataEmissao: string;
  dataVencimento: string;
  valorPrevisto: string;
  observacoes: string;
}

function obterHoje(): string {
  const hoje = new Date();

  const ano =
    hoje.getFullYear();

  const mes =
    String(
      hoje.getMonth() + 1
    ).padStart(2, '0');

  const dia =
    String(
      hoje.getDate()
    ).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function criarFormInicial(): FormBaixaState {
  return {
    dataPagamento: obterHoje(),
    valorBaixado: '',
    juros: '',
    multa: '',
    desconto: '',
    formaPagamento: 'PIX',
    numeroDocumento: '',
    observacoes: '',
  };
}

export default function ModalDetalheContaPagar({
  aberto,
  lancamentoId,
  onClose,
  onAlterado,
}: Props) {
  const [
    lancamento,
    setLancamento,
  ] = useState<DetalheContaPagar | null>(
    null
  );

  const [
    baixas,
    setBaixas,
  ] = useState<BaixaContaPagar[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    salvandoBaixa,
    setSalvandoBaixa,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState('');

  const [
    mensagem,
    setMensagem,
  ] = useState('');

  const [
    mostrarNovaBaixa,
    setMostrarNovaBaixa,
  ] = useState(false);

  const [
    formBaixa,
    setFormBaixa,
  ] = useState<FormBaixaState>(
    criarFormInicial()
  );

  const [
    baixaEstorno,
    setBaixaEstorno,
    ] = useState<BaixaContaPagar | null>(
    null
    );

    const [
    motivoEstorno,
    setMotivoEstorno,
    ] = useState('');

    const [
    estornando,
    setEstornando,
    ] = useState(false);

    const [
    modoEdicao,
    setModoEdicao,
    ] = useState(false);

    const [
    salvandoEdicao,
    setSalvandoEdicao,
    ] = useState(false);

    const [
    planoContas,
    setPlanoContas,
    ] = useState<PlanoContaItem[]>([]);

    const [
    formEdicao,
    setFormEdicao,
    ] = useState<FormEdicaoState>({
    planoContaId: '',
    descricao: '',
    favorecido: '',
    numeroDocumento: '',
    dataCompetencia: '',
    dataEmissao: '',
    dataVencimento: '',
    valorPrevisto: '',
    observacoes: '',
    });

    const [
    modalCancelarAberto,
    setModalCancelarAberto,
    ] = useState(false);

    const [
    motivoCancelamento,
    setMotivoCancelamento,
    ] = useState('');

    const [
    cancelandoLancamento,
    setCancelandoLancamento,
    ] = useState(false);

  const planoSelecionadoEdicao =
    useMemo(
      () =>
        planoContas.find(
          (item) =>
            item.id ===
            formEdicao.planoContaId
        ) ?? null,
      [
        planoContas,
        formEdicao.planoContaId,
      ]
    );

  const podeBaixar =
    lancamento &&
    lancamento.situacao !== 'PAGA' &&
    lancamento.situacao !== 'CANCELADA' &&
    lancamento.saldo > 0;

  const totalSaidaCaixa =
    useMemo(() => {
      const valorBaixado =
        normalizarCampoNumero(
          formBaixa.valorBaixado
        );

      const juros =
        normalizarCampoNumero(
          formBaixa.juros
        );

      const multa =
        normalizarCampoNumero(
          formBaixa.multa
        );

      const desconto =
        normalizarCampoNumero(
          formBaixa.desconto
        );

      return Math.max(
        0,
        valorBaixado +
          juros +
          multa -
          desconto
      );
    }, [formBaixa]);

  useEffect(() => {
    if (
      !aberto ||
      !lancamentoId
    ) {
      return;
    }

    setMensagem('');
    setErro('');
    setMostrarNovaBaixa(false);
    setFormBaixa(
      criarFormInicial()
    );

    void carregarTudo(
      lancamentoId
    );
  }, [
    aberto,
    lancamentoId,
  ]);

  async function carregarTudo(
    id: string
  ) {
    try {
      setLoading(true);
      setErro('');

      const [
        detalhe,
        listaBaixas,
      ] = await Promise.all([
        buscarContaPagarPorId(
          id
        ),
        buscarBaixasContaPagar(
          id
        ),
      ]);

      setLancamento(
        detalhe
      );

      setBaixas(
        listaBaixas
      );
    } catch (error) {
      console.error(
        '[ContasPagar] Erro ao carregar detalhes:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o lançamento.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function abrirEdicao() {
  if (
    !lancamento ||
    lancamento.origem === 'COMISSAO'
  ) {
    return;
  }

  setErro('');
  setMensagem('');

  try {
    const planos =
      await buscarPlanoContasAtivo();

    setPlanoContas(
      planos
    );

    setFormEdicao({
      planoContaId:
        lancamento.plano_conta_id ??
        '',

      descricao:
        lancamento.descricao,

      favorecido:
        lancamento.favorecido ??
        '',

      numeroDocumento:
        lancamento.numero_documento ??
        '',

      dataCompetencia:
        lancamento.data_competencia ??
        '',

      dataEmissao:
        lancamento.data_emissao ??
        '',

      dataVencimento:
        lancamento.data_vencimento,

      valorPrevisto:
        String(
          lancamento.valor_previsto
        ),

      observacoes:
        lancamento.observacoes ??
        '',
    });

    setModoEdicao(
      true
    );
  } catch (error) {
    setErro(
      error instanceof Error
        ? error.message
        : 'Não foi possível preparar a edição.'
    );
  }
}

async function handleSalvarEdicao(
  event: FormEvent
) {
  event.preventDefault();

  if (
    !lancamento ||
    salvandoEdicao
  ) {
    return;
  }

  const valor =
    Number(
      formEdicao.valorPrevisto
    );

  if (
    !formEdicao.planoContaId
  ) {
    setErro(
      'Selecione o plano de contas.'
    );
    return;
  }

  if (
    !formEdicao.descricao.trim()
  ) {
    setErro(
      'Informe a descrição.'
    );
    return;
  }

  if (
    !formEdicao.dataVencimento
  ) {
    setErro(
      'Informe a data de vencimento.'
    );
    return;
  }

  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    setErro(
      'Informe um valor válido.'
    );
    return;
  }

  try {
    setSalvandoEdicao(
      true
    );

    setErro('');
    setMensagem('');

    await atualizarContaPagar(
      lancamento.id,
      {
        plano_conta_id:
          formEdicao.planoContaId,

        descricao:
          formEdicao.descricao,

        favorecido:
          formEdicao.favorecido ||
          null,

        numero_documento:
          formEdicao.numeroDocumento ||
          null,

        data_competencia:
          formEdicao.dataCompetencia ||
          null,

        data_emissao:
          formEdicao.dataEmissao ||
          null,

        data_vencimento:
          formEdicao.dataVencimento,

        valor_previsto:
          valor,

        observacoes:
          formEdicao.observacoes ||
          null,
      }
    );

    const detalheAtualizado =
      await buscarContaPagarPorId(
        lancamento.id
      );

    setLancamento(
      detalheAtualizado
    );

    setModoEdicao(
      false
    );

    setMensagem(
      'Lançamento atualizado com sucesso.'
    );

    if (onAlterado) {
      await onAlterado();
    }
  } catch (error) {
    setErro(
      error instanceof Error
        ? error.message
        : 'Não foi possível atualizar o lançamento.'
    );
  } finally {
    setSalvandoEdicao(
      false
    );
  }
}

async function handleCancelarLancamento() {
  if (
    !lancamento ||
    cancelandoLancamento
  ) {
    return;
  }

  const motivo =
    motivoCancelamento.trim();

  if (!motivo) {
    setErro(
      'Informe o motivo do cancelamento.'
    );
    return;
  }

  try {
    setCancelandoLancamento(
      true
    );

    setErro('');
    setMensagem('');

    await cancelarContaPagar({
      lancamento_id:
        lancamento.id,

      motivo,
    });

    const detalheAtualizado =
      await buscarContaPagarPorId(
        lancamento.id
      );

    setLancamento(
      detalheAtualizado
    );

    setModalCancelarAberto(
      false
    );

    setMotivoCancelamento(
      ''
    );

    setMensagem(
      'Lançamento cancelado com sucesso.'
    );

    if (onAlterado) {
      await onAlterado();
    }
  } catch (error) {
    console.error(
      '[ContasPagar] Erro ao cancelar lançamento:',
      error
    );

    setErro(
      error instanceof Error
        ? error.message
        : 'Não foi possível cancelar o lançamento.'
    );
  } finally {
    setCancelandoLancamento(
      false
    );
  }
}

  function alterarCampo<
    K extends keyof FormBaixaState
  >(
    campo: K,
    valor: FormBaixaState[K]
  ) {
    setFormBaixa(
      (prev) => ({
        ...prev,
        [campo]: valor,
      })
    );
  }

  function abrirNovaBaixa() {
    if (!lancamento) {
      return;
    }

    setErro('');
    setMensagem('');

    setFormBaixa({
      ...criarFormInicial(),
      valorBaixado:
        lancamento.saldo > 0
          ? lancamento.saldo.toFixed(2)
          : '',
    });

    setMostrarNovaBaixa(
      true
    );
  }

  function fecharNovaBaixa() {
    if (salvandoBaixa) {
      return;
    }

    setMostrarNovaBaixa(
      false
    );

    setErro('');
  }

  async function handleRegistrarBaixa(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      salvandoBaixa ||
      !lancamento
    ) {
      return;
    }

    setErro('');
    setMensagem('');

    const valorBaixado =
      normalizarCampoNumero(
        formBaixa.valorBaixado
      );

    const juros =
      normalizarCampoNumero(
        formBaixa.juros
      );

    const multa =
      normalizarCampoNumero(
        formBaixa.multa
      );

    const desconto =
      normalizarCampoNumero(
        formBaixa.desconto
      );

    if (
      !formBaixa.dataPagamento
    ) {
      setErro(
        'Informe a data do pagamento.'
      );
      return;
    }

    if (
      valorBaixado <= 0
    ) {
      setErro(
        'Informe o valor baixado.'
      );
      return;
    }

    if (
      valorBaixado >
      lancamento.saldo
    ) {
      setErro(
        `O valor da baixa não pode ser superior ao saldo de ${formatarMoeda(
          lancamento.saldo
        )}.`
      );
      return;
    }

    if (
      totalSaidaCaixa < 0
    ) {
      setErro(
        'O valor final pago não pode ser negativo.'
      );
      return;
    }

    try {
      setSalvandoBaixa(
        true
      );

      await registrarBaixaContaPagar({
        lancamento_id:
          lancamento.id,

        data_pagamento:
          formBaixa.dataPagamento,

        valor_baixado:
          valorBaixado,

        juros,

        multa,

        desconto,

        forma_pagamento:
          formBaixa.formaPagamento,

        numero_documento:
          formBaixa.numeroDocumento ||
          null,

        observacoes:
          formBaixa.observacoes ||
          null,
      });

      const [
        detalheAtualizado,
        baixasAtualizadas,
      ] = await Promise.all([
        buscarContaPagarPorId(
          lancamento.id
        ),

        buscarBaixasContaPagar(
          lancamento.id
        ),
      ]);

      setLancamento(
        detalheAtualizado
      );

      setBaixas(
        baixasAtualizadas
      );

      setMostrarNovaBaixa(
        false
      );

      setFormBaixa(
        criarFormInicial()
      );

      setMensagem(
        'Baixa registrada com sucesso.'
      );

      if (onAlterado) {
        await onAlterado();
      }
    } catch (error) {
      console.error(
        '[ContasPagar] Erro ao registrar baixa:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a baixa.'
      );
    } finally {
      setSalvandoBaixa(
        false
      );
    }
  }

  async function handleEstornarBaixa() {
  if (
    !baixaEstorno ||
    !lancamento ||
    estornando
  ) {
    return;
  }

  const motivo =
    motivoEstorno.trim();

  if (!motivo) {
    setErro(
      'Informe o motivo do estorno.'
    );
    return;
  }

  try {
    setEstornando(true);
    setErro('');
    setMensagem('');

    await estornarBaixaContaPagar({
      baixa_id:
        baixaEstorno.id,

      motivo,
    });

    const [
      detalheAtualizado,
      baixasAtualizadas,
    ] = await Promise.all([
      buscarContaPagarPorId(
        lancamento.id
      ),

      buscarBaixasContaPagar(
        lancamento.id
      ),
    ]);

    setLancamento(
      detalheAtualizado
    );

    setBaixas(
      baixasAtualizadas
    );

    setBaixaEstorno(
      null
    );

    setMotivoEstorno(
      ''
    );

    setMensagem(
      'Baixa estornada com sucesso.'
    );

    if (onAlterado) {
      await onAlterado();
    }
  } catch (error) {
    console.error(
      '[ContasPagar] Erro ao estornar baixa:',
      error
    );

    setErro(
      error instanceof Error
        ? error.message
        : 'Não foi possível estornar a baixa.'
    );
  } finally {
    setEstornando(false);
  }
}

  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <ReceiptText
                size={20}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {lancamento?.descricao ||
                  'Detalhes do lançamento'}
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Lançamento do Contas a Pagar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              salvandoBaixa
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {erro && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {erro}
              </span>
            </div>
          )}

          {mensagem && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {mensagem}
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center">
              <Loader2
                size={28}
                className="mb-3 animate-spin text-blue-500"
              />

              <span className="text-sm text-slate-500 dark:text-slate-400">
                Carregando lançamento...
              </span>
            </div>
          ) : lancamento ? (
            <div className="space-y-5">

              {/* RESUMO */}
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CardResumo
                  titulo="Valor previsto"
                  valor={formatarMoeda(
                    lancamento.valor_previsto
                  )}
                  icon={
                    <WalletCards
                      size={18}
                    />
                  }
                />

                <CardResumo
                  titulo="Total baixado"
                  valor={formatarMoeda(
                    lancamento.total_baixado
                  )}
                  icon={
                    <Banknote
                      size={18}
                    />
                  }
                />

                <CardResumo
                  titulo="Saldo pendente"
                  valor={formatarMoeda(
                    lancamento.saldo
                  )}
                  icon={
                    <CreditCard
                      size={18}
                    />
                  }
                />

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Situação
                  </p>

                  <div className="mt-3">
                    <BadgeSituacao
                      situacao={
                        lancamento.situacao
                      }
                      parcial={
                        lancamento.parcialmente_paga
                      }
                    />
                  </div>
                </div>
              </section>

              {/* DADOS */}
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Dados do lançamento
                </h3>

                {lancamento.origem !==
                'COMISSAO' &&
                !modoEdicao &&
                lancamento.situacao !==
                    'CANCELADA' && (
                    <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() =>
                        void abrirEdicao()
                        }
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                        setErro('');
                        setMensagem('');
                        setMotivoCancelamento('');
                        setModalCancelarAberto(true);
                        }}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                        Cancelar lançamento
                    </button>
                    </div>
                )}
                </div>

                {modoEdicao ? (
                <form
                    onSubmit={
                    handleSalvarEdicao
                    }
                    className="p-4"
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                    <Campo
                        label="Plano de contas"
                        obrigatorio
                        className="md:col-span-2 xl:col-span-3"
                    >
                        <select
                        value={
                            formEdicao.planoContaId
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                planoContaId:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        >
                        <option value="">
                            Selecione...
                        </option>

                        {planoContas.map(
                            (item) => (
                            <option
                                key={item.id}
                                value={item.id}
                            >
                                {item.codigo
                                ? `${item.codigo} - `
                                : ''}
                                {item.nome}
                            </option>
                            )
                        )}
                        </select>

                        {planoSelecionadoEdicao && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              Classificação:
                            </span>

                            <span
                              className={`rounded-md px-2 py-0.5 font-semibold ${
                                planoSelecionadoEdicao.tipo_despesa ===
                                'FIXA'
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  : 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                              }`}
                            >
                              {planoSelecionadoEdicao.tipo_despesa ===
                              'FIXA'
                                ? 'Fixa'
                                : 'Variável'}
                            </span>

                            <span className="text-slate-400">
                              definida pelo Plano de Contas
                            </span>
                          </div>
                        )}
                    </Campo>

                    <Campo
                        label="Descrição"
                        obrigatorio
                        className="md:col-span-2"
                    >
                        <input
                        value={
                            formEdicao.descricao
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                descricao:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo label="Favorecido">
                        <input
                        value={
                            formEdicao.favorecido
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                favorecido:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo label="Documento">
                        <input
                        value={
                            formEdicao.numeroDocumento
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                numeroDocumento:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo label="Competência">
                        <input
                        type="date"
                        value={
                            formEdicao.dataCompetencia
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                dataCompetencia:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo label="Emissão">
                        <input
                        type="date"
                        value={
                            formEdicao.dataEmissao
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                dataEmissao:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo
                        label="Vencimento"
                        obrigatorio
                    >
                        <input
                        type="date"
                        value={
                            formEdicao.dataVencimento
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                dataVencimento:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo
                        label="Valor previsto"
                        obrigatorio
                    >
                        <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                            formEdicao.valorPrevisto
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                valorPrevisto:
                                e.target.value,
                            })
                            )
                        }
                        className={
                            inputClass
                        }
                        />
                    </Campo>

                    <Campo
                        label="Observações"
                        className="md:col-span-2 xl:col-span-3"
                    >
                        <textarea
                        rows={3}
                        value={
                            formEdicao.observacoes
                        }
                        onChange={(e) =>
                            setFormEdicao(
                            (prev) => ({
                                ...prev,
                                observacoes:
                                e.target.value,
                            })
                            )
                        }
                        className={`${inputClass} h-auto resize-none py-3`}
                        />
                    </Campo>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={
                        salvandoEdicao
                        }
                        onClick={() =>
                        setModoEdicao(false)
                        }
                        className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={
                        salvandoEdicao
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                        {salvandoEdicao && (
                        <Loader2
                            size={16}
                            className="animate-spin"
                        />
                        )}

                        Salvar alterações
                    </button>
                    </div>
                </form>
                ) : (
                <>
                    <div className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                    <Info
                        label="Descrição"
                        valor={
                        lancamento.descricao
                        }
                    />

                    <Info
                        label="Favorecido"
                        valor={
                        lancamento.favorecido ||
                        '—'
                        }
                    />

                    <Info
                        label="Documento"
                        valor={
                        lancamento.numero_documento ||
                        '—'
                        }
                    />

                    <Info
                        label="Cliente"
                        valor={
                        lancamento.cliente_nome
                            ? `${lancamento.cliente_nome}${
                                lancamento.cliente_tipo
                                    ? ` (${lancamento.cliente_tipo})`
                                    : ''
                              }`
                            : '—'
                        }
                    />

                    <Info
                        label="Proposta"
                        valor={
                        lancamento.proposta_numero ||
                        '—'
                        }
                    />

                    <Info
                        label="Contrato"
                        valor={
                        lancamento.contrato_numero ||
                        (
                            lancamento.numero_cotacao
                                ? `Cotação ${lancamento.numero_cotacao}`
                                : '—'
                        )
                        }
                    />

                    <Info
                        label="Cotação"
                        valor={
                        lancamento.numero_cotacao ||
                        '—'
                        }
                    />

                    <Info
                        label="Plano de contas"
                        valor={
                        lancamento.plano_conta_caminho ||
                        lancamento.plano_conta_nome ||
                        '—'
                        }
                    />

                    <Info
                        label="Tipo de despesa"
                        valor={
                        lancamento.tipo_despesa ===
                        'FIXA'
                            ? 'Fixa'
                            : 'Variável'
                        }
                    />

                    <Info
                        label="Origem"
                        valor={formatarOrigem(
                        lancamento.origem
                        )}
                    />

                    <Info
                        label="Competência"
                        valor={formatarData(
                        lancamento.data_competencia
                        )}
                    />

                    <Info
                        label="Emissão"
                        valor={formatarData(
                        lancamento.data_emissao
                        )}
                    />

                    <Info
                        label="Vencimento"
                        valor={formatarData(
                        lancamento.data_vencimento
                        )}
                    />
                    </div>

                    {lancamento.observacoes && (
                    <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Observações
                        </p>

                        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                        {
                            lancamento.observacoes
                        }
                        </p>
                    </div>
                    )}
                </>
                )}
              </section>

              {/* ANEXOS DO LANÇAMENTO */}
              <FinanceiroArquivos
                tipoOrigem="CONTAS_PAGAR"
                lancamentoId={lancamento.id}
                contextoFinanceiro="LANCAMENTO"
                titulo="Anexos do lançamento"
              />

              {/* NOVA BAIXA */}
              {mostrarNovaBaixa && (
                <form
                  onSubmit={
                    handleRegistrarBaixa
                  }
                  className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Registrar baixa
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Saldo atual:{' '}
                        <strong>
                          {formatarMoeda(
                            lancamento.saldo
                          )}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        fecharNovaBaixa
                      }
                      disabled={
                        salvandoBaixa
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Campo
                      label="Data do pagamento"
                      obrigatorio
                    >
                      <input
                        type="date"
                        value={
                          formBaixa.dataPagamento
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'dataPagamento',
                            e.target.value
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    </Campo>

                    <Campo
                      label="Valor da baixa"
                      obrigatorio
                    >
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          formBaixa.valorBaixado
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'valorBaixado',
                            e.target.value
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    </Campo>

                    <Campo
                      label="Forma de pagamento"
                      obrigatorio
                    >
                      <select
                        value={
                          formBaixa.formaPagamento
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'formaPagamento',
                            e.target
                              .value as FormaPagamentoContaPagar
                          )
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="PIX">
                          PIX
                        </option>

                        <option value="BOLETO">
                          Boleto
                        </option>

                        <option value="TRANSFERENCIA">
                          Transferência
                        </option>

                        <option value="DEBITO_CONTA">
                          Débito em conta
                        </option>

                        <option value="CARTAO_CREDITO">
                          Cartão de crédito
                        </option>

                        <option value="CARTAO_DEBITO">
                          Cartão de débito
                        </option>

                        <option value="DINHEIRO">
                          Dinheiro
                        </option>

                        <option value="CHEQUE">
                          Cheque
                        </option>

                        <option value="OUTROS">
                          Outros
                        </option>
                      </select>
                    </Campo>

                    <Campo label="Juros">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          formBaixa.juros
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'juros',
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        className={
                          inputClass
                        }
                      />
                    </Campo>

                    <Campo label="Multa">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          formBaixa.multa
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'multa',
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        className={
                          inputClass
                        }
                      />
                    </Campo>

                    <Campo label="Desconto">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          formBaixa.desconto
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'desconto',
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        className={
                          inputClass
                        }
                      />
                    </Campo>

                    <Campo label="Documento">
                      <input
                        value={
                          formBaixa.numeroDocumento
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'numeroDocumento',
                            e.target.value
                          )
                        }
                        placeholder="Comprovante, referência..."
                        className={
                          inputClass
                        }
                      />
                    </Campo>

                    <Campo
                      label="Observações"
                      className="md:col-span-2"
                    >
                      <textarea
                        rows={3}
                        value={
                          formBaixa.observacoes
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'observacoes',
                            e.target.value
                          )
                        }
                        className={`${inputClass} h-auto resize-none py-3`}
                      />
                    </Campo>
                  </div>

                  {/* RESUMO DA BAIXA */}
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Obrigação liquidada
                        </p>

                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                          {formatarMoeda(
                            normalizarCampoNumero(
                              formBaixa.valorBaixado
                            )
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Saída efetiva de caixa
                        </p>

                        <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatarMoeda(
                            totalSaidaCaixa
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={
                        fecharNovaBaixa
                      }
                      disabled={
                        salvandoBaixa
                      }
                      className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={
                        salvandoBaixa
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvandoBaixa && (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      )}

                      Registrar baixa
                    </button>
                  </div>
                </form>
              )}

              {/* HISTÓRICO DE BAIXAS */}
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Histórico de baixas
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {baixas.length}{' '}
                      registro
                      {baixas.length === 1
                        ? ''
                        : 's'}
                    </p>
                  </div>

                  {podeBaixar &&
                    !mostrarNovaBaixa && (
                      <button
                        type="button"
                        onClick={
                          abrirNovaBaixa
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Banknote
                          size={16}
                        />
                        Registrar baixa
                      </button>
                    )}
                </div>

                {baixas.length === 0 ? (
                  <div className="flex min-h-[180px] flex-col items-center justify-center p-8 text-center">
                    <Banknote
                      size={24}
                      className="mb-3 text-slate-300"
                    />

                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Nenhuma baixa registrada
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Este lançamento ainda não possui pagamentos.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <Th>
                            Data
                          </Th>

                          <Th>
                            Forma
                          </Th>

                          <Th align="right">
                            Baixado
                          </Th>

                          <Th align="right">
                            Juros/Multa
                          </Th>

                          <Th align="right">
                            Desconto
                          </Th>

                          <Th align="right">
                            Pago
                          </Th>

                          <Th>
                            Status
                          </Th>
                          <Th align="center">
                            Ações
                          </Th>
                        </tr>
                      </thead>

                      <tbody>
                        {baixas.map(
                          (baixa) => (
                            <tr
                              key={
                                baixa.id
                              }
                              className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                            >
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                {formatarData(
                                  baixa.data_pagamento
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                {formatarFormaPagamento(
                                  baixa.forma_pagamento
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-200">
                                {formatarMoeda(
                                  baixa.valor_baixado
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                                {formatarMoeda(
                                  baixa.juros +
                                    baixa.multa
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                                {formatarMoeda(
                                  baixa.desconto
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                {formatarMoeda(
                                  baixa.valor_pago
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3">
                                {baixa.status ===
                                'ATIVA' ? (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                    Ativa
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    Estornada
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">

                                  <FinanceiroArquivos
                                    tipoOrigem="CONTAS_PAGAR"
                                    lancamentoId={lancamento.id}
                                    contextoFinanceiro="BAIXA"
                                    baixaId={baixa.id}
                                    variante="botao"
                                    titulo="Anexos da baixa"
                                  />

                                  {baixa.status === 'ATIVA' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBaixaEstorno(
                                          baixa
                                        );

                                        setMotivoEstorno(
                                          ''
                                        );

                                        setErro('');
                                        setMensagem('');
                                      }}
                                      className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                      Estornar
                                    </button>
                                  )}

                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (
                lancamentoId
              ) {
                void carregarTudo(
                  lancamentoId
                );
              }
            }}
            disabled={
              loading ||
              salvandoBaixa
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={15}
            />
            Atualizar
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={
              salvandoBaixa
            }
            className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
      {baixaEstorno && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Estornar baixa
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {formatarMoeda(
                    baixaEstorno.valor_pago
                    )}{' '}
                    pago em{' '}
                    {formatarData(
                    baixaEstorno.data_pagamento
                    )}
                </p>
                </div>

                <button
                type="button"
                disabled={estornando}
                onClick={() => {
                    setBaixaEstorno(
                    null
                    );

                    setMotivoEstorno(
                    ''
                    );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                <X size={18} />
                </button>
            </div>

            <div className="p-5">
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                O estorno não excluirá a baixa. Ela será preservada no histórico como estornada e o saldo do lançamento será recalculado.
                </div>

                <Campo
                label="Motivo do estorno"
                obrigatorio
                >
                <textarea
                    rows={4}
                    value={
                    motivoEstorno
                    }
                    onChange={(e) =>
                    setMotivoEstorno(
                        e.target.value
                    )
                    }
                    placeholder="Informe o motivo..."
                    className={`${inputClass} h-auto resize-none py-3`}
                />
                </Campo>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <button
                type="button"
                disabled={estornando}
                onClick={() => {
                    setBaixaEstorno(
                    null
                    );

                    setMotivoEstorno(
                    ''
                    );
                }}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                Cancelar
                </button>

                <button
                type="button"
                disabled={
                    estornando ||
                    !motivoEstorno.trim()
                }
                onClick={() =>
                    void handleEstornarBaixa()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                {estornando && (
                    <Loader2
                    size={16}
                    className="animate-spin"
                    />
                )}

                Confirmar estorno
                </button>
            </div>
            </div>
        </div>
        )}

        {modalCancelarAberto &&
        lancamento && (
            <div className="fixed inset-0 z-[145] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cancelar lançamento
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {lancamento.descricao}
                    </p>
                </div>

                <button
                    type="button"
                    disabled={
                    cancelandoLancamento
                    }
                    onClick={() => {
                    setModalCancelarAberto(
                        false
                    );

                    setMotivoCancelamento(
                        ''
                    );
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <X size={18} />
                </button>
                </div>

                <div className="p-5">
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    O lançamento não será excluído do banco. Ele será preservado no histórico como cancelado.
                </div>

                <Campo
                    label="Motivo do cancelamento"
                    obrigatorio
                >
                    <textarea
                    rows={4}
                    value={
                        motivoCancelamento
                    }
                    onChange={(e) =>
                        setMotivoCancelamento(
                        e.target.value
                        )
                    }
                    placeholder="Informe o motivo..."
                    className={`${inputClass} h-auto resize-none py-3`}
                    />
                </Campo>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <button
                    type="button"
                    disabled={
                    cancelandoLancamento
                    }
                    onClick={() => {
                    setModalCancelarAberto(
                        false
                    );

                    setMotivoCancelamento(
                        ''
                    );
                    }}
                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                    Voltar
                </button>

                <button
                    type="button"
                    disabled={
                    cancelandoLancamento ||
                    !motivoCancelamento.trim()
                    }
                    onClick={() =>
                    void handleCancelarLancamento()
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {cancelandoLancamento && (
                    <Loader2
                        size={16}
                        className="animate-spin"
                    />
                    )}

                    Confirmar cancelamento
                </button>
                </div>
            </div>
            </div>
        )}
    </div>
  );
}

/* ============================================================
 * COMPONENTES
 * ============================================================
 */

function CardResumo({
  titulo,
  valor,
  icon,
}: {
  titulo: string;
  valor: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {titulo}
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {valor}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  valor,
}: {
  label: string;
  valor: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {valor}
      </div>
    </div>
  );
}

function Campo({
  label,
  obrigatorio = false,
  className = '',
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${className}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}

        {obrigatorio && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
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
  align?: 'left' | 'right' | 'center';
}) {
  const classe =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <th
      className={`whitespace-nowrap bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-950/40 ${classe}`}
    >
      {children}
    </th>
  );
}

function BadgeSituacao({
  situacao,
  parcial,
}: {
  situacao:
    | 'PENDENTE'
    | 'VENCIDA'
    | 'PAGA'
    | 'CANCELADA';
  parcial: boolean;
}) {
  if (
    parcial &&
    situacao !== 'PAGA' &&
    situacao !== 'CANCELADA'
  ) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        Parcial
      </span>
    );
  }

  const configs = {
    PENDENTE:
      'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',

    VENCIDA:
      'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',

    PAGA:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',

    CANCELADA:
      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };

  const labels = {
    PENDENTE: 'Pendente',
    VENCIDA: 'Vencida',
    PAGA: 'Paga',
    CANCELADA: 'Cancelada',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${configs[situacao]}`}
    >
      {labels[situacao]}
    </span>
  );
}

/* ============================================================
 * FORMATADORES
 * ============================================================
 */

function normalizarCampoNumero(
  valor: string
): number {
  if (!valor.trim()) {
    return 0;
  }

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

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

  const partes =
    data.split('-');

  if (
    partes.length !== 3
  ) {
    return data;
  }

  const [
    ano,
    mes,
    dia,
  ] = partes;

  return `${dia}/${mes}/${ano}`;
}

function formatarOrigem(
  origem: string
): string {
  switch (origem) {
    case 'MANUAL':
      return 'Manual';

    case 'PROVISIONAMENTO':
      return 'Provisionamento';

    case 'COMISSAO':
      return 'Comissão';

    default:
      return origem;
  }
}

function formatarFormaPagamento(
  forma: FormaPagamentoContaPagar
): string {
  const labels: Record<
    FormaPagamentoContaPagar,
    string
  > = {
    PIX: 'PIX',
    BOLETO: 'Boleto',
    TRANSFERENCIA:
      'Transferência',
    DEBITO_CONTA:
      'Débito em conta',
    CARTAO_CREDITO:
      'Cartão de crédito',
    CARTAO_DEBITO:
      'Cartão de débito',
    DINHEIRO: 'Dinheiro',
    CHEQUE: 'Cheque',
    OUTROS: 'Outros',
  };

  return labels[forma];
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
