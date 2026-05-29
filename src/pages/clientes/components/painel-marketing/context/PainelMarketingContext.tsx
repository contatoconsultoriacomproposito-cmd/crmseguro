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
}

interface ClientePublico {
  id?: string;
  nome: string;
  email: string;
  telefone_whats?: string | null;
  origem: 'crm' | 'qualificado_frio' | 'qualificado_morno' | 'qualificado_quente' | 'csv';
  tipo_cliente?: string;
  nome_fantasia?: string | null;
}

interface PainelContextType {
  campanhas: Campanha[];
  disparos: Disparo[];
  auditoria: LogAuditoria[];
  campanhaSelecionada: Campanha | null;
  disparoSelecionado: Disparo | null;
  clienteAuditoriaSelecionado: LogAuditoria | null;
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

  // Estados principais de dados
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [auditoria, setAuditoria] = useState<LogAuditoria[]>([]);
  
  // Estado de listas da Linha 1
  const [clientesCRM, setClientesCRM] = useState<ClientePublico[]>([]);
  const [clientesQualificados, setClientesQualificados] = useState<ClientePublico[]>([]);
  const [clientesCSV, setClientesCSV] = useState<ClientePublico[]>([]);
  
  // Navegação e Seleção
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  const [disparoSelecionado, setDisparoSelecionado] = useState<Disparo | null>(null);
  const [clienteAuditoriaSelecionado, setClienteAuditoriaSelecionado] = useState<LogAuditoria | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'crm' | 'qualificados' | 'csv'>('crm');
  const [subAbaQualificados, setSubAbaQualificados] = useState<'frio' | 'morno' | 'quente'>('morno');
  const [idsLeadsSelecionados, setIdsLeadsSelecionados] = useState<string[]>([]);

  // Loadings estritos
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);
  const [loadingDisparos, setLoadingDisparos] = useState(false);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [enviandoDisparo, setEnviandoDisparo] = useState(false);

  // ------------------------------------------------------------------
  // 1. CARREGAR CAMPANHAS (MÃES)
  // ------------------------------------------------------------------
  const carregarCampanhas = async () => {
    if (!userProfile) return;
    const currentCorretoraId = userProfile.corretora_id;
    const isIndividual = userProfile.tipo_usuario === 'CORRETOR';

    setLoadingCampanhas(true);
    try {
      let query = supabase.from('tab_campanhas').select('*').eq('corretora_id', currentCorretoraId);
      if (isIndividual) {
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
    if (userProfile) {
      carregarCampanhas();
    }
  }, [userProfile]);

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
          .eq('campanha_id', campanhaSelecionada.id)
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
  // 3. CARREGAR AUDITORIA FINA (REALTIME AUTOMÁTICO CORRIGIDO)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!disparoSelecionado) {
      setAuditoria([]);
      setClienteAuditoriaSelecionado(null);
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

    // SINTAXE CORRIGIDA: Filtro estrito sem espaços para o canal realtime do Supabase
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
          setClienteAuditoriaSelecionado((atualCard) => 
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
  // 4. CARREGAR PÚBLICOS ALVO
  // ------------------------------------------------------------------
  useEffect(() => {
    const carregarLeadsEClientes = async () => {
      if (!userProfile) return;
      
      const targetCorretoraId = userProfile.corretora_id;
      const isIndividual = userProfile.tipo_usuario === 'CORRETOR';

      if (!targetCorretoraId) return;
      setLoadingClientes(true);

      try {
        let queryLeads = supabase
          .from('tab_clientes')
          .select('id, nome, razao_social, nome_fantasia, email, telefone_whats, temperatura, tipo_cliente, corretor_id')
          .eq('corretora_id', targetCorretoraId)
          .not('email', 'is', null)
          .neq('email', '');

        if (isIndividual) {
          queryLeads = queryLeads.eq('corretor_id', userProfile.id);
        }

        const { data: clientesDoBanco, error: errLeads } = await queryLeads;
        if (errLeads) throw errLeads;

        const baseMkt = clientesDoBanco || [];

        const formatadosCRM: ClientePublico[] = baseMkt.map(c => {
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

        const qualificados: ClientePublico[] = baseMkt.map(c => {
          const nomeExibicao = c.nome?.trim() || c.nome_fantasia?.trim() || c.razao_social?.trim() || 'Cliente Sem Nome';
          
          let origemTermometria: 'qualificado_frio' | 'qualificado_morno' | 'qualificado_quente' = 'qualificado_morno';
          if (c.temperatura === 'frio') origemTermometria = 'qualificado_frio';
          if (c.temperatura === 'quente') origemTermometria = 'qualificado_quente';

          return {
            id: c.id,
            nome: nomeExibicao,
            email: c.email.trim().toLowerCase(),
            telefone_whats: c.telefone_whats,
            origem: origemTermometria,
            tipo_cliente: c.tipo_cliente,
            nome_fantasia: c.nome_fantasia
          };
        });
        setClientesQualificados(qualificados);

      } catch (err: any) {
        console.error('Erro ao catalogar públicos do CRM:', err.message);
      } finally {
        setLoadingClientes(false);
      }
    };

    carregarLeadsEClientes();
  }, [userProfile]);

  // ------------------------------------------------------------------
  // 5. MEMO DE FILTRAGEM
  // ------------------------------------------------------------------
  const clientesFiltrados = useMemo(() => {
    if (abaAtiva === 'crm') return clientesCRM;
    if (abaAtiva === 'csv') return clientesCSV;
    if (abaAtiva === 'qualificados') {
      return clientesQualificados.filter(c => c.origem === `qualificado_${subAbaQualificados}`);
    }
    return [];
  }, [abaAtiva, subAbaQualificados, clientesCRM, clientesQualificados, clientesCSV]);

  useEffect(() => {
    setIdsLeadsSelecionados([]);
  }, [abaAtiva, subAbaQualificados]);

  // ------------------------------------------------------------------
  // 6. GERENCIADORES DE CHECKBOX CONTROLE GLOBAL
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 7. DISPARAR CAMPANHA (EXECUÇÃO DA EDGE FUNCTION)
  // ------------------------------------------------------------------
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

      const alvosFinais = clientesFiltrados.filter(c => 
        abaAtiva === 'csv' ? idsLeadsSelecionados.includes(c.email) : idsLeadsSelecionados.includes(c.id || '')
      );

      const payload = {
        campanha_id: campanhaSelecionada.id,
        nome_evento: campanhaSelecionada.nome_evento,
        mensagem_email: campanhaSelecionada.mensagem_email,
        url_arte_storage: campanhaSelecionada.url_arte_storage,
        destinatarios: alvosFinais,
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

    } catch (err: any) {
      toast.error('Falha crítica no disparo: ' + err.message);
    } finally {
      setEnviandoDisparo(false);
    }
  };

  return (
    <PainelMarketingContext.Provider value={{
      campanhas, disparos, auditoria, campanhaSelecionada, disparoSelecionado, clienteAuditoriaSelecionado,
      abaAtiva, subAbaQualificados, clientesFiltrados, idsLeadsSelecionados,
      clientesCRM, clientesQualificados, clientesCSV,
      loadingCampanhas, loadingDisparos, loadingAuditoria, loadingClientes, enviandoDisparo,
      setCampanhaSelecionada, setDisparoSelecionado, setClienteAuditoriaSelecionado,
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