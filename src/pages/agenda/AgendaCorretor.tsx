import { useEffect, useState, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { toast } from 'sonner';

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
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null); // Estado para o tipo de usuário
  const processingCode = useRef(false);

const fetchCompromissos = useCallback(async () => {
  try {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1️⃣ BUSCA O PERFIL DO USUÁRIO LOGADO
    const { data: perfil, error: errorPerfil } = await supabase
      .from("usuarios_perfis")
      .select("id, tipo_usuario, corretora_id")
      .eq("id", user.id)
      .maybeSingle();

    if (errorPerfil || !perfil) {
      console.error("Perfil não encontrado");
      return;
    }

    setTipoUsuario(perfil.tipo_usuario);

    // 2️⃣ MONTAGEM DA QUERY DINÂMICA
    // Selecionamos os campos necessários de tab_clientes
    let query = supabase
      .from('tab_clientes')
      .select('id, nome, razao_social, tipo_cliente, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, fase_kanban, corretora_id, corretor_id');

    // Filtro Base: Garante que o cliente pertença à corretora do usuário
    // IMPORTANTE: Para o Admin, perfil.corretora_id deve ser o ID da própria conta master.
    query = query.eq('corretora_id', perfil.corretora_id);

    // Filtro de Datas: Somente clientes que possuam algum agendamento (Comercial ou Sinistro)
    query = query.or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

    // 3️⃣ LÓGICA DE HIERARQUIA (O ponto chave)
    // Se for um corretor comum, restringimos a busca apenas aos clientes vinculados a ele.
    // Se for ADMIN ou CORRETORA, não aplicamos este filtro, permitindo ver todos da corretora_id.
    if (perfil.tipo_usuario === 'CORRETOR') {
      query = query.eq('corretor_id', perfil.id);
    }

    const { data: clientes, error: errorClientes } = await query;

    if (errorClientes) throw errorClientes;

    // 4️⃣ FORMATAÇÃO DOS EVENTOS PARA O CALENDÁRIO
    const eventosFormatados: EventoAgenda[] = [];

    clientes?.forEach(cli => {
      const nomeTitulo = cli.tipo_cliente === 'PJ' 
        ? (cli.razao_social || 'Empresa Sem Razão') 
        : (cli.nome || 'Cliente Sem Nome');

      // Agendamento Comercial
      if (cli.data_retorno) {
        eventosFormatados.push({
          id: `${cli.id}_comercial`,
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

      // Agendamento de Sinistro
      if (cli.data_retorno_sinistro) {
        eventosFormatados.push({
          id: `${cli.id}_sinistro`,
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
    console.error("Erro ao carregar compromissos da agenda:", err);
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

    // 1️⃣ BUSCA O PERFIL DO USUÁRIO PARA DEFINIR O ESCOPO
    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios_perfis")
      .select("id, tipo_usuario, corretora_id")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      console.error("Erro ao carregar perfil para sincronização");
      return;
    }

    // 2️⃣ MONTAGEM DA QUERY DE CARGA INICIAL
    // Filtramos obrigatoriamente pela corretora_id do perfil logado
    let query = supabase
      .from('tab_clientes')
      .select('*')
      .eq('corretora_id', perfil.corretora_id);

    // Filtramos apenas clientes que possuam alguma data de retorno preenchida
    query = query.or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

    // 3️⃣ LÓGICA DE HIERARQUIA
    // Se for CORRETOR, sincroniza apenas os dele.
    // Se for ADMIN/CORRETORA, sincroniza TODOS os clientes da empresa.
    if (perfil.tipo_usuario === 'CORRETOR') {
      query = query.eq('corretor_id', perfil.id);
    }

    const { data: clientes, error: queryError } = await query;

    if (queryError) throw queryError;

    if (!clientes || clientes.length === 0) {
      toast.info("Nenhum agendamento encontrado para sincronizar.");
      return;
    }

    // 4️⃣ EXECUÇÃO DA SINCRONIZAÇÃO EM MASSA
    toast.info(`Iniciando sincronização de ${clientes.length} agendamentos...`);

    // Percorre todos os clientes encontrados
    for (const cliente of clientes) {
      // Invocamos a Edge Function passando o objeto completo do cliente (record)
      // A Edge Function usará o cliente.corretora_id para buscar o token master
      const { error: invokeError } = await supabase.functions.invoke('sync-to-google-calendar', {
        body: { record: cliente }
      });

      if (invokeError) {
        console.error(`Falha ao sincronizar cliente ${cliente.id}:`, invokeError);
      }
    }

    toast.success("Google Agenda populada com sucesso!");
  } catch (err) {
    console.error("Erro crítico na sincronização inicial:", err);
    toast.error("Erro ao sincronizar clientes com o Google.");
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

  async function handleGoogleAuth() {
    if (googleConectado) {
      if (!confirm("Deseja realmente desvincular sua conta Google? Novas interações não serão mais sincronizadas.")) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: errorPerfil } = await supabase
            .from("usuarios_perfis")
            .update({ 
              google_connected: false,
              google_access_token: null, 
              google_refresh_token: null, 
              google_calendar_id: null 
            })
            .eq("id", user.id);

          if (errorPerfil) throw errorPerfil;

          await supabase
            .from('tab_clientes')
            .update({
              google_event_id_comercial: null,
              google_event_id_sinistro: null
            })
            .eq('corretor_id', user.id);

          setGoogleConectado(false);
          toast.success("Conta desvinculada!");
        }
      } catch (error) {
        console.error("Erro ao desvincular:", error);
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
    
    // Formatação de data robusta
    const novaData = info.event.start.toLocaleDateString('en-CA'); 
    
    // Formatação de hora corrigida (sem o erro de Range do 'second')
    const novoHorario = info.event.start.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', // Alterado de '00' para '2-digit'
      hour12: false 
    });

    try {
      const isSinistro = extendedProps.origem === 'SINISTRO';
      
      const updateData = isSinistro 
        ? { data_retorno_sinistro: novaData, horario_retorno_sinistro: novoHorario }
        : { data_retorno: novaData, horario_retorno: novoHorario };

      const { error: dbError } = await supabase
        .from('tab_clientes')
        .update(updateData)
        .eq('id', clienteId);

      if (dbError) throw dbError;
      
      toast.success(`${isSinistro ? 'Sinistro' : 'Retorno'} atualizado!`);
    } catch (err: any) {
      console.error("Erro ao salvar alteração:", err);
      toast.error("Falha ao salvar alteração");
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
      {/* CORREÇÃO AQUI: Bloco do Google renderizado apenas para ADM/CORRETORA */}
      {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA') && (
        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl transition-all duration-500 ${
              googleConectado ? 'bg-blue-50 text-blue-600 shadow-inner' : 'bg-zinc-100 text-zinc-400'
            }`}>
              <CalendarCheck size={32} />
            </div>
            
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                Google Agenda (Empresa)
                {googleConectado && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
              </h2>
              <p className="text-sm text-zinc-500 font-medium">
                {googleConectado ? "Sincronização master ativa" : "Conecte a conta da corretora."}
              </p>
            </div>
          </div>

          <button 
            onClick={handleGoogleAuth} 
            disabled={loadingGoogle}
            className={`group relative flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 ${
              googleConectado 
                ? 'bg-white dark:bg-zinc-800 text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-50' 
                : 'bg-white dark:bg-white text-zinc-700 border border-zinc-200 shadow-md hover:shadow-lg'
            }`}
          >
            {loadingGoogle ? (
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
            ) : (
              googleConectado ? (
                <>
                  <Link2Off size={18} />
                  DESVINCULAR CONTA MASTER
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.62z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.95v2.33A8.99 8.99 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.95a8.99 8.99 0 0 0 0 8.08l3.01-2.33z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.96 8.96 0 0 0 9 0A8.99 8.99 0 0 0 .95 4.96L3.96 7.29c.7-2.12 2.7-3.71 5.04-3.71z" fill="#EA4335"/>
                  </svg>
                  <span className="tracking-tight">CONECTAR MASTER</span>
                </>
              )
            )}
          </button>
        </div>
      )}

      {/* Calendário: Sempre visível para todos */}
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