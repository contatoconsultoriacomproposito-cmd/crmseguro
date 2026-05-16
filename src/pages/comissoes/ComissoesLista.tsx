import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Search, Calendar, ArrowDownCircle, CheckCircle, AlertTriangle, Check, SlidersHorizontal, Wallet, RefreshCcw, Landmark, ArrowUpRight, ArrowDownLeft, Equal } from 'lucide-react';

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
  status_recebimento_seguradora: 'RECEBIDO' | 'PREVISTO';
  status_repasse_corretor: 'PAGO' | 'PENDENTE'; 
  repasse_id: string | null; 
  
  tab_comissoes_regras: {
    id: string;
    proposta_id: string;
    item_id: string;
    data_venda: string;
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

// Interface simples para tipar o retorno do Supabase na tabela de repasses
interface RepasseItem {
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
  
  const [tipoFiltroData, setTipoFiltroData] = useState<'vencimento' | 'venda'>('vencimento');
  const [dataDe, setDataDe] = useState('2026-04-01');
  const [dataAte, setDataAte] = useState('2026-06-30');
  
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'PREVISTO' | 'RECEBIDO'>('TODOS');
  const [provisoes, setProvisoes] = useState<ProvisaoItem[]>([]);
  
  // Estados do painel de Conta Corrente calculados dinamicamente
  const [ccPagoTotal, setCcPagoTotal] = useState<number>(0);
  const [ccParcelasTotal, setCcParcelasTotal] = useState<number>(0);
  
  // O saldo de diferença agora é calculado em tempo real por derivação de estado
  const ccSaldoDiferenca = ccPagoTotal - ccParcelasTotal;
  
  const [selecionadasLote, setSelecionadasLote] = useState<string[]>([]);
  const [modalLote, setModalLote] = useState<boolean>(false);
  const [valorRepasseInformado, setValorRepasseInformado] = useState<number>(0);
  const [dataRepasseReal, setDataRepasseReal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacaoRepasse, setObservacaoRepasse] = useState<string>('');
  
  const [popoverBaixa, setPopoverBaixa] = useState<{ id: string; valor: number } | null>(null);
  const [valorRecebidoReal, setValorRecebidoReal] = useState<number>(0);
  const [dataBaixaReal, setDataBaixaReal] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    carregarDadosIniciais();
  }, [dataDe, dataAte, statusFiltro, tipoFiltroData]);

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
      // 1. Soma dinâmica do que foi efetivamente depositado (Fato imutável de repasses)
      const { data: repasses, error: errRepasses } = await supabase
        .from('tab_financeiro_repasses')
        .select('valor_informado_pago');
      
      if (errRepasses) throw errRepasses;
      const totalPago = (repasses as RepasseItem[] || []).reduce((acc: number, r: RepasseItem) => acc + parseToNumber(r.valor_informado_pago), 0);
      setCcPagoTotal(totalPago);

      // 2. Soma dinâmica do valor das comissões que estão marcadas como RECEBIDO no banco de dados atualmente
      const { data: provisoesPagas, error: errProvisoes } = await supabase
        .from('tab_financeiro_provisoes')
        .select('valor_direito_corretor')
        .eq('status_recebimento_seguradora', 'RECEBIDO');
      
      if (errProvisoes) throw errProvisoes;
      const totalParcelas = (provisoesPagas as Pick<ProvisaoItem, 'valor_direito_corretor'>[] || []).reduce((acc: number, p: Pick<ProvisaoItem, 'valor_direito_corretor'>) => acc + parseToNumber(p.valor_direito_corretor), 0);
      setCcParcelasTotal(totalParcelas);

    } catch (err) {
      console.error("Erro ao computar resumo dinâmico de conta corrente:", err);
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
            id, proposta_id, item_id, data_venda,
            tab_clientes!tab_comissoes_regras_cliente_id_fkey ( nome, razao_social, nome_fantasia ),
            base_produtos!tab_comissoes_regras_produto_id_fkey ( nome ),
            base_seguradoras!tab_comissoes_regras_seguradora_id_fkey ( nome ),
            tab_proposta_itens!tab_comissoes_regras_item_id_fkey ( numero_apolice )
          )
        `);

      if (statusFiltro !== 'TODOS') {
        query = query.eq('status_recebimento_seguradora', statusFiltro);
      }
      if (tipoFiltroData === 'vencimento') {
        query = query.gte('data_vencimento_previsto', dataDe).lte('data_vencimento_previsto', dataAte);
      } else if (tipoFiltroData === 'venda') {
        query = query.gte('tab_comissoes_regras.data_venda', dataDe).lte('tab_comissoes_regras.data_venda', dataAte);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProvisoes((data as unknown as ProvisaoItem[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar provisões.");
    }
  };

  const processarConciliacaoLote = async () => {
    if (selecionadasLote.length === 0) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id || "00000000-0000-0000-0000-000000000000";

      // 1. Salva o registro em repasses apenas com o valor imutável depositado no banco (Sem campos estáticos calculados)
      const { data: novoRepasse, error: errRepasse } = await supabase
        .from('tab_financeiro_repasses')
        .insert({
          corretor_id: userUuid,
          data_pagamento: dataRepasseReal,
          valor_informado_pago: valorRepasseInformado,
          valor_total_parcelas: 0, 
          saldo_diferenca: 0,
          observacao: observacaoRepasse
        })
        .select()
        .single();

      if (errRepasse) throw errRepasse;

      // 2. Transmite o id do lote criado para todas as provisões selecionadas na tela
      const { error: errProvisoes } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'RECEBIDO', 
          status_repasse_corretor: 'PAGO',
          data_recebimento: dataRepasseReal,
          repasse_id: novoRepasse.id,
          updated_at: new Date().toISOString()
        })
        .in('id', selecionadasLote);

      if (errProvisoes) throw errProvisoes;

      toast.success("Baixa em lote realizada com sucesso!");
      setModalLote(false);
      setSelecionadasLote([]);
      setObservacaoRepasse('');
      
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar fechamento em lote.");
    }
  };

  const confirmarBaixaRecebimento = async () => {
    if (!popoverBaixa) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id || "00000000-0000-0000-0000-000000000000";

      // 1. Gera o registro na tabela de repasse pai contendo o valor real individual digitado
      const { data: novoRepasse, error: errRepasse } = await supabase
        .from('tab_financeiro_repasses')
        .insert({
          corretor_id: userUuid,
          data_pagamento: dataBaixaReal,
          valor_informado_pago: valorRecebidoReal,
          valor_total_parcelas: 0,
          saldo_diferenca: 0,
          observacao: "BAIXA INDIVIDUAL DIRETA"
        })
        .select()
        .single();

      if (errRepasse) throw errRepasse;

      // 2. Vincula a provisão ao id do repasse recém-gerado
      const { error: errProvisao } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'RECEBIDO',
          status_repasse_corretor: 'PAGO',
          data_recebimento: dataBaixaReal,
          repasse_id: novoRepasse.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', popoverBaixa.id);

      if (errProvisao) throw errProvisao;

      toast.success(`Baixa individual realizada!`);
      setPopoverBaixa(null);
      
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar a baixa.");
    }
  };

  const reverterBaixaParcela = async (provisao: ProvisaoItem) => {
    if (!window.confirm("Deseja estornar esta parcela? O painel dinâmico recalculará o saldo de comissões recebidas automaticamente.")) return;
    
    try {
      const repasseIdPai = provisao.repasse_id;

      // 1. Desvincula o ID do lote da provisão e joga o status de volta para PENDENTE/PREVISTO
      const { error: errProvisao } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'PREVISTO',
          status_repasse_corretor: 'PENDENTE',
          data_recebimento: null,
          repasse_id: null, 
          updated_at: new Date().toISOString()
        })
        .eq('id', provisao.id);

      if (errProvisao) throw errProvisao;

      // 2. Limpeza inteligente: Se não restou mais NENHUMA provisão vinculada a esse ID de repasse, removemos o registro do repasse pai
      if (repasseIdPai) {
        const { data: filhasRestantes, error: errCheck } = await supabase
          .from('tab_financeiro_provisoes')
          .select('id')
          .eq('repasse_id', repasseIdPai);

        if (!errCheck && (!filhasRestantes || filhasRestantes.length === 0)) {
          await supabase
            .from('tab_financeiro_repasses')
            .delete()
            .eq('id', repasseIdPai);
        }
      }

      toast.success("Estorno concluído! Os saldos dinâmicos foram atualizados.");
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao reverter baixa.");
    }
  };

  const alternarSelecaoLinha = (id: string) => {
    setSelecionadasLote(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const obterNomeCliente = (cliente: any) => {
    if (!cliente) return '—';
    return cliente.razao_social || cliente.nome || cliente.nome_fantasia || '—';
  };

  const totalProvisionadoCorretor = provisoes.reduce((acc: number, curr: ProvisaoItem) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const totalRecebidoCorretor = provisoes
    .filter((p: ProvisaoItem) => p.status_recebimento_seguradora === 'RECEBIDO')
    .reduce((acc: number, curr: ProvisaoItem) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const totalAReceberCorretor = provisoes
    .filter((p: ProvisaoItem) => p.status_recebimento_seguradora === 'PREVISTO')
    .reduce((acc: number, curr: ProvisaoItem) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const somaLoteAtual = provisoes
    .filter((p: ProvisaoItem) => selecionadasLote.includes(p.id))
    .reduce((acc: number, curr: ProvisaoItem) => acc + parseToNumber(curr.valor_direito_corretor), 0);

  const provisoesFiltradas = provisoes.filter((p: ProvisaoItem) => {
    const regra = p.tab_comissoes_regras;
    if (!regra) return false;
    const nomeCliente = obterNomeCliente(regra.tab_clientes).toLowerCase();
    const produto = regra.base_produtos?.nome?.toLowerCase() || '';
    const seguradora = regra.base_seguradoras?.nome?.toLowerCase() || '';
    const apolice = regra.tab_proposta_itens?.numero_apolice?.toLowerCase() || '';
    return nomeCliente.includes(busca.toLowerCase()) || produto.includes(busca.toLowerCase()) || seguradora.includes(busca.toLowerCase()) || apolice.includes(busca.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6 text-left bg-zinc-50/50 dark:bg-zinc-950 min-h-screen relative">
      
      {/* BARRA FLUTUANTE DE SELEÇÃO EM LOTE */}
      {selecionadasLote.length > 0 && (
        <div className="bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4 pl-2">
            <Wallet size={20} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">Conciliação de Conta Corrente em Lote</p>
              <p className="text-xs font-bold">
                <span className="bg-blue-700 px-2 py-0.5 rounded font-mono">{selecionadasLote.length}</span> parcelas marcadas. Valor Somado das Provisões: <span className="font-black text-white">{formatBRL(somaLoteAtual)}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setValorRepasseInformado(somaLoteAtual); setModalLote(true); }}
            className="bg-white text-blue-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-zinc-100 transition-all"
          >
            Fechar Lote & Conferir Extrato
          </button>
        </div>
      )}

      {/* CARDS INDICADORES DE COMISSÃO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">Comissão Provisionada</span>
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white mt-2 tracking-tight">{formatBRL(totalProvisionadoCorretor)}</h2>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-950/60 rounded-full text-blue-600"><ArrowDownCircle size={24}/></div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">Comissão Recebida (Tela)</span>
            <h2 className="text-2xl font-black text-emerald-600 mt-2 tracking-tight">{formatBRL(totalRecebidoCorretor)}</h2>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600"><CheckCircle size={24}/></div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">Saldo em Aberto</span>
            <h2 className="text-2xl font-black text-amber-600 mt-2 tracking-tight">{formatBRL(totalAReceberCorretor)}</h2>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-full text-amber-600"><AlertTriangle size={24}/></div>
        </div>
      </div>

      {/* PAINEL CONSOLIDADO DINÂMICO DE CONTA CORRENTE */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-800 dark:text-white">
          <Landmark size={18} className="text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-tight">Painel Consolidado de Conta Corrente (Ajustes Reais por Parâmetro Dinâmico)</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Valor Efetivo Creditado no Banco (A)</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatBRL(ccPagoTotal)}</span>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg"><ArrowDownLeft size={16} /></div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Comissões Efetivamente Recebidas (B)</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatBRL(ccParcelasTotal)}</span>
            </div>
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg"><ArrowUpRight size={16} /></div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between ${ccSaldoDiferenca < 0 ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40'}`}>
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Saldo Real de Diferença (A - B)</span>
              <span className={`text-base font-black font-mono ${ccSaldoDiferenca < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {ccSaldoDiferenca > 0 ? `+${formatBRL(ccSaldoDiferenca)}` : formatBRL(ccSaldoDiferenca)}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${ccSaldoDiferenca < 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950'}`}><Equal size={16} /></div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE FILTROS E BUSCAS */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-3.5 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR CLIENTE, PRODUTO, SEGURADORA OU APÓLICE..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-tight outline-none focus:border-zinc-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold">
            <Calendar size={14} className="text-zinc-400" />
            <select value={tipoFiltroData} onChange={(e) => setTipoFiltroData(e.target.value as any)} className="bg-transparent outline-none uppercase font-black text-zinc-600 dark:text-zinc-300 mr-2 cursor-pointer">
              <option value="vencimento">Data Vencimento</option>
              <option value="venda">Data da Venda</option>
            </select>
            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="bg-transparent outline-none text-zinc-800 dark:text-white" />
            <span className="text-zinc-400 mx-1">ATÉ</span>
            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="bg-transparent outline-none text-zinc-800 dark:text-white" />
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1 border border-zinc-200 dark:border-zinc-800">
            {(['TODOS', 'PREVISTO', 'RECEBIDO'] as const).map((t) => (
              <button key={t} onClick={() => setStatusFiltro(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFiltro === t ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* TABELA DE PROVISÕES */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4 text-center w-10">Select</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Produto</th>
                <th className="p-4">Seguradora</th>
                <th className="p-4 text-center">Apólice</th>
                <th className="p-4 text-center">Parc.</th>
                <th className="p-4 text-right">Bolo Cheio</th>
                <th className="p-4 text-right text-blue-600 dark:text-blue-400">Split Corretor</th>
                <th className="p-4 text-right">Retido Mãe</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center text-blue-600 dark:text-blue-400">Data Rec.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
              {loading ? (
                <tr><td colSpan={13} className="p-8 text-center uppercase tracking-wider font-black text-zinc-400 animate-pulse">Buscando lançamentos reais...</td></tr>
              ) : provisoesFiltradas.length === 0 ? (
                <tr><td colSpan={13} className="p-8 text-center uppercase tracking-wider font-black text-zinc-400">Nenhuma provisão encontrada.</td></tr>
              ) : (
                provisoesFiltradas.map((p: ProvisaoItem) => (
                  <tr key={p.id} className={`transition-colors ${selecionadasLote.includes(p.id) ? 'bg-blue-50/50 dark:bg-blue-950/10' : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40'}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox"
                        checked={selecionadasLote.includes(p.id)}
                        disabled={p.status_recebimento_seguradora === 'RECEBIDO'}
                        onChange={() => alternarSelecaoLinha(p.id)}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-black text-zinc-900 dark:text-white uppercase tracking-tight">{obterNomeCliente(p.tab_comissoes_regras?.tab_clientes)}</td>
                    <td className="p-4 text-zinc-500 uppercase">{p.tab_comissoes_regras?.base_produtos?.nome || '—'}</td>
                    <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_seguradoras?.nome || '—'}</td>
                    <td className="p-4 text-center text-zinc-400 font-mono">📄 {p.tab_comissoes_regras?.tab_proposta_itens?.numero_apolice || '—'}</td>
                    <td className="p-4 text-center font-black text-zinc-400">{p.numero_parcela}º</td>
                    <td className="p-4 text-right text-zinc-400 font-normal">{formatBRL(parseToNumber(p.valor_comissao_total))}</td>
                    <td className="p-4 text-right font-black text-blue-600">{formatBRL(parseToNumber(p.valor_direito_corretor))}</td>
                    <td className="p-4 text-right text-zinc-500">{formatBRL(parseToNumber(p.valor_direito_corretora_mae))}</td>
                    <td className="p-4 text-center font-bold text-zinc-800 dark:text-zinc-200">{p.data_vencimento_previsto.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/30 dark:bg-blue-950/10">{p.data_recebimento ? p.data_recebimento.split('-').reverse().join('/') : '—'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${p.status_recebimento_seguradora === 'RECEBIDO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                        {p.status_recebimento_seguradora}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {p.status_recebimento_seguradora === 'RECEBIDO' ? (
                          <button 
                            onClick={() => reverterBaixaParcela(p)}
                            title="Estornar esta parcela"
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                          >
                            <RefreshCcw size={15} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setPopoverBaixa({ id: p.id, valor: parseToNumber(p.valor_direito_corretor) });
                              setValorRecebidoReal(parseToNumber(p.valor_direito_corretor));
                              setDataBaixaReal(p.data_recebimento || new Date().toISOString().split('T')[0]);
                            }}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-600 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button 
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors cursor-not-allowed"
                          title="Filtros e Regras Vinculadas"
                        >
                          <SlidersHorizontal size={15} />
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

      {/* MODAL FECHAMENTO CONTA CORRENTE (LOTE) */}
      {modalLote && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">Fechamento de Conta Corrente</span>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2">Conciliar Extrato do Repasse</h3>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-400 uppercase">Soma das Parcelas Selecionadas:</span>
                <span className="text-zinc-900 dark:text-white font-mono">{formatBRL(somaLoteAtual)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-400 uppercase">Valor Efetivo Depositado:</span>
                <span className="text-blue-600 font-mono">{formatBRL(valorRepasseInformado)}</span>
              </div>
              <hr className="border-zinc-200 dark:border-zinc-800" />
              <div className="flex justify-between text-xs font-black">
                <span className="uppercase text-zinc-500">Saldo da Diferença Temporária:</span>
                <span className={(valorRepasseInformado - somaLoteAtual) >= 0 ? "text-emerald-600 font-mono" : "text-rose-600 font-mono"}>
                  {formatBRL(valorRepasseInformado - somaLoteAtual)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Valor Creditado (R$)</label>
                  <input type="number" step="0.01" value={valorRepasseInformado} onChange={(e) => setValorRepasseInformado(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold outline-none"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Data do Lote</label>
                  <input type="date" value={dataRepasseReal} onChange={(e) => setDataRepasseReal(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Observações do Lote</label>
                <textarea rows={2} placeholder="EX: Repasse menor devido à glosa bancária..." value={observacaoRepasse} onChange={(e) => setObservacaoRepasse(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-[11px] font-bold outline-none uppercase"/>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalLote(false)} className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:bg-zinc-50">Voltar</button>
              <button onClick={processarConciliacaoLote} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 shadow-sm">Liquidar Lote</button>
            </div>
          </div>
        </div>
      )}

      {/* POPOVER BAIXA INDIVIDUAL */}
      {popoverBaixa && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-2xl max-w-sm w-full space-y-4 text-left">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">Conciliar Parcela</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Meu Split Recebido (R$)</label>
                <input type="number" step="0.01" value={valorRecebidoReal} onChange={(e) => setValorRecebidoReal(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold outline-none"/>
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Data Recebimento</label>
                <input type="date" value={dataBaixaReal} onChange={(e) => setDataBaixaReal(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold outline-none"/>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPopoverBaixa(null)} className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:bg-zinc-50">Cancelar</button>
              <button onClick={confirmarBaixaRecebimento} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 shadow-sm">Confirmar Baixa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};