import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// IMPORTAÇÃO CORRIGIDA: Apenas o cliente estável
import { supabase } from '../../lib/supabaseClient';

import { CalendarCheck, Link2Off } from 'lucide-react';
import ModalContato from './modalcontatos';

interface EventoAgenda {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    clienteId: string;
    tipo: 'PF' | 'PJ';
    fase: string;
    origem: 'COMERCIAL' | 'SINISTRO';
    sinistroId?: string;
  };
}

export default function AgendaCorretor() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

  const [googleConectado, setGoogleConectado] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

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

      // BUSCA ÚNICA NA TAB_CLIENTES (Pega comercial e sinistro de uma vez)
      const { data: clientes } = await supabase
        .from('tab_clientes')
        .select('id, nome, razao_social, tipo_cliente, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, fase_kanban')
        .or(`data_retorno.not.is.null,data_retorno_sinistro.not.is.null`) // Filtra quem tem qualquer retorno
        .eq('corretora_id', perfil.corretora_id)
        .match(perfil.tipo_usuario === 'CORRETOR' ? { corretor_id: perfil.id } : {});

      const eventosFormatados: EventoAgenda[] = [];

      clientes?.forEach(cli => {
        const nomeTitulo = cli.tipo_cliente === 'PJ' ? (cli.razao_social || 'Empresa') : (cli.nome || 'Cliente');

        // 1. Adiciona Evento Comercial (se existir)
        if (cli.data_retorno) {
          eventosFormatados.push({
            id: `${cli.id}_comercial`, // ID único para a agenda
            title: nomeTitulo,
            start: `${cli.data_retorno}T${cli.horario_retorno || '09:00:00'}`,
            extendedProps: { 
              clienteId: cli.id, 
              tipo: cli.tipo_cliente, 
              fase: cli.fase_kanban || 'Lead', 
              origem: 'COMERCIAL' 
            }
          });
        }

        // 2. Adiciona Evento de Sinistro (se existir)
        if (cli.data_retorno_sinistro) {
          eventosFormatados.push({
            id: `${cli.id}_sinistro`, // ID único para a agenda
            title: `[SINISTRO] ${nomeTitulo}`,
            start: `${cli.data_retorno_sinistro}T${cli.horario_retorno_sinistro || '09:00:00'}`,
            extendedProps: { 
              clienteId: cli.id, 
              tipo: cli.tipo_cliente, 
              fase: 'Acompanhamento', 
              origem: 'SINISTRO' 
            }
          });
        }
      });

      setEventos(eventosFormatados);
    } catch (err) {
      console.error("Erro Agenda:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const verificarConexaoGoogle = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("usuarios_perfis").select("google_refresh_token").eq("id", user.id).maybeSingle();
    setGoogleConectado(!!data?.google_refresh_token);
  }, []);

  const processarRetornoGoogle = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return;

    try {
      setLoadingGoogle(true);
      // Invocamos a função SEM atribuir o 'data' não utilizado à uma variável
      const { error } = await supabase.functions.invoke('google-token-exchange', {
        body: { code, redirect_uri: `${window.location.origin}/agenda` }
      });

      if (error) throw error;

      window.history.replaceState({}, document.title, window.location.pathname);
      setGoogleConectado(true);
      await fetchCompromissos();
    } catch (err) {
      console.error("Erro na troca de token:", err);
    } finally {
      setLoadingGoogle(false);
    }
  }, [fetchCompromissos]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isMounted) return;
      await processarRetornoGoogle();
      await fetchCompromissos();
      await verificarConexaoGoogle();
    };
    init();
    return () => { isMounted = false; };
  }, [fetchCompromissos, verificarConexaoGoogle, processarRetornoGoogle]);

  async function handleGoogleAuth() {
    if (googleConectado) {
      if (!confirm("Desvincular Google Agenda?")) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("usuarios_perfis").update({ 
          google_access_token: null, google_refresh_token: null, google_calendar_id: null 
        }).eq("id", user.id);
        setGoogleConectado(false);
      }
      return;
    }

    const GOOGLE_CLIENT_ID = "453100726787-a198m31oepdghl4c7b3o4pkle7hvqnkn.apps.googleusercontent.com";
    const REDIRECT_URI = `${window.location.origin}/agenda`;
    const googleOAuthUrl = 
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly')}` +
      `&access_type=offline` +
      `&prompt=consent`;

    window.location.href = googleOAuthUrl;
  }

  async function handleEventChange(info: any) {
    const { extendedProps } = info.event;
    const clienteId = extendedProps.clienteId;
    const novaData = info.event.start.toLocaleDateString('en-CA'); 
    const novoHorario = info.event.start.toLocaleTimeString('pt-BR', { hour12: false });

    try {
      if (extendedProps.origem === 'COMERCIAL') {
        await supabase.from('tab_clientes')
          .update({ data_retorno: novaData, horario_retorno: novoHorario })
          .eq('id', clienteId);
      } else {
        // Atualiza o campo de SINISTRO no cliente (isso vai disparar o Google via Edge Function)
        await supabase.from('tab_clientes')
          .update({ data_retorno_sinistro: novaData, horario_retorno_sinistro: novoHorario })
          .eq('id', clienteId);
      }
    } catch (err) {
      info.revert();
    }
  }

  async function abrirDetalhesCliente(id: string) {
    const { data } = await supabase.from('tab_clientes').select('*').eq('id', id).single();
    if (data) {
      setClienteSelecionado(data);
      setModalAberto(true);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl ${googleConectado ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
            <CalendarCheck size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Google Agenda</h2>
            <p className="text-sm text-zinc-500 font-medium">
              {googleConectado ? "Sincronização ativa." : "Conecte sua conta para sincronizar."}
            </p>
          </div>
        </div>
        <button 
          onClick={handleGoogleAuth} 
          disabled={loadingGoogle}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm transition-all ${
            googleConectado ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
          }`}
        >
          {loadingGoogle ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" /> : (
            googleConectado ? <><Link2Off size={18} /> DESVINCULAR</> : "CONECTAR GOOGLE"
          )}
        </button>
      </div>

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
          eventContent={(info) => {
            const isSinistro = info.event.extendedProps.origem === 'SINISTRO';
            return (
              <div className={`flex flex-col p-2 rounded-xl border-l-4 shadow-sm hover:scale-[1.02] transition-transform ${
                isSinistro ? 'bg-red-50 border-red-500 text-red-700' : 'bg-blue-50 border-blue-500 text-blue-700'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{info.event.extendedProps.fase}</span>
                <span className="text-[11px] font-bold truncate">{info.event.title}</span>
              </div>
            );
          }}
          eventClick={(info) => abrirDetalhesCliente(info.event.extendedProps.clienteId)}
        />
        <ModalContato isOpen={modalAberto} onClose={() => setModalAberto(false)} cliente={clienteSelecionado} onSuccess={fetchCompromissos} />
      </div>
    </div>
  );
}