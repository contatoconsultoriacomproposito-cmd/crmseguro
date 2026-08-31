import { useState, useEffect, useMemo } from "react";
import { 
  Save, Search, Trash2, User, 
  X, Hash, CheckCircle2, PlusCircle
} from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; 
import { supabase } from "../../lib/supabaseClient";
import { ModalGerenciarPortfolio } from './ModalGerenciarPortfolio';

// --- INTERFACES ---
interface CotacaoProduto {
  produto_id: string;
  nome_produto: string;
  valor: string; 
  data: string;
  parcelamento: string;
  meio: string;
  cobertura: string;
  numero_cotacao: string;
}

interface OpcaoSeguradora {
  id?: string; 
  seguradora_id: string;
  nome_seguradora: string;
  cotacoes: CotacaoProduto[];
}

const gerarIDProposta = () => {
  const ano = new Date().getFullYear();
  const timePart = Date.now().toString().slice(-4);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR${ano}-${timePart}${randomPart}`;
};

export default function PropostasCadastro() {
  const { id: propostaId } = useParams();
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const clienteIdViaState = location.state?.clienteId;
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [seguradoras, setSeguradoras] = useState<any[]>([]);
  const [corretores, setCorretores] = useState<any[]>([]); 
  const [parceiros, setParceiros] = useState<any[]>([]);
  const [selectedParceiro, setSelectedParceiro] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedCorretor, setSelectedCorretor] = useState("");
  const [validadeProposta, setValidadeProposta] = useState("");
  const [numeroProposta, setNumeroProposta] = useState("");
  const [portfolioRaw, setPortfolioRaw] = useState<any[]>([]);
  const [isModalPortfolioOpen, setIsModalPortfolioOpen] = useState(false);

  const [opcoes, setOpcoes] = useState<OpcaoSeguradora[]>([
    { seguradora_id: "", nome_seguradora: "", cotacoes: [] },
  ]);

  // Travar rigorosamente o corretor baseado no cliente selecionado
  useEffect(() => {
    if (selectedClient?.corretor_id) {
      setSelectedCorretor(selectedClient.corretor_id);
    }
  }, [selectedClient]);
  
  useEffect(() => {
    const carregarTudo = async () => {
      await fetchDados();
      if (propostaId) {
        await carregarDadosEdicao(propostaId);
      } else {
        setNumeroProposta(gerarIDProposta());
      }
    };
    carregarTudo();
  }, [propostaId]);

  useEffect(() => {
    if (clienteIdViaState && clientes.length > 0 && !selectedClient) {
      const clienteEncontrado = clientes.find(c => c.id === clienteIdViaState);
      if (clienteEncontrado) {
        setSelectedClient(clienteEncontrado);
      }
    }
  }, [clienteIdViaState, clientes, selectedClient]);

  async function fetchDados() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("id, nome, tipo_usuario, corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil?.corretora_id) return;

      let queryClientes = supabase.from("tab_clientes").select("*");
      
      if (perfil.tipo_usuario === 'CORRETOR') {
        queryClientes = queryClientes.eq("corretor_id", perfil.id);
      } else {
        queryClientes = queryClientes.eq("corretora_id", perfil.corretora_id);
      }

      const { data: clis, error: clisError } = await queryClientes;
      if (clisError) throw clisError;
      setClientes(clis || []);

      const { data: portfolio, error: portError } = await supabase
        .from("tab_corretora_portfolio")
        .select(`
          base_seguradora_id,
          base_produto_id,
          base_seguradoras (id, nome),
          base_produtos (id, nome)
        `)
        .eq("corretora_id", perfil.corretora_id);

      if (portError) throw portError;
      setPortfolioRaw(portfolio || []);

      const seguradorasDistintas = Array.from(new Map(
        (portfolio || [])
          .filter(item => item?.base_seguradoras && (item.base_seguradoras as any).id)
          .map(item => {
            const s = item.base_seguradoras as any;
            return [s.id, { id: s.id, nome: s.nome }];
          })
      ).values());
      
      setSeguradoras(seguradorasDistintas);
      
      const { data: pars } = await supabase
        .from("tab_parceiros")
        .select("id, nome_parceiro")
        .eq("corretora_id", perfil.corretora_id)
        .order('nome_parceiro', { ascending: true });
      setParceiros(pars || []);

      // Busca de todos os corretores da corretora
      const { data: corrs } = await supabase
        .from("usuarios_perfis")
        .select("id, nome")
        .eq("corretora_id", perfil.corretora_id)
        .order('nome', { ascending: true });
        
      if (perfil.tipo_usuario === 'CORRETOR') {
        setCorretores([{ id: perfil.id, nome: perfil.nome }, ...(corrs || [])]);
      } else {
        setCorretores(corrs || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function carregarDadosEdicao(id: string) {
    try {
      setLoading(true);
      const { data: prop, error: errP } = await supabase
        .from("tab_propostas")
        .select(`
          *, 
          tab_clientes(*), 
          tab_proposta_opcoes(
            *, 
            base_seguradoras(nome),
            tab_proposta_itens(
              *, 
              base_produtos(nome)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (errP) throw errP;

      setSelectedClient(prop.tab_clientes);
      setSelectedCorretor(prop.tab_clientes?.corretor_id || prop.corretor_id);
      setSelectedParceiro(prop.parceiro_id || "");
      setValidadeProposta(prop.data_validade);
      setNumeroProposta(prop.numero_proposta);

      const opcoesMapeadas = prop.tab_proposta_opcoes.map((op: any) => ({
        id: op.id,
        seguradora_id: op.seguradora_id,
        nome_seguradora: op.base_seguradoras?.nome || "Seguradora não encontrada",
        cotacoes: op.tab_proposta_itens.map((it: any) => {
          const valorEmCentavos = Math.round((it.valor_premio || 0) * 100).toString();

          return {
            produto_id: it.produto_id,
            nome_produto: it.base_produtos?.nome || "Produto não encontrado",
            valor: formatCurrency(valorEmCentavos), 
            data: it.data_cotacao,
            parcelamento: it.parcelamento,
            meio: it.meio_pagamento,
            cobertura: it.coberturas_franquias || "",
            numero_cotacao: it.numero_cotacao || "" 
          };
        })
      }));

      setOpcoes(opcoesMapeadas);

    } catch (error) {
      console.error("Erro ao carregar edição:", error);
      alert("Erro ao carregar dados da proposta.");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "");
    if (!onlyDigits || onlyDigits === "0") return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(onlyDigits) / 100);
  };

  const handleValorChange = (opIdx: number, cotIdx: number, value: string) => {
    const maskedValue = formatCurrency(value);
    updateCotacao(opIdx, cotIdx, 'valor', maskedValue);
  };

  const calcularTotal = (cotacoes: CotacaoProduto[]) => {
    return cotacoes.reduce((sum, item) => {
      const numericValue = Number(item.valor.replace(/\D/g, "")) / 100;
      return sum + (numericValue || 0);
    }, 0);
  };

  const updateCotacao = (opIdx: number, cotIdx: number, field: keyof CotacaoProduto, value: string) => {
    const novasOpcoes = [...opcoes];
    novasOpcoes[opIdx].cotacoes[cotIdx] = { ...novasOpcoes[opIdx].cotacoes[cotIdx], [field]: value };
    setOpcoes(novasOpcoes);
  };

  const addProdutoToOpcao = (opcaoIdx: number, produto: any) => {
    const novasOpcoes = [...opcoes];
    if (!novasOpcoes[opcaoIdx].cotacoes.find(c => c.produto_id === produto.id)) {
      novasOpcoes[opcaoIdx].cotacoes.push({
        produto_id: produto.id, 
        nome_produto: produto.nome, 
        valor: "R$ 0,00",
        data: new Date().toLocaleDateString('en-CA'), 
        parcelamento: "1x", 
        meio: "Boleto", 
        cobertura: "",
        numero_cotacao: "" 
      });
      setOpcoes(novasOpcoes);
    }
  };

  const adicionarNovaOpcao = () => {
    setOpcoes([...opcoes, { seguradora_id: "", nome_seguradora: "", cotacoes: [] }]);
  };

  const removerOpcao = async (index: number) => {
    const opcaoParaRemover = opcoes[index];

    if (opcaoParaRemover.id) {
      const confirmar = confirm("Deseja realmente excluir esta seguradora e todos os seus produtos?");
      if (!confirmar) return;

      try {
        setLoading(true);
        const { error } = await supabase
          .from('tab_proposta_opcoes')
          .delete()
          .eq('id', opcaoParaRemover.id);

        if (error) throw error;
      } catch (error: any) {
        console.error("Erro ao excluir seguradora:", error);
        alert("Erro ao remover do banco: " + error.message);
        return;
      } finally {
        setLoading(false);
      }
    }

    const novasOpcoes = opcoes.filter((_, i) => i !== index);
    setOpcoes(novasOpcoes);
  };

  const filteredClientes = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return clientes.filter(c => 
      (c.nome?.toLowerCase().includes(term)) || (c.razao_social?.toLowerCase().includes(term)) ||
      (c.cpf?.includes(searchTerm)) || (c.cnpj?.includes(searchTerm))
    );
  }, [searchTerm, clientes]);

  // --- FUNÇÃO PARA OBTER O RÓTULO DO RESPONSÁVEL ---
  const getNomeResponsavel = () => {
    if (!selectedClient) return "Nenhum cliente selecionado";

    if (selectedClient.corretor_id === selectedClient.corretora_id) {
      return "Atendimento Direto / Corretora";
    }

    const corretorEncontrado = corretores.find(c => c.id === selectedClient.corretor_id);
    return corretorEncontrado?.nome || selectedClient.nome_corretor || "Corretor Responsável";
  };

  const handleSalvarBanco = async () => {
    const corretorFinal = selectedClient?.corretor_id || selectedCorretor;

    if (!selectedClient || !corretorFinal || !validadeProposta) {
        return alert("Preencha todos os campos obrigatórios e verifique se o cliente possui um responsável.");
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil?.corretora_id) {
        throw new Error("Não foi possível identificar a sua Corretora (ID nulo).");
      }

      let currentPropostaId = propostaId;  

      const dadosProposta = {
        numero_proposta: numeroProposta,
        cliente_id: selectedClient.id,
        corretor_id: corretorFinal,
        parceiro_id: selectedParceiro || null,
        corretora_id: perfil.corretora_id, 
        data_validade: validadeProposta,
        status: 'Em Negociação',
        valor_total_proposta: opcoes.reduce((acc, opt) => acc + calcularTotal(opt.cotacoes), 0)
      };

      if (propostaId) {
        const { error: errorU } = await supabase
          .from("tab_propostas")
          .update(dadosProposta)
          .eq("id", propostaId);
        
        if (errorU) throw errorU;
        await supabase.from("tab_proposta_opcoes").delete().eq("proposta_id", propostaId);
      } else {
        const { data, error } = await supabase.from("tab_propostas").insert(dadosProposta).select().single();
        if (error) throw error;
        currentPropostaId = data.id;

        await supabase.from('tab_interacoes').insert({
          cliente_id: selectedClient.id,
          corretor_id: corretorFinal,
          corretora_id: perfil.corretora_id,
          tipo_acao: 'PROPOSTA CRIADA',
          relato: `Nova proposta gerada: ${numeroProposta}. Status: Em Negociação.`,
          data_historico: new Date().toLocaleDateString('en-CA'),
          horario_historico: new Date().toLocaleTimeString('pt-BR', { hour12: false })
        });
      }

      for (const [idx, opcao] of opcoes.entries()) {
        if (!opcao.seguradora_id) continue;

        const { data: novaOpcao, error: errorO } = await supabase
          .from("tab_proposta_opcoes")
          .insert({
            proposta_id: currentPropostaId,
            seguradora_id: opcao.seguradora_id,
            ordem_opcao: idx + 1,
            valor_total_opcao: calcularTotal(opcao.cotacoes)
          })
          .select().single();

        if (errorO) throw errorO;

        if (opcao.cotacoes.length > 0) {
          const itensParaInserir = opcao.cotacoes.map(cot => ({
            opcao_id: novaOpcao.id,
            produto_id: cot.produto_id,
            valor_premio: Number(cot.valor.replace(/\D/g, "")) / 100,
            data_cotacao: cot.data,
            parcelamento: cot.parcelamento,
            meio_pagamento: cot.meio,
            coberturas_franquias: cot.cobertura,
            numero_cotacao: cot.numero_cotacao, 
            corretor_id: corretorFinal,
            
          }));

          const { error: errorItens } = await supabase
            .from("tab_proposta_itens")
            .insert(itensParaInserir);

          if (errorItens) throw errorItens;
        }
      }

      let faseAlvo = 'negociacao'; 

      if (selectedClient.status_kanban === 'vendido') {
        faseAlvo = 'negociacao_vendas';
      } else if (selectedClient.status_kanban === 'perdido') {
        faseAlvo = 'negociacao_perdas';
      }

      await supabase
        .from('tab_clientes')
        .update({ fase_kanban: faseAlvo })
        .eq('id', selectedClient.id);
      
      setShowFinalizeModal(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        navigate('/propostas/lista');
      }, 5000);

    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="p-6 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen pb-40">
      <div className="max-w-[1600px] mx-auto mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <User size={20} />
            </div>
            <h2 className="text-lg font-black italic uppercase text-slate-800 dark:text-zinc-100 tracking-tighter">
                {propostaId ? `Editando Proposta: ${numeroProposta}` : 'Dados do Cliente'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Pesquisar Cliente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Nome, CPF ou CNPJ..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 text-sm font-medium outline-none"
                  value={searchTerm}
                  onChange={(e) => {setSearchTerm(e.target.value); setShowSearch(true);}}
                />
              </div>
              {showSearch && filteredClientes.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {filteredClientes.map(c => (
                    <button key={c.id} onClick={() => {setSelectedClient(c); setShowSearch(false); setSearchTerm("");}}
                      className="w-full p-3 text-left hover:bg-blue-50 border-b last:border-0 dark:hover:bg-zinc-700"
                    >
                      <p className="text-sm font-bold uppercase text-slate-800 dark:text-zinc-100">{c.tipo_cliente === 'PJ' ? c.razao_social : c.nome}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{c.tipo_cliente === 'PJ' ? c.cnpj : c.cpf}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient ? (
              <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 relative">
                <button onClick={() => setSelectedClient(null)} className="absolute top-2 right-2 text-blue-300 hover:text-red-500"><X size={14} /></button>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">Nome / Razão Social</span>
                  <span className="text-sm font-bold block truncate uppercase text-slate-800 dark:text-zinc-100">{selectedClient.tipo_cliente === 'PJ' ? selectedClient.razao_social : selectedClient.nome}</span>
                  <span className="text-[11px] opacity-60 text-slate-500 dark:text-zinc-400">{selectedClient.tipo_cliente === 'PJ' ? selectedClient.cnpj : selectedClient.cpf}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">WhatsApp</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedClient.telefone_whats || "---"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">Responsável</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block truncate">{getNomeResponsavel()}</span>
                </div>
              </div>
            ) : (
              <div className="col-span-3 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 text-sm italic">Aguardando seleção...</div>
            )}
          </div>
        </div>
      </div>

      {/* Container de Título e Botão Centralizado */}
      <div className="flex flex-col items-center justify-center gap-4 mb-8">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-zinc-100">
          Cotações
        </h2>
        
        <button 
          type="button"
          onClick={adicionarNovaOpcao}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 group"
        >
          <span className="group-hover:rotate-90 transition-transform duration-300 text-base">+</span>
          Adicionar Nova Opção de Seguradora
        </button>
        
        <div className="w-24 h-1 bg-blue-600 rounded-full opacity-20"></div>
      </div>

      <div className="max-w-[1600px] mx-auto flex flex-wrap justify-center gap-8 py-4">
        {opcoes.map((opcao, opIdx) => (
          <div 
            key={opIdx} 
            className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl flex flex-col min-h-[600px] 
                     w-full md:w-[420px] transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-2"
          >
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50 rounded-t-[32px]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs italic">0{opIdx + 1}</span>
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-800 dark:text-zinc-100">Opção de Cotação</h3>
              </div>
              
              <button 
                type="button"
                onClick={() => removerOpcao(opIdx)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                title="Excluir Seguradora"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">
                    Companhia Seguradora
                  </label>
                  <button 
                    type="button"
                    onClick={() => setIsModalPortfolioOpen(true)}
                    className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase flex items-center gap-1 transition-all active:scale-95"
                  >
                    <PlusCircle size={12} /> Gerenciar Portfólio
                  </button>
                </div>

                <select 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold outline-none text-slate-800 dark:text-zinc-100"
                  value={opcao.seguradora_id}
                  onChange={(e) => {
                    const sel = seguradoras.find(s => s.id === e.target.value);
                    const novas = [...opcoes];
                    novas[opIdx].seguradora_id = e.target.value;
                    novas[opIdx].nome_seguradora = sel?.nome || "";
                    setOpcoes(novas);
                  }}
                >
                  <option value="">Selecione...</option>
                  {seguradoras.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              {opcao.seguradora_id && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase mb-2 block italic">
                      + Adicionar Produtos Disponíveis nesta Seguradora
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {portfolioRaw
                        .filter(item => item.base_seguradora_id === opcao.seguradora_id)
                        .map(item => {
                          const p = item.base_produtos as any;
                          return (
                            <button 
                              key={p.id} 
                              type="button"
                              onClick={() => addProdutoToOpcao(opIdx, p)}
                              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all shadow-sm flex items-center gap-1 text-slate-700 dark:text-zinc-300"
                            >
                              + {p.nome}
                            </button>
                          );
                        })
                      }

                      {portfolioRaw.filter(item => item.base_seguradora_id === opcao.seguradora_id).length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">Nenhum produto ativado para esta seguradora no seu portfólio.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {opcao.cotacoes.map((cot, cotIdx) => (
                      <div key={cotIdx} className="p-5 border border-slate-200 dark:border-zinc-800 rounded-[24px] bg-white dark:bg-zinc-900 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-black rounded-full uppercase">{cot.nome_produto}</span>
                          <button type="button" onClick={() => { const novas = [...opcoes]; novas[opIdx].cotacoes.splice(cotIdx, 1); setOpcoes(novas); }} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                        </div>
                        
                        <div className="mb-3">
                          <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Hash size={10} /> Nº Cotação (Opcional)
                          </label>
                          <input 
                            type="text" 
                            placeholder="Ex: 998877"
                            className="w-full h-8 bg-transparent border-b border-slate-200 dark:border-zinc-800 text-xs font-bold outline-none focus:border-blue-500 dark:text-zinc-100 transition-colors"
                            value={cot.numero_cotacao}
                            onChange={e => updateCotacao(opIdx, cotIdx, 'numero_cotacao', e.target.value)}
                          />
                        </div>                    
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Valor Cotação</label>
                            <input type="text" className="w-full h-9 bg-transparent border-b border-slate-200 dark:border-zinc-800 font-black text-sm text-blue-600 dark:text-blue-400" 
                              value={cot.valor}
                              onChange={e => handleValorChange(opIdx, cotIdx, e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Data</label>
                            <input type="date" className="w-full h-9 bg-transparent border-b border-slate-200 dark:border-zinc-800 text-xs dark:text-zinc-100" 
                              value={cot.data} onChange={e => updateCotacao(opIdx, cotIdx, 'data', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Parcelas</label>
                            <select className="w-full h-9 bg-transparent border-b border-slate-200 dark:border-zinc-800 text-xs font-bold dark:text-zinc-100"
                              value={cot.parcelamento}
                              onChange={e => updateCotacao(opIdx, cotIdx, 'parcelamento', e.target.value)}
                            >
                              {[...Array(12)].map((_, i) => (
                                <option key={i} value={`${i+1}x`} className="dark:bg-zinc-900">{i+1}x</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Meio</label>
                            <select className="w-full h-9 bg-transparent border-b border-slate-200 dark:border-zinc-800 text-xs font-bold dark:text-zinc-100"
                              value={cot.meio}
                              onChange={e => updateCotacao(opIdx, cotIdx, 'meio', e.target.value)}
                            >
                              <option value="Boleto" className="dark:bg-zinc-900">Boleto</option>
                              <option value="Cartão" className="dark:bg-zinc-900">Cartão</option>
                              <option value="Pix" className="dark:bg-zinc-900">À vista</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Coberturas</label>
                          <textarea className="w-full p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-[11px] h-20 resize-none outline-none dark:text-zinc-200" 
                            value={cot.cobertura} onChange={e => updateCotacao(opIdx, cotIdx, 'cobertura', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 rounded-b-[32px]">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-tighter">Total da Opção</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 italic">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcularTotal(opcao.cotacoes))}
                </span>
            </div>
          </div>
        ))}
      </div>

      {/* Espaçador para o rodapé fixo não cobrir os totais */}
      <div className="h-20 w-full" />

      {/* Rodapé fixo ajustado */}
      <div className="fixed bottom-0 left-72 right-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 z-40 pr-8">
        <div className="max-w-[1600px] mx-auto flex justify-end gap-4">
          <button 
            type="button"
            onClick={() => setShowFinalizeModal(true)} 
            className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            <Save size={20} /> {propostaId ? 'Atualizar Proposta' : 'Gerar Proposta'}
          </button>
        </div>
      </div>

      {/* MODAL DE PORTFÓLIO */}
      <ModalGerenciarPortfolio 
        isOpen={isModalPortfolioOpen}
        onClose={() => setIsModalPortfolioOpen(false)}
        onUpdate={() => { fetchDados(); }}
      />

      {showFinalizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-950/20">
              <h3 className="font-black text-lg uppercase italic text-blue-600 dark:text-blue-400">Finalizar Proposta</h3>
              <button type="button" onClick={() => setShowFinalizeModal(false)} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                <div className="w-10 h-10 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400"><Hash size={20}/></div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Proposta N°</span>
                  <span className="text-lg font-black tracking-widest text-slate-800 dark:text-zinc-100">{numeroProposta}</span>
                </div>
              </div>

              {/* CAMPO: CORRETOR */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                  Corretor Responsável {selectedClient?.corretor_id ? "(Herdado do Cliente)" : ""}
                </label>
                <select 
                  className={`w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 text-sm font-bold outline-none transition-all text-slate-800 dark:text-zinc-100 ${
                    selectedClient?.corretor_id ? 'bg-slate-100 dark:bg-zinc-800 cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  value={selectedCorretor}
                  onChange={(e) => setSelectedCorretor(e.target.value)}
                  disabled={!!selectedClient?.corretor_id}
                >
                  {!selectedClient?.corretor_id && <option value="">Selecione...</option>}
                  {corretores.map(c => <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.nome}</option>)}
                </select>
                
                {selectedClient?.corretor_id && (
                  <p className="text-[9px] text-blue-500 font-bold mt-2 uppercase italic leading-tight">
                    * Bloqueado: Esta proposta será vinculada ao corretor dono deste cliente.
                  </p>
                )}
              </div>

              {/* CAMPO: PARCEIRO INDICADOR */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                  Parceiro Indicador (Opcional)
                </label>
                <select 
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-zinc-100"
                  value={selectedParceiro}
                  onChange={(e) => setSelectedParceiro(e.target.value)}
                >
                  <option value="" className="dark:bg-zinc-900">Nenhum (Venda Direta)</option>
                  {parceiros.map(p => (
                    <option key={p.id} value={p.id} className="dark:bg-zinc-900">{p.nome_parceiro}</option>
                  ))}
                </select>
              </div>

              {/* CAMPO: VALIDADE */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Validade</label>
                <input 
                  type="date"
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-zinc-100"
                  value={validadeProposta}
                  onChange={(e) => setValidadeProposta(e.target.value)}
                />
              </div>

              <button 
                type="button"
                onClick={handleSalvarBanco}
                disabled={
                  loading || 
                  (!selectedCorretor && !selectedClient?.corretor_id) || 
                  !validadeProposta
                }
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {loading ? "Salvando..." : "Confirmar e Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-zinc-800 text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-500" size={44} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Proposta Salva!</h2>
            <p className="text-slate-500 dark:text-zinc-400 mb-8 text-sm">
              A proposta <strong className="text-blue-600 dark:text-blue-400">{numeroProposta}</strong> foi {propostaId ? "atualizada" : "gravada"} com sucesso no banco de dados.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button 
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/propostas/lista');
                }}
                className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
              >
                Ir para Listagem
              </button>
            </div>
          </div>
        </div>
      )}
    
    </div>
  );
}