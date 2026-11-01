import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  Loader2,
  ReceiptText,
  Repeat2,
  X,
} from 'lucide-react';

import {
  criarContaPagar,
  criarProvisionamento,
  type PeriodicidadeProvisionamento,
  type PlanoContaItem,
} from '../services/contasPagarService';

interface Props {
  aberto: boolean;
  planoContas: PlanoContaItem[];
  onClose: () => void;
  onCriado: () => void;
}

interface FormState {
  planoContaId: string;

  descricao: string;
  favorecido: string;
  numeroDocumento: string;

  valorPrevisto: string;

  dataCompetencia: string;
  dataEmissao: string;
  dataVencimento: string;

  recorrente: boolean;

  dataInicio: string;
  dataFim: string;

  periodicidade: PeriodicidadeProvisionamento;

  diaVencimento: string;

  observacoes: string;
}

const FORM_INICIAL: FormState = {
  planoContaId: '',

  descricao: '',
  favorecido: '',
  numeroDocumento: '',

  valorPrevisto: '',

  dataCompetencia: '',
  dataEmissao: '',
  dataVencimento: '',

  recorrente: false,

  dataInicio: '',
  dataFim: '',

  periodicidade: 'MENSAL',

  diaVencimento: '',

  observacoes: '',
};

export default function ModalNovoLancamento({
  aberto,
  planoContas,
  onClose,
  onCriado,
}: Props) {
  const [
    form,
    setForm,
  ] = useState<FormState>(
    FORM_INICIAL
  );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState('');

  const planoOrdenado =
    useMemo(
      () =>
        [...planoContas].sort(
          (a, b) => {
            const codigoA =
              a.codigo || '';

            const codigoB =
              b.codigo || '';

            const codigoCompare =
              codigoA.localeCompare(
                codigoB,
                'pt-BR',
                {
                  numeric: true,
                }
              );

            if (
              codigoCompare !== 0
            ) {
              return codigoCompare;
            }

            return a.nome.localeCompare(
              b.nome,
              'pt-BR'
            );
          }
        ),
      [planoContas]
    );

  const planoSelecionado =
    useMemo(
      () =>
        planoContas.find(
          (item) =>
            item.id ===
            form.planoContaId
        ) ?? null,
      [
        planoContas,
        form.planoContaId,
      ]
    );

  const mostrarDiaVencimento =
    form.recorrente &&
    (
      form.periodicidade ===
        'MENSAL' ||
      form.periodicidade ===
        'ANUAL'
    );

  const quantidadeEstimada =
    useMemo(() => {
      if (
        !form.recorrente ||
        !form.dataInicio ||
        !form.dataFim
      ) {
        return 0;
      }

      const inicio =
        criarDataLocal(
          form.dataInicio
        );

      const fim =
        criarDataLocal(
          form.dataFim
        );

      if (
        inicio.getTime() >
        fim.getTime()
      ) {
        return 0;
      }

      let atual =
        new Date(
          inicio.getTime()
        );

      let quantidade = 0;

      while (
        atual.getTime() <=
          fim.getTime() &&
        quantidade < 10000
      ) {
        quantidade += 1;

        atual =
          avancarData(
            atual,
            form.periodicidade
          );
      }

      return quantidade;
    }, [
      form.recorrente,
      form.dataInicio,
      form.dataFim,
      form.periodicidade,
    ]);

  if (!aberto) {
    return null;
  }

  const alterarCampo = <
    K extends keyof FormState
  >(
    campo: K,
    valor: FormState[K]
  ) => {
    setForm(
      (prev) => ({
        ...prev,
        [campo]: valor,
      })
    );
  };

  function selecionarTipoLancamento(
    recorrente: boolean
  ) {
    setErro('');

    setForm(
      (prev) => ({
        ...prev,

        recorrente,

        dataInicio:
          recorrente
            ? (
                prev.dataCompetencia ||
                prev.dataVencimento ||
                ''
              )
            : prev.dataInicio,

        dataFim:
          recorrente
            ? (
                prev.dataFim ||
                ''
              )
            : prev.dataFim,
      })
    );
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (salvando) {
      return;
    }

    setErro('');

    if (
      !form.planoContaId
    ) {
      setErro(
        'Selecione o plano de contas.'
      );

      return;
    }

    if (
      !form.descricao.trim()
    ) {
      setErro(
        'Informe a descrição.'
      );

      return;
    }

    const valor =
      Number(
        form.valorPrevisto
      );

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <= 0
    ) {
      setErro(
        'Informe um valor válido.'
      );

      return;
    }

    if (
      form.recorrente
    ) {
      await salvarRecorrente(
        valor
      );

      return;
    }

    await salvarLancamentoUnico(
      valor
    );
  }

  async function salvarLancamentoUnico(
    valor: number
  ) {
    if (
      !form.dataVencimento
    ) {
      setErro(
        'Informe a data de vencimento.'
      );

      return;
    }

    try {
      setSalvando(
        true
      );

      await criarContaPagar({
        plano_conta_id:
          form.planoContaId,

        descricao:
          form.descricao,

        favorecido:
          form.favorecido ||
          null,

        numero_documento:
          form.numeroDocumento ||
          null,

        data_competencia:
          form.dataCompetencia ||
          null,

        data_emissao:
          form.dataEmissao ||
          null,

        data_vencimento:
          form.dataVencimento,

        valor_previsto:
          valor,

        observacoes:
          form.observacoes ||
          null,
      });

      finalizarSucesso();
    } catch (error) {
      console.error(
        '[ContasPagar] Erro ao salvar lançamento:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o lançamento.'
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function salvarRecorrente(
    valor: number
  ) {
    if (
      !form.dataInicio
    ) {
      setErro(
        'Informe a data inicial da recorrência.'
      );

      return;
    }

    if (
      !form.dataFim
    ) {
      setErro(
        'Informe a data final da recorrência.'
      );

      return;
    }

    if (
      form.dataFim <
      form.dataInicio
    ) {
      setErro(
        'A data final não pode ser anterior à data inicial.'
      );

      return;
    }

    let diaVencimento:
      | number
      | null = null;

    if (
      mostrarDiaVencimento &&
      form.diaVencimento
    ) {
      diaVencimento =
        Number(
          form.diaVencimento
        );

      if (
        !Number.isInteger(
          diaVencimento
        ) ||
        diaVencimento < 1 ||
        diaVencimento > 31
      ) {
        setErro(
          'O dia de vencimento deve estar entre 1 e 31.'
        );

        return;
      }
    }

    if (
      quantidadeEstimada <= 0
    ) {
      setErro(
        'Nenhum lançamento será gerado para o período informado.'
      );

      return;
    }

    try {
      setSalvando(
        true
      );

      await criarProvisionamento({
        plano_conta_id:
          form.planoContaId,

        descricao:
          form.descricao,

        favorecido:
          form.favorecido ||
          null,

        valor_base:
          valor,

        data_inicio:
          form.dataInicio,

        data_fim:
          form.dataFim,

        periodicidade:
          form.periodicidade,

        intervalo:
          1,

        dia_vencimento:
          diaVencimento,

        observacoes:
          form.observacoes ||
          null,
      });

      finalizarSucesso();
    } catch (error) {
      console.error(
        '[ContasPagar] Erro ao salvar lançamento recorrente:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar os lançamentos recorrentes.'
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  function finalizarSucesso() {
    setForm(
      FORM_INICIAL
    );

    setErro('');

    onCriado();
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setForm(
      FORM_INICIAL
    );

    setErro('');

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <ReceiptText
                size={20}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Novo lançamento
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cadastre uma conta única ou recorrente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              fecharModal
            }
            disabled={
              salvando
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-5">

            {erro && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0"
                />

                {erro}
              </div>
            )}

            {/* =====================================================
             * TIPO DO LANÇAMENTO
             * ===================================================== */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tipo de lançamento
              </p>

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    selecionarTipoLancamento(
                      false
                    )
                  }
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    !form.recorrente
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      !form.recorrente
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    <ReceiptText
                      size={17}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      Lançamento único
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Cria uma única conta a pagar.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    selecionarTipoLancamento(
                      true
                    )
                  }
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    form.recorrente
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      form.recorrente
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    <Repeat2
                      size={17}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      Lançamento recorrente
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Gera automaticamente várias contas no período.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* =====================================================
             * DADOS GERAIS
             * ===================================================== */}
            <div className="grid gap-4 md:grid-cols-2">

              <Campo
                label="Plano de contas"
                obrigatorio
                className="md:col-span-2"
              >
                <select
                  value={
                    form.planoContaId
                  }
                  onChange={(e) =>
                    alterarCampo(
                      'planoContaId',
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Selecione...
                  </option>

                  {planoOrdenado.map(
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

                {planoSelecionado && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Classificação:
                    </span>

                    <span
                      className={`rounded-md px-2 py-0.5 font-semibold ${
                        planoSelecionado.tipo_despesa ===
                        'FIXA'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                      }`}
                    >
                      {planoSelecionado.tipo_despesa ===
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
                    form.descricao
                  }
                  onChange={(e) =>
                    alterarCampo(
                      'descricao',
                      e.target.value
                    )
                  }
                  placeholder="Ex.: Aluguel do escritório"
                  className={
                    inputClass
                  }
                />
              </Campo>

              <Campo label="Favorecido">
                <input
                  value={
                    form.favorecido
                  }
                  onChange={(e) =>
                    alterarCampo(
                      'favorecido',
                      e.target.value
                    )
                  }
                  placeholder="Empresa ou pessoa"
                  className={
                    inputClass
                  }
                />
              </Campo>

              {!form.recorrente && (
                <Campo label="Documento">
                  <input
                    value={
                      form.numeroDocumento
                    }
                    onChange={(e) =>
                      alterarCampo(
                        'numeroDocumento',
                        e.target.value
                      )
                    }
                    placeholder="NF, boleto, referência..."
                    className={
                      inputClass
                    }
                  />
                </Campo>
              )}

              <Campo
                label={
                  form.recorrente
                    ? 'Valor de cada lançamento'
                    : 'Valor previsto'
                }
                obrigatorio
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    form.valorPrevisto
                  }
                  onChange={(e) =>
                    alterarCampo(
                      'valorPrevisto',
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className={
                    inputClass
                  }
                />
              </Campo>
            </div>

            {/* =====================================================
             * LANÇAMENTO ÚNICO
             * ===================================================== */}
            {!form.recorrente && (
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays
                    size={16}
                    className="text-slate-400"
                  />

                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Datas do lançamento
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Campo label="Competência">
                    <input
                      type="date"
                      value={
                        form.dataCompetencia
                      }
                      onChange={(e) =>
                        alterarCampo(
                          'dataCompetencia',
                          e.target.value
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
                        form.dataEmissao
                      }
                      onChange={(e) =>
                        alterarCampo(
                          'dataEmissao',
                          e.target.value
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
                        form.dataVencimento
                      }
                      onChange={(e) =>
                        alterarCampo(
                          'dataVencimento',
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Campo>
                </div>
              </div>
            )}

            {/* =====================================================
             * LANÇAMENTO RECORRENTE
             * ===================================================== */}
            {form.recorrente && (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/10">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarRange
                    size={17}
                    className="text-blue-500"
                  />

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Recorrência
                    </h3>

                    <p className="text-xs text-slate-500">
                      Defina o período em que as contas serão geradas.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <Campo
                    label="Periodicidade"
                    obrigatorio
                  >
                    <select
                      value={
                        form.periodicidade
                      }
                      onChange={(e) =>
                        alterarCampo(
                          'periodicidade',
                          e.target
                            .value as PeriodicidadeProvisionamento
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="DIARIA">
                        Diária
                      </option>

                      <option value="SEMANAL">
                        Semanal
                      </option>

                      <option value="MENSAL">
                        Mensal
                      </option>

                      <option value="ANUAL">
                        Anual
                      </option>
                    </select>
                  </Campo>

                  {mostrarDiaVencimento && (
                    <Campo label="Dia do vencimento">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        value={
                          form.diaVencimento
                        }
                        onChange={(e) =>
                          alterarCampo(
                            'diaVencimento',
                            e.target.value
                          )
                        }
                        placeholder="Ex.: 10"
                        className={
                          inputClass
                        }
                      />
                    </Campo>
                  )}

                  <Campo
                    label="Início"
                    obrigatorio
                  >
                    <input
                      type="date"
                      value={
                        form.dataInicio
                      }
                      onChange={(e) =>
                        alterarCampo(
                          'dataInicio',
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Campo>

                  <Campo
                    label="Fim"
                    obrigatorio
                  >
                    <input
                      type="date"
                      value={
                        form.dataFim
                      }
                      onChange={(e) =>
                        alterarCampo(
                          'dataFim',
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Campo>
                </div>

                <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                    Previsão
                  </p>

                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Serão gerados{' '}
                    <strong>
                      {quantidadeEstimada}
                    </strong>{' '}
                    lançamento
                    {quantidadeEstimada === 1
                      ? ''
                      : 's'}
                    {' '}
                    de{' '}
                    <strong>
                      {formatarValor(
                        Number(
                          form.valorPrevisto
                        ) || 0
                      )}
                    </strong>.
                  </p>

                  {quantidadeEstimada > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Total previsto:{' '}
                      <strong>
                        {formatarValor(
                          (
                            Number(
                              form.valorPrevisto
                            ) || 0
                          ) *
                            quantidadeEstimada
                        )}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================
             * OBSERVAÇÕES
             * ===================================================== */}
            <div className="mt-5">
              <Campo label="Observações">
                <textarea
                  rows={4}
                  value={
                    form.observacoes
                  }
                  onChange={(e) =>
                    alterarCampo(
                      'observacoes',
                      e.target.value
                    )
                  }
                  placeholder="Informações adicionais..."
                  className={`${inputClass} h-auto resize-none py-3`}
                />
              </Campo>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={
                fecharModal
              }
              disabled={
                salvando
              }
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                salvando
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {salvando
                ? 'Salvando...'
                : form.recorrente
                  ? `Gerar ${
                      quantidadeEstimada ||
                      ''
                    } lançamento${
                      quantidadeEstimada === 1
                        ? ''
                        : 's'
                    }`
                  : 'Salvar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
 * COMPONENTES
 * ============================================================
 */

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

/* ============================================================
 * DATAS
 * ============================================================
 */

function criarDataLocal(
  valor: string
): Date {
  const [
    ano,
    mes,
    dia,
  ] = valor
    .split('-')
    .map(Number);

  return new Date(
    ano,
    mes - 1,
    dia,
    12,
    0,
    0
  );
}

function avancarData(
  dataAtual: Date,
  periodicidade: PeriodicidadeProvisionamento
): Date {
  const proxima =
    new Date(
      dataAtual.getTime()
    );

  switch (
    periodicidade
  ) {
    case 'DIARIA':
      proxima.setDate(
        proxima.getDate() +
          1
      );
      break;

    case 'SEMANAL':
      proxima.setDate(
        proxima.getDate() +
          7
      );
      break;

    case 'MENSAL':
      proxima.setMonth(
        proxima.getMonth() +
          1
      );
      break;

    case 'ANUAL':
      proxima.setFullYear(
        proxima.getFullYear() +
          1
      );
      break;
  }

  return proxima;
}

/* ============================================================
 * FORMATADORES
 * ============================================================
 */

function formatarValor(
  valor: number
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(
    valor || 0
  );
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
