import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, User, Building2, MapPin, Plus, Trash2, HeartPulse,Clock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

interface ModeloCotacaoSaudeProps {
  propostaId: string;
  onClose: () => void;
}

const FAIXAS_ETARIAS = [
  "00 a 18", "19 a 23", "24 a 28", "29 a 33", 
  "34 a 38", "39 a 43", "44 a 48", "49 a 53", 
  "54 a 58", "59 +"
];

interface ValoresPlano {
  enfCom: number;
  aptCom: number;
  enfSem: number;
  aptSem: number;
}

export default function ModeloCotacaoSaude({ propostaId, onClose }: ModeloCotacaoSaudeProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);

  // Estados da Matriz de Saúde
  const [vidas, setVidas] = useState<Record<string, number>>(
    FAIXAS_ETARIAS.reduce((acc, faixa) => ({ ...acc, [faixa]: 0 }), {})
  );

  const [valoresUnitarios, setValoresUnitarios] = useState<Record<string, ValoresPlano>>(
    FAIXAS_ETARIAS.reduce((acc, faixa) => ({
      ...acc,
      [faixa]: { enfCom: 0, aptCom: 0, enfSem: 0, aptSem: 0 }
    }), {})
  );

  const [valorDental, setValorDental] = useState<number>(22.13);
  const [valoresIOF, setValoresIOF] = useState<ValoresPlano>({ enfCom: 0, aptCom: 0, enfSem: 0, aptSem: 0 });

  // Estados dos Benefícios e Hospitais
  const [topBeneficios, setTopBeneficios] = useState<string[]>(["Telemedicina 24h", "Cobertura Nacional", "Reembolso pelo APP", "Dental incluso"]);
  const [topHospitais, setTopHospitais] = useState<string[]>(["Hospital Conceição", "Lagumed", "Pró-vida", "Outros"]);
  const [prazosCarencia, setPrazosCarencia] = useState<string[]>([
  "Urgência e emergência: 24h",
  "Consultas: 15 dias",
  "Exames do tipo A : 15 dias",
  "Exames do tipo B : 180 dias",
  "Terapias não médicas : 180 dias",
  "Internações clínicas : 180 dias",
  "Cirurgias em geral (exceto baríatrica): 180 dias",
  "Cirurgia bariátrica: 180 dias",
  "Parto: 300 dias"
]);
  const [novoBeneficio, setNovoBeneficio] = useState("");
  const [novoHospital, setNovoHospital] = useState("");
  const [novaCarencia, setNovaCarencia] = useState("");

  useEffect(() => {
    if (propostaId) {
      carregarDadosProposta();
    }
  }, [propostaId]);

  async function carregarDadosProposta() {
    try {
      setLoading(true);

      const { data: proposta, error: errorProp } = await supabase
        .from("tab_propostas")
        .select(`
          *,
          tab_clientes (*),
          usuarios_perfis!tab_propostas_corretor_id_fkey (*) 
        `)
        .eq("id", propostaId)
        .single();

      if (errorProp || !proposta) throw new Error("Erro ao buscar dados básicos da proposta.");

      const corretor = proposta.usuarios_perfis;

      const { data: corretora } = await supabase
        .from("usuarios_perfis")
        .select(`
          id,
          cnpj_corretora,
          registro_susep,
          tab_configuracoes_site (
            nome_exibicao,
            dominio,
            logo_url
          )
        `)
        .eq("corretora_id", proposta.corretora_id)
        .or("tipo_usuario.eq.CORRETORA,tipo_usuario.eq.ADMIN") 
        .limit(1)
        .maybeSingle();

      setDadosBase({
        proposta,
        corretora,
        corretor,
        cliente: proposta.tab_clientes,
      });

    } catch (error) {
      console.error("Erro ao estruturar cotação de saúde:", error);
      alert("Houve um erro ao carregar o espelho da proposta.");
    } finally {
      setLoading(false);
    }
  }

  const carregarImagemCache = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
  };

// =======================================================================
  // PARTE 3: EXPORTAÇÃO DO PDF COMPLETO COM 6 COLUNAS E LAYOUT SAÚDE (CORRIGIDO)
  // =======================================================================
  const exportarPDFProposta = async () => {
    if (!dadosBase) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const { proposta, cliente, corretor, corretora } = dadosBase;

    const urlLogoCorretora = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogoCorretora = urlLogoCorretora ? await carregarImagemCache(urlLogoCorretora) : null;

    // Cabeçalho Principal
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 38, "F");
    
    let inicioTextoX = 15;
    if (imgLogoCorretora) {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 6, 32, 12, "F"); 
      doc.addImage(imgLogoCorretora, "PNG", 16, 7, 30, 10);
      inicioTextoX = 52;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(corretora?.tab_configuracoes_site?.nome_exibicao || "CORRETORA DE SEGUROS", inicioTextoX, 14);
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${corretora?.cnpj_corretora || "-"}`, inicioTextoX, 20);
    doc.text(`SUSEP: ${corretora?.registro_susep || "-"}`, inicioTextoX, 25);
    doc.text(`Site: ${corretora?.tab_configuracoes_site?.dominio || "-"}`, inicioTextoX, 30);

    const colunaDireitaX = 130;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`PROPOSTA SAÚDE Nº: ${proposta.numero_proposta || "-"}`, colunaDireitaX, 12);
    doc.text(`VALIDADE: ${proposta.data_validade ? formatarDataBR(proposta.data_validade) : "-"}`, colunaDireitaX, 16);
    
    doc.setDrawColor(71, 85, 105);
    doc.line(colunaDireitaX, 19, 195, 19);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Consultor: ${corretor?.nome || "-"}`, colunaDireitaX, 23);
    doc.text(`Telefone: ${corretor?.telefone_corretor || "-"}`, colunaDireitaX, 27);
    doc.text(`E-mail: ${corretor?.email || "-"}`, colunaDireitaX, 31);

    // DADOS DO SEGURADO
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO SEGURADO", 15, 46);
    doc.line(15, 48, 195, 48);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const isPJ = cliente?.tipo_cliente === "PJ";
    doc.text(`Nome/Razão Social: ${isPJ ? cliente?.razao_social : cliente?.nome || "-"}`, 15, 54);
    doc.text(`CPF/CNPJ: ${isPJ ? cliente?.cnpj : cliente?.cpf || "-"}`, 15, 59);
    doc.text(`WhatsApp: ${cliente?.telefone_whats || "-"} | Email: ${cliente?.email || "-"}`, 15, 64);
    doc.text(`CEP de Risco: ${isPJ ? cliente?.cep : cliente?.cep_pf || "-"} (${isPJ ? `${cliente?.municipio} - ${cliente?.uf}` : `${cliente?.municipio_pf} - ${cliente?.uf_pf}` || "-"})`, 15, 69);

    // RE-CALCULAR TOTAIS
    const totalVidas = Object.values(vidas).reduce((a, b) => a + (Number(b) || 0), 0);
    const totaisSaude = { enfCom: 0, aptCom: 0, enfSem: 0, aptSem: 0 };
    
    FAIXAS_ETARIAS.forEach(faixa => {
      const qtd = Number(vidas[faixa]) || 0;
      totaisSaude.enfCom += qtd * (Number(valoresUnitarios[faixa].enfCom) || 0);
      totaisSaude.aptCom += qtd * (Number(valoresUnitarios[faixa].aptCom) || 0);
      totaisSaude.enfSem += qtd * (Number(valoresUnitarios[faixa].enfSem) || 0);
      totaisSaude.aptSem += qtd * (Number(valoresUnitarios[faixa].aptSem) || 0);
    });

    const totalDental = totalVidas * (Number(valorDental) || 0);
    const totaisGerais = {
      enfCom: totaisSaude.enfCom + totalDental + (Number(valoresIOF.enfCom) || 0),
      aptCom: totaisSaude.aptCom + totalDental + (Number(valoresIOF.aptCom) || 0),
      enfSem: totaisSaude.enfSem + totalDental + (Number(valoresIOF.enfSem) || 0),
      aptSem: totaisSaude.aptSem + totalDental + (Number(valoresIOF.aptSem) || 0),
    };

    const tableHead: any[][] = [
      [
        { content: "", colSpan: 2, styles: { fillColor: [255, 255, 255] } },
        { content: "COM COPARTICIPAÇÃO", colSpan: 2, styles: { halign: "center", fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: "bold" } },
        { content: "SEM COPARTICIPAÇÃO", colSpan: 2, styles: { halign: "center", fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: "bold" } }
      ],
      [
        { content: "FAIXA ETÁRIA", styles: { halign: "center", fillColor: [30, 41, 59] } },
        { content: "VIDAS", styles: { halign: "center", fillColor: [30, 41, 59] } },
        { content: "ENFERMARIA", styles: { halign: "right", fillColor: [22, 101, 52] } },
        { content: "APARTAMENTO", styles: { halign: "right", fillColor: [29, 78, 216] } },
        { content: "ENFERMARIA", styles: { halign: "right", fillColor: [22, 101, 52] } },
        { content: "APARTAMENTO", styles: { halign: "right", fillColor: [29, 78, 216] } }
      ]
    ];

    const tableBody: any[] = FAIXAS_ETARIAS.map((faixa) => [
      faixa,
      vidas[faixa] || 0,
      formatarMoeda(valoresUnitarios[faixa].enfCom),
      formatarMoeda(valoresUnitarios[faixa].aptCom),
      formatarMoeda(valoresUnitarios[faixa].enfSem),
      formatarMoeda(valoresUnitarios[faixa].aptSem)
    ]);

    tableBody.push(
      ["TOTAL SAÚDE", totalVidas, formatarMoeda(totaisSaude.enfCom), formatarMoeda(totaisSaude.aptCom), formatarMoeda(totaisSaude.enfSem), formatarMoeda(totaisSaude.aptSem)],
      ["TOTAL DENTAL", totalVidas, formatarMoeda(totalDental), formatarMoeda(totalDental), formatarMoeda(totalDental), formatarMoeda(totalDental)],
      ["IOF", "", formatarMoeda(valoresIOF.enfCom), formatarMoeda(valoresIOF.aptCom), formatarMoeda(valoresIOF.enfSem), formatarMoeda(valoresIOF.aptSem)],
      ["TOTAL GERAL", "", formatarMoeda(totaisGerais.enfCom), formatarMoeda(totaisGerais.aptCom), formatarMoeda(totaisGerais.enfSem), formatarMoeda(totaisGerais.aptSem)]
    );

    autoTable(doc, {
      startY: 76,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2, valign: "middle" },
      columnStyles: {
        0: { halign: "center", fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" }
      },
      didParseCell: (data) => {
        // 1. FUNDO BRANCO PARA TODOS OS DADOS (Remove as cores alternadas)
        if (data.section === 'body') {
          data.cell.styles.fillColor = [255, 255, 255] as [number, number, number];
        }

        // 2. Configurações especiais para as linhas de Totais (Base cinza claro apenas nos totais)
        if (data.row.index >= tableBody.length - 4) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 245, 249] as [number, number, number];
          
          // Estilização da linha do TOTAL GERAL
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.textColor = [255, 255, 255] as [number, number, number];
            if (data.column.index === 0 || data.column.index === 1) data.cell.styles.fillColor = [20, 83, 45] as [number, number, number];
            if (data.column.index === 2 || data.column.index === 4) data.cell.styles.fillColor = [22, 101, 52] as [number, number, number];
            if (data.column.index === 3 || data.column.index === 5) data.cell.styles.fillColor = [29, 78, 216] as [number, number, number];
          }
        }
      },
      
      // 2. O PULO DO GATO: Desenha a divisão grossa mapeando as colunas exatas até no cabeçalho agrupado
      didDrawCell: (data) => {
        let isFimDoBloco = false;

        if (data.section === 'head' && data.row.index === 0) {
          // Na primeira linha do cabeçalho, as células estão unidas (colSpan: 2)
          // Índice 0 (vazia) | Índice 2 (Com Copar)
          if (data.column.index === 0 || data.column.index === 2) {
            isFimDoBloco = true;
          }
        } else {
          // Em todo o resto da tabela (Cabeçalho Inferior, Body e Foot)
          // Fim do bloco Vidas (1) | Fim do Bloco Com Copar (3)
          if (data.column.index === 1 || data.column.index === 3) {
            isFimDoBloco = true;
          }
        }

        if (isFimDoBloco) {
          const docCanvas = data.doc;
          const posX = data.cell.x + data.cell.width; // Aresta direita da célula
          const startY = data.cell.y;
          const endY = data.cell.y + data.cell.height;

          // Desenha uma parede branca espessa de 3mm rasgando a grade
          docCanvas.setDrawColor(255, 255, 255); 
          docCanvas.setLineWidth(3.0);
          docCanvas.line(posX, startY, posX, endY);
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    if (topBeneficios.length > 0 || topHospitais.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMAÇÕES ADICIONAIS DA PROPOSTA", 15, currentY);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 8;

      const headAdicionais = [["Principais Benefícios", "Rede Credenciada", "Prazos de Carência (Rol Exemplificativo)"]];
      const bodyAdicionais: any[] = [];
      const maxRows = Math.max(topBeneficios.length, topHospitais.length, prazosCarencia.length);

      for (let i = 0; i < maxRows; i++) {
        bodyAdicionais.push([
          topBeneficios[i] ? `• ${topBeneficios[i]}` : "",
          topHospitais[i] ? `• ${topHospitais[i]}` : "",
          prazosCarencia[i] ? `• ${prazosCarencia[i]}` : ""
        ]);
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: 15, right: 15 },
        head: headAdicionais,
        body: bodyAdicionais,
        theme: "plain", 
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5 }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Esta proposta segue as diretrizes da ANS e as Condições Gerais da Operadora/Seguradora escolhida.", 15, currentY);

    doc.save(`Proposta_Saude_${proposta.numero_proposta || "Preview"}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="font-medium text-gray-700">Carregando espelho de saúde...</span>
        </div>
      </div>
    );
  }

  const { proposta, cliente, corretor, corretora } = dadosBase || {};
  const isPJ = cliente?.tipo_cliente === "PJ";

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto">
      <div className="max-w-6xl mx-auto my-8 bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col min-h-[90vh]">
        
        {/* BARRA DE AÇÕES FIXA NO TOPO */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <HeartPulse className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Espelho de Cotação - Saúde</h2>
              <p className="text-sm text-slate-300">Construção de Proposta Comercial</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportarPDFProposta}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Printer className="h-4 w-4" /> Exportar PDF
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <X className="h-4 w-4" /> Fechar
            </button>
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* CABEÇALHO DO DOCUMENTO: CORRETORA, CORRETOR E PROPOSTA */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
            <div className="flex gap-6 items-center">
              {corretora?.tab_configuracoes_site?.logo_url ? (
                <div className="h-20 w-40 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center p-2">
                  <img
                    src={corretora.tab_configuracoes_site.logo_url}
                    alt="Logo Corretora"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-20 w-40 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
              )}
              
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {corretora?.tab_configuracoes_site?.nome_exibicao || "Sua Corretora"}
                </h1>
                <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                  <p>CNPJ: {corretora?.cnpj_corretora || "Não informado"}</p>
                  <p>SUSEP: {corretora?.registro_susep || "Não informado"}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 mb-2">
                <p className="text-sm font-semibold text-slate-700">PROPOSTA Nº</p>
                <p className="text-lg font-bold text-blue-600">{proposta?.numero_proposta || "N/D"}</p>
              </div>
              <div className="text-sm text-slate-600 space-y-0.5">
                <p><span className="font-medium text-slate-700">Consultor:</span> {corretor?.nome || "Não informado"}</p>
                <p><span className="font-medium text-slate-700">Email:</span> {corretor?.email || "-"}</p>
                <p><span className="font-medium text-slate-700">Telefone:</span> {corretor?.telefone_corretor || "-"}</p>
                <p><span className="font-medium text-slate-700">Validade:</span> {proposta?.data_validade ? formatarDataBR(proposta.data_validade) : "15 dias"}</p>
              </div>
            </div>
          </div>

          {/* DADOS DO SEGURADO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">Dados do Segurado (Titular/Empresa)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome / Razão Social</p>
                <p className="font-medium text-slate-800 text-sm">
                  {isPJ ? cliente?.razao_social : cliente?.nome || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CPF / CNPJ</p>
                <p className="font-medium text-slate-800 text-sm">
                  {isPJ ? cliente?.cnpj : cliente?.cpf || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contato</p>
                <p className="font-medium text-slate-800 text-sm">
                  {cliente?.telefone_whats || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* MATRIZ DE PREÇOS E CALCULAÇÕES */}
          {(() => {
            const totalVidasGrid = Object.values(vidas).reduce((a, b) => a + (Number(b) || 0), 0);

            const totaisSaudeGrid = { enfCom: 0, aptCom: 0, enfSem: 0, aptSem: 0 };
            FAIXAS_ETARIAS.forEach(faixa => {
              const qtd = Number(vidas[faixa]) || 0;
              totaisSaudeGrid.enfCom += qtd * (Number(valoresUnitarios[faixa].enfCom) || 0);
              totaisSaudeGrid.aptCom += qtd * (Number(valoresUnitarios[faixa].aptCom) || 0);
              totaisSaudeGrid.enfSem += qtd * (Number(valoresUnitarios[faixa].enfSem) || 0);
              totaisSaudeGrid.aptSem += qtd * (Number(valoresUnitarios[faixa].aptSem) || 0);
            });

            const totalDentalGrid = totalVidasGrid * (Number(valorDental) || 0);

            const totaisGeraisGrid = {
              enfCom: totaisSaudeGrid.enfCom + totalDentalGrid + (Number(valoresIOF.enfCom) || 0),
              aptCom: totaisSaudeGrid.aptCom + totalDentalGrid + (Number(valoresIOF.aptCom) || 0),
              enfSem: totaisSaudeGrid.enfSem + totalDentalGrid + (Number(valoresIOF.enfSem) || 0),
              aptSem: totaisSaudeGrid.aptSem + totalDentalGrid + (Number(valoresIOF.aptSem) || 0),
            };

            return (
              <div className="space-y-8">
                {/* CONFIGURAÇÃO DO VALOR DENTAL */}
                <div className="flex justify-end mb-4">
                  <div className="bg-white border border-slate-300 rounded-lg p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-sm font-bold text-slate-700">Valor Unitário Odonto (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 border border-slate-300 rounded p-1 text-right text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      value={valorDental}
                      onChange={(e) => setValorDental(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* TABELA PRINCIPAL */}
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th colSpan={2} className="bg-white border-b-2 border-r-4 border-white"></th>
                        <th colSpan={2} className="bg-white border-b-4 border-white text-center p-2">
                          <div className="border border-amber-600 text-amber-700 font-bold py-1 px-4 rounded shadow-sm text-xs tracking-wider">
                            COM COPARTICIPAÇÃO
                          </div>
                        </th>
                        <th colSpan={2} className="bg-white border-b-4 border-l-4 border-white text-center p-2">
                          <div className="border border-amber-600 text-amber-700 font-bold py-1 px-4 rounded shadow-sm text-xs tracking-wider">
                            SEM COPARTICIPAÇÃO
                          </div>
                        </th>
                      </tr>
                      <tr className="text-white">
                        <th className="bg-slate-800 p-3 text-center font-bold text-xs tracking-wider border-r border-slate-700 w-24">FAIXA ETÁRIA</th>
                        <th className="bg-slate-800 p-3 text-center font-bold text-xs tracking-wider border-r-4 border-white w-20">VIDAS</th>
                        
                        <th className="bg-green-800 p-3 text-center font-bold text-xs tracking-wider border-r border-green-700 w-36">ENFERMARIA</th>
                        <th className="bg-blue-700 p-3 text-center font-bold text-xs tracking-wider border-r-4 border-white w-36">APARTAMENTO</th>
                        
                        <th className="bg-green-800 p-3 text-center font-bold text-xs tracking-wider border-r border-green-700 w-36">ENFERMARIA</th>
                        <th className="bg-blue-700 p-3 text-center font-bold text-xs tracking-wider w-36">APARTAMENTO</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-50 divide-y divide-slate-200">
                      {FAIXAS_ETARIAS.map((faixa) => (
                        <tr key={faixa} className="hover:bg-slate-100 transition-colors">
                          <td className="p-2 text-center font-semibold text-slate-700">{faixa}</td>
                          <td className="p-2 border-r-4 border-white">
                            <input
                              type="number"
                              min="0"
                              className="w-full text-center border border-slate-300 rounded py-1 focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 bg-white"
                              value={vidas[faixa] || ""}
                              onChange={(e) => setVidas({ ...vidas, [faixa]: parseInt(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 focus:ring-2 focus:ring-green-500"
                              value={valoresUnitarios[faixa].enfCom || ""}
                              onChange={(e) => setValoresUnitarios({ ...valoresUnitarios, [faixa]: { ...valoresUnitarios[faixa], enfCom: parseFloat(e.target.value) || 0 } })}
                            />
                          </td>
                          <td className="p-2 border-r-4 border-white">
                            <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 focus:ring-2 focus:ring-blue-500"
                              value={valoresUnitarios[faixa].aptCom || ""}
                              onChange={(e) => setValoresUnitarios({ ...valoresUnitarios, [faixa]: { ...valoresUnitarios[faixa], aptCom: parseFloat(e.target.value) || 0 } })}
                            />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 focus:ring-2 focus:ring-green-500"
                              value={valoresUnitarios[faixa].enfSem || ""}
                              onChange={(e) => setValoresUnitarios({ ...valoresUnitarios, [faixa]: { ...valoresUnitarios[faixa], enfSem: parseFloat(e.target.value) || 0 } })}
                            />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 focus:ring-2 focus:ring-blue-500"
                              value={valoresUnitarios[faixa].aptSem || ""}
                              onChange={(e) => setValoresUnitarios({ ...valoresUnitarios, [faixa]: { ...valoresUnitarios[faixa], aptSem: parseFloat(e.target.value) || 0 } })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    
                    <tfoot className="bg-slate-100 font-bold text-slate-800">
                      <tr>
                        <td className="p-3 text-right">TOTAL SAÚDE</td>
                        <td className="p-3 text-center text-lg border-r-4 border-white">{totalVidasGrid}</td>
                        <td className="p-3 text-right text-base">{formatarMoeda(totaisSaudeGrid.enfCom)}</td>
                        <td className="p-3 text-right text-base border-r-4 border-white">{formatarMoeda(totaisSaudeGrid.aptCom)}</td>
                        <td className="p-3 text-right text-base">{formatarMoeda(totaisSaudeGrid.enfSem)}</td>
                        <td className="p-3 text-right text-base">{formatarMoeda(totaisSaudeGrid.aptSem)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-right">TOTAL DENTAL</td>
                        <td className="p-3 text-center text-lg border-r-4 border-white">{totalVidasGrid}</td>
                        <td className="p-3 text-right text-base">{formatarMoeda(totalDentalGrid)}</td>
                        <td className="p-3 text-right text-base border-r-4 border-white">{formatarMoeda(totalDentalGrid)}</td>
                        <td className="p-3 text-right text-base">{formatarMoeda(totalDentalGrid)}</td>
                        <td className="p-3 text-right text-base">{formatarMoeda(totalDentalGrid)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="p-3 text-right border-r-4 border-white">IOF</td>
                        <td className="p-2">
                          <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 text-red-600"
                            value={valoresIOF.enfCom || ""}
                            onChange={(e) => setValoresIOF({ ...valoresIOF, enfCom: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-2 border-r-4 border-white">
                          <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 text-red-600"
                            value={valoresIOF.aptCom || ""}
                            onChange={(e) => setValoresIOF({ ...valoresIOF, aptCom: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-2">
                          <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 text-red-600"
                            value={valoresIOF.enfSem || ""}
                            onChange={(e) => setValoresIOF({ ...valoresIOF, enfSem: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-2">
                          <input type="number" step="0.01" className="w-full text-right border border-slate-300 rounded py-1 px-2 text-red-600"
                            value={valoresIOF.aptSem || ""}
                            onChange={(e) => setValoresIOF({ ...valoresIOF, aptSem: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                      </tr>
                      <tr className="text-white">
                        <td colSpan={2} className="p-4 text-center font-black text-lg bg-green-900 border-r-4 border-white tracking-widest uppercase">
                          TOTAL GERAL
                        </td>
                        <td className="p-4 text-right font-black text-lg bg-green-800">{formatarMoeda(totaisGeraisGrid.enfCom)}</td>
                        <td className="p-4 text-right font-black text-lg bg-blue-700 border-r-4 border-white">{formatarMoeda(totaisGeraisGrid.aptCom)}</td>
                        <td className="p-4 text-right font-black text-lg bg-green-800">{formatarMoeda(totaisGeraisGrid.enfSem)}</td>
                        <td className="p-4 text-right font-black text-lg bg-blue-700">{formatarMoeda(totaisGeraisGrid.aptSem)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* BLOCO DE BENEFÍCIOS, HOSPITAIS E CARÊNCIAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  
                  {/* Top Benefícios */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" /> Principais Benefícios
                    </h4>
                    <ul className="space-y-2 mb-4">
                      {topBeneficios.map((ben, idx) => (
                        <li key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                          <span className="font-medium text-slate-700">{ben}</span>
                          <button onClick={() => setTopBeneficios(topBeneficios.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                      {topBeneficios.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum benefício cadastrado.</p>}
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Reembolso 100% digital"
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={novoBeneficio}
                        onChange={(e) => setNovoBeneficio(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && novoBeneficio) { setTopBeneficios([...topBeneficios, novoBeneficio]); setNovoBeneficio(""); } }}
                      />
                      <button 
                        onClick={() => { if(novoBeneficio) { setTopBeneficios([...topBeneficios, novoBeneficio]); setNovoBeneficio(""); } }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors flex items-center gap-1 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Top Hospitais/Clínicas */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" /> Rede Credenciada
                    </h4>
                    <ul className="space-y-2 mb-4">
                      {topHospitais.map((hosp, idx) => (
                        <li key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                          <span className="font-medium text-slate-700">{hosp}</span>
                          <button onClick={() => setTopHospitais(topHospitais.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                      {topHospitais.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum hospital cadastrado.</p>}
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Hospital Sírio-Libanês"
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={novoHospital}
                        onChange={(e) => setNovoHospital(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && novoHospital) { setTopHospitais([...topHospitais, novoHospital]); setNovoHospital(""); } }}
                      />
                      <button 
                        onClick={() => { if(novoHospital) { setTopHospitais([...topHospitais, novoHospital]); setNovoHospital(""); } }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors flex items-center gap-1 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Prazos de Carência */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" /> Prazos de Carência (Rol Exemplificativo)
                    </h4>
                    <ul className="space-y-2 mb-4">
                      {prazosCarencia.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                          <span className="font-medium text-slate-700">{item}</span>
                          <button onClick={() => setPrazosCarencia(prazosCarencia.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                      {prazosCarencia.length === 0 && <p className="text-sm text-slate-400 italic">Nenhuma carência definida.</p>}
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Parto: 300 dias"
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={novaCarencia}
                        onChange={(e) => setNovaCarencia(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && novaCarencia) { setPrazosCarencia([...prazosCarencia, novaCarencia]); setNovaCarencia(""); } }}
                      />
                      <button 
                        onClick={() => { if(novaCarencia) { setPrazosCarencia([...prazosCarencia, novaCarencia]); setNovaCarencia(""); } }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors flex items-center gap-1 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}