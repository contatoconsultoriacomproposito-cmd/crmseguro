import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { supabase } from '../../lib/supabaseClient';

// IMPORTAÇÃO DO SEU NOVO MODAL
import ModalContato from './modalcontatos';

interface EventoAgenda {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    clienteId: string;
    tipo: 'PF' | 'PJ';
    fase: string;
  };
}

export default function AgendaCorretor() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA CONTROLE DO MODAL
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

  useEffect(() => {
    fetchCompromissos();
  }, []);

  // FUNÇÃO QUE BUSCA OS DADOS COMPLETOS E ABRE O MODAL
  async function abrirDetalhesCliente(id: string) {
    try {
      const { data, error } = await supabase
        .from('tab_clientes')
        .select('*') 
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setClienteSelecionado(data);
        setModalAberto(true);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do cliente:", error);
    }
  }

  async function fetchCompromissos() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("tipo_usuario, corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil) return;

      let query = supabase
        .from('tab_clientes')
        .select('id, nome, razao_social, tipo_cliente, data_retorno, horario_retorno, fase_kanban')
        .not('data_retorno', 'is', null)
        .eq('corretora_id', perfil.corretora_id);

      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', user.id);
      }

      const { data } = await query;

      if (data) {
        const formatados: EventoAgenda[] = data.map(cli => ({
          id: cli.id,
          title: cli.tipo_cliente === 'PJ' ? (cli.razao_social || 'Empresa sem nome') : (cli.nome || 'Cliente sem nome'),
          start: `${cli.data_retorno}T${cli.horario_retorno || '09:00:00'}`,
          extendedProps: {
            clienteId: cli.id,
            tipo: cli.tipo_cliente,
            fase: cli.fase_kanban || 'Lead'
          }
        }));
        setEventos(formatados);
      }
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEventChange(info: any) {
    const { id } = info.event;
    const novoStart = info.event.start;

    const data_retorno = novoStart.toLocaleDateString('en-CA'); 
    const horario_retorno = novoStart.toLocaleTimeString('pt-BR', { hour12: false });

    try {
      const { error } = await supabase
        .from('tab_clientes')
        .update({ 
          data_retorno, 
          horario_retorno 
        })
        .eq('id', id);

      if (error) throw error;
      console.log("Agendamento atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar nova data:", error);
      info.revert(); 
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden mt-4">
      <style>{`
        .fc { --fc-border-color: transparent; font-family: inherit; }
        .fc-theme-standard td, .fc-theme-standard th { border: 2px solid rgba(226, 232, 240, 0.4); }
        .dark .fc-theme-standard td, .dark .fc-theme-standard th { border: 2px solid rgba(39, 39, 42, 0.4); }
        .fc .fc-button-primary { 
          background: transparent; border: 1px solid #e2e8f0; color: #64748b; 
          font-weight: 600; border-radius: 12px; transition: all 0.2s;
        }
        .dark .fc .fc-button-primary { border-color: #27272a; color: #a1a1aa; }
        .fc .fc-button-primary:hover { background: #f8fafc; color: #2563eb; border-color: #2563eb; }
        .fc .fc-button-active { background: #2563eb !important; border-color: #2563eb !important; color: white !important; }
        .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .dark .fc .fc-toolbar-title { color: #f4f4f5; }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        locale={ptBrLocale}
        events={eventos}
        height="75vh"
        nowIndicator={true}
        editable={true}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}

        eventContent={(eventInfo) => {
          const fase = eventInfo.event.extendedProps.fase?.toLowerCase();
          const isLead = fase === 'lead' || fase === 'novo';
          
          return (
            <div className={`
              flex flex-col p-2 rounded-xl border-l-4 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02]
              ${isLead 
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20' 
                : 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20'}
            `}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLead ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                  {eventInfo.event.extendedProps.fase}
                </span>
              </div>
              <span className="text-[11px] font-bold leading-none truncate">
                {eventInfo.event.title}
              </span>
              <span className="text-[9px] mt-1 font-medium opacity-60">
                {eventInfo.timeText}
              </span>
            </div>
          );
        }}
        eventClassNames="!bg-transparent !border-none !p-0"
        
        // AO CLICAR NO EVENTO, ABRE O DETALHE
        eventClick={(info) => abrirDetalhesCliente(info.event.id)}
      />

      {/* COMPONENTE DO MODAL SENDO EXIBIDO */}
      <ModalContato 
        isOpen={modalAberto} 
        onClose={() => setModalAberto(false)} 
        cliente={clienteSelecionado} 
        onSuccess={fetchCompromissos}
      />
    </div>
  );
}