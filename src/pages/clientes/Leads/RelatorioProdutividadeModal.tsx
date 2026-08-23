import { useState, useEffect } from "react";
import { 
  X, Phone, MessageCircle, Mail, Calendar, 
  TrendingUp, CheckCircle, ChevronDown, ChevronUp, MapPin, HelpCircle, FileText 
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RelatorioProdutividadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  corretorId?: string;
  corretoraId: string;
}

export default function RelatorioProdutividadeModal({
  isOpen,
  onClose,
  corretorId,
  corretoraId
}: RelatorioProdutividadeModalProps) {
  const [loading, setLoading] = useState(true);
  const [clientesAgrupados, setClientesAgrupados] = useState<any[]>([]);
  const [periodoFiltro, setPeriodoFiltro] = useState<"hoje" | "7d" | "30d" | "todos">("7d");
  const [expandidos, setExpandidos] = useState<{ [key: string]: boolean }>({});
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Contadores
  const [passadoWhats, setPassadoWhats] = useState(0);
  const [passadoLigacao, setPassadoLigacao] = useState(0);
  const [passadoVisita, setPassadoVisita] = useState(0);
  const [passadoEmail, setPassadoEmail] = useState(0);
  const [passadoOutros, setPassadoOutros] = useState(0);

  const [futuroWhats, setFuturoWhats] = useState(0);
  const [futuroLigar, setFuturoLigar] = useState(0);
  const [futuroVisitar, setFuturoVisitar] = useState(0);
  const [futuroOutros, setFuturoOutros] = useState(0);

  const [clientesUnicosFalados, setClientesUnicosFalados] = useState(0);
  const [taxaConversaoSucesso, setTaxaConversaoSucesso] = useState(0);
  
  // Utilizado para renderizar as estatísticas de desfecho na interface
  const [desfechoStats, setDesfechoStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (isOpen) {
      carregarDadosRelatorio();
    }
  }, [isOpen, periodoFiltro, corretorId]);

  const carregarDadosRelatorio = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tab_clientes_frios_acoes")
        .select(`
          id, tipo_acao, desfecho, criado_em, observacao, cliente_frio_id,
          tab_clientes_frios (
            id, razao_social, nome_fantasia, cnpj, temperatura, fase_atendimento,
            municipio, uf, proxima_acao, data_retorno, horario_retorno
          )
        `)
        .eq("tab_clientes_frios.corretora_id", corretoraId);

      if (corretorId) {
        query = query.eq("corretor_id", corretorId);
      }

      const agora = new Date();
      if (periodoFiltro === "hoje") {
        query = query.gte("criado_em", new Date(agora.setHours(0, 0, 0, 0)).toISOString());
      } else if (periodoFiltro === "7d") {
        query = query.gte("criado_em", new Date(agora.setDate(agora.getDate() - 7)).toISOString());
      } else if (periodoFiltro === "30d") {
        query = query.gte("criado_em", new Date(agora.setDate(agora.getDate() - 30)).toISOString());
      }

      const { data, error } = await query.order("criado_em", { ascending: false });
      if (error) throw error;

      const listaAcoes = data || [];
      let pWhats = 0, pLigacao = 0, pVisita = 0, pEmail = 0, pOutros = 0;
      const dStats: { [key: string]: number } = {};
      const mapaClientes: { [key: string]: any } = {};

      listaAcoes.forEach((acao: any) => {
        const tipo = (acao.tipo_acao || "").toLowerCase();
        if (tipo.includes("whats") || tipo.includes("chamar_whats")) pWhats++;
        else if (tipo.includes("ligar") || tipo.includes("ligacao")) pLigacao++;
        else if (tipo.includes("visita") || tipo.includes("visitar")) pVisita++;
        else if (tipo.includes("email")) pEmail++;
        else pOutros++;

        const desfecho = acao.desfecho || "nao_informado";
        dStats[desfecho] = (dStats[desfecho] || 0) + 1;

        const clienteId = acao.cliente_frio_id;
        if (clienteId) {
          if (!mapaClientes[clienteId]) {
            mapaClientes[clienteId] = { cliente: acao.tab_clientes_frios, totalAcoes: 0, ultimaInteracao: acao.criado_em, acoes: [] };
          }
          mapaClientes[clienteId].totalAcoes += 1;
          mapaClientes[clienteId].acoes.push(acao);
          if (new Date(acao.criado_em) > new Date(mapaClientes[clienteId].ultimaInteracao)) {
            mapaClientes[clienteId].ultimaInteracao = acao.criado_em;
          }
        }
      });

      setPassadoWhats(pWhats); setPassadoLigacao(pLigacao); setPassadoVisita(pVisita); setPassadoEmail(pEmail); setPassadoOutros(pOutros);
      setDesfechoStats(dStats);

      const arrayClientesUnicos = Object.values(mapaClientes);
      setClientesUnicosFalados(arrayClientesUnicos.length);

      let avancadosPositivos = 0;
      arrayClientesUnicos.forEach((item: any) => {
        const fase = (item.cliente?.fase_atendimento || "").toLowerCase().trim();
        if (fase.includes("cotacao_enviada") || fase.includes("cotação enviada") || fase.includes("em_negociacao") || fase.includes("em negociação") || fase.includes("vendido")) {
          avancadosPositivos++;
        }
      });

      setTaxaConversaoSucesso(Math.round(arrayClientesUnicos.length > 0 ? (avancadosPositivos / arrayClientesUnicos.length) * 100 : 0));

      let fWhats = 0, fLigar = 0, fVisitar = 0, fOutros = 0;
      arrayClientesUnicos.forEach((item: any) => {
        const prox = item.cliente?.proxima_acao;
        if (Array.isArray(prox)) {
          prox.forEach((p: string) => {
            const pLower = p.toLowerCase();
            if (pLower.includes("whats")) fWhats++;
            else if (pLower.includes("ligar")) fLigar++;
            else if (pLower.includes("visita")) fVisitar++;
            else fOutros++;
          });
        }
      });

      setFuturoWhats(fWhats); setFuturoLigar(fLigar); setFuturoVisitar(fVisitar); setFuturoOutros(fOutros);

      setClientesAgrupados(arrayClientesUnicos.sort((a: any, b: any) => new Date(b.ultimaInteracao).getTime() - new Date(a.ultimaInteracao).getTime()));

    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandir = (clienteId: string) => {
    setExpandidos(prev => ({ ...prev, [clienteId]: !prev[clienteId] }));
  };

  // =====================================================================
  // GERAÇÃO DE PDF GARANTIDA COM JSPDF NATIVO
  // =====================================================================
  const exportarPDF = () => {
    setGerandoPdf(true);
    try {
      const doc = new jsPDF();

      // 1. Cabeçalho do Relatório
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); 
      doc.text("Relatório Analítico de Produtividade", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Período: ${periodoFiltro.toUpperCase()} | Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);

      // 2. Os Cards de Resumo desenhados em formato de tabela
      autoTable(doc, {
        startY: 28,
        head: [['Clientes Únicos', 'Taxa Positiva (Funil)', 'Ações Realizadas', 'Ações Planejadas']],
        body: [[
          clientesUnicosFalados.toString(),
          `${taxaConversaoSucesso}%`,
          (passadoWhats + passadoLigacao + passadoVisita + passadoEmail + passadoOutros).toString(),
          (futuroWhats + futuroLigar + futuroVisitar + futuroOutros).toString()
        ]],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 12, textColor: [15, 23, 42] }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 12;

      // 3. Título da Lista
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`Relação de Clientes e Histórico de Interações (${clientesAgrupados.length})`, 14, finalY);
      finalY += 6;

      // 4. Loop de Clientes
      clientesAgrupados.forEach((item, idx) => {
        const cliente = item.cliente || {};
        const nome = cliente.razao_social || cliente.nome_fantasia || "Empresa sem razão social";
        const fase = (cliente.fase_atendimento || "N/A").replace(/_/g, " ").toUpperCase();
        const cidade = cliente.municipio ? `${cliente.municipio}-${cliente.uf}` : "N/A";
        
        autoTable(doc, {
          startY: finalY,
          head: [[`${idx + 1}. ${nome}`]],
          body: [[
            `Fase Atual: ${fase}  |  Localidade: ${cidade}  |  Total de Ações: ${item.totalAcoes}`
          ]],
          theme: 'plain',
          headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' }, 
          bodyStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 9 },
          margin: { bottom: 0 }
        });
        finalY = (doc as any).lastAutoTable.finalY;

        if (item.acoes && item.acoes.length > 0) {
          const historicoBody = item.acoes.map((a: any) => [
            new Date(a.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
            (a.tipo_acao || "").replace(/_/g, " ").toUpperCase(),
            (a.desfecho || "").replace(/_/g, " ").toUpperCase(),
            a.observacao || "-"
          ]);

          autoTable(doc, {
            startY: finalY,
            head: [['Data/Hora', 'Ação', 'Desfecho', 'Observação']],
            body: historicoBody,
            theme: 'grid',
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
            columnStyles: {
              0: { cellWidth: 28 },
              1: { cellWidth: 32 },
              2: { cellWidth: 35 },
              3: { cellWidth: 'auto' }
            }
          });
          finalY = (doc as any).lastAutoTable.finalY + 8;
        } else {
          finalY += 8;
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`relatorio-produtividade-${periodoFiltro}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Ocorreu um erro ao gerar o relatório.");
    } finally {
      setGerandoPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 px-6 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Painel de Desempenho e Produtividade
            </h2>
            <p className="text-xs text-indigo-200">Métricas analíticas de interações, histórico passado e planejamento futuro</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1 rounded-xl flex text-xs font-medium">
              {(["hoje", "7d", "30d", "todos"] as const).map((p) => (
                <button 
                  key={p}
                  onClick={() => setPeriodoFiltro(p)} 
                  className={`px-3 py-1 rounded-lg transition-all capitalize ${periodoFiltro === p ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"}`}
                >
                  {p === "todos" ? "Geral" : p}
                </button>
              ))}
            </div>

            <button
              onClick={exportarPDF}
              disabled={gerandoPdf || loading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow"
            >
              <FileText className="w-4 h-4" /> {gerandoPdf ? "Processando..." : "Exportar PDF"}
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Rolável da Tela */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Processando métricas operacionais...</p>
            </div>
          ) : (
            <>
              {/* BLOCO 1: AÇÕES EXECUTADAS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-indigo-600" /> Ações Realizadas no Passado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">WhatsApp</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{passadoWhats}</h3>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Ligação</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{passadoLigacao}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Visita Presencial</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{passadoVisita}</h3>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">E-mail</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{passadoEmail}</h3>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Mail className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Outros</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{passadoOutros}</h3>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><HelpCircle className="w-5 h-5" /></div>
                  </div>
                </div>
              </div>

              {/* BLOCO DE DESFECHOS RESTAURADO PARA REMOVER O ERRO DE LINT E VOLTAR PRO DASHBOARD */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> Desfechos das Ações Executadas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "atendeu", label: "Atendeu / Conversou", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { key: "caixa_postal", label: "Caixa Postal / Não Atendeu", color: "bg-amber-50 text-amber-700 border-amber-200" },
                    { key: "ocupado", label: "Ocupado", color: "bg-orange-50 text-orange-700 border-orange-200" },
                    { key: "numero_invalido", label: "Número Inválido", color: "bg-rose-50 text-rose-700 border-rose-200" },
                    { key: "deixou_recado", label: "Deixou Recado", color: "bg-blue-50 text-blue-700 border-blue-200" },
                    { key: "pediu_ligar_depois", label: "Pediu Ligar Depois", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
                    { key: "sem_interesse", label: "Sem Interesse", color: "bg-slate-100 text-slate-700 border-slate-200" }
                  ].map((item) => (
                    <div key={item.key} className={`p-3 rounded-xl border flex justify-between items-center ${item.color}`}>
                      <span className="text-xs font-semibold">{item.label}</span>
                      <span className="text-sm font-extrabold">{desfechoStats[item.key] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOCO 2: PLANEJAMENTO FUTURO */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Próximas Ações Planejadas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Chamar no Whats</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{futuroWhats}</h3>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Ligar</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{futuroLigar}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Visitar</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{futuroVisitar}</h3>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Outros</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{futuroOutros}</h3>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><HelpCircle className="w-5 h-5" /></div>
                  </div>
                </div>
              </div>

              {/* LISTA DE CLIENTES E HISTÓRICO NA TELA */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Clientes Abordados ({clientesAgrupados.length}) • Únicos: {clientesUnicosFalados} • Taxa Positiva: {taxaConversaoSucesso}%
                  </h3>
                </div>

                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {clientesAgrupados.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-xs text-slate-500 font-medium">Nenhum cliente abordado no período selecionado.</p>
                    </div>
                  ) : (
                    clientesAgrupados.map((item: any) => {
                      const cliente = item.cliente || {};
                      const clienteId = cliente.id || Math.random();
                      const estaExpandido = !!expandidos[clienteId];

                      return (
                        <div key={clienteId} className="hover:bg-slate-50/80 transition-colors">
                          <div className="p-4 flex justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button onClick={() => toggleExpandir(clienteId)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
                                {estaExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm flex gap-2">
                                  {cliente.razao_social || cliente.nome_fantasia || "Empresa sem razão social"}
                                  <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">{item.totalAcoes} ações</span>
                                </h4>
                              </div>
                            </div>
                          </div>

                          {estaExpandido && (
                            <div className="bg-slate-50 px-12 py-3 border-t border-slate-100 space-y-2">
                              {item.acoes.map((acao: any) => (
                                <div key={acao.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex gap-2 items-center">
                                  <span className="font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-1 rounded text-[10px] whitespace-nowrap">
                                    {acao.tipo_acao?.replace(/_/g, " ")}
                                  </span>
                                  {acao.desfecho && (
                                    <span className="font-bold text-slate-600 uppercase bg-slate-200 px-2 py-1 rounded text-[10px] whitespace-nowrap">
                                      {acao.desfecho?.replace(/_/g, " ")}
                                    </span>
                                  )}
                                  <span className="text-slate-500 italic ml-2">{acao.observacao || "Sem observação"}</span>
                                  <span className="ml-auto text-[10px] text-slate-400">
                                    {new Date(acao.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}