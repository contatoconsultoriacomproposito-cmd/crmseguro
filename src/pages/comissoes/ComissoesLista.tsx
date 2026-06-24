import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Search, Calendar, ArrowDownCircle, CheckCircle, AlertTriangle, Check, Eye, Wallet, RefreshCcw, Landmark, ArrowUpRight, ArrowDownLeft, Equal, PlusCircle, Building2, XCircle, Ban, ChevronDown, ChevronUp, Printer, Activity } from 'lucide-react';

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

// Interface para o Relatório de Fluxo de Caixa
interface FluxoCaixaItem {
  id: string;
  data: string;
  tipo: 'REALIZADO' | 'PROJETADO';
  valor_bruto: number;
  descricao: string;
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
  const [vencimentoDe, setVencimentoDe] = useState(''); 
  const [vencimentoAte, setVencimentoAte] = useState('');
  const [baixaDe, setBaixaDe] = useState('');
  const [baixaAte, setBaixaAte] = useState('');
  
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'PREVISTO' | 'RECEBIDO' | 'CANCELADO'>('TODOS');
  
  const [provisoes, setProvisoes] = useState<ProvisaoItem[]>([]);
  const [repassesHistorico, setRepassesHistorico] = useState<RepasseItem[]>([]);
  
  const [selecionadasLote, setSelecionadasLote] = useState<string[]>([]);
  const [linhasExpandidas, setLinhasExpandidas] = useState<string[]>([]);

  // Modais
  const [modalAporte, setModalAporte] = useState<boolean>(false);
  const [valorAporte, setValorAporte] = useState<number>(0);
  const [dataAporte, setDataAporte] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacaoAporte, setObservacaoAporte] = useState<string>('');

  const [modalDetalhe, setModalDetalhe] = useState<boolean>(false);
  const [itemDetalhado, setItemDetalhado] = useState<ProvisaoItem | null>(null);

  // Modal Fluxo de Caixa Cronológico
  const [modalFluxo, setModalFluxo] = useState<boolean>(false);

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
    setVendaDe('');
    setVendaAte('');
    setVencimentoDe('');
    setVencimentoAte('');
    setBaixaDe('');
    setBaixaAte('');
    toast.success("Filtros de data limpos!");
  };

  const processarBaixaLote = async () => {
    if (selecionadasLote.length === 0) return;
    try {
      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'RECEBIDO', 
          data_recebimento: new Date().toISOString().split('T')[0],
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

  const executarBaixaIndividual = async (provisaoId: string) => {
    try {
      const { error } = await supabase
        .from('tab_financeiro_provisoes')
        .update({
          status_recebimento_seguradora: 'RECEBIDO',
          data_recebimento: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', provisaoId);

      if (error) throw error;
      toast.success("Parcela baixada com sucesso!");
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error("Erro na baixa.");
    }
  };

  const reverterBaixaParcela = async (provisao: ProvisaoItem) => {
    if (!window.confirm("Deseja estornar esta parcela? O status voltará para PREVISTO.")) return;
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

      if (error) throw error;

      toast.success("Provisões futuras canceladas com sucesso!");
      setModalDetalhe(false);
      setSelecionadasLote([]);
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
      setModalAporte(false);
      setValorAporte(0);
      setObservacaoAporte('');
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

  // AUDITORIA E CÁLCULOS MATEMÁTICOS DE NEGÓCIO (NOVA ESTRUTURA)
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

  // Cálculos de Repasses e Saldo (Substituindo a Lógica do "Caixa")
  const totalRepassadoCorretora = repassesHistorico.reduce((acc, curr) => acc + parseToNumber(curr.valor_informado_pago), 0);
  const saldoRealCorretor = totalRecebidoCorretor - totalRepassadoCorretora;

  // Filtro textual e Ordenação
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

  // Construção do Extrato Cronológico (Projetado vs Realizado)
  const gerarLinhaDoTempo = (): FluxoCaixaItem[] => {
    const eventos: FluxoCaixaItem[] = [];
    
    provisoesFiltradasEOrdenadas.forEach(p => {
      if (p.status_recebimento_seguradora === 'RECEBIDO' && p.data_recebimento) {
        eventos.push({
          id: p.id,
          data: p.data_recebimento,
          tipo: 'REALIZADO',
          valor_bruto: parseToNumber(p.valor_direito_corretor),
          descricao: `Liquidação: ${obterNomeCliente(p.tab_comissoes_regras?.tab_clientes)} (Parc. ${p.numero_parcela})`
        });
      } else if (p.status_recebimento_seguradora === 'PREVISTO' && p.data_vencimento_previsto) {
        eventos.push({
          id: p.id,
          data: p.data_vencimento_previsto,
          tipo: 'PROJETADO',
          valor_bruto: parseToNumber(p.valor_direito_corretor),
          descricao: `Previsão: ${obterNomeCliente(p.tab_comissoes_regras?.tab_clientes)} (Parc. ${p.numero_parcela})`
        });
      }
    });

    return eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  };

  const toggleLinhaExpandida = (id: string) => {
    setLinhasExpandidas(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const alternarTodasAsLinhas = () => {
    if (linhasExpandidas.length === provisoesFiltradasEOrdenadas.length) setLinhasExpandidas([]);
    else setLinhasExpandidas(provisoesFiltradasEOrdenadas.map(p => p.id));
  };

  const gerenciarImpressaoLayout = () => {
    const janelaImpressao = window.open('', '_blank', 'width=1200,height=800');
    if (!janelaImpressao) {
      toast.error("Permita pop-ups para gerar o relatório.");
      return;
    }

    const linhasHtml = provisoesFiltradasEOrdenadas.map(p => {
      const statusLower = p.status_recebimento_seguradora?.toLowerCase() || 'previsto';
      const dataVenc = p.data_vencimento_previsto ? p.data_vencimento_previsto.split('-').reverse().join('/') : '—';
      const dataRec = p.data_recebimento ? p.data_recebimento.split('-').reverse().join('/') : '—';
      const dataVenda = p.tab_comissoes_regras?.data_venda ? p.tab_comissoes_regras.data_venda.split('-').reverse().join('/') : '—';
      const clienteNome = obterNomeCliente(p.tab_comissoes_regras?.tab_clientes);

      return `
        <tbody style="page-break-inside: avoid !important; break-inside: avoid !important;">
          <tr style="background-color: ${p.status_recebimento_seguradora === 'CANCELADO' ? '#f8fafc' : '#ffffff'}; color: ${p.status_recebimento_seguradora === 'CANCELADO' ? '#94a3b8' : '#334155'}; text-decoration: ${p.status_recebimento_seguradora === 'CANCELADO' ? 'line-through' : 'none'};">
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${clienteNome.toUpperCase()}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">${p.tab_comissoes_regras?.base_produtos?.nome || '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">${p.tab_comissoes_regras?.base_seguradoras?.nome || '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${p.tab_comissoes_regras?.tab_proposta_itens?.numero_apolice || '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.numero_parcela}/${p.tab_comissoes_regras?.quantidade_parcelas || 1}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold; color: #1d4ed8;">${formatBRL(parseToNumber(p.valor_direito_corretor))}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${dataVenc}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; color: #15803d; font-weight: bold;">${dataRec}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
              <span style="font-size: 7.5pt; font-weight: 800; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; background-color: ${statusLower === 'recebido' ? '#dcfce7' : statusLower === 'previsto' ? '#dbeafe' : '#fee2e2'}; color: ${statusLower === 'recebido' ? '#15803d' : statusLower === 'previsto' ? '#1d4ed8' : '#b91c1c'};">${p.status_recebimento_seguradora}</span>
            </td>
          </tr>
          <tr>
            <td colspan="9" style="padding: 0; border-bottom: 2px solid #cbd5e1; background-color: #f8fafc;">
              <div style="padding: 10px 14px; border-left: 4px solid #3b82f6; display: flex; justify-between: space-between; gap: 15px;">
                <div style="flex: 1; font-size: 8pt; color: #475569;">
                  <div style="font-size: 7pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Dados de Venda</div>
                  Data Venda: <strong style="font-family: monospace;">${dataVenda}</strong><br>
                  Contrato ID: <span style="font-family: monospace; font-size: 7.5pt;">...${p.tab_comissoes_regras?.id ? p.tab_comissoes_regras.id.slice(-8).toUpperCase() : '—'}</span>
                </div>
                <div style="flex: 1; font-size: 8pt; color: #475569;">
                  <div style="font-size: 7pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Valores de Origem</div>
                  Base Cálculo: <strong style="font-family: monospace;">${formatBRL(parseToNumber(p.tab_comissoes_regras?.base_calculo_valor))}</strong><br>
                  Com. Bruta: <span style="font-family: monospace;">${formatBRL(parseToNumber(p.valor_comissao_total))}</span>
                </div>
                <div style="flex: 1; font-size: 8pt; color: #475569;">
                  <div style="font-size: 7pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Split Corretor</div>
                  Percentual: <strong style="font-family: monospace;">${parseToNumber(p.tab_comissoes_regras?.pct_corretor)}%</strong><br>
                  Líquido Corr.: <strong style="font-family: monospace; color: #1d4ed8;">${formatBRL(parseToNumber(p.valor_direito_corretor))}</strong>
                </div>
                <div style="flex: 1; font-size: 8pt; color: #475569;">
                  <div style="font-size: 7pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Divisão Institucional</div>
                  Retido Mãe: <span style="font-family: monospace; font-weight: bold; color: #6b21a8;">${formatBRL(parseToNumber(p.valor_direito_corretora_mae))}</span><br>
                  Split Parceiro: <span style="font-family: monospace;">${formatBRL(parseToNumber(p.valor_direito_parceiro))} (${parseToNumber(p.tab_comissoes_regras?.pct_parceiro)}%)</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      `;
    }).join('');

    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Comissões e Auditoria</title>
        <style>
          @page { size: A4 landscape; margin: 15mm 12mm 20mm 12mm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font-family: Arial, sans-serif; font-size: 8pt; color: #71717a; } @bottom-left { content: "Relatório Financeiro Corporativo • Confidencial"; font-family: Arial, sans-serif; font-size: 8pt; font-weight: bold; color: #a1a1aa; } }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #18181b; }
          .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { font-size: 18pt; margin: 0; text-transform: uppercase; color: #0f172a; }
          .header p { font-size: 9pt; color: #64748b; margin: 4px 0 0 0; }
          .meta { text-align: right; font-size: 9pt; color: #334155; line-height: 1.4; }
          .metrics { display: flex; gap: 10px; margin-bottom: 20px; }
          .card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; }
          .card .label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #64748b; }
          .card .val { font-size: 14pt; font-weight: bold; font-family: monospace; color: #0f172a; margin-top: 4px; }
          .cash-flow { background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 10px 14px; margin-bottom: 20px; font-size: 9pt; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #0f172a; color: white; font-size: 8pt; text-transform: uppercase; padding: 8px 10px; border: 1px solid #0f172a; }
          td { font-size: 8.5pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Demonstrativo Unificado de Comissões</h1>
            <p>Módulo de Auditoria e Repasses</p>
          </div>
          <div class="meta">
            Data de Emissão: <strong>${new Date().toLocaleDateString('pt-BR')}</strong><br>
            Filtro Competência Vencimento: <strong>${vencimentoDe ? vencimentoDe.split('-').reverse().join('/') : '*'} até ${vencimentoAte ? vencimentoAte.split('-').reverse().join('/') : '*'}</strong>
          </div>
        </div>

        <div class="metrics">
          <div class="card"><div class="label" style="color: #6b21a8;">Comissão Gerada (Mãe)</div><div class="val">${formatBRL(totalGeradoMae)}</div></div>
          <div class="card"><div class="label" style="color: #1d4ed8;">Comissão Provisionada</div><div class="val">${formatBRL(totalProvisionadoCorretor)}</div></div>
          <div class="card"><div class="label" style="color: #047857;">Comissão Baixada (Tela)</div><div class="val">${formatBRL(totalRecebidoCorretor)}</div></div>
          <div class="card"><div class="label" style="color: #b45309;">Previsto (A Receber)</div><div class="val">${formatBRL(totalAReceberCorretor)}</div></div>
        </div>

        <div class="cash-flow">
          <div>Total de Repasses Enviados ao Corretor: <strong>${formatBRL(totalRepassadoCorretora)}</strong></div>
          <div>Saldo Pendente de Acerto (Baixadas - Repassado): <strong style="color: ${saldoRealCorretor < 0 ? '#e11d48' : '#059669'};">${saldoRealCorretor >= 0 ? formatBRL(saldoRealCorretor) : `-${formatBRL(Math.abs(saldoRealCorretor))}`}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left; width: 22%;">Cliente</th>
              <th style="text-align: left; width: 15%;">Produto</th>
              <th style="text-align: left; width: 15%;">Seguradora</th>
              <th style="text-align: center; width: 10%;">Apólice</th>
              <th style="text-align: center; width: 8%;">Parcela</th>
              <th style="text-align: right; width: 10%;">Split Corretor</th>
              <th style="text-align: center; width: 10%;">Vencimento</th>
              <th style="text-align: center; width: 10%;">Data Rec.</th>
              <th style="text-align: center; width: 10%;">Status</th>
            </tr>
          </thead>
          ${linhasHtml}
        </table>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  return (
    <div className="p-6 space-y-6 text-left bg-zinc-50/50 dark:bg-zinc-950 min-h-screen relative print:p-0 print:bg-white">
      
      {/* BOTÕES SUPERIORES */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-2">
          <button onClick={() => setModalAporte(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-blue-500 transition-all">
            <PlusCircle size={16} /> Registrar Repasse
          </button>
          <button onClick={() => setModalFluxo(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-indigo-500 transition-all">
            <Activity size={16} /> Ver Fluxo de Caixa
          </button>
          <button onClick={alternarTodasAsLinhas} className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-zinc-700 transition-all">
            <Eye size={16} /> {linhasExpandidas.length === provisoesFiltradasEOrdenadas.length ? 'Recolher Todos os Detalhes' : 'Expandir Todos os Detalhes'}
          </button>
        </div>

        <button onClick={gerenciarImpressaoLayout} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-emerald-500 transition-all">
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      {/* BARRA FLUTUANTE DE LOTE */}
      {selecionadasLote.length > 0 && (
        <div className="bg-zinc-900 text-white p-4 rounded-[2rem] flex items-center justify-between shadow-lg dark:bg-zinc-800 print:hidden">
          <div className="flex items-center gap-4 pl-2">
            <Wallet size={20} className="text-blue-500" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Liquidação de Parcelas (Status RECEBIDO)</p>
              <p className="text-xs font-bold">
                <span className="bg-zinc-800 px-2 py-0.5 rounded font-mono text-blue-400">{selecionadasLote.length}</span> selecionadas | Bruto da Baixa: <span className="font-black text-white">{formatBRL(somaLoteAtual)}</span>
              </p>
            </div>
          </div>
          <button onClick={processarBaixaLote} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-blue-500 transition-all">
            Confirmar Baixa das {selecionadasLote.length} Parcelas
          </button>
        </div>
      )}

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm print:p-3 print:rounded-xl">
          <div><span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">Comissão Gerada (Mãe)</span><h2 className="text-xl font-black text-zinc-950 dark:text-white mt-2 tracking-tight print:text-sm">{formatBRL(totalGeradoMae)}</h2></div>
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 rounded-full text-purple-600 print:hidden"><Building2 size={20}/></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm print:p-3 print:rounded-xl">
          <div><span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">Comissão Total Bruta</span><h2 className="text-xl font-black text-zinc-950 dark:text-white mt-2 tracking-tight print:text-sm">{formatBRL(totalProvisionadoCorretor)}</h2></div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-full text-blue-600 print:hidden"><ArrowDownCircle size={20}/></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm print:p-3 print:rounded-xl">
          <div><span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">Baixado (Realizado)</span><h2 className="text-xl font-black text-emerald-600 mt-2 tracking-tight print:text-sm">{formatBRL(totalRecebidoCorretor)}</h2></div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600 print:hidden"><CheckCircle size={20}/></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm print:p-3 print:rounded-xl">
          <div><span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">A Receber (Previsto)</span><h2 className="text-xl font-black text-amber-600 mt-2 tracking-tight print:text-sm">{formatBRL(totalAReceberCorretor)}</h2></div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-full text-amber-600 print:hidden"><AlertTriangle size={20}/></div>
        </div>
      </div>

      {/* NOVO: STATUS FINANCEIRO CONSOLIDADO (CONCILIAÇÃO) */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4 print:p-3 print:rounded-xl">
        <div className="flex items-center gap-2 text-zinc-800 dark:text-white">
          <Landmark size={18} className="text-blue-600 print:hidden" />
          <h3 className="text-xs font-black uppercase tracking-tight">Conciliação de Repasses (Corretora ➔ Corretor)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between print:p-2 print:rounded-lg">
            <div><span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Total de Comissões Baixadas (A)</span><span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 print:text-xs">{formatBRL(totalRecebidoCorretor)}</span></div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg print:hidden"><ArrowDownLeft size={16} /></div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between print:p-2 print:rounded-lg">
            <div><span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Total Já Repassado / Pago (B)</span><span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 print:text-xs">{formatBRL(totalRepassadoCorretora)}</span></div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg print:hidden"><ArrowUpRight size={16} /></div>
          </div>
          <div className={`p-4 rounded-2xl border flex items-center justify-between print:p-2 print:rounded-lg ${saldoRealCorretor < 0 ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20'}`}>
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">Saldo a Acertar (A - B)</span>
              <span className={`text-base font-black font-mono ${saldoRealCorretor < 0 ? 'text-rose-600' : 'text-emerald-600'} print:text-xs`}>
                {saldoRealCorretor >= 0 ? formatBRL(saldoRealCorretor) : `-${formatBRL(Math.abs(saldoRealCorretor))}`}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${saldoRealCorretor < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'} print:hidden`}><Equal size={16} /></div>
          </div>
        </div>
      </div>

      {/* BLOCO DE FILTROS */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-3.5 text-zinc-400" size={18} />
            <input type="text" placeholder="BUSCAR CLIENTE, PRODUTO, SEGURADORA..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-tight outline-none" />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button onClick={limparFiltrosData} className="flex items-center gap-1 text-zinc-400 hover:text-rose-600 transition-colors text-[11px] font-black uppercase tracking-tight bg-zinc-50 dark:bg-zinc-950 border px-3 py-2 rounded-xl"><XCircle size={14} /> Limpar Datas</button>
            <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1">
              {(['TODOS', 'PREVISTO', 'RECEBIDO', 'CANCELADO'] as const).map((t) => (
                <button key={t} onClick={() => setStatusFiltro(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFiltro === t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-zinc-400"><Calendar size={13} /><span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Data da Venda</span></div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={vendaDe} onChange={(e) => setVendaDe(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={vendaAte} onChange={(e) => setVendaAte(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-blue-600"><Calendar size={13} /><span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Data Vencimento</span></div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={vencimentoDe} onChange={(e) => setVencimentoDe(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer text-zinc-800 dark:text-zinc-200" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={vencimentoAte} onChange={(e) => setVencimentoAte(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer text-zinc-800 dark:text-zinc-200" />
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600"><Calendar size={13} /><span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Data da Baixa (Recebimento)</span></div>
            <div className="flex items-center text-[11px] font-bold gap-1">
              <input type="date" value={baixaDe} onChange={(e) => setBaixaDe(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
              <span className="text-zinc-400 text-[10px]">ATÉ</span>
              <input type="date" value={baixaAte} onChange={(e) => setBaixaAte(e.target.value)} className="bg-transparent outline-none w-full cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* GRADE DE LANÇAMENTOS */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 print:text-[10px]">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-200">
              <tr>
                <th className="p-4 text-center w-10 print:hidden">Select</th>
                <th className="p-4">Cliente (Ordem A-Z)</th>
                <th className="p-4">Produto</th>
                <th className="p-4">Seguradora</th>
                <th className="p-4 text-center">Apólice</th>
                <th className="p-4 text-center">Parcela</th>
                <th className="p-4 text-right text-blue-600">Split Corretor</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center text-emerald-600">Data Rec.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
            {loading ? (<tr><td colSpan={11} className="p-8 text-center uppercase tracking-wider font-black text-zinc-400 animate-pulse">Buscando lançamentos...</td></tr>) : provisoesFiltradasEOrdenadas.length === 0 ? (<tr><td colSpan={11} className="p-8 text-center uppercase tracking-wider font-black text-zinc-400">Nenhuma provisão encontrada.</td></tr>) : (
              provisoesFiltradasEOrdenadas.map((p: ProvisaoItem) => {
                const estaExpandida = linhasExpandidas.includes(p.id);
                return (
                  <Fragment key={p.id}>
                    <tr className={`${selecionadasLote.includes(p.id) ? 'bg-blue-50/50' : 'hover:bg-zinc-50/80'} ${p.status_recebimento_seguradora === 'CANCELADO' ? 'opacity-50 bg-zinc-100/40 dark:bg-zinc-950/10 line-through text-zinc-400' : ''} print:bg-transparent`}>
                      <td className="p-4 text-center print:hidden">
                        <input type="checkbox" checked={selecionadasLote.includes(p.id)} disabled={p.status_recebimento_seguradora === 'RECEBIDO' || p.status_recebimento_seguradora === 'CANCELADO'} onChange={() => setSelecionadasLote(prev => prev.includes(p.id) ? prev.filter(item => item !== p.id) : [...prev, p.id])} className="w-4 h-4 rounded cursor-pointer disabled:opacity-30" />
                      </td>
                      <td className="p-4 font-black text-zinc-900 dark:text-white uppercase">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleLinhaExpandida(p.id)} className="text-zinc-400 hover:text-zinc-600 print:hidden">{estaExpandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                          {obterNomeCliente(p.tab_comissoes_regras?.tab_clientes)}
                        </div>
                      </td>
                      <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_produtos?.nome || '—'}</td>
                      <td className="p-4 uppercase">{p.tab_comissoes_regras?.base_seguradoras?.nome || '—'}</td>
                      <td className="p-4 text-center text-zinc-400 font-mono">📄 {p.tab_comissoes_regras?.tab_proposta_itens?.numero_apolice || '—'}</td>
                      <td className="p-4 text-center font-black text-zinc-500 bg-zinc-50/40 print:bg-transparent">{p.numero_parcela} de {p.tab_comissoes_regras?.quantidade_parcelas || 1}</td>
                      <td className="p-4 text-right font-black text-blue-600">{formatBRL(parseToNumber(p.valor_direito_corretor))}</td>
                      <td className="p-4 text-center text-zinc-800 dark:text-zinc-200">{p.data_vencimento_previsto.split('-').reverse().join('/')}</td>
                      <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30 print:bg-transparent">{p.data_recebimento ? p.data_recebimento.split('-').reverse().join('/') : '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${p.status_recebimento_seguradora === 'RECEBIDO' ? 'bg-emerald-100 text-emerald-700' : p.status_recebimento_seguradora === 'CANCELADO' ? 'bg-rose-100 text-rose-700 font-extrabold line-none' : 'bg-amber-100 text-amber-700'}`}>{p.status_recebimento_seguradora}</span>
                      </td>
                      <td className="p-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-2">
                          {p.status_recebimento_seguradora === 'RECEBIDO' ? (
                            <button onClick={() => reverterBaixaParcela(p)} title="Estornar parcela" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"><RefreshCcw size={15} /></button>
                          ) : p.status_recebimento_seguradora === 'PREVISTO' ? (
                            <>
                              <button onClick={() => executarBaixaIndividual(p.id)} title="Baixar Parcela" className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100"><Check size={16} /></button>
                              <button onClick={() => cancelarProvisoesFuturasContrato(p.tab_comissoes_regras?.id || '', obterNomeCliente(p.tab_comissoes_regras?.tab_clientes))} title="Cancelar Contrato (Cessar parcelas futuras)" className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100"><Ban size={15} /></button>
                            </>
                          ) : (<span className="text-[10px] text-zinc-400 font-mono">N/A</span>)}
                          <button onClick={() => { setItemDetalhado(p); setModalDetalhe(true); }} title="Visualizar Regra de Comissão Completa" className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 rounded-lg transition-colors"><Eye size={15} /></button>
                        </div>
                      </td>
                    </tr>
                    {estaExpandida && (
                      <tr className="bg-zinc-100/50 dark:bg-zinc-900/40 print:bg-zinc-50">
                        <td colSpan={11} className="p-4 border-l-4 border-blue-500 print:col-span-9 print:p-2.5">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left text-zinc-700 dark:text-zinc-300 print:grid-cols-4 print:gap-2">
                            <div className="text-[11px] space-y-1"><span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">Dados de Venda</span><p><span className="text-zinc-400">Data Venda:</span> <strong className="font-mono">{p.tab_comissoes_regras?.data_venda ? p.tab_comissoes_regras.data_venda.split('-').reverse().join('/') : '—'}</strong></p><p><span className="text-zinc-400">Contrato ID:</span> <span className="font-mono text-[10px]">{p.tab_comissoes_regras?.id ? `...${p.tab_comissoes_regras.id.slice(-8).toUpperCase()}` : '—'}</span></p></div>
                            <div className="text-[11px] space-y-1"><span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">Valores de Origem</span><p><span className="text-zinc-400">Base Cálculo:</span> <strong className="font-mono text-zinc-900 dark:text-white">{formatBRL(parseToNumber(p.tab_comissoes_regras?.base_calculo_valor))}</strong></p><p><span className="text-zinc-400">Comissão Total:</span> <span className="font-mono">{formatBRL(parseToNumber(p.valor_comissao_total))}</span></p></div>
                            <div className="text-[11px] space-y-1 bg-blue-50/40 dark:bg-blue-950/10 p-2 rounded-xl border border-blue-100/50 print:p-1 print:rounded-none print:border-none print:bg-transparent"><span className="text-[9px] font-black uppercase text-blue-600 tracking-wider block">Split Corretor</span><p><span className="text-zinc-400">Percentual:</span> <strong className="font-mono text-blue-600">{parseToNumber(p.tab_comissoes_regras?.pct_corretor)}%</strong></p><p><span className="text-zinc-400">Líquido Corretor:</span> <strong className="font-mono text-blue-600">{formatBRL(parseToNumber(p.valor_direito_corretor))}</strong></p></div>
                            <div className="text-[11px] space-y-1"><span className="text-[9px] font-black uppercase text-purple-600 tracking-wider block">Divisão Institucional</span><p><span className="text-zinc-400">Retido Mãe:</span> <span className="font-mono font-bold text-purple-600">{formatBRL(parseToNumber(p.valor_direito_corretora_mae))}</span></p>{parseToNumber(p.valor_direito_parceiro) > 0 && (<p><span className="text-zinc-400">Split Parceiro ({parseToNumber(p.tab_comissoes_regras?.pct_parceiro)}%):</span> <span className="font-mono font-bold">{formatBRL(parseToNumber(p.valor_direito_parceiro))}</span></p>)}</div>
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

      {/* MODAL 1: REGISTRAR REPASSE (ANTIGO APORTE) */}
      {modalAporte && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4">
            <div><span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Gestão Financeira</span><h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2">Registrar Repasse para o Corretor</h3></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Valor do Repasse (R$)</label><input type="number" step="0.01" value={valorAporte} onChange={(e) => setValorAporte(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-xs font-bold outline-none border" placeholder="0,00"/></div>
              <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Data</label><input type="date" value={dataAporte} onChange={(e) => setDataAporte(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-xs font-bold border"/></div>
            </div>
            <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Identificação / Observação</label><textarea rows={2} placeholder="EX: REPASSE MENSAL" value={observacaoAporte} onChange={(e) => setObservacaoAporte(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-[11px] font-bold outline-none border uppercase"/></div>
            <div className="flex gap-2">
              <button onClick={() => setModalAporte(false)} className="flex-1 py-2.5 border rounded-xl text-[10px] font-black uppercase text-zinc-400">Cancelar</button>
              <button onClick={lancarAporteRepasse} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Registrar Pagamento</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FLUXO DE CAIXA CRONOLÓGICO */}
      {modalFluxo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col h-[85vh]">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">Análise Temporal</span>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2">Fluxo de Caixa e Previsões</h3>
                <p className="text-xs text-zinc-500 mt-1">Linha do tempo baseada nas datas de Vencimento e Recebimento.</p>
              </div>
              <button onClick={() => setModalFluxo(false)} className="text-zinc-400 hover:text-zinc-600 font-bold text-sm bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50">
              <div className="space-y-3">
                {gerarLinhaDoTempo().map((evento, index) => (
                  <div key={`${evento.id}-${index}`} className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col items-center justify-center w-20 border-r border-zinc-100 dark:border-zinc-800 pr-4">
                      <span className="text-[10px] uppercase font-black text-zinc-400">{evento.data.split('-')[1]}/{evento.data.split('-')[0]}</span>
                      <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{evento.data.split('-')[2]}</span>
                    </div>
                    <div className="flex-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${evento.tipo === 'REALIZADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {evento.tipo}
                      </span>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1 uppercase">{evento.descricao}</p>
                    </div>
                    <div className="text-right pl-4">
                      <span className="block text-[10px] font-black uppercase text-zinc-400 mb-0.5">Valor Original</span>
                      <span className={`text-base font-mono font-black ${evento.tipo === 'REALIZADO' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {formatBRL(evento.valor_bruto)}
                      </span>
                    </div>
                  </div>
                ))}
                {gerarLinhaDoTempo().length === 0 && (
                  <div className="text-center p-10 text-zinc-400 text-xs font-bold uppercase tracking-wider">Nenhum evento financeiro no período filtrado.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RAIO-X DA COMISSÃO (MANTIDO DA ESTRUTURA ORIGINAL) */}
      {modalDetalhe && itemDetalhado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-2xl max-w-lg w-full space-y-4 text-left">
            <div className="flex justify-between items-start">
              <div><span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">Raio-X do Lançamento</span><h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2">Origem da Regra de Comissão</h3></div>
              <button onClick={() => setModalDetalhe(false)} className="text-zinc-400 hover:text-zinc-600 font-bold text-sm transition-colors focus:outline-none">✕</button>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl space-y-2 text-xs border border-zinc-100 dark:border-zinc-800/50">
              <p><span className="text-zinc-400 font-normal">Cliente:</span> <strong className="text-zinc-900 dark:text-white uppercase">{obterNomeCliente(itemDetalhado.tab_comissoes_regras?.tab_clientes)}</strong></p>
              <p><span className="text-zinc-400 font-normal">Produto:</span> <span className="uppercase font-bold text-zinc-800 dark:text-zinc-200">{itemDetalhado.tab_comissoes_regras?.base_produtos?.nome || "—"}</span></p>
              <p><span className="text-zinc-400 font-normal">Seguradora:</span> <span className="uppercase font-bold text-zinc-800 dark:text-zinc-200">{itemDetalhado.tab_comissoes_regras?.base_seguradoras?.nome || "—"}</span></p>
              <p><span className="text-zinc-400 font-normal">Data da Venda:</span> <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{itemDetalhado.tab_comissoes_regras?.data_venda ? itemDetalhado.tab_comissoes_regras.data_venda.split("-").reverse().join("/") : "—"}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/30"><span className="text-[9px] uppercase font-black text-zinc-400 block mb-1">Base de Cálculo</span><span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatBRL(parseToNumber(itemDetalhado.tab_comissoes_regras?.base_calculo_valor))}</span></div>
              <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/30"><span className="text-[9px] uppercase font-black text-zinc-400 block mb-1">Comissão Total Bruta</span><span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_comissao_total))}</span></div>
            </div>
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Divisão dos Splits (Acordo)</span>
              <div className="flex justify-between items-center bg-blue-50/40 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100/50 dark:border-blue-900/30 text-xs"><span className="font-bold text-blue-700 dark:text-blue-400">Direito do Corretor ({parseToNumber(itemDetalhado.tab_comissoes_regras?.pct_corretor)}%)</span><span className="font-black text-blue-700 dark:text-blue-400 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_corretor))}</span></div>
              <div className="flex justify-between items-center bg-purple-50/40 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100/50 dark:border-purple-900/30 text-xs"><span className="font-bold text-purple-700 dark:text-purple-400">Retido pela Corretora Mãe</span><span className="font-black text-purple-700 dark:text-purple-400 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_corretora_mae))}</span></div>
              {parseToNumber(itemDetalhado.valor_direito_parceiro) > 0 && (
                <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/60 p-2.5 rounded-xl text-xs border border-transparent dark:border-zinc-700/50"><span className="font-bold text-zinc-600 dark:text-zinc-400">Split Parceiro ({parseToNumber(itemDetalhado.tab_comissoes_regras?.pct_parceiro)}%)</span><span className="font-black text-zinc-600 dark:text-zinc-300 font-mono">{formatBRL(parseToNumber(itemDetalhado.valor_direito_parceiro))}</span></div>
              )}
            </div>
            {itemDetalhado.status_recebimento_seguradora !== "CANCELADO" && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => cancelarProvisoesFuturasContrato(itemDetalhado.tab_comissoes_regras?.id || "", obterNomeCliente(itemDetalhado.tab_comissoes_regras?.tab_clientes))} className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 font-black text-[10px] uppercase rounded-xl tracking-wider shadow-sm hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"><Ban size={14} /> Cancelar Contrato (Parar Provisões Futuras)</button>
              </div>
            )}
            <button onClick={() => setModalDetalhe(false)} className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-black text-[10px] uppercase rounded-xl tracking-wider shadow-sm transition-colors">Fechar Diagnóstico</button>
          </div>
        </div>
      )}
    </div>
  );
};