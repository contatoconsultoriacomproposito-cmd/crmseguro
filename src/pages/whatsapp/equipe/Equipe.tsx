import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  CircleUserRound,
  Eye,
  EyeOff,
  Headphones,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../auth/AuthContext";

type FuncaoEquipe =
  | "CORRETOR"
  | "ATENDIMENTO"
  | "COMERCIAL"
  | "FINANCEIRO"
  | "ADMINISTRATIVO"
  | "OUTRO";

interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: "CORRETORA" | "CORRETOR";
  funcao_equipe: FuncaoEquipe | null;
  telefone_corretor: string | null;
  registro_susep: string | null;
  cpf_corretor: string | null;
  ativo: boolean;
  corretora_id: string;
}

interface PerfilLogado {
  id: string;
  corretora_id: string;
  tipo_usuario: "CORRETORA" | "CORRETOR";
  ativo: boolean;
}

type FiltroFuncao = "TODAS" | FuncaoEquipe;

interface FormEdicao {
  nome: string;
  funcao_equipe: FuncaoEquipe;
  telefone: string;
  cpf: string;
  susep: string;
}

const FUNCOES: Array<{
  value: FuncaoEquipe;
  label: string;
}> = [
  { value: "CORRETOR", label: "Corretor" },
  { value: "ATENDIMENTO", label: "Atendimento" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "OUTRO", label: "Outro" },
];

function somenteNumeros(value: string) {
  return value.replace(/\D/g, "");
}

function formatarTelefone(value: string) {
  const numeros = somenteNumeros(value).slice(0, 11);

  if (numeros.length <= 2) return numeros;

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

  if (digito1 === 10) digito1 = 0;

  if (digito1 !== Number(numeros.charAt(9))) {
    return false;
  }

  soma = 0;

  for (let i = 0; i < 10; i++) {
    soma += Number(numeros.charAt(i)) * (11 - i);
  }

  let digito2 = (soma * 10) % 11;

  if (digito2 === 10) digito2 = 0;

  return digito2 === Number(numeros.charAt(10));
}

function normalizarBusca(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterFuncao(membro: MembroEquipe): FuncaoEquipe {
  return membro.funcao_equipe || "CORRETOR";
}

function obterLabelFuncao(funcao: FuncaoEquipe) {
  return FUNCOES.find((item) => item.value === funcao)?.label || "Outro";
}

function FuncaoIcon({
  funcao,
  size = 22,
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

function ModalBase({
  aberto,
  titulo,
  descricao,
  children,
  onClose,
  largura = "max-w-lg",
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  onClose: () => void;
  largura?: string;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        className={`relative w-full ${largura} max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">
              {titulo}
            </h2>

            {descricao && (
              <p className="text-sm text-zinc-500 mt-1">
                {descricao}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default function Equipe() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [removidos, setRemovidos] = useState<MembroEquipe[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRemovidos, setLoadingRemovidos] = useState(false);
  const [processando, setProcessando] = useState(false);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] =
    useState<FiltroFuncao>("TODAS");

  const [menuAbertoId, setMenuAbertoId] =
    useState<string | null>(null);

  const [membroSelecionado, setMembroSelecionado] =
    useState<MembroEquipe | null>(null);

  const [modalEditar, setModalEditar] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [modalRemover, setModalRemover] = useState(false);
  const [modalRemovidos, setModalRemovidos] = useState(false);

  const [formEdicao, setFormEdicao] = useState<FormEdicao>({
    nome: "",
    funcao_equipe: "CORRETOR",
    telefone: "",
    cpf: "",
    susep: "",
  });

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    carregarEquipe();
  }, [user?.id]);

  async function obterPerfilLogado(): Promise<PerfilLogado> {
    if (!user?.id) {
      throw new Error("Usuário não autenticado.");
    }

    const { data, error } = await supabase
      .from("usuarios_perfis")
      .select("id, corretora_id, tipo_usuario, ativo")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error("Perfil não encontrado.");
    }

    return data as PerfilLogado;
  }

  async function carregarEquipe() {
    if (!user?.id) return;

    try {
      setLoading(true);
      setErro("");

      const perfil = await obterPerfilLogado();

      if (
        perfil.tipo_usuario !== "CORRETORA" ||
        perfil.ativo !== true
      ) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);

      const { data, error } = await supabase
        .from("usuarios_perfis")
        .select(`
          id,
          nome,
          email,
          tipo_usuario,
          funcao_equipe,
          telefone_corretor,
          registro_susep,
          cpf_corretor,
          ativo,
          corretora_id
        `)
        .eq("corretora_id", perfil.corretora_id)
        .eq("tipo_usuario", "CORRETOR")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;

      setMembros((data || []) as MembroEquipe[]);
    } catch (error: any) {
      console.error("Erro ao carregar equipe:", error);
      setErro(
        error?.message ||
          "Não foi possível carregar os membros da equipe."
      );
    } finally {
      setLoading(false);
    }
  }

  async function carregarRemovidos() {
    try {
      setLoadingRemovidos(true);
      setErro("");

      const perfil = await obterPerfilLogado();

      const { data, error } = await supabase
        .from("usuarios_perfis")
        .select(`
          id,
          nome,
          email,
          tipo_usuario,
          funcao_equipe,
          telefone_corretor,
          registro_susep,
          cpf_corretor,
          ativo,
          corretora_id
        `)
        .eq("corretora_id", perfil.corretora_id)
        .eq("tipo_usuario", "CORRETOR")
        .eq("ativo", false)
        .order("nome", { ascending: true });

      if (error) throw error;

      setRemovidos((data || []) as MembroEquipe[]);
    } catch (error: any) {
      console.error("Erro ao carregar membros removidos:", error);
      setErro(
        error?.message ||
          "Não foi possível carregar os membros removidos."
      );
    } finally {
      setLoadingRemovidos(false);
    }
  }

  async function chamarEquipe(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke(
      "cadastrar-usuario",
      { body }
    );

    if (error) {
      let mensagemErro = error.message;

      try {
        const context = (error as any)?.context;

        if (context && typeof context.json === "function") {
          const resposta = await context.json();

          if (resposta?.error) {
            mensagemErro = resposta.error;
          }
        }
      } catch {
        // mantém mensagem original
      }

      throw new Error(mensagemErro);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.success) {
      throw new Error(
        "A operação não retornou confirmação de sucesso."
      );
    }

    return data;
  }

  function abrirEditar(membro: MembroEquipe) {
    setMembroSelecionado(membro);
    setMenuAbertoId(null);
    setErro("");
    setMensagem("");

    setFormEdicao({
      nome: membro.nome || "",
      funcao_equipe: obterFuncao(membro),
      telefone: formatarTelefone(
        membro.telefone_corretor || ""
      ),
      cpf: formatarCPF(membro.cpf_corretor || ""),
      susep: membro.registro_susep || "",
    });

    setModalEditar(true);
  }

  function abrirSenha(membro: MembroEquipe) {
    setMembroSelecionado(membro);
    setMenuAbertoId(null);
    setErro("");
    setMensagem("");
    setNovaSenha("");
    setConfirmarSenha("");
    setMostrarSenha(false);
    setMostrarConfirmacao(false);
    setModalSenha(true);
  }

  function abrirRemover(membro: MembroEquipe) {
    setMembroSelecionado(membro);
    setMenuAbertoId(null);
    setErro("");
    setMensagem("");
    setModalRemover(true);
  }

  async function salvarEdicao() {
    if (!membroSelecionado || processando) return;

    const nome = formEdicao.nome.trim();
    const telefone = somenteNumeros(formEdicao.telefone);
    const cpf = somenteNumeros(formEdicao.cpf);
    const susep = formEdicao.susep.trim();

    if (!nome) {
      setErro("Informe o nome do membro.");
      return;
    }

    if (telefone && telefone.length < 10) {
      setErro("Informe um telefone válido.");
      return;
    }

    if (cpf && !validarCPF(cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }

    if (
      formEdicao.funcao_equipe === "CORRETOR" &&
      !susep
    ) {
      setErro("Informe o registro SUSEP do corretor.");
      return;
    }

    try {
      setProcessando(true);
      setErro("");

      const resposta = await chamarEquipe({
        action: "ATUALIZAR",
        membro_id: membroSelecionado.id,
        nome,
        funcao_equipe: formEdicao.funcao_equipe,
        telefone: telefone || null,
        cpf: cpf || null,
        susep:
          formEdicao.funcao_equipe === "CORRETOR"
            ? susep || null
            : null,
      });

      setModalEditar(false);
      setMembroSelecionado(null);
      setMensagem(
        resposta?.message || "Membro atualizado com sucesso."
      );

      await carregarEquipe();
    } catch (error: any) {
      console.error("Erro ao atualizar membro:", error);
      setErro(
        error?.message ||
          "Não foi possível atualizar o membro."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alterarSenha() {
    if (!membroSelecionado || processando) return;

    if (novaSenha.length < 6) {
      setErro(
        "A nova senha deve possuir pelo menos 6 caracteres."
      );
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas informadas não são iguais.");
      return;
    }

    try {
      setProcessando(true);
      setErro("");

      const resposta = await chamarEquipe({
        action: "ALTERAR_SENHA",
        membro_id: membroSelecionado.id,
        nova_senha: novaSenha,
      });

      setModalSenha(false);
      setMembroSelecionado(null);
      setNovaSenha("");
      setConfirmarSenha("");

      setMensagem(
        resposta?.message || "Senha alterada com sucesso."
      );
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      setErro(
        error?.message ||
          "Não foi possível alterar a senha."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function removerMembro() {
    if (!membroSelecionado || processando) return;

    try {
      setProcessando(true);
      setErro("");

      const resposta = await chamarEquipe({
        action: "DESATIVAR",
        membro_id: membroSelecionado.id,
      });

      const idRemovido = membroSelecionado.id;

      setMembros((prev) =>
        prev.filter((membro) => membro.id !== idRemovido)
      );

      setModalRemover(false);
      setMembroSelecionado(null);

      setMensagem(
        resposta?.message ||
          "Membro removido da equipe com sucesso."
      );
    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      setErro(
        error?.message ||
          "Não foi possível remover o membro."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function reativarMembro(membro: MembroEquipe) {
    if (processando) return;

    try {
      setProcessando(true);
      setErro("");

      const resposta = await chamarEquipe({
        action: "REATIVAR",
        membro_id: membro.id,
      });

      setRemovidos((prev) =>
        prev.filter((item) => item.id !== membro.id)
      );

      setMensagem(
        resposta?.message ||
          "Membro reativado com sucesso."
      );

      await carregarEquipe();
    } catch (error: any) {
      console.error("Erro ao reativar membro:", error);
      setErro(
        error?.message ||
          "Não foi possível reativar o membro."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function abrirRemovidos() {
    setErro("");
    setMensagem("");
    setModalRemovidos(true);
    await carregarRemovidos();
  }

  const membrosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return membros.filter((membro) => {
      const funcao = obterFuncao(membro);

      const correspondeBusca =
        !termo ||
        normalizarBusca(membro.nome || "").includes(termo) ||
        normalizarBusca(membro.email || "").includes(termo) ||
        normalizarBusca(
          membro.telefone_corretor || ""
        ).includes(termo) ||
        normalizarBusca(
          obterLabelFuncao(funcao)
        ).includes(termo);

      const correspondeFuncao =
        filtroFuncao === "TODAS" ||
        funcao === filtroFuncao;

      return correspondeBusca && correspondeFuncao;
    });
  }, [membros, busca, filtroFuncao]);

  const totalCorretores = useMemo(
    () =>
      membros.filter(
        (membro) => obterFuncao(membro) === "CORRETOR"
      ).length,
    [membros]
  );

  const totalOutrasFuncoes =
    membros.length - totalCorretores;

  const totalFuncoes = useMemo(
    () =>
      new Set(
        membros.map((membro) => obterFuncao(membro))
      ).size,
    [membros]
  );

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
          Esta página é destinada à administração da equipe pela corretora.
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
    <>
      <div
        className="max-w-7xl mx-auto p-4 pb-20"
        onClick={() => setMenuAbertoId(null)}
      >
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Users size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">
                Equipe
              </h1>

              <p className="text-zinc-500 font-medium">
                Gerencie os membros da sua corretora
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                abrirRemovidos();
              }}
              className="px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              <Archive size={18} />
              Membros removidos
            </button>

            <button
              type="button"
              onClick={() => navigate("/equipe/cadastro")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={19} />
              Novo membro
            </button>           
          </div>
        </div>

        {/* MENSAGENS */}
        {mensagem && (
          <div className="mb-5 p-4 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 font-medium flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={19} />
              {mensagem}
            </div>

            <button
              type="button"
              onClick={() => setMensagem("")}
              className="shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {erro && !modalEditar && !modalSenha && !modalRemover && (
          <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-medium flex items-center justify-between gap-3">
            <span>{erro}</span>

            <button
              type="button"
              onClick={() => setErro("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* MÉTRICAS */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Equipe
              </p>

              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {membros.length}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Corretores
              </p>

              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {totalCorretores}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Outras funções
              </p>

              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {totalOutrasFuncoes}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Funções ativas
              </p>

              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {totalFuncoes}
              </p>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={19}
              />

              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail, telefone ou função..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
              />
            </div>

            <div className="relative">
              <SlidersHorizontal
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                size={17}
              />

              <select
                value={filtroFuncao}
                onChange={(e) =>
                  setFiltroFuncao(
                    e.target.value as FiltroFuncao
                  )
                }
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer"
              >
                <option value="TODAS">
                  Todas as funções
                </option>

                {FUNCOES.map((funcao) => (
                  <option
                    key={funcao.value}
                    value={funcao.value}
                  >
                    {funcao.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Loader2
              className="animate-spin text-purple-500 mb-3"
              size={32}
            />

            <p className="text-sm text-zinc-500 font-medium">
              Carregando equipe...
            </p>
          </div>
        ) : membros.length === 0 ? (
          <div className="text-center p-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <Users
              size={48}
              className="mx-auto text-zinc-300 mb-4"
            />

            <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-1">
              Sua equipe ainda está vazia
            </h3>

            <p className="text-zinc-500 text-sm mb-6">
              Cadastre o primeiro membro da sua equipe.
            </p>

            <button
              type="button"
              onClick={() => navigate("/equipe/cadastro")}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl font-bold transition-colors"
            >
              <Plus size={18} />
              Novo membro
            </button>
          </div>
        ) : membrosFiltrados.length === 0 ? (
          <div className="text-center p-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <Search
              size={42}
              className="mx-auto text-zinc-300 mb-4"
            />

            <p className="text-zinc-500 font-bold">
              Nenhum membro corresponde aos filtros selecionados.
            </p>

            <button
              type="button"
              onClick={() => {
                setBusca("");
                setFiltroFuncao("TODAS");
              }}
              className="mt-4 text-sm font-bold text-purple-600 hover:text-purple-700"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm text-zinc-500 font-medium">
                {membrosFiltrados.length}{" "}
                {membrosFiltrados.length === 1
                  ? "membro encontrado"
                  : "membros encontrados"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {membrosFiltrados.map((membro) => {
                const funcao = obterFuncao(membro);

                const funcaoInferida =
                  !membro.funcao_equipe &&
                  membro.tipo_usuario === "CORRETOR";

                return (
                  <div
                    key={membro.id}
                    className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 shrink-0 bg-purple-100 dark:bg-purple-500/10 rounded-2xl text-purple-600 flex items-center justify-center">
                          <FuncaoIcon funcao={funcao} />
                        </div>

                        <div className="min-w-0">
                          <h3
                            className="font-bold text-zinc-900 dark:text-white truncate"
                            title={membro.nome}
                          >
                            {membro.nome}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full">
                              {obterLabelFuncao(funcao)}
                            </span>

                            {funcaoInferida && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                                legado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMenuAbertoId((atual) =>
                              atual === membro.id
                                ? null
                                : membro.id
                            )
                          }
                          className="w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                          title="Ações"
                        >
                          <MoreVertical size={19} />
                        </button>

                        {menuAbertoId === membro.id && (
                          <div className="absolute right-0 top-11 z-30 w-220px min-w-[220px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2">
                            <button
                              type="button"
                              onClick={() => abrirEditar(membro)}
                              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Pencil size={16} />
                              Editar membro
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirSenha(membro)}
                              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <KeyRound size={16} />
                              Alterar senha
                            </button>

                            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                            <button
                              type="button"
                              onClick={() => abrirRemover(membro)}
                              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={16} />
                              Remover da equipe
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-sm text-zinc-500 min-w-0">
                        <Mail
                          size={15}
                          className="shrink-0 text-zinc-400"
                        />

                        <span
                          className="truncate"
                          title={membro.email}
                        >
                          {membro.email}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-sm text-zinc-500">
                        <Phone
                          size={15}
                          className="shrink-0 text-zinc-400"
                        />

                        <span>
                          {membro.telefone_corretor
                            ? formatarTelefone(
                                membro.telefone_corretor
                              )
                            : "Telefone não informado"}
                        </span>
                      </div>

                      {funcao === "CORRETOR" &&
                        membro.registro_susep && (
                          <div className="flex items-center gap-2.5 text-sm text-zinc-500">
                            <Shield
                              size={15}
                              className="shrink-0 text-zinc-400"
                            />

                            <span>
                              SUSEP: {membro.registro_susep}
                            </span>
                          </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-zinc-400 font-medium uppercase">
                        ID: {membro.id.slice(0, 8)}
                      </span>

                      <span className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                        Ativo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* EDITAR */}
      <ModalBase
        aberto={modalEditar}
        titulo="Editar membro"
        descricao={
          membroSelecionado
            ? membroSelecionado.email
            : undefined
        }
        onClose={() => {
          if (processando) return;
          setModalEditar(false);
          setErro("");
        }}
        largura="max-w-2xl"
      >
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              Nome *
            </label>

            <input
              type="text"
              value={formEdicao.nome}
              disabled={processando}
              onChange={(e) =>
                setFormEdicao((prev) => ({
                  ...prev,
                  nome: e.target.value,
                }))
              }
              className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              Função *
            </label>

            <select
              value={formEdicao.funcao_equipe}
              disabled={processando}
              onChange={(e) => {
                const funcao =
                  e.target.value as FuncaoEquipe;

                setFormEdicao((prev) => ({
                  ...prev,
                  funcao_equipe: funcao,
                  susep:
                    funcao === "CORRETOR"
                      ? prev.susep
                      : "",
                }));
              }}
              className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {FUNCOES.map((funcao) => (
                <option
                  key={funcao.value}
                  value={funcao.value}
                >
                  {funcao.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Telefone
              </label>

              <input
                type="tel"
                value={formEdicao.telefone}
                disabled={processando}
                onChange={(e) =>
                  setFormEdicao((prev) => ({
                    ...prev,
                    telefone: formatarTelefone(
                      e.target.value
                    ),
                  }))
                }
                placeholder="(48) 99999-9999"
                className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                CPF
              </label>

              <input
                type="text"
                value={formEdicao.cpf}
                disabled={processando}
                onChange={(e) =>
                  setFormEdicao((prev) => ({
                    ...prev,
                    cpf: formatarCPF(e.target.value),
                  }))
                }
                placeholder="000.000.000-00"
                className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {formEdicao.funcao_equipe === "CORRETOR" && (
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Registro SUSEP *
              </label>

              <input
                type="text"
                value={formEdicao.susep}
                disabled={processando}
                onChange={(e) =>
                  setFormEdicao((prev) => ({
                    ...prev,
                    susep: e.target.value,
                  }))
                }
                placeholder="Registro SUSEP"
                className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          )}

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              O e-mail de acesso não é alterado nesta tela.
            </p>
          </div>

          {erro && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={processando}
              onClick={() => {
                setModalEditar(false);
                setErro("");
              }}
              className="px-5 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={processando}
              onClick={salvarEdicao}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {processando && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              Salvar alterações
            </button>
          </div>
        </div>
      </ModalBase>

      {/* SENHA */}
      <ModalBase
        aberto={modalSenha}
        titulo="Alterar senha"
        descricao={
          membroSelecionado
            ? `${membroSelecionado.nome} • ${membroSelecionado.email}`
            : undefined
        }
        onClose={() => {
          if (processando) return;
          setModalSenha(false);
          setErro("");
        }}
      >
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              Nova senha *
            </label>

            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={novaSenha}
                disabled={processando}
                onChange={(e) =>
                  setNovaSenha(e.target.value)
                }
                placeholder="Mínimo de 6 caracteres"
                className="w-full px-4 pr-12 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20"
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarSenha((prev) => !prev)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {mostrarSenha ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              Confirmar nova senha *
            </label>

            <div className="relative">
              <input
                type={
                  mostrarConfirmacao
                    ? "text"
                    : "password"
                }
                value={confirmarSenha}
                disabled={processando}
                onChange={(e) =>
                  setConfirmarSenha(e.target.value)
                }
                placeholder="Repita a nova senha"
                className="w-full px-4 pr-12 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-purple-500/20"
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarConfirmacao((prev) => !prev)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {mostrarConfirmacao ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={processando}
              onClick={() => {
                setModalSenha(false);
                setErro("");
              }}
              className="px-5 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={processando}
              onClick={alterarSenha}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {processando ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <KeyRound size={17} />
              )}

              Alterar senha
            </button>
          </div>
        </div>
      </ModalBase>

      {/* REMOVER */}
      <ModalBase
        aberto={modalRemover}
        titulo="Remover da equipe"
        descricao={membroSelecionado?.nome}
        onClose={() => {
          if (processando) return;
          setModalRemover(false);
          setErro("");
        }}
      >
        <div className="p-6">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mb-5">
            <Trash2 size={25} />
          </div>

          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            O membro deixará de aparecer na equipe e perderá o
            acesso ao CRM. Seu cadastro e todo o histórico
            permanecerão preservados.
          </p>

          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 text-sm">
            Esta operação não exclui fisicamente o usuário.
            Ele poderá ser reativado posteriormente.
          </div>

          {erro && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              disabled={processando}
              onClick={() => {
                setModalRemover(false);
                setErro("");
              }}
              className="px-5 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={processando}
              onClick={removerMembro}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {processando && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              Remover da equipe
            </button>
          </div>
        </div>
      </ModalBase>

      {/* REMOVIDOS */}
      <ModalBase
        aberto={modalRemovidos}
        titulo="Membros removidos"
        descricao="Usuários preservados no histórico e atualmente sem acesso ao CRM."
        onClose={() => {
          if (processando) return;
          setModalRemovidos(false);
          setErro("");
        }}
        largura="max-w-3xl"
      >
        <div className="p-6">
          {loadingRemovidos ? (
            <div className="py-14 flex flex-col items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-purple-600 mb-3"
              />

              <p className="text-sm text-zinc-500">
                Carregando membros removidos...
              </p>
            </div>
          ) : removidos.length === 0 ? (
            <div className="py-14 text-center">
              <Archive
                size={42}
                className="mx-auto text-zinc-300 mb-3"
              />

              <p className="font-bold text-zinc-700 dark:text-zinc-300">
                Nenhum membro removido
              </p>

              <p className="text-sm text-zinc-500 mt-1">
                Não existem membros inativos nesta corretora.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {removidos.map((membro) => {
                const funcao = obterFuncao(membro);

                return (
                  <div
                    key={membro.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center">
                        <FuncaoIcon
                          funcao={funcao}
                          size={20}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          {membro.nome}
                        </p>

                        <p className="text-xs text-zinc-500 truncate">
                          {obterLabelFuncao(funcao)} •{" "}
                          {membro.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={processando}
                      onClick={() =>
                        reativarMembro(membro)
                      }
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processando ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <RotateCcw size={16} />
                      )}

                      Reativar
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {erro && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
              {erro}
            </div>
          )}
        </div>
      </ModalBase>
    </>
  );
}