import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, MapPin, Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ExigeLogin, iniciaisDe, useSessao } from "@/lib/sessao";
import { Avatar, usePapelCoordenacao } from "./ui";

/* ---------- Período (seletor da barra superior) ---------- */

export const periodos = ["Últimos 30 dias", "Este semestre", "2026"] as const;
export type Periodo = (typeof periodos)[number];
const PeriodoContext = createContext<Periodo>("Últimos 30 dias");
/** Período escolhido na barra superior da coordenação. */
export function usePeriodo() {
  return useContext(PeriodoContext);
}

/* ---------- Navegação ---------- */

interface ItemMenu {
  nome: string;
  icone: LucideIcon;
  /** Por Compaz abre o polo da pessoa (ou o primeiro, na coordenação central). */
  para: "/admin" | "polo";
  ativo: (caminho: string) => boolean;
  /** Só a coordenação central vê. */
  soCentral?: boolean;
}

const itensMenu: ItemMenu[] = [
  {
    nome: "Visão geral",
    icone: LayoutDashboard,
    para: "/admin",
    ativo: (c) => c === "/admin" || c === "/admin/",
    soCentral: true,
  },
  {
    nome: "Por Compaz",
    icone: MapPin,
    para: "polo",
    ativo: (c) => c.startsWith("/admin/polos") || c.startsWith("/admin/estudantes"),
  },
];

function tituloDaPagina(caminho: string) {
  if (caminho.startsWith("/admin/estudantes")) return "Ficha do estudante";
  return itensMenu.find((i) => i.ativo(caminho))?.nome ?? "Visão geral";
}

const focoClaro = "focus-visible:outline-amarelo";

function ConteudoSidebar({
  caminho,
  aoNavegar,
  emSheet = false,
}: {
  caminho: string;
  aoNavegar?: () => void;
  /** No menu do celular, os itens aparecem um a um enquanto o painel desliza. */
  emSheet?: boolean;
}) {
  const { ehPolo, poloInicial } = usePapelCoordenacao();
  const { perfil, sair } = useSessao();
  const navigate = useNavigate();
  const nome = perfil?.nome ?? "Coordenação";
  // No menu do celular, navegar não usa a transição de rota: ela fotografaria a tela antiga com o
  // menu aberto e esmaeceria essa foto sobre a página nova. O deslizar de saída do menu (220ms)
  // já faz esse papel.
  const transicao = emSheet ? false : undefined;
  return (
    <div className="flex min-h-full flex-col p-5">
      <Link
        to="/admin"
        onClick={aoNavegar}
        viewTransition={transicao}
        className={cn("mb-8 block self-start", focoClaro)}
      >
        <img
          src="/brand/rcp-horizontal-fundo-escuro.png"
          alt="Rede de Cursinhos Populares Alcides Nascimento"
          className="w-[200px] max-w-full"
        />
      </Link>
      <p className="mb-2 px-3 text-sm font-bold uppercase tracking-[0.14em] text-creme/85">
        Coordenação
      </p>
      <nav aria-label="Coordenação">
        <ul className={cn("space-y-1", emSheet && "escalonar-filhos")}>
          {itensMenu
            .filter((item) => !(item.soCentral && ehPolo))
            .map(({ nome, icone: Icone, para, ativo }) => {
              const link =
                para === "/admin"
                  ? ({ to: "/admin" } as const)
                  : ({ to: "/admin/polos/$poloId", params: { poloId: poloInicial } } as const);
              const atual = ativo(caminho);
              return (
                <li key={nome} className={cn(emSheet && "anima-aparecer [--atraso:120ms]")}>
                  <Link
                    {...link}
                    onClick={aoNavegar}
                    viewTransition={transicao}
                    aria-current={atual ? "page" : undefined}
                    className={cn(
                      // active: o toque pinta o item já no pointerdown, antes da tela nova chegar.
                      "relative isolate flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-creme transition-colors hover:bg-white/10 active:bg-white/15",
                      focoClaro,
                      atual && "text-white",
                    )}
                  >
                    {/* Item ativo: o fundo aparece e a barra amarela cresce do meio (opacidade e
                        scaleY). Ao sair, os dois somem mais rápido do que entraram. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 -z-10 rounded-xl bg-sidebar-accent",
                        atual
                          ? "opacity-100 transition-opacity duration-220 ease-saida"
                          : "opacity-0 transition-opacity duration-140 ease-entra-sai",
                      )}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-2 left-0 w-1 rounded-full bg-amarelo",
                        atual
                          ? "scale-y-100 transition-transform duration-220 ease-saida"
                          : "scale-y-0 transition-transform duration-140 ease-entra-sai",
                      )}
                    />
                    <Icone className="size-5 shrink-0" aria-hidden />
                    {nome}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
      <div className="mt-auto space-y-4 pt-8">
        <Link
          to="/app"
          onClick={aoNavegar}
          viewTransition={transicao}
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-creme hover:bg-white/10 active:bg-white/15",
            focoClaro,
          )}
        >
          Ver como estudante
        </Link>
        <div className="flex items-center gap-3 border-t border-white/15 pt-4">
          <Avatar iniciais={iniciaisDe(nome)} sobreEscuro />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{nome}</p>
            <p className="text-sm leading-snug text-creme/85">
              {ehPolo ? `Coordenação · ${perfil?.polo?.nome ?? "polo"}` : "Coordenação da Rede"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            aoNavegar?.();
            void sair().then(() => navigate({ to: "/" }));
          }}
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-creme hover:bg-white/10 active:bg-white/15",
            focoClaro,
          )}
        >
          <LogOut className="size-5" aria-hidden />
          Sair
        </button>
      </div>
    </div>
  );
}

/* ---------- Layout ---------- */

/**
 * Depois de uma troca de tela, se o foco caiu no <body> (o link clicado saiu da tela), ele vai
 * para um lugar que diz onde a pessoa está: ao voltar, o link que levou à tela anterior (o nome
 * do estudante na lista, com a rolagem restaurada); senão, o título da página. Se o foco ainda
 * está num lugar que existe (sidebar, botão do menu), fica onde está. No carregamento, nada.
 */
function useFocoNaTrocaDeTela(caminho: string) {
  const anterior = useRef<{ caminho: string; indice: number } | null>(null);
  const indice = useRouterState({ select: (s) => s.location.state.__TSR_index ?? 0 });
  useEffect(() => {
    const antes = anterior.current;
    anterior.current = { caminho, indice };
    if (!antes || antes.caminho === caminho) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    const principal = document.querySelector("main");
    const voltou = indice < antes.indice;
    const naTela = (el: HTMLElement) => {
      const caixa = el.getBoundingClientRect();
      return caixa.height > 0 && caixa.bottom > 0 && caixa.top < window.innerHeight;
    };
    const link = voltou
      ? [...(principal?.querySelectorAll<HTMLElement>(`a[href="${antes.caminho}"]`) ?? [])].find(
          naTela,
        )
      : undefined;
    const titulo = principal?.querySelector<HTMLElement>("h1");
    const alvo = link ?? titulo;
    if (!alvo) return;
    if (alvo === titulo && !titulo.hasAttribute("tabindex")) titulo.tabIndex = -1;
    alvo.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho]);
}

/** Layout de /admin: sidebar vinho (sheet no celular), barra superior e conteúdo de 1200px. */
export function AdminLayout() {
  return (
    <ExigeLogin coordenacao>
      <EstruturaAdmin />
    </ExigeLogin>
  );
}

function EstruturaAdmin() {
  // Item ativo da sidebar, título e período da barra superior seguem o endereço já carregado:
  // trocam junto com o conteúdo, dentro da transição de rota (a barra amarela cresce na tela nova,
  // em vez de ficar congelada pela metade na foto da tela antiga). O menu do celular fecha já no
  // clique.
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const caminhoCarregado = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  });
  const titulo = tituloDaPagina(caminhoCarregado);
  const [tituloAnterior, setTituloAnterior] = useState(titulo);
  const [tituloMudou, setTituloMudou] = useState(false);
  if (titulo !== tituloAnterior) {
    setTituloAnterior(titulo);
    setTituloMudou(true);
  }
  const periodo: Periodo = "Últimos 30 dias";
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  // Fecha o menu do celular a cada troca de tela (inclusive pelo "Ver como" e pelo voltar).
  useEffect(() => setMenuAberto(false), [caminho]);
  useFocoNaTrocaDeTela(caminhoCarregado);
  return (
    <PeriodoContext.Provider value={periodo}>
      <div className="area-coordenacao min-h-dvh bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] overflow-y-auto bg-vinho text-creme [view-transition-name:nav-admin-lateral] lg:block">
          <ConteudoSidebar caminho={caminhoCarregado} />
        </aside>
        <div className="lg:ml-[264px]">
          {/* Fixa só no desktop: no celular a barra rola junto e sobra tela para o conteúdo. */}
          <header className="z-20 border-b border-linha bg-card [view-transition-name:nav-admin-topo] lg:sticky lg:top-0">
            <div className="mx-auto flex max-w-[1264px] flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap lg:px-8 lg:py-4">
              <Button
                ref={botaoMenu}
                variant="outline"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Abrir menu da coordenação"
                aria-expanded={menuAberto}
                onClick={() => setMenuAberto(true)}
              >
                <Menu />
              </Button>
              {/* 44px de altura mínima no desktop: a barra mede sempre 77px, com ou sem o período. */}
              <div className="min-w-0 flex-1 lg:flex lg:min-h-11 lg:items-center">
                {/* Ao trocar de tela, o título novo aparece com um fade curto (no carregamento, não). */}
                <p
                  key={titulo}
                  className={cn(
                    "min-w-0 truncate font-display text-xl font-bold text-marrom lg:text-[22px]",
                    tituloMudou && "anima-aparecer",
                  )}
                >
                  {titulo}
                </p>
              </div>
            </div>
          </header>
          <main className="px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1200px]">
              <Outlet />
            </div>
          </main>
        </div>
        <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
          <SheetContent
            side="left"
            className="area-coordenacao w-[288px] max-w-[85vw] overflow-y-auto border-r-0 bg-vinho p-0 text-creme [&>button]:focus-visible:outline-amarelo"
            // O botão de abrir fica fora do Sheet: ao fechar (Esc, X, fora ou navegando), o foco
            // volta para ele, e não para o começo da página.
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              botaoMenu.current?.focus();
            }}
          >
            <SheetTitle className="sr-only">Menu da coordenação</SheetTitle>
            <SheetDescription className="sr-only">
              Navegue entre as telas da coordenação.
            </SheetDescription>
            <ConteudoSidebar
              caminho={caminhoCarregado}
              aoNavegar={() => setMenuAberto(false)}
              emSheet
            />
          </SheetContent>
        </Sheet>
      </div>
    </PeriodoContext.Provider>
  );
}
