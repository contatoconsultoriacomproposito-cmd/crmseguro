import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sincronizarStatusCliente } from './sincronizarStatusCliente';

interface ModalExclusaoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void; // Esta função agora deve ser a que deleta no banco
  clienteId: string; // Adicionado para permitir o sincronismo
  dadosCriticos: {
    sinistros: number;
    comissoes: number;
    isVendido: boolean;
  };
}

export const ModalExclusaoSegura = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  clienteId, 
  dadosCriticos 
}: ModalExclusaoProps) => {

  // Criamos uma função interna para garantir que o sincronismo ocorra após a exclusão
  const handleConfirmAction = async () => {
    try {
      // 1. Executa a exclusão (que vem via props do componente pai)
      await onConfirm();
      
      // 2. Dispara o cérebro de sincronização para reavaliar o cliente
      // Se era a última venda, o cliente voltará para 'novo' ou 'perdido' automaticamente
      if (clienteId) {
        await sincronizarStatusCliente(clienteId);
      }
    } catch (error) {
      console.error("Erro ao processar exclusão e sincronismo:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-red-100/50">
                  <AlertTriangle size={28} />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-3 leading-none">
                Confirmar Exclusão?
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {dadosCriticos.isVendido 
                    ? "Esta proposta está marcada como VENDIDA. A exclusão removerá permanentemente todos os registros vinculados e reclassificará o status do cliente:" 
                    : "Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita e removerá todas as opções cadastradas."}
                </p>

                {dadosCriticos.isVendido && (dadosCriticos.sinistros > 0 || dadosCriticos.comissoes > 0) && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sinistros e Ocorrências</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-black">{dadosCriticos.sinistros}</span>
                    </div>
                    <div className="h-[1px] bg-slate-200/50 w-full" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Lançamentos de Comissão</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-black">{dadosCriticos.comissoes}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmAction} 
                  className="flex-1 py-4 rounded-2xl text-xs font-black text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all uppercase tracking-widest"
                >
                  Excluir Tudo
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};