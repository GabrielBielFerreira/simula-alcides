import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { House, ClipboardList, PenLine, ChartLine, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExigeLogin, ehCoordenacao, iniciaisDe, useSessao } from "@/lib/sessao";

const links = [
  { to: "/app", nome: "Início", I: House },
  { to: "/app/simulados", nome: "Simulados", I: ClipboardList },
  { to: "/app/redacao", nome: "Redação", I: PenLine },
  { to: "/app/desempenho", nome: "Desempenho", I: ChartLine },
] as const;

/** "Início" só fica ativo em /app; as outras seções também nas páginas filhas. */
const opcoesAtivo = (to: (typeof links)[number]["to"]) => ({ exact: to === "/app" });

/** Quem ainda não passou pelas boas-vindas (ex.: 1º login com Google) vai para lá. */
function useExigeBoasVindas() {
  const { usuario } = useSessao();
  const navigate = useNavigate();
  const falta = Boolean(usuario && !usuario.user_metadata?.boas_vindas);
  useEffect(() => {
    if (falta) void navigate({ to: "/boas-vindas", replace: true });
  }, [falta, navigate]);
}

function useSair() {
  const { sair } = useSessao();
  const navigate = useNavigate();
  return () => void sair().then(() => navigate({ to: "/" }));
}

export function AppLayout() {
  return (
    <ExigeLogin>
      <EstruturaApp />
    </ExigeLogin>
  );
}

function EstruturaApp() {
  useExigeBoasVindas();
  const { perfil } = useSessao();
  const polo = perfil?.polo;
  const sair = useSair();
  return (
    <>
      <div className="min-h-dvh bg-background">
        <aside className="fixed inset-y-0 left-0 hidden w-[264px] flex-col border-r border-linha bg-creme p-5 [view-transition-name:nav-app-lateral] lg:flex">
          <Link to="/app">
            <img
              src="/brand/rcp-horizontal.png"
              alt="Rede de Cursinhos Populares Alcides Nascimento"
              className="mb-8 w-full"
            />
          </Link>
          <nav aria-label="Seções do app" className="space-y-2">
            {links.map(({ to, nome, I }) => (
              // Borda transparente sempre: o "selecionado" só troca a cor, sem empurrar o conteúdo.
              // Fundo, borda e a barrinha à esquerda entram e saem suaves ao trocar de seção.
              <Button
                asChild
                key={to}
                variant="ghost"
                className="selecionavel group relative w-full justify-start border-2 border-transparent"
              >
                <Link
                  to={to}
                  preload="viewport"
                  activeOptions={opcoesAtivo(to)}
                  activeProps={{ className: "selecionado" }}
                >
                  <span
                    aria-hidden
                    className="absolute left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 scale-y-0 rounded-full bg-laranja-acao opacity-0 transition-[opacity,scale] duration-220 ease-saida group-data-[status=active]:scale-y-100 group-data-[status=active]:opacity-100"
                  />
                  <I aria-hidden />
                  {nome}
                </Link>
              </Button>
            ))}
          </nav>
          {polo && (
            <div className="my-6 rounded-xl border border-linha bg-card p-4 text-sm">
              <p className="font-semibold">Seu polo</p>
              <p>
                {polo.nome} · {polo.bairro}
              </p>
            </div>
          )}
          {ehCoordenacao(perfil) && (
            <Button asChild variant="outline">
              <Link to="/admin">
                <LayoutDashboard aria-hidden />
                Coordenação
              </Link>
            </Button>
          )}
          <div className="mt-auto border-t border-linha pt-5">
            <p className="font-semibold">{perfil?.nome}</p>
            <p className="text-sm text-muted-foreground">Seu caminho, no seu ritmo.</p>
            <Button variant="ghost" onClick={sair}>
              <LogOut aria-hidden />
              Sair
            </Button>
          </div>
        </aside>
        <header className="flex h-16 items-center justify-between border-b border-linha bg-card px-4 [view-transition-name:nav-app-topo] lg:hidden">
          <Link to="/app" className="flex min-h-11 items-center gap-2 font-semibold">
            <img src="/brand/simbolo-512.png" alt="" className="size-9" />
            Simula Alcides
          </Link>
          <MenuPerfil />
        </header>
        <main className="px-4 py-6 pb-28 lg:ml-[264px] lg:px-8 lg:py-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
        <nav
          aria-label="Seções do app"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-linha bg-card pb-[env(safe-area-inset-bottom)] [view-transition-name:nav-app-inferior] lg:hidden"
        >
          {links.map(({ to, nome, I }) => (
            // preload="viewport": o código das 4 abas baixa assim que a barra aparece, e o toque
            // troca a tela sem esperar a rede.
            <Link
              key={to}
              to={to}
              preload="viewport"
              activeOptions={opcoesAtivo(to)}
              className="group flex h-16 flex-col items-center justify-center gap-1 text-[12px] text-muted-foreground transition-colors data-[status=active]:text-laranja-acao"
            >
              {/* Pílula atrás do ícone: abre da largura do ícone até a cheia (escala e opacidade). */}
              <span className="relative grid h-8 w-14 place-items-center">
                <span
                  aria-hidden
                  className="absolute inset-0 scale-x-50 rounded-full bg-laranja-acao/12 opacity-0 transition-[opacity,scale] duration-220 ease-saida group-data-[status=active]:scale-x-100 group-data-[status=active]:opacity-100"
                />
                <I className="relative size-6" aria-hidden />
              </span>
              {/* Rótulo: o negrito já tem seu espaço reservado e troca com um fade, sem pular. */}
              <span className="grid text-center">
                <span aria-hidden className="invisible col-start-1 row-start-1 font-bold">
                  {nome}
                </span>
                <span className="col-start-1 row-start-1 font-medium transition-opacity group-data-[status=active]:opacity-0">
                  {nome}
                </span>
                <span
                  aria-hidden
                  className="col-start-1 row-start-1 font-bold opacity-0 transition-opacity group-data-[status=active]:opacity-100"
                >
                  {nome}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

/** Menu do avatar no celular: fecha com Esc, com toque fora e ao trocar de página. */
function MenuPerfil() {
  const { perfil } = useSessao();
  const polo = perfil?.polo;
  const nome = perfil?.nome ?? "";
  const sair = useSair();
  const [aberto, setAberto] = useState(false);
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setAberto(false), [caminho]);
  const fechar = () => setAberto(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Menu de ${nome}`}
          className="grid size-11 place-items-center rounded-full bg-creme font-bold text-marrom ring-1 ring-linha hover:bg-linha/60"
        >
          <span aria-hidden>{iniciaisDe(nome)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(18rem,calc(100vw-2rem))] rounded-xl border-linha p-2 shadow-suave"
      >
        <div className="px-3 pb-3 pt-2">
          <p className="font-semibold">{nome}</p>
          {polo && (
            <p className="text-sm text-muted-foreground">
              {polo.nome} · {polo.bairro}
            </p>
          )}
        </div>
        {ehCoordenacao(perfil) && (
          <div className="border-t border-linha py-2">
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/admin" onClick={fechar}>
                <LayoutDashboard aria-hidden />
                Coordenação
              </Link>
            </Button>
          </div>
        )}
        <div className="border-t border-linha pt-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              fechar();
              sair();
            }}
          >
            <LogOut aria-hidden />
            Sair
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
