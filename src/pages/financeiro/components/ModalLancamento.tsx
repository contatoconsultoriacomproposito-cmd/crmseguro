import { useMemo, useState, useEffect } from 'react';
import { X, Calendar, Plus, Check, Loader2 } from 'lucide-react';

// Interface para o Plano de Contas conforme estrutura do banco
interface CategoriaPlano {
  id: string;
  name: string;
  tipo: 'entrada' | 'saida';
  parent_id: string | null;
  depth: number;
  ordem: number;
}

// Interface do objeto que representa o lançamento
interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  categoriaId: string; 
  categoriaNome: string; 
  dataVencimento: string;
  dataQuitacao: string | null;
  status: 'pendente' | 'pago';
  juros: number;
  desconto: number;
  recorrenciaParcelas?: number; 
}

interface ParcelaAjustada {
  numero: number;
  dataVencimento: string;
  valor: number;
}

interface ModalLancamentoProps {
  isOpen: boolean;
  onClose: () => void;
  modo: 'criar' | 'editar';
  selectedLancamento: Lancamento | null;
  categorias: CategoriaPlano[];

  // Estados controlados compartilhados ou passados para o form
  formTipo: 'entrada' | 'saida';
  setFormTipo: (v: 'entrada' | 'saida') => void;
  formCategoria: string;
  setFormCategoria: (v: string) => void;
  formDescricao: string;
  setFormDescricao: (v: string) => void;
  formValor: number;
  setFormValor: (v: number) => void;
  formJuros: number;
  setFormJuros: (v: number) => void;
  formDesconto: number;
  setFormDesconto: (v: number) => void;
  formRecorrencia: number;
  setFormRecorrencia: (v: number) => void;
  formDataVencimento: string;
  setFormDataVencimento: (v: string) => void;
  
  onSalvar: (parcelas?: { dataVencimento: string; valor: number }[]) => void;
  
  // NOVA PROP: Função para salvar a nova categoria no banco e retornar o ID gerado
  onCriarCategoria: (novaCategoria: { name: string; tipo: 'entrada' | 'saida'; parent_id: string | null }) => Promise<string | null>;
}

// Função utilitária para avançar meses preservando o dia de vencimento
const adicionarMeses = (dataStr: string, meses: number): string => {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1 + meses, dia);
  
  const yyyy = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ModalLancamento({
  isOpen,
  onClose,
  modo,
  selectedLancamento,
  categorias,
  formTipo,
  setFormTipo,
  formCategoria,
  setFormCategoria,
  formDescricao,
  setFormDescricao,
  formValor,
  setFormValor,
  formJuros,
  setFormJuros,
  formDesconto,
  setFormDesconto,
  formRecorrencia,
  setFormRecorrencia,
  formDataVencimento,
  setFormDataVencimento,
  onSalvar,
  onCriarCategoria
}: ModalLancamentoProps) {
  
  // Estado para parcelas
  const [parcelas, setParcelas] = useState<ParcelaAjustada[]>([]);

  // Estados para a criação INLINE de nova categoria
  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatTipo, setNewCatTipo] = useState<'entrada' | 'saida'>(formTipo);
  const [newCatParentId, setNewCatParentId] = useState<string>('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  // 1. Processamento da árvore
  const categoriasFiltradasEDecoradas = useMemo(() => {
    if (!categorias || categorias.length === 0) return [];
    const doTipoAtual = categorias.filter(cat => cat.tipo === formTipo);
    
    const obterCaminhoCompleto = (cat: CategoriaPlano): string => {
      const partes = [cat.name];
      let atual = cat;
      while (atual.parent_id) {
        const pai = categorias.find(c => c.id === atual.parent_id);
        if (!pai) break;
        partes.unshift(pai.name);
        atual = pai;
      }
      return partes.join(' > ');
    };

    return doTipoAtual
      .map(cat => ({
        id: cat.id,
        caminhoExibicao: obterCaminhoCompleto(cat)
      }))
      .sort((a, b) => a.caminhoExibicao.localeCompare(b.caminhoExibicao));
  }, [categorias, formTipo]);

  // EFEITO INTELIGENTE: Sincroniza o tipo global (Entrada/Saída) caso o usuário selecione uma categoria
  useEffect(() => {
    if (formCategoria && categorias.length > 0) {
      const categoriaSelecionada = categorias.find(cat => cat.id === formCategoria);
      if (categoriaSelecionada && categoriaSelecionada.tipo !== formTipo) {
        setFormTipo(categoriaSelecionada.tipo);
      }
    }
  }, [formCategoria, categorias, formTipo, setFormTipo]);

  // EFEITO: Mantém o tipo da nova categoria sincronizado com a aba ativa
  useEffect(() => {
    if (isAddingCategoria) setNewCatTipo(formTipo);
  }, [formTipo, isAddingCategoria]);

  // EFEITO: Grade de parcelas
  useEffect(() => {
    if (isOpen && modo === 'criar' && formRecorrencia > 1 && formDataVencimento) {
      const novasParcelas: ParcelaAjustada[] = [];
      for (let i = 0; i < formRecorrencia; i++) {
        novasParcelas.push({
          numero: i + 1,
          dataVencimento: adicionarMeses(formDataVencimento, i),
          valor: formValor
        });
      }
      setParcelas(novasParcelas);
    } else {
      setParcelas([]);
    }
  }, [formRecorrencia, formValor, formDataVencimento, isOpen, modo]);

  if (!isOpen) return null;

  const handleAtualizarParcela = (numero: number, campo: 'dataVencimento' | 'valor', valor: any) => {
    setParcelas(prev => prev.map(p => {
      if (p.numero === numero) return { ...p, [campo]: valor };
      return p;
    }));
  };

  const valorLiquido = (formValor + formJuros) - formDesconto;

  const handleConfirmarEnvio = () => {
    if (formRecorrencia > 1 && parcelas.length > 0) {
      onSalvar(parcelas.map(p => ({ dataVencimento: p.dataVencimento, valor: p.valor })));
    } else {
      onSalvar();
    }
  };

  const handleSalvarNovaCategoria = async () => {
    if (!newCatName.trim()) return;
    setIsSavingCat(true);
    
    try {
      const newId = await onCriarCategoria({
        name: newCatName.trim(),
        tipo: newCatTipo,
        parent_id: newCatParentId || null
      });

      if (newId) {
        setFormTipo(newCatTipo);
        setFormCategoria(newId);
        setIsAddingCategoria(false);
        setNewCatName('');
        setNewCatParentId('');
      }
    } catch (error) {
      console.error("Erro ao criar categoria inline:", error);
    } finally {
      setIsSavingCat(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 border animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {modo === 'criar' ? 'Novo Lançamento Financeiro' : `Editar Lançamento: ${selectedLancamento?.descricao}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Área de conteúdo rolável */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 custom-scrollbar">
          
          {/* Seletor Entrada / Saída */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button 
              type="button"
              onClick={() => {
                setFormTipo('entrada');
                setFormCategoria('');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formTipo === 'entrada' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Receita (Entrada)
            </button>
            <button 
              type="button"
              onClick={() => {
                setFormTipo('saida');
                setFormCategoria('');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formTipo === 'saida' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Despesa (Saída)
            </button>
          </div>

          {/* Categoria do Plano de Contas com Botão Adicionar */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Categoria do Plano de Contas</label>
            <div className="flex gap-2">
              <select 
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
                disabled={isAddingCategoria}
                className="flex-1 border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer disabled:opacity-60"
              >
                <option value="">Selecione uma categoria...</option>
                {categoriasFiltradasEDecoradas.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {formTipo === 'entrada' ? '🟩 ' : '🟥 '} {cat.caminhoExibicao}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsAddingCategoria(!isAddingCategoria)}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center ${isAddingCategoria ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600'}`}
                title="Criar nova categoria"
              >
                {isAddingCategoria ? <X size={18} /> : <Plus size={18} />}
              </button>
            </div>

            {/* FORMULÁRIO INLINE: Criar Nova Categoria */}
            {isAddingCategoria && (
              <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-3">
                  <Plus size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">Inclusão Rápida de Categoria</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    placeholder="Nome da nova categoria..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full border border-blue-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  
                  <select 
                    value={newCatParentId}
                    onChange={(e) => setNewCatParentId(e.target.value)}
                    className="w-full border border-blue-200 bg-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-gray-600"
                  >
                    <option value="">Raiz (Nível Principal)</option>
                    {categoriasFiltradasEDecoradas.map((cat) => (
                      <option key={cat.id} value={cat.id}>Vincular em: {cat.caminhoExibicao}</option>
                    ))}
                  </select>

                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      onClick={() => setIsAddingCategoria(false)}
                      disabled={isSavingCat}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSalvarNovaCategoria}
                      disabled={!newCatName.trim() || isSavingCat}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {isSavingCat ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Salvar Categoria
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Descrição do Lançamento</label>
            <input 
              type="text" 
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
              placeholder="Ex: Assinatura de Ferramenta Cloud"
            />
          </div>

          {/* Valor Base e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Valor Base (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={formValor || ''}
                onChange={(e) => setFormValor(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Data de Vencimento</label>
              <input 
                type="date" 
                value={formDataVencimento}
                onChange={(e) => setFormDataVencimento(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Juros, Desconto e Recorrência */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Juros / Multa (+)</label>
              <input 
                type="number" 
                step="0.01"
                value={formJuros || ''}
                onChange={(e) => setFormJuros(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition text-rose-600 font-medium"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Desconto (-)</label>
              <input 
                type="number" 
                step="0.01"
                value={formDesconto || ''}
                onChange={(e) => setFormDesconto(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition text-emerald-600 font-medium"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1" title="Provisionar em múltiplos meses">Repetir (Meses)</label>
              <input 
                type="number" 
                min="1"
                max="72"
                value={formRecorrencia}
                onChange={(e) => setFormRecorrencia(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition text-center font-semibold text-gray-700"
              />
            </div>
          </div>

          {/* GRADE DE AJUSTE DE PARCELAS FUTURAS */}
          {modo === 'criar' && formRecorrencia > 1 && parcelas.length > 0 && (
            <div className="mt-2 border border-blue-100 bg-blue-50/30 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-blue-100/50">
                <Calendar size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-800">Ajustar Grade de Parcelas Geradas</span>
              </div>
              
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {parcelas.map((p) => (
                  <div key={p.numero} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="col-span-2 text-center">
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 border px-1.5 py-0.5 rounded">
                        #{p.numero}
                      </span>
                    </div>
                    <div className="col-span-5">
                      <input 
                        type="date"
                        value={p.dataVencimento}
                        onChange={(e) => handleAtualizarParcela(p.numero, 'dataVencimento', e.target.value)}
                        className="w-full border border-gray-200 px-2 py-1 rounded-md text-xs bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium text-gray-600"
                      />
                    </div>
                    <div className="col-span-5">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">R$</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={p.valor || ''}
                          onChange={(e) => handleAtualizarParcela(p.numero, 'valor', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 pl-6 pr-2 py-1 rounded-md text-xs bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 font-semibold text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informativo de Valor Líquido Final */}
          <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200/60 flex justify-between items-center text-xs mt-1 flex-shrink-0">
            <span className="font-medium text-gray-500">Cálculo estimado do valor líquido (Item 1):</span>
            <span className={`font-bold text-sm ${valorLiquido >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
              R$ {valorLiquido.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleConfirmarEnvio} 
            className="px-5 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition"
          >
            {modo === 'criar' ? 'Confirmar Lançamento' : 'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
}