import React, { useState, useEffect } from 'react';
import {
DndContext,
pointerWithin,
KeyboardSensor,
PointerSensor,
useSensor,
useSensors,
DragOverlay,
useDroppable,
type DragStartEvent,
type DragEndEvent,
} from '@dnd-kit/core';
import {
SortableContext,
sortableKeyboardCoordinates,
verticalListSortingStrategy,
arrayMove
} from '@dnd-kit/sortable';

import { supabase } from '../../lib/supabaseClient';
import {
MessageCircle,
FileText,
Eraser,
UserSearch,
AlertOctagon
} from 'lucide-react';
import { SortableCard } from '../../components/kanban/SortableCard';
import { BuscaGlobal } from '../../components/BuscaGlobal';
import { ModalFechamento } from '../../components/propostas/ModalFechamento';
import { maskCurrency, parseCurrencyToNumber } from '../../utils/masks';
import { toast } from 'react-hot-toast';
import { useKanbanConfig } from './useKanbanConfig';
import { MenuConfigColuna } from './MenuConfigColuna';

interface Cliente {
id: string;
nome?: string;
razao_social?: string;
nome_razao_social?: string;
tipo_cliente: 'PF' | 'PJ';
status_kanban: string;
fase_kanban: string;
posicao_kanban: number;
data_retorno?: string;
horario_retorno?: string;
tab_propostas?: any[];
tab_interacoes_v2?: any[];
usuarios_perfis?: { nome: string };
}

export default function KanbanVendas() {
const [clientes, setClientes] = useState<Cliente[]>([]);
const [activeId, setActiveId] = useState<string | null>(null);
const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);

const { colunas, loading: loadingConfig, refresh } = useKanbanConfig('vendas');

const [termoBusca, setTermoBusca] = useState('');
const [corretorBusca, setCorretorBusca] = useState('');
const [dataInicio, setDataInicio] = useState('');
const [dataFim, setDataFim] = useState('');
const [valorMin, setValorMin] = useState('');
const [valorMax, setValorMax] = useState('');

const [modalImpedimento, setModalImpedimento] = useState<{
isOpen: boolean;
mensagem: string;
}>({
isOpen: false,
mensagem: '',
});

const [modalFechamento, setModalFechamento] = useState<{
isOpen: boolean;
tipo: 'VENDIDO' | 'PERDIDO' | null;
propostas: any[];
}>({
isOpen: false,
tipo: null,
propostas: []
});

const sensors = useSensors(
useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

useEffect(() => {
fetchClientes();
}, [termoBusca, dataInicio, dataFim, valorMin, valorMax, corretorBusca]);

async function fetchClientes() {
try {
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;

  const { data: perfil } = await supabase
    .from("usuarios_perfis")
    .select("tipo_usuario, corretora_id")
    .eq("id", user.id)
    .single();

  if (!perfil) return;

  let query = supabase
    .from('tab_clientes_v2')
    .select(`
      *,
      tab_interacoes_v2(id, status_agendamento)
    `)
    .eq('status_kanban', 'vendido')
    .eq('corretora_id', perfil.corretora_id);

  if (perfil.tipo_usuario === 'CORRETOR') {
    query = query.eq('corretor_id', user.id);
  }

  if (termoBusca) {
    query = query.or(`nome_razao_social.ilike.%${termoBusca}%,cpf.ilike.%${termoBusca}%,cnpj.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%,telefone_whats.ilike.%${termoBusca}%`);
  }

  if (dataInicio) query = query.gte('data_retorno', dataInicio);
  if (dataFim) query = query.lte('data_retorno', dataFim);

  const { data: rawClientes, error } = await query.order('posicao_kanban', { ascending: true });
  if (error) throw error;

  const clientesList = rawClientes || [];
  const clienteIds = clientesList.map((c: any) => c.id);

  let propostasMap: Record<string, any[]> = {};

  if (clienteIds.length > 0) {
    const { data: propostasData, error: propError } = await supabase
      .from('tab_propostas')
      .select('id, status, valor_total_proposta, cliente_id, data_venda')
      .in('cliente_id', clienteIds);

    if (propError) throw propError;

    if (propostasData) {
      propostasData.forEach((p: any) => {
        if (!propostasMap[p.cliente_id]) propostasMap[p.cliente_id] = [];
        propostasMap[p.cliente_id].push(p);
      });
    }
  }

  const corretorIds = Array.from(new Set(clientesList.map((c: any) => c.corretor_id).filter(Boolean)));
  let corretoresMap: Record<string, string> = {};

  if (corretorIds.length > 0) {
    let corrQuery = supabase.from('usuarios_perfis').select('id, nome').in('id', corretorIds);

    if (corretorBusca) {
      corrQuery = corrQuery.ilike('nome', `%${corretorBusca}%`);
    }

    const { data: corretoresData, error: corrError } = await corrQuery;

    if (corrError) throw corrError;

    if (corretoresData) {
      corretoresData.forEach((curr: any) => {
        corretoresMap[curr.id] = curr.nome;
      });
    }
  }

  const vMin = valorMin ? parseCurrencyToNumber(valorMin) : 0;
  const vMax = valorMax ? parseCurrencyToNumber(valorMax) : Infinity;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const clientesTratados = clientesList
    .filter((cliente: any) => {
      if (corretorBusca && cliente.corretor_id && !corretoresMap[cliente.corretor_id]) return false;
      return true;
    })
    .map((cliente: any) => {
      const propostas = propostasMap[cliente.id] || [];

      const temVendido = propostas.some((p: any) => p.status === 'Vendido');
      const temNegociacao = propostas.some((p: any) => p.status === 'Em Negociação');

      let novaFase = cliente.fase_kanban;

      if (temVendido && temNegociacao) {
        novaFase = 'negociacao_cliente';
      } else if (temVendido) {
        const vendas = propostas
          .filter((p: any) => p.status === 'Vendido' && p.data_venda)
          .sort((a: any, b: any) =>
            new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()
          );

        if (vendas.length > 0) {
          const dataVenda = new Date(vendas[0].data_venda);
          dataVenda.setHours(0, 0, 0, 0);

          const diffDays = Math.floor(
            (hoje.getTime() - dataVenda.getTime()) / (1000 * 60 * 60 * 24)
          );

          novaFase = diffDays <= 30 ? 'pos_vendas' : 'renovacao';
        } else {
          novaFase = 'pos_vendas';
        }
      }

      if (novaFase !== cliente.fase_kanban) {
        supabase
          .from('tab_clientes_v2')
          .update({ fase_kanban: novaFase })
          .eq('id', cliente.id)
          .then(({ error: errUpdate }) => {
            if (errUpdate) console.error(`Erro ao atualizar fase automática:`, errUpdate);
          });

        cliente.fase_kanban = novaFase;
      }

      return {
        ...cliente,
        tab_propostas: propostas,
        usuarios_perfis: {
          nome: corretoresMap[cliente.corretor_id] || "Não atribuído"
        }
      } as Cliente;
    })
    .filter((cliente: any) => {
      if (valorMin || valorMax) {
        if (cliente.tab_propostas.length === 0) return false;

        return cliente.tab_propostas.some((p: any) => {
          const val = p.valor_total_proposta || 0;
          return val >= vMin && val <= vMax;
        });
      }

      return true;
    });

  setClientes(clientesTratados);
} catch (error) {
  console.error("Erro ao buscar clientes:", error);
}


}

const getClientesDaColuna = (colunaId: string) => {
return clientes
.filter(cliente => {
const faseCliente = (cliente.fase_kanban || '').toLowerCase().trim();
const colId = (colunaId || '').toLowerCase().trim();
return faseCliente === colId;
})
.sort((a, b) => (a.posicao_kanban || 0) - (b.posicao_kanban || 0));
};

function handleDragStart(event: DragStartEvent) {
const { active } = event;
setActiveId(active.id as string);
setActiveCliente(clientes.find(c => c.id === active.id) || null);
}

async function handleDragEnd(event: DragEndEvent) {
const { active, over } = event;
setActiveId(null);
setActiveCliente(null);

if (!over) return;

const activeIdStr = active.id as string;
const overIdStr = over.id as string;

const clienteAtivo = clientes.find(c => c.id === activeIdStr);
if (!clienteAtivo) return;

let colDestino = overIdStr;
const colunasValidas = colunas.map(c => c.id);

if (!colunasValidas.includes(overIdStr)) {
  const clienteOver = clientes.find(c => c.id === overIdStr);
  colDestino = clienteOver?.fase_kanban || clienteAtivo.fase_kanban;
}

const colOrigem = clienteAtivo.fase_kanban;

if (colOrigem === colDestino) {
  if (activeIdStr === overIdStr) return;

  const itemsDaColuna = getClientesDaColuna(colOrigem);
  const oldIndex = itemsDaColuna.findIndex(c => c.id === activeIdStr);
  const newIndex = itemsDaColuna.findIndex(c => c.id === overIdStr);

  if (oldIndex === -1 || newIndex === -1) return;

  const novaListaOrdenada = arrayMove(itemsDaColuna, oldIndex, newIndex);

  setClientes(prev => prev.map(c => {
    const itemNovo = novaListaOrdenada.find(ni => ni.id === c.id);

    if (itemNovo) {
      return {
        ...c,
        posicao_kanban: novaListaOrdenada.indexOf(itemNovo)
      };
    }

    return c;
  }));

  const updates = novaListaOrdenada.map((item, index) =>
    supabase
      .from('tab_clientes_v2')
      .update({ posicao_kanban: index })
      .eq('id', item.id)
  );

  await Promise.all(updates);
  return;
}

const propostas = clienteAtivo.tab_propostas || [];
const temVendido = propostas.some((p: any) => p.status === 'Vendido');
const temNegociacao = propostas.some((p: any) => p.status === 'Em Negociação');

if (colDestino === 'negociacao_cliente' && (!temVendido || !temNegociacao)) {
  setModalImpedimento({
    isOpen: true,
    mensagem: "É necessário possuir pelo menos uma proposta Vendida e uma proposta Em Negociação."
  });
  return;
}

try {
  setClientes(prev =>
    prev.map(c =>
      c.id === activeIdStr
        ? { ...c, fase_kanban: colDestino, posicao_kanban: 0 }
        : c
    )
  );

  const { error } = await supabase
    .from('tab_clientes_v2')
    .update({
      fase_kanban: colDestino,
      posicao_kanban: 0
    })
    .eq('id', activeIdStr);

  if (error) throw error;

  toast.success("Movimentação realizada!");
} catch (err) {
  console.error(err);
  toast.error("Erro ao salvar");
  fetchClientes();
}

}

return ( <div className="px-4 py-8 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen w-full"> <div className="mb-8 space-y-6"> <div> <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white">
Ciclo de Renovação e Pós-Vendas </h1> <p className="text-slate-500 text-sm font-medium">
Gestão de carteira e renovações ativas </p> </div>


    <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-slate-200 dark:border-zinc-800 shadow-sm">
      <div className="flex-1 min-w-[250px]">
        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
          Pesquisa Rápida
        </label>
        <BuscaGlobal onSearch={setTermoBusca} />
      </div>

      <div className="w-56">
        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
          Filtrar Corretor
        </label>
        <div className="relative">
          <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Nome do Corretor..."
            value={corretorBusca}
            onChange={(e) => setCorretorBusca(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 text-center">
        <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">
          Data Retorno
        </label>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300" />
          <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300" />
        </div>
      </div>

      <div className="flex flex-col gap-2 text-center">
        <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">
          Valor Proposta (R$)
        </label>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
          <input type="text" placeholder="Mín" value={valorMin} onChange={(e) => setValorMin(maskCurrency(e.target.value))} className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600" />
          <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
          <input type="text" placeholder="Máx" value={valorMax} onChange={(e) => setValorMax(maskCurrency(e.target.value))} className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600" />
        </div>
      </div>

      <button 
        onClick={() => {
          setDataInicio('');
          setDataFim('');
          setValorMin('');
          setValorMax('');
          setTermoBusca('');
          setCorretorBusca('');
        }}
        className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all shadow-sm group"
      >
        <Eraser size={18} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  </div>

  <DndContext
    sensors={sensors}
    collisionDetection={pointerWithin}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div className="flex gap-6 overflow-x-auto pb-10 items-stretch">
      {!loadingConfig && colunas.map(col => (
        <div key={col.id} className="flex-1 min-w-[380px] max-w-[480px] flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <span 
                className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white"
                style={{ backgroundColor: col.colorHex }}
              >
                {col.title}
              </span>

              <span className="text-slate-400 text-sm font-bold bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                {getClientesDaColuna(col.id).length}
              </span>
            </div>

            <MenuConfigColuna 
              fase={col} 
              grupo="vendas" 
              onUpdate={refresh} 
            />
          </div>

          <KanbanColumn id={col.id}>
            <SortableContext
              items={getClientesDaColuna(col.id).map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {getClientesDaColuna(col.id).map(cliente => (
                <SortableCard
                  key={cliente.id}
                  id={cliente.id}
                  cliente={cliente}
                  columnId={col.id}
                  onUpdate={fetchClientes}
                />
              ))}
            </SortableContext>
          </KanbanColumn>
        </div>
      ))}
    </div>

    <DragOverlay>
      {activeId && activeCliente ? (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-2xl border-2 border-blue-500 cursor-grabbing w-[350px] rotate-2 opacity-90 scale-105 transition-transform">
          <p className="text-sm font-bold uppercase truncate">
            {activeCliente.tipo_cliente === 'PJ'
              ? activeCliente.razao_social
              : activeCliente.nome_razao_social}
          </p>

          <div className="flex gap-2 mt-2 opacity-40">
            <MessageCircle size={14} />
            <FileText size={14} />
          </div>
        </div>
      ) : null}
    </DragOverlay>
  </DndContext>

  {modalImpedimento.isOpen && (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] max-w-md w-full shadow-2xl border border-red-100 dark:border-red-900/20 text-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="text-red-600" size={32} />
        </div>

        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">
          Movimentação Bloqueada
        </h2>

        <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">
          {modalImpedimento.mensagem}
        </p>

        <button
          onClick={() => setModalImpedimento({ isOpen: false, mensagem: '' })}
          className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
        >
          Entendi e vou corrigir
        </button>
      </div>
    </div>
  )}

  {modalFechamento.isOpen && (
    <ModalFechamento
      isOpen={modalFechamento.isOpen}
      tipo={modalFechamento.tipo!} 
      proposta={modalFechamento.propostas}
      onClose={() => setModalFechamento({ isOpen: false, tipo: null, propostas: [] })}
      onSuccess={() => {
        setModalFechamento({ isOpen: false, tipo: null, propostas: [] });
        fetchClientes();
      }}
    />
  )}
</div>


);
}

function KanbanColumn({ id, children }: { id: string; children: React.ReactNode }) {
const { setNodeRef, isOver } = useDroppable({ id });

return (
<div
ref={setNodeRef}
className={`         p-3 rounded-[24px] min-h-[75vh] flex-1 flex flex-col border transition-all duration-200
        ${isOver 
          ? 'bg-slate-300/70 dark:bg-zinc-900 border-blue-400/50' 
          : 'bg-slate-200/60 dark:bg-zinc-950 border-slate-300/50 dark:border-zinc-800/80'
        }
      `}
> <div className="flex flex-col gap-3 flex-1 h-full">
{children} </div> </div>
);
}

