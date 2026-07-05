import { useState, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, X, Check, ArrowUpRight, ArrowDownLeft, FolderPlus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient'; 
import { toast, Toaster } from 'sonner'; 

// ================= TIPOS =================
interface AccountNode {
  id: string;
  name: string;
  tipo: 'entrada' | 'saida';
  children: AccountNode[];
}

interface FlatItem {
  id: string;
  name: string;
  depth: number;
  tipo: 'entrada' | 'saida';
  parentId: string | null;
}

interface PlanoDeContasPayload {
  id: string;
  corretora_id: string;
  usuario_id: string;
  parent_id: string | null;
  name: string;
  tipo: 'entrada' | 'saida';
  depth: number;
  ordem: number;
}

interface PlanoContasProps {
  corretoraId?: string;
  usuarioId?: string;
}

// ================= HELPERS DE ÁRVORE =================

const flattenTree = (nodes: AccountNode[], depth = 0, parentId: string | null = null): FlatItem[] => {
  return nodes.reduce<FlatItem[]>((acc, node) => {
    return [
      ...acc,
      { id: node.id, name: node.name, depth, tipo: node.tipo, parentId },
      ...flattenTree(node.children, depth + 1, node.id)
    ];
  }, []);
};

const buildTree = (flatItems: FlatItem[]): AccountNode[] => {
  const rootNodes: AccountNode[] = [];
  const lookup: Record<string, AccountNode> = {};

  flatItems.forEach(item => {
    lookup[item.id] = { id: item.id, name: item.name, tipo: item.tipo, children: [] };
  });

  flatItems.forEach(item => {
    if (item.parentId && lookup[item.parentId]) {
      lookup[item.parentId].children.push(lookup[item.id]);
    } else {
      rootNodes.push(lookup[item.id]);
    }
  });

  return rootNodes;
};

const getDescendants = (items: FlatItem[], id: string): FlatItem[] => {
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return [];
  
  const itemDepth = items[index].depth;
  const descendants: FlatItem[] = [];
  
  for (let i = index + 1; i < items.length; i++) {
    if (items[i].depth <= itemDepth) break;
    descendants.push(items[i]);
  }
  
  return descendants;
};

const recalculateParents = (items: FlatItem[]): FlatItem[] => {
  const newItems = [...items];
  
  for (let i = 0; i < newItems.length; i++) {
    const item = newItems[i];
    if (item.depth === 0) {
      item.parentId = null;
    } else {
      let foundParent: FlatItem | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (newItems[j].depth === item.depth - 1) {
          foundParent = newItems[j];
          break;
        }
      }
      if (foundParent) {
        item.parentId = foundParent.id;
        // REMOVIDA a herança forçada de tipo aqui para respeitar a escolha manual do usuário
      }
    }
  }
  
  return newItems;
};

const INDENTATION_WIDTH = 32;

// ================= COMPONENTE DO ITEM (LINHA DA ÁRVORE) =================

const SortableItem = ({ 
  item, 
  isActivePopover,
  projectedDepth,
  onOpenPopover,
  onClosePopover,
  onAdd, 
  onDelete 
}: { 
  item: FlatItem;
  isActivePopover: boolean;
  projectedDepth: number | null;
  onOpenPopover: (id: string) => void;
  onClosePopover: () => void;
  onAdd: (targetId: string, type: 'parent' | 'same' | 'sub', name: string, tipo: 'entrada' | 'saida') => void; 
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addType, setAddType] = useState<'parent' | 'same' | 'sub'>('same');
  
  // O tipo padrão começa sendo o mesmo do item que foi clicado
  const [selectedTipo, setSelectedTipo] = useState<'entrada' | 'saida'>(item.tipo);

  // Sincroniza o state interno quando o popover abre
  useEffect(() => {
    if (isActivePopover) {
      setSelectedTipo(item.tipo);
      setNewCategoryName('');
      setAddType('same');
    }
  }, [isActivePopover, item.tipo]);

  const depth = isDragging && projectedDepth !== null ? projectedDepth : item.depth;

  const style = { 
    transform: isDragging 
      ? CSS.Translate.toString({ x: 0, y: transform?.y ?? 0, scaleX: 1, scaleY: 1 }) 
      : CSS.Translate.toString(transform),
    transition,
    marginLeft: `${depth * INDENTATION_WIDTH}px`,
    zIndex: isDragging ? 0 : (isActivePopover ? 50 : 1),
    position: 'relative' as const
  };

  const handleConfirmAdd = () => {
    if (newCategoryName.trim()) {
      onAdd(item.id, addType, newCategoryName, selectedTipo);
      setNewCategoryName('');
      onClosePopover();
    }
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="mb-2">
        <div className="h-[48px] border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className={`relative flex items-center gap-2 p-3 bg-white border rounded-lg group shadow-sm transition-colors ${isActivePopover ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-blue-300'}`}>
        <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing focus:outline-none">
          <GripVertical size={16} />
        </div>
        
        <div className="flex items-center justify-center">
          {item.tipo === 'entrada' ? (
            <span className="p-1 rounded bg-green-50 text-green-600" title="Entrada">
              <ArrowUpRight size={14} />
            </span>
          ) : (
            <span className="p-1 rounded bg-red-50 text-red-600" title="Saída">
              <ArrowDownLeft size={14} />
            </span>
          )}
        </div>

        <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
        
        <div className={`flex gap-1 transition-opacity ${isActivePopover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button 
            onClick={() => onOpenPopover(item.id)} 
            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
            title="Adicionar Conta"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={() => onDelete(item.id)} 
            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
            title="Excluir Conta"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* POPOVER INLINE COM ESCOLHA DE TIPO */}
        {isActivePopover && (
          <div className="absolute top-12 left-8 w-[280px] bg-white border border-gray-200 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 z-[9999]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate pr-2">Criar em: {item.name}</span>
              <button onClick={onClosePopover} className="text-gray-400 hover:text-gray-700">
                <X size={14} />
              </button>
            </div>

            {/* SELETOR DE TIPO MANUAL */}
            <div className="flex gap-2 mb-3">
              <button 
                onClick={() => setSelectedTipo('entrada')} 
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-lg border font-medium transition-colors ${selectedTipo === 'entrada' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
              >
                <ArrowUpRight size={12} /> Entrada
              </button>
              <button 
                onClick={() => setSelectedTipo('saida')} 
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-lg border font-medium transition-colors ${selectedTipo === 'saida' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
              >
                <ArrowDownLeft size={12} /> Saída
              </button>
            </div>
            
            <div className="flex flex-col gap-1 mb-3 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <button onClick={() => setAddType('parent')} className={`text-xs py-1.5 px-2 rounded font-medium text-left transition-all ${addType === 'parent' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>1. Nível Pai (Anterior)</button>
              <button onClick={() => setAddType('same')} className={`text-xs py-1.5 px-2 rounded font-medium text-left transition-all ${addType === 'same' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>2. Mesmo Nível (Irmão)</button>
              <button onClick={() => setAddType('sub')} className={`text-xs py-1.5 px-2 rounded font-medium text-left transition-all ${addType === 'sub' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>3. Subnível (Filho)</button>
            </div>

            <div className="flex gap-2">
              <input 
                autoFocus
                type="text" 
                placeholder="Nome do item..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={handleConfirmAdd} disabled={!newCategoryName.trim()} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center">
                <Check size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ================= COMPONENTE PRINCIPAL =================

export default function PlanoContas({ corretoraId = '', usuarioId = '' }: PlanoContasProps) {
  const [data, setData] = useState<AccountNode[]>([]);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [projectedDepth, setProjectedDepth] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // States para o modal Global de Adição
  const [showGlobalAdd, setShowGlobalAdd] = useState(false);
  const [globalName, setGlobalName] = useState('');
  const [globalTipo, setGlobalTipo] = useState<'entrada' | 'saida'>('saida');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const flatItems = useMemo(() => flattenTree(data), [data]);

  useEffect(() => {
    async function loadPlanoContas() {
      if (!corretoraId) return;

      try {
        const { data: dbData, error } = await supabase
          .from('tab_financeiro_plano_de_contas')
          .select('*')
          .eq('corretora_id', corretoraId)
          .order('ordem', { ascending: true });

        if (error) throw error;

        if (dbData && dbData.length > 0) {
          const mappedFlat: FlatItem[] = dbData.map(item => ({
            id: item.id,
            name: item.name,
            depth: item.depth,
            tipo: item.tipo || 'saida', 
            parentId: item.parent_id
          }));
          setData(buildTree(mappedFlat));
        } else {
          setData([
            { 
              id: 'd3b07384-d113-4ec8-a5f1-111111111111', 
              name: 'Pagamentos (Despesas)', 
              tipo: 'saida',
              children: [
                { id: 'd3b07384-d113-4ec8-a5f1-222222222222', name: 'Despesas Fixas', tipo: 'saida', children: [{ id: 'd3b07384-d113-4ec8-a5f1-333333333333', name: 'Aluguel', tipo: 'saida', children: [] }] },
                { id: 'd3b07384-d113-4ec8-a5f1-444444444444', name: 'Despesas Variáveis', tipo: 'saida', children: [] }
              ] 
            },
            { id: 'd3b07384-d113-4ec8-a5f1-555555555555', name: 'Recebimentos (Receitas)', tipo: 'entrada', children: [] }
          ]);
        }
      } catch (error) {
        console.error("Erro ao inicializar plano de contas:", error);
        toast.error("Não foi possível sincronizar o plano de contas.");
      }
    }

    loadPlanoContas();
  }, [corretoraId]);

  const handleSaveToDatabase = async () => {
    try {
      setIsSaving(true);
      if (!corretoraId || !usuarioId) return toast.error("Parâmetros ausentes.");

      const payload: PlanoDeContasPayload[] = flatItems.map((item, index) => ({
        id: item.id,
        corretora_id: corretoraId || item.id, 
        usuario_id: usuarioId || item.id,
        parent_id: item.parentId,
        name: item.name,
        tipo: item.tipo,
        depth: item.depth,
        ordem: index
      }));
      
      if (payload.length === 0) return toast.warning("Sem registros para salvar.");

      const { error } = await supabase.from('tab_financeiro_plano_de_contas').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      
      toast.success("Plano de contas salvo com sucesso!");
    } catch (error: any) {
      toast.error(`Falha ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Método unificado para adição via popover inline
  const handleAdd = (targetId: string, type: 'parent' | 'same' | 'sub', name: string, tipoEscolhido: 'entrada' | 'saida') => {
    const targetIndex = flatItems.findIndex(i => i.id === targetId);
    if (targetIndex === -1) return;

    const target = flatItems[targetIndex];
    const newNodeId = crypto.randomUUID();
    
    let newDepth = target.depth;
    if (type === 'sub') newDepth = target.depth + 1;
    else if (type === 'parent') newDepth = Math.max(0, target.depth - 1);

    const newFlatItem: FlatItem = { 
      id: newNodeId, 
      name, 
      depth: newDepth, 
      tipo: tipoEscolhido, // Respeita o tipo que o usuário escolheu no UI
      parentId: null 
    };
    
    const descendants = getDescendants(flatItems, target.id);
    const insertIndex = targetIndex + descendants.length + 1;

    const newFlatList = [...flatItems];
    newFlatList.splice(insertIndex, 0, newFlatItem);
    
    setData(buildTree(recalculateParents(newFlatList)));
  };

  // Método para adição via Botão Global Principal
  const handleGlobalAddSubmit = () => {
    if (!globalName.trim()) return;

    const newFlatItem: FlatItem = {
      id: crypto.randomUUID(),
      name: globalName,
      depth: 0, // Como é botão global, vai direto pra raiz
      tipo: globalTipo,
      parentId: null
    };

    // Adiciona no final da lista
    const newFlatList = [...flatItems, newFlatItem];
    setData(buildTree(recalculateParents(newFlatList)));
    
    setShowGlobalAdd(false);
    setGlobalName('');
    toast.success(`${globalName} adicionada na raiz do plano de contas!`);
  };

  const handleDelete = (id: string) => {
    const descendants = getDescendants(flatItems, id);
    const idsToRemove = new Set([id, ...descendants.map(d => d.id)]);
    const remaining = flatItems.filter(i => !idsToRemove.has(i.id));
    setData(buildTree(recalculateParents(remaining)));
  };

  // =============== LÓGICA DE DRAG & DROP ===============
  const getProjection = (activeId: string, overId: string, deltaX: number) => {
    const activeIndex = flatItems.findIndex(i => i.id === activeId);
    const overIndex = flatItems.findIndex(i => i.id === overId);
    
    if (activeIndex === -1 || overIndex === -1) return null;

    const activeItem = flatItems[activeIndex];
    const activeDescendants = getDescendants(flatItems, activeId);
    const activeIds = new Set([activeId, ...activeDescendants.map(d => d.id)]);
    const remainingItems = flatItems.filter(i => !activeIds.has(i.id));
    
    let insertIndex;
    if (activeId === overId) insertIndex = activeIndex; 
    else {
      const newOverIndex = remainingItems.findIndex(i => i.id === overId);
      insertIndex = activeIndex < overIndex ? newOverIndex + 1 : newOverIndex;
    }
    
    const previousItem = remainingItems[insertIndex - 1];
    const minDepth = 0;
    const maxDepth = previousItem ? previousItem.depth + 1 : 0;
    
    let targetDepth = activeItem.depth + Math.round(deltaX / INDENTATION_WIDTH);
    if (targetDepth < minDepth) targetDepth = minDepth;
    if (targetDepth > maxDepth) targetDepth = maxDepth;

    return targetDepth;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActivePopoverId(null);
    setActiveDragId(String(event.active.id));
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;
    if (!active) return;
    const currentOverId = over ? String(over.id) : String(active.id);
    const projection = getProjection(String(active.id), currentOverId, delta.x);
    if (projection !== null) setProjectedDepth(projection);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const finalDepth = projectedDepth;
    
    setActiveDragId(null);
    setProjectedDepth(null);
    
    if (finalDepth === null) return;

    const activeId = String(active.id);
    const overId = over ? String(over.id) : activeId;

    const newFlatItems = [...flatItems];
    const activeItemIndex = newFlatItems.findIndex(i => i.id === activeId);
    const activeItem = newFlatItems[activeItemIndex];

    if (activeId === overId && finalDepth === activeItem.depth) return;

    const activeDescendants = getDescendants(newFlatItems, activeId);
    const activeIds = new Set([activeId, ...activeDescendants.map(d => d.id)]);
    if (activeIds.has(overId) && activeId !== overId) return;

    const remainingItems = newFlatItems.filter(i => !activeIds.has(i.id));

    let insertIndex;
    if (activeId === overId) {
      insertIndex = activeItemIndex;
    } else {
      const newOverIndex = remainingItems.findIndex(i => i.id === overId);
      const overOriginalIndex = flatItems.findIndex(i => i.id === overId);
      insertIndex = activeItemIndex < overOriginalIndex ? newOverIndex + 1 : newOverIndex;
    }

    const depthDiff = finalDepth - activeItem.depth;
    activeItem.depth = finalDepth;
    activeDescendants.forEach(desc => {
      desc.depth += depthDiff;
    });

    remainingItems.splice(insertIndex, 0, activeItem, ...activeDescendants);
    setData(buildTree(recalculateParents(remainingItems)));
  };

  const activeDragItem = activeDragId ? flatItems.find(i => i.id === activeDragId) : null;

  return (
    <div className="max-w-3xl p-6 min-h-screen font-sans">
      <Toaster position="top-right" richColors />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Plano de Contas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Arraste para reordenar/nivelar ou crie novas categorias abaixo.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowGlobalAdd(true)}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors duration-150"
          >
            <FolderPlus size={16} className="text-gray-500" />
            Nova Categoria
          </button>

          <button
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors duration-150"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* MODAL GLOBAL DE CRIAÇÃO (Para quem não usar o popover da linha) */}
      {showGlobalAdd && (
        <div className="mb-6 bg-white border border-blue-200 shadow-sm rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
              <FolderPlus size={16} /> Criar Nova Categoria Principal (Nível Raiz)
            </h3>
            <button onClick={() => setShowGlobalAdd(false)} className="text-gray-400 hover:text-gray-700">
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setGlobalTipo('entrada')} 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${globalTipo === 'entrada' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ArrowUpRight size={14} /> Receita (Entrada)
              </button>
              <button 
                onClick={() => setGlobalTipo('saida')} 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${globalTipo === 'saida' ? 'bg-white shadow-sm text-red-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ArrowDownLeft size={14} /> Despesa (Saída)
              </button>
            </div>

            <input 
              autoFocus
              type="text" 
              placeholder="Ex: Impostos, Salários, Honorários..."
              value={globalName}
              onChange={(e) => setGlobalName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGlobalAddSubmit()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            
            <button 
              onClick={handleGlobalAddSubmit} 
              disabled={!globalName.trim()} 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <Check size={16} /> Adicionar
            </button>
          </div>
        </div>
      )}
      
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[400px]">
          <SortableContext items={flatItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {flatItems.map(item => (
              <SortableItem 
                key={item.id} 
                item={item} 
                isActivePopover={activePopoverId === item.id}
                projectedDepth={activeDragId === item.id ? projectedDepth : null}
                onOpenPopover={setActivePopoverId}
                onClosePopover={() => setActivePopoverId(null)}
                onAdd={handleAdd} 
                onDelete={handleDelete} 
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className="flex items-center gap-2 p-3 bg-white border-2 border-blue-400 rounded-lg shadow-2xl opacity-90 cursor-grabbing">
              <div className="text-blue-500">
                <GripVertical size={16} />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-700">{activeDragItem.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}