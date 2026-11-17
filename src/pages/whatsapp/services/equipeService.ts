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
  tipo_usuario: "CORRETORA" | "CORRETOR" | "ADMIN";
  ativo: boolean;
}

/**
 * Lista os membros que podem ser responsáveis/operadores das conexões.
 * Não concede privilégios de gestão da Equipe: exige a permissão específica
 * de Gestão > Conexões WhatsApp, validada no Supabase com o JWT do usuário.
 */
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
    .maybeSingle();

  if (perfilError) throw perfilError;
  if (!perfil) throw new Error("Perfil não encontrado.");

  const perfilLogado = perfil as PerfilLogado;
  if (perfilLogado.ativo !== true || !perfilLogado.corretora_id) {
    throw new Error("Usuário inativo ou sem corretora vinculada.");
  }

  const { data: escopo, error: permissaoError } = await supabase.rpc(
    "crm_escopo_permissao",
    {
      p_recurso: "gestao.conexoes_whatsapp",
      p_acao: "create",
    },
  );

  if (permissaoError) throw permissaoError;
  if (escopo !== "tenant") {
    throw new Error(
      "Você não possui permissão para gerenciar responsáveis e operadores das conexões WhatsApp.",
    );
  }

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select("id, nome, email, funcao_equipe, ativo")
    .eq("corretora_id", perfilLogado.corretora_id)
    .eq("tipo_usuario", "CORRETOR")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MembroEquipeAtivo[];
}
