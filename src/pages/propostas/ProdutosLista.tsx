import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, Edit3, Loader2, Calendar, Hash, ShieldCheck, ArrowRight, Users, Handshake, ShoppingCart , Download, 
  FileSpreadsheet, DollarSign, RefreshCw, CheckCircle2, XCircle, Clock, RefreshCcw, MinusCircle
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
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  data_venda: string;
  produto: string;
  seguradora: string;
  proposta_id: string;
  numero_proposta: string;
  numero_cotacao: string;
  numero_apolice: string;
  status: string;
  status_renovacao?: string;
  cliente: string;
  corretor: string;
  corretor_id: string;
  parceiro_id: string | null; // Importante ser opcional
  periodicidade: string;
  cliente_id: string; // Adicionado para o Modal
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
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [selectedParceiros, setSelectedParceiros] = useState<string[]>([]);
  
  // Filtros de Data (Vigência e Venda)
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataVendaInicio, setDataVendaInicio] = useState(""); // Novo
  const [dataVendaFim, setDataVendaFim] = useState("");       // Novo
  const [selectedPeriodicidades, setSelectedPeriodicidades] = useState<string[]>([]); //novo
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]); // ADICIONE ESTA LINHA
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([]);
  const [listaProdutosUnicos, setListaProdutosUnicos] = useState<string[]>([]); // Para preencher o select/filtro
  
  
  const [savingId, setSavingId] = useState<string | null>(null);
  

  const [modalRenovacao, setModalRenovacao] = useState<{isOpen: boolean, item: any}>({
    isOpen: false,
    item: null
  });

  // ESTADOS DO MODAL DE COMISSÃO
  const [modalComissaoAberto, setModalComissaoAberto] = useState(false);
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  
  const abrirModalComissao = (id: string) => {
    setItemSelecionadoId(id);
    setModalComissaoAberto(true);
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
          // Carregamos os corretores e parceiros aqui
          const [corr, parc] = await Promise.all([
            supabase.from('usuarios_perfis').select('id, nome').eq('corretora_id', perfil.corretora_id).eq('tipo_usuario', 'CORRETOR'),
            supabase.from('tab_parceiros').select('id, nome_parceiro').eq('corretora_id', perfil.corretora_id)
          ]);
          
          setCorretores(corr.data || []);
          setParceiros(parc.data || []);

          if (perfil.tipo_usuario === 'CORRETOR') {
            setSelectedCorretores([perfil.id]);
          }
          // Chamamos o fetch logo após ter o perfil carregado
          fetchItensRenovacao();
        }
      }
    }
    getInitialData();
  }, []); // Removemos a dependência do userProfile daqui e deixamos apenas no mount

  useEffect(() => {
    if (userProfile?.corretora_id) {
      fetchItensRenovacao();
    }
  }, [userProfile]);

  async function fetchItensRenovacao() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("id, tipo_usuario, corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil) return;

      let query = supabase
        .from("tab_proposta_itens")
        .select(`
          id,
          valor_premio,
          data_inicio_vigencia,
          data_fim_vigencia,
          numero_cotacao,
          numero_apolice,
          periodicidade,
          status_renovacao,
          base_produtos (nome),
          tab_proposta_opcoes!inner (
            base_seguradoras (nome),
            tab_propostas!inner (
              id,
              numero_proposta,
              status,
              corretor_id,
              corretora_id,
              parceiro_id,
              data_venda,
              cliente_id,
              tab_clientes (id, nome, razao_social, tipo_cliente),
              usuarios_perfis!tab_propostas_corretor_id_fkey(id, nome)
            )
          )
        `);

      query = query.eq("tab_proposta_opcoes.tab_propostas.corretora_id", perfil.corretora_id);
      
      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq("tab_proposta_opcoes.tab_propostas.corretor_id", perfil.id);
      }

      const { data, error } = await query.order("data_fim_vigencia", { ascending: true });
      if (error) throw error;

      const formatado = data?.map(item => {
        const itemOpcao = Array.isArray(item.tab_proposta_opcoes) 
          ? item.tab_proposta_opcoes[0] 
          : item.tab_proposta_opcoes;

        const itemProposta = Array.isArray(itemOpcao?.tab_propostas) 
          ? itemOpcao.tab_propostas[0] 
          : itemOpcao?.tab_propostas;

        const itemCliente = Array.isArray(itemProposta?.tab_clientes) 
          ? itemProposta.tab_clientes[0] 
          : itemProposta?.tab_clientes;

        const itemSeguradora = Array.isArray(itemOpcao?.base_seguradoras) 
          ? itemOpcao.base_seguradoras[0] 
          : itemOpcao?.base_seguradoras;

        const itemProduto = Array.isArray(item.base_produtos) 
          ? item.base_produtos[0] 
          : item.base_produtos;

        const itemCorretor = Array.isArray(itemProposta?.usuarios_perfis) 
          ? itemProposta.usuarios_perfis[0] 
          : itemProposta?.usuarios_perfis;

        // 2. Montamos o objeto formatado com segurança
        return {
            id_item: item.id,
            valor: item.valor_premio,
            data_inicio_vigencia: item.data_inicio_vigencia,
            data_fim_vigencia: item.data_fim_vigencia,
            data_venda: itemProposta?.data_venda || "",
            numero_cotacao: item.numero_cotacao || "",
            numero_apolice: item.numero_apolice || "",
            produto: itemProduto?.nome || "Não definido", 
            seguradora: itemSeguradora?.nome || "Não informada",
            proposta_id: itemProposta?.id,
            cliente_id: itemCliente?.id || itemProposta?.cliente_id || "", 
            numero_proposta: itemProposta?.numero_proposta,
            status: itemProposta?.status,
            
            // ADICIONE ESTA LINHA ABAIXO:
            status_renovacao: item.status_renovacao, 

            periodicidade: item.periodicidade || "ANUAL",
            cliente: itemCliente?.tipo_cliente === 'PJ' 
              ? itemCliente?.razao_social 
              : itemCliente?.nome,
            corretor: itemCorretor?.nome || "Não informado", 
            corretor_id: itemProposta?.corretor_id,
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

  async function handleUpdateItem(id_item: string, field: string, value: string) {
    try {
      setSavingId(`${id_item}-${field}`);
      const { error } = await supabase
        .from("tab_proposta_itens")
        .update({ [field]: value })
        .eq("id", id_item);

      if (error) throw error;

      setItens(prev => prev.map(item => 
        item.id_item === id_item ? { ...item, [field]: value } : item
      ));

      setTimeout(() => setSavingId(null), 1000);
    } catch (err) {
      console.error("Erro ao atualizar item:", err);
      setSavingId(null);
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

      const matchParceiro = selectedParceiros.length === 0 || 
        (selectedParceiros.includes("venda_direta") && !i.parceiro_id) || 
        (i.parceiro_id && selectedParceiros.includes(i.parceiro_id));

      // Filtro Renovação
      const matchDataRenovacao = i.periodicidade === 'ÚNICO' || (
        (!dataInicio || i.data_fim_vigencia >= dataInicio) &&
        (!dataFim || i.data_fim_vigencia <= dataFim)
      );

      // Filtro Data da Venda
      const matchDataVenda = (!dataVendaInicio || i.data_venda >= dataVendaInicio) &&
                             (!dataVendaFim || i.data_venda <= dataVendaFim);

      const matchPeriodicidade = selectedPeriodicidades.length === 0 || 
                          selectedPeriodicidades.includes(i.periodicidade);

      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(i.status);

      return matchTexto && matchCorretor && matchParceiro && matchDataRenovacao && matchDataVenda && matchPeriodicidade && matchStatus && matchProdutoFiltro;
    });
  }, [filter, dataInicio, dataFim, dataVendaInicio, dataVendaFim, selectedCorretores, selectedParceiros, selectedPeriodicidades, selectedStatuses, selectedProdutos, itens]);

  const exportarExcel = () => {
  // 1. Mapeia os dados normais
  const dadosParaExportar = itensFiltrados.map(i => ({
    "Proposta": i.numero_proposta,
    "Cliente": i.cliente,
    "Seguradora": i.seguradora,
    "Produto": i.produto,
    "Venda": i.data_venda ? formatarDataBR(i.data_venda) : "-",
    "Início Vigência": formatarDataBR(i.data_inicio_vigencia),
    "Fim Vigência (Renovação)": i.periodicidade === 'ÚNICO' ? "N/A (ÚNICO)" : (i.data_fim_vigencia ? formatarDataBR(i.data_fim_vigencia) : "-"),
    "Valor Prêmio": i.valor,
    "Apólice": i.numero_apolice || "N/A"
  }));

  // 2. Calcula o somatório total
  const totalGeral = itensFiltrados.reduce((acc, i) => acc + (i.valor || 0), 0);

  // 3. Adiciona a linha de total ao final do array
  // Importante: as chaves devem ser IDENTICAS às do map acima para alinharem nas colunas
  dadosParaExportar.push({
    "Proposta": "TOTAL GERAL",
    "Cliente": "",
    "Seguradora": "",
    "Produto": "",
    "Venda": "",
    "Início Vigência": "",
    "Fim Vigência (Renovação)": "",
    "Valor Prêmio": totalGeral, // O valor entra aqui para ficar na mesma coluna
    "Apólice": ""
  } as any);

  const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  
  XLSX.writeFile(wb, `Relatorio_Produtos_${new Date().getTime()}.xlsx`);
};

const exportarPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.text("Relatório de Produtos e Vigências", 14, 15);
  
  // Alteração aqui: adicionamos o ": any[][]" para permitir objetos de estilo na linha de total
  const tableData: any[][] = itensFiltrados.map(i => [
    i.numero_proposta,
    i.cliente,
    i.produto,
    i.numero_apolice || "-",
    i.data_venda ? formatarDataBR(i.data_venda) : "-",
    i.periodicidade === 'ÚNICO' ? "PAGTO ÚNICO" : formatarDataBR(i.data_fim_vigencia),
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor)
  ]);

  const totalGeral = itensFiltrados.reduce((acc, i) => acc + (i.valor || 0), 0);
  const totalFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral);

  // Agora o TypeScript aceitará os objetos de configuração abaixo
  tableData.push([
    { content: 'TOTAL GERAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalFormatado, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
  ]);

  autoTable(doc, {
    head: [['Proposta', 'Cliente', 'Produto', 'Apólice', 'Venda', 'Renovação', 'Valor']],
    body: tableData,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 41, 59] }
  });

  doc.save(`Produtos_Vigencias_${new Date().getTime()}.pdf`);
};


return (
  <div className="p-8 bg-[#F8FAFC] min-h-screen">
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
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

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={11}/> Renovação (De / Até)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  <input type="date" className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
                  <ShoppingCart size={11}/> Venda (De / Até)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataVendaInicio} onChange={(e) => setDataVendaInicio(e.target.value)} />
                  <input type="date" className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none" value={dataVendaFim} onChange={(e) => setDataVendaFim(e.target.value)} />
                </div>
              </div>
            </div>

            {/* FILTRO DE PRODUTOS - ADICIONADO AQUI */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1">
                <ShoppingCart size={12}/> Produtos
              </label>
              <select 
                multiple
                className="w-full h-24 text-[11px] font-bold rounded-lg border-slate-200 bg-slate-50 p-2 outline-none focus:ring-2 focus:ring-blue-500/10"
                value={selectedProdutos}
                onChange={(e) => setSelectedProdutos(Array.from(e.target.selectedOptions, opt => opt.value))}
              >
                {listaProdutosUnicos.map(prod => (
                  <option key={prod} value={prod}>{prod.toUpperCase()}</option>
                ))}
              </select>
            </div>  
          </div>

          {(selectedCorretores.length > 0 || selectedParceiros.length > 0 ||  selectedProdutos.length > 0 || selectedPeriodicidades.length > 0 || selectedStatuses.length > 0 || dataInicio || dataFim || dataVendaInicio || dataVendaFim) && (
            <div className="flex justify-end border-t border-slate-50 pt-3">
              <button 
                onClick={() => {
                  if(userProfile?.tipo_usuario !== 'CORRETOR') setSelectedCorretores([]);
                  setSelectedParceiros([]);
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

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Proposta</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Cliente / Seguradora</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Produto</th>
                <th className="p-5 text-[10px] font-black uppercase text-blue-600 border-b border-slate-100">Nº Cotação</th>
                <th className="p-5 text-[10px] font-black uppercase text-emerald-600 border-b border-slate-100">Nº Apólice</th>
                <th className="p-5 text-[10px] font-black uppercase text-emerald-500 border-b border-slate-100">Data Venda</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Período de Vigência</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 text-center">Status Renov.</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
  {loading ? (
    <tr><td colSpan={9} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
  ) : itensFiltrados.length === 0 ? (
    <tr><td colSpan={9} className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Nenhum item encontrado</td></tr>
  ) : itensFiltrados.map((item) => (
    <tr key={item.id_item} className="group hover:bg-slate-50/50 transition-all">
      {/* 1. Proposta */}
      <td className="p-5 border-b border-slate-50 font-black text-blue-600 italic text-sm">
        {item.numero_proposta}
      </td>
      
      {/* 2. Cliente / Seguradora */}
      <td className="p-5 border-b border-slate-50">
        <div className="text-sm font-bold text-slate-700 uppercase leading-none truncate max-w-[220px]">
          {item.cliente}
        </div>
        <div className="text-[12px] text-blue-500 mt-1 font-black uppercase italic tracking-tighter">
          {item.seguradora}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
          Ref: {item.corretor}
        </div>
      </td>

      {/* 3. Produto */}
      <td className="p-5 border-b border-slate-50">
        <span className="text-xs font-black text-slate-600 uppercase tracking-tight block mb-1">
          {item.produto}
        </span>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold text-slate-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
          </div>
          <select
            value={item.periodicidade}
            onChange={(e) => handleUpdateItem(item.id_item, "periodicidade", e.target.value)}
            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-transparent focus:border-blue-500 outline-none cursor-pointer transition-all
              ${item.periodicidade === 'ANUAL' ? 'bg-blue-50 text-blue-600' : 
                item.periodicidade === 'MENSAL' ? 'bg-purple-50 text-purple-600' : 
                'bg-slate-100 text-slate-500'}`}
          >
            <option value="ANUAL">ANUAL</option>
            <option value="MENSAL">MENSAL</option>
            <option value="ÚNICO">ÚNICO</option>
            <option value="PERSONALIZADO">PERS.</option>
          </select>
        </div>
      </td>

      {/* 4. Nº Cotação */}
      <td className="p-5 border-b border-slate-50">
        <div className="relative">
          <Hash size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
          <input 
            defaultValue={item.numero_cotacao}
            onBlur={(e) => handleUpdateItem(item.id_item, "numero_cotacao", e.target.value)}
            className={`w-full bg-slate-100/50 border-transparent border focus:border-blue-500 focus:bg-white rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold text-slate-600 outline-none transition-all
              ${savingId === `${item.id_item}-numero_cotacao` ? 'border-blue-500 ring-2 ring-blue-500/10' : ''}`}
          />
        </div>
      </td>

      {/* 5. Nº Apólice */}
      <td className="p-5 border-b border-slate-50">
        <div className="relative">
          <ShieldCheck size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
          <input 
            defaultValue={item.numero_apolice}
            placeholder="Sem Apólice"
            onBlur={(e) => handleUpdateItem(item.id_item, "numero_apolice", e.target.value)}
            className={`w-full bg-slate-100/50 border-transparent border focus:border-emerald-500 focus:bg-white rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold text-slate-600 outline-none transition-all
              ${savingId === `${item.id_item}-numero_apolice` ? 'border-emerald-500 ring-2 ring-emerald-500/10' : ''}`}
          />
        </div>
      </td>

      {/* 6. Data Venda */}
      <td className="p-5 border-b border-slate-50">
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-slate-600">
            {item.data_venda ? formatarDataBR(item.data_venda) : '---'}
          </span>
          <span className="text-[9px] font-black text-emerald-500 uppercase">Confirmada</span>
        </div>
      </td>

      {/* 7. Período de Vigência (Inalterado) */}
      <td className="p-5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Início</span>
            <span className="text-[13px] font-bold text-slate-600">
              {item.data_inicio_vigencia ? formatarDataBR(item.data_inicio_vigencia) : '---'}
            </span>
          </div>
          {item.periodicidade !== 'ÚNICO' && (
            <>
              <ArrowRight size={12} className="text-slate-300 mt-3" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-500 uppercase">Renovação</span>
                <span className="text-[13px] font-black text-slate-800">
                  {item.data_fim_vigencia ? formatarDataBR(item.data_fim_vigencia) : '---'}
                </span>
              </div>
            </>
          )}
        </div>
        <div className={`text-[9px] font-black uppercase mt-2 inline-block px-2 py-0.5 rounded ${item.status === 'Vendido' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          {item.status}
        </div>
      </td>

      {/* 8. NOVA COLUNA: STATUS DA RENOVAÇÃO */}
      <td className="p-5 border-b border-slate-50 text-center">
        {item.status === 'Vendido' ? (
          <div className="flex flex-col items-center justify-center">
            {item.status_renovacao === 'RENOVADO' ? (
              <span className="px-2.5 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg uppercase flex items-center gap-1 shadow-sm">
                <CheckCircle2 size={10} /> Renovada
              </span>
            ) : item.status_renovacao === 'NAO_RENOVADO' ? (
              <span className="px-2.5 py-1 bg-red-100 text-red-600 text-[9px] font-black rounded-lg uppercase flex items-center gap-1">
                <XCircle size={10} /> Não Renovada
              </span>
            ) : item.status_renovacao === 'RENOVAÇÃO AUTOMÁTICA' ? (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black rounded-lg uppercase flex items-center gap-1">
                <RefreshCcw size={10} /> Automática
              </span>
            ) : item.status_renovacao === 'NÃO SE APLICA' ? (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-[9px] font-black rounded-lg uppercase flex items-center gap-1">
                <MinusCircle size={10} /> N/A
              </span>
            ) : (
              /* Este cobre o novo padrão "A RENOVAR" */
              <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black rounded-lg uppercase flex items-center gap-1">
                <Clock size={10} /> A Renovar
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-slate-300 font-bold uppercase">---</span>
        )}
      </td>

      {/* 9. Ações */}
      <td className="p-5 border-b border-slate-50 text-center">
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => navigate(`/propostas/editar/${item.proposta_id}`)}
            disabled={item.status === 'Vendido' || item.status === 'Perdido'}
            className={`p-2.5 bg-white border border-slate-200 rounded-xl transition-all shadow-sm group
              ${(item.status === 'Vendido' || item.status === 'Perdido') 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:border-blue-500 hover:text-blue-500'}`}
          >
            <Edit3 size={16} />
          </button>

          {item.status === 'Vendido' && (
            <>
              <button 
                onClick={() => abrirModalComissao(item.id_item)}
                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                title="Gerenciar Comissão"
              >
                <DollarSign size={18} />
              </button>

              <button 
                onClick={() => setModalRenovacao({ isOpen: true, item: item })}
                className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-sm group"
                title="Controle de Renovação"
              >
                <RefreshCw size={16} className="group-hover:rotate-180 duration-700 transition-transform" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </div>
      </div>
    </div>
    
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
        onSuccess={() => {
          fetchItensRenovacao(); 
        }}
      />
    )}
  </div>
);
}
