import { Building2, User, AlertCircle } from 'lucide-react';

interface SlimProps {
  cliente: any;
  // Removi o onUpdate pois ele não é mais usado aqui dentro
}

export const VisualCardSlim = ({ cliente }: SlimProps) => {
  // Removi o useNavigate e supabase
  const isPJ = cliente.tipo_cliente === 'PJ';

  const borderColors = {
    lead: 'border-l-[#7D6F00]',
    contato: 'border-l-[#1B451A]',
    negociacao: 'border-l-[#141757]'
  };

  const verificarAtraso = (dataRetorno: string) => {
    if (!dataRetorno) return false;
    const [ano, mes, dia] = dataRetorno.split('-').map(Number);
    const dataAgendada = new Date(ano, mes - 1, dia, 23, 59);
    return dataAgendada < new Date();
  };

  const atrasado = verificarAtraso(cliente.data_retorno);

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 border-l-4 ${borderColors[cliente.fase_kanban as keyof typeof borderColors] || 'border-l-slate-400'} p-3 shadow-sm hover:shadow-md transition-all group`}>
      
      <div className="flex justify-between items-center mb-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${isPJ ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
          {isPJ ? <Building2 size={10} /> : <User size={10} />}
          {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-black text-slate-800 dark:text-white text-[12px] uppercase leading-tight line-clamp-1">
          {isPJ ? (cliente.razao_social || cliente.nome_fantasia) : cliente.nome}
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase">
          {isPJ ? `CNPJ: ${cliente.cnpj}` : `CPF: ${cliente.cpf}`}
        </p>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-50 dark:border-zinc-800 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Retorno</span>
          <span className={`text-[11px] font-bold ${atrasado ? 'text-red-600' : 'text-blue-600'}`}>
            {cliente.data_retorno ? cliente.data_retorno.split('-').reverse().join('/') : '--/--/--'}
          </span>
        </div>

        {atrasado && (
          <div className="flex items-center gap-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase animate-pulse">
            <AlertCircle size={10} />
            Atrasado
          </div>
        )}
      </div>
    </div>
  );
};