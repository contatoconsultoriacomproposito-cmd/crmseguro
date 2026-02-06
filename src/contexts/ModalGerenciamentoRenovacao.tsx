import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { X, Calendar, Clock, RefreshCw, ShieldCheck, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ModalRenovacao from '../pages/propostas/ModalRenovacao';

interface ModalProps {
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalGerenciamentoRenovacao: React.FC<ModalProps> = ({ itemId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [showVinculoModal, setShowVinculoModal] = useState(false);

  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('09:00');

  useEffect(() => {
    async function buscarDetalhes() {
      try {
        setLoading(true);
        // Refatoramos a query para garantir que o caminho até o cliente_id seja sólido
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
                cliente_id, 
                tab_clientes (nome) 
              ) 
            )
          `)
          .eq('id', itemId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Item não encontrado");
          onClose();
          return;
        }

        setDados(data);
        setNovaData(data.data_renovacao || '');
        setNovoHorario(data.horario_renovacao?.slice(0, 5) || '09:00');
      } catch (err) {
        console.error("Erro ao carrergar dados do modal:", err);
        toast.error("Erro ao carregar dados");
        onClose();
      } finally {
        setLoading(false);
      }
    }
    
    if (itemId) buscarDetalhes();
  }, [itemId]);

  const handleReagendar = async () => {
    if (!novaData) {
      toast.error("Selecione uma data para o reagendamento");
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tab_proposta_itens')
        .update({ 
          data_renovacao: novaData, 
          horario_renovacao: novoHorario,
          notificacao_ativa: true,
          status_renovacao: 'PENDENTE'
        })
        .eq('id', itemId);

      if (error) throw error;
      
      toast.success("Reagendado com sucesso!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro no update:", err);
      toast.error("Erro ao reagendar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  // Lógica segura para extrair o cliente_id e nome, tratando se vier como array ou objeto único
  const vinculoRaw = dados?.tab_proposta_opcoes;
  const infoProposta = Array.isArray(vinculoRaw) 
    ? vinculoRaw[0]?.tab_propostas 
    : vinculoRaw?.tab_propostas;

  const itemOriginalParaVinculo = {
    id_item: itemId,
    cliente: infoProposta?.tab_clientes?.nome || 'Cliente não identificado',
    cliente_id: infoProposta?.cliente_id
  };

  return (
    <>
      <div className="fixed inset-0 z-[998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
          
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                Gestão de Renovação
              </span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-2 leading-tight">
                {itemOriginalParaVinculo.cliente}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-zinc-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                <p className="text-xs font-medium uppercase tracking-wider">
                  {dados?.base_produtos?.nome || 'Produto'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Cards de Vigência */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-around items-center text-center">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Início Vigência</p>
                <p className="text-sm font-semibold dark:text-zinc-200">
                  {dados?.data_inicio_vigencia 
                    ? format(new Date(dados.data_inicio_vigencia + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                    : '--/--/----'}
                </p>
              </div>
              <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-700" />
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Fim Vigência</p>
                <p className="text-sm font-semibold italic dark:text-zinc-200">
                  {dados?.data_fim_vigencia 
                    ? format(new Date(dados.data_fim_vigencia + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                    : '--/--/----'}
                </p>
              </div>
            </div>

            {/* BOTÃO DE VÍNCULO - ONDE DISPARAVA O ERRO */}
            <button 
              type="button"
              onClick={() => {
                if (!itemOriginalParaVinculo.cliente_id) {
                  toast.error("Erro: ID do cliente não encontrado para vincular.");
                  return;
                }
                setShowVinculoModal(true);
              }}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 group"
            >
              <Link2 size={20} className="group-hover:rotate-12 transition-transform" />
              VINCULAR RENOVAÇÃO / PERDA
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-zinc-400 uppercase">ou reagendar alerta</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>

            {/* Campos de Reagendamento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Data do Alerta</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-3 text-zinc-400" />
                  <input 
                    type="date" 
                    value={novaData} 
                    onChange={(e) => setNovaData(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Horário</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-3 text-zinc-400" />
                  <input 
                    type="time" 
                    value={novoHorario} 
                    onChange={(e) => setNovoHorario(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé de Ação */}
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col gap-3">
            <button 
              onClick={handleReagendar} 
              disabled={saving} 
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-amber-200 dark:shadow-none"
            >
              <RefreshCw size={18} className={saving ? "animate-spin" : ""} /> 
              {saving ? "SALVANDO..." : "SALVAR REAGENDAMENTO"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Renovação (Vinculação) */}
      {showVinculoModal && (
        <ModalRenovacao 
          isOpen={showVinculoModal}
          onClose={() => setShowVinculoModal(false)}
          itemOriginal={itemOriginalParaVinculo}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
        />
      )}
    </>
  );
};