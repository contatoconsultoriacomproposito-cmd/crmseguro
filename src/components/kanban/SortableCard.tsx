import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { VisualCardSlim } from './VisualCardSlim'; // Criaremos a seguir
import { ModalDetalhesCliente } from './ModalDetalhesCliente'; // Criaremos a seguir

export function SortableCard({ id, cliente, onUpdate }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer', // Cursor de clique
  };

  // Função para abrir o modal apenas se não estiver arrastando
  const handleCardClick = (e: React.MouseEvent) => {
    // Evita abrir o modal se clicar nos botões de editar/excluir
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        onClick={handleCardClick}
        className="outline-none mb-3 touch-none" 
      >
        <VisualCardSlim 
          cliente={cliente} 
          onUpdate={onUpdate} 
        />
      </div>

      {isModalOpen && (
        <ModalDetalhesCliente 
          cliente={cliente}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}