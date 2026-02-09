import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { X, DollarSign, Percent, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const formatarMoeda = (valor: string | number) => {
  const v = String(valor).replace(/\D/g, "");
  if (!v) return "";
  const result = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(
    parseFloat(v) / 100
  );
  return "R$ " + result;
};

const desformatarMoeda = (valor: string) => {
  if (!valor) return 0;
  return parseFloat(valor.replace(/\D/g, "")) / 100;
};

const validarDataSegura = (data: string) => {
  if (!data) return false;
  const partes = data.split('-');
  if (partes.length !== 3) return false;
  return partes[0].length === 4 && parseInt(partes[0]) >= 2000;
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

  const [inputVenda, setInputVenda] = useState('');
  const [inputVencimento, setInputVencimento] = useState('');
  const [inputRecebimento, setInputRecebimento] = useState('');
  const [inputPagamentoParceiro, setInputPagamentoParceiro] = useState('');
  const [valorExibicao, setValorExibicao] = useState('');
  const [valorRepasseExibicao, setValorRepasseExibicao] = useState('');

  const [erros, setErros] = useState<string[]>([]);

  const fetchDadosIniciais = useCallback(async () => {
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
            tab_propostas (
              data_emissao, cliente_id, corretor_id, parceiro_id, corretora_id,
              tab_parceiros (nome_parceiro)
            )
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
        proposta_id: item.proposta_id || opcao?.proposta_id, // Adicionado item.proposta_id como fallback
        cliente_id: proposta?.cliente_id,
        corretor_id: proposta?.corretor_id,
        corretora_id: proposta?.corretora_id,
        seguradora_id: item.seguradora_id || opcao?.seguradora_id,
        parceiro_id: proposta?.parceiro_id,
        nome_parceiro: proposta?.tab_parceiros?.nome_parceiro || null
      });

      if (comData) {
        setComissaoExistente(comData);
        setInputVenda(comData.data_venda || '');
        setInputVencimento(comData.data_vencimento_comissao || '');
        setInputRecebimento(comData.data_recebimento || '');
        setInputPagamentoParceiro(comData.data_pagamento_parceiro || '');
        setValorExibicao(formatarMoeda((comData.valor_comissao * 100).toFixed(0)));
        setValorRepasseExibicao(formatarMoeda((comData.valor_repasse * 100).toFixed(0)));
      } else {
        setInputVenda(proposta?.data_emissao?.split('T')[0] || '');
      }
    } catch (err: any) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) fetchDadosIniciais();
  }, [itemId, fetchDadosIniciais]);

  const calcularPercentual = () => {
    const premio = parseFloat(dadosBase?.valor_premio) || 0;
    const comissao = desformatarMoeda(valorExibicao);
    return premio > 0 ? ((comissao / premio) * 100).toFixed(2) : "0.00";
  };

  const calcularPercentualRepasse = () => {
    const valorComissaoPrincipal = desformatarMoeda(valorExibicao);
    const valorRepasse = desformatarMoeda(valorRepasseExibicao);
    return valorComissaoPrincipal > 0 ? ((valorRepasse / valorComissaoPrincipal) * 100).toFixed(2) : "0.00";
  };

const handleSalvar = async () => {
    if (salvando || !dadosBase) return;
    setErros([]);

    // 1. Validação Visual
    const novosErros: string[] = [];
    if (!inputVenda) novosErros.push('data_venda');
    if (!inputVencimento) novosErros.push('data_vencimento');
    const valorNum = desformatarMoeda(valorExibicao);
    if (valorNum <= 0) novosErros.push('valor_comissao');

    if (novosErros.length > 0) {
      setErros(novosErros);
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setSalvando(true);

    try {
      // 2. Obter Sessão e Perfil
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão inválida.");

      const { data: perfil, error: errPerfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', session.user.id)
        .single();

      if (errPerfil || !perfil?.corretora_id) {
        throw new Error("Perfil sem corretora vinculada.");
      }

      const parseUUID = (id: any) => (id && id !== "" ? id : null);

      // 3. Montagem do Payload obedecendo a 'WITH CHECK' (auth.uid() = corretor_id)
      const payload = {
        proposta_id: parseUUID(dadosBase.proposta_id),
        item_id: parseUUID(itemId),
        cliente_id: parseUUID(dadosBase.cliente_id),
        // OBRIGATÓRIO pela Policy: deve ser o ID do usuário logado
        corretor_id: session.user.id, 
        produto_id: parseUUID(dadosBase.produto_id),
        seguradora_id: parseUUID(dadosBase.seguradora_id),
        corretora_id: perfil.corretora_id,
        nome_seguradora: (dadosBase.nome_seguradora || 'NÃO INFORMADA').substring(0, 100),
        data_venda: inputVenda,
        data_vencimento_comissao: inputVencimento,
        valor_comissao: valorNum,
        percentual_comissao: parseFloat(calcularPercentual()) || 0,
        data_recebimento: validarDataSegura(inputRecebimento) ? inputRecebimento : null,
        status_comissao: inputRecebimento ? 'RECEBIDA' : 'PENDENTE',
        parceiro_id: parseUUID(dadosBase.parceiro_id),
        valor_repasse: desformatarMoeda(valorRepasseExibicao) || 0,
        percentual_repasse: parseFloat(calcularPercentualRepasse()) || 0,
        data_pagamento_parceiro: validarDataSegura(inputPagamentoParceiro) ? inputPagamentoParceiro : null,
        status_repasse: inputPagamentoParceiro ? 'PAGO' : 'PENDENTE'
      };

      // 4. Execução
      const { error } = comissaoExistente?.id
        ? await supabase.from('tab_comissoes').update(payload).eq('id', comissaoExistente.id)
        : await supabase.from('tab_comissoes').insert([payload]);

      if (error) throw error;

      toast.success("Dados financeiros salvos!");
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error("Erro RLS:", err);
      // Explicação clara baseada na Policy encontrada
      const msg = err.code === '42501' 
        ? "A política de segurança exige que o Corretor seja você mesmo (auth.uid)." 
        : err.message;
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return null;

  const labelBotao = salvando ? "Sincronizando..." : comissaoExistente ? "Atualizar Lançamento" : "Salvar Lançamento";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181b] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
          <div>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-600 text-[9px] font-black uppercase rounded-md tracking-tighter">Módulo Financeiro</span>
            <h2 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <DollarSign className="text-green-500" size={20} /> Gestão de Comissão
            </h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-all"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[80vh]">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-left">
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Seguradora / Produto</p>
              <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase truncate">{dadosBase?.nome_seguradora}</p>
              <p className="text-xs font-bold text-blue-500 uppercase">{dadosBase?.nome_produto}</p>
            </div>
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Dados da Apólice</p>
              <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                R$ {Number(dadosBase?.valor_premio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">Apólice: {dadosBase?.numero_apolice || 'N/A'}</p>
            </div>
          </div>

          {dadosBase?.parceiro_id && (
            <div className="mb-8 p-6 rounded-[2.5rem] bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Repasse ao Parceiro</p>
                  <p className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase italic">{dadosBase?.nome_parceiro}</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 text-left">
                <div className="col-span-5">
                  <label className="text-[10px] font-black text-blue-400 uppercase ml-2 mb-1 block">Valor a Pagar</label>
                  <input 
                    type="text"
                    value={valorRepasseExibicao}
                    onChange={(e) => setValorRepasseExibicao(formatarMoeda(e.target.value))}
                    className="w-full p-4 rounded-2xl border border-blue-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 flex items-end pb-1">
                  <div className="w-full h-[52px] rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center leading-tight shadow-md">
                    <span className="text-[7px] uppercase font-bold opacity-80">Sobre Com.</span>
                    <span className="text-xs font-black">{calcularPercentualRepasse()}%</span>
                  </div>
                </div>
                <div className="col-span-5">
                  <label className="text-[10px] font-black text-blue-400 uppercase ml-2 mb-1 block">Data do Pagamento</label>
                  <input 
                    type="date"
                    value={inputPagamentoParceiro}
                    onChange={(e) => setInputPagamentoParceiro(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-blue-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-8 text-left">
            <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1 flex items-center gap-1 ${erros.includes('data_venda') ? 'text-red-500' : 'text-zinc-400'}`}>
                  {erros.includes('data_venda') && <AlertCircle size={10} />} Data da Venda *
                </label>
                <input 
                  type="date" 
                  value={inputVenda} 
                  onChange={(e) => setInputVenda(e.target.value)} 
                  className={`w-full p-4 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-bold outline-none transition-all ${erros.includes('data_venda') ? 'border-red-500 ring-2 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500'} text-zinc-800 dark:text-zinc-200`} 
                />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1 flex items-center gap-1 ${erros.includes('valor_comissao') ? 'text-red-500' : 'text-zinc-400'}`}>
                  {erros.includes('valor_comissao') && <AlertCircle size={10} />} Valor Comissão (R$) *
                </label>
                <div className="relative">
                  <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 ${erros.includes('valor_comissao') ? 'text-red-500' : 'text-zinc-400'}`} size={16} />
                  <input 
                    type="text" 
                    placeholder="R$ 0,00" 
                    value={valorExibicao} 
                    onChange={(e) => setValorExibicao(formatarMoeda(e.target.value))} 
                    className={`w-full pl-10 p-4 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-black outline-none transition-all ${erros.includes('valor_comissao') ? 'border-red-500 ring-2 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-green-500'} text-zinc-800 dark:text-zinc-200`} 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1 flex items-center gap-1 ${erros.includes('data_vencimento') ? 'text-red-500' : 'text-zinc-400'}`}>
                  {erros.includes('data_vencimento') && <AlertCircle size={10} />} Vencimento Comissão *
                </label>
                <input 
                  type="date" 
                  value={inputVencimento} 
                  onChange={(e) => setInputVencimento(e.target.value)} 
                  className={`w-full p-4 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-bold outline-none transition-all ${erros.includes('data_vencimento') ? 'border-red-500 ring-2 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500'} text-zinc-800 dark:text-zinc-200`} 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Percentual s/ Prêmio</label>
                <div className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-black flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
                  <Percent size={14} className="text-blue-500" /> {calcularPercentual()}%
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 p-6 rounded-3xl bg-green-500/5 border-2 border-dashed border-green-500/20 text-left">
            <label className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase mb-3">
                <CheckCircle2 size={16} /> Data de Recebimento (Liquidação Corretora)
            </label>
            <input 
                type="date" 
                value={inputRecebimento} 
                onChange={(e) => setInputRecebimento(e.target.value)} 
                className="w-full p-4 rounded-2xl border-2 border-white dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:border-green-500 text-zinc-800 dark:text-zinc-200" 
            />
          </div>

          <button 
              type="button"
              onClick={handleSalvar} 
              disabled={salvando} 
              className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 text-white hover:bg-zinc-800 shadow-zinc-500/10 disabled:opacity-50"
          >
              {labelBotao}
          </button>
        </div>
      </div>
    </div>
  );
};