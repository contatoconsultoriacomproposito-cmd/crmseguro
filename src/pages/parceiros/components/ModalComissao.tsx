import React from 'react';
import { DollarSign } from 'lucide-react';

interface ModalComissaoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formComissao: { valor_comissao: string; data_previsao_pagamento: string };
  setFormComissao: (val: any) => void;
  maskCurrency: (val: string) => string;
}

export const ModalComissao: React.FC<ModalComissaoProps> = ({ 
  isOpen, onClose, onConfirm, formComissao, setFormComissao, maskCurrency 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[400] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 uppercase italic">Dados Financeiros</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina o pagamento do parceiro</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-2 block tracking-widest">Valor da Comissão (R$)</label>
            <input 
              type="text" 
              className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:border-emerald-500 transition-all" 
              placeholder="0,00"
              value={formComissao.valor_comissao} 
              onChange={e => setFormComissao({...formComissao, valor_comissao: maskCurrency(e.target.value)})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-2 block tracking-widest">Previsão de Pagamento</label>
            <input 
              type="date" 
              className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:border-emerald-500 transition-all uppercase" 
              value={formComissao.data_previsao_pagamento} 
              onChange={e => setFormComissao({...formComissao, data_previsao_pagamento: e.target.value})} 
            />
          </div>
          
          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 h-16 font-black uppercase text-[10px] text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
            <button 
              onClick={onConfirm} 
              className="flex-[2] h-16 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"
            >
              Confirmar e Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};