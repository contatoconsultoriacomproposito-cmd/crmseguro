import { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, Building2, Save, Phone, Mail, Loader2, 
  CheckCircle2, Globe, Search, Lock, User, Instagram, Facebook, FileText, Hash, MapPin
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { buscarCNPJ, buscarCEP } from "../../services/brasilApi";
import { maskCNPJ, maskPhone, maskCPF, maskCEP } from "../../utils/masks";

export default function RegistroModal({ onClose }: any) {
  const [loading, setLoading] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<"PJ" | "PF">("PJ");

  const [form, setForm] = useState({
    senha: "",
    razao_social: "",
    cnpj: "",
    nome_fantasia: "",
    descricao_identificador_matriz_filial: "",
    natureza_juridica: "",
    porte: "",
    capital_social: "",
    opcao_pelo_mei: false,
    opcao_pelo_simples: false,
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    municipio: "",
    uf: "",
    complemento: "",
    ddd_telefone_1: "",
    email_corporativo: "", // Login PJ
    website: "",
    instagram: "",
    facebook: "",
    whatsapp_comercial: "",
    nome_responsavel: "",
    cpf_responsavel: "",
    telefone_responsavel: "",
    email_responsavel: "", // Login PF
    registro_susep: "",
    plano: "FREE",
    status_pagamento: "PENDENTE"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let finalValue: any = type === "checkbox" ? checked : value;
    if (name === "cnpj") finalValue = maskCNPJ(value);
    if (name === "cpf_responsavel") finalValue = maskCPF(value);
    if (name === "cep") finalValue = maskCEP(value);
    if (["whatsapp_comercial", "telefone_responsavel", "ddd_telefone_1"].includes(name)) finalValue = maskPhone(value);
    setForm(prev => ({ ...prev, [name]: finalValue }));
  };

  async function handleBuscarCNPJ() {
    const clean = form.cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return alert("CNPJ inválido");
    setLoadingCNPJ(true);
    try {
      const data = await buscarCNPJ(clean);
      setForm(prev => ({
        ...prev,
        razao_social: (data.razao_social || "").toUpperCase(),
        nome_fantasia: (data.nome_fantasia || "").toUpperCase(),
        descricao_identificador_matriz_filial: (data.descricao_identificador_matriz_filial || "").toUpperCase(),
        natureza_juridica: (data.natureza_juridica || "").toUpperCase(),
        porte: (data.porte || "").toUpperCase(),
        capital_social: data.capital_social?.toString() || "",
        opcao_pelo_mei: !!data.opcao_pelo_mei,
        opcao_pelo_simples: !!data.opcao_pelo_simples,
        cep: maskCEP(data.cep || ""),
        logradouro: (data.logradouro || "").toUpperCase(),
        numero: data.numero || "",
        bairro: (data.bairro || "").toUpperCase(),
        municipio: (data.municipio || "").toUpperCase(),
        uf: (data.uf || "").toUpperCase(),
        complemento: (data.complemento || "").toUpperCase(),
        ddd_telefone_1: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : "",
        email_corporativo: data.email?.toLowerCase() || prev.email_corporativo
      }));
    } catch { alert("Erro ao buscar CNPJ."); }
    finally { setLoadingCNPJ(false); }
  }

  async function handleBuscarCEP() {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) return alert("CEP inválido");
    setLoadingCEP(true);
    try {
      const data = await buscarCEP(clean);
      setForm(prev => ({
        ...prev,
        logradouro: (data.street || "").toUpperCase(),
        bairro: (data.neighborhood || "").toUpperCase(),
        municipio: (data.city || "").toUpperCase(),
        uf: (data.state || "").toUpperCase(),
      }));
    } catch { alert("Erro ao buscar CEP."); }
    finally { setLoadingCEP(false); }
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const emailLogin = tipoPessoa === "PJ" ? form.email_corporativo : form.email_responsavel;
    if (!emailLogin?.includes('@')) return alert("E-mail de acesso inválido.");
    if (form.senha.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
    if (!form.registro_susep || form.registro_susep.trim() === "") {
      return alert("O campo Registro SUSEP é obrigatório.");
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLogin.trim().toLowerCase(),
        password: form.senha,
      });

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Falha ao gerar ID de usuário.");

      // 1. usuarios_perfis
      const { error: perfilError } = await supabase.from("usuarios_perfis").upsert({
        id: userId,
        tipo_usuario: "CORRETORA",
        nome: form.nome_responsavel.toUpperCase(),
        email: form.email_responsavel.toLowerCase(),
        ativo: true,
        corretora_id: userId,
        registro_susep: form.registro_susep.toUpperCase(),
        telefone_corretor: form.telefone_responsavel,
        cpf_corretor: form.cpf_responsavel,
        cnpj_corretora: tipoPessoa === "PJ" ? form.cnpj : null,
        superior_id: null
      });
      if (perfilError) throw perfilError;

      // 2. tab_corretora_config
      const dataExpira = new Date();
      dataExpira.setDate(dataExpira.getDate() + 7);

      const { error: configError } = await supabase.from("tab_corretora_config").upsert({
        id: userId,
        // Campos exclusivos de Pessoa Jurídica (nulos se for PF)
        razao_social: tipoPessoa === "PJ" ? form.razao_social : null,
        cnpj: tipoPessoa === "PJ" ? form.cnpj : null,
        nome_fantasia: tipoPessoa === "PJ" ? form.nome_fantasia : null,
        descricao_identificador_matriz_filial: tipoPessoa === "PJ" ? form.descricao_identificador_matriz_filial : null,
        natureza_juridica: tipoPessoa === "PJ" ? form.natureza_juridica : null,
        porte: tipoPessoa === "PJ" ? form.porte : null,
        capital_social: (tipoPessoa === "PJ" && form.capital_social) ? parseFloat(form.capital_social.replace(",", ".")) : null,
        opcao_pelo_mei: tipoPessoa === "PJ" ? form.opcao_pelo_mei : null,
        opcao_pelo_simples: tipoPessoa === "PJ" ? form.opcao_pelo_simples : null,

        // Campos comuns ou preenchidos manualmente para ambos
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        municipio: form.municipio,
        uf: form.uf,
        complemento: form.complemento,
        email_corporativo: emailLogin.toLowerCase(),
        ddd_telefone_1: form.ddd_telefone_1,
        nome_responsavel: form.nome_responsavel.toUpperCase(),
        telefone_responsavel: form.telefone_responsavel,
        registro_susep: form.registro_susep.toUpperCase(),
        email_responsavel: form.email_responsavel.toLowerCase(),
        cpf_responsavel: form.cpf_responsavel,
        whatsapp_comercial: form.whatsapp_comercial,
        website: form.website.toLowerCase(),
        instagram: form.instagram.toLowerCase(),
        facebook: form.facebook.toLowerCase(),
        plano: "FREE",
        status_pagamento: "PENDENTE",
        data_expiracao: dataExpira.toISOString()
      });

      if (configError) throw configError;

      setSucesso(true);
      setTimeout(() => window.location.href = "/dashboard", 2000);
    } catch (error: any) {
      alert(`Erro no cadastro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        {sucesso ? (
          <div className="p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
            <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
            <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Cadastro Realizado!</h2>
            <p className="text-zinc-500 mt-2 font-medium">Sincronizando dados das tabelas...</p>
          </div>
        ) : (
          <form onSubmit={handleRegistro} className="flex flex-col h-[90vh]">
            {/* CABEÇALHO COM TOGGLE DE TIPO DE PESSOA */}
            <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-6">
                <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-2xl gap-1">
                  <button type="button" onClick={() => setTipoPessoa("PJ")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${tipoPessoa === "PJ" ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-500'}`}>Pessoa Jurídica</button>
                  <button type="button" onClick={() => setTipoPessoa("PF")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${tipoPessoa === "PF" ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-500'}`}>Pessoa Física</button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    {tipoPessoa === "PJ" ? <Building2 size={18}/> : <User size={18}/>}
                  </div>
                  <h2 className="text-lg font-black dark:text-white uppercase tracking-tighter">Onboarding {tipoPessoa === "PJ" ? "Corretora PJ" : "Corretora PF"}</h2>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* ÁREA DE IDENTIFICAÇÃO PRINCIPAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tipoPessoa === "PJ" ? (
                  <ActionInput label="CNPJ DA CORRETORA" name="cnpj" value={form.cnpj} onChange={handleChange} onAction={handleBuscarCNPJ} loading={loadingCNPJ} placeholder="00.000.000/0000-00" icon={<Search size={14}/>} />
                ) : (
                  <Input label="NOME COMPLETO DO CORRETOR" name="nome_responsavel" required value={form.nome_responsavel} onChange={handleChange} placeholder="Nome do titular" icon={<User size={14}/>} />
                )}
                <Input label="DEFINA UMA SENHA" name="senha" type="password" required value={form.senha} onChange={handleChange} placeholder="Mínimo 6 caracteres" icon={<Lock size={14}/>} />
              </div>

              {/* CONTEÚDO DINÂMICO BASEADO NO TIPO */}
              {tipoPessoa === "PJ" ? (
                <>
                  <Section title="Dados Cadastrais (Receita Federal)" icon={<FileText size={16}/>}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2"><Input label="Razão Social" name="razao_social" value={form.razao_social} readOnly className="bg-zinc-50 font-medium" /></div>
                      <Input label="Nome Fantasia" name="nome_fantasia" value={form.nome_fantasia} readOnly className="bg-zinc-50" />
                      <Input label="Identificador Matriz/Filial" name="descricao_identificador_matriz_filial" value={form.descricao_identificador_matriz_filial} readOnly className="bg-zinc-50" />
                      <Input label="Natureza Jurídica" name="natureza_juridica" value={form.natureza_juridica} readOnly className="bg-zinc-50" />
                      <Input label="Porte" name="porte" value={form.porte} readOnly className="bg-zinc-50" />
                      <Input label="Capital Social" name="capital_social" value={form.capital_social} readOnly className="bg-zinc-50" icon={<Hash size={14}/>} />
                      <Input label="E-mail Corporativo (Login)" name="email_corporativo" required value={form.email_corporativo} onChange={handleChange} icon={<Mail size={14}/>} />
                      <Input label="Telefone (Receita)" name="ddd_telefone_1" value={form.ddd_telefone_1} onChange={handleChange} icon={<Phone size={14}/>} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <Input label="CEP" name="cep" value={form.cep} readOnly className="bg-zinc-50" />
                      <div className="md:col-span-2"><Input label="Logradouro" name="logradouro" value={form.logradouro} readOnly className="bg-zinc-50" /></div>
                      <Input label="Número" name="numero" value={form.numero} readOnly className="bg-zinc-50" />
                    </div>
                    <div className="flex gap-6 mt-4 ml-1">
                      <Checkbox label="Optante MEI" checked={form.opcao_pelo_mei} />
                      <Checkbox label="Optante Simples" checked={form.opcao_pelo_simples} />
                    </div>
                  </Section>
                </>
              ) : (
                <Section title="Localização e Endereço" icon={<MapPin size={16}/>}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ActionInput label="CEP RESIDENCIAL" name="cep" value={form.cep} onChange={handleChange} onAction={handleBuscarCEP} loading={loadingCEP} placeholder="00000-000" icon={<Search size={14}/>} />
                    <div className="md:col-span-2"><Input label="Logradouro" name="logradouro" value={form.logradouro} onChange={handleChange} /></div>
                    <Input label="Número" name="numero" value={form.numero} onChange={handleChange} />
                    <Input label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} />
                    <Input label="Município" name="municipio" value={form.municipio} readOnly className="bg-zinc-50" />
                    <Input label="UF" name="uf" value={form.uf} readOnly className="bg-zinc-50" />
                    <Input label="Complemento" name="complemento" value={form.complemento} onChange={handleChange} />
                  </div>
                </Section>
              )}

              {/* SEÇÃO DE CONTATOS E RESPONSÁVEL - COMUM A AMBOS */}
              <Section title="Canais de Contato e Registro Profissional" icon={<User size={16} className="text-blue-600"/>}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input label="WhatsApp Comercial" name="whatsapp_comercial" required value={form.whatsapp_comercial} onChange={handleChange} icon={<Phone size={14} className="text-emerald-500"/>} />
                  <Input label="Website" name="website" value={form.website} onChange={handleChange} icon={<Globe size={14}/>} />
                  <Input label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} icon={<Instagram size={14}/>} />
                  <Input label="Facebook" name="facebook" value={form.facebook} onChange={handleChange} icon={<Facebook size={14}/>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-100">
                  {tipoPessoa === "PJ" && (
                    <div className="md:col-span-2"><Input label="Nome do Responsável" name="nome_responsavel" required value={form.nome_responsavel} onChange={handleChange} icon={<User size={14}/>} /></div>
                  )}
                  <Input label={tipoPessoa === "PJ" ? "CPF do Responsável" : "Seu CPF"} name="cpf_responsavel" required value={form.cpf_responsavel} onChange={handleChange} icon={<Hash size={14}/>} />
                  <Input label={tipoPessoa === "PJ" ? "E-mail do Responsável" : "E-mail Principal (Login)"} name="email_responsavel" required value={form.email_responsavel} onChange={handleChange} icon={<Mail size={14}/>} />
                  <Input label="Telefone Responsável" name="telefone_responsavel" required value={form.telefone_responsavel} onChange={handleChange} icon={<Phone size={14}/>} />
                  <Input label="Registro SUSEP" name="registro_susep" required value={form.registro_susep} onChange={handleChange} placeholder="Obrigatório" icon={<FileText size={14}/>} />
                </div>
              </Section>
            </div>

            <div className="p-8 bg-zinc-50 border-t border-zinc-100">
              <button type="submit" disabled={loading || (tipoPessoa === "PJ" && !form.razao_social)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50 uppercase text-sm tracking-widest">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Finalizar Cadastro {tipoPessoa}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// SUBCOMPONENTES AUXILIARES
function Section({ title, icon, children }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <span className="text-blue-600">{icon}</span>
        <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{title}</h3>
      </div>
      <div className="p-6 border border-zinc-100 rounded-[24px] bg-white shadow-sm">{children}</div>
    </div>
  );
}

function Input({ label, icon, className = "", ...props }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">{label}</label>
      <div className="relative flex items-center group">
        {icon && <span className="absolute left-4 text-zinc-400 transition-colors group-focus-within:text-blue-500">{icon}</span>}
        <input {...props} className={`w-full h-11 ${icon ? 'pl-11' : 'px-4'} rounded-xl border border-zinc-200 bg-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all ${className}`} />
      </div>
    </div>
  );
}

function ActionInput({ label, onAction, loading, icon, ...props }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase text-blue-600 ml-1">{label}</label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-4 text-zinc-400">{icon}</span>}
        <input {...props} className="w-full h-12 pl-11 pr-28 rounded-xl border-2 border-blue-600/20 bg-white text-sm font-bold focus:border-blue-600 outline-none transition-all" />
        <button type="button" onClick={onAction} disabled={loading} className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase hover:bg-blue-700 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin w-3 h-3" /> : "BUSCAR"}
        </button>
      </div>
    </div>
  );
}

function Checkbox({ label, checked }: any) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-zinc-300'}`}>
        {checked && <CheckCircle2 size={10} className="text-white" />}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </div>
  );
}