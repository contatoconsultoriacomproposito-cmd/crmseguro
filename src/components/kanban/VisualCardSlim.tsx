import { Pencil, Trash2, Building2, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

interface SlimProps {
  cliente: any;
  onUpdate: () => void;
}

export const VisualCardSlim = ({ cliente, onUpdate }: SlimProps) => {
  const navigate = useNavigate();
  const isPJ = cliente.tipo_cliente === 'PJ';

  // Cores de borda baseadas na fase (mantendo sua lógica original)
  const borderColors = {
    lead: 'border-l-[#7D6F00]',
    contato: 'border-l-[#1B451A]',
    negociacao: 'border-l-[#141757]'
  };

  const handleDeletarCliente = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede de abrir o modal ao clicar em excluir
    if (window.confirm(`Tem certeza que deseja excluir ${cliente.nome || cliente.razao_social}?`)) {
      const { error } = await supabase.from('tab_clientes').delete().eq('id', cliente.id);
      if (!error && onUpdate) onUpdate();
    }
  };

  const handleEditar = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede de abrir o modal ao clicar em editar
    navigate(`/clientes/editar/${cliente.id}`);
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
      
      {/* LINHA SUPERIOR: BADGE E AÇÕES */}
      <div className="flex justify-between items-center mb-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${isPJ ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
          {isPJ ? <Building2 size={10} /> : <User size={10} />}
          {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleEditar} className="p-1 hover:bg-blue-50 text-blue-600 rounded-md">
            <Pencil size={14} />
          </button>
          <button onClick={handleDeletarCliente} className="p-1 hover:bg-red-50 text-red-600 rounded-md">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="space-y-1">
        <h3 className="font-black text-slate-800 dark:text-white text-[12px] uppercase leading-tight line-clamp-1">
          {isPJ ? (cliente.razao_social || cliente.nome_fantasia) : cliente.nome}
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase">
          {isPJ ? `CNPJ: ${cliente.cnpj}` : `CPF: ${cliente.cpf}`}
        </p>
      </div>

      {/* LINHA INFERIOR: DATA E STATUS */}
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