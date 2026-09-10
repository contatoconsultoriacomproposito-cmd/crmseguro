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
import { salvarAcaoComercialV2 } from '../clientes/clienteServiceV2';
import { criarClienteV2 } from '../clientes/clienteServiceV2';

// --- INTERFACES & TIPAGENS ---

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
    contatoFrio?: ContatoFrioDetalhe;
    clienteData?: ClienteDados;
  };
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

export const PRODUTOS_SEGURO = [
  'Auto',
  'Frota',
  'Saúde',
  'Odonto',
  'Vida Individual',
  'Vida Empregados',
  'Residencial',
  'Empresarial',
  'Responsabilidade Civil',
  'Fiança Locatícia',
  'Consórcio',
  'Outros'
];

export const aplicarMascaraTelefone = (valor: string) => {
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11);
  if (apenasNumeros.length <= 10) {
    return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

const parseContatos = (contatos: any): ContatoJson[] => {
  if (!contatos) return [];
  if (Array.isArray(contatos)) return contatos;

  if (typeof contatos === 'string') {
    try {
      const parsed = JSON.parse(contatos);
      if (Array.isArray(parsed)) return parsed;

      if (typeof parsed === 'string') {
        const parsedAgain = JSON.parse(parsed);
        return Array.isArray(parsedAgain) ? parsedAgain : [];
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
};

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

  const [eventoAvulsoSelecionado, setEventoAvulsoSelecionado] = useState<any>(null);

  const [googleConectado, setGoogleConectado] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const processingCode = useRef(false);

  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<{ id: string; nome: string } | null>(null);
  const [listaCorretores, setListaCorretores] = useState<{ id: string; nome: string }[]>([]);

  const [corretoresSelecionados, setCorretoresSelecionados] = useState<string[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);

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

  const fetchCompromissos = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, tipo_usuario, corretora_id, nome')
        .eq('id', user.id)
        .maybeSingle();

      if (!perfil) return;

      setTipoUsuario(perfil.tipo_usuario);
      setUsuarioLogado({ id: perfil.id, nome: perfil.nome || 'Você' });

      const isCorretor = perfil.tipo_usuario === 'CORRETOR';

      if (perfil.tipo_usuario === 'CORRETORA' || perfil.tipo_usuario === 'ADMIN') {
        const { data: equipe } = await supabase
          .from('usuarios_perfis')
          .select('id, nome')
          .eq('corretora_id', perfil.corretora_id)
          .eq('tipo_usuario', 'CORRETOR');

        if (equipe) {
          setListaCorretores(equipe.map(c => ({ id: c.id, nome: c.nome || 'Corretor' })));
        }
      }

      let queryCli = supabase
        .from('tab_clientes')
        .select('id, nome_razao_social, nome_fantasia, tipo_cliente, cpf_cnpj, contatos, data_retorno, horario_retorno, data_retorno_sinistro, horario_retorno_sinistro, fase_atendimento, temperatura, corretora_id, corretor_id')
        .eq('corretora_id', perfil.corretora_id)
        .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

      let queryAgendaFria = supabase
        .from('tab_clientes')
        .select('*')
        .eq('corretora_id', perfil.corretora_id)
        .eq('fase_atendimento', 'Contato Inicial')
        .not('data_retorno', 'is', null);

      let queryProspeccaoFria = supabase
        .from('tab_clientes')
        .select('*')
        .eq('corretora_id', perfil.corretora_id)
        .eq('fase_atendimento', 'Não Contatado')
        .not('data_retorno', 'is', null);

      let queryRenovacoes = supabase
      .from('tab_proposta_itens')
      .select(`
        id, 
        data_renovacao, 
        horario_renovacao, 
        status_renovacao,
        base_produtos ( nome ),
        tab_proposta_opcoes (
          tab_propostas (
            corretora_id, 
            corretor_id,
            cliente_id,
            tab_clientes!tab_propostas_cliente_id_fkey ( 
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

      if (isCorretor) {
        queryCli = queryCli.eq('corretor_id', perfil.id);
        queryAgendaFria = queryAgendaFria.eq('corretor_id', perfil.id);
        queryProspeccaoFria = queryProspeccaoFria.eq('corretor_id', perfil.id);
      }

      const [resClientes, resAgendaFria, resProspeccaoFria, resRenovacoes] = await Promise.all([
        queryCli,
        queryAgendaFria,
        queryProspeccaoFria,
        queryRenovacoes
      ]);

      const dadosRenovacoes = (resRenovacoes.data || []).filter((item: any) => {
        const opcao = Array.isArray(item.tab_proposta_opcoes) ? item.tab_proposta_opcoes[0] : item.tab_proposta_opcoes;
        const proposta = Array.isArray(opcao?.tab_propostas) ? opcao.tab_propostas[0] : opcao?.tab_propostas;
        
        if (!proposta) return false;
        if (proposta.corretora_id !== perfil.corretora_id) return false;
        if (isCorretor && proposta.corretor_id !== perfil.id) return false;
        return true;
      });

      const eventosFormatados: EventoAgenda[] = [];

      resClientes.data?.forEach(cli => {
        const contatosArray = parseContatos(cli.contatos);
        const contatoPrincipal = contatosArray.find(ct => ct.principal) || contatosArray[0] || {};
        const nomeTitulo = cli.tipo_cliente === 'PJ' ? cli.nome_fantasia || cli.nome_razao_social || 'PJ' : cli.nome_razao_social || 'PF';

        const dadosEstendidos = {
          clienteId: cli.id,
          corretorId: cli.corretor_id || undefined,
          tipo: cli.tipo_cliente,
          cpf: cli.tipo_cliente === 'PF' ? cli.cpf_cnpj : '',
          cnpj: cli.tipo_cliente === 'PJ' ? cli.cpf_cnpj : '',
          email: contatoPrincipal.email || '',
          whats: contatoPrincipal.telefone || '',
          telefoneAdicional: '',
          razaoSocial: cli.nome_razao_social,
          nomeFantasia: cli.nome_fantasia,
          clienteData: cli as ClienteDados
        };

        if (cli.data_retorno) {
          eventosFormatados.push({
            id: `${cli.id}_comercial`,
            title: nomeTitulo,
            start: `${cli.data_retorno}T${cli.horario_retorno || '09:00:00'}`,
            extendedProps: {
              ...dadosEstendidos,
              fase: cli.fase_atendimento || 'LEAD',
              temperatura: cli.temperatura || '-',
              horario: cli.horario_retorno || '09:00',
              origem: 'COMERCIAL',
              tipoEvento: 'CARTEIRA'
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
              fase: 'SINISTRO',
              origem: 'SINISTRO',
              tipoEvento: 'SINISTRO'
            }
          });
        }
      });

      dadosRenovacoes.forEach(renov => {
        const opcao = Array.isArray(renov.tab_proposta_opcoes) ? renov.tab_proposta_opcoes[0] : renov.tab_proposta_opcoes;
        const proposta = Array.isArray(opcao?.tab_propostas) ? opcao.tab_propostas[0] : opcao?.tab_propostas;
        const infoCli = Array.isArray(proposta?.tab_clientes) ? proposta.tab_clientes[0] : proposta?.tab_clientes;
        
        const corretorIdItem = proposta?.corretor_id;
        const contatosArray = parseContatos(infoCli?.contatos);
        const contatoPrinc = contatosArray.find(ct => ct.principal) || contatosArray[0] || {};
        const nomeTitulo = infoCli?.tipo_cliente === 'PJ' ? infoCli?.nome_fantasia || infoCli?.nome_razao_social || 'PJ' : infoCli?.nome_razao_social || 'PF';
        
        const baseProdutoObj = Array.isArray(renov.base_produtos) ? renov.base_produtos[0] : renov.base_produtos;
        const produto = baseProdutoObj?.nome || 'Seguro';

        eventosFormatados.push({
          id: `${renov.id}_renov`,
          title: `${nomeTitulo} - ${produto}`,
          start: `${renov.data_renovacao}T${renov.horario_renovacao || '09:00:00'}`,
          extendedProps: {
            clienteId: infoCli?.id,
            corretorId: corretorIdItem || undefined,
            tipo: infoCli?.tipo_cliente,
            cpf: infoCli?.tipo_cliente === 'PF' ? infoCli?.cpf_cnpj : '',
            cnpj: infoCli?.tipo_cliente === 'PJ' ? infoCli?.cpf_cnpj : '',
            email: contatoPrinc.email || '',
            whats: contatoPrinc.telefone || '',
            razaoSocial: infoCli?.nome_razao_social,
            nomeFantasia: infoCli?.nome_fantasia,
            produtoInteresse: produto,
            fase: infoCli?.fase_atendimento || 'RENOVAÇÃO',
            origem: 'RENOVACAO',
            tipoEvento: 'RENOVACAO',
            itemId: renov.id,
            clienteData: infoCli as ClienteDados
          }
        });
      });

      resAgendaFria.data?.forEach(frio => {
        let prodsGerais: string[] = [];
        if (frio.produtos_gerais) {
          try {
            prodsGerais = typeof frio.produtos_gerais === 'string' && frio.produtos_gerais.startsWith('[')
              ? JSON.parse(frio.produtos_gerais)
              : [frio.produtos_gerais];
          } catch {
            prodsGerais = [frio.produtos_gerais];
          }
        }
        const contatosArray = parseContatos(frio.contatos);
        const contatoPrinc = contatosArray.find(ct => ct.principal) || contatosArray[0] || {};
        const nomeAvulso = frio.nome_fantasia || frio.nome_razao_social || 'Avulso Sem Nome';

        eventosFormatados.push({
          id: `${frio.id}_frio_avulso`,
          title: nomeAvulso,
          start: `${frio.data_retorno}T${frio.horario_retorno || '09:00:00'}`,
          extendedProps: {
            clienteId: frio.id,
            corretorId: frio.corretor_id || undefined,
            tipo: 'FRIO_AVULSO',
            email: contatoPrinc.email || '',
            whats: contatoPrinc.telefone || '',
            breveDescricao: frio.breve_descricao,
            produtoInteresse: frio.produto_interesse,
            produtosGerais: typeof prodsGerais === 'string' ? prodsGerais : prodsGerais.join(', '),
            fase: frio.fase_atendimento || 'LEAD',
            origem: 'AGENDA_FRIA',
            tipoEvento: 'AVULSO',
            contatoFrio: {
              telefone: contatoPrinc.telefone || '',
              email: contatoPrinc.email || '',
              breve_descricao: frio.breve_descricao,
              tipo: frio.tipo_cliente || 'PF',
              produto_interesse: frio.produto_interesse || 'Auto',
              produtos_gerais: prodsGerais
            },
            clienteData: frio as ClienteDados
          }
        });
      });

      resProspeccaoFria.data?.forEach(frio => {
        const contatosArray = parseContatos(frio.contatos);
        const contatoPrinc = contatosArray.find(ct => ct.principal) || contatosArray[0] || {};
        const nomeEmpresa = frio.nome_fantasia || frio.nome_razao_social || 'Empresa Sem Nome';

        eventosFormatados.push({
          id: `${frio.id}_frio_cnpj`,
          title: nomeEmpresa,
          start: `${frio.data_retorno}T${frio.horario_retorno || '09:00:00'}`,
          extendedProps: {
            clienteId: frio.id,
            corretorId: frio.corretor_id || undefined,
            tipo: 'PJ',
            cnpj: frio.cpf_cnpj,
            email: contatoPrinc.email || '',
            whats: contatoPrinc.telefone || '',
            razaoSocial: frio.nome_razao_social,
            nomeFantasia: frio.nome_fantasia,
            fase: frio.fase_atendimento || 'LEAD',
            status: frio.status_prospeccao || 'Não Prospectado',
            temperatura: frio.temperatura || 'frio',
            origem: 'PROSPECCAO_FRIA',
            tipoEvento: 'FRIO',
            clienteData: frio as ClienteDados
          }
        });
      });

      setEventos(eventosFormatados);
    } catch (err) {
      console.error('Erro ao carregar compromissos da agenda:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tipoUsuario === 'CORRETOR' && usuarioLogado?.id) {
      setCorretoresSelecionados([usuarioLogado.id]);
    } else if ((tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') && usuarioLogado) {
      const todosIds = [usuarioLogado.id, ...listaCorretores.map(c => c.id)].filter(Boolean) as string[];
      setCorretoresSelecionados(todosIds);
    }
  }, [tipoUsuario, usuarioLogado, listaCorretores]);

  const toggleCorretor = (id?: string) => {
    if (!id) return;
    setCorretoresSelecionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleTodosCorretores = () => {
    const todosIds = [usuarioLogado?.id, ...listaCorretores.map(c => c.id)].filter(Boolean) as string[];
    if (corretoresSelecionados.length === todosIds.length) {
      setCorretoresSelecionados([]);
    } else {
      setCorretoresSelecionados(todosIds);
    }
  };

  const eventosFiltrados = useMemo(() => {
    const apenasNumeros = (val?: string) => (val || '').replace(/\D/g, '');
    return eventos.filter(evt => {
      const props = evt.extendedProps || {};

      if (tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') {
        const pertenceAosSelecionados =
          corretoresSelecionados.includes(props.corretorId || '') ||
          (!props.corretorId && corretoresSelecionados.includes(usuarioLogado?.id || ''));
        if (!pertenceAosSelecionados) return false;
      } else if (tipoUsuario === 'CORRETOR') {
        if (props.corretorId !== usuarioLogado?.id) return false;
      }

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

        const bateuTexto = titulo.includes(termo) || email.includes(termo) || razaoSocial.includes(termo) ||
          nomeFantasia.includes(termo) || produto.includes(termo) || descricao.includes(termo);
        
        const bateuNumero = termoNumerico.length > 0 &&
          (cpfCnpj.includes(termoNumerico) || telefone1.includes(termoNumerico) || telefone2.includes(termoNumerico));

        if (!bateuTexto && !bateuNumero) return false;
      }
      return true;
    });
  }, [eventos, corretoresSelecionados, termoBusca, tipoUsuario, usuarioLogado]);

  const resultadosBuscaGlobal = useMemo(() => {
    if (!termoBusca || termoBusca.trim().length < 2) return [];
    
    const apenasNumeros = (val?: string) => (val || '').replace(/\D/g, '');
    const termo = termoBusca.toLowerCase().trim();
    const termoNumerico = apenasNumeros(termo);

    return eventos.filter(evt => {
      const props = evt.extendedProps || {};
      if (tipoUsuario === 'CORRETORA' || tipoUsuario === 'ADMIN') {
        const pertenceAosSelecionados =
          corretoresSelecionados.includes(props.corretorId || '') ||
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

      const bateuTexto = titulo.includes(termo) || email.includes(termo) || razaoSocial.includes(termo) ||
        nomeFantasia.includes(termo) || produto.includes(termo) || descricao.includes(termo);
      
      const bateuNumero = termoNumerico.length > 0 &&
        (cpfCnpj.includes(termoNumerico) || telefone1.includes(termoNumerico) || telefone2.includes(termoNumerico));

      return bateuTexto || bateuNumero;
    });
  }, [eventos, termoBusca, tipoUsuario, corretoresSelecionados, usuarioLogado]);

  const abrirModalAcoesComerciais = useCallback(async (clienteId: string) => {
    if (!clienteId) return;
    const { data, error } = await supabase
      .from('tab_clientes')
      .select('*')
      .eq('id', clienteId)
      .maybeSingle();

    if (error) {
      toast.error('Não foi possível carregar o cliente.');
      return;
    }
    if (!data) {
      toast.error('Cliente não encontrado.');
      return;
    }
    setClienteAcoesSelecionado(data as ClienteDados);
    setModalAcoesAberto(true);
  }, []);

  const handleSalvarAcaoComercial = useCallback(async (dadosAcao: any) => {
    await salvarAcaoComercialV2(dadosAcao);
    await fetchCompromissos();
    toast.success('Interação registrada com sucesso.');
  }, [fetchCompromissos]);

  const handleEventClick = useCallback(async (info: any) => {
    const { origem, tipoEvento, clienteId, itemId, contatoFrio, clienteData } = info.event.extendedProps;

    if (origem === 'PROSPECCAO_FRIA' || tipoEvento === 'FRIO') {
      if (clienteData) {
        setClienteFrioSelecionado(clienteData);
        setModalFrioAberto(true);
      } else if (clienteId) {
        const { data, error } = await supabase.from('tab_clientes').select('*').eq('id', clienteId).single();
        if (data && !error) {
          setClienteFrioSelecionado(data as ClienteDados);
          setModalFrioAberto(true);
        }
      }
      return;
    }

    if (origem === 'AGENDA_FRIA' || tipoEvento === 'AVULSO') {
      if (clienteId) {
        await abrirModalAcoesComerciais(clienteId);
      } else {
        setEventoAvulsoSelecionado({
          id: clienteId,
          nome: info.event.title,
          start: info.event.startStr,
          ...contatoFrio
        });
      }
      return;
    }

    if (origem === 'RENOVACAO' || tipoEvento === 'RENOVACAO') {
      if (!itemId) return;

      const { data: itemCompleto, error } = await supabase
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
        .single();

      if (error || !itemCompleto) {
        toast.error('Não foi possível carregar a renovação.');
        return;
      }

      setItemRenovacaoSelecionado(itemCompleto);
      setModalRenovAberto(true);
      return;
    }

    if (clienteId) {
      await abrirModalAcoesComerciais(clienteId);
    }
  }, [abrirModalAcoesComerciais]);

  const handleSelecionarResultadoBusca = async (evt: EventoAgenda) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.gotoDate(evt.start);
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
        .from('usuarios_perfis')
        .select('google_connected')
        .eq('id', user.id)
        .single();
      if (!error) setGoogleConectado(!!perfil.google_connected);
    } catch (err) {
      console.error('Erro na verificação do Google:', err);
    }
  }, []);

  const sincronizarClientesExistentes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();
      if (!perfil) return;

      let query = supabase
        .from('tab_clientes')
        .select('*')
        .eq('corretora_id', perfil.corretora_id)
        .or('data_retorno.not.is.null,data_retorno_sinistro.not.is.null');

      if (perfil.tipo_usuario === 'CORRETOR') query = query.eq('corretor_id', perfil.id);

      const { data: clientes } = await query;
      if (!clientes || clientes.length === 0) return;

      toast.info(`Iniciando sincronização de ${clientes.length} agendamentos...`);

      for (const cliente of clientes) {
        await supabase.functions.invoke('sync-to-google-calendar', {
          body: { record: cliente, origem: 'tab_clientes' }
        });
      }
      toast.success('Google Agenda populada com sucesso!');
    } catch (err) {
      console.error('Erro na sincronização inicial:', err);
    }
  }, []);

  const processarRetornoGoogle = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

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

      toast.success('Google Agenda conectado!');
    } catch {
      toast.error('Falha na conexão do Google');
    } finally {
      setLoadingGoogle(false);
    }
  }, [fetchCompromissos, verificarConexaoGoogle, sincronizarClientesExistentes]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        await processarRetornoGoogle();
      } else {
        if (!isMounted) return;
        await Promise.all([fetchCompromissos(), verificarConexaoGoogle()]);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchCompromissos, verificarConexaoGoogle, processarRetornoGoogle]);

  async function handleGoogleAuth() {
    if (googleConectado) {
      if (!confirm('Deseja realmente desvincular sua conta Google?')) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('usuarios_perfis').update({
            google_connected: false,
            google_access_token: null,
            google_refresh_token: null,
            google_calendar_id: null
          }).eq('id', user.id);
          setGoogleConectado(false);
          toast.success('Conta desvinculada!');
        }
      } catch {
        toast.error('Erro ao desvincular');
      }
      return;
    }

    const GOOGLE_CLIENT_ID = '453100726787-a198m31oepdghl4c7b3o4pkle7hvqnkn.apps.googleusercontent.com';
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
        const { error: dbError } = await supabase
          .from('tab_clientes')
          .update({ data_retorno: novaData, horario_retorno: novoHorario, atualizado_em: new Date().toISOString() })
          .eq('id', clienteId);
        if (dbError) throw dbError;
        toast.success(`Contato frio reagendado para ${novaData}`);
      } else if (origem === 'RENOVACAO') {
        if (!itemId) throw new Error('ID do item não encontrado');
        const { error: dbError } = await supabase
          .from('tab_proposta_itens')
          .update({ data_renovacao: novaData, horario_renovacao: novoHorario })
          .eq('id', itemId);
        if (dbError) throw dbError;
        toast.success(`Renovação reagendada para ${novaData}`);
      } else {
        const isSinistro = origem === 'SINISTRO';
        const updateData = isSinistro
          ? { data_retorno_sinistro: novaData, horario_retorno_sinistro: novoHorario, atualizado_em: new Date().toISOString() }
          : { data_retorno: novaData, horario_retorno: novoHorario, atualizado_em: new Date().toISOString() };

        const { error: dbError } = await supabase.from('tab_clientes').update(updateData).eq('id', clienteId);
        if (dbError) throw dbError;
        toast.success(`${isSinistro ? 'Sinistro' : 'Retorno'} atualizado!`);
      }
    } catch {
      toast.error('Falha ao salvar alteração');
      info.revert();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 mt-4">
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
              {googleConectado ? 'Sincronização com Google ativa' : 'Gerencie seus agendamentos'}
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

          {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA' || tipoUsuario === 'CORRETOR') && (
            <button
              onClick={handleGoogleAuth}
              disabled={loadingGoogle}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${googleConectado ? 'bg-white dark:bg-zinc-800 text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-50' : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow'}`}
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
                  <span>{tipoUsuario === 'CORRETOR' ? 'Google Calendar' : 'Google Master'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full md:w-[400px]">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, CNPJ, telefone, e-mail..."
              value={termoBusca}
              onChange={e => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {termoBusca && (
              <button onClick={() => setTermoBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X size={16} />
              </button>
            )}
          </div>

          {termoBusca.trim().length >= 2 && resultadosBuscaGlobal.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                Registros Encontrados ({resultadosBuscaGlobal.length})
              </div>
              {resultadosBuscaGlobal.map(evt => {
                const dataFormatada = new Date(evt.start).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={evt.id} onClick={() => handleSelecionarResultadoBusca(evt)} className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 dark:hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800/40 last:border-none">
                    <div className="truncate mr-2">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{evt.title}</p>
                      <p className="text-[10px] text-zinc-400">Fase: <span className="font-semibold text-blue-600 dark:text-blue-400">{evt.extendedProps.fase}</span></p>
                    </div>
                    <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">{dataFormatada}</span>
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
                    {corretoresSelecionados.length === 0 ? 'Nenhum selecionado' : `Filtrando por (${corretoresSelecionados.length})`}
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
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${corretoresSelecionados.length === listaCorretores.length + 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                      {corretoresSelecionados.length === listaCorretores.length + 1 && <Check size={12} />}
                    </div>
                    <span>{corretoresSelecionados.length === listaCorretores.length + 1 ? 'Desmarcar Todos' : 'Selecionar Toda a Equipe'}</span>
                  </button>

                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                    <label onClick={() => toggleCorretor(usuarioLogado?.id)} className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${corretoresSelecionados.includes(usuarioLogado?.id || '') ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                        {corretoresSelecionados.includes(usuarioLogado?.id || '') && <Check size={12} />}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Agendamentos da Casa</span>
                        <span className="text-[10px] text-zinc-400">Atendimentos diretos</span>
                      </div>
                    </label>

                    {listaCorretores.map(corretor => {
                      const isSelected = corretoresSelecionados.includes(corretor.id);
                      return (
                        <label key={corretor.id} onClick={() => toggleCorretor(corretor.id)} className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{corretor.nome}</span>
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
          editable={true}
          eventDrop={handleEventChange}
          eventClick={handleEventClick}
          eventContent={info => {
            const { origem, fase, tipo, status, horario, corretorId } = info.event.extendedProps;
            const nomeDoCorretor = listaCorretores.find(c => c.id === corretorId)?.nome || 'Ag. Casa';

            let colorClasses = 'bg-purple-50 border-purple-500 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
            if (fase === 'QUALIFICADO') {
              colorClasses = 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
            } else if (fase === 'NEGOCIACAO') {
              colorClasses = 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
            } else if (fase === 'PERDIDO') {
              colorClasses = 'bg-red-50 border-red-500 text-red-800 dark:bg-red-950/40 dark:text-red-300';
            } else if (fase === 'CLIENTE') {
              colorClasses = 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
            } else if (fase === 'PROSPECT') {
              colorClasses = 'bg-zinc-900 border-black text-white dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100';
            } else if (origem === 'SINISTRO') {
              colorClasses = 'bg-red-50 border-red-500 text-red-700';
            } else if (origem === 'RENOVACAO') {
              colorClasses = 'bg-amber-50 border-amber-500 text-amber-700';
            }

            const tagBg = 'bg-black/10 text-current';

            return (
              <div className={`flex flex-col p-1.5 rounded-lg border-l-4 shadow-sm hover:scale-[1.02] transition-transform ${colorClasses}`}>
                <div className="flex items-center justify-between mb-1 border-b border-black/10 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">
                    {fase || 'LEAD'}
                  </span>
                  {(tipoUsuario === 'ADMIN' || tipoUsuario === 'CORRETORA') && (
                    <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold truncate max-w-[60px] text-right ${tagBg}`}>
                      {nomeDoCorretor}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold leading-tight mb-1">{info.event.title}</span>
                <div className="mt-1 flex flex-col gap-0.5 text-[9px] leading-tight opacity-90">
                  {tipo && <div className="flex justify-between"><span className="font-bold opacity-75">Tipo:</span><span>{tipo}</span></div>}
                  {horario && <div className="flex justify-between"><span className="font-bold opacity-75">Retorno:</span><span>{horario}</span></div>}
                  {status && status !== '-' && <div className="flex justify-between"><span className="font-bold opacity-75">Status:</span><span className="truncate ml-1">{status}</span></div>}
                </div>
              </div>
            );
          }}
        />
      </div>

      {isModalClienteOpen && (
        <ModalCadastroCliente
          isOpen={isModalClienteOpen}
          onClose={() => setIsModalClienteOpen(false)}
          usuarioLogado={usuarioLogado}
          corretoresDisponiveis={listaCorretores}
          handleSubmit={async (payloadCliente: any, abrirAcaoComercial?: boolean) => {
            try {
              // 1. Chama a função que salva no Supabase (que você mostrou do service)
              const novoCliente = await criarClienteV2(payloadCliente);
              
              toast.success('Cliente cadastrado com sucesso!');
              setIsModalClienteOpen(false);
              
              // 2. Se o usuário clicou em "Cadastrar e Criar Oportunidade", 
              // você pode abrir o modal de ação comercial usando os dados do cliente recém-criado:
              if (abrirAcaoComercial && novoCliente) {
                setClienteAcoesSelecionado(novoCliente);
                setModalAcoesAberto(true);
              }
              
              // Atualiza a lista/agenda se necessário
              fetchCompromissos();
            } catch (error) {
              console.error('Erro ao salvar cliente:', error);
              toast.error('Erro ao cadastrar cliente. Verifique os dados.');
            }
          }}
          onSuccess={() => {
            setIsModalClienteOpen(false);
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

      {modalRenovAberto && (
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
            toast.success('Agenda atualizada!');
          }}
        />
      )}

      {eventoAvulsoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl relative space-y-4">
            <button onClick={() => setEventoAvulsoSelecionado(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white border-b pb-2 border-zinc-100 dark:border-zinc-800">
              Detalhes do Contato Avulso
            </h3>
            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <p><strong>Nome:</strong> {eventoAvulsoSelecionado.nome}</p>
              {eventoAvulsoSelecionado.telefone && <p><strong>Telefone:</strong> {eventoAvulsoSelecionado.telefone}</p>}
              {eventoAvulsoSelecionado.email && <p><strong>E-mail:</strong> {eventoAvulsoSelecionado.email}</p>}
              {eventoAvulsoSelecionado.produto_interesse && <p><strong>Produto:</strong> {eventoAvulsoSelecionado.produto_interesse}</p>}
              {eventoAvulsoSelecionado.breve_descricao && <p><strong>Descrição:</strong> {eventoAvulsoSelecionado.breve_descricao}</p>}
            </div>
            <button onClick={() => setEventoAvulsoSelecionado(null)} className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">
              Fechar
            </button>
          </div>
        </div>
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
    </div>
  );
}