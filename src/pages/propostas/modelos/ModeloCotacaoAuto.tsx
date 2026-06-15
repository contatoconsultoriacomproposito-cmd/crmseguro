import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, User, Building2, MapPin, ClipboardCheck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

interface ModeloCotacaoAutoProps {
  propostaId: string;
  onClose: () => void;
}

type CoberturaChave = "compreensiva" | "dm" | "dc" | "assistencia" | "carro" | "franquia";

interface LinhaCobertura {
  id: CoberturaChave;
  nome: string;
  tipoInput: "texto" | "moeda" | "km" | "carro_reserva" | "franquia_estrutura";
}

const ESTRUTURA_COBERTURAS: LinhaCobertura[] = [
  { id: "compreensiva", nome: "Colisão, Incêndio e Roubo (Compreensiva)", tipoInput: "texto" },
  { id: "dm", nome: "RCF-V Danos Materiais (Terceiros)", tipoInput: "moeda" },
  { id: "dc", nome: "RCF-V Danos Corporais (Terceiros)", tipoInput: "moeda" },
  { id: "assistencia", nome: "Assistência 24h (Guincho)", tipoInput: "km" },
  { id: "carro", nome: "Carro Reserva", tipoInput: "carro_reserva" },
  { id: "franquia", nome: "Franquia", tipoInput: "franquia_estrutura" },
];

interface PerfilRisco {
  sexo: "Masculino" | "Feminino";
  tipoUso: "Particular" | "Comercial";
  condutorMenor25: "Sim" | "Não";
  garagemResidencia: "Coberta" | "Estacionamento" | "Não Possui";
  garagemTrabalho: "Coberta" | "Estacionamento" | "Não Possui" | "Não trabalha";
  dispositivosSeguranca: string[];
  sinistrosAnteriores: "Sim" | "Não";
  classeBonus: number;
}

export default function ModeloCotacaoAuto({ propostaId, onClose }: ModeloCotacaoAutoProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [valoresMatriz, setValoresMatriz] = useState<Record<string, Record<string, any>>>({});
  const [nomeNovaCobertura, setNomeNovaCobertura] = useState("");
  const [tipoInputNovaCobertura, setTipoInputNovaCobertura] = useState("moeda");
  const [coberturasCustomizadas, setCoberturasCustomizadas] = useState<any[]>([]);

  // Função para adicionar a cobertura customizada na lista
  const adicionarCoberturaCustomizada = () => {
    if (!nomeNovaCobertura.trim()) return;
    
    const novoId = `custom_${Date.now()}`; // Gera um ID único baseado no timestamp
    setCoberturasCustomizadas(prev => [
      ...prev, 
      { id: novoId, nome: nomeNovaCobertura.trim(), tipoInput: tipoInputNovaCobertura }
    ]);
    
    setNomeNovaCobertura(""); // Limpa o campo de texto
  };
  
  // Estado para controlar quais coberturas estão selecionadas/ativas
  const [coberturasAtivas, setCoberturasAtivas] = useState<CoberturaChave[]>(
    ESTRUTURA_COBERTURAS.map(c => c.id)
  );
  
  const [perfilRisco, setPerfilRisco] = useState<PerfilRisco>({
    sexo: "Masculino",
    tipoUso: "Particular",
    condutorMenor25: "Não",
    garagemResidencia: "Coberta",
    garagemTrabalho: "Coberta",
    dispositivosSeguranca: [],
    sinistrosAnteriores: "Não",
    classeBonus: 0
  });

  const [celulaAtiva, setCelulaAtiva] = useState<{ opcaoId: string; cobId: string } | null>(null);
  const [perfilEditando, setPerfilEditando] = useState<keyof PerfilRisco | null>(null);

  useEffect(() => {
    if (propostaId) {
      carregarDadosProposta();
    }
  }, [propostaId]);

  async function carregarDadosProposta() {
    try {
      setLoading(true);

      // -------------------------------------------------------------------------
      // MUDANÇA 1: LADO DIREITO (CONSULTOR) 
      // Mudamos o select para trazer o perfil do corretor usando a Foreign Key correta (corretor_id)
      // -------------------------------------------------------------------------
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

      // O corretor responsável (ex: Bruce Duarte) agora vem amarrado de forma legítima
      const corretor = proposta.usuarios_perfis;

      // -------------------------------------------------------------------------
      // MUDANÇA 2: LADO ESQUERDO (CORRETORA EMISSORA)
      // Removemos o filtro engessado de "tipo_usuario = CORRETORA" que quebrava o retorno.
      // Agora aceitamos CORRETORA ou ADMIN sob o mesmo "corretora_id" para puxar as configs do site (Elisangela).
      // -------------------------------------------------------------------------
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
          compreensiva: "FIPE 100%",
          dm: "R$ 50.000,00",
          dc: "R$ 50.000,00",
          assistencia: "400 KM",
          carro: "Não Contratado",
          franquia: { valor: "R$ 0,00", tipo: "Obrigatória" },
          formaPagamento: opt.tab_proposta_itens?.[0]?.meio_pagamento || "Boleto",
          parcelamento: opt.tab_proposta_itens?.[0]?.parcelamento || "1x",
          valorTotal: opt.valor_total_opcao || 0
        };

        opt.tab_proposta_itens?.forEach((item: any) => {
          const nomeProd = (item.base_produtos?.nome || "").toLowerCase();
          const textoSalvo = item.coberturas_franquias;

          if (!textoSalvo) return;

          if (nomeProd.includes("colisão") || nomeProd.includes("compreensiva") || nomeProd.includes("seguro auto")) {
            matrizInicial[opt.id].compreensiva = textoSalvo;
          } else if (nomeProd.includes("material") || nomeProd.includes("dm")) {
            matrizInicial[opt.id].dm = textoSalvo;
          } else if (nomeProd.includes("corporal") || nomeProd.includes("dc")) {
            matrizInicial[opt.id].dc = textoSalvo;
          } else if (nomeProd.includes("assistência") || nomeProd.includes("guincho")) {
            matrizInicial[opt.id].assistencia = textoSalvo;
          } else if (nomeProd.includes("carro") || nomeProd.includes("reserva")) {
            matrizInicial[opt.id].carro = textoSalvo;
          } else if (nomeProd.includes("franquia")) {
            matrizInicial[opt.id].franquia.valor = textoSalvo;
          }
        });
      });

      const clienteDb = proposta.tab_clientes;
      if (clienteDb) {
        setPerfilRisco({
          sexo: clienteDb.sexo === "F" || clienteDb.sexo === "Feminino" ? "Feminino" : "Masculino",
          tipoUso: "Particular", 
          condutorMenor25: "Não",
          garagemResidencia: "Coberta",
          garagemTrabalho: "Coberta",
          dispositivosSeguranca: [],
          sinistrosAnteriores: "Não",
          classeBonus: Number(proposta.classe_bonus || 0)
        });
      }

      setValoresMatriz(matrizInicial);
      
      setDadosBase({
        proposta,
        corretora,
        corretor,
        cliente: clienteDb,
        opcoes
      });

    } catch (error) {
      console.error("Erro ao estruturar cotação:", error);
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

  const atualizarFranquiaEstrutura = (opcaoId: string, subCampo: "valor" | "tipo", valor: string) => {
    setValoresMatriz(prev => ({
      ...prev,
      [opcaoId]: {
        ...prev[opcaoId],
        franquia: { ...prev[opcaoId].franquia, [subCampo]: valor }
      }
    }));
  };

  const atualizarPerfil = (campo: keyof PerfilRisco, valor: any) => {
    setPerfilRisco(prev => ({ ...prev, [campo]: valor }));
  };

  const gerenciarCheckboxSeguranca = (opcao: string) => {
    const atuais = [...perfilRisco.dispositivosSeguranca];
    const index = atuais.indexOf(opcao);
    if (index > -1) {
      atuais.splice(index, 1);
    } else {
      atuais.push(opcao);
    }
    atualizarPerfil("dispositivosSeguranca", atuais);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
  };

  const obterTextoFranquia = (optId: string) => {
    const f = valoresMatriz[optId]?.franquia;
    if (!f) return "Não Contratado";
    return `${f.valor} (${f.tipo})`;
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

// 📄 EXPORTAÇÃO DE PDF 100% CORRIGIDA (DIVISÃO ESQUERDA vs DIREITA + COBERTURAS CUSTOMIZADAS)
  const exportarPDFProposta = async () => {
    if (!dadosBase) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

    const cacheLogos: Record<string, HTMLImageElement | null> = {};
    for (const opt of opcoes) {
      if (opt.base_seguradoras?.logo_url) {
        const img = await carregarImagemCache(opt.base_seguradoras.logo_url);
        cacheLogos[opt.id] = img;
      }
    }

    const urlLogoCorretora = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogoCorretora = urlLogoCorretora ? await carregarImagemCache(urlLogoCorretora) : null;

    // Cabeçalho Slate-800 Profissional
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 38, "F");
    
    // =========================================================================
    // LADO ESQUERDO: INFORMAÇÕES DA CORRETORA (EMPRESA) - CONFIGURAÇÃO DO SITE
    // =========================================================================
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

    // =========================================================================
    // LADO DIREITO: DADOS DO CONSULTOR (CORRETOR) + PROPOSTA
    // =========================================================================
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

    // Bloco 1: Dados do Segurado
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO SEGURADO", 15, 46);
    doc.line(15, 48, 195, 48);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const isPJ = cliente?.tipo_cliente === "PJ";
    const nomeCliente = isPJ ? cliente?.razao_social : cliente?.nome;
    const docCliente = isPJ ? cliente?.cnpj : cliente?.cpf;
    
    doc.text(`Nome/Razão Social: ${nomeCliente || "-"}`, 15, 54);
    doc.text(`CPF/CNPJ: ${docCliente || "-"}`, 15, 59);
    doc.text(`WhatsApp: ${cliente?.telefone_whats || "-"} | Email: ${cliente?.email || "-"}`, 15, 64);

    const cepRisco = isPJ ? cliente?.cep : cliente?.cep_pf;
    const cidRisco = isPJ ? `${cliente?.municipio} - ${cliente?.uf}` : `${cliente?.municipio_pf} - ${cliente?.uf_pf}`;
    doc.text(`CEP de Risco: ${cepRisco || "-"} (${cidRisco || "-"})`, 15, 69);

    // Bloco 2: Perfil de Risco
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PERFIL DE RISCO / DECLARAÇÕES", 15, 78);
    doc.line(15, 80, 195, 80);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Sexo: ${perfilRisco.sexo}`, 15, 86);
    doc.text(`Tipo de Uso: ${perfilRisco.tipoUso}`, 75, 86);
    doc.text(`Condutor <= 25 anos: ${perfilRisco.condutorMenor25}`, 135, 86);

    doc.text(`Garagem Residência: ${perfilRisco.garagemResidencia}`, 15, 91);
    doc.text(`Garagem Trabalho: ${perfilRisco.garagemTrabalho}`, 75, 91);
    doc.text(`Classe de Bônus: CI ${perfilRisco.classeBonus}`, 135, 91);

    const dispTexto = perfilRisco.dispositivosSeguranca.length > 0 ? perfilRisco.dispositivosSeguranca.join(", ") : "Nenhum";
    doc.text(`Dispositivos de Segurança: ${dispTexto}`, 15, 96);
    doc.text(`Sinistros Anteriores: ${perfilRisco.sinistrosAnteriores}`, 135, 96);

    const tableHead = [[""]];
    opcoes.forEach(() => {
      tableHead[0].push(""); 
    });

    // -------------------------------------------------------------------------
    // CORREÇÃO DA IMPRESSÃO DA MATRIZ: Unifica as padrões ativas com as livres
    // -------------------------------------------------------------------------
    const todasAsCoberturasDoPdf = [
      ...ESTRUTURA_COBERTURAS.filter((cob) => coberturasAtivas.includes(cob.id)),
      ...coberturasCustomizadas
    ];

    const tableBody = todasAsCoberturasDoPdf.map((cob) => {
      const row = [cob.nome];
      opcoes.forEach((opt: any) => {
        if (cob.id === "franquia") {
          row.push(obterTextoFranquia(opt.id));
        } else {
          row.push(valoresMatriz[opt.id]?.[cob.id] || "Não Contratado");
        }
      });
      return row;
    });

    const rowFormaPgto = ["Forma de Pagamento"];
    const rowParcelas = ["Condição de Parcelamento"];
    const rowPremioTotal = ["INVESTIMENTO TOTAL (Prêmio)"];

    opcoes.forEach((opt: any) => {
      const vMatriz = valoresMatriz[opt.id];
      rowFormaPgto.push(vMatriz?.formaPagamento || "Boleto");
      rowParcelas.push(vMatriz?.parcelamento || "1x");
      rowPremioTotal.push(formatarMoeda(vMatriz?.valorTotal));
    });

    tableBody.push(rowFormaPgto);
    tableBody.push(rowParcelas);
    tableBody.push(rowPremioTotal);

    autoTable(doc, {
      startY: 104,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.5, valign: "middle" },
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: 255, 
        fontStyle: "bold", 
        halign: "center",
        minCellHeight: 24 
      },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
      
      didDrawCell: (data) => {
        if (data.section === "head") {
          if (data.column.index === 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(
              "Coberturas / Serviços", 
              data.cell.x + 4, 
              data.cell.y + (data.cell.height / 2), 
              { baseline: "middle" }
            );
          } else {
            const opcaoCorrespondente = opcoes[data.column.index - 1];
            if (opcaoCorrespondente) {
              const imgLogo = cacheLogos[opcaoCorrespondente.id];
              const nomeSeguradora = opcaoCorrespondente.base_seguradoras?.nome || "Opção";
              
              const larguraImg = 26;
              const alturaImg = 8;
              
              const posX = data.cell.x + (data.cell.width - larguraImg) / 2;
              const posYImagem = data.cell.y + 4; 
              
              if (imgLogo) {
                doc.addImage(imgLogo, "PNG", posX, posYImagem, larguraImg, alturaImg);
              }
              
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.5);
              doc.setTextColor(255, 255, 255);
              
              const posYTexto = posYImagem + alturaImg + 6; 
              const centroXCelula = data.cell.x + (data.cell.width / 2);
              
              doc.text(nomeSeguradora, centroXCelula, posYTexto, { align: "center" });
            }
          }
        }
      },

      didParseCell: (data) => {
        if (data.row.index >= tableBody.length - 3) {
          data.cell.styles.fontStyle = "bold";
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fillColor = [241, 245, 249];
            if (data.column.index > 0) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontSize = 9.5;
            }
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("As coberturas aqui apresentadas seguem as Condições Gerais de cada Seguradora e a legislação SUSEP vigente.", 15, finalY);
    doc.text(`Documento gerado em ${new Date().toLocaleDateString("pt-BR")} - Proposta Comercial sujeita a alterações de tarifa pelas compañías.`, 15, finalY + 4);

    doc.save(`Proposta_Auto_${proposta.numero_proposta || "Preview"}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="font-medium text-gray-700">Construindo espelho comparativo...</span>
        </div>
      </div>
    );
  }

  const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-8">
        
        {/* BARRA SUPERIOR DE CONTROLES */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-blue-600 h-5 w-5" /> 
              Espelho da Proposta Comercial Auto
            </h3>
            <p className="text-xs text-slate-500">Ref: Proposta #{proposta?.numero_proposta}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportarPDFProposta}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
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
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider mb-3">Dados do Segurado e Perfil</span>
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
                <span className="text-slate-400 block text-xs">Local de Pernoite (CEP de Risco):</span>
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

          {/* BLOCO EDITÁVEL DO PERFIL DE RISCO */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
              <ClipboardCheck className="h-4 w-4 text-blue-600" /> Perfil de Risco e Variáveis de Cálculo
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-3">
              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("sexo")}>
                <span className="text-slate-400 block text-xs">1) Sexo:</span>
                {perfilEditando === "sexo" ? (
                  <select
                    value={perfilRisco.sexo}
                    onChange={(e) => atualizarPerfil("sexo", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-blue-500"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.sexo}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("tipoUso")}>
                <span className="text-slate-400 block text-xs">2) Tipo de Uso:</span>
                {perfilEditando === "tipoUso" ? (
                  <select
                    value={perfilRisco.tipoUso}
                    onChange={(e) => atualizarPerfil("tipoUso", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-blue-500"
                  >
                    <option value="Particular">Particular</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.tipoUso}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("condutorMenor25")}>
                <span className="text-slate-400 block text-xs">3) Condutores menor ou igual a 25 anos?</span>
                {perfilEditando === "condutorMenor25" ? (
                  <select
                    value={perfilRisco.condutorMenor25}
                    onChange={(e) => atualizarPerfil("condutorMenor25", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-blue-500"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.condutorMenor25}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("garagemResidencia")}>
                <span className="text-slate-400 block text-xs">4) Garagem na Residência:</span>
                {perfilEditando === "garagemResidencia" ? (
                  <select
                    value={perfilRisco.garagemResidencia}
                    onChange={(e) => atualizarPerfil("garagemResidencia", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-blue-500"
                  >
                    <option value="Coberta">Coberta</option>
                    <option value="Estacionamento">Estacionamento</option>
                    <option value="Não Possui">Não Possui</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.garagemResidencia}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("garagemTrabalho")}>
                <span className="text-slate-400 block text-xs">5) Garagem no Trabalho:</span>
                {perfilEditando === "garagemTrabalho" ? (
                  <select
                    value={perfilRisco.garagemTrabalho}
                    onChange={(e) => atualizarPerfil("garagemTrabalho", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-blue-500"
                  >
                    <option value="Coberta">Coberta</option>
                    <option value="Estacionamento">Estacionamento</option>
                    <option value="Não Possui">Não Possui</option>
                    <option value="Não trabalha">Não trabalha</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.garagemTrabalho}</span>
                )}
              </div>

              <div className="p-2 rounded bg-slate-50/60 border border-slate-100 col-span-1 sm:col-span-2 md:col-span-1">
                <span className="text-slate-400 block text-xs mb-1">6) Dispositivos de segurança:</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                  {["Rastreador", "Bloqueador", "Alarme"].map((disp: string) => (
                    <label key={disp} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perfilRisco.dispositivosSeguranca.includes(disp)}
                        onChange={() => gerenciarCheckboxSeguranca(disp)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      {disp}
                    </label>
                  ))}
                </div>
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("sinistrosAnteriores")}>
                <span className="text-slate-400 block text-xs">7) Houve sinistros anteriores?</span>
                {perfilEditando === "sinistrosAnteriores" ? (
                  <select
                    value={perfilRisco.sinistrosAnteriores}
                    onChange={(e) => atualizarPerfil("sinistrosAnteriores", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-blue-500"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.sinistrosAnteriores}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("classeBonus")}>
                <span className="text-slate-400 block text-xs">8) Classe de Bônus:</span>
                {perfilEditando === "classeBonus" ? (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={perfilRisco.classeBonus}
                    onChange={(e) => atualizarPerfil("classeBonus", parseInt(e.target.value) || 0)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded px-2 py-0.5 text-xs focus:outline-blue-500 font-bold"
                  />
                ) : (
                  <span className="font-bold text-blue-700">Classe {perfilRisco.classeBonus}</span>
                )}
              </div>
            </div>
          </div>

          {/* PAINEL DE GESTÃO E INCLUSÃO DE QUALQUER COBERTURA (IGUAL RESIDENCIAL/EMPRESARIAL) */}
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm no-print">
            
            {/* Lado A: Incluir Coberturas do Sistema (Padrão) */}
            <div className="flex flex-col gap-1.5 justify-center">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ativar Cobertura Padrão</span>
              <select
                value=""
                onChange={(e) => {
                  const novaCob = e.target.value as CoberturaChave;
                  if (novaCob && !coberturasAtivas.includes(novaCob)) {
                    setCoberturasAtivas((prev) => [...prev, novaCob]);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-blue-500 cursor-pointer shadow-sm"
              >
                <option value="" disabled hidden>+ Escolher Cobertura Automotiva Padrão</option>
                {ESTRUTURA_COBERTURAS.filter((c: any) => !coberturasAtivas.includes(c.id)).map((cob: any) => (
                  <option key={cob.id} value={cob.id}>{cob.nome}</option>
                ))}
              </select>
            </div>

            {/* Lado B: Criar QUALQUER Cobertura Não Prevista */}
            <div className="flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-slate-300 pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Criar Cobertura Adicional (Livre)</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Martelinho de Ouro, Rastreador Combo..."
                  value={nomeNovaCobertura}
                  onChange={(e) => setNomeNovaCobertura(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-blue-500 bg-white"
                />
                <select
                  value={tipoInputNovaCobertura}
                  onChange={(e) => setTipoInputNovaCobertura(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-xs focus:outline-blue-500 bg-white cursor-pointer font-medium text-slate-600"
                >
                  <option value="moeda">Moeda (R$)</option>
                  <option value="texto">Texto Livre</option>
                  <option value="km">Km (Distância)</option>
                  <option value="carro_reserva">Carro Reserva</option>
                </select>
                <button
                  onClick={adicionarCoberturaCustomizada}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  + Criar
                </button>
              </div>
            </div>
          </div>

          {/* MATRIZ DE COBERTURAS COMPARATIVA */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-1/4">Coberturas e Serviços</th>
                    {opcoes.map((opt: any) => (
                      <th key={opt.id} className="py-3 px-4 font-bold text-center border-l border-slate-700 bg-slate-900">
                        <div className="flex flex-col items-center gap-1">
                          {opt.base_seguradoras?.logo_url && (
                            <img 
                              src={opt.base_seguradoras.logo_url} 
                              alt={opt.base_seguradoras?.nome} 
                              className="h-6 object-contain mb-1 max-w-[100px] bg-white rounded p-0.5"
                            />
                          )}
                          <span>{opt.base_seguradoras?.nome || "Opção"}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-200">
                  
                  {/* UNIFICA E MAPEIA AS DUAS LISTAS: PADRÕES ATIVAS + TOTALMENTE CUSTOMIZADAS */}
                  {[
                    ...ESTRUTURA_COBERTURAS.filter((c: any) => coberturasAtivas.includes(c.id)),
                    ...coberturasCustomizadas
                  ].map((cob: any) => (
                    <tr key={cob.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50/50 flex items-center justify-between gap-2">
                        <span>{cob.nome}</span>
                        <button
                          onClick={() => {
                            // Se o ID começar com 'custom_', remove do estado customizado, senão do padrão
                            if (cob.id.toString().startsWith("custom_")) {
                              setCoberturasCustomizadas((prev) => prev.filter((c) => c.id !== cob.id));
                            } else {
                              setCoberturasAtivas((prev: any) => prev.filter((id: string) => id !== cob.id));
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all no-print"
                          title="Excluir Cobertura"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      {opcoes.map((opt: any) => {
                        const esAtivo = celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === cob.id;
                        const valorAtual = valoresMatriz[opt.id]?.[cob.id];

                        return (
                          <td 
                            key={opt.id} 
                            className="py-3 px-4 text-center border-l border-slate-100 text-slate-600 min-w-[160px] cursor-pointer hover:bg-blue-50/40"
                            onClick={() => !esAtivo && setCelulaAtiva({ opcaoId: opt.id, cobId: cob.id })}
                          >
                            {esAtivo ? (
                              <div className="flex flex-col gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                                {cob.tipoInput === "texto" && (
                                  <input
                                    type="text"
                                    value={valorAtual || ""}
                                    onChange={(e) => atualizarCelula(opt.id, cob.id, e.target.value)}
                                    onBlur={() => setCelulaAtiva(null)}
                                    autoFocus
                                    className="w-full text-center border rounded px-2 py-1 text-xs focus:outline-blue-500"
                                  />
                                )}

                                {cob.tipoInput === "moeda" && (
                                  <input
                                    type="text"
                                    value={valorAtual || ""}
                                    onChange={(e) => atualizarCelula(opt.id, cob.id, e.target.value)}
                                    onBlur={() => setCelulaAtiva(null)}
                                    placeholder="R$ 100.000,00"
                                    autoFocus
                                    className="w-full text-center border rounded px-2 py-1 text-xs focus:outline-blue-500"
                                  />
                                )}

                                {cob.tipoInput === "km" && (
                                  <input
                                    type="text"
                                    value={valorAtual || ""}
                                    onChange={(e) => atualizarCelula(opt.id, cob.id, e.target.value)}
                                    onBlur={() => setCelulaAtiva(null)}
                                    placeholder="Ex: 400 KM ou Ilimitado"
                                    autoFocus
                                    className="w-full text-center border rounded px-2 py-1 text-xs focus:outline-blue-500"
                                  />
                                )}

                                {cob.tipoInput === "carro_reserva" && (
                                  <select
                                    value={valorAtual || "Não Contratado"}
                                    onChange={(e) => atualizarCelula(opt.id, cob.id, e.target.value)}
                                    onBlur={() => setCelulaAtiva(null)}
                                    autoFocus
                                    className="w-full text-center border rounded px-1 py-1 text-xs focus:outline-blue-500"
                                  >
                                    <option value="Não Contratado">Não Contratado</option>
                                    <option value="7 Dias">7 Dias</option>
                                    <option value="15 Dias">15 Dias</option>
                                    <option value="30 Dias">30 Dias</option>
                                    <option value="Porto Plus">Porto Plus</option>
                                  </select>
                                )}

                                {cob.tipoInput === "franquia_estrutura" && (
                                  <div className="flex flex-col gap-1 w-full" onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) setCelulaAtiva(null);
                                  }}>
                                    <input
                                      type="text"
                                      value={valorAtual?.valor || ""}
                                      placeholder="R$ 3.000,00"
                                      onChange={(e) => atualizarFranquiaEstrutura(opt.id, "valor", e.target.value)}
                                      className="w-full text-center border rounded px-2 py-0.5 text-xs focus:outline-blue-500"
                                      autoFocus
                                    />
                                    <select
                                      value={valorAtual?.tipo || "Obrigatória"}
                                      onChange={(e) => atualizarFranquiaEstrutura(opt.id, "tipo", e.target.value)}
                                      className="w-full text-center border rounded px-1 py-0.5 text-xs focus:outline-blue-500"
                                    >
                                      <option value="Reduzida">Reduzida</option>
                                      <option value="Obrigatória">Obrigatória</option>
                                      <option value="Majorada">Majorada</option>
                                      <option value="Isenta">Isenta</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-medium block text-slate-700 text-xs">
                                {cob.id === "franquia" ? obterTextoFranquia(opt.id) : (valorAtual || "Não Contratado")}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* FINANCEIRO: FORMA DE PAGAMENTO */}
                  <tr className="bg-slate-100/50 font-medium">
                    <td className="py-3 px-4 text-slate-500">Forma de Pagamento</td>
                    {opcoes.map((opt: any) => (
                      <td 
                        key={opt.id} 
                        className="py-2 px-4 text-center border-l border-slate-200 cursor-pointer"
                        onClick={() => setCelulaAtiva({ opcaoId: opt.id, cobId: "formaPagamento" })}
                      >
                        {celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === "formaPagamento" ? (
                          <select
                            value={valoresMatriz[opt.id]?.formaPagamento || "Boleto"}
                            onChange={(e) => atualizarCelula(opt.id, "formaPagamento", e.target.value)}
                            onBlur={() => setCelulaAtiva(null)}
                            autoFocus
                            className="text-center border rounded px-1 py-0.5 text-xs bg-white"
                          >
                            <option value="Boleto">Boleto</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Débito em Conta">Débito em Conta</option>
                            <option value="Pix">Pix</option>
                          </select>
                        ) : (
                          <span className="text-slate-800 text-xs font-semibold">{valoresMatriz[opt.id]?.formaPagamento}</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* FINANCEIRO: CONDICÃO DE PARCELAS */}
                  <tr className="bg-slate-100/50 font-medium">
                    <td className="py-3 px-4 text-slate-500">Condição de Parcelamento</td>
                    {opcoes.map((opt: any) => (
                      <td 
                        key={opt.id} 
                        className="py-2 px-4 text-center border-l border-slate-200 cursor-pointer"
                        onClick={() => setCelulaAtiva({ opcaoId: opt.id, cobId: "parcelamento" })}
                      >
                        {celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === "parcelamento" ? (
                          <input
                            type="text"
                            value={valoresMatriz[opt.id]?.parcelamento || ""}
                            onChange={(e) => atualizarCelula(opt.id, "parcelamento", e.target.value)}
                            onBlur={() => setCelulaAtiva(null)}
                            autoFocus
                            className="w-16 text-center border rounded py-0.5 text-xs bg-white"
                          />
                        ) : (
                          <span className="text-slate-800 text-xs font-semibold">{valoresMatriz[opt.id]?.parcelamento}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* LINHA FINAL: INVESTIMENTO TOTAL */}
                  <tr className="bg-blue-50/60 font-bold border-t-2 border-slate-300">
                    <td className="py-4 px-4 text-blue-900 text-base">INVESTIMENTO TOTAL (Prêmio)</td>
                    {opcoes.map((opt: any) => (
                      <td 
                        key={opt.id} 
                        className="py-4 px-4 text-center border-l border-blue-100 text-emerald-600 text-base cursor-pointer"
                        onClick={() => setCelulaAtiva({ opcaoId: opt.id, cobId: "valorTotal" })}
                      >
                        {celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === "valorTotal" ? (
                          <input
                            type="number"
                            value={valoresMatriz[opt.id]?.valorTotal || 0}
                            onChange={(e) => atualizarCelula(opt.id, "valorTotal", parseFloat(e.target.value) || 0)}
                            onBlur={() => setCelulaAtiva(null)}
                            autoFocus
                            className="w-28 text-center border rounded py-1 text-sm text-slate-800 font-bold"
                          />
                        ) : (
                          <span>{formatarMoeda(valoresMatriz[opt.id]?.valorTotal)}</span>
                        )}
                      </td>
                    ))}
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