import { useEffect } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { PainelRede } from "@/components/admin/painel";
import { usePapelCoordenacao } from "@/components/admin/ui";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin/")({
  head: () => paginaHead("Visão geral da coordenação"),
  component: Pagina,
});

/**
 * A coordenação do polo não vê a Rede: vai direto para o Por Compaz do Paulo Freire.
 * O HTML do servidor já sai com a Visão geral (papel padrão). Se o papel for o do polo, ela
 * continua na tela até o redirecionamento terminar: nada de esqueleto ou tela vazia no meio.
 */
function Pagina() {
  const { ehPolo, pronto, poloInicial } = usePapelCoordenacao();
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    // Se o "Ver como" já está levando para o polo, não navega de novo.
    if (pronto && ehPolo && router.latestLocation.pathname.replace(/\/$/, "") === "/admin")
      void navigate({
        to: "/admin/polos/$poloId",
        params: { poloId: poloInicial },
        replace: true,
      });
  }, [pronto, ehPolo, poloInicial, navigate, router]);
  if (!pronto || ehPolo) return null;
  return <PainelRede />;
}
