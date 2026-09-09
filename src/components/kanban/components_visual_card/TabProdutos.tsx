import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { 
  Search, Edit3, Loader2, DollarSign, RefreshCw, Users,
  X, Phone, Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatarDataBR } from "../../../utils/dateUtils";
import ModalRenovacao from "../../../pages/propostas/ModalRenovacao";
import { ModalComissoes } from "./ModalComissoes";

interface ItemProdutoFormatado {
  id_item: string;
  valor: number;
  valor_liquido: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  data_venda: string;
  produto: string;
  seguradora: string;
  seguradora_id: string;
  proposta_id: string;
  numero_proposta: string;
  numero_cotacao: string;
  numero_apolice: string;
  status: string;
  status_renovacao?: string;
  motivo_cancelamento?: string;
  tipo_negocio: string;
  cliente: string;
  corretor: string;
  corretor_id: string;
  parceiro_id: string | null;
  periodicidade: string;
  cliente_id: string;
}

interface TabProdutosProps {
  clienteId?: string;
  onUpdate?: () => void;
}

export default function TabProdutos({ clienteId, onUpdate }: TabProdutosProps) {
  const navigate = useNavigate();
  const [itens, setItens] = useState<ItemProdutoFormatado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);

  const [modalRenovacao, setModalRenovacao] = useState<{isOpen: boolean, item: any}>({
    isOpen: false,
    item: null
  });

  const [modalComissaoAberto, setModalComissaoAberto] = useState(false);
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  
  const [itensComComissao, setItensComComissao] = useState<Set<string>>(new Set());
  const [clienteDrawer, setClienteDrawer] = useState<{ isOpen: boolean; loading: boolean; dados: any }>({
    isOpen: false,
    loading: false,
    dados: null
  });

  const abrirModalComissao = (id: string) => {
    setItemSelecionadoId(id);
    setModalComissaoAberto(true);
  };

  const abrirVisualizacaoCliente = async (idCli: string) => {
    if (!idCli) return;
    setClienteDrawer({ isOpen: true, loading: true, dados: null });
    try {
      const { data, error } = await supabase
        .from("tab_clientes_v2")
        .select('id, dados')
        .eq("id", idCli)
        .single();

      if (error) throw error;
      
      const dadosConsolidados = {
        id: data.id,
        ...data.dados
      };

      setClienteDrawer({ isOpen: true, loading: false, dados: dadosConsolidados });
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
      setClienteDrawer(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario')
          .eq('id', user.id)
          .single();
        
        if (perfil) {
          setUserProfile(perfil);
          fetchItensProdutos(perfil);
        }
      }
    }
    getInitialData();
  }, [clienteId]);

  async function fetchItensProdutos(perfilAtual?: any) {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const perfilAtivo = perfilAtual || userProfile;
      if (!perfilAtivo?.corretora_id) return;

      let query = supabase
        .from("tab_proposta_itens")
        .select(`
          id,
          valor_premio,
          valor_liquido,
          data_inicio_vigencia,
          data_fim_vigencia,
          numero_cotacao,
          numero_apolice,
          periodicidade,
          status_renovacao,
          motivo_cancelamento,
          corretor_id,
          base_produtos (nome),
          usuarios_perfis!tab_proposta_itens_corretor_id_fkey (id, nome),
          tab_proposta_opcoes!inner (
            seguradora_id,
            base_seguradoras (nome),
            tab_propostas!inner (
              id,
              numero_proposta,
              status,
              corretora_id,
              parceiro_id,
              data_venda,
              cliente_id,
              tipo_negocio
            )
          )
        `);

      query = query.eq("tab_proposta_opcoes.tab_propostas.corretora_id", perfilAtivo.corretora_id);
      
      // Filtra pelo ID do cliente caso ele tenha sido passado por prop
      if (clienteId) {
        query = query.eq("tab_proposta_opcoes.tab_propostas.cliente_id", clienteId);
      }
      
      if (perfilAtivo.tipo_usuario === 'CORRETOR') {
        query = query.eq("corretor_id", perfilAtivo.id);
      }

      const { data, error } = await query.order("data_fim_vigencia", { ascending: true });
      if (error) throw error;

      const itemIds = data?.map((i: any) => i.id) || [];
      if (itemIds.length > 0) {
        const { data: lancadas } = await supabase
          .from("tab_comissoes_regras")
          .select("item_id")
          .in("item_id", itemIds);
        
        const setLancadas = new Set<string>(lancadas?.map(l => l.item_id) || []);
        setItensComComissao(setLancadas);
      }

      const clienteIds = Array.from(
        new Set(
          data
            ?.map((item: any) => {
              const itemOpcao = Array.isArray(item.tab_proposta_opcoes) ? item.tab_proposta_opcoes[0] : item.tab_proposta_opcoes;
              const itemProposta = Array.isArray(itemOpcao?.tab_propostas) ? itemOpcao.tab_propostas[0] : itemOpcao?.tab_propostas;
              return itemProposta?.cliente_id;
            })
            .filter(Boolean)
        )
      );

      let clientesMap: Record<string, any> = {};
      if (clienteIds.length > 0) {
        const { data: clientesData, error: cliError } = await supabase
          .from("tab_clientes_v2")
          .select("id, nome_razao_social, cpf_cnpj")
          .in("id", clienteIds);

        if (cliError) {
          console.error("Erro ao buscar clientes:", cliError);
        }

        if (clientesData) {
          clientesMap = clientesData.reduce((acc: any, cli: any) => {
            acc[cli.id] = cli;
            return acc;
          }, {});
        }
      }

      const formatado = data?.map((item: any) => { 
        const itemOpcao = Array.isArray(item.tab_proposta_opcoes) ? item.tab_proposta_opcoes[0] : item.tab_proposta_opcoes;
        const itemProposta = Array.isArray(itemOpcao?.tab_propostas) ? itemOpcao.tab_propostas[0] : itemOpcao?.tab_propostas;
        const itemSeguradora = Array.isArray(itemOpcao?.base_seguradoras) ? itemOpcao.base_seguradoras[0] : itemOpcao?.base_seguradoras;
        const itemProduto = Array.isArray(item.base_produtos) ? item.base_produtos[0] : item.base_produtos;
        const itemCorretor = Array.isArray(item.usuarios_perfis) ? item.usuarios_perfis[0] : item.usuarios_perfis;

        const clienteObj = clientesMap[itemProposta?.cliente_id];
        const nomeCliente = clienteObj?.nome_razao_social || "Cliente não identificado";

        return {
          id_item: item.id,
          valor: item.valor_premio,
          valor_liquido: item.valor_liquido || 0,
          data_inicio_vigencia: item.data_inicio_vigencia,
          data_fim_vigencia: item.data_fim_vigencia,
          data_venda: itemProposta?.data_venda || "", 
          numero_cotacao: item.numero_cotacao || "",
          numero_apolice: item.numero_apolice || "",
          produto: itemProduto?.nome || "Não definido", 
          seguradora: itemSeguradora?.nome || "Não informada",
          seguradora_id: itemOpcao?.seguradora_id || "",
          proposta_id: itemProposta?.id,
          cliente_id: itemProposta?.cliente_id || "", 
          numero_proposta: itemProposta?.numero_proposta,
          status: itemProposta?.status,
          status_renovacao: item.status_renovacao, 
          motivo_cancelamento: item.motivo_cancelamento,
          tipo_negocio: itemProposta?.tipo_negocio || "Novo",
          periodicidade: item.periodicidade || "ANUAL",
          cliente: nomeCliente,
          corretor: itemCorretor?.nome || "Não informado", 
          corretor_id: item.corretor_id,
          parceiro_id: itemProposta?.parceiro_id
        };
      });

      setItens(formatado || []);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateItem(id_item: string, field: string, value: any) {
    try {
      const { error } = await supabase
        .from("tab_proposta_itens")
        .update({ [field]: value })
        .eq("id", id_item);

      if (error) throw error;

      setItens(prev => prev.map(item => 
        item.id_item === id_item ? { ...item, [field]: value } : item
      ));

      // Coloque aqui para atualizar o pai quando um item for alterado com sucesso!
      if (onUpdate) {
        onUpdate();
      }



    } catch (err) {
      console.error("Erro ao atualizar item:", err);
      alert("Erro ao salvar alteração no item.");
    }
  }

  const itensFiltrados = useMemo(() => {
    return itens.filter(i => {
      const matchTexto = 
        (i.numero_proposta?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (i.cliente?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (i.produto?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (i.numero_apolice?.toLowerCase() || "").includes(filter.toLowerCase());

      return matchTexto;
    });
  }, [filter, itens]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase text-slate-800 tracking-tight">Produtos e Apólices</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gerenciamento de produtos vinculados às propostas</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por proposta, cliente, produto..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-72 h-10 bg-white border border-slate-200 rounded-xl pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-full bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden block">
        <div className="overflow-x-auto w-full block clear-both scrollbar-thin">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px] table-auto">
            <thead>
              <tr className="bg-slate-50/75">
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[15%]">Proposta</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[25%]">Cliente / Seguradora</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[20%]">Produto</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[15%]">Vigência</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap text-center w-[15%]">Controle Renov.</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap text-center w-[10%]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  const comissaoLancada = itensComComissao.has(item.id_item);
                  
                  return (
                    <tr key={item.id_item} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-3.5 font-black text-blue-600 italic text-sm whitespace-nowrap">
                        {item.numero_proposta}
                      </td>
                      
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <div className="flex items-center gap-1.5 group/btn">
                          <div className="text-sm font-bold text-slate-700 uppercase leading-none truncate" title={item.cliente}>
                            {item.cliente}
                          </div>
                          <button
                            onClick={() => abrirVisualizacaoCliente(item.cliente_id)}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                            title="Visualização rápida do cliente"
                          >
                            <Users size={13} />
                          </button>
                        </div>
                        <div className="text-[11px] text-blue-500 mt-1 font-black uppercase italic tracking-tight whitespace-nowrap truncate">
                          {item.seguradora}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 min-w-[160px]">
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight block truncate">
                          {item.produto}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 min-w-[140px]">
                        <div className="text-[12px] font-bold text-slate-600 whitespace-nowrap">
                          {formatarDataBR(item.data_inicio_vigencia)} a {formatarDataBR(item.data_fim_vigencia)}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 items-center w-full">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${item.status === 'Vendido' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {item.status}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={item.status_renovacao}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'CANCELADA') {
                                const confirmar = window.confirm("Deseja realmente cancelar esta apólice?");
                                if (confirmar) {
                                  const motivo = window.prompt("Informe o motivo: (Preço, Concorrência, Outros)");
                                  if (motivo) {
                                    handleUpdateItem(item.id_item, "motivo_cancelamento", motivo);
                                    handleUpdateItem(item.id_item, "status_renovacao", "CANCELADA");
                                  }
                                }
                              } else {
                                handleUpdateItem(item.id_item, "status_renovacao", val);
                              }
                            }}
                            className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-transparent shadow-sm transition-all cursor-pointer w-full text-center shrink-0 max-w-[130px]
                              ${item.status_renovacao === 'RENOVADO' ? 'bg-emerald-500 text-white' : 
                                item.status_renovacao === 'CANCELADA' ? 'bg-red-500 text-white' :
                                item.status_renovacao === 'RENOVAÇÃO AUTOMÁTICA' ? 'bg-indigo-600 text-white' : 
                                'bg-amber-100 text-amber-700'}`}
                          >
                            <option value="A RENOVAR">A RENOVAR</option>
                            <option value="RENOVADO">RENOVADO</option>
                            <option value="RENOVAÇÃO AUTOMÁTICA">AUTOMÁTICA</option>
                            <option value="CANCELADA">CANCELADA</option>
                            <option value="NAO_RENOVADO">NÃO RENOVADO</option>
                            <option value="NÃO SE APLICA">N/A</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center min-w-[120px]">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap w-max mx-auto">
                          <button 
                            onClick={() => navigate(`/propostas/editar/${item.proposta_id}`)}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm shrink-0"
                            title="Editar Proposta"
                          >
                            <Edit3 size={14} />
                          </button>

                          {item.status === 'Vendido' && (
                            <>
                              <button 
                                onClick={() => abrirModalComissao(item.id_item)}
                                className={`p-2 rounded-lg transition-all shadow-sm border focus:outline-none shrink-0
                                  ${comissaoLancada 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' 
                                    : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'}`}
                                title={comissaoLancada ? "Ver / Editar Distribuição da Comissão" : "Lançar Nova Comissão"}
                              >
                                <DollarSign size={14} className={comissaoLancada ? "animate-pulse" : ""} />
                              </button>

                              <button 
                                onClick={() => setModalRenovacao({ isOpen: true, item: item })}
                                className="p-2 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 rounded-lg transition-all shadow-sm group shrink-0"
                                title="Renovação"
                              >
                                <RefreshCw size={14} className="group-hover:rotate-180 duration-500 transition-transform" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${clienteDrawer.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setClienteDrawer({ isOpen: false, loading: false, dados: null })} />
        <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${clienteDrawer.isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> Ficha Resumida do Cliente
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consulta rápida sem sair da listagem</p>
            </div>
            <button 
              onClick={() => setClienteDrawer({ isOpen: false, loading: false, dados: null })}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {clienteDrawer.loading ? (
              <div className="h-full flex items-center justify-center flex-col gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="text-[10px] font-black uppercase text-slate-400">Carregando dados...</span>
              </div>
            ) : clienteDrawer.dados ? (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Nome / Razão Social</label>
                  <div className="text-base font-black text-slate-800 uppercase italic tracking-tight bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {clienteDrawer.dados.tipo_cliente === 'PJ' ? clienteDrawer.dados.razao_social : clienteDrawer.dados.nome}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tipo de Cliente</label>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${clienteDrawer.dados.tipo_cliente === 'PJ' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {clienteDrawer.dados.tipo_cliente === 'PJ' ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA'}
                    </span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Documento</label>
                    <div className="text-xs font-bold text-slate-700">
                      {clienteDrawer.dados.tipo_cliente === 'PJ' ? clienteDrawer.dados.cnpj : clienteDrawer.dados.cpf || '-'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                    <Phone size={12} /> Informações de Contato
                  </h4>
                  {clienteDrawer.dados.email && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Mail size={14} className="text-slate-400" /> {clienteDrawer.dados.email}
                    </div>
                  )}
                  {(clienteDrawer.dados.celular || clienteDrawer.dados.telefone) && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Phone size={14} className="text-slate-400" /> {clienteDrawer.dados.celular || clienteDrawer.dados.telefone}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/clientes/editar/${clienteDrawer.dados.id}`)}
                    className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    Ir para Ficha Completa do Cliente
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-xs font-bold text-slate-400 uppercase">Não foi possível carregar os dados.</div>
            )}
          </div>
        </div>
      </div>

      {modalRenovacao.isOpen && modalRenovacao.item && (
        <ModalRenovacao 
          isOpen={modalRenovacao.isOpen}
          onClose={() => setModalRenovacao({ isOpen: false, item: null })}
          itemOriginal={modalRenovacao.item}
          onSuccess={fetchItensProdutos}
        />
      )}

      {modalComissaoAberto && itemSelecionadoId && (
        <ModalComissoes 
          itemId={itemSelecionadoId}
          onClose={() => setModalComissaoAberto(false)}
          onSuccess={() => fetchItensProdutos()}
        />
      )}
    </div>
  );
}