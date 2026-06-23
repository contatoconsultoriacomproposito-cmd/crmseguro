import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Building2, User, Smile, CheckCircle2, Users, FileCheck2, Calculator } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

interface ModeloCotacaoDentalProps {
  propostaId: string;
  onClose: () => void;
}

const GRUPOS_ELEGIVEIS = [
  "Sócios e Diretores",
  "Funcionários",
  "Estagiários",
  "Administradores",
  "Sócios, Diretores e Funcionários"
];

const MODALIDADES = ["Compulsório", "Opcional"];

const TODAS_COBERTURAS = [
  "Consultas e emergências",
  "Restaurações",
  "Limpeza e aplicação de flúor",
  "Documentação ortodôntica completa",
  "Prótese dentária",
  "Ortodontia",
  "Clareamento em Gel"
];

export default function ModeloCotacaoDental({ propostaId, onClose }: ModeloCotacaoDentalProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);

  // Estados Específicos do Plano Dental
  const [grupoSelecionado, setGrupoSelecionado] = useState(GRUPOS_ELEGIVEIS[4]);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(MODALIDADES[0]);
  const [qtdPessoas, setQtdPessoas] = useState<number>(1);

  // Valores padrão editáveis dos planos
  const [valores, setValores] = useState({
    premiumTop1: 110.44,
    padraoDocWhite: 47.42,
    padraoDoc1: 27.42
  });

  const planosConfig = {
    premiumTop1: {
      nome: "Premium TOP 1",
      cor: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      coberturas: [
        "Consultas e emergências", "Restaurações", "Limpeza e aplicação de flúor",
        "Documentação ortodôntica completa", "Prótese dentária", "Ortodontia"
      ]
    },
    padraoDocWhite: {
      nome: "Padrão Doc White",
      cor: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      coberturas: [
        "Consultas e emergências", "Restaurações", "Limpeza e aplicação de flúor",
        "Documentação ortodôntica completa", "Prótese dentária", "Clareamento em Gel"
      ]
    },
    padraoDoc1: {
      nome: "Padrão Doc 1",
      cor: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      coberturas: [
        "Consultas e emergências", "Restaurações", "Limpeza e aplicação de flúor",
        "Documentação ortodôntica completa", "Prótese dentária"
      ]
    }
  };

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
      console.error("Erro ao estruturar cotação dental:", error);
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
  // EXPORTAÇÃO DO PDF - COTAÇÃO DENTAL
  // =======================================================================
  const exportarPDFProposta = async () => {
    if (!dadosBase) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const { proposta, cliente, corretor, corretora } = dadosBase;

    const urlLogoCorretora = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogoCorretora = urlLogoCorretora ? await carregarImagemCache(urlLogoCorretora) : null;

    // Cabeçalho Principal (Idêntico ao Saúde)
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
    doc.text(`PROPOSTA ODONTO Nº: ${proposta.numero_proposta || "-"}`, colunaDireitaX, 12);
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
    doc.text("DADOS DO SEGURADO E CONFIGURAÇÃO DA COTAÇÃO", 15, 46);
    doc.line(15, 48, 195, 48);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const isPJ = cliente?.tipo_cliente === "PJ";
    doc.text(`Nome/Razão Social: ${isPJ ? cliente?.razao_social : cliente?.nome || "-"}`, 15, 54);
    doc.text(`CPF/CNPJ: ${isPJ ? cliente?.cnpj : cliente?.cpf || "-"}`, 15, 59);
    doc.text(`Contato: ${cliente?.telefone_whats || "-"} | ${cliente?.email || "-"}`, 15, 64);
    
    // Configurações do Grupo Elegível
    doc.setFont("helvetica", "bold");
    doc.text(`Grupo Elegível:`, 130, 54);
    doc.setFont("helvetica", "normal");
    doc.text(`${grupoSelecionado}`, 155, 54);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Modalidade:`, 130, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${modalidadeSelecionada}`, 155, 59);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Qtd. Vidas:`, 130, 64);
    doc.setFont("helvetica", "normal");
    doc.text(`${qtdPessoas} pessoa(s)`, 155, 64);

    // QUADRO COMPARATIVO
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("QUADRO COMPARATIVO DE PLANOS", 15, 76);
    doc.line(15, 78, 195, 78);

    // Definição corrigida com "as const" para satisfazer a tipagem estrita do jsPDF
    // Forçamos explicitamente como any[] para ignorar o conflito de tipos de cores da biblioteca
    const tableHead: any[] = [
      [
        { content: "COBERTURAS / BENEFÍCIOS", styles: { halign: "left", fillColor: [30, 41, 59] } },
        { content: "PREMIUM TOP 1", styles: { halign: "center", fillColor: [217, 119, 6] } },
        { content: "PADRÃO DOC WHITE", styles: { halign: "center", fillColor: [29, 78, 216] } },
        { content: "PADRÃO DOC 1", styles: { halign: "center", fillColor: [16, 185, 129] } }
      ]
    ];

    const tableBody: any[] = [];

    // Linhas de Valores
    tableBody.push([
      { content: "Valor Unitário Mensal", styles: { fontStyle: "bold", textColor: [71, 85, 105] } },
      { content: formatarMoeda(valores.premiumTop1), styles: { halign: "center", fontStyle: "bold" } },
      { content: formatarMoeda(valores.padraoDocWhite), styles: { halign: "center", fontStyle: "bold" } },
      { content: formatarMoeda(valores.padraoDoc1), styles: { halign: "center", fontStyle: "bold" } }
    ]);

    tableBody.push([
      { content: `Valor Total Mensal (${qtdPessoas} vidas)`, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
      { content: formatarMoeda(valores.premiumTop1 * qtdPessoas), styles: { halign: "center", fontStyle: "bold", fillColor: [241, 245, 249] } },
      { content: formatarMoeda(valores.padraoDocWhite * qtdPessoas), styles: { halign: "center", fontStyle: "bold", fillColor: [241, 245, 249] } },
      { content: formatarMoeda(valores.padraoDoc1 * qtdPessoas), styles: { halign: "center", fontStyle: "bold", fillColor: [241, 245, 249] } }
    ]);

    // Linha em branco separadora
    tableBody.push([{ content: "COBERTURAS INCLUSAS", colSpan: 4, styles: { fillColor: [248, 250, 252], fontStyle: "bold", textColor: [100, 116, 139] } }]);

    // Matriz de Coberturas
    TODAS_COBERTURAS.forEach(cobertura => {
      tableBody.push([
        cobertura,
        { content: planosConfig.premiumTop1.coberturas.includes(cobertura) ? "Incluso" : "-", styles: { halign: "center", textColor: planosConfig.premiumTop1.coberturas.includes(cobertura) ? [22, 101, 52] : [148, 163, 184] } },
        { content: planosConfig.padraoDocWhite.coberturas.includes(cobertura) ? "Incluso" : "-", styles: { halign: "center", textColor: planosConfig.padraoDocWhite.coberturas.includes(cobertura) ? [22, 101, 52] : [148, 163, 184] } },
        { content: planosConfig.padraoDoc1.coberturas.includes(cobertura) ? "Incluso" : "-", styles: { halign: "center", textColor: planosConfig.padraoDoc1.coberturas.includes(cobertura) ? [22, 101, 52] : [148, 163, 184] } }
      ]);
    });

    // Chamamos o autoTable passando as variáveis tipadas frouxamente como any
    autoTable(doc, {
      startY: 82,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3, valign: "middle", lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { textColor: 255, fontStyle: "bold" },
      didDrawCell: (data) => {
        if (data.column.index > 0) {
          const docCanvas = data.doc;
          const posX = data.cell.x;
          const startY = data.cell.y;
          const endY = data.cell.y + data.cell.height;

          docCanvas.setDrawColor(255, 255, 255); 
          docCanvas.setLineWidth(2.0);
          docCanvas.line(posX, startY, posX, endY);
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Esta proposta segue as diretrizes da ANS e as Condições Gerais da Operadora/Seguradora escolhida.", 15, currentY);
    doc.text("Os valores apresentados estão sujeitos à análise técnica e alteração sem aviso prévio.", 15, currentY + 4);

    doc.save(`Proposta_Odonto_${proposta.numero_proposta || "Preview"}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="font-medium text-gray-700">Carregando espelho odontológico...</span>
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
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Smile className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Espelho de Cotação - Odonto</h2>
              <p className="text-sm text-slate-300">Construção de Proposta Comercial</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportarPDFProposta}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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
          {/* CABEÇALHO DO DOCUMENTO (IDÊNTICO AO SAÚDE) */}
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
                <p className="text-lg font-bold text-emerald-600">{proposta?.numero_proposta || "N/D"}</p>
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
              <User className="h-5 w-5 text-emerald-600" />
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

          {/* PARÂMETROS DA COTAÇÃO (NOVOS REQUISITOS) */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Parâmetros da Cotação</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Grupo Elegível */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700 mb-3">1. Grupo Elegível</p>
                <div className="flex flex-wrap gap-2">
                  {GRUPOS_ELEGIVEIS.map(grupo => (
                    <button
                      key={grupo}
                      onClick={() => setGrupoSelecionado(grupo)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        grupoSelecionado === grupo 
                          ? "bg-emerald-600 text-white border-emerald-600" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {grupo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modalidade e Vidas */}
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700 mb-3">2. Modalidade de Adesão</p>
                  <div className="flex gap-2">
                    {MODALIDADES.map(mod => (
                      <button
                        key={mod}
                        onClick={() => setModalidadeSelecionada(mod)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          modalidadeSelecionada === mod 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">3. Quantidade de Vidas</p>
                    <p className="text-xs text-slate-500">Total de pessoas no plano</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      value={qtdPessoas}
                      onChange={(e) => setQtdPessoas(parseInt(e.target.value) || 1)}
                      className="w-20 text-center border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-emerald-500 font-bold text-lg text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* QUADRO COMPARATIVO DE PLANOS */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Quadro Comparativo de Planos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Iterando sobre a configuração dos planos */}
              {(Object.keys(planosConfig) as Array<keyof typeof planosConfig>).map((chave) => {
                const plano = planosConfig[chave];
                const valorAtual = valores[chave];
                
                return (
                  <div key={chave} className={`bg-white border-2 rounded-xl overflow-hidden flex flex-col shadow-sm ${plano.border}`}>
                    {/* Header do Card */}
                    <div className={`${plano.bg} p-4 border-b ${plano.border} text-center`}>
                      <h4 className={`text-lg font-black uppercase tracking-wider ${plano.cor}`}>
                        {plano.nome}
                      </h4>
                    </div>
                    
                    {/* Valores */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Valor Unitário Mensal (R$)</p>
                        <input
                          type="number"
                          step="0.01"
                          value={valorAtual}
                          onChange={(e) => setValores({ ...valores, [chave]: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Valor Total ({qtdPessoas} Vidas)</p>
                        <p className="text-2xl font-black text-slate-800">
                          {formatarMoeda(valorAtual * qtdPessoas)}
                        </p>
                      </div>
                    </div>

                    {/* Coberturas */}
                    <div className="p-5 flex-1 bg-white">
                      <p className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Coberturas Inclusas:</p>
                      <ul className="space-y-3">
                        {plano.coberturas.map((cobertura, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${plano.cor}`} />
                            <span className="text-sm text-slate-600 leading-tight">{cobertura}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}