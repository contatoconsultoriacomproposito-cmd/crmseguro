import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 1. Cliente Padrão (O que o site usa para tudo)
// Usamos um fallback ('') para evitar o erro fatal "Key is required"
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);

// 2. Cliente Admin (Apenas se as chaves existirem)
// Isso evita que o app quebre se a Service Key estiver ausente (que é o caso da Vercel)
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Se não houver chave de admin, ele aponta para o cliente comum para não quebrar

// LOG DE DEPURAÇÃO PARA O CONSOLE DO NAVEGADOR
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ ATENÇÃO: Variáveis do Supabase não encontradas!");
  console.log("VITE_SUPABASE_URL:", supabaseUrl ? "OK" : "VAZIO");
  console.log("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "OK" : "VAZIO");
}