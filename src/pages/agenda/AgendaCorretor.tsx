import { useEffect, useState, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ModalGerenciamentoRenovacao } from '../../contexts/ModalGerenciamentoRenovacao';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabaseClient';

import { CalendarCheck, Link2Off, UserPlus, X, Info } from 'lucide-react';
import ModalContato from './modalcontatos';

interface EventoAgenda {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    clienteId: string;
    tipo: 'PF' | 'PJ' | 'FRIO';
    fase: string;
    origem: 'COMERCIAL' | 'SINISTRO' | 'RENOVACAO' | 'AGENDA_FRIA';
    itemId?: string;
    contatoFrio?: {
      telefone: string;
      email: string;
      breve_descricao?: string;
      
    };
  };
}

export default function AgendaCorretor() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [googleConectado, setGoogleConectado] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const processingCode = useRef(false);
  const [modalRenovAberto, setModalRenovAberto] = useState(false);
  const [itemRenovacaoSelecionado, setItemRenovacaoSelecionado] = useState<any>(null);

  // --- ESTADOS PARA A NOVA AGENDA FRIA ---
  const [modalAgendaFriaAberto, setModalAgendaFriaAberto] = useState(false);
  const [loadingSalvarAgenda, setLoadingSalvarAgenda] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState({
    nome_cliente: '',
    tel_cliente: '',
    email_cliente: '',
    breve_descricao: '',
    data_retorno: new Date().toISOString().split('T')[0],
    horario_retorno: '09:00'
  });
  const [contatoFrioDetalhe, setContatoFrioDetalhe] = useState<{
    nome: string;
    telefone: string;
    email: string;
    breve_descricao?: string;
  } | null>(null);

  const fetchCompromissos = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("id, tipo_usuario, corretora_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!perfil) return;
      setTipoUsuario(perfil.tipo_usuario);

      // --- BUSCA A: CLIENTES (tab_clientes) ---
      let queryCli = supabase
        .from('tab_clientes')
        .select('id, nome, razao_social, nome_fantasia, tipo_cliente, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, fase_kanban, corretora_id, corretor_id')
        .eq('corretora_id', perfil.corretora_id)
        .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

      if (perfil.tipo_usuario === 'CORRETOR') {
        queryCli = queryCli.eq('corretor_id', perfil.id);
      }

      // --- BUSCA B: RENOVAÇÕES (tab_proposta_itens) ---
      let queryRenov = supabase
        .from('tab_proposta_itens')
        .select(`
          id, 
          data_renovacao, 
          grid_produtos:base_produtos (nome),
          horario_renovacao, 
          status_renovacao,
          tab_proposta_opcoes!inner (
            tab_propostas!inner (
              corretora_id,
              corretor_id,
              tab_clientes!inner (id, nome, razao_social, nome_fantasia, tipo_cliente)
            )
          )
        `)
        .eq('tab_proposta_opcoes.tab_propostas.corretora_id', perfil.corretora_id)
        .eq('status_renovacao', 'A RENOVAR')
        .not('data_renovacao', 'is', null);

      // --- BUSCA C: AGENDA FRIA (tab_clientes_agenda) ---
      let queryAgendaFria = supabase
        .from('tab_clientes_agenda')
        .select('*')
        .eq('corretora_id', perfil.corretora_id);

      if (perfil.tipo_usuario === 'CORRETOR') {
        queryAgendaFria = queryAgendaFria.eq('corretor_id', perfil.id);
      }

      const [resClientes, resRenovacoes, resAgendaFria] = await Promise.all([queryCli, queryRenov, queryAgendaFria]);

      if (resClientes.error) throw resClientes.error;
      if (resRenovacoes.error) throw resRenovacoes.error;
      if (resAgendaFria.error) throw resAgendaFria.error;

      const eventosFormatados: EventoAgenda[] = [];

      // 1. Formatação de Clientes (Comercial e Sinistro)
      resClientes.data?.forEach(cli => {
        const nomeTitulo = cli.tipo_cliente === 'PJ' 
          ? (cli.nome_fantasia || cli.razao_social || 'PJ') 
          : (cli.nome || 'PF');
        
        if (cli.data_retorno) {
          eventosFormatados.push({
            id: `${cli.id}_comercial`,
            title: nomeTitulo,
            start: `${cli.data_retorno}T${cli.horario_retorno || '09:00:00'}`,
            extendedProps: { clienteId: cli.id, tipo: cli.tipo_cliente, fase: cli.fase_kanban || 'Lead', origem: 'COMERCIAL' }
          });
        }
        if (cli.data_retorno_sinistro) {
          eventosFormatados.push({
            id: `${cli.id}_sinistro`,
            title: `[SINISTRO] ${nomeTitulo}`,
            start: `${cli.data_retorno_sinistro}T${cli.horario_retorno_sinistro || '09:00:00'}`,
            extendedProps: { clienteId: cli.id, tipo: cli.tipo_cliente, fase: 'Sinistro', origem: 'SINISTRO' }
          });
        }
      });

      // 2. Formatação de Renovações
      resRenovacoes.data?.forEach(renov => {
        const propRelacionamento = renov.tab_proposta_opcoes as any;
        const infoOpcao = Array.isArray(propRelacionamento) ? propRelacionamento[0] : propRelacionamento;
        const infoProposta = Array.isArray(infoOpcao?.tab_propostas) ? infoOpcao?.tab_propostas[0] : infoOpcao?.tab_propostas;
        const infoCli = Array.isArray(infoProposta?.tab_clientes) ? infoProposta?.tab_clientes[0] : infoProposta?.tab_clientes;
        const corretorIdItem = infoProposta?.corretor_id;

        if (perfil.tipo_usuario === 'CORRETOR' && corretorIdItem !== perfil.id) return;

        const nomeTitulo = infoCli?.tipo_cliente === 'PJ' 
          ? (infoCli?.nome_fantasia || infoCli?.razao_social || 'PJ') 
          : (infoCli?.nome || 'PF');
        const produto = (renov.grid_produtos as any)?.nome || 'Seguro';

        eventosFormatados.push({
          id: `${renov.id}_renov`,
          title: `[RENOV] ${nomeTitulo} - ${produto}`,
          start: `${renov.data_renovacao}T${renov.horario_renovacao || '09:00:00'}`,
          extendedProps: { clienteId: infoCli?.id, tipo: infoCli?.tipo_cliente, fase: 'Renovação', origem: 'RENOVACAO', itemId: renov.id }
        });
      });

      // 3. Formatação da Agenda Fria
      resAgendaFria.data?.forEach(frio => {
        eventosFormatados.push({
          id: `${frio.id}_frio`,
          title: frio.nome_cliente,
          start: `${frio.data_retorno}T${frio.horario_retorno || '09:00:00'}`,
          extendedProps: { 
            clienteId: frio.id, 
            tipo: 'FRIO', 
            fase: 'Contato Inicial', 
            origem: 'AGENDA_FRIA',
            contatoFrio: { telefone: frio.tel_cliente, email: frio.email_cliente, breve_descricao: frio.breve_descricao }
          }
        });
      });

      setEventos(eventosFormatados);
    } catch (err) {
      console.error("Erro na agenda:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const verificarConexaoGoogle = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil, error } = await supabase
        .from("usuarios_perfis")
        .select("google_connected, tipo_usuario")
        .eq("id", user.id)
        .single();

      if (error) return;

      setGoogleConectado(!!perfil.google_connected);
      setTipoUsuario(perfil.tipo_usuario);
    } catch (err) {
      console.error("Erro crítico na verificação:", err);
    }
  }, []);

  const sincronizarClientesExistentes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfis")
        .select("id, tipo_usuario, corretora_id")
        .eq("id", user.id)
        .single();

      if (perfilError || !perfil) return;

      let query = supabase
        .from('tab_clientes')
        .select('*')
        .eq('corretora_id', perfil.corretora_id)
        .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', perfil.id);
      }

      const { data: clientes, error: queryError } = await query;
      if (queryError || !clientes || clientes.length === 0) return;

      toast.info(`Iniciando sincronização de ${clientes.length} agendamentos...`);

      for (const cliente of clientes) {
        await supabase.functions.invoke('sync-to-google-calendar', {
          body: { record: cliente }
        });
      }
      toast.success("Google Agenda populada com sucesso!");
    } catch (err) {
      console.error("Erro na sincronização inicial:", err);
    }
  }, []);

  const processarRetornoGoogle = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    
    if (!code || processingCode.current) return;

    try {
      processingCode.current = true; 
      setLoadingGoogle(true);
      
      const { error } = await supabase.functions.invoke('google-token-exchange', {
        body: { code, redirect_uri: `${window.location.origin}/agenda` }
      });

      if (error) throw error;

      window.history.replaceState({}, document.title, window.location.pathname);
      setGoogleConectado(true);
      
      await verificarConexaoGoogle();
      await fetchCompromissos();
      await sincronizarClientesExistentes(); 
      
      toast.success("Google Agenda conectado!");
    } catch (err: any) {
      console.error("Erro no retorno Google:", err);
      toast.error("Falha na conexão");
    } finally {
      setLoadingGoogle(false);
    }
  }, [fetchCompromissos, verificarConexaoGoogle, sincronizarClientesExistentes]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        await processarRetornoGoogle();
      } else {
        if (!isMounted) return;
        await Promise.all([
          fetchCompromissos(),
          verificarConexaoGoogle()
        ]);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchCompromissos, verificarConexaoGoogle, processarRetornoGoogle]);

  // --- NOVA FUNÇÃO: SALVAR AGENDA FRIA AUTÔNOMA ---
  async function handleSalvarAgendaFria(e: React.FormEvent) {
    e.preventDefault();
    if (!novoAgendamento.nome_cliente.trim()) {
      toast.error("Digite o nome do cliente");
      return;
    }

    try {
      setLoadingSalvarAgenda(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil) throw new Error("Perfil não encontrado");

      const { error } = await supabase
        .from('tab_clientes_agenda')
        .insert({
          corretora_id: perfil.corretora_id,
          corretor_id: user.id,
          nome_cliente: novoAgendamento.nome_cliente,
          tel_cliente: novoAgendamento.tel_cliente,
          email_cliente: novoAgendamento.email_cliente,
          breve_descricao: novoAgendamento.breve_descricao || null,
          data_retorno: novoAgendamento.data_retorno,
          horario_retorno: novoAgendamento.horario_retorno
        });

      if (error) throw error;

      toast.success("Contato adicionado na agenda!");
      setModalAgendaFriaAberto(false);
      setNovoAgendamento({
        nome_cliente: '',
        tel_cliente: '',
        email_cliente: '',
        breve_descricao: '',
        data_retorno: new Date().toISOString().split('T')[0],
        horario_retorno: '09:00'
      });
      fetchCompromissos();
    } catch (err: any) {
      console.error("Erro ao cadastrar agenda fria:", err);
      toast.error("Erro ao salvar o contato");
    } finally {
      setLoadingSalvarAgenda(false);
    }
  }

  async function handleGoogleAuth() {
    if (googleConectado) {
      if (!confirm("Deseja realmente desvincular sua conta Google?")) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("usuarios_perfis")
            .update({ 
              google_connected: false,
              google_access_token: null, 
              google_refresh_token: null, 
              google_calendar_id: null 
            })
            .eq("id", user.id);

          setGoogleConectado(false);
          toast.success("Conta desvinculada!");
        }
      } catch (error) {
        toast.error("Erro ao desvincular");
      }
      return;
    }

    const GOOGLE_CLIENT_ID = "453100726787-a198m31oepdghl4c7b3o4pkle7hvqnkn.apps.googleusercontent.com";
    const REDIRECT_URI = `${window.location.origin}/agenda`;
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly openid email')}&access_type=offline&prompt=select_account consent`;
    window.location.href = googleOAuthUrl;
  }

  async function handleEventChange(info: any) {
    const { extendedProps } = info.event;
    const clienteId = extendedProps.clienteId;
    const itemId = extendedProps.itemId;
    const origem = extendedProps.origem;
    
    const novaData = info.event.start.toLocaleDateString('en-CA'); 
    const novoHorario = info.event.start.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });

    try {
      if (origem === 'AGENDA_FRIA') {
        const { error: dbError } = await supabase
          .from('tab_clientes_agenda')
          .update({ data_retorno: novaData, horario_retorno: novoHorario })
          .eq('id', clienteId);

        if (dbError) throw dbError;
        toast.success(`Contato frio reagendado para ${novaData}`);

      } else if (origem === 'RENOVACAO') {
        if (!itemId) throw new Error("ID do item não encontrado");

        const { error: dbError } = await supabase
          .from('tab_proposta_itens')
          .update({ data_renovacao: novaData, horario_renovacao: novoHorario })
          .eq('id', itemId);

        if (dbError) throw dbError;
        toast.success(`Renovação reagendada para ${novaData}`);

      } else {
        const isSinistro = origem === 'SINISTRO';
        const updateData = isSinistro 
          ? { data_retorno_sinistro: novaData, horario_retorno_sinistro: novoHorario }
          : { data_retorno: novaData, horario_retorno: novoHorario };

        const { error: dbError } = await supabase
          .from('tab_clientes')
          .update(updateData)
          .eq('id', clienteId);

        if (dbError) throw dbError;
        toast.success(`${isSinistro ? 'Sinistro' : 'Retorno'} atualizado!`);
      }
    } catch (err: any) {
      toast.error("Falha ao salvar alteração");
      info.revert();
    }
  }

  const handleEventClick = useCallback(async (info: any) => {
    const { origem, clienteId, itemId, contatoFrio } = info.event.extendedProps;

    if (origem === 'AGENDA_FRIA') {
      setContatoFrioDetalhe({ nome: info.event.title, ...contatoFrio });
    } else if (origem === 'RENOVACAO') {
      const { data } = await supabase
        .from('tab_proposta_itens')
        .select(`*, base_produtos(nome), tab_proposta_opcoes(tab_propostas(tab_clientes(*)))`)
        .eq('id', itemId)
        .single();

      if (data) {
        setItemRenovacaoSelecionado(data);
        setModalRenovAberto(true);
      }
    } else {
      const { data } = await supabase.from('tab_clientes').select('*').eq('id', clienteId).single();
      if (data) {
        setClienteSelecionado(data);
        setModalAberto(true);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl transition-all duration-500 ${
            googleConectado ? 'bg-blue-50 text-blue-600 shadow-inner' : 'bg-zinc-100 text-zinc-400'
          }`}>
            <CalendarCheck size={32} />
          </div>
          
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              Agenda do Corretor
              {googleConectado && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
            </h2>
            <p className="text-sm text-zinc-500 font-medium">
              {googleConectado ? "Sincronização com Google ativa" : "Gerencie seus agendamentos"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BOTÃO AUTÔNOMO: AGENDA FRIA */}
          <button
            onClick={() => setModalAgendaFriaAberto(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
          >
            <UserPlus size={18} />
            <span>Novo Contato (Frio)</span>
          </button>

          {/* CONEXÃO GOOGLE (Visível para Admin/Corretora) */}
          {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA') && (
            <button 
              onClick={handleGoogleAuth} 
              disabled={loadingGoogle}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                googleConectado 
                  ? 'bg-white dark:bg-zinc-800 text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-50' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow'
              }`}
            >
              {loadingGoogle ? (
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
              ) : googleConectado ? (
                <>
                  <Link2Off size={18} />
                  Desvincular Google
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.62z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.95v2.33A8.99 8.99 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.95a8.99 8.99 0 0 0 0 8.08l3.01-2.33z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.96 8.96 0 0 0 9 0A8.99 8.99 0 0 0 .95 4.96L3.96 7.29c.7-2.12 2.7-3.71 5.04-3.71z" fill="#EA4335"/>
                  </svg>
                  <span>Google Master</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* CALENDÁRIO */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
          locale={ptBrLocale}
          events={eventos}
          height="75vh"
          editable={true}
          eventDrop={handleEventChange}
          eventClick={handleEventClick}
          eventContent={(info) => {
            const { origem, fase } = info.event.extendedProps;
            
            let colorClasses = "bg-blue-50 border-blue-500 text-blue-700"; 
            if (origem === 'SINISTRO') colorClasses = "bg-red-50 border-red-500 text-red-700";
            if (origem === 'RENOVACAO') colorClasses = "bg-amber-50 border-amber-500 text-amber-700";
            // Nova cor para os agendamentos "Frios" isolados
            if (origem === 'AGENDA_FRIA') colorClasses = "bg-indigo-50 border-indigo-500 text-indigo-700";

            return (
              <div className={`flex flex-col p-2 rounded-xl border-l-4 shadow-sm hover:scale-[1.02] transition-transform ${colorClasses}`}>
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{fase}</span>
                <span className="text-[11px] font-bold truncate">{info.event.title}</span>
              </div>
            );
          }}
        />
      </div>

      {/* MODAL ISOLADO: AGENDA FRIA */}
      {modalAgendaFriaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={20} />
                Agendar Contato
              </h3>
              <button 
                onClick={() => setModalAgendaFriaAberto(false)}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarAgendaFria} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Souza"
                  value={novoAgendamento.nome_cliente}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, nome_cliente: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={novoAgendamento.tel_cliente}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, tel_cliente: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoAgendamento.email_cliente}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, email_cliente: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              {/* 🔥 NOVO CAMPO: BREVE DESCRIÇÃO */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Breve Descrição / Observações
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Cliente busca seguro auto para SUV 2024..."
                  value={novoAgendamento.breve_descricao}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, breve_descricao: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Data do Retorno
                  </label>
                  <input
                    type="date"
                    required
                    value={novoAgendamento.data_retorno}
                    onChange={(e) => setNovoAgendamento({ ...novoAgendamento, data_retorno: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Horário
                  </label>
                  <input
                    type="time"
                    required
                    value={novoAgendamento.horario_retorno}
                    onChange={(e) => setNovoAgendamento({ ...novoAgendamento, horario_retorno: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalAgendaFriaAberto(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingSalvarAgenda}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
                >
                  {loadingSalvarAgenda && <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />}
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP SIMPLES PARA LER OS DADOS DO CONTATO FRIO QUANDO CLICADO NO CALENDÁRIO */}
      {contatoFrioDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Info className="text-indigo-600" size={20} />
                Contato Inicial
              </h3>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <p><strong className="text-zinc-900 dark:text-white">Nome:</strong> {contatoFrioDetalhe.nome}</p>
              <p><strong className="text-zinc-900 dark:text-white">Telefone:</strong> {contatoFrioDetalhe.telefone || 'Não informado'}</p>
              <p><strong className="text-zinc-900 dark:text-white">E-mail:</strong> {contatoFrioDetalhe.email || 'Não informado'}</p>
              {/* 🔥 EXIBIÇÃO DA BREVE DESCRIÇÃO */}
              <div className="mt-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <strong className="text-zinc-900 dark:text-white block mb-1">Descrição / Observações:</strong>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl whitespace-pre-wrap">
                  {contatoFrioDetalhe.breve_descricao || 'Nenhuma observação informada.'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setContatoFrioDetalhe(null)}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS JÁ EXISTENTES */}
      <ModalContato 
        isOpen={modalAberto} 
        onClose={() => setModalAberto(false)} 
        cliente={clienteSelecionado} 
        onSuccess={fetchCompromissos} 
      />

      <ModalGerenciamentoRenovacao 
        isOpen={modalRenovAberto}
        onClose={() => {
          setModalRenovAberto(false);
          setTimeout(() => setItemRenovacaoSelecionado(null), 300);
        }}
        itemId={itemRenovacaoSelecionado?.id}
        onSuccess={() => {
          setModalRenovAberto(false);
          setItemRenovacaoSelecionado(null);
          fetchCompromissos();
          toast.success("Agenda atualizada!");
        }}
      />
    </div>
  );
}