import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Edit3 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ModalComissoesAjuste } from '../../components/kanban/components_visual_card/ModalComissoesAjuste';
import { maskCurrency } from '../../utils/masks';

export const ComissoesLista = () => {
  const [loading, setLoading] = useState(true);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aberto' | 'recebido'>('todos');
  const [busca, setBusca] = useState('');
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);
  const [comissaoSelecionada, setComissaoSelecionada] = useState<any>(null);

  useEffect(() => {
    fetchComissoes();
  }, [filtroStatus]);

  const fetchComissoes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      if (!perfil) return;

      let query = supabase.from('tab_comissoes').select(`
          *,
          tab_clientes ( nome ),
          base_produtos ( nome ),
          tab_proposta_itens ( valor_premio ),
          usuarios_perfis!tab_comissoes_corretor_id_fkey ( corretora_id )
        `);

      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', perfil.id);
      } else {
        query = query.eq('usuarios_perfis.corretora_id', perfil.corretora_id);
      }

      if (filtroStatus === 'aberto') {
        query = query.is('data_recebimento', null);
      } else if (filtroStatus === 'recebido') {
        query = query.not('data_recebimento', 'is', null);
      }

      const { data, error } = await query.order('data_vencimento_comissao', { ascending: true });
      if (error) throw error;
      setComissoes(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar lista");
    } finally {
      setLoading(false);
    }
  };

  const comissoesFiltradas = comissoes.filter(c => 
    c.tab_clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.nome_seguradora?.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAberto = comissoes.filter(c => !c.data_recebimento).reduce((acc, curr) => acc + (curr.valor_comissao || 0), 0);
  const totalRecebido = comissoes.filter(c => c.data_recebimento).reduce((acc, curr) => acc + (curr.valor_comissao || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 lg:p-8 transition-all">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com Totais */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Central de Comissões</h1>
          <div className="flex gap-4">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 shadow-sm">
               <div className="p-3 bg-amber-500/10 rounded-2xl"><Clock className="text-amber-600" size={20}/></div>
               <div>
                 <p className="text-[10px] font-black text-zinc-400 uppercase leading-none mb-1">Aberto</p>
                 <p className="text-xl font-black tracking-tighter">{maskCurrency(totalAberto * 100)}</p>
               </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 shadow-sm">
               <div className="p-3 bg-green-500/10 rounded-2xl"><CheckCircle2 className="text-green-600" size={20}/></div>
               <div>
                 <p className="text-[10px] font-black text-zinc-400 uppercase leading-none mb-1">Recebido</p>
                 <p className="text-xl font-black tracking-tighter">{maskCurrency(totalRecebido * 100)}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-zinc-900 p-3 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
           <div className="relative flex-1 group">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
             <input 
               type="text" 
               placeholder="BUSCAR POR CLIENTE OU SEGURADORA..." 
               value={busca} 
               onChange={(e) => setBusca(e.target.value)} 
               className="w-full bg-transparent pl-14 pr-6 py-4 text-xs font-black uppercase outline-none" 
             />
           </div>
           <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-[1.8rem] gap-1">
             {(['todos', 'aberto', 'recebido'] as const).map((s) => (
               <button 
                 key={s} 
                 onClick={() => setFiltroStatus(s)} 
                 className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${filtroStatus === s ? 'bg-white dark:bg-zinc-700 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
               >
                 {s}
               </button>
             ))}
           </div>
        </div>

        {/* Tabela de Dados */}
        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase">Cliente / Seguradora</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase">Vencimento</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-400 uppercase">Valor</th>
                  <th className="px-8 py-6 text-center text-[10px] font-black text-zinc-400 uppercase">Status</th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-32 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase text-zinc-400 animate-pulse tracking-widest">
                          Sincronizando com o banco...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : comissoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-32 text-center text-xs font-black uppercase text-zinc-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  comissoesFiltradas.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter leading-none mb-1.5">{c.tab_clientes?.nome || 'Cliente não identificado'}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.nome_seguradora}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-black text-zinc-700 dark:text-zinc-300">
                          <Calendar size={14} className="text-zinc-400" />
                          {new Date(c.data_vencimento_comissao).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-sm font-black text-green-600 tracking-tighter leading-none mb-1">
                          {maskCurrency(c.valor_comissao * 100)}
                        </p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase">{c.percentual_comissao}% comissão</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${c.data_recebimento ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {c.data_recebimento ? 'Liquidado' : 'Aguardando'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => { setComissaoSelecionada(c); setIsAjusteOpen(true); }} 
                          className="p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white rounded-2xl transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAjusteOpen && comissaoSelecionada && (
        <ModalComissoesAjuste 
          comissao={comissaoSelecionada}
          onClose={() => { setIsAjusteOpen(false); setComissaoSelecionada(null); }}
          onSuccess={() => { setIsAjusteOpen(false); fetchComissoes(); }}
        />
      )}
    </div>
  );
};