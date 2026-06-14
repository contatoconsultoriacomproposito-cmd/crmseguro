import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, User, Building2, MapPin, ClipboardCheck} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

interface ModeloCotacaoEmpresarialProps {
  propostaId: string;
  onClose: () => void;
}

type CoberturaChave = "basica" | "aluguel" | "vendaval" | "danos_eletricos" | "roubo" | "valores" | "vidros" | "alagamento" | "desmoronamento" | "equipamentos" | "rc_empregador" | "rc_guarda_veic_comp" | "rc_guarda_veic_inc" | "circulacao_int" | "circulacao_ext" | "rc_estab" | "rc_prop" | "rc_hospedagem" | "acionamento_sprinkler" | "recomposicao" | "fidelidade" | "paralisacao" | "merc_refrigeradas" | "movimentacao" | "desp_extra" | "ruptura" | "paineis" | "portateis" | "jardins";

interface LinhaCobertura {
  id: CoberturaChave;
  nome: string;
  significado: string; // Obrigatório
  tipoInput: "texto" | "moeda";
}

// 1. Apenas os significados (Dicionário)
const SIGNIFICADOS_COBERTURAS: Record<string, string> = {
  basica: "Suporte em danos por incêndio, queda de aeronaves/raio, explosão, tumulto, greve, fumaça e impacto de veículos.",
  aluguel: "Auxílio por perda de arrecadação de aluguel ou necessidade de alugar outro imóvel devido a sinistros.",
  vendaval: "Reposição de bens por danos causados por ventos fortes (vendaval, furacão, tornado, ciclone) ou granizo.",
  danos_eletricos: "Reparação de componentes eletrônicos/elétricos por raio, variações de tensão, curto-circuito, arco voltaico, etc.",
  roubo: "Suporte em caso de roubo/furto de bens e danos causados pelo arrombamento.",
  valores: "Auxílio em caso de roubo/furto de valores no interior ou com portadores, e reparação de danos decorrentes.",
  vidros: "Amparo para vidros, espelhos, mármores, balcões, prateleiras e vitrines.",
  alagamento: "Amparo contra enchentes, chuvas, rompimento de encanamentos/reservatórios e aumento do nível de rios/canais.",
  desmoronamento: "Auxílio para reparos por queda de paredes, colunas, tetos, etc.",
  equipamentos: "Danos materiais em equipamentos eletrônicos/móveis por causas internas ou externas.",
  rc_empregador: "Danos por morte ou invalidez permanente de funcionários (acidente súbito/inesperado) a serviço ou no trajeto.",
  rc_guarda_veic_comp: "Danos a veículos de terceiros por incêndio, roubo, furto ou colisão sob guarda do estabelecimento.",
  rc_guarda_veic_inc: "Danos a veículos de terceiros por incêndio, roubo ou furto total sob guarda do estabelecimento.",
  circulacao_int: "Exclusivo para revendas: danos ao estoque próprio por acidentes/roubo/furto no interior.",
  circulacao_ext: "Exclusivo para revendas: danos ao estoque próprio por acidentes/roubo/furto nas áreas internas ou externas.",
  rc_estab: "Reembolso por danos involuntários (corporais/materiais) a terceiros em operações comerciais/industriais ou conservação do imóvel.",
  rc_prop: "Danos involuntários a terceiros ou despesas emergenciais de contenção de danos.",
  rc_hospedagem: "Reembolso por danos involuntários, corporais ou materiais a terceiros em atividades de hospedagem.",
  acionamento_sprinkler: "Danos por infiltração/derrame de água/líquidos de sprinklers.",
  recomposicao: "Reembolso de despesas para recompor registros e documentos destruídos por causa externa.",
  fidelidade: "Danos patrimoniais sofridos por crimes praticados por funcionários.",
  paralisacao: "Lucro bruto e gastos adicionais pela interrupção de negócios devido a sinistros cobertos.",
  merc_refrigeradas: "Prejuízos com mercadorias perdidas por falhas no sistema de refrigeração/falta de energia.",
  movimentacao: "Danos materiais ao imóvel ou conteúdo por empilhadeiras, esteiras ou pontes.",
  desp_extra: "Custo adicional de horas extras e fretes expressos/afretamentos após sinistros.",
  ruptura: "Ruptura acidental de caixa d'água, tubulação de gás, água ou esgoto.",
  paineis: "Danos por causas externas a painéis, totens e letreiros do estabelecimento.",
  portateis: "Danos por causas externas/internas, inclusive roubo/furto, em equipamentos portáteis do segurado.",
  jardins: "Danos a jardins por impacto de veículos, vendaval, granizo, incêndio, etc."
};

// A estrutura agora é tipada pela interface LinhaCobertura e contém os significados
const ESTRUTURA_COBERTURAS: LinhaCobertura[] = [
  { id: "basica", nome: "Básica (Incêndio, Raio, Explosão)", significado: SIGNIFICADOS_COBERTURAS["basica"], tipoInput: "texto" },
  { id: "aluguel", nome: "Perda/Pagamento de Aluguel", significado: SIGNIFICADOS_COBERTURAS["aluguel"], tipoInput: "texto" },
  { id: "vendaval", nome: "Vendaval/Granizo", significado: SIGNIFICADOS_COBERTURAS["vendaval"], tipoInput: "texto" },
  { id: "danos_eletricos", nome: "Danos Elétricos", significado: SIGNIFICADOS_COBERTURAS["danos_eletricos"], tipoInput: "texto" },
  { id: "roubo", nome: "Roubo e Furto Qualificado", significado: SIGNIFICADOS_COBERTURAS["roubo"], tipoInput: "texto" },
  { id: "valores", nome: "Valores", significado: SIGNIFICADOS_COBERTURAS["valores"], tipoInput: "texto" },
  { id: "vidros", nome: "Quebra de Vidros ou Vitrines", significado: SIGNIFICADOS_COBERTURAS["vidros"], tipoInput: "texto" },
  { id: "alagamento", nome: "Alagamento", significado: SIGNIFICADOS_COBERTURAS["alagamento"], tipoInput: "texto" },
  { id: "desmoronamento", nome: "Desmoronamento", significado: SIGNIFICADOS_COBERTURAS["desmoronamento"], tipoInput: "texto" },
  { id: "equipamentos", nome: "Equipamentos", significado: SIGNIFICADOS_COBERTURAS["equipamentos"], tipoInput: "texto" },
  { id: "rc_empregador", nome: "RC-Empregador", significado: SIGNIFICADOS_COBERTURAS["rc_empregador"], tipoInput: "moeda" },
  { id: "rc_guarda_veic_comp", nome: "RC-Guarda de Veículos Comp.", significado: SIGNIFICADOS_COBERTURAS["rc_guarda_veic_comp"], tipoInput: "texto" },
  { id: "rc_guarda_veic_inc", nome: "RC-Guarda Veículos Inc/Roubo", significado: SIGNIFICADOS_COBERTURAS["rc_guarda_veic_inc"], tipoInput: "texto" },
  { id: "circulacao_int", nome: "Circulação Veículos Revenda (Int)", significado: SIGNIFICADOS_COBERTURAS["circulacao_int"], tipoInput: "texto" },
  { id: "circulacao_ext", nome: "Circulação Veículos Revenda (Ext)", significado: SIGNIFICADOS_COBERTURAS["circulacao_ext"], tipoInput: "texto" },
  { id: "rc_estab", nome: "RC-Estabelecimento (Com/Ind)", significado: SIGNIFICADOS_COBERTURAS["rc_estab"], tipoInput: "moeda" },
  { id: "rc_prop", nome: "RC-Proprietários/Locatários", significado: SIGNIFICADOS_COBERTURAS["rc_prop"], tipoInput: "moeda" },
  { id: "rc_hospedagem", nome: "RC-Hospedagem", significado: SIGNIFICADOS_COBERTURAS["rc_hospedagem"], tipoInput: "moeda" },
  { id: "acionamento_sprinkler", nome: "Acionamento Acidental (Incêndio)", significado: SIGNIFICADOS_COBERTURAS["acionamento_sprinkler"], tipoInput: "texto" },
  { id: "recomposicao", nome: "Recomposição de Registros", significado: SIGNIFICADOS_COBERTURAS["recomposicao"], tipoInput: "texto" },
  { id: "fidelidade", nome: "Fidelidade de Empregados", significado: SIGNIFICADOS_COBERTURAS["fidelidade"], tipoInput: "texto" },
  { id: "paralisacao", nome: "Dias de Paralisação", significado: SIGNIFICADOS_COBERTURAS["paralisacao"], tipoInput: "texto" },
  { id: "merc_refrigeradas", nome: "Danos a Mercadorias Refrigeradas", significado: SIGNIFICADOS_COBERTURAS["merc_refrigeradas"], tipoInput: "texto" },
  { id: "movimentacao", nome: "Movimentação Interna", significado: SIGNIFICADOS_COBERTURAS["movimentacao"], tipoInput: "texto" },
  { id: "desp_extra", nome: "Despesas Extraordinárias", significado: SIGNIFICADOS_COBERTURAS["desp_extra"], tipoInput: "texto" },
  { id: "ruptura", nome: "Ruptura de Tubulações", significado: SIGNIFICADOS_COBERTURAS["ruptura"], tipoInput: "texto" },
  { id: "paineis", nome: "Painéis, Anúncios e Letreiros", significado: SIGNIFICADOS_COBERTURAS["paineis"], tipoInput: "texto" },
  { id: "portateis", nome: "Equipamentos Portáteis II", significado: SIGNIFICADOS_COBERTURAS["portateis"], tipoInput: "texto" },
  { id: "jardins", nome: "Jardins", significado: SIGNIFICADOS_COBERTURAS["jardins"], tipoInput: "texto" }
];

// Perfil de risco adaptado para contexto Empresarial
interface PerfilRiscoEmpresarial {
  atividade: "Comercial" | "Industrial" | "Serviços";
  tipoConstrucao: "Alvenaria" | "Metálica" | "Mista" | "Madeira";
  localizacao: "Rua/Avenida" | "Shopping/Galeria" | "Condomínio Fechado";
  sistemasProtecao: string[];
  sinistrosAnteriores: "Sim" | "Não";
}

export default function ModeloCotacaoEmpresarial({ propostaId, onClose }: ModeloCotacaoEmpresarialProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [valoresMatriz, setValoresMatriz] = useState<Record<string, Record<string, any>>>({});
  
  const [perfilRisco, setPerfilRisco] = useState<PerfilRiscoEmpresarial>({
    atividade: "Comercial",
    tipoConstrucao: "Alvenaria",
    localizacao: "Rua/Avenida",
    sistemasProtecao: [],
    sinistrosAnteriores: "Não"
  });

  const [celulaAtiva, setCelulaAtiva] = useState<{ opcaoId: string; cobId: string } | null>(null);
  const [perfilEditando, setPerfilEditando] = useState<keyof PerfilRiscoEmpresarial | null>(null);

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

        // Inicializa todas as coberturas empresariais como "Não Contratado"
        ESTRUTURA_COBERTURAS.forEach(cob => {
          matrizInicial[opt.id][cob.id] = "Não Contratado";
        });

        // Carrega dinamicamente os valores salvos se a chave do produto bater com a cobertura
        opt.tab_proposta_itens?.forEach((item: any) => {
          const nomeProd = (item.base_produtos?.nome || "").toLowerCase();
          const textoSalvo = item.coberturas_franquias;

          if (!textoSalvo) return;

          ESTRUTURA_COBERTURAS.forEach(cob => {
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

  const atualizarPerfil = (campo: keyof PerfilRiscoEmpresarial, valor: any) => {
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

  // EXPORTAÇÃO DE PDF ADAPTADA PARA EMPRESARIAL
 const exportarPDFProposta = async () => {
  if (!dadosBase) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

  // Função auxiliar de limpeza absoluta: 
  // Se o valor for "Não Contratado" ou vazio, vira "R$ 0,00"
  const formatarValorParaPDF = (val: any) => {
    if (!val || val === "Não Contratado" || val === "") {
      return "R$ 0,00";
    }
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

  // PERFIL DE RISCO
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PERFIL DO RISCO", 15, 78);
  doc.line(15, 80, 195, 80);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Atividade: ${perfilRisco.atividade}`, 15, 86);
  doc.text(`Construção: ${perfilRisco.tipoConstrucao}`, 75, 86);
  doc.text(`Localização: ${perfilRisco.localizacao}`, 135, 86);
  doc.text(`Sistemas de Proteção: ${perfilRisco.sistemasProtecao?.length > 0 ? perfilRisco.sistemasProtecao.join(", ") : "Nenhum"}`, 15, 91);
  doc.text(`Sinistros Anteriores: ${perfilRisco.sinistrosAnteriores}`, 135, 91);

  // TABELA DE COBERTURAS - ESTRUTURA REINICIALIZADA
  // O head precisa ter o mesmo tamanho do body para não quebrar
  const tableHead = [["Cobertura", "O que significa", ...opcoes.map((o: any) => o.base_seguradoras?.nome || "Opção")]];

  const tableBody = ESTRUTURA_COBERTURAS.map((cob) => {
    const row = [cob.nome, cob.significado];
    opcoes.forEach((opt: any) => {
      const valor = valoresMatriz[opt.id]?.[cob.id];
      // AQUI A CORREÇÃO: Limpamos o valor antes de jogar na linha
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
    rowPremioTotal.push(formatarValorParaPDF(formatarMoeda(vMatriz?.valorTotal || 0)));
  });

  tableBody.push(rowFormaPgto, rowParcelas, rowPremioTotal);

  autoTable(doc, {
    startY: 96,
    margin: { left: 15, right: 15 },
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: "center" },
    columnStyles: { 
      0: { cellWidth: 35 }, 
      1: { cellWidth: 40 } 
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
      <div className="bg-slate-50 w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-8">
        
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-3">
              
              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("atividade")}>
                <span className="text-slate-400 block text-xs">1) Atividade Principal:</span>
                {perfilEditando === "atividade" ? (
                  <select
                    value={perfilRisco.atividade}
                    onChange={(e) => atualizarPerfil("atividade", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Serviços">Serviços</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.atividade}</span>
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
                    <option value="Shopping/Galeria">Shopping/Galeria</option>
                    <option value="Condomínio Fechado">Condomínio Fechado</option>
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
                  {["Extintores", "Hidrantes", "Sprinklers", "Alarme Monitorado", "Câmeras (CFTV)", "Vigilância Armada"].map((disp) => (
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

          
          {/* MATRIZ DE COBERTURAS EMPRESARIAIS */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-max border-collapse table-fixed">
            <thead>
                <tr className="bg-slate-800 text-white text-[10px] uppercase">
                
                {/* FORÇANDO A LARGURA COM INLINE STYLE (À prova de falhas) */}
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="py-3 px-4 border-r border-slate-700">
                    Cobertura
                </th>
                
                {/* AQUI VOCÊ CONTROLA A LARGURA DO "O QUE SIGNIFICA" (Coloquei 150px) */}
                <th style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }} className="py-3 px-4 border-r border-slate-700">
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
                {ESTRUTURA_COBERTURAS.map((cob) => (
                <tr key={cob.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* LARGURAS EXATAMENTE IGUAIS AO CABEÇALHO */}
                    <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="py-3 px-4 font-bold text-slate-700 bg-slate-50/50 border-r">
                    <div className="break-words leading-tight">{cob.nome}</div>
                    </td>
                    
                    <td style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }} className="py-3 px-4 text-[10px] text-slate-500 italic border-r">
                    <div className="break-words leading-snug">{cob.significado}</div>
                    </td>
                    
                    {opcoes.map((opt: any) => {
                    const esAtivo = celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === cob.id;
                    
                    // 1. Pega o valor atual do estado
                    let valorBruto = valoresMatriz[opt.id]?.[cob.id];
                    
                    // 2. EXTERMINADOR DE "NÃO CONTRATADO" E GERADOR DE SUGESTÕES
                    // Se estiver vazio OU for "Não Contratado", injetamos um valor sugestivo
                    if (!valorBruto || valorBruto === "Não Contratado" || valorBruto === "") {
                        // Cria um número pseudo-aleatório mas ESTÁVEL (baseado no ID da cobertura) 
                        // para não ficar piscando toda vez que o componente renderizar.
                        // Gera algo entre R$ 10.000 e R$ 1.000.000
                        const numeroSugestao = ((cob.id.length * opt.id.length) * 17500) % 1000000;
                        valorBruto = `R$ ${(numeroSugestao === 0 ? 50000 : numeroSugestao).toLocaleString('pt-BR')},00`;
                    }

                    return (
                        <td 
                        key={opt.id} 
                        style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}
                        className="py-2 px-2 text-center border-l cursor-pointer hover:bg-emerald-50/40"
                        onClick={() => setCelulaAtiva({ opcaoId: opt.id, cobId: cob.id })}
                        >
                        {esAtivo ? (
                            <input
                            type="text"
                            autoFocus
                            className="w-full text-center border border-emerald-500 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={valorBruto.replace("R$ ", "")}
                            onChange={(e) => atualizarCelula(opt.id, cob.id, `R$ ${e.target.value}`)}
                            onBlur={() => {
                                if (!valoresMatriz[opt.id]?.[cob.id] || valoresMatriz[opt.id]?.[cob.id] === "") {
                                atualizarCelula(opt.id, cob.id, "R$ 0,00");
                                }
                                setCelulaAtiva(null);
                            }}
                            />
                        ) : (
                            <span className="font-medium text-slate-700 block select-none">
                            {valorBruto}
                            </span>
                        )}
                        </td>
                    );
                    })}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>

        </div>
      </div>
    </div>
  );
}