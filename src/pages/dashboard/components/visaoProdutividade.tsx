import { useMemo, useState, useEffect } from 'react';
import { 
  MessageCircle, Phone, Mail, Monitor, 
  MapPin, TrendingUp, UserCheck, Users, Calendar, Filter, Loader2, User,
  Briefcase, Download, Clock, ChevronDown, ChevronUp, FileText,
  Flame, CheckCircle, HelpCircle,
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface VisaoProdutividadeProps {
  corretoraId: string; 
  corretoresLista: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

type TabType = 'carteira' | 'importados' | 'avulsos';

export default function VisaoProdutividade({ 
  corretoraId, 
  corretoresLista,
  userLevel,
  userId
}: VisaoProdutividadeProps) {

  const [activeTab, setActiveTab] = useState<TabType>('carteira');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cache por Aba
  const [interacoesCarteira, setInteracoesCarteira] = useState<any[] | null>(null);
  
  // Para Importados: Ações passadas + Cadastro do cliente frio
  const [acoesImportados, setAcoesImportados] = useState<any[] | null>(null);
  const [clientesFriosLista, setClientesFriosLista] = useState<any[] | null>(null);

  const [clientesAvulsos, setClientesAvulsos] = useState<any[] | null>(null);

  // Estado para expandir cliente na Aba 3
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);

  // 👉 ADICIONE ESTE NOVO ESTADO PARA A ABA 2 (IMPORTADOS):
  const [expandedClienteImportadoId, setExpandedClienteImportadoId] = useState<string | null>(null);

  // Estado para controlar o limite do Top Clientes na Aba 2 (Importados)
  const [topLimitImportados, setTopLimitImportados] = useState<number>(20);

  // Filtros Globais
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  const [corretorLocal, setCorretorLocal] = useState(
    userLevel?.toUpperCase() === 'CORRETOR' ? userId : 'todos'
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
      setCorretorLocal(userId);
    }
  }, [userId, userLevel]);

  // Limpa os caches quando os filtros globais mudam
  useEffect(() => {
    setInteracoesCarteira(null);
    setAcoesImportados(null);
    setClientesFriosLista(null);
    setClientesAvulsos(null);
  }, [dataInicio, dataFim, corretorLocal]);

  // Busca a data da primeira interação para inicializar o calendário
  useEffect(() => {
    async function buscarPrimeiraInteracao() {
      if (!corretoraId) return;
      
      let query = supabase
        .from('tab_interacoes')
        .select('data_historico')
        .eq('corretora_id', corretoraId);

      if (userLevel?.toUpperCase() === 'CORRETOR' && userId) {
        query = query.eq('corretor_id', userId);
      }

      const { data, error } = await query
        .order('data_historico', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data?.data_historico) {
        setDataInicio(data.data_historico);
      } else {
        setDataInicio(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraInteracao();
  }, [corretoraId, userLevel, userId]);

  // BUSCA DE DADOS CONFORME A ABA ATIVA
  useEffect(() => {
    async function fetchData() {
      if (!corretoraId || !dataInicio) return;

      const filtroCorretorFinal = userLevel?.toUpperCase() === 'CORRETOR' ? userId : corretorLocal;

      setLoading(true);
      try {
        if (activeTab === 'carteira' && interacoesCarteira === null) {
          let query = supabase
            .from('tab_interacoes') 
            .select(`
              *,
              tab_clientes ( nome )
            `)
            .eq('corretora_id', corretoraId)
            .gte('data_historico', dataInicio)
            .lte('data_historico', dataFim);

          if (filtroCorretorFinal === 'casa') {
            query = query.eq('corretor_id', corretoraId);
          } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
            query = query.eq('corretor_id', filtroCorretorFinal);
          }

          const { data, error } = await query;
          if (error) throw error;
          setInteracoesCarteira(data || []);

        } else if (activeTab === 'importados' && (acoesImportados === null || clientesFriosLista === null)) {
          // 1. Busca Ações Passadas
          let queryAcoes = supabase
            .from('tab_clientes_frios_acoes')
            .select(`
              *,
              tab_clientes_frios!inner (
                id,
                razao_social,
                nome_fantasia,
                corretora_id,
                temperatura,
                proxima_acao,
                data_retorno,
                horario_retorno,
                fase_atendimento
              )
            `)
            .eq('tab_clientes_frios.corretora_id', corretoraId)
            .gte('criado_em', `${dataInicio}T00:00:00`)
            .lte('criado_em', `${dataFim}T23:59:59`);

          if (filtroCorretorFinal === 'casa') {
            queryAcoes = queryAcoes.eq('corretor_id', corretoraId);
          } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
            queryAcoes = queryAcoes.eq('corretor_id', filtroCorretorFinal);
          }

          const { data: resAcoes, error: errAcoes } = await queryAcoes;
          if (errAcoes) throw errAcoes;

          // 2. Busca Clientes Frios gerais para Temperatura e Próxima Ação
          let queryFrios = supabase
            .from('tab_clientes_frios')
            .select('id, razao_social, nome_fantasia, temperatura, proxima_acao, fase_atendimento, data_retorno, horario_retorno')
            .eq('corretora_id', corretoraId);

          if (filtroCorretorFinal === 'casa') {
            queryFrios = queryFrios.eq('corretor_id', corretoraId);
          } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
            queryFrios = queryFrios.eq('corretor_id', filtroCorretorFinal);
          }

          const { data: resFrios, error: errFrios } = await queryFrios;
          if (errFrios) throw errFrios;

          setAcoesImportados(resAcoes || []);
          setClientesFriosLista(resFrios || []);

        } else if (activeTab === 'avulsos' && clientesAvulsos === null) {
          let query = supabase
            .from('tab_clientes_agenda')
            .select('*')
            .eq('corretora_id', corretoraId)
            .gte('created_at', `${dataInicio}T00:00:00`)
            .lte('created_at', `${dataFim}T23:59:59`);

          if (filtroCorretorFinal === 'casa') {
            query = query.eq('corretor_id', corretoraId);
          } else if (filtroCorretorFinal !== 'todos' && filtroCorretorFinal) {
            query = query.eq('corretor_id', filtroCorretorFinal);
          }

          const { data, error } = await query;
          if (error) throw error;
          setClientesAvulsos(data || []);
        }
      } catch (err) {
        console.error(`Erro ao carregar dados da aba ${activeTab}:`, err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, corretoraId, dataInicio, dataFim, corretorLocal, userLevel, userId, interacoesCarteira, acoesImportados, clientesFriosLista, clientesAvulsos]);

  // ESTATÍSTICAS PARA ABA 1 (CARTEIRA)
  const statsCarteira = useMemo(() => {
    if (!interacoesCarteira) return { counts: { whatsapp: 0, ligacao: 0, email: 0, reuniaoOn: 0, reuniaoPres: 0, visita: 0, outros: 0 }, topClientes: [], timeline: [] };

    const counts = { whatsapp: 0, ligacao: 0, email: 0, reuniaoOn: 0, reuniaoPres: 0, visita: 0, outros: 0 };
    const rankingClientes: Record<string, { nome: string; qtd: number }> = {};
    const evolucaoTemporal: Record<string, number> = {};

    interacoesCarteira.forEach(inter => {
      const acao = (inter.tipo_acao || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (acao.includes('whatsapp') || acao.includes('wpp') || acao.includes('chamar_whats')) counts.whatsapp++;
      else if (acao.includes('ligacao') || acao.includes('ligar') || acao.includes('fone') || acao.includes('tel')) counts.ligacao++;
      else if (acao.includes('email') || acao.includes('enviar_email')) counts.email++;
      else if (acao.includes('online') || acao.includes('meet') || acao.includes('zoom')) counts.reuniaoOn++;
      else if (acao.includes('presencial')) counts.reuniaoPres++;
      else if (acao.includes('visita') || acao.includes('visitar')) counts.visita++;
      else counts.outros++;

      const nomeCliente = inter.tab_clientes?.nome || "Cliente não Identificado";
      const cId = inter.cliente_id || 'sem-id';
      if (!rankingClientes[cId]) rankingClientes[cId] = { nome: nomeCliente, qtd: 0 };
      rankingClientes[cId].qtd += 1;

      const dataRef = inter.data_historico;
      if (dataRef) evolucaoTemporal[dataRef] = (evolucaoTemporal[dataRef] || 0) + 1;
    });

    return {
      counts,
      topClientes: Object.values(rankingClientes).sort((a, b) => b.qtd - a.qtd).slice(0, 5),
      timeline: Object.entries(evolucaoTemporal).sort().map(([name, total]) => ({ name, total }))
    };
  }, [interacoesCarteira]);

  // ESTATÍSTICAS PARA ABA 2 (IMPORTADOS - AÇÕES PASSADAS + DESFECHOS + GRUPOS 1 PARA N + PRÓXIMAS AÇÕES/TEMPERATURA)
  const statsImportados = useMemo(() => {
    if (!acoesImportados || !clientesFriosLista) return { 
      counts: { whatsapp: 0, ligacao: 0, email: 0, visita: 0, outros: 0 }, 
      desfechos: { atendeu: 0, aguardando: 0, caixaPostal: 0, ocupado: 0, recado: 0, pediuRetorno: 0, semInteresse: 0, outros: 0 },
      topClientes: [], 
      acoesPorClienteLista: [],
      proximasAcoesCounts: { chamar_whats: 0, ligar: 0, visitar: 0, enviar_email: 0, outros: 0 },
      temperaturaCounts: { frio: 0, morno: 0, quente: 0, outros: 0 },
      timeline: [] 
    };

    const counts = { whatsapp: 0, ligacao: 0, email: 0, visita: 0, outros: 0 };
    const desfechos = { atendeu: 0, aguardando: 0, caixaPostal: 0, ocupado: 0, recado: 0, pediuRetorno: 0, semInteresse: 0, outros: 0 };
    
    const rankingClientes: Record<string, { nome: string; qtd: number }> = {};
    const evolucaoTemporal: Record<string, number> = {};

    // Agrupamento de TODAS AS AÇÕES por Cliente (Visão 1 para N)
    const acoesPorClienteMap: Record<string, any> = {};

    acoesImportados.forEach(acaoItem => {
      const tipo = (acaoItem.tipo_acao || '').toLowerCase();
      const desfechoStr = (acaoItem.desfecho || '').toLowerCase();

      // 1. Contagem de Ações Passadas
      if (tipo === 'chamar_whats' || tipo.includes('whats') || tipo.includes('wpp')) counts.whatsapp++;
      else if (tipo === 'ligar' || tipo.includes('ligacao') || tipo.includes('fone')) counts.ligacao++;
      else if (tipo === 'enviar_email' || tipo.includes('email')) counts.email++;
      else if (tipo === 'visitar' || tipo.includes('visita')) counts.visita++;
      else counts.outros++;

      // 2. Contagem de Desfechos
      if (desfechoStr === 'atendeu') desfechos.atendeu++;
      else if (desfechoStr === 'aguardando_resposta') desfechos.aguardando++;
      else if (desfechoStr === 'caixa_postal') desfechos.caixaPostal++;
      else if (desfechoStr === 'ocupado') desfechos.ocupado++;
      else if (desfechoStr === 'recado_secretaria') desfechos.recado++;
      else if (desfechoStr === 'pediu_retorno_outro_momento') desfechos.pediuRetorno++;
      else if (desfechoStr === 'sem_interesse') desfechos.semInteresse++;
      else desfechos.outros++;

      // 3. Ranking e Agrupamento
      const clienteObj = acaoItem.tab_clientes_frios;
      const nomeCliente = clienteObj?.razao_social || clienteObj?.nome_fantasia || "Cliente Importado";
      const cId = acaoItem.cliente_frio_id;

      if (!rankingClientes[cId]) rankingClientes[cId] = { nome: nomeCliente, qtd: 0 };
      rankingClientes[cId].qtd += 1;

      // 4. Monta a Estrutura 1 para N do Cliente
      if (!acoesPorClienteMap[cId]) {
        acoesPorClienteMap[cId] = {
          clienteId: cId,
          nomeCliente,
          totalAcoes: 0,
          ultimaAcaoEm: acaoItem.criado_em,
          acoes: []
        };
      }

      acoesPorClienteMap[cId].totalAcoes += 1;
      acoesPorClienteMap[cId].acoes.push({
        id: acaoItem.id,
        tipoAcao: acaoItem.tipo_acao,
        desfecho: acaoItem.desfecho,
        observacao: acaoItem.observacao,
        criado_em: acaoItem.criado_em
      });

      if (new Date(acaoItem.criado_em) > new Date(acoesPorClienteMap[cId].ultimaAcaoEm)) {
        acoesPorClienteMap[cId].ultimaAcaoEm = acaoItem.criado_em;
      }

      // 5. Linha do Tempo
      const dataRef = acaoItem.criado_em ? acaoItem.criado_em.substring(0, 10) : '';
      if (dataRef) evolucaoTemporal[dataRef] = (evolucaoTemporal[dataRef] || 0) + 1;
    });

    // Ordena as ações de cada cliente da mais recente para a mais antiga, e os clientes pela última interação
    const acoesPorClienteLista = Object.values(acoesPorClienteMap).map((item: any) => {
      item.acoes.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
      return item;
    }).sort((a: any, b: any) => {
      // 1º Critério: Maior número total de ações
      if (b.totalAcoes !== a.totalAcoes) {
        return b.totalAcoes - a.totalAcoes;
      }
      // 2º Critério: Interação mais recente
      return new Date(b.ultimaAcaoEm).getTime() - new Date(a.ultimaAcaoEm).getTime();
    })

    // 6. Contagem de Próximas Ações e Temperatura (Vindo da `tab_clientes_frios`)
    const proximasAcoesCounts = { chamar_whats: 0, ligar: 0, visitar: 0, enviar_email: 0, outros: 0 };
    const temperaturaCounts = { frio: 0, morno: 0, quente: 0, outros: 0 };

    clientesFriosLista.forEach(c => {
      const temp = (c.temperatura || 'frio').toLowerCase();
      if (temp.includes('frio')) temperaturaCounts.frio++;
      else if (temp.includes('morno')) temperaturaCounts.morno++;
      else if (temp.includes('quente')) temperaturaCounts.quente++;
      else temperaturaCounts.outros++;

      if (Array.isArray(c.proxima_acao)) {
        c.proxima_acao.forEach((pAct: string) => {
          const act = (pAct || '').toLowerCase();
          if (act === 'chamar_whats' || act.includes('whats')) proximasAcoesCounts.chamar_whats++;
          else if (act === 'ligar' || act.includes('ligar')) proximasAcoesCounts.ligar++;
          else if (act === 'visitar' || act.includes('visita')) proximasAcoesCounts.visitar++;
          else if (act === 'enviar_email' || act.includes('email')) proximasAcoesCounts.enviar_email++;
          else proximasAcoesCounts.outros++;
        });
      }
    });

    return {
      counts,
      desfechos,
      topClientes: Object.values(rankingClientes).sort((a, b) => b.qtd - a.qtd).slice(0, 5),
      acoesPorClienteLista,
      proximasAcoesCounts,
      temperaturaCounts,
      timeline: Object.entries(evolucaoTemporal).sort().map(([name, total]) => ({ name, total }))
    };
  }, [acoesImportados, clientesFriosLista]);

  // ESTATÍSTICAS E LISTA ORDENADA PARA ABA 3 (AVULSOS / AGENDA)
  const statsAvulsos = useMemo(() => {
    if (!clientesAvulsos) return { total: 0, comTelefone: 0, comEmail: 0, ordenados: [] };

    let comTelefone = 0;
    let comEmail = 0;

    clientesAvulsos.forEach(item => {
      if (item.tel_cliente && item.tel_cliente.trim() !== '') comTelefone++;
      if (item.email_cliente && item.email_cliente.trim() !== '') comEmail++;
    });

    const ordenados = [...clientesAvulsos].sort((a, b) => {
      const dataA = a.data_retorno || '9999-99-99';
      const dataB = b.data_retorno || '9999-99-99';
      if (dataA !== dataB) return dataA.localeCompare(dataB);
      
      const horaA = a.horario_retorno || '23:59:59';
      const horaB = b.horario_retorno || '23:59:59';
      return horaA.localeCompare(horaB);
    });

    return {
      total: clientesAvulsos.length,
      comTelefone,
      comEmail,
      ordenados
    };
  }, [clientesAvulsos]);

  // Auxiliares de formatação
  const formatarDataBR = (val: string | null) => {
    if (!val) return '—';
    const str = String(val).substring(0, 10);
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
  };

  const formatarAcaoLabel = (tipo: string) => {
    switch (tipo) {
      case 'chamar_whats': return '💬 WhatsApp';
      case 'ligar': return '📞 Ligação';
      case 'visitar': return '🏢 Visita Presencial';
      case 'enviar_email': return '📧 E-mail';
      default: return '📌 Outros';
    }
  };

  const formatarDesfechoLabel = (desfecho: string) => {
    switch (desfecho) {
      case 'atendeu': return '✅ Atendeu / Conversou';
      case 'aguardando_resposta': return '💬 Aguardando Resposta';
      case 'caixa_postal': return '📭 Caixa Postal / Não Atendeu';
      case 'ocupado': return '⏳ Ocupado';
      case 'recado_secretaria': return '📝 Deixou Recado';
      case 'pediu_retorno_outro_momento': return '⏰ Pediu p/ ligar depois';
      case 'sem_interesse': return '❌ Sem Interesse';
      default: return desfecho || '—';
    }
  };

  const getStatusAgendamento = (dataRetornoStr: string) => {
    if (!dataRetornoStr) return { label: 'Sem Data', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [ano, mes, dia] = dataRetornoStr.substring(0, 10).split('-').map(Number);
    const dataRet = new Date(ano, mes - 1, dia);

    const diffDays = Math.round((dataRet.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Atrasado', bg: 'bg-rose-100 text-rose-700 border-rose-200' };
    if (diffDays === 0) return { label: 'Hoje', bg: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Próximo', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full">
      
      {/* SELETOR DE ABAS DA PRODUTIVIDADE */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('carteira')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'carteira'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase size={16} />
          <span>CLIENTES CARTEIRA</span>
        </button>

        <button
          onClick={() => setActiveTab('importados')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'importados'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Download size={16} />
          <span>CLIENTES IMPORTADOS</span>
        </button>

        <button
          onClick={() => setActiveTab('avulsos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'avulsos'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock size={16} />
          <span>CLIENTES AVULSOS (AGENDA)</span>
        </button>
      </div>

      {/* BARRA DE FILTROS GLOBATION */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Parâmetros de Produtividade:</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
            <input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        </div>

        {/* SELECTOR COM TRAVA DE VISÃO */}
        <div className="flex items-center gap-2 px-4 border-l border-slate-100 ml-auto">
          <User size={14} className="text-slate-400" />
          <select 
            value={corretorLocal} 
            onChange={(e) => setCorretorLocal(e.target.value)} 
            disabled={userLevel?.toUpperCase() === 'CORRETOR'}
            className={`text-[10px] font-black uppercase bg-transparent outline-none min-w-[160px] ${
              userLevel?.toUpperCase() === 'CORRETOR' ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-700 hover:text-indigo-600'
            }`}
          >
            {userLevel?.toUpperCase() !== 'CORRETOR' ? (
              <>
                <option value="todos">Todos os Corretores</option>
                <option value="casa">ATENDIMENTO DIRETO (CORRETORA)</option>
                {(corretoresLista || [])
                  .filter(c => c.nome.toUpperCase() !== "ATENDIMENTO DIRETO (CORRETORA)")
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))
                }
              </>
            ) : (
              <option value={userId}>
                {corretoresLista.find(c => c.id === userId)?.nome || 'Meu Usuário'}
              </option>
            )}
          </select>
        </div>

        {loading && <Loader2 size={18} className="animate-spin text-indigo-500 ml-2" />}
      </div>

      {/* RENDERIZAÇÃO CONFORME A ABA SELECIONADA */}

      {/* ABA 1: CARTEIRA */}
      {activeTab === 'carteira' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <ActionCard icon={<MessageCircle size={20}/>} label="WhatsApp" val={statsCarteira.counts.whatsapp} color="text-emerald-600" bg="bg-emerald-50" />
            <ActionCard icon={<Phone size={20}/>} label="Ligação" val={statsCarteira.counts.ligacao} color="text-blue-600" bg="bg-blue-50" />
            <ActionCard icon={<Mail size={20}/>} label="E-mail" val={statsCarteira.counts.email} color="text-amber-600" bg="bg-amber-50" />
            <ActionCard icon={<Monitor size={20}/>} label="R. Online" val={statsCarteira.counts.reuniaoOn} color="text-indigo-600" bg="bg-indigo-50" />
            <ActionCard icon={<MapPin size={20}/>} label="R. Presencial" val={statsCarteira.counts.reuniaoPres} color="text-rose-600" bg="bg-rose-50" />
            <ActionCard icon={<UserCheck size={20}/>} label="Visitas" val={statsCarteira.counts.visita} color="text-violet-600" bg="bg-violet-50" />
            <ActionCard icon={<TrendingUp size={20}/>} label="Outros" val={statsCarteira.counts.outros} color="text-slate-600" bg="bg-slate-50" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Evolução Diária de Atendimentos (Carteira)" timeline={statsCarteira.timeline} isMounted={isMounted} />
            <TopClientesCard title="Top 5 Clientes da Carteira" clientes={statsCarteira.topClientes} />
          </div>
        </div>
      )}

      {/* ABA 2: IMPORTADOS */}
      {activeTab === 'importados' && (
        <div className="space-y-6">
          {/* SEÇÃO 1: AÇÕES PASSADAS REALIZADAS */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" /> Ações Passadas Realizadas (Produtividade de Contatos)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <ActionCard icon={<MessageCircle size={20}/>} label="WhatsApp (chamar_whats)" val={statsImportados.counts.whatsapp} color="text-emerald-600" bg="bg-emerald-50" />
              <ActionCard icon={<Phone size={20}/>} label="Ligação (ligar)" val={statsImportados.counts.ligacao} color="text-blue-600" bg="bg-blue-50" />
              <ActionCard icon={<Mail size={20}/>} label="E-mail (enviar_email)" val={statsImportados.counts.email} color="text-amber-600" bg="bg-amber-50" />
              <ActionCard icon={<MapPin size={20}/>} label="Visita (visitar)" val={statsImportados.counts.visita} color="text-rose-600" bg="bg-rose-50" />
              <ActionCard icon={<TrendingUp size={20}/>} label="Outros" val={statsImportados.counts.outros} color="text-slate-600" bg="bg-slate-50" />
            </div>
          </div>

          {/* SEÇÃO 2: DESFECHOS DAS INTERAÇÕES */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HelpCircle size={16} className="text-indigo-500" /> Distribuição de Desfechos Obtidos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                <p className="text-xl font-black text-emerald-700">{statsImportados.desfechos.atendeu}</p>
                <p className="text-[9px] font-black uppercase text-emerald-600 mt-1">Atendeu</p>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 text-center">
                <p className="text-xl font-black text-sky-700">{statsImportados.desfechos.aguardando}</p>
                <p className="text-[9px] font-black uppercase text-sky-600 mt-1">Aguardando Resposta</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-center">
                <p className="text-xl font-black text-rose-700">{statsImportados.desfechos.caixaPostal}</p>
                <p className="text-[9px] font-black uppercase text-rose-600 mt-1">Caixa Postal</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
                <p className="text-xl font-black text-amber-700">{statsImportados.desfechos.ocupado}</p>
                <p className="text-[9px] font-black uppercase text-amber-600 mt-1">Ocupado</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-center">
                <p className="text-xl font-black text-purple-700">{statsImportados.desfechos.recado}</p>
                <p className="text-[9px] font-black uppercase text-purple-600 mt-1">Deixou Recado</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
                <p className="text-xl font-black text-indigo-700">{statsImportados.desfechos.pediuRetorno}</p>
                <p className="text-[9px] font-black uppercase text-indigo-600 mt-1">Pediu Retorno</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                <p className="text-xl font-black text-slate-700">{statsImportados.desfechos.semInteresse}</p>
                <p className="text-[9px] font-black uppercase text-slate-500 mt-1">Sem Interesse</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: GRÁFICO + MÉTRICAS DE AÇÕES FUTURAS E TEMPERATURA */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Evolução Diária de Atendimentos (Importados)" timeline={statsImportados.timeline} isMounted={isMounted} />

            {/* PAINEL DE PRÓXIMAS AÇÕES E TEMPERATURA (TAB_CLIENTES_FRIOS) */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <Flame size={18} className="text-amber-500" /> Próximas Ações & Temperatura da Carteira Fria
              </h3>

              {/* TEMPERATURA */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Temperatura dos Clientes Frios:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                    <p className="text-lg font-black text-blue-600">{statsImportados.temperaturaCounts.frio}</p>
                    <p className="text-[9px] font-black uppercase text-blue-500">❄️ Frio</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                    <p className="text-lg font-black text-amber-600">{statsImportados.temperaturaCounts.morno}</p>
                    <p className="text-[9px] font-black uppercase text-amber-500">🌤️ Morno</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                    <p className="text-lg font-black text-rose-600">{statsImportados.temperaturaCounts.quente}</p>
                    <p className="text-[9px] font-black uppercase text-rose-500">🔥 Quente</p>
                  </div>
                </div>
              </div>

              {/* PRÓXIMA AÇÃO PROGRAMADA */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Planejamento de Próximas Ações Agendadas:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-base font-black text-slate-700">{statsImportados.proximasAcoesCounts.chamar_whats}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">💬 Whats</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-base font-black text-slate-700">{statsImportados.proximasAcoesCounts.ligar}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">📞 Ligação</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-base font-black text-slate-700">{statsImportados.proximasAcoesCounts.visitar}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">🏢 Visita</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-base font-black text-slate-700">{statsImportados.proximasAcoesCounts.enviar_email}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">📧 Email</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: TOP CLIENTES IMPORTADOS POR VOLUME DE AÇÕES (EXPANSÍVEL 1 PARA N) */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            
            {/* CABEÇALHO DA SEÇÃO COM SELETOR TOP X */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase text-slate-600 flex items-center gap-2">
                <Users size={18} className="text-indigo-500"/> Top Clientes mais Trabalhados (Visão 1 para N)
              </h3>

              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 pl-2">Exibir:</span>
                {[5, 10, 20, 50].map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setTopLimitImportados(limit)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                      topLimitImportados === limit
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-white'
                    }`}
                  >
                    Top {limit}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTAGEM DOS TOP CLIENTES */}
            {statsImportados.acoesPorClienteLista.length > 0 ? (
              <div className="space-y-3">
                {statsImportados.acoesPorClienteLista.slice(0, topLimitImportados).map((item: any, idx: number) => {
                  const isExpanded = expandedClienteImportadoId === item.clienteId;
                  const ultimaAcao = item.acoes[0];

                  return (
                    <div 
                      key={item.clienteId} 
                      className="border border-slate-100 rounded-3xl p-5 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all space-y-3"
                    >
                      {/* REGISTRO PRINCIPAL */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {/* POSIÇÃO NO RANKING */}
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs border border-indigo-100 shadow-sm">
                            #{idx + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800 uppercase">{item.nomeCliente}</h4>
                              <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                📊 {item.totalAcoes} {item.totalAcoes === 1 ? 'Ação' : 'Ações'}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              Último contato: <strong className="text-slate-600">{new Date(item.ultimaAcaoEm).toLocaleDateString('pt-BR')} às {new Date(item.ultimaAcaoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setExpandedClienteImportadoId(isExpanded ? null : item.clienteId)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-black text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                          >
                            <span>{isExpanded ? 'Ocultar Histórico' : 'Ver Histórico'}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* RESUMO RESUMIDO DA ÚLTIMA AÇÃO (QUANDO FECHADO) */}
                      {!isExpanded && ultimaAcao && (
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 bg-white p-2.5 rounded-2xl border border-slate-100">
                          <span className="text-slate-400 font-black uppercase">Última ação:</span>
                          <span className="text-slate-700 font-black">{formatarAcaoLabel(ultimaAcao.tipoAcao)}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-black">{formatarDesfechoLabel(ultimaAcao.desfecho)}</span>
                          {ultimaAcao.observacao && (
                            <>
                              <span>•</span>
                              <span className="truncate italic max-w-[280px]">"{ultimaAcao.observacao}"</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* DETALHAMENTO HISTÓRICO EXPANDIDO */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-300">
                          <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 mb-2">
                            <FileText size={12}/> Linha do Tempo das {item.acoes.length} Ações Registradas:
                          </p>
                          <div className="space-y-2">
                            {item.acoes.map((act: any, actIdx: number) => (
                              <div key={act.id || actIdx} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-indigo-100 transition-all">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-black text-slate-800">{formatarAcaoLabel(act.tipoAcao)}</span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase">
                                      {formatarDesfechoLabel(act.desfecho)}
                                    </span>
                                  </div>
                                  {act.observacao && (
                                    <p className="text-[11px] text-slate-600 font-medium italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      "{act.observacao}"
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                  {new Date(act.criado_em).toLocaleDateString('pt-BR')} às {new Date(act.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                <Clock size={36} className="mb-2" />
                <p className="text-xs font-black uppercase italic">Nenhum registro de ação para os parâmetros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: AVULSOS (AGENDA) */}
      {activeTab === 'avulsos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de Registros Cadastrados</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{statsAvulsos.total}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Telefones Cadastrados</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">{statsAvulsos.comTelefone}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Phone size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mails Cadastrados</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{statsAvulsos.comEmail}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Mail size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" /> Próximos Agendamentos de Retorno
            </h3>

            {statsAvulsos.ordenados.length > 0 ? (
              <div className="space-y-3">
                {statsAvulsos.ordenados.map((item) => {
                  const status = getStatusAgendamento(item.data_retorno);
                  const isExpanded = expandedClienteId === item.id;

                  return (
                    <div 
                      key={item.id} 
                      className="border border-slate-100 rounded-3xl p-5 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-sm uppercase">
                            {item.nome_cliente.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase">{item.nome_cliente}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-0.5">
                              {item.tel_cliente && <span className="flex items-center gap-1"><Phone size={12}/>{item.tel_cliente}</span>}
                              {item.email_cliente && <span className="flex items-center gap-1"><Mail size={12}/>{item.email_cliente}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${status.bg}`}>
                              {status.label}
                            </span>
                            <p className="text-xs font-black text-slate-700 mt-1">
                              {formatarDataBR(item.data_retorno)} {item.horario_retorno ? `às ${String(item.horario_retorno).substring(0, 5)}` : ''}
                            </p>
                          </div>

                          <button 
                            onClick={() => setExpandedClienteId(isExpanded ? null : item.id)}
                            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Ver descrição"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 animate-in fade-in duration-300">
                          <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 mb-1">
                            <FileText size={12}/> Breve Descrição do Retorno:
                          </p>
                          <p className="text-xs font-medium text-slate-600 bg-white p-3 rounded-2xl border border-slate-100">
                            {item.breve_descricao || 'Nenhuma descrição informada para este cliente.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 opacity-60">
                <Clock size={40} className="mb-3" />
                <p className="text-xs font-black uppercase italic">Nenhum cliente avulso agendado no período.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// SUBCOMPONENTES AUXILIARES
function ActionCard({ icon, label, val, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-[32px] border border-slate-100 text-center space-y-2 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 hover:-translate-y-1 group">
      <div className={`inline-flex p-3 rounded-2xl ${bg} ${color} shadow-sm group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{val || 0}</p>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, timeline, isMounted }: any) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
      <h3 className="text-sm font-black uppercase text-slate-500 mb-8 flex items-center gap-2">
        <Calendar size={18} className="text-indigo-500"/> {title}
      </h3>
      <div className="flex-1 w-full min-h-[300px]">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                axisLine={false} 
                tickFormatter={(val) => val.split('-').reverse().slice(0,2).join('/')} 
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                labelFormatter={(lbl) => `Data: ${lbl.split('-').reverse().join('/')}`}
              />
              <Area type="monotone" dataKey="total" name="Ações" stroke="#6366f1" strokeWidth={4} fill="url(#colorIndigo)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TopClientesCard({ title, clientes }: any) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
      <h3 className="text-sm font-black uppercase text-slate-500 mb-8 flex items-center gap-2">
        <Users size={18} className="text-indigo-500"/> {title}
      </h3>
      <div className="space-y-4">
        {clientes && clientes.length > 0 ? clientes.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white text-slate-600 flex items-center justify-center text-[11px] font-black transition-colors border border-slate-100 uppercase italic">
                {idx + 1}º
              </div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.nome}</span>
            </div>
            <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm group-hover:border-indigo-200 transition-colors">
              <span className="text-sm font-black text-indigo-600">{item.qtd}</span>
              <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">Ações</span>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
            <TrendingUp size={40} className="mb-4" />
            <p className="text-xs font-black uppercase italic tracking-widest">Nenhuma interação registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}