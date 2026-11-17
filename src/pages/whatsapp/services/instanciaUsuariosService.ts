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
  tipo_usuario: "CORRETOR" | "CORRETORA" | "ADMIN";
  ativo: boolean;
}

/**
 * Autoriza o gerenciamento de operadores com a mesma chave utilizada pela
 * Edge Function dapi-sessions: gestao.conexoes_whatsapp.create = tenant.
 * A consulta RPC ocorre com o JWT do usuário, nunca com service_role.
 *
 * Importante: a proteção definitiva dos INSERTs/DELETEs também precisa
 * existir nas policies RLS ou em RPCs autorizadas no banco.
 */
async function validarGerenciamentoConexoes(): Promise<PerfilLogado> {
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
  if (perfil.ativo !== true || !perfil.corretora_id) {
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
      "Você não possui permissão para gerenciar operadores das conexões WhatsApp.",
    );
  }

  return perfil as PerfilLogado;
}

/** Impede editar vínculos de instâncias inativas ou de outra corretora. */
async function validarInstanciaDaCorretora(
  instanciaId: string,
  corretoraId: string,
): Promise<void> {
  if (!instanciaId?.trim()) throw new Error("Instância não informada.");

  const { data: instancia, error } = await supabase
    .from("whatsapp_instancias")
    .select("id")
    .eq("id", instanciaId)
    .eq("corretora_id", corretoraId)
    .eq("provider", "dapi")
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  if (!instancia) {
    throw new Error(
      "Conexão não encontrada, inativa ou não pertencente à sua corretora.",
    );
  }
}

async function validarOperadoresAtivos(
  usuarioIds: string[],
  corretoraId: string,
): Promise<void> {
  if (usuarioIds.length === 0) return;

  const { data: usuarios, error } = await supabase
    .from("usuarios_perfis")
    .select("id")
    .eq("corretora_id", corretoraId)
    .eq("tipo_usuario", "CORRETOR")
    .eq("ativo", true)
    .in("id", usuarioIds);

  if (error) throw error;

  const idsValidos = new Set((usuarios ?? []).map((item) => item.id));
  if (usuarioIds.some((id) => !idsValidos.has(id))) {
    throw new Error(
      "Um ou mais operadores selecionados não pertencem à equipe ativa da corretora.",
    );
  }
}

export async function buscarVinculosOperadores(): Promise<
  VinculoOperadorInstancia[]
> {
  const perfil = await validarGerenciamentoConexoes();

  const { data, error } = await supabase
    .from("whatsapp_instancias_usuarios")
    .select("id, corretora_id, instancia_id, usuario_id, created_at")
    .eq("corretora_id", perfil.corretora_id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as VinculoOperadorInstancia[];
}

export async function buscarOperadoresDaInstancia(
  instanciaId: string,
): Promise<string[]> {
  const perfil = await validarGerenciamentoConexoes();
  await validarInstanciaDaCorretora(instanciaId, perfil.corretora_id);

  const { data, error } = await supabase
    .from("whatsapp_instancias_usuarios")
    .select("usuario_id")
    .eq("corretora_id", perfil.corretora_id)
    .eq("instancia_id", instanciaId);

  if (error) throw error;
  return (data ?? []).map((item) => item.usuario_id);
}

export async function atualizarOperadoresDaInstancia(
  instanciaId: string,
  usuarioIds: string[],
): Promise<string[]> {
  const perfil = await validarGerenciamentoConexoes();
  await validarInstanciaDaCorretora(instanciaId, perfil.corretora_id);

  const idsNormalizados = Array.from(
    new Set(usuarioIds.map((id) => id.trim()).filter(Boolean)),
  );
  await validarOperadoresAtivos(idsNormalizados, perfil.corretora_id);

  const { data: atuais, error: atuaisError } = await supabase
    .from("whatsapp_instancias_usuarios")
    .select("usuario_id")
    .eq("corretora_id", perfil.corretora_id)
    .eq("instancia_id", instanciaId);

  if (atuaisError) throw atuaisError;

  const atuaisIds = new Set((atuais ?? []).map((item) => item.usuario_id));
  const novosIds = new Set(idsNormalizados);
  const inserir = idsNormalizados.filter((id) => !atuaisIds.has(id));
  const remover = [...atuaisIds].filter((id) => !novosIds.has(id));

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
  // Preserva a compatibilidade com chamadas que não informam responsável.
  if (!instanciaId?.trim() || !usuarioId?.trim()) return;

  const perfil = await validarGerenciamentoConexoes();
  await validarInstanciaDaCorretora(instanciaId, perfil.corretora_id);
  await validarOperadoresAtivos([usuarioId.trim()], perfil.corretora_id);

  const { error } = await supabase
    .from("whatsapp_instancias_usuarios")
    .upsert(
      {
        corretora_id: perfil.corretora_id,
        instancia_id: instanciaId,
        usuario_id: usuarioId.trim(),
      },
      {
        onConflict: "instancia_id,usuario_id",
        ignoreDuplicates: true,
      },
    );

  if (error) throw error;
}
