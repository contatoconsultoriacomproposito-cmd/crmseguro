import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, User, Building2, MapPin, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

interface ModeloCotacaoResidencialProps {
  propostaId: string;
  onClose: () => void;
}

interface LinhaCobertura {
  id: string; // Alterado para string para aceitar chaves dinâmicas customizadas
  nome: string;
  significado: string; 
  tipoInput: "texto" | "moeda";
}

// Significados base (Dicionário padrão)
const SIGNIFICADOS_COBERTURAS: Record<string, string> = {
  basica: "Proteção em caso de incêndio, queda de raio, explosão, queda de aeronaves, além de fumaça, impacto de veículos, tumultos, greves, lockout e para emissão de novos documentos pessoais e do imóvel se forem danificados.",
  moradia_temporaria: "Auxílio para gastos com aluguel, condomínio, hospedagem e alimentação durante todo o período de reparo do imóvel segurado caso algum problema impossibilite a moradia.",
  vendaval_granizo: "Auxílio para reparos no imóvel em caso de ventos fortes, ciclone, granizo, neve e geada, além dos eventos citados.",
  danos_eletricos: "Auxílio para reparo de eletrônicos, eletrodomésticos e instalações elétricas do imóvel em caso de queda de raio ou problema elétrico.",
  roubo: "Auxílio caso os bens do segurado ou da família forem roubados ou danificados no interior do imóvel, inclusive em caso de estragos causados no imóvel, como arrombamento de portas ou janelas.",
  vidros_marmores: "Proteção em caso de quebra ou danos a estes materiais, incluindo tampo de mesas e espelhos, seja por quebra, choque térmico, acidentes ou ventos e vendavais.",
  alagamento: "Proteção em caso de rompimento de encanamento, canalização, enchentes, chuva forte, reservatórios externos ao imóvel e mais.",
  desmoronamento: "Auxílio para reparos no imóvel decorrentes de desmoronamento total ou parcial, como queda de parede, coluna, teto e mais.",
  rc_familiar: "Auxílio caso o segurado, seus familiares e até animais domésticos causarem danos a outras pessoas ou aos bens delas.",
  tremor_terra: "Auxílio para reparos no imóvel em caso de tremor de terra, terremoto ou maremoto e, ainda, por incêndio ou explosão consequente desses eventos.",
  equipamentos_eletronicos: "Proteção se caso algum acidente de causa externa estrague os eletrodomésticos ou equipamentos eletrônicos.",
  ruptura_tubulacoes: "Proteção em caso de rompimento acidental de caixa d'água, tubulação de gás, água ou canalização de esgoto, além de auxílio no reparo de pias, vasos sanitários e chuveiros.",
  desp_salvamento: "Auxílio com as despesas de salvamento, desentulho e demolição realizadas pelo segurado durante ou após a ocorrência de um sinistro."
};

const ESTRUTURA_COBERTURAS_PADRAO: LinhaCobertura[] = [
  { id: "basica", nome: "Básica (Incêndio, Raio, Explosão)", significado: SIGNIFICADOS_COBERTURAS["basica"], tipoInput: "texto" },
  { id: "moradia_temporaria", nome: "Moradia Temporária", significado: SIGNIFICADOS_COBERTURAS["moradia_temporaria"], tipoInput: "texto" },
  { id: "vendaval_granizo", nome: "Vendaval, Granizo e Geada", significado: SIGNIFICADOS_COBERTURAS["vendaval_granizo"], tipoInput: "texto" },
  { id: "danos_eletricos", nome: "Danos Elétricos", significado: SIGNIFICADOS_COBERTURAS["danos_eletricos"], tipoInput: "texto" },
  { id: "roubo", nome: "Roubo e Furto", significado: SIGNIFICADOS_COBERTURAS["roubo"], tipoInput: "texto" },
  { id: "vidros_marmores", nome: "Vidros, Mármores e Granitos", significado: SIGNIFICADOS_COBERTURAS["vidros_marmores"], tipoInput: "texto" },
  { id: "alagamento", nome: "Alagamento e Inundação", significado: SIGNIFICADOS_COBERTURAS["alagamento"], tipoInput: "texto" },
  { id: "desmoronamento", nome: "Desmoronamento", significado: SIGNIFICADOS_COBERTURAS["desmoronamento"], tipoInput: "texto" },
  { id: "rc_familiar", nome: "Responsabilidade Civil Familiar", significado: SIGNIFICADOS_COBERTURAS["rc_familiar"], tipoInput: "moeda" },
  { id: "tremor_terra", nome: "Tremor de Terra e Terremoto", significado: SIGNIFICADOS_COBERTURAS["tremor_terra"], tipoInput: "texto" },
  { id: "equipamentos_eletronicos", nome: "Equipamentos Eletrônicos", significado: SIGNIFICADOS_COBERTURAS["equipamentos_eletronicos"], tipoInput: "texto" },
  { id: "ruptura_tubulacoes", nome: "Ruptura de Tubulações", significado: SIGNIFICADOS_COBERTURAS["ruptura_tubulacoes"], tipoInput: "texto" },
  { id: "desp_salvamento", nome: "Salvamento, Desentulho e Demolição", significado: SIGNIFICADOS_COBERTURAS["desp_salvamento"], tipoInput: "texto" }
];

interface PerfilRiscoResidencial {
  tipoResidencia: "Casa" | "Apartamento" | "Sobrado" | "Outros";
  tipoMoradia: "Habitual" | "Veraneio" | "Desocupada";
  tipoConstrucao: "Alvenaria" | "Metálica" | "Mista" | "Madeira";
  localizacao: "Rua/Avenida" | "Condomínio Fechado" | "Outros";
  sistemasProtecao: string[];
  sinistrosAnteriores: "Sim" | "Não";
}

export default function ModeloCotacaoResidencial({ propostaId, onClose }: ModeloCotacaoResidencialProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [valoresMatriz, setValoresMatriz] = useState<Record<string, Record<string, any>>>({});
  
  // Lista dinâmica de coberturas e controle de visibilidade (selecionadas para impressão)
  const [listaCoberturas, setListaCoberturas] = useState<LinhaCobertura[]>(ESTRUTURA_COBERTURAS_PADRAO);
  const [coberturasAtivas, setCoberturasAtivas] = useState<string[]>(ESTRUTURA_COBERTURAS_PADRAO.map(c => c.id));

  // Estados do formulário de inserção de novas coberturas
  const [novoNome, setNovoNome] = useState("");
  const [novoSignificado, setNovoSignificado] = useState("");

  const [perfilRisco, setPerfilRisco] = useState<PerfilRiscoResidencial>({
    tipoResidencia: "Casa",
    tipoMoradia: "Habitual",
    tipoConstrucao: "Alvenaria",
    localizacao: "Rua/Avenida",
    sistemasProtecao: [],
    sinistrosAnteriores: "Não"
  });

  const [celulaAtiva, setCelulaAtiva] = useState<{ opcaoId: string; cobId: string } | null>(null);
  const [perfilEditando, setPerfilEditando] = useState<keyof PerfilRiscoResidencial | null>(null);

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

      const { data: opcoesDb, error: errorOpcoes } = await supabase
        .from("tab_proposta_opcoes")
        .select(`
          *,
          base_seguradoras (*),
          tab_proposta_itens (
            *,
            base_produtos (*)
          )
        `)
        .eq("proposta_id", propostaId)
        .order("ordem_opcao", { ascending: true });

      if (errorOpcoes) throw errorOpcoes;

      const opcoes = opcoesDb || [];
      const matrizInicial: Record<string, Record<string, any>> = {};

      opcoes.forEach((opt: any) => {
        matrizInicial[opt.id] = {
          formaPagamento: opt.tab_proposta_itens?.[0]?.meio_pagamento || "Boleto",
          parcelamento: opt.tab_proposta_itens?.[0]?.parcelamento || "1x",
          valorTotal: opt.valor_total_opcao || 0
        };

        // Correção Importante: Inicializa rigorosamente com "R$ 0,00"
        listaCoberturas.forEach(cob => {
          matrizInicial[opt.id][cob.id] = "R$ 0,00";
        });

        opt.tab_proposta_itens?.forEach((item: any) => {
          const nomeProd = (item.base_produtos?.nome || "").toLowerCase();
          const textoSalvo = item.coberturas_franquias;

          if (!textoSalvo) return;

          listaCoberturas.forEach(cob => {
            if (nomeProd.includes(cob.id.toLowerCase()) || nomeProd.includes(cob.nome.toLowerCase().split(' ')[0])) {
              matrizInicial[opt.id][cob.id] = textoSalvo;
            }
          });
        });
      });

      const clienteDb = proposta.tab_clientes;

      setValoresMatriz(matrizInicial);
      setDadosBase({
        proposta,
        corretora,
        corretor,
        cliente: clienteDb,
        opcoes
      });

    } catch (error) {
      console.error("Erro ao estruturar cotação empresarial:", error);
      alert("Houve um erro ao carregar o espelho da proposta.");
    } finally {
      setLoading(false);
    }
  }

  const atualizarCelula = (opcaoId: string, campo: string, valor: any) => {
    setValoresMatriz(prev => ({
      ...prev,
      [opcaoId]: { ...prev[opcaoId], [campo]: valor }
    }));
  };

  const atualizarPerfil = (campo: keyof PerfilRiscoResidencial, valor: any) => {
    setPerfilRisco(prev => ({ ...prev, [campo]: valor }));
  };

  const gerenciarCheckboxSeguranca = (opcao: string) => {
    const atuais = [...perfilRisco.sistemasProtecao];
    const index = atuais.indexOf(opcao);
    if (index > -1) {
      atuais.splice(index, 1);
    } else {
      atuais.push(opcao);
    }
    atualizarPerfil("sistemasProtecao", atuais);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
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

  // Inclusão dinâmica de nova cobertura customizada
  const adicionarNovaCoberturaManual = () => {
    if (!novoNome.trim()) {
      alert("Informe o nome da cobertura para adicioná-la.");
      return;
    }
    const novoId = "custom_" + Date.now();
    const novaCob: LinhaCobertura = {
      id: novoId,
      nome: novoNome.trim(),
      significado: novoSignificado.trim() || "Cobertura customizada adicionada manualmente.",
      tipoInput: "texto"
    };

    // Atualiza a estrutura de dados de coberturas
    setListaCoberturas(prev => [...prev, novaCob]);
    // Deixa marcada automaticamente para impressão
    setCoberturasAtivas(prev => [...prev, novoId]);

    // Inicializa a nova célula em todas as seguradoras com R$ 0,00
    if (dadosBase?.opcoes) {
      setValoresMatriz(prev => {
        const atualizado = { ...prev };
        dadosBase.opcoes.forEach((opt: any) => {
          if (!atualizado[opt.id]) atualizado[opt.id] = {};
          atualizado[opt.id][novoId] = "R$ 0,00";
        });
        return atualizado;
      });
    }

    setNovoNome("");
    setNovoSignificado("");
  };

  // Exclusão física completa da cobertura da lista local
  const deletarCoberturaCompletamente = (id: string) => {
    setListaCoberturas(prev => prev.filter(c => c.id !== id));
    setCoberturasAtivas(prev => prev.filter(i => i !== id));
  };

  const exportarPDFProposta = async () => {
    if (!dadosBase) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

    const formatarValorParaPDF = (val: any) => {
      if (typeof val === 'number') return formatarMoeda(val);
      if (!val || val === "Não Contratado" || val === "" || val === "R$ NaN") return "R$ 0,00";
      return val;
    };

    const cacheLogos: Record<string, HTMLImageElement | null> = {};
    for (const opt of opcoes) {
      if (opt.base_seguradoras?.logo_url) {
        const img = await carregarImagemCache(opt.base_seguradoras.logo_url);
        cacheLogos[opt.id] = img;
      }
    }

    const urlLogoCorretora = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogoCorretora = urlLogoCorretora ? await carregarImagemCache(urlLogoCorretora) : null;

    // Cabeçalho
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
    doc.text(`PROPOSTA Nº: ${proposta.numero_proposta || "-"}`, colunaDireitaX, 12);
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

    // PERFIL DO RISCO
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PERFIL DO RISCO", 15, 78);
    doc.line(15, 80, 195, 80);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");

    // Linha 1 (Posição Y: 86)
    doc.text(`Residência: ${perfilRisco.tipoResidencia}`, 15, 86);
    doc.text(`Moradia: ${perfilRisco.tipoMoradia}`, 75, 86);
    doc.text(`Construção: ${perfilRisco.tipoConstrucao}`, 135, 86);

    // Linha 2 (Posição Y: 91)
    doc.text(`Localização: ${perfilRisco.localizacao}`, 15, 91);
    doc.text(`Sinistros Anteriores: ${perfilRisco.sinistrosAnteriores}`, 135, 91);

    // Sistemas de Proteção (Como pode ser uma lista longa, colocamos em uma linha dedicada, Y: 96)
    // Ajuste o startY da tabela para começar em 102 (ao invés de 96) para não encavalar
    doc.text(`Sistemas de Proteção: ${perfilRisco.sistemasProtecao?.length > 0 ? perfilRisco.sistemasProtecao.join(", ") : "Nenhum"}`, 15, 96);

    // TABELA DE COBERTURAS - FILTRADAS DINAMICAMENTE (Apenas ativas/marcadas vão para o PDF)
    const tableHead = [["Cobertura", "O que significa", ...opcoes.map((o: any) => o.base_seguradoras?.nome || "Opção")]];

    const tableBody = listaCoberturas
      .filter(cob => coberturasAtivas.includes(cob.id)) // Garante que excluídas via checkbox não saiam
      .map((cob) => {
        const row = [cob.nome, cob.significado];
        opcoes.forEach((opt: any) => {
          const valor = valoresMatriz[opt.id]?.[cob.id];
          row.push(formatarValorParaPDF(valor));
        });
        return row;
      });

    const rowFormaPgto = ["Forma de Pagamento", ""];
    const rowParcelas = ["Condição de Parcelamento", ""];
    const rowPremioTotal = ["INVESTIMENTO TOTAL", ""];

    opcoes.forEach((opt: any) => {
      const vMatriz = valoresMatriz[opt.id];
      rowFormaPgto.push(vMatriz?.formaPagamento || "Boleto");
      rowParcelas.push(vMatriz?.parcelamento || "1x");
      rowPremioTotal.push(formatarMoeda(vMatriz?.valorTotal || 0));
    });

    tableBody.push(rowFormaPgto, rowParcelas, rowPremioTotal);

    autoTable(doc, {
      startY: 102,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2, valign: "middle", overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: "center" },
      columnStyles: { 
        0: { cellWidth: 35 }, 
        1: { cellWidth: 60, minCellHeight: 10 },
      },
      didDrawCell: (data) => {
        if (data.section === "head" && data.column.index >= 2) {
          const opt = opcoes[data.column.index - 2];
          if (cacheLogos[opt.id]) {
            doc.addImage(cacheLogos[opt.id]!, "PNG", data.cell.x + 2, data.cell.y + 2, 10, 3);
          }
        }
      },
      didParseCell: (data) => {
        if (data.row.index >= tableBody.length - 3) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("As coberturas apresentadas seguem as Condições Gerais de cada Seguradora.", 15, finalY);

    doc.save(`Proposta_${proposta.numero_proposta || "Preview"}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="font-medium text-gray-700">Construindo espelho comparativo...</span>
        </div>
      </div>
    );
  }

  const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 border-box flex flex-col my-8">
        
        {/* BARRA SUPERIOR DE CONTROLES */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-emerald-600 h-5 w-5" /> 
              Espelho da Proposta Comercial Empresarial
            </h3>
            <p className="text-xs text-slate-500">Ref: Proposta #{proposta?.numero_proposta}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportarPDFProposta}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
          
          {/* SEÇÃO: CORRETOR E CORRETORA */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-4">
              {corretora?.tab_configuracoes_site?.logo_url ? (
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-center max-w-[110px]">
                  <img 
                    src={corretora.tab_configuracoes_site.logo_url} 
                    alt="Logo Corretora" 
                    className="max-h-12 object-contain"
                  />
                </div>
              ) : (
                <div className="bg-slate-100 p-3 rounded-full text-slate-400">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Corretora Emissora</span>
                <span className="text-sm font-bold text-slate-800 block truncate">
                  {corretora?.tab_configuracoes_site?.nome_exibicao || corretora?.nome || "Não Identificada"}
                </span>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  CNPJ: {corretora?.cnpj_corretora || "-"} | SUSEP: {corretora?.registro_susep || "-"}
                </p>
                <div className="flex flex-wrap gap-x-3 mt-1.5 pt-1.5 border-t border-slate-100 text-xs text-slate-600">
                  {corretora?.tab_configuracoes_site?.dominio && (
                    <span><strong className="text-slate-400">Site:</strong> {corretora.tab_configuracoes_site.dominio}</span>
                  )}
                  {corretora?.tab_configuracoes_site?.whatsapp_notificacao && (
                    <span><strong className="text-slate-400">Whats Atendimento:</strong> {corretora.tab_configuracoes_site.whatsapp_notificacao}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
              <User className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Consultor Responsável</span>
                <span className="text-sm font-semibold text-slate-800">{corretor?.nome || "-"}</span>
                <p className="text-xs text-slate-500 mt-0.5">E-mail: {corretor?.email || "-"} | Tel: {corretor?.telefone_corretor || "-"}</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO: DADOS DO SEGURADO */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider mb-3">Dados do Segurado e Risco</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Nome / Razão Social:</span>
                <span className="font-medium text-slate-800">{cliente?.tipo_cliente === "PJ" ? cliente?.razao_social : cliente?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Documento (CPF/CNPJ):</span>
                <span className="font-medium text-slate-800">{cliente?.tipo_cliente === "PJ" ? cliente?.cnpj : cliente?.cpf}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Localização do Risco (CEP):</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {cliente?.tipo_cliente === "PJ" ? cliente?.cep : cliente?.cep_pf} 
                  <span className="text-xs text-slate-500">
                    ({cliente?.tipo_cliente === "PJ" ? cliente?.municipio : cliente?.municipio_pf})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO EDITÁVEL DO PERFIL DE RISCO EMPRESARIAL */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Informações Complementares do Risco
            </span>

            <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("tipoResidencia")}>
                <span className="text-slate-400 block text-xs">1) Tipo de Residência:</span>
                {perfilEditando === "tipoResidencia" ? (
                    <select
                    value={perfilRisco.tipoResidencia}
                    onChange={(e) => atualizarPerfil("tipoResidencia", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                    >
                    <option value="Casa">Casa</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Sobrado">Sobrado</option>
                    <option value="Condomínio de Casas">Condomínio de Casas</option>
                    </select>
                ) : (
                    <span className="font-semibold text-slate-700">{perfilRisco.tipoResidencia || "Não informado"}</span>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-3">
              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("tipoMoradia")}>
                <span className="text-slate-400 block text-xs">1) Atividade Principal:</span>
                {perfilEditando === "tipoMoradia" ? (
                  <select
                    value={perfilRisco.tipoMoradia}
                    onChange={(e) => atualizarPerfil("tipoMoradia", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Habitual">Habitual</option>
                    <option value="Veraneio">Veraneio</option>
                    <option value="Desocupada">Desocupada</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.tipoMoradia}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("tipoConstrucao")}>
                <span className="text-slate-400 block text-xs">2) Tipo de Construção:</span>
                {perfilEditando === "tipoConstrucao" ? (
                  <select
                    value={perfilRisco.tipoConstrucao}
                    onChange={(e) => atualizarPerfil("tipoConstrucao", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Alvenaria">Alvenaria</option>
                    <option value="Metálica">Metálica</option>
                    <option value="Mista">Mista</option>
                    <option value="Madeira">Madeira</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.tipoConstrucao}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("localizacao")}>
                <span className="text-slate-400 block text-xs">3) Localização:</span>
                {perfilEditando === "localizacao" ? (
                  <select
                    value={perfilRisco.localizacao}
                    onChange={(e) => atualizarPerfil("localizacao", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Rua/Avenida">Rua/Avenida</option>
                    <option value="Condomínio Fechado">Condomínio Fechado</option>
                    <option value="Outros">Outros</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.localizacao}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("sinistrosAnteriores")}>
                <span className="text-slate-400 block text-xs">4) Sinistros Anteriores?</span>
                {perfilEditando === "sinistrosAnteriores" ? (
                  <select
                    value={perfilRisco.sinistrosAnteriores}
                    onChange={(e) => atualizarPerfil("sinistrosAnteriores", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.sinistrosAnteriores}</span>
                )}
              </div>

              <div className="p-2 rounded bg-slate-50/60 border border-slate-100 col-span-1 sm:col-span-2 md:col-span-4">
                <span className="text-slate-400 block text-xs mb-1">Sistemas de Proteção:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  {["Câmeras", "Alarme Monitorado", "Cerca Elétrica", "Vigilância Armada"].map((disp) => (
                    <label key={disp} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perfilRisco.sistemasProtecao.includes(disp)}
                        onChange={() => gerenciarCheckboxSeguranca(disp)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      {disp}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* NOVO CONTROLADOR: ADICIONAR NOVA COBERTURA NA LISTA */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
              Lançar Nova Cobertura (Não prevista no Padrão)
            </span>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Nome da Cobertura (ex: Danos a Terceiros em Carga)" 
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="O que significa (Significado prático)" 
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                value={novoSignificado}
                onChange={e => setNovoSignificado(e.target.value)}
              />
              <button 
                onClick={adicionarNovaCoberturaManual}
                className="bg-slate-800 text-white hover:bg-slate-900 px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar na Matriz
              </button>
            </div>
          </div>
          
          {/* MATRIZ DE COBERTURAS EMPRESARIAIS */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase">
                    <th style={{ width: '230px', minWidth: '230px', maxWidth: '230px' }} className="py-3 px-4 border-r border-slate-700 text-left">
                      Cobertura (Marque para incluir no PDF)
                    </th>
                    <th style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} className="py-3 px-4 border-r border-slate-700 text-left">
                      O que significa
                    </th>
                    {opcoes.map((opt: any) => (
                      <th key={opt.id} style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }} className="py-3 px-4 text-center border-l border-slate-700 bg-slate-900">
                        <div className="flex flex-col items-center gap-1">
                          {opt.base_seguradoras?.logo_url && (
                            <img 
                              src={opt.base_seguradoras.logo_url} 
                              alt={opt.base_seguradoras?.nome} 
                              className="h-6 object-contain bg-white rounded p-0.5"
                            />
                          )}
                          <span>{opt.base_seguradoras?.nome || "Opção"}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-200">
                  {listaCoberturas.map((cob) => {
                    const estaSelecionada = coberturasAtivas.includes(cob.id);
                    return (
                      <tr 
                        key={cob.id} 
                        className={`transition-colors ${estaSelecionada ? "hover:bg-slate-50/80" : "bg-slate-100/60 opacity-50 italic"}`}
                      >
                        {/* COLUNA 1: CHECKBOX DE EXCLUSÃO DE IMPRESSÃO / NOME */}
                        <td style={{ width: '230px', minWidth: '230px', maxWidth: '230px' }} className="py-3 px-4 font-bold text-slate-700 bg-slate-50/50 border-r">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input 
                                type="checkbox"
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                                checked={estaSelecionada}
                                onChange={() => {
                                  setCoberturasAtivas(prev => 
                                    prev.includes(cob.id) ? prev.filter(id => id !== cob.id) : [...prev, cob.id]
                                  );
                                }}
                              />
                              <span className="break-words leading-tight">{cob.nome}</span>
                            </div>
                            {cob.id.startsWith("custom_") && (
                              <button 
                                onClick={() => deletarCoberturaCompletamente(cob.id)}
                                title="Excluir Permanentemente"
                                className="text-rose-500 hover:text-rose-700 p-0.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        
                        {/* COLUNA 2: SIGNIFICADO */}
                        <td style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} className="py-3 px-4 text-[10px] text-slate-500 border-r">
                          <div className="break-words leading-snug">{cob.significado}</div>
                        </td>
                        
                        {/* COLUNAS DINÂMICAS: SEGURADORAS */}
                        {opcoes.map((opt: any) => {
                          const esAtivo = celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === cob.id;
                          let valorAtual = valoresMatriz[opt.id]?.[cob.id];

                          // Limpeza absoluta: se for inválido, nulo ou "Não Contratado", padroniza estritamente em R$ 0,00
                          if (!valorAtual || valorAtual === "Não Contratado" || valorAtual === "") {
                            valorAtual = "R$ 0,00";
                          }

                          return (
                            <td 
                              key={opt.id} 
                              style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}
                              className={`py-2 px-2 text-center border-l ${estaSelecionada ? "cursor-pointer hover:bg-emerald-50/40" : "cursor-not-allowed"}`}
                              onClick={() => estaSelecionada && setCelulaAtiva({ opcaoId: opt.id, cobId: cob.id })}
                            >
                              {esAtivo ? (
                                <input
                                  type="text"
                                  autoFocus
                                  className="w-full text-center border border-emerald-500 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                  value={valorAtual === "R$ 0,00" ? "" : valorAtual.replace("R$ ", "")}
                                  onChange={(e) => atualizarCelula(opt.id, cob.id, e.target.value.trim() === "" ? "R$ 0,00" : `R$ ${e.target.value}`)}
                                  onBlur={() => setCelulaAtiva(null)}
                                />
                              ) : (
                                <span className="font-medium text-slate-700 block select-none">
                                  {valorAtual}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* FORMA DE PAGAMENTO */}
                  <tr className="bg-slate-50/80 font-semibold">
                    <td className="py-3 px-4 border-r text-slate-700">Forma de Pagamento</td>
                    <td className="py-3 px-4 border-r"></td>
                    {opcoes.map((opt: any) => (
                      <td key={opt.id} className="py-2 px-2 text-center border-l">
                        <select
                          className="bg-transparent text-center font-medium text-slate-700 focus:outline-none w-full cursor-pointer text-xs"
                          value={valoresMatriz[opt.id]?.formaPagamento || "Boleto"}
                          onChange={(e) => atualizarCelula(opt.id, "formaPagamento", e.target.value)}
                        >
                          <option value="Boleto">Boleto</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Débito em Conta">Débito em Conta</option>
                          <option value="Pix">Pix</option>
                        </select>
                      </td>
                    ))}
                  </tr>

                  {/* CONDIÇÃO DE PARCELAMENTO */}
                  <tr className="bg-slate-50/80 font-semibold">
                    <td className="py-3 px-4 border-r text-slate-700">Condição de Parcelamento</td>
                    <td className="py-3 px-4 border-r"></td>
                    {opcoes.map((opt: any) => (
                      <td key={opt.id} className="py-2 px-2 text-center border-l">
                        <input 
                          type="text"
                          className="bg-transparent text-center font-medium text-slate-700 focus:outline-none w-full text-xs"
                          value={valoresMatriz[opt.id]?.parcelamento || "1x"}
                          onChange={(e) => atualizarCelula(opt.id, "parcelamento", e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>

                  {/* INVESTIMENTO TOTAL */}
                  <tr className="bg-emerald-50/50 font-bold text-slate-800">
                    <td className="py-3 px-4 border-r text-slate-800 text-sm uppercase">INVESTIMENTO TOTAL</td>
                    <td className="py-3 px-4 border-r"></td>
                    {opcoes.map((opt: any) => {
                      const esPremioAtivo = celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === "valorTotal";
                      const vTotal = valoresMatriz[opt.id]?.valorTotal || 0;
                      return (
                        <td 
                          key={opt.id} 
                          className="py-3 px-2 text-center border-l text-emerald-700 font-bold text-sm cursor-pointer hover:bg-emerald-100/40"
                          onClick={() => setCelulaAtiva({ opcaoId: opt.id, cobId: "valorTotal" })}
                        >
                          {esPremioAtivo ? (
                            <input 
                              type="number"
                              autoFocus
                              className="w-full text-center border border-emerald-600 rounded p-0.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                              value={vTotal || ""}
                              onChange={(e) => atualizarCelula(opt.id, "valorTotal", parseFloat(e.target.value) || 0)}
                              onBlur={() => setCelulaAtiva(null)}
                            />
                          ) : (
                            <span>{formatarMoeda(vTotal)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}