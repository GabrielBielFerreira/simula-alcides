import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Cabeçalho das páginas públicas. Ao rolar, ganha a borda e uma sombra leve (`data-rolou`,
 * estilos em `.cabecalho-site`); na troca de rota entre páginas públicas fica parado.
 */
export function SiteHeader() {
  const cabecalho = useRef<HTMLElement>(null);

  // Só marca o atributo (sem estado do React): rolar não renderiza nada de novo.
  useEffect(() => {
    const el = cabecalho.current;
    if (!el) return;
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      el.toggleAttribute("data-rolou", window.scrollY > 4);
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(atualizar);
    };
    atualizar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <header
      ref={cabecalho}
      className="cabecalho-site sticky top-0 z-40 bg-offwhite/95 backdrop-blur"
    >
      <div className="container-site flex h-16 items-center justify-between gap-3 md:h-20">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3"
          aria-label="Simula Alcides, página inicial"
        >
          <img
            src="/brand/rcp-horizontal.png"
            alt="Rede de Cursinhos Populares Alcides Nascimento"
            width={1200}
            height={388}
            className="h-9 w-auto shrink-0 md:h-12"
          />
          <span className="hidden h-8 w-px bg-linha sm:block" aria-hidden />
          <span className="hidden font-display text-xl font-black text-vinho sm:block">
            Simula Alcides
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/entrar">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/cadastro">Comece agora</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-vinho text-creme">
      <div className="container-site grid gap-10 py-12 md:grid-cols-[1.4fr_1fr] md:py-16">
        <div className="space-y-5">
          <img
            src="/brand/rcp-horizontal-fundo-escuro.png"
            alt="Rede de Cursinhos Populares Alcides Nascimento"
            width={1200}
            height={377}
            loading="lazy"
            className="h-14 w-auto md:h-16"
          />
          <p className="max-w-md text-creme/90">
            <strong className="font-display text-lg text-offwhite">Simula Alcides</strong> · uma
            iniciativa da Rede de Cursinhos Populares Alcides Nascimento
          </p>
        </div>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amarelo">
              Realização
            </p>
            <div className="flex items-center gap-3">
              {/* Espaço reservado para a logo do Sonhos da Periferia */}
              <div
                className="grid h-14 w-28 place-items-center rounded-lg border-2 border-dashed border-creme/40 text-xs text-creme/70"
                aria-hidden
              >
                logo
              </div>
              <span className="font-semibold text-offwhite">Sonhos da Periferia</span>
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              {/* Sem endereço confirmado ainda: o botão avisa em vez de levar a lugar nenhum. */}
              <button
                type="button"
                onClick={() =>
                  toast("Disponível na versão final", {
                    description:
                      "O link para o site da Rede entra quando o endereço for confirmado.",
                  })
                }
                className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-[3px] transition-colors hover:text-amarelo focus-visible:outline-amarelo"
              >
                Site da Rede
              </button>
            </li>
            <li>
              <Link
                to="/privacidade"
                className="inline-flex min-h-11 items-center underline transition-colors hover:text-amarelo focus-visible:outline-amarelo"
              >
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link
                to="/entrar"
                className="inline-flex min-h-11 items-center underline transition-colors hover:text-amarelo focus-visible:outline-amarelo"
              >
                Entrar
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-creme/15">
        <p className="container-site py-5 text-sm text-creme/75">
          Feito no Recife, com educação popular.
        </p>
      </div>
    </footer>
  );
}

export function GoogleG({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
