import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BarChart3, Calendar, RotateCcw, Loader2 } from 'lucide-react';

// Importação dos Componentes Modulares
import VisaoCliente from './components/visaoCliente';
import VisaoPropostas from './components/visaoPropostas';
import VisaoProdutividade from './components/visaoProdutividade';
import VisaoComissoes from './components/visaoComissoes';
import VisaoSinistros from './components/visaoSinistros';
import VisaoSeguradoras from './components/visaoSeguradoras';
import VisaoParceiros from './components/visaoParceiros';
import VisaoProdutos from './components/visaoProdutos';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('clientes');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [corretores, setCorretores] = useState<any[]>([]);
  
  const [clientesRaw, setClientesRaw] = useState<any[]>([]);
  const [interacoesRaw, setInteracoesRaw] = useState<any[]>([]);
  const [propostasRaw, setPropostasRaw] = useState<any[]>([]); 
  const [comissoesRaw, setComissoesRaw] = useState<any[]>([]);
  const [sinistrosRaw, setSinistrosRaw] = useState<any[]>([]);
  const [parceirosRaw, setParceirosRaw] = useState<any[]>([]);
  const [indicacoesRaw, setIndicacoesRaw] = useState<any[]>([]);
  const [cotacoesRaw, setCotacoesRaw] = useState<any[]>([]);

  const listaAbas = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'propostas', label: 'Propostas' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'seguradoras', label: 'Seguradoras' },
  { id: 'produtividade', label: 'Produtividade' },
  { id: 'parceiros', label: 'Parceiros' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'sinistros', label: 'Sinistros' },
];

  const getPrimeiroDiaMes = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  };
  const getDataHoje = () => new Date().toLocaleDateString('en-CA');

  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getDataHoje());
  const [corretorId, setCorretorId] = useState('todos');

  // --- 1. INICIALIZAÇÃO DE PERFIL E LISTA DE CORRETORES ---
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('*')
        .eq('id', user.id)
        .single();

      if (perfil) {
        setUserProfile(perfil);
        if (perfil.tipo_usuario === 'CORRETOR') {
          setCorretorId(perfil.id);
          setCorretores([perfil]);
        } else {
          const { data: lista } = await supabase
            .from('usuarios_perfis')
            .select('id, nome')
            .eq('corretora_id', perfil.corretora_id)
            .eq('tipo_usuario', 'CORRETOR')
            .order('nome');
          
          const listaComCasa = [
            { id: perfil.corretora_id, nome: "ATENDIMENTO DIRETO (CASA)" },
            ...(lista || [])
          ];
          setCorretores(listaComCasa);
        }
      }
    }
    init();
  }, []);

  // --- 2. BUSCA DE DADOS (REFATORADA E BLINDADA) ---
  const fetchAllData = async () => {
    if (!userProfile?.corretora_id) return;
    setLoading(true);
    
    try {
      const cid = userProfile.corretora_id;
      
      // Montagem do filtro de IDs para o escopo selecionado
      let idsParaFiltro: string[] = [];
      if (corretorId === 'todos') {
        // Pega todos os IDs da lista de corretores (que já inclui o ID da Casa se for Admin)
        idsParaFiltro = corretores.map(c => c.id).filter(id => !!id);
        // Garante que o ID da corretora sempre esteja no bolo para ver registros "sem dono"
        if (!idsParaFiltro.includes(cid)) idsParaFiltro.push(cid);
      } else {
        idsParaFiltro = [corretorId];
      }

      // 1. Definição das Queries baseadas na Corretora
      const queries = {
        clientes: supabase.from('tab_clientes').select('*').eq('corretora_id', cid),
        interacoes: supabase.from('tab_interacoes').select('*').eq('corretora_id', cid),
        propostas: supabase
        .from('tab_propostas')
        .select('*, tab_proposta_opcoes (*, base_seguradoras(nome), tab_proposta_itens(*, base_produtos(nome)))')
        .eq('corretora_id', cid),
        comissoes: supabase.from('tab_comissoes').select('*, tab_clientes(nome), base_produtos(nome)').eq('corretora_id', cid),
        sinistros: supabase
        .from('tab_sinistros')
        .select('*, tab_proposta_itens(base_produtos(nome))')
        .eq('corretora_id', cid),
        parceiros: supabase.from('tab_parceiros').select('*').eq('corretora_id', cid),
        indicacoes: supabase.from('tab_indicacoes').select('*').eq('corretora_id', cid),
        cotacoes: supabase.from('tab_indicacoes_cotacoes').select('*, tab_indicacoes!inner(corretora_id, corretor_id)')
      };

      // 2. Aplicação do filtro de Corretor nas queries onde a coluna existe
      // Usamos .in() para permitir 'todos' ou .eq() para um específico
      Object.keys(queries).forEach(key => {
        if (key === 'cotacoes') {
          (queries as any)[key] = (queries as any)[key].in('tab_indicacoes.corretor_id', idsParaFiltro);
        } else {
          (queries as any)[key] = (queries as any)[key].in('corretor_id', idsParaFiltro);
        }
      });

      // 3. Execução ÚNICA e PARALELA
      const [rCli, rInt, rProp, rCom, rSin, rParc, rIndi, rCot] = await Promise.all([
        queries.clientes,
        queries.interacoes,
        queries.propostas,
        queries.comissoes,
        queries.sinistros,
        queries.parceiros,
        queries.indicacoes,
        queries.cotacoes
      ]);

      // Verificação de Erros
      if (rCom.error) console.error("Erro Supabase Comissões:", rCom.error.message);

      // 4. Atualização do Estado
      setClientesRaw(rCli.data || []);
      setInteracoesRaw(rInt.data || []);
      setPropostasRaw(rProp.data || []);
      setComissoesRaw(rCom.data || []);
      setSinistrosRaw(rSin.data || []);
      setParceirosRaw(rParc.data || []);
      setIndicacoesRaw(rIndi.data || []);
      setCotacoesRaw(rCot.data || []);

    } catch (error) {
      console.error("Erro crítico no Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.corretora_id && corretores.length > 0) {
      fetchAllData();
    }
  }, [userProfile, corretorId, dataInicio, dataFim, corretores.length]);

  // --- 3. RENDERIZAÇÃO ---
  if (loading && clientesRaw.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <h2 className="text-indigo-900 font-black uppercase tracking-widest text-sm text-center px-4">
          Sincronizando Base de Dados comercial...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-12 pb-24">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-slate-800 flex items-center gap-3">
            <BarChart3 size={32} className="text-indigo-600" /> Dashboard Comercial
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Controle de Performance v2.5</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <Calendar size={16} className="text-indigo-500" />
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs font-bold outline-none bg-transparent" />
            <span className="text-slate-300 font-bold">/</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs font-bold outline-none bg-transparent" />
          </div>

          {userProfile?.tipo_usuario !== 'CORRETOR' && (
            <select 
              value={corretorId} 
              onChange={e => setCorretorId(e.target.value)}
              className="bg-white p-3 rounded-2xl border border-slate-100 text-xs font-black uppercase text-indigo-600 shadow-sm outline-none focus:ring-2 ring-indigo-100"
            >
              <option value="todos">Todos os Corretores</option>
              {corretores.map(corr => (
                <option key={corr.id} value={corr.id}>{corr.nome}</option>
              ))}
            </select>
          )}

          <button 
            onClick={() => { setDataInicio(getPrimeiroDiaMes()); setDataFim(getDataHoje()); setCorretorId('todos'); }}
            className="p-3 bg-slate-800 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg"
            title="Resetar Filtros"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO POR ABAS */}
<div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-hide">
  {listaAbas.map((aba) => (
    <button
      key={aba.id}
      onClick={() => setAbaAtiva(aba.id)}
      className={`px-6 py-3 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
        abaAtiva === aba.id
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 -translate-y-1'
          : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'
      }`}
    >
      {aba.label}
    </button>
  ))}
</div>

      {/* CONTEÚDO DINÂMICO DA ABA */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {abaAtiva === 'clientes' && (
          <VisaoCliente dataRaw={clientesRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
        {abaAtiva === 'propostas' && (
          <VisaoPropostas propostasRaw={propostasRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
        {abaAtiva === 'produtos' && (
          <VisaoProdutos propostasRaw={propostasRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
        {abaAtiva === 'seguradoras' && (
          <VisaoSeguradoras propostasRaw={propostasRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
        {abaAtiva === 'produtividade' && (
          <VisaoProdutividade interacoesRaw={interacoesRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
        {abaAtiva === 'parceiros' && (
          <VisaoParceiros parceirosRaw={parceirosRaw} indicacoesRaw={indicacoesRaw} cotacoesRaw={cotacoesRaw} />
        )}
        {abaAtiva === 'comissoes' && (
          <VisaoComissoes comissoesRaw={comissoesRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
        {abaAtiva === 'sinistros' && (
          <VisaoSinistros sinistrosRaw={sinistrosRaw} propostasRaw={propostasRaw} dataInicio={dataInicio} dataFim={dataFim} corretorId={corretorId} />
        )}
      </div>
    </div>
  );
}