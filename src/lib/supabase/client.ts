import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes que rodam no navegador. Usa apenas a chave
// pública (anon); o que cada usuário pode ler é decidido pelas regras de
// Row Level Security do banco.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
