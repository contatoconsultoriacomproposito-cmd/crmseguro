// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou Anon Key não configuradas.")
}

declare global {
  interface Window {
    __supabase?: SupabaseClient
  }
}

function createSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "sb-corretor-auth",
      persistSession: true,
      autoRefreshToken: true,
      // AJUSTE: Mude para true se você pretende usar links de recuperação de senha 
      // ou se o login for feito via redirect de provedores externos.
      detectSessionInUrl: true, 
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    global: {
      headers: {
        "X-Client-Info": "segurocrm-dashboard",
      },
    },
  })
}

export const supabase =
  window.__supabase ?? (window.__supabase = createSupabase())

// Cliente Público isolado (Para uso em landing pages ou triagem)
export const supabasePublic = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)

// Helper 401 seguro - O BOTÃO DE EMERGÊNCIA
export async function safeQuery<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  const result = await promise

  // Captura 401 (Não autorizado) e 403 (Proibido/Token Inválido)
  if (result.error?.status === 401 || result.error?.status === 403) {
    console.error("🚨 SESSÃO INVÁLIDA DETECTADA: Limpando rastro e redirecionando...");
    
    // 1. Limpa o Auth do Supabase
    await supabase.auth.signOut().catch(() => {});
    
    // 2. Mata o cache local que causa o estado "Zumbi"
    localStorage.removeItem("sb-corretor-auth");
    
    // 3. Redirecionamento Bruto (window.location)
    // Usamos isso em vez do navigate porque queremos resetar TODO o estado do React
    window.location.href = "/"; 
  }

  return result
}