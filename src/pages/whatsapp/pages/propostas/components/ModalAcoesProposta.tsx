import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import type {
  PropostaDetalhada,
} from '../types/propostas';

import {
  obterAcoesProposta,
  type AcaoProposta,
  type AcaoPropostaDisponivel,
  type ContextoAcoesProposta,
} from '../services/propostaAcoes';

import {
  excluirProposta,
  marcarPropostaPerdida,
  reabrirProposta,
  reverterVendaProposta,
} from '../services/propostasService';

interface ModalAcoesPropostaProps {
  open: boolean;
  proposta: PropostaDetalhada;
  contexto: ContextoAcoesProposta;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}

type EtapaModal =
  | 'ACOES'
  | 'CONFIRMACAO';

interface ConfiguracaoAcao {
  titulo: string;
  descricao: string;
  confirmacaoTitulo: string;
  confirmacaoDescricao: string;
  confirmarTexto: string;
  sucesso: string;
  perigo: boolean;
}

const CONFIGURACOES_ACOES: Record<
  AcaoProposta,
  ConfiguracaoAcao
> = {
  EXCLUIR: {
    titulo: 'Excluir proposta',
    descricao:
      'Remove definitivamente esta proposta em negociação.',
    confirmacaoTitulo: 'Excluir proposta?',
    confirmacaoDescricao:
      'Esta ação excluirá definitivamente a proposta e seus itens. Ela não poderá ser recuperada.',
    confirmarTexto: 'Excluir proposta',
    sucesso: 'Proposta excluída com sucesso.',
    perigo: true,
  },

  MARCAR_PERDIDA: {
    titulo: 'Marcar como perdida',
    descricao:
      'Encerra a negociação sem contratação.',
    confirmacaoTitulo: 'Marcar proposta como perdida?',
    confirmacaoDescricao:
      'A proposta permanecerá no histórico e poderá ser reaberta posteriormente.',
    confirmarTexto: 'Marcar como perdida',
    sucesso: 'Proposta marcada como perdida.',
    perigo: false,
  },

  REABRIR: {
    titulo: 'Reabrir negociação',
    descricao:
      'Retorna esta proposta para o status Em negociação.',
    confirmacaoTitulo: 'Reabrir negociação?',
    confirmacaoDescricao:
      'A proposta voltará para Em negociação e seus itens ficarão novamente pendentes.',
    confirmarTexto: 'Reabrir negociação',
    sucesso: 'Negociação reaberta com sucesso.',
    perigo: false,
  },

  REVERTER_VENDA: {
    titulo: 'Reverter venda',
    descricao:
      'Desfaz uma venda cujo contrato ainda não foi emitido.',
    confirmacaoTitulo: 'Reverter esta venda?',
    confirmacaoDescricao:
      'Os contratos ainda não emitidos serão removidos e a proposta retornará para Em negociação. Nenhuma apólice emitida pode ser afetada por esta operação.',
    confirmarTexto: 'Reverter venda',
    sucesso: 'Venda revertida com sucesso.',
    perigo: true,
  },

  CANCELAR_CONTRATO: {
    titulo: 'Cancelar contrato',
    descricao:
      'Cancela um contrato já emitido preservando todo o histórico da venda.',
    confirmacaoTitulo: 'Cancelar contrato?',
    confirmacaoDescricao:
      'O cancelamento de contratos será implementado em uma etapa específica, incluindo seus futuros impactos financeiros.',
    confirmarTexto: 'Cancelar contrato',
    sucesso: 'Contrato cancelado.',
    perigo: true,
  },
};

function obterIconeAcao(
  acao: AcaoProposta,
) {
  switch (acao) {
    case 'EXCLUIR':
      return Trash2;

    case 'MARCAR_PERDIDA':
      return Ban;

    case 'REABRIR':
      return RefreshCcw;

    case 'REVERTER_VENDA':
      return RotateCcw;

    case 'CANCELAR_CONTRATO':
      return AlertTriangle;
  }
}

function obterStatusLabel(
  proposta: PropostaDetalhada,
): string {
  switch (proposta.status) {
    case 'EM_NEGOCIACAO':
      return 'Em negociação';

    case 'VENDIDA':
      return 'Vendida';

    case 'PERDIDA':
      return 'Perdida';

    case 'CANCELADA':
      return 'Cancelada';
  }
}

function obterContratoResumo(
  proposta: PropostaDetalhada,
): string | null {
  if (proposta.contratos.length === 0) {
    return null;
  }

  const possuiAtivo =
    proposta.contratos.some(
      contrato =>
        contrato.status === 'ATIVO',
    );

  if (possuiAtivo) {
    return 'Contrato ativo';
  }

  const possuiAguardando =
    proposta.contratos.some(
      contrato =>
        contrato.status ===
        'AGUARDANDO_EMISSAO',
    );

  if (possuiAguardando) {
    return 'Aguardando emissão';
  }

  const possuiCancelado =
    proposta.contratos.some(
      contrato =>
        contrato.status ===
        'CANCELADO',
    );

  if (possuiCancelado) {
    return 'Contrato cancelado';
  }

  const possuiEncerrado =
    proposta.contratos.some(
      contrato =>
        contrato.status ===
        'ENCERRADO',
    );

  if (possuiEncerrado) {
    return 'Contrato encerrado';
  }

  return null;
}

export function ModalAcoesProposta({
  open,
  proposta,
  contexto,
  onClose,
  onUpdated,
  onDeleted,
}: ModalAcoesPropostaProps) {
  const [etapa, setEtapa] =
    useState<EtapaModal>('ACOES');

  const [
    acaoSelecionada,
    setAcaoSelecionada,
  ] = useState<AcaoProposta | null>(
    null,
  );

  const [
    motivoPerda,
    setMotivoPerda,
  ] = useState('');

  const [
    executando,
    setExecutando,
  ] = useState(false);

  const acoes = useMemo(
    () =>
      obterAcoesProposta(
        proposta,
        contexto,
      ),
    [proposta, contexto],
  );

  const acoesPermitidas = useMemo(
    () =>
      acoes.filter(
        acao => acao.permitido,
      ),
    [acoes],
  );

  const cancelarContrato =
    acoes.find(
      acao =>
        acao.acao ===
        'CANCELAR_CONTRATO',
    );

  const contratoResumo =
    obterContratoResumo(proposta);

  const statusLabel =
    obterStatusLabel(proposta);

  const selecionarAcao = (
    acao: AcaoPropostaDisponivel,
  ) => {
    if (!acao.permitido) return;

    setAcaoSelecionada(acao.acao);
    setMotivoPerda('');
    setEtapa('CONFIRMACAO');
  };

  const voltarParaAcoes = () => {
    if (executando) return;

    setAcaoSelecionada(null);
    setMotivoPerda('');
    setEtapa('ACOES');
  };

  const fechar = () => {
    if (executando) return;

    setAcaoSelecionada(null);
    setMotivoPerda('');
    setEtapa('ACOES');
    onClose();
  };

  const executarAcao = async () => {
    if (
      !acaoSelecionada ||
      executando
    ) {
      return;
    }

    if (
      acaoSelecionada ===
        'MARCAR_PERDIDA' &&
      !motivoPerda.trim()
    ) {
      toast.error(
        'Informe o motivo da perda da proposta.',
      );
      return;
    }

    if (
      acaoSelecionada ===
      'CANCELAR_CONTRATO'
    ) {
      toast.info(
        'O cancelamento de contratos será implementado na próxima etapa.',
      );
      return;
    }

    try {
      setExecutando(true);

      switch (acaoSelecionada) {
        case 'EXCLUIR':
          await excluirProposta(
            proposta.id,
          );

          toast.success(
            CONFIGURACOES_ACOES.EXCLUIR
              .sucesso,
          );

          await onDeleted();
          return;

        case 'MARCAR_PERDIDA':
          await marcarPropostaPerdida(
            proposta.id,
            motivoPerda.trim(),
          );
          break;

        case 'REABRIR':
          await reabrirProposta(
            proposta.id,
          );
          break;

        case 'REVERTER_VENDA':
            await reverterVendaProposta(
                proposta.id,
            );
            break;
        }

      toast.success(
        CONFIGURACOES_ACOES[
          acaoSelecionada
        ].sucesso,
      );

      await onUpdated();

      setAcaoSelecionada(null);
      setMotivoPerda('');
      setEtapa('ACOES');
      onClose();
    } catch (error) {
      console.error(
        'Erro ao executar ação da proposta:',
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível executar a ação.',
      );
    } finally {
      setExecutando(false);
    }
  };

  if (!open) {
    return null;
  }

  const configuracaoSelecionada =
    acaoSelecionada
      ? CONFIGURACOES_ACOES[
          acaoSelecionada
        ]
      : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Proposta{' '}
              {proposta.numero_proposta}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {etapa === 'ACOES'
                ? 'Ações da proposta'
                : configuracaoSelecionada
                    ?.confirmacaoTitulo}
            </h2>
          </div>

          <button
            type="button"
            onClick={fechar}
            disabled={executando}
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {etapa === 'ACOES' ? (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {statusLabel}
                  </span>

                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {proposta.tipo_negocio ===
                    'RENOVACAO'
                      ? 'Renovação'
                      : 'Novo negócio'}
                  </span>

                  {contratoResumo && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {contratoResumo}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-5">
                {acoesPermitidas
                  .filter(
                    acao =>
                      acao.acao !==
                      'CANCELAR_CONTRATO',
                  )
                  .map(acao => {
                    const config =
                      CONFIGURACOES_ACOES[
                        acao.acao
                      ];

                    const Icon =
                      obterIconeAcao(
                        acao.acao,
                      );

                    return (
                      <button
                        key={acao.acao}
                        type="button"
                        onClick={() =>
                          selecionarAcao(
                            acao,
                          )
                        }
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                          config.perigo
                            ? 'border-red-200 bg-red-50/40 hover:border-red-300 hover:bg-red-50'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            config.perigo
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <Icon size={18} />
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold ${
                              config.perigo
                                ? 'text-red-700'
                                : 'text-slate-800'
                            }`}
                          >
                            {config.titulo}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {
                              config.descricao
                            }
                          </p>
                        </div>
                      </button>
                    );
                  })}

                {cancelarContrato?.permitido && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />

                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          Cancelamento de
                          contrato
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          Este contrato pode
                          ser cancelado pela
                          corretora, mas essa
                          operação será
                          implementada em uma
                          etapa específica
                          para contemplar os
                          impactos financeiros
                          e de comissão.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {acoesPermitidas.length ===
                  0 && (
                  <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center">
                    <CheckCircle2
                      size={28}
                      className="text-slate-300"
                    />

                    <p className="mt-3 text-sm font-medium text-slate-600">
                      Nenhuma ação disponível
                    </p>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                      O estado atual desta
                      proposta não permite
                      ações de gerenciamento.
                    </p>
                  </div>
                )}

                {acoesPermitidas.length ===
                  0 &&
                  cancelarContrato &&
                  !cancelarContrato.permitido &&
                  proposta.status ===
                    'VENDIDA' &&
                  contratoResumo ===
                    'Contrato ativo' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs leading-5 text-slate-500">
                        {
                          cancelarContrato.motivoBloqueio
                        }
                      </p>
                    </div>
                  )}
              </div>
            </>
          ) : (
            configuracaoSelecionada &&
            acaoSelecionada && (
              <div className="p-5">
                <button
                  type="button"
                  onClick={
                    voltarParaAcoes
                  }
                  disabled={executando}
                  className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>

                <div
                  className={`rounded-xl border p-4 ${
                    configuracaoSelecionada.perigo
                      ? 'border-red-200 bg-red-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={20}
                      className={`mt-0.5 shrink-0 ${
                        configuracaoSelecionada.perigo
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    />

                    <p
                      className={`text-sm leading-6 ${
                        configuracaoSelecionada.perigo
                          ? 'text-red-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {
                        configuracaoSelecionada.confirmacaoDescricao
                      }
                    </p>
                  </div>
                </div>

                {acaoSelecionada ===
                  'MARCAR_PERDIDA' && (
                  <div className="mt-5">
                    <label
                      htmlFor="motivo-perda-proposta"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Motivo da perda
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <textarea
                      id="motivo-perda-proposta"
                      autoFocus
                      value={motivoPerda}
                      onChange={event =>
                        setMotivoPerda(
                          event.target
                            .value,
                        )
                      }
                      disabled={executando}
                      rows={4}
                      placeholder="Informe por que esta negociação não foi concluída..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Essa informação ficará
                      registrada no histórico
                      da proposta.
                    </p>
                  </div>
                )}

                {acaoSelecionada ===
                  'REVERTER_VENDA' && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Resultado da reversão
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>
                        • A proposta retornará
                        para Em negociação.
                      </p>

                      <p>
                        • Os contratos ainda
                        aguardando emissão
                        serão removidos.
                      </p>

                      <p>
                        • Todos os itens
                        retornarão para
                        Pendente.
                      </p>

                      <p>
                        • A data e o valor da
                        venda serão removidos.
                      </p>
                    </div>
                  </div>
                )}

                {acaoSelecionada ===
                  'EXCLUIR' && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-700">
                      Exclusão definitiva
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-600">
                      A proposta e suas
                      cotações serão removidas
                      permanentemente. Esta
                      ação é permitida somente
                      porque ainda não existe
                      contrato vinculado.
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {etapa === 'CONFIRMACAO' &&
          configuracaoSelecionada &&
          acaoSelecionada && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={
                  voltarParaAcoes
                }
                disabled={executando}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void executarAcao()
                }
                disabled={
                  executando ||
                  (acaoSelecionada ===
                    'MARCAR_PERDIDA' &&
                    !motivoPerda.trim())
                }
                className={`inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  configuracaoSelecionada.perigo
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {executando && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                {
                  configuracaoSelecionada.confirmarTexto
                }
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

export default ModalAcoesProposta;