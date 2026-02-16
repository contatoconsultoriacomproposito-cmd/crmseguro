// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// ===============================
// 🔐 Validação de variáveis
// ===============================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou Anon Key não configuradas.")
}

// ===============================
// 🧠 Singleton global (à prova de HMR)
// ===============================
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
      detectSessionInUrl: false,
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

// ===============================
// 🌎 Cliente Público isolado
// ===============================
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

// ===============================
// 🚨 Helper 401 seguro
// ===============================
export async function safeQuery<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  const result = await promise

  if (result.error?.status === 401) {
    await supabase.auth.signOut()
    window.location.replace("/login")
  }

  return result
}
