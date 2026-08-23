import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Calendar, CheckCircle2, Loader2,
  Upload, Trash2, MapPin, Edit3, Check, Plus, X, MessageSquare, Clock, Printer, Search, TrendingUp
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../auth/AuthContext";
import { maskCPF, maskCNPJ, maskPhone } from "../../../utils/masks";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import RelatorioProdutividadeModal from "./RelatorioProdutividadeModal"; // Ajuste o caminho se necessário

// Lista de colunas fixas mapeáveis do banco de dados destino (Removido duplicados)
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
  { campo: "logradouro", label: "Logradouro / Rua" },
  { campo: "numero", label: "Número" },
  { campo: "complemento", label: "Complemento" },
  { campo: "email", label: "E-mail Corporativo" },
  { campo: "telefone_adicional", label: "Telefone Secundário" },
  { campo: "nomes_socios", label: "Nome dos Sócios" },
  { campo: "cpfs_socios", label: "CPF dos Sócios" },
  { campo: "faixas_etarias", label: "Faixa Etária dos Sócios" },
  { campo: "data_abertura", label: "Data de Abertura" },
];

export default function LeadsProspeccao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  
  // Estados de Dados Principais
  const [leads, setLeads] = useState<any[]>([]);
  const [todosCnaesDisponiveis, setTodosCnaesDisponiveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Estados paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(25);

   // Estados rotas
  const [pontoPartida, setPontoPartida] = useState("");

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
  const [pesquisaGeral, setPesquisaGeral] = useState("");
  const [pesquisaGeralDebounced, setPesquisaGeralDebounced] = useState("");

  // 🎯 NOVOS ESTADOS DOS FILTROS AVANÇADOS
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPorte, setFiltroPorte] = useState("");
  const [filtroMei, setFiltroMei] = useState(""); 
  const [filtroSimples, setFiltroSimples] = useState("");
  const [filtroMatriz, setFiltroMatriz] = useState("");
  const [filtroCapitalMin, setFiltroCapitalMin] = useState("");
  const [filtroCapitalMax, setFiltroCapitalMax] = useState("");
  const [filtroCep, setFiltroCep] = useState("");
  const [filtroSituacaoCadastral, setFiltroSituacaoCadastral] = useState("");
  const [filtroDataAberturaMin, setFiltroDataAberturaMin] = useState("");
  const [filtroDataAberturaMax, setFiltroDataAberturaMax] = useState("");

  // 🎯 NOVOS ESTADOS DOS FILTROS ETÁRIOS
  const [todasFaixasEtarias, setTodasFaixasEtarias] = useState<any[]>([]);
  const [filtroFaixasSelecionadas, setFiltroFaixasSelecionadas] = useState<string[]>([]);
  const [pesquisaFaixaEtaria, setPesquisaFaixaEtaria] = useState("");
  const [dropdownFaixaAberto, setDropdownFaixaAberto] = useState(false);

  // Estados dos Modais Modulares e Timeline
  const [leadVisualizar, setLeadVisualizar] = useState<any>(null);
  const [leadEditar, setLeadEditar] = useState<any>(null);
  const [leadTimeline, setLeadTimeline] = useState<any>(null);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);

  // 🔍 ESTADOS EXCLUSIVOS DO MOTOR DE BUSCA DO GOOGLE (SERPAPI)
  const [higienizandoLote, setHigienizandoLote] = useState(false);
  const [leadIdEmProcessamento, setLeadIdEmProcessamento] = useState<string | null>(null);

  // FILTROS DE PRECISÃO DO GOOGLE
  const [filtroGoogleStatus, setFiltroGoogleStatus] = useState<string[]>([]);
  const [filtroGoogleScoreMin, setFiltroGoogleScoreMin] = useState("");

  // Estados unificados da Linha do Tempo / Nova Ação
  const [faseAtendimento, setFaseAtendimento] = useState<string>("nao_contatado");
  const [temperatura, setTemperatura] = useState<string>("frio");
  const [resultadoAcao, setResultadoAcao] = useState("em_prospeccao"); // Status prospecção

  // 1) O que fiz na ação & 1.1) O que aconteceu
  const [tipoAcaoRealizada, setTipoAcaoRealizada] = useState<string>("ligar");
  const [desfechoAcaoRealizada, setDesfechoAcaoRealizada] = useState<string>("atendeu");
  const [novaAcaoObs, setNovaAcaoObs] = useState("");

  // 2) Próximo Contato & Data/Hora de retorno
  const [proximaAcao, setProximaAcao] = useState<string[]>([]);
  const [novaAcaoRetorno, setNovaAcaoRetorno] = useState("");
  const [novaAcaoHorarioRetorno, setNovaAcaoHorarioRetorno] = useState("");

  // 🎯 ESTADOS DE FILTROS DE CRM E PROSPECÇÃO
  const [filtroFaseAtendimento, setFiltroFaseAtendimento] = useState("");
  const [filtroTemperatura, setFiltroTemperatura] = useState("");
  const [filtroProximaAcao, setFiltroProximaAcao] = useState("");

  // controle para abrir/fechar o modal:
  const [mostrarModalRelatorio, setMostrarModalRelatorio] = useState(false);

  // Contatos Adicionais (JSONB)
  const [contatosAdicionais, setContatosAdicionais] = useState<Array<{
    id: string;
    nome: string;
    cargo_relacao: string;
    telefone: string;
    email: string;
  }>>([]);

  // Função 1: Validação Individual de um Lead no Google
  const validarLeadGoogleIndividual = async (leadId: string) => {
    try {
      const leadAtual = leads.find((l: any) => l.id === leadId);
      
      const nomeEmpresa = leadAtual?.nome_empresa || leadAtual?.razao_social || '';
      const cidadeEmpresa = leadAtual?.cidade || '';
      const queryBusca = `${nomeEmpresa} ${cidadeEmpresa}`.trim();

      if (!queryBusca) {
        toast.error("Este lead não possui Nome ou Cidade cadastrados para busca.");
        return;
      }

      setLeadIdEmProcessamento(leadId);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serpapi-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY 
        },
        body: JSON.stringify({ 
          leadId, 
          query: queryBusca,
          nome: leadAtual?.nome_fantasia || leadAtual?.razao_social, 
          cidade: leadAtual?.municipio                       // Adicione isso
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        toast.success("Lead atualizado via Google Maps!");
        buscarLeadsFrios(); 
      } else {
        toast.error(resultado.error || "Erro na validação.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao conectar com o validador.");
    } finally {
      setLeadIdEmProcessamento(null);
    }
  };

  // Função 2: Validação Controlada em Lote (Processa os itens marcados no Checkbox)
  const validarLeadsGoogleEmLote = async () => {
    if (selecionados.length === 0) {
      toast.warning("Selecione ao menos um lead na tabela para higienizar.");
      return;
    }

    if (!window.confirm(`Deseja iniciar a validação automatizada no Google para os ${selecionados.length} leads selecionados?`)) {
      return;
    }

    setHigienizandoLote(true);
    let processadosComSucesso = 0;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl) {
        throw new Error("A variável VITE_SUPABASE_URL não está configurada no front-end.");
      }

      for (const id of selecionados) {
        const leadAlvo = leads.find((l: any) => l.id === id);
        if (leadAlvo) {
          setLeadIdEmProcessamento(id);
          
          // 🎯 BLINDAGEM CONTRA VALORES NUMÉRICOS OU NULOS NAS STRINGS NO LOTE
          const nomeParaBusca = String(leadAlvo.nome_fantasia || leadAlvo.razao_social || '').trim();
          const enderecoParaBusca = `${leadAlvo.logradouro || ""} ${leadAlvo.numero || ""} ${leadAlvo.bairro || ""} ${leadAlvo.municipio || ""} ${leadAlvo.uf || ""}`;
          const queryCompleta = String(`${nomeParaBusca} ${enderecoParaBusca}`).replace(/\s+/g, " ").trim();

          if (!queryCompleta) continue;

          try {
            const leadEncontrado = leads.find((l: any) => l.id === id);
            const response = await fetch(`${supabaseUrl}/functions/v1/serpapi-search`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
              },
              body: JSON.stringify({ 
                leadId: id, 
                query: queryCompleta,
                // Troque 'leads' por 'lead' (ou 'leadAtual', dependendo de como a variável se chama aí)
                nome: leadEncontrado?.nome_fantasia || leadEncontrado?.razao_social,
                cidade: leadEncontrado?.municipio
              }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              processadosComSucesso++;
              setLeads((prev: any[]) =>
                prev.map((l: any) =>
                  l.id === id
                    ? { ...l, google_verificado: true, google_status: data.google_status, google_place_id: data.google_place_id }
                    : l
                )
              );
            }
          } catch (e) {
            console.error(`Erro ao processar o ID ${id} no lote:`, e);
          }
        }
      }

      toast.success(`Higienização concluída! ${processadosComSucesso} de ${selecionados.length} leads atualizados.`);
      setSelecionados([]); 

    } catch (err: any) {
      toast.error("Erro durante o processamento em lote: " + err.message);
    } finally {
      setHigienizandoLote(false);
      setLeadIdEmProcessamento(null);
    }
  };
  
  // Estado do Botão de Ouro (Conversor Realtime)
  const [leadConversao, setLeadConversao] = useState<any>(null);
  const [dadosConversaoCRM, setDadosConversaoCRM] = useState<any>({
    origem_cliente: "Prospecção Ativa",
    status_kanban: "novo",
    temperatura: "frio",
    nome: "",
    cpf: "",
    telefone_whats: "",
    data_nascimento: ""
  });

  // Filtro de datas
  const [filtroDataRetornoMin, setFiltroDataRetornoMin] = useState("");
  const [filtroDataRetornoMax, setFiltroDataRetornoMax] = useState("");

  // Botão retração
  const [painelExpandido, setPainelExpandido] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPesquisaGeralDebounced(pesquisaGeral);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [pesquisaGeral]);

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

  // 🎯 OTIMIZADO: Removida a monitoria dos filtros individuais aqui para evitar requisição dupla na mudança de página
  useEffect(() => {
    if (perfilUsuario) {
      buscarLeadsFrios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilUsuario, paginaAtual, pesquisaGeralDebounced, itensPorPagina]);

  // 🎯 CORRIGIDO: Este efeito agora gerencia com exclusividade o reset e o re-fetch imediato de filtros
  useEffect(() => {
    if (paginaAtual !== 1) {
      setPaginaAtual(1);
    } else if (perfilUsuario) {
      buscarLeadsFrios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUf, filtroMunicipio, filtroBairro, 
      filtroCnaesSelecionados, filtroStatus, filtroPorte, filtroMei, 
      filtroSimples, filtroMatriz, filtroCapitalMin, filtroCapitalMax, 
      filtroDataRetornoMin, filtroDataRetornoMax, filtroCep, 
      filtroSituacaoCadastral, filtroDataAberturaMin, filtroDataAberturaMax,
      filtroGoogleStatus, filtroGoogleScoreMin, filtroFaixasSelecionadas,
      filtroFaseAtendimento, filtroTemperatura, filtroProximaAcao]);

  // useEffect Definitivo: Abre o modal por ID local ou buscando diretamente no Supabase
  useEffect(() => {
    if (!perfilUsuario) return;

    const urlParams = new URLSearchParams(window.location.search);
    const leadIdDaUrl = urlParams.get('leadId');

    if (leadIdDaUrl) {
      const leadLocal = leads.find((l) => l.id === leadIdDaUrl);

      if (leadLocal) {
        abrirTimeline(leadLocal);
        window.history.replaceState({}, document.title, window.location.pathname);
      } 
      else if (!loading && leads.length > 0) {
        (async () => {
          try {
            const { data: leadDoBanco, error } = await supabase
              .from("tab_clientes_frios")
              .select("*")
              .eq("id", leadIdDaUrl)
              .eq("corretora_id", perfilUsuario.corretora_id)
              .single();

            if (error) throw error;

            if (leadDoBanco) {
              abrirTimeline(leadDoBanco);
            } else {
              toast.error("Lead da notificação não foi localizado.");
            }
          } catch (err) {
            console.error("Erro ao buscar lead da URL:", err);
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })();
      }
    }
  }, [leads, loading, perfilUsuario]);
  
  // Leitura de Dados Básica e Filtros Inteligentes com Paginação Profissional

  async function buscarLeadsFrios() {
  if (!perfilUsuario) return;
  setLoading(true);

  try {
    const de = (paginaAtual - 1) * itensPorPagina;
    const ate = de + itensPorPagina - 1;

    // 1. QUERY PRINCIPAL UNIFICADA (Paginação + Dados)
    let query = supabase
      .from("tab_clientes_frios")
      .select("*", { count: "exact" })
      .eq("corretora_id", perfilUsuario.corretora_id);

    // Tratamento de Pesquisa Geral
    const termoGeral = pesquisaGeralDebounced?.trim();
    if (termoGeral) {
      query = query.or(
        `razao_social.ilike.%${termoGeral}%,nome_fantasia.ilike.%${termoGeral}%,cnpj.ilike.%${termoGeral}%,nomes_socios.ilike.%${termoGeral}%`
      );
    }

    // Status de Prospecção
    if (filtroStatus) {
      query = query.eq("status_prospeccao", filtroStatus);
    } else if (!termoGeral) {
      query = query.neq("status_prospeccao", "convertido");
    }

    // Regra de perfil Corretor
    if (perfilUsuario.tipo_usuario === "CORRETOR") {
      query = query.eq("corretor_id", perfilUsuario.id);
    }

    // Filtros Geográficos e Cadastrais
    if (filtroUf) query = query.ilike("uf", `%${filtroUf.trim()}%`);
    if (filtroMunicipio) query = query.ilike("municipio", `%${filtroMunicipio.trim()}%`);
    if (filtroBairro) query = query.ilike("bairro", `%${filtroBairro.trim()}%`);
    if (filtroCep) query = query.ilike("cep", `%${filtroCep.replace(/\D/g, '')}%`);
    if (filtroSituacaoCadastral) query = query.eq("situacao_cadastral", filtroSituacaoCadastral);
    
    if (filtroCnaesSelecionados.length > 0) {
      query = query.in("cnae_principal", filtroCnaesSelecionados);
    }

    if (filtroPorte) query = query.eq("porte", filtroPorte);
    if (filtroMei !== "") query = query.eq("opcao_pelo_mei", filtroMei === "true");
    if (filtroSimples !== "") query = query.eq("opcao_pelo_simples", filtroSimples === "true");
    if (filtroMatriz) query = query.eq("descricao_identificador_matriz_filial", filtroMatriz);

    if (filtroCapitalMin) query = query.gte("capital_social", Number(filtroCapitalMin));
    if (filtroCapitalMax) query = query.lte("capital_social", Number(filtroCapitalMax));

    if (filtroDataAberturaMin) query = query.gte("data_abertura", filtroDataAberturaMin);
    if (filtroDataAberturaMax) query = query.lte("data_abertura", filtroDataAberturaMax);

    if (filtroDataRetornoMin) query = query.gte("data_retorno", filtroDataRetornoMin);
    if (filtroDataRetornoMax) query = query.lte("data_retorno", filtroDataRetornoMax);

    // 🎯 ADICIONADOS: NOVOS FILTROS DE CRM E PROSPECÇÃO NA QUERY
    if (filtroFaseAtendimento) {
      query = query.eq("fase_atendimento", filtroFaseAtendimento);
    }
    if (filtroTemperatura) {
      query = query.eq("temperatura", filtroTemperatura);
    }
    // 🎯 FILTRAGEM CORRIGIDA DA PRÓXIMA AÇÃO
    if (filtroProximaAcao) {
      // Como 'proxima_acao' é um array no banco (ex: ["visitar"]), usamos .contains()
      query = query.contains("proxima_acao", [filtroProximaAcao]);
    }

    // Filtro Faixas Etárias
    if (filtroFaixasSelecionadas.length > 0) {
      const filtrosFaixa = filtroFaixasSelecionadas
        .map(f => `faixas_etarias.ilike.%${f}%`)
        .join(",");
      query = query.or(filtrosFaixa);
    }

    // Filtros Google Maps
    if (filtroGoogleStatus && filtroGoogleStatus.length > 0) {
      query = query.in('google_status', filtroGoogleStatus);
    }
    if (filtroGoogleScoreMin !== "") {
      query = query.gte('google_score', parseInt(filtroGoogleScoreMin, 10));
    }

    // Executa paginação e ordenação principal
    const { data, error, count } = await query
      .order("importado_em", { ascending: false })
      .range(de, ate);

    if (error) throw error;

    setLeads(data || []);
    setTotalRegistros(count || 0);
    
    // 2. BUSCAS SECUNDÁRIAS DE CONTAGEM OTIMIZADAS (ÚNICA REQUISIÇÃO)
    try {
      let baseFiltroContagem = supabase
        .from("tab_clientes_frios")
        .select("cnae_principal, faixas_etarias")
        .eq("corretora_id", perfilUsuario.corretora_id);

      if (filtroStatus) {
        baseFiltroContagem = baseFiltroContagem.eq("status_prospeccao", filtroStatus);
      } else if (!termoGeral) {
        baseFiltroContagem = baseFiltroContagem.neq("status_prospeccao", "convertido");
      }

      if (perfilUsuario.tipo_usuario === "CORRETOR") {
        baseFiltroContagem = baseFiltroContagem.eq("corretor_id", perfilUsuario.id);
      }

      const { data: dadosContagem, error: erroContagem } = await baseFiltroContagem;

      if (erroContagem) throw erroContagem;

      if (dadosContagem) {
        const contagemCnae: { [key: string]: number } = {};
        const contagemFaixas: { [key: string]: number } = {};

        dadosContagem.forEach((item: any) => {
          const cnaeNome = item.cnae_principal?.trim();
          if (cnaeNome) {
            contagemCnae[cnaeNome] = (contagemCnae[cnaeNome] || 0) + 1;
          }

          if (item.faixas_etarias) {
            const faixasUnicasNaEmpresa = new Set<string>(
              item.faixas_etarias.split(" | ").map((f: string) => f.trim())
            );

            faixasUnicasNaEmpresa.forEach((faixa: string) => {
              contagemFaixas[faixa] = (contagemFaixas[faixa] || 0) + 1;
            });
          }
        });

        setTodosCnaesDisponiveis(
          Object.entries(contagemCnae)
            .map(([cnae, quantidade]) => ({ cnae, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade)
        );

        setTodasFaixasEtarias(
          Object.entries(contagemFaixas)
            .map(([faixa, quantidade]) => ({ faixa, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade)
        );
      }
    } catch (errContagem) {
      console.error("Erro ao calcular metadados dos filtros:", errContagem);
    }

  } catch (err: any) {
    toast.error("Erro ao buscar registros: " + err.message);
  } finally {
    setLoading(false);
  }
}

// Processamento de Upload e Leitura do Cabeçalho CSV (Blindado contra aspas e delimitadores)
  const handleProcessarCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const delimitador = lines[0].includes(";") ? ";" : ",";
      
      // Função auxiliar interna robusta para fazer o parse da linha respeitando aspas
      const extrairCamposCsv = (linha: string, delim: string) => {
        const resultado = [];
        let dentroDeAspas = false;
        let campoAtual = "";

        for (let i = 0; i < linha.length; i++) {
          const char = linha[i];
          if (char === '"') {
            dentroDeAspas = !dentroDeAspas;
          } else if (char === delim && !dentroDeAspas) {
            resultado.push(campoAtual.trim().replace(/^["']|["']$/g, "").trim());
            campoAtual = "";
          } else {
            campoAtual += char;
          }
        }
        resultado.push(campoAtual.trim().replace(/^["']|["']$/g, "").trim());
        return resultado;
      };

      const headers = extrairCamposCsv(lines[0], delimitador);
      const rows = lines.slice(1).map(line => extrairCamposCsv(line, delimitador));

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
          corretora_id: perfilUsuario?.corretora_id,
          corretor_id: perfilUsuario?.tipo_usuario === "CORRETOR" ? perfilUsuario.id : null,
          status_prospeccao: "nao_contatado"
        };

        COLUNAS_BANCO.forEach(col => {
          const colunaCsvEscolhida = mapeamento[col.campo];
          if (colunaCsvEscolhida) {
            const index = csvHeaders.indexOf(colunaCsvEscolhida);
            if (index !== -1) {
              const valor = row[index]?.trim(); 

              if (col.campo === "capital_social") {
                item[col.campo] = valor ? parseFloat(valor.replace(/[^0-9.-]/g, "")) || 0 : 0;
              } else if (col.campo === "opcao_pelo_mei" || col.campo === "opcao_pelo_simples") {
                item[col.campo] = valor?.toUpperCase() === "S" || valor?.toUpperCase() === "SIM" || valor === "true";
              } else if (col.campo === "cep") {
                item[col.campo] = valor ? valor.replace(/\D/g, "") : null;
              } else if (col.campo === "numero") {
                item[col.campo] = valor ? String(valor) : null;
              } else if (col.campo === "data_abertura") {
                if (valor && valor.includes("/")) {
                  const [dia, mes, ano] = valor.split("/");
                  item[col.campo] = `${ano}-${mes}-${dia}`;
                } else {
                  item[col.campo] = valor || null;
                }
              } else {
                item[col.campo] = valor || null;
              }
            }
          }
        });
        return item;
      }).filter(r => r.cnpj);

      if (registrosTratados.length === 0) {
        toast.warning("Nenhum registro válido com CNPJ encontrado para importação.");
        return;
      }

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

  // Gerenciador do Multiselect "Próxima Ação"
  const toggleProximaAcao = (opcao: string) => {
    setProximaAcao(prev =>
      prev.includes(opcao) ? prev.filter(item => item !== opcao) : [...prev, opcao]
    );
  };

  // Manipulação do JSONB de Contatos Adicionais
  const adicionarContato = () => {
    setContatosAdicionais(prev => [
      ...prev,
      { id: crypto.randomUUID(), nome: "", cargo_relacao: "", telefone: "", email: "" }
    ]);
  };

  const atualizarContato = (id: string, campo: string, valor: string) => {
    setContatosAdicionais(prev =>
      prev.map(c => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  };

  const removerContato = (id: string) => {
    setContatosAdicionais(prev => prev.filter(c => c.id !== id));
  };

  
  // Abertura do Modal e carga dos dados existentes
  const abrirTimeline = async (lead: any) => {
    setLeadTimeline(lead);
    setNovaAcaoObs("");
    setNovaAcaoRetorno(lead.data_retorno || "");
    setNovaAcaoHorarioRetorno(lead.horario_retorno || "");
    
    // Carrega os dados mais recentes salvos no lead
    setFaseAtendimento(lead.fase_atendimento || "nao_contatado");
    setTemperatura(lead.temperatura || "frio");
    setResultadoAcao(lead.status_prospeccao || "em_prospeccao");
    setContatosAdicionais(lead.contatos_adicionais || []);
    setProximaAcao(lead.proxima_acao || []);

    try {
      const { data, error } = await supabase
        .from("tab_clientes_frios_acoes")
        .select("*")
        .eq("cliente_frio_id", lead.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setHistoricoAcoes(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar histórico:", err);
    }
  };

// Função de Salvar Interação e Atualizar Lead
const salvarNovaAcaoAcompanhamento = async () => {
  try {
    let novoStatus = resultadoAcao;
    if (faseAtendimento === "vendido") novoStatus = "ja_cliente";
    if (faseAtendimento === "perdido") novoStatus = "perdido";

    // Mantém a data e horário preenchidos sempre que informados
    const dataRetornoFinal = novaAcaoRetorno || null;
    const horarioRetornoFinal = novaAcaoHorarioRetorno || null;

    // 1. Registra o histórico da ação com tipo e desfecho
    const { error: errorAcao } = await supabase
      .from("tab_clientes_frios_acoes")
      .insert({
        cliente_frio_id: leadTimeline.id,
        corretor_id: perfilUsuario?.id,
        tipo_acao: tipoAcaoRealizada,
        desfecho: desfechoAcaoRealizada,
        observacao: novaAcaoObs.trim() || null
      });

    if (errorAcao) throw errorAcao;

    // 2. Atualiza os dados consolidados do lead na tabela principal
    const payloadUpdate = {
      status_prospeccao: novoStatus,
      fase_atendimento: faseAtendimento,
      temperatura: temperatura,
      proxima_acao: proximaAcao,
      contatos_adicionais: contatosAdicionais,
      data_retorno: dataRetornoFinal,
      horario_retorno: horarioRetornoFinal
    };

    const { error: errorUpdate } = await supabase
      .from("tab_clientes_frios")
      .update(payloadUpdate)
      .eq("id", leadTimeline.id);

    if (errorUpdate) throw errorUpdate;

    toast.success("Ação registrada com sucesso!");

    setNovaAcaoObs("");

    const leadAtualizado = { ...leadTimeline, ...payloadUpdate };
    abrirTimeline(leadAtualizado);
    if (typeof buscarLeadsFrios === "function") buscarLeadsFrios();
  } catch (err: any) {
    toast.error("Falha ao salvar ação: " + err.message);
  }
};

  // 🏅 O Botão de Ouro: Motor de Conversão Direta para a Tab_Clientes CRM
  // 🏆 Inicializa os dados para a modal de conversão com mapeamento automático De/Para
const prepararConversaoLead = (lead: any) => {
  setLeadConversao(lead);
  
  setDadosConversaoCRM((prev: any) => ({
    ...prev,
    tipo_cliente: "PJ",
    corretora_id: lead.corretora_id || perfilUsuario?.corretora_id,
    corretor_id: lead.corretor_id || perfilUsuario?.id,
    origem_cliente: "Prospecção Ativa",
    
    // Dados Cadastrais PJ (De/Para direto)
    cnpj: lead.cnpj || "",
    razao_social: lead.razao_social || "",
    nome_fantasia: lead.nome_fantasia || "",
    porte: lead.porte || "",
    capital_social: lead.capital_social || 0,
    cnae_principal: lead.cnae_principal || "",
    natureza_juridica: lead.natureza_juridica || "",
    opcao_pelo_mei: lead.opcao_pelo_mei || false,
    opcao_pelo_simples: lead.opcao_pelo_simples || false,
    
    // Contatos e Endereço
    ddd_telefone_1: lead.ddd_telefone_1 || "",
    telefone_adicional: lead.telefone_adicional || "",
    email: lead.email || "",
    cep: lead.cep || "",
    uf: lead.uf || "",
    municipio: lead.municipio || "",
    bairro: lead.bairro || "",
    logradouro: lead.logradouro || "",
    numero: lead.numero || "",
    complemento: lead.complemento || "",
    
    // Metadados e Datas
    data_abertura: lead.data_abertura || null,
    situacao_cadastral: lead.situacao_cadastral || null,
    
    // Configurações do CRM
    status_kanban: "novo", 
    fase_kanban: "lead",
    temperatura: "morno",
  }));
};

// 🚀 Motor de Execução Final da Conversão Blindado contra Tipos e Strings "NULL"
const processarConversaoOuroFinal = async () => {
  try {
    if (!leadConversao) return;

    // 1. Validação prévia de duplicidade na tabela de destino
    const { data: existente } = await supabase
      .from("tab_clientes")
      .select("id")
      .eq("cnpj", leadConversao.cnpj)
      .eq("corretora_id", perfilUsuario?.corretora_id)
      .maybeSingle();

    if (existente) {
      toast.error("Este CNPJ já possui cadastro ativo no seu CRM!");
      return;
    }

    // Função auxiliar rigorosa para limpar strings "NULL" ou vazias
    const limparValor = (val: any) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string' && (val.trim() === "" || val.trim().toUpperCase() === "NULL")) return null;
      return val;
    };

    // 2. Processamento seguro do quadro societário (ignorando "NULL" textual)
    let sociosJson: Array<{ nome: string; cpf: string }> = [];
    const nomesLimpos = limparValor(leadConversao.nomes_socios);
    
    if (nomesLimpos && typeof nomesLimpos === 'string') {
      const nomesArray = nomesLimpos.split(" | ");
      const cpfsLimpos = limparValor(leadConversao.cpfs_socios);
      const cpfsArray = cpfsLimpos ? cpfsLimpos.split(" | ") : [];
      
      sociosJson = nomesArray.map((nome: string, index: number) => ({
        nome: nome.trim(),
        cpf: cpfsArray[index] ? cpfsArray[index].trim() : ""
      }));
    }

    // 3. Conversão segura do Capital Social para número real (evitando erro de tipo numeric)
    const capitalSocialTratado = leadConversao.capital_social 
      ? Number(String(leadConversao.capital_social).replace(',', '.')) 
      : 0;

    // 4. Payload com tratamento absoluto para cada campo
    const crmPayload = {
      tipo_cliente: "PJ",
      corretora_id: perfilUsuario?.corretora_id,
      corretor_id: leadConversao.corretor_id || perfilUsuario?.id,
      origem_cliente: dadosConversaoCRM.origem_cliente || "Prospecção Ativa",
      
      // Identificação e Dados PJ
      cnpj: leadConversao.cnpj,
      razao_social: limparValor(leadConversao.razao_social),
      nome_fantasia: limparValor(leadConversao.nome_fantasia),
      porte: limparValor(leadConversao.porte),
      capital_social: isNaN(capitalSocialTratado) ? 0 : capitalSocialTratado,
      cnae_principal: limparValor(leadConversao.cnae_principal),
      natureza_juridica: limparValor(leadConversao.natureza_juridica),
      descricao_identificador_matriz_filial: limparValor(leadConversao.descricao_identificador_matriz_filial),
      opcao_pelo_mei: leadConversao.opcao_pelo_mei ?? false,
      opcao_pelo_simples: leadConversao.opcao_pelo_simples ?? false,
      
      // Contatos
      ddd_telefone_1: limparValor(leadConversao.ddd_telefone_1),
      telefone_adicional: limparValor(leadConversao.telefone_adicional),
      email: limparValor(leadConversao.email),
      
      // Endereço
      cep: limparValor(leadConversao.cep),
      uf: limparValor(leadConversao.uf),
      municipio: limparValor(leadConversao.municipio),
      bairro: limparValor(leadConversao.bairro),
      logradouro: limparValor(leadConversao.logradouro),
      numero: limparValor(leadConversao.numero),
      complemento: limparValor(leadConversao.complemento),
      
      // Datas e Cadastros
      data_abertura: limparValor(leadConversao.data_abertura),
      situacao_cadastral: limparValor(leadConversao.situacao_cadastral),
      
      // Dados do Contato Principal (Inputs da Modal)
      nome: limparValor(dadosConversaoCRM.nome),
      cpf: limparValor(dadosConversaoCRM.cpf),
      telefone_whats: limparValor(dadosConversaoCRM.telefone_whats),
      data_nascimento: limparValor(dadosConversaoCRM.data_nascimento),
      
      // Controle do Kanban e CRM
      status_kanban: dadosConversaoCRM.status_kanban || "novo",
      fase_kanban: "lead",
      posicao_kanban: 0,
      temperatura: dadosConversaoCRM.temperatura || "morno",
      
      // Quadro Societário Formatado
      socios: sociosJson
    };

    // 5. Inserção na tabela destino exigindo retorno explícito
    const { data: insertedData, error: insertErr } = await supabase
      .from("tab_clientes")
      .insert([crmPayload])
      .select();
    
    if (insertErr) {
      console.error("❌ Erro detalhado do Supabase no Insert:", insertErr);
      throw new Error(insertErr.message);
    }

    if (!insertedData || insertedData.length === 0) {
      throw new Error("A inserção falhou silenciosamente no banco de dados.");
    }

    // 6. Atualização do status na origem para convertido somente após sucesso real
    const { error: updateErr } = await supabase
      .from("tab_clientes_frios")
      .update({ status_prospeccao: "convertido" })
      .eq("id", leadConversao.id);

    if (updateErr) {
      console.error("Erro ao atualizar status na origem:", updateErr);
    }

    toast.success("✨ Processo concluído! Lead convertido para o CRM com sucesso.");
    
    setLeadConversao(null);
    setDadosConversaoCRM({ 
      origem_cliente: "Prospecção Ativa", 
      status_kanban: "novo", 
      temperatura: "morno", 
      nome: "", 
      cpf: "", 
      telefone_whats: "",
      data_nascimento: ""
    });
    
    buscarLeadsFrios();
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("🚨 Falha crítica na conversão:", err);
    toast.error("Erro na conversão: " + errorMessage);
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

  const exportarRotaWhatsApp = () => {
    if (selecionados.length === 0) {
      toast.error("Selecione pelo menos 1 lead para exportar a rota.");
      return;
    }

    const leadsParaRota = leads.filter(l => selecionados.includes(l.id));
    let leadsOrdenados = [...leadsParaRota];

    if (pontoPartida.startsWith("GPS:")) {
      const [_, latPartida, lngPartida] = pontoPartida.split(":");
      const lat1 = parseFloat(latPartida);
      const lng1 = parseFloat(lngPartida);

      leadsOrdenados.sort((a, b) => {
        const latA = parseFloat(a.latitude) || 0;
        const lngA = parseFloat(a.longitude) || 0;
        const latB = parseFloat(b.latitude) || 0;
        const lngB = parseFloat(b.longitude) || 0;

        if (!latA && !latB) return 0;
        if (!latA) return 1;
        if (!latB) return -1;

        const distA = Math.sqrt(Math.pow(latA - lat1, 2) + Math.pow(lngA - lng1, 2));
        const distB = Math.sqrt(Math.pow(latB - lat1, 2) + Math.pow(lngB - lng1, 2));
        return distA - distB;
      });
    } else if (pontoPartida.trim()) {
      const termoPartida = pontoPartida.toLowerCase();
      leadsOrdenados.sort((a, b) => {
        const muniA = (a.municipio || "").toLowerCase();
        const bairroA = (a.bairro || "").toLowerCase();
        const muniB = (b.municipio || "").toLowerCase();
        const bairroB = (b.bairro || "").toLowerCase();

        const pesoA = (termoPartida.includes(muniA) ? 2 : 0) + (termoPartida.includes(bairroA) ? 3 : 0);
        const pesoB = (termoPartida.includes(muniB) ? 2 : 0) + (termoPartida.includes(bairroB) ? 3 : 0);

        return pesoB - pesoA;
      });
    }

    const bairrosAgrupados = agruparPorBairro(leadsOrdenados);

    let textoMensagem = `📍 *ROTA DE VISITAS ENCONTRADA*\n\n`;
    
    if (pontoPartida.trim()) {
      textoMensagem += `🚗 *Ponto de Partida:* ${pontoPartida.startsWith("GPS:") ? "Minha Localização Atual (GPS)" : pontoPartida}\n`;
    }
    
    textoMensagem += `=========================\n\n`;

    let contadorGlobal = 1;

    Object.entries(bairrosAgrupados).forEach(([bairro, leadsDoBairro]: [string, any]) => {
      textoMensagem += `📌 *BAIRRO: ${bairro.toUpperCase()}* (${leadsDoBairro.length} ${leadsDoBairro.length === 1 ? 'empresa' : 'empresas'})\n`;
      textoMensagem += `-------------------------\n\n`;

      leadsDoBairro.forEach((lead: any) => {
        const enderecoCompleto = `${lead.logradouro || ""}, ${lead.numero || ""} ${lead.complemento ? "- " + lead.complemento : ""} - ${lead.bairro || ""}, ${lead.municipio || ""} - ${lead.uf || ""}`.replace(/, ,/g, "").trim();
        
        // 🎯 CORRIGIDO: Injetado o caractere '$' ausente para o template string funcionar perfeitamente
        const linkGoogleMaps = lead.google_place_id 
          ? `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(enderecoCompleto)}&query_place_id=${lead.google_place_id}`
          : `https://maps.google.com/?q=$${encodeURIComponent(enderecoCompleto)}`;
        
        const telWhatsTratado = lead.ddd_telefone_1 ? String(lead.ddd_telefone_1).replace(/^0/, '') : "";
        const telefoneFormatado = telWhatsTratado ? maskPhone(telWhatsTratado) : "Não informado";
        const textoSociosOriginal = lead.nomes_socios ? lead.nomes_socios.replace(/ \| /g, ', ') : "Não informados";

        const tagGoogle = lead.google_verificado 
        ? ` (${getStatusLabel(lead.google_status)}${lead.google_score ? ` - ${lead.google_score}%` : ''})`
        : '';

        textoMensagem += `🏢 *${contadorGlobal}. ${lead.nome_fantasia || lead.razao_social || "Empresa sem Nome"}*${tagGoogle}\n`;
        textoMensagem += `👥 *Sócios:* ${textoSociosOriginal}\n`;
        textoMensagem += `🗺️ *Endereço:* ${enderecoCompleto || "Não cadastrado"}\n`;
        textoMensagem += `📞 *Telefone:* ${telefoneFormatado}\n`;
        
        if (enderecoCompleto) {
          textoMensagem += `🔗 *Navegar por GPS:* ${linkGoogleMaps}\n`;
        }
        
        textoMensagem += `\n`;
        contadorGlobal++;
      });

      textoMensagem += `=========================\n\n`;
    });

    textoMensagem += `_Boas vendas! Gerado pelo CRM._ 🚀`;

    const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(textoMensagem)}`;
    window.open(urlWhatsApp, "_blank");
  };

  const capturarLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }

    toast.info("Obtendo localização do GPS...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPontoPartida(`GPS:${latitude}:${longitude}`);
        toast.success("📍 Localização atual definida com sucesso!");
      },
      () => {
        toast.error("Não foi possível obter sua localização. Verifique as permissões do seu navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const exportarFichasPDF = () => {
    if (selecionados.length === 0) {
      toast.error("Selecione pelo menos 1 lead para exportar o PDF.");
      return;
    }

    toast.info("Gerando arquivo PDF customizado...");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const leadsSelecionados = leads.filter(l => selecionados.includes(l.id));
    const bairrosAgrupados = agruparPorBairro(leadsSelecionados);

    const margemEsquerda = 15;
    let posicaoY = 20; 
    const larguraDisponivel = 180; 
    const alturaMaximaPagina = 275;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); 
    doc.text("ROTEIRO DE VISITAS EM CAMPO", margemEsquerda, posicaoY);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); 
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margemEsquerda, posicaoY + 5);
    
    posicaoY += 15;
    let contadorGlobal = 1;

    Object.entries(bairrosAgrupados).forEach(([bairro, leadsDoBairro]: [string, any]) => {
      const alturaBannerBairro = 10; 

      if (posicaoY + alturaBannerBairro + 30 > alturaMaximaPagina) {
        doc.addPage();
        posicaoY = 20;
      }

      doc.setFillColor(226, 232, 240); 
      doc.rect(margemEsquerda, posicaoY, larguraDisponivel, alturaBannerBairro, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); 
      const textoBanner = `> BAIRRO: ${bairro.toUpperCase()} (${leadsDoBairro.length} ${leadsDoBairro.length === 1 ? 'empresa' : 'empresas'})`;
      doc.text(textoBanner, margemEsquerda + 4, posicaoY + 6.5);

      posicaoY += alturaBannerBairro + 4;

      leadsDoBairro.forEach((lead: any) => {
        const alturaBlocoCliente = 65; 

        if (posicaoY + alturaBlocoCliente > alturaMaximaPagina) {
          doc.addPage();
          posicaoY = 20; 
        }

        doc.setFillColor(248, 250, 252); 
        doc.rect(margemEsquerda, posicaoY, larguraDisponivel, 7, "F");
        
        doc.setDrawColor(203, 213, 225); 
        doc.setLineWidth(0.2);
        doc.rect(margemEsquerda, posicaoY, larguraDisponivel, alturaBlocoCliente);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); 
        
        const tagStatusGoogle = lead.google_verificado
        ? ` [${lead.google_status === 'maps_ok' ? 'MAPS OK' : 
              lead.google_status === 'pendente_verificacao' ? 'PENDENTE' : 'NÃO VERIFICADO'}]`
        : '';
        const nomeEmpresa = `${contadorGlobal}. ${lead.nome_fantasia || lead.razao_social || "Empresa sem Nome"}${tagStatusGoogle}`;
        doc.text(nomeEmpresa.substring(0, 72), margemEsquerda + 3, posicaoY + 5);

        const larguraDados = 110; 
        const divisorX = margemEsquerda + larguraDados;
        doc.line(divisorX, posicaoY + 7, divisorX, posicaoY + alturaBlocoCliente);

        let dadosY = posicaoY + 12;
        doc.setFontSize(8.5);

        doc.setFont("Helvetica", "bold"); doc.text("CNPJ:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal"); doc.text(lead.cnpj ? maskCNPJ(lead.cnpj) : "Não informado", margemEsquerda + 14, dadosY);

        dadosY += 5;
        doc.setFont("Helvetica", "bold"); doc.text("Abertura:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal");
        
        // 🎯 CORRIGIDO: Tratamento de exceção de string e fallback nativo para evitar datas "undefined" ou inválidas no PDF
        let dataMostrada = "Não informada";
        if (lead.data_abertura) {
          if (String(lead.data_abertura).includes("-")) {
            const [ano, mes, dia] = String(lead.data_abertura).split("T")[0].split("-");
            dataMostrada = `${dia}/${mes}/${ano}`;
          } else {
            dataMostrada = String(lead.data_abertura);
          }
        }
        doc.text(dataMostrada, margemEsquerda + 19, dadosY);
        
        dadosY += 5;
        doc.setFont("Helvetica", "bold"); doc.text("Razão Social:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal"); 
        const razaoCortada = (lead.razao_social || "Não informada").substring(0, 48);
        doc.text(razaoCortada, margemEsquerda + 24, dadosY);

        dadosY += 5;
        doc.setFont("Helvetica", "bold"); doc.text("Sócios:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal");
        
        const textoSociosOriginal = lead.nomes_socios ? lead.nomes_socios.replace(/ \| /g, ', ') : "Não informados";
        const linhasSociosCalculadas = doc.splitTextToSize(textoSociosOriginal, 90);
        
        linhasSociosCalculadas.forEach((linha: string, idx: number) => {
          if (idx < 3) { 
            doc.text(idx === 2 ? linha + "..." : linha, margemEsquerda + 15, dadosY);
            if (idx < linhasSociosCalculadas.length - 1 && idx < 2) {
              dadosY += 4.5;
            }
          }
        });

        dadosY += 5;
        doc.setFont("Helvetica", "bold"); doc.text("Capital Social:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal");
        const capitalFormatado = lead.capital_social 
          ? Number(lead.capital_social).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : "Não informado";
        doc.text(capitalFormatado, margemEsquerda + 25, dadosY);

        dadosY += 5;
        doc.setFont("Helvetica", "bold"); doc.text("Endereço:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal");
        const enderecoCompleto = `${lead.logradouro || ""}, ${lead.numero || ""} - ${lead.bairro || ""}, ${lead.municipio || ""}`.substring(0, 48);
        doc.text(enderecoCompleto, margemEsquerda + 19, dadosY);

        dadosY += 5;
        doc.setFont("Helvetica", "bold"); doc.text("Telefone:", margemEsquerda + 3, dadosY);
        doc.setFont("Helvetica", "normal");
        const telPdfTratado = lead.ddd_telefone_1 ? lead.ddd_telefone_1.replace(/^0/, '') : "";
        doc.text(telPdfTratado ? maskPhone(telPdfTratado) : "Não informado", margemEsquerda + 18, dadosY);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); 
        doc.text("ANOTAÇÕES DA VISITA (CANETA):", divisorX + 4, posicaoY + 12);

        doc.setDrawColor(226, 232, 240); 
        let linhaAnotacaoY = posicaoY + 19;
        
        for (let i = 0; i < 6; i++) {
          doc.setLineDashPattern([1, 1], 0);
          doc.line(divisorX + 4, linhaAnotacaoY, margemEsquerda + larguraDisponivel - 4, linhaAnotacaoY);
          linhaAnotacaoY += 7;
        }
        doc.setLineDashPattern([], 0); 

        contadorGlobal++;
        posicaoY += alturaBlocoCliente + 5;
      });
    });

    doc.save(`roteiro_visitas_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF customizado agrupado por bairro exportado com sucesso! 📄");
  };

  const exportarCampanhaCSV = () => {
    if (leads.length === 0) {
      toast.error("Não há registros filtrados para exportar.");
      return;
    }

    const cabecalho = "nome,email\n";
    const linhas = leads
      .map((cliente: any) => {
        const nomeLimpo = (cliente.nome_fantasia || cliente.razao_social || "Empresa sem Nome")
          .replace(/,/g, " ")
          .replace(/\n/g, " ")
          .trim();
        
        const emailLimpo = (cliente.email || "").trim().toLowerCase();
        return `"${nomeLimpo}","${emailLimpo}"`;
      })
      .filter((linha: string) => !linha.endsWith('""'))
      .join("\n");

    if (linhas.length === 0) {
      toast.error("Nenhum cliente com e-mail válido encontrado no filtro atual.");
      return;
    }

    const conteudoFinal = cabecalho + linhas;
    const blob = new Blob(["\ufeff" + conteudoFinal], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const nomeArquivo = `prospeccao_marketing_${filtroMunicipio || "segmentada"}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${leads.length} contatos preparados para a Central de Disparos!`);
  };

  const handleLimparFiltros = () => {
    setPesquisaGeral("");
    setFiltroUf("");
    setFiltroMunicipio("");
    setFiltroBairro("");
    setFiltroCnaesSelecionados([]);
    setFiltroStatus("");
    setFiltroPorte("");
    setFiltroMei("");
    setFiltroSimples("");
    setFiltroMatriz("");
    setFiltroCapitalMin("");
    setFiltroCapitalMax("");
    setFiltroDataRetornoMin(""); 
    setFiltroDataRetornoMax("");
    setPaginaAtual(1);
    setFiltroCep("");
    setFiltroSituacaoCadastral("");
    setFiltroDataAberturaMin("");
    setFiltroDataAberturaMax("");
    setFiltroGoogleStatus([]);
    setFiltroGoogleScoreMin("");
    setFiltroFaixasSelecionadas([]);
    // 🎯 NOVOS FILTROS RESETADOS AQUI:
    setFiltroFaseAtendimento("");
    setFiltroTemperatura("");
    setFiltroProximaAcao("");
  };

  const agruparPorBairro = (listaLeads: any[]) => {
    if (!listaLeads || listaLeads.length === 0) return {};
    
    return listaLeads.reduce((acumulador: { [key: string]: any[] }, lead: any) => {
      const bairroNome = lead.bairro && lead.bairro.trim() !== "" 
        ? lead.bairro.trim() 
        : "Bairro Não Informado";

      if (!acumulador[bairroNome]) {
        acumulador[bairroNome] = [];
      }
      acumulador[bairroNome].push(lead);
      return acumulador;
    }, {});
  };

  const handleMudancaItensPorPagina = (quantidade: number) => {
    setItensPorPagina(quantidade);
    setPaginaAtual(1);
  };

  const getStatusLabel = (status: string | null | undefined): string => {
    switch (status) {
      case 'maps_ok': return '✅ MAPS OK';
      case 'pendente_verificacao': return '⚠️ PENDENTE';
      default: return '❌ NÃO VERIFICADO';
    }
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
                {/* Botão de Validação em Lote */}
                {selecionados.length > 0 && (
                  <button 
                    onClick={() => validarLeadsGoogleEmLote()}
                    disabled={higienizandoLote}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    {higienizandoLote ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    Validar {selecionados.length} no Google
                  </button>
                )}

                {/* Botão do Painel de Desempenho */}
                <button
                  onClick={() => setMostrarModalRelatorio(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Desempenho
                </button>

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
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
              
                {/* LINHA 1: BARRA DE PESQUISA INTELIGENTE + BOTÕES DE CONTROLE */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">🔍 Busca Global</label>
                    <input 
                      type="text" 
                      value={pesquisaGeral} 
                      onChange={(e) => setPesquisaGeral(e.target.value)} 
                      placeholder="Busque por Razão Social, Nome Fantasia ou CNPJ..." 
                      className="w-full p-2.5 rounded-lg border text-sm bg-slate-50/50 outline-none focus:border-blue-500 transition-colors font-medium placeholder-slate-400"
                    />
                  </div> 
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPainelExpandido(!painelExpandido)}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-bold rounded-lg transition-all border border-blue-100 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {painelExpandido ? "▲ Ocultar Avançados" : "▼ Filtros Avançados"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLimparFiltros}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-sm font-bold rounded-lg transition-all border border-slate-200 active:scale-95 shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      | 🧹 Limpar
                    </button>
                  </div>
                </div> 
                
                {/* CONTEÚDO CONDICIONAL (Só renderiza se painelExpandido for true) */}
                {painelExpandido && (
                  <div className="flex flex-col gap-5 border-t border-slate-100 pt-4 animate-fade-in">
                    
                    {/* LINHA 2: DOIS BLOCOS (Endereço e Cadastral + Capital) */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                      
                      {/* Bloco 1: Localização */}
                      <div className="xl:col-span-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">1. Localização</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estado (UF)</label>
                            <input type="text" maxLength={2} value={filtroUf} onChange={(e) => setFiltroUf(e.target.value.toUpperCase())} placeholder="SP" className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-center" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Município</label>
                            <input type="text" value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)} placeholder="Ex: São Paulo" className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bairro</label>
                            <input type="text" value={filtroBairro} onChange={(e) => setFiltroBairro(e.target.value)} placeholder="Ex: Centro" className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">CEP</label>
                            <input type="text" value={filtroCep} onChange={(e) => setFiltroCep(e.target.value)} placeholder="00000-000" className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white" />
                          </div>
                        </div>
                      </div>
          
                      {/* Bloco 2: Cadastro na Receita Federal + Capital Social */}
                      <div className="xl:col-span-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Dados da Receita & Capital</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Situação</label>
                            <select value={filtroSituacaoCadastral} onChange={(e) => setFiltroSituacaoCadastral(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white">
                              <option value="">Todas</option>
                              <option value="02">✅ Ativa (02)</option>
                              <option value="03">⚠️ Suspensa (03)</option>
                              <option value="04">❌ Inapta (04)</option>
                              <option value="08">🛑 Baixada (08)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Abertura (De)</label>
                            <input type="date" value={filtroDataAberturaMin} onChange={(e) => setFiltroDataAberturaMin(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Abertura (Até)</label>
                            <input type="date" value={filtroDataAberturaMax} onChange={(e) => setFiltroDataAberturaMax(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Capital Mín. (R$)</label>
                            <input type="number" value={filtroCapitalMin} onChange={(e) => setFiltroCapitalMin(e.target.value)} placeholder="0" className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Capital Máx. (R$)</label>
                            <input type="number" value={filtroCapitalMax} onChange={(e) => setFiltroCapitalMax(e.target.value)} placeholder="Ex: 50000" className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white" />
                          </div>
                        </div>
                      </div>
          
                    </div>
          
                    {/* LINHA 3: SEGMENTAÇÃO CORPORATIVA */}
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">3. Perfil da Empresa</h4>
                      {/* Alterado para garantir 3 colunas em medium e 6 em lg, ou forçar o wrap correto */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        
                        {/* 1º ELEMENTO: Porte da Empresa */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Porte</label>
                          <select value={filtroPorte} onChange={(e) => setFiltroPorte(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white">
                            <option value="">Todos</option>
                            <option value="MICRO EMPRESA">Micro Empresa</option>
                            <option value="EMPRESA DE PEQUENO PORTE">Pequeno Porte</option>
                            <option value="DEMAIS">Demais Portes</option>
                          </select>
                        </div>

                        {/* 2º ELEMENTO: Tipo de Unidade */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Unidade</label>
                          <select value={filtroMatriz} onChange={(e) => setFiltroMatriz(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white">
                            <option value="">Matriz e Filial</option>
                            <option value="1">🏢 Apenas Matriz</option>
                            <option value="2">🏬 Apenas Filial</option>
                          </select>
                        </div>

                        {/* 3º ELEMENTO: É MEI? */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">É MEI?</label>
                          <select value={filtroMei} onChange={(e) => setFiltroMei(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white">
                            <option value="">Indiferente</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </div>

                        {/* 4º ELEMENTO: Optante Simples? */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Optante Simples?</label>
                          <select value={filtroSimples} onChange={(e) => setFiltroSimples(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white">
                            <option value="">Indiferente</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </div>

                        {/* 5º ELEMENTO: Dropdown Customizado de CNAE */}
                        <div className="relative" id="cnae-dropdown-container">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nicho (CNAE)</label>
                          <div 
                            onClick={() => setDropdownCnaeAberto(!dropdownCnaeAberto)}
                            className="w-full p-2 rounded-md border text-sm bg-white font-medium cursor-pointer flex justify-between items-center select-none min-h-[38px] hover:border-slate-300 transition-colors"
                          >
                            <span className="truncate text-slate-700">
                              {filtroCnaesSelecionados.length === 0 ? "Todos os nichos" : `${filtroCnaesSelecionados.length} selecionados`}
                            </span>
                            <span className="text-xs text-gray-400">{dropdownCnaeAberto ? "▲" : "▼"}</span>
                          </div>

                          {dropdownCnaeAberto && (() => {
                            const cnaesFiltrados = todosCnaesDisponiveis.filter((item: any) => 
                              item.cnae.toLowerCase().includes(termoPesquisaCnae.toLowerCase())
                            );

                            // Verifica se todos os itens atualmente filtrados já estão selecionados
                            const todosFiltradosSelecionados = cnaesFiltrados.length > 0 && 
                              cnaesFiltrados.every((item: any) => filtroCnaesSelecionados.includes(item.cnae));

                            // Função para alternar entre selecionar todos e desmarcar todos os filtrados
                            const handleSelecionarTodos = () => {
                              if (todosFiltradosSelecionados) {
                                // Remove da seleção apenas os itens visíveis/filtrados
                                const cnaesFiltradosIds = cnaesFiltrados.map((item: any) => item.cnae);
                                setFiltroCnaesSelecionados(prev => prev.filter(id => !cnaesFiltradosIds.includes(id)));
                              } else {
                                // Adiciona todos os itens filtrados mantendo os que já estavam selecionados
                                const novosCnaes = cnaesFiltrados.map((item: any) => item.cnae);
                                setFiltroCnaesSelecionados(prev => Array.from(new Set([...prev, ...novosCnaes])));
                              }
                            };

                            return (
                              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-fade-in w-[90vw] sm:w-[400px] md:w-[480px]">
                                
                                {/* Campo de Pesquisa + Botão Selecionar Todos */}
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    autoFocus 
                                    value={termoPesquisaCnae} 
                                    onChange={(e) => setTermoPesquisaCnae(e.target.value)} 
                                    placeholder="Digite para pesquisar..." 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-medium" 
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSelecionarTodos}
                                    className="text-[10px] whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-2 rounded-lg font-bold transition border border-blue-200"
                                  >
                                    {todosFiltradosSelecionados ? "Desmarcar Filtrados" : "Selecionar Todos"}
                                  </button>
                                </div>

                                {/* Lista de CNAEs */}
                                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                                  {cnaesFiltrados.length > 0 ? (
                                    cnaesFiltrados.map((item: any) => {
                                      const incluso = filtroCnaesSelecionados.includes(item.cnae);
                                      return (
                                        <label key={item.cnae} className="flex items-center justify-between gap-2.5 p-2 hover:bg-slate-50 cursor-pointer transition rounded-md select-none">
                                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            <input 
                                              type="checkbox" 
                                              checked={incluso} 
                                              onChange={() => setFiltroCnaesSelecionados(prev => incluso ? prev.filter(i => i !== item.cnae) : [...prev, item.cnae])} 
                                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 cursor-pointer flex-shrink-0" 
                                            />
                                            <span className="text-slate-700 font-medium break-words leading-tight">{item.cnae}</span>
                                          </div>
                                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 shadow-sm border border-blue-100">{item.quantidade}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="text-center text-gray-400 py-4 italic">Nenhum segmento encontrado.</p>
                                  )}
                                </div>

                                {/* Rodapé com Limpar e Fechar */}
                                <div className="border-t pt-2 flex justify-between items-center bg-slate-50 -mx-2 -mb-2 p-2 rounded-b-xl">
                                  <div>
                                    {filtroCnaesSelecionados.length > 0 && (
                                      <button type="button" onClick={() => setFiltroCnaesSelecionados([])} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase transition">
                                        Limpar Todos ({filtroCnaesSelecionados.length})
                                      </button>
                                    )}
                                  </div>
                                  <button type="button" onClick={() => { setDropdownCnaeAberto(false); setTermoPesquisaCnae(""); }} className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold uppercase transition shadow-sm">
                                    Fechar
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 6º ELEMENTO: Dropdown Customizado de Faixa Etária */}
                        <div className="relative" id="faixa-etaria-dropdown-container">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Idade dos Sócios</label>
                          
                          <div 
                            onClick={() => setDropdownFaixaAberto(!dropdownFaixaAberto)}
                            className="w-full p-2 rounded-md border text-sm bg-white font-medium cursor-pointer flex justify-between items-center select-none min-h-[38px] hover:border-slate-300 transition-colors"
                          >
                            <span className="truncate text-slate-700">
                              {filtroFaixasSelecionadas.length === 0 ? "Todas as idades" : `${filtroFaixasSelecionadas.length} selecionadas`}
                            </span>
                            <span className="text-xs text-gray-400">{dropdownFaixaAberto ? "▲" : "▼"}</span>
                          </div>

                          {dropdownFaixaAberto && (() => {
                            const faixasFiltradas = todasFaixasEtarias.filter((item: any) => 
                              item.faixa.toLowerCase().includes(pesquisaFaixaEtaria.toLowerCase())
                            );
                            return (
                            <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-fade-in w-[90vw] sm:w-[350px]">
                              <input type="text" autoFocus value={pesquisaFaixaEtaria} onChange={(e) => setPesquisaFaixaEtaria(e.target.value)} placeholder="Pesquisar faixa etária..." className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-medium" />
                              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                                {faixasFiltradas.length > 0 ? (
                                  faixasFiltradas.map((item: any) => {
                                    const incluso = filtroFaixasSelecionadas.includes(item.faixa);
                                    return (
                                      <label key={item.faixa} className="flex items-center justify-between gap-2.5 p-2 hover:bg-slate-50 cursor-pointer transition rounded-md select-none">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                          <input type="checkbox" checked={incluso} onChange={() => setFiltroFaixasSelecionadas(prev => incluso ? prev.filter(i => i !== item.faixa) : [...prev, item.faixa])} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 cursor-pointer flex-shrink-0" />
                                          <span className="text-slate-700 font-medium break-words leading-tight">{item.faixa}</span>
                                        </div>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 shadow-sm border border-blue-100">{item.quantidade}</span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <p className="text-center text-gray-400 py-4 italic">Nenhuma faixa encontrada.</p>
                                )}
                              </div>
                              <div className="border-t pt-2 flex justify-between items-center bg-slate-50 -mx-2 -mb-2 p-2 rounded-b-xl">
                                <div>
                                  {filtroFaixasSelecionadas.length > 0 && (
                                    <button type="button" onClick={() => setFiltroFaixasSelecionadas([])} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase transition">Limpar</button>
                                  )}
                                </div>
                                <button type="button" onClick={() => { setDropdownFaixaAberto(false); setPesquisaFaixaEtaria(""); }} className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold uppercase transition shadow-sm">Fechar</button>
                              </div>
                            </div>
                            );
                          })()}
                        </div>

                      </div>
                    </div>
          
                    {/* LINHA 4: CONTROLE E AÇÕES */}
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">4. Ações de Prospecção & CRM</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        
                        {/* 1. Status na Fila */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status na Fila</label>
                          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700 font-medium">
                            <option value="">Todos (Oculta Convertidos)</option>
                            <option value="nao_contatado">⚪ Não Contatado</option>
                            <option value="em_prospeccao">🔄 Em Prospecção</option>
                            <option value="ja_cliente">👑 Já Cliente</option>
                            <option value="convertido">🏆 Convertido no CRM</option>
                            <option value="perdido">❌ Perdido</option>
                          </select>
                        </div>

                        {/* 2. Fase de Atendimento */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fase de Atendimento</label>
                          <select value={filtroFaseAtendimento} onChange={(e) => setFiltroFaseAtendimento(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700 font-medium">
                            <option value="">Todas as Fases</option>
                            <option value="nao_contatado">⚪ Não Contatado</option>
                            <option value="tentativa_contato">🟡 Tentativa de Contato</option>
                            <option value="contato_realizado">🔵 Contato Realizado</option>
                            <option value="cotacao_enviada">🟣 Cotação Enviada</option>
                            <option value="em_negociacao">🟠 Em Negociação</option>
                            <option value="vendido">🟢 Vendido</option>
                            <option value="perdido">🔴 Perdido</option>
                          </select>
                        </div>

                        {/* 3. Temperatura */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Temperatura</label>
                          <select value={filtroTemperatura} onChange={(e) => setFiltroTemperatura(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700 font-medium">
                            <option value="">Todas</option>
                            <option value="frio">❄️ Frio</option>
                            <option value="morno">⛅ Morno</option>
                            <option value="quente">🔥 Quente</option>
                          </select>
                        </div>

                        {/* 4. Próxima Ação Recomendada */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Próxima Ação Recomendada</label>
                          <select value={filtroProximaAcao} onChange={(e) => setFiltroProximaAcao(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700 font-medium">
                            <option value="">Todas as Ações</option>
                            <option value="visitar">🏢 Visitar</option>
                            <option value="chamar_whats">💬 Chamar no Whats</option>
                            <option value="ligar">📞 Ligar</option>
                            <option value="outros">📌 Outros</option>
                          </select>
                        </div>

                      </div>

                      {/* LINHA 5: DATAS E GOOGLE STATUS / SCORES */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Agendado Para (Início)</label>
                          <input type="date" value={filtroDataRetornoMin} onChange={(e) => setFiltroDataRetornoMin(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Agendado Para (Fim)</label>
                          <input type="date" value={filtroDataRetornoMax} onChange={(e) => setFiltroDataRetornoMax(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Score Google Mín.</label>
                          <input 
                            type="number" 
                            min="0"
                            max="5"
                            value={filtroGoogleScoreMin} 
                            onChange={(e) => setFiltroGoogleScoreMin(e.target.value)} 
                            placeholder="0 a 5"
                            className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" 
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Google</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'nao_verificado', label: '⚪ Não Verif.' },
                              { id: 'alta_precisao', label: '🎯 Alta Prec.' },
                              { id: 'media_precisao', label: '⚠️ Média Prec.' },
                              { id: 'baixa_precisao', label: '❌ Baixa Prec.' }
                            ].map((opcao) => {
                              const isSelected = filtroGoogleStatus.includes(opcao.id);
                              return (
                                <button
                                  key={opcao.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setFiltroGoogleStatus(filtroGoogleStatus.filter(s => s !== opcao.id));
                                    } else {
                                      setFiltroGoogleStatus([...filtroGoogleStatus, opcao.id]);
                                    }
                                  }}
                                  className={`text-[10px] px-2 py-1.5 rounded border font-bold transition-all ${
                                    isSelected 
                                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {opcao.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
            </div>
      
            {/* Tabela de Leads Refatorada */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={leads.length > 0 && selecionados.length === leads.length} 
                          onChange={toggleSelecionarTodos} 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                      </th>
                      <th className="py-4 px-3">Identificação da Empresa</th>
                      <th className="py-4 px-3">Quadro Societário & Idades</th>
                      <th className="py-4 px-3">Localização</th>
                      <th className="py-4 px-3">Status, Fase & Temperatura</th>
                      <th className="py-4 px-3">Próxima Ação & Agendamento</th>
                      <th className="py-4 px-3 text-center">Ações Operacionais</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100 text-slate-600">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-500" /> 
                          <span className="text-xs font-medium">Carregando registros...</span>
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-medium">
                          Nenhum lead disponível para prospecção no momento.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(agruparPorBairro(leads)).map(([bairro, leadsDoBairro]: [string, any]) => (
                        <Fragment key={bairro}>
                          
                          {/* Linha Divisória de Cabeçalho do Bairro */}
                          <tr className="bg-slate-100/80 border-y border-slate-200 text-slate-700 select-none">
                            <td colSpan={7} className="py-2 px-4">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                                  <span className="text-blue-600">📍</span> 
                                  <span>Bairro: <span className="text-slate-900 font-extrabold">{bairro}</span></span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold shadow-2xs">
                                  {leadsDoBairro.length} {leadsDoBairro.length === 1 ? 'empresa' : 'empresas'}
                                </span>
                              </div>
                            </td>
                          </tr>
              
                          {/* Loop das empresas do bairro lendo exclusivamente da tabela principal (clientes_frios) */}
                          {leadsDoBairro.map((lead: any) => (
                            <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                              
                              {/* Checkbox */}
                              <td className="p-4 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={selecionados.includes(lead.id)} 
                                  onChange={() => toggleLeadUnico(lead.id)} 
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                />
                              </td>

                              {/* Identificação da Empresa */}
                              <td className="py-4 px-3 max-w-[280px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                                    {lead.nome_fantasia && lead.nome_fantasia !== 'NULL' ? lead.nome_fantasia : (lead.razao_social || 'Empresa sem nome')}
                                  </span>
                                  
                                  {/* Badge inteligente do Google Maps */}
                                  {lead.google_verificado && (() => {
                                    const statusConfig = {
                                      alta_precisao: { text: "ALTA PREC.", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                      media_precisao: { text: "MÉDIA PREC.", color: "bg-amber-50 text-amber-700 border-amber-200" },
                                      baixa_precisao: { text: "BAIXA PREC.", color: "bg-rose-50 text-rose-700 border-rose-200" },
                                      nao_verificado: { text: "NÃO VERIF.", color: "bg-slate-50 text-slate-500 border-slate-200" }
                                    };
                                    const config = statusConfig[lead.google_status as keyof typeof statusConfig] || statusConfig.nao_verificado;

                                    return (
                                      <span 
                                        title={`Status: ${config.text} | Score: ${lead.google_score || 0}`}
                                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold shrink-0 border ${config.color}`}
                                      >
                                        {config.text}{lead.google_score !== null && ` (${lead.google_score}%)`}
                                      </span>
                                    );
                                  })()}
                                </div>

                                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                                  <span>{maskCNPJ(lead.cnpj)}</span>
                                  {lead.data_abertura && (
                                    <>
                                      <span>•</span>
                                      <span>Aberta em {new Date(lead.data_abertura + "T00:00:00").toLocaleDateString('pt-BR')}</span>
                                    </>
                                  )}
                                </div>
                                
                                <div className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                                  {lead.razao_social && lead.razao_social !== 'NULL' ? lead.razao_social : ''}
                                </div>
                                
                                {lead.cnae_principal && (
                                  <div className="mt-1.5">
                                    <span className="text-[10px] bg-blue-50/80 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md inline-block max-w-full truncate font-medium">
                                      🎯 {lead.cnae_principal}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Quadro Societário & Faixa Etária */}
                              <td className="py-4 px-3 max-w-[240px]">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {renderSociosBadge(lead.nomes_socios)}
                                  </div>
                                  {lead.faixas_etarias && lead.faixas_etarias !== 'NULL' && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100/70 border border-slate-200/60 px-2 py-1 rounded-md w-fit">
                                      <span className="text-slate-400 font-semibold">📅 Idades:</span>
                                      <span className="font-medium text-slate-700">{lead.faixas_etarias}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Localização */}
                              <td className="py-4 px-3">
                                <div className="text-xs font-semibold text-slate-800">{lead.municipio} - {lead.uf}</div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">{lead.bairro}</div>
                              </td>
                              
                              {/* 1. Status Prospecção, 2. Fase de Atendimento, 3. Temperatura */}
                              <td className="py-4 px-3 min-w-[200px]">
                                <div className="flex flex-col gap-1.5 items-start">
                                  {/* Status Prospecção */}
                                  {lead.status_prospeccao === 'ja_cliente' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                      👑 Já é Cliente
                                    </span>
                                  ) : lead.status_prospeccao === 'em_prospeccao' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                      🔄 Em Prospecção
                                    </span>
                                  ) : lead.status_prospeccao === 'perdido' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                      ❌ Perdido
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                                      Não Contatado
                                    </span>
                                  )}

                                  {/* Fase de Atendimento com Indicadores Visuais Customizados por Bolinha */}
                                  {(() => {
                                    const faseConfig: Record<string, { label: string; dotColor: string; badgeColor: string }> = {
                                      "não contatado": { label: "Não Contatado", dotColor: "bg-purple-300", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
                                      "tentativa de contato": { label: "Tentativa de Contato", dotColor: "bg-amber-400", badgeColor: "bg-amber-50 text-amber-800 border-amber-200" },
                                      "contato realizado": { label: "Contato Realizado", dotColor: "bg-blue-500", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
                                      "cotação enviada": { label: "Cotação Enviada", dotColor: "bg-purple-600", badgeColor: "bg-purple-50 text-purple-800 border-purple-200" },
                                      "em negociação": { label: "Em Negociação", dotColor: "bg-orange-500", badgeColor: "bg-orange-50 text-orange-700 border-orange-200" },
                                      "vendido": { label: "Vendido", dotColor: "bg-emerald-500", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                      "perdido": { label: "Perdido", dotColor: "bg-rose-500", badgeColor: "bg-rose-50 text-rose-700 border-rose-200" }
                                    };

                                    const rawFase = (lead.fase_atendimento || '').trim().toLowerCase();
                                    const fase = faseConfig[rawFase] || { 
                                      label: lead.fase_atendimento ? lead.fase_atendimento.replace(/_/g, ' ') : 'Sem fase definida', 
                                      dotColor: "bg-slate-400", 
                                      badgeColor: "bg-slate-100 text-slate-600 border-slate-200" 
                                    };

                                    if (!lead.fase_atendimento) {
                                      return <span className="text-[10px] text-slate-400 italic">Sem fase definida</span>;
                                    }

                                    return (
                                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded-md font-bold border ${fase.badgeColor}`}>
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${fase.dotColor}`}></span>
                                        <span>{fase.label}</span>
                                      </span>
                                    );
                                  })()}

                                  {/* Temperatura */}
                                  {(() => {
                                    const tempConfig = {
                                      quente: { label: "Quente", emoji: "🔥", color: "bg-rose-50 text-rose-700 border-rose-200" },
                                      morno: { label: "Morno", emoji: "⚡", color: "bg-amber-50 text-amber-700 border-amber-200" },
                                      morto: { label: "Morto", emoji: "💀", color: "bg-slate-100 text-slate-700 border-slate-300" },
                                      frio: { label: "Frio", emoji: "❄️", color: "bg-blue-50 text-blue-700 border-blue-200" }
                                    };
                                    
                                    const chaveTemp = (lead.temperatura || 'frio').toLowerCase();
                                    const temp = tempConfig[chaveTemp as keyof typeof tempConfig] || tempConfig.frio;

                                    return (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${temp.color}`}>
                                        <span>{temp.emoji}</span>
                                        <span>{temp.label}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </td>

                              {/* 4. Próxima Ação Recomendada & 5. Retorno (Data e Horário) */}
                              <td className="py-4 px-3 max-w-[240px]">
                                <div className="flex flex-col gap-1.5">
                                  {/* Retorno (Data e Horário) */}
                                  {lead.data_retorno ? (
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-md w-fit">
                                      <span className="text-slate-500">📅 Retorno:</span>
                                      <span>
                                        {new Date(lead.data_retorno + "T00:00:00").toLocaleDateString('pt-BR')}
                                        {lead.horario_retorno && ` às ${lead.horario_retorno.substring(0, 5)}`}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                      Sem retorno agendado
                                    </span>
                                  )}

                                  {/* Próxima Ação Recomendada */}
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                      Próxima Ação:
                                    </span>
                                    {lead.proxima_acao ? (
                                      <span className="text-[11px] text-slate-700 font-medium truncate block" title={Array.isArray(lead.proxima_acao) ? lead.proxima_acao.join(', ') : lead.proxima_acao}>
                                        {Array.isArray(lead.proxima_acao) ? lead.proxima_acao.join(', ') : lead.proxima_acao}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">
                                        Nenhuma ação definida
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Ações Operacionais */}
                              <td className="py-4 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  
                                  <button 
                                    onClick={() => (validarLeadGoogleIndividual as Function)(lead.id)}
                                    title="Validar local no Google" 
                                    disabled={leadIdEmProcessamento === lead.id}
                                    className="p-1.5 hover:bg-slate-100 text-emerald-600 rounded-lg transition disabled:opacity-50"
                                  >
                                    {leadIdEmProcessamento === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                  </button>

                                  <button onClick={() => typeof abrirTimeline === 'function' && abrirTimeline(lead)} title="Timeline & Ações" className="p-1.5 hover:bg-slate-100 text-purple-600 rounded-lg transition">
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                  
                                  <button onClick={() => setLeadVisualizar(lead)} title="Visualizar Ficha" className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition">
                                    <Search className="w-4 h-4" />
                                  </button>
                                  
                                  <button onClick={() => setLeadEditar(lead)} title="Editar Cadastro" className="p-1.5 hover:bg-slate-100 text-amber-600 rounded-lg transition">
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button onClick={() => (excluirLoteOuUnico as Function)(lead.id)} title="Remover" className="p-1.5 hover:bg-slate-100 text-rose-600 rounded-lg transition">
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  {lead.status_prospeccao === 'convertido' ? (
                                    <span className="ml-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase shadow-2xs">
                                      ✅ Convertido
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => prepararConversaoLead(lead)}
                                      className="ml-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-xs font-bold shadow-sm hover:brightness-105 transition"
                                    >
                                      🏆 Converter
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
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

            {/* Modal: Conversão Ouro (Interface Otimizada) */}
            {leadConversao && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl">
                  <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5"/>
                      <h3 className="font-bold">Efetivar Conversão para o CRM</h3>
                    </div>
                    <button onClick={() => setLeadConversao(null)} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                      <div><strong>Empresa Alvo:</strong> {leadConversao.nome_fantasia || leadConversao.razao_social}</div>
                      <div><strong>CNPJ Vinculado:</strong> {maskCNPJ(leadConversao.cnpj)}</div>
                      <p className="mt-1 font-medium">Os dados serão integrados automaticamente como um novo Lead no seu Kanban.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome do Contato Principal</label>
                      <input 
                        type="text" 
                        value={dadosConversaoCRM.nome || ""} 
                        onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, nome: e.target.value}))} 
                        placeholder="Ex: Nome do Sócio ou Decisor" 
                        className="w-full p-2.5 border rounded-lg text-sm" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp direto</label>
                        <input 
                          type="text" 
                          value={dadosConversaoCRM.telefone_whats || ""} 
                          onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, telefone_whats: maskPhone(e.target.value)}))} 
                          placeholder="(00) 00000-0000" 
                          className="w-full p-2.5 border rounded-lg text-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">CPF</label>
                        <input 
                          type="text" 
                          value={dadosConversaoCRM.cpf || ""} 
                          onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, cpf: maskCPF(e.target.value)}))} 
                          placeholder="000.000.000-00" 
                          className="w-full p-2.5 border rounded-lg text-sm" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data de Nascimento</label>
                        <input 
                          type="date" 
                          value={dadosConversaoCRM.data_nascimento || ""} 
                          onChange={e => setDadosConversaoCRM((prev: any) => ({...prev, data_nascimento: e.target.value}))} 
                          className="w-full p-2.5 border rounded-lg text-sm" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
                    <button onClick={() => setLeadConversao(null)} className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-white">Cancelar</button>
                    
                    {/* AQUI ESTÁ A CORREÇÃO: Chamando a função final de salvamento */}
                    <button onClick={processarConversaoOuroFinal} className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition active:scale-95 flex items-center gap-1.5">
                      Confirmar Conversão 🏆
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Timeline */}
{leadTimeline && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] flex flex-col">
      
      {/* Cabeçalho do Modal */}
      <div className="p-4 border-b flex justify-between items-start gap-3 bg-purple-600 text-white rounded-t-2xl">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Clock className="w-5 h-5 mt-0.5 shrink-0"/>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base leading-tight">Linha do Tempo de Interações</h3>
            <div className="text-white font-bold text-sm mt-1 leading-snug break-words">
              {leadTimeline.nome_fantasia || leadTimeline.razao_social || "Cliente sem nome"}
            </div>
          </div>
        </div>
        <button onClick={() => setLeadTimeline(null)} className="p-1 rounded-lg hover:bg-purple-700 transition-colors">
          <X className="w-5 h-5"/>
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* Painel do Formulário de Registro */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          
          {/* Seletor de Fase, Temperatura e Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fase de Atendimento</label>
              <select 
                value={faseAtendimento} 
                onChange={e => setFaseAtendimento(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-white font-medium outline-none focus:border-purple-500"
              >
                <option value="nao_contatado">⚪ Não Contatado</option>
                <option value="tentativa_contato">🟡 Tentativa de Contato</option>
                <option value="contato_realizado">🔵 Contato Realizado</option>
                <option value="cotacao_enviada">🟣 Cotação Enviada</option>
                <option value="em_negociacao">🟠 Em Negociação</option>
                <option value="vendido">🟢 Vendido</option>
                <option value="perdido">🔴 Perdido</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Temperatura</label>
              <select 
                value={temperatura} 
                onChange={e => setTemperatura(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-white font-medium outline-none focus:border-purple-500"
              >
                <option value="frio">❄️ Frio</option>
                <option value="quente">🔥 Quente</option>
                <option value="morno">🟢 Morno</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status Prospecção</label>
              <select 
                value={resultadoAcao} 
                onChange={e => setResultadoAcao(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-white font-medium outline-none focus:border-purple-500"
              >
                <option value="em_prospeccao">🔄 Em Prospecção</option>
                <option value="perdido">❌ Perdido</option>
                <option value="ja_cliente">👑 Já Cliente</option>
              </select>
            </div>
          </div>

          {/* 1) O que fiz na ação & 1.1) O que aconteceu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">1) O que fiz na ação</label>
              <select 
                value={tipoAcaoRealizada} 
                onChange={e => setTipoAcaoRealizada(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-white font-medium outline-none focus:border-purple-500"
              >
                <option value="ligar">📞 Ligação</option>
                <option value="chamar_whats">💬 WhatsApp</option>
                <option value="visitar">🏢 Visita Presencial</option>
                <option value="enviar_email">📧 E-mail</option>
                <option value="outros">📌 Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">1.1) O que aconteceu (Desfecho)</label>
              <select 
                value={desfechoAcaoRealizada} 
                onChange={e => setDesfechoAcaoRealizada(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-white font-medium outline-none focus:border-purple-500"
              >
                <option value="atendeu">✅ Atendeu / Conversou</option>
                <option value="caixa_postal">📭 Caixa Postal / Não Atendeu</option>
                <option value="ocupado">⏳ Ocupado</option>
                <option value="recado_secretaria">📝 Deixou Recado</option>
                <option value="pediu_retorno_outro_momento">⏰ Pediu para ligar depois</option>
                <option value="sem_interesse">❌ Sem Interesse</option>
              </select>
            </div>
          </div>

          {/* Multiselect: Próxima Ação */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Próxima Ação Recomendada</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "chamar_whats", label: "💬 Chamar no Whats" },
                { id: "ligar", label: "📞 Ligar" },
                { id: "visitar", label: "🏢 Visitar" },
                { id: "outros", label: "📌 Outros" }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleProximaAcao(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    proximaAcao.includes(item.id)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agendamento de Retorno */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-600 uppercase">Agendar Retorno:</span>
            </div>
            <input 
              type="date" 
              value={novaAcaoRetorno} 
              onChange={e => setNovaAcaoRetorno(e.target.value)}
              className="p-1.5 border rounded-lg text-xs bg-white outline-none focus:border-purple-500" 
            />
            <input 
              type="time" 
              value={novaAcaoHorarioRetorno} 
              onChange={e => setNovaAcaoHorarioRetorno(e.target.value)}
              className="p-1.5 border rounded-lg text-xs bg-white outline-none focus:border-purple-500" 
            />
          </div>

          {/* Observação (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Observação / Resumo do Acionamento (Opcional)
            </label>
            <textarea 
              rows={2} 
              value={novaAcaoObs} 
              onChange={e => setNovaAcaoObs(e.target.value)} 
              placeholder="Digite detalhes da conversa se houver..." 
              className="w-full p-2 border rounded-lg text-xs resize-none outline-none focus:border-purple-500 bg-white"
            />
          </div>

          {/* Gerenciador de Contatos Adicionais (JSONB) */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase">👥 Contatos Adicionais / Indicações</span>
              <button 
                type="button" 
                onClick={adicionarContato}
                className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5"/> Adicionar Contato
              </button>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto">
              {contatosAdicionais.map((contato) => (
                <div key={contato.id} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-slate-200">
                  <input 
                    type="text" 
                    placeholder="Nome" 
                    value={contato.nome} 
                    onChange={e => atualizarContato(contato.id, "nome", e.target.value)}
                    className="col-span-3 p-1 border rounded text-xs outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Cargo/Relação" 
                    value={contato.cargo_relacao} 
                    onChange={e => atualizarContato(contato.id, "cargo_relacao", e.target.value)}
                    className="col-span-3 p-1 border rounded text-xs outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Telefone" 
                    value={contato.telefone} 
                    onChange={e => atualizarContato(contato.id, "telefone", e.target.value)}
                    className="col-span-3 p-1 border rounded text-xs outline-none"
                  />
                  <input 
                    type="email" 
                    placeholder="E-mail" 
                    value={contato.email} 
                    onChange={e => atualizarContato(contato.id, "email", e.target.value)}
                    className="col-span-2 p-1 border rounded text-xs outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => removerContato(contato.id)}
                    className="col-span-1 text-red-500 hover:text-red-700 flex justify-center"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botão Registrar Ação */}
          <div className="flex justify-end pt-2">
            <button 
              onClick={salvarNovaAcaoAcompanhamento} 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5"/> Registrar Ação
            </button>
          </div>
        </div>

        {/* Lista de Histórico */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico de Atendimentos</h4>
          {historicoAcoes.length === 0 ? (
            <p className="text-xs text-center text-gray-400 py-4">Nenhuma ação registrada anteriormente.</p>
          ) : (
            historicoAcoes.map((acao) => (
              <div key={acao.id} className="relative pl-5 border-l-2 border-purple-300 space-y-1.5 pb-2">
                <div className="absolute -left-[5.5px] top-1 w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="font-semibold">📅 {new Date(acao.criado_em).toLocaleString("pt-BR")}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {/* Badges de Tipo de Ação e Desfecho */}
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
                    {acao.fase_atendimento && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                        {acao.fase_atendimento.replace("_", " ")}
                      </span>
                    )}
                    {acao.temperatura && (
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                        {acao.temperatura}
                      </span>
                    )}
                  </div>
                </div>

                {acao.proxima_acao && acao.proxima_acao.length > 0 && (
                  <div className="flex gap-1 flex-wrap pt-0.5">
                    {acao.proxima_acao.map((act: string, idx: number) => (
                      <span key={idx} className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-medium">
                        {act.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}

                {acao.observacao && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {acao.observacao}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
)}


            {/* Modal: Visualizar Ficha */}
            {leadVisualizar && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                  
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50 rounded-t-3xl">
              <div>
                <h3 className="font-black text-slate-800 dark:text-zinc-100 uppercase text-sm tracking-tight">Ficha Completa do Lead</h3>
                <p className="text-[11px] text-slate-400 font-medium">Origem: Banco de Dados de Prospecção Fria</p>
              </div>
              <button 
                type="button"
                onClick={() => setLeadVisualizar(null)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              
              {/* SEÇÃO 1: STATUS E AGENDAMENTO (PROSPECÇÃO) */}
              <div className="bg-blue-50/40 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100/60 dark:border-blue-900/30 space-y-3">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Status & Agendamento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Status Prospecção</span>
                    <span className="inline-block mt-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 uppercase">
                      {(leadVisualizar.status_prospeccao || 'nao_contatado').replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Data de Retorno</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-semibold mt-1">
                      {leadVisualizar.data_retorno ? new Date(leadVisualizar.data_retorno + "T00:00:00").toLocaleDateString('pt-BR') : '---'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Horário de Retorno</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-semibold mt-1">
                      {leadVisualizar.horario_retorno ? leadVisualizar.horario_retorno.substring(0, 5) : '---'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-100/40 dark:border-blue-900/20 text-[11px]">
                  <div>
                    {/* <span className="text-slate-400 font-medium">Vinculado à Corretora:</span> <span className="font-mono text-slate-600 dark:text-zinc-400">{leadVisualizar.corretora_id}</span>*/}
                  </div>
                  <div>
                    {/*<span className="text-slate-400 font-medium">Corretor Responsável:</span> <span className="font-mono text-slate-600 dark:text-zinc-400">{leadVisualizar.corretor_id || 'Não atribuído'}</span>*/}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: IDENTIFICAÇÃO DA EMPRESA */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Identificação do Lead</h4>
                
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-sm text-slate-800 dark:text-zinc-200 font-bold">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Segmentação / CNAE Principal</span>
                  {leadVisualizar.cnae_principal || 'Descrição do CNAE não mapeada.'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Razão Social</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-bold mt-0.5 uppercase">{leadVisualizar.razao_social || '---'}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Nome Fantasia</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-bold mt-0.5 uppercase">{leadVisualizar.nome_fantasia || '---'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">CNPJ</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-mono font-semibold mt-0.5">{maskCNPJ ? maskCNPJ(leadVisualizar.cnpj) : leadVisualizar.cnpj}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Data de Abertura</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-medium mt-0.5">
                      {leadVisualizar.data_abertura ? new Date(leadVisualizar.data_abertura + "T00:00:00").toLocaleDateString('pt-BR') : '---'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Situação Cadastral</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-bold mt-0.5">
                      {leadVisualizar.situacao_cadastral ? `(${leadVisualizar.situacao_cadastral})` : '---'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Importado Em</span>
                    <div className="text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                      {leadVisualizar.importado_em ? new Date(leadVisualizar.importado_em).toLocaleDateString('pt-BR') : '---'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 border-t border-dashed border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Porte</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-semibold mt-0.5 uppercase">{leadVisualizar.porte || '---'}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Capital Social</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                      {leadVisualizar.capital_social ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(leadVisualizar.capital_social) : '---'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Opção pelo MEI</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-semibold mt-0.5">
                      {leadVisualizar.opcao_pelo_mei === true ? 'Sim ✅' : leadVisualizar.opcao_pelo_mei === false ? 'Não ❌' : '---'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Opção pelo Simples</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-semibold mt-0.5">
                      {leadVisualizar.opcao_pelo_simples === true ? 'Sim ✅' : leadVisualizar.opcao_pelo_simples === false ? 'Não ❌' : '---'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Natureza Jurídica</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5">{leadVisualizar.natureza_juridica || '---'}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Identificador Matriz/Filial</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5 uppercase">{leadVisualizar.descricao_identificador_matriz_filial || '---'}</div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: CANAIS DE CONTATO */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Canais de Contato</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-zinc-800/30 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Telefone Principal</span>
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-bold mt-0.5">{leadVisualizar.ddd_telefone_1 || '---'}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Telefone Adicional / Whats</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-medium mt-0.5">{leadVisualizar.telefone_adicional || '---'}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">E-mail Corporativo</span>
                    <div className="text-sm text-slate-700 dark:text-zinc-300 font-medium mt-0.5 truncate select-all" title={leadVisualizar.email}>{leadVisualizar.email || '---'}</div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: ENDEREÇO MAPEADO */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Endereço Cadastral</h4>
                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-300 leading-relaxed">
                  <div className="font-semibold text-slate-800 dark:text-zinc-200 text-xs">
                    {leadVisualizar.logradouro || '---'}, Nº {leadVisualizar.numero || 'S/N'} 
                    {leadVisualizar.complemento && <span className="text-slate-400 font-normal"> ({leadVisualizar.complemento})</span>}
                  </div>
                  <div className="mt-0.5 font-medium">
                    Bairro: {leadVisualizar.bairro || '---'} — {leadVisualizar.municipio || '---'}/{leadVisualizar.uf || '---'}
                  </div>
                  <div className="text-[11px] font-mono mt-1 text-slate-400">
                    CEP: {leadVisualizar.cep || '---'}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 5: QUADRO DE SÓCIOS E CPFS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quadro de Sócios e Administradores</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                  
                  {/* Listagem de Sócios */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Nomes Vinculados</span>
                    <div className="flex flex-col gap-1.5">
                      {leadVisualizar.nomes_socios && leadVisualizar.nomes_socios.trim() !== "" ? (
                        leadVisualizar.nomes_socios.split(',')
                          .filter((n: string) => n.trim() !== "")
                          .map((socio: string, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-zinc-800 p-2 rounded-lg border text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5 shadow-sm truncate">
                              <span className="text-slate-400 text-[10px]">👤</span> {socio.trim()}
                            </div>
                          ))
                      ) : (
                        <span className="text-slate-400 font-medium italic text-[11px]">Nenhum sócio identificado</span>
                      )}
                    </div>
                  </div>

                  {/* Listagem de CPFs correspondentes */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Documentos (CPFs) / Faixa Etária</span>
                    <div className="flex flex-col gap-1.5">
                      {leadVisualizar.cpfs_socios && leadVisualizar.cpfs_socios.trim() !== "" ? (
                        leadVisualizar.cpfs_socios.split(',')
                          .filter((c: string) => c.trim() !== "")
                          .map((cpf: string, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-zinc-800 p-2 rounded-lg border text-slate-600 dark:text-zinc-400 font-mono flex items-center gap-1.5 shadow-sm truncate">
                              <span className="text-slate-400 text-[10px]">🪪</span> {cpf.trim()}
                            </div>
                          ))
                      ) : (
                        <span className="text-slate-400 font-medium italic text-[11px]">Nenhum documento listado</span>
                      )}
                    </div>
                  </div>

                </div>

                {leadVisualizar.faixas_etarias && (
                  <div className="pt-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Faixas Etárias Identificadas</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5">{leadVisualizar.faixas_etarias}</div>
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 flex justify-end rounded-b-3xl">
              <button 
                type="button"
                onClick={() => setLeadVisualizar(null)} 
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-slate-800 dark:bg-zinc-700 text-white rounded-xl shadow hover:bg-slate-900 dark:hover:bg-zinc-600 transition-all active:scale-95"
              >
                Fechar Ficha
              </button>
            </div>
                </div>
              </div>
            )}

            {/* Modal: Ajuste Manual (Editar Lead Prospecção) */}
            {leadEditar && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                  
                  {/* Cabeçalho */}
                  <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50 rounded-t-3xl">
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-zinc-100 uppercase text-sm tracking-tight">Prospecção & Ajuste de Registro</h3>
                      <p className="text-[11px] text-slate-400 font-medium">CNPJ: {leadEditar.cnpj}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setLeadEditar(null)} 
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <X className="w-5 h-5"/>
                    </button>
                  </div>

                  {/* Corpo do Modal com Scroll */}
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    
                    {/* SEÇÃO 1: STATUS E AGENDAMENTO */}
                    <div className="bg-blue-50/40 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100/60 dark:border-blue-900/30 space-y-4">
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-2">Controle de Prospecção</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Status da Prospecção</label>
                          <select 
                            value={leadEditar.status_prospeccao || "nao_contatado"} 
                            onChange={e => setLeadEditar({...leadEditar, status_prospeccao: e.target.value})}
                            className="w-full h-10 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          >
                            <option value="nao_contatado">Não Contatado</option>
                            <option value="em_negociacao">Em Negociação</option>
                            <option value="agendado_retorno">Agendado Retorno</option>
                            <option value="sem_interesse">Sem Interesse</option>
                            <option value="lead_invalido">Lead Inválido / Tel Errado</option>
                            <option value="convertido">Convertido (Cliente)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Data de Retorno</label>
                          <input 
                            type="date" 
                            value={leadEditar.data_retorno || ""} 
                            onChange={e => setLeadEditar({...leadEditar, data_retorno: e.target.value})}
                            className="w-full h-10 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Horário de Retorno</label>
                          <input 
                            type="time" 
                            value={leadEditar.horario_retorno || ""} 
                            onChange={e => setLeadEditar({...leadEditar, horario_retorno: e.target.value})}
                            className="w-full h-10 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 2: DADOS DE CONTATO */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Canais de Contato Direto</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Telefone Principal</label>
                          <input 
                            type="text" 
                            placeholder="(00) 0000-0000"
                            value={leadEditar.ddd_telefone_1 || ""} 
                            onChange={e => setLeadEditar({...leadEditar, ddd_telefone_1: e.target.value})} 
                            className="w-full h-10 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Telefone Adicional / Whats</label>
                          <input 
                            type="text" 
                            placeholder="Ex: (00) 99999-0000"
                            value={leadEditar.telefone_adicional || ""} 
                            onChange={e => setLeadEditar({...leadEditar, telefone_adicional: e.target.value})} 
                            className="w-full h-10 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">E-mail Corporativo</label>
                        <input 
                          type="email" 
                          placeholder="contato@empresa.com"
                          value={leadEditar.email || ""} 
                          onChange={e => setLeadEditar({...leadEditar, email: e.target.value})} 
                          className="w-full h-10 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* SEÇÃO 3: QUADRO DE SÓCIOS COM CORREÇÃO DE TIPAGEM */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quadro de Sócios e Administradores</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nomes dos Sócios (Separados por vírgula)</label>
                          <textarea 
                            rows={2}
                            value={leadEditar.nomes_socios || ""} 
                            onChange={e => setLeadEditar({...leadEditar, nomes_socios: e.target.value})} 
                            placeholder="Sócio Um, Sócio Dois..."
                            className="w-full p-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 outline-none resize-none text-slate-800 dark:text-zinc-100"
                          />
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {leadEditar.nomes_socios?.split(',')
                              .filter((n: string) => n.trim() !== "")
                              .map((socio: string, idx: number) => (
                                <span key={idx} className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] px-2 py-0.5 rounded-md font-medium">
                                  👤 {socio.trim()}
                                </span>
                              ))
                            }
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">CPFs dos Sócios (Separados por vírgula)</label>
                          <textarea 
                            rows={2}
                            value={leadEditar.cpfs_socios || ""} 
                            onChange={e => setLeadEditar({...leadEditar, cpfs_socios: e.target.value})} 
                            placeholder="000.000.000-00, 111.111.111-11"
                            className="w-full p-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 outline-none resize-none text-slate-800 dark:text-zinc-100"
                          />
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {leadEditar.cpfs_socios?.split(',')
                              .filter((c: string) => c.trim() !== "")
                              .map((cpf: string, idx: number) => (
                                <span key={idx} className="bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded-md font-mono">
                                  🪪 {cpf.trim()}
                                </span>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 4: DADOS DA EMPRESA (SOMENTE LEITURA PROTEGIDA) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Informações Cadastrais (Somente Leitura)</h4>
                      
                      <div className="space-y-3 opacity-75">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Descrição CNAE / Nicho</label>
                          <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-300 select-all">
                            {leadEditar.cnae_principal || "---"}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nome Fantasia</label>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase truncate">
                              {leadEditar.nome_fantasia || "---"}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Razão Social</label>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase truncate">
                              {leadEditar.razao_social || "---"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Porte</label>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-center text-xs font-semibold text-slate-600 dark:text-zinc-400">
                              {leadEditar.porte || "---"}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Capital Social</label>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-center text-xs font-mono font-bold text-slate-600 dark:text-zinc-400">
                              {leadEditar.capital_social ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(leadEditar.capital_social) : "---"}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Município</label>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-center text-xs font-semibold text-slate-600 dark:text-zinc-400 truncate uppercase">
                              {leadEditar.municipio || "---"}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">UF</label>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-center text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase">
                              {leadEditar.uf || "---"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Rodapé de Ações */}
                  <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 flex justify-end gap-2 rounded-b-3xl">
                    <button 
                      type="button"
                      onClick={() => setLeadEditar(null)} 
                      className="px-5 py-2.5 text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("tab_clientes_frios")
                          .update({
                            status_prospeccao: leadEditar.status_prospeccao,
                            ddd_telefone_1: leadEditar.ddd_telefone_1,
                            email: leadEditar.email,
                            telefone_adicional: leadEditar.telefone_adicional,
                            nomes_socios: leadEditar.nomes_socios,
                            cpfs_socios: leadEditar.cpfs_socios,
                            data_retorno: leadEditar.data_retorno || null, 
                            horario_retorno: leadEditar.horario_retorno || null
                          })
                          .eq("id", leadEditar.id);
                        
                        if (!error) { 
                          toast.success("Registro updated com sucesso!"); 
                          setLeadEditar(null); 
                          buscarLeadsFrios(); 
                        } else {
                          toast.error("Erro ao salvar alterações.");
                        }
                      }} 
                      className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Paginação Profissional */}
            {!loading && leads.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border border-slate-200 rounded-xl shadow-sm">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-750 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginaAtual >= Math.ceil(totalRegistros / itensPorPagina)}
                    onClick={() => setPaginaAtual(prev => prev + 1)}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-750 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-700 font-medium">
                      Exibindo de <span className="font-bold text-blue-600">{((paginaAtual - 1) * itensPorPagina) + 1}</span> até{" "}
                      <span className="font-bold text-blue-600">{Math.min(paginaAtual * itensPorPagina, totalRegistros)}</span> de{" "}
                      <span className="font-bold text-slate-800">{totalRegistros}</span> registros
                    </p>

                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <span>Ver:</span>
                      <select
                        value={itensPorPagina}
                        onChange={(e) => handleMudancaItensPorPagina(Number(e.target.value))}
                        className="rounded-lg border border-gray-300 bg-white py-1 px-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none cursor-pointer transition hover:bg-gray-50"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        disabled={paginaAtual === 1}
                        onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        ◀ Anterior
                      </button>
                      <div className="bg-slate-50 border-t border-b border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 min-w-[100px] text-center select-none">
                        Pág. {paginaAtual} de {Math.ceil(totalRegistros / itensPorPagina) || 1}
                      </div>
                      <button
                        disabled={paginaAtual >= Math.ceil(totalRegistros / itensPorPagina)}
                        onClick={() => setPaginaAtual(prev => prev + 1)}
                        className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Próximo ▶
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}

            {/* Barra Flutuante de Rota de Visitas */}
            {selecionados.length > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 z-50 border border-slate-700 w-[90%] max-w-5xl">
                
                {/* Indicador de quantidade de leads selecionados */}
                <div className="flex items-center gap-2 min-w-[160px]">
                  <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-sm">
                    {selecionados.length}
                  </div>
                  <p className="text-sm font-medium text-slate-300">Leads na rota</p>
                </div>

                {/* Campo de busca / GPS do ponto de partida */}
                <div className="flex-1 w-full relative flex items-center">
                  <input
                    type="text"
                    placeholder={pontoPartida.startsWith("GPS:") ? "📍 Usando a localização atual..." : "Digite o Bairro/Cidade de Partida..."}
                    value={pontoPartida.startsWith("GPS:") ? "" : pontoPartida}
                    disabled={pontoPartida.startsWith("GPS:")}
                    onChange={(e) => setPontoPartida(e.target.value)}
                    className="w-full bg-slate-800 text-sm text-white placeholder-slate-400 pl-4 pr-32 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 disabled:bg-slate-800/50 disabled:text-blue-400 disabled:font-medium"
                  />
                  <div className="absolute right-2 flex gap-1">
                    {pontoPartida.startsWith("GPS:") ? (
                      <button
                        onClick={() => setPontoPartida("")}
                        className="bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[11px] font-bold px-2.5 py-1 rounded-lg transition"
                      >
                        Limpar GPS
                      </button>
                    ) : (
                      <button
                        onClick={capturarLocalizacaoAtual}
                        className="bg-blue-950/60 hover:bg-blue-900 text-blue-400 text-[11px] font-bold px-2.5 py-1 rounded-lg transition border border-blue-800/30 flex items-center gap-1"
                      >
                        📍 Usar GPS
                      </button>
                    )}
                  </div>
                </div>

                {/* Bloco de Ações (Botões) */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  {/* Botão do WhatsApp */}
                  <button
                    onClick={exportarRotaWhatsApp}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap shadow-lg active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Rota WhatsApp
                  </button>

                  {/* NOVO BOTÃO CUSTOMIZADO DE IMPRESSÃO AQUI */}
                  <button
                    onClick={exportarFichasPDF}
                    className="w-full md:w-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap shadow-lg active:scale-95 border border-slate-600"
                  >
                    <Printer className="w-4 h-4" />
                    Exportar Fichas (PDF)
                  </button>

                  {/* 🚀 O SEU NOVO BOTÃO DE BINGO ENTRA EXATAMENTE AQUI: */}
                  <button
                    onClick={exportarCampanhaCSV}
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap shadow-lg active:scale-95"
                  >
                    📊 Exportar para Central de Emails
                  </button>
                </div>

              </div>
            )}

            <RelatorioProdutividadeModal
              isOpen={mostrarModalRelatorio}
              onClose={() => setMostrarModalRelatorio(false)}
              corretorId={perfilUsuario?.tipo_usuario === "CORRETOR" ? perfilUsuario?.id : undefined}
              corretoraId={perfilUsuario?.corretora_id}
            />

    </div>
  );
}
