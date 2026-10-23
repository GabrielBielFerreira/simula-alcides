import { createClient } from "@supabase/supabase-js";

// Endereço e chave publicável do projeto (são públicos; a segurança fica no RLS do banco).
const url = import.meta.env.VITE_SUPABASE_URL ?? "https://ujslzmwlkucvhwdyuteo.supabase.co";
const chave =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_ekcHu1byXq0ZJ9Nom4AF5A_FbY5-8nc";

export const supabase = createClient(url, chave, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
    flowType: "pkce",
  },
});
