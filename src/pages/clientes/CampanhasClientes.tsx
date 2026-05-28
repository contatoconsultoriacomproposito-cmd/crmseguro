import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho conforme seu projeto
import { toast } from 'sonner';
import { useAuth } from "../../auth/AuthContext";

// --- INTERFACES PARA TIPAGEM TYPESCRIPT (Alinhado com seu Banco) ---
interface Campanha {
  id: string;
  nome_evento: string;
  tipo_evento: 'fixo' | 'aniversario';
  mes_dia: string | null;
  mensagem_email: string | null;
  mensagem_whatsapp: string | null;
  url_arte_storage: string | null;
  total_enviados: number;
  corretora_id: string;
  corretor_id: string | null;
}

interface MarketingLead {
  id: string;
  cliente_id: string | null;
  nome: string | null;
  email: string;
  telefone_whats: string | null;
  status_engajamento_email: string;
  origem_lead: string;
  email_total_aberturas?: number; // Adicionado de acordo com a nova tabela populada
  email_total_cliques?: number;   // Adicionado de acordo com a nova tabela populada
}

interface LogEnvioDetalhe {
  id: string;
  id_campanha: string;
  nome_cliente: string;
  email_cliente: string;
  tipo_cliente: string | null;
  nome_fantasia: string | null;
  status_entrega: string;
  abriu_email: boolean;
  clicou_whatsapp: boolean;
  criado_em: string;
  // Para sabermos de qual campanha veio o log no histórico do lead
  tab_campanhas?: { nome_evento: string }; 
}

interface ArteStorage {
  id?: string;
  name: string;
  metadata?: { size?: number } | null | Record<string, any>;
}

// Tipo para controlar as abas de temperatura
type FiltroTemperatura = 'todos' | 'frios' | 'mornos' | 'quentes';

export default function PainelMarketingCampanhas() {
  // --- ESTADOS GERAIS DO COMPONENTE ---
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  const [leadsElegiveis, setLeadsElegiveis] = useState<MarketingLead[]>([]);
  const [detalhesEnvios, setDetalhesEnvios] = useState<LogEnvioDetalhe[]>([]);
  const [listaArtes, setListaArtes] = useState<ArteStorage[]>([]);
  const { userProfile } = useAuth();
  const idCorretorLogado = userProfile?.id;
  const idCorretoraLogada = userProfile?.corretora_id;
  
  // --- ESTADOS DE SELEÇÃO E CONTROLE ---
  const [idsLeadsSelecionados, setIdsLeadsSelecionados] = useState<string[]>([]);
  const [idsLinhasSelecionadas, setIdsLinhasSelecionadas] = useState<string[]>([]);
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<string | null>(null);
  const [filtroGrade, setFiltroGrade] = useState<'TODOS' | 'ENTREGUE' | 'FALHA' | 'ABRIU' | 'CLICOU'>('TODOS');
  const [emailEditadoValue, setEmailEditadoValue] = useState('');

  // --- INTELIGÊNCIA DE FILTRAGEM: ABA DE TEMPERATURA SELECIONADA ---
  const [filtroTemperatura, setFiltroTemperatura] = useState<FiltroTemperatura>('todos');
  const [leadParaVerHistorico, setLeadParaVerHistorico] = useState<MarketingLead | null>(null);
  const [historicoCampanhasDoLead, setHistoricoCampanhasDoLead] = useState<LogEnvioDetalhe[]>([]);
  const [carregandoHistoricoLead, setCarregandoHistoricoLead] = useState(false);

  // --- ESTADOS DE LOADING E MODAL ---
  const [carregandoCampanhas, setCarregandoCampanhas] = useState(false);
  const [carregandoLeads, setCarregandoLeads] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [carregandoArtes, setCarregandoArtes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- ESTADOS DOS CAMPOS DO MODAL (Cadastro/Edição de Campanha) ---
  const [campanhaEmEdicao, setCampanhaEmEdicao] = useState<Campanha | null>(null);
  const [nomeEvento, setNomeEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState<'fixo' | 'aniversario'>('fixo');
  const [mesDia, setMesDia] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [arteArquivo, setArteArquivo] = useState<File | null>(null);

  // --- GERENCIAR ABAS E ARMAZENAR OS DADOS LIDOS DO CSV ---
  const [modoPublico, setModoPublico] = useState<'base' | 'csv' | 'crm'>('base');
  const [clientesListaImportada, setClientesListaImportada] = useState<any[]>([]);
  const [clientesCRM, setClientesCRM] = useState<any[]>([]);
  const [carregandoCRM, setCarregandoCRM] = useState<boolean>(false);

  // Métrica calculada do Storage
  const totalEspacoMB = listaArtes.reduce((acc, curr) => {
    const size = curr.metadata && typeof curr.metadata === 'object' && 'size' in curr.metadata 
      ? (curr.metadata as any).size 
      : 0;
    return acc + (size / (1024 * 1024));
  }, 0);

  // --- CARREGAMENTO INICIAL: CAMPANHAS E STORAGE ---
  useEffect(() => {
    buscarCampanhas();
    buscarHistoricoStorage();
  }, []);

  // --- OBSERVER: CARREGA LEADS E LOGS QUANDO SELECIONA UMA CAMPANHA ---
  useEffect(() => {
    if (campanhaSelecionada) {
      buscarLeadsElegiveis(campanhaSelecionada);
      buscarLogsAuditoria(campanhaSelecionada.id);
      buscarClientesCRM(campanhaSelecionada);
    } else {
      setLeadsElegiveis([]);
      setDetalhesEnvios([]);
      setIdsLeadsSelecionados([]);
      setIdsLinhasSelecionadas([]);
      setLeadParaVerHistorico(null);
    }
  }, [campanhaSelecionada]);

  // --- OBSERVER: BUSCA HISTÓRICO ESPECÍFICO DO LEAD AO CLICAR EM SEU CARD ---
  useEffect(() => {
    if (leadParaVerHistorico) {
      buscarHistoricoIndividualLead(leadParaVerHistorico.email);
    } else {
      setHistoricoCampanhasDoLead([]);
    }
  }, [leadParaVerHistorico]);

  // --- MONITORAMENTO EM TEMPO REAL: DETALHES DE ENVIOS (REALTIME) ---
  useEffect(() => {
    if (!campanhaSelecionada) return;

    // Conecta ao canal do Supabase escutando modificações na tabela de detalhes
    const canalRealtime = supabase
      .channel(`realtime-detalhes-${campanhaSelecionada.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'tab_campanhas_emails_detalhe',
          filter: `id_campanha=eq.${campanhaSelecionada.id}` // 🎯 Ajustado para id_campanha
        },
        (payload) => {
          // 1. Se um registro foi atualizado (ex: webhook do Resend acusou abertura)
          if (payload.eventType === 'UPDATE') {
            const registroAtualizado = payload.new as LogEnvioDetalhe; // 🔒 Força a tipagem correta
            setDetalhesEnvios((prev) =>
              prev.map((item) => (item.id === registroAtualizado.id ? { ...item, ...registroAtualizado } : item))
            );
          }
          // 2. Se um novo registro de envio entrou na fila
          else if (payload.eventType === 'INSERT') {
            const novoRegistro = payload.new as LogEnvioDetalhe; // 🔒 Força a tipagem correta
            setDetalhesEnvios((prev) => [novoRegistro, ...prev]);
          }
          // 3. Se um registro foi deletado da grade
          else if (payload.eventType === 'DELETE') {
            const registroDeletado = payload.old as { id: string };
            setDetalhesEnvios((prev) => prev.filter((item) => item.id !== registroDeletado.id));
          }
        }
      )
      .subscribe();

    // Cleanup: Desconecta do canal quando trocar de campanha ou sair da tela
    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, [campanhaSelecionada]);
  

  // --- FUNÇÕES DE BUSCA DE DADOS (SUPABASE) ---
  async function buscarCampanhas() {
    try {
      setCarregandoCampanhas(true);
      const { data, error } = await supabase
        .from('tab_campanhas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampanhas(data || []);
    } catch (err: any) {
      toast.error('Erro ao buscar campaigns: ' + err.message);
    } finally {
      setCarregandoCampanhas(false);
    }
  }

  async function buscarLeadsElegiveis(campanha: Campanha) {
    try {
      setCarregandoLeads(true);
      
      // Filtra os válidos liberados pelas permissões e RLS
      let query = supabase
        .from('tab_marketing_leads')
        .select('*')
        .eq('status_engajamento_email', 'valido');

      if (campanha.tipo_evento === 'aniversario') {
        const hoje = new Date();
        const mesDiaHoje = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        query = query.eq('mes_dia', mesDiaHoje);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeadsElegiveis(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar leads: ' + err.message);
    } finally {
      setCarregandoLeads(false);
    }
  }

  async function buscarClientesCRM(campanha: Campanha) {
    try {
      setCarregandoCRM(true);
      
      // 1. Traz apenas clientes que possuem e-mail válido preenchido e pertencem à mesma corretora da campanha
      let query = supabase
        .from('tab_clientes')
        .select('id, nome, email, telefone_whats, data_nascimento, tipo_cliente, nome_fantasia, corretor_id')
        .eq('corretora_id', campanha.corretora_id) // 🔒 Bloqueia vazamento entre corretoras diferentes
        .not('email', 'is', null)
        .neq('email', '');

      // 2. Se a campanha pertencer a um corretor específico, ele só vê os clientes DELE.
      // Se for da corretora (mãe) e o corretor_id for nulo, traz apenas os clientes diretos da mãe.
      if (campanha.corretor_id) {
        query = query.eq('corretor_id', campanha.corretor_id);
      } else {
        query = query.is('corretor_id', null);
      }

      // Inteligência de Aniversário: filtra dinamicamente por mês e dia usando a data_nascimento nativa do CRM
      if (campanha.tipo_evento === 'aniversario') {
        const hoje = new Date();
        const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
        const diaHoje = String(hoje.getDate()).padStart(2, '0');
        
        query = query.filter('data_nascimento', 'raw', `to_char(data_nascimento, 'MM-DD') = '${mesHoje}-${diaHoje}'`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClientesCRM(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar clientes do CRM:', err);
      toast.error('Erro ao carregar clientes do CRM');
    } finally {
      setCarregandoCRM(false);
    }
  }

  async function buscarLogsAuditoria(campanhaId: string, emailLead?: string) {
    try {
      setCarregandoDetalhes?.(true);
      
      let query = supabase
        .from('tab_campanhas_emails_detalhe')
        .select('*')
        .eq('id_campanha', campanhaId); // 🎯 Mudado de campanha_id para id_campanha

      // 🎯 Se passar o e-mail (clique no CRM), filtra por ele. Se não passar, traz a grade inteira!
      if (emailLead) {
        query = query.eq('email_cliente', emailLead);
      } else {
        // Na grade geral, traz os disparos mais recentes primeiro
        query = query.order('criado_em', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setDetalhesEnvios?.(data || []); 
    } catch (err) {
      console.error('Erro ao buscar logs da grade:', err);
    } finally {
      setCarregandoDetalhes?.(false);
    }
  }

  async function buscarHistoricoIndividualLead(emailCliente: string) {
    try {
      setCarregandoHistoricoLead(true);
      // Puxa as interações passadas do lead relacionando com o nome da campanha original
      const { data, error } = await supabase
        .from('tab_campanhas_emails_detalhe')
        .select('*, tab_campanhas(nome_evento)')
        .eq('email_cliente', emailCliente)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setHistoricoCampanhasDoLead(data || []);
    } catch (err: any) {
      console.error('Erro ao puxar dossiê do lead:', err);
    } finally {
      setCarregandoHistoricoLead(false);
    }
  }

  async function buscarHistoricoStorage() {
    try {
      setCarregandoArtes(true);
      const { data, error } = await supabase.storage.from('artes-campanhas').list();
      if (error) throw error;
      setListaArtes(data || []);
    } catch (err: any) {
      console.error('Erro ao ler bucket de mídias:', err);
    } finally {
      setCarregandoArtes(false);
    }
  }

  // --- FILTRAGEM DOS LEADS EM MEMÓRIA BASEADO NA NOVA REGRA DE TEMPERATURA ---
  const leadsFiltradosPorTemperatura = leadsElegiveis.filter(lead => {
    const totalAbriu = lead.email_total_aberturas || 0;
    const totalClicou = lead.email_total_cliques || 0;

    // Se o filtro selecionado for 'todos', lista toda a gente
    if (filtroTemperatura === 'todos') return true;

    // 1. CLICOU É QUENTE
    if (filtroTemperatura === 'quentes') {
      return totalClicou > 0;
    }
    
    // 2. ABRIU É MORNO (Teve abertura, mas não tem cliques)
    if (filtroTemperatura === 'mornos') {
      return totalAbriu > 0 && totalClicou === 0;
    }
    
    // 3. NÃO ABRIU É FRIO (Total de aberturas é zero)
    if (filtroTemperatura === 'frios') {
      return totalAbriu === 0;
    }
    
    return true;
  });

  // --- OPERAÇÕES DO SISTEMA (DISPAROS, REENVIOS E CRUDS) ---
  async function handleDispararEmailOriginal() {
    // 1. Validação segura usando as variáveis declaradas no topo do componente
    if (!idCorretorLogado || !idCorretoraLogada) {
      toast.error('Usuário não autenticado ou perfil não carregado.');
      return;
    }
    
    if (!campanhaSelecionada) {
      toast.error('Selecione uma campanha para realizar o disparo.');
      return;
    }

    // Define os alvos baseados no modo ativo (Se for CSV, pega a lista importada; se for Base, filtra a grid)
    const destinatariosFinais = modoPublico === 'csv' 
      ? clientesListaImportada 
      : leadsElegiveis.filter(l => idsLeadsSelecionados.includes(l.id));

    if (destinatariosFinais.length === 0) {
      toast.error('Nenhum destinatário elegível selecionado para envio.');
      return;
    }

    try {
      setEnviando(true);

      // Geração dinâmica da data (DD-MM)
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const dataAtualFormatada = `${dia}-${mes}`;

      // 🛡️ CAPTURA BASEADA NA PROPRIEDADE REAL DO SEU BANCO DE DADOS
      // Na sua tabela 'usuarios_perfis', o ID do corretor/corretora é a coluna 'id'
      const idDoUsuarioLogado = userProfile?.id; 
      const tipoUsuarioLogado = userProfile?.tipo_usuario; // 'CORRETOR' ou 'CORRETORA'

      // Se não houver perfil carregado, avisa o sistema
      if (!idDoUsuarioLogado) {
        console.error("❌ Perfil do usuário não encontrado no estado do componente.");
        toast.error("Erro de sessão: Perfil não identificado.");
        return;
      }

      // Vinculação lógica inteligente:
      // Se for um 'CORRETOR', o id dele vai em 'corretor_id'. 
      // Se for a 'CORRETORA' mãe disparando, o 'corretor_id' pode ser null ou o id dela.
      const idCorretorReal = tipoUsuarioLogado === 'CORRETOR' ? idDoUsuarioLogado : idDoUsuarioLogado;
      const idCorretoraReal = userProfile?.corretora_id || idDoUsuarioLogado; // Fallback caso seja a própria corretora

      // 2. Montagem do payload 100% dinâmico, tipado e sem variáveis perdidas
      const payloadEnvio = {
        id_template_origem: campanhaSelecionada.id, 
        destinatarios: destinatariosFinais, 
        userProfile: userProfile, 
        campanha: {
          nome_evento: campanhaSelecionada.nome_evento,
          mensagem_email: campanhaSelecionada.mensagem_email,
          url_arte_storage: campanhaSelecionada.url_arte_storage || null,
          tipo_evento: campanhaSelecionada.tipo_evento || 'fixo',
          mes_dia: dataAtualFormatada, 
          corretora_id: idCorretoraReal, // 👈 Usa a constante calculada ali em cima!
          corretor_id: idCorretorReal    // 👈 Usa a constante calculada ali em cima!
        }
      };

      // Logs limpos de depuração (Corrigido também o log repetido do corretor_id)
      console.log("📡 PAYLOAD PRONTO PARA REDE:");
      console.log("➡️ corretor_id enviado:", payloadEnvio.campanha.corretor_id);
      console.log("➡️ corretora_id enviado:", payloadEnvio.campanha.corretora_id);

      // Invocação da Edge Function do Supabase
      const { data, error } = await supabase.functions.invoke('disparar-emails', {
        body: payloadEnvio
      });

      if (error) throw error;

      toast.success('🚀 Fila de disparos iniciada com sucesso!');
      
      if (data && data.id_campanha) {
        buscarLogsAuditoria(data.id_campanha);
      } else {
        buscarLogsAuditoria(campanhaSelecionada.id);
      }
      
      setIdsLeadsSelecionados([]);
      
    } catch (err: any) {
      console.error('Erro no processamento do disparo:', err);
      toast.error('Falha no processamento do disparo: ' + err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSalvarCampanha(e: React.FormEvent) {
    e.preventDefault();
    try {
      setEnviando(true);
      let urlArte = campanhaEmEdicao?.url_arte_storage || null;

      if (arteArquivo) {
        const fileExt = arteArquivo.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('artes-campanhas')
          .upload(fileName, arteArquivo);

        if (uploadError) throw uploadError;
        urlArte = supabase.storage.from('artes-campanhas').getPublicUrl(fileName).data.publicUrl;
      }

      if (!idCorretorLogado || !idCorretoraLogada) {
        toast.error('Erro de autenticação. Perfil não carregado.');
        return;
      }

      const payload = {
        nome_evento: nomeEvento,
        tipo_evento: tipoEvento,
        mes_dia: tipoEvento === 'fixo' ? mesDia : null,
        mensagem_email: msgEmail,
        url_arte_storage: urlArte,
        updated_at: new Date().toISOString(),
        corretora_id: idCorretoraLogada,
        corretor_id: idCorretorLogado
      };

      if (campanhaEmEdicao) {
        const { error } = await supabase.from('tab_campanhas').update(payload).eq('id', campanhaEmEdicao.id);
        if (error) throw error;
        toast.success('Campanha atualizada com sucesso!');
      } else {
        // CORREÇÃO: Removido o ID estático do insert
        const { error } = await supabase.from('tab_campanhas').insert([payload]); 
        if (error) throw error;
        toast.success('Nova campanha gravada!');
      }

      setIsModalOpen(false);
      buscarCampanhas();
      buscarHistoricoStorage();
    } catch (err: any) {
      toast.error('Erro ao salvar configuração: ' + err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleReenviarEmailsGrade(linhasEspecificas?: LogEnvioDetalhe[]) {
    try {
      setEnviando(true);
      const alvos = linhasEspecificas || detalhesEnvios.filter(d => idsLinhasSelecionadas.includes(d.id));
      
      if (alvos.length === 0) {
        toast.warning('Nenhum e-mail selecionado para reenvio.');
        return;
      }

      const { error } = await supabase.functions.invoke('disparar-emails', {
        body: { 
          campanhaId: campanhaSelecionada?.id, 
          reenvio: true,
          logsAlvo: alvos 
        }
      });

      if (error) throw error;

      toast.success(`🔄 Reenvio processado para ${alvos.length} destinatário(s)`);
      if (campanhaSelecionada) buscarLogsAuditoria(campanhaSelecionada.id);
      setIdsLinhasSelecionadas([]);
    } catch (err: any) {
      toast.error('Erro ao reenviar: ' + err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSalvarEdicaoEmailLinha(logId: string) {
    try {
      const { error } = await supabase
        .from('tab_campanhas_emails_detalhe')
        .update({ email_cliente: emailEditadoValue, status_entrega: 'corrigido_pendente' })
        .eq('id', logId);

      if (error) throw error;
      toast.success('E-mail corrigido na grade de auditoria.');
      setLinhaEmEdicao(null);
      if (campanhaSelecionada) buscarLogsAuditoria(campanhaSelecionada.id);
    } catch (err: any) {
      toast.error('Erro ao atualizar e-mail: ' + err.message);
    }
  }

  async function handleDeletarLinhaEnvio(logId: string) {
    if (!window.confirm('Deseja remover este registro de histórico permanentemente?')) return;
    try {
      const { error } = await supabase.from('tab_campanhas_emails_detalhe').delete().eq('id', logId);
      if (error) throw error;
      toast.success('Registro removido.');
      if (campanhaSelecionada) buscarLogsAuditoria(campanhaSelecionada.id);
    } catch (err: any) {
      toast.error('Erro ao deletar registro: ' + err.message);
    }
  }

  async function handleExcluirArteStorage(nomeArquivo: string) {
    if (!window.confirm(`Excluir o arquivo "${nomeArquivo}" permanentemente do Storage?`)) return;
    try {
      const { error } = await supabase.storage.from('artes-campanhas').remove([nomeArquivo]);
      if (error) throw error;
      toast.success('Arquivo deletado do bucket.');
      buscarHistoricoStorage();
    } catch (err: any) {
      toast.error('Erro ao excluir mídia: ' + err.message);
    }
  }

  function handleAbrirModalCriacao() {
    setCampanhaEmEdicao(null);
    setNomeEvento('');
    setTipoEvento('fixo');
    setMesDia('');
    setMsgEmail('');
    setArteArquivo(null);
    setIsModalOpen(true);
  }

  function handleAbrirModalEdicao(campanha: Campanha) {
    setCampanhaEmEdicao(campanha);
    setNomeEvento(campanha.nome_evento);
    setTipoEvento(campanha.tipo_evento);
    setMesDia(campanha.mes_dia || '');
    setMsgEmail(campanha.mensagem_email || '');
    setArteArquivo(null);
    setIsModalOpen(true);
  }

  async function handleDownloadArte(url: string, nomeEvento: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `arte-${nomeEvento.replaceAll(' ', '_')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Incapaz de baixar o arquivo automaticamente.');
    }
  }

  function handleEditarCampanhaPorArte(urlPublica: string) {
    const campanhaDona = campanhas.find(c => c.url_arte_storage === urlPublica);
    if (campanhaDona) {
      handleAbrirModalEdicao(campanhaDona);
    } else {
      handleAbrirModalCriacao();
      setMsgEmail(`Mídia pré-vinculada: ${urlPublica}`);
    }
  }

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen space-y-6">
      
      {/* ==========================================================
          PRIMEIRA LINHA: CONJUNTO DE 3 COLUNAS DE GERENCIAMENTO
          ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: Campanhas Disponíveis */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px]">
          <div className="flex justify-between items-center border-b pb-2 mb-3">
            <h2 className="font-semibold text-base text-gray-700">📅 1. Campanhas e Gatilhos</h2>
            <button
              onClick={handleAbrirModalCriacao}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              + Nova Regra
            </button>
          </div>

          {carregandoCampanhas ? (
            <p className="text-center text-xs text-gray-400 py-12 animate-pulse">Consultando tab_campanhas...</p>
          ) : campanhas.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-12">Nenhuma campanha registrada no sistema.</p>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
              {campanhas.map((camp) => (
                <div
                  key={camp.id}
                  onClick={() => setCampanhaSelecionada(camp)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    campanhaSelecionada?.id === camp.id
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                      : 'border-gray-100 bg-white hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-gray-800 truncate max-w-[180px]">{camp.nome_evento}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      camp.tipo_evento === 'aniversario' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {camp.tipo_evento === 'aniversario' ? '🎂 Aniversário' : '📅 Recorrente'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                    {camp.mensagem_email || <span className="italic">Nenhum template de e-mail estruturado...</span>}
                  </p>

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50 text-[11px]">
                    <span className="text-gray-400 font-mono">
                      Gatilho: {camp.tipo_evento === 'aniversario' ? 'Dia do Nasc.' : `Todo dia ${camp.mes_dia}`}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAbrirModalEdicao(camp); }}
                      className="text-gray-400 hover:text-blue-600 font-medium"
                    >
                      Ajustar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA 2: Eleger Público Alvo com Inteligência de Temperatura ou Importação CSV */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px]">
          <div className="border-b pb-2 mb-2 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-base text-gray-700">👥 2. Eleger Público Alvo</h2>
              <p className="text-[11px] text-gray-400">Filtre da sua base ou importe uma lista externa</p>
            </div>
            
            {/* SELETOR DE MODO: BANCO VS CRM VS CSV */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold gap-0.5">
              <button
                type="button"
                onClick={() => setModoPublico('base')}
                className={`px-2 py-1 rounded-md transition-all ${modoPublico === 'base' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
              >
                Filtrar Base
              </button>
              <button
                type="button"
                onClick={() => setModoPublico('crm')}
                className={`px-2 py-1 rounded-md transition-all ${modoPublico === 'crm' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
              >
                Clientes CRM
              </button>
              <button
                type="button"
                onClick={() => setModoPublico('csv')}
                className={`px-2 py-1 rounded-md transition-all ${modoPublico === 'csv' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
              >
                Importar CSV
              </button>
            </div>




          </div>

          {!campanhaSelecionada ? (
            <div className="flex-1 flex items-center justify-center border border-dashed rounded-xl bg-gray-50/50 p-6 text-center text-xs text-gray-400">
              Selecione uma campanha à esquerda para carregar as opções de público alvo.
            </div>
          ) : carregandoLeads ? (
            <p className="text-center text-xs text-gray-400 py-12 animate-pulse">Carregando dados...</p>
          ) : (!modoPublico || modoPublico === 'base') ? (
            
            /* ==========================================
              MODO ATUAL: INTELIGÊNCIA DE BASE (INALTERADO)
              ========================================== */
            <div className="flex flex-col flex-1 min-h-0">
              {/* INTERFACE DE FILTROS DE TEMPERATURA */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg mb-3 text-[10px] font-bold text-center">
                <button 
                  onClick={() => setFiltroTemperatura('todos')}
                  className={`py-1 rounded ${filtroTemperatura === 'todos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Todos ({leadsElegiveis.length})
                </button>
                <button 
                  onClick={() => setFiltroTemperatura('frios')}
                  className={`py-1 rounded ${filtroTemperatura === 'frios' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-blue-500'}`}
                >
                  ❄️ Frios
                </button>
                <button 
                  onClick={() => setFiltroTemperatura('mornos')}
                  className={`py-1 rounded ${filtroTemperatura === 'mornos' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-400 hover:text-orange-500'}`}
                >
                  ☕ Mornos
                </button>
                <button 
                  onClick={() => setFiltroTemperatura('quentes')}
                  className={`py-1 rounded ${filtroTemperatura === 'quentes' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'}`}
                >
                  🔥 Quentes
                </button>
              </div>

              {/* CABEÇALHO COM CHECKBOX DE SELEÇÃO ISOLADA DA ABA */}
              {leadsFiltradosPorTemperatura.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg mb-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={leadsFiltradosPorTemperatura.every(l => idsLeadsSelecionados.includes(l.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Preserva o que já estava selecionado em outras abas e adiciona os atuais da grid
                        const novosIds = [...idsLeadsSelecionados];
                        leadsFiltradosPorTemperatura.forEach(l => {
                          if (!novosIds.includes(l.id)) novosIds.push(l.id);
                        });
                        setIdsLeadsSelecionados(novosIds);
                      } else {
                        // Remove apenas os itens que pertencem a esta listagem filtrada, mantendo intactos os do CRM
                        const idsDaGrid = leadsFiltradosPorTemperatura.map(l => l.id);
                        setIdsLeadsSelecionados(idsLeadsSelecionados.filter(id => !idsDaGrid.includes(id)));
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-bold text-gray-600 uppercase">Selecionar Todos Filtrados ({leadsFiltradosPorTemperatura.length})</span>
                </div>
              )}

              {leadsFiltradosPorTemperatura.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed rounded-xl bg-gray-50/50 text-gray-400 text-xs p-4 text-center">
                  Nenhum lead nesta faixa de temperatura.
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 custom-scrollbar">
                  {leadsFiltradosPorTemperatura.map((lead) => {
                    const totalAbriu = lead.email_total_aberturas || 0;
                    const totalClicou = lead.email_total_cliques || 0;

                    const visualQuente = totalAbriu > 0 || totalClicou > 0;
                    const visualMorno = totalAbriu > 0 && totalClicou === 0;
                    const visualFrio = totalAbriu === 0 && totalClicou === 0;

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setLeadParaVerHistorico(lead)}
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all text-left relative ${
                          leadParaVerHistorico?.id === lead.id ? 'ring-2 ring-blue-400' : ''
                        } ${
                          idsLeadsSelecionados.includes(lead.id) ? 'border-blue-200 bg-blue-50/10' : 'border-gray-50 bg-white hover:bg-gray-50/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={idsLeadsSelecionados.includes(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => {
                            setIdsLeadsSelecionados(prev =>
                              prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                            );
                          }}
                          className="rounded text-blue-600 border-gray-300 focus:ring-blue-500/20 h-3.5 w-3.5"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold text-gray-700 truncate flex items-center gap-1">
                            {lead.nome || 'Lead sem Nome'}
                            {visualQuente && filtroTemperatura === 'quentes' && <span className="text-[10px]">🔥</span>}
                            {visualMorno && filtroTemperatura === 'mornos' && <span className="text-[10px]">☕</span>}
                            {visualFrio && filtroTemperatura === 'frios' && <span className="text-[10px]">❄️</span>}
                            {filtroTemperatura === 'todos' && (
                              <>
                                {visualQuente && !visualMorno && <span className="text-[10px]">🔥</span>}
                                {visualMorno && <span className="text-[10px]">☕</span>}
                                {visualFrio && <span className="text-[10px]">❄️</span>}
                              </>
                            )}
                          </p>
                          <p className="text-gray-400 font-mono truncate text-[10px]">{lead.email}</p>
                          
                          <div className="flex gap-2 mt-1">
                            <span className={`text-[9px] px-1 rounded font-bold ${totalAbriu > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                              👁️ {totalAbriu} aberturas
                            </span>
                            {totalClicou > 0 && (
                              <span className="text-[9px] px-1 rounded font-bold bg-purple-50 text-purple-600 border border-purple-100">
                                💬 {totalClicou} clicks
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize">
                          {lead.origem_lead}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : modoPublico === 'crm' ? (
            /* ==========================================
              MODO NOVO: CLIENTES DIRETOS DO CRM
              ========================================== */
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                <span className="text-[11px] font-bold text-purple-700 uppercase block">Carteira Ativa do CRM</span>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  Listando clientes cadastrados que possuem e-mail válido.
                </p>
              </div>

              <div className="flex-1 flex flex-col border border-gray-100 rounded-xl min-h-0 bg-gray-50/30 p-2">
                {carregandoCRM ? (
                  <p className="text-center text-xs text-gray-400 py-12 animate-pulse">Consultando tab_clientes...</p>
                ) : clientesCRM.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center border border-dashed rounded-lg bg-white p-4">
                    Nenhum cliente elegível encontrado no CRM para esta regra.
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-0">
                    <div className="text-[10px] font-bold text-purple-600 uppercase pb-1 flex justify-between">
                      <span>🤝 Contatos da Carteira</span>
                      <span>Total: {clientesCRM.length}</span>
                    </div>

                    {/* CHECKBOX SELECIONAR TODOS DO CRM */}
                    {clientesCRM.length > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-purple-50/40 border border-purple-100 rounded-lg mb-2 text-[11px]">
                        <input
                          type="checkbox"
                          checked={clientesCRM.every(c => idsLeadsSelecionados.includes(c.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Mantém o que já estava marcado em outras abas e adiciona os atuais do CRM
                              const novosIds = [...idsLeadsSelecionados];
                              clientesCRM.forEach(c => {
                                if (!novosIds.includes(c.id)) novosIds.push(c.id);
                              });
                              setIdsLeadsSelecionados(novosIds);
                            } else {
                              // Filtra para remover apenas quem pertence ao CRM, protegendo a seleção da Base
                              const idsDoCrm = clientesCRM.map(c => c.id);
                              setIdsLeadsSelecionados(idsLeadsSelecionados.filter(id => !idsDoCrm.includes(id)));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span className="font-bold text-purple-700 uppercase">Selecionar Todos do CRM</span>
                      </div>
                    )}
                    
                    <div className="overflow-y-auto flex-1 space-y-1 pr-0.5 custom-scrollbar bg-white p-2 rounded-lg border">
                      {clientesCRM.map((item: any) => {
                        // Verificação de destaque visual: confere se este item é o selecionado na ficha
                        const estaSelecionado = leadParaVerHistorico?.id === item.id;
                        const isChecked = idsLeadsSelecionados.includes(item.id);

                        return (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              // 1. Alimenta o estado nativo que aciona perfeitamente o histórico por e-mail
                              setLeadParaVerHistorico({
                                id: item.id,
                                nome: item.nome || item.nome_fantasia || 'Sem Nome',
                                email: item.email,
                                email_total_aberturas: 0,
                                email_total_cliques: 0,
                                cliente_id: item.id,
                                telefone_whats: item.telefone_whats || null,
                                status_engajamento_email: 'valido',
                                origem_lead: 'crm'
                              });
                              
                              // Removida a chamada direta a buscarLogsAuditoria para eliminar o erro de coluna inexistente 🎯
                            }}
                            className={`flex justify-between items-center text-[11px] py-1.5 border-b last:border-0 border-gray-50 px-2 cursor-pointer transition-colors rounded ${
                              estaSelecionado 
                                ? 'bg-purple-100/70 border-l-4 border-purple-600 pl-1 font-semibold text-purple-900' 
                                : 'hover:bg-purple-50/50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate max-w-[170px]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(e) => e.stopPropagation()} // Impede de abrir o histórico só por clicar na caixinha
                                onChange={() => {
                                  if (isChecked) {
                                    setIdsLeadsSelecionados(idsLeadsSelecionados.filter(id => id !== item.id));
                                  } else {
                                    setIdsLeadsSelecionados([...idsLeadsSelecionados, item.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                              />
                              <div className="truncate">
                                <p className="truncate font-medium">{item.nome || item.nome_fantasia || 'Sem Nome'}</p>
                                <p className={`text-[9px] font-mono truncate ${estaSelecionado ? 'text-purple-600' : 'text-gray-400'}`}>
                                  {item.email}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                              item.tipo_cliente === 'PJ' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {item.tipo_cliente}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            
            /* ==========================================
              MODO NOVO: IMPORTAÇÃO DE LISTA EM CSV
              ========================================== */
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-blue-700 uppercase block">Instruções do Arquivo</span>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Carregue um arquivo <code className="bg-white px-1 py-0.5 rounded font-mono border">.csv</code> contendo obrigatoriamente as colunas <code className="bg-white px-1 py-0.5 rounded font-mono border font-bold">nome,email</code> na primeira linha.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Carregar arquivo local</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      if (!text) return;

                      const linhas = text.split(/\r?\n/);
                      const listaEstruturada: any[] = [];

                      linhas.forEach((linha, idx) => {
                        const colunas = linha.split(',');
                        if (colunas.length < 2) return;

                        let nome = colunas[0].replace(/^["']|["']$/g, '').trim();
                        let email = colunas[1].replace(/^["']|["']$/g, '').trim();

                        if (idx === 0 && nome.toLowerCase() === 'nome' && email.toLowerCase() === 'email') return;

                        if (email) {
                          listaEstruturada.push({
                            nome: nome || 'Cliente',
                            email: email.toLowerCase(),
                            tipo_cliente: 'PF',
                            nome_fantasia: null
                          });
                        }
                      });

                      setClientesListaImportada(listaEstruturada);
                    };
                    reader.readAsText(file, 'UTF-8');
                  }}
                  className="w-full p-2 text-xs bg-gray-50 border rounded-lg file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              {/* Preview/Painel dos itens carregados */}
              <div className="flex-1 flex flex-col border border-gray-100 rounded-xl min-h-0 bg-gray-50/30 p-2">
                {clientesListaImportada.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center border border-dashed rounded-lg bg-white">
                    Nenhum arquivo processado até o momento.
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-0">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase pb-1 flex justify-between">
                      <span>📋 Destinatários identificados</span>
                      <span>Total: {clientesListaImportada.length}</span>
                    </div>
                    <div className="overflow-y-auto flex-1 space-y-1 pr-0.5 custom-scrollbar bg-white p-2 rounded-lg border">
                      {clientesListaImportada.slice(0, 100).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b last:border-0 border-gray-50">
                          <span className="font-semibold text-gray-700 truncate max-w-[120px]">{item.nome}</span>
                          <span className="font-mono text-gray-400 text-[10px] truncate">{item.email}</span>
                        </div>
                      ))}
                      {clientesListaImportada.length > 100 && (
                        <p className="text-[10px] text-center text-gray-400 pt-1 font-semibold italic">
                          + {clientesListaImportada.length - 100} contatos na fila...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
                disabled={
                  enviando || 
                  (modoPublico === 'csv' 
                    ? clientesListaImportada.length === 0 
                    : modoPublico === 'crm'
                      ? clientesCRM.filter((c: any) => idsLeadsSelecionados.includes(c.id)).length === 0
                      : idsLeadsSelecionados.length === 0)
                }
                onClick={async () => {
                  console.log("🔘 Botão de disparo clicado. Modo ativo:", modoPublico);

                  // SE FOR MODO CSV: Dispara para a sua nova lógica de lote importado
                  if (modoPublico === 'csv') {
                    console.log(`📊 Total de registros detectados no CSV do estado React: ${clientesListaImportada.length}`);
                    
                    if (!confirm(`Confirmar o disparo imediato para os ${clientesListaImportada.length} contatos importados via CSV?`)) {
                      console.log("❌ Operação abortada pelo usuário no prompt de confirmação.");
                      return;
                    }
                    
                    setEnviando(true);
                    try {
                      const cAny = campanhaSelecionada as any;

                      // 🧠 INTELIGÊNCIA DE IDS LOGADOS (Igual ao handleDispararEmailOriginal)
                      const idDoUsuarioLogado = userProfile?.id;

                      if (!idDoUsuarioLogado) {
                        toast.error("Erro de sessão: Perfil não identificado.");
                        setEnviando(false);
                        return;
                      }

                      const idCorretorReal = idDoUsuarioLogado; // Chave primária do usuário
                      const idCorretoraReal = userProfile?.corretora_id || idDoUsuarioLogado; // Fallback caso seja a própria corretora

                      // Montando o payload estruturado e 100% preenchido
                      const payload = {
                        userProfile: userProfile, // 👈 Backup seguro para a Edge Function
                        id_template_origem: cAny.id,
                        campanha: {
                          id: cAny.id,
                          nome_evento: cAny.nome_evento,
                          mensagem_email: cAny.mensagem_email,
                          url_arte_storage: cAny.url_arte_storage || null,
                          tipo_evento: cAny.tipo_evento || 'fixo',
                          mes_dia: cAny.mes_dia || null,
                          corretora_id: idCorretoraReal, // 👈 Agora vai corrigido!
                          corretor_id: idCorretorReal    // 👈 Agora vai corrigido!
                        },
                        destinatarios: clientesListaImportada
                      };

                      // --- CONSOLES DIAGNÓSTICOS AVANÇADOS ---
                      console.group("📡 INVESTIGAÇÃO DE DISPARO DA EDGE FUNCTION");
                      console.log("1. Informações básicas do cabeçalho da campanha:");
                      console.table(payload.campanha);
                      
                      console.log("2. Amostra dos primeiros 3 destinatários que serão transmitidos:");
                      console.table(clientesListaImportada.slice(0, 3));

                      console.log("3. Verificação do tamanho bruto do JSON em texto:");
                      try {
                        const jsonStringificado = JSON.stringify(payload);
                        const tamanhoEmBytes = new Blob([jsonStringificado]).size;
                        const tamanhoEmMb = (tamanhoEmBytes / (1024 * 1024)).toFixed(2);
                        console.log(`📏 Tamanho do payload de transmissão: ${tamanhoEmMb} MB (${tamanhoEmBytes} bytes)`);
                        
                        if (tamanhoEmBytes > 5 * 1024 * 1024) {
                          console.warn("⚠️ ALERTA CRÍTICO: O payload passou de 5MB!");
                        }
                      } catch (e) {
                        console.error("❌ FALHA CRÍTICA: Não foi possível stringificar o objeto JSON!", e);
                      }
                      console.groupEnd();

                      // Executa a chamada explícita
                      console.log("✈️ Invocando 'supabase.functions.invoke' agora...");
                      const { data, error } = await supabase.functions.invoke('disparar-emails', {
                        body: payload
                      });

                      if (error) {
                        console.group("❌ ERRO RETORNADO PELO CLIENT DO SUPABASE:");
                        console.error(error);
                        console.groupEnd();
                        throw error;
                      }

                      console.log("✅ RESPOSTA COM SUCESSO DA EDGE FUNCTION:", data);
                      toast.success(`🚀 Campanha em lote iniciada! Total: ${data?.total_enviados || clientesListaImportada.length} contatos.`);
                      setClientesListaImportada([]); 
                      
                      const fAny = window as any;
                      if (typeof fAny.detalhesEnvios === 'function') {
                        fAny.detalhesEnvios(campanhaSelecionada.id);
                      }

                    } catch (err: any) {
                      console.group("💥 EXCEÇÃO CAPTURADA NO CATCH DO FRONT-END:");
                      console.error(err);
                      console.groupEnd();
                      
                      toast.error(`❌ Falha no disparo do CSV: ${err.message || 'Erro interno de processamento'}`);
                    } finally {
                      setEnviando(false);
                    }
                  }
                  
                  // SE FOR MODO CRM ou MODO BASE: Roda a sua função padrão original intacta (que agora mapeará a aba correta)
                  else {
                    console.log("➡️ Executando rota normal base ( handleDispararEmailOriginal ).");
                    handleDispararEmailOriginal();
                  }
                }}
                className={`w-full py-2.5 font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1 text-white ${
                  modoPublico === 'csv' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' 
                    : modoPublico === 'crm'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                } disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-400`}
              >
                {enviando ? (
                  'Efetuando processamento...'
                ) : modoPublico === 'csv' ? (
                  `✈️ Disparar Lista Importada (${clientesListaImportada.length})`
                ) : modoPublico === 'crm' ? (
                  `🤝 Disparar Selecionados CRM (${clientesCRM.filter((c: any) => idsLeadsSelecionados.includes(c.id)).length})`
                ) : (
                  `🚀 Iniciar Fila de Envio (${idsLeadsSelecionados.length})`
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================
          SEÇÃO EXTRA: PAINEL DE DOSSIÊ / HISTÓRICO COMPLETO DO LEAD SELECIONADO
          ========================================================== */}
      {leadParaVerHistorico && (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-5 rounded-xl shadow-md border text-white space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                🔎 Ficha de Inteligência do Lead: <span className="text-blue-300">{leadParaVerHistorico.nome || 'Sem nome cadastrado'}</span>
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{leadParaVerHistorico.email}</p>
            </div>
            <button 
              onClick={() => setLeadParaVerHistorico(null)}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
            >
              Fechar Ficha ×
            </button>
          </div>

          {carregandoHistoricoLead ? (
            <p className="text-xs text-slate-400 animate-pulse">Cruzando dados de tab_campanhas_emails_detalhe...</p>
          ) : historicoCampanhasDoLead.length === 0 ? (
            <p className="text-xs text-slate-300 italic">Esse contato ainda não possui registros de disparos anteriores no sistema.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {historicoCampanhasDoLead.map((hist) => (
                <div key={hist.id} className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-blue-200 truncate max-w-[180px]">
                      {hist.tab_campanhas?.nome_evento || 'Campanha Desconhecida'}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold ${
                      hist.status_entrega === 'entregue' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {hist.status_entrega}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Disparo: {new Date(hist.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-white/5 font-semibold text-[10px]">
                    <span className={hist.abriu_email ? 'text-emerald-400' : 'text-slate-500'}>
                      {hist.abriu_email ? '👁️ Abriu E-mail' : '❌ Não Abriu'}
                    </span>
                    <span className={hist.clicou_whatsapp ? 'text-purple-400' : 'text-slate-500'}>
                      {hist.clicou_whatsapp ? '💬 Clicou no Whats' : '❌ Não Clicou'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================================
          SEGUNDA LINHA: GRADE DE MONITORAMENTO (tab_campanhas_emails_detalhe)
          ========================================================== */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-3">
          <div>
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              📊 Painel de Controle e Grade Geral de Monitoramento
            </h2>
            <p className="text-xs text-gray-500">Aberturas da tab_campanhas_emails_detalhe em tempo real e ações em lote</p>
          </div>
          
          {/* AÇÕES EM LOTE (REENVIO E EXCLUSÃO) */}
          {idsLinhasSelecionadas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-2 animate-fadeIn flex-wrap">
              <span className="text-xs font-semibold text-amber-800 mr-2">
                {idsLinhasSelecionadas.length} itens marcados:
              </span>
              <button
                onClick={() => handleReenviarEmailsGrade()}
                disabled={enviando}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1 rounded transition-colors shadow-sm"
              >
                🔄 Reenviar em Lote
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Tem certeza que deseja excluir os ${idsLinhasSelecionadas.length} registros selecionados?`)) {
                    try {
                      // 🔥 Executa a exclusão em massa usando a cláusula 'in' nativa do Supabase
                      const { error } = await supabase
                        .from('tab_campanhas_emails_detalhe')
                        .delete()
                        .in('id', idsLinhasSelecionadas);

                      if (error) throw error;

                      // Atualiza o estado local removendo os itens deletados de uma vez só
                      setDetalhesEnvios(prev => prev.filter(item => !idsLinhasSelecionadas.includes(item.id)));
                      setIdsLinhasSelecionadas([]);
                      toast.success('Registros excluídos com sucesso!');
                    } catch (err) {
                      console.error('Erro ao deletar lote:', err);
                      toast.error('Erro ao excluir registros em lote.');
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] px-3 py-1 rounded transition-colors shadow-sm"
              >
                🗑️ Excluir em Lote
              </button>
            </div>
          )}
        </div>

        {/* 🎯 FILTRO DE MONITORAMENTO DA GRADE CORRIGIDO */}
        {campanhaSelecionada && detalhesEnvios.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
            <span className="font-semibold text-gray-600">🎯 Filtrar Registros:</span>
            <select 
              id="filtroSegmento"
              value={filtroGrade}
              className="p-1 px-2 border rounded bg-white font-medium text-gray-700 outline-none focus:border-blue-500"
              onChange={(e) => setFiltroGrade(e.target.value as any)}
            >
              <option value="TODOS">👥 Mostrar Todos os Disparos</option>
              <option value="ENTREGUE">✅ Entrega: Entregue (Resend)</option>
              <option value="FALHA">⚠️ Entrega: Bounce / Falha</option>
              <option value="ABRIU">📩 Interação: Abriu E-mail</option>
              <option value="CLICOU">💬 Interação: Clique Whats</option>
            </select>
          </div>
        )}

        {!campanhaSelecionada ? (
          <div className="py-12 text-center text-sm text-gray-400 border border-dashed rounded-xl bg-gray-50/40">
            Selecione uma campanha na primeira linha para abrir a grade completa de auditoria de e-mails.
          </div>
        ) : carregandoDetalhes ? (
          <p className="text-center text-xs text-gray-400 py-12 animate-pulse">Buscando registros na tab_campanhas_emails_detalhe...</p>
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
                {/* 🎯 FILTRAGEM DINÂMICA VIA REACT APLICADA AQUI */}
                {detalhesEnvios
                  .filter((detalhe) => {
                    if (filtroGrade === 'TODOS') return true;
                    if (filtroGrade === 'ENTREGUE') return detalhe.status_entrega === 'entregue';
                    if (filtroGrade === 'FALHA') return detalhe.status_entrega !== 'entregue' && detalhe.status_entrega !== 'enviando';
                    if (filtroGrade === 'ABRIU') return detalhe.abriu_email === true;
                    if (filtroGrade === 'CLICOU') return detalhe.clicou_whatsapp === true;
                    return true;
                  })
                  .map((detalhe) => {
                    const isModoEdicaoLinha = linhaEmEdicao === detalhe.id;

                  return (
                    <tr 
                      key={detalhe.id} 
                      className="hover:bg-gray-50/50 transition-colors linha-envio-registro"
                    >
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

                      <td className="py-3.5 px-4 align-middle max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 leading-snug truncate">
                            {detalhe.tipo_cliente === 'PF' ? detalhe.nome_cliente : (detalhe.nome_fantasia || detalhe.nome_cliente)}
                            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-gray-100 text-gray-500 font-bold">{detalhe.tipo_cliente}</span>
                          </span>
                          
                          {isModoEdicaoLinha ? (
                            <div className="flex items-center gap-1.5 mt-1.5 animate-fadeIn">
                              <input
                                type="text"
                                value={emailEditadoValue}
                                onChange={(e) => setEmailEditadoValue(e.target.value)}
                                className="p-1 px-2 text-xs border border-gray-300 rounded bg-white w-48 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                              <button
                                onClick={() => handleSalvarEdicaoEmailLinha(detalhe.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setLinhaEmEdicao(null)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded text-[10px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-normal text-xs truncate mt-0.5">{detalhe.email_cliente}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle text-gray-500 text-xs whitespace-nowrap">
                        {new Date(detalhe.criado_em).toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {detalhe.status_entrega === 'enviando' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            ⏳ Processando
                          </span>
                        ) : detalhe.status_entrega === 'entregue' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Entregue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200" title={detalhe.status_entrega}>
                            ⚠️ Bounce / Falha
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-middle text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-12 rounded-full text-xs font-medium border ${
                          detalhe.abriu_email ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                          {detalhe.abriu_email ? 'Sim' : 'Não'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-middle text-center">
                        {detalhe.clicou_whatsapp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                            💬 Clicou
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-normal">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setLinhaEmEdicao(detalhe.id);
                              setEmailEditadoValue(detalhe.email_cliente);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded text-xs font-medium transition-colors shadow-sm"
                          >
                            ✏️ Editar
                          </button>
                          
                          <button
                            onClick={() => handleReenviarEmailsGrade([detalhe])}
                            disabled={enviando}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold transition-colors shadow-sm"
                          >
                            🔄 Reenviar
                          </button>
                          
                          <button
                            onClick={() => handleDeletarLinhaEnvio(detalhe.id)}
                            className="p-1 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded border border-gray-200 text-xs transition-colors shadow-sm"
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
          RODAPÉ: GERENCIADOR DO STORAGE DE ARTES
          ========================================================== */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div>
            <h2 className="font-bold text-base text-gray-800 flex items-center gap-2">
              📦 Gerenciador do Storage de Mídias e Artes
            </h2>
            <p className="text-xs text-gray-500">
              Arquivos de imagem atualmente armazenados no bucket <code className="bg-gray-100 px-1 rounded text-red-600 font-mono">artes-campanhas</code>
            </p>
          </div>
          <div className="text-right text-xs text-gray-400 font-mono">
            Espaço Estimado Ocupado: <span className="text-gray-700 font-bold">{totalEspacoMB.toFixed(2)} MB</span>
          </div>
        </div>

        {carregandoArtes ? (
          <p className="text-center text-xs text-gray-400 py-6 animate-pulse">Listando objetos do Supabase Storage...</p>
        ) : listaArtes.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6 italic">Nenhum arquivo isolado encontrado no bucket.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {listaArtes.map((arte, idx) => {
              const urlPublica = supabase.storage.from('artes-campanhas').getPublicUrl(arte.name).data.publicUrl;
              const tamanhoBytes = arte.metadata && typeof arte.metadata === 'object' && 'size' in arte.metadata 
                ? (arte.metadata as any).size 
                : 0;
              const tamanhoKB = tamanhoBytes / 1024;

              return (
                <div 
                  key={arte.id || idx} 
                  className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex flex-col justify-between h-44 shadow-sm group relative hover:border-gray-300 transition-all"
                >
                  <div className="w-full h-24 bg-white rounded-lg overflow-hidden flex items-center justify-center p-1 border shadow-inner">
                    <img 
                      src={urlPublica} 
                      alt={arte.name} 
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" 
                    />
                  </div>
                  
                  <div className="mt-2 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700 truncate font-mono" title={arte.name}>
                      {arte.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {tamanhoKB > 1024 ? `${(tamanhoKB / 1024).toFixed(1)} MB` : `${tamanhoKB.toFixed(0)} KB`}
                    </p>
                  </div>

                  {/* AÇÕES FLUTUANTES AO PASSAR O MOUSE */}
                  <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                    <button
                      type="button"
                      onClick={() => handleEditarCampanhaPorArte(urlPublica)}
                      className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow transition-colors"
                    >
                      🔗 Vincular / Usar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluirArteStorage(arte.name)}
                      className="w-full py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow transition-colors"
                    >
                      🗑️ Excluir Mídia
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================================
          MODAL DE CADASTRO / EDIÇÃO DE CAMPANHA (isModalOpen)
          ========================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border max-w-lg w-full overflow-hidden flex flex-col">
            
            {/* Cabeçalho */}
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800">
                {campanhaEmEdicao ? '✏️ Editar Configuração da Campanha' : '✨ Cadastrar Nova Campanha / Gatilho'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Formulário CORRIGIDO mapeando os valores estáticos do formulário */}
            <form onSubmit={handleSalvarCampanha} className="p-4 space-y-4 flex-1 overflow-y-auto">
              
              {/* Nome do Evento */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Nome do Evento / Campanha</label>
                <input 
                  type="text" 
                  required
                  value={nomeEvento}
                  onChange={(e) => setNomeEvento(e.target.value)}
                  placeholder="Ex: Campanha de Aniversário Maio, Black Friday..."
                  className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Tipo de Evento e Gatilho */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Tipo de Gatilho</label>
                  <select
                    value={tipoEvento}
                    onChange={(e) => setTipoEvento(e.target.value as 'fixo' | 'aniversario')}
                    className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="fixo">📅 Data Recorrente Fixa</option>
                    <option value="aniversario">🎂 Dia do Aniversário</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Dia de Disparo</label>
                  <input 
                    type="text"
                    disabled={tipoEvento === 'aniversario'}
                    required={tipoEvento === 'fixo'}
                    value={tipoEvento === 'aniversario' ? '' : mesDia}
                    onChange={(e) => setMesDia(e.target.value)}
                    placeholder="Ex: 25-05 ou 10"
                    className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              {/* Upload de Arte (Mídia) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Arte / Imagem de Fundo</label>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArteArquivo(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-1.5 text-xs border rounded-lg file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {campanhaEmEdicao?.url_arte_storage && !arteArquivo && (
                  <p className="text-[10px] text-emerald-600 font-medium">✨ Já possui uma imagem vinculada no storage.</p>
                )}
              </div>

              {/* Corpo do E-mail (Template) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Mensagem do E-mail (HTML/Texto)</label>
                <textarea 
                  rows={4}
                  required
                  value={msgEmail}
                  onChange={(e) => setMsgEmail(e.target.value)}
                  placeholder="Escreva a mensagem. Use {nome} para personalizar dinamicamente..."
                  className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              {/* Rodapé do Form / Ações */}
              <div className="pt-3 border-t flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-bold shadow-sm transition-colors"
                >
                  {enviando ? 'Gravando dados...' : '💾 Salvar Configuração'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}