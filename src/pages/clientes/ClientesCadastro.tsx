import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Adicionado useParams
import { 
  Building2, User, Save, ArrowLeft, 
  MapPin, Briefcase, Phone, Mail, Calendar, CheckCircle2, Loader2
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import { buscarCNPJ, buscarCEP } from "../../services/brasilApi";
import { maskCPF, maskCNPJ, maskPhone } from "../../utils/masks";
import { validarCPF } from "../../utils/validarCPF";

type TipoCliente = "PF" | "PJ";

interface Corretor {
  id: string;
  nome: string;
}

export default function ClientesCadastro() {
  const { id } = useParams(); // Captura o ID da URL
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfilUsuarioLogado, setPerfilUsuarioLogado] = useState<any>(null);
  const isEditing = Boolean(id); // Define se estamos editando ou criando
  
  const [cpfInvalido, setCpfInvalido] = useState(false);
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("PJ");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing); // Loading inicial para carregar dados
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [loadingCEPPF, setLoadingCEPPF] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [mesmoEndereco, setMesmoEndereco] = useState(true);

  const [form, setForm] = useState({
    cnpj: "", razao_social: "", nome_fantasia: "", porte: "", capital_social: "", 
    natureza_juridica: "", opcao_pelo_mei: false, opcao_pelo_simples: false,
    ddd_telefone_1: "", descricao_identificador_matriz_filial: "",
    cep: "", uf: "", municipio: "", bairro: "", logradouro: "", numero: "", complemento: "",
    nome: "", cpf: "", rg: "", data_nascimento: "", sexo:"",
    cep_pf: "", uf_pf: "", municipio_pf: "", bairro_pf: "", logradouro_pf: "", numero_pf: "", complemento_pf: "",
    email: "", telefone_whats: "", telefone_adicional: "", 
    origem_cliente: "Google", fase_kanban: "lead", status_kanban: "novo", corretor_id: ""
  });

// 1. CARREGAR PERFIL E LISTA DE CORRETORES (CONSOLIDADO)
useEffect(() => {
  async function carregarConfiguracoesIniciais() {
    try {
      if (!user) return;

      // Busca o perfil de quem está operando o sistema
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfis")
        .select("id, nome, tipo_usuario, corretora_id")
        .eq("id", user.id)
        .single();

      if (perfilError) throw perfilError;

      if (perfil) {
        setPerfilUsuarioLogado(perfil);

        if (perfil.tipo_usuario === 'CORRETOR') {
          // Se for CORRETOR: Só vê ele mesmo na lista e o formulário já trava nele
          setCorretores([{ id: perfil.id, nome: perfil.nome }]);
          setForm(prev => ({ ...prev, corretor_id: perfil.id }));
        } else {
          // Se for CORRETORA: Busca todos os corretores vinculados a esta corretora
          const { data, error } = await supabase
            .from("usuarios_perfis")
            .select("id, nome")
            .eq("corretora_id", perfil.id) // <== SEGURANÇA: Filtra apenas os corretores DESTA corretora
            .eq("tipo_usuario", "CORRETOR")
            .order("nome");
          
          if (error) throw error;
          if (data) setCorretores(data);
        }
      }
    } catch (err) {
      console.error("Erro na inicialização:", err);
    }
  }
  carregarConfiguracoesIniciais();
}, [user]);

  // 2. CARREGAR DADOS DO CLIENTE (SE FOR EDIÇÃO)
  useEffect(() => {
    if (isEditing && id) {
      async function carregarDadosCliente() {
        try {
          const { data, error } = await supabase
            .from("tab_clientes")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;

          if (data) {
            setForm({
              ...data,
              data_nascimento: data.data_nascimento || "",
              capital_social: data.capital_social 
                ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(data.capital_social)
                : ""
            });
            setTipoCliente(data.tipo_cliente as TipoCliente);
            
            // Verifica se os endereços são iguais para marcar o checkbox
            const enderecosIguais = data.cep === data.cep_pf && data.numero === data.numero_pf;
            setMesmoEndereco(enderecosIguais);
          }
        } catch (err) {
          console.error("Erro ao carregar cliente:", err);
          alert("Erro ao carregar dados do cliente.");
          navigate("/clientes/lista");
        } finally {
          setLoadingData(false);
        }
      }
      carregarDadosCliente();
    }
  }, [id, isEditing, navigate]);

  // 3. SINCRONIZAR ENDEREÇOS (Somente se mesmoEndereco estiver ativo e for novo ou editando)
  useEffect(() => {
    if (tipoCliente === "PJ" && mesmoEndereco) {
      setForm(prev => ({
        ...prev,
        cep_pf: prev.cep, uf_pf: prev.uf, municipio_pf: prev.municipio,
        bairro_pf: prev.bairro, logradouro_pf: prev.logradouro,
        numero_pf: prev.numero, complemento_pf: prev.complemento,
      }));
    }
  }, [form.cep, form.uf, form.municipio, form.bairro, form.logradouro, form.numero, form.complemento, mesmoEndereco, tipoCliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    let masked = val;
    if (name === "cpf") masked = maskCPF(value as string);
    if (name === "cnpj") masked = maskCNPJ(value as string);
    if (name === "telefone_whats" || name === "telefone_adicional") masked = maskPhone(value as string);

    setForm(prev => ({ ...prev, [name]: masked }));
  };

  async function handleBuscarCNPJ() {
    const cnpjLimpo = form.cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) return alert("CNPJ inválido");
    setLoadingCNPJ(true);
    try {
        const data = await buscarCNPJ(cnpjLimpo);
        setForm(prev => ({
          ...prev,
          razao_social: (data.razao_social || "").toUpperCase(),
          nome_fantasia: (data.nome_fantasia || "").toUpperCase(),
          porte: (data.porte || "").toUpperCase(),
          capital_social: data.capital_social
          ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(data.capital_social)
          : "",
          natureza_juridica: (data.natureza_juridica || "").toUpperCase(),
          opcao_pelo_mei: data.opcao_pelo_mei || false,
          opcao_pelo_simples: data.opcao_pelo_simples || false,
          ddd_telefone_1: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : "",
          descricao_identificador_matriz_filial: (data.descricao_identificador_matriz_filial || "").toUpperCase(),
          cep: data.cep || prev.cep,
          uf: (data.uf || prev.uf).toUpperCase(),
          municipio: (data.municipio || prev.municipio).toUpperCase(),
          logradouro: (data.logradouro || prev.logradouro).toUpperCase(),
          bairro: (data.bairro || prev.bairro).toUpperCase(), 
          numero: data.numero || prev.numero,
          complemento: (data.complemento || prev.complemento).toUpperCase(),
        }));
    } catch { alert("Erro ao buscar CNPJ."); }
    finally { setLoadingCNPJ(false); }
  }

  async function handleBuscarCEP(tipo: "PJ" | "PF") {
    const campoCep = tipo === "PJ" ? "cep" : "cep_pf";
    const cepLimpo = form[campoCep].replace(/\D/g, "");
    if (cepLimpo.length !== 8) return alert("CEP inválido");
    tipo === "PJ" ? setLoadingCEP(true) : setLoadingCEPPF(true);
    try {
      const data = await buscarCEP(cepLimpo);
      if (tipo === "PJ") {
        setForm(prev => ({ ...prev, uf: data.state, municipio: data.city, bairro: data.neighborhood, logradouro: data.street }));
      } else {
        setForm(prev => ({ ...prev, uf_pf: data.state, municipio_pf: data.city, bairro_pf: data.neighborhood, logradouro_pf: data.street }));
      }
    } catch { alert("CEP não encontrado"); }
    finally { tipo === "PJ" ? setLoadingCEP(false) : setLoadingCEPPF(false); }
  }

 async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setCpfInvalido(false);

    if (!validarCPF(form.cpf)) {
        setCpfInvalido(true);
        alert("O CPF digitado é inválido!");
        return;
    }

    // VALIDAÇÃO: Se for perfil corretora, obriga a escolher um responsável
    if (perfilUsuarioLogado?.tipo_usuario === "CORRETORA" && !form.corretor_id) {
      alert("Por favor, selecione um Responsável pelo Cliente (pode ser a própria corretora ou um corretor).");
      return;
    }

    setLoading(true);

    // --- LÓGICA DE HIERARQUIA CORRIGIDA ---
    let finalCorretoraId;
    let finalCorretorId;

    if (perfilUsuarioLogado?.tipo_usuario === "CORRETORA") {
      // Se quem está logado é a corretora, ela é sempre a dona (corretora_id)
      finalCorretoraId = perfilUsuarioLogado.id;
      
      // O corretor será quem ela selecionou no <select>
      // Se ela selecionou ela mesma (opção "DIRETO COM A CORRETORA"), o ID será o dela.
      // Se ela selecionou um corretor, o ID será o do corretor.
      finalCorretorId = form.corretor_id; 
    } else {
      // Se quem está logado é um CORRETOR:
      // A corretora_id vem do cadastro dele (quem é o patrão dele)
      // O corretor_id é ele mesmo.
      finalCorretoraId = perfilUsuarioLogado?.corretora_id;
      finalCorretorId = perfilUsuarioLogado?.id;
    }
    // --------------------------------------

    const toUpper = (val: any) => (typeof val === "string" ? val.toUpperCase() : val);

    const capitalLimpo = typeof form.capital_social === "string" 
        ? form.capital_social.replace(/\./g, "").replace(",", ".") 
        : form.capital_social;
    const capitalNumerico = (capitalLimpo === "" || capitalLimpo === null) ? null : parseFloat(capitalLimpo as string);

    const statusFinal = isEditing ? form.status_kanban : "novo";

    const payload = {
        tipo_cliente: tipoCliente,
        corretora_id: finalCorretoraId, // Agora herda corretamente!
        corretor_id: finalCorretorId,
        cnpj: form.cnpj,
        razao_social: toUpper(form.razao_social),
        nome_fantasia: toUpper(form.nome_fantasia),
        porte: toUpper(form.porte),
        capital_social: capitalNumerico,
        natureza_juridica: toUpper(form.natureza_juridica),
        opcao_pelo_mei: form.opcao_pelo_mei,
        opcao_pelo_simples: form.opcao_pelo_simples,
        ddd_telefone_1: form.ddd_telefone_1,
        descricao_identificador_matriz_filial: toUpper(form.descricao_identificador_matriz_filial),
        nome: toUpper(form.nome),
        cpf: form.cpf,
        rg: form.rg,
        data_nascimento: form.data_nascimento === "" ? null : form.data_nascimento,
        sexo: form.sexo,
        cep: form.cep,
        uf: toUpper(form.uf),
        municipio: toUpper(form.municipio),
        bairro: toUpper(form.bairro),
        logradouro: toUpper(form.logradouro),
        numero: form.numero,
        complemento: toUpper(form.complemento),
        cep_pf: form.cep_pf,
        uf_pf: toUpper(form.uf_pf),
        municipio_pf: toUpper(form.municipio_pf),
        bairro_pf: toUpper(form.bairro_pf),
        logradouro_pf: toUpper(form.logradouro_pf),
        numero_pf: form.numero_pf,
        complemento_pf: toUpper(form.complemento_pf),
        email: form.email,
        telefone_whats: form.telefone_whats,
        telefone_adicional: form.telefone_adicional,
        origem_cliente: toUpper(form.origem_cliente),
        fase_kanban: form.fase_kanban.toLowerCase(),
        status_kanban: statusFinal,
    };

    try {
      let error;
      if (isEditing) {
        // ATUALIZAÇÃO
        const result = await supabase.from("tab_clientes").update(payload).eq("id", id);
        error = result.error;
      } else {
        // INSERÇÃO
        const result = await supabase.from("tab_clientes").insert([payload]);
        error = result.error;
      }

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => navigate("/clientes/lista"), 2300);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#09090B]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-500 font-medium">Carregando dados do cliente...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 pb-20">
      
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-10 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-zinc-800 text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-500" size={44} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sucesso!</h2>
            <p className="text-slate-500 dark:text-zinc-400">O cadastro foi {isEditing ? "atualizado" : "finalizado"} com sucesso.</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-955/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="text-xl font-bold">{isEditing ? "Editar Cliente" : "Cadastro de Cliente"}</h1>
              <p className="text-xs text-slate-500">{isEditing ? `Editando: ${form.nome || form.razao_social}` : "Gerencie leads e clientes no CRM"}</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl">
            <TabButton active={tipoCliente === "PJ"} onClick={() => !isEditing && setTipoCliente("PJ")} icon={<Building2 size={16} />} label="PJ" />
            <TabButton active={tipoCliente === "PF"} onClick={() => !isEditing && setTipoCliente("PF")} icon={<User size={16} />} label="PF" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        <form onSubmit={handleSalvar} className="space-y-6">
          <Section icon={<Briefcase className="text-blue-500" />} title={tipoCliente === "PJ" ? "Dados Empresariais" : "Dados Pessoais"}>
            {tipoCliente === "PJ" ? (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                <div className="md:col-span-2"><ActionInput label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} onAction={handleBuscarCNPJ} loading={loadingCNPJ} placeholder="00.000.000/0000-00" /></div>
                <div className="md:col-span-4"><Input label="Tipo (Matriz/Filial)" name="descricao_identificador_matriz_filial" value={form.descricao_identificador_matriz_filial} readOnly className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400" /></div>
                <div className="md:col-span-3"><Input label="Razão Social" name="razao_social" value={form.razao_social} onChange={handleChange} readOnly={!isEditing} className={!isEditing ? "bg-slate-50 dark:bg-zinc-800/50" : ""}/></div>
                <div className="md:col-span-3"><Input label="Nome Fantasia" name="nome_fantasia" value={form.nome_fantasia} onChange={handleChange} readOnly={!isEditing} className={!isEditing ? "bg-slate-50 dark:bg-zinc-800/50" : ""}/></div>
                <div className="md:col-span-4"><Input label="Natureza Jurídica" name="natureza_juridica" value={form.natureza_juridica} onChange={handleChange} readOnly className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400"/></div>
                <div className="md:col-span-2"><Input label="Porte" name="porte" value={form.porte} onChange={handleChange} readOnly className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400"/></div>
                <div className="md:col-span-2"><Input label="Capital Social" name="capital_social" type="text" value={form.capital_social} onChange={handleChange} readOnly className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400"/></div>
                <div className="md:col-span-4"><Input label="Telefone da Empresa (API)" name="ddd_telefone_1" value={form.ddd_telefone_1} onChange={handleChange} readOnly className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400"/></div>
                <div className="md:col-span-6 flex items-center gap-8 p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enquadramento:</span>
                  <Checkbox label="Optante pelo MEI" name="opcao_pelo_mei" checked={form.opcao_pelo_mei}  readOnly />
                  <Checkbox label="Simples Nacional" name="opcao_pelo_simples" checked={form.opcao_pelo_simples} readOnly />
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* PRIMEIRA LINHA: Nome (2/4), CPF (1/4), RG (1/4) */}
              <div className="md:col-span-2">
                <Input label="Nome Completo" name="nome" value={form.nome} onChange={handleChange} />
              </div>
              
              <div className="md:col-span-1">
                <Input 
                  label="CPF" 
                  name="cpf" 
                  value={form.cpf} 
                  onChange={(e: any) => {
                    if(cpfInvalido) setCpfInvalido(false);
                    handleChange(e);
                  }}
                  className={cpfInvalido ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
              </div>

              <div className="md:col-span-1">
                <Input label="RG" name="rg" value={form.rg} onChange={handleChange} />
              </div>

              {/* SEGUNDA LINHA: Data de Nascimento (1/4), Sexo (1/4) */}
              <div className="md:col-span-1">
                <Input 
                  label="Data de Nascimento" 
                  name="data_nascimento" 
                  type="date" 
                  value={form.data_nascimento} 
                  onChange={handleChange} 
                  icon={<Calendar size={14}/>} 
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Sexo *</label>
                <select 
                  name="sexo"
                  value={form.sexo}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Prefere não responder">Prefere não responder</option>
                </select>
              </div>
              
              {/* As outras 2 colunas da segunda linha ficam vazias por padrão */}
            </div>
          )}
          </Section>

          <Section icon={<MapPin className="text-orange-500" />} title={tipoCliente === "PJ" ? "Endereço da Empresa" : "Endereço Residencial"}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div className="md:col-span-2"><ActionInput label="CEP" name={tipoCliente === "PJ" ? "cep" : "cep_pf"} value={tipoCliente === "PJ" ? form.cep : form.cep_pf} onChange={handleChange} onAction={() => handleBuscarCEP(tipoCliente)} loading={tipoCliente === "PJ" ? loadingCEP : loadingCEPPF} placeholder="00000-000" /></div>
              <div className="md:col-span-3"><Input label="Logradouro" name={tipoCliente === "PJ" ? "logradouro" : "logradouro_pf"} value={tipoCliente === "PJ" ? form.logradouro : form.logradouro_pf} onChange={handleChange}  /></div>
              <div className="md:col-span-1"><Input label="Número" name={tipoCliente === "PJ" ? "numero" : "numero_pf"} value={tipoCliente === "PJ" ? form.numero : form.numero_pf} onChange={handleChange} /></div>
              <div className="md:col-span-2"><Input label="Bairro" name={tipoCliente === "PJ" ? "bairro" : "bairro_pf"} value={tipoCliente === "PJ" ? form.bairro : form.bairro_pf} onChange={handleChange} /></div>
              <div className="md:col-span-3"><Input label="Cidade" name={tipoCliente === "PJ" ? "municipio" : "municipio_pf"} value={tipoCliente === "PJ" ? form.municipio : form.municipio_pf} onChange={handleChange} /></div>
              <div className="md:col-span-1"><Input label="UF" name={tipoCliente === "PJ" ? "uf" : "uf_pf"} value={tipoCliente === "PJ" ? form.uf : form.uf_pf} onChange={handleChange} /></div>
              <div className="md:col-span-6"><Input label="Complemento" name={tipoCliente === "PJ" ? "complemento" : "complemento_pf"} value={tipoCliente === "PJ" ? form.complemento : form.complemento_pf} onChange={handleChange} /></div>
            </div>
          </Section>

          {tipoCliente === "PJ" && (
            <Section icon={<User className="text-indigo-500" />} title="Dados do contato principal da empresa">
              <div className="space-y-6">
                {/* LINHA 1 E 2: DADOS PESSOAIS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  {/* Primeira Linha */}
                  <div className="md:col-span-2">
                    <Input label="Nome Completo" name="nome" value={form.nome} onChange={handleChange} />
                  </div>
                  <div className="md:col-span-1">
                    <Input 
                      label="CPF" 
                      name="cpf" 
                      value={form.cpf} 
                      onChange={(e: any) => {
                        if(cpfInvalido) setCpfInvalido(false);
                        handleChange(e);
                      }} 
                      className={cpfInvalido ? "border-red-500" : ""} 
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="RG" name="rg" value={form.rg} onChange={handleChange} />
                  </div>

                  {/* Segunda Linha */}
                  <div className="md:col-span-1">
                    <Input 
                      label="Data de Nascimento" 
                      name="data_nascimento" 
                      type="date" 
                      value={form.data_nascimento} 
                      onChange={handleChange} 
                      icon={<Calendar size={14}/>} 
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Sexo *</label>
                    <select 
                      name="sexo"
                      value={form.sexo}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">Selecione...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Prefere não responder">Prefere não responder</option>
                    </select>
                  </div>
                </div>

                {/* DIVISOR E LOGICA DE ENDEREÇO */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Endereço do Sócio/Contato</h3>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={mesmoEndereco} 
                        onChange={(e) => setMesmoEndereco(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                        Mesmo endereço da empresa
                      </span>
                    </label>
                  </div>

                  {!mesmoEndereco && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="md:col-span-2">
                        <ActionInput 
                          label="CEP Pessoal" 
                          name="cep_pf" 
                          value={form.cep_pf} 
                          onChange={handleChange} 
                          onAction={() => handleBuscarCEP("PF")} 
                          loading={loadingCEPPF} 
                          placeholder="00000-000" 
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Logradouro" name="logradouro_pf" value={form.logradouro_pf} onChange={handleChange} />
                      </div>
                      <div className="md:col-span-1">
                        <Input label="Número" name="numero_pf" value={form.numero_pf} onChange={handleChange} />
                      </div>
                      <div className="md:col-span-2">
                        <Input label="Bairro" name="bairro_pf" value={form.bairro_pf} onChange={handleChange} />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Cidade" name="municipio_pf" value={form.municipio_pf} onChange={handleChange} />
                      </div>
                      <div className="md:col-span-1">
                        <Input label="UF" name="uf_pf" value={form.uf_pf} onChange={handleChange} />
                      </div>
                      <div className="md:col-span-6">
                        <Input label="Complemento" name="complemento_pf" value={form.complemento_pf} onChange={handleChange} />
                      </div>
                    </div>
                  )}

                  {mesmoEndereco && (
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                      <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <MapPin size={14} />
                        O sistema utilizará o endereço empresarial cadastrado acima para este contato.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          <Section icon={<Mail className="text-emerald-500" />} title="Contato e CRM">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="md:col-span-2"><Input label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} icon={<Mail size={14}/>} /></div>
              <Input label="WhatsApp" name="telefone_whats" value={form.telefone_whats} onChange={handleChange} icon={<Phone size={14}/>} />
              <Input label="Telefone Adicional" name="telefone_adicional" value={form.telefone_adicional} onChange={handleChange} />
              
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">Origem</label>
                <select name="origem_cliente" value={form.origem_cliente} onChange={handleChange} className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none transition-all cursor-pointer">
                  <option value="Google">Google</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Linkedin">Linkedin</option>
                  <option value="Prospecção Ativa">Prospecção Ativa</option>
                  <option value="Parceiro de Negócio">Parceiro de Negócio</option>
                  <option value="Reciprocidade">Reciprocidade</option>
                  <option value="Cliente Procurou">Cliente Procurou</option>
                  <option value="Outros On-line">Outros On-line</option>
                  <option value="Outros Off-line">Outros Off-line</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">Fase do Funil</label>
                <select 
                  name="fase_kanban" 
                  value={form.fase_kanban} 
                  onChange={handleChange} 
                  className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none transition-all cursor-pointer">
                  <option value="lead">Lead</option>
                  <option value="contato">Contato</option>
                  <option value="negociacao">Negociação</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    Responsável pelo Cliente
                  </label>
                  <select 
                    name="corretor_id" 
                    value={form.corretor_id || ""} 
                    onChange={handleChange}
                    disabled={perfilUsuarioLogado?.tipo_usuario === "CORRETOR"}
                    className="h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none transition-all cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione um responsável...</option>
                    
                    {/* OPÇÃO NOVA: Permite que a corretora seja a responsável direta */}
                    {perfilUsuarioLogado?.tipo_usuario === "CORRETORA" && (
                      <option value={perfilUsuarioLogado.id} className="font-bold text-blue-600">
                        DIRETO COM A CORRETORA (Sem corretor)
                      </option>
                    )}

                    {corretores.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <div className="flex justify-end gap-4 py-8">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Descartar</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {isEditing ? "Salvar Alterações" : "Finalizar Cadastro"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// COMPONENTES AUXILIARES (Design mantido conforme seu original)
function Section({ title, icon, children }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[24px] shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50/50 dark:bg-zinc-800/30 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-3">
        {icon}
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">{title}</h2>
      </div>
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}

function Input({ label, icon, className = "", ...props }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-semibold text-slate-500 dark:text-zinc-500 mb-1.5 ml-1">{label}</label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-4 text-slate-400">{icon}</span>}
        <input {...props} className={`w-full h-11 ${icon ? 'pl-11' : 'px-4'} rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${className}`} />
      </div>
    </div>
  );
}

function ActionInput({ label, onAction, loading, ...props }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">{label}</label>
      <div className="relative">
        <input {...props} className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
        <button 
        type="button" 
        onClick={onAction} 
        disabled={loading} 
        className="absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center border border-blue-100 dark:border-blue-800">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : `Buscar ${label}`}
        </button>
      </div>
    </div>
  );
}

function Checkbox({ label, ...props }: any) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input type="checkbox" {...props} className="w-5 h-5 rounded-lg border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 bg-transparent" />
      <span className="text-sm font-medium text-slate-600 dark:text-zinc-400 group-hover:text-blue-500 transition-colors">{label}</span>
    </label>
  );
}

function TabButton({ active, icon, label, onClick }: any) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${active ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 disabled:opacity-30"}`}>{icon} {label}</button>
  );
}