import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../../lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '../../../../../auth/AuthContext';

// ====================================================================
// INTERFACES E TIPAGENS
// ====================================================================
export interface Campanha {
  id: string;
  nome_evento: string;
  tipo_evento: 'fixo' | 'aniversario';
  mensagem_email: string | null;
  url_arte_storage: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretor_id: string | null;
}

export interface Disparo {
  id: string;
  campanha_id: string;
  corretora_id: string;
  corretor_id: string | null;
  data_disparo: string;
  total_enviados: number;
}

export interface DadosCadastraisExtra {
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  telefone_whats?: string | null;
  ddd_telefone_1?: string | null;
  telefone_adicional?: string | null;
  nomes_socios?: string | null;
  tabela_origem?: 'tab_clientes' | 'tab_clientes_frios' | null;
}

// Interface restaurada com a propriedade opcional para sanar os erros do compilador
export interface LogAuditoria {
  id: string;
  id_disparo: string;
  id_campanha: string;
  nome_cliente: string;
  email_cliente: string;
  tipo_cliente: string;
  nome_fantasia: string | null;
  status_entrega: string;
  abriu_email: boolean;
  clicou_whatsapp: boolean;
  clicou_responder: boolean;
  solicitou_descadastro: boolean;
  cadastrado_no_sistema: boolean;
  ultimo_evento_em: string;
  criado_em: string;
  resend_id: string | null;
  dadosCadastrais?: DadosCadastraisExtra; // Reativado para o Linha2Coluna3Auditoria funcionar
}

interface ClientePublico {
  id?: string;
  nome: string;
  email: string;
  telefone_whats?: string | null;
  origem: 'crm' | 'qualificado_frio' | 'qualificado_morno' | 'qualificado_quente' | 'csv';
  tipo_cliente?: string;
  nome_fantasia?: string | null;
  temperatura?: 'frio' | 'morno' | 'quente';
}

interface PainelContextType {
  campanhas: Campanha[];
  disparos: Disparo[];
  auditoria: LogAuditoria[];
  campanhaSelecionada: Campanha | null;
  disparoSelecionado: Disparo | null;
  clienteAuditoriaSelecionado: LogAuditoria | null; // Continua expondo a tipagem com dados cadastrais inclusos
  dadosExtrasInspecionados: DadosCadastraisExtra | null; 
  loadingDadosExtras: boolean; 
  abaAtiva: 'crm' | 'qualificados' | 'csv';
  subAbaQualificados: 'frio' | 'morno' | 'quente';
  clientesFiltrados: ClientePublico[];
  idsLeadsSelecionados: string[];
  clientesCRM: ClientePublico[];
  clientesQualificados: ClientePublico[];
  clientesCSV: ClientePublico[];
  loadingCampanhas: boolean;
  loadingDisparos: boolean;
  loadingAuditoria: boolean;
  loadingClientes: boolean;
  enviandoDisparo: boolean;
  setCampanhaSelecionada: (c: Campanha | null) => void;
  setDisparoSelecionado: (d: Disparo | null) => void;
  setClienteAuditoriaSelecionado: (l: LogAuditoria | null) => void;
  selecionarEInspecionarCliente: (log: LogAuditoria) => Promise<void>;
  fecharInspecao: () => void; 
  setAbaAtiva: (aba: 'crm' | 'qualificados' | 'csv') => void;
  setSubAbaQualificados: (sub: 'frio' | 'morno' | 'quente') => void;
  setClientesCSV: (lista: ClientePublico[]) => void;
  toggleSelecionarCliente: (identificador: string) => void;
  toggleSelecionarTodos: (marcarTodos: boolean) => void;
  limparSelecao: () => void;
  carregarCampanhas: () => Promise<void>;
  dispararCampanhaLote: () => Promise<void>;
}

const PainelMarketingContext = createContext<PainelContextType | undefined>(undefined);

// ====================================================================
// PROVIDER CENTRAL
// ====================================================================
export const PainelMarketingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();

  const idCorretoraReal = userProfile?.corretora_id;
  const isIndividual = userProfile?.tipo_usuario === 'CORRETOR';

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [auditoria, setAuditoria] = useState<LogAuditoria[]>([]);
  
  const [clientesCRM, setClientesCRM] = useState<ClientePublico[]>([]);
  const [clientesQualificados, setClientesQualificados] = useState<ClientePublico[]>([]);
  const [clientesCSV, setClientesCSV] = useState<ClientePublico[]>([]);
  
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  const [disparoSelecionado, setDisparoSelecionado] = useState<Disparo | null>(null);
  
  // Estados Internos de Controle Cadastral
  const [rawClienteAuditoria, setRawClienteAuditoria] = useState<LogAuditoria | null>(null);
  const [dadosExtrasInspecionados, setDadosExtrasInspecionados] = useState<DadosCadastraisExtra | null>(null);
  const [loadingDadosExtras, setLoadingDadosExtras] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState<'crm' | 'qualificados' | 'csv'>('crm');
  const [subAbaQualificados, setSubAbaQualificados] = useState<'frio' | 'morno' | 'quente'>('morno');
  const [idsLeadsSelecionados, setIdsLeadsSelecionados] = useState<string[]>([]);

  const [loadingCampanhas, setLoadingCampanhas] = useState(false);
  const [loadingDisparos, setLoadingDisparos] = useState(false);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [enviandoDisparo, setEnviandoDisparo] = useState(false);

  // Montagem Dinâmica e Reativa do objeto esperado pela sua View (Adeus erros do TS!)
  const clienteAuditoriaSelecionado = useMemo(() => {
    if (!rawClienteAuditoria) return null;
    return {
      ...rawClienteAuditoria,
      dadosCadastrais: dadosExtrasInspecionados || undefined
    };
  }, [rawClienteAuditoria, dadosExtrasInspecionados]);

  const fecharInspecao = () => {
    setRawClienteAuditoria(null);
    setDadosExtrasInspecionados(null);
    setLoadingDadosExtras(false);
  };

  // Função externa exposta para manipulação manual caso necessário
  const setClienteAuditoriaSelecionado = (log: LogAuditoria | null) => {
    if (!log) {
      fecharInspecao();
    } else {
      setRawClienteAuditoria(log);
    }
  };

  // ------------------------------------------------------------------
  // FUNÇÃO EXCLUSIVA: ENRIQUECER DADOS (CORRIGIDA CONTRA DUPLICADOS)
  // ------------------------------------------------------------------
  const selecionarEInspecionarCliente = async (log: any) => {
    setRawClienteAuditoria(log);
    setLoadingDadosExtras(true);
    setDadosExtrasInspecionados(null); // Limpa busca anterior

    try {
      let dados = null;
      const emailBusca = log.email_cliente ? log.email_cliente.trim() : '';
      const corretoraIdFiltro = log.corretora_id || idCorretoraReal;

      if (log.cadastrado_no_sistema) {
        // Busca na tabela de clientes ativos
        const { data, error } = await supabase
          .from('tab_clientes')
          .select('*')
          .ilike('email', emailBusca)
          .eq('corretora_id', corretoraIdFiltro)
          .limit(1); // Retorna um array de no máximo 1 elemento em vez de quebrar

        if (error) throw error;
        // Como o .limit(1) retorna uma lista, pegamos a posição [0]
        if (data && data.length > 0) {
          dados = { ...data[0], tabela_origem: 'tab_clientes' };
        }
      } else {
        // Busca na tabela de clientes frios
        const { data, error } = await supabase
          .from('tab_clientes_frios')
          .select('*')
          .ilike('email', emailBusca)
          .eq('corretora_id', corretoraIdFiltro)
          .order('importado_em', { ascending: false }) // Se houver duplicado, traz o mais recente primeiro
          .limit(1); // Impede o erro PGRST116

        if (error) throw error;
        // Como o .limit(1) retorna uma lista, pegamos a posição [0]
        if (data && data.length > 0) {
          dados = { ...data[0], tabela_origem: 'tab_clientes_frios' };
        }
      }

      setDadosExtrasInspecionados(dados);

    } catch (error) {
      console.error("Erro ao buscar dados adicionais:", error);
      toast.error("Erro ao carregar dados complementares do lead.");
    } finally {
      setLoadingDadosExtras(false);
    }
  };

  // ------------------------------------------------------------------
  // 1. CARREGAR CAMPANHAS (MÃES)
  // ------------------------------------------------------------------
  const carregarCampanhas = async () => {
    if (!idCorretoraReal) return;

    setLoadingCampanhas(true);
    try {
      let query = supabase.from('tab_campanhas').select('*').eq('corretora_id', idCorretoraReal);
      if (isIndividual && userProfile) {
        query = query.eq('corretor_id', userProfile.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setCampanhas(data || []);
    } catch (err: any) {
      toast.error('Erro ao buscar campanhas: ' + err.message);
    } finally {
      setLoadingCampanhas(false);
    }
  };

  useEffect(() => {
    if (idCorretoraReal) {
      carregarCampanhas();
    }
  }, [idCorretoraReal]);

  // ------------------------------------------------------------------
  // 2. CARREGAR DISPAROS (FILHOS) AO SELECIONAR UMA CAMPANHA
  // ------------------------------------------------------------------
  useEffect(() => {
    const carregarDisparos = async () => {
      if (!campanhaSelecionada) {
        setDisparos([]);
        setDisparoSelecionado(null);
        return;
      }
      setLoadingDisparos(true);
      try {
        const { data, error } = await supabase
          .from('tab_campanhas_disparos')
          .select('*')
          .eq('campanha_id', campanhaSelecionada.id) // Corrigido erro de digitação antigo
          .order('data_disparo', { ascending: false });
          
        if (error) throw error;
        setDisparos(data || []);
        setDisparoSelecionado(null);
      } catch (err: any) {
        toast.error('Erro ao listar disparos: ' + err.message);
      } finally {
        setLoadingDisparos(false);
      }
    };
    carregarDisparos();
  }, [campanhaSelecionada]);

  // ------------------------------------------------------------------
  // 3. CARREGAR AUDITORIA FINA (REALTIME AUTOMÁTICO PROTEGIDO)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!disparoSelecionado) {
      setAuditoria([]);
      fecharInspecao();
      return;
    }

    const carregarAuditoriaInicial = async () => {
      setLoadingAuditoria(true);
      try {
        console.log("🕵️‍♂️ Buscando auditoria para o ID de disparo:", disparoSelecionado.id);  
        const { data, error } = await supabase
          .from('tab_campanhas_emails_detalhe')
          .select('*')
          .eq('id_disparo', disparoSelecionado.id)
          .order('nome_cliente', { ascending: true });

        if (error) throw error;
        setAuditoria(data || []);
      } catch (err: any) {
        toast.error('Erro ao ler logs de auditoria: ' + err.message);
      } finally {
        setLoadingAuditoria(false);
      }
    };

    carregarAuditoriaInicial();

    const canalAuditoria = supabase
      .channel(`audi_lote_${disparoSelecionado.id}`)
      .on(
        'postgres_changes' as any,
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tab_campanhas_emails_detalhe', 
          filter: `id_disparo=eq.${disparoSelecionado.id}` 
        },
        (payload: any) => {
          setAuditoria((atual) =>
            atual.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
          );
          // Atualiza o estado cru sem interferir na propriedade computada de dados extras
          setRawClienteAuditoria((atualCard) => 
            atualCard && atualCard.id === payload.new.id ? { ...atualCard, ...payload.new } : atualCard
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalAuditoria);
    };
  }, [disparoSelecionado]);

  // ------------------------------------------------------------------
  // 4. CARREGAR PÚBLICOS ALVO (CRM TRADICIONAL + TERMOMETRIA)
  // ------------------------------------------------------------------
  useEffect(() => {
    const carregarLeadsEClientes = async () => {
      if (!idCorretoraReal) return;
      setLoadingClientes(true);

      try {
        let queryLeads = supabase
          .from('tab_clientes')
          .select('id, nome, razao_social, nome_fantasia, email, telefone_whats, tipo_cliente, corretor_id')
          .eq('corretora_id', idCorretoraReal)
          .not('email', 'is', null)
          .neq('email', '');

        if (isIndividual && userProfile) {
          queryLeads = queryLeads.eq('corretor_id', userProfile.id);
        }

        const { data: clientesDoBanco, error: errLeads } = await queryLeads;
        if (errLeads) throw errLeads;

        const formatadosCRM: ClientePublico[] = (clientesDoBanco || []).map(c => {
          const nomeExibicao = c.nome?.trim() || c.nome_fantasia?.trim() || c.razao_social?.trim() || 'Cliente Sem Nome';
          return {
            id: c.id,
            nome: nomeExibicao,
            email: c.email.trim().toLowerCase(),
            telefone_whats: c.telefone_whats,
            origem: 'crm',
            tipo_cliente: c.tipo_cliente,
            nome_fantasia: c.nome_fantasia
          };
        });
        setClientesCRM(formatadosCRM);

        let queryLogs = supabase
          .from('tab_campanhas_emails_detalhe')
          .select('id, nome_cliente, email_cliente, status_entrega, abriu_email, clicou_whatsapp, clicou_responder, nome_fantasia, tipo_cliente')
          .eq('corretora_id', idCorretoraReal);

        if (isIndividual && userProfile) {
          queryLogs = queryLogs.eq('corretor_id', userProfile.id);
        }

        const { data: logsDeEnvio, error: errLogs } = await queryLogs;
        if (errLogs) throw errLogs;

        const leadsMapeados: ClientePublico[] = (logsDeEnvio || []).map((log) => {
          let tempCalculada: 'frio' | 'morno' | 'quente' = 'frio';

          if (log.clicou_whatsapp || log.clicou_responder) {
            tempCalculada = 'quente';
          } else if (log.status_entrega === 'entregue') {
            tempCalculada = 'morno';
          } else {
            tempCalculada = 'frio';
          }

          return {
            id: log.id,
            nome: log.nome_cliente || 'Cliente',
            email: log.email_cliente.trim().toLowerCase(),
            telefone_whats: 'Via E-mail',
            origem: `qualificado_${tempCalculada}` as any,
            tipo_cliente: log.tipo_cliente || 'PF',
            nome_fantasia: log.nome_fantasia,
            temperatura: tempCalculada
          };
        });

        const dicionarioUnico: { [email: string]: ClientePublico } = {};
        leadsMapeados.forEach((lead) => {
          const existente = dicionarioUnico[lead.email];
          if (!existente) {
            dicionarioUnico[lead.email] = lead;
          } else {
            if (lead.temperatura === 'quente' && existente.temperatura !== 'quente') {
              dicionarioUnico[lead.email] = lead;
            } else if (lead.temperatura === 'morno' && existente.temperatura === 'frio') {
              dicionarioUnico[lead.email] = lead;
            }
          }
        });

        setClientesQualificados(Object.values(dicionarioUnico));

      } catch (err: any) {
        console.error('Erro ao catalogar públicos por termometria de logs:', err.message);
      } finally {
        setLoadingClientes(false);
      }
    };

    carregarLeadsEClientes();
  }, [userProfile, idCorretoraReal]);

  const clientesFiltrados = useMemo(() => {
    if (abaAtiva === 'crm') return clientesCRM;
    if (abaAtiva === 'csv') return clientesCSV;
    if (abaAtiva === 'qualificados') {
      return clientesQualificados.filter(c => c.temperatura === subAbaQualificados);
    }
    return [];
  }, [abaAtiva, subAbaQualificados, clientesCRM, clientesQualificados, clientesCSV]);

  useEffect(() => {
    setIdsLeadsSelecionados([]);
  }, [abaAtiva, subAbaQualificados]);

  const toggleSelecionarCliente = (idOuEmail: string) => {
    setIdsLeadsSelecionados(atual =>
      atual.includes(idOuEmail) ? atual.filter(i => i !== idOuEmail) : [...atual, idOuEmail]
    );
  };

  const toggleSelecionarTodos = (marcarTodos: boolean) => {
    if (!marcarTodos) {
      setIdsLeadsSelecionados([]);
      return;
    }
    const chaves = clientesFiltrados.map(c => (abaAtiva === 'csv' ? c.email : (c.id || '')));
    setIdsLeadsSelecionados(chaves);
  };

  const limparSelecao = () => setIdsLeadsSelecionados([]);

  const dispararCampanhaLote = async () => {
    if (!userProfile) return;
    if (!campanhaSelecionada) {
      toast.warning('Por favor, selecione uma campanha na linha 2 antes de disparar.');
      return;
    }
    if (idsLeadsSelecionados.length === 0) {
      toast.warning('Nenhum destinatário está selecionado para receber o disparo.');
      return;
    }

    setEnviandoDisparo(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tokenJWT = sessionData.session?.access_token || '';

      const alvosFiltradosDoEstado = clientesFiltrados.filter(c => 
        abaAtiva === 'csv' ? idsLeadsSelecionados.includes(c.email) : idsLeadsSelecionados.includes(c.id || '')
      );

      const dicionarioFiltro: { [email: string]: any } = {};
      alvosFiltradosDoEstado.forEach(item => {
        dicionarioFiltro[item.email.trim().toLowerCase()] = item;
      });
      const alvosFinaisSemDuplicados = Object.values(dicionarioFiltro);

      const payload = {
        campanha_id: campanhaSelecionada.id,
        nome_evento: campanhaSelecionada.nome_evento,
        mensagem_email: campanhaSelecionada.mensagem_email,
        url_arte_storage: campanhaSelecionada.url_arte_storage,
        destinatarios: alvosFinaisSemDuplicados,
        userProfile: {
          id: userProfile.id,
          corretora_id: userProfile.corretora_id
        }
      };

      const baseUrl = (supabase as any).supabaseUrl;
      const response = await fetch(`${baseUrl}/functions/v1/disparar-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenJWT}`
        },
        body: JSON.stringify(payload)
      });

      const respostaDoDisparo = await response.json();

      if (!response.ok) {
        throw new Error(respostaDoDisparo.error || 'Erro desconhecido na execução da Edge Function.');
      }

      toast.success(`Lote enviado com sucesso! ${respostaDoDisparo.total_enviados} e-mails processados.`);
      
      const { data: novosDisparos } = await supabase
        .from('tab_campanhas_disparos')
        .select('*')
        .eq('campanha_id', campanhaSelecionada.id)
        .order('data_disparo', { ascending: false });
      
      if (novosDisparos) setDisparos(novosDisparos);
      
      setIdsLeadsSelecionados([]);
      if (abaAtiva === 'csv') setClientesCSV([]);

      let queryRefresh = supabase
        .from('tab_campanhas_emails_detalhe')
        .select('id, nome_cliente, email_cliente, status_entrega, abriu_email, clicou_whatsapp, clicou_responder, nome_fantasia, tipo_cliente')
        .eq('corretora_id', idCorretoraReal);

      if (isIndividual) {
        queryRefresh = queryRefresh.eq('corretor_id', userProfile.id);
      }
      const { data: logRefresh } = await queryRefresh;
      if (logRefresh) {
        const leadsMapeados = logRefresh.map((log) => {
          let tempCalculada: 'frio' | 'morno' | 'quente' = 'frio';
          if (log.clicou_whatsapp || log.clicou_responder) tempCalculada = 'quente';
          else if (log.status_entrega === 'entregue') tempCalculada = 'morno';
          return {
            id: log.id,
            nome: log.nome_cliente || 'Cliente',
            email: log.email_cliente.trim().toLowerCase(),
            telefone_whats: 'Via E-mail',
            origem: `qualificado_${tempCalculada}` as any,
            tipo_cliente: log.tipo_cliente || 'PF',
            nome_fantasia: log.nome_fantasia,
            temperatura: tempCalculada
          };
        });
        const dic: { [email: string]: ClientePublico } = {};
        leadsMapeados.forEach(l => {
          const e = dic[l.email];
          if (!e || (l.temperatura === 'quente' && e.temperatura !== 'quente') || (l.temperatura === 'morno' && e.temperatura === 'frio')) {
            dic[l.email] = l;
          }
        });
        setClientesQualificados(Object.values(dic));
      }

    } catch (err: any) {
      toast.error('Falha crítica no disparo: ' + err.message);
    } finally {
      setEnviandoDisparo(false);
    }
  };

  return (
    <PainelMarketingContext.Provider value={{
      campanhas, disparos, auditoria, campanhaSelecionada, disparoSelecionado, clienteAuditoriaSelecionado,
      dadosExtrasInspecionados, loadingDadosExtras,
      abaAtiva, subAbaQualificados, clientesFiltrados, idsLeadsSelecionados,
      clientesCRM, clientesQualificados, clientesCSV,
      loadingCampanhas, loadingDisparos, loadingAuditoria, loadingClientes, enviandoDisparo,
      setCampanhaSelecionada, setDisparoSelecionado, setClienteAuditoriaSelecionado,
      selecionarEInspecionarCliente, fecharInspecao,
      setAbaAtiva, setSubAbaQualificados, setClientesCSV,
      toggleSelecionarCliente, toggleSelecionarTodos, limparSelecao,
      carregarCampanhas, dispararCampanhaLote
    }}>
      {children}
    </PainelMarketingContext.Provider>
  );
};

export const usePainelMarketing = () => {
  const context = useContext(PainelMarketingContext);
  if (context === undefined) {
    throw new Error('usePainelMarketing deve ser usado dentro de um PainelMarketingProvider');
  }
  return context;
};

export type { ClientePublico };