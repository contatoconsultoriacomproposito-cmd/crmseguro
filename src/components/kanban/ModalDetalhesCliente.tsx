import React from 'react';
import { X } from 'lucide-react';
import { VisualCard } from './VisualCard';

interface ModalProps {
  cliente: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ModalDetalhesCliente = ({ cliente, isOpen, onClose, onUpdate }: ModalProps) => {
  if (!isOpen) return null;

  // Fecha o modal ao clicar no fundo escuro
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 pt-10 sm:pt-20"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl animate-in zoom-in-95 duration-200">
        
        {/* BOTÃO FECHAR EXTERNO (Para facilitar o uso em telas menores) */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-colors"
        >
          <span>Fechar</span>
          <X size={24} />
        </button>

        {/* CONTAINER DO CONTEÚDO */}
        <div className="bg-transparent shadow-2xl rounded-[32px]">
          {/* REUSO TOTAL: Chamamos o seu VisualCard original. 
             Como ele já tem as abas, botões e lógicas, ele funcionará 
             exatamente como antes, mas agora com largura total disponível.
          */}
          <VisualCard 
            cliente={cliente} 
            status={cliente.fase_kanban} 
            onUpdate={onUpdate} 
            isModal={true} // Adicione isso aqui
            />
        </div>
      </div>
    </div>
  );
};