import React from 'react';
import { format } from 'date-fns';
import { User, FileText } from 'lucide-react';

interface IndicacaoCardProps {
  ind: any;
  selecionadaId?: string;
  onClick: (ind: any) => void;
}

export const IndicacaoCard: React.FC<IndicacaoCardProps> = ({ ind, selecionadaId, onClick }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'VENDIDO': return 'bg-emerald-500 text-white';
      case 'APROVADA_PARCEIRO': return 'bg-emerald-100 text-emerald-600';
      case 'COTADO': return 'bg-purple-100 text-purple-600';
      case 'EM_ATENDIMENTO': return 'bg-blue-100 text-blue-600';
      case 'NOVO': return 'bg-orange-100 text-orange-600 animate-pulse';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div 
      onClick={() => onClick(ind)} 
      className={`group cursor-pointer p-5 rounded-[2rem] border-2 transition-all duration-300 ${
        selecionadaId === ind.id 
        ? 'border-blue-500 bg-white shadow-xl translate-x-2' 
        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusStyles(ind.status_indicacao)}`}>
          {ind.status_indicacao.replace('_', ' ')}
        </span>
        <span className="text-[9px] font-bold text-slate-400">
          {format(new Date(ind.created_at), "dd/MM/yyyy")}
        </span>
      </div>
      <h3 className="font-black text-slate-800 uppercase text-sm group-hover:text-blue-600 transition-colors">
        {ind.nome_cliente}
      </h3>
      <div className="flex items-center gap-4 mt-3">
        <p className="text-[9px] font-black text-slate-500 flex items-center gap-1.5 uppercase">
          <User size={12} className="text-blue-500"/> {ind.tab_parceiros?.nome_parceiro}
        </p>
        <p className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 uppercase">
          <FileText size={12} /> {ind.produto_interesse}
        </p>
      </div>
    </div>
  );
};