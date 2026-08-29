import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ModalGerenciamentoRenovacao } from '../../contexts/ModalGerenciamentoRenovacao';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabaseClient';

import { CalendarCheck, Link2Off, Search, Filter, User, X, Check, ChevronDown } from 'lucide-react';
import AgendaCorretorCarteira from './AgendaCorretorCarteira';
import { AgendaCorretorAvulso } from './AgendaCorretorAvulso';
import AgendaCorretorFrio from './AgendaCorretorFrio';

// ==========================================
// INTERFACES & CONSTANTES (FORA DO COMPONENTE)
// ==========================================

export interface EventoAgenda {
  id: string;
  title: string;
  start: string;
  backgroundColor?: string;
  borderColor?: string;
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
    contatoFrio?: any;
    clienteData?: any;
  };
}

export interface ItemVencimentoAgendamento {
  data_retorno: string;
  horario_retorno: string;
  produto_interesse: string;
  breve_descricao: string;
}

export interface ContatoFrioDetalhe {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  tipo?: 'PF' | 'PJ';
  produto_interesse?: string;
  breve_descricao?: string;
  data_retorno?: string;
  horario_retorno?: string;
  produtos_gerais?: string[];
}

export const PRODUTOS_SEGURO = [
  'Auto', 'Frota', 'Saúde', 'Odonto', 'Vida Individual', 
  'Vida Empregados', 'Residencial', 'Empresarial', 
  'Responsabilidade Civil', 'Fiança Locatícia', 'Consórcio', 'Outros'
];

export const aplicarMascaraTelefone = (valor: string) => {
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11);
  if (apenasNumeros.length <= 10) {
    return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AgendaCorretor() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modais de Visualização e Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [modalFrioAberto, setModalFrioAberto] = useState(false);
  const [clienteFrioSelecionado, setClienteFrioSelecionado] = useState<any>(null);
  const [modalRenovAberto, setModalRenovAberto] = useState(false);
  const [itemRenovacaoSelecionado, setItemRenovacaoSelecionado] = useState<any>(null);
  const [eventoAvulsoSelecionado, setEventoAvulsoSelecionado] = useState<any>(null);

  // Integração Google
  const [googleConectado, setGoogleConectado] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const processingCode = useRef(false);

  // Filtros Multi-Select e Busca Global
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<{ id: string; nome: string } | null>(null);
  const [listaCorretores, setListaCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [corretoresSelecionados, setCorretoresSelecionados] = useState<string[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuFiltroAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCompromissos = useCallback(async () => {
  try {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase
      .from("usuarios_perfis")
      .select("id, tipo_usuario, corretora_id, nome")
      .eq("id", user.id)
      .maybeSingle();

    if (!perfil) return;
    
    setTipoUsuario(perfil.tipo_usuario);
    setUsuarioLogado({ id: perfil.id, nome: perfil.nome || 'Você' });

    const isCorretor = perfil.tipo_usuario === 'CORRETOR';

    // Se for Corretora/Admin, buscar lista da equipe para o filtro
    if (perfil.tipo_usuario === 'CORRETORA' || perfil.tipo_usuario === 'ADMIN') {
      const { data: equipe } = await supabase
        .from("usuarios_perfis")
        .select("id, nome")
        .eq("corretora_id", perfil.corretora_id)
        .eq("tipo_usuario", "CORRETOR");

      if (equipe) {
        setListaCorretores(equipe.map(c => ({ id: c.id, nome: c.nome || 'Corretor' })));
      }
    }

    // 1. QUERY A: Carteira de Clientes (Comercial e Sinistro)
    let queryCli = supabase
      .from('tab_clientes')
      .select('id, nome, razao_social, nome_fantasia, tipo_cliente, cpf, cnpj, email, telefone_whats, telefone_adicional, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, fase_kanban, status_kanban, temperatura, corretora_id, corretor_id')
      .eq('corretora_id', perfil.corretora_id)
      .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

    if (isCorretor) queryCli = queryCli.eq('corretor_id', perfil.id);

    // 2. QUERY B: Renovações de Apólices
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
            tab_clientes!inner (id, nome, razao_social, nome_fantasia, tipo_cliente, cpf, cnpj, email, telefone_whats)
          )
        )
      `)
      .eq('tab_proposta_opcoes.tab_propostas.corretora_id', perfil.corretora_id)
      .eq('status_renovacao', 'A RENOVAR')
      .not('data_renovacao', 'is', null);

    // 3. QUERY C: Agenda Fria Avulsa
    let queryAgendaFria = supabase
      .from('tab_clientes_agenda')
      .select('*')
      .eq('corretora_id', perfil.corretora_id)
      .not('data_retorno', 'is', null);

    if (isCorretor) queryAgendaFria = queryAgendaFria.eq('corretor_id', perfil.id);

    // 4. QUERY D: Prospecção Fria CNPJ
    let queryProspeccaoFria = supabase
      .from('tab_clientes_frios')
      .select('*')
      .eq('corretora_id', perfil.corretora_id)
      .not('data_retorno', 'is', null);

    if (isCorretor) queryProspeccaoFria = queryProspeccaoFria.eq('corretor_id', perfil.id);

    // Execução paralela
    const [resClientes, resRenovacoes, resAgendaFria, resProspeccaoFria] = await Promise.all([
      queryCli, queryRenov, queryAgendaFria, queryProspeccaoFria
    ]);

    const eventosFormatados: EventoAgenda[] = [];

    // --- PROCESSAMENTO 1: CARTEIRA DE CLIENTES ---
    resClientes.data?.forEach(cli => {
      const nomeTitulo = cli.tipo_cliente === 'PJ' ? (cli.nome_fantasia || cli.razao_social || 'PJ') : (cli.nome || 'PF');
      const dadosEstendidos = {
        clienteId: cli.id, 
        corretorId: cli.corretor_id || null, // Importante para o filtro
        tipo: cli.tipo_cliente, 
        cpf: cli.cpf,
        cnpj: cli.cnpj,
        email: cli.email,
        whats: cli.telefone_whats,
        telefoneAdicional: cli.telefone_adicional,
        razaoSocial: cli.razao_social,
        nomeFantasia: cli.nome_fantasia,
        clienteData: cli
      };
      
      if (cli.data_retorno) {
        eventosFormatados.push({
          id: `${cli.id}_comercial`,
          title: nomeTitulo,
          start: `${cli.data_retorno}T${cli.horario_retorno || '09:00:00'}`,
          extendedProps: { 
            ...dadosEstendidos,
            fase: cli.fase_kanban || '-', 
            status: cli.status_kanban || '-',
            temperatura: cli.temperatura || '-',
            horario: cli.horario_retorno || '09:00',
            origem: 'COMERCIAL',
            tipoEvento: 'CARTEIRA',
          }
        });
      }

      if (cli.data_retorno_sinistro) {
        eventosFormatados.push({
          id: `${cli.id}_sinistro`,
          title: `[SINISTRO] ${nomeTitulo}`,
          start: `${cli.data_retorno_sinistro}T${cli.horario_retorno_sinistro || '09:00:00'}`,
          extendedProps: { 
            ...dadosEstendidos,
            fase: 'Sinistro', 
            origem: 'SINISTRO',
            tipoEvento: 'SINISTRO',
          }
        });
      }
    });

    // --- PROCESSAMENTO 2: RENOVAÇÕES ---
    resRenovacoes.data?.forEach(renov => {
      const propRelacionamento = renov.tab_proposta_opcoes as any;
      const infoOpcao = Array.isArray(propRelacionamento) ? propRelacionamento[0] : propRelacionamento;
      const infoProposta = Array.isArray(infoOpcao?.tab_propostas) ? infoOpcao?.tab_propostas[0] : infoOpcao?.tab_propostas;
      const infoCli = Array.isArray(infoProposta?.tab_clientes) ? infoProposta?.tab_clientes[0] : infoProposta?.tab_clientes;
      const corretorIdItem = infoProposta?.corretor_id;

      if (isCorretor && corretorIdItem !== perfil.id) return;

      const nomeTitulo = infoCli?.tipo_cliente === 'PJ' ? (infoCli?.nome_fantasia || infoCli?.razao_social || 'PJ') : (infoCli?.nome || 'PF');
      const produto = (renov.grid_produtos as any)?.nome || 'Seguro';

      eventosFormatados.push({
        id: `${renov.id}_renov`,
        title: `[RENOV] ${nomeTitulo} - ${produto}`,
        start: `${renov.data_renovacao}T${renov.horario_renovacao || '09:00:00'}`,
        extendedProps: { 
          clienteId: infoCli?.id, 
          corretorId: corretorIdItem || null,
          tipo: infoCli?.tipo_cliente,
          cpf: infoCli?.cpf,
          cnpj: infoCli?.cnpj,
          email: infoCli?.email,
          whats: infoCli?.telefone_whats,
          razaoSocial: infoCli?.razao_social,
          nomeFantasia: infoCli?.nome_fantasia,
          produtoInteresse: produto,
          fase: 'Renovação', 
          origem: 'RENOVACAO',
          tipoEvento: 'RENOVACAO',
          itemId: renov.id,
          clienteData: infoCli
        }
      });
    });

    // --- PROCESSAMENTO 3: AGENDA FRIA AVULSA ---
    resAgendaFria.data?.forEach(frio => {
      let prodsGerais = [];
      if (frio.produtos_gerais) {
        try {
          prodsGerais = typeof frio.produtos_gerais === 'string' && frio.produtos_gerais.startsWith('[') ? JSON.parse(frio.produtos_gerais) : [frio.produtos_gerais];
        } catch {
          prodsGerais = [frio.produtos_gerais];
        }
      }

      eventosFormatados.push({
        id: `${frio.id}_frio_avulso`,
        title: `[AVULSO] ${frio.nome_cliente}`,
        start: `${frio.data_retorno}T${frio.horario_retorno || '09:00:00'}`,
        extendedProps: { 
          clienteId: frio.id, 
          corretorId: frio.corretor_id || null,
          tipo: 'FRIO_AVULSO', 
          email: frio.email_cliente,
          whats: frio.tel_cliente,
          breveDescricao: frio.breve_descricao,
          produtoInteresse: frio.produto_interesse,
          produtosGerais: typeof prodsGerais === 'string' ? prodsGerais : prodsGerais.join(', '),
          fase: 'Contato Inicial', 
          origem: 'AGENDA_FRIA',
          tipoEvento: 'AVULSO',
          contatoFrio: { 
            telefone: frio.tel_cliente, 
            email: frio.email_cliente, 
            breve_descricao: frio.breve_descricao,
            tipo: frio.tipo_cliente || 'PF',
            produto_interesse: frio.produto_interesse || 'Auto',
            produtos_gerais: prodsGerais 
          }
        }
      });
    });

    // --- PROCESSAMENTO 4: PROSPECÇÃO FRIA CNPJ ---
    resProspeccaoFria.data?.forEach(frio => {
      const nomeEmpresa = frio.nome_fantasia || frio.razao_social || 'Empresa Sem Nome';

      eventosFormatados.push({
        id: `${frio.id}_frio_cnpj`,
        title: `[PROSPECÇÃO] ${nomeEmpresa}`,
        start: `${frio.data_retorno}T${frio.horario_retorno || '09:00:00'}`,
        extendedProps: { 
          clienteId: frio.id, 
          corretorId: frio.corretor_id || null,
          tipo: 'PJ',
          cnpj: frio.cnpj,
          email: frio.email,
          whats: frio.telefone,
          razaoSocial: frio.razao_social,
          nomeFantasia: frio.nome_fantasia,
          fase: frio.fase_atendimento || 'Não Contatado', 
          status: frio.status_prospeccao || 'Não Prospectado',
          temperatura: frio.temperatura || 'frio',
          origem: 'PROSPECCAO_FRIA',
          tipoEvento: 'FRIO',
          clienteData: frio
        }
      });
    });

    setEventos(eventosFormatados);
  } catch (err) {
    console.error("Erro ao carregar compromissos da agenda:", err);
  } finally {
    setLoading(false);
  }
}, []);

  // LÓGICA DE DEFINIÇÃO INICIAL DO FILTRO DE CORRETORES
  useEffect(() => {
    if (tipoUsuario === 'CORRETOR' && usuarioLogado?.id) {
      setCorretoresSelecionados([usuarioLogado.id]);
    } else if ((tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') && usuarioLogado) {
      const todosIds = [usuarioLogado.id, ...listaCorretores.map(c => c.id)].filter(Boolean) as string[];
      setCorretoresSelecionados(todosIds);
    }
  }, [tipoUsuario, usuarioLogado, listaCorretores]);

  // AÇÕES DO DROPDOWN MULTI-SELECT
  const toggleCorretor = (id?: string) => {
    if(!id) return;
    setCorretoresSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleTodosCorretores = () => {
    const todosIds = [usuarioLogado?.id, ...listaCorretores.map(c => c.id)].filter(Boolean) as string[];
    if (corretoresSelecionados.length === todosIds.length) {
      setCorretoresSelecionados([]); // Desmarca todos
    } else {
      setCorretoresSelecionados(todosIds); // Marca todos
    }
  };

  // ==========================================
  // FILTRAGEM FINAL DOS EVENTOS (USE-MEMO)
  // ==========================================
  const eventosFiltrados = useMemo(() => {
    const apenasNumeros = (val?: string) => (val || '').replace(/\D/g, '');

    return eventos.filter((evt) => {
      const props = evt.extendedProps || {};

      // 1. FILTRO DE CORRETORES MULTI-SELECT
      if (tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') {
        // Se a agenda pertencer à casa/corretora (null), validamos se a própria Corretora está marcada
        const pertenceAosSelecionados = corretoresSelecionados.includes(props.corretorId || '') || 
                                       (!props.corretorId && corretoresSelecionados.includes(usuarioLogado?.id || ''));
        if (!pertenceAosSelecionados) return false;
      } else if (tipoUsuario === 'CORRETOR') {
        if (props.corretorId !== usuarioLogado?.id) return false;
      }

      // 2. BUSCA GLOBAL DE TEXTOS E NÚMEROS
      if (termoBusca.trim() !== '') {
        const termo = termoBusca.toLowerCase().trim();
        const termoNumerico = apenasNumeros(termo);

        const titulo = (evt.title || '').toLowerCase();
        const email = (props.email || '').toLowerCase();
        const razaoSocial = (props.razaoSocial || '').toLowerCase();
        const nomeFantasia = (props.nomeFantasia || '').toLowerCase();
        const produto = (props.produtoInteresse || props.produtosGerais || '').toLowerCase();
        const descricao = (props.breveDescricao || '').toLowerCase();

        const cpfCnpj = apenasNumeros(props.cpf || props.cnpj);
        const telefone1 = apenasNumeros(props.whats);
        const telefone2 = apenasNumeros(props.telefoneAdicional || props.contatoFrio?.telefone);

        const bateuTexto = titulo.includes(termo) || email.includes(termo) || razaoSocial.includes(termo) || nomeFantasia.includes(termo) || produto.includes(termo) || descricao.includes(termo);
        const bateuNumero = termoNumerico.length > 0 && (cpfCnpj.includes(termoNumerico) || telefone1.includes(termoNumerico) || telefone2.includes(termoNumerico));

        if (!bateuTexto && !bateuNumero) return false;
      }

      return true;
    });
  }, [eventos, corretoresSelecionados, termoBusca, tipoUsuario, usuarioLogado]);

  const calendarRef = useRef<FullCalendar>(null);

  // NOVO: Resultados globais para a busca inteligente (ignora o mês atual do calendário)
  const resultadosBuscaGlobal = useMemo(() => {
    if (!termoBusca || termoBusca.trim().length < 2) return [];
    const apenasNumeros = (val?: string) => (val || '').replace(/\D/g, '');
    const termo = termoBusca.toLowerCase().trim();
    const termoNumerico = apenasNumeros(termo);

    return eventos.filter((evt) => {
      const props = evt.extendedProps || {};
      
      if (tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') {
        const pertenceAosSelecionados = corretoresSelecionados.includes(props.corretorId || '') || 
                                       (!props.corretorId && corretoresSelecionados.includes(usuarioLogado?.id || ''));
        if (!pertenceAosSelecionados) return false;
      } else if (tipoUsuario === 'CORRETOR') {
        if (props.corretorId !== usuarioLogado?.id) return false;
      }

      const titulo = (evt.title || '').toLowerCase();
      const email = (props.email || '').toLowerCase();
      const razaoSocial = (props.razaoSocial || '').toLowerCase();
      const nomeFantasia = (props.nomeFantasia || '').toLowerCase();
      const produto = (props.produtoInteresse || props.produtosGerais || '').toLowerCase();
      const descricao = (props.breveDescricao || '').toLowerCase();

      const cpfCnpj = apenasNumeros(props.cpf || props.cnpj);
      const telefone1 = apenasNumeros(props.whats);
      const telefone2 = apenasNumeros(props.telefoneAdicional || props.contatoFrio?.telefone);

      const bateuTexto = titulo.includes(termo) || email.includes(termo) || razaoSocial.includes(termo) || nomeFantasia.includes(termo) || produto.includes(termo) || descricao.includes(termo);
      const bateuNumero = termoNumerico.length > 0 && (cpfCnpj.includes(termoNumerico) || telefone1.includes(termoNumerico) || telefone2.includes(termoNumerico));

      return bateuTexto || bateuNumero;
    });
  }, [eventos, termoBusca, tipoUsuario, corretoresSelecionados, usuarioLogado]);

  // NOVO: Função para saltar a data e abrir o modal correspondente
  const handleSelecionarResultadoBusca = async (evt: EventoAgenda) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(evt.start);
    }
    setTermoBusca('');

    await handleEventClick({
      event: {
        title: evt.title,
        start: evt.start,
        startStr: evt.start,
        extendedProps: evt.extendedProps
      }
    });
  };

  const verificarConexaoGoogle = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil, error } = await supabase
        .from("usuarios_perfis")
        .select("google_connected")
        .eq("id", user.id)
        .single();
      if (!error) setGoogleConectado(!!perfil.google_connected);
    } catch (err) {
      console.error("Erro na verificação do Google:", err);
    }
  }, []);

  const sincronizarClientesExistentes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase.from("usuarios_perfis").select("id, tipo_usuario, corretora_id").eq("id", user.id).single();
      if (!perfil) return;

      let query = supabase.from('tab_clientes').select('*').eq('corretora_id', perfil.corretora_id).or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');
      if (perfil.tipo_usuario === 'CORRETOR') query = query.eq('corretor_id', perfil.id);

      const { data: clientes } = await query;
      if (!clientes || clientes.length === 0) return;

      toast.info(`Iniciando sincronização de ${clientes.length} agendamentos...`);
      for (const cliente of clientes) {
        await supabase.functions.invoke('sync-to-google-calendar', { body: { record: cliente } });
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
      toast.error("Falha na conexão do Google");
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
      if (!confirm("Deseja realmente desvincular sua conta Google?")) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("usuarios_perfis")
            .update({ google_connected: false, google_access_token: null, google_refresh_token: null, google_calendar_id: null })
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
    const novoHorario = info.event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    try {
      if (origem === 'AGENDA_FRIA') {
        const { error: dbError } = await supabase.from('tab_clientes_agenda').update({ data_retorno: novaData, horario_retorno: novoHorario }).eq('id', clienteId);
        if (dbError) throw dbError;
        toast.success(`Contato frio reagendado para ${novaData}`);
      } else if (origem === 'RENOVACAO') {
        if (!itemId) throw new Error("ID do item não encontrado");
        const { error: dbError } = await supabase.from('tab_proposta_itens').update({ data_renovacao: novaData, horario_renovacao: novoHorario }).eq('id', itemId);
        if (dbError) throw dbError;
        toast.success(`Renovação reagendada para ${novaData}`);
      } else {
        const isSinistro = origem === 'SINISTRO';
        const updateData = isSinistro ? { data_retorno_sinistro: novaData, horario_retorno_sinistro: novoHorario } : { data_retorno: novaData, horario_retorno: novoHorario };
        const { error: dbError } = await supabase.from('tab_clientes').update(updateData).eq('id', clienteId);
        if (dbError) throw dbError;
        toast.success(`${isSinistro ? 'Sinistro' : 'Retorno'} atualizado!`);
      }
    } catch (err: any) {
      toast.error("Falha ao salvar alteração");
      info.revert();
    }
  }

  const handleEventClick = useCallback(async (info: any) => {
    const { origem, tipoEvento, clienteId, itemId, contatoFrio, clienteData } = info.event.extendedProps;

    if (origem === 'PROSPECCAO_FRIA' || tipoEvento === 'FRIO') {
      if (clienteData) {
        setClienteFrioSelecionado(clienteData);
        setModalFrioAberto(true);
      } else if (clienteId) {
        const { data, error } = await supabase.from('tab_clientes_frios').select('*').eq('id', clienteId).single();
        if (data && !error) {
          setClienteFrioSelecionado(data);
          setModalFrioAberto(true);
        }
      }
      return;
    }

    if (origem === 'AGENDA_FRIA' || tipoEvento === 'AVULSO') {
      setEventoAvulsoSelecionado({
        id: clienteId,
        nome: info.event.title,
        start: info.event.startStr,
        ...contatoFrio
      });
      return;
    }

    if (origem === 'RENOVACAO' || tipoEvento === 'RENOVACAO') {
      const { data, error } = await supabase.from('tab_proposta_itens').select(`*, base_produtos(nome), tab_proposta_opcoes(tab_propostas(tab_clientes(*)))`).eq('id', itemId).single();
      if (data && !error) {
        setItemRenovacaoSelecionado(data);
        setModalRenovAberto(true);
      }
      return;
    }

    if (clienteId) {
      const { data, error } = await supabase.from('tab_clientes').select('*').eq('id', clienteId).single();
      if (data && !error) {
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
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl transition-all duration-500 ${googleConectado ? 'bg-blue-50 text-blue-600 shadow-inner' : 'bg-zinc-100 text-zinc-400'}`}>
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
          <AgendaCorretorAvulso isNovo={true} onSuccess={fetchCompromissos} />

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
                  <Link2Off size={18} /> Desvincular Google
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

      {/* BARRA DE FILTROS: PESQUISA GLOBAL + MULTI-SELECT DA EQUIPE */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        
        <div className="relative w-full md:w-[400px]">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, CNPJ, telefone, e-mail..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {termoBusca && (
              <button onClick={() => setTermoBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X size={16} />
              </button>
            )}
          </div>

          {/* POPOVER DE RESULTADOS DINÂMICOS */}
          {termoBusca.trim().length >= 2 && resultadosBuscaGlobal.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                Registros Encontrados ({resultadosBuscaGlobal.length})
              </div>
              {resultadosBuscaGlobal.map((evt) => {
                const dataFormatada = new Date(evt.start).toLocaleString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelecionarResultadoBusca(evt)}
                    className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 dark:hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800/40 last:border-none"
                  >
                    <div className="truncate mr-2">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{evt.title}</p>
                      <p className="text-[10px] text-zinc-400">Origem: <span className="font-semibold text-blue-600 dark:text-blue-400">{evt.extendedProps.origem}</span></p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
                        {dataFormatada}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {termoBusca.trim().length >= 2 && resultadosBuscaGlobal.length === 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 text-center text-xs text-zinc-500 font-medium">
              Nenhum registro encontrado para "{termoBusca}"
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {(tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') ? (
            <div className="relative w-full md:w-auto" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMenuFiltroAberto(!menuFiltroAberto)}
                className="flex items-center justify-between gap-3 w-full md:w-72 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <Filter size={16} className="text-zinc-400 flex-shrink-0" />
                  <span className="truncate">
                    {corretoresSelecionados.length === 0 
                      ? "Nenhum selecionado" 
                      : `Filtrando por (${corretoresSelecionados.length})`}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform ${menuFiltroAberto ? 'rotate-180' : ''}`} />
              </button>

              {menuFiltroAberto && (
                <div className="absolute right-0 mt-2 w-full md:w-80 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={toggleTodosCorretores}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors border-b border-zinc-100 dark:border-zinc-800/60 pb-2 mb-1"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      corretoresSelecionados.length === (listaCorretores.length + 1) ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {corretoresSelecionados.length === (listaCorretores.length + 1) && <Check size={12} />}
                    </div>
                    <span>{corretoresSelecionados.length === (listaCorretores.length + 1) ? "Desmarcar Todos" : "Selecionar Toda a Equipe"}</span>
                  </button>

                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                    <label 
                      onClick={() => toggleCorretor(usuarioLogado?.id)}
                      className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        corretoresSelecionados.includes(usuarioLogado?.id || '') ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {corretoresSelecionados.includes(usuarioLogado?.id || '') && <Check size={12} />}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">🏢 Agendamentos da Casa</span>
                        <span className="text-[10px] text-zinc-400">Atendimentos diretos</span>
                      </div>
                    </label>

                    {listaCorretores.map((corretor) => {
                      const isSelected = corretoresSelecionados.includes(corretor.id);
                      return (
                        <label
                          key={corretor.id}
                          onClick={() => toggleCorretor(corretor.id)}
                          className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            👤 {corretor.nome}
                          </span>
                        </label>
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

      {/* CALENDÁRIO FULLCALENDAR */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
          locale={ptBrLocale}
          events={eventosFiltrados} // DADOS JÁ FILTRADOS PELO USE-MEMO
          height="75vh"
          editable={true}
          eventDrop={handleEventChange}
          eventClick={handleEventClick}
          eventContent={(info) => {
            const { origem, fase, tipo, status, horario, corretorId } = info.event.extendedProps;
            const nomeDoCorretor = listaCorretores.find(c => c.id === corretorId)?.nome || 'Ag. Casa';
            
            if (origem === 'AGENDA_FRIA') {
              return (
                <div className="flex flex-col p-1.5 rounded-lg border-l-4 shadow-sm bg-purple-50 border-purple-500 text-purple-800 cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">Contato Avulso</span>
                    {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA') && (
                      <span className="text-[8px] bg-purple-200 text-purple-900 px-1 py-0.5 rounded uppercase">{nomeDoCorretor}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold leading-tight mb-1">{info.event.title}</span>
                  <span className="text-[9px] opacity-75">Tel: {info.event.extendedProps.contatoFrio?.telefone || 'N/D'}</span>
                </div>
              );
            }

            let colorClasses = "bg-blue-50 border-blue-500 text-blue-700"; 
            if (origem === 'COMERCIAL') colorClasses = "bg-emerald-50 border-emerald-500 text-emerald-800";
            if (origem === 'SINISTRO') colorClasses = "bg-red-50 border-red-500 text-red-700";
            if (origem === 'RENOVACAO') colorClasses = "bg-amber-50 border-amber-500 text-amber-700";

            // Cores específicas para os crachás de corretor dentro do evento
            const tagBg = origem === 'COMERCIAL' ? 'bg-emerald-200 text-emerald-900' :
                          origem === 'SINISTRO' ? 'bg-red-200 text-red-900' :
                          origem === 'RENOVACAO' ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900';

            return (
              <div className={`flex flex-col p-1.5 rounded-lg border-l-4 shadow-sm hover:scale-[1.02] transition-transform ${colorClasses}`}>
                <div className="flex items-center justify-between mb-1 border-b border-black/10 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">
                    {origem === 'COMERCIAL' ? 'CARTEIRA' : fase}
                  </span>
                  {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA') && (
                    <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold truncate max-w-[60px] text-right ${tagBg}`}>
                      {nomeDoCorretor}
                    </span>
                  )}
                </div>
                
                <span className="text-[11px] font-bold leading-tight mb-1">{info.event.title}</span>

                {origem === 'COMERCIAL' && (
                  <div className="mt-1 flex flex-col gap-0.5 text-[9px] leading-tight">
                    <div className="flex justify-between"><span className="font-bold opacity-75">Tipo:</span> <span>{tipo}</span></div>
                    <div className="flex justify-between"><span className="font-bold opacity-75">Retorno:</span> <span>{horario}</span></div>
                    <div className="flex justify-between"><span className="font-bold opacity-75">Status:</span> <span className="truncate ml-1">{status}</span></div>
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* MODAIS */}
      {eventoAvulsoSelecionado && (
        <AgendaCorretorAvulso 
          evento={eventoAvulsoSelecionado}
          onClose={() => setEventoAvulsoSelecionado(null)}
          onSuccess={() => {
            setEventoAvulsoSelecionado(null);
            fetchCompromissos();
          }} 
        />
      )}

      <AgendaCorretorCarteira
        isOpen={modalAberto} 
        onClose={() => setModalAberto(false)} 
        cliente={clienteSelecionado} 
        onSuccess={fetchCompromissos} 
      />

      <AgendaCorretorFrio 
        isOpen={modalFrioAberto}
        onClose={() => {
          setModalFrioAberto(false);
          setClienteFrioSelecionado(null);
        }}
        cliente={clienteFrioSelecionado}
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