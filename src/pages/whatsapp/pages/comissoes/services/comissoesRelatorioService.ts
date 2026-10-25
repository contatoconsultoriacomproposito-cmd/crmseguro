import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type {
  ComissaoContratoDetalhada,
  ComissaoSplit,
  FiltrosComissoes,
  ItemComissaoGeral,
  ResumoComissoesGeral,
} from "../types/comissoes";

import {
  buscarComissaoContratoDetalhada,
  buscarComissoesGeral,
} from "./comissoesService";

export interface ItemRelatorioComissoes {
  item: ItemComissaoGeral;
  detalhe: ComissaoContratoDetalhada | null;
}

export interface DadosRelatorioComissoes {
  filtros: FiltrosComissoes;
  resumo: ResumoComissoesGeral;
  total: number;
  itens: ItemRelatorioComissoes[];
  geradoEm: string;
}

export interface OpcoesPdfRelatorioComissoes {
  titulo?: string;
  subtitulo?: string;
  filtrosDescricao?: string[];
  participanteNome?: string | null;
  nomeArquivo?: string;
}

function formatarMoeda(valor?: number | null): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor?: string | null): string {
  if (!valor) return "-";

  const dataPura = valor.slice(0, 10);
  const partes = dataPura.split("-");

  if (partes.length !== 3) {
    return valor;
  }

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function formatarPercentual(valor?: number | null): string {
  if (valor == null) return "-";

  return `${Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })}%`;
}

function formatarTipoCalculo(
  tipo?: string | null,
  percentual?: number | null,
  valorFixo?: number | null
): string {
  if (tipo === "PERCENTUAL") {
    return `${formatarPercentual(percentual)}`;
  }

  if (tipo === "FIXO") {
    return `Fixo ${formatarMoeda(valorFixo)}`;
  }

  return "-";
}

function limparFiltrosTecnicos(
  filtros: FiltrosComissoes
): FiltrosComissoes {
  const {
    pagina: _pagina,
    limite: _limite,
    ...restante
  } = filtros;

  return restante;
}

async function buscarTodasComissoesFiltradas(
  filtros: FiltrosComissoes
): Promise<{
  itens: ItemComissaoGeral[];
  resumo: ResumoComissoesGeral;
  total: number;
}> {
  const filtrosBase =
    limparFiltrosTecnicos(filtros);

  const primeiraPagina =
    await buscarComissoesGeral({
      ...filtrosBase,
      pagina: 1,
      limite: 100,
    });

  if (
    primeiraPagina.total_paginas <= 1
  ) {
    return {
      itens: primeiraPagina.itens,
      resumo: primeiraPagina.resumo,
      total: primeiraPagina.total,
    };
  }

  const itens = [
    ...primeiraPagina.itens,
  ];

  for (
    let pagina = 2;
    pagina <= primeiraPagina.total_paginas;
    pagina += 1
  ) {
    const resultado =
      await buscarComissoesGeral({
        ...filtrosBase,
        pagina,
        limite: 100,
      });

    itens.push(...resultado.itens);
  }

  const unicos = Array.from(
    new Map(
      itens.map((item) => [
        item.comissao.id,
        item,
      ])
    ).values()
  );

  return {
    itens: unicos,
    resumo: primeiraPagina.resumo,
    total: primeiraPagina.total,
  };
}

function referenciaParticipanteSplit(
  split: ComissaoSplit
): string | null {
  if (split.usuario_id) {
    return `usuario:${split.usuario_id}`;
  }

  const nome = split.participante_nome?.trim();
  if (!nome) return null;

  return `nome:${split.tipo_participante}:${encodeURIComponent(nome)}`;
}

function filtrarDetalheParticipante(
  detalhe: ComissaoContratoDetalhada | null,
  filtros: FiltrosComissoes
): ComissaoContratoDetalhada | null {
  if (!detalhe) return null;

  if (!filtros.tipo_participante && !filtros.participante_id) {
    return detalhe;
  }

  const splits = detalhe.splits.filter((split) => {
    if (
      filtros.tipo_participante &&
      split.tipo_participante !== filtros.tipo_participante
    ) {
      return false;
    }

    if (
      filtros.participante_id &&
      referenciaParticipanteSplit(split) !== filtros.participante_id
    ) {
      return false;
    }

    return true;
  });

  const idsSplits = new Set(splits.map((split) => split.id));

  return {
    ...detalhe,
    splits,
    split_deducoes: detalhe.split_deducoes.filter((deducao) =>
      idsSplits.has(deducao.split_id)
    ),
    pagamentos: detalhe.pagamentos.filter((pagamento) =>
      idsSplits.has(pagamento.split_id)
    ),
  };
}

async function buscarDetalhesEmLotes(
  itens: ItemComissaoGeral[],
  filtros: FiltrosComissoes,
  tamanhoLote = 8
): Promise<ItemRelatorioComissoes[]> {
  const resultado: ItemRelatorioComissoes[] = [];

  for (
    let inicio = 0;
    inicio < itens.length;
    inicio += tamanhoLote
  ) {
    const lote = itens.slice(
      inicio,
      inicio + tamanhoLote
    );

    const detalhes = await Promise.all(
      lote.map(async (item) => {
        const detalhe =
          await buscarComissaoContratoDetalhada(
            item.contrato.id,
            false
          );

        return {
          item,
          detalhe: filtrarDetalheParticipante(
            detalhe,
            filtros
          ),
        };
      })
    );

    resultado.push(...detalhes);
  }

  return resultado;
}

export async function buscarDadosRelatorioComissoes(
  filtros: FiltrosComissoes = {}
): Promise<DadosRelatorioComissoes> {
  const {
    itens,
    resumo,
    total,
  } =
    await buscarTodasComissoesFiltradas(
      filtros
    );

  const itensOrdenados = [...itens].sort(
    (a, b) => {
      const dataA =
        a.contrato.data_venda ?? "";
      const dataB =
        b.contrato.data_venda ?? "";

      if (dataA !== dataB) {
        return dataA.localeCompare(dataB);
      }

      return (
        a.cliente?.nome ?? ""
      ).localeCompare(
        b.cliente?.nome ?? "",
        "pt-BR"
      );
    }
  );

  const itensDetalhados =
    await buscarDetalhesEmLotes(
      itensOrdenados,
      filtros
    );

  return {
    filtros:
      limparFiltrosTecnicos(filtros),
    resumo,
    total,
    itens: itensDetalhados,
    geradoEm: new Date().toISOString(),
  };
}

function garantirEspaco(
  doc: jsPDF,
  y: number,
  alturaNecessaria: number
): number {
  const alturaPagina =
    doc.internal.pageSize.getHeight();

  if (
    y + alturaNecessaria >
    alturaPagina - 18
  ) {
    doc.addPage();
    return 20;
  }

  return y;
}

function obterYFinalTabela(
  doc: jsPDF,
  fallbackY: number
): number {
  const lastAutoTable = (
    doc as jsPDF & {
      lastAutoTable?: {
        finalY?: number;
      };
    }
  ).lastAutoTable;

  return (
    lastAutoTable?.finalY ??
    fallbackY
  );
}

function adicionarRodapePaginas(
  doc: jsPDF
) {
  const totalPaginas =
    doc.getNumberOfPages();

  for (
    let pagina = 1;
    pagina <= totalPaginas;
    pagina += 1
  ) {
    doc.setPage(pagina);

    const largura =
      doc.internal.pageSize.getWidth();
    const altura =
      doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(
      14,
      altura - 12,
      largura - 14,
      altura - 12
    );

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    doc.text(
      "SeguroCRM - Relatório de Comissões",
      14,
      altura - 7
    );

    doc.text(
      `Página ${pagina} de ${totalPaginas}`,
      largura - 14,
      altura - 7,
      {
        align: "right",
      }
    );
  }
}

export function gerarPdfRelatorioComissoes(
  dados: DadosRelatorioComissoes,
  opcoes: OpcoesPdfRelatorioComissoes = {}
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const larguraPagina =
    doc.internal.pageSize.getWidth();

  const titulo =
    opcoes.titulo ??
    "Relatório Detalhado de Comissões";

  const subtitulo =
    opcoes.subtitulo ??
    "Consolidação financeira por venda";

  doc.setFillColor(15, 23, 42);
  doc.rect(
    0,
    0,
    larguraPagina,
    34,
    "F"
  );

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(
    "helvetica",
    "bold"
  );
  doc.text(
    "SeguroCRM",
    14,
    13
  );

  doc.setFontSize(14);
  doc.text(
    titulo,
    14,
    22
  );

  doc.setFontSize(9);
  doc.setFont(
    "helvetica",
    "normal"
  );
  doc.setTextColor(203, 213, 225);
  doc.text(
    subtitulo,
    14,
    28
  );

  let y = 43;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);

  const periodoInicio =
    dados.filtros.data_inicio
      ? formatarData(
          dados.filtros.data_inicio
        )
      : "Sem limite inicial";

  const periodoFim =
    dados.filtros.data_fim
      ? formatarData(
          dados.filtros.data_fim
        )
      : "Sem limite final";

  doc.setFont(
    "helvetica",
    "bold"
  );
  doc.text(
    "Período da venda:",
    14,
    y
  );

  doc.setFont(
    "helvetica",
    "normal"
  );
  doc.text(
    `${periodoInicio} até ${periodoFim}`,
    46,
    y
  );

  y += 5;

  doc.setFont(
    "helvetica",
    "bold"
  );
  doc.text(
    "Gerado em:",
    14,
    y
  );

  doc.setFont(
    "helvetica",
    "normal"
  );
  doc.text(
    new Date(
      dados.geradoEm
    ).toLocaleString("pt-BR"),
    36,
    y
  );

  if (
    opcoes.filtrosDescricao?.length
  ) {
    y += 7;

    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.text(
      "Filtros aplicados",
      14,
      y
    );

    y += 5;

    doc.setFont(
      "helvetica",
      "normal"
    );

    for (
      const filtro of
      opcoes.filtrosDescricao
    ) {
      const linhas =
        doc.splitTextToSize(
          `• ${filtro}`,
          larguraPagina - 28
        );

      doc.text(
        linhas,
        14,
        y
      );

      y +=
        linhas.length * 4;
    }
  }

  y += 3;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[
      "Indicador",
      "Valor",
    ]],
    body: [
      [
        "Quantidade de comissões",
        String(dados.resumo.quantidade_comissoes),
      ],
      [
        "Comissão bruta",
        formatarMoeda(dados.resumo.valor_comissao_bruta),
      ],
      [
        "TOTAL A RECEBER DAS SEGURADORAS",
        formatarMoeda(dados.resumo.valor_total_a_receber),
      ],
      [
        "  A receber",
        formatarMoeda(dados.resumo.valor_a_receber),
      ],
      [
        "  Recebe hoje",
        formatarMoeda(dados.resumo.valor_recebe_hoje),
      ],
      [
        "  Atrasado",
        formatarMoeda(dados.resumo.valor_atrasado_recebimento),
      ],
      [
        "Recebido das seguradoras",
        formatarMoeda(dados.resumo.valor_recebido),
      ],
      [
        opcoes.participanteNome
          ? `TOTAL A PAGAR A ${opcoes.participanteNome.toUpperCase()}`
          : "TOTAL A PAGAR AOS PARTICIPANTES",
        formatarMoeda(dados.resumo.valor_total_a_pagar),
      ],
      [
        "  A pagar",
        formatarMoeda(dados.resumo.valor_a_pagar),
      ],
      [
        "  Vence hoje",
        formatarMoeda(dados.resumo.valor_vence_hoje_pagamento),
      ],
      [
        "  Atrasado",
        formatarMoeda(dados.resumo.valor_atrasado_pagamento),
      ],
      [
        opcoes.participanteNome
          ? `Já pago a ${opcoes.participanteNome}`
          : "Pago aos participantes",
        formatarMoeda(dados.resumo.valor_pago),
      ],
      [
        "Residual da corretora",
        formatarMoeda(dados.resumo.valor_residual_corretora),
      ],
    ],
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: {
        cellWidth: 90,
      },
      1: {
        halign: "right",
      },
    },
    margin: {
      left: 14,
      right: 14,
    },
  });

  y =
    obterYFinalTabela(
      doc,
      y
    ) + 10;

  dados.itens.forEach(
    (
      registro,
      indice
    ) => {
      const {
        item,
        detalhe,
      } = registro;

      y = garantirEspaco(
        doc,
        y,
        42
      );

      doc.setFillColor(
        241,
        245,
        249
      );
      doc.roundedRect(
        14,
        y - 5,
        larguraPagina - 28,
        11,
        2,
        2,
        "F"
      );

      doc.setFont(
        "helvetica",
        "bold"
      );
      doc.setFontSize(10);
      doc.setTextColor(
        15,
        23,
        42
      );

      doc.text(
        `${indice + 1}. ${
          item.cliente?.nome ??
          "Cliente não identificado"
        }`,
        17,
        y + 2
      );

      y += 10;

      autoTable(doc, {
        startY: y,
        theme: "grid",
        head: [[
          "Venda",
          "Apólice",
          "Produto",
          "Seguradora",
          "Corretor",
        ]],
        body: [[
          formatarData(
            item.contrato.data_venda
          ),
          item.contrato
            .numero_apolice ??
            "-",
          item.produto_nome ??
            "-",
          item.seguradora_nome ??
            "-",
          item.corretor_nome ??
            "-",
        ]],
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
        },
        headStyles: {
          fillColor: [
            71,
            85,
            105,
          ],
        },
        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        obterYFinalTabela(
          doc,
          y
        ) + 3;

      const comissao =
        detalhe?.comissao ??
        item.comissao;

      autoTable(doc, {
        startY: y,
        theme: "grid",
        head: [[
          "Valor venda",
          "Base original",
          "Deduções base",
          "Base cálculo",
          "Cálculo comissão",
          "Comissão bruta",
        ]],
        body: [[
          formatarMoeda(
            item.contrato
              .valor_aceito
          ),
          formatarMoeda(
            comissao
              .valor_base_original
          ),
          formatarMoeda(
            comissao
              .valor_deducoes_base
          ),
          formatarMoeda(
            comissao
              .valor_base_calculo
          ),
          formatarTipoCalculo(
            comissao
              .tipo_calculo_comissao,
            comissao
              .percentual_comissao,
            comissao
              .valor_comissao_fixa
          ),
          formatarMoeda(
            comissao
              .valor_comissao_bruta
          ),
        ]],
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
        },
        headStyles: {
          fillColor: [
            30,
            64,
            175,
          ],
        },
        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        obterYFinalTabela(
          doc,
          y
        ) + 4;

      if (
        detalhe?.deducoes?.length
      ) {
        y = garantirEspaco(
          doc,
          y,
          20
        );

        doc.setFont(
          "helvetica",
          "bold"
        );
        doc.setFontSize(8);
        doc.text(
          "Deduções da base",
          14,
          y
        );

        autoTable(doc, {
          startY: y + 2,
          theme: "striped",
          head: [[
            "Descrição",
            "Cálculo",
            "Valor",
          ]],
          body:
            detalhe.deducoes.map(
              (deducao) => [
                deducao.descricao,
                formatarTipoCalculo(
                  deducao.tipo_calculo,
                  deducao.percentual,
                  deducao.valor_fixo
                ),
                formatarMoeda(
                  deducao.valor_calculado
                ),
              ]
            ),
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
          },
          margin: {
            left: 14,
            right: 14,
          },
        });

        y =
          obterYFinalTabela(
            doc,
            y
          ) + 4;
      }

      if (
        detalhe?.recebimentos
          ?.length
      ) {
        y = garantirEspaco(
          doc,
          y,
          22
        );

        doc.setFont(
          "helvetica",
          "bold"
        );
        doc.setFontSize(8);
        doc.text(
          "Recebimentos da seguradora",
          14,
          y
        );

        autoTable(doc, {
          startY: y + 2,
          theme: "striped",
          head: [[
            "#",
            "Previsto",
            "Data prevista",
            "Recebido",
            "Data recebimento",
            "Situação",
          ]],
          body:
            detalhe.recebimentos.map(
              (recebimento) => [
                String(
                  recebimento
                    .numero_provisao
                ),
                formatarMoeda(
                  recebimento
                    .valor_previsto
                ),
                formatarData(
                  recebimento
                    .data_prevista
                ),
                formatarMoeda(
                  recebimento
                    .valor_recebido
                ),
                formatarData(
                  recebimento
                    .data_recebimento
                ),
                recebimento.situacao,
              ]
            ),
          styles: {
            fontSize: 6.7,
            cellPadding: 1.4,
          },
          margin: {
            left: 14,
            right: 14,
          },
        });

        y =
          obterYFinalTabela(
            doc,
            y
          ) + 4;
      }

      if (
        detalhe?.splits?.length
      ) {
        y = garantirEspaco(
          doc,
          y,
          24
        );

        doc.setFont(
          "helvetica",
          "bold"
        );
        doc.setFontSize(8);
        doc.text(
          "Distribuição / Splits",
          14,
          y
        );

        autoTable(doc, {
          startY: y + 2,
          theme: "striped",
          head: [[
            "Participante",
            "Tipo",
            "Cálculo",
            "Bruto",
            "Deduções",
            "Líquido",
          ]],
          body:
            detalhe.splits.map(
              (split) => [
                split.participante_nome ??
                  opcoes.participanteNome ??
                  (split.tipo_participante === "CORRETORA"
                    ? "Corretora"
                    : split.tipo_participante),
                split
                  .tipo_participante,
                formatarTipoCalculo(
                  split.tipo_calculo,
                  split.percentual,
                  split.valor_fixo
                ),
                formatarMoeda(
                  split
                    .valor_bruto_split
                ),
                formatarMoeda(
                  split
                    .valor_deducoes
                ),
                formatarMoeda(
                  split
                    .valor_liquido_split
                ),
              ]
            ),
          styles: {
            fontSize: 6.7,
            cellPadding: 1.4,
          },
          margin: {
            left: 14,
            right: 14,
          },
        });

        y =
          obterYFinalTabela(
            doc,
            y
          ) + 4;
      }

      if (
        detalhe?.pagamentos
          ?.length
      ) {
        y = garantirEspaco(
          doc,
          y,
          22
        );

        doc.setFont(
          "helvetica",
          "bold"
        );
        doc.setFontSize(8);
        doc.text(
          "Pagamentos aos participantes",
          14,
          y
        );

        const mapaSplits =
          new Map(
            (detalhe.splits ?? [])
              .map((split) => [
                split.id,
                split,
              ])
          );

        autoTable(doc, {
          startY: y + 2,
          theme: "striped",
          head: [[
            "Participante",
            "#",
            "Previsto",
            "Data prevista",
            "Pago",
            "Data pagamento",
            "Situação",
          ]],
          body:
            detalhe.pagamentos.map(
              (pagamento) => {
                const split =
                  mapaSplits.get(
                    pagamento.split_id
                  );

                return [
                  split?.participante_nome ??
                    opcoes.participanteNome ??
                    split?.tipo_participante ??
                    "-",
                  String(
                    pagamento
                      .numero_provisao
                  ),
                  formatarMoeda(
                    pagamento
                      .valor_previsto
                  ),
                  formatarData(
                    pagamento
                      .data_prevista
                  ),
                  formatarMoeda(
                    pagamento
                      .valor_pago
                  ),
                  formatarData(
                    pagamento
                      .data_pagamento
                  ),
                  pagamento.situacao,
                ];
              }
            ),
          styles: {
            fontSize: 6.3,
            cellPadding: 1.3,
          },
          margin: {
            left: 14,
            right: 14,
          },
        });

        y =
          obterYFinalTabela(
            doc,
            y
          ) + 4;
      }

      y = garantirEspaco(
        doc,
        y,
        14
      );

      autoTable(doc, {
        startY: y,
        theme: "grid",
        head: [[
          "Resumo financeiro",
          "Valor",
        ]],
        body: [
          [
            "Comissão bruta",
            formatarMoeda(
              item.comissao
                .valor_comissao_bruta
            ),
          ],
          [
            "Recebido da seguradora",
            formatarMoeda(
              item
                .resumo_recebimentos
                .valor_recebido
            ),
          ],
          [
            "Pago aos participantes",
            formatarMoeda(
              item
                .resumo_pagamentos
                .valor_pago
            ),
          ],
          [
            "Residual corretora",
            formatarMoeda(
              item
                .resumo_splits
                .valor_residual_corretora
            ),
          ],
        ],
        styles: {
          fontSize: 7,
          cellPadding: 1.6,
        },
        headStyles: {
          fillColor: [
            15,
            118,
            110,
          ],
        },
        columnStyles: {
          1: {
            halign: "right",
          },
        },
        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        obterYFinalTabela(
          doc,
          y
        ) + 10;
    }
  );

  y = garantirEspaco(doc, y, 62);

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, y, larguraPagina - 28, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    opcoes.participanteNome
      ? `Resumo final - ${opcoes.participanteNome}`
      : "Resumo final do período",
    17,
    y + 7
  );

  y += 14;
  doc.setTextColor(15, 23, 42);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Pergunta gerencial", "Resposta"]],
    body: [
      [
        "Quanto ainda falta receber das seguradoras?",
        formatarMoeda(dados.resumo.valor_total_a_receber),
      ],
      [
        opcoes.participanteNome
          ? `Quanto ainda falta pagar a ${opcoes.participanteNome}?`
          : "Quanto ainda falta repassar aos participantes?",
        formatarMoeda(dados.resumo.valor_total_a_pagar),
      ],
      [
        opcoes.participanteNome
          ? `Quanto já foi pago a ${opcoes.participanteNome}?`
          : "Quanto já foi pago aos participantes?",
        formatarMoeda(dados.resumo.valor_pago),
      ],
      [
        "Qual o residual da corretora?",
        formatarMoeda(dados.resumo.valor_residual_corretora),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  adicionarRodapePaginas(doc);

  const nomeArquivo =
    opcoes.nomeArquivo ??
    `relatorio-comissoes-${
      dados.filtros.data_inicio ??
      "inicio"
    }-${
      dados.filtros.data_fim ??
      "fim"
    }.pdf`;

  doc.save(nomeArquivo);
}
