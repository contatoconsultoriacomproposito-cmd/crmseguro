import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. Cliente para o Dashboard (Mantém o login do corretor)
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);

// 2. Cliente para o Portal do Parceiro (IGNORA o login do corretor)
// Este cliente nunca envia o token de autenticação, sendo sempre "anon".
export const supabasePublic = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ ATENÇÃO: Variáveis do Supabase não encontradas!");
}