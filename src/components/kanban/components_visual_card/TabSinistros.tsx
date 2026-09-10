import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient"; 
import { 
  AlertCircle, 
  FileText, 
  Calendar, 
  Building2, 
  User, 
  PlusCircle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2,
  Eye,
  CheckCircle,
  History,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { ModalGerenciamentoSinistro } from "./ModalGerenciamentoSinistro";
import { formatarDataBR } from "../../../utils/dateUtils";

interface TabSinistrosProps {
  clienteId?: string;
  onUpdate?: () => void;
}

const ETAPAS = ['Abertura', 'Cadastro', 'Avaliação', 'Solução', 'Conclusão'];

export default function TabSinistros({ clienteId, onUpdate }: TabSinistrosProps) {
  const [itensProposta, setItensProposta] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [modalSinistroAberto, setModalSinistroAberto] = useState<boolean>(false);
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  const [sinistroSelecionadoId, setSinistroSelecionadoId] = useState<string | null>(null);

  // Estado para controlar expansão do histórico de sinistros antigos por item
  const [historicoAberto, setHistoricoAberto] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (clienteId) {
      carregarProdutosDoCliente();
    }
  }, [clienteId]);

  const toggleHistorico = (itemId: string) => {
    setHistoricoAberto(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const carregarProdutosDoCliente = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tab_proposta_itens")
        .select(`
          *,
          base_produtos ( id, nome ),
          tab_proposta_opcoes!inner (
            id,
            base_seguradoras ( id, nome ),
            tab_propostas!inner (
              id,
              cliente_id,
              tab_clientes ( id, nome_razao_social )
            )
          ),
          tab_sinistros (
            id,
            status,
            etapa_atual,
            data_abertura,
            data_conclusao,
            tab_sinistros_ocorrencias (
              id,
              etapa,
              relato,
              data_retorno,
              horario_retorno,
              criado_em
            )
          )
        `)
        .eq("tab_proposta_opcoes.tab_propostas.cliente_id", clienteId);

      if (error) throw error;

      setItensProposta(data || []);
    } catch (err) {
      console.error("Erro ao carregar produtos para sinistro:", err);
      setItensProposta([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8 text-slate-500 text-xs font-medium">
        Carregando produtos e sinistros...
      </div>
    );
  }

  if (itensProposta.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
        <AlertCircle className="w-8 h-8 mb-2 text-slate-300 dark:text-zinc-600" />
        <p className="text-xs font-medium">Nenhum produto/apólice encontrado para este cliente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {itensProposta.map((item) => {
          const opcao = item.tab_proposta_opcoes;
          const proposta = opcao?.tab_propostas;
          const cliente = proposta?.tab_clientes;
          const seguradoraObj = opcao?.base_seguradoras;

          const nomeCliente = cliente?.nome_razao_social || "Cliente não informado";
          const seguradora = seguradoraObj?.nome || "Seguradora não informada";
          const nomeProduto = item.base_produtos?.nome || "Produto não informado";
          const valorPremio = item.valor_premio ?? item.valor_liquido;

          const sinistrosList = item.tab_sinistros || [];
          
          // 1. Sinistro Aberto (Em andamento)
          const sinistroAtivo = sinistrosList.find((s: any) => s.status === "Aberto");
          const possuiSinistroAberto = !!sinistroAtivo;

          // 2. Sinistros Encerrados (Histórico Concluído)
          const sinistrosEncerrados = sinistrosList
            .filter((s: any) => s.status === "Encerrado")
            .sort((a: any, b: any) => new Date(b.data_conclusao || b.data_abertura).getTime() - new Date(a.data_conclusao || a.data_abertura).getTime());

          // Ocorrências do sinistro ativo
          const ocorrenciasAtivas = (sinistroAtivo?.tab_sinistros_ocorrencias || []).sort(
            (a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
          );

          const etapaAtivaIndex = sinistroAtivo ? ETAPAS.indexOf(sinistroAtivo.etapa_atual || "Abertura") : -1;

          return (
            <div 
              key={item.id} 
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between gap-4 ${
                possuiSinistroAberto 
                  ? "border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-400/20" 
                  : "border-slate-200 dark:border-zinc-800"
              }`}
            >
              {/* Linha Superior: Cliente, Seguradora e Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{nomeCliente}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  {possuiSinistroAberto && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                      <ShieldAlert size={12} className="animate-pulse" />
                      Em Andamento ({sinistroAtivo.etapa_atual})
                    </span>
                  )}

                  {!possuiSinistroAberto && sinistrosEncerrados.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={11} />
                      {sinistrosEncerrados.length} Sinistro(s) Concluído(s)
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-blue-600 dark:text-blue-400">{seguradora}</span>
                  </div>
                </div>
              </div>

              {/* Linha do Meio: Produto, Valor e Vigência */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{nomeProduto}</span>
                    {item.numero_apolice && (
                      <span className="text-[11px] font-medium text-slate-400">
                        • Apólice: {item.numero_apolice}
                      </span>
                    )}
                  </div>
                  {valorPremio !== undefined && valorPremio !== null && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pl-6 font-semibold">
                      {Number(valorPremio).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-zinc-800 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {item.data_inicio_vigencia ? new Date(item.data_inicio_vigencia).toLocaleDateString('pt-BR') : "--/--/----"} 
                    {" a "} 
                    {item.data_fim_vigencia ? new Date(item.data_fim_vigencia).toLocaleDateString('pt-BR') : "--/--/----"}
                  </span>
                </div>
              </div>

              {/* SECTION 1: TIMELINE DO SINISTRO ATIVO */}
              {possuiSinistroAberto && (
                <div className="mt-1 bg-amber-50/40 dark:bg-zinc-800/40 rounded-2xl p-4 border border-amber-100 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 flex items-center gap-1.5 tracking-wider">
                      <Clock size={13} /> Esteira de Acompanhamento (Ativo)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Aberto em: {formatarDataBR(sinistroAtivo.data_abertura)}
                    </span>
                  </div>

                  {/* Indicador de Passos */}
                  <div className="relative flex justify-between px-2 pt-1">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-zinc-700 -translate-y-1/2 z-0" />
                    {ETAPAS.map((etapaNome, idx) => {
                      const isAtivo = idx <= etapaAtivaIndex;
                      const isConcluido = idx < etapaAtivaIndex;
                      return (
                        <div key={etapaNome} className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                              isAtivo
                                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200 dark:ring-amber-900'
                                : 'bg-white dark:bg-zinc-900 border border-slate-300 text-slate-400'
                            }`}
                          >
                            {isConcluido ? <CheckCircle2 size={13} /> : idx + 1}
                          </div>
                          <span className={`text-[9px] font-extrabold uppercase mt-1 ${
                            isAtivo ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'
                          }`}>
                            {etapaNome}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Última Ocorrência */}
                  {ocorrenciasAtivas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-zinc-700/50 space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        Última Ocorrência
                      </span>
                      <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-amber-100 dark:border-zinc-700/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase">
                            Etapa: {ocorrenciasAtivas[0].etapa}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {formatarDataBR(ocorrenciasAtivas[0].criado_em)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium">
                          "{ocorrenciasAtivas[0].relato}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: HISTÓRICO DE SINISTROS ENCERRADOS / CONCLUÍDOS */}
              {sinistrosEncerrados.length > 0 && (
                <div className="mt-1 border border-emerald-100 dark:border-zinc-800 rounded-2xl bg-emerald-50/30 dark:bg-zinc-800/20 overflow-hidden">
                  <button
                    onClick={() => toggleHistorico(item.id)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <History size={15} />
                      <span>Histórico de Sinistros Concluídos ({sinistrosEncerrados.length})</span>
                    </div>
                    {historicoAberto[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {/* Lista com os Sinistros Encerrados */}
                  {(historicoAberto[item.id] || !possuiSinistroAberto) && (
                    <div className="p-4 pt-2 space-y-4 border-t border-emerald-100 dark:border-zinc-800">
                      {sinistrosEncerrados.map((sinConcluido: any) => {
                        const ocoConcluidas = (sinConcluido.tab_sinistros_ocorrencias || []).sort(
                          (a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
                        );
                        const ultimaOcorrencia = ocoConcluidas[0];

                        return (
                          <div 
                            key={sinConcluido.id} 
                            className="bg-white dark:bg-zinc-800/80 rounded-2xl p-4 border border-emerald-200/60 dark:border-zinc-700/60 shadow-sm space-y-3"
                          >
                            <div className="flex justify-between items-center">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                                <CheckCircle size={12} /> Sinistro Concluído
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Concluído em: {sinConcluido.data_conclusao ? formatarDataBR(sinConcluido.data_conclusao) : formatarDataBR(sinConcluido.data_abertura)}
                                </span>
                                <button
                                  onClick={() => {
                                    setItemSelecionadoId(item.id);
                                    setSinistroSelecionadoId(sinConcluido.id);
                                    setModalSinistroAberto(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-zinc-700 border border-emerald-200 dark:border-zinc-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                  <Eye size={12} /> Ver Detalhes
                                </button>
                              </div>
                            </div>

                            {/* Timeline Completa Concluída (100% Verde) */}
                            <div className="relative flex justify-between px-2 pt-1">
                              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-200 dark:bg-emerald-900 -translate-y-1/2 z-0" />
                              {ETAPAS.map((etapaNome) => (
                                <div key={etapaNome} className="relative z-10 flex flex-col items-center">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black bg-emerald-600 text-white shadow-sm">
                                    <CheckCircle2 size={12} />
                                  </div>
                                  <span className="text-[8px] font-extrabold uppercase mt-1 text-emerald-700 dark:text-emerald-400">
                                    {etapaNome}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Relato Final da Conclusão */}
                            {ultimaOcorrencia && (
                              <div className="p-2.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-100 dark:border-zinc-800">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-black text-slate-500 uppercase">
                                    Relato Final ({ultimaOcorrencia.etapa}):
                                  </span>
                                  <span className="text-[8px] text-slate-400">
                                    {formatarDataBR(ultimaOcorrencia.criado_em)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium">
                                  "{ultimaOcorrencia.relato}"
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Linha Inferior: Botão Dinâmico para Ação */}
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-800">
                {possuiSinistroAberto ? (
                  <button
                    onClick={() => {
                      setItemSelecionadoId(item.id);
                      setSinistroSelecionadoId(sinistroAtivo.id);
                      setModalSinistroAberto(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md shadow-amber-600/20 active:scale-95"
                  >
                    <Eye size={15} />
                    Acompanhar Sinistro Ativo
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setItemSelecionadoId(item.id);
                      setSinistroSelecionadoId(null);
                      setModalSinistroAberto(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    <PlusCircle size={15} />
                    Abrir Sinistro / Assistência
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalSinistroAberto && (
        <ModalGerenciamentoSinistro
          onClose={() => {
            setModalSinistroAberto(false);
            setItemSelecionadoId(null);
            setSinistroSelecionadoId(null);
          }}
          onSuccess={() => {
            carregarProdutosDoCliente();
            if (onUpdate) onUpdate();
          }}
          clienteId={clienteId}
          itemId={itemSelecionadoId || undefined} 
          sinistroId={sinistroSelecionadoId || undefined}
        />
      )}
    </div>
  );
}