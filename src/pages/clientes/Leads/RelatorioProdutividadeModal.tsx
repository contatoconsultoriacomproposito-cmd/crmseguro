import { useState, useEffect } from "react";
import { 
  X, Phone, MessageCircle, Mail, Users, Calendar, 
  TrendingUp, CheckCircle, ChevronDown, ChevronUp, MapPin 
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

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

  // Métricas Calculadas
  const [totalLigacoes, setTotalLigacoes] = useState(0);
  const [totalWhats, setTotalWhats] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const [clientesUnicosFalados, setClientesUnicosFalados] = useState(0);
  const [taxaConversaoSucesso, setTaxaConversaoSucesso] = useState(0);

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
          id,
          tipo_acao,
          desfecho,
          criado_em,
          observacao,
          cliente_frio_id,
          tab_clientes_frios (
            id,
            razao_social,
            nome_fantasia,
            cnpj,
            temperatura,
            fase_atendimento,
            municipio,
            uf
          )
        `)
        .eq("tab_clientes_frios.corretora_id", corretoraId);

      if (corretorId) {
        query = query.eq("corretor_id", corretorId);
      }

      // Filtro por Período
      const agora = new Date();
      if (periodoFiltro === "hoje") {
        const inicioHoje = new Date(agora.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte("criado_em", inicioHoje);
      } else if (periodoFiltro === "7d") {
        const seteDiasAtras = new Date(agora.setDate(agora.getDate() - 7)).toISOString();
        query = query.gte("criado_em", seteDiasAtras);
      } else if (periodoFiltro === "30d") {
        const trintaDiasAtras = new Date(agora.setDate(agora.getDate() - 30)).toISOString();
        query = query.gte("criado_em", trintaDiasAtras);
      }

      const { data, error } = await query.order("criado_em", { ascending: false });

      if (error) throw error;

      const listaAcoes = data || [];

      // Processamento de Indicadores (KPIs)
      let ligacoes = 0;
      let whats = 0;
      let emails = 0;
      let sucessos = 0;
      const mapaClientes: { [key: string]: any } = {};

      listaAcoes.forEach((acao: any) => {
        if (acao.tipo_acao === "ligar" || acao.tipo_acao === "ligacao") ligacoes++;
        if (acao.tipo_acao === "whatsapp" || acao.tipo_acao === "whats") whats++;
        if (acao.tipo_acao === "email") emails++;

        if (["atendeu", "interesse", "reuniao_agendada", "vendido"].includes(acao.desfecho)) {
          sucessos++;
        }

        const clienteId = acao.cliente_frio_id;
        if (clienteId) {
          if (!mapaClientes[clienteId]) {
            mapaClientes[clienteId] = {
              cliente: acao.tab_clientes_frios,
              totalAcoes: 0,
              ultimaInteracao: acao.criado_em,
              acoes: []
            };
          }
          mapaClientes[clienteId].totalAcoes += 1;
          mapaClientes[clienteId].acoes.push(acao);
          
          // Mantém a data mais recente
          if (new Date(acao.criado_em) > new Date(mapaClientes[clienteId].ultimaInteracao)) {
            mapaClientes[clienteId].ultimaInteracao = acao.criado_em;
          }
        }
      });

      setTotalLigacoes(ligacoes);
      setTotalWhats(whats);
      setTotalEmails(emails);
      setClientesUnicosFalados(Object.keys(mapaClientes).length);

      const taxa = listaAcoes.length > 0 ? (sucessos / listaAcoes.length) * 100 : 0;
      setTaxaConversaoSucesso(Math.round(taxa));

      // Transforma o mapa em array ordenado por última interação
      const clientesArray = Object.values(mapaClientes).sort((a: any, b: any) => 
        new Date(b.ultimaInteracao).getTime() - new Date(a.ultimaInteracao).getTime()
      );

      setClientesAgrupados(clientesArray);

    } catch (err) {
      console.error("Erro ao carregar relatório de produtividade:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandir = (clienteId: string) => {
    setExpandidos(prev => ({ ...prev, [clienteId]: !prev[clienteId] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 px-6 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Painel de Desempenho e Produtividade
            </h2>
            <p className="text-xs text-indigo-200">Métricas analíticas de interações e prospecção ativa</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Seletor de Período */}
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
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Rolável */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Processando métricas de atendimento...</p>
            </div>
          ) : (
            <>
              {/* Cards de Desempenho (KPIs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ligações</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalLigacoes}</h3>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WhatsApp</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalWhats}</h3>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-mails</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalEmails}</h3>
                  </div>
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Únicos</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{clientesUnicosFalados}</h3>
                  </div>
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa Positiva</p>
                    <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{taxaConversaoSucesso}%</h3>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Seção Inferior: Clientes Abordados (Agrupados com Expansão) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Clientes Abordados ({clientesAgrupados.length})
                  </h3>
                  <span className="text-xs text-slate-400">Clique na seta para ver o histórico de ações</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {clientesAgrupados.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Nenhum cliente abordado no período selecionado.</p>
                    </div>
                  ) : (
                    clientesAgrupados.map((item: any) => {
                      const cliente = item.cliente || {};
                      const clienteId = cliente.id || Math.random();
                      const estaExpandido = !!expandidos[clienteId];

                      return (
                        <div key={clienteId} className="hover:bg-slate-50/80 transition-colors">
                          {/* Linha Principal do Cliente */}
                          <div className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleExpandir(clienteId)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                title={estaExpandido ? "Recolher histórico" : "Expandir histórico"}
                              >
                                {estaExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              <div>
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                                  {cliente.razao_social || cliente.nome_fantasia || "Empresa sem razão social"}
                                  <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                    {item.totalAcoes} {item.totalAcoes === 1 ? 'ação' : 'ações'}
                                  </span>
                                </h4>
                                
                                {cliente.municipio && (
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {cliente.municipio} - {cliente.uf}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right text-[11px] text-slate-400 font-medium">
                              Última: {new Date(item.ultimaInteracao).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                            </div>
                          </div>

                          {/* Bloco Expandido com o Histórico de Ações do Cliente */}
                          {estaExpandido && (
                            <div className="bg-slate-50/80 px-12 py-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Histórico detalhado de interações com este cliente:
                              </p>
                              {item.acoes.map((acao: any) => (
                                <div key={acao.id} className="bg-white p-3 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      {acao.tipo_acao && (
                                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                                          {acao.tipo_acao.replace("_", " ")}
                                        </span>
                                      )}
                                      {acao.desfecho && (
                                        <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                                          {acao.desfecho.replace(/_/g, " ")}
                                        </span>
                                      )}
                                    </div>
                                    {acao.observacao && (
                                      <p className="text-xs text-slate-600 italic">
                                        "{acao.observacao}"
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    📅 {new Date(acao.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
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

        {/* Rodapé */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors shadow"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
}