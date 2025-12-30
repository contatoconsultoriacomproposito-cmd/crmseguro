import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mantemos apenas o cliente padrão. 
// Ele é suficiente para chamar a Edge Function de forma segura.
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);

// LOG DE DEPURAÇÃO SIMPLIFICADO
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ ATENÇÃO: Variáveis do Supabase não encontradas!");
}