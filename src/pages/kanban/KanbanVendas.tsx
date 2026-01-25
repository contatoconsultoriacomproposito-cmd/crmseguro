import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
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
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Eraser, 
  UserSearch 
} from 'lucide-react';
import { SortableCard } from '../../components/kanban/SortableCard'; 
import { BuscaGlobal } from '../../components/BuscaGlobal';
import { ModalFechamento } from '../../components/propostas/ModalFechamento'; // Certifique-se que o path está correto
import { maskCurrency, parseCurrencyToNumber } from '../../utils/masks';

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

const COLUNAS = [
  { id: 'pos', title: 'Pós-Vendas', color: 'bg-slate-100 text-slate-600' },
  { id: 'renovacao', title: 'Renovação do Seguro', color: 'bg-blue-100 text-blue-600' },
  { id: 'negociacao_vendas', title: 'Negociação para Clientes', color: 'bg-amber-100 text-amber-600' }
];

export default function KanbanVendas() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);
  const [clienteSendoEditado, setClienteSendoEditado] = useState<string | null>(null);
  
  // Estados de Filtro (Mantidos integralmente)
  const [termoBusca, setTermoBusca] = useState('');
  const [corretorBusca, setCorretorBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');

  // Estado do Modal de Fechamento
  const [modalFechamento, setModalFechamento] = useState<{
    isOpen: boolean;
    tipo: 'VENDIDO' | 'PERDIDO' | null;
    propostas: any[]; // <--- Garanta que tenha o '[]' aqui
  }>({
    isOpen: false,
    tipo: null,
    propostas: [] // <--- Garanta que tenha o '[]' aqui
  });

  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

  useEffect(() => {
    fetchClientes();
  }, [termoBusca, dataInicio, dataFim, valorMin, valorMax, corretorBusca]);

  async function fetchClientes() {
    try {
      // 1. Identificar o usuário e seu nível de acesso
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("tipo_usuario, corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil) return;

      // 2. Definir a relação de propostas (Usa inner join se houver filtro de valor)
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
        .eq('status_kanban', 'vendido'); // AJUSTADO: Alinhado para o Kanban de Perdas

      // 3. APLICAÇÃO DA HIERARQUIA (CRÍTICO)
      // Filtro obrigatório: Garante isolamento entre diferentes corretoras
      query = query.eq('corretora_id', perfil.corretora_id);

      // Filtro restritivo: Se for apenas Corretor, ele não vê os leads dos colegas
      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', user.id);
      }

      // 4. Filtros de Interface (Busca Global)
      if (termoBusca) {
        query = query.or(`nome.ilike.%${termoBusca}%,razao_social.ilike.%${termoBusca}%,cpf.ilike.%${termoBusca}%,cnpj.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%,telefone_whats.ilike.%${termoBusca}%`);
      }

      // 5. Filtro de Nome do Corretor (Busca específica por atendente)
      if (corretorBusca) {
        // Usamos .filter para garantir que a busca funcione na tabela relacionada
        query = query.filter('usuarios_perfis.nome', 'ilike', `%${corretorBusca}%`);
      }

      // 6. Filtros de Data de Retorno
      if (dataInicio) query = query.gte('data_retorno', dataInicio);
      if (dataFim) query = query.lte('data_retorno', dataFim);

      // 7. Filtros de Valor da Proposta
      if (valorMin) {
        query = query.gte('tab_propostas.valor_total_proposta', parseCurrencyToNumber(valorMin));
      }
      if (valorMax) {
        query = query.lte('tab_propostas.valor_total_proposta', parseCurrencyToNumber(valorMax));
      }

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

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;
    const activeItem = clientes.find(c => c.id === activeId);
    if (!activeItem) return;

    let newFase = '';
    const isOverAColumn = COLUNAS.some(col => col.id === overId);
    if (isOverAColumn) {
      newFase = overId;
    } else {
      const overItem = clientes.find(c => c.id === overId);
      if (overItem) newFase = overItem.fase_kanban;
    }
    
    if (newFase && activeItem.fase_kanban !== newFase) {
      setClientes(prev => prev.map(c => 
        c.id === activeId ? { ...c, fase_kanban: newFase } : c
      ));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const currentActiveId = active.id as string; // Guardamos o ID localmente nesta execução
    setActiveId(null);
    setActiveCliente(null);
    if (!over) return;
    const overId = over.id as string;

    try {
      const clienteMovidoOriginal = clientes.find(c => c.id === currentActiveId);
      if (!clienteMovidoOriginal) return;

      // AÇÕES DE FECHAMENTO (VENDIDO/PERDIDO)
      if (overId === 'vendido' || overId === 'perdido') {
        const propostasAtivas = clienteMovidoOriginal.tab_propostas?.filter(
          p => p.status === 'Em Negociação'
        ) || [];

        if (propostasAtivas.length === 0) {
          alert("BLOQUEADO: Crie uma proposta 'Em Negociação' antes.");
          fetchClientes();
          return;
        }

        setClienteSendoEditado(currentActiveId); // Salva para o onSuccess usar depois
        setModalFechamento({
          isOpen: true,
          tipo: overId === 'vendido' ? 'VENDIDO' : 'PERDIDO',
          propostas: propostasAtivas
        });
        return;
      }

      // MOVIMENTAÇÃO ENTRE COLUNAS (RECUPERACAO / CONTATO_PERDA / NEGOCIACAO_PERDAS)
      let novaFase = clienteMovidoOriginal.fase_kanban;
      if (COLUNAS.some(col => col.id === overId)) {
        novaFase = overId;
      }

      // Atualização local imediata para fluidez
      setClientes(prev => {
        const listaSemOItem = prev.filter(c => c.id !== currentActiveId);
        const itemAtualizado = { ...clienteMovidoOriginal, fase_kanban: novaFase };
        return [itemAtualizado, ...listaSemOItem];
      });

      await supabase
        .from('tab_clientes')
        .update({ fase_kanban: novaFase, posicao_kanban: 0 })
        .eq('id', currentActiveId);

      fetchClientes();

    } catch (err) {
      console.error("Erro crítico no Kanban:", err);
      fetchClientes();
    }
  }

  return (
    <div className="px-4 py-8 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen w-full">
      {/* HEADER */}
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white">
            Ciclo de Vendas para Novos Clientes
          </h1>
          <p className="text-slate-500 text-sm font-medium">Gerencie o progresso comercial em tempo real</p>
        </div>

        {/* FILTROS (MANTIDOS INTEGRALMENTE) */}
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
              <input 
                type="date" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300"
              />
              <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
              <input 
                type="date" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>     

          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-1 text-center">Valor Proposta (R$)</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input 
                type="text" 
                placeholder="Mín"
                value={valorMin}
                onChange={(e) => setValorMin(maskCurrency(e.target.value))}
                className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600 placeholder:text-slate-400"
              />
              <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
              <input 
                type="text" 
                placeholder="Máx"
                value={valorMax}
                onChange={(e) => setValorMax(maskCurrency(e.target.value))}
                className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          <button 
            onClick={() => { 
              setDataInicio(''); setDataFim('');
              setValorMin(''); setValorMax('');
              setTermoBusca(''); setCorretorBusca('');
            }}  
            className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all shadow-sm group"
            title="Limpar todos os filtros"
          >
            <Eraser size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>
      
      {/* AREA DO KANBAN */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-10">
          {COLUNAS.map(col => (
            <div key={col.id} className="flex-1 min-w-[380px] max-w-[480px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${col.color}`}>
                    {col.title}
                  </span>
                  <span className="text-slate-400 text-sm font-bold bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                    {getClientesDaColuna(col.id).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              <KanbanColumn id={col.id}>
                <SortableContext items={getClientesDaColuna(col.id).map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {getClientesDaColuna(col.id).map(cliente => (
                    <SortableCard 
                      key={cliente.id} 
                      id={cliente.id} 
                      cliente={cliente} 
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
                {activeCliente.tipo_cliente === 'PJ' ? activeCliente.razao_social : activeCliente.nome}
              </p>
              <div className="flex gap-2 mt-2 opacity-40">
                <MessageCircle size={14} /><FileText size={14} />
              </div>
            </div>
          ) : null}
        </DragOverlay>

        
      </DndContext>
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
              // REGRA DE OURO: No Kanban Vendas, o status_kanban NUNCA muda.
              // Ele sempre continuará sendo 'vendido'.
              
              let novaFase = 'pos'; // Por padrão, volta para o início do ciclo

              if (modalFechamento.tipo === 'PERDIDO') {
                // Se ele perdeu a renovação deste ano, ele continua sendo seu cliente,
                // mas talvez você queira que ele volte para a primeira coluna 
                // para tentar novamente no próximo ciclo ou apenas mantê-lo na base.
                novaFase = 'pos'; 
              }

              await supabase
                .from('tab_clientes')
                .update({ 
                  fase_kanban: novaFase, 
                  posicao_kanban: 0,
                  status_kanban: 'vendido' // Forçamos a manutenção do status
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

// COMPONENTES AUXILIARES (INTERNOS)
function KanbanColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-slate-100/50 dark:bg-zinc-900/50 p-3 rounded-[24px] min-h-[70vh] max-h-[calc(100vh-280px)] overflow-y-auto border border-slate-200/50 dark:border-zinc-800/50 shadow-inner custom-scrollbar">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

