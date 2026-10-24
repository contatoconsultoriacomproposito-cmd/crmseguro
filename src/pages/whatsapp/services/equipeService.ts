import { supabase } from "../../../lib/supabaseClient";
export type FuncaoEquipe =
  | "CORRETOR"
  | "ATENDIMENTO"
  | "COMERCIAL"
  | "FINANCEIRO"
  | "ADMINISTRATIVO"
  | "OUTRO";

export interface MembroEquipeAtivo {
  id: string;
  nome: string;
  email: string;
  funcao_equipe: FuncaoEquipe | null;
  ativo: boolean;
}

interface PerfilLogado {
  id: string;
  corretora_id: string;
  tipo_usuario: "CORRETORA" | "CORRETOR";
  ativo: boolean;
}

export async function buscarMembrosAtivosDaCorretora(): Promise<MembroEquipeAtivo[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user?.id) throw new Error("Usuário não autenticado.");

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_perfis")
    .select("id, corretora_id, tipo_usuario, ativo")
    .eq("id", user.id)
    .single();

  if (perfilError) throw perfilError;
  if (!perfil) throw new Error("Perfil não encontrado.");

  const perfilLogado = perfil as PerfilLogado;

  if (
    perfilLogado.tipo_usuario !== "CORRETORA" ||
    perfilLogado.ativo !== true
  ) {
    throw new Error("Apenas a corretora pode gerenciar responsáveis das conexões.");
  }

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select(`
      id,
      nome,
      email,
      funcao_equipe,
      ativo
    `)
    .eq("corretora_id", perfilLogado.corretora_id)
    .eq("tipo_usuario", "CORRETOR")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;

  return (data || []) as MembroEquipeAtivo[];
}