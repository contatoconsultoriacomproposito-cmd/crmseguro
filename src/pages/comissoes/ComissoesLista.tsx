import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ModalComissoes } from '../../components/kanban/components_visual_card/ModalComissoes'

export const ComissoesLista = () => {
  const [loading, setLoading] = useState(true);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aberto' | 'recebido'>('todos');
  const [busca, setBusca] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comissaoSelecionada, setComissaoSelecionada] = useState<any>(null);

  useEffect(() => {
    fetchComissoes();
  }, [filtroStatus]);

  const fetchComissoes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Pegamos o perfil para saber se é ADMIN ou CORRETOR
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      if (!perfil) return;

      // 2. Iniciamos a query
      let query = supabase
        .from('tab_comissoes')
        .select(`
          *,
          tab_clientes ( nome ),
          base_produtos ( nome ),
          usuarios_perfis!tab_comissoes_corretor_id_fkey ( corretora_id )
        `);

      // 3. REGRA DE FILTRAGEM (O PULO DO GATO)
      if (perfil.tipo_usuario === 'CORRETOR') {
        // Se for corretor, vê apenas o que é dele
        query = query.eq('corretor_id', perfil.id);
      } else {
        // Se for ADMIN, filtramos através da relação com usuarios_perfis
        // para garantir que ele veja todas as comissões da CORRETORA dele
        query = query.eq('usuarios_perfis.corretora_id', perfil.corretora_id);
      }

      // 4. Filtros de Status (mantendo sua lógica)
      if (filtroStatus === 'aberto') {
        query = query.is('data_recebimento', null);
      } else if (filtroStatus === 'recebido') {
        query = query.not('data_recebimento', 'is', null);
      }

      const { data, error } = await query.order('data_vencimento_comissao', { ascending: true });
      
      if (error) throw error;
      setComissoes(data || []);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      toast.error("Erro ao carregar comissões");
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicaoComissao = (comissao: any) => {
    setComissaoSelecionada(comissao);
    setIsModalOpen(true);
  };

  const comissoesFiltradas = comissoes.filter(c => 
    c.tab_clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.nome_seguradora?.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAberto = comissoes
    .filter(c => !c.data_recebimento)
    .reduce((acc, curr) => acc + (curr.valor_comissao || 0), 0);

  const totalRecebido = comissoes
    .filter(c => c.data_recebimento)
    .reduce((acc, curr) => acc + (curr.valor_comissao || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 lg:p-8 transition-all">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">
              Central de Comissões
            </h1>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Acompanhamento financeiro de vendas</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <Clock className="text-amber-600" size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase leading-none mb-1">Em Aberto</p>
                <p className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tighter">
                  R$ {totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-green-500/10 rounded-2xl">
                <CheckCircle2 className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase leading-none mb-1">Recebido</p>
                <p className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tighter">
                  R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-zinc-900 p-3 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
           <div className="relative flex-1 group">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={20} />
             <input 
               type="text"
               placeholder="BUSCAR POR CLIENTE OU SEGURADORA..."
               value={busca}
               onChange={(e) => setBusca(e.target.value)}
               className="w-full bg-transparent pl-14 pr-6 py-4 text-xs font-black uppercase outline-none placeholder:text-zinc-400"
             />
           </div>
           <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-[1.8rem] gap-1">
             {(['todos', 'aberto', 'recebido'] as const).map((status) => (
               <button key={status} onClick={() => setFiltroStatus(status)} className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase transition-all duration-200 ${filtroStatus === status ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' : 'text-zinc-500'}`}>{status}</button>
             ))}
           </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente / Seguradora</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produto / Venda</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vencimento</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valor Comissão</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr><td colSpan={6} className="p-32 text-center text-xs font-black uppercase animate-pulse text-zinc-400">Sincronizando...</td></tr>
                ) : comissoesFiltradas.length === 0 ? (
                  <tr><td colSpan={6} className="p-32 text-center text-xs font-black uppercase text-zinc-400">Nenhum registro para esta corretora.</td></tr>
                ) : comissoesFiltradas.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => abrirEdicaoComissao(c)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter leading-none mb-1.5">{c.tab_clientes?.nome}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.nome_seguradora}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase leading-none mb-1">{c.base_produtos?.nome}</p>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase">Venda: {new Date(c.data_venda).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2.5">
                        <Calendar size={14} className="text-zinc-400" />
                        <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                          {new Date(c.data_vencimento_comissao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-sm font-black text-green-600 tracking-tighter leading-none mb-1">
                        R$ {c.valor_comissao?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">{c.percentual_comissao}% comissão</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {c.data_recebimento ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-600 text-[9px] font-black uppercase rounded-full">
                          <CheckCircle2 size={12} /> Recebido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-600 text-[9px] font-black uppercase rounded-full">
                          <Clock size={12} /> Em Aberto
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ModalComissoes 
          itemId={comissaoSelecionada?.item_id}
          onClose={() => {
            setIsModalOpen(false);
            setComissaoSelecionada(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchComissoes();
            toast.success("Comissão atualizada!");
          }}
        />
      )}
    </div>
  );
};