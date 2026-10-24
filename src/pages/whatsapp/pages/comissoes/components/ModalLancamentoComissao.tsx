import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Calculator,
  ChevronDown,
  ChevronUp,
  HandCoins,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import type {
  BasePercentualSplit,
  ComissaoContratoDetalhada,
  CriarComissaoPayload,
  DeducaoComissaoInput,
  ProvisaoPagamentoSplitInput,
  RecebimentoComissaoInput,
  SplitComissaoInput,
  TipoCalculoComissao,
  TipoParticipanteComissao,
} from "../types/comissoes";


import {
  BASES_PERCENTUAL_SPLIT,
  TIPOS_CALCULO_COMISSAO,
  TIPOS_PARTICIPANTE_COMISSAO,
} from "../types/comissoes";
import {
  adicionarMesesPreservandoDia,
  calcularComissao,
  calcularDistribuicaoComissao,
  calcularPercentualPagamentoSplit,
  calcularPercentualRecebimento,
  calcularValorPagamentoSplit,
  calcularValorRecebimento,
  formatarMoedaComissao,
  validarPagamentosSplit,
  validarRecebimentosComissao,
} from "../services/comissoesCalculos";

interface OpcaoUsuario {
  value: string;
  label: string;
}

interface ModalLancamentoComissaoProps {
  aberto: boolean;
  contratoId: string;
  valorBaseSugerido: number;
  dadosIniciais?: ComissaoContratoDetalhada | null;
  salvando?: boolean;
  corretores?: OpcaoUsuario[];
  supervisores?: OpcaoUsuario[];
  onFechar: () => void;
  onSalvar: (
    payload: CriarComissaoPayload
  ) => Promise<void> | void;
}

interface SplitForm extends SplitComissaoInput {
  id_local: string;
  expandido: boolean;
  pagamentos: ProvisaoPagamentoSplitInput[];
}

interface RecebimentoForm extends RecebimentoComissaoInput {
  id_local: string;
}

function gerarIdLocal(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function hojeISO(): string {
  const agora = new Date();

  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizarNumero(
  valor: string | number | null | undefined
): number {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

function criarSplitInicial(): SplitForm {
  return {
    id_local: gerarIdLocal(),
    expandido: true,
    tipo_participante: "CORRETOR",
    usuario_id: null,
    participante_nome: null,
    participante_documento: null,
    participante_metadata: {},
    tipo_calculo: "PERCENTUAL",
    base_percentual: "COMISSAO_BRUTA",
    percentual: null,
    valor_fixo: null,
    residual_corretora: false,
    ordem: 1,
    deducoes: [],
    pagamentos: [],
  };
}

function criarDeducao(): DeducaoComissaoInput {
  return {
    descricao: "",
    tipo_calculo: "PERCENTUAL",
    percentual: null,
    valor_fixo: null,
  };
}

function criarPagamento(
  valorBaseReferencia = 0,
  dataPrevista = hojeISO(),
  percentualPrevisto = 100
): ProvisaoPagamentoSplitInput {
  const base = Math.max(0, normalizarNumero(valorBaseReferencia));
  const percentual = Math.max(0, normalizarNumero(percentualPrevisto));

  return {
    data_prevista: dataPrevista,
    valor_base_referencia: base,
    percentual_previsto: percentual,
    valor_previsto: calcularValorPagamentoSplit(base, percentual),
    descricao: null,
  };
}

function criarRecebimentoInicial(
  valorBaseReferencia = 0,
  dataPrevista = hojeISO(),
  percentualPrevisto = 100
): RecebimentoForm {
  const base = Math.max(0, normalizarNumero(valorBaseReferencia));
  const percentual = Math.max(0, normalizarNumero(percentualPrevisto));

  return {
    id_local: gerarIdLocal(),
    data_prevista: dataPrevista,
    valor_base_referencia: base,
    percentual_previsto: percentual,
    valor_previsto: calcularValorRecebimento(base, percentual),
    descricao: null,
  };
}

function distribuirBaseEmParcelas(
  valorTotal: number,
  quantidade: number
): number[] {
  const quantidadeFinal = Math.max(1, Math.trunc(quantidade || 1));
  const totalCentavos = Math.round(
    Math.max(0, normalizarNumero(valorTotal)) * 100
  );
  const baseCentavos = Math.floor(totalCentavos / quantidadeFinal);
  const restoCentavos = totalCentavos - baseCentavos * quantidadeFinal;

  return Array.from(
    { length: quantidadeFinal },
    (_, indice) =>
      (baseCentavos + (indice < restoCentavos ? 1 : 0)) / 100
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400";

export function ModalLancamentoComissao({
  aberto,
  contratoId,
  valorBaseSugerido,
  dadosIniciais = null,
  salvando = false,
  corretores = [],
  supervisores = [],
  onFechar,
  onSalvar,
}: ModalLancamentoComissaoProps) {
  const [valorBaseOriginal, setValorBaseOriginal] =
    useState(valorBaseSugerido);

  const [recebimentos, setRecebimentos] =
    useState<RecebimentoForm[]>([criarRecebimentoInicial(valorBaseSugerido)]);

  const [observacoes, setObservacoes] =
    useState("");

  const [deducoes, setDeducoes] =
    useState<DeducaoComissaoInput[]>([]);

  const [splits, setSplits] =
    useState<SplitForm[]>([]);

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);

    if (!dadosIniciais) {
      setValorBaseOriginal(valorBaseSugerido);
      setRecebimentos([criarRecebimentoInicial(valorBaseSugerido)]);
      setObservacoes("");
      setDeducoes([]);
      setSplits([]);
      return;
    }

    const {
      comissao,
      deducoes: deducoesSalvas,
      recebimentos,
      splits: splitsSalvos,
      split_deducoes,
      pagamentos,
    } = dadosIniciais;

    const recebimentosOrdenados = [...recebimentos].sort(
      (a, b) =>
        a.numero_provisao - b.numero_provisao
    );

    setValorBaseOriginal(
      comissao.valor_base_original
    );

    setRecebimentos(
      recebimentosOrdenados.length
        ? recebimentosOrdenados.map((recebimento) => ({
            id_local: gerarIdLocal(),
            data_prevista: recebimento.data_prevista,
            valor_base_referencia: recebimento.valor_base_referencia,
            percentual_previsto: recebimento.percentual_previsto,
            valor_previsto: recebimento.valor_previsto,
            descricao: recebimento.descricao,
          }))
        : [criarRecebimentoInicial(comissao.valor_base_calculo)]
    );

    setObservacoes(
      comissao.observacoes ?? ""
    );

    setDeducoes(
      [...deducoesSalvas]
        .sort(
          (a, b) => a.ordem - b.ordem
        )
        .map((deducao) => ({
          descricao: deducao.descricao,
          tipo_calculo:
            deducao.tipo_calculo,
          percentual:
            deducao.percentual,
          valor_fixo:
            deducao.valor_fixo,
        }))
    );

    setSplits(
      [...splitsSalvos]
        .filter(
          (split) =>
            !split.residual_corretora &&
            split.tipo_participante !==
              "CORRETORA"
        )
        .sort(
          (a, b) => a.ordem - b.ordem
        )
        .map((split) => {
          const deducoesSplit =
            split_deducoes
              .filter(
                (deducao) =>
                  deducao.split_id === split.id
              )
              .sort(
                (a, b) =>
                  a.ordem - b.ordem
              )
              .map((deducao) => ({
                descricao:
                  deducao.descricao,
                tipo_calculo:
                  deducao.tipo_calculo,
                percentual:
                  deducao.percentual,
                valor_fixo:
                  deducao.valor_fixo,
              }));

          const pagamentosSplit =
            pagamentos
              .filter(
                (pagamento) =>
                  pagamento.split_id ===
                  split.id
              )
              .sort(
                (a, b) =>
                  a.numero_provisao -
                  b.numero_provisao
              )
              .map((pagamento) => {
                const baseReferencia = normalizarNumero(
                  pagamento.valor_base_referencia ?? split.valor_liquido_split
                );
                const valorPrevisto = normalizarNumero(pagamento.valor_previsto);
                const percentualPrevisto =
                  pagamento.percentual_previsto ??
                  calcularPercentualPagamentoSplit(baseReferencia, valorPrevisto);

                return {
                  data_prevista: pagamento.data_prevista,
                  valor_base_referencia: baseReferencia,
                  percentual_previsto: percentualPrevisto,
                  valor_previsto: valorPrevisto,
                  descricao: pagamento.descricao,
                };
              });

          return {
            id_local: gerarIdLocal(),
            expandido: true,
            tipo_participante:
              split.tipo_participante,
            usuario_id:
              split.usuario_id,
            participante_nome:
              split.participante_nome,
            participante_documento:
              split.participante_documento,
            participante_metadata:
              split.participante_metadata,
            tipo_calculo:
              split.tipo_calculo,
            base_percentual:
              split.base_percentual,
            percentual:
              split.percentual,
            valor_fixo:
              split.valor_fixo,
            residual_corretora: false,
            ordem:
              split.ordem,
            deducoes:
              deducoesSplit,
            pagamentos:
              pagamentosSplit,
          };
        })
    );
  }, [
    aberto,
    contratoId,
    valorBaseSugerido,
    dadosIniciais,
  ]);


  const calculoBase = useMemo(() => {
    try {
      return calcularComissao({
        valor_base_original:
          valorBaseOriginal,
        percentual_comissao: 0,
        valor_comissao_fixa: null,
        deducoes,
      });
    } catch {
      return null;
    }
  }, [
    valorBaseOriginal,
    deducoes,
  ]);

  const totaisRecebimentos = useMemo(() => {
    return recebimentos.reduce(
      (total, recebimento) => ({
        percentual: Number(
          (
            total.percentual +
            normalizarNumero(recebimento.percentual_previsto)
          ).toFixed(6)
        ),
        valor: Number(
          (
            total.valor +
            normalizarNumero(recebimento.valor_previsto)
          ).toFixed(2)
        ),
      }),
      { percentual: 0, valor: 0 }
    );
  }, [recebimentos]);

  const calculoComissao = useMemo(() => {
    if (!calculoBase) return null;

    return {
      ...calculoBase,
      tipo_calculo_comissao: "FIXO" as const,
      percentual_comissao: null,
      valor_comissao_fixa: totaisRecebimentos.valor,
      valor_comissao_bruta: totaisRecebimentos.valor,
    };
  }, [calculoBase, totaisRecebimentos.valor]);

  const distribuicao = useMemo(() => {
    if (!calculoComissao) return null;

    try {
      return calcularDistribuicaoComissao({
        valor_comissao_bruta:
          calculoComissao.valor_comissao_bruta,
        valor_base_calculo:
          calculoComissao.valor_base_calculo,
        splits,
      });
    } catch {
      return null;
    }
  }, [calculoComissao, splits]);

  const assinaturaLiquidosParticipantes = useMemo(
    () =>
      distribuicao?.splits
        .filter(
          (split) =>
            !split.residual_corretora && split.tipo_participante !== "CORRETORA"
        )
        .map((split) => `${split.ordem}:${split.valor_liquido_split}`)
        .join("|") ?? "",
    [distribuicao]
  );

  useEffect(() => {
    if (!distribuicao) return;

    setSplits((atuais) => {
      let alterou = false;
      const proximos = atuais.map((split) => {
        const calculado = distribuicao.splits.find(
          (item) => item.ordem === split.ordem && !item.residual_corretora
        );
        if (!calculado) return split;

        const valorLiquido = normalizarNumero(calculado.valor_liquido_split);
        if (valorLiquido <= 0) return split;

        if (!split.pagamentos.length) {
          alterou = true;
          return {
            ...split,
            pagamentos: [criarPagamento(valorLiquido, hojeISO(), 100)],
          };
        }

        const pagamentos = split.pagamentos.map((pagamento) => {
          const percentual = normalizarNumero(pagamento.percentual_previsto);
          const valorCalculado = calcularValorPagamentoSplit(
            valorLiquido,
            percentual
          );

          if (
            Math.abs(
              normalizarNumero(pagamento.valor_base_referencia) - valorLiquido
            ) <= 0.009 &&
            Math.abs(
              normalizarNumero(pagamento.valor_previsto) - valorCalculado
            ) <= 0.009
          ) {
            return pagamento;
          }

          alterou = true;
          return {
            ...pagamento,
            valor_base_referencia: valorLiquido,
            valor_previsto: valorCalculado,
          };
        });

        return { ...split, pagamentos };
      });

      return alterou ? proximos : atuais;
    });
  }, [assinaturaLiquidosParticipantes]);

  useEffect(() => {
    if (!calculoBase) return;

    setRecebimentos((atuais) => {
      if (!atuais.length) return atuais;

      const bases = distribuirBaseEmParcelas(
        calculoBase.valor_base_calculo,
        atuais.length
      );

      return atuais.map((item, index) => ({
        ...item,
        valor_base_referencia: bases[index],
        valor_previsto: calcularValorRecebimento(
          bases[index],
          item.percentual_previsto
        ),
      }));
    });
  }, [calculoBase?.valor_base_calculo, recebimentos.length]);

  function alterarQuantidadeRecebimentos(quantidade: number) {
    const quantidadeFinal = Math.max(1, Math.trunc(quantidade || 1));
    const baseTotal = calculoBase?.valor_base_calculo ?? valorBaseOriginal;
    const bases = distribuirBaseEmParcelas(baseTotal, quantidadeFinal);

    setRecebimentos((atuais) => {
      const dataInicial = atuais[0]?.data_prevista || hojeISO();
      const percentualPadrao = atuais[0]?.percentual_previsto ?? 100;

      return Array.from({ length: quantidadeFinal }, (_, index) => {
        const existente = atuais[index];
        const percentual = existente?.percentual_previsto ?? percentualPadrao;
        const dataPrevista =
          existente?.data_prevista ??
          adicionarMesesPreservandoDia(dataInicial, index);

        return {
          id_local: existente?.id_local ?? gerarIdLocal(),
          data_prevista: dataPrevista,
          valor_base_referencia: bases[index],
          percentual_previsto: percentual,
          valor_previsto: calcularValorRecebimento(
            bases[index],
            percentual
          ),
          descricao: existente?.descricao ?? null,
        };
      });
    });
  }

  function atualizarRecebimento(
    id: string,
    patch: Partial<RecebimentoForm>
  ) {
    setRecebimentos((atuais) =>
      atuais.map((item) =>
        item.id_local === id ? { ...item, ...patch } : item
      )
    );
  }

  function atualizarBaseRecebimento(id: string, base: number) {
    setRecebimentos((atuais) =>
      atuais.map((item) =>
        item.id_local === id
          ? {
              ...item,
              valor_base_referencia: base,
              valor_previsto: calcularValorRecebimento(
                base,
                item.percentual_previsto
              ),
            }
          : item
      )
    );
  }

  function atualizarPercentualRecebimento(id: string, percentual: number) {
    setRecebimentos((atuais) =>
      atuais.map((item) =>
        item.id_local === id
          ? {
              ...item,
              percentual_previsto: percentual,
              valor_previsto: calcularValorRecebimento(
                item.valor_base_referencia,
                percentual
              ),
            }
          : item
      )
    );
  }

  function atualizarValorRecebimento(id: string, valor: number) {
    setRecebimentos((atuais) =>
      atuais.map((item) =>
        item.id_local === id
          ? {
              ...item,
              valor_previsto: valor,
              percentual_previsto: calcularPercentualRecebimento(
                item.valor_base_referencia,
                valor
              ),
            }
          : item
      )
    );
  }

  const totaisMemoria = useMemo(() => {
    const splitsParticipantes =
      distribuicao?.splits.filter(
        (split) =>
          !split.residual_corretora &&
          split.tipo_participante !== "CORRETORA"
      ) ?? [];

    const valorBrutoParticipantes =
      splitsParticipantes.reduce(
        (total, split) => total + split.valor_bruto_split,
        0
      );

    const valorDeducoesParticipantes =
      splitsParticipantes.reduce(
        (total, split) => total + split.valor_deducoes,
        0
      );

    const valorLiquidoParticipantes =
      splitsParticipantes.reduce(
        (total, split) => total + split.valor_liquido_split,
        0
      );

    const valorPagamentosPlanejados =
      splits.reduce(
        (total, split) =>
          total +
          split.pagamentos.reduce(
            (subtotal, pagamento) =>
              subtotal + normalizarNumero(pagamento.valor_previsto),
            0
          ),
        0
      );

    return {
      valorBrutoParticipantes,
      valorDeducoesParticipantes,
      valorLiquidoParticipantes,
      valorPagamentosPlanejados,
    };
  }, [distribuicao, splits]);

  function atualizarDeducao(
    index: number,
    patch: Partial<DeducaoComissaoInput>
  ) {
    setDeducoes((atuais) =>
      atuais.map((item, i) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  function removerDeducao(index: number) {
    setDeducoes((atuais) =>
      atuais.filter(
        (_, i) => i !== index
      )
    );
  }

  function atualizarSplit(
    id: string,
    patch: Partial<SplitForm>
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === id
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  function removerSplit(id: string) {
    setSplits((atuais) =>
      atuais
        .filter(
          (item) =>
            item.id_local !== id
        )
        .map((item, index) => ({
          ...item,
          ordem: index + 1,
        }))
    );
  }

  function adicionarDeducaoSplit(
    id: string
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === id
          ? {
              ...item,
              deducoes: [
                ...(item.deducoes ?? []),
                criarDeducao(),
              ],
            }
          : item
      )
    );
  }

  function atualizarDeducaoSplit(
    splitId: string,
    index: number,
    patch: Partial<DeducaoComissaoInput>
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === splitId
          ? {
              ...item,
              deducoes:
                (
                  item.deducoes ?? []
                ).map((deducao, i) =>
                  i === index
                    ? {
                        ...deducao,
                        ...patch,
                      }
                    : deducao
                ),
            }
          : item
      )
    );
  }

  function removerDeducaoSplit(
    splitId: string,
    index: number
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === splitId
          ? {
              ...item,
              deducoes:
                (
                  item.deducoes ?? []
                ).filter(
                  (_, i) =>
                    i !== index
                ),
            }
          : item
      )
    );
  }

  function obterValorLiquidoSplit(split: SplitForm): number {
    return normalizarNumero(
      distribuicao?.splits.find(
        (item) => item.ordem === split.ordem && !item.residual_corretora
      )?.valor_liquido_split
    );
  }

  function alterarQuantidadePagamentosSplit(
    splitId: string,
    quantidade: number
  ) {
    const quantidadeFinal = Math.max(1, Math.trunc(quantidade || 1));

    setSplits((atuais) =>
      atuais.map((split) => {
        if (split.id_local !== splitId) return split;

        const valorLiquido = obterValorLiquidoSplit(split);
        if (valorLiquido <= 0) return split;

        const valores = distribuirBaseEmParcelas(
          valorLiquido,
          quantidadeFinal
        );
        const dataInicial = split.pagamentos[0]?.data_prevista || hojeISO();

        return {
          ...split,
          pagamentos: Array.from({ length: quantidadeFinal }, (_, index) => {
            const existente = split.pagamentos[index];
            const valorPrevisto = valores[index];
            const percentualPrevisto = calcularPercentualPagamentoSplit(
              valorLiquido,
              valorPrevisto
            );

            return {
              data_prevista:
                existente?.data_prevista ??
                adicionarMesesPreservandoDia(dataInicial, index),
              valor_base_referencia: valorLiquido,
              percentual_previsto: percentualPrevisto,
              valor_previsto: valorPrevisto,
              descricao: existente?.descricao ?? null,
            };
          }),
        };
      })
    );
  }

  function atualizarPagamentoSplit(
    splitId: string,
    index: number,
    patch: Partial<ProvisaoPagamentoSplitInput>
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === splitId
          ? {
              ...item,
              pagamentos: item.pagamentos.map((pagamento, i) =>
                i === index ? { ...pagamento, ...patch } : pagamento
              ),
            }
          : item
      )
    );
  }

  function atualizarPercentualPagamentoSplit(
    splitId: string,
    index: number,
    percentual: number
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === splitId
          ? {
              ...item,
              pagamentos: item.pagamentos.map((pagamento, i) =>
                i === index
                  ? {
                      ...pagamento,
                      percentual_previsto: percentual,
                      valor_previsto: calcularValorPagamentoSplit(
                        pagamento.valor_base_referencia,
                        percentual
                      ),
                    }
                  : pagamento
              ),
            }
          : item
      )
    );
  }

  function atualizarValorPagamentoSplit(
    splitId: string,
    index: number,
    valor: number
  ) {
    setSplits((atuais) =>
      atuais.map((item) =>
        item.id_local === splitId
          ? {
              ...item,
              pagamentos: item.pagamentos.map((pagamento, i) =>
                i === index
                  ? {
                      ...pagamento,
                      valor_previsto: valor,
                      percentual_previsto: calcularPercentualPagamentoSplit(
                        pagamento.valor_base_referencia,
                        valor
                      ),
                    }
                  : pagamento
              ),
            }
          : item
      )
    );
  }

  function obterNomeParticipanteInterno(
    tipo: TipoParticipanteComissao,
    usuarioId: string | null | undefined
  ): string | null {
    if (!usuarioId) return null;

    const opcoes =
      tipo === "CORRETOR"
        ? corretores
        : tipo === "SUPERVISOR"
          ? supervisores
          : [];

    return (
      opcoes.find((opcao) => opcao.value === usuarioId)?.label ??
      null
    );
  }

  function normalizarDeducaoPayload(
    deducao: DeducaoComissaoInput
  ): DeducaoComissaoInput {
    return {
      descricao: deducao.descricao.trim(),
      tipo_calculo: deducao.tipo_calculo,
      percentual:
        deducao.tipo_calculo === "PERCENTUAL"
          ? deducao.percentual ?? null
          : null,
      valor_fixo:
        deducao.tipo_calculo === "FIXO"
          ? deducao.valor_fixo ?? null
          : null,
    };
  }

  function normalizarSplitPayload(
    split: SplitForm,
    index: number
  ): SplitComissaoInput {
    const participanteInterno =
      split.tipo_participante === "CORRETOR" ||
      split.tipo_participante === "SUPERVISOR";

    const usuarioId = participanteInterno
      ? split.usuario_id ?? null
      : null;

    const nomeInterno = participanteInterno
      ? obterNomeParticipanteInterno(
          split.tipo_participante,
          usuarioId
        )
      : null;

    return {
      tipo_participante: split.tipo_participante,
      usuario_id: usuarioId,
      participante_nome: participanteInterno
        ? nomeInterno ?? split.participante_nome?.trim() ?? null
        : split.participante_nome?.trim() || null,
      participante_documento: participanteInterno
        ? null
        : split.participante_documento?.trim() || null,
      participante_metadata: participanteInterno
        ? {}
        : split.participante_metadata ?? {},
      tipo_calculo: split.tipo_calculo,
      base_percentual:
        split.tipo_calculo === "PERCENTUAL"
          ? split.base_percentual ?? "COMISSAO_BRUTA"
          : null,
      percentual:
        split.tipo_calculo === "PERCENTUAL"
          ? split.percentual ?? null
          : null,
      valor_fixo:
        split.tipo_calculo === "FIXO"
          ? split.valor_fixo ?? null
          : null,
      residual_corretora: false,
      ordem: index + 1,
      deducoes: (split.deducoes ?? []).map(
        normalizarDeducaoPayload
      ),
      pagamentos: split.pagamentos.map((pagamento) => ({
        data_prevista: pagamento.data_prevista,
        valor_base_referencia: normalizarNumero(
          pagamento.valor_base_referencia
        ),
        percentual_previsto: normalizarNumero(
          pagamento.percentual_previsto
        ),
        valor_previsto: normalizarNumero(pagamento.valor_previsto),
        descricao: pagamento.descricao?.trim() || null,
      })),
    };
  }

  function validar(): string | null {
    if (!contratoId) {
      return "Contrato não informado.";
    }

    if (valorBaseOriginal < 0) {
      return "A base original não pode ser negativa.";
    }

    if (!calculoBase) {
      return "Revise a base de cálculo da comissão.";
    }

    const errosRecebimentos = validarRecebimentosComissao({
      recebimentos,
    });

    if (errosRecebimentos.length) {
      return errosRecebimentos[0];
    }

    for (const deducao of deducoes) {
      if (!deducao.descricao.trim()) {
        return "Toda dedução deve possuir descrição.";
      }
    }

    for (const split of splits) {
      if (
        ["CORRETOR", "SUPERVISOR"].includes(
          split.tipo_participante
        ) &&
        !split.usuario_id
      ) {
        return "Selecione o usuário do participante interno.";
      }

      if (
        [
          "PARCEIRO",
          "INDICADOR",
          "OUTRO",
        ].includes(
          split.tipo_participante
        ) &&
        !split.participante_nome?.trim()
      ) {
        return "Informe o nome do participante externo.";
      }

      if (
        split.tipo_calculo ===
          "PERCENTUAL" &&
        (
          split.percentual === null ||
          split.percentual ===
            undefined ||
          split.percentual < 0
        )
      ) {
        return "Informe o percentual de todos os splits.";
      }

      if (
        split.tipo_calculo ===
          "FIXO" &&
        (
          split.valor_fixo === null ||
          split.valor_fixo ===
            undefined ||
          split.valor_fixo < 0
        )
      ) {
        return "Informe o valor fixo de todos os splits.";
      }

      for (const deducao of split.deducoes ?? []) {
        if (!deducao.descricao.trim()) {
          return "Toda dedução do participante deve possuir descrição.";
        }
      }

      const calculado = distribuicao?.splits.find(
        (item) => item.ordem === split.ordem
      );

      if (calculado) {
        const errosPagamentos = validarPagamentosSplit({
          valor_liquido_split: calculado.valor_liquido_split,
          pagamentos: split.pagamentos,
        });

        if (errosPagamentos.length) {
          return errosPagamentos[0];
        }
      }
    }

    if (!distribuicao) {
      return "Revise a distribuição da comissão.";
    }

    return null;
  }

  async function handleSalvar() {
    const erroValidacao = validar();

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro(null);

    const payload: CriarComissaoPayload = {
      contrato_id: contratoId,
      tipo_calculo_comissao: "FIXO",
      percentual_comissao: null,
      valor_comissao_fixa: totaisRecebimentos.valor,
      valor_base_original:
        valorBaseOriginal,
      recebimentos: recebimentos.map((recebimento) => ({
        data_prevista: recebimento.data_prevista,
        valor_base_referencia: normalizarNumero(recebimento.valor_base_referencia),
        percentual_previsto: normalizarNumero(recebimento.percentual_previsto),
        valor_previsto: normalizarNumero(recebimento.valor_previsto),
        descricao: recebimento.descricao?.trim() || null,
      })),
      observacoes:
        observacoes.trim() || null,
      deducoes: deducoes.map(normalizarDeducaoPayload),
      splits: splits.map(normalizarSplitPayload),
    };

    try {
      await onSalvar(payload);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a comissão."
      );
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm md:p-6">
      <div className="flex max-h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ReceiptText size={19} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Configurar comissão
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Cálculo, recebimentos, splits e pagamentos
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={salvando}
            onClick={onFechar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {erro && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm">{erro}</p>
              </div>
            )}

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-2">
                <Calculator size={17} />

                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Cálculo da comissão
                </h3>
              </div>

              {/* 1. VALOR DA VENDA */}
              <div>
                <label className={labelClass}>
                  Valor da venda
                </label>

                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorBaseOriginal}
                  onChange={(e) =>
                    setValorBaseOriginal(
                      normalizarNumero(
                        e.target.value
                      )
                    )
                  }
                  className={inputClass}
                />
              </div>

              {/* 2. DEDUÇÕES DA BASE */}
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Deduções da base
                    </p>

                    <p className="text-xs text-slate-500">
                      Valores deduzidos da venda antes da aplicação da comissão
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDeducoes(
                        (atuais) => [
                          ...atuais,
                          criarDeducao(),
                        ]
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <Plus size={15} />
                    Dedução
                  </button>
                </div>

                <div className="space-y-2">
                  {deducoes.map(
                    (
                      deducao,
                      index
                    ) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[2fr_1fr_1fr_auto] dark:border-slate-800"
                      >
                        <input
                          value={
                            deducao.descricao
                          }
                          onChange={(e) =>
                            atualizarDeducao(
                              index,
                              {
                                descricao:
                                  e.target.value,
                              }
                            )
                          }
                          placeholder="Descrição"
                          className={inputClass}
                        />

                        <select
                          value={
                            deducao.tipo_calculo
                          }
                          onChange={(e) =>
                            atualizarDeducao(
                              index,
                              {
                                tipo_calculo:
                                  e.target
                                    .value as TipoCalculoComissao,
                                percentual: null,
                                valor_fixo: null,
                              }
                            )
                          }
                          className={inputClass}
                        >
                          {TIPOS_CALCULO_COMISSAO.map(
                            (opcao) => (
                              <option
                                key={opcao.value}
                                value={opcao.value}
                              >
                                {opcao.label}
                              </option>
                            )
                          )}
                        </select>

                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={
                            deducao.tipo_calculo ===
                            "PERCENTUAL"
                              ? deducao.percentual ??
                                ""
                              : deducao.valor_fixo ??
                                ""
                          }
                          onChange={(e) =>
                            atualizarDeducao(
                              index,
                              deducao.tipo_calculo ===
                                "PERCENTUAL"
                                ? {
                                    percentual:
                                      e.target.value ===
                                      ""
                                        ? null
                                        : normalizarNumero(
                                            e.target
                                              .value
                                          ),
                                  }
                                : {
                                    valor_fixo:
                                      e.target.value ===
                                      ""
                                        ? null
                                        : normalizarNumero(
                                            e.target
                                              .value
                                          ),
                                  }
                            )
                          }
                          className={inputClass}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removerDeducao(
                              index
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )
                  )}

                  {deducoes.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
                      Nenhuma dedução aplicada à base.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. BASE DE CÁLCULO */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Base de cálculo
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Valor da venda menos as deduções
                    </p>
                  </div>

                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {formatarMoedaComissao(
                      calculoComissao
                        ?.valor_base_calculo ??
                        valorBaseOriginal
                    )}
                  </p>
                </div>
              </div>

              {/* 4. REGRA DOS RECEBIMENTOS */}
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Regra de comissão por recebimento
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  O percentual é definido em cada parcela e pode ser superior a 100%.
                  A comissão bruta será a soma dos valores calculados nas linhas abaixo.
                </p>
              </div>

              {/* 5. RESULTADO */}
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      Comissão bruta total
                    </p>
                    <p className="mt-0.5 text-xs text-blue-600/70 dark:text-blue-400/70">
                      Soma das comissões previstas nos recebimentos
                    </p>
                  </div>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {formatarMoedaComissao(totaisRecebimentos.valor)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={17} />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Recebimento da seguradora
                    </h3>
                    <p className="text-xs text-slate-500">
                      Seguradora → Corretora
                    </p>
                  </div>
                </div>

                <div className="w-40">
                  <label className={labelClass}>Quantidade de parcelas</label>
                  <input
                    type="number"
                    min={1}
                    value={recebimentos.length}
                    onChange={(e) =>
                      alterarQuantidadeRecebimentos(
                        Math.max(1, normalizarNumero(e.target.value))
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[70px_160px_170px_150px_170px_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    <span>Parcela</span>
                    <span>Data prevista</span>
                    <span>Base de referência</span>
                    <span>% comissão</span>
                    <span>Valor comissão</span>
                    <span>Descrição</span>
                  </div>

                  {recebimentos.map((recebimento, index) => (
                    <div
                      key={recebimento.id_local}
                      className="grid grid-cols-[70px_160px_170px_150px_170px_1fr] items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-900"
                    >
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {index + 1}
                      </span>

                      <input
                        type="date"
                        value={recebimento.data_prevista}
                        onChange={(e) =>
                          atualizarRecebimento(recebimento.id_local, {
                            data_prevista: e.target.value,
                          })
                        }
                        className={inputClass}
                      />

                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={recebimento.valor_base_referencia}
                        onChange={(e) =>
                          atualizarBaseRecebimento(
                            recebimento.id_local,
                            normalizarNumero(e.target.value)
                          )
                        }
                        className={inputClass}
                      />

                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={recebimento.percentual_previsto}
                          onChange={(e) =>
                            atualizarPercentualRecebimento(
                              recebimento.id_local,
                              normalizarNumero(e.target.value)
                            )
                          }
                          className={`${inputClass} pr-8`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          %
                        </span>
                      </div>

                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={recebimento.valor_previsto}
                        onChange={(e) =>
                          atualizarValorRecebimento(
                            recebimento.id_local,
                            normalizarNumero(e.target.value)
                          )
                        }
                        className={inputClass}
                      />

                      <input
                        value={recebimento.descricao ?? ""}
                        onChange={(e) =>
                          atualizarRecebimento(recebimento.id_local, {
                            descricao: e.target.value || null,
                          })
                        }
                        placeholder={`Recebimento ${index + 1}`}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
                <div className="flex gap-5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Total: <strong className="text-slate-800 dark:text-slate-200">{totaisRecebimentos.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}%</strong>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Valor: <strong className="text-slate-800 dark:text-slate-200">{formatarMoedaComissao(totaisRecebimentos.valor)}</strong>
                  </span>
                </div>

                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Comissão bruta calculada pelas parcelas: {formatarMoedaComissao(totaisRecebimentos.valor)}
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users size={17} />

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Distribuição
                    </h3>

                    <p className="text-xs text-slate-500">
                      Corretora → Participantes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSplits(
                      (
                        atuais
                      ) => [
                        ...atuais,
                        {
                          ...criarSplitInicial(),
                          ordem:
                            atuais.length +
                            1,
                        },
                      ]
                    )
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <Plus size={15} />
                  Participante
                </button>
              </div>

              <div className="space-y-3">
                {splits.map(
                  (
                    split,
                    splitIndex
                  ) => (
                    <div
                      key={
                        split.id_local
                      }
                      className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() =>
                            atualizarSplit(
                              split.id_local,
                              {
                                expandido:
                                  !split.expandido,
                              }
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          {split.expandido ? (
                            <ChevronUp
                              size={
                                16
                              }
                            />
                          ) : (
                            <ChevronDown
                              size={
                                16
                              }
                            />
                          )}

                          <span className="truncate text-sm font-medium">
                            Participante{" "}
                            {splitIndex +
                              1}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removerSplit(
                              split.id_local
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2
                            size={
                              15
                            }
                          />
                        </button>
                      </div>

                      {split.expandido && (
                        <div className="space-y-4 p-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <label
                                className={
                                  labelClass
                                }
                              >
                                Tipo
                              </label>

                              <select
                                value={
                                  split.tipo_participante
                                }
                                onChange={(
                                  e
                                ) => {
                                  const tipo =
                                    e
                                      .target
                                      .value as TipoParticipanteComissao;

                                  atualizarSplit(
                                    split.id_local,
                                    {
                                      tipo_participante: tipo,
                                      usuario_id: null,
                                      participante_nome: null,
                                      participante_documento: null,
                                      participante_metadata: {},
                                    }
                                  );
                                }}
                                className={
                                  inputClass
                                }
                              >
                                {TIPOS_PARTICIPANTE_COMISSAO.filter(
                                  (
                                    opcao
                                  ) =>
                                    opcao.value !==
                                    "CORRETORA"
                                ).map(
                                  (
                                    opcao
                                  ) => (
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

                            {split.tipo_participante ===
                              "CORRETOR" ||
                            split.tipo_participante ===
                              "SUPERVISOR" ? (
                              <div>
                                <label
                                  className={
                                    labelClass
                                  }
                                >
                                  Usuário
                                </label>

                                <select
                                  value={
                                    split.usuario_id ??
                                    ""
                                  }
                                  onChange={(e) => {
                                    const usuarioId =
                                      e.target.value || null;

                                    const opcoes =
                                      split.tipo_participante === "CORRETOR"
                                        ? corretores
                                        : supervisores;

                                    const participanteNome = usuarioId
                                      ? opcoes.find(
                                          (opcao) => opcao.value === usuarioId
                                        )?.label ?? null
                                      : null;

                                    atualizarSplit(
                                      split.id_local,
                                      {
                                        usuario_id: usuarioId,
                                        participante_nome: participanteNome,
                                        participante_documento: null,
                                        participante_metadata: {},
                                      }
                                    );
                                  }}
                                  className={
                                    inputClass
                                  }
                                >
                                  <option value="">
                                    Selecione
                                  </option>

                                  {(split.tipo_participante ===
                                  "CORRETOR"
                                    ? corretores
                                    : supervisores
                                  ).map(
                                    (
                                      opcao
                                    ) => (
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
                            ) : (
                              <div>
                                <label
                                  className={
                                    labelClass
                                  }
                                >
                                  Nome
                                </label>

                                <input
                                  value={
                                    split.participante_nome ??
                                    ""
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    atualizarSplit(
                                      split.id_local,
                                      {
                                        participante_nome:
                                          e
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </div>
                            )}

                            <div>
                              <label
                                className={
                                  labelClass
                                }
                              >
                                Cálculo
                              </label>

                              <select
                                value={
                                  split.tipo_calculo
                                }
                                onChange={(
                                  e
                                ) =>
                                  atualizarSplit(
                                    split.id_local,
                                    {
                                      tipo_calculo:
                                        e
                                          .target
                                          .value as TipoCalculoComissao,
                                      percentual:
                                        null,
                                      valor_fixo:
                                        null,
                                    }
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                {TIPOS_CALCULO_COMISSAO.map(
                                  (
                                    opcao
                                  ) => (
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

                            {split.tipo_calculo ===
                            "PERCENTUAL" ? (
                              <>
                                <div>
                                  <label
                                    className={
                                      labelClass
                                    }
                                  >
                                    Base %
                                  </label>

                                  <select
                                    value={
                                      split.base_percentual ??
                                      "COMISSAO_BRUTA"
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      atualizarSplit(
                                        split.id_local,
                                        {
                                          base_percentual:
                                            e
                                              .target
                                              .value as BasePercentualSplit,
                                        }
                                      )
                                    }
                                    className={
                                      inputClass
                                    }
                                  >
                                    {BASES_PERCENTUAL_SPLIT.map(
                                      (
                                        opcao
                                      ) => (
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
                                  <label
                                    className={
                                      labelClass
                                    }
                                  >
                                    Percentual
                                  </label>

                                  <input
                                    type="number"
                                    min={
                                      0
                                    }
                                    step="0.0001"
                                    value={
                                      split.percentual ??
                                      ""
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      atualizarSplit(
                                        split.id_local,
                                        {
                                          percentual:
                                            e
                                              .target
                                              .value ===
                                            ""
                                              ? null
                                              : normalizarNumero(
                                                  e
                                                    .target
                                                    .value
                                                ),
                                        }
                                      )
                                    }
                                    className={
                                      inputClass
                                    }
                                  />
                                </div>
                              </>
                            ) : (
                              <div>
                                <label
                                  className={
                                    labelClass
                                  }
                                >
                                  Valor fixo
                                </label>

                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={
                                    split.valor_fixo ??
                                    ""
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    atualizarSplit(
                                      split.id_local,
                                      {
                                        valor_fixo:
                                          e
                                            .target
                                            .value ===
                                          ""
                                            ? null
                                            : normalizarNumero(
                                                e
                                                  .target
                                                  .value
                                              ),
                                      }
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Deduções do participante
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  adicionarDeducaoSplit(
                                    split.id_local
                                  )
                                }
                                className="text-xs font-medium text-blue-600 hover:underline"
                              >
                                + Adicionar
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(
                                split.deducoes ??
                                []
                              ).map(
                                (
                                  deducao,
                                  index
                                ) => (
                                  <div
                                    key={
                                      index
                                    }
                                    className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_auto]"
                                  >
                                    <input
                                      placeholder="Descrição"
                                      value={
                                        deducao.descricao
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        atualizarDeducaoSplit(
                                          split.id_local,
                                          index,
                                          {
                                            descricao:
                                              e
                                                .target
                                                .value,
                                          }
                                        )
                                      }
                                      className={
                                        inputClass
                                      }
                                    />

                                    <select
                                      value={
                                        deducao.tipo_calculo
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        atualizarDeducaoSplit(
                                          split.id_local,
                                          index,
                                          {
                                            tipo_calculo:
                                              e
                                                .target
                                                .value as TipoCalculoComissao,
                                            percentual:
                                              null,
                                            valor_fixo:
                                              null,
                                          }
                                        )
                                      }
                                      className={
                                        inputClass
                                      }
                                    >
                                      {TIPOS_CALCULO_COMISSAO.map(
                                        (
                                          opcao
                                        ) => (
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

                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={
                                        deducao.tipo_calculo ===
                                        "PERCENTUAL"
                                          ? deducao.percentual ??
                                            ""
                                          : deducao.valor_fixo ??
                                            ""
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        atualizarDeducaoSplit(
                                          split.id_local,
                                          index,
                                          deducao.tipo_calculo ===
                                            "PERCENTUAL"
                                            ? {
                                                percentual:
                                                  e
                                                    .target
                                                    .value ===
                                                  ""
                                                    ? null
                                                    : normalizarNumero(
                                                        e
                                                          .target
                                                          .value
                                                      ),
                                              }
                                            : {
                                                valor_fixo:
                                                  e
                                                    .target
                                                    .value ===
                                                  ""
                                                    ? null
                                                    : normalizarNumero(
                                                        e
                                                          .target
                                                          .value
                                                      ),
                                              }
                                        )
                                      }
                                      className={
                                        inputClass
                                      }
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removerDeducaoSplit(
                                          split.id_local,
                                          index
                                        )
                                      }
                                      className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400"
                                    >
                                      <Trash2
                                        size={
                                          14
                                        }
                                      />
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Pagamentos do participante
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  Base de cada parcela = líquido do participante
                                </p>
                              </div>

                              <div className="w-40">
                                <label className={labelClass}>Quantidade de parcelas</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={Math.max(1, split.pagamentos.length)}
                                  disabled={obterValorLiquidoSplit(split) <= 0}
                                  onChange={(e) =>
                                    alterarQuantidadePagamentosSplit(
                                      split.id_local,
                                      Math.max(1, normalizarNumero(e.target.value))
                                    )
                                  }
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                              <div className="min-w-[920px]">
                                <div className="grid grid-cols-[70px_160px_170px_150px_170px_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                  <span>Parcela</span>
                                  <span>Data prevista</span>
                                  <span>Base de referência</span>
                                  <span>% pagamento</span>
                                  <span>Valor pagamento</span>
                                  <span>Descrição</span>
                                </div>

                                {split.pagamentos.map((pagamento, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-[70px_160px_170px_150px_170px_1fr] items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-900"
                                  >
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                      {index + 1}
                                    </span>

                                    <input
                                      type="date"
                                      value={pagamento.data_prevista}
                                      onChange={(e) =>
                                        atualizarPagamentoSplit(
                                          split.id_local,
                                          index,
                                          { data_prevista: e.target.value }
                                        )
                                      }
                                      className={inputClass}
                                    />

                                    <input
                                      type="number"
                                      value={pagamento.valor_base_referencia}
                                      readOnly
                                      className={`${inputClass} bg-slate-50 dark:bg-slate-900`}
                                    />

                                    <div className="relative">
                                      <input
                                        type="number"
                                        min={0}
                                        step="0.000001"
                                        value={pagamento.percentual_previsto}
                                        onChange={(e) =>
                                          atualizarPercentualPagamentoSplit(
                                            split.id_local,
                                            index,
                                            normalizarNumero(e.target.value)
                                          )
                                        }
                                        className={`${inputClass} pr-8`}
                                      />
                                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                        %
                                      </span>
                                    </div>

                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={pagamento.valor_previsto}
                                      onChange={(e) =>
                                        atualizarValorPagamentoSplit(
                                          split.id_local,
                                          index,
                                          normalizarNumero(e.target.value)
                                        )
                                      }
                                      className={inputClass}
                                    />

                                    <input
                                      placeholder={`Pagamento ${index + 1}`}
                                      value={pagamento.descricao ?? ""}
                                      onChange={(e) =>
                                        atualizarPagamentoSplit(
                                          split.id_local,
                                          index,
                                          { descricao: e.target.value || null }
                                        )
                                      }
                                      className={inputClass}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex gap-5">
                                <span className="text-slate-500 dark:text-slate-400">
                                  Total: <strong className="text-slate-800 dark:text-slate-200">
                                    {split.pagamentos.reduce(
                                      (total, pagamento) =>
                                        total + normalizarNumero(pagamento.percentual_previsto),
                                      0
                                    ).toLocaleString("pt-BR", { maximumFractionDigits: 6 })}%
                                  </strong>
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  Valor: <strong className="text-slate-800 dark:text-slate-200">
                                    {formatarMoedaComissao(
                                      split.pagamentos.reduce(
                                        (total, pagamento) =>
                                          total + normalizarNumero(pagamento.valor_previsto),
                                        0
                                      )
                                    )}
                                  </strong>
                                </span>
                              </div>

                              <span
                                className={
                                  Math.abs(
                                    split.pagamentos.reduce(
                                      (total, pagamento) =>
                                        total + normalizarNumero(pagamento.valor_previsto),
                                      0
                                    ) - obterValorLiquidoSplit(split)
                                  ) <= 0.009
                                    ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                                    : "text-xs font-medium text-amber-600 dark:text-amber-400"
                                }
                              >
                                {Math.abs(
                                  split.pagamentos.reduce(
                                    (total, pagamento) =>
                                      total + normalizarNumero(pagamento.valor_previsto),
                                    0
                                  ) - obterValorLiquidoSplit(split)
                                ) <= 0.009
                                  ? `Pagamentos fecham o líquido: ${formatarMoedaComissao(
                                      obterValorLiquidoSplit(split)
                                    )}`
                                  : `Os pagamentos devem totalizar ${formatarMoedaComissao(
                                      obterValorLiquidoSplit(split)
                                    )}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}

                {splits.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
                    Nenhum participante adicionado.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <label className={labelClass}>
                Observações
              </label>

              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) =>
                  setObservacoes(
                    e.target.value
                  )
                }
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </section>
            </div>

            <aside className="xl:sticky xl:top-0">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2">
                    <Calculator size={17} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Memória de cálculo
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Prévia em tempo real do lançamento
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[calc(94vh-190px)] overflow-y-auto">
                  <div className="space-y-5 p-4">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <ReceiptText size={15} className="text-slate-500" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Formação da comissão
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">Base original</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {formatarMoedaComissao(valorBaseOriginal)}
                          </span>
                        </div>

                        {calculoBase?.deducoes.map(
                          (deducao, index) => (
                          <div
                            key={`${deducao.descricao}-${index}`}
                            className="flex items-start justify-between gap-3 pl-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-slate-500 dark:text-slate-400">
                                − {deducao.descricao || "Dedução"}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {deducao.tipo_calculo === "PERCENTUAL"
                                  ? `${deducao.percentual ?? 0}%`
                                  : "Valor fixo"}
                              </p>
                            </div>
                            <span className="shrink-0 font-medium text-red-600 dark:text-red-400">
                              − {formatarMoedaComissao(deducao.valor_calculado)}
                            </span>
                          </div>
                        ))}

                        <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-2 dark:border-slate-800">
                          <span className="font-medium text-slate-600 dark:text-slate-300">Base de cálculo</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatarMoedaComissao(
                              calculoBase
                                ?.valor_base_calculo ??
                                valorBaseOriginal
                            )}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Regra de comissão</p>
                            <p className="text-[11px] text-slate-400">
                              Percentuais definidos por recebimento
                            </p>
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {formatarMoedaComissao(calculoComissao?.valor_comissao_bruta ?? 0)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 px-3 py-2.5 dark:bg-blue-950/30">
                          <span className="font-semibold text-blue-700 dark:text-blue-300">Comissão bruta</span>
                          <span className="text-base font-bold text-blue-700 dark:text-blue-300">
                            {formatarMoedaComissao(calculoComissao?.valor_comissao_bruta ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="mb-3 flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-500" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Seguradora → Corretora
                        </p>
                      </div>

                      {recebimentos.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Preencha os dados da comissão para visualizar as provisões.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {recebimentos.map((provisao, index) => (
                            <div
                              key={provisao.id_local}
                              className="flex items-start justify-between gap-3"
                            >
                              <div>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                  {provisao.descricao || `Recebimento ${index + 1}`}
                                </p>
                                <p className="text-[11px] text-slate-400">{provisao.data_prevista}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] text-slate-400">
                                  Base {formatarMoedaComissao(provisao.valor_base_referencia)} · {provisao.percentual_previsto.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}%
                                </p>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {formatarMoedaComissao(provisao.valor_previsto)}
                                </span>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 dark:border-slate-800">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total a receber</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatarMoedaComissao(
                                recebimentos.reduce(
                                  (total, provisao) => total + provisao.valor_previsto,
                                  0
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="mb-3 flex items-center gap-2">
                        <Users size={15} className="text-slate-500" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Corretora → Participantes
                        </p>
                      </div>

                      {!distribuicao || splits.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum participante adicionado.</p>
                      ) : (
                        <div className="space-y-4">
                          {distribuicao.splits
                            .filter(
                              (split) =>
                                !split.residual_corretora &&
                                split.tipo_participante !== "CORRETORA"
                            )
                            .map((splitCalculado) => {
                              const splitForm = splits.find(
                                (item) => item.ordem === splitCalculado.ordem
                              );

                              const nomeInterno = splitForm
                                ? obterNomeParticipanteInterno(
                                    splitForm.tipo_participante,
                                    splitForm.usuario_id
                                  )
                                : null;

                              const nome =
                                nomeInterno ||
                                splitForm?.participante_nome ||
                                `Participante ${splitCalculado.ordem}`;

                              const pagamentosPlanejados =
                                splitForm?.pagamentos.reduce(
                                  (total, pagamento) =>
                                    total + normalizarNumero(pagamento.valor_previsto),
                                  0
                                ) ?? 0;

                              const diferencaPagamento =
                                splitCalculado.valor_liquido_split - pagamentosPlanejados;

                              return (
                                <div
                                  key={splitCalculado.ordem}
                                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {nome}
                                      </p>
                                      <p className="text-[11px] text-slate-400">
                                        {splitCalculado.tipo_participante}
                                      </p>
                                    </div>
                                    <HandCoins size={15} className="shrink-0 text-slate-400" />
                                  </div>

                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between gap-3">
                                      <span className="text-slate-500">Valor bruto</span>
                                      <span className="font-medium">
                                        {formatarMoedaComissao(splitCalculado.valor_bruto_split)}
                                      </span>
                                    </div>

                                    {splitCalculado.deducoes_calculadas.map((deducao, index) => (
                                      <div
                                        key={`${deducao.descricao}-${index}`}
                                        className="flex justify-between gap-3 pl-2"
                                      >
                                        <span className="truncate text-slate-400">
                                          − {deducao.descricao || "Dedução"}
                                        </span>
                                        <span className="shrink-0 text-red-600 dark:text-red-400">
                                          − {formatarMoedaComissao(deducao.valor_calculado)}
                                        </span>
                                      </div>
                                    ))}

                                    <div className="flex justify-between gap-3 border-t border-dashed border-slate-200 pt-1.5 dark:border-slate-800">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">Líquido</span>
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {formatarMoedaComissao(splitCalculado.valor_liquido_split)}
                                      </span>
                                    </div>

                                    <div className="flex justify-between gap-3">
                                      <span className="text-slate-500">Pagamentos planejados</span>
                                      <span
                                        className={
                                          Math.abs(diferencaPagamento) <= 0.009
                                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                                            : "font-medium text-amber-600 dark:text-amber-400"
                                        }
                                      >
                                        {formatarMoedaComissao(pagamentosPlanejados)}
                                      </span>
                                    </div>

                                    {Math.abs(diferencaPagamento) > 0.009 && (
                                      <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-4 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                        {diferencaPagamento > 0 ? "Falta provisionar " : "Provisionamento excede em "}
                                        {formatarMoedaComissao(Math.abs(diferencaPagamento))}.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="mb-3 flex items-center gap-2">
                        <WalletCards size={15} className="text-slate-500" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Fechamento
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Comissão bruta</span>
                          <span className="font-medium">
                            {formatarMoedaComissao(calculoComissao?.valor_comissao_bruta ?? 0)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Bruto participantes</span>
                          <span className="font-medium">
                            {formatarMoedaComissao(totaisMemoria.valorBrutoParticipantes)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Deduções participantes</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            − {formatarMoedaComissao(totaisMemoria.valorDeducoesParticipantes)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Líquido participantes</span>
                          <span className="font-medium">
                            {formatarMoedaComissao(totaisMemoria.valorLiquidoParticipantes)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Pagamentos provisionados</span>
                          <span
                            className={
                              Math.abs(
                                totaisMemoria.valorPagamentosPlanejados -
                                  totaisMemoria.valorLiquidoParticipantes
                              ) <= 0.009
                                ? "font-medium text-emerald-600 dark:text-emerald-400"
                                : "font-medium text-amber-600 dark:text-amber-400"
                            }
                          >
                            {formatarMoedaComissao(totaisMemoria.valorPagamentosPlanejados)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-2 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Residual corretora</span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {formatarMoedaComissao(distribuicao?.valor_residual_corretora ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs text-slate-500">
            O banco recalculará e validará todos os valores ao salvar.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={onFechar}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={salvando}
              onClick={() => {
                void handleSalvar();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando && (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              )}

              Salvar comissão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
