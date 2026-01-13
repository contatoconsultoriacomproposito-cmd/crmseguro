import { useState, useEffect } from "react";
import { 
  Users, Save, Trash2, Edit3, Loader2, 
  Briefcase, UserCheck
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";

interface Parceiro {
  id: string;
  nome_parceiro: string;
  setor_parceiro: string;
  observacao_parceiro: string;
  corretor_id: string;
  corretora_id: string;
}

export default function ParceirosCadastro() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [perfilLogado, setPerfilLogado] = useState<any>(null);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome_parceiro: "",
    setor_parceiro: "",
    observacao_parceiro: "",
    corretor_id: ""
  });

  useEffect(() => {
    async function inicializar() {
      if (!user) return;
      setFetching(true);
      try {
        // 1. Buscar Perfil do Usuário Logado
        const { data: perfil } = await supabase
          .from("usuarios_perfis")
          .select("*")
          .eq("id", user.id)
          .single();

        if (perfil) {
          setPerfilLogado(perfil);

          // 2. Carregar Corretores da mesma Corretora
          const { data: listaCorretores } = await supabase
            .from("usuarios_perfis")
            .select("id, nome")
            .eq("corretora_id", perfil.corretora_id) // Filtra todos da mesma "casa"
            .eq("tipo_usuario", "CORRETOR");

          if (listaCorretores) setCorretores(listaCorretores);

          // 3. Preencher corretor_id padrão se for CORRETOR
          if (perfil.tipo_usuario === "CORRETOR") {
            setForm(prev => ({ ...prev, corretor_id: perfil.id }));
          }

          // 4. Carregar Parceiros
          carregarParceiros(perfil);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    inicializar();
  }, [user]);

  async function carregarParceiros(perfil: any) {
    const { data } = await supabase
      .from("tab_parceiros")
      .select("*")
      .eq("corretora_id", perfil.corretora_id) // Sempre vê os parceiros da corretora
      .order("created_at", { ascending: false });
    
    if (data) setParceiros(data);
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      nome_parceiro: form.nome_parceiro.toUpperCase(),
      setor_parceiro: form.setor_parceiro.toUpperCase(),
      observacao_parceiro: form.observacao_parceiro,
      corretor_id: form.corretor_id,
      corretora_id: perfilLogado.corretora_id // Referência da administradora
    };

    try {
      if (editId) {
        await supabase.from("tab_parceiros").update(payload).eq("id", editId);
      } else {
        await supabase.from("tab_parceiros").insert([payload]);
      }
      
      // Limpar formulário (respeitando o corretor_id se for corretor logado)
      setForm({
        nome_parceiro: "",
        setor_parceiro: "",
        observacao_parceiro: "",
        corretor_id: perfilLogado.tipo_usuario === "CORRETOR" ? perfilLogado.id : ""
      });
      setEditId(null);
      carregarParceiros(perfilLogado);
    } catch (err) {
      alert("Erro ao salvar parceiro.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir este parceiro permanentemente?")) return;
    await supabase.from("tab_parceiros").delete().eq("id", id);
    carregarParceiros(perfilLogado);
  };

  if (fetching) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="text-blue-600" /> Parceiros de Negócios
          </h1>
          <p className="text-slate-500 text-sm">Cadastre parceiros que indicam clientes e gerencie comissões.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA DO FORMULÁRIO */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSalvar} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm sticky top-24">
            <h2 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest">
              {editId ? "Editar Parceiro" : "Novo Cadastro"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome / Empresa</label>
                <input required className="w-full h-11 px-4 mt-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                  value={form.nome_parceiro} onChange={e => setForm({...form, nome_parceiro: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Setor de Atuação</label>
                <input className="w-full h-11 px-4 mt-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                  value={form.setor_parceiro} onChange={e => setForm({...form, setor_parceiro: e.target.value})} placeholder="Ex: Contabilidade" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Corretor Responsável</label>
                <select required disabled={perfilLogado?.tipo_usuario === "CORRETOR"} 
                  className="w-full h-11 px-4 mt-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                  value={form.corretor_id} onChange={e => setForm({...form, corretor_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Observações</label>
                <textarea className="w-full p-4 mt-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                  rows={3} value={form.observacao_parceiro} onChange={e => setForm({...form, observacao_parceiro: e.target.value})} />
              </div>

              <button disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {editId ? "Atualizar" : "Cadastrar Parceiro"}
              </button>
              
              {editId && (
                <button type="button" onClick={() => { setEditId(null); setForm({nome_parceiro: "", setor_parceiro: "", observacao_parceiro: "", corretor_id: perfilLogado.tipo_usuario === "CORRETOR" ? perfilLogado.id : ""}); }} className="w-full text-xs font-bold text-slate-400 uppercase mt-2">Cancelar</button>
              )}
            </div>
          </form>
        </div>

        {/* COLUNA DA LISTA */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Parceiros Registrados</h3>
          <div className="grid grid-cols-1 gap-3">
            {parceiros.map(p => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-3xl flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 font-bold">
                    {p.nome_parceiro.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-100 uppercase text-sm">{p.nome_parceiro}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase"><Briefcase size={12}/> {p.setor_parceiro}</span>
                      <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1 uppercase"><UserCheck size={12}/> {corretores.find(c => c.id === p.corretor_id)?.nome || 'Direto'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setEditId(p.id); setForm(p); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-blue-600"><Edit3 size={18}/></button>
                  <button onClick={() => handleExcluir(p.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
            {parceiros.length === 0 && <p className="text-center py-10 text-slate-400 italic text-sm">Nenhum parceiro cadastrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}