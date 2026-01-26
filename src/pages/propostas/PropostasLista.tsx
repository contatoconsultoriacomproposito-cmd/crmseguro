import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, FileText, Edit3, Trash2, 
  CheckCircle, XCircle, Loader2, Calendar, Users, Handshake,Download, FileSpreadsheet
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { gerarPDFProposta } from "../../utils/gerarPDF";
import { ModalFechamento } from '../../components/propostas/ModalFechamento';
import { formatarDataBR } from "../../utils/dateUtils";
import { ModalExclusaoSegura } from "./ModalExclusaoSegura";
import { sincronizarStatusCliente } from "./sincronizarStatusCliente";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PropostasLista() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [parceiros, setParceiros] = useState<any[]>([]);
  
  // Estados de Filtro
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [selectedParceiros, setSelectedParceiros] = useState<string[]>([]);
  
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

  const [modalExclusao, setModalExclusao] = useState({
    isOpen: false,
    proposta: null as any,
    dadosCriticos: { sinistros: 0, comissoes: 0, isVendido: false }
  });

  const exportarExcel = () => {
    const dadosParaExportar = propostasFiltradas.map(p => ({
      "Proposta": p.numero_proposta,
      "Cliente": p.tab_clientes?.tipo_cliente === 'PJ' ? p.tab_clientes?.razao_social : p.tab_clientes?.nome,
      "Corretor": p.usuarios_perfis?.nome,
      "Status": p.status,
      "Valor Total": p.valor_total_proposta, // Passando como número para o Excel permitir cálculos
      "Vencimento": formatarDataBR(p.data_validade),
      "Data Venda": p.data_venda ? formatarDataBR(p.data_venda) : "-"
    }));

    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    
    // Pequeno ajuste para garantir que o Excel entenda a coluna de valor como número
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Propostas");
    XLSX.writeFile(wb, `Relatorio_Propostas_${new Date().getTime()}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    doc.text("Relatório de Propostas", 14, 15);
    
    const tableData = propostasFiltradas.map(p => [
      p.numero_proposta,
      p.tab_clientes?.tipo_cliente === 'PJ' ? p.tab_clientes?.razao_social : p.tab_clientes?.nome,
      p.usuarios_perfis?.nome,
      p.status,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_proposta)
    ]);

    autoTable(doc, {
      head: [['Nº Proposta', 'Cliente', 'Corretor', 'Status', 'Valor']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 }
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
      let query = supabase
        .from("tab_propostas")
        .select(`
          *,
          tab_clientes (id, nome, razao_social, tipo_cliente, cpf, cnpj, telefone_whats),
          usuarios_perfis!tab_propostas_corretor_id_fkey(nome)
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
      setLoading(false);
    }
  }

  const propostasFiltradas = useMemo(() => {
    if (!propostas) return [];
    const term = filter.toLowerCase().trim();

    return propostas.filter(p => {
      // 1. Termo de Busca
      const matchTerm = !term || 
        (p.numero_proposta || "").toLowerCase().includes(term) ||
        (p.tab_clientes?.nome || "").toLowerCase().includes(term) ||
        (p.tab_clientes?.razao_social || "").toLowerCase().includes(term);

      // 2. Corretor
      const matchCorretor = selectedCorretores.length === 0 || selectedCorretores.includes(p.corretor_id);

      // 3. Parceiro (Lógica de Venda Direta vs Parceiro ID)
      const matchParceiro = selectedParceiros.length === 0 || 
        (selectedParceiros.includes("venda_direta") && !p.parceiro_id) || 
        (p.parceiro_id && selectedParceiros.includes(p.parceiro_id));

      // 4. Intervalo de Vencimento (Comparação de string YYYY-MM-DD é segura para tipo 'date')
      const matchVencimento = (!vencimentoInicio || p.data_validade >= vencimentoInicio) &&
                              (!vencimentoFim || p.data_validade <= vencimentoFim);

      // 5. Intervalo de Venda
      const matchVenda = (!vendaInicio || (p.data_venda && p.data_venda >= vendaInicio)) &&
                         (!vendaFim || (p.data_venda && p.data_venda <= vendaFim));

      return matchTerm && matchCorretor && matchParceiro && matchVencimento && matchVenda;
    });
  }, [filter, propostas, selectedCorretores, selectedParceiros, vencimentoInicio, vencimentoFim, vendaInicio, vendaFim]);

  const handleRegerarPDF = async (proposta: any) => {
    try {
      const { data: opcoesDb, error } = await supabase
        .from('tab_proposta_opcoes')
        .select(`
          *,
          base_seguradoras (nome),
          tab_proposta_itens (
            *,
            base_produtos (nome)
          )
        `)
        .eq('proposta_id', proposta.id)
        .order('ordem_opcao', { ascending: true });

      if (error || !opcoesDb) return alert("Erro ao recuperar dados da proposta.");

      const produtosUnicos = Array.from(new Set(
        opcoesDb.flatMap(opt => 
          opt.tab_proposta_itens.map((i: any) => i.base_produtos?.nome || 'Produto')
        )
      ));

      await gerarPDFProposta({
        numeroProposta: proposta.numero_proposta,
        corretorId: proposta.corretor_id,
        validade: proposta.data_validade,
        cliente: {
          nome: proposta.tab_clientes?.tipo_cliente === 'PJ' ? proposta.tab_clientes?.razao_social : proposta.tab_clientes?.nome,
          documento: proposta.tab_clientes?.tipo_cliente === 'PJ' ? proposta.tab_clientes?.cnpj : proposta.tab_clientes?.cpf,
          whatsapp: proposta.tab_clientes?.telefone_whats || ''
        },
        produtosUnicos,
        opcoes: opcoesDb.map(opt => ({
          companhia: (opt.base_seguradoras as any)?.nome || 'N/A',
          itens: opt.tab_proposta_itens.map((i: any) => ({
            nomeProduto: i.base_produtos?.nome,
            valor: i.valor_premio,
            cobertura: i.coberturas_franquias || '-',
            parcelamento: i.parcelamento || '1x',
            meio: i.meio_pagamento || 'Boleto'
          }))
        }))
      });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    }
  };

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
            supabase.from('tab_comissoes').select('id', { count: 'exact' }).in('item_id', idsDosItens)
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

      setModalExclusao({ ...modalExclusao, isOpen: false });
      fetchPropostas();
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
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
              {/* BOTÕES DE EXPORTAÇÃO */}
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
          
          <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Filtro Corretor */}
              <div>
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

              {/* Filtro Parceiro */}
              <div>
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

              {/* Filtro Vencimento Intervalo */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                  <Calendar size={12}/> Período de Vencimento
                </label>
                <div className="flex flex-col gap-2">
                  <input 
                    type="date"
                    className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                    value={vencimentoInicio}
                    onChange={(e) => setVencimentoInicio(e.target.value)}
                  />
                  <input 
                    type="date"
                    className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                    value={vencimentoFim}
                    onChange={(e) => setVencimentoFim(e.target.value)}
                  />
                </div>
              </div>

              {/* Filtro Venda Intervalo */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                  <CheckCircle size={12}/> Período da Venda
                </label>
                <div className="flex flex-col gap-2">
                  <input 
                    type="date"
                    className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                    value={vendaInicio}
                    onChange={(e) => setVendaInicio(e.target.value)}
                  />
                  <input 
                    type="date"
                    className="w-full h-10 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 px-2 outline-none"
                    value={vendaFim}
                    onChange={(e) => setVendaFim(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Ações de Filtro */}
            <div className="flex justify-end pt-2 border-t border-slate-50">
              {(selectedCorretores.length > 0 || selectedParceiros.length > 0 || vencimentoInicio || vencimentoFim || vendaInicio || vendaFim) && (
                <button 
                  onClick={() => {
                      if(userProfile?.tipo_usuario !== 'CORRETOR') setSelectedCorretores([]);
                      setSelectedParceiros([]);
                      setVencimentoInicio("");
                      setVencimentoFim("");
                      setVendaInicio("");
                      setVendaFim("");
                  }}
                  className="text-[10px] font-black text-red-500 uppercase hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                >
                  × Limpar Todos os Filtros
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Proposta</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Cliente</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Status</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Total Estimado</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : propostasFiltradas.map((p) => (
                <tr key={p.id} className="group hover:bg-blue-50/20 transition-all">
                  <td className="p-5 border-b border-slate-50">
                    <div className="text-sm font-black text-blue-600 italic leading-none">{p.numero_proposta}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold italic uppercase">Vence: {formatarDataBR(p.data_validade)}</div>
                  </td>
                  <td className="p-5 border-b border-slate-50">
                    <div className="text-sm font-bold text-slate-700 uppercase leading-none">
                      {p.tab_clientes?.tipo_cliente === 'PJ' ? p.tab_clientes?.razao_social : p.tab_clientes?.nome}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-medium italic">
                      Corretor: {p.usuarios_perfis?.nome}
                    </div>
                  </td>
                  <td className="p-5 border-b border-slate-50">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm
                      ${p.status === 'Vendido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        p.status === 'Perdido' ? 'bg-red-50 text-red-600 border-red-100' : 
                        'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-5 border-b border-slate-50">
                    <div className="text-sm font-black text-slate-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_proposta)}
                    </div>
                  </td>
                  <td className="p-5 border-b border-slate-50">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setModalStatus({ open: true, type: 'VENDIDO', proposta: p })} 
                        className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all" title="Marcar como Vendido">
                        <CheckCircle size={18} />
                      </button>
                      
                      <button onClick={() => setModalStatus({ open: true, type: 'PERDIDO', proposta: p })}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all" title="Marcar como Perda">
                        <XCircle size={18} />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-100 self-center mx-1" />

                      <button 
                        onClick={() => navigate(`/propostas/editar/${p.id}`)}
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all" 
                        title="Editar Opções"
                      >
                        <Edit3 size={18} />
                      </button>

                      <button onClick={() => handleRegerarPDF(p)}
                        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all" title="Gerar PDF">
                        <FileText size={18} />
                      </button>

                      <button onClick={() => executarExclusaoSegura(p)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}