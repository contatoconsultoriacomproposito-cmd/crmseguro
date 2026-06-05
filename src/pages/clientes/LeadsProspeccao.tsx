import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Calendar, CheckCircle2, Loader2,
  Upload, Trash2, Eye, Edit3, Check, Plus, X, MessageSquare, Clock, Printer
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import { maskCPF, maskCNPJ, maskPhone } from "../../utils/masks";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

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
  const ITENS_POR_PAGINA = 100;

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
  const [filtroMei, setFiltroMei] = useState(""); // "" = Todos, "true" = Sim, "false" = Não
  const [filtroSimples, setFiltroSimples] = useState("");
  const [filtroMatriz, setFiltroMatriz] = useState("");
  const [filtroCapitalMin, setFiltroCapitalMin] = useState("");
  const [filtroCapitalMax, setFiltroCapitalMax] = useState("");
  const [filtroCep, setFiltroCep] = useState("");
  const [filtroSituacaoCadastral, setFiltroSituacaoCadastral] = useState("");
  const [filtroDataAberturaMin, setFiltroDataAberturaMin] = useState("");
  const [filtroDataAberturaMax, setFiltroDataAberturaMax] = useState("");

  // Estados dos Modais Modulares
  const [leadVisualizar, setLeadVisualizar] = useState<any>(null);
  const [leadEditar, setLeadEditar] = useState<any>(null);
  const [leadTimeline, setLeadTimeline] = useState<any>(null);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);
  const [novaAcaoObs, setNovaAcaoObs] = useState("");
  const [novaAcaoRetorno, setNovaAcaoRetorno] = useState("");
  const [novaAcaoHorarioRetorno, setNovaAcaoHorarioRetorno] = useState("");
  const [resultadoAcao, setResultadoAcao] = useState("em_prospeccao");



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

  // Filtro de datas

  const [filtroDataRetornoMin, setFiltroDataRetornoMin] = useState("");
  const [filtroDataRetornoMax, setFiltroDataRetornoMax] = useState("");

  // Botão retração

  const [painelExpandido, setPainelExpandido] = useState(false); // Começa recolhido (false) ou expandido (true)

  useEffect(() => {
  const handler = setTimeout(() => {
    setPesquisaGeralDebounced(pesquisaGeral);
  }, 500); // Espera 500ms após o usuário parar de digitar

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

  useEffect(() => {
    if (perfilUsuario) {
      buscarLeadsFrios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilUsuario, filtroUf, filtroMunicipio, filtroBairro, 
    filtroCnaesSelecionados, filtroStatus, filtroPorte, filtroMei, 
    filtroSimples, filtroMatriz, filtroCapitalMin, filtroCapitalMax, 
    paginaAtual, pesquisaGeralDebounced, filtroDataRetornoMin, filtroDataRetornoMax, filtroCep, 
    filtroSituacaoCadastral, filtroDataAberturaMin, filtroDataAberturaMax]);

  //Resetar a Página ao Mudar os Filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroUf, filtroMunicipio, filtroBairro, filtroCnaesSelecionados, 
    filtroStatus, filtroPorte, filtroMei, filtroSimples, filtroMatriz, 
    filtroCapitalMin, filtroCapitalMax, pesquisaGeralDebounced,
    filtroDataRetornoMin, filtroDataRetornoMax, filtroCep, 
    filtroSituacaoCadastral,filtroDataAberturaMin, filtroDataAberturaMax]);

// useEffect Definitivo: Abre o modal por ID local ou buscando diretamente no Supabase se paginado/filtrado
  useEffect(() => {
    // Só prossegue se o perfil do usuário já estiver carregado (essencial para segurança)
    if (!perfilUsuario) return;

    const urlParams = new URLSearchParams(window.location.search);
    const leadIdDaUrl = urlParams.get('leadId');

    if (leadIdDaUrl) {
      // 1. Tenta encontrar na lista que já foi carregada localmente na página
      const leadLocal = leads.find((l) => l.id === leadIdDaUrl);

      if (leadLocal) {
        abrirTimeline(leadLocal);
        window.history.replaceState({}, document.title, window.location.pathname);
      } 
      // 2. Se não achou localmente (bug resolvido aqui!), busca direto no banco de dados
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
              // Abre a modal roxa com os dados completos vindos direto do Supabase
              abrirTimeline(leadDoBanco);
            } else {
              toast.error("Lead da notificação não foi localizado.");
            }
          } catch (err: any) {
            console.error("Erro ao buscar lead da URL de forma isolada:", err);
          } finally {
            // Limpa o parâmetro da URL para não reexecutar em novos cliques/filtros
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
      // 1. Define os limites matemáticos da paginação (Ex: pág 1 -> 0 a 99)
      const de = (paginaAtual - 1) * ITENS_POR_PAGINA;
      const ate = de + ITENS_POR_PAGINA - 1;

      // 2. Solicita a contagem exata ({ count: "exact" }) para sabermos o total de páginas
      let query = supabase
        .from("tab_clientes_frios")
        .select("*", { count: "exact" })
        .eq("corretora_id", perfilUsuario.corretora_id);

      // 🎯 LÓGICA DE FILTRAGEM POR TEXTO (PESQUISA GERAL)
      if (pesquisaGeralDebounced) {
        query = query.or(`razao_social.ilike.%${pesquisaGeralDebounced}%,nome_fantasia.ilike.%${pesquisaGeralDebounced}%,cnpj.ilike.%${pesquisaGeralDebounced}%`);
      }

      // 🎯 CORREÇÃO CRÍTICA DO FILTRO DE STATUS DA GRADE PRINCIPAL
      if (filtroStatus) {
        query = query.eq("status_prospeccao", filtroStatus);
      } else {
        // Se não houver filtro de status ativo, traz tudo do fluxo normal ocultando APENAS quem já virou cliente do CRM (convertido)
        query = query.neq("status_prospeccao", "convertido");
      }

      // 3. Mantém suas regras estritas de níveis de acesso
      if (perfilUsuario.tipo_usuario === "CORRETOR") {
        query = query.eq("corretor_id", perfilUsuario.id);
      }

      // 4. Filtros Geográficos Inteligentes
      if (filtroUf) query = query.ilike("uf", `%${filtroUf}%`);
      if (filtroMunicipio) query = query.ilike("municipio", `%${filtroMunicipio}%`);
      if (filtroBairro) query = query.ilike("bairro", `%${filtroBairro}%`);
      if (filtroCnaesSelecionados.length > 0) { 
        query = query.in("cnae_principal", filtroCnaesSelecionados);
      }
      // 🎯 NOVOS: Filtros de Abertura e Situação Cadastral
      if (filtroCep) query = query.ilike("cep", `%${filtroCep.replace(/\D/g, '')}%`);
      if (filtroSituacaoCadastral) query = query.eq("situacao_cadastral", filtroSituacaoCadastral);
      if (filtroDataAberturaMin) query = query.gte("data_abertura", filtroDataAberturaMin)
      if (filtroDataAberturaMax) query = query.lte("data_abertura", filtroDataAberturaMax);

      // 🎯 5. NOVOS FILTROS AVANÇADOS
      if (filtroPorte) query = query.eq("porte", filtroPorte);
      if (filtroMei !== "") query = query.eq("opcao_pelo_mei", filtroMei === "true");
      if (filtroSimples !== "") query = query.eq("opcao_pelo_simples", filtroSimples === "true");
      if (filtroMatriz) query = query.eq("descricao_identificador_matriz_filial", filtroMatriz);
      if (filtroCapitalMin) query = query.gte("capital_social", Number(filtroCapitalMin));
      if (filtroCapitalMax) query = query.lte("capital_social", Number(filtroCapitalMax));
      if (filtroDataRetornoMin) query = query.gte("data_retorno", filtroDataRetornoMin);
      if (filtroDataRetornoMax) query = query.lte("data_retorno", filtroDataRetornoMax);

      // 6. Aplica a limitação de linhas (.range) para trazer apenas 100 por vez
      const { data, error, count } = await query
        .order("importado_em", { ascending: false })
        .range(de, ate);

      if (error) throw error;

      // 6. Alimenta a listagem global de CNAEs com contagem em tempo real baseada nos outros filtros aplicados
      try {
        let cnaeQuery = supabase
          .from("tab_clientes_frios")
          .select("cnae_principal")
          .eq("corretora_id", perfilUsuario.corretora_id);

        // 🎯 CORREÇÃO CRÍTICA DO FILTRO DE STATUS NA CONTAGEM DO DROPDOWN DE CNAE
        if (filtroStatus) {
          cnaeQuery = cnaeQuery.eq("status_prospeccao", filtroStatus);
        } else {
          cnaeQuery = cnaeQuery.neq("status_prospeccao", "convertido");
        }

        if (perfilUsuario.tipo_usuario === "CORRETOR") {
          cnaeQuery = cnaeQuery.eq("corretor_id", perfilUsuario.id);
        }

        if (pesquisaGeralDebounced) {
          cnaeQuery = cnaeQuery.or(`razao_social.ilike.%${pesquisaGeralDebounced}%,nome_fantasia.ilike.%${pesquisaGeralDebounced}%,cnpj.ilike.%${pesquisaGeralDebounced}%`);
        }

        // Aplica os demais filtros de segmentação (menos o próprio filtroCnaesSelecionados)
        if (filtroUf) cnaeQuery = cnaeQuery.ilike("uf", `%${filtroUf}%`);
        if (filtroMunicipio) cnaeQuery = cnaeQuery.ilike("municipio", `%${filtroMunicipio}%`);
        if (filtroBairro) cnaeQuery = cnaeQuery.ilike("bairro", `%${filtroBairro}%`);
        if (filtroPorte) cnaeQuery = cnaeQuery.eq("porte", filtroPorte);
        if (filtroMei !== "") cnaeQuery = cnaeQuery.eq("opcao_pelo_mei", filtroMei === "true");
        if (filtroSimples !== "") cnaeQuery = cnaeQuery.eq("opcao_pelo_simples", filtroSimples === "true");
        if (filtroMatriz) cnaeQuery = cnaeQuery.eq("descricao_identificador_matriz_filial", filtroMatriz);
        if (filtroCapitalMin) cnaeQuery = cnaeQuery.gte("capital_social", Number(filtroCapitalMin));
        if (filtroCapitalMax) cnaeQuery = cnaeQuery.lte("capital_social", Number(filtroCapitalMax));
        if (filtroDataRetornoMin) cnaeQuery = cnaeQuery.gte("data_retorno", filtroDataRetornoMin);
        if (filtroDataRetornoMax) cnaeQuery = cnaeQuery.lte("data_retorno", filtroDataRetornoMax);

        const { data: cnaeData } = await cnaeQuery;

        if (cnaeData) {
          const contagem: { [key: string]: number } = {};
          cnaeData.forEach((item: any) => {
            const cnaeNome = item.cnae_principal?.trim();
            if (cnaeNome) {
              contagem[cnaeNome] = (contagem[cnaeNome] || 0) + 1;
            }
          });

          const listaMapeada = Object.entries(contagem).map(([cnae, qtd]) => ({
            cnae,
            quantidade: qtd
          })).sort((a, b) => b.quantidade - a.quantidade);

          setTodosCnaesDisponiveis(listaMapeada);
        }
      } catch (err) {
        console.error("Erro ao calcular contagem de CNAEs:", err);
      }

      // 7. Define os estados locais de dados e controle de páginas
      setLeads(data || []);
      setTotalRegistros(count || 0);
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
      
      // 🎯 A CORREÇÃO: Regex que divide pelo delimitador, MAS ignora os que estão dentro de aspas duplas!
      const regexSeparador = new RegExp(`${delimitador}(?=(?:[^"]*"[^"]*")*[^"]*$)`);

      // Aplicamos o regexSeparador no lugar do .split(delimitador) tradicional
      const headers = lines[0].split(regexSeparador).map(h => h.replace(/^["']|["']$/g, "").trim());
      
      const rows = lines.slice(1).map(line => 
        line.split(regexSeparador).map(cell => cell.replace(/^["']|["']$/g, "").trim())
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
              } else if (col.campo === "data_abertura") {
                // Converte DD/MM/YYYY para YYYY-MM-DD para o banco aceitar nativamente
                if (valor && valor.includes("/")) {
                  const [dia, mes, ano] = valor.split("/");
                  item[col.campo] = `${ano}-${mes}-${dia}`;
                } else {
                  item[col.campo] = valor || null;
                }
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
    setNovaAcaoRetorno(lead.data_retorno || ""); // Preenche com o agendamento salvo no lead, se houver
    setNovaAcaoHorarioRetorno(lead.horario_retorno || ""); // <-- ADICIONE ESTA LINHA
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
      // 1. Define o status correto baseado na seleção da tela LOGO NO INÍCIO
      let novoStatus = "em_prospeccao";
      if (resultadoAcao === "ja_cliente") novoStatus = "ja_cliente";
      if (resultadoAcao === "perdido") novoStatus = "perdido";

      // Se for 'perdido' ou 'ja_cliente', limpamos as datas de retorno para tirar do fluxo de agendamentos
      const dataRetornoFinal = novoStatus === "em_prospeccao" ? (novaAcaoRetorno || null) : null;
      const horarioRetornoFinal = novoStatus === "em_prospeccao" ? (novaAcaoHorarioRetorno || null) : null;

      // 2. Grava a observação histórica da ação realizada
      const { error } = await supabase.from("tab_clientes_frios_acoes").insert({
        cliente_frio_id: leadTimeline.id,
        corretor_id: perfilUsuario.id,
        observacao: novaAcaoObs
      });
      if (error) throw error;

      // 3. Atualiza o status E o agendamento diretamente na tabela principal
      const { error: errorUpdate } = await supabase.from("tab_clientes_frios").update({
        status_prospeccao: novoStatus,
        data_retorno: dataRetornoFinal,
        horario_retorno: horarioRetornoFinal
      }).eq("id", leadTimeline.id);
      
      if (errorUpdate) throw errorUpdate;

      toast.success("Ação registrada na linha do tempo!");
      
      // Reseta os campos do formulário da timeline
      setNovaAcaoObs("");
      setNovaAcaoRetorno("");
      setNovaAcaoHorarioRetorno("");
      setResultadoAcao("em_prospeccao");
      
      // Mantém os dados locais sincronizados ao reabrir a timeline e fecha/atualiza o estado
      abrirTimeline({
        ...leadTimeline,
        status_prospeccao: novoStatus,
        data_retorno: dataRetornoFinal,
        horario_retorno: horarioRetornoFinal
      });
      
      // Recarrega a grade principal da tela para aplicar o fundo vermelho instantaneamente
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
        telefone_whats: dadosConversaoCRM.telefone_whats || null,
        data_abertura: leadConversao.data_abertura
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

  const exportarRotaWhatsApp = () => {
    if (selecionados.length === 0) {
      toast.error("Selecione pelo menos 1 lead para exportar a rota.");
      return;
    }

    const leadsParaRota = leads.filter(l => selecionados.includes(l.id));
    let leadsOrdenados = [...leadsParaRota];

    // Se o ponto de partida for uma coordenada GPS (identificada pelo prefixo "GPS:")
    if (pontoPartida.startsWith("GPS:")) {
      const [_, latPartida, lngPartida] = pontoPartida.split(":");
      const lat1 = parseFloat(latPartida);
      const lng1 = parseFloat(lngPartida);

      // Ordena por proximidade matemática de linha reta (Fórmula de distância simplificada)
      leadsOrdenados.sort((a, b) => {
        const latA = parseFloat(a.latitude) || 0;
        const lngA = parseFloat(a.longitude) || 0;
        const latB = parseFloat(b.latitude) || 0;
        const lngB = parseFloat(b.longitude) || 0;

        // Se o lead não tiver lat/lng, joga para o fim
        if (!latA && !latB) return 0;
        if (!latA) return 1;
        if (!latB) return -1;

        const distA = Math.sqrt(Math.pow(latA - lat1, 2) + Math.pow(lngA - lng1, 2));
        const distB = Math.sqrt(Math.pow(latB - lat1, 2) + Math.pow(lngB - lng1, 2));
        return distA - distB;
      });
    } else if (pontoPartida.trim()) {
      // Ordenação tradicional por texto (Bairro / Município)
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

    // Montagem do corpo da mensagem para o WhatsApp
    let textoMensagem = `📍 *ROTA DE VISITAS ENCONTRADA*\n\n`;
    if (pontoPartida.trim()) {
      textoMensagem += `🚗 *Ponto de Partida:* ${pontoPartida.startsWith("GPS:") ? "Minha Localização Atual (GPS)" : pontoPartida}\n`;
    }
    textoMensagem += `=========================\n\n`;

    leadsOrdenados.forEach((lead, index) => {
      const enderecoCompleto = `${lead.logradouro || ""}, ${lead.numero || ""} ${lead.complemento ? "- " + lead.complemento : ""} - ${lead.bairro || ""}, ${lead.municipio || ""} - ${lead.uf || ""}`.replace(/, ,/g, "").trim();
      const linkGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`;
      const telWhatsTratado = lead.ddd_telefone_1 ? String(lead.ddd_telefone_1).replace(/^0/, '') : "";
      const telefoneFormatado = telWhatsTratado ? maskPhone(telWhatsTratado) : "Não informado";

      textoMensagem += `🏢 *${index + 1}. ${lead.nome_fantasia || lead.razao_social || "Empresa sem Nome"}*\n`;
      textoMensagem += `👥 *Sócios:* ${lead.nomes_socios || "Não informados"}\n`;
      textoMensagem += `🗺️ *Endereço:* ${enderecoCompleto || "Não cadastrado"}\n`;
      textoMensagem += `📞 *Telefone:* ${telefoneFormatado}\n`;
      if (enderecoCompleto) {
        textoMensagem += `🔗 *Navegar por GPS:* ${linkGoogleMaps}\n`;
      }
      textoMensagem += `\n-------------------------\n\n`;
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
        // Salva com um prefixo oculto para a nossa função de ordenação identificar
        setPontoPartida(`GPS:${latitude}:${longitude}`);
        toast.success("📍 Localização atual definida com sucesso!");
      },
      (error) => {
        console.error(error);
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

    // 1. Cria o documento PDF no formato A4, orientação Retrato (Portrait), unidade em milímetros (mm)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Filtra apenas os clientes que o usuário marcou na tela
    const leadsSelecionados = leads.filter(l => selecionados.includes(l.id));

    // Configurações de layout da página A4 (210mm x 297mm)
    const margemEsquerda = 15;
    let posicaoY = 20; 
    const larguraDisponivel = 180; // 210mm - 30mm de margens
    const alturaMaximaPagina = 275;

    // Cabeçalho Principal do PDF (Apenas na primeira página)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Cor Slate-900
    doc.text("ROTEIRO DE VISITAS EM CAMPO", margemEsquerda, posicaoY);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Cor Slate-500
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margemEsquerda, posicaoY + 5);
    
    posicaoY += 15;

    // Percorre cada cliente selecionado para montar o bloco visual customizado
    leadsSelecionados.forEach((lead, index) => {
      const alturaBlocoCliente = 55; // Altura fixa de cada ficha em milímetros

      // Controle de Quebra de Página Automática: Se o próximo bloco for passar do limite do papel, cria nova folha
      if (posicaoY + alturaBlocoCliente > alturaMaximaPagina) {
        doc.addPage();
        posicaoY = 20; // Reseta o topo na nova página
      }

      // --- DESIGN DA FICHA DO CLIENTE ---
      
      // 1. Fundo cinza claro para a barra de título do cliente
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(margemEsquerda, posicaoY, larguraDisponivel, 7, "F");
      
      // Borda externa fina ao redor de toda a ficha do cliente
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.setLineWidth(0.2);
      doc.rect(margemEsquerda, posicaoY, larguraDisponivel, alturaBlocoCliente);

      // Texto do título (Número + Nome Fantasia ou Razão Social)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // Slate-800
      const nomeEmpresa = `${index + 1}. ${lead.nome_fantasia || lead.razao_social || "Empresa sem Nome"}`;
      // Corta o nome se for excessivamente longo para não vazar o layout
      doc.text(nomeEmpresa.substring(0, 75), margemEsquerda + 3, posicaoY + 5);

      // Linha divisória interna vertical dividindo Dados (60%) e Anotações (40%)
      const larguraDados = 110; 
      const divisorX = margemEsquerda + larguraDados;
      doc.line(divisorX, posicaoY + 7, divisorX, posicaoY + alturaBlocoCliente);

      // 2. PREENCHIMENTO DOS DADOS (Coluna da Esquerda)
      let dadosY = posicaoY + 13;
      doc.setFontSize(9);

      // CNPJ
      doc.setFont("Helvetica", "bold"); doc.text("CNPJ:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal"); doc.text(lead.cnpj ? maskCNPJ(lead.cnpj) : "Não informado", margemEsquerda + 16, dadosY);

      // 🎯 NOVA LINHA: Data de Abertura no PDF
      dadosY += 6;
      doc.setFont("Helvetica", "bold"); doc.text("Abertura:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal");
      const dataPdf = lead.data_abertura ? new Date(lead.data_abertura + "T00:00:00").toLocaleDateString('pt-BR') : "Não informada";
      doc.text(dataPdf, margemEsquerda + 21, dadosY);
      
      // Razão Social
      dadosY += 6;
      doc.setFont("Helvetica", "bold"); doc.text("Razão Social:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal"); 
      const razaoCortada = (lead.razao_social || "Não informada").substring(0, 45);
      doc.text(razaoCortada, margemEsquerda + 26, dadosY);

      // Sócios
      dadosY += 6;
      doc.setFont("Helvetica", "bold"); doc.text("Sócios:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal");
      const sociosCortados = (lead.nomes_socios || "Não informados").substring(0, 48);
      doc.text(sociosCortados, margemEsquerda + 16, dadosY);

      // Capital Social
      dadosY += 6;
      doc.setFont("Helvetica", "bold"); doc.text("Capital Social:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal");
      const capitalFormatado = lead.capital_social 
        ? Number(lead.capital_social).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : "Não informado";
      doc.text(capitalFormatado, margemEsquerda + 27, dadosY);

      // Endereço (Um extra importante para o vendedor saber onde ir)
      dadosY += 6;
      doc.setFont("Helvetica", "bold"); doc.text("Endereço:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal");
      const enderecoCompleto = `${lead.logradouro || ""}, ${lead.numero || ""} - ${lead.bairro || ""}, ${lead.municipio || ""}`.substring(0, 45);
      doc.text(enderecoCompleto, margemEsquerda + 20, dadosY);

      // Telefone
      dadosY += 6;
      doc.setFont("Helvetica", "bold"); doc.text("Telefone:", margemEsquerda + 3, dadosY);
      doc.setFont("Helvetica", "normal");
      // 🎯 CORREÇÃO: Remove o zero à esquerda antes de aplicar a máscara
      const telPdfTratado = lead.ddd_telefone_1 ? lead.ddd_telefone_1.replace(/^0/, '') : "";
      doc.text(telPdfTratado ? maskPhone(telPdfTratado) : "Não informado", margemEsquerda + 19, dadosY);


      // 3. CAMPO LIVRE PARA ANOTAÇÕES (Coluna da Direita - Efeito pautado pontilhado)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text("ANOTAÇÕES DA VISITA (CANETA):", divisorX + 4, posicaoY + 12);

      // Desenha as linhas pontilhadas espaçadas para escrita confortável à mão
      doc.setDrawColor(226, 232, 240); // Slate-200
      let linhaAnotacaoY = CollegeLineY(posicaoY + 20);
      
      for (let i = 0; i < 4; i++) {
        // Altera o estilo da linha para tracejado/pontilhado
        doc.setLineDashPattern([1, 1], 0);
        doc.line(divisorX + 4, linhaAnotacaoY, margemEsquerda + larguraDisponivel - 4, linhaAnotacaoY);
        linhaAnotacaoY += 7; // Espaçamento perfeito de 7mm entre linhas pautadas
      }
      // Reseta o estilo de linha para sólida normal nas próximas iterações
      doc.setLineDashPattern([], 0);

      // Avança a posição Y para o início do bloco do próximo cliente, adicionando um espaçamento de margem de 6mm
      posicaoY += alturaBlocoCliente + 6;
    });

    // Auxiliar para legibilidade da altura da linha pautada
    function CollegeLineY(start: number) { return start; }

    // Salva o PDF gerado forçando o download imediato no dispositivo do usuário
    doc.save(`roteiro_visitas_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF customizado exportado com sucesso! 📄");
  };

  
  // 🎯 FUNÇÃO PARA EXPORTAR APENAS NOME E EMAIL PARA CAMPANHAS DE MARKETING (TRATADO MINÚSCULO)
  const exportarCampanhaCSV = () => {
    if (leads.length === 0) {
      toast.error("Não há registros filtrados para exportar.");
      return;
    }

    // 1. Cabeçalho esperado pelo importador da Central de Disparos
    const cabecalho = "nome,email\n";

    // 2. Mapeia as linhas usando Nome Fantasia/Razão Social e o Email do seu estado 'leads'
    const linhas = leads
      .map((cliente: any) => {
        // Trata strings para evitar quebras de linha ou vírgulas que estraguem o CSV
        const nomeLimpo = (cliente.nome_fantasia || cliente.razao_social || "Empresa sem Nome")
          .replace(/,/g, " ")
          .replace(/\n/g, " ")
          .trim();
        
        // 🎯 Força o e-mail a ficar 100% em letras minúsculas e remove espaços vazios
        const emailLimpo = (cliente.email || "").trim().toLowerCase();

        return `"${nomeLimpo}","${emailLimpo}"`;
      })
      .filter((linha: string) => {
        // Garante que não vai exportar linhas onde o e-mail esteja em branco
        return !linha.endsWith('""');
      })
      .join("\n");

    if (linhas.length === 0) {
      toast.error("Nenhum cliente com e-mail válido encontrado no filtro atual.");
      return;
    }

    // 3. Cria o arquivo BLOB e força o download no navegador
    const conteudoFinal = cabecalho + linhas;
    const blob = new Blob(["\ufeff" + conteudoFinal], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Nome dinâmico baseado no seu estado 'filtroMunicipio'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                
                {/* 1º ELEMENTO (Canto Esquerdo): Porte da Empresa (Movido para cá) */}
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

                {/* 5º ELEMENTO (Canto Direito): Dropdown Customizado de CNAE (Movido para cá) */}
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
                    return (
                      /* Mantido right-0 para colar na borda direita do container do painel avançado */
                      <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-fade-in w-[90vw] sm:w-[400px] md:w-[480px]">
                        <input type="text" autoFocus value={termoPesquisaCnae} onChange={(e) => setTermoPesquisaCnae(e.target.value)} placeholder="Digite para pesquisar..." className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-medium" />
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                          {cnaesFiltrados.length > 0 ? (
                            cnaesFiltrados.map((item: any) => {
                              const incluso = filtroCnaesSelecionados.includes(item.cnae);
                              return (
                                <label key={item.cnae} className="flex items-center justify-between gap-2.5 p-2 hover:bg-slate-50 cursor-pointer transition rounded-md select-none">
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <input type="checkbox" checked={incluso} onChange={() => setFiltroCnaesSelecionados(prev => incluso ? prev.filter(i => i !== item.cnae) : [...prev, item.cnae])} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 cursor-pointer flex-shrink-0" />
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
                        <div className="border-t pt-2 flex justify-between items-center bg-slate-50 -mx-2 -mb-2 p-2 rounded-b-xl">
                          <div>
                            {filtroCnaesSelecionados.length > 0 && (
                              <button type="button" onClick={() => setFiltroCnaesSelecionados([])} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase transition">Limpar</button>
                            )}
                          </div>
                          <button type="button" onClick={() => { setDropdownCnaeAberto(false); setTermoPesquisaCnae(""); }} className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold uppercase transition shadow-sm">Fechar</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>

            {/* LINHA 4: CONTROLE E AÇÕES */}
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">4. Ações de Prospecção</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Agendado Para (Início)</label>
                  <input type="date" value={filtroDataRetornoMin} onChange={(e) => setFiltroDataRetornoMin(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Agendado Para (Fim)</label>
                  <input type="date" value={filtroDataRetornoMax} onChange={(e) => setFiltroDataRetornoMax(e.target.value)} className="w-full p-2 rounded-md border text-sm outline-none focus:border-blue-500 bg-white text-slate-700" />
                </div>
              </div>
            </div>

          </div>
        )}
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
                    <div className="text-xs text-gray-400 font-mono mt-0.5">
                      {maskCNPJ(lead.cnpj)}
                      {/* 🎯 DATA ADICIONADA AQUI */}
                      {lead.data_abertura && ` • Aberta em: ${new Date(lead.data_abertura + "T00:00:00").toLocaleDateString('pt-BR')}`}
                    </div>
                    
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
                  
                  {/* COLUNA DE STATUS ATUALIZADA E CORRIGIDA */}
                  <td className="p-4">
                    {lead.status_prospeccao === 'ja_cliente' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                        👑 Já é Cliente
                      </span>
                    ) : lead.status_prospeccao === 'em_prospeccao' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                        🔄 Em Prospecção
                      </span>
                    ) : lead.status_prospeccao === 'perdido' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-red-100 text-red-700 border border-red-200 shadow-sm">
                        ❌ Perdido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                        Não Contatado
                      </span>
                    )}
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
                  <p className="text-[11px] text-purple-100 font-medium">
                    {leadTimeline.nome_fantasia || leadTimeline.razao_social}
                    {/* 🎯 CORREÇÃO 1: Exibe o agendamento atual 1 para 1 do cliente diretamente no cabeçalho */}
                    {leadTimeline.data_retorno && (
                      <span className="ml-2 bg-purple-700 text-amber-300 px-1.5 py-0.5 rounded font-bold text-[10px]">
                        ⏰ RETORNO: {new Date(leadTimeline.data_retorno + "T00:00:00").toLocaleDateString("pt-BR")}
                        {leadTimeline.horario_retorno ? ` às ${leadTimeline.horario_retorno.substring(0, 5)}` : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setLeadTimeline(null)} className="p-1 rounded-lg hover:bg-purple-700"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-4 border-b bg-slate-50 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">O que foi conversado / Resumo do Acionamento</label>
                <textarea rows={2} value={novaAcaoObs} onChange={e => setNovaAcaoObs(e.target.value)} placeholder="Ex: Liguei para o sócio e ele pediu para retornar na próxima semana..." className="w-full p-2.5 border rounded-lg text-sm resize-none outline-none focus:border-purple-500"></textarea>
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* 🎯 CORREÇÃO 2: Adicionado o input de horário lado a lado com o de data */}


                <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-600 uppercase">Agendar Retorno:</span>
                    <input type="date" value={novaAcaoRetorno} onChange={e => setNovaAcaoRetorno(e.target.value)} className="p-1.5 border rounded-lg text-sm outline-none focus:border-purple-500" />
                    <input type="time" value={novaAcaoHorarioRetorno} onChange={e => setNovaAcaoHorarioRetorno(e.target.value)} className="p-1.5 border rounded-lg text-sm outline-none focus:border-purple-500" />
                  </div>

                  {/* 📌 NOVO SELETOR PARA PERDIDO / RESULTADO DA AÇÃO */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase">Status:</span>
                    <select 
                      value={resultadoAcao} 
                      onChange={e => setResultadoAcao(e.target.value)} 
                      className="p-1.5 border rounded-lg text-xs bg-white font-semibold outline-none focus:border-purple-500 text-slate-700"
                    >
                      <option value="em_prospeccao">🔄 Em Prospecção</option>
                      <option value="perdido">❌ Perdido (Dispensou)</option>
                    </select>
                  </div>
                </div>

                <button onClick={salvarNovaAcaoAcompanhamento} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-sm whitespace-nowrap ml-auto">
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
                      {/* 🎯 OBSERVAÇÃO: O bloco antigo do acao.data_retorno foi removido daqui pois o histórico de ações não carrega mais o agendamento individual */}
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
              <div><strong>Data de Abertura:</strong> <div className="text-sm text-slate-700 font-medium mt-0.5">{leadVisualizar.data_abertura ? new Date(leadVisualizar.data_abertura + "T00:00:00").toLocaleDateString('pt-BR') : 'Não informada'}</div></div>
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
              disabled={paginaAtual >= Math.ceil(totalRegistros / ITENS_POR_PAGINA)}
              onClick={() => setPaginaAtual(prev => prev + 1)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-750 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700 font-medium">
                Exibindo de <span className="font-bold text-blue-600">{((paginaAtual - 1) * ITENS_POR_PAGINA) + 1}</span> até{" "}
                <span className="font-bold text-blue-600">{Math.min(paginaAtual * ITENS_POR_PAGINA, totalRegistros)}</span> de{" "}
                <span className="font-bold text-slate-800">{totalRegistros}</span> registros
              </p>
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
                  Pág. {paginaAtual} de {Math.ceil(totalRegistros / ITENS_POR_PAGINA) || 1}
                </div>
                <button
                  disabled={paginaAtual >= Math.ceil(totalRegistros / ITENS_POR_PAGINA)}
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
              placeholder={pontoPartida.startsWith("GPS:") ? "📍 Usando sua localização atual..." : "Digite o Bairro/Cidade de Partida..."}
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

    </div>
  
  );
}