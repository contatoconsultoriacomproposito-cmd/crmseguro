import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { X, Save, Trash2, AlertCircle, Loader2, Percent } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { maskCurrency, parseCurrencyToNumber } from '../../../utils/masks';

interface ModalComissoesAjusteProps {
  comissao: {
    id: string;
    data_venda?: string;
    base_calculo_valor?: number;
    pct_comissao_venda?: number;
    tab_proposta_itens?: {
      valor_premio?: number;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalComissoesAjuste = ({ comissao, onClose, onSuccess }: ModalComissoesAjusteProps) => {
  const [salvando, setSalvando] = useState(false);
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false);
  
  // Ajustado estritamente para as colunas reais da tab_comissoes_regras
  const [dataVenda, setDataVenda] = useState(comissao.data_venda || '');
  const [valorMascarado, setValorMascarado] = useState("");
  const [percentualCalculado, setPercentualCalculado] = useState(comissao.pct_comissao_venda || 0);

  useEffect(() => {
    if (comissao.base_calculo_valor) {
      setValorMascarado(maskCurrency(comissao.base_calculo_valor * 100));
    }
  }, [comissao]);

  useEffect(() => {
    const valorNumerico = parseCurrencyToNumber(valorMascarado);
    const valorPremio = comissao?.tab_proposta_itens?.valor_premio || 0;
    if (valorPremio > 0) {
      setPercentualCalculado(Number(((valorNumerico / valorPremio) * 100).toFixed(2)));
    }
  }, [valorMascarado, comissao]);

  const handleSalvar = async () => {
    if (!dataVenda) {
      toast.error("A data de venda é obrigatória.");
      return;
    }

    setSalvando(true);
    try {
      // Removidos os campos fictícios 'data_recebimento' e 'status_comissao'
      const { error } = await supabase
        .from('tab_comissoes_regras')
        .update({
          data_venda: dataVenda,
          base_calculo_valor: parseCurrencyToNumber(valorMascarado),
          pct_comissao_venda: percentualCalculado
        })
        .eq('id', comissao.id);

      if (error) throw error;
      
      toast.success("Dados atualizados com sucesso!");
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar:", err.message);
      toast.error("Erro ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirDefinitivo = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('tab_comissoes_regras')
        .delete()
        .eq('id', comissao.id);

      if (error) throw error;
      
      toast.success("Regra de comissão apagada!");
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao excluir:", err.message);
      toast.error("Não foi possível excluir o registro.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50">
          <h3 className="font-black uppercase text-[10px] tracking-widest italic">Ajuste de Regra de Comissão</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={18}/>
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!isConfirmandoExclusao ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Data da Venda</label>
                  <input 
                    type="date" 
                    value={dataVenda} 
                    onChange={e => setDataVenda(e.target.value)} 
                    className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-blue-500 text-zinc-800 dark:text-zinc-100" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Valor Base</label>
                  <input 
                    type="text" 
                    value={valorMascarado} 
                    onChange={e => setValorMascarado(maskCurrency(e.target.value))} 
                    className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-green-500 text-green-600 dark:text-green-400" 
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 flex justify-between items-center border border-blue-100 dark:border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Percent size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Comissão Calculada</span>
                </div>
                <span className="text-sm font-black text-blue-700 dark:text-blue-400">{percentualCalculado}%</span>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={handleSalvar} 
                  disabled={salvando} 
                  className="flex-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-all disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Alterações
                </button>
                <button 
                  onClick={() => setIsConfirmandoExclusao(true)} 
                  className="p-4 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-2xl hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95">
              <div className="inline-flex p-4 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full mb-2">
                <AlertCircle size={32}/>
              </div>
              <div>
                <h4 className="font-black uppercase text-sm italic text-zinc-800 dark:text-zinc-200">Confirmar Exclusão?</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Essa ação é irreversível e removerá permanentemente a regra do banco de dados.</p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleExcluirDefinitivo} 
                  disabled={salvando} 
                  className="w-full bg-red-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {salvando ? "Excluindo..." : "Sim, apagar agora"}
                </button>
                <button 
                  onClick={() => setIsConfirmandoExclusao(false)} 
                  className="w-full text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};