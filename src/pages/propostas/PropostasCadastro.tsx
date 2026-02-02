import { useState, useEffect, useMemo } from "react";
import { 
  Save, FileText, Search, Trash2, User, 
  X, Hash, CheckCircle2, PlusCircle
  
} from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // Importante para detectar modo edição
import { supabase } from "../../lib/supabaseClient";
import { gerarPDFProposta } from '../../utils/gerarPDF';
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
  numero_cotacao: string; // <--- NOVO CAMPO ADICIONADO
}

interface OpcaoSeguradora {
  id?: string; // ID do banco se for edição
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
  const navigate = useNavigate(); // Adicionado aqui
  const location = useLocation(); // <--- Adicione isto
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

  // Estado inicial com as 3 OPÇÕES AUTOMÁTICAS
  const [opcoes, setOpcoes] = useState<OpcaoSeguradora[]>([
    { seguradora_id: "", nome_seguradora: "", cotacoes: [] },
    //{ seguradora_id: "", nome_seguradora: "", cotacoes: [] },
    //{ seguradora_id: "", nome_seguradora: "", cotacoes: [] },
  ]);

  // NOVO: Herdar o corretor do cliente assim que o cliente for selecionado
useEffect(() => {
  if (selectedClient && selectedClient.corretor_id) {
    setSelectedCorretor(selectedClient.corretor_id);
  }
}, [selectedClient]);
  
  
  useEffect(() => {
    const carregarTudo = async () => {
      await fetchDados();
      if (propostaId) {
        await carregarDadosEdicao(propostaId);
      } else {
        // SE FOR NOVA: Gera o número robusto aqui
        setNumeroProposta(gerarIDProposta());
      }
    };
    carregarTudo();
  }, [propostaId]);

  // Efeito para auto-selecionar o cliente vindo do card
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
    
    // 1. Pega o usuário logado e seu perfil
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase
      .from("usuarios_perfis")
      .select("id, nome, tipo_usuario, corretora_id")
      .eq("id", user.id)
      .single();

    if (!perfil?.corretora_id) return;

    // 2. Busca Clientes normalmente
    const { data: clis } = await supabase.from("tab_clientes").select("*");
    setClientes(clis || []);

    // 3. BUSCA O PORTFÓLIO DA CORRETORA (A grande mudança)
    // Buscamos na tab_corretora_portfolio trazendo os dados das tabelas BASE
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

    // 4. Extrair Seguradoras Únicas e Produtos Únicos do Portfólio
    // Como a tabela de portfólio é uma matriz, precisamos filtrar os nulos e remover duplicatas
    const seguradorasDistintas = Array.from(new Map(
      portfolio
        .filter(item => item.base_seguradoras)
        .map(item => {
          const s = item.base_seguradoras as any; // Cast para evitar o erro de 'id' inexistente
          return [s.id, { id: s.id, nome: s.nome }];
        })
    ).values());
    
    setSeguradoras(seguradorasDistintas);
    
    // Dentro da função fetchDados (Parte 1), adicione a busca:
    const { data: pars } = await supabase
      .from("tab_parceiros")
      .select("id, nome_parceiro")
      .eq("corretora_id", perfil.corretora_id)
      .order('nome_parceiro', { ascending: true });
    setParceiros(pars || []);



    // 5. Lógica de Corretores (mantém como estava)
    if (perfil.tipo_usuario === 'CORRETOR') {
      setCorretores([{ id: perfil.id, nome: perfil.nome }]);
      setSelectedCorretor(perfil.id);
    } else {
      const { data: corrs } = await supabase
        .from("usuarios_perfis")
        .select("id, nome")
        .eq("tipo_usuario", "CORRETOR")
        .eq("corretora_id", perfil.corretora_id)
        .order('nome', { ascending: true });
      setCorretores(corrs || []);
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  } finally {
    setLoading(false);
  }
}

  // NOVA FUNÇÃO: Carrega dados para EDIÇÃO
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
      setSelectedCorretor(prop.corretor_id);
      setSelectedParceiro(prop.parceiro_id || ""); // <--- ADICIONE ESTA LINHA
      setValidadeProposta(prop.data_validade);
      setNumeroProposta(prop.numero_proposta);

      // Mapeia as opções do banco para o estado da tela usando as tabelas BASE
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
            numero_cotacao: it.numero_cotacao || "" // <--- MAPEADO DA EDIÇÃO
          };
        })
      }));

      // Garante que sempre existam pelo menos 3 colunas visualmente
      //while (opcoesMapeadas.length < 3) {
        //opcoesMapeadas.push({ seguradora_id: "", nome_seguradora: "", cotacoes: [] });
      //}
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
        numero_cotacao: "" // <--- INICIALIZADO VAZIO
      });
      setOpcoes(novasOpcoes);
    }
  };

  const adicionarNovaOpcao = () => {
        setOpcoes([...opcoes, { seguradora_id: "", nome_seguradora: "", cotacoes: [] }]);
      };

  // --- COLE ESTA FUNÇÃO AQUI ---
  const removerOpcao = async (index: number) => {
    const opcaoParaRemover = opcoes[index];

    // Se a opção já existe no banco (tem ID), deletamos no Supabase
    if (opcaoParaRemover.id) {
      const confirmar = confirm("Deseja realmente excluir esta seguradora e todos os seus produtos?");
      if (!confirmar) return;

      try {
        setLoading(true);
        // O banco fará o delete em cascata nos itens (tab_proposta_itens)
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

    // Remove do estado (da tela)
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

  const handleGerarPDF = () => {
    if (!selectedClient) return alert("Selecione um cliente.");
    const produtosUnicos = Array.from(new Set(opcoes.flatMap(opt => opt.cotacoes.map(c => c.nome_produto))));

    gerarPDFProposta({
      numeroProposta: numeroProposta,
      corretorId: selectedCorretor,
      validade: validadeProposta,
      cliente: {
        nome: selectedClient.tipo_cliente === 'PJ' ? selectedClient.razao_social : selectedClient.nome,
        documento: selectedClient.tipo_cliente === 'PJ' ? selectedClient.cnpj : selectedClient.cpf,
        whatsapp: selectedClient.telefone_whats || ''
      },
      produtosUnicos,
      opcoes: opcoes
        .filter(opt => opt.seguradora_id !== "")
        .map(opt => ({
          companhia: opt.nome_seguradora,
          itens: opt.cotacoes.map(cot => ({
            nomeProduto: cot.nome_produto,
            valor: typeof cot.valor === 'string' ? parseFloat(cot.valor.replace(/\D/g, "")) / 100 : cot.valor,
            cobertura: cot.cobertura,
            parcelamento: cot.parcelamento,
            meio: cot.meio,
            numero_cotacao: cot.numero_cotacao // <--- Enviando para o PDF
          }))
        }))
    });
  };

  const handleSalvarBanco = async () => {
    // Definimos o corretor final: Prioriza o selecionado ou o herdado do cliente
    const corretorFinal = selectedCorretor || selectedClient?.corretor_id;

    if (!selectedClient || !corretorFinal || !validadeProposta) {
        return alert("Preencha todos os campos obrigatórios (Cliente, Corretor e Validade).");
    }
    setLoading(true);

    try {
      // 1. Identificação do Usuário e Corretora
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

      // 2. Preparação dos dados da Proposta
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

      // 3. Upsert na tab_propostas
      if (propostaId) {
        const { error: errorU } = await supabase
          .from("tab_propostas")
          .update(dadosProposta)
          .eq("id", propostaId);
        
        if (errorU) throw errorU;
        // Limpa opções antigas para reinserir as novas (lógica de edição que você já usa)
        await supabase.from("tab_proposta_opcoes").delete().eq("proposta_id", propostaId);
      } else {
        const { data, error } = await supabase.from("tab_propostas").insert(dadosProposta).select().single();
        if (error) throw error;
        currentPropostaId = data.id;

        // --- REGISTRO DE INTERAÇÃO (Apenas na criação da proposta) ---
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

      // 4. Inserir Opções e Itens
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
            numero_cotacao: cot.numero_cotacao
          }));
          await supabase.from("tab_proposta_itens").insert(itensParaInserir);
        }
      }

      // --- SINCRONIZAÇÃO INTELIGENTE DA FASE DO KANBAN ---
      let faseAlvo = 'negociacao'; // Padrão para novos leads (status 'novo')

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

      // O redirecionamento agora é controlado pelo botão na modal de sucesso, 
      // mas mantivemos o timer por segurança caso o usuário não clique.
      setTimeout(() => {
        if (showSuccess) {
           setShowSuccess(false);
           navigate('/propostas/lista');
        }
      }, 5000);

    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen pb-32">
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
                      className="w-full p-3 text-left hover:bg-blue-50 border-b last:border-0"
                    >
                      <p className="text-sm font-bold uppercase">{c.tipo_cliente === 'PJ' ? c.razao_social : c.nome}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{c.tipo_cliente === 'PJ' ? c.cnpj : c.cpf}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient ? (
              <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 relative">
                <button onClick={() => setSelectedClient(null)} className="absolute top-2 right-2 text-blue-300 hover:text-red-500"><X size={14} /></button>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">Nome / Razão Social</span>
                  <span className="text-sm font-bold block truncate uppercase">{selectedClient.tipo_cliente === 'PJ' ? selectedClient.razao_social : selectedClient.nome}</span>
                  <span className="text-[11px] opacity-60">{selectedClient.tipo_cliente === 'PJ' ? selectedClient.cnpj : selectedClient.cpf}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">WhatsApp</span>
                  <span className="text-sm font-bold text-emerald-600">{selectedClient.telefone_whats || "---"}</span>
                </div>
              </div>
            ) : (
              <div className="col-span-3 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm italic">Aguardando seleção...</div>
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
          onClick={adicionarNovaOpcao}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 group"
        >
          <span className="group-hover:rotate-90 transition-transform duration-300 text-base">+</span>
          Adicionar Nova Opção de Seguradora
        </button>
        
        {/* Linha decorativa opcional para dar profundidade */}
        <div className="w-24 h-1 bg-blue-600 rounded-full opacity-20"></div>
      </div>

      <div className="max-w-[1600px] mx-auto flex flex-wrap justify-center gap-8 py-4">
      {opcoes.map((opcao, opIdx) => (
        <div 
          key={opIdx} 
          className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl flex flex-col min-h-[600px] 
                    w-full 
                    md:w-[420px] 
                    transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-2"
        >
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50 rounded-t-[32px]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs italic">0{opIdx + 1}</span>
                <h3 className="font-black text-sm uppercase tracking-tight">Opção de Cotação</h3>
              </div>
              
              {/* BOTÃO DE EXCLUIR SEGURADORA ADICIONADO AQUI */}
              <button 
                onClick={() => removerOpcao(opIdx)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Excluir Seguradora"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
  <div>
    {/* Cabeçalho com Label e Atalho para o Modal */}
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
      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold outline-none"
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
      <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200">
        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block italic">
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
                  onClick={() => addProdutoToOpcao(opIdx, p)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex items-center gap-1"
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
              <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full uppercase">{cot.nome_produto}</span>
              <button onClick={() => { const novas = [...opcoes]; novas[opIdx].cotacoes.splice(cotIdx, 1); setOpcoes(novas); }} className="text-red-400 opacity-0 group-hover:opacity-100"><X size={14} /></button>
            </div>
            
            <div className="mb-3">
              <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Hash size={10} /> Nº Cotação (Opcional)
              </label>
              <input 
                type="text" 
                placeholder="Ex: 998877"
                className="w-full h-8 bg-transparent border-b border-slate-200 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                value={cot.numero_cotacao}
                onChange={e => updateCotacao(opIdx, cotIdx, 'numero_cotacao', e.target.value)}
              />
            </div>                    
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Valor Cotação</label>
                <input type="text" className="w-full h-9 bg-transparent border-b border-slate-200 font-black text-sm text-blue-600" 
                  value={cot.valor}
                  onChange={e => handleValorChange(opIdx, cotIdx, e.target.value)}
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Data</label>
                <input type="date" className="w-full h-9 bg-transparent border-b border-slate-200 text-xs" 
                  value={cot.data} onChange={e => updateCotacao(opIdx, cotIdx, 'data', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Parcelas</label>
                <select className="w-full h-9 bg-transparent border-b border-slate-200 text-xs font-bold"
                  value={cot.parcelamento}
                  onChange={e => updateCotacao(opIdx, cotIdx, 'parcelamento', e.target.value)}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i} value={`${i+1}x`}>{i+1}x</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Meio</label>
                <select className="w-full h-9 bg-transparent border-b border-slate-200 text-xs font-bold"
                  value={cot.meio}
                  onChange={e => updateCotacao(opIdx, cotIdx, 'meio', e.target.value)}
                >
                  <option value="Boleto">Boleto</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Pix">À vista</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Coberturas</label>
              <textarea className="w-full p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-[11px] h-20 resize-none outline-none" 
                value={cot.cobertura} onChange={e => updateCotacao(opIdx, cotIdx, 'cobertura', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Inserção do Modal no fluxo do componente */}
  <ModalGerenciarPortfolio 
    isOpen={isModalPortfolioOpen}
    onClose={() => setIsModalPortfolioOpen(false)}
    onUpdate={() => {
      // CORREÇÃO: Alterado de carregarDadosIniciais para fetchDados
      fetchDados(); 
    }}
  />
  </div>

            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 rounded-b-[32px]">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-tighter">Total da Opção</span>
                <span className="text-2xl font-black text-blue-600 italic">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcularTotal(opcao.cotacoes))}
                </span>
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé fixo ajustado para não invadir o menu lateral */}
      <div className="fixed bottom-0 left-72 right-24 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-slate-200 z-40">
        <div className="max-w-[1600px] mx-auto flex justify-end gap-4">
          <button 
            onClick={handleGerarPDF}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all"
          >
            <FileText size={20} /> PDF Proposta
          </button>
          
          <button 
            onClick={() => setShowFinalizeModal(true)} 
            className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            <Save size={20} /> {propostaId ? 'Atualizar Proposta' : 'Gerar Proposta'}
          </button>
        </div>
      </div>

     {showFinalizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
              <h3 className="font-black text-lg uppercase italic text-blue-600">Finalizar Proposta</h3>
              <button onClick={() => setShowFinalizeModal(false)} className="p-2 hover:bg-red-50 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600"><Hash size={20}/></div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Proposta N°</span>
                  <span className="text-lg font-black tracking-widest">{numeroProposta}</span>
                </div>
              </div>

              {/* CAMPO: CORRETOR */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                  Corretor Responsável {selectedClient?.corretor_id ? "(Herdado do Cliente)" : ""}
                </label>
                <select 
                  className={`w-full h-12 px-4 rounded-2xl border border-slate-200 dark:bg-zinc-900 text-sm font-bold outline-none transition-all ${
                    selectedClient?.corretor_id ? 'bg-slate-100 dark:bg-zinc-800 cursor-not-allowed opacity-70' : ''
                  }`}
                  value={selectedCorretor}
                  onChange={(e) => setSelectedCorretor(e.target.value)}
                  disabled={!!selectedClient?.corretor_id}
                >
                  {corretores.length > 1 && !selectedClient?.corretor_id && <option value="">Selecione...</option>}
                  {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                
                {selectedClient?.corretor_id && (
                  <p className="text-[9px] text-blue-500 font-bold mt-2 uppercase italic leading-tight">
                    * Bloqueado: Esta proposta será vinculada ao corretor dono deste cliente.
                  </p>
                )}
              </div>

              {/* NOVO CAMPO: PARCEIRO INDICADOR */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                  Parceiro Indicador (Opcional)
                </label>
                <select 
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={selectedParceiro}
                  onChange={(e) => setSelectedParceiro(e.target.value)}
                >
                  <option value="">Nenhum (Venda Direta)</option>
                  {parceiros.map(p => (
                    <option key={p.id} value={p.id}>{p.nome_parceiro}</option>
                  ))}
                </select>
              </div>

              {/* CAMPO: VALIDADE */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Validade</label>
                <input 
                  type="date"
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={validadeProposta}
                  onChange={(e) => setValidadeProposta(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSalvarBanco}
                disabled={
                  loading || 
                  (!selectedCorretor && !selectedClient?.corretor_id) || 
                  !validadeProposta
                }
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {loading ? "Salvando..." : "Confirmar e Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO AJUSTADO: SEM DOWNLOAD AUTOMÁTICO */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-zinc-800 text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-500" size={44} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Proposta Salva!</h2>
            <p className="text-slate-500 dark:text-zinc-400 mb-8">
              A proposta **{numeroProposta}** foi {propostaId ? "atualizada" : "gravada"} com sucesso no banco de dados.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  handleGerarPDF(); // Gera apenas se o usuário clicar
                }}
                className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
              >
                <FileText size={18} /> Baixar PDF Agora
              </button>

              <button 
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/propostas/lista');
                }}
                className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
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