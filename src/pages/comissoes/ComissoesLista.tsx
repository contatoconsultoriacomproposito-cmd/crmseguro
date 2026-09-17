import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Search,
  Calendar,
  ArrowDownCircle,
  CheckCircle,
  Check,
  Eye,
  Wallet,
  RefreshCcw,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Equal,
  PlusCircle,
  Building2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Activity,
  Percent,
  ArrowRight
} from 'lucide-react';

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
    tipo_recorrencia: string;
    quantidade_parcelas: number;
    dia_vencimento_parcelas: number;
    base_calculo_valor: number | string;
    pct_comissao_venda: number | string;
    pct_corretor: number | string;
    pct_parceiro: number | string;
    meta_faixas_json: any;
    descontar_iof: boolean | null;
    valor_iof: number | string | null;
    descontos_comissao_json: any;
    descontos_corretor_json: any;
    tab_clientes: {
      nome_razao_social: string | null;
      nome_fantasia: string | null;
      tipo_cliente: string | null;
    } | null;
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

interface MovimentacaoDia {
  dataIso: string;
  totalCredito: number;
  totalDebitoBruto: number;
  totalDebitoLiquido: number;
  saldoDia: number;
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

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

const normalizarData = (data: string | null | undefined) =>
  data ? data.substring(0, 10) : '';

export const ComissoesLista = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [busca, setBusca] = useState('');

  const [vendaDe, setVendaDe] = useState('');
  const [vendaAte, setVendaAte] = useState('');
  const [vencimentoDe, setVencimentoDe] = useState('');
  const [vencimentoAte, setVencimentoAte] = useState('');
  const [baixaDe, setBaixaDe] = useState('');
  const [baixaAte, setBaixaAte] = useState('');

  const [statusFiltro, setStatusFiltro] = useState<
    'TODOS' | 'PREVISTO' | 'RECEBIDO' | 'CANCELADO'
  >('TODOS');

  const [provisoes, setProvisoes] = useState<ProvisaoItem[]>([]);
  const [repassesHistorico, setRepassesHistorico] = useState<RepasseItem[]>([]);

  const [selecionadasLote, setSelecionadasLote] = useState<string[]>([]);
  const [linhasExpandidas, setLinhasExpandidas] = useState<string[]>([]);
  const [diasExpandidosFluxo, setDiasExpandidosFluxo] = useState<string[]>([]);

  const [modalAporte, setModalAporte] = useState(false);
  const [valorAporte, setValorAporte] = useState(0);
  const [dataAporte, setDataAporte] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [observacaoAporte, setObservacaoAporte] = useState('');

  const [modalDetalhe, setModalDetalhe] = useState(false);
  const [itemDetalhado, setItemDetalhado] = useState<ProvisaoItem | null>(null);
  const [modalFluxo, setModalFluxo] = useState(false);

  const [modalBaixaParametros, setModalBaixaParametros] = useState<{
    visivel: boolean;
    ids: string[];
    valorBrutoTotal: number;
  }>({
    visivel: false,
    ids: [],
    valorBrutoTotal: 0
  });

  const [pctDescontoInput, setPctDescontoInput] = useState(0);

  useEffect(() => {
    carregarDadosIniciais();
  }, [
    vendaDe,
    vendaAte,
    vencimentoDe,
    vencimentoAte,
    baixaDe,
    baixaAte,
    statusFiltro
  ]);

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

      const userUuid =
        sessionData?.session?.user?.id ||
        '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('tab_financeiro_repasses')
        .select('*')
        .eq('corretor_id', userUuid)
        .order('data_pagamento', { ascending: false });

      if (error) throw error;

      setRepassesHistorico((data as RepasseItem[]) || []);
    } catch (err) {
      console.error('Erro ao carregar repasses:', err);
    }
  };

  const carregarProvisoesReal = async () => {
    try {
      const { data, error } = await supabase
        .from('tab_financeiro_provisoes')
        .select(`
          id,
          regra_comissao_id,
          numero_parcela,
          data_vencimento_previsto,
          data_recebimento,
          valor_base_parcela,
          valor_comissao_total,
          valor_direito_corretor,
          valor_direito_parceiro,
          valor_direito_corretora_mae,
          status_recebimento_seguradora,
          status_repasse_corretor,
          repasse_id,
          valor_recebido_liquido,
          pct_desconto_baixa,
          tab_comissoes_regras!tab_financeiro_provisoes_regra_fkey (
            id,
            proposta_id,
            item_id,
            data_venda,
            tipo_recorrencia,
            quantidade_parcelas,
            dia_vencimento_parcelas,
            base_calculo_valor,
            pct_comissao_venda,
            pct_corretor,
            pct_parceiro,
            meta_faixas_json,
            descontar_iof,
            valor_iof,
            descontos_comissao_json,
            descontos_corretor_json,
            tab_clientes!tab_comissoes_regras_cliente_id_fkey (
              nome_razao_social,
              nome_fantasia,
              tipo_cliente
            ),
            base_produtos!tab_comissoes_regras_produto_id_fkey (
              nome
            ),
            base_seguradoras!tab_comissoes_regras_seguradora_id_fkey (
              nome
            ),
            tab_proposta_itens!tab_comissoes_regras_item_id_fkey (
              numero_apolice
            )
          )
        `);

      if (error) throw error;

      setProvisoes((data as unknown as ProvisaoItem[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar provisões.');
    }
  };

  const limparFiltrosData = () => {
    setVendaDe('');
    setVendaAte('');
    setVencimentoDe('');
    setVencimentoAte('');
    setBaixaDe('');
    setBaixaAte('');
    toast.success('Filtros de data limpos!');
  };

  const obterNomeCliente = (cliente: any) => {
    if (!cliente) return '—';

    return (
      cliente.nome_razao_social ||
      cliente.nome_fantasia ||
      cliente.razao_social ||
      cliente.nome ||
      '—'
    );
  };

  const provisaoAtendeFiltros = (p: ProvisaoItem) => {
    const regra = p.tab_comissoes_regras;

    if (
      statusFiltro !== 'TODOS' &&
      p.status_recebimento_seguradora !== statusFiltro
    ) {
      return false;
    }

    const dataVenda = normalizarData(regra?.data_venda);
    const dataVencimento = normalizarData(p.data_vencimento_previsto);
    const dataBaixa = normalizarData(p.data_recebimento);

    if (vendaDe && (!dataVenda || dataVenda < vendaDe)) return false;
    if (vendaAte && (!dataVenda || dataVenda > vendaAte)) return false;

    if (
      vencimentoDe &&
      (!dataVencimento || dataVencimento < vencimentoDe)
    ) {
      return false;
    }

    if (
      vencimentoAte &&
      (!dataVencimento || dataVencimento > vencimentoAte)
    ) {
      return false;
    }

    if (baixaDe && (!dataBaixa || dataBaixa < baixaDe)) return false;
    if (baixaAte && (!dataBaixa || dataBaixa > baixaAte)) return false;

    return true;
  };

  const provisoesFiltradas = provisoes.filter(provisaoAtendeFiltros);

  const provisoesFiltradasEOrdenadas = provisoesFiltradas
    .filter((p) => {
      const regra = p.tab_comissoes_regras;

      if (!regra) return false;

      const termoBusca = busca.toLowerCase().trim();

      if (!termoBusca) return true;

      return (
        obterNomeCliente(regra.tab_clientes)
          .toLowerCase()
          .includes(termoBusca) ||
        (regra.base_produtos?.nome?.toLowerCase() || '').includes(termoBusca) ||
        (regra.base_seguradoras?.nome?.toLowerCase() || '').includes(
          termoBusca
        ) ||
        (regra.tab_proposta_itens?.numero_apolice?.toLowerCase() || '').includes(
          termoBusca
        )
      );
    })
    .sort((a, b) =>
      obterNomeCliente(a.tab_comissoes_regras?.tab_clientes)
        .toLowerCase()
        .localeCompare(
          obterNomeCliente(b.tab_comissoes_regras?.tab_clientes).toLowerCase()
        )
    );

  const repasseAtendeFiltros = (r: RepasseItem) => {
    const dataRepasse = normalizarData(r.data_pagamento);
    if (!dataRepasse) return false;

    // 1. Define a janela global de datas ativas na tela
    const dataInicio = baixaDe || vendaDe || vencimentoDe;
    const dataFim = baixaAte || vendaAte || vencimentoAte;

    // 2. Valida se a data do repasse está dentro do período selecionado
    if (dataInicio && dataRepasse < dataInicio) return false;
    if (dataFim && dataRepasse > dataFim) return false;

    // 3. Ignora apenas se o usuário filtrar explicitamente por status incompatíveis com repasse efetuado
    if (
      statusFiltro === 'PREVISTO' ||
      statusFiltro === 'CANCELADO'
    ) {
      return false;
    }

    return true;
  };

  const repassesFiltrados = repassesHistorico.filter(repasseAtendeFiltros);

  const iniciarBaixaIndividual = (
    provisaoId: string,
    valorBruto: number
  ) => {
    setPctDescontoInput(0);

    setModalBaixaParametros({
      visivel: true,
      ids: [provisaoId],
      valorBrutoTotal: valorBruto
    });
  };

  const iniciarBaixaLote = () => {
    if (selecionadasLote.length === 0) return;

    const somaLote = provisoesFiltradas
      .filter((p) => selecionadasLote.includes(p.id))
      .reduce(
        (acc, curr) => acc + parseToNumber(curr.valor_direito_corretor),
        0
      );

    setPctDescontoInput(0);

    setModalBaixaParametros({
      visivel: true,
      ids: selecionadasLote,
      valorBrutoTotal: somaLote
    });
  };

  const processarConfirmacaoBaixaBD = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const agora = new Date().toISOString();

      const fatorDesconto =
        pctDescontoInput > 0
          ? 1 - pctDescontoInput / 100
          : 1;

      const promises = modalBaixaParametros.ids.map(async (id) => {
        const itemOriginal = provisoes.find((p) => p.id === id);
        const brutoOriginal = parseToNumber(
          itemOriginal?.valor_direito_corretor
        );

        const liquidoFinalIndividual = brutoOriginal * fatorDesconto;

        return supabase
          .from('tab_financeiro_provisoes')
          .update({
            status_recebimento_seguradora: 'RECEBIDO',
            status_repasse_corretor: 'PAGO',
            data_recebimento: hoje,
            pct_desconto_baixa: pctDescontoInput,
            valor_recebido_liquido: liquidoFinalIndividual,
            updated_at: agora
          })
          .eq('id', id);
      });

      const resultados = await Promise.all(promises);

      const erro = resultados.find((resultado) => resultado.error);

      if (erro?.error) throw erro.error;

      toast.success('Liquidação concluída e repasse marcado como PAGO!');

      setSelecionadasLote([]);

      setModalBaixaParametros({
        visivel: false,
        ids: [],
        valorBrutoTotal: 0
      });

      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar baixa com descontos.');
    }
  };

  const reverterBaixaParcela = async (provisao: ProvisaoItem) => {
    if (
      !window.confirm(
        'Deseja estornar esta parcela? O status voltará para PREVISTO e os descontos da baixa serão limpos.'
      )
    ) {
      return;
    }

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

      toast.success('Estorno concluído!');
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao estornar parcela.');
    }
  };

  const cancelarProvisoesFuturasContrato = async (
    regraId: string,
    nomeCliente: string
  ) => {
    if (!regraId) return;

    if (
      !window.confirm(
        `Deseja realmente CANCELAR todas as parcelas PREVISTAS do contrato de ${nomeCliente.toUpperCase()}?`
      )
    ) {
      return;
    }

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

      toast.success('Provisões futuras canceladas!');
      setModalDetalhe(false);
      await carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cancelar provisões futuras.');
    }
  };

  const lancarAporteRepasse = async () => {
    if (valorAporte <= 0) {
      toast.error("Informe um valor válido para o repasse.");
      return;
    }

    try {
      // 1. Pega a sessão atual
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData?.session?.user?.id;

      if (!userUuid) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      // 2. Busca o corretora_id na tabela correta (usuarios_perfis)
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', userUuid)
        .single();

      if (perfilError || !perfil?.corretora_id) {
        console.error("Erro ao buscar perfil do usuário:", perfilError);
        toast.error("Não foi possível identificar a corretora do seu usuário.");
        return;
      }

      // 3. Insere incluindo OBRIGATORIAMENTE o corretora_id
      const { error: insertError } = await supabase
        .from('tab_financeiro_repasses')
        .insert({
          corretor_id: userUuid,
          corretora_id: perfil.corretora_id, // <-- Isso satisfaz a regra (corretora_id = get_user_corretora_id())
          data_pagamento: dataAporte,
          valor_informado_pago: valorAporte,
          observacao: observacaoAporte || "REPASSE FINANCEIRO DA CORRETORA"
        });

      if (insertError) throw insertError;

      toast.success("Repasse registrado com sucesso!");
      setModalAporte(false);
      setValorAporte(0);
      setObservacaoAporte('');
      await carregarDadosIniciais();

    } catch (err: any) {
      console.error("Erro ao lançar repasse:", err);
      toast.error(err.message || "Erro ao registrar repasse.");
    }
  };

  const calcularTotaisFiltrados = () => {
    const comissaoGeradaTotal = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora !== 'CANCELADO'
      )
      .reduce(
        (acc, curr) => acc + parseToNumber(curr.valor_comissao_total),
        0
      );

    const totalGeradoMae = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora !== 'CANCELADO'
      )
      .reduce(
        (acc, curr) =>
          acc + parseToNumber(curr.valor_direito_corretora_mae),
        0
      );

    const totalProvisionadoCorretor = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora !== 'CANCELADO'
      )
      .reduce(
        (acc, curr) =>
          acc + parseToNumber(curr.valor_direito_corretor),
        0
      );

    const totalRecebidoCorretorBruto = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora === 'RECEBIDO'
      )
      .reduce(
        (acc, curr) =>
          acc + parseToNumber(curr.valor_direito_corretor),
        0
      );

    const totalRecebidoCorretorLiquidoReal = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora === 'RECEBIDO'
      )
      .reduce(
        (acc, curr) =>
          acc +
          (curr.valor_recebido_liquido !== null
            ? parseToNumber(curr.valor_recebido_liquido)
            : parseToNumber(curr.valor_direito_corretor)),
        0
      );

    const totalAReceberCorretor = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora === 'PREVISTO'
      )
      .reduce(
        (acc, curr) =>
          acc + parseToNumber(curr.valor_direito_corretor),
        0
      );

    const totalRepassadoCorretora = repassesFiltrados.reduce(
      (acc, curr) =>
        acc + parseToNumber(curr.valor_informado_pago),
      0
    );

    const saldoRealCorretor =
      totalRepassadoCorretora -
      totalRecebidoCorretorLiquidoReal;

    const totalAReceberAjustado =
      totalAReceberCorretor - saldoRealCorretor;

    return {
      comissaoGeradaTotal,
      totalGeradoMae,
      totalProvisionadoCorretor,
      totalRecebidoCorretorBruto,
      totalRecebidoCorretorLiquidoReal,
      totalAReceberCorretor,
      totalRepassadoCorretora,
      saldoRealCorretor,
      totalAReceberAjustado
    };
  };

  const calcularFluxoCaixaConsolidado = (): MovimentacaoDia[] => {
    const mapaDias: Record<string, MovimentacaoDia> = {};

    repassesFiltrados.forEach((r) => {
      const data = normalizarData(r.data_pagamento);

      if (!data) return;

      if (!mapaDias[data]) {
        mapaDias[data] = {
          dataIso: data,
          totalCredito: 0,
          totalDebitoBruto: 0,
          totalDebitoLiquido: 0,
          saldoDia: 0,
          detalhesProvisoes: [],
          detalhesRepasses: []
        };
      }

      const valor = parseToNumber(r.valor_informado_pago);

      mapaDias[data].totalCredito += valor;

      mapaDias[data].detalhesRepasses.push({
        valor,
        obs: r.observacao || 'Repasse Recebido'
      });
    });

    provisoesFiltradas
      .filter(
        (p) =>
          p.status_recebimento_seguradora === 'RECEBIDO' &&
          !!p.data_recebimento
      )
      .forEach((p) => {
        const data = normalizarData(p.data_recebimento);

        if (!data) return;

        if (!mapaDias[data]) {
          mapaDias[data] = {
            dataIso: data,
            totalCredito: 0,
            totalDebitoBruto: 0,
            totalDebitoLiquido: 0,
            saldoDia: 0,
            detalhesProvisoes: [],
            detalhesRepasses: []
          };
        }

        const bruto = parseToNumber(
          p.valor_direito_corretor
        );

        const liquido =
          p.valor_recebido_liquido !== null
            ? parseToNumber(p.valor_recebido_liquido)
            : bruto;

        const desconto = parseToNumber(
          p.pct_desconto_baixa
        );

        mapaDias[data].totalDebitoBruto += bruto;
        mapaDias[data].totalDebitoLiquido += liquido;

        mapaDias[data].detalhesProvisoes.push({
          cliente: obterNomeCliente(
            p.tab_comissoes_regras?.tab_clientes
          ),
          parcela: `${p.numero_parcela}/${p.tab_comissoes_regras?.quantidade_parcelas || 1}`,
          bruto,
          liquido,
          desconto
        });
      });

    return Object.values(mapaDias)
      .map((dia) => ({
        ...dia,
        saldoDia:
          dia.totalCredito - dia.totalDebitoLiquido
      }))
      .sort(
        (a, b) =>
          new Date(b.dataIso).getTime() -
          new Date(a.dataIso).getTime()
      );
  };

  const imprimirRelatorioCaixaPDF = () => {
    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1200,height=800'
    );

    if (!janelaImpressao) {
      toast.error('Permita pop-ups para gerar o relatório.');
      return;
    }

    const dadosCaixa = calcularFluxoCaixaConsolidado();

    const totalEntradas = dadosCaixa.reduce(
      (acc, dia) => acc + dia.totalCredito,
      0
    );

    const totalBaixas = dadosCaixa.reduce(
      (acc, dia) => acc + dia.totalDebitoLiquido,
      0
    );

    const saldoDiferenca = totalEntradas - totalBaixas;

    const totalPrevistoBruto = provisoesFiltradas
      .filter(
        (p) => p.status_recebimento_seguradora === 'PREVISTO'
      )
      .reduce(
        (acc, p) =>
          acc + parseToNumber(p.valor_direito_corretor),
        0
      );

    const totalAReceberLiquido =
      totalPrevistoBruto - saldoDiferenca;

    const linhasHtml = dadosCaixa
      .map((dia) => {
        const dataFormatada = dia.dataIso
          .split('-')
          .reverse()
          .join('/');

        const corSaldo =
          dia.saldoDia >= 0 ? '#15803d' : '#b91c1c';

        const subTabelaProvisoes =
          dia.detalhesProvisoes
            .map(
              (p) => `
                <tr>
                  <td>↳ Parcela: ${p.cliente.toUpperCase()} (Parc. ${p.parcela})</td>
                  <td style="text-align:right;color:#64748b;">${formatBRL(p.bruto)}</td>
                  <td style="text-align:right;font-weight:bold;color:#b91c1c;">-${formatBRL(p.liquido)}</td>
                </tr>
              `
            )
            .join('');

        const subTabelaRepasses =
          dia.detalhesRepasses
            .map(
              (r) => `
                <tr>
                  <td style="color:#2563eb;">↳ Crédito: ${r.obs.toUpperCase()}</td>
                  <td style="text-align:right;font-weight:bold;color:#15803d;">+${formatBRL(r.valor)}</td>
                  <td></td>
                </tr>
              `
            )
            .join('');

        return `
          <tbody style="page-break-inside:avoid;">
            <tr style="background-color:#f8fafc;font-weight:bold;border-top:2px solid #cbd5e1;">
              <td style="padding:10px;font-size:10pt;">${dataFormatada}</td>
              <td style="padding:10px;text-align:right;color:#15803d;">${formatBRL(dia.totalCredito)}</td>
              <td style="padding:10px;text-align:right;color:#b91c1c;">${formatBRL(dia.totalDebitoLiquido)}</td>
              <td style="padding:10px;text-align:right;color:${corSaldo};font-size:10pt;">${formatBRL(dia.saldoDia)}</td>
            </tr>
            ${subTabelaRepasses}
            ${subTabelaProvisoes}
          </tbody>
        `;
      })
      .join('');

    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Extrato Consolidado</title>
        <style>
          body{font-family:Arial,sans-serif;margin:25px}
          .card-container{display:flex;gap:10px;margin-bottom:20px}
          .card{flex:1;padding:12px;border-radius:8px;border:1px solid #ddd}
          table{width:100%;border-collapse:collapse}
        </style>
      </head>
      <body>
        <h2>Extrato Auditado de Caixa</h2>

        <div class="card-container">
          <div class="card">
            <div style="font-size:7pt;color:#666">TOTAL ENTRADAS</div>
            <div style="font-size:12pt;font-weight:bold">${formatBRL(totalEntradas)}</div>
          </div>

          <div class="card">
            <div style="font-size:7pt;color:#666">TOTAL BAIXAS</div>
            <div style="font-size:12pt;font-weight:bold">${formatBRL(totalBaixas)}</div>
          </div>

          <div class="card" style="background:${saldoDiferenca < 0 ? '#fee2e2' : '#f0fdf4'}">
            <div style="font-size:7pt;color:#666">SALDO DIFERENÇA</div>
            <div style="font-size:12pt;font-weight:bold;color:${saldoDiferenca < 0 ? '#b91c1c' : '#15803d'}">
              ${formatBRL(saldoDiferenca)}
            </div>
          </div>

          <div class="card" style="background:#fffbeb">
            <div style="font-size:7pt;color:#666">A RECEBER LÍQ.</div>
            <div style="font-size:12pt;font-weight:bold">${formatBRL(totalAReceberLiquido)}</div>
          </div>
        </div>

        <table>
          ${linhasHtml}
        </table>

        <script>
          window.onload=function(){
            window.print();
            setTimeout(function(){window.close()},500);
          }
        </script>
      </body>
      </html>
    `);

    janelaImpressao.document.close();
  };

  const handleGerarRelatorioOficial = () => {
    const janelaImpressao = window.open('', '_blank');

    if (!janelaImpressao) {
      toast.error('Por favor, permita pop-ups para gerar o relatório.');
      return;
    }

    const dataHoraAtual = new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const totais = calcularTotaisFiltrados();

    const htmlRelatorio = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Comissões - Memória de Cálculo</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 9px; color: #1e293b; margin: 0; padding: 0; background: #fff; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; position: relative; }
          .header h1 { font-size: 14px; margin: 0; color: #0f172a; font-weight: bold; }
          .header h2 { font-size: 10px; font-weight: normal; margin: 3px 0 0; color: #475569; }
          .date { position: absolute; top: 0; left: 0; font-size: 8px; color: #64748b; text-align: left; }

          /* Cards de Resumo do Topo */
          .resumo-container { display: flex; justify-content: space-between; margin-bottom: 10px; gap: 6px; }
          .resumo-box { border: 1px solid #e2e8f0; background: #f8fafc; padding: 6px; width: 100%; text-align: center; border-radius: 4px; }
          .resumo-box strong { display: block; font-size: 7.5px; margin-bottom: 2px; color: #64748b; text-transform: uppercase; }
          .resumo-box span { font-size: 11px; font-weight: bold; color: #0f172a; }

          /* Tabela Principal */
          table.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table.main-table tr { page-break-inside: avoid; }
          table.main-table th { background: #0f172a; color: #fff; padding: 6px; text-align: left; font-size: 8px; font-weight: 600; }
          table.main-table td { padding: 4px 6px; border-bottom: 1px dashed #cbd5e1; vertical-align: top; font-size: 8.5px; }

          /* NOVO DESIGN: CARDS DO SPLIT (IMAGEM 2) */
          .detalhamento-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin: 6px 0 10px 0; }
          .detalhamento-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          
          .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
          .card-calculo { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
          .card-titulo { font-size: 9.5px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; }
          .card-titulo.corretora { color: #2563eb; }
          .card-titulo.corretor { color: #059669; }

          .linha-calc { display: flex; justify-content: space-between; font-size: 9px; padding: 2px 0; color: #1e293b; }
          .linha-calc.destaque-sub { background: #eff6ff; padding: 4px 6px; border-radius: 4px; font-weight: bold; color: #1e40af; margin-top: 4px; }
          .linha-calc.destaque-verde { background: #ecfdf5; padding: 4px 6px; border-radius: 4px; font-weight: bold; color: #065f46; margin-top: 6px; }
          
          .deducao-item { font-size: 8.5px; color: #b45309; padding-left: 8px; display: flex; justify-content: space-between; margin: 1px 0; }
          .valor-negativo { color: #dc2626; font-weight: 600; }

          /* BANNER ESCURO INFERIOR DO SPLIT */
          .banner-split { background: #0f172a; color: #fff; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
          .banner-split .titulo { font-weight: bold; letter-spacing: 0.5px; }
          .banner-split .valores { display: flex; gap: 14px; align-items: center; }
          .banner-split .badge-verde { background: #064e3b; color: #34d399; padding: 3px 8px; border-radius: 4px; font-weight: bold; border: 1px solid #059669; }

          .footer { position: fixed; bottom: 0; width: 100%; font-size: 7.5px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 4px; }
        </style>
      </head>

      <body>
        <div class="date">
          Relatório de Comissões<br/>
          ${dataHoraAtual}
        </div>

        <div class="header">
          <h1>DEMONSTRATIVO UNIFICADO DE COMISSÕES E MEMÓRIA DE CÁLCULO</h1>
          <h2>Módulo de Auditoria Integrada de Provisões e Regras de Comissionamento</h2>
        </div>

        <!-- CARDS DE TOTALIZADORES -->
        <div class="resumo-container">
          <div class="resumo-box">
            <strong>1º Comissão Gerada Total</strong>
            <span>${formatBRL(totais.comissaoGeradaTotal)}</span>
          </div>
          <div class="resumo-box">
            <strong>2º Parte Corretora (Mãe)</strong>
            <span>${formatBRL(totais.totalGeradoMae)}</span>
          </div>
          <div class="resumo-box">
            <strong>3º Direito Corretor (Bruto)</strong>
            <span>${formatBRL(totais.totalProvisionadoCorretor)}</span>
          </div>
          <div class="resumo-box">
            <strong>4º Recebido Líquido (Caixa)</strong>
            <span>${formatBRL(totais.totalRecebidoCorretorLiquidoReal)}</span>
          </div>
          <div class="resumo-box">
            <strong>5º A Receber (Previsto)</strong>
            <span>${formatBRL(totais.totalAReceberAjustado)}</span>
          </div>
        </div>

        <div class="resumo-container" style="justify-content:center; gap:15px; margin-bottom:12px">
          <div class="resumo-box" style="max-width:180px">
            <strong>Total Repasses (Aportes)</strong>
            <span>${formatBRL(totais.totalRepassadoCorretora)}</span>
          </div>
          <div class="resumo-box" style="max-width:180px">
            <strong>Comissões Baixadas (Líquido)</strong>
            <span>${formatBRL(totais.totalRecebidoCorretorLiquidoReal)}</span>
          </div>
          <div class="resumo-box" style="max-width:180px">
            <strong>Saldo Final Diferença</strong>
            <span>${formatBRL(totais.saldoRealCorretor)}</span>
          </div>
        </div>

        <!-- LISTA DE PROVISÕES COM DETALHAMENTO EM CARDS E CÁLCULO DINÂMICO -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 25%">CLIENTE / PRODUTO</th>
              <th style="width: 15%">SEGURADORA / APÓLICE</th>
              <th style="width: 10%; text-align:center">PARCELA</th>
              <th style="width: 12%; text-align:center">VENCIMENTO</th>
              <th style="width: 12%; text-align:center">DATA REC.</th>
              <th style="width: 12%; text-align:center">STATUS</th>
              <th style="width: 14%; text-align:right">C. LÍQUIDA CORRETOR</th>
            </tr>
          </thead>

          <tbody>
            ${provisoesFiltradasEOrdenadas
              .map((p) => {
                const r: any = p.tab_comissoes_regras || {};
                const numParcela = parseToNumber(p.numero_parcela || 1);

                // PARSE SEGURO DOS JSONBS DA REGRA
                let metaFaixas: any[] = [];
                let descontosComissaoArr: any[] = [];
                let descontosCorretorArr: any[] = [];

                try {
                  metaFaixas = typeof r.meta_faixas_json === 'string' ? JSON.parse(r.meta_faixas_json) : (r.meta_faixas_json || []);
                  descontosComissaoArr = typeof r.descontos_comissao_json === 'string' ? JSON.parse(r.descontos_comissao_json) : (r.descontos_comissao_json || []);
                  descontosCorretorArr = typeof r.descontos_corretor_json === 'string' ? JSON.parse(r.descontos_corretor_json) : (r.descontos_corretor_json || []);
                } catch (e) {
                  console.error("Erro ao realizar parse dos JSONs da regra:", e);
                }

                // 1) CÁLCULO CORRETORA
                const valRefBruto = parseToNumber(r.base_calculo_valor ?? 0);
                const descontosIof = r.descontar_iof ? parseToNumber(r.valor_iof ?? 0) : 0;
                const valBaseCalculo = valRefBruto - descontosIof;

                // Identifica % da Faixa da Parcela Atual (ou fallback para pct_comissao_venda)
                const faixaAtual = metaFaixas.find((f: any) => numParcela >= parseToNumber(f.parcelaInicio || 1) && numParcela <= parseToNumber(f.parcelaFim || 1));
                const pctComissaoRegra = faixaAtual ? parseToNumber(faixaAtual.pctComissaoVenda) : parseToNumber(r.pct_comissao_venda ?? 0);

                // Soma dinâmica de descontos da comissão (Master, Lucro, etc.)
                const somaPctDescontosComissao = descontosComissaoArr.reduce((acc: number, item: any) => acc + parseToNumber(item.percentual ?? 0), 0);
                const pctComissaoEfetivaCorretora = Math.max(0, pctComissaoRegra - somaPctDescontosComissao);

                const comissaoBrutaCorretora = valBaseCalculo * (pctComissaoEfetivaCorretora / 100);

                // 2) REPASSE & RETENÇÕES DO CORRETOR
                const pctRepasseCorretor = parseToNumber(r.pct_corretor ?? 0);
                const comissaoBrutaCorretor = comissaoBrutaCorretora * (pctRepasseCorretor / 100);

                // Retenções dinâmicas do Corretor
                let totalRetencoesCorretorR$ = 0;
                const htmlRetencoesCorretor = descontosCorretorArr.map((d: any) => {
                  const val = parseToNumber(d.valor ?? 0);
                  let valorCalculado = 0;
                  let labelAdicional = '';

                  if (d.tipo === 'PERCENTUAL' || !d.tipo) {
                    valorCalculado = comissaoBrutaCorretor * (val / 100);
                    labelAdicional = ` (${val}%)`;
                  } else {
                    valorCalculado = val;
                  }

                  totalRetencoesCorretorR$ += valorCalculado;

                  return `
                    <div class="deducao-item">
                      <span>• ${d.nome || 'Retenção'}${labelAdicional}:</span>
                      <span class="valor-negativo">-${formatBRL(valorCalculado)}</span>
                    </div>
                  `;
                }).join('');

                const comissaoLiquidaCorretor = comissaoBrutaCorretor - totalRetencoesCorretorR$;

                // 3) PARCEIRO
                const pctRepasseParceiro = parseToNumber(r.pct_parceiro ?? 0);
                const comissaoParceiro = comissaoBrutaCorretora * (pctRepasseParceiro / 100);

                // Mapeamentos de Exibição
                const dataVenda = r.data_venda ? normalizarData(r.data_venda).split('-').reverse().join('/') : '—';
                const dataVenc = p.data_vencimento_previsto ? normalizarData(p.data_vencimento_previsto).split('-').reverse().join('/') : '—';
                const dataRec = p.data_recebimento ? normalizarData(p.data_recebimento).split('-').reverse().join('/') : '—';
                const clienteNome = obterNomeCliente(r.tab_clientes).toUpperCase();

                return `
                  <tr>
                    <td colspan="7" style="padding: 0; border: none;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="width: 25%">
                            <strong>${clienteNome}</strong><br/>
                            <span style="font-size:7.5px;color:#4b5563">
                              ${r.base_produtos?.nome?.toUpperCase() || '—'}
                            </span>
                          </td>

                          <td style="width: 15%">
                            <strong>${r.base_seguradoras?.nome?.toUpperCase() || '—'}</strong><br/>
                            <span style="font-size:7.5px;color:#6b7280">
                              Ap.: ${r.tab_proposta_itens?.numero_apolice || '—'}
                            </span>
                          </td>

                          <td style="width: 10%; text-align:center">${numParcela}/${r.quantidade_parcelas || 1}</td>
                          <td style="width: 12%; text-align:center">${dataVenc}</td>
                          <td style="width: 12%; text-align:center">${dataRec}</td>

                          <td style="width: 12%; text-align:center">
                            <span style="
                              background-color:${p.status_recebimento_seguradora === 'RECEBIDO' ? '#dcfce7' : p.status_recebimento_seguradora === 'CANCELADO' ? '#fee2e2' : '#fef3c7'};
                              color:${p.status_recebimento_seguradora === 'RECEBIDO' ? '#166534' : p.status_recebimento_seguradora === 'CANCELADO' ? '#991b1b' : '#92400e'};
                              padding:2px 6px; border-radius:4px; font-size:7.5px; font-weight:bold;
                            ">
                              ${p.status_recebimento_seguradora}
                            </span>
                          </td>

                          <td style="width: 14%; text-align:right">
                            <strong style="color:#15803d; font-size:10px">
                              ${formatBRL(comissaoLiquidaCorretor)}
                            </strong>
                          </td>
                        </tr>
                      </table>

                      <!-- CONTAINER DOS CARDS DE CÁLCULO E SPLIT -->
                      <div class="detalhamento-container">
                        <div class="detalhamento-header">
                          <span>DETALHAMENTO DA MEMÓRIA DE CÁLCULO & SPLIT</span>
                          <span>Data Venda: ${dataVenda}</span>
                        </div>

                        <div class="cards-grid">
                          <!-- CARD 1: CÁLCULO DA CORRETORA -->
                          <div class="card-calculo">
                            <div class="card-titulo corretora">1. CÁLCULO DA COMISSÃO CORRETORA</div>
                            
                            <div class="linha-calc">
                              <span><strong>1) Valor Ref. Bruto:</strong></span>
                              <span><strong>${formatBRL(valRefBruto)}</strong></span>
                            </div>

                            <div class="linha-calc">
                              <span style="color:#dc2626"><strong>2) Descontos/IOF:</strong></span>
                              <span class="valor-negativo">-${formatBRL(descontosIof)}</span>
                            </div>

                            <div class="linha-calc">
                              <span><strong>3) Base de Cálculo:</strong></span>
                              <span><strong>${formatBRL(valBaseCalculo)}</strong></span>
                            </div>

                            <div class="linha-calc" style="margin-top:4px">
                              <span><strong>4) Comissão Bruta (Regra):</strong></span>
                              <span><strong>${pctComissaoRegra}%</strong></span>
                            </div>

                            <div style="margin: 2px 0 4px 0">
                              <span style="font-size:8.5px; color:#b45309; font-weight:bold">Deduções da Comissão:</span>
                              ${descontosComissaoArr.map((d: any) => `
                                <div class="deducao-item">
                                  <span>• ${d.nome || 'Dedução'}:</span>
                                  <span class="valor-negativo">-${d.percentual}%</span>
                                </div>
                              `).join('')}
                            </div>

                            <div class="linha-calc destaque-sub">
                              <span>5) % Comissão Efetiva Corretora:</span>
                              <span>${pctComissaoEfetivaCorretora}% (${pctComissaoRegra}% - ${somaPctDescontosComissao}%)</span>
                            </div>

                            <div class="linha-calc destaque-sub" style="margin-top:4px">
                              <span>6) Com. Bruta Corretora:</span>
                              <span>${formatBRL(comissaoBrutaCorretora)}</span>
                            </div>
                          </div>

                          <!-- CARD 2: REPASSE E RETENÇÕES DO CORRETOR -->
                          <div class="card-calculo">
                            <div class="card-titulo corretor">2. REPASSE & RETENÇÕES DO CORRETOR</div>
                            
                            <div class="linha-calc">
                              <span><strong>7) % Repasse Corretor:</strong></span>
                              <span><strong>${pctRepasseCorretor}%</strong></span>
                            </div>

                            <div class="linha-calc">
                              <span><strong>8) Com. Bruta Corretor:</strong></span>
                              <span><strong>${formatBRL(comissaoBrutaCorretor)}</strong></span>
                            </div>

                            <div style="margin-top:6px">
                              <span style="font-size:8.5px; color:#dc2626; font-weight:bold">9) Retenções / Impostos:</span>
                              ${htmlRetencoesCorretor || '<div class="deducao-item"><span>• Nenhuma retenção</span><span>R$ 0,00</span></div>'}
                            </div>

                            <div class="linha-calc destaque-verde">
                              <span>10) Com. Líquida Corretor:</span>
                              <span>${formatBRL(comissaoLiquidaCorretor)}</span>
                            </div>
                          </div>
                        </div>

                        <!-- BANNER ESCURO FINAL COM RESUMO DO SPLIT -->
                        <div class="banner-split">
                          <span class="titulo">RESUMO DO SPLIT FINAL:</span>
                          <div class="valores">
                            <span>Comissão Corretora: <strong style="color:#60a5fa">${formatBRL(comissaoBrutaCorretora)}</strong></span>
                            <span>Comissão Parceiro (${pctRepasseParceiro}%): <strong style="color:#facc15">${formatBRL(comissaoParceiro)}</strong></span>
                            <span class="badge-verde">Comissão Líquida Corretor: ${formatBRL(comissaoLiquidaCorretor)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          Relatório Financeiro Corporativo Confidencial — Auditado via Módulo de Comissões
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

  const toggleLinhaExpandida = (id: string) => {
    setLinhasExpandidas((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const toggleDiaFluxoExpandido = (dataIso: string) => {
    setDiasExpandidosFluxo((prev) =>
      prev.includes(dataIso)
        ? prev.filter((d) => d !== dataIso)
        : [...prev, dataIso]
    );
  };

  const safeParseJSON = (jsonString: any) => {
    if (!jsonString) return [];
    if (typeof jsonString === 'object') return jsonString;
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  const totais = calcularTotaisFiltrados();

  const somaLoteAtual = provisoesFiltradas
    .filter((p) => selecionadasLote.includes(p.id))
    .reduce(
      (acc, curr) =>
        acc + parseToNumber(curr.valor_direito_corretor),
      0
    );

  const pctGerada = 100;

  const pctCorretora =
    totais.comissaoGeradaTotal > 0
      ? (totais.totalGeradoMae /
          totais.comissaoGeradaTotal) *
        100
      : 0;

  const pctCorretorBruto =
    totais.comissaoGeradaTotal > 0
      ? (totais.totalProvisionadoCorretor /
          totais.comissaoGeradaTotal) *
        100
      : 0;

  const pctRecebidoLiquido =
    totais.totalProvisionadoCorretor > 0
      ? (totais.totalRecebidoCorretorLiquidoReal /
          totais.totalProvisionadoCorretor) *
        100
      : 0;

  const pctAReceberAjustado =
    totais.totalProvisionadoCorretor > 0
      ? (totais.totalAReceberAjustado /
          totais.totalProvisionadoCorretor) *
        100
      : 0;

  return (
    <div className="p-6 space-y-6 text-left bg-zinc-50/50 dark:bg-zinc-950 min-h-screen relative print:p-0 print:bg-white">
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-2">
          <button
            onClick={() => setModalAporte(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-blue-500 transition-all"
          >
            <PlusCircle size={16} />
            Registrar Repasse
          </button>

          <button
            onClick={() => setModalFluxo(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-indigo-500 transition-all"
          >
            <Activity size={16} />
            Ver Fluxo de Caixa
          </button>

          <button
            onClick={() => {
              if (
                linhasExpandidas.length ===
                provisoesFiltradasEOrdenadas.length
              ) {
                setLinhasExpandidas([]);
              } else {
                setLinhasExpandidas(
                  provisoesFiltradasEOrdenadas.map(
                    (p) => p.id
                  )
                );
              }
            }}
            className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-zinc-700 transition-all"
          >
            <Eye size={16} />
            {linhasExpandidas.length ===
            provisoesFiltradasEOrdenadas.length
              ? 'Recolher Todos'
              : 'Expandir Todos'}
          </button>

          <button
            onClick={handleGerarRelatorioOficial}
            className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight shadow-md hover:bg-zinc-700 transition-all"
          >
            <Printer size={16} />
            Imprimir Relatório Unificado
          </button>
        </div>
      </div>

      {selecionadasLote.length > 0 && (
        <div className="bg-zinc-900 text-white p-4 rounded-[2rem] flex items-center justify-between shadow-lg dark:bg-zinc-800 print:hidden">
          <div className="flex items-center gap-4 pl-2">
            <Wallet size={20} className="text-blue-500" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Liquidação de Parcelas Selecionadas
              </p>

              <p className="text-xs font-bold">
                <span className="bg-zinc-800 px-2 py-0.5 rounded font-mono text-blue-400">
                  {selecionadasLote.length}
                </span>{' '}
                parcelas | Bruto:{' '}
                <span className="font-black text-white">
                  {formatBRL(somaLoteAtual)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={iniciarBaixaLote}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all"
          >
            Liquidar e Repassar com Taxas/Descontos
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">
              1º Comissão Gerada Total
            </span>

            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                {formatBRL(totais.comissaoGeradaTotal)}
              </h2>

              <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded">
                {pctGerada}%
              </span>
            </div>
          </div>

          <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-full text-purple-600">
            <Building2 size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
              2º Parte Corretora (Mãe)
            </span>

            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                {formatBRL(totais.totalGeradoMae)}
              </h2>

              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                {pctCorretora.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 rounded-full text-indigo-600">
            <Landmark size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">
              3º Direito Corretor (Bruto)
            </span>

            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                {formatBRL(totais.totalProvisionadoCorretor)}
              </h2>

              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                {pctCorretorBruto.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-full text-blue-600">
            <ArrowDownCircle size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">
              4º Recebido Líquido (Caixa)
            </span>

            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-lg font-black text-emerald-600 tracking-tight">
                {formatBRL(
                  totais.totalRecebidoCorretorLiquidoReal
                )}
              </h2>

              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                {pctRecebidoLiquido.toFixed(1)}%
              </span>
            </div>

            <span className="text-[9px] text-zinc-400 block mt-0.5">
              Antes da taxa:{' '}
              {formatBRL(
                totais.totalRecebidoCorretorBruto
              )}
            </span>
          </div>

          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">
              5º A Receber (Previsto)
            </span>

            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-lg font-black text-amber-600 tracking-tight">
                {formatBRL(totais.totalAReceberAjustado)}
              </h2>

              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                {pctAReceberAjustado.toFixed(1)}%
              </span>
            </div>

            {totais.saldoRealCorretor !== 0 && (
              <span className="text-[9px] text-zinc-400 block mt-0.5">
                Original:{' '}
                {formatBRL(
                  totais.totalAReceberCorretor
                )}{' '}
                (
                {totais.saldoRealCorretor < 0
                  ? '+'
                  : '-'}
                {formatBRL(
                  Math.abs(
                    totais.saldoRealCorretor
                  )
                )}
                )
              </span>
            )}
          </div>

          <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-full text-amber-600">
            <Activity size={18} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-800 dark:text-white">
          <Landmark size={18} className="text-blue-600" />

          <h3 className="text-xs font-black uppercase tracking-tight">
            Conciliação Geral de Repasses (Aportes vs Baixas Auditadas)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between border border-zinc-100">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">
                1º Total Repasses (Aportes)
              </span>

              <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatBRL(
                  totais.totalRepassadoCorretora
                )}
              </span>
            </div>

            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg">
              <ArrowUpRight size={16} />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between border border-zinc-100">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">
                2º Comissões Baixadas (Bruto)
              </span>

              <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                {formatBRL(
                  totais.totalRecebidoCorretorBruto
                )}
              </span>
            </div>

            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg">
              <ArrowDownCircle size={16} />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl flex items-center justify-between border border-zinc-100">
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-400 block mb-1">
                3º Comissões Baixadas (Líquido)
              </span>

              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatBRL(
                  totais.totalRecebidoCorretorLiquidoReal
                )}
              </span>
            </div>

            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg">
              <ArrowDownLeft size={16} />
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              totais.saldoRealCorretor < 0
                ? 'bg-rose-50/50 border-rose-100 dark:border-rose-950'
                : 'bg-emerald-50/50 border-emerald-100 dark:border-emerald-950'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-500 block mb-1">
                4º Saldo Final Diferença
              </span>

              <span
                className={`text-base font-black font-mono ${
                  totais.saldoRealCorretor < 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              >
                {formatBRL(
                  totais.saldoRealCorretor
                )}
              </span>
            </div>

            <div
              className={`p-2 rounded-lg ${
                totais.saldoRealCorretor < 0
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              <Equal size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Search
              className="absolute left-4 top-3.5 text-zinc-400"
              size={18}
            />

            <input
              type="text"
              placeholder="BUSCAR CLIENTE, PRODUTO, SEGURADORA..."
              value={busca}
              onChange={(e) =>
                setBusca(e.target.value)
              }
              className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 rounded-2xl text-xs font-bold uppercase tracking-tight outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button
              onClick={limparFiltrosData}
              className="flex items-center gap-1 text-zinc-400 hover:text-rose-600 text-[11px] font-black uppercase tracking-tight bg-zinc-50 dark:bg-zinc-950 border px-3 py-2 rounded-xl"
            >
              <XCircle size={14} />
              Limpar Datas
            </button>

            <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1">
              {(
                [
                  'TODOS',
                  'PREVISTO',
                  'RECEBIDO',
                  'CANCELADO'
                ] as const
              ).map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setStatusFiltro(t)
                  }
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    statusFiltro === t
                      ? 'bg-white shadow-sm text-zinc-900'
                      : 'text-zinc-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border">
            <div className="flex items-center gap-1.5 mb-1.5 text-zinc-400">
              <Calendar size={13} />
              <span className="text-[10px] font-black uppercase text-zinc-500">
                Data da Venda
              </span>
            </div>

            <div className="flex items-center text-[11px] font-bold gap-1">
              <input
                type="date"
                value={vendaDe}
                onChange={(e) =>
                  setVendaDe(e.target.value)
                }
                className="bg-transparent outline-none w-full"
              />

              <span className="text-zinc-400 text-[10px]">
                ATÉ
              </span>

              <input
                type="date"
                value={vendaAte}
                onChange={(e) =>
                  setVendaAte(e.target.value)
                }
                className="bg-transparent outline-none w-full"
              />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border">
            <div className="flex items-center gap-1.5 mb-1.5 text-blue-600">
              <Calendar size={13} />

              <span className="text-[10px] font-black uppercase text-blue-600">
                Data Vencimento
              </span>
            </div>

            <div className="flex items-center text-[11px] font-bold gap-1">
              <input
                type="date"
                value={vencimentoDe}
                onChange={(e) =>
                  setVencimentoDe(e.target.value)
                }
                className="bg-transparent outline-none w-full"
              />

              <span className="text-zinc-400 text-[10px]">
                ATÉ
              </span>

              <input
                type="date"
                value={vencimentoAte}
                onChange={(e) =>
                  setVencimentoAte(e.target.value)
                }
                className="bg-transparent outline-none w-full"
              />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border">
            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600">
              <Calendar size={13} />

              <span className="text-[10px] font-black uppercase text-emerald-600">
                Data da Baixa
              </span>
            </div>

            <div className="flex items-center text-[11px] font-bold gap-1">
              <input
                type="date"
                value={baixaDe}
                onChange={(e) =>
                  setBaixaDe(e.target.value)
                }
                className="bg-transparent outline-none w-full"
              />

              <span className="text-zinc-400 text-[10px]">
                ATÉ
              </span>

              <input
                type="date"
                value={baixaAte}
                onChange={(e) =>
                  setBaixaAte(e.target.value)
                }
                className="bg-transparent outline-none w-full"
              />
            </div>
          </div>
        </div>
      </div>

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
                <th className="p-4 text-right text-emerald-600">
                  Líquido Recebido
                </th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center">Data Rec.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
              {loading ? (
                <tr>
                  <td
                    colSpan={12}
                    className="p-8 text-center uppercase font-black text-zinc-400 animate-pulse"
                  >
                    Buscando lançamentos...
                  </td>
                </tr>
              ) : provisoesFiltradasEOrdenadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="p-8 text-center uppercase font-black text-zinc-400"
                  >
                    Nenhum registro.
                  </td>
                </tr>
              ) : (
                provisoesFiltradasEOrdenadas.map((p) => {
                  const estaExpandida =
                    linhasExpandidas.includes(p.id);

                  const liqExibicao =
                    p.valor_recebido_liquido !== null
                      ? parseToNumber(
                          p.valor_recebido_liquido
                        )
                      : parseToNumber(
                          p.valor_direito_corretor
                        );

                  const temDesconto =
                    parseToNumber(
                      p.pct_desconto_baixa
                    ) > 0;

                  return (
                    <Fragment key={p.id}>
                      <tr
                        className={`${
                          selecionadasLote.includes(
                            p.id
                          )
                            ? 'bg-blue-50/50'
                            : 'hover:bg-zinc-50/80'
                        } ${
                          p.status_recebimento_seguradora ===
                          'CANCELADO'
                            ? 'opacity-50 bg-zinc-100/40 line-through text-zinc-400'
                            : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selecionadasLote.includes(
                              p.id
                            )}
                            disabled={
                              p.status_recebimento_seguradora ===
                                'RECEBIDO' ||
                              p.status_recebimento_seguradora ===
                                'CANCELADO'
                            }
                            onChange={() =>
                              setSelecionadasLote(
                                (prev) =>
                                  prev.includes(p.id)
                                    ? prev.filter(
                                        (item) =>
                                          item !==
                                          p.id
                                      )
                                    : [
                                        ...prev,
                                        p.id
                                      ]
                              )
                            }
                            className="w-4 h-4 rounded cursor-pointer disabled:opacity-30"
                          />
                        </td>

                        <td className="p-4 font-black text-zinc-900 dark:text-white uppercase">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                toggleLinhaExpandida(
                                  p.id
                                )
                              }
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              {estaExpandida ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown
                                  size={14}
                                />
                              )}
                            </button>

                            {obterNomeCliente(
                              p.tab_comissoes_regras
                                ?.tab_clientes
                            )}
                          </div>
                        </td>

                        <td className="p-4 uppercase">
                          {p.tab_comissoes_regras
                            ?.base_produtos?.nome ||
                            '—'}
                        </td>

                        <td className="p-4 uppercase">
                          {p.tab_comissoes_regras
                            ?.base_seguradoras?.nome ||
                            '—'}
                        </td>

                        <td className="p-4 text-center text-zinc-400 font-mono">
                          📄{' '}
                          {p.tab_comissoes_regras
                            ?.tab_proposta_itens
                            ?.numero_apolice ||
                            '—'}
                        </td>

                        <td className="p-4 text-center font-black text-zinc-500 bg-zinc-50/40">
                          {p.numero_parcela} de{' '}
                          {p.tab_comissoes_regras
                            ?.quantidade_parcelas ||
                            1}
                        </td>

                        <td className="p-4 text-right font-black text-zinc-500">
                          {formatBRL(
                            parseToNumber(
                              p.valor_direito_corretor
                            )
                          )}
                        </td>

                        <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50/10">
                          <div className="flex flex-col items-end">
                            <span>
                              {formatBRL(
                                liqExibicao
                              )}
                            </span>

                            {temDesconto && (
                              <span className="text-[9px] font-bold text-amber-600">
                                -
                                {
                                  p.pct_desconto_baixa
                                }
                                % taxa
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-center text-zinc-800 dark:text-zinc-200">
                          {normalizarData(
                            p.data_vencimento_previsto
                          )
                            .split('-')
                            .reverse()
                            .join('/')}
                        </td>

                        <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">
                          {p.data_recebimento
                            ? normalizarData(
                                p.data_recebimento
                              )
                                .split('-')
                                .reverse()
                                .join('/')
                            : '—'}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${
                              p.status_recebimento_seguradora ===
                              'RECEBIDO'
                                ? 'bg-emerald-100 text-emerald-700'
                                : p.status_recebimento_seguradora ===
                                  'CANCELADO'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {
                              p.status_recebimento_seguradora
                            }
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {p.status_recebimento_seguradora ===
                            'RECEBIDO' ? (
                              <button
                                onClick={() =>
                                  reverterBaixaParcela(
                                    p
                                  )
                                }
                                title="Estornar parcela e limpar taxas"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              >
                                <RefreshCcw
                                  size={15}
                                />
                              </button>
                            ) : p.status_recebimento_seguradora ===
                              'PREVISTO' ? (
                              <>
                                <button
                                  onClick={() =>
                                    iniciarBaixaIndividual(
                                      p.id,
                                      parseToNumber(
                                        p.valor_direito_corretor
                                      )
                                    )
                                  }
                                  title="Baixar e pagar corretor"
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100"
                                >
                                  <Check
                                    size={16}
                                  />
                                </button>

                                <button
                                  onClick={() =>
                                    cancelarProvisoesFuturasContrato(
                                      p
                                        .tab_comissoes_regras
                                        ?.id || '',
                                      obterNomeCliente(
                                        p
                                          .tab_comissoes_regras
                                          ?.tab_clientes
                                      )
                                    )
                                  }
                                  title="Cancelar provisões futuras"
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100"
                                >
                                  <XCircle
                                    size={15}
                                  />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-zinc-400">
                                N/A
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setItemDetalhado(p);
                                setModalDetalhe(
                                  true
                                );
                              }}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 rounded-lg"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {estaExpandida && (() => {
                        // O tipo (r: any) resolve os erros de compilação do TypeScript para todas as propriedades
                        const r: any = p.tab_comissoes_regras || {};
                        
                        // Parse seguro dos JSONs
                        const descontosComissao = safeParseJSON(r.descontos_comissao_json);
                        const descontosCorretor = safeParseJSON(r.descontos_corretor_json);
                        const metaFaixas = safeParseJSON(r.meta_faixas_json);

                        // 1 & 2. Bruto e IOF
                        const valorReferenciaBruto = parseToNumber(r.base_calculo_valor) || 0;
                        const valorIof = r.descontar_iof ? (parseToNumber(r.valor_iof) || 0) : 0;
                        
                        // 4. Base de Cálculo Real (Bruto - IOF)
                        const valorBaseCalculo = valorReferenciaBruto - valorIof;

                        // 5. Comissão Bruta (% da faixa inicial/meta)
                        const pctComissaoBruta = parseToNumber(metaFaixas[0]?.pctComissaoVenda) || parseToNumber(r.pct_comissao_venda) || 0;

                        // 6. Soma dos % de descontos da comissão (ex: Master + Lucro)
                        const pctTotalDescontosComissao = descontosComissao.reduce(
                          (acc: number, item: any) => acc + (parseToNumber(item.percentual || item.valor) || 0),
                          0
                        );

                        // 7. Comissão Base de Cálculo (% final)
                        const pctComissaoLiquidaRegra = pctComissaoBruta - pctTotalDescontosComissao;

                        // 8. Comissão Bruta Corretora ($)
                        const comissaoBrutaCorretora = valorBaseCalculo * (pctComissaoLiquidaRegra / 100);

                        // 9 & 10. Porcentagens de Repasse
                        const pctRepasseCorretor = parseToNumber(r.pct_corretor) || 0;
                        const pctRepasseParceiro = parseToNumber(r.pct_parceiro) || 0;

                        // ... restante do bloco permanece idêntico

                        // 11. Comissão Bruta Corretor ($)
                        const comissaoBrutaCorretor = comissaoBrutaCorretora * (pctRepasseCorretor / 100);

                        // 12. Retenções / Impostos Corretor ($)
                        let totalRetencoesCorretor = 0;
                        const listaRetencoes = descontosCorretor.map((ret: any) => {
                          const val = parseToNumber(ret.valor) || 0;
                          const valorCalculado = ret.tipo === 'PERCENTUAL' ? comissaoBrutaCorretor * (val / 100) : val;
                          totalRetencoesCorretor += valorCalculado;
                          return { ...ret, valorCalculado };
                        });

                        // 13. Comissão Líquida Corretor ($)
                        const comissaoLiquidaCorretor = comissaoBrutaCorretor - totalRetencoesCorretor;

                        // RESUMO DO SPLIT
                        const comissaoParceiro = comissaoBrutaCorretora * (pctRepasseParceiro / 100);

                        return (
                          <tr className="bg-zinc-100/70 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800">
                            <td colSpan={12} className="p-5 border-l-4 border-blue-600">
                              <div className="space-y-4 text-xs text-zinc-700 dark:text-zinc-300">
                                
                                {/* TÍTULO DO DETALHAMENTO */}
                                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-2">
                                  <span className="font-black uppercase tracking-wider text-[11px] text-zinc-500">
                                    Detalhamento da Memória de Cálculo & Split
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    Data Venda: {r.data_venda ? normalizarData(r.data_venda).split('-').reverse().join('/') : '—'}
                                  </span>
                                </div>

                                {/* PASSO A PASSO DO CÁLCULO */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                  
                                  {/* ETAPA 1: BASE E COMISSÃO CORRETORA */}
                                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1.5 shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 block mb-1">
                                      1. Cálculo da Comissão Corretora
                                    </span>
                                    
                                    <div className="flex justify-between">
                                      <span>1) Valor Ref. Bruto:</span>
                                      <strong className="font-mono">{formatBRL(valorReferenciaBruto)}</strong>
                                    </div>
                                    
                                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                      <span>2) Descontos/IOF:</span>
                                      <strong className="font-mono">-{formatBRL(valorIof)}</strong>
                                    </div>

                                    <div className="flex justify-between border-t border-dashed pt-1 font-bold text-zinc-900 dark:text-zinc-100">
                                      <span>3) Base de Cálculo:</span>
                                      <span className="font-mono">{formatBRL(valorBaseCalculo)}</span>
                                    </div>

                                    <div className="flex justify-between pt-1">
                                      <span>4) Comissão Bruta (Regra):</span>
                                      <span className="font-mono">{pctComissaoBruta}%</span>
                                    </div>

                                    {descontosComissao.length > 0 && (
                                      <div className="text-[10px] text-amber-700 dark:text-amber-400 pl-2 space-y-0.5">
                                        <span className="block font-semibold">Deduções da Comissão:</span>
                                        {descontosComissao.map((d: any, idx: number) => (
                                          <div key={idx} className="flex justify-between">
                                            <span>• {d.nome}:</span>
                                            <span className="font-mono">-{d.percentual || d.valor}%</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1 font-black text-blue-700 dark:text-blue-300">
                                      <span>5) % Comissão Efetiva Corretora:</span>
                                      <span className="font-mono">{pctComissaoLiquidaRegra}% ({pctComissaoBruta}% - {pctTotalDescontosComissao}%)</span>
                                    </div>

                                    <div className="flex justify-between bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded-lg font-black text-blue-800 dark:text-blue-200 mt-1">
                                      <span>6) Com. Bruta Corretora:</span>
                                      <span className="font-mono">{formatBRL(comissaoBrutaCorretora)}</span>
                                    </div>
                                  </div>

                                  {/* ETAPA 2: REPASSE E LIQUIDAÇÃO CORRETOR */}
                                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1.5 shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                                      2. Repasse & Retenções do Corretor
                                    </span>

                                    <div className="flex justify-between">
                                      <span>7) % Repasse Corretor:</span>
                                      <strong className="font-mono">{pctRepasseCorretor}%</strong>
                                    </div>

                                    <div className="flex justify-between font-bold">
                                      <span>8) Com. Bruta Corretor:</span>
                                      <span className="font-mono">{formatBRL(comissaoBrutaCorretor)}</span>
                                    </div>

                                    <div className="pt-1">
                                      <span className="block text-[10px] font-bold text-rose-600 dark:text-rose-400">9) Retenções / Impostos:</span>
                                      {listaRetencoes.length > 0 ? (
                                        listaRetencoes.map((ret: any, idx: number) => (
                                          <div key={idx} className="flex justify-between text-[10px] pl-2 text-rose-600 dark:text-rose-400">
                                            <span>• {ret.nome} ({ret.valor}%):</span>
                                            <span className="font-mono">-{formatBRL(ret.valorCalculado)}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-zinc-400 pl-2">Nenhuma retenção</span>
                                      )}
                                    </div>

                                    <div className="flex justify-between bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg font-black text-emerald-800 dark:text-emerald-200 mt-3 text-[12px]">
                                      <span>10) Com. Líquida Corretor:</span>
                                      <span className="font-mono">{formatBRL(comissaoLiquidaCorretor)}</span>
                                    </div>
                                  </div>

                                </div>

                                {/* CARD DE RESUMO DO SPLIT FINAL */}
                                <div className="bg-zinc-900 text-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                                    Resumo do Split Final:
                                  </span>

                                  <div className="flex flex-wrap items-center gap-4 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-zinc-400">Comissão Corretora:</span>
                                      <strong className="font-mono text-blue-400">{formatBRL(comissaoBrutaCorretora)}</strong>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-zinc-400">Comissão Parceiro ({pctRepasseParceiro}%):</span>
                                      <strong className="font-mono text-amber-400">{formatBRL(comissaoParceiro)}</strong>
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                                      <span className="text-emerald-400 font-bold">Comissão Líquida Corretor:</span>
                                      <strong className="font-mono text-emerald-300 text-[12px]">{formatBRL(comissaoLiquidaCorretor)}</strong>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalBaixaParametros.visivel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Percent size={18} />

              <h3 className="text-sm font-black uppercase tracking-tight">
                Taxas e Descontos de Liquidação
              </h3>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Você está liquidando e pagando o corretor para{' '}
              <span className="font-black text-zinc-800">
                {modalBaixaParametros.ids.length}{' '}
                parcela(s)
              </span>{' '}
              com valor bruto de{' '}
              <strong>
                {formatBRL(
                  modalBaixaParametros.valorBrutoTotal
                )}
              </strong>
              .
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border space-y-3">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">
                  Percentual de Desconto/Taxa (%)
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={pctDescontoInput}
                    onChange={(e) =>
                      setPctDescontoInput(
                        Math.min(
                          100,
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          )
                        )
                      )
                    }
                    className="w-full bg-white border p-3 rounded-xl text-sm font-black outline-none pr-10"
                    placeholder="Ex: 6"
                  />

                  <span className="absolute right-4 top-3.5 text-zinc-400 font-bold text-sm">
                    %
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs border-t border-dashed">
                <span className="text-zinc-400 font-bold">
                  Líquido Estimado para Caixa:
                </span>

                <span className="font-mono font-black text-emerald-600 text-sm">
                  {formatBRL(
                    modalBaixaParametros.valorBrutoTotal *
                      (1 -
                        pctDescontoInput / 100)
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-2 text-[10px] font-black uppercase">
              <button
                onClick={() =>
                  setModalBaixaParametros({
                    visivel: false,
                    ids: [],
                    valorBrutoTotal: 0
                  })
                }
                className="flex-1 py-3 border rounded-xl text-zinc-400"
              >
                Cancelar
              </button>

              <button
                onClick={processarConfirmacaoBaixaBD}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-500 transition-all"
              >
                Confirmar e Liquidar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAporte && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border p-6 rounded-[2rem] shadow-2xl max-w-md w-full space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Gestão Financeira
              </span>

              <h3 className="text-sm font-black text-zinc-900 uppercase mt-2">
                Registrar Recebimento de Aporte/Repasse
                (Crédito)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">
                  Valor Recebido (R$)
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={valorAporte}
                  onChange={(e) =>
                    setValorAporte(
                      Number(e.target.value)
                    )
                  }
                  className="w-full bg-zinc-50 p-2.5 rounded-xl text-xs font-bold border"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">
                  Data
                </label>

                <input
                  type="date"
                  value={dataAporte}
                  onChange={(e) =>
                    setDataAporte(e.target.value)
                  }
                  className="w-full bg-zinc-50 p-2.5 rounded-xl text-xs font-bold border"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">
                Identificação / Origem
              </label>

              <textarea
                rows={2}
                placeholder="EX: REPASSE QUENZENA CORRETORA MÃE"
                value={observacaoAporte}
                onChange={(e) =>
                  setObservacaoAporte(
                    e.target.value
                  )
                }
                className="w-full bg-zinc-50 p-2.5 rounded-xl text-[11px] font-bold border uppercase"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setModalAporte(false)
                }
                className="flex-1 py-2.5 border rounded-xl text-[10px] font-black uppercase text-zinc-400"
              >
                Cancelar
              </button>

              <button
                onClick={lancarAporteRepasse}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase"
              >
                Registrar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFluxo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col h-[85vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Conciliação Diária de Caixa
                </span>

                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase mt-2">
                  Extrato de Movimentação do Caixa
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={imprimirRelatorioCaixaPDF}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm hover:bg-emerald-500 transition-all"
                >
                  <Printer size={14} />
                  Imprimir Extrato PDF
                </button>

                <button
                  onClick={() =>
                    setModalFluxo(false)
                  }
                  className="text-zinc-400 hover:text-zinc-600 bg-zinc-100 p-2 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  const dados =
                    calcularFluxoCaixaConsolidado();

                  const totalEntradas =
                    dados.reduce(
                      (acc, dia) =>
                        acc + dia.totalCredito,
                      0
                    );

                  const totalBaixas =
                    dados.reduce(
                      (acc, dia) =>
                        acc +
                        dia.totalDebitoLiquido,
                      0
                    );

                  const saldoDiferenca =
                    totalEntradas - totalBaixas;

                  const totalPrevistoBruto =
                    provisoesFiltradas
                      .filter(
                        (p) =>
                          p.status_recebimento_seguradora ===
                          'PREVISTO'
                      )
                      .reduce(
                        (acc, p) =>
                          acc +
                          parseToNumber(
                            p.valor_direito_corretor
                          ),
                        0
                      );

                  const totalAReceberLiquido =
                    totalPrevistoBruto -
                    saldoDiferenca;

                  return (
                    <>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                          Total Entradas
                        </span>

                        <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                          {formatBRL(
                            totalEntradas
                          )}
                        </span>
                      </div>

                      <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-800/50">
                        <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block mb-1">
                          Total Baixas
                        </span>

                        <span className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">
                          {formatBRL(
                            totalBaixas
                          )}
                        </span>
                      </div>

                      <div
                        className={`p-4 rounded-2xl border ${
                          saldoDiferenca < 0
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">
                          Saldo Diferença
                        </span>

                        <span
                          className={`text-lg font-black font-mono ${
                            saldoDiferenca < 0
                              ? 'text-rose-700'
                              : 'text-zinc-900'
                          }`}
                        >
                          {formatBRL(
                            saldoDiferenca
                          )}
                        </span>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block mb-1">
                          A Receber Líq.
                        </span>

                        <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
                          {formatBRL(
                            totalAReceberLiquido
                          )}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {calcularFluxoCaixaConsolidado()
                .length === 0 ? (
                <div className="p-12 text-center text-zinc-400 font-black uppercase">
                  Nenhuma movimentação de caixa
                  registrada até o momento.
                </div>
              ) : (
                calcularFluxoCaixaConsolidado().map(
                  (dia) => {
                    const expandido =
                      diasExpandidosFluxo.includes(
                        dia.dataIso
                      );

                    const dataFormatada =
                      dia.dataIso
                        .split('-')
                        .reverse()
                        .join('/');

                    return (
                      <div
                        key={dia.dataIso}
                        className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
                      >
                        <div
                          onClick={() =>
                            toggleDiaFluxoExpandido(
                              dia.dataIso
                            )
                          }
                          className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/60 transition-colors select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-zinc-900 text-white p-2.5 rounded-2xl text-center font-mono font-black min-w-[70px] text-xs">
                              {dataFormatada}
                            </div>

                            <div>
                              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">
                                Movimentos do Dia
                              </p>

                              <span className="text-xs font-black text-zinc-500 uppercase flex items-center gap-1">
                                {
                                  dia
                                    .detalhesRepasses
                                    .length
                                }{' '}
                                Créditos |{' '}
                                {
                                  dia
                                    .detalhesProvisoes
                                    .length
                                }{' '}
                                Débitos
                                {expandido ? (
                                  <ChevronUp
                                    size={14}
                                  />
                                ) : (
                                  <ChevronDown
                                    size={14}
                                  />
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right w-full md:w-auto justify-end">
                            <div>
                              <span className="block text-[9px] font-black uppercase text-emerald-600">
                                Crédito (+)
                              </span>

                              <span className="font-mono font-bold text-xs text-emerald-600">
                                +
                                {formatBRL(
                                  dia.totalCredito
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black uppercase text-rose-600">
                                Débito Líquido (-)
                              </span>

                              <span className="font-mono font-bold text-xs text-rose-600">
                                -
                                {formatBRL(
                                  dia.totalDebitoLiquido
                                )}
                              </span>
                            </div>

                            <div className="border-l pl-4 min-w-[120px]">
                              <span className="block text-[9px] font-black uppercase text-zinc-400">
                                Saldo Movimento
                              </span>

                              <span
                                className={`font-mono font-black text-sm ${
                                  dia.saldoDia >= 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {dia.saldoDia >= 0
                                  ? `+${formatBRL(
                                      dia.saldoDia
                                    )}`
                                  : formatBRL(
                                      dia.saldoDia
                                    )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {expandido && (
                          <div className="bg-zinc-50/50 border-t p-4 space-y-3 text-xs">
                            {dia.detalhesRepasses
                              .length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">
                                  Entradas de Crédito
                                  (Aportes/Repasses)
                                </span>

                                {dia.detalhesRepasses.map(
                                  (
                                    rep,
                                    idx
                                  ) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center bg-white p-2 rounded-xl border border-emerald-100 font-medium"
                                    >
                                      <span className="text-zinc-600 uppercase flex items-center gap-1.5">
                                        <ArrowRight
                                          size={12}
                                          className="text-emerald-500"
                                        />
                                        {rep.obs}
                                      </span>

                                      <strong className="font-mono text-emerald-600">
                                        +
                                        {formatBRL(
                                          rep.valor
                                        )}
                                      </strong>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {dia.detalhesProvisoes
                              .length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 block">
                                  Saídas por
                                  Baixas/Liquidações
                                  (Comissões Corretor)
                                </span>

                                {dia.detalhesProvisoes.map(
                                  (
                                    prov,
                                    idx
                                  ) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center bg-white p-2 rounded-xl border border-zinc-100"
                                    >
                                      <span className="text-zinc-700 uppercase font-bold flex items-center gap-1.5">
                                        <ArrowRight
                                          size={12}
                                          className="text-zinc-300"
                                        />
                                        {
                                          prov.cliente
                                        }{' '}
                                        (Parc.{' '}
                                        {
                                          prov.parcela
                                        }
                                        )
                                      </span>

                                      <div className="text-right font-mono text-[11px]">
                                        <span className="text-zinc-400 block text-[10px]">
                                          Bruto original:{' '}
                                          {formatBRL(
                                            prov.bruto
                                          )}
                                        </span>

                                        <strong className="text-rose-600">
                                          -
                                          {formatBRL(
                                            prov.liquido
                                          )}{' '}
                                          {prov.desconto >
                                          0
                                            ? `(-${prov.desconto}%)`
                                            : ''}
                                        </strong>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>
        </div>
      )}

      {modalDetalhe && itemDetalhado && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3">

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

          {/* =========================================================
              CABEÇALHO
          ========================================================= */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">

            <div className="flex justify-between items-center">

              <div className="flex items-center gap-2">

                <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                  Raio-X
                </span>

                <h3 className="text-[11px] font-black uppercase text-zinc-800 dark:text-zinc-100">
                  Origem da Comissão
                </h3>

              </div>

              <button
                onClick={() => setModalDetalhe(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
              >
                ✕
              </button>

            </div>

          </div>


          {/* =========================================================
              CONTEÚDO
          ========================================================= */}
          <div className="p-3 space-y-2">


            {/* =======================================================
                IDENTIFICAÇÃO
            ======================================================= */}
            <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2">

              <div className="min-w-0">
                <span className="block text-[8px] text-zinc-400 uppercase">
                  Cliente
                </span>

                <strong className="block text-[10px] uppercase truncate">
                  {obterNomeCliente(
                    itemDetalhado.tab_comissoes_regras?.tab_clientes
                  )}
                </strong>
              </div>


              <div className="min-w-0">
                <span className="block text-[8px] text-zinc-400 uppercase">
                  Produto
                </span>

                <strong className="block text-[10px] uppercase truncate">
                  {itemDetalhado.tab_comissoes_regras
                    ?.base_produtos?.nome || '—'}
                </strong>
              </div>


              <div className="min-w-0">
                <span className="block text-[8px] text-zinc-400 uppercase">
                  Seguradora
                </span>

                <strong className="block text-[10px] uppercase truncate">
                  {itemDetalhado.tab_comissoes_regras
                    ?.base_seguradoras?.nome || '—'}
                </strong>
              </div>

            </div>


            {/* =======================================================
                REGRA CONTRATADA
            ======================================================= */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">

              <div className="flex items-center justify-between gap-3 flex-wrap">

                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  Regra Contratada
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-zinc-400 uppercase">
                    Base
                  </span>

                  <strong className="text-[10px] font-mono">
                    {formatBRL(
                      parseToNumber(
                        itemDetalhado.tab_comissoes_regras
                          ?.base_calculo_valor
                      )
                    )}
                  </strong>
                </div>


                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-zinc-400 uppercase">
                    Venda
                  </span>

                  <strong className="text-[10px]">
                    {parseToNumber(
                      itemDetalhado.tab_comissoes_regras
                        ?.pct_comissao_venda
                    )}%
                  </strong>
                </div>


                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-zinc-400 uppercase">
                    Recorrência
                  </span>

                  <strong className="text-[10px]">
                    {itemDetalhado.tab_comissoes_regras
                      ?.tipo_recorrencia || '—'}
                  </strong>
                </div>


                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-zinc-400 uppercase">
                    Parc.
                  </span>

                  <strong className="text-[10px]">
                    {itemDetalhado.tab_comissoes_regras
                      ?.quantidade_parcelas || 1}
                  </strong>
                </div>


                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-zinc-400 uppercase">
                    Venc.
                  </span>

                  <strong className="text-[10px]">
                    Dia {itemDetalhado.tab_comissoes_regras
                      ?.dia_vencimento_parcelas ?? '—'}
                  </strong>
                </div>

              </div>

            </div>


            {/* =======================================================
                SPLIT + IOF
            ======================================================= */}
            <div className="grid grid-cols-2 gap-2">


              {/* SPLITS */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">

                <h4 className="text-[9px] font-black uppercase tracking-wider text-blue-600 mb-1.5">
                  Distribuição — Splits
                </h4>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">
                    Corretor
                  </span>

                  <strong className="font-mono">
                    {parseToNumber(
                      itemDetalhado.tab_comissoes_regras?.pct_corretor
                    )}%
                  </strong>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">
                    Parceiro
                  </span>

                  <strong className="font-mono">
                    {parseToNumber(
                      itemDetalhado.tab_comissoes_regras?.pct_parceiro
                    )}%
                  </strong>
                </div>

              </div>


              {/* IOF */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">

                <h4 className="text-[9px] font-black uppercase tracking-wider text-amber-600 mb-1.5">
                  IOF
                </h4>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">
                    Descontar?
                  </span>

                  <strong>
                    {itemDetalhado.tab_comissoes_regras?.descontar_iof
                      ? 'Sim'
                      : 'Não'}
                  </strong>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">
                    Valor informado
                  </span>

                  <strong className="font-mono">
                    {formatBRL(
                      parseToNumber(
                        itemDetalhado.tab_comissoes_regras?.valor_iof
                      )
                    )}
                  </strong>
                </div>

              </div>

            </div>


            {/* =======================================================
                DESCONTOS + FAIXAS
            ======================================================= */}
            <div className="grid grid-cols-2 gap-2">


              {/* DESCONTOS SOBRE COMISSÃO */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">

                <h4 className="text-[9px] font-black uppercase tracking-wider text-purple-600 mb-1.5">
                  Descontos sobre a Comissão
                </h4>

                {Array.isArray(
                  itemDetalhado.tab_comissoes_regras
                    ?.descontos_comissao_json
                ) &&
                itemDetalhado.tab_comissoes_regras
                  .descontos_comissao_json.length > 0 ? (

                  <div className="space-y-1">

                    {itemDetalhado.tab_comissoes_regras
                      .descontos_comissao_json.map(
                        (desconto: any, index: number) => (

                          <div
                            key={desconto.id || index}
                            className="flex justify-between items-center text-[10px]"
                          >

                            <span className="text-zinc-500 truncate pr-2">
                              {desconto.nome || 'Desconto'}
                            </span>

                            <strong className="font-mono text-rose-600 shrink-0">
                              {parseToNumber(
                                desconto.percentual
                              )}%
                            </strong>

                          </div>

                        )
                      )}

                  </div>

                ) : (

                  <p className="text-[9px] text-zinc-400">
                    Nenhum desconto cadastrado.
                  </p>

                )}

              </div>


              {/* FAIXAS */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">

                <h4 className="text-[9px] font-black uppercase tracking-wider text-indigo-600 mb-1.5">
                  Faixas de Comissão
                </h4>

                {Array.isArray(
                  itemDetalhado.tab_comissoes_regras
                    ?.meta_faixas_json
                ) &&
                itemDetalhado.tab_comissoes_regras
                  .meta_faixas_json.length > 0 ? (

                  <div className="space-y-1">

                    {itemDetalhado.tab_comissoes_regras
                      .meta_faixas_json.map(
                        (faixa: any, index: number) => (

                          <div
                            key={faixa.id || index}
                            className="flex justify-between items-center text-[10px]"
                          >

                            <span className="text-zinc-500">
                              Parcela {faixa.parcelaInicio} até{' '}
                              {faixa.parcelaFim}
                            </span>

                            <strong className="font-mono">
                              {parseToNumber(
                                faixa.pctComissaoVenda
                              )}%
                            </strong>

                          </div>

                        )
                      )}

                  </div>

                ) : (

                  <p className="text-[9px] text-zinc-400">
                    Nenhuma faixa cadastrada.
                  </p>

                )}

              </div>

            </div>


            {/* =======================================================
                DESCONTOS DO CORRETOR
            ======================================================= */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">

              <div className="flex items-center justify-between mb-1.5">

                <h4 className="text-[9px] font-black uppercase tracking-wider text-orange-600">
                  Descontos do Corretor
                </h4>

              </div>

              {Array.isArray(
                itemDetalhado.tab_comissoes_regras
                  ?.descontos_corretor_json
              ) &&
              itemDetalhado.tab_comissoes_regras
                .descontos_corretor_json.length > 0 ? (

                <div className="grid grid-cols-2 gap-x-6 gap-y-1">

                  {itemDetalhado.tab_comissoes_regras
                    .descontos_corretor_json.map(
                      (desconto: any, index: number) => (

                        <div
                          key={desconto.id || index}
                          className="flex justify-between items-center text-[10px]"
                        >

                          <span className="text-zinc-500 truncate pr-2">
                            {desconto.nome || 'Desconto'}
                            {desconto.tipo
                              ? ` (${desconto.tipo})`
                              : ''}
                          </span>

                          <strong className="font-mono text-rose-600 shrink-0">
                            {desconto.tipo === 'PERCENTUAL'
                              ? `${parseToNumber(desconto.valor)}%`
                              : formatBRL(
                                  parseToNumber(
                                    desconto.valor
                                  )
                                )}
                          </strong>

                        </div>

                      )
                    )}

                </div>

              ) : (

                <p className="text-[9px] text-zinc-400">
                  Nenhum desconto cadastrado.
                </p>

              )}

            </div>


            {/* =======================================================
                RESULTADOS FINANCEIROS
            ======================================================= */}
            <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-2">


              {/* DIREITO ORIGINAL */}
              <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-xl">

                <span className="text-[9px] font-bold text-blue-700">
                  Direito Corretor Original (
                  {parseToNumber(
                    itemDetalhado.tab_comissoes_regras
                      ?.pct_corretor
                  )}
                  %)
                </span>

                <span className="text-[11px] font-black text-blue-700 font-mono">
                  {formatBRL(
                    parseToNumber(
                      itemDetalhado.valor_direito_corretor
                    )
                  )}
                </span>

              </div>


              {/* LÍQUIDO */}
              <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-xl">

                <span className="text-[9px] font-bold text-emerald-700">
                  Líquido após Acerto de Caixa
                </span>

                <span className="text-[11px] font-black text-emerald-700 font-mono">
                  {formatBRL(
                    itemDetalhado.valor_recebido_liquido !== null
                      ? parseToNumber(
                          itemDetalhado.valor_recebido_liquido
                        )
                      : parseToNumber(
                          itemDetalhado.valor_direito_corretor
                        )
                  )}
                </span>

              </div>

            </div>

          </div>


          {/* =========================================================
              RODAPÉ
          ========================================================= */}
          <div className="px-3 pb-3">

            <button
              onClick={() => setModalDetalhe(false)}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[9px] uppercase rounded-xl transition"
            >
              Fechar Diagnóstico
            </button>

          </div>

        </div>
      </div>
    )}
    </div>
  );
};