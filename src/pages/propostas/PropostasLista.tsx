import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, FileText, Edit3, Trash2, 
  CheckCircle, XCircle, Loader2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { gerarPDFProposta } from "../../utils/gerarPDF";
import { ModalFechamento } from '../../components/propostas/ModalFechamento';
import { formatarDataBR } from "../../utils/dateUtils";

export default function PropostasLista() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [modalStatus, setModalStatus] = useState<{ open: boolean, type: 'VENDIDO' | 'PERDIDO', proposta: any }>({
    open: false,
    type: 'VENDIDO',
    proposta: null
  });

  // 1. Busca o perfil do usuário logado
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
      }
    }
    getInitialData();
  }, []);

  // 2. Dispara a busca quando o perfil carregar
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
          tab_clientes (nome, razao_social, tipo_cliente, cpf, cnpj, telefone_whats),
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
    if (!propostas) return []; // Garantia contra nulo
    const term = filter.toLowerCase().trim();
    
    return propostas.filter(p => {
      const numero = (p.numero_proposta || "").toLowerCase();
      const nomeCliente = (p.tab_clientes?.nome || "").toLowerCase();
      const razaoSocial = (p.tab_clientes?.razao_social || "").toLowerCase();
      
      return numero.includes(term) || nomeCliente.includes(term) || razaoSocial.includes(term);
    });
  }, [filter, propostas]);

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
          companhia: (opt.base_seguradoras as any)?.nome || 'N/A', // Cast para evitar erro de tipo
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

  const handleDelete = async (id: string) => {
    if (!userProfile?.corretora_id) return;
    
    if (confirm("Deseja realmente excluir esta proposta?")) {
      // Criamos a base da query com a trava da corretora
      let query = supabase
        .from('tab_propostas')
        .delete()
        .eq('id', id)
        .eq('corretora_id', userProfile.corretora_id);

      // Se for corretor, adicionamos a trava do ID dele
      if (userProfile.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', userProfile.id);
      }

      const { error } = await query;
      
      if (error) {
        alert("Erro ao excluir proposta ou você não tem permissão.");
      } else {
        fetchPropostas();
      }
    }
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black italic uppercase text-slate-800 tracking-tighter">
            Gestão de Propostas
          </h1>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente ou proposta..."
              className="w-full h-11 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
              onChange={(e) => setFilter(e.target.value)}
            />
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

                      <button onClick={() => handleDelete(p.id)}
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
        // Transformamos a proposta única em uma array para manter compatibilidade com o componente
        proposta={modalStatus.proposta ? [modalStatus.proposta] : []} 
        onClose={() => setModalStatus({ ...modalStatus, open: false })}
        onSuccess={() => {
          fetchPropostas(); 
        }}
      />
    </div>
  );
}