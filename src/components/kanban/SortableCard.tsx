import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { VisualCard } from './VisualCard'; // Seu novo componente

export function SortableCard({ id, cliente, onUpdate }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // Fica mais transparente ao arrastar
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    // Removi as classes de borda e bg daqui, pois o VisualCard já tem as dele
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="outline-none mb-3" // Apenas um espaçamento entre cards
    >
      {/* O componente que realmente desenha tudo é este: */}
      <VisualCard 
        cliente={cliente} 
        status={cliente.status_kanban} 
        onUpdate={onUpdate} 
      />
    </div>
  );
}