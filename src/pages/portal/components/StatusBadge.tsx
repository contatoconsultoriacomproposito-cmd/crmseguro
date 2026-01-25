// src/pages/portal/components/StatusBadge.tsx
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  ThumbsUp, 
  PartyPopper, 
  Ban, 
  RefreshCcw, 
  XCircle 
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  // Alterado para opcional para não quebrar chamadas antigas
  isRenegociacao?: boolean; 
  // Adicionada nova flag específica para recusa do parceiro
  isRecusada?: boolean; 
}

export function StatusBadge({ status, isRenegociacao, isRecusada }: StatusBadgeProps) {
  const getStatusInfo = (status: string, isReneg: boolean, isRecus: boolean) => {
    
    // 1. PRIORIDADE MÁXIMA: Se o parceiro acabou de recusar (Status ainda é COTADO no banco)
    if (status === 'COTADO' && isRecus) {
      return { 
        label: 'COTAÇÃO RECUSADA', 
        color: 'bg-red-600 text-white shadow-lg shadow-red-100', 
        icon: <XCircle size={10} /> 
      };
    }

    // 2. SEGUNDA PRIORIDADE: Se o corretor já está buscando nova opção (isRenegociacao)
    if (isReneg) {
      return { 
        label: 'BUSCANDO NOVA OPÇÃO', 
        color: 'bg-amber-100 text-amber-600 border border-amber-200', 
        icon: <RefreshCcw size={10} className="animate-spin-slow" /> 
      };
    }

    // 3. STATUS PADRÃO DO FLUXO
    switch(status) {
      case 'NOVO': 
        return { 
          label: 'RECEBIDO', 
          color: 'bg-amber-100 text-amber-600', 
          icon: <Clock size={10}/> 
        };
      
      case 'EM_ATENDIMENTO': 
        return { 
          label: 'COTAÇÃO INICIADA', 
          color: 'bg-blue-100 text-blue-600', 
          icon: <Loader2 size={10} className="animate-spin"/> 
        };
      
      case 'COTADO': 
        return { 
          label: 'COTAÇÃO DISPONÍVEL', 
          color: 'bg-emerald-500 text-white animate-pulse', 
          icon: <CheckCircle2 size={10}/> 
        };
        
      case 'APROVADA_PARCEIRO': 
        return { 
          label: 'COTAÇÃO ACEITA', 
          color: 'bg-blue-600 text-white', 
          icon: <ThumbsUp size={10}/> 
        };
      
      case 'VENDIDO': 
        return { 
          label: 'CONCLUÍDO', 
          color: 'bg-emerald-600 text-white', 
          icon: <PartyPopper size={10}/> 
        };
      
      case 'PERDIDO': 
        return { 
          label: 'NÃO ATENDIDO', 
          color: 'bg-red-50 text-red-500 border border-red-100', 
          icon: <Ban size={10}/> 
        };
      
      default: 
        return { 
          label: status?.replace('_', ' ') || 'STATUS', 
          color: 'bg-slate-100 text-slate-500', 
          icon: null 
        };
    }
  };

  const info = getStatusInfo(status, !!isRenegociacao, !!isRecusada);

  return (
    <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 transition-all duration-300 ${info.color}`}>
      {info.icon} 
      <span>{info.label}</span>
    </div>
  );
}