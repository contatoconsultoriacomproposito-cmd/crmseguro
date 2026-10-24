import { supabase } from "../../../../../lib/supabaseClient";

export interface CorretorProposta {
  id: string;
  nome: string;
  email: string | null;
  tipo_usuario: string;
  corretora_id: string | null;
}

interface PerfilAtual {
  id: string;
  nome: string;
  email: string | null;
  tipo_usuario: string;
  corretora_id: string | null;
  ativo: boolean;
}

async function buscarPerfilAtual(): Promise<PerfilAtual> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select(`
      id,
      nome,
      email,
      tipo_usuario,
      corretora_id,
      ativo
    `)
    .eq("id", user.id)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error("Perfil do usuário não encontrado.");
  }

  if (!data.ativo) {
    throw new Error("Usuário inativo.");
  }

  return data as PerfilAtual;
}

function obterCorretoraId(perfil: PerfilAtual): string {
  if (perfil.tipo_usuario === "CORRETORA") {
    return perfil.id;
  }

  if (perfil.corretora_id) {
    return perfil.corretora_id;
  }

  throw new Error(
    "Não foi possível identificar a corretora do usuário.",
  );
}

export async function buscarCorretoresProposta(): Promise<
  CorretorProposta[]
> {
  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  // CORRETOR não pode criar proposta para outro responsável.
  // Portanto, no seletor da renovação ele visualiza apenas a si próprio.
  if (perfil.tipo_usuario === "CORRETOR") {
    return [
      {
        id: perfil.id,
        nome: perfil.nome || "Usuário sem nome",
        email: perfil.email ?? null,
        tipo_usuario: perfil.tipo_usuario,
        corretora_id: perfil.corretora_id ?? null,
      },
    ];
  }

  // CORRETORA pode escolher entre ela própria e os
  // corretores ativos vinculados à sua corretora.
  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select(`
      id,
      nome,
      email,
      tipo_usuario,
      corretora_id
    `)
    .eq("ativo", true)
    .or(
      `id.eq.${corretoraId},corretora_id.eq.${corretoraId}`,
    )
    .in("tipo_usuario", ["CORRETORA", "CORRETOR"])
    .order("nome", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item) => ({
    id: item.id,
    nome: item.nome || "Usuário sem nome",
    email: item.email ?? null,
    tipo_usuario: item.tipo_usuario,
    corretora_id: item.corretora_id ?? null,
  }));
}

export async function buscarCorretorPropostaPorId(
  corretorId: string,
): Promise<CorretorProposta | null> {
  if (!corretorId) return null;

  const perfil = await buscarPerfilAtual();
  const corretoraId = obterCorretoraId(perfil);

  // CORRETOR só pode utilizar a si próprio
  // como responsável por uma nova proposta.
  if (
    perfil.tipo_usuario === "CORRETOR" &&
    corretorId !== perfil.id
  ) {
    return null;
  }

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select(`
      id,
      nome,
      email,
      tipo_usuario,
      corretora_id
    `)
    .eq("id", corretorId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  const pertenceCorretora =
    data.id === corretoraId ||
    data.corretora_id === corretoraId;

  if (!pertenceCorretora) {
    return null;
  }

  if (
    data.tipo_usuario !== "CORRETORA" &&
    data.tipo_usuario !== "CORRETOR"
  ) {
    return null;
  }

  return {
    id: data.id,
    nome: data.nome || "Usuário sem nome",
    email: data.email ?? null,
    tipo_usuario: data.tipo_usuario,
    corretora_id: data.corretora_id ?? null,
  };
}