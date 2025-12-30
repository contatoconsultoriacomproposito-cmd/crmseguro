import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { X, DollarSign, Percent, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- UTILITÁRIOS DE FORMATAÇÃO ---
const formatarMoeda = (valor: string | number) => {
  const v = String(valor).replace(/\D/g, "");
  if (!v) return "";
  const options = { minimumFractionDigits: 2 };
  const result = new Intl.NumberFormat("pt-BR", options).format(
    parseFloat(v) / 100
  );
  return "R$ " + result;
};

const desformatarMoeda = (valor: string) => {
  if (!valor) return 0;
  return parseFloat(valor.replace(/\D/g, "")) / 100;
};

interface ModalComissoesProps {
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalComissoes = ({ itemId, onClose, onSuccess }: ModalComissoesProps) => {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [comissaoExistente, setComissaoExistente] = useState<any>(null);

  // Estados dos Campos
  const [dataVenda, setDataVenda] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [valorExibicao, setValorExibicao] = useState(''); // Máscara de Moeda
  const [dataRecebimento, setDataRecebimento] = useState('');

  useEffect(() => {
    if (itemId) fetchDadosIniciais();
  }, [itemId]);

  const fetchDadosIniciais = async () => {
    setCarregando(true);
    try {
      const { data: item, error: errorItem } = await supabase
        .from('tab_proposta_itens')
        .select(`
          *,
          base_produtos (nome),
          tab_proposta_opcoes (
            id, proposta_id, seguradora_id,
            base_seguradoras (nome),
            tab_propostas (data_emissao, cliente_id, corretor_id)
          )
        `)
        .eq('id', itemId)
        .single();

      if (errorItem || !item) throw new Error("Item não localizado.");

      const opcao = item.tab_proposta_opcoes;
      const proposta = opcao?.tab_propostas;

      const { data: comData } = await supabase
        .from('tab_comissoes')
        .select('*')
        .eq('item_id', itemId)
        .maybeSingle();

      setDadosBase({
        ...item,
        nome_seguradora: opcao?.base_seguradoras?.nome || 'NÃO LOCALIZADA',
        nome_produto: item.base_produtos?.nome || 'PRODUTO NÃO DEFINIDO',
        proposta_id: opcao?.proposta_id,
        cliente_id: proposta?.cliente_id,
        corretor_id: proposta?.corretor_id,
        seguradora_id: opcao?.seguradora_id
      });

      if (comData) {
        setComissaoExistente(comData);
        setDataVenda(comData.data_venda || '');
        setDataVencimento(comData.data_vencimento_comissao || '');
        // Carrega o valor já formatando com a máscara (multiplica por 100 para a lógica da função)
        setValorExibicao(formatarMoeda((comData.valor_comissao * 100).toFixed(0)));
        setDataRecebimento(comData.data_recebimento || '');
      } else {
        setDataVenda(proposta?.data_emissao?.split('T')[0] || '');
      }
    } catch (err: any) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  };

  const calcularPercentual = () => {
    const premio = parseFloat(dadosBase?.valor_premio) || 0;
    const comissao = desformatarMoeda(valorExibicao);
    return premio > 0 ? ((comissao / premio) * 100).toFixed(2) : "0.00";
  };

  const handleSalvar = async () => {
    if (comissaoExistente?.data_recebimento) return;
    setSalvando(true);
    try {
      const statusFinal = dataRecebimento ? 'RECEBIDA' : 'PENDENTE';
      const valorNumerico = desformatarMoeda(valorExibicao);

      const payload = {
        item_id: itemId,
        proposta_id: dadosBase?.proposta_id || null,
        cliente_id: dadosBase?.cliente_id || null,
        corretor_id: dadosBase?.corretor_id || null,
        produto_id: dadosBase?.produto_id || null,
        seguradora_id: dadosBase?.seguradora_id || null,
        nome_seguradora: dadosBase?.nome_seguradora || 'NÃO INFORMADA',
        data_venda: dataVenda,
        data_vencimento_comissao: dataVencimento,
        valor_comissao: valorNumerico,
        percentual_comissao: parseFloat(calcularPercentual()),
        data_recebimento: dataRecebimento || null,
        status_comissao: statusFinal 
      };

      const { error } = comissaoExistente 
        ? await supabase.from('tab_comissoes').update(payload).eq('id', comissaoExistente.id)
        : await supabase.from('tab_comissoes').insert([payload]);

      if (error) throw error;

      toast.success("Financeiro atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar lançamento.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return null;
  const isRecebida = !!comissaoExistente?.data_recebimento;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181b] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
          <div>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-600 text-[9px] font-black uppercase rounded-md tracking-tighter">Módulo Financeiro</span>
            <h2 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <DollarSign className="text-green-500" size={20} /> Gestão de Comissão
            </h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-all"><X size={20} /></button>
        </div>

        <div className="p-8">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-2 text-zinc-400/80">Seguradora / Produto</p>
              <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase truncate">{dadosBase?.nome_seguradora}</p>
              <p className="text-xs font-bold text-blue-500 uppercase truncate">{dadosBase?.nome_produto}</p>
            </div>
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-2 text-zinc-400/80">Dados da Apólice</p>
              <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase">
                R$ {Number(dadosBase?.valor_premio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">Apólice: {dadosBase?.numero_apolice || 'N/A'}</p>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Data da Venda</label>
                <input type="date" disabled={isRecebida} value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Valor Comissão (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    type="text" 
                    disabled={isRecebida} 
                    placeholder="R$ 0,00" 
                    value={valorExibicao} 
                    onChange={(e) => setValorExibicao(formatarMoeda(e.target.value))} 
                    className="w-full pl-10 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50" 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Vencimento Comissão</label>
                <input type="date" disabled={isRecebida} value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Percentual</label>
                <div className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-black flex items-center gap-2">
                  <Percent size={14} className="text-blue-500" /> {calcularPercentual()}%
                </div>
              </div>
            </div>
          </div>

          {/* Seção Liquidação */}
        <div className="mb-8 p-6 rounded-3xl bg-green-500/5 border-2 border-dashed border-green-500/20">
        <label className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase mb-3">
            <ShieldCheck size={16} /> Data de Recebimento (Liquidação)
        </label>
        <input 
            type="date" 
            disabled={isRecebida} 
            value={dataRecebimento} 
            onChange={(e) => setDataRecebimento(e.target.value)} 
            className="w-full p-4 rounded-2xl border-2 border-white dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:border-green-500 disabled:opacity-50" 
        />
        </div>

        {!isRecebida ? (
        <button 
            onClick={handleSalvar} 
            disabled={salvando || !dataVenda || !valorExibicao} 
            className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 disabled:opacity-50 
            ${dataRecebimento 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20' 
                : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 text-white hover:bg-zinc-800'
            }`}
        >
            {salvando ? "Sincronizando..." : dataRecebimento ? "Confirmar e Liquidar" : "Salvar Lançamento Financeiro"}
        </button>
        ) : (
        <div className="w-full py-5 bg-green-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-green-500/20">
            <CheckCircle2 size={20} /> Comissão Liquidada em {new Date(dataRecebimento + 'T00:00:00').toLocaleDateString('pt-BR')}
        </div>
        )}
        </div>
      </div>
    </div>
  );
};