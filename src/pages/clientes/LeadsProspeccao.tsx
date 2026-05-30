import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Calendar, CheckCircle2, Loader2,
  Upload, Trash2, Eye, Edit3, Check, Plus, X, MessageSquare, Clock
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import { maskCPF, maskCNPJ, maskPhone } from "../../utils/masks";
import { toast } from "sonner";

// Lista de colunas fixas mapeáveis do banco de dados destino
const COLUNAS_BANCO = [
  { campo: "cnpj", label: "CNPJ (Obrigatório)" },
  { campo: "razao_social", label: "Razão Social" },
  { campo: "nome_fantasia", label: "Nome Fantasia" },
  { campo: "cnae_principal", label: "Descrição do CNAE / Nicho" },
  { campo: "porte", label: "Porte da Empresa" },
  { campo: "capital_social", label: "Capital Social" },
  { campo: "ddd_telefone_1", label: "Telefone Comercial" },
  { campo: "opcao_pelo_mei", label: "Opção MEI (S/N)" },
  { campo: "opcao_pelo_simples", label: "Opção Simples Nacional (S/N)" },
  { campo: "natureza_juridica", label: "Natureza Jurídica" },
  { campo: "descricao_identificador_matriz_filial", label: "Identificador Matriz/Filial" },
  { campo: "cep", label: "CEP" },
  { campo: "uf", label: "UF" },
  { campo: "municipio", label: "Município" },
  { campo: "bairro", label: "Bairro" },
  { campo: "logradouro", label: "Logradouro" },
  { campo: "numero", label: "Número" },
  { campo: "complemento", label: "Complemento" },
  { campo: "email", label: "E-mail Corporativo" },
  { campo: "telefone_adicional", label: "Telefone Secundário" },
  { campo: "nomes_socios", label: "Nome dos Sócios" },
  { campo: "cpfs_socios", label: "CPF dos Sócios" },
  { campo: "faixas_etarias", label: "Faixa Etária dos Sócios" },
  { campo: "logradouro", label: "Logradouro / Rua" },
  { campo: "numero", label: "Número" },
  { campo: "complemento", label: "Complemento" },
  { campo: "cep", label: "CEP" },
];

export default function LeadsProspeccao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  
  // Estados de Dados Principais
  const [leads, setLeads] = useState<any[]>([]);
  const [todosCnaesDisponiveis, setTodosCnaesDisponiveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Estados do Motor de Importação CSV (Mapeamento Flexível)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapeamento, setMapeamento] = useState<{ [key: string]: string }>({});
  const [mostrarMapeador, setMostrarMapeador] = useState(false);

  // Estados de Filtros Geográficos e Avançados
  const [filtroUf, setFiltroUf] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("");
  const [filtroBairro, setFiltroBairro] = useState("");
  const [filtroCnaesSelecionados, setFiltroCnaesSelecionados] = useState<string[]>([]);
  const [termoPesquisaCnae, setTermoPesquisaCnae] = useState("");
  const [dropdownCnaeAberto, setDropdownCnaeAberto] = useState(false);

  // Estados dos Modais Modulares
  const [leadVisualizar, setLeadVisualizar] = useState<any>(null);
  const [leadEditar, setLeadEditar] = useState<any>(null);
  const [leadTimeline, setLeadTimeline] = useState<any>(null);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);
  const [novaAcaoObs, setNovaAcaoObs] = useState("");
  const [novaAcaoRetorno, setNovaAcaoRetorno] = useState("");

  // Estado do Botão de Ouro (Conversor Realtime)
  const [leadConversao, setLeadConversao] = useState<any>(null);
  const [dadosConversaoCRM, setDadosConversaoCRM] = useState<any>({
    origem_cliente: "Prospecção Ativa",
    status_kanban: "novo",
    temperatura: "frio",
    nome: "",
    cpf: "",
    telefone_whats: ""
  });

  // Inicialização e Carga de Perfis
  useEffect(() => {
    async function carregarPerfil() {
      if (!user?.id) return;
      const { data } = await supabase.from("usuarios_perfis").select("*").eq("id", user.id).single();
      if (data) {
        setPerfilUsuario(data);
      }
    }
    carregarPerfil();
  }, [user]);

  useEffect(() => {
    if (perfilUsuario) {
      buscarLeadsFrios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilUsuario, filtroUf, filtroMunicipio, filtroBairro, filtroCnaesSelecionados]);

  // Leitura de Dados Básica e Filtros Inteligentes
  async function buscarLeadsFrios() {
    if (!perfilUsuario) return;
    setLoading(true);
    try {
      let query = supabase.from("tab_clientes_frios").select("*").eq("corretora_id", perfilUsuario.corretora_id).neq("status_prospeccao", "convertido");
      
      if (perfilUsuario.tipo_usuario === "CORRETOR") {
        query = query.eq("corretor_id", perfilUsuario.id);
      }
      if (filtroUf) query = query.ilike("uf", `%${filtroUf}%`);
      if (filtroMunicipio) query = query.ilike("municipio", `%${filtroMunicipio}%`);
      if (filtroBairro) query = query.ilike("bairro", `%${filtroBairro}%`);
      if (filtroCnaesSelecionados.length > 0) { query = query.in("cnae_principal", filtroCnaesSelecionados); }

    const { data, error } = await query.order("importado_em", { ascending: false });
    
    if (error) throw error;

    // Garante que 'data' não é nulo antes de extrair os CNAEs
    if (data && filtroCnaesSelecionados.length === 0 && !filtroUf && !filtroMunicipio && !filtroBairro) {
      const cnaesUnicos = Array.from(
        new Set(data.map((l: any) => l.cnae_principal?.trim()).filter(Boolean))
      ) as string[];
      setTodosCnaesDisponiveis(cnaesUnicos);
    }

    setLeads(data || []);
  } catch (err: any) {
    toast.error("Erro ao buscar registros: " + err.message);
  } finally {
    setLoading(false);
  }
  }

  // Processamento de Upload e Leitura do Cabeçalho CSV
  const handleProcessarCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const delimitador = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(delimitador).map(h => h.replace(/^["']|["']$/g, "").trim());
      
      const rows = lines.slice(1).map(line => 
        line.split(delimitador).map(cell => cell.replace(/^["']|["']$/g, "").trim())
      );

      setCsvHeaders(headers);
      setCsvRows(rows);

      const mapaInicial: { [key: string]: string } = {};
      COLUNAS_BANCO.forEach(col => {
        if (headers.includes(col.campo)) {
          mapaInicial[col.campo] = col.campo;
        }
      });
      setMapeamento(mapaInicial);
      setMostrarMapeador(true);
    };
    reader.readAsText(file, "UTF-8");
  };

  const salvarImportacaoLote = async () => {
    if (!mapeamento["cnpj"]) {
      toast.warning("Você precisa obrigatoriamente mapear a coluna de CNPJ!");
      return;
    }
    setLoading(true);
    try {
      const registrosTratados = csvRows.map(row => {
        const item: any = {
          corretora_id: perfilUsuario.corretora_id,
          corretor_id: perfilUsuario.tipo_usuario === "CORRETOR" ? perfilUsuario.id : null,
          status_prospeccao: "nao_contatado"
        };

        COLUNAS_BANCO.forEach(col => {
        const colunaCsvEscolhida = mapeamento[col.campo];
        if (colunaCsvEscolhida) {
          const index = csvHeaders.indexOf(colunaCsvEscolhida);
          if (index !== -1) {
            // .trim() remove espaços inúteis inseridos acidentalmente no CSV
            const valor = row[index]?.trim(); 

            if (col.campo === "capital_social") {
              item[col.campo] = valor ? parseFloat(valor.replace(/[^0-9.-]/g, "")) || 0 : 0;
            } else if (col.campo === "opcao_pelo_mei" || col.campo === "opcao_pelo_simples") {
              item[col.campo] = valor?.toUpperCase() === "S" || valor?.toUpperCase() === "SIM" || valor === "true";
            } else if (col.campo === "cep") {
              // Mantém apenas os números no CEP (ex: 88708-352 vira 88708352)
              item[col.campo] = valor ? valor.replace(/\D/g, "") : null;
            } else if (col.campo === "numero") {
              // Garante o formato string para aceitar "581" ou "S/N" sem estourar o banco
              item[col.campo] = valor ? String(valor) : null;
            } else {
              // Salva os campos text normais (logradouro, complemento, etc.)
              item[col.campo] = valor || null;
            }
          }
        }
      });
        return item;
      }).filter(r => r.cnpj);

      const { error } = await supabase.from("tab_clientes_frios").insert(registrosTratados);
      if (error) throw error;

      toast.success(`${registrosTratados.length} leads frios importados e protegidos por RLS!`);
      setMostrarMapeador(false);
      buscarLeadsFrios();
    } catch (err: any) {
      toast.error("Falha ao salvar lote: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Controle de Seleção Global (Checkbox) e Deleção Lote
  const toggleSelecionarTodos = () => {
    if (selecionados.length === leads.length) {
      setSelecionados([]);
    } else {
      setSelecionados(leads.map(l => l.id));
    }
  };

  const toggleLeadUnico = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const excluirLoteOuUnico = async (idEspecifico?: string) => {
    const idsParaExcluir = idEspecifico ? [idEspecifico] : selecionados;
    if (idsParaExcluir.length === 0) return;

    if (!window.confirm(`Tem certeza de que deseja apagar permanentemente ${idsParaExcluir.length} registro(s)?`)) return;

    try {
      const { error } = await supabase.from("tab_clientes_frios").delete().in("id", idsParaExcluir);
      if (error) throw error;
      toast.success("Registros removidos com sucesso!");
      setSelecionados([]);
      buscarLeadsFrios();
    } catch (err: any) {
      toast.error("Erro na remoção: " + err.message);
    }
  };

  // Gestão do Módulo de Timeline e Agendamento Simplificado
  const abrirTimeline = async (lead: any) => {
    setLeadTimeline(lead);
    setNovaAcaoObs("");
    setNovaAcaoRetorno("");
    try {
      const { data, error } = await supabase
        .from("tab_clientes_frios_acoes")
        .select("*")
        .eq("cliente_frio_id", lead.id)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      setHistoricoAcoes(data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const salvarNovaAcaoAcompanhamento = async () => {
    if (!novaAcaoObs.trim()) {
      toast.warning("Escreva o resumo da ação realizada.");
      return;
    }
    try {
      const { error } = await supabase.from("tab_clientes_frios_acoes").insert({
        cliente_frio_id: leadTimeline.id,
        corretor_id: perfilUsuario.id,
        observacao: novaAcaoObs,
        data_retorno: novaAcaoRetorno || null
      });
      if (error) throw error;

      await supabase.from("tab_clientes_frios").update({
        status_prospeccao: "em_prospeccao"
      }).eq("id", leadTimeline.id);

      toast.success("Ação registrada na linha do tempo!");
      abrirTimeline(leadTimeline);
      buscarLeadsFrios();
    } catch (err: any) {
      toast.error("Falha ao salvar ação: " + err.message);
    }
  };

  // O Botão de Ouro: Motor de Conversão Direta para a Tab_Clientes CRM
  const processarConversaoOuroFinal = async () => {
    try {
      const { data: existente } = await supabase
        .from("tab_clientes")
        .select("id")
        .eq("cnpj", leadConversao.cnpj)
        .eq("corretora_id", perfilUsuario.corretora_id)
        .maybeSingle();

      if (existente) {
        toast.error("Este CNPJ já possui cadastro ativo no seu CRM!");
        return;
      }

      const crmPayload = {
        tipo_cliente: "PJ",
        corretora_id: perfilUsuario.corretora_id,
        corretor_id: leadConversao.corretor_id || perfilUsuario.id,
        cnpj: leadConversao.cnpj,
        razao_social: leadConversao.razao_social,
        nome_fantasia: leadConversao.nome_fantasia,
        cnae_principal: leadConversao.cnae_principal, 
        porte: leadConversao.porte,
        capital_social: leadConversao.capital_social,
        ddd_telefone_1: leadConversao.ddd_telefone_1,
        opcao_pelo_mei: leadConversao.opcao_pelo_mei,
        opcao_pelo_simples: leadConversao.opcao_pelo_simples,
        natureza_juridica: leadConversao.natureza_juridica,
        descricao_identificador_matriz_filial: leadConversao.descricao_identificador_matriz_filial,
        cep: leadConversao.cep,
        uf: leadConversao.uf,
        municipio: leadConversao.municipio,
        bairro: leadConversao.bairro,
        logradouro: leadConversao.logradouro,
        numero: leadConversao.numero,
        complemento: leadConversao.complemento,
        email: leadConversao.email,
        telefone_adicional: leadConversao.telefone_adicional,
        origem_cliente: dadosConversaoCRM.origem_cliente,
        status_kanban: dadosConversaoCRM.status_kanban,
        temperatura: dadosConversaoCRM.temperatura,
        nome: dadosConversaoCRM.nome || null,
        cpf: dadosConversaoCRM.cpf || null,
        telefone_whats: dadosConversaoCRM.telefone_whats || null
      };

      const { error: insertErr } = await supabase.from("tab_clientes").insert(crmPayload);
      if (insertErr) throw insertErr;

      await supabase.from("tab_clientes_frios").update({ status_prospeccao: "convertido" }).eq("id", leadConversao.id);

      toast.success("✨ Lead convertido com absoluto sucesso para o seu CRM!");
      setLeadConversao(null);
      buscarLeadsFrios();
    } catch (err: any) {
      toast.error("Erro crítico na conversão: " + err.message);
    }
  };

  const renderSociosBadge = (nomes: string | null) => {
    if (!nomes) return <span className="text-xs text-gray-400">Não listado</span>;
    return nomes.split(" | ").map((n, i) => (
      <span key={i} className="inline-block bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded mr-1 mb-1 font-medium">
        👤 {n.trim()}
      </span>
    ));
  };

return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 bg-slate-50 dark:bg-zinc-900 min-h-screen">
      
      {/* Cabeçalho de Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-lg border hover:bg-slate-100 transition">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Prospecção Ativa de Leads Frios</h1>
            <p className="text-xs text-gray-500">Importe e gerencie planilhas sem misturar com sua carteira ativa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-sm transition">
            <Upload className="w-4 h-4" />
            Importar Planilha CSV
            <input type="file" accept=".csv" onChange={handleProcessarCsv} className="hidden" />
          </label>
          
          {selecionados.length > 0 && (
            <button onClick={() => excluirLoteOuUnico()} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition">
              <Trash2 className="w-4 h-4" />
              Excluir ({selecionados.length})
            </button>
          )}
        </div>
      </div>

      {/* Painel Unificado de Filtros (Geográficos e Segmentação) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">📍 Filtrar por UF</label>
          <input 
            type="text" 
            maxLength={2}
            value={filtroUf} 
            onChange={(e) => setFiltroUf(e.target.value.toUpperCase())} 
            placeholder="Ex: SP" 
            className="w-full p-2.5 rounded-lg border text-sm bg-slate-50/50 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">🏙️ Filtrar por Município</label>
          <input 
            type="text" 
            value={filtroMunicipio} 
            onChange={(e) => setFiltroMunicipio(e.target.value)} 
            placeholder="Ex: São Paulo" 
            className="w-full p-2.5 rounded-lg border text-sm bg-slate-50/50 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">🏡 Filtrar por Bairro</label>
          <input 
            type="text" 
            value={filtroBairro} 
            onChange={(e) => setFiltroBairro(e.target.value)} 
            placeholder="Ex: Centro" 
            className="w-full p-2.5 rounded-lg border text-sm bg-slate-50/50 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="relative" id="cnae-dropdown-container">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">🎯 Filtrar por CNAE / Nicho</label>
          
          <div 
            onClick={() => setDropdownCnaeAberto(!dropdownCnaeAberto)}
            className="w-full p-2.5 rounded-lg border text-sm bg-slate-50/50 font-medium cursor-pointer flex justify-between items-center select-none min-h-[42px] hover:border-slate-300 transition-colors"
          >
            <span className="truncate text-slate-700">
              {filtroCnaesSelecionados.length === 0 
                ? "Todos os nichos" 
                : `${filtroCnaesSelecionados.length} nicho(s) selecionado(s)`}
            </span>
            <span className="text-xs text-gray-400 transition-transform duration-200">
              {dropdownCnaeAberto ? "▲" : "▼"}
            </span>
          </div>

          {/* Caixa Dropdown Flutuante */}
            {dropdownCnaeAberto && (() => {
                // Agora busca da lista global imutável, permitindo selecionar múltiplos sem que sumam!
                const cnaesFiltrados = todosCnaesDisponiveis.filter((cnae: string) => 
                cnae.toLowerCase().includes(termoPesquisaCnae.toLowerCase())
                );

            return (
              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-fade-in w-full min-w-[280px] md:min-w-[340px]">
                <input 
                  type="text"
                  autoFocus
                  value={termoPesquisaCnae}
                  onChange={(e) => setTermoPesquisaCnae(e.target.value)}
                  placeholder="Digite para pesquisar..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-medium"
                />

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {cnaesFiltrados.length > 0 ? (
                    cnaesFiltrados.map((cnae: string) => {
                      const incluso = filtroCnaesSelecionados.includes(cnae);
                      return (
                        <label 
                          key={cnae} 
                          className="flex items-start gap-2.5 p-2 hover:bg-slate-50 cursor-pointer transition rounded-md select-none"
                        >
                          <input 
                            type="checkbox"
                            checked={incluso}
                            onChange={() => {
                              setFiltroCnaesSelecionados(prev => 
                                incluso ? prev.filter(item => item !== cnae) : [...prev, cnae]
                              );
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 cursor-pointer"
                          />
                          <span className="text-slate-700 font-medium break-words leading-tight">{cnae}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-400 py-4 italic">Nenhum segmento encontrado.</p>
                  )}
                </div>

                <div className="border-t pt-2 flex justify-between items-center bg-slate-50 -mx-2 -mb-2 p-2 rounded-b-xl">
                  <div>
                    {filtroCnaesSelecionados.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setFiltroCnaesSelecionados([])} 
                        className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase transition"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setDropdownCnaeAberto(false); setTermoPesquisaCnae(""); }} 
                    className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold uppercase transition shadow-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-700 text-xs font-bold uppercase">
              <tr>
                <th className="p-4 w-10">
                  <input type="checkbox" checked={leads.length > 0 && selecionados.length === leads.length} onChange={toggleSelecionarTodos} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="p-4">Identificação da Empresa</th>
                <th className="p-4">Quadro Societário</th>
                <th className="p-4">Localização</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" /> Carregando registros...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum lead disponível para prospecção no momento.</td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <input type="checkbox" checked={selecionados.includes(lead.id)} onChange={() => toggleLeadUnico(lead.id)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="p-4 max-w-[320px]">
                      <div className="font-bold text-slate-800 truncate">{lead.nome_fantasia || lead.razao_social}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{maskCNPJ(lead.cnpj)}</div>
                      <div className="text-[11px] text-slate-500 italic truncate mt-0.5">{lead.razao_social}</div>
                      {lead.cnae_principal && (
                        <div className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded inline-block mt-1 max-w-full truncate font-medium">
                          🎯 {lead.cnae_principal}
                        </div>
                      )}
                    </td>
                    <td className="p-4 max-w-[280px]">
                      <div className="flex flex-wrap">{renderSociosBadge(lead.nomes_socios)}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-semibold text-slate-700">{lead.municipio} - {lead.uf}</div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">{lead.bairro}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                        lead.status_prospeccao === 'nao_contatado' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {lead.status_prospeccao === 'nao_contatado' ? 'Não Contatado' : 'Em Prospecção'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => abrirTimeline(lead)} title="Timeline & Ações" className="p-1.5 hover:bg-slate-100 text-purple-600 rounded-lg transition">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button onClick={() => setLeadVisualizar(lead)} title="Visualizar Ficha" className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setLeadEditar(lead)} title="Editar Cadastro" className="p-1.5 hover:bg-slate-100 text-amber-600 rounded-lg transition">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => excluirLoteOuUnico(lead.id)} title="Remover" className="p-1.5 hover:bg-slate-100 text-red-600 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setLeadConversao(lead); setDadosConversaoCRM((prev: any) => ({...prev, nome: lead.nome_fantasia || lead.razao_social})); }} className="ml-2 px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-xs font-bold shadow-sm hover:brightness-105 transition">
                          🏆 Converter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Mapeador CSV */}
      {mostrarMapeador && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-800">Assistente de Importação Inteligente</h3>
                <p className="text-xs text-gray-400">Associe as colunas do seu arquivo com as propriedades reais do banco de dados</p>
              </div>
              <button onClick={() => setMostrarMapeador(false)} className="p-1 rounded-lg hover:bg-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 border-b pb-2 uppercase">
                <div>Campo Alvo no Sistema</div>
                <div>Coluna Correspondente no seu CSV</div>
              </div>
              {COLUNAS_BANCO.map((col) => (
                <div key={col.campo} className="grid grid-cols-2 gap-4 items-center border-b border-dashed border-slate-100 pb-2">
                  <span className="text-sm font-medium text-slate-700">{col.label}</span>
                  <select value={mapeamento[col.campo] || ""} onChange={(e) => setMapeamento(prev => ({ ...prev, [col.campo]: e.target.value }))} className="p-2 border rounded-lg text-sm bg-transparent outline-none focus:border-blue-500">
                    <option value="">-- Ignorar este Campo --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setMostrarMapeador(false)} className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-white transition">Cancelar</button>
              <button onClick={salvarImportacaoLote} disabled={loading} className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} Confirmar e Inserir Registros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Conversão Ouro */}
      {leadConversao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5"/>
                <h3 className="font-bold">Validação da Conversão para o CRM</h3>
              </div>
              <button onClick={() => setLeadConversao(null)} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <div><strong>Empresa Alvo:</strong> {leadConversao.nome_fantasia || leadConversao.razao_social}</div>
                <div><strong>CNPJ Vinculado:</strong> {maskCNPJ(leadConversao.cnpj)}</div>
                <p className="mt-1 font-medium">Os dados de endereço, telefones brutos e dados corporativos da planilha serão injetados de forma automática na tab_clientes.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome do Contato Principal (Obrigatório para CRM)</label>
                <input type="text" value={dadosConversaoCRM.nome} onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, nome: e.target.value}))} placeholder="Ex: Nome do Sócio Diretor" className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp direto</label>
                  <input type="text" value={dadosConversaoCRM.telefone_whats} onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, telefone_whats: maskPhone(e.target.value)}))} placeholder="(00) 00000-0000" className="w-full p-2.5 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">CPF (Opcional)</label>
                  <input type="text" value={dadosConversaoCRM.cpf} onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, cpf: maskCPF(e.target.value)}))} placeholder="000.000.000-00" className="w-full p-2.5 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fase Inicial Kanban</label>
                  <select value={dadosConversaoCRM.status_kanban} onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, status_kanban: e.target.value}))} className="w-full p-2.5 border rounded-lg text-sm bg-transparent">
                    <option value="novo">Novo Lead</option>
                    <option value="fase_kanban">Em Qualificação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Temperatura Comercial</label>
                  <select value={dadosConversaoCRM.temperatura} onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, temperatura: e.target.value}))} className="w-full p-2.5 border rounded-lg text-sm bg-transparent">
                    <option value="frio">Frio</option>
                    <option value="morno">Morno</option>
                    <option value="quente">Quente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setLeadConversao(null)} className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-white">Cancelar</button>
              <button onClick={processarConversaoOuroFinal} className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-105 text-white rounded-xl shadow font-bold">
                Efetivar Conversão Ouro 🏆
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Timeline */}
      {leadTimeline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-purple-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5"/>
                <div>
                  <h3 className="font-bold">Linha do Tempo de Interações</h3>
                  <p className="text-[11px] text-purple-100 font-medium">{leadTimeline.nome_fantasia || leadTimeline.razao_social}</p>
                </div>
              </div>
              <button onClick={() => setLeadTimeline(null)} className="p-1 rounded-lg hover:bg-purple-700"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-4 border-b bg-slate-50 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">O que foi conversado / Resumo do Acionamento</label>
                <textarea rows={2} value={novaAcaoObs} onChange={e => setNovaAcaoObs(e.target.value)} placeholder="Ex: Liguei para o sócio e ele pediu para retornar na próxima semana..." className="w-full p-2.5 border rounded-lg text-sm resize-none outline-none focus:border-purple-500"></textarea>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-600 uppercase">Agendar Data de Retorno:</span>
                  <input type="date" value={novaAcaoRetorno} onChange={e => setNovaAcaoRetorno(e.target.value)} className="p-1.5 border rounded-lg text-sm outline-none" />
                </div>
                <button onClick={salvarNovaAcaoAcompanhamento} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-sm">
                  <Plus className="w-3.5 h-3.5"/> Registrar Ação
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {historicoAcoes.length === 0 ? (
                <p className="text-sm text-center text-gray-400 py-6">Nenhuma ação registrada. Comece a prospecção ativa agora!</p>
              ) : (
                historicoAcoes.map((acao) => (
                  <div key={acao.id} className="relative pl-6 border-l-2 border-purple-200 pb-2">
                    <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                    <div className="flex justify-between text-xs text-gray-400 font-semibold">
                      <span>📅 {new Date(acao.criado_em).toLocaleString("pt-BR")}</span>
                      {acao.data_retorno && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                          ⏰ Retornar em: {new Date(acao.data_retorno + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">{acao.observacao}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Ficha */}
      {leadVisualizar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Ficha Cadastral do Lead</h3>
                <p className="text-xs text-gray-400">Origem: Banco de Dados de Prospecção Fria</p>
              </div>
              <button onClick={() => setLeadVisualizar(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                <strong>Segmentação / CNAE Alvo:</strong> 
                <div className="text-sm text-blue-800 font-semibold mt-0.5">{leadVisualizar.cnae_principal || 'Descrição do CNAE não mapeada ou indisponível.'}</div>
              </div>
              <div><strong>Razão Social:</strong> <div className="text-sm text-slate-700 font-medium mt-0.5">{leadVisualizar.razao_social || 'Não cadastrado'}</div></div>
              <div><strong>Nome Fantasia:</strong> <div className="text-sm text-slate-700 font-medium mt-0.5">{leadVisualizar.nome_fantasia || 'Não cadastrado'}</div></div>
              <div><strong>CNPJ:</strong> <div className="text-sm text-slate-700 font-mono mt-0.5">{maskCNPJ(leadVisualizar.cnpj)}</div></div>
              <div><strong>Telefone Comercial:</strong> <div className="text-sm text-slate-700 font-medium mt-0.5">{leadVisualizar.ddd_telefone_1 || 'Não informado'}</div></div>
              <div><strong>E-mail:</strong> <div className="text-sm text-slate-700 font-medium mt-0.5">{leadVisualizar.email || 'Não informado'}</div></div>
              <div><strong>Capital Social:</strong> <div className="text-sm text-slate-700 font-medium mt-0.5">R$ {leadVisualizar.capital_social?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>
              <div className="col-span-2 border-t pt-2 mt-2">
                <strong>Endereço Mapeado:</strong>
                <div className="text-sm text-slate-600 mt-1">
                  {leadVisualizar.logradouro}, {leadVisualizar.numero} {leadVisualizar.complemento && ` - ${leadVisualizar.complemento}`} <br/>
                  {leadVisualizar.bairro} — {leadVisualizar.municipio}/{leadVisualizar.uf} — CEP: {leadVisualizar.cep}
                </div>
              </div>
              <div className="col-span-2 border-t pt-2">
                <strong>Quadro de Sócios Vinculado:</strong>
                <div className="text-xs text-slate-600 font-mono mt-1 whitespace-pre-line">
                  {leadVisualizar.nomes_socios ? leadVisualizar.nomes_socios.split(" | ").map((n: string) => `• ${n.trim()}`).join("\n") : "Nenhum sócio identificado."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuste Manual (Editar) */}
      {leadEditar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-slate-800">Ajuste Manual de Registro</h3>
              <button onClick={() => setLeadEditar(null)} className="p-1 rounded-lg hover:bg-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição CNAE / Nicho</label>
                <input type="text" value={leadEditar.cnae_principal || ""} onChange={e => setLeadEditar({...leadEditar, cnae_principal: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome Fantasia</label>
                <input type="text" value={leadEditar.nome_fantasia || ""} onChange={e => setLeadEditar({...leadEditar, nome_fantasia: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Razão Social</label>
                <input type="text" value={leadEditar.razao_social || ""} onChange={e => setLeadEditar({...leadEditar, razao_social: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Telefone Comercial</label>
                  <input type="text" value={leadEditar.ddd_telefone_1 || ""} onChange={e => setLeadEditar({...leadEditar, ddd_telefone_1: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail</label>
                  <input type="text" value={leadEditar.email || ""} onChange={e => setLeadEditar({...leadEditar, email: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Município</label>
                  <input type="text" value={leadEditar.municipio || ""} onChange={e => setLeadEditar({...leadEditar, municipio: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">UF</label>
                  <input type="text" maxLength={2} value={leadEditar.uf || ""} onChange={e => setLeadEditar({...leadEditar, uf: e.target.value.toUpperCase()})} className="w-full p-2 border rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setLeadEditar(null)} className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-white">Cancelar</button>
              <button onClick={async () => {
                const { error } = await supabase.from("tab_clientes_frios").update(leadEditar).eq("id", leadEditar.id);
                if (!error) { toast.success("Registro salvo!"); setLeadEditar(null); buscarLeadsFrios(); }
              }} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}