// src/pages/portal/components/CardHistorico.tsx
import { Info, ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface CardProps {
  item: any;
  onClick: () => void;
}

export const CardHistorico = ({ item, onClick }: CardProps) => {
  const temAcao = ['NOVO', 'COTADO', 'VENDIDO', 'PERDIDO', 'APROVADA_PARCEIRO', 'RECUSA_PARCEIRO', 'RECUSA_CORRETOR'].includes(item.status_indicacao);

  return (
    <div 
      onClick={() => temAcao && onClick()} 
      className={`bg-white p-5 rounded-[2rem] shadow-sm border-2 transition-all hover:shadow-md ${item.status_indicacao === 'COTADO' ? 'border-emerald-500 scale-[1.02]' : 'border-slate-100'} ${temAcao ? 'cursor-pointer' : 'opacity-80'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-[10px] text-blue-600 shadow-inner">
            {item.nome_cliente.substring(0,2)}
          </div>
          <div>
            <h4 className="text-[11px] font-black text-slate-800 uppercase leading-none">{item.nome_cliente}</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
              {item.produto_interesse} • {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <StatusBadge status={item.status_indicacao} />
      </div>
      {temAcao && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50 text-blue-600">
          <span className="text-[9px] font-black uppercase flex items-center gap-1">
            <Info size={12}/> {item.status_indicacao === 'VENDIDO' ? 'Ver Dados da Comissão' : 'Ver Detalhes e Feedback'}
          </span>
          <ChevronRight size={14} />
        </div>
      )}
    </div>
  );
};