import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { CheckCircle2, Clock, Shield } from 'lucide-react';

export const TabComissoesCliente = ({ clienteId }: { clienteId: string }) => {
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComissoesCliente = async () => {
      try {
        const { data, error } = await supabase
          .from('tab_comissoes')
          .select(`
            *,
            base_produtos ( nome )
          `)
          .eq('cliente_id', clienteId)
          .order('data_vencimento_comissao', { ascending: false });

        if (error) throw error;
        setComissoes(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComissoesCliente();
  }, [clienteId]);

  if (loading) return <div className="text-[10px] font-black text-center py-10 uppercase animate-pulse">Buscando histórico...</div>;

  return (
    <div className="space-y-2">
      {comissoes.length === 0 ? (
        <div className="text-[10px] font-bold text-slate-400 text-center py-10 uppercase italic">
          Nenhuma comissão registrada para este cliente.
        </div>
      ) : (
        comissoes.map((com) => (
          <div key={com.id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tighter">
                {com.base_produtos?.nome}
              </span>
              <div className="flex items-center gap-1">
                <Shield size={10} className="text-blue-500" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase">{com.nome_seguradora}</span>
              </div>
            </div>

            <div className="text-right">
              <div className={`flex items-center justify-end gap-1 text-[10px] font-black ${com.data_recebimento ? 'text-green-600' : 'text-amber-500'}`}>
                {com.data_recebimento ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                R$ {com.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[8px] font-bold text-zinc-400 uppercase">Venc: {new Date(com.data_vencimento_comissao).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};