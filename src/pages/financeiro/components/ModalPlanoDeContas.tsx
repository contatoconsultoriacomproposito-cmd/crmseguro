import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// Interface espelhando exatamente a estrutura atualizada do nosso banco PostgreSQL
interface ItemPlanoContas {
  id?: string;
  corretora_id: string;
  usuario_id: string;
  parent_id: string | null;
  name: string;
  tipo: 'entrada' | 'saida';
  depth: number;
  ordem: number;
}

interface ModalPlanoDeContasProps {
  isOpen: boolean;
  onClose: () => void;
  modo: 'criar' | 'editar';
  nodePai: ItemPlanoContas | null; // Se houver, indica que estamos criando uma subcategoria
  itemSelecionado: ItemPlanoContas | null; // Preenchido se o modo for 'editar'
  corretoraId: string;
  usuarioId: string;
  onSalvar: (dados: Partial<ItemPlanoContas>) => void;
}

export default function ModalPlanoDeContas({
  isOpen,
  onClose,
  modo,
  nodePai,
  itemSelecionado,
  corretoraId,
  usuarioId,
  onSalvar
}: ModalPlanoDeContasProps) {
  
  const [name, setName] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');

  // Sincroniza os estados do formulário quando o modal abre ou muda de modo
  useEffect(() => {
    if (isOpen) {
      if (modo === 'editar' && itemSelecionado) {
        setName(itemSelecionado.name);
        setTipo(itemSelecionado.tipo);
      } else {
        // Modo Criar
        setName('');
        if (nodePai) {
          // REGRA DE OURO: Se tem nó pai, a subcategoria HERDA obrigatoriamente o tipo (Entrada/Saída) do pai
          setTipo(nodePai.tipo);
        } else {
          // Se for uma categoria raiz, inicia como saída por padrão
          setTipo('saida');
        }
      }
    }
  }, [isOpen, modo, itemSelecionado, nodePai]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (modo === 'criar') {
      onSalvar({
        corretora_id: corretoraId,
        usuario_id: usuarioId,
        parent_id: nodePai ? nodePai.id : null,
        name: name.trim(),
        tipo: tipo, // Usa o tipo selecionado ou Herdado
        depth: nodePai ? nodePai.depth + 1 : 0,
        ordem: 999 // A lógica de reordenação no backend ou helper cuidará disso
      });
    } else {
      onSalvar({
        ...itemSelecionado,
        name: name.trim(),
        tipo: tipo
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border animate-in zoom-in-95 duration-150"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-900">
            {modo === 'criar' 
              ? nodePai ? `Nova Subcategoria em: ${nodePai.name}` : 'Nova Categoria Raiz'
              : 'Editar Nome da Categoria'
            }
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Seletor de Tipo (Apenas visível/editável se for Categoria do Topo/Raiz) */}
          {!nodePai && modo === 'criar' ? (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Fluxo de Caixa</label>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setTipo('entrada')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${tipo === 'entrada' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Receita (Entrada)
                </button>
                <button 
                  type="button"
                  onClick={() => setTipo('saida')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${tipo === 'saida' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Despesa (Saída)
                </button>
              </div>
            </div>
          ) : (
            // Exibe um informativo discreto trancando o tipo se for subcategoria herdada
            <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-200/60 text-xs text-gray-500 flex justify-between items-center">
              <span>Tipo vinculado automaticamente:</span>
              <span className={`font-bold uppercase tracking-wider text-[10px] ${tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tipo === 'entrada' ? 'Receita' : 'Despesa'}
              </span>
            </div>
          )}

          {/* Input do Nome */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Nome da Categoria</label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Infraestrutura, Comissões de Seguros..."
              className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-5 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition"
          >
            {modo === 'criar' ? 'Adicionar Categoria' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}