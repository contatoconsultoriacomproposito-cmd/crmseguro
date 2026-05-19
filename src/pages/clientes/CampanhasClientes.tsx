import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse'; // Adicionado para processamento do arquivo CSV

interface Campanha {
  id: string;
  nome_evento: string;
  tipo_evento: 'fixo' | 'aniversario';
  mes_dia: string | null;
  mensagem_email: string | null;
  mensagem_whatsapp: string | null;
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

  // NOVO: Estados para controle da Lista Alternativa Importada via Arquivo
  const [isListaImportada, setIsListaImportada] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  // Estados para o Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campanhaEmEdicao, setCampanhaEmEdicao] = useState<Campanha | null>(null); 
  const [nomeEvento, setNomeEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState<'fixo' | 'aniversario'>('fixo');
  const [mesDia, setMesDia] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [msgWhats, setMsgWhats] = useState('');
  const [arteArquivo, setArteArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function buscarCampanhas() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('tab_campanhas')
        .select('*')
        .order('nome_evento', { ascending: true });
      if (error) throw error;
      if (data) setCampanhas(data as Campanha[]);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    } finally {
      setCarregando(false);
    }
  }

  // Buscar clientes baseados no tipo de campanha selecionada
  async function buscarClientesElegiveis(campanha: Campanha) {
    try {
      setCarregandoClientes(true);
      setIdsClientesSelecionados([]); // Reseta a seleção anterior
      setIsListaImportada(false); // Reseta a flag de arquivo importado
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
      
      // Inicializa pré-selecionando todos que possuem e-mail válido
      const idsIniciais = listaClientes.filter(c => c.email && c.email.trim() !== '').map(c => c.id);
      setIdsClientesSelecionados(idsIniciais);
    } catch (error) {
      console.error('Erro ao buscar clientes elegíveis:', error);
    } finally {
      setCarregandoClientes(false);
    }
  }

  // NOVO: Handler para processar o upload do arquivo CSV/TXT alternativo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErroArquivo(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const dadosBrutos = results.data as any[];

        if (dadosBrutos.length === 0) {
          setErroArquivo("O arquivo importado está vazio.");
          return;
        }

        // Validação de cabeçalho (precisa das colunas nome e email)
        const primeiraLinha = dadosBrutos[0];
        if (!primeiraLinha.nome || !primeiraLinha.email) {
          setErroArquivo("O arquivo precisa conter obrigatoriamente as colunas 'nome' e 'email' na primeira linha.");
          return;
        }

        // Mapeia os dados estruturando para o tipo Cliente esperado pelo sistema
        const clientesMapeados: Cliente[] = dadosBrutos.map((item) => ({
          id: crypto.randomUUID(), // Gera um ID único em memória
          nome: item.nome.trim(),
          tipo_cliente: 'PF', // Forçado como PF para rodar perfeitamente na Edge Function
          nome_fantasia: null,
          email: item.email.trim(),
          telefone_whats: item.telefone_whats ? item.telefone_whats.trim() : null,
          data_nascimento: null
        }));

        setClientes(clientesMapeados);
        setIsListaImportada(true);
        setTermoBusca(''); // Limpa buscas para exibir a lista completa carregada
        
        // Auto-seleciona todos os itens válidos importados do arquivo
        const idsMapeados = clientesMapeados.filter(c => c.email && c.email.trim() !== '').map(c => c.id);
        setIdsClientesSelecionados(idsMapeados);
        
        alert(`Sucesso! ${clientesMapeados.length} contatos foram carregados a partir do arquivo.`);
      },
      error: (error) => {
        setErroArquivo(`Erro ao ler o arquivo: ${error.message}`);
      }
    });
  };

  // NOVO: Função para o usuário desfazer o upload e voltar a puxar do banco de dados
  function handleLimparListaImportada() {
    if (campanhaSelecionada) {
      buscarClientesElegiveis(campanhaSelecionada);
    }
  }

  // Filtragem Inteligente no Front-end
  const clientesFiltrados = clientes.filter(cliente => {
    const nomeOriginal = cliente.nome || '';
    const nomeFantasia = cliente.nome_fantasia || '';
    const email = cliente.email || '';
    const termo = termoBusca.toLowerCase();
    
    return nomeOriginal.toLowerCase().includes(termo) || 
           nomeFantasia.toLowerCase().includes(termo) || 
           email.toLowerCase().includes(termo);
  });

  // Alternar seleção de um cliente específico
  function toggleSelecionarCliente(id: string) {
    setIdsClientesSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  // Alternar seleção de todos da lista filtrada atual
  function toggleSelecionarTodos() {
    const clientesComEmailDestaLista = clientesFiltrados.filter(c => c.email && c.email.trim() !== '');
    const todosSelecionados = clientesComEmailDestaLista.every(c => idsClientesSelecionados.includes(c.id));

    if (todosSelecionados) {
      // Remove da seleção apenas os que estão aparecendo na busca atual
      const idsRemover = clientesFiltrados.map(c => c.id);
      setIdsClientesSelecionados(prev => prev.filter(id => !idsRemover.includes(id)));
    } else {
      // Adiciona à seleção os que possuem e-mail na busca atual
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
    setMsgWhats('');
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
    setMsgWhats(campanha.mensagem_whatsapp || '');
    setArteArquivo(null); 
    setIsModalOpen(true);
  }

  async function handleDeletarCampanha(id: string, e: React.MouseEvent) {
    e.stopPropagation(); 
    if (!confirm('Tem certeza que deseja excluir permanentemente esta campanha?')) return;

    try {
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

      const idCorretoraMae = perfil ? perfil.corretora_id : user.id;
      let urlPublicaArte = campanhaEmEdicao ? campanhaEmEdicao.url_arte_storage : null;

      if (arteArquivo) {
        const nomeArquivo = `${Date.now()}-${arteArquivo.name.replace(/\s+/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('artes-campanhas')
          .upload(nomeArquivo, arteArquivo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('artes-campanhas')
          .getPublicUrl(nomeArquivo);
          
        urlPublicaArte = urlData.publicUrl;
      }

      const dadosCampanha = {
        corretora_id: idCorretoraMae,
        corretor_id: user.id,
        nome_evento: nomeEvento,
        tipo_evento: tipoEvento,
        mes_dia: tipoEvento === 'fixo' ? mesDia : null,
        mensagem_email: msgEmail,
        mensagem_whatsapp: msgWhats,
        url_arte_storage: urlPublicaArte
      };

      if (campanhaEmEdicao) {
        const { error } = await supabase
          .from('tab_campanhas')
          .update(dadosCampanha)
          .eq('id', campanhaEmEdicao.id);

        if (error) throw error;
        
        if (campanhaSelecionada?.id === campanhaEmEdicao.id) {
          setCampanhaSelecionada({ id: campanhaEmEdicao.id, ...dadosCampanha });
        }
        alert('Campanha atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('tab_campanhas')
          .insert([dadosCampanha]);

        if (error) throw error;
        alert('Campanha salva com sucesso!');
      }

      setIsModalOpen(false);
      buscarCampanhas();
    } catch (error) {
      console.error('Erro ao processar campanha:', error);
      alert('Erro ao salvar as alterações da campanha.');
    } finally {
      setEnviando(false);
    }
  }

  function handleDispararClienteIndividual(cliente: Cliente) {
    if (!campanhaSelecionada?.mensagem_whatsapp) return;
    if (!cliente.telefone_whats) return alert('Este cliente não possui WhatsApp cadastrado.');

    const nomeTratado = cliente.tipo_cliente === 'PF' ? cliente.nome : (cliente.nome_fantasia || cliente.nome);
    let mensagemCustomizada = campanhaSelecionada.mensagem_whatsapp.replace(/{nome}/gi, nomeTratado);
    const textoCodificado = encodeURIComponent(mensagemCustomizada);
    const numeroLimpo = cliente.telefone_whats.replace(/\D/g, '');

    const url = `https://web.whatsapp.com/send?phone=55${numeroLimpo}&text=${textoCodificado}`;
    window.open(url, '_blank');
  }

  function handleDispararWhatsappGeral() {
    if (!campanhaSelecionada?.mensagem_whatsapp) return;
    const textoCodificado = encodeURIComponent(campanhaSelecionada.mensagem_whatsapp);
    const url = `https://web.whatsapp.com/send?text=${textoCodificado}`;
    window.open(url, '_blank');
  }

  // Disparará APENAS para os clientes que foram explicitamente selecionados (Seja do Banco ou do CSV)
const handleDispararEmail = async () => {
  if (!campanhaSelecionada) return;
  
  if (idsClientesSelecionados.length === 0) {
    alert("Selecione ao menos um cliente com e-mail válido.");
    return;
  }

  setEnviando(true);

  try {
    // 1. Mapeia e higieniza os clientes selecionados (do banco ou da lista CSV)
    const listaDisparo = clientes
      .filter((c) => idsClientesSelecionados.includes(c.id))
      .map((c) => ({
        id: c.id,
        email: c.email?.trim() || null,
        nome: c.nome || "Cliente",
        tipo_cliente: c.tipo_cliente || "PF",
        nome_fantasia: c.nome_fantasia || ""
      }));

    // 2. Garante o objeto da campanha estruturado
    const dadosCampanha = {
      id: campanhaSelecionada.id,
      nome_evento: campanhaSelecionada.nome_evento || "Informativo",
      mensagem_email: campanhaSelecionada.mensagem_email || "",
      url_arte_storage: campanhaSelecionada.url_arte_storage || null
    };

    console.log("📤 Enviando payload para a Edge Function:", { dadosCampanha, listaDisparo });

    // 3. Invoca a função enviando em ambos os formatos (retrocompatibilidade total)
    const { error } = await supabase.functions.invoke('disparar-emails', {
      body: {
        // Formato antigo que a função lia originalmente:
        campanha: dadosCampanha,
        clientes: listaDisparo,
        
        // Formato novo por garantia de propriedades soltas:
        mensagem_email: dadosCampanha.mensagem_email,
        nome_evento: dadosCampanha.nome_evento,
        url_arte: dadosCampanha.url_arte_storage,
        destinatarios: listaDisparo
      },
    });

    if (error) throw error;

    alert(`🚀 Sucesso! Campanha enviada para ${listaDisparo.length} destinatários.`);
    
  } catch (error: any) {
    console.error("Erro detalhado ao disparar e-mails:", error);
    alert(`Erro ao disparar: ${error.message || "Erro interno no servidor de e-mails."}`);
  } finally {
    setEnviando(false);
  }
};

  useEffect(() => {
    if (campanhaSelecionada) {
      setTermoBusca(''); // Limpa a barra de busca ao mudar de campanha
      buscarClientesElegiveis(campanhaSelecionada);
    } else {
      setClientes([]);
      setIdsClientesSelecionados([]);
      setIsListaImportada(false);
      setErroArquivo(null);
    }
  }, [campanhaSelecionada]);

  useEffect(() => {
    buscarCampanhas();
  }, []);

  // O retorno do componente (JSX) continuará abaixo...

return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas e Datas Comemorativas</h1>
          <p className="text-sm text-gray-500">Gerencie o relacionamento periódico com seus clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SEÇÃO 1: Eventos */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="border-b pb-2 mb-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg text-gray-700">📅 Próximos Eventos</h2>
              <p className="text-xs text-gray-400">Feriados e campaigns</p>
            </div>
            <button 
              onClick={abrirModalCadastro}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {carregando ? (
              <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
            ) : campanhas.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center">
                Nenhuma campanha cadastrada.
              </div>
            ) : (
              campanhas.map((campanha) => (
                <div 
                  key={campanha.id} 
                  onClick={() => setCampanhaSelecionada(campanha)}
                  className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all flex justify-between items-center group ${campanhaSelecionada?.id === campanha.id ? 'border-blue-500 bg-blue-50/40' : 'border-gray-100'}`}
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-medium text-sm text-gray-800 truncate">{campanha.nome_evento}</p>
                    <p className="text-xs text-gray-400">
                      {campanha.tipo_evento === 'aniversario' ? '🎂 Aniversário' : `📅 Feriado (${campanha.mes_dia})`}
                    </p>
                    {campanha.url_arte_storage && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded mt-1 inline-block">🖼️ Com Arte</span>
                    )}
                  </div>
                  
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => abrirModalEdicao(campanha, e)}
                      title="Editar campanha"
                      className="p-1.5 bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded border border-gray-200 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => handleDeletarCampanha(campanha.id, e)}
                      title="Excluir campanha"
                      className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded border border-gray-200 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SEÇÃO 2: Clientes Elegíveis (MODIFICADO COM SUPORTE A UPLOAD DE CSV) */}
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
                  title="Voltar para a lista automática sincronizada com o banco de dados"
                >
                  ↩️ Restaurar Base do Sistema
                </button>
              )}
            </div>
            
            {/* NOVO COMPONENTE: Carregador de Lista Alternativa Externa */}
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

          {/* Barra de Busca e Filtro de Seleção */}
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
                  onClick={toggleSelecionarTodos}
                  className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {clientesFiltrados.filter(c => c.email).every(c => idsClientesSelecionados.includes(c.id)) 
                    ? '🔲 Desmarcar Todos Filtrados' 
                    : '☑️ Selecionar Todos Filtrados'}
                </button>
                <span className="text-gray-400">{clientesFiltrados.length} encontrados</span>
              </div>
            </div>
          )}
            
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
             {carregandoClientes ? (
               <p className="text-sm text-gray-400 text-center py-4">Buscando clientes...</p>
             ) : !campanhaSelecionada ? (
               <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center">
                 Selecione uma campanha para ver o público.
               </div>
             ) : clientesFiltrados.length === 0 ? (
               <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg h-full flex items-center justify-center p-4">
                 Nenhum cliente elegível corresponde à sua pesquisa.
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
                       {/* Checkbox Inteligente */}
                       <div className="mt-0.5 flex-shrink-0">
                         <input 
                           type="checkbox"
                           checked={estaSelecionado}
                           disabled={!temEmail}
                           onChange={() => {}} // Tratado no clique do container pai
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
                         <p className="text-[11px] text-gray-500 font-mono truncate">{cliente.telefone_whats ? `📱 ${cliente.telefone_whats}` : '⚠️ Sem WhatsApp'}</p>
                       </div>
                     </div>

                     {cliente.telefone_whats && campanhaSelecionada?.mensagem_whatsapp && (
                       <button
                         onClick={(e) => {
                           e.stopPropagation(); // Evita marcar/desmarcar o checkbox ao clicar no WhatsApp
                           handleDispararClienteIndividual(cliente);
                         }}
                         title="Enviar WhatsApp personalizado"
                         className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all shadow-sm flex-shrink-0"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                           <path d="M13.601 2.326A7.85 7.85 0 0 0 12.435.417 7.45 7.45 0 0 0 8 .04a7.45 7.45 0 0 0-4.435.377 7.85 7.85 0 0 0-1.166 1.909 7.7 7.7 0 0 0-.418 2.45c0 1.254.304 2.482.879 3.567l-1.018 3.722 3.821-1.002c1.033.563 2.185.86 3.354.861h.003a7.43 7.43 0 0 0 4.432-.379 7.85 7.85 0 0 0 1.167-1.909 7.7 7.7 0 0 0 .418-2.451 7.7 7.7 0 0 0-.418-2.451m-2.108 8.042c-.136.383-.667.708-1.014.757-.347.049-.785.088-1.32-.083-.264-.085-.591-.205-.98-.372a7.35 7.35 0 0 1-3.153-2.77c-.255-.386-.454-.79-.563-1.14-.109-.351-.122-.633-.046-.864.076-.231.264-.478.4-.643.136-.165.182-.25.274-.43.09-.182.046-.343-.023-.483-.068-.141-.611-1.472-.837-2.015-.22-.529-.444-.457-.611-.457h-.52c-.176 0-.463.066-.704.331-.242.265-.926.906-.926 2.212s.95 2.57 1.082 2.749c.133.179 1.867 2.852 4.523 3.999.633.273 1.13.435 1.517.558.636.2 1.217.171 1.675.103.51-.076 1.564-.639 1.785-1.256.22-.617.22-1.144.155-1.256-.064-.113-.236-.182-.51-.319" />
                         </svg>
                       </button>
                     )}
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
               Selecione uma campanha na lista ao lado para gerenciar as ações.
             </div>
           ) : (
             <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-4 pr-1">
               
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Arte da Campanha</p>
                   <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Dica: use {'{nome}'} no texto</span>
                 </div>
                 {campanhaSelecionada.url_arte_storage ? (
                   <div className="w-full h-40 rounded-xl bg-gray-50 border overflow-hidden flex items-center justify-center shadow-inner">
                     <img src={campanhaSelecionada.url_arte_storage} alt="Arte" className="max-w-full max-h-full object-contain p-2" />
                   </div>
                 ) : (
                   <div className="w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-gray-400 bg-gray-50/50">
                     Nenhuma imagem vinculada.
                   </div>
                 )}
               </div>

               <div className="space-y-3 flex-1">
                 <div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mensagem WhatsApp Base</p>
                   <div className="bg-zinc-50 border p-2.5 rounded-lg text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                     {campanhaSelecionada.mensagem_whatsapp || <span className="italic text-gray-400">Texto não configurado</span>}
                   </div>
                 </div>

                 <div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Texto do E-mail</p>
                   <div className="bg-zinc-50 border p-2.5 rounded-lg text-xs text-gray-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                     {campanhaSelecionada.mensagem_email || <span className="italic text-gray-400">Texto não configurado</span>}
                   </div>
                 </div>
               </div>

               <div className="space-y-2 pt-4 border-t">
                 <button 
                   onClick={handleDispararWhatsappGeral}
                   disabled={!campanhaSelecionada.mensagem_whatsapp}
                   className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                 >
                   💬 Compartilhar Texto Geral
                 </button>
                 <button 
                   onClick={handleDispararEmail}
                   className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                 >
                   ✉️ Enviar para Selecionados ({clientes.filter(c => idsClientesSelecionados.includes(c.id)).length})
                 </button>
               </div>

             </div>
           )}
        </div>

      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {campanhaEmEdicao ? '📝 Editar Campanha' : '✨ Nova Campanha'}
            </h2>
            <form onSubmit={handleSalvarCampanha} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                <input 
                  type="text" required value={nomeEvento} onChange={(e) => setNomeEvento(e.target.value)}
                  placeholder="Ex: Campanha de Natal"
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Evento</label>
                <select 
                  value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value as 'fixo' | 'aniversario')}
                  className="w-full mt-1 p-2 border rounded-lg outline-none"
                >
                  <option value="fixo">Feriado Fixo (Data específica)</option>
                  <option value="aniversario">Aniversário do Cliente</option>
                </select>
              </div>

              {tipoEvento === 'fixo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data (Mês-Dia)</label>
                  <input 
                    type="text" required placeholder="MM-DD (Ex: 12-25)"
                    value={mesDia} onChange={(e) => setMesDia(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Mensagem do WhatsApp</label>
                <textarea 
                  value={msgWhats} onChange={(e) => setMsgWhats(e.target.value)}
                  placeholder="Use {nome} para personalizar o texto dinamicamente."
                  className="w-full mt-1 p-2 border rounded-lg outline-none h-20 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Conteúdo do E-mail</label>
                <textarea 
                  value={msgEmail} onChange={(e) => setMsgEmail(e.target.value)}
                  placeholder="Texto do e-mail comercial..."
                  className="w-full mt-1 p-2 border rounded-lg outline-none h-20 text-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {campanhaEmEdicao ? 'Substituir Arte da Campanha (Opcional)' : 'Arte da Campanha (Imagem)'}
                </label>
                <input 
                  type="file" accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setArteArquivo(e.target.files[0]);
                    }
                  }}
                  className="w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={enviando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-gray-400"
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