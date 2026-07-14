import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Building2, User, Smile, CheckCircle2, Users, FileCheck2, Calculator, MapPin, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";
import logoBradescoDental from './img/logo_bradesco_dental.png';

interface ModeloCotacaoDentalProps {
  propostaId: string;
  onClose: () => void;
}

// 1. CRIAMOS A INTERFACE PARA RESOLVER O ERRO DO "corHex"
interface PlanoConfig {
  nome: string;
  cor: string;
  bg: string;
  border: string;
  coberturas: string[];
  corHex: [number, number, number];
}

// 2. CRIAMOS UM TIPO PARA AS CHAVES (Resolve o erro "chave implicitly has any type")
type ChavePlano = "premiumTop1" | "padraoDocWhite" | "padraoDoc1";

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
  const [valores, setValores] = useState<Record<ChavePlano, number>>({
    premiumTop1: 110.44,
    padraoDocWhite: 47.42,
    padraoDoc1: 27.42
  });

  // NOVO: Estado de planos ativos tipado e posicionado no topo
  const [planosAtivos, setPlanosAtivos] = useState<ChavePlano[]>(["premiumTop1", "padraoDocWhite", "padraoDoc1"]);

  // Função para alternar a visibilidade de um plano
  const togglePlano = (chave: ChavePlano) => {
    setPlanosAtivos(prev => 
      prev.includes(chave) ? prev.filter(p => p !== chave) : [...prev, chave]
    );
  };

  // 3. ADICIONAMOS A TIPAGEM E AS CORES RGB (corHex) NO CONFIG
  const planosConfig: Record<ChavePlano, PlanoConfig> = {
    premiumTop1: {
      nome: "Premium TOP 1",
      cor: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      coberturas: [
        "Consultas e emergências", "Restaurações", "Limpeza e aplicação de flúor",
        "Documentação ortodôntica completa", "Prótese dentária", "Ortodontia"
      ],
      corHex: [217, 119, 6] // Amber 600
    },
    padraoDocWhite: {
      nome: "Padrão Doc White",
      cor: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      coberturas: [
        "Consultas e emergências", "Restaurações", "Limpeza e aplicação de flúor",
        "Documentação ortodôntica completa", "Prótese dentária", "Clareamento em Gel"
      ],
      corHex: [37, 99, 235] // Blue 600
    },
    padraoDoc1: {
      nome: "Padrão Doc 1",
      cor: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      coberturas: [
        "Consultas e emergências", "Restaurações", "Limpeza e aplicação de flúor",
        "Documentação ortodôntica completa", "Prótese dentária"
      ],
      corHex: [5, 150, 105] // Emerald 600
    }
  };

  const [redePorCidade, setRedePorCidade] = useState([
    {
      id: "cidade-1",
      cidade: "Garopaba / SC",
      dentistas: [
        {
          id: "dent-1",
          nome: "Ana Carolina Neis Cifali",
          contato: "48 9199-3503",
          endereco: "Rua grp010, 150 - Centro",
          distancia: "0,033km"
        }
      ]
    }
  ]);

  // FUNÇÕES PARA GERENCIAR CIDADES
  const adicionarCidade = () => {
    setRedePorCidade([
      ...redePorCidade,
      { id: Date.now().toString(), cidade: "", dentistas: [] }
    ]);
  };

  const atualizarCidade = (idCidade: string, nome: string) => {
    setRedePorCidade(redePorCidade.map(c => c.id === idCidade ? { ...c, cidade: nome } : c));
  };

  const removerCidade = (idCidade: string) => {
    setRedePorCidade(redePorCidade.filter(c => c.id !== idCidade));
  };

  // FUNÇÕES PARA GERENCIAR DENTISTAS DENTRO DAS CIDADES
  const adicionarDentista = (idCidade: string) => {
    setRedePorCidade(redePorCidade.map(c => {
      if (c.id === idCidade) {
        return {
          ...c,
          dentistas: [...c.dentistas, { id: Date.now().toString(), nome: "", contato: "", endereco: "", distancia: "" }]
        };
      }
      return c;
    }));
  };

  const atualizarDentista = (idCidade: string, idDentista: string, campo: string, valor: string) => {
    setRedePorCidade(redePorCidade.map(c => {
      if (c.id === idCidade) {
        return {
          ...c,
          dentistas: c.dentistas.map(d => d.id === idDentista ? { ...d, [campo]: valor } : d)
        };
      }
      return c;
    }));
  };

  const removerDentista = (idCidade: string, idDentista: string) => {
    setRedePorCidade(redePorCidade.map(c => {
      if (c.id === idCidade) {
        return { ...c, dentistas: c.dentistas.filter(d => d.id !== idDentista) };
      }
      return c;
    }));
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

    // Filtragem dinâmica dos planos ativos
    const chavesAtivas = (Object.keys(planosConfig) as Array<ChavePlano>)
      .filter(k => planosAtivos.includes(k));

    const urlLogoCorretora = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogoCorretora = urlLogoCorretora ? await carregarImagemCache(urlLogoCorretora) : null;

    // Cabeçalho Principal
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 38, "F");
    
    let inicioTextoX = 15;
    if (imgLogoCorretora) {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 6, 42, 26, "F"); 
      const imgProps = doc.getImageProperties(imgLogoCorretora);
      const ratio = imgProps.width / imgProps.height;
      const maxWidth = 36;
      const maxHeight = 22;
      let finalWidth = maxWidth;
      let finalHeight = maxWidth / ratio;
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * ratio;
      }
      const centerX = 15 + (42 - finalWidth) / 2;
      const centerY = 6 + (26 - finalHeight) / 2;
      doc.addImage(imgLogoCorretora, "PNG", centerX, centerY, finalWidth, finalHeight);
      inicioTextoX = 62;
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

    // Coluna Direita Cabeçalho
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
    const nomeCliente = isPJ ? (cliente?.razao_social || "-") : (cliente?.nome || "-");
    const stringNomeCompleta = `Nome/Razão Social: ${nomeCliente}`;
    const linhasNome = doc.splitTextToSize(stringNomeCompleta, 110); 
    doc.text(linhasNome, 15, 54);
    let leftCurrentY = 54 + (linhasNome.length * 4); 
    doc.text(`CPF/CNPJ: ${isPJ ? cliente?.cnpj : cliente?.cpf || "-"}`, 15, leftCurrentY);
    leftCurrentY += 5;
    doc.text(`Contato: ${cliente?.telefone_whats || "-"} | ${cliente?.email || "-"}`, 15, leftCurrentY);
    doc.setFont("helvetica", "bold");
    doc.text(`Grupo Elegível:`, 130, 54);
    doc.setFont("helvetica", "normal");
    const linhasGrupo = doc.splitTextToSize(`${grupoSelecionado}`, 40);
    doc.text(linhasGrupo, 155, 54);
    let rightCurrentY = 54 + (linhasGrupo.length * 4);
    doc.setFont("helvetica", "bold");
    doc.text(`Modalidade:`, 130, rightCurrentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${modalidadeSelecionada}`, 155, rightCurrentY);
    rightCurrentY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Qtd. Vidas:`, 130, rightCurrentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${qtdPessoas} pessoa(s)`, 155, rightCurrentY);
    
    // ====================================================
    // ⚙️ PAINEL DE CONTROLE DA LOGO (EDITE APENAS OS NÚMEROS AQUI)
    // ====================================================
    const logoLargura = 80;     // Largura da logo em milímetros
    const logoAltura = 40;      // Altura da logo em milímetros
    const logoEixoX = 65;      // Posição Horizontal (Esquerda/Direita). Ex: 15=Esquerda, 85=Centro, 155=Direita
    const logoDistanciaY = 1;   // Distância vertical em relação aos dados de cima (Aumente para descer, diminua para subir)
    const folgaAbaixoLogo = 1;  // Espaço extra entre o fim da logo e o título do Quadro Comparativo
    // ====================================================

    // 1. Pega o ponto onde os textos de dados terminaram
    let currentYAfterDados = Math.max(leftCurrentY, rightCurrentY);

    // 2. Insere a logo Bradesco usando as variáveis acima
    try {
      doc.addImage(
        logoBradescoDental, 
        'PNG', 
        logoEixoX, 
        currentYAfterDados + logoDistanciaY, 
        logoLargura, 
        logoAltura
      );
      
      // MÁGICA 100% DINÂMICA: O sistema calcula o tamanho real da logo + as distâncias que você definiu
      currentYAfterDados += logoDistanciaY + logoAltura + folgaAbaixoLogo; 
      
    } catch (error) {
      console.error("Erro ao renderizar a logo da operadora no PDF:", error);
      currentYAfterDados += 15; // Fallback seguro caso a imagem falhe
    }

    // 3. O quadro comparativo começa baseado no valor calculado dinamicamente
    const quadroComparativoY = currentYAfterDados;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("QUADRO COMPARATIVO DE PLANOS", 15, quadroComparativoY);
    doc.line(15, quadroComparativoY + 2, 195, quadroComparativoY + 2);

    // Head Dinâmico
    const tableHead: any[] = [[
      { content: "COBERTURAS / BENEFÍCIOS", styles: { halign: "left", fillColor: [30, 41, 59] } },
      ...chavesAtivas.map(k => ({ 
        content: planosConfig[k].nome.toUpperCase(), 
        styles: { halign: "center", fillColor: planosConfig[k].corHex } 
      }))
    ]];

    const tableBody: any[] = [];

    // Linhas de Valores Dinâmicas
    tableBody.push([
      { content: "Valor Unitário Mensal", styles: { fontStyle: "bold", textColor: [71, 85, 105] } },
      ...chavesAtivas.map(k => ({ content: formatarMoeda(valores[k]), styles: { halign: "center", fontStyle: "bold" } }))
    ]);

    tableBody.push([
      { content: `Valor Total Mensal (${qtdPessoas} vidas)`, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
      ...chavesAtivas.map(k => ({ content: formatarMoeda(valores[k] * qtdPessoas), styles: { halign: "center", fontStyle: "bold", fillColor: [241, 245, 249] } }))
    ]);

    tableBody.push([{ content: "COBERTURAS INCLUSAS", colSpan: chavesAtivas.length + 1, styles: { fillColor: [248, 250, 252], fontStyle: "bold", textColor: [100, 116, 139] } }]);

    TODAS_COBERTURAS.forEach(cobertura => {
      tableBody.push([
        cobertura,
        ...chavesAtivas.map(k => ({ 
          content: planosConfig[k].coberturas.includes(cobertura) ? "Incluso" : "-", 
          styles: { halign: "center", textColor: planosConfig[k].coberturas.includes(cobertura) ? [22, 101, 52] : [148, 163, 184] } 
        }))
      ]);
    });

    autoTable(doc, {
      startY: quadroComparativoY + 6,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3, valign: "middle", lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { textColor: 255, fontStyle: "bold" }
    });

    // Rede Referenciada no PDF
    let currentY = (doc as any).lastAutoTable.finalY + 15;

    if (redePorCidade.length > 0 && redePorCidade.some(c => c.dentistas.length > 0)) {
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.setFont("helvetica", "bold");
      doc.text("EXEMPLO DE REDE REFERENCIADA", 15, currentY);
      doc.line(15, currentY + 2, 195, currentY + 2);

      const redeHead = [["Nome do Dentista", "Contato", "Endereço", "Distância"]];
      const redeBody: any[] = [];

      redePorCidade.forEach(cidade => {
        if (cidade.dentistas.length > 0 || cidade.cidade) {
           redeBody.push([
             { 
               content: `CIDADE: ${cidade.cidade.toUpperCase() || "NÃO INFORMADA"}`, 
               colSpan: 4, 
               styles: { fillColor: [241, 245, 249], fontStyle: "bold", textColor: [15, 23, 42] } 
             }
           ]);
           
           cidade.dentistas.forEach(dent => {
             redeBody.push([
               { content: dent.nome || "-" },
               { content: dent.contato || "-" },
               { content: dent.endereco || "-" },
               { content: dent.distancia || "-", styles: { halign: 'center', fontStyle: 'italic' } }
             ]);
           });
        }
      });

      autoTable(doc, {
        startY: currentY + 6,
        margin: { left: 15, right: 15 },
        head: redeHead,
        body: redeBody,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 4, valign: "middle", lineColor: [226, 232, 240], lineWidth: 0.1 },
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 35 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

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

          {/* LOGO DA OPERADORA (BRADESCO DENTAL) */}
          <div className="flex justify-center mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-center h-40 w-96 transition-all hover:shadow-md">
              <img
                src={logoBradescoDental} // <-- Usando a variável importada aqui
                alt="Bradesco Dental"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          {/* DADOS DO SEGURADO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
              <User className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Dados do Segurado (Titular/Empresa)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome / Razão Social</p>
                <p className="font-medium text-slate-800 text-sm break-words whitespace-normal">
                  {isPJ ? cliente?.razao_social : cliente?.nome || "-"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CPF / CNPJ</p>
                <p className="font-medium text-slate-800 text-sm break-all">
                  {isPJ ? cliente?.cnpj : cliente?.cpf || "-"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contato</p>
                <p className="font-medium text-slate-800 text-sm break-words whitespace-normal">
                  {cliente?.telefone_whats || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* PARÂMETROS DA COTAÇÃO */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Parâmetros da Cotação</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
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
              {(Object.keys(planosConfig) as Array<keyof typeof planosConfig>).map((chave) => {
                const plano = planosConfig[chave];
                const valorAtual = valores[chave];
                const isAtivo = planosAtivos.includes(chave);
                
                return (
                  <div key={chave} className={`bg-white border-2 rounded-xl overflow-hidden flex flex-col shadow-sm transition-all relative ${isAtivo ? plano.border : 'opacity-40 grayscale border-slate-200'}`}>
                    
                    {/* BOTÕES DE CONTROLE NO TOPO DO CARD */}
                    <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                      {/* Botão Ativar/Desativar */}
                      <button 
                        onClick={() => togglePlano(chave)}
                        title={isAtivo ? "Desativar Plano" : "Ativar Plano"}
                        className={`p-1.5 rounded-full transition-colors ${
                          isAtivo 
                            ? 'bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30' 
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {isAtivo ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>

                      {/* Botão de Excluir Plano (Remove da proposta) */}
                      <button 
                        onClick={() => {
                          if (isAtivo) {
                            togglePlano(chave); // Se estiver ativo, remove dos ativos
                          }
                          // Opcional: Se sua lógica tiver uma lista de exibição/exclusão física, você manipula aqui
                        }}
                        title="Excluir Plano da Proposta"
                        className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className={`${plano.bg} p-4 pr-20 border-b ${plano.border} text-left`}>
                      <h4 className={`text-base font-black uppercase tracking-wider ${plano.cor}`}>
                        {plano.nome}
                      </h4>
                    </div>
                    
                    <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Valor Unitário Mensal (R$)</p>
                        <input
                          type="number"
                          step="0.01"
                          value={valorAtual}
                          disabled={!isAtivo}
                          onChange={(e) => setValores({ ...valores, [chave]: parseFloat(e.target.value) || 0 })}
                          className={`w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors ${!isAtivo && 'bg-slate-100 text-slate-400'}`}
                        />
                      </div>
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Valor Total ({qtdPessoas} Vidas)</p>
                        <p className={`text-2xl font-black ${isAtivo ? 'text-slate-800' : 'text-slate-500'}`}>
                          {formatarMoeda(valorAtual * qtdPessoas)}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 flex-1 bg-white">
                      <p className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Coberturas Inclusas:</p>
                      <ul className="space-y-3">
                        {plano.coberturas.map((cobertura, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isAtivo ? plano.cor : 'text-slate-400'}`} />
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

          {/* NOVA SEÇÃO: REDE REFERENCIADA SIMPLIFICADA POR CIDADE */}
          <div className="mt-12 mb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-800">Rede Referenciada</h3>
              </div>
              <button
                onClick={adicionarCidade}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus className="h-4 w-4" /> Adicionar Cidade
              </button>
            </div>

            <div className="space-y-6">
              {redePorCidade.map((cidade) => (
                <div key={cidade.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  
                  {/* BARRA DA CIDADE */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Cidade:</span>
                      <input
                        type="text"
                        value={cidade.cidade}
                        onChange={(e) => atualizarCidade(cidade.id, e.target.value)}
                        placeholder="Ex: Garopaba / SC"
                        className="bg-white border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-md px-3 py-1.5 font-bold text-slate-800 outline-none w-full md:w-80 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adicionarDentista(cidade.id)}
                        className="flex items-center gap-1.5 text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-md font-semibold hover:bg-rose-100 border border-rose-100 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Adicionar Dentista
                      </button>
                      <button
                        onClick={() => removerCidade(cidade.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remover Cidade Inteira"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* TABELA DE DENTISTAS DESTA CIDADE */}
                  <div>
                    {cidade.dentistas.length > 0 && (
                      <div className="bg-[#e10032] text-white font-bold text-xs grid grid-cols-12 gap-4 px-4 py-2">
                        <div className="col-span-4">Nome do Dentista</div>
                        <div className="col-span-3">Contato</div>
                        <div className="col-span-3">Endereço</div>
                        <div className="col-span-1 text-center">Dist.</div>
                        <div className="col-span-1 text-center">Ação</div>
                      </div>
                    )}
                    
                    <div className="divide-y divide-slate-100">
                      {cidade.dentistas.map((dent) => (
                        <div key={dent.id} className="grid grid-cols-12 gap-4 px-4 py-2 items-center hover:bg-slate-50 transition-colors">
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={dent.nome}
                              onChange={e => atualizarDentista(cidade.id, dent.id, 'nome', e.target.value)}
                              placeholder="Nome do Dentista"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 text-sm font-medium text-slate-800 outline-none px-1 py-0.5"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={dent.contato}
                              onChange={e => atualizarDentista(cidade.id, dent.id, 'contato', e.target.value)}
                              placeholder="Telefone / Whats"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 text-sm text-slate-600 outline-none px-1 py-0.5"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={dent.endereco}
                              onChange={e => atualizarDentista(cidade.id, dent.id, 'endereco', e.target.value)}
                              placeholder="Endereço Completo"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 text-sm text-slate-600 outline-none px-1 py-0.5"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <input
                              type="text"
                              value={dent.distancia}
                              onChange={e => atualizarDentista(cidade.id, dent.id, 'distancia', e.target.value)}
                              placeholder="0km"
                              className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 text-xs italic text-slate-500 outline-none px-1 py-0.5"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => removerDentista(cidade.id, dent.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {cidade.dentistas.length === 0 && (
                      <div className="text-center py-6 text-sm text-slate-400 bg-white">
                        Nenhum dentista adicionado nesta cidade.
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {redePorCidade.length === 0 && (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  Nenhuma cidade cadastrada na rede referenciada. Clique no botão acima para começar.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}