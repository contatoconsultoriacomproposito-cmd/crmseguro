import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, Building2, Trash2, HeartPulse, Plus, Copy, Info } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";
// IMPORTAÇÃO DAS SUAS FUNÇÕES PATRIMONIAIS DE MÁSCARA
import { maskCurrency, parseCurrencyToNumber } from "../../../utils/masks";

interface ModeloCotacaoVidaProps {
  propostaId: string;
  onClose: () => void;
}

// ==========================================
// INTERFACES DA ARQUITETURA DE CENÁRIOS
// ==========================================
interface Cobertura {
  id: string;
  nome: string;
  capital: number;
}

interface Resgate {
  id: string;
  periodo: string;
  acumulado: number;
  resgateEstimated: number;
}

interface CenarioVida {
  id: string;
  nome: string;
  tipoOperacao: "PF" | "PJ";
  resgatavel: boolean;
  prazoPagamento: "Mensal" | "Anual" | "Vitalício";
  prazoAnos: number;
  frequenciaPagamento: "Mensal" | "Anual" | "Única";
  valorPremio: number;
  coberturas: Cobertura[];
  gradeResgate: Resgate[];
}

const COBERTURAS_PADRAO: Cobertura[] = [
  { id: "1", nome: "Morte (Natural ou Acidental)", capital: 500000 },
  { id: "2", nome: "Invalidez por Acidente (IPA)", capital: 500000 },
  { id: "3", nome: "Doenças Graves (DG)", capital: 200000 },
];

const RESGATE_PADRAO: Resgate[] = [
  { id: "1", periodo: "Ano 5", acumulado: 0, resgateEstimated: 0 },
  { id: "2", periodo: "Ano 10", acumulado: 0, resgateEstimated: 0 },
  { id: "3", periodo: "Aos 65 anos", acumulado: 0, resgateEstimated: 0 },
];

const criarCenarioPadrao = (nome: string): CenarioVida => ({
  id: Math.random().toString(36).substr(2, 9),
  nome,
  tipoOperacao: "PF",
  resgatavel: false,
  prazoPagamento: "Vitalício",
  prazoAnos: 10,
  frequenciaPagamento: "Mensal",
  valorPremio: 280,
  coberturas: [...COBERTURAS_PADRAO],
  gradeResgate: [...RESGATE_PADRAO],
});

export default function ModeloCotacaoVida({ propostaId, onClose }: ModeloCotacaoVidaProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [cenarios, setCenarios] = useState<CenarioVida[]>([criarCenarioPadrao("Cenário Principal")]);

  useEffect(() => {
    if (propostaId) carregarDadosProposta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostaId]);

  async function carregarDadosProposta() {
    try {
      setLoading(true);
      const { data: proposta, error: errorProp } = await supabase
        .from("tab_propostas")
        .select(`*, tab_clientes (*), usuarios_perfis!tab_propostas_corretor_id_fkey (*)`)
        .eq("id", propostaId)
        .single();

      if (errorProp || !proposta) throw new Error("Erro ao buscar dados básicos.");

      const corretor = proposta.usuarios_perfis;
      const { data: corretora } = await supabase
        .from("usuarios_perfis")
        .select(`id, cnpj_corretora, registro_susep, tab_configuracoes_site (nome_exibicao, dominio, logo_url)`)
        .eq("corretora_id", proposta.corretora_id)
        .or("tipo_usuario.eq.CORRETORA,tipo_usuario.eq.ADMIN")
        .limit(1)
        .maybeSingle();

      setDadosBase({ proposta, corretora, corretor, cliente: proposta.tab_clientes });
    } catch (error) {
      console.error("Erro:", error);
      alert("Houve um erro ao carregar o espelho da proposta.");
    } finally {
      setLoading(false);
    }
  }

  

  // ==========================================
  // MANIPULAÇÃO DE ESTADOS E DINÂMICAS
  // ==========================================
  const atualizarCenario = (id: string, campo: keyof CenarioVida, valor: any) => {
    setCenarios(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c));
  };

  const clonarCenario = (cenarioOrigem: CenarioVida) => {
    if (cenarios.length >= 2) {
      alert("Para manter a clareza visual, você pode comparar até 2 cenários por relatório.");
      return;
    }
    const novoCenario = JSON.parse(JSON.stringify(cenarioOrigem));
    novoCenario.id = Math.random().toString(36).substr(2, 9);
    novoCenario.nome = "Cenário Comparativo";
    setCenarios([...cenarios, novoCenario]);
  };

  const removerCenario = (id: string) => {
    setCenarios(prev => prev.filter(c => c.id !== id));
  };

  const atualizarCobertura = (cenarioId: string, cobId: string, campo: keyof Cobertura, valor: any) => {
    setCenarios(prev => prev.map(c => {
      if (c.id !== cenarioId) return c;
      return {
        ...c,
        coberturas: c.coberturas.map(cob => cob.id === cobId ? { ...cob, [campo]: valor } : cob)
      };
    }));
  };

  const adicionarCobertura = (cenarioId: string) => {
    setCenarios(prev => prev.map(c => {
      if (c.id !== cenarioId) return c;
      const nova: Cobertura = { id: Math.random().toString(36).substr(2, 9), nome: "Nova Cobertura", capital: 0 };
      return { ...c, coberturas: [...c.coberturas, nova] };
    }));
  };

  const removerCobertura = (cenarioId: string, cobId: string) => {
    setCenarios(prev => prev.map(c => c.id === cenarioId ? { ...c, coberturas: c.coberturas.filter(cob => cob.id !== cobId) } : c));
  };

  const atualizarResgate = (cenarioId: string, resgateId: string, campo: keyof Resgate, valor: any) => {
    setCenarios(prev => prev.map(c => {
      if (c.id !== cenarioId) return c;
      return {
        ...c,
        gradeResgate: c.gradeResgate.map(r => r.id === resgateId ? { ...r, [campo]: valor } : r)
      };
    }));
  };

  const adicionarLinhaResgate = (cenarioId: string) => {
    setCenarios(prev => prev.map(c => {
      if (c.id !== cenarioId) return c;
      const nova: Resgate = { id: Math.random().toString(36).substr(2, 9), periodo: "Novo Período", acumulado: 0, resgateEstimated: 0 };
      return { ...c, gradeResgate: [...c.gradeResgate, nova] };
    }));
  };

  const removerLinhaResgate = (cenarioId: string, resgateId: string) => {
    setCenarios(prev => prev.map(c => c.id === cenarioId ? { ...c, gradeResgate: c.gradeResgate.filter(r => r.id !== resgateId) } : c));
  };

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

  // ==========================================
  // FUNÇÃO AUXILIAR: FORMATAÇÃO MONETÁRIA SEGURA
  // ==========================================
  const renderizarMoedaSegura = (valor: any): string => {
    if (valor === undefined || valor === null || isNaN(Number(valor))) {
      return "R$ 0,00";
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor));
  };

  // ==========================================
  // PARTE 3: EXPORTAÇÃO DINÂMICA DO PDF
  // ==========================================
  const exportarPDFProposta = async () => {
    if (!dadosBase) return;

    const { proposta, cliente, corretor, corretora } = dadosBase;
    const isPaisagem = cenarios.length === 2;

    const doc = new jsPDF({
      orientation: isPaisagem ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margemBase = 15;

    const urlLogo = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogo = urlLogo ? await carregarImagemCache(urlLogo) : null;

    // Desenho do Cabeçalho Corporativo Unificado
    const renderHeader = (pageNumber: number) => {
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 36, "F");

      let textX = margemBase;
      if (imgLogo) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margemBase, 5, 32, 12, "F");
        doc.addImage(imgLogo, "PNG", margemBase + 1, 6, 30, 10);
        textX = 52;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(corretora?.tab_configuracoes_site?.nome_exibicao || "CORRETORA DE SEGUROS", textX, 13);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${corretora?.cnpj_corretora || "-"} | SUSEP: ${corretora?.registro_susep || "-"}`, textX, 19);
      doc.text(`Domínio: ${corretora?.tab_configuracoes_site?.dominio || "-"}`, textX, 24);

      const direitaX = pageWidth - 90;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`ESTUDO DE VIDA & PLANEJAMENTO Nº: ${proposta.numero_proposta || "-"}`, direitaX, 12);
      doc.text(`VALIDADE: ${proposta.data_validade ? formatarDataBR(proposta.data_validade) : "-"}`, direitaX, 16);

      doc.setDrawColor(71, 85, 105);
      doc.line(direitaX, 19, pageWidth - margemBase, 19);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Consultor: ${corretor?.nome || "-"} | Pág. ${pageNumber}`, direitaX, 23);
      doc.text(`E-mail: ${corretor?.email || "-"}`, direitaX, 27);
    };

    renderHeader(1);

    // Dados do Segurado
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMAÇÕES DO PROPONENTE / SEGURADO", margemBase, 44);
    doc.line(margemBase, 46, pageWidth - margemBase, 46);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const isClientePJ = cliente?.tipo_cliente === "PJ";
    doc.text(`Nome/Razão Social: ${isClientePJ ? cliente?.razao_social : cliente?.nome || "-"}`, margemBase, 52);
    doc.text(`CPF/CNPJ: ${isClientePJ ? cliente?.cnpj : cliente?.cpf || "-"}`, margemBase, 57);
    doc.text(`WhatsApp/Telefone: ${cliente?.telefone_whats || "-"} | Email: ${cliente?.email || "-"}`, margemBase, 62);

    let startY = 68;

    if (!isPaisagem) {
      // ==========================================
      // RELATÓRIO RETRATO - 1 CENÁRIO
      // ==========================================
      const cenario = cenarios[0];

      doc.setFillColor(248, 250, 252);
      doc.rect(margemBase, startY, pageWidth - (margemBase * 2), 24, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margemBase, startY, pageWidth - (margemBase * 2), 24, "S");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Configuração: ${cenario.nome}`, margemBase + 4, startY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Público Alvo: ${cenario.tipoOperacao} | Tipo de Modelo: ${cenario.resgatavel ? "Resgatável" : "Puro / Tradicional"}`, margemBase + 4, startY + 12);
      doc.text(`Prazo de Quitação: ${cenario.prazoPagamento === "Anual" ? `${cenario.prazoAnos} Anos` : cenario.prazoPagamento} | Frequência de Cobrança: ${cenario.frequenciaPagamento}`, margemBase + 4, startY + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(126, 34, 206);
      doc.text(`Aporte/Prêmio: ${renderizarMoedaSegura(cenario.valorPremio)}`, pageWidth - 85, startY + 14);

      startY += 30;

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("COBERTURAS CONTRATADAS", margemBase, startY);
      
      const headCob = [["Garantias e Benefícios Inclusos", "Capital Segurado (R$)"]];
      const bodyCob = cenario.coberturas.map(c => [c.nome, renderizarMoedaSegura(c.capital)]);

      autoTable(doc, {
        startY: startY + 2,
        margin: { left: margemBase, right: margemBase },
        head: headCob,
        body: bodyCob,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], fontStyle: "bold", fontSize: 8.5 },
        columnStyles: { 0: { halign: "left" }, 1: { halign: "right", fontStyle: "bold", cellWidth: 50 } },
        styles: { fontSize: 8.5, cellPadding: 2.5 }
      });

      startY = (doc as any).lastAutoTable.finalY + 10;

      if (cenario.resgatavel) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("PROJEÇÃO E SIMULAÇÃO DE RESGATES ATUARIAIS", margemBase, startY);

        const headRes = [["Marco Temporal", "Aporte Acumulado Bruto", "Valor de Resgate Estimado"]];
        const bodyRes = cenario.gradeResgate.map(r => [r.periodo, renderizarMoedaSegura(r.acumulado), renderizarMoedaSegura(r.resgateEstimated)]);

        autoTable(doc, {
          startY: startY + 2,
          margin: { left: margemBase, right: margemBase },
          head: headRes,
          body: bodyRes,
          theme: "grid",
          headStyles: { fillColor: [4, 120, 87], fontStyle: "bold", fontSize: 8.5 },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "right" }, 2: { halign: "right", fontStyle: "bold" } },
          styles: { fontSize: 8.5, cellPadding: 2.5 }
        });

        startY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text("Os valores de resgate são meramente ilustrativos e serão corrigidos oficialmente pelo IPCA/inflação conforme condições da seguradora.", margemBase, startY);
      }

    } else {
      // ==========================================
      // RELATÓRIO PAISAGEM - 2 CENÁRIOS LADO A LADO
      // ==========================================
      const larguraColuna = (pageWidth - (margemBase * 3)) / 2;

      cenarios.forEach((cenario, idx) => {
        const colunaX = margemBase + (idx * (larguraColuna + margemBase));
        let cY = startY;

        doc.setFillColor(248, 250, 252);
        doc.rect(colunaX, cY, larguraColuna, 26, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(colunaX, cY, larguraColuna, 26, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(cenario.nome, colunaX + 4, cY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Operação: ${cenario.tipoOperacao} | Estrutura: ${cenario.resgatavel ? "Resgatável" : "Puro"}`, colunaX + 4, cY + 12);
        doc.text(`Prazo: ${cenario.prazoPagamento} | Frequência: ${cenario.frequenciaPagamento}`, colunaX + 4, cY + 17);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(126, 34, 206);
        doc.text(`Aporte Total: ${renderizarMoedaSegura(cenario.valorPremio)}`, colunaX + 4, cY + 22);

        cY += 32;

        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`Coberturas - ${cenario.nome}`, colunaX, cY);

        const headC = [["Garantia", "Capital"]];
        const bodyC = cenario.coberturas.map(c => [c.nome, renderizarMoedaSegura(c.capital)]);

        autoTable(doc, {
          startY: cY + 2,
          margin: { left: colunaX, right: pageWidth - (colunaX + larguraColuna) },
          head: headC,
          body: bodyC,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "right", cellWidth: 32 } },
          styles: { fontSize: 8, cellPadding: 2 }
        });

        cY = (doc as any).lastAutoTable.finalY + 8;

        if (cenario.resgatavel) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(4, 120, 87);
          doc.text(`Resgate Estimado - ${cenario.nome}`, colunaX, cY);

          const headR = [["Período", "Acumulado", "Disponível"]];
          const bodyR = cenario.gradeResgate.map(r => [r.periodo, renderizarMoedaSegura(r.acumulado), renderizarMoedaSegura(r.resgateEstimated)]);

          autoTable(doc, {
            startY: cY + 2,
            margin: { left: colunaX, right: pageWidth - (colunaX + larguraColuna) },
            head: headR,
            body: bodyR,
            theme: "grid",
            headStyles: { fillColor: [4, 120, 87], fontSize: 8 },
            columnStyles: { 0: { halign: "center" }, 1: { halign: "right" }, 2: { halign: "right" } },
            styles: { fontSize: 8, cellPadding: 2 }
          });
        }
      });

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("Nota: Os valores projetados acima são meramente ilustrativos baseados em regras atuariais vigentes das seguradoras, atualizados por índices oficiais.", margemBase, doc.internal.pageSize.getHeight() - 12);
    }

    doc.save(`Planejamento_Financeiro_Vida_${proposta.numero_proposta || "Preview"}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="font-medium text-gray-700">Construindo cenários patrimoniais...</span>
        </div>
      </div>
    );
  }

  const { proposta, cliente, corretor, corretora } = dadosBase || {};
  const isPJ = cliente?.tipo_cliente === "PJ";

return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto">
      <div className="max-w-[95vw] mx-auto my-8 bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col min-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20 border-b border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <HeartPulse className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Planejamento de Vida & Previdência</h2>
              <p className="text-sm text-slate-400">Modelagem e Comparação de Cenários</p>
            </div>
          </div>
          <div className="flex gap-3">
            {cenarios.length < 2 && (
              <button onClick={() => clonarCenario(cenarios[0])} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                <Copy className="h-4 w-4" /> + Novo Cenário Comparativo
              </button>
            )}
            <button onClick={exportarPDFProposta} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Printer className="h-4 w-4" /> Gerar PDF Customizado
            </button>
            <button onClick={onClose} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <X className="h-4 w-4" /> Fechar
            </button>
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* Informações Básicas */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
            <div className="flex gap-6 items-center">
              {corretora?.tab_configuracoes_site?.logo_url ? (
                <div className="h-20 w-40 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center p-2">
                  <img src={corretora.tab_configuracoes_site.logo_url} alt="Logo Corretora" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-20 w-40 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{corretora?.tab_configuracoes_site?.nome_exibicao || "Sua Corretora"}</h1>
                <p className="text-sm text-slate-500 mt-1">CNPJ: {corretora?.cnpj_corretora || "-"}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 mb-2">
                <p className="text-sm font-semibold text-slate-700">PROPOSTA Nº</p>
                <p className="text-lg font-bold text-purple-600">{proposta?.numero_proposta || "N/D"}</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">Cliente: {isPJ ? cliente?.razao_social : cliente?.nome || "-"}</p>
              <p className="text-sm text-slate-600">Consultor: {corretor?.nome || "-"}</p>
            </div>
          </div>

          {/* GRID DINÂMICO DE CENÁRIOS */}
          <div className={`grid gap-8 items-start ${cenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
            {cenarios.map((cenario, index) => (
              <div key={cenario.id} className="bg-white border-2 border-slate-200 rounded-2xl shadow-md overflow-hidden flex flex-col">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                      {index === 0 ? 'A' : 'B'}
                    </div>
                    <input
                      type="text"
                      className="text-lg font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 p-0 focus:ring-0 outline-none w-56"
                      value={cenario.nome}
                      onChange={(e) => atualizarCenario(cenario.id, "nome", e.target.value)}
                    />
                  </div>
                  {index > 0 && (
                    <button onClick={() => removerCenario(cenario.id)} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-8 flex-1">
                  {/* CONFIGURAÇÃO DO CENÁRIO */}
                  <div className="space-y-5 bg-slate-50 p-5 rounded-xl border border-slate-200/60">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Estrutura de Arquitetura da Apólice
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Público</label>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                          {["PF", "PJ"].map((tipo) => (
                            <button key={tipo} onClick={() => atualizarCenario(cenario.id, "tipoOperacao", tipo)}
                              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${cenario.tipoOperacao === tipo ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                              {tipo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Modelo de Solução</label>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                          <button onClick={() => atualizarCenario(cenario.id, "resgatavel", false)}
                            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${!cenario.resgatavel ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            Sem Resgate
                          </button>
                          <button onClick={() => atualizarCenario(cenario.id, "resgatavel", true)}
                            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${cenario.resgatavel ? "bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            Resgatável
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Prazo de Pagamento</label>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                          {["Mensal", "Anual", "Vitalício"].map((prazo) => (
                            <button key={prazo} onClick={() => atualizarCenario(cenario.id, "prazoPagamento", prazo)}
                              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${cenario.prazoPagamento === prazo ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                              {prazo}
                            </button>
                          ))}
                        </div>
                        {cenario.prazoPagamento === "Anual" && (
                          <div className="mt-2 flex items-center gap-2 bg-white p-1.5 border border-slate-300 rounded-md">
                            <span className="text-xs text-slate-500 whitespace-nowrap">Tempo (Anos):</span>
                            <input type="number" className="w-16 p-0 text-sm font-bold text-slate-800 text-center border-none focus:ring-0 outline-none" value={cenario.prazoAnos} onChange={(e) => atualizarCenario(cenario.id, "prazoAnos", Number(e.target.value))} />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Frequência da Cobrança</label>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                          {["Mensal", "Anual", "Única"].map((freq) => (
                            <button key={freq} onClick={() => atualizarCenario(cenario.id, "frequenciaPagamento", freq)}
                              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${cenario.frequenciaPagamento === freq ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                              {freq}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* APORTE GLOBAL CORRIGIDO */}
                    <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                        Valor do Aporte do Cenário ({cenario.frequenciaPagamento})
                    </label>
                    <div className="relative">
                        <input
                        type="text"
                        className="w-full pl-4 pr-4 py-2 border-2 border-purple-200 focus:border-purple-500 rounded-lg text-lg font-black text-slate-800 outline-none bg-white"
                        value={maskCurrency(cenario.valorPremio.toFixed(2))}
                        onChange={(e) => {
                            const valorFormatado = maskCurrency(e.target.value);
                            atualizarCenario(cenario.id, "valorPremio", parseCurrencyToNumber(valorFormatado));
                        }}
                        />
                    </div>
                    </div>
                  </div>

                  {/* COBERTURAS E ASSISTÊNCIAS CORRIGIDAS */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-slate-800">Garantias e Benefícios Inclusos</h3>
                      <button onClick={() => adicionarCobertura(cenario.id)} className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold bg-purple-50 px-2 py-1 rounded">
                        <Plus className="h-3 w-3" /> Adicionar Garantia
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-200 text-xs uppercase font-bold">
                          <tr>
                            <th className="p-2.5 w-7/12">Descrição da Cobertura</th>
                            <th className="p-2.5 text-right w-4/12">Capital Segurado (R$)</th>
                            <th className="p-2.5 w-1/12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {cenario.coberturas.map((cob) => (
                            <tr key={cob.id} className="hover:bg-slate-50">
                              <td className="p-2">
                                <input type="text" className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-400 focus:bg-slate-50 rounded px-1 py-1 text-xs text-slate-700" value={cob.nome} onChange={(e) => atualizarCobertura(cenario.id, cob.id, "nome", e.target.value)} />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-400 focus:bg-slate-50 rounded px-1 py-1 text-xs font-bold text-slate-800"
                                  value={maskCurrency(cob.capital.toFixed(2))}
                                  onChange={(e) => {
                                    const valorFormatado = maskCurrency(e.target.value);
                                    atualizarCobertura(cenario.id, cob.id, "capital", parseCurrencyToNumber(valorFormatado));
                                  }}
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button onClick={() => removerCobertura(cenario.id, cob.id)} className="text-slate-400 hover:text-red-500 p-1">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SIMULAÇÃO DE RESGATE CORRIGIDA E SINCRO_ALINHADA */}
                  {cenario.resgatavel && (
                    <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200 shadow-inner">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                          <Copy className="h-4 w-4" /> Projeção de Resgates Estimados
                        </h3>
                        <button onClick={() => adicionarLinhaResgate(cenario.id)} className="text-xs flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold bg-emerald-100 px-2 py-1 rounded">
                          <Plus className="h-3 w-3" /> Inserir Prazo
                        </button>
                      </div>
                      
                      <table className="w-full text-left text-sm mb-3">
                        <thead className="border-b border-emerald-200 text-emerald-800 text-xs uppercase font-bold">
                          <tr>
                            <th className="pb-2 w-1/3">Marco Temporal</th>
                            <th className="pb-2 text-right">Aporte Acumulado</th>
                            <th className="pb-2 text-right">Resgate Estimado</th>
                            <th className="pb-2 w-6 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-200">
                          {cenario.gradeResgate.map((resgate) => (
                            <tr key={resgate.id}>
                              <td className="py-2">
                                <input type="text" className="w-full bg-white border border-emerald-200 focus:border-emerald-500 rounded px-2 py-1 text-xs text-slate-700" value={resgate.periodo} onChange={(e) => atualizarResgate(cenario.id, resgate.id, "periodo", e.target.value)} placeholder="Ex: Ano 10" />
                              </td>
                              {/* INPUT 1: APORTE ACUMULADO */}
                              <td className="py-2 pl-2">
                                <input
                                  type="text"
                                  className="w-full text-right bg-white border border-emerald-200 focus:border-emerald-500 rounded px-2 py-1 text-xs font-medium text-slate-800"
                                  value={maskCurrency(resgate.acumulado.toFixed(2))}
                                  onChange={(e) => {
                                    const valorFormatado = maskCurrency(e.target.value);
                                    atualizarResgate(cenario.id, resgate.id, "acumulado", parseCurrencyToNumber(valorFormatado));
                                  }}
                                />
                              </td>
                              {/* INPUT 2: RESGATE ESTIMADO */}
                              <td className="py-2 pl-2">
                                <input
                                  type="text"
                                  className="w-full text-right bg-white border border-emerald-300 focus:border-emerald-600 rounded px-2 py-1 text-xs font-black text-emerald-700"
                                  value={maskCurrency(resgate.resgateEstimated.toFixed(2))}
                                  onChange={(e) => {
                                    const valorFormatado = maskCurrency(e.target.value);
                                    atualizarResgate(cenario.id, resgate.id, "resgateEstimated", parseCurrencyToNumber(valorFormatado));
                                  }}
                                />
                              </td>
                              <td className="py-2 text-right">
                                <button onClick={() => removerLinhaResgate(cenario.id, resgate.id)} className="text-emerald-400 hover:text-red-500 ml-1">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex gap-2 items-start text-emerald-800/90 bg-white p-2.5 rounded-lg border border-emerald-200 text-xs">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                        <p>Os valores de resgate são meramente ilustrativos e serão corrigidos oficialmente pelo IPCA/inflação conforme as condições gerais da seguradora escolhida.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}