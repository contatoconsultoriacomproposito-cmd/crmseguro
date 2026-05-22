import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

interface Campanha {
  id: string;
  nome_evento: string;
  tipo_evento: 'fixo' | 'aniversario';
  mes_dia: string | null;
  mensagem_email: string | null;
  url_arte_storage: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  tipo_cliente: 'PF' | 'PJ';
  nome_fantasia: string | null;
  email: string | null;
  telefone_whats: string | null;
  data_nascimento: string | null;
}

interface ArteStorage {
  name: string;
  id: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

interface MetricasCampanha {
  enviados: number;
  entregues: number;
  abertos: number;
  cliques: number;
}

export default function CampanhasClientes() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // Monitoramento de Seleção
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  
  // Estados para armazenar e carregar os clientes elegíveis
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);

  // Monitoramento de Busca e Seleção de Clientes
  const [termoBusca, setTermoBusca] = useState('');
  const [idsClientesSelecionados, setIdsClientesSelecionados] = useState<string[]>([]);

  // Estados para controle da Lista Alternativa Importada via Arquivo
  const [isListaImportada, setIsListaImportada] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  // Estados para o Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campanhaEmEdicao, setCampanhaEmEdicao] = useState<Campanha | null>(null); 
  const [nomeEvento, setNomeEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState<'fixo' | 'aniversario'>('fixo');
  const [mesDia, setMesDia] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [arteArquivo, setArteArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estados para Gerenciamento do Storage de Artes
  const [listaArtes, setListaArtes] = useState<ArteStorage[]>([]);
  const [totalEspacoMB, setTotalEspacoMB] = useState(0);
  const [carregandoArtes, setCarregandoArtes] = useState(false);

  // Indicadores de Sucesso
  const [metricas, setMetricas] = useState<MetricasCampanha>({ enviados: 0, entregues: 0, abertos: 0, cliques: 0 });
  const [carregandoMetricas, setCarregandoMetricas] = useState(false);

  async function buscarCampanhas() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('tab_campanhas') 
        .select('id, nome_evento, tipo_evento, mes_dia, mensagem_email, url_arte_storage')
        .order('nome_evento', { ascending: true });

      if (error) throw error;
      
      if (data) {
        const campanhasMapeadas: Campanha[] = data.map((c) => ({
          id: c.id,
          nome_evento: c.nome_evento,
          tipo_evento: (c.tipo_evento as 'fixo' | 'aniversario') || 'fixo',
          mes_dia: c.mes_dia,
          mensagem_email: c.mensagem_email,
          url_arte_storage: c.url_arte_storage
        }));
        setCampanhas(campanhasMapeadas);
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    } finally {
      setCarregando(false);
    }
  }

  async function buscarMetricasCampanha(campanhaId: string) {
    try {
      setCarregandoMetricas(true);
      const { data, error } = await supabase
        .from('tab_campanhas_emails_detalhe')
        .select('status_entrega, abriu_email, clicou_whatsapp')
        .eq('id_campanha', campanhaId);

      if (error) throw error;

      if (data) {
        const totais = data.reduce((acc, curr) => {
          acc.enviados++;
          if (curr.status_entrega === 'entregue') acc.entregues++;
          if (curr.abriu_email === true) acc.abertos++;
          if (curr.clicou_whatsapp === true) acc.cliques++;
          return acc;
        }, { enviados: 0, entregues: 0, abertos: 0, cliques: 0 });

        setMetricas(totais);
      } else {
        setMetricas({ enviados: 0, entregues: 0, abertos: 0, cliques: 0 });
      }
    } catch (error) {
      console.error('Erro ao processar indicadores de desempenho:', error);
    } finally {
      setCarregandoMetricas(false);
    }
  }

  async function carregarGerenciadorStorage() {
    try {
      setCarregandoArtes(true);
      const { data, error } = await supabase.storage
        .from('artes-campanhas')
        .list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });

      if (error) throw error;

      if (data) {
        const arquivosValidos = data.filter(item => item.metadata) as unknown as ArteStorage[];
        setListaArtes(arquivosValidos);
        
        const bytesTotais = arquivosValidos.reduce((acc, item) => acc + (item.metadata?.size || 0), 0);
        setTotalEspacoMB(bytesTotais / (1024 * 1024));
      }
    } catch (error) {
      console.error('Erro ao listar arquivos do storage:', error);
    } finally {
      setCarregandoArtes(false);
    }
  }

  async function handleExcluirArteStorage(nomeArquivo: string) {
    if (!confirm(`Deseja remover permanentemente o arquivo "${nomeArquivo}" do Storage?\nIsso liberará espaço na sua conta.`)) return;

    try {
      const { data: urlData } = supabase.storage
        .from('artes-campanhas')
        .getPublicUrl(nomeArquivo);
      const urlParaLimpar = urlData.publicUrl;

      const { error: storageError } = await supabase.storage
        .from('artes-campanhas')
        .remove([nomeArquivo]);

      if (storageError) throw storageError;

      // Corrigido para a tabela unificada tab_campanhas
      const { error: dbError } = await supabase
        .from('tab_campanhas') 
        .update({ url_arte_storage: null })
        .eq('url_arte_storage', urlParaLimpar);

      if (dbError) {
        console.warn('Arquivo removido do Storage, mas houve um erro ao atualizar a tabela de campanhas:', dbError);
      }

      if (campanhaSelecionada && campanhaSelecionada.url_arte_storage === urlParaLimpar) {
        setCampanhaSelecionada(prev => prev ? { ...prev, url_arte_storage: null } : null);
      }

      alert('Arquivo removido do Storage e vínculos atualizados com sucesso!');
      
      carregarGerenciadorStorage();
      buscarCampanhas();
    } catch (error) {
      console.error('Erro ao deletar arquivo do storage:', error);
      alert('Erro ao excluir arquivo.');
    }
  }

  function handleEditarCampanhaPorArte(urlPublica: string) {
    const campanhaCorrespondente = campanhas.find(c => c.url_arte_storage === urlPublica);
    
    if (campanhaCorrespondente) {
      setCampanhaEmEdicao(campanhaCorrespondente);
      setNomeEvento(campanhaCorrespondente.nome_evento);
      setTipoEvento(campanhaCorrespondente.tipo_evento);
      setMesDia(campanhaCorrespondente.mes_dia || '');
      setMsgEmail(campanhaCorrespondente.mensagem_email || '');
      setArteArquivo(null); 
      setIsModalOpen(true);
    } else {
      alert("Esta imagem está salva no Storage, mas não está vinculada a nenhuma campanha ativa no momento.");
    }
  }

  async function buscarClientesElegiveis(campanha: Campanha) {
    try {
      setCarregandoClientes(true);
      setIdsClientesSelecionados([]); 
      setIsListaImportada(false); 
      setErroArquivo(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios_perfis')
        .select('tipo_usuario, corretora_id, id')
        .eq('id', user.id)
        .single();

      if (perfilError || !perfil) {
        console.error('Erro ao buscar perfil do usuário:', perfilError);
        return;
      }

      let query = supabase
        .from('tab_clientes')
        .select('id, nome, tipo_cliente, nome_fantasia, email, telefone_whats, data_nascimento');

      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', perfil.id);
      } else {
        query = query.eq('corretora_id', perfil.corretora_id);
      }

      if (campanha.tipo_evento === 'aniversario') {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const aniversarioHoje = `%-${mes}-${dia}`;
        query = query.ilike('data_nascimento', aniversarioHoje);
      } else {
        query = query.order('nome', { ascending: true }).limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const listaClientes = (data || []) as Cliente[];
      setClientes(listaClientes);
      
      const idsIniciais = listaClientes.filter(c => c.email && c.email.trim() !== '').map(c => c.id);
      setIdsClientesSelecionados(idsIniciais);
    } catch (error) {
      console.error('Erro ao buscar clientes elegíveis:', error);
    } finally {
      setCarregandoClientes(false);
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErroArquivo(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      delimitersToGuess: [';', ',', '\t'], 
      complete: (results) => {
        const dadosBrutos = results.data as any[];

        if (dadosBrutos.length === 0) {
          setErroArquivo("O arquivo importado está vazio.");
          return;
        }

        const chaves = Object.keys(dadosBrutos[0]);
        const chaveNome = chaves.find(k => k.toLowerCase().trim() === 'nome');
        const chaveEmail = chaves.find(k => k.toLowerCase().trim() === 'email');

        if (!chaveNome || !chaveEmail) {
          setErroArquivo("O arquivo precisa conter obrigatoriamente as colunas 'nome' e 'email'.");
          return;
        }

        try {
          const nomeKey = chaveNome as string;
          const emailKey = chaveEmail as string;

          const clientesMapeados: Cliente[] = dadosBrutos
            .filter(item => item[nomeKey] && item[emailKey]) 
            .map((item) => ({
              id: crypto.randomUUID(), 
              nome: String(item[nomeKey]).trim(),
              tipo_cliente: 'PF', 
              nome_fantasia: null,
              email: String(item[emailKey]).trim(),
              telefone_whats: null,
              data_nascimento: null
            }));

          if (clientesMapeados.length === 0) {
            setErroArquivo("Nenhum registro válido com nome e e-mail foi encontrado.");
            return;
          }

          setClientes(clientesMapeados);
          setIsListaImportada(true);
          setTermoBusca(''); 
          
          const idsMapeados = clientesMapeados.filter(c => c.email && c.email.trim() !== '').map(c => c.id);
          setIdsClientesSelecionados(idsMapeados);
          
          alert(`Sucesso! ${clientesMapeados.length} contatos foram carregados do arquivo.`);
        } catch (err: any) {
          setErroArquivo(`Erro ao processar linhas do arquivo: ${err.message}`);
        }
      },
      error: (error) => {
        setErroArquivo(`Erro ao ler o arquivo: ${error.message}`);
      }
    });
  };

  function handleLimparListaImportada() {
    if (campanhaSelecionada) {
      buscarClientesElegiveis(campanhaSelecionada);
    }
  }

  const clientesFiltrados = clientes.filter(cliente => {
    const nomeOriginal = cliente.nome || '';
    const nomeFantasia = cliente.nome_fantasia || '';
    const email = cliente.email || '';
    const termo = termoBusca.toLowerCase();
    
    return nomeOriginal.toLowerCase().includes(termo) || 
           nomeFantasia.toLowerCase().includes(termo) || 
           email.toLowerCase().includes(termo);
  });

  function toggleSelecionarCliente(id: string) {
    setIdsClientesSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  // Refatorado para lidar corretamente com a sincronização do checkbox mestre
  function toggleSelecionarTodos() {
    const clientesComEmailDestaLista = clientesFiltrados.filter(c => c.email && c.email.trim() !== '');
    const todosSelecionados = clientesComEmailDestaLista.every(c => idsClientesSelecionados.includes(c.id));

    if (todosSelecionados) {
      const idsRemover = clientesFiltrados.map(c => c.id);
      setIdsClientesSelecionados(prev => prev.filter(id => !idsRemover.includes(id)));
    } else {
      const novosIds = clientesComEmailDestaLista.map(c => c.id);
      setIdsClientesSelecionados(prev => Array.from(new Set([...prev, ...novosIds])));
    }
  }

  function abrirModalCadastro() {
    setCampanhaEmEdicao(null);
    setNomeEvento('');
    setTipoEvento('fixo');
    setMesDia('');
    setMsgEmail('');
    setArteArquivo(null);
    setIsModalOpen(true);
  }

  function abrirModalEdicao(campanha: Campanha, e: React.MouseEvent) {
    e.stopPropagation(); 
    setCampanhaEmEdicao(campanha);
    setNomeEvento(campanha.nome_evento);
    setTipoEvento(campanha.tipo_evento);
    setMesDia(campanha.mes_dia || '');
    setMsgEmail(campanha.mensagem_email || '');
    setArteArquivo(null); 
    setIsModalOpen(true);
  }

  async function handleDeletarCampanha(id: string, e: React.MouseEvent) {
    e.stopPropagation(); 
    if (!confirm('Tem certeza que deseja excluir permanentemente esta campanha?')) return;

    try {
      // Corrigido para a tabela unificada tab_campanhas
      const { error } = await supabase
        .from('tab_campanhas') 
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (campanhaSelecionada?.id === id) {
        setCampanhaSelecionada(null);
      }

      alert('Campanha excluída com sucesso!');
      buscarCampanhas();
      carregarGerenciadorStorage();
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      alert('Erro ao excluir campanha.');
    }
  }

  async function handleSalvarCampanha(e: React.FormEvent) {
    e.preventDefault();
    try {
      setEnviando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Sessão encerrada. Faça login novamente.');

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', user.id)
        .single();

      const idCorretoraDestaCampanha = perfil?.corretora_id || user.id;
      let urlPublicaArte = campanhaEmEdicao ? campanhaEmEdicao.url_arte_storage : null;

      if (arteArquivo) {
        const pontoIndex = arteArquivo.name.lastIndexOf('.');
        const apenasNome = pontoIndex !== -1 ? arteArquivo.name.substring(0, pontoIndex) : arteArquivo.name;
        const extensao = pontoIndex !== -1 ? arteArquivo.name.substring(pontoIndex) : '';

        const nomeSanitizado = apenasNome
          .normalize('NFD')                     
          .replace(/[\u0300-\u036f]/g, '')     
          .replace(/[^a-zA-Z0-9-_]/g, '_')    
          .replace(/_+/g, '_');              

        const nomeArquivo = `${Date.now()}-${nomeSanitizado}${extensao.toLowerCase()}`;

        const { error: uploadError } = await supabase.storage
          .from('artes-campanhas')
          .upload(nomeArquivo, arteArquivo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('artes-campanhas')
          .getPublicUrl(nomeArquivo);
          
        urlPublicaArte = urlData.publicUrl;
      }

      const dadosCampanhaBanco = {
        nome_evento: nomeEvento,
        tipo_evento: tipoEvento,
        mes_dia: tipoEvento === 'fixo' ? mesDia : null,
        mensagem_email: msgEmail,
        url_arte_storage: urlPublicaArte,
        corretora_id: idCorretoraDestaCampanha
      };

      if (campanhaEmEdicao) {
        // Corrigido para a tabela unificada tab_campanhas
        const { error } = await supabase
          .from('tab_campanhas') 
          .update(dadosCampanhaBanco)
          .eq('id', campanhaEmEdicao.id);

        if (error) throw error;
        
        if (campanhaSelecionada?.id === campanhaEmEdicao.id) {
          setCampanhaSelecionada({ 
            id: campanhaEmEdicao.id, 
            nome_evento: nomeEvento, 
            tipo_evento: tipoEvento, 
            mes_dia: tipoEvento === 'fixo' ? mesDia : null, 
            mensagem_email: msgEmail, 
            url_arte_storage: urlPublicaArte 
          });
        }
        alert('Campanha atualizada com sucesso!');
      } else {
        // Corrigido para a tabela unificada tab_campanhas
        const { error } = await supabase
          .from('tab_campanhas') 
          .insert([dadosCampanhaBanco]);

        if (error) throw error;
        alert('Campanha salva com sucesso!');
      }

      setIsModalOpen(false);
      buscarCampanhas();
      carregarGerenciadorStorage();
    } catch (error) {
      console.error('Erro ao processar campanha:', error);
      alert('Erro ao salvar as alterações da campanha.');
    } finally {
      setEnviando(false);
    }
  }

  const handleDispararEmail = async () => {
    if (!campanhaSelecionada) return;
    
    if (idsClientesSelecionados.length === 0) {
      alert("Selecione ao menos um cliente com e-mail válido.");
      return;
    }

    setEnviando(true);

    try {
      // 🌟 1. Busca o usuário logado na sessão do Supabase antes do disparo
      const { data: { user } } = await supabase.auth.getUser();

      const listaDisparo = clientes
        .filter((c) => idsClientesSelecionados.includes(c.id))
        .map((c) => ({
          id: c.id,
          email: c.email?.trim() || null,
          nome: c.nome || "Cliente",
          tipo_cliente: c.tipo_cliente || "PF",
          nome_fantasia: c.nome_fantasia || ""
        }));

      // 🌟 2. Monta os dados da campanha injetando as credenciais de autoria (corretor e corretora)
      const dadosCampanha = {
        id: campanhaSelecionada.id,
        nome_evento: campanhaSelecionada.nome_evento || "Informativo",
        mensagem_email: campanhaSelecionada.mensagem_email || "",
        url_arte_storage: campanhaSelecionada.url_arte_storage || null,
        tipo_evento: campanhaSelecionada.tipo_evento || "fixo",
        mes_dia: campanhaSelecionada.mes_dia || null,
        
        // Injeta o ID do corretor que está clicando no botão agora
        corretor_id: user?.id || null, 
        // Garante que o corretora_id original vá junto, usando o fallback padrão se necessário
        corretora_id: (campanhaSelecionada as any).corretora_id || 'e8d1fdac-fc46-4646-b1f7-33aedee29f3a'
      };

      // 3. Invoca a Edge Function passando o payload corrigido
      const { error } = await supabase.functions.invoke('disparar-emails', {
        body: {
          campanha: dadosCampanha,
          clientes: listaDisparo,
          mensagem_email: dadosCampanha.mensagem_email,
          nome_evento: dadosCampanha.nome_evento,
          url_arte_storage: dadosCampanha.url_arte_storage,
          destinatarios: listaDisparo
        },
      });

      if (error) throw error;

      alert(`🚀 Sucesso! Campanha enviada para ${listaDisparo.length} destinatários.`);
      buscarMetricasCampanha(campanhaSelecionada.id);
    } catch (error: any) {
      console.error("Erro ao disparar e-mails:", error);
      alert(`Erro ao disparar: ${error.message || "Erro interno no servidor."}`);
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    if (campanhaSelecionada) {
      setTermoBusca(''); 
      buscarClientesElegiveis(campanhaSelecionada);
      buscarMetricasCampanha(campanhaSelecionada.id); 
    } else {
      setClientes([]);
      setIdsClientesSelecionados([]);
      setIsListaImportada(false);
      setErroArquivo(null);
      setMetricas({ enviados: 0, entregues: 0, abertos: 0, cliques: 0 });
    }
  }, [campanhaSelecionada]);

  useEffect(() => {
    buscarCampanhas();
    carregarGerenciadorStorage();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas e Datas Comemorativas</h1>
          <p className="text-sm text-gray-500">Gerencie o relacionamento periódico por E-mail com seus clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SEÇÃO 1: Eventos */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="border-b pb-2 mb-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg text-gray-700">📅 Próximos Eventos</h2>
              <p className="text-xs text-gray-400">Feriados e campanhas</p>
            </div>
            <button 
              onClick={abrirModalCadastro}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              title="Criar nova campanha"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {carregando ? (
              <p className="text-sm text-gray-400 text-center py-4 animate-pulse">Carregando...</p>
            ) : campanhas.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center">
                Nenhuma campanha cadastrada.
              </div>
            ) : (
              campanhas.map((campanha) => (
                <div 
                  key={campanha.id} 
                  onClick={() => setCampanhaSelecionada(campanha)}
                  className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all flex justify-between items-center group ${
                    campanhaSelecionada?.id === campanha.id 
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm' 
                      : 'border-gray-100'
                  }`}
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-medium text-sm text-gray-800 truncate">{campanha.nome_evento}</p>
                    <p className="text-xs text-gray-400">
                      {campanha.tipo_evento === 'aniversario' ? '🎂 Aniversário' : `📅 Campanha Geral`}
                    </p>
                    {campanha.url_arte_storage && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded mt-1 inline-block font-medium">🖼️ Com Arte</span>
                    )}
                  </div>
                  
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirModalEdicao(campanha, e); }}
                      title="Editar campanha"
                      className="p-1.5 bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletarCampanha(campanha.id, e); }}
                      title="Excluir campanha"
                      className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SEÇÃO 2: Clientes Elegíveis */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="border-b pb-2 mb-3 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg text-gray-700">
                👥 {isListaImportada ? '📋 Lista Importada' : 'Clientes Elegíveis'} ({idsClientesSelecionados.length})
              </h2>
              {isListaImportada && (
                <button
                  onClick={handleLimparListaImportada}
                  className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded font-medium transition-all"
                  title="Voltar para a lista automática"
                >
                  ↩️ Base Interna
                </button>
              )}
            </div>
            
            {campanhaSelecionada && (
              <div className="mt-1 bg-gray-50 p-2 rounded-lg border border-gray-200/60">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  📁 Subir lista alternativa (CSV com nome,email):
                </label>
                <input 
                  type="file" 
                  accept=".csv,.txt" 
                  onChange={handleFileUpload}
                  className="block w-full text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {erroArquivo && <p className="text-red-500 text-[10px] mt-1 font-medium">{erroArquivo}</p>}
                {isListaImportada && !erroArquivo && (
                  <p className="text-emerald-600 text-[10px] mt-1 font-bold flex items-center gap-1">
                    🟢 Utilizando dados do arquivo externo!
                  </p>
                )}
              </div>
            )}
          </div>

          {campanhaSelecionada && clientes.length > 0 && (
            <div className="space-y-2 mb-3">
              <input 
                type="text"
                placeholder="🔍 Buscar por nome ou e-mail..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex justify-between items-center text-[11px]">
                <button 
                  type="button"
                  onClick={toggleSelecionarTodos}
                  className="text-blue-600 hover:text-blue-800 font-semibold focus:outline-none"
                >
                  {clientesFiltrados.filter(c => c.email).every(c => idsClientesSelecionados.includes(c.id)) 
                    ? '🔲 Desmarcar Todos' 
                    : '☑️ Selecionar Todos'}
                </button>
                <span className="text-gray-400">{clientesFiltrados.length} encontrados</span>
              </div>
            </div>
          )}
            
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
             {carregandoClientes ? (
               <p className="text-sm text-gray-400 text-center py-4 animate-pulse">Buscando clientes...</p>
             ) : !campanhaSelecionada ? (
               <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center">
                 Selecione uma campanha para ver o público.
               </div>
             ) : clientesFiltrados.length === 0 ? (
               <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center p-4">
                 Nenhum cliente elegível correspondente.
               </div>
             ) : (
               clientesFiltrados.map((cliente) => {
                 const estaSelecionado = idsClientesSelecionados.includes(cliente.id);
                 const temEmail = !!(cliente.email && cliente.email.trim() !== '');

                 return (
                   <div 
                     key={cliente.id} 
                     onClick={() => temEmail && toggleSelecionarCliente(cliente.id)}
                     className={`p-3 border rounded-lg flex justify-between items-center group transition-all select-none ${
                       estaSelecionado 
                         ? 'border-blue-300 bg-blue-50/20' 
                         : 'border-gray-100 bg-gray-50/50'
                     } ${temEmail ? 'cursor-pointer hover:border-blue-200' : 'opacity-60'}`}
                   >
                     <div className="flex items-start gap-2.5 min-w-0 flex-1 mr-2">
                       <div className="mt-0.5 flex-shrink-0">
                         <input 
                           type="checkbox"
                           checked={estaSelecionado}
                           disabled={!temEmail}
                           onChange={() => temEmail && toggleSelecionarCliente(cliente.id)} 
                           className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                         />
                       </div>

                       <div className="flex flex-col gap-0.5 min-w-0">
                         <div className="flex items-center gap-1.5">
                           <p className="font-semibold text-xs text-gray-800 truncate">
                             {cliente.tipo_cliente === 'PF' ? cliente.nome : (cliente.nome_fantasia || cliente.nome)}
                           </p>
                           <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded font-bold flex-shrink-0">{cliente.tipo_cliente}</span>
                         </div>
                         <p className={`text-[11px] truncate ${!temEmail ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                           {cliente.email || '⚠️ Sem e-mail (Disparo travado)'}
                         </p>
                       </div>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

        {/* SEÇÃO 3: Painel de Controle */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <h2 className="font-semibold text-lg text-gray-700 border-b pb-2 mb-4">⚡ Painel de Controle</h2>
            
          {!campanhaSelecionada ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm text-center p-4">
              Selecione uma campanha na lista ao lado para gerenciar as ações e acompanhar resultados.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-4 pr-1">
                
              {/* Box das Artes */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Arte da Campanha</p>
                {campanhaSelecionada.url_arte_storage ? (
                  <div className="w-full h-32 rounded-xl bg-gray-50 border overflow-hidden flex items-center justify-center shadow-inner">
                    <img 
                      src={campanhaSelecionada.url_arte_storage} 
                      alt="Arte da Campanha" 
                      className="max-w-full max-h-full object-contain p-2" 
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-gray-400 bg-gray-50/50">
                    Nenhuma imagem vinculada.
                  </div>
                )}
              </div>

              {/* Box do Texto */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Texto do E-mail</p>
                <div className="bg-zinc-50 border p-2.5 rounded-lg text-xs text-gray-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {campanhaSelecionada.mensagem_email || <span className="italic text-gray-400">Texto não configurado</span>}
                </div>
              </div>

              {/* 📊 PAINEL DE INDICADORES */}
              <div className="bg-gray-50/60 border border-gray-200/60 p-3 rounded-xl space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">📊 Indicadores de Sucesso</p>
                
                {carregandoMetricas ? (
                  <p className="text-[11px] text-gray-400 italic animate-pulse">Atualizando métricas em tempo real...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border rounded-lg p-2 text-center shadow-sm">
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase">Enviados</span>
                      <strong className="text-base text-gray-700">{metricas?.enviados || 0}</strong>
                    </div>
                    <div className="bg-white border rounded-lg p-2 text-center shadow-sm">
                      <span className="block text-[10px] font-semibold text-emerald-500 uppercase">Entregues</span>
                      <strong className="text-base text-emerald-600">{metricas?.entregues || 0}</strong>
                    </div>
                    <div className="bg-white border rounded-lg p-2 text-center shadow-sm">
                      <span className="block text-[10px] font-semibold text-blue-500 uppercase">Abertos (E-mail)</span>
                      <strong className="text-base text-blue-600">{metricas?.abertos || 0}</strong>
                    </div>
                    <div className="bg-white border rounded-lg p-2 text-center shadow-sm">
                      <span className="block text-[10px] font-semibold text-purple-500 uppercase">Cliques (Whats)</span>
                      <strong className="text-base text-purple-600">{metricas?.cliques || 0}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Disparo */}
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={handleDispararEmail}
                  disabled={enviando || idsClientesSelecionados.length === 0}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {enviando ? 'Disparando...' : `✉️ Disparar para Selecionados (${clientes.filter(c => idsClientesSelecionados.includes(c.id)).length})`}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* GERENCIADOR DE IMAGENS DO STORAGE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="border-b pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h2 className="font-bold text-lg text-gray-800">📦 Gerenciador do Storage de Artes</h2>
            <p className="text-xs text-gray-500">Controle as mídias salvas e acesse de forma rápida a edição de sua campanha</p>
          </div>
          <div className="bg-blue-50 text-blue-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-blue-100 flex-shrink-0">
            Espaço Ocupado: {totalEspacoMB.toFixed(2)} MB
          </div>
        </div>

        {carregandoArtes ? (
          <p className="text-sm text-gray-400 text-center py-4 animate-pulse">Carregando mídias...</p>
        ) : listaArtes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-xl bg-gray-50/50">Nenhum arquivo encontrado no Storage de artes.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {listaArtes.map((arte) => {
              const urlPublica = supabase.storage.from('artes-campanhas').getPublicUrl(arte.name).data.publicUrl;
              const tamanhoEmMB = (arte.metadata?.size || 0) / (1024 * 1024);

              return (
                <div key={arte.id || arte.name} className="border border-gray-100 bg-gray-50/50 rounded-xl p-2 relative flex flex-col justify-between group shadow-sm hover:shadow transition-all">
                  <div className="w-full h-24 bg-white rounded-lg border overflow-hidden flex items-center justify-center mb-2">
                    <img src={urlPublica} alt={arte.name} className="max-w-full max-h-full object-contain p-1" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-700 truncate font-mono font-medium" title={arte.name}>{arte.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-0.5">{tamanhoEmMB.toFixed(2)} MB</p>
                  </div>
                  
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => handleEditarCampanhaPorArte(urlPublica)}
                      className="p-1 bg-white hover:bg-amber-500 text-gray-600 hover:text-white border border-gray-200 rounded-md shadow-sm text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                      title="Editar campanha desta arte"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluirArteStorage(arte.name)}
                      className="p-1 bg-white hover:bg-red-500 text-gray-600 hover:text-white border border-gray-200 rounded-md shadow-sm text-[10px] focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Excluir do Storage"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh] transform scale-100 transition-transform">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {campanhaEmEdicao ? '📝 Editar Campanha' : '✨ Nova Campanha'}
            </h2>
            <form 
              onSubmit={handleSalvarCampanha} 
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                <input 
                  type="text" 
                  required 
                  value={nomeEvento} 
                  onChange={(e) => setNomeEvento(e.target.value)}
                  placeholder="Ex: Campanha de Black Friday"
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Evento</label>
                <select 
                  value={tipoEvento} 
                  onChange={(e) => setTipoEvento(e.target.value as 'fixo' | 'aniversario')}
                  className="w-full mt-1 p-2 border rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixo">📅 Campanha Geral / Feriado Fixo</option>
                  <option value="aniversario">🎂 Aniversário do Cliente</option>
                </select>
              </div>

              {tipoEvento === 'fixo' && (
                <div className="animate-slideDown">
                  <label className="block text-sm font-medium text-gray-700">Data do Evento (MM-DD)</label>
                  <input 
                    type="text" 
                    required 
                    value={mesDia} 
                    onChange={(e) => setMesDia(e.target.value)}
                    placeholder="Ex: 12-25 (Mês-Dia)"
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Conteúdo do E-mail</label>
                <textarea 
                  value={msgEmail} 
                  onChange={(e) => setMsgEmail(e.target.value)}
                  placeholder="Texto comercial do e-mail..."
                  className="w-full mt-1 p-2 border rounded-lg outline-none h-28 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {campanhaEmEdicao?.url_arte_storage ? '🖼️ Arte Atual da Campanha' : 'Arte da Campanha (Imagem)'}
                </label>
                
                {campanhaEmEdicao?.url_arte_storage && (
                  <div className="w-full h-28 bg-gray-50 border rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2 shadow-inner">
                    <img 
                      src={campanhaEmEdicao.url_arte_storage} 
                      alt="Miniatura Atual" 
                      className="max-w-full max-h-full object-contain" 
                    />
                  </div>
                )}

                <label className="block text-xs text-gray-400 font-medium mb-1">
                  {campanhaEmEdicao?.url_arte_storage ? 'Substituir arte por um novo arquivo:' : 'Selecione a imagem de fundo:'}
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setArteArquivo(e.target.files[0]);
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={enviando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {enviando ? 'Processando...' : campanhaEmEdicao ? 'Salvar Alterações' : 'Salvar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}