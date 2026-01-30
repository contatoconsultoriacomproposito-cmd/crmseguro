import React, { useState, useEffect } from 'react';
import {
  DndContext,
  rectIntersection,
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
import { useKanbanConfig } from './useKanbanConfig'; // Importando o hook
import { MenuConfigColuna } from './MenuConfigColuna'; // Importando o menu

interface Cliente {
  id: string;
  nome: string;
  razao_social?: string;
  tipo_cliente: 'PF' | 'PJ';
  status_kanban: 'novo' | 'vendido' | 'perdido';
  fase_kanban: string;
  data_retorno?: string;
  horario_retorno?: string;
  tab_propostas?: any[];
  usuarios_perfis?: { nome: string };
}

// Removida a constante estática COLUNAS para usar a do banco de dados

export default function KanbanVendas() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);
  const [clienteSendoEditado, setClienteSendoEditado] = useState<string | null>(null);
  
  // Integração do Hook dinâmico para o grupo 'vendas'
  const { colunas, loading: loadingConfig, refresh } = useKanbanConfig('vendas');

  const [termoBusca, setTermoBusca] = useState('');
  const [corretorBusca, setCorretorBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');

  // Estados de Modais
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

      const relacaoPropostas = (valorMin || valorMax) 
        ? 'tab_propostas!inner(*)' 
        : 'tab_propostas(*)';

      let query = supabase
        .from('tab_clientes')
        .select(`
          *,
          corretor:usuarios_perfis!tab_clientes_corretor_id_fkey(nome),
          ${relacaoPropostas}
        `)
        .eq('status_kanban', 'vendido')
        .eq('corretora_id', perfil.corretora_id);

      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', user.id);
      }

      if (termoBusca) {
        query = query.or(`nome.ilike.%${termoBusca}%,razao_social.ilike.%${termoBusca}%,cpf.ilike.%${termoBusca}%,cnpj.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%,telefone_whats.ilike.%${termoBusca}%`);
      }

      if (corretorBusca) {
        query = query.filter('usuarios_perfis.nome', 'ilike', `%${corretorBusca}%`);
      }

      if (dataInicio) query = query.gte('data_retorno', dataInicio);
      if (dataFim) query = query.lte('data_retorno', dataFim);
      if (valorMin) query = query.gte('tab_propostas.valor_total_proposta', parseCurrencyToNumber(valorMin));
      if (valorMax) query = query.lte('tab_propostas.valor_total_proposta', parseCurrencyToNumber(valorMax));

      const { data, error } = await query.order('posicao_kanban', { ascending: true });
      if (error) throw error;
      setClientes(data as Cliente[] || []);
    } catch (error) {
      console.error("Erro ao buscar clientes no Kanban Vendas:", error);
    }
  }

  const getClientesDaColuna = (fase: string) =>
    clientes.filter(c => c.fase_kanban === fase);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveCliente(clientes.find(c => c.id === active.id) || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const currentActiveId = active.id as string;
    setActiveId(null);
    setActiveCliente(null);

    if (!over) return;

    const cliente = clientes.find(c => c.id === currentActiveId) as any;
    if (!cliente) return;

    const faseAtual = cliente.fase_kanban;
    const destino = (over.data.current?.sortable?.containerId as string) ?? (over.id as string);

    if (!destino || destino === faseAtual) return;

    const temPropostaEmNegociacao = cliente.tab_propostas?.some(
      (p: any) => p.status === 'Em Negociação'
    );

    // --- REGRAS LÓGICAS DE TRAVA ---
    if (faseAtual === 'pos' && destino === 'negociacao_vendas' && !temPropostaEmNegociacao) {
      setModalImpedimento({ 
        isOpen: true, 
        mensagem: "Para iniciar uma Negociação a partir do Pós-Venda, é obrigatório cadastrar uma proposta com status 'Em Negociação'." 
      });
      return;
    }

    if (faseAtual === 'renovacao' && destino === 'negociacao_vendas' && !temPropostaEmNegociacao) {
      setModalImpedimento({ 
        isOpen: true, 
        mensagem: "Para avançar para Negociação, é necessário ter pelo menos uma proposta com status 'Em Negociação'." 
      });
      return;
    }

    if (faseAtual === 'negociacao_vendas' && (destino === 'pos' || destino === 'renovacao') && temPropostaEmNegociacao) {
      setModalImpedimento({ 
        isOpen: true, 
        mensagem: "Não é permitido retornar para Pós-Venda ou Renovação enquanto houver uma proposta 'Em Negociação' ativa." 
      });
      return;
    }

    try {
      setClientes(prev => {
        const listaSemOItem = prev.filter(c => c.id !== currentActiveId);
        const itemAtualizado = { ...cliente, fase_kanban: destino };
        return [itemAtualizado, ...listaSemOItem];
      });

      await supabase
        .from('tab_clientes')
        .update({ fase_kanban: destino, posicao_kanban: 0 })
        .eq('id', currentActiveId);

      fetchClientes();
      toast.success("Movimentação atualizada!");

    } catch (err) {
      console.error("Erro crítico no Kanban:", err);
      fetchClientes();
    }
  }

  return (
    <div className="px-4 py-8 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen w-full">
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white">
            Ciclo de Renovação e Pós-Vendas
          </h1>
          <p className="text-slate-500 text-sm font-medium">Gestão de carteira e renovações ativas</p>
        </div>

        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Pesquisa Rápida</label>
            <BuscaGlobal onSearch={setTermoBusca} />
          </div>

          <div className="w-56">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Filtrar Corretor</label>
            <div className="relative">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Nome do Corretor..."
                value={corretorBusca}
                onChange={(e) => setCorretorBusca(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-1 text-center">Data Retorno</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300" />
              <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300" />
            </div>
          </div>     

          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-1 text-center">Valor Proposta (R$)</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input type="text" placeholder="Mín" value={valorMin} onChange={(e) => setValorMin(maskCurrency(e.target.value))} className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600" />
              <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
              <input type="text" placeholder="Máx" value={valorMax} onChange={(e) => setValorMax(maskCurrency(e.target.value))} className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600" />
            </div>
          </div>

          <button 
            onClick={() => { setDataInicio(''); setDataFim(''); setValorMin(''); setValorMax(''); setTermoBusca(''); setCorretorBusca(''); }}  
            className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all shadow-sm group"
          >
            <Eraser size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-10">
          {!loadingConfig && colunas.map(col => (
            <div key={col.id} className="flex-1 min-w-[380px] max-w-[480px]">
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
                
                <div className="relative">
                  <MenuConfigColuna 
                    fase={col} 
                    grupo="vendas" 
                    onUpdate={refresh} 
                  />
                </div>
              </div>

              <KanbanColumn id={col.id}>
                <SortableContext items={getClientesDaColuna(col.id).map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {getClientesDaColuna(col.id).map(cliente => (
                    <SortableCard key={cliente.id} id={cliente.id} cliente={cliente} columnId={col.id} onUpdate={fetchClientes} />
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
                {activeCliente.tipo_cliente === 'PJ' ? activeCliente.razao_social : activeCliente.nome}
              </p>
              <div className="flex gap-2 mt-2 opacity-40">
                <MessageCircle size={14} /><FileText size={14} />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* MODAL DE IMPEDIMENTO */}
      {modalImpedimento.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] max-w-md w-full shadow-2xl border border-red-100 dark:border-red-900/20 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">Movimentação Bloqueada</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">{modalImpedimento.mensagem}</p>
            <button
              onClick={() => setModalImpedimento({ isOpen: false, mensagem: '' })}
              className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
            >
              Entendi e vou corrigir
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE FECHAMENTO */}
      {modalFechamento.isOpen && (
        <ModalFechamento
          isOpen={modalFechamento.isOpen}
          tipo={modalFechamento.tipo!} 
          proposta={modalFechamento.propostas}
          onClose={() => {
            setModalFechamento({ isOpen: false, tipo: null, propostas: [] });
            setClienteSendoEditado(null);
          }}
          onSuccess={async () => {
            if (clienteSendoEditado) {
              await supabase
                .from('tab_clientes')
                .update({ 
                  fase_kanban: 'pos', 
                  posicao_kanban: 0,
                  status_kanban: 'vendido' 
                })
                .eq('id', clienteSendoEditado);
            }
            setClienteSendoEditado(null);
            setModalFechamento({ isOpen: false, tipo: null, propostas: [] });
            fetchClientes(); 
          }}
        />
      )}
    </div>
  );
}

function KanbanColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-slate-100/50 dark:bg-zinc-900/50 p-3 rounded-[24px] min-h-[70vh] flex flex-col border border-slate-200/50 dark:border-zinc-800/50">
      <div className="flex flex-col gap-3 h-full">{children}</div>
    </div>
  );
}