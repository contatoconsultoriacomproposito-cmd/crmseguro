// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cliente para o Dashboard (Onde o login do corretor fica salvo)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-corretor-auth', // Chave exclusiva
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Cliente Público / Cadastro (Não olha para a sessão do dashboard)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-public-temp', // Chave diferente para não conflitar com o login ativo
    persistSession: false, 
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});