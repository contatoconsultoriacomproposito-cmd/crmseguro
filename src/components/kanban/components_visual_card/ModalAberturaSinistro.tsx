import { useState } from 'react';
import { X, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dados: {
    clienteId: string;
    produtoId: string;
    nomeProduto: string;
    propostaItemId: string;
    numeroApolice: string;
  };
}

export const ModalAberturaSinistro = ({ isOpen, onClose, onSuccess, dados }: ModalProps) => {
  const [carregando, setCarregando] = useState(false);
  const [relato, setRelato] = useState('');
  const [dataOcorrencia, setDataOcorrencia] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSalvar = async () => {
    if (!relato.trim()) return alert("Por favor, descreva o ocorrido.");
    
    setCarregando(true);
    try {
        // 1. Buscar corretora_id e corretor_id do cliente
        const { data: cliente, error: errCliente } = await supabase
        .from('tab_clientes')
        .select('corretora_id, corretor_id')
        .eq('id', dados.clienteId)
        .single();

        if (errCliente || !cliente) {
          throw new Error("Não foi possível localizar os dados de vínculo do cliente.");
        }

        // 2. Criar o Sinistro com os IDs vinculados
        const { data: sinistro, error: errSinistro } = await supabase
        .from('tab_sinistros')
        .insert([{
            cliente_id: dados.clienteId,
            corretora_id: cliente.corretora_id,
            corretor_id: cliente.corretor_id,
            item_id: dados.propostaItemId,
            status: 'Aberto',
            etapa_atual: 'Abertura'
        }])
        .select()
        .single();

        if (errSinistro) throw errSinistro;

        // 3. Criar a Ocorrência Inicial (AJUSTADO ABAIXO)
        const { error: errOcorrencia } = await supabase
        .from('tab_sinistros_ocorrencias')
        .insert([{
            sinistro_id: sinistro.id,
            etapa: 'Abertura',
            relato: `ABERTURA DE SINISTRO: ${relato}`,
            // ALTERAÇÃO AQUI: Usa a data selecionada pelo usuário
            data_ocorrencia: dataOcorrencia 
        }]);

        if (errOcorrencia) throw errOcorrencia;

        onSuccess();
        onClose();
    } catch (error: any) {
        alert("Erro ao abrir sinistro: " + error.message);
    } finally {
        setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-50 dark:border-zinc-800 flex justify-between items-center bg-red-50/50 dark:bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white leading-none">Abrir Sinistro</h3>
              <p className="text-[10px] font-bold text-red-500 uppercase mt-1">{dados.nomeProduto}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info Card */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase">Apólice</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{dados.numeroApolice || 'Não informada'}</span>
             </div>
             <div className="flex flex-col items-end text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase">Data do Fato</span>
                <input 
                  type="date"
                  value={dataOcorrencia}
                  onChange={(e) => setDataOcorrencia(e.target.value)}
                  className="text-xs font-bold bg-transparent border-none p-0 text-blue-600 focus:ring-0 text-right outline-none"
                />
             </div>
          </div>

          {/* Relato */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
              <FileText size={12} /> Descrição do Ocorrido
            </label>
            <textarea 
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              // ESTA LINHA É A CHAVE:
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Descreva brevemente o que aconteceu..."
              className="w-full h-32 p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 ring-red-500/20 resize-none outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvar}
            disabled={carregando}
            className="flex-[2] py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {carregando ? "Processando..." : <><CheckCircle2 size={16} /> Confirmar Abertura</>}
          </button>
        </div>
      </div>
    </div>
  );
};