import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { X, DollarSign, Percent, Calendar, ShieldCheck, AlertCircle, HelpCircle, Plus, Trash2 } from 'lucide-react';
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

interface FaixaComissao {
  id: string;
  parcelaInicio: number;
  parcelaFim: number;
  pctComissaoVenda: string;
}

interface ModalComissoesProps {
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalComissoes = ({ itemId, onClose, onSuccess }: ModalComissoesProps) => {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [regraExistente, setRegraExistente] = useState<any>(null);

  // Inputs Principais
  const [valorBase, setValorBase] = useState('');
  const [inputVenda, setInputVenda] = useState('');
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'UNICA' | 'MENSAL'>('UNICA');
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [diaVencimento, setDiaVencimento] = useState(10);
  
  // NOVA REGRA DE NEGÓCIO: Controla se o valor bruto informado deve ser fatiado ao longo dos meses
  const [ratearPremioAnual, setRatearPremioAnual] = useState(false);

  // Percentuais Fixos de Split
  const [pctCorretor, setPctCorretor] = useState('');
  const [pctParceiro, setPctParceiro] = useState('');

  // Grade Dinâmica de Faixas de Percentuais da Seguradora
  const [faixas, setFaixas] = useState<FaixaComissao[]>([
    { id: '1', parcelaInicio: 1, parcelaFim: 1, pctComissaoVenda: '100' }
  ]);

  // NOVO ESTADO: Armazena as edições manuais feitas diretamente na tabela de parcelas { [numero_parcela]: valor_manual }
  const [valoresCustomizadosParcelas, setValoresCustomizadosParcelas] = useState<{ [key: number]: number }>({});

  const [erros, setErros] = useState<string[]>([]);

  // Monitora alterações de quantidade de parcelas para ajustar os limites das faixas automaticamente
  useEffect(() => {
    if (tipoRecorrencia === 'UNICA') {
      setFaixas([{ id: 'init-unica', parcelaInicio: 1, parcelaFim: 1, pctComissaoVenda: faixas[0]?.pctComissaoVenda || '100' }]);
    } else {
      setFaixas(prev => {
        if (prev.length === 1 && prev[0].parcelaFim === 1) {
          return [{ ...prev[0], parcelaFim: qtdParcelas }];
        }
        return prev;
      });
    }
  }, [tipoRecorrencia, qtdParcelas]);

  // NOVO EFEITO: Reseta edições manuais se o usuário mudar parâmetros macro de cálculo do cabeçalho
  useEffect(() => {
    setValoresCustomizadosParcelas({});
  }, [valorBase, qtdParcelas, tipoRecorrencia, ratearPremioAnual]);

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

      setDadosBase({
        ...item,
        nome_seguradora: opcao?.base_seguradoras?.nome || 'NÃO LOCALIZADA',
        nome_produto: item.base_produtos?.nome || 'PRODUTO NÃO DEFINIDO',
        proposta_id: item.proposta_id || opcao?.proposta_id,
        cliente_id: proposta?.cliente_id,
        corretor_id: proposta?.corretor_id,
        corretora_id: proposta?.corretora_id,
        seguradora_id: item.seguradora_id || opcao?.seguradora_id,
        parceiro_id: proposta?.parceiro_id,
        nome_parceiro: proposta?.tab_parceiros?.nome_parceiro || null,
        periodicidade: item.periodicidade || 'ANUAL'
      });

      if (item.periodicidade === 'MENSAL') {
        setTipoRecorrencia('MENSAL');
        setQtdParcelas(12);
      }

      const { data: regraData } = await supabase
        .from('tab_comissoes_regras')
        .select('*')
        .eq('item_id', itemId)
        .maybeSingle();

      if (regraData) {
        setRegraExistente(regraData);
        setValorBase(formatarMoeda((regraData.base_calculo_valor * 100).toFixed(0)));
        setInputVenda(regraData.data_venda || '');
        setTipoRecorrencia(regraData.tipo_recorrencia);
        setQtdParcelas(regraData.quantidade_parcelas);
        setDiaVencimento(regraData.dia_vencimento_parcelas);
        setPctCorretor(String(regraData.pct_corretor));
        setPctParceiro(String(regraData.pct_parceiro));

        if (regraData.meta_faixas_json) {
          setFaixas(regraData.meta_faixas_json);
        } else {
          setFaixas([
            { id: '1', parcelaInicio: 1, parcelaFim: regraData.quantidade_parcelas, pctComissaoVenda: String(regraData.pct_comissao_venda) }
          ]);
        }
      } else {
        setValorBase(formatarMoeda((Number(item.valor_premio || 0) * 100).toFixed(0)));
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

  const adicionarFaixa = () => {
    const ultimaFaixa = faixas[faixas.length - 1];
    const proximaParcela = ultimaFaixa ? Number(ultimaFaixa.parcelaFim) + 1 : 1;
    
    if (proximaParcela > qtdParcelas) {
      toast.error("Todas as parcelas do cronograma já estão cobertas por faixas.");
      return;
    }

    setFaixas([
      ...faixas,
      {
        id: crypto.randomUUID(),
        parcelaInicio: proximaParcela,
        parcelaFim: qtdParcelas,
        pctComissaoVenda: '0'
      }
    ]);
  };

  const removerFaixa = (id: string) => {
    if (faixas.length === 1) {
      toast.error("É necessário ter pelo menos uma faixa de comissão.");
      return;
    }
    setFaixas(faixas.filter(f => f.id !== id));
  };

  const atualizarFaixa = (id: string, campo: keyof FaixaComissao, valor: any) => {
    setFaixas(faixas.map(f => {
      if (f.id === id) {
        return { ...f, [campo]: valor };
      }
      return f;
    }));
  };

  const vBaseRaw = desformatarMoeda(valorBase);
  const pCorretor = parseFloat(pctCorretor) || 0;
  const pParceiro = parseFloat(pctParceiro) || 0;

  // Geração Dinâmica do Cronograma com suporte à interceptação e edição de valores por parcela
  const gerarCronogramaSimulado = () => {
    const parcelas = [];
    if (!inputVenda || qtdParcelas <= 0) return [];

    const dataVendaObj = new Date(inputVenda + 'T00:00:00');
    const totalMeses = tipoRecorrencia === 'UNICA' ? 1 : qtdParcelas;

    for (let i = 1; i <= totalMeses; i++) {
      // REGRA DE NEGÓCIO DA BASE DA PARCELA: Verifica primeiro se há digitação/ajuste manual para esta parcela
      let valorBaseDestaParcela = valoresCustomizadosParcelas[i] !== undefined 
        ? valoresCustomizadosParcelas[i] 
        : vBaseRaw;

      // Se não há edição manual e o critério de ratear prêmio anual estiver ativo, divide pelo total de parcelas
      if (valoresCustomizadosParcelas[i] === undefined && dadosBase?.periodicidade === 'ANUAL' && ratearPremioAnual && tipoRecorrencia === 'MENSAL') {
        valorBaseDestaParcela = vBaseRaw / qtdParcelas;
      }

      const faixaCorrespondente = faixas.find(f => i >= Number(f.parcelaInicio) && i <= Number(f.parcelaFim));
      const pVendaParcela = faixaCorrespondente ? parseFloat(faixaCorrespondente.pctComissaoVenda) || 0 : 0;

      const comissaoTotalCorretoraParcela = valorBaseDestaParcela * (pVendaParcela / 100);
      const repasseCorretorParcela = comissaoTotalCorretoraParcela * (pCorretor / 100);
      const repasseParceiroParcela = dadosBase?.parceiro_id ? comissaoTotalCorretoraParcela * (pParceiro / 100) : 0;
      const saldoLiquidoCorretoraParcela = comissaoTotalCorretoraParcela - repasseCorretorParcela - repasseParceiroParcela;

      const dataProjetada = new Date(dataVendaObj.getFullYear(), dataVendaObj.getMonth() + i, diaVencimento);

      parcelas.push({
        numero: i,
        vencimento: dataProjetada.toISOString().split('T')[0],
        baseParcela: valorBaseDestaParcela,
        pctAplicado: pVendaParcela,
        total: comissaoTotalCorretoraParcela,
        corretor: repasseCorretorParcela,
        parceiro: repasseParceiroParcela,
        corretora: saldoLiquidoCorretoraParcela,
      });
    }
    return parcelas;
  };

  const cronogramaSimulado = gerarCronogramaSimulado();

  const totalBoloCheioAcumulado = cronogramaSimulado.reduce((acc, p) => acc + p.total, 0);
  const totalRepasseCorretorAcumulado = cronogramaSimulado.reduce((acc, p) => acc + p.corretor, 0);
  const totalRepasseParceiroAcumulado = cronogramaSimulado.reduce((acc, p) => acc + p.parceiro, 0);
  const totalLiquidoCorretoraAcumulado = cronogramaSimulado.reduce((acc, p) => acc + p.corretora, 0);

  const handleSalvar = async () => {
    if (salvando || !dadosBase) return;
    setErros([]);

    const novosErros: string[] = [];
    if (vBaseRaw <= 0) novosErros.push('base_calculo_valor');
    if (!inputVenda) novosErros.push('data_venda');
    if (tipoRecorrencia === 'MENSAL' && qtdParcelas <= 1) novosErros.push('quantidade_parcelas');

    let faixasValidas = true;
    faixas.forEach(f => {
      if (Number(f.parcelaInicio) <= 0 || Number(f.parcelaFim) <= 0 || parseFloat(f.pctComissaoVenda) < 0) {
        faixasValidas = false;
      }
    });

    if (!faixasValidas) {
      toast.error("Verifique as parcelas e percentuais preenchidos nas faixas.");
      return;
    }

    if (novosErros.length > 0) {
      setErros(novosErros);
      toast.error("Verifique as regras e campos obrigatórios.");
      return;
    }

    setSalvando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão inválida.");

      const { data: perfil, error: errPerfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', session.user.id)
        .single();

      if (errPerfil || !perfil?.corretora_id) throw new Error("Perfil sem corretora vinculada.");

      const parseUUID = (id: any) => (id && id !== "" ? id : null);
      const pctPrimeiraFaixa = faixas[0] ? parseFloat(faixas[0].pctComissaoVenda) || 0 : 0;

      // Define a base padrão estrutural que persistirá no registro mestre da regra
      let baseCalculoFinalSalvar = vBaseRaw;
      if (dadosBase?.periodicidade === 'ANUAL' && ratearPremioAnual && tipoRecorrencia === 'MENSAL') {
        baseCalculoFinalSalvar = vBaseRaw / qtdParcelas;
      }

      const payloadRegra = {
        proposta_id: parseUUID(dadosBase.proposta_id),
        item_id: parseUUID(itemId),
        cliente_id: parseUUID(dadosBase.cliente_id),
        corretor_id: session.user.id,
        produto_id: parseUUID(dadosBase.produto_id),
        seguradora_id: parseUUID(dadosBase.seguradora_id),
        corretora_id: perfil.corretora_id,
        parceiro_id: parseUUID(dadosBase.parceiro_id),
        
        base_calculo_valor: parseFloat(baseCalculoFinalSalvar.toFixed(2)),
        tipo_recorrencia: tipoRecorrencia,
        quantidade_parcelas: tipoRecorrencia === 'UNICA' ? 1 : qtdParcelas,
        data_venda: inputVenda,
        dia_vencimento_parcelas: diaVencimento,
        
        pct_comissao_venda: pctPrimeiraFaixa,
        pct_corretor: pCorretor,
        pct_parceiro: dadosBase.parceiro_id ? pParceiro : 0,
        meta_faixas_json: faixas
      };

      let regraId = regraExistente?.id;

      if (regraId) {
        const { error: errUpdate } = await supabase
          .from('tab_comissoes_regras')
          .update(payloadRegra)
          .eq('id', regraId);
        if (errUpdate) throw errUpdate;

        const { error: errDel } = await supabase
          .from('tab_financeiro_provisoes')
          .delete()
          .eq('regra_comissao_id', regraId);
        if (errDel) throw errDel;
      } else {
        const { data: novaRegra, error: errInsert } = await supabase
          .from('tab_comissoes_regras')
          .insert([payloadRegra])
          .select()
          .single();
        if (errInsert) throw errInsert;
        regraId = novaRegra.id;
      }

      // Constrói as provisões mapeando os valores gerados linha a linha (que contam com possíveis juros/edições)
      const payloadProvisoes = cronogramaSimulado.map((p) => ({
        regra_comissao_id: regraId,
        corretora_id: perfil.corretora_id,
        numero_parcela: p.numero,
        data_vencimento_previsto: p.vencimento,
        valor_base_parcela: parseFloat(p.baseParcela.toFixed(2)),
        valor_comissao_total: parseFloat(p.total.toFixed(2)),
        valor_direito_corretor: parseFloat(p.corretor.toFixed(2)),
        valor_direito_parceiro: parseFloat(p.parceiro.toFixed(2)),
        valor_direito_corretora_mae: parseFloat(p.corretora.toFixed(2)),
        status_recebimento_seguradora: 'PREVISTO',
        status_repasse_corretor: p.corretor > 0 ? 'PENDENTE' : 'N/A',
        status_repasse_parceiro: p.parceiro > 0 ? 'PENDENTE' : 'N/A'
      }));

      const { error: errProvisoes } = await supabase
        .from('tab_financeiro_provisoes')
        .insert(payloadProvisoes);

      if (errProvisoes) throw errProvisoes;

      toast.success("Regras estruturadas por faixas e cronograma provisionados!");
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error(err);
      const msg = err.code === '42501' 
        ? "A política de segurança exige que o Corretor seja você mesmo (auth.uid)." 
        : err.message;
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return null;

return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181b] w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
          <div>
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase rounded-md tracking-tighter">Configuração e Provisão</span>
            <h2 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <Percent className="text-emerald-500" size={20} /> Motor de Distribuição de Comissão
            </h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-all"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[85vh] space-y-6">
          
          {/* Ficha Resumo do Item */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Seguradora / Produto</p>
              <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase truncate">{dadosBase?.nome_seguradora}</p>
              <p className="text-xs font-bold text-blue-500 uppercase">{dadosBase?.nome_produto}</p>
            </div>
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Periodicidade do Produto Original</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase">
                {dadosBase?.periodicidade}
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">Valor no Item: R$ {Number(dadosBase?.valor_premio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Bloco 1: Definição da Base, Data e Recorrência */}
          <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 text-left space-y-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" /> 1. Parâmetros Base da Proposta
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1 flex items-center gap-1 ${erros.includes('base_calculo_valor') ? 'text-red-500' : 'text-zinc-400'}`}>
                  {erros.includes('base_calculo_valor') && <AlertCircle size={10} />} Valor de Referência *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <input 
                    type="text" 
                    value={valorBase} 
                    onChange={(e) => {
                      setValorBase(formatarMoeda(e.target.value));
                      if (erros.includes('base_calculo_valor')) setErros(erros.filter(id => id !== 'base_calculo_valor'));
                    }} 
                    className={`w-full pl-9 p-3.5 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-black text-zinc-800 dark:text-zinc-200 outline-none transition-all ${
                      erros.includes('base_calculo_valor') ? 'border-red-500 ring-2 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1 flex items-center gap-1 ${erros.includes('data_venda') ? 'text-red-500' : 'text-zinc-400'}`}>
                  {erros.includes('data_venda') && <AlertCircle size={10} />} Data da Venda *
                </label>
                <input 
                  type="date" 
                  value={inputVenda} 
                  onChange={(e) => {
                    setInputVenda(e.target.value);
                    if (erros.includes('data_venda')) setErros(erros.filter(id => id !== 'data_venda'));
                  }} 
                  className={`w-full p-3.5 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none transition-all ${
                    erros.includes('data_venda') ? 'border-red-500 ring-2 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Recorrência do Repasse</label>
                <select 
                  value={tipoRecorrencia} 
                  onChange={(e) => {
                    const tipo = e.target.value as 'UNICA' | 'MENSAL';
                    setTipoRecorrencia(tipo);
                    if (tipo === 'UNICA') setQtdParcelas(1);
                  }}
                  className="w-full p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-800 dark:text-zinc-200"
                >
                  <option value="UNICA">ÚNICA</option>
                  <option value="MENSAL">CRONOGRAMA PARCELADO / RECORRENTE</option>
                </select>
              </div>
            </div>

            {/* SELETOR CONDICIONAL INTELIGENTE: Só exibe se for um produto de Vigência Anual rodando em Cronograma Parcelado */}
            {dadosBase?.periodicidade === 'ANUAL' && tipoRecorrencia === 'MENSAL' && (
              <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-3">
                <input
                  id="ratear-checkbox"
                  type="checkbox"
                  checked={ratearPremioAnual}
                  onChange={(e) => setRatearPremioAnual(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:ring-2"
                />
                <label htmlFor="ratear-checkbox" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  O valor de referência informado é o <span className="font-black text-blue-500">TOTAL DA APÓLICE ANUAL</span> e deve ser fatiado igualmente pelo número de meses.
                </label>
              </div>
            )}

            {tipoRecorrencia === 'MENSAL' && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-2 mb-1 block">Quantidade de Meses (Parcelas)</label>
                  <input 
                    type="number" 
                    min={2} 
                    max={120}
                    value={qtdParcelas} 
                    onChange={(e) => setQtdParcelas(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-full p-3.5 rounded-2xl border border-blue-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-2 mb-1 block">Dia Fixo de Vencimento</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={31}
                    value={diaVencimento} 
                    onChange={(e) => setDiaVencimento(Math.min(31, Math.max(1, parseInt(e.target.value) || 10)))}
                    className="w-full p-3.5 rounded-2xl border border-blue-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bloco 2: Mapeamento de Faixas de Comissão e Splits */}
          <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 text-left space-y-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" /> 2. Matriz de Percentuais por Faixas de Parcelas
            </h3>

            <div className="space-y-3">
              <p className="text-[11px] font-bold text-zinc-500 ml-1">Configure o percentual que a seguradora repassa em cada intervalo de meses:</p>
              
              {faixas.map((faixa, index) => (
                <div key={faixa.id} className="grid grid-cols-4 gap-3 items-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1 block">Da Parcela</label>
                    <input 
                      type="number"
                      min={1}
                      disabled={index > 0}
                      value={faixa.parcelaInicio}
                      onChange={(e) => atualizarFaixa(faixa.id, 'parcelaInicio', parseInt(e.target.value) || 1)}
                      className="w-full p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-black text-zinc-700 dark:text-zinc-300 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1 block">Até a Parcela</label>
                    <input 
                      type="number"
                      min={faixa.parcelaInicio}
                      max={qtdParcelas}
                      disabled={tipoRecorrencia === 'UNICA'}
                      value={faixa.parcelaFim}
                      onChange={(e) => atualizarFaixa(faixa.id, 'parcelaFim', Math.min(qtdParcelas, parseInt(e.target.value) || 1))}
                      className="w-full p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-black text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 block">% Com. Seguradora</label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={11} />
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="100"
                        value={faixa.pctComissaoVenda}
                        onChange={(e) => atualizarFaixa(faixa.id, 'pctComissaoVenda', e.target.value)}
                        className="w-full pl-7 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-black text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  </div>
                  <div className="pt-4 text-center">
                    {tipoRecorrencia === 'MENSAL' && (
                      <button 
                        type="button"
                        onClick={() => removerFaixa(faixa.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {tipoRecorrencia === 'MENSAL' && (
                <button
                  type="button"
                  onClick={adicionarFaixa}
                  className="mt-2 py-2 px-4 rounded-xl border border-dashed border-blue-300 dark:border-zinc-700 text-blue-500 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-zinc-800/50 text-xs font-black flex items-center gap-2 transition-all"
                >
                  <Plus size={14} /> Adicionar Nova Faixa de Comissão
                </button>
              )}
            </div>

            {/* SPLITS DE DISTRIBUIÇÃO */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase ml-2 mb-1 block">% do Corretor / Angariador (Fixo)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="30"
                    value={pctCorretor} 
                    onChange={(e) => setPctCorretor(e.target.value)}
                    className="w-full pl-9 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <p className="text-[10px] font-bold text-blue-500 mt-1 ml-2">Total Repasses: {totalRepasseCorretorAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase ml-2 mb-1 block">% do Parceiro de Negócio (Fixo)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0"
                    disabled={!dadosBase?.parceiro_id}
                    value={pctParceiro} 
                    onChange={(e) => setPctParceiro(e.target.value)}
                    className="w-full pl-9 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black disabled:opacity-40 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {dadosBase?.parceiro_id ? (
                  <p className="text-[10px] font-bold text-indigo-500 mt-1 ml-2 truncate">Total Parceiro: {totalRepasseParceiroAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                ) : (
                  <p className="text-[9px] font-bold text-zinc-400 mt-1 ml-2 flex items-center gap-1"><HelpCircle size={10}/> Sem parceiro na proposta</p>
                )}
              </div>
            </div>

            {/* Card do Líquido Retido Acumulado */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Previsão Líquida Acumulada Retida (Corretora Mãe)</h4>
                <p className="text-[10px] font-bold text-zinc-400">Soma total do líquido que sobra na corretora ao fim do cronograma completo</p>
              </div>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {totalLiquidoCorretoraAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          {/* Cards Auxiliares de Totais */}
          <div className="grid grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <p className="text-[9px] font-black text-zinc-400 uppercase">Total Bruto Estimado</p>
              <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                {totalBoloCheioAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-[9px] font-black text-blue-500 uppercase">Total Repasse Corretor</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                {totalRepasseCorretorAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-[9px] font-black text-indigo-500 uppercase">Total Repasse Parceiro</p>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {totalRepasseParceiroAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          {/* Bloco 3: Preview da Esteira / Provisão Financeira */}
          {cronogramaSimulado.length > 0 && (
            <div className="text-left space-y-2">
              <div className="flex justify-between items-center ml-2">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                  Preview Técnico do Cronograma Provisionado ({cronogramaSimulado.length} parcelas)
                </h3>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  Valores Base Editáveis (Juros/Ajustes)
                </span>
              </div>
              <div className="border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-inner max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-400 font-black uppercase text-[9px] tracking-wider border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-center">Parc.</th>
                      <th className="p-3">Prev. Vencimento</th>
                      <th className="p-3 text-right w-36">Base Recorrente (R$)</th>
                      <th className="p-3 text-center">% Faixa</th>
                      <th className="p-3 text-right">Bolo Cheio (Seg.)</th>
                      <th className="p-3 text-right">Split Corretor</th>
                      <th className="p-3 text-right">Split Parceiro</th>
                      <th className="p-3 text-right bg-emerald-500/5 text-emerald-600 font-black">Líq. Corretora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                    {cronogramaSimulado.map((p) => (
                      <tr key={p.numero} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="p-3 font-black text-center text-zinc-400">{p.numero}</td>
                        <td className="p-3 font-bold">{new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        
                        {/* CAMPO REATIVO EDITÁVEL DA BASE DA PARCELA */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={p.baseParcela || ''}
                            onChange={(e) => {
                              const novoValor = parseFloat(e.target.value) || 0;
                              setValoresCustomizadosParcelas(prev => ({
                                ...prev,
                                [p.numero]: novoValor
                              }));
                            }}
                            className="w-full p-1.5 text-right font-bold bg-zinc-100 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none text-zinc-800 dark:text-zinc-200 transition-all"
                          />
                        </td>

                        <td className="p-3 text-center text-emerald-600 font-black">{p.pctAplicado}%</td>
                        <td className="p-3 text-right font-black">{p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-3 text-right text-blue-500">{p.corretor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-3 text-right text-indigo-400">{p.parceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-3 text-right bg-emerald-500/5 font-black text-emerald-600 dark:text-emerald-400">{p.corretora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botão de Gravação */}
          <button 
            type="button"
            onClick={handleSalvar} 
            disabled={salvando} 
            className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 text-white hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-zinc-500/10 disabled:opacity-50"
          >
            {salvando ? "Processando e Provisionando..." : regraExistente ? "Atualizar Regras e Reprovisionar" : "Salvar Contrato e Provisionar"}
          </button>
        </div>
      </div>
    </div>
  );
};