import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Ajustado para o padrão do projeto
import { BarChart3, Loader2 } from 'lucide-react';

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
  const [initializing, setInitializing] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('clientes');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [corretores, setCorretores] = useState<any[]>([]);

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

  useEffect(() => {
    async function initDashboard() {
      setInitializing(true);
      try {
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
            setCorretores([perfil]);
          } else {
            const { data: lista } = await supabase
              .from('usuarios_perfis')
              .select('id, nome')
              .eq('corretora_id', perfil.corretora_id)
              .eq('tipo_usuario', 'CORRETOR')
              .order('nome');
            
            // ALTERAÇÃO AQUI: ID da Casa agora é uma string clara 'casa'
            // Isso evita conflito com o UUID da corretora
            setCorretores([
              { id: 'casa', nome: "ATENDIMENTO DIRETO (CASA)" },
              ...(lista || [])
            ]);
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar dashboard:", error);
      } finally {
        setInitializing(false);
      }
    }
    initDashboard();
  }, []);

  // Enquanto identifica o usuário e carrega a lista de corretores
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <h2 className="text-indigo-900 font-black uppercase tracking-widest text-xs text-center px-4">
          Inicializando Ambiente de BI...
        </h2>
      </div>
    );
  }

  const cid = userProfile?.corretora_id;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-12 pb-24 text-slate-800">
      
      {/* HEADER SIMPLIFICADO */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-slate-800 flex items-center gap-3 tracking-tighter">
            <BarChart3 size={32} className="text-indigo-600" /> Dashboard Comercial
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            Sistema de Inteligência Corretora v3.0 • {userProfile?.nome}
          </p>
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

      {/* RENDERIZAÇÃO CONDICIONAL - AGORA TODAS PASSAM APENAS ID E LISTA */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {!cid ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin text-slate-300" size={32} />
          </div>
        ) : (
          <>
            {abaAtiva === 'clientes' && <VisaoCliente corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'propostas' && <VisaoPropostas corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'produtos' && <VisaoProdutos corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'seguradoras' && <VisaoSeguradoras corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'produtividade' && <VisaoProdutividade corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'parceiros' && <VisaoParceiros corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'comissoes' && <VisaoComissoes corretoraId={cid} corretoresLista={corretores} />}
            {abaAtiva === 'sinistros' && <VisaoSinistros corretoraId={cid} corretoresLista={corretores} />}
          </>
        )}
      </main>
    </div>
  );
}