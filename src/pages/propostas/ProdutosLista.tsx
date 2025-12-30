import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, Edit3, Loader2, Calendar, Hash, ShieldCheck, ArrowRight 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatarDataBR } from "../../utils/dateUtils";

interface ItemRenovacaoFormatado {
  id_item: string;
  valor: number;
  data_inicio_vigencia: string; // Novo
  data_fim_vigencia: string;    // Novo (Substitui data_renovacao)
  produto: string;
  seguradora: string;
  proposta_id: string;
  numero_proposta: string;
  numero_cotacao: string;
  numero_apolice: string;
  status: string;
  cliente: string;
  corretor: string;
}

export default function ProdutosLista() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<ItemRenovacaoFormatado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItensRenovacao();
  }, []);

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
          base_produtos (nome),
          tab_proposta_opcoes!inner (
            base_seguradoras (nome),
            tab_propostas!inner (
              id,
              numero_proposta,
              status,
              corretor_id,
              corretora_id,
              tab_clientes (nome, razao_social, tipo_cliente),
              usuarios_perfis!tab_propostas_corretor_id_fkey(nome)
            )
          )
        `);

      query = query.eq("tab_proposta_opcoes.tab_propostas.corretora_id", perfil.corretora_id);
      
      if (perfil.tipo_usuario === 'CORRETOR') {
        query = query.eq("tab_proposta_opcoes.tab_propostas.corretor_id", perfil.id);
      }

      // Ordenamos agora pela data de fim da vigência (próxima renovação)
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
          numero_cotacao: item.numero_cotacao || "",
          numero_apolice: item.numero_apolice || "",
          produto: produtoObj?.nome || "Não definido", 
          seguradora: seguradoraObj?.nome || "Não informada",
          proposta_id: propostaObj?.id,
          numero_proposta: propostaObj?.numero_proposta,
          status: propostaObj?.status,
          cliente: propostaObj?.tab_clientes?.tipo_cliente === 'PJ' 
            ? propostaObj?.tab_clientes?.razao_social 
            : propostaObj?.tab_clientes?.nome,
          corretor: propostaObj?.usuarios_perfis?.nome
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

      // Filtro de data agora baseado no fim da vigência
      const dataItem = i.data_fim_vigencia ? new Date(i.data_fim_vigencia + 'T12:00:00') : null;
      const matchData = (!dataInicio || (dataItem && dataItem >= new Date(dataInicio + 'T00:00:00'))) &&
                        (!dataFim || (dataItem && dataItem <= new Date(dataFim + 'T23:59:59')));

      return matchTexto && matchData;
    });
  }, [filter, dataInicio, dataFim, itens]);

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black italic uppercase text-slate-800 tracking-tighter">
              Produtos & Vigências
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase italic tracking-widest">
              Controle de Apólices e Renovação Automática
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-sm">
              <Calendar size={16} className="text-blue-500" />
              <input type="date" className="text-xs font-bold outline-none bg-transparent text-slate-600" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span className="text-slate-300 text-xs font-bold px-1">até</span>
              <input type="date" className="text-xs font-bold outline-none bg-transparent text-slate-600" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>

            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente, produto ou apólice..."
                className="h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none text-sm shadow-sm w-full lg:w-80"
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
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
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">Período de Vigência</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : itensFiltrados.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Nenhum item encontrado</td></tr>
              ) : itensFiltrados.map((item) => (
                <tr key={item.id_item} className="group hover:bg-slate-50/50 transition-all">
                  <td className="p-5 border-b border-slate-50 font-black text-blue-600 italic text-sm">{item.numero_proposta}</td>
                  
                  <td className="p-5 border-b border-slate-50">
                    <div className="text-sm font-bold text-slate-700 uppercase leading-none truncate max-w-[220px]">{item.cliente}</div>
                    <div className="text-[12px] text-blue-500 mt-1 font-black uppercase italic tracking-tighter">{item.seguradora}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ref: {item.corretor}</div>
                  </td>

                  <td className="p-5 border-b border-slate-50">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{item.produto}</span>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                    </div>
                  </td>

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

                  <td className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Início</span>
                        <span className="text-[13px] font-bold text-slate-600">
                          {item.data_inicio_vigencia ? formatarDataBR(item.data_inicio_vigencia) : '---'}
                        </span>
                      </div>
                      <ArrowRight size={12} className="text-slate-300 mt-3" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-500 uppercase">Renovação</span>
                        <span className="text-[13px] font-black text-slate-800">
                          {item.data_fim_vigencia ? formatarDataBR(item.data_fim_vigencia) : '---'}
                        </span>
                      </div>
                    </div>
                    <div className={`text-[9px] font-black uppercase mt-2 inline-block px-2 py-0.5 rounded ${item.status === 'Vendido' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {item.status}
                    </div>
                  </td>

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