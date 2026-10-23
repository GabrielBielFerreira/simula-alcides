import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { Carregando } from "@/components/ds";
import { movimentoReduzidoAgora } from "@/components/ds/movimento";
import { routeTree } from "./routeTree.gen";

/** A prova é tela cheia: entrar e sair dela troca a tela inteira, sem transição. */
const ehTelaCheia = (caminho: string) => caminho.startsWith("/prova/");

/**
 * Internet lenta: se a tela nova demora mais de 300ms para carregar, a área dela mostra um
 * esqueleto discreto (a navegação fixa fica onde está), em vez de a tela velha ficar parada
 * sem sinal nenhum.
 */
function TelaCarregando() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <Carregando />
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // O código de cada tela começa a baixar quando o dedo toca no link (ou o mouse passa por
    // ele), antes do clique; as abas fixas do app baixam ao aparecer (preload="viewport").
    defaultPreload: "intent",
    defaultPendingMs: 300,
    defaultPendingComponent: TelaCarregando,
    // Troca de rota com View Transitions: só o conteúdo troca, num fade em sequência (220ms);
    // sidebar, barra superior e barra inferior têm view-transition-name e ficam paradas
    // (estilos em src/styles.css). Navegadores sem suporte trocam a tela direto.
    // Sem transição: com movimento reduzido, ao mudar só a busca (?revisar=…) e na prova.
    // (O filtro por função depende de :active-view-transition-type; onde não houver, o CSS
    // de movimento reduzido ainda desliga as animações.)
    defaultViewTransition: {
      types: ({ fromLocation, toLocation, pathChanged }) => {
        if (!fromLocation || !pathChanged || movimentoReduzidoAgora()) return false;
        if (ehTelaCheia(fromLocation.pathname) || ehTelaCheia(toLocation.pathname)) return false;
        return ["troca-de-pagina"];
      },
    },
  });

  return router;
};
