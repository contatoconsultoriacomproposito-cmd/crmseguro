import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, Edit3, Loader2, Calendar, Hash, ShieldCheck, Users, Handshake, ShoppingCart, Download, 
  FileSpreadsheet, DollarSign, RefreshCw, Building2, Tag, Eye, X, Mail, Phone, FileText, CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatarDataBR } from "../../utils/dateUtils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ModalRenovacao from "./ModalRenovacao";
import { ModalComissoes } from "../../components/kanban/components_visual_card/ModalComissoes";

interface ItemRenovacaoFormatado {
  id_item: string;
  valor: number;
  valor_liquido: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  data_venda: string;
  produto: string;
  seguradora: string;
  seguradora_id: string;
  proposta_id: string;
  numero_proposta: string;
  numero_cotacao: string;
  numero_apolice: string;
  status: string;
  status_renovacao?: string;
  motivo_cancelamento?: string;
  tipo_negocio: string;
  cliente: string;
  corretor: string;
  corretor_id: string;
  parceiro_id: string | null;
  periodicidade: string;
  cliente_id: string;
}

export default function ProdutosLista() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<ItemRenovacaoFormatado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Estados para Filtros Avançados
  const [corretores, setCorretores] = useState<any[]>([]);
  const [parceiros, setParceiros] = useState<any[]>([]);
  const [seguradoras, setSeguradoras] = useState<any[]>([]);
  
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [selectedParceiros, setSelectedParceiros] = useState<string[]>([]);
  const [selectedSeguradoras, setSelectedSeguradoras] = useState<string[]>([]);
  const [selectedTiposNegocio, setSelectedTiposNegocio] = useState<string[]>([]);
  const [selectedPeriodicidades, setSelectedPeriodicidades] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([]);
  
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataVendaInicio, setDataVendaInicio] = useState("");
  const [dataVendaFim, setDataVendaFim] = useState("");
  const [listaProdutosUnicos, setListaProdutosUnicos] = useState<string[]>([]);
  
  const [modalRenovacao, setModalRenovacao] = useState<{isOpen: boolean, item: any}>({
    isOpen: false,
    item: null
  });

  const [modalComissaoAberto, setModalComissaoAberto] = useState(false);
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  
  // Controle de comissões existentes e carregamento do Drawer do cliente
  const [itensComComissao, setItensComComissao] = useState<Set<string>>(new Set());
  const [clienteDrawer, setClienteDrawer] = useState<{ isOpen: boolean; loading: boolean; dados: any }>({
    isOpen: false,
    loading: false,
    dados: null
  });

  const abrirModalComissao = (id: string) => {
    setItemSelecionadoId(id);
    setModalComissaoAberto(true);
  };

  // Buscar dados resumidos do cliente para o Drawer de visualização rápida
  const abrirVisualizacaoCliente = async (clienteId: string) => {
    if (!clienteId) return;
    setClienteDrawer({ isOpen: true, loading: true, dados: null });
    try {
      const { data, error } = await supabase
        .from("tab_clientes")
        .select('id, nome, razao_social, cpf, cnpj, email, telefone_whats, tipo_cliente, cep, logradouro, numero, bairro, municipio, uf')
        .eq("id", clienteId)
        .single();

      if (error) throw error;
      setClienteDrawer({ isOpen: true, loading: false, dados: data });
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
      setClienteDrawer(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario')
          .eq('id', user.id)
          .single();
        
        if (perfil) {
          setUserProfile(perfil);
          const [corr, parc, segu] = await Promise.all([
            supabase.from('usuarios_perfis').select('id, nome').eq('corretora_id', perfil.corretora_id).eq('tipo_usuario', 'CORRETOR'),
            supabase.from('tab_parceiros').select('id, nome_parceiro').eq('corretora_id', perfil.corretora_id),
            supabase.from('base_seguradoras').select('id, nome').eq('ativo', true).order('nome')
          ]);
          
          setCorretores(corr.data || []);
          setParceiros(parc.data || []);
          setSeguradoras(segu.data || []);

          if (perfil.tipo_usuario === 'CORRETOR') {
            setSelectedCorretores([perfil.id]);
          }
          
          fetchItensRenovacao(perfil);
        }
      }
    }
    getInitialData();
  }, []);

  async function fetchItensRenovacao(perfilAtual?: any) {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const perfilAtivo = perfilAtual || userProfile;
      if (!perfilAtivo?.corretora_id) return;

      // 🔥 ALTERAÇÃO AQUI: Mudamos o relacionamento do 'usuarios_perfis' para a raiz da query 
      // e trouxemos o 'corretor_id' direto de 'tab_proposta_itens'.
      let query = supabase
        .from("tab_proposta_itens")
        .select(`
          id,
          valor_premio,
          valor_liquido,
          data_inicio_vigencia,
          data_fim_vigencia,
          numero_cotacao,
          numero_apolice,
          periodicidade,
          status_renovacao,
          motivo_cancelamento,
          corretor_id,
          base_produtos (nome),
          usuarios_perfis!tab_proposta_itens_corretor_id_fkey (id, nome),
          tab_proposta_opcoes!inner (
            seguradora_id,
            base_seguradoras (nome),
            tab_propostas!inner (
              id,
              numero_proposta,
              status,
              corretora_id,
              parceiro_id,
              data_venda,
              cliente_id,
              tipo_negocio,
              tab_clientes (id, nome, razao_social, tipo_cliente)
            )
          )
        `);

      query = query.eq("tab_proposta_opcoes.tab_propostas.corretora_id", perfilAtivo.corretora_id);
      
      // 🔥 ALTERAÇÃO AQUI: Filtro de segurança por corretor agora é direto na raiz (muito mais rápido)
      if (perfilAtivo.tipo_usuario === 'CORRETOR') {
        query = query.eq("corretor_id", perfilAtivo.id);
      }

      const { data, error } = await query.order("data_fim_vigencia", { ascending: true });
      if (error) throw error;

      // Cruzamento imediato para identificar comissões lançadas
      const itemIds = data?.map((i: any) => i.id) || [];
      if (itemIds.length > 0) {
        const { data: lancadas } = await supabase
          .from("tab_comissoes_regras")
          .select("item_id")
          .in("item_id", itemIds);
        
        const setLancadas = new Set<string>(lancadas?.map(l => l.item_id) || []);
        setItensComComissao(setLancadas);
      }

      const formatado = data?.map((item: any) => { 
        const itemOpcao = Array.isArray(item.tab_proposta_opcoes) ? item.tab_proposta_opcoes[0] : item.tab_proposta_opcoes;
        const itemProposta = Array.isArray(itemOpcao?.tab_propostas) ? itemOpcao.tab_propostas[0] : itemOpcao?.tab_propostas;
        const itemCliente = Array.isArray(itemProposta?.tab_clientes) ? itemProposta.tab_clientes[0] : itemProposta?.tab_clientes;
        const itemSeguradora = Array.isArray(itemOpcao?.base_seguradoras) ? itemOpcao.base_seguradoras[0] : itemOpcao?.base_seguradoras;
        const itemProduto = Array.isArray(item.base_produtos) ? item.base_produtos[0] : item.base_produtos;
        
        // 🔥 ALTERAÇÃO AQUI: O corretor agora é resolvido a partir da raiz da query
        const itemCorretor = Array.isArray(item.usuarios_perfis) ? item.usuarios_perfis[0] : item.usuarios_perfis;

        return {
          id_item: item.id,
          valor: item.valor_premio,
          valor_liquido: item.valor_liquido || 0,
          data_inicio_vigencia: item.data_inicio_vigencia,
          data_fim_vigencia: item.data_fim_vigencia,
          data_venda: itemProposta?.data_venda || "", 
          numero_cotacao: item.numero_cotacao || "",
          numero_apolice: item.numero_apolice || "",
          produto: itemProduto?.nome || "Não definido", 
          seguradora: itemSeguradora?.nome || "Não informada",
          seguradora_id: itemOpcao?.seguradora_id || "",
          proposta_id: itemProposta?.id,
          cliente_id: itemCliente?.id || itemProposta?.cliente_id || "", 
          numero_proposta: itemProposta?.numero_proposta,
          status: itemProposta?.status,
          status_renovacao: item.status_renovacao, 
          motivo_cancelamento: item.motivo_cancelamento,
          tipo_negocio: itemProposta?.tipo_negocio || "Novo",
          periodicidade: item.periodicidade || "ANUAL",
          cliente: itemCliente?.tipo_cliente === 'PJ' ? itemCliente?.razao_social : itemCliente?.nome,
          // 🔥 Usando os dados vindos direto do item raiz
          corretor: itemCorretor?.nome || "Não informado", 
          corretor_id: item.corretor_id,
          parceiro_id: itemProposta?.parceiro_id
        };
      });

      setItens(formatado || []);
      const prods = Array.from(new Set(formatado?.map(i => i.produto))).sort();
      setListaProdutosUnicos(prods as string[]);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateItem(id_item: string, field: string, value: any) {
    try {
      const { error } = await supabase
        .from("tab_proposta_itens")
        .update({ [field]: value })
        .eq("id", id_item);

      if (error) throw error;

      setItens(prev => prev.map(item => 
        item.id_item === id_item ? { ...item, [field]: value } : item
      ));
    } catch (err) {
      console.error("Erro ao atualizar item:", err);
      alert("Erro ao salvar alteração no item.");
    }
  }

  async function handleUpdateProposta(proposta_id: string, field: string, value: any) {
    try {
      const { error } = await supabase
        .from("tab_propostas")
        .update({ [field]: value })
        .eq("id", proposta_id);

      if (error) throw error;

      setItens(prev => prev.map(item => 
        item.proposta_id === proposta_id ? { ...item, [field]: value } : item
      ));
    } catch (err) {
      console.error("Erro ao atualizar proposta:", err);
      alert("Erro ao salvar alteração na proposta.");
    }
  }

  const itensFiltrados = useMemo(() => {
    return itens.filter(i => {
      const matchTexto = 
        (i.numero_proposta?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (i.cliente?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (i.produto?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (i.numero_apolice?.toLowerCase() || "").includes(filter.toLowerCase());

      const matchCorretor = selectedCorretores.length === 0 || selectedCorretores.includes(i.corretor_id);
      const matchProdutoFiltro = selectedProdutos.length === 0 || selectedProdutos.includes(i.produto);
      const matchSeguradora = selectedSeguradoras.length === 0 || selectedSeguradoras.includes(i.seguradora_id);
      const matchTipoNegocio = selectedTiposNegocio.length === 0 || selectedTiposNegocio.includes(i.tipo_negocio);

      const matchParceiro = selectedParceiros.length === 0 || 
        (selectedParceiros.includes("venda_direta") && !i.parceiro_id) || 
        (i.parceiro_id && selectedParceiros.includes(i.parceiro_id));

      const matchDataRenovacao = i.periodicidade === 'ÚNICO' || (
        (!dataInicio || i.data_fim_vigencia >= dataInicio) &&
        (!dataFim || i.data_fim_vigencia <= dataFim)
      );

      const matchDataVenda = (!dataVendaInicio || i.data_venda >= dataVendaInicio) &&
                             (!dataVendaFim || i.data_venda <= dataVendaFim);

      const matchPeriodicidade = selectedPeriodicidades.length === 0 || 
                                 selectedPeriodicidades.includes(i.periodicidade);

      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(i.status);

      return matchTexto && matchCorretor && matchParceiro && matchDataRenovacao && 
             matchDataVenda && matchPeriodicidade && matchStatus && 
             matchProdutoFiltro && matchSeguradora && matchTipoNegocio;
    });
  }, [filter, dataInicio, dataFim, dataVendaInicio, dataVendaFim, selectedCorretores, selectedParceiros, selectedPeriodicidades, selectedStatuses, selectedProdutos, selectedSeguradoras, selectedTiposNegocio, itens]);

  const exportarExcel = () => {
    const dadosParaExportar = itensFiltrados.map(i => ({
      "Proposta": i.numero_proposta,
      "Cliente": i.cliente,
      "Seguradora": i.seguradora,
      "Produto": i.produto,
      "Tipo": i.tipo_negocio,
      "Venda": i.data_venda ? formatarDataBR(i.data_venda) : "-",
      "Início Vigência": formatarDataBR(i.data_inicio_vigencia),
      "Fim Vigência (Renovação)": i.periodicidade === 'ÚNICO' ? "N/A (ÚNICO)" : (i.data_fim_vigencia ? formatarDataBR(i.data_fim_vigencia) : "-"),
      "Valor Prêmio": i.valor,
      "Valor Líquido": i.valor_liquido,
      "Apólice": i.numero_apolice || "N/A"
    }));

    const totalGeral = itensFiltrados.reduce((acc, i) => acc + (i.valor || 0), 0);
    const totalLiquido = itensFiltrados.reduce((acc, i) => acc + (i.valor_liquido || 0), 0);

    dadosParaExportar.push({
      "Proposta": "TOTAL GERAL",
      "Valor Prêmio": totalGeral,
      "Valor Líquido": totalLiquido
    } as any);

    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `Relatorio_Produtos_${new Date().getTime()}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Relatório de Produtos e Vigências", 14, 15);
    
    const tableData: any[][] = itensFiltrados.map(i => [
      i.numero_proposta,
      i.cliente,
      i.produto,
      i.tipo_negocio,
      i.numero_apolice || "-",
      i.data_venda ? formatarDataBR(i.data_venda) : "-",
      i.periodicidade === 'ÚNICO' ? "PAGTO ÚNICO" : formatarDataBR(i.data_fim_vigencia),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor_liquido)
    ]);

    const totalGeral = itensFiltrados.reduce((acc, i) => acc + (i.valor || 0), 0);
    const totalLiquido = itensFiltrados.reduce((acc, i) => acc + (i.valor_liquido || 0), 0);

    tableData.push([
      { content: 'TOTAL GERAL', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral), styles: { fontStyle: 'bold' } },
      { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLiquido), styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      head: [['Proposta', 'Cliente', 'Produto', 'Tipo', 'Apólice', 'Venda', 'Renovação', 'Valor Bruto', 'Valor Líquido']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 6 },
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Produtos_Vigencias_${new Date().getTime()}.pdf`);
  };
  
  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen relative overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black italic uppercase text-slate-800 tracking-tighter">
                Produtos & Vigências
              </h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase italic tracking-widest">
                Controle de Apólices e Renovação Automática
              </p>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button 
                onClick={exportarExcel}
                className="flex items-center gap-2 px-4 h-11 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all shadow-sm"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
              
              <button 
                onClick={exportarPDF}
                className="flex items-center gap-2 px-4 h-11 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all shadow-sm"
              >
                <Download size={16} /> PDF
              </button>

              <div className="w-[1px] h-8 bg-slate-200 mx-2 hidden lg:block" />

              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente, produto ou apólice..."
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* FILTROS AVANÇADOS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            {/* LINHA 1: ENTIDADES E STATUS */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Users size={12}/> Corretores
                </label>
                <select 
                  multiple
                  className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedCorretores}
                  onChange={(e) => setSelectedCorretores(Array.from(e.target.selectedOptions, opt => opt.value))}
                  disabled={userProfile?.tipo_usuario === 'CORRETOR'}
                >
                  {corretores.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Handshake size={12}/> Parceiros
                </label>
                <select 
                  multiple
                  className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedParceiros}
                  onChange={(e) => setSelectedParceiros(Array.from(e.target.selectedOptions, opt => opt.value))}
                >
                  <option value="venda_direta">VENDA DIRETA (SEM PARCEIRO)</option>
                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome_parceiro.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1">
                  <Building2 size={12}/> Seguradoras
                </label>
                <select 
                  multiple
                  className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedSeguradoras}
                  onChange={(e) => setSelectedSeguradoras(Array.from(e.target.selectedOptions, opt => opt.value))}
                >
                  {seguradoras.map(s => <option key={s.id} value={s.id}>{s.nome.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1">
                  <Calendar size={12}/> Periodicidade
                </label>
                <select 
                  multiple
                  className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedPeriodicidades}
                  onChange={(e) => setSelectedPeriodicidades(Array.from(e.target.selectedOptions, opt => opt.value))}
                >
                  <option value="ANUAL">ANUAL</option>
                  <option value="MENSAL">MENSAL</option>
                  <option value="ÚNICO">ÚNICO</option>
                  <option value="PERSONALIZADO">PERSONALIZADO</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1">
                  <ShieldCheck size={12}/> Status da Proposta
                </label>
                <select 
                  multiple
                  className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedStatuses}
                  onChange={(e) => setSelectedStatuses(Array.from(e.target.selectedOptions, opt => opt.value))}
                >
                  <option value="Vendido">VENDIDO</option>
                  <option value="Perdido">PERDIDO</option>
                  <option value="Em Negociação">EM NEGOCIAÇÃO</option>
                  <option value="Cancelado">CANCELADO</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                  <Tag size={12}/> Tipo de Negócio
                </label>
                <select 
                  multiple
                  className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedTiposNegocio}
                  onChange={(e) => setSelectedTiposNegocio(Array.from(e.target.selectedOptions, opt => opt.value))}
                >
                  <option value="Novo">NOVO</option>
                  <option value="Renovação">RENOVAÇÃO</option>
                </select>
              </div>
            </div>

            {/* LINHA 2: PRODUTOS E DATAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-100 pt-5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                  <ShoppingCart size={12}/> Produtos
                </label>
                <select 
                  multiple
                  className="w-full h-20 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={selectedProdutos}
                  onChange={(e) => setSelectedProdutos(Array.from(e.target.selectedOptions, opt => opt.value))}
                >
                  {listaProdutosUnicos.map(prod => (
                    <option key={prod} value={prod}>{prod.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={11}/> Período de Renovação (De / Até)
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input type="date" className="w-full h-10 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  <input type="date" className="w-full h-10 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
                  <ShoppingCart size={11}/> Período de Venda (De / Até)
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input type="date" className="w-full h-10 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataVendaInicio} onChange={(e) => setDataVendaInicio(e.target.value)} />
                  <input type="date" className="w-full h-10 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataVendaFim} onChange={(e) => setDataVendaFim(e.target.value)} />
                </div>
              </div>
            </div>

            {/* BOTÃO LIMPAR */}
            {(selectedCorretores.length > 0 || selectedParceiros.length > 0 || selectedSeguradoras.length > 0 || selectedTiposNegocio.length > 0 || selectedProdutos.length > 0 || selectedPeriodicidades.length > 0 || selectedStatuses.length > 0 || dataInicio || dataFim || dataVendaInicio || dataVendaFim) && (
              <div className="flex justify-end border-t border-slate-50 pt-3">
                <button 
                  onClick={() => {
                    if(userProfile?.tipo_usuario !== 'CORRETOR') setSelectedCorretores([]);
                    setSelectedParceiros([]);
                    setSelectedSeguradoras([]);
                    setSelectedTiposNegocio([]);
                    setSelectedProdutos([]);
                    setDataInicio("");
                    setDataFim("");
                    setDataVendaInicio("");
                    setDataVendaFim("");
                    setSelectedPeriodicidades([]);
                    setSelectedStatuses([]);
                  }}
                  className="text-[10px] font-black text-red-500 uppercase hover:underline"
                >
                  × Limpar Todos os Filtros
                </button>
              </div>
            )}
          </div>
        </header>

        {/* CONTÊINER PRINCIPAL: Trava o componente na largura máxima da tela e impede vazamento */}
        <div className="w-full max-w-full bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden block">
          
          {/* CONTÊINER DE ROLAGEM: Isolado com 'block' e 'w-full' para garantir o gatilho do scroll horizontal */}
          <div className="overflow-x-auto w-full block clear-both scrollbar-thin">
            
            {/* TABELA: Ajustada para min-w-[1200px] para caber perfeitamente em telas padrão sem esmagar */}
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px] table-auto">
              <thead>
                <tr className="bg-slate-50/75">
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[10%]">Proposta</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[20%]">Cliente / Seguradora</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[18%]">Produto & Valores</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-blue-600 border-b border-slate-100 tracking-wider whitespace-nowrap w-[15%]">Nº Cotação / Apólice</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-emerald-500 border-b border-slate-100 tracking-wider whitespace-nowrap w-[12%]">Data Venda / Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap w-[13%]">Vigência / Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap text-center w-[12%]">Controle Renov.</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-wider whitespace-nowrap text-center w-[10%]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                    </td>
                  </tr>
                ) : itensFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                      Nenhum item encontrado
                    </td>
                  </tr>
                ) : (
                  itensFiltrados.map((item) => {
                    const comissaoLancada = itensComComissao.has(item.id_item);
                    
                    return (
                      <tr key={item.id_item} className="group hover:bg-slate-50/40 transition-colors">
                        
                        {/* 1. Proposta */}
                        <td className="px-4 py-3.5 font-black text-blue-600 italic text-sm whitespace-nowrap">
                          {item.numero_proposta}
                        </td>
                        
                        {/* 2. Cliente / Seguradora */}
                        <td className="px-4 py-3.5 max-w-[240px]">
                          <div className="flex items-center gap-1.5 group/btn">
                            <div className="text-sm font-bold text-slate-700 uppercase leading-none truncate" title={item.cliente}>
                              {item.cliente}
                            </div>
                            <button
                              onClick={() => abrirVisualizacaoCliente(item.cliente_id)}
                              className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                              title="Visualização rápida do cliente"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                          <div className="text-[11px] text-blue-500 mt-1 font-black uppercase italic tracking-tight whitespace-nowrap truncate">
                            {item.seguradora}
                          </div>
                        </td>

                        {/* 3. Produto & Valores */}
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight block mb-1.5 truncate">
                            {item.produto}
                          </span>
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-[9px] font-bold text-slate-400 uppercase w-9 shrink-0">Bruto:</span>
                              <span className="text-[11px] font-bold text-slate-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-[9px] font-bold text-emerald-500 uppercase w-9 shrink-0">Líq:</span>
                              <input 
                                type="number"
                                defaultValue={item.valor_liquido}
                                onBlur={(e) => handleUpdateItem(item.id_item, "valor_liquido", parseFloat(e.target.value) || 0)}
                                className="w-20 bg-emerald-50/50 border border-transparent focus:border-emerald-500 focus:bg-white rounded px-1 py-0.5 text-[11px] font-bold text-emerald-700 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. Números (Inputs protegidos contra esmagamento) */}
                        <td className="px-4 py-3.5 min-w-[150px]">
                          <div className="flex flex-col gap-1.5 max-w-[160px]">
                            <div className="relative w-full">
                                <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                <input 
                                  defaultValue={item.numero_cotacao}
                                  placeholder="Cotação"
                                  onBlur={(e) => handleUpdateItem(item.id_item, "numero_cotacao", e.target.value)}
                                  className="w-full bg-slate-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-md py-0.5 pl-5 pr-1.5 text-[11px] font-bold text-slate-600 outline-none transition-all"
                                />
                            </div>
                            <div className="relative w-full">
                                <ShieldCheck size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                <input 
                                  defaultValue={item.numero_apolice}
                                  placeholder="Nº Apólice"
                                  onBlur={(e) => handleUpdateItem(item.id_item, "numero_apolice", e.target.value)}
                                  className="w-full bg-slate-100/50 border border-transparent focus:border-emerald-500 focus:bg-white rounded-md py-0.5 pl-5 pr-1.5 text-[11px] font-bold text-slate-600 outline-none transition-all"
                                />
                            </div>
                          </div>
                        </td>

                        {/* 5. Data Venda / Tipo de Negócio */}
                        <td className="px-4 py-3.5 min-w-[110px]">
                          <div className="flex flex-col gap-1.5">
                            <input 
                              type="date"
                              defaultValue={item.data_venda}
                              onChange={(e) => handleUpdateProposta(item.proposta_id, "data_venda", e.target.value)}
                              className="bg-transparent border-none text-[12px] font-bold text-slate-600 focus:ring-0 p-0 cursor-pointer w-full shrink-0"
                            />
                            <select 
                              value={item.tipo_negocio}
                              onChange={(e) => handleUpdateProposta(item.proposta_id, "tipo_negocio", e.target.value)}
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full w-fit border-none cursor-pointer shrink-0
                                ${item.tipo_negocio === 'Novo' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}
                            >
                              <option value="Novo">NOVO</option>
                              <option value="Renovação">RENOVAÇÃO</option>
                            </select>
                          </div>
                        </td>

                        {/* 6. Vigência / Status Proposta */}
                        <td className="px-4 py-3.5 min-w-[140px]">
                          <div className="text-[12px] font-bold text-slate-600 whitespace-nowrap">
                            {formatarDataBR(item.data_inicio_vigencia)} a {formatarDataBR(item.data_fim_vigencia)}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1 items-center w-full">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${item.status === 'Vendido' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {item.status}
                            </span>
                            {item.status === 'Vendido' && comissaoLancada && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-0.5 whitespace-nowrap">
                                <CheckCircle size={9} /> Lançada
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Controle de Renovação */}
                        <td className="px-4 py-3.5 text-center min-w-[130px]">
                          <div className="flex flex-col items-center gap-1">
                            <select
                              value={item.status_renovacao}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'CANCELADA') {
                                  const confirmar = window.confirm("Deseja realmente cancelar esta apólice?");
                                  if (confirmar) {
                                    const motivo = window.prompt("Informe o motivo: (Preço, Concorrência, Outros)");
                                    if (motivo) {
                                      handleUpdateItem(item.id_item, "motivo_cancelamento", motivo);
                                      handleUpdateItem(item.id_item, "status_renovacao", "CANCELADA");
                                    }
                                  }
                                } else {
                                  handleUpdateItem(item.id_item, "status_renovacao", val);
                                }
                              }}
                              className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-transparent shadow-sm transition-all cursor-pointer w-full text-center shrink-0 max-w-[130px]
                                ${item.status_renovacao === 'RENOVADO' ? 'bg-emerald-500 text-white' : 
                                  item.status_renovacao === 'CANCELADA' ? 'bg-red-500 text-white' :
                                  item.status_renovacao === 'RENOVAÇÃO AUTOMÁTICA' ? 'bg-indigo-600 text-white' : 
                                  'bg-amber-100 text-amber-700'}`}
                            >
                              <option value="A RENOVAR">A RENOVAR</option>
                              <option value="RENOVADO">RENOVADO</option>
                              <option value="RENOVAÇÃO AUTOMÁTICA">AUTOMÁTICA</option>
                              <option value="CANCELADA">CANCELADA</option>
                              <option value="NAO_RENOVADO">NÃO RENOVADO</option>
                              <option value="NÃO SE APLICA">N/A</option>
                            </select>
                            {item.motivo_cancelamento && item.status_renovacao === 'CANCELADA' && (
                              <span className="text-[9px] font-bold text-red-400 uppercase italic truncate max-w-[120px]" title={item.motivo_cancelamento}>
                                Motivo: {item.motivo_cancelamento}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 8. Ações (Totalmente travado contra quebras e centralizado) */}
                        <td className="px-4 py-3.5 text-center min-w-[120px]">
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap w-max mx-auto">
                            <button 
                              onClick={() => navigate(`/propostas/editar/${item.proposta_id}`)}
                              className="p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm shrink-0"
                              title="Editar Proposta"
                            >
                              <Edit3 size={14} />
                            </button>

                            {item.status === 'Vendido' && (
                              <>
                                <button 
                                  onClick={() => abrirModalComissao(item.id_item)}
                                  className={`p-2 rounded-lg transition-all shadow-sm border focus:outline-none shrink-0
                                    ${comissaoLancada 
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' 
                                      : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'}`}
                                  title={comissaoLancada ? "Ver / Editar Distribuição da Comissão" : "Lançar Nova Comissão"}
                                >
                                  <DollarSign size={14} className={comissaoLancada ? "animate-pulse" : ""} />
                                </button>

                                <button 
                                  onClick={() => setModalRenovacao({ isOpen: true, item: item })}
                                  className="p-2 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 rounded-lg transition-all shadow-sm group shrink-0"
                                  title="Renovação"
                                >
                                  <RefreshCw size={14} className="group-hover:rotate-180 duration-500 transition-transform" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* DRAWER LATERAL: VISUALIZAÇÃO RÁPIDA DO CLIENTE */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${clienteDrawer.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setClienteDrawer({ isOpen: false, loading: false, dados: null })} />
        <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${clienteDrawer.isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> Ficha Resumida do Cliente
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consulta rápida sem sair da listagem</p>
            </div>
            <button 
              onClick={() => setClienteDrawer({ isOpen: false, loading: false, dados: null })}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {clienteDrawer.loading ? (
              <div className="h-full flex items-center justify-center flex-col gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="text-[10px] font-black uppercase text-slate-400">Carregando dados...</span>
              </div>
            ) : clienteDrawer.dados ? (
              <div className="flex flex-col gap-6">
                
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Nome / Razão Social</label>
                  <div className="text-base font-black text-slate-800 uppercase italic tracking-tight bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {clienteDrawer.dados.tipo_cliente === 'PJ' ? clienteDrawer.dados.razao_social : clienteDrawer.dados.nome}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tipo de Cliente</label>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${clienteDrawer.dados.tipo_cliente === 'PJ' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {clienteDrawer.dados.tipo_cliente === 'PJ' ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA'}
                    </span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Documento</label>
                    <div className="text-xs font-bold text-slate-700">
                      {clienteDrawer.dados.tipo_cliente === 'PJ' ? clienteDrawer.dados.cnpj : clienteDrawer.dados.cpf || '-'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                    <Phone size={12} /> Informações de Contato
                  </h4>
                  {clienteDrawer.dados.email && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Mail size={14} className="text-slate-400" /> {clienteDrawer.dados.email}
                    </div>
                  )}
                  {(clienteDrawer.dados.celular || clienteDrawer.dados.telefone) && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Phone size={14} className="text-slate-400" /> {clienteDrawer.dados.celular || clienteDrawer.dados.telefone}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                    <FileText size={12} /> Endereço Cadastrado
                  </h4>
                  {clienteDrawer.dados.logradouro ? (
                    <div className="text-xs font-bold text-slate-600 leading-relaxed">
                      {clienteDrawer.dados.logradouro}, Nº {clienteDrawer.dados.numero}<br />
                      {clienteDrawer.dados.bairro} — {clienteDrawer.dados.cidade}/{clienteDrawer.dados.uf}<br />
                      <span className="text-slate-400 text-[11px]">CEP: {clienteDrawer.dados.cep}</span>
                    </div>
                  ) : (
                    <div className="text-xs italic text-slate-400 font-bold uppercase">Nenhum endereço preenchido</div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/clientes/editar/${clienteDrawer.dados.id}`)}
                    className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    Ir para Ficha Completa do Cliente
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-xs font-bold text-slate-400 uppercase">Não foi possível carregar os dados.</div>
            )}
          </div>
        </div>
      </div>

      {/* MODAIS (Inalterados) */}
      {modalRenovacao.isOpen && modalRenovacao.item && (
        <ModalRenovacao 
          isOpen={modalRenovacao.isOpen}
          onClose={() => setModalRenovacao({ isOpen: false, item: null })}
          itemOriginal={modalRenovacao.item}
          onSuccess={fetchItensRenovacao}
        />
      )}

      {modalComissaoAberto && itemSelecionadoId && (
        <ModalComissoes 
          itemId={itemSelecionadoId}
          onClose={() => setModalComissaoAberto(false)}
          onSuccess={() => fetchItensRenovacao()}
        />
      )}
    </div>
  );
}