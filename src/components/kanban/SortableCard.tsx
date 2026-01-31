import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { VisualCardSlim } from './VisualCardSlim';
import { ModalDetalhesCliente } from './ModalDetalhesCliente';

interface SortableCardProps {
  id: string;
  cliente: any;
  columnId: string; // 👈 NOVO: coluna de origem
  onUpdate: () => void;
}

export function SortableCard({
  id,
  cliente,
  columnId,
  onUpdate,
}: SortableCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      columnId, // 🔥 ESSENCIAL para o Kanban funcionar
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer',
    zIndex: isDragging ? 50 : 'auto',
  };

  // Abre modal apenas se NÃO estiver arrastando
  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    // Evita clique ao interagir com botões internos
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('a')
    ) {
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
        {/*
          IMPORTANTE:
          - pointer-events-none SOMENTE durante drag
          - permite que o drop detecte a coluna corretamente
        */}
        <div className={isDragging ? 'pointer-events-none' : ''}>
          <VisualCardSlim
            cliente={cliente}
          />
        </div>
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
