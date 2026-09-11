declare global {
interface Window {
gapi: any;
google: any;
}
}

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ModalGerenciamentoRenovacao } from '../../contexts/ModalGerenciamentoRenovacao';
import { ModalGerenciamentoSinistro } from '../../contexts/ModalGerenciamentoSinistro';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import {
CalendarCheck,
Link2Off,
Search,
Filter,
User,
UserPlus,
X,
Check,
ChevronDown
} from 'lucide-react';
import { ModalAcoesComerciais } from '../clientes/ModalAcoesComerciais';
import { ModalCadastroCliente } from '../clientes/ModalCadastroCliente';
import {
salvarAcaoComercialV2,
criarClienteV2
} from '../clientes/clienteServiceV2';

export interface ContatoJson {
principal?: boolean;
nome?: string;
telefone?: string;
email?: string;
[key: string]: any;
}

export interface ClienteDados {
id: string;
nome_razao_social?: string;
nome_fantasia?: string;
tipo_cliente?: string;
cpf_cnpj?: string;
contatos?: any;
data_retorno?: string;
horario_retorno?: string;
data_retorno_sinistro?: string;
horario_retorno_sinistro?: string;
fase_atendimento?: string;
temperatura?: string;
corretora_id?: string;
corretor_id?: string;
produtos_gerais?: any;
breve_descricao?: string;
produto_interesse?: string;
status_prospeccao?: string;
}

export interface ContatoFrioDetalhe {
id?: string;
nome?: string;
telefone: string;
email: string;
tipo?: string;
produto_interesse?: string;
breve_descricao?: string;
produtos_gerais?: string[];
}

export interface EventoAgenda {
id: string;
title: string;
start: string;
extendedProps: {
clienteId?: string;
corretorId?: string;
tipo?: string;
fase?: string;
status?: string;
temperatura?: string;
whats?: string;
telefoneAdicional?: string;
cpf?: string;
cnpj?: string;
email?: string;
razaoSocial?: string;
nomeFantasia?: string;
produtoInteresse?: string;
produtosGerais?: string;
breveDescricao?: string;
horario?: string;
origem: 'AGENDA_FRIA' | 'RENOVACAO' | 'COMERCIAL' | 'SINISTRO' | 'PROSPECCAO_FRIA';
tipoEvento?: 'CARTEIRA' | 'SINISTRO' | 'RENOVACAO' | 'AVULSO' | 'FRIO';
itemId?: string;
contatoFrio?: ContatoFrioDetalhe;
clienteData?: ClienteDados;
};
}

const parseContatos = (contatos: any): ContatoJson[] => {
if (!contatos) return [];
if (Array.isArray(contatos)) return contatos;

try {
const parsed = typeof contatos === 'string' ? JSON.parse(contatos) : contatos;


if (Array.isArray(parsed)) return parsed;

if (typeof parsed === 'string') {
  const parsedAgain = JSON.parse(parsed);
  return Array.isArray(parsedAgain) ? parsedAgain : [];
}

return [];


} catch {
return [];
}
};

const getContatoPrincipal = (contatos: any) => {
const lista = parseContatos(contatos);
return lista.find(contato => contato.principal) || lista[0] || {};
};

const apenasNumeros = (valor?: string) => (valor || '').replace(/\D/g, '');

export default function AgendaCorretor() {
const [eventos, setEventos] = useState<EventoAgenda[]>([]);
const [loading, setLoading] = useState(true);

const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);
const [modalAcoesAberto, setModalAcoesAberto] = useState(false);
const [clienteAcoesSelecionado, setClienteAcoesSelecionado] = useState<ClienteDados | null>(null);

const [modalFrioAberto, setModalFrioAberto] = useState(false);
const [clienteFrioSelecionado, setClienteFrioSelecionado] = useState<ClienteDados | null>(null);

const [modalRenovAberto, setModalRenovAberto] = useState(false);
const [itemRenovacaoSelecionado, setItemRenovacaoSelecionado] = useState<any>(null);

const [modalSinistroAberto, setModalSinistroAberto] = useState(false);
const [clienteSinistroSelecionado, setClienteSinistroSelecionado] = useState<string | null>(null);

const [googleConectado, setGoogleConectado] = useState(false);
const [loadingGoogle, setLoadingGoogle] = useState(false);

const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
const [usuarioLogado, setUsuarioLogado] = useState<{ id: string; nome: string } | null>(null);
const [listaCorretores, setListaCorretores] = useState<{ id: string; nome: string }[]>([]);

const [corretoresSelecionados, setCorretoresSelecionados] = useState<string[]>([]);
const [termoBusca, setTermoBusca] = useState('');
const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);

const processingCode = useRef(false);
const dropdownRef = useRef<HTMLDivElement>(null);
const calendarRef = useRef<FullCalendar>(null);

useEffect(() => {
const handleClickOutside = (event: MouseEvent) => {
if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
setMenuFiltroAberto(false);
}
};


document.addEventListener('mousedown', handleClickOutside);

return () => {
  document.removeEventListener('mousedown', handleClickOutside);
};


}, []);

const carregarPerfil = useCallback(async () => {
const {
data: { user }
} = await supabase.auth.getUser();


if (!user) return null;

const { data: perfil, error } = await supabase
  .from('usuarios_perfis')
  .select('id, tipo_usuario, corretora_id, nome, google_connected')
  .eq('id', user.id)
  .maybeSingle();

if (error || !perfil) return null;

return perfil;


}, []);

const fetchCompromissos = useCallback(async () => {
setLoading(true);


try {
  const perfil = await carregarPerfil();

  if (!perfil) return;

  const isCorretor = perfil.tipo_usuario === 'CORRETOR';

  setTipoUsuario(perfil.tipo_usuario);
  setUsuarioLogado({
    id: perfil.id,
    nome: perfil.nome || 'Você'
  });

  setGoogleConectado(!!perfil.google_connected);

  const equipePromise =
    perfil.tipo_usuario === 'CORRETORA' || perfil.tipo_usuario === 'ADMIN'
      ? supabase
          .from('usuarios_perfis')
          .select('id, nome')
          .eq('corretora_id', perfil.corretora_id)
          .eq('tipo_usuario', 'CORRETOR')
      : Promise.resolve({ data: [] as any[] });

  let queryClientes = supabase
    .from('tab_clientes')
    .select(`
      id,
      nome_razao_social,
      nome_fantasia,
      tipo_cliente,
      cpf_cnpj,
      contatos,
      data_retorno,
      horario_retorno,
      data_retorno_sinistro,
      horario_retorno_sinistro,
      fase_atendimento,
      temperatura,
      corretora_id,
      corretor_id
    `)
    .eq('corretora_id', perfil.corretora_id)
    .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

  if (isCorretor) {
    queryClientes = queryClientes.eq('corretor_id', perfil.id);
  }

  const renovacoesPromise = supabase
    .from('tab_proposta_itens')
    .select(`
      id,
      data_renovacao,
      horario_renovacao,
      base_produtos(nome),
      tab_proposta_opcoes(
        tab_propostas(
          corretora_id,
          corretor_id,
          cliente_id,
          tab_clientes!tab_propostas_cliente_id_fkey(
            id,
            nome_razao_social,
            nome_fantasia,
            tipo_cliente,
            cpf_cnpj,
            contatos,
            fase_atendimento
          )
        )
      )
    `)
    .eq('status_renovacao', 'A RENOVAR')
    .not('data_renovacao', 'is', null);

  const [
    resEquipe,
    resClientes,
    resRenovacoes
  ] = await Promise.all([
    equipePromise,
    queryClientes,
    renovacoesPromise
  ]);

  const corretores = (resEquipe.data || []).map((corretor: any) => ({
    id: corretor.id,
    nome: corretor.nome || 'Corretor'
  }));

  setListaCorretores(corretores);

  const eventosFormatados: EventoAgenda[] = [];
  const idsEventos = new Set<string>();

  const adicionarEvento = (evento: EventoAgenda) => {
    if (!idsEventos.has(evento.id)) {
      idsEventos.add(evento.id);
      eventosFormatados.push(evento);
    }
  };

  (resClientes.data || []).forEach((cliente: any) => {
    const contato = getContatoPrincipal(cliente.contatos);

    const nomeTitulo =
      cliente.tipo_cliente === 'PJ'
        ? cliente.nome_fantasia || cliente.nome_razao_social || 'PJ'
        : cliente.nome_razao_social || 'PF';

    const dadosBase = {
      clienteId: cliente.id,
      corretorId: cliente.corretor_id || undefined,
      tipo: cliente.tipo_cliente,
      cpf: cliente.tipo_cliente === 'PF' ? cliente.cpf_cnpj : '',
      cnpj: cliente.tipo_cliente === 'PJ' ? cliente.cpf_cnpj : '',
      email: contato.email || '',
      whats: contato.telefone || '',
      telefoneAdicional: '',
      razaoSocial: cliente.nome_razao_social,
      nomeFantasia: cliente.nome_fantasia,
      clienteData: cliente as ClienteDados
    };

    if (cliente.data_retorno) {
      adicionarEvento({
        id: `${cliente.id}_comercial`,
        title: nomeTitulo,
        start: `${cliente.data_retorno}T${cliente.horario_retorno || '09:00:00'}`,
        extendedProps: {
          ...dadosBase,
          fase: cliente.fase_atendimento || 'LEAD',
          temperatura: cliente.temperatura || '-',
          horario: cliente.horario_retorno || '09:00',
          origem: 'COMERCIAL',
          tipoEvento: 'CARTEIRA'
        }
      });
    }

    if (cliente.data_retorno_sinistro) {
      adicionarEvento({
        id: `${cliente.id}_sinistro`,
        title: `[SINISTRO] ${nomeTitulo}`,
        start: `${cliente.data_retorno_sinistro}T${cliente.horario_retorno_sinistro || '09:00:00'}`,
        extendedProps: {
          ...dadosBase,
          fase: 'SINISTRO',
          horario: cliente.horario_retorno_sinistro || '09:00',
          origem: 'SINISTRO',
          tipoEvento: 'SINISTRO'
        }
      });
    }
  });

  (resRenovacoes.data || []).forEach((renovacao: any) => {
    const opcao = Array.isArray(renovacao.tab_proposta_opcoes)
      ? renovacao.tab_proposta_opcoes[0]
      : renovacao.tab_proposta_opcoes;

    const proposta = Array.isArray(opcao?.tab_propostas)
      ? opcao.tab_propostas[0]
      : opcao?.tab_propostas;

    if (!proposta) return;
    if (proposta.corretora_id !== perfil.corretora_id) return;
    if (isCorretor && proposta.corretor_id !== perfil.id) return;

    const cliente = Array.isArray(proposta.tab_clientes)
      ? proposta.tab_clientes[0]
      : proposta.tab_clientes;

    if (!cliente) return;

    const contato = getContatoPrincipal(cliente.contatos);

    const nomeTitulo =
      cliente.tipo_cliente === 'PJ'
        ? cliente.nome_fantasia || cliente.nome_razao_social || 'PJ'
        : cliente.nome_razao_social || 'PF';

    const produtoBase = Array.isArray(renovacao.base_produtos)
      ? renovacao.base_produtos[0]
      : renovacao.base_produtos;

    const produto = produtoBase?.nome || 'Seguro';

    adicionarEvento({
      id: `${renovacao.id}_renov`,
      title: `${nomeTitulo} - ${produto}`,
      start: `${renovacao.data_renovacao}T${renovacao.horario_renovacao || '09:00:00'}`,
      extendedProps: {
        clienteId: cliente.id,
        corretorId: proposta.corretor_id || undefined,
        tipo: cliente.tipo_cliente,
        cpf: cliente.tipo_cliente === 'PF' ? cliente.cpf_cnpj : '',
        cnpj: cliente.tipo_cliente === 'PJ' ? cliente.cpf_cnpj : '',
        email: contato.email || '',
        whats: contato.telefone || '',
        razaoSocial: cliente.nome_razao_social,
        nomeFantasia: cliente.nome_fantasia,
        produtoInteresse: produto,
        fase: cliente.fase_atendimento || 'RENOVAÇÃO',
        horario: renovacao.horario_renovacao || '09:00',
        origem: 'RENOVACAO',
        tipoEvento: 'RENOVACAO',
        itemId: renovacao.id,
        clienteData: cliente as ClienteDados
      }
    });
  });

  setEventos(eventosFormatados);
} catch (error) {
  console.error('Erro ao carregar compromissos da agenda:', error);
  toast.error('Não foi possível carregar a agenda.');
} finally {
  setLoading(false);
}


}, [carregarPerfil]);

useEffect(() => {
if (tipoUsuario === 'CORRETOR' && usuarioLogado?.id) {
setCorretoresSelecionados([usuarioLogado.id]);
return;
}


if (
  (tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') &&
  usuarioLogado?.id
) {
  setCorretoresSelecionados([
    usuarioLogado.id,
    ...listaCorretores.map(corretor => corretor.id)
  ]);
}


}, [tipoUsuario, usuarioLogado?.id, listaCorretores]);

const toggleCorretor = useCallback((id?: string) => {
if (!id) return;


setCorretoresSelecionados(atual =>
  atual.includes(id)
    ? atual.filter(item => item !== id)
    : [...atual, id]
);


}, []);

const toggleTodosCorretores = useCallback(() => {
const todosIds = [
usuarioLogado?.id,
...listaCorretores.map(corretor => corretor.id)
].filter(Boolean) as string[];

setCorretoresSelecionados(atual =>
  atual.length === todosIds.length ? [] : todosIds
);


}, [usuarioLogado?.id, listaCorretores]);

const eventoPertenceAoFiltro = useCallback(
(evento: EventoAgenda) => {
const corretorId = evento.extendedProps.corretorId;


  if (tipoUsuario === 'CORRETOR') {
    return corretorId === usuarioLogado?.id;
  }

  if (tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') {
    return (
      corretoresSelecionados.includes(corretorId || '') ||
      (!corretorId &&
        corretoresSelecionados.includes(usuarioLogado?.id || ''))
    );
  }

  return true;
},
[
  tipoUsuario,
  usuarioLogado?.id,
  corretoresSelecionados
]


);

const eventoBateBusca = useCallback(
(evento: EventoAgenda, termoOriginal: string) => {
const termo = termoOriginal.toLowerCase().trim();
const termoNumerico = apenasNumeros(termo);
const props = evento.extendedProps;


  const camposTexto = [
    evento.title,
    props.email,
    props.razaoSocial,
    props.nomeFantasia,
    props.produtoInteresse,
    props.produtosGerais,
    props.breveDescricao
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (camposTexto.includes(termo)) return true;

  if (!termoNumerico) return false;

  const camposNumericos = [
    props.cpf,
    props.cnpj,
    props.whats,
    props.telefoneAdicional,
    props.contatoFrio?.telefone
  ];

  return camposNumericos.some(campo =>
    apenasNumeros(campo).includes(termoNumerico)
  );
},
[]


);

const eventosFiltrados = useMemo(() => {
const busca = termoBusca.trim();


return eventos.filter(evento => {
  if (!eventoPertenceAoFiltro(evento)) return false;
  if (!busca) return true;

  return eventoBateBusca(evento, busca);
});


}, [
eventos,
termoBusca,
eventoPertenceAoFiltro,
eventoBateBusca
]);

const resultadosBuscaGlobal = useMemo(() => {
if (termoBusca.trim().length < 2) return [];


return eventos
  .filter(evento => eventoPertenceAoFiltro(evento))
  .filter(evento => eventoBateBusca(evento, termoBusca))
  .slice(0, 30);


}, [
eventos,
termoBusca,
eventoPertenceAoFiltro,
eventoBateBusca
]);

const abrirModalAcoesComerciais = useCallback(
async (clienteId: string, clienteData?: ClienteDados) => {
if (clienteData) {
setClienteAcoesSelecionado(clienteData);
setModalAcoesAberto(true);
return;
}

  if (!clienteId) return;

  const { data, error } = await supabase
    .from('tab_clientes')
    .select('*')
    .eq('id', clienteId)
    .maybeSingle();

  if (error || !data) {
    toast.error('Não foi possível carregar o cliente.');
    return;
  }

  setClienteAcoesSelecionado(data as ClienteDados);
  setModalAcoesAberto(true);
},
[]


);

const handleSalvarAcaoComercial = useCallback(
async (dadosAcao: any) => {
await salvarAcaoComercialV2(dadosAcao);
toast.success('Interação registrada com sucesso.');
await fetchCompromissos();
},
[fetchCompromissos]
);

const handleEventClick = useCallback(
async (info: any) => {
const {
origem,
tipoEvento,
clienteId,
itemId,
clienteData
} = info.event.extendedProps;


  if (origem === 'SINISTRO' || tipoEvento === 'SINISTRO') {
    if (!clienteId) return;

    setClienteSinistroSelecionado(clienteId);
    setModalSinistroAberto(true);
    return;
  }

  if (origem === 'PROSPECCAO_FRIA' || tipoEvento === 'FRIO') {
    if (clienteData) {
      setClienteFrioSelecionado(clienteData);
      setModalFrioAberto(true);
      return;
    }

    if (!clienteId) return;

    const { data, error } = await supabase
      .from('tab_clientes')
      .select('*')
      .eq('id', clienteId)
      .maybeSingle();

    if (error || !data) {
      toast.error('Não foi possível carregar o cliente.');
      return;
    }

    setClienteFrioSelecionado(data as ClienteDados);
    setModalFrioAberto(true);
    return;
  }

  if (origem === 'AGENDA_FRIA' || tipoEvento === 'AVULSO') {
    await abrirModalAcoesComerciais(clienteId, clienteData);
    return;
  }

  if (origem === 'RENOVACAO' || tipoEvento === 'RENOVACAO') {
    if (!itemId) return;

    const { data, error } = await supabase
      .from('tab_proposta_itens')
      .select(`
        *,
        base_produtos(nome),
        tab_proposta_opcoes(
          *,
          tab_propostas(
            *,
            tab_clientes(*)
          )
        )
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (error || !data) {
      toast.error('Não foi possível carregar a renovação.');
      return;
    }

    setItemRenovacaoSelecionado(data);
    setModalRenovAberto(true);
    return;
  }

  await abrirModalAcoesComerciais(clienteId, clienteData);
},
[abrirModalAcoesComerciais]


);

const handleSelecionarResultadoBusca = useCallback(
async (evento: EventoAgenda) => {
const calendarApi = calendarRef.current?.getApi();


  if (calendarApi) {
    calendarApi.gotoDate(evento.start);
  }

  setTermoBusca('');

  await handleEventClick({
    event: {
      title: evento.title,
      startStr: evento.start,
      extendedProps: evento.extendedProps
    }
  });
},
[handleEventClick]


);

const sincronizarClientesExistentes = useCallback(async () => {
try {
const perfil = await carregarPerfil();


  if (!perfil) return;

  let query = supabase
    .from('tab_clientes')
    .select('*')
    .eq('corretora_id', perfil.corretora_id)
    .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

  if (perfil.tipo_usuario === 'CORRETOR') {
    query = query.eq('corretor_id', perfil.id);
  }

  const { data: clientes, error } = await query;

  if (error || !clientes?.length) return;

  toast.info(`Iniciando sincronização de ${clientes.length} agendamentos...`);

  await Promise.all(
    clientes.map(cliente =>
      supabase.functions.invoke('sync-to-google-calendar', {
        body: {
          record: cliente,
          origem: 'tab_clientes'
        }
      })
    )
  );

  toast.success('Google Agenda populada com sucesso!');
} catch (error) {
  console.error('Erro na sincronização inicial:', error);
  toast.error('Erro ao sincronizar a Google Agenda.');
}


}, [carregarPerfil]);

const processarRetornoGoogle = useCallback(async () => {
const params = new URLSearchParams(window.location.search);
const code = params.get('code');


if (!code || processingCode.current) return;

processingCode.current = true;
setLoadingGoogle(true);

try {
  const { error } = await supabase.functions.invoke(
    'google-token-exchange',
    {
      body: {
        code,
        redirect_uri: `${window.location.origin}/agenda`
      }
    }
  );

  if (error) throw error;

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  setGoogleConectado(true);

  await sincronizarClientesExistentes();
  await fetchCompromissos();

  toast.success('Google Agenda conectado!');
} catch (error) {
  console.error('Erro na conexão Google:', error);
  toast.error('Falha na conexão do Google.');
} finally {
  setLoadingGoogle(false);
}


}, [fetchCompromissos, sincronizarClientesExistentes]);

useEffect(() => {
const code = new URLSearchParams(window.location.search).get('code');


if (code) {
  processarRetornoGoogle();
  return;
}

fetchCompromissos();


}, [fetchCompromissos, processarRetornoGoogle]);

const handleGoogleAuth = async () => {
if (googleConectado) {
if (!confirm('Deseja realmente desvincular sua conta Google?')) return;


  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('usuarios_perfis')
      .update({
        google_connected: false,
        google_access_token: null,
        google_refresh_token: null,
        google_calendar_id: null
      })
      .eq('id', user.id);

    if (error) throw error;

    setGoogleConectado(false);
    toast.success('Conta desvinculada!');
  } catch {
    toast.error('Erro ao desvincular a conta.');
  }

  return;
}

const GOOGLE_CLIENT_ID =
  '453100726787-a198m31oepdghl4c7b3o4pkle7hvqnkn.apps.googleusercontent.com';

const REDIRECT_URI = `${window.location.origin}/agenda`;

const scope = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email'
].join(' ');

const googleOAuthUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  '&response_type=code' +
  `&scope=${encodeURIComponent(scope)}` +
  '&access_type=offline' +
  '&prompt=select_account%20consent';

window.location.href = googleOAuthUrl;


};

const handleEventChange = async (info: any) => {
const {
clienteId,
itemId,
origem
} = info.event.extendedProps;


const novaData = info.event.start.toLocaleDateString('en-CA');

const novoHorario = info.event.start.toLocaleTimeString('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

try {
  if (origem === 'RENOVACAO') {
    if (!itemId) throw new Error('ID da renovação não encontrado');

    const { error } = await supabase
      .from('tab_proposta_itens')
      .update({
        data_renovacao: novaData,
        horario_renovacao: novoHorario
      })
      .eq('id', itemId);

    if (error) throw error;

    toast.success('Renovação atualizada!');
    return;
  }

  if (!clienteId) throw new Error('ID do cliente não encontrado');

  const updateData =
    origem === 'SINISTRO'
      ? {
          data_retorno_sinistro: novaData,
          horario_retorno_sinistro: novoHorario,
          atualizado_em: new Date().toISOString()
        }
      : {
          data_retorno: novaData,
          horario_retorno: novoHorario,
          atualizado_em: new Date().toISOString()
        };

  const { error } = await supabase
    .from('tab_clientes')
    .update(updateData)
    .eq('id', clienteId);

  if (error) throw error;

  toast.success(
    origem === 'SINISTRO'
      ? 'Sinistro atualizado!'
      : 'Agendamento atualizado!'
  );
} catch {
  toast.error('Falha ao salvar alteração.');
  info.revert();
}


};

const renderEventContent = useCallback(
(info: any) => {
const {
origem,
fase,
tipo,
status,
horario,
corretorId
} = info.event.extendedProps;


  const nomeDoCorretor =
    listaCorretores.find(corretor => corretor.id === corretorId)?.nome ||
    'Ag. Casa';

  let colorClasses =
    'bg-purple-50 border-purple-500 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';

  if (origem === 'SINISTRO') {
    colorClasses =
      'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  } else if (origem === 'RENOVACAO') {
    colorClasses =
      'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  } else if (fase === 'QUALIFICADO') {
    colorClasses =
      'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  } else if (fase === 'NEGOCIACAO') {
    colorClasses =
      'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  } else if (fase === 'PERDIDO') {
    colorClasses =
      'bg-red-50 border-red-500 text-red-800 dark:bg-red-950/40 dark:text-red-300';
  } else if (fase === 'CLIENTE') {
    colorClasses =
      'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
  }

  return (
    <div
      className={`flex flex-col p-1.5 rounded-lg border-l-4 shadow-sm hover:scale-[1.02] transition-transform ${colorClasses}`}
    >
      <div className="flex items-center justify-between mb-1 border-b border-black/10 pb-1">
        <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">
          {fase || 'LEAD'}
        </span>

        {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA') && (
          <span className="text-[8px] px-1 py-0.5 rounded uppercase font-bold truncate max-w-[60px] text-right bg-black/10 text-current">
            {nomeDoCorretor}
          </span>
        )}
      </div>

      <span className="text-[11px] font-bold leading-tight mb-1">
        {info.event.title}
      </span>

      <div className="mt-1 flex flex-col gap-0.5 text-[9px] leading-tight opacity-90">
        {tipo && (
          <div className="flex justify-between">
            <span className="font-bold opacity-75">Tipo:</span>
            <span>{tipo}</span>
          </div>
        )}

        {horario && (
          <div className="flex justify-between">
            <span className="font-bold opacity-75">Horário:</span>
            <span>{horario}</span>
          </div>
        )}

        {status && status !== '-' && (
          <div className="flex justify-between">
            <span className="font-bold opacity-75">Status:</span>
            <span className="truncate ml-1">{status}</span>
          </div>
        )}
      </div>
    </div>
  );
},
[listaCorretores, tipoUsuario]


);

if (loading) {
return ( <div className="flex items-center justify-center h-[80vh]"> <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /> </div>
);
}

const todosSelecionados =
corretoresSelecionados.length === listaCorretores.length + 1;

return ( <div className="flex flex-col gap-6 mt-4"> <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm"> <div className="flex items-center gap-5">
<div
className={`p-4 rounded-2xl transition-all duration-500 ${
              googleConectado
                ? 'bg-blue-50 text-blue-600 shadow-inner'
                : 'bg-zinc-100 text-zinc-400'
            }`}
> <CalendarCheck size={32} /> </div>

      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          Agenda do Corretor
          {googleConectado && (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </h2>

        <p className="text-sm text-zinc-500 font-medium">
          {googleConectado
            ? 'Sincronização com Google ativa'
            : 'Gerencie seus agendamentos'}
        </p>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => setIsModalClienteOpen(true)}
        className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 shadow-sm hover:shadow"
      >
        <UserPlus size={18} />
        <span>Novo Cliente</span>
      </button>

      {(tipoUsuario === 'ADMIN' ||
        tipoUsuario === 'CORRETORA' ||
        tipoUsuario === 'CORRETOR') && (
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
              <span className="text-lg">G</span>
              <span>
                {tipoUsuario === 'CORRETOR'
                  ? 'Google Calendar'
                  : 'Google Master'}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  </div>

  <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
    <div className="relative w-full md:w-[400px]">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />

        <input
          type="text"
          placeholder="Buscar por nome, CPF, CNPJ, telefone, e-mail..."
          value={termoBusca}
          onChange={event => setTermoBusca(event.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />

        {termoBusca && (
          <button
            onClick={() => setTermoBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {termoBusca.trim().length >= 2 &&
        resultadosBuscaGlobal.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              Registros Encontrados ({resultadosBuscaGlobal.length})
            </div>

            {resultadosBuscaGlobal.map(evento => {
              const dataFormatada = new Date(
                evento.start
              ).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <button
                  key={evento.id}
                  type="button"
                  onClick={() =>
                    handleSelecionarResultadoBusca(evento)
                  }
                  className="w-full flex items-center justify-between text-left p-2.5 hover:bg-blue-50/60 dark:hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800/40 last:border-none"
                >
                  <div className="truncate mr-2">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {evento.title}
                    </p>

                    <p className="text-[10px] text-zinc-400">
                      Fase:{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {evento.extendedProps.fase}
                      </span>
                    </p>
                  </div>

                  <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
                    {dataFormatada}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      {termoBusca.trim().length >= 2 &&
        resultadosBuscaGlobal.length === 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 text-center text-xs text-zinc-500 font-medium">
            Nenhum registro encontrado para "{termoBusca}"
          </div>
        )}
    </div>

    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
      {tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN' ? (
        <div className="relative w-full md:w-auto" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMenuFiltroAberto(aberto => !aberto)}
            className="flex items-center justify-between gap-3 w-full md:w-72 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              <Filter
                size={16}
                className="text-zinc-400 flex-shrink-0"
              />

              <span className="truncate">
                {corretoresSelecionados.length === 0
                  ? 'Nenhum selecionado'
                  : `Filtrando por (${corretoresSelecionados.length})`}
              </span>
            </div>

            <ChevronDown
              size={16}
              className={`text-zinc-400 transition-transform ${
                menuFiltroAberto ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuFiltroAberto && (
            <div className="absolute right-0 mt-2 w-full md:w-80 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col gap-2">
              <button
                type="button"
                onClick={toggleTodosCorretores}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors border-b border-zinc-100 dark:border-zinc-800/60 pb-2 mb-1"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    todosSelecionados
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {todosSelecionados && <Check size={12} />}
                </div>

                <span>
                  {todosSelecionados
                    ? 'Desmarcar Todos'
                    : 'Selecionar Toda a Equipe'}
                </span>
              </button>

              <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                <button
                  type="button"
                  onClick={() => toggleCorretor(usuarioLogado?.id)}
                  className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors text-left"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      corretoresSelecionados.includes(
                        usuarioLogado?.id || ''
                      )
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    {corretoresSelecionados.includes(
                      usuarioLogado?.id || ''
                    ) && <Check size={12} />}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Agendamentos da Casa
                    </span>

                    <span className="text-[10px] text-zinc-400">
                      Atendimentos diretos
                    </span>
                  </div>
                </button>

                {listaCorretores.map(corretor => {
                  const selecionado = corretoresSelecionados.includes(
                    corretor.id
                  );

                  return (
                    <button
                      key={corretor.id}
                      type="button"
                      onClick={() => toggleCorretor(corretor.id)}
                      className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors text-left"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selecionado
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {selecionado && <Check size={12} />}
                      </div>

                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {corretor.nome}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg border border-zinc-200/80 dark:border-zinc-700/50 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <User size={14} />
          <span>Sua Agenda ({usuarioLogado?.nome})</span>
        </div>
      )}
    </div>
  </div>

  <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      }}
      locale={ptBrLocale}
      events={eventosFiltrados}
      height="75vh"
      editable
      eventDrop={handleEventChange}
      eventClick={handleEventClick}
      eventContent={renderEventContent}
    />
  </div>

  {isModalClienteOpen && (
    <ModalCadastroCliente
      isOpen={isModalClienteOpen}
      onClose={() => setIsModalClienteOpen(false)}
      usuarioLogado={usuarioLogado}
      corretoresDisponiveis={listaCorretores}
      handleSubmit={async (
        payloadCliente: any,
        abrirAcaoComercial?: boolean
      ) => {
        try {
          const novoCliente = await criarClienteV2(payloadCliente);

          toast.success('Cliente cadastrado com sucesso!');
          setIsModalClienteOpen(false);

          if (abrirAcaoComercial && novoCliente) {
            setClienteAcoesSelecionado(novoCliente);
            setModalAcoesAberto(true);
          }

          await fetchCompromissos();
        } catch (error) {
          console.error('Erro ao salvar cliente:', error);
          toast.error('Erro ao cadastrar cliente. Verifique os dados.');
        }
      }}
      onSuccess={() => {
        setIsModalClienteOpen(false);
        fetchCompromissos();
      }}
    />
  )}

  {modalAcoesAberto && clienteAcoesSelecionado && (
    <ModalAcoesComerciais
      isOpen={modalAcoesAberto}
      lead={clienteAcoesSelecionado}
      onClose={() => {
        setModalAcoesAberto(false);
        setClienteAcoesSelecionado(null);
      }}
      onSave={handleSalvarAcaoComercial}
    />
  )}

  {modalFrioAberto && clienteFrioSelecionado && (
    <ModalAcoesComerciais
      isOpen={modalFrioAberto}
      lead={clienteFrioSelecionado}
      onClose={() => {
        setModalFrioAberto(false);
        setClienteFrioSelecionado(null);
      }}
      onSave={handleSalvarAcaoComercial}
    />
  )}

  {modalRenovAberto && itemRenovacaoSelecionado && (
    <ModalGerenciamentoRenovacao
      isOpen={modalRenovAberto}
      onClose={() => {
        setModalRenovAberto(false);
        setItemRenovacaoSelecionado(null);
      }}
      itemId={itemRenovacaoSelecionado.id}
      onSuccess={() => {
        setModalRenovAberto(false);
        setItemRenovacaoSelecionado(null);
        fetchCompromissos();
        toast.success('Agenda atualizada!');
      }}
    />
  )}

  {modalSinistroAberto && clienteSinistroSelecionado && (
    <ModalGerenciamentoSinistro
      clienteId={clienteSinistroSelecionado}
      onClose={() => {
        setModalSinistroAberto(false);
        setClienteSinistroSelecionado(null);
      }}
      onSuccess={() => {
        setModalSinistroAberto(false);
        setClienteSinistroSelecionado(null);
        fetchCompromissos();
      }}
    />
  )}
</div>

);
}
