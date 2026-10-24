import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  CircleUserRound,
  Eye,
  EyeOff,
  Headphones,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  UserCog,
  Users,
} from "lucide-react";

import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../auth/AuthContext";

type FuncaoEquipe =
  | "CORRETOR"
  | "ATENDIMENTO"
  | "COMERCIAL"
  | "FINANCEIRO"
  | "ADMINISTRATIVO"
  | "OUTRO";

interface PerfilLogado {
  id: string;
  corretora_id: string;
  tipo_usuario: "CORRETORA" | "CORRETOR";
  ativo: boolean;
}

interface FormData {
  funcao_equipe: FuncaoEquipe;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  susep: string;
  senha: string;
}

const FUNCOES: Array<{
  value: FuncaoEquipe;
  label: string;
  descricao: string;
}> = [
  {
    value: "CORRETOR",
    label: "Corretor",
    descricao: "Atuação comercial como corretor de seguros.",
  },
  {
    value: "ATENDIMENTO",
    label: "Atendimento",
    descricao: "Atendimento e relacionamento com clientes.",
  },
  {
    value: "COMERCIAL",
    label: "Comercial",
    descricao: "Prospecção, negociação e atividades comerciais.",
  },
  {
    value: "FINANCEIRO",
    label: "Financeiro",
    descricao: "Rotinas financeiras e administrativas relacionadas.",
  },
  {
    value: "ADMINISTRATIVO",
    label: "Administrativo",
    descricao: "Atividades administrativas e operacionais.",
  },
  {
    value: "OUTRO",
    label: "Outro",
    descricao: "Outra função dentro da equipe.",
  },
];

function somenteNumeros(value: string) {
  return value.replace(/\D/g, "");
}

function formatarTelefone(value: string) {
  const numeros = somenteNumeros(value).slice(0, 11);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarCPF(value: string) {
  const numeros = somenteNumeros(value).slice(0, 11);

  return numeros
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function validarCPF(cpf: string) {
  const numeros = somenteNumeros(cpf);

  if (!numeros) return true;
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  let soma = 0;

  for (let i = 0; i < 9; i++) {
    soma += Number(numeros.charAt(i)) * (10 - i);
  }

  let digito1 = (soma * 10) % 11;

  if (digito1 === 10) {
    digito1 = 0;
  }

  if (digito1 !== Number(numeros.charAt(9))) {
    return false;
  }

  soma = 0;

  for (let i = 0; i < 10; i++) {
    soma += Number(numeros.charAt(i)) * (11 - i);
  }

  let digito2 = (soma * 10) % 11;

  if (digito2 === 10) {
    digito2 = 0;
  }

  return digito2 === Number(numeros.charAt(10));
}

function FuncaoIcon({
  funcao,
  size = 20,
}: {
  funcao: FuncaoEquipe;
  size?: number;
}) {
  switch (funcao) {
    case "CORRETOR":
      return <BriefcaseBusiness size={size} />;

    case "ATENDIMENTO":
      return <Headphones size={size} />;

    case "COMERCIAL":
      return <BadgeDollarSign size={size} />;

    case "FINANCEIRO":
      return <Landmark size={size} />;

    case "ADMINISTRATIVO":
      return <UserCog size={size} />;

    default:
      return <CircleUserRound size={size} />;
  }
}

export default function NovoMembro() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [perfilLogado, setPerfilLogado] = useState<PerfilLogado | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [formData, setFormData] = useState<FormData>({
    funcao_equipe: "CORRETOR",
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    susep: "",
    senha: "",
  });

  const funcaoSelecionada = useMemo(
    () =>
      FUNCOES.find(
        (funcao) => funcao.value === formData.funcao_equipe
      ) || FUNCOES[0],
    [formData.funcao_equipe]
  );

  useEffect(() => {
    if (!user?.id) {
      setLoadingPerfil(false);
      return;
    }

    carregarPerfil();
  }, [user?.id]);

  async function carregarPerfil() {
    if (!user?.id) return;

    try {
      setLoadingPerfil(true);
      setErro("");

      const { data, error } = await supabase
        .from("usuarios_perfis")
        .select("id, corretora_id, tipo_usuario, ativo")
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        setIsAuthorized(false);
        return;
      }

      const perfil = data as PerfilLogado;

      setPerfilLogado(perfil);

      if (
        perfil.tipo_usuario !== "CORRETORA" ||
        perfil.ativo !== true
      ) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
    } catch (error: any) {
      console.error("Erro ao carregar perfil:", error);

      setErro(
        error?.message ||
          "Não foi possível validar seu acesso."
      );

      setIsAuthorized(false);
    } finally {
      setLoadingPerfil(false);
    }
  }

  function atualizarCampo<K extends keyof FormData>(
    campo: K,
    valor: FormData[K]
  ) {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));

    if (erro) setErro("");
    if (sucesso) setSucesso("");
  }

  function handleFuncaoChange(funcao: FuncaoEquipe) {
    setFormData((prev) => ({
      ...prev,
      funcao_equipe: funcao,

      /*
        SUSEP pertence somente ao cadastro funcional de CORRETOR.

        Ao trocar para outra função, limpamos o valor para evitar
        enviar um SUSEP residual.
      */
      susep: funcao === "CORRETOR" ? prev.susep : "",
    }));

    setErro("");
    setSucesso("");
  }

  function validarFormulario() {
    const nome = formData.nome.trim();
    const email = formData.email.trim().toLowerCase();
    const telefone = somenteNumeros(formData.telefone);
    const cpf = somenteNumeros(formData.cpf);
    const susep = formData.susep.trim();
    const senha = formData.senha;

    if (!nome) {
      return "Informe o nome do membro.";
    }

    if (nome.length < 2) {
      return "Informe um nome válido.";
    }

    if (!email) {
      return "Informe o e-mail do membro.";
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(email)) {
      return "Informe um e-mail válido.";
    }

    if (telefone && telefone.length < 10) {
      return "Informe um telefone válido.";
    }

    if (cpf && !validarCPF(cpf)) {
      return "Informe um CPF válido.";
    }

    if (
      formData.funcao_equipe === "CORRETOR" &&
      !susep
    ) {
      return "Informe o registro SUSEP do corretor.";
    }

    if (!senha) {
      return "Informe uma senha inicial.";
    }

    if (senha.length < 6) {
      return "A senha deve possuir pelo menos 6 caracteres.";
    }

    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (salvando) return;

    setErro("");
    setSucesso("");

    const erroValidacao = validarFormulario();

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (!perfilLogado) {
      setErro("Não foi possível identificar a corretora.");
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        nome: formData.nome.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.senha,
        telefone: somenteNumeros(formData.telefone) || null,
        cpf: somenteNumeros(formData.cpf) || null,
        susep:
          formData.funcao_equipe === "CORRETOR"
            ? formData.susep.trim() || null
            : null,
        funcao_equipe: formData.funcao_equipe,

        /*
          Não precisamos enviar corretora_id.

          A nova Edge Function identifica a corretora pelo JWT
          do usuário autenticado.
        */
      };

      const { data, error } = await supabase.functions.invoke(
        "cadastrar-usuario",
        {
          body: payload,
        }
      );

      if (error) {
        let mensagem = error.message;

        /*
          Dependendo da resposta da Edge Function, o Supabase pode
          disponibilizar detalhes adicionais no contexto.
        */
        try {
          const context = (error as any)?.context;

          if (context && typeof context.json === "function") {
            const body = await context.json();

            if (body?.error) {
              mensagem = body.error;
            }
          }
        } catch {
          // Mantém a mensagem original.
        }

        throw new Error(mensagem);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.success) {
        throw new Error(
          "O cadastro não retornou confirmação de sucesso."
        );
      }

      setSucesso(
        `${formData.nome.trim()} foi adicionado à equipe com sucesso.`
      );

      /*
        Pequeno intervalo apenas para o usuário visualizar a
        confirmação antes de retornar para a listagem.
      */
      window.setTimeout(() => {
        navigate("/equipe");
      }, 900);
    } catch (error: any) {
      console.error("Erro ao cadastrar membro:", error);

      setErro(
        error?.message ||
          "Não foi possível cadastrar o membro da equipe."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (loadingPerfil || isAuthorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2
          size={34}
          className="animate-spin text-purple-600 mb-3"
        />

        <p className="text-sm text-zinc-500 font-medium">
          Validando acesso...
        </p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-6">
          <Shield size={40} />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          Acesso Restrito
        </h1>

        <p className="text-zinc-500 max-w-md">
          Apenas a corretora pode cadastrar membros da equipe.
        </p>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mt-8 px-8 py-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl font-bold"
        >
          Voltar para o Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20">
      {/* CABEÇALHO */}
      <div className="flex items-start gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate("/equipe")}
          disabled={salvando}
          className="w-11 h-11 shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-purple-600 hover:border-purple-300 dark:hover:border-purple-800 flex items-center justify-center transition-all disabled:opacity-50"
          title="Voltar para Equipe"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Users size={24} />
          </div>

          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">
              Novo membro
            </h1>

            <p className="text-zinc-500 font-medium">
              Adicione uma pessoa à equipe da sua corretora
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* FORMULÁRIO PRINCIPAL */}
          <div className="space-y-6">
            {/* FUNÇÃO */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="font-black text-lg text-zinc-900 dark:text-white">
                  Função na equipe
                </h2>

                <p className="text-sm text-zinc-500 mt-1">
                  Selecione a principal função deste membro.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FUNCOES.map((funcao) => {
                  const selecionada =
                    formData.funcao_equipe === funcao.value;

                  return (
                    <button
                      key={funcao.value}
                      type="button"
                      disabled={salvando}
                      onClick={() =>
                        handleFuncaoChange(funcao.value)
                      }
                      className={`text-left p-4 rounded-2xl border transition-all disabled:opacity-50 ${
                        selecionada
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10 ring-2 ring-purple-500/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-800 bg-white dark:bg-zinc-950"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                            selecionada
                              ? "bg-purple-600 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          <FuncaoIcon funcao={funcao.value} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                selecionada
                                  ? "text-purple-700 dark:text-purple-400"
                                  : "text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              {funcao.label}
                            </span>

                            {selecionada && (
                              <CheckCircle2
                                size={16}
                                className="text-purple-600"
                              />
                            )}
                          </div>

                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                            {funcao.descricao}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* DADOS DO MEMBRO */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="font-black text-lg text-zinc-900 dark:text-white">
                  Dados do membro
                </h2>

                <p className="text-sm text-zinc-500 mt-1">
                  Informe os dados de identificação e contato.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* NOME */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Nome *
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                    />

                    <input
                      type="text"
                      value={formData.nome}
                      disabled={salvando}
                      onChange={(e) =>
                        atualizarCampo("nome", e.target.value)
                      }
                      placeholder="Nome completo"
                      autoComplete="name"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* E-MAIL */}
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    E-mail *
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                    />

                    <input
                      type="email"
                      value={formData.email}
                      disabled={salvando}
                      onChange={(e) =>
                        atualizarCampo("email", e.target.value)
                      }
                      placeholder="membro@empresa.com.br"
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* TELEFONE */}
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Telefone
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                    />

                    <input
                      type="tel"
                      value={formData.telefone}
                      disabled={salvando}
                      onChange={(e) =>
                        atualizarCampo(
                          "telefone",
                          formatarTelefone(e.target.value)
                        )
                      }
                      placeholder="(48) 99999-9999"
                      autoComplete="tel"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    CPF
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.cpf}
                    disabled={salvando}
                    onChange={(e) =>
                      atualizarCampo(
                        "cpf",
                        formatarCPF(e.target.value)
                      )
                    }
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all disabled:opacity-60"
                  />
                </div>

                {/* SUSEP - SOMENTE CORRETOR */}
                {formData.funcao_equipe === "CORRETOR" && (
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                      Registro SUSEP *
                    </label>

                    <div className="relative">
                      <Shield
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                      />

                      <input
                        type="text"
                        value={formData.susep}
                        disabled={salvando}
                        onChange={(e) =>
                          atualizarCampo("susep", e.target.value)
                        }
                        placeholder="Registro SUSEP"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ACESSO */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="font-black text-lg text-zinc-900 dark:text-white">
                  Acesso ao CRM
                </h2>

                <p className="text-sm text-zinc-500 mt-1">
                  Defina a senha inicial de acesso do novo membro.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Senha inicial *
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />

                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={formData.senha}
                    disabled={salvando}
                    onChange={(e) =>
                      atualizarCampo("senha", e.target.value)
                    }
                    placeholder="Mínimo de 6 caracteres"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all disabled:opacity-60"
                  />

                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() =>
                      setMostrarSenha((prev) => !prev)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                    title={
                      mostrarSenha
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >
                    {mostrarSenha ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="text-xs text-zinc-400 mt-2">
                  O membro poderá utilizar este e-mail e senha para
                  acessar o CRM.
                </p>
              </div>
            </section>
          </div>

          {/* RESUMO LATERAL */}
          <aside className="lg:sticky lg:top-4 self-start">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-4">
                Resumo
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 shrink-0 bg-purple-100 dark:bg-purple-500/10 rounded-2xl text-purple-600 flex items-center justify-center">
                  <FuncaoIcon
                    funcao={formData.funcao_equipe}
                    size={23}
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-black text-zinc-900 dark:text-white">
                    {funcaoSelecionada.label}
                  </p>

                  <p className="text-xs text-zinc-500">
                    Função selecionada
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Nome
                  </p>

                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-1 break-words">
                    {formData.nome.trim() || "Não informado"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    E-mail
                  </p>

                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-1 break-words">
                    {formData.email.trim() || "Não informado"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Telefone
                  </p>

                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                    {formData.telefone || "Não informado"}
                  </p>
                </div>

                {formData.funcao_equipe === "CORRETOR" && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      SUSEP
                    </p>

                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                      {formData.susep.trim() || "Não informado"}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-900/40">
                <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
                  Este membro será vinculado automaticamente à sua
                  corretora.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* MENSAGENS */}
        {erro && (
          <div className="mt-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-medium">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mt-6 p-4 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
            <CheckCircle2 size={19} />
            {sucesso}
          </div>
        )}

        {/* AÇÕES */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            disabled={salvando}
            onClick={() => navigate("/equipe")}
            className="px-6 py-3.5 rounded-2xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={salvando}
            className="px-7 py-3.5 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {salvando ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />
                Cadastrando...
              </>
            ) : (
              <>
                <Save size={19} />
                Cadastrar membro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}