import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { X, Save, Trash2, AlertCircle, Loader2, Percent } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { maskCurrency, parseCurrencyToNumber } from '../../../utils/masks';

interface ModalComissoesAjusteProps {
  comissao: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalComissoesAjuste = ({ comissao, onClose, onSuccess }: ModalComissoesAjusteProps) => {
  const [salvando, setSalvando] = useState(false);
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false);
  
  const [vencimento, setVencimento] = useState(comissao.data_vencimento_comissao || '');
  const [valorMascarado, setValorMascarado] = useState("");
  const [recebimento, setRecebimento] = useState(comissao.data_recebimento || '');
  const [percentualCalculado, setPercentualCalculado] = useState(comissao.percentual_comissao || 0);

  useEffect(() => {
    if (comissao.valor_comissao) {
      setValorMascarado(maskCurrency(comissao.valor_comissao * 100));
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
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('tab_comissoes')
        .update({
          data_vencimento_comissao: vencimento,
          valor_comissao: parseCurrencyToNumber(valorMascarado),
          percentual_comissao: percentualCalculado,
          data_recebimento: recebimento || null,
          status_comissao: recebimento ? 'RECEBIDA' : 'PENDENTE',
          updated_at: new Date().toISOString()
        })
        .eq('id', comissao.id);

      if (error) throw error;
      toast.success("Dados atualizados!");
      onSuccess();
    } catch (err) {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirDefinitivo = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('tab_comissoes')
        .delete()
        .eq('id', comissao.id);

      if (error) throw error;
      toast.success("Lançamento apagado com sucesso!");
      onSuccess();
    } catch (err) {
      toast.error("Não foi possível excluir.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50">
          <h3 className="font-black uppercase text-[10px] tracking-widest italic">Ajuste de Comissão</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full"><X size={18}/></button>
        </div>

        <div className="p-8 space-y-6">
          {!isConfirmandoExclusao ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Vencimento</label>
                  <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Valor</label>
                  <input type="text" value={valorMascarado} onChange={e => setValorMascarado(maskCurrency(e.target.value))} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-green-500 text-green-600" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 flex justify-between items-center border border-blue-100 dark:border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Percent size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase text-blue-600">Comissão Calculada</span>
                </div>
                <span className="text-sm font-black text-blue-700">{percentualCalculado}%</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Data de Recebimento</label>
                <input type="date" value={recebimento} onChange={e => setRecebimento(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-green-500" />
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={handleSalvar} disabled={salvando} className="flex-1 bg-zinc-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 transition-all">
                  {salvando ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Alterações
                </button>
                <button onClick={() => setIsConfirmandoExclusao(true)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                  <Trash2 size={16}/>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95">
              <div className="inline-flex p-4 bg-red-100 text-red-600 rounded-full mb-2"><AlertCircle size={32}/></div>
              <div>
                <h4 className="font-black uppercase text-sm italic">Confirmar Exclusão?</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Essa ação é irreversível e removerá o dado do banco.</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleExcluirDefinitivo} disabled={salvando} className="w-full bg-red-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase">
                  {salvando ? "Excluindo..." : "Sim, apagar agora"}
                </button>
                <button onClick={() => setIsConfirmandoExclusao(false)} className="w-full text-[10px] font-black uppercase text-zinc-400 py-2">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};