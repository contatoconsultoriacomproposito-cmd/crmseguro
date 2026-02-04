import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { X, Calendar, Clock, Trash2, RefreshCw, ShieldCheck, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ModalProps {
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalGerenciamentoRenovacao: React.FC<ModalProps> = ({ itemId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dados, setDados] = useState<any>(null);

  // Estados para edição (Reagendamento)
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('09:00');

  useEffect(() => {
    async function buscarDetalhes() {
      try {
        // Agora buscando produto e vigências direto na tab_proposta_itens
        const { data, error } = await supabase
          .from('tab_proposta_itens')
          .select(`
            id, 
            data_renovacao, 
            horario_renovacao,
            data_inicio_vigencia,
            data_fim_vigencia,
            base_produtos (nome),
            tab_proposta_opcoes (
              tab_propostas (
                tab_clientes (nome)
              )
            )
          `)
          .eq('id', itemId)
          .single();

        if (error) throw error;
        
        setDados(data);
        setNovaData(data.data_renovacao || '');
        setNovoHorario(data.horario_renovacao?.slice(0, 5) || '09:00');
      } catch (err) {
        console.error("Erro ao buscar detalhes da renovação:", err);
        toast.error("Erro ao carregar dados da renovação");
        onClose();
      } finally {
        setLoading(false);
      }
    }
    buscarDetalhes();
  }, [itemId, onClose]);

  const handleExcluirNotificacao = async () => {
    if (!confirm("Isso removerá o alerta permanentemente. Confirmar?")) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tab_proposta_itens')
        .update({ notificacao_ativa: false })
        .eq('id', itemId);

      if (error) throw error;
      toast.success("Notificação desativada.");
      onSuccess();
    } catch (err) {
      toast.error("Erro ao desativar");
    } finally {
      setSaving(false);
    }
  };

  const handleReagendar = async () => {
    if (!novaData) return toast.error("Selecione uma data");

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tab_proposta_itens')
        .update({ 
          data_renovacao: novaData, 
          horario_renovacao: novoHorario,
          notificacao_ativa: true 
        })
        .eq('id', itemId);

      if (error) throw error;
      toast.success("Reagendado!");
      onSuccess();
    } catch (err) {
      toast.error("Erro ao reagendar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  // Mapeamento baseado no seu SQL
  const nomeCliente = dados?.tab_proposta_opcoes?.tab_propostas?.tab_clientes?.nome || 'Cliente não identificado';
  const nomeProduto = dados?.base_produtos?.nome || 'Produto não informado';
  
  const formatarData = (dataStr: string) => {
    if (!dataStr) return '--/--/----';
    const date = new Date(dataStr + 'T12:00:00');
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
              Gestão de Renovação
            </span>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-2 leading-tight">
              {nomeCliente}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-zinc-500">
              <ShieldCheck size={14} className="text-emerald-500" />
              <p className="text-xs font-medium uppercase tracking-wider">{nomeProduto}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Vigência Extraída da tab_proposta_itens */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-around items-center text-center">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1 tracking-tighter">Início Vigência</p>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {formatarData(dados?.data_inicio_vigencia)}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-700" />
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1 tracking-tighter">Fim Vigência</p>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 italic">
                {formatarData(dados?.data_fim_vigencia)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Data do Alerta</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-zinc-400" />
                <input 
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Horário</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-3 text-zinc-400" />
                <input 
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl flex gap-3">
             <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
             <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-snug">
               <strong>Dica:</strong> Reagende o contato para alguns dias antes do fim da vigência ({formatarData(dados?.data_fim_vigencia)}).
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col gap-3">
          <button
            onClick={handleReagendar}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={saving ? "animate-spin" : ""} />
            SALVAR REAGENDAMENTO
          </button>
          
          <button
            onClick={handleExcluirNotificacao}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 font-bold text-[11px] py-2 transition-colors uppercase tracking-tight"
          >
            <Trash2 size={14} />
            Remover notificação permanentemente
          </button>
        </div>
      </div>
    </div>
  );
};