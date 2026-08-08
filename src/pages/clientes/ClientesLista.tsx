import { useEffect, useState } from "react";
import { 
  Search, Plus, Pencil, Trash2, Building2, User, Phone,
  AlertTriangle, Loader2, FileSpreadsheet, Users2, ArrowLeftRight,
  BarChart3, CalendarPlus, Calendar, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';

export default function ClientesLista() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroCorretor, setFiltroCorretor] = useState<string>("todos");
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<any | null>(null);

  // Estados para Gestor de Carteiras
  const [showGestor, setShowGestor] = useState(false);
  const [transferDe, setTransferDe] = useState("");
  const [transferPara, setTransferPara] = useState("");
  const [transferindo, setTransferindo] = useState(false);

  // Estados do Modal de Agendamento
const [clienteAgendamento, setClienteAgendamento] = useState<any | null>(null);
const [dataRetornoInput, setDataRetornoInput] = useState<string>('');
const [horarioRetornoInput, setHorarioRetornoInput] = useState<string>('');
const [salvandoAgendamento, setSalvandoAgendamento] = useState<boolean>(false);

// Abrir Modal
const abrirModalAgendamento = (cliente: any) => {
  setClienteAgendamento(cliente);
  setDataRetornoInput(cliente.data_retorno || '');
  setHorarioRetornoInput(cliente.horario_retorno ? cliente.horario_retorno.slice(0, 5) : '09:00');
};

// Salvar Agendamento
const handleSalvarAgendamento = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!clienteAgendamento) return;

  try {
    setSalvandoAgendamento(true);

    const { error } = await supabase
      .from('tab_clientes')
      .update({
        data_retorno: dataRetornoInput || null,
        horario_retorno: horarioRetornoInput ? `${horarioRetornoInput}:00` : null,
      })
      .eq('id', clienteAgendamento.id);

    if (error) throw error;

    // Atualiza a lista local sem re-fetch
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteAgendamento.id
          ? {
              ...c,
              data_retorno: dataRetornoInput || null,
              horario_retorno: horarioRetornoInput ? `${horarioRetornoInput}:00` : null,
            }
          : c
      )
    );

    setClienteAgendamento(null);
  } catch (err) {
    console.error('Erro ao agendar retorno:', err);
    alert('Ocorreu um erro ao agendar o retorno.');
  } finally {
    setSalvandoAgendamento(false);
  }
};

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario, nome')
          .eq('id', user.id)
          .single();
        
        setUserProfile(perfil);
      }
    }
    getInitialData();
  }, []);

  useEffect(() => {
    if (userProfile?.corretora_id) {
      carregarClientes();
      carregarCorretores();
    }
  }, [userProfile]);

  async function carregarCorretores() {
    const { data } = await supabase
      .from('usuarios_perfis')
      .select('id, nome')
      .eq('corretora_id', userProfile.corretora_id)
      .eq('tipo_usuario', 'CORRETOR');
    setCorretores(data || []);
  }

  async function carregarClientes() {
  if (!userProfile?.corretora_id) return;
  try {
    setLoading(true);
    let query = supabase
      .from("tab_clientes")
      .select(`
        *,
        usuarios_perfis!tab_clientes_corretor_id_fkey(nome),
        tab_propostas!tab_propostas_cliente_id_fkey (
          id,
          status,
          tab_proposta_opcoes (
            id,
            base_seguradoras!tab_proposta_opcoes_seguradora_id_fkey ( id, nome ),
            tab_proposta_itens (
              id,
              data_fim_vigencia,
              numero_apolice,
              status_renovacao,
              base_produtos!tab_proposta_itens_produto_id_fkey ( id, nome )
            )
          )
        )
      `)
      .eq("tab_propostas.status", "Vendido")
      .eq("corretora_id", userProfile.corretora_id)
      .order("created_at", { ascending: false });

    if (userProfile.tipo_usuario === 'CORRETOR') {
      query = query.eq('corretor_id', userProfile.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    setClientes(data || []);
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
  } finally {
    setLoading(false);
  }
}

  // Helper para extrair produtos ativos/vendidos do cliente
  const extrairProdutosDoCliente = (cliente: any) => {
  if (!cliente.tab_propostas || cliente.tab_propostas.length === 0) return [];

  const produtosMap = new Map();

  cliente.tab_propostas.forEach((proposta: any) => {
    if (proposta.status === 'Cancelada' || proposta.status === 'Perdida') return;

    proposta.tab_proposta_opcoes?.forEach((opcao: any) => {
      // Nome da seguradora vem da opção
      const nomeSeguradora = opcao.base_seguradoras?.nome;

      opcao.tab_proposta_itens?.forEach((item: any) => {
        if (item.status_renovacao === 'CANCELADA') return;

        const nomeProduto = item.base_produtos?.nome;

        if (nomeProduto) {
          const key = `${nomeProduto}-${nomeSeguradora || ''}`;
          if (!produtosMap.has(key)) {
            produtosMap.set(key, {
              produto: nomeProduto,
              seguradora: nomeSeguradora
            });
          }
        }
      });
    });
  });

  return Array.from(produtosMap.values());
};

const extrairVigenciasDoCliente = (cliente: any) => {
  if (!cliente?.tab_propostas) return [];

  const listaVigencias: Array<{
    produto: string;
    seguradora?: string;
    fimVigencia?: string;
    numeroApolice?: string;
  }> = [];

  cliente.tab_propostas.forEach((proposta: any) => {
    if (proposta.status !== 'Vendido') return;

    proposta.tab_proposta_opcoes?.forEach((opcao: any) => {
      const nomeSeguradora = opcao.base_seguradoras?.nome;

      opcao.tab_proposta_itens?.forEach((item: any) => {
        if (item.status_renovacao === 'CANCELADA') return;

        listaVigencias.push({
          produto: item.base_produtos?.nome || 'Produto Sem Nome',
          seguradora: nomeSeguradora,
          fimVigencia: item.data_fim_vigencia,
          numeroApolice: item.numero_apolice,
        });
      });
    });
  });

  return listaVigencias;
};

  async function handleTransferenciaCarteira() {
    if (!transferDe || !transferPara || transferDe === transferPara) return;
    
    setTransferindo(true);
    try {
      const { error } = await supabase
        .from("tab_clientes")
        .update({ 
            corretor_id: transferPara,
            updated_at: new Date().toISOString()
        })
        .eq("corretora_id", userProfile.corretora_id)
        .eq("corretor_id", transferDe);

      if (error) throw error;
      
      toast.success("Carteira transferida com sucesso!", {
        style: {
          borderRadius: '16px',
          background: '#333',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        },
      });

      setShowGestor(false);
      setTransferDe("");
      setTransferPara("");
      carregarClientes();
    } catch (error) {
      console.error("Erro na transferência:", error);
      toast.error("Falha ao transferir carteira.");
    } finally {
      setTransferindo(false);
    }
  }

  const exportarExcel = () => {
    setExporting(true);
    try {
      const camposOmitidos = ['google_event_id_sinistro', 'google_event_id_comercial', 'corretor_id', 'corretora_id', 'id', 'usuarios_perfis'];
      const dadosParaExportar = clientesFiltrados.map(cliente => {
        const filtrado: any = {};
        Object.keys(cliente).forEach(key => {
          if (!camposOmitidos.includes(key)) {
            const valor = cliente[key];
            if (typeof valor === 'boolean') {
              filtrado[key.toUpperCase()] = valor ? 'SIM' : 'NÃO';
            } else {
              filtrado[key.toUpperCase()] = valor !== null && valor !== undefined ? String(valor) : '';
            }
          }
        });
        return filtrado;
      });

      const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, `Relatorio_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
    } finally {
      setExporting(false);
    }
  };

  async function handleExcluir() {
    if (!confirmarExclusao || !userProfile) return;
    try {
      setExcluindoId(confirmarExclusao.id);
      let deleteQuery = supabase
        .from("tab_clientes")
        .delete()
        .eq("id", confirmarExclusao.id)
        .eq("corretora_id", userProfile.corretora_id);

      if (userProfile.tipo_usuario === 'CORRETOR') {
        deleteQuery = deleteQuery.eq('corretor_id', userProfile.id);
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== confirmarExclusao.id));
      setConfirmarExclusao(null);
      toast.success("Cliente removido com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao remover cliente.");
    } finally {
      setExcluindoId(null);
    }
  }

  const clientesFiltrados = clientes.filter((c) => {
    const atendeFiltroCorretor = filtroCorretor === "todos" || c.corretor_id === filtroCorretor;
    if (!atendeFiltroCorretor) return false;

    if (!busca) return true;
    const termo = busca.toLowerCase().trim();
    const termoApenasNumeros = termo.replace(/\D/g, "");
    const nome = (c.nome || "").toLowerCase();
    const razaoSocial = (c.razao_social || "").toLowerCase();
    const nomeFantasia = (c.nome_fantasia || "").toLowerCase();
    const cpf = (c.cpf || "").replace(/\D/g, "");
    const cnpj = (c.cnpj || "").replace(/\D/g, "");
    const whatsOriginal = (c.telefone_whats || "").toLowerCase();
    const whatsLimpo = whatsOriginal.replace(/\D/g, "");

    if (termo.includes("(") || termo.includes(")")) return whatsOriginal.includes(termo);
    if (termoApenasNumeros && termo === termoApenasNumeros) {
      return cpf.includes(termoApenasNumeros) || cnpj.includes(termoApenasNumeros) || whatsLimpo.includes(termoApenasNumeros);
    }
    return nome.includes(termo) || razaoSocial.includes(termo) || nomeFantasia.includes(termo);
  });

  // 📊 INDICADORES EM TEMPO REAL COM BASE NA BASE FILTRADA/ATUAL
  const totalGeral = clientesFiltrados.length;
  const totalPJ = clientesFiltrados.filter(c => c.tipo_cliente === "PJ").length;
  const totalPF = clientesFiltrados.filter(c => c.tipo_cliente === "PF").length;
  const totalDireto = clientesFiltrados.filter(c => c.corretor_id === c.corretora_id).length;

  return (
  <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] transition-colors pb-20">
    
    {/* HEADER */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-zinc-100 italic uppercase tracking-tighter">Clientes</h1>
        <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Base de dados unificada</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {userProfile?.tipo_usuario === 'CORRETORA' && (
          <button 
            onClick={() => setShowGestor(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-2xl font-black uppercase text-[10px] shadow-sm transition-all active:scale-95"
          >
            <Users2 size={18} />
            Gestor de Carteiras
          </button>
        )}

        <button 
          onClick={exportarExcel}
          disabled={loading || exporting}
          className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl text-emerald-600 font-black uppercase text-[10px] shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all disabled:opacity-30 active:scale-95"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          Exportar Excel
        </button>

        <button 
          onClick={() => navigate("/clientes/cadastro")}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/25 font-black uppercase text-[11px] active:scale-95"
        >
          <Plus size={20} /> Novo Cadastro
        </button>
      </div>
    </div>

    {/* 📊 SEÇÃO DE CARDS DE INDICADORES (KPIs DETALHADOS) */}
    <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Carteira</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-zinc-100 italic tracking-tighter mt-1">{loading ? "---" : totalGeral}</h3>
        </div>
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
          <BarChart3 size={20} />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Empresas (PJ)</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter mt-1">{loading ? "---" : totalPJ}</h3>
        </div>
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
          <Building2 size={20} />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pessoas (PF)</p>
          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter mt-1">{loading ? "---" : totalPF}</h3>
        </div>
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
          <User size={20} />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atend. Direto</p>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 italic tracking-tighter mt-1">{loading ? "---" : totalDireto}</h3>
        </div>
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
          <Users2 size={20} />
        </div>
      </div>
    </div>

    {/* FILTROS E BUSCA */}
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Pesquisar por CPF/CNPJ, Nome, Telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-zinc-100 font-medium"
        />
      </div>

      {userProfile?.tipo_usuario === 'CORRETORA' && (
        <select
          value={filtroCorretor}
          onChange={(e) => setFiltroCorretor(e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-4 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300 min-w-[200px]"
        >
          <option value="todos">Todos os Corretores</option>
          <option value={userProfile.corretora_id}>Atendimento Direto (Corretora)</option>
          {corretores.map(cor => (
            <option key={cor.id} value={cor.id}>{cor.nome}</option>
          ))}
        </select>
      )}
    </div>

    {/* TABELA */}
    <div className="max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
              
              {/* 🗓️ COLUNA RETORNO */}
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Retorno</th>
              
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">WhatsApp</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestão de Conta</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-20 text-center text-slate-400 font-black uppercase text-[10px] italic tracking-widest">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-all group">
                  
                  {/* 1. TIPO (PF/PJ) */}
                  <td className="p-5 text-center">
                    {cliente.tipo_cliente === "PJ" ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto border border-blue-100/50">
                        <Building2 size={18} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-100/50">
                        <User size={18} />
                      </div>
                    )}
                  </td>

                  {/* 2. DOCUMENTO */}
                  <td className="p-5 text-sm font-bold text-slate-600 dark:text-zinc-300">
                    {cliente.tipo_cliente === "PJ" ? cliente.cnpj : cliente.cpf}
                  </td>

                  {/* 3. CLIENTE + PRODUTOS VENDIDOS */}
                  <td className="p-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-black text-slate-800 dark:text-zinc-100 uppercase italic tracking-tighter">
                        {cliente.tipo_cliente === "PJ" ? cliente.razao_social : cliente.nome}
                      </span>
                      
                      {cliente.nome_fantasia && (
                        <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest -mt-1">
                          {cliente.nome_fantasia}
                        </span>
                      )}

                      {/* 🏷️ BADGES DOS PRODUTOS / SEGURADORAS */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(() => {
                          const produtos = extrairProdutosDoCliente(cliente);
                          
                          if (produtos.length === 0) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 px-2 py-0.5 rounded-md shadow-sm">
                                🚨 Sem produtos ativos
                              </span>
                            );
                          }

                          return produtos.map((item, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 px-2 py-0.5 rounded-md"
                              title={item.seguradora ? `Seguradora: ${item.seguradora}` : undefined}
                            >
                              🛡️ {item.produto}
                              {item.seguradora && (
                                <span className="text-slate-400 dark:text-zinc-500 font-normal">
                                  ({item.seguradora})
                                </span>
                              )}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  </td>

                  {/* 4. RETORNO (DATA E HORÁRIO) */}
                  <td className="p-5 text-center">
                    {cliente.data_retorno ? (
                      <div className="inline-flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 px-3 py-1.5 rounded-xl shadow-sm">
                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight flex items-center gap-1">
                          📅 {new Date(`${cliente.data_retorno}T00:00:00`).toLocaleDateString('pt-BR')}
                        </span>
                        {cliente.horario_retorno && (
                          <span className="text-[9px] font-bold text-amber-600/80 dark:text-amber-400/80">
                            ⏰ {cliente.horario_retorno.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-zinc-700 text-xs font-bold">---</span>
                    )}
                  </td>

                  {/* 5. WHATSAPP */}
                  <td className="p-5 text-center">
                    {cliente.telefone_whats ? (
                      <a 
                        href={`https://wa.me/${cliente.telefone_whats.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black border border-emerald-100/50 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        <Phone size={14} /> {cliente.telefone_whats}
                      </a>
                    ) : (
                      <span className="text-slate-300 dark:text-zinc-700 text-xs font-bold">---</span>
                    )}
                  </td>

                  {/* 6. GESTÃO DE CONTA */}
                  <td className="p-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase max-w-fit">
                        👤 {cliente.corretor_id === cliente.corretora_id ? "DIRETO CORRETORA" : (cliente.usuarios_perfis?.nome || "GERAL")}
                      </span>
                      {cliente.created_at && (
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                          📅 Entrada: {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 7. AÇÕES */}
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      
                      {/* 📅 BOTÃO AGENDAR RETORNO */}
                      <button 
                        onClick={() => abrirModalAgendamento(cliente)} 
                        title="Agendar Retorno Comercial"
                        className="p-2.5 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition-all border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-500/10"
                      >
                        <CalendarPlus size={16} />
                      </button>

                      {/* ✏️ EDITAR */}
                      <button 
                        onClick={() => navigate(`/clientes/editar/${cliente.id}`)} 
                        title="Editar Cliente"
                        className="p-2.5 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100 dark:border-blue-900/30"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* 🗑️ EXCLUIR */}
                      <button 
                        disabled={excluindoId === cliente.id}
                        onClick={() => setConfirmarExclusao(cliente)} 
                        title="Excluir Cliente"
                        className="p-2.5 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 dark:border-red-900/30"
                      >
                        {excluindoId === cliente.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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

    {/* MODAL DE AGENDAMENTO DE RETORNO E VIGÊNCIAS */}
    {clienteAgendamento && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 space-y-5">
          
          {/* CABEÇALHO DO MODAL */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                <Calendar className="text-amber-500" size={18} /> Agendar Retorno
              </h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                {clienteAgendamento.tipo_cliente === "PJ" ? clienteAgendamento.razao_social : clienteAgendamento.nome}
              </p>
            </div>
            <button 
              onClick={() => setClienteAgendamento(null)} 
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* 🛡️ SEÇÃO: PRODUTOS CONTRATADOS & FIM DE VIGÊNCIA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
              Vigência dos Produtos Adquiridos
            </label>
            
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-3 border border-slate-100 dark:border-zinc-800/80 space-y-2 max-h-40 overflow-y-auto">
              {(() => {
                const vigencias = extrairVigenciasDoCliente(clienteAgendamento);
                
                if (vigencias.length === 0) {
                  return (
                    <div className="text-center py-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      🚨 Cliente sem produtos ativos cadastrados
                    </div>
                  );
                }

                return vigencias.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-800 dark:text-zinc-200 uppercase">
                        🛡️ {v.produto}
                      </span>
                      {v.seguradora && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                          {v.seguradora} {v.numeroApolice && `• Apólice: ${v.numeroApolice}`}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 px-2 py-1 rounded-lg inline-block">
                        Vence: {v.fimVigencia ? new Date(`${v.fimVigencia}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* FORMULÁRIO DE RETORNO */}
          <form onSubmit={handleSalvarAgendamento} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              
              {/* CAMPO DATA */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Data de Retorno
                </label>
                <input 
                  type="date"
                  required
                  value={dataRetornoInput}
                  onChange={(e) => setDataRetornoInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* CAMPO HORÁRIO */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Horário
                </label>
                <input 
                  type="time"
                  required
                  value={horarioRetornoInput}
                  onChange={(e) => setHorarioRetornoInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

            </div>

            {/* BOTÕES DE AÇÃO DO MODAL DE AGENDAMENTO */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setClienteAgendamento(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-wider"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={salvandoAgendamento}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 uppercase tracking-wider"
              >
                {salvandoAgendamento ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                Confirmar
              </button>
            </div>
          </form>

        </div>
      </div>
    )}

    {/* MODAL GESTOR DE CARTEIRAS */}
    {showGestor && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-zinc-800 transform animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-6 border border-amber-100/50">
            <ArrowLeftRight size={40} />
          </div>
          <h2 className="text-xl font-black text-center text-slate-800 dark:text-zinc-100 mb-2 uppercase italic">Gestor de Carteiras</h2>
          <p className="text-center text-slate-500 dark:text-zinc-400 text-[10px] mb-8 font-black uppercase tracking-widest">Transferir clientes entre corretores</p>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Retirar De:</label>
              <select 
                value={transferDe} 
                onChange={(e) => setTransferDe(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold uppercase"
              >
                <option value="">Selecione a origem</option>
                <option value={userProfile.corretora_id}>Atendimento Direto (Corretora)</option>
                {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="flex justify-center text-slate-300">
              <ArrowLeftRight size={20} className="rotate-90" />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Transferir Para:</label>
              <select 
                value={transferPara} 
                onChange={(e) => setTransferPara(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold uppercase"
              >
                <option value="">Selecione o destino</option>
                <option value={userProfile.corretora_id}>Atendimento Direto (Corretora)</option>
                {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              disabled={transferindo || !transferDe || !transferPara || transferDe === transferPara}
              onClick={handleTransferenciaCarteira} 
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {transferindo ? "Transferindo..." : "Executar Transferência"}
            </button>
            <button onClick={() => setShowGestor(false)} className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DE EXCLUSÃO */}
    {confirmarExclusao && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-zinc-800 transform animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6 border border-red-100/50">
            <AlertTriangle size={40} />
          </div>
          <h2 className="text-xl font-black text-center text-slate-800 dark:text-zinc-100 mb-2 uppercase italic">Excluir Registro?</h2>
          <p className="text-center text-slate-500 dark:text-zinc-400 text-xs mb-8 font-bold uppercase tracking-tight">
            Deseja remover <strong>{confirmarExclusao.nome || confirmarExclusao.razao_social}</strong> definitivamente?
          </p>
          <div className="flex flex-col gap-3">
            <button 
              disabled={excluindoId !== null}
              onClick={handleExcluir} 
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-red-500/20"
            >
              {excluindoId ? "Processando..." : "Confirmar Exclusão"}
            </button>
            <button onClick={() => setConfirmarExclusao(null)} className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
              Manter Cliente
            </button>
          </div>
        </div>
      </div>
    )}

    <Toaster position="bottom-right" reverseOrder={false} />
  </div>
);
}