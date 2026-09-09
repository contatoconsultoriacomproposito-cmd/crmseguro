import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { 
  DollarSign, 
  Calendar, 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp,
  Receipt,

} from "lucide-react";

interface TabComissoesProps {
  clienteId?: string;
  onUpdate?: () => void;
}

interface Provisao {
  id: string;
  numero_parcela: number;
  data_vencimento_previsto: string;
  valor_base_parcela: number;
  valor_comissao_total: number;
  valor_direito_corretor: number;
  status_repasse_corretor: string;
  data_recebimento?: string;
}

interface RegraComissao {
  id: string;
  cliente_id: string;
  produto_id: string;
  seguradora_id: string;
  base_calculo_valor: number;
  tipo_recorrencia: string;
  quantidade_parcelas: number;
  data_venda: string;
  pct_comissao_venda: number | null;
  pct_corretor: number;
  pct_parceiro: number;
  base_produtos?: { id: string; nome: string } | null;
  base_seguradoras?: { id: string; nome: string } | null;
  tab_financeiro_provisoes?: Provisao[];
}

export default function TabComissoes({ clienteId }: TabComissoesProps) {
  const [regrasComissao, setRegrasComissao] = useState<RegraComissao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [regrasExpandidas, setRegrasExpandidas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (clienteId) {
      carregarComissoesDoCliente();
    }
  }, [clienteId]);

  const carregarComissoesDoCliente = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tab_comissoes_regras")
        .select(`
          *,
          base_produtos ( id, nome ),
          base_seguradoras ( id, nome ),
          tab_financeiro_provisoes (
            id,
            numero_parcela,
            data_vencimento_previsto,
            valor_base_parcela,
            valor_comissao_total,
            valor_direito_corretor,
            status_repasse_corretor,
            data_recebimento
          )
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRegrasComissao(data || []);
      
      // Abre por padrão a primeira regra caso exista
      if (data && data.length > 0) {
        setRegrasExpandidas({ [data[0].id]: true });
      }
    } catch (err) {
      console.error("Erro ao carregar comissões do cliente:", err);
      setRegrasComissao([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandirRegra = (regraId: string) => {
    setRegrasExpandidas(prev => ({ ...prev, [regraId]: !prev[regraId] }));
  };

  const isStatusPago = (status?: string) => {
    if (!status) return false;
    const s = status.trim().toUpperCase();
    return s === "PAGO" || s === "QUITADO" || s === "CONCLUIDO" || s === "RECEBIDO";
  };

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return "--/--/----";
    try {
      const parts = dataStr.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dataStr).toLocaleDateString("pt-BR");
    } catch {
      return dataStr;
    }
  };

  const formatarMoeda = (valor?: number | null) => {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Totais Gerais para os Cards Resumo
  const totalBaseCalculo = regrasComissao.reduce((acc, r) => acc + Number(r.base_calculo_valor || 0), 0);

  const todasProvisoes = regrasComissao.flatMap(r => r.tab_financeiro_provisoes || []);

  const totalDireitoCorretor = todasProvisoes.reduce(
    (acc, p) => acc + Number(p.valor_direito_corretor || 0), 0
  );

  const totalComissaoPaga = todasProvisoes
    .filter(p => isStatusPago(p.status_repasse_corretor))
    .reduce((acc, p) => acc + Number(p.valor_direito_corretor || 0), 0);

  const totalComissaoPendente = todasProvisoes
    .filter(p => !isStatusPago(p.status_repasse_corretor))
    .reduce((acc, p) => acc + Number(p.valor_direito_corretor || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-slate-500 text-xs font-medium">
        Carregando informações de comissões...
      </div>
    );
  }

  if (regrasComissao.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
        <Receipt className="w-9 h-9 mb-2 text-slate-300 dark:text-zinc-600" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nenhuma regra de comissão registrada para este cliente.</p>
        <p className="text-[11px] text-slate-400">As regras e parcelas de repasse aparecerão aqui assim que forem vinculadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Base de Cálculo Total</span>
            <DollarSign size={16} className="text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-white">
            {formatarMoeda(totalBaseCalculo)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Soma das apólices/vendas</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Corretor</span>
            <TrendingUp size={16} className="text-indigo-500" />
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-white">
            {formatarMoeda(totalDireitoCorretor)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Direito acumulado</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl shadow-sm bg-emerald-50/20">
          <div className="flex justify-between items-center text-emerald-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Comissões Pagas</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
            {formatarMoeda(totalComissaoPaga)}
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Repasses já efetuados</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl shadow-sm bg-amber-50/20">
          <div className="flex justify-between items-center text-amber-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">A Receber / Pendente</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-700 dark:text-amber-400">
            {formatarMoeda(totalComissaoPendente)}
          </div>
          <span className="text-[10px] text-amber-600/80 font-medium">Aguardando repasse</span>
        </div>
      </div>

      {/* Lista de Regras de Comissão por Produto */}
      <div className="space-y-4">
        {regrasComissao.map((regra) => {
          const nomeProduto = regra.base_produtos?.nome || "Produto não informado";
          const nomeSeguradora = regra.base_seguradoras?.nome || "Seguradora não informada";
          
          const provisoes = (regra.tab_financeiro_provisoes || []).sort(
            (a, b) => a.numero_parcela - b.numero_parcela
          );

          const totalCorretorRegra = provisoes.reduce(
            (acc, p) => acc + Number(p.valor_direito_corretor || 0), 0
          );

          const isExpandida = !!regrasExpandidas[regra.id];

          return (
            <div
              key={regra.id}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-all"
            >
              {/* Header do Card da Regra */}
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                        {nomeProduto}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-0.5">
                        <Building2 size={13} className="text-slate-400" />
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{nomeSeguradora}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                      <Calendar size={12} />
                      Venda: {formatarData(regra.data_venda)}
                    </span>

                    <button
                      onClick={() => toggleExpandirRegra(regra.id)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                    >
                      {isExpandida ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Métricas da Regra */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Base Cálculo</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">
                      {formatarMoeda(regra.base_calculo_valor)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Recorrência</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">
                      {regra.tipo_recorrencia} ({regra.quantidade_parcelas}x)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">% Comissões</span>
                    <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                      <span>Venda: {regra.pct_comissao_venda ?? 0}%</span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400">Corretor: {regra.pct_corretor}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Direito Corretor</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {formatarMoeda(totalCorretorRegra)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Provisões de Repasse (Expansível) */}
              {isExpandida && (
                <div className="border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Receipt size={13} />
                      Parcelas & Status de Repasse ({provisoes.length})
                    </span>
                  </div>

                  {provisoes.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 italic font-medium">
                      Nenhuma parcela financeira provisionada para esta regra.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                            <th className="py-2.5 px-3">Parcela</th>
                            <th className="py-2.5 px-3">Vencimento</th>
                            <th className="py-2.5 px-3">Valor Base</th>
                            <th className="py-2.5 px-3">Direito Corretor</th>
                            <th className="py-2.5 px-3 text-right">Status do Repasse</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                          {provisoes.map((provisao) => {
                            const pago = isStatusPago(provisao.status_repasse_corretor);

                            return (
                              <tr 
                                key={provisao.id} 
                                className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <td className="py-2.5 px-3 font-extrabold text-slate-700 dark:text-slate-300">
                                  #{provisao.numero_parcela}
                                </td>

                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                  {formatarData(provisao.data_vencimento_previsto)}
                                </td>

                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                  {formatarMoeda(provisao.valor_base_parcela)}
                                </td>

                                <td className="py-2.5 px-3 font-extrabold text-slate-800 dark:text-white">
                                  {formatarMoeda(provisao.valor_direito_corretor)}
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  {pago ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                      <CheckCircle2 size={11} />
                                      {provisao.status_repasse_corretor || "PAGO"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                                      <Clock size={11} />
                                      {provisao.status_repasse_corretor || "PENDENTE"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}