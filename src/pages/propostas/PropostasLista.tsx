import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, FileText, Edit3, Trash2, 
  CheckCircle, XCircle, Loader2, Calendar, Users, Handshake, Download, FileSpreadsheet
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModalFechamento } from '../../components/propostas/ModalFechamento';
import { formatarDataBR } from "../../utils/dateUtils";
import { ModalExclusaoSegura } from "./ModalExclusaoSegura";
import { sincronizarStatusCliente } from "./sincronizarStatusCliente";
import * as XLSX from 'xlsx';
import ModeloCotacaoAuto from "./modelos/ModeloCotacaoAuto";
import ModeloCotacaoEmpresarial from "./modelos/ModeloCotacaoEmpresarial";
import ModeloCotacaoResidencial from "./modelos/ModeloCotacaoResidencial";
import ModeloCotacaoSaude from "./modelos/ModeloCotacaoSaude";
import ModeloCotacaoVida from "./modelos/ModeloCotacaoVida";

export default function PropostasLista() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [parceiros, setParceiros] = useState<any[]>([]);
  
  // Estado dinâmico que carrega o objeto completo da proposta selecionada
  const [propostaSelecionada, setPropostaSelecionada] = useState<any | null>(null);

  // Estados de Filtro
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [selectedParceiros, setSelectedParceiros] = useState<string[]>([]);
  const [selectedPeriodicidade, setSelectedPeriodicidade] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]); 
  
  // Intervalos de Data
  const [vencimentoInicio, setVencimentoInicio] = useState("");
  const [vencimentoFim, setVencimentoFim] = useState("");
  const [vendaInicio, setVendaInicio] = useState("");
  const [vendaFim, setVendaFim] = useState("");

  const [modalStatus, setModalStatus] = useState<{ open: boolean, type: 'VENDIDO' | 'PERDIDO', proposta: any }>({
    open: false,
    type: 'VENDIDO',
    proposta: null
  });

  const [modalExclusao, setModalExclusao] = useState<{
    isOpen: boolean;
    proposta: any;
    dadosCriticos: { sinistros: number; comissoes: number; isVendido: boolean; };
  }>({
    isOpen: false,
    proposta: null,
    dadosCriticos: { sinistros: 0, comissoes: 0, isVendido: false }
  });

  const exportarExcel = () => {
    const dadosParaExportar = propostasFiltradas.map(p => {
      const produtosNomes = Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => 
        opt.tab_proposta_itens?.map((i: any) => i.base_produtos?.nome)
      ))).filter(Boolean).join(', ');

      const numerosCotacao = Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => 
        opt.tab_proposta_itens?.map((i: any) => i.numero_cotacao)
      ))).filter(Boolean).join(' / ');

      const qtdeCotacoes = p.tab_proposta_opcoes?.length || 0;

      return {
        "Proposta": p.numero_proposta,
        "Cliente": p.tab_clientes?.tipo_cliente === 'PJ' ? p.tab_clientes?.razao_social : p.tab_clientes?.nome,
        "Corretor": p.usuarios_perfis?.nome,
        "Nº Cotação": numerosCotacao || "NÃO INFORMADO",
        "Cotações": qtdeCotacoes,
        "Produtos Cotados": produtosNomes || "NÃO INFORMADO",
        "Periodicidade": Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => 
          opt.tab_proposta_itens?.map((i: any) => i.periodicidade)
        ))).join(' / '), 
        "Status": p.status,
        "Valor Total": p.valor_total_proposta,
        "Vencimento": formatarDataBR(p.data_validade),
        "Data Venda": p.data_venda ? formatarDataBR(p.data_venda) : "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Propostas");
    XLSX.writeFile(wb, `Relatorio_Propostas_${new Date().getTime()}.xlsx`);
  };

  const exportarPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(14);
    doc.text("Relatório de Propostas", 14, 15);
    
    const totalGeral = propostasFiltradas.reduce((sum, p) => sum + (Number(p.valor_total_proposta) || 0), 0);
    const tableData = propostasFiltradas.map(p => {
      const produtosNomes = Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => 
        opt.tab_proposta_itens?.map((i: any) => i.base_produtos?.nome)
      ))).filter(Boolean).join(', ');

      const numCotacao = Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => 
        opt.tab_proposta_itens?.map((i: any) => i.numero_cotacao)
      ))).filter(Boolean).join(' / ');

      return [
        p.numero_proposta,
        p.tab_clientes?.tipo_cliente === 'PJ' ? p.tab_clientes?.razao_social : p.tab_clientes?.nome,
        numCotacao || "-",
        p.tab_proposta_opcoes?.length || 0,
        produtosNomes || "-",
        p.status,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_proposta)
      ];
    });

    autoTable(doc, {
      head: [['Nº Proposta', 'Cliente', 'Nº Cotação', 'Cot.', 'Produtos Cotados', 'Status', 'Valor']],
      body: tableData,
      foot: [[
        { content: 'TOTALIZADOR GERAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral), styles: { fontStyle: 'bold' } }
      ]],
      showFoot: 'lastPage',
      startY: 20,
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 2 
      },
      columnStyles: {
        0: { cellWidth: 25 }, 
        1: { cellWidth: 45 }, 
        2: { cellWidth: 35 }, 
        3: { cellWidth: 10, halign: 'center' }, 
        4: { cellWidth: 85 }, 
        5: { cellWidth: 25 }, 
        6: { cellWidth: 35, halign: 'right' } 
      },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: 51, fontSize: 9 }
    });
    doc.save(`Relatorio_Propostas_${new Date().getTime()}.pdf`);
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
  }, []);

  useEffect(() => {
    if (userProfile?.corretora_id) {
      fetchPropostas();
    }
  }, [userProfile]);

  async function fetchPropostas() {
    if (!userProfile?.corretora_id) return;
    try {
      setLoading(true);
      
      // Query limpa: removemos o "tab_corretoras (...)" que causava o erro PGRST200
      let query = supabase
        .from("tab_propostas")
        .select(`
          *,
          tab_clientes (id, nome, razao_social, tipo_cliente, cpf, cnpj, telefone_whats),
          usuarios_perfis!tab_propostas_corretor_id_fkey(nome),
          tab_proposta_opcoes (
            id,
            ordem_opcao,
            tab_proposta_itens (
              id,
              numero_cotacao,
              periodicidade,
              base_produtos (nome)
            )
          )
        `)
        .eq("corretora_id", userProfile.corretora_id)
        .order("created_at", { ascending: false });

      if (userProfile.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', userProfile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPropostas(data || []);
    } catch (error) {
      console.error("Erro ao buscar propostas:", error);
    } finally {
      loading && setLoading(false);
    }
  }
  const propostasFiltradas = useMemo(() => {
    if (!propostas) return [];
    const term = filter.toLowerCase().trim();

    return propostas.filter(p => {
      const matchTerm = !term || 
        (p.numero_proposta || "").toLowerCase().includes(term) ||
        (p.tab_clientes?.nome || "").toLowerCase().includes(term) ||
        (p.tab_clientes?.razao_social || "").toLowerCase().includes(term);

      const matchCorretor = selectedCorretores.length === 0 || 
        selectedCorretores.includes(p.corretor_id) || 
        p.tab_proposta_opcoes?.some((opt: any) => 
          opt.tab_proposta_itens?.some((item: any) => selectedCorretores.includes(item.corretor_id))
        );

      const matchStatus = selectedStatus.length === 0 || selectedStatus.includes(p.status);

      const matchParceiro = selectedParceiros.length === 0 || 
        (selectedParceiros.includes("venda_direta") && !p.parceiro_id) || 
        (p.parceiro_id && selectedParceiros.includes(p.parceiro_id));

      const matchVencimento = (!vencimentoInicio || p.data_validade >= vencimentoInicio) &&
                              (!vencimentoFim || p.data_validade <= vencimentoFim);

      const matchVenda = (!vendaInicio || (p.data_venda && p.data_venda >= vendaInicio)) &&
                         (!vendaFim || (p.data_venda && p.data_venda <= vendaFim));

      const matchPeriodicidade = selectedPeriodicidade.length === 0 || p.tab_proposta_opcoes?.some((opt: any) => 
        opt.tab_proposta_itens?.some((item: any) => selectedPeriodicidade.includes(item.periodicidade))
      );

      return matchTerm && matchCorretor && matchStatus && matchParceiro && matchVencimento && matchVenda && matchPeriodicidade;
    });
  }, [filter, propostas, selectedCorretores, selectedStatus, selectedParceiros, vencimentoInicio, vencimentoFim, vendaInicio, vendaFim, selectedPeriodicidade]);
  
  const executarExclusaoSegura = async (proposta: any) => {
    if (!userProfile?.corretora_id) return;
    let totalSinistros = 0;
    let totalComissoes = 0;
    const isVendido = proposta.status?.toLowerCase() === 'vendido';
    try {
      if (isVendido) {
        const { data: itens } = await supabase
          .from('tab_proposta_itens')
          .select(`id, tab_proposta_opcoes!inner(proposta_id)`)
          .eq('tab_proposta_opcoes.proposta_id', proposta.id);
        const idsDosItens = itens?.map(i => i.id) || [];
        if (idsDosItens.length > 0) {
          const [resSinistros, resComissoes] = await Promise.all([
            supabase.from('tab_sinistros').select('id', { count: 'exact' }).in('item_id', idsDosItens),
            supabase.from('tab_comissoes_regras').select('id', { count: 'exact' }).in('item_id', idsDosItens)
          ]);
          totalSinistros = resSinistros.count || 0;
          totalComissoes = resComissoes.count || 0;
        }
      }

      setModalExclusao({
        isOpen: true,
        proposta,
        dadosCriticos: { sinistros: totalSinistros, comissoes: totalComissoes, isVendido }
      });
    } catch (error) {
      console.error("Erro na investigação:", error);
    }
  };

  const handleConfirmarExclusao = async () => {
    const { proposta } = modalExclusao;
    if (!proposta) return;
    
    try {
      setLoading(true); // Bloqueia a tela e evita cliques duplos

      let query = supabase
        .from('tab_propostas')
        .delete()
        .eq('id', proposta.id)
        .eq('corretora_id', userProfile.corretora_id);

      if (userProfile.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', userProfile.id);
      }

      const { error } = await query;
      if (error) throw error;

      if (proposta.cliente_id) {
        await sincronizarStatusCliente(proposta.cliente_id);
      }

      // LIMPA O ESTADO COMPLETAMENTE
      setModalExclusao({ 
        isOpen: false, 
        proposta: null, 
        dadosCriticos: { sinistros: 0, comissoes: 0, isVendido: false } 
      });
      
      // AGUARDA A ATUALIZAÇÃO DA LISTA
      await fetchPropostas();
      
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
    } finally {
      setLoading(false); // Libera a tela
    }
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black italic uppercase text-slate-800 tracking-tighter">
              Gestão de Propostas
            </h1>

            <div className="flex items-center gap-3">
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
                <Download size={16} /> PDF Relatório
              </button>

              <div className="w-[1px] h-8 bg-slate-200 mx-2" />

              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente ou proposta..."
                  className="w-full h-11 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* --- BLOCO DE FILTROS AVANÇADOS --- */}
          <div className="flex flex-row flex-wrap items-end gap-5 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Users size={12}/> Corretores
              </label>
              <select 
                multiple
                className="w-full h-24 text-xs font-bold rounded-lg border-slate-200 bg-slate-50 p-2 focus:ring-2 focus:ring-blue-500/10 outline-none"
                value={selectedCorretores}
                onChange={(e) => setSelectedCorretores(Array.from(e.target.selectedOptions, opt => opt.value))}
                disabled={userProfile?.tipo_usuario === 'CORRETOR'}
              >
                {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Handshake size={12}/> Parceiros
              </label>
              <select 
                multiple
                className="w-full h-24 text-xs font-bold rounded-lg border-slate-200 bg-slate-50 p-2 focus:ring-2 focus:ring-blue-500/10 outline-none"
                value={selectedParceiros}
                onChange={(e) => setSelectedParceiros(Array.from(e.target.selectedOptions, opt => opt.value))}
              >
                <option value="venda_direta">VENDA DIRETA (SEM PARCEIRO)</option>
                {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome_parceiro.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="min-w-[140px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Calendar size={12}/> Vencimento
              </label>
              <div className="flex flex-col gap-2">
                <input type="date" className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                  value={vencimentoInicio} onChange={(e) => setVencimentoInicio(e.target.value)} />
                <input type="date" className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                  value={vencimentoFim} onChange={(e) => setVencimentoFim(e.target.value)} />
              </div>
            </div>

            <div className="min-w-[140px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <CheckCircle size={12}/> Venda
              </label>
              <div className="flex flex-col gap-2">
                <input type="date" className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                  value={vendaInicio} onChange={(e) => setVendaInicio(e.target.value)} />
                <input type="date" className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                  value={vendaFim} onChange={(e) => setVendaFim(e.target.value)} />
              </div>
            </div>

            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Calendar size={12}/> Periodicidade
              </label>
              <select 
                multiple
                className="w-full h-24 text-xs font-bold rounded-lg border-slate-200 bg-slate-50 p-2 focus:ring-2 focus:ring-blue-500/10 outline-none"
                value={selectedPeriodicidade}
                onChange={(e) => setSelectedPeriodicidade(Array.from(e.target.selectedOptions, opt => opt.value))}
              >
                <option value="ANUAL">ANUAL</option>
                <option value="MENSAL">MENSAL</option>
                <option value="ÚNICO">ÚNICO</option>
                <option value="PERSONALIZADO">PERSONALIZADO</option>
              </select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Loader2 size={12}/> Status
              </label>
              <select 
                multiple
                className="w-full h-24 text-xs font-bold rounded-lg border-slate-200 bg-slate-50 p-2 focus:ring-2 focus:ring-blue-500/10 outline-none"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(Array.from(e.target.selectedOptions, opt => opt.value))}
              >
                <option value="Em Negociação">EM NEGOCIAÇÃO</option>
                <option value="Vendido">VENDIDO</option>
                <option value="Perdido">PERDIDO</option>
              </select>
            </div>

            <div className="pb-1 ml-auto">
              {(selectedCorretores.length > (userProfile?.tipo_usuario === 'CORRETOR' ? 1 : 0) || 
                selectedParceiros.length > 0 || 
                selectedPeriodicidade.length > 0 ||
                selectedStatus.length > 0 ||
                vencimentoInicio !== "" ||
                vencimentoFim !== "" || 
                vendaInicio !== "" || 
                vendaFim !== ""
              ) ? (
                <button 
                  onClick={() => {
                    if(userProfile?.tipo_usuario !== 'CORRETOR') setSelectedCorretores([]);
                    else setSelectedCorretores([userProfile?.id]);
                    setSelectedParceiros([]);
                    setVencimentoInicio("");
                    setVencimentoFim("");
                    setVendaInicio("");
                    setVendaFim("");
                    setSelectedPeriodicidade([]);
                    setSelectedStatus([]);
                  }}
                  className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase bg-red-50 hover:bg-red-100 px-4 py-3 rounded-xl transition-all border border-red-100 shadow-sm h-fit"
                >
                  <XCircle size={14} /> Limpar Filtros
                </button>
              ) : (
                <span className="text-[9px] font-bold text-slate-300 uppercase italic mb-2 block">
                  Nenhum filtro ativo
                </span>
              )}
            </div>
          </div>
        </header>

        {/* --- TABELA DE PROPOSTAS COMERCIAIS --- */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Proposta</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Cotações</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Produtos</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Total</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : propostasFiltradas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-4">
                    <div className="text-sm font-black text-blue-600 italic">{p.numero_proposta}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vence: {formatarDataBR(p.data_validade)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-slate-700 uppercase">{p.tab_clientes?.tipo_cliente === 'PJ' ? p.tab_clientes?.razao_social : p.tab_clientes?.nome}</div>
                    <div className="text-[10px] text-slate-400 font-medium italic">Corretor: {p.usuarios_perfis?.nome}</div>
                  </td>
                  {/* --- VISUALIZAÇÃO DA GRADE DE PROPOSTAS--- */}
                  <td className="px-4 py-4">
                    {(() => {
                      // 1. Calcula os números primeiro
                      const numeros = Array.from(new Set(
                        p.tab_proposta_opcoes?.flatMap((opt: any) => 
                          opt.tab_proposta_itens?.map((i: any) => String(i.numero_cotacao))
                        )
                      )).filter(Boolean) as string[];

                      // 2. Retorna a grade visual de 3 colunas
                      return (
                        <div className="grid grid-cols-3 gap-1 w-24">
                          {numeros.map((num, index) => (
                            <span 
                              key={index} 
                              className="text-[9px] font-mono bg-slate-50 border border-slate-200 text-slate-600 text-center rounded p-0.5"
                            >
                              {num}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>


                  <td className="px-4 py-4 text-[11px] text-slate-500 font-medium max-w-[200px] truncate">{Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => opt.tab_proposta_itens?.map((i: any) => i.base_produtos?.nome)))).filter(Boolean).join(', ') || "-"}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${p.status === 'Vendido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : p.status === 'Perdido' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-slate-700 font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_proposta)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2 text-slate-400">
                      <button onClick={() => setModalStatus({ open: true, type: 'VENDIDO', proposta: p })} className="hover:text-emerald-600"><CheckCircle size={16} /></button>
                      <button onClick={() => setModalStatus({ open: true, type: 'PERDIDO', proposta: p })} className="hover:text-red-600"><XCircle size={16} /></button>
                      <div className="w-[1px] bg-slate-200 mx-1"></div>
                      <button onClick={() => setPropostaSelecionada(p)} className="hover:text-blue-600"><FileText size={16} /></button>
                      <button onClick={() => navigate(`/propostas/editar/${p.id}`)} className="hover:text-blue-600"><Edit3 size={16} /></button>
                      <button onClick={() => executarExclusaoSegura(p)} className="hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- INJEÇÃO DOS MODAIS --- */}
      <ModalFechamento 
        isOpen={modalStatus.open}
        tipo={modalStatus.type}
        proposta={modalStatus.proposta ? [modalStatus.proposta] : []} 
        onClose={() => setModalStatus({ ...modalStatus, open: false })}
        onSuccess={() => fetchPropostas()}
      />

      <ModalExclusaoSegura 
        isOpen={modalExclusao.isOpen}
        onClose={() => setModalExclusao({ ...modalExclusao, isOpen: false })}
        onConfirm={handleConfirmarExclusao}
        clienteId={modalExclusao.proposta?.cliente_id} 
        dadosCriticos={modalExclusao.dadosCriticos}
      />

      
      {/* --- MODAL DA PROPOSTA DINÂMICO --- */}
      {propostaSelecionada && (
        (() => {
          // 1. Identifica se é Empresarial
          const isEmpresarial = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
            opt.tab_proposta_itens?.some((item: any) => 
              item.base_produtos?.nome?.toLowerCase().includes("empresarial")
            )
          );

          // 2. Identifica se é Residencial
          const isResidencial = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
            opt.tab_proposta_itens?.some((item: any) => 
              item.base_produtos?.nome?.toLowerCase().includes("residencial")
            )
          );

          // 3. Identifica se é Saúde (Verifica com e sem acento por segurança)
          const isSaude = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
            opt.tab_proposta_itens?.some((item: any) => {
              const nomeProd = item.base_produtos?.nome?.toLowerCase() || "";
              return nomeProd.includes("saúde") || nomeProd.includes("saude");
            })
          );

          // 4. Identifica se é Seguro de Vida
          const isVida = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
            opt.tab_proposta_itens?.some((item: any) => 
              item.base_produtos?.nome?.toLowerCase().includes("vida")
            )
          );

          // 5. Renderização Condicional (Cascata)
          if (isEmpresarial) {
            return (
              <ModeloCotacaoEmpresarial 
                propostaId={propostaSelecionada.id} 
                onClose={() => setPropostaSelecionada(null)} 
              />
            );
          }

          if (isResidencial) {
            return (
              <ModeloCotacaoResidencial 
                propostaId={propostaSelecionada.id} 
                onClose={() => setPropostaSelecionada(null)} 
              />
            );
          }

          if (isSaude) {
            return (
              <ModeloCotacaoSaude 
                propostaId={propostaSelecionada.id} 
                onClose={() => setPropostaSelecionada(null)} 
              />
            );
          }

          if (isVida) {
            return (
              <ModeloCotacaoVida 
                propostaId={propostaSelecionada.id} 
                onClose={() => setPropostaSelecionada(null)} 
              />
            );
          }

          // 6. Caso contrário, abre o padrão (Auto)
          return (
            <ModeloCotacaoAuto 
              propostaId={propostaSelecionada.id} 
              onClose={() => setPropostaSelecionada(null)} 
            />
          );
        })()
      )}
    </div>
  );
}