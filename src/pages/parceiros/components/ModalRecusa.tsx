import React from 'react';

interface ModalRecusaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formRecusa: { motivo: string; observacao: string };
  setFormRecusa: (val: any) => void;
  motivosRecusa: string[];
  loading: boolean;
}

export const ModalRecusa: React.FC<ModalRecusaProps> = ({ 
  isOpen, onClose, onConfirm, formRecusa, setFormRecusa, motivosRecusa, loading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in duration-300">
        <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6">Motivo da Recusa</h2>
        <select 
          className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold mb-4 outline-none focus:border-red-500" 
          value={formRecusa.motivo} 
          onChange={e => setFormRecusa({...formRecusa, motivo: e.target.value})}
        >
          <option value="">SELECIONE O MOTIVO...</option>
          {motivosRecusa.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <textarea 
          className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold h-24 mb-6 outline-none focus:border-red-500" 
          placeholder="OBSERVAÇÕES ADICIONAIS..." 
          value={formRecusa.observacao} 
          onChange={e => setFormRecusa({...formRecusa, observacao: e.target.value})} 
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 font-black uppercase text-[10px] text-slate-400">Voltar</button>
          <button 
            onClick={onConfirm}
            disabled={loading || !formRecusa.motivo}
            className="flex-[2] h-14 bg-red-500 text-white rounded-xl font-black uppercase text-[10px] hover:bg-red-600 shadow-lg shadow-red-100 disabled:opacity-50"
          >
            {loading ? "Processando..." : "Confirmar Recusa"}
          </button>
        </div>
      </div>
    </div>
  );
};