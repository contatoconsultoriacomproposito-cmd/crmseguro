import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Shield, Percent, Receipt, Wallet, Layers } from 'lucide-react';

interface TabComissoesClienteProps {
  clienteId: string;
}

interface ComissaoRegraCliente {
  id: string;
  base_calculo_valor: number;
  tipo_recorrencia: string;
  quantidade_parcelas: number;
  data_venda: string;
  pct_comissao_venda: number | null;
  pct_corretor: number;
  base_produtos?: { nome: string } | null;
  base_seguradoras?: { nome: string } | null;
}

export const TabComissoesCliente = ({ clienteId }: TabComissoesClienteProps) => {
  const [comissoes, setComissoes] = useState<ComissaoRegraCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComissoesCliente = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('tab_comissoes_regras')
          .select(`
            id,
            base_calculo_valor,
            tipo_recorrencia,
            quantidade_parcelas,
            data_venda,
            pct_comissao_venda,
            pct_corretor,
            base_produtos ( nome ),
            base_seguradoras ( nome )
          `)
          .eq('cliente_id', clienteId)
          .order('data_venda', { ascending: false });

        if (error) {
          console.error("Erro detalhado do Supabase:", error.message);
          throw error;
        }

        setComissoes((data as any) || []);
      } catch (err) {
        console.error("Erro ao buscar histórico de comissoes do cliente:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (clienteId) {
      fetchComissoesCliente();
    }
  }, [clienteId]);

  if (loading) {
    return (
      <div className="text-[10px] font-black text-center py-10 uppercase animate-pulse text-slate-400">
        Buscando histórico...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comissoes.length === 0 ? (
        <div className="text-[10px] font-bold text-slate-400 text-center py-10 uppercase italic">
          Nenhuma comissão registrada para este cliente.
        </div>
      ) : (
        comissoes.map((com) => {
          // Extração segura dos valores numéricos para evitar quebras por valores nulos
          const baseCalculo = com.base_calculo_valor || 0;
          const pctComissaoVenda = com.pct_comissao_venda || 0;
          const pctCorretor = com.pct_corretor || 0;

          // Cálculo dos indicadores financeiros baseados nas fórmulas de porcentagem
          const valorGeradoComissao = baseCalculo * (pctComissaoVenda / 100);
          const valorCorretor = valorGeradoComissao * (pctCorretor / 100);
          const valorCorretora = valorGeradoComissao * (1 - (pctCorretor / 100));

          return (
            <div key={com.id} className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              
              {/* Seção Esquerda: Identificação do Produto e Seguradora */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tighter">
                  {com.base_produtos?.nome || 'PRODUTO NÃO ESPECIFICADO'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Shield size={11} className="text-blue-500" />
                    <span className="text-[9px] font-bold uppercase">
                      {com.base_seguradoras?.nome || 'SEGURADORA NÃO ESPECIFICADA'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400 border-l border-slate-200 dark:border-zinc-800 pl-2">
                    <Layers size={11} className="text-purple-500" />
                    <span className="text-[9px] font-bold uppercase">
                      {com.tipo_recorrencia} ({com.quantidade_parcelas}x)
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção Central: Parâmetros e Alíquotas de Rateio */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 border-t border-b md:border-t-0 md:border-b-0 border-slate-100 dark:border-zinc-800 py-2 md:py-0 w-full md:w-auto">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">Base de Cálculo</span>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                    R$ {baseCalculo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">Comissão Venda</span>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-0.5">
                    {pctComissaoVenda}% <Percent size={8} className="text-zinc-400" />
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">Split Corretor</span>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-0.5">
                    {pctCorretor}% <Percent size={8} className="text-zinc-400" />
                  </span>
                </div>
              </div>

              {/* Seção Direita: Resultados Financeiros Calculados */}
              <div className="flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end w-full md:w-auto gap-1">
                <div className="text-left md:text-right">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block">Comissão Gerada</span>
                  <div className="flex items-center md:justify-end gap-1 text-[11px] font-black text-green-600">
                    <Receipt size={12} />
                    R$ {valorGeradoComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="text-right mt-1">
                  <div className="flex gap-2 text-[9px] font-medium text-zinc-500">
                    <span className="flex items-center gap-0.5">
                      <Wallet size={10} className="text-amber-500" />
                      Ctrt: R$ {valorCorretor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-0.5 border-l border-slate-200 dark:border-zinc-800 pl-2">
                      <Shield size={10} className="text-teal-500" />
                      Ctria: R$ {valorCorretora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1">
                    Venda: {com.data_venda ? new Date(com.data_venda).toLocaleDateString('pt-BR') : '---'}
                  </p>
                </div>
              </div>

            </div>
          );
        })
      )}
    </div>
  );
};