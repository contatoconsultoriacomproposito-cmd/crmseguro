import { supabase } from "../../../../lib/supabaseClient";

export type TipoCadastroFinanceiro = "FORNECEDOR" | "INDICADOR" | "PARCEIRO" | "CLIENTE" | "OUTRO";

/** Cria ou reutiliza o cadastro da própria corretora somente quando solicitado. */
export async function garantirCadastroFinanceiro(
  nomeInformado: string,
  tipo: TipoCadastroFinanceiro,
): Promise<string> {
  const nome = nomeInformado.trim();
  if (!nome) throw new Error("Informe o nome do favorecido ou pagador para cadastrá-lo.");

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Usuário não autenticado.");
  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_perfis")
    .select("id, tipo_usuario, ativo")
    .eq("id", auth.user.id)
    .single();
  if (perfilError || !perfil || !perfil.ativo || perfil.tipo_usuario !== "CORRETORA") {
    throw new Error("Somente a corretora pode incluir cadastros financeiros.");
  }

  // Nunca reutilizar contatos de outras corretoras, nem de categoria diferente.
  const { data: existentes, error: buscaError } = await supabase
    .from("crm_cadastro")
    .select("id,nome")
    .eq("corretora_id", perfil.id)
    .eq("tipo", tipo)
    .eq("ativo", true);
  if (buscaError) throw new Error(`Falha ao verificar o cadastro: ${buscaError.message}`);
  const anterior = (existentes ?? []).find(
    (item) => String(item.nome).trim().toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"),
  );
  if (anterior) return anterior.id;

  const { data: novo, error: insertError } = await supabase
    .from("crm_cadastro")
    .insert({ corretora_id: perfil.id, tipo, nome })
    .select("id")
    .single();
  if (insertError || !novo) throw new Error(insertError?.message ?? "Não foi possível cadastrar o favorecido/pagador.");
  return novo.id;
}
