import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { Carregando } from "@/components/ds";
import { supabase } from "./supabase";

export type PapelPerfil = "estudante" | "professor" | "coord_polo" | "admin";
export type VinculoPerfil = "rede" | "outro_cursinho" | "independente";

export interface Perfil {
  id: string;
  nome: string;
  data_nascimento: string | null;
  vinculo: VinculoPerfil;
  polo_id: string | null;
  cursinho_externo: string | null;
  telefone: string | null;
  papel: PapelPerfil;
  polo: { nome: string; bairro: string } | null;
}

interface Sessao {
  pronto: boolean;
  usuario: User | null;
  perfil: Perfil | null;
  recarregarPerfil: () => Promise<Perfil | null>;
  sair: () => Promise<void>;
}

const SessaoContext = createContext<Sessao>({
  pronto: false,
  usuario: null,
  perfil: null,
  recarregarPerfil: async () => null,
  sair: async () => {},
});

async function buscarPerfil(id: string): Promise<Perfil | null> {
  const { data } = await supabase
    .from("perfis")
    .select(
      "id, nome, data_nascimento, vinculo, polo_id, cursinho_externo, telefone, papel, polo:polos(nome, bairro)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as Perfil) ?? null;
}

/** Sessão do Supabase e perfil de quem está logado (só no navegador). */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const recarregarPerfil = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const p = data.user ? await buscarPerfil(data.user.id) : null;
    setPerfil(p);
    return p;
  }, []);

  useEffect(() => {
    let ativo = true;
    const aplicar = async (u: User | null) => {
      const p = u ? await buscarPerfil(u.id) : null;
      if (!ativo) return;
      setUsuario(u);
      setPerfil(p);
      setPronto(true);
    };
    void supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user ?? null));
    const { data: escuta } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED")
        // Fora do callback: o supabase-js pede para não fazer chamadas dentro dele.
        setTimeout(() => void aplicar(s?.user ?? null), 0);
    });
    return () => {
      ativo = false;
      escuta.subscription.unsubscribe();
    };
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setPerfil(null);
  }, []);

  return (
    <SessaoContext.Provider value={{ pronto, usuario, perfil, recarregarPerfil, sair }}>
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  return useContext(SessaoContext);
}

export const ehCoordenacao = (p: Perfil | null) =>
  p?.papel === "admin" || p?.papel === "coord_polo";

export const iniciaisDe = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** Só mostra o conteúdo para quem está logado (e, se pedido, para a coordenação). */
export function ExigeLogin({
  children,
  coordenacao = false,
}: {
  children: ReactNode;
  coordenacao?: boolean;
}) {
  const { pronto, usuario, perfil } = useSessao();
  const navigate = useNavigate();
  const barrado = pronto && (!usuario || (coordenacao && !ehCoordenacao(perfil)));
  useEffect(() => {
    if (!barrado) return;
    void navigate({ to: usuario ? "/app" : "/entrar", replace: true });
  }, [barrado, usuario, navigate]);
  if (!pronto || barrado)
    return (
      <main className="mx-auto max-w-md p-6">
        <Carregando texto="Abrindo…" />
      </main>
    );
  return <>{children}</>;
}

/** Nas telas de entrar e criar conta: quem já está logado vai direto para o app. */
export function useVaiParaAppSeLogado() {
  const { pronto, usuario } = useSessao();
  const navigate = useNavigate();
  useEffect(() => {
    if (pronto && usuario) void navigate({ to: "/app", replace: true });
  }, [pronto, usuario, navigate]);
}
