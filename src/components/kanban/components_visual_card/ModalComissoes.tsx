import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { X, DollarSign, Percent, Calendar, ShieldCheck, AlertCircle, HelpCircle, Plus, Trash2} from 'lucide-react';
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

interface DescontoComissao {
  id: string;
  nome: string;
  percentual: string;
}

interface DescontoCorretor {
  id: string;
  nome: string;
  tipo: 'PERCENTUAL' | 'MONETARIO';
  valor: string;
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
  
  // PEDIDO 1: Controle de IOF
  const [descontarIof, setDescontarIof] = useState(false);
  const [valorIof, setValorIof] = useState('');

  // Rateio de prêmio anual
  const [ratearPremioAnual, setRatearPremioAnual] = useState(false);

  // Percentuais Fixos de Split
  const [pctCorretor, setPctCorretor] = useState('');
  const [pctParceiro, setPctParceiro] = useState('');

  // PEDIDO 2: Descontos dinâmicos sobre a comissão da seguradora (JSONB)
  const [descontosComissao, setDescontosComissao] = useState<DescontoComissao[]>([]);

  // PEDIDO 3: Descontos dinâmicos sobre o Repasse do Corretor (Percentual ou Monetário)
  const [descontosCorretor, setDescontosCorretor] = useState<DescontoCorretor[]>([]);

  // Grade Dinâmica de Faixas de Percentuais da Seguradora
  const [faixas, setFaixas] = useState<FaixaComissao[]>([
    { id: '1', parcelaInicio: 1, parcelaFim: 1, pctComissaoVenda: '100' }
  ]);

  const [valoresCustomizadosParcelas, setValoresCustomizadosParcelas] = useState<{ [key: number]: number }>({});
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    // Se ainda estiver carregando os dados do banco, não faz nada para não sobrescrever
    if (carregando) return;

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
  }, [tipoRecorrencia, qtdParcelas, carregando]); // Adicionado 'carregando' aqui

  useEffect(() => {
    setValoresCustomizadosParcelas({});
  }, [valorBase, valorIof, descontarIof, qtdParcelas, tipoRecorrencia, ratearPremioAnual]);

  const fetchDadosIniciais = useCallback(async () => {
    setCarregando(true);
    try {
      const { data: item, error: errorItem } = await supabase
        .from('tab_proposta_itens')
        .select(`*, base_produtos (nome)`)
        .eq('id', itemId)
        .single();

      if (errorItem || !item) throw new Error("Item não localizado.");

      let opcao: any = null;
      let proposta: any = null;

      if (item.opcao_id) {
        const { data: opcaoData } = await supabase
          .from('tab_proposta_opcoes')
          .select(`id, proposta_id, seguradora_id, base_seguradoras (nome)`)
          .eq('id', item.opcao_id)
          .maybeSingle();

        opcao = opcaoData;

        if (opcao?.proposta_id) {
          const { data: propostaData } = await supabase
            .from('tab_propostas')
            .select(`data_emissao, cliente_id, corretor_id, parceiro_id, corretora_id, tab_parceiros (nome_parceiro)`)
            .eq('id', opcao.proposta_id)
            .maybeSingle();

          proposta = propostaData;
        }
      }

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

        // Carregar estados dos novos pedidos se existirem
        if (regraData.descontar_iof) {
          setDescontarIof(true);
          setValorIof(formatarMoeda(((regraData.valor_iof || 0) * 100).toFixed(0)));
        }
        if (regraData.descontos_comissao_json) {
          setDescontosComissao(regraData.descontos_comissao_json);
        }
        if (regraData.descontos_corretor_json) {
          setDescontosCorretor(regraData.descontos_corretor_json);
        }

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
      { id: crypto.randomUUID(), parcelaInicio: proximaParcela, parcelaFim: qtdParcelas, pctComissaoVenda: '0' }
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
    setFaixas(faixas.map(f => f.id === id ? { ...f, [campo]: valor } : f));
  };

  // Funções para gerenciar descontos dinâmicos da comissão (Ped. 2)
  const adicionarDescontoComissao = () => {
    setDescontosComissao([...descontosComissao, { id: crypto.randomUUID(), nome: '', percentual: '' }]);
  };
  const removerDescontoComissao = (id: string) => {
    setDescontosComissao(descontosComissao.filter(d => d.id !== id));
  };
  const atualizarDescontoComissao = (id: string, campo: keyof DescontoComissao, valor: any) => {
    setDescontosComissao(descontosComissao.map(d => d.id === id ? { ...d, [campo]: valor } : d));
  };

  // Funções para gerenciar descontos dinâmicos do corretor (Ped. 3)
  const adicionarDescontoCorretor = () => {
    setDescontosCorretor([...descontosCorretor, { id: crypto.randomUUID(), nome: '', tipo: 'PERCENTUAL', valor: '' }]);
  };
  const removerDescontoCorretor = (id: string) => {
    setDescontosCorretor(descontosCorretor.filter(d => d.id !== id));
  };
  const atualizarDescontoCorretor = (id: string, campo: keyof DescontoCorretor, valor: any) => {
    setDescontosCorretor(descontosCorretor.map(d => d.id === id ? { ...d, [campo]: valor } : d));
  };

  // --- CÁLCULOS MATEMÁTICOS ---
  const vBaseRaw = desformatarMoeda(valorBase);
  const vIofRaw = descontarIof ? desformatarMoeda(valorIof) : 0;
  const baseCalculoEfetiva = Math.max(0, vBaseRaw - vIofRaw);

  const pCorretor = parseFloat(pctCorretor) || 0;
  const pParceiro = parseFloat(pctParceiro) || 0;

  // Soma de todos os percentuais de desconto da seguradora
  const totalDescontosPctComissao = descontosComissao.reduce((acc, d) => acc + (parseFloat(d.percentual) || 0), 0);

  const gerarCronogramaSimulado = () => {
    const parcelas = [];
    if (!inputVenda || qtdParcelas <= 0) return [];

    const dataVendaObj = new Date(inputVenda + 'T00:00:00');
    const totalMeses = tipoRecorrencia === 'UNICA' ? 1 : qtdParcelas;

    for (let i = 1; i <= totalMeses; i++) {
      let valorBaseDestaParcela = valoresCustomizadosParcelas[i] !== undefined 
        ? valoresCustomizadosParcelas[i] 
        : baseCalculoEfetiva;

      if (valoresCustomizadosParcelas[i] === undefined && dadosBase?.periodicidade === 'ANUAL' && ratearPremioAnual && tipoRecorrencia === 'MENSAL') {
        valorBaseDestaParcela = baseCalculoEfetiva / qtdParcelas;
      }

      const faixaCorrespondente = faixas.find(f => i >= Number(f.parcelaInicio) && i <= Number(f.parcelaFim));
      const pVendaBruto = faixaCorrespondente ? parseFloat(faixaCorrespondente.pctComissaoVenda) || 0 : 0;
      
      // % Líquido de comissão da seguradora (Bruto - Descontos da Seguradora)
      const pVendaLiquido = Math.max(0, pVendaBruto - totalDescontosPctComissao);

      // 1. Bolo Cheio Líquido da Seguradora (Ex: 4000 * 30% = 1200)
      const comissaoTotalCorretoraParcela = valorBaseDestaParcela * (pVendaLiquido / 100);
      
      // 2. Repasses Brutos (Corretor e Parceiro)
      const repasseCorretorBruto = comissaoTotalCorretoraParcela * (pCorretor / 100);
      const repasseParceiroBruto = dadosBase?.parceiro_id ? comissaoTotalCorretoraParcela * (pParceiro / 100) : 0;
      
      // 3. Aplicação dos Descontos/Retenções cadastrados no Corretor
      let totalDescontosCorretorParcela = 0;
      descontosCorretor.forEach(dc => {
        const val = parseFloat(dc.valor) || 0;
        if (dc.tipo === 'PERCENTUAL') {
          totalDescontosCorretorParcela += repasseCorretorBruto * (val / 100);
        } else {
          totalDescontosCorretorParcela += val;
        }
      });

      const repasseCorretorParcela = Math.max(0, repasseCorretorBruto - totalDescontosCorretorParcela);
      
      // Se houver parceiro, aplicamos a mesma lógica proporcional ou deixamos limpo conforme sua diretriz
      const repasseParceiroParcela = repasseParceiroBruto; 

      // 4. Saldo Líquido da Corretora Mãe
      const saldoLiquidoCorretoraParcela = comissaoTotalCorretoraParcela - repasseCorretorParcela - repasseParceiroParcela;

      const dataProjetada = new Date(dataVendaObj.getFullYear(), dataVendaObj.getMonth() + i, diaVencimento);

      parcelas.push({
        numero: i,
        vencimento: dataProjetada.toISOString().split('T')[0],
        baseParcela: valorBaseDestaParcela,
        pctBruto: pVendaBruto,
        pctAplicado: pVendaLiquido,
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
      const pctPrimeiraFaixaBruta = faixas[0] ? parseFloat(faixas[0].pctComissaoVenda) || 0 : 0;
      const pctPrimeiraFaixaLiquida = Math.max(0, pctPrimeiraFaixaBruta - totalDescontosPctComissao);

      const payloadRegra = {
        proposta_id: parseUUID(dadosBase.proposta_id),
        item_id: parseUUID(itemId),
        cliente_id: parseUUID(dadosBase.cliente_id),
        corretor_id: session.user.id,
        produto_id: parseUUID(dadosBase.produto_id),
        seguradora_id: parseUUID(dadosBase.seguradora_id),
        corretora_id: perfil.corretora_id,
        parceiro_id: parseUUID(dadosBase.parceiro_id),
        
        base_calculo_valor: desformatarMoeda(valorBase),
        tipo_recorrencia: tipoRecorrencia,
        quantidade_parcelas: tipoRecorrencia === 'UNICA' ? 1 : qtdParcelas,
        data_venda: inputVenda,
        dia_vencimento_parcelas: diaVencimento,
        
        // Novos campos pedidos
        descontar_iof: descontarIof,
        valor_iof: descontarIof ? desformatarMoeda(valorIof) : 0,
        descontos_comissao_json: descontosComissao,
        descontos_corretor_json: descontosCorretor,

        pct_comissao_venda: pctPrimeiraFaixaLiquida,
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

      toast.success("Regras estruturadas com IOF, Descontos e Splits provisionadas!");
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar.");
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
              <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase">{dadosBase?.periodicidade}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">Valor no Item: R$ {Number(dadosBase?.valor_premio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Bloco 1: Definição da Base, Data, Recorrência e IOF (PEDIDO 1) */}
          <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 text-left space-y-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" /> 1. Parâmetros Base da Proposta (Com Opção de IOF)
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
                    className="w-full pl-9 p-3.5 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-black text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 mb-1 block">Data da Venda *</label>
                <input 
                  type="date" 
                  value={inputVenda} 
                  onChange={(e) => setInputVenda(e.target.value)} 
                  className="w-full p-3.5 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500 outline-none"
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

            {/* PEDIDO 1 - Bloco Condicional de IOF */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="iof-checkbox"
                  type="checkbox"
                  checked={descontarIof}
                  onChange={(e) => setDescontarIof(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="iof-checkbox" className="text-xs font-black text-zinc-700 dark:text-zinc-300 cursor-pointer uppercase select-none">
                  Descontar IOF do Valor de Referência para Formar a Base de Cálculo
                </label>
              </div>

              {descontarIof && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] font-black text-amber-600 uppercase ml-2 mb-1 block">Valor do IOF a Descontar *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input 
                        type="text" 
                        value={valorIof}
                        placeholder="R$ 0,00"
                        onChange={(e) => setValorIof(formatarMoeda(e.target.value))}
                        className="w-full pl-9 p-3 rounded-xl border border-amber-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-black text-amber-600 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Base Efetiva Resultante:</p>
                    <p className="text-sm font-black text-emerald-600">
                      {baseCalculoEfetiva.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {dadosBase?.periodicidade === 'ANUAL' && tipoRecorrencia === 'MENSAL' && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-3">
                <input
                  id="ratear-checkbox"
                  type="checkbox"
                  checked={ratearPremioAnual}
                  onChange={(e) => setRatearPremioAnual(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="ratear-checkbox" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  O valor base é o <span className="font-black text-blue-500">TOTAL ANUAL</span> e deve ser fatiado igualmente pelo número de meses.
                </label>
              </div>
            )}

            {tipoRecorrencia === 'MENSAL' && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-2 mb-1 block">Quantidade de Meses (Parcelas)</label>
                  <input type="number" min={2} max={120} value={qtdParcelas} onChange={(e) => setQtdParcelas(Math.max(2, parseInt(e.target.value) || 2))} className="w-full p-3.5 rounded-2xl border border-blue-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-blue-600" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-2 mb-1 block">Dia Fixo de Vencimento</label>
                  <input type="number" min={1} max={31} value={diaVencimento} onChange={(e) => setDiaVencimento(Math.min(31, Math.max(1, parseInt(e.target.value) || 10)))} className="w-full p-3.5 rounded-2xl border border-blue-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-blue-600" />
                </div>
              </div>
            )}
          </div>

          {/* Bloco 2: Matriz de Faixas + Descontos de Comissão (PEDIDO 2) */}
          <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 text-left space-y-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" /> 2. Matriz de Percentuais e Descontos sobre a Seguradora
            </h3>

            {/* Faixas da Seguradora */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-zinc-500 ml-1">Percentual Bruto (% Com. Seguradora) por intervalo de meses:</p>
              {faixas.map((faixa, index) => (
                <div key={faixa.id} className="grid grid-cols-4 gap-3 items-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1 block">Da Parcela</label>
                    <input type="number" disabled={index > 0} value={faixa.parcelaInicio} onChange={(e) => atualizarFaixa(faixa.id, 'parcelaInicio', parseInt(e.target.value) || 1)} className="w-full p-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-xs font-black text-zinc-700 disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1 block">Até a Parcela</label>
                    <input type="number" min={faixa.parcelaInicio} max={qtdParcelas} disabled={tipoRecorrencia === 'UNICA'} value={faixa.parcelaFim} onChange={(e) => atualizarFaixa(faixa.id, 'parcelaFim', Math.min(qtdParcelas, parseInt(e.target.value) || 1))} className="w-full p-2 rounded-xl border bg-white dark:bg-zinc-800 text-xs font-black text-zinc-800 dark:text-zinc-200" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-emerald-600 uppercase ml-1 block">% Bruto Seguradora</label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={11} />
                      <input type="number" step="0.01" value={faixa.pctComissaoVenda} onChange={(e) => atualizarFaixa(faixa.id, 'pctComissaoVenda', e.target.value)} className="w-full pl-7 p-2 rounded-xl border bg-white dark:bg-zinc-800 text-xs font-black text-zinc-800 dark:text-zinc-200" />
                    </div>
                  </div>
                  <div className="pt-4 text-center">
                    {tipoRecorrencia === 'MENSAL' && (
                      <button type="button" onClick={() => removerFaixa(faixa.id)} className="p-2 text-zinc-400 hover:text-red-500 rounded-xl"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
              {tipoRecorrencia === 'MENSAL' && (
                <button type="button" onClick={adicionarFaixa} className="mt-2 py-2 px-4 rounded-xl border border-dashed border-blue-300 text-blue-500 text-xs font-black flex items-center gap-2">
                  <Plus size={14} /> Adicionar Nova Faixa de Comissão
                </button>
              )}
            </div>

            {/* PEDIDO 2 - Lista Dinâmica de Descontos na Comissão da Seguradora (% Master, Reserva, etc.) */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase">Descontos sobre o % Bruto da Seguradora (Auditoria)</h4>
                  <p className="text-[10px] text-zinc-400">Ex: % Master, % Reserva de Lucro, % Retenções</p>
                </div>
                <button type="button" onClick={adicionarDescontoComissao} className="py-1.5 px-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-500/20">
                  <Plus size={12} /> Adicionar Desconto
                </button>
              </div>

              {descontosComissao.map((desc) => (
                <div key={desc.id} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="col-span-7">
                    <input 
                      type="text" 
                      placeholder="Nome do Desconto (ex: % Master)" 
                      value={desc.nome} 
                      onChange={(e) => atualizarDescontoComissao(desc.id, 'nome', e.target.value)}
                      className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div className="col-span-4 relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={11} />
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="3.00" 
                      value={desc.percentual} 
                      onChange={(e) => atualizarDescontoComissao(desc.id, 'percentual', e.target.value)}
                      className="w-full pl-7 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-black border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button type="button" onClick={() => removerDescontoComissao(desc.id)} className="text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}

              {/* Resumo do % Líquido */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-600 dark:text-zinc-300">Total de Descontos no %: <strong className="text-amber-600">{totalDescontosPctComissao.toFixed(2)}%</strong></span>
                <span className="font-black text-emerald-600">% Líquido Efetivo (Exemplo 1ª Faixa): {(Math.max(0, (parseFloat(faixas[0]?.pctComissaoVenda || '0') - totalDescontosPctComissao))).toFixed(2)}%</span>
              </div>
            </div>

            {/* SPLITS DE DISTRIBUIÇÃO */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase ml-2 mb-1 block">% do Corretor / Angariador (Fixo)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input type="number" step="0.01" placeholder="30" value={pctCorretor} onChange={(e) => setPctCorretor(e.target.value)} className="w-full pl-9 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-800 dark:text-zinc-200 outline-none" />
                </div>
                <p className="text-[10px] font-bold text-blue-500 mt-1 ml-2">Total Repasses Brutos/Líquidos: {totalRepasseCorretorAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase ml-2 mb-1 block">% do Parceiro de Negócio (Fixo)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input type="number" step="0.01" placeholder="0" disabled={!dadosBase?.parceiro_id} value={pctParceiro} onChange={(e) => setPctParceiro(e.target.value)} className="w-full pl-9 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-black disabled:opacity-40 text-zinc-800 dark:text-zinc-200 outline-none" />
                </div>
                {dadosBase?.parceiro_id ? (
                  <p className="text-[10px] font-bold text-indigo-500 mt-1 ml-2">Total Parceiro: {totalRepasseParceiroAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                ) : (
                  <p className="text-[9px] font-bold text-zinc-400 mt-1 ml-2 flex items-center gap-1"><HelpCircle size={10}/> Sem parceiro na proposta</p>
                )}
              </div>
            </div>

            {/* PEDIDO 3 - Descontos Dinâmicos sobre o Split do Corretor (Percentual ou Monetário) */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase">Retenções / Descontos no Split do Corretor (Impostos, etc.)</h4>
                  <p className="text-[10px] text-zinc-400">Pode ser aplicado em % sobre o repasse ou em valor fixo monetário</p>
                </div>
                <button type="button" onClick={adicionarDescontoCorretor} className="py-1.5 px-3 bg-blue-500/10 text-blue-600 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-blue-500/20">
                  <Plus size={12} /> Adicionar Retenção Corretor
                </button>
              </div>

              {descontosCorretor.map((dc) => (
                <div key={dc.id} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="col-span-6">
                    <input 
                      type="text" 
                      placeholder="Nome da Retenção (ex: Imposto ISS/IR)" 
                      value={dc.nome} 
                      onChange={(e) => atualizarDescontoCorretor(dc.id, 'nome', e.target.value)}
                      className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={dc.tipo}
                      onChange={(e) => atualizarDescontoCorretor(dc.id, 'tipo', e.target.value)}
                      className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-black border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="PERCENTUAL">% Percentual</option>
                      <option value="MONETARIO">R$ Monetário</option>
                    </select>
                  </div>
                  <div className="col-span-2 relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder={dc.tipo === 'PERCENTUAL' ? '6.00' : '4.00'} 
                      value={dc.valor} 
                      onChange={(e) => atualizarDescontoCorretor(dc.id, 'valor', e.target.value)}
                      className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-black border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-800 dark:text-zinc-200 text-right"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button type="button" onClick={() => removerDescontoCorretor(dc.id)} className="text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Card do Líquido Retido Acumulado */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Previsão Líquida Acumulada Retida (Corretora Mãe)</h4>
                <p className="text-[10px] font-bold text-zinc-400">Soma total do líquido que sobra na corretora ao fim do cronograma</p>
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
              <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{totalBoloCheioAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-[9px] font-black text-blue-500 uppercase">Total Repasse Corretor (Líquido)</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">{totalRepasseCorretorAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-[9px] font-black text-indigo-500 uppercase">Total Repasse Parceiro</p>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{totalRepasseParceiroAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>

          {/* Bloco 3: Preview da Esteira / Provisão Financeira */}
          {cronogramaSimulado.length > 0 && (
            <div className="text-left space-y-2">
              <div className="flex justify-between items-center ml-2">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                  Preview Técnico do Cronograma Provisionado ({cronogramaSimulado.length} parcelas)
                </h3>
              </div>
              <div className="border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-inner max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-400 font-black uppercase text-[9px] tracking-wider border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-center">Parc.</th>
                      <th className="p-3">Prev. Vencimento</th>
                      <th className="p-3 text-right w-36">Base Efetiva (R$)</th>
                      <th className="p-3 text-center">% Líq. Com.</th>
                      <th className="p-3 text-right">Bolo Cheio (Seg.)</th>
                      <th className="p-3 text-right">Repasse Corretor</th>
                      <th className="p-3 text-right">Repasse Parceiro</th>
                      <th className="p-3 text-right bg-emerald-500/5 text-emerald-600 font-black">Líq. Corretora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                    {cronogramaSimulado.map((p) => (
                      <tr key={p.numero} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="p-3 font-black text-center text-zinc-400">{p.numero}</td>
                        <td className="p-3 font-bold">{new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={p.baseParcela || ''}
                            onChange={(e) => {
                              const novoValor = parseFloat(e.target.value) || 0;
                              setValoresCustomizadosParcelas(prev => ({ ...prev, [p.numero]: novoValor }));
                            }}
                            className="w-full p-1.5 text-right font-bold bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-zinc-800 dark:text-zinc-200"
                          />
                        </td>
                        <td className="p-3 text-center text-emerald-600 font-black" title={`Bruto: ${p.pctBruto}% - Descontos: ${totalDescontosPctComissao}%`}>
                          {p.pctAplicado}%
                        </td>
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
