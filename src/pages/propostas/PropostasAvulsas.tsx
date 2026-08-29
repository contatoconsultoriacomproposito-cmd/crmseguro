import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Loader2,
  X,
  Edit3,
  Check,
  ChevronDown,
  Calendar,
  Clock,
  User,
  Building2,
  Phone,
  Mail,
  FileText,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import * as XLSX from "xlsx";

// --- FUNÇÕES AUXILIARES DE MÁSCARA E FORMATAÇÃO ---
const aplicarMascaraCpfCnpj = (value: string) => {
  const nums = value.replace(/\D/g, "").slice(0, 14);
  if (nums.length <= 11) {
    return nums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return nums
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const aplicarMascaraTelefone = (value: string) => {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 10) {
    return nums
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return nums
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const formatarDataBR = (dataStr: string | null) => {
  if (!dataStr) return "";
  const partes = dataStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
};

export default function PropostasAvulsas() {
  // Estados dos Dados e Autenticação
  const [propostas, setPropostas] = useState<any[]>([]);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Estados de Filtros
  const [busca, setBusca] = useState<string>("");
  const [filtroCorretor, setFiltroCorretor] = useState<string>("todos");
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [situacoesSelecionadas, setSituacoesSelecionadas] = useState<string[]>([]);
  const [filtroPendencia, setFiltroPendencia] = useState<string>("todos");
  const [filtroTpMov, setFiltroTpMov] = useState<string>("todos");

  // Controle dos dropdowns Multiselect
  const [openProdutoSelect, setOpenProdutoSelect] = useState<boolean>(false);
  const [openSituacaoSelect, setOpenSituacaoSelect] = useState<boolean>(false);

  const produtoRef = useRef<HTMLDivElement>(null);
  const situacaoRef = useRef<HTMLDivElement>(null);

  // Estados do Modal Unificado (Nova Proposta / Edição)
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [modoModal, setModoModal] = useState<"novo" | "editar">("novo");
  const [itemEditando, setItemEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Estados de Paginação e Seleção
  const [itensPorPagina, setItensPorPagina] = useState(50);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  // Estado do Formulário (Com os novos campos de data incluídos)
  const [formData, setFormData] = useState({
    proponente: "",
    produto: "",
    proposta: "",
    cotacao: "",
    apolice: "",
    data_venda: "",
    data_inicio_vigencia: "",
    data_fim_vigencia: "",
    situacao: "EM ANDAMENTO",
    pendencia: "",
    tp_mov: "",
    corretor_id: "",
    cpf_cnpj: "",
    data_nascimento: "",
    sexo: "",
    telefone: "",
    email: "",
    banco: "",
    agencia: "",
    conta: "",
    observacao: "",
    data_retorno: "",
    horario_retorno: ""
  });

  // 1. Carregar perfil do usuário autenticado
  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: perfil, error } = await supabase
          .from("usuarios_perfis")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && perfil) {
          setUserProfile(perfil);
        }
      }
    }
    getInitialData();
  }, []);

  const idCorretoraEfetiva =
    userProfile?.tipo_usuario === "CORRETORA"
      ? userProfile?.id
      : userProfile?.corretora_id;

  // 2. Disparar buscas ao identificar perfil
  useEffect(() => {
    if (idCorretoraEfetiva) {
      carregarPropostas();
      if (userProfile?.tipo_usuario === "CORRETORA") {
        carregarCorretores();
      }
    }
  }, [userProfile]);

  // Fechar dropdowns de filtro ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (produtoRef.current && !produtoRef.current.contains(event.target as Node)) {
        setOpenProdutoSelect(false);
      }
      if (situacaoRef.current && !situacaoRef.current.contains(event.target as Node)) {
        setOpenSituacaoSelect(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carregar lista de corretores
  async function carregarCorretores() {
    if (!idCorretoraEfetiva) return;
    const { data } = await supabase
      .from("usuarios_perfis")
      .select("id, nome")
      .eq("corretora_id", idCorretoraEfetiva)
      .eq("tipo_usuario", "CORRETOR");

    setCorretores(data || []);
  }

  // Carregar propostas no banco
  async function carregarPropostas() {
    if (!idCorretoraEfetiva) return;

    try {
      setLoading(true);

      let query = supabase
        .from("tab_seguros_vida")
        .select(`
          *,
          usuarios_perfis!tab_seguros_vida_corretor_id_fkey ( nome )
        `)
        .eq("corretora_id", idCorretoraEfetiva)
        .order("id", { ascending: false });

      if (userProfile.tipo_usuario === "CORRETOR") {
        query = query.eq("corretor_id", userProfile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar propostas:", error);
      } else {
        setPropostas(data || []);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  }

  // Opções dinâmicas de Filtros
  const opcoesProdutos = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach((item) => {
      const p = item["Produto"] || item["produto"];
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [propostas]);

  const opcoesSituacoes = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach((item) => {
      const s = item["Situação"] || item["situacao"];
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [propostas]);

  const opcoesPendencias = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach((item) => {
      const p = item["Pend."] || item["pendencia"];
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [propostas]);

  const opcoesTpMov = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach((item) => {
      const t = item["Tp. Mov."] || item["tp_mov"];
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [propostas]);

  // Aplicação dos Filtros
  const propostasFiltradas = useMemo(() => {
    return propostas.filter((item) => {
      if (filtroCorretor !== "todos" && item.corretor_id !== filtroCorretor) {
        return false;
      }

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const proponente = (item["Proponente"] || "").toLowerCase();
        const apolice = (item["Apólice"] || item["apolice"] || "").toLowerCase();
        const proposta = (item["Proposta"] || item["proposta"] || "").toLowerCase();
        const cotacao = (item["Cotacao"] || item["cotacao"] || "").toLowerCase();
        const cpfCnpj = (item.cpf_cnpj || "").toLowerCase();

        const matchBusca =
          proponente.includes(termo) ||
          apolice.includes(termo) ||
          proposta.includes(termo) ||
          cotacao.includes(termo) ||
          cpfCnpj.includes(termo);

        if (!matchBusca) return false;
      }

      if (produtosSelecionados.length > 0) {
        const prod = item["Produto"] || item["produto"] || "";
        if (!produtosSelecionados.includes(prod)) return false;
      }

      if (situacoesSelecionadas.length > 0) {
        const sit = item["Situação"] || item["situacao"] || "";
        if (!situacoesSelecionadas.includes(sit)) return false;
      }

      if (filtroPendencia !== "todos") {
        const pend = item["Pend."] || item["pendencia"] || "";
        if (filtroPendencia === "SIM") {
          if (!pend || pend.toUpperCase() === "NÃO" || pend.toUpperCase() === "NAO") return false;
        } else if (filtroPendencia === "NAO") {
          if (pend && pend.toUpperCase() !== "NÃO" && pend.toUpperCase() !== "NAO") return false;
        } else if (pend !== filtroPendencia) {
          return false;
        }
      }

      if (filtroTpMov !== "todos") {
        const tpMov = item["Tp. Mov."] || item["tp_mov"] || "";
        if (tpMov !== filtroTpMov) return false;
      }

      return true;
    });
  }, [
    propostas,
    busca,
    filtroCorretor,
    produtosSelecionados,
    situacoesSelecionadas,
    filtroPendencia,
    filtroTpMov
  ]);

  const limparFiltros = () => {
    setBusca("");
    setFiltroCorretor("todos");
    setProdutosSelecionados([]);
    setSituacoesSelecionadas([]);
    setFiltroPendencia("todos");
    setFiltroTpMov("todos");
  };

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados((prev) =>
      prev.includes(produto)
        ? prev.filter((p) => p !== produto)
        : [...prev, produto]
    );
  };

  const toggleSituacao = (situacao: string) => {
    setSituacoesSelecionadas((prev) =>
      prev.includes(situacao)
        ? prev.filter((s) => s !== situacao)
        : [...prev, situacao]
    );
  };

  // --- ABERTURA DOS MODAIS ---
  const abrirModalNovaProposta = () => {
    setModoModal("novo");
    setItemEditando(null);
    setFormData({
      proponente: "",
      produto: "Seguro Viva Mais Bradesco Resgatável Com Carência",
      proposta: "",
      cotacao: "",
      apolice: "",
      data_venda: "",
      data_inicio_vigencia: "",
      data_fim_vigencia: "",
      situacao: "EM ANDAMENTO",
      pendencia: "NAO",
      tp_mov: "NOVA",
      corretor_id: userProfile?.id || "",
      cpf_cnpj: "",
      data_nascimento: "",
      sexo: "",
      telefone: "",
      email: "",
      banco: "",
      agencia: "",
      conta: "",
      observacao: "",
      data_retorno: "",
      horario_retorno: ""
    });
    setModalAberto(true);
  };

  const abrirModalEdicao = (item: any) => {
    setModoModal("editar");
    setItemEditando(item);
    setFormData({
      proponente: item["Proponente"] || item["proponente"] || "",
      produto: item["Produto"] || item["produto"] || "",
      proposta: item["Proposta"] || item["proposta"] || "",
      cotacao: item["Cotacao"] || item["cotacao"] || "",
      apolice: item["Apólice"] || item["apolice"] || "",
      data_venda: item.data_venda || "",
      data_inicio_vigencia: item.data_inicio_vigencia || "",
      data_fim_vigencia: item.data_fim_vigencia || "",
      situacao: item["Situação"] || item["situacao"] || "EM ANDAMENTO",
      pendencia: item["Pend."] || item["pendencia"] || "",
      tp_mov: item["Tp. Mov."] || item["tp_mov"] || "",
      corretor_id: item.corretor_id || userProfile?.id || "",
      cpf_cnpj: item.cpf_cnpj ? aplicarMascaraCpfCnpj(item.cpf_cnpj) : "",
      data_nascimento: item.data_nascimento || "",
      sexo: item.sexo || "",
      telefone: item.telefone ? aplicarMascaraTelefone(item.telefone) : "",
      email: item.email || "",
      banco: item.banco || "",
      agencia: item.agencia || "",
      conta: item.conta || "",
      observacao: item.observacao || "",
      data_retorno: item.data_retorno || "",
      horario_retorno: item.horario_retorno ? item.horario_retorno.slice(0, 5) : ""
    });
    setModalAberto(true);
  };

  // --- SALVAR NO BANCO (CRIAÇÃO OU EDIÇÃO) ---
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCorretoraEfetiva) return;

    if (!formData.proponente.trim()) {
      alert("Por favor, preencha o Nome do Proponente.");
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        corretora_id: idCorretoraEfetiva,
        corretor_id: formData.corretor_id || userProfile.id,
        Proponente: formData.proponente || null,
        Produto: formData.produto || null,
        Proposta: formData.proposta || null,
        Cotacao: formData.cotacao || null,
        "Apólice": formData.apolice || null,
        data_venda: formData.data_venda || null,
        data_inicio_vigencia: formData.data_inicio_vigencia || null,
        data_fim_vigencia: formData.data_fim_vigencia || null,
        "Situação": formData.situacao || "EM ANDAMENTO",
        "Pend.": formData.pendencia || null,
        "Tp. Mov.": formData.tp_mov || null,
        cpf_cnpj: formData.cpf_cnpj || null,
        data_nascimento: formData.data_nascimento || null,
        sexo: formData.sexo || null,
        telefone: formData.telefone || null,
        email: formData.email || null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        observacao: formData.observacao || null,
        data_retorno: formData.data_retorno || null,
        horario_retorno: formData.horario_retorno ? `${formData.horario_retorno}:00` : null
      };

      if (modoModal === "novo") {
        const { error } = await supabase
          .from("tab_seguros_vida")
          .insert([payload]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tab_seguros_vida")
          .update(payload)
          .eq("id", itemEditando.id);

        if (error) throw error;
      }

      await carregarPropostas();
      setModalAberto(false);
    } catch (err: any) {
      console.error("Erro ao salvar proposta:", err);
      alert("Erro ao salvar proposta: " + (err.message || "Tente novamente."));
    } finally {
      setSalvando(false);
    }
  };

  const renderBadgeSituacao = (situacao: string) => {
    const sit = (situacao || "").toUpperCase();
    let bg = "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300";

    if (sit.includes("EMITIDA") || sit.includes("APROVADA") || sit.includes("VENDIDA")) {
      bg = "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40";
    } else if (sit.includes("PENDENTE") || sit.includes("EM ANDAMENTO") || sit.includes("ANÁLISE")) {
      bg = "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40";
    } else if (sit.includes("RECUSADA") || sit.includes("CANCELADA")) {
      bg = "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40";
    }

    return (
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${bg}`}>
        {situacao || "EM ANDAMENTO"}
      </span>
    );
  };

  // --- LÓGICA DE PAGINAÇÃO CORRIGIDA ---
  const totalPaginas = Math.ceil(propostasFiltradas.length / itensPorPagina) || 1;
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const propostasPaginadas = propostasFiltradas.slice(indiceInicial, indiceInicial + itensPorPagina);

  // --- LÓGICA DE SELEÇÃO E EXPORTAÇÃO ---
  const toggleSelecionarTodos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelecionados(propostasPaginadas.map((p) => p.id));
    } else {
      setSelecionados([]);
    }
  };

  const toggleSelecionar = (id: number) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const exportarParaExcel = () => {
    const dadosParaExportar = propostasFiltradas.filter((p) => selecionados.includes(p.id));

    if (dadosParaExportar.length === 0) {
      alert("Selecione pelo menos uma proposta na lista para exportar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Propostas");
    XLSX.writeFile(workbook, "propostas_seguro_vida.xlsx");
  };

return (
  <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-800 dark:text-zinc-100">
    {/* CABEÇALHO */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propostas Seguro de Vida</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          {userProfile?.nome
            ? `Usuário: ${userProfile.nome} (${userProfile.tipo_usuario})`
            : "Carregando perfil..."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={exportarParaExcel}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <FileText size={16} /> Exportar Excel
        </button>

        <button
          onClick={abrirModalNovaProposta}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Plus size={16} /> Nova Proposta
        </button>
      </div>
    </div>

    {/* SEÇÃO DE FILTROS AVANÇADOS */}
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 mb-6 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar por Proponente, Apólice, Proposta ou Cotação..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1); // Reseta para a primeira página ao buscar
            }}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {busca && (
            <button
              onClick={() => {
                setBusca("");
                setPaginaAtual(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {userProfile?.tipo_usuario === "CORRETORA" && (
          <select
            value={filtroCorretor}
            onChange={(e) => {
              setFiltroCorretor(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full md:w-auto bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todos">Todos os Corretores</option>
            <option value={userProfile.id}>Atendimento Direto (Corretora)</option>
            {corretores.map((cor) => (
              <option key={cor.id} value={cor.id}>
                {cor.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Multiselects e Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Multiselect Produto */}
        <div className="relative" ref={produtoRef}>
          <button
            type="button"
            onClick={() => setOpenProdutoSelect(!openProdutoSelect)}
            className="w-full flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-left"
          >
            <span className="truncate font-medium">
              {produtosSelecionados.length === 0
                ? "Produto: Todos"
                : `Produtos (${produtosSelecionados.length})`}
            </span>
            <ChevronDown size={14} className="text-slate-400 ml-1 flex-shrink-0" />
          </button>

          {openProdutoSelect && (
            <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 p-2 max-h-60 overflow-y-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Selecione os Produtos
              </div>
              {opcoesProdutos.length === 0 ? (
                <div className="p-2 text-xs text-slate-400">Nenhum produto encontrado</div>
              ) : (
                opcoesProdutos.map((prod) => {
                  const sel = produtosSelecionados.includes(prod);
                  return (
                    <div
                      key={prod}
                      onClick={() => {
                        toggleProduto(prod);
                        setPaginaAtual(1);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer text-xs"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          sel
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 dark:border-zinc-700"
                        }`}
                      >
                        {sel && <Check size={12} />}
                      </div>
                      <span className="truncate">{prod}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Multiselect Situação */}
        <div className="relative" ref={situacaoRef}>
          <button
            type="button"
            onClick={() => setOpenSituacaoSelect(!openSituacaoSelect)}
            className="w-full flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-left"
          >
            <span className="truncate font-medium">
              {situacoesSelecionadas.length === 0
                ? "Situação: Todas"
                : `Situação (${situacoesSelecionadas.length})`}
            </span>
            <ChevronDown size={14} className="text-slate-400 ml-1 flex-shrink-0" />
          </button>

          {openSituacaoSelect && (
            <div className="absolute left-0 mt-1 w-60 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 p-2 max-h-60 overflow-y-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Selecione as Situações
              </div>
              {opcoesSituacoes.length === 0 ? (
                <div className="p-2 text-xs text-slate-400">Nenhuma situação encontrada</div>
              ) : (
                opcoesSituacoes.map((sit) => {
                  const sel = situacoesSelecionadas.includes(sit);
                  return (
                    <div
                      key={sit}
                      onClick={() => {
                        toggleSituacao(sit);
                        setPaginaAtual(1);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer text-xs"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          sel
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 dark:border-zinc-700"
                        }`}
                      >
                        {sel && <Check size={12} />}
                      </div>
                      <span className="truncate">{sit}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Filtro Pend. */}
        <select
          value={filtroPendencia}
          onChange={(e) => {
            setFiltroPendencia(e.target.value);
            setPaginaAtual(1);
          }}
          className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="todos">Pendência: Todas</option>
          <option value="SIM">Com Pendência</option>
          <option value="NAO">Sem Pendência</option>
          {opcoesPendencias.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Filtro Tp. Mov. */}
        <select
          value={filtroTpMov}
          onChange={(e) => {
            setFiltroTpMov(e.target.value);
            setPaginaAtual(1);
          }}
          className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="todos">Tp. Mov.: Todos</option>
          {opcoesTpMov.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Botão Limpar Filtros */}
        <button
          onClick={() => {
            limparFiltros();
            setPaginaAtual(1);
          }}
          className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
        >
          <RotateCcw size={14} /> Limpar
        </button>
      </div>
    </div>

    {/* TABELA DE REGISTROS */}
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800 font-bold uppercase text-slate-400 tracking-wider">
            <tr>
              <th className="p-4 w-10 text-center">
                <input
                  type="checkbox"
                  onChange={toggleSelecionarTodos}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="p-4">Proponente</th>
              <th className="p-4">CPF / CNPJ</th>
              <th className="p-4">Produto</th>
              <th className="p-4">Proposta / Cotação / Apólice</th>
              <th className="p-4">Situação</th>
              <th className="p-4">Corretor</th>
              <th className="p-4">Retorno</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-500" size={28} />
                  <p className="text-xs text-slate-400 mt-2">Carregando propostas...</p>
                </td>
              </tr>
            ) : propostasPaginadas.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-400 uppercase font-bold">
                  Nenhuma proposta encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              /* AQUI USAMOS propostasPaginadas AO INVÉS DE propostasFiltradas */
              propostasPaginadas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selecionados?.includes(item.id)}
                      onChange={() => toggleSelecionar(item.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-bold text-slate-900 dark:text-zinc-100">
                    {item["Proponente"] || item["proponente"] || "N/A"}
                  </td>
                  <td className="p-4 text-slate-500">
                    {item.cpf_cnpj ? aplicarMascaraCpfCnpj(item.cpf_cnpj) : "N/A"}
                  </td>
                  <td className="p-4 font-medium">{item["Produto"] || item["produto"] || "Seguro de Vida"}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      {item["Proposta"] && (
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                          Prop: {item["Proposta"]}
                        </span>
                      )}
                      {item["Cotacao"] && (
                        <span className="text-slate-500">Cot: {item["Cotacao"]}</span>
                      )}
                      {(item["Apólice"] || item["apolice"]) && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Apólice: {item["Apólice"] || item["apolice"]}
                        </span>
                      )}
                      {!item["Proposta"] && !item["Cotacao"] && !item["Apólice"] && (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {renderBadgeSituacao(item["Situação"] || item["situacao"])}
                  </td>
                  <td className="p-4 text-slate-500">
                    {item.usuarios_perfis?.nome || "Atendimento Direto"}
                  </td>
                  <td className="p-4">
                    {item.data_retorno ? (
                      <div className="flex flex-col gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-1.5 rounded-lg w-max">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatarDataBR(item.data_retorno)}
                        </span>
                        {item.horario_retorno && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-zinc-300 font-normal">
                            <Clock size={11} />
                            {item.horario_retorno.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => abrirModalEdicao(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 rounded-xl transition-all border border-blue-100 dark:border-blue-900/30"
                      title="Detalhes e Editar"
                    >
                      <Edit3 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CONTROLES DE PAGINAÇÃO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-zinc-800 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
          <span>Itens por página:</span>
          <select
            value={itensPorPagina}
            onChange={(e) => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1);
            }}
            className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-zinc-200 font-medium"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="ml-2 text-slate-400">
            (Total: {propostasFiltradas.length} registros)
          </span>
        </div>

        <div className="flex items-center gap-3 font-medium text-slate-600 dark:text-zinc-300">
          <span>
            Página <strong className="text-slate-900 dark:text-white">{paginaAtual}</strong> de{" "}
            <strong className="text-slate-900 dark:text-white">{totalPaginas}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
              disabled={paginaAtual === 1}
              className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
            >
              Anterior
            </button>
            <button
              onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
              disabled={paginaAtual >= totalPaginas}
              className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* MODAL COM OS NOVOS CAMPOS DE DATAS */}
    {modalAberto && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-zinc-800 mb-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md">
                {modoModal === "novo" ? "Novo Cadastro" : "Edição de Registro"}
              </span>
              <h2 className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-100">
                {modoModal === "novo"
                  ? "Nova Proposta de Seguro de Vida"
                  : formData.proponente || "Editar Proposta"}
              </h2>
            </div>
            <button
              onClick={() => setModalAberto(false)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSalvar} className="space-y-6">
            {/* Seção 1: Dados Principais da Proposta */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldCheck size={14} /> Dados da Proposta & Seguro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Nome do Proponente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.proponente || ""}
                    onChange={(e) => setFormData({ ...formData, proponente: e.target.value })}
                    placeholder="Nome Completo do Cliente"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Produto
                  </label>
                  <input
                    type="text"
                    value={formData.produto || ""}
                    onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                    placeholder="Ex: Seguro Viva Mais"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Nº da Proposta
                  </label>
                  <input
                    type="text"
                    value={formData.proposta || ""}
                    onChange={(e) => setFormData({ ...formData, proposta: e.target.value })}
                    placeholder="Ex: 28136"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Nº da Cotação
                  </label>
                  <input
                    type="text"
                    value={formData.cotacao || ""}
                    onChange={(e) => setFormData({ ...formData, cotacao: e.target.value })}
                    placeholder="Ex: 59839"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Nº da Apólice
                  </label>
                  <input
                    type="text"
                    value={formData.apolice || ""}
                    onChange={(e) => setFormData({ ...formData, apolice: e.target.value })}
                    placeholder="Ex: 98765"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* NOVOS CAMPOS ADICIONADOS AQUI */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Data da Venda
                  </label>
                  <input
                    type="date"
                    value={formData.data_venda || ""}
                    onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Início da Vigência
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio_vigencia || ""}
                    onChange={(e) => setFormData({ ...formData, data_inicio_vigencia: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Fim da Vigência
                  </label>
                  <input
                    type="date"
                    value={formData.data_fim_vigencia || ""}
                    onChange={(e) => setFormData({ ...formData, data_fim_vigencia: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Situação
                  </label>
                  <select
                    value={formData.situacao || "EM ANDAMENTO"}
                    onChange={(e) => setFormData({ ...formData, situacao: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                    <option value="EMITIDA">EMITIDA</option>
                    <option value="PENDENTE">PENDENTE</option>
                    <option value="CANCELADA">CANCELADA</option>
                    <option value="RECUSADA">RECUSADA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Pendência
                  </label>
                  <select
                    value={formData.pendencia || "NAO"}
                    onChange={(e) => setFormData({ ...formData, pendencia: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NAO">NÃO</option>
                    <option value="SIM">SIM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Tipo de Movimentação
                  </label>
                  <input
                    type="text"
                    value={formData.tp_mov || ""}
                    onChange={(e) => setFormData({ ...formData, tp_mov: e.target.value })}
                    placeholder="Ex: NOVA, RENOVAÇÃO..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {userProfile?.tipo_usuario === "CORRETORA" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Corretor Responsável
                    </label>
                    <select
                      value={formData.corretor_id || ""}
                      onChange={(e) => setFormData({ ...formData, corretor_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={userProfile.id}>Atendimento Direto (Corretora)</option>
                      {corretores.map((cor) => (
                        <option key={cor.id} value={cor.id}>
                          {cor.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Seção 2: Dados Pessoais */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User size={14} /> Dados do Cliente & Contato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    CPF / CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cpf_cnpj: aplicarMascaraCpfCnpj(e.target.value)
                      })
                    }
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.data_nascimento || ""}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Sexo
                  </label>
                  <select
                    value={formData.sexo || ""}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Não informado</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                    <Phone size={12} /> Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.telefone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telefone: aplicarMascaraTelefone(e.target.value)
                      })
                    }
                    placeholder="(00) 00000-0000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                    <Mail size={12} /> E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Dados Bancários */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 size={14} /> Dados Bancários
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={formData.banco || ""}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Ex: Itaú, Bradesco..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={formData.agencia || ""}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="0000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Conta
                  </label>
                  <input
                    type="text"
                    value={formData.conta || ""}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="00000-0"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção 4: Agendamento de Retorno */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar size={14} /> Agendamento de Retorno
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Data do Retorno
                  </label>
                  <input
                    type="date"
                    value={formData.data_retorno || ""}
                    onChange={(e) => setFormData({ ...formData, data_retorno: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                    <Clock size={12} /> Horário do Retorno
                  </label>
                  <input
                    type="time"
                    value={formData.horario_retorno || ""}
                    onChange={(e) => setFormData({ ...formData, horario_retorno: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Salvando...
                  </>
                ) : (
                  "Salvar Registro"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
}