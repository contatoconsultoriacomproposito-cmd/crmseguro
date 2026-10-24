import { supabase } from "../../../lib/supabaseClient";

export interface VinculoOperadorInstancia {
  id: string;
  corretora_id: string;
  instancia_id: string;
  usuario_id: string;
  created_at: string;
}

interface PerfilLogado {
  id: string;
  corretora_id: string;
  tipo_usuario: "CORRETORA" | "CORRETOR" | "ADMIN";
  ativo: boolean;
}

async function buscarPerfilLogado(): Promise<PerfilLogado> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user?.id) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("usuarios_perfis")
    .select("id, corretora_id, tipo_usuario, ativo")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Perfil não encontrado.");

  return data as PerfilLogado;
}

async function validarCorretoraLogada(): Promise<PerfilLogado> {
  const perfil = await buscarPerfilLogado();

  if (perfil.tipo_usuario !== "CORRETORA" || perfil.ativo !== true) {
    throw new Error("Apenas a corretora pode gerenciar operadores das conexões.");
  }

  return perfil;
}

export async function buscarVinculosOperadores(): Promise<VinculoOperadorInstancia[]> {
  const perfil = await validarCorretoraLogada();

  const { data, error } = await supabase
    .from("whatsapp_instancias_usuarios")
    .select(`
      id,
      corretora_id,
      instancia_id,
      usuario_id,
      created_at
    `)
    .eq("corretora_id", perfil.corretora_id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []) as VinculoOperadorInstancia[];
}

export async function buscarOperadoresDaInstancia(
  instanciaId: string,
): Promise<string[]> {
  if (!instanciaId) throw new Error("Instância não informada.");

  const perfil = await validarCorretoraLogada();

  const { data, error } = await supabase
    .from("whatsapp_instancias_usuarios")
    .select("usuario_id")
    .eq("corretora_id", perfil.corretora_id)
    .eq("instancia_id", instanciaId);

  if (error) throw error;

  return (data || []).map((item) => item.usuario_id);
}

export async function atualizarOperadoresDaInstancia(
  instanciaId: string,
  usuarioIds: string[],
): Promise<string[]> {
  if (!instanciaId) throw new Error("Instância não informada.");

  const perfil = await validarCorretoraLogada();

  const idsNormalizados = Array.from(
    new Set(usuarioIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (idsNormalizados.length > 0) {
    const { data: usuarios, error: usuariosError } = await supabase
      .from("usuarios_perfis")
      .select("id")
      .eq("corretora_id", perfil.corretora_id)
      .eq("tipo_usuario", "CORRETOR")
      .eq("ativo", true)
      .in("id", idsNormalizados);

    if (usuariosError) throw usuariosError;

    const idsValidos = new Set((usuarios || []).map((item) => item.id));

    const possuiUsuarioInvalido = idsNormalizados.some(
      (id) => !idsValidos.has(id),
    );

    if (possuiUsuarioInvalido) {
      throw new Error(
        "Um ou mais operadores selecionados não pertencem à equipe ativa da corretora.",
      );
    }
  }

  const { data: atuais, error: atuaisError } = await supabase
    .from("whatsapp_instancias_usuarios")
    .select("usuario_id")
    .eq("corretora_id", perfil.corretora_id)
    .eq("instancia_id", instanciaId);

  if (atuaisError) throw atuaisError;

  const atuaisIds = (atuais || []).map((item) => item.usuario_id);

  const inserir = idsNormalizados.filter(
    (id) => !atuaisIds.includes(id),
  );

  const remover = atuaisIds.filter(
    (id) => !idsNormalizados.includes(id),
  );

  if (inserir.length > 0) {
    const { error } = await supabase
      .from("whatsapp_instancias_usuarios")
      .upsert(
        inserir.map((usuarioId) => ({
          corretora_id: perfil.corretora_id,
          instancia_id: instanciaId,
          usuario_id: usuarioId,
        })),
        {
          onConflict: "instancia_id,usuario_id",
          ignoreDuplicates: true,
        },
      );

    if (error) throw error;
  }

  if (remover.length > 0) {
    const { error } = await supabase
      .from("whatsapp_instancias_usuarios")
      .delete()
      .eq("corretora_id", perfil.corretora_id)
      .eq("instancia_id", instanciaId)
      .in("usuario_id", remover);

    if (error) throw error;
  }

  return idsNormalizados;
}

export async function garantirOperadorDaInstancia(
  instanciaId: string,
  usuarioId: string,
): Promise<void> {
  if (!instanciaId || !usuarioId) return;

  const perfil = await validarCorretoraLogada();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios_perfis")
    .select("id")
    .eq("id", usuarioId)
    .eq("corretora_id", perfil.corretora_id)
    .eq("tipo_usuario", "CORRETOR")
    .eq("ativo", true)
    .maybeSingle();

  if (usuarioError) throw usuarioError;

  if (!usuario) {
    throw new Error(
      "O responsável selecionado não pertence à equipe ativa da corretora.",
    );
  }

  const { error } = await supabase
    .from("whatsapp_instancias_usuarios")
    .upsert(
      {
        corretora_id: perfil.corretora_id,
        instancia_id: instanciaId,
        usuario_id: usuarioId,
      },
      {
        onConflict: "instancia_id,usuario_id",
        ignoreDuplicates: true,
      },
    );

  if (error) throw error;
}