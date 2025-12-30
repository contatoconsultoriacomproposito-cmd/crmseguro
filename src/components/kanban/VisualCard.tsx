import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VisualCardHeader } from '../kanban/components_visual_card/VisualCardHeader';
import { TabContatos } from '../kanban/components_visual_card/TabContatos';
import { TabPropostas } from '../kanban/components_visual_card/TabPropostas';
import { TabProdutos } from '../kanban/components_visual_card/TabProdutos';
import { TabSinistros } from '../kanban/components_visual_card/TabSinistros';
import { TabComissoesCliente } from './components_visual_card/TabComissoesCliente';

export const VisualCard = ({ cliente, status, onUpdate }: any) => {
  const [abaAtiva, setAbaAtiva] = useState(1);
  const [expandido, setExpandido] = useState(false);

  const borderColors = {
    lead: 'border-[#7D6F00]',
    contato: 'border-[#1B451A]',
    negocicao: 'border-[#141757]'
  };

  const abas = [
    { id: 1, label: 'Contato' },
    { id: 2, label: 'Proposta' },
    { id: 3, label: 'Produtos' },
    { id: 4, label: 'Sinistros' },
    { id: 5, label: 'Comissões' }
  ];

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-[24px] border-2 ${borderColors[status as keyof typeof borderColors] || 'border-slate-200'} p-4 mb-4 shadow-sm transition-all`}>
      
      {/* HEADER COMPONENTIZADO */}
      <VisualCardHeader cliente={cliente} onUpdate={onUpdate} />

      {/* CONTROLE DE EXPANSÃO */}
      <div className="pt-2 mt-4 border-t border-slate-100 dark:border-zinc-800">
        <button 
          onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-center py-1 bg-slate-50 dark:bg-zinc-800/50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expandido && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
          {/* NAVEGAÇÃO DE ABAS */}
          <div className="flex gap-1 mb-3">
            {abas.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                  abaAtiva === aba.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {aba.label}
              </button>
            ))}
          </div>

          {/* CONTEÚDO DAS ABAS */}
          <div className="min-h-[120px] bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-3 relative">
            {abaAtiva === 1 && <TabContatos clienteId={cliente.id} onUpdate={onUpdate} />}
            {abaAtiva === 2 && <TabPropostas cliente={cliente} onUpdate={onUpdate} />}
            {abaAtiva === 3 && <TabProdutos clienteId={cliente.id} />}
            {abaAtiva === 4 && <TabSinistros clienteId={cliente.id} />}
            {abaAtiva === 5 && <TabComissoesCliente clienteId={cliente.id} />}
          </div>

         

          {/* RODAPÉ DO EXPANDIDO */}
          <div className="flex justify-between items-center px-1 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase">Corretor(a):</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase italic">
                {/* Agora ele tentará ler 'corretor' primeiro */}
                {cliente.corretor?.nome || cliente.usuarios_perfis?.nome || 'Não atribuído'}
              </span> 
            </div>
            <span className="text-[8px] font-black uppercase text-slate-400/50 tracking-widest">
              #{cliente.status_kanban}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};