import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { supabase } from '../../lib/supabaseClient';

// IMPORTAÇÃO DO SEU MODAL (Que será adaptado para tabs)
import ModalContato from './modalcontatos';

interface EventoAgenda {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    clienteId: string;
    tipo: 'PF' | 'PJ';
    fase: string;
    origem: 'COMERCIAL' | 'SINISTRO'; // Diferenciador
    sinistroId?: string;
  };
}

export default function AgendaCorretor() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

  useEffect(() => {
    fetchCompromissos();
  }, []);

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
        .select("tipo_usuario, id, corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil) return;

      // --- BUSCA 1: COMPROMISSOS COMERCIAIS (TAB_CLIENTES) ---
      let queryComercial = supabase
        .from('tab_clientes')
        .select('id, nome, razao_social, tipo_cliente, data_retorno, horario_retorno, fase_kanban')
        .not('data_retorno', 'is', null)
        .eq('corretora_id', perfil.corretora_id);

      if (perfil.tipo_usuario === 'CORRETOR') {
        queryComercial = queryComercial.eq('corretor_id', perfil.id);
      }

      // --- BUSCA 2: COMPROMISSOS DE SINISTROS (TAB_SINISTROS_OCORRENCIAS) ---
      // Buscamos as ocorrências que têm data_retorno, trazendo o nome do cliente via tab_sinistros
      let querySinistros = supabase
        .from('tab_sinistros_ocorrencias')
        .select(`
          id,
          data_retorno,
          etapa,
          sinistro_id,
          tab_sinistros (
            cliente_id,
            corretora_id,
            corretor_id,
            tab_clientes ( nome, razao_social, tipo_cliente )
          )
        `)
        .not('data_retorno', 'is', null);

      // Aplicamos o filtro de hierarquia nos sinistros também
      if (perfil.tipo_usuario === 'CORRETOR') {
        querySinistros = querySinistros.eq('tab_sinistros.corretor_id', perfil.id);
      } else {
        querySinistros = querySinistros.eq('tab_sinistros.corretora_id', perfil.corretora_id);
      }

      const [resComercial, resSinistros] = await Promise.all([
        queryComercial,
        querySinistros
      ]);

      const eventosFormatados: EventoAgenda[] = [];

      // Formata Comerciais
      if (resComercial.data) {
        resComercial.data.forEach(cli => {
          eventosFormatados.push({
            id: cli.id,
            title: cli.tipo_cliente === 'PJ' ? (cli.razao_social || 'Empresa') : (cli.nome || 'Cliente'),
            start: `${cli.data_retorno}T${cli.horario_retorno || '09:00:00'}`,
            extendedProps: {
              clienteId: cli.id,
              tipo: cli.tipo_cliente,
              fase: cli.fase_kanban || 'Lead',
              origem: 'COMERCIAL'
            }
          });
        });
      }

      // Formata Sinistros
      if (resSinistros.data) {
        resSinistros.data.forEach((oc: any) => {
          const infoCliente = oc.tab_sinistros?.tab_clientes;
          if (infoCliente) {
            eventosFormatados.push({
              id: oc.id, // ID da ocorrência para o FullCalendar
              title: infoCliente.tipo_cliente === 'PJ' ? infoCliente.razao_social : infoCliente.nome,
              start: `${oc.data_retorno}T09:00:00`, // Sinistros geralmente não têm hora fixa na tab, setamos padrão
              extendedProps: {
                clienteId: oc.tab_sinistros.cliente_id,
                tipo: infoCliente.tipo_cliente,
                fase: oc.etapa,
                origem: 'SINISTRO',
                sinistroId: oc.sinistro_id
              }
            });
          }
        });
      }

      setEventos(eventosFormatados);
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    } finally {
      setLoading(false);
    }
  }

  // Ajustado para lidar com as duas origens no Drag & Drop
  async function handleEventChange(info: any) {
    const { id, extendedProps } = info.event;
    const novoStart = info.event.start;
    const data_retorno = novoStart.toLocaleDateString('en-CA'); 

    try {
      if (extendedProps.origem === 'COMERCIAL') {
        const horario_retorno = novoStart.toLocaleTimeString('pt-BR', { hour12: false });
        await supabase.from('tab_clientes').update({ data_retorno, horario_retorno }).eq('id', id);
      } else {
        // Atualiza a data de retorno na ocorrência do sinistro
        await supabase.from('tab_sinistros_ocorrencias').update({ data_retorno }).eq('id', id);
      }
    } catch (error) {
      console.error("Erro ao salvar nova data:", error);
      info.revert(); 
    }
  }

  if (loading) return <div className="flex items-center justify-center h-[80vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden mt-4">
      <style>{`
        .fc { --fc-border-color: transparent; font-family: inherit; }
        .fc-theme-standard td, .fc-theme-standard th { border: 2px solid rgba(226, 232, 240, 0.4); }
        .dark .fc-theme-standard td, .dark .fc-theme-standard th { border: 2px solid rgba(39, 39, 42, 0.4); }
        .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 800; }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
        locale={ptBrLocale}
        events={eventos}
        height="75vh"
        editable={true}
        eventDrop={handleEventChange}
        eventContent={(eventInfo) => {
          const { origem, fase } = eventInfo.event.extendedProps;
          const isSinistro = origem === 'SINISTRO';
          
          return (
            <div className={`
              flex flex-col p-2 rounded-xl border-l-4 shadow-sm transition-all hover:scale-[1.02]
              ${isSinistro 
                ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20' 
                : (fase.toLowerCase() === 'lead' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20' : 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20')}
            `}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isSinistro ? 'bg-red-500' : 'bg-blue-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                  {isSinistro ? `SINISTRO: ${fase}` : fase}
                </span>
              </div>
              <span className="text-[11px] font-bold leading-none truncate">{eventInfo.event.title}</span>
            </div>
          );
        }}
        eventClick={(info) => abrirDetalhesCliente(info.event.extendedProps.clienteId)}
      />

      <ModalContato 
        isOpen={modalAberto} 
        onClose={() => setModalAberto(false)} 
        cliente={clienteSelecionado} 
        onSuccess={fetchCompromissos}
      />
    </div>
  );
}