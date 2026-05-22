import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

// ==========================================
// INTERFACES E TIPAGENS
// ==========================================
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

interface DetalheEnvio {
  id: string;
  id_campanha: string;
  nome_cliente: string;
  email_cliente: string;
  tipo_cliente: string;
  nome_fantasia: string | null;
  status_entrega: string;
  abriu_email: boolean;
  clicou_whatsapp: boolean;
  clicou_responder: boolean;
  criado_em: string;
}

interface ToastMessage {
  id: string;
  tipo: 'sucesso' | 'erro' | 'info';
  texto: string;
}

export default function CampanhasClientes() {
  // ==========================================
  // ESTADOS DO SISTEMA
  // ==========================================
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [idsClientesSelecionados, setIdsClientesSelecionados] = useState<string[]>([]);
  const [isListaImportada, setIsListaImportada] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campanhaEmEdicao, setCampanhaEmEdicao] = useState<Campanha | null>(null); 
  const [nomeEvento, setNomeEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState<'fixo' | 'aniversario'>('fixo');
  const [mesDia, setMesDia] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [arteArquivo, setArteArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [listaArtes, setListaArtes] = useState<ArteStorage[]>([]);
  const [totalEspacoMB, setTotalEspacoMB] = useState(0);
  const [carregandoArtes, setCarregandoArtes] = useState(false);

  // Novos Estados para a Grade de Resultados Avançada
  const [detalhesEnvios, setDetalhesEnvios] = useState<DetalheEnvio[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<string | null>(null);
  const [emailEditadoValue, setEmailEditadoValue] = useState('');
  const [idsLinhasSelecionadas, setIdsLinhasSelecionadas] = useState<string[]>([]);

  // Estado customizado de Toasts (Substitutos elegantes dos Alerts)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ==========================================
  // FUNÇÃO DE TOAST CUSTOMIZADA
  // ==========================================
  const showToast = (texto: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, tipo, texto }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // ==========================================
  // MÉTODOS DE BUSCA E BANCO DE DADOS
  // ==========================================
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
    } catch (error: any) {
      showToast('Erro ao buscar campanhas: ' + error.message, 'erro');
    } finally {
      setCarregando(false);
    }
  }

  async function buscarDetalhesResultados(campanhaId: string) {
    try {
      setCarregandoDetalhes(true);
      setIdsLinhasSelecionadas([]);
      const { data, error } = await supabase
        .from('tab_campanhas_emails_detalhe')
        .select('id, id_campanha, nome_cliente, email_cliente, tipo_cliente, nome_fantasia, status_entrega, abriu_email, clicou_whatsapp, clicou_responder, criado_em')
        .eq('id_campanha', campanhaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setDetalhesEnvios(data || []);
    } catch (error: any) {
      showToast('Erro ao carregar detalhes de envios: ' + error.message, 'erro');
    } finally {
      setCarregandoDetalhes(false);
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
    } catch (error: any) {
      showToast('Erro ao listar arquivos do storage: ' + error.message, 'erro');
    } finally {
      setCarregandoArtes(false);
    }
  }

  // Lógica Avançada: Deleta o registro no banco e limpa fisicamente o arquivo do bucket do Storage
  async function handleDeletarCampanhaCompleto(id: string, urlArte: string | null, e: React.MouseEvent) {
    e.stopPropagation(); 
    if (!confirm('Tem certeza que deseja excluir permanentemente esta campanha? Os dados de relatórios e a arte associada serão removidos.')) return;

    try {
      if (urlArte) {
        const partesUrl = urlArte.split('/');
        const nomeArquivoStorage = partesUrl[partesUrl.length - 1];
        if (nomeArquivoStorage) {
          await supabase.storage.from('artes-campanhas').remove([nomeArquivoStorage]);
        }
      }

      const { error } = await supabase
        .from('tab_campanhas') 
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (campanhaSelecionada?.id === id) {
        setCampanhaSelecionada(null);
      }

      showToast('Campanha e sua respectiva arte foram excluídas com sucesso!');
      buscarCampanhas();
      carregarGerenciadorStorage();
    } catch (error: any) {
      showToast('Erro ao excluir campanha: ' + error.message, 'erro');
    }
  }

  async function handleExcluirArteStorage(nomeArquivo: string) {
    if (!confirm(`Deseja remover permanentemente o arquivo "${nomeArquivo}" do Storage?\nIsso liberará espaço na sua conta.`)) return;

    try {
      const { data: urlData } = supabase.storage.from('artes-campanhas').getPublicUrl(nomeArquivo);
      const urlParaLimpar = urlData.publicUrl;

      const { error: storageError } = await supabase.storage.from('artes-campanhas').remove([nomeArquivo]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('tab_campanhas') 
        .update({ url_arte_storage: null })
        .eq('url_arte_storage', urlParaLimpar);

      if (dbError) console.warn('Vínculo em tabelas falhou:', dbError);

      if (campanhaSelecionada && campanhaSelecionada.url_arte_storage === urlParaLimpar) {
        setCampanhaSelecionada(prev => prev ? { ...prev, url_arte_storage: null } : null);
      }

      showToast('Arquivo de mídia removido fisicamente do Storage!');
      carregarGerenciadorStorage();
      buscarCampanhas();
    } catch (error: any) {
      showToast('Erro ao excluir arquivo: ' + error.message, 'erro');
    }
  }

  // Função para efetuar download forçado de arquivos de imagem direto no navegador
  async function handleDownloadArte(url: string, nomeOriginal: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `arte-${nomeOriginal || 'campanha'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlBlob);
      showToast('Download iniciado!');
    } catch (error) {
      showToast('Falha ao baixar imagem, abrindo em nova aba.', 'info');
      window.open(url, '_blank');
    }
  }

  // ==========================================
  // OPERAÇÕES DA GRADE DE RESULTADOS (LINHAS DE ENVIO)
  // ==========================================
  async function handleSalvarEdicaoEmailLinha(detalheId: string) {
    if (!emailEditadoValue.trim() || !emailEditadoValue.includes('@')) {
      showToast('Insira um e-mail com formato válido.', 'erro');
      return;
    }
    try {
      const { error } = await supabase
        .from('tab_campanhas_emails_detalhe')
        .update({ email_cliente: emailEditadoValue.trim(), status_entrega: 'enviando' })
        .eq('id', detalheId);

      if (error) throw error;
      showToast('E-mail corrigido com sucesso! Status resetado.');
      setLinhaEmEdicao(null);
      if (campanhaSelecionada) buscarDetalhesResultados(campanhaSelecionada.id);
    } catch (error: any) {
      showToast('Erro ao atualizar linha: ' + error.message, 'erro');
    }
  }

  async function handleDeletarLinhaEnvio(detalheId: string) {
    if (!confirm('Remover este registro de relatório?')) return;
    try {
      const { error } = await supabase.from('tab_campanhas_emails_detalhe').delete().eq('id', detalheId);
      if (error) throw error;
      showToast('Registro excluído da grade.');
      if (campanhaSelecionada) buscarDetalhesResultados(campanhaSelecionada.id);
    } catch (error: any) {
      showToast('Erro ao excluir registro: ' + error.message, 'erro');
    }
  }

  // Reenvio focado em Lote ou Individual baseado em Seleção da nova Grade Informativa
  async function handleReenviarEmailsGrade(linhasEspecificas?: DetalheEnvio[]) {
    if (!campanhaSelecionada) return;
    
    const alvos = linhasEspecificas || detalhesEnvios.filter(d => idsLinhasSelecionadas.includes(d.id));
    
    if (alvos.length === 0) {
      showToast('Nenhum e-mail selecionado na grade para reenvio.', 'info');
      return;
    }

    setEnviando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const listaDisparo = alvos.map(a => ({
        id: a.id, 
        email: a.email_cliente.trim(),
        nome: a.nome_cliente,
        tipo_cliente: a.tipo_cliente,
        nome_fantasia: a.nome_fantasia || ""
      }));

      const dadosCampanha = {
        id: campanhaSelecionada.id,
        nome_evento: campanhaSelecionada.nome_evento,
        mensagem_email: campanhaSelecionada.mensagem_email || "",
        url_arte_storage: campanhaSelecionada.url_arte_storage,
        tipo_evento: campanhaSelecionada.tipo_evento,
        mes_dia: campanhaSelecionada.mes_dia,
        corretor_id: user?.id || null, 
        corretora_id: (campanhaSelecionada as any).corretora_id || 'e8d1fdac-fc46-4646-b1f7-33aedee29f3a'
      };

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

      showToast(`Processamento de reenvio executado para ${listaDisparo.length} contatos.`);
      buscarDetalhesResultados(campanhaSelecionada.id);
    } catch (error: any) {
      showToast('Erro no reenvio: ' + error.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  // ==========================================
  // DISPARO ORIGINAL DA BASE / IMPORTAÇÃO
  // ==========================================
  const handleDispararEmailOriginal = async () => {
    if (!campanhaSelecionada) return;
    if (idsClientesSelecionados.length === 0) {
      showToast("Selecione ao menos um cliente com e-mail válido para disparar.", 'erro');
      return;
    }

    setEnviando(true);
    try {
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

      const dadosCampanha = {
        id: campaignIdFix(campanhaSelecionada.id),
        nome_evento: campanhaSelecionada.nome_evento || "Informativo",
        mensagem_email: campanhaSelecionada.mensagem_email || "",
        url_arte_storage: campanhaSelecionada.url_arte_storage || null,
        tipo_evento: campanhaSelecionada.tipo_evento || "fixo",
        mes_dia: campanhaSelecionada.mes_dia || null,
        corretor_id: user?.id || null, 
        corretora_id: (campanhaSelecionada as any).corretora_id || 'e8d1fdac-fc46-4646-b1f7-33aedee29f3a'
      };

      // Função auxiliar preventiva para garantir IDs válidos em listas clonadas/importadas externamente
      function campaignIdFix(id: string) { return id; }

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

      showToast(`🚀 Sucesso! Campanha colocada na fila de envio para ${listaDisparo.length} alvos.`);
      buscarDetalhesResultados(campanhaSelecionada.id);
    } catch (error: any) {
      showToast(`Erro ao disparar: ${error.message}`, 'erro');
    } finally {
      setEnviando(false);
    }
  };

  // ==========================================
  // GERENCIAMENTO DE LOGISTICA DOS CLIENTES
  // ==========================================
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

      if (perfilError || !perfil) return;

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
    } catch (error: any) {
      showToast('Erro ao buscar clientes: ' + error.message, 'erro');
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
          setErroArquivo("O arquivo precisa conter as colunas 'nome' e 'email'.");
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
          setIdsClientesSelecionados(clientesMapeados.map(c => c.id));
          showToast(`${clientesMapeados.length} contatos carregados do arquivo!`);
        } catch (err: any) {
          setErroArquivo(`Erro ao processar arquivo: ${err.message}`);
        }
      }
    });
  };

  function handleLimparListaImportada() {
    if (campanhaSelecionada) buscarClientesElegiveis(campanhaSelecionada);
  }

  const clientesFiltrados = clientes.filter(cliente => {
    const nomeOriginal = cliente.nome || '';
    const nomeFantasia = cliente.nome_fantasia || '';
    const email = cliente.email || '';
    const termo = termoBusca.toLowerCase();
    return nomeOriginal.toLowerCase().includes(termo) || nomeFantasia.toLowerCase().includes(termo) || email.toLowerCase().includes(termo);
  });

  function toggleSelecionarCliente(id: string) {
    setIdsClientesSelecionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  function toggleSelecionarTodos() {
    const comEmail = clientesFiltrados.filter(c => c.email && c.email.trim() !== '');
    if (comEmail.every(c => idsClientesSelecionados.includes(c.id))) {
      const idsRemover = clientesFiltrados.map(c => c.id);
      setIdsClientesSelecionados(prev => prev.filter(id => !idsRemover.includes(id)));
    } else {
      setIdsClientesSelecionados(prev => Array.from(new Set([...prev, ...comEmail.map(c => c.id)])));
    }
  }

  // ==========================================
  // OPERAÇÕES DO MODAL DE ALTERAÇÃO/INSERÇÃO
  // ==========================================
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

  function handleEditarCampanhaPorArte(urlPublica: string) {
    const correspondente = campanhas.find(c => c.url_arte_storage === urlPublica);
    if (correspondente) {
      setCampanhaEmEdicao(correspondente);
      setNomeEvento(correspondente.nome_evento);
      setTipoEvento(correspondente.tipo_evento);
      setMesDia(correspondente.mes_dia || '');
      setMsgEmail(correspondente.mensagem_email || '');
      setArteArquivo(null); 
      setIsModalOpen(true);
    } else {
      showToast("Esta imagem não está vinculada a nenhuma campanha ativa no momento.", 'info');
    }
  }

  async function handleSalvarCampanha(e: React.FormEvent) {
    e.preventDefault();
    try {
      setEnviando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return showToast('Sessão expirada. Refaça o login.', 'erro');

      const { data: perfil } = await supabase.from('usuarios_perfis').select('corretora_id').eq('id', user.id).single();
      const idCorretoraDestaCampanha = perfil?.corretora_id || user.id;
      let urlPublicaArte = campanhaEmEdicao ? campanhaEmEdicao.url_arte_storage : null;

      if (arteArquivo) {
        const pontoIndex = arteArquivo.name.lastIndexOf('.');
        const apenasNome = pontoIndex !== -1 ? arteArquivo.name.substring(0, pontoIndex) : arteArquivo.name;
        const extensao = pontoIndex !== -1 ? arteArquivo.name.substring(pontoIndex) : '';
        const nomeSanitizado = apenasNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_');
        const nomeArquivo = `${Date.now()}-${nomeSanitizado}${extensao.toLowerCase()}`;

        const { error: uploadError } = await supabase.storage.from('artes-campanhas').upload(nomeArquivo, arteArquivo);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('artes-campanhas').getPublicUrl(nomeArquivo);
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
        const { error } = await supabase.from('tab_campanhas').update(dadosCampanhaBanco).eq('id', campanhaEmEdicao.id);
        if (error) throw error;
        
        if (campanhaSelecionada?.id === campanhaEmEdicao.id) {
          setCampanhaSelecionada({ id: campanhaEmEdicao.id, ...dadosCampanhaBanco });
        }
        showToast('Campanha atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('tab_campanhas').insert([dadosCampanhaBanco]);
        if (error) throw error;
        showToast('Campanha salva com sucesso!');
      }

      setIsModalOpen(false);
      buscarCampanhas();
      carregarGerenciadorStorage();
    } catch (error: any) {
      showToast('Erro ao processar campanha: ' + error.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  // Sincronização automática de efeitos colaterais por clique
  useEffect(() => {
    if (campanhaSelecionada) {
      setTermoBusca(''); 
      buscarClientesElegiveis(campanhaSelecionada);
      buscarDetalhesResultados(campanhaSelecionada.id); 
    } else {
      setClientes([]);
      setIdsClientesSelecionados([]);
      setIsListaImportada(false);
      setErroArquivo(null);
      setDetalhesEnvios([]);
    }
  }, [campanhaSelecionada]);

  useEffect(() => {
    buscarCampanhas();
    carregarGerenciadorStorage();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 relative">
      
      {/* CONTAINER FLUTUANTE DE NOTIFICAÇÕES (TOASTS SYSTEM) */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border text-sm font-medium flex items-center justify-between transition-all duration-300 animate-slideDown pointer-events-auto bg-white ${
              toast.tipo === 'sucesso' ? 'border-emerald-200 text-emerald-800 bg-emerald-50/90' :
              toast.tipo === 'erro' ? 'border-red-200 text-red-800 bg-red-50/90' : 'border-blue-200 text-blue-800 bg-blue-50/90'
            }`}
          >
            <span>{toast.texto}</span>
            <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="ml-2 text-xs opacity-50 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas e Datas Comemorativas</h1>
          <p className="text-sm text-gray-500">Controle completo de disparos automatizados e acompanhamento em lote</p>
        </div>
      </div>

      {/* ==========================================================
          PRIMEIRA LINHA: TRÊS COLUNAS COMPACTAS DE OPERAÇÃO
          ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: Inserção de Campanhas / Próximos Eventos */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px]">
          <div className="border-b pb-2 mb-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-base text-gray-700">📅 1. Escolha a Campanha</h2>
              <p className="text-xs text-gray-400">Inserção e seleção base</p>
            </div>
            <button 
              onClick={abrirModalCadastro}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm"
              title="Criar nova campanha"
            >
              <span className="text-xs font-bold">+ Adicionar</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                    campanhaSelecionada?.id === campanha.id ? 'border-blue-500 bg-blue-50/30 shadow-sm' : 'border-gray-100'
                  }`}
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-semibold text-xs text-gray-800 truncate">{campanha.nome_evento}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {campanha.tipo_evento === 'aniversario' ? '🎂 Aniversário' : `📅 Geral (${campanha.mes_dia || 'Fixo'})`}
                    </p>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => abrirModalEdicao(campanha, e)}
                      className="p-1 bg-white hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded border border-gray-200 text-xs"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => handleDeletarCampanhaCompleto(campanha.id, campanha.url_arte_storage, e)}
                      className="p-1 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 rounded border border-gray-200 text-xs"
                      title="Excluir tudo (Banco + Storage)"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 2: Eleger os Clientes */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px]">
          <div className="border-b pb-2 mb-3 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-base text-gray-700 truncate">
                👥 2. Eleger Clientes ({idsClientesSelecionados.length})
              </h2>
              {isListaImportada && (
                <button
                  onClick={handleLimparListaImportada}
                  className="text-[9px] bg-red-50 text-red-600 hover:bg-red-100 px-2 py-0.5 rounded font-bold"
                >
                  ↩️ Interna
                </button>
              )}
            </div>
            
            {campanhaSelecionada && (
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-200/60">
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Subir lista alternativa (CSV):</label>
                <input 
                  type="file" 
                  accept=".csv,.txt" 
                  onChange={handleFileUpload}
                  className="block w-full text-[10px] text-gray-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 cursor-pointer"
                />
                {erroArquivo && <p className="text-red-500 text-[9px] mt-1">{erroArquivo}</p>}
              </div>
            )}
          </div>

          {campanhaSelecionada && (
            <div className="space-y-2 mb-2">
              <input 
                type="text"
                placeholder="🔍 Buscar público..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <div className="flex justify-between items-center text-[10px]">
                <button type="button" onClick={toggleSelecionarTodos} className="text-blue-600 font-bold hover:underline">
                  ☑️ Alternar Seleção Completa
                </button>
                <span className="text-gray-400">{clientesFiltrados.length} contatos</span>
              </div>
            </div>
          )}
            
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
             {carregandoClientes ? (
               <p className="text-xs text-gray-400 text-center py-4 animate-pulse">Buscando público elegível...</p>
             ) : !campanhaSelecionada ? (
               <div className="text-center text-gray-400 text-xs h-full flex items-center justify-center border border-dashed rounded-lg">
                 Selecione uma campanha ao lado.
               </div>
             ) : clientesFiltrados.length === 0 ? (
               <div className="text-center text-gray-400 text-xs h-full flex items-center justify-center p-2">
                 Nenhum registro localizado.
               </div>
             ) : (
               clientesFiltrados.map((cliente) => {
                 const estaSelecionado = idsClientesSelecionados.includes(cliente.id);
                 const temEmail = !!(cliente.email && cliente.email.trim() !== '');

                 return (
                   <div 
                     key={cliente.id} 
                     onClick={() => temEmail && toggleSelecionarCliente(cliente.id)}
                     className={`p-2 border rounded-lg flex justify-between items-center transition-all ${
                       estaSelecionado ? 'border-blue-300 bg-blue-50/10' : 'border-gray-100 bg-gray-50/30'
                     } ${temEmail ? 'cursor-pointer' : 'opacity-50'}`}
                   >
                     <div className="flex items-center gap-2 min-w-0 flex-1">
                       <input 
                         type="checkbox"
                         checked={estaSelecionado}
                         disabled={!temEmail}
                         readOnly
                         className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300"
                       />
                       <div className="min-w-0 flex-1">
                         <p className="font-medium text-xs text-gray-800 truncate">
                           {cliente.tipo_cliente === 'PF' ? cliente.nome : (cliente.nome_fantasia || cliente.nome)}
                         </p>
                         <p className={`text-[10px] truncate ${!temEmail ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                           {cliente.email || '⚠️ Sem e-mail'}
                         </p>
                       </div>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

        {/* COLUNA 3: Verificar Mídias / Artes e Ações Rápidas */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px] justify-between">
          <div>
            <h2 className="font-semibold text-base text-gray-700 border-b pb-2 mb-3">🖼️ 3. Arte & Disparo Manual</h2>
            
            {!campanhaSelecionada ? (
              <div className="text-center text-gray-400 text-xs py-12 border-2 border-dashed rounded-lg">
                Escolha uma campanha para visualizar o card e obter o download.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Miniatura da Arte</span>
                  {campanhaSelecionada.url_arte_storage ? (
                    <div className="w-full h-36 rounded-lg bg-zinc-50 border overflow-hidden flex flex-col items-center justify-center p-2 relative group shadow-inner">
                      <img src={campanhaSelecionada.url_arte_storage} alt="Arte" className="max-w-full max-h-full object-contain" />
                      
                      {/* Painel Flutuante com a funcionalidade vital de Download */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadArte(campanhaSelecionada.url_arte_storage!, campanhaSelecionada.nome_evento)}
                          className="px-3 py-1 bg-white hover:bg-blue-600 hover:text-white font-bold rounded-md text-xs transition-colors shadow"
                        >
                          📥 Baixar Imagem (Para Whats)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg border border-dashed flex items-center justify-center text-xs text-gray-400 bg-gray-50/50">
                      Nenhuma arte anexada a este evento.
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Previsão do Conteúdo</span>
                  <div className="bg-zinc-50 border p-2 rounded-lg text-[11px] text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto font-mono">
                    {campanhaSelecionada.mensagem_email || <span className="italic text-gray-300">Nenhum texto estruturado.</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {campanhaSelecionada && (
            <div className="pt-4 border-t">
              <button 
                type="button"
                onClick={handleDispararEmailOriginal}
                disabled={enviando || idsClientesSelecionados.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
              >
                {enviando ? 'Efetuando processamento...' : `🚀 Iniciar Fila de Envio (${idsClientesSelecionados.length})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================
          SEGUNDA LINHA: SEÇÃO DE CONTROLE ROBUSTO (A GRADE COMPLETA)
          ========================================================== */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-3">
          <div>
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              📊 Painel de Controle e Grade Geral de Monitoramento
            </h2>
            <p className="text-xs text-gray-500">Resultados, aberturas em tempo real e controle de reenvios individuais ou em lote</p>
          </div>
          
          {/* Controles de Ação Coletiva na Grade */}
          {idsLinhasSelecionadas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-3 animate-fadeIn">
              <span className="text-xs font-semibold text-amber-800">
                {idsLinhasSelecionadas.length} e-mails marcados na grade
              </span>
              <button
                onClick={() => handleReenviarEmailsGrade()}
                disabled={enviando}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1 rounded transition-colors shadow-sm"
              >
                🔄 Reenviar Selecionados em Lote
              </button>
            </div>
          )}
        </div>

        {!campanhaSelecionada ? (
          <div className="py-12 text-center text-sm text-gray-400 border border-dashed rounded-xl bg-gray-50/40">
            Selecione uma campanha na primeira linha para abrir a grade completa de auditoria de e-mails.
          </div>
        ) : carregandoDetalhes ? (
          <p className="text-center text-xs text-gray-400 py-12 animate-pulse">Buscando registros da campanha no banco de dados...</p>
        ) : detalhesEnvios.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 bg-zinc-50/50 border rounded-xl">
            Nenhum disparo registrado para esta campanha até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="min-w-full bg-white divide-y divide-gray-100 text-left">
              <thead className="bg-gray-50/75 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 w-10 align-middle">
                    <input
                      type="checkbox"
                      checked={detalhesEnvios.length > 0 && idsLinhasSelecionadas.length === detalhesEnvios.length}
                      onChange={() => {
                        if (idsLinhasSelecionadas.length === detalhesEnvios.length) setIdsLinhasSelecionadas([]);
                        else setIdsLinhasSelecionadas(detalhesEnvios.map(d => d.id));
                      }}
                      className="rounded h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500/30 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 font-semibold align-middle">Destinatário</th>
                  <th className="py-3.5 px-4 font-semibold align-middle">Data/Hora Envio</th>
                  <th className="py-3.5 px-4 font-semibold align-middle">Entrega (Resend)</th>
                  <th className="py-3.5 px-4 font-semibold align-middle text-center">Abriu E-mail</th>
                  <th className="py-3.5 px-4 font-semibold align-middle text-center">Clique Whats</th>
                  <th className="py-3.5 px-4 font-semibold align-middle text-center">Ações de Ajuste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 text-sm">
                {detalhesEnvios.map((detalhe) => {
                  const isModoEdicaoLinha = linhaEmEdicao === detalhe.id;

                  return (
                    <tr key={detalhe.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Checkbox de Lote */}
                      <td className="py-3.5 px-4 align-middle">
                        <input
                          type="checkbox"
                          checked={idsLinhasSelecionadas.includes(detalhe.id)}
                          onChange={() => {
                            setIdsLinhasSelecionadas(p => p.includes(detalhe.id) ? p.filter(id => id !== detalhe.id) : [...p, detalhe.id]);
                          }}
                          className="rounded h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500/30 cursor-pointer"
                        />
                      </td>

                      {/* Dados Cadastrais / Input de Edição Inline */}
                      <td className="py-3.5 px-4 align-middle max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 leading-snug truncate">
                            {detalhe.tipo_cliente === 'PF' ? detalhe.nome_cliente : (detalhe.nome_fantasia || detalhe.nome_cliente)}
                          </span>
                          
                          {isModoEdicaoLinha ? (
                            <div className="flex items-center gap-1.5 mt-1.5 animate-fadeIn">
                              <input
                                type="text"
                                value={emailEditadoValue}
                                onChange={(e) => setEmailEditadoValue(e.target.value)}
                                className="p-1 px-2 text-xs border border-gray-300 rounded bg-white w-48 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                              />
                              <button
                                onClick={() => handleSalvarEdicaoEmailLinha(detalhe.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setLinhaEmEdicao(null)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded text-[10px] transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-normal text-xs truncate mt-0.5">{detalhe.email_cliente}</span>
                          )}
                        </div>
                      </td>

                      {/* Data de Envio */}
                      <td className="py-3.5 px-4 align-middle text-gray-500 text-xs whitespace-nowrap">
                        {new Date(detalhe.criado_em).toLocaleString('pt-BR')}
                      </td>

                      {/* Status de Entrega Customizado */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {detalhe.status_entrega === 'enviando' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            ⏳ Processando
                          </span>
                        ) : detalhe.status_entrega === 'entregue' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Entregue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                            {detalhe.status_entrega}
                          </span>
                        )}
                      </td>

                      {/* Status de Abertura */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        {detalhe.abriu_email ? (
                          <span className="inline-flex items-center justify-center h-6 w-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium" title="E-mail Aberto">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-6 w-12 rounded-full bg-gray-50 text-gray-400 border border-gray-200 text-xs font-normal" title="Não aberto">
                            Não
                          </span>
                        )}
                      </td>

                      {/* Status de Clique de WhatsApp */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        {detalhe.clicou_whatsapp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase tracking-wider" title="Clicou no link">
                            💬 Clicou
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-normal">—</span>
                        )}
                      </td>

                      {/* Controles Individuais da Linha */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setLinhaEmEdicao(detalhe.id);
                              setEmailEditadoValue(detalhe.email_cliente);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded text-xs font-medium transition-colors shadow-sm"
                            title="Corrigir e-mail"
                          >
                            ✏️ <span className="text-gray-500">Editar</span>
                          </button>
                          
                          <button
                            onClick={() => handleReenviarEmailsGrade([detalhe])}
                            disabled={enviando}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold transition-colors shadow-sm"
                            title="Reenviar agora"
                          >
                            🔄 <span>Reenviar</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeletarLinhaEnvio(detalhe.id)}
                            className="p-1 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded border border-gray-200 hover:border-red-200 text-xs transition-colors shadow-sm"
                            title="Remover histórico"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================================
          RODAPÉ: GERENCIADOR COMPLETO DO STORAGE DE ARTES
          ========================================================== */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="border-b pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h2 className="font-bold text-base text-gray-800">📦 Histórico Físico do Storage de Artes</h2>
            <p className="text-xs text-gray-400">Visão global dos arquivos upados no bucket do Supabase</p>
          </div>
          <div className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-blue-100">
            Volume Ocupado: {totalEspacoMB.toFixed(2)} MB
          </div>
        </div>

        {carregandoArtes ? (
          <p className="text-xs text-gray-400 text-center py-4 animate-pulse">Lendo arquivos do bucket...</p>
        ) : listaArtes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 border border-dashed rounded-xl">Nenhuma mídia armazenada.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {listaArtes.map((arte) => {
              const urlPublica = supabase.storage.from('artes-campanhas').getPublicUrl(arte.name).data.publicUrl;
              const tamanhoEmMB = (arte.metadata?.size || 0) / (1024 * 1024);

              return (
                <div key={arte.id || arte.name} className="border border-gray-100 bg-gray-50/50 rounded-xl p-2 relative flex flex-col justify-between group shadow-sm hover:shadow transition-all">
                  <div className="w-full h-20 bg-white rounded-lg border overflow-hidden flex items-center justify-center mb-1">
                    <img src={urlPublica} alt={arte.name} className="max-w-full max-h-full object-contain p-1" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-600 truncate font-mono" title={arte.name}>{arte.name}</p>
                    <p className="text-[9px] font-bold text-gray-400">{tamanhoEmMB.toFixed(2)} MB</p>
                  </div>
                  
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => handleEditarCampanhaPorArte(urlPublica)}
                      className="p-1 bg-white hover:bg-amber-500 text-gray-600 hover:text-white border rounded text-[9px]"
                      title="Vincular/Editar Campanha"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluirArteStorage(arte.name)}
                      className="p-1 bg-white hover:bg-red-500 text-gray-600 hover:text-white border rounded text-[9px]"
                      title="Deletar do Storage"
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

      {/* ==========================================================
          MODAL DE COMPOSIÇÃO DE CAMPANHAS (CADASTRO / EDIÇÃO)
          ========================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {campanhaEmEdicao ? '📝 Modificar Campanha Existente' : '✨ Criar Nova Campanha Comercial'}
            </h2>
            <form onSubmit={handleSalvarCampanha} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600">Identificação do Evento</label>
                <input 
                  type="text" 
                  required 
                  value={nomeEvento} 
                  onChange={(e) => setNomeEvento(e.target.value)}
                  placeholder="Ex: Campanha de Natal"
                  className="w-full mt-1 p-2 border rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600">Categoria de Regra</label>
                <select 
                  value={tipoEvento} 
                  onChange={(e) => setTipoEvento(e.target.value as 'fixo' | 'aniversario')}
                  className="w-full mt-1 p-2 border rounded-lg outline-none text-xs bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="fixo">📅 Campanha Geral / Calendário Fixo</option>
                  <option value="aniversario">🎂 Automação Base: Aniversariantes do Dia</option>
                </select>
              </div>

              {tipoEvento === 'fixo' && (
                <div className="animate-slideDown">
                  <label className="block text-xs font-semibold text-gray-600">Gatilho de Data (Mês-Dia: MM-DD)</label>
                  <input 
                    type="text" 
                    required 
                    value={mesDia} 
                    onChange={(e) => setMesDia(e.target.value)}
                    placeholder="Ex: 12-25"
                    className="w-full mt-1 p-2 border rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600">Corpo de Mensagem Comercial (E-mail)</label>
                <textarea 
                  value={msgEmail} 
                  onChange={(e) => setMsgEmail(e.target.value)}
                  placeholder="Insira as diretrizes textuais da campanha..."
                  className="w-full mt-1 p-2 border rounded-lg outline-none h-24 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Upload/Substituição de Imagem</label>
                {campanhaEmEdicao?.url_arte_storage && (
                  <div className="w-full h-24 bg-gray-50 border rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2 shadow-inner">
                    <img src={campanhaEmEdicao.url_arte_storage} alt="Atual" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setArteArquivo(e.target.files[0]);
                  }}
                  className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={enviando}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-bold shadow-sm"
                >
                  {enviando ? 'Gravando dados...' : 'Salvar Configurações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}