// src/pages/portal/components/CardHistorico.tsx
import { Info, ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface CardProps {
  item: any;
  onClick: () => void;
  isRecusada?: boolean; // Adicionado para bater com a chamada do PortalParceiro
}

export const CardHistorico = ({ item, onClick, isRecusada }: CardProps) => {
  // 1. Identifica se o parceiro recusou a cotação
  // Usamos a prop enviada pelo pai OU calculamos localmente para garantir
  const renegociando = isRecusada || (
    item.status_indicacao === 'COTADO' && 
    item.tab_indicacoes_cotacoes?.[0]?.status_feedback === 'RECUSADO'
  );

  // 2. Define se o card é clicável
  const temAcao = ['NOVO', 'COTADO', 'VENDIDO', 'PERDIDO', 'APROVADA_PARCEIRO'].includes(item.status_indicacao);

  // 3. Define a cor da borda e estilo baseado no estado comercial
  const getBorderStyle = () => {
    // Se foi recusado pelo parceiro (Renegociação)
    if (renegociando) return 'border-red-400 bg-red-50/20 shadow-red-100';
    
    if (item.status_indicacao === 'VENDIDO') return 'border-emerald-500 shadow-emerald-50';
    if (item.status_indicacao === 'COTADO') return 'border-blue-500 scale-[1.02] shadow-blue-100';
    if (item.status_indicacao === 'PERDIDO') return 'border-slate-200 grayscale-[0.5]';
    return 'border-slate-100';
  };

  return (
    <div 
      onClick={() => temAcao && onClick()} 
      className={`bg-white p-5 rounded-[2rem] shadow-sm border-2 transition-all hover:shadow-md ${getBorderStyle()} ${temAcao ? 'cursor-pointer' : 'opacity-80'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] shadow-inner ${renegociando ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-blue-600'}`}>
            {item.nome_cliente?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="text-[16px] font-black text-slate-800 uppercase leading-none">
              {item.nome_cliente}
            </h4>
            <p className="text-[12px] font-bold text-slate-400 uppercase mt-1">
              {item.produto_interesse} • {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {/* Passamos isRecusada para o StatusBadge que corrigimos no primeiro passo */}
        <StatusBadge 
          status={item.status_indicacao} 
          isRecusada={renegociando} 
        />
      </div>

      {temAcao && (
        <div className={`flex items-center justify-between pt-4 mt-4 border-t border-slate-50 ${renegociando ? 'text-red-600' : 'text-blue-600'}`}>
          <span className="text-[13px] font-black uppercase flex items-center gap-1">
            <Info size={12}/> 
            {renegociando 
              ? 'Cotação Recusada - Aguardando Nova Opção' 
              : item.status_indicacao === 'VENDIDO' 
                ? 'Ver Dados da Comissão' 
                : 'Ver Detalhes e Feedback'}
          </span>
          <ChevronRight size={14} className={renegociando ? 'animate-pulse' : ''} />
        </div>
      )}
    </div>
  );
};