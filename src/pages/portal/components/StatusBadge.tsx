// src/pages/portal/components/StatusBadge.tsx
import { Clock, Loader2, CheckCircle2, ThumbsUp, PartyPopper, Ban } from "lucide-react";


export function StatusBadge({ status }: { status: string }) {
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'NOVO': return { label: 'RECEBIDO', color: 'bg-amber-100 text-amber-600', icon: <Clock size={10}/> };
      case 'EM_ATENDIMENTO': return { label: 'COTAÇÃO INICIADA', color: 'bg-blue-100 text-blue-600', icon: <Loader2 size={10} className="animate-spin"/> };
      case 'COTADO': return { label: 'COTAÇÃO REALIZADA', color: 'bg-emerald-500 text-white animate-bounce', icon: <CheckCircle2 size={10}/> };
      case 'APROVADA_PARCEIRO': return { label: 'COTAÇÃO ACEITA', color: 'bg-blue-600 text-white', icon: <ThumbsUp size={10}/> };
      case 'VENDIDO': return { label: 'CONCLUÍDO', color: 'bg-emerald-600 text-white', icon: <PartyPopper size={10}/> };
      case 'PERDIDO': case 'RECUSA_PARCEIRO': case 'RECUSA_CORRETOR': return { label: 'NÃO ATENDIDO', color: 'bg-red-50 text-red-500', icon: <Ban size={10}/> };
      default: return { label: status, color: 'bg-slate-100 text-slate-500', icon: null };
    }
  };

  const info = getStatusInfo(status);
  return (
    <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 ${info.color}`}>
      {info.icon} {info.label}
    </div>
  );
}