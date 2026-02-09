import { useState, useEffect } from "react";
import { 
  Users, Save, Trash2, Edit3, Loader2, 
  Briefcase, UserCheck, Copy, User, ChevronDown, AlertCircle, 
  Mail, CheckCircle2, Search, Phone, ExternalLink, FileText
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import { maskPhone } from "../../utils/masks";

interface Parceiro {
  id: string;
  nome_parceiro: string;
  setor_parceiro: string;
  observacao_parceiro: string;
  corretor_id: string;
  corretora_id: string;
  tipo_parceiro: 'INTERNO' | 'EXTERNO';
  slug_link: string;
  telefone_parceiro: string;
  email_parceiro: string;
  tipo_chave_pix: string;
  chave_pix: string;
}

export default function ParceirosCadastro() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [busca, setBusca] = useState("");
  const [corretorFiltro, setCorretorFiltro] = useState<string>("TODOS");
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [perfilLogado, setPerfilLogado] = useState<any>(null);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [tipoAbas, setTipoAbas] = useState<'INTERNO' | 'EXTERNO'>('INTERNO');
  const [aviso, setAviso] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  const [form, setForm] = useState({
    nome_parceiro: "", setor_parceiro: "", observacao_parceiro: "",
    corretor_id: "", telefone_parceiro: "", email_parceiro: "",
    slug_link: "", tipo_chave_pix: "", chave_pix: ""
  });

  const mostrarAviso = (msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setAviso({ mensagem: msg, tipo });
    setTimeout(() => setAviso(null), 3500);
  };

  useEffect(() => {
    async function inicializar() {
      if (!user) return;
      setFetching(true);
      try {
        const { data: perfil } = await supabase.from("usuarios_perfis").select("*").eq("id", user.id).single();
        if (perfil) {
          setPerfilLogado(perfil);
          const { data: listaCorretores } = await supabase.from("usuarios_perfis")
            .select("id, nome")
            .eq("corretora_id", perfil.corretora_id)
            .eq("tipo_usuario", "CORRETOR");
          
          if (listaCorretores) setCorretores(listaCorretores);
          
          // Se for corretor, trava no ID dele. Se for corretora, por padrão pode ser Atendimento Direto.
          if (perfil.tipo_usuario === "CORRETOR") {
            setForm(prev => ({ ...prev, corretor_id: perfil.id }));
          } else {
            setForm(prev => ({ ...prev, corretor_id: perfil.corretora_id }));
          }

          await carregarParceiros(perfil);
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
      if (!perfil || !perfil.corretora_id) return;
      let query = supabase.from("tab_parceiros").select("*").eq("corretora_id", perfil.corretora_id);
      
      if (perfil.tipo_usuario === "CORRETOR") {
        query = query.eq("corretor_id", perfil.id);
      }
      
      const { data, error } = await query.order("nome_parceiro", { ascending: true });
      if (!error && data) setParceiros(data);
  }

  const handleNomeChange = (val: string) => {
    const nome = val.toUpperCase();
    if (!editId && tipoAbas === 'EXTERNO') {
      const slug = val.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      setForm({ ...form, nome_parceiro: nome, slug_link: slug });
    } else { 
      setForm({ ...form, nome_parceiro: nome }); 
    }
  };

  const resetForm = () => {
    setForm({
      nome_parceiro: "", setor_parceiro: "", observacao_parceiro: "",
      corretor_id: perfilLogado?.tipo_usuario === "CORRETOR" ? perfilLogado.id : perfilLogado?.corretora_id || "",
      telefone_parceiro: "", email_parceiro: "", slug_link: "", tipo_chave_pix: "", chave_pix: ""
    });
    setEditId(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !perfilLogado) return;
    setLoading(true);

    const payload = {
      nome_parceiro: form.nome_parceiro.toUpperCase(),
      setor_parceiro: form.setor_parceiro.toUpperCase(),
      observacao_parceiro: form.observacao_parceiro,
      corretor_id: form.corretor_id, 
      corretora_id: perfilLogado.corretora_id,
      tipo_parceiro: tipoAbas,
      telefone_parceiro: form.telefone_parceiro,
      email_parceiro: form.email_parceiro.toLowerCase(),
      slug_link: tipoAbas === 'EXTERNO' ? form.slug_link : null,
      tipo_chave_pix: form.tipo_chave_pix,
      chave_pix: form.chave_pix,
      status_parceiro: 'ATIVO'
    };

    try {
      if (editId) {
        const { error } = await supabase.from("tab_parceiros").update(payload).eq("id", editId);
        if (error) throw error;
        mostrarAviso("Alterações salvas com sucesso!");
      } else {
        const { error } = await supabase.from("tab_parceiros").insert([payload]);
        if (error) throw error;
        mostrarAviso("Parceiro cadastrado com sucesso!");
      }
      resetForm();
      await carregarParceiros(perfilLogado); 
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      mostrarAviso(err.code === '23505' ? "Este link já está em uso." : "Erro ao salvar dados.", 'erro');
    } finally { 
      setLoading(false); 
    }
  };

  const copiarLink = (slug: string) => {
    if (!slug) return mostrarAviso("Erro: Sem link.", 'erro');
    const url = `${window.location.origin}/portal/${slug}`;
    navigator.clipboard.writeText(url);
    mostrarAviso("Link copiado com sucesso!");
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir parceiro permanentemente?")) return;
    let query = supabase.from("tab_parceiros").delete().eq("id", id);
    if (perfilLogado?.tipo_usuario === "CORRETOR") {
      query = query.eq("corretor_id", perfilLogado.id);
    }
    const { error } = await query;
    if (!error) { 
      mostrarAviso("Parceiro removido."); 
      setParceiros(prev => prev.filter(p => p.id !== id)); 
    } else {
      mostrarAviso("Erro ao excluir ou permissão negada.", "erro");
    }
  };

  const parceirosFiltrados = parceiros.filter(p => {
    const pertenceAba = (p.tipo_parceiro || 'INTERNO') === tipoAbas;
    const atendeBuscaTexto = p.nome_parceiro.toLowerCase().includes(busca.toLowerCase()) || 
                             p.setor_parceiro?.toLowerCase().includes(busca.toLowerCase());
    const atendeFiltroCorretor = corretorFiltro === "TODOS" || p.corretor_id === corretorFiltro;
    return pertenceAba && atendeBuscaTexto && atendeFiltroCorretor;
  });

  if (fetching) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Carregando Ecossistema...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {aviso && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 border backdrop-blur-md ${aviso.tipo === 'sucesso' ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-red-600 text-white border-red-400'}`}>
          {aviso.tipo === 'sucesso' ? <CheckCircle2 size={18} className="text-blue-400"/> : <AlertCircle size={18}/>}
          <span className="text-[10px] font-black uppercase tracking-widest">{aviso.mensagem}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20"><Users size={20} /></div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Parceiros de Negócio</h1>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Gestão centralizada de indicações {tipoAbas.toLowerCase()}s</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {perfilLogado?.tipo_usuario === 'CORRETORA' && (
            <div className="relative group">
              <select 
                value={corretorFiltro}
                onChange={(e) => setCorretorFiltro(e.target.value)}
                className="bg-white border-2 border-blue-100 rounded-xl px-4 h-12 text-[10px] font-black uppercase text-blue-600 focus:border-blue-600 outline-none transition-all appearance-none pr-10 shadow-sm hover:border-blue-300 cursor-pointer"
              >
                <option value="TODOS">🔍 TODOS OS RESPONSÁVEIS</option>
                <option value={perfilLogado?.corretora_id}>🏢 ATENDIMENTO DIRETO</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
            </div>
          )}

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
            <input 
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="PESQUISAR PARCEIRO..."
              className="bg-white border-2 border-slate-200 rounded-xl pl-11 pr-4 h-12 w-full md:w-48 text-[11px] font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['INTERNO', 'EXTERNO'] as const).map(aba => (
              <button key={aba} type="button" onClick={() => { setTipoAbas(aba); resetForm(); }}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${tipoAbas === aba ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {aba}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-blue-600">
            <Users size={120} />
          </div>

          <form onSubmit={handleSalvar} className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="lg:col-span-2">
                <label className="text-[9px] font-black text-slate-600 uppercase ml-2 mb-2 block tracking-wider">Nome do Parceiro</label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input required 
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border-2 border-slate-200 font-bold text-xs text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-slate-300" 
                    value={form.nome_parceiro} onChange={e => handleNomeChange(e.target.value)} placeholder="EX: BRUCE DUARTE" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase ml-2 mb-2 block tracking-wider">E-mail</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input type="email" 
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border-2 border-slate-200 font-bold text-xs text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all" 
                    value={form.email_parceiro} onChange={e => setForm({...form, email_parceiro: e.target.value})} placeholder="parceiro@email.com" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase ml-2 mb-2 block tracking-wider">WhatsApp</label>
                <div className="relative group">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border-2 border-slate-200 font-bold text-xs text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all" 
                    value={form.telefone_parceiro} onChange={e => setForm({...form, telefone_parceiro: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>

            {tipoAbas === 'EXTERNO' && (
              <div className="mb-6 p-6 rounded-2xl bg-blue-50/40 border-2 border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                      <label className="text-[9px] font-black text-blue-700 uppercase ml-1 mb-2 block tracking-wider">Chave PIX (Para Repasses)</label>
                      <div className="flex gap-2">
                          <select className="h-11 px-3 rounded-lg border-2 border-slate-200 bg-white font-bold text-[10px] uppercase outline-none focus:border-blue-600 transition-all cursor-pointer"
                              value={form.tipo_chave_pix} onChange={e => setForm({...form, tipo_chave_pix: e.target.value})}>
                              <option value="">TIPO...</option>
                              <option value="CPF">CPF</option><option value="CNPJ">CNPJ</option><option value="EMAIL">E-MAIL</option><option value="CELULAR">CELULAR</option>
                          </select>
                          <input className="flex-1 h-11 px-4 rounded-lg border-2 border-slate-200 bg-white font-bold text-xs text-slate-700 outline-none focus:border-blue-600 transition-all uppercase placeholder:text-slate-300" 
                              value={form.chave_pix} onChange={e => setForm({...form, chave_pix: e.target.value})} placeholder="INFORME A CHAVE..." />
                      </div>
                  </div>
                  <div>
                      <label className="text-[9px] font-black text-blue-700 uppercase ml-1 mb-2 block tracking-wider italic">Identificador do Portal (URL)</label>
                      <div className="flex items-center h-11 bg-white px-4 rounded-lg border-2 border-slate-200 focus-within:border-blue-600 transition-all">
                          <span className="text-[10px] font-black text-slate-400 mr-1 select-none">/portal/</span>
                          <input required className="flex-1 bg-transparent font-black text-[11px] text-blue-600 outline-none" 
                              value={form.slug_link} onChange={e => setForm({...form, slug_link: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                      </div>
                  </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase ml-2 mb-2 block tracking-wider">Setor/Ramo</label>
                <div className="relative group">
                  <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border-2 border-slate-200 font-bold text-xs text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all uppercase" 
                    value={form.setor_parceiro} onChange={e => setForm({...form, setor_parceiro: e.target.value.toUpperCase()})} placeholder="EX: OFICINA, LOJA..." />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase ml-2 mb-2 block tracking-wider">Corretor Responsável</label>
                <div className="relative group">
                  <UserCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                  <select required disabled={perfilLogado?.tipo_usuario === "CORRETOR"} 
                    className="w-full h-12 pl-12 pr-10 rounded-xl bg-white border-2 border-slate-200 font-bold text-xs text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none appearance-none cursor-pointer disabled:opacity-60 transition-all"
                    value={form.corretor_id} onChange={e => setForm({...form, corretor_id: e.target.value})}>
                    <option value="">SELECIONE O RESPONSÁVEL</option>
                    <option value={perfilLogado?.corretora_id} className="text-blue-600 font-bold">🏢 ATENDIMENTO DIRETO (CORRETORA)</option>
                    {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-[9px] font-black text-slate-600 uppercase ml-2 mb-2 block tracking-wider">Observações do Parceiro</label>
              <div className="relative group">
                <FileText size={16} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <textarea 
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border-2 border-slate-200 font-bold text-xs text-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-slate-300 resize-none" 
                  value={form.observacao_parceiro || ''} 
                  onChange={e => setForm({...form, observacao_parceiro: e.target.value})} 
                  placeholder="NOTAS INTERNAS SOBRE O PARCEIRO, ACORDOS DE COMISSÃO, ETC..."
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 italic">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  Preencha os dados corretamente para gerar o link do portal.
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                  {editId && (
                      <button type="button" onClick={resetForm} className="flex-1 md:flex-none px-8 h-12 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-200">Cancelar</button>
                  )}
                  <button type="submit" disabled={loading} className="flex-1 md:flex-none px-12 h-12 bg-[#0F172A] hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95">
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      {editId ? "Salvar Alterações" : "Cadastrar Parceiro"}
                  </button>
               </div>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 
               Resultados da Busca ({parceirosFiltrados.length})
             </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {parceirosFiltrados.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border-2 border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-400 transition-all hover:shadow-xl hover:shadow-slate-200/50">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl italic ${p.tipo_parceiro === 'EXTERNO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                    {p.nome_parceiro.substring(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight mb-1">{p.nome_parceiro}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="text-[9px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-tighter"><Briefcase size={12} className="text-blue-500"/> {p.setor_parceiro || 'GERAL'}</span>
                      <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-tighter border border-blue-100">
                        <UserCheck size={12} className="text-blue-600"/> 
                        {p.corretor_id === p.corretora_id 
                          ? 'ATENDIMENTO DIRETO' 
                          : (corretores.find(c => c.id === p.corretor_id)?.nome || 'NÃO ATRIBUÍDO')}
                      </span>
                      {p.telefone_parceiro && <span className="text-[9px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-tighter"><Phone size={12} className="text-blue-500"/> {p.telefone_parceiro}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 border-t md:border-none pt-4 md:pt-0">
                  {p.tipo_parceiro === 'EXTERNO' && (
                    <>
                      <button onClick={() => window.open(`/portal/${p.slug_link}`, '_blank')} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Ver Portal Público">
                          <ExternalLink size={18}/>
                      </button>
                      <button onClick={() => copiarLink(p.slug_link)} className="flex items-center gap-2 px-4 h-10 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest">
                          <Copy size={14}/> Copiar Link
                      </button>
                    </>
                  )}
                  <button onClick={() => { 
                    setEditId(p.id); 
                    setForm({ ...p, tipo_chave_pix: p.tipo_chave_pix || "", chave_pix: p.chave_pix || "", telefone_parceiro: p.telefone_parceiro || "", email_parceiro: p.email_parceiro || "", slug_link: p.slug_link || "", observacao_parceiro: p.observacao_parceiro || "" }); 
                    setTipoAbas(p.tipo_parceiro || 'INTERNO'); window.scrollTo({top: 0, behavior: 'smooth'}); 
                  }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><Edit3 size={18}/></button>
                  <button onClick={() => handleExcluir(p.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}

            {parceirosFiltrados.length === 0 && (
              <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <AlertCircle size={32} className="text-slate-200 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Nenhum parceiro nesta categoria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}