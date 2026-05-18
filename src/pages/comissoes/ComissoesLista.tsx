import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Search, Calendar, ArrowDownCircle, CheckCircle, AlertTriangle, Check, Eye, Wallet, RefreshCcw, Landmark, ArrowUpRight, ArrowDownLeft, Equal, PlusCircle, Building2, XCircle, Ban } from 'lucide-react';

interface ProvisaoItem {
  id: string;
  numero_parcela: number;
  data_vencimento_previsto: string;
  data_recebimento: string | null;
  valor_base_parcela: number | string;
  valor_comissao_total: number | string;
  valor_direito_corretor: number | string;
  valor_direito_parceiro: number | string;
  valor_direito_corretora_mae: number | string;
  status_recebimento_seguradora: 'RECEBIDO' | 'PREVISTO' | 'CANCELADO';
  status_repasse_corretor: 'PAGO' | 'PENDENTE'; 
  repasse_id: string | null; 
  
  tab_comissoes_regras: {
    id: string;
    proposta_id: string;
    item_id: string;
    data_venda: string;
    quantidade_parcelas: number;
    base_calculo_valor: number | string;
    pct_comissao_venda: number | string;
    pct_corretor: number | string;
    pct_parceiro: number | string;
    meta_faixas_json: any;
    tab_clientes: { 
      nome: string | null; 
      razao_social: string | null; 
      nome_fantasia: string | null; 
    } | null;
    base_produtos: { nome: string } | null;
    base_seguradoras: { nome: string } | null;
    tab_proposta_itens: { numero_apolice: string | null } | null;
  } | null;
}

interface RepasseItem {
  id: string;
  valor_informado_pago: number | string;
}

const parseToNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  let cleanVal = String(val).replace(/[^\d.,-]/g, '').trim();
  if (cleanVal.includes(',') && cleanVal.includes('.')) {
    cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
  } else if (cleanVal.includes(',')) {
    cleanVal = cleanVal.replace(',', '.');
  }
  const parsed = parseFloat(cleanVal);
  return isNaN(parsed) ? 0 : parsed;
};

const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ComissoesLista = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [busca, setBusca] = useState('');
  
  // FILTROS DE DATAS SEPARADOS E SIMULTÂNEOS
  const [vendaDe, setVendaDe] = useState('');
  const [vendaAte, setVendaAte] = useState('');
  
  const [vencimentoDe, setVencimentoDe] = useState('2026-04-01'); 
  const [vencimentoAte, setVencimentoAte] = useState('2026-06-30');
  
  const [baixaDe, setBaixaDe] = useState('');
  const [baixaAte, setBaixaAte] = useState('');
  
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'PREVISTO' | 'RECEBIDO' | 'CANCELADO'>('TODOS');
  const [provisoes, setProvisoes] = useState<ProvisaoItem[]>([]);
  
  // Estados do painel de Conta Corrente
  const [ccPagoTotal, setCcPagoTotal] = useState<number>(0);
  const [ccParcelasTotal, setCcParcelasTotal] = useState<number>(0);
  
  const ccSaldoDiferenca = ccPagoTotal - ccParcelasTotal;
  const [selecionadasLote, setSelecionadasLote] = useState<string[]>([]);
  
  // Modais
  const [modalAporte, setModalAporte] = useState<boolean>(false);
  const [valorAporte, setValorAporte] = useState<number>(0);
  const [dataAporte, setDataAporte] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacaoAporte, setObservacaoAporte] = useState<string>('');

  const [modalDetalhe, setModalDetalhe] = useState<boolean>(false);
  const [itemDetalhado, setItemDetalhado] = useState<ProvisaoItem | null>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, [vendaDe, vendaAte, vencimentoDe, vencimentoAte, baixaDe, baixaAte, statusFiltro]);

  const carregarDadosIniciais = async () => {
    setLoading(true);
    await Promise.all([
      carregarProvisoesReal(),
      carregarResumoContaCorrenteDinamico()
    ]);
    setLoading(false);
  };

  const carregarResumoContaCorrenteDinamico = async () => {
    try {
      const { data: repasses, error: errRepasses } = await supabase
        .from('tab_financeiro_repasses')
        .select('id, valor_informado_pago');
      
      if (errRepasses) throw errRepasses;
      const totalPago = (repasses as RepasseItem[] || []).reduce((acc: number, r: RepasseItem) => acc + parseToNumber(r.valor_informado_pago), 0);
      setCcPagoTotal(totalPago);

      const { data: provisoesPagas, error: errProvisoes } = await supabase
        .from('tab_financeiro_provisoes')
        .select('valor_direito_corretor')
        .eq('status_recebimento_seguradora', 'RECEBIDO');
      
      if (errProvisoes) throw errProvisoes;
      const totalParcelas = (provisoesPagas as Pick<ProvisaoItem, 'valor_direito_corretor'>[] || []).reduce((acc: number, p: Pick<ProvisaoItem, 'valor_direito_corretor'>) => acc + parseToNumber(p.valor_direito_corretor), 0);
      setCcParcelasTotal(totalParcelas);
    } catch (err) {
      console.error("Erro ao computar resumo:", err);
    }
  };

  const carregarProvisoesReal = async () => {
    try {
      let query = supabase
        .from('tab_financeiro_provisoes')
        .select(`
          id, numero_parcela, data_vencimento_previsto, data_recebimento,
          valor_base_parcela, valor_comissao_total, valor_direito_corretor,
          valor_direito_parceiro, valor_direito_corretora_mae,
          status_recebimento_seguradora, status_repasse_corretor, repasse_id,
          tab_comissoes_regras!tab_financeiro_provisoes_regra_fkey (
            id, proposta_id, item_id, data_venda, quantidade_parcelas,
            base_calculo_valor, pct_comissao_venda, pct_corretor, pct_parceiro, meta_faixas_json,
            tab_clientes!tab_comissoes_regras_cliente_id_fkey ( nome, razao_social, nome_fantasia ),
            base_produtos!tab_comissoes_regras_produto_id_fkey ( nome ),
            base_seguradoras!tab_comissoes_regras_seguradora_id_fkey ( nome ),
            tab_proposta_itens!tab_comissoes_regras_item_id_fkey ( numero_apolice )
          )
        `);

      if (statusFiltro !== 'TODOS') {
        query = query.eq('status_recebimento_seguradora', statusFiltro);
      }

      // APLICAÇÃO SIMULTÂNEA E INTELIGENTE DOS FILTROS DE DATA
      if (vencimentoDe) query = query.gte('data_vencimento_previsto', vencimentoDe);
      if (vencimentoAte) query = query.lte('data_vencimento_previsto', vencimentoAte);

      if (baixaDe) query = query.gte('data_recebimento', baixaDe);
      if (baixaAte) query = query.lte('data_recebimento', baixaAte);

      if (vendaDe) query = query.gte('tab_comissoes_regras.data_venda', vendaDe);
      if (vendaAte) query = query.lte('tab_comissoes_regras.data_venda', vendaAte);

      const { data, error } = await query;
      if (error) throw error;
      setProvisoes((data as unknown as ProvisaoItem[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar provisões.");
    }
  };

  const limparFiltrosData = () => {
    setVendaDe('');
    setVendaAte('');
    setVencimentoDe('');
    setVencimentoAte('');
    setBaixaDe('');
    setBaixaAte('');
    toast.success("Filtros de data limpos!");
  };

  const processarBaixaLoteContraCaixa = async () => {
    if (selecionadasLote.length === 0) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id || "00000000-0000-0000-0000-000000000000";

      const { data: ultimoRepasseReal } = await supabase
        .from('tab_financeiro_repasses')
        .select('id')
        .eq('corretor_id', userUuid)
        .order('created_at', { ascending: false })
        .limit(1);

      let destinoId = ultimoRepasseReal && ultimoRepasseReal.length > 0 ? ultimoRepasseReal[0].id : null;
      
      if (!destinoId) {
        const { data: novoRepasse } = await supabase
          .from('tab_financeiro_repasses')
          .insert({
            corretor_id: userUuid,
            data_pagamento: new Date().toISOString().split('T')[0],
            valor_informado_pago: 0,
            observacao: "CAIXA INICIAL AUTOMÁTICO"
          })
          .select().single();
        destinoId = novoRepasse.id;
      }

      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'RECEBIDO', 
          status_repasse_corretor: 'PAGO',
          data_recebimento: new Date().toISOString().split('T')[0],
          repasse_id: destinoId,
          updated_at: new Date().toISOString()
        })
        .in('id', selecionadasLote);

      if (error) throw error;
      toast.success("Baixa em lote concluída!");
      setSelecionadasLote([]);
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar baixa.");
    }
  };

  const executarBaixaIndividualDireta = async (provisaoId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id || "00000000-0000-0000-0000-000000000000";

      const { data: ultimoRepasseReal } = await supabase
        .from('tab_financeiro_repasses')
        .select('id')
        .eq('corretor_id', userUuid)
        .order('created_at', { ascending: false })
        .limit(1);

      let destinoId = ultimoRepasseReal && ultimoRepasseReal.length > 0 ? ultimoRepasseReal[0].id : null;

      if (!destinoId) {
        const { data: novoRepasse } = await supabase
          .from('tab_financeiro_repasses')
          .insert({
            corretor_id: userUuid,
            data_pagamento: new Date().toISOString().split('T')[0],
            valor_informado_pago: 0,
            observacao: "CAIXA INDIVIDUAL AUTOMÁTICO"
          })
          .select().single();
        destinoId = novoRepasse.id;
      }

      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'RECEBIDO',
          status_repasse_corretor: 'PAGO',
          data_recebimento: new Date().toISOString().split('T')[0],
          repasse_id: destinoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', provisaoId);

      if (error) throw error;
      toast.success("Parcela baixada!");
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro na baixa.");
    }
  };

  const reverterBaixaParcela = async (provisao: ProvisaoItem) => {
    if (!window.confirm("Deseja estornar esta parcela?")) return;
    try {
      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'PREVISTO',
          status_repasse_corretor: 'PENDENTE',
          data_recebimento: null,
          repasse_id: null, 
          updated_at: new Date().toISOString()
        })
        .eq('id', provisao.id);

      if (error) throw error;
      toast.success("Estorno concluído!");
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
    }
  };

  const cancelarProvisoesFuturasContrato = async (regraId: string, nomeCliente: string) => {
    if (!regraId) return;
    if (!window.confirm(`Deseja realmente CANCELAR todas as parcelas PREVISTAS do contrato de ${nomeCliente.toUpperCase()}?\n\nEsta ação mudará o status das parcelas futuras para CANCELADO. O histórico de parcelas já RECEBIDAS não será afetado.`)) return;

    try {
      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'CANCELADO',
          updated_at: new Date().toISOString()
        })
        .eq('regra_id', regraId)
        .eq('status_recebimento_seguradora', 'PREVISTO');

      if (error) {
        console.error("Erro interno do Supabase:", error.message);
        throw error;
      }

      toast.success("Provisões futuras canceladas com sucesso!");
      setModalDetalhe(false);
      setSelecionadasLote([]);
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cancelar provisões futuras.");
    }
  };

  const obterNomeCliente = (cliente: any) => {
    if (!cliente) return '—';
    return cliente.razao_social || cliente.nome || cliente.nome_fantasia || '—';
  };

  // INDICADORES DOS CARDS SUPERIORES FILTRANDO APENAS REGISTROS NÃO CANCELADOS
  const totalGeradoMae = provisoes
    .filter(p => p.status_recebimento_seguradora !== 'CANCELADO')
    .reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretora_mae), 0);

  const totalProvisionadoCorretor = provisoes
    .filter(p => p.status_recebimento_seguradora !== 'CANCELADO')
    .reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);

  const totalRecebidoCorretor = provisoes
    .filter(p => p.status_recebimento_seguradora === 'RECEBIDO')
    .reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);

  const totalAReceberCorretor = provisoes
    .filter(p => p.status_recebimento_seguradora === 'PREVISTO')
    .reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);

  const somaLoteAtual = provisoes
    .filter(p => selecionadasLote.includes(p.id))
    .reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);

  // Filtro textual e Ordenação Alfabética Rigorosa
  const provisoesFiltradasEOrdenadas = provisoes
    .filter((p: ProvisaoItem) => {
      const r = p.tab_comissoes_regras;
      if (!r) return false;
      return obterNomeCliente(r.tab_clientes).toLowerCase().includes(busca.toLowerCase()) ||
             (r.base_produtos?.nome?.toLowerCase() || '').includes(busca.toLowerCase()) ||
             (r.base_seguradoras?.nome?.toLowerCase() || '').includes(busca.toLowerCase()) ||
             (r.tab_proposta_itens?.numero_apolice?.toLowerCase() || '').includes(busca.toLowerCase());
    })
    .sort((a, b) => {
      const nomeA = obterNomeCliente(a.tab_comissoes_regras?.tab_clientes).toLowerCase();
      const nomeB = obterNomeCliente(b.tab_comissoes_regras?.tab_clientes).toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

  const lancarAporteRepasse = async () => {
    if (valorAporte <= 0) {
      toast.error("Informe um valor válido para o repasse.");
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id || "00000000-0000-0000-0000-000000000000";

      const { error } = await supabase
        .from('tab_financeiro_repasses')
        .insert({
          corretor_id: userUuid,
          data_pagamento: dataAporte,
          valor_informado_pago: valorAporte,
          observacao: observacaoAporte || "APORTE DE REPASSE EM CONTA CORRENTE"
        });

      if (error) throw error;
      toast.success("Aporte lançado com sucesso!");
      setModalAporte(false);
      setValorAporte(0);
      setObservacaoAporte('');
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao lançar aporte.");
    }
  };
return (
    <div className="p-6 space-y-6 text-left bg-zinc-50/50 dark:bg-zinc-950 min-h-screen relative">
      
      {/* BOTÃO SUPERIOR DE APORTE */}
      <div className="flex justify-start">
        <button 
          onClick={() => setModalAporte(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-blue-500 transition-all"
        >
          <PlusCircle size={16} />
          Lançar Novo Repasse (Alimentar Caixa)
        </button>
      </div>

      {/* BARRA FLUTUANTE DE LOTE */}
      {selecionadasLote.length > 0 && (
        <div className="bg-zinc-900 text-white p-4 rounded-[2rem] flex items-center justify-between shadow-lg dark:bg-zinc-800">
          <div className="flex items-center gap-4 pl-2">
            <Wallet size={20} className="text-blue-500" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Liquidação de Parcelas no Caixa</p>
              <p className="text-xs font-bold">
                <span className="bg-zinc-800 px-2 py-0.5 rounded font-mono text-blue-400">{selecionadasLote.length}</span> selecionadas | Consumo total: <span className="font-black text-white">{formatBRL(somaLoteAtual)}</span>
              </p>
            </div>
          </div>
          <button onClick={processarBaixaLoteContraCaixa} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-blue-500 transition-all">
            Confirmar Baixa das {selecionadasLote.length} Parcelas
          </button>
        </div>
      )}

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">Comissão Gerada (Mãe)</span>
            <h2 className="text-xl font-black text-zinc-950 dark:text-white mt-2 tracking-tight">{formatBRL(totalGeradoMae)}</h2>
          </div>
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 rounded-full text-purple-600"><Building2 size={20}/></div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">Comissão Provisionada</span>
            <h2 className="text-xl font-black text-zinc-950 dark:text-white mt-2 tracking-tight">{formatBRL(totalProvisionadoCorretor)}</h2>
          </div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-full text-blue-600"><ArrowDownCircle size={20}/></div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">Comissão Baixada (Tela)</span>
            <h2 className="text-xl font-black text-emerald-600 mt-2 tracking-tight">{formatBRL(totalRecebidoCorretor)}</h2>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600"><CheckCircle size={20}/></div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">Saldo Restante</span>
            <h2 className="text-xl font-black text-amber-600 mt-2 tracking-tight">{formatBRL(totalAReceberCorretor)}</h2>
          </div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-full text-amber-600"><AlertTriangle size={20}/></div>
        </div>
      </div>

      {/* FLUXO DE CAIXA CONSOLIDADO */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-800 dark:text-white">
          <Landmark size={18} className="text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-tight">Fluxo de Caixa Geral do Corretor</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Total de Repasses Aportados (A)</span>
              <span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200">{formatBRL(ccPagoTotal)}</span>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ArrowDownLeft size={16} /></div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Total de Parcelas Liquidadas (B)</span>
              <span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200">{formatBRL(ccParcelasTotal)}</span>
            </div>
            <div className="p-2 bg-zinc-100 text-zinc-500 rounded-lg"><ArrowUpRight size={16} /></div>
          </div>
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${ccSaldoDiferenca < 0 ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20'}`}>
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Saldo Disponível em Caixa (A - B)</span>
              <span className={`text-base font-black font-mono ${ccSaldoDiferenca < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {ccSaldoDiferenca >= 0 ? formatBRL(ccSaldoDiferenca) : `-${formatBRL(Math.abs(ccSaldoDiferenca))}`}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${ccSaldoDiferenca < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}><Equal size={16} /></div>
          </div>
        </div>
      </div>

      {/* BLOCO DE FILTROS EVOLUÍDO E MULTI-DATAS */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        
        {/* Linha Superior: Busca Textual e Status */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-3.5 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="BUSCAR CLIENTE, PRODUTO, SEGURADORA..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-tight outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button 
              onClick={limparFiltrosData}
              className="flex items-center gap-1 text-zinc-400 hover:text-rose-600 transition-colors text-[11px] font-black uppercase tracking-tight bg-zinc-50 dark:bg-zinc-950 border px-3 py-2 rounded-xl"
            >
              <XCircle size={14} /> Limpar Datas
            </button>
            <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1">
              {(['TODOS', 'PREVISTO', 'RECEBIDO', 'CANCELADO'] as const).map((t) => (
                <button key={t} onClick={() => setStatusFiltro(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFiltro === t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha Inferior: Grid de Datas Simultâneas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          
          {/* Filtro 1: Data de Venda */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-zinc-400">
              <Calendar size={13} />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Data da Venda</span>
            </div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={vendaDe} onChange={(e) => setVendaDe(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={vendaAte} onChange={(e) => setVendaAte(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
            </div>
          </div>

          {/* Filtro 2: Data de Vencimento */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-blue-600">
              <Calendar size={13} />
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Data Vencimento</span>
            </div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={vencimentoDe} onChange={(e) => setVencimentoDe(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer text-zinc-800 dark:text-zinc-200" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={vencimentoAte} onChange={(e) => setVencimentoAte(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer text-zinc-800 dark:text-zinc-200" />
            </div>
          </div>

          {/* Filtro 3: Data de Baixa (Recebimento) */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600">
              <Calendar size={13} />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Data da Baixa (Recebimento)</span>
            </div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={baixaDe} onChange={(e) => setBaixaDe(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={baixaAte} onChange={(e) => setBaixaAte(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
            </div>
          </div>

        </div>
      </div>

      {/* GRADE DE LANÇAMENTOS */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-200">
              <tr>
                <th className="p-4 text-center w-10">Select</th>
                <th className="p-4">Cliente (Ordem A-Z)</th>
                <th className="p-4">Produto</th>
                <th className="p-4">Seguradora</th>
                <th className="p-4 text-center">Apólice</th>
                <th className="p-4 text-center">Parcela</th>
                <th className="p-4 text-right text-blue-600">Split Corretor</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center text-blue-600">Data Rec.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center uppercase tracking-wider font-black text-zinc-400 animate-pulse">Buscando lançamentos...</td></tr>
              ) : provisoesFiltradasEOrdenadas.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center uppercase tracking-wider font-black text-zinc-400">Nenhuma provisão encontrada.</td></tr>
              ) : (
                provisoesFiltradasEOrdenadas.map((p: ProvisaoItem) => (
                  <tr key={p.id} className={`${selecionadasLote.includes(p.id) ? 'bg-blue-50/50' : 'hover:bg-zinc-50/80'} ${p.status_recebimento_seguradora === 'CANCELADO' ? 'opacity-50 bg-zinc-100/40 dark:bg-zinc-950/10 line-through text-zinc-400' : ''}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox"
                        checked={selecionadasLote.includes(p.id)}
                        disabled={p.status_recebimento_seguradora === 'RECEBIDO' || p.status_recebimento_seguradora === 'CANCELADO'}
                        onChange={() => setSelecionadasLote(prev => prev.includes(p.id) ? prev.filter(item => item !== p.id) : [...prev, p.id])}
                        className="w-4 h-4 rounded cursor-pointer disabled:opacity-30"
                      />
                    </td>
                    <td className="p-4 font-black text-zinc-900 dark:text-white uppercase">{obterNomeCliente(p.tab_comissoes_regras?.tab_clientes)}</td>
                    <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_produtos?.nome || '—'}</td>
                    <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_seguradoras?.nome || '—'}</td>
                    <td className="p-4 text-center text-zinc-400 font-mono">📄 {p.tab_comissoes_regras?.tab_proposta_itens?.numero_apolice || '—'}</td>
                    <td className="p-4 text-center font-black text-zinc-500 bg-zinc-50/40">{p.numero_parcela} de {p.tab_comissoes_regras?.quantidade_parcelas || 1}</td>
                    <td className="p-4 text-right font-black text-blue-600">{formatBRL(parseToNumber(p.valor_direito_corretor))}</td>
                    <td className="p-4 text-center text-zinc-800 dark:text-zinc-200">{p.data_vencimento_previsto.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/30">{p.data_recebimento ? p.data_recebimento.split('-').reverse().join('/') : '—'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${
                        p.status_recebimento_seguradora === 'RECEBIDO' ? 'bg-emerald-100 text-emerald-700' : 
                        p.status_recebimento_seguradora === 'CANCELADO' ? 'bg-rose-100 text-rose-700 font-extrabold line-none' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status_recebimento_seguradora}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {p.status_recebimento_seguradora === 'RECEBIDO' ? (
                          <button onClick={() => reverterBaixaParcela(p)} title="Estornar parcela" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">
                            <RefreshCcw size={15} />
                          </button>
                        ) : p.status_recebimento_seguradora === 'PREVISTO' ? (
                          <>
                            <button onClick={() => executarBaixaIndividualDireta(p.id)} title="Baixar contra o Caixa" className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100">
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => cancelarProvisoesFuturasContrato(p.tab_comissoes_regras?.id || '', obterNomeCliente(p.tab_comissoes_regras?.tab_clientes))} 
                              title="Cancelar Contrato (Cessar parcelas futuras)" 
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100"
                            >
                              <Ban size={15} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-mono">N/A</span>
                        )}
                        <button 
                          onClick={() => { setItemDetalhado(p); setModalDetalhe(true); }}
                          title="Visualizar Regra de Comissão" 
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: APORTE CAIXA */}
      {modalAporte && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Gestão de Caixa</span>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2">Registrar Repasse da Corretora</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Valor (R$)</label>
                <input type="number" step="0.01" value={valorAporte} onChange={(e) => setValorAporte(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-xs font-bold outline-none border" placeholder="0,00"/>
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Data</label>
                <input type="date" value={dataAporte} onChange={(e) => setDataAporte(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-xs font-bold border"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Identificação / Lote</label>
              <textarea rows={2} placeholder="EX: TED BANCO DO BRASIL" value={observacaoAporte} onChange={(e) => setObservacaoAporte(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-[11px] font-bold outline-none border uppercase"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalAporte(false)} className="flex-1 py-2.5 border rounded-xl text-[10px] font-black uppercase text-zinc-400">Cancelar</button>
              <button onClick={lancarAporteRepasse} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Injetar no Caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RAIO-X DA COMISSÃO */}
      {modalDetalhe && itemDetalhado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-2xl max-w-lg w-full space-y-4 text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">Raio-X do Lançamento</span>
                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2">Origem da Regra de Comissão</h3>
              </div>
              <button onClick={() => setModalDetalhe(false)} className="text-zinc-400 hover:text-zinc-600 font-bold text-sm">✕</button>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl space-y-2 text-xs">
              <p><span className="text-zinc-400 font-normal">Cliente:</span> <strong className="text-zinc-900 dark:text-white uppercase">{obterNomeCliente(itemDetalhado.tab_comissoes_regras?.tab_clientes)}</strong></p>
              <p><span className="text-zinc-400 font-normal">Produto:</span> <span className="uppercase font-bold">{itemDetalhado.tab_comissoes_regras?.base_produtos?.nome || '—'}</span></p>
              <p><span className="text-zinc-400 font-normal">Seguradora:</span> <span className="uppercase font-bold">{itemDetalhado.tab_comissoes_regras?.base_seguradoras?.nome || '—'}</span></p>
              <p><span className="text-zinc-400 font-normal">Data da Venda:</span> <span className="font-mono font-bold">{itemDetalhado.tab_comissoes_regras?.data_venda ? itemDetalhado.tab_comissoes_regras.data_venda.split('-').reverse().join('/') : '—'}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border rounded-xl bg-zinc-50/50">
                <span className="text-[9px] uppercase font-black text-zinc-400 block">Base de Cálculo</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatBRL(parseToNumber(itemDetalhado.tab_comissoes_regras?.base_calculo_valor))}</span>
              </div>
              <div className="p-3 border rounded-xl bg-zinc-50/50">
                <span className="text-[9px] uppercase font-black text-zinc-400 block">Comissão Total Bruta</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_comissao_total))}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 block">Divisão dos Splits (Acordo)</span>
              <div className="flex justify-between items-center bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/50 text-xs">
                <span className="font-bold text-blue-700">Direito do Corretor ({parseToNumber(itemDetalhado.tab_comissoes_regras?.pct_corretor)}%)</span>
                <span className="font-black text-blue-700 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_corretor))}</span>
              </div>
              <div className="flex justify-between items-center bg-purple-50/40 p-2.5 rounded-xl border border-purple-100/50 text-xs">
                <span className="font-bold text-purple-700">Retido pela Corretora Mãe</span>
                <span className="font-black text-purple-700 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_corretora_mae))}</span>
              </div>
              {parseToNumber(itemDetalhado.valor_direito_parceiro) > 0 && (
                <div className="flex justify-between items-center bg-zinc-100 p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-zinc-600">Split Parceiro ({parseToNumber(itemDetalhado.tab_comissoes_regras?.pct_parceiro)}%)</span>
                  <span className="font-black text-zinc-600 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_parceiro))}</span>
                </div>
              )}
            </div>

            {/* BOTÃO INTEGRADO DENTRO DO MODAL RAIO-X PARA CANCELAR CONTRATO INTEGRAL */}
            {itemDetalhado.status_recebimento_seguradora !== 'CANCELADO' && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  onClick={() => cancelarProvisoesFuturasContrato(itemDetalhado.tab_comissoes_regras?.id || '', obterNomeCliente(itemDetalhado.tab_comissoes_regras?.tab_clientes))}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] uppercase rounded-xl tracking-wider shadow-sm hover:bg-rose-100 transition-colors"
                >
                  <Ban size={14} /> Cancelar Contrato (Parar Provisões Futuras)
                </button>
              </div>
            )}

            <button onClick={() => setModalDetalhe(false)} className="w-full py-2.5 bg-zinc-900 text-white font-black text-[10px] uppercase rounded-xl tracking-wider shadow-sm hover:bg-zinc-800">
              Fechar Diagnóstico
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
