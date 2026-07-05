import { useState, useMemo, useEffect } from 'react';
import { Download, Plus, Calendar, Edit2, Trash2, CheckCircle, Undo2, ChevronRight } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ================= IMPORTAÇÃO DOS COMPONENTES CONFIGURADOS =================
import CardsResumo from './components/CardsResumo';
import PainelFiltros from './components/PainelFiltros';
import ModalLancamento from './components/ModalLancamento';
import ModalPlanoDeContas from './components/ModalPlanoDeContas';
import { gerarPDFLancamentos } from './components/exportarPDF';

// CLIENTE SUPABASE & HELPER SEGURO
import { supabase, safeQuery } from '../../lib/supabaseClient';

// ================= TIPOS E INTERFACES COM ALINHAMENTO DO BANCO =================
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

interface CategoriaPlano {
  id: string;
  name: string;
  tipo: 'entrada' | 'saida';
  parent_id: string | null;
  depth: number;
  ordem: number;
}

type PrecisaoBusca = '0' | '5' | '10'; 
type FiltroStatusParcela = 'todos' | 'vencidas' | 'a_vencer' | 'hoje';

interface LancamentosProps {
  corretoraId?: string;
  corretorId?: string;
  usuarioId: string | undefined;
}

export default function Lancamentos({ 
  corretoraId = 'e8d1fdac-fc46-4646-b1f7-33aedee29f3a', 
  corretorId = 'ca91a699-d7ca-473a-9596-80c5999ef3ad' 
}: LancamentosProps) {

  // ================= ESTADOS OPERACIONAIS DO BANCO =================
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPlano[]>([]);
  const [carregando, setCarregando] = useState(true);

  // ================= ESTADOS DOS FILTROS & BUSCA =================
  const [busca, setBusca] = useState('');
  const [precisao, setPrecisao] = useState<PrecisaoBusca>('10');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [statusParcela, setStatusParcela] = useState<FiltroStatusParcela>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoDataFiltro, setTipoDataFiltro] = useState<'vencimento' | 'quitacao'>('vencimento');

  // ================= ESTADOS DO MODAL DE LANÇAMENTO =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalModo, setModalModo] = useState<'criar' | 'editar'>('criar');
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null);

  const [formTipo, setFormTipo] = useState<'entrada' | 'saida'>('entrada');
  const [formCategoria, setFormCategoria] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState<number>(0);
  const [formJuros, setFormJuros] = useState<number>(0);
  const [formDesconto, setFormDesconto] = useState<number>(0);
  const [formRecorrencia, setFormRecorrencia] = useState<number>(1);
  const [formDataVencimento, setFormDataVencimento] = useState('');

  // ================= ESTADOS DO MODAL DO PLANO DE CONTAS =================
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false);

  // ================= EFFECT DE BUSCA DE DADOS (SUPABASE) =================
  useEffect(() => {
    async function carregarDadosIniciais() {
      setCarregando(true);
      try {
        // CORRIGIDO: Adicionado parent_id, depth, ordem no .select()
        const { data: dataCats, error: errCats } = await safeQuery<CategoriaPlano[]>(
          Promise.resolve(
            supabase
              .from('tab_financeiro_plano_de_contas')
              .select('id, name, tipo, parent_id, depth, ordem')
              .eq('corretora_id', corretoraId)
          )
        );
        if (errCats) throw errCats;
        const categoriasCarregadas = dataCats || [];
        setCategorias(categoriasCarregadas);

        const { data: dataLanc, error: errLanc } = await safeQuery<any[]>(
          Promise.resolve(
            supabase
              .from('tab_financeiro_lancamentos')
              .select('*')
              .eq('corretora_id', corretoraId)
              .order('data_vencimento', { ascending: false })
          )
        );
        if (errLanc) throw errLanc;

        const lancamentosFormatados: Lancamento[] = (dataLanc || []).map((item: any) => {
          const catRelacionada = categoriasCarregadas.find((c) => c.id === item.categoria_id);
          return {
            id: item.id,
            descricao: item.descricao,
            valor: Number(item.valor),
            tipo: item.tipo,
            categoriaId: item.categoria_id,
            categoriaNome: catRelacionada ? catRelacionada.name : 'Sem Categoria',
            dataVencimento: item.data_vencimento,
            dataQuitacao: item.data_quitacao,
            status: item.status,
            juros: Number(item.juros),
            desconto: Number(item.desconto),
            recorrenciaParcelas: item.recorrencia_parcelas
          };
        });

        setLancamentos(lancamentosFormatados);
      } catch (error: any) {
        console.error("Erro ao carregar dados do Supabase:", error);
        toast.error("Não foi possível sincronizar os lançamentos.");
      } finally {
        setCarregando(false);
      }
    }

    if (corretoraId) {
      carregarDadosIniciais();
    }
  }, [corretoraId]);

  // ================= LÓGICA DE FILTRAGEM =================
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(item => {
      if (tipoFiltro !== 'todos' && item.tipo !== tipoFiltro) return false;

      const hojeStr = new Date().toISOString().split('T')[0]; 
      if (statusParcela === 'vencidas' && (item.dataVencimento >= hojeStr || item.status === 'pago')) return false;
      if (statusParcela === 'hoje' && item.dataVencimento !== hojeStr) return false;
      if (statusParcela === 'a_vencer' && item.dataVencimento <= hojeStr) return false;

      const dataAlvo = tipoDataFiltro === 'vencimento' ? item.dataVencimento : item.dataQuitacao;
      if (dataInicio && (!dataAlvo || dataAlvo < dataInicio)) return false;
      if (dataFim && (!dataAlvo || dataAlvo > dataFim)) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchesTexto = item.descricao.toLowerCase().includes(termo) || item.categoriaNome.toLowerCase().includes(termo);
        
        const valorBuscado = parseFloat(termo.replace(/[^\d,.]/g, '').replace(',', '.'));
        if (!isNaN(valorBuscado)) {
          const percentual = parseInt(precisao) / 100;
          const limiteInferior = valorBuscado * (1 - percentual);
          const limiteSuperior = valorBuscado * (1 + percentual);
          const matchesValor = item.valor >= limiteInferior && item.valor <= limiteSuperior;
          return matchesTexto || matchesValor;
        }
        return matchesTexto;
      }
      return true;
    });
  }, [lancamentos, busca, precisao, tipoFiltro, statusParcela, dataInicio, dataFim, tipoDataFiltro]);

  const resumo = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, curr) => {
      if (curr.tipo === 'entrada') acc.entradas += curr.valor;
      else acc.saidas += curr.valor;
      acc.saldo = acc.entradas - acc.saidas;
      return acc;
    }, { entradas: 0, saidas: 0, saldo: 0 });
  }, [lancamentosFiltrados]);

  // ================= OPERAÇÕES FINANCEIRAS PERSISTIDAS NO SUPABASE =================
  const handleAlternarBaixa = async (id: string) => {
    const alvo = lancamentos.find(item => item.id === id);
    if (!alvo) return;

    const novoStatus = alvo.status === 'pago' ? 'pendente' : 'pago';
    const novaQuitacao = novoStatus === 'pago' ? new Date().toISOString().split('T')[0] : null;

    const { error } = await safeQuery<any>(
      Promise.resolve(
        supabase
          .from('tab_financeiro_lancamentos')
          .update({ status: novoStatus, data_quitacao: novaQuitacao })
          .eq('id', id)
      )
    );

    if (error) {
      toast.error("Erro ao aplicar baixa no servidor.");
      return;
    }

    setLancamentos(prev => prev.map(item => 
      item.id === id ? { ...item, status: novoStatus, dataQuitacao: novaQuitacao } : item
    ));
    toast.success(novoStatus === 'pago' ? "Lançamento quitado!" : "Baixa revertida com sucesso.");
  };

  const handleExcluir = async (id: string) => {
  // Criamos a função que vai de fato conversar com o banco
  const deletarNoBanco = async () => {
    const { error } = await safeQuery<any>(
      Promise.resolve(
        supabase
          .from('tab_financeiro_lancamentos')
          .delete()
          .eq('id', id)
      )
    );

    if (error) throw error; // Se der erro, joga para o toast tratar
    
    // Atualiza a tela tirando o item da lista
    setLancamentos(prev => prev.filter(item => item.id !== id));
  };

  // O Toast aparece IMEDIATAMENTE ao clicar!
  toast.promise(deletarNoBanco(), {
    loading: 'Excluindo lançamento...',
    success: 'Lançamento removido definitivamente.',
    error: 'Não foi possível excluir o registro do banco de dados.'
  });
};

  const abrirModalParaCriar = () => {
    setModalModo('criar');
    setSelectedLancamento(null);
    setFormTipo('entrada');
    setFormCategoria('');
    setFormDescricao('');
    setFormValor(0);
    setFormJuros(0);
    setFormDesconto(0);
    setFormRecorrencia(1);
    setFormDataVencimento('');
    setIsModalOpen(true);
  };

  const abrirModalParaEditar = (item: Lancamento) => {
    setModalModo('editar');
    setSelectedLancamento(item);
    setFormTipo(item.tipo);
    setFormCategoria(item.categoriaId);
    setFormDescricao(item.descricao);
    setFormValor(item.valor);
    setFormJuros(item.juros);
    setFormDesconto(item.desconto);
    setFormRecorrencia(item.recorrenciaParcelas || 1);
    setFormDataVencimento(item.dataVencimento);
    setIsModalOpen(true);
  };

  const handleSalvarLancamento = async (parcelasCustomizadas?: { dataVencimento: string; valor: number }[]) => {
    if (!formDescricao || !formDataVencimento || formValor <= 0 || !formCategoria) {
        toast.error("Preencha todos os campos obrigatórios (incluindo a categoria).");
        return;
    }

    // Objeto base compartilhado por todos os registros
    const basePayload = {
        corretora_id: corretoraId,
        corretor_id: corretorId,
        categoria_id: formCategoria,
        descricao: formDescricao,
        tipo: formTipo,
        juros: formJuros,
        desconto: formDesconto,
    };

    const salvarProcesso = async () => {
        // Caso 1: Criação de múltiplos lançamentos (Recorrência)
        if (modalModo === 'criar' && parcelasCustomizadas && parcelasCustomizadas.length > 0) {
        // Montamos um array contendo o payload individualizado de cada linha
        const múltiplosPayloads = parcelasCustomizadas.map((p) => ({
            ...basePayload,
            valor: p.valor,
            data_vencimento: p.dataVencimento,
            // Alimenta o número total de recorrências ou indica no formato ex: "1/6"
            recorrencia_parcelas: parcelasCustomizadas.length 
        }));

        // Inserção em lote no Supabase (passando o array completo)
        const { data, error } = await safeQuery<any[]>(
            Promise.resolve(
            supabase
                .from('tab_financeiro_lancamentos')
                .insert(múltiplosPayloads)
                .select()
            )
        );

        if (error) throw error;

        if (data && data.length > 0) {
            const catRelacionada = categorias.find(c => c.id === formCategoria);
            
            // Mapeamos o retorno do banco para o formato da sua interface visual
            const novosLancamentos: Lancamento[] = data.map(item => ({
            id: item.id,
            descricao: item.descricao,
            valor: Number(item.valor),
            tipo: item.tipo,
            categoriaId: item.categoria_id,
            categoriaNome: catRelacionada ? catRelacionada.name : 'Geral',
            dataVencimento: item.data_vencimento,
            dataQuitacao: null,
            status: 'pendente',
            juros: Number(item.juros),
            desconto: Number(item.desconto),
            recorrenciaParcelas: Number(item.recorrencia_parcelas)
            }));

            // Injeta todas as novas parcelas de uma vez no topo da sua lista na tela
            setLancamentos(prev => [...novosLancamentos, ...prev]);
        }
        } 
        // Caso 2: Criação padrão de uma única linha
        else if (modalModo === 'criar') {
        const payloadUnico = {
            ...basePayload,
            valor: formValor,
            data_vencimento: formDataVencimento,
            recorrencia_parcelas: 1
        };

        const { data, error } = await safeQuery<any[]>(
            Promise.resolve(
            supabase
                .from('tab_financeiro_lancamentos')
                .insert([payloadUnico])
                .select()
            )
        );

        if (error) throw error;

        if (data && data[0]) {
            const catRelacionada = categorias.find(c => c.id === formCategoria);
            const novo: Lancamento = {
            id: data[0].id,
            descricao: data[0].descricao,
            valor: Number(data[0].valor),
            tipo: data[0].tipo,
            categoriaId: data[0].categoria_id,
            categoriaNome: catRelacionada ? catRelacionada.name : 'Geral',
            dataVencimento: data[0].data_vencimento,
            dataQuitacao: null,
            status: 'pendente',
            juros: Number(data[0].juros),
            desconto: Number(data[0].desconto),
            recorrenciaParcelas: Number(data[0].recorrencia_parcelas)
            };
            setLancamentos(prev => [novo, ...prev]);
        }
        } 
        // Caso 3: Edição de registro existente
        else if (modalModo === 'editar' && selectedLancamento) {
        const payloadEdicao = {
            ...basePayload,
            valor: formValor,
            data_vencimento: formDataVencimento,
            recorrencia_parcelas: formRecorrencia
        };

        const { error } = await safeQuery<any>(
            Promise.resolve(
            supabase
                .from('tab_financeiro_lancamentos')
                .update(payloadEdicao)
                .eq('id', selectedLancamento.id)
            )
        );

        if (error) throw error;

        const catRelacionada = categorias.find(c => c.id === formCategoria);
        setLancamentos(prev => prev.map(item => 
            item.id === selectedLancamento.id ? {
            ...item,
            descricao: formDescricao,
            valor: formValor,
            tipo: formTipo,
            categoriaId: formCategoria,
            categoriaNome: catRelacionada ? catRelacionada.name : item.categoriaNome,
            dataVencimento: formDataVencimento,
            juros: formJuros,
            desconto: formDesconto,
            recorrenciaParcelas: formRecorrencia
            } : item
        ));
        }
    };

    // Executa com toast promise instantâneo
    toast.promise(salvarProcesso(), {
        loading: 'Processando lançamentos no banco...',
        success: modalModo === 'criar' 
        ? (parcelasCustomizadas && parcelasCustomizadas.length > 1 
            ? `${parcelasCustomizadas.length} parcelas adicionadas com sucesso!` 
            : 'Lançamento adicionado com sucesso!')
        : 'Lançamento atualizado com sucesso!',
        error: 'Erro ao salvar o registro financeiro.'
    });

    setIsModalOpen(false);
    };

  // CORRIGIDO: Query interna atualizada para trazer os campos e respeitar o tipo CategoriaPlano[]
  const handleSalvarPlanoDeContas = () => {
    supabase
      .from('tab_financeiro_plano_de_contas')
      .select('id, name, tipo, parent_id, depth, ordem')
      .eq('corretora_id', corretoraId)
      .then(({ data }) => {
        if (data) setCategorias(data as CategoriaPlano[]);
      });
    setIsPlanoModalOpen(false);
  };

  const handleExportarPDF = () => {
    toast.promise(
      new Promise(resolve => setTimeout(() => {
        gerarPDFLancamentos(lancamentosFiltrados, resumo);
        resolve(true);
      }, 200)),
      {
        loading: 'Compilando PDF...',
        success: 'PDF baixado!',
        error: 'Erro na geração.'
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans bg-gray-50/50 min-h-screen">
      <Toaster position="top-right" richColors duration={1200} />

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos Financeiros</h1>
          <p className="text-sm text-gray-500">Fluxo operacional consolidado de caixas e contas conectado ao banco.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPlanoModalOpen(true)}
            className="border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 shadow-sm transition"
          >
            Estruturar Categorias
          </button>
          <button 
            onClick={handleExportarPDF} 
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 shadow-sm transition"
          >
            <Download size={16} /> Exportar PDF
          </button>
          <button 
            onClick={abrirModalParaCriar}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition"
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* COMPONENTE DE MÉTRICAS */}
      <CardsResumo 
        entradas={resumo.entradas} 
        saidas={resumo.saidas} 
        saldo={resumo.saldo} 
      />

      {/* COMPONENTE DE CONTROLES E FILTROS */}
      <PainelFiltros 
        busca={busca} setBusca={setBusca}
        precisao={precisao} setPrecisao={setPrecisao}
        tipoFiltro={tipoFiltro} setTipoFiltro={setTipoFiltro}
        statusParcela={statusParcela} setStatusParcela={setStatusParcela}
        dataInicio={dataInicio} setDataInicio={setDataInicio}
        dataFim={dataFim} setDataFim={setDataFim}
        tipoDataFiltro={tipoDataFiltro} setTipoDataFiltro={setTipoDataFiltro}
      />

      {/* TABELA OPERACIONAL REAL */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b font-medium text-xs text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
          <div className="col-span-4">Descrição / Categoria</div>
          <div className="col-span-2">Vencimento</div>
          <div className="col-span-2">Pagamento</div>
          <div className="col-span-2 text-right">Valor Líquido</div>
          <div className="col-span-2 text-center">Ações</div>
        </div>

        {carregando ? (
          <div className="p-12 text-center text-gray-500 text-sm animate-pulse">
            Sincronizando com o Supabase...
          </div>
        ) : lancamentosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Nenhum lançamento corresponde aos filtros atuais.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lancamentosFiltrados.map((item) => (
              <div key={item.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-gray-50/60 transition-colors">
                
                <div className="col-span-4 flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-gray-800">{item.descricao}</span>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                    <span className={`px-1.5 py-0.25 rounded uppercase text-[9px] font-bold ${item.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {item.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                    </span>
                    <ChevronRight size={10} />
                    <span className="truncate max-w-[200px]">{item.categoriaNome}</span>
                  </div>
                </div>

                <div className="col-span-2 text-sm text-gray-600 flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  {item.dataVencimento}
                </div>

                <div className="col-span-2 text-sm">
                  {item.dataQuitacao ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-medium text-xs">
                      {item.dataQuitacao}
                    </span>
                  ) : (
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg font-medium text-xs">
                      Em aberto
                    </span>
                  )}
                </div>

                <div className={`col-span-2 text-sm font-bold text-right ${item.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  R$ {((item.valor + item.juros) - item.desconto).toFixed(2)}
                </div>

                <div className="col-span-2 flex justify-center gap-1">
                  <button 
                    onClick={() => handleAlternarBaixa(item.id)}
                    className={`p-1.5 rounded-lg transition ${item.status === 'pago' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    title={item.status === 'pago' ? "Estornar Baixa" : "Liquidar Conta"}
                  >
                    {item.status === 'pago' ? <Undo2 size={16} /> : <CheckCircle size={16} />}
                  </button>
                  <button 
                    onClick={() => abrirModalParaEditar(item)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleExcluir(item.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE GESTÃO DE LANÇAMENTOS */}
      <ModalLancamento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        modo={modalModo}
        selectedLancamento={selectedLancamento}
        categorias={categorias}
        formTipo={formTipo} setFormTipo={setFormTipo}
        formCategoria={formCategoria} setFormCategoria={setFormCategoria}
        formDescricao={formDescricao} setFormDescricao={setFormDescricao}
        formValor={formValor} setFormValor={setFormValor}
        formJuros={formJuros} setFormJuros={setFormJuros}
        formDesconto={formDesconto} setFormDesconto={setFormDesconto}
        formRecorrencia={formRecorrencia} setFormRecorrencia={setFormRecorrencia}
        formDataVencimento={formDataVencimento} setFormDataVencimento={setFormDataVencimento}
        onSalvar={handleSalvarLancamento}
      />

      {/* MODAL DO PLANO DE CONTAS */}
      <ModalPlanoDeContas 
        isOpen={isPlanoModalOpen}
        onClose={handleSalvarPlanoDeContas}
        modo="criar"
        nodePai={null}
        itemSelecionado={null}
        corretoraId={corretoraId}
        usuarioId={corretorId}
        onSalvar={handleSalvarPlanoDeContas}
      />
    </div>
  );
}