import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Search, Calendar, ArrowDownCircle, CheckCircle, AlertTriangle, Check, Eye, Wallet, RefreshCcw, Landmark, ArrowUpRight, ArrowDownLeft, Equal, PlusCircle, Building2, XCircle, Ban, ChevronDown, ChevronUp, Printer, Activity, Percent, ArrowRight } from 'lucide-react';

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
  valor_recebido_liquido: number | string | null;
  pct_desconto_baixa: number | string | null;
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
    tab_clientes: { nome: string | null; razao_social: string | null; nome_fantasia: string | null; } | null;
    base_produtos: { nome: string } | null;
    base_seguradoras: { nome: string } | null;
    tab_proposta_itens: { numero_apolice: string | null } | null;
  } | null;
}

interface RepasseItem {
  id: string;
  corretor_id: string;
  data_pagamento: string;
  valor_informado_pago: number | string;
  observacao: string | null;
}

// Estrutura do Novo Fluxo de Caixa Consolidado por Dia
interface MovimentacaoDia {
  dataIso: string;
  totalCredito: number; // Repasses recebidos
  totalDebitoBruto: number; // Provisões baixadas (Bruto)
  totalDebitoLiquido: number; // Provisões baixadas (Líquido)
  saldoDia: number; // Credito - Debito Liquido
  detalhesProvisoes: {
    cliente: string;
    parcela: string;
    bruto: number;
    liquido: number;
    desconto: number;
  }[];
  detalhesRepasses: {
    valor: number;
    obs: string;
  }[];
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
  
  const [vendaDe, setVendaDe] = useState('');
  const [vendaAte, setVendaAte] = useState('');
  const [vencimentoDe, setVencimentoDe] = useState(''); 
  const [vencimentoAte, setVencimentoAte] = useState('');
  const [baixaDe, setBaixaDe] = useState('');
  const [baixaAte, setBaixaAte] = useState('');
  
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'PREVISTO' | 'RECEBIDO' | 'CANCELADO'>('TODOS');
  
  const [provisoes, setProvisoes] = useState<ProvisaoItem[]>([]);
  const [repassesHistorico, setRepassesHistorico] = useState<RepasseItem[]>([]);
  
  const [selecionadasLote, setSelecionadasLote] = useState<string[]>([]);
  const [linhasExpandidas, setLinhasExpandidas] = useState<string[]>([]);
  const [diasExpandidosFluxo, setDiasExpandidosFluxo] = useState<string[]>([]); // Expansão do Fluxo de Caixa

  const [modalAporte, setModalAporte] = useState<boolean>(false);
  const [valorAporte, setValorAporte] = useState<number>(0);
  const [dataAporte, setDataAporte] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacaoAporte, setObservacaoAporte] = useState<string>('');

  const [modalDetalhe, setModalDetalhe] = useState<boolean>(false);
  const [itemDetalhado, setItemDetalhado] = useState<ProvisaoItem | null>(null);
  const [modalFluxo, setModalFluxo] = useState<boolean>(false);

  const [modalBaixaParametros, setModalBaixaParametros] = useState<{ visivel: boolean; ids: string[]; valorBrutoTotal: number }>({ visivel: false, ids: [], valorBrutoTotal: 0 });
  const [pctDescontoInput, setPctDescontoInput] = useState<number>(0);

  useEffect(() => {
    carregarDadosIniciais();
  }, [vendaDe, vendaAte, vencimentoDe, vencimentoAte, baixaDe, baixaAte, statusFiltro]);

  const carregarDadosIniciais = async () => {
    setLoading(true);
    await Promise.all([
      carregarProvisoesReal(),
      carregarRepassesReal()
    ]);
    setLoading(false);
  };

  const carregarRepassesReal = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id || "00000000-0000-0000-0000-000000000000";

      const { data, error } = await supabase
        .from('tab_financeiro_repasses')
        .select('*')
        .eq('corretor_id', userUuid)
        .order('data_pagamento', { ascending: false });

      if (error) throw error;
      setRepassesHistorico((data as RepasseItem[]) || []);
    } catch (err) {
      console.error("Erro ao carregar repasses:", err);
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
          valor_recebido_liquido, pct_desconto_baixa,
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
    setVendaDe(''); setVendaAte('');
    setVencimentoDe(''); setVencimentoAte('');
    setBaixaDe(''); setBaixaAte('');
    toast.success("Filtros de data limpos!");
  };

  const iniciarBaixaIndividual = (provisaoId: string, valorBruto: number) => {
    setPctDescontoInput(0);
    setModalBaixaParametros({ visivel: true, ids: [provisaoId], valorBrutoTotal: valorBruto });
  };

  const iniciarBaixaLote = () => {
    if (selecionadasLote.length === 0) return;
    const somaLote = provisoes
      .filter(p => selecionadasLote.includes(p.id))
      .reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);
    
    setPctDescontoInput(0);
    setModalBaixaParametros({ visivel: true, ids: selecionadasLote, valorBrutoTotal: somaLote });
  };

  const processarConfirmacaoBaixaBD = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const agora = new Date().toISOString();

      const promises = modalBaixaParametros.ids.map(async (id) => {
        const itemOriginal = provisoes.find(p => p.id === id);
        const brutoOriginal = parseToNumber(itemOriginal?.valor_direito_corretor);
        
        const factorDesconto = pctDescontoInput > 0 ? (1 - pctDescontoInput / 100) : 1;
        const liquidoFinalIndividual = brutoOriginal * factorDesconto;

        return supabase
          .from('tab_financeiro_provisoes')
          .update({
            status_recebimento_seguradora: 'RECEBIDO', 
            status_repasse_corretor: 'PAGO', // Baixa direta liquida a posição do corretor
            data_recebimento: hoje,
            pct_desconto_baixa: pctDescontoInput,
            valor_recebido_liquido: liquidoFinalIndividual,
            updated_at: agora
          })
          .eq('id', id);
      });

      await Promise.all(promises);
      toast.success(`Liquidação concluída e repasse marcado como PAGO!`);
      setSelecionadasLote([]);
      setModalBaixaParametros({ visivel: false, ids: [], valorBrutoTotal: 0 });
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar baixa com descontos.");
    }
  };

  const reverterBaixaParcela = async (provisao: ProvisaoItem) => {
    if (!window.confirm("Deseja estornar esta parcela? O status voltará para PREVISTO e os descontos da baixa serão limpos.")) return;
    try {
      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'PREVISTO',
          status_repasse_corretor: 'PENDENTE',
          data_recebimento: null,
          repasse_id: null, 
          valor_recebido_liquido: null,
          pct_desconto_baixa: 0,
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
    if (!window.confirm(`Deseja realmente CANCELAR todas as parcelas PREVISTAS do contrato de ${nomeCliente.toUpperCase()}?`)) return;
    try {
      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'CANCELADO',
          updated_at: new Date().toISOString()
        })
        .eq('regra_id', regraId)
        .eq('status_recebimento_seguradora', 'PREVISTO');

      if (error) throw error;
      toast.success("Provisões futuras canceladas!");
      setModalDetalhe(false);
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cancelar provisões futuras.");
    }
  };

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
          observacao: observacaoAporte || "REPASSE FINANCEIRO DA CORRETORA"
        });

      if (error) throw error;
      toast.success("Repasse registrado com sucesso!");
      setModalAporte(false); setValorAporte(0); setObservacaoAporte('');
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar repasse.");
    }
  };

  const obterNomeCliente = (cliente: any) => {
    if (!cliente) return '—';
    return cliente.razao_social || cliente.nome || cliente.nome_fantasia || '—';
  };

  // LOGICA DO NOVO FLUXO DE CAIXA CONSOLIDADO POR DIA (CRÉDITO x DÉBITO)
  const calcularFluxoCaixaConsolidado = (): MovimentacaoDia[] => {
    const mapaDias: { [data: string]: MovimentacaoDia } = {};

    // 1. Processa todas as entradas de comissão (Aportes/Repasses) -> CRÉDITOS
    repassesHistorico.forEach(r => {
      const data = r.data_pagamento;
      if (!mapaDias[data]) {
        mapaDias[data] = { dataIso: data, totalCredito: 0, totalDebitoBruto: 0, totalDebitoLiquido: 0, saldoDia: 0, detalhesProvisoes: [], detalhesRepasses: [] };
      }
      mapaDias[data].totalCredito += parseToNumber(r.valor_informado_pago);
      mapaDias[data].detalhesRepasses.push({
        valor: parseToNumber(r.valor_informado_pago),
        obs: r.observacao || 'Repasse Recebido'
      });
    });

    // 2. Processa todas as baixas de provisões ocorridas -> DÉBITOS (Dinheiro consumido/pago ao corretor no ato)
    provisoes.forEach(p => {
      if (p.status_recebimento_seguradora === 'RECEBIDO' && p.data_recebimento) {
        const data = p.data_recebimento;
        if (!mapaDias[data]) {
          mapaDias[data] = { dataIso: data, totalCredito: 0, totalDebitoBruto: 0, totalDebitoLiquido: 0, saldoDia: 0, detalhesProvisoes: [], detalhesRepasses: [] };
        }
        
        const bruto = parseToNumber(p.valor_direito_corretor);
        const liquido = p.valor_recebido_liquido !== null ? parseToNumber(p.valor_recebido_liquido) : bruto;
        const desc = parseToNumber(p.pct_desconto_baixa);

        mapaDias[data].totalDebitoBruto += bruto;
        mapaDias[data].totalDebitoLiquido += liquido;
        mapaDias[data].detalhesProvisoes.push({
          cliente: obterNomeCliente(p.tab_comissoes_regras?.tab_clientes),
          parcela: `${p.numero_parcela}/${p.tab_comissoes_regras?.quantidade_parcelas || 1}`,
          bruto,
          liquido,
          desconto: desc
        });
      }
    });

    // 3. Calcula os saldos diários de cada movimento
    return Object.values(mapaDias).map(dia => {
      dia.saldoDia = dia.totalCredito - dia.totalDebitoLiquido;
      return dia;
    }).sort((a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime());
  };


  // 4. IMPRESSÃO DO FLUXO DE CAIXA
  const imprimirRelatorioCaixaPDF = () => {
    const janelaImpressao = window.open('', '_blank', 'width=1200,height=800');
    if (!janelaImpressao) {
      toast.error("Permita pop-ups para gerar o relatório.");
      return;
    }

    const dadosCaixa = calcularFluxoCaixaConsolidado();

    // 1. CÁLCULOS EXATOS CONFORME SUA DEFINIÇÃO
    const totalEntradas = dadosCaixa.reduce((acc, dia) => acc + dia.totalCredito, 0);
    const totalBaixas = dadosCaixa.reduce((acc, dia) => acc + dia.totalDebitoLiquido, 0);
    
    // O SALDO DIFERENÇA CONFORME SUA FÓRMULA:
    const saldoDiferenca = totalEntradas - totalBaixas;
    
    // O A RECEBER LÍQUIDO CONFORME SUA FÓRMULA:
    // (Total previsto no sistema - O saldo que já foi consumido/ajustado no caixa)
    const totalPrevistoBruto = provisoes
      .filter(p => p.status_recebimento_seguradora === 'PREVISTO')
      .reduce((acc, p) => acc + parseToNumber(p.valor_direito_corretor), 0);
      
    const totalAReceberLiquido = totalPrevistoBruto - saldoDiferenca;

    // 2. MONTAGEM DO HTML (Mantida a estrutura de listagem)
    const linhasHtml = dadosCaixa.map(dia => {
      const dataFormatada = dia.dataIso.split('-').reverse().join('/');
      const corSaldo = dia.saldoDia >= 0 ? '#15803d' : '#b91c1c';
      
      const subTabelaProvisoes = dia.detalhesProvisoes.map(p => `
        <tr>
          <td>↳ Parcela: ${p.cliente.toUpperCase()} (Parc. ${p.parcela})</td>
          <td style="text-align: right; color:#64748b;">${formatBRL(p.bruto)}</td>
          <td style="text-align: right; font-weight:bold; color:#b91c1c;">-${formatBRL(p.liquido)}</td>
        </tr>
      `).join('');

      const subTabelaRepasses = dia.detalhesRepasses.map(r => `
        <tr>
          <td style="color:#2563eb;">↳ Crédito: ${r.obs.toUpperCase()}</td>
          <td style="text-align: right; font-weight:bold; color:#15803d;">+${formatBRL(r.valor)}</td>
          <td></td>
        </tr>
      `).join('');

      return `
        <tbody style="page-break-inside: avoid;">
          <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
            <td style="padding: 10px; font-size: 10pt;">${dataFormatada}</td>
            <td style="padding: 10px; text-align: right; color: #15803d;">${formatBRL(dia.totalCredito)}</td>
            <td style="padding: 10px; text-align: right; color: #b91c1c;">${formatBRL(dia.totalDebitoLiquido)}</td>
            <td style="padding: 10px; text-align: right; color: ${corSaldo}; font-size: 10pt;">${formatBRL(dia.saldoDia)}</td>
          </tr>
          ${subTabelaRepasses}
          ${subTabelaProvisoes}
        </tbody>
      `;
    }).join('');

    // 3. GERAÇÃO DO DOCUMENTO COM CARDS CORRIGIDOS
    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Extrato Consolidado</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 25px; }
          .card-container { display: flex; gap: 10px; margin-bottom: 20px; }
          .card { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <h2>Extrato Auditado de Caixa</h2>
        <div class="card-container">
          <div class="card">
            <div style="font-size:7pt; color:#666;">TOTAL ENTRADAS</div>
            <div style="font-size:12pt; font-weight:bold;">${formatBRL(totalEntradas)}</div>
          </div>
          <div class="card">
            <div style="font-size:7pt; color:#666;">TOTAL BAIXAS</div>
            <div style="font-size:12pt; font-weight:bold;">${formatBRL(totalBaixas)}</div>
          </div>
          <div class="card" style="background: ${saldoDiferenca < 0 ? '#fee2e2' : '#f0fdf4'};">
            <div style="font-size:7pt; color:#666;">SALDO DIFERENÇA</div>
            <div style="font-size:12pt; font-weight:bold; color: ${saldoDiferenca < 0 ? '#b91c1c' : '#15803d'};">
              ${formatBRL(saldoDiferenca)}
            </div>
          </div>
          <div class="card" style="background: #fffbeb;">
            <div style="font-size:7pt; color:#666;">A RECEBER LÍQ.</div>
            <div style="font-size:12pt; font-weight:bold;">${formatBRL(totalAReceberLiquido)}</div>
          </div>
        </div>
        <table>${linhasHtml}</table>
        <script>window.onload = function() { window.print(); setTimeout(() => { window.close(); }, 500); };</script>
      </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  const totalGeradoMae = provisoes.filter(p => p.status_recebimento_seguradora !== 'CANCELADO').reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretora_mae), 0);
  const totalProvisionadoCorretor = provisoes.filter(p => p.status_recebimento_seguradora !== 'CANCELADO').reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const totalRecebidoCorretorBruto = provisoes.filter(p => p.status_recebimento_seguradora === 'RECEBIDO').reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const totalRecebidoCorretorLiquidoReal = provisoes.filter(p => p.status_recebimento_seguradora === 'RECEBIDO').reduce((acc, curr) => acc + (curr.valor_recebido_liquido !== null ? parseToNumber(curr.valor_recebido_liquido) : parseToNumber(curr.valor_direito_corretor)), 0);
  const totalAReceberCorretor = provisoes.filter(p => p.status_recebimento_seguradora === 'PREVISTO').reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const somaLoteAtual = provisoes.filter(p => selecionadasLote.includes(p.id)).reduce((acc, curr) => acc + parseToNumber(curr.valor_direito_corretor), 0);
  const totalRepassadoCorretora = repassesHistorico.reduce((acc, curr) => acc + parseToNumber(curr.valor_informado_pago), 0);
  const saldoRealCorretor = totalRepassadoCorretora - totalRecebidoCorretorLiquidoReal;

  const provisoesFiltradasEOrdenadas = provisoes
    .filter((p: ProvisaoItem) => {
      const r = p.tab_comissoes_regras;
      if (!r) return false;
      return obterNomeCliente(r.tab_clientes).toLowerCase().includes(busca.toLowerCase()) ||
             (r.base_produtos?.nome?.toLowerCase() || '').includes(busca.toLowerCase()) ||
             (r.base_seguradoras?.nome?.toLowerCase() || '').includes(busca.toLowerCase()) ||
             (r.tab_proposta_itens?.numero_apolice?.toLowerCase() || '').includes(busca.toLowerCase());
    })
    .sort((a, b) => obterNomeCliente(a.tab_comissoes_regras?.tab_clientes).toLowerCase().localeCompare(obterNomeCliente(b.tab_comissoes_regras?.tab_clientes).toLowerCase()));

  const toggleLinhaExpandida = (id: string) => {
    setLinhasExpandidas(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleDiaFluxoExpandido = (dataIso: string) => {
    setDiasExpandidosFluxo(prev => prev.includes(dataIso) ? prev.filter(d => d !== dataIso) : [...prev, dataIso]);
  };

  // GERADOR DO RELATÓRIO OFICIAL EM PDF (DEMONSTRATIVO UNIFICADO)
  const handleGerarRelatorioOficial = () => {
    const janelaImpressao = window.open('', '_blank');
    
    if (!janelaImpressao) {
      toast.error("Por favor, permita pop-ups para gerar o relatório.");
      return;
    }

    const dataHoraAtual = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    // Recalcula totais necessários para o cabeçalho do PDF
    const comissaoGeradaTotal = provisoes.filter(p => p.status_recebimento_seguradora !== 'CANCELADO').reduce((acc, curr) => acc + parseToNumber(curr.valor_comissao_total), 0);
    const totalAReceberAjustado = totalAReceberCorretor - saldoRealCorretor;

    const htmlRelatorio = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Comissões</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 16px; margin: 0; }
          .header h2 { font-size: 12px; font-weight: normal; margin: 5px 0 0 0; }
          .date { position: absolute; top: 0; left: 0; font-size: 9px; }
          
          /* Cards de Resumo */
          .resumo-container { display: flex; justify-content: space-between; margin-bottom: 15px; gap: 8px; }
          .resumo-box { border: 1px solid #e5e7eb; background: #f9fafb; padding: 10px; width: 100%; text-align: center; border-radius: 6px; }
          .resumo-box strong { display: block; font-size: 9px; margin-bottom: 5px; color: #6b7280; text-transform: uppercase; }
          .resumo-box span { font-size: 13px; font-weight: bold; }

          /* Tabela Principal */
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          tr { page-break-inside: avoid; }
          th { background-color: #f3f4f6; border-bottom: 1px solid #1f2937; padding: 6px; text-align: left; font-size: 8.5px; }
          td { padding: 6px; border-bottom: 1px dashed #d1d5db; vertical-align: top; font-size: 8.5px; }
          
          
          
          /* Footer */
          .footer { position: fixed; bottom: 0; width: 100%; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="date">Relatório de Comissões<br/>${dataHoraAtual}</div>
        
        <div class="header">
          <h1>DEMONSTRATIVO UNIFICADO DE COMISSÕES</h1>
          <h2>Módulo de Auditoria Integrada de Provisões</h2>
        </div>

        <div class="resumo-container">
          <div class="resumo-box"><strong>1º Comissão Gerada Total</strong><span style="color: #1f2937;">${formatBRL(comissaoGeradaTotal)}</span></div>
          <div class="resumo-box"><strong>2º Parte Corretora (Mãe)</strong><span style="color: #4f46e5;">${formatBRL(totalGeradoMae)}</span></div>
          <div class="resumo-box"><strong>3º Direito Corretor (Bruto)</strong><span style="color: #2563eb;">${formatBRL(totalProvisionadoCorretor)}</span></div>
          <div class="resumo-box"><strong>4º Recebido Líquido (Caixa)</strong><span style="color: #16a34a;">${formatBRL(totalRecebidoCorretorLiquidoReal)}</span></div>
          <div class="resumo-box"><strong>5º A Receber (Previsto)</strong><span style="color: #d97706;">${formatBRL(totalAReceberAjustado)}</span></div>
        </div>

        <div class="resumo-container" style="justify-content: center; gap: 20px;">
          <div class="resumo-box" style="max-width: 200px;">
            <strong>Total Repasses (Aportes)</strong>
            <span style="color: #2563eb;">${formatBRL(totalRepassadoCorretora)}</span>
          </div>
          <div class="resumo-box" style="max-width: 200px;">
            <strong>Comissões Baixadas (Líquido)</strong>
            <span style="color: #16a34a;">${formatBRL(totalRecebidoCorretorLiquidoReal)}</span>
          </div>
          <div class="resumo-box" style="max-width: 200px; border-color: ${saldoRealCorretor < 0 ? '#fecdd3' : '#bbf7d0'}; background-color: ${saldoRealCorretor < 0 ? '#fff1f2' : '#f0fdf4'};">
            <strong>Saldo Final Diferença</strong>
            <span style="color: ${saldoRealCorretor < 0 ? '#e11d48' : '#16a34a'};">${saldoRealCorretor >= 0 ? formatBRL(saldoRealCorretor) : `-${formatBRL(Math.abs(saldoRealCorretor))}`}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>CLIENTE</th>
              <th>PRODUTO</th>
              <th>SEGURADORA</th>
              <th>APÓLICE</th>
              <th>PARCELA</th>
              <th>SPLIT CORRETOR</th>
              <th>VENCIMENTO</th>
              <th>DATA REC.</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${provisoesFiltradasEOrdenadas.map((p: ProvisaoItem) => {
              const liqExibicao = p.valor_recebido_liquido !== null ? parseToNumber(p.valor_recebido_liquido) : parseToNumber(p.valor_direito_corretor);
              const dataVenc = p.data_vencimento_previsto ? p.data_vencimento_previsto.split('-').reverse().join('/') : '—';
              const dataRec = p.data_recebimento ? p.data_recebimento.split('-').reverse().join('/') : '—';
              const dataVenda = p.tab_comissoes_regras?.data_venda ? p.tab_comissoes_regras.data_venda.split('-').reverse().join('/') : '—';
              const clienteNome = obterNomeCliente(p.tab_comissoes_regras?.tab_clientes).toUpperCase();
              
              return `
              <tr>
                <td style="padding: 8px 4px;">
                  <strong>${clienteNome}</strong><br/>
                  <span style="font-size: 7px; color: #6b7280;">Venda: ${dataVenda}</span>
                </td>
                <td style="padding: 8px 4px;">${p.tab_comissoes_regras?.base_produtos?.nome?.toUpperCase() || '—'}</td>
                <td style="padding: 8px 4px;">${p.tab_comissoes_regras?.base_seguradoras?.nome?.toUpperCase() || '—'}</td>
                <td style="padding: 8px 4px;">${p.tab_comissoes_regras?.tab_proposta_itens?.numero_apolice || '—'}</td>
                <td style="padding: 8px 4px; text-align: center;">${p.numero_parcela}/${p.tab_comissoes_regras?.quantidade_parcelas || 1}</td>
                <td style="padding: 8px 4px; text-align: left;">
                  <span style="font-size: 7.5px; color: #6b7280;">B: ${formatBRL(parseToNumber(p.valor_direito_corretor))}</span><br/>
                  <strong style="color: #15803d;">L: ${formatBRL(liqExibicao)}</strong>
                </td>
                <td style="padding: 8px 4px; text-align: center;">${dataVenc}</td>
                <td style="padding: 8px 4px; text-align: center;">${dataRec}</td>
                <td style="padding: 8px 4px; text-align: center;">
                   <span style="background-color: ${p.status_recebimento_seguradora === 'RECEBIDO' ? '#dcfce7' : p.status_recebimento_seguradora === 'CANCELADO' ? '#fee2e2' : '#fef3c7'}; 
                                color: ${p.status_recebimento_seguradora === 'RECEBIDO' ? '#166534' : p.status_recebimento_seguradora === 'CANCELADO' ? '#991b1b' : '#92400e'}; 
                                padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold;">
                     ${p.status_recebimento_seguradora}
                   </span>
                </td>
              </tr>
             `}).join('')}
          </tbody>
        </table>

        <div class="footer">
          Relatório Financeiro Corporativo Confidencial
        </div>
      </body>
      </html>
    `;

    janelaImpressao.document.write(htmlRelatorio);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    
    setTimeout(() => {
      janelaImpressao.print();
    }, 250);
  };

 
  return (
    <div className="p-6 space-y-6 text-left bg-zinc-50/50 dark:bg-zinc-950 min-h-screen relative print:p-0 print:bg-white">
      
      {/* BOTÕES SUPERIORES CONTROLE */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-2">
          <button onClick={() => setModalAporte(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-blue-500 transition-all">
            <PlusCircle size={16} /> Registrar Repasse
          </button>
          <button onClick={() => setModalFluxo(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-indigo-500 transition-all">
            <Activity size={16} /> Ver Fluxo de Caixa
          </button>
          <button onClick={() => { if (linhasExpandidas.length === provisoesFiltradasEOrdenadas.length) setLinhasExpandidas([]); else setLinhasExpandidas(provisoesFiltradasEOrdenadas.map(p => p.id)); }} className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-zinc-700 transition-all">
            <Eye size={16} /> {linhasExpandidas.length === provisoesFiltradasEOrdenadas.length ? 'Recolher Todos' : 'Expandir Todos'}
          </button>
          
          {/* RETORNO DO BOTÃO DE IMPRESSÃO */}
          <button 
            onClick={handleGerarRelatorioOficial} 
            className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-zinc-700 transition-all"
          >
            <Printer size={16} /> Imprimir Relatório Unificado
          </button>
        </div>
      </div>

      {/* BARRA FLUTUANTE DE BAIXA EM LOTE */}
      {selecionadasLote.length > 0 && (
        <div className="bg-zinc-900 text-white p-4 rounded-[2rem] flex items-center justify-between shadow-lg dark:bg-zinc-800 print:hidden">
          <div className="flex items-center gap-4 pl-2">
            <Wallet size={20} className="text-blue-500" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Liquidação de Parcelas Selecionadas</p>
              <p className="text-xs font-bold">
                <span className="bg-zinc-800 px-2 py-0.5 rounded font-mono text-blue-400">{selecionadasLote.length}</span> parcelas | Bruto: <span className="font-black text-white">{formatBRL(somaLoteAtual)}</span>
              </p>
            </div>
          </div>
          <button onClick={iniciarBaixaLote} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all">
            Liquidar e Repassar com Taxas/Descontos
          </button>
        </div>
      )}

      {/* CÁLCULO PRÉVIO DOS VALORES DE BASE PARA OS PERCENTUAIS */}
      {(() => {
        // 1. Calcula a Comissão Gerada Total (base 100%)
        const comissaoGeradaTotal = provisoes
          .filter(p => p.status_recebimento_seguradora !== 'CANCELADO')
          .reduce((acc, curr) => acc + parseToNumber(curr.valor_comissao_total), 0);

        // 2. Calcula o Saldo Real da Conciliação (Conforme regra anterior: Aportes - Baixas Líquidas)
        const saldoRealCorretor = totalRepassadoCorretora - totalRecebidoCorretorLiquidoReal;

        // 3. Nova Regra do Card 5: A Receber (Previsto) Ajustado pelo Saldo da Conciliação
        // Se o saldo for negativo, ele subtrai o valor negativo (o que gera uma soma)
        const totalAReceberAjustado = totalAReceberCorretor - saldoRealCorretor;

        // 4. Funções auxiliares para evitar divisão por zero nos percentuais
        const pctGerada = 100;
        const pctCorretora = comissaoGeradaTotal > 0 ? (totalGeradoMae / comissaoGeradaTotal) * 100 : 0;
        const pctCorretorBruto = comissaoGeradaTotal > 0 ? (totalProvisionadoCorretor / comissaoGeradaTotal) * 100 : 0;
        const pctRecebidoLiquido = totalProvisionadoCorretor > 0 ? (totalRecebidoCorretorLiquidoReal / totalProvisionadoCorretor) * 100 : 0;
        const pctAReceberAjustado = totalProvisionadoCorretor > 0 ? (totalAReceberAjustado / totalProvisionadoCorretor) * 100 : 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Total de comissão gerada */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">1º Comissão Gerada Total</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">{formatBRL(comissaoGeradaTotal)}</h2>
                  <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded">
                    {pctGerada}%
                  </span>
                </div>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-full text-purple-600"><Building2 size={18}/></div>
            </div>

            {/* Card 2: Total de comissão da corretora */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">2º Parte Corretora (Mãe)</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">{formatBRL(totalGeradoMae)}</h2>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                    {pctCorretora.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 rounded-full text-indigo-600"><Landmark size={18}/></div>
            </div>

            {/* Card 3: Total de comissão do corretor */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">3º Direito Corretor (Bruto)</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">{formatBRL(totalProvisionadoCorretor)}</h2>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                    {pctCorretorBruto.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-full text-blue-600"><ArrowDownCircle size={18}/></div>
            </div>

            {/* Card 4: Total de comissão recebida do corretor */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">4º Recebido Líquido (Caixa)</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-lg font-black text-emerald-600 tracking-tight">{formatBRL(totalRecebidoCorretorLiquidoReal)}</h2>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded" title="Sobre Direito Corretor (Bruto)">
                    {pctRecebidoLiquido.toFixed(1)}%
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Antes da taxa: {formatBRL(totalRecebidoCorretorBruto)}</span>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600"><CheckCircle size={18}/></div>
            </div>

            {/* Card 5: Total de comissão a receber do corretor */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">5º A Receber (Previsto)</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-lg font-black text-amber-600 tracking-tight">{formatBRL(totalAReceberAjustado)}</h2>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded" title="Sobre Direito Corretor (Bruto)">
                    {pctAReceberAjustado.toFixed(1)}%
                  </span>
                </div>
                {saldoRealCorretor !== 0 && (
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    Original: {formatBRL(totalAReceberCorretor)} ({saldoRealCorretor < 0 ? '+' : '-'}{formatBRL(Math.abs(saldoRealCorretor))})
                  </span>
                )}
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-full text-amber-600"><AlertTriangle size={18}/></div>
            </div>

          </div>
        );
      })()}

      {/* CONCILIAÇÃO DE REPASSES - 4 CARDS ESTRUTURADOS */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-800 dark:text-white">
          <Landmark size={18} className="text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-tight">Conciliação Geral de Repasses (Aportes vs Baixas Auditadas)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1º Card: Total de Repasses */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between border border-zinc-100">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">1º Total Repasses (Aportes)</span>
              <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{formatBRL(totalRepassadoCorretora)}</span>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg"><ArrowUpRight size={16} /></div>
          </div>

          {/* 2º Card: Total de comissões baixadas (Bruto) */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between border border-zinc-100">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">2º Comissões Baixadas (Bruto)</span>
              <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">{formatBRL(totalRecebidoCorretorBruto)}</span>
            </div>
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg"><ArrowDownCircle size={16} /></div>
          </div>

          {/* 3º Card: Total de comissões baixadas (Líquido) */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between border border-zinc-100">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">3º Comissões Baixadas (Líquido)</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatBRL(totalRecebidoCorretorLiquidoReal)}</span>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg"><ArrowDownLeft size={16} /></div>
          </div>

          {/* 4º Card: Saldo Final (Total Repasses - Baixadas Líquidas) */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${saldoRealCorretor < 0 ? 'bg-rose-50/50 border-rose-100 dark:border-rose-950' : 'bg-emerald-50/50 border-emerald-100 dark:border-emerald-950'}`}>
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-500 block mb-1">4º Saldo Final Diferença</span>
              <span className={`text-base font-black font-mono ${saldoRealCorretor < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {saldoRealCorretor >= 0 ? formatBRL(saldoRealCorretor) : `-${formatBRL(Math.abs(saldoRealCorretor))}`}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${saldoRealCorretor < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}><Equal size={16} /></div>
          </div>

        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-3.5 text-zinc-400" size={18} />
            <input type="text" placeholder="BUSCAR CLIENTE, PRODUTO, SEGURADORA..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 rounded-2xl text-xs font-bold uppercase tracking-tight outline-none" />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button onClick={limparFiltrosData} className="flex items-center gap-1 text-zinc-400 hover:text-rose-600 text-[11px] font-black uppercase tracking-tight bg-zinc-50 dark:bg-zinc-950 border px-3 py-2 rounded-xl"><XCircle size={14} /> Limpar Datas</button>
            <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1">
              {(['TODOS', 'PREVISTO', 'RECEBIDO', 'CANCELADO'] as const).map((t) => (
                <button key={t} onClick={() => setStatusFiltro(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFiltro === t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border">
            <div className="flex items-center gap-1.5 mb-1.5 text-zinc-400"><Calendar size={13} /><span className="text-[10px] font-black uppercase text-zinc-500">Data da Venda</span></div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={vendaDe} onChange={(e) => setVendaDe(e.target.value)} className="bg-transparent outline-none w-full" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={vendaAte} onChange={(e) => setVendaAte(e.target.value)} className="bg-transparent outline-none w-full" />
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border">
            <div className="flex items-center gap-1.5 mb-1.5 text-blue-600"><Calendar size={13} /><span className="text-[10px] font-black uppercase text-blue-600">Data Vencimento</span></div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={vencimentoDe} onChange={(e) => setVencimentoDe(e.target.value)} className="bg-transparent outline-none w-full" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={vencimentoAte} onChange={(e) => setVencimentoAte(e.target.value)} className="bg-transparent outline-none w-full" />
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border">
            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600"><Calendar size={13} /><span className="text-[10px] font-black uppercase text-emerald-600">Data da Baixa</span></div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={baixaDe} onChange={(e) => setBaixaDe(e.target.value)} className="bg-transparent outline-none w-full" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={baixaAte} onChange={(e) => setBaixaAte(e.target.value)} className="bg-transparent outline-none w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* TABELA PRINCIPAL DE LANÇAMENTOS */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-black uppercase text-zinc-400 border-b">
              <tr>
                <th className="p-4 text-center w-10">Select</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Produto</th>
                <th className="p-4">Seguradora</th>
                <th className="p-4 text-center">Apólice</th>
                <th className="p-4 text-center">Parcela</th>
                <th className="p-4 text-right">Bruto Original</th>
                <th className="p-4 text-right text-emerald-600">Líquido Recebido</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center">Data Rec.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
            {loading ? (<tr><td colSpan={12} className="p-8 text-center uppercase font-black text-zinc-400 animate-pulse">Buscando lançamentos...</td></tr>) : provisoesFiltradasEOrdenadas.length === 0 ? (<tr><td colSpan={12} className="p-8 text-center uppercase font-black text-zinc-400">Nenhum registro.</td></tr>) : (
              provisoesFiltradasEOrdenadas.map((p: ProvisaoItem) => {
                const estaExpandida = linhasExpandidas.includes(p.id);
                const liqExibicao = p.valor_recebido_liquido !== null ? parseToNumber(p.valor_recebido_liquido) : parseToNumber(p.valor_direito_corretor);
                const temDesconto = parseToNumber(p.pct_desconto_baixa) > 0;

                return (
                  <Fragment key={p.id}>
                    <tr className={`${selecionadasLote.includes(p.id) ? 'bg-blue-50/50' : 'hover:bg-zinc-50/80'} ${p.status_recebimento_seguradora === 'CANCELADO' ? 'opacity-50 bg-zinc-100/40 line-through text-zinc-400' : ''}`}>
                      <td className="p-4 text-center">
                        <input type="checkbox" checked={selecionadasLote.includes(p.id)} disabled={p.status_recebimento_seguradora === 'RECEBIDO' || p.status_recebimento_seguradora === 'CANCELADO'} onChange={() => setSelecionadasLote(prev => prev.includes(p.id) ? prev.filter(item => item !== p.id) : [...prev, p.id])} className="w-4 h-4 rounded cursor-pointer disabled:opacity-30" />
                      </td>
                      <td className="p-4 font-black text-zinc-900 dark:text-white uppercase">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleLinhaExpandida(p.id)} className="text-zinc-400 hover:text-zinc-600">{estaExpandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                          {obterNomeCliente(p.tab_comissoes_regras?.tab_clientes)}
                        </div>
                      </td>
                      <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_produtos?.nome || '—'}</td>
                      <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_seguradoras?.nome || '—'}</td>
                      <td className="p-4 text-center text-zinc-400 font-mono">📄 {p.tab_comissoes_regras?.tab_proposta_itens?.numero_apolice || '—'}</td>
                      <td className="p-4 text-center font-black text-zinc-500 bg-zinc-50/40">{p.numero_parcela} de {p.tab_comissoes_regras?.quantidade_parcelas || 1}</td>
                      <td className="p-4 text-right font-black text-zinc-500">{formatBRL(parseToNumber(p.valor_direito_corretor))}</td>
                      
                      <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50/10">
                        <div className="flex flex-col items-end">
                          <span>{formatBRL(liqExibicao)}</span>
                          {temDesconto && <span className="text-[9px] font-bold text-amber-600">-{p.pct_desconto_baixa}% taxa</span>}
                        </div>
                      </td>

                      <td className="p-4 text-center text-zinc-800 dark:text-zinc-200">{p.data_vencimento_previsto.split('-').reverse().join('/')}</td>
                      <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">{p.data_recebimento ? p.data_recebimento.split('-').reverse().join('/') : '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${p.status_recebimento_seguradora === 'RECEBIDO' ? 'bg-emerald-100 text-emerald-700' : p.status_recebimento_seguradora === 'CANCELADO' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{p.status_recebimento_seguradora}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {p.status_recebimento_seguradora === 'RECEBIDO' ? (
                            <button onClick={() => reverterBaixaParcela(p)} title="Estornar parcela e limpar taxas" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"><RefreshCcw size={15} /></button>
                          ) : p.status_recebimento_seguradora === 'PREVISTO' ? (
                            <>
                              <button 
                                onClick={() => iniciarBaixaIndividual(p.id, parseToNumber(p.valor_direito_corretor))} 
                                title="Baixar e pagar corretor" 
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100"
                              >
                                <Check size={16} />
                              </button>
                              <button onClick={() => cancelarProvisoesFuturasContrato(p.tab_comissoes_regras?.id || '', obterNomeCliente(p.tab_comissoes_regras?.tab_clientes))} title="Cancelar Contrato" className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100"><Ban size={15} /></button>
                            </>
                          ) : (<span className="text-[10px] text-zinc-400">N/A</span>)}
                          <button onClick={() => { setItemDetalhado(p); setModalDetalhe(true); }} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 rounded-lg"><Eye size={15} /></button>
                        </div>
                      </td>
                    </tr>
                    {estaExpandida && (
                      <tr className="bg-zinc-100/50 dark:bg-zinc-900/40">
                        <td colSpan={12} className="p-4 border-l-4 border-blue-500">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left text-zinc-700 dark:text-zinc-300">
                            <div className="text-[11px] space-y-1"><span className="text-[9px] font-black uppercase text-zinc-400 block">Venda</span><p>Data Venda: <strong className="font-mono">{p.tab_comissoes_regras?.data_venda ? p.tab_comissoes_regras.data_venda.split('-').reverse().join('/') : '—'}</strong></p></div>
                            <div className="text-[11px] space-y-1"><span className="text-[9px] font-black uppercase text-zinc-400 block">Origem</span><p>Base Cálculo: <strong className="font-mono">{formatBRL(parseToNumber(p.tab_comissoes_regras?.base_calculo_valor))}</strong></p></div>
                            <div className="text-[11px] space-y-1 bg-blue-50/40 p-2 rounded-xl"><span className="text-[9px] font-black uppercase text-blue-600 block">Split Bruto Contratado</span><p>Direito Corretor ({parseToNumber(p.tab_comissoes_regras?.pct_corretor)}%): <strong className="font-mono">{formatBRL(parseToNumber(p.valor_direito_corretor))}</strong></p></div>
                            <div className="text-[11px] space-y-1 bg-emerald-50/40 p-2 rounded-xl"><span className="text-[9px] font-black uppercase text-emerald-700 block">Liquidação do Caixa</span><p>Líquido Recebido: <strong className="font-mono text-emerald-700">{formatBRL(liqExibicao)}</strong></p><p>Dedução Aplicada: <span className="font-mono text-zinc-500">{temDesconto ? `${p.pct_desconto_baixa}%` : 'Nenhuma (Valor Líquido = Bruto)'}</span></p></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTRAR TAXA/DESCONTO NA BAIXA */}
      {modalBaixaParametros.visivel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Percent size={18} />
              <h3 className="text-sm font-black uppercase tracking-tight">Taxas e Descontos de Liquidação</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">Você está liquidando e pagando o corretor para <span className="font-black text-zinc-800">{modalBaixaParametros.ids.length} parcela(s)</span> com valor bruto de <strong>{formatBRL(modalBaixaParametros.valorBrutoTotal)}</strong>.</p>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border space-y-3">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Percentual de Desconto/Taxa (%)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.01" value={pctDescontoInput} onChange={(e) => setPctDescontoInput(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-full bg-white border p-3 rounded-xl text-sm font-black outline-none pr-10" placeholder="Ex: 6"/>
                  <span className="absolute right-4 top-3.5 text-zinc-400 font-bold text-sm">%</span>
                </div>
              </div>
              <div className="pt-2 flex justify-between items-center text-xs border-t border-dashed">
                <span className="text-zinc-400 font-bold">Líquido Estimado para Caixa:</span>
                <span className="font-mono font-black text-emerald-600 text-sm">{formatBRL(modalBaixaParametros.valorBrutoTotal * (1 - pctDescontoInput / 100))}</span>
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-black uppercase">
              <button onClick={() => setModalBaixaParametros({ visivel: false, ids: [], valorBrutoTotal: 0 })} className="flex-1 py-3 border rounded-xl text-zinc-400">Cancelar</button>
              <button onClick={processarConfirmacaoBaixaBD} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-500 transition-all">Confirmar e Liquidar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR REPASSE DE ENTRADA (CRÉDITO) */}
      {modalAporte && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4">
            <div><span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Gestão Financeira</span><h3 className="text-sm font-black text-zinc-900 uppercase mt-2">Registrar Recebimento de Aporte/Repasse (Crédito)</h3></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Valor Recebido (R$)</label><input type="number" step="0.01" value={valorAporte} onChange={(e) => setValorAporte(Number(e.target.value))} className="w-full bg-zinc-50 p-2.5 rounded-xl text-xs font-bold border" placeholder="0,00"/></div>
              <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Data</label><input type="date" value={dataAporte} onChange={(e) => setDataAporte(e.target.value)} className="w-full bg-zinc-50 p-2.5 rounded-xl text-xs font-bold border"/></div>
            </div>
            <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Identificação / Origem</label><textarea rows={2} placeholder="EX: REPASSE QUENZENA CORRETORA MÃE" value={observacaoAporte} onChange={(e) => setObservacaoAporte(e.target.value)} className="w-full bg-zinc-50 p-2.5 rounded-xl text-[11px] font-bold border uppercase"/></div>
            <div className="flex gap-2">
              <button onClick={() => setModalAporte(false)} className="flex-1 py-2.5 border rounded-xl text-[10px] font-black uppercase text-zinc-400">Cancelar</button>
              <button onClick={lancarAporteRepasse} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Registrar Entrada</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REESTRUTURADO: NOVO FLUXO DE CAIXA DIÁRIO CONSOLIDADO COMPACTO */}
      {modalFluxo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col h-[85vh]">
            
            {/* Cabeçalho */}
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">Conciliação Diária de Caixa</span>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase mt-2">Extrato de Movimentação do Caixa</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={imprimirRelatorioCaixaPDF} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm hover:bg-emerald-500 transition-all"><Printer size={14} /> Imprimir Extrato PDF</button>
                <button onClick={() => setModalFluxo(false)} className="text-zinc-400 hover:text-zinc-600 bg-zinc-100 p-2 rounded-full">✕</button>
              </div>
            </div>
            
            {/* Corpo do Extrato */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-4">
              
              {/* CARDS DE RESUMO GERENCIAL - LÓGICA ATUALIZADA */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  const dados = calcularFluxoCaixaConsolidado();
                  const totalEntradas = dados.reduce((acc, dia) => acc + dia.totalCredito, 0);
                  const totalBaixas = dados.reduce((acc, dia) => acc + dia.totalDebitoLiquido, 0);
                  const saldoDiferenca = totalEntradas - totalBaixas;
                  const totalPrevistoBruto = provisoes
                    .filter(p => p.status_recebimento_seguradora === 'PREVISTO')
                    .reduce((acc, p) => acc + parseToNumber(p.valor_direito_corretor), 0);
                  const totalAReceberLiquido = totalPrevistoBruto - saldoDiferenca;

                  return (
                    <>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-1">Total Entradas</span>
                        <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">{formatBRL(totalEntradas)}</span>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-800/50">
                        <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block mb-1">Total Baixas</span>
                        <span className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">{formatBRL(totalBaixas)}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${saldoDiferenca < 0 ? 'bg-rose-50 border-rose-200' : 'bg-zinc-100 border-zinc-200'}`}>
                        <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Saldo Diferença</span>
                        <span className={`text-lg font-black font-mono ${saldoDiferenca < 0 ? 'text-rose-700' : 'text-zinc-900'}`}>{formatBRL(saldoDiferenca)}</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block mb-1">A Receber Líq.</span>
                        <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">{formatBRL(totalAReceberLiquido)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {calcularFluxoCaixaConsolidado().length === 0 ? (
                <div className="p-12 text-center text-zinc-400 font-black uppercase">Nenhuma movimentação de caixa registrada até o momento.</div>
              ) : (
                calcularFluxoCaixaConsolidado().map((dia) => {
                  const expandido = diasExpandidosFluxo.includes(dia.dataIso);
                  const dataFormatada = dia.dataIso.split('-').reverse().join('/');
                  
                  return (
                    <div key={dia.dataIso} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                      <div onClick={() => toggleDiaFluxoExpandido(dia.dataIso)} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/60 transition-colors select-none">
                        <div className="flex items-center gap-3">
                          <div className="bg-zinc-900 text-white p-2.5 rounded-2xl text-center font-mono font-black min-w-[70px] text-xs">{dataFormatada}</div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Movimentos do Dia</p>
                            <span className="text-xs font-black text-zinc-500 uppercase flex items-center gap-1">
                              {dia.detalhesRepasses.length} Créditos | {dia.detalhesProvisoes.length} Débitos 
                              {expandido ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right w-full md:w-auto justify-end">
                          <div>
                            <span className="block text-[9px] font-black uppercase text-emerald-600">Crédito (+)</span>
                            <span className="font-mono font-bold text-xs text-emerald-600">+{formatBRL(dia.totalCredito)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black uppercase text-rose-600">Débito Líquido (-)</span>
                            <span className="font-mono font-bold text-xs text-rose-600">-{formatBRL(dia.totalDebitoLiquido)}</span>
                          </div>
                          <div className="border-l pl-4 min-w-[120px]">
                            <span className="block text-[9px] font-black uppercase text-zinc-400">Saldo Movimento</span>
                            <span className={`font-mono font-black text-sm ${dia.saldoDia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {dia.saldoDia >= 0 ? `+${formatBRL(dia.saldoDia)}` : formatBRL(dia.saldoDia)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {expandido && (
                        <div className="bg-zinc-50/50 border-t p-4 space-y-3 text-xs">
                          {dia.detalhesRepasses.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">Entradas de Crédito (Aportes/Repasses)</span>
                              {dia.detalhesRepasses.map((rep, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-emerald-100 font-medium">
                                  <span className="text-zinc-600 uppercase flex items-center gap-1.5"><ArrowRight size={12} className="text-emerald-500" /> {rep.obs}</span>
                                  <strong className="font-mono text-emerald-600">+{formatBRL(rep.valor)}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                          {dia.detalhesProvisoes.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 block">Saídas por Baixas/Liquidações (Comissões Corretor)</span>
                              {dia.detalhesProvisoes.map((prov, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-zinc-100">
                                  <span className="text-zinc-700 uppercase font-bold flex items-center gap-1.5"><ArrowRight size={12} className="text-zinc-300" /> {prov.cliente} (Parc. {prov.parcela})</span>
                                  <div className="text-right font-mono text-[11px]">
                                    <span className="text-zinc-400 block text-[10px]">Bruto original: {formatBRL(prov.bruto)}</span>
                                    <strong className="text-rose-600">-{formatBRL(prov.liquido)} {prov.desconto > 0 ? `(-${prov.desconto}%)` : ''}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RAIO-X REGRAS COMISSÃO */}
      {modalDetalhe && itemDetalhado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border p-6 rounded-[2rem] shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-start">
              <div><span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">Raio-X</span><h3 className="text-xs font-black uppercase mt-2">Origem da Comissão</h3></div>
              <button onClick={() => setModalDetalhe(false)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl text-xs space-y-1">
              <p><span className="text-zinc-400">Cliente:</span> <strong className="uppercase">{obterNomeCliente(itemDetalhado.tab_comissoes_regras?.tab_clientes)}</strong></p>
              <p><span className="text-zinc-400">Produto:</span> <span className="uppercase font-bold">{itemDetalhado.tab_comissoes_regras?.base_produtos?.nome || "—"}</span></p>
              <p><span className="text-zinc-400">Seguradora:</span> <span className="uppercase font-bold">{itemDetalhado.tab_comissoes_regras?.base_seguradoras?.nome || "—"}</span></p>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between items-center bg-blue-50 p-2.5 rounded-xl text-xs"><span className="font-bold text-blue-700">Direito Corretor Original ({parseToNumber(itemDetalhado.tab_comissoes_regras?.pct_corretor)}%)</span><span className="font-black text-blue-700 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_corretor))}</span></div>
              <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl text-xs"><span className="font-bold text-emerald-700">Líquido após Acerto de Caixa</span><span className="font-black text-emerald-700 font-mono">{formatBRL(itemDetalhado.valor_recebido_liquido !== null ? parseToNumber(itemDetalhado.valor_recebido_liquido) : parseToNumber(itemDetalhado.valor_direito_corretor))}</span></div>
            </div>
            <button onClick={() => setModalDetalhe(false)} className="w-full py-2.5 bg-zinc-900 text-white font-black text-[10px] uppercase rounded-xl">Fechar Diagnóstico</button>
          </div>
        </div>
      )}
    </div>
  );
};