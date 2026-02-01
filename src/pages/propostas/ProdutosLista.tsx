import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, Edit3, Loader2, Calendar, Hash, ShieldCheck, ArrowRight, Users, Handshake, ShoppingCart , Download, FileSpreadsheet
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatarDataBR } from "../../utils/dateUtils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ItemRenovacaoFormatado {
  id_item: string;
  valor: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  data_venda: string; // Adicionado
  produto: string;
  seguradora: string;
  proposta_id: string;
  numero_proposta: string;
  numero_cotacao: string;
  numero_apolice: string;
  status: string;
  cliente: string;
  corretor: string;
  corretor_id: string;
  parceiro_id: string | null;
  periodicidade: string; // Adicione este
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
  
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario')
          .eq('id', user.id)
          .single();
        setUserProfile(perfil);

        if (perfil) {
          const { data: corr } = await supabase
            .from('usuarios_perfis')
            .select('id, nome')
            .eq('corretora_id', perfil.corretora_id)
            .eq('tipo_usuario', 'CORRETOR');
          setCorretores(corr || []);

          const { data: parc } = await supabase
            .from('tab_parceiros')
            .select('id, nome_parceiro')
            .eq('corretora_id', perfil.corretora_id);
          setParceiros(parc || []);
          
          if (perfil.tipo_usuario === 'CORRETOR') {
            setSelectedCorretores([perfil.id]);
          }
        }
      }
    }
    getInitialData();
    fetchItensRenovacao();
  }, []);

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
              tab_clientes (nome, razao_social, tipo_cliente),
              usuarios_perfis!tab_propostas_corretor_id_fkey(nome)
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
        const prodData = item.base_produtos as any;
        const produtoObj = Array.isArray(prodData) ? prodData[0] : prodData;
        const opcaoData = item.tab_proposta_opcoes as any;
        const opcaoObj = Array.isArray(opcaoData) ? opcaoData[0] : opcaoData;
        const seguradoraObj = Array.isArray(opcaoObj?.base_seguradoras) ? opcaoObj.base_seguradoras[0] : opcaoObj?.base_seguradoras;
        const propData = opcaoObj?.tab_propostas as any;
        const propostaObj = Array.isArray(propData) ? propData[0] : propData;
        
        return {
          id_item: item.id,
          valor: item.valor_premio,
          data_inicio_vigencia: item.data_inicio_vigencia,
          data_fim_vigencia: item.data_fim_vigencia,
          data_venda: propostaObj?.data_venda || "",
          numero_cotacao: item.numero_cotacao || "",
          numero_apolice: item.numero_apolice || "",
          produto: produtoObj?.nome || "Não definido", 
          seguradora: seguradoraObj?.nome || "Não informada",
          proposta_id: propostaObj?.id,
          numero_proposta: propostaObj?.numero_proposta,
          status: propostaObj?.status,
          periodicidade: item.periodicidade || "ANUAL",
          cliente: propostaObj?.tab_clientes?.tipo_cliente === 'PJ' 
            ? propostaObj?.tab_clientes?.razao_social 
            : propostaObj?.tab_clientes?.nome,
          corretor: propostaObj?.usuarios_perfis?.nome,
          corretor_id: propostaObj?.corretor_id,
          parceiro_id: propostaObj?.parceiro_id
        };
      });

      setItens(formatado || []);
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

      return matchTexto && matchCorretor && matchParceiro && matchDataRenovacao && matchDataVenda && matchPeriodicidade;
    });
  }, [filter, dataInicio, dataFim, dataVendaInicio, dataVendaFim, selectedCorretores, selectedParceiros, selectedPeriodicidades, itens]);

  const exportarExcel = () => {
    const dadosParaExportar = itensFiltrados.map(i => ({
      "Proposta": i.numero_proposta,
      "Cliente": i.cliente,
      "Seguradora": i.seguradora,
      "Produto": i.produto,
      "Venda": i.data_venda ? formatarDataBR(i.data_venda) : "-",
      "Início Vigência": formatarDataBR(i.data_inicio_vigencia),
      "Fim Vigência (Renovação)": i.periodicidade === 'ÚNICO' ? "N/A (ÚNICO)" : (i.data_fim_vigencia ? formatarDataBR(i.data_fim_vigencia) : "-"),
      "Valor Prêmio": i.valor, // Mantido como número
      "Apólice": i.numero_apolice || "N/A"
    }));

    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `Relatorio_Produtos_${new Date().getTime()}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para modo paisagem (landscape) pois a tabela é larga
    doc.text("Relatório de Produtos e Vigências", 14, 15);
    
    const tableData = itensFiltrados.map(i => [
      i.numero_proposta,
      i.cliente,
      i.produto,
      i.numero_apolice || "-",
      i.periodicidade === 'ÚNICO' ? "ÚNICO" : formatarDataBR(i.data_fim_vigencia),
      formatarDataBR(i.data_venda),
      formatarDataBR(i.data_fim_vigencia),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor)
    ]);

    autoTable(doc, {
      head: [['Proposta', 'Cliente', 'Produto', 'Apólice', 'Venda', 'Renovação', 'Valor']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 7 }
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
              {/* ADICIONE ESTES BOTÕES */}
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
                {/* ... seu input de busca ... */}
              </div>
            </div>
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente, produto ou apólice..."
                className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none text-sm shadow-sm"
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          {/* BARRA DE FILTROS AVANÇADOS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Coluna 1: Corretores */}
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

              {/* Coluna 2: Parceiros */}
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

              {/* Coluna 3: Periodicidade (Mesma linha/altura dos outros selects) */}
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

              {/* Coluna 4: Datas Empilhadas */}
              <div className="flex flex-col gap-4">
                {/* Grupo Renovação */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <Calendar size={11}/> Renovação (De / Até)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date"
                      className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                    <input 
                      type="date"
                      className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                </div>

                {/* Grupo Venda */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
                    <ShoppingCart size={11}/> Venda (De / Até)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date"
                      className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                      value={dataVendaInicio}
                      onChange={(e) => setDataVendaInicio(e.target.value)}
                    />
                    <input 
                      type="date"
                      className="w-full h-9 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                      value={dataVendaFim}
                      onChange={(e) => setDataVendaFim(e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>
  


            {(selectedCorretores.length > 0 || 
              selectedParceiros.length > 0 || 
              selectedPeriodicidades.length > 0 || // Substituímos a repetição por esta linha
              dataInicio || 
              dataFim || 
              dataVendaInicio || 
              dataVendaFim) && (
                <div className="flex justify-end border-t border-slate-50 pt-3">
                  <button 
                    onClick={() => {
                        if(userProfile?.tipo_usuario !== 'CORRETOR') setSelectedCorretores([]);
                        setSelectedParceiros([]);
                        setDataInicio("");
                        setDataFim("");
                        setDataVendaInicio("");
                        setDataVendaFim("");
                        setSelectedPeriodicidades([]); // Este já estava certo no seu
                    }}
                    className="text-[10px] font-black text-red-500 uppercase hover:underline"
                  >
                    × Limpar Todos os Filtros
                  </button>
                </div>
            )}
          </div>
        </header>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-x-auto">
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
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : itensFiltrados.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Nenhum item encontrado</td></tr>
              ) : itensFiltrados.map((item) => (
                <tr key={item.id_item} className="group hover:bg-slate-50/50 transition-all">
                {/* Proposta */}
                <td className="p-5 border-b border-slate-50 font-black text-blue-600 italic text-sm">
                  {item.numero_proposta}
                </td>
                
                {/* Cliente / Seguradora */}
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

                {/* Produto & Periodicidade (UNIFICADOS) */}
                <td className="p-5 border-b border-slate-50">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-tight block mb-1">
                    {item.produto}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-slate-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                    </div>
                    
                    {/* Seletor de Periodicidade Editável */}
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

                {/* Nº Cotação */}
                <td className="p-5 border-b border-slate-50">
                  <div className="relative group/field">
                    <Hash size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      defaultValue={item.numero_cotacao}
                      onBlur={(e) => handleUpdateItem(item.id_item, "numero_cotacao", e.target.value)}
                      className={`w-full bg-slate-100/50 border-transparent border focus:border-blue-500 focus:bg-white rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold text-slate-600 outline-none
                        ${savingId === `${item.id_item}-numero_cotacao` ? 'border-blue-500 ring-2 ring-blue-500/10' : ''}`}
                    />
                  </div>
                </td>

                {/* Nº Apólice */}
                <td className="p-5 border-b border-slate-50">
                  <div className="relative">
                    <ShieldCheck size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      defaultValue={item.numero_apolice}
                      placeholder="Sem Apólice"
                      onBlur={(e) => handleUpdateItem(item.id_item, "numero_apolice", e.target.value)}
                      className={`w-full bg-slate-100/50 border-transparent border focus:border-emerald-500 focus:bg-white rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold text-slate-600 outline-none
                        ${savingId === `${item.id_item}-numero_apolice` ? 'border-emerald-500 ring-2 ring-emerald-500/10' : ''}`}
                    />
                  </div>
                </td>

                {/* Data Venda */}
                <td className="p-5 border-b border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-slate-600">
                      {item.data_venda ? formatarDataBR(item.data_venda) : '---'}
                    </span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase">Confirmada</span>
                  </div>
                </td>

                {/* Período de Vigência */}
                <td className="p-5 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    {/* Bloco de Início - Sempre visível */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Início</span>
                      <span className="text-[13px] font-bold text-slate-600">
                        {item.data_inicio_vigencia ? formatarDataBR(item.data_inicio_vigencia) : '---'}
                      </span>
                    </div>

                    {/* Lógica Condicional para Renovação vs Único */}
                    {item.periodicidade === 'ÚNICO' ? (
                      <div className="flex items-center gap-2 ml-2">
                        <div className="h-8 w-[1px] bg-slate-200 mx-1" /> {/* Divisor sutil */}
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-purple-500 uppercase">Tipo</span>
                          <span className="text-[11px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded italic">
                            PAGAMENTO ÚNICO
                          </span>
                        </div>
                      </div>
                    ) : (
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

                  {/* Status da Proposta */}
                  <div className={`text-[9px] font-black uppercase mt-2 inline-block px-2 py-0.5 rounded ${item.status === 'Vendido' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {item.status}
                  </div>
                </td>

                {/* Ações */}
                <td className="p-5 border-b border-slate-50 text-center">
                  <button 
                    onClick={() => navigate(`/propostas/editar/${item.proposta_id}`)}
                    className="p-2.5 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-500 text-slate-400 rounded-xl transition-all shadow-sm group"
                  >
                    <Edit3 size={16} className="group-hover:scale-110 transition-transform" />
                  </button>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}