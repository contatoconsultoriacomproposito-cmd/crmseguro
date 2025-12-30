import { Pencil, Trash2, Building2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface HeaderProps {
  cliente: any;
  onUpdate: () => void;
}

export const VisualCardHeader = ({ cliente, onUpdate }: HeaderProps) => {
  const navigate = useNavigate();
  const isPJ = cliente.tipo_cliente === 'PJ';

  const badgeConfig = isPJ 
    ? { 
        bg: 'bg-amber-100 dark:bg-amber-900/30', 
        text: 'text-amber-700 dark:text-amber-400', 
        icon: <Building2 size={14} />, 
        label: 'PJ - Empresa' 
      }
    : { 
        bg: 'bg-blue-100 dark:bg-blue-900/30', 
        text: 'text-blue-700 dark:text-blue-400', 
        icon: <User size={14} />, 
        label: 'PF - Individual' 
      };

  const handleDeletarCliente = async () => {
    if (window.confirm(`Tem certeza que deseja excluir ${cliente.nome || cliente.razao_social}?`)) {
      const { error } = await supabase.from('tab_clientes').delete().eq('id', cliente.id);
      if (!error && onUpdate) onUpdate();
    }
  };

  const verificarAtraso = (dataRetorno: string) => {
    if (!dataRetorno) return false;
    const [ano, mes, dia] = dataRetorno.split('-').map(Number);
    const dataAgendada = new Date(ano, mes - 1, dia, 23, 59);
    return dataAgendada < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${badgeConfig.bg} ${badgeConfig.text} border border-current/10`}>
          {badgeConfig.icon}
          <span className="text-[11px] font-black uppercase tracking-tight">{badgeConfig.label}</span>
        </div>

        <div className="flex gap-1">
          <button 
            onClick={() => navigate(`/clientes/editar/${cliente.id}`)}
            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={handleDeletarCliente}
            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-1">
          <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase leading-tight line-clamp-2">
            {isPJ ? (cliente.razao_social || cliente.nome_fantasia) : cliente.nome}
          </h3>
          <p className="text-[11px] text-slate-400 font-bold">
            {isPJ ? `CNPJ: ${cliente.cnpj}` : `CPF: ${cliente.cpf}`}
          </p>
        </div>

        <div className="col-span-1 text-right flex flex-col items-end">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Data Retorno</p>
          <p className={`text-[12px] font-bold ${cliente.data_retorno ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            {cliente.data_retorno ? cliente.data_retorno.split('-').reverse().join('/') : 'NÃO DEFINIDO'}
          </p>
          {verificarAtraso(cliente.data_retorno) && (
            <span className="mt-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">
              Atrasado
            </span>
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
           <span className="text-[10px] text-slate-400 font-black uppercase w-14">Whats:</span> {cliente.telefone_whats}
        </p>
        <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
           <span className="text-[10px] text-slate-400 font-black uppercase w-14">E-mail:</span> {cliente.email}
        </p>
      </div>
    </div>
  );
};